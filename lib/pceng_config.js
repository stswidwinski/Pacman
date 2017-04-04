var computeWalls  = function(bbox) {
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
  var diag_divider = function(z) {
    return z - diag_clearing;
  };

  var m = [-1, 1];
  var z_val_i = z_mid + z_len / n_paths;
  for (var i = 1; i < n_paths - 1; i++) {
    for (var z_m in [-1, 1]) {
      for (var x_m in [-1, 1]) {
        result.push({
          blh: [
            m[x_m] * hor_clearing, 
            0, 
            m[z_m] * z_val_i],
          trf: [
            m[x_m] * diag_divider(z_val_i), 
            wall_height, 
            m[z_m] * (z_val_i + wall_thickness)]
        });
        result.push({
          blh: [
            m[z_m] * z_val_i,
            0, 
            m[x_m] * hor_clearing], 
          trf: [
            m[z_m] * (z_val_i + wall_thickness),
            wall_height, 
            m[x_m] * diag_divider(z_val_i)]
        });
      }
    }
    z_val_i += z_len / (2.0 * n_paths);
  }

  return result;
}

PCENG.DefaultMap = {
  startPosition : [ 0, 0, 61.19 ],

  bbox : [ -100, 0, -100, 100, 10, 100 ],

  arealights: [ ],

  walls: computeWalls([-100, 0, -100, 100, 10,  100]),
  
  weather : {
    sunLightDirection : [ 0.4, 1, 0.6 ],
    cloudDensity      : 0,
    rainStrength      : 0
  },
};
