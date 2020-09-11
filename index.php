<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8" />
	<title>NEZ - play NES while surfing the WWW :O</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
	<meta name="HandheldFriendly" content="true" />
	<meta property="og:title" content="NEZ - play NES while surfing the WWW :O" />
	<meta property="og:url" content="http://eternal.dk/emu/" />
	<meta property="og:image" content="nez.png" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="NEZ - play NES while surfing the WWW :O" />
	<meta name="twitter:description" content="A JavaScript based NES emulator" />
	<meta name="twitter:image" content="http://eternal.dk/emu/nez.png" />
	<meta name="twitter:creator" content="@sumez" />
	<script id="vertex" type="x-shader/x-vertex">
		attribute vec2 aVertexPosition;
		attribute vec2 aTextureCoord;

		uniform vec2 u_translation;
		uniform vec2 u_resolution;

		varying highp vec2 vTextureCoord;

		void main(void) {
			vec2 cBase = u_resolution / vec2(2, 2);
			gl_Position = vec4(
				((aVertexPosition) + u_translation - cBase) / cBase
			, 0, 1.0) * vec4(1, -1, 1, 1);
			vTextureCoord = aTextureCoord;
		}
	</script>
	<script id="textureFragment" type="x-shader/x-fragment">
		varying highp vec2 vTextureCoord;
		uniform sampler2D uSampler;
		void main(void) {
			gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));
		}
	</script>
	<script id="colorFragment" type="x-shader/x-fragment">
		uniform lowp vec4 uColor;
		void main(void) {
			gl_FragColor = uColor;
		}
	</script>
	<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js"></script>
	<script type="text/javascript" src="config.js"></script>
	<script type="text/javascript">
		window.isDebug = (location.href.match(/debug=1$/i) || window.EMULATOR_CONFIG.HTML.debug) ? true : false;
		function loadfile(event) {
			if (!event.files[0] || !event.files[0].name) return;
			window.emu.startFromFile(event.files[0]);
		}
		
		function fullscreen() {
	
			var canvas = $('canvas')[0];
			if (document.webkitIsFullScreen) return;
			if (!canvas.webkitRequestFullScreen) return;
			canvas.webkitRequestFullScreen();
		};

		$(window.document).on('ready', function() {
			if (window.EMULATOR_CONFIG.game) {
				if (window.EMULATOR_CONFIG.HTML.showClickToPlay) {
					window.emu.preloadUrl(window.EMULATOR_CONFIG.game);
				} else {
					window.emu.startFromUrl(window.EMULATOR_CONFIG.game);
				}
			} else if (!window.EMULATOR_CONFIG.HTML.showClickToPlay) {
				// Nothing to do here
				$('#clickMe').hide();
				$('.emulator').show();
			}

			if (window.EMULATOR_CONFIG.HTML.gameDescription) {
				$('#gameDescription').html(window.EMULATOR_CONFIG.HTML.gameDescription);
				$('#gameDescriptionTitle').show();
			}
			if (window.EMULATOR_CONFIG.HTML.gameTitle) {
				$('#gameTitle').text(window.EMULATOR_CONFIG.HTML.gameTitle);
			}
		});

	</script>
	<link rel="stylesheet" href="emulator.css">
</head>
<body <?php if ($_GET['debug'] == '1') { ?>class="debug"<?php } ?>>
	<script type="text/javascript" src="emulatorscript.php?3"></script>
	<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.7.1/css/all.css" integrity="sha384-fnmOCqbTlWIlj8LyTjo7mOUStjsKC4pOpQbqyi7RrhN7udi9RwhKkMHpvLbHG9Sr" crossorigin="anonymous">
	<img src="nez.png" style="display: none;" class="logo" />
	<div id="clickMe" class="noEmbed" style="display: block;" onclick="window.emu.startPreloadedGame()"><h1>Click here!</h1></div>
	<div class="emulator" style="display: none;">
		<canvas class="nes" width="512" height="480"></canvas>
		<div class="controls">
			<div title="Open NES ROM file" class="button open">
				<input class="rom-file" type="file" accept=".nes" onchange="loadfile(this)" />
				<img src="open.svg">
			</div>
			<div title="Toggle pause" class="button pause" onclick="togglePause()" style="margin-right: auto">
				<img class="pause-state" src="pause.svg">
			</div>
			<i class="fas fa-volume-off"></i>
			<input type="range" min="0" max="100" value="50" oninput="emu.volume(this.value / 100); config.volume = this.value; save(); this.focus()">
			<div title="Enable SNES mouse" class="button" onclick="emu.useMouse()">
				<img src="mouse.svg">
			</div>
			<div title="Configure controller buttons" class="button controller" onclick="emu.buttonConfig()">
				<img src="controller.svg">
			</div>
			<div title="Toggle TV shader (might be slow)" class="button shader" onclick="toggleShader()">
				<img src="tv.svg">
			</div>
			<div title="Full screen" class="button fullscreenButton" onclick="fullscreen()">
				<img src="fullscreen.svg">
			</div>
		</div>
	</div>
	<script type="text/javascript">
		var config = {};
		if (localStorage.config) {
			config = JSON.parse(localStorage.config);
			
			if (config.shaderEnabled) toggleShader(true);
			if (config.volume) $('[type=range]').val(Math.min(100, config.volume));
		}
		
		function save() {
			localStorage.config = JSON.stringify(config);
		}
		
		window.onresize = function() {
			
			if (window.isDebug) return;
			
			var isFullscreen = ((screen.availHeight || screen.height-20) <= window.innerHeight);
			var isPortrait = false;
			if (screen.width < screen.height) {
				// Probably mobile; gets its own treatment. Never fullscreen, because we need controls
				isFullscreen = false;
				isPortrait = true;
			}

			var canvas = $('.nes')[0];
			var clickMe = $('#clickMe')[0];
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
			clickMe.style.width = canvas.style.width;
			clickMe.style.height = canvas.style.height;
			emulator.style.top = ((window.screen.height - height) / 2) + 'px';
			emulator.style.left = ((window.screen.width - width) / 2) + 'px';
			document.body.className = isFullscreen ? 'fullscreen' : '';
			document.body.className += isPortrait ? ' portrait' : '';
			
			if (emu && emu.isPlaying()) emu.render(); // Refresh canvas after resize
			else drawLogo();
		};
		window.onresize();
		
		$('.nes').on('click', function() { if (!emu.isPlaying()) { $('[type=file]').click(); } });
		function drawLogo() {
			var ctx = $('.nes')[0].getContext('2d');
			ctx.imageSmoothingEnabled = ctx.webkitImageSmoothingEnabled = ctx.mozImageSmoothingEnabled = false;
			ctx.drawImage($('.logo')[0], 0, 0, 256, 240, 0, 0, ctx.canvas.width, ctx.canvas.height);
		}
		$('.logo').on('load', drawLogo);
		
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
		
		var shaderEnabled = false;
		function toggleShader(value) {
			if (value != undefined) config.shaderEnabled = value;
			else config.shaderEnabled = !config.shaderEnabled;
			if (config.shaderEnabled) {
				emu.enableShader('crt.glsl');
			}
			else {
				emu.disableShader();
			}
			$('.button.shader').toggleClass('enabled', config.shaderEnabled);
			save();
		}
	</script>
	<h2>
		<span onclick="$('.controllerDisp').toggle(); $(window).scrollTop(100000)">
			Touch Controls <i class="fas fa-chevron-circle-down"></i>
		</span>
	</h2>
	<div class="controllerDisp" style="display: none;">
		<div class="directions">
			<button class="up" onmousedown="emu.controller.upPressed()" ontouchstart="emu.controller.upPressed()" ontouchend="emu.controller.upReleased()" onmouseup="emu.controller.upReleased()">Up</button>
			<button class="left" onmousedown="emu.controller.leftPressed()" ontouchstart="emu.controller.leftPressed()" ontouchend="emu.controller.leftReleased()" onmouseup="emu.controller.leftReleased()">Left</button>
			<button class="right" onmousedown="emu.controller.rightPressed()" ontouchstart="emu.controller.rightPressed()" ontouchend="emu.controller.rightReleased()" onmouseup="emu.controller.rightReleased()">Right</button>
			<button class="down" onmousedown="emu.controller.downPressed()" ontouchstart="emu.controller.downPressed()" ontouchend="emu.controller.downReleased()" onmouseup="emu.controller.downReleased()">Down</button>
		</div>

		<div class="middle">
			<button class="select" onmousedown="emu.controller.selectPressed()" ontouchstart="emu.controller.selectPressed()" ontouchend="emu.controller.selectReleased()" onmouseup="emu.controller.selectReleased()">Select</button>
			<button class="start" onmousedown="emu.controller.startPressed()" ontouchstart="emu.controller.startPressed()" ontouchend="emu.controller.startReleased()" onmouseup="emu.controller.startReleased()">Start</button>
		</div>

		<div class="buttons">
			<button class="b" onmousedown="emu.controller.bPressed()" ontouchstart="emu.controller.bPressed()" ontouchend="emu.controller.bReleased()" onmouseup="emu.controller.bReleased()">B</button>
			<button class="a" onmousedown="emu.controller.aPressed()" ontouchstart="emu.controller.aPressed()" ontouchend="emu.controller.aReleased()" onmouseup="emu.controller.aReleased()">A</button>
		</div>
	</div>
	<h2 id="gameDescriptionTitle" style="display: none;">
		<span onclick="$('#gameDescription').toggle(); $(window).scrollTop(100000);">
			About <span id="gameTitle">This Game</span>
			<i class="fas fa-chevron-circle-down"></i>
		</span>
	</h2>
	<div id="gameDescription" style="display: none">
		This is a game...
	</div>
	<h2>
		<a href="https://twitter.com/cppchriscpp" target="_blank"><i class="fab fa-twitter-square"></i></a>
		<a href="https://github.com/cppchriscpp/nez" target="_blank"><i class="fab fa-github-square"></i></a>
		<span onclick="$('.text').toggle(); $(window).scrollTop(100000)">
			More about NEZ <i class="fas fa-chevron-circle-down"></i>
		</span>
	</h2>
	<div class="text" style="display: none;">
		Nez is an impressive web-based emulator <a href="https://github.com/sumez/nez" target="_blank">originally written by Sumez</a>. He has <a href="https://twitter.com/sumez" target="_blank">a Twitter</a> too!<br /> <br />

		He wrote the code that makes this whole thing tick, and deserves full credit!<br /><br />
		
		I forked this emulator to add a few new features, and to try to make it as friendly as possible for individual developers to create an emulator for their games. I added an easy way to auto-load games and an embed feature,
		so if you want to set this up for yourself, it shouldn't be hard! Check it out <a href="https://github.com/cppchriscpp/nez" target="_blank">on Github</a> for instructions on setting it up</a>.<br /><br />
		My Twitter is open for feedback as well! <a href="https://twitter.com/cppchriscpp" target="_blank">@cppchriscpp</a><br /><br />
		~ Chris<br />

		<br />
	</div>
</body>
</html>
