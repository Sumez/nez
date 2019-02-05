<!DOCTYPE html>
<html>
<head>
	<title></title>
	<meta charset="utf-8" />
	<script id="colorFragment" type="x-shader/x-fragment">
		uniform lowp vec4 uColor;
		void main(void) {
			gl_FragColor = uColor;
		}
	</script>
	<script type="text/javascript">
		window.isDebug = location.href.match(/debug=1$/i) ? true : false;
		function loadfile(event) {
				var file = event.files[0];
				if (!file) return;
				if (!file.name.match(/\.nes$/i)) {
					alert('invalid file');
					return;
				}
				var reader = new FileReader();
				reader.onload = function (e) {

					setTimeout(function() { 

						window.emu.volume($('[type=range]').val() / 100)
						if (!window.emu.loadRomData(e.target.result, file.name)) {
							return;
						}
						//$('.button.open').remove();
						window.emu.run($('canvas')[0], window.isDebug);
					});

				};
				reader.readAsArrayBuffer(file);
		}
		
		function fullscreen() {
	
			var canvas = $('canvas')[0];
			if (document.webkitIsFullScreen) return;
			if (!canvas.webkitRequestFullScreen) return;
			canvas.webkitRequestFullScreen();
		};
	</script>
	<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js"></script>
</head>
<body <?php if ($_GET['debug'] == '1') { ?>class="debug"<?php } ?>>
	<script type="text/javascript" src="emulatorscript.php"></script>
	<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.7.1/css/all.css" integrity="sha384-fnmOCqbTlWIlj8LyTjo7mOUStjsKC4pOpQbqyi7RrhN7udi9RwhKkMHpvLbHG9Sr" crossorigin="anonymous">
	<div class="emulator">
		<canvas class="nes" width="512" height="480"></canvas>
		<div class="controls">
			<div title="Open NES ROM file" class="button open">
				<input class="rom-file" type="file" onchange="loadfile(this)" />
				<img src="open.svg">
			</div>
			<div title="Toggle pause" class="button pause" onclick="togglePause()" style="margin-right: auto">
				<img class="pause-state" src="pause.svg">
			</div>
			<i class="fas fa-volume-off"></i>
			<input type="range" min="0" max="20" value="15" oninput="emu.volume(this.value / 100); localStorage.volume = this.value; this.focus()">
			<div title="Enable SNES mouse" class="button" onclick="emu.useMouse()">
				<img src="mouse.svg">
			</div>
			<div title="Configure controller buttons" class="button controller" onclick="emu.buttonConfig()">
				<img src="controller.svg">
			</div>
			<div title="Full screen" class="button" onclick="fullscreen()">
				<img src="fullscreen.svg">
			</div>
		</div>
	</div>
	
	<style type="text/css">
		.rom-file {
			-webkit-appearance: none;
			position: relative;
			margin-bottom: 10px;
			height: 38px;
			font-family: inherit;
			font-size: 13px;
			background: inherit;
			opacity: 0.1;
		}
		.rom-file:before {
			content: '';
			display: block;
			min-width: 100%;
			padding: 10px 5px;
			background: inherit;
			cursor: pointer;
			position: absolute;
			right: 0;
			left: 0;
		}
		.debug .nes {
			width: 256px;
			height: 240px;
		}
		.debug .nametable {
			display: inline-block !important;
		}
		canvas {
			display: block;
			margin: auto;
		}
		.controls {
			padding: 0 10px;
			display: flex;
			align-items: center;
			justify-content: flex-end;
		}
		.controls [type=button], .controls .button {
			border: none;
			background: black;
			color: inherit;
			text-transform: uppercase;
			font-weight: bold;
			font-size: 12px;
			line-height: 1em;
			padding: 3px;
			min-width: 1em;
			cursor: pointer;
			position: relative;
			height: 1.5em;
		}
		.controls .button img {
			width: 1em;
			height: 1em;
			margin: 3px;
		}
		.controls .button.controller img {
			width: 1.5em;
			height: 1.5em;
			margin: 0 3px;
		}
		.controls .button.open {
			width: 1em;
			height: 1em;
			overflow: hidden;
		}
		.controls .button.open img {
			position: absolute;
			top: 0;
			left: 0;
			pointer-events: none;
		}
		.controls [type=button]:hover, .controls .button:hover {
			background: #666;
		}
		.controls .fas {
		}
		.controls [type=button]:active, .controls .button:active {
			background: #ccc;
		}
		.controls [type=range] {
			-webkit-appearance: none;
			height: 0.3em;
			background: #999;
			width: 80px;
			vertical-align: baseline;
		}
		.controls [type=range]::-webkit-slider-thumb {
			-webkit-appearance: none;
			background: white;
			width: 0.5em;
			height: 1em;
		}
		.controls input {
			cursor: pointer;
			outline: none !important;
		}
		html {
			height: 100%;
		}
		body {
			font-family: Tahoma;
			font-size: 12px;
			background-color: #ccc;
			background-image: linear-gradient(#cde, #cde, #cde, #abd);
			background-attachment: fixed;
			text-align: center;
		}
		.emulator {
			background: black;
			border: 2px solid white;
			border-radius: 7px;
			box-shadow: 0 0 13px rgba(0,50,100,0.5);
			color: white;
			display: inline-block;
			overflow: hidden;
		}

		
		.fullscreen * {
			display: none !important;
		}
		.fullscreen .nes, .fullscreen .emulator {
			display: block !important;
		}
		.fullscreen {
			background: black;
			background-image: none;
		}
		.fullscreen .emulator {
			display: block !important;
			position: absolute !important;
			top: 0;
			left: 0;
			border: none;
			border-radius: 0;
			box-shadow: none;
		}
		
		.overlay {
			color: black;
			background: white;
			padding: 20px;
			width: 230px;
			margin: auto;
			position: fixed;
			top: 150px;
			left: calc(50vw - 135px);
			box-shadow: 0 0 4px rgba(0,0,0,0.5);
		}
	</style>
	<script type="text/javascript">
		if (localStorage.volume != undefined) $('[type=range]').val(Math.min(20, parseFloat(localStorage.volume)));
		
		window.onresize = function() {
			
			if (window.isDebug) return;
			
			var isFullscreen = ((screen.availHeight || screen.height-20) <= window.innerHeight);
			var canvas = $('.nes')[0];
			var emulator = $('.emulator')[0];
			var windowHeight = window.screen.height;
			var windowWidth = window.screen.width;

			if (!isFullscreen) {
				windowHeight = window.innerHeight - 50; // Add buffer for interface stuff
				windowWidth = window.innerWidth - 15;
				windowHeight = Math.max(240, windowHeight - (windowHeight % 240));
				windowWidth = Math.max(256, windowWidth - (windowWidth % 256));
			}
			
			var height = windowHeight;
			var width = (16 / 15) * height;
			
			if (width > windowWidth) {
				width = windowWidth;
				height = (15 / 16) * width
			}
			
			canvas.style.width = (canvas.width = width) + 'px';
			canvas.style.height = (canvas.height = height) + 'px';
			emulator.style.top = ((window.screen.height - height) / 2) + 'px';
			emulator.style.left = ((window.screen.width - width) / 2) + 'px';
			document.body.className = isFullscreen ? 'fullscreen' : '';
			
			if (emu && emu.isPlaying()) emu.render(); // Refresh canvas after resize
		};
		window.onresize();
		
		$('.nes').on('click', function() { if (!emu.isPlaying()) { $('[type=file]').click(); } });
		
		var paused = false;
		function togglePause() {
			if (!emu.isPlaying()) return;
			if (!paused) {
				emu.pause();
				$('.pause-state').prop('src', 'play.svg');
			}
			else {
				emu.resume();
				$('.pause-state').prop('src', 'pause.svg');
			}
			paused = !paused;
		}
	</script>
		<script id="vertex" type="x-shader/x-vertex">
		attribute vec2 aVertexPosition;
		attribute vec2 aTextureCoord;
		attribute float aPaletteIndex;

		uniform vec2 u_translation;
		uniform vec2 u_resolution;

		varying highp vec2 vTextureCoord;
		varying lowp float vColorIndex;

		void main(void) {
			vec2 cBase = u_resolution / vec2(2, 2);
			gl_Position = vec4(
				((aVertexPosition) + u_translation - cBase) / cBase
			, 0, 1.0) * vec4(1, -1, 1, 1);
			vTextureCoord = aTextureCoord;
			
			vColorIndex = aPaletteIndex;
		}
	</script>

	<script id="textureFragment" type="x-shader/x-fragment">
		varying highp vec2 vTextureCoord;

		varying lowp float vColorIndex;
		
		uniform lowp vec4 uColor[12];

		uniform sampler2D uSampler;
		uniform lowp vec4 uTint;
		uniform bool uApplyPalette;

		void main(void) {
			gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t)) * uTint;
			if (uApplyPalette) {
				if (gl_FragColor.r == 1.0) {
					if (vColorIndex == 0.0) gl_FragColor = uColor[0] / 255.0;
					if (vColorIndex == 1.0) gl_FragColor = uColor[3] / 255.0;
					if (vColorIndex == 2.0) gl_FragColor = uColor[6] / 255.0;
					if (vColorIndex == 3.0) gl_FragColor = uColor[9] / 255.0;
				}
				else if (gl_FragColor.g == 1.0) {
					if (vColorIndex == 0.0) gl_FragColor = uColor[1] / 255.0;
					if (vColorIndex == 1.0) gl_FragColor = uColor[4] / 255.0;
					if (vColorIndex == 2.0) gl_FragColor = uColor[7] / 255.0;
					if (vColorIndex == 3.0) gl_FragColor = uColor[10] / 255.0;
				}
				else if (gl_FragColor.b == 1.0) {
					if (vColorIndex == 0.0) gl_FragColor = uColor[2] / 255.0;
					if (vColorIndex == 1.0) gl_FragColor = uColor[5] / 255.0;
					if (vColorIndex == 2.0) gl_FragColor = uColor[8] / 255.0;
					if (vColorIndex == 3.0) gl_FragColor = uColor[11] / 255.0;
				}
			}
		}
	</script>
	
	<script id="crtShader" type="x-shader/x-fragment">
		varying highp vec2 vTextureCoord;

		varying lowp float vColorIndex;
		
		uniform lowp vec4 uColor[12];

		uniform sampler2D uSampler;
		uniform lowp vec4 uTint;
		uniform bool uApplyPalette;
		
		void main(void) {
		}
	</script>
</body>
</html>
