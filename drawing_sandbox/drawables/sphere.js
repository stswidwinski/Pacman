function Sphere (radius) {

	this.name = "sphere";
  var azi_div = 30;
  var ele_div = 30;

  // vertices
  // 3 Dims x 2 semi-spheres x (vertices in later x number of layers + "top vertices")
  // NOTE: top vertex is done separately because of rounding. n * (a / n) might not be 1.	
	this.vertices = new Float32Array(3 * (azi_div * (ele_div - 1) + 2));
	
  var azimuth;
  var azimuthStep = 2 * Math.PI / azi_div;
  var elevation;
  var elevationStep = Math.PI / ele_div;
  
  // "top" of the sphere
  this.vertices[0] = 0.0;
	this.vertices[1] = 0.0;
	this.vertices[2] = radius;
	
	// the "body" of the sphere
  var vertexoffset = 3;
  var xyProjection;

	for (var i = 1; i < ele_div; i++) {
    // elevation is counted from xy plane
	  elevation = Math.PI / 2 - elevationStep * i;
    xyProjection = radius * Math.cos(elevation);
		for (var j = 0; j < azi_div; j++) {
      azimuth = azimuthStep * j;
 
      this.vertices[vertexoffset] = xyProjection * Math.cos(azimuth);
      this.vertices[vertexoffset+1] = xyProjection * Math.sin(azimuth);
      this.vertices[vertexoffset+2] = radius * Math.sin(elevation);
      vertexoffset += 3;
    }
	}
	
  // the "bottom" vertex. This is done "by hand" since n * (a / n) might not be 1
  // if rounding is unfortunate.
	this.vertices[vertexoffset] = 0.0;
	this.vertices[vertexoffset+1] = 0.0;
	this.vertices[vertexoffset+2] = -radius;
	
  // triangle definition	
	this.triangleIndices = new Uint16Array(3*((ele_div - 2) * 2 * azi_div + azi_div * 2));

  // top and bottom of the sphere form fans and must be handled separately.
  var triangleOffset = 0;
  for (var i = 0; i < azi_div; i++) {
    this.triangleIndices[triangleOffset] = 0;
    this.triangleIndices[triangleOffset + 1] = 1 + i; 
    this.triangleIndices[triangleOffset + 2] = 1 + ((i + 1) % azi_div);

    triangleOffset += 3;
  }

  // the "body" of the sphere
  //
  // the "0th" vertex at a given elevation level.
  var baselineOnLevel;
  for (var j = 1; j < ele_div - 1; j++) {
    baselineOnLevel = (j - 1) * azi_div + 1;
    for (var i = 0; i < azi_div; i++) {
      this.triangleIndices[triangleOffset] = baselineOnLevel + i;
      this.triangleIndices[triangleOffset + 1] = baselineOnLevel + azi_div + i;
      this.triangleIndices[triangleOffset + 2] = baselineOnLevel + azi_div + ((i + 1) % azi_div);

      this.triangleIndices[triangleOffset + 3] = baselineOnLevel + i;
      this.triangleIndices[triangleOffset + 4] = baselineOnLevel + azi_div + ((i + 1) % azi_div);
      this.triangleIndices[triangleOffset + 5] = baselineOnLevel + ((i + 1) % azi_div);

      triangleOffset += 6;
    }
  }

  // the bottom fan
  baselineOnLevel = (ele_div - 2) * azi_div + 1;
  var bottomVertex = this.vertices.length / 3 - 1;
  for (var i = 0; i < azi_div; i++) {
    this.triangleIndices[triangleOffset] = baselineOnLevel + i;
    this.triangleIndices[triangleOffset + 1] = bottomVertex; 
    this.triangleIndices[triangleOffset + 2] = baselineOnLevel + ((i + 1) % azi_div);

    triangleOffset += 3;
  }
	
	this.numVertices = this.vertices.length/3;
	this.numTriangles = this.triangleIndices.length/3;
}
