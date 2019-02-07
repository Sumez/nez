// TODO: Color emphasis, fix timing(?) issues (space soviets), MMC5, VRC6, performance optimization, FDS?, PAL support?

window.emu = (function() {
	
	var cart = {
		prg: null, chr: null
	}
	var oamMemoryBuffer = new ArrayBuffer(0x100);
	var oamMemory = new Uint8Array(oamMemoryBuffer);

	var cpuMemoryBuffer = new ArrayBuffer(0x10000);
	var cpuMemory = new Uint8Array(cpuMemoryBuffer);
	var stack = new Uint8Array(cpuMemoryBuffer, 0x100, 0x100);
	
	var ppuMemoryBuffer = new ArrayBuffer(0x4000);
	var ppuMemory = new Uint8Array(ppuMemoryBuffer);
	var nameTableSources = [
		new Uint8Array(ppuMemoryBuffer, 0x2000, 0x400),
		new Uint8Array(ppuMemoryBuffer, 0x2400, 0x400),
		new Uint8Array(ppuMemoryBuffer, 0x2800, 0x400),
		new Uint8Array(ppuMemoryBuffer, 0x2C00, 0x400)
	];
	var attrSources = [
		new Uint8Array(ppuMemoryBuffer, 0x23C0, 0x40),
		new Uint8Array(ppuMemoryBuffer, 0x27C0, 0x40),
		new Uint8Array(ppuMemoryBuffer, 0x2BC0, 0x40),
		new Uint8Array(ppuMemoryBuffer, 0x2FC0, 0x40)
	];
	var ppuPalettes = new Uint8Array(ppuMemoryBuffer, 0x3F00, 0x20);
		
	var cpuBuffer = new ArrayBuffer(10);
	var cpuRegisters = new Uint8Array(cpuBuffer, 0, 4);
	var pcByte = new Uint8Array(cpuBuffer, 4, 2);
	var pc = new Uint16Array(cpuBuffer, 4, 1);
	var flags = new Uint8Array(cpuBuffer, 6, 1); // don't use?
	
	var hwRegisters = {};

	var cycleCounts = new Float32Array(3);
	
	var c = false;
	var n = false;
	var z = false;
	var v = false;
	var interruptFlag = false;
	
	var loaded = false;
	var mappers = [];
	
	var mapRead = [];
	var mapWrite = [];
	var mapChrRead, mapChrWrite;

<?php

include 'ppu.js';
include 'audio.js';
include 'input.js';
include 'opcodes.js';
include 'mappers.js';

?>
		
	var prgData;
	var chrData;
	var chrRam = false;
	var saveRam = false;
	var gameId;
	function LoadNRom(data, prgChunks, chrChunks) {

		cpuMemory.fill(0);
		ppuMemory.fill(0);
	
		prgData = data.subarray(0, prgChunks * 0x4000);
		if (prgChunks >= 2) {
			cpuMemory.set(prgData.subarray(-0x8000), 0x8000);
		}
		if (prgChunks == 1) {
			cpuMemory.set(prgData, 0x8000);
			cpuMemory.set(prgData, 0xC000);
		}
		if (chrChunks) {
			chrRam = false;
			chrData = data.subarray(-0x2000 * chrChunks);
		}
		else {
			chrRam = true;
			chrData = ppuMemory.subarray(0 * 0x2000);
		}
		ppuMemory.set(chrData.subarray(0, 0x2000), 0);
		loaded = true;
	}
	
	var openBus = 0; // TODO!
	function readCpu(address) {
		if (!(address & 0xE000)) return cpuMemory[address & 0x07FF]; // Mirrors RAM
		// The rest is registers. If no register is available, use open bus behavior
		return openBus;
	}
	function writeCpu(address, value) {
		if (!(address & 0xE000)) cpuMemory[address & 0x07FF] = value;
	}
	function readCart(address) {
		return cpuMemory[address]; // Dummy function for NROM, etc.
		// TODO: openBus below 0x8000 unless mapper allows it
	}
	function writeCart(address, value) {
		cpuMemory[address] = value;
	}
	function vector(index) {
		return mapRead[1](0xfffa + (index * 2)) | (mapRead[1](0xfffa + 1 + (index * 2)) << 8);
	}
	function readChr(address) {
		return ppuMemory[address];
	}
	function writeChr(address, value) {
		if (chrRam) ppuMemory[address] = value;
	}
	
	
	
	function LoadRomData(data, filename) {
		
		if (loaded) {
			window.cancelAnimationFrame(timing);
		}
		
		//var newRom = new Uint8Array(rom.byteLength + (128 * 1024));
		//	newRom.set(new Uint8Array(rom), 0);
		var header = new Uint8Array(data, 0, 0x10);
		var romData = new Uint8Array(data, 0x10);
		
		var prgChunks = header[4];
		var chrChunks = header[5];
		singleScreen = false;
		vMirroring = (header[6] & 1) != 0;
		setMirroring();
		saveRam = (header[6] & 2) != 0;
		var mapperId = (header[6] & 0xf0) >> 4;
		mapperId |= header[7] & 0xf0;
		
		mapRead[0] = readCpu;
		mapRead[1] = readCart;
		mapWrite[0] = writeCpu;
		mapWrite[1] = writeCart;
		mapChrRead = readChr;
		mapChrWrite = writeChr;
		
		var hwRegisters = {};
		setPpuRegisters();
		apu.setRegisters();
		switch (mapperId) {
			case 0:
				LoadNRom(romData, prgChunks, chrChunks);
				break;
			default:
				LoadNRom(romData, prgChunks, chrChunks);
				var mapper = mappers[mapperId];
				if (!mapper) {
					alert('Unsupported mapper :(');
					return false;
				}
				mapper(mapperId);
		}
		gameId = filename;
		
		return true;
	}
	function setMirroring() {
		nametables = vMirroring
			? [nameTableSources[0], nameTableSources[1], nameTableSources[0], nameTableSources[1]]
			: [nameTableSources[0], nameTableSources[0], nameTableSources[1], nameTableSources[1]];
		attributetables = vMirroring
			? [attrSources[0], attrSources[1], attrSources[0], attrSources[1]]
			: [attrSources[0], attrSources[0], attrSources[1], attrSources[1]];
	}
	
	var context; // 256x240 backbuffer
	var output;
	var debug = false;
	var glNt;
	var glChr;
	function Run(canvas, debugmode) {
		output = canvas.getContext('2d');

		if (!loaded) return;

		context = GlEngine(256, 240);
		context.AddTextureData('output', outputBytes, 256, 256);
		
		debug = (debugmode == true);
		if (debug) {
			glNt = GlEngine(512, 480);
			glNt.AddTextureData('nt', ntBytes, 512, 512);
			canvas.parentNode.appendChild(glNt.Canvas());
			glNt.Canvas().className = 'nametable';

			glChr = GlEngine(128, 256);
			glChr.AddTextureData('chr', spriteBytes, 128, 256);
			canvas.parentNode.appendChild(glChr.Canvas());
			glChr.Canvas().className = 'chr';
		}

		if (saveRam) {
			window.onbeforeunload = storeSram;
			loadSram();
		}
		else {
			window.onbeforeunload = undefined;
		}
		configureKeys();
		cycleCounts.fill(0);
		ppuReset();
		apu.init();
		
		pc[0] = vector(RESET);

		currentCycleCount = 0;
		//setInterval(ppuAdvanceFrame, 1000 / 60);
		runPc();
	};
	
	function loadSram() {
		if (window.localStorage[gameId]) {
			var gameData = JSON.parse(window.localStorage[gameId]);
			if (gameData.sram) cpuMemory.set(decodeBytes(gameData.sram), 0x6000);
		}
	}
	function storeSram() {
		window.localStorage[gameId] = JSON.stringify({
			sram: encodeBytes(cpuMemory.subarray(0x6000, 0x8000))
		});
	}
	function encodeBytes(bytes) {
		var string = '';
		for (var i = 0; i < bytes.length; i++) {
			string += String.fromCharCode(bytes[i]);
		}
		return (string);
	}
	function decodeBytes(string) {
		var bytes = new Uint8Array(0x2000);
		for (var i = 0; i < string.length; i++) {
			bytes[i] = string.charCodeAt(i);
		}
		return bytes;
	}
	
	function Pause() {
		if (loaded) {
			Mute();
			window.cancelAnimationFrame(timing);
			timing = null;
		}
	}
	function Resume() {
		if (loaded) {
			Unmute();
			if (timing) window.cancelAnimationFrame(timing);
			timing = window.requestAnimationFrame(ppuAdvanceFrame);
		}
	}
	var trace = [];
	var breakpoints = [];
	var timing;
	var currentCycleCount;
	var pendingIrq = false;
	var pendingNmi = false;
	var frameEnded = false;
	function runPc() {
		timing = window.requestAnimationFrame(ppuAdvanceFrame);
		frameEnded = false;
		
		pcLoop:
		while (true) {

			 // TODO: only debug
			//var debug = cpuRegisters;
			//var debug2 = ppuMemory;
			//var debug3 = stack;
			//var debug4 = scanline;
			//var debug5 = pixelOnScanline;
			//var debug6 = currentY;
			//trace.push(pc[0].toString(16).toUpperCase());
			//if (trace.length > 1000) trace = trace.slice(-200);
			
			//if (breakpoints.indexOf(pc[0]) >= 0) debugger;
			// debug end

			if (pendingNmi) {
				jumpToIrq(NMI);
				pendingNmi = false;
			}
			else if (pendingIrq && !interruptFlag) jumpToIrq(IRQ);
			
			//if (pc[0] == 0 || pc[0] == 0x85DF) debugger;
			var opcode = mapRead[pc[0] & 0xC000 ? 1 : 0](pc[0]);
			pc[0]++;
			var runOpcode = opcodes[opcode];
			
			if (!runOpcode) {
				if (timing) window.cancelAnimationFrame(timing);
				alert('Unidentified opcode: $' + opcode.toString(16).toUpperCase() + '\nAt $' + (pc[0]-1).toString(16).toUpperCase());
				console.log(trace);
				return;
			}
			
			if (opcodeCycles[opcode]) currentCycleCount += opcodeCycles[opcode];
			cycleCounts[0] += currentCycleCount;
			cycleCounts[1] += currentCycleCount;
			cycleCounts[2] += currentCycleCount;
			currentCycleCount = 0;
			while (cycleCounts[1] > 0) {
				cycleCounts[1]--;
				ppuPixel();
				ppuPixel();
				ppuPixel();
			}
			while (cycleCounts[0] > 1) {
				cycleCounts[0] -= 2
				apu.tick(1);
			}
			
			runOpcode();
			
			//if (opcodeCycles[opcode]) currentCycleCount += opcodeCycles[opcode];
			cycleCounts[0] += currentCycleCount;
			cycleCounts[1] += currentCycleCount;
			cycleCounts[2] += currentCycleCount;
			currentCycleCount = 0;
			
			// Full scanline mode
//			if (cycleCounts[1] > 113.6666) {
//				cycleCounts[1] -= 113.6666;
//				ppuScanline();
//			}
			if (cycleCountEnabled && cycleCounter[0] > 0) {
				var newCount = cycleCounter[0] - cycleCounts[2];
				if (newCount <= 0) {
					newCount == 0;
					if (cycleIrqEnabled) pendingIrq = true;
				}
				cycleCounter[0] = newCount;
			}
			cycleCounts[2] = 0;
			/*
			while (cycleCounts[1] > 0) {
				cycleCounts[1]--;
				ppuPixel();
				ppuPixel();
				ppuPixel();
			}
			while (cycleCounts[0] > 1) {
				cycleCounts[0] -= 2
				apu.tick(1);
			}*/
			
//			if (cycleCounts[0] > 29781) { // Frame timing
//				cycleCounts[0] -= 29781;
//				//setTimeout(ppuAdvanceFrame, 1000 / 60);
//				break;
//			}
			if (frameEnded) break;
		}
	}
	
	function jumpToIrq(irqVector) {
		currentCycleCount += 7;
		push(pcByte[1]);
		push(pcByte[0]);
		push(getFlags())
		interruptFlag = true;
		pc[0] = vector(irqVector);
	}
	function returnFromIrq() {
		setFlags(pull());
		pcByte[0] = pull();
		pcByte[1] = pull();
		interruptFlag = false;
	}
	function getFlags(isBreak) {
		return 0x20 // Interrupt flag
		| (c ? 0x01 : 0)
		| (z ? 0x02 : 0)
		| (interruptFlag ? 0x04 : 0)
//		| (DECIMAL ? 0x08 : 0)
		| (isBreak ? 0x10 : 0)
		| (v ? 0x40 : 0)
		| (n ? 0x80 : 0);
	}
	function setFlags(value) {
		c = ((value & 0x01) != 0);
		z = ((value & 0x02) != 0);
		interruptFlag = ((value & 0x04) != 0);
		v = ((value & 0x40) != 0);
		n = ((value & 0x80) != 0);
	}
	
	function HwRegister(read, store) {
		this.read = read;
		this.store = store;
	}
	
	
	
	
	var nativeFps = -1;
	function detectFps(callback) {

		if (!window.requestAnimationFrame) {
			nativeFps = 0;
			if (callback) callback();
			return;
		}

		var testedFrames = 0;
		var startTime;
		var testSize = 60;

		function firstFrame(time) {
			startTime = time;
			window.requestAnimationFrame(runFrame);
		};
		function runFrame(time) {
			testedFrames++;
			if (testedFrames == testSize) {
				nativeFps = (1000 * testedFrames / (time - startTime));
				if (callback) callback();
				return;
			}
			window.requestAnimationFrame(runFrame);
		};
		window.requestAnimationFrame(function () { window.requestAnimationFrame(firstFrame); }); // Skip unreliable first frame
	};
	detectFps();

	
	
	
	
	
	
	
	var emulator = {
		
		loadRomData: LoadRomData,
		run: Run,
		pause: Pause,
		resume: Resume,
		volume: SetMasterVolume,
		useMouse: UseMouse,
		isPlaying: function () { return loaded; },
		buttonConfig: ButtonConfig,
		render: renderFrame
		
		
	};

	
	
	return emulator;
})();

