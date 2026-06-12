'use strict';
/**
 * Media/handlers/Media/commands/slideNavigate.js
 *
 * Server-side fallback for slide/navigate intent. Runs when the client's
 * offline classifier can't resolve the navigation locally (it handles
 * exact intents and local PDF text search; this handles semantic search
 * across past cards and related streams using server-side data).
 *
 * Dispatched by Media's ControlClassifier via the Media/commands/*
 * lookup path. Replaces the older AI-owned version at
 * AI/handlers/AI/commands/slideNavigate.js (which can be deleted once
 * this is in place — both can coexist during migration; the
 * Media-owned lookup wins).
 *
 * Search order:
 *   1. Recent Media/presentation/card/show messages (last 200) — matches
 *      against visualizationData text. On match: emits AI/card/replay
 *      directly to the user so the historical card reappears on canvas.
 *
 *   2. Related streams — matches against stream title + key attributes.
 *      On match: posts a durable Media/presentation/slide message and
 *      writes a VTT cue. Clients listening via onMessage advance.
 *
 *   3. No match: silent.
 *
 * @module Media
 */

module.exports = async function slideNavigate(captures, stream, state, Q) {
    var query = (captures && captures.query) ? captures.query.toLowerCase().trim() : '';
    if (!query || !state || !state.publisherId || !state.streamName) return;

    var Users = state.Users;

    try {
        var Str = Q.require('Streams');
        if (!Str) return;

        // ── 1. Search recent card/show messages ───────────────────────────────
        var cardMatch = await _searchCardMessages(query, state, Str, Q);
        if (cardMatch) {
            Q.log && Q.log('Media/slideNavigate: card match "' + query + '" → ' +
                cardMatch.visualizationType + ' "' + _cardSummary(cardMatch.visualizationData) + '"');
            Users && Users.Socket.emitToUser(state.userId, 'AI/card/replay', {
                visualizationType: cardMatch.visualizationType,
                visualizationData: cardMatch.visualizationData,
                streamType:        cardMatch.streamType
            });
            return;
        }

        // ── 2. Search related streams ─────────────────────────────────────────
        if (!Str.related) return;
        var rows = await new Promise(function (resolve, reject) {
            Str.related(
                state.userId || '',
                state.publisherId,
                state.streamName,
                { limit: 200 },
                function (err, result) {
                    if (err) return reject(err);
                    resolve((result && result.streams) || []);
                }
            );
        });

        if (!rows || !rows.length) {
            Q.log && Q.log('Media/slideNavigate: no related streams, no card match for "' + query + '"');
            return;
        }

        var candidates = rows.map(function (s, idx) {
            var attrs = s.getAllAttributes ? s.getAllAttributes() : (s.attributes || {});
            var text = [
                s.fields && s.fields.title,
                attrs.term,
                attrs.label,
                attrs.name,
                attrs.keyClaim,
                attrs.definition && attrs.definition.slice(0, 100),
                attrs.quote      && attrs.quote.slice(0, 80),
            ].filter(Boolean).join(' ').toLowerCase();
            return { index: idx, text: text, stream: s };
        });

        var best = null, bestScore = Infinity;
        candidates.forEach(function (c) {
            var score = _matchScore(query, c.text);
            if (score < bestScore) { bestScore = score; best = c; }
        });

        var threshold = Math.max(3, Math.floor(query.length * 0.45));
        if (best && bestScore <= threshold) {
            Q.log && Q.log('Media/slideNavigate: stream match "' + query + '" → index ' +
                best.index + ' "' + (best.stream.fields && best.stream.fields.title) + '"' +
                ' (score=' + bestScore + ')');
            _postSlideRecord(state, best.index, query, Str, Q);
        } else {
            Q.log && Q.log('Media/slideNavigate: no match for "' + query +
                '" (best score=' + bestScore + ')');
        }

    } catch (e) {
        Q.log && Q.log('Media/slideNavigate error:', e.message);
    }
};

// ── Durable slide record ──────────────────────────────────────────────────────

function _postSlideRecord(state, slideIndex, query, Str, Q) {
    // state.session is the full AI Session (Transcript.js passes it through
    // classifyState). If available, we can compute relSec and ask the
    // session's transcript emitter to write a VTT NOTE that pairs with
    // the durable message. If not, skip the cue; the durable message
    // stands as the canonical record on its own.
    var session = state.session || null;
    var relSec  = session && session.sessionStartMs
        ? ((Date.now() - session.sessionStartMs) / 1000).toFixed(1)
        : null;

    var instrObj = {
        index:  slideIndex,
        intent: 'slide/navigate',
        query:  query || undefined
    };
    if (relSec != null) instrObj.relSec = relSec;
    var instr = JSON.stringify(instrObj);

    Str.Message.post({
        publisherId:  state.publisherId,
        streamName:   state.streamName,
        byUserId:     state.userId,
        type:         'Media/presentation/slide',
        instructions: instr,
        weight:       1
    }, function (err, message) {
        if (err) {
            Q.log && Q.log('Media/slideNavigate: postMessage error', err.message || err);
            return;
        }
        if (state.slideIndex !== undefined) state.slideIndex = slideIndex;

        // Optional VTT cue write — only if a full session is in scope.
        if (!session || !message) return;
        try {
            var TranscriptEmitterMod = Q.require('Streams/TranscriptEmitter');
            var emitter = TranscriptEmitterMod && TranscriptEmitterMod.transcriptEmitter;
            if (emitter && emitter._appendVttEventNote) {
                emitter._appendVttEventNote(
                    session,
                    'Media/presentation/slide',
                    message.fields.ordinal,
                    instr,
                    Q,
                    message.fields.sentTime
                );
            }
        } catch (e) {
            // Streams plugin not loaded with the helper — drop the cue,
            // keep the durable record. Non-fatal.
        }
    });
}

// ── Card message search ───────────────────────────────────────────────────────

async function _searchCardMessages(query, state, Str, Q) {
    var messages = await new Promise(function (resolve) {
        Str.Message.get(
            state.publisherId,
            state.streamName,
            {
                type:  'Media/presentation/card/show',
                limit: 200,
            },
            function (err, msgs) {
                resolve((!err && msgs) ? msgs : {});
            }
        );
    });

    var best = null, bestScore = Infinity;
    var threshold = Math.max(3, Math.floor(query.length * 0.45));

    Q.each(messages, function (ordinal, message) {
        var instr = {};
        try { instr = JSON.parse(message.fields ? message.fields.instructions : message.instructions || '{}'); } catch (e) {}
        var data = instr.visualizationData || {};
        var text = _cardText(data).toLowerCase();
        if (!text) return;
        var score = _matchScore(query, text);
        if (score < bestScore) {
            bestScore = score;
            best = {
                visualizationType: instr.visualizationType,
                visualizationData: data,
                streamType:        instr.streamType,
                score:             score
            };
        }
    });

    return (best && bestScore <= threshold) ? best : null;
}

function _cardText(data) {
    return [
        data.label,
        data.term,
        data.title,
        data.name,
        data.keyClaim,
        data.speaker,
        data.publication,
        data.quote      && data.quote.slice(0, 80),
        data.definition && data.definition.slice(0, 80),
        data.left  && data.left.label,
        data.right && data.right.label,
        data.credit,
    ].filter(Boolean).join(' ');
}

function _cardSummary(data) {
    return data.label || data.term || data.title || data.name || data.speaker || '';
}

// ── Levenshtein ───────────────────────────────────────────────────────────────

function _matchScore(query, haystack) {
    if (!query || !haystack) return Infinity;
    if (haystack.indexOf(query) !== -1) return 0;
    var ql = query.length, hl = haystack.length;
    if (ql > hl) return _levenshtein(query, haystack);
    var best = Infinity;
    var step = Math.max(1, Math.floor(ql / 3));
    for (var i = 0; i <= hl - ql; i += step) {
        var d = _levenshtein(query, haystack.slice(i, i + ql));
        if (d < best) best = d;
        if (d === 0) return 0;
    }
    return best;
}

function _levenshtein(a, b) {
    var m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    var prev = new Array(n+1), curr = new Array(n+1);
    for (var j = 0; j <= n; j++) prev[j] = j;
    for (var i = 1; i <= m; i++) {
        curr[0] = i;
        for (var jj = 1; jj <= n; jj++) {
            curr[jj] = a[i-1] === b[jj-1]
                ? prev[jj-1]
                : 1 + Math.min(prev[jj-1], prev[jj], curr[jj-1]);
        }
        var tmp = prev; prev = curr; curr = tmp;
    }
    return prev[n];
}
