var PCENGClient = PCENGClient || {};

function FirstPersonCamera() {
  this.position = [0.0, 0.0, 0.0];
  this.keyDown = function (keyCode) {};
  this.keyUp = function (keyCode) {};
  this.mouseMove = function (event) {};
  this.mouseButtonDown = function (event) {};
  this.mouseButtonUp = function () {};
  this.setView = function (stack, F_0) {
		var Rx = SglMat4.rotationAngleAxis(sglDegToRad(-10), [1.0, 0.0, 0.0]);
		var T = SglMat4.translation([0.0, 2.5, -0.5]);
		var Vc_0 = SglMat4.mul(T, Rx);
		var V_0 = SglMat4.mul(F_0, Vc_0);
		this.position = SglMat4.col(V_0,3);
		var invV = SglMat4.inverse(V_0);
    stack.multiply(invV);
	};
}

function OverheadCamera(client) {
  this.position = [0.0, 0.0, 0.0];
  this.keyDown = function (keyCode) {};
  this.keyUp = function (keyCode) {};
  this.mouseMove = function (event) {};
  this.mouseButtonDown = function (event) {};
  this.mouseButtonUp = function () {};

  this.setProjection = function (gl) {
    var width = client.ui.width;
    var height = client.ui.height;
    var ratio = width / height;

    var bbox = client.game.race.bbox;
    var winW = (bbox[3] - bbox[0]);
    var winH = (bbox[5] - bbox[2]);
	  winW = winW * ratio * (winH / winW);

    var P = SglMat4.ortho([-winW / 2, -winH / 2, 0.0], [winW / 2, winH / 2, 21.0]);
    gl.uniformMatrix4fv(client.uniformShader.uProjectionMatrixLocation, false, P);
  };
  this.setView = function (stack, F_0) {
  }	
}

function ObserverCamera() {
  this.position = [0.0, 0.0, 0.0];

  // this is the displacement vector
  this.t_V = [0.0, 0.0, 0.0, 0.0];
  // this is the view matrix that we use throughout
  this.V = SglMat4.identity();
	SglMat4.col$(this.V,3,[ 0.0, 20.0, 100.0, 1]);
  // those are the two angles we are allowed to look around in 
  this.alpha = 0;  // the vertical
  this.beta = 0;   // the horizontal
  // these are use to compute the angle of rotation.
  this.targeting_camera = false;
  this.start_x;
  this.start_y;

  // keys handling function that are later registered as the handlers
	this.forward 		= function (on) {this.t_V = [0, 0, -on / 1.0,0.0]	;};
	this.backward 	    = function (on) {this.t_V = [0, 0, on / 1.0,0.0]	;};
	this.left 			= function (on) {this.t_V = [-on / 1.0, 0, 0,0.0]	;};
	this.right 			= function (on) {this.t_V = [on / 1.0, 0, 0,0.0]	;};
	this.up 			= function (on) {this.t_V = [ 0.0, on/3.0, 0,0.0]	;};
	this.down 			= function (on) {this.t_V = [0.0, -on/3.0, 0,0.0]	;};

  // key handlers
	var me = this;
	this.handleKeyObserver = {};
	this.handleKeyObserver["W"] = function (on) {me.forward(on)	;	};
	this.handleKeyObserver["S"] = function (on) {me.backward(on);	};
	this.handleKeyObserver["A"] = function (on) {me.left(on);		};
	this.handleKeyObserver["D"] = function (on) {me.right(on);		};
	this.handleKeyObserver["Q"] = function (on) {me.up(on);			};
	this.handleKeyObserver["E"] = function (on) {me.down(on);		};
  this.keyDown = function(keyCode) {
    this.handleKeyObserver[keyCode] && this.handleKeyObserver[keyCode](true);
  }
  this.keyUp = function(keyCode) {
    this.handleKeyObserver[keyCode] && this.handleKeyObserver[keyCode](false);
  }

  // mouse handling functions.
	this.mouseButtonDown = function (x,y) {
    this.targeting_camera = true;
    this.start_x = x;
    this.start_y = y;
	};
	this.mouseButtonUp = function (event) {
    this.targeting_camera = false;
  };
	this.mouseMove = function (x,y) {
    if (!this.targeting_camera) return;

	  this.alpha = x - this.start_x;
		this.beta = -(y - this.start_y);
		this.start_x = x;
		this.start_y = y;
  }

  this.updateCamera = function () {
		var dir_world = SglMat4.mul4(this.V, this.t_V);
		var newPosition = [];

    // calculate the new position.
		newPosition = SglMat4.col(this.V,3);
		newPosition = SglVec4.add(newPosition, dir_world);
		SglMat4.col$(this.V,3,[0.0,0.0,0.0,1.0]);
		var R_alpha = SglMat4.rotationAngleAxis(sglDegToRad(this.alpha/10), [0, 1, 0]);
		var R_beta = SglMat4.rotationAngleAxis(sglDegToRad(this.beta/10), [1, 0, 0]);
		this.V = SglMat4.mul(SglMat4.mul(R_alpha, this.V), R_beta);
		SglMat4.col$(this.V,3,newPosition);

    // set and reset
		this.position = newPosition;
		this.alpha = 0;
		this.beta = 0;
	};

  this.setView = function(stack) {
    this.updateCamera();
    var invV = SglMat4.inverse(this.V);
    stack.multiply(invV);
  }

}

PCENGClient.cameras = [];
PCENGClient.cameras[0] = new FirstPersonCamera();
PCENGClient.cameras[1] = new OverheadCamera(PCENGClient);
PCENGClient.cameras[2] = new ObserverCamera();
PCENGClient.n_cameras = 3;
PCENGClient.currentCamera = 0;

PCENGClient.nextCamera = function () {
  if (this.n_cameras - 1 > this.currentCamera) {
    this.currentCamera ++;
  }
} 

PCENGClient.prevCamera = function () {
  if (this.currentCamera > 0) {
    this.currentCamera --;
  }
}

PCENGClient.initializeCameras = function () {
};


