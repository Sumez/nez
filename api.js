/* 

Introduces a very simple api off the `window.emu` object. Allows for getting/setting a few common things.

*/

var Api = {};
Api.getSram = function() {
    return cpuMemory.subarray(0x6000, 0x8000);
};