/**
 * Library for real time calls based on WebRTC
 * @module WebRTCconferenceLib
 * @class WebRTCconferenceLib
 * @param {Object} [options] config options
 * @param {String} [options.mode = 'node']
 * @param {String} [options.nodeServer] address of node websocket server that is used as signalling server while WebRTC negotiation
 * @param {String} [options.roomName] unique string that is used as room identifier
 * @param {Array} [streams] Precreated streams that will be added to call
 * @param {Number} [disconnectTime] time in ms after which inactive user will be disconnected
 * @param {Array} [turnCredentials] Array of objects that contains createndials for TURN server
 * @param {String} [turnCredentials[].credential] secret string/password
 * @param {String} [turnCredentials[].urls] address of TURN Server
 * @param {String} [turnCredentials[].username]
 * @param {Boolean} [debug] if true, logs will be showed in console
 * @return {Object} instance of Webcast
 */
window.WebRTCWebcastClient = function (options){
    var app = {};
    var defaultOptions = {
        mode: 'node',
        role: 'receiver',
        nodeServer: '',
        roomName: null,
        streams: null,
        disconnectTime: 3000,
        turnCredentials: null,
        livestreamStreamData: null,
        debug: true,
    };

    window.getWebcast = function () {
        return app;
    }

    if(typeof options === 'object') {
        var mergedOptions = {};
        for (var key in defaultOptions) {
            if (defaultOptions.hasOwnProperty(key)) {
                mergedOptions[key] = options.hasOwnProperty(key) && typeof options[key] !== 'undefined' ? options[key] : defaultOptions[key];
            }
        }
        options = mergedOptions;
    }

    console.log('options', options)

    app.getOptions = function () {
        return options;
    }

    var roomParticipants = [];
    app.roomParticipants = function(all) {
        if(all) {
            return roomParticipants;
        } else {
            return roomParticipants.filter(function (participant) {
                return (participant.online !== false);
            });
        }
    }


    app.addParticipant = function(participant) {roomParticipants.unshift(participant);}

    var localParticipant;
    app.localParticipant = function() { return localParticipant; }
    app.state = 'disconnected';
    app.initNegotiationState = 'disconnected';

    var _role = options.role;
    //node.js vars
    var socket;
    app.socket = function() { return socket; }

    app.id = generateId()
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).replace(/\./g, "");
    }

    console.log('broadcastClient.create', app.id);

    var _isMobile;
    var _isiOS;
    var _isAndroid;
    var _usesUnifiedPlan =  RTCRtpTransceiver.prototype.hasOwnProperty('currentDirection');

    var turn = false;
    var pc_config = {
        //"iceTransportPolicy": "relay",
        "iceServers": [
            {
                "urls": "stun:stun.l.google.com:19302"
            },
             /*{
				 'url': 'turn:194.44.93.224:3478',
				 'credential': 'qbixpass',
				 'username': 'qbix'
			 }*/
        ],
        "sdpSemantics":"unified-plan"
    };

    var ua = navigator.userAgent;
    if(!_usesUnifiedPlan) {
        pc_config.sdpSemantics = 'plan-b';
    }


    if(options.turnCredentials != null || turn) {
        var changeToUrls;
        try{
            testPeerConnection = new RTCPeerConnection(pc_config);
        } catch (e) {
            changeToUrls = true;
        }
        if(testPeerConnection != null) testPeerConnection.close();

        for(var t in options.turnCredentials) {
            var turn = options.turnCredentials[t];
            pc_config['iceServers'].push(turn)

            if(changeToUrls) {
                turn['urls'] = turn['url'];
                delete turn['url'];
            }
        }
        console.log('pc_config', pc_config)
    } else {
        var testPeerConnection = new RTCPeerConnection(pc_config);
    }

    if(ua.indexOf('Android')!=-1||ua.indexOf('Windows Phone')!=-1||ua.indexOf('iPhone')!=-1||ua.indexOf('iPad')!=-1||ua.indexOf('iPod')!=-1) {
        _isMobile = true;
        if(ua.indexOf('iPad')!=-1||ua.indexOf('iPhone')!=-1||ua.indexOf('iPod')!=-1) {
            _isiOS = true;
        } else if (/android/i.test(ua)) {
            _isAndroid = true;
        }
    }

    var browser = determineBrowser(navigator.userAgent)
    var _localInfo = {
        isMobile: _isMobile,
        platform: _isiOS ? 'ios' : (_isAndroid ? 'android' : null),
        usesUnifiedPlan: _usesUnifiedPlan,
        isCordova: typeof cordova != 'undefined',
        ua: navigator.userAgent,
        browserName: browser[0],
        browserVersion: parseInt(browser[1]),
        supportedVideoMimeTypes: []
    }

    if(typeof MediaRecorder != 'undefined') {
        if (MediaRecorder.isTypeSupported('video/mp4')) {
            _localInfo.supportedVideoMimeTypes.push('video/mp4');
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
            _localInfo.supportedVideoMimeTypes.push('video/webm;codecs=h264');
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
            _localInfo.supportedVideoMimeTypes.push('video/webm;codecs=vp9');
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            _localInfo.supportedVideoMimeTypes.push('video/webm;codecs=vp9');
        }
    }

    if(_isiOS && _localInfo.browserName == 'Safari' && _localInfo.browserVersion < 14.4){
        options.useCordovaPlugins = true;
    }

    /**
     * Event system of app
     *
     * @method app.event
     * @return {Object}
     */
    function EventSystem(){

        var events = {};

        var CustomEvent = function (eventName) {

            this.eventName = eventName;
            this.callbacks = [];

            this.registerCallback = function(callback) {
                this.callbacks.push(callback);
            }

            this.unregisterCallback = function(callback) {
                const index = this.callbacks.indexOf(callback);
                if (index > -1) {
                    this.callbacks.splice(index, 1);
                }
            }

            this.fire = function(data) {
                const callbacks = this.callbacks.slice(0);
                callbacks.forEach((callback) => {
                    callback(data);
                });
            }
        }

        var dispatch = function(eventName, data) {
            if(!doesHandlerExist(eventName)) {
                return;
            }

            const event = events[eventName];
            if (event) {
                event.fire(data);
            }
        }

        var on = function(eventName, callback) {
            let event = events[eventName];
            if (!event) {
                event = new CustomEvent(eventName);
                events[eventName] = event;
            }
            event.registerCallback(callback);
        }

        var off = function(eventName, callback) {
            const event = events[eventName];
            if (event && event.callbacks.indexOf(callback) > -1) {
                event.unregisterCallback(callback);
                if (event.callbacks.length === 0) {
                    delete events[eventName];
                }
            }
        }

        var doesHandlerExist = function (eventName) {
            if(events[eventName] != null && events[eventName].callbacks.length != 0) return true;
            return false;
        }

        var destroy = function () {
            events = {};
        }

        return {
            dispatch:dispatch,
            on:on,
            off:off,
            doesHandlerExist:doesHandlerExist,
            destroy:destroy
        }
    }

    app.event = new EventSystem();

    /**
     * Contains information about participant
     * @class Participant
     * @constructor
     */
    var Participant = function () {
        let instance = this;
        /**
         * Participant's sid = socket.id
         *
         * @property sid
         * @type {String}
         */
        this.sid = null;
        /**
         * Is composed of Q.Users.loggedInUser and timestamp and is used by clients for outputing participant's name
         *
         * @property identity
         * @type {String}
         */
        this.identity = null;
        /**
         * Array of tracks that participant has
         *
         * @property tracks
         * @uses Track
         * @type {Array}
         */
        this.tracks = [];
        /**
         * Array of streams that participant has TODO:remove it as it is not used anymore
         *
         * @property streams
         * @type {Array}
         */
        this.streams = [];
        /**
         * Returns list of participant's video tracks
         *
         * @method videoTracks
         * @uses Track
         * @param {Object} [activeTracksOnly] return only active video tracks
         * @return {Array}
         */
        this.videoTracks = function (activeTracksOnly) {
            if(activeTracksOnly) {
                return this.tracks.filter(function (trackObj) {
                    return trackObj.kind == 'video' && !(trackObj.mediaStreamTrack.muted == true || trackObj.mediaStreamTrack.enabled == false || trackObj.mediaStreamTrack.readyState == 'ended');
                });
            }

            return this.tracks.filter(function (trackObj) {
                return trackObj.kind == 'video';
            });

        }
        /**
         * Returns list of participant's audio tracks
         *
         * @method audioTracks
         * @uses Track
         * @return {Array}
         */
        this.audioTracks = function () {
            return this.tracks.filter(function (trackObj) {
                return trackObj.kind == 'audio';
            });
        }
        this.muteAudio = function () {
            for(var i in this.tracks) {
                var track = this.tracks[i];
                if(track.kind != 'audio') continue;
                track.trackEl.muted = true;
            }
            this.audioIsMuted = true;
            app.event.dispatch('audioMuted', this);

        };
        this.unmuteAudio = function () {
            if(this.isAudioMuted == false) return;
            for(var i in this.tracks) {
                var track = this.tracks[i];
                if(track.kind != 'audio') continue;
                track.trackEl.muted = false;
            }
            this.audioIsMuted = false;
            app.event.dispatch('audioUnmuted', this);

        };
        /**
         * Removes track from participants tracks list and stops sending it to all participants
         *
         * @method remove
         */
        this.remove = function () {

            app.event.dispatch('participantRemoved', this);

            for(var t = this.tracks.length - 1; t >= 0; t--){

                if(this.tracks[t].mediaStreamTrack != null) {
                    this.tracks[t].mediaStreamTrack.stop();
                }
                if(typeof cordova != 'undefined' && _isiOS && options.useCordovaPlugins && this.tracks[t].stream != null) {
                    this.tracks[t].stream.getTracks()[0].stop();
                }
            }

            if(this.RTCPeerConnection != null) this.RTCPeerConnection.close();

            if(options.useCordovaPlugins && typeof cordova != 'undefined' && _isiOS) iosrtcLocalPeerConnection.removeLocalNativeStreams();
            for(var p = roomParticipants.length - 1; p >= 0; p--){
                if(roomParticipants[p].sid == this.sid) {
                    roomParticipants.splice(p, 1);
                    break;
                }
            }
        }
        /**
         * Array of participant's screens. Usually participant has only one screen with webcam video. Potentially there
         * could be several screens (e.g. webcam + screen sharing) in the future
         *
         * @property screens
         * @uses Screen
         * @type {Array}
         */
        this.screens = [];        /**
         *  Instance of RTCPeerConnection interface that represents a WebRTC connection between the local participant
         *  and a remote peer
         *
         * @property RTCPeerConnection
         * @type {RTCPeerConnection}
         */
        this.RTCPeerConnection = null;
        /**
         *  Queue of ice remote candidates that is used when ice candidate is received but connection is still not
         *  established completely (signalling state is not stable). Gathered remote candidates are added to RTCPeerConnection on
         *  onsignallingstatechange event (currently iceCandidatesQueue is not used)
         *
         * @property iceCandidatesQueue
         * @type {Array}
         */
        this.iceCandidatesQueue = [];
        /**
         *  Array of local ice candidates. Is used for testing purpose TODO: remove
         *
         * @property candidates
         * @type {Array}
         */
        this.candidates = [];
        /**
         * Stores participant's offer(s) that will be send to remote participant when current negotiation process
         * will be completed. Is used to prevent glaring when two peers send offers at the same time. Feature
         * is not finished.
         *
         * @property offersQueue
         * @type {Array}
         */
        this.offersQueue = [];
        /**
         * Stores current negotiation state. Is "true" when offer received or new participant connected and is set
         * to "false" when connection is established (answer received or signallingState = stable)
         *
         * @property isNegotiating
         * @type {Boolean}
         */
        this.isNegotiating = false;
        /**
         * Non false value means that one more renegotiation is needed when current one will be finished
         *
         * @property hasNewOffersInQueue
         * @type {Integer|Boolean}
         */
        this.hasNewOffersInQueue = false;
        /**
         * Non false value means id of the offer that is in progress. When current offer is finished, currentOfferId will
         * be compared to hasNewOffersInQueue and if it differs, new negotiation well be needed.
         *
         * @property currentOfferId
         * @type {Integer|Boolean}
         */
        this.currentOfferId = false;
        /**
         * Writable property that corrsponds to .RTCPeerConnection.signallingState but can have additional values:
         * have-local-pranswer
         *
         * @property signallingState
         * @type {Object}
         */
        this.signalingState = (function(participant){
            let signalingState = {};
            signalingState._state = null;
            signalingState.stage = null;
            signalingState.setStage = function (stage) {
                try {
                    var err = (new Error);
                    console.log(err.stack);
                } catch (e) {

                }
                signalingState.stage = stage;
                app.event.dispatch('signalingStageChange', {participant:participant, signalingState: signalingState});
                log('setStage', instance, signalingState)

            }

            Object.defineProperties(signalingState, {
                'state': {
                    'set': function(value) {
                        console.log('signalingState setState')
                        try {
                            var err = (new Error);
                            console.log(err.stack);
                        } catch (e) {

                        }
                        this._state = value;
                    },
                    'get': function () {
                        return this._state
                    }
                }
            });

            return signalingState;
        }(this));
        //this.audioStream = null;
        //this.videoStream = null;
        /**
         * There are two possible roles. Polite - participant asks another side for offer order or deos rollback/discards
         * own offer if he receives offer from another side at the same time; impolite - ignores an incoming offer when
         * this would collide with its own.
         *
         * @property signalingRole
         * @type {String}
         */
        this.signalingRole = null;
        /**
         * Property is used to check whether first negotiation happened between peers
         *
         * @property initNegotiationEnded
         * @type {Boolean}
         */
        this.initNegotiationEnded = false;
        /**
         * Property is used only for remote participants and shows whether local participant muted audio of another
         * participant
         *
         * @property audioIsMuted
         * @type {Boolean}
         */
        this.audioIsMuted = false;
        /**
         * Property shows whether remote participant's microphone is enabled. Is used in heartbeat feature: if local
         * participant doesn't hear remote peer and remoteMicIsEnabled=false, he sends service message to that peer,
         * who reenabled microphone if it really doesn't work.
         *
         * @property remoteMicIsEnabled
         * @type {Boolean}
         */
        this.remoteMicIsEnabled = false;
        /**
         * Property shows whether remote participant currently streams video chat to Facebook
         *
         * @property fbLiveStreamingActive
         * @type {Boolean}
         */
        this.fbLiveStreamingActive = false;
        /**
         * Represents whether participant is local
         *
         * @property isLocal
         * @type {Boolean}
         */
        this.isLocal = false;
        /**
         * Time when participant joined the room
         *
         * @property connectedTime
         * @type {Boolean}
         */
        this.connectedTime = null;
        /**
         * Keeps latest received heartbeet from remote user. If it's more than 3+1s, participant's state will be set
         * to offline by hearbeat feature.
         *
         * @property latestOnlineTime
         * @type {Boolean}
         */
        this.latestOnlineTime = null;
        /**
         * Keeps latest received heartbeet from remote user. If it's more than 3+1s, participant's state will be set
         * to offline by hearbeat feature.
         *
         * @property latestOnlineTime
         * @type {Boolean}
         */
        this.reconnectionsCounter = null;
        /**
         * Represents current participant's online state
         *
         * @property online
         * @type {Boolean}
         */
        this.online = true;
        /**
         * Stores information about participant's device/computer. Is used, for example, to detect if device of remote
         * participant supports unified plan;
         *
         * @property localInfo
         * @type {Object}
         */
        this.localInfo = {};
        this.event = new EventSystem();
    }

    var Track = function () {
        this.sid = null;
        this.kind = null;
        this.type = null;
        this.parentScreen = null;
        this.trackEl = null;
        this.mediaStreamTrack = null;
        this.screensharing = null;
        this.remove = function () {

            if(this.parentScreen != null) {
                var index = this.parentScreen.tracks.map(function(e) { return e.mediaStreamTrack.id; }).indexOf(this.mediaStreamTrack.id);
                this.parentScreen.tracks[index] = null;
                this.parentScreen.tracks = this.parentScreen.tracks.filter(function (obj) {
                    return obj != null;
                })
                //if(this.kind == 'video') this.parentScreen.videoTrack = null;
            }

            var index = this.participant.tracks.map(function(e) { return e.mediaStreamTrack.id; }).indexOf(this.mediaStreamTrack.id);
            this.participant.tracks[index] = null;
            this.participant.tracks = this.participant.tracks.filter(function (obj) {
                return obj != null;
            })

            //if(this.trackEl.parentNode != null) this.trackEl.parentNode.removeChild(this.trackEl);
        };
    }

    app.mediaControls = (function () {
        var _mediaElement = document.createElement('VIDEO');
        _mediaElement.controls = true;
        var _mediaStream;
        try{
            if(options.useCordovaPlugins && typeof cordova != "undefined" && _isiOS && participant.isLocal && (participant.audioStream != null || participant.videoStream != null)) {

                _mediaStream = track.kind == 'audio' ? participant.audioStream : participant.videoStream
            } else {
                _mediaStream = new MediaStream();
            }
        } catch(e){
            console.error(e.name + ': ' + e.message)
        }
        console.log('_mediaStream', _mediaStream)
        _mediaElement.srcObject = _mediaStream;
        //if(options.role == 'publisher') {
            _mediaElement.muted = true;
            _mediaElement.autoplay = true;
            _mediaElement.playsInline = true;
            _mediaElement.setAttribute('webkit-playsinline', true);
        //}

        function publishStream(stream) {
            if(options.role != 'publisher') return;
            console.log('publishStream');
            var tracks = stream.getTracks();
            for (var t in tracks) {
                var trackToAttach = new Track();
                trackToAttach.kind = tracks[t].kind;
                trackToAttach.mediaStreamTrack = tracks[t];
                trackToAttach.stream = stream;
                //localParticipant.tracks.push(trackToAttach);
                attachTrack(trackToAttach, localParticipant)
            }
        }

        function videoTrackIsAdded(track) {
            log('videoTrackIsAdding');

            //if(_mediaElement.srcObject == null) _mediaElement.srcObject = track.stream;
            //_mediaElement.srcObject = null;
            //_mediaElement.srcObject = _mediaStream;
            
            let vtracks = _mediaStream.getVideoTracks();
            for(let t in vtracks) {
                _mediaStream.removeTrack(vtracks[t]);
            }
            _mediaStream.addTrack(track.mediaStreamTrack);
        }

        function audioTrackIsAdded(track) {
            log('audioTrackIsAdded');

            //if(_mediaElement.srcObject == null) _mediaElement.srcObject = track.stream;

            let atracks = _mediaStream.getAudioTracks();
            log('audioTrackIsAdded atracks', atracks.length);

            for(let t in atracks) {
                log('audioTrackIsAdded removeTrack', atracks[t]);

                _mediaStream.removeTrack(atracks[t]);
            }
            _mediaStream.addTrack(track.mediaStreamTrack);
        }

        /**
         * Attaches new tracks to Participant and to his screen. If there is no screen, it creates it. If screen already
         * has video track while adding new, it replaces old video track with new one.
         * @method attachTrack
         * @param {Object} [track] instance of Track (not MediaStreamTrack) that has mediaStreamTrack as its property
         * @param {Object} [participant.url] instance of Participant
         */
        function attachTrack(track, participant) {
            log('attachTrack ' + track.kind);
            log('attachTrack: track.screensharing', track.screensharing);
            app.event.dispatch('beforeTrackAdded', {participant:participant, track: track});

            if(track.kind == 'video') {
                log('attachTrack: video');
                createTrackElement(track, participant);
                videoTrackIsAdded(track);
                app.event.dispatch('videoTrackIsBeingAdded', {track: track, participant: participant});
            } else if(track.kind == 'audio') {
                createTrackElement(track, participant);
                audioTrackIsAdded(track);
            }

            var localTrackExist = localParticipant.tracks.filter(function (t) {
                return t == track;
            })[0];
            log('attachTrack addTracksToPeerConnections');

            if(localTrackExist == null) {
                log('attachTrack addTracksToPeerConnections');
                localParticipant.tracks.push(track);
                app.signalingDispatcher.addTracksToPeerConnections();
            }

            track.participant = participant;

            var trackExist = participant.tracks.filter(function (t) {
                return t == track;
            })[0];
            
            if(trackExist == null) {
                log('attachTrack participant.tracks.push');
                participant.tracks.push(track);
            }

            app.event.dispatch('trackAdded', {participant:participant, track: track});

        }

        /**
         * Creates HTMLMediaElement for audio/video track. Sets handlers on mute, unmute, ended events of video track -
         * this is needed for showing/hiding participant's screen when his video is can be played or muted.
         * loadedmetadata helps us to know video size to fit screen size to it when rendering layout
         * @method createTrackElement
         * @param {Object} [track] instance of Track (not MediaStreamTrack) that has mediaStreamTrack as its property
         * @param {Object} [participant.url] instance of Participant
         * @returns {HTMLMediaElement}
         */
        function createTrackElement(track, participant) {
            log('createTrackElement: ' + track.kind);
            log('createTrackElement: local' + participant.isLocal);
            var remoteStreamEl, stream;
            if(track.stream == null) {
                log('createTrackElement: stream does not exist');

                try{
                    if(options.useCordovaPlugins && typeof cordova != "undefined" && _isiOS && participant.isLocal && (participant.audioStream != null || participant.videoStream != null)) {

                        stream = track.kind == 'audio' ? participant.audioStream : participant.videoStream
                    } else {
                        stream = new MediaStream();
                    }
                } catch(e){
                    console.error(e.name + ': ' + e.message)
                }


                stream.addTrack(track.mediaStreamTrack);
                track.stream = stream;
            }
            /*if(track.stream != null) {
                try {
                    log('createTrackElement: stream exists');

                    if(track.kind == 'audio' && participant.audioEl != null) {
                        log('createTrackElement: stream exists: el exists');

                        remoteStreamEl = participant.audioEl;
                    } else {
                        log('createTrackElement: stream exists: create el');

                        remoteStreamEl = document.createElement(track.kind);
                    }

                    remoteStreamEl.srcObject = stream = track.stream;
                } catch(e) {
                    console.error(e.name + ': ' + e.message)
                }

            } else {
                log('createTrackElement: stream does not exist');

                if(track.kind == 'audio' && participant.audioEl != null) {
                    remoteStreamEl = participant.audioEl;
                } else {
                    remoteStreamEl = document.createElement(track.kind);
                }

                try{
                    if(options.useCordovaPlugins && typeof cordova != "undefined" && _isiOS && participant.isLocal && (participant.audioStream != null || participant.videoStream != null)) {

                        stream = track.kind == 'audio' ? participant.audioStream : participant.videoStream
                    } else {
                        stream = new MediaStream();
                    }
                } catch(e){
                    console.error(e.name + ': ' + e.message)
                }


                stream.addTrack(track.mediaStreamTrack);

                var binaryData = [];
                binaryData.push(stream);

                try{
                    remoteStreamEl.srcObject = stream;
                } catch(e){
                    console.error(e.name + ': ' + e.message)
                }
                track.stream = stream;
            }

            remoteStreamEl.controls = true;

            if(!participant.isLocal && track.kind == 'video') {
                remoteStreamEl.muted = true;
                remoteStreamEl.autoplay = true;
                remoteStreamEl.playsInline = true;
                remoteStreamEl.setAttribute('webkit-playsinline', true);

                remoteStreamEl.setAttributeNode(document.createAttribute('webkit-playsinline'));
                remoteStreamEl.setAttributeNode(document.createAttribute('autoplay'));
                remoteStreamEl.setAttributeNode(document.createAttribute('playsInline'));
                remoteStreamEl.setAttributeNode(document.createAttribute('muted'));
                //remoteStreamEl.load();
            }

            if(!participant.isLocal && track.kind == 'audio') {
                remoteStreamEl.autoplay = true;
                remoteStreamEl.load();
                remoteStreamEl.playsInline = true;
                remoteStreamEl.setAttribute('webkit-playsinline', true);
            }

            if(participant.isLocal) {
                remoteStreamEl.setAttribute('webkit-playsinline', true);
                remoteStreamEl.volume = 0;
                remoteStreamEl.muted = true;
                remoteStreamEl.autoplay = true;
                remoteStreamEl.playsInline = true;
                if(track.kind == 'video') localParticipant.videoStream = stream;
                if (track.kind == 'audio') localParticipant.audioStream = stream;
            }

            remoteStreamEl.onload = function () {
                log('createTrackElement: onload', remoteStreamEl)
            }
            remoteStreamEl.oncanplay = function (e) {
                log('createTrackElement: oncanplay ' + track.kind, remoteStreamEl);

                //if(!participant.isLocal) remoteStreamEl.play();

                if(track.kind == 'audio') {
                    log('createTrackElement: dispatch audioTrackLoaded');

                    app.event.dispatch('audioTrackLoaded', {
                        screen: track.parentScreen,
                        trackEl: e.target,
                        track:track
                    });
                }

            }
            remoteStreamEl.addEventListener('play', function (e) {
                let time = performance.timeOrigin + performance.now();
                app.event.dispatch('audioTrackPlay', {
                    time: time,
                    participant: participant,
                    trackEl: e.target,
                    track:track
                });
            })
            remoteStreamEl.onloadedmetadata = function () {
                log('createTrackElement: onloadedmetadata', remoteStreamEl)
            }
            if(track.kind == 'video') {
                log('createTrackElement: add video track events');
                log('createTrackElement: video size', remoteStreamEl.videoWidth, remoteStreamEl.videoHeight);

                remoteStreamEl.addEventListener('loadedmetadata', function (e) {
                    if(track.mediaStreamTrack.readyState == 'ended' || (e.target.videoWidth == 0 && e.target.videoHeight == 0)) return;
                    log('createTrackElement: loadedmetadata: return check');

                    app.event.dispatch('videoTrackLoaded', {
                        screen: track.parentScreen,
                        track: track,
                        trackEl: e.target
                    });
                });
            }

            track.mediaStreamTrack.addEventListener('mute', function(e){
                log('mediaStreamTrack muted', track);
                try {
                    var err = (new Error);
                    console.log(err.stack);
                } catch (e) {

                }

                log('mediaStreamTrack muted 2', track.mediaStreamTrack.enabled, track.mediaStreamTrack.readyState, track.mediaStreamTrack.muted);
                if(participant.RTCPeerConnection){
                    var receivers = participant.RTCPeerConnection.getReceivers();
                    log('mediaStreamTrack receivers', receivers);

                }
                app.event.dispatch('trackMuted', {
                    screen: track.parentScreen,
                    trackEl: e.target,
                    track:track,
                    participant:participant
                });
            });

            track.mediaStreamTrack.addEventListener('unmute', function(e){
                log('mediaStreamTrack unmuted 0', track);
                try {
                    var err = (new Error);
                    console.log(err.stack);
                } catch (e) {

                }
                app.event.dispatch('trackUnmuted', {
                    screen: track.parentScreen,
                    trackEl: e.target,
                    track:track,
                    participant:participant
                });
            });

            track.mediaStreamTrack.addEventListener('ended', function(e){
                log('mediaStreamTrack ended', track);
                app.event.dispatch('trackMuted', {
                    screen: track.parentScreen,
                    trackEl: e.target,
                    track:track,
                    participant:participant
                });
            });

            return remoteStreamEl;*/
        }

        return {
            attachTrack: attachTrack,
            createTrackElement: createTrackElement,
            publishStream: publishStream,
            getMediaElement: function () {
                return _mediaElement;
            },
            getMediaStream: function () {
                return _mediaStream;
            },
        }
    }())

    app.signalingDispatcher = (function () {
        function participantConnected(newParticipant) {
            log('participantConnected')

            var participantExist = roomParticipants.filter(function (p) {
                return p.sid == newParticipant.sid;
            })[0];
            log('participantConnected: ' + newParticipant.sid)
            if(participantExist == null){
                log('participantConnected doesn\'t participantExist')
                roomParticipants.unshift(newParticipant);
            }
            newParticipant.connectedTime = performance.now();
            newParticipant.latestOnlineTime = performance.now();
            newParticipant.online = true;
            app.event.dispatch('participantConnected', newParticipant);
        }

        /**
         * Processes messege received via data channel. Is used for notifying users about: current actions (e.g starting
         * screen sharing), online status (for heartbeat feature); users local info (whether mic/camera is enabled).
         * @method initWithStreams
         * @param {Object} [data] Message in JSON
         * @param {String} [data.type] Message type
         * @param {Object} [data.content] Message data
         * @param {Object} [participant] Participant who sent the message
         */
        function processDataTrackMessage(data, participant) {
            data = JSON.parse(data);
            if(data.type == 'screensharingStarting' || /*data.type == 'screensharingStarted' ||*/ data.type == 'screensharingFailed' || data.type == 'afterCamerasToggle') {
                log('processDataTrackMessage', data.type)
                app.event.dispatch(data.type, {content:data.content != null ? data.content : null, participant: participant});
            } else if(data.type == 'trackIsBeingAdded') {
                log('processDataTrackMessage', data.type)
                var screenSharingTrackHandler = function(e) {
                    log('trackIsBeingAdded screenSharingTrackHandler', e.track, data)
                    if(e.participant != participant) return;
                    e.track.screensharing = true;

                    app.event.dispatch('screensharingStarted', {content:data.content != null ? data.content : null, participant: participant});

                    app.event.off('trackSubscribed', screenSharingTrackHandler);
                }

                var screenSharingFailingHandler = function(e) {
                    log('trackIsBeingAdded screenSharingFailingHandler')
                    if(e.participant != participant) return;
                    app.event.off('trackSubscribed', screenSharingTrackHandler);
                    app.event.off('screensharingFailed', screenSharingFailingHandler);

                }

                if(data.content.screensharing) {
                    app.event.on('trackSubscribed', screenSharingTrackHandler);
                    app.event.on('screensharingFailed', screenSharingFailingHandler);
                }

            } else if(data.type == 'liveStreamingStarted') {
                participant.fbLiveStreamingActive = true;
                app.event.dispatch('liveStreamingStarted', {participant:participant, platform:data});
            } else if(data.type == 'liveStreamingEnded') {
                participant.fbLiveStreamingActive = false;
                app.event.dispatch('liveStreamingEnded', {participant:participant, platform:data});
            } else if(data.type == 'localRecordingStarted') {
                app.event.dispatch('localRecordingStarted', {participant:participant, data:data.content});
            } else if(data.type == 'online') {
                //log('processDataTrackMessage online')

                if(data.content.micIsEnabled != null) participant.remoteMicIsEnabled = data.content.micIsEnabled;
                if(data.content.cameraIsEnabled != null) participant.remoteCameraIsEnabled = data.content.cameraIsEnabled;
                if(participant.online == false)	{
                    participant.online = true;
                    if(performance.now() - participant.latestOnlineTime < 5000) {
                        participant.reconnectionsCounter = participant.reconnectionsCounter + 1;
                    }
                    participantConnected(participant);
                    if(options.mode == 'node' && participant.RTCPeerConnection == null) {
                        participant.RTCPeerConnection = socketParticipantConnected().initPeerConnection(participant);
                    }
                    participant.latestOnlineTime = performance.now();
                } else {
                    participant.latestOnlineTime = performance.now();
                }
            } else if(data.type == 'service') {

            }
        }

        function sendOnlineStatus() {

        }

        function sendDataTrackMessage(type, content, participantToSend) {
            //log("sendDataTrackMessage:", type, content);
            var message = {type:type};
            if(content != null) message.content = content;

            if(participantToSend != null && participantToSend.dataTrack != null && participantToSend.dataTrack.readyState == 'open') {
                participantToSend.dataTrack.send(JSON.stringify(message))
                return;
            }


            var i, participant;
            for (i = 0; participant = roomParticipants[i]; i++){
                if(participant == localParticipant || (participant.dataTrack == null || participant.dataTrack.readyState != 'open')) continue;
                if (participant.dataTrack != null) participant.dataTrack.send(JSON.stringify(message));
            }

        }

        function participantDisconnected(participant) {
            log("participantDisconnected: ", participant);
            log("participantDisconnected: app id", app.id);
            log("participantDisconnected: is online - " + participant.online);
            if(participant.online == false) return;

            //participant.remove();
            participant.online = false;
            if(participant.fbLiveStreamingActive) {
                app.event.dispatch('liveStreamingEnded', participant);
            }

            for (let i = localParticipant.tracks.length - 1; i >= 0; i--) {
                if (localParticipant.tracks[i].participant == participant) {
                    localParticipant.tracks.splice(i, 1);
                }
            }

            app.event.dispatch('participantDisconnected', participant);

        }

        function gotIceCandidate(event, existingParticipant){

            log('gotIceCandidate:  event.candidate',  event.candidate)

            if (event.candidate) {
                if(event.candidate.candidate.indexOf("relay")<0){ // if no relay address is found, assuming it means no TURN server
                    //return;
                }

                log('gotIceCandidate: existingParticipant', existingParticipant)
                log('gotIceCandidate: candidate: ' + event.candidate.candidate)

                sendMessage({
                    type: "candidate",
                    label: event.candidate.sdpMLineIndex,
                    sdpMid: event.candidate.sdpMid,
                    candidate: event.candidate.candidate,
                    id: event.candidate.sdpMid,
                    targetSid: existingParticipant.sid,
                    connection: existingParticipant.connection
                });
            }

            if (event.candidate && event.candidate.candidate.indexOf('srflx') !== -1) {
                var cand = parseCandidate(event.candidate.candidate);
                if (!existingParticipant.candidates[cand.relatedPort]) existingParticipant.candidates[cand.relatedPort] = [];
                existingParticipant.candidates[cand.relatedPort].push(cand.port);
            } else if (!event.candidate) {
                if (Object.keys(existingParticipant.candidates).length === 1) {
                    var ports = existingParticipant.candidates[Object.keys(existingParticipant.candidates)[0]];
                    log('gotIceCandidate: ' + (ports.length === 1 ? 'NAT TYPE: cool nat' : 'NAT TYPE: symmetric nat'));
                }
            }
        }

        function parseCandidate(line) {
            var parts;
            if (line.indexOf('a=candidate:') === 0) {
                parts = line.substring(12).split(' ');
            } else {
                parts = line.substring(10).split(' ');
            }

            var candidate = {
                foundation: parts[0],
                component: parts[1],
                protocol: parts[2].toLowerCase(),
                priority: parseInt(parts[3], 10),
                ip: parts[4],
                port: parseInt(parts[5], 10),
                // skip parts[6] == 'typ'
                type: parts[7]
            };

            for (var i = 8; i < parts.length; i += 2) {
                switch (parts[i]) {
                    case 'raddr':
                        candidate.relatedAddress = parts[i + 1];
                        break;
                    case 'rport':
                        candidate.relatedPort = parseInt(parts[i + 1], 10);
                        break;
                    case 'tcptype':
                        candidate.tcpType = parts[i + 1];
                        break;
                    default: // Unknown extensions are silently ignored.
                        break;
                }
            }
            return candidate;
        };

        function getPCStats() {

            var participants = app.roomParticipants();
            for(let i in participants) {
                let participant = participants[i];
                if(participant.RTCPeerConnection == null) continue;

                participant.RTCPeerConnection.getStats(null).then(stats => {
                    var statsOutput = [];
                    stats.forEach(report => {
                        let reportItem = {};
                        reportItem.reportType = report.type;
                        reportItem.id = report.id;
                        reportItem.timestump = report.timestamp;


                        // Now the statistics for this report; we intentially drop the ones we
                        // sorted to the top above

                        Object.keys(report).forEach(statName => {
                            if (statName !== "id" && statName !== "timestamp" && statName !== "type") {
                                reportItem[statName]= report[statName];
                            }
                        });
                        statsOutput.push(reportItem);

                    });
                    console.log(statsOutput);
                })

            }
        }

        function rawTrackSubscribed(event, existingParticipant){
            log('rawTrackSubscribed ' + event.track.kind, event.track, existingParticipant);

            var track = event.track;
            var trackToAttach = new Track();
            trackToAttach.sid = track.id;
            trackToAttach.kind = track.kind;
            trackToAttach.mediaStreamTrack = track;
            trackToAttach.participant = existingParticipant;
            if(event.streams.length != 0) trackToAttach.stream = event.streams[0];
            //replaceOrAddTrack(trackToAttach, existingParticipant);
            app.event.dispatch('trackSubscribed', {track:trackToAttach, participant:existingParticipant});

            app.mediaControls.attachTrack(trackToAttach, existingParticipant);
        }

        function rawStreamSubscribed(event, existingParticipant){
            log('rawStreamSubscribed', event, existingParticipant);

            var stream = event.stream;
            var tracks = stream.getTracks();
            log('rawStreamSubscribed: tracks num: ' + tracks);

            for (var t in tracks){
                var track = tracks[t];
                var trackToAttach = new Track();
                trackToAttach.sid = track.sid;
                trackToAttach.kind = track.kind;
                trackToAttach.mediaStreamTrack = track;
                trackToAttach.stream = stream;

                app.mediaControls.attachTrack(trackToAttach, existingParticipant);
            }

        }


        function replaceOrAddTrack(track, skipParticipant) {
            log('replaceOrAddTrack');
            for (var p in roomParticipants) {
                if(roomParticipants[p] == skipParticipant || roomParticipants[p].broadcastRole == 'donor') continue;
                if (!roomParticipants[p].isLocal && roomParticipants[p].RTCPeerConnection != null && roomParticipants[p].RTCPeerConnection.connectionState != 'closed') {
                    log('replaceOrAddTrack: roomParticipants[p]', roomParticipants[p]);

                    if('ontrack' in roomParticipants[p].RTCPeerConnection){
                        let sender = roomParticipants[p].RTCPeerConnection.getSenders().filter(function (s) {
                            return s.track && s.track.kind == track.mediaStreamTrack.kind;
                        })[0];

                        log('replaceOrAddTrack: sender exist - ', sender != null);
                        if(sender != null) {
                            var oldTrackid = sender.track.id;
                            //sender.track.stop();

                            sender.replaceTrack(track.mediaStreamTrack)
                                .then(function () {
                                    log('replaceOrAddTrack: track replaced');
                                    for (let i = localParticipant.tracks.length - 1; i >= 0; i--) {
                                        if (localParticipant.tracks[i].mediaStreamTrack.id == oldTrackid) {
                                            log('replaceOrAddTrack: deleted track removed');

                                            localParticipant.tracks.splice(i, 1);
                                        }
                                    }
                                    //if(callback != null) callback();
                                })
                                .catch(function (e) {
                                    console.error(e.name + ': ' + e.message);
                                });

                        } else {
                            log('replaceOrAddTrack: addTrack: id = ', (track.mediaStreamTrack.id));
                            let videoSenderExist = roomParticipants[p].RTCPeerConnection.getSenders().filter(function (sender) {
                                return sender.track != null && sender.track.id == track.mediaStreamTrack.id;
                            })[0];
                            log('replaceOrAddTrack videoSenderExist ', videoSenderExist != null);
                            if(!videoSenderExist) roomParticipants[p].RTCPeerConnection.addTrack(track.mediaStreamTrack, track.stream);
                        }

                    }
                }
            }

            //app.event.dispatch('cameraEnabled');
            //app.signalingDispatcher.sendDataTrackMessage('online', {cameraIsEnabled: true});

        }

        function stopSendingTracks() {
            log('stopSendingTracks')
            for (var p in roomParticipants) {
                if(roomParticipants[p].broadcastRole == 'donor') continue;
                if (!roomParticipants[p].isLocal && roomParticipants[p].RTCPeerConnection != null && roomParticipants[p].RTCPeerConnection.connectionState != 'closed') {
                    if('ontrack' in roomParticipants[p].RTCPeerConnection){
                        let senders = roomParticipants[p].RTCPeerConnection.getSenders();

                        if(senders.length != 0) {
                            for(let s in senders)
                            roomParticipants[p].RTCPeerConnection.removeTrack(senders[s]);

                        }
                    }
                }
            }

            for(let t = localParticipant.tracks.length - 1; t >= 0; t--){
                localParticipant.tracks.splice(t, 1);
            }
        }

        function addTracksToPeerConnections() {
            log('addTracksToPeerConnections');
            var tracks = localParticipant.tracks;

            for (var t in tracks) {
                replaceOrAddTrack(tracks[t], tracks[t].participant);
            }
        }

        function getCurrentDistanceToRoot() {
            var mediaStream = app.mediaControls.getMediaStream();
            var vTrack = mediaStream.getVideoTracks()[0];

            if(!vTrack) return false;

            for(let p in roomParticipants) {
                for(let t in roomParticipants[p].tracks) {
                    if(vTrack == roomParticipants[p].tracks[t].mediaStreamTrack) {
                        return roomParticipants[p].distanceToRoot;
                    }
                }
            }
            return false;
        }

        function socketEventBinding() {
            console.log('socketEventBinding', socket)
            socket.on('Media/broadcast/participantConnected', function (participant){
                log('socket: participantConnected', participant);
                socketParticipantConnected().initPeerConnection(participant);
            });
            socket.on('Media/broadcast/canIConnect', function (participant){
                log('Media/broadcast/canIConnect', participant);

                socket.emit('permissionReqResult', {
                    fromSid:socket.id,
                    answer:true
                })
            });

            socket.on('Media/broadcast/roomParticipants', function (socketParticipants) {
                log('roomParticipants', socketParticipants);

                app.event.dispatch('roomParticipants', socketParticipants);
                var negotiationEnded = 0;
                function onNegotiatingEnd() {
                    log('socketEventBinding initNegotiationEnded');
                    app.initNegotiationState = 'ended';
                    app.event.dispatch('initNegotiationEnded', roomParticipants);
                    app.event.off('signalingStageChange', onSignalingStageChange);
                }

                function onSignalingStageChange(e) {
                    log('signalingStageChange', e);
                    var existingParticipant = roomParticipants.filter(function (roomParticipant) {
                        return roomParticipant.sid == e.participant.sid;
                    })[0];

                    if(existingParticipant != null && existingParticipant.signalingState.stage == 'answerSent') {
                        negotiationEnded++;
                    }

                    if(negotiationEnded == socketParticipants.length) {
                        onNegotiatingEnd();
                    }

                }

                if(socketParticipants.length != 0) {
                    app.event.on('signalingStageChange', onSignalingStageChange);
                } else {
                    onNegotiatingEnd();
                }
            });

            socket.on('Media/broadcast/participantDisconnected', function (sid){
                var existingParticipant = roomParticipants.filter(function (roomParticipant) {
                    return roomParticipant.sid == sid;
                })[0];

                log('participantDisconnected', existingParticipant);

                if(existingParticipant != null) {
                    if(existingParticipant.RTCPeerConnection != null) existingParticipant.RTCPeerConnection.close();
                    participantDisconnected(existingParticipant);
                }
            });


            socket.on('Media/broadcast/signalling', function (message){
                log('signalling message: ' + message.type)
                if (message.type === 'offer') {

                    offerReceived().processOffer(message);
                }
                else if (message.type === 'answer') {
                    answerReceived(message);
                }
                else if (message.type === 'candidate') {
                    iceConfigurationReceived(message);
                }
            });

            socket.on('Media/broadcast/joinedCallback', function (message){
                log('joinedCallback message: ' + message.color)
                localParticipant.color = message.color;
                app.event.dispatch('joinedCallback');

            });

            socket.on('Media/broadcast/confirmOnlineStatus', function (message){

                if(message.type == 'request') {
                    log('confirmOnlineStatus REQUEST')

                    socket.emit('Media/broadcast/confirmOnlineStatus', {
                        'type': 'answer',
                        'targetSid': message.fromSid
                    });
                } else if (message.type == 'answer') {
                    log('GOT confirmOnlineStatus ANSWER')

                    var existingParticipant = roomParticipants.filter(function (roomParticipant) {
                        return roomParticipant.sid == message.fromSid;
                    })[0];

                    existingParticipant.latestOnlineTime = performance.now();
                }
            });

            socket.on('Media/broadcast/canISendOffer', function (message){

                if(message.type == 'request') {
                    log('got canISendOffer REQUEST');

                    var participant = roomParticipants.filter(function (roomParticipant) {
                        return roomParticipant.sid == message.fromSid;
                    })[0];

                    /*if (participant.isNegotiating === false) {
                        log('got canISendOffer REQUEST: send reverse offer');

                        participant.shouldSendReverseOffer = true;
                        participant.negotiate();
                        participant.shouldSendReverseOffer = false;
                    } else if (participant.isNegotiating === true) {
                        log('got canISendOffer REQUEST: add offer to queue');

                        participant.shouldSendReverseOffer = true;
                    }*/

                    if (participant.isNegotiating === false) {
                        log('got canISendOffer REQUEST: yes, waiting for offer');

                        socket.emit('Media/broadcast/canISendOffer', {
                            'type': 'answer',
                            'targetSid': message.fromSid,
                            'answerValue': true
                        });
                        participant.waitingForOffer = true;
                    } else if (participant.isNegotiating === true) {
                        log('got canISendOffer REQUEST: add offer to queue');
                        socket.emit('Media/broadcast/canISendOffer', {
                            'type': 'answer',
                            'targetSid': message.fromSid,
                            'answerValue': false
                        });
                        participant.shouldSendReverseOffer = true;
                    }

                } else if (message.type == 'answer') {
                    log('got canISendOffer ANSWER',message);

                    app.event.dispatch('canISendOffer', message);
                }
            });

        }


        var broadcastData;
        function processMediaSource(message) {
            var data = Uint8Array.from(message)
            var arrayBuffer = data.buffer.slice(data.byteOffset, data.byteLength + data.byteOffset);
            //var arrayBuffer = message.buffer;
            // console.log('processMediaSource');

            var mimeCodec = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2';
            if (!MediaSource.isTypeSupported(mimeCodec)) {
                console.error("Unsupported media format");
            }

            if(broadcastData != null) {
                //console.log('processMediaSource 1');

                if(broadcastData.mediaSource.sourceBuffers.length != 0){
                    console.log('processMediaSource existing');
                    //broadcastData.sourceBuffer.abort();
                    if(!broadcastData.sourceBuffer.updating) broadcastData.sourceBuffer.appendBuffer(arrayBuffer)

                } else if(broadcastData.mediaSource.readyState == 'open') {
                    console.log('processMediaSource new');

                    var sourceBuffer = broadcastData.sourceBuffer = broadcastData.mediaSource.addSourceBuffer(mimeCodec);
                    console.log('processMediaSource: re sourceBuffers', broadcastData.mediaSource.sourceBuffers.length);
                    sourceBuffer.addEventListener('error', function(e) {
                        console.log('processMediaSource re error: ' + broadcastData.mediaSource.readyState);
                        console.error(e);
                    });
                    sourceBuffer.addEventListener('processMediaSource re abort', function(e) { console.log('abort: ' + broadcastData.mediaSource.readyState); });

                    sourceBuffer.addEventListener('updateend', function () {
                        console.log('processMediaSource:re updateend');
                        //mediaSource.endOfStream();
                    });
                    sourceBuffer.addEventListener('update', function () {
                        //video.play();
                    });
                    sourceBuffer.appendBuffer(arrayBuffer);
                    //sourceBuffer.appendBuffer(arrayBuffer);
                    console.log('processMediaSource:re sourceBuffers2', broadcastData.mediaSource.sourceBuffers.length);
                } else {
                    /*console.log('processMediaSource 1', broadcastData.mediaSource.readyState);
                    broadcastData.mediaSource = new MediaSource();
                    broadcastData.mediaEl.src = URL.createObjectURL(broadcastData.mediaSource);
                    broadcastData.mediaSource.addEventListener('sourceopen', sourceOpen);*/

                }
            } else {
                var mediaSource = new MediaSource();

                var video = document.createElement('video');
                video.src = URL.createObjectURL(mediaSource);
                video.style.position = 'absolute';
                video.style.width = '300px';
                video.style.height = '200px';
                video.style.top = '0';
                video.style.left = '0';
                video.autoplay = true;
                video.onerror = function(e){
                    console.error(e)
                    console.log('ERROR', e)
                }
                document.body.appendChild(video);
                mediaSource.addEventListener('sourceopen', sourceOpen);

                broadcastData = {
                    mediaEl: video,
                    mediaSource: mediaSource,
                };

                function sourceOpen () {
                    console.log('processMediaSource: sourceOpen');
                    var mediaSource = this;
                    var sourceBuffer = broadcastData.sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
                    console.log('processMediaSource: sourceBuffers', mediaSource.sourceBuffers.length);
                    sourceBuffer.addEventListener('error', function(e) {
                        console.log('processMediaSource error: ' + mediaSource.readyState);
                        console.error(e);
                    });
                    sourceBuffer.addEventListener('processMediaSource abort', function(e) { console.log('abort: ' + mediaSource.readyState); });

                    sourceBuffer.addEventListener('updateend', function () {
                        console.log('processMediaSource: updateend');
                        //mediaSource.endOfStream();
                        //video.play();
                    });
                    sourceBuffer.addEventListener('update', function () {
                        //video.play();
                    });
                    sourceBuffer.appendBuffer(arrayBuffer);
                    console.log('processMediaSource: sourceBuffers2', mediaSource.sourceBuffers.length);

                };

                window.mediaSource1 = mediaSource;

            }


            return;
            //if(participant.mediaSources)
            //var mediaSource = new MediaSource(); // mediaSource.readyState === 'closed'
        }

        function socketParticipantConnected() {

            function createPeerConnection(participant, resetConnection) {
                log('createPeerConnection', participant, resetConnection)
                var config = pc_config;
                if(!participant.localInfo.usesUnifiedPlan) config.sdpSemantics = "plan-b";
                log('createPeerConnection: usesUnifiedPlan = '+ participant.localInfo.usesUnifiedPlan);

                var newPeerConnection = new RTCPeerConnection(config);

                function createOffer(hasPriority, resetConnection){
                    log('createOffer', resetConnection, participant.identity, participant.sid)

                    participant.isNegotiating = true;
                    participant.currentOfferId = hasPriority;

                    if(!resetConnection) {
                        participant.signalingState.setStage('offerCreating');
                    } else {
                        participant.signalingState.setStage('initialOfferCreating');
                        publishMedia();
                    }

                    newPeerConnection.createOffer({ 'OfferToReceiveAudio': false, 'OfferToReceiveVideo': false })
                        .then(function(offer) {
                            log('createOffer: offer created', hasPriority, participant.hasNewOffersInQueue, participant.currentOfferId, participant.RTCPeerConnection.signalingState, offer)

                            if(participant.signalingState.stage == 'offerReceived' && participant.signalingRole == 'impolite')  {
                                log('createOffer: offer created: cancel local offer due incoming offer');
                                return;
                            }

                            if(!resetConnection) {
                                participant.signalingState.setStage('offerCreated');
                            } else {
                                participant.signalingState.setStage('initialOfferCreated');
                            }

                            //In the case when renegotiationneeded was triggered right after initial offer was created
                            //this cancels initial offer before signalingState will be changed to have-local-offer
                            /*if(participant.hasNewOffersInQueue !== false && hasPriority == null) {
								console.log('createOffer: offer created: offer was canceled by new one');
								return;
							}*/

                            //In case, when multiple renegotiationneeded events was triggered one after another,
                            //this will cancel all offers but last. It's highly unlikely that this scenario will ever happen.
                            if(participant.hasNewOffersInQueue !== false && hasPriority != null && participant.hasNewOffersInQueue > hasPriority && !resetConnection) {
                                log('createOffer: offer created: RENEGOTIATING WAS CANCELED as priority: ' + hasPriority + '/' + participant.hasNewOffersInQueue);
                                return;
                            }

                            var localDescription;
                            if(typeof cordova != 'undefined' && _isiOS) {
                                localDescription = new RTCSessionDescription(offer);
                            } else {
                                localDescription = offer;
                            }

                            /*if(_isiOS){
								localDescription.sdp = removeInactiveTracksFromSDP(localDescription.sdp);
								log('createOffer: removeInactiveTracksFromSDP', localDescription.sdp)
							}*/
                            log('createOffer: sdp', localDescription.sdp)


                            return newPeerConnection.setLocalDescription(localDescription).then(function () {
                                log('createOffer: offer created: sending', participant.hasNewOffersInQueue, participant.currentOfferId, participant.RTCPeerConnection.signalingState);
                                if(!resetConnection) {
                                    participant.signalingState.setStage('offerSent');
                                } else {
                                    participant.signalingState.setStage('initialOfferSent');
                                }
                                sendMessage({
                                    name: localParticipant.identity,
                                    targetSid: participant.sid,
                                    broadcastRole: participant.broadcastRole == 'receiver' ? 'donor' : 'receiver',
                                    type: "offer",
                                    resetConnection: resetConnection == true ? true : false,
                                    sdp: newPeerConnection.localDescription.sdp,
                                    connection: participant.connection != null ? participant.connection : null
                                });
                            });
                        })
                        .catch(function(error) {
                            console.error(error.name + ': ' + error.message);
                        });
                }

                function incrementOffersQueue() {
                    if(participant.currentOfferId !== false && participant.hasNewOffersInQueue == false){
                        participant.hasNewOffersInQueue = participant.currentOfferId + 1;
                    } else {
                        participant.hasNewOffersInQueue = participant.hasNewOffersInQueue !== false ? participant.hasNewOffersInQueue + 1 : 0;
                    }
                }
                participant.incrementOffersQueue = incrementOffersQueue;

                function negotiate() {
                    log('negotiate START', participant.signalingState.stage, newPeerConnection.signalingState, participant.isNegotiating, participant.hasNewOffersInQueue,  participant.currentOfferId, participant.shouldSendReverseOffer);

                    if((participant.signalingRole == 'impolite' && participant.waitingForOffer) || (participant.signalingRole == 'polite' && participant.waitingForReverseOffer)) {
                        log('negotiate CANCELING NEGOTIATION: waitingForOffer');
                        return;
                    }

                    var startNegotiating = function () {
                        log('negotiate CHEK', participant.isNegotiating && participant.signalingState.stage != 'offerCreating' && participant.signalingState.stage != 'initialOfferCreating');
                        log('negotiate CHEK2', participant.isNegotiating, participant.signalingState.stage != 'offerCreating', participant.signalingState.stage != 'initialOfferCreating');

                        if(participant.isNegotiating && (participant.signalingState.stage != 'offerCreating' || participant.signalingState.stage == 'initialOfferCreating')) {
                            log('negotiate CANCELING NEGOTIATION');

                            incrementOffersQueue();
                            return;
                        }

                        incrementOffersQueue();


                        log('negotiate CONTINUE', participant.hasNewOffersInQueue)
                        //if(newPeerConnection.connectionState == 'new' && newPeerConnection.iceConnectionState == 'new' && newPeerConnection.iceGatheringState == 'new') return;

                        createOffer(participant.hasNewOffersInQueue);
                        if(participant.shouldSendReverseOffer) participant.shouldSendReverseOffer = false;
                    }

                    //startNegotiating();

                    if(participant.signalingRole == 'impolite' && !participant.isNegotiating && participant.sid != 'recording') {

                        if((_localInfo.browserName == 'Chrome' && _localInfo.browserVersion >= 80) || _localInfo.browserName == 'Firefox') {
                            log('negotiate: browser supports rollback');
                            startNegotiating();
                        } else {
                            log('negotiate: ask permission for offer');
                            canISendOffer(participant).then(function (order) {
                                if (order === true) {
                                    startNegotiating();
                                } else {
                                    participant.hasNewOffersInQueue = false;
                                    participant.waitingForReverseOffer = true;
                                }

                            });
                        }
                        return;
                    } else {
                        startNegotiating();
                    }

                }
                participant.negotiate = negotiate;

                function publishMedia() {
                    log('createPeerConnection: publishMedia')

                    var localTracks = localParticipant.tracks;

                    //we can eliminate checking whether .cameraIsEnabled() as all video tracks are stopped when user switches camera or screensharing off.
                    if('ontrack' in newPeerConnection){
                        for (var t in localTracks) {
                            log('createPeerConnection: add track ' + localTracks[t].kind)
                            if (localTracks[t].kind == 'video' && localTracks[t].participant != participant && localTracks[t].mediaStreamTrack.readyState != 'ended') {
                                newPeerConnection.addTrack(localTracks[t].mediaStreamTrack, localTracks[t].stream);
                            }
                        }

                    } else {
                        log('createPeerConnection: add videoStream - ' + (localParticipant.videoStream != null))
                        if(localParticipant.videoStream != null) newPeerConnection.addStream(localParticipant.videoStream);
                    }

                    //we must check whether .micIsEnabled() we don't .do mediaStreamTrack.stop() for iOS as stop() cancels access to mic, and both stop() and enabled = false affect audio visualization.
                    //So we need to check if micIsEnabled() to avoid cases when we add audio tracks while user's mic is turned off.

                    if('ontrack' in newPeerConnection){
                        for (var t in localTracks) {
                            log('createPeerConnection: add track ' + localTracks[t].kind)

                            if(localTracks[t].kind == 'audio' && localTracks[t].participant != participant && localTracks[t].mediaStreamTrack.readyState != 'ended') newPeerConnection.addTrack(localTracks[t].mediaStreamTrack, localTracks[t].stream);
                        }

                    } else {
                        log('createPeerConnection: add videoStream - ' + (localParticipant.videoStream != null))

                        if(localParticipant.audioStream != null) newPeerConnection.addStream(localParticipant.audioStream);
                    }

                }

                newPeerConnection.addEventListener("icecandidateerror", (event) => {
                    log('socketParticipantConnected: icecandidateerror');
                    console.error(event);
                });


                newPeerConnection.onsignalingstatechange = function (e) {
                    log('socketParticipantConnected: onsignalingstatechange = ' + newPeerConnection.signalingState, participant.signalingState.state, participant.hasNewOffersInQueue, participant.currentOfferId)


                    if(newPeerConnection.signalingState == 'stable') {

                        if(participant.signalingState.state == 'have-remote-offer' || participant.signalingState.state == 'have-local-offer') {
                            /*
							(participant.hasNewOffersInQueue !== false && participant.currentOfferId === false)
								if I have incoming offer when onnegotiationneeded event triggered
							(participant.hasNewOffersInQueue !== false && participant.currentOfferId !== false && participant.hasNewOffersInQueue > participant.currentOfferId)
								if I created offer but negotiating still was in progress when onnegotiationneeded event triggered
							*/
                            if((participant.hasNewOffersInQueue !== false && participant.currentOfferId !== false && participant.hasNewOffersInQueue > participant.currentOfferId)
                                || (participant.hasNewOffersInQueue !== false && participant.currentOfferId === false)
                            /*|| participant.shouldSendReverseOffer*/) {
                                log('socketParticipantConnected: STARTING NEW NEGOTIATION AGAIN ', participant.hasNewOffersInQueue, participant.currentOfferId)

                                participant.isNegotiating = false;
                                participant.currentOfferId = false;
                                participant.signalingState.setStage(null);

                                participant.negotiate();
                            } else {
                                participant.hasNewOffersInQueue = false;
                                participant.isNegotiating = false;
                                participant.currentOfferId = false;
                                participant.signalingState.setStage(null);
                            }
                        }

                        log('addCandidatesFromQueue: canTrickleIceCandidates = ' + newPeerConnection.canTrickleIceCandidates)

                        for(let i = participant.iceCandidatesQueue.length - 1; i >= 0 ; i--){
                            let cand = participant.iceCandidatesQueue[i].candidate
                            log('socketParticipantConnected: onsignalingstatechange: add candidates from queue ' + i)
                            if(participant.iceCandidatesQueue[i] != null) {
                                log('socketParticipantConnected: onsignalingstatechange: add candidate' + participant.iceCandidatesQueue[i].candidate.candidate)

                                newPeerConnection.addIceCandidate(participant.iceCandidatesQueue[i].candidate).catch(function(error) {
                                    console.error(error.name + ': ' + error.message, cand.candidate);
                                });
                                participant.iceCandidatesQueue[i] = null;

                                participant.iceCandidatesQueue.splice(i, 1);
                            }
                        }
                    }
                    console.log('onsignalingstatechange1', newPeerConnection.signalingState);
                    participant.signalingState.state = newPeerConnection.signalingState;
                };

                newPeerConnection.oniceconnectionstatechange = function (e) {
                    log('socketParticipantConnected: oniceconnectionstatechange = ' + newPeerConnection.iceConnectionState)

                    if(newPeerConnection.iceConnectionState == 'connected' || newPeerConnection.iceConnectionState == 'completed') {
                        //participant.isNegotiating = false;
                    }


                };
                newPeerConnection.onconnectionstatechange = function (e) {
                    log('socketParticipantConnected: onconnectionstatechange = ' + newPeerConnection.connectionState)
                    if(newPeerConnection.iceConnectionState == 'closed') {
                        participantDisconnected(participant);
                    } else if(newPeerConnection.connectionState == 'disconnected' || newPeerConnection.connectionState == 'failed') {
                        participant.online = false;
                    }
                };

                newPeerConnection.onicecandidate = function (e) {
                    gotIceCandidate(e, participant);
                };

                newPeerConnection.ondatachannel = function (evt) {
                    log('socketParticipantConnected: ondatachannel', participant);
                    participant.dataTrack = evt.channel;
                    setChannelEvents(evt.channel, participant);
                };

                if('ontrack' in newPeerConnection) {
                    newPeerConnection.ontrack = function (e) {
                        rawTrackSubscribed(e, participant);
                    };
                } else {
                    newPeerConnection.onaddstream = function (e) {
                        rawStreamSubscribed(e, participant);
                    };
                }

                newPeerConnection.onnegotiationneeded = function (e) {
                    log('socketParticipantConnected: onnegotiationneeded, negotiating = ' + participant.isNegotiating);
                    log('socketParticipantConnected: onnegotiationneeded, sdp ' + (newPeerConnection.localDescription ? newPeerConnection.localDescription.sdp : 'n/a'));

                    negotiate();
                };

                function createDataChannel() {
                    if(participant.dataTrack != null) participant.dataTrack.close();
                    var dataChannel = newPeerConnection.createDataChannel('mainDataChannel' + Date.now(), {reliable: false})
                    setChannelEvents(dataChannel, participant);
                    participant.dataTrack = dataChannel;
                    var sendInitialData = function(){
                        var screensharingTracks = localParticipant.tracks.filter(function(t){
                            return t.screensharing == true && t.mediaStreamTrack.enabled == true && t.mediaStreamTrack.readyState == 'live' ? true : false
                        })

                        if(screensharingTracks.length != 0) {
                            app.signalingDispatcher.sendDataTrackMessage("screensharingStarted", {trackId:screensharingTracks[0].mediaStreamTrack.id});
                        }

                        dataChannel.removeEventListener('open', sendInitialData);
                    }
                    dataChannel.addEventListener('open', sendInitialData);

                    if(participant.dataTracks == null) {
                        participant.dataTracks = [];
                    }
                    participant.dataTracks.push(dataChannel);
                }
                createDataChannel();

                participant.createDataChannel = createDataChannel;

                createOffer(9999, true);

                return newPeerConnection;
            }

            function init(participantData) {
                var senderParticipant = roomParticipants.filter(function (existingParticipant) {
                    return existingParticipant.sid == participantData.fromSid && existingParticipant.RTCPeerConnection;
                })[0];
                log('socketParticipantConnected participantData', participantData);
                if(senderParticipant) {
                    log('socketParticipantConnected senderParticipant', senderParticipant, senderParticipant.online);
                }

                if((senderParticipant == null && senderParticipant != localParticipant) || (senderParticipant != null && senderParticipant.online == false)) {
                    log('socketParticipantConnected: newParticipant', senderParticipant == null, senderParticipant);
                    if (!senderParticipant) {
                        var newParticipant = senderParticipant = new Participant();
                        newParticipant.iosrtc = true;
                        newParticipant.broadcastRole = participantData.broadcastRole;
                        newParticipant.sid = participantData.sid || participantData.fromSid;
                        newParticipant.localInfo = participantData.info;
                        participantConnected(newParticipant);

                        var localRollbackSupport = (_localInfo.browserName == 'Chrome' && _localInfo.browserVersion >= 80) || _localInfo.browserName == 'Firefox';
                        var remoteRollbackSupport = (participantData.info.browserName == 'Chrome' && participantData.info.browserVersion >= 80) || participantData.info.browserName == 'Firefox';

                        if ((localRollbackSupport && remoteRollbackSupport) || (!localRollbackSupport && remoteRollbackSupport) || (!localRollbackSupport && !remoteRollbackSupport)) {
                            newParticipant.signalingRole = 'polite';
                            //newParticipant.signalingRole = 'impolite';
                            log('socketParticipantConnected: signalingRole: polite');

                        } else {
                            newParticipant.signalingRole = 'impolite';
                            //newParticipant.signalingRole = 'polite';
                            log('socketParticipantConnected: signalingRole: impolite');

                        }
                    }
                    senderParticipant.RTCPeerConnection = createPeerConnection(senderParticipant, true);
                }
            }

            function initFromThatSide(participant) {
                log('initFromThatSide');

                socket.emit('Media/broadcast/sendInitialOffer', {
                    targetSid: participant.sid,
                    type: "request",
                });
            }

            return {
                initPeerConnection: init
            }
        }

        function setChannelEvents(dataChannel, participant) {
            log('setChannelEvents', dataChannel.id);
            dataChannel.onerror = function (err) {
                console.error(err);
            };
            dataChannel.onclose = function () {
                log('dataChannel closed', dataChannel.id, participant.online, participant);
            };
            dataChannel.onmessage = function (e) {
                processDataTrackMessage(e.data, participant);
            };
            dataChannel.onopen = function (e) {
                log('dataChannel opened', participant.online, participant);

            };
        }

        function offerReceived() {

            function createPeerConnection(senderParticipant) {
                var config = pc_config;
                if(!senderParticipant.localInfo.usesUnifiedPlan) config.sdpSemantics = "plan-b";
                log('config.sdpSemantics', config.sdpSemantics)

                var newPeerConnection = new RTCPeerConnection(config);

                function createOffer(hasPriority){
                    //if (newPeerConnection._negotiating == true) return;
                    log('createOffer', senderParticipant.identity, senderParticipant.sid)
                    senderParticipant.isNegotiating = true;
                    senderParticipant.currentOfferId = hasPriority;
                    senderParticipant.signalingState.setStage('offerCreating');

                    newPeerConnection.createOffer({ 'OfferToReceiveAudio': false, 'OfferToReceiveVideo': false })
                        .then(function(offer) {
                            log('createOffer: offer created', senderParticipant.hasNewOffersInQueue, senderParticipant.currentOfferId, senderParticipant.RTCPeerConnection.signalingState, offer)
                            senderParticipant.signalingState.setStage('offerCreated');

                            //In case, when multiple renegotiationneeded events was triggered one after another,
                            //this will cancel all offers but last. It's highly unlikely that this scenario will ever happen.
                            if(senderParticipant.hasNewOffersInQueue !== false && hasPriority != null && senderParticipant.hasNewOffersInQueue > hasPriority) {
                                log('createOffer: offer created: RENEGOTIATING WAS CANCELED as priority: ' + hasPriority + '/' + senderParticipant.hasNewOffersInQueue);
                                return;
                            }

                            var localDescription;
                            if(typeof cordova != 'undefined' && _isiOS) {
                                localDescription = new RTCSessionDescription(offer);
                            } else {
                                localDescription = offer;
                            }

                            /*if(_isiOS){
								localDescription.sdp = removeInactiveTracksFromSDP(localDescription.sdp);
								log('createOffer: removeInactiveTracksFromSDP', localDescription.sdp)
							}*/
                            log('createOffer: sdp', localDescription.sdp)


                            return newPeerConnection.setLocalDescription(localDescription).then(function () {
                                log('createOffer: offer created: sending', senderParticipant.hasNewOffersInQueue, senderParticipant.currentOfferId, senderParticipant.RTCPeerConnection.signalingState);
                                senderParticipant.signalingState.setStage('offerSent');

                                sendMessage({
                                    name: localParticipant.identity,
                                    targetSid: senderParticipant.sid,
                                    type: "offer",
                                    sdp: senderParticipant.RTCPeerConnection.localDescription.sdp,
                                    connection: senderParticipant.connection != null ? senderParticipant.connection : null
                                });
                            });
                        })
                        .catch(function(error) {
                            console.error(error.name + ': ' + error.message);
                        });
                }

                function incrementOffersQueue() {
                    if(senderParticipant.currentOfferId !== false && senderParticipant.hasNewOffersInQueue == false){
                        senderParticipant.hasNewOffersInQueue = senderParticipant.currentOfferId + 1;
                    } else {
                        senderParticipant.hasNewOffersInQueue = senderParticipant.hasNewOffersInQueue !== false ? senderParticipant.hasNewOffersInQueue + 1 : 0;
                    }
                }
                senderParticipant.incrementOffersQueue = incrementOffersQueue;

                function negotiate() {
                    log('negotiate START', senderParticipant.signalingRole , newPeerConnection.signalingState, senderParticipant.isNegotiating, senderParticipant.hasNewOffersInQueue,  senderParticipant.currentOfferId, senderParticipant.shouldSendReverseOffer);

                    //anti glare experiment
                    if((senderParticipant.signalingRole == 'impolite' && senderParticipant.waitingForOffer) || (senderParticipant.signalingRole == 'polite' && senderParticipant.waitingForReverseOffer)) {
                        log('negotiate CANCELING NEGOTIATION: waitingForOffer');
                        return;
                    }

                    var startNegotiating = function () {
                        if(senderParticipant.isNegotiating && senderParticipant.signalingState.stage != 'offerCreating') {
                            log('negotiate CANCELING NEGOTIATION');

                            incrementOffersQueue();
                            return;
                        }

                        incrementOffersQueue();


                        log('negotiate CONTINUE', senderParticipant.hasNewOffersInQueue)
                        //if(newPeerConnection.connectionState == 'new' && newPeerConnection.iceConnectionState == 'new' && newPeerConnection.iceGatheringState == 'new') return;

                        createOffer(senderParticipant.hasNewOffersInQueue);
                        if(senderParticipant.shouldSendReverseOffer) senderParticipant.shouldSendReverseOffer = false;
                    }

                    //startNegotiating();

                    if(senderParticipant.signalingRole == 'impolite' && !senderParticipant.isNegotiating && senderParticipant.sid != 'recording') {

                        if((_localInfo.browserName == 'Chrome' && _localInfo.browserVersion >= 80) || _localInfo.browserName == 'Firefox') {
                            log('negotiate: browser supports rollback');
                            startNegotiating();
                        } else {
                            log('negotiate: ask permission for offer');
                            canISendOffer(senderParticipant).then(function (order) {
                                if (order === true) {
                                    startNegotiating();
                                } else {
                                    senderParticipant.hasNewOffersInQueue = false;
                                    senderParticipant.waitingForReverseOffer = true;
                                }

                            });
                        }
                        return;
                    } else {
                        startNegotiating();
                    }
                }

                if('ontrack' in newPeerConnection) {
                    newPeerConnection.ontrack = function (e) {
                        rawTrackSubscribed(e, senderParticipant);
                    };
                } else {
                    newPeerConnection.onaddstream = function (e) {
                        rawStreamSubscribed(e, senderParticipant);
                    };
                }

                newPeerConnection.ondatachannel = function (evt) {
                    log('offerReceived: ondatachannel', senderParticipant);
                    senderParticipant.dataTrack = evt.channel;
                    setChannelEvents(evt.channel, senderParticipant);
                };

                newPeerConnection.onsignalingstatechange = function (e) {
                    log('offerReceived: onsignalingstatechange: ' + newPeerConnection.signalingState, e);

                    if(newPeerConnection.signalingState == 'stable') {
                        if(senderParticipant.signalingState.state == 'have-remote-offer' || senderParticipant.signalingState.state == 'have-local-offer') {
                            if((senderParticipant.hasNewOffersInQueue !== false && senderParticipant.currentOfferId !== false && senderParticipant.hasNewOffersInQueue > senderParticipant.currentOfferId)
                                || (senderParticipant.hasNewOffersInQueue !== false && senderParticipant.currentOfferId === false)
                            /*|| senderParticipant.shouldSendReverseOffer*/) {
                                log('offerReceived: answer sent: STARTING NEW NEGOTIATION AGAIN ', senderParticipant.hasNewOffersInQueue, senderParticipant.currentOfferId)

                                senderParticipant.isNegotiating = false;
                                senderParticipant.currentOfferId = false;
                                senderParticipant.signalingState.setStage(null);
                                senderParticipant.negotiate();
                            } else {
                                senderParticipant.hasNewOffersInQueue = false;
                                senderParticipant.isNegotiating = false;
                                senderParticipant.currentOfferId = false;
                                senderParticipant.signalingState.setStage(null);
                            }
                        }

                        for(var i = senderParticipant.iceCandidatesQueue.length - 1; i >= 0 ; i--){
                            if(senderParticipant.iceCandidatesQueue[i] != null) {
                                newPeerConnection.addIceCandidate(senderParticipant.iceCandidatesQueue[i].candidate);
                                senderParticipant.iceCandidatesQueue[i] = null;


                                senderParticipant.iceCandidatesQueue.splice(i, 1);
                            }
                        }
                    }

                    console.log('onsignalingstatechange2', newPeerConnection.signalingState);
                    senderParticipant.signalingState.state = newPeerConnection.signalingState;

                };

                newPeerConnection.onconnectionstatechange = function (e) {
                    log('offerReceived: onconnectionstatechange: ' + newPeerConnection.connectionState);

                    if(newPeerConnection.connectionState == 'connected') {
                        //senderParticipant.isNegotiating = false;
                    }
                    if(newPeerConnection.iceConnectionState == 'closed') {
                        participantDisconnected(senderParticipant);
                    }

                };

                newPeerConnection.onicecandidate = function (e) {
                    gotIceCandidate(e, senderParticipant);
                };

                senderParticipant.negotiate = negotiate;

                newPeerConnection.onnegotiationneeded = function (e) {
                    log('offerReceived: onnegotiationneeded, isNegotiating = ' + senderParticipant.isNegotiating);
                    log('offerReceived: onnegotiationneeded, current sdp ' + (newPeerConnection.localDescription ? newPeerConnection.localDescription.sdp : 'n/a'))
                    negotiate();
                };

                return newPeerConnection;

            }

            function publishLocalAudio(senderParticipant){
                if(senderParticipant.broadcastRole == 'donor') return;
                var RTCPeerConnection = senderParticipant.RTCPeerConnection;
                var localTracks = localParticipant.tracks;

                var audioSenders = RTCPeerConnection.getSenders().filter(function (sender) {
                    return sender.track && sender.track.kind == 'audio';
                });

                var cancel = false;
                for(var s = audioSenders.length - 1; s >= 0 ; s--){

                    for(let i = localParticipant.tracks.length - 1; i >= 0 ; i--){
                        if(localParticipant.tracks[i].mediaStreamTrack.id == audioSenders[s].track.id) {
                            cancel = true;
                        }
                    }
                }
                if(cancel) return;

                if ('ontrack' in RTCPeerConnection) {
                    for (let t in localTracks) {
                        log('offerReceived: publishLocalAudio: add audioTrack');
                        if(localTracks[t].kind == 'audio' && localTracks[t].mediaStreamTrack.readyState != 'ended') RTCPeerConnection.addTrack(localTracks[t].mediaStreamTrack, localTracks[t].stream);
                    }
                } else {
                    if (localParticipant.audioStream != null) {
                        log('offerReceived: publishLocalAudio: add audioStream');
                        RTCPeerConnection.addStream(localParticipant.audioStream);
                    }
                }


            }

            function publishLocalVideo(senderParticipant) {
                if(senderParticipant.broadcastRole == 'donor') return;

                var RTCPeerConnection = senderParticipant.RTCPeerConnection;
                var localTracks = localParticipant.tracks;

                if ('ontrack' in RTCPeerConnection) {
                    for (let t in localTracks) {
                        log('offerReceived: publishLocalVideo: add videoTrack: localTracks', localTracks[t]);

                        if (localTracks[t].kind == 'video' && localTracks[t].mediaStreamTrack.readyState != 'ended') {
                            log('offerReceived: publishLocalVideo: add videoTrack', localTracks[t].participant.sid, senderParticipant.sid);
                            RTCPeerConnection.addTrack(localTracks[t].mediaStreamTrack, localTracks[t].stream);
                        }
                    }

                } else {
                    if (localParticipant.videoStream != null) {
                        log('offerReceived: publishLocalVideo: add videoStream');
                        RTCPeerConnection.addStream(localParticipant.videoStream);
                    }
                }
            }

            function creteEmptyVideoTrack(width, height) {
                if(typeof width == 'undefined') width = 640;
                if(typeof height == 'undefined') height = 480;

                let canvas = Object.assign(document.createElement("canvas"), {width, height});
                canvas.getContext('2d').fillRect(0, 0, width, height);
                let stream = canvas.captureStream();
                return Object.assign(stream.getVideoTracks()[0], {enabled: false});


            }
            function creteEmptyAudioTrack(width, height) {
                if(typeof width == 'undefined') width = 640;
                if(typeof height == 'undefined') height = 480;

                let canvas = Object.assign(document.createElement("canvas"), {width, height});
                canvas.getContext('2d').fillRect(0, 0, width, height);
                let stream = canvas.captureStream();
                return Object.assign(stream.getVideoTracks()[0], {enabled: false});

            }

            function process(message) {
                log('offerReceived fromSid', message.fromSid);
                log('offerReceived resetConnection', message.resetConnection);
                log('offerReceived ' + message.sdp);

                var senderParticipant = roomParticipants.filter(function (existingParticipant) {
                    return existingParticipant.sid == message.fromSid && existingParticipant.RTCPeerConnection;
                })[0];
                if(senderParticipant) log('offerReceived senderParticipant', senderParticipant.isNegotiating,  message.resetConnection);

                /*if(senderParticipant == null && (_localInfo.browserName == 'Chrome' || _localInfo.browserName == 'Safari') && message.info.browserName == 'Firefox') {
                    log('offerReceived reset as socketParticipantConnected');

                    socketParticipantConnected().initPeerConnection(message);
                    return;
                }*/

                log('offerReceived: signalingRole: senderParticipant.signalingRole = ' + (senderParticipant != null ? senderParticipant.signalingRole : 'null'));

                //TODO: add chrome > 80 and firefox exceptions
                if(senderParticipant && senderParticipant.isNegotiating && senderParticipant.signalingRole == 'polite' && !message.resetConnection) {
                    log('offerReceived: ignore offer from polite participant');

                    if(senderParticipant.signalingState.stage == 'offerSent' || senderParticipant.signalingState.stage == 'answerReceived') {
                        log('offerReceived: ignore, but create new offer on stable signaling state');

                        senderParticipant.incrementOffersQueue();
                    }
                    return;
                } else if (senderParticipant && senderParticipant.signalingRole == 'impolite' && senderParticipant.isNegotiating && !message.resetConnection){
                    log('offerReceived: rollback to stable state');

                    if((_localInfo.browserName == 'Chrome' && _localInfo.browserVersion >= 80) || _localInfo.browserName == 'Firefox') {
                        senderParticipant.RTCPeerConnection.setLocalDescription({type: "rollback"});
                    }
                }

                if(senderParticipant == null) {
                    log('offerReceived participantConnected', senderParticipant);
                    senderParticipant = new Participant();
                    senderParticipant.sid = message.fromSid;
                    senderParticipant.identity = message.name;
                    senderParticipant.broadcastRole = message.broadcastRole;
                    senderParticipant.localInfo = message.info;
                    senderParticipant.distanceToRoot = message.distanceToRoot;
                    senderParticipant.color = message.color;
                    senderParticipant.connection = message.connection != null ? message.connection : null;
                    senderParticipant.initNegotiationEnded = false;
                    participantConnected(senderParticipant);
                } else if(senderParticipant != null && senderParticipant.online == false && message.resetConnection == true) {
                    log('offerReceived participantConnected: reset connection', senderParticipant);
                    if(senderParticipant.RTCPeerConnection != null) senderParticipant.RTCPeerConnection.close();
                    senderParticipant.remove();
                    senderParticipant = new Participant();
                    senderParticipant.sid = message.fromSid;
                    senderParticipant.identity = message.name;
                    senderParticipant.broadcastRole = message.broadcastRole;
                    senderParticipant.localInfo = message.info;
                    senderParticipant.distanceToRoot = message.distanceToRoot;
                    senderParticipant.color = message.color;
                    senderParticipant.connection = message.connection != null ? message.connection : null;
                    senderParticipant.initNegotiationEnded = false;
                    participantConnected(senderParticipant);
                }

                senderParticipant.isNegotiating = true;
                senderParticipant.waitingForReverseOffer = false;
                senderParticipant.waitingForOffer = false;
                senderParticipant.signalingState.setStage('offerReceived');
                //senderParticipant.currentOfferId = senderParticipant.hasNewOffersInQueue !== false ? senderParticipant.hasNewOffersInQueue + 1 : 0;

                var description;
                if(typeof cordova != 'undefined' && _isiOS) {
                    description = new RTCSessionDescription({type: message.type, sdp:message.sdp});
                } else {
                    description =  {type: message.type, sdp:message.sdp};
                }


                var pcNotEstablished = senderParticipant.RTCPeerConnection == null;
                if(pcNotEstablished || senderParticipant.RTCPeerConnection.connectionState =='closed' ||  message.resetConnection == true) {
                    log('offerReceived: createPeerConnection');
                    var localRollbackSupport = (_localInfo.browserName == 'Chrome' && _localInfo.browserVersion >= 80) || _localInfo.browserName == 'Firefox';
                    var remoteRollbackSupport = (message.info.browserName == 'Chrome' && message.info.browserVersion >= 80) || message.info.browserName == 'Firefox';

                    if((localRollbackSupport && remoteRollbackSupport) || (localRollbackSupport && !remoteRollbackSupport) || (!localRollbackSupport && !remoteRollbackSupport)) {

                        senderParticipant.signalingRole = 'impolite';
                        //senderParticipant.signalingRole = 'polite';

                    } else {
                        senderParticipant.signalingRole = 'polite';
                        //senderParticipant.signalingRole = 'impolite';
                    }

                    senderParticipant.connection = message.connection != null ? message.connection : null;
                    senderParticipant.RTCPeerConnection = createPeerConnection(senderParticipant);
                }

                senderParticipant.RTCPeerConnection.setRemoteDescription(description).then(function () {
                    senderParticipant.signalingState.setStage('offerApplied');
                    if(pcNotEstablished || senderParticipant.RTCPeerConnection.connectionState =='closed' ||  message.resetConnection == true) {
                        publishLocalVideo(senderParticipant);
                        publishLocalAudio(senderParticipant);
                    }
                    senderParticipant.RTCPeerConnection.createAnswer({ 'OfferToReceiveAudio': false, 'OfferToReceiveVideo': false })
                        .then(function(answer) {
                            log('offerReceived: answer created ' + answer.sdp);
                            senderParticipant.signalingState.setStage('answerCreated');

                            if(_isiOS){
                                //answer.sdp = removeInactiveTracksFromSDP(answer.sdp);
                            }

                            return senderParticipant.RTCPeerConnection.setLocalDescription(answer).then(function () {
                                log('offerReceived: answer created: sending', answer);
                                senderParticipant.signalingState.setStage('answerSent');
                                if(!senderParticipant.initNegotiationEnded) {
                                    senderParticipant.initNegotiationEnded = true;
                                }

                                sendMessage({
                                    name: localParticipant.identity,
                                    targetSid: message.fromSid,
                                    type: "answer",
                                    sdp: senderParticipant.RTCPeerConnection.localDescription,
                                    connection: message.connection != null ? message.connection : null
                                });
                            });
                        })
                        .catch(function(error) {
                            console.error(error.name + ': ' + error.message);
                        });
                });
            }

            return {
                processOffer: process
            }
        }

        function answerReceived(message) {
            log('answerReceived', message.fromSid);
            log('answerReceived: sdp: \n' + message.sdp.sdp);
            var senderParticipant = roomParticipants.filter(function (localParticipant) {
                return localParticipant.sid == message.fromSid;
            })[0];
            senderParticipant.identity = message.name;
            senderParticipant.signalingState.setStage('answerReceived');

            log('answerReceived from participant', senderParticipant.identity, senderParticipant.sid);

            var description;
            if(typeof cordova != 'undefined' && _isiOS) {
                description = new RTCSessionDescription(message.sdp);
            } else {
                description = message.sdp;
            }

            var offersInQueueBeforeAnswerApplied = senderParticipant.hasNewOffersInQueue;
            var peerConnection = senderParticipant.RTCPeerConnection;

            peerConnection.setRemoteDescription(description).then(function () {
                log('answerReceived setRemoteDescription ', peerConnection.signalingState, senderParticipant.hasNewOffersInQueue, senderParticipant.currentOfferId)
                if(offersInQueueBeforeAnswerApplied != senderParticipant.hasNewOffersInQueue) return;
                /*if((senderParticipant.hasNewOffersInQueue !== false && senderParticipant.currentOfferId !== false && senderParticipant.hasNewOffersInQueue > senderParticipant.currentOfferId)
                    || (senderParticipant.hasNewOffersInQueue !== false && senderParticipant.currentOfferId === false)
                    /!*|| senderParticipant.shouldSendReverseOffer*!/) {
                    log('answerReceived STARTING NEW NEGOTIATION AGAIN ', senderParticipant.hasNewOffersInQueue, senderParticipant.currentOfferId)

                    senderParticipant.isNegotiating = false;
                    senderParticipant.currentOfferId = false;
                    senderParticipant.signalingState.setStage(null);
                    senderParticipant.negotiate();
                } else {
                    senderParticipant.hasNewOffersInQueue = false;
                    senderParticipant.isNegotiating = false;
                    senderParticipant.currentOfferId = false;
                    senderParticipant.signalingState.setStage(null);
                }*/
            });
        }

        function canISendOffer(participant) {
            log('canISendOffer');
            return new Promise((resolve, reject) => {

                if (!socket) {
                    reject('No socket connection.');
                } else {
                    socket.emit('Media/broadcast/canISendOffer', {
                        targetSid: participant.sid,
                        type: "request",
                    });
                    log('canISendOffer sent')

                    var reseivedAnswer = function (e) {
                        log('canISendOffer reseivedAnswer', e)
                        var fromParticipant = roomParticipants.filter(function (roomParticipant) {
                            return roomParticipant.sid == e.fromSid;
                        })[0];

                        if(fromParticipant == null || participant != fromParticipant) return;

                        if(e.answerValue === true) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }

                        app.event.off('canISendOffer', reseivedAnswer);
                    }
                    app.event.on('canISendOffer', reseivedAnswer);
                }

            });

        }

        function iceConfigurationReceived(message) {
            log('iceConfigurationReceived: ' + JSON.stringify(message));
            log('iceConfigurationReceived: roomParticipants', roomParticipants);
            var senderParticipant = roomParticipants.filter(function (localParticipant) {
                return localParticipant.sid == message.fromSid;
            })[0];

            if(senderParticipant == null) return;

            //var candidate = new IceCandidate({sdpMLineIndex:message.label, candidate:message.candidate});
            var peerConnection, candidate;

            peerConnection = senderParticipant.RTCPeerConnection;
            candidate = new RTCIceCandidate({
                candidate: message.candidate,
                sdpMLineIndex: message.label,
                sdpMid: message.sdpMid
            });
            //if(message.purpose == 'forReceivingMedia' && typeof cordova != 'undefined') return;
            log('iceConfigurationReceived: signalingState = ' + peerConnection.signalingState)
            log('iceConfigurationReceived: isNegotiating = ' + senderParticipant.isNegotiating)
            log('iceConfigurationReceived: canTrickleIceCandidates = ' + peerConnection.canTrickleIceCandidates)
            log('iceConfigurationReceived: peerConnection.remoteDescription != null = ' + (peerConnection.remoteDescription != null))


            //if(peerConnection.remoteDescription != null && peerConnection.signalingState == 'stable') {
                peerConnection.addIceCandidate(candidate)
                    .catch(function(e) {
                        console.error(e.name + ': ' + e.message);
                    });
            /*} else {
            log('iceConfigurationReceived: add to queue')

            senderParticipant.iceCandidatesQueue.push({
                peerConnection: peerConnection,
                candidate: candidate
            });
            }*/


        }

        function socketRoomJoined(streams) {
            log('socketRoomJoined', streams);
            app.state = 'connected';

            for (var s in streams) {
                if(streams[s] == null) continue;
                var localTracks = streams[s].getTracks();

                for (var i in localTracks) {
                    var trackToAttach = new Track();
                    trackToAttach.sid = localTracks[i].id;
                    trackToAttach.kind = localTracks[i].kind
                    trackToAttach.isLocal = true;
                    trackToAttach.stream = streams[s];
                    trackToAttach.screensharing = localTracks[i].contentHint == 'detail' ? true : false;
                    trackToAttach.mediaStreamTrack = localTracks[i];

                    app.mediaControls.attachTrack(trackToAttach, localParticipant);
                }

                var videoTracks = streams[s].getVideoTracks();
                var audioTracks = streams[s].getAudioTracks();
                log('socketRoomJoined videoTracks ' + videoTracks.length);
                log('socketRoomJoined audioTracks ' + audioTracks.length);
                //if (videoTracks.length != 0 && audioTracks.length == 0) localParticipant.videoStream = streams[s];
                //if (audioTracks.length != 0 && videoTracks.length == 0) localParticipant.audioStream = streams[s];
            }



            app.signalingDispatcher.socketEventBinding();
            sendOnlineStatus();
            log('joined', {sid:socket.id, room:options.roomName})
            socket.emit('Media/broadcast/joined', {
                sid:socket.id,
                room:options.roomName,
                role: options.role,
                isiOS: _isiOS,
                livestreamStreamData: options.livestreamStreamData,
                info: _localInfo
            });
        }

        return {
            processDataTrackMessage: processDataTrackMessage,
            sendDataTrackMessage: sendDataTrackMessage,
            socketRoomJoined: socketRoomJoined,
            socketEventBinding: socketEventBinding,
            offerReceived: offerReceived,
            answerReceived: answerReceived,
            iceConfigurationReceived: iceConfigurationReceived,
            socketParticipantConnected: socketParticipantConnected,
            addTracksToPeerConnections: addTracksToPeerConnections,
            stopSendingTracks: stopSendingTracks,
            getCurrentDistanceToRoot: getCurrentDistanceToRoot
        }
    }())


    function sendMessage(message){
        log('sendMessage', message)
        socket.emit('Media/broadcast/signalling', message);
    }

    var initOrConnectWithNodeJs = function (callback) {
        log('initOrConnectWithNodeJs', callback);

        function joinRoom(streams) {
            log('initOrConnectWithNodeJs: joinRoom', options);

            app.signalingDispatcher.socketRoomJoined((streams != null ? streams : []));
            app.event.dispatch('joined', localParticipant);
            if(callback != null) callback(app);
        }

        if(options.role != 'publisher') {
            log('initOrConnectWithNodeJs: !publisher');

            joinRoom(null);
        } else {
            if (options.streams != null) {
                log('initOrConnectWithNodeJs: streams passed as param');
                joinRoom(options.streams);
                return;
            }

            joinRoom(null);
            return;
        }

    }

    function enableiOSDebug() {
        var ua=navigator.userAgent;
        if(ua.indexOf('iPad')!=-1||ua.indexOf('iPhone')!=-1||ua.indexOf('iPod')!=-1) {
            console.stdlog = console.log.bind(console);

            console.log = function (txt) {

                if(!socket || socket && !socket.connected) return;

                try {
                    //originallog.apply(console, arguments);
                    var i, argument;
                    var argumentsString = '';
                    for (i = 1; argument = arguments[i]; i++){
                        if (typeof argument == 'object') {
                            argumentsString = argumentsString + ', OBJECT';
                        } else {
                            argumentsString = argumentsString + ', ' + argument;
                        }
                    }

                    socket.emit('Media/broadcast/log', txt + argumentsString + '\n');
                    console.stdlog.apply(console, arguments);
                    latestConsoleLog = txt + argumentsString + '\n';
                } catch (e) {

                }
            }
        }
        console.stderror = console.error.bind(console);

        console.error = function (txt) {

            if(!socket || socket && !socket.connected) return;

            try {
                var err = (new Error);
            } catch (e) {

            }

            try {
                var i, argument;
                var argumentsString = '';
                for (i = 1; argument = arguments[i]; i++){
                    if (typeof argument == 'object') {
                        argumentsString = argumentsString + ', OBJECT';
                    } else {
                        argumentsString = argumentsString + ', ' + argument;
                    }
                }

                var today = new Date();
                var dd = today.getDate();
                var mm = today.getMonth() + 1;

                var yyyy = today.getFullYear();
                if (dd < 10) {
                    dd = '0' + dd;
                }
                if (mm < 10) {
                    mm = '0' + mm;
                }
                var today = dd + '/' + mm + '/' + yyyy + ' ' + today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();

                var errorMessage = "\n\n" + today + " Error: " + txt + ', ' +  argumentsString + "\nurl: " + location.origin + "\nline: ";

                if(typeof err != 'undefined' && typeof err.lineNumber != 'undefined') {
                    errorMessage = errorMessage + err.lineNumber + "\n " + ua+ "\n";
                } else if(typeof err != 'undefined' && typeof err.stack != 'undefined')
                    errorMessage = errorMessage + err.stack + "\n " + ua+ "\n";
                else errorMessage = errorMessage + "\n " + ua + "\n";
                socket.emit('Media/broadcast/errorlog', errorMessage);
                console.stderror.apply(console, arguments);
            } catch (e) {
                console.error(e.name + ' ' + e.message)
            }
        }

        window.onerror = function(msg, url, line, col, error) {
            if(socket == null) return;
            var extra = !col ? '' : '\ncolumn: ' + col;
            extra += !error ? '' : '\nerror: ' + error;

            var today = new Date();
            var dd = today.getDate();
            var mm = today.getMonth() + 1;

            var yyyy = today.getFullYear();
            if (dd < 10) {
                dd = '0' + dd;
            }
            if (mm < 10) {
                mm = '0' + mm;
            }
            var today = dd + '/' + mm + '/' + yyyy + ' ' + today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();

            var errMessage = "\n\n" + today + " Error: " + msg + "\nurl: " + url + "\nline: " + line + extra + "\nline: " + ua;

            socket.emit('Media/broadcast/errorlog', errMessage);
        }

    }

    app.init = function(callback){
        app.state = 'connecting';
        log('app.init')

        var findScript = function (src) {
            var scripts = document.getElementsByTagName('script');
            for (var i=0; i<scripts.length; ++i) {
                var srcTag = scripts[i].getAttribute('src');
                if (srcTag && srcTag.indexOf(src) != -1) {
                    return true;
                }
            }
            return null;
        };

        var ua=navigator.userAgent;
        if(ua.indexOf('Android')!=-1||ua.indexOf('Windows Phone')!=-1||ua.indexOf('iPhone')!=-1||ua.indexOf('iPod')!=-1) {
            _isMobile=true;
        }

        var onConnect = function () {
            log('app.init: connected', socket);

            app.event.dispatch('connected');

            if(app.state == 'reconnecting') {
                app.state = 'connected';
                log('app.init: socket: RECONNECTED')
                socket.emit('Media/broadcast/joined', {
                    sid: socket.id,
                    room: options.roomName,
                    role: options.role,
                    isiOS: _isiOS,
                    livestreamStreamData: options.livestreamStreamData,
                    info: _localInfo
                });
                localParticipant.sid = socket.id;

                /*setTimeout(function() {
                    log('app.init: socket: RECONNECTED: stopSendingTracks');
                    app.signalingDispatcher.stopSendingTracks();
                    setTimeout(function () {
                        log('app.init: socket: RECONNECTED: publishStream');
                        var mediastream = app.mediaControls.getMediaStream();
                        app.mediaControls.publishStream(mediastream)
                    }, 5000);
                }, 5000);*/
                return;
            }

            //enableiOSDebug();
            log('app.init: socket: connected: ' + socket.connected + ',  app.state: ' +  app.state);
            log('app.init: socket: localParticipant', localParticipant);
            if(localParticipant == null) {
                localParticipant = new Participant();
                localParticipant.sid = socket.id;
                localParticipant.role = options.role;
                localParticipant.isLocal = true;
                localParticipant.online = true;
                roomParticipants.push(localParticipant);
            }

            if(socket.connected && app.state == 'connecting') initOrConnectWithNodeJs(callback);
        }

        var connect = function () {
            log('app.init: connect');

            //let io = io('/webrtc');
            Q.Socket.connect('/broadcast', options.nodeServer, null, {
                forceNew: true,
                secure:true,
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 100,
                earlyCallback: function (qs) {
                    socket = qs.socket;
                    socket.on('connect', onConnect);

                    socket.io.on('connect_error', function(e) {
                        log('initWithNodeJs: connect_error');
                        app.event.dispatch('connectError');
                        log('Connection failed');
                        console.error(e);
                    });
    
                    socket.io.on('reconnect_failed', function(e) {
                        log('initWithNodeJs: reconnect_failed');
                        log(e)
                        app.event.dispatch('reconnectError');
                    });
                    socket.io.on('reconnect_attempt', function(e) {
                        log('initWithNodeJs: reconnect_attempt');
                        log('reconnect_attempt', e)
                        app.state = 'reconnecting';
                        app.event.dispatch('reconnectAttempt', e);
                    });
                }
            });
        }

        log('app.init: find socket.io');

        if(typeof options.nodeServer == 'object') {
            socket = options.nodeServer;
            onConnect();
            return;
        }

        if(findScript('socket.io.js') && typeof io != 'undefined') {
            connect();
        } else {
            log('app.init: add socket.io');

            var url = 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.4.0/socket.io.min.js'
            var xhr = new XMLHttpRequest();

            xhr.open('GET', url, true);

            xhr.onload = function(e) {
                var script = e.target.response || e.target.responseText;
                if (e.target.readyState === 4) {
                    switch( e.target.status) {
                        case 200:
                            eval.apply( window, [script] );
                            connect();
                            break;
                        default:
                            console.error("ERROR: script not loaded: ", url);
                    }
                }
            }
            xhr.send();
        }
    }

    app.disconnect = function (switchRoom, byHumanAction) {
        console.log('broadcastClient.disconnect', app.id);

        for(var p = roomParticipants.length - 1; p >= 0; p--){
            if(options.mode == 'node' && !roomParticipants[p].isLocal) {
                if (roomParticipants[p].RTCPeerConnection != null) roomParticipants[p].RTCPeerConnection.close();
                if (roomParticipants[p].iosrtcRTCPeerConnection != null) roomParticipants[p].iosrtcRTCPeerConnection.close();
            }

            if(!switchRoom) roomParticipants[p].remove();
        }


        if(socket != null) {
            if(byHumanAction) {
                socket.emit('Media/broadcast/disconnect');
            }
            //socket.removeAllListeners();
            delete Q.Socket.getAll()['/broadcast']
            socket.disconnect();
        }
        app.state = 'disconnected';
        app.event.dispatch('disconnected');
        app.event.destroy();

    }

    function determineBrowser(ua) {
        var ua= navigator.userAgent, tem,
            M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
        if(/trident/i.test(M[1])){
            tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
            return 'IE '+(tem[1] || '');
        }
        if(M[1]=== 'Chrome'){
            tem= ua.match(/\b(OPR|Edge?)\/(\d+)/);
            if(tem!= null) return tem.slice(1).join(' ').replace('OPR', 'Opera').replace('Edg ', 'Edge ');
        }
        M= M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
        if((tem= ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
        return M;
    }

    function log(text) {
        //if(options.debug === false) return;
        var args = Array.prototype.slice.call(arguments);
        var params = [];

        if (window.performance) {
            var now = (window.performance.now() / 1000).toFixed(3);
            params.push(now + ": " + args.splice(0, 1));
            params = params.concat(args);
            console.log.apply(console, params);
        } else {
            params.push(text);
            params = params.concat(args);
            console.log.apply(console, params);
        }

        app.event.dispatch('log', params);

    }

    return app;
}