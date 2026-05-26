(function (Q, $, window, undefined) {

function _qEmit(event, data) { var qs = Q.Socket.get('/Q', ''); if (qs) qs.socket.emit(event, data); }

/**
 * Media/webrtc/chat tool
 *
 * Extends Streams/chat with a phone-icon button that:
 *   1. Starts/stops a WebRTC call (always, same as before)
 *   2. Simultaneously wires/unwires the AI mic pipeline when
 *      composition OR navigation mode is enabled on this tool.
 *
 * MODES AND MIC LIFECYCLE
 * ───────────────────────
 * Each person who opens a Streams/chat and has this tool activated
 * gets their own independent mic + pipeline session tied to their
 * /Q socket. It has nothing to do with WebRTC peer connections.
 *
 *   Phone icon clicked (WebRTC off)
 *     → WebRTC call starts
 *     → If (state.composition || state.navigation): AI pipeline starts
 *       → AI/transcription/session/start sent on /Q socket with that
 *          person's role, publisherId, streamName, modes
 *
 *   Phone icon clicked (WebRTC on)
 *     → WebRTC call ends
 *     → If AI pipeline was started: AI/transcription/session/stop sent
 *
 * Multiple people joining the same WebRTC each get their own pipeline
 * session on their own socket. The server assigns role per session.
 * Only host-role sessions drive AI proposals; participant-role sessions
 * contribute transcripts only.
 *
 * speechMode option (legacy)
 * ──────────────────────────
 * When speechMode:true the phone icon controls only the mic, with no
 * WebRTC call. Used by the /control page. This behaviour is unchanged.
 *
 * @class Media/webrtc/chat
 * @constructor
 * @param {Object}  [options]
 * @param {Boolean} [options.speechMode=false]
 *   true  → phone icon starts/stops mic only (no WebRTC). Legacy control-page path.
 *   false → phone icon starts WebRTC; also starts mic when modes are on.
 * @param {Boolean} [options.composition=false]
 *   AI card composition enabled. When true AND WebRTC starts, mic pipeline starts.
 * @param {Boolean} [options.navigation=false]
 * @param {Boolean} [options.transcription=false]
 *   Post each final utterance as a Streams/chat/message on the stream.
 *   Voice navigation enabled. When true AND WebRTC starts, mic pipeline starts.
 * @param {String}  [options.role='participant']
 *   Role sent to the server. 'host' enables AI proposals; 'participant' records only.
 * @param {String}  [options.lang='en-US']
 * @param {Boolean} [options.autoConnectAI=true]
 *   When speechMode:true, auto-connect AI socket when mic starts.
 */
Q.Tool.define("Media/webrtc/chat", ["Streams/chat"], function (options, chatTool) {
    var tool  = this;
    var state = tool.state;
    tool.chatTool = chatTool;

    chatTool.startWebRTC = function () { tool.startWebRTC(); };

    var isTextarea = (chatTool.state.inputType === 'textarea');
    var $input = tool.$(isTextarea
        ? '.Streams_chat_composer textarea'
        : '.Streams_chat_composer input[type=text]');

    chatTool.state.onRefresh.add(function () {
        var label = state.speechMode
            ? (Q.getObject('text.chat.StartMic',   tool) || 'Start mic')
            : (Q.getObject('text.chat.JoinWebRTC', tool.chatTool) || 'Call');

        var $el = $('<div class="Streams_chat_call Streams_chat_submit_replacement Q_appear'
            + (state.speechMode ? ' Media_webrtc_chat_speechmode' : '')
            + '" data-touchlabel="' + label + '"></div>');

        $(this.element).find('.Streams_chat_submit').after($el);

        $el.on(Q.Pointer.fastclick, function (e) {
            e.stopPropagation();
            e.preventDefault();
            $input.blur();
            if (state.speechMode) {
                tool._toggleMic();
            } else {
                tool.startWebRTC();
            }
        });

        tool._$phoneBtn = $el;
    }, tool);

},

{
    speechMode:   false,
    composition:   false,
    navigation:    false,
    transcription: false,
    role:         'participant',
    lang:         'en-US',
    autoConnectAI: true,
    _micActive:   false,
    _aiStarted:   false,
    _webrtcActive: false
},

{
    /**
     * Start a WebRTC call.
     * Also starts the AI mic pipeline when composition or navigation is on.
     */
    startWebRTC: function () {
        var tool = this, state = tool.state;

        if (state._webrtcActive) {
            // Second tap: end the call
            if (chatTool && chatTool.state.webrtc) {
                chatTool.state.webrtc.end && chatTool.state.webrtc.end();
            }
            return;
        }

        var chatTool = tool.chatTool;
        chatTool.element.setAttribute('data-webrtc', 'loading');

        Q.Media.WebRTC.start({
            roomPublisherId: Q.Users.loggedInUserId(),
            publisherId:     chatTool.state.publisherId,
            streamName:      chatTool.state.streamName,
            closeManually:   true,
            tool:            tool,
            useRelatedTo:    true,

            onWebrtcControlsCreated: function () {
                chatTool.element.setAttribute('data-webrtc', true);
            },

            onStart: function () {
                chatTool.state.webrtc = this;
                state._webrtcActive = true;
                tool._updatePhoneUI(true);

                // Wire mic pipeline if modes are enabled
                if (state.composition || state.navigation || state.transcription) {
                    tool._startMic();
                }
            },

            onEnd: function () {
                chatTool.state.webrtc = null;
                state._webrtcActive = false;
                tool._updatePhoneUI(false);

                // Unwire mic pipeline
                if (state._micActive) tool._stopMic();
            }
        });
    },

    // ── Mic pipeline ─────────────────────────────────────────────────────────

    _toggleMic: function () {
        var state = this.state;
        if (state._micActive) this._stopMic();
        else                  this._startMic();
    },

    /**
     * Start speech recognition + AI pipeline.
     * Called synchronously inside gesture handler for iOS Safari.
     */
    _startMic: function () {
        var tool = this, state = tool.state;
        if (state._micActive) return;

        Q.Speech.Recognition(function () {
            Q.Speech.Recognition.start({
                lang:        state.lang || 'en-US',
                autoRestart: true
            });
            state._micActive = true;
            tool._updateMicUI(true);

            if (state.autoConnectAI || state.speechMode) {
                tool._connectAISocket();
            }
        });
    },

    _stopMic: function () {
        var tool = this, state = tool.state;
        if (!state._micActive) return;

        if (Q.Speech && Q.Speech.Recognition && Q.Speech.Recognition.stop) {
            Q.Speech.Recognition.stop();
        }
        state._micActive = false;
        tool._updateMicUI(false);

        if (state._aiStarted) {
            _qEmit('AI/transcription/session/stop');
            state._aiStarted = false;
        }
        if (Q.Speech && Q.Speech.Recognition && Q.Speech.Recognition.onResult) {
            Q.Speech.Recognition.onResult.remove(tool);
        }
    },

    /**
     * Connect to the AI pipeline on the /Q socket.
     * One session per person per socket — independent of WebRTC peers.
     */
    _connectAISocket: function () {
        var tool = this, state = tool.state;
        if (state._aiStarted) return;
        state._aiStarted = true;

        var chatTool    = tool.chatTool;
        var publisherId = chatTool.state.publisherId;
        var streamName  = chatTool.state.streamName;

        _qEmit('AI/transcription/session/start', {
            lang:        state.lang || 'en-US',
            sampleRate:  16000,
            publisherId: publisherId,
            streamName:  streamName,
            role:        state.role || 'participant',
            modes: {
                composition:  !!state.composition,
                navigation:   !!state.navigation,
                transcription:!!state.transcription
            }
        });

        // Client-side classifier — intercepts navigation before server
        var chatTool2 = tool.chatTool;
        var pStream   = null;
        try {
            pStream = Q.Streams.get.cache.get([publisherId, streamName]) || null;
        } catch (e) {}
        if (Q.Media && Q.Media.ClientClassifier && state.navigation) {
            tool._classifier = Q.Media.ClientClassifier.create({
                publisherId:    publisherId,
                streamName:     streamName,
                stream:         pStream,
                qEmit:          _qEmit,
                sessionStartMs: Date.now()
            });
        }

        // Forward final transcripts to the server pipeline
        Q.Speech.Recognition.onResult.set(function (chunk) {
            if (!chunk || !chunk.isFinal) return;
            // Intercept navigation locally when navigation mode is on
            if (tool._classifier && state.navigation) {
                var handled = tool._classifier.intercept(chunk.transcript);
                if (handled) return;
            }
            _qEmit('Streams/utterance', {
                transcript: chunk.transcript,
                isFinal:    true,
                confidence: chunk.confidence,
                speaker:    Q.Users.loggedInUserId()
            });
        }, tool);
    },

    // ── UI helpers ────────────────────────────────────────────────────────────

    _updatePhoneUI: function (active) {
        if (!this._$phoneBtn) return;
        this._$phoneBtn.toggleClass('Media_webrtc_chat_active', active);
        var label = active
            ? (Q.getObject('text.chat.EndCall',    this.chatTool) || 'End call')
            : (Q.getObject('text.chat.JoinWebRTC', this.chatTool) || 'Call');
        this._$phoneBtn.attr('data-touchlabel', label);
    },

    _updateMicUI: function (active) {
        if (!this._$phoneBtn) return;
        this._$phoneBtn.toggleClass('Media_webrtc_chat_mic_active', active);
        if (this.state.speechMode) {
            var chat  = this.text && this.text.chat;
            var label = active
                ? (chat && chat.StopMic  || 'Stop mic')
                : (chat && chat.StartMic || 'Start mic');
            this._$phoneBtn.attr('data-touchlabel', label);
        }
    },

    /**
     * Dynamically update composition/navigation modes.
     * If WebRTC is active and AI session is running, also notifies the server.
     * If WebRTC is active but AI not started, starts it when any mode turns on.
     * @method setModes
     * @param {Object} modes  { composition: bool, navigation: bool }
     */
    setModes: function (modes) {
        var tool = this, state = tool.state;
        if (modes.composition   !== undefined) state.composition   = !!modes.composition;
        if (modes.navigation    !== undefined) state.navigation    = !!modes.navigation;
        if (modes.transcription !== undefined) state.transcription = !!modes.transcription;

        if (!state._webrtcActive && !state.speechMode) return;

        var anyOn = state.composition || state.navigation || state.transcription;
        if (anyOn && !state._micActive) {
            // Mode just turned on — start mic pipeline
            tool._startMic();
        } else if (!anyOn && state._micActive) {
            // Both modes off — stop mic pipeline
            tool._stopMic();
        } else if (state._aiStarted) {
            // Session running — notify server of mode change
            _qEmit('AI/session/modes', {
                composition: state.composition,
                navigation:  state.navigation
            });
        }
    },

    Q: {
        beforeRemove: function () {
            var tool = this, state = tool.state;
            if (state._micActive) tool._stopMic();
            if (Q.Speech && Q.Speech.Recognition && Q.Speech.Recognition.onResult) {
                Q.Speech.Recognition.onResult.remove(tool);
            }
        }
    }
});

})(Q, Q.jQuery, window);
