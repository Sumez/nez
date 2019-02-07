var masterVolumeValue = 0.15;
const enableAudioEmulation = true;
function SetMasterVolume(value) {
	masterVolumeValue = value;
	Unmute();
}
function Mute() {
	if (masterVolume) masterVolume.gain.setValueAtTime(0, audio.currentTime);	
}
function Unmute() {
	if (masterVolume) masterVolume.gain.setValueAtTime(masterVolumeValue, audio.currentTime);
}

var audio;
var masterVolume;

var pulse1 = {
	oscillator: null,
	haltLengthCounter: false,
	constantFlag: false,
	dutyCycle: 0,
	volume: 0
};

var pulse2 = {
	oscillator: null,
	haltLengthCounter: false,
	constantFlag: false,
	dutyCycle: 0,
	volume: 0
};
var triangle = {};
var noise = {};
var dmc = {};


var NewApu = (function() {

	var running = false;

	var pulseCycles = [[0,1,0,0,0,0,0,0],[0,1,1,0,0,0,0,0],[0,1,1,1,1,0,0,0],[1,0,0,1,1,1,1,1]];
	var triangleCycle = [15, 14, 13, 12, 11, 10,  9,  8,  7,  6,  5,  4,  3,  2,  1,  0, 0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15];
	var bufferSize = 512;

	var mixer;
	var wave, ctx;
	
	function initAudio() {
		if (audio || !enableAudioEmulation) return;
		
		audio = new AudioContext();
		var compressor = audio.createDynamicsCompressor();
		masterVolume = audio.createGain();
		masterVolume.gain.setValueAtTime(masterVolumeValue, audio.currentTime);
		mixer = audio.createScriptProcessor(bufferSize, 0, 1);

		masterVolume.connect(audio.destination);
		compressor.connect(masterVolume);
		//mixer.connect(masterVolume);
		//mixer.connect(audio.destination);
		mixer.connect(compressor);

		clockStep = 1789773 / 2 / audio.sampleRate; // NES clock frequency / 2 = APU sample rate
clockStep *= 0.97;
		//mixer.onaudioprocess = clockToOutput;
		mixer.onaudioprocess = resample;

		initChannel(pulse1);
		initChannel(pulse2);
		initChannel(triangle);
		
		noise.lengthCounter = 0;
		
		dmc.load = 0;
		dmc.loop = false;
		dmc.frequency = 0;
		dmc.timer = 0;
		dmc.address = 0;
		dmc.bytesRemaining = 0;
		dmc.currentByte = 0;
		dmc.shiftPointer = 0;
		dmc.length = 0;
		dmc.sample = 0;
		
		if (debug) {
			wave = new Float32Array(bufferSize);
			ctx = document.createElement('canvas').getContext('2d');
			ctx.canvas.width = 300;
			ctx.canvas.height = 50;
			ctx.canvas.style.width = "300px";
			output.canvas.parentNode.appendChild(ctx.canvas);
		}
	}

	var npulse1 = {
		cycle: 2,
		pointer: 0,
		timer: 0,
		sample: 0
	};
	var npulse2 = {
		cycle: 2,
		pointer: 0,
		timer: 0,
		sample: 0
	};
	var ntriangle = {
		pointer: 0,
		timer: 0,
		sample: 0
	};
	var nnoise = {
		shiftRegister: 1,
		timer: 0,
		sample: 0
	}
	
	var counting = 0;

	function updateWaveform() {
		var c = ctx;
		c.clearRect(0,0,300,50);
		c.strokeStyle = "#ffffff";
		c.beginPath()
		c.moveTo(0, (-wave[0] * 10) + 50);
		for (var i = 1; i < wave.length; i++) {
			c.lineTo((i / wave.length) * 300, (-wave[i] * 10) + 50);
		}
		c.stroke();
	}
	
	// More accurate, but doesn't match output rate due to emulation, so will course clicks and/or lag
	var buffer = new Float32Array(bufferSize * 10);
	var bufferPointer = 100;
	var readPointer = 0;
	var bufferLength = 0;
	var bufferStep;
	function resample(e) {
		if (!running) return;
		if (bufferLength < 400) {
			//console.log('buffer underrun');
			return; // extreme underflow, in case of performance issues or the tab went into the background, we just want to skip this update
		}
		var output = e.outputBuffer.getChannelData(0);
		var l = Math.min(bufferLength, output.length);
		for (var i = 0; i < l; i++) {
			//output[i] = Math.tanh(buffer[readPointer] / (15*3));
			output[i] = buffer[readPointer];
			readPointer++;
			if (readPointer == buffer.length) readPointer = 0;
		}
		l = output.length;
		for (var i = bufferLength; i < l; i++) {
			asyncTick(clockStep);
			//output[i] = Math.tanh(sample / (15*3)); // 15 = sequencer "full" volume
			output[i] = sample;
		}
		bufferLength = Math.max(0, bufferLength - output.length);

		if (debug) {
			for (var i = 0; i < output.length; i++) wave[i] = output[i];
			updateWaveform();
		}
	}
	
	// Inaccurate, and might cause precise timing issues, but prevents buffer underflow
	var sample = 0; // mixed sample from all 5 channels
	var clockStep = 1789773 / 2 / 48000; // NES clock frequency / 2 = APU sample rate
	function clockToOutput(e) {
		if (!running) return;

		var output = e.outputBuffer.getChannelData(0);
		var l = output.length;
		for (var i = 0; i < l; i++) {
			asyncTick(clockStep);
			output[i] = sample / (15); // 15 = sequencer "full" volume
		}
		if (debug) {
			for (var i = 0; i < output.length; i++) wave[i] = output[i];
			updateWaveform();
		}
	}
	
	// APU clock updates:
	function updatePulse(channel, ref) {
		if (!ref.frequency) return;
		channel.timer -= click;
		while (channel.timer < 0) {
			channel.timer += ref.frequency;
			channel.pointer = (channel.pointer + 1) & 7;
		}
		var duty = ref.dutyCycle;
		channel.sample = ref.lengthCounter && pulseCycles[duty][channel.pointer] ? (ref.constantFlag ? ref.volume : ref.decay) : 0;
		//channel.sample >>= 1;
	}
	function updateTriangle(channel, ref) {
		if (!ref.frequency) return;
		channel.timer -= click + click;
		while (channel.timer < 0) {
			channel.timer += ref.frequency;
			channel.pointer = (channel.pointer + 1) & 31;
		}
		channel.sample = ref.lengthCounter && ref.linearCounter ? triangleCycle[channel.pointer] : 0;
	}
	function updateNoise(channel, ref) {
		if (!ref.frequency) return;
		channel.timer -= click;
		while (channel.timer < 0) {
			channel.timer += ref.frequency;
			var feedback = (channel.shiftRegister & 1) ^ ((channel.shiftRegister >> ref.mode) & 1);
			channel.shiftRegister >>= 1;
			if (feedback) channel.shiftRegister |= 0b100000000000000;
			channel.high = channel.shiftRegister & 1;
		}
		channel.sample = (ref.lengthCounter && channel.high) ? (ref.constantFlag ? ref.volume : ref.decay) : 0;
	}
	function updateDmc(channel) {
		if (!channel.frequency) return;
		channel.timer -= click + click;
		// TODO: average multiple samples if this loops multiple times
		while (channel.timer < 0) {
			channel.timer += channel.frequency;
			
			if (channel.bytesRemaining) {

				if (channel.shiftPointer == 0) {
					// TODO: add 4 CPU cycles
					var address = channel.address + channel.length - channel.bytesRemaining;
					while (address > 0xFFFF) address -= 0x8000;
					channel.currentByte = cpuMemory[address];
				}
			
				var delta = (channel.currentByte >> channel.shiftPointer) & 1;
				if (delta) {
					if (channel.load < 126) channel.load += 2;
				}
				else {
					if (channel.load > 1) channel.load -= 2;
				}
				
				channel.shiftPointer++;
				if (channel.shiftPointer == 8) {
					channel.shiftPointer = 0;
					channel.bytesRemaining--;
					if (channel.bytesRemaining == 0 && channel.loop) channel.bytesRemaining = channel.length;
				}
			}
			channel.sample = channel.load;
			//channel.sample >>= 2;
		}
	}
	
	var click = 0; // The number of accumulated APU clock cycles (½CPU). Generate sample for output buffer ever 10 clicks	
	var step = 0; // Counts the frame counters steps (currently only LC/Sweep clocks count up)	
	function asyncTick(amount) {
		click = amount;
		
		apuFrames += click;
		if (apuFrames >= lcClock0 && step == 0) {
			apuClockLcSw(false);
			step = 1;
		}
		if (apuFrames >= lcClock1 && step == 1) {
			apuClockLcSw(true);
			step = 2;
		}
		if (apuFrames >= lcClock2 && step == 2) {
			apuClockLcSw(false);
			step = 3;
		}
		if (apuFrames >= lcClock3 && step == 3) {
			apuClockLcSw(true);
			if (enableFrameIrq) pendingFrameCount = true;
			apuFrames -= lcClock2+1;
			step = 0;
		}
		
		updatePulse(npulse1, pulse1);
		updatePulse(npulse2, pulse2);
		updateTriangle(ntriangle, triangle);
		updateNoise(nnoise, noise);
		updateDmc(dmc);
		
		var mixPulse = 95.88 / ((8128 / (npulse1.sample + npulse2.sample)) + 100);
		var mixTnd = 159.79 / (1 / ((ntriangle.sample / 8227) + (nnoise.sample / 12241) + (dmc.sample / 22638)) + 100);
		sample = mixPulse + mixTnd;
		//sample = (npulse1.sample + npulse2.sample);
	}
	function tick(amount) {
		running = true;
		if (bufferLength >= bufferSize * 4) return; // Avoid buffer overflow
		
		click += amount;
		if (click > clockStep) {
			
			asyncTick(click);
			
			buffer[bufferPointer] = sample;
			//buffer[bufferPointer] = ntriangle.sample;
			bufferPointer++;
			bufferLength++;
			if (bufferPointer == buffer.length) bufferPointer = 0;

			click -= clockStep;
		}
	}
		
	function initChannel(channel) {
		channel.volume = 0;
		channel.lengthCounter = 0;
		channel.sweepTimer = 0;
		channel.linearReload = false;
	}
	var lengthCounterValues = [10,254, 20,  2, 40,  4, 80,  6, 160,  8, 60, 10, 14, 12, 26, 14, 12, 16, 24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30];
	var noisePeriodValues = [4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068];
	var dmcTimerValues = [428, 380, 340, 320, 286, 254, 226, 214, 190, 160, 142, 128, 106,  84,  72,  54];

	var apuFrames = 0;
	var lcClock0 = 3728;
	var lcClock1 = 7456;
	var lcClock2 = 11185;
	var lcClock3 = 14914;
	var enableFrameIrq = false;
	var frameCounterMode = false;

	function apuClockLcSw(updateSweeps) {
		
		apuFrameLinearCounter();
		
		if (!updateSweeps) return;
		apuFrameSweepChannel(pulse1);
		apuFrameSweepChannel(pulse2);
		apuFrameSweepChannel(triangle);
		apuFrameSweepChannel(noise);
	}
	function apuFrameSweepChannel(channel) {
		if (channel.sweepEnabled) {
			if (channel.sweepTimer <= 0) {
				channel.sweepTimer += channel.sweepPeriod + 1;
				var amount = ((channel.frequency >> channel.sweepShift));
				if (channel.sweepNegate) amount = -amount-1;
				var target = (channel.frequency + amount) & 0xfff;
				if (target < 0x800 && channel.frequency > 7) channel.frequency = target;
			}
			
			channel.sweepTimer -= 1;
			
		}
		if (!channel.haltLengthCounter) channel.lengthCounter = Math.max(0, channel.lengthCounter - 1);
	}
	function apuFrameLinearCounter() {
		if (triangle.linearReload) {
			triangle.linearCounter = triangle.linearReloadValue;
		}
		else {
			triangle.linearCounter = Math.max(0, triangle.linearCounter - 1);
		}
		if (!triangle.haltLengthCounter) triangle.linearReload = false;
		
		clockDivider(pulse1);
		clockDivider(pulse2);
		clockDivider(noise);
	}
	function clockDivider(channel) {
		if (channel.startFlag) {
			channel.startFlag = false;
			channel.decay = 15;
			channel.divider = channel.volume;
		}
		else {
			if (channel.divider) {
				channel.divider--;
				return;
			}
			if (channel.decay) {
				channel.divider = channel.volume;
				channel.decay--;
				return;
			}
			if (channel.haltLengthCounter) channel.decay = 15; // HLC flag is the same as the Decay loop flag
		}
	}
	function dutyCycle(channel, value) {
		channel.haltLengthCounter = ((value & 0x20) != 0);
		channel.constantFlag = ((value & 0x10) != 0);
		channel.dutyCycle = ((value & 0xC0) >> 6);
		channel.volume = (value & 0x0F);
			
		//if (!channel.started) channel.oscillator.start();
		channel.started = true;
	}
	function triangleHalt(channel, value) {
		channel.haltLengthCounter = ((value & 0x80) != 0);
		channel.linearReloadValue = value & 0x7f;
	}
	function noisePeriod(value) {
		var period = value & 0x0F;
		noise.mode = (value & 0x80) ? 6 : 1;
		
		noise.frequency = noisePeriodValues[period];
		//noise.oscillator.playbackRate.setValueAtTime(1 / (1 << ((period)/6)), audio.currentTime);
	}
	function noiseLength(value) {
		noise.lengthCounter = lengthCounterValues[(value & 0xf8) >> 3];
		noise.startFlag = true;
	}
	function timer(channel, value) {
		channel.frequency &= 0xf00;
		channel.frequency |= value;
	}
	function length(channel, value) {
		channel.frequency &= 0x0ff;
		channel.frequency |= (value & 0x07) << 8;
		
		channel.lengthCounter = lengthCounterValues[(value & 0xf8) >> 3];
		channel.linearReload = true;
		channel.startFlag = true;
	}
	function sweep(channel, value) {
		channel.sweepEnabled = ((value & 0x80) != 0);
		channel.sweepPeriod = (value & 0x70) >> 4;
		channel.sweepTimer = channel.sweepPeriod + 1;
		channel.sweepNegate = ((value & 0x08) != 0);
		channel.sweepShift = (value & 0x07);
	}
	function frameCounter(value) {
		//enableFrameIrq = (value & 0x40) == 0;
		frameCounterMode = (value & 0x80) != 0;
		lcClock3 = frameCounterMode ? 18640 : 14914;
		if (frameCounterMode) resetStep();
	}
	function statusRead() {
		//enableFrameIrq = true;
		return
			(pulse1.lengthCounter == 0 ? 0 : 0x01)
			| (pulse2.lengthCounter == 0 ? 0 : 0x02)
			| (triangle.lengthCounter == 0 ? 0 : 0x04)
			| (noise.lengthCounter == 0 ? 0 : 0x08)
			| (dmc.bytesRemaining ? 0x10 : 0);
	}
	function statusWrite(value) {
		if ((value & 0x01) == 0) pulse1.lengthCounter = 0;
		if ((value & 0x02) == 0) pulse2.lengthCounter = 0;
		if ((value & 0x04) == 0) triangle.lengthCounter = 0;
		if ((value & 0x08) == 0) noise.lengthCounter = 0;

		if (value & 0x10) {
			if (dmc.bytesRemaining == 0) {
				dmc.bytesRemaining = dmc.length;
				dmc.shiftPointer = 0;
			}
		}
		else {
			dmc.bytesRemaining = 0;
		}
	}

	function dmcControl(value) {
		dmc.irq = (value & 0x80) != 0;
		dmc.loop = (value & 0x40) != 0;
		dmc.frequency = dmcTimerValues[value & 0xf];
	}
	function dmcLoad(value) {
		dmc.load = value & 0x7f;
	}
	function dmcAddress(value) {
		dmc.address = 0xC000 | (value << 6);
	}
	function dmcLength(value) {
		dmc.length = (value << 4) | 1;
	}
	function setApuRegisters() {
		if (enableAudioEmulation) {
			hwRegisters[0x4000] = new HwRegister(null, function(val) { dutyCycle(pulse1, val); });
			hwRegisters[0x4004] = new HwRegister(null, function(val) { dutyCycle(pulse2, val); });
			hwRegisters[0x400c] = new HwRegister(null, function(val) { dutyCycle(noise, val); });

			hwRegisters[0x4001] = new HwRegister(null, function(val) { sweep(pulse1, val); });
			hwRegisters[0x4005] = new HwRegister(null, function(val) { sweep(pulse2, val); });

			hwRegisters[0x4002] = new HwRegister(null, function(val) { timer(pulse1, val); });
			hwRegisters[0x4006] = new HwRegister(null, function(val) { timer(pulse2, val); });
			hwRegisters[0x400A] = new HwRegister(null, function(val) { timer(triangle, val); });
			hwRegisters[0x400E] = new HwRegister(null, noisePeriod);

			hwRegisters[0x4003] = new HwRegister(null, function(val) { length(pulse1, val); });
			hwRegisters[0x4007] = new HwRegister(null, function(val) { length(pulse2, val); });
			hwRegisters[0x400B] = new HwRegister(null, function(val) { length(triangle, val); });
			hwRegisters[0x400F] = new HwRegister(null, noiseLength);

			hwRegisters[0x4008] = new HwRegister(null, function(val) { triangleHalt(triangle, val); });

			hwRegisters[0x4010] = new HwRegister(null, dmcControl);
			hwRegisters[0x4011] = new HwRegister(null, dmcLoad);
			hwRegisters[0x4012] = new HwRegister(null, dmcAddress);
			hwRegisters[0x4013] = new HwRegister(null, dmcLength);
		}
		hwRegisters[0x4015] = new HwRegister(statusRead, statusWrite);
		hwRegisters[0x4017].write = frameCounter;
	}

	function resetStep() { step = 0; apuFrames = 0; }
		
	var apuInterface = {
		tick: 			tick, // function() { running = true; },
		init: 			initAudio,
		setRegisters: 	setApuRegisters
	};
	return apuInterface;
});
var apu = NewApu();