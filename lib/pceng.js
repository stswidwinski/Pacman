// PaCman ENGine
//
// Adapted from NVMC.

var PCENG = PCENG || { };

PCENG.__defineGetter__("_ticks", function () {
	var d = new Date();
	return Math.floor(d.getTime());
});

// Simple Running Average implementation
//
// Used for latency calculation.
PCENG._RunningAverage = function () {
	this.reset();
};

PCENG._RunningAverage.prototype = {
	reset : function () {
		this._value = 0;
		this._count = 0;
	},

	addSample : function (x) {
		this._value = ((this._value * this._count) + x) / (this._count + 1);
		this._count++;
	},

	get value() {
		return this._value;
	},

	get count() {
		return this._count;
	}
};

// The physics engine storage space. Contains a bunch of 
// data about objects that are constant throughout.
PCENG.PhysicsStaticState = function () {
	this._reset();
};

PCENG.PhysicsStaticState.Default = { };

PCENG.PhysicsStaticState.Default.MASS               = 1.0;
PCENG.PhysicsStaticState.Default.FORWARD_FORCE      = 20.0;
PCENG.PhysicsStaticState.Default.BACKWARD_FORCE     = 20.0;
PCENG.PhysicsStaticState.Default.LINEAR_FRICTION    = 1.0;
PCENG.PhysicsStaticState.Default.STEER_ACCELERATION = 5;

PCENG.PhysicsStaticState.prototype = {
	_reset : function () {
		this._mass              = PCENG.PhysicsStaticState.Default.MASS;
		this._forwardForce      = PCENG.PhysicsStaticState.Default.FORWARD_FORCE;
		this._backwardForce     = PCENG.PhysicsStaticState.Default.BACKWARD_FORCE;
		this._linearFriction    = PCENG.PhysicsStaticState.Default.LINEAR_FRICTION;
		this._steerAcceleration = PCENG.PhysicsStaticState.Default.STEER_ACCELERATION;
	},

	_parseMessage : function (msg) {
		this._mass              = msg.m;
		this._forwardForce      = msg.f;
		this._backwardForce     = msg.b;
		this._linearFriction    = msg.l;
		this._steerAcceleration = msg.s;
		return true;
	},

	get mass()              { return this._mass;              },
	get forwardForce()      { return this._forwardForce;      },
	get backwardForce()     { return this._backwardForce;     },
	get linearFriction()    { return this._linearFriction;    },
	get steerAcceleration() { return this._steerAcceleration; }
};

// The part of the physics engine that changes in time.
PCENG.PhysicsDynamicState = function () {
	this._reset();
};

PCENG.PhysicsDynamicState.prototype = {
	_reset : function () {
		this._position        = SpiderGL.Math.Vec3.zero();
		this._linearVelocity  = SpiderGL.Math.Vec3.zero();
		this._orientation     = Math.PI;
		this._angularVelocity = 0.0;
		this._frame = [];
	},

	_parseMessage : function (msg) {
		this._position        = msg.p;
		this._linearVelocity  = msg.l;
		this._orientation     = msg.o;
		this._angularVelocity = msg.a;
		return true;
	},

	_clone : function () {
		var r = new PCENG.PhysicsDynamicState();
		r._position        = this._position.slice();
		r._linearVelocity  = this._linearVelocity.slice();
		r._orientation     = this._orientation;
		r._angularVelocity = this._angularVelocity;
		r._frame	   = this._frame;
		return r;
	},

	_copyFrom : function (s) {
		this._position        = s._position.slice();
		this._linearVelocity  = s._linearVelocity.slice();
		this._orientation     = s._orientation;
		this._angularVelocity = s._angularVelocity;
		this._frame = s._frame;
	},

	_wrapAngle : function (x) {
		var twoPi = 2.0 * Math.PI;
		while (x > 0.0) { x -= twoPi; }
		while (x < 0.0) { x += twoPi; }
		return x;
	},

	_lerp : function (a, b, t) {
		if (t == 0.0) {
			this._copyFrom(b);
			return;
		}

		if (t == 1.0) {
			this._copyFrom(a);
			return;
		}

		var s = 1.0 - t;

		this._position       = SpiderGL.Math.Vec3.add(
        SpiderGL.Math.Vec3.muls(a._position,       t), 
        SpiderGL.Math.Vec3.muls(b._position,       s));
		this._linearVelocity = SpiderGL.Math.Vec3.add(
        SpiderGL.Math.Vec3.muls(a._linearVelocity, t), 
        SpiderGL.Math.Vec3.muls(b._linearVelocity, s));

		var oa = this._wrapAngle(a._orientation);
		var ob = this._wrapAngle(b._orientation);
	
		if (oa < ob) {
			if ((ob - oa) > Math.PI) {
				oa += 2.0 * Math.PI;
			}
		} else {
			if ((oa - ob) > Math.PI) {
				ob += 2.0 * Math.PI;
			}
		}

		var ot = ((oa * t) + (ob * s));
		this._orientation = this._wrapAngle(ot);
		this._angularVelocity = ((a._angularVelocity * t) + (b._angularVelocity * s));
	},

	get position()        	{ return this._position;        },
	get linearVelocity()  	{ return this._linearVelocity;  },
	get orientation()     	{ return this._orientation;     },
	get angularVelocity() 	{ return this._angularVelocity; },
	get frame() 						{ return this._frame; },

};

// The input to the physics engine
PCENG.InputState = function () {
	this._reset();
};

PCENG.InputState._NONE        = (     0);
PCENG.InputState._ACCELERATE  = (1 << 0);
PCENG.InputState._BRAKE       = (1 << 1);
PCENG.InputState._STEER_LEFT  = (1 << 2);
PCENG.InputState._STEER_RIGHT = (1 << 3);

PCENG.InputState.prototype = {
	_reset : function () {
		this._s = PCENG.InputState._NONE;
	},

	_parseMessage : function (msg) {
		this._s = msg.s;
		return true;
	},

	get _state()        { return this._s; },
	set _state(s)       { this._s = s;    },

	get _accelerate()   { return ((this._s & PCENG.InputState._ACCELERATE) != 0); },
	set _accelerate(on) { if (on) { this._s |= PCENG.InputState._ACCELERATE; } else { this._s &= ~(PCENG.InputState._ACCELERATE); } },

	get _brake()        { return ((this._s & PCENG.InputState._BRAKE) != 0); },
	set _brake(on)      { if (on) { this._s |= PCENG.InputState._BRAKE; } else { this._s &= ~(PCENG.InputState._BRAKE); } },

	get _steerLeft()    { return ((this._s & PCENG.InputState._STEER_LEFT) != 0); },
	set _steerLeft(on)  { if (on) { this._s |= PCENG.InputState._STEER_LEFT; } else { this._s &= ~(PCENG.InputState._STEER_LEFT); } },

	get _steerRight()   { return ((this._s & PCENG.InputState._STEER_RIGHT) != 0); },
	set _steerRight(on) { if (on) { this._s |= PCENG.InputState._STEER_RIGHT; } else { this._s &= ~(PCENG.InputState._STEER_RIGHT); } },

	get accelerate()   { return this._accelerate; },
	get brake()        { return this._brake;      },
	get steerLeft()    { return this._steerLeft;  },
	get steerRight()   { return this._steerRight; }
};

PCENG.WaypointGraph = function (graphDescription) {
  this._reset();
  this._parseGraph(graphDescription);
}

PCENG.WaypointGraph.prototype = {
  _reset : function () {
    this._waypoints = null;
  },

  _getEntranceNode : function () {
    return this._entranceNode;
  },

  _getKey : function(coords) {
    return (
      coords[0].toFixed(3).toString() + "," +
      coords[1].toFixed(3).toString() + "," +
      coords[2].toFixed(3).toString());
  },

  _parseGraph : function(graphDescription) {
    if (!graphDescription) return;
    this._entranceNode = graphDescription[0];
    this._waypoints = new Map();

    for (var i = 0; i < graphDescription.length; i++) {
      var elt = graphDescription[i];
      var key = this._getKey(elt.position); 

      this._waypoints.set(key, elt.neigh);
    }
  },

  _getRandomNeighbor(coords) {
    var neigh = this._waypoints.get(this._getKey(coords));
    var randomNeighInd = Math.floor(Math.random() * neigh.length);

    return neigh[randomNeighInd].position;
  }
};

PCENG.CollisionMap = function (objects, bbox) {
  this._reset();
  this._parseObjects(objects, bbox);
};

PCENG.CollisionMap.prototype = {
  _reset : function() {
    this._walls = null;
    this._dots = null;
    this._xDivs = 40;
    this._zDivs = 40;
  }, 

  _parseObjects : function (objects, bbox) {
    obj = SpiderGL.Utility.getDefaultObject({
      _walls: [ ],
      _dots: [ ]
    }, objects);

    this._collisionMap = [];
    this._xMinMax = [bbox[0], bbox[3]];
    this._zMinMax = [bbox[2], bbox[5]];

    this._xLen = this._xMinMax[1] - this._xMinMax[0];
    this._zLen = this._zMinMax[1] - this._zMinMax[0];
    this._initializeCollisionMap();
    this._addObjectsToCollisionMap(obj._walls);
    this._addObjectsToCollisionMap(obj._dots);
  },

  _getBucketIndex : function (coord, divLen, minCoord) {
    var k = (coord - minCoord) % divLen;

    return Math.floor((coord - k - minCoord) / divLen);
  },

  _getXBucketIndex : function (xCoord) {
    // The assumption is that every divider has coordinate
    // of the form:
    //
    // div(i) = this._xMinMax[0] + i * this._xLen / this._xDivs;
    //
    // Hence any coordinate x may be described as:
    //
    // x = this._xMinMax[0] + j * this._xLen / this._xDivs + k
    //
    // for a positive k. Knowing this we may compute all that is needed.
    return this._getBucketIndex(
        xCoord, this._xLen / this._xDivs, this._xMinMax[0]);
  },

  _getZBucketIndex : function(zCoord) {
    // The logic from above transfers directly.
    return this._getBucketIndex(
        zCoord, this._zLen / this._zDivs, this._zMinMax[0]);
  },

  _initializeCollisionMap : function (bbox) {
    this._collisionMap = [];

    // initialize the collision map matrix
    for (var i = 0; i < this._xDivs + 1; i++) {
      this._collisionMap[i] = [];
      for (var j = 0; j < this._zDivs + 1; j++) {
        this._collisionMap[i][j] = [];
      }
    }
  },

  _addToAllWithinBox : function (blh, trf, object) {
    var firstZBucket = this._getZBucketIndex(blh[2]);
    var lastZBucket = this._getZBucketIndex(trf[2]);
    var firstXBucket = this._getXBucketIndex(blh[0]);
    var lastXBucket = this._getXBucketIndex(trf[0]);

    for (var i = firstXBucket; i <= lastXBucket; i++) {
      for (var j = firstZBucket; j <= lastZBucket; j++) {
        this._collisionMap[i][j].push(object); 
      }
    }
  },
  
  _addObjectsToCollisionMap : function (objects) {
    for (var i = 0; i < objects.length; i++) {
      this._addObjectToCollisionMap(objects[i]);
    }
  },

  _addObjectToCollisionMap : function (object) {
    if (object instanceof PCENG.Wall) {
      this._addToAllWithinBox(
        object.blh, object.trf, object 
      );
    } else if (object instanceof PCENG.Dots) {
      var pos = object.position;
      var size = object.size;
      this._addToAllWithinBox(
        [pos[0] - size, pos[1] - size, pos[2] - size],
        [pos[0] + size, pos[1] + size, pos[2] + size],
        object
      );
    } else {
      console.assert(false, "Object of unknown type");
    }
  },

  _getPlausiblyCollidingObjects(pos, geom) {
    var firstZBucket = this._getZBucketIndex(pos[2] - geom._zLen / 2);
    var lastZBucket = this._getZBucketIndex(pos[2] + geom._zLen / 2);
    var firstXBucket = this._getZBucketIndex(pos[0] - geom._xLen / 2);
    var lastXBucket = this._getZBucketIndex(pos[0] + geom._xLen / 2);

    var result = [];
    for (var i = firstXBucket;i <= lastXBucket; i++) {
      for (var j = firstZBucket; j <= lastZBucket; j++) {
        var bucket = this._collisionMap[i][j];
        for (var k = 0; k < bucket.length; k++) {
          result.push(bucket[k]);
        }
      }
    }

    var noRepetitionObjects =  Array.from(new Set(result));

    // bucketize them!
    var result = {
      walls: [],
      dots: [],
    };

    for (var i = 0; i < noRepetitionObjects.length; i ++) {
      var curr = noRepetitionObjects[i];
      if (curr instanceof PCENG.Wall) {
        result.walls.push(curr);
      } else if (curr instanceof PCENG.Dots) {
        result.dots.push(curr);
      }
    }

    return result;
  }
}

PCENG.Geometry = function(geom) {
  this._parseGeom(geom);
};

PCENG.Geometry.prototype = {
  _reset : function () {
    this._type = null;
    this._size = null;
    this._xLen = null;
    this._yLen = null;
    this._zLen = null;
  },

  _parseGeom: function (geom) {
    if (geom._type == "sphere") {
      var geom = SpiderGL.Utility.getDefaultObject({
        _position: [ ],
        _size: 2
      });

      this._type = "sphere";
      this._xLen = geom._size;
      this._yLen = geom._size;
      this._zLen = geom._size;
    } else if (geom._type == "cube") {
      var geom = SpiderGL.Utility.getDefaultObject({
        _blh: [ ],
        _trf: [ ],
      }, geom);

      this._type = "cube";
      this._xLen = geom._trf[0] - geom._blh[0];
      this._yLen = geom._trf[1] - geom._blh[1];
      this._zLen = geom._trf[2] - geom._blh[2];
    } else {
      console.assert(false, "unknown geometry type");
    } 
  },
};

PCENG.NPC = function (id) {
  this._id = id;
  this._wg = null;
  this._collisionMap = null;
  this._pacman = null;
  this._reset();
};

PCENG.NPC.prototype = {
  _reset : function() {
    this._splineCoeff = 0.15;
    this._plausibleWallsCollision = null;
    this._spline = null;
    this._splinePrime = null;
    this._maxSpeed = 30;
    this._speedSigma = 0.5;
    this._dynamicState = new PCENG.PhysicsDynamicState; 
    this._currentU = 0;
    this._du = 0.5;
  },

  _setWaypointsGraph : function(waypointGraph) {
    this._wg = waypointGraph;
    this._currentWaypoints = [
      [0, 0, 0],
      [0, 0, 0],
      this._wg._getEntranceNode().position     
    ];
  },

  _setGeometry : function (geom) {
    this._geometry = new PCENG.Geometry(geom);
    this._reset();
  },

  _setCollisionMap : function(map) {
    this._collisionMap = map;
  },
  
  _setPacmanHandle : function(pacman) {
    this._pacman = pacman;
  },

  _collisionWithWalls : function (position) {
    if (!this._plausibleWallsCollisions) return false;

    var myPos = position;
    var walls = this._plausibleWallsCollisions;

    var square = function(x) {return x*x;}
    for (var i = 0; i < walls.length; i++) {
      var wall = walls[i];
      var wallMinCoords = wall.blh;
      var wallMaxCoords = wall.trf;
      var myMinCoords = [
        myPos[0] - this._geometry._xLen / 2,
        myPos[1],
        myPos[2] - this._geometry._zLen / 2];
      var myMaxCoords = [
        myPos[0] + this._geometry._xLen / 2,
        myPos[1] + this._geometry._yLen / 2,
        myPos[2] + this._geometry._zLen / 2];

      var beginningIntercepts = function(j) {
        return (
            myMinCoords[j] > wallMinCoords[j] &&
            myMinCoords[j] < wallMaxCoords[j]);
      }
      var endIntercepts = function (j) {
        return (
          myMaxCoords[j] < wallMaxCoords[j] &&
          myMaxCoords[j] > wallMinCoords[j]);
      }

      var intersection = true;
      for (var j = 0; j < 3; j++) {
        // beginning or end overlap. Inclusion is assumed not to occur.
        if (!beginningIntercepts(j) && !endIntercepts(j)) {
          intersection = false;
        }
      }

      if (intersection) return true;
    }
    
    return false;
  },

  _checkPacmanCollision : function (pos) {
    if (!this._pacman || !this._geometry) return;
    
    var pacmanPos = this._pacman._dynamics._remote._position;
    var square = function(x) {return x*x;}

    var myMinCoords = [
      pos[0] - this._geometry._xLen / 2.0,
      0,
      pos[2] - this._geometry._zLen / 2.0
    ];
    var myMaxCoords = [
      pos[0] + this._geometry._xLen / 2.0,
      this._geometry._yLen,
      pos[2] + this._geometry._zLen / 2.0
    ];

    var pacRadDist = square(this._pacman._geometry._zLen);

    for (var j = 0; pacRadDist > 0 && j < 3; j++) {
      if (pacmanPos[j] < myMinCoords[j]) {
        pacRadDist -= square(pacmanPos[j] - myMinCoords[j]);
      } else if (pacmanPos[j] > myMaxCoords[j]) {
        pacRadDist -= square(pacmanPos[j] - myMaxCoords[j]);
      }
    }

    if (pacRadDist > 0) {
      alert("YOU LOST!");
    }
  },

  _updatePlausibleCollisions : function (pos) {
    if (!this._collisionMap || !this._geometry) return;
    
    var plausibleCollisions = 
      this._collisionMap._getPlausiblyCollidingObjects(
          pos, this._geometry);
    this._plausibleWallsCollisions = plausibleCollisions.walls;
  },

  _updateState : function (state, dt) {
    var velocity = this._splinePrime(this._currentU);
    var speed = SpiderGL.Math.Vec3.length(velocity);
    var du = (this._maxSpeed * dt) / speed;
    var newPosition;

    if (du + this._currentU > 1) { 
      this._currentU = 1.0;
      newPosition = this._spline(1.0);
    } else {
      newPosition = this._spline(this._currentU + du);
    }

    this._currentU += du;
    var orientation = Math.acos(
        SpiderGL.Math.Vec3.dot(
          SpiderGL.Math.Vec3.normalize(velocity), [0, 0, -1]));

    if (velocity[2] < 0 && velocity[0] > 0) {
      orientation = Math.PI * 2 - orientation;
    } else if (velocity[2] > 0 && velocity[0] > 0) {
      orientation = Math.PI * 2 - orientation; 
    }

    this._checkPacmanCollision(newPosition);
    state._orientation = orientation;
    state._position = newPosition;
		var z_axis = 
      SpiderGL.Math.Mat4.mul4(
          SpiderGL.Math.Mat4.rotationAngleAxis(
            state._orientation, [0, 1, 0,0]),[0,0,1,0]);
		z_axis = [ z_axis[0], z_axis[1],z_axis[2]];
		var x_axis = SpiderGL.Math.Vec3.cross([0, 1, 0], z_axis);
		state._frame = [	-x_axis[0],		-x_axis[1],			-x_axis[2]		,0.0,
											0.0,		1.0,			0.0		,0.0,
											-z_axis[0],	-z_axis[1],			-z_axis[2]		,0.0,
											state._position[0],	state._position[1],	state._position[2]	,1.0];
  },

  _update : function (dt, smoothingDecay) {

    if (this._currentU >= 1.0) {
      this._currentU = 0;
      var self = this;
      this._currentWaypoints.shift();
   }

    this._updateWaypoints();
    this._updateState(this._dynamicState, dt);
  },

  _updateWaypoints : function () {
    var updated = false;

    while (this._currentWaypoints.length < 4) {
      var len = this._currentWaypoints.length;
      var lastPoint = this._currentWaypoints[len - 1];
      var toPoint = this._currentWaypoints[len - 2];
      var newPoint;
      do {
        newPoint = this._wg._getRandomNeighbor(lastPoint);
      } while (
          newPoint[0] == toPoint[0] && 
          newPoint[1] == toPoint[1] && 
          newPoint[2] == toPoint[2]
      );
      this._currentWaypoints.push(newPoint);
      this._currentWaypoints[1] = this._dynamicState._position;
      updated = true;
    }

    if (updated) this._updateSpline();
  },

  _updateSpline : function () {
    var self = this;
    var vecSum = function(a,b) {
      return [
        a[0] + b[0],
        a[1] + b[1],
        a[2] + b[2]];
    };
    var vecDiff  = function(a,b) {
      return vecSum(a, smult(b, -1));
    }

    var smult = function(v, s) {
      return [
        v[0] * s, v[1] * s, v[2] * s];
    };

    [this._spline, this._splinePrime] = (function() {
      var [p1, p2, p3, p4] = self._currentWaypoints;
      var s = self._splineCoeff;

      var a0 = p2;
      var a1 = smult(vecDiff(p3, p1), s);
      var a2 = 
        vecSum(
          vecSum(
            smult(p4, -s),
            smult(p3, (3 - 2*s))),
          vecSum(
            smult(p1, 2*s),
            smult(p2, (s - 3))));
      var a3 =
        vecSum(
          vecSum(
            smult(p4, s),
            smult(p3, s - 2)),
          vecSum(
            smult(p2, 2 - s),
            smult(p1, -s)));
 
      return [(function(u) {
        var u2 = u*u;
        var u3 = u2*u;
        return vecSum(
            vecSum(
              smult(a3, u3),
              smult(a2, u2)),
            vecSum(
              smult(a1, u),
              a0))
      }), function(u) {
        var u2 = u*u;
        return vecSum(
            vecSum(
              smult(a3, u2),
              smult(a2, u)),
            a1);
      }];
    } ());
  },

  get id() { return this._id; },
  get dynamicState() { return this._dynamicState; },
  get waypoints() { return this._currentWaypoints; },
};

PCENG.Player = function (id) {
	this._id = id;
	this._reset();
};

PCENG.Player.prototype = {
	_reset : function () {
		this._statics = new PCENG.PhysicsStaticState();
		var dynState = new PCENG.PhysicsDynamicState();
		this._dynamics = {
			_remote  : dynState,
			_local   : dynState._clone(),
			_display : dynState._clone(),
		};
		this._input = new PCENG.InputState();
		this._currentSmoothing = 0.0;
	},

  _setGeometry : function(geom) {
    this._geometry = new PCENG.Geometry(geom);
  },

	_updateState : function (state, dt) {
		var m = this._statics._mass;
		var f = this._statics._forwardForce;
		var b = this._statics._backwardForce;
		var l = this._statics._linearFriction;
		var s = this._statics._steerAcceleration;

		var linearForceAmount = 0.0;
		if (this._input._accelerate)
            linearForceAmount += f;
		if (this._input._brake)      linearForceAmount -= b;

		var linearFriction = SpiderGL.Math.Vec3.muls(state._linearVelocity, -l);
		var linearForce    = SpiderGL.Math.Vec3.muls(
        [
          SpiderGL.Math.sin(state._orientation), 
          0.0, 
          SpiderGL.Math.cos(state._orientation)
        ], 
        linearForceAmount);
		var resLinearForce = SpiderGL.Math.Vec3.add(linearFriction, linearForce);

		var linearAcceleration = SpiderGL.Math.Vec3.muls(resLinearForce, 1.0/m);
    var newPosition = SpiderGL.Math.Vec3.add(
          state._position,       
          SpiderGL.Math.Vec3.muls(state._linearVelocity, dt));

    this._updatePlausibleCollisions(newPosition);
    this._collisionWithDots(newPosition);
    // don't update linear and position if there is a collision with a walls
    var [collisionHappens, bounceVector] = this._collisionWithWalls(newPosition);
    if (!collisionHappens) {
     state._position = newPosition     
     state._linearVelocity  = SpiderGL.Math.Vec3.add(
          state._linearVelocity, 
          SpiderGL.Math.Vec3.muls(linearAcceleration,    dt));
    } else {
     state._linearVelocity = SpiderGL.Math.Vec3.mul(
         state._linearVelocity,
         bounceVector)
    }
   
    var angularAcceleration = 0.0;
		if (this._input._steerLeft)  angularAcceleration += s;
		if (this._input._steerRight) angularAcceleration -= s;

		state._orientation = state._orientation + angularAcceleration * dt;

		var z_axis = SpiderGL.Math.Mat4.mul4(SpiderGL.Math.Mat4.rotationAngleAxis(state._orientation, [0, 1, 0,0]),[0,0,1,0]);
		z_axis = [ z_axis[0], z_axis[1],z_axis[2]];
		var x_axis = SpiderGL.Math.Vec3.cross([0, 1, 0], z_axis);
		state._frame = [	-x_axis[0],		-x_axis[1],			-x_axis[2]		,0.0,
											0.0,		1.0,			0.0		,0.0,
											-z_axis[0],	-z_axis[1],			-z_axis[2]		,0.0,
											state._position[0],	state._position[1],	state._position[2]	,1.0];

	},

	_rewindState : function (dt, timeStep) {
		var ts = 0.0;
		while (dt > 0.0) {
			ts = (timeStep < dt) ? (timeStep) : (dt);
			dt -= timeStep;
			this._updateState(this._dynamics._remote, -ts);
		}
	},

	_forwardState : function (dt, timeStep) {
		var ts = 0.0;
		while (dt > 0.0) {
			ts = (timeStep < dt) ? (timeStep) : (dt);
			dt -= timeStep;
			this._updateState(this._dynamics._remote, ts);
		}
	},

	_applySmoothing : function () {
		this._dynamics._display._lerp(this._dynamics._local, this._dynamics._remote, this._currentSmoothing);
	},

	_parseLogInMessage : function (msg) {
		this._reset();

		this._id = msg.p;

		this._statics._parseMessage(msg.s);

		var dynState = new PCENG.PhysicsDynamicState();
		dynState._parseMessage(msg.d);

		this._dynamics._remote = dynState;
		this._dynamics._local._copyFrom(this._dynamics._remote);
		this._dynamics._display._copyFrom(this._dynamics._remote);

		this._input._parseMessage(msg.i);

		return true;
	},

	_parseStateMessage : function (msg, dt, timeStep) {
		this._dynamics._local._copyFrom(this._dynamics._display);
		this._currentSmoothing = 1.0;

		this._rewindState(dt, timeStep);

		this._dynamics._remote._parseMessage(msg.d);

		if (msg.i) {
			this._input._parseMessage(msg.i);
		}

		this._forwardState(dt, timeStep);
	},

  _updatePlausibleCollisions : function (pos) {
    if (!this._collisionMap || !this._geometry) return;

    var plausibleCollisions = 
      this._collisionMap._getPlausiblyCollidingObjects(
          pos, this._geometry);

    this._plausibleDotsCollision = plausibleCollisions.dots;
    this._plausibleWallsCollision = plausibleCollisions.walls;
  },

	_update : function (dt, smoothingDecay) {
		this._currentSmoothing -= smoothingDecay;
		if (this._currentSmoothing < 0.0) {
			this._currentSmoothing = 0.0;
		}

		this._updateState(this._dynamics._remote, dt);
		this._updateState(this._dynamics._local,  dt);

		this._applySmoothing();
	},

  _setCollisionMap : function (map) {
    this._collisionMap = map;
  },

  _collisionWithDots : function(position) {
    if (!this._plausibleDotsCollision) {
      return;
    }

    var myPos = position;
    var myRad = this._geometry._xLen;
    var dots = this._plausibleDotsCollision;

    var square = function(x) {return x * x;};
    for (var i = 0; i < dots.length; i++) {
      if (dots[i].eaten) continue;

      var dotPos = dots[i].position;
      var dist = 
        square(myPos[0] - dotPos[0]) + 
        square(myPos[1] - dotPos[1] + myRad) +
        square(myPos[2] - dotPos[2]);

      if (dist < square(myRad) + square(dots[i].size)) {
        this._plausibleDotsCollision[i].eaten = true;
        return;
      }
    }
  },

  // get the vector by which to multiply the speed in case of collision.
  _collisionWithWalls : function(position) {
    if (!this._plausibleWallsCollision) {
      return [false];
    }

    var myPos = position;
    var walls = this._plausibleWallsCollision;

    var square = function(x) {return x*x;}
    for (var i = 0; i < walls.length; i++) {
      var wall = walls[i];
      var wallMinCoords = wall.blh;
      var wallMaxCoords = wall.trf;

      var distance = square(this._geometry._zLen);
      var j = 0;
      var bounceVector = [1.0, 1.0, 1.0]
      var bounceFactor = 1.5;
      for (; distance > 0 && j < 3; j++) {
        if (myPos[j] < wallMinCoords[j]) {
          distance -= square(myPos[j] - wallMinCoords[j]);
          bounceVector[j] -= bounceFactor;
        } else if (myPos[j] > wallMaxCoords[j]) {
          distance -= square(myPos[j] - wallMaxCoords[j]);
          bounceVector[j] -= bounceFactor;
        }
      }

      if (distance > 0) {
        return [true, bounceVector];
      }
    }
    
    return [false];
  },

	get id()           { return this._id;                },
	get staticState()  { return this._statics;           },
	get dynamicState() { return this._dynamics._display; },
	get inputState()   { return this._input;             }
};

PCENG.GamePlayers = function () {
	this._me = new PCENG.Player(1);
  this._goats = [ ];
  this._reset();
};

PCENG.GamePlayers.prototype = {
	_reset : function () {
		this._me._reset();
		this._me._id = 1;
		this._all = { };
		this._all[this._me._id] = this._me;

    for (var i = 0; i < this._goats.length; i++) {
      this._all[this._goats[i]._id] = this._goats[i];
    }

		this._count = 1;
	},

  _addGoats : function (num_goats) {
    for (var j = 0; j < num_goats; j++) {
     this._goats.push(new PCENG.NPC(2+j));
    }
	  
    this._reset();
  },

	_login : function (msg) {
		this._reset();
		delete this._all[this._me._id];
		this._me._parseLogInMessage(msg);
		this._all[this._me._id] = this._me;
	},

	get count() {
		return this._count;
	},

	get all() {
		return this._all;
	},

	get me() {
		return this._me;
	},

  get goats() {
    return this._goats;
  },
};

PCENG.GameState = function () {
	this._players = new PCENG.GamePlayers();
};

PCENG.GameState.prototype = {
	_update : function (dt, smoothingDecay) {
		for (var p in this._players.all) {
			var player = this._players.all[p];
			player._update(dt, smoothingDecay);
		}
	},

	_updateFromMessage : function (msg, dt, updateMe, timeStep) {
		for (var p in msg.s.p) {
			var player = this._players.opponents[p];
			if (player) {
				player._parseStateMessage(msg.s.p[p], dt, timeStep);
			}
		}

		if (updateMe) {
			var me = this._players._me;
			var meMsg = msg.s.p[me._id];
			if (meMsg) {
				meMsg.i = null;
				me._parseStateMessage(meMsg, dt, timeStep);
			}
		}
	},

	get players() {
		return this._players;
	}
};

PCENG.Wall = function(obj) {
  this._parse(obj);
};

PCENG.Wall.prototype = {
  _reset : function() {
    this.blh = null;
    this.trf = null;
  },

  _parse : function(obj) {
    this._reset();

    obj = SpiderGL.Utility.getDefaultObject({
      blh : [ ],
      trf: [ ]
    }, obj);

    this.blh = obj.blh;
    this.trf = obj.trf;
  }
};

PCENG.Dots = function(obj) {
  this._parse(obj);
}

PCENG.Dots.prototype = {
  _reset: function() {
    this.position = null;
    this.size = null;
    this.eaten = false;
  },

  _parse: function(obj) {
    this._reset();

    obj = SpiderGL.Utility.getDefaultObject({
      position: [ ],
      size: 0.5
    }, obj);

    this.position = obj.position;
    this.size = obj.size;
    this.eaten = false;
  }
};

PCENG.GoatDimensions = function(obj) {
  this._parse(obj);
}

PCENG.GoatDimensions.prototype = {
  _reset: function() {
    this.hoofHeight   = null;
    this.legHeight    = null;
    this.torsoHeight  = null;
    this.torsoZwidth  = null;
    this.torsoXwidth  = null;
    this.neckLength   = null;
    this.neckAngle    = null;
    this.headSize     = null;
  },

  _parse: function(obj) {
    this._reset;

    obj = SpiderGL.Utility.getDefaultObject({
      hoofHeight:   0.5,
      legHeight:    3,
      torsoHeight:  4,
      torsoZwidth:  10,
      torsoXwidth:  5,
      neckLength:   3,
      neckAngle:    45,
      headSize:     3
    }, obj);

    this.hoofHeight   = obj.hoofHeight;
    this.legHeight    = obj.legHeight;
    this.torsoHeight  = obj.torsoHeight;
    this.torsoZwidth  = obj.torsoZwidth;
    this.torsoXwidth  = obj.torsoXwidth;
    this.neckLength   = obj.neckLength;
    this.neckAngle    = obj.neckAngle;
    this.headSize     = obj.headSize;
  }
};

// TODO:
//    As above. Or rather, replace this with my own
//    object representing the whole thing
PCENG.Race = function (obj) {
	this._parse(obj);
};

PCENG.Race.prototype = {
	_reset : function () {
		this._startPosition =  null;
    this._goatDimensions = null;
    this._goatsNumber =    null;
    this._pacmanSize =     null;
		this._bbox =           null;
    this._walls =          null;
    this._dots =           null;
	},
	
  _parseStartPosition:function (obj){
	  if(!obj) return;
		this._startPosition =  obj;
	},

  _parsePacmanSize : function (obj) {
    if(!obj) return;
    this._pacmanSize = obj;
  },

  _parseGoatsDimensions : function (obj) {
    if (!obj) return;
    this._goatDimensions = new PCENG.GoatDimensions(obj);
  },

  _parseGoatsNumber : function (obj) {
    if (!obj) return;
    this._goatsNumber = obj;
  },

	_parseBBox : function (obj) {
		if(!obj) return;
		this._bbox = [obj[0],obj[1],obj[2],obj[3],obj[4],obj[5]];
	},

  _parseWalls : function(obj) {
    if (!obj) return;
    this._walls = new Array(obj.length);
    for (var i=0; i < this._walls.length; i++) {
      this._walls[i] = new PCENG.Wall(obj[i]);
    }
  },

  _parseDots : function(obj) {
    if (!obj) return;
    this._dots = new Array(obj.length);
    for (var i=0; i < this._dots.length; i++) {
      this._dots[i] = new PCENG.Dots(obj[i]);
    }
  },

	_parse : function (obj) {
		this._reset();

		obj = SpiderGL.Utility.getDefaultObject({
			startPosition		:[ ],
      pacmanSize : 2,
      goatsNumber : 1,
      goatDimensions : { },
			bbox	    : {},
      walls: [ ],
      dots: [ ],
		}, obj);
		
		this._parseStartPosition  (obj.startPosition);
    this._parsePacmanSize(obj.pacmanSize);
    this._parseGoatsNumber(obj.goatsNumber);
    this._parseGoatsDimensions(obj.goatDimensions);
		this._parseBBox     (obj.bbox);
    this._parseWalls (obj.walls);
    this._parseDots (obj.dots);
	},

	get startPosition(){
		return this._startPosition;
	},

  get pacmanSize() {
    return this._pacmanSize;
  },

  get goatsNumber() {
    return this._goatsNumber;
  }, 

  get goatDimensions() {
    return this._goatDimensions;
  },

	get bbox(){
		return this._bbox;
	},

	get arealigths() {
		return this._arealigths;
	},

  get walls() {
    return this._walls;
  },

  get dots() {
    return this._dots;
  },

	get lamps() {
		return this._lamps;
	},
};

// Handles a lot of the network traffic and other stuff that 
// is just mundane.
PCENG.Game = function () {
	this._started   = false;
	this._loggedIn  = false;
	this._state     = new PCENG.GameState();
	this._socket    = null;
	this._listeners = [ ];

	this._latency   = new PCENG._RunningAverage();

	this._lastUpdateMessageTicks = -1;
	this._updateMessageInterval  = new PCENG._RunningAverage();

	this._pingRate     = 1.0;
	this._pingInterval = null;

	this._updateRate      = 60.0;
	this._lastUpdateTicks = -1;
	this._updateInterval  = null;

	this._timeSamples = [ ];
	this._minStdDev   = Number.MAX_VALUE;
	this._serverTicksDelta = 0;

	this._lastInputServerTicks = -1;

  // TODO:
  //    FFS, change the naming
	this._race = new PCENG.Race();
};

PCENG.Game.prototype = {
	_dispatch : function () {
		var funcName = arguments[0];
		var args = Array.prototype.slice.call(arguments, 1);
		for (var i=0,n=this._listeners.length; i<n; ++i) {
			var listener = this._listeners[i];
			var func = listener[funcName];
			if (func) {
				func.apply(listener, args);
			}
		}
	},

	_logIn : function () {
		if (this._loggedIn) return;
		var msg = PCENG._Message.create(PCENG._Message.CS.LOGIN, "{}");
		this._socket.send(msg);
	},

	_logOut : function () {
		if (!this._loggedIn) return;
		var msg = PCENG._Message.create(PCENG._Message.CS.LOGOUT, "{}");
		this._socket.send(msg);
	},

	_startNetworking : function () {
		this._stopNetworking();
		var that = this;
		var pingFunction = function () {
			that._ping();
		};
		this._pingInterval = setInterval(pingFunction, 1000.0 / this._pingRate);
	},

	_stopNetworking : function () {
		if (this._pingInterval) {
			clearInterval(this._pingInterval);
		}
		this._pingInterval = null;
		this._latency.reset();
		this._updateMessageInterval.reset();
	},

	_localLogIn : function () {
		var id           = 0;
		var dynamicState = new PCENG.PhysicsDynamicState();
		var staticState  = new PCENG.PhysicsStaticState();
		var inputState   = new PCENG.InputState();

		dynamicState._position = this._race.startPosition;

		var msg = {
			p : id,
			s : {
				m : staticState._mass,
				f : staticState._forwardForce,
				b : staticState._backwardForce,
				l : staticState._linearFriction,
				s : staticState._steerAcceleration
			},
			d : {
				p : dynamicState._position,
				l : dynamicState._linearVelocity,
				o : dynamicState._orientation,
				a : dynamicState._angularVelocity
			},
			i : {
				s : inputState._state
			}
		};

		this._state._players._login(msg);

		this._dispatch("onLogIn");

	},

	_onOpen : function () {
		this._dispatch("onConnectionOpen");
		this._logIn();
	},

	_onClose : function () {
		if (this._loggedIn) {
			var timeStamp = PCENG._ticks;

			var leaveMsg = { p : { } };
			this._onLeaveMessage(timeStamp, leaveMsg);

			var logOutMsg = { };
			this._onLogOutMessage(timeStamp, logOutMsg);
		}

		this._socket = null;

		this._dispatch("onConnectionClosed");
	},

	_onError : function (evt) {
		this._dispatch("onConnectionError", evt.data);
	},

	_onMessage : function (evt) {
		var msgStr = evt.data;

		var msg = JSON.parse(msgStr);
		if (!msg) return;

		var code      = msg.c;
		var timeStamp = msg.t;
		var message   = msg.m;

		if (code == PCENG._Message.SC.LOGIN) {
			if (!this._loggedIn) {
				this._onLogInMessage(timeStamp, message);
			}
			return;
		}

		if (!this._loggedIn) return;

		switch (code) {
			case PCENG._Message.SC.LOGOUT:
				this._onLogOutMessage(timeStamp, message);
			break;

			case PCENG._Message.SC.PING:
				this._onPingMessage(timeStamp, message);
			break;

			case PCENG._Message.SC.PONG:
				this._onPongMessage(timeStamp, message);
			break;

			case PCENG._Message.SC.JOIN:
				this._onJoinMessage(timeStamp, message);
			break;

			case PCENG._Message.SC.LEAVE:
				this._onLeaveMessage(timeStamp, message);
			break;

			case PCENG._Message.SC.STATE:
				this._onStateMessage(timeStamp, message);
			break;

			default:
				this._onUnknownMessage(timeStamp, message, code);
			break;
		}
	},

	_onLogInMessage : function (timeStamp, msg) {
		if (this._loggedIn) return;

		this._state._players._login(msg);

		this._loggedIn = true;
		this._startNetworking();
		this._dispatch("onLogIn");
	},

	_onLogOutMessage : function (timeStamp, msg) {
		if (!this._loggedIn) return;

		this._state._players._logout(msg);

		this._loggedIn = false;
		this._stopNetworking();
		this._dispatch("onLogOut");

		this._socket.close();
	},

	_onPingMessage : function (timeStamp, msg) {
		var msg = PCENG._Message.create(PCENG._Message.CS.PONG, "{\"r\":" + timeStamp + "}");
		this._socket.send(msg);
	},

	_onPongMessage : function (timeStamp, msg) {
		var now = PCENG._ticks;
		var dt  = now - msg.r;
		var latency = dt / 2.0;
		this._latency.addSample(latency);

		var serverSendTime = timeStamp + latency;
		var cs = {
			lat   : latency,
			delta : serverSendTime - now
		};
		this._timeSamples.push(cs);

		var maxSamples = 10;
		var toErase = this._timeSamples.length - maxSamples;
		if (toErase > 0) {
			this._timeSamples.splice(0, toErase);
		}

		var samples = this._timeSamples.slice();

		var stdDev = 0.0;
		var mean   = 0.0;
		var value  = 0.0;
		var n      = samples.length;
		for (var i=0; i<n; ++i) {
			value   = samples[i].lat;
			mean   += value;
			stdDev += value * value;
		}
		mean   /= n;
		stdDev /= n;
		stdDev = Math.sqrt(stdDev - (mean * mean));

		samples.sort(function (a, b) {
			return (a.lat - b.lat);
		});

		var idx = Math.floor((n - 1) / 2);
		var median = samples[idx].lat;

		var count = 0;
		var accum = 0.0;
		var valS  = 0.0;
		for (var i=0; i<n; ++i) {
			value = Math.abs(samples[i].lat - median);
			if (value <= stdDev) {
				accum += samples[i].delta;
				count++;
			}
		}

		this._serverTicksDelta = ((count > 0) ? (accum / count) : (0));
	},

	_onJoinMessage: function (timeStamp, msg) {
		var ids = this._state._players._addOpponents(msg);
		for (var i=0,n=ids.length; i<n; ++i) {
			this._dispatch("onPlayerJoin", ids[i])
		}
	},

	_onLeaveMessage: function (timeStamp, msg) {
		var ids = this._state._players._removeOpponents(msg);
		for (var i=0,n=ids.length; i<n; ++i) {
			this._dispatch("onPlayerLeave", ids[i])
		}
	},

	_onStateMessage: function (timeStamp, msg) {
		if (!this._loggedIn) return;

		var now = PCENG._ticks;
		if (this._lastUpdateMessageTicks >= 0) {
			var updateDelta = now - this._lastUpdateMessageTicks;
			this._updateMessageInterval.addSample(updateDelta);
		}
		this._lastUpdateMessageTicks = now;

		var dt = Math.max((this.serverTicks - timeStamp), 0.0) / 1000.0;
        dt = 0.1;
		//var updateMe = ((this._lastInputServerTicks - timeStamp) < (this._latency.value * 2.0));
		var updateMe = (timeStamp > this._lastInputServerTicks);
		this._state._updateFromMessage(msg, dt, updateMe, 1.0 / this._updateRate);
	},

	_onUnknownMessage: function (timeStamp, msg, code) {
	},

	_ping : function () {
		var msg = PCENG._Message.create(PCENG._Message.CS.PING, "{}");
		this._socket.send(msg);
	},

	_update : function () {
		var now = PCENG._ticks;
		var dt  = (now - this._lastUpdateTicks) / 1000.0;
		this._lastUpdateTicks = now;
		var updateInterval = this._updateMessageInterval.value / 1000.0;
		var smoothingDecay = 1.0;
		if (updateInterval > 0.0) {
			smoothingDecay = dt / updateInterval;
		}
		this._state._update(dt, smoothingDecay);
	},

	_listenerPos : function (listener) {
		for (var i=0,n=this._listeners.length; i<n; ++i) {
			if (listener == this._listeners[i]) {
				return i;
			}
		}
		return -1;
	},

	_updateInput : function (name, value) {
		var me = this._state._players._me;
		var st = this.serverTicks;
		this._lastInputServerTicks = st;
		me._input[name] = value;
		if (this.isConnected) {
			var inputMsg = me._createInputMessage(st);
			this._socket.send(inputMsg);
		}
	},

	start : function () {
		this.stop();
		var that = this;
		var updateFunction = function () {
			that._update();
		};
		this._lastUpdateTicks = PCENG._ticks;
		this._updateInterval  = setInterval(updateFunction, 1000.0 / this._updateRate);
		this._started = true;
		this._localLogIn();
		this._dispatch("onNewRace", this._race);
		return true;
	},

	stop : function () {
		if (!this.isStarted) return false;
		this.disconnect();
		if (this._updateInterval) {
			clearInterval(this._updateInterval);
		}
		this._lastUpdateTicks = -1;
		this._updateInterval  = null;
		this._started = false;
		return true;
	},

	get isStarted () {
		return this._started;
	},

	addListener : function (listener) {
		if (this._listenerPos(listener) >= 0) return false;
		this._listeners.push(listener);
		return true;
	},

	removeListener : function (listener) {
		var p = this._listenerPos(listener);
		if (p < 0) return false;
		this._listeners.splice(p, 1);
		return true;
	},

	connect : function (url) {
		if (!this.isStarted) return false;

		this.disconnect();

		var socket = new WebSocket(url);
		this._socket = socket;

		var that = this;

		socket.onopen    = function ()    { that._onOpen();       };
		socket.onclose   = function ()    { that._onClose();      };
		socket.onerror   = function (evt) { that._onError(evt);   };
		socket.onmessage = function (evt) { that._onMessage(evt); };

		return true;
	},

	disconnect : function (url) {
		if (!this._socket) return false;
		if (this._loggedIn) {
			this._logOut();
		}
		else {
			this._socket.close();
		}
		return true;
	},

	get isConnected() {
		if (this._socket) {
			return (this._socket.readyState == WebSocket.OPEN);
		}
		else {
			return false;
		}
	},

	get isLoggedIn() {
		return this._loggedIn;
	},

	get url() {
		if (this._socket) {
			return this._socket.url;
		}
		else {
			return null;
		}
	},

	get latency() {
		return this._latency.value;
	},

	get roundTripTime() {
		return (this._latency.value * 2);
	},

	get ticks() {
		return PCENG._ticks;
	},

	get serverTicksDelta() {
		return this._serverTicksDelta;
	},

	get serverTicks() {
		var now = PCENG._ticks;
		var st  = Math.floor(now + this._serverTicksDelta);
		return st;
	},

	get serverTime() {
		var d = new Date(this.serverTicks);
		return d;
	},

	get updateRate() {
		return this._updateRate;
	},

	set updateRate(x) {
		if (this._updateRate == x) return;

		this._updateRate = x;

		if (this._updateInterval) {
			clearInterval(this._updateInterval);
		}
		this._lastUpdateTicks = -1;
		this._updateInterval  = null;

		var that = this;
		var updateFunction = function () {
			that._update();
		};
		this._lastUpdateTicks = PCENG._ticks;
		this._updateInterval  = setInterval(updateFunction, 1000.0 / this._updateRate);
	},

	get state() { return this._state; },

	get playerID() { return this._state._players._me._id; },

	set playerAccelerate(x) { this._updateInput("_accelerate", x); },
	get playerAccelerate()  { return this._state._players._me._input._accelerate; },
	set playerBrake(x)      { this._updateInput("_brake", x); },
	get playerBrake()       { return this._state._players._me._input.brake; },
	set playerSteerLeft(x)  { this._updateInput("_steerLeft", x); },
	get playerSteerLeft()   { return this._state._players._me._input._steerLeft; },
	set playerSteerRight(x) { this._updateInput("_steerRight", x); },
	get playerSteerRight()  { return this._state._players._me._input._steerRight; },

	playerReset : function () {
		var me = this._state._players._me;
		me._reset();
		if (this.isLoggedIn) {
			var resetMsg = me._createResetMessage();
			this._socket.send(resetMsg);
		}
	},

	setRace : function (obj) {
		this._race = new PCENG.Race(obj);
	},

	get players() {
		return this._state._players.all;
	},

	get playersCount() {
		return this._state._players.count;
	},

	get me() {
		return this._state._players._me;
	},

	get player() {
		return this.me;
	},

	get race() {
		return this._race;
	}
};

PCENG.setupGame = function (options) {
	options = options || { };

	var opts = {
		handler : options.handler,
		canvas  : options.canvas,
		race    : options.race,
		url     : options.url,
		fps     : options.fps,
		ups     : options.ups,
		onload  : options.onLoad
	};

	function onLoad() {
		opts = SpiderGL.Utility.getDefaultObject({
			handler : null,
			canvas  : "pc-canvas",
			race    : PCENG.DefaultRace,
			url     : "ws://146.48.84.222:80",
			fps     : 60.0,
			ups     : 60.0,
			onLoad  : null
		}, opts);

		var handler = opts.handler;
		var canvas  = opts.canvas;
		var race    = opts.race;
		var url     = opts.url;
		var fps     = opts.fps;
		var ups     = opts.ups;
		var onload  = opts.onLoad;

		var game = new PCENG.Game();
		handler.game = game;

		game.setRace(race);
    var collisionMap = new PCENG.CollisionMap(
        {
          _walls: game.race.walls,
          _dots: game.race.dots
        },
        game.race.bbox);

    game._state._players._me._setCollisionMap(collisionMap);
    game._state._players._me._setGeometry({
      _type: "sphere",
      _size : 2
    });

    var waypointGraph = new PCENG.WaypointGraph(race.waypoints);
    var goatDimensions = game.race.goatDimensions;

    game._state._players._addGoats(game.race.goatsNumber);
    for (var i = 0; i < game._state._players._goats.length; i++) {
      game._state._players._goats[i]._setWaypointsGraph(waypointGraph);
      game._state._players._goats[i]._setCollisionMap(collisionMap);
      game._state._players._goats[i]._setPacmanHandle(
          game._state._players._me);
      game._state._players._goats[i]._setGeometry({
        _type: "cube",
        _blh: [
          -goatDimensions.torsoXwidth / 2.0,
          0,
          -goatDimensions.torsoZwidth / 2.0
        ], 
        _trf: [
          goatDimensions.torsoXwidth / 2.0,
          goatDimensions.hoofHeight + 
            goatDimensions.legHeight +
            goatDimensions.torsoHeight +
            goatDimensions.neckLength * Math.cos(sglDegToRad(goatDimensions.neckAngle)) +
            goatDimensions.headSize,
          goatDimensions.torsoZwidth / 2.0
        ]
      });
    }
		game.addListener(handler);

		SpiderGL.UserInterface.handleCanvas(canvas, handler, {animateRate: fps});

		(ups > 0) && (game.updateRate = ups);
		url && game.connect(url);

		game.start();

		onload && onload();
	};

	window.addEventListener("load", onLoad, false);

	return true;
};

PCENG.log = function (msg) {
	var textarea = document.getElementById("pceng-log");
	textarea.innerHTML += (msg + "\n");
	textarea.scrollTop = textarea.scrollHeight;;
};
