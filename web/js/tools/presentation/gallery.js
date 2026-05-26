(function (Q, $, window, undefined) {

var Streams = Q.Streams;

/**
 * @module Media
 */

/**
 * B-Roll gallery presentation tool.
 *
 * Wraps Q/gallery (kenburns) and drives image selection via:
 *   1. Ephemeral stream events (Streams/gallery/images, /query, /next, /pause, /resume)
 *   2. WebSpeech keyword detection — works on iOS Safari, zero API key
 *   4. Optional AI enhancement: when AI plugin available, pass keywords through
 *      AI_LLM.buildSearchQueries() for better Pexels results (post-demo enhancement)
 *
 * Each image gets randomised kenburns from/to rectangles (±10% jitter) so
 * every image has a unique slow-zoom path. The Q/gallery crossfade transition
 * handles the dissolve between images.
 *
 * Voice control (from control classifier on Node):
 *   "next"   → Streams/gallery/next ephemeral
 *   "pause"  → Streams/gallery/pause ephemeral
 *   "resume" → Streams/gallery/resume ephemeral
 *   Any content word → Streams/gallery/query { query } ephemeral → Pexels fetch
 *
 * PHP usage (in a view, same as Q/gallery):
 *   echo Q::tool("Media/presentation/gallery", array(
 *       'publisherId' => $publisherId,
 *       'streamName'  => $streamName,
 *       'images'      => $gallery,   // [{src, caption}, ...]
 *       'pexelsKey'   => $pexelsKey
 *   ));
 *
 * @class Media/presentation/gallery
 * @constructor
 * @param {Object} [options]
 * @param {String} options.publisherId
 * @param {String} options.streamName    A Media/gallery stream
 * @param {Array}  [options.images]      Initial images [{src, caption}]
 * @param {String} [options.pexelsKey]   Pexels API key
 * @param {Boolean}[options.speechEnabled=true]
 * @param {Number} [options.transitionDuration=1200]
 * @param {Number} [options.intervalDuration=6000]
 * @param {Object} [options.kenburns]    Base from/to kenburns rectangles
 */
Q.Tool.define("Media/presentation/gallery", function (options) {
    var tool = this;
    var state = tool.state;

    if (state.publisherId && state.streamName) {
        Streams.retainWith(tool).get(state.publisherId, state.streamName,
        function (err, stream) {
            if (err) return;
            tool._stream = stream;
            // Load initial images from stream attributes if not passed as option
            if (!state.images.length) {
                var attrs = stream.getAllAttributes();
                if (attrs.images) {
                    try { state.images = JSON.parse(attrs.images); } catch (e) {}
                }
            }
            tool._wireEphemerals(stream);
            tool._render(state.images);
        });
    } else {
        tool._render(state.images);
    }

    // Hook into Q.Speech.Recognition.onResult if speech is running.
    // The gallery never calls start() itself — that requires a user gesture
    // (mandatory on iOS Safari) and is the page's responsibility.
    // If speech is active (browser WebSpeech or Deepgram via AI plugin),
    // keyword extraction happens here passively.
    if (state.speechEnabled && Q.Speech && Q.Speech.Recognition) {
        Q.Speech.Recognition.onResult.set(function (chunk) {
            if (!chunk || !chunk.isFinal) return;
            var kw = _keyword(chunk.transcript.trim().toLowerCase());
            if (kw) tool._fetchAndSet(kw);
        }, tool);
    }

},
{
    publisherId:        null,
    streamName:         null,
    images:             [],
    pexelsKey:          null,
    pixabayKey:         null,
    speechEnabled:      true,
    transitionDuration: 1200,
    intervalDuration:   6000,
    kenburns: {
        from: { left: 0.0,  top: 0.0,  width: 1.0,  height: 1.0  },
        to:   { left: 0.05, top: 0.05, width: 0.90, height: 0.90 }
    }
},
{
    _render: function (images) {
        var tool = this, state = tool.state;
        tool._gallery = null; // null out during re-init so ephemerals don't land on stale instance
        tool.element.innerHTML = '';

        var wrapper = document.createElement('div');
        wrapper.className = 'Media_presentation_screen Media_presentation_gallery_screen';
        if (!images || !images.length) {
            wrapper.classList.add('Media_presentation_gallery_empty');
            tool.element.appendChild(wrapper);
            return;
        }

        var hero = document.createElement('div');
        hero.className = 'Media_presentation_hero';
        var galleryDiv = document.createElement('div');
        wrapper.appendChild(hero);
        hero.appendChild(galleryDiv);
        tool.element.appendChild(wrapper);

        var kb = state.kenburns;
        var enriched = images.map(function (img) {
            return Q.extend({
                interval: {
                    type:     'kenburns',
                    duration: state.intervalDuration,
                    ease:     'smooth',
                    from:     _jitter(kb.from),
                    to:       _jitter(kb.to)
                }
            }, img);
        });

        $(galleryDiv).tool('Q/gallery', {
            images:   enriched,
            autoplay: true,
            loop:     true,
            transition: { type: 'crossfade', duration: state.transitionDuration, ease: 'smooth' },
            interval:   { type: 'kenburns', duration: state.intervalDuration, ease: 'smooth',
                          from: kb.from, to: kb.to }
        }).activate(function () {
            tool._gallery = $(galleryDiv).data('gallery');
        });
    },

    _setImages: function (images) {
        var tool = this;
        tool.state.images = images;
        if (tool._gallery) tool._gallery.pause();
        tool._render(images);
    },

    _wireEphemerals: function (stream) {
        var tool = this;

        // ── Playback control ───────────────────────────────────────────────
        stream.onEphemeral('Streams/gallery/images').set(function (e) {
            if (e && e.images) tool._setImages(e.images);
        }, tool);
        stream.onEphemeral('Streams/gallery/query').set(function (e) {
            if (e && e.query) tool._fetchAndSet(e.query);
        }, tool);
        stream.onEphemeral('Streams/gallery/next').set(function () {
            tool._gallery && tool._gallery.next(false);
        }, tool);
        stream.onEphemeral('Streams/gallery/pause').set(function () {
            tool._gallery && tool._gallery.pause();
        }, tool);
        stream.onEphemeral('Streams/gallery/resume').set(function () {
            tool._gallery && tool._gallery.resume();
        }, tool);

        // ── Caption control ────────────────────────────────────────────────
        // Streams/gallery/caption — add/update/remove a caption on a specific image
        // Payload: { index?, text?, style?, remove? }
        //   index:  image index (default: current showing image)
        //   text:   caption HTML; omit to remove
        //   style:  { top?, left?, bottom?, right? } CSS — disables centering
        //   remove: true — remove caption for that image
        stream.onEphemeral('Streams/gallery/caption').set(function (e) {
            if (!e || !tool._gallery) return;
            var idx = (e.index != null) ? e.index : tool._currentIndex();
            if (idx == null) return;
            if (e.remove || e.text == null) {
                tool._gallery.removeCaption(idx);
            } else {
                tool._gallery.setCaption(idx, e.text, e.style || null);
            }
        }, tool);

        // Streams/gallery/add — add an image at runtime
        // Payload: { src, caption?, style?, interval?, transition?,
        //            insertAfterCurrent?, playAfterMs? }
        //   insertAfterCurrent: true  — plays right after current image
        //   playAfterMs: N            — schedule to appear ~N ms from now
        //   (default)                 — append to rotation
        stream.onEphemeral('Streams/gallery/add').set(function (e) {
            if (!e || !e.src || !tool._gallery) return;
            tool._gallery.addImage(e);
        }, tool);

        // Streams/gallery/remove — remove an image at runtime
        // Payload: { index? }  — omit index to remove the currently-showing image
        stream.onEphemeral('Streams/gallery/remove').set(function (e) {
            if (!tool._gallery) return;
            var idx = (e && e.index != null) ? e.index : tool._currentIndex();
            if (idx != null) tool._gallery.removeImage(idx);
        }, tool);

        // Streams/gallery/transition — update crossfade or kenburns at runtime
        // Payload: { transition?: { duration?, ease?, type? },
        //            interval?:   { duration?, ease?, from?, to?, type? } }
        // Uses gallery.setTransition / gallery.setInterval — no animation restart.
        stream.onEphemeral('Streams/gallery/transition').set(function (e) {
            if (!e) return;
            if (e.transition && tool._gallery) tool._gallery.setTransition(e.transition);
            if (e.interval   && tool._gallery) tool._gallery.setInterval(e.interval);
        }, tool);
    },



    _fetchAndSet: function (query) {
        var tool = this;
        var pexelsKey  = tool.state.pexelsKey  || Q.Config.get(['Media', 'gallery', 'pexelsKey'],  null);
        var pixabayKey = tool.state.pixabayKey || Q.Config.get(['Media', 'gallery', 'pixabayKey'], null);
        if (!pexelsKey && !pixabayKey) {
            return console.warn('Media/presentation/gallery: set pexelsKey or pixabayKey');
        }
        if (pexelsKey) {
            // Pexels: primary source
            fetch('https://api.pexels.com/v1/search?query=' + encodeURIComponent(query) + '&per_page=8&orientation=landscape', {
                headers: { Authorization: pexelsKey }
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.photos && data.photos.length) {
                    tool._setImages(data.photos.map(function (p) {
                        return { src: p.src.landscape || p.src.large, caption: p.photographer + ' / Pexels' };
                    }));
                } else if (pixabayKey) {
                    tool._fetchFromPixabay(query, pixabayKey); // fallback
                }
            })
            .catch(function () { if (pixabayKey) tool._fetchFromPixabay(query, pixabayKey); });
        } else {
            tool._fetchFromPixabay(query, pixabayKey);
        }
    },


    // Returns the index of the currently-displaying image in Q/gallery
    _currentIndex: function () {
        if (!this._gallery) return null;
        // gallery.currentIndex is exposed via the getter added in fn/gallery.js drop-in
        var idx = this._gallery.currentIndex;
        return (idx != null && idx >= 0) ? idx : null;
    },

    _fetchFromPixabay: function (query, key) {
        var tool = this;
        fetch('https://pixabay.com/api/?key=' + encodeURIComponent(key)
            + '&q=' + encodeURIComponent(query)
            + '&image_type=photo&orientation=horizontal&per_page=8&safesearch=true')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (!data.hits || !data.hits.length) return;
            tool._setImages(data.hits.map(function (h) {
                return { src: h.largeImageURL, caption: h.user + ' / Pixabay' };
            }));
        })
        .catch(function (e) {
            console.warn('Media/presentation/gallery: Pixabay error', e);
        });
    },



    Q: {
        beforeRemove: function () {
            var tool = this;
            if (tool._gallery) tool._gallery.pause();
            // Remove onResult handler registered with key 'tool' (set in constructor)
            if (Q.Speech && Q.Speech.Recognition && Q.Speech.Recognition.onResult) {
                Q.Speech.Recognition.onResult.remove(tool);
            }
        }
    }
});

var _STOP = /^(the|a|an|and|or|but|in|on|at|to|for|of|with|is|are|was|were|be|been|has|have|had|this|that|these|those|we|i|you|he|she|they|it|what|which|who|how|when|where|why|just|so|then|now|there|here|very|really|also|about|like|some|all|any|more|most|other|than|up|out|if|do|did|not|no|can|will|would|could|should|may|one|two|said|say|talking|think|know|get|go|make|see)$/i;
function _keyword(text) {
    var words = text.replace(/[^a-z\s]/gi, '').split(/\s+/).filter(function (w) { return w.length > 2 && !_STOP.test(w); });
    if (words.length >= 2) return words[0] + ' ' + words[1];
    if (words.length === 1) return words[0];
    return null;
}
function _jitter(base) {
    function j(v) { return Math.max(0, Math.min(1, v + (Math.random() - 0.5) * 0.10)); }
    return { left: j(base.left), top: j(base.top), width: j(base.width), height: j(base.height) };
}

})(Q, Q.jQuery, window);
