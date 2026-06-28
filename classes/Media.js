"use strict";

/**
 * Media plugin node-side class.
 * @module Media
 */

var Q = require('Q');
var Streams = require('Streams');

function Media() {}
Media.WebRTC          = require('Media/WebRTC');
Media.RTMPMediaServer = require('RTMPMediaServer');
module.exports = Media;

/**
 * Start node-side listeners for the Media plugin.
 * Calls WebRTC.listen(). CommandsClassifier and ClipHandler are loaded
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

/**
 * Media registers its display commands — slide, video, gallery, zoom, scroll,
 * reveal, fullscreen, highlight — into the shared Streams.Commands registry.
 * These emitters used to be a hardcoded map inside the CommandsClassifier; the
 * classifier is now generic and reads behaviour (emit) and whole-text capture
 * rules (captures) from here. Require this once when the Media plugin starts
 * (e.g. from Media.js) so the registry is populated before the first transcript
 * arrives.
 *
 * Each emitter is fn(captures, stream, state, Q) and fires a stream ephemeral.
 * Output types stay plugin-agnostic (Streams/* and Q/*); Media simply owns the
 * vocabulary that maps a recognized phrase to one of them.
 */

var SCROLL_STEP = 20;

Streams.Commands.register({

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