(function (Q, $, window, undefined) {

/**
 * Media/presentation/client-classifier
 *
 * Client-side control classifier + PDF corpus builder.
 * Runs in the presenter's browser (control page or webrtc/chat).
 *
 * INTERCEPT FLOW
 * ──────────────
 * On each final transcript chunk, before emitting Streams/utterance to the server:
 *
 *   1. Test against control phrases (loaded from Q.text.Streams.controlPhrases)
 *   2. If exact navigation intent (next/prev/zoom/play/pause/seek/etc):
 *        → emit ephemeral directly on presentation stream (zero latency)
 *        → emit Media/presentation/command to server (for VTT + slideIndex sync)
 *        → return true (do NOT send Streams/utterance)
 *   3. If slide/navigate intent:
 *        → search local PDF corpus (pdfjs-dist text extraction, lazy per PDF)
 *        → if confident match: emit stream switch + Streams/slide, return true
 *        → if no match: fall through to server (Streams/utterance)
 *          server's slideNavigate.js then searches card/show messages + stream titles
 *   4. Not classified: return false → caller emits Streams/utterance normally
 *
 * PDF CORPUS
 * ──────────
 * Loaded lazily on first slide/navigate attempt.
 * Uses pdfjs-dist (already loaded by Q/pdf) — getTextContent() only, never render().
 * page.cleanup() + doc.destroy() release the PDF buffer after text extraction.
 * Only the trimmed page text strings are kept (~400 chars per page).
 *
 * USAGE (in control.js _connectAISocket or webrtc/chat.js _connectAISocket)
 * ─────
 *   Q.Speech.Recognition.onResult.set(function (chunk) {
 *       if (!chunk || !chunk.isFinal) return;
 *       var handled = tool._interceptor.intercept(chunk.transcript, stream, state);
 *       if (!handled) {
 *           _qEmit('Streams/utterance', { transcript: chunk.transcript, ... });
 *       }
 *   }, tool);
 *
 * @namespace Media.presentation
 */
Q.Media = Q.Media || {};
Q.Media.ClientClassifier = Q.Media.ClientClassifier || {};

/**
 * Create a client classifier instance tied to a presentation stream.
 *
 * @param {Object} options
 * @param {String} options.publisherId
 * @param {String} options.streamName
 * @param {Object} options.stream       Streams.Stream object with .ephemeral()
 * @param {Function} options.qEmit      fn(event, data) — the /Q socket emit
 * @param {Number} [options.slideIndex=0]
 * @param {Number} [options.revealIndex=0]
 * @param {Number} [options.zoomScale=1]
 * @param {Number} [options.sessionStartMs]
 */
Q.Media.ClientClassifier.create = function (options) {
    var publisherId    = options.publisherId;
    var streamName     = options.streamName;
    var stream         = options.stream;
    var qEmit          = options.qEmit;
    var sessionStartMs = options.sessionStartMs || Date.now();

    // Mutable state — updated as commands land
    var _slideIndex  = options.slideIndex  || 0;
    var _revealIndex = options.revealIndex || 0;
    var _zoomScale   = options.zoomScale   || 1;

    // PDF corpus: Map<publisherId:streamName → [{index, text}]>
    var _pdfCorpus   = {};
    var _pdfLoading  = {};  // promise cache so we don't double-load

    // Compiled patterns loaded lazily from Q.text.Streams.controlPhrases
    var _compiled    = null;

    // ── Pattern loading ───────────────────────────────────────────────────────

    function _loadPatterns() {
        if (_compiled) return _compiled;
        var raw = Q.getObject('text.Streams.controlPhrases') || {};
        var locale = Q.info && Q.info.language ? Q.info.language.split('-')[0] : 'en';
        var map = raw[locale] || raw['en'] || {};
        var compiled = [];
        Q.each(map, function (intent, phrases) {
            if (intent.charAt(0) === '_') return;
            Q.each(phrases, function (i, phrase) {
                if (typeof phrase === 'string'
                && phrase.charAt(0) === '/' && phrase.slice(-1) === '/') {
                    var rx = new RegExp(phrase.slice(1, -1), 'i');
                    compiled.push({ intent: intent, test: function (t) { return rx.test(t); } });
                } else {
                    (function (p) {
                        compiled.push({ intent: intent, test: function (t) { return t.indexOf(p) !== -1; } });
                    })(phrase);
                }
            });
        });
        _compiled = compiled;
        return compiled;
    }

    // ── Text matching ─────────────────────────────────────────────────────────

    function _match(text) {
        var patterns = _loadPatterns();
        var t = text.trim().toLowerCase();
        for (var i = 0; i < patterns.length; i++) {
            if (patterns[i].test(t)) {
                return { intent: patterns[i].intent, captures: _captures(patterns[i].intent, t) };
            }
        }
        return null;
    }

    function _captures(intent, text) {
        if (intent === 'video/seek') {
            return { pos: _extractTime(text) };
        }
        if (intent === 'video/seek/relative') {
            return _extractRelativeTime(text);
        }
        if (intent === 'slide/navigate') {
            return { query: _extractQuery(text) };
        }
        return {};
    }

    // ── Ephemeral emit ────────────────────────────────────────────────────────

    function _emitEphemeral(intent, captures) {
        if (!stream) return false;
        var SCROLL = 20;
        var map = {
            'slide/next':          function () { stream.ephemeral('Streams/slide', { slideIndex: ++_slideIndex }); },
            'slide/prev':          function () { _slideIndex = Math.max(0, _slideIndex - 1); stream.ephemeral('Streams/slide', { slideIndex: _slideIndex }); },
            'slide/first':         function () { _slideIndex = 0; stream.ephemeral('Streams/slide', { slideIndex: 0 }); },
            'slide/last':          function () { stream.ephemeral('Streams/slide', { slideIndex: 9999 }); },
            'video/play':          function () { stream.ephemeral('Streams/play', {}); },
            'video/pause':         function () { stream.ephemeral('Streams/pause', {}); },
            'video/seek':          function () { captures.pos != null && stream.ephemeral('Streams/seek', { pos: captures.pos }); },
            'video/seek/relative': function () { captures.delta != null && stream.ephemeral('Streams/seek', { pos: (captures.forward ? '+' : '-') + captures.delta }); },
            'gallery/next':        function () { stream.ephemeral('Streams/gallery/next', {}); },
            'gallery/pause':       function () { stream.ephemeral('Streams/gallery/pause', {}); },
            'gallery/resume':      function () { stream.ephemeral('Streams/gallery/resume', {}); },
            'zoom/in':             function () { _zoomScale = +(_zoomScale * 1.5).toFixed(2); stream.ephemeral('Streams/zoom', { scale: _zoomScale }); },
            'zoom/out':            function () { _zoomScale = +(_zoomScale / 1.5).toFixed(2); stream.ephemeral('Streams/zoom', { scale: _zoomScale }); },
            'zoom/reset':          function () { _zoomScale = 1; stream.ephemeral('Streams/zoom', { scale: 1 }); },
            'scroll/down':         function () { stream.ephemeral('Q/scroll', { top: '+' + SCROLL + '%' }); },
            'scroll/up':           function () { stream.ephemeral('Q/scroll', { top: '-' + SCROLL + '%' }); },
            'scroll/top':          function () { stream.ephemeral('Q/scroll', { top: '0%' }); },
            'scroll/bottom':       function () { stream.ephemeral('Q/scroll', { top: '100%' }); },
            'reveal/next':         function () { stream.ephemeral('Streams/reveal', { revealIndex: ++_revealIndex }); },
            'fullscreen':          function () { stream.ephemeral('Q/fullscreen', {}); },
        };
        if (map[intent]) { map[intent](); return true; }
        return false;
    }

    // ── Server sync ───────────────────────────────────────────────────────────

    function _syncServer(intent, captures, extra) {
        var relSec = ((Date.now() - sessionStartMs) / 1000).toFixed(1);
        qEmit('Media/presentation/command', Q.extend({
            intent:      intent,
            slideIndex:  _slideIndex,
            publisherId: publisherId,
            streamName:  streamName,
            relSec:      relSec
        }, captures || {}, extra || {}));
    }

    // ── PDF corpus ────────────────────────────────────────────────────────────

    function _pdfKey(pub, name) { return pub + ':' + name; }

    function _loadPdfCorpus(pub, name, url) {
        var key = _pdfKey(pub, name);
        if (_pdfCorpus[key]) return Promise.resolve(_pdfCorpus[key]);
        if (_pdfLoading[key]) return _pdfLoading[key];

        var pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib
            || (window.Q && Q.getObject('PDF.lib'));
        if (!pdfjsLib || !pdfjsLib.getDocument) {
            return Promise.resolve([]);
        }

        var promise = pdfjsLib.getDocument({ url: url }).promise.then(function (doc) {
            var numPages = doc.numPages;
            var pages = [];
            var chain = Promise.resolve();
            for (var i = 1; i <= numPages; i++) {
                (function (pageNum) {
                    chain = chain.then(function () {
                        return doc.getPage(pageNum).then(function (page) {
                            return page.getTextContent().then(function (content) {
                                var text = content.items
                                    .map(function (item) { return item.str; })
                                    .join(' ')
                                    .replace(/\s+/g, ' ')
                                    .trim()
                                    .slice(0, 400);
                                pages.push({ index: pageNum - 1, text: text.toLowerCase() });
                                page.cleanup();
                            });
                        });
                    });
                })(i);
            }
            return chain.then(function () {
                doc.destroy();
                _pdfCorpus[key] = pages;
                delete _pdfLoading[key];
                return pages;
            });
        }).catch(function () {
            delete _pdfLoading[key];
            return [];
        });

        _pdfLoading[key] = promise;
        return promise;
    }

    function _loadAllPdfCorpora() {
        return new Promise(function (resolve) {
            Q.Streams.related(
                Q.Users.loggedInUserId(),
                publisherId,
                streamName,
                function (err, result) {
                    if (err || !result || !result.streams) return resolve();
                    var promises = [];
                    Q.each(result.streams, function (i, s) {
                        if (s.fields && s.fields.type === 'Media/pdf') {
                            var url = s.fileUrl ? s.fileUrl() : null;
                            if (url) {
                                promises.push(_loadPdfCorpus(
                                    s.fields.publisherId,
                                    s.fields.name,
                                    url
                                ));
                            }
                        }
                    });
                    Promise.all(promises).then(function () { resolve(); });
                }
            );
        });
    }

    // ── PDF search ────────────────────────────────────────────────────────────

    function _searchPdfCorpora(query) {
        var q = query.toLowerCase().trim();
        var best = null;
        var bestScore = Infinity;
        var threshold = Math.max(3, Math.floor(q.length * 0.45));

        Q.each(_pdfCorpus, function (key, pages) {
            var parts = key.split(':');
            var pub  = parts[0];
            var name = parts.slice(1).join(':');
            pages.forEach(function (p) {
                var score = _matchScore(q, p.text);
                if (score < bestScore) {
                    bestScore = score;
                    best = { publisherId: pub, streamName: name, pageIndex: p.index, score: score };
                }
            });
        });

        if (best && bestScore <= threshold) return best;
        return null;
    }

    // ── slide/navigate handler ────────────────────────────────────────────────

    function _handleNavigate(query) {
        // Check if corpora are loaded; if not, kick off load then try server fallback
        var hasCorpus = Object.keys(_pdfCorpus).length > 0;
        var isLoading = Object.keys(_pdfLoading).length > 0;

        if (!hasCorpus && !isLoading) {
            // First navigate attempt: load corpora then re-try
            _loadAllPdfCorpora().then(function () {
                var match = _searchPdfCorpora(query);
                if (match) {
                    _navigateToPdfPage(match, query);
                } else {
                    // No local match — fall through to server
                    _sendToServer(query);
                }
            });
            // While loading: optimistically send to server now (race)
            _sendToServer(query);
            return true; // handled (we're managing it asynchronously)
        }

        if (isLoading) {
            // Corpora still loading — send to server
            _sendToServer(query);
            return true;
        }

        // Corpora loaded — search locally
        var match = _searchPdfCorpora(query);
        if (match) {
            _navigateToPdfPage(match, query);
            return true;
        }

        // No match in PDFs — let server try card messages + stream titles
        return false;
    }

    function _navigateToPdfPage(match, query) {
        // Switch to the PDF stream if not already shown
        if (stream) {
            stream.ephemeral('Media/presentation/show', {
                publisherId: match.publisherId,
                streamName:  match.streamName,
                streamType:  'Media/pdf'
            });
            // Then navigate to the page
            setTimeout(function () {
                stream.ephemeral('Streams/slide', { slideIndex: match.pageIndex });
                _slideIndex = match.pageIndex;
            }, 120); // small delay so presentation tool activates the PDF first
        }
        _syncServer('slide/navigate', {
            slideIndex:         match.pageIndex,
            pdfPublisherId:     match.publisherId,
            pdfStreamName:      match.streamName,
            query:              query
        });
    }

    function _sendToServer(query) {
        qEmit('Streams/utterance', {
            transcript: query,
            isFinal:    true,
            confidence: 0.9,
            speaker:    Q.Users.loggedInUserId(),
            intent:     'slide/navigate'  // hint to server
        });
    }

    // ── Public API ────────────────────────────────────────────────────────────

    return {

        /**
         * Intercept a final transcript before sending to server.
         * Returns true if handled locally (caller should NOT emit Streams/utterance).
         * Returns false if not handled (caller should emit Streams/utterance).
         *
         * @param {String} text
         * @return {Boolean}
         */
        intercept: function (text) {
            var m = _match(text);
            if (!m) return false;

            var intent   = m.intent;
            var captures = m.captures;

            // slide/navigate is async — handled separately
            if (intent === 'slide/navigate') {
                var query = captures.query;
                if (!query) return false;
                return _handleNavigate(query);
            }

            // All other intents: emit ephemeral directly, sync server
            var emitted = _emitEphemeral(intent, captures);
            if (emitted) {
                _syncServer(intent, captures);
                return true;
            }

            // Image/tool generation and stream commands: let server handle
            // (they need LLM or DB access)
            return false;
        },

        /**
         * Update state from server sync or external navigation.
         */
        setState: function (s) {
            if (s.slideIndex  != null) _slideIndex  = s.slideIndex;
            if (s.revealIndex != null) _revealIndex = s.revealIndex;
            if (s.zoomScale   != null) _zoomScale   = s.zoomScale;
        },

        /**
         * Pre-load PDF corpora. Call when session starts if you want
         * first navigate to be fast. Otherwise loading is lazy.
         */
        preloadPdfs: function () {
            return _loadAllPdfCorpora();
        }
    };
};

// ── String helpers ────────────────────────────────────────────────────────────

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
    var prev = [], curr = [];
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

function _extractTime(text) {
    var colonMatch = text.match(/(\d+):(\d+)(?::(\d+))?/);
    if (colonMatch) {
        var a = +colonMatch[1], b = +colonMatch[2], c = colonMatch[3] != null ? +colonMatch[3] : null;
        return c != null ? a*3600 + b*60 + c : a*60 + b;
    }
    var words = { zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,
        eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,
        fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,
        twenty:20,thirty:30,forty:40,fifty:50 };
    var toNum = function (s) { var n = parseFloat(s); return isNaN(n) ? (words[s] != null ? words[s] : null) : n; };
    var total = 0;
    var hm = text.match(/(\w+)\s+hours?/),  mm = text.match(/(\w+)\s+minutes?/), sm = text.match(/(\w+)\s+seconds?/);
    if (hm) { var v = toNum(hm[1]); if (v != null) total += v * 3600; }
    if (mm) { var v2 = toNum(mm[1]); if (v2 != null) total += v2 * 60; }
    if (sm) { var v3 = toNum(sm[1]); if (v3 != null) total += v3; }
    return total > 0 ? total : null;
}

function _extractRelativeTime(text) {
    var t = _extractTime(text);
    return { delta: t, forward: /\b(forward|ahead|skip forward|fast forward)\b/i.test(text) };
}

function _extractQuery(text) {
    return text
        .replace(/^(go to|show me|find|jump to|navigate to|take me to|open the|show the|find the|go to the)\s+/i, '')
        .replace(/\s+(slide|card|page|section|part)\s*$/i, '')
        .trim() || null;
}

})(Q, Q.jQuery, window);
