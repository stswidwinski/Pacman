var PCENGClient = PCENGClient || {};

PCENGClient.drawPacman = function(gl) {
  var stack = this.stack;

  stack.push();
  stack.multiply(this.myFrame());
  stack.multiply(SglMat4.translation([0, 2, 0]));
  stack.multiply(SglMat4.rotationAngleAxis(sglDegToRad(45), [0, 1 , 0]));
  stack.multiply(SglMat4.rotationAngleAxis(sglDegToRad(-90), [1, 0 , 0]));
  gl.uniformMatrix4fv(this.uniformShader.uModelViewMatrixLocation, false, stack.matrix);

  this.drawObject(gl, this.pacman, [1.0, 1.0, 0.2, 1.0], [0.1, 0.1, 0.1, 1.0]);

  stack.pop();
}

PCENGClient.drawDots = function(gl) {
  var stack = this.stack;
  for (var i = 0; i < this.dots.length; i++) {
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
