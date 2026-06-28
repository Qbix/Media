(function (Q, $, window, undefined) {

var Streams = Q.Streams;

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
 *   Transcripts → AI socket → CommandsClassifier → LLM pipeline.
 *   Proposals come back as AI/proposal/show socket events.
 *   Background kenburns gallery queries come as Streams/gallery/query ephemerals
 *   and need no veto — they update the b-roll on the shared screen automatically.
 *
 * @class Media/presentation/commands
 * @constructor
 * @param {Object} [options]
 * @param {String} options.publisherId      Presentation stream publisherId
 * @param {String} options.streamName       Presentation stream streamName
 * @param {Boolean}[options.isHost=false]   Host sees veto UI and coaching
 * @param {String} [options.lang='en-US']   BCP-47 language tag
 * @param {Boolean}[options.autoMic=false]  Auto-start mic after first tap anywhere (for kiosk use)
 */
Q.Tool.define('Media/presentation/commands', function (options) {
    var tool = this;
    var state = tool.state;

    // Header bar
    var header = document.createElement('div');
    header.className = 'Media_presentation_commands_header';
    header.innerHTML =
        '<span class="Media_commands_title">Control</span>' +
        '<div class="Media_commands_header_right">' +
        '  <button class="Media_commands_mic_btn" title="Start / stop microphone">' +
        '    <svg class="Media_commands_mic_icon" viewBox="0 0 24 24" width="22" height="22"' +
        '         fill="currentColor" aria-hidden="true">' +
        '      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66' +
        '           1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72' +
        '           6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>' +
        '    </svg>' +
        '  </button>' +
        (state.isHost
            ? '<a class="Media_commands_screen_link" href="' + state.screenUrl + '" target="_blank"' +
              '   title="Open shared screen">⬡</a>'
            : '') +
        '</div>';
    tool.element.appendChild(header);

    // Coaching strip (host only)
    if (state.isHost) {
        var coaching = document.createElement('div');
        coaching.className = 'Media_commands_coaching Media_commands_coaching_empty';
        coaching.dataset.label = 'AI coaching';
        tool.element.appendChild(coaching);
        tool._coachingEl = coaching;
    }

    // Proposal feed (host only — guests see committed cards via chat)
    if (state.isHost) {
        var proposals = document.createElement('div');
        proposals.className = 'Media_commands_proposals';
        tool.element.appendChild(proposals);
        tool._proposalsEl = proposals;
    }

    // Chat region — Streams/chat with our chat extensions
    var chatWrap = document.createElement('div');
    chatWrap.className = 'Media_commands_chat_wrap';
    tool.element.appendChild(chatWrap);

    $(chatWrap)
        .tool('Streams/chat', {
            publisherId: state.publisherId,
            streamName:  state.streamName,
            inputType:   'textarea'
        })
        .tool('Media/card/chat', {
            publisherId: state.publisherId,
            streamName:  state.streamName
        })
        .tool('Media/chart/chat', {
            publisherId: state.publisherId,
            streamName:  state.streamName
        })
        .activate(function () {
            tool._chatTool = Q.Tool.from(chatWrap, 'Streams/chat');
            tool._wireMicButton();

        // ── Mode toggles (host only) ────────────────────────────────────────
        if (state.isHost) {
            var modesWrap = document.createElement('div');
            modesWrap.className = 'Media_commands_modes';
            modesWrap.innerHTML =
                '<button class="Media_commands_mode_btn Media_commands_mode_composition active"'
                + ' data-mode="composition" title="AI card composition on/off">🧠&nbsp;Compose</button>'
                + '<button class="Media_commands_mode_btn Media_commands_mode_navigation active"'
                + ' data-mode="navigation" title="Voice navigation on/off">🎙&nbsp;Navigate</button>'
                + '<button class="Media_commands_mode_btn Media_commands_mode_transcription active"'
                + ' data-mode="transcription" title="Post speech as chat messages">📝&nbsp;Chat</button>';
            tool.element.appendChild(modesWrap);

            modesWrap.addEventListener('click', function (e) {
                var btn = e.target.closest('.Media_commands_mode_btn');
                if (!btn) return;
                var mode   = btn.getAttribute('data-mode');
                var active = btn.classList.toggle('active');
                var update = {};
                update[mode] = active;
                tool.setState({ modes: Q.extend({}, tool.state.modes, update) });
                if (tool.state._micActive) {
                    Q.Streams.Transcript.setModes(tool.state.modes);
                }
            });
        }
        });

    // ── Retain presentation stream for ephemeral forwarding ──────────────
    Streams.retainWith(tool).get(state.publisherId, state.streamName, function (err, stream) {
        if (err) return;
        tool._stream = stream;

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

}, {
    publisherId:           null,
    streamName:            null,
    isHost:                false,
    lang:                  'en-US',
    mode:                  'live',   // live|narration
    autoMic:               false,
    screenUrl:             null,
    isOwnLivestream:       false,
    // Per-participant stream (participant's own stream, related to presentation)
    // publishedBy the logged-in user, used for their personal tool state
    toolPublisherId: null,
    toolStreamName:  null,
    // Write level on the presentation stream — drives which tool interactions are enabled
    writeLevel:            16,  // ephemeral by default; server sets actual level
    _micActive:            false,
    _aiStarted:            false,
    modes: {
        composition:  true,  // AI proposes visualization cards from speech
        navigation:   true,  // voice commands control slides/video/zoom
        transcription:true   // posts each final utterance as Streams/chat/message
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
        var $btn = $(tool.element).find('.Media_presentation_commands_mic_btn');

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
        Q.Speech.Recognition(function () {
            // This callback fires synchronously if already loaded, async if cold load.
            // Either way, start() is called as close to the gesture as possible.
            Q.Speech.Recognition.start({
                lang:        state.lang || 'en-US',
                autoRestart: true,   // iOS Safari stops on silence — auto-restart
            });

            state._micActive = true;
            tool._updateMicUI(true);

            // Open the transcript session for all users — role guard is on the server
            tool._connectTranscript();
        });
    },

    _stopMic: function () {
        var tool = this;
        var state = tool.state;
        Q.Speech.Recognition.stop && Q.Speech.Recognition.stop();
        if (state._aiStarted) {
            Q.Streams.Transcript.stop();
            if (tool._mediaContext) { tool._mediaContext.unregister(); tool._mediaContext = null; }
            state._aiStarted = false;
        }
        state._micActive = false;
        tool._updateMicUI(false);
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
                publisherId:  state.publisherId,
                streamName:   state.streamName,
                type:         'Media/presentation/reaction',
                content:      emoji,
                instructions: JSON.stringify({ emoji: emoji, count: 1, relSec: relSec }),
            }, function () {});
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
            lines:     lines,
            msPerLine: msPerLine || 3000,
        });
    },

    _updateMicUI: function (active) {
        var $btn = $(this.element).find('.Media_presentation_commands_mic_btn');
        $btn.toggleClass('Media_commands_mic_active', active);
        $btn.attr('title', active ? 'Stop microphone' : 'Start microphone');
        // Pulsing red dot appears via CSS when active class is set
    },

    // ── Transcript session ───────────────────────────────────────────────────

    _connectTranscript: function () {
        var tool = this;
        var state = tool.state;
        if (state._aiStarted) return;
        state._aiStarted = true;
        state._sessionStartMs = Date.now();  // track for relSec calculation

        // Media enriches each utterance with slide + PDF context.
        if (state.modes.navigation !== false) {
            tool._mediaContext = Q.Media.Transcript.create({
                publisherId: state.publisherId,
                streamName:  state.streamName,
                slideIndex:  0
            });
            tool._mediaContext.register();
        }

        // Streams owns the session and the emit. It wires Q.Speech.Recognition
        // and forwards each final result as a Streams/utterance.
        Q.Streams.Transcript.start({
            lang:             state.lang || 'en-US',
            publisherId:      state.publisherId,
            streamName:       state.streamName,
            role:             state.isHost ? 'host' : 'participant',
            mode:             state.mode || 'live',   // live|narration
            isOwnLivestream:  !!state.isOwnLivestream,
            modes: {
                composition:   !!state.modes.composition,
                navigation:    !!state.modes.navigation,
                transcription: !!state.modes.transcription
            },
            toolStreamName:   state.toolStreamName  || null,
            toolPublisherId:  state.toolPublisherId || null
        });

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
                publisherId:       state.publisherId,
                streamName:        state.streamName,
                streamType:        data.streamType,
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
                try { sessionStorage.setItem(data.toolName + '/v' + version, data.code); } catch(e) {}

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
                wrap.className = 'Media_commands_generated_tool';
                tool.element.appendChild(wrap);
                var el = Q.Tool.prepare('div', data.toolName,
                    Q.extend({
                        mode:                  'host',
                        publisherId:           state.publisherId,
                        streamName:            state.streamName,
                        stream:                tool._stream || null,
                        // Participant stream: tool can publish its own state here
                        toolPublisherId: state.toolPublisherId,
                        toolStreamName:  state.toolStreamName,
                        toolStream:     tool._toolStream || null,
                        // Write level so tool knows what interactions to enable
                        writeLevel:            state.writeLevel
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
                _qEmit('Media/presentation/tool/committed', { toolName: data.toolName });
            }, tool);
        }
    },

    // ── Live caption ───────────────────────────────────────────────────────

    _showCaption: function (text) {
        var $cap = $(this.element).find('.Media_presentation_commands_caption');
        if (!$cap.length) {
            $cap = $('<div class="Media_commands_caption"></div>');
            $(this.element).find('.Media_presentation_commands_chat_wrap').before($cap);
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
        card.className = 'Media_commands_proposal';
        card.dataset.proposalId = proposal.proposalId;

        var label = (proposal.visualizationType || 'proposal').replace(/_/g, ' ');
        var preview = '';
        var d = proposal.visualizationData || {};
        if (d.term)   preview = d.term;
        else if (d.value && d.label) preview = d.value + ' — ' + d.label;
        else if (d.title) preview = d.title;
        else if (d.quote) preview = '"' + d.quote.slice(0, 60) + (d.quote.length > 60 ? '…' : '') + '"';
        else if (d.left && d.right) preview = (d.left.label || '') + ' vs ' + (d.right.label || '');
        else if (d.credit) preview = d.credit;
        else if (d.html) preview = 'HTML slide (' + d.html.length + ' chars)';

        card.innerHTML =
            '<div class="Media_commands_proposal_type">' + label + '</div>' +
            '<div class="Media_commands_proposal_preview">' + String(preview).encodeHTML() + '</div>' +
            '<div class="Media_commands_proposal_actions">' +
            '  <button class="Media_commands_proposal_commit" data-id="' + proposal.proposalId + '">Show</button>' +
            '  <button class="Media_commands_proposal_cancel" data-id="' + proposal.proposalId + '">Skip</button>' +
            '</div>' +
            '<div class="Media_commands_proposal_timer"></div>';

        tool._proposalsEl.insertBefore(card, tool._proposalsEl.firstChild);

        // Countdown ring
        var timerEl = card.querySelector('.Media_presentation_commands_proposal_timer');
        var elapsed = 0;
        var tick = setInterval(function () {
            elapsed += 100;
            var pct = Math.min(elapsed / windowMs * 100, 100);
            timerEl.style.setProperty('--pct', pct + '%');
            if (elapsed >= windowMs) clearInterval(tick);
        }, 100);
        card.dataset.tick = tick;

        // Buttons
        card.querySelector('.Media_presentation_commands_proposal_commit').addEventListener('click', function () {
            _qEmit('AI/veto/commit', { proposalId: proposal.proposalId });
            tool._removeProposal(proposal.proposalId);
        });
        card.querySelector('.Media_presentation_commands_proposal_cancel').addEventListener('click', function () {
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
        this._coachingEl.classList.remove('Media_commands_coaching_empty');
        this._coachingEl.innerHTML =
            '<span class="Media_commands_coaching_text">' + String(text).encodeHTML() + '</span>' +
            (sourceUri
                ? ' <a class="Media_commands_coaching_link" href="' + String(sourceUri).encodeHTML() +
                  '" target="_blank" rel="noopener">source</a>'
                : '');
        clearTimeout(this._coachingTimer);
        var el = this._coachingEl;
        this._coachingTimer = setTimeout(function () {
            el.classList.add('Media_commands_coaching_empty');
        }, 12000);
    },

    // ── Cleanup ────────────────────────────────────────────────────────────

    Q: {
        beforeRemove: function () {
            var tool = this, state = tool.state;
            if (state._micActive) tool._stopMic();
            // _stopMic calls Q.Streams.Transcript.stop(), which removes the
            // recognition handler Streams installed. Nothing tool-keyed remains.
            clearTimeout(tool._captionTimer);
            clearTimeout(tool._coachingTimer);
        }
    }

});

function _qEmit(event, data) {
    var qs = Q.Socket.get('/Q', '');
    if (qs) qs.socket.emit(event, data);
}

})(Q, Q.jQuery, window);
