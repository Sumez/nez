/*
Support for features with browser prefixes and the like... fixes weird shortcomings in:
- safari on ios

*/

if (!window.AudioContext && window.webkitAudioContext) {
    window.AudioContext = window.webkitAudioContext;
}