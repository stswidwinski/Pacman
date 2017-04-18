/// Global PCENG Client
//
// ID 4.0
/***********************************************************************/
var PCENGClient = PCENGClient || {};
/***********************************************************************/

PCENGClient.myPos = function () {
	return this.game.state.players.me.dynamicState.position;
}
PCENGClient.myOri = function () {
	return this.game.state.players.me.dynamicState.orientation;
}

PCENGClient.myFrame = function () {
	return this.game.state.players.me.dynamicState.frame;
}

PCENGClient.goatsFrame = function (goatIndex) {
  return this.game.state.players.goats[goatIndex].dynamicState.frame;
}

// PCENG Client Internals
/***********************************************************************/
PCENGClient.createObjectBuffers = function (gl, obj) {
  // create vertex buffer within the object.
	obj.vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, obj.vertices, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	obj.indexBufferTriangles = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBufferTriangles);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, obj.triangleIndices, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

	// create edges
	var edges = new Uint16Array(obj.numTriangles * 3 * 2);
	for (var i = 0; i < obj.numTriangles; ++i) {
		edges[i * 6 + 0] = obj.triangleIndices[i * 3 + 0];
		edges[i * 6 + 1] = obj.triangleIndices[i * 3 + 1];
		edges[i * 6 + 2] = obj.triangleIndices[i * 3 + 0];
		edges[i * 6 + 3] = obj.triangleIndices[i * 3 + 2];
		edges[i * 6 + 4] = obj.triangleIndices[i * 3 + 1];
		edges[i * 6 + 5] = obj.triangleIndices[i * 3 + 2];
	}

	obj.indexBufferEdges = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBufferEdges);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, edges, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
};

PCENGClient.drawObject = function (gl, obj, fillColor, lineColor) {
	gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer);
	gl.enableVertexAttribArray(this.uniformShader.aPositionIndex);
	gl.vertexAttribPointer(this.uniformShader.aPositionIndex, 3, gl.FLOAT, false, 0, 0);

	gl.enable(gl.POLYGON_OFFSET_FILL);
	gl.polygonOffset(1.0, 1.0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBufferTriangles);
	gl.uniform4fv(this.uniformShader.uColorLocation, fillColor);
	gl.drawElements(gl.TRIANGLES, obj.triangleIndices.length, gl.UNSIGNED_SHORT, 0);

	gl.disable(gl.POLYGON_OFFSET_FILL);

	gl.uniform4fv(this.uniformShader.uColorLocation, lineColor);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBufferEdges);
	gl.drawElements(gl.LINES, obj.numTriangles * 3 * 2, gl.UNSIGNED_SHORT, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

	gl.disableVertexAttribArray(this.uniformShader.aPositionIndex);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
};

PCENGClient.createObjects = function () {
	var bbox = this.game.race.bbox;
	var quad = [
    bbox[0], bbox[1] - 0.01, bbox[2],
		bbox[3], bbox[1] - 0.01, bbox[2],
		bbox[3], bbox[1] - 0.01, bbox[5],
		bbox[0], bbox[1] - 0.01, bbox[5]
	];

	this.ground = new Quadrilateral(quad);

  this.walls = this.game.race.walls;
  this.cube = new Cube();
  this.halfsphere = new HalfSphere(1.0);

  // for all dots, keep a single sphere in mem.
  this.dots = this.game.race.dots;
  this.sphere = new Sphere(1.0);
};

PCENGClient.createBuffers = function (gl) {
	this.createObjectBuffers(gl, this.ground);
	this.createObjectBuffers(gl, this.sphere);
  this.createObjectBuffers(gl, this.cube);
  this.createObjectBuffers(gl, this.halfsphere);
};

PCENGClient.initializeObjects = function (gl) {
	this.createObjects();
	this.createBuffers(gl);
};

PCENGClient.drawScene = function (gl) {
  var newTime = new Date().getTime();
  this.dt = newTime - this.time;
  this.time = newTime;

	var pos = this.myPos();

	var width = this.ui.width;
	var height = this.ui.height
	var ratio = width / height;

	gl.viewport(0, 0, width, height);

	// Clear the framebuffer
	gl.clearColor(0.4, 0.6, 0.8, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.enable(gl.DEPTH_TEST);
	gl.useProgram(this.uniformShader);

  // Setup the cameras
	this.stack.loadIdentity();
  var currentCamera = this.cameras[this.currentCamera];
  if (currentCamera.setProjection) {
    currentCamera.setProjection(gl);
    var invV = SglMat4.lookAt([0, 20, 0], [0, 0, 0], [1, 0, 0]);
	  this.stack.multiply(invV);
  } else {
    // the default perspective is just the projection matrix
    gl.uniformMatrix4fv(
        this.uniformShader.uProjectionMatrixLocation, 
        false, 
        SglMat4.perspective(3.14/4, ratio, 1, 200));
  }
	currentCamera.setView(this.stack, this.myFrame());

  var stack = this.stack;
  stack.push();

  this.drawPacman(gl);

  gl.uniformMatrix4fv(this.uniformShader.uModelViewMatrixLocation, false, stack.matrix);
	this.drawObject(gl, this.ground, [0.2, 0.2, 0.3, 1.0], [0.2, 0.2, 0.3, 1.0]);
  
  this.drawWalls(gl);
  this.drawDots(gl);
//  this.drawWaypoints(gl);
  this.drawGoats(gl);

	gl.useProgram(null);
	gl.disable(gl.DEPTH_TEST);
};
/***********************************************************************/

PCENGClient.initMotionKeyHandlers = function () {
	var game = this.game;

	var carMotionKey = {};
	carMotionKey["W"] = function (on) {
		game.playerAccelerate = on;
	};
	carMotionKey["S"] = function (on) {
		game.playerBrake = on;
	};
	carMotionKey["A"] = function (on) {
		game.playerSteerLeft = on;
	};
	carMotionKey["D"] = function (on) {
		game.playerSteerRight = on;
	};
	this.carMotionKey = carMotionKey;
};

// PCENG Client Events
/***********************************************************************/
PCENGClient.onInitialize = function () {
	var gl = this.ui.gl;
	PCENG.log("SpiderGL Version : " + SGL_VERSION_STRING + "\n");
	this.game.player.color = [1.0, 0.0, 0.0, 1.0];
	this.initMotionKeyHandlers();
	this.stack = new SglMatrixStack();
	this.initializeObjects(gl);
	this.uniformShader = new uniformShader(gl);
  this.initializeCameras();
  this.time = new Date().getTime();
};

PCENGClient.onTerminate = function () {};

PCENGClient.onConnectionOpen = function () {
	PCENG.log("[Connection Open]");
};

PCENGClient.onConnectionClosed = function () {
	PCENG.log("[Connection Closed]");
};

PCENGClient.onConnectionError = function (errData) {
	PCENG.log("[Connection Error] : " + errData);
};

PCENGClient.onLogIn = function () {
	PCENG.log("[Logged In]");
};

PCENGClient.onLogOut = function () {
	PCENG.log("[Logged Out]");
};

PCENGClient.onNewRace = function (race) {
	PCENG.log("[New Race]");
};

PCENGClient.onPlayerJoin = function (playerID) {
	PCENG.log("[Player Join] : " + playerID);
	this.game.opponents[playerID].color = [0.0, 1.0, 0.0, 1.0];
};

PCENGClient.onPlayerLeave = function (playerID) {
	PCENG.log("[Player Leave] : " + playerID);
};

PCENGClient.onKeyDown = function (keyCode, event) {
  // don't move Pacman if we are in the observer camera!
  if (this.currentCamera != 2) {
	  this.carMotionKey[keyCode] && this.carMotionKey[keyCode](true);
  }

  this.cameras[this.currentCamera].keyDown(keyCode);
};

PCENGClient.onKeyUp = function (keyCode, event) {
	this.carMotionKey[keyCode] && this.carMotionKey[keyCode](false);

  if (keyCode == "2") {
    this.nextCamera();
  } else if (keyCode == "1") {
    this.prevCamera();
  }

  this.cameras[this.currentCamera].keyUp(keyCode);
};

PCENGClient.onKeyPress = function (keyCode, event) {};

PCENGClient.onMouseButtonDown = function (button, x, y, event) {
  this.cameras[this.currentCamera].mouseButtonDown(x,y);
};

PCENGClient.onMouseButtonUp = function (button, x, y, event) {
  this.cameras[this.currentCamera].mouseButtonUp(x, y);
};

PCENGClient.onMouseMove = function (x, y, event) {
  this.cameras[this.currentCamera].mouseMove(x,y);
};

PCENGClient.onMouseWheel = function (delta, x, y, event) {};

PCENGClient.onClick = function (button, x, y, event) {};

PCENGClient.onDoubleClick = function (button, x, y, event) {};

PCENGClient.onDragStart = function (button, x, y) {};

PCENGClient.onDragEnd = function (button, x, y) {};

PCENGClient.onDrag = function (button, x, y) {};

PCENGClient.onResize = function (width, height, event) {};

PCENGClient.onAnimate = function (dt) {
	this.ui.postDrawEvent();
};

PCENGClient.onDraw = function () {
	var gl = this.ui.gl;
	this.drawScene(gl);
};
/***********************************************************************/
