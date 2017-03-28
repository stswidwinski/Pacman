(function () {
	var handler        = ((typeof(PCENGClient) != "undefined") ? (PCENGClient) : ({ }));
	var drawCanvasID   = "pc-canvas";
	var serverURL      = "ws://146.48.84.222:80";
	var animationRate  = 60.0;
	var simulationRate = 60.0;
	var defaultRace    = PCENG.DefaultMap;

	PCENG.setupGame({
		handler : handler,
		canvas  : drawCanvasID,
		race    : defaultRace,
		url     : serverURL,
		fps     : animationRate,
		ups     : simulationRate,
		onLoad  : function () {
			setInterval(function () {
				var game = handler.game;
				if (!game) return;
				document.getElementById("pceng-fps"               ).innerHTML = "FPS : "                + Math.floor(handler.ui.framesPerSecond);
				document.getElementById("pceng-latency"           ).innerHTML = "Latency : "            + Math.floor(game.latency) + " ms.";
				document.getElementById("pceng-server-clock-delta").innerHTML = "Server Clock Delta : " + Math.floor(game.serverTicksDelta) + " ms.";
				document.getElementById("pceng-server-time"       ).innerHTML = "Server Time : "        + game.serverTime;
			}, 1000);
		}
	});
})();
