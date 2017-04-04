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
