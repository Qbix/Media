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
module.exports = Media;

// Session lifecycle and durable posting live in Streams now.
var Session           = require('../../Streams/classes/Streams/Transcript/Session');
var transcriptEmitter = require('../../Streams/classes/Streams/TranscriptEmitter').transcriptEmitter;

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

    transcriptEmitter.on('sessionStart', function (evt) {
        var session = Session.get(evt.sessionId);
        if (!session || !session.publisherId || !session.streamName) return;
        Session.postMessage(Q, {
            publisherId: session.publisherId,
            streamName:  session.streamName,
            byUserId:    session.userId,
            type:        'Media/presentation/start',
            instructions: JSON.stringify({
                role: session.role, lang: session.lang, mode: session.mode
            })
        });
    });

    transcriptEmitter.on('sessionEnd', function (evt) {
        var session = Session.get(evt.sessionId);
        if (!session || !session.publisherId || !session.streamName) return;
        Session.postMessage(Q, {
            publisherId: session.publisherId,
            streamName:  session.streamName,
            byUserId:    session.userId,
            type:        'Media/presentation/end',
            instructions: JSON.stringify({
                relSec:                 Session.relSec(session),
                transcriptMessageCount: session.transcriptBuffer.length
            })
        });
    });

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

// ── Presentation command helpers (moved from AI.js) ─────────────────────────

Media._navCommand = function (session, data) {
    if (data.slideIndex  != null) session.slideIndex  = data.slideIndex;
    if (data.revealIndex != null) session.revealIndex = data.revealIndex;
    if (!session.publisherId || !session.streamName) return;

    var intent = data.intent || '';
    var isSlide  = intent === 'slide/navigate'  || intent.indexOf('slide/')  === 0;
    var isReveal = intent === 'reveal/navigate' || intent.indexOf('reveal/') === 0;
    if (!isSlide && !isReveal) return;

    var relSec = data.relSec || Session.relSec(session);

    if (isSlide) {
        var slideInstr = JSON.stringify({
            index:  session.slideIndex,
            relSec: relSec,
            intent: intent,
            query:  data.query || undefined
        });
        Session.postMessage(Q, {
            publisherId:  session.publisherId,
            streamName:   session.streamName,
            byUserId:     session.userId,
            type:         'Media/presentation/slide',
            instructions: slideInstr
        }, function (err, message) {
            if (!err && message) {
                transcriptEmitter._appendVttEventNote(
                    session, 'Media/presentation/slide',
                    message.fields.ordinal, slideInstr, Q, message.fields.sentTime
                );
            }
        });
        return;
    }

    // Reveal — same shape, different type. Durable so the VTT chapter markers
    // carry within-slide reveal advances too.
    var revealInstr = JSON.stringify({
        index:  session.revealIndex,
        relSec: relSec,
        intent: intent
    });
    Session.postMessage(Q, {
        publisherId:  session.publisherId,
        streamName:   session.streamName,
        byUserId:     session.userId,
        type:         'Media/presentation/reveal',
        instructions: revealInstr
    }, function (err, message) {
        if (!err && message) {
            transcriptEmitter._appendVttEventNote(
                session, 'Media/presentation/reveal',
                message.fields.ordinal, revealInstr, Q, message.fields.sentTime
            );
        }
    });
};

Media._postToolCommit = function (session, toolName) {
    var relSec    = Session.relSec(session);
    var toolInstr = JSON.stringify({ toolName: toolName, relSec: relSec });
    Session.postMessage(Q, {
        publisherId:  session.publisherId,
        streamName:   session.streamName,
        byUserId:     session.userId,
        type:         'Media/presentation/tool/show',
        instructions: toolInstr
    }, function (err, message) {
        if (!err && message) {
            transcriptEmitter._appendVttEventNote(
                session, 'Media/presentation/tool/show',
                message.fields.ordinal, toolInstr, Q, message.fields.sentTime
            );
        }
    });
};

/**
 * Media registers its display commands — slide, video, gallery, zoom, scroll,
 * reveal, fullscreen, highlight — into the shared Streams.Commands registry.
 * These emitters used to be a hardcoded map inside the CommandsClassifier; the
 * classifier is now generic and reads behaviour (emit) and whole-text capture
 * rules (captures) from here. Require this once when the Media plugin starts so
 * the registry is populated before the first transcript arrives.
 *
 * Each emitter is fn(captures, stream, state, Q) and fires a stream ephemeral.
 * Output types stay plugin-agnostic (Streams/* and Q/*); Media simply owns the
 * vocabulary that maps a recognized phrase to one of them.
 */

var SCROLL_STEP = 20;

Commands.register({

    // -- slides --------------------------------------------------------------
    'slide/next':  { emit: function (c, stream, state) {
        return stream.ephemeral('Streams/slide', { slideIndex: ((state && state.slideIndex) || 0) + 1 });
    } },
    'slide/prev':  { emit: function (c, stream, state) {
        return stream.ephemeral('Streams/slide', { slideIndex: Math.max(0, ((state && state.slideIndex) || 0) - 1) });
    } },
    'slide/first': { emit: function (c, stream) { return stream.ephemeral('Streams/slide', { slideIndex: 0 }); } },
    'slide/last':  { emit: function (c, stream) { return stream.ephemeral('Streams/slide', { slideIndex: 9999 }); } },

    // -- video ---------------------------------------------------------------
    'video/play':  { emit: function (c, stream) { return stream.ephemeral('Streams/play', {}); } },
    'video/pause': { emit: function (c, stream) { return stream.ephemeral('Streams/pause', {}); } },
    'video/seek':  {
        captures: { pos: 'time' },
        emit: function (c, stream) {
            return c.pos != null && stream.ephemeral('Streams/seek', { pos: c.pos });
        }
    },
    'video/seek/relative': {
        captures: { rel: 'duration' },   // duration returns { delta, forward }
        emit: function (c, stream) {
            return c.delta != null && stream.ephemeral('Streams/seek', {
                pos: (c.forward ? '+' : '-') + c.delta
            });
        }
    },

    // -- gallery -------------------------------------------------------------
    'gallery/next':           { emit: function (c, stream) { return stream.ephemeral('Streams/gallery/next', {}); } },
    'gallery/pause':          { emit: function (c, stream) { return stream.ephemeral('Streams/gallery/pause', {}); } },
    'gallery/resume':         { emit: function (c, stream) { return stream.ephemeral('Streams/gallery/resume', {}); } },
    'gallery/caption/remove': { emit: function (c, stream) { return stream.ephemeral('Streams/gallery/caption', { remove: true }); } },
    'gallery/remove':         { emit: function (c, stream) { return stream.ephemeral('Streams/gallery/remove', {}); } },

    // -- highlight -----------------------------------------------------------
    'highlight': {
        captures: { elementId: 'ordinal' },
        emit: function (c, stream) {
            return c.elementId && stream.ephemeral('Streams/highlight', { elementId: c.elementId });
        }
    },

    // -- zoom ----------------------------------------------------------------
    'zoom/in':    { emit: function (c, stream, state) {
        return stream.ephemeral('Streams/zoom', { scale: +(((state && state.zoomScale) || 1) * 1.5).toFixed(2) });
    } },
    'zoom/out':   { emit: function (c, stream, state) {
        return stream.ephemeral('Streams/zoom', { scale: +(((state && state.zoomScale) || 1) / 1.5).toFixed(2) });
    } },
    'zoom/reset': { emit: function (c, stream) { return stream.ephemeral('Streams/zoom', { scale: 1 }); } },

    // -- scroll --------------------------------------------------------------
    'scroll/down':   { emit: function (c, stream) { return stream.ephemeral('Q/scroll', { top: '+' + SCROLL_STEP + '%' }); } },
    'scroll/up':     { emit: function (c, stream) { return stream.ephemeral('Q/scroll', { top: '-' + SCROLL_STEP + '%' }); } },
    'scroll/top':    { emit: function (c, stream) { return stream.ephemeral('Q/scroll', { top: '0%' }); } },
    'scroll/bottom': { emit: function (c, stream) { return stream.ephemeral('Q/scroll', { top: '100%' }); } },

    // -- reveal / fullscreen -------------------------------------------------
    'reveal/next': { emit: function (c, stream, state) {
        return stream.ephemeral('Streams/reveal', { revealIndex: ((state && state.revealIndex) || 0) + 1 });
    } },
    'fullscreen':  { emit: function (c, stream) { return stream.ephemeral('Q/fullscreen', {}); } }

});