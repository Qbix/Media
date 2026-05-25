"use strict";

/**
 * Media plugin node-side class.
 * @module Media
 */

var Q    = require('Q');

function Media() {}
Media.WebRTC          = require('Media/WebRTC');
Media.RTMPMediaServer = require('RTMPMediaServer');
module.exports = Media;

/**
 * Start node-side listeners for the Media plugin.
 * Calls WebRTC.listen(). ControlClassifier and ClipHandler are loaded
 * automatically by Bootstrap.loadHandlers() — no manual registration here.
 * @method listen
 * @static
 */
Media.listen = function () {
    if (Media.listen.result) {
        return Media.listen.result;
    }
    var webrtc = Media.WebRTC.listen();
    return Media.listen.result = { webrtc: webrtc };
};
