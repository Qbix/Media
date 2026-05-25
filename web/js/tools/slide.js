(function (Q, $, window, document, undefined) {

/**
 * @module Media-tools
 */

/**
 * Media/slide tool
 *
 * Renders a Media/slide stream as a composited presentation slide.
 * Content is stored as HTML in the stream's `html` field via Streams/html.
 *
 * CONTENT MODEL
 * ─────────────
 * The HTML field is the complete slide specification — layout CSS, text,
 * and child tool placeholders. The AI or author writes standard HTML:
 *
 *   <style>
 *     .Media_presentation_slide_tool { background: #1a1d24; }
 *     .Media_presentation_slide_tool h1 { font-size: 3rem; color: #fff; }
 *   </style>
 *
 *   <h1 data-build="1" data-build-effect="rise">AI Investment</h1>
 *   <p  data-build="2">Has reached $4.2T globally</p>
 *
 *   <!-- Child tool placeholder: tool class + normalized data attribute -->
 *   <div class="Media_card_stat_tool"
 *        data-media-card-stat='{"publisherId":"abc","streamName":"Media/card/stat/xyz"}'
 *        data-build="3" data-build-effect="dissolve">
 *   </div>
 *
 * CSS LAYERING
 * ────────────
 * 1. Media/web/css/tools/presentation.css  — base rules for all slide elements
 * 2. Brand CSS loaded via Q/style ephemeral or publisher stylesheet
 * 3. Inline <style> in the HTML field — slide-specific overrides
 *
 * All rules are scoped via .Media_presentation_slide_tool to avoid leaking
 * into other parts of the page. The slide tool adds this class to its element.
 *
 * CHILD TOOL ACTIVATION
 * ─────────────────────
 * Elements with both a *_tool class and a data-build attribute are treated as
 * child tool placeholders. Q.activate() traverses the content,
 * finds Q_tool elements, reads their normalized data attributes for options,
 * and constructs each tool. Idempotent and self-cleaning.
 *
 * BUILD-IN ANIMATIONS
 * ───────────────────
 * data-build="N"           build order (1-based)
 * data-build-effect        dissolve | rise | slideLeft | slideRight | scale
 * data-build-delay="ms"    extra delay before animation
 *
 * Elements without data-build are visible immediately.
 * Build-in fires on stream messages, ephemerals, or direct method calls.
 *
 * METHODS
 * ───────
 * tool.buildIn(index, options)   show elements with data-build=index
 * tool.buildOut(index, options)  hide elements with data-build=index
 * tool.buildAll(options)         build all in sequence
 * tool.buildReset()              hide all back to initial state
 * tool.nextBuild(options)        advance to next unbuilt element
 *
 * @class Media/slide
 * @constructor
 * @param {Object} [options]
 *   @param {String}  options.publisherId
 *   @param {String}  options.streamName
 *   @param {Boolean} [options.editable=true]
 *   @param {Number}  [options.buildDuration=350]
 *   @param {String}  [options.buildEffect="dissolve"]
 *   @param {Boolean} [options.autoListen=true]
 */
Q.Tool.define('Media/slide', function (options) {
    var tool  = this;
    var state = tool.state;

    tool._buildIndex    = 0;
    tool._buildElements = [];

    tool.element.classList.add('Media_presentation_slide_tool');

    // Streams/html provides the content + optional editing
    var htmlEl = document.createElement('div');
    htmlEl.className = 'Media_slide_content';
    tool.element.appendChild(htmlEl);

    $(htmlEl).tool('Streams/html', {
        publisherId: state.publisherId,
        streamName:  state.streamName,
        field:       'html',
        editable:    state.editable,
        placeholder: [
            '<style>',
            '.Media_presentation_slide_tool {',
            '  display: flex; flex-direction: column;',
            '  justify-content: center; align-items: flex-start;',
            '  padding: clamp(1.5rem, 5vw, 4rem);',
            '  height: 100%; box-sizing: border-box;',
            '}',
            '</style>',
            '<h1>Slide Title</h1>',
            '<p>Click to edit this slide.</p>'
        ].join('\n')
    }).activate(function () {
        tool._htmlTool = this;
        // After HTML renders, find build elements and activate child tools
        tool._onContentReady();
    });

    // Retain stream for message listening + live updates
    if (state.autoListen) {
        Q.Streams.retainWith(tool).get(
            state.publisherId, state.streamName,
            function (err, stream) {
                if (err) return;
                tool._stream = stream;

                // Live update: re-scan when HTML content changes (editor save)
                stream.onFieldChanged('html').set(function () {
                    // Brief delay lets the DOM settle after innerHTML update
                    setTimeout(function () { tool._onContentReady(); }, 60);
                }, tool);

                // Build-in handler — shared by message and ephemeral paths
                function _handleBuild(d) {
                    d = d || {};
                    var opts = { effect: d.effect, duration: d.duration };
                    if (d.all) {
                        tool.buildAll(Q.extend({ stagger: d.stagger }, opts));
                    } else if (typeof d.index === 'number') {
                        if (d.index < 0) {
                            tool.buildOut(Math.abs(d.index), opts);
                        } else if (d.index === 0) {
                            tool.nextBuild(opts);
                        } else {
                            tool.buildIn(d.index, opts);
                        }
                    } else {
                        tool.nextBuild(opts);
                    }
                }

                // Message path — durable, drives replay
                stream.onMessage('Media/slide/build', function (msg) {
                    var d = {};
                    try { d = JSON.parse(msg.fields.instructions || '{}'); } catch (e) {}
                    _handleBuild(d);
                }, tool);

                // Ephemeral path — live, zero latency
                stream.onEphemeral('Media/slide/build').set(function (e) {
                    if (e) _handleBuild(e);
                }, tool);
            }
        );
    }

}, {
    publisherId:   null,
    streamName:    null,
    editable:      true,
    buildDuration: 350,
    buildEffect:   'dissolve',
    autoListen:    true
}, {

    // ── Content ready ─────────────────────────────────────────────────────

    /**
     * Called after HTML content renders or is updated.
     * 1. Activates any child tool placeholders found in the HTML
     * 2. Prepares build elements
     * @private
     */
    _onContentReady: function () {
        var tool = this;
        tool._activateChildTools(function () {
            tool._prepareBuildElements();
        });
    },

    /**
     * Activate child tools inside the slide content.
     * Q.activate() traverses the DOM, finds Q_tool elements, reads options
     * from normalized data attributes, constructs tools, and is idempotent.
     * Q.Tool.clear() on removal cleans up all child tools automatically.
     *
     * Child tool placeholders in the HTML must have Q_tool as first class:
     *   <div class="Q_tool Media_card_stat_tool"
     *        data-media-card-stat='{"publisherId":"x","streamName":"Media/card/stat/y"}'
     *        data-build="3" data-build-effect="dissolve">
     *   </div>
     * @private
     */
    _activateChildTools: function (callback) {
        var content = this.element.querySelector('.Media_slide_content');
        if (!content) { Q.handle(callback); return; }
        // Q.activate is idempotent — safe to call on content update
        Q.activate(content, callback);
    },

    // ── Build element management ──────────────────────────────────────────

    /**
     * Scan for [data-build] elements, hide them, sort by index.
     * Called after content renders and after each HTML save.
     * @private
     */
    _prepareBuildElements: function () {
        var tool    = this;
        var state   = tool.state;
        var content = tool.element.querySelector('.Media_slide_content');
        if (!content) return;

        tool._buildElements = [];
        tool._buildIndex    = 0;

        content.querySelectorAll('[data-build]').forEach(function (el) {
            var idx = parseInt(el.getAttribute('data-build'), 10);
            if (isNaN(idx)) return;
            // Hide immediately without transition
            el.style.transition = 'none';
            el.style.opacity    = '0';
            el.style.transform  = _hiddenTransform(
                el.getAttribute('data-build-effect') || state.buildEffect
            );
            el.dataset.buildReady = '1';
            tool._buildElements.push({ index: idx, el: el });
        });

        // Sort ascending by build index
        tool._buildElements.sort(function (a, b) { return a.index - b.index; });
    },

    // ── Public build methods ──────────────────────────────────────────────

    /**
     * Show elements with the given data-build index.
     * @method buildIn
     * @param {Number} index
     * @param {Object} [options] { effect, duration, delay }
     */
    buildIn: function (index, options) {
        var tool  = this;
        var state = tool.state;
        options   = options || {};
        var dur   = options.duration != null ? options.duration : state.buildDuration;

        (tool._buildElements || [])
            .filter(function (b) { return b.index === index; })
            .forEach(function (b) {
                var el     = b.el;
                var effect = options.effect
                          || el.getAttribute('data-build-effect')
                          || state.buildEffect;
                var delay  = parseInt(el.getAttribute('data-build-delay') || '0', 10);

                setTimeout(function () {
                    el.style.transition = 'opacity ' + dur + 'ms ease, transform ' + dur + 'ms ease';
                    el.style.opacity    = '1';
                    el.style.transform  = 'none';
                }, delay);
            });

        if (index >= tool._buildIndex) tool._buildIndex = index + 1;
        return tool;
    },

    /**
     * Hide elements with the given data-build index.
     * @method buildOut
     * @param {Number} index
     * @param {Object} [options] { effect, duration }
     */
    buildOut: function (index, options) {
        var tool  = this;
        var state = tool.state;
        options   = options || {};
        var dur   = options.duration != null ? options.duration : state.buildDuration;

        (tool._buildElements || [])
            .filter(function (b) { return b.index === index; })
            .forEach(function (b) {
                var el     = b.el;
                var effect = options.effect
                          || el.getAttribute('data-build-effect')
                          || state.buildEffect;
                el.style.transition = 'opacity ' + dur + 'ms ease, transform ' + dur + 'ms ease';
                el.style.opacity    = '0';
                el.style.transform  = _hiddenTransform(effect);
            });

        if (index <= tool._buildIndex) tool._buildIndex = index;
        return tool;
    },

    /**
     * Build in all elements in sequence.
     * @method buildAll
     * @param {Object} [options] { duration, stagger, effect }
     */
    buildAll: function (options) {
        var tool  = this;
        var state = tool.state;
        options   = options || {};
        var dur     = options.duration != null ? options.duration : state.buildDuration;
        var stagger = options.stagger  != null ? options.stagger  : Math.round(dur * 0.6);

        (tool._buildElements || []).forEach(function (b, i) {
            setTimeout(function () {
                tool.buildIn(b.index, { duration: dur, effect: options.effect });
            }, i * stagger);
        });

        return tool;
    },

    /**
     * Reset all build elements to hidden.
     * @method buildReset
     */
    buildReset: function () {
        var tool  = this;
        var state = tool.state;

        (tool._buildElements || []).forEach(function (b) {
            var el     = b.el;
            var effect = el.getAttribute('data-build-effect') || state.buildEffect;
            el.style.transition = 'none';
            el.style.opacity    = '0';
            el.style.transform  = _hiddenTransform(effect);
        });

        tool._buildIndex = 0;
        return tool;
    },

    /**
     * Advance to the next unbuilt element.
     * @method nextBuild
     * @param {Object} [options]
     */
    nextBuild: function (options) {
        var tool = this;
        var next = (tool._buildElements || []).find(function (b) {
            return b.index >= tool._buildIndex;
        });
        if (next) tool.buildIn(next.index, options);
        return tool;
    },

    // ── Cleanup ────────────────────────────────────────────────────────────

    Q: {
        beforeRemove: function () {
            // Q.activate is idempotent and Q.Tool.clear handles child cleanup
            // automatically when the parent tool is removed — nothing extra needed
        }
    }

});

// ── CSS for slide base styles — append to Media/web/css/tools/presentation.css ──
//
// /* Slide tool wrapper */
// .Media_presentation_slide_tool {
//     position: relative;
//     width: 100%;
//     height: 100%;
//     overflow: hidden;
//     box-sizing: border-box;
// }
//
// /* Default typographic scale — portrait and landscape via container queries */
// .Media_presentation_slide_tool h1 {
//     font-size: clamp(1.8rem, 5cqw, 3.5rem);
//     font-weight: 700;
//     line-height: 1.15;
//     letter-spacing: -0.02em;
//     margin-bottom: 0.5em;
// }
// .Media_presentation_slide_tool h2 {
//     font-size: clamp(1.3rem, 3.5cqw, 2.4rem);
//     font-weight: 600;
//     margin-bottom: 0.5em;
// }
// .Media_presentation_slide_tool p {
//     font-size: clamp(0.95rem, 2cqw, 1.3rem);
//     line-height: 1.65;
//     max-width: 72ch;
// }
// .Media_presentation_slide_tool ul,
// .Media_presentation_slide_tool ol {
//     font-size: clamp(0.9rem, 1.8cqw, 1.2rem);
//     line-height: 1.7;
//     padding-left: 1.5em;
// }
//
// /* Placeholder cells for child tools */
// .Media_presentation_slide_tool [data-build] {
//     /* Build elements start hidden — JS sets opacity:0 after parse */
// }
//
// /* The child tool body fills its placeholder cell */
// .Media_presentation_slide_tool [class*="_tool"] {
//     width: 100%;
//     height: 100%;
//     min-height: 0;
// }

// ── Module helper ─────────────────────────────────────────────────────────────

/**
 * Initial hidden transform for a build effect.
 * 'in' state is always opacity:1 / transform:none.
 * @param {String} effect
 * @return {String} CSS transform value for hidden state
 */
function _hiddenTransform(effect) {
    switch (effect) {
        case 'rise':        return 'translateY(28px)';
        case 'slideLeft':   return 'translateX(-36px)';
        case 'slideRight':  return 'translateX(36px)';
        case 'scale':       return 'scale(0.82)';
        case 'dissolve':
        default:            return 'none';
    }
}

})(Q, Q.jQuery, window, document);
