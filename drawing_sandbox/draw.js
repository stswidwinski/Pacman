// OpenGL rendering context
var gl = null;
var drawable;

function draw() {
  drawTheObject(gl, drawable);
}

function start() {
  var canvas = document.getElementById("canvas");
  gl = canvas.getContext("experimental-webgl");
  
  // CHANGE HERE FOR DIFFERENT DRAWABLE
  drawable = new Sphere(2);

  if (gl) {
    initialize(gl, drawable);
    setInterval(draw, 20);
  } else {
    alert("WebGL initialization failed.");
  }
}
