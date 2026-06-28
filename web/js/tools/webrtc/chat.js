(function (Q, $, window, undefined) {

/**
 * Media/webrtc/chat tool
 *
 * Extends Streams/chat with a phone-icon button that:
 *   1. Starts/stops a WebRTC call (always, same as before)
 *   2. Simultaneously wires/unwires the mic + transcript session when
 *      composition, navigation, or transcription mode is enabled on this tool.
 *
 * MODES AND MIC LIFECYCLE
 * ───────────────────────
 * Each person who opens a Streams/chat and has this tool activated gets their
 * own independent mic + transcript session tied to their /Q socket. It has
 * nothing to do with WebRTC peer connections.
 *
 * The tool owns the mic gesture only. The session and the emit belong to
 * Streams: it calls Q.Streams.Transcript.start(), which announces the session
 * to the server and forwards each final Q.Speech.Recognition result as a
 * Streams/utterance. When navigation is on, the tool also registers
 * Q.Media.Transcript so Media can attach slide + PDF context to each utterance.
 *
 *   Phone icon clicked (WebRTC off)
 *     → WebRTC call starts
 *     → If (composition || navigation || transcription): mic starts and
 *       Q.Streams.Transcript.start() opens the session
 *
 *   Phone icon clicked (WebRTC on)
 *     → WebRTC call ends
 *     → If the session was started: Q.Streams.Transcript.stop()
 *
 * Multiple people joining the same WebRTC each get their own session on their
 * own socket. The server assigns role per session. Only host-role sessions
 * drive AI proposals; participant-role sessions contribute transcripts only.
 *
 * speechMode option (legacy)
 * ──────────────────────────
 * When speechMode:true the phone icon controls only the mic, with no WebRTC
 * call. Used by the /control page. This behaviour is unchanged.
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
 *   Voice navigation enabled. When true AND WebRTC starts, mic pipeline starts.
 * @param {Boolean} [options.transcription=false]
 *   Post each final utterance as a Streams/chat/message on the stream.
 * @param {String}  [options.role='participant']
 *   Role sent to the server. 'host' enables AI proposals; 'participant' records only.
 * @param {String}  [options.lang='en-US']
 * @param {Boolean} [options.autoConnectAI=true]
 *   When speechMode:true, auto-open the transcript session when mic starts.
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
    speechMode:    false,
    composition:   false,
    navigation:    false,
    transcription: false,
    role:          'participant',
    lang:          'en-US',
    autoConnectAI: true,
    _micActive:    false,
    _aiStarted:    false,
    _webrtcActive: false
},

{
    /**
     * Start a WebRTC call.
     * Also starts the mic + transcript session when any mode is on.
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
     * Start speech recognition + transcript session.
     * Called synchronously inside the gesture handler for iOS Safari.
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
                tool._connectTranscript();
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
            Q.Streams.Transcript.stop();
            if (tool._mediaContext) {
                tool._mediaContext.unregister();
                tool._mediaContext = null;
            }
            state._aiStarted = false;
        }
    },

    /**
     * Open the transcript session and register Media's context contributor.
     * Streams.Transcript wires onResult and owns the emit.
     */
    _connectTranscript: function () {
        var tool = this, state = tool.state;
        if (state._aiStarted) return;
        state._aiStarted = true;

        var chatTool    = tool.chatTool;
        var publisherId = chatTool.state.publisherId;
        var streamName  = chatTool.state.streamName;

        // Media enriches each utterance with slide + PDF context.
        if (state.navigation) {
            tool._mediaContext = Q.Media.Transcript.create({
                publisherId: publisherId,
                streamName:  streamName,
                slideIndex:  0
            });
            tool._mediaContext.register();
        }

        Q.Streams.Transcript.start({
            publisherId: publisherId,
            streamName:  streamName,
            role:        state.role || 'participant',
            lang:        state.lang || 'en-US',
            modes: {
                composition:   !!state.composition,
                navigation:    !!state.navigation,
                transcription: !!state.transcription
            }
        });
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
     * Dynamically update composition / navigation / transcription modes.
     * If the session is running, notify the server. If the mic is off and a mode
     * turns on (with WebRTC up or in speechMode), start the mic pipeline; if all
     * modes turn off, stop it.
     * @method setModes
     * @param {Object} modes  { composition, navigation, transcription }
     */
    setModes: function (modes) {
        var tool = this, state = tool.state;
        if (modes.composition   !== undefined) state.composition   = !!modes.composition;
        if (modes.navigation    !== undefined) state.navigation    = !!modes.navigation;
        if (modes.transcription !== undefined) state.transcription = !!modes.transcription;

        if (!state._webrtcActive && !state.speechMode) return;

        var anyOn = state.composition || state.navigation || state.transcription;
        if (anyOn && !state._micActive) {
            // A mode just turned on — start the mic pipeline
            tool._startMic();
        } else if (!anyOn && state._micActive) {
            // All modes off — stop the mic pipeline
            tool._stopMic();
        } else if (state._aiStarted) {
            // Session running — notify the server of the mode change
            Q.Streams.Transcript.setModes({
                composition:   state.composition,
                navigation:    state.navigation,
                transcription: state.transcription
            });
        }
    },

    Q: {
        beforeRemove: function () {
            var tool = this, state = tool.state;
            if (state._micActive) tool._stopMic();
        }
    }
});

})(Q, Q.jQuery, window);