
var singleScreen = false;

// TODO: GTROM (111), VRC6 (24/26), MMC5 (5)

	// UxROM
	mappers[2] = function() {
		var unrom = new HwRegister(null, function(value) {
			var bankOffset = 0x4000 * value;
			cpuMemory.set(prgData.subarray(bankOffset, bankOffset + 0x4000), 0x8000);
		});
		for (var i = 0x8000; i < 0x10000; i++) {
			hwRegisters[i] = unrom;
		}
	};
	
	// MMC1
	mappers[1] = function() {
		var count = 0;
		var data = 0;
		var separateChr = false;
		var prgMode = 3;
		var prgIndex = 0;
		var chrIndex0 = 0;
		var chrIndex1 = 0;
		function reset() {
			count = 0;
			data = 0;
		}
		function mapperWrite(value) {
			if ((value & 0x80) != 0) {
				reset();
				return;
			}
			data >>= 1;
			data |= (value & 0x01) << 4;
			count++;
		}
		function setPrg() {
			if (prgMode <= 1) {
				var bigIndex = prgIndex & 0b1110;
				cpuMemory.set(prgData.subarray(bigIndex*0x8000, (bigIndex+1)*0x8000), 0x8000);
			}
			else if (prgMode == 2) {
				cpuMemory.set(prgData.subarray(prgIndex*0x4000, (prgIndex+1)*0x4000), 0xC000);
				cpuMemory.set(prgData.subarray(0, 0x4000), 0x8000);
			}
			else if (prgMode == 3) {
				cpuMemory.set(prgData.subarray(prgIndex*0x4000, (prgIndex+1)*0x4000), 0x8000);
				cpuMemory.set(prgData.subarray(-0x4000), 0xC000);
			}
		}
		function setChr() {
			if (separateChr) {
				ppuMemory.set(chrData.subarray(chrIndex0*0x1000, (chrIndex0+1)*0x1000), 0);
				ppuMemory.set(chrData.subarray(chrIndex1*0x1000, (chrIndex1+1)*0x1000), 0x1000);
			}
			else {
				var chrIndex = (chrIndex0 & 0b11110);
				ppuMemory.set(chrData.subarray(chrIndex0*0x1000, (chrIndex0+2)*0x1000), 0);
			}
		}
		var ctrl = new HwRegister(null, function(value) {
			mapperWrite(value);
			if (count != 5) return;
			var mirroring = data & 0x03;
			vMirroring = (mirroring == 2);
			setMirroring();
			singleScreen = false;
			
			//TODO: Breaks Zelda 2
			if (mirroring == 0) {
				singleScreen = true;
				nametables = [nameTableSources[1],nameTableSources[1],nameTableSources[1],nameTableSources[1]];
				attributetables = [attrSources[1],attrSources[1],attrSources[1],attrSources[1]];
			}
			if (mirroring == 1) {
				singleScreen = true;
				nametables = [nameTableSources[0],nameTableSources[0],nameTableSources[0],nameTableSources[0]];
				attributetables = [attrSources[0],attrSources[0],attrSources[0],attrSources[0]];
			}
			separateChr = ((data & 0x10) != 0);
			prgMode = (data & 0b01100) >> 2;
			setPrg();
			setChr();
			reset();
		});
		var chrb0 = new HwRegister(null, function(value) {
			mapperWrite(value);
			if (count != 5) return;

			chrIndex0 = data;
			setChr();
			reset();
		});
		var chrb1 = new HwRegister(null, function(value) {
			mapperWrite(value);
			if (count != 5) return;

			chrIndex1 = data;
			setChr();
			reset();
		});
		var prgb = new HwRegister(null, function(value) {
			mapperWrite(value);
			if (count != 5) return;
			
			prgIndex = data & 0b01111;
			setPrg();
			reset();
		});
		for (var i = 0x8000; i < 0xA000; i++) {
			hwRegisters[i] = ctrl;
		}
		for (var i = 0xA000; i < 0xC000; i++) {
			hwRegisters[i] = chrb0;
		}
		for (var i = 0xC000; i < 0xE000; i++) {
			hwRegisters[i] = chrb1;
		}
		for (var i = 0xE000; i < 0x10000; i++) {
			hwRegisters[i] = prgb;
		}
	};

	// MMC3 and MMC6
	mappers[68] = mappers[4] = function() {
		var selectedBank = 0;
		var invertChr = false;
		var invertPrg = false;
		var enablePrgRam = true;
		var bankAssignments = new Uint8Array(8);
		
		function setBanks() {
			var secondToLastBank = prgData.subarray(prgData.byteLength - 0x4000, prgData.byteLength - 0x2000);
			
			if (invertPrg) {
				cpuMemory.set(prgData.subarray(bankAssignments[6]*0x2000, (bankAssignments[6]+1)*0x2000), 0xC000);
				cpuMemory.set(secondToLastBank, 0x8000);
			}
			else {
				cpuMemory.set(prgData.subarray(bankAssignments[6]*0x2000, (bankAssignments[6]+1)*0x2000), 0x8000);
				cpuMemory.set(secondToLastBank, 0xC000);
			}
			cpuMemory.set(prgData.subarray(bankAssignments[7]*0x2000, (bankAssignments[7]+1)*0x2000), 0xA000);
			
			if (invertChr) {
				ppuMemory.set(chrData.subarray(bankAssignments[0]*0x400, (bankAssignments[0]+2)*0x400), 0x1000);
				ppuMemory.set(chrData.subarray(bankAssignments[1]*0x400, (bankAssignments[1]+2)*0x400), 0x1800);

				ppuMemory.set(chrData.subarray(bankAssignments[2]*0x400, (bankAssignments[2]+1)*0x400), 0x0000);
				ppuMemory.set(chrData.subarray(bankAssignments[3]*0x400, (bankAssignments[3]+1)*0x400), 0x0400);
				ppuMemory.set(chrData.subarray(bankAssignments[4]*0x400, (bankAssignments[4]+1)*0x400), 0x0800);
				ppuMemory.set(chrData.subarray(bankAssignments[5]*0x400, (bankAssignments[5]+1)*0x400), 0x0C00);
			}
			else {
				ppuMemory.set(chrData.subarray(bankAssignments[0]*0x400, (bankAssignments[0]+2)*0x400), 0x0000);
				ppuMemory.set(chrData.subarray(bankAssignments[1]*0x400, (bankAssignments[1]+2)*0x400), 0x0800);

				ppuMemory.set(chrData.subarray(bankAssignments[2]*0x400, (bankAssignments[2]+1)*0x400), 0x1000);
				ppuMemory.set(chrData.subarray(bankAssignments[3]*0x400, (bankAssignments[3]+1)*0x400), 0x1400);
				ppuMemory.set(chrData.subarray(bankAssignments[4]*0x400, (bankAssignments[4]+1)*0x400), 0x1800);
				ppuMemory.set(chrData.subarray(bankAssignments[5]*0x400, (bankAssignments[5]+1)*0x400), 0x1C00);
			}

		}	
		var mirroring = new HwRegister(null, function(value) {
			value &= 1;
			vMirroring = (value == 0);
			setMirroring();
		});
		var bankSelect = new HwRegister(null, function(value) {
			selectedBank = value & 0b0111;
			invertChr = (value & 0x80) != 0;
			invertPrg = (value & 0x40) != 0;
			enablePrgRam = (value & 0x20) != 0;
			
			setBanks();
		});
		var bankData = new HwRegister(null, function(value) {
			if (selectedBank >= 6) {
				value &= (prgData.byteLength / 0x2000 - 1);
			}
			else {
				value &= (chrData.byteLength / 0x400 - 1);
			}
			bankAssignments[selectedBank] = value;
			
			setBanks();
		});
		var ramProtect = new HwRegister(null, function(value) {
			if (!enablePrgRam) return;
			// TODO: RAM write protect
		});
		var irqLatch = new HwRegister(null, function(value) {
			irqCounter[1] = value;
		});
		var irqReload = new HwRegister(null, function() {
			irqCounter[0] = 0;
		});
		var irqDisable = new HwRegister(null, function() {
			scanlineIrqEnabled = false;
		});
		var irqEnable = new HwRegister(null, function() {
			scanlineIrqEnabled = true;
		});
		
		for (var i = 0x8000; i < 0xA000; i += 2) {
			hwRegisters[i] = bankSelect;
		}
		for (var i = 0x8001; i < 0xA000; i += 2) {
			hwRegisters[i] = bankData;
		}
		for (var i = 0xA000; i < 0xC000; i += 2) {
			hwRegisters[i] = mirroring;
		}
		for (var i = 0xA001; i < 0xC000; i += 2) {
			hwRegisters[i] = ramProtect;
		}
		for (var i = 0xC000; i < 0xE000; i += 2) {
			hwRegisters[i] = irqLatch;
		}
		for (var i = 0xC001; i < 0xE000; i += 2) {
			hwRegisters[i] = irqReload;
		}
		for (var i = 0xE000; i < 0x10000; i += 2) {
			hwRegisters[i] = irqDisable;
		}
		for (var i = 0xE001; i < 0x10000; i += 2) {
			hwRegisters[i] = irqEnable;
		}
	};
	var scanlineIrqEnabled = false;
	var irqCounter = new Uint8Array(2); // 0 = actual counter, 1 = latch
	
	
	// AxROM
	mappers[7] = function() {
		singleScreen = true;
		var bankSelect = new HwRegister(null, function(value) {
			var nts = (value & 0x10) >> 4;
			nametables = [nameTableSources[nts],nameTableSources[nts],nameTableSources[nts],nameTableSources[nts]];
			attributetables = [attrSources[nts],attrSources[nts],attrSources[nts],attrSources[nts]];

			var bankIndex = value & 7;
			cpuMemory.set(prgData.subarray(bankIndex*0x8000, (bankIndex+1)*0x8000), 0x8000);
		});
		for (var i = 0x8000; i < 0x10000; i++) {
			hwRegisters[i] = bankSelect;
		}
	};
	
	// CNROM
	mappers[3] = function() {
		var bankSelect = new HwRegister(null, function(value) {
			var bankIndex = value & 3;
			ppuMemory.set(chrData.subarray(bankIndex*0x2000, (bankIndex+1)*0x2000), 0);
		});
		for (var i = 0x8000; i < 0x10000; i++) {
			hwRegisters[i] = bankSelect;
		}		
	};
	
	// SunSoft 5/FME-7
	mappers[69] = function() {
		var commands = [];
		var currentCommand = 0;
		var hasPrgRam = false;
		
		function chrBank(bankIndex, bank) {
			bankIndex &= (chrData.byteLength / 0x400 - 1)
			ppuMemory.set(chrData.subarray(bankIndex*0x400, (bankIndex+1)*0x400), bank * 0x400);
		};
		var prgRamBackup = new Uint8Array(0x2000);
		function prgBank(value, bank) {
			var test = frame;
			var bankIndex = value & 0x3F & (prgData.byteLength / 0x2000 - 1);
			bank &= 3;
			var prgBank = prgData.subarray(bankIndex*0x2000, (bankIndex+1)*0x2000);
			if (bank == 0) {
				if (hasPrgRam) prgRamBackup.set(cpuMemory.subarray(0x6000, 0x8000));
				hasPrgRam = (value & 0x40) != 0;
				cpuMemory.set(hasPrgRam ? prgRamBackup : prgBank, 0x6000);
			}
			else {
				cpuMemory.set(prgBank, 0x6000 + (bank * 0x2000));
			}
		};
		function mirroring(value) {
			value &= 3;
			vMirroring = value == 0;
			setMirroring();
			singleScreen = false;
			if ((value & 2) != 0) {
				singleScreen = true;
				var nts = (value & 1);
				nametables = [nameTableSources[nts],nameTableSources[nts],nameTableSources[nts],nameTableSources[nts]];
				attributetables = [attrSources[nts],attrSources[nts],attrSources[nts],attrSources[nts]];
			}
		}
		function irqControl(value) {
			cycleIrqEnabled = (value & 0x01) != 0;
			cycleCountEnabled = (value & 0x80) != 0;
		}
		function irqLow(value) { cycleCounterBytes[0] = value; }
		function irqHigh(value) { cycleCounterBytes[1] = value; }
		
		commands[0] = commands[1] = commands[2] = commands[3] = commands[4] = commands[5] = commands[6] = commands[7] = chrBank;
		commands[8] = commands[9] = commands[10] = commands[11] = prgBank;
		commands[12] = mirroring;
		commands[13] = irqControl;
		commands[14] = irqLow;
		commands[15] = irqHigh;
		
		var cmd = new HwRegister(null, function(value) {
			currentCommand = value & 0x0F;
		});
		var param = new HwRegister(null, function(value) {
			if (commands[currentCommand]) commands[currentCommand](value, currentCommand);
		});
		
		for (var i = 0x8000; i < 0xA000; i++) {
			hwRegisters[i] = cmd;
		}
		for (var i = 0xA000; i < 0xC000; i++) {
			hwRegisters[i] = param;
		}
	};
	var cycleIrqEnabled = false;
	var cycleCountEnabled = false;
	var cycleCounterBuffer = new ArrayBuffer(2);
	var cycleCounterBytes = new Uint8Array(cycleCounterBuffer);
	var cycleCounter = new Uint16Array(cycleCounterBuffer);

	
	// GTROM
	mappers[111] = function() {
		var extraNametables = [
			new Uint8Array(0x400),
			new Uint8Array(0x400),
			new Uint8Array(0x400),
			new Uint8Array(0x400)
		];
		var chrRamBackup = [new Uint8Array(0x2000), new Uint8Array(0x2000)];
		var chrRamIndex = 0;
		var bankSelect = new HwRegister(null, function(value) {
			var prgIndex = value & 0x0F & (prgData.byteLength / 0x8000 - 1);
			cpuMemory.set(prgData.subarray(prgIndex*0x8000, (prgIndex+1)*0x8000), 0x8000);

			chrRamBackup[chrRamIndex].set(ppuMemory.subarray(0, 0x2000));
			chrRamIndex = (value >> 4) & 1;
			ppuMemory.set(chrRamBackup[chrRamIndex], 0);

			var nts = ((value >> 5) & 1) == 0 ? nameTableSources : extraNametables;
			nametables = [nts[0],nts[1],nts[2],nts[3]];
			attributetables = [nts[0].subarray(-0x40),nts[1].subarray(-0x40),nts[2].subarray(-0x40),nts[3].subarray(-0x40)];
		});
		
		for (var i = 0x5000; i < 0x6000; i++) {
			hwRegisters[i] = bankSelect;
		}
		for (var i = 0x7000; i < 0x8000; i++) {
			hwRegisters[i] = bankSelect;
		}
		bankSelect.store(0);
	};