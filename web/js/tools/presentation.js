(function (Q, $, window, undefined) {

var Streams = Q.Streams;
var Users = Q.Users;
var Media = Q.Media;

/**
 * @module Streams-tools
 */

/**
 * Renders a presentation taking place on a stream
 * in which the user has at least testReadLevel("content")
 * @class Media presentation
 * @constructor
 * @param {Object} [options] any options for the tool
 * @param {Object} [options.show] optionally, pass the stream to show in the presentation initially
 * @param {Object} [options.publisherId]
 * @param {Object} [options.streamName]
 * @param {Boolean} [options.mode] forwards it to all the child tools. Can be "participant" or "broadcast".
 * @param {Object} [options.displayTools] keys are the types of streams that can be rendered,
 *  while values are the names of the tools to use,
 *  which will receive options "streamName", "publisherId", and "extra".
 *  The values can also be functions returning the tool names.
 *  Feel free to expand it in Q.Tool.define.options
 * @param {Object} [options.backgroundGallery] config for background gallery, or false to disable
 * @param {Array}  [options.pinnedItems] initially pinned streams
 * @param {Object} [options.resize] resize animation options
 * @param {String} [options.transitionClass] CSS class for slide transitions
 */
Q.Tool.define("Media/presentation", function(options) {
    var tool = this;
    var state = tool.state;
    tool.stack = [];

    tool.element.style.cursor = 'pointer';

    if (state.publisherId && state.streamName) {
        Streams.retainWith(tool).get(state.publisherId, state.streamName,
        function (err, stream) {
            if (err) {
                debugger;
                return;
            }

            tool._stream = stream;

            if (!Q.isEmpty(state.show)) {
                tool.show(
                    state.show.publisherId,
                    state.show.streamName
                );
            }

            // Combined Media/presentation/show handler:
            // handles stream-based shows AND inline cards AND generated tools
            stream.onEphemeral('Media/presentation/show')
            .set(function (ephemeral) {
                if (!ephemeral) return;
                if (ephemeral.publisherId && ephemeral.streamName) {
                    tool.show(ephemeral.publisherId, ephemeral.streamName);
                }
                if (ephemeral.visualizationData && ephemeral.streamType) {
                    tool._showInlineCard(
                        ephemeral.streamType,
                        ephemeral.visualizationType,
                        ephemeral.visualizationData
                    );
                }
                if (ephemeral.code && ephemeral.toolName) {
                    tool._activateGeneratedTool(
                        ephemeral.toolName,
                        ephemeral.code,
                        ephemeral.toolOptions
                    );
                }
            }, tool);

            var presentingUserIds = [stream.fields.publisherId];
            Q.each(this.participants, function () {
                if (this.testRoles('presenter')) {
                    presentingUserIds.push(this.userId);
                }
            });
            state.presentingUserIds = presentingUserIds;
            state.title = stream.fields.title;

            tool.refresh(stream).then(function () {
                tool._initEphemerals(stream);
                tool._initBackground(stream);
                tool._initCompositor(stream);
            });
        }, {
            participants: 100
        });

        // try to preload related tools
        Q.Streams.Tool.preloadRelated(state.publisherId, state.streamName, tool.element);
    }
    tool.current = {};
    tool.refresh();
},
{
    publisherId: null,
    streamName: null,
    title: "Untitled Presentation",
    ephemeral: null,
    mode: null,
    presentingUserIds: [],
    displayTools: {
        'Streams/image': 'Media/presentation/image',
        'Streams/video': 'Media/presentation/video',
        'Streams/audio': 'Media/presentation/audio',
        'Streams/pdf': 'Media/presentation/pdf',
        'Streams/webpage': 'Media/presentation/webpage',
        'Streams/question': 'Media/presentation/question'
    },
    animation: {
        duration: 500
    },
    backgroundGallery: false,
    pinnedItems: [],
    resize: { duration: 500 },
    transitionClass: null,
    pexelsKey: null,
    pixabayKey: null
},
    {
        refresh: function (stream) {
            var tool = this;
            var state = this.state;

            if (stream) {
                var tc = stream.getAttribute('transitionClass');
                if (tc) {
                    state.transitionClass = tc;
                    tool.element.classList.add(tc);
                }
            }

            return Q.Template.render(    // ← return the promise
                'Media/presentation',
                Q.take(tool.state, ['title', 'presentingUserIds']),
                { tool: tool }
            ).then(function (html) {
                Q.replace(tool.element, html);

                $(".Media_presentation_title", tool.element).tool("Streams/inplace", {
                    editable: false,
                    field: "title",
                    publisherId: state.publisherId,
                    streamName: state.streamName
                }).activate();

                Q.activate(tool.element);
            });
        },

    next: function () {

    },

    show: function (publisherId, streamName, transition) {
        transition = transition || 'dissolve';
        var tool = this;
        var state = this.state;
        if (tool.current.publisherId === publisherId
        &&  tool.current.streamName === streamName) {
            return tool.current.tool.nextState && tool.current.tool.nextState();
        }
        Streams.get(publisherId, streamName)
        .then(function (stream) {
            var toolName = state.displayTools[stream.fields.type];
            if (typeof toolName == 'function') {
                toolName = toolName(stream);
            }
            if (!toolName) {
                return console.warn("Media/presentation: no tool defined for displaying " + stream.fields.type);
            }
            if (!Q.Tool.defined(toolName)) {
                return console.warn("Media/presentation: tool " + toolName + " for rendering " + stream.fields.type + " was not defined");
            }
            if (!stream.testReadLevel('content')) {
                return console.warn("Media/presentation: can't view content of " + stream.fields.name);
            }

            var next;
            $(">.Q_tool", tool.element).each(function () {
                var thisTool = Q.Tool.from(this, toolName);
                if (Q.getObject("state.publisherId", thisTool) === publisherId && Q.getObject("state.streamName", thisTool) === streamName) {
                    next = this;
                }
            });
            if (!next) {
                next = Q.Tool.prepare('div', toolName, {
                    publisherId: publisherId,
                    streamName: streamName,
                    mode: state.mode,
                    trackScroll: true
                }, null, tool.prefix);
                tool.element.appendChild(next);
            }

            var current = tool.stack[tool.stack.length-1]
                || tool.element.getElementsByClassName('Media_presentation_screen')[0];
            tool.stack.push(next);
            Q.activate(next, function () {
                tool._transition(next, current);
                tool.current.publisherId = publisherId;
                tool.current.streamName = streamName;
                tool.current.tool = this;
            });
        }).catch(function (exception) {
            debugger;
        });
    },

    beforeRemove: function () {
        var tool = this;
        tool._bgDestroy();
        if (tool._compositorObserver) {
            tool._compositorObserver.disconnect();
            tool._compositorObserver = null;
        }
        if (tool._reactionBar && tool._reactionBar.parentNode) {
            tool._reactionBar.parentNode.removeChild(tool._reactionBar);
        }
    },

    // ── CSS transition helpers ─────────────────────────────────────────────

    _transition: function (next, current) {
        var tool = this;
        var state = tool.state;
        var tc = state.transitionClass;
        if (tc) {
            tool.element.className = tool.element.className
                .replace(/\bMedia_presentation_transition_\S+/g, '').trim();
            tool.element.classList.add(tc);
        }
        next.style.display = 'block';
        if (!current) return;
        tool._exitElement(current);
    },

    _exitElement: function (element) {
        if (!element || !element.parentNode) return;
        element.classList.add('Media_presentation_leaving');
        var computed  = window.getComputedStyle(element);
        var durStr    = computed.transitionDuration || '0s';
        var delayStr  = computed.transitionDelay    || '0s';
        var toMs      = function (s) { return parseFloat(s) * (s.indexOf('ms') >= 0 ? 1 : 1000); };
        var timeoutMs = Math.max(toMs(durStr), 0) + Math.max(toMs(delayStr), 0) + 50;
        var done = false;
        function remove() {
            if (done) return; done = true;
            if (element.parentNode) element.parentNode.removeChild(element);
        }
        element.addEventListener('transitionend', remove, { once: true });
        setTimeout(remove, timeoutMs || 500);
    },

        _initEphemerals: function (stream) {
            var tool = this;

            stream.onEphemeral('Media/presentation/graph/update').set(function (e) {
                // … (move from old _initBackground body verbatim)
            }, tool);
            stream.onEphemeral('Media/presentation/table/update').set(function (e) {
                // …
            }, tool);
            stream.onEphemeral('Media/presentation/reaction/burst').set(function (e) {
                // …
            }, tool);
            stream.onEphemeral('Media/livestream/reaction').set(function (e) {
                // …
            }, tool);
            stream.onEphemeral('Q/style').set(function (e) {
                // …
            }, tool);
        },

    // ── Background gallery ─────────────────────────────────────────────────

        _initBackground: function (stream) {
            var tool = this;
            var state = tool.state;

            // Background container — positioned behind slides via CSS
            var bg = document.createElement('div');
            bg.className = 'Media_presentation_background';
            tool.element.insertBefore(bg, tool.element.firstChild);
            tool._bgElement = bg;

            // The Media/presentation/gallery sub-tool owns:
            //   - all Streams/gallery/* ephemeral wiring
            //   - Pexels + Pixabay fetch
            //   - WebSpeech keyword detection
            //   - render / re-render with proper teardown
            var galleryDiv = document.createElement('div');
            bg.appendChild(galleryDiv);

            var bgConfig = state.backgroundGallery;
            if (typeof bgConfig === 'string') {
                try { bgConfig = JSON.parse(bgConfig); } catch (e) { bgConfig = {}; }
            } else if (!bgConfig) {
                bgConfig = stream.getAttribute('backgroundGallery') || {};
                if (typeof bgConfig === 'string') {
                    try { bgConfig = JSON.parse(bgConfig); } catch (e) { bgConfig = {}; }
                }
            } else if (bgConfig === true) {
                bgConfig = {};
            }

            $(galleryDiv).tool('Media/presentation/gallery', {
                publisherId: stream.fields.publisherId,
                streamName: stream.fields.name,
                images: bgConfig.images || [],
                pexelsKey: state.pexelsKey,
                pixabayKey: state.pixabayKey,
                speechEnabled: false, // parent tool may drive speech separately
                transitionDuration: bgConfig.transitionDuration || 1500,
                intervalDuration: bgConfig.intervalDuration || 7000,
                kenburns: !bgConfig.kenburns ? undefined : bgConfig.kenburns
            }).activate(function () {
                tool._bgGalleryTool = Q.Tool.from(galleryDiv, 'Media/presentation/gallery');
            });
        },


    _bgDestroy: function () {
        var tool = this;
        if (tool._bgGalleryTool) tool._bgGalleryTool.pause();
        if (tool._bgElement) {
            Q.Tool.clear(tool._bgElement);
            tool._bgElement.remove();
            tool._bgElement = null;
        }
    },

    // ── Reactions ──────────────────────────────────────────────────────────

    _showReaction: function (type) {
        var tool = this;
        var icons = {
            laugh:    '{{Media}}/img/reactions/laugh_100.png',
            cry:      '{{Media}}/img/reactions/cry_100.png',
            angry:    '{{Media}}/img/reactions/angry_100.png',
            exploding:'{{Media}}/img/reactions/exploding_100.png',
            liar:     '{{Media}}/img/reactions/liar_100.png',
            sick:     '{{Media}}/img/reactions/sick_100.png',
            applause: '{{Media}}/img/reactions/clap_100.png',
            thumbUp:  '{{Media}}/img/reactions/thumbUp_100.png',
            thumbDown:'{{Media}}/img/reactions/thumbDown_100.png'
        };
        var src = icons[type];
        if (!src) return;
        tool._reactionCounts = tool._reactionCounts || {};
        tool._reactionTimers = tool._reactionTimers || {};
        tool._reactionCounts[type] = (tool._reactionCounts[type] || 0) + 1;
        clearTimeout(tool._reactionTimers[type]);
        tool._reactionTimers[type] = setTimeout(function () {
            tool._reactionCounts[type] = 0;
        }, 2000);
        var count = tool._reactionCounts[type];
        if (count >= 3) {
            tool._showReactionBurst(type, src, count);
            if (count % 3 !== 0) return;
        }
        var container = tool.element;
        var img = document.createElement('img');
        img.src = Q.url(src);
        img.className = 'Media_presentation_reaction_float';
        var xPct = 10 + Math.random() * 80;
        img.style.left = xPct + '%';
        var drift = (Math.random() - 0.5) * 60;
        img.style.setProperty('--Media-reaction-drift', drift + 'px');
        container.appendChild(img);
        setTimeout(function () {
            if (img.parentNode) img.parentNode.removeChild(img);
        }, 2600);
    },

    _showReactionBurst: function (type, src, count) {
        var tool = this;
        var container = tool.element;
        var existing = container.querySelector('.Media_presentation_reaction_burst[data-type="' + type + '"]');
        if (existing) existing.parentNode.removeChild(existing);
        var burst = document.createElement('div');
        burst.className = 'Media_presentation_reaction_burst';
        burst.dataset.type = type;
        burst.style.left = (15 + Math.random() * 70) + '%';
        var bImg = document.createElement('img');
        bImg.src = Q.url(src);
        var bCount = document.createElement('span');
        bCount.className = 'Media_presentation_reaction_burst_count';
        bCount.textContent = '×' + count;
        burst.appendChild(bImg);
        burst.appendChild(bCount);
        container.appendChild(burst);
        setTimeout(function () {
            if (burst.parentNode) burst.parentNode.removeChild(burst);
        }, 2400);
    },

    _renderReactionBar: function (stream) {
        var tool = this;
        var reactions = [
            { type: 'thumbUp',   src: '{{Media}}/img/reactions/thumbUp_100.png'   },
            { type: 'applause',  src: '{{Media}}/img/reactions/clap_100.png'      },
            { type: 'laugh',     src: '{{Media}}/img/reactions/laugh_100.png'     },
            { type: 'exploding', src: '{{Media}}/img/reactions/exploding_100.png' },
            { type: 'cry',       src: '{{Media}}/img/reactions/cry_100.png'       },
            { type: 'angry',     src: '{{Media}}/img/reactions/angry_100.png'     },
            { type: 'thumbDown', src: '{{Media}}/img/reactions/thumbDown_100.png' }
        ];
        var bar = document.createElement('div');
        bar.className = 'Media_presentation_participant_reactions';
        reactions.forEach(function (r) {
            var btn = document.createElement('button');
            btn.className = 'Media_presentation_reaction_btn';
            btn.dataset.reaction = r.type;
            var img = document.createElement('img');
            img.src = Q.url(r.src);
            img.alt = r.type;
            btn.appendChild(img);
            btn.addEventListener('click', function () {
                if (btn.dataset.throttled) return;
                btn.dataset.throttled = '1';
                btn.classList.add('Media_reaction_sent');
                setTimeout(function () {
                    delete btn.dataset.throttled;
                    btn.classList.remove('Media_reaction_sent');
                }, 800);
                stream.ephemeral('Media/livestream/reaction', { reaction: r.type });
            });
            bar.appendChild(btn);
        });
        tool.element.appendChild(bar);
        tool._reactionBar = bar;
    },

    // ── Inline cards and generated tools ──────────────────────────────────

    /**
     * Show an AI-proposed card or chart inline on the canvas.
     * streamType maps to a presentation wrapper tool.
     * visualizationData is passed as the tool's state (inline: true skips stream fetch).
     * @method _showInlineCard
     */
    _showInlineCard: function (streamType, visualizationType, visualizationData) {
        var tool = this;
        var displayTools = {
            'Media/card/stat':       'Media/presentation/card/stat',
            'Media/card/glossary':   'Media/presentation/card/glossary',
            'Media/card/profile':    'Media/presentation/card/profile',
            'Media/card/quote':      'Media/presentation/card/quote',
            'Media/card/article':    'Media/presentation/card/article',
            'Media/card/comparison': 'Media/presentation/card/comparison',
            'Media/chart/bar':       'Media/presentation/chart/bar',
            'Media/chart/line':      'Media/presentation/chart/line',
            'Media/card/slide':      'Media/presentation/card/slide'
        };
        var toolName = displayTools[streamType];
        if (!toolName) return;

        var cardEl = Q.Tool.prepare(
            'div', toolName,
            Q.extend({}, visualizationData, { inline: true }),
            null, tool.prefix
        );
        cardEl.className += ' Media_presentation_card_screen Media_presentation_transition_rise';

        var prev = tool._currentForeground;
        if (prev) {
            prev.classList.add('Media_presentation_leaving');
            setTimeout(function () {
                if (prev.parentNode) prev.parentNode.removeChild(prev);
            }, 600);
        }
        tool._currentForeground = cardEl;
        tool.element.appendChild(cardEl);
        Q.activate(cardEl);
    },

    _activateGeneratedTool: function (toolName, code, extraOptions) {
        var tool = this;
        var version = (extraOptions && extraOptions.version) || 1;
        var storageKey = toolName + '/v' + version;
        try { sessionStorage.setItem(storageKey, code); } catch (e) {}
        if (!Q.Tool.defined(toolName)) {
            try {
                /* jshint ignore:start */
                (new Function('Q', '$', code))(Q, Q.jQuery);
                /* jshint ignore:end */
            } catch (e) {
                console.warn('_activateGeneratedTool: eval failed', e.message);
                return;
            }
        }
        if (!Q.Tool.defined(toolName)) {
            console.warn('_activateGeneratedTool: not defined after eval', toolName);
            return;
        }
        var opts = Q.extend({
            mode:        'broadcast',
            publisherId: tool.state && tool.state.publisherId,
            streamName:  tool.state && tool.state.streamName,
            writeLevel:  tool.state && tool.state.writeLevel || 16
        }, extraOptions || {});
        var el = Q.Tool.prepare('div', toolName, opts, null, tool.prefix);
        el.className += ' Media_presentation_card_screen Media_presentation_transition_scale';
        if (!el.id) el.id = toolName.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
        var prev = tool._currentForeground;
        if (prev) {
            prev.classList.add('Media_presentation_leaving');
            setTimeout(function () { if (prev.parentNode) prev.parentNode.removeChild(prev); }, 600);
        }
        tool._currentForeground = el;
        tool._generatedToolElementId = el.id;
        tool.element.appendChild(el);
        Q.activate(el);
    },

    _restoreGeneratedTool: function (toolName, version) {
        if (Q.Tool.defined(toolName)) return true;
        var storageKey = toolName + '/v' + (version || 1);
        var code;
        try { code = sessionStorage.getItem(storageKey); } catch (e) {}
        if (!code) return false;
        try {
            /* jshint ignore:start */
            (new Function('Q', '$', code))(Q, Q.jQuery);
            /* jshint ignore:end */
            return Q.Tool.defined(toolName);
        } catch (e) { return false; }
    },

    /**
     * Apply a graph update to the current graph tool, or activate one.
     * @method _updateGraph
     */
    _updateGraph: function (data) {
        var tool = this;
        if (tool._currentForeground && tool._currentForeground._graphTool) {
            tool._currentForeground._graphTool.update(data);
            return;
        }
        var opts = {
            mode:        'broadcast',
            publisherId: tool.state && tool.state.publisherId,
            streamName:  tool.state && tool.state.streamName,
            nodes:       data.nodes || [],
            edges:       data.edges || [],
            stream:      null
        };
        var el = Q.Tool.prepare('div', 'Q/visualization/graph', opts, null, tool.prefix);
        el.className += ' Media_presentation_card_screen Media_presentation_transition_scale';
        if (!el.id) el.id = 'Q_vis_graph_' + Date.now();
        var prev = tool._currentForeground;
        if (prev) {
            prev.classList.add('Media_presentation_leaving');
            setTimeout(function () { if (prev.parentNode) prev.parentNode.removeChild(prev); }, 600);
        }
        tool._currentForeground = el;
        tool.element.appendChild(el);
        Q.activate(el, function () {
            var t = Q.Tool.from(el, 'Q/visualization/graph');
            if (t) el._graphTool = t;
        });
    },

    /**
     * Apply a table update to the current table tool, or activate one.
     * Handles both flat array rows (legacy) and {image, cells} row objects (new format).
     * @method _updateTable
     */
    _updateTable: function (data) {
        var tool = this;

        // Normalize rows: new format is {image, cells} — convert to flat arrays.
        // If a row has an image, prepend an <img> string as the first cell.
        function normalizeRows(rows) {
            return (rows || []).map(function (row) {
                if (Array.isArray(row)) return row;
                var cells = row.cells || [];
                if (row.image) {
                    var imgHtml = '<img src="' + row.image + '" style="height:36px;width:36px;'
                        + 'object-fit:cover;border-radius:4px;vertical-align:middle"'
                        + ' onerror="this.style.display=\'none\'">';
                    return [imgHtml].concat(cells);
                }
                return cells;
            });
        }

        if (tool._currentForeground && tool._currentForeground._tableTool) {
            tool._currentForeground._tableTool.update(
                Object.assign({}, data, { rows: normalizeRows(data.rows) })
            );
            return;
        }

        var rawRows    = data.rows || [];
        var hasImages  = rawRows.length && rawRows[0]
            && typeof rawRows[0] === 'object' && !Array.isArray(rawRows[0]);
        var normHeaders = hasImages && data.headers && data.headers.length
            ? [''].concat(data.headers) : (data.headers || []);

        var opts = {
            mode:        'broadcast',
            publisherId: tool.state && tool.state.publisherId,
            streamName:  tool.state && tool.state.streamName,
            headers:     normHeaders,
            rows:        normalizeRows(rawRows),
            highlight:   data.highlight || [],
            stream:      null
        };
        var el = Q.Tool.prepare('div', 'Q/visualization/table', opts, null, tool.prefix);
        el.className += ' Media_presentation_card_screen Media_presentation_transition_scale';
        if (!el.id) el.id = 'Q_vis_table_' + Date.now();
        var prev = tool._currentForeground;
        if (prev) {
            prev.classList.add('Media_presentation_leaving');
            setTimeout(function () { if (prev.parentNode) prev.parentNode.removeChild(prev); }, 600);
        }
        tool._currentForeground = el;
        tool.element.appendChild(el);
        Q.activate(el, function () {
            var t = Q.Tool.from(el, 'Q/visualization/table');
            if (t) el._tableTool = t;
        });
    },

    // ── Compositor ─────────────────────────────────────────────────────────

    /**
     * Navigate to a specific slide index.
     * Routes through the canonical Media/presentation/command socket
     * event, which AI._navCommand picks up server-side and posts the
     * durable Media/presentation/slide message + VTT cue. All clients
     * listening on onMessage('Media/presentation/slide') react.
     *
     * The legacy stream.ephemeral('Streams/slide', ...) emission is gone;
     * Media's messages.json flags it as legacy and the listeners (pdf.js,
     * profile.js) now consume the durable message.
     *
     * @method goToSlide
     * @param {Number} index
     */
    goToSlide: function (index) {
        var tool = this;
        if (!tool._stream) return;
        var qs = Q.Socket.get('/Q', '');
        if (!qs) return;
        qs.socket.emit('Media/presentation/command', {
            intent:      'slide/navigate',
            slideIndex:  index,
            publisherId: tool._stream.fields.publisherId,
            streamName:  tool._stream.fields.name
        });
    },

    /**
     * Initialise the compositor layout.
     * @method _initCompositor
     * @private
     */
    _initCompositor: function (stream) {
        var tool  = this;
        var state = tool.state;

        var main = document.createElement('div');
        main.className = 'Media_presentation_main';
        while (tool.element.firstChild) {
            main.appendChild(tool.element.firstChild);
        }
        var pinned = document.createElement('div');
        pinned.className = 'Media_presentation_pinned';
        tool.element.appendChild(main);
        tool.element.appendChild(pinned);
        tool.element.classList.add('Media_presentation_compositor');
        tool._mainEl   = main;
        tool._pinnedEl = pinned;
        state._pinnedRatio = 0;
        tool._pinnedEl.style.flexGrow = '0';
        tool._mainEl.style.flexGrow   = '1';

        if (stream && stream.onMessage) {
            stream.onMessage('Media/presentation/pin').set(function (msg) {
                var d = _parseInstr(msg);
                if (d.publisherId && d.streamName) tool.pin(d.publisherId, d.streamName, d);
            }, tool);
            stream.onMessage('Media/presentation/unpin').set(function (msg) {
                var d = _parseInstr(msg);
                if (d.publisherId && d.streamName) tool.unpin(d.publisherId, d.streamName, d);
            }, tool);
            stream.onMessage('Media/presentation/resize').set(function (msg) {
                var d = _parseInstr(msg);
                if (d.ratio != null) tool.resize({ ratio: d.ratio, duration: d.duration });
            }, tool);
            stream.onMessage('Media/presentation/reorder').set(function (msg) {
                var d = _parseInstr(msg);
                if (d.items) tool.reorder({ items: d.items });
            }, tool);
            stream.onMessage('Media/presentation/slide').set(function (message) {
                var instr = {};
                try { instr = JSON.parse(message.instructions || '{}'); } catch (e) { }
                if (instr.index == null) return;
                state.slideIndex = instr.index;
                
                var subToolNames = [
                    'Media/presentation/pdf',
                    // future: 'Media/presentation/cardSeries', 'Media/presentation/gallery', etc.
                ];
                subToolNames.forEach(function (name) {
                    var className = '.' + name.replace(/\//g, '_') + '_tool';
                    tool.element.querySelectorAll(className).forEach(function (el) {
                        var t = Q.Tool.from(el, name);
                        if (t && typeof t.goToSlide === 'function') {
                            t.goToSlide(instr.index);
                        }
                    });
                });
            }, tool);
            stream.onMessage('Media/presentation/reveal').set(function (message) {
                var instr = {};
                try { instr = JSON.parse(message.instructions || '{}'); } catch (e) { }
                if (instr.index == null) return;
                state.revealIndex = instr.index;
                // Same dispatch pattern when sub-tools (e.g. profile cards) expose goToReveal.
            }, tool);
        }

        if (typeof ResizeObserver !== 'undefined') {
            tool._compositorObserver = new ResizeObserver(function () {
                tool._updateOrientation();
            });
            tool._compositorObserver.observe(tool.element);
        }
        tool._updateOrientation();
    },

    pin: function (publisherId, streamName, options) {
        var tool  = this;
        var state = tool.state;
        options = options || {};
        var key = publisherId + '\t' + streamName;
        if (state.pinnedItems.some(function (p) { return p.key === key; })) return tool;

        var cell = document.createElement('div');
        cell.className = 'Media_presentation_pinned_cell';
        cell.dataset.key = key;

        Q.Streams.get(publisherId, streamName, function (err, stream) {
            if (!cell.parentNode) return;
            if (err) {
                cell.innerHTML = '<div class="Media_presentation_pinned_error">'
                    + Q.htmlEscape(streamName) + '</div>';
                return;
            }
            var header = document.createElement('div');
            header.className = 'Media_presentation_pinned_header';
            header.textContent = stream.fields.title || streamName.split('/').pop();
            cell.appendChild(header);
            var body = document.createElement('div');
            body.className = 'Media_presentation_pinned_body';
            cell.appendChild(body);
            var el = Q.Tool.prepare('div', _toolForStreamType(stream.fields.type), {
                publisherId: publisherId,
                streamName:  streamName,
                mode:        'broadcast'
            }, null, tool.prefix);
            body.appendChild(el);
            Q.activate(el);
        });

        var pos = options.position;
        var items = state.pinnedItems;
        if (typeof pos === 'number' && pos < tool._pinnedEl.children.length) {
            tool._pinnedEl.insertBefore(cell, tool._pinnedEl.children[pos]);
            items.splice(pos, 0, { key: key, publisherId: publisherId, streamName: streamName });
        } else {
            tool._pinnedEl.appendChild(cell);
            items.push({ key: key, publisherId: publisherId, streamName: streamName });
        }

        var currentRatio = state._pinnedRatio || 0;
        var targetRatio  = options.size != null ? options.size : _autoRatio(items.length);
        if (currentRatio < 0.05) {
            tool.resize({ ratio: targetRatio, duration: options.duration });
        } else if (options.size != null) {
            tool.resize({ ratio: options.size, duration: options.duration });
        } else {
            tool.resize({ ratio: _autoRatio(items.length), duration: options.duration });
        }
        tool._updatePinnedLayout();
        return tool;
    },

    unpin: function (publisherId, streamName, options) {
        var tool  = this;
        var state = tool.state;
        options = options || {};
        var key  = publisherId + '\t' + streamName;
        var cell = tool._pinnedEl.querySelector('[data-key="' + CSS.escape(key) + '"]');
        if (cell) {
            cell.classList.add('Media_presentation_pinned_leaving');
            setTimeout(function () {
                if (cell.parentNode) cell.parentNode.removeChild(cell);
            }, 300);
        }
        state.pinnedItems = state.pinnedItems.filter(function (p) { return p.key !== key; });
        if (!state.pinnedItems.length) {
            tool.resize({ ratio: 0, duration: options.duration });
        } else {
            tool.resize({ ratio: _autoRatio(state.pinnedItems.length), duration: options.duration });
        }
        tool._updatePinnedLayout();
        return tool;
    },

    resize: function (options) {
        var tool     = this;
        var state    = tool.state;
        options      = options || {};
        var ratio    = Math.max(0, Math.min(1, options.ratio != null ? options.ratio : 0));
        var duration = options.duration != null
            ? options.duration
            : (state.resize && state.resize.duration != null ? state.resize.duration : 500);
        var transitionVal = 'flex-grow ' + duration + 'ms ease, flex ' + duration + 'ms ease';
        if (tool._mainEl) {
            tool._mainEl.style.transition = transitionVal;
            tool._mainEl.style.flexGrow   = String(1 - ratio);
            tool._mainEl.style.display    = (ratio >= 0.999) ? 'none' : '';
        }
        if (tool._pinnedEl) {
            tool._pinnedEl.style.transition = transitionVal;
            tool._pinnedEl.style.flexGrow   = String(ratio);
            tool._pinnedEl.style.display    = (ratio < 0.001) ? 'none' : '';
        }
        state._pinnedRatio = ratio;
        return tool;
    },

    reorder: function (options) {
        var tool  = this;
        var state = tool.state;
        var items = options && options.items;
        if (!items || !items.length) return tool;
        items.forEach(function (key, idx) {
            var cell = tool._pinnedEl.querySelector('[data-key="' + CSS.escape(key) + '"]');
            if (cell) cell.style.order = idx;
            var item = state.pinnedItems.find(function (p) { return p.key === key; });
            if (item) item.order = idx;
        });
        state.pinnedItems.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
        return tool;
    },

    _updatePinnedLayout: function () {
        var tool = this;
        var n    = tool.state.pinnedItems.length;
        tool._pinnedEl.dataset.count = n;
        var cols, rows;
        if (n <= 1)      { cols = 1; rows = 1; }
        else if (n <= 2) { cols = 1; rows = 2; }
        else if (n <= 4) { cols = 2; rows = 2; }
        else             { cols = 3; rows = Math.ceil(n / 3); }
        if (tool.element.classList.contains('Media_presentation_portrait')) {
            var tmp = cols; cols = rows; rows = tmp;
        }
        tool._pinnedEl.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
        tool._pinnedEl.style.gridTemplateRows    = 'repeat(' + rows + ', 1fr)';
    },

    _updateOrientation: function () {
        var tool = this;
        var w = tool.element.offsetWidth;
        var h = tool.element.offsetHeight;
        if (!w || !h) return;
        var isPortrait = h > w;
        tool.element.classList.toggle('Media_presentation_portrait',  isPortrait);
        tool.element.classList.toggle('Media_presentation_landscape', !isPortrait);
        tool.element.style.flexDirection = isPortrait ? 'column' : 'row';
        tool._updatePinnedLayout();
    }
});

// ── Module-scope helpers ───────────────────────────────────────────────────────

function _bgJitter(base) {
    function j(v) { return Math.max(0, Math.min(1, v + (Math.random() - 0.5) * 0.12)); }
    return { left: j(base.left), top: j(base.top), width: j(base.width), height: j(base.height) };
}

function _parseInstr(msg) {
    try { return JSON.parse(msg.fields.instructions || '{}'); } catch (e) { return {}; }
}

function _toolForStreamType(streamType) {
    var map = {
        'Media/slide':              'Media/slide',
        'Media/presentation':       'Media/presentation',
        'Streams/chat':             'Streams/chat',
        'Streams/image/album':      'Streams/image/album',
        'Media/webrtc':             'Media/webrtc',
        'Media/webrtc/livestream':  'Media/webrtc/livestream',
        'Streams/video':            'Streams/video/preview',
        'Streams/audio':            'Streams/audio/preview',
        'Streams/pdf':              'Streams/pdf/preview',
        'Q/visualization/graph':    'Q/visualization/graph',
        'Q/visualization/table':    'Q/visualization/table'
    };
    return map[streamType] || (streamType + '/preview') || 'Streams/preview';
}

function _autoRatio(n) {
    if (n <= 0) return 0;
    if (n === 1) return 0.35;
    if (n === 2) return 0.42;
    return 0.5;
}

// ── Event hooks ───────────────────────────────────────────────────────────────

Q.Media = Q.Media || {};
Q.Media.Presentation = Q.Media.Presentation || {};

/**
 * Fired when a generated tool needs to be replayed.
 * @event Q.Media.Presentation.onShowTool
 */
Q.Media.Presentation.onShowTool = new Q.Event();

// Legacy alias used by older code
Q.Media.onPresentationToolShow = Q.Media.Presentation.onShowTool;

})(Q, Q.jQuery, window);

Q.Template.set('Media/presentation',
    `<div class="Media_presentation_screen Media_presentation_title_screen">
        <div class="Media_presentation_title"></div>
        <div class="Media_presentation_presenters">
        {{#each presentingUserIds}}
            {{{tool "Users/avatar" userId=this}}}
        {{/each}}
        </div>
    </div>`
);
