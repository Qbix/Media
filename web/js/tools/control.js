(function (Q, $, window, undefined) {

    var Streams = Q.Streams;

    function _qEmit(event, data) { var qs = Q.Socket.get('/Q', ''); if (qs) qs.socket.emit(event, data); }

    /**
     * @module Media
     */

    /**
     * The private host/guest control page for a live presentation.
     * Activated at route: presentation/:calendarId/control
     *
     * Renders three regions:
     *   1. Chat — Streams/chat on the presentation stream with an added
     *      phone-icon mic button that starts/stops Q.Speech.Recognition
     *      (gesture-safe: the tap handler calls start() synchronously).
     *   2. Proposal feed — AI-proposed cards waiting for host veto/commit.
     *      Guests see a read-only version of committed proposals.
     *   3. Coaching strip — private text visible only to host (routing=privateOnly).
     *
     * Speech path:
     *   Tap mic → Q.Speech.Recognition.start() called in gesture handler.
     *   If AI plugin is loaded (Deepgram), it takes over via implement().
     *   Transcripts → AI socket → ControlClassifier → LLM pipeline.
     *   Proposals come back as AI/proposal/show socket events.
     *   Background kenburns gallery queries come as Streams/gallery/query ephemerals
     *   and need no veto — they update the b-roll on the shared screen automatically.
     *
     * @class Media/presentation/control
     * @constructor
     * @param {Object} [options]
     * @param {String} options.publisherId      Presentation stream publisherId
     * @param {String} options.streamName       Presentation stream streamName
     * @param {Boolean}[options.isHost=false]   Host sees veto UI and coaching
     * @param {String} [options.lang='en-US']   BCP-47 language tag
     * @param {Boolean}[options.autoMic=false]  Auto-start mic after first tap anywhere (for kiosk use)
     */
    Q.Tool.define('Media/presentation/control', function (options) {
        var tool = this;
        var state = tool.state;
        // ── Track which preview is currently active ────────────────────────────
        tool._activePreview = null;

        // ── Build page structure ───────────────────────────────────────────────
        tool.element.innerHTML = '';
        tool.element.className += ' Media_control_tool';

        // Header bar
        var header = document.createElement('div');
        header.className = 'Media_control_header';
        header.innerHTML =
            '<span class="Media_control_title">Control</span>' +
            '<div class="Media_control_header_right">' +
            '  <button class="Media_control_mic_btn" title="Start / stop microphone">' +
            '    <svg class="Media_control_mic_icon" viewBox="0 0 24 24" width="22" height="22"' +
            '         fill="currentColor" aria-hidden="true">' +
            '      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66' +
            '           1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72' +
            '           6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>' +
            '    </svg>' +
            '  </button>' +
            (state.isHost
                ? '<a class="Media_control_screen_link" href="' + state.screenUrl + '" target="_blank"' +
                '   title="Open shared screen">⬡</a>'
                : '') +
            '</div>';
        tool.element.appendChild(header);

        // Coaching strip (host only)
        if (state.isHost) {
            var coaching = document.createElement('div');
            coaching.className = 'Media_control_coaching Media_control_coaching_empty';
            coaching.dataset.label = 'AI coaching';
            tool.element.appendChild(coaching);
            tool._coachingEl = coaching;
        }

        // Proposal feed (host only — guests see committed cards via chat)
        if (state.isHost) {
            var proposals = document.createElement('div');
            proposals.className = 'Media_control_proposals';
            tool.element.appendChild(proposals);
            tool._proposalsEl = proposals;
        }

        // Chat region — Streams/chat with our chat extensions
        var chatWrap = document.createElement('div');
        chatWrap.className = 'Media_control_chat_wrap';
        tool.element.appendChild(chatWrap);

        $(chatWrap)
            .tool('Streams/chat', {
                publisherId: state.publisherId,
                streamName: state.streamName,
                inputType: 'textarea'
            })
            .tool('Media/card/chat', {
                publisherId: state.publisherId,
                streamName: state.streamName
            })
            .tool('Media/chart/chat', {
                publisherId: state.publisherId,
                streamName: state.streamName
            })
            .activate(function () {
                tool._chatTool = Q.Tool.from(chatWrap, 'Streams/chat');
                tool._wireMicButton();
                tool._wirePreviewEphemeralHooks();

                // ── Mode toggles (host only) ────────────────────────────────────────
                if (state.isHost) {
                    var modesWrap = document.createElement('div');
                    modesWrap.className = 'Media_control_modes';
                    modesWrap.innerHTML =
                        '<button class="Media_control_mode_btn Media_control_mode_composition active"'
                        + ' data-mode="composition" title="AI card composition on/off">🧠&nbsp;Compose</button>'
                        + '<button class="Media_control_mode_btn Media_control_mode_navigation active"'
                        + ' data-mode="navigation" title="Voice navigation on/off">🎙&nbsp;Navigate</button>'
                        + '<button class="Media_control_mode_btn Media_control_mode_transcription active"'
                        + ' data-mode="transcription" title="Post speech as chat messages">📝&nbsp;Chat</button>';
                    tool.element.appendChild(modesWrap);

                    modesWrap.addEventListener('click', function (e) {
                        var btn = e.target.closest('.Media_control_mode_btn');
                        if (!btn) return;
                        var mode = btn.getAttribute('data-mode');
                        var active = btn.classList.toggle('active');
                        var update = {};
                        update[mode] = active;
                        tool.setState({ modes: Q.extend({}, tool.state.modes, update) });
                        if (tool.state._micActive) {
                            _qEmit('AI/session/modes', update);
                        }
                    });
                }
            });

        // ── Retain presentation stream for ephemeral forwarding ──────────────
        Streams.retainWith(tool).get(state.publisherId, state.streamName, function (err, stream) {
            if (err) return;
            tool._stream = stream;
            if (tool._classifier && tool._classifier.setState) {
                // Give classifier access to the live stream for ephemeral emit
                tool._classifier = Q.Media.ClientClassifier.create({
                    publisherId: state.publisherId,
                    streamName: state.streamName,
                    stream: stream,
                    qEmit: _qEmit,
                    sessionStartMs: state._sessionStartMs || Date.now()
                });
            }


            tool._connectStreamHandlers(stream);

            // CSS variable updates from AI pipeline — re-use listenForStyle logic
            // via Q.handle so the <style> injection matches all other screens
            stream.onEphemeral('Q/style').set(function (e) {
                if (!e) return;
                Q.handle(Q.Socket.onEvent('Q/style'), tool, [e]);
            }, tool);
        });

        // ── Retain participant stream if available ──────────────────────────
        // The participant stream is owned by the logged-in user and related to
        // the presentation stream. Generated tools can publish their own state here.
        if (state.toolPublisherId && state.toolStreamName) {
            Streams.retainWith(tool).get(
                state.toolPublisherId,
                state.toolStreamName,
                function (err, stream) {
                    if (err) return;
                    tool._toolStream = stream;
                }
            );
        }

        tool._handleSocketReconnect();

        let poweredBy = document.querySelector('.powered_by_safebots');
        if (poweredBy) poweredBy.classList.add('Q_hide');

    }, {
        publisherId: null,
        streamName: null,
        isHost: false,
        lang: 'en-US',
        mode: 'live',   // live|narration
        autoMic: false,
        screenUrl: null,
        isOwnLivestream: false,
        // Per-participant stream (participant's own stream, related to presentation)
        // publishedBy the logged-in user, used for their personal tool state
        toolPublisherId: null,
        toolStreamName: null,
        // Write level on the presentation stream — drives which tool interactions are enabled
        writeLevel: 16,  // ephemeral by default; server sets actual level
        _micActive: false,
        _aiStarted: false,
        modes: {
            composition: true,  // AI proposes visualization cards from speech
            navigation: true,  // voice commands control slides/video/zoom
            transcription: true   // posts each final utterance as Streams/chat/message
        }
    }, {

        // ── Mic button ─────────────────────────────────────────────────────────

        /**
         * Wire the mic button tap handler.
         * Called AFTER chat tool is activated — the button is in the header,
         * not inside the chat tool, so it's available from the start.
         */
        _wireMicButton: function () {
            var tool = this;
            var state = tool.state;
            var $btn = $(tool.element).find('.Media_control_mic_btn');

            $btn.on(Q.Pointer.fastclick, function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (!state._micActive) {
                    tool._startMic();
                } else {
                    tool._stopMic();
                }
            });
        },
        /**
         * Send content-state to viewers: live ephemeral for immediate UX,
         * optionally a durable message for late-joiner state reconstruction.
         *
         * @param {Object} previewState   { publisherId, streamName } of content stream
         * @param {String} type           e.g. 'Streams/scroll', 'Streams/slide'
         * @param {Object} instructions   Payload
         * @param {Object} [options]
         *   @param {Number}  [options.debounce]      Debounce window for durable post (ms)
         *   @param {Boolean} [options.persist=true]  Whether to also post durable
         *                                            (false = ephemeral-only, no DB row)
         */
        _emitContentState: function (previewState, type, instructions, options) {
            options = options || {};
            let payload = Q.extend({}, instructions, { type: type });
            // 1. Live ephemeral — fan out to viewers immediately for snappy UX
            Q.Streams.Stream.ephemeral(
                previewState.publisherId,
                previewState.streamName,
                payload
            );

            // 2. Durable post — for state reconstruction on viewer mount
            if (options.persist === false) return;

            if (options.debounce) {
                this._postDebouncedMessage(
                    previewState.publisherId, previewState.streamName,
                    type, instructions, options.debounce
                );
            } else if (Q.Streams && Q.Streams.Message && Q.Streams.Message.post) {
                Q.Streams.Message.post({
                    publisherId: previewState.publisherId,
                    streamName: previewState.streamName,
                    type: type,
                    instructions: JSON.stringify(instructions)
                });
            }
        },
        /**
         * Post a durable Streams message, debounced. Multiple posts arriving for
         * the same (publisherId, streamName, type) within `delayMs` collapse into
         * a single message carrying the latest payload — fires once after the
         * burst ends.
         *
         * Use for continuous actions (scroll, seek, zoom drag) where the viewer
         * mostly needs the resting position, not every intermediate value.
         * Use immediate Q.Streams.Message.post for discrete actions (slide change,
         * play/pause toggle, show new content).
         *
         * @param {String} publisherId
         * @param {String} streamName
         * @param {String} type           Message type, e.g. 'Streams/scroll'
         * @param {Object} instructions   Payload — latest call's value wins
         * @param {Number} [delayMs=1000] Debounce window
         */
        _postDebouncedMessage: function (publisherId, streamName, type, instructions, delayMs) {
            var tool = this;
            delayMs = delayMs || 1000;
            var key = publisherId + '/' + streamName + '/' + type;

            tool._debouncedPosts = tool._debouncedPosts || {};
            var entry = tool._debouncedPosts[key];

            if (entry) {
                // Reset the timer; replace the payload entirely (trailing-edge,
                // latest-wins). Don't merge — newer state supersedes older.
                clearTimeout(entry.timer);
                entry.instructions = instructions;
            } else {
                entry = {
                    publisherId: publisherId,
                    streamName: streamName,
                    type: type,
                    instructions: instructions
                };
                tool._debouncedPosts[key] = entry;
            }

            entry.timer = setTimeout(function () {
                delete tool._debouncedPosts[key];
                if (!Q.Streams || !Q.Streams.Message || !Q.Streams.Message.post) return;
                Q.Streams.Message.post({
                    publisherId: entry.publisherId,
                    streamName: entry.streamName,
                    type: entry.type,
                    instructions: JSON.stringify(entry.instructions)
                });
            }, delayMs);
        },
        _wirePreviewEphemeralHooks: function () {
            var tool = this;
            var state = tool.state;
            var pId = state.publisherId;
            var sName = state.streamName;
            var chatEl = tool._chatTool && tool._chatTool.element;
            if (!chatEl) return;

            // Helper: emit ephemeral on the *content* stream (not the presentation)
            function contentEphemeral(previewState, type, data) {
                Q.Streams.Stream.ephemeral(
                    previewState.publisherId,
                    previewState.streamName,
                    Q.extend({ type: type }, data)
                );
            }

            // ── Any Streams/preview: onInvoke → show that stream on the canvas ──
            function wirePreview(previewTool) {
                if (!previewTool || !chatEl.contains(previewTool.element)) return;
                var ps = previewTool.state;
                ps.onInvoke.set(function () {
                    tool._activePreview = tool._getChildPreviewTool(previewTool);
                    
                    /* Q.Streams.Stream.ephemeral(pId, sName, {
                        type: 'Media/presentation/show',
                        publisherId: ps.publisherId,
                        streamName: ps.streamName
                    }); */

                    Q.Streams.Message.post({
                        publisherId: tool.state.publisherId,
                        streamName: tool.state.streamName,
                        type: 'Media/presentation/show',
                        instructions: JSON.stringify({
                            toolName: previewTool.name,
                            publisherId: ps.publisherId,
                            streamName: ps.streamName,
                        })
                    });
                }, tool);
            }

            function trackToolRemove(contentTool, previewTool) {
                var ps = previewTool.state;
                contentTool.Q.beforeRemove.add(function () {
                        Q.Streams.Message.post({
                            publisherId: tool.state.publisherId,
                            streamName: tool.state.streamName,
                            type: 'Media/presentation/hide',
                            instructions: JSON.stringify({
                                toolName: contentTool.name,
                                publisherId: ps.publisherId,
                                streamName: ps.streamName,
                            })
                        });
                    }, previewTool);
            }
            chatEl.forEachTool('Streams/preview', wirePreview);
            Q.Tool.onActivate('Streams/preview').add(function () {
                if (this.name != 'streams_preview' || !chatEl.contains(this.element)) return;
                wirePreview(this);
            }, tool);

            // ── Streams/pdf/preview: scroll + slide → content stream ephemerals ──
            function wirePdfPreview(previewTool) {
                if (!previewTool) return;
                var previewState = previewTool.preview && previewTool.preview.state
                    || previewTool.state;
                document.body.forEachTool('Q/pdf', function () {
                    var pdfTool = this;
                    trackToolRemove(pdfTool, previewTool);
                    if (Q.isEmpty(previewTool.stream)
                        || Q.url(previewTool.stream.fileUrl()) !== pdfTool.state.url) {
                        return;
                    }
                    tool._setupPdfVisibilityObserver(pdfTool);
                    pdfTool.state.onScroll.set(function (scrollTop, scrollLeft) {
                        if(pdfTool.state.slideMode) return;

                        let pctTop = ((pdfTool.element.scrollTop / (pdfTool.element.scrollHeight - pdfTool.element.clientHeight)) * 100);
                        pctTop = Number.isNaN(pctTop) ? "0.00" : pctTop.toFixed(2);
                        let pctLeft = ((pdfTool.element.scrollLeft / (pdfTool.element.scrollWidth - pdfTool.element.clientWidth)) * 100);
                        pctLeft = Number.isNaN(pctLeft) ? "0.00" : pctLeft.toFixed(2);

                        tool._emitContentState(previewState, 'Streams/scroll',
                            { scrollTop: pctTop, scrollLeft: pctLeft },
                            { debounce: 1000 }
                        );

                    }, previewTool);
                    pdfTool.state.onSlide.set(function (slideIndex) {
                        contentEphemeral(previewState, 'Streams/slide', { slideIndex: slideIndex });
                        tool._emitContentState(previewState, 'Streams/slide', { slideIndex: slideIndex });
                    }, previewTool);
                    
                    pdfTool.element.addEventListener("wheel", function(event) {
                        tool._checkPdfMode(pdfTool);
                    });
                }, previewTool);
            }
            chatEl.forEachTool('Streams/pdf/preview', wirePdfPreview);
            Q.Tool.onActivate('Streams/pdf/preview').add(function () {
                if (!chatEl.contains(this.element)) return;
                wirePdfPreview(this);
            }, tool);

            // ── Streams/video/preview: play/pause/seek → content stream ephemerals ──
            function wireVideoPreview(previewTool) {
                if(!previewTool) return;
                var previewState = previewTool.preview && previewTool.preview.state
                    || previewTool.state;
                document.body.forEachTool('Q/video', function () {
                    var videoTool = this;
                    trackToolRemove(videoTool, previewTool);
                    if (Q.isEmpty(previewTool.stream)
                        || Q.url(previewTool.stream.fileUrl()) !== videoTool.state.url) {
                        return;
                    }
                    videoTool.state.onPlay.set(function (pos) {
                         tool._emitContentState(previewState, 'Streams/play', { pos: pos });
                    }, previewTool);
                    videoTool.state.onPlaying.set(function (pos) {
                         tool._emitContentState(previewState, 'Streams/seek', { pos: videoTool.getCurrentPosition(), sync: true, playing: true });
                    }, previewTool);
                    videoTool.state.onPause.set(function (pos) {
                        tool._emitContentState(previewState, 'Streams/pause', { pos: pos });
                    }, previewTool);
                    videoTool.state.onSeek.set(function (pos) {
                        tool._emitContentState(previewState, 'Streams/seek',
                            { pos: pos },
                            { debounce: 1000 }
                        );
                    }, previewTool);
                }, previewTool);
            }
            chatEl.forEachTool('Streams/video/preview', wireVideoPreview);
            Q.Tool.onActivate('Streams/video/preview').add(function () {
                if (!chatEl.contains(this.element)) return;
                wireVideoPreview(this);
            }, tool);

            // ── Streams/audio/preview: play/pause/seek → content stream ephemerals ──
            function wireAudioPreview(previewTool) {
                if(!previewTool) return;
                var previewState = previewTool.preview && previewTool.preview.state
                    || previewTool.state;
                document.body.forEachTool('Q/audio', function () {
                    var audioTool = this;
                    trackToolRemove(audioTool, previewTool);
                    if (Q.isEmpty(previewTool.stream)
                        || Q.url(previewTool.stream.fileUrl()) !== audioTool.state.url) {
                        return;
                    }
                    audioTool.state.onPlay.set(function (pos) {
                        tool._emitContentState(previewState, 'Streams/play', { pos: pos });
                    }, previewTool);
                    audioTool.state.onPause.set(function (pos) {
                        tool._emitContentState(previewState, 'Streams/pause', { pos: pos });
                    }, previewTool);
                    audioTool.state.onSeek.set(function (pos) {
                        tool._emitContentState(previewState, 'Streams/seek', { pos: pos });
                    }, previewTool);
                }, previewTool);
            }
            chatEl.forEachTool('Streams/audio/preview', wireAudioPreview);
            Q.Tool.onActivate('Streams/audio/preview').add(function () {
                if (!chatEl.contains(this.element)) return;
                wireAudioPreview(this);
            }, tool);
        },

        /**
         * Start speech recognition.
         * MUST be called synchronously within a user gesture (tap/click) — iOS requires it.
         * Loads Q.Speech.Recognition lazily (cached after first load), then starts.
         * If the AI plugin's Deepgram adapter is already implement()ed, delegates to it.
         */
        _startMic: function () {
            var tool = this;
            var state = tool.state;

            // Load Recognition method and start — both happen inside the gesture stack
            // Q.Speech.Recognition() loads the method file if not already loaded.
            // On iOS Safari, script loads that are already cached are synchronous,
            // so the gesture chain is preserved. On first load (cold start), there
            // is a small risk of gesture chain break — mitigate by pre-loading
            // Q.Speech.Recognition() during page init (before any user tap).
            Q.Speech.Recognition.start({
                lang: state.lang || 'en-US',
                autoRestart: true,   // iOS Safari stops on silence — auto-restart
            });

            state._micActive = true;
            tool._updateMicUI(true);

            tool._connectAISocket();
        },

        _stopMic: function () {
            var tool = this;
            var state = tool.state;
            Q.Speech.Recognition.stop && Q.Speech.Recognition.stop();
            _qEmit('AI/transcription/session/stop');
            state._micActive = false;
            tool._updateMicUI(false);
        },

        /**
         * Find the live content tool (Q/pdf, Q/video, Q/audio) corresponding
         * to the given preview tool. Matches by file URL since previews and
         * content tools share the underlying stream's fileUrl.
         *
         * @param {Q.Tool} previewTool  e.g. a Streams/pdf/preview instance
         * @param {String} contentToolName  e.g. 'Q/pdf'
         * @return {Q.Tool|null}
         */
        _resolveActiveContentTool: function (previewTool, contentToolName) {
            if (!previewTool || (Q.isEmpty(previewTool.stream) && !previewTool.state.publisherId && !previewTool.state.streamName)) return null;
            var activeTools = Q.Tool.byName(contentToolName);
            for (var toolKey in activeTools) {
                if (Object.prototype.hasOwnProperty.call(activeTools, toolKey)) {
                    let tool = activeTools[toolKey];
                     if (tool.state && tool.state.publisherId === previewTool.state.publisherId && tool.state.streamName === previewTool.state.streamName) {
                        return tool;
                     }
                }
            }
        },
        _getChildPreviewTool: function (previewTool) {
            if (!previewTool || (Q.isEmpty(previewTool.stream) && !previewTool.state.publisherId && !previewTool.state.streamName)) return null;
            var allPreviewGroup = Q.Tool.active[previewTool.id];

            for (var toolName in allPreviewGroup) {
                if (Object.prototype.hasOwnProperty.call(allPreviewGroup, toolName)) {
                    if(allPreviewGroup[toolName].preview == previewTool) return allPreviewGroup[toolName];
                }
            }
        },

        /**
         * Apply a classifier-matched intent to the *currently active* preview's
         * underlying content tool. State (slideIndex, currentTime, etc.) lives
         * on the content tool — read from it, compute the next value, write back.
         *
         * @param {Object} handled  { intent, captures }
         */
        _handleCommandLocally: function (handled) {
            var tool = this;
            var preview = tool._activePreview;
            if (!preview || !handled || !handled.intent) return;
            var intent = handled.intent;
            var previewType = preview.name;   // 'streams_pdf_preview', 'streams_video_preview', etc.

            if (intent.indexOf('slide/') === 0) {
                var pdfTool = tool._resolveActiveContentTool(preview, 'Q/pdf');
                if (!pdfTool) return;
                var canvases = pdfTool.element.querySelectorAll('canvas');
                if (!canvases.length) return;
                
                var current;
                if(pdfTool.state.slideMode) {
                    current = (pdfTool.cacheData && pdfTool.cacheData.slideIndex != null) ? pdfTool.cacheData.slideIndex : -1;
                } else {
                    current = tool._currentVisibleCanvasIndex(pdfTool)
                }
                    
                var next;
                switch (intent) {
                    case 'slide/next': next = current + 1; break;
                    case 'slide/prev': next = Math.max(0, current - 1); break;
                    case 'slide/first': next = 0; break;
                    case 'slide/last': next = canvases.length - 1; break;
                    default: return;
                }
                next = Math.max(0, Math.min(canvases.length - 1, next));
                tool._pdfApplySlide(pdfTool, next);
                tool._syncServer(handled, { slideIndex: next });
                return;
            }

            if (intent.indexOf('video/') === 0 || intent.indexOf('audio/') === 0) {
                var contentName = intent.indexOf('video/') === 0 ? 'Q/video' : 'Q/audio';
                var mediaTool = tool._resolveActiveContentTool(preview, contentName);
                if (!mediaTool) return;
                
                switch (intent) {
                    case 'video/play': mediaTool.play(); break;
                    case 'video/pause': mediaTool.pause(); break;
                    case 'video/mute': break;
                    case 'video/unmute': break;
                    default: return;
                }
                tool._syncServer(handled, { pos: el.currentTime });
                return;
            }

            // No matching active preview for this intent → no local action,
            // but still sync so the server can record it for VTT / forward to viewer.
            tool._syncServer(handled);
        },

        /**
         * Attach an IntersectionObserver to a Q/pdf instance that tracks which
         * canvas children are currently visible, and to what degree. Stores the
         * latest snapshot on pdfTool._visibility for _currentVisibleCanvasIndex
         * and any other caller to read synchronously.
         *
         * Safe to call multiple times — short-circuits if already set up.
         * Cleans itself up on the tool's onBeforeRemove event so the observer
         * doesn't outlive the element.
         */
        _setupPdfVisibilityObserver: function (pdfTool) {
            var tool = this;
            if (!pdfTool || pdfTool._visibilityObserver) return;

            var canvases = pdfTool.element.querySelectorAll('canvas');
            if (!canvases.length) {
                // Q/pdf renders canvases asynchronously after the document loads.
                // Defer setup until onRefresh fires.
                pdfTool.state.onRefresh.addOnce(function () {
                    tool._setupPdfVisibilityObserver(pdfTool);
                }, pdfTool);
                return;
            }

            pdfTool._visibility = {};   // index → { ratio, top }

            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    var idx = Array.prototype.indexOf.call(
                        pdfTool.element.querySelectorAll('canvas'),
                        entry.target
                    );
                    if (idx < 0) return;
                    pdfTool._visibility[idx] = {
                        ratio: entry.intersectionRatio,
                        top:   entry.boundingClientRect.top
                    };
                });
            }, {
                root: pdfTool.element,
                threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
            });

            canvases.forEach(function (canvas) { observer.observe(canvas); });
            pdfTool._visibilityObserver = observer;

            pdfTool.Q.beforeRemove.set(function () {
                observer.disconnect();
                delete pdfTool._visibilityObserver;
                delete pdfTool._visibility;
            }, pdfTool);
        },

        /**
         * Determine which canvas is currently most visible in scroll mode.
         * Reads from the IntersectionObserver snapshot (always fresh — observer
         * callbacks fire on every threshold crossing during scroll).
         *
         * Falls back to canvas 0 if visibility data hasn't been populated yet
         * (initial state, or before the first scroll event after mount).
         *
         * @param {Q.Tool} pdfTool
         * @return {Number}  canvas index (0-based)
         */
        _currentVisibleCanvasIndex: function (pdfTool) {
            if (!pdfTool || !pdfTool._visibility) return 0;
            var visibility = pdfTool._visibility;
            var canvases = pdfTool.element.querySelectorAll('canvas');
            if (!canvases.length) return 0;

            var bestIdx = 0;
            var bestRatio = -1;
            for (var i = 0; i < canvases.length; i++) {
                var v = visibility[i];
                if (!v) continue;
                // Most visible by ratio. Tie-break by topmost (smaller top wins —
                // closer to the viewport top reads as "the one the user is reading").
                if (v.ratio > bestRatio ||
                    (v.ratio === bestRatio && v.top < (visibility[bestIdx] || { top: Infinity }).top)) {
                    bestRatio = v.ratio;
                    bestIdx = i;
                }
            }
            return bestIdx;
        },
        _getCurrentPdfIndex: function (pdfTool) {
            var tool = this;
            if (pdfTool.state.slideMode) {
                return (pdfTool.cacheData && pdfTool.cacheData.slideIndex != null) ? pdfTool.cacheData.slideIndex : -1;
            } else {
                return tool._currentVisibleCanvasIndex(pdfTool);
            }
        },

        /**
         * Apply a slide index to the PDF tool, handling mode transitions.
         *
         * Already in slide mode → switch to canvases[slideIndex].
         *
         * In scroll mode → entering slide mode snaps to whatever canvas the
         * user is currently looking at (computed from scrollTop), and the
         * passed-in slideIndex is IGNORED for this call. Rationale: a voice
         * command from scroll mode is read as "let me enter slide mode where
         * I am" — the next command navigates from there. This preserves visual
         * continuity and is symmetric with _checkPdfMode's exit path.
         *
         * Returns the index that was actually applied, so the caller can sync
         * that to the server (the snap-to-visible behavior can override the
         * caller's intended index, and the server should record what really
         * happened, not what was requested).
         *
         * @param {Q.Tool} pdfTool    the Q/pdf instance
         * @param {Number} slideIndex  target slide (honored only when already in slide mode)
         * @return {Number}            the index actually applied
         */
        _pdfApplySlide: function (pdfTool, slideIndex) {
            var tool = this;
            var canvases = pdfTool.element.querySelectorAll('canvas');
            if (!canvases.length) return -1;
            pdfTool.cacheData = pdfTool.cacheData || {};

            var targetIndex;

            targetIndex = Math.max(0, Math.min(canvases.length - 1, slideIndex));
            if (!pdfTool.state.slideMode) {
                // Reads from IntersectionObserver snapshot — accurate even with
                // variable canvas heights, transforms, or fractional scroll positions.
                //targetIndex = this._currentVisibleCanvasIndex(pdfTool);
                tool._enableSlideMode(pdfTool);
            }

            pdfTool.cacheData.slideIndex = targetIndex;
            pdfTool.element.slideIndex = targetIndex;
            canvases.forEach(function (canvas, i) {
                canvas.style.display = (i === targetIndex) ? 'block' : 'none';
            });
            return targetIndex;
        },
        _enableSlideMode: function (pdfTool) {
            pdfTool.element.setAttribute('data-slideMode', 'true');
            pdfTool.state.slideMode = true;
        },
        _disableSlideMode: function (pdfTool) {
            pdfTool.element.removeAttribute('data-slideMode');
            pdfTool.state.slideMode = false;
        },

        /**
         * Wheel-event handler hook: transition the PDF tool from slide mode
         * back to scroll mode, preserving visual continuity by scrolling so
         * the previously-active slide's canvas sits at the top of the viewport.
         *
         * Symmetric with _pdfApplySlide's scroll → slide transition.
         *
         * No-op when the tool is already in scroll mode.
         *
         * @param {Q.Tool} pdfTool
         */
        _checkPdfMode: function (pdfTool) {
            var tool = this;
            if (!pdfTool || !pdfTool.element) return;
            if (pdfTool.state.slideMode === false) return;

            var canvases = pdfTool.element.querySelectorAll('canvas');
            if (!canvases.length) return;
            pdfTool.cacheData = pdfTool.cacheData || {};

            var activeIndex = (pdfTool.cacheData.slideIndex != null)
                ? Math.max(0, Math.min(canvases.length - 1, pdfTool.cacheData.slideIndex))
                : 0;

            tool._disableSlideMode(pdfTool);
            canvases.forEach(function (canvas) { canvas.style.display = ''; });

            var targetCanvas = canvases[activeIndex];
            if (targetCanvas) {
                // scrollIntoView handles fractional positions, scroll snap, and
                // transformed parents better than direct scrollTop assignment.
                targetCanvas.scrollIntoView({ block: 'start', behavior: 'instant' });
            }
        },

        /**
         * Reveal progressive disclosure step on the active card tool, if any.
         * Card tools expose data-reveal-up-to attributes that step animations follow.
         * @param {Number} revealIndex
         */
        _applyReveal: function (revealIndex) {
            var $cards = $(document.body).find('.Media_card_tool[data-reveal]');
            $cards.each(function () {
                this.setAttribute('data-reveal-up-to', String(revealIndex));
            });
        },

        /**
         * CSS transform scale on the active content surface.
         * Picks the most "presentation-like" container — falls back to body.
         */
        _applyZoom: function (scale) {
            var surface = document.querySelector('.Media_presentation_main')
                || document.querySelector('.Q_pdf_tool')
                || document.body;
            surface.style.transform = 'scale(' + scale + ')';
            surface.style.transformOrigin = 'center center';
        },

        /**
         * Relative scroll on the active content surface.
         */
        _applyScroll: function (dx, dy) {
            var surface = document.querySelector('.Q_pdf_tool')
                || document.scrollingElement
                || document.body;
            surface.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
        },
        _applyScrollAbsolute: function (x, y) {
            var surface = document.querySelector('.Q_pdf_tool')
                || document.scrollingElement
                || document.body;
            surface.scrollTo({ left: x, top: y, behavior: 'smooth' });
        },

        /** Play first matching Q/video or Q/audio tool. */
        _applyPlay: function () {
            document.body.forEachTool('Q/video', function () { try { this.play && this.play(); } catch (e) { } });
            document.body.forEachTool('Q/audio', function () { try { this.play && this.play(); } catch (e) { } });
        },
        _applyPause: function () {
            document.body.forEachTool('Q/video', function () { try { this.pause && this.pause(); } catch (e) { } });
            document.body.forEachTool('Q/audio', function () { try { this.pause && this.pause(); } catch (e) { } });
        },
        _applyMute: function (muted) {
            document.body.forEachTool('Q/video', function () {
                var v = this.element.querySelector('video'); if (v) v.muted = muted;
            });
            document.body.forEachTool('Q/audio', function () {
                var a = this.element.querySelector('audio'); if (a) a.muted = muted;
            });
        },

        _applyFullscreen: function () {
            var el = document.querySelector('.Q_pdf_tool')
                || document.querySelector('.Q_video_tool')
                || document.documentElement;
            if (document.fullscreenElement) {
                document.exitFullscreen && document.exitFullscreen();
            } else {
                el.requestFullscreen && el.requestFullscreen();
            }
        },

        /**
         * Emit Media/presentation/command to the server with the absolute
         * post-update state. The server's _navCommand picks slide/reveal up
         * as durable messages; other intents are logged for VTT.
         *
         * Called AFTER _handleCommandLocally so state.* reflects the new values.
         */
        _syncServer: function (handled, extras) {
            var tool = this;
            var state = tool.state;
            if (!handled || !handled.intent) return;
            var payload = Q.extend({
                intent: handled.intent,
                publisherId: state.publisherId,
                streamName: state.streamName,
                captures: handled.captures || {},
                relSec: ((Date.now() - (state._sessionStartMs || Date.now())) / 1000).toFixed(1)
            }, extras || {});
            _qEmit('Media/presentation/command', payload);
        },

        /**
         * Send an audience reaction — posts a durable message AND fires a burst
         * ephemeral for the floating animation on the shared screen.
         * @method _sendReaction
         * @param {String} emoji  e.g. '🔥'
         */
        _sendReaction: function (emoji) {
            var tool = this;
            var state = tool.state;
            if (!tool._stream) return;

            var relSec = state._aiStarted && state._sessionStartMs
                ? ((Date.now() - state._sessionStartMs) / 1000).toFixed(1)
                : '0';

            // Durable message — the record
            if (Q.Streams && Q.Streams.Message && Q.Streams.Message.post) {
                Q.Streams.Message.post({
                    publisherId: state.publisherId,
                    streamName: state.streamName,
                    type: 'Media/presentation/reaction',
                    content: emoji,
                    instructions: JSON.stringify({ emoji: emoji, count: 1, relSec: relSec }),
                }, function () { });
            }

            // Burst ephemeral — the animation
            tool._stream.ephemeral('Media/presentation/reaction/burst', {
                emoji: emoji, count: 1
            });
        },

        /**
         * Feed pre-written lines through the AI pipeline in narration mode.
         * Proposals auto-commit; no veto window.
         * @method _scriptMode
         * @param {Array}  lines      Array of text strings
         * @param {Number} msPerLine  Delay between lines in ms (default 3000)
         */
        _scriptMode: function (lines, msPerLine) {
            _qEmit('AI/stream/narrate', {
                lines: lines,
                msPerLine: msPerLine || 3000,
            });
        },

        _updateMicUI: function (active) {
            var $btn = $(this.element).find('.Media_control_mic_btn');
            $btn.toggleClass('Media_control_mic_active', active);
            $btn.attr('title', active ? 'Stop microphone' : 'Start microphone');
            // Pulsing red dot appears via CSS when active class is set
        },

        // ── AI socket ──────────────────────────────────────────────────────────

        _connectAISocket: function () {
            var tool = this;
            var state = tool.state;
            if (state._aiStarted) return;
            state._aiStarted = true;
            state._sessionStartMs = Date.now();  // track for relSec calculation

            // The /Q socket is already open and authenticated by the platform.
            // We emit/listen on it directly — same pattern as Streams does.
            // No separate namespace, no separate connection needed.

            // Tell server to start the AI pipeline for this session.
            tool._startSession();

            // Client-side classifier — intercepts navigation before sending to server
            tool._classifier = Q.Media.ClientClassifier
                && Q.Media.ClientClassifier.create({
                    publisherId: state.publisherId,
                    streamName: state.streamName,
                    stream: tool._stream || null,
                    qEmit: _qEmit,
                    sessionStartMs: state._sessionStartMs
                });
            // Pre-load PDF corpora in background (optional speedup)
            if (tool._classifier && tool._classifier.preloadPdfs) {
                tool._classifier.preloadPdfs();
            }

            // Forward browser WebSpeech results to the server pipeline
            // (Deepgram path bypasses this — audio goes directly server-side)
            Q.Speech.Recognition.onResult.set(function (chunk) {
                if (!chunk || !chunk.isFinal) return;
                /* if (tool._classifier && state.modes.navigation !== false) {
                    var handled = tool._classifier.intercept(chunk.transcript);
                    if (handled) {
                        tool._handleCommandLocally(handled);   // update host UI immediately
                        //tool._syncServer(handled);              // fan out to viewer + record VTT
                        return;
                    }
                } */
                tool._emitWithState('Streams/utterance', {
                    transcript: chunk.transcript,
                    isFinal: chunk.isFinal,
                    confidence: chunk.confidence,
                    speaker: Q.Users.loggedInUserId()
                });
            }, tool);

            // Server echoes back all final transcripts for caption display
            Q.Socket.onEvent('Streams/utterance').set(function (data) {
                tool._showCaption(data.transcript);
            }, tool);

            // Relay ephemeral events to the presentation stream
            // (control commands, gallery queries, style changes → shared screen)
            Q.Socket.onEvent('AI/ephemeral').set(function (data) {
                if (!tool._stream || !data.type) return;
                tool._stream.ephemeral(data.type, data.payload || {});
            }, tool);

            // Committed proposal → relay to stream → shared screen renders the card
            Q.Socket.onEvent('AI/proposal/show').set(function (data) {
                if (!tool._stream) return;
                tool._stream.ephemeral('Media/presentation/show', {
                    publisherId: state.publisherId,
                    streamName: state.streamName,
                    streamType: data.streamType,
                    visualizationType: data.visualizationType,
                    visualizationData: data.visualizationData
                });
            }, tool);

            Q.Socket.onEvent('AI/error').set(function (data) {
                console.warn('AI error:', data.message, data.code);
            }, tool);

            // Host-only events
            if (state.isHost) {
                Q.Socket.onEvent('AI/veto/show').set(function (data) {
                    tool._showProposal(data.proposal, data.windowMs);
                }, tool);
                Q.Socket.onEvent('AI/veto/commit').set(function (data) {
                    tool._removeProposal(data.proposalId);
                }, tool);
                Q.Socket.onEvent('AI/veto/cancel').set(function (data) {
                    tool._removeProposal(data.proposalId);
                }, tool);
                Q.Socket.onEvent('AI/coaching').set(function (data) {
                    tool._showCoaching(data.text, data.sourceUri);
                }, tool);

                // Live tool generation: host gets interactive mode in control pane.
                // The generated tool is also sent to the shared screen in broadcast mode
                // after host approval via the normal veto → commit flow.
                Q.Socket.onEvent('AI/tool/generated').set(function (data) {
                    if (!data || !data.code || !data.toolName) return;

                    // Persist in sessionStorage for page-refresh recovery
                    var version = (data.toolOptions && data.toolOptions.version) || 1;
                    try { sessionStorage.setItem(data.toolName + '/v' + version, data.code); } catch (e) { }

                    if (!Q.Tool.defined(data.toolName)) {
                        try {
                            /* jshint ignore:start */
                            (new Function('Q', '$', data.code))(Q, Q.jQuery);
                            /* jshint ignore:end */
                        } catch (e) {
                            console.warn('AI/tool/generated eval failed', e.message);
                            return;
                        }
                    }
                    if (!Q.Tool.defined(data.toolName)) return;

                    // Activate in host (interactive) mode.
                    // Pass the presentation stream so the tool can sync via ephemerals.
                    var wrap = document.createElement('div');
                    wrap.className = 'Media_control_generated_tool';
                    tool.element.appendChild(wrap);
                    var el = Q.Tool.prepare('div', data.toolName,
                        Q.extend({
                            mode: 'host',
                            publisherId: state.publisherId,
                            streamName: state.streamName,
                            stream: tool._stream || null,
                            // Participant stream: tool can publish its own state here
                            toolPublisherId: state.toolPublisherId,
                            toolStreamName: state.toolStreamName,
                            toolStream: tool._toolStream || null,
                            // Write level so tool knows what interactions to enable
                            writeLevel: state.writeLevel
                        }, data.toolOptions || {}),
                        null, tool.prefix
                    );
                    if (!el.id) {
                        el.id = data.toolName.replace(/[^a-zA-Z0-9]/g, '_') + '_ctrl';
                    }
                    wrap.appendChild(el);
                    Q.activate(el);

                    // Store for CSS updates targeting the host pane tool
                    tool._generatedToolElementId = el.id;

                    // Tell the server the tool was committed and shown — server posts
                    // a durable Media/presentation/tool/show message + VTT NOTE
                    _qEmit('AI/tool/committed', { toolName: data.toolName });
                }, tool);
            }
        },
        _startSession: function () {
            var tool = this;
            var state = tool.state;
            _qEmit('AI/transcription/session/start', {
                sessionToken: tool._getSessionToken(),
                lang: state.lang || 'en-US',
                sampleRate: 16000,
                publisherId: state.publisherId,
                streamName: state.streamName,
                role: state.isHost ? 'host' : 'participant',
                mode: state.mode || 'live',   // live|narration
                isOwnLivestream: !!state.isOwnLivestream,
                modes: { composition: !!state.modes.composition, navigation: !!state.modes.navigation, transcription: !!state.modes.transcription },
                toolStreamName: state.toolStreamName || null,
                toolPublisherId: state.toolPublisherId || null,
            });
        },
        _getSessionToken: function () {
            var tool = this;
            if (tool.sessionToken == null) {
                tool.sessionToken = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
            }
            return tool.sessionToken;
        },
        _connectStreamHandlers: function (stream) {
            var tool = this;
            stream.onMessage('Media/presentation/slide').set(function (msg) {
                var instr = {};
                try { instr = JSON.parse(msg.instructions || '{}'); } catch (e) { }
                var mySocketId = Q.Socket.get('/Q', '').socket.id;
                //if (mySocketId && msg.byClientId === mySocketId) return;
                if (instr.index == null) return;
                var preview = tool._activePreview;
                if (!preview || preview.state.streamName.indexOf('Streams/pdf') !== 0) return;
                var pdfTool = tool._resolveActiveContentTool(preview, 'Q/pdf');
                if (!pdfTool) return;
                // Idempotency: if we just set this index locally, the durable echo is a no-op
                if (tool._getCurrentPdfIndex(pdfTool) === instr.index) return;
                tool._pdfApplySlide(pdfTool, instr.index);
            }, tool);
        },
        _handleSocketReconnect: function () {
            var tool = this;
            var state = tool.state;
            var qs = Q.Socket.get('/Q', '');
            if (qs && qs.socket) {
                tool.currentSocketId = qs.socket.id;
                Q.Socket.onConnect().add(function () {
                    if (state._micActive && tool.currentSocketId != qs.socket.id) {
                        Q.log && Q.log('Socket reconnected — checking if session needs resume');
                        // Re-emit session/start with the same token to resume server-side state
                        tool._startSession();
                    }

                    tool.currentSocketId = qs.socket.id;
                });
            } else {
                Q.Socket.onConnect().addOnce(function () {
                    tool._handleSocketReconnect();
                });
            }
        },

        /**
 * Emit a socket event with the current presentation state automatically
 * attached. Use this instead of _qEmit for any event the server-side
 * classifier or pipeline might need to interpret in context.
 */
        _emitWithState: function (event, payload) {
            var tool = this;
            var state = tool._collectCurrentState();
            var qs = Q.Socket.get('/Q', '');
            if (qs) qs.socket.emit(event, Q.extend({}, payload, { _state: state }));
        },

        /**
         * Snapshot of state needed by the server to interpret commands correctly.
         * Reads from the active preview's content tool — single source of truth.
         */
        _collectCurrentState: function () {
            var tool = this;
            var preview = tool._activePreview;
            if (!preview) return { activePreview: null };
            var snapshot = {
                activePreview: { toolName: preview.name, streamName: preview.state.streamName, publisherId: preview.state.publisherId},
                publisherId: preview.stream && preview.stream.fields.publisherId,
                streamName: preview.stream && preview.stream.fields.name
            };
            if (preview.name === 'streams_pdf_preview') {
                var pdfTool = tool._resolveActiveContentTool(preview, 'Q/pdf');
                if (pdfTool) {
                    snapshot.slideMode = pdfTool.element.getAttribute('data-slideMode') === 'true';
                    snapshot.slideIndex = tool._getCurrentPdfIndex(pdfTool)

                    snapshot.scrollTop = pdfTool.cacheData && pdfTool.cacheData.scrollTop;
                    // If scrollTop isn't tracked, derive from element directly
                    if (snapshot.scrollTop == null) snapshot.scrollTop = pdfTool.element.scrollTop;
                }
            }
            if (preview.name === 'streams_video_preview' || preview.name === 'streams_audio_preview') {
                var contentName = preview.name === 'streams_video_preview' ? 'Q/video' : 'Q/audio';
                var mediaTool = tool._resolveActiveContentTool(preview, contentName);
                var mediaEl = mediaTool && mediaTool.element.querySelector('video, audio');
                if (mediaEl) {
                    snapshot.currentTime = mediaEl.currentTime;
                    snapshot.paused = mediaEl.paused;
                    snapshot.muted = mediaEl.muted;
                }
            }
            // Zoom: read from active content tool's transform if present
            var activeEl = tool._activePreview && (
                document.querySelector('.Q_pdf_tool[data-active]') ||
                document.querySelector('.Q_image_tool[data-active]')
            );
            if (activeEl && activeEl.style.transform) {
                var m = activeEl.style.transform.match(/scale\(([\d.]+)\)/);
                if (m) snapshot.zoomScale = parseFloat(m[1]);
            }
            return snapshot;
        },

        // ── Live caption ───────────────────────────────────────────────────────

        _showCaption: function (text) {
            var $cap = $(this.element).find('.Media_control_caption');
            if (!$cap.length) {
                $cap = $('<div class="Media_control_caption"></div>');
                $(this.element).find('.Media_control_chat_wrap').before($cap);
            }
            $cap.text(text);
            clearTimeout(this._captionTimer);
            this._captionTimer = setTimeout(function () { $cap.text(''); }, 4000);
        },

        // ── Proposal feed (host only) ──────────────────────────────────────────

        _showProposal: function (proposal, windowMs) {
            var tool = this;
            if (!tool._proposalsEl) return;

            var card = document.createElement('div');
            card.className = 'Media_control_proposal';
            card.dataset.proposalId = proposal.proposalId;

            var label = (proposal.visualizationType || 'proposal').replace(/_/g, ' ');
            var preview = '';
            var d = proposal.visualizationData || {};
            if (d.term) preview = d.term;
            else if (d.value && d.label) preview = d.value + ' — ' + d.label;
            else if (d.title) preview = d.title;
            else if (d.quote) preview = '"' + d.quote.slice(0, 60) + (d.quote.length > 60 ? '…' : '') + '"';
            else if (d.left && d.right) preview = (d.left.label || '') + ' vs ' + (d.right.label || '');
            else if (d.credit) preview = d.credit;
            else if (d.html) preview = 'HTML slide (' + d.html.length + ' chars)';

            card.innerHTML =
                '<div class="Media_control_proposal_type">' + label + '</div>' +
                '<div class="Media_control_proposal_preview">' + String(preview).encodeHTML() + '</div>' +
                '<div class="Media_control_proposal_actions">' +
                '  <button class="Media_control_proposal_commit" data-id="' + proposal.proposalId + '">Show</button>' +
                '  <button class="Media_control_proposal_cancel" data-id="' + proposal.proposalId + '">Skip</button>' +
                '</div>' +
                '<div class="Media_control_proposal_timer"></div>';

            tool._proposalsEl.insertBefore(card, tool._proposalsEl.firstChild);

            // Countdown ring
            var timerEl = card.querySelector('.Media_control_proposal_timer');
            var elapsed = 0;
            var tick = setInterval(function () {
                elapsed += 100;
                var pct = Math.min(elapsed / windowMs * 100, 100);
                timerEl.style.setProperty('--pct', pct + '%');
                if (elapsed >= windowMs) clearInterval(tick);
            }, 100);
            card.dataset.tick = tick;

            // Buttons
            card.querySelector('.Media_control_proposal_commit').addEventListener('click', function () {
                _qEmit('AI/veto/commit', { proposalId: proposal.proposalId });
                tool._removeProposal(proposal.proposalId);
            });
            card.querySelector('.Media_control_proposal_cancel').addEventListener('click', function () {
                _qEmit('AI/veto/cancel', { proposalId: proposal.proposalId });
                tool._removeProposal(proposal.proposalId);
            });
        },

        _removeProposal: function (proposalId) {
            if (!this._proposalsEl) return;
            var card = this._proposalsEl.querySelector('[data-proposal-id="' + proposalId + '"]');
            if (!card) return;
            var tick = card.dataset.tick;
            if (tick) clearInterval(parseInt(tick));
            card.parentNode.removeChild(card);
        },

        // ── Coaching strip (host only) ─────────────────────────────────────────

        _showCoaching: function (text, sourceUri) {
            if (!this._coachingEl) return;
            this._coachingEl.classList.remove('Media_control_coaching_empty');
            this._coachingEl.innerHTML =
                '<span class="Media_control_coaching_text">' + String(text).encodeHTML() + '</span>' +
                (sourceUri
                    ? ' <a class="Media_control_coaching_link" href="' + String(sourceUri).encodeHTML() +
                    '" target="_blank" rel="noopener">source</a>'
                    : '');
            clearTimeout(this._coachingTimer);
            var el = this._coachingEl;
            this._coachingTimer = setTimeout(function () {
                el.classList.add('Media_control_coaching_empty');
            }, 12000);
        },

        // ── Cleanup ────────────────────────────────────────────────────────────

        Q: {
            beforeRemove: function () {
                var tool = this, state = tool.state;
                if (state._micActive) tool._stopMic();
                // _stopMic already emits AI/transcription/session/stop via _qEmit
                Q.Speech.Recognition.onResult &&
                    Q.Speech.Recognition.onResult.remove(tool);
                clearTimeout(tool._captionTimer);
                clearTimeout(tool._coachingTimer);

                if (tool._debouncedPosts) {
                    Object.keys(tool._debouncedPosts).forEach(function (key) {
                        var entry = tool._debouncedPosts[key];
                        if (entry.timer) clearTimeout(entry.timer);
                    });
                    tool._debouncedPosts = {};
                }
            }
        }

    });

})(Q, Q.jQuery, window);