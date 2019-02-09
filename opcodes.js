
const illegalOpcodes = true;

function addrRead(address) {
	return mapRead[address & 0xC000 ? 1 : 0](address);
}
function addrWrite(address, value) {
	return mapWrite[address & 0xC000 ? 1 : 0](address, value);
}


	var referenceBuffer = new ArrayBuffer(2);
	var referenceBytes = new Uint8Array(referenceBuffer);
	var reference = new Uint16Array(referenceBuffer);
	var signed = new Int8Array(referenceBuffer);
	
	var opcodes = [];

	const NOP = 0xEA;
	
	opcodes[NOP] = function() { };
	
	const CMPi = 0xC9;
	const CMPzp = 0xC5;
	const CMPzpX = 0xD5;
	const CMPa = 0xCD;
	const CMPaX = 0xDD;
	const CMPaY = 0xD9;
	const CMPiX = 0xC1;
	const CMPiY = 0xD1;
	
	const CPXi = 0xE0;
	const CPXzp = 0xE4;
	const CPXa = 0xEC;
	const CPYi = 0xC0;
	const CPYzp = 0xC4;
	const CPYa = 0xCC;
	
	opcodes[CMPi] = function() { cmp(A, param8()); };
	opcodes[CMPzp] = function() { cmp(A, readValue(param8(), -1, true)); };
	opcodes[CMPzpX] = function() { cmp(A, readValue(param8(), X, true)); };
	opcodes[CMPa] = function() { cmp(A, readValue(param16(), -1)); };
	opcodes[CMPaX] = function() { cmp(A, readValue(param16(), X)); };
	opcodes[CMPaY] = function() { cmp(A, readValue(param16(), Y)); };
	opcodes[CMPiX] = function() { cmp(A, readValue(indirectX(), -1)); };
	opcodes[CMPiY] = function() { cmp(A, readValue(indirectY(), -1)); };

	opcodes[CPXi] = function() { cmp(X, param8()); };
	opcodes[CPXzp] = function() { cmp(X, readValue(param8(), -1, true)); };
	opcodes[CPXa] = function() { cmp(X, readValue(param16(), -1)); };
	opcodes[CPYi] = function() { cmp(Y, param8()); };
	opcodes[CPYzp] = function() { cmp(Y, readValue(param8(), -1, true)); };
	opcodes[CPYa] = function() { cmp(Y, readValue(param16(), -1)); };
	
	function cmp(registerOffset, value) {
		adc(registerOffset, 255 - value, true, true);
	}
	
window.testOp = function() {
	cpuRegisters[1] = 100;
	cmp(1, 229);
	console.log('<','N='+n,'Z='+z,'C='+c);
	cmp(1, 101);
	console.log('<','N='+n,'Z='+z,'C='+c);
	cmp(1, 100);
	console.log('equal','N='+n,'Z='+z,'C='+c);
	cpuRegisters[1] = 200;
	cmp(1, 3);
	console.log('>','N='+n,'Z='+z,'C='+c);
	cmp(1, 6);
	console.log('>','N='+n,'Z='+z,'C='+c);
}
	
	const ADCi = 0x69;
	const ADCzp = 0x65;
	const ADCzpX = 0x75
	const ADCa = 0x6D;
	const ADCaX = 0x7D;
	const ADCaY = 0x79;
	const ADCiX = 0x61;
	const ADCiY = 0x71;

	const SBCi = 0xE9;
	const SBCzp = 0xE5;
	const SBCzpX = 0xF5
	const SBCa = 0xED;
	const SBCaX = 0xFD;
	const SBCaY = 0xF9;
	const SBCiX = 0xE1;
	const SBCiY = 0xF1;

	opcodes[ADCi] = function() { cpuRegisters[A] = adc(A, param8(), c); }
	opcodes[ADCzp] = function() { cpuRegisters[A] = adc(A, readValue(param8(), -1, true), c); }
	opcodes[ADCzpX] = function() { cpuRegisters[A] = adc(A, readValue(param8(), X, true), c); }
	opcodes[ADCa] = function() { cpuRegisters[A] = adc(A, readValue(param16(), -1), c); }
	opcodes[ADCaX] = function() { cpuRegisters[A] = adc(A, readValue(param16(), X), c); }
	opcodes[ADCaY] = function() { cpuRegisters[A] = adc(A, readValue(param16(), Y), c); }
	opcodes[ADCiX] = function() { cpuRegisters[A] = adc(A, readValue(indirectX(), -1), c); }
	opcodes[ADCiY] = function() { cpuRegisters[A] = adc(A, readValue(indirectY(), -1), c); }

	opcodes[SBCi] = function() { cpuRegisters[A] = adc(A, 255 - param8(), c); }
	opcodes[SBCzp] = function() { cpuRegisters[A] = adc(A, 255 - readValue(param8(), -1, true), c); }
	opcodes[SBCzpX] = function() { cpuRegisters[A] = adc(A, 255 - readValue(param8(), X, true), c); }
	opcodes[SBCa] = function() { cpuRegisters[A] = adc(A, 255 - readValue(param16(), -1), c); }
	opcodes[SBCaX] = function() { cpuRegisters[A] = adc(A, 255 - readValue(param16(), X), c); }
	opcodes[SBCaY] = function() { cpuRegisters[A] = adc(A, 255 - readValue(param16(), Y), c); }
	opcodes[SBCiX] = function() { cpuRegisters[A] = adc(A, 255 - readValue(indirectX(), -1), c); }
	opcodes[SBCiY] = function() { cpuRegisters[A] = adc(A, 255 - readValue(indirectY(), -1), c); }
	
	function adc(registerOffset, value, carry, dontCheckOverflow) {
		signed[0] = cpuRegisters[registerOffset];
		signed[1] = value;
		
		var result = signed[0] + signed[1] + (carry ? 1 : 0);
		if (!dontCheckOverflow) v = (result < -128 || result > 127);
		
		var result = referenceBytes[0] + referenceBytes[1] + (carry ? 1 : 0);
		c = ((result & 0x100) != 0);
		
		result = result & 0xFF;
		z = (result == 0);
		n = (result >= 128);
			
		return result;
	}
	
	/*window.testAdc = function(val1, val2, carry) {
		
		cpuRegisters[A] = val1;
		var result = adc(A, val2, carry, true);
		
		console.log('Result : $' + result.toString(16));	
		console.log('N: ' + n, 'Z: ' + z, 'C: ' + c, 'V: ' + v);	
	}*/
	
	const CLC = 0x18;
	const SEC = 0x38;
	const CLI = 0x58;
	const SEI = 0x78;
	const CLV = 0xB8;
	const CLD = 0xD8;
	const SED = 0xF8;

	opcodes[CLC] = function() { c = false; };
	opcodes[SEC] = function() { c = true; };
	opcodes[CLI] = function() { interruptFlag = false; };
	opcodes[SEI] = function() { interruptFlag = true; };
	opcodes[CLV] = function() { v = false; };
	opcodes[CLD] = function() {  };
	opcodes[SED] = function() {  };

	const TAX = 0xAA;
	const TXA = 0x8A;
	const DEX = 0xCA;
	const INX = 0xE8;
	const TAY = 0xA8;
	const TYA = 0x98;
	const DEY = 0x88;
	const INY = 0xC8;

	opcodes[TAX] = function() { loadValue(cpuRegisters[A], X); };
	opcodes[TXA] = function() { loadValue(cpuRegisters[X], A); };
	opcodes[DEX] = function() { loadValue(cpuRegisters[X]-1, X); };
	opcodes[INX] = function() { loadValue(cpuRegisters[X]+1, X); };
	opcodes[TAY] = function() { loadValue(cpuRegisters[A], Y); };
	opcodes[TYA] = function() { loadValue(cpuRegisters[Y], A); };
	opcodes[DEY] = function() { loadValue(cpuRegisters[Y]-1, Y); };
	opcodes[INY] = function() { loadValue(cpuRegisters[Y]+1, Y); };
	
	const LDAi = 0xA9;
	const LDAzp = 0xA5;
	const LDAzpX = 0xB5;
	const LDAa = 0xAD;
	const LDAaX = 0xBD;
	const LDAaY = 0XB9;
	const LDAiX = 0xA1;
	const LDAiY = 0xB1;
	
	const LDXi = 0xA2;
	const LDXzp = 0xA6;
	const LDXzpY = 0xB6;
	const LDXa = 0xAE;
	const LDXaY = 0xBE;

	const LDYi = 0xA0;
	const LDYzp = 0xA4;
	const LDYzpX = 0xB4;
	const LDYa = 0xAC;
	const LDYaX = 0xBC;
	
	const STAzp = 0x85;
	const STAzpX = 0x95;
	const STAa = 0x8D;
	const STAaX = 0x9D;
	const STAaY = 0x99;
	const STAiX = 0x81;
	const STAiY = 0x91;
	
	const STXzp = 0x86;
	const STXzpY = 0x96;
	const STXa = 0x8E;

	const STYzp = 0x84;
	const STYzpX = 0x94;
	const STYa = 0x8C;
	
	const TXS = 0x9A;
	const TSX = 0xBA;
	const PHA = 0x48;
	const PLA = 0x68;
	const PHP = 0x08;
	const PLP = 0x28;
	
	const ANDi = 0x29;
	const ANDzp = 0x25;
	const ANDzpX = 0x35;
	const ANDa = 0x2D;
	const ANDaX = 0x3D;
	const ANDaY = 0x39;
	const ANDiX = 0x21;
	const ANDiY = 0x31;
	
	const BPL = 0x10;
	const BMI = 0x30;
	const BVC = 0x50;
	const BVS = 0x70;
	const BCC = 0x90;
	const BCS = 0xB0;
	const BNE = 0xD0;
	const BEQ = 0xF0;
	
	opcodes[BPL] = function() { branch(param8(), !n); };
	opcodes[BMI] = function() { branch(param8(), n); };
	opcodes[BVC] = function() { branch(param8(), !v); };
	opcodes[BVS] = function() { branch(param8(), v); };
	opcodes[BCC] = function() { branch(param8(), !c); };
	opcodes[BCS] = function() { branch(param8(), c); };
	opcodes[BNE] = function() { branch(param8(), !z); };
	opcodes[BEQ] = function() { branch(param8(), z); };
	
	const DECzp = 0xC6;
	const DECzpX = 0xD6;
	const DECa = 0xCE;
	const DECaX = 0xDE;

	opcodes[DECzp] = function() { inc(-1, param8(), -1, true); };
	opcodes[DECzpX] = function() { inc(-1, param8(), X, true); };
	opcodes[DECa] = function() { inc(-1, param16()); };
	opcodes[DECaX] = function() { inc(-1, param16(), X); };
	
	const INCzp = 0xE6;
	const INCzpX = 0xF6;
	const INCa = 0xEE;
	const INCaX = 0xFE;

	opcodes[INCzp] = function() { inc(1, param8(), -1, true); };
	opcodes[INCzpX] = function() { inc(1, param8(), X, true); };
	opcodes[INCa] = function() { inc(1, param16()); };
	opcodes[INCaX] = function() { inc(1, param16(), X); };
	
	const JSR = 0x20;
	const RTS = 0x60;
	const JMPa = 0x4C;
	const JMPi = 0x6c;
	
	opcodes[JSR] = function() {
		var byt1 = param8();
		push(pcByte[1]);
		push(pcByte[0]);
		var byt2 = param8();
		pcByte[0] = byt1;
		pcByte[1] = byt2;
	};
	opcodes[RTS] = function() {
		pcByte[0] = pull();
		pcByte[1] = pull();		
		pc[0]++;
	};
	opcodes[JMPa] = function() { pc[0] = param16(); };

	opcodes[JMPi] = function() {
		reference[0] = param16();
		pcByte[0] = readValue(reference[0]);
		referenceBytes[0]++;
		pcByte[1] = readValue(reference[0]);
	};
	
	const LSR = 0x4A;
	const LSRzp = 0x46;
	const LSRzpX = 0x56;
	const LSRa = 0x4E;
	const LSRaX = 0x5E;
	const ASL = 0x0A;
	const ASLzp = 0x06;
	const ASLzpX = 0x16;
	const ASLa = 0x0E;
	const ASLaX = 0x1E;

	const ROL = 0x2A;
	const ROLzp = 0x26;
	const ROLzpX = 0x36;
	const ROLa = 0x2E;
	const ROLaX = 0x3E;
	const ROR = 0x6A;
	const RORzp = 0x66;
	const RORzpX = 0x76;
	const RORa = 0x6E;
	const RORaX = 0x7E;

	opcodes[LSR] = function() { cpuRegisters[A] = lsr(cpuRegisters[A]); };
	opcodes[LSRzp] = function() { lsrA(param8(), -1, false, true); };
	opcodes[LSRzpX] = function() { lsrA(param8(), X, false, true); };
	opcodes[LSRa] = function() { lsrA(param16(), -1); };
	opcodes[LSRaX] = function() { lsrA(param16(), X); };
	opcodes[ASL] = function() { cpuRegisters[A] = asl(cpuRegisters[A]); };
	opcodes[ASLzp] = function() { aslA(param8(), -1, false, true); };
	opcodes[ASLzpX] = function() { aslA(param8(), X, false, true); };
	opcodes[ASLa] = function() { aslA(param16(), -1); };
	opcodes[ASLaX] = function() { aslA(param16(), X); };

	opcodes[ROR] = function() { cpuRegisters[A] = lsr(cpuRegisters[A], c); };
	opcodes[RORzp] = function() { lsrA(param8(), -1, c, true); };
	opcodes[RORzpX] = function() { lsrA(param8(), X, c, true); };
	opcodes[RORa] = function() { lsrA(param16(), -1, c); };
	opcodes[RORaX] = function() { lsrA(param16(), X, c); };
	opcodes[ROL] = function() { cpuRegisters[A] = asl(cpuRegisters[A], c); };
	opcodes[ROLzp] = function() { aslA(param8(), -1, c, true); };
	opcodes[ROLzpX] = function() { aslA(param8(), X, c, true); };
	opcodes[ROLa] = function() { aslA(param16(), -1, c); };
	opcodes[ROLaX] = function() { aslA(param16(), X, c); };
	
	function lsr(value, carry) {
		c = ((value & 0x01) != 0)
		var result = value >> 1 | (carry ? 0x80 : 0);
		z = (result == 0);
		n = (result >= 128);
		return result;
	}
	function asl(value, carry) {
		c = ((value & 0x80) != 0)
		var result = value << 1 & 0xFF | (carry ? 0x01 : 0);
		z = (result == 0);
		n = (result >= 128);
		return result;
	}
	function lsrA(address, offsetByRegister, carry, isZP) {
		if (offsetByRegister >= 0) address = (address + cpuRegisters[offsetByRegister]) & (isZP ? 0xff : 0xffff);
		var val = (hwRegisters[address] && hwRegisters[address].read)
		? hwRegisters[address].read()
		: addrRead(address);
		
		val = lsr(val, carry);
		if (hwRegisters[address]) {
			if (hwRegisters[address].store) {
				hwRegisters[address].store(val, address);
			}
		}
		else {
			addrWrite(address, val);
		}
	}
	function aslA(address, offsetByRegister, carry, isZP) {
		if (offsetByRegister >= 0) address = (address + cpuRegisters[offsetByRegister]) & (isZP ? 0xff : 0xffff);
		var val = (hwRegisters[address] && hwRegisters[address].read)
		? hwRegisters[address].read()
		: addrRead(address);
		
		val = asl(val, carry);
		if (hwRegisters[address]) {
			if (hwRegisters[address].store) {
				hwRegisters[address].store(val, address);
			}
		}
		else {
			addrWrite(address, val);
		}
	}

	const BITzp = 0x24;
	const BITa = 0x2C;
	
	opcodes[BITzp] = function() { bit(readValue(param8())); };
	opcodes[BITa] = function() { bit(readValue(param16())); };

	function bit(value) {
		z = ((value & cpuRegisters[A]) == 0);
		n = ((value & 0x80) != 0);
		v = ((value & 0x40) != 0);
	}

	const EORi = 0x49;
	const EORzp = 0x45;
	const EORzpX = 0x55;
	const EORa = 0x4D;
	const EORaX = 0x5D;
	const EORaY = 0x59;
	const EORiX = 0x41;
	const EORiY = 0x51;

	const ORAi = 0x09;
	const ORAzp = 0x05;
	const ORAzpX = 0x15;
	const ORAa = 0x0D;
	const ORAaX = 0x1D;
	const ORAaY = 0x19;
	const ORAiX = 0x01;
	const ORAiY = 0x11;
	
	opcodes[EORi] = function() { loadValue(param8() ^ cpuRegisters[A], A); };
	opcodes[EORzp] = function() { loadValue(readValue(param8(), -1, true) ^ cpuRegisters[A], A); };
	opcodes[EORzpX] = function() { loadValue(readValue(param8(), X, true) ^ cpuRegisters[A], A); };
	opcodes[EORa] = function() { loadValue(readValue(param16(), -1) ^ cpuRegisters[A], A); };
	opcodes[EORaX] = function() { loadValue(readValue(param16(), X) ^ cpuRegisters[A], A); };
	opcodes[EORaY] = function() { loadValue(readValue(param16(), Y) ^ cpuRegisters[A], A); };
	opcodes[EORiX] = function() { loadValue(readValue(indirectX(), -1) ^ cpuRegisters[A], A); };
	opcodes[EORiY] = function() { loadValue(readValue(indirectY(), -1) ^ cpuRegisters[A], A); };

	opcodes[ORAi] = function() { loadValue(param8() | cpuRegisters[A], A); };
	opcodes[ORAzp] = function() { loadValue(readValue(param8(), -1, true) | cpuRegisters[A], A); };
	opcodes[ORAzpX] = function() { loadValue(readValue(param8(), X, true) | cpuRegisters[A], A); };
	opcodes[ORAa] = function() { loadValue(readValue(param16(), -1) | cpuRegisters[A], A); };
	opcodes[ORAaX] = function() { loadValue(readValue(param16(), X) | cpuRegisters[A], A); };
	opcodes[ORAaY] = function() { loadValue(readValue(param16(), Y) | cpuRegisters[A], A); };
	opcodes[ORAiX] = function() { loadValue(readValue(indirectX(), -1) | cpuRegisters[A], A); };
	opcodes[ORAiY] = function() { loadValue(readValue(indirectY(), -1) | cpuRegisters[A], A); };

	const RTI = 0x40;
	opcodes[RTI] = returnFromIrq;

	const A = 0;
	const X = 1;
	const Y = 2;
	const SP = 3;
	const NMI = 0;
	const RESET = 1;
	const IRQ = 2;

	function branch(offset, doIt) {
		if (!doIt) return;
		currentCycleCount++;
		var prevPage = pcByte[1];
		signed[0] = offset;
		pc[0] += signed[0];
		if (pcByte[1] != prevPage) currentCycleCount++;
	}
	
	function inc(amount, address, offsetByRegister, isZP) {
		if (offsetByRegister >= 0) address = (address + cpuRegisters[offsetByRegister]) & (isZP ? 0xff : 0xffff);
		var val = (hwRegisters[address] && hwRegisters[address].read)
		? hwRegisters[address].read()
		: addrRead(address);

		if (hwRegisters[address]) {
			if (hwRegisters[address].store) {
				hwRegisters[address].store(val, address);
				hwRegisters[address].store(val + amount, address);
			}
			val += amount;
		}
		else {
			addrWrite(address, val);
			val += amount;
			addrWrite(address, val);
		}
		z = ((val & 0xff) === 0);
		n = ((val & 0xff) >= 128);
	}
	
	function readValue(address, offsetByRegister, isZP) {
		if (offsetByRegister >= 0) {
			var addr2 = (address + cpuRegisters[offsetByRegister]) & (isZP ? 0xff : 0xffff);
			if ((address & 0xFF00) != (addr2 & 0xFF00)) currentCycleCount++;
			address = addr2;
		}
		if (hwRegisters[address] && hwRegisters[address].read) {
			return hwRegisters[address].read();
		}
		else {
			return addrRead(address);
		}
	}
	function loadValue(value, registerOffset) {
		cpuRegisters[registerOffset] = value;
		z = (cpuRegisters[registerOffset] === 0)
		n = (cpuRegisters[registerOffset] >= 128)
		
		return value; // useful for LAX
	}
	function storeValue(registerOffset, address, offsetByRegister, isZP) {
		if (offsetByRegister >= 0) {
			var addr2 = (address + cpuRegisters[offsetByRegister]) & (isZP ? 0xff : 0xffff);
			if (registerOffset > 0 && ((address & 0xFF00) != (addr2 & 0xFF00))) currentCycleCount++;
			address = addr2;
		}
		if (hwRegisters[address]) {
			if (hwRegisters[address].store) hwRegisters[address].store(cpuRegisters[registerOffset], address);
		}
		else {
			addrWrite(address, cpuRegisters[registerOffset]);
		}
	}
	function storeValueDirect(value, address, offsetByRegister, isZP) {
		if (offsetByRegister >= 0) {
			var address = (address + cpuRegisters[offsetByRegister]) & (isZP ? 0xff : 0xffff);
		}
		if (hwRegisters[address]) {
			if (hwRegisters[address].store) hwRegisters[address].store(value, address);
		}
		else {
			addrWrite(address, value);
		}
	}
	function indirectY(free) {
		var zp = param8();
		var addr1 = cpuMemory[zp] + (cpuMemory[(zp+1) & 0xff] << 8);
		var addr2 = (addr1 + cpuRegisters[Y]) & 0xffff;
		if (!free & ((addr1 & 0xFF00) != (addr2 & 0xFF00))) currentCycleCount++;
		return addr2;
	}
	function indirectX() {
		var zp = param8() + cpuRegisters[X];
		return cpuMemory[zp & 0xff] + (cpuMemory[(zp+1) & 0xff] << 8);
	}
	function param16() {
		var val = addrRead(pc[0]) + (addrRead(pc[0]+1) << 8);
		pc[0] += 2;
		return val;
	}
	function param8() {
		var val = addrRead(pc[0]);
		pc[0]++;
		return val;
	}
		
	opcodes[TSX] = function() { loadValue(cpuRegisters[SP], X); };
	opcodes[TXS] = function() { cpuRegisters[SP] = cpuRegisters[X]; };
	opcodes[PHA] = function() { push(cpuRegisters[A]) };
	opcodes[PLA] = function() { loadValue(pull(), A); };
	opcodes[PHP] = function() { push(getFlags()) };
	opcodes[PLP] = function() { setFlags(pull()); };
	
	function push(value) {
		stack[cpuRegisters[SP]] = value;
		cpuRegisters[SP]--;
	}
	function pull(value) {
		cpuRegisters[SP]++;
		return stack[cpuRegisters[SP]];
	}
	
	opcodes[LDAi] = function() { loadValue(param8(), A); };
	opcodes[LDAzp] = function() { loadValue(readValue(param8(), -1, true), A); };
	opcodes[LDAzpX] = function() { loadValue(readValue(param8(), X, true), A); };
	opcodes[LDAa] = function() { loadValue(readValue(param16(), -1), A); };
	opcodes[LDAaX] = function() { loadValue(readValue(param16(), X), A); };
	opcodes[LDAaY] = function() { loadValue(readValue(param16(), Y), A); };
	opcodes[LDAiX] = function() { loadValue(readValue(indirectX(), -1), A); };
	opcodes[LDAiY] = function() { loadValue(readValue(indirectY(), -1), A); };

	opcodes[LDYi] = function() { loadValue(param8(), Y); };
	opcodes[LDYzp] = function() { loadValue(readValue(param8(), -1, true), Y); };
	opcodes[LDYzpX] = function() { loadValue(readValue(param8(), X, true), Y); };
	opcodes[LDYa] = function() { loadValue(readValue(param16(), -1), Y); };
	opcodes[LDYaX] = function() { loadValue(readValue(param16(), X), Y); };

	opcodes[LDXi] = function() { loadValue(param8(), X); };
	opcodes[LDXzp] = function() { loadValue(readValue(param8(), -1, true), X); };
	opcodes[LDXzpY] = function() { loadValue(readValue(param8(), Y, true), X); };
	opcodes[LDXa] = function() { loadValue(readValue(param16(), -1), X); };
	opcodes[LDXaY] = function() { loadValue(readValue(param16(), Y), X); };
	
	opcodes[STAzp] = function() { storeValue(A, param8(), -1, true); };
	opcodes[STAzpX] = function() { storeValue(A, param8(), X, true); };
	opcodes[STAa] = function() { storeValue(A, param16(), -1); };
	opcodes[STAaX] = function() { storeValue(A, param16(), X); };
	opcodes[STAaY] = function() { storeValue(A, param16(), Y); };
	opcodes[STAiX] = function() { storeValue(A, indirectX()); };
	opcodes[STAiY] = function() { storeValue(A, indirectY(true)); };

	opcodes[STXzp] = function() { storeValue(X, param8(), -1, true); };
	opcodes[STXzpY] = function() { storeValue(X, param8(), Y, true); };
	opcodes[STXa] = function() { storeValue(X, param16(), -1); };
	opcodes[STYzp] = function() { storeValue(Y, param8(), -1, true); };
	opcodes[STYzpX] = function() { storeValue(Y, param8(), X, true); };
	opcodes[STYa] = function() { storeValue(Y, param16(), -1); };

	
	opcodes[ANDi] = function() { loadValue(param8() & cpuRegisters[A], A); };
	opcodes[ANDzp] = function() { loadValue(readValue(param8(), -1, true) & cpuRegisters[A], A); };
	opcodes[ANDzpX] = function() { loadValue(readValue(param8(), X, true) & cpuRegisters[A], A); };
	opcodes[ANDa] = function() { loadValue(readValue(param16(), -1) & cpuRegisters[A], A); };
	opcodes[ANDaX] = function() { loadValue(readValue(param16(), X) & cpuRegisters[A], A); };
	opcodes[ANDaY] = function() { loadValue(readValue(param16(), Y) & cpuRegisters[A], A); };
	opcodes[ANDiX] = function() { loadValue(readValue(indirectX(), -1) & cpuRegisters[A], A); };
	opcodes[ANDiY] = function() { loadValue(readValue(indirectY(), -1) & cpuRegisters[A], A); };
	
	
	const BRK = 0x00;
	const LAXa = 0xAF;
	const LAXaY = 0xBF;
	const LAXzp = 0xA7;
	const LAXzpY = 0xB7;
	const LAXiX = 0xA3;
	const LAXiY = 0xB3;
	const SAX = 0xCB;
	const ALR = 0x4B;
	const ARR = 0x6B;
	const AXSa = 0x8F;
	const AXSzp = 0x87;
	const AXSzpY = 0x97;
	const AXSiX = 0x83;
	const ANC2 = 0x2B;
	const ANC1 = 0x0B;
	
	const INSa = 0xEF;
	const INSaX = 0xFF;
	const INSaY = 0xFB;
	const INSzp = 0xE7;
	const INSzpX = 0xF7;
	const INSiX = 0xE3;
	const INSiY = 0xF3;

	var nop1 = [0x1A,0x3A,0x5A,0x7A,0xDA,0xFA];
	var nop2 = [0x80,0x82,0xC2,0xE2,0x04,0x14,0x34,0x44,0x54,0x64,0x74,0xD4,0xF4];
	var nop3 = [0x0C,0x1C,0x3C,0x5C,0x7C,0xDC,0xFC];
	
	
	if (illegalOpcodes) {
		
		opcodes[BRK] = function() { pc[0]++; pendingIrq = true; }; // not really illegal, but catching it helps with debugging :)

		opcodes[LAXzp] = function() { cpuRegisters[X] = loadValue(readValue(param8(), -1, true), A); };
		opcodes[LAXzpY] = function() { cpuRegisters[X] = loadValue(readValue(param8(), Y, true), A); };
		opcodes[LAXa] = function() { cpuRegisters[X] = loadValue(readValue(param16(), -1), A); };
		opcodes[LAXaY] = function() { cpuRegisters[X] = loadValue(readValue(param16(), Y), A); };
		opcodes[LAXiX] = function() { cpuRegisters[X] = loadValue(readValue(indirectX(), -1), A); };
		opcodes[LAXiY] = function() { cpuRegisters[X] = loadValue(readValue(indirectY(), -1), A); };
		
		opcodes[SAX] = function() {
			cpuRegisters[X] &= cpuRegisters[A];
			cpuRegisters[X] = adc(X, 255 - param8(), true, true);
		};
		opcodes[AXSa] = function() { storeValueDirect(cpuRegisters[X] & cpuRegisters[A], param16()); };
		opcodes[AXSzp] = function() { storeValueDirect(cpuRegisters[X] & cpuRegisters[A], param8(), -1, true); };
		opcodes[AXSzpY] = function() { storeValueDirect(cpuRegisters[X] & cpuRegisters[A], param8(), Y, true); };
		opcodes[AXSiX] = function() { storeValueDirect(cpuRegisters[X] & cpuRegisters[A], indirectX(), -1); };
		
		opcodes[ALR] = function() { cpuRegisters[A] = lsr(cpuRegisters[A] & param8()); };
		opcodes[ARR] = function() { cpuRegisters[A] = lsr(cpuRegisters[A] & param8(), C); };
		
		opcodes[ANC1] = opcodes[ANC2] = function() { loadValue(param8() & cpuRegisters[A], A); c = n; };

		opcodes[INSa] = function() { var addr = param16(); inc(1, addr, -1); cpuRegisters[A] = adc(A, 255 - readValue(addr, -1), c); }
		// 0xFF: opcodes[INSaX] = function() { var addr = param16(); inc(1, addr, X); cpuRegisters[A] = adc(A, 255 - readValue(addr, X), c); }
		opcodes[INSaY] = function() { var addr = param16(); inc(1, addr, Y); cpuRegisters[A] = adc(A, 255 - readValue(addr, Y), c); }
		opcodes[INSzp] = function() { var addr = param8(); inc(1, addr, -1, true); cpuRegisters[A] = adc(A, 255 - readValue(addr, -1, true), c); }
		opcodes[INSzpX] = function() { var addr = param8(); inc(1, addr, X, true); cpuRegisters[A] = adc(A, 255 - readValue(addr, X, true), c); }
		opcodes[INSiX] = function() { var addr = indirectX(); inc(1, addr, -1); cpuRegisters[A] = adc(A, 255 - readValue(addr, -1), c); }
		opcodes[INSiY] = function() { var addr = indirectY(); inc(1, addr, -1); cpuRegisters[A] = adc(A, 255 - readValue(addr, -1), c); }

		
		for (var i = 0; i < nop1.length; i++) opcodes[nop1[i]] = function() { };
		for (var i = 0; i < nop1.length; i++) opcodes[nop2[i]] = function() { pc[0]++; };
		for (var i = 0; i < nop3.length; i++) opcodes[nop3[i]] = function() { pc[0] += 2; };

	}
	
	
	opcodeCycles = [];
opcodeCycles[BPL] = 2;
opcodeCycles[BMI] = 2;
opcodeCycles[BVC] = 2;
opcodeCycles[BVS] = 2;
opcodeCycles[BCC] = 2;
opcodeCycles[BCS] = 2;
opcodeCycles[BNE] = 2;
opcodeCycles[BEQ] = 2;
opcodeCycles[CLC] = 2;
opcodeCycles[SEC] = 2;
opcodeCycles[CLI] = 2;
opcodeCycles[SEI] = 2;
opcodeCycles[CLV] = 2;
opcodeCycles[CLD] = 2;
opcodeCycles[SED] = 2;
opcodeCycles[TAX] = 2;
opcodeCycles[TXA] = 2;
opcodeCycles[DEX] = 2;
opcodeCycles[INX] = 2;
opcodeCycles[TAY] = 2;
opcodeCycles[TYA] = 2;
opcodeCycles[DEY] = 2;
opcodeCycles[INY] = 2;
opcodeCycles[ADCi] = 2;
opcodeCycles[ADCzp] = 3;
opcodeCycles[ADCzpX] = 4;
opcodeCycles[ADCa] = 4;
opcodeCycles[ADCaX] = 4;
opcodeCycles[ADCaY] = 4;
opcodeCycles[ADCiX] = 6;
opcodeCycles[ADCiY] = 5;
opcodeCycles[ANDi] = 2;
opcodeCycles[ANDzp] = 3;
opcodeCycles[ANDzpX] = 4;
opcodeCycles[ANDa] = 4;
opcodeCycles[ANDaX] = 4;
opcodeCycles[ANDaY] = 4;
opcodeCycles[ANDiX] = 6;
opcodeCycles[ANDiY] = 5;
opcodeCycles[ASL] = 2;
opcodeCycles[ASLzp] = 5;
opcodeCycles[ASLzpX] = 6;
opcodeCycles[ASLa] = 6;
opcodeCycles[ASLaX] = 7;
opcodeCycles[BITzp] = 3;
opcodeCycles[BITa] = 4;
opcodeCycles[BRK] = 7;
opcodeCycles[CMPi] = 2;
opcodeCycles[CMPzp] = 3;
opcodeCycles[CMPzpX] = 4;
opcodeCycles[CMPa] = 4;
opcodeCycles[CMPaX] = 4;
opcodeCycles[CMPaY] = 4;
opcodeCycles[CMPiX] = 6;
opcodeCycles[CMPiY] = 5;
opcodeCycles[CPXi] = 2;
opcodeCycles[CPXzp] = 3;
opcodeCycles[CPXa] = 4;
opcodeCycles[CPYi] = 2;
opcodeCycles[CPYzp] = 3;
opcodeCycles[CPYa] = 4;
opcodeCycles[DECzp] = 5;
opcodeCycles[DECzpX] = 6;
opcodeCycles[DECa] = 6;
opcodeCycles[DECaX] = 7;
opcodeCycles[EORi] = 2;
opcodeCycles[EORzp] = 3;
opcodeCycles[EORzpX] = 4;
opcodeCycles[EORa] = 4;
opcodeCycles[EORaX] = 4;
opcodeCycles[EORaY] = 4;
opcodeCycles[EORiX] = 6;
opcodeCycles[EORiY] = 5;
opcodeCycles[INCzp] = 5;
opcodeCycles[INCzpX] = 6;
opcodeCycles[INCa] = 6;
opcodeCycles[INCaX] = 7;
opcodeCycles[JMPa] = 3;
opcodeCycles[JMPi] = 5;
opcodeCycles[JSR] = 6;
opcodeCycles[LDAi] = 2;
opcodeCycles[LDAzp] = 3;
opcodeCycles[LDAzpX] = 4;
opcodeCycles[LDAa] = 4;
opcodeCycles[LDAaX] = 4;
opcodeCycles[LDAaY] = 4;
opcodeCycles[LDAiX] = 6;
opcodeCycles[LDAiY] = 5;
opcodeCycles[LDXi] = 2;
opcodeCycles[LDXzp] = 3;
opcodeCycles[LDXzpY] = 4;
opcodeCycles[LDXa] = 4;
opcodeCycles[LDXaY] = 4;
opcodeCycles[LDYi] = 2;
opcodeCycles[LDYzp] = 3;
opcodeCycles[LDYzpX] = 4;
opcodeCycles[LDYa] = 4;
opcodeCycles[LDYaX] = 4;
opcodeCycles[LSR] = 2;
opcodeCycles[LSRzp] = 5;
opcodeCycles[LSRzpX] = 6;
opcodeCycles[LSRa] = 6;
opcodeCycles[LSRaX] = 7;
opcodeCycles[NOP] = 2;
opcodeCycles[ORAi] = 2;
opcodeCycles[ORAzp] = 3;
opcodeCycles[ORAzpX] = 4;
opcodeCycles[ORAa] = 4;
opcodeCycles[ORAaX] = 4;
opcodeCycles[ORAaY] = 4;
opcodeCycles[ORAiX] = 6;
opcodeCycles[ORAiY] = 5;
opcodeCycles[ROL] = 2;
opcodeCycles[ROLzp] = 5;
opcodeCycles[ROLzpX] = 6;
opcodeCycles[ROLa] = 6;
opcodeCycles[ROLaX] = 7;
opcodeCycles[ROR] = 2;
opcodeCycles[RORzp] = 5;
opcodeCycles[RORzpX] = 6;
opcodeCycles[RORa] = 6;
opcodeCycles[RORaX] = 7;
opcodeCycles[RTI] = 6;
opcodeCycles[RTS] = 6;
opcodeCycles[SBCi] = 2;
opcodeCycles[SBCzp] = 3;
opcodeCycles[SBCzpX] = 4;
opcodeCycles[SBCa] = 4;
opcodeCycles[SBCaX] = 4;
opcodeCycles[SBCaY] = 4;
opcodeCycles[SBCiX] = 6;
opcodeCycles[SBCiY] = 5;
opcodeCycles[STAzp] = 3;
opcodeCycles[STAzpX] = 4;
opcodeCycles[STAa] = 4;
opcodeCycles[STAaX] = 5;
opcodeCycles[STAaY] = 5;
opcodeCycles[STAiX] = 6;
opcodeCycles[STAiY] = 6;
opcodeCycles[TXS] = 2;
opcodeCycles[TSX] = 2;
opcodeCycles[PHA] = 3;
opcodeCycles[PLA] = 4;
opcodeCycles[PHP] = 3;
opcodeCycles[PLP] = 4;
opcodeCycles[STXzp] = 3;
opcodeCycles[STXzpY] = 4;
opcodeCycles[STXa] = 4;
opcodeCycles[STYzp] = 3;
opcodeCycles[STYzpX] = 4;
opcodeCycles[STYa] = 4;
	