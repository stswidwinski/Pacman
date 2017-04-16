function ComputeMap (bbox) {
  var blh = bbox.slice(0, 3);
  var trf = bbox.slice(3, 6);

  var wall_thickness = 3;
  var wall_height = 6;
  var diag_clearing = 4;
  var hor_clearing = 3;
  var n_paths = 8;

  // the xz plane parts 
  var x_range = [blh[0], trf[0]];
  var z_range = [blh[2], trf[2]];
  var x_mid = (x_range[1] + x_range[0]) / 2;
  var z_mid = (z_range[1] + z_range[0]) / 2;
  var x_len = x_range[1] - x_range[0] - 2 * wall_thickness;
  var z_len = z_range[1] - z_range[0] - 2 * wall_thickness;

  var diag_divider = function(z) {
    return z - diag_clearing;
  };

  this.computeWalls = function() {
    var result = [];
    // begin by adding the boundaries of the map.
    result.push({
      blh: [x_range[0],                  0,           z_range[0]],
      trf: [x_range[0] + wall_thickness, wall_height, z_range[1]]
    });
    result.push({
      blh: [x_range[0],                  0,           z_range[1] - wall_thickness],
      trf: [x_range[1],                  wall_height, z_range[1]]
    }); 
    result.push({
      blh: [x_range[1] - wall_thickness, 0,           z_range[0]],
      trf: [x_range[1],                  wall_height, z_range[1]]
    }); 
    result.push({
      blh: [x_range[0],                  0,           z_range[0]],
      trf: [x_range[1],                  wall_height, z_range[0] + wall_thickness]
    });

    // add the "box" in the middle.
    result.push({
      blh: [
        x_mid - x_len / (2.0 * n_paths),
        0,
        z_mid - z_len / (2.0 * n_paths)],
      trf: [
        x_mid - x_len / (2.0 * n_paths) + wall_thickness,
        wall_height,
        z_mid + z_len / (2.0 * n_paths)]
    });
    result.push({
      blh: [
        x_mid - x_len / (2.0 * n_paths),
        0,
        z_mid + z_len / (2.0 * n_paths) - wall_thickness],
      trf: [
        x_mid + x_len / (2.0 * n_paths),
        wall_height,
        z_mid + z_len / (2.0 * n_paths)]
    });
    result.push({
      blh: [
        x_mid + x_len / (2.0 * n_paths) - wall_thickness,
        0,
        z_mid + z_len / (6.0 * n_paths)],
      trf: [
        x_mid + x_len / (2.0 * n_paths),
        wall_height,
        z_mid + z_len / (2.0 * n_paths)]
    });
    result.push({
      blh: [
        x_mid + x_len / (2.0 * n_paths) - wall_thickness,
        0,
        z_mid - z_len / (2.0 * n_paths)],
      trf: [
        x_mid + x_len / (2.0 * n_paths),
        wall_height,
        z_mid - z_len / (6.0 * n_paths)]
    });
    result.push({
      blh: [
        x_mid - x_len / (2.0 * n_paths),
        0,
        z_mid - z_len / (2.0 * n_paths)],
      trf: [
        x_mid + x_len / (2.0 * n_paths),
        wall_height,
        z_mid - z_len / (2.0 * n_paths) + wall_thickness]
    });

    // add all the vertical lines for the x > 0 and z > 0 coordinates
    // within the region of x < z and then convert that to the global 
    // map by symmetry
    var pushOrdered = function(xs, ys, zs) {
      var sortOrder = function(a,b) { return a - b; }
      xs = xs.sort(sortOrder);
      ys = ys.sort(sortOrder);
      zs = zs.sort(sortOrder);

      result.push({
            blh: [ xs[0], ys[0], zs[0] ],
            trf: [ xs[1], ys[1], zs[1] ]
          });
      result.push({
            blh: [ zs[0], ys[0], xs[0] ],
            trf: [ zs[1], ys[1], xs[1] ]
          });
    };

    var m = [-1, 1];
    var z_val_i = z_mid + z_len / n_paths;
    for (var i = 1; i < n_paths - 1; i++) {
      for (var z_m in [-1, 1]) {
        for (var x_m in [-1, 1]) {
          pushOrdered(
            [m[x_m] * hor_clearing, m[x_m] * diag_divider(z_val_i)],
            [0, wall_height],
            [m[z_m] * z_val_i, m[z_m] * (z_val_i + wall_thickness)]    
          );
        }
      }
      z_val_i += z_len / (2.0 * n_paths);
    }

    return result;
  }; 

  this.computeDots = function() {
    var res = [];
    var distance_between_dots = z_len / 2.0 - diag_clearing - diag_clearing;
    distance_between_dots /= 5;
    
    // add the ones between walls
    var z_val_i = z_mid + 3 * z_len / (4 * n_paths) + wall_thickness / 2;
    var m = [-1, 1];
    for (var i = 1; i < n_paths; i++) {
      var distance_between_dots = 0;
      var dots_on_level = 5;
      while (distance_between_dots < 7.0) {
        distance_between_dots = z_val_i / dots_on_level;
        dots_on_level -= 1; 
      }
      for (var x_val_j = distance_between_dots; 
          x_val_j < diag_divider(z_val_i);
          x_val_j += distance_between_dots) { 
        for (var z_m in [-1, 1]) {
          for (var x_m in [-1, 1]) {
            res.push({
              size: 1.0,
              position: [m[x_m] * x_val_j, 1.0, m[z_m] * z_val_i] 
            }); 
            res.push({
              size: 1.0,
              position: [m[z_m] * z_val_i, 1.0, m[x_m] * x_val_j] 
            }); 
          }
        }
      }
      z_val_i += z_len / (2.0 * n_paths);
    }  

    // add the ones on diagonal
    z_val_i = z_mid + 3.0 / (4.0 * n_paths) * z_len + wall_thickness / 2;
    for (var i = 1; i < n_paths; i++) {
      var coord = z_val_i;;
      for (var z_m in [-1, 1]) {
        for (var x_m in [-1, 1]) {
          res.push({
            size: 1.0,
            position: [coord * m[x_m], 1.0, coord*m[z_m]] 
          });
        }
      }
      z_val_i += z_len / (2.0 * n_paths);
    }
    
    // add the ones on verticals and horizontals
    z_val_i = z_mid + 3.0 / (4.0 * n_paths) * z_len + wall_thickness / 2
    for (var i = 1; i < n_paths; i++) {
      var coord = z_val_i;
      for (var z_m in [-1, 1]) {
        res.push({
          size: 1.0,
          position: [0.0 , 1.0, coord*m[z_m]] 
        });
        res.push({
          size: 1.0,
          position: [coord * m[z_m] , 1.0, 0.0] 
        });
      }
      z_val_i += z_len / (2.0 * n_paths);
    }
    return res;
  };

  this.computeWaypoints = function() {
    var getDiagWaypoints = function(mx, mz) {
      var z_val_i = z_mid + 3.0 / (4.0 * n_paths) * z_len + wall_thickness / 2;
      var diagList = [];
      
      for (var i = 1; i < n_paths; i++) {
        var coord = z_val_i;
        diagList.push({
          position: [coord * mx, 1.0, coord * mz],
          neigh: [ ]
        });
        z_val_i += z_len / (2.0 * n_paths);
      }

      return diagList;
    };

    var getVertWaypoints = function(mx) {
      var z_val_i = z_mid + 3.0 / (4.0 * n_paths) * z_len + wall_thickness / 2;
      var vertList = [];

      for (var i = 1; i < n_paths; i++) {
        var coord = z_val_i;
        vertList.push({
          position: [mx * coord, 1.0, 0],
          neigh: [ ]
        });

        z_val_i += z_len / (2.0 * n_paths);
      } 

      return vertList;
    };

    var getHorWaypoints = function(mz) {
      var z_val_i = z_mid + 3.0 / (4.0 * n_paths) * z_len + wall_thickness / 2;
      var horList = [];

      for (var i = 1; i < n_paths; i++) {
        var coord = z_val_i;
        horList.push({
          position: [0.0, 1.0, mz * coord],
          neigh: [ ]
        });

        z_val_i += z_len / (2.0 * n_paths);
      } 

      return horList;
    };

    var waypointsLists = []
    waypointsLists.push(getVertWaypoints(1));
    waypointsLists.push(getDiagWaypoints(1, -1));
    waypointsLists.push(getHorWaypoints(-1));
    waypointsLists.push(getDiagWaypoints(-1, -1));
    waypointsLists.push(getVertWaypoints(-1));
    waypointsLists.push(getDiagWaypoints(-1, 1));
    waypointsLists.push(getHorWaypoints(1));
    waypointsLists.push(getDiagWaypoints(1, 1));

    // connect within lists
    for (var i = 0; i < waypointsLists.length; i++) {
      var list = waypointsLists[i];
      for (var j = 0; j < list.length; j++) {
        if (j != 0) 
          list[j].neigh.push(list[j-1]);
        if (j != list.length - 1)
          list[j].neigh.push(list[j+1]);
      }
    }

    // connect intra lists
    var len = waypointsLists.length;
    for (var i = 0; i < waypointsLists.length; i++) {
      var nextListIndex = (i + 1) % len;
      var lastListIndex = (i + len - 1) % len;
      var lastList = waypointsLists[lastListIndex];
      var nextList = waypointsLists[nextListIndex];
      var list = waypointsLists[i];

      for (var j = 0; j < list.length; j++) {
        list[j].neigh.push(lastList[j]);
        list[j].neigh.push(nextList[j]);
      }
    }

    // coalesce into a single list.
    var result = [];
    for (var i = 0; i < len; i++) {
      var list = waypointsLists[i];
      for (var j = 0; j < list.length; j++) {
        result.push(list[j]);
      }
    }

    return result;
 };
} 

var bbox = [ -100, 0, -100, 100, 10, 100 ];
var mapCreator = new ComputeMap(bbox);

PCENG.DefaultMap = {
  startPosition : [ 0, 0, 61.19 ],
  pacmanSize : 2,
  goatsNumber : 7,
  goatDimensions: {
    hoofHeight:   0.5,
    legHeight:    3,
    torsoHeight:  4,
    torsoZwidth:  6,
    torsoXwidth:  5,
    neckLength:   3,
    neckAngle:    45,
    headSize:     3
  },

  bbox : bbox,

  walls: mapCreator.computeWalls(),

  dots: mapCreator.computeDots(),

  waypoints: mapCreator.computeWaypoints(),
  
  weather : {
    sunLightDirection : [ 0.4, 1, 0.6 ],
    cloudDensity      : 0,
    rainStrength      : 0
  },
};
