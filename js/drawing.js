var PCENGClient = PCENGClient || {};

PCENGClient.drawPacman = function(gl) {
  var stack = this.stack;
  var pacmanSize = this.game.race.pacmanSize;

  stack.push();
  stack.multiply(this.myFrame());
  stack.multiply(SglMat4.translation([0, pacmanSize, 0]));

  // draw the body of pacman
  stack.push()
  stack.multiply(SglMat4.rotationAngleAxis(sglDegToRad(-90), [1, 0 , 0]));
  gl.uniformMatrix4fv(this.uniformShader.uModelViewMatrixLocation, false, stack.matrix);
  this.drawObject(gl, this.pacman, [1.0, 1.0, 0.2, 1.0], [0.1, 0.1, 0.1, 1.0]);
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
    this.drawObject(gl, this.sphere, [0.4, 0, 0, 0.8], [0.5, 0, 0, 0.8]);
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
    this.drawObject(gl, this.cube, [0.2, 0.2, 0.2, 1.8], [0.1, 0.1, 0.1, 1.0]);
    stack.pop();
  }
}

PCENGClient.drawGoats = function(gl) {
  var self = this;
  var stack = this.stack;
  var goatDims = this.game.race.goatDimensions;
  
  var drawHead = function() {
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
    self.drawObject(gl, self.cube, [0.1, 0.4, 0.6, 1.0], [0.1, 0.1, 0.1, 1.0]);
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
    self.drawObject(gl, self.cube, [0.1, 0.4, 0.6, 1.0], [0.1, 0.1, 0.1, 1.0]);
    stack.pop();  
  };

  var drawTorso = function () {
    stack.push();
    var height = goatDims.legHeight + goatDims.hoofHeight + goatDims.torsoHeight / 2;
    stack.multiply(SglMat4.translation([0, height, 0]));
    stack.multiply(SglMat4.scaling(
          [goatDims.torsoXwidth, goatDims.torsoHeight, goatDims.torsoZwidth]));
    gl.uniformMatrix4fv(self.uniformShader.uModelViewMatrixLocation, false, stack.matrix);
    self.drawObject(gl, self.cube, [0.1, 0.4, 0.6, 1.0], [0.1, 0.1, 0.1, 1.0]);
    stack.pop();  
  };

  var drawLegs = function() {
    var drawMovedLeg = function(x, z) {
      stack.push();
      stack.multiply(SglMat4.translation([x, 0, z]));
      drawLeg();
      stack.pop();
    }
    var xMove = goatDims.torsoXwidth * (1.0 / 3.5);
    var zMove = goatDims.torsoZwidth * (1.0 / 3.5);

    drawMovedLeg(xMove, zMove);
    drawMovedLeg(xMove, -zMove);
    drawMovedLeg(-xMove, zMove);
    drawMovedLeg(-xMove, -zMove);
 };

  var drawLeg = function() {
    var maxAngle = 45;
    var phase = ((self.time % 1500) / 1500.0 * 360);
    var angle  = Math.cos(sglDegToRad(phase)) * maxAngle;
    stack.push();
    var height = goatDims.hoofHeight + goatDims.legHeight;
    stack.multiply(SglMat4.translation([0, height, 0]));
    stack.multiply(SglMat4.rotationAngleAxis(sglDegToRad(angle), [1, 0, 0]));
    stack.multiply(SglMat4.translation([0, -height, 0]));

    drawHoof();
    drawUpperLeg();

    stack.pop();
  };

  var drawUpperLeg = function () {
    stack.push();
    stack.multiply(SglMat4.translation([0, goatDims.legHeight/2 + goatDims.hoofHeight, 0]));
    stack.multiply(SglMat4.scaling([.5, goatDims.legHeight, .5]));
    gl.uniformMatrix4fv(self.uniformShader.uModelViewMatrixLocation, false, stack.matrix);
    self.drawObject(gl, self.cube, [0.1, 0.4, 0.6, 1.0], [0.1, 0.1, 0.1, 1.0]);
    stack.pop();  
  };

  var drawHoof = function () {
    stack.push();
    stack.multiply(SglMat4.translation([0, .5, 0]));
    stack.multiply(SglMat4.scaling([1, goatDims.hoofHeight, 1]));
    gl.uniformMatrix4fv(self.uniformShader.uModelViewMatrixLocation, false, stack.matrix);
    self.drawObject(gl, self.cube, [0.1, 0.4, 0.6, 1.0], [0.1, 0.1, 0.1, 1.0]);
    stack.pop();  
  };

  stack.push();
  stack.multiply(SglMat4.scaling([.75, .75, .75]));

  for (var i = 0; i < this.game.race.goatsNumber; i++) {
    stack.multiply(this.goatsFrame(i));
    drawLegs();
    drawTorso();
    drawHead();
  }
 stack.pop();
}
