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
    Q.Tool.define("Media/presentation", function (options) {
        var tool = this;
        var state = tool.state;
        tool.stack = [];

        tool.element.style.cursor = 'pointer';

        if (state.publisherId && state.streamName) {
            Streams.retainWith(tool).get(state.publisherId, state.streamName,
                function (err, stream) {
                    if (err) {
                        //debugger;
                        return;
                    }

                    tool._stream = stream;

                    if (!Q.isEmpty(state.show)) {
                        tool.show(
                            state.show.publisherId,
                            state.show.streamName
                        );
                    }

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

                        tool._reconstructPresentationState();
                    }).catch(function (e) {
                        console.error(e);
                    });
                }, {
                participants: 100
            });

            // try to preload related tools
            Q.Streams.Tool.preloadRelated(state.publisherId, state.streamName, tool.element);
        }
        tool.cardSwitchQueue = [];
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
            /**
             * Per-visualizationType max width for AI-proposed inline cards
             * (see _showInlineCard) -- each value is either a bare
             * percentage string ("70%", applied as max-width so the card
             * can use more of a wide screen instead of being capped at a
             * fixed px width meant for compact single-focus cards) or a
             * literal CSS declaration string ("max-width: 900px"). A type
             * not listed here falls back to "default". Compact,
             * single-focus types (stat/quote/profile/glossary/article) are
             * intentionally left out so they keep the modest default width
             * instead of being stretched to fill a large screen -- only
             * multi-column/freeform layouts that actually benefit from
             * extra horizontal room are listed explicitly.
             */
            cardSizing: {
                'Media/card/slide':      '90%',
                'Media/card/comparison': '70%',
                'default':               'max-width: 860px'
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
                return new Promise(function (resovle, reject) {
                    if (tool.current.publisherId === publisherId
                        && tool.current.streamName === streamName) {
                        resovle();    
                        return tool.current.tool.nextState && tool.current.tool.nextState();
                    }
                    Streams.get(publisherId, streamName)
                        .then(function (stream) {
                            var toolName = state.displayTools[stream.fields.type];
                            if (typeof toolName == 'function') {
                                toolName = toolName(stream);
                            }
                            if (!toolName) {
                                resovle();
                                return console.warn("Media/presentation: no tool defined for displaying " + stream.fields.type);
                            }
                            if (!Q.Tool.defined(toolName)) {
                                resovle();
                                return console.warn("Media/presentation: tool " + toolName + " for rendering " + stream.fields.type + " was not defined");
                            }
                            if (!stream.testReadLevel('content')) {
                                resovle();
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

                            var current = tool.stack[tool.stack.length - 1]
                                || tool.element.getElementsByClassName('Media_presentation_screen')[0];
                            tool.stack.push(next);
                            Q.activate(next, function () {
                                tool._transition(next, current);
                                tool.current.publisherId = publisherId;
                                tool.current.streamName = streamName;
                                tool.current.tool = this;
                                if(tool._bgGalleryTool && tool._bgGalleryTool._gallery) {
                                    tool._bgGalleryTool._gallery.pause();
                                }
                                resovle();
                            });
                        }).catch(function (exception) {
                            //debugger;
                        });
                })

            },
            hide: function (publisherId, streamName, toolName) {
                var tool = this;

                var displayTools = {
                    'q_image': 'Media_presentation_image',
                    'q_video': 'Media_presentation_video',
                    'q_audio': 'Media_presentation_audio',
                    'q_pdf': 'Media_presentation_pdf',
                    'streams_webpage': 'Media_presentation_webpage',
                    'streams_question': 'Media_presentation_question'
                };

                toolName = displayTools[toolName];
                if(!toolName) return;
                var activeTools = Q.Tool.byName(toolName);
                var toolsArr = Object.values(activeTools);
                toolsArr.forEach(function (toolItem) {
                    if(toolItem.state.publisherId == publisherId
                        && toolItem.state.streamName == streamName
                    ) {
                        if (tool.current.tool == toolItem) {
                            tool.current = {};
                            if (tool._bgGalleryTool && tool._bgGalleryTool._gallery) {
                                tool._bgGalleryTool._gallery.play();
                            }
                        }
                        tool._exitElement(toolItem.element).then(function () {
                            Q.Tool.remove(activeTools);
                        });
                    }
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
                    tool.element.classList.remove('Media_presentation_leaving');
                }
                next.style.display = 'block';
                if (!current) return Promise.resolve();
                return tool._exitElement(current);
            },

            _exitElement: function (element, options = {}) {
                if (!element || !element.parentNode) return Promise.resolve();
                return new Promise(function (resolve, reject) {
                    element.classList.remove('Media_presentation_transition_rise');
                    element.classList.add('Media_presentation_leaving_start');

                    function removeEl() {
                            console.log('_exitElement resolve 1')
                        element.classList.remove('Media_presentation_leaving_start');
                        if (element.parentNode) element.parentNode.removeChild(element);
                        resolve();
                    }
                    setTimeout(function () {
                        element.addEventListener("transitionstart", function () {
                                console.log('_exitElement transitionstart ')

                        }, { once: true });
                        console.log('_exitElement 1')
                        var handler = options.doNotRemove !== true ? removeEl : function () {
                            console.log('_exitElement resolve 2')
                            resolve();
                        }
                        element.addEventListener('transitionend', handler, { once: true });
                        element.classList.add('Media_presentation_leaving');
                        var done = false;

                    }, 50);
                    
                    //setTimeout(remove, timeoutMs || 500);
                });
            },

            _initEphemerals: function (stream) {
                var tool = this;

                stream.onEphemeral('Media/presentation/graph/update').set(function (e) {
                    if (e && e.action) {
                        tool._updateGraph(e);
                    }
                }, tool);
                stream.onEphemeral('Media/presentation/table/update').set(function (e) {
                    if (e && e.action) {
                        tool._updateTable(e);
                    }
                }, tool);
                stream.onEphemeral('Media/presentation/reaction/burst').set(function (e) {
                    if (e && e.emoji) {
                        tool._showReaction(e.emoji);
                    }
                }, tool);
                stream.onEphemeral('Media/livestream/reaction').set(function (e) {
                    if (e && e.reaction) {
                        tool._showReaction(e.reaction);
                    }
                }, tool);
                stream.onEphemeral('Q/style').set(function (e) {
                    if (!e) return;
                    Q.handle(Q.Socket.onEvent('Q/style'), tool, [e]);
                }, tool);
            },

            // ── Background gallery ─────────────────────────────────────────────────

            _initBackground: function (stream) {
                var tool = this;
                var state = tool.state;
                if(tool._bgElement) return;
                // Background container — positioned behind slides via CSS
                var bg = document.createElement('div');
                bg.className = 'Media_presentation_background';
                tool.element.insertBefore(bg, tool.element.firstChild);
                tool._bgElement = bg;

                // The Media/gallery sub-tool owns:
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

                $(galleryDiv).tool('Media/gallery', {
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
                    tool._bgGalleryTool = Q.Tool.from(galleryDiv, 'Media/gallery');
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
                    laugh: '{{Media}}/img/reactions/laugh_100.png',
                    cry: '{{Media}}/img/reactions/cry_100.png',
                    angry: '{{Media}}/img/reactions/angry_100.png',
                    exploding: '{{Media}}/img/reactions/exploding_100.png',
                    liar: '{{Media}}/img/reactions/liar_100.png',
                    sick: '{{Media}}/img/reactions/sick_100.png',
                    applause: '{{Media}}/img/reactions/clap_100.png',
                    thumbUp: '{{Media}}/img/reactions/thumbUp_100.png',
                    thumbDown: '{{Media}}/img/reactions/thumbDown_100.png'
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
                    { type: 'thumbUp', src: '{{Media}}/img/reactions/thumbUp_100.png' },
                    { type: 'applause', src: '{{Media}}/img/reactions/clap_100.png' },
                    { type: 'laugh', src: '{{Media}}/img/reactions/laugh_100.png' },
                    { type: 'exploding', src: '{{Media}}/img/reactions/exploding_100.png' },
                    { type: 'cry', src: '{{Media}}/img/reactions/cry_100.png' },
                    { type: 'angry', src: '{{Media}}/img/reactions/angry_100.png' },
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
             * Size an inline card per state.cardSizing (see its doc comment
             * above for the config shape) -- two distinct modes:
             *   - A bare percentage ("70%"): the card is scaled UNIFORMLY,
             *     in EITHER direction, so it touches that percentage of the
             *     viewport in whichever dimension binds first (like
             *     object-fit:contain, but also scaling UP past 100% for
             *     content smaller than the target -- see _fitCardToPercent).
             *     A max-width alone can only ever shrink oversized content;
             *     it leaves short content at its own small natural size.
             *   - A literal CSS declaration ("max-width: 900px"): applied
             *     as-is, a simple ceiling with no scaling -- content
             *     smaller than this is left at its natural size. This is
             *     presentation.css's shared .Media_presentation_card_screen
             *     rule's old behavior, still the right choice for compact,
             *     single-focus types that shouldn't be blown up to fill a
             *     large screen.
             * Must be called AFTER cardEl is attached to the document --
             * percentage mode measures real rendered size, which a detached
             * node doesn't have.
             * @method _applyCardSizing
             * @param {HTMLElement} cardEl
             * @param {String} streamType
             */
            _applyCardSizing: function (cardEl, streamType) {
                var tool = this;
                var pct = tool._percentSizingFor(streamType);
                if (pct != null) {
                    tool._fitCardToPercent(cardEl, pct);
                } else {
                    var sizing = tool.state.cardSizing || {};
                    var rule = sizing[streamType] || sizing['default'] || 'max-width: 860px';
                    cardEl.style.cssText += ';' + rule;
                }
            },

            /**
             * Look up streamType in state.cardSizing and, if it's a bare
             * percentage, return the number -- else null (flat CSS
             * declaration, or nothing configured). Shared by
             * _applyCardSizing and _showInlineCard, which needs to know
             * this BEFORE cardEl is even attached (see _showInlineCard's
             * pre-hide for percent-mode cards).
             * @method _percentSizingFor
             * @param {String} streamType
             * @return {Number|null}
             */
            _percentSizingFor: function (streamType) {
                var sizing = this.state.cardSizing || {};
                var rule = sizing[streamType] || sizing['default'] || 'max-width: 860px';
                var pctMatch = /^\s*(\d+(?:\.\d+)?)\s*%\s*$/.exec(rule);
                return pctMatch ? parseFloat(pctMatch[1]) : null;
            },

            /**
             * Uniformly scale cardEl ITSELF (via CSS transform, preserving
             * aspect ratio -- background, padding, border-radius, shadow,
             * content, all together as one unit) so its bounding box
             * touches pct% of the viewport in whichever dimension binds
             * first: shrinking it if naturally larger, growing it if
             * naturally smaller. Never distorts aspect ratio (one scale
             * factor for both axes), so the result is AT MOST pct% in one
             * dimension and EXACTLY pct% in the other, not necessarily
             * pct% of total area.
             *
             * An earlier version of this scaled an inner wrapper around
             * cardEl's content instead of cardEl itself, then tried to
             * make cardEl's fit-content sizing follow that wrapper's new
             * size -- but left .Media_presentation_card_screen's
             * max-width: 860px in place, which silently kept capping
             * cardEl at 860px regardless, decoupling it from the
             * (uncapped) wrapper and clipping/overflowing content grown
             * past that cap. Scaling cardEl directly avoids needing that
             * two-box relationship at all: clear the cap, measure cardEl's
             * own true natural size, scale cardEl.
             * @method _fitCardToPercent
             * @param {HTMLElement} cardEl
             * @param {Number} pct
             */
            _fitCardToPercent: function (cardEl, pct) {
                var tool = this;
                var frac = (pct || 0) / 100;
                if (!frac) return;

                // Percent mode replaces the flat cap entirely -- leaving it
                // in place would clamp cardEl's natural size to 860px
                // before this ever gets to measure or scale it. Using a
                // large-but-FINITE value rather than 'none' matters here:
                // 'none' was observed to change how width:fit-content
                // resolves for cardEl's nested width:100%-ish children
                // (.Media_presentation_hero etc.) -- they filled whatever
                // width cardEl was allowed instead of shrinking to their
                // real content's need, leaving a big empty gap next to a
                // much narrower visible card. A large finite max-width
                // keeps the same "clamp, don't remove" resolution path the
                // old max-width: 860px rule used (which correctly shrank
                // to content for anything narrower than 860px), just with
                // enough room that it only ever acts as a safety ceiling.
                cardEl.style.maxWidth = '10000px';

                // Measuring right here would be too early for a card type
                // whose own content renders asynchronously (e.g. a nested
                // tool activation or template render inside cardEl that
                // hasn't resolved yet) -- offsetWidth/offsetHeight would
                // catch it still nearly-empty, computing an absurd
                // compensating scale (a comparison card was observed
                // scaling to 7.97x this way). Wait for the size to actually
                // stop changing before trusting it.
                tool._whenSizeSettled(cardEl, function () {
                    var naturalW = cardEl.offsetWidth;
                    var naturalH = cardEl.offsetHeight;
                    // Reveal regardless of whether a valid scale comes out
                    // of this -- cardEl was hidden (see _showInlineCard)
                    // specifically to wait for scaling here, so any early
                    // return below must still hand back control, or a
                    // measurement edge case would leave the card invisible
                    // forever instead of just unscaled.
                    if (!naturalW || !naturalH) { tool._revealScaledCard(cardEl); return; }

                    var targetW = window.innerWidth  * frac;
                    var targetH = window.innerHeight * frac;
                    var scale   = Math.min(targetW / naturalW, targetH / naturalH);
                    if (!scale || !isFinite(scale)) { tool._revealScaledCard(cardEl); return; }

                    tool._whenAnimationSettled(cardEl, function () {
                        // .Media_presentation_transition_rise's @keyframes
                        // animation (added to cardEl in _showInlineCard)
                        // holds transform via animation-fill-mode:
                        // forwards, which takes cascade priority over ANY
                        // style rule -- inline included -- for as long as
                        // it's considered active, which with "forwards" is
                        // forever, not just during playback. Setting
                        // transform while that hold is in effect is
                        // silently ignored (Chrome DevTools flags this as
                        // "Overridden by animation styles"). Killing the
                        // animation via inline style first releases the
                        // hold and hands transform back to the normal
                        // cascade.
                        //
                        // cardEl's actual centering comes from its FLEX
                        // parent (.Media_presentation_ai_tools:
                        // display:flex; justify-content:center;
                        // align-items:center) -- despite
                        // .Media_presentation_card_screen also declaring
                        // position:relative + transform:translateY(-50%) (a
                        // leftover top:50%-based centering technique whose
                        // top:50% half is commented out in
                        // presentation.css, so it was never actually
                        // centering anything; it was just as silently
                        // overridden by Media_rise as our own transform
                        // was, so it never visibly mattered before now).
                        // Composing translateY(-50%) in here -- as an
                        // earlier version of this did -- double-shifts the
                        // card, since flex already centers its
                        // untransformed box and this then moves it up by
                        // another 50% of its own height on top of that.
                        // scale() alone, with the default (center)
                        // transform-origin, keeps the box centered on
                        // whatever point flex already placed it at,
                        // growing/shrinking symmetrically around it.
                        cardEl.style.animation = 'none';
                        cardEl.style.transform = 'scale(' + scale + ')';
                        tool._revealScaledCard(cardEl);
                    });
                });
            },

            /**
             * Fade cardEl in now that its final (scaled) size is set --
             * paired with _showInlineCard hiding it (visibility: hidden,
             * not opacity, which stays measurable) as soon as it's created
             * for any percent-sized type, so the card never has a chance
             * to flash at its wrong, unscaled size before this runs.
             * Killing Media_rise's animation earlier already left opacity
             * wherever that animation's "to" keyframe held it (1, in
             * practice) rather than the animation's own "from" (0), so
             * this explicitly sets a 0 starting point itself, then forces
             * a paint (double rAF -- one isn't reliably enough for the
             * browser to register the starting value before the next
             * change, a well-known transition gotcha) before transitioning
             * to visible/opaque, or the fade wouldn't visibly play at all.
             * @method _revealScaledCard
             * @param {HTMLElement} cardEl
             */
            _revealScaledCard: function (cardEl) {
                cardEl.style.transition = 'none';
                cardEl.style.opacity    = '0';
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        cardEl.style.visibility = 'visible';
                        cardEl.style.transition = 'opacity 0.35s ease';
                        cardEl.style.opacity    = '1';
                    });
                });
            },

            /**
             * Call cb once el's size stops changing (debounced via
             * ResizeObserver), instead of assuming any single fixed delay
             * is long enough for whatever async work el's content is still
             * doing. Falls back to a fixed delay only if ResizeObserver
             * isn't available at all.
             * @method _whenSizeSettled
             * @param {HTMLElement} el
             * @param {Function} cb
             */
            _whenSizeSettled: function (el, cb) {
                if (typeof ResizeObserver === 'undefined') {
                    setTimeout(cb, 150);
                    return;
                }
                var done = false;
                var settleTimer = null;
                var capTimer = null;
                function finish() {
                    if (done) return;
                    done = true;
                    clearTimeout(settleTimer);
                    clearTimeout(capTimer);
                    ro.disconnect();
                    cb();
                }
                var ro = new ResizeObserver(function () {
                    clearTimeout(settleTimer);
                    settleTimer = setTimeout(finish, 120);
                });
                ro.observe(el);
                // Absolute cap in case something prevents ResizeObserver
                // from ever settling (or firing at all) -- better to
                // measure a possibly-still-growing size late than to hang
                // forever and never apply any sizing.
                capTimer = setTimeout(finish, 2000);
            },

            /**
             * Call cb once none of el's CSS animations are still running or
             * pending -- using the Web Animations API's per-animation
             * .finished promise, not a guessed timeout, since
             * animation-fill-mode: forwards means an animation stays
             * "present" on the element indefinitely after it completes, so
             * a naive style/attribute check can't distinguish "still
             * playing" from "finished but held".
             * @method _whenAnimationSettled
             * @param {HTMLElement} el
             * @param {Function} cb
             */
            _whenAnimationSettled: function (el, cb) {
                if (typeof el.getAnimations !== 'function') {
                    setTimeout(cb, 450);
                    return;
                }
                var pending = el.getAnimations().filter(function (a) {
                    return a.playState === 'running' || a.playState === 'pending';
                });
                if (!pending.length) {
                    cb();
                    return;
                }
                Promise.all(pending.map(function (a) {
                    return a.finished.catch(function () {});
                })).then(cb);
            },

            /**
             * Show an AI-proposed card or chart inline on the canvas.
             * streamType maps to a presentation wrapper tool.
             * visualizationData is passed as the tool's state (inline: true skips stream fetch).
             * @method _showInlineCard
             */
            _showInlineCard: function (streamType, visualizationType, visualizationData) {
                var tool = this;
                if (tool.pendingCardSwitching) {
                    //log('updateWebRTCCanvasLayout: pendingLayoutUpdate: cancel')
                    tool.cardSwitchQueue.push({ args: Array.prototype.slice.call(arguments) });
                    return;
                }
                var displayTools = {
                    'Media/card/stat': 'Media/presentation/card/stat',
                    'Media/card/glossary': 'Media/presentation/card/glossary',
                    'Media/card/profile': 'Media/presentation/card/profile',
                    'Media/card/quote': 'Media/presentation/card/quote',
                    'Media/card/article': 'Media/presentation/card/article',
                    'Media/card/comparison': 'Media/presentation/card/comparison',
                    'Media/chart/bar': 'Media/presentation/chart/bar',
                    'Media/chart/line': 'Media/presentation/chart/line',
                    'Media/card/slide': 'Media/presentation/card/slide',
			        'Media/card/map': 'Places/directions',
                };
                var toolName = displayTools[streamType];
                if (!toolName) return;

                if(typeof visualizationData == 'string') {
                    visualizationData = JSON.parse(visualizationData);
                }
                var cardEl = Q.Tool.prepare(
                    'div', toolName,
                    Q.extend({}, visualizationData, { inline: true }),
                    null, tool.prefix
                );
                cardEl.className += ' Media_ai_tool Media_presentation_screen Media_presentation_card_screen Media_presentation_transition_rise';
                // Percent-sized cards need async measurement (see
                // _fitCardToPercent) before their final size is known --
                // without this, the card briefly appears and plays its
                // entrance animation at the WRONG (natural, unscaled) size,
                // then visibly snaps to the correct one a moment later.
                // Hiding via visibility (not display:none, which would
                // report 0 for offsetWidth/offsetHeight and break
                // measurement, and not opacity, which the entrance
                // animation is already driving) keeps it fully measurable
                // while invisible; _fitCardToPercent reveals it with its
                // own fade-in once the real scale is applied.
                if (tool._percentSizingFor(streamType) != null) {
                    cardEl.style.visibility = 'hidden';
                }

                var prev = tool._currentForeground;
                if (prev) {
                    console.log('aaaaaaa 1')
                    tool._hideForeground(prev).then(function () {

                        console.log('aaaaaaa 2')
                        activateCardTool();
                    });
                } else {
                    activateCardTool();
                }

                tool._currentForeground = cardEl;
                tool._currentForegroundTool = cardEl;

                function activateCardTool() {
                    console.log('aaaaaaa 3')
                    tool.pendingCardSwitching = true;
                    Q.activate(cardEl, {}, function () {
                        var cardTool = tool._currentForegroundTool = this;
                        tool.aiToolsElement.appendChild(cardEl);
                        // Must run AFTER attaching -- percent-based sizing
                        // measures cardEl's rendered content, which has no
                        // real layout size until it's actually in the
                        // document (Q.activate above runs the card tool's
                        // own constructor while cardEl is still detached).
                        tool._applyCardSizing(cardEl, streamType);
                        //debugger
                        tool.pendingCardSwitching = false;
                        if (tool.cardSwitchQueue.length != 0) {
                            let queueItem = tool.cardSwitchQueue.splice(0, 1)[0];
                            tool._showInlineCard.apply(null, queueItem.args)
                        }
                        
                    });
                }
            },
            _hideForeground: function (foreground) {
                var tool = this;
                console.log('_hideForeground', foreground)
                if(!foreground) foreground = tool._currentForeground;
                return new Promise(function (resolve, reject) {
                    tool._exitElement(foreground).then(function () {
                        resolve();
                    }).catch(function (e) {
                        console.error(e);
                    });
                });
            },
            _activateGeneratedTool: function (toolName, code, extraOptions) {
                var tool = this;
                var version = (extraOptions && extraOptions.version) || 1;
                var storageKey = toolName + '/v' + version;
                try { sessionStorage.setItem(storageKey, code); } catch (e) { }
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
                    mode: 'broadcast',
                    publisherId: tool.state && tool.state.publisherId,
                    streamName: tool.state && tool.state.streamName,
                    writeLevel: tool.state && tool.state.writeLevel || 16
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
                try { code = sessionStorage.getItem(storageKey); } catch (e) { }
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
                    mode: 'broadcast',
                    publisherId: tool.state && tool.state.publisherId,
                    streamName: tool.state && tool.state.streamName,
                    nodes: data.nodes || [],
                    edges: data.edges || [],
                    stream: null
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

                var rawRows = data.rows || [];
                var hasImages = rawRows.length && rawRows[0]
                    && typeof rawRows[0] === 'object' && !Array.isArray(rawRows[0]);
                var normHeaders = hasImages && data.headers && data.headers.length
                    ? [''].concat(data.headers) : (data.headers || []);

                var opts = {
                    mode: 'broadcast',
                    publisherId: tool.state && tool.state.publisherId,
                    streamName: tool.state && tool.state.streamName,
                    headers: normHeaders,
                    rows: normalizeRows(rawRows),
                    highlight: data.highlight || [],
                    stream: null
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
                    intent: 'slide/navigate',
                    slideIndex: index,
                    publisherId: tool._stream.fields.publisherId,
                    streamName: tool._stream.fields.name
                });
            },

            /**
             * Initialise the compositor layout.
             * @method _initCompositor
             * @private
             */
            _initCompositor: function (stream) {
                var tool = this;
                var state = tool.state;

                tool.titleScreen = tool.element.querySelector('.Media_presentation_title_screen');
                
                var main = document.createElement('div');
                main.className = 'Media_presentation_main';
                while (tool.element.firstChild) {
                    main.appendChild(tool.element.firstChild);
                }
                var pinned = document.createElement('div');
                pinned.className = 'Media_presentation_pinned';
                var aiTools = tool.aiToolsElement = document.createElement('div');
                aiTools.className = 'Media_presentation_ai_tools';
                tool.element.appendChild(main);
                tool.element.appendChild(pinned);
                tool.element.appendChild(aiTools);
                tool.element.classList.add('Media_presentation_compositor');
                tool._mainEl = main;
                tool._pinnedEl = pinned;
                state._pinnedRatio = 0;
                tool._pinnedEl.style.flexGrow = '0';
                tool._mainEl.style.flexGrow = '1';

                const config = {
                    attributes: false,       // Watch for attribute changes (e.g., class, style, id)
                    childList: true,        // Watch for additions or removals of child elements
                    subtree: true,          // Watch the targetNode and all of its nested children
                    characterData: false,
                    attributeOldValue: false 
                };

                const onCardShow = function (mutationsList, observer) {
                    for (const mutation of mutationsList) {
                        if(tool.aiToolsElement.childElementCount !== 0) {
                            if (tool.titleScreen && !tool.titleScreen.classList.contains('Media_presentation_leaving')) {
                                tool._exitElement(tool.titleScreen, { doNotRemove: true })
                            } 
                        } else {
                            tool.titleScreen.classList.remove('Media_presentation_leaving');
                        }
                    }
                };

                const observer = new MutationObserver(onCardShow);

                observer.observe(tool.aiToolsElement, config);

                if (stream && stream.onMessage) {

                    stream.onMessage('Media/presentation/show').set(function (msg) {
                        tool._applyByType('Media/presentation/show', msg.instructions);
                    }, tool);

                    stream.onMessage('Media/presentation/hide').set(function (msg) {
                        tool._applyByType('Media/presentation/hide', msg.instructions);
                    }, tool);

                    stream.onMessage('Media/presentation/card/show').set(function (msg) {
                        tool._applyByType('Media/presentation/card/show', msg.instructions);
                    }, tool);

                    stream.onMessage('Media/presentation/slide').set(function (msg) {
                        tool._applyByType('Media/presentation/slide', msg.instructions);
                    }, tool);

                    stream.onMessage('Media/presentation/reveal').set(function (msg) {
                        tool._applyByType('Media/presentation/reveal', msg.instructions);
                    }, tool);

                    stream.onMessage('Media/presentation/pin').set(function (msg) {
                        tool._applyByType('Media/presentation/pin', msg.instructions);
                    }, tool);

                    stream.onMessage('Media/presentation/unpin').set(function (msg) {
                        tool._applyByType('Media/presentation/unpin', msg.instructions);
                    }, tool);

                    stream.onMessage('Media/presentation/resize').set(function (msg) {
                        tool._applyByType('Media/presentation/resize', msg.instructions);
                    }, tool);

                    stream.onMessage('Media/presentation/reorder').set(function (msg) {
                        tool._applyByType('Media/presentation/reorder', msg.instructions);
                    }, tool);

                    stream.onMessage('Streams/gallery/query').set(function (msg) {
                        tool._applyByType('Streams/gallery/query', msg.instructions);
                    }, tool);

                    // And for the content-stream ephemerals — register on each
                    // content stream when tool.show fetches it, route through _applyByType too:
                    stream.onEphemeral('Streams/scroll').set(function (ephemeral) {
                        tool._applyByType('Streams/scroll', ephemeral);
                    }, tool);
                    stream.onEphemeral('Streams/play').set(function (ephemeral) {
                        tool._applyByType('Streams/play', ephemeral);
                    }, tool);
                    stream.onEphemeral('Streams/pause').set(function (ephemeral) {
                        tool._applyByType('Streams/pause', ephemeral);
                    }, tool);
                    stream.onEphemeral('Streams/seek').set(function (ephemeral) {
                        tool._applyByType('Streams/seek', ephemeral);
                    }, tool);

                    /* stream.onMessage('Media/presentation/show').set(function (msg) {
                        var instr = {};
                        try { instr = JSON.parse(msg.instructions || '{}'); } catch (e) { }
                        if (instr.publisherId && instr.streamName) {
                            tool.show(instr.publisherId, instr.streamName);
                        }
                    }, tool);
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
                            // future: 'Media/presentation/cardSeries', 'Media/gallery', etc.
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
                    }, tool); */
                }

                if (typeof ResizeObserver !== 'undefined') {
                    tool._compositorObserver = new ResizeObserver(function () {
                        tool._updateOrientation();
                    });
                    tool._compositorObserver.observe(tool.element);
                }
                tool._updateOrientation();
            },
            _reconstructPresentationState: function () {
                var tool = this;
                var state = tool.state;

                var PRESENTATION_STATE_TYPES = [
                    'Media/presentation/show',
                    'Media/presentation/hide',
                    'Media/presentation/slide',
                    'Media/presentation/reveal',
                    'Media/presentation/pin',
                    'Media/presentation/unpin',
                    'Media/presentation/resize',
                    'Media/presentation/reorder',
                    'Streams/gallery/query',
                    'Streams/gallery/pause',
                    'Streams/gallery/resume'
                ];

                var CONTENT_STATE_TYPES = [
                    'Streams/play',     // before seek so seek's pos wins
                    'Streams/pause',
                    'Streams/seek',
                    'Streams/scroll',
                    'Streams/zoom'
                ];

                Q.Streams.Message.get(state.publisherId, state.streamName, {
                    types: PRESENTATION_STATE_TYPES,
                    limit: PRESENTATION_STATE_TYPES.length * 2,
                    ascending: false
                }, async function (err, messages) {
                    if (err || !messages) {
                        tool._applyContentStateForCurrent(CONTENT_STATE_TYPES);
                        return;
                    }

                    messages = Object.values(messages);
                    if (!messages.length) return;

                    // Group by type, keep most recent of each
                    var latest = tool._groupLatestByType(messages);

                    // Apply show first — it mounts the content sub-tool and
                    // populates tool.current with the content stream's coordinates.
                    var showMsg = latest['Media/presentation/show'];
                    var hideMsg = latest['Media/presentation/hide'];
                    if (showMsg) {

                        var show = true;
                        if (hideMsg) {
                            var hideInstructions = JSON.parse(hideMsg.instructions)
                            var showInstructions = JSON.parse(showMsg.instructions)
                            if (showInstructions.toolName == hideInstructions.toolName) {
                                show = (hideInstructions.publisherId != showInstructions.publisherId
                                    && hideInstructions.streamName != showInstructions.streamName);
                            }
                        }
                        if (show) {
                            await tool._applyByType('Media/presentation/show', showMsg.instructions);
                            var presentationStartAlert = document.querySelector('.Media_presentation_start_alert');
                            if (presentationStartAlert) {
                                Q.Dialogs.close(presentationStartAlert);
                            }
                        }
                    }

                    setTimeout(function () {
                        // Defer remaining presentation-level state until sub-tool mounts.
                        // Then chain into phase 2 against the now-known content stream.
                        PRESENTATION_STATE_TYPES.forEach(function (type) {
                            if (type === 'Media/presentation/show') return;
                            var msg = latest[type];
                            if (msg) tool._applyByType(type, msg.instructions);
                        });

                        tool._applyContentStateForCurrent(CONTENT_STATE_TYPES);
                    }, 3000)
                });
            },
            /**
             * Phase 2 of state reconstruction: fetch latest state messages from
             * the currently-active content stream (populated by phase 1's show
             * message) and apply them.
             *
             * Called after phase 1 completes and tool.show has mounted the
             * content sub-tool. If no content is currently shown, no-op.
             *
             * @param {Array<String>} types  Content-stream message types to fetch
             */
            _applyContentStateForCurrent: function (types) {
                var tool = this;
                var current = tool.current;
                if (!current || !current.publisherId || !current.streamName) return;

                Q.Streams.Message.get(current.publisherId, current.streamName, {
                    types: types,
                    limit: types.length * 2,
                    ascending: false
                }, function (err, messages) {
                    if (err || !messages) return;

                    messages = Object.values(messages);

                    if (!messages.length) return;

                    var latest = tool._groupLatestByType(messages);

                    // Apply in explicit order so seek wins over play's position
                    // (play sets pos baseline, seek refines).
                    types.forEach(function (type) {
                        var msg = latest[type];
                        if (msg) tool._applyByType(type, msg.instructions);
                    });
                });
            },
            _groupLatestByType: function (messages) {
                var latest = {};
                messages.forEach(function (m) {
                    latest[m.type] = m;
                });
                return latest;
            },
            /**
             * Apply a state-bearing message to the presentation's UI on reconstruction.
             * Routes by message type to the active content sub-tool (tool.current.tool)
             * and the right mutation.
             *
             * Called from _reconstructPresentationState (mount-time, latest-per-type)
             * and from the live onMessage handlers — same dispatcher, both paths.
             *
             * Assumes Media/presentation/show has been applied first when relevant —
             * everything else operates on whatever sub-tool show() left mounted.
             *
             * @param {String}        type   Message type, e.g. 'Streams/scroll'
             * @param {Object|String} instr  Parsed instructions object, or JSON string
             */
            _applyByType: async function (type, instr) {
                var tool = this;
                var state = tool.state;

                if (typeof instr === 'string') {
                    try { instr = JSON.parse(instr || '{}'); }
                    catch (e) { return; }
                }
                if (!instr || typeof instr !== 'object') return;

                if (instr.instructions) {
                    if (typeof instr.instructions === 'string') {
                        try { instr = JSON.parse(instr.instructions || '{}'); }
                        catch (e) { return; }
                    }
                }
                switch (type) {

                    // ── Active content swap ───────────────────────────────────────
                    // Updates tool.current via tool.show(). Other state types apply
                    // to whatever sub-tool this leaves mounted, so process this first
                    // on mount reconstruction.
                    case 'Media/presentation/show':
                        if (instr.publisherId && instr.streamName) {
                            await tool.show(instr.publisherId, instr.streamName);
                        }
                        return;
                    case 'Media/presentation/card/show':
                        /* if (instr.publisherId && instr.streamName) {
                            tool.show(instr.publisherId, instr.streamName);
                        } */
                        if (instr.visualizationData && instr.streamType) {
                            tool._showInlineCard(
                                instr.streamType,
                                instr.visualizationType,
                                instr.visualizationData
                            );
                        }
                        if (instr.code && instr.toolName) {
                            tool._activateGeneratedTool(
                                instr.toolName,
                                instr.code,
                                instr.toolOptions
                            );
                        }
                        return;
                    case 'Media/presentation/hide':
                        if (instr.publisherId && instr.streamName) {
                            await tool.hide(instr.publisherId, instr.streamName, instr.toolName);
                        }
                        return;

                    // ── Slide navigation ──────────────────────────────────────────
                    // The wrapper sub-tool (Media/presentation/pdf, etc.) exposes
                    // goToSlide. Both legacy 'Streams/slide' and durable
                    // 'Media/presentation/slide' route here.
                    case 'Streams/slide':
                    case 'Media/presentation/slide':
                        var slideIndex = (instr.slideIndex != null) ? instr.slideIndex : instr.index;
                        if (slideIndex == null) return;
                        state.slideIndex = slideIndex;
                        if (tool.current.tool && typeof tool.current.tool.goToSlide === 'function') {
                            tool.current.tool.goToSlide(slideIndex);
                        }
                        return;

                    // ── Reveal step (cards with progressive disclosure) ───────────
                    case 'Streams/reveal':
                    case 'Media/presentation/reveal':
                        var revealIndex = (instr.revealIndex != null) ? instr.revealIndex : instr.index;
                        if (revealIndex == null) return;
                        state.revealIndex = revealIndex;
                        if (tool.current.tool && typeof tool.current.tool.goToReveal === 'function') {
                            tool.current.tool.goToReveal(revealIndex);
                        }
                        return;

                    // ── Scroll position (PDF) ─────────────────────────────────────
                    // Percentages of (scrollHeight - clientHeight). Drill into the
                    // wrapper's inner Q/pdf element to set scrollTop directly.
                    // Wrapper could expose tool.current.tool.setScroll(top, left)
                    // as a follow-up cleanup; for now we reach in.
                    case 'Streams/scroll':
                        if (!tool.current.tool || !tool.current.tool.element) return;
                        // Find the inner scrollable element (the Q/pdf tool's element,
                        // which is the scroll container). The wrapper's element wraps it.
                        var scrollEl = tool.current.tool.element.querySelector('.Q_pdf_tool')
                            || tool.current.tool.element;

                        // If the PDF is in slide mode, scroll restore is meaningless —
                        // either exit slide mode first or skip. We skip; slide mode
                        // implies the host wasn't scrolling, so reconstruction has
                        // nothing useful to apply here.
                        if (scrollEl.getAttribute('data-slideMode') === 'true') return;

                        var maxY = scrollEl.scrollHeight - scrollEl.clientHeight;
                        var maxX = scrollEl.scrollWidth - scrollEl.clientWidth;
                        var st, sl;
                        if (maxY > 0 && instr.scrollTop != null) {
                            st = (maxY * parseFloat(instr.scrollTop)) / 100;
                        }
                        if (maxX > 0 && instr.scrollLeft != null) {
                            sl = (maxX * parseFloat(instr.scrollLeft)) / 100;
                        }

                        tool.current.tool._pdfTool.setCurrentPosition(st, sl);
                        return;

                    // ── Playback: seek ────────────────────────────────────────────
                    case 'Streams/seek':
                        //debugger;
                        return;

                    case 'Streams/play':
                        var mediaTool = this.current.tool;
                        if (!mediaTool || !mediaTool.originalTool || (mediaTool.name != 'media_presentation_video' && mediaTool.name != 'media_presentation_audio')) return;
                        
                        if (instr.pos != null) {
                            var pos = parseFloat(instr.pos);
                            if (!isNaN(pos) && Math.abs(mediaTool.originalTool.getCurrentPosition() - pos) > 0.25) {
                                mediaTool.originalTool.setCurrentPosition(pos);
                            }
                        }
                       
                        mediaTool.originalTool.play();
                        return;

                    case 'Streams/pause':
                        var mediaTool = this.current.tool;
                        if (!mediaTool || !mediaTool.originalTool || (mediaTool.name != 'media_presentation_video' && mediaTool.name != 'media_presentation_audio')) return;

                        if (instr.pos != null) {
                            var pos = parseFloat(instr.pos);
                            if (!isNaN(pos) && Math.abs(mediaTool.originalTool.getCurrentPosition() - pos) > 0.25) {
                                mediaTool.originalTool.setCurrentPosition(pos);
                            }
                        }
                        mediaTool.originalTool.pause();
                        return;

                    // ── Zoom (applied to the current wrapper) ─────────────────────
                    case 'Streams/zoom':
                        if (instr.scale == null) return;
                        var scale = parseFloat(instr.scale);
                        if (isNaN(scale) || scale <= 0) return;
                        state.zoomScale = scale;
                        if (tool.current.tool && tool.current.tool.element) {
                            tool.current.tool.element.style.transform = 'scale(' + scale + ')';
                            tool.current.tool.element.style.transformOrigin = 'center center';
                        }
                        return;

                    // ── Pin/unpin/resize/reorder (handled by their existing handlers
                    //    via tool.pin/unpin/resize/reorder — included for completeness) ──
                    case 'Media/presentation/pin':
                        if (instr.publisherId && instr.streamName) {
                            tool.pin(instr.publisherId, instr.streamName, instr);
                        }
                        return;
                    case 'Media/presentation/unpin':
                        if (instr.publisherId && instr.streamName) {
                            tool.unpin(instr.publisherId, instr.streamName, instr);
                        }
                        return;
                    case 'Media/presentation/resize':
                        if (instr.ratio != null) {
                            tool.resize({ ratio: instr.ratio, duration: instr.duration });
                        }
                        return;
                    case 'Media/presentation/reorder':
                        if (instr.items) tool.reorder({ items: instr.items });
                        return;

                    // ── Gallery state (b-roll on screen page) ─────────────────────
                    // The background gallery sits separately from tool.current — it's
                    // the screen-wide kenburns layer, not the active content tool.
                    // _bgInit attaches the gallery; we mutate it via documented APIs.
                    case 'Streams/gallery/pause':
                        if (tool._bgGalleryTool && typeof tool._bgGalleryTool.pause === 'function') {
                            tool._bgGalleryTool.pause();
                        }
                        return;
                    case 'Streams/gallery/resume':
                        if (tool._bgGalleryTool && typeof tool._bgGalleryTool.resume === 'function') {
                            tool._bgGalleryTool.resume();
                        }
                        return;
                    case 'Streams/gallery/query':
                        if (tool._bgGalleryTool && typeof tool._bgGalleryTool._fetchAndSet === 'function') {
                            tool._bgGalleryTool._fetchAndSet(instr.query);
                        }
                        return;

                    // ── Fullscreen: deliberately NOT applied on reconstruction ────
                    // Fullscreen requires a user gesture; viewer may also prefer
                    // windowed. Live ephemerals can still toggle during the session;
                    // mount reconstruction skips it.
                    case 'Q/fullscreen':
                        return;

                    default:
                        // Unknown type — silently ignore. Forward-compatible: a host
                        // upgraded ahead of this viewer can send new state types, and
                        // older viewers just skip what they don't understand.
                        return;
                }
            },

            /**
             * Run callback against the <video> or <audio> element inside the
             * currently-mounted content sub-tool, if any. Used by playback handlers
             * (Streams/play, Streams/pause, Streams/seek) so they don't each
             * repeat the lookup.
             *
             * @param {Function} fn  Receives (HTMLMediaElement)
             */
            _withCurrentMedia: function (fn) {
                var current = this.current && this.current.tool;
                if (!current || !current.element) return;
                var mediaEl = current.element.querySelector('video, audio');
                if (mediaEl) fn(mediaEl);
            },
            pin: function (publisherId, streamName, options) {
                var tool = this;
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
                        streamName: streamName,
                        mode: 'broadcast'
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
                var targetRatio = options.size != null ? options.size : _autoRatio(items.length);
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
                var tool = this;
                var state = tool.state;
                options = options || {};
                var key = publisherId + '\t' + streamName;
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
                var tool = this;
                var state = tool.state;
                options = options || {};
                var ratio = Math.max(0, Math.min(1, options.ratio != null ? options.ratio : 0));
                var duration = options.duration != null
                    ? options.duration
                    : (state.resize && state.resize.duration != null ? state.resize.duration : 500);
                var transitionVal = 'flex-grow ' + duration + 'ms ease, flex ' + duration + 'ms ease';
                if (tool._mainEl) {
                    tool._mainEl.style.transition = transitionVal;
                    tool._mainEl.style.flexGrow = String(1 - ratio);
                    tool._mainEl.style.display = (ratio >= 0.999) ? 'none' : '';
                }
                if (tool._pinnedEl) {
                    tool._pinnedEl.style.transition = transitionVal;
                    tool._pinnedEl.style.flexGrow = String(ratio);
                    tool._pinnedEl.style.display = (ratio < 0.001) ? 'none' : '';
                }
                state._pinnedRatio = ratio;
                return tool;
            },

            reorder: function (options) {
                var tool = this;
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
                var n = tool.state.pinnedItems.length;
                tool._pinnedEl.dataset.count = n;
                var cols, rows;
                if (n <= 1) { cols = 1; rows = 1; }
                else if (n <= 2) { cols = 1; rows = 2; }
                else if (n <= 4) { cols = 2; rows = 2; }
                else { cols = 3; rows = Math.ceil(n / 3); }
                if (tool.element.classList.contains('Media_presentation_portrait')) {
                    var tmp = cols; cols = rows; rows = tmp;
                }
                tool._pinnedEl.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
                tool._pinnedEl.style.gridTemplateRows = 'repeat(' + rows + ', 1fr)';
            },

            _updateOrientation: function () {
                var tool = this;
                var w = tool.element.offsetWidth;
                var h = tool.element.offsetHeight;
                if (!w || !h) return;
                var isPortrait = h > w;
                tool.element.classList.toggle('Media_presentation_portrait', isPortrait);
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
            'Media/slide': 'Media/slide',
            'Media/presentation': 'Media/presentation',
            'Streams/chat': 'Streams/chat',
            'Streams/image/album': 'Streams/image/album',
            'Media/webrtc': 'Media/webrtc',
            'Media/webrtc/livestream': 'Media/webrtc/livestream',
            'Streams/video': 'Streams/video/preview',
            'Streams/audio': 'Streams/audio/preview',
            'Streams/pdf': 'Streams/pdf/preview',
            'Q/visualization/graph': 'Q/visualization/graph',
            'Q/visualization/table': 'Q/visualization/table'
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
