"use strict";

/**
 * Media/handlers/Media/clipHandler.js
 *
 * Example plugin handler — subscribes to TranscriptEmitter events and
 * cuts clips from the active livestream recording when the topic shifts.
 *
 * REGISTER IN YOUR NODE BOOTSTRAP:
 *   require('./plugins/Media/handlers/Media/clipHandler').register(Q);
 *
 * Only cuts clips when the session is a Safebox-owned livestream recording.
 * For ingested external videos, use the separate diarization/ingest pipeline
 * (Grokers) which reconstructs timeframes from a completed recording.
 * That's a different flow — this handler is for live incremental building only.
 *
 * CLIP CUT TRIGGER:
 *   topic_change event → wait CLIP_DEBOUNCE_MS → if no further topic change
 *   in that window, commit the cut at the boundary timestamp.
 *   The debounce prevents micro-cuts from rapid topic oscillation.
 *
 * WHAT IT DOES ON CUT:
 *   1. Logs the cut boundary to the transcript .jsonl file (already done
 *      by the built-in topic_change handler in socket.js)
 *   2. Emits 'clipCut' on transcriptEmitter so other plugins can react
 *      (index the clip, post to feed, notify Grokers, etc.)
 *   3. In production: calls Q.Streams.create('Media/clip', ...) to create
 *      the clip stream with start/end timestamps. Stubbed here.
 */

const { transcriptEmitter } = require('../../../Streams/classes/Streams/TranscriptEmitter');

const CLIP_DEBOUNCE_MS = 8000; // wait 8s after topic shift before committing cut

function register(Q) {
    const pendingCuts = new Map(); // sessionId → { timer, evt }

    transcriptEmitter.on('topicChange', function (evt) {
        // Only cut clips from sessions that are recording our own livestream.
        // isOwnLivestream is set by AI/transcription/session/start when the client passes
        // { isOwnLivestream: true } — the control page sets this when it
        // detects the presentation has an active Safebox livestream recording.
        if (!evt.isOwnLivestream) return;

        const sessionId = evt.sessionId;

        // Debounce — cancel any pending cut for this session
        const pending = pendingCuts.get(sessionId);
        if (pending) {
            clearTimeout(pending.timer);
        }

        // Schedule the cut
        const timer = setTimeout(function () {
            pendingCuts.delete(sessionId);
            _commitCut(evt, Q);
        }, CLIP_DEBOUNCE_MS);

        pendingCuts.set(sessionId, { timer, evt });
    });

    // Clean up on session end
    transcriptEmitter.on('sessionEnd', function (evt) {
        const pending = pendingCuts.get(evt.sessionId);
        if (pending) {
            clearTimeout(pending.timer);
            pendingCuts.delete(evt.sessionId);
        }
        // Optionally: trigger Grokers ingest on the completed transcript file
        if (evt.transcriptFile) {
            Q.log && Q.log('ClipHandler: session ended, transcript at', evt.transcriptFile);
            // grokers.ingestTranscriptFile(evt.transcriptFile, evt.streamName);
        }
    });

    Q.log && Q.log('ClipHandler: registered on transcriptEmitter');
}

function _commitCut(evt, Q) {
    Q.log && Q.log('ClipHandler: cutting clip at relSec', evt.relSec,
                   'topic:', evt.from, '->', evt.to);

    // Emit clip_cut so other plugins can react (search indexer, feed poster, etc.)
    transcriptEmitter.emit('clipCut', {
        sessionId:  evt.sessionId,
        publisherId: evt.publisherId,
        streamName: evt.streamName,
        reason:     'topicChange',
        topic:      evt.to,
        fromTopic:  evt.from,
        atRelSec:   evt.relSec,
        ts:         evt.ts,
    });

    // TODO production: create Media/clip stream via Q.Streams.create
    // Q.Streams.create('Media/clip', evt.publisherId, {
    //     title: evt.to,
    //     attributes: {
    //         startRelSec: previousCutRelSec,
    //         endRelSec:   evt.relSec,
    //         topic:       evt.to,
    //         sourceStream: evt.streamName,
    //     }
    // }, function (err, stream) { ... });
}

module.exports = { register };
