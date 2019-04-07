/*
Support for features with browser prefixes and other strange quirks... fixes weird shortcomings in:
- safari on ios

*/

// Safari (all versions) still prefix this for reasons unknown.. interface is the same, so just polyfill it.
if (!window.AudioContext && window.webkitAudioContext) {
    window.AudioContext = window.webkitAudioContext;
}

// Disable the pinch-to-zoom behavior on ios. As nice as it is for reading, it's extremely easy to trigger this
// while trying to play a game, and that ends up ruining the experience.
document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
    document.body.style.zoom = 1;
});

document.addEventListener('gesturechange', function(e) {
    e.preventDefault();
    document.body.style.zoom = 1;
});

document.addEventListener('gestureend', function(e) {
    e.preventDefault();
    document.body.style.zoom = 1;
});
