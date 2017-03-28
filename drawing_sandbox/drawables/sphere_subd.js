function Sphere_subd (divs) {

	this.name = "sphere_subd";

  // vertices
  // 3 Dims x 2 semi-spheres x (vertices in later x number of layers + "top vertices")
  // NOTE: top vertex is done separately because of rounding. n * (a / n) might not be 1.	
  
  // initialize the "zeroth division" vertices
  var radius = 2.0;
  this.vertices = [
      0.0,      0.0,      radius,
      radius,  0.0,      0.0,
      0.0,   radius,      0.0,
      -radius,  0.0,      0.0,
      0.0,  -radius,      0.0,
      0.0,      0.0,  -radius];

  this.triangleIndices = [
      0, 1, 2,  0, 2, 3,
      0, 3, 4,  0, 4, 1,
      1, 5, 2,  2, 5, 3,
      3, 5, 4,  4, 5, 1];

  // divide up the triangles as many times as necessar
  for (var i = 0; i < divs; i++) {
    [this.vertices, this.triangleIndices] = 
      getDivision(this.vertices, this.triangleIndices);
  }

  // scale the points to be on the outer sphere
  var index;
  var factor;
  var get_factor = function(x, y, z) { return Math.sqrt(radius * radius / (x*x + y*y + z*z));};
  var square = function(x) {return x * x;};
  for (var i = 0; i < this.vertices.length / 3; i++) {
    index = 3 * i;
    factor = get_factor(
        this.vertices[index], 
        this.vertices[index + 1], 
        this.vertices[index + 2]);

    this.vertices[index] = this.vertices[index] * factor;
    this.vertices[index + 1] = this.vertices[index + 1] * factor;
    this.vertices[index + 2] = this.vertices[index + 2] * factor;

    index += 3;
  }

  // finally set the appropriate fields...
  this.vertices = new Float32Array(this.vertices);
  this.triangleIndices = new Uint16Array(this.triangleIndices);
  this.numVertices = this.vertices.length/3;
	this.numTriangles = this.triangleIndices.length/3;
};

function getDivision(former_vertices, former_triangles) {
  var new_number_of_vertices = 2 * former_vertices.length + 6 * 3;
  var new_vertices = [];
  var new_triangles = [];
  var new_triangles_offset = 0;
  var new_vertices_offset = 0;

  // ******
  // For optimization sake, we keep track of vertices using a map
  // ******
  var new_vertices_map = {};
  var make_key = function(v) {return v.join(" ");};
  var getVertexIndexFromCoords = function(v, vertex_map) {
    return vertex_map[make_key(v)];
  };
  var putIntoVertexMap = function(coords, value, vertex_map) {
    vertex_map[make_key(coords)] = value;
  };
     
  // ******
  // A lot of definitions of functions that are necessary later on
  // ******
  var getAvg = function(x, y) {return (x/2 + y/2);};
  
  // get coordinates [x, y, z] of a vertex of index vIndex within vertices.
  var getCoordsFromIndex = function(vIndex, vertices) {
    var index = 3 * vIndex;

    if (index >= vertices.length) alert("Index out of bounds!");

    return [
      vertices[index],
      vertices[index + 1],
      vertices[index + 2]
    ];
  };

  // get coordinates [x, y, z] of a point halfway through v1 = [x1, y1, z1]
  // and v2 = [x2, y2, z2]
  var getCoordsBetween = function(v1, v2) {
    return [
      getAvg(v1[0], v2[0]),
      getAvg(v1[1], v2[1]),
      getAvg(v1[2], v2[2])
    ];
  };
 
  // divide a triangle into four triangles as requested. Modifies the 
  // new_vertices_offset, new_vertices, new_triangles_offset and new_triangles
  // as necessary.
  var divideTriangle = function(trIndex) {
    // given coordinates, get the index of a vertex in new_vertices array.
    // Insert the vertex if needed,
    var getNewIndex = function(coords) {
      var ind = getVertexIndexFromCoords(coords, new_vertices_map);
      if (ind != undefined) {
        return ind;
      }

      // vertex not in list yet. Add it. 
      new_vertices[new_vertices_offset] = coords[0];
      new_vertices[new_vertices_offset + 1] = coords[1];
      new_vertices[new_vertices_offset + 2] = coords[2];
      putIntoVertexMap(coords, new_vertices_offset/3, new_vertices_map);

      new_vertices_offset += 3;
      return new_vertices_offset / 3 - 1;
    };
  
    var index = 3 * trIndex;
    // Old vertex coordinates
    var ovc1 = getCoordsFromIndex(former_triangles[index], former_vertices);
    var ovc2 = getCoordsFromIndex(former_triangles[index + 1], former_vertices);
    var ovc3 = getCoordsFromIndex(former_triangles[index + 2], former_vertices);
    // Old vertices index
    var ovi1 = getNewIndex(ovc1);
    var ovi2 = getNewIndex(ovc2);
    var ovi3 = getNewIndex(ovc3);

    // new Vertices index
    var nvi1 = getNewIndex(getCoordsBetween(ovc1, ovc2));
    var nvi2 = getNewIndex(getCoordsBetween(ovc2, ovc3));
    var nvi3 = getNewIndex(getCoordsBetween(ovc3, ovc1));

    // add the triangles.
    var addTriangle = function(v1, v2, v3) {
      new_triangles[new_triangles_offset] = v1;
      new_triangles[new_triangles_offset + 1] = v2;
      new_triangles[new_triangles_offset + 2] = v3;

      new_triangles_offset += 3;
    };

    addTriangle(ovi1, nvi1, nvi3);
    addTriangle(nvi1, ovi2, nvi2);
    addTriangle(nvi2, ovi3, nvi3);
    addTriangle(nvi1, nvi2, nvi3);
  }; 

  // ******
  // Actually do the division
  // ******
	
  for (var i = 0; i < former_triangles.length / 3; i ++) {
    divideTriangle(i);
  }

  return [new_vertices, new_triangles];
};
