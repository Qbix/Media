"use strict";

/**
 * Media plugin node-side class.
 * @module Media
 */

var Q = require('Q');
var Streams = require('Streams');
var Commands = require('Streams/Commands');

function Media() {}
Media.WebRTC          = require('Media/WebRTC');
Media.RTMPMediaServer = require('RTMPMediaServer');
Media.Presentation = require('Media/Presentation');
module.exports = Media;

// Session lifecycle and durable posting live in Streams now.
var Session           = require(Q.PLUGINS_DIR + '/Streams/classes/Streams/Transcript/Session');
var transcriptEmitter = require(Q.PLUGINS_DIR + '/Streams/classes/Streams/TranscriptEmitter').transcriptEmitter;

/**
 * Start node-side listeners for the Media plugin. Brings up WebRTC, posts the
 * presentation start/end records by subscribing to the Streams session
 * lifecycle, and wires the presentation control events (navigation, tool
 * commit). CommandsClassifier and ClipHandler are loaded automatically by
 * Bootstrap.loadHandlers() — no manual registration here.
 *
 * Call after Streams.listen() so the session lifecycle events exist.
 *
 * @method listen
 * @static
 */
Media.listen = function () {
    if (Media.listen.result) {
        return Media.listen.result;
    }

    var webrtc = Media.WebRTC.listen();
    var Users  = Q.require('Users');

    // ── Presentation lifecycle — follows the Streams session ────────────
    Media.Presentation.listen();

    // ── Presentation control events ─────────────────────────────────────

    var socket = Users.Socket.listen();
    var nsp = socket.io.of('/Q');

    nsp.on('connection', function (client) {
        if (client._mediaRegistered) return;
        client._mediaRegistered = true;

        // Navigation — slide / reveal advances driven from the host UI.
        client.on('Media/presentation/command', function (data) {
            var session = Session.get(client.id);
            if (!session || !data || !data.intent) return;
            Media._navCommand(session, data);
        });

        // A generated tool was shown on screen.
        client.on('Media/presentation/tool/committed', function (data) {
            var session = Session.get(client.id);
            if (!session || !session.publisherId || !session.streamName) return;
            var toolName = data && data.toolName;
            if (toolName) Media._postToolCommit(session, toolName);
        });
    });

    return Media.listen.result = { webrtc: webrtc, socket: true };
};