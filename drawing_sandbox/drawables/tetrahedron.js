function Tetrahedron() {
  this.name = "tetrahedron";

  // vertices definition
  var side = 2.5;
  // apex and then sides
  // The animation we are using to display these primitives
  // rotates them in the y axis. Hence, the coordinates are given
  // in the x z y order.
  this.vertices = new Float32Array([
           0.0, side * Math.sqrt(6) / 3.0 , 0.0,
           0.0, 0.0                       , side / Math.sqrt(3),                       
     -side/2.0, 0.0                       , -side * Math.sqrt(3) / 6,                       
      side/2.0, 0.0  , -side*Math.sqrt(3) / 6
  ]);

  // triangle definition
  this.triangleIndices = new Uint16Array([
    0, 3, 2,  0, 1, 3,
    0, 2, 1,  2, 3, 1   
  ]);

  this.numVertices = this.vertices.length / 3;
  this.numTriangles = this.triangleIndices.length / 3;

}
