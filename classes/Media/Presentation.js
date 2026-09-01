"use strict";
/*jshint node:true */
/**
 * Presentation class
 * @module Media
 * @main Media
 */
const Q = require('Q');
const fs = require('fs');
const path = require('path');

const Users = Q.require('Users');

const child_process = require('child_process');
const appDir = path.dirname(require.main.filename) + '/../../';
const appName =  Q.Config.get(['Q','app']);
// Lazily loaded after Q is ready to require plugins.
var Session, StreamsTranscript, Pipeline;
var transcriptEmitter = null;  // hoisted at first AI.listen() — Streams plugin must be loaded first


/**
 * Static methods for Presentation
 * @class Presentation
 * @static
 */
function Presentation() { }

/**
 * Start internal listener for Presentation
 * @method listen
 * @static
 * @param {Object} options={} 
 * @return {Users.Socket|null} The socket if connected, otherwise null
 */
Presentation.listen = function (options) {

    Session = require(Q.PLUGINS_DIR + '/Streams/classes/Streams/Transcript/Session');
    transcriptEmitter = require(Q.PLUGINS_DIR + '/Streams/classes/Streams/TranscriptEmitter').transcriptEmitter;
    StreamsTranscript = require(Q.PLUGINS_DIR + '/Streams/classes/Streams/Transcript');
    Pipeline = require(Q.PLUGINS_DIR + '/AI/classes/AI/Pipeline');
    
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

    // ── Subscribe to Streams ingestion (once) ──────────────────────────

    // Every final utterance: run the AI pipeline for non-control narration.
    StreamsTranscript.on('processed', function (session, result, Q, Users) {

       
    });

}


/* Presentation._navCommand = function (session, data) {
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
}; */

Presentation._postToolCommit = function (session, toolName) {
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
Presentation.handleNavigation = function (command, captures, stream, sessionState) {
    //console.log('presentation: command', command)
    var SCROLL_STEP = 20;
    var presentationState = Q.getObject(['entry', 'payload', 'state'], sessionState)
    if (command == 'slide/next') {
        var slideIndex = ((presentationState && presentationState.slideIndex) || 0) + 1;

        return postMessage('Media/presentation/slide', { slideIndex: slideIndex });
        //return stream.ephemeral('Streams/slide', { slideIndex: slideIndex });
    } else if (command == 'slide/prev') {
        var slideIndex = ((presentationState && presentationState.slideIndex) || 0) - 1;
         return postMessage('Media/presentation/slide', { slideIndex: slideIndex });
    } else if (command == 'slide/first') {
        return postMessage('Media/presentation/slide', { slideIndex: 0 });
    } else if (command == 'slide/last') {
         return postMessage('Media/presentation/slide', { slideIndex: 9999 });
    } else if (command == 'video/play') {
         return postMessage('Streams/play', { });
    } else if (command == 'video/pause') {
         return postMessage('Streams/pause', { });
    } else if (command == 'video/seek') {
        return stream.ephemeral('Streams/seek', {})
    } else if (command == 'scroll/down') {
        return postMessage('Q/scroll', { top: '+' + SCROLL_STEP + '%' })
    } else if (command == 'scroll/up') {
        return postMessage('Q/scroll', { top: '-' + SCROLL_STEP + '%' })
    } else if (command == 'scroll/top') {
        return postMessage('Q/scroll', { top: '0%' })
    } else if (command == 'scroll/bottom') {
        return postMessage('Q/scroll', { top: '100%' })
    }

    /* function postMessage(type, instructions) {
        return Session.postMessage(Q, {
            publisherId: sessionState.session.publisherId,
            streamName: sessionState.session.streamName,
            byUserId: sessionState.session.userId,
            type: type,
            instructions: JSON.stringify(instructions)
        });
    } */

    function postMessage(type, instructions, options) {
        options = options || {};

        instructions.voiceNavigation = true;
        Session.postEphemeral({
                publisherId: sessionState.session.publisherId,
                streamName: sessionState.session.streamName,
                asUserId: sessionState.session.userId,
                type: type,
                payload: instructions
            });

        // 2. Durable post — for state reconstruction on viewer mount
        if (options.persist === false) return;

        return Session.postMessage(Q, {
            publisherId: sessionState.session.publisherId,
            streamName: sessionState.session.streamName,
            byUserId: sessionState.session.userId,
            type: type,
            instructions: JSON.stringify(instructions)
        });
    }
}

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


Q.plugins.Streams.Commands.register({

    // -- slides --------------------------------------------------------------
    'slide/next': {
        emit: function (captures, stream, sessionState) {
            return Presentation.handleNavigation('slide/next', captures, stream, sessionState)
        }
    },
    'slide/prev': {
        emit: function (captures, stream, sessionState) {
            return Presentation.handleNavigation('slide/prev', captures, stream, sessionState)
        }
    },
    'slide/first': {
        emit: function (captures, stream, sessionState) {
            return Presentation.handleNavigation('slide/first', captures, stream, sessionState)
        }
    },
    'slide/last': {
        emit: function (captures, stream, sessionState) {
            return Presentation.handleNavigation('slide/last', captures, stream, sessionState)
        }
    },

    // -- video ---------------------------------------------------------------
    'video/play': {
        emit: function (captures, stream, sessionState) {
            return Presentation.handleNavigation('video/play', captures, stream, sessionState)
        }
    },
    'video/pause': {
        emit: function (captures, stream, sessionState) {
            return Presentation.handleNavigation('video/pause', captures, stream, sessionState)
        }
    },
    'video/seek': {
        captures: { pos: 'time' },
        emit: function (captures, stream, sessionState) {
            return c.pos != null ? Presentation.handleNavigation('video/seek', { pos: c.pos }, stream, sessionState) : null;
        }
    },
    'video/seek/relative': {
        captures: { rel: 'duration' },   // duration returns { delta, forward }
        emit: function (captures, stream, sessionState) {
            return captures.delta != null ? Presentation.handleNavigation('video/seek/relative', {
                pos: (captures.forward ? '+' : '-') + captures.delta
            }, stream, sessionState) : null;
        }
    },

    // -- gallery -------------------------------------------------------------
    'gallery/next': {
        emit: function (captures, stream, sessionState) {
            //return stream.ephemeral('Streams/gallery/next', {});
        }
    },
    'gallery/pause': {
        emit: function (captures, stream, sessionState) {
            //return stream.ephemeral('Streams/gallery/pause', {});
        }
    },
    'gallery/resume': {
        emit: function (captures, stream, sessionState) {
            //return stream.ephemeral('Streams/gallery/resume', {});
        }
    },
    'gallery/caption/remove': {
        emit: function (captures, stream, sessionState) {
            //return stream.ephemeral('Streams/gallery/caption', { remove: true });
        }
    },
    'gallery/remove': {
        emit: function (captures, stream, sessionState) {
            //return stream.ephemeral('Streams/gallery/remove', {});
        }
    },

    // -- highlight -----------------------------------------------------------
    'highlight': {
        captures: { elementId: 'ordinal' },
        emit: function (captures, stream, sessionState) {
            //return c.elementId && stream.ephemeral('Streams/highlight', { elementId: c.elementId });
        }
    },

    // -- zoom ----------------------------------------------------------------
    'zoom/in': {
        emit: function (captures, stream, sessionState){
            //return stream.ephemeral('Streams/zoom', { scale: +(((state && state.zoomScale) || 1) * 1.5).toFixed(2) });
        }
    },
    'zoom/out': {
        emit: function (captures, stream, sessionState) {
            //return stream.ephemeral('Streams/zoom', { scale: +(((state && state.zoomScale) || 1) / 1.5).toFixed(2) });
        }
    },
    'zoom/reset': {
        emit: function (captures, stream, sessionState) {
            //return stream.ephemeral('Streams/zoom', { scale: 1 });
        }
    },

    // -- scroll --------------------------------------------------------------
    'scroll/down': {
        emit: function (captures, stream, sessionState) {
            return Presentation.handleNavigation('scroll/down', captures, stream, sessionState);
        }
    },
    'scroll/up': {
        emit: function (captures, stream, sessionState) {
            return Presentation.handleNavigation('scroll/up', captures, stream, sessionState);
        }
    },
    'scroll/top': {
        emit: function (captures, stream, sessionState) {
            return Presentation.handleNavigation('scroll/top', captures, stream, sessionState);
        }
    },
    'scroll/bottom': {
        emit: function (captures, stream, sessionState) {
            return Presentation.handleNavigation('scroll/bottom', captures, stream, sessionState);
        }
    },

    // -- reveal / fullscreen -------------------------------------------------
    'reveal/next': {
        emit: function (c, stream, state) {
            //return stream.ephemeral('Streams/reveal', { revealIndex: ((state && state.revealIndex) || 0) + 1 });
        }
    },
    'fullscreen': {
        emit: function (captures, stream, sessionState) { 
            //return stream.ephemeral('Q/fullscreen', {}); 
        }
    }

}
);

Presentation.listen.options = {};

module.exports = Presentation;