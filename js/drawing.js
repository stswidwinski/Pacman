var PCENGClient = PCENGClient || {};

PCENGClient.drawPacman = function(gl) {
  var stack = this.stack;
  var pacmanSize = this.game.race.pacmanSize;
  var pink = [1.0, 57/255.0, 143/255.0, 1.0];

  stack.push();
  stack.multiply(this.myFrame());
  stack.multiply(SglMat4.translation([0, pacmanSize, 0]));

  // draw the body of pacman
  stack.push()
  stack.multiply(SglMat4.rotationAngleAxis(sglDegToRad(-90), [1, 0 , 0]));
  gl.uniformMatrix4fv(this.uniformShader.uModelViewMatrixLocation, false, stack.matrix);
  this.drawObject(gl, this.pacman, pink, [0.1, 0.1, 0.1, 1.0]);
  stack.pop();

  // draw the eyes of pacman

  var that = this;
  var drawLayer = function(scale, angle, color) {
    stack.push();
    stack.multiply(SglMat4.rotationAngleAxis(sglDegToRad(angle), [1, 0, 0]));
    stack.multiply(SglMat4.scaling([scale, scale, scale]));
    gl.uniformMatrix4fv(that.uniformShader.uModelViewMatrixLocation, false, stack.matrix);
    that.drawObject(gl, that.halfsphere, color, color);
    stack.pop();
  }

  var angle = ((this.time % 1500) / 1500.0 * 360);
  
  // draw the animated opening and closing mouth
  drawLayer(1.95, angle, [0, 0, 0, 1.0], [0, 0, 0, 1.0])
  drawLayer(1.95, -angle, [0, 0, 0, 1.0], [0, 0, 0, 1.0])
  drawLayer(1.9, 0, [1.0, 1.0, 0.2, 1.0], [1.0, 1.0, 0.2, 1.0])
  drawLayer(1.9, 180, [1.0, 1.0, 0.2, 1.0], [1.0, 1.0, 0.2, 1.0])

  stack.pop();
}

PCENGClient.drawDots = function(gl) {
  var stack = this.stack;
  this.dots = this.game.race.dots;
  for (var i = 0; i < this.dots.length; i++) {
    if (this.dots[i].eaten) continue;

    stack.push();
    stack.multiply(SglMat4.translation(this.dots[i].position));
    var size = this.dots[i].size;
    stack.multiply(SglMat4.scaling([size, size, size]));
    gl.uniformMatrix4fv(this.uniformShader.uModelViewMatrixLocation, false, stack.matrix);
    this.drawObject(gl, this.sphere, [1.0, 201/255.0, 73/255.0, 1.0], [1.0, 201/255.0, 73/255.0, 1.0]);
    stack.pop();
  }
}

PCENGClient.drawWaypoints = function(gl) {
  var stack = this.stack;
  this.waypoints = this.game.state.players.goats[0].waypoints;
  for (var i = 0; i < this.waypoints.length; i++) {
    stack.push();
    stack.multiply(SglMat4.translation(this.waypoints[i]));
    var size = 4;
    stack.multiply(SglMat4.scaling([size, size, size]));
    gl.uniformMatrix4fv(this.uniformShader.uModelViewMatrixLocation, false, stack.matrix);
    this.drawObject(gl, this.sphere, [0.2, 0.2, 0.8, 1.0], [0.2, 0, 0.8, 0.8]);
    stack.pop();
  }
}

PCENGClient.drawWalls = function(gl) {
  var stack = this.stack;
  for (var i = 0; i < this.walls.length; i++) {
    var blh = this.walls[i].blh;
    var trf = this.walls[i].trf;
    var moveX = trf[0] / 2.0 + blh[0] / 2.0;
    var moveZ = trf[2] / 2.0 + blh[2] / 2.0;
    var xLen = trf[0] - blh[0];
    var zLen = trf[2] - blh[2];
    var yLen = trf[1] - blh[1];

    stack.push();
    stack.multiply(SglMat4.translation([moveX, yLen/2.0, moveZ]));
    stack.multiply(SglMat4.scaling([xLen, yLen, zLen]));
    gl.uniformMatrix4fv(this.uniformShader.uModelViewMatrixLocation, false, stack.matrix);
    this.drawObject(gl, this.cube, [16.0/255, 68/255.0, 0.0, 0.7], [0.1, 0.1, 0.1, 1.0]);
    stack.pop();
  }
}

PCENGClient.drawGoats = function(gl) {
  var self = this;
  var stack = this.stack;
  var goatDims = this.game.race.goatDimensions;

  var getGoatColors = function() {
    var colors = self.goatColors;
    
    if (colors) return colors;

    var goatColors = [
      [192.0/255, 228.0/255, 255.0/255.0, 1.0],
      [161.0/255, 215.0/255, 255.0/255.0, 1.0],
      [98.0/255, 188.0/255, 255.0/255.0, 1.0],
      [10.0/255, 149.0/255, 255.0/255.0, 1.0]
    ];

    colors = [ ];
    for (var i = 0; i < self.game.race.goatsNumber; i++) {
      colors.push(goatColors[Math.floor(Math.random() * goatColors.length)]);
    }

    self.goatColors = colors;
    return colors;
  };
  var goatColors = getGoatColors();
  
  var drawHead = function(color) {
    stack.push();
    var height = goatDims.legHeight + goatDims.hoofHeight + goatDims.torsoHeight;
    stack.multiply(SglMat4.translation(
          [0, 
          height + 
            goatDims.neckLength / 2 * Math.cos(sglDegToRad(goatDims.neckAngle)) - 
            0.75, 
          goatDims.torsoZwidth/2]));
    stack.multiply(SglMat4.rotationAngleAxis(sglDegToRad(goatDims.neckAngle), [1, 0 , 0]));
    stack.multiply(SglMat4.scaling([2, goatDims.neckLength, 2]));

    gl.uniformMatrix4fv(self.uniformShader.uModelViewMatrixLocation, false, stack.matrix);
    self.drawObject(gl, self.cube, color, [0.0, 0.0, 0.0, 1.0]);
    stack.pop();

    stack.push();
    var height = goatDims.legHeight + goatDims.hoofHeight + goatDims.torsoHeight;
    stack.multiply(SglMat4.translation(
          [0, 
          height + 
            goatDims.neckLength / 2 * Math.cos(sglDegToRad(goatDims.neckAngle)) - 
            0.75 +
            goatDims.headSize / 2, 
          goatDims.torsoZwidth / 2 + goatDims.headSize / 2]));
    stack.multiply(SglMat4.scaling([goatDims.headSize, goatDims.headSize, goatDims.headSize]));

    gl.uniformMatrix4fv(self.uniformShader.uModelViewMatrixLocation, false, stack.matrix);
    self.drawObject(gl, self.cube, color, [0.0, 0.0, 0.0, 1.0]);
    stack.pop();  
  };

  var drawTorso = function (color) {
    stack.push();
    var height = goatDims.legHeight + goatDims.hoofHeight + goatDims.torsoHeight / 2;
    stack.multiply(SglMat4.translation([0, height, 0]));
    stack.multiply(SglMat4.scaling(
          [goatDims.torsoXwidth, goatDims.torsoHeight, goatDims.torsoZwidth]));
    gl.uniformMatrix4fv(self.uniformShader.uModelViewMatrixLocation, false, stack.matrix);
    self.drawObject(gl, self.cube, color, [0.0, 0.0, 0.0, 1.0]);
    stack.pop();  
  };

  var drawLegs = function(color) {
    var drawMovedLeg = function(x, z) {
      stack.push();
      stack.multiply(SglMat4.translation([x, 0, z]));
      drawLeg(color);
      stack.pop();
    }
    var xMove = goatDims.torsoXwidth * (1.0 / 3.5);
    var zMove = goatDims.torsoZwidth * (1.0 / 3.5);

    drawMovedLeg(xMove, zMove);
    drawMovedLeg(xMove, -zMove);
    drawMovedLeg(-xMove, zMove);
    drawMovedLeg(-xMove, -zMove);
 };

  var drawLeg = function(color) {
    var maxAngle = 45;
    var phase = ((self.time % 1500) / 1500.0 * 360);
    var angle  = Math.cos(sglDegToRad(phase)) * maxAngle;
    stack.push();
    var height = goatDims.hoofHeight + goatDims.legHeight;
    stack.multiply(SglMat4.translation([0, height, 0]));
    stack.multiply(SglMat4.rotationAngleAxis(sglDegToRad(angle), [1, 0, 0]));
    stack.multiply(SglMat4.translation([0, -height, 0]));

    drawHoof(color);
    drawUpperLeg(color);

    stack.pop();
  };

  var drawUpperLeg = function (color) {
    stack.push();
    stack.multiply(SglMat4.translation([0, goatDims.legHeight/2 + goatDims.hoofHeight, 0]));
    stack.multiply(SglMat4.scaling([.5, goatDims.legHeight, .5]));
    gl.uniformMatrix4fv(self.uniformShader.uModelViewMatrixLocation, false, stack.matrix);
    self.drawObject(gl, self.cube, color, [0.0, 0.0, 0.0, 1.0]);
    stack.pop();  
  };

  var drawHoof = function (color) {
    stack.push();
    stack.multiply(SglMat4.translation([0, .5, 0]));
    stack.multiply(SglMat4.scaling([1, goatDims.hoofHeight, 1]));
    gl.uniformMatrix4fv(self.uniformShader.uModelViewMatrixLocation, false, stack.matrix);
    self.drawObject(gl, self.cube, color, [0.0, 0.0, 0.0, 1.0]);
    stack.pop();  
  };

  for (var i = 0; i < this.game.race.goatsNumber; i++) {
    stack.push();
    stack.multiply(this.goatsFrame(i));
    drawLegs(goatColors[i]);
    drawTorso(goatColors[i]);
    drawHead(goatColors[i]);
    stack.pop(goatColors[i]);
  }
}
