function Pacman_body (radius) {
  this.name = "pacman_body";
  
  var azi_div = 30;
  var ele_div = 30;

  var mouth_azi_width = 2 * 4;
  this.mouth_azi_start = mouth_azi_width / 2 - 1;
  this.mouth_azi_end = azi_div / 2 - mouth_azi_width / 2 + 1;
  var mouth_ele_width = 2 * 3;
  this.mouth_ele_start = ele_div / 2 - mouth_ele_width / 2 - 1;
  this.mouth_ele_end = ele_div / 2 + mouth_ele_width / 2 + 1;

  // vertices
  // 3 Dims x 2 semi-spheres x (vertices in later x number of layers + "top vertices")
  // NOTE: top vertex is done separately because of rounding. n * (a / n) might not be 1.	
//	this.vertices = new Float32Array(3 * (azi_div * (ele_div - 1) + 2));
  var vertices = [];
	
  var azimuth;
  var azimuthStep = 2 * Math.PI / azi_div;
  var elevation;
  var elevationStep = Math.PI / ele_div;
  
  // "top" of the sphere
  vertices[0] = 0.0;
	vertices[1] = 0.0;
	vertices[2] = radius;
	
	// the "body" of the sphere
  var vertexoffset = 3;
  var xyProjection;

	for (var i = 1; i < ele_div; i++) {
    // elevation is counted from xy plane
	  elevation = Math.PI / 2 - elevationStep * i;
    xyProjection = radius * Math.cos(elevation);
		for (var j = 0; j < azi_div; j++) {
      azimuth = azimuthStep * j;
 
      // skip vertices within Pacman's mouth!
      if ( (j > this.mouth_azi_start &&
            j < this.mouth_azi_end) &&
          (i > this.mouth_ele_start &&
           i < this.mouth_ele_end)) {
        continue;
      }

      vertices[vertexoffset] = xyProjection * Math.cos(azimuth);
      vertices[vertexoffset+1] = xyProjection * Math.sin(azimuth);
      vertices[vertexoffset+2] = radius * Math.sin(elevation);
      vertexoffset += 3;
    }
	}
	
  // the "bottom" vertex. This is done "by hand" since n * (a / n) might not be 1
  // if rounding is unfortunate.
	vertices[vertexoffset] = 0.0;
	vertices[vertexoffset+1] = 0.0;
	vertices[vertexoffset+2] = -radius;
	
  // triangle definition	
//	this.triangleIndices = new Uint16Array(3*((ele_div - 2) * 2 * azi_div + azi_div * 2));
  triangleIndices = [];

  // top and bottom of the sphere form fans and must be handled separately.
  var triangleOffset = 0;
  for (var i = 0; i < azi_div; i++) {
    triangleIndices[triangleOffset] = 0;
    triangleIndices[triangleOffset + 1] = 1 + i; 
    triangleIndices[triangleOffset + 2] = 1 + ((i + 1) % azi_div);

    triangleOffset += 3;
  }

  // the "body" of the sphere
  //
  // the "0th" vertex at a given elevation level.
  var baselineOnLevel;
  var skipped_vertices = 0;
  for (var j = 1; j < ele_div - 1; j++) {
    baselineOnLevel = (j - 1) * azi_div + 1;
    for (var i = 0; i < azi_div; i++) {
      if (( i > this.mouth_azi_start &&
            i < this.mouth_azi_end) &&
          ( j > this.mouth_ele_start &&
            j < this.mouth_ele_end)) {
        skipped_vertices ++;
      }

      if (( i + 1 > this.mouth_azi_start &&
            i < this.mouth_azi_end) &&
          ( j >= this.mouth_ele_start &&
            j < this.mouth_ele_end)) {
        continue;
      }
  
      var next_level_skips = 0;
      if ((j == this.mouth_ele_start && i >= this.mouth_azi_end) ||
          (j > this.mouth_ele_start && j < this.mouth_ele_end - 1) ||
          (j == this.mouth_ele_end - 1 && i < this.mouth_azi_end)) {
        next_level_skips = mouth_azi_width;
      }

      triangleIndices[triangleOffset] = 
        baselineOnLevel + i - skipped_vertices;
      triangleIndices[triangleOffset + 1] = 
        baselineOnLevel + azi_div + i - skipped_vertices - next_level_skips;
      triangleIndices[triangleOffset + 2] = 
        baselineOnLevel + azi_div + ((i + 1) % azi_div) - 
        skipped_vertices - mouth_azi_width * 
          ((i+1)!=azi_div && 
           ( (j == this.mouth_ele_start && i > this.mouth_azi_start) ||
             (j > this.mouth_ele_start && j < this.mouth_ele_end - 1) ||
             (j == this.mouth_ele_end - 1 && i < this.mouth_azi_end))); 

      triangleIndices[triangleOffset + 3] =
        baselineOnLevel + i - skipped_vertices;
      triangleIndices[triangleOffset + 4] = 
        baselineOnLevel + azi_div + ((i + 1) % azi_div) - 
        skipped_vertices - mouth_azi_width * 
          ((i+1)!=azi_div && 
           ( (j == this.mouth_ele_start && i > this.mouth_azi_start) ||
             (j > this.mouth_ele_start && j < this.mouth_ele_end - 1) ||
             (j == this.mouth_ele_end - 1 && i < this.mouth_azi_end))); 
      triangleIndices[triangleOffset + 5] = 
        baselineOnLevel + ((i + 1) % azi_div) - 
        skipped_vertices + mouth_azi_width *
          ((i + 1) == azi_div && j > this.mouth_ele_start && j <= this.mouth_ele_end - 1);

      triangleOffset += 6;
    }
  }

  // the bottom fan
  baselineOnLevel = (ele_div - 2) * azi_div + 1;
  var bottomVertex = vertices.length / 3 - 1;
  for (var i = 0; i < azi_div; i++) {
    triangleIndices[triangleOffset] = 
      baselineOnLevel + i - skipped_vertices;
    triangleIndices[triangleOffset + 1] = 
      bottomVertex; 
    triangleIndices[triangleOffset + 2] = 
      baselineOnLevel + ((i + 1) % azi_div) - skipped_vertices;

    triangleOffset += 3;
  }
	
  this.vertices = new Float32Array(vertices);
  this.triangleIndices = new Uint16Array(triangleIndices); 
	this.numVertices = this.vertices.length/3;
	this.numTriangles = this.triangleIndices.length/3;
}
