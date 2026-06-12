"use strict";

/**
 * Media/classes/Media/ControlClassifier.js
 *
 * Zero-latency, zero-cost control classifier.
 * Runs BEFORE the LLM pipeline on every transcript chunk.
 * On a match, emits the appropriate ephemeral directly and returns true,
 * so the caller can skip the expensive LLM path entirely.
 *
 * Pattern data lives in Media/text/Media/commands/{locale}.json — the
 * same file the control tool uses for button labels. Edit the `patterns`
 * key there to add phrases, fix false positives, or add new locales.
 * No code change needed.
 *
 * Usage in AI/socket.js:
 *   const ControlClassifier = require('../../Media/classes/Media/ControlClassifier');
 *   const classifier = new ControlClassifier({ locale: 'en', Q });
 *   // on each final transcript chunk:
 *   const handled = classifier.classify(text, stream, currentState);
 *   if (handled) return; // skip LLM
 *
 * @module Media
 * @class ControlClassifier
 */

const path = require('path');
const fs   = require('fs');

class ControlClassifier {

    /**
     * @param {Object} [options]
     * @param {String} [options.locale='en']   BCP-47 language tag, e.g. 'en', 'es', 'he'
     * @param {String} [options.dataFile]      Override path to pattern file
     * @param {Object} [options.Q]             Q server object for logging
     */
    constructor(options = {}) {
        this.locale        = options.locale   || 'en';
        this.Q             = options.Q        || null;
        this.dataFile      = options.dataFile || null;
        // We are inside Media — text dir is two levels up from Media/classes/Media/
        this._textDir      = path.join(__dirname, '../../text/Media/commands');
        this._patterns     = null; // loaded lazily
    }

    // ── Public ────────────────────────────────────────────────────────────────

    /**
     * Test a transcript chunk against control patterns.
     * Returns true and emits ephemeral(s) if a match is found.
     * Returns false if no match — caller should proceed to LLM pipeline.
     *
     * @param {String}         text         Final transcript text (single utterance)
     * @param {Streams_Stream} stream       The presentation or session stream
     * @param {Object}         state        Current presentation state
     *   @param {Number}  state.slideIndex  Current slide index
     *   @param {Number}  state.revealIndex Current reveal index
     *   @param {Number}  state.zoomScale   Current zoom scale (default 1)
     * @return {Boolean} true if handled
     */
    classify(text, stream, state) {
        const patterns = this._load();
        const t = text.trim().toLowerCase();
        if (!t) return false;

        const match = this._match(t, patterns);
        if (!match) return false;

        return this._emit(match.intent, match.captures, stream, state);
    }

    /**
     * Reload patterns from disk. Call after editing the text file
     * to pick up changes without restarting Node.
     */
    reload() {
        this._patterns = null;
        this._load();
    }

    // ── Private ───────────────────────────────────────────────────────────────

    /**
     * Build the ordered list of file paths to try for pattern data.
     * Since we are inside the Media plugin, the text directory is known
     * directly — no filesystem walk or env var lookup needed.
     * @private
     */
    _resolveCandidates() {
        const locale   = this.locale;
        const fallback = 'en';
        const candidates = [];

        // 1. Explicit override from constructor
        if (this.dataFile) {
            candidates.push(this.dataFile);
            if (locale !== fallback) {
                candidates.push(path.join(this._textDir, fallback + '.json'));
            }
            return candidates;
        }

        // 2. Media text directory — we are inside Media, so this is always available
        candidates.push(path.join(this._textDir, locale + '.json'));
        if (locale !== fallback) {
            candidates.push(path.join(this._textDir, fallback + '.json'));
        }

        return candidates;
    }

    _load() {
        if (this._patterns) return this._patterns;
        let raw;
        const candidates = this._resolveCandidates();
        let loaded = false;
        for (const filePath of candidates) {
            try {
                raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                loaded = true;
                break;
            } catch (e) {
                // try next candidate
            }
        }
        if (!loaded) {
            throw new Error('ControlClassifier: no pattern file found in: ' + candidates.join(', '));
        }

        // Detect file format:
        //   Locale-keyed:  { en: { 'slide/next': ['phrase',...], ... }, es: {...} }
        //   Media commands: { patterns: { SlideNext: ['phrase',...] } }
        //   Raw:            { 'slide/next': ['phrase',...], ... }
        let patternMap;
        if (raw[this.locale]) {
            patternMap = raw[this.locale];
        } else if (raw['en']) {
            patternMap = raw['en'];
        } else if (raw.patterns) {
            // Media/commands format: { patterns: { SlideNext: [...] } }
            const keyToIntent = {
                SlideNext: 'slide/next', SlidePrev: 'slide/prev',
                SlideFirst: 'slide/first', SlideLast: 'slide/last',
                VideoPlay: 'video/play', VideoPause: 'video/pause', VideoSeek: 'video/seek',
                GalleryNext: 'gallery/next', GalleryPause: 'gallery/pause',
                GalleryResume: 'gallery/resume',
                Highlight: 'highlight',
                ZoomIn: 'zoom/in', ZoomOut: 'zoom/out', ZoomReset: 'zoom/reset',
                ScrollDown: 'scroll/down', ScrollUp: 'scroll/up',
                ScrollTop: 'scroll/top', ScrollBottom: 'scroll/bottom',
                RevealNext: 'reveal/next', Fullscreen: 'fullscreen'
            };
            const remapped = {};
            for (const [k, v] of Object.entries(raw.patterns)) {
                remapped[keyToIntent[k] || k] = v;
            }
            patternMap = remapped;
        } else {
            patternMap = raw;
        }

        const compiled = [];
        for (const [key, phrases] of Object.entries(patternMap)) {
            if (key.startsWith('_')) continue; // skip metadata keys
            for (const phrase of phrases) {
                if (typeof phrase === 'string' && phrase.startsWith('/') && phrase.endsWith('/')) {
                    const rx = new RegExp(phrase.slice(1, -1), 'i');
                    compiled.push({ intent: key, test: t => rx.test(t), regex: rx });
                } else {
                    compiled.push({ intent: key, test: t => t.includes(phrase) });
                }
            }
        }
        this._patterns = compiled;
        return compiled;
    }

    _match(text, patterns) {
        for (const p of patterns) {
            if (p.test(text)) {
                return { intent: p.intent, captures: this._captures(p.intent, text) };
            }
        }
        return null;
    }

    /**
     * Extract secondary data from the utterance for intents that need it.
     */
    _captures(intent, text) {
        if (intent === 'video/seek') {
            return { pos: _extractTime(text) };
        }
        if (intent === 'highlight') {
            return { elementId: _extractTarget(text) };
        }
        if (intent === 'image/generate' || intent === 'tool/generate') {
            return { prompt: _extractPrompt(intent, text) };
        }
        if (intent === 'stream/grantAccess' || intent === 'stream/revokeAccess') {
            return {
                name:       _extractPersonName(text),
                writeLevel: _extractWriteLevel(text)
            };
        }
        if (intent === 'stream/create') {
            return { prompt: _extractPrompt(intent, text) };
        }
        return {};
    }

    /**
     * Emit the appropriate ephemeral on the stream given an intent.
     * Returns true if handled, false if intent unknown.
     */
    _emit(intent, captures, stream, state) {
        const si = (state && state.slideIndex)  || 0;
        const ri = (state && state.revealIndex) || 0;
        const zs = (state && state.zoomScale)   || 1;
        const SCROLL_STEP = 20;

        const map = {
            'slide/next':     () => stream.ephemeral('Streams/slide',          { slideIndex: si + 1 }),
            'slide/prev':     () => stream.ephemeral('Streams/slide',          { slideIndex: Math.max(0, si - 1) }),
            'slide/first':    () => stream.ephemeral('Streams/slide',          { slideIndex: 0 }),
            'slide/last':     () => stream.ephemeral('Streams/slide',          { slideIndex: 9999 }),
            'video/play':     () => stream.ephemeral('Streams/play',           {}),
            'video/pause':    () => stream.ephemeral('Streams/pause',          {}),
            'video/seek':     () => captures.pos != null && stream.ephemeral('Streams/seek', { pos: captures.pos }),
            'gallery/next':           () => stream.ephemeral('Streams/gallery/next',    {}),
            'gallery/pause':          () => stream.ephemeral('Streams/gallery/pause',   {}),
            'gallery/resume':         () => stream.ephemeral('Streams/gallery/resume',  {}),
            'gallery/caption/remove': () => stream.ephemeral('Streams/gallery/caption', { remove: true }),
            'gallery/remove':         () => stream.ephemeral('Streams/gallery/remove',  {}),
            'highlight':      () => captures.elementId && stream.ephemeral('Streams/highlight', { elementId: captures.elementId }),
            'zoom/in':        () => stream.ephemeral('Streams/zoom',           { scale: +(zs * 1.5).toFixed(2) }),
            'zoom/out':       () => stream.ephemeral('Streams/zoom',           { scale: +(zs / 1.5).toFixed(2) }),
            'zoom/reset':     () => stream.ephemeral('Streams/zoom',           { scale: 1 }),
            'scroll/down':    () => stream.ephemeral('Q/scroll',               { top: `+${SCROLL_STEP}%` }),
            'scroll/up':      () => stream.ephemeral('Q/scroll',               { top: `-${SCROLL_STEP}%` }),
            'scroll/top':     () => stream.ephemeral('Q/scroll',               { top: '0%' }),
            'scroll/bottom':  () => stream.ephemeral('Q/scroll',               { top: '100%' }),
            'reveal/next':    () => stream.ephemeral('Streams/reveal',         { revealIndex: ri + 1 }),
            'fullscreen':     () => stream.ephemeral('Q/fullscreen',           {}),
        };

        const handler = map[intent];
        if (handler) {
            handler();
            this._log(`classified: "${intent}"`, captures);
            return true;
        }

        // Fall through to Q.handlers for plugin-defined commands.
        // Look up under Media/commands first (Media owns these by design —
        // slide search, presentation navigation, etc.) and fall back to
        // AI/commands for legacy registrations from before the split.
        if (this.Q) {
            const handlerPath = this.Q.Config && (
                   this.Q.Config.get(['Media', 'commands', intent, 'handler'], null)
                || this.Q.Config.get(['AI',    'commands', intent, 'handler'], null)
            );
            if (handlerPath && this.Q.handlers) {
                const parts = handlerPath.replace(/\//g, '.').split('.');
                let fn = this.Q.handlers;
                for (const p of parts) fn = fn && fn[p];
                if (typeof fn === 'function') {
                    this._log(`dispatching to handler: "${handlerPath}"`, captures);
                    if (intent.startsWith('stream/')) {
                        fn({
                            command:         intent.replace('stream/', ''),
                            userId:          state.userId,
                            publisherId:     state.publisherId,
                            streamName:      state.streamName,
                            chatPublisherId: state.userId,
                            chatStreamName:  state.toolStreamName,
                            targetName:      captures.name || '',
                            targetUserId:    captures.targetUserId || '',
                            writeLevel:      captures.writeLevel || 'post',
                            toolTitle:       captures.prompt || 'Tool',
                        }, this.Q, state.Users);
                    } else {
                        fn(captures, stream, state, this.Q);
                    }
                    return true;
                }
            }
        }

        return false;
    }

    _log(msg, data) {
        if (this.Q) {
            this.Q.log('ControlClassifier', msg, data || '');
        } else {
            console.log('[ControlClassifier]', msg, data || '');
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _extractTime(text) {
    const colonMatch = text.match(/(\d+):(\d+)(?::(\d+))?/);
    if (colonMatch) {
        const [, a, b, c] = colonMatch;
        return c != null
            ? parseInt(a) * 3600 + parseInt(b) * 60 + parseInt(c)
            : parseInt(a) * 60  + parseInt(b);
    }
    const words = {
        zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7,
        eight:8, nine:9, ten:10, eleven:11, twelve:12, thirteen:13,
        fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18,
        nineteen:19, twenty:20, thirty:30, forty:40, fifty:50
    };
    const toNum = s => { const n = parseFloat(s); if (!isNaN(n)) return n; return words[s.toLowerCase()] ?? null; };
    let total = 0;
    const hourMatch = text.match(/(\w+)\s+hours?/);
    const minMatch  = text.match(/(\w+)\s+minutes?/);
    const secMatch  = text.match(/(\w+)\s+seconds?/);
    if (hourMatch) { const v = toNum(hourMatch[1]); if (v != null) total += v * 3600; }
    if (minMatch)  { const v = toNum(minMatch[1]);  if (v != null) total += v * 60;   }
    if (secMatch)  { const v = toNum(secMatch[1]);  if (v != null) total += v;         }
    return total > 0 ? total : null;
}

function _extractTarget(text) {
    const ordinals = {
        first:0, second:1, third:2, fourth:3, fifth:4,
        sixth:5, seventh:6, eighth:7, ninth:8, tenth:9,
        'número uno':0, 'primero':0, 'segundo':1, 'tercero':2
    };
    for (const [word, idx] of Object.entries(ordinals)) {
        if (text.includes(word)) return String(idx);
    }
    const numMatch = text.match(/(?:bar|row|item|column|entry|line)\s+(\d+)/i);
    if (numMatch) return String(parseInt(numMatch[1]) - 1);
    const afterVerb = text.replace(/highlight|point to|show me|emphasize|focus on|mark/gi, '').trim();
    const ws = afterVerb.split(/\s+/).filter(w => w.length > 2);
    return ws[0] ? ws[0].toLowerCase() : null;
}

function _extractPrompt(intent, text) {
    const triggers = {
        'image/generate': ['generate an image of','create an image of','show me','visualize',
                           'draw','make a picture of','generate'],
        'tool/generate':  ['build a','create a','build me a','generate a','make a','show a','create a'],
        'stream/create':  ['create a','make a',"let's play",'start a','set up a']
    };
    const list = triggers[intent] || [];
    const sorted = list.slice().sort((a, b) => b.length - a.length);
    const lower = text.toLowerCase();
    for (const t of sorted) {
        const idx = lower.indexOf(t);
        if (idx >= 0) return text.slice(idx + t.length).trim().replace(/^(the|a|an)\s+/i, '');
    }
    return text.trim();
}

function _extractPersonName(text) {
    const m = text.match(
        /(?:give|let|allow|add|invite|remove|revoke|take away)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/
    );
    if (m) return m[1].replace(/'s$/, '').trim();
    const cap = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
    return cap ? cap[1] : '';
}

function _extractWriteLevel(text) {
    const levels = ['edit', 'post', 'contribute', 'ephemeral', 'relate'];
    for (const l of levels) {
        if (text.toLowerCase().includes(l)) return l;
    }
    return 'post';
}

module.exports = ControlClassifier;