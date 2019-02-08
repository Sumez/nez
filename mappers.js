
var singleScreen = false;
var prgBanks, chrBanks;
var prgRam = new Uint8Array(0x2000);

// TODO: GTROM (111), VRC6 (24/26), MMC5 (5)


// Default helper functions for most mapper types
function initPrgBanks(size) {
	
	prgBanks = new Uint8Array(0x8000 / size);
	var shiftAmount = Math.log(size)/Math.log(2);
	var bankMask = size-1;
	mapRead[1] = function(address) {
		if (!(address & 0x8000)) return prgRam[address - 0x6000];
		
		var romAddress = address & 0x7FFF;
		return prgData[(prgBanks[romAddress >> shiftAmount] << shiftAmount) | (romAddress & bankMask)];
	};
	mapWrite[1] = function (address, value) {
		if (!(address & 0x8000)) prgRam[address - 0x6000] = value;
		// No writing to cartridge space by default
	};
}

// Warning: Using this method cause a fairly large performance overhead
function initChrBanks(size, isRam, banks) {

	chrBanks = new Uint8Array(0x2000 / size);
	if (isRam) chrData = new Uint8Array(size * banks);

	var shiftAmount = Math.log(size)/Math.log(2);
	var bankMask = size-1;
	mapChrRead = function(address) {
		return chrData[(chrBanks[address >> shiftAmount] << shiftAmount) | (address & bankMask)];
	};
	mapChrWrite = function() {};
	if (isRam) mapChrWrite = function (address, value) {
		chrData[(chrBanks[address >> shiftAmount] << shiftAmount) | (address & bankMask)] = value;
	};
	getChrColor = function(tileOffset, tileX, isBg) {
		switch (tileX) {
				case 0:
					return ((mapChrRead(tileOffset, isBg) >> 7) & 0x01) | ((mapChrRead(tileOffset+8, isBg) >> 6) & 0x02);
				case 1:
					return ((mapChrRead(tileOffset, isBg) >> 6) & 0x01) | ((mapChrRead(tileOffset+8, isBg) >> 5) & 0x02);
				case 2:
					return ((mapChrRead(tileOffset, isBg) >> 5) & 0x01) | ((mapChrRead(tileOffset+8, isBg) >> 4) & 0x02);
				case 3:
					return ((mapChrRead(tileOffset, isBg) >> 4) & 0x01) | ((mapChrRead(tileOffset+8, isBg) >> 3) & 0x02);
				case 4:
					return ((mapChrRead(tileOffset, isBg) >> 3) & 0x01) | ((mapChrRead(tileOffset+8, isBg) >> 2) & 0x02);
				case 5:
					return ((mapChrRead(tileOffset, isBg) >> 2) & 0x01) | ((mapChrRead(tileOffset+8, isBg) >> 1) & 0x02);
				case 6:
					return ((mapChrRead(tileOffset, isBg) >> 1) & 0x01) | ((mapChrRead(tileOffset+8, isBg)) & 0x02);
				case 7:
					return ((mapChrRead(tileOffset, isBg)) & 0x01) | ((mapChrRead(tileOffset+8, isBg) << 1) & 0x02);
			}
	}
}


	// UxROM
	mappers[2] = function() {
		initPrgBanks(0x4000);
		prgBanks[1] = (prgData.byteLength / 0x4000) - 1; // Fix last bank
		var unrom = new HwRegister(null, function(value) {
			prgBanks[0] = value;
		});
		for (var i = 0x8000; i < 0x10000; i++) {
			hwRegisters[i] = unrom;
		}
	};
	
	// MMC1
	mappers[1] = function() {
		//initPrgBanks(0x4000);
		//initChrBanks(0x1000);
		//prgBanks[1] = (prgData.byteLength / 0x4000) - 1;
		
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
			pendingIrq = false;
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
	var irqCounter = new Uint8Array(3); // 0 = actual counter, 1 = MMC3 latch, 2 = MMC5 latch
	
	
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
			pendingIrq = false;
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
	
	var mmc5ScanlineIrqEnabled = false;
	mappers[5] = function() {
		
		var prgMask = (prgData.byteLength / 0x2000) - 1;
		var prgRamMask = (0x40000 / 0x2000) - 1;
		var chrMask = (chrData.byteLength / 0x400) - 1;
		
		var mmc5Ram = new Uint8Array(0x40000);
		var fillNametable = new Uint8Array(0x400);
		var fillNametableAttributes = new Uint8Array(fillNametable.buffer, 0x3C0, 0x40);
		bgChrMemory = new Uint8Array(0x2000); // ghetto banking for performance reasons
		
		var prgMode = 0, chrMode = 0;
		var prgIndex = new Uint8Array(5);
		var chrIndex = new Uint8Array(8);
		var bgChrIndex = new Uint8Array(8);
		var prgIndexRam = new Uint8Array(5);
		
		initChrBanks(0x400);
		initPrgBanks(0x2000);

		var bgChrBanks = new Uint8Array(8);

		mapChrRead = function(address, isBg) {
			var bank = isBg && tallSprites ? bgChrBanks[address >> 10] : chrBanks[address >> 10];
			return chrData[(bank << 10) | (address & 0x3ff)];
		};
		
		/*
PRG RAM mode: (needs to be extended to take extended RAM into consideration, or CV3 will break)
		prgBanks = new Uint8Array(4);
		prgRam = new Uint8Array(mmc5Ram.buffer, 0, 0x2000);
		var shiftAmount = 13;
		var bankMask = 0x1FFF;
		mapRead[1] = function(address) {
			if (!(address & 0x8000)) return prgRam[address - 0x6000];
			
			var romAddress = address & 0x7FFF;
			var slot = romAddress >> shiftAmount;
			if (prgIndexRam[slot]) return mmc5Ram[((prgBanks[slot] & prgRamMask) << shiftAmount) | (romAddress & bankMask)];
			return prgData[(prgBanks[slot] << shiftAmount) | (romAddress & bankMask)];
		};
		mapWrite[1] = function (address, value) {
			if (!(address & 0x8000)) prgRam[address - 0x6000] = value;
			var romAddress = address & 0x7FFF;
			var slot = romAddress >> shiftAmount;
			if (prgIndexRam[slot]) mmc5Ram[((prgBanks[slot] & prgRamMask) << shiftAmount) | (romAddress & bankMask)] = value;
		};*/
		
		setNametables(vMirroring ? 0x44 : 0x50);
		setPrgIndex(4, 0xFF);
		
		function setPrgMode(value) {
			prgMode = value & 3;
			setPrg();
		}
		function setChrMode(value) {
			chrMode = value & 3;
			setChr();
		}
		function setPrgIndex(slot, index) {
			if (slot > 0 && slot < 4) prgIndexRam[slot] = (index & 0x80) != 0
			prgIndex[slot] = index & 0x7F & prgMask;
			setPrg();
		}
		function setChrIndex(slot, index) {
			chrIndex[slot] = index & chrMask;
			setChr();
		}
		function setBgChrIndex(slot, index) {
			bgChrIndex[slot] = index & chrMask;
			setChr();
		}
		
		function setPrg() {
			prgRam = new Uint8Array(mmc5Ram.buffer, 0x2000 * prgIndex[0], 0x2000);
			// TODO: RAM slots (override PRG read)
			switch (prgMode) {
				case 0:
					prgBanks[0] = (prgIndex[4] & 0xFC);
					prgBanks[1] = (prgIndex[4] & 0xFC) | 1;
					prgBanks[2] = (prgIndex[4] & 0xFC) | 2;
					prgBanks[3] = (prgIndex[4] & 0xFC) | 3;
					break;
				case 1:
					prgBanks[0] = (prgIndex[2] & 0xFE);
					prgBanks[1] = (prgIndex[2] & 0xFE) | 1;
					prgBanks[2] = (prgIndex[4] & 0xFE);
					prgBanks[3] = (prgIndex[4] & 0xFE) | 1;
					break;
				case 2:
					prgBanks[0] = (prgIndex[2] & 0xFE);
					prgBanks[1] = (prgIndex[2] & 0xFE) | 1;
					prgBanks[2] = prgIndex[3];
					prgBanks[3] = prgIndex[4];
					break;
				case 3:
					prgBanks[0] = prgIndex[1];
					prgBanks[1] = prgIndex[2];
					prgBanks[2] = prgIndex[3];
					prgBanks[3] = prgIndex[4];
					break;
			}
		}
		function setChr() {
			
			switch (chrMode) {
				case 0:
					chrBanks[0] = (chrIndex[7] << 3);
					chrBanks[1] = (chrIndex[7] << 3) | 1;
					chrBanks[2] = (chrIndex[7] << 3) | 2;
					chrBanks[3] = (chrIndex[7] << 3) | 3;
					chrBanks[4] = (chrIndex[7] << 3) | 4;
					chrBanks[5] = (chrIndex[7] << 3) | 5;
					chrBanks[6] = (chrIndex[7] << 3) | 6;
					chrBanks[7] = (chrIndex[7] << 3) | 7;
					
					bgChrBanks[0] = (bgChrIndex[3] << 3);
					bgChrBanks[1] = (bgChrIndex[3] << 3) | 1;
					bgChrBanks[2] = (bgChrIndex[3] << 3) | 2;
					bgChrBanks[3] = (bgChrIndex[3] << 3) | 3;
					bgChrBanks[4] = (bgChrIndex[3] << 3) | 4;
					bgChrBanks[5] = (bgChrIndex[3] << 3) | 5;
					bgChrBanks[6] = (bgChrIndex[3] << 3) | 6;
					bgChrBanks[7] = (bgChrIndex[3] << 3) | 7;
					break;
				case 1:
					chrBanks[0] = (chrIndex[3] << 2);
					chrBanks[1] = (chrIndex[3] << 2) | 1;
					chrBanks[2] = (chrIndex[3] << 2) | 2;
					chrBanks[3] = (chrIndex[3] << 2) | 3;
					chrBanks[4] = (chrIndex[7] << 2);
					chrBanks[5] = (chrIndex[7] << 2) | 1;
					chrBanks[6] = (chrIndex[7] << 2) | 2;
					chrBanks[7] = (chrIndex[7] << 2) | 3;
					
					bgChrBanks[0] = (bgChrIndex[3] << 2);
					bgChrBanks[1] = (bgChrIndex[3] << 2) | 1;
					bgChrBanks[2] = (bgChrIndex[3] << 2) | 2;
					bgChrBanks[3] = (bgChrIndex[3] << 2) | 3;
					bgChrBanks[4] = (bgChrIndex[3] << 2);
					bgChrBanks[5] = (bgChrIndex[3] << 2) | 1;
					bgChrBanks[6] = (bgChrIndex[3] << 2) | 2;
					bgChrBanks[7] = (bgChrIndex[3] << 2) | 3;
					break;
				case 2:
					chrBanks[0] = (chrIndex[1] << 1);
					chrBanks[1] = (chrIndex[1] << 1) | 1;
					chrBanks[2] = (chrIndex[3] << 1);
					chrBanks[3] = (chrIndex[3] << 1) | 1;
					chrBanks[4] = (chrIndex[5] << 1);
					chrBanks[5] = (chrIndex[5] << 1) | 1;
					chrBanks[6] = (chrIndex[7] << 1);
					chrBanks[7] = (chrIndex[7] << 1) | 1;
					
					bgChrBanks[0] = (bgChrIndex[1] << 1);
					bgChrBanks[1] = (bgChrIndex[1] << 1) | 1;
					bgChrBanks[2] = (bgChrIndex[3] << 1);
					bgChrBanks[3] = (bgChrIndex[3] << 1) | 1;
					bgChrBanks[4] = (bgChrIndex[1] << 1);
					bgChrBanks[5] = (bgChrIndex[1] << 1) | 1;
					bgChrBanks[6] = (bgChrIndex[3] << 1);
					bgChrBanks[7] = (bgChrIndex[3] << 1) | 1;
					break;
				case 3:
					chrBanks[0] = chrIndex[0];
					chrBanks[1] = chrIndex[1];
					chrBanks[2] = chrIndex[2];
					chrBanks[3] = chrIndex[3];
					chrBanks[4] = chrIndex[4];
					chrBanks[5] = chrIndex[5];
					chrBanks[6] = chrIndex[6];
					chrBanks[7] = chrIndex[7];

					bgChrBanks[0] = bgChrIndex[0];
					bgChrBanks[1] = bgChrIndex[1];
					bgChrBanks[2] = bgChrIndex[2];
					bgChrBanks[3] = bgChrIndex[3];
					bgChrBanks[4] = bgChrIndex[0];
					bgChrBanks[5] = bgChrIndex[1];
					bgChrBanks[6] = bgChrIndex[2];
					bgChrBanks[7] = bgChrIndex[3];
					break;
			}
			bgChrMemory.set(chrData.subarray(bgChrBanks[0]*0x400, (bgChrBanks[0]+1)*0x400), 0x0000);
			bgChrMemory.set(chrData.subarray(bgChrBanks[1]*0x400, (bgChrBanks[1]+1)*0x400), 0x0400);
			bgChrMemory.set(chrData.subarray(bgChrBanks[2]*0x400, (bgChrBanks[2]+1)*0x400), 0x0800);
			bgChrMemory.set(chrData.subarray(bgChrBanks[3]*0x400, (bgChrBanks[3]+1)*0x400), 0x0C00);
			bgChrMemory.set(chrData.subarray(bgChrBanks[4]*0x400, (bgChrBanks[4]+1)*0x400), 0x1000);
			bgChrMemory.set(chrData.subarray(bgChrBanks[5]*0x400, (bgChrBanks[5]+1)*0x400), 0x1400);
			bgChrMemory.set(chrData.subarray(bgChrBanks[6]*0x400, (bgChrBanks[6]+1)*0x400), 0x1800);
			bgChrMemory.set(chrData.subarray(bgChrBanks[7]*0x400, (bgChrBanks[7]+1)*0x400), 0x1C00);
		}
		function setNametable(nti, mapping) {
			switch (mapping) {
				case 0:
				case 1:
					nametables[nti] = nameTableSources[mapping];
					attributetables[nti] = attrSources[mapping];
					break;
				case 2:
					// TODO: extended RAM
					nametables[nti] = nameTableSources[0];
					attributetables[nti] = attrSources[0];
					break;
				case 3:
					nametables[nti] = fillNametable;
					attributetables[nti] = fillNametableAttributes;
					break;
			}
		}
		function setNametables(value) {
			setNametable(0, value & 3);
			value >>= 2;
			setNametable(1, value & 3);
			value >>= 2;
			setNametable(2, value & 3);
			value >>= 2;
			setNametable(3, value & 3);
		}
		
		function irqLatch(value) {
			irqCounter[2] = value;
		}
		var irqStatus = new HwRegister(function() {
			var returnValue = (pendingIrq == 2 ? 0x0 : 0) | (((showBG || showSprites) && scanline < 240 && pixelOnScanline < 259) ? 0x40 : 0);
			pendingIrq = false;
			return returnValue;
		}, function (value) {
			mmc5ScanlineIrqEnabled = (value & 0x80) != 0;
		});
		
		hwRegisters[0x5100] = new HwRegister(null, setPrgMode);
		hwRegisters[0x5101] = new HwRegister(null, setChrMode);
		// TODO: prg ram protect
		// TODO: extended ram
		hwRegisters[0x5105] = new HwRegister(null, setNametables);
		hwRegisters[0x5106] = new HwRegister(null, function(value) { fillNametable.fill(value, 0, 0x3C0); });
		hwRegisters[0x5107] = new HwRegister(null, function(value) { fillNametable.fill(value, 0x3C0); });

		hwRegisters[0x5113] = new HwRegister(null, function(value) { setPrgIndex(0, value); });
		hwRegisters[0x5114] = new HwRegister(null, function(value) { setPrgIndex(1, value); });
		hwRegisters[0x5115] = new HwRegister(null, function(value) { setPrgIndex(2, value); });
		hwRegisters[0x5116] = new HwRegister(null, function(value) { setPrgIndex(3, value); });
		hwRegisters[0x5117] = new HwRegister(null, function(value) { setPrgIndex(4, value); });

		hwRegisters[0x5120] = new HwRegister(null, function(value) { setChrIndex(0, value); });
		hwRegisters[0x5121] = new HwRegister(null, function(value) { setChrIndex(1, value); });
		hwRegisters[0x5122] = new HwRegister(null, function(value) { setChrIndex(2, value); });
		hwRegisters[0x5123] = new HwRegister(null, function(value) { setChrIndex(3, value); });
		hwRegisters[0x5124] = new HwRegister(null, function(value) { setChrIndex(4, value); });
		hwRegisters[0x5125] = new HwRegister(null, function(value) { setChrIndex(5, value); });
		hwRegisters[0x5126] = new HwRegister(null, function(value) { setChrIndex(6, value); });
		hwRegisters[0x5127] = new HwRegister(null, function(value) { setChrIndex(7, value); });

		hwRegisters[0x5128] = new HwRegister(null, function(value) { setBgChrIndex(0, value); });
		hwRegisters[0x5129] = new HwRegister(null, function(value) { setBgChrIndex(1, value); });
		hwRegisters[0x512A] = new HwRegister(null, function(value) { setBgChrIndex(2, value); });
		hwRegisters[0x512B] = new HwRegister(null, function(value) { setBgChrIndex(3, value); });
		
		hwRegisters[0x5203] = new HwRegister(null, irqLatch);
		hwRegisters[0x5204] = irqStatus;
	}
