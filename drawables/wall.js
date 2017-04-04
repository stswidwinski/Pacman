// Wall definition
//
//  obj: {
//    blh: [x, y, z],   // bottom left hind
//    trf: [x, y, z]    // top right front
//  }
function Wall (obj) {

	this.name = "wall";
	
  var blh = obj.blh; 
  var trf = obj.trf;

  var x_span = trf[0] - blh[0];
  var y_span = trf[1] - blh[1];
  var z_span = trf[2] - blh[2];
	// vertices definition
	////////////////////////////////////////////////////////////
	
	this.vertices = new Float32Array([
    blh[0],          blh[1],          blh[2],
    blh[0] + x_span, blh[1],          blh[2],
    blh[0] + x_span, blh[1],          blh[2] + z_span,
    blh[0],          blh[1],          blh[2] + z_span,
    blh[0],          blh[1] + y_span, blh[2],
    blh[0] + x_span, blh[1] + y_span, blh[2],
    blh[0] + x_span, blh[1] + y_span, blh[2] + z_span,
    blh[0],          blh[1] + y_span, blh[2] + z_span
	]);

	// triangles definition
	////////////////////////////////////////////////////////////
	
	this.triangleIndices = new Uint16Array([
    0, 1, 2,  0, 2, 3, // bottom
    0, 4, 7,  0, 7, 3, // front
    0, 4, 5,  0, 5, 1, // left
    4, 5, 6,  4, 6, 7, // top
    7, 6, 2,  7, 2, 3, // right
    5, 6, 1,  1, 6, 2  // bottom
  ]);
	
	this.numVertices = this.vertices.length/3;
	this.numTriangles = this.triangleIndices.length/3;
	
}
