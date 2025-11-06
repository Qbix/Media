(function ($, window, undefined) {
    

    var _controlsToolIcons = []; 

    var ua = navigator.userAgent;
    var _isMobile = false;
    var _isiOS = false;
    var _isAndroid = false;
    var _isiOSCordova = false;
    var _isAndroidCordova = false;
    if (ua.indexOf('iPad') != -1 || ua.indexOf('iPhone') != -1 || ua.indexOf('iPod') != -1) _isiOS = true;
    if (ua.indexOf('Android') != -1) _isAndroid = true;
    if (ua.indexOf('Android') != -1 || ua.indexOf('iPhone') != -1) _isMobile = true;
    if (typeof cordova != 'undefined' && _isiOS) _isiOSCordova = true;
    if (typeof cordova != 'undefined' && _isAndroid) _isAndroidCordova = true;

    // Check if MediaStreamTrackProcessor is supported
    const isMediaStreamTrackProcessorSupported = 'MediaStreamTrackProcessor' in window;

    // Check if VideoEncoder is supported
    const isVideoEncoderSupported = 'VideoEncoder' in window;

    // Check if AudioEncoder is supported
    const isAudioEncoderSupported = 'AudioEncoder' in window;

    const mp4MuxerRecordingSupported = isMediaStreamTrackProcessorSupported && isVideoEncoderSupported && isAudioEncoderSupported;
    
    function log(){}
    if(Q.Media.WebRTCdebugger) {
        log = Q.Media.WebRTCdebugger.createLogMethod('livestreamEditor.js')
    }

    function copyToClipboard(el) {
        if(Q.info.platform === 'ios') {
            var oldContentEditable = el.contentEditable,
                oldReadOnly = el.readOnly,
                range = document.createRange();

            el.contentEditable = true;
            el.readOnly = false;
            range.selectNodeContents(el);

            var s = window.getSelection();
            s.removeAllRanges();
            s.addRange(range);

            el.setSelectionRange(0, 999999); // A big number, to cover anything that could be inside the element.

            el.contentEditable = oldContentEditable;
            el.readOnly = oldReadOnly;

            document.execCommand('copy');
            return;
        }
        var tempEl = document.createElement('textarea');
        tempEl.value = el.value || el.innerText;
        tempEl.setAttribute('readonly', '');
        tempEl.style.position = 'absolute';
        tempEl.style.left = '-9999px';
        document.body.appendChild(tempEl);
        var selected =
            document.getSelection().rangeCount > 0
                ? document.getSelection().getRangeAt(0)
                : false;
        tempEl.select();
        document.execCommand('copy');
        document.body.removeChild(tempEl);
        if (selected) {
            document.getSelection().removeAllRanges();
            document.getSelection().addRange(selected);
        }
    };

    let livestreamingModules = Q.getObject("WebRTC.livestreaming", Q.Media);
    if(!livestreamingModules) {
        Q.Media.WebRTC.livestreaming = {};
    }
    /**
     * Media/webrtc/control tool.
     * Users can chat with each other via WebRTC using Twilio or raw streams
     * @module Media
     * @class Media webrtc
     * @constructor
     * @param {Object} options
     *  Hash of possible options
     */
    Q.Tool.define("Media/webrtc/livestreaming", function(options) {
            var tool = this;

            //window = tool.element.ownerDocument.defaultView;
            //document = window.document;

            tool.text = Q.Text.collection[Q.Text.language]['Media/content'];

            this.livestreamingEditor = null;
            this.livestreamStream = null;

            tool.webrtcUserInterface = options.webrtcUserInterface();
            tool.webrtcSignalingLib = tool.webrtcUserInterface.getWebrtcSignalingLib();

            _controlsToolIcons = tool.state.controlsTool.getIcons();

            //child tools
            tool.livestreamingEditor = null;           

            tool.importChildModules().then(function () {
                tool.eventDispatcher = Q.Media.WebRTC.EventSystem();
                tool.RTMPSender = Q.Media.WebRTC.livestreaming.RTMPSender(tool);
                tool.canvasComposer = Q.Media.WebRTC.livestreaming.CanvasComposer(tool);
                tool.declareOrRefreshEventHandlers();

                Q.handle(tool.state.onToolLoaded);
            });
        },

        {
            webrtcUserInterface: null,
            managingScenes: true,
            managingVisualSources: true,
            managingAudioSources: true,
            recordingIsActive: false,
            p2pBroadcastIsActive: false,
            fbLiveIsActive: false,
            rtmpLiveIsActive: false,
            localRecordingIsActive: { sendingToServer: false },
            googleClientId: null,
            facebookAppId: null,
            usePopups: true, //use popups instead of dialogs when starting/stopping livestream or recording
            onToolLoaded: new Q.Event()
        },

        {
            importChildModules: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.addScript([
                        '{{Media}}/js/tools/webrtc/livestreamingEditor/streamingIcons.js',
                        '{{Media}}/js/tools/webrtc/EventSystem.js',
                        '{{Media}}/js/tools/webrtc/livestreamingEditor/RTMPStreaming.js',
                        '{{Media}}/js/tools/webrtc/livestreamingEditor/RTMPSender.js',
                        '{{Media}}/js/tools/webrtc/livestreamingEditor/CanvasComposer.js'
                    ], function () {
                        tool.icons = Q.Media.WebRTC.livestreaming.streamingIcons;
                        resolve();
                    });
                });
            },
            declareStreamEvents: function () {
                var tool = this;
                if(tool.streamEventsDeclared) return;
                tool.streamEventsDeclared = true;
                tool.livestreamStream.onEphemeral('Media/livestream/reaction').set(function (ephemeral) {
                    if (ephemeral) {
                        if(!tool.livestreamingEditor) return;
                        let activeScene = tool.livestreamingEditor.scenesInterface.getActive();

                        if(activeScene) activeScene.reactionsSource.addReaction(ephemeral.reaction);
                    }
                }, tool);
               
            },
            declareOrRefreshEventHandlers: function () {
                var tool = this;
                var webrtcSignalingLib = tool.webrtcSignalingLib;
                
                webrtcSignalingLib.event.on('beforeSwitchRoom', function (e) {
                    tool.updateWebrtcSignalingLibInstance(e.newWebrtcSignalingLibInstance);
                    tool.declareOrRefreshEventHandlers();
                    tool.eventDispatcher.dispatch('beforeSwitchRoom', { newWebrtcSignalingLibInstance: e.newWebrtcSignalingLibInstance });
                });

                webrtcSignalingLib.event.on('localRecordingStarted', function (e) {
                    if(e.format == 'mp4') {
                        renderMp4RecordingStats(e);
                    } else {
                        
                    }
                });

                webrtcSignalingLib.event.on('localRecordingEnded', function (e) {
                    let statsContainer = document.querySelector('.live-editor-dialog-header-stats');
                    if(statsContainer) statsContainer.innerHTML = '';
                });

                function renderMp4RecordingStats(e) {
                    let statsContainer = document.querySelector('.live-editor-dialog-header-stats');
                    statsContainer.innerHTML = '';
                    var statFPS = document.createElement('DIV');
                    statFPS.className = 'live-editor-stats-fps';
                    statsContainer.appendChild(statFPS);
                    var statFPSCaption = document.createElement('DIV');
                    statFPSCaption.className = 'live-editor-stats-fps-caption';
                    statFPSCaption.innerHTML = 'FPS: ';
                    statFPS.appendChild(statFPSCaption);
                    var statFPSValue = document.createElement('DIV');
                    statFPSValue.className = 'live-editor-stats-fps-value';
                    statFPS.appendChild(statFPSValue);

                    var statQueue = document.createElement('DIV');
                    statQueue.className = 'live-editor-stats-queue';
                    //statsContainer.appendChild(statQueue);
                    var statQueueCaption = document.createElement('DIV');
                    statQueueCaption.className = 'live-editor-stats-queue';
                    statQueueCaption.innerHTML = 'queue: ';
                    statQueue.appendChild(statQueueCaption);
                    var statQueueValue = document.createElement('DIV');
                    statQueueValue.className = 'live-editor-stats-value';
                    statQueue.appendChild(statQueueValue);

                    function renderStats() {
                        statFPSValue.innerHTML = e.mp4Recorder.fps;
                        if(e.mp4Recorder.videoEncoder && e.mp4Recorder.videoEncoder.state != 'closed') {
                            statQueueValue.innerHTML = e.mp4Recorder.videoEncoder.encodeQueueSize;
                            setTimeout(renderStats, 500);
                        } else if(!e.mp4Recorder.videoEncoder){
                            setTimeout(renderStats, 500);
                        }
                    }

                    renderStats();  
                }
            },
            updateWebrtcSignalingLibInstance: function (newWebrtcSignalingLib) {
                var tool = this;
                if(tool.webrtcSignalingLib != newWebrtcSignalingLib) {
                    tool.webrtcSignalingLib = newWebrtcSignalingLib;
                }
            },
            getApiCredentials: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/webrtc", ['apiCredentials'], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);
        
                        if (msg) {
                            reject(msg);
                            console.error(msg)
                            return;
                        }

                        tool.state.googleClientId = response.slots.apiCredentials.googleClientId;
                        tool.state.facebookAppId = response.slots.apiCredentials.facebookAppId;
                        resolve(response.slots.apiCredentials)
                    }, {
                        method: 'get',
                        fields: {}
                    });
                });
            },
            create: function() {
                if(this.livestreamingEditor != null) return this.livestreamingEditor;
                var tool = this;
                var getOptions = function () {
                     return tool.webrtcSignalingLib.getOptions() || {};
                }
                var _controlsTool = tool.state.controlsTool;
                var _webrtcUserInterface = tool.webrtcUserInterface;
                var desktopDialogEl = null;
                var mobileHorizontaldialogEl = null;
                var activeDialog = null;
                var isOpening = false; //if livestreaming editor in process of opening (e.g. when user has vertical orientation and is changing to horizontal)
                var isHidden = true;

                var _chatBoxContainer = null;
                //var _resizingElement = null;
                //var _resizingElementTool = null;
                var _hoveringElement = null;
                var _hoveringElementToolInstance;
                var _fileManagerTool = null;
                var _streamingCanvas = null;
                var _sourcesColumnEl = null;

                var _layoutsList = [
                    { key: 'tiledStreamingLayout', title: 'Tiled' },
                    { key: 'screenSharing', title: 'Screen sharing' },
                    { key: 'sideScreenSharing', title: 'Side screen sharing' },
                    { key: 'floatingScreenSharing', title: 'Floating screen sharing' },
                    { key: 'loudestFullScreen', title: 'Loudest full-screen' },
                    { key: 'audioOnly', title: 'Audio only' },
                    { key: 'audioScreenSharing', title: 'Audio only + screen sharing' }
                ];

                var streamingToSection = (function () {
                    let _recordingIconEl = null;
                    let _p2pBroadcastIconEl = null;
                    let _customRtmpIconEl = null;

                    function declareOrRefreshEventHandlers () {
                        var webrtcSignalingLib = tool.webrtcSignalingLib;

                        tool.eventDispatcher.on('livestreamingStarted', function () {
                            updateSourcesControlPanel();
                        });

                        tool.eventDispatcher.on('beforeSwitchRoom', function (e) {
                            declareOrRefreshEventHandlers();
                        });

                        webrtcSignalingLib.event.on('liveStreamingStarted', function (e) {
                            log('liveStreamingStarted', e.platform);
                            if (e.participant.isLocal) {
                                showLiveIndicator('custom');
                            }
                        });
                        webrtcSignalingLib.event.on('liveStreamingEnded', function (e) {
                            if (e.participant.isLocal) {
                                hideLiveIndicator('custom');
                            }
                        });
                      
                        webrtcSignalingLib.event.on('liveStreamingStopped', function (e) {
                            hideLiveIndicator('custom');
                        });    
                    }

                    declareOrRefreshEventHandlers();

                    let rtmpStreaming = Q.Media.WebRTC.livestreaming.RTMPStreaming(tool);

                    let serverRecording = (function() {
                        var _serverRecordingSection = null;
                        var _recordingsList = null;
                        var _serverRecordingsList = null;
                        var _relatedServerRecordingsTool = null;
                        var _localRecordingTimer = null;
                        var _serverRecordingTimer = null;

                        function createSectionElement() {
                            var roomId = 'broadcast-' + tool.webrtcUserInterface.getOptions().roomId + '-' + (tool.webrtcSignalingLib.localParticipant().sid).replace('/webrtc#', '');

                            var recordingCon = _serverRecordingSection = document.createElement('DIV');
                            recordingCon.className = 'live-editor-stream-to-section-rec';

                            var recordingButtons = document.createElement('DIV');
                            recordingButtons.className = 'live-editor-stream-to-section-rec-buttons';
                            recordingCon.appendChild(recordingButtons);

                            var startLocalRecBtn = document.createElement('DIV');
                            startLocalRecBtn.className = 'live-editor-rec-start';
                            recordingButtons.appendChild(startLocalRecBtn);

                            var startLocRecordingBtn = document.createElement('DIV');
                            startLocRecordingBtn.className = 'Q_button live-editor-rec-start-btn';
                            startLocalRecBtn.appendChild(startLocRecordingBtn);

                            var startLocRecordingBtnInner = document.createElement('DIV');
                            startLocRecordingBtnInner.className = 'live-editor-rec-start-btn-inner';
                            startLocRecordingBtn.appendChild(startLocRecordingBtnInner);

                            var startButtonTextCon = document.createElement('DIV');
                            startButtonTextCon.className = 'live-editor-drop-down-btn-text';
                            startLocRecordingBtnInner.appendChild(startButtonTextCon);

                            var startButtonText = document.createElement('SPAN');
                            startButtonText.className = 'live-editor-drop-down-btn-text-text';
                            startButtonText.innerHTML = 'Start Recording';
                            startButtonTextCon.appendChild(startButtonText);

                            var startButtonTimer = document.createElement('SPAN');
                            startButtonTimer.className = 'live-editor-drop-down-btn-timer';
                            startButtonTextCon.appendChild(startButtonTimer);

                            var dropDownArrCon = document.createElement('DIV');
                            dropDownArrCon.className = 'live-editor-drop-down-btn-arr-con';
                            startLocRecordingBtnInner.appendChild(dropDownArrCon);

                            var dropDownArr = document.createElement('DIV');
                            dropDownArr.className = 'live-editor-drop-down-btn-arr';
                            dropDownArrCon.appendChild(dropDownArr);

                            var recordingsContainer = document.createElement('DIV');
                            recordingsContainer.className = 'live-editor-stream-to-section-recs';
                            recordingButtons.appendChild(recordingsContainer);

                            var getRecordingsBtn = document.createElement('BUTTON');
                            getRecordingsBtn.className = 'Q_button';
                            getRecordingsBtn.innerHTML = 'Show Recordings';
                            recordingsContainer.appendChild(getRecordingsBtn);

                            let recordingFormats = document.createElement('DIV');
                            recordingFormats.className = 'live-editor-rec-server-dropdown-inner';

                            let mp4IsSupported = mp4MuxerRecordingSupported || MediaRecorder.isTypeSupported('video/mp4;codecs=h264') || MediaRecorder.isTypeSupported('video/mp4;codecs:h264');
                            let mp4Label = document.createElement('LABEL');
                            recordingFormats.appendChild(mp4Label);
                            let mp4Checkbox = document.createElement('INPUT');
                            mp4Checkbox.type = 'radio';
                            mp4Checkbox.name = 'recFormat';
                            mp4Checkbox.checked = mp4IsSupported ? true : false;
                            mp4Label.appendChild(mp4Checkbox);
                            let mp4LabelText= document.createElement('SPAN');
                            mp4LabelText.innerHTML = 'mp4';
                            mp4Label.appendChild(mp4LabelText);

                            let webmIsSupported = (MediaRecorder.isTypeSupported('video/webm;codecs=h264') || MediaRecorder.isTypeSupported('video/webm;codecs:h264'));
                            let webmLabel = document.createElement('LABEL');
                            recordingFormats.appendChild(webmLabel);
                            let webmCheckbox = document.createElement('INPUT');
                            webmCheckbox.type = 'radio';
                            webmCheckbox.name = 'recFormat';
                            webmCheckbox.checked = !mp4IsSupported && webmIsSupported ? true : false;
                            webmLabel.appendChild(webmCheckbox);
                            let webmLabelText= document.createElement('SPAN');
                            webmLabelText.innerHTML = 'webm';
                            webmLabel.appendChild(webmLabelText);

                            if(!mp4IsSupported) {
                                mp4Label.classList.add('Q_disabled');
                            }
                            if(!webmIsSupported) {
                                webmLabel.classList.add('Q_disabled');
                            }
                            if(!mp4IsSupported && !webmIsSupported) {
                                startLocalRecBtn.classList.add('Q_disabled');
                            }
                            
                            Q.activate(
                                Q.Tool.setUpElement(
                                    dropDownArrCon,
                                    "Media/webrtc/popupDialog",
                                    {
                                        content: recordingFormats,
                                        triggerOn: 'lmb',
                                        className: 'live-editor-rec-server-dropdown',
                                        parent: recordingCon
                                    }
                                ),
                                {},
                                function () {
                                   
                                }
                            );

                            /* sendChunksCheckbox.addEventListener('click', function () {
                                if(sendChunksCheckbox.checked && tool.RTMPSender.isStreaming()) {
                                    console.error('You cannot both send recording\'s video to the cloud and stream to RTMP endpoint.');
                                    sendChunksCheckbox.checked = false;
                                }
                            }) */

                            startButtonTextCon.addEventListener('click', function () {
                                startLocRecordingBtn.classList.add('Q_working');

                                if(!tool.state.localRecordingIsActive.active && !tool.state.localRecordingIsPending) {
                                    tool.state.localRecordingIsPending = true;
                                    
                                    /* if(sendChunksCheckbox.checked) {
                                        createRecordingStream().then(function (recordingStream) {
                                            startRecording(recordingStream).then(function () {
                                                startLocRecordingBtn.classList.remove('Q_working');
                                                startLocRecordingBtn.classList.add('live-editor-rec-start-btn-active');
                                                tool.state.localRecordingIsPending = false;
                                            });
                                        });
                                    } else { */
                                        startRecording().then(function () {
                                            startLocRecordingBtn.classList.remove('Q_working');
                                            startLocRecordingBtn.classList.add('live-editor-rec-start-btn-active');
                                            tool.state.localRecordingIsPending = false;
                                        });
                                    //}
                                } else {
                                    stopRecording().then(function () {
                                        startLocRecordingBtn.classList.remove('Q_working');
                                        startLocRecordingBtn.classList.remove('live-editor-rec-start-btn-active');
                                    });
                                }
                               
                            })
                            /* if (localInfo.browserName && localInfo.browserName.toLowerCase() == 'safari') {
                                if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
                                    codecs = 'video/mp4;codecs=h264';
                                }
                            } else {
                                
                            } */
                            function startRecording(recordingStream) {
                                return new Promise(function (resolve, reject) {
                                    _localRecordingTimer = new Timer(startButtonTimer);
                                    _localRecordingTimer.start();
                                    if(mp4Checkbox.checked && mp4MuxerRecordingSupported) {
                                        tool.RTMPSender.startMp4LocalRecording(recordingStream);
                                    } else if(mp4Checkbox.checked && (MediaRecorder.isTypeSupported('video/mp4;codecs=h264') || MediaRecorder.isTypeSupported('video/mp4;codecs:h264'))) {
                                        let codecs = MediaRecorder.isTypeSupported('video/mp4;codecs=h264') ? 'video/mp4;codecs=h264' : 'video/mp4;codecs:h264';
                                        tool.RTMPSender.startLocalRecording(recordingStream, codecs);
                                    } else if(webmCheckbox.checked && (MediaRecorder.isTypeSupported('video/webm;codecs=h264') || MediaRecorder.isTypeSupported('video/webm;codecs:h264'))) {
                                        let codecs = MediaRecorder.isTypeSupported('video/webm;codecs=h264') ? 'video/webm;codecs=h264' : 'video/webm;codecs:h264';
                                        tool.RTMPSender.startLocalRecording(recordingStream, codecs);
                                    }
    
                                    startButtonText.innerHTML = 'Stop Recording';
                                    startButtonTimer.innerHTML = '';
                                    showLiveIndicator('rec');
                                    tool.state.localRecordingIsActive.active = true;
                                    tool.state.localRecordingIsActive.sendingToServer = recordingStream ? true : false;
                                    resolve();
                                });
                            }

                            function stopRecording() {
                                return new Promise(function (resolve, reject) {
                                    if(_localRecordingTimer) {
                                        _localRecordingTimer.stop();
                                        _localRecordingTimer = null;
                                    }
                                    if(mp4Checkbox.checked && mp4MuxerRecordingSupported) {
                                        tool.RTMPSender.stopMp4LocalRecording();
                                    } else {
                                        tool.RTMPSender.stopLocalRecording();
                                    }
    
                                    startButtonText.innerHTML = 'Start Recording';
                                    startButtonTimer.innerHTML = '';
    
                                    tool.state.localRecordingIsActive.active = false;
                                    updateSourcesControlPanel();
                                    hideLiveIndicator('rec');
                                    resolve();
                                });
                                
                            }

                            function createRecordingStream() {
                                return new Promise(function (resolve, reject) {
                                    Q.req("Media/recording", ["recording"], function (err, response) {
                                        var msg = Q.firstErrorMessage(err, response && response.errors);
                
                                        if (msg) {
                                            reject(msg);
                                            return;
                                        }
                                       
                                        resolve(response.slots.recording.recordingStream);                                    
                                    }, {
                                        method: 'post',
                                        fields: {
                                           publisherId: tool.webrtcUserInterface.roomStream().fields.publisherId,
                                           streamName: tool.webrtcUserInterface.roomStream().fields.name
                                        }
                                    });
                                });
                            }

                            getRecordingsBtn.addEventListener('click', function () {
                                Q.Dialogs.push({
                                    title: 'My Recordings',
                                    className: 'live-editor-recordings-dialog',
                                    content: Q.Tool.setUpElement(
                                        "DIV",
                                        "Media/webrtc/recordings",
                                        {
                                            publisherId: tool.webrtcUserInterface.roomStream().fields.publisherId,
                                            streamName: tool.webrtcUserInterface.roomStream().fields.name,
                                        }
                                    ),
                                    apply: false
                                });
                            }); 
                            

                            function Timer(element) {
                                var timerInstance = this;
                                this.element = element;
                                this.startTime = null;
                                this.intervalId = null;
                            
                                this.start = function() {
                                    if (timerInstance.intervalId === null) {
                                        timerInstance.startTime = Date.now();
                                        timerInstance.intervalId = setInterval(function() {
                                            timerInstance.updateTime()
                                        }, 1000);
                                    }
                                }
                            
                                this.stop = function() {
                                    if (timerInstance.intervalId !== null) {
                                        clearInterval(timerInstance.intervalId);
                                        timerInstance.intervalId = null;
                                    }
                                }
                            
                                this.updateTime = function() {
                                    const currentTime = Date.now();
                                    const elapsedTime = Math.floor((currentTime - timerInstance.startTime) / 1000);
                                    const hours = Math.floor(elapsedTime / 3600);
                                    const minutes = Math.floor((elapsedTime % 3600) / 60);
                                    const seconds = elapsedTime % 60;
                                    
                                    timerInstance.element.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                                }
                            }
                            

                            return recordingCon;
                        }

                        createSectionElement();

                        function getSection() {
                            return _serverRecordingSection;
                        }

                        return {
                            getSection: getSection
                        }
                    }())

                    let peerToPeerStreaming = (function() {
                        var _peerToPeerStreamingSection = null;
                        var _broadcastClient = null;
                        var _linkToLiveInput = null;

                        function generateLinkToLivestreamTool() {
                            let livestreamId = (tool.livestreamStream.fields.name).replace('Media/webrtc/livestream/', '');
                            _linkToLiveInput.value = location.origin + '/livestream/' + tool.livestreamStream.fields.publisherId + '/' + livestreamId;
                        }

                        function createSectionElement() {
                            var roomId = 'broadcast-' + tool.webrtcUserInterface.getOptions().roomId + '-' + (tool.webrtcSignalingLib.localParticipant().sid).replace('/webrtc#', '');

                            var broadcastingCon = _peerToPeerStreamingSection = document.createElement('DIV');
                            broadcastingCon.className = 'live-editor-dialog-window-content live-editor-stream-to-section-p2p'

                            var broadcastingSettings = document.createElement('DIV');
                            broadcastingSettings.className = 'live-editor-stream-to-section-p2p-start_settings';
                            broadcastingCon.appendChild(broadcastingSettings);

                            var startBroadcastingBtnCon = document.createElement('DIV');
                            startBroadcastingBtnCon.className = 'live-editor-stream-to-section-p2p-start';
                            broadcastingSettings.appendChild(startBroadcastingBtnCon);

                            var startBroadcastingBtn = document.createElement('BUTTON');
                            startBroadcastingBtn.type = 'button';
                            startBroadcastingBtn.className = 'Q_button';
                            startBroadcastingBtn.innerHTML = Q.getObject("webrtc.settingsPopup.start", tool.text);
                            startBroadcastingBtnCon.appendChild(startBroadcastingBtn);

                            var activeBroadcastingSection = document.createElement('DIV');
                            activeBroadcastingSection.style.display = 'none';
                            activeBroadcastingSection.className = 'live-editor-stream-to-section-p2p-live';
                            broadcastingCon.appendChild(activeBroadcastingSection);

                            var linkCon = document.createElement('DIV');
                            linkCon.className = 'live-editor-stream-to-section-p2p-link-con';
                            activeBroadcastingSection.appendChild(linkCon);
                            
                            var linkInputCon = document.createElement('LABEL');
                            linkInputCon.className = 'live-editor-stream-to-section-p2p-label';
                            linkCon.appendChild(linkInputCon);
                            var linkInput = _linkToLiveInput = document.createElement('INPUT');
                            linkInput.disabled = true;
                            //1 linkInput.value = location.origin + '/broadcast?stream=' + roomId;
                            //2 linkInput.value = location.origin + '/livestream/' + tool.livestreamStream.fields.publisherId + '/' + livestreamId;

                            linkInputCon.appendChild(linkInput);
                            var linkCopyBtn = document.createElement('BUTTON');
                            linkCopyBtn.innerHTML = Q.getObject("webrtc.settingsPopup.copy", tool.text);
                            linkCon.appendChild(linkCopyBtn);

                            linkCopyBtn.addEventListener('click', function () {
                                copyToClipboard(linkInput);
                                tool.webrtcUserInterface.notice.show(Q.getObject("webrtc.notices.linkCopiedToCb", tool.text));
                            })

                            var buttonsCon = document.createElement('DIV');
                            buttonsCon.className = 'live-editor-stream-to-section-p2p-buttons';
                            activeBroadcastingSection.appendChild(buttonsCon);

                            var stopBroadcastingBtnCon = document.createElement('DIV');
                            stopBroadcastingBtnCon.className = 'live-editor-stream-to-section-p2p-stop';
                            buttonsCon.appendChild(stopBroadcastingBtnCon);

                            var stopBroadcastingBtn = document.createElement('BUTTON');
                            stopBroadcastingBtn.type = 'button';
                            stopBroadcastingBtn.className = 'Q_button';
                            stopBroadcastingBtn.innerHTML = Q.getObject("webrtc.settingsPopup.stop", tool.text);
                            stopBroadcastingBtnCon.appendChild(stopBroadcastingBtn);

                            var shareBroadcastingBtnCon = document.createElement('DIV');
                            shareBroadcastingBtnCon.className = 'live-editor-stream-to-section-p2p-share';
                            buttonsCon.appendChild(shareBroadcastingBtnCon);

                            var shareBroadcastingBtn = document.createElement('BUTTON');
                            shareBroadcastingBtn.type = 'button';
                            shareBroadcastingBtn.className = 'Q_button';
                            shareBroadcastingBtnCon.appendChild(shareBroadcastingBtn);
                            var shareBroadcastingBtnIcon = document.createElement('SPAN');
                            shareBroadcastingBtnIcon.className = 'live-editor-stream-to-section-p2p-share-icon';
                            shareBroadcastingBtnIcon.innerHTML = tool.icons.plusIcon;
                            shareBroadcastingBtn.appendChild(shareBroadcastingBtnIcon);

                            var shareBroadcastingBtnText = document.createElement('SPAN');
                            shareBroadcastingBtnText.className = 'live-editor-stream-to-section-p2p-share-text';
                            shareBroadcastingBtnText.innerHTML = Q.getObject("webrtc.settingsPopup.share", tool.text);
                            shareBroadcastingBtn.appendChild(shareBroadcastingBtnText);

                            startBroadcastingBtn.addEventListener('click', function () {
                                if (!broadcastingCon.classList.contains('Q_working')) broadcastingCon.classList.add('Q_working');
                                tool.getOrCreateLivestreamStream().then(function () {
                                    Q.addScript('{{Media}}/js/tools/webrtc/broadcast.js', function () {
                                        Q.req("Media/webcast", ["room"], function (err, response) {
                                            var msg = Q.firstErrorMessage(err, response && response.errors);

                                            if (msg) {
                                                return console.error(msg);
                                            }

                                            // roomId = (response.slots.room.roomId).replace('Media/webrtc/', '');
                                            var turnCredentials = response.slots.room.turnCredentials;
                                            var socketServer = response.slots.room.socketServer;

                                            _broadcastClient = window.WebRTCWebcastClient({
                                                mode: 'node',
                                                role: 'publisher',
                                                nodeServer: socketServer,
                                                roomName: roomId,
                                                livestreamStreamData: {
                                                    publisherId: tool.livestreamStream.fields.publisherId,
                                                    streamName: tool.livestreamStream.fields.name,
                                                    livestreamSessionId: generateId()
                                                }
                                                //turnCredentials: turnCredentials,
                                            });
                                            if (broadcastingCon.classList.contains('Q_working')) broadcastingCon.classList.remove('Q_working');
                                            broadcastingSettings.style.display = 'none';
                                            activeBroadcastingSection.style.display = 'block';
                                            showLiveIndicator('p2p');
                                            generateLinkToLivestreamTool();

                                            _broadcastClient.init(function () {
                                                tool.canvasComposer.captureStream();
                                                var stream = tool.canvasComposer.getMediaStream();

                                                if (stream != null) stream = stream.clone();

                                                _broadcastClient.mediaControls.publishStream(stream);
                                                tool.state.p2pBroadcastIsActive = true;
                                                updateSourcesControlPanel();
                                                tool.webrtcSignalingLib.signalingDispatcher.sendDataTrackMessage('webcastStarted', roomId)
                                                tool.webrtcSignalingLib.event.dispatch('webcastStarted', { participant: tool.webrtcSignalingLib.localParticipant() });
                                            });

                                            _broadcastClient.event.on('disconnected', function () {
                                                tool.webrtcSignalingLib.signalingDispatcher.sendDataTrackMessage('webcastEnded')
                                                tool.webrtcSignalingLib.event.dispatch('webcastEnded', { participant: tool.webrtcSignalingLib.localParticipant() });

                                                tool.state.p2pBroadcastIsActive = false;
                                            });

                                        }, {
                                            method: 'post',
                                            fields: {
                                                roomId: roomId,
                                                publisherId: Q.Users.communityId,
                                            }
                                        });

                                    });
                                });
                            })
                            stopBroadcastingBtn.addEventListener('click', function () {
                                if (!broadcastingCon.classList.contains('Q_working')) broadcastingCon.classList.add('Q_working');

                                _broadcastClient.disconnect(null, true);

                                if (!tool.RTMPSender.isStreaming() && !tool.RTMPSender.isRecording()) {
                                    tool.canvasComposer.stopCaptureCanvas();
                                }

                                if (broadcastingCon.classList.contains('Q_working')) broadcastingCon.classList.remove('Q_working');
                                activeBroadcastingSection.style.display = 'none';
                                broadcastingSettings.style.display = '';
                                tool.state.p2pBroadcastIsActive = false;
                                updateSourcesControlPanel();
                                hideLiveIndicator('p2p');
                            })
                            shareBroadcastingBtn.addEventListener('click', function () {
                                if(tool.livestreamStream) {
                                    Q.Streams.invite(tool.livestreamStream.fields.publisherId, tool.livestreamStream.fields.name, { 
                                        title: 'Share Livestream',
                                        addLabel: [],
                                        addMyLabel: [] 
                                    });
                                }
                            })

                            return broadcastingCon;
                        }

                        createSectionElement();

                        function getSection() {
                            return _peerToPeerStreamingSection;
                        }

                        return {
                            getSection: getSection,
                        }
                    }())

                    function showLiveIndicator(platform){
                         if(platform == 'custom') {
                            if(!_customRtmpIconEl.classList.contains('live-editor-stream-to-is-active')) {
                                _customRtmpIconEl.classList.add('live-editor-stream-to-is-active');
                            }
                        } else if(platform == 'p2p') {
                            if(!_p2pBroadcastIconEl.classList.contains('live-editor-stream-to-is-active')) {
                                _p2pBroadcastIconEl.classList.add('live-editor-stream-to-is-active');
                            }
                        } else if(platform == 'rec') {
                            if(!_recordingIconEl.classList.contains('live-editor-stream-to-is-active')) {
                                _recordingIconEl.classList.add('live-editor-stream-to-is-active');
                            }
                        }
                    }
                    function hideLiveIndicator(platform){
                        if(platform == 'custom') {
                            _customRtmpIconEl.classList.remove('live-editor-stream-to-is-active');
                        } else if(platform == 'p2p') {
                            _p2pBroadcastIconEl.classList.remove('live-editor-stream-to-is-active');
                        } else if(platform == 'rec') {
                            _recordingIconEl.classList.remove('live-editor-stream-to-is-active');
                        }
                    }

                    function createSection(){
                        var sectionContainer = document.createElement('DIV');
                        sectionContainer.className = 'live-editor-stream-to-section';
                        var sectionInnerContainer = document.createElement('DIV');
                        sectionInnerContainer.className = 'live-editor-stream-to-section-inner';
                        sectionContainer.appendChild(sectionInnerContainer);

                        var recordingBtn = document.createElement('DIV');
                        recordingBtn.className = 'live-editor-stream-to-section-btn live-editor-stream-to-section-rec-btn';
                        sectionInnerContainer.appendChild(recordingBtn);

                        var recordingIcon = document.createElement('DIV');
                        recordingIcon.className = 'live-editor-stream-to-section-btn-icon live-editor-stream-to-section-rec-icon';
                        recordingBtn.appendChild(recordingIcon);

                        var recordingIconSvg = _recordingIconEl = document.createElement('DIV');
                        recordingIconSvg.className = 'live-editor-stream-to-section-btn-icon-svg';
                        recordingIconSvg.innerHTML = tool.icons.recordingIcon;
                        recordingIcon.appendChild(recordingIconSvg);

                        var recordingCaption = document.createElement('DIV');
                        recordingCaption.className = 'live-editor-stream-to-section-btn-text live-editor-stream-to-section-p2p-text';
                        recordingCaption.innerHTML = 'Record';
                        recordingBtn.appendChild(recordingCaption);

                        var peerToPeerStreamingBtn = document.createElement('DIV');
                        peerToPeerStreamingBtn.className = 'live-editor-stream-to-section-btn live-editor-stream-to-section-p2p-btn';
                        sectionInnerContainer.appendChild(peerToPeerStreamingBtn);

                        var peerToPeerStreamingIcon = document.createElement('DIV');
                        peerToPeerStreamingIcon.className = 'live-editor-stream-to-section-btn-icon live-editor-stream-to-section-p2p-icon';
                        peerToPeerStreamingBtn.appendChild(peerToPeerStreamingIcon);

                        var peerToPeerStreamingIconSvg = _p2pBroadcastIconEl = document.createElement('DIV');
                        peerToPeerStreamingIconSvg.className = 'live-editor-stream-to-section-btn-icon-svg';
                        peerToPeerStreamingIconSvg.innerHTML = tool.icons.streamingToP2P;
                        peerToPeerStreamingIcon.appendChild(peerToPeerStreamingIconSvg);

                        var peerToPeerStreamingCaption = document.createElement('DIV');
                        peerToPeerStreamingCaption.className = 'live-editor-stream-to-section-btn-text live-editor-stream-to-section-p2p-text';
                        peerToPeerStreamingCaption.innerHTML = 'P2P<br>Broadcast';
                        peerToPeerStreamingBtn.appendChild(peerToPeerStreamingCaption);

                        var customStreamBtn = document.createElement('DIV');
                        customStreamBtn.className = 'live-editor-stream-to-section-btn live-editor-stream-to-section-suctom-rtmp-btn';
                        sectionInnerContainer.appendChild(customStreamBtn);

                        var customStreamIcon = document.createElement('DIV');
                        customStreamIcon.className = 'live-editor-stream-to-section-btn-icon live-editor-stream-rtmp-icon';
                        customStreamBtn.appendChild(customStreamIcon);

                        var customStreamIconSvg = _customRtmpIconEl = document.createElement('DIV');
                        customStreamIconSvg.className = 'live-editor-stream-to-section-btn-icon-svg';
                        customStreamIconSvg.innerHTML = tool.icons.streamingToRtmp;
                        customStreamIcon.appendChild(customStreamIconSvg);

                        var customStreamCaption = document.createElement('DIV');
                        customStreamCaption.className = 'live-editor-stream-to-section-btn-text live-editor-stream-to-section-fb-text';
                        customStreamCaption.innerHTML = 'Custom<br>Stream';
                        customStreamBtn.appendChild(customStreamCaption);

                        if (tool.state.usePopups) {
                            Q.activate(
                                Q.Tool.setUpElement(
                                    recordingIcon,
                                    "Media/webrtc/popupDialog",
                                    {
                                        content: serverRecording.getSection(),
                                        className: 'live-editor-stream-rec-popup'
                                    }
                                ),
                                {},
                                function () {
                                   
                                }
                            );
                            Q.activate(
                                Q.Tool.setUpElement(
                                    peerToPeerStreamingIcon,
                                    "Media/webrtc/popupDialog",
                                    {
                                        content: peerToPeerStreaming.getSection(),
                                        className: 'live-editor-stream-p2p-popup'
                                    }
                                ),
                                {},
                                function () {
                                   
                                }
                            );
                            
                            /* Q.activate(
                                Q.Tool.setUpElement(
                                    customStreamIcon,
                                    "Media/webrtc/popupDialog",
                                    {
                                        content: rtmpStreaming.getSection(),
                                        className: 'live-editor-stream-rtmp-popup'
                                    }
                                ),
                                {},
                                function () {
                                   
                                }
                            ); */
                            customStreamIcon.addEventListener('click', function() {
                                let streamingControlsEl = document.querySelector('.live-editor-preview');
                                let rectangleToShowIn = streamingControlsEl ? streamingControlsEl.getBoundingClientRect() : null;
                                Q.Dialogs.push({
                                    title: 'Live Stream Destinations',
                                    className: 'live-editor-dialog live-editor-stream-rtmp-popup',
                                    content: rtmpStreaming.getSection(),
                                    apply: false,
                                    mask: false
                                });
                            });
                        } else {
                            recordingBtn.addEventListener('click', function() {
                                let streamingControlsEl = document.querySelector('.live-editor-preview');
                                let rectangleToShowIn = streamingControlsEl ? streamingControlsEl.getBoundingClientRect() : null;
                                let settingsDialog = new SimpleDialog({
                                    content: serverRecording.getSection(), 
                                    rectangleToShowIn: rectangleToShowIn,
                                    title: 'Record',
                                    className: 'live-editor-modal-window'
                                });
                            });

                            peerToPeerStreamingBtn.addEventListener('click', function() {
                                let streamingControlsEl = document.querySelector('.live-editor-preview');
                                let rectangleToShowIn = streamingControlsEl ? streamingControlsEl.getBoundingClientRect() : null;
                                let settingsDialog = new SimpleDialog({
                                    content: peerToPeerStreaming.getSection(), 
                                    rectangleToShowIn: rectangleToShowIn,
                                    title: 'Peer To Peer Broadcast',
                                    className: 'live-editor-modal-window'
                                });
                            });

                            customStreamBtn.addEventListener('click', function() {
                                let streamingControlsEl = document.querySelector('.live-editor-preview');
                                let rectangleToShowIn = streamingControlsEl ? streamingControlsEl.getBoundingClientRect() : null;
                                let settingsDialog = new SimpleDialog({
                                    content: rtmpStreaming.getSection(), 
                                    rectangleToShowIn: rectangleToShowIn,
                                    title: 'Stream to custom RTMP'
                                });
                                Q.Dialogs.push({
                                    title: 'My Recordings',
                                    className: 'live-editor-recordings-dialog',
                                    content: Q.Tool.setUpElement(
                                        "DIV",
                                        "Media/webrtc/recordings",
                                        {
                                            publisherId: tool.webrtcUserInterface.roomStream().fields.publisherId,
                                            streamName: tool.webrtcUserInterface.roomStream().fields.name,
                                        }
                                    ),
                                    apply: false
                                });
                            });
                        }

                        return sectionContainer;
                    }

                    function updateSourcesControlPanel() {
                      if(!scenesInterface) return;
                      let scenes = scenesInterface.getScenesList();
                      for(let i in scenes) {
                        scenes[i].sourcesInterface.updateSourceControlPanelButtons();
                      }
                    }

                    return {
                        createSection: createSection
                    }
                }())

                var scenesInterface = (function () {
                    var _scenesDropDownEl = null;
                    var _scenesList = [];
                    var _activeScene = null;
                    var _watermark = null;
                    var _eventDispatcher = new Q.Media.WebRTC.EventSystem();

                    var SceneListItem = function (sceneInstance) {
                        var sceneListInstance = this;
                        this._title = sceneInstance.title;
                        this.itemEl = null;
                        this.sceneInstance = sceneInstance;
                        this.sourcesInterface = new SourcesInterface(this);
                        this.remove = function () {
                            var currentItem = this;
                            if (this.itemEl != null && this.itemEl.parentNode != null) this.itemEl.parentNode.removeChild(this.itemEl);
                            for (var i in _scenesList) {
                                if (_scenesList[i] == currentItem) {
                                    _scenesList.splice(i, 1);
                                    break;
                                }
                            }
                        };
                        this.isActive = function () {
                            var scenes = tool.canvasComposer.getScenes();
                            for (let i in scenes) {
                                if (scenes[i] == this.sceneInstance) {
                                    return true;
                                }
                            }
                            return false;
                        };

                        var itemEl = document.createElement('OPTION');
                        itemEl.className = 'live-editor-scenes-select-item';
                        itemEl.value = sceneInstance.id;
                        itemEl.innerHTML = sceneInstance.title;
                        this.itemEl = itemEl;

                        sceneInstance.eventDispatcher.on('sourceAdded', function () {
                            sceneListInstance.sourcesInterface.update();
                        })

                        sceneInstance.eventDispatcher.on('sourceRemoved', function () {
                            sceneListInstance.sourcesInterface.update();
                        })

                        sceneInstance.eventDispatcher.on('sourceMoved', function () {
                            sceneListInstance.sourcesInterface.update();
                        })

                    }
                    Object.defineProperties(SceneListItem.prototype, {
                        'title': {
                            'set': function (val) {
                                this._title = val;
                                if (this.itemEl) this.itemEl.innerHTML = val;
                            },
                            'get': function (val) {
                                return this._title;
                            }
                        }
                    });

                    function addNewScene(name) {
                        log('addNewScene', name)
                        tool.canvasComposer.createScene(name);
                        syncList();
                    }

                    function selectScene(sceneIdOrObject) {
                        let sceneItem;
                        if(typeof sceneIdOrObject == 'string') {
                            sceneItem = _scenesList.filter(function(s){
                                return s.sceneInstance.id == sceneIdOrObject ? true : false;
                            })[0];
                        } else {
                            sceneItem = sceneIdOrObject;
                        }

                        if(!sceneItem) {
                            return;
                        }

                        if (sceneItem.itemEl) {
                            log('selectScene make selected');
                            sceneItem.itemEl.selected = true;
                        }
                        var switchScene = _activeScene != sceneItem;
                        var prevScene = _activeScene;
                        _activeScene = sceneItem;
                        if(prevScene) {
                            let prevSources = prevScene.sourcesInterface.getSourcesList();
                            log('selectScene: deselect prev sources START')

                            for(let s in prevSources) {
                                log('selectScene: deselect prev sources', prevSources[s])
                                if(prevSources[s].resizingElement != null && prevSources[s].resizingElement.parentElement) {
                                    prevSources[s].resizingElement.parentElement.removeChild(prevSources[s].resizingElement);
                                }
                            }

                            let resizingEls = activeDialog.previewBoxEl.querySelectorAll('.live-editor-canvas-preview-resizing');
                            let a;
                            for(a = 0; a < resizingEls.length; a++) {
                                if(resizingEls[a].parentNode) {
                                    resizingEls[a].parentNode.removeChild(resizingEls[a]);
                                }
                            }

                            /*let allParticipantsListItem = prevScene.sourcesInterface.getWebrtcGroupListItem();
                            if(allParticipantsListItem && allParticipantsListItem.resizingElement.parentElement) {
                                allParticipantsListItem.resizingElement.parentElement.removeChild(allParticipantsListItem.resizingElement);
                            }*/
                        }
                        tool.canvasComposer.selectScene(_activeScene.sceneInstance);

                        if (_sourcesColumnEl) {
                            let sourceColAlreadyExists = _sourcesColumnEl.querySelector('.live-editor-sources-inner');
                            if(sourceColAlreadyExists != null && sourceColAlreadyExists.parentElement) {
                                sourceColAlreadyExists.parentElement.removeChild(sourceColAlreadyExists);
                            }

                            _sourcesColumnEl.appendChild(_activeScene.sourcesInterface.createSourcesCol());

                            let sceneIndex = _scenesList.indexOf(sceneItem);
                            if(sceneIndex != -1 && _layoutsList[sceneIndex]) { //set default webrtc layout
                                sceneItem.sourcesInterface.selectLayout(_layoutsList[sceneIndex].key, true);
                            }
                        }

                        //_activeScene.sourcesInterface.initHoveringTool();
                        /*let sources = _activeScene.sourcesInterface.getSourcesList();
                        for (let s in sources) {
                            if (sources[s].resizingElement != null) {
                                activeDialog.previewBoxEl.appendChild(sources[s].resizingElement);
                            }
                        }*/

                        /*let allParticipantsListItem = _activeScene.sourcesInterface.getWebrtcGroupListItem();
                        if (allParticipantsListItem && allParticipantsListItem.resizingElement) {
                            activeDialog.previewBoxEl.appendChild(allParticipantsListItem.resizingElement);
                        }*/

                        let webrtcGroups = _activeScene.sourcesInterface.getWebrtcGroupListItems()
                        for(let i in webrtcGroups) {
                            if(webrtcGroups[i].sourceInstance) {
                                tool.canvasComposer.videoComposer.updateWebRTCLayout(webrtcGroups[i].sourceInstance);
                            }
                        }

                        _activeScene.sourcesInterface.update();
                        optionsColumn.update();
                        _eventDispatcher.dispatch('sceneSelected', _activeScene);
                    }

                    function moveSceneUp(sceneId) {
                        log('moveUp', sceneId);
                        let sceneToMove;
                        if(sceneId != null) {
                            sceneToMove = _scenesList.filter(function (s) {
                                return s.sceneInstance.id == sceneId ? true : false;
                            })[0];
                        } else {
                            sceneToMove = _activeScene;
                        }

                        log('moveUp sceneToMove', sceneToMove);
                        if(!sceneToMove) return;
                        tool.canvasComposer.moveSceneUp(sceneToMove.sceneInstance);

                        sortScenesList();
                    }

                    function moveSceneDown(sceneId) {
                        log('moveSceneDown');
                        let sceneToMove;
                        if(sceneId != null) {
                            sceneToMove = _scenesList.filter(function (s) {
                                return s.sceneInstance.id == sceneId ? true : false;
                            })[0];
                        } else {
                            sceneToMove = _activeScene;
                        }

                        if(!sceneToMove) return;
                        tool.canvasComposer.moveSceneDown(sceneToMove.sceneInstance);

                        sortScenesList();
                    }

                    function removeScene(sceneId) {
                        log('removeScene', sceneId, _activeScene);
                        let sceneToRemove;
                        if(sceneId != null) {
                            sceneToRemove = _scenesList.filter(function (s) {
                                return s.sceneInstance.id == sceneId ? true : false;
                            })[0];
                        } else {
                            sceneToRemove = _activeScene;
                        }

                        if(!sceneToRemove) return;


                        let indexOfScreneToRemove;
                        let sceneToSwitchTo;
                        if (_scenesList.length > 1) {
                            for (let s in _scenesList) {
                                if (_scenesList[s] == sceneToRemove) {
                                    indexOfScreneToRemove = s;
                                    break;
                                }
                            }

                            if (_scenesList[indexOfScreneToRemove + 1] != null) {
                                selectScene(_scenesList[indexOfScreneToRemove + 1]);
                            } else if (_scenesList[indexOfScreneToRemove - 1] != null) {
                                selectScene(_scenesList[indexOfScreneToRemove - 1]);
                            }

                            tool.canvasComposer.removeScene(sceneToRemove.sceneInstance);
                            syncList();
                        } else {
                            //at least once scene should exist
                        }


                    }

                    function addSceneItemToList(item) {
                        log('scenesInterface: addSceneItemToList', item, item.title)

                        if (item == null || _scenesDropDownEl == null) return;
                        _scenesList.push(item)
                        _scenesDropDownEl.appendChild(item.itemEl);
                    }

                    function sortScenesList() {
                        var listArr = _scenesList;
                        var listEl = _scenesDropDownEl;
                        var scenes = tool.canvasComposer.getScenes();

                        log('sortList: scenes', listEl, scenes, listArr);

                        if (scenes.length !== listArr.length) {
                            return;
                        }
                        listArr.sort((a, b) => {
                            return scenes.findIndex(p => p === a.sceneInstance) - scenes.findIndex(p => p === b.sceneInstance);
                        });

                        log('sortList: listArr', listArr.map(el => { return el.itemEl.innerText }));
                        log('sortList: NOT sortedElements', Array.from(listEl.childNodes).map(el => { return el.innerText }))

                        listEl.innerHTML == '';
                        for (let e = 0; e < listArr.length; e++) {
                            listEl.appendChild(listArr[e].itemEl)
                        }

                    }

                    function syncList() {

                        log('scenes: syncList _scenesList', _scenesList.length);

                        for (let i = _scenesList.length - 1; i >= 0; i--) {
                            log('scenes: syncList _scenesList', _scenesList[i]);
                            if (_scenesList[i] == null) continue;

                            if (_scenesList[i].isActive() == false) {
                                log('scenes: syncList remove', _scenesList[i]);

                                _scenesList[i].remove();
                                continue;
                            }
                        }

                        var scenes = tool.canvasComposer.getScenes();

                        log('scenesInterface: all', scenes);

                        for (let s in scenes) {
                            log('CONTROLS ADD SCENES', scenes[s])
                            log('CONTROLS ADD SOURCES', scenes[s].sources)
                            let sceneAlreadyExists = false;
                            for (let e in _scenesList) {
                                if (_scenesList[e].sceneInstance == scenes[s]) sceneAlreadyExists = true;
                            }
                            if (sceneAlreadyExists) continue;
                            log('scenesInterface: not exist')

                            var item = new SceneListItem(scenes[s])
                            addSceneItemToList(item);

                            if (_activeScene == null && parseInt(s) == 0) {
                                selectScene(item);
                            }
                            log('_eventDispatcher', _eventDispatcher)
                            
                            if(_watermark) {
                                item.sourcesInterface.addWatermark(_watermark, scenes[s]);
                            }

                            item.reactionsSource = tool.canvasComposer.videoComposer.addSource({
                                sourceType: 'reactions',
                            }, scenes[s]);

                            _eventDispatcher.dispatch('newSceneAdded', item);

                        }
                       
                        log('_scenesList', _scenesList)
                    }


                    function initHoveringTool() {
                        if(_hoveringElementToolInstance) {
                            return;
                        }
                        log('initHoveringTool');

                        var hoveredOverRect;
                        var _sourcesList, _selectedSource, allParticipantsListItem, allParticipantsGroupInstance, previewBoxRect, timesBigger;

                        function onSceneChangeHandler() {
                            if(!_activeScene) {
                                return;
                            }
                            _selectedSource = _activeScene.sourcesInterface.getSelectedSource();
                            let regularSources = _activeScene.sourcesInterface.getSourcesList();
                            let webrtcSources = _activeScene.sourcesInterface.getWebrtcGroupListItems()
                            let overlaySources = _activeScene.sourcesInterface.overlaySources.overlaySourcesList;
                            _sourcesList = [...regularSources, ...webrtcSources, ...overlaySources]

                            previewBoxRect = activeDialog.previewBoxEl.getBoundingClientRect();
                            var canvasSize = tool.canvasComposer.videoComposer.getCanvasSize();
                            var prmtr1 = canvasSize.width * 2 + canvasSize.height * 2
                            var realcanvasSize = _streamingCanvas.getBoundingClientRect();
                            var prmtr2 = realcanvasSize.width * 2 + realcanvasSize.height * 2
                            timesBigger = prmtr1 >= prmtr2 ? prmtr1 / prmtr2 : prmtr2 / prmtr1;
                        }
                        onSceneChangeHandler();

                        function handleScenesEvents (scene) {
                            scene.sourcesInterface.on('sourceSelected', function (source) {
                                log('sourceSelected', source, scene.sourcesInterface.getSelectedSource())
                                _selectedSource = source;
                                onSceneChangeHandler();
                            })

                            scene.sceneInstance.eventDispatcher.on('sourceAdded', function (source) {
                                onSceneChangeHandler();
                            })
    
                            scene.sceneInstance.eventDispatcher.on('sourceRemoved', function (source) {
                                onSceneChangeHandler();
                            })
                        }

                        _eventDispatcher.on('sceneSelected', onSceneChangeHandler);
                        log('track newSceneAdded')

                        for (let s in _scenesList) {
                            handleScenesEvents(_scenesList[s]);
                        }
                        _eventDispatcher.on('newSceneAdded', function (scene) {
                            handleScenesEvents(scene);
                        });

                        activeDialog.previewBoxParent.addEventListener('mousemove', function (e) {
                            if(_sourcesList.length == 0) {
                                return;
                            }
                            let x = e.clientX - previewBoxRect.x;
                            let y = e.clientY - previewBoxRect.y;
        
                            let isResizingOrMoving = false;
                            let res = '';
                            for (let s in _sourcesList) {
                                if(_sourcesList[s].listType == 'audio') continue;
                                if (_sourcesList[s].resizingElementTool.state.isResizing || _sourcesList[s].resizingElementTool.state.isMoving || _sourcesList[s].resizingElementTool.state.appliedRecently) {
                                    isResizingOrMoving = true;
                                    if (_sourcesList[s].resizingElementTool.state.isResizing) {
                                        res += '1'
                                    }
                                    if (_sourcesList[s].resizingElementTool.state.isMoving) {
                                        res += '2'
                                    }
                                    if (_sourcesList[s].resizingElementTool.state.appliedRecently) {
                                        res += '3'
                                    }
                                }
                            }

                            if (isResizingOrMoving) {
                                _hoveringElement.style.boxShadow = 'none';
                                hoveredOverRect = null;
                                return;
                            }
        
                            let selectedSourceRect = null;
                            let preselected = false;
                            let i = 0, len = _sourcesList.length;
                            while (i < len) {
                                let sourceItem = _sourcesList[i];

                                if(sourceItem.listType == 'audio' || sourceItem.isOverlay) {
                                    i++;
                                    continue;
                                }
                                let rect = _sourcesList[i].sourceInstance.rect;
                                let rectLeft = rect._x / timesBigger;
                                let rectRight = (rect._x + rect._width) / timesBigger;
                                let rectTop = rect._y / timesBigger;
                                let rectBottom = (rect._y + rect._height) / timesBigger;
                                let rectWidth = rect._width / timesBigger;
                                let rectHeight = rect._height / timesBigger;
        
                                if (x >= rectLeft && x <= rectRight
                                    && y >= rectTop && y <= rectBottom) {
                                    if (sourceItem == _selectedSource) {
                                        selectedSourceRect = rect;
                                        i++;
                                        continue;
                                    }
                                    if (selectedSourceRect != null && rect._width * rect._height > selectedSourceRect._width * selectedSourceRect._height) {
                                        i++;
                                        continue;
                                    }
                                    hoveredOverRect = rect;
                                    _hoveringElement.style.width = rectWidth + 'px';
                                    _hoveringElement.style.height = rectHeight + 'px';
                                    _hoveringElement.style.top = rectTop + 'px';
                                    _hoveringElement.style.left = rectLeft + 'px';
                                    _hoveringElement.style.boxShadow = 'inset 0px 0px 0px 1px skyblue';
                                    preselected = true;
                                    break;
                                }
                                i++;
                            }

                            if (!preselected) {
                                _hoveringElement.style.boxShadow = 'none';
                                hoveredOverRect = null;
                            }
                        });
        
                        activeDialog.previewBoxParent.addEventListener('mouseleave', function (e) {
                            if(_sourcesList.length == 0) {
                                return;
                            }
                            _hoveringElement.style.boxShadow = 'none';
                            hoveredOverRect = null;
                        });
        
                        activeDialog.previewBoxParent.addEventListener('click', function (e) {
                            if(_sourcesList.length == 0) {
                                return;
                            }
                            if (hoveredOverRect != null) {
                                //if (_resizingElementTool.state.appliedRecently) return;
                                let i = 0, len = _sourcesList.length;
                                while (i < len) {
                                    let sourceListItem = _sourcesList[i];
                                    let sourceInstance = _sourcesList[i].sourceInstance;
                                    if (sourceListItem.listType == 'audio') {
                                        i++;
                                        continue;
                                    }
                                    if (sourceInstance.rect == hoveredOverRect) {
                                        _activeScene.sourcesInterface.selectSource(sourceListItem);
                                        _hoveringElement.style.boxShadow = 'none';
                                        break;
                                    }
                                    i++;
                                }
        
                            } else if (e.target && e.target.classList.contains('le-canvas-preview-resizing')) {
                                //log('DESELECT')
        
                                let i = 0, len = _sourcesList.length;
                                while (i < len) {
                                    if(_sourcesList[i].listType == 'audio') {
                                        i++;
                                        continue;
                                    }
                                    if (_sourcesList[i].resizingElement == e.target) {
                                        _activeScene.sourcesInterface.selectSource(_sourcesList[i]);
                                        //_hoveringElement.style.boxShadow = 'none';
                                        break;
                                    }
                                    i++;
                                }
                            }
        
        
                        });
                    }

                    var addNewScenePopup = (function () {
                        var _dialogEl = null;
                        var _popupDialog = null;

                        log('addNewScenePopup')
                       
                        var boxContent = _dialogEl = document.createElement('DIV');
                        boxContent.className = 'live-editor-dialog-window-content';

                        var sceneNameInputCon = document.createElement('DIV');
                        sceneNameInputCon.className = 'live-editor-dialog-name-con';
                        boxContent.appendChild(sceneNameInputCon);
                        
                        var sceneNameInputText = document.createElement('SPAN');
                        sceneNameInputText.className = 'live-editor-dialog-name-text';
                        sceneNameInputText.innerHTML = 'Please, enter name of scene';
                        sceneNameInputCon.appendChild(sceneNameInputText);
                        
                        var sceneNameInput = document.createElement('INPUT');
                        sceneNameInput.className = 'live-editor-dialog-name';
                        sceneNameInput.type = 'text';
                        sceneNameInput.placeholder = 'Enter name of scene';
                        sceneNameInput.name = 'nameOfScene';
                        sceneNameInputCon.appendChild(sceneNameInput);

                        var buttonsCon = document.createElement('DIV');
                        buttonsCon.className = 'live-editor-dialog-buttons';
                        boxContent.appendChild(buttonsCon);
                        var okButton = document.createElement('BUTTON');
                        okButton.className = 'live-editor-dialog-ok-btn';
                        okButton.innerHTML = 'OK';
                        buttonsCon.appendChild(okButton);

                        okButton.addEventListener('click', function () {
                            if (sceneNameInput.value != '') {
                                var val = sceneNameInput.value;
                                addNewScene(val);
                                hideDialog();
                                sceneNameInput.value = '';
                            }
                        });

                        function setDefaultSceneName() {
                            sceneNameInput.value = 'Scene ' + parseInt(_scenesList.length + 1)
                        }

                        function showDialog(e) {
                            sceneNameInput.value = '';
                            if(_popupDialog && !_popupDialog.active) {
                                _popupDialog.show();
                                return;
                            } else if(_popupDialog) {
                                return;
                            }
                            _popupDialog = new SimpleDialog({
                                content: _dialogEl, 
                                rectangleToShowIn: null,
                                className: 'live-editor-dialog-box-add-new-s live-editor-add-scene',
                                title: 'Add new scene'
                            });
                            setDefaultSceneName();
                        }

                        function hideDialog() {
                            if(_popupDialog) _popupDialog.hide();
                        }

                        return {
                            hideDialog: hideDialog,
                            showDialog: showDialog
                        }
                    }())

                    function createScenesCol() {
                        var scenesColumn = document.createElement('DIV');
                        scenesColumn.className = 'live-editor-scenes';
                        var scenesColumnBody = document.createElement('DIV');
                        scenesColumnBody.className = 'live-editor-scenes-body';
                        var customSelectCon = document.createElement('DIV');
                        customSelectCon.className = 'live-editor-scenes-select-con';
                        var selectDropDown = document.createElement('SELECT');
                        selectDropDown.className = 'live-editor-scenes-select';
                        customSelectCon.appendChild(selectDropDown);
                        scenesColumnBody.appendChild(customSelectCon);
                        
                        var scenesColumnControlAddBtn = document.createElement('DIV');
                        scenesColumnControlAddBtn.className = 'live-editor-scenes-control-btn live-editor-scenes-control-btn-add';
                        if(!tool.state.managingScenes) scenesColumnControlAddBtn.classList.add('live-editor-inactive');
                        scenesColumnControlAddBtn.innerHTML = tool.icons.addItem;

                        scenesColumnControlAddBtn.addEventListener('click', function (event) {
                            addNewScenePopup.showDialog(event);
                        });

                        selectDropDown.addEventListener('change', function (e) {
                            selectScene(e.target.value);
                        })

                        var customSelect = new CustomSelect(selectDropDown);
                        customSelect.customSelectDropDownEl.classList.add('live-editor-scenes-select-list');
                        customSelect.customSelectControlsEl.appendChild(scenesColumnControlAddBtn);
                        customSelect.syncOptionsList = function () {
                            log('syncOptionsList START');
                            let originalSelect = customSelect.originalSelect;
                            let optionsNumber = originalSelect.options.length;
                            for(let e = customSelect.optionsList.length - 1; e >= 0; e--) {
                                let option = customSelect.optionsList[e];
                                let sourceIsRemoved = true;
                                for (let h = 0; h < optionsNumber; h++) {
                                    if(option.originalOptionEl == originalSelect.options[h]) {
                                        sourceIsRemoved = false;
                                        break;
                                    }
                                }
                                if(sourceIsRemoved) {
                                    if (option.customOptionEl != null && option.customOptionEl.parentElement != null) {
                                        option.customOptionEl.parentElement.removeChild(option.customOptionEl);
                                    }
                                    customSelect.optionsList.splice(e, 1);
                                }
                            }

                            for (let j = 0; j < optionsNumber; j++) {
                                let optionAlreadyExists = false;
                                for(let l in customSelect.optionsList) {
                                    if(customSelect.optionsList[l].originalOptionEl == originalSelect.options[j]) {
                                        optionAlreadyExists = customSelect.optionsList[l];
                                    }
                                }

                                if(optionAlreadyExists != false) {
                                    customSelect.customSelectListEl.appendChild(optionAlreadyExists.customOptionEl);
                                    continue;
                                } else if (optionAlreadyExists == false) {
                                    let sceneId = originalSelect.options[j].value;
                                    let optionElementCon = document.createElement("DIV");
                                    optionElementCon.className = 'live-editor-custom-select-option';
                                    optionElementCon.dataset.selectValue = originalSelect.options[j].value;
                                    customSelect.customSelectListEl.appendChild(optionElementCon);
    
                                    optionElementCon.addEventListener("click", function(e) {
                                        customSelect.selectOption(e.currentTarget);
                                    });
    
                                    let optionElementText = document.createElement("DIV");
                                    optionElementText.className = 'live-editor-custom-select-option-text';
                                    optionElementText.innerHTML = originalSelect.options[j].innerHTML;
                                    optionElementCon.appendChild(optionElementText);
    
                                    let optionElementControls = document.createElement("DIV");
                                    optionElementControls.className = 'live-editor-custom-select-option-controls';
                                    optionElementCon.appendChild(optionElementControls);
                                    
                                    var optionControlsRemoveBtn = document.createElement('DIV');
                                    optionControlsRemoveBtn.className = 'live-editor-custom-select-option-controls-btn';
                                    optionControlsRemoveBtn.innerHTML = tool.icons.removeItem;
                                    optionControlsRemoveBtn.addEventListener('click', function (e) {
                                        removeScene(sceneId);
                                        e.stopPropagation();
                                    })
                                    optionElementControls.appendChild(optionControlsRemoveBtn);
    
                                    var optionControlsUpBtn = document.createElement('DIV');
                                    optionControlsUpBtn.className = 'live-editor-custom-select-option-controls-btn live-editor-custom-select-btn-move';
                                    optionControlsUpBtn.innerHTML = tool.icons.moveUp;
                                    optionControlsUpBtn.addEventListener('click', function (e) {
                                        moveSceneUp(sceneId);
                                        e.stopPropagation();
                                    })
                                    optionElementControls.appendChild(optionControlsUpBtn);
    
                                    var optionControlsDownBtn = document.createElement('DIV');
                                    optionControlsDownBtn.className = 'live-editor-custom-select-option-controls-btn live-editor-custom-select-btn-move';
                                    optionControlsDownBtn.innerHTML = tool.icons.moveDown;
                                    optionControlsDownBtn.addEventListener('click', function (e) {
                                        moveSceneDown(sceneId);
                                        e.stopPropagation();
                                    })
                                    optionElementControls.appendChild(optionControlsDownBtn);
    
                                    customSelect.optionsList.push({
                                        originalOptionEl: originalSelect.options[j],
                                        customOptionEl: optionElementCon,
                                        value: originalSelect.options[j].value
                                    });
                                }
                            }
                        };

                        _eventDispatcher.on('sceneSelected', function (scene) {
                            customSelect.value = scene.sceneInstance.id;
                        });
                       

                        scenesColumn.appendChild(scenesColumnBody);
                        _scenesDropDownEl = selectDropDown;
                        return scenesColumn;
                    }

                    function getActiveScene() {
                        return _activeScene;
                    }

                    function getScenesList() {
                        return _scenesList;
                    }

                    function addWatermark(watermarkData) {
                        _watermark = watermarkData;
                        for(let s in _scenesList) {
                            _scenesList[s].sourcesInterface.addWatermark(watermarkData, _scenesList[s].scenesInterface);
                        }
                    }

                    function defineShortcuts() {
                        window.addEventListener('keyup', function (e) {
                            if (!(e instanceof KeyboardEvent)) {
                                return;
                            }
                            if ( this !== e.target && 
                                ( /textarea|select/i.test( e.target.nodeName ) ||
                                    e.target.type === "text" || e.target.type === "number" || e.target.type === "password" || e.target.type === "search" || e.target.type === "tel" || e.target.type === "url") ) {
                                return;
                            }

                            if(e.shiftKey) { //select layout by shift+1,2,3... combination
                                let mapping = {'!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9'}

                                if(mapping[e.key] && ['1', '2', '3', '4', '5', '6', '7', '8', '9'].indexOf(mapping[e.key]) != -1) {
                                    let layoutToActivate = _layoutsList[parseInt(mapping[e.key]) - 1];
                                    if(layoutToActivate) {
                                        _activeScene.sourcesInterface.selectLayout(layoutToActivate.key, true);
                                    }
                                }
                               
                            } else { //select scene by 1,2,3,4... keys
                                if(['1', '2', '3', '4', '5', '6', '7', '8', '9'].indexOf(e.key) != -1) {
                                    let sceneToActivate = _scenesList[parseInt(e.key) - 1];
                                    if(sceneToActivate) {
                                        selectScene(sceneToActivate);
                                    }
                                }
                            }
                            
                        });
                    }
                    defineShortcuts();


                    return {
                        createScenesCol: createScenesCol,
                        syncList: syncList,
                        getActive: getActiveScene,
                        getScenesList: getScenesList,
                        initHoveringTool: initHoveringTool,
                        addWatermark: addWatermark
                    }

                }())

                var SourcesInterface = function (sceneListItem) {
                    var _id = Date.now().toString(36) + Math.random().toString(36).replace(/\./g, "");
                    var _overlaySources = null;
                    var _scene = sceneListItem;
                    var _sourcesList = [];
                    var _audioList = [];
                    var _selectedSource = null;
                    var _selectedLayout = null;
                    var _layoutsListDropDownCon = null;
                    var _layoutsListSelect = null;
                    var _layoutsListCustomSelect = null;
                    var _autoSwitchToScreensharingLayoutAndBack = false;
                    var _participantsList = null;
                    var _webrtcListGroups = [];
                    var _sceneSourcesColumnEl = null;
                    var _sourcesListEl = null;
                    var _visualSourcesEl = null;
                    var _visualSourcesListEl = null;
                    var _sourceControlButtons = [];
                    let _addVisualSourceDropUpMenuEl = null;
                    var _audioSourcesListEl = null;
                    var _globalMicIconEl = null;
                    var _eventDispatcher = new Q.Media.WebRTC.EventSystem();

                    var _videoTool = null;
                    var _audioTool = null;
                    var _videoPopup = null;

                    function initVideoTool() {        
                        Q.activate(
                            Q.Tool.setUpElement(
                                'DIV',
                                "Media/webrtc/video",
                                {
                                    controlsTool: tool.state.controlsTool,
                                    webrtcUserInterface: tool.state.webrtcUserInterface
                                }
                            ),
                            {},
                            onVideoInputsListCreated
                        );
        
                        function onVideoInputsListCreated() {
                            _videoTool = this;
                            _videoTool.loadCamerasList();
                        }
                    }
                    initVideoTool();

                    function initAudioTool() {        
                        Q.activate(
                            Q.Tool.setUpElement(
                                'DIV',
                                "Media/webrtc/audio",
                                {
                                    controlsTool: tool.state.controlsTool,
                                    webrtcUserInterface: tool.state.webrtcUserInterface
                                }
                            ),
                            {},
                            onAudioListCreated
                        );
        
                        function onAudioListCreated() {
                            _audioTool = this;
                            _audioTool.loadAudioOutputList();
                            _audioTool.loadAudioInputList();
                        }
                    }
                    initAudioTool();

                    var ListItem = function (name) {
                        this.active = true;
                        this.title = name != null ? name : null;
                        this.itemEl = null;
                        this.visibilityEl = null;
                        this._sourceInstance = null;
                    }

                    var VisualListItem = function (source) {
                        var sourceInstance = this;
                        this.listType = 'visual';
                        this._sourceInstance = source;
                        this._title = source.title ? source.title : (source.name != null ? source.name : source.sourceType);
                        this.remove = function () {
                            var currentitem = this;
                            if(this.itemEl != null && this.itemEl.parentNode != null) this.itemEl.parentNode.removeChild(this.itemEl);
                            for(var i in _sourcesList) {
                                if(_sourcesList[i] == currentitem) {
                                    _sourcesList.splice(i, 1);
                                    break;
                                }
                            }
                        };
                        this.isActive = function() {
                            log('isActive', this)
                            var sources = _scene.sceneInstance.sources;
                            sources = sources.concat(_scene.sceneInstance.overlaySources)
                            log('isActive: sources', sources)

                            for(let s in sources) {

                                if(sources[s] == sourceInstance._sourceInstance) {
                                    log('isActive active')

                                    return true;
                                }
                            }
                            log('isActive inactive')

                            return false;
                        };
                        this.show = function() {
                            tool.canvasComposer.videoComposer.showSource(this.sourceInstance);

                            //this.sourceInstance.active = true;
                            this.switchVisibilityIcon(true);
                            syncList();
                        };
                        this.hide = function() {
                            tool.canvasComposer.videoComposer.hideSource(this.sourceInstance);
                            //this.sourceInstance.active = false;
                            this.switchVisibilityIcon(false);
                            syncList();
                        };
                        this.switchVisibilityIcon = function (visibility) {
                            if(visibility === true) {
                                this.visibilityEl.innerHTML = tool.icons.visible;
                            } else if (visibility === false) {
                                this.visibilityEl.innerHTML = tool.icons.hidden;
                            }
                        };
                        this.toggle = function() {
                            if(sourceInstance.sourceInstance.active == true) {
                                sourceInstance.hide();
                            } else {
                                sourceInstance.show();
                            }
                        };

                        this.unmute = function() {
                            log('mute')

                            sourceInstance.sourceInstance.audioSource.active = true;
                            if(this._sourceInstance.sourceType == 'webrtc' && this._sourceInstance.participant.isLocal) {
                                tool.webrtcSignalingLib.localMediaControls.enableAudio();
                            } else {
                                tool.canvasComposer.audioComposer.unmuteSource(this._sourceInstance, false);
                                this.switchAudioActivenessIcon(true);
                                syncList();
                            }
                            
                        };
                        this.mute = function() {
                            log('mute')
                            sourceInstance.sourceInstance.audioSource.active = true;
                            if(this._sourceInstance.sourceType == 'webrtc' && this._sourceInstance.participant.isLocal) {
                                tool.webrtcSignalingLib.localMediaControls.disableAudio();
                            } else {
                                tool.canvasComposer.audioComposer.muteSource(this._sourceInstance, false);
                                this.switchAudioActivenessIcon(false);
                            }
                            
                            syncList();
                        };
                        this.switchAudioActivenessIcon = function (activeness) {
                            if(activeness === true) {
                                this.audioActivnessEl.innerHTML = tool.icons.liveOn;
                            } else if (activeness === false) {
                                this.audioActivnessEl.innerHTML = tool.icons.liveOff;
                            }
                        };
                        this.toggleAudio = function() {
                            if(sourceInstance.sourceInstance.audioSource.active == true) {
                                sourceInstance.mute();
                            } else {
                                sourceInstance.unmute();
                            }
                        };
                        this.params = {
                            _loop: getOptions().liveStreaming.loopVideo,
                            _localOutput:getOptions().liveStreaming.localOutput,

                            set loop(value) {this._loop = value;},
                            set localOutput(value) {this._localOutput = value;},
                            get localOutput() {return typeof this._localOutput == 'object' ? this._localOutput.checked : this._localOutput;},
                            get loop() {return typeof this._loop == 'object' ? this._loop.checked : this._loop;}
                        };
                        this.hoverTimeout = {};

                        var itemEl = document.createElement('DIV');
                        itemEl.className = 'live-editor-sources-item';
                        var itemElText = document.createElement('DIV');
                        itemElText.innerHTML = this._title ? this._title : '';
                        itemElText.className = 'live-editor-sources-item-text';
                        var itemElControl = document.createElement('DIV');
                        itemElControl.className = 'live-editor-sources-item-control';

                        if (source.audioSource != null && !this._sourceInstance.participant.isLocal) {
                            var itemElControlAudioActivness = document.createElement('DIV');
                            itemElControlAudioActivness.className = 'live-editor-sources-item-control-item';
                            itemElControlAudioActivness.innerHTML = tool.icons.liveOn;
                            itemElControl.appendChild(itemElControlAudioActivness);
                            itemElControlAudioActivness.addEventListener('click', this.toggleAudio)
                        }
                        if (source.sourceType == 'webrtc' && source.participant.isLocal && !source.screenSharing) {
                            var itemElControlLocalControls = document.createElement('DIV');
                            itemElControlLocalControls.className = 'live-editor-sources-item-local-controls';
                            itemElControl.appendChild(itemElControlLocalControls);

                            if(!_webrtcUserInterface.getOptions().audioOnlyMode) {
                                var cameraBtnCon = document.createElement('DIV');
                                cameraBtnCon.className = 'live-editor-sources-item-control-item live-editor-sources-item-lc-camera';
                                var cameraBtn = document.createElement('DIV');
                                cameraBtn.className = 'live-editor-sources-item-lc-btn';
                                var cameraBtnIcon = document.createElement('DIV');
                                cameraBtnIcon.className = 'live-editor-sources-item-lc-icon';
                                cameraBtnIcon.innerHTML = _controlsToolIcons.camera;
                                cameraBtnCon.appendChild(cameraBtn);
                                cameraBtnCon.appendChild(cameraBtnIcon);
                                itemElControlLocalControls.appendChild(cameraBtnCon);

                                //if (!Q.info.useTouchEvents) {
                                    sourceInstance.videoSettingsPopup = new PopupDialog(cameraBtn, {
                                        className: 'live-editor-participants-item-camera-btn-popup',
                                        content: _videoTool.videoinputListEl
                                    })
                                //}

                                sourceInstance.cameraBtnIcon = cameraBtnIcon;
                            }
                            
                            var microphoneBtnCon = document.createElement('DIV');
                            microphoneBtnCon.className = 'live-editor-sources-item-control-item live-editor-sources-item-lc-mic';
                            var microphoneBtn = document.createElement('DIV');
                            microphoneBtn.className = 'live-editor-sources-item-lc-btn';
                            var microphoneBtnIcon = document.createElement('DIV');
                            microphoneBtnIcon.className = 'live-editor-sources-item-lc-icon';
                            microphoneBtnIcon.innerHTML = _controlsToolIcons.microphone;
                            //microphoneBtnIcon.innerHTML = tool.icons.sourcesEnabledMic;
                            microphoneBtnCon.appendChild(microphoneBtn);
                            microphoneBtnCon.appendChild(microphoneBtnIcon);
                            itemElControlLocalControls.appendChild(microphoneBtnCon);
                            //if (!Q.info.useTouchEvents) {
                                sourceInstance.audioSettingsPopup = new PopupDialog(microphoneBtn, {
                                    content: [_audioTool.audioOutputListEl, _audioTool.audioinputListEl]
                                })
                            //}
                            sourceInstance.microphoneBtnIcon = microphoneBtnIcon;
                                            
                        }

                        if (source.sourceType == 'video') {
                            var mediaElement = source.sourceType == 'video' ? source.videoInstance : source.audioInstance;
                            var playPauseButton = document.createElement('DIV');
                            playPauseButton.className = 'live-editor-sources-item-control-item live-editor-sources-item-playpause';
                            playPauseButton.innerHTML = mediaElement.paused ? tool.icons.playIcon : tool.icons.pauseIcon;
                            itemElControl.appendChild(playPauseButton);

                            playPauseButton.addEventListener("click", function(e){
                                if(mediaElement.paused){
                                    mediaElement.play();
                                } else {
                                    mediaElement.pause();
                                }
                            });

                            mediaElement.addEventListener('play', function () {
                                playPauseButton.innerHTML = tool.icons.pauseIcon;
                            });

                            mediaElement.addEventListener('pause', function () {
                                playPauseButton.innerHTML = tool.icons.playIcon;
                            });
                            
                        }
                    
                        var itemElControlVisibility = document.createElement('DIV');
                        itemElControlVisibility.className = 'live-editor-sources-item-control-item live-editor-sources-item-visibility';
                        itemElControlVisibility.innerHTML = tool.icons.visible;
                        itemElControl.appendChild(itemElControlVisibility);

                        itemEl.appendChild(itemElText);
                        itemEl.appendChild(itemElControl);
                        this.visibilityEl = itemElControlVisibility;
                        this.audioActivnessEl = itemElControlAudioActivness;
                        this.itemEl = itemEl;
                        this.titleEl = itemElText;
                        this.itemEl.addEventListener('click', function () {
                            log('sourceInstance.sourceInstance', sourceInstance.sourceInstance.sourceType);
                            selectSource(sourceInstance);

                            //optionsColumn.update();
                        })

                        this.itemEl.addEventListener('contextmenu', function (e) {
                            /*e.preventDefault();
                            selectSource(sourceInstance);
                            optionsColumn.update();
                            contextMenu('visualSource').show(e);*/
                        })
                        
                        itemElControlVisibility.addEventListener('click', this.toggle)
                    }

                    VisualListItem.prototype = new ListItem();

                    Object.defineProperties(VisualListItem.prototype, {
                        'sourceInstance': {
                            'get': function() { 
                                return this._sourceInstance;
                            }
                        }
                    });
                    Object.defineProperties(VisualListItem.prototype, {
                        'title': {
                            'set': function(val) { if(this.titleEl) this.titleEl.innerHTML = val; }
                        }
                    });

                    var AudioListItem = function (source) {
                        var sourceInstance = this;
                        this.listType = 'audio';
                        this._sourceInstance = source;
                        this._title = source.title ? source.title : (source.name != null ? source.name : source.sourceType);
                        this.remove = function () {
                            var currentitem = this;
                            if(this.itemEl != null && this.itemEl.parentNode != null) this.itemEl.parentNode.removeChild(this.itemEl);
                            for(var i in _sourcesList) {
                                if(_sourcesList[i] == currentitem) {
                                    _sourcesList.splice(i, 1);
                                    break;
                                }
                            }
                        };
                        this.isActive = function() {
                            log('isActive', this)
                            var currentitem = this;
                            var sources = _scene.sceneInstance.sources;
                            log('isActive active', sources)

                            for(let s in sources) {
                                log('isActive for', sources[s], currentitem._sourceInstance)

                                if(sources[s] == currentitem._sourceInstance) {
                                    log('isActive active')

                                    return true;
                                }
                            }
                            log('isActive inactive')

                            return false;
                        };
                        this.unmute = function() {
                            log('mute')

                            this._sourceInstance.active = true;
                            if(this._sourceInstance.sourceType == 'webrtcaudio' && this._sourceInstance.participant.isLocal) {
                                log('mute turn mic on')
                                tool.webrtcSignalingLib.localMediaControls.enableAudio();
                            } else {
                                tool.canvasComposer.audioComposer.unmuteSource(this._sourceInstance, this._sourceInstance.sourceType == 'audio' ? true : false);
                                this.switchAudioActivenessIcon(true);
                                syncList();
                            }
                            
                        };
                        this.mute = function() {
                            log('mute')
                            this._sourceInstance.active = false;
                            if(this._sourceInstance.sourceType == 'webrtcaudio' && this._sourceInstance.participant.isLocal) {
                                log('mute turn mic off')
                                tool.webrtcSignalingLib.localMediaControls.disableAudio();
                            } else {
                                tool.canvasComposer.audioComposer.muteSource(this._sourceInstance, this._sourceInstance.sourceType == 'audio' ? true : false);
                                this.switchAudioActivenessIcon(false);
                            }
                            
                            syncList();
                        };
                        this.switchAudioActivenessIcon = function (activeness) {
                            if(activeness === true) {
                                this.audioActivnessEl.innerHTML = tool.icons.enabledSpeaker;
                            } else if (activeness === false) {
                                this.audioActivnessEl.innerHTML = tool.icons.disabledSpeaker;
                            }
                        };
                        this.toggleAudio = function() {
                            if(sourceInstance._sourceInstance.active == true) {
                                sourceInstance.mute();
                            } else {
                                sourceInstance.unmute();
                            }
                        };
                        this.params = {
                            _loop: getOptions().liveStreaming.loopAudio,
                            _localOutput: getOptions().liveStreaming.localOutput,

                            set loop(value) {this._loop = value;},
                            set localOutput(value) {this._localOutput = value;},
                            get localOutput() {return typeof this._localOutput == 'object' ? this._localOutput.checked : this._localOutput;},
                            get loop() {return typeof this._loop == 'object' ? this._loop.checked : this._loop;}
                        };
                    
                        var itemEl = document.createElement('DIV');
                        itemEl.className = 'live-editor-sources-item';
                        var itemElText = document.createElement('DIV');
                        itemElText.innerHTML = this._title ? this._title : '';
                        itemElText.className = 'live-editor-sources-item-text';
                        itemEl.appendChild(itemElText);
                        var itemElControl = document.createElement('DIV');
                        itemElControl.className = 'live-editor-sources-item-control';
                        itemEl.appendChild(itemElControl);
                        
                        if (source.sourceType == 'audio') {
                            var mediaElement = source.sourceType == 'video' ? source.videoInstance : source.audioInstance;
                            var playPauseButton = document.createElement('DIV');
                            playPauseButton.className = 'live-editor-sources-item-control-item live-editor-sources-item-playpause';
                            playPauseButton.innerHTML = mediaElement.paused ? tool.icons.playIcon : tool.icons.pauseIcon;
                            itemElControl.appendChild(playPauseButton);

                            playPauseButton.addEventListener("click", function(e){
                                if(mediaElement.paused){
                                    mediaElement.play();
                                } else {
                                    mediaElement.pause();
                                }
                            });

                            mediaElement.addEventListener('play', function () {
                                playPauseButton.innerHTML = tool.icons.pauseIcon;
                            });

                            mediaElement.addEventListener('pause', function () {
                                playPauseButton.innerHTML = tool.icons.playIcon;
                            });
                            
                        }

                        var itemElAudioActiveness = document.createElement('DIV');
                        itemElAudioActiveness.className = 'live-editor-sources-item-visibility';
                        itemElAudioActiveness.innerHTML = tool.icons.liveOn;
                        itemElControl.appendChild(itemElAudioActiveness);
                        
                        
                        
                        this.audioActivnessEl = itemElAudioActiveness;
                        this.itemEl = itemEl;
                        this.titleEl = itemElText;
                        this.itemEl.addEventListener('click', function () {
                            log('sourceInstance.sourceInstance', sourceInstance.sourceInstance.sourceType);
                            selectSource(sourceInstance);

                            //optionsColumn.update();
                        })
                        itemElAudioActiveness.addEventListener('click', this.toggleAudio)

                        this._sourceInstance.on('nameChanged', function (newName) {
                            log('nameChanged set', this._sourceInstance)

                            sourceInstance.title = newName;
                        })
                    }

                    AudioListItem.prototype = new ListItem();

                    Object.defineProperties(AudioListItem.prototype, {
                        'sourceInstance': {
                            'get': function() { 
                                return this._sourceInstance;
                            }
                        }
                    });
                    Object.defineProperties(AudioListItem.prototype, {
                        'title': {
                            'set': function(val) { if(this.titleEl) this.titleEl.innerHTML = val; }
                        }
                    });

                    function ParticipantsList(webrtcGroupSource){
                        var _participantsList = [];
                        var _participantsContainerEl = null;
                        var _participantsListEl = null;
                        var _allParticipantsItemEl = null;
                        var _allParticipantsListInstance = {
                            listItemEl: null,
                            listType: 'allParticipants',
                            _sourceInstance: webrtcGroupSource,
                            get sourceInstance() {return this._sourceInstance;},
                            isActive: function () {
                                log('ParticipantsList: isActive', this)
                                let listInstance = this;
                                var sources = _scene.sceneInstance.sources;
                                log('ParticipantsList: isActive: sources', sources)

                                for (let s in sources) {

                                    if (sources[s] == listInstance.sourceInstance) {
                                        log('ParticipantsList: isActive active')
                                        return true;
                                    }
                                }
                                log('ParticipantsList: isActive inactive')

                                return false;
                            }
                            
                        };
                        var sourceResizingEl = _allParticipantsListInstance.resizingElement = document.createElement('DIV');
                        sourceResizingEl.className = 'live-editor-canvas-preview-resizing';
                        //activeDialog.previewBoxEl.appendChild(sourceResizingEl);

                        Q.activate(
                            Q.Tool.setUpElement(
                                sourceResizingEl,
                                "Q/resize",
                                {
                                    move: true,
                                    resize: true,
                                    active: true,
                                    resizeByWheel: false,
                                    //elementPosition: 'fixed',
                                    showResizeHandles: true,
                                    moveWithinArea: 'parent',
                                    allowOverresizing: true,
                                    negativeMoving: true,
                                    onMoving: function () {

                                    }
                                }
                            ),
                            {},
                            function () {
                                _allParticipantsListInstance.resizingElementTool = this;
                            }
                        );

                        _participantsContainerEl = document.createElement('DIV');
                        _participantsContainerEl.className = 'live-editor-participants-list-con';

                        _allParticipantsListInstance.itemEl = _participantsContainerEl;

                        let participantTitleCon = _allParticipantsItemEl = document.createElement('DIV');
                        participantTitleCon.className = 'live-editor-participants-list-title-con';
                        _participantsContainerEl.appendChild(participantTitleCon);

                        participantTitleCon.addEventListener('click', function(){
                            selectSource(_allParticipantsListInstance);
                        });

                        let participantTitle = document.createElement('DIV');
                        participantTitle.className = 'live-editor-participants-list-title';
                        participantTitle.innerHTML = 'Participants:';
                        participantTitleCon.appendChild(participantTitle);

                        _participantsListEl = document.createElement('DIV');
                        _participantsListEl.className = 'live-editor-participants-list';
                        _participantsContainerEl.appendChild(_participantsListEl);

                        if (tool.webrtcUserInterface.roomStream().testAdminLevel('manage')) {
                        
                            let waitingRooms = document.createElement('DIV');
                            waitingRooms.className = 'live-editor-participants-waiting';
                            _participantsContainerEl.appendChild(waitingRooms);

                            Q.activate(
                                Q.Tool.setUpElement(waitingRooms, 'Media/webrtc/waitingRoomList', {
                                    webrtcUserInterface: tool.state.webrtcUserInterface,
                                }),
                                {},
                                function () {

                                }
                            );
                        }                      

                        declareOrRefreshEventHandlers();
                        refreshList();
                        updateLocalControlsButtonsState();

                        function declareOrRefreshEventHandlers() {
                            var webrtcSignalingLib = tool.webrtcSignalingLib;

                            tool.eventDispatcher.on('beforeSwitchRoom', function (e) {
                                declareOrRefreshEventHandlers();
                            });

                            webrtcSignalingLib.event.on('participantConnected', function (participant) {
                                log('ParticipantsList: participantConnected', webrtcSignalingLib.id, participant);
                                addParticipantItem(participant);
                            });
                            webrtcSignalingLib.event.on('participantDisconnected', function (participant) {
                                log('ParticipantsList: participantDisconnected', webrtcSignalingLib.id, participant);
                                removeParticipantItem(participant);
                            });
                            webrtcSignalingLib.event.on('participantRemoved', function (participant) {
                                log('ParticipantsList: participantRemoved', webrtcSignalingLib.id, participant);
                                removeParticipantItem(participant);
                            });
                            webrtcSignalingLib.event.on('trackAdded', function (e) {
                                log('ParticipantsList: trackAdded');
                                updateParticipantItem(e.participant);
                            });
                            webrtcSignalingLib.event.on('trackMuted', function (e) {
                                log('ParticipantsList: trackMuted');
                                updateParticipantItem(e.participant);
                            });
                            webrtcSignalingLib.event.on('audioMuted', function (participant) {
                                log('ParticipantsList: audioMuted');
                                updateParticipantItem(participant);
                            });
                            webrtcSignalingLib.event.on('audioUnmuted', function (participant) {
                                log('ParticipantsList: audioUnmuted');
                                updateParticipantItem(participant);
                            });
                            webrtcSignalingLib.event.on('cameraEnabled', function () {;
                                log('ParticipantsList: cameraEnabled');
                                updateParticipantItem(webrtcSignalingLib.localParticipant());
                                updateLocalControlsButtonsState();
                            });
                            webrtcSignalingLib.event.on('cameraDisabled', function () {
                                log('ParticipantsList: cameraDisabled');
                                updateParticipantItem(webrtcSignalingLib.localParticipant());
                                updateLocalControlsButtonsState();
                            });
                            webrtcSignalingLib.event.on('micEnabled', function () {;
                                log('ParticipantsList: micEnabled');
                                updateParticipantItem(webrtcSignalingLib.localParticipant());
                                updateLocalControlsButtonsState();
                            });
                            webrtcSignalingLib.event.on('micDisabled', function () {
                                log('ParticipantsList: micDisabled');
                                updateParticipantItem(webrtcSignalingLib.localParticipant());
                                updateLocalControlsButtonsState();
                            });

                            _scene.sceneInstance.eventDispatcher.on('webrtcLayoutUpdated', function (source) {
                                for(let i in _participantsList) {
                                    updateParticipantItem(_participantsList[i]);
                                }

                                updateSourceControlPanelButtons();
                            })

                            _scene.sceneInstance.eventDispatcher.on('webrtcLayoutUpdated', function (source) {
                                for(let i in _participantsList) {
                                    updateParticipantItem(_participantsList[i]);
                                }

                                updateSourceControlPanelButtons();
                                
                            })

                            _scene.sceneInstance.eventDispatcher.on('sourceShowed', function (source) {
                                if(source.sourceType == 'group' && source.groupType == 'webrtc') {
                                    //lockOrUnlockParticipantsGroup();
                                }
                            })
    
                        }

                        function refreshList() {
                            log('ParticipantsList: refreshList');
                            if (_participantsListEl) _participantsListEl.innerHTML = '';
                            _participantsList = [];
            
                            let roomParticipants = tool.webrtcSignalingLib.roomParticipants()
                            addParticipantItem(tool.webrtcSignalingLib.localParticipant());
                            for (var i in roomParticipants) {
                                if (roomParticipants[i].isLocal) continue;
                                addParticipantItem(roomParticipants[i]);
                            }
                        }

                        function addParticipantItem(participantInstance) {
                            log('ParticipantsList: addParticipantItem', participantInstance);
                            function ListItem(participantInstance) {
                                let listItemInstance = this;
                                this.participantInstance = participantInstance;
                                this.participantSources = [];
                                this.listType = 'mainParticipantVideo';
                                this.itemEl = null;
                                this.visibilityIconEl = null;
                                this.videoIconEl = null;
                                this.audioIconEl = null;
                                this.screenIconEl = null;
                                this.sourcesContainerEl = null;
                                this.show = function () {
                                    for(let s in listItemInstance.participantSources) {
                                        if(listItemInstance.participantSources[s].sourceInstance.screenSharing) continue;
                                        tool.canvasComposer.videoComposer.showSource(listItemInstance.participantSources[s].sourceInstance);
                                        listItemInstance.switchVisibilityIcon(true);
                                        break;
                                    }
                                };
                                this.hide = function () {
                                    for(let s in listItemInstance.participantSources) {
                                        if(listItemInstance.participantSources[s].sourceInstance.screenSharing) continue;
                                        tool.canvasComposer.videoComposer.hideSource(listItemInstance.participantSources[s].sourceInstance);
                                        listItemInstance.switchVisibilityIcon(false);
                                        break;
                                    }
                                };
                                this.switchVisibilityIcon = function (visibility) {
                                    if (visibility === true) {
                                        this.visibilityIconEl.innerHTML = tool.icons.visible;
                                    } else if (visibility === false) {
                                        this.visibilityIconEl.innerHTML = tool.icons.hidden;
                                    }
                                };
                                this.toggleVisibility = function () {
                                    for (let s in listItemInstance.participantSources) {
                                        if (listItemInstance.participantSources[s].sourceInstance.screenSharing) continue;
                                        let sourceInstance = listItemInstance.participantSources[s].sourceInstance;

                                        if (sourceInstance.active == true) {
                                            listItemInstance.hide();
                                        } else {
                                            listItemInstance.show();
                                        }
                                        break;
                                    }
                                };
                                this.toggleScreensharing = function() {
                                    let screensharingSources = listItemInstance.participantSources.filter(function(s){
                                        return s.sourceInstance.screenSharing ? true : false;
                                    });

                                    if(screensharingSources.length > 1) {
                                        listItemInstance.screenIconEl.innerHTML = tool.icons.participantsEnabledScreenSource;
                                        return;
                                    } else if(screensharingSources.length == 1){
                                        screensharingSources[0].toggleVisibility();

                                        log('toggleScreensharing', screensharingSources[0].sourceInstance.active)
                                        if(screensharingSources[0].sourceInstance.active) {
                                            listItemInstance.screenIconEl.innerHTML = tool.icons.participantsEnabledScreenSource;
                                        } else {
                                            listItemInstance.screenIconEl.innerHTML = tool.icons.participantsDisabledScreenSource;
                                        }
                                    }
                                };
                                this.toggleAudio = function () {         
                                    if (!listItemInstance.participantInstance.audioIsMuted) {
                                        listItemInstance.muteAudio();
                                    } else {
                                        listItemInstance.unmuteAudio();
                                    }
                                };
                                this.muteAudio = function () {
                                    if (this.participantInstance.audioIsMuted == true) return;
                                    this.participantInstance.muteAudio();
                                    this.audioIconEl.innerHTML = tool.icons.participantsDisabledMic;
                                };
                                this.unmuteAudio = function () {
                                    if (this.participantInstance.audioIsMuted == false) return;
                                    this.participantInstance.unmuteAudio();
                                    this.audioIconEl.innerHTML = tool.icons.participantsEnabledMic;
                                };
                                this.remove = function () {
                                    log('ParticipantsList: ListItem: remove');

                                    if (this.itemEl.parentNode != null) this.itemEl.parentNode.removeChild(this.itemEl);
                                    for(let e = _participantsList.length - 1; e >= 0; e--) {
                                        if(_participantsList[e].participantInstance == this) {
                                            _participantsList.splice(e, 1);
                                            break;
                                        }
                                    }
            
                                };
                                Object.defineProperty(this, "sourceInstance", {
                                    get() {
                                      for(let i in this.participantSources) {
                                        if(!this.participantSources[i].sourceInstance.screenSharing) {
                                            return this.participantSources[i].sourceInstance;
                                        }
                                      }
                                    }
                                  });
                            }
                            var userId = participantInstance.identity != null ? participantInstance.identity.split('\t')[0] : Q.Users.loggedInUser.id;
                            
                            let listItemInstance = new ListItem(participantInstance);

                            let participantItemContainer = document.createElement('DIV');
                            participantItemContainer.className = 'live-editor-participants-item-con';
                            let participantItemInnerCon = document.createElement('DIV');
                            participantItemInnerCon.className = 'live-editor-participants-item-inner';
                            participantItemContainer.appendChild(participantItemInnerCon);
                            let participantItemAvatar = document.createElement('DIV');
                            participantItemAvatar.className = 'live-editor-participants-item-avatar';
                            participantItemInnerCon.appendChild(participantItemAvatar);

                            let participantItemAvatarTool = document.createElement('DIV');
                            participantItemAvatarTool.className = 'live-editor-participants-item-avatar-tool';
                            participantItemAvatar.appendChild(participantItemAvatarTool);

                            Q.activate(
                                Q.Tool.setUpElement(
                                    participantItemAvatarTool, // or pass an existing element
                                    "Users/avatar",
                                    {
                                        userId: userId,
                                        contents: false
                                    }
                                )
                            );


                            let participantItemAvatarText = document.createElement('DIV');
                            participantItemAvatarText.className = 'live-editor-participants-item-avatar-texttool';
                            
                            participantItemAvatar.appendChild(participantItemAvatarText);
                            Q.activate(
                                Q.Tool.setUpElement(
                                    participantItemAvatarText, // or pass an existing element
                                    "Users/avatar",
                                    {
                                        userId: userId,
                                        icon: false
                                    }
                                )
                            );

                            let participantItemControls = document.createElement('DIV');
                            participantItemControls.className = 'live-editor-participants-item-controls';
                            participantItemInnerCon.appendChild(participantItemControls);


                            let configBtnCon = document.createElement('DIV');
                            configBtnCon.className = 'live-editor-participants-item-btn live-editor-participants-item-config-btn';
                            participantItemControls.appendChild(configBtnCon);
                            let configBtnIcon = document.createElement('DIV');
                            configBtnIcon.className = 'live-editor-participants-item-icon live-editor-participants-item-config-icon';
                            configBtnIcon.innerHTML = tool.icons.settings;
                            configBtnCon.appendChild(configBtnIcon);

                            configBtnCon.addEventListener('click', function () {
                                let settingsDialogEl = optionsColumn.getSettingsDialog();
                                showSpecificControls(settingsDialogEl);
                            })

                            let audioBtnCon = document.createElement('DIV');
                            audioBtnCon.className = 'live-editor-participants-item-btn live-editor-participants-item-audio-btn';
                            participantItemControls.appendChild(audioBtnCon);
                            let audioBtnIcon = document.createElement('DIV');
                            audioBtnIcon.className = 'live-editor-participants-item-icon live-editor-participants-item-audio-icon';
                            audioBtnIcon.innerHTML = tool.icons.participantsDisabledMic;
                            audioBtnCon.appendChild(audioBtnIcon);

                            if (participantInstance.isLocal /*&& !Q.info.useTouchEvents*/) {
                                /*listItemInstance.audioSettingsPopup = new PopupDialog(audioBtnCon, {
                                    content: [_audioTool.audioOutputListEl, _audioTool.audioinputListEl]
                                })*/

                                Q.activate(
                                    Q.Tool.setUpElement(
                                        audioBtnCon,
                                        "Media/webrtc/popupDialog",
                                        {
                                            content: [_audioTool.audioOutputListEl, _audioTool.audioinputListEl]
                                        }
                                    ),
                                    {},
                                    function () {
                                        listItemInstance.audioSettingsPopup = this;
                                    }
                                );
                            } else if (!participantInstance.isLocal) {
                                audioBtnCon.addEventListener('click', listItemInstance.toggleAudio);
                            }
                            
                            if(participantInstance.isLocal) {
                                let videoBtnCon = document.createElement('DIV');
                                videoBtnCon.className = 'live-editor-participants-item-btn live-editor-participants-item-camera-btn';
                                participantItemControls.appendChild(videoBtnCon);
                                let videoBtnIcon = document.createElement('DIV');
                                videoBtnIcon.className = 'live-editor-participants-item-icon live-editor-participants-item-camera-icon';
                                videoBtnIcon.innerHTML = tool.icons.participantsDisabledCamera;
                                videoBtnCon.appendChild(videoBtnIcon);
                                listItemInstance.videoIconEl = videoBtnIcon;

                                //if (!Q.info.useTouchEvents) {
                                    /*listItemInstance.videoSettingsPopup = new PopupDialog(videoBtnCon, {
                                        className: 'live-editor-participants-item-camera-btn-popup',
                                        content: _videoTool.videoinputListEl
                                    })*/

                                    Q.activate(
                                        Q.Tool.setUpElement(
                                            videoBtnCon,
                                            "Media/webrtc/popupDialog",
                                            {
                                                content: _videoTool.videoinputListEl,
                                                className: 'live-editor-participants-item-camera-btn-popup'
                                            }
                                        ),
                                        {},
                                        function () {
                                            listItemInstance.videoSettingsPopup = this;
                                        }
                                    );
                                //}
                            }
                            
                            let screenBtnCon = document.createElement('DIV');
                            screenBtnCon.className = 'live-editor-participants-item-btn live-editor-participants-item-screen-btn';
                            if(!(participantInstance.isLocal && Q.info.isMobile)) participantItemControls.appendChild(screenBtnCon);
                            let screenBtnIcon = document.createElement('DIV');
                            screenBtnIcon.className = 'live-editor-participants-item-icon live-editor-participants-item-screen-icon';
                            screenBtnIcon.innerHTML = tool.icons.participantsEnabledScreenSource;
                            screenBtnCon.appendChild(screenBtnIcon);
                            let participantSourcesCon = document.createElement('DIV');
                            participantSourcesCon.className = 'live-editor-participants-item-sources';
                            screenBtnIcon.addEventListener('click', listItemInstance.toggleScreensharing);

                            let visibilityBtnCon = document.createElement('DIV');
                            visibilityBtnCon.className = 'live-editor-participants-item-btn live-editor-participants-item-visibility-btn';
                            participantItemControls.appendChild(visibilityBtnCon);
                            let visibilityBtnIcon = document.createElement('DIV');
                            visibilityBtnIcon.className = 'live-editor-participants-item-icon live-editor-participants-item-visibility-icon';
                            visibilityBtnIcon.innerHTML = tool.icons.visible;
                            visibilityBtnCon.appendChild(visibilityBtnIcon);

                            _participantsListEl.appendChild(participantItemContainer);
                
                            listItemInstance.itemEl = participantItemContainer;
                            listItemInstance.visibilityIconEl = visibilityBtnIcon;
                            listItemInstance.audioIconEl = audioBtnIcon;
                            listItemInstance.sourcesContainerEl = participantSourcesCon;
                            listItemInstance.screenIconEl = screenBtnIcon;
                            if(participantInstance.isLocal) {
                                _participantsList.unshift(listItemInstance);
                            } else {
                                _participantsList.push(listItemInstance);
                            }

                            visibilityBtnCon.addEventListener('click', function(){
                                let sourceInstance = _allParticipantsListInstance.sourceInstance;
                                if(sourceInstance != null) {
                                    log('visibilityBtnCon change 1.1');
                                    listItemInstance.toggleVisibility();                                
                                } else {
                                    log('visibilityBtnCon change 1.2');
                                    addTeleconferenceSource();
                                    listItemInstance.toggleVisibility();
                                }
                            });

                            participantItemContainer.addEventListener('click', function(){
                                selectSource(listItemInstance);
                            });

                            if (participantInstance.isLocal) {
                                /*listItemInstance.screensharingsPopup = new PopupDialog(listItemInstance.screenIconEl.parentElement, {
                                    className: 'live-editor-participants-item-screen-btn-popup',
                                    content: [listItemInstance.sourcesContainerEl, _videoTool.videoinputListEl]
                                })*/

                                Q.activate(
                                    Q.Tool.setUpElement(
                                        listItemInstance.screenIconEl.parentElement,
                                        "Media/webrtc/popupDialog",
                                        {
                                            content: [listItemInstance.sourcesContainerEl, _videoTool.videoinputListEl],
                                            className: 'live-editor-participants-item-screen-btn-popup'
                                        }
                                    ),
                                    {},
                                    function () {
                                        listItemInstance.screensharingsPopup = this;
                                    }
                                );
                            }

                            var sourceResizingEl = listItemInstance.resizingElement = document.createElement('DIV');
                            sourceResizingEl.className = 'live-editor-canvas-preview-resizing';
                            //activeDialog.previewBoxEl.appendChild(sourceResizingEl);
                            
                            Q.activate(
                                Q.Tool.setUpElement(
                                    sourceResizingEl,
                                    "Q/resize",
                                    {
                                        move: false,
                                        resize: false,
                                        active: true,
                                        showResizeHandles: false,
                                    }
                                ),
                                {},
                                function () {
                                    listItemInstance.resizingElementTool = this;
                                }
                            );

                            updateParticipantItem(participantInstance);
                        }

                        function removeParticipantItem(participant) {
                            log('ParticipantsList: removeParticipantItem', participant);
                            log('ParticipantsList: removeParticipantItem: _participantsList', _participantsList);
                            var item = _participantsList.filter(function (listItem) {
                                log('listItem', listItem.participantInstance)
                                return listItem.participantInstance == participant;
                            })[0];
                            log('ParticipantsList: removeParticipantItem: item', item);

                            if (item != null) item.remove();
                        }


                        function updateParticipantItem(participantOrListItem) {
                            function AdditionalListItem(sourceInstance) {
                                var _listItemContext = this;
                                this.sourceInstance = sourceInstance;
                                this.sourceEl = null;
                                this.visibilityIconEl = null;
                                this.listType = 'additionalParticipantVideo';
                                this.show = function () {
                                    tool.canvasComposer.videoComposer.showSource(_listItemContext.sourceInstance);
                                    _listItemContext.switchVisibilityIcon(true);
                                };
                                this.hide = function () {
                                    tool.canvasComposer.videoComposer.hideSource(_listItemContext.sourceInstance);
                                    _listItemContext.switchVisibilityIcon(false);
                                };
                                this.switchVisibilityIcon = function (visibility) {
                                    if (visibility === true) {
                                        this.visibilityIconEl.innerHTML = tool.icons.visible;
                                    } else if (visibility === false) {
                                        this.visibilityIconEl.innerHTML = tool.icons.hidden;
                                    }
                                };
                                this.toggleVisibility = function () {
                                    if (_listItemContext.sourceInstance.active == true) {
                                        _listItemContext.hide();
                                    } else {
                                        _listItemContext.show();
                                    }
                                };
                            }
                            //log('ParticipantsList: updateParticipantItem');
                            var item;
                            if(participantOrListItem.constructor.name == 'ListItem') {
                                item = participantOrListItem;
                            } else {
                                item = _participantsList.filter(function (listItem) {
                                    return listItem.participantInstance.sid == participantOrListItem.sid;
                                })[0];
                            }

                            if(!item) return;
                            
                            var participant = item.participantInstance;
                            var webrtcSources = _allParticipantsListInstance.sourceInstance.getChildSources('webrtc');

                            //remove inactive source
                            for(let i = item.participantSources.length - 1; i >= 0; i--) {
                                let sourceIsRemoved = true;
                                for (let c in webrtcSources) {
                                    if(item.participantSources[i].sourceInstance == webrtcSources[c]) {
                                        sourceIsRemoved = false;
                                        break;
                                    }
                                }
                                if(sourceIsRemoved) {
                                    if(item.participantSources[i].sourceEl != null && item.participantSources[i].sourceEl.parentElement != null) {
                                        item.participantSources[i].sourceEl.parentElement.removeChild(item.participantSources[i].sourceEl);
                                    }
                                    item.participantSources.splice(i, 1);
                                }
                            }

                            let numberOfScreensharings = 0;
                            //add new source to sources list under participant
                            for (let i in webrtcSources) {
                                if(webrtcSources[i].participant == participant && webrtcSources[i].screenSharing) {
                                    let sourceExists = item.participantSources.filter(function (source) {
                                        return source.sourceInstance == webrtcSources[i];
                                    })[0];

                                    numberOfScreensharings++;
                                    
                                    if(sourceExists) continue;

                                    let screensharingSourceCon = document.createElement('DIV');
                                    screensharingSourceCon.className = 'live-editor-participants-list-source';
                                    screensharingSourceCon.dataset.sourceId = webrtcSources[i].id;

                                    let sourceDescription = document.createElement('DIV');
                                    sourceDescription.className = 'live-editor-participants-list-source-desc';
                                    screensharingSourceCon.appendChild(sourceDescription);

                                    let sourceDescriptionIcon = document.createElement('DIV');
                                    sourceDescriptionIcon.className = 'live-editor-participants-list-source-icon';
                                    sourceDescriptionIcon.innerHTML = tool.icons.participantsEnabledScreenSource;
                                    sourceDescription.appendChild(sourceDescriptionIcon);

                                    let sourceDescriptionText = document.createElement('DIV');
                                    sourceDescriptionText.className = 'live-editor-participants-list-source-text';
                                    sourceDescriptionText.innerHTML = 'Screen';
                                    sourceDescription.appendChild(sourceDescriptionText);

                                    let sourceVisibilityIcon = document.createElement('DIV');
                                    sourceVisibilityIcon.className = 'live-editor-participants-list-source-visibility';
                                    sourceVisibilityIcon.innerHTML = tool.icons.visible;
                                    screensharingSourceCon.appendChild(sourceVisibilityIcon);

                                    item.sourcesContainerEl.appendChild(screensharingSourceCon);

                                    let listInstance = new AdditionalListItem(webrtcSources[i]);
                                    listInstance.sourceEl = screensharingSourceCon;
                                    listInstance.visibilityIconEl = sourceVisibilityIcon;
                                    item.participantSources.push(listInstance);

                                    sourceVisibilityIcon.addEventListener('click', listInstance.toggleVisibility);

                                } else if(webrtcSources[i].participant == participant) {
                                    let sourceExists = item.participantSources.filter(function (source) {
                                        return source.sourceInstance == webrtcSources[i];
                                    })[0];
                                    
                                    if(sourceExists) continue;

                                    let listInstance = new AdditionalListItem(webrtcSources[i]);
                                    item.participantSources.push(listInstance);
                                }
                            }

                            if(item.sourceInstance != null) {
                                //log('ParticipantsList: updateParticipantItem: switchVisibilityIcon 1');
                                if(item.sourceInstance.active) {
                                    //log('ParticipantsList: updateParticipantItem: switchVisibilityIcon 1.1');
                                    item.switchVisibilityIcon(true);
                                } else {
                                    //log('ParticipantsList: updateParticipantItem: switchVisibilityIcon 1.2');
                                    item.switchVisibilityIcon(false);
                                }
                            } else {
                                //log('ParticipantsList: updateParticipantItem: switchVisibilityIcon 2');

                                item.switchVisibilityIcon(false);
                            }

                            if(!item.participantInstance.isLocal) {
                                if (!item.screensharingsPopup) {
                                    //log('make screensharingsPopup 2', numberOfScreensharings);
                                    if (numberOfScreensharings > 1) {
                                        //log('make screensharingsPopup 3');

                                        /*item.screensharingsPopup = new PopupDialog(item.screenIconEl.parentElement, {
                                            className: 'live-editor-participants-item-screen-btn-popup',
                                            content: item.sourcesContainerEl
                                        })*/
                                        Q.activate(
                                            Q.Tool.setUpElement(
                                                item.screenIconEl.parentElement,
                                                "Media/webrtc/popupDialog",
                                                {
                                                    className: 'live-editor-participants-item-screen-btn-popup',
                                                    content: item.sourcesContainerEl
                                                }
                                            ),
                                            {},
                                            function () {
                                                item.screensharingsPopup = this;
                                            }
                                        );
                                    }
                                } else if (item.screensharingsPopup) {
                                    if (numberOfScreensharings < 2) {
                                        item.screensharingsPopup.destroy();
                                    }
                                }

                                if(item.sourcesContainerEl.childNodes.length == 0) {
                                    item.screenIconEl.parentElement.style.display = 'none';
                                    /*let noScreensharingTextCon = document.createElement('DIV');
                                    noScreensharingTextCon.className = 'live-editor-participants-list-no-screensharing';
                                    noScreensharingTextCon.innerHTML = 'No screensharings';
                                    item.sourcesContainerEl.appendChild(noScreensharingTextCon);*/
                                } else {
                                    item.screenIconEl.parentElement.style.display = '';
                                    /*let noScreensharingTextCon =  item.sourcesContainerEl.querySelector('.live-editor-participants-list-no-screensharing');
                                    if(noScreensharingTextCon && noScreensharingTextCon.parentElement) noScreensharingTextCon.parentElement.removeChild(noScreensharingTextCon);*/
                                }

                                if(!item.participantInstance.audioIsMuted) {
                                    item.audioIconEl.innerHTML = tool.icons.participantsEnabledMic;
                                } else {
                                    item.audioIconEl.innerHTML = tool.icons.participantsDisabledMic;
                                }
                            }
                            
                        }

                        function updateLocalControlsButtonsState() {
                            //log('updateLocalControlsButtonsState');
    
                            for(let i in _participantsList) {
                                if (!_participantsList[i].participantInstance.isLocal) continue;
                                if(!_participantsList[i].videoIconEl || !_participantsList[i].audioIconEl) continue;

                                let listItemInstance = _participantsList[i];
                                var localParticipant = tool.webrtcSignalingLib.localParticipant();
                                var localMediaControls = tool.webrtcSignalingLib.localMediaControls;
    
                                var enabledVideoTracks = localParticipant.tracks.filter(function (t) {
                                    return t.kind == 'video' && t.mediaStreamTrack != null && t.mediaStreamTrack.enabled;
                                }).length;
    
                                if (_webrtcUserInterface.getOptions().audioOnlyMode) {
                                    //log('updateLocalControlsButtonsState v1');
                                    listItemInstance.videoIconEl.innerHTML = tool.icons.participantsDisabledCamera;
                                } else if (enabledVideoTracks == 0 && tool.webrtcSignalingLib.localParticipant().videoStream == null) {
                                    //log('updateLocalControlsButtonsState v2');
                                    listItemInstance.videoIconEl.innerHTML = tool.icons.participantsDisabledCamera;
                                } else if (!localMediaControls.cameraIsEnabled()) {
                                    //log('updateLocalControlsButtonsState v3');
                                    listItemInstance.videoIconEl.innerHTML = tool.icons.participantsDisabledCamera;
                                } else if (localMediaControls.cameraIsEnabled()) {
                                    //log('updateLocalControlsButtonsState v4');
                                    listItemInstance.videoIconEl.innerHTML = tool.icons.participantsEnabledCamera;
                                }
    
                                var enabledAudioTracks = localParticipant.tracks.filter(function (t) {
                                    return t.kind == 'audio' && t.mediaStreamTrack != null && t.mediaStreamTrack.enabled;
                                }).length;
    
                                if (enabledAudioTracks == 0 && tool.webrtcSignalingLib.localParticipant().audioStream == null) {
                                    //log('updateLocalControlsButtonsState a1');
                                    listItemInstance.audioIconEl.innerHTML = tool.icons.participantsDisabledMic;
                                } else if (!localMediaControls.micIsEnabled()) {
                                    //log('updateLocalControlsButtonsState a2');
                                    listItemInstance.audioIconEl.innerHTML = tool.icons.participantsDisabledMic;
                                } else if (localMediaControls.micIsEnabled()) {
                                    //log('updateLocalControlsButtonsState a3');
                                    listItemInstance.audioIconEl.innerHTML = tool.icons.participantsEnabledMic;
                                }
                            }
                        }

                        function updateRemoteParticipantControlsButtonsState() {
                            log('updateRemoteParticipantControlsButtonsState');
    
                            for(let i in _participantsList) {
                                updateParticipantItem(_participantsList[i]);
                            }
                        }

                        function getListElement() {
                            log('ParticipantsList: getListElement');
                            return _participantsListEl;
                        }
                        function getListContainer() {
                            log('ParticipantsList: getListContainer');
                            return _participantsContainerEl;
                        }
                        function getWebrtcGroupInstance() {
                            log('ParticipantsList: getListContainer');
                            return _allParticipantsListInstance.sourceInstance;
                        }

                        function getWebrtcGroupListItem() {
                            log('ParticipantsList: getWebrtcGroupListItem');
                            return _allParticipantsListInstance;
                        }

                        return {
                            refreshList: refreshList,
                            getListElement: getListElement,
                            getListContainer: getListContainer,
                            getWebrtcGroupInstance: getWebrtcGroupInstance,
                            getWebrtcGroupListItem: getWebrtcGroupListItem,
                            addTeleconferenceSource: addTeleconferenceSource
                        }
                    }

                    //if user turns his mic off on main controls, all his mic audio in livestream should be also turned off
                    function declareOrRefreshEventHandlers() {
                        var webrtcSignalingLib = tool.webrtcSignalingLib;
                        
                        tool.eventDispatcher.on('beforeSwitchRoom', function (e) {
                            declareOrRefreshEventHandlers();
                        });

                        if(_controlsTool != null && webrtcSignalingLib != null) {
                            webrtcSignalingLib.event.on('trackAdded', function (e) {
                                updateLocalControlsButtonsState();
                            });
                            webrtcSignalingLib.event.on('cameraEnabled', function () {
                                updateLocalControlsButtonsState();
                            });
                            webrtcSignalingLib.event.on('cameraDisabled', function () {
                                updateLocalControlsButtonsState();
                            });
                            webrtcSignalingLib.event.on('cameraToggled', function () {
                                updateLocalControlsButtonsState();
                            });
                            webrtcSignalingLib.event.on('micEnabled', function () {
                                updateLocalControlsButtonsState();
                            });
                            webrtcSignalingLib.event.on('micDisabled', function () {
                                updateLocalControlsButtonsState();
                            });
                        }
                    }

                    declareOrRefreshEventHandlers();

                    _scene.sceneInstance.eventDispatcher.on('sourceAdded', function (source) {
                        log('SCENE EVENT: SOURCE ADDED', source)
                        let activeScene = scenesInterface.getActive();
                        if(_scene == activeScene && source.screenSharing && source.isNewSourceOnCanvas) {
                            log('SCENE EVENT: CHANGE LAYOUT', source)
                            _layoutsListCustomSelect.value = _selectedLayout = 'sideScreenSharing';
                            _autoSwitchToScreensharingLayoutAndBack = true;
                        }
                    })
                    _scene.sceneInstance.eventDispatcher.on('sourceRemoved', function (source) {
                        log('SCENE EVENT: SOURCE REMOVED', source)
                        if(source.sourceType != 'webrtc') {
                            return;
                        }
                        let webrtcGroup = source.parentGroup;
                        let allWebrtcSources = webrtcGroup.getChildSources('webrtc');

                        let anotherScreensharingExists = false;
                        for (let i in allWebrtcSources) {
                            if(allWebrtcSources[i].screenSharing) {
                                anotherScreensharingExists = true;
                                break;
                            }
                        }

                        if(webrtcGroup.currentLayoutMode != 'audioOnly' && !anotherScreensharingExists && _autoSwitchToScreensharingLayoutAndBack) {
                            _layoutsListCustomSelect.value = webrtcGroup.prevLayout;
                        }
                    })
                    _scene.sceneInstance.eventDispatcher.on('sourceMoved', function (source) {
                        log('SCENE EVENT: SOURCE MOVED')
                        //updateSourceControlPanelButtons(); 
                    })

                    function syncList() {
                        var sources = _scene.sceneInstance.sources;
                        log('visual: syncList _scene', _scene);
                        log('visual: syncList _sourcesList', _sourcesList.length);
                        log('visual: syncList sources', sources.length);
                        log('visual: syncList _id', _id);
                        for (let i = _sourcesList.length - 1; i >= 0; i--) {
                            log('visual: syncList _sourcesList', _sourcesList[i]);
                            if(_sourcesList[i] == null) continue;

                            if(_sourcesList[i].isActive() == false) {
                                log('visual: syncList remove',  _sourcesList[i]);

                                _sourcesList[i].remove();
                                continue;
                            }
                            if(_sourcesList[i].listType == 'visual') {
                                if(_sourcesList[i].sourceInstance.active === true) {
                                    _sourcesList[i].switchVisibilityIcon(true);
                                } else if(_sourcesList[i].sourceInstance.active === false) {
                                    _sourcesList[i].switchVisibilityIcon(false);
                                }
                            } else if(_sourcesList[i].listType == 'audio') {
                                if(_sourcesList[i].sourceInstance.active === true) {
                                    _sourcesList[i].switchAudioActivenessIcon(true);
                                } else if(_sourcesList[i].sourceInstance.active === false) {
                                    _sourcesList[i].switchAudioActivenessIcon(false);
                                }
                            }
                        }

                        for (let s in sources) {
                            if(sources[s].sourceType == 'webrtcrect' || sources[s].sourceType == 'webrtctext') continue;
                            let newSource = true;
                            for (let i in _sourcesList) {
                                if(sources[s] == _sourcesList[i].sourceInstance) {
                                    newSource = false;
                                    break;
                                }
                            }

                            if(newSource) {
                                if ((sources[s].sourceType == 'group' && sources[s].groupType == 'webrtc') || sources[s].sourceType == 'webrtc') {
                                    if(sources[s].sourceType == 'webrtc') {
                                        //do not show webrtc sources as a separate soruces as it will be shown in ParticipantsList below
                                        continue;
                                    }
                                    
                                    let participantsList = new ParticipantsList(sources[s]);
                                    
                                    addItem(participantsList.getWebrtcGroupListItem());
                                } else if (sources[s].sourceType == 'video' || sources[s].sourceType == 'videoInput' || sources[s].sourceType == 'image') {
                                    var listItem = new VisualListItem(sources[s]);
                                    listItem.sourceInstance = sources[s];
                                    log('visual: syncList add', listItem);
                                    if (sources[s].active === true) {
                                        listItem.switchVisibilityIcon(true);
                                    } else if (sources[s].active === false) {
                                        listItem.switchVisibilityIcon(false);
                                    }

                                    var sourceResizingEl = listItem.resizingElement = document.createElement('DIV');
                                    sourceResizingEl.className = 'live-editor-canvas-preview-resizing';
                                    //activeDialog.previewBoxEl.appendChild(sourceResizingEl);
        
                                    Q.activate(
                                        Q.Tool.setUpElement(
                                            sourceResizingEl,
                                            "Q/resize",
                                            {
                                                move: true,
                                                resize: true,
                                                active: true,
                                                resizeByWheel: false,
                                                //elementPosition: 'fixed',
                                                showResizeHandles: true,
                                                moveWithinArea: 'parent',
                                                allowOverresizing: true,
                                                negativeMoving: true,
                                                onMoving: function () {
                
                                                }
                                            }
                                        ),
                                        {},
                                        function () {
                                            listItem.resizingElementTool = this;
                                        }
                                    );
                                    
                                    addItem(listItem);
                                } else if ((sources[s].sourceType == 'group' && sources[s].groupType == 'webrtcaudio') || sources[s].sourceType == 'webrtcaudio' || sources[s].sourceType == 'audio' || sources[s].sourceType == 'audioInput') {
                                    var listItem = new AudioListItem(sources[s]);
                                    log('audio: syncList add', listItem, listItem.sourceInstance);
                                    if (sources[s].active === true) {
                                        listItem.switchAudioActivenessIcon(true);
                                    } else if (sources[s].active === false) {
                                        listItem.switchAudioActivenessIcon(false);
                                    }
                                    addItem(listItem);
                                }
                            }
                        }

                        sortList('visual');
                        updateSourceControlPanelButtons(); 
                    }

                    function sortList(type) {
                        var listArr, listEl, sources;

                        if(type == 'visual') {
                            listArr = _sourcesList;
                            listEl = _visualSourcesListEl;
                            sources = scenesInterface.getActive().sceneInstance.sources;
                        } else {
                            listArr = _audioList;
                            listEl = _audioSourcesListEl;
                            sources = scenesInterface.getActive().sceneInstance.audioSources;
                        }
                        log('sortList: sources', type, sources, listArr);

                        if(sources.length !== listArr.length) {
                            return;
                        }

                        listArr.sort((a, b) => {
                            return sources.findIndex(p => p === a.sourceInstance) - sources.findIndex(p => p === b.sourceInstance);
                        });

                        log('sortList: listArr', listArr.map(el => {
                             return el.itemEl.innerText
                             }));
                        log('sortList: NOT sortedElements', Array.from(listEl.childNodes).map(el => { return el.innerText }))

                        //listEl.innerHTML == '';
                        for (let e = 0; e < listArr.length; e++) {
                            listEl.appendChild(listArr[e].itemEl)
                        }
                        for(let i in listArr) {
                            log('source level for', i)
                            log('source level parentGroup', listArr[i].sourceInstance.parentGroup)

                            let level = 0;
                            let currentListItem = listArr[i].sourceInstance.parentGroup;
                            while (currentListItem) {
                                log('source level for f', currentListItem,  listArr[i].sourceInstance)

                                currentListItem = currentListItem.parentGroup ? currentListItem.parentGroup.parentGroup : null;
                                level++;
                            }
                            if(level != 0) listArr[i].itemEl.style.paddingLeft = 20*level + 'px';
                            log('source level', level)
                        }
                    }

                    function addItem(item) {
                        if(item == null || _visualSourcesListEl == null) return;
                        log('visual: addItem', item)
                        log('visual: addItem itemEl', item.itemEl)
                    
                        if (item.sourceInstance.sourceType == 'group' && item.sourceInstance.groupType == 'webrtc') {
                            _sourcesList.push(item)
                            _visualSourcesListEl.insertBefore(item.itemEl, _visualSourcesListEl.firstChild);
                        } else {
                            _sourcesList.push(item)
                            log('visual: addItem element', _visualSourcesListEl)

                            _visualSourcesListEl.insertBefore(item.itemEl, _visualSourcesListEl.firstChild);

                            if (item.sourceInstance.sourceType == 'webrtc' && item.sourceInstance.participant.isLocal) {
                                updateLocalControlsButtonsState();
                            }
                        } 
                    }

                    function addWatermark(options, scene) {
                        log('addWatermark');
                        if(options.type == 'image') {
                            if (typeof options.src == 'string') {
                                var img = new Image();
                                img.src = options.src;
                                img.onload = function () {
                                    tool.canvasComposer.videoComposer.addSource({
                                        sourceType: 'imageOverlay',
                                        imageInstance: img,
                                        position: options.position,
                                        opacity: options.opacity
                                    }, scene);
                                };
                            } else {
                                var tgt = options.src.target || window.event.srcElement,
                                    files = tgt.files;

                                function loadImage(fileReader) {
                                    var img = new Image();
                                    img.src = fileReader.result;
                                    img.onload = function () {
                                        tool.canvasComposer.videoComposer.addSource({
                                            sourceType: 'imageOverlay',
                                            title: files[0].name,
                                            imageInstance: img,
                                        }, scene);
                                    };

                                }

                                if (FileReader && files && files.length) {
                                    var fr = new FileReader();
                                    fr.onload = () => loadImage(fr);
                                    fr.readAsDataURL(files[0]);
                                }
                            }
                        } else {

                        }
                    }

                    function addBackground(e, options) {
                        log('addBackground');
                        if(options.type == 'image') {
                            if (typeof e == 'string') {
                                var img = new Image();
                                img.src = e;
                                img.onload = function () {
                                    tool.canvasComposer.videoComposer.addSource({
                                        sourceType: 'imageBackground',
                                        imageInstance: img
                                    });
                                };
                            } else {
                                var tgt = e.target || window.event.srcElement,
                                    files = tgt.files;

                                function loadImage(fileReader) {
                                    var img = new Image();
                                    img.src = fileReader.result;
                                    img.onload = function () {
                                        tool.canvasComposer.videoComposer.addSource({
                                            sourceType: 'img',
                                            title: files[0].name,
                                            imageInstance: img,
                                        });
                                    };

                                }

                                if (FileReader && files && files.length) {
                                    var fr = new FileReader();
                                    fr.onload = () => loadImage(fr);
                                    fr.readAsDataURL(files[0]);
                                }
                            }
                        } else {
                            if(typeof e == 'string') {

                                var pathhInfo = e.split('/');
                                var title = pathhInfo[pathhInfo.length - 1];
                                tool.canvasComposer.videoComposer.addSource({
                                    sourceType: 'videoBackground',
                                    title: title,
                                    url: e,
                                });
                            } else {


                            }
                        }
                    }

                    function addVideoInputSource(e) {
                        log('addVideoInputSource', e);
                        tool.canvasComposer.videoComposer.addSource({
                            sourceType: 'videoInput',
                            title: e.name,
                            mediaStreamInstance: e.stream,
                            originalSize: e.originalSize,
                            frameRate: e.frameRate,
                            screensharing: e.screensharing
                        });
                    }

                    function addImageSource(e) {
                        log('addImageSource');
                        if(typeof e == 'string') {
                            var pathhInfo = e.split('/');
                            var title = pathhInfo[pathhInfo.length - 1];

                            var img = new Image();
                            img.src = e;
                            img.onload = function () {
                                tool.canvasComposer.videoComposer.addSource({
                                    sourceType: 'image',
                                    title: title,
                                    imageInstance: img,
                                });
                            };
                        } else {
                            var tgt = e.target || window.event.srcElement,
                                files = tgt.files;

                            function loadImage(fileReader) {
                                var img = new Image();
                                img.src = fileReader.result;
                                img.onload = function () {
                                    tool.canvasComposer.videoComposer.addSource({
                                        sourceType: 'image',
                                        title: files[0].name,
                                        imageInstance: img,
                                    });
                                };

                            }

                            if (FileReader && files && files.length) {
                                var fr = new FileReader();
                                fr.onload = () => loadImage(fr);
                                fr.readAsDataURL(files[0]);
                            }
                        }
                    }

                    function addVideoSource(e) {
                        if(typeof e == 'string') {

                            var pathhInfo = e.split('/');
                            var title = pathhInfo[pathhInfo.length - 1];
                            tool.canvasComposer.videoComposer.addSource({
                                sourceType: 'video',
                                title: title,
                                url: e,
                            });
                        } else {
                            var tgt = e.target || window.event.srcElement,
                                files = tgt.files;

                            if (FileReader && files && files.length) {
                                let file = files[0], mime = file.type;
                                let reader = new  FileReader();
                                reader.readAsArrayBuffer(file);
                                reader.addEventListener('loadstart', loadStartHandler);
                                reader.addEventListener('load', loadHandler);
                                reader.addEventListener('loadend', loadEndHandler);
                                reader.addEventListener('progress', updateProgress);
                                reader.addEventListener('error', errorHandler);
                                reader.addEventListener('abort', abortHandler);

                                var loadProgressBar = new ProgressBar();
                                loadProgressBar.show();

                                function loadHandler(e) {
                                    // The file reader gives us an ArrayBuffer:
                                    let buffer = e.target.result;

                                    // We have to convert the buffer to a blob:
                                    let videoBlob = new Blob([new Uint8Array(buffer)], { type: mime });

                                    // The blob gives us a URL to the video file:
                                    let url = window.URL.createObjectURL(videoBlob);

                                    tool.canvasComposer.videoComposer.addSource({
                                        sourceType: 'video',
                                        title: files[0].name,
                                        url: url,
                                    },
                                    null, 
                                    function () {
                                        loadProgressBar.updateTextStatus('loaded');
                                        loadProgressBar.hide();
                                    }, 
                                    function (e) {
                                        loadProgressBar.updateTextStatus('<span style="color:#ff9f9f;">' + e.message + '</span>');
                                    });

                                    loadProgressBar.updateProgress(100);


                                }

                                function loadStartHandler(evt) {

                                }

                                function loadEndHandler(evt) {

                                }

                                function abortHandler(evt) {
                                    loadProgressBar.updateTextStatus('<span style="color:#ff9f9f;">File read cancelled</span>');
                                }

                                function errorHandler(evt) {
                                    log('errorHandler',  evt.target.error)

                                    switch (evt.target.error.code) {
                                        case evt.target.error.NOT_FOUND_ERR:
                                            loadProgressBar.updateTextStatus('<span style="color:#ff9f9f;">File Not Found!</span>');
                                            break;
                                        case evt.target.error.NOT_READABLE_ERR:
                                            loadProgressBar.updateTextStatus('<span style="color:#ff9f9f;">File is not readable</span>');
                                            break;
                                        case evt.target.error.ABORT_ERR:
                                            break; // noop
                                        default:
                                            loadProgressBar.updateTextStatus('<span style="color:#ff9f9f;">An error occurred reading this file.</span>');
                                    };
                                }

                                function updateProgress(evt) {
                                    // evt is an ProgressEvent.
                                    if (evt.lengthComputable) {
                                        var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
                                        // Increase the progress bar length.
                                        if (percentLoaded < 100) {
                                            loadProgressBar.updateProgress(percentLoaded);
                                        }
                                    }
                                }

                                function ProgressBar() {
                                    var _progrssBarPopup = null;
                                    var _barProggressEl = null;
                                    var _progressText = null;
                                    var _isHidden = true;
                                    var _barWidth = 300;
                                    var _barheight = 100;

                                    log('createProgressBar')
                                    var dialog=document.createElement('DIV');
                                    dialog.className = 'live-editor-progress-bar-popup';
                                    dialog.style.width = _barWidth + 'px';
                                    dialog.style.height = _barheight + 'px';
                                    _progrssBarPopup = dialog;

                                    var dialogInner=document.createElement('DIV');
                                    dialogInner.className = 'live-editor-progress-bar-popup-inner';
                                    var boxContent=document.createElement('DIV');
                                    boxContent.className = 'live-editor-streaming-box live-editor-box';
                                    var boxContentText = _progressText = document.createElement('DIV');
                                    boxContentText.innerHTML = 'loading...';
                                    var progressBar = document.createElement('DIV');
                                    progressBar.className = 'live-editor-progress-bar';
                                    var progressEl = _barProggressEl = document.createElement('SPAN');
                                    progressEl.className = 'live-editor-progress-el';


                                    progressBar.appendChild(progressEl);
                                    boxContent.appendChild(boxContentText);
                                    boxContent.appendChild(progressBar);

                                    var close=document.createElement('div');
                                    close.className = 'live-editor-close-dialog-sign';
                                    close.innerHTML = '&#10005;';
                                    var popupinstance = this;
                                    close.addEventListener('click', function() {
                                        popupinstance.hide();
                                    });
                                    dialog.appendChild(close);

                                    dialogInner.appendChild(boxContent);
                                    dialog.appendChild(dialogInner);

                                    this.show = function() {
                                        var boxRect = activeDialog.dialogEl.getBoundingClientRect();
                                        var x = (boxRect.width / 2) - (_barWidth / 2);
                                        var y = (boxRect.height / 2) - (_barheight / 2);
                                        _progrssBarPopup.style.top = y + 'px';
                                        _progrssBarPopup.style.left = x + 'px';
                                        activeDialog.dialogEl.appendChild(_progrssBarPopup);
                                    }

                                    this.hide = function() {
                                        if(!activeDialog.dialogEl.contains(_progrssBarPopup)) return;
                                        activeDialog.dialogEl.removeChild(_progrssBarPopup);
                                    }

                                    this.updateProgress = function(percemt) {
                                        _barProggressEl.style.width = percemt + '%';
                                        _barProggressEl.innerHTML = percemt + '%';
                                    }

                                    this.updateTextStatus = function(text) {
                                        _progressText.innerHTML = text;
                                    }
                                }

                            }

                        }
                    }

                    function addTeleconferenceSource(name) {
                        log('addTeleconferenceSource START');
                        var webrtcGroup = tool.canvasComposer.videoComposer.addSource({
                            sourceType: 'webrtcGroup',
                            title: name ? name : 'Participants'
                        });

                        //webrtcGroup.currentLayout = _layoutsListSelect.value;
                        tool.canvasComposer.videoComposer.updateWebRTCLayout(webrtcGroup, _layoutsListSelect.value, null);

                    }

                    function addAudioSource(e) {
                        log('addAudioSource', e)
                        if(typeof e == 'string') {
                            var pathhInfo = e.split('/');
                            var title = pathhInfo[0] + '//.../' + pathhInfo[pathhInfo.length - 1];
                            tool.canvasComposer.audioComposer.addSource({
                                sourceType: 'audio',
                                title: title,
                                url: e,
                            });
                        } else {
                            var tgt = e.target || window.event.srcElement,
                                files = tgt.files;
                            log('addAudioSource 2')

                            if (FileReader && files && files.length) {
                                let file = files[0], mime = file.type;
                                let reader = new  FileReader();
                                reader.readAsArrayBuffer(file);
                                reader.onload = function(e) {
                                    // The file reader gives us an ArrayBuffer:
                                    let buffer = e.target.result;

                                    // We have to convert the buffer to a blob:
                                    let audioBlob = new Blob([new Uint8Array(buffer)], { type: mime });
                                    log('addAudioSource onload', audioBlob)

                                    // The blob gives us a URL to the video file:
                                    let url = window.URL.createObjectURL(audioBlob);

                                    tool.canvasComposer.audioComposer.addSource({
                                        sourceType: 'audio',
                                        title: files[0].name,
                                        url: url,
                                    });
                                }

                            }

                        }
                    }

                    function addAudioInputSource(e) {
                        log('addAudioInputSource', e);
                        tool.canvasComposer.audioComposer.addSource({
                            sourceType: 'audioInput',
                            title: e.name,
                            mediaStreamInstance: e.stream
                        });
                    }

                    function hideResizingElement() {
                        _resizingElement.style.display = 'none';
                    }

                    function showResizingElement() {
                        _resizingElement.style.display = '';
                    }

                    function selectSource(sourceItem) {
                        log('selectSource START', sourceItem)

                        if(sourceItem.listType == 'allParticipants' || sourceItem.listType == 'mainParticipantVideo' || sourceItem.listType == 'additionalParticipantVideo') {
                            deselctAll(sourceItem.itemEl.parentElement);

                            if(sourceItem.itemEl && !sourceItem.itemEl.classList.contains('live-editor-sources-item-active')) {   
                                sourceItem.itemEl.classList.add('live-editor-sources-item-active');
                            }
                            _selectedSource = sourceItem;
                        } else {
                            deselctAll(sourceItem.itemEl.parentElement);
                            if(sourceItem.itemEl && !sourceItem.itemEl.classList.contains('live-editor-sources-item-active')) {
                                sourceItem.itemEl.classList.add('live-editor-sources-item-active');
                            }
                            _selectedSource = sourceItem;
                        
                        }

                        _eventDispatcher.dispatch('sourceSelected', _selectedSource);
                        if(!_selectedSource.sourceInstance) return;
                        log('selectSource _selectedSource', _selectedSource)

                        var left = 0, top = 0;
                        if(_streamingCanvas != null) {
                            left = _streamingCanvas.offsetLeft;
                            top = _streamingCanvas.offsetTop;
                        }
                        var canvasSize = tool.canvasComposer.videoComposer.getCanvasSize();
                        var prmtr1 = canvasSize.width * 2 + canvasSize.height * 2
                        var realcanvasSize = _streamingCanvas.getBoundingClientRect();
                        var prmtr2 = realcanvasSize.width * 2 + realcanvasSize.height * 2
                        var timesBigger = prmtr1 >= prmtr2 ? prmtr1 / prmtr2 : prmtr2 / prmtr1;
                        log('selectSource timesbigger', prmtr1, prmtr2, timesBigger)
                        if (sourceItem.resizingElementTool != null) {
                            sourceItem.resizingElementTool.events.removeAllHandlers('moving');
                            sourceItem.resizingElementTool.events.removeAllHandlers('resizing');
                        }
                        if(_selectedSource.sourceInstance.sourceType == 'group' && _selectedSource.sourceInstance.groupType == 'webrtc') {
                            var groupRect = _selectedSource.sourceInstance.rect;
                            log('selectSource if1')

                            //sourceItem.resizingElement.style.display = 'block';
                            activeDialog.previewBoxEl.appendChild(sourceItem.resizingElement);
                            sourceItem.resizingElement.style.width = groupRect.width / timesBigger + 'px';
                            sourceItem.resizingElement.style.height = groupRect.height / timesBigger + 'px';
                            sourceItem.resizingElement.style.top = top + groupRect.y / timesBigger + 'px';
                            sourceItem.resizingElement.style.left = left + groupRect.x / timesBigger + 'px';
                            sourceItem.resizingElement.style.border = '1px solid red';

                            sourceItem.resizingElementTool.state.keepRatioBasedOnElement = {
                                width: groupRect.width,
                                height: groupRect.height
                            };

                            sourceItem.resizingElementTool.events.on('moving', function (e) {
                                let leftPos = (e.x - left);
                                let topPos = (e.y - top);
                                _selectedSource.sourceInstance.rect.x = leftPos * timesBigger;
                                _selectedSource.sourceInstance.rect.y = topPos * timesBigger;
                            });

                            sourceItem.resizingElementTool.events.on('resizing', function (e) {
                                let leftPos = (e.x - left);
                                let topPos = (e.y - top);
                                if (e.width != null) {
                                    _selectedSource.sourceInstance.rect.width = e.width * timesBigger;
                                }
                                if (e.height != null) {
                                    _selectedSource.sourceInstance.rect.height = e.height * timesBigger;
                                }
                                if (e.x != null) {
                                    _selectedSource.sourceInstance.rect.x = leftPos * timesBigger;
                                }
                                if (e.y != null) {
                                    _selectedSource.sourceInstance.rect.y = topPos * timesBigger;
                                }
                            });
                        } else if(_selectedSource.sourceInstance.sourceType == 'webrtc') {  
                            log('SELECT WEBRTC', sourceItem)
                            var sourceRect = _selectedSource.sourceInstance.rect;
                            log('SELECT WEBRTC sourceRect', sourceRect)

                            let scaledWidth = sourceRect.width / timesBigger;
                            let scaledHeight = sourceRect.height / timesBigger;
                            let scaledTop = top + sourceRect.y / timesBigger;
                            let scaledLeft = left + sourceRect.x / timesBigger;

                            log('SELECT WEBRTC size', scaledWidth, scaledHeight, scaledTop, scaledLeft)
                            //sourceItem.resizingElement.style.display = 'block';
                            activeDialog.previewBoxEl.appendChild(sourceItem.resizingElement);

                            sourceItem.resizingElement.style.width = scaledWidth + 'px';
                            sourceItem.resizingElement.style.height = scaledHeight + 'px';
                            sourceItem.resizingElement.style.top = scaledTop + 'px';
                            sourceItem.resizingElement.style.left = scaledLeft + 'px';
                            sourceItem.resizingElement.style.border = '1px solid red';
                            sourceItem.resizingElement.style.boxSizing = 'border-box';
                            //hideResizingElement();
                        } else if(_selectedSource.sourceInstance.sourceType == 'image' || _selectedSource.sourceInstance.sourceType == 'video' || _selectedSource.sourceInstance.sourceType == 'videoInput' || _selectedSource.sourceInstance.sourceType == 'reactions') {
                            log('selectSource if2')
                            //showResizingElement();
                            var sourceRect = _selectedSource.sourceInstance.rect;
                            log('selectSource sourceRect', sourceRect)
                            log('selectSource sourceRect 1', sourceRect.width,  sourceRect.height,  sourceRect.x,  sourceRect.y)
                            
                            if (_selectedSource.sourceInstance.sourceType == 'image' && !sourceItem.resizingElementTool.state.keepRatioBasedOnElement) {
                                sourceItem.resizingElementTool.state.keepRatioBasedOnElement = {
                                    width: _selectedSource.sourceInstance.imageInstance.naturalWidth,
                                    height: _selectedSource.sourceInstance.imageInstance.naturalHeight
                                };
                            } else if (_selectedSource.sourceInstance.sourceType == 'video' && !sourceItem.resizingElementTool.state.keepRatioBasedOnElement) {
                                sourceItem.resizingElementTool.state.keepRatioBasedOnElement = {
                                    width: _selectedSource.sourceInstance.videoInstance.videoWidth,
                                    height: _selectedSource.sourceInstance.videoInstance.videoHeight
                                };
                            }

                            let scaledWidth = sourceRect._width / timesBigger;
                            let scaledHeight = sourceRect._height / timesBigger;
                            let scaledTop = top + sourceRect._y / timesBigger;
                            let scaledLeft = left + sourceRect._x / timesBigger;
                            //sourceItem.resizingElement.style.display = 'block';
                            activeDialog.previewBoxEl.appendChild(sourceItem.resizingElement);

                            sourceItem.resizingElement.style.width = scaledWidth + 'px';
                            sourceItem.resizingElement.style.height = scaledHeight + 'px';
                            sourceItem.resizingElement.style.top = scaledTop + 'px';
                            sourceItem.resizingElement.style.left = scaledLeft + 'px';
                            sourceItem.resizingElement.style.border = '1px solid red';
                            sourceItem.resizingElement.style.boxSizing = 'border-box';

                            sourceItem.resizingElementTool.events.on('moving', function (e) {
                                let leftPos = (e.x - left);
                                let topPos = (e.y - top);
                                _selectedSource.sourceInstance.rect.x = leftPos * timesBigger;
                                _selectedSource.sourceInstance.rect.y = topPos * timesBigger;
                            });

                            sourceItem.resizingElementTool.events.on('resizing', function (e) {
                                let leftPos = (e.x - left);
                                let topPos = (e.y - top);
                                if (e.width != null) {
                                    _selectedSource.sourceInstance.rect.width = e.width * timesBigger;
                                }
                                if (e.height != null) {
                                    _selectedSource.sourceInstance.rect.height = e.height * timesBigger;              
                                }
                                if (e.x != null) {
                                    _selectedSource.sourceInstance.rect.x = leftPos * timesBigger;
                                }
                                if (e.y != null) {
                                    _selectedSource.sourceInstance.rect.y = topPos * timesBigger;
                                }

                                _selectedSource.sourceInstance.rect.currentWidth = e.originalWidth / _selectedSource.sourceInstance.rect._width;
                                //_selectedSource.sourceInstance.rect.currentHeight = _selectedSource.sourceInstance.rect._height;

                            });
        
                            sourceItem.resizingElementTool.events.on('resized', function (e) {
                             
                            });

                        }

                        optionsColumn.update();
                        updateSourceControlPanelButtons();
                    }
                    
                    function deselctAll(listParentElement) {
                        log('selectSource deselctAll')
                        let currentlySelectedEls = listParentElement.querySelectorAll('.live-editor-sources-item-active');
                        let i, selectedElsNum = currentlySelectedEls.length;
                        for(i = 0; i < selectedElsNum; i++) {
                            if(currentlySelectedEls[i].classList.contains('live-editor-sources-item-active')) {   
                                currentlySelectedEls[i].classList.remove('live-editor-sources-item-active');
                            }  
                        }
                        let resizingEls = activeDialog.previewBoxEl.querySelectorAll('.live-editor-canvas-preview-resizing');
                        let a;
                        for(a = 0; a < resizingEls.length; a++) {
                            if(resizingEls[a].parentNode) {
                                resizingEls[a].parentNode.removeChild(resizingEls[a]);
                            }
                        }
                    }

                    function moveForward() {
                        log('moveForward');
                        tool.canvasComposer.videoComposer.moveSourceForward(_selectedSource.sourceInstance);

                        sortList('visual');
                        return false;
                    }

                    function moveBackward() {
                        log('moveBackward', _selectedSource);
                        tool.canvasComposer.videoComposer.moveSourceBackward(_selectedSource.sourceInstance);

                        sortList('visual');
                        return false;
                    }

                    function getSelectedSource() {
                        return _selectedSource;
                    }

                    function removeSource() {
                        if(_selectedSource != null) {

                            let sourceToRemove = _selectedSource;
                            _selectedSource = null;
                            if(sourceToRemove.listType == 'visual' || sourceToRemove.listType == 'allParticipants') {
                                tool.canvasComposer.videoComposer.removeSource(sourceToRemove.sourceInstance);
                            } else if(sourceToRemove.listType == 'audio') {
                                tool.canvasComposer.audioComposer.removeSource(sourceToRemove.sourceInstance);
                            }
                            syncList();
                        };
                        var activeScene = scenesInterface.getActive();
                        //activeScene.sourcesInterface.hideResizingElement()
                        optionsColumn.update();
                    }

                    function createAddSourceMenu() {
                        var dropUp = _addVisualSourceDropUpMenuEl = document.createElement('DIV');
                        dropUp.className = 'live-editor-sources-add-menu';

                        /*var conferenceItem = document.createElement('DIV');
                        conferenceItem.className = 'live-editor-sources-add-menu-item live-editor-sources-add-conference';
                        conferenceItem.dataset.menuName = 'add-conference';
                        var conferenceItemIcon = document.createElement('DIV');
                        conferenceItemIcon.className = 'live-editor-sources-add-menu-icon';
                        var conferenceItemIconText = document.createElement('DIV');
                        conferenceItemIconText.className = 'live-editor-sources-add-menu-text';
                        conferenceItemIconText.innerHTML = 'Teleconference';
                        conferenceItem.addEventListener('click', function (e) {
                            addTeleconferencePopup.showDialog(e);
                        })
                        conferenceItem.appendChild(conferenceItemIcon);
                        conferenceItem.appendChild(conferenceItemIconText);
                        dropUp.appendChild(conferenceItem);*/

                        var cameraItem = document.createElement('DIV');
                        cameraItem.className = 'live-editor-sources-add-menu-item live-editor-sources-add-camera';
                        cameraItem.dataset.menuName = 'add-camera';
                        var cameraItemIcon = document.createElement('DIV');
                        cameraItemIcon.className = 'live-editor-sources-add-menu-icon';
                        var cameraItemIconText = document.createElement('DIV');
                        cameraItemIconText.className = 'live-editor-sources-add-menu-text';
                        cameraItemIconText.innerHTML = 'Camera';
                        cameraItem.addEventListener('click', function (e) {
                            addCameraPopup.showDialog({
                                onOk: function (e) {
                                    if (!e.stream) {
                                        alert('No media stream added');
                                        return;
                                    }
                                    if(e.sourceType == 'separate') {
                                        log('add camera source: separate', e);

                                        addVideoInputSource({
                                            name: e.name,
                                            stream: e.stream,
                                            originalSize: e.originalSize,
                                            frameRate: e.frameRate
                                        });
                                    } else {
                                        log('add camera source: webrtc');
                                        let videoTracks = e.stream.getVideoTracks();
                                        for (let t in videoTracks) {
                                            videoTracks[t].stop();
                                        }
                                        tool.webrtcSignalingLib.localMediaControls.toggleCameras({deviceId:e.deviceId});
                                    }
                                    
                                },
                                onClose: function () {
        
                                }
                            });
                        })
                        cameraItem.appendChild(cameraItemIcon);
                        cameraItem.appendChild(cameraItemIconText);
                        dropUp.appendChild(cameraItem);

                        var imageItem = document.createElement('DIV');
                        imageItem.className = 'live-editor-sources-add-menu-item live-editor-sources-add-image';
                        imageItem.dataset.menuName = 'add-image';
                        var imageItemIcon = document.createElement('DIV');
                        imageItemIcon.className = 'live-editor-sources-add-menu-icon';
                        var imageItemIconText = document.createElement('DIV');
                        imageItemIconText.className = 'live-editor-sources-add-menu-text';
                        imageItemIconText.innerHTML = 'Image';
                        imageItem.addEventListener('click', function (e) {
                            addImagePopup.showDialog(e);
                        })
                        imageItem.appendChild(imageItemIcon);
                        imageItem.appendChild(imageItemIconText);
                        dropUp.appendChild(imageItem);

                        var videoItem = document.createElement('DIV');
                        videoItem.className = 'live-editor-sources-add-menu-item';
                        cameraItem.dataset.menuName = 'add-video';
                        var videoItemIcon = document.createElement('DIV');
                        videoItemIcon.className = 'live-editor-sources-add-menu-icon';
                        var videoItemIconText = document.createElement('DIV');
                        videoItemIconText.className = 'live-editor-sources-add-menu-text';
                        videoItemIconText.innerHTML = 'Video';
                        videoItem.addEventListener('click', function (e) {
                            addVideoPopup.showDialog(e);
                        })
                        /*var videoItemInput = document.createElement('INPUT');
                            videoItemInput.className = 'live-editor-sources-add-menu-file';
                            videoItemInput.type = 'file';
                            videoItemInput.name = 'fileVideoSource';
                            videoItemInput.addEventListener('change', function (e) {
                                addVideoSource(e);
                            })*/
                        videoItem.appendChild(videoItemIcon);
                        videoItem.appendChild(videoItemIconText);
                        //videoItem.appendChild(videoItemInput);
                        dropUp.appendChild(videoItem);

                        var audioItem = document.createElement('DIV');
                        audioItem.className = 'live-editor-sources-add-menu-item';
                        cameraItem.dataset.menuName = 'add-video';
                        var audioItemIcon = document.createElement('DIV');
                        audioItemIcon.className = 'live-editor-sources-add-menu-icon';
                        var audioItemIconText = document.createElement('DIV');
                        audioItemIconText.className = 'live-editor-sources-add-menu-text';
                        audioItemIconText.innerHTML = 'Audio';
                        audioItem.addEventListener('click', function (e) {
                            addAudioPopup.showDialog(e);
                        })
                        audioItem.appendChild(audioItemIcon);
                        audioItem.appendChild(audioItemIconText);
                        dropUp.appendChild(audioItem);

                        var micItem = document.createElement('DIV');
                        micItem.className = 'live-editor-sources-add-menu-item live-editor-sources-add-mic';
                        var micItemIcon = document.createElement('DIV');
                        micItemIcon.className = 'live-editor-sources-add-menu-icon';
                        var micItemIconText = document.createElement('DIV');
                        micItemIconText.className = 'live-editor-sources-add-menu-text';
                        micItemIconText.innerHTML = 'Audio Input';
                        micItem.addEventListener('click', function (e) {
                            addMicrophoneAudioPopup.showDialog({
                                onOk: function (e) {
                                    log('addMicrophoneAudioPopup: ', e);

                                    if (!e.stream) {
                                        alert('No media stream added');
                                        return;
                                    }
                                    if(e.sourceType == 'separate') {
                                        addAudioInputSource({
                                            name: e.name,
                                            stream: e.stream
                                        });
                                    } else {
                                        log('add camera source: webrtc');
                                        let audioTracks = e.stream.getAudioTracks();
                                        for (let t in audioTracks) {
                                            audioTracks[t].stop();
                                        }
                                        tool.webrtcSignalingLib.localMediaControls.toggleAudioInputs({deviceId:e.deviceId});
                                    }
                                    
                                },
                                onClose: function () {
        
                                }
                            });
                        })

                        micItem.appendChild(micItemIcon);
                        micItem.appendChild(micItemIconText);
                        dropUp.appendChild(micItem);

                        var savedMedia = document.createElement('DIV');
                        savedMedia.className = 'live-editor-sources-add-menu-item';
                        savedMedia.dataset.menuName = 'add-saved';
                        var savedMediaIcon = document.createElement('DIV');
                        savedMediaIcon.className = 'live-editor-sources-add-menu-icon';
                        var savedMediaIconText = document.createElement('DIV');
                        savedMediaIconText.className = 'live-editor-sources-add-menu-text';
                        savedMediaIconText.innerHTML = 'Saved Media';
                        savedMedia.addEventListener('click', function (e) {
                            log('_fileManagerTool', _fileManagerTool)
                            if(!_fileManagerTool) return;

                            _fileManagerTool.showDialog();

                            _fileManagerTool.state.onSelect.set(function (stream) {
                                log('Streams/fileManager onSelect', stream)
                                if(stream.fields.attributes == '' && stream.fields.icon == '') {
                                    console.error('Q.file.url is missing')
                                    return;
                                }
                                var link;
                                if(attributes) {
                                    var attributes = JSON.parse(stream.fields.attributes);
                                    link = Q.url(attributes['Q.file.url']);
                                } else {
                                    link = Q.url(stream.fields.icon) + '/original.png';
                                }
                                log('Streams/fileManager attributes', link)
                                if(stream.fields.type == 'Streams/video') {
                                    addVideoSource(link);
                                } else if(stream.fields.type == 'Streams/image') {
                                    addImageSource(link);
                                } else if(stream.fields.type == 'Streams/audio') {
                                    addAudioSource(link);
                                } else {
                                    alert('Wrong type of file')
                                }

                                _fileManagerTool.closeDialog();
                            }, 'importVisual')
                        })

                        savedMedia.appendChild(savedMediaIcon);
                        savedMedia.appendChild(savedMediaIconText);
                        dropUp.appendChild(savedMedia);

                        //_dialogEl.appendChild(dropUp);
                        return dropUp;
                    }

                    function checkIfOtherWebrtcVideoGroupExist() {
                        let sources = _scene.sceneInstance.sources;
                        let otherWebrtcGroupExist = false;
                        for(let i in sources) {
                            if(sources[i].sourceType == 'group' && sources[i].groupType == 'webrtc') {
                                otherWebrtcGroupExist = true;
                                break;
                            }
                        }
                        return otherWebrtcGroupExist;
                    }

                    _overlaySources = (function () {
                        let _overlaySourcesEl = null;
                        let _overlaySourcesListEl = null;
                        let _overlaySourcesList = [];

                        function createOverlaySourcesList() {
                            if(_overlaySourcesEl != null) return _overlaySourcesEl;
                            var dialogBody = document.createElement('DIV');
                            dialogBody.className = 'live-editor-sources-visual-body';
                            var dialogBodyInner = document.createElement('DIV');
                            dialogBodyInner.className = 'live-editor-sources-body-inner';
                            dialogBody.appendChild(dialogBodyInner)
                            _overlaySourcesEl = dialogBody;
                            _overlaySourcesListEl = dialogBodyInner;
                           
                            return dialogBody;
                        }

                        function syncList() {
                            var sources = _scene.sceneInstance.overlaySources;
                            for (let i = _overlaySourcesList.length - 1; i >= 0; i--) {
                                if(_overlaySourcesList[i] == null) continue;
    
                                if(_overlaySourcesList[i].isActive() == false) {
    
                                    _overlaySourcesList[i].remove();
                                    continue;
                                }
                                if(_overlaySourcesList[i].listType == 'visual') {
                                    if(_overlaySourcesList[i].sourceInstance.active === true) {
                                        _overlaySourcesList[i].switchVisibilityIcon(true);
                                    } else if(_overlaySourcesList[i].sourceInstance.active === false) {
                                        _overlaySourcesList[i].switchVisibilityIcon(false);
                                    }
                                } 
                            }
    
                            for (let s in sources) {
                                if(sources[s].sourceType == 'webrtcrect' || sources[s].sourceType == 'webrtctext') continue;
                                let newSource = true;
                                for (let i in _overlaySourcesList) {
                                    if(sources[s] == _overlaySourcesList[i].sourceInstance) {
                                        newSource = false;
                                        break;
                                    }
                                }
    
                                if(newSource) {
                                    if (sources[s].sourceType == 'video' || sources[s].sourceType == 'videoInput' || sources[s].sourceType == 'image' || sources[s].sourceType == 'reactions') {
                                        var listItem = new VisualListItem(sources[s]);
                                        listItem.sourceInstance = sources[s];
                                        listItem.isOverlay = true;
                                        if (sources[s].active === true) {
                                            listItem.switchVisibilityIcon(true);
                                        } else if (sources[s].active === false) {
                                            listItem.switchVisibilityIcon(false);
                                        }
    
                                        var sourceResizingEl = listItem.resizingElement = document.createElement('DIV');
                                        sourceResizingEl.className = 'live-editor-canvas-preview-resizing';
                                        //activeDialog.previewBoxEl.appendChild(sourceResizingEl);
                                        Q.activate(
                                            Q.Tool.setUpElement(
                                                sourceResizingEl,
                                                "Q/resize",
                                                {
                                                    move: true,
                                                    resize: true,
                                                    active: true,
                                                    resizeByWheel: false,
                                                    //elementPosition: 'fixed',
                                                    showResizeHandles: true,
                                                    moveWithinArea: 'parent',
                                                    allowOverresizing: true,
                                                    keepRatio: listItem.sourceInstance.sourceType == 'reactions' ? false : true,
                                                    keepRatioBasedOnElement: null,
                                                    negativeMoving: true,
                                                    minimalSize: 10,
                                                    onMoving: function () {
                    
                                                    }
                                                }
                                            ),
                                            {},
                                            function () {
                                                listItem.resizingElementTool = this;
                                            }
                                        );
                                        
                                        addItem(listItem);
                                    } 
                                }
                            }
    
                            sortList();
                            updateSourceControlPanelButtons(); 
                        }

                        function sortList() {
                            var listArr = _overlaySourcesList;
                            var listEl = _overlaySourcesListEl;
                            var sources = scenesInterface.getActive().sceneInstance.overlaySources;
                                
                            if(sources.length !== listArr.length) {
                                return;
                            }
    
                            listArr.sort((a, b) => {
                                return sources.findIndex(p => p === a.sourceInstance) - sources.findIndex(p => p === b.sourceInstance);
                            });
        
                            //listEl.innerHTML == '';
                            for (let e = 0; e < listArr.length; e++) {
                                listEl.appendChild(listArr[e].itemEl)
                            }
                            for(let i in listArr) {
    
                                let level = 0;
                                let currentListItem = listArr[i].sourceInstance.parentGroup;
                                while (currentListItem) {
    
                                    currentListItem = currentListItem.parentGroup ? currentListItem.parentGroup.parentGroup : null;
                                    level++;
                                }
                                if(level != 0) listArr[i].itemEl.style.paddingLeft = 20*level + 'px';
                            }
                        }

                        function addItem(item) {
                            if(item == null || _overlaySourcesListEl == null) return;
                            _overlaySourcesList.push(item)
                            _overlaySourcesListEl.insertBefore(item.itemEl, _overlaySourcesListEl.firstChild);
                        }

                        function update() {
                            syncList();
                        }

                        function getList() {
                            return _overlaySourcesListEl;
                        }
                        
                        return {
                            overlaySourcesList: _overlaySourcesList,
                            update: update,
                            createList: createOverlaySourcesList,
                            getList: getList
                        }
                    }())

                    function createSourcesList() {
                        if(_visualSourcesEl != null) return _visualSourcesEl;

                        _overlaySources.createList();

                        var dialogBody = document.createElement('DIV');
                        dialogBody.className = 'live-editor-sources-visual-body';
                        var dialogBodyInner = document.createElement('DIV');
                        dialogBodyInner.className = 'live-editor-sources-body-inner';
                        dialogBody.appendChild(dialogBodyInner)
                        _visualSourcesEl = dialogBody;
                        _visualSourcesListEl = dialogBodyInner;
                        dialogBodyInner.addEventListener('click', function (e) {
                            if (e.target != e.currentTarget) {
                                return;
                            }
                            e.stopPropagation();
                            deselctAll(_sceneSourcesColumnEl);
                            _selectedSource = null;
                        }, false);

                        var sourcesColumnControl = document.createElement('DIV');
                        sourcesColumnControl.className = 'live-editor-sources-control';
                        dialogBody.appendChild(sourcesColumnControl)

                        var dropUpMenu = createAddSourceMenu();

                        var sourcesColumnControlAddBtn = document.createElement('DIV');
                        sourcesColumnControlAddBtn.className = 'live-editor-sources-control-btn live-editor-sources-control-btn-add';
                        if(!tool.state.managingVisualSources) sourcesColumnControlAddBtn.classList.add('live-editor-inactive');
                        sourcesColumnControlAddBtn.innerHTML = tool.icons.addItem;
                        sourcesColumnControlAddBtn.appendChild(dropUpMenu);

                        sourcesColumnControlAddBtn.addEventListener('click', function() {
                            showDropUpMenu(dropUpMenu, sourcesColumnControlAddBtn);
                        });

                        sourcesColumnControl.appendChild(sourcesColumnControlAddBtn);
                        _sourceControlButtons.push({
                            name: 'addSource',
                            buttonEl: sourcesColumnControlAddBtn
                        });

                        var sourcesColumnControlBtn = document.createElement('DIV');
                        sourcesColumnControlBtn.className = 'live-editor-sources-control-btn live-editor-sources-control-btn-remove';
                        if(!tool.state.managingVisualSources) sourcesColumnControlBtn.classList.add('live-editor-inactive');
                        sourcesColumnControlBtn.innerHTML = tool.icons.removeItem;
                        sourcesColumnControlBtn.addEventListener('click', function () {
                            removeSource();
                        })
                        sourcesColumnControl.appendChild(sourcesColumnControlBtn);

                        _sourceControlButtons.push({
                            name: 'removeSource',
                            buttonEl: sourcesColumnControlBtn
                        });

                        var sourcesColumnControlBtn = document.createElement('DIV');
                        sourcesColumnControlBtn.className = 'live-editor-sources-control-btn';
                        sourcesColumnControlBtn.innerHTML = tool.icons.moveUp;
                        sourcesColumnControlBtn.addEventListener('click', function () {
                            moveForward();
                        })
                        sourcesColumnControl.appendChild(sourcesColumnControlBtn);
                        _sourceControlButtons.push({
                            name: 'moveForward',
                            buttonEl: sourcesColumnControlBtn
                        });
                        
                        var sourcesColumnControlBtn = document.createElement('DIV');
                        sourcesColumnControlBtn.className = 'live-editor-sources-control-btn';
                        sourcesColumnControlBtn.innerHTML = tool.icons.moveDown;
                        sourcesColumnControlBtn.addEventListener('click', function () {
                            moveBackward();
                        })
                        sourcesColumnControl.appendChild(sourcesColumnControlBtn);
                        _sourceControlButtons.push({
                            name: 'moveBackward',
                            buttonEl: sourcesColumnControlBtn
                        });
                        
                        _sourceControlButtons.push({
                            name: 'sourceSettings',
                            buttonEl: sourcesColumnControlBtn
                        });

                        var inviteBtnCon = document.createElement('DIV');
                        inviteBtnCon.className = 'live-editor-sources-control-btn-invite-con'
                        sourcesColumnControl.appendChild(inviteBtnCon);

                        var inviteBtn = document.createElement('DIV');
                        inviteBtn.className = 'live-editor-sources-control-btn live-editor-sources-control-btn-invite';
                        inviteBtnCon.appendChild(inviteBtn);
                        var inviteBtnIcon = document.createElement('DIV');
                        inviteBtnIcon.className = 'live-editor-sources-control-btn-icon';
                        inviteBtnIcon.innerHTML = tool.icons.plusIcon;
                        inviteBtn.appendChild(inviteBtnIcon);
                        var inviteBtnText = document.createElement('DIV');
                        inviteBtnText.className = 'live-editor-sources-control-btn-text';
                        inviteBtnText.innerHTML = Q.getObject('Q.text.Streams.invite.Invite') || 'Invite';
                        inviteBtn.appendChild(inviteBtnText);
                        
                        inviteBtn.addEventListener('click', function () {
                            //invitePopup.show();
                            Q.Streams.invite(tool.webrtcUserInterface.roomStream().fields.publisherId, tool.webrtcUserInterface.roomStream().fields.name, {
                                appUrl: Q.url("meeting"),
                                title: 'Invite to Teleconference',
                                addLabel: [],
                                addMyLabel: []
                            });
                        })

                        _sourceControlButtons.push({
                            name: 'invite',
                            buttonEl: inviteBtn
                        });

                        var shareBtn = document.createElement('DIV');
                        shareBtn.className = 'live-editor-sources-control-btn live-editor-sources-control-btn-share';
                        inviteBtnCon.appendChild(shareBtn);
                        var shareBtnIcon = document.createElement('DIV');
                        shareBtnIcon.className = 'live-editor-sources-control-btn-icon';
                        shareBtnIcon.innerHTML = tool.icons.shareIcon;
                        shareBtn.appendChild(shareBtnIcon);
                        
                        shareBtn.addEventListener('click', function () {
                            if(tool.livestreamStream) {
                                Q.Streams.invite(tool.livestreamStream.fields.publisherId, tool.livestreamStream.fields.name, { 
                                    title: 'Share Livestream',
                                    addLabel: [],
                                    addMyLabel: [] 
                                });
                            }
                        })
                        _sourceControlButtons.push({
                            name: 'share',
                            buttonEl: shareBtn
                        });

                        updateSourceControlPanelButtons();
                        return dialogBody;
                    }

                    function updateSourceControlPanelButtons() {
                        //log('updateSourceControlPanelButtons START', _selectedSource);
                        let selectedSourceInstance = _selectedSource ? _selectedSource.sourceInstance : null;
                        let indexOfSelectedSource = _sourcesList.findIndex(function(x){
                            return x == _selectedSource;
                        });
                        let numberOfSources = _sourcesList.length;
                        //log('updateSourceControlPanelButtons', indexOfSelectedSource);

                        for (let i in _sourceControlButtons) {
                            let condition = true;
                            if(_sourceControlButtons[i].name == 'addSource') {

                            } else if(_sourceControlButtons[i].name == 'removeSource') {
                                condition = _selectedSource != null && _selectedSource.listType != 'mainParticipantVideo' && _selectedSource.listType != 'allParticipants';
                            } else if(_sourceControlButtons[i].name == 'moveForward') {
                                condition = _selectedSource != null 
                                && _selectedSource.listType != 'mainParticipantVideo' 
                                && numberOfSources > 1 && indexOfSelectedSource != 0;
                            } else if(_sourceControlButtons[i].name == 'moveBackward') {
                                condition = _selectedSource != null 
                                && _selectedSource.listType != 'mainParticipantVideo' 
                                && numberOfSources > 1 && indexOfSelectedSource != numberOfSources - 1;
                            } else if(_sourceControlButtons[i].name == 'sourceSettings') {
                                condition = _selectedSource != null && selectedSourceInstance;
                            } else if(_sourceControlButtons[i].name == 'invite') {
                                condition = true;
                            } else if(_sourceControlButtons[i].name == 'share') {
                                condition = tool.state.recordingIsActive || tool.state.p2pBroadcastIsActive || tool.state.fbLiveIsActive || tool.state.rtmpLiveIsActive;
                            }

                            if(!condition) {
                                if(!_sourceControlButtons[i].buttonEl.classList.contains('live-editor-inactive')) {
                                    _sourceControlButtons[i].buttonEl.classList.add('live-editor-inactive');
                                }
                            } else {
                                _sourceControlButtons[i].buttonEl.classList.remove('live-editor-inactive');
                            }

                        }
                    }

                    function createLayoutListDropDown() {
                        var listContainer = document.createElement('DIV');
                        listContainer.className = 'live-editor-layouts-list-con';

                        var listSelect = _layoutsListSelect = document.createElement('SELECT');
                        listSelect.className = 'live-editor-layouts-list-select';
                        listContainer.appendChild(listSelect);
                        listSelect.addEventListener('change', function (e) {                            
                            if(e instanceof Event) {
                                selectLayout(e.target.value);
                                _autoSwitchToScreensharingLayoutAndBack = false;
                            }
                        });

                        for (let l in _layoutsList) {
                            let layoutOption = document.createElement('OPTION');
                            layoutOption.value = _layoutsList[l].key;
                            layoutOption.innerHTML = _layoutsList[l].title;
                            listSelect.appendChild(layoutOption);
                        }

                        var customSelect = _layoutsListCustomSelect = new CustomSelect(listSelect);
                        customSelect.customSelectDropDownEl.classList.add('live-editor-layouts-list');
                        customSelect.syncOptionsList = function () {
                            log('syncOptionsList START');
                           
                            let originalSelect = customSelect.originalSelect;
                            let optionsNumber = originalSelect.options.length;
                            for(let e = customSelect.optionsList.length - 1; e >= 0; e--) {
                                let option = customSelect.optionsList[e];
                                let sourceIsRemoved = true;
                                for (let h = 0; h < optionsNumber; h++) {
                                    if(option.originalOptionEl == originalSelect.options[h]) {
                                        sourceIsRemoved = false;
                                        break;
                                    }
                                }
                                if(sourceIsRemoved) {
                                    if (option.customOptionEl != null && option.customOptionEl.parentElement != null) {
                                        option.customOptionEl.parentElement.removeChild(option.customOptionEl);
                                    }
                                    customSelect.optionsList.splice(e, 1);
                                }
                            }

                            for (let j = 0; j < optionsNumber; j++) {
                                let optionAlreadyExists = false;
                                for(let l in customSelect.optionsList) {
                                    if(customSelect.optionsList[l].originalOptionEl == originalSelect.options[j]) {
                                        optionAlreadyExists = customSelect.optionsList[l];
                                    }
                                }

                                if(optionAlreadyExists != false) {
                                    customSelect.customSelectListEl.appendChild(optionAlreadyExists.customOptionEl);
                                    continue;
                                } else if (optionAlreadyExists == false) {
                                    let optionElementCon = document.createElement("DIV");
                                    optionElementCon.className = 'live-editor-custom-select-option';
                                    optionElementCon.dataset.selectValue = originalSelect.options[j].value;
                                    customSelect.customSelectListEl.appendChild(optionElementCon);
    
                                    optionElementCon.addEventListener("click", function(e) {
                                        customSelect.selectOption(e.currentTarget);
                                    });
    
                                    let optionElementText = document.createElement("DIV");
                                    optionElementText.className = 'live-editor-custom-select-option-text';
                                    optionElementText.innerHTML = originalSelect.options[j].innerHTML;
                                    optionElementCon.appendChild(optionElementText);
    
                                    customSelect.optionsList.push({
                                        originalOptionEl: originalSelect.options[j],
                                        customOptionEl: optionElementCon,
                                        value: originalSelect.options[j].value
                                    });
                                }
                            }
                            
                        };

                        var settingsBtn = document.createElement('DIV');
                        settingsBtn.className = 'live-editor-participants-list-config';
                        settingsBtn.innerHTML = tool.icons.settings;
                        settingsBtn.addEventListener('click', function () {
                            optionsColumn.canvasLayoutOptions.show();
                            let settingsDialogEl = optionsColumn.getSettingsDialog();
                            showSpecificControls(settingsDialogEl);
                        })

                        listContainer.appendChild(settingsBtn);

                        return listContainer;
                    }

                    function getSelectedLayout() {
                        if(!_layoutsListSelect) return 'tiledStreamingLayout';
                        return _layoutsListSelect.value;
                    }

                    function selectLayout(layoutKey, byHotKeys) {
                        log('selectLayout START', layoutKey)

                        let webrtcGroups = getWebrtcGroupListItems();
                       
                        _selectedLayout = layoutKey;

                        for(let g in webrtcGroups) {
                            tool.canvasComposer.videoComposer.updateWebRTCLayout(webrtcGroups[g].sourceInstance, layoutKey, null);
                        }

                        if(byHotKeys) {
                            _layoutsListCustomSelect.value = layoutKey;
                        }
                    }

                    function getSourcesList() {
                        return _sourcesList;
                    }

                    function getWebrtcGroupListItems() {
                        let webrtcGroups = [];
                        for (let i in _sourcesList) {
                            if(_sourcesList[i] && _sourcesList[i].sourceInstance && _sourcesList[i].sourceInstance.sourceType == 'group' && _sourcesList[i].sourceInstance.groupType == 'webrtc') {
                                webrtcGroups.push(_sourcesList[i]);
                            }
                        }
                        return webrtcGroups;
                        //return _participantsList.getWebrtcGroupListItem();
                    }

                    function showVisualSources() {
                        _sourcesListEl.innerHTML = '';
                        _sourcesListEl.appendChild(createSourcesList());
                        syncList();
                    }

                    function createSourcesCol() {
                        log('createSourcesCol');
                        if(_sceneSourcesColumnEl != null) return _sceneSourcesColumnEl;
                        
                        var sourcesColumnInner = document.createElement('DIV');
                        sourcesColumnInner.className = 'live-editor-sources-inner';

                        var layoutsListDropDownCon = _layoutsListDropDownCon = document.createElement('DIV');
                        layoutsListDropDownCon.className = 'live-editor-sources-layouts-con';
                        layoutsListDropDownCon.appendChild(createLayoutListDropDown());
                        sourcesColumnInner.appendChild(layoutsListDropDownCon);

                        var sourcesColumnBody = document.createElement('DIV');
                        sourcesColumnBody.className = 'live-editor-sources-body';
                        sourcesColumnInner.appendChild(sourcesColumnBody);
                        _sourcesListEl = sourcesColumnBody;

                        //_participantsList = new ParticipantsList();
                        //_sourcesListEl.appendChild(_participantsList.getListContainer());
                        _sourcesListEl.appendChild(createSourcesList());
                            //_participantsList.addTeleconferenceSource();
                        //}

                        if(getWebrtcGroupListItems().length == 0) {
                            addTeleconferenceSource();
                        }

                        _sceneSourcesColumnEl = sourcesColumnInner;
                        return sourcesColumnInner;
                    }

                    function update() {
                        _overlaySources.update();
                        syncList();
                    }

                    function updateLocalControlsButtonsState() {
                        log('updateLocalControlsButtonsState');

                        for(let i in _sourcesList) {
                            if (_sourcesList[i]._sourceInstance.sourceType != 'webrtc' || !_sourcesList[i]._sourceInstance.participant.isLocal) continue;
                            if(!_sourcesList[i].cameraBtnIcon || !_sourcesList[i].microphoneBtnIcon) continue;
                            let listItemInstance = _sourcesList[i];
                            var localParticipant = tool.webrtcSignalingLib.localParticipant();
                            var localMediaControls = tool.webrtcSignalingLib.localMediaControls;

                            var enabledVideoTracks = localParticipant.tracks.filter(function (t) {
                                return t.kind == 'video' && t.mediaStreamTrack != null && t.mediaStreamTrack.enabled;
                            }).length;

                            if (_webrtcUserInterface.getOptions().audioOnlyMode) {
                                log('updateLocalControlsButtonsState v1');
                                listItemInstance.cameraBtnIcon.innerHTML = _controlsToolIcons.moreOptions;
                            } else if (enabledVideoTracks == 0 && tool.webrtcSignalingLib.localParticipant().videoStream == null) {
                                log('updateLocalControlsButtonsState v2');
                                listItemInstance.cameraBtnIcon.innerHTML = _controlsToolIcons.disabledCamera;
                            } else if (!localMediaControls.cameraIsEnabled()) {
                                log('updateLocalControlsButtonsState v3');
                                listItemInstance.cameraBtnIcon.innerHTML = _controlsToolIcons.disabledCamera;
                            } else if (localMediaControls.cameraIsEnabled()) {
                                log('updateLocalControlsButtonsState v4');
                                listItemInstance.cameraBtnIcon.innerHTML = _controlsToolIcons.camera;
                            }

                            var enabledAudioTracks = localParticipant.tracks.filter(function (t) {
                                return t.kind == 'audio' && t.mediaStreamTrack != null && t.mediaStreamTrack.enabled;
                            }).length;

                            if (enabledAudioTracks == 0 && tool.webrtcSignalingLib.localParticipant().audioStream == null) {
                                log('updateLocalControlsButtonsState a1');
                                listItemInstance.microphoneBtnIcon.innerHTML = _controlsToolIcons.disabledMicrophone;
                            } else if (!localMediaControls.micIsEnabled()) {
                                log('updateLocalControlsButtonsState a2');
                                listItemInstance.microphoneBtnIcon.innerHTML = _controlsToolIcons.disabledMicrophone;
                            } else if (localMediaControls.micIsEnabled()) {
                                log('updateLocalControlsButtonsState a3');
                                listItemInstance.microphoneBtnIcon.innerHTML = _controlsToolIcons.microphone;
                            }
                        }
                    }

                    function getSelectedSource() {
                        return _selectedSource;
                    }

                    var addVideoPopup = (function () {
                        var _dialogEl = null;
                        var _popupDialog = null;

                        log('addVideoPopup')
                
                        var boxContent = _dialogEl = document.createElement('DIV');
                        boxContent.className = 'live-editor-dialog-window-content live-editor-dialog-window-add-file';

                        var boxContentText = document.createElement('DIV');
                        boxContentText.innerHTML = 'Please choose file from your computer or enter the link.';  
                        boxContent.appendChild(boxContentText);

                        var videoItemInput = document.createElement('INPUT');
                        videoItemInput.className = 'live-editor-dialog-window-add-file-file';
                        videoItemInput.type = 'file';
                        videoItemInput.name = 'fileVideoSource';
                        videoItemInput.accept = 'video/mp4, video/*';
                        boxContent.appendChild(videoItemInput);

                        videoItemInput.addEventListener('change', function (e) {
                            addVideoSource(e);
                            hideDialog();
                        })

                        var boxContentText2=document.createElement('DIV');
                        boxContentText2.innerHTML = 'OR';
                        boxContent.appendChild(boxContentText2);

                        var linkInput = document.createElement('INPUT');
                        linkInput.className = 'live-editor-dialog-window-add-file-link';
                        linkInput.type = 'text';
                        linkInput.placeholder = 'Enter the link';
                        linkInput.name = 'fileImageLink';
                        boxContent.appendChild(linkInput);

                        var dialogButtonsCon = document.createElement('DIV');
                        dialogButtonsCon.className = 'live-editor-dialog-window-add-file-buttons';
                        boxContent.appendChild(dialogButtonsCon);

                        var dialogOkButton = document.createElement('BUTTON');
                        dialogOkButton.className = 'live-editor-dialog-window-add-file-ok';
                        dialogOkButton.innerHTML = 'OK';
                        dialogButtonsCon.appendChild(dialogOkButton);

                        dialogOkButton.addEventListener('click', function (e) {
                            addVideoSource(linkInput.value);
                            hideDialog();
                        })

                        function showDialog(e) {
                            videoItemInput.value = '';
                            linkInput.value = '';
                            if(_popupDialog && !_popupDialog.active) {
                                _popupDialog.show();
                                return;
                            } else if(_popupDialog) {
                                return;
                            }
                            _popupDialog = new SimpleDialog({
                                content: _dialogEl, 
                                rectangleToShowIn: null,
                                title: 'Add video source'
                            });
                        }

                        function hideDialog() {
                            if(_popupDialog) _popupDialog.hide();
                        }

                        return {
                            hideDialog: hideDialog,
                            showDialog: showDialog
                        }
                    }())

                    var addImagePopup = (function () {
                        var _dialogEl = null;
                        var _popupDialog = null;

                        log('addImagePopup')
                        
                        var boxContent = _dialogEl = document.createElement('DIV');
                        boxContent.className = 'live-editor-dialog-window-content live-editor-dialog-window-add-file';
                        var boxContentText = document.createElement('DIV');
                        boxContentText.innerHTML = 'Please choose file from your computer or enter the link.';
                        boxContent.appendChild(boxContentText);

                        var imageItemInput = document.createElement('INPUT');
                        imageItemInput.className = 'live-editor-dialog-window-add-file-file';
                        imageItemInput.type = 'file';
                        imageItemInput.name = 'fileImageSource';
                        imageItemInput.accept = 'image/png, image/jpeg'
                        boxContent.appendChild(imageItemInput);

                        imageItemInput.addEventListener('change', function (e) {
                            addImageSource(e);
                            hideDialog();
                        })

                        var boxContentText2=document.createElement('DIV');
                        boxContentText2.innerHTML = 'OR';
                        boxContent.appendChild(boxContentText2);

                        var imageItemLinkInput = document.createElement('INPUT');
                        imageItemLinkInput.className = 'live-editor-dialog-window-add-file-link';
                        imageItemLinkInput.type = 'text';
                        imageItemLinkInput.placeholder = 'Enter the link';
                        imageItemLinkInput.name = 'fileImageLink';
                        boxContent.appendChild(imageItemLinkInput);

                        var dialogButtonsCon = document.createElement('DIV');
                        dialogButtonsCon.className = 'live-editor-dialog-window-add-file-buttons';
                        boxContent.appendChild(dialogButtonsCon);

                        var dialogOkButton = document.createElement('BUTTON');
                        dialogOkButton.className = 'live-editor-dialog-window-add-file-ok';
                        dialogOkButton.innerHTML = 'OK';
                        dialogButtonsCon.appendChild(dialogOkButton);

                        dialogOkButton.addEventListener('click', function (e) {
                            addImageSource(imageItemLinkInput.value);
                            hideDialog();
                        })

                        function showDialog(e) {
                            imageItemInput.value = '';
                            imageItemLinkInput.value = '';
                            if(_popupDialog && !_popupDialog.active) {
                                _popupDialog.show();
                                return;
                            } else if(_popupDialog) {
                                return;
                            }
                            _popupDialog = new SimpleDialog({
                                content: _dialogEl, 
                                rectangleToShowIn: null,
                                title: 'Add image source'
                            });
                        }

                        function hideDialog() {
                            if(_popupDialog) _popupDialog.hide();
                        }

                        return {
                            hideDialog: hideDialog,
                            showDialog: showDialog
                        }
                    }())

                    var addCameraPopup = (function () {
                        var state = {
                            _mediaStream: null,
                            _source: null,
                            rawVideoInputDevices: [],
                            devicesList: [],
                            constraints: { audio: false, video: { width: { ideal: 4096 }, height: { ideal: 2160 } } },
                            set mediaStream(value) {
                                this._mediaStream = value;
        
                                if (_okButtonEl) {
                                    _okButtonEl.classList.remove('live-editor-button-inactive');
                                }
                            },
                            get mediaStream() { return this._mediaStream; },
                            set source(source) {
                                this.mediaStream = source.sourceInstance.mediaStream;
                                this._source = source;
                                if (_nameInputEl) {
                                    _nameInputEl.value = source.sourceInstance.name;
                                }
                            },
                            get source() { return this._source; },
                        }
                        var options = null;
                        var _popupDialog = null;
                        var _dialogueEl = null;
                        var _devicesListEl = null;
                        var _cameraPreviewParentEl = null;
                        var _previewVideoEl = null;
                        var _nameInputEl = null;
                        var _okButtonEl = null;
                        var _noticesEl = null;
        
                        log('addCameraPopup')
        
                        function setDefaultSourceName() {
                            let camerasNumber = 0;
                            for (let i in _sourcesList) {
                                if (_sourcesList[i].sourceInstance.sourceType == 'videoInput') {
                                    camerasNumber++;
                                }
                            }
                            sourceNameInput.value = 'Camera ' + (camerasNumber + 1);
        
                        }
        
                        function updateDevicesList() {
                            for (let l in state.devicesList) {
                                if (state.devicesList[l].optionEl && state.devicesList[l].optionEl.parentElement) {
                                    state.devicesList[l].optionEl.parentElement.removeChild(state.devicesList[l].optionEl);
                                }
                            }
                            state.devicesList = [];
                            for (let i in state.rawVideoInputDevices) {
                                let device = state.rawVideoInputDevices[i];
                                let option = document.createElement('OPTION');
                                option.value = device.deviceId
                                option.innerHTML = device.label
                                _devicesListEl.appendChild(option);
                                state.devicesList.push({
                                    optionEl: option,
                                    id: device.deviceId,
                                    label: device.label
                                });
                            }
                        }
        
                        function updatePreview() {
                            if (_previewVideoEl != null) {
                                _previewVideoEl.srcObject = state.mediaStream;
                                _previewVideoEl.play();
                                return;
                            }
                            var video = _previewVideoEl = document.createElement('VIDEO');
                            video.srcObject = state.mediaStream;
                            video.muted = true;
                            video.play();
                            _cameraPreviewParentEl.appendChild(video);
                        }
                        function getVideoInputAfterSelectedOptions() {
                            if (state.mediaStream != null && !options.source) {
                                let tracks = state.mediaStream.getTracks();
                                tracks.forEach(function (track) {
                                    track.stop();
                                });
                            }
        
                            let selectedDeviceId = getSelectedCameraOption();
                            state.constraints.video.deviceId = { exact: selectedDeviceId };
    
                            delete state.constraints.video.width;
                            delete state.constraints.video.height;
        
                            delete state.constraints.video.frameRate;
        
                            log('getVideoInputAfterSelectedOptions', state.constraints.video);
                            return navigator.mediaDevices.getUserMedia(state.constraints)
                                .then(function (mediaStream) {
                                    state.mediaStream = mediaStream;
                                })
                                .catch(onErrorHandler);
                        }
        
                        function updateSelectedOption() {
                            log('updateSelectedOption');
                            if (state.mediaStream) {
                                let deviceId = state.mediaStream.getVideoTracks()[0].getSettings().deviceId;
                                for (let i in state.devicesList) {
                                    if (state.devicesList[i].id == deviceId) {
                                        log('updateSelectedOption: selected');
                                        state.devicesList[i].optionEl.selected = true;
                                    }
                                }
                            }
                        }
        
                        function getSelectedCameraOption() {
                            let selectedCameraId = _devicesListEl.value;
                            if (!selectedCameraId || selectedCameraId == '') {
                                selectedCameraId = state.devicesList[0].id;
                            }
                            return selectedCameraId;
                        }
        
                        function loadInputDevicesAndGetStream() {
                            state.rawVideoInputDevices = [];
                            log('loadInputDevicesAndGetStream', state);
                            return navigator.mediaDevices.getUserMedia(state.constraints)
                                .then(function (mediaStream) {
                                    state.mediaStream = mediaStream;
                                    log('loadInputDevicesAndGetStream 2', state, state.mediaStream);

                                    return navigator.mediaDevices.enumerateDevices()
                                        .then(function (devices) {
                                            devices.forEach(function (device) {
                                                if (device.kind == 'videoinput') state.rawVideoInputDevices.push(device);
                                            });
                                        })
                                        .catch(onErrorHandler);
                                })
                                .catch(onErrorHandler);
        
        
                        }
        
                        function loadDialog() {
                            if (state.rawVideoInputDevices.length != 0) {
                                if (options.source != null) {
                                    state.source = options.source;
                                    updatePreview();
                                    updateSelectedOption();
                                } else {
                                    state.mediaStream = null;
                                    state._source = null;
                                    state.constraints = { audio: false, video: { width: { ideal: 4096 }, height: { ideal: 2160 } } };
                                    loadInputDevicesAndGetStream().then(function () {
                                        updateDevicesList();
                                        updatePreview();
                                        updateSelectedOption();
                                        setDefaultSourceName();
                                    })
                                }
        
                            } else {
                                //load dialogue first time
                                return navigator.mediaDevices.enumerateDevices()
                                    .then(function (devices) {
                                        let videoInputDevices = 0;
                                        devices.forEach(function (device) {
                                            if (device.kind == 'videoinput') videoInputDevices++
                                        });
                                        if (videoInputDevices != 0) {
                                            loadInputDevicesAndGetStream().then(function () {
                                                updateDevicesList();
                                                updatePreview();
                                                updateSelectedOption();
                                                setDefaultSourceName();
                                            })
                                        } else {
                                            showNotice('No video input devices detected');
                                        }
                                    })
                                    .catch(onErrorHandler);
        
                            }
                        }
        
                        function showDialog(optns) {
                            options = optns;
                            if(_popupDialog && !_popupDialog.active) {
                                _popupDialog.show();
                                return;
                            } else if(_popupDialog) {
                                return;
                            }
                            _popupDialog = new SimpleDialog({
                                content: _dialogueEl, 
                                rectangleToShowIn: null,
                                className: 'live-editor-add-media-input',
                                title: 'Add camera source'
                            });

                            loadDialog();
                        }
        
                        function onErrorHandler(error) {
                            log(error);
                            _noticesEl.innerHTML = error.message;
                        }
        
                        function showNotice(notice) {
                            _noticesEl.innerHTML = notice;
                        }
        
                        function hideDialog(okBtnClicked) {        
                            if (!okBtnClicked && state.mediaStream != null && !options.source) {
        
                                let tracks = state.mediaStream.getTracks();
        
                                for (let t in tracks) {
                                    tracks[t].stop();
                                }
                            }
                            
                            if(_popupDialog) _popupDialog.hide();
                            
                        }
                    
                        var boxContent = _dialogueEl = document.createElement('DIV');
                        boxContent.className = 'live-editor-dialog-window-content';
                        var cameraPreviewBox = document.createElement('DIV');
                        cameraPreviewBox.className = 'live-editor-dialog-camera-preview';
                        boxContent.appendChild(cameraPreviewBox);

                        var cameraPreviewInner = _cameraPreviewParentEl = document.createElement('DIV');
                        cameraPreviewInner.className = 'live-editor-dialog-camera-preview-inner';
                        cameraPreviewBox.appendChild(cameraPreviewInner);

                        var cameraPreviewNotices = _noticesEl = document.createElement('DIV');
                        cameraPreviewNotices.className = 'live-editor-dialog-notices';
                        cameraPreviewBox.appendChild(cameraPreviewNotices);

                        var addSourceControls = document.createElement('DIV');
                        addSourceControls.className = 'live-editor-dialog-add-source-controls';
                        boxContent.appendChild(addSourceControls);

                        var addSourceControlsInner = document.createElement('DIV');
                        addSourceControlsInner.className = 'live-editor-dialog-add-source-controls-inner';
                        addSourceControls.appendChild(addSourceControlsInner);
        
                        var videoInputDevicesCon = document.createElement('DIV');
                        videoInputDevicesCon.className = 'live-editor-dialog-add-source-controls-item live-editor-dialog-add-source-controls-devices';
                        addSourceControlsInner.appendChild(videoInputDevicesCon);

                        var addSourceControlsDevicesCaption = document.createElement('DIV');
                        addSourceControlsDevicesCaption.className = 'live-editor-dialog-add-source-controls-caption';
                        addSourceControlsDevicesCaption.innerHTML = 'Devices ';
                        videoInputDevicesCon.appendChild(addSourceControlsDevicesCaption);

                        var addSourceControlsDevicesReload = document.createElement('DIV');
                        addSourceControlsDevicesReload.className = 'live-editor-dialog-add-source-controls-reload';
                        addSourceControlsDevicesReload.innerHTML = tool.icons.reload;
                        addSourceControlsDevicesCaption.appendChild(addSourceControlsDevicesReload);

                        var videoInputDevicesListCon = document.createElement('DIV');
                        videoInputDevicesListCon.className = 'live-editor-dialog-add-source-controls-config live-editor-dialog-add-source-list-con';
                        videoInputDevicesCon.appendChild(videoInputDevicesListCon);

                        var videoInputDevicesList = _devicesListEl = document.createElement('SELECT');
                        videoInputDevicesList.className = 'live-editor-dialog-add-source-devices-list';
                        videoInputDevicesListCon.appendChild(videoInputDevicesList);
        
                        var sourceNameCon = document.createElement('DIV');
                        sourceNameCon.className = 'live-editor-dialog-add-source-controls-item live-editor-dialog-add-source-controls-name';
                        addSourceControlsInner.appendChild(sourceNameCon);

                        var sourceNameCaption = document.createElement('DIV');
                        sourceNameCaption.className = 'live-editor-dialog-add-source-controls-caption';
                        sourceNameCaption.innerHTML = 'Name';
                        sourceNameCon.appendChild(sourceNameCaption);

                        var sourceNameInputCon = document.createElement('DIV');
                        sourceNameInputCon.className = 'live-editor-dialog-add-source-controls-config live-editor-dialog-add-source-name-con';
                        sourceNameCon.appendChild(sourceNameInputCon);
                        
                        var sourceNameInput = _nameInputEl = document.createElement('INPUT');
                        sourceNameInput.className = 'live-editor-dialog-add-source-name-input';
                        sourceNameInput.type = 'text';
                        sourceNameInputCon.appendChild(sourceNameInput);
        
                        var sourceTypeCon = document.createElement('DIV');
                        sourceTypeCon.className = 'live-editor-dialog-add-source-controls-item live-editor-dialog-add-source-controls-type';  
                        addSourceControlsInner.appendChild(sourceTypeCon);
                        
                        var sourceTypeCaption = document.createElement('DIV');
                        sourceTypeCaption.className = 'live-editor-dialog-add-source-controls-caption';
                        sourceTypeCaption.innerHTML = '';
                        sourceTypeCon.appendChild(sourceTypeCaption);
                        
                        var sourceTypeInputCon = document.createElement('DIV');
                        sourceTypeInputCon.className = 'live-editor-dialog-add-source-controls-config live-editor-dialog-add-source-type-con';
                        sourceTypeCon.appendChild(sourceTypeInputCon);
                        
                        var separateSourceTypeLabel = document.createElement('LABEL');
                        separateSourceTypeLabel.className = 'live-editor-dialog-add-source-type-label';
                        sourceTypeInputCon.appendChild(separateSourceTypeLabel);
                        
                        var separateSourceTypeInput = document.createElement('INPUT');
                        separateSourceTypeInput.className = 'live-editor-dialog-add-source-type-input';
                        separateSourceTypeInput.name = 'live-editor-video_input_type';
                        separateSourceTypeInput.type = 'radio';
                        separateSourceTypeInput.value = 'separate';
                        separateSourceTypeInput.checked = 'true';
                        separateSourceTypeLabel.appendChild(separateSourceTypeInput);
                        
                        var separateSourceTypeLabelText = document.createElement('SPAN');
                        separateSourceTypeLabelText.className = 'live-editor-dialog-add-source-type-label-text';
                        separateSourceTypeLabelText.innerHTML = 'Visible only in livestream';
                        separateSourceTypeLabel.appendChild(separateSourceTypeLabelText);
                        
                        var webrtcSourceTypeLabel = document.createElement('LABEL');
                        webrtcSourceTypeLabel.className = 'live-editor-dialog-add-source-type-label';
                        sourceTypeInputCon.appendChild(webrtcSourceTypeLabel);
                        
                        var webrtcSourceTypeInput = document.createElement('INPUT');
                        webrtcSourceTypeInput.className = 'live-editor-dialog-add-source-type-input';
                        webrtcSourceTypeInput.name = 'live-editor-video_input_type';
                        webrtcSourceTypeInput.type = 'radio';
                        webrtcSourceTypeInput.value = 'webrtc';
                        webrtcSourceTypeLabel.appendChild(webrtcSourceTypeInput);
                        
                        var webrtcSourceTypeLabelText = document.createElement('SPAN');
                        webrtcSourceTypeLabelText.className = 'live-editor-dialog-add-source-type-label-text';
                        webrtcSourceTypeLabelText.innerHTML = 'Visible to chat and in a livestream';
                        webrtcSourceTypeLabel.appendChild(webrtcSourceTypeLabelText);
        
                        var dialogButtonsCon = document.createElement('DIV');
                        dialogButtonsCon.className = 'live-editor-dialog-add-source-buttons-con';
                        addSourceControls.appendChild(dialogButtonsCon);
                        var okButton = _okButtonEl = document.createElement('BUTTON');
                        okButton.innerHTML = 'OK';
                        okButton.className = 'live-editor-dialog-add-source-ok-btn live-editor-button live-editor-button-inactive';
                        dialogButtonsCon.appendChild(okButton);
        
                        _devicesListEl.addEventListener('change', function (e) {
                            getVideoInputAfterSelectedOptions().then(function () {
                                updatePreview();
                            });
                        })
        
                        addSourceControlsDevicesReload.addEventListener('click', function (e) {
                            if (state.mediaStream != null && !options.source) {
                                let tracks = state.mediaStream.getTracks();
                                for (let t in tracks) {
                                    tracks[t].stop();
                                }
                            }
                            loadDialog();
                        })
        
                        okButton.addEventListener('click', function (e) {
                            let width = 'default', height = 'default', frameRate = 'default';
                            if (state.constraints.video.width != null) {
                                if (typeof state.constraints.video.width == 'object') {
                                    width = state.constraints.video.width.exact;
                                } else {
                                    width = state.constraints.video.width;
                                }
                            }
                            if (state.constraints.video.height != null) {
                                if (typeof state.constraints.video.height == 'object') {
                                    height = state.constraints.video.height.exact;
                                } else {
                                    height = state.constraints.video.height;
                                }
                            }
                            if (state.constraints.video.frameRate != null) {
                                if (typeof state.constraints.video.frameRate == 'object') {
                                    frameRate = state.constraints.video.frameRate.exact;
                                } else {
                                    frameRate = state.constraints.video.frameRate;
                                }
                            }
                            log('onok state', state.mediaStream);
                            if (options && options.onOk != null) {
                                let selectedDeviceId = getSelectedCameraOption();

                                options.onOk({
                                    stream: state.mediaStream,
                                    name: sourceNameInput.value,
                                    originalSize: { width: width, height: height },
                                    frameRate: frameRate,
                                    deviceId: selectedDeviceId,
                                    sourceType: separateSourceTypeInput.checked ? 'separate' : 'webrtc'
                                });
                            }
                            hideDialog(true);
                        })
        
                        return {
                            hideDialog: hideDialog,
                            showDialog: showDialog,
                        }
                    }())

                    /*var addTeleconferencePopup = (function () {
                        var _dialogEl = null;
                        var _isHidden = true;

                        log('addTeleconferencePopup')
                        var dialog=document.createElement('DIV');
                        dialog.className = 'live-editor-dialog-box live-editor-dialog-box-add-new-s live-editor-add-tc live-editor-hidden';
                        _dialogEl = dialog;
                        var dialogTitle=document.createElement('H3');
                        dialogTitle.innerHTML = 'Add teleconference';
                        dialogTitle.className = 'live-editor-dialog-header Q_dialog_title';

                        var dialogInner=document.createElement('DIV');
                        dialogInner.className = 'live-editor-dialog-inner';
                        var boxContent=document.createElement('DIV');
                        boxContent.className = 'live-editor-streaming-box live-editor-box';

                        var sourceNameCon = document.createElement('DIV');
                        sourceNameCon.className = 'live-editor-sources-add-source-name-con';
                        var sourceName = document.createElement('INPUT');
                        sourceName.className = 'live-editor-sources-add-source-name';
                        sourceName.type = 'text';
                        sourceName.placeholder = 'Teleconference Source Name';
                        sourceName.value = 'Video Chat';
                        sourceName.name = 'sourceName';
                        sourceNameCon.appendChild(sourceName);

                        boxContent.appendChild(sourceNameCon);

                        var close=document.createElement('div');
                        close.className = 'live-editor-close-dialog-sign';
                        close.style.backgroundImage = 'url("' + Q.url("{{Q}}/img/apply.png") + '"';
                        close.style.backgroundRepeat = 'no-repeat';
                        close.style.backgroundSize = 'cover';
                        close.addEventListener('click', function() {
                            if(sourceName.value != '') {
                                var val = sourceName.value;
                                addTeleconferenceSource(val);
                                hideDialog();
                                sourceName.value = '';
                            }
                        });
                        dialogInner.appendChild(dialogTitle);

                        dialog.appendChild(close);
                        dialogInner.appendChild(boxContent);
                        dialog.appendChild(dialogInner);

                        _webrtcUserInterface.roomsMediaContainer().appendChild(dialog);
                        setTimeout(function () {
                            Q.activate(
                                Q.Tool.setUpElement(
                                    dialog, // or pass an existing element
                                    "Q/resize",
                                    {
                                        move: true,
                                        activateOnElement: dialogTitle,
                                        resize: false,
                                        active: true,
                                        moveWithinArea: 'window',
                                    }
                                ),
                                {},
                                function () {

                                }
                            );
                        }, 3000)

                        var controlsRect = _controlsTool.controlBar.getBoundingClientRect();
                        var dialogWidth = 400;
                        dialog.style.width = dialogWidth + 'px';
                        log('dialogWidth', dialogWidth);
                        if(Q.info.isMobile) {
                            dialog.style.left = (window.innerWidth / 2) - (dialogWidth / 2) + 'px';
                            dialog.style.bottom = (controlsRect.height + 10) + 'px';
                        } else {
                            dialog.style.left = (window.innerWidth / 2) - (dialogWidth / 2) + 'px';
                            dialog.style.top = (window.innerHeight/ 2 - 100) + 'px';
                        }

                        close.addEventListener('click', function () {
                            hideDialog();
                        });

                        function showDialog(e) {
                            if(_dialogEl.classList.contains('live-editor-hidden')) {
                                _dialogEl.classList.remove('live-editor-hidden');
                                var _clientX = e.clientX;
                                var _clientY = e.clientY;

                                _isHidden = false;

                                var controlsRect = _controlsTool.controlBar.getBoundingClientRect();
                                if(Q.info.isMobile) {
                                    dialog.style.left = (window.innerWidth / 2) - (dialogWidth / 2) + 'px';
                                    dialog.style.top = (controlsRect.height + 10) + 'px';
                                } else {
                                    dialog.style.left = (_clientX + 50) + 'px';
                                    dialog.style.top = (_clientY - 200) + 'px';
                                }
                            }
                        }

                        function hideDialog() {
                            if(!_dialogEl.classList.contains('live-editor-hidden')){
                                _dialogEl.classList.add('live-editor-hidden');
                                _isHidden = true;
                            }
                        }

                        function toggle(e) {
                            if(_isHidden) {
                                showDialog(e);
                            } else hideDialog(e);
                        }

                        return {
                            hideDialog: hideDialog,
                            showDialog: showDialog,
                            toggle: toggle
                        }
                    }())*/

                    var addAudioPopup = (function () {
                        var _popupDialog = null;
                        var _dialogEl = null;

                        log('addAudioPopup')
                        
                        var boxContent = _dialogEl = document.createElement('DIV');
                        boxContent.className = 'live-editor-dialog-window-content live-editor-dialog-window-add-file';
                        var boxContentText = document.createElement('DIV');
                        boxContentText.innerHTML = 'Please choose file from your computer or enter the link.';
                        boxContent.appendChild(boxContentText);
                        
                        var videoItemInput = document.createElement('INPUT');
                        videoItemInput.className = 'live-editor-dialog-window-add-file-file';
                        videoItemInput.type = 'file';
                        videoItemInput.name = 'fileAudioSource';
                        videoItemInput.accept = 'audio/mp3, audio/*'
                        boxContent.appendChild(videoItemInput);

                        videoItemInput.addEventListener('change', function (e) {
                            addAudioSource(e);
                            hideDialog();
                        })

                        var boxContentText2=document.createElement('DIV');
                        boxContentText2.innerHTML = 'OR';
                        boxContent.appendChild(boxContentText2);
                        
                        var linkInput = document.createElement('INPUT');
                        linkInput.className = 'live-editor-dialog-window-add-file-file';
                        linkInput.type = 'text';
                        linkInput.placeholder = 'Enter the link';
                        linkInput.name = 'fileImageLink';
                        boxContent.appendChild(linkInput);

                        var dialogButtonsCon = document.createElement('DIV');
                        dialogButtonsCon.className = 'live-editor-dialog-window-add-file-buttons';
                        boxContent.appendChild(dialogButtonsCon);

                        var dialogOkButton = document.createElement('BUTTON');
                        dialogOkButton.className = 'live-editor-dialog-window-add-file-ok';
                        dialogOkButton.innerHTML = 'OK';
                        dialogButtonsCon.appendChild(dialogOkButton);

                        dialogOkButton.addEventListener('click', function (e) {
                            addAudioSource(linkInput.value);
                            hideDialog();
                        })

                        function showDialog(e) {
                            videoItemInput.value = '';
                            linkInput.value = '';
                            if(_popupDialog && !_popupDialog.active) {
                                _popupDialog.show();
                                return;
                            } else if(_popupDialog) {
                                return;
                            }
                            _popupDialog = new SimpleDialog({
                                content: _dialogEl, 
                                rectangleToShowIn: null,
                                className: 'live-editor-add-audio',
                                title: 'Add audio source'
                            });
                        }

                        function hideDialog() {
                            if(_popupDialog) _popupDialog.hide();
                        }

                        return {
                            hideDialog: hideDialog,
                            showDialog: showDialog
                        }
                    }())

                    var addMicrophoneAudioPopup = (function () {
                        var state = {
                            _mediaStream: null,
                            _source: null,
                            rawAudioInputDevices: [],
                            devicesList: [],
                            constraints: { audio: true, video: false },
                            set mediaStream(value) {
                                this._mediaStream = value;
        
                                if (_okButtonEl) {
                                    _okButtonEl.classList.remove('live-editor-button-inactive');
                                }
                            },
                            get mediaStream() { return this._mediaStream; },
                            set source(source) {
                                this.mediaStream = source.sourceInstance.mediaStream;
                                this._source = source;
                                if (_nameInputEl) {
                                    _nameInputEl.value = source.sourceInstance.name;
                                }
                            },
                            get source() { return this._source; },
                        }
                        var options = null;
                        var _popupDialog = null;
                        var _dialogueEl = null;
                        var _devicesListEl = null;
                        var _nameInputEl = null;
                        var _okButtonEl = null;
                        var _noticesEl = null;
        
                        log('addMicrophoneAudioPopup')
        
                        function setDefaultSourceName() {
                            let micsNumber = 0;
                            for (let i in _sourcesList) {
                                if (_sourcesList[i].sourceInstance.sourceType == 'audioInput') {
                                    micsNumber++;
                                }
                            }
                            sourceNameInput.value = 'Audio Input ' + (micsNumber + 1);
        
                        }
        
                        function updateDevicesList() {
                            log('addMicrophoneAudioPopup: updateDevicesList');
                            for (let l in state.devicesList) {
                                if (state.devicesList[l].optionEl && state.devicesList[l].optionEl.parentElement) {
                                    state.devicesList[l].optionEl.parentElement.removeChild(state.devicesList[l].optionEl);
                                }
                            }
                            state.devicesList = [];
                            for (let i in state.rawAudioInputDevices) {
                                let device = state.rawAudioInputDevices[i];
                                let option = document.createElement('OPTION');
                                option.value = device.deviceId
                                option.innerHTML = device.label
                                _devicesListEl.appendChild(option);
                                state.devicesList.push({
                                    optionEl: option,
                                    id: device.deviceId,
                                    label: device.label
                                });
                            }
                        }
        
                        function getAudioInputAfterSelectedOptions() {
                            if (state.mediaStream != null && !options.source) {
                                let tracks = state.mediaStream.getTracks();
                                tracks.forEach(function (track) {
                                    track.stop();
                                });
                            }
        
                            let selectedDeviceId = getSelectedMicOption();
                            state.constraints.video.deviceId = { exact: selectedDeviceId };
    
                            return navigator.mediaDevices.getUserMedia(state.constraints)
                                .then(function (mediaStream) {
                                    state.mediaStream = mediaStream;
                                })
                                .catch(onErrorHandler);
                        }
        
                        function updateSelectedOption() {
                            log('updateSelectedOption');
                            if (state.mediaStream) {
                                let deviceId = state.mediaStream.getAudioTracks()[0].getSettings().deviceId;
                                for (let i in state.devicesList) {
                                    if (state.devicesList[i].id == deviceId) {
                                        log('updateSelectedOption: selected');
                                        state.devicesList[i].optionEl.selected = true;
                                    }
                                }
                            }
                        }
        
                        function getSelectedMicOption() {
                            let selectedCameraId = _devicesListEl.value;
                            if (!selectedCameraId || selectedCameraId == '') {
                                selectedCameraId = state.devicesList[0].id;
                            }
                            return selectedCameraId;
                        }
        
                        function loadInputDevicesAndGetStream() {
                            state.rawAudioInputDevices = [];
                            log('loadInputDevicesAndGetStream', state.constraints.video.frameRate);
                            return navigator.mediaDevices.getUserMedia(state.constraints)
                                .then(function (mediaStream) {
                                    state.mediaStream = mediaStream;
                                    return navigator.mediaDevices.enumerateDevices()
                                        .then(function (devices) {
                                            devices.forEach(function (device) {
                                                if (device.kind == 'audioinput') state.rawAudioInputDevices.push(device);
                                            });
                                        })
                                        .catch(onErrorHandler);
                                })
                                .catch(onErrorHandler);
        
        
                        }
        
                        function loadDialog() {
                            if (state.rawAudioInputDevices.length != 0) {
                                if (options.source != null) {
                                    state.source = options.source;
                                    updateSelectedOption();
                                } else {
                                    loadInputDevicesAndGetStream().then(function () {
                                        updateDevicesList();
                                        updateSelectedOption();
                                        setDefaultSourceName();
                                    })
                                }
        
                            } else {
                                //load dialogue first time
                                return navigator.mediaDevices.enumerateDevices()
                                    .then(function (devices) {
                                        let audioInputDevices = 0;
                                        devices.forEach(function (device) {
                                            if (device.kind == 'audioinput') audioInputDevices++
                                        });
                                        if (audioInputDevices != 0) {
                                            loadInputDevicesAndGetStream().then(function () {
                                                updateDevicesList();
                                                updateSelectedOption();
                                                setDefaultSourceName();
                                            })
                                        } else {
                                            showNotice('No audio input devices detected');
                                        }
                                    })
                                    .catch(onErrorHandler);
        
                            }
                        }
        
                        function showDialog(optns) {
                            options = optns;
                            if(_popupDialog && !_popupDialog.active) {
                                _popupDialog.show();
                                return;
                            } else if(_popupDialog) {
                                return;
                            }
                            _popupDialog = new SimpleDialog({
                                content: _dialogueEl, 
                                rectangleToShowIn: null,
                                className: 'live-editor-add-media-input live-editor-add-audio-input',
                                title: 'Add input audio source'
                            });

                            loadDialog();
                        }
        
                        function onErrorHandler(error) {
                            log(error);
                            //_noticesEl.innerHTML = error.message;
                        }
        
                        function showNotice(notice) {
                            log('addMicrophoneAudioPopup', notice);
                            //_noticesEl.innerHTML = notice;
                        }
        
                        function hideDialog(okBtnClicked) {
        
                            if (!okBtnClicked && state.mediaStream != null && !options.source) {
        
                                let tracks = state.mediaStream.getTracks();
        
                                for (let t in tracks) {
                                    tracks[t].stop();
                                }
                            }
                            if(_popupDialog) _popupDialog.hide();
        
                            state.mediaStream = null;
                            state._source = null;
                            state.constraints = { audio: true, video: false};
                        }
                        
                        var boxContent = _dialogueEl = document.createElement('DIV');
                        boxContent.className = 'live-editor-dialog-window-content live-editor-dialog-window-add-mic';
        
                        var addSourceControls = document.createElement('DIV');
                        addSourceControls.className = 'live-editor-dialog-add-source-controls';
                        boxContent.appendChild(addSourceControls);
                        
                        var addSourceControlsInner = document.createElement('DIV');
                        addSourceControlsInner.className = 'live-editor-dialog-add-source-controls-inner';
                        addSourceControls.appendChild(addSourceControlsInner);

                        var audioInputDevicesCon = document.createElement('DIV');
                        audioInputDevicesCon.className = 'live-editor-dialog-add-source-controls-item live-editor-dialog-add-source-controls-devices';
                        addSourceControlsInner.appendChild(audioInputDevicesCon);
                        
                        var addSourceControlsDevicesCaption = document.createElement('DIV');
                        addSourceControlsDevicesCaption.className = 'live-editor-dialog-add-source-controls-caption';
                        addSourceControlsDevicesCaption.innerHTML = 'Devices ';
                        audioInputDevicesCon.appendChild(addSourceControlsDevicesCaption);
                        
                        var addSourceControlsDevicesReload = document.createElement('DIV');
                        addSourceControlsDevicesReload.className = 'live-editor-dialog-add-source-controls-reload';
                        addSourceControlsDevicesReload.innerHTML = tool.icons.reload;
                        addSourceControlsDevicesCaption.appendChild(addSourceControlsDevicesReload);
                        
                        var audioInputDevicesListCon = document.createElement('DIV');
                        audioInputDevicesListCon.className = 'live-editor-dialog-add-source-controls-config live-editor-dialog-add-source-list-con';
                        audioInputDevicesCon.appendChild(audioInputDevicesListCon);
                        
                        var audioInputDevicesList = _devicesListEl = document.createElement('SELECT');
                        audioInputDevicesList.className = 'live-editor-dialog-add-source-devices-list';
                        audioInputDevicesListCon.appendChild(audioInputDevicesList);
        
                        var sourceNameCon = document.createElement('DIV');
                        sourceNameCon.className = 'live-editor-dialog-add-source-controls-item live-editor-dialog-add-source-controls-name';
                        addSourceControlsInner.appendChild(sourceNameCon);
                        
                        var sourceNameCaption = document.createElement('DIV');
                        sourceNameCaption.className = 'live-editor-dialog-add-source-controls-caption';
                        sourceNameCaption.innerHTML = 'Name';
                        sourceNameCon.appendChild(sourceNameCaption);
                        
                        var sourceNameInputCon = document.createElement('DIV');
                        sourceNameInputCon.className = 'live-editor-dialog-add-source-controls-config live-editor-dialog-add-source-name-con';
                        sourceNameCon.appendChild(sourceNameInputCon);
                        
                        var sourceNameInput = _nameInputEl = document.createElement('INPUT');
                        sourceNameInput.className = 'live-editor-dialog-add-source-name-input';
                        sourceNameInput.type = 'text';
                        sourceNameInputCon.appendChild(sourceNameInput);
        
                        var sourceTypeCon = document.createElement('DIV');
                        sourceTypeCon.className = 'live-editor-dialog-add-source-controls-item live-editor-dialog-add-source-controls-type';
                        addSourceControlsInner.appendChild(sourceTypeCon);
                        var sourceTypeCaption = document.createElement('DIV');
                        sourceTypeCaption.className = 'live-editor-dialog-add-source-controls-caption';
                        sourceTypeCaption.innerHTML = '';
                        sourceTypeCon.appendChild(sourceTypeCaption);
                        
                        var sourceTypeInputCon = document.createElement('DIV');
                        sourceTypeInputCon.className = 'live-editor-dialog-add-source-controls-config live-editor-dialog-add-source-type-con';
                        sourceTypeCon.appendChild(sourceTypeInputCon);
                        
                        var separateSourceTypeLabel = document.createElement('LABEL');
                        separateSourceTypeLabel.className = 'live-editor-dialog-add-source-type-label';
                        sourceTypeInputCon.appendChild(separateSourceTypeLabel);
                        
                        var separateSourceTypeInput = document.createElement('INPUT');
                        separateSourceTypeInput.className = 'live-editor-dialog-add-source-type-input';
                        separateSourceTypeInput.name = 'live-editor-audio_input_type';
                        separateSourceTypeInput.type = 'radio';
                        separateSourceTypeInput.value = 'separate';
                        separateSourceTypeInput.checked = 'true';
                        separateSourceTypeLabel.appendChild(separateSourceTypeInput);
                        
                        var separateSourceTypeLabelText = document.createElement('SPAN');
                        separateSourceTypeLabelText.className = 'live-editor-dialog-add-source-type-label-text';
                        separateSourceTypeLabelText.innerHTML = 'Only livestream viewers will hear this source';
                        separateSourceTypeLabel.appendChild(separateSourceTypeLabelText);
                        
                        var webrtcSourceTypeLabel = document.createElement('LABEL');
                        webrtcSourceTypeLabel.className = 'live-editor-dialog-add-source-type-label';
                        sourceTypeInputCon.appendChild(webrtcSourceTypeLabel);
                        
                        var webrtcSourceTypeInput = document.createElement('INPUT');
                        webrtcSourceTypeInput.className = 'live-editor-dialog-add-source-type-input';
                        webrtcSourceTypeInput.name = 'live-editor-audio_input_type';
                        webrtcSourceTypeInput.type = 'radio';
                        webrtcSourceTypeInput.value = 'webrtc';
                        webrtcSourceTypeLabel.appendChild(webrtcSourceTypeInput);

                        var webrtcSourceTypeLabelText = document.createElement('SPAN');
                        webrtcSourceTypeLabelText.className = 'live-editor-dialog-add-source-type-label-text';
                        webrtcSourceTypeLabelText.innerHTML = 'Evryone will hear this source';
                        webrtcSourceTypeLabel.appendChild(webrtcSourceTypeLabelText);
        
                        var dialogButtonsCon = document.createElement('DIV');
                        dialogButtonsCon.className = 'live-editor-dialog-add-source-buttons-con';
                        boxContent.appendChild(dialogButtonsCon);
                        var okButton = _okButtonEl = document.createElement('BUTTON');
                        okButton.innerHTML = 'OK';
                        okButton.className = 'live-editor-dialog-add-source-ok-btn live-editor-button live-editor-button-inactive';
                        dialogButtonsCon.appendChild(okButton);

                        _devicesListEl.addEventListener('change', function (e) {
                            getAudioInputAfterSelectedOptions().then(function () {

                            });
                        })
        
                        addSourceControlsDevicesReload.addEventListener('click', function (e) {
                            if (state.mediaStream != null && !options.source) {
                                let tracks = state.mediaStream.getTracks();
                                for (let t in tracks) {
                                    tracks[t].stop();
                                }
                            }
                            loadDialog();
                        })
        
                        okButton.addEventListener('click', function (e) {
                            if (options && options.onOk != null) {
                                let selectedDeviceId = getSelectedMicOption();
                                options.onOk({
                                    stream: state.mediaStream,
                                    name: sourceNameInput.value,
                                    deviceId: selectedDeviceId,
                                    sourceType: separateSourceTypeInput.checked ? 'separate' : 'webrtc'
                                });
                            }
                            hideDialog(true);
                        })
        
                        return {
                            hideDialog: hideDialog,
                            showDialog: showDialog,
                        }
                    }())

                    var invitePopup = (function () {
                        var _popupEl = null;
                        var _popupDialog = null;

                        function createPopup() {
                            var popupContainer = _popupEl = document.createElement('DIV');
                            popupContainer.className = 'live-editor-dialog-window-content live-editor-invite-popup';
                            
                            var linkCon = document.createElement('DIV');
                            linkCon.className = 'live-editor-invite-popup-link-con';
                            popupContainer.appendChild(linkCon);
                            
                            var linkInputCon = document.createElement('LABEL');
                            linkInputCon.className = 'live-editor-invite-popup-label';
                            linkCon.appendChild(linkInputCon);
                            var linkInput = document.createElement('INPUT');
                            linkInput.disabled = true;
                            let livestreamId = (tool.livestreamStream.fields.name).replace('Media/webrtc/livestream/', '');
                            linkInput.value = location.origin + '/livestream/' + tool.livestreamStream.fields.publisherId + '/' + livestreamId;
                            linkInputCon.appendChild(linkInput);
                            var linkCopyBtn = document.createElement('BUTTON');
                            linkCopyBtn.innerHTML = Q.getObject("webrtc.settingsPopup.copy", tool.text);
                            linkCon.appendChild(linkCopyBtn);

                            linkCopyBtn.addEventListener('click', function () {
                                copyToClipboard(linkInput);
                                tool.webrtcUserInterface.notice.show(Q.getObject("webrtc.notices.linkCopiedToCb", tool.text));
                            })
                            
                        }

                        function show() {
                            if(_popupDialog && !_popupDialog.active) {
                                _popupDialog.show();
                                return;
                            } else if(_popupDialog) {
                                return;
                            }

                            if(!_popupEl) {
                                tool.getOrCreateLivestreamStream().then(function () {
                                    createPopup();
                                    let streamingControlsEl = document.querySelector('.live-editor-dialog_advanced_streaming');
                                    let rectangleToShowIn = streamingControlsEl ? streamingControlsEl.getBoundingClientRect() : null;
                                    _popupDialog = new SimpleDialog({
                                        content: _popupEl,
                                        rectangleToShowIn: rectangleToShowIn,
                                        title: 'Share livestream'
                                    });
                                });
                            }                            
                        }

                        return {
                            show: show
                        }
                    }());

                    var contextMenu = function (type) {
                        let _type = type
                        let _contextMenu = null

                        _contextMenu = document.createElement('DIV');
                        _contextMenu.className = 'live-editor-context-menu';

                        function loadContextItems() {
                            if (_type == 'visualSource') {
                                var activeScene = scenesInterface.getActive();
                                let selectedSource = activeScene.sourcesInterface.getSelectedSource();
                                if (selectedSource.sourceInstance.sourceType == 'videoInput' && !selectedSource.sourceInstance.isScreensharing) {
                                    let preferencesItem = document.createElement('DIV');
                                    preferencesItem.className = 'live-editor-context-item';
                                    preferencesItem.innerHTML = 'Preferences';
                                    _contextMenu.appendChild(preferencesItem);
                                    preferencesItem.addEventListener('click', function () {
                                        addCameraPopup.showDialog({
                                            source: selectedSource,
                                            onOk: function (e) {
                                                if (!e.stream) {
                                                    alert('No media stream added');
                                                }

                                                if(e.sourceType == 'separate') {
                                                    selectedSource.sourceInstance.update({
                                                        stream: e.stream,
                                                        name: e.name,
                                                        originalSize: e.originalSize,
                                                        frameRate: e.frameRate
                                                    });
                                                } else {
                                                    log('add camera source: webrtc');
                                                    let videoTracks = e.stream.getVideoTracks();
                                                    for (let t in videoTracks) {
                                                        videoTracks[t].stop();
                                                    }
                                                    activeScene.sourcesInterface.removeSource();
                                                    tool.webrtcSignalingLib.localMediaControls.toggleCameras({deviceId:e.deviceId});
                                                }

                                                
                                            },
                                            onClose: function () {

                                            }
                                        });
                                    });
                                } else if (selectedSource.sourceInstance.sourceType == 'videoInput' && selectedSource.sourceInstance.isScreensharing) {
                                    let preferencesItem = document.createElement('DIV');
                                    preferencesItem.className = 'live-editor-context-item';
                                    preferencesItem.innerHTML = 'Preferences';
                                    _contextMenu.appendChild(preferencesItem);
                                    preferencesItem.addEventListener('click', function () {
                                        addScreensharingInputPopup.showDialog({
                                            source: selectedSource,
                                            onOk: function (e) {
                                                if (!e.stream) {
                                                    alert('No media stream added');
                                                }
                                                selectedSource.sourceInstance.update({
                                                    stream: e.stream,
                                                    name: e.name
                                                });
                                            },
                                            onClose: function () {

                                            }
                                        });
                                    });
                                } else if (selectedSource.sourceInstance.sourceType == 'video') {
                                    let preferencesItem = document.createElement('DIV');
                                    preferencesItem.className = 'live-editor-context-item';
                                    preferencesItem.innerHTML = 'Preferences';
                                    _contextMenu.appendChild(preferencesItem);
                                    preferencesItem.addEventListener('click', function () {
                                        filtersPopup(selectedSource);
                                    });
                                }

                            }
                        }

                        function hide(e) {
                            if (e.target.offsetParent != _contextMenu) {
                                if (_contextMenu.parentElement) _contextMenu.parentElement.removeChild(_contextMenu);
                                window.removeEventListener('click', hide);
                            }
                        }

                        function show(e) {
                            existingContextMenu = document.querySelector('.live-editor-context-menu');
                            if (existingContextMenu && existingContextMenu.parentElement) existingContextMenu.parentElement.removeChild(existingContextMenu);
                            let clientX = e.clientX;
                            let clientY = e.clientY;
                            _contextMenu.style.top = clientY + 'px';
                            _contextMenu.style.left = clientX + 'px';

                            loadContextItems();

                            document.body.appendChild(_contextMenu);

                            window.addEventListener('click', hide);
                        }

                        return {
                            show: show
                        }
                    }

                    function on(eventName, handlerFunction) {
                        _eventDispatcher.on(eventName, handlerFunction);
                    }

                    return {
                        overlaySources: _overlaySources,
                        createSourcesCol: createSourcesCol,
                        update: update,
                        updateLocalControlsButtonsState: updateLocalControlsButtonsState,
                        updateSourceControlPanelButtons: updateSourceControlPanelButtons,
                        selectSource: selectSource,
                        getSelectedSource: getSelectedSource,
                        getSelectedLayout: getSelectedLayout,
                        selectLayout: selectLayout,
                        syncList: syncList,
                        getSourcesList: getSourcesList,
                        hideResizingElement: hideResizingElement,
                        moveForward: moveForward,
                        moveBackward: moveBackward,
                        removeSource: removeSource,
                        addVideoInputSource: addVideoInputSource,
                        addImageSource: addImageSource,
                        addWatermark: addWatermark,
                        addBackground: addBackground,
                        addVideoSource: addVideoSource,
                        checkIfOtherWebrtcVideoGroupExist: checkIfOtherWebrtcVideoGroupExist,
                        getWebrtcGroupListItems: getWebrtcGroupListItems,
                        on: on
                    }
                }

                var optionsColumn = (function () {
                    var _activeView = null;
                    var _optionsParentEl = document.createElement('DIV');
                    _optionsParentEl.className = 'live-editor-options-dialog-con';

                    function hideActiveView() {
                        log('optionsColumn: hideActiveView', _activeView)
                        if(_activeView != null) {
                            _activeView.hide();
                        }
                    }

                    function createMediaControls(source) {
                        log('createMediaControls',  source.params);

                        var mediaElement = source.sourceInstance.audioInstance || source.sourceInstance.videoInstance;

                        var dialogControlsBody = document.createElement('DIV');
                        dialogControlsBody.className = 'live-editor-options-params-mediacontrols';

                        var seektimeCon = document.createElement('DIV');
                        seektimeCon.className = 'live-editor-options-params-seekbar-con';
                        var seektimeEl = document.createElement('DIV');
                        seektimeEl.className = 'live-editor-options-params-seekbar';
                        var seektimeProgress = document.createElement('span');
                        seektimeProgress.className = 'live-editor-options-params-seekbar-btn';
                        seektimeEl.appendChild(seektimeProgress);
                        seektimeCon.appendChild(seektimeEl);
                        dialogControlsBody.appendChild(seektimeCon);

                        var audioControlsCon = document.createElement('DIV');
                        audioControlsCon.className = 'live-editor-options-params-controls-con';
                        var playPauseCon = document.createElement('DIV');
                        playPauseCon.className = 'live-editor-options-params-controls-con';
                        var playPauseInner = document.createElement('DIV');
                        playPauseInner.className = 'live-editor-options-params-controls-inner';
                        var playPauseBtn = document.createElement('DIV');
                        playPauseBtn.className = 'live-editor-options-params-controls-btn';
                        playPauseBtn.innerHTML = mediaElement.paused ? tool.icons.playIcon : tool.icons.pauseIcon;
                        playPauseInner.appendChild(playPauseBtn);
                        playPauseCon.appendChild(playPauseInner);
                        audioControlsCon.appendChild(playPauseCon);


                        var volumeCon = document.createElement('DIV');
                        volumeCon.className = 'live-editor-options-params-controls-volume-con';
                        var volumeIcon = document.createElement('DIV');
                        volumeIcon.className = 'live-editor-options-params-controls-volume-icon'
                        volumeIcon.innerHTML = tool.icons.disabledEnabledSpeaker;
                        var volumeSliderCon = document.createElement('DIV');
                        volumeSliderCon.className = 'live-editor-options-params-volume-slider-con';
                        var volume = document.createElement('DIV');
                        volume.className = 'live-editor-options-params-controls-volume'
                        var volumeSlider = document.createElement('SPAN');
                        volumeSlider.className = 'live-editor-options-params-controls-volume-slider';
                        volumeSlider.style.width = source.sourceInstance.gainNode.gain.value * 100 + '%';
                        volume.appendChild(volumeSlider);
                        volumeSliderCon.appendChild(volume);
                        volumeCon.appendChild(volumeIcon);
                        volumeCon.appendChild(volumeSliderCon);
                        audioControlsCon.appendChild(volumeCon);

                        var audioTimeCon = document.createElement('DIV');
                        audioTimeCon.className = 'live-editor-options-params-audio-time-con';
                        var audioTimeInner = document.createElement('DIV');
                        audioTimeInner.className = 'live-editor-options-params-audio-time-inner';
                        var audioTimeCurrent = document.createElement('SPAN');
                        audioTimeCurrent.className = 'live-editor-options-params-audio-time-cur';
                        var audioTimeSpliter = document.createElement('SPAN');
                        audioTimeSpliter.className = 'live-editor-options-params-audio-time-split';
                        audioTimeSpliter.innerHTML = '/';
                        var audioTimeDuration = document.createElement('SPAN');
                        audioTimeDuration.className = 'live-editor-options-params-audio-time-dur';
                        audioTimeInner.appendChild(audioTimeCurrent);
                        audioTimeInner.appendChild(audioTimeSpliter);
                        audioTimeInner.appendChild(audioTimeDuration);
                        audioTimeCon.appendChild(audioTimeInner);
                        audioControlsCon.appendChild(audioTimeCon);


                        var loopAndLocalPlayCon = document.createElement('DIV');
                        loopAndLocalPlayCon.className = 'live-editor-options-params-loopplay-con';
                        var loopAudioCon = document.createElement('DIV');
                        loopAudioCon.className = 'live-editor-options-params-loopaudio-con';
                        var loopAudioLabel = document.createElement('LABEL');
                        loopAudioLabel.className = 'live-editor-options-params-looplabel';
                        var loopPlayCheckbox = document.createElement('INPUT');
                        loopPlayCheckbox.type = 'checkbox';
                        loopPlayCheckbox.name = 'loopAudio';
                        loopPlayCheckbox.checked = source.params.loop;
                        var loopPlayCheckboxText = document.createTextNode('Loop');
                        loopAudioLabel.appendChild(loopPlayCheckbox);
                        loopAudioLabel.appendChild(loopPlayCheckboxText);
                        loopAudioCon.appendChild(loopAudioLabel);
                        loopAndLocalPlayCon.appendChild(loopAudioCon);

                        var PlayLocallyCon = document.createElement('DIV');
                        PlayLocallyCon.className = 'live-editor-options-params-playlocally-con';
                        var playLocallyLabel = document.createElement('LABEL');
                        playLocallyLabel.className = 'live-editor-options-params-playlocally-label';
                        var playLocallyCheckbox = document.createElement('INPUT');
                        playLocallyCheckbox.type = 'checkbox';
                        playLocallyCheckbox.name = 'loopAudio';
                        playLocallyCheckbox.checked = source.params.localOutput;
                        var playLocCheckboxText = document.createTextNode('Local output');
                        playLocallyLabel.appendChild(playLocallyCheckbox);
                        playLocallyLabel.appendChild(playLocCheckboxText);
                        PlayLocallyCon.appendChild(playLocallyLabel);
                        loopAndLocalPlayCon.appendChild(PlayLocallyCon);

                        dialogControlsBody.appendChild(audioControlsCon);
                        dialogControlsBody.appendChild(loopAndLocalPlayCon);

                        seektimeCon.addEventListener('mouseenter', function(){
                            if(!seektimeProgress.classList.contains("live-editor-options-seekbar-hover")) {
                                seektimeProgress.classList.add("live-editor-options-seekbar-hover");
                            }
                        })
                        seektimeCon.addEventListener('mouseleave', function(){
                            if(seektimeProgress.classList.contains("live-editor-options-seekbar-hover")) {
                                seektimeProgress.classList.remove("live-editor-options-seekbar-hover");
                            }
                        })

                        function getOffsetLeft(elem) {
                            var offsetLeft = 0;
                            do {
                                if ( !isNaN( elem.offsetLeft ) )
                                {
                                    offsetLeft += elem.offsetLeft;
                                }
                            } while( elem = elem.offsetParent );
                            return offsetLeft;
                        }

                        mediaElement.addEventListener('timeupdate', function () {
                            var percentage = ( mediaElement.currentTime / mediaElement.duration ) * 100;
                            seektimeProgress.style.width = percentage+'%';
                            updateSeekTime();
                        })
                        function updateSeekTime(){
                            var nt = mediaElement.currentTime * (100 / mediaElement.duration);
                            var curmins = Math.floor(mediaElement.currentTime / 60);
                            var cursecs = Math.floor(mediaElement.currentTime - curmins * 60);
                            var durmins = Math.floor(mediaElement.duration / 60);
                            var dursecs = Math.floor(mediaElement.duration - durmins * 60);
                            if(cursecs < 10){ cursecs = "0"+cursecs; }
                            if(dursecs < 10){ dursecs = "0"+dursecs; }
                            //if(curmins < 10){ curmins = "0"+curmins; }
                            //if(durmins < 10){ durmins = "0"+durmins; }
                            audioTimeCurrent.innerHTML = curmins+":"+cursecs;
                            audioTimeDuration.innerHTML = durmins+":"+dursecs;
                        }

                        function dragTimeSlider(e) {
                            var offsetLeft = getOffsetLeft(seektimeEl)
                            var left = (e.pageX - offsetLeft);

                            var totalWidth = seektimeEl.offsetWidth;
                            var percentage = ( left / totalWidth );
                            var timeToSet = mediaElement.duration * percentage;
                            mediaElement.currentTime = timeToSet;
                        }
                        seektimeEl.addEventListener("mousedown", function(){
                            log('mousedown')

                            window.addEventListener('mousemove', dragTimeSlider)

                            function removeListener() {
                                window.removeEventListener('mousemove', dragTimeSlider)
                                window.removeEventListener('mouseup', removeListener)
                            }
                            window.addEventListener('mouseup', removeListener)
                        });


                        seektimeEl.addEventListener("mouseup", function(e){
                            var offsetLeft = getOffsetLeft(seektimeEl)
                            var left = (e.pageX - offsetLeft);
                            var totalWidth = seektimeEl.offsetWidth;
                            var percentage = ( left / totalWidth );
                            var timeToSet = mediaElement.duration * percentage;
                            mediaElement.currentTime = timeToSet;
                        });

                        playPauseBtn.addEventListener("click", function(e){
                            log('mediaElement', mediaElement)
                            if(mediaElement.paused){
                                mediaElement.play();
                            } else {
                                mediaElement.pause();
                            }
                        });

                        mediaElement.addEventListener('play', function () {
                            playPauseBtn.innerHTML = tool.icons.pauseIcon;
                        });

                        mediaElement.addEventListener('pause', function () {
                            playPauseBtn.innerHTML = tool.icons.playIcon;
                        });

                        if(mediaElement.muted) {
                            volumeSlider.style.width = '0%';
                        }

                        source.sourceInstance.on('volumeChanged', function () {
                            log('volumeChanged', source.sourceInstance.gainNode.gain.value)
                            var percentage = source.sourceInstance.gainNode.gain.value * 100;
                            volumeSlider.style.width = percentage + '%';
                            updateVolumeIcons(source.sourceInstance.gainNode.gain.value);
                        })

                        mediaElement.addEventListener('pause', function (e) {
                            log('mediaElement pause', mediaElement)
                        })

                        mediaElement.addEventListener('play', function (e) {
                            log('mediaElement play', mediaElement)
                        })

                        function dragVolumeSlider(e) {
                            var offsetLeft = getOffsetLeft(volume)
                            var left = (e.pageX - offsetLeft);
                            if (Math.sign(left) == -1) {
                                left = 0;
                            }
                            var totalWidth = volume.offsetWidth;

                            if (left > totalWidth) {
                                left = totalWidth;
                            }
                            var volumeToSet = (left / totalWidth);
                            source.sourceInstance.setVolume(volumeToSet);
                        }

                        function updateVolumeIcons(volumeToSet) {
                            log('updateVolumeIcons', volumeToSet, mediaElement.muted)
                            var waves = volumeIcon.querySelector('#MediaWebRTCWaves');
                            var disabledWaves = volumeIcon.querySelectorAll('.MediaWebRTCDisabledparts.MediaWebRTCWaves1 .MediaWebRTCDisabledparts.MediaWebRTCWaves2');
                            var secondWaveParts = volumeIcon.querySelectorAll('.MediaWebRTCWaves2');
                            var disabledPartOfSpeaker = volumeIcon.querySelector('polygon.MediaWebRTCDisabledparts');
                            var crossline = volumeIcon.querySelector('#MediaWebRTCCrossline');

                            function toggleSecondWave(value) {
                                for (let i = 0; i < secondWaveParts.length; ++i) {
                                    secondWaveParts[i].style.opacity = value;
                                }
                            }
                            function toggleDisabledIcon(value) {
                                for (let i = 0; i < disabledWaves.length; ++i) {
                                    disabledWaves[i].style.opacity = (value === 1 ? 0 : 1);
                                }
                                disabledPartOfSpeaker.style.opacity = (value === 1 ? 0 : 1);
                                crossline.style.opacity = (value === 1 ? 1 : 0);
                            }

                            if(volumeToSet <= 0.5 && volumeToSet > 0 && !mediaElement.muted) {
                                log('updateVolumeIcons 1');
                                toggleDisabledIcon(0);
                                toggleSecondWave(0);
                            } else if (volumeToSet > 0.5 && !mediaElement.muted) {
                                log('updateVolumeIcons 2');
                                toggleDisabledIcon(0);
                                toggleSecondWave(1);
                            } else {
                                log('updateVolumeIcons 3');
                                toggleSecondWave(1);
                                toggleDisabledIcon(1);
                            }
                        }
                        updateVolumeIcons(mediaElement.muted ? 0 : source.sourceInstance.gainNode.gain.value)

                        source.sourceInstance.on('volumeChanged', function () {
                            var percentage = source.sourceInstance.gainNode.gain.value * 100;
                            volumeSlider.style.width = percentage + '%';
                            updateVolumeIcons(source.sourceInstance.gainNode.gain.value);
                        })

                        volumeIcon.addEventListener("click", function () {
                            log('speaker', mediaElement.volume, mediaElement.muted)

                            if (!source.sourceInstance.gainNode) return;
                            if (source.sourceInstance.gainNode.gain.value == 0 || mediaElement.muted) {
                                log('speaker 1', source.params.lastVolumeValue)

                                if (mediaElement.muted) mediaElement.muted = false;
                                source.sourceInstance.setVolume(source.params.lastVolumeValue != null ? source.params.lastVolumeValue : 1);
                            } else {
                                source.params.lastVolumeValue = source.sourceInstance.gainNode.gain.value;
                                source.sourceInstance.setVolume(0);
                            }
                        });


                        volume.addEventListener("mousedown", function(){
                            window.addEventListener('mousemove', dragVolumeSlider)

                            function removeListener() {
                                window.removeEventListener('mousemove', dragVolumeSlider)
                                window.removeEventListener('mouseup', removeListener)
                            }
                            window.addEventListener('mouseup', removeListener)
                        });


                        volume.addEventListener("click", dragVolumeSlider);

                        loopPlayCheckbox.addEventListener("click", function (e) {
                            if(this.checked) {
                                (source.sourceInstance.audioInstance || source.sourceInstance.videoInstance).loop = true;
                            } else {
                                (source.sourceInstance.audioInstance || source.sourceInstance.videoInstance).loop = false;
                            }
                        });

                        playLocallyCheckbox.addEventListener("click", function (e) {
                            if(this.checked) {
                                tool.canvasComposer.audioComposer.unmuteSourceLocally(source.sourceInstance);
                            } else {
                                tool.canvasComposer.audioComposer.muteSourceLocally(source.sourceInstance);
                            }
                        });


                        source.params.loop = loopPlayCheckbox;
                        source.params.localOutput = playLocallyCheckbox;

                        return dialogControlsBody;
                    }

                    var canvasLayoutOptions = (function () {
                        let _selectedSource = null;
                        var _dialogEl = null;
                        var _dialogBody = null;
                        var _generatedLayoutsParamsDialogs = {};

                        
                        function createParamsList() {
                            let activeScene = scenesInterface.getActive();
                            let selectedLayout = activeScene.sourcesInterface.getSelectedLayout();

                            let webrtcGroupSource = _selectedSource;
                            if(!webrtcGroupSource) {
                                webrtcGroupSource = activeScene.sourcesInterface.getWebrtcGroupListItems()[0];
                            }
                            if(webrtcGroupSource && _generatedLayoutsParamsDialogs[webrtcGroupSource.sourceInstance.id] != null && _generatedLayoutsParamsDialogs[webrtcGroupSource.sourceInstance.id][selectedLayout] != null) {
                                return _generatedLayoutsParamsDialogs[webrtcGroupSource.sourceInstance.id][selectedLayout];
                            }
                            var dialogBodyInner = document.createElement('DIV');
                            dialogBodyInner.className = 'live-editor-options-body-inner live-editor-options-params-body';

                            if (selectedLayout == 'tiledStreamingLayout') {
                                var outerHorizontalMarginsCon = document.createElement('DIV');
                                outerHorizontalMarginsCon.className = 'live-editor-options-params-margins';
                                var outerHorizontalMarginsInput = document.createElement('INPUT');
                                outerHorizontalMarginsInput.type = 'number';
                                outerHorizontalMarginsInput.id = 'layoutHorizontalMargins';
                                outerHorizontalMarginsInput.name = 'layoutHorizontalMargins';
                                outerHorizontalMarginsInput.min = 0;
                                outerHorizontalMarginsInput.value = webrtcGroupSource.sourceInstance.params.tiledLayoutOuterHorizontalMargins;
                                var outerHorizontalMarginsInputLabel = document.createElement('Label');
                                outerHorizontalMarginsInputLabel.appendChild(document.createTextNode("Outer horizontal margins:"));
                                outerHorizontalMarginsCon.appendChild(outerHorizontalMarginsInputLabel);
                                outerHorizontalMarginsCon.appendChild(outerHorizontalMarginsInput);
                                dialogBodyInner.appendChild(outerHorizontalMarginsCon);

                                outerHorizontalMarginsInput.addEventListener('input', function () {
                                    if(isNaN(parseFloat(outerHorizontalMarginsInput.value))) {
                                        return;
                                    }
                                    webrtcGroupSource.sourceInstance.params.tiledLayoutOuterHorizontalMargins = outerHorizontalMarginsInput.value != '' ? outerHorizontalMarginsInput.value : 0;
                                    updateWebrtcRect();
                                });

                                var outerVerticalMarginsCon = document.createElement('DIV');
                                outerVerticalMarginsCon.className = 'live-editor-options-params-margins';
                                var outerVerticalMarginsInput = document.createElement('INPUT');
                                outerVerticalMarginsInput.type = 'number';
                                outerVerticalMarginsInput.id = 'layoutVerticalMargins';
                                outerVerticalMarginsInput.name = 'layoutVerticalMargins';
                                outerVerticalMarginsInput.min = 0;
                                outerVerticalMarginsInput.value = webrtcGroupSource.sourceInstance.params.tiledLayoutOuterVerticalMargins;
                                var outerVerticalMarginsInputLabel = document.createElement('Label');
                                outerVerticalMarginsInputLabel.appendChild(document.createTextNode("Outer vertical margins:"));
                                outerVerticalMarginsCon.appendChild(outerVerticalMarginsInputLabel);
                                outerVerticalMarginsCon.appendChild(outerVerticalMarginsInput);
                                dialogBodyInner.appendChild(outerVerticalMarginsCon);

                                outerVerticalMarginsInput.addEventListener('input', function () {
                                    if(isNaN(parseFloat(outerVerticalMarginsInput.value))) {
                                        return;
                                    }
                                    webrtcGroupSource.sourceInstance.params.tiledLayoutOuterVerticalMargins = outerVerticalMarginsInput.value != '' ? outerVerticalMarginsInput.value : 0;
                                    updateWebrtcRect();
                                });

                                var innerMarginsCon = document.createElement('DIV');
                                innerMarginsCon.className = 'live-editor-options-params-margins';
                                var innerMarginsInput = document.createElement('INPUT');
                                innerMarginsInput.type = 'number';
                                innerMarginsInput.id = 'layoutHorizontalMargins';
                                innerMarginsInput.name = 'layoutHorizontalMargins';
                                innerMarginsInput.min = 0;
                                innerMarginsInput.value = webrtcGroupSource.sourceInstance.params.tiledLayoutInnerMargins;
                                var innerMarginsInputLabel = document.createElement('Label');
                                innerMarginsInputLabel.appendChild(document.createTextNode("Inner margins:"));
                                innerMarginsCon.appendChild(innerMarginsInputLabel);
                                innerMarginsCon.appendChild(innerMarginsInput);
                                dialogBodyInner.appendChild(innerMarginsCon);

                                innerMarginsInput.addEventListener('input', function () {
                                    if(isNaN(parseFloat(innerMarginsInput.value))) {
                                        return;
                                    }
                                    webrtcGroupSource.sourceInstance.params.tiledLayoutInnerMargins = innerMarginsInput.value != '' ? innerMarginsInput.value : 0;
                                    updateWebrtcRect();
                                });
                            }

                            var webrtcLayoutRect = webrtcGroupSource.sourceInstance.rect;

                            //size
                            var sizeAndPositionCon = document.createElement('DIV');
                            sizeAndPositionCon.className = 'live-editor-options-params-size-pos';
                            dialogBodyInner.appendChild(sizeAndPositionCon);

                            var sizeCon = document.createElement('DIV');
                            sizeCon.className = 'live-editor-options-params-size';
                            sizeAndPositionCon.appendChild(sizeCon);

                            var sizeWidthCon = document.createElement('DIV');
                            sizeWidthCon.className = 'live-editor-options-params-size-width';
                            sizeCon.appendChild(sizeWidthCon);
                            var widthText = document.createElement('SPAN');
                            widthText.innerHTML = 'Width: ';
                            sizeWidthCon.appendChild(widthText);
                            var width = document.createElement('INPUT');
                            width.name = 'width';
                            width.type = 'text';
                            width.value = webrtcLayoutRect.width;
                            sizeWidthCon.appendChild(width);

                            var sizeHeightCon = document.createElement('DIV');
                            sizeHeightCon.className = 'live-editor-options-params-size-height';
                            sizeCon.appendChild(sizeHeightCon);
                            var heightText = document.createElement('SPAN');
                            heightText.innerHTML = 'Height: ';
                            sizeHeightCon.appendChild(heightText);
                            var height = document.createElement('INPUT');
                            height.name = 'height';
                            height.type = 'text';
                            height.value = webrtcLayoutRect.height;
                            sizeHeightCon.appendChild(height);


                            //position
                            var positionCon = document.createElement('DIV');
                            positionCon.className = 'live-editor-options-params-position';
                            sizeAndPositionCon.appendChild(positionCon);

                            var topPositionCon = document.createElement('DIV');
                            topPositionCon.className = 'live-editor-options-params-position-top';
                            positionCon.appendChild(topPositionCon);
                            var topText = document.createElement('SPAN');
                            topText.innerHTML = 'Top: ';
                            topPositionCon.appendChild(topText);
                            var topPos = document.createElement('INPUT');
                            topPos.name = 'y';
                            topPos.type = 'text';
                            topPos.value = webrtcLayoutRect.y;
                            topPositionCon.appendChild(topPos);

                            var leftPositionCon = document.createElement('DIV');
                            leftPositionCon.className = 'live-editor-options-params-position-left';
                            positionCon.appendChild(leftPositionCon);
                            var leftText = document.createElement('SPAN');
                            leftText.innerHTML = 'Left: ';
                            leftPositionCon.appendChild(leftText);
                            var leftPos = document.createElement('INPUT');
                            leftPos.name = 'x';
                            leftPos.type = 'text';
                            leftPos.value = webrtcLayoutRect.x;
                            leftPositionCon.appendChild(leftPos);

                            var audioBgCon = document.createElement('DIV');
                            audioBgCon.className = 'live-editor-options-params-position-audio-bg'
                            dialogBodyInner.appendChild(audioBgCon);
                            var audioBg = document.createElement('INPUT');
                            audioBg.type = 'color';
                            audioBg.id = 'audioBgColor';
                            audioBg.name = 'audioBgColor';
                            audioBg.value = webrtcGroupSource.sourceInstance.params.audioLayoutBgColor;
                            audioBgCon.appendChild(audioBg);
                            var removeBg = document.createElement('DIV');
                            removeBg.className = 'live-editor-options-params-position-audio-res'
                            removeBg.innerHTML = '&#10060;'
                            audioBgCon.appendChild(document.createTextNode("Layout background color: "));
                            audioBgCon.appendChild(removeBg);

                            var overlaySourcesCon = document.createElement('DIV');
                            overlaySourcesCon.className = 'live-editor-options-params-overlays';
                            dialogBodyInner.appendChild(overlaySourcesCon);
                            var overlayCaption = document.createElement('DIV');
                            overlayCaption.className = 'live-editor-options-params-overlays-title';
                            overlayCaption.innerHTML = 'Overlay Sources';
                            overlaySourcesCon.appendChild(overlayCaption);
                            var overlayList = document.createElement('DIV');
                            overlayList.className = 'live-editor-options-params-overlays-list';
                            overlaySourcesCon.appendChild(overlayList);

                            var overlaySources = activeScene.sourcesInterface.overlaySources.getList();;
                            overlayList.appendChild(overlaySources);

                            _layoutParamsEl = dialogBodyInner;

                            audioBg.addEventListener('input', function () {
                                webrtcGroupSource.sourceInstance.params.audioLayoutBgColor = audioBg.value;
                            })

                            removeBg.addEventListener('click', function () {
                                webrtcGroupSource.sourceInstance.params.audioLayoutBgColor = 'rgba(0, 0, 0, 0)';
                            })

                            function updateWebrtcRect (e) {
                                //firstly, update property that was changed directly
                                let params = {
                                    width: width.value,
                                    height: height.value,
                                    x: leftPos.value,
                                    y: topPos.value
                                };
                                let currentParam = e.target.name;
                                if(!isNaN(parseFloat(params[currentParam]))) webrtcGroupSource.sourceInstance.rect[currentParam] = parseFloat(params[currentParam]);
                                delete params[currentParam];
                                if(currentParam == 'width' || currentParam == 'height') {
                                    return;
                                }

                                //then update the rest of properties that may be related (e.g. keeping ration when changing width or height)
                                for(let i in params) {
                                    if(isNaN(parseFloat(params[i]))) {
                                        continue;
                                    }
                                    webrtcGroupSource.sourceInstance.rect[i] = parseFloat(params[i]);
                                }
                                //tool.canvasComposer.videoComposer.setWebrtcLayoutRect(layoutWidth, layoutHeight, x, y);
                            }
                            width.addEventListener('blur', updateWebrtcRect);
                            height.addEventListener('blur', updateWebrtcRect);
                            topPos.addEventListener('blur', updateWebrtcRect);
                            leftPos.addEventListener('blur', updateWebrtcRect);

                            webrtcGroupSource.sourceInstance.eventDispatcher.on('rectChanged', function () {
                                width.value = webrtcLayoutRect._width;
                                height.value = webrtcLayoutRect._height;
                                leftPos.value = webrtcLayoutRect._x;
                                topPos.value = webrtcLayoutRect._y;
                            });
                           
                            if(_generatedLayoutsParamsDialogs[webrtcGroupSource.sourceInstance.id] == null) {
                                _generatedLayoutsParamsDialogs[webrtcGroupSource.sourceInstance.id] = {};
                            }
                            _generatedLayoutsParamsDialogs[webrtcGroupSource.sourceInstance.id][selectedLayout] = dialogBodyInner;

                            return dialogBodyInner;
                        }

                        function showLayoutParams() {
                            log('showLayoutParams')

                            _dialogBody.innerHTML = '';
                            _dialogBody.appendChild(createParamsList());
                        }

                        function showDialog(source) {
                            _selectedSource = source;
                            hideActiveView();
                            showLayoutParams();

                            _optionsParentEl.appendChild(_dialogEl);
                            _activeView = this;
                        }

                        function hideDialog() {
                            log('hideDialog', _dialogEl, _dialogEl != null, _dialogEl.parentElement != null, _dialogEl.parentElement)

                            if(_dialogEl != null && _dialogEl.parentElement != null) {
                                log('hideDialog remove')

                                _dialogEl.parentNode.removeChild(_dialogEl);
                            }
                        }

                        log('addImagePopup')
                        _dialogEl = document.createElement('DIV');
                        _dialogEl.className = 'live-editor-options-dialog';
                        var dialogTitle = document.createElement('DIV');
                        dialogTitle.className = 'live-editor-options-title';
                        var dialogTitleInner = document.createElement('DIV');
                        dialogTitleInner.className = 'live-editor-options-title-inner';

                        var dialogBody = _dialogBody = document.createElement('DIV');
                        dialogBody.className = 'live-editor-options-body';

                        //dialogBody.appendChild(createLayoutList());
                        _dialogEl.appendChild(dialogBody);

                        return {
                            hide: hideDialog,
                            show: showDialog,
                            showLayoutParams: showLayoutParams,
                        }
                    }())

                    var webrtcParticipantOptions = (function (source) {
                        var _dialogEl = null;
                        var _optionsTabs = null;
                        var _dialogBody = null;
                        var _layoutParamsEl = null;
                        var _removeBackgroundParamEl = null;
                        var _selectedSource = null;
                        var _generatedDialogs = [];

                        function createParamsList() {

                            log('createParamsList', _selectedSource.sourceInstance)
                            for(let d in _generatedDialogs) {
                                if(_generatedDialogs[d].source == _selectedSource) {
                                    return _generatedDialogs[d].dialog;
                                }
                            }

                            var dialogBodyInner = document.createElement('DIV');
                            dialogBodyInner.className = 'live-editor-options-body-inner live-editor-options-params-body';

                            //size
                            var descriptionCon = document.createElement('DIV');
                            descriptionCon.className = 'live-editor-options-params-webrtc-desc';

                            var descriptionInner = document.createElement('DIV');
                            descriptionInner.className = 'live-editor-options-params-webrtc-desc-inner';
                            descriptionCon.appendChild(descriptionInner);

                            var displayVideoCon = document.createElement('DIV');
                            var displayVideoTitle = document.createElement('DIV');
                            displayVideoTitle.innerHTML = "Display video:";
                            displayVideoCon.appendChild(displayVideoTitle);
                            var coverFit = document.createElement('INPUT');
                            coverFit.type = 'radio';
                            coverFit.id = 'coverFit';
                            coverFit.name = 'displayVideo';
                            coverFit.value = 'cover';
                            coverFit.checked = _selectedSource.sourceInstance.params.displayVideo == 'cover' ? true : false;
                            var coverFitLabel = document.createElement('Label');
                            coverFitLabel.appendChild(coverFit);
                            coverFitLabel.appendChild(document.createTextNode("Cover"));
                            displayVideoCon.appendChild(coverFitLabel);
                            
                            var containFit = document.createElement('INPUT');
                            containFit.type = 'radio';
                            containFit.id = 'containFit';
                            containFit.name = 'displayVideo';
                            containFit.value = 'contain';
                            containFit.checked = _selectedSource.sourceInstance.params.displayVideo == 'contain' ? true : false;
                            var containFitLabel = document.createElement('Label');
                            containFitLabel.appendChild(containFit);
                            containFitLabel.appendChild(document.createTextNode("Contain"));
                            displayVideoCon.appendChild(containFitLabel);

                            dialogBodyInner.appendChild(displayVideoCon);

                            var showFlippedCon = document.createElement('DIV');
                            var showFlipped = document.createElement('INPUT');
                            showFlipped.type = 'checkbox';
                            showFlipped.id = 'showFlipped';
                            showFlipped.name = 'showFlipped';
                            showFlipped.checked = _selectedSource.sourceInstance.params.flip ? true : false;
                            var showFlippedLabel = document.createElement('Label');
                            showFlippedLabel.appendChild(showFlipped);
                            showFlippedLabel.appendChild(document.createTextNode("Flip"));
                            showFlippedCon.appendChild(showFlippedLabel);
                            dialogBodyInner.appendChild(showFlippedCon);

                            var showNameCon = document.createElement('DIV');
                            var showName = document.createElement('INPUT');
                            showName.type = 'checkbox';
                            showName.id = 'showNames';
                            showName.name = 'showNames';
                            showName.checked = false;
                            var showNameLabel = document.createElement('Label');
                            showNameLabel.appendChild(showName);
                            showNameLabel.appendChild(document.createTextNode("Show participants' name"));
                            showNameCon.appendChild(showNameLabel);
                            dialogBodyInner.appendChild(showNameCon);

                            var descNameCon = document.createElement('DIV');
                            descNameCon.className = 'live-editor-options-params-webrtc-desc-name';
                            descriptionInner.appendChild(descNameCon);
                            var nameText = document.createElement('SPAN');
                            nameText.innerHTML = 'Name: ';
                            descNameCon.appendChild(nameText);
                            var nameInput = document.createElement('INPUT');
                            nameInput.type = 'text';
                            nameInput.value = _selectedSource.sourceInstance.participant.username;
                            descNameCon.appendChild(nameInput);

                            var showBorderCon = document.createElement('DIV');
                            var showBorder = document.createElement('INPUT');
                            showBorder.type = 'checkbox';
                            showBorder.id = 'showBorder';
                            showBorder.name = 'showBorder';
                            showBorder.checked = false;
                            var ShowBorderLabel = document.createElement('Label');
                            ShowBorderLabel.appendChild(showBorder);
                            ShowBorderLabel.appendChild(document.createTextNode("Show borders"));
                            showBorderCon.appendChild(ShowBorderLabel);
                            dialogBodyInner.appendChild(showBorderCon);

                            var descCaptionCon = document.createElement('DIV');
                            descCaptionCon.className = 'live-editor-options-params-webrtc-desc-caption';
                            descriptionInner.appendChild(descCaptionCon);
                            var captionText = document.createElement('SPAN');
                            captionText.innerHTML = 'Caption: ';
                            descCaptionCon.appendChild(captionText);
                            var captionInput = document.createElement('INPUT');
                            captionInput.type = 'text';
                            captionInput.value = _selectedSource.sourceInstance.caption;
                            descCaptionCon.appendChild(captionInput);
                            dialogBodyInner.appendChild(descriptionCon);

                            var bgColorCon = document.createElement('DIV');
                            bgColorCon.className = 'live-editor-options-params-captionbg'
                            var bgColorInput = document.createElement('INPUT');
                            bgColorInput.type = 'color';
                            bgColorInput.id = 'captionBgColor';
                            bgColorInput.name = 'captionBgColor';
                            bgColorInput.value = _selectedSource.sourceInstance.params.captionBgColor;
                            var removeBg = document.createElement('DIV');
                            removeBg.className = 'live-editor-options-params-captionbg-rem'
                            removeBg.innerHTML = '&#10060;'
                            bgColorCon.appendChild(document.createTextNode("Caption background color: "));
                            bgColorCon.appendChild(bgColorInput);
                            bgColorCon.appendChild(removeBg);
                            dialogBodyInner.appendChild(bgColorCon);
                            bgColorInput.addEventListener('input', function () {
                                _selectedSource.sourceInstance.params.captionBgColor = bgColorInput.value;
                            })

                            var fontColorCon = document.createElement('DIV');
                            fontColorCon.className = 'live-editor-options-params-font-color'
                            var fontColorInput = document.createElement('INPUT');
                            fontColorInput.type = 'color';
                            fontColorInput.id = 'captionFontColor';
                            fontColorInput.name = 'captionFontColor';
                            fontColorInput.value = _selectedSource.sourceInstance.params.captionFontColor;
                            var removeColor = document.createElement('DIV');
                            removeColor.className = 'live-editor-options-params-font-color-rem'
                            removeColor.innerHTML = '&#10060;'
                            fontColorCon.appendChild(document.createTextNode("Caption font color: "));
                            fontColorCon.appendChild(fontColorInput);
                            fontColorCon.appendChild(removeColor);
                            dialogBodyInner.appendChild(fontColorCon);


                            dialogBodyInner.appendChild(createBgFiltersParams());

                            _layoutParamsEl = dialogBodyInner;

                            function displayVideoHandler() {
                               let checkedValue = coverFit.checked ? 'cover' : 'contain';
                               _selectedSource.sourceInstance.params.displayVideo = checkedValue;
                            }

                            coverFit.addEventListener('click', displayVideoHandler);
                            containFit.addEventListener('click', displayVideoHandler);

                            showFlipped.addEventListener('change', function () {
                                if( showFlipped.checked) {
                                    _selectedSource.sourceInstance.params.flip = true;
                                } else {
                                    _selectedSource.sourceInstance.params.flip = false;
                                }
                            })

                            showName.addEventListener('change', function () {
                                if( showName.checked) {
                                    tool.canvasComposer.videoComposer.displayName(_selectedSource.sourceInstance);
                                } else {
                                    tool.canvasComposer.videoComposer.hideName(_selectedSource.sourceInstance);

                                }
                            })
                            showBorder.addEventListener('change', function () {
                                if( showBorder.checked) {
                                    tool.canvasComposer.videoComposer.displayBorder(_selectedSource.sourceInstance);
                                } else {
                                    tool.canvasComposer.videoComposer.hideBorder(_selectedSource.sourceInstance);

                                }
                            })
                            nameInput.addEventListener('blur', function () {
                                _selectedSource.sourceInstance.name = nameInput.value.toUpperCase();
                            })
                            captionInput.addEventListener('blur', function () {
                                _selectedSource.sourceInstance.caption = captionInput.value;

                            })
                            fontColorInput.addEventListener('input', function () {
                                _selectedSource.sourceInstance.params.captionFontColor = fontColorInput.value;
                            })

                            removeColor.addEventListener('click', function () {
                                _selectedSource.sourceInstance.params.captionFontColor = fontColorInput.value = 'rgba(0, 0, 0, 0)';
                            })

                            removeBg.addEventListener('click', function () {
                                _selectedSource.sourceInstance.params.captionBgColor = bgColorInput.value = 'rgba(0, 0, 0, 0)';
                            })

                            _generatedDialogs.push({
                                source: _selectedSource,
                                dialog:  dialogBodyInner
                            })
                            return dialogBodyInner;
                        }

                        function createBgFiltersParams() {
                            var backgroundFilters = document.createElement('DIV');
                            backgroundFilters.className = 'live-editor-options-bg-filters';

                            var removeBackgroundCon = _removeBackgroundParamEl = document.createElement('DIV');
                            removeBackgroundCon.className = 'live-editor-options-virtualBg'
                            backgroundFilters.appendChild(removeBackgroundCon);
                            var removeBgLabel = document.createElement('LABEL');
                            removeBackgroundCon.appendChild(removeBgLabel);

                            //remove background via mediapipe (ML)
                            var removeBgCheckbox = document.createElement('INPUT');
                            removeBgCheckbox.type = 'checkbox';
                            removeBgCheckbox.id = 'removeBg';
                            removeBgCheckbox.name = 'removeBg';
                            removeBgCheckbox.checked = false;
                            removeBgLabel.appendChild(removeBgCheckbox);
                            removeBgLabel.appendChild(document.createTextNode("Automatic background removal"));

                            removeBgCheckbox.addEventListener('change', function () {
                                if(removeBgCheckbox.checked) {
                                    webrtcVideoFilters.addLocalBackgroundFilter('virtualBg', _selectedSource);
                                } else {
                                    webrtcVideoFilters.removeLocalBackgroundFilter('virtualBg', _selectedSource)
                                }
                            })

                            //chroma key filter
                            var chromaKeyCon = _removeBackgroundParamEl = document.createElement('DIV');
                            chromaKeyCon.className = 'live-editor-options-chromaKey'
                            backgroundFilters.appendChild(chromaKeyCon);
                            var chromaKeyLabel = document.createElement('LABEL');
                            chromaKeyCon.appendChild(chromaKeyLabel);

                            var chromaKeyCheckbox = document.createElement('INPUT');
                            chromaKeyCheckbox.type = 'checkbox';
                            chromaKeyCheckbox.id = 'chromaKeyBg';
                            chromaKeyCheckbox.name = 'chromaKeyBg';
                            chromaKeyCheckbox.checked = false;
                            chromaKeyLabel.appendChild(chromaKeyCheckbox);
                            chromaKeyLabel.appendChild(document.createTextNode("Chroma key filter"));

                            var chromaKeyParams = document.createElement('DIV');
                            chromaKeyParams.className = 'live-editor-options-params-chromakey';
                            chromaKeyCon.appendChild(chromaKeyParams);

                            chromaKeyCheckbox.addEventListener('change', function () {
                                if (chromaKeyCheckbox.checked) {
                                    webrtcVideoFilters.addLocalBackgroundFilter('chromaKey', _selectedSource, {
                                        /*keyColor: keyColorInput.value,
                                        similarity: filterInfoObject.similarity,
                                        smoothless: filterInfoObject.smoothless,
                                        spill: filterInfoObject.spill */
                                    }).then(function (filterInstance) {
                                        createChromaKeyParams();
                                    });
                                } else {
                                    chromaKeyParams.innerHTML = '';
                                    webrtcVideoFilters.removeLocalBackgroundFilter('chromaKey', _selectedSource)
                                }
                            })

                            function createChromaKeyParams() {
                                chromaKeyParams.innerHTML = '';

                                var paramsContainer = document.createElement('DIV');
                                paramsContainer.className = 'live-editor-options-params-inner';
                                chromaKeyParams.appendChild(paramsContainer);

                                var keyColorContainer = document.createElement('DIV');
                                keyColorContainer.className = 'live-editor-options-params-keycolor';
                                paramsContainer.appendChild(keyColorContainer);
                                var keyColorText = document.createElement('DIV');
                                keyColorText.className = 'live-editor-options-params-text'
                                keyColorText.innerHTML = 'Key color'
                                keyColorContainer.appendChild(keyColorText);

                                var keyColorInput = document.createElement('INPUT');
                                keyColorInput.type = 'color';
                                keyColorInput.id = 'keyColor';
                                keyColorInput.name = 'keyColor';
                                keyColorInput.value = '#00FF00';
                                keyColorContainer.appendChild(keyColorInput);

                                let sliders = createChromaKeySliders();
                                paramsContainer.appendChild(sliders);

                                keyColorInput.addEventListener('input', function () {
                                    webrtcVideoFilters.updateParamValue('chromaKey', 'keyColor', keyColorInput.value, _selectedSource);
                                })
                            }

                            return backgroundFilters;
                        }

                        function createChromaKeySliders() {
                            let source = _selectedSource;
                            let slidersContainer = document.createElement('DIV');
                            slidersContainer.className = 'live-editor-options-filter-params'
                            var colorFilterParam = document.createElement('DIV');
                            colorFilterParam.className = 'live-editor-options-filter-params-item';
                            slidersContainer.appendChild(colorFilterParam);
                            

                            var similarityFilterParam = document.createElement('DIV');
                            similarityFilterParam.className = 'live-editor-options-filter-params-item';
                            slidersContainer.appendChild(similarityFilterParam);
                            var similarityFilterParamCaption = document.createElement('DIV');
                            similarityFilterParamCaption.className = 'live-editor-options-filter-params-item-caption';
                            similarityFilterParamCaption.innerHTML = 'Similarity';
                            similarityFilterParam.appendChild(similarityFilterParamCaption);
                            var similarityFilterParamConfig = document.createElement('DIV');
                            similarityFilterParamConfig.className = 'live-editor-options-filter-params-item-config';
                            similarityFilterParam.appendChild(similarityFilterParamConfig);

                            let similarityInputs = createNativeSlider({
                                min: 0,
                                max: 1,
                                step: 0.001,
                                value: webrtcVideoFilters.getParamValue('chromaKey', 'similarity', source),
                                createNumberInput: true,
                                oninput: function (val) {
                                    webrtcVideoFilters.updateParamValue('chromaKey', 'similarity', val, source);
                                }
                            });
                            let similarityInput = similarityInputs.rangeInput;
                            similarityFilterParamConfig.appendChild(similarityInput);

                            let similarityNumInput = similarityInputs.numberInput;
                            similarityFilterParamConfig.appendChild(similarityNumInput);

                            var smoothlessFilterParam = document.createElement('DIV');
                            smoothlessFilterParam.className = 'live-editor-options-filter-params-item';
                            slidersContainer.appendChild(smoothlessFilterParam);
                            var smoothlessFilterParamCaption = document.createElement('DIV');
                            smoothlessFilterParamCaption.className = 'live-editor-options-filter-params-item-caption';
                            smoothlessFilterParamCaption.innerHTML = 'Smoothless';
                            smoothlessFilterParam.appendChild(smoothlessFilterParamCaption);
                            var smoothlessFilterParamConfig = document.createElement('DIV');
                            smoothlessFilterParamConfig.className = 'live-editor-options-filter-params-item-config';
                            smoothlessFilterParam.appendChild(smoothlessFilterParamConfig);

                            let smoothlessInputs = createNativeSlider({
                                min: 0,
                                max: 1,
                                step: 0.001,
                                value: webrtcVideoFilters.getParamValue('chromaKey', 'smoothless', source),
                                createNumberInput: true,
                                oninput: function (val) {
                                    webrtcVideoFilters.updateParamValue('chromaKey', 'smoothless', val, source);                               
                                }
                            });

                            let smoothlessSlider = smoothlessInputs.rangeInput;
                            smoothlessFilterParamConfig.appendChild(smoothlessSlider);
                            let numberSmoothlessInput = smoothlessInputs.numberInput;
                            smoothlessFilterParamConfig.appendChild(numberSmoothlessInput);

                            var spillFilterParam = document.createElement('DIV');
                            spillFilterParam.className = 'live-editor-options-filter-params-item';
                            slidersContainer.appendChild(spillFilterParam);
                            var spillFilterParamCaption = document.createElement('DIV');
                            spillFilterParamCaption.className = 'live-editor-options-filter-params-item-caption';
                            spillFilterParamCaption.innerHTML = 'Spill';
                            spillFilterParam.appendChild(spillFilterParamCaption);
                            var spillFilterParamConfig = document.createElement('DIV');
                            spillFilterParamConfig.className = 'live-editor-options-filter-params-item-config';
                            spillFilterParam.appendChild(spillFilterParamConfig);

                            let spillInputs = createNativeSlider({
                                min: 0,
                                max: 1,
                                step: 0.001,
                                value: webrtcVideoFilters.getParamValue('chromaKey', 'spill', source),
                                createNumberInput: true,
                                oninput: function (val) {
                                    webrtcVideoFilters.updateParamValue('chromaKey', 'spill', val, source);                               
                                }
                            });

                            let spillSlider = spillInputs.rangeInput;
                            spillFilterParamConfig.appendChild(spillSlider);

                            let numberspillInput = spillInputs.numberInput;
                            spillFilterParamConfig.appendChild(numberspillInput);

                            return slidersContainer;
                        }

                        function createNativeSlider(options) {
                            let rangeInput = document.createElement('INPUT');
                            rangeInput.className = options.className ? options.className : '';
                            rangeInput.type = 'range';
                            rangeInput.min = options.min ? options.min : 0;
                            rangeInput.max = options.max ? options.max : 1;
                            rangeInput.step = options.step ? options.step : 0.001;
                            rangeInput.value = options.value;
                            rangeInput.style.backgroundSize = (options.value - options.min) * 100 / (options.max - options.min) + '% 100%';
                    
                            rangeInput.addEventListener('input', handleInputChange);
                            rangeInput.addEventListener('change', handleInputChange);
                    
                            let numberInput;
                            if (options.createNumberInput) {
                                numberInput = document.createElement('INPUT');
                                numberInput.type = 'number';
                                numberInput.min = 0;
                                numberInput.max = 1;
                                numberInput.step = 0.01;
                                numberInput.value = options.value;
                                numberInput.addEventListener('input', function (e) {
                                    rangeInput.value = e.target.value;
                                    if ("createEvent" in document) {
                                        var evt = document.createEvent("HTMLEvents");
                                        evt.initEvent("change", false, true);
                                        rangeInput.dispatchEvent(evt);
                                    } else {
                                        rangeInput.fireEvent("onchange");
                                    }
                                });
                    
                                return { rangeInput: rangeInput, numberInput: numberInput };
                            }
                    
                            return { rangeInput: rangeInput };
                    
                            function handleInputChange(e) {
                                let target = e.target
                    
                                const min = target.min
                                const max = target.max
                                const val = target.value
                    
                                target.style.backgroundSize = (val - min) * 100 / (max - min) + '% 100%';
                    
                                if (numberInput) numberInput.value = val;
                                if (options.oninput != null) options.oninput(val);
                            }
                        }

                        function showParams() {
                            _dialogBody.innerHTML = '';
                            _dialogBody.appendChild(createParamsList());
                        }

                        function showDialog(source) {
                            _selectedSource = source;
                            log('showDialog', this, _activeView)
                            hideActiveView();
                            showParams();
                            _optionsParentEl.appendChild(_dialogEl);
                            _activeView = this;
                        }

                        function hideDialog() {
                            log('hideDialog', _dialogEl)

                            if(_dialogEl && _dialogEl.parentNode != null) {
                                _dialogEl.parentNode.removeChild(_dialogEl);
                            }
                        }

                        log('addImagePopup')
                        _dialogEl = document.createElement('DIV');
                        _dialogEl.className = 'live-editor-options-dialog';
                        var dialogBody = _dialogBody = document.createElement('DIV');
                        dialogBody.className = 'live-editor-options-body';

                        //dialogBody.appendChild(createParamsList());
                        _dialogEl.appendChild(dialogBody);

                        return {
                            hide: hideDialog,
                            show: showDialog,
                            showParams: showParams
                        }
                    }())

                    var webrtcVideoFilters = (function () {
                        
                        function declareOrRefreshEventHandlers() {
                            var webrtcSignalingLib = tool.webrtcSignalingLib;
                            tool.eventDispatcher.on('beforeSwitchRoom', function (e) {
                                declareOrRefreshEventHandlers();
                            });
    
                            webrtcSignalingLib.event.on('trackAdded', function (e) {
                                if (e.track.kind != 'video') return;
                                filterVideoOfParticipantLocally(e.track.participant);
                            });
                        }
    
                        declareOrRefreshEventHandlers();

                        function addLocalBackgroundFilter(filterName, source, params = {}) {
                            let participant =  source.sourceInstance.participant;
                            if(participant.livestreamFilters == null) {
                                participant.livestreamFilters = [];
                            }

                            for (let i in participant.livestreamFilters) {
                                if (participant.livestreamFilters[i].name == filterName) {
                                    return Promise.resolve();
                                }
                            }

                            return new Promise(function (resolve, reject) {
                                let filterInfoObject = {
                                    id: Date.now().toString(36) + Math.random().toString(36).replace(/\./g, ""),
                                    name: filterName,
                                    ...params
                                };
                                participant.livestreamFilters.push(filterInfoObject);
                                filterVideoOfParticipantLocally(participant);
                                resolve(filterInfoObject);
                            })
                        }

                        function removeLocalBackgroundFilter(filterName, source) {
                            let participant =  source.sourceInstance.participant;
                            //there can be only one per video virtualBg filter
                            for (let i in participant.livestreamFilters) {
                                if (participant.livestreamFilters[i].name == filterName) {
                                    stopFilterVideoOfParticipantLocally(participant.livestreamFilters[i], participant);
                                    return true;
                                }
                            }
                            return false;
                        }

                        function filterVideoOfParticipantLocally(participant) {
                            log('filterVideoOfParticipantLocally START', participant);
                            if(!participant.livestreamFilters || participant.livestreamFilters.length == 0) return;
                            for (let t in participant.tracks) {
                                let trackToFilter = participant.tracks[t];
                                log('filterVideoOfParticipantLocally trackToFilter.mediaStreamTrack', trackToFilter.mediaStreamTrack, trackToFilter.stream.active);
                
                                //filters cannot be applied on screensharing video for now
                                if (trackToFilter.kind != 'video' || trackToFilter.screensharing || trackToFilter.mediaStreamTrack.readyState == 'ended' || !trackToFilter.stream.active) continue;
                
                                log('filterVideoOfParticipantLocally trackToFilter', trackToFilter, trackToFilter.mediaStreamTrack.readyState);
                               
                                if (!trackToFilter.livestreamVideoProcessor || !trackToFilter.livestreamVideoProcessor.videoProcessorTrack) {
                                    createTrackProcessorForParticipant(trackToFilter, participant)
                                }
                
                                for (let f in participant.livestreamFilters) {
                                    let filterInfoObject = participant.livestreamFilters[f];
                                    if (trackToFilter.livestreamVideoProcessor.appliedFilters[filterInfoObject.id]) continue; //if this filter already applied for this track, then skip
                
                                    if (filterInfoObject.name == 'virtualBg') {
                                        trackToFilter.livestreamVideoProcessor.appliedFilters[filterInfoObject.id] = trackToFilter.livestreamVideoProcessor.videoProcessorTrack.applyFilter(filterInfoObject.name, {
                                            filterId: filterInfoObject.id,
                                            replaceWithColor: filterInfoObject.replaceWithColor,
                                            bgImage: filterInfoObject.bgImage
                                        });
                                    } else if (filterInfoObject.name == 'chromaKey') {
                                        trackToFilter.livestreamVideoProcessor.appliedFilters[filterInfoObject.id] = trackToFilter.livestreamVideoProcessor.videoProcessorTrack.applyFilter(filterInfoObject.name, {
                                            filterId: filterInfoObject.id,
                                            keyColor: filterInfoObject.keyColor,
                                            similarity: filterInfoObject.similarity,
                                            smoothless: filterInfoObject.smoothless,
                                            spill: filterInfoObject.spill
                                        });

                                        let filterInstance = trackToFilter.livestreamVideoProcessor.appliedFilters[filterInfoObject.id];
                                        filterInfoObject.keyColor = filterInstance.keyColor;
                                        filterInfoObject.similarity = filterInstance.similarity;
                                        filterInfoObject.smoothless = filterInstance.smoothless;
                                        filterInfoObject.spill = filterInstance.spill;
                                    }
                                    log('filterVideoOfParticipantLocally trackToFilter.livestreamVideoProcessor', trackToFilter.livestreamVideoProcessor);
                
                                    tool.webrtcSignalingLib.event.dispatch('filterApplied', {filter: trackToFilter.livestreamVideoProcessor.appliedFilters[filterInfoObject.id]});
                
                                }
                            }
                        }

                        function stopFilterVideoOfParticipantLocally(filterToRemoveInfo, participant) {
                            for (let i = participant.livestreamFilters.length - 1; i >= 0; i--) {
                                if (participant.livestreamFilters[i] == filterToRemoveInfo) {
                                    participant.livestreamFilters.splice(i, 1)[0];
                                }
                            }
                
                            for (let t in participant.tracks) {
                                if(participant.tracks[t].kind != 'video' || !participant.tracks[t].livestreamVideoProcessor || participant.tracks[t].screensharing) continue;                        
                
                                let trackToRemoveFilterFrom = participant.tracks[t];
                                if(trackToRemoveFilterFrom.livestreamVideoProcessor.appliedFilters[filterToRemoveInfo.id]) {
                                    let appliedFilter = trackToRemoveFilterFrom.livestreamVideoProcessor.appliedFilters[filterToRemoveInfo.id];
                                    appliedFilter.videoTrackProcessor.removeFilter(appliedFilter);
                
                                    delete trackToRemoveFilterFrom.livestreamVideoProcessor.appliedFilters[filterToRemoveInfo.id];
                
                                    //if there are no filters to apply and send to "participant", then stop media processor instance that processes video
                                    if(participant.livestreamFilters.length == 0) {
                                        trackToRemoveFilterFrom.livestreamVideoProcessor.videoProcessorTrack.stop();
                                        delete trackToRemoveFilterFrom.livestreamVideoProcessor;
                                    }
                                }
                            }
                
                            tool.webrtcSignalingLib.event.dispatch('filterRemoved', {filterInfo: filterToRemoveInfo });
                
                            return filterToRemoveInfo;
                        }

                        /**
                        * Initiates processing track (removing bg etc.) for some participant (usually a livestreaming host)
                        * @method createTrackProcessorForParticipant
                        * @param {Object} [track] instance of Track (not MediaStreamTrack) that has mediaStreamTrack as its property
                        * @param {Object} [participant] instance of Participant
                        */
                        function createTrackProcessorForParticipant(originalTrack, participant) {

                            if (originalTrack.livestreamVideoProcessor && originalTrack.livestreamVideoProcessor.videoProcessorTrack) {
                                log('createTrackProcessorForParticipant return');

                                return;
                            }
                            log('createTrackProcessorForParticipant START', originalTrack, participant);

                            var processedTrack = {};
                            processedTrack.sid = originalTrack.mediaStreamTrack.id;
                            processedTrack.kind = originalTrack.kind;
                            processedTrack.originalTrack = originalTrack;

                            let videoProcessorTrack = Q.Media.WebRTC.mediaProcessor.addVideoTrack(originalTrack.mediaStreamTrack);

                            processedTrack.mediaStreamTrack = videoProcessorTrack.generatedTrack;
                            processedTrack.stream = videoProcessorTrack.stream;
                            processedTrack.videoProcessorTrack = videoProcessorTrack;

                            originalTrack.livestreamVideoProcessor = {
                                participant: participant, //for which participant video processor was created
                                videoProcessorTrack: videoProcessorTrack, //actually processor - object that we can use for adding/removing filters
                                processedTrack: processedTrack, //generated MediaStreamTrack
                                appliedFilters: {}, //for further tracking which filters were applied and which not. Key is id of filter that was generated by the participant to which track will be semt
                            };

                            //if(participant.isLocal) {
                            processedTrack.trackEl = createTrackElement(processedTrack);
                            //}

                            originalTrack.mediaStreamTrack.addEventListener('ended', function () {
                                if (originalTrack.livestreamVideoProcessor && originalTrack.livestreamVideoProcessor.videoProcessorTrack) {
                                    originalTrack.livestreamVideoProcessor.videoProcessorTrack.stop();
                                    delete originalTrack.livestreamVideoProcessor;
                                    delete processedTrack.videoProcessorTrack;
                                }
                            })

                            return processedTrack;
                        }

                        function createTrackElement(track) {
                            var remoteStreamEl, stream;
                            if(track.kind == 'video') {
                                if(track.stream != null) {
                                    try {
                                        remoteStreamEl = document.createElement(track.kind);
                                        remoteStreamEl.srcObject = stream = track.stream;
                                    } catch(e) {
                                        console.error(e.name + ': ' + e.message)
                                    }
                    
                                } else {
                    
                                    remoteStreamEl = document.createElement(track.kind);
                    
                                    try{
                                        stream = new MediaStream();
                                    } catch(e){
                                        console.error(e.name + ': ' + e.message)
                                    }
                    
                                    stream.addTrack(track.mediaStreamTrack);
                    
                                    try{
                                        remoteStreamEl.srcObject = stream;
                                    } catch(e){
                                        console.error(e.name + ': ' + e.message)
                                    }
                                    track.stream = stream;
                                }
                            }
                            
                            remoteStreamEl.controls = false;
                            remoteStreamEl.disablepictureinpicture = false;
                            
                
                            return remoteStreamEl;
                        }

                        /**
                        * Updates parameter of the filter on the ALL (usually one, for now) video tracks (e.g. key color for chromakey filter). Updating can be triggered remotely by the livestream host via livestream editor + web socket
                        * or locally when livestream host updates params of filter for his own video that he is not sending via WebRTC but uses only in livestream editor
                        * @method updateFilterParam
                        * @param {Object} [filterToUpdateInfo] instance of object that contains info about filter: id, name, params etc.
                        * @param {Object} [paramName] name of param to update (e.g. similarity in chromkey filter)
                        * @param {Object} [paramValue] new value of param
                        * @param {Object} [ownerParticipant] participant whose video tracks are filtered. targetParticipant and ownerParticipant could be the same when video is filtered for internal use (not for sending it via webrtc)
                        */
                        function updateTracksFilterParam(filterToUpdateInfo, paramName, paramValue, ownerParticipant) {
                            ownerParticipant = ownerParticipant || localParticipant;
                            for (let t in ownerParticipant.tracks) {
                                if (ownerParticipant.tracks[t].kind != 'video' || !ownerParticipant.tracks[t].livestreamVideoProcessor || ownerParticipant.tracks[t].screensharing) continue;

                                let trackToUpdateFilterOf = ownerParticipant.tracks[t];
                                if (trackToUpdateFilterOf.livestreamVideoProcessor.appliedFilters[filterToUpdateInfo.id]) {
                                    let appliedFilter = trackToUpdateFilterOf.livestreamVideoProcessor.appliedFilters[filterToUpdateInfo.id];
                                    appliedFilter.updateParam(paramName, paramValue);
                                }
                            }

                            filterToUpdateInfo[paramName] = paramValue;

                            tool.webrtcSignalingLib.event.dispatch('filterUpdated', { filterInfo: filterToUpdateInfo });

                            return filterToUpdateInfo;
                        }

                        function updateParamValue(filterName, paramName, paramValue, source) {
                            let participant =  source.sourceInstance.participant;
                            for (let i in participant.livestreamFilters) {
                                if (participant.livestreamFilters[i].name == filterName) {
                                    updateTracksFilterParam(participant.livestreamFilters[i], paramName, paramValue, participant);
                                    break;
                                }
                            }
                        }

                        function onChromaKeyColorChange(hexColor, source) {
                            let participant =  source.sourceInstance.participant;
                            for (let i in participant.livestreamFilters) {
                                if (participant.livestreamFilters[i].name == 'chromaKey') {
                                    updateFilterParam(participant.livestreamFilters[i], 'keyColor', hexColor, participant);
                                    break;
                                }
                            }
                        }

                        function getParamValue(filterName, paramName, source) {
                            let participant =  source.sourceInstance.participant;
                            for (let i in participant.livestreamFilters) {
                                if (participant.livestreamFilters[i].name == filterName) {
                                    return participant.livestreamFilters[i][paramName];
                                }
                            }
                        }

                        return {
                            addLocalBackgroundFilter: addLocalBackgroundFilter,
                            removeLocalBackgroundFilter: removeLocalBackgroundFilter,
                            updateParamValue: updateParamValue,
                            getParamValue: getParamValue
                        }
                    }())

                    var imageSourceOptions = (function (source) {
                        var _dialogEl = null;
                        var _optionsTabs = null;
                        var _dialogBody = null;
                        var _layoutParamsEl = null;
                        var _selectedSource = null;
                        var _generatedDialogs = [];

                        function createParamsList() {

                            for(let d in _generatedDialogs) {
                                if(_generatedDialogs[d].source == _selectedSource) {
                                    return _generatedDialogs[d].dialog;
                                }
                            }

                            var dialogBodyInner = document.createElement('DIV');
                            dialogBodyInner.className = 'live-editor-options-body-inner live-editor-options-params-body';

                            var keepRatioCon = document.createElement('DIV');
                            var keepRatio = document.createElement('INPUT');
                            keepRatio.type = 'checkbox';
                            keepRatio.id = 'live-editor-options-keep-ratio';
                            keepRatio.name = 'keepRatio';
                            keepRatio.checked = true;
                            var keepRatioLabel = document.createElement('Label');
                            keepRatioLabel.appendChild(keepRatio);
                            keepRatioLabel.appendChild(document.createTextNode("Keep ratio"));
                            keepRatioCon.appendChild(keepRatioLabel);

                            //size
                            var sizeAndPositionCon = document.createElement('DIV');
                            sizeAndPositionCon.className = 'live-editor-options-params-size-pos';

                            var sizeCon = document.createElement('DIV');
                            sizeCon.className = 'live-editor-options-params-size';
                            sizeAndPositionCon.appendChild(sizeCon);

                            var sizeWidthCon = document.createElement('DIV');
                            sizeWidthCon.className = 'live-editor-options-params-size-width';
                            sizeCon.appendChild(sizeWidthCon);
                            var widthText = document.createElement('SPAN');
                            widthText.innerHTML = 'Width: ';
                            sizeWidthCon.appendChild(widthText);
                            var width = document.createElement('INPUT');
                            width.type = 'text';
                            width.value = _selectedSource.sourceInstance.rect._width;
                            sizeWidthCon.appendChild(width);

                            var sizeHeightCon = document.createElement('DIV');
                            sizeHeightCon.className = 'live-editor-options-params-size-height';
                            sizeCon.appendChild(sizeHeightCon);
                            var heightText = document.createElement('SPAN');
                            heightText.innerHTML = 'Height: ';
                            sizeHeightCon.appendChild(heightText);
                            var height = document.createElement('INPUT');
                            height.type = 'text';
                            height.value = _selectedSource.sourceInstance.rect._height;
                            sizeHeightCon.appendChild(height);


                            //position
                            var positionCon = document.createElement('DIV');
                            positionCon.className = 'live-editor-options-params-position';
                            sizeAndPositionCon.appendChild(positionCon);

                            var topPositionCon = document.createElement('DIV');
                            topPositionCon.className = 'live-editor-options-params-position-top';
                            positionCon.appendChild(topPositionCon);
                            var topText = document.createElement('SPAN');
                            topText.innerHTML = 'Top: ';
                            topPositionCon.appendChild(topText);
                            var topPos = document.createElement('INPUT');
                            topPos.type = 'text';
                            topPos.value = _selectedSource.sourceInstance.rect._y;
                            topPositionCon.appendChild(topPos);

                            var leftPositionCon = document.createElement('DIV');
                            leftPositionCon.className = 'live-editor-options-params-position-left';
                            positionCon.appendChild(leftPositionCon);
                            var leftText = document.createElement('SPAN');
                            leftText.innerHTML = 'Left: ';
                            leftPositionCon.appendChild(leftText);
                            var leftPos = document.createElement('INPUT');
                            leftPos.type = 'text';
                            leftPos.value = _selectedSource.sourceInstance.rect._x;
                            leftPositionCon.appendChild(leftPos);


                            dialogBodyInner.appendChild(keepRatioCon);
                            dialogBodyInner.appendChild(sizeAndPositionCon);

                            _layoutParamsEl = dialogBodyInner;

                            function updateSourceRect () {
                                var canvasSize = tool.canvasComposer.videoComposer.getCanvasSize();
                                var keepAspectRatio = keepRatio.checked;
                                var currentWidth = _selectedSource.sourceInstance.rect._width;
                                var currentHeight = _selectedSource.sourceInstance.rect._height;
                                var w = parseFloat(width.value);
                                var h = parseFloat(height.value);
                                var x = parseFloat(leftPos.value);
                                var y = parseFloat(topPos.value);

                                var ratio = currentWidth / currentHeight;

                                log('updateSourceRect width', w, currentWidth)
                                log('updateSourceRect height', h, currentHeight)
                                log('updateSourceRect ratio', ratio)

                                var resWidth, resHeight;
                                if(keepAspectRatio) {
                                    if (w != currentWidth) {
                                        resWidth = w;
                                        resHeight = parseInt(resWidth / ratio);
                                        height.value = resHeight;
                                        log('updateSourceRect 1 resHeight', resHeight)
                                    } else if (h != currentHeight) {

                                        resHeight = h;
                                        resWidth = parseInt(resHeight * ratio);
                                        width.value = resWidth;
                                        log('updateSourceRect 2 resWidth', resWidth)

                                    } else {
                                        log('updateSourceRect 3')
                                        resWidth = currentWidth;
                                        resHeight = currentHeight;
                                    }
                                } else {
                                    if (w != currentWidth) {
                                        resWidth = w;
                                        resHeight = h;
                                    } else if (h != currentHeight) {
                                        resHeight = h;
                                        resWidth = w;
                                    } else {
                                        resWidth = currentWidth;
                                        resHeight = currentHeight;
                                    }
                                }

                                _selectedSource.sourceInstance.updateRect(resWidth, resHeight, x, y)
                            }
                            width.addEventListener('blur', updateSourceRect)
                            height.addEventListener('blur', updateSourceRect)
                            topPos.addEventListener('blur', updateSourceRect)
                            leftPos.addEventListener('blur', updateSourceRect)
                            _selectedSource.sourceInstance.on('rectChanged', function () {
                                width.value = _selectedSource.sourceInstance.rect._width;
                                height.value = _selectedSource.sourceInstance.rect._height;
                                leftPos.value = _selectedSource.sourceInstance.rect._x;
                                topPos.value = _selectedSource.sourceInstance.rect._y;
                            });

                            _generatedDialogs.push({
                                source: _selectedSource,
                                dialog:  dialogBodyInner
                            })
                            return dialogBodyInner;
                        }

                        function showParams() {
                            _dialogBody.innerHTML = '';
                            _dialogBody.appendChild(createParamsList());
                        }

                        function showDialog(source) {
                            _selectedSource = source;
                            log('showDialog', this, _activeView)
                            hideActiveView();
                            showParams();
                            _optionsParentEl.appendChild(_dialogEl);
                            _activeView = this;
                        }

                        function hideDialog() {
                            log('hideDialog', _dialogEl)

                            if(_dialogEl && _dialogEl.parentNode != null) {
                                _dialogEl.parentNode.removeChild(_dialogEl);
                            }
                        }

                        log('addImagePopup')
                        _dialogEl = document.createElement('DIV');
                        _dialogEl.className = 'live-editor-options-dialog';
                        var dialogBody = _dialogBody = document.createElement('DIV');
                        dialogBody.className = 'live-editor-options-body';

                        //dialogBody.appendChild(createParamsList());
                        _dialogEl.appendChild(dialogBody);

                        return {
                            hide: hideDialog,
                            show: showDialog,
                            showParams: showParams
                        }
                    }())

                    var videoSourceOptions = (function (source) {
                        var _dialogEl = null;
                        var _optionsTabs = null;
                        var _dialogBody = null;
                        var _layoutParamsEl = null;
                        var _selectedSource = null;
                        var _generatedDialogs = [];

                        function createParamsList() {

                            for(let d in _generatedDialogs) {
                                if(_generatedDialogs[d].source == _selectedSource) {
                                    return _generatedDialogs[d].dialog;
                                }
                            }

                            var dialogBodyInner = document.createElement('DIV');
                            dialogBodyInner.className = 'live-editor-options-body-inner live-editor-options-params-body';

                            var mediaControlsEl = createMediaControls(_selectedSource);

                            var keepRatioCon = document.createElement('DIV');
                            var keepRatio = document.createElement('INPUT');
                            keepRatio.type = 'checkbox';
                            keepRatio.id = 'live-editor-options-keep-ratio';
                            keepRatio.name = 'keepRatio';
                            keepRatio.checked = true;
                            var keepRatioLabel = document.createElement('Label');
                            keepRatioLabel.appendChild(keepRatio);
                            keepRatioLabel.appendChild(document.createTextNode("Keep ratio"));
                            keepRatioCon.appendChild(keepRatioLabel);

                            //size
                            var sizeAndPositionCon = document.createElement('DIV');
                            sizeAndPositionCon.className = 'live-editor-options-params-size-pos';

                            var sizeCon = document.createElement('DIV');
                            sizeCon.className = 'live-editor-options-params-size';
                            sizeAndPositionCon.appendChild(sizeCon);

                            var sizeWidthCon = document.createElement('DIV');
                            sizeWidthCon.className = 'live-editor-options-params-size-width';
                            sizeCon.appendChild(sizeWidthCon);
                            var widthText = document.createElement('SPAN');
                            widthText.innerHTML = 'Width: ';
                            sizeWidthCon.appendChild(widthText);
                            var width = document.createElement('INPUT');
                            width.type = 'text';
                            width.value = _selectedSource.sourceInstance.rect._width;
                            sizeWidthCon.appendChild(width);

                            var sizeHeightCon = document.createElement('DIV');
                            sizeHeightCon.className = 'live-editor-options-params-size-height';
                            sizeCon.appendChild(sizeHeightCon);
                            var heightText = document.createElement('SPAN');
                            heightText.innerHTML = 'Height: ';
                            sizeHeightCon.appendChild(heightText);
                            var height = document.createElement('INPUT');
                            height.type = 'text';
                            height.value = _selectedSource.sourceInstance.rect._height;
                            sizeHeightCon.appendChild(height);


                            //position
                            var positionCon = document.createElement('DIV');
                            positionCon.className = 'live-editor-options-params-position';
                            sizeAndPositionCon.appendChild(positionCon);

                            var topPositionCon = document.createElement('DIV');
                            topPositionCon.className = 'live-editor-options-params-position-top';
                            positionCon.appendChild(topPositionCon);
                            var topText = document.createElement('SPAN');
                            topText.innerHTML = 'Top: ';
                            topPositionCon.appendChild(topText);
                            var topPos = document.createElement('INPUT');
                            topPos.type = 'text';
                            topPos.value = _selectedSource.sourceInstance.rect._y;
                            topPositionCon.appendChild(topPos);

                            var leftPositionCon = document.createElement('DIV');
                            leftPositionCon.className = 'live-editor-options-params-position-left';
                            positionCon.appendChild(leftPositionCon);
                            var leftText = document.createElement('SPAN');
                            leftText.innerHTML = 'Left: ';
                            leftPositionCon.appendChild(leftText);
                            var leftPos = document.createElement('INPUT');
                            leftPos.type = 'text';
                            leftPos.value = _selectedSource.sourceInstance.rect._x;
                            leftPositionCon.appendChild(leftPos);


                            dialogBodyInner.appendChild(mediaControlsEl);
                            dialogBodyInner.appendChild(keepRatioCon);
                            dialogBodyInner.appendChild(sizeAndPositionCon);

                            _layoutParamsEl = dialogBodyInner;

                            function updateSourceRect () {
                                var canvasSize = tool.canvasComposer.videoComposer.getCanvasSize();
                                var keepAspectRatio = keepRatio.checked;
                                var currentWidth = _selectedSource.sourceInstance.rect._width;
                                var currentHeight = _selectedSource.sourceInstance.rect._height;
                                var w = parseFloat(width.value);
                                var h = parseFloat(height.value);
                                var x = parseFloat(leftPos.value);
                                var y = parseFloat(topPos.value);

                                var ratio = currentWidth / currentHeight;

                                log('updateSourceRect width', w, currentWidth)
                                log('updateSourceRect height', h, currentHeight)
                                log('updateSourceRect ratio', ratio)

                                var resWidth, resHeight;
                                if(keepAspectRatio) {
                                    if (w != currentWidth) {
                                        resWidth = w;
                                        resHeight = parseInt(resWidth / ratio);
                                        height.value = resHeight;
                                        log('updateSourceRect 1 resHeight', resHeight)
                                    } else if (h != currentHeight) {

                                        resHeight = h;
                                        resWidth = parseInt(resHeight * ratio);
                                        width.value = resWidth;
                                        log('updateSourceRect 2 resWidth', resWidth)

                                    } else {
                                        log('updateSourceRect 3')
                                        resWidth = currentWidth;
                                        resHeight = currentHeight;
                                    }
                                } else {
                                    if (w != currentWidth) {
                                        resWidth = w;
                                        resHeight = h;
                                    } else if (h != currentHeight) {
                                        resHeight = h;
                                        resWidth = w;
                                    } else {
                                        resWidth = currentWidth;
                                        resHeight = currentHeight;
                                    }
                                }

                                _selectedSource.sourceInstance.updateRect(resWidth, resHeight, x, y)
                            }
                            width.addEventListener('blur', updateSourceRect)
                            height.addEventListener('blur', updateSourceRect)
                            topPos.addEventListener('blur', updateSourceRect)
                            leftPos.addEventListener('blur', updateSourceRect)
                            _selectedSource.sourceInstance.on('rectChanged', function () {
                                width.value = _selectedSource.sourceInstance.rect._width;
                                height.value = _selectedSource.sourceInstance.rect._height;
                                leftPos.value = _selectedSource.sourceInstance.rect._x;
                                topPos.value = _selectedSource.sourceInstance.rect._y;
                            });

                            _generatedDialogs.push({
                                source: _selectedSource,
                                dialog:  dialogBodyInner
                            })
                            return dialogBodyInner;
                        }

                        function showParams() {
                            _dialogBody.innerHTML = '';
                            _dialogBody.appendChild(createParamsList());
                        }

                        function showDialog(source) {
                            _selectedSource = source;
                            log('showDialog', this, _activeView)
                            hideActiveView();
                            showParams();
                            _optionsParentEl.appendChild(_dialogEl);
                            _activeView = this;
                        }

                        function hideDialog() {
                            log('hideDialog', _dialogEl)

                            if(_dialogEl && _dialogEl.parentNode != null) {
                                _dialogEl.parentNode.removeChild(_dialogEl);
                            }
                        }

                        log('addImagePopup')
                        _dialogEl = document.createElement('DIV');
                        _dialogEl.className = 'live-editor-options-dialog';
            
                        var dialogBody = _dialogBody = document.createElement('DIV');
                        dialogBody.className = 'live-editor-options-body';

                        //dialogBody.appendChild(createParamsList());
                        _dialogEl.appendChild(dialogBody);

                        return {
                            hide: hideDialog,
                            show: showDialog,
                            showParams: showParams
                        }
                    }())

                    var audioSourceOptions = (function (source) {
                        var _dialogEl = null;
                        var _optionsTabs = null;
                        var _dialogBody = null;
                        var _layoutParamsEl = null;
                        var _selectedSource = null;
                        var _generatedDialogs = [];

                        function createParamsList() {
                            log('audioSourceOptions: createParamsList',  _selectedSource.params);
                            for(let d in _generatedDialogs) {
                                if(_generatedDialogs[d].source == _selectedSource) {
                                    return _generatedDialogs[d].dialog;
                                }
                            }

                            var paramsBody = document.createElement('DIV')
                            paramsBody.className = 'live-editor-options-body-inner live-editor-options-params-body';

                            var mediaControlsEl = createMediaControls(_selectedSource);
                            paramsBody.appendChild(mediaControlsEl);

                            _generatedDialogs.push({
                                source: _selectedSource,
                                dialog:  paramsBody,
                            })
                            return paramsBody;
                        }

                        function showParams() {
                            log('showParams', this, _activeView)

                            _dialogBody.innerHTML = '';
                            _dialogBody.appendChild(createParamsList());
                        }

                        function showDialog(source) {
                            _selectedSource = source;
                            log('audioSourceOptions: showDialog', this, _activeView)
                            hideActiveView();
                            showParams();
                            _optionsParentEl.appendChild(_dialogEl);
                            _activeView = this;
                        }

                        function hideDialog() {
                            log('audioSourceOptions: hideDialog', _dialogEl)

                            if(_dialogEl && _dialogEl.parentNode != null) {
                                _dialogEl.parentNode.removeChild(_dialogEl);
                            }
                        }

                        log('audioSourceOptions pupup')
                        _dialogEl = document.createElement('DIV');
                        _dialogEl.className = 'live-editor-options-dialog';
                    
                        var dialogBody = _dialogBody = document.createElement('DIV');
                        dialogBody.className = 'live-editor-options-body';

                        //dialogBody.appendChild(createParamsList());
                        _dialogEl.appendChild(dialogBody);

                        return {
                            hide: hideDialog,
                            show: showDialog,
                            showParams: showParams
                        }
                    }())

                    var webrtcAudioSourceOptions = (function (source) {
                        var _dialogEl = null;
                        var _optionsTabs = null;
                        var _dialogBody = null;
                        var _selectedSource = null;
                        var _generatedDialogs = [];

                        function createParamsList() {
                            log('audioSourceOptions: createParamsList',  _selectedSource.params);
                            for(let d in _generatedDialogs) {
                                if(_generatedDialogs[d].source == _selectedSource) {
                                    return _generatedDialogs[d].dialog;
                                }
                            }

                            var paramsBody = document.createElement('DIV')
                            paramsBody.className = 'live-editor-options-body-inner live-editor-options-params-body';

                            var mediaControlsEl = createMediaControls(_selectedSource);
                            paramsBody.appendChild(mediaControlsEl);

                            _generatedDialogs.push({
                                source: _selectedSource,
                                dialog:  paramsBody,
                            })
                            return paramsBody;
                        }

                        function showParams() {
                            log('showParams', this, _activeView)

                            _dialogBody.innerHTML = '';
                            _dialogBody.appendChild(createParamsList());
                        }

                        function showDialog(source) {
                            _selectedSource = source;
                            log('audioSourceOptions: showDialog', this, _activeView)
                            hideActiveView();
                            showParams();
                            _optionsParentEl.appendChild(_dialogEl);
                            _activeView = this;
                        }

                        function hideDialog() {
                            log('audioSourceOptions: hideDialog', _dialogEl)

                            if(_dialogEl && _dialogEl.parentNode != null) {
                                _dialogEl.parentNode.removeChild(_dialogEl);
                            }
                        }

                        log('audioSourceOptions pupup')
                        _dialogEl = document.createElement('DIV');
                        _dialogEl.className = 'live-editor-options-dialog';
                        
                        var dialogBody = _dialogBody = document.createElement('DIV');
                        dialogBody.className = 'live-editor-options-body';

                        //dialogBody.appendChild(createParamsList());
                        _dialogEl.appendChild(dialogBody);

                        return {
                            hide: hideDialog,
                            show: showDialog,
                            showParams: showParams
                        }
                    }())

                    function update() {
                        var activeScene = scenesInterface.getActive();
                        var selectedSource = activeScene.sourcesInterface.getSelectedSource();
                        log('optionsColumn.update', selectedSource);

                        if(selectedSource && selectedSource.isOverlay) return;

                        if (selectedSource != null) {
                            let sceneIsInactive = true;
                            let activeSceneSources = activeScene.sceneInstance.sources;
                            for (let i in activeSceneSources) {
                                if (activeSceneSources[i] == selectedSource.sourceInstance) {
                                    sceneIsInactive = false;
                                    break;
                                }    
                                if(activeSceneSources[i].sourceType == 'group') {
                                    for (let s in activeSceneSources[i].sources) {
                                        if (activeSceneSources[i].sources[s] == selectedSource.sourceInstance) {
                                            sceneIsInactive = false;
                                            break;
                                        }                           
                                    }
                                }                            
                            }
                            if(sceneIsInactive) {
                                optionsColumn.hideActiveView();
                                log('optionsColumn.update sceneIsInactive', selectedSource);
                                return;
                            }
                        }

                        if(selectedSource && selectedSource.listType != 'audio' && selectedSource.sourceInstance.sourceType == 'group' && selectedSource.sourceInstance.groupType == 'webrtc') {
                            log('optionsColumn.update 1');
                            optionsColumn.canvasLayoutOptions.show(selectedSource);
                        } else if(selectedSource && selectedSource.listType != 'audio' && selectedSource.sourceInstance.sourceType == 'webrtc') {
                            log('optionsColumn.update 2');
                            optionsColumn.webrtcParticipantOptions.show(selectedSource);
                        } else if(selectedSource && selectedSource.sourceInstance.sourceType == 'image') {
                            log('optionsColumn.update 3');
                            optionsColumn.imageSourceOptions.show(selectedSource);
                        } else if(selectedSource && selectedSource.sourceInstance.sourceType == 'video') {
                            log('optionsColumn.update 4');
                            optionsColumn.videoSourceOptions.show(selectedSource);
                        } else if(selectedSource && selectedSource.sourceInstance.sourceType == 'audio' && selectedSource.sourceInstance.sourceType != 'webrtc') {
                            log('optionsColumn.update 5');
                            optionsColumn.audioSourceOptions.show(selectedSource);
                        } else if(selectedSource && selectedSource.listType == 'audio' && selectedSource.sourceInstance.sourceType == 'webrtcaudio') {
                            log('optionsColumn.update 6');
                            //optionsColumn.webrtcAudioSourceOptions.show(selectedSource);
                        } else {
                            log('optionsColumn.update 7');
                            optionsColumn.hideActiveView();
                        }
                    }

                    function getSettingsDialog() {
                        return _optionsParentEl;
                    }

                    return {
                        canvasLayoutOptions: canvasLayoutOptions,
                        webrtcParticipantOptions: webrtcParticipantOptions,
                        imageSourceOptions: imageSourceOptions,
                        videoSourceOptions: videoSourceOptions,
                        audioSourceOptions: audioSourceOptions,
                        webrtcAudioSourceOptions: webrtcAudioSourceOptions,
                        hideActiveView: hideActiveView,
                        update: update,
                        getSettingsDialog: getSettingsDialog
                    }
                }())

                var textChatsInterface = (function () {
                    var _relatedTool = null;
                    var _chatRooms = [];
                    var _chatToolContainer = null;
                    var _currentActiveChatRoom = null;
                    var _chatEl = null;

                    function onStreamClickHandler(chatRoomData) {
                        if(_currentActiveChatRoom && _currentActiveChatRoom.chatTool) {
                            if(_currentActiveChatRoom.chatToolElement && _currentActiveChatRoom.chatToolElement.parentElement) {
                                _currentActiveChatRoom.chatToolElement.parentElement.removeChild(_currentActiveChatRoom.chatToolElement);
                                _currentActiveChatRoom.chatTool.seen(false);
                            }
                        }
                        //_chatToolContainer.innerHTML = '';
                        if(chatRoomData.chatToolElement != null) {
                            _chatToolContainer.appendChild(chatRoomData.chatToolElement);
                            _currentActiveChatRoom = chatRoomData;
                            chatRoomData.chatTool.seen(true);
                        } else {
                            var chatToolElement = document.createElement('DIV');
                            chatToolElement.className = 'live-editor-chat-tool-el';
                            _chatToolContainer.appendChild(chatToolElement);
                            chatRoomData.chatToolElement = chatToolElement;
                            
                            Q.activate(
                                chatToolElement.appendChild(
                                    Q.Tool.setUpElement(
                                        "div",
                                        "Streams/chat",
                                        {
                                            publisherId: chatRoomData.publisherId,
                                            streamName: chatRoomData.streamName
                                        }
                                    )
                                ),
                                {},
                                function () {
                                    chatRoomData.chatTool = this;
                                    _currentActiveChatRoom = chatRoomData;
                                    chatRoomData.chatTool.seen(true);
                                    log('chatRoomData.chatTool', chatRoomData.chatTool);
                                }
                            );
                        }
                        

                    }
                
                    function onRelatedToolUpdate(relatedStreams) {
                        if(!_relatedTool) return;
                        let previewRelatedItems = _relatedTool.element.querySelectorAll('.Streams_related_stream');
                        let i, streamsElementsNum = previewRelatedItems.length;
                        for(i = 0; i < streamsElementsNum; i++) {
                            let roomExists = false;
                            for(let r in _chatRooms) {
                                if(previewRelatedItems[i] == _chatRooms[r].streamElement) {
                                    roomExists = true;
                                    break;
                                }
                            }
                            if(roomExists) continue;

                            let chatRoomData = {
                                streamElement: previewRelatedItems[i],
                                chatToolElement: null,
                                chatTool: null,
                                chatStream: null,
                                publisherId: previewRelatedItems[i].dataset.publisherid,
                                streamName: previewRelatedItems[i].dataset.streamname
                            };
                            _chatRooms.push(chatRoomData);

                            previewRelatedItems[i].addEventListener('click', function() {
                                onStreamClickHandler(chatRoomData);
                            });

                            let unseenMsgCounter = document.createElement('DIV');
                            unseenMsgCounter.className = 'live-editor-chat-tool-msg-counter';
                            previewRelatedItems[i].appendChild(unseenMsgCounter);
                            Q.Streams.Message.Total.setUpElement(unseenMsgCounter, previewRelatedItems[i].dataset.publisherid, previewRelatedItems[i].dataset.streamname, 'Streams/chat/message', tool);                 
                        }

                        //remove closed rooms frol the list
                        for(let e = _chatRooms.length - 1; e >= 0; e--) {
                            let roomClosed = true;
                            for(let s = 0; s < streamsElementsNum; s++) {
                                if(_chatRooms[e].streamElement == previewRelatedItems[s]) {
                                    roomClosed = false;
                                    break;
                                }
                            }

                            if(roomClosed) {
                                if(_chatRooms[e].chatTool) {
                                    _chatRooms[e].chatTool.remove();
                                }
                                if(_chatRooms[e].chatToolElement && _chatRooms[e].chatToolElement.parentElement) {
                                    _chatRooms[e].chatToolElement.parentElement.removeChild(_chatRooms[e].chatToolElement);
                                }
                                _chatRooms.splice(e, 1);
                            }
                        }
                    }

                    function createSection() {
                        if(_chatEl != null) return;
                        var chatBoxInner = _chatEl = document.createElement('DIV');
                        chatBoxInner.className = 'live-editor-chat-inner';
    
                        var chatTabsCon = document.createElement('DIV');
                        chatTabsCon.className = 'live-editor-chat-tabs-con';
                        chatBoxInner.appendChild(chatTabsCon);
    
                        var chatTabs = document.createElement('DIV');
                        chatTabs.className = 'live-editor-chat-tabs';
                        chatTabsCon.appendChild(chatTabs);
    
                        var chatBoxCon = document.createElement('DIV');
                        chatBoxCon.className = 'live-editor-chat-box';
                        chatBoxInner.appendChild(chatBoxCon);
    
                        var chatToolContainer = _chatToolContainer = document.createElement('DIV');
                        chatToolContainer.className = 'live-editor-chat-tool-con';
                        chatBoxCon.appendChild(chatToolContainer);

    
                        tool.getOrCreateLivestreamStream().then(function () {
                            Q.activate(
                                Q.Tool.setUpElement(chatTabs, 'Media/webrtc/callCenter/manager', {
                                    publisherId: tool.webrtcUserInterface.roomStream().fields.publisherId,
                                    streamName: tool.webrtcUserInterface.roomStream().fields.name,
                                    showControls: false,
                                    callItemTemplate:'minimal',
                                    environment:'livestreamingEditor',
                                    livestreamStream:tool.livestreamStream,
                                    activeWebrtcRoom:tool.webrtcUserInterface,
                                    chat: true,
                                    chatContainer: chatToolContainer,
                                    onLoad: function () {
                                        if(this.teleconferenceChatTab) this.teleconferenceChatTab.click();
                                    }
                                }),
                                {},
                                function () {
                                }
                            );
                        })
                       
                        if(_chatBoxContainer) _chatBoxContainer.appendChild(chatBoxInner);

                        return chatBoxInner;
                    }

                    return {
                        createSection: createSection
                    }
                }());

                function showDropUpMenu(dropUpMenu, buttonThatOpensDropUpMenu) {

                    function hideOnClick(e) {
                        if (!(buttonThatOpensDropUpMenu.contains(e.target) || e.target.matches('.live-editor-sources-add-menu'))
                            && dropUpMenu.classList.contains('live-editor-sources-add-menu-show')) {
                            dropUpMenu.classList.remove('live-editor-sources-add-menu-show');
                            window.removeEventListener('click', hideOnClick)
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }
                    log('background', dropUpMenu)
                    if (dropUpMenu.classList.contains('live-editor-sources-add-menu-show')) {
                        log('background 2')
                        dropUpMenu.classList.remove('live-editor-sources-add-menu-show');
                    } else {
                        log('background 3')

                        dropUpMenu.classList.add('live-editor-sources-add-menu-show');
                        window.addEventListener('mousedown', hideOnClick)

                        let openDropUpBtnRect = buttonThatOpensDropUpMenu.getBoundingClientRect();
                        let dropUpRect = dropUpMenu.getBoundingClientRect();
                        if(Q.info.isMobile) {
                            if(dropUpRect.height < openDropUpBtnRect.top) {
                                dropUpMenu.style.top = (openDropUpBtnRect.top - dropUpRect.height) + 'px';
                            } else if(dropUpRect.height > openDropUpBtnRect.top) {
                                if(dropUpRect.height <= window.innerHeight) {
                                    dropUpMenu.style.top = (openDropUpBtnRect.top - (dropUpRect.height - (dropUpRect.height - openDropUpBtnRect.top))) + 'px';
                                } else {
                                    dropUpMenu.style.maxHeight = '100vh';
                                    dropUpMenu.style.overflowY = 'scroll';
                                    dropUpMenu.style.top = '0px';
                                }
                            }
                            dropUpMenu.style.left = (openDropUpBtnRect.left + openDropUpBtnRect.width) + 'px';

                        } else {
                            dropUpMenu.style.left = (openDropUpBtnRect.left + openDropUpBtnRect.width) + 'px';
                            dropUpMenu.style.top = (openDropUpBtnRect.top - dropUpRect.height) + 'px';
                        }
                    }
                }

                function SimpleDialog(options) {
                    log('SimpleDialog', options);
                    var dialogInstance = this;
                    this.content = options.content;
                    this.rectangleToShowIn = options.rectangleToShowIn ? options.rectangleToShowIn : new DOMRect(0, 0, window.innerWidth, window.innerHeight);
                    this.title = options.title;
                    this.closeButtonEl = null;
                    this.dialogEl = null;
                    this.dialogBodyEl = null;
                    this.hoverTimeout = null;
                    this.resizeObserver = null;
                    this.active = false;
                    this.time = performance.now();
                    this.isChangingPosition = {x: null, y: null};
                    this.updateOnceMore = false;
                    this.events = new Q.Media.WebRTC.EventSystem();

                    this.hide = function (e) {
                        if (!e || (e && e.target.offsetParent != dialogInstance.dialogEl || e.target == this.closeButtonEl)) {
                            if (dialogInstance.dialogEl.parentElement) dialogInstance.dialogEl.parentElement.removeChild(dialogInstance.dialogEl);
                            togglePopupClassName('', false, false);
                        }
                        dialogInstance.active = false;
                        //delete this;
                    }
        
                    this.show = function (e) {
                        let rectangleToShowIn = dialogInstance.rectangleToShowIn;
                        log('rectangleToShowIn', rectangleToShowIn)
                        dialogInstance.dialogEl.style.top = '';
                        dialogInstance.dialogEl.style.left = '';
                        dialogInstance.dialogEl.style.maxHeight = '';
                        dialogInstance.dialogEl.style.maxWidth = '';
                        togglePopupClassName('', false, false);

                        //let existingPopupDialog = document.querySelector('.live-editor-dialog-window');
                        //if (existingPopupDialog && existingPopupDialog.parentElement) existingPopupDialog.parentElement.removeChild(existingPopupDialog);
                
                        dialogInstance.dialogEl.style.position = 'fixed';
                        dialogInstance.dialogEl.style.visibility = 'hidden';

                        dialogInstance.dialogEl.style.top = rectangleToShowIn.y + 'px';
                        dialogInstance.dialogEl.style.left = rectangleToShowIn.x + 'px';
                        dialogInstance.dialogEl.dataset.time = dialogInstance.time;
                      
                        if(dialogInstance.content instanceof Array) {
                            for(let i in dialogInstance.content) {
                                dialogInstance.dialogBodyEl.appendChild(dialogInstance.content[i])
                            }
                        } else {
                            dialogInstance.dialogBodyEl.appendChild(dialogInstance.content)
                        }
                        
                        document.body.appendChild(dialogInstance.dialogEl);
        
                        updateDialogPostion();
        
                        dialogInstance.dialogEl.style.visibility = '';  
                        dialogInstance.active = true;
                    }
        
                    function togglePopupClassName(classNameToApply, addXScrollClass, addYScrollClass) {
                        let classes = [
                            'live-editor-dialog-window-fullwidth-fullheight-position',
                            'live-editor-dialog-window-fullwidth-mid-position',
                            'live-editor-dialog-window-mid-mid-position',
                            'live-editor-dialog-window-mid-fullheight-position',

                        ];
                        for (let i in classes) {
                            if (classes[i] == classNameToApply || (classes[i] == 'live-editor-dialog-window-x-scroll' && addXScrollClass) || (classes[i] == 'live-editor-dialog-window-y-scroll' && addYScrollClass)) {
                                continue;
                            }
                            dialogInstance.dialogEl.classList.remove(classes[i]);
                        }
        
                        if (classNameToApply && classNameToApply != '' && !dialogInstance.dialogEl.classList.contains(classNameToApply)) {
                            dialogInstance.dialogEl.classList.add(classNameToApply);
                        }
        
                        if (addXScrollClass) {
                            dialogInstance.dialogEl.classList.add('live-editor-dialog-window-x-scroll');
                        }
                        if (addYScrollClass) {
                            dialogInstance.dialogEl.classList.add('live-editor-dialog-window-y-scroll');
                        }
                    }

                    function updateDialogPostion(animate) {
                        dialogInstance.isChangingPosition.y = true;
                        let rectangleToShowIn = dialogInstance.rectangleToShowIn;
                        let dialogRect = dialogInstance.dialogEl.getBoundingClientRect();
        
                        let midXOfRectangleToShowIn = rectangleToShowIn.x + (rectangleToShowIn.width / 2);
                        let midYOfRectangleToShowIn = rectangleToShowIn.y + (rectangleToShowIn.height / 2);

                        if(dialogRect.width <= rectangleToShowIn.width) {
                            dialogInstance.dialogEl.style.left = midXOfRectangleToShowIn - (dialogRect.width / 2) + 'px';
                        } else {
                            dialogInstance.dialogEl.style.left = rectangleToShowIn.x + 'px';
                            dialogInstance.dialogEl.style.width = rectangleToShowIn.width + 'px';
                        }
                        
                        dialogRect = dialogInstance.dialogEl.getBoundingClientRect();
                        if(dialogRect.height <= rectangleToShowIn.height) {
                            if(!animate) {
                                dialogInstance.dialogEl.style.top = midYOfRectangleToShowIn - (dialogRect.height / 2) + 'px';
                            } else {
                                requestAnimationFrame(function(timestamp){
                                    let startTime = timestamp || new Date().getTime()
                                    moveit(timestamp, dialogInstance.dialogEl, { x: null, y: midYOfRectangleToShowIn - (dialogRect.height / 2) }, {x: null, y: dialogRect.y}, 300, startTime, function () {
                                        dialogInstance.isChangingPosition.y = false;
                                        if(dialogInstance.updateOnceMore) {
                                            updateDialogPostion(true);
                                        }
                                        dialogInstance.updateOnceMore = false;
                                    });
                                })
                            }
                        } else {
                            if(!animate) {
                                dialogInstance.dialogEl.style.top = rectangleToShowIn.y + 'px';
                            } else {
                                requestAnimationFrame(function(timestamp){
                                    let startTime = timestamp || new Date().getTime()
                                    moveit(timestamp, dialogInstance.dialogEl, { x: null, y: rectangleToShowIn.y }, {x: null, y: dialogRect.y}, 300, startTime, function () {
                                        dialogInstance.isChangingPosition.y = false;
                                        if(dialogInstance.updateOnceMore) {
                                            updateDialogPostion(true);
                                        }
                                        dialogInstance.updateOnceMore = false;
                                    });
                                })
                            }
                            dialogInstance.dialogEl.style.height = rectangleToShowIn.height + 'px';
                        }

                        dialogRect = dialogInstance.dialogEl.getBoundingClientRect();

                        if(dialogRect.height < rectangleToShowIn.height) {
                            if(dialogRect.width < rectangleToShowIn.width) {
                                togglePopupClassName('live-editor-dialog-window-mid-mid-position', false, false);
                            } else {
                                togglePopupClassName('live-editor-dialog-window-fullwidth-mid-position', false, false);
                            }
                        } else {
                            if(dialogRect.width < rectangleToShowIn.width) {
                                togglePopupClassName('live-editor-dialog-window-mid-fullheight-position', false, true);
                            } else {
                                togglePopupClassName('live-editor-dialog-window-fullwidth-fullheight-position', false, true);
                            }
                        }

                        if(!animate) dialogInstance.isChangingPosition.y = false;

                        function moveit(timestamp, elementToMove, distXY, startXY, duration, starttime, onAnimationEnd){
                            var timestamp = timestamp || new Date().getTime()
                            var runtime = timestamp - starttime
                            var progress = runtime / duration;
                            progress = Math.min(progress, 1);

                            if(distXY.y != null) elementToMove.style.top = (startXY.y + (distXY.y - startXY.y) * progress) + 'px';
                            if(distXY.x != null) elementToMove.style.left = (startXY.x + (distXY.x - startXY.x) * progress) + 'px';
                            if (runtime < duration){
                                requestAnimationFrame(function(timestamp){
                                    moveit(timestamp, elementToMove, distXY, startXY, duration, starttime, onAnimationEnd)
                                })
                            } else {
                                if(distXY.y != null) elementToMove.style.top = distXY.y + 'px';
                                if(distXY.x != null) elementToMove.style.left = distXY.x + 'px';
                                if(onAnimationEnd) onAnimationEnd();
                            }
                        }        
                        
                    }
        
                    this.dialogEl = document.createElement('DIV');
                    this.dialogEl.className = 'live-editor-dialog-window';
                    if(options.className != null) {
                        this.dialogEl.classList.add(...options.className.split(' '));
                    }
                    this.closeButtonEl = document.createElement('DIV');
                    this.closeButtonEl.className = 'live-editor-close-sign';
                    this.dialogEl.appendChild(this.closeButtonEl);

                    var dialogTitle = document.createElement('DIV');
                    dialogTitle.innerHTML = this.title;
                    dialogTitle.className = 'live-editor-dialog-window-header';
                    this.dialogEl.appendChild(dialogTitle);

                    this.dialogBodyEl = document.createElement('DIV');
                    this.dialogBodyEl.className = 'live-editor-dialog-window-body';
                    this.dialogEl.appendChild(this.dialogBodyEl);

                    this.closeButtonEl.addEventListener('click', function (e) {
                        dialogInstance.hide(e);
                    });

                    this.show();

                    Q.activate(
                        Q.Tool.setUpElement(
                            dialogInstance.dialogEl,
                            "Q/resize",
                            {
                                move: true,
                                elementPosition: 'fixed',
                                activateOnElement: dialogTitle,
                                keepInitialSize: true,
                                resize: false,
                                active: true,
                                moveWithinArea: 'window',
                            }
                        ),
                        {},
                        function () {

                        }
                    );

                    window.addEventListener('keyup', function (e) {
                        if (!(e instanceof KeyboardEvent)) {
                            return;
                        }
                        if ( this !== e.target && 
                            ( /textarea|select/i.test( e.target.nodeName ) ||
                              e.target.type === "text" || e.target.type === "number" || e.target.type === "password" || e.target.type === "search" || e.target.type === "tel" || e.target.type === "url") ) {
                            return;
                        }

                        if(['Escape'].indexOf(e.key) != -1) {
                            let existingPopupDialogs = document.querySelectorAll('.live-editor-dialog-window');
                            if(existingPopupDialogs.length != 0) {
                                let existingPopupDialogsArr = Array.prototype.slice.call(existingPopupDialogs, 0);
                                existingPopupDialogsArr.sort(function (a, b) {
                                    return parseInt(b.dataset.time) - parseInt(a.dataset.time);
                                });
                                if(dialogInstance.dialogEl == existingPopupDialogsArr[0]) {
                                    dialogInstance.hide();
                                }
                            }   
                        }    
                    });

                    this.resizeObserver = new window.ResizeObserver(function (entries) {
                        for (const entry of entries) {
                            let width = entry.contentBoxSize && entry.contentBoxSize.length != 0 ? entry.contentBoxSize[0].inlineSize : entry.contentRect.width;
                            let height = entry.contentBoxSize && entry.contentBoxSize.length != 0 ? entry.contentBoxSize[0].blockSize : entry.contentRect.height;
                            if (dialogInstance.isChangingPosition.x || dialogInstance.isChangingPosition.y) {
                                dialogInstance.updateOnceMore = true;
                                continue;
                            }

                            updateDialogPostion(true);
                        }

                    });

                    this.resizeObserver.observe(this.dialogEl);
        
                    /*this.element.addEventListener('click', function (e) {
                        dialogInstance.show(e);
                    });*/
                }

                function PopupDialog(element, options) {
                    var pupupInstance = this;
                    this.element = element;
                    this.content = options.content;
                    this.closeButtonEl = null;
                    this.popupDialogEl = null;
                    this.hoverTimeout = null;
                    this.active = false;
                    this.hide = function (e) {
                        if (!e || (e && (e.target == this.closeButtonEl || !pupupInstance.popupDialogEl.contains(e.target)))) {
                            if (pupupInstance.popupDialogEl.parentElement) pupupInstance.popupDialogEl.parentElement.removeChild(pupupInstance.popupDialogEl);
        
                            togglePopupClassName('', false, false);
                            this.active = false;     

                            if (!Q.info.useTouchEvents) {
                                window.removeEventListener('click', pupupInstance.hide);
                            } else {
                                window.removeEventListener('touchend', pupupInstance.hide);
                            }                   
                        }
                    }
        
                    this.show = function (e) {        
                        pupupInstance.popupDialogEl.style.top = '';
                        pupupInstance.popupDialogEl.style.left = '';
                        pupupInstance.popupDialogEl.style.maxHeight = '';
                        pupupInstance.popupDialogEl.style.maxWidth = '';
                        togglePopupClassName('', false, false);
                        let existingPopupDialog = document.querySelector('.live-editor-dialog');
                        if (existingPopupDialog && existingPopupDialog.parentElement) existingPopupDialog.parentElement.removeChild(existingPopupDialog);
        
                        let triggeringElementRect = pupupInstance.element.getBoundingClientRect();
        
                        pupupInstance.popupDialogEl.style.position = 'fixed';
                        pupupInstance.popupDialogEl.style.visibility = 'hidden';
                        pupupInstance.popupDialogEl.style.top = triggeringElementRect.y + triggeringElementRect.height + 20 + 'px';
                        pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x + (triggeringElementRect.width / 2)) + 'px';
                      
                        if(pupupInstance.content instanceof Array) {
                            for(let i in pupupInstance.content) {
                                pupupInstance.popupDialogEl.appendChild(pupupInstance.content[i])
                            }
                        } else {
                            pupupInstance.popupDialogEl.appendChild(pupupInstance.content)
                        }
                        
                        document.body.appendChild(pupupInstance.popupDialogEl);

                        let popupRect = pupupInstance.popupDialogEl.getBoundingClientRect();
                        pupupInstance.popupDialogEl.style.left = ((triggeringElementRect.x + (triggeringElementRect.width / 2)) - (popupRect.width / 2)) + 'px';
        
                        //if ther is no room below (bottom) of button, show dialog above if there is enough room
        
                        let roomBelowButton = window.innerHeight - (triggeringElementRect.y + triggeringElementRect.height);
                        let roomBelowStartOfButton = window.innerHeight - triggeringElementRect.y;
                        let roomBelowMidOfButton = window.innerHeight - (triggeringElementRect.y + (triggeringElementRect.height / 2));
                        let roomAboveButton = triggeringElementRect.y;
                        let roomAboveEndOfButton = triggeringElementRect.y + triggeringElementRect.height;
                        let roomAboveMidOfButton = triggeringElementRect.y + (triggeringElementRect.height / 2);
                        let roomToLeftOfButton = triggeringElementRect.x;
                        let roomToRightOfStartOfButton = (window.innerWidth - triggeringElementRect.x);
                        let roomToLeftOfMidButton = triggeringElementRect.x + (triggeringElementRect.x / 2);
                        let roomToRightOfButton = (window.innerWidth - (triggeringElementRect.x + triggeringElementRect.width));
                        let roomToRightOfMidButton = (window.innerWidth - (triggeringElementRect.x + (triggeringElementRect.width / 2)));
                        let roomToLeftOfEndOfButton = triggeringElementRect.x + triggeringElementRect.width;
                        let midYOfTriggeringElement = triggeringElementRect.y + triggeringElementRect.height / 2;
                        let midXOfTriggeringElement = triggeringElementRect.x + triggeringElementRect.width / 2;
        
                        if (roomBelowButton >= popupRect.height + 20) {
                            //log('show 1');
                            if (roomToLeftOfMidButton >= (popupRect.width / 2) && roomToRightOfMidButton >= (popupRect.width / 2)) {
                                //log('show 1.1');
                                pupupInstance.popupDialogEl.style.top = triggeringElementRect.y + triggeringElementRect.height + 20 + 'px';
                                pupupInstance.popupDialogEl.style.left = ((triggeringElementRect.x + (triggeringElementRect.width / 2)) - (popupRect.width / 2)) + 'px';
        
                                togglePopupClassName('live-editor-dialog-mid-below-position', false, false);
                            } else if (roomToRightOfStartOfButton >= popupRect.width) {
                                //log('show 1.2');
                                pupupInstance.popupDialogEl.style.top = triggeringElementRect.y + triggeringElementRect.height + 20 + 'px';
                                pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x) + 'px';
        
                                togglePopupClassName('live-editor-dialog-right-below-position', false, false);
                            } else if (roomToLeftOfEndOfButton >= popupRect.width) {
                                //log('show 1.3');
                                pupupInstance.popupDialogEl.style.top = triggeringElementRect.y + triggeringElementRect.height + 20 + 'px';
                                pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x + triggeringElementRect.width) - popupRect.width + 'px';
        
                                togglePopupClassName('live-editor-dialog-left-below-position', false, false);
                            } else if (popupRect.width <= window.innerWidth) {
                                //log('show 1.4');
                                pupupInstance.popupDialogEl.style.top = triggeringElementRect.y + triggeringElementRect.height + 20 + 'px';
                                pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x - roomToLeftOfButton) + 'px';
        
                                togglePopupClassName('live-editor-dialog-winmid-below-position', false, false);
                            } else {
                                //log('show 1.5');
                                pupupInstance.popupDialogEl.style.top = triggeringElementRect.y + triggeringElementRect.height + 20 + 'px';
                                pupupInstance.popupDialogEl.style.left = '0px';
        
                                togglePopupClassName('live-editor-dialog-fullwidth-below-position', true, false);
                            }
                        } else if(roomAboveButton >= popupRect.height + 20) {
                            //log('show 2');
                            if (roomToLeftOfMidButton >= (popupRect.width / 2) && roomToRightOfMidButton >= (popupRect.width / 2)) {
                                //log('show 2.1');
                                pupupInstance.popupDialogEl.style.top = (triggeringElementRect.y - popupRect.height - 20) + 'px';
                                pupupInstance.popupDialogEl.style.left = ((triggeringElementRect.x + (triggeringElementRect.width / 2)) - (popupRect.width / 2)) + 'px';
                                togglePopupClassName('live-editor-dialog-mid-above-position', false, false);
                            } else if (roomToRightOfStartOfButton >= popupRect.width) {
                                //log('show 2.2');
                                pupupInstance.popupDialogEl.style.top = (triggeringElementRect.y - popupRect.height - 20) + 'px';
                                pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x) + 'px';
        
                                togglePopupClassName('live-editor-dialog-right-above-position', false, false);
                            } else if (roomToLeftOfEndOfButton >= popupRect.width) {
                                //log('show 2.3');
                                pupupInstance.popupDialogEl.style.top = (triggeringElementRect.y - popupRect.height - 20) + 'px';
                                pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x + triggeringElementRect.width - popupRect.width) + 'px';
        
                                togglePopupClassName('live-editor-dialog-left-above-position', false, false);
                            } else if (window.innerWidth >= popupRect.width) {
                                //log('show 2.4');;
                                pupupInstance.popupDialogEl.style.top = (triggeringElementRect.y - popupRect.height - 20) + 'px';
                                pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x - popupRect.width / 2) + 'px';
        
                                togglePopupClassName('live-editor-dialog-winmid-above-position', false, false);
                            } else {
                                //log('show 2.5');
                                pupupInstance.popupDialogEl.style.top = (triggeringElementRect.y - popupRect.height - 20) + 'px';
                                pupupInstance.popupDialogEl.style.left = '0px';
        
                                togglePopupClassName('live-editor-dialog-fullwidth-above-position', true, false);
                            }
                        } else if (Math.min(roomBelowMidOfButton, roomAboveMidOfButton) >= popupRect.height / 2) {
                            //log('show 3');
                            if (roomToRightOfButton >= popupRect.width + 20) {
                                //log('show 3.1');
                                pupupInstance.popupDialogEl.style.top = midYOfTriggeringElement - (popupRect.height / 2) + 'px';
                                pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x + triggeringElementRect.width + 20) + 'px';
        
                                togglePopupClassName('live-editor-dialog-right-mid-position', false, false);
                            } else if (roomToLeftOfButton >= popupRect.width + 20) {
                                //log('show 3.2');
                                pupupInstance.popupDialogEl.style.top = midYOfTriggeringElement - (popupRect.height / 2) + 'px';
                                pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x - popupRect.width - 20) + 'px';
        
                                togglePopupClassName('live-editor-dialog-left-mid-position', false, false);
                            } else {
                                //log('show 3.3');
                                pupupInstance.popupDialogEl.style.top = midYOfTriggeringElement - (popupRect.height / 2) + 'px';
                                pupupInstance.popupDialogEl.style.left = '0px';
        
                                togglePopupClassName('live-editor-dialog-fullwidth-mid-position', true, false);
                            }
                        } else if (roomBelowStartOfButton >= popupRect.height) {
                            //log('show 4');
                            if (roomToRightOfButton >= popupRect.width + 20) {
                                //log('show 4.1');
                                pupupInstance.popupDialogEl.style.top = triggeringElementRect.y + 'px';
                                pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x + triggeringElementRect.width + 20) + 'px';
        
                                togglePopupClassName('live-editor-dialog-right-belowtop-position', false, false);
                            } else if (roomToLeftOfButton >= popupRect.width + 20) {
                                //log('show 4.2');
                                pupupInstance.popupDialogEl.style.top = (triggeringElementRect.y) + 'px';
                                pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x - popupRect.width - 20) + 'px';
        
                                togglePopupClassName('live-editor-dialog-left-belowtop-position', false, false);
                            } else {
                                //log('show 4.3');
                                pupupInstance.popupDialogEl.style.top = (triggeringElementRect.y) + 'px';
                                pupupInstance.popupDialogEl.style.left = '0px';
        
                                togglePopupClassName('live-editor-dialog-fullwidth-belowtop-position', true, false);
                            }
                        } else if (roomAboveEndOfButton >= popupRect.height) {
                            //log('show 5');
                            if (roomToRightOfButton >= popupRect.width + 20) {
                                //log('show 5.1');
                                pupupInstance.popupDialogEl.style.top = (triggeringElementRect.y + triggeringElementRect.height - popupRect.height) + 'px';
                                pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x + triggeringElementRect.width + 20) + 'px';
        
                                togglePopupClassName('live-editor-dialog-right-abovebottom-position', false, false);
                            } else if (roomToLeftOfButton >= popupRect.width + 20) {
                                //log('show 5.2');
                                pupupInstance.popupDialogEl.style.top = (triggeringElementRect.y + triggeringElementRect.height - popupRect.height) + 'px';
                                pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x - popupRect.width - 20) + 'px';
        
                                togglePopupClassName('live-editor-dialog-left-abovebottom-position', false, false);
                            } else {
                                //log('show 5.3');
                                pupupInstance.popupDialogEl.style.top = (triggeringElementRect.y + triggeringElementRect.height - popupRect.height) + 'px';
                                pupupInstance.popupDialogEl.style.left = '0px';
        
                                togglePopupClassName('live-editor-dialog-fullwidth-abovebottom-position', false, false);
                            }
                        } else if(popupRect.height + 20 < window.innerHeight) {
                            //log('show 6');
                            if (roomToRightOfButton >= popupRect.width + 20) {
                                //log('show 6.1');
                                pupupInstance.popupDialogEl.style.top = (window.innerHeight / 2) - (popupRect.height / 2) + 'px';
                                pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x + triggeringElementRect.width + 20) + 'px';
                                togglePopupClassName('live-editor-dialog-right-winmid-position', false, false);
        
                            } else if (roomToLeftOfButton >= popupRect.width + 20) {
                                //log('show 6.2');
        
                                pupupInstance.popupDialogEl.style.top = (window.innerHeight / 2) - (popupRect.height / 2) + 'px';
                                pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x - 20 - popupRect.width) + 'px';
                                togglePopupClassName('live-editor-dialog-left-winmid-position', false, false);
                            } else if(popupRect.width <= window.innerWidth) {
                                //log('show 6.3');
        
                                pupupInstance.popupDialogEl.style.top = (window.innerHeight / 2) - (popupRect.height / 2) + 'px';
                                pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x - roomToLeftOfButton) + 'px';
                                togglePopupClassName('live-editor-dialog-winmid-winmid-position', false, false);
                            } else {
                                //log('show 6.4');
        
                                pupupInstance.popupDialogEl.style.top = (window.innerHeight / 2) - (popupRect.height / 2) + 'px';
                                pupupInstance.popupDialogEl.style.left = '0px';
                                togglePopupClassName('live-editor-dialog-fullwidth-winmid-position', true, false);
                            }
                        } else {
                            //log('show 7');
                            if (roomToRightOfButton >= popupRect.width + 20) {
                                //log('show 7.1');
                                pupupInstance.popupDialogEl.style.top = '0px';
                                pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x + triggeringElementRect.width + 20) + 'px';
                                togglePopupClassName('live-editor-dialog-right-fullheight-position', false, false);
        
                            } else if (roomToLeftOfButton >= popupRect.width + 20) {
                                //log('show 7.2');
        
                                pupupInstance.popupDialogEl.style.top = '0px';
                                pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x - 20 - popupRect.width) + 'px';
                                togglePopupClassName('live-editor-dialog-left-fullheight-position', false, false);
                            } else if(popupRect.width <= window.innerWidth) {
                                //log('show 7.3');
        
                                pupupInstance.popupDialogEl.style.top = (window.innerHeight / 2) - (popupRect.height / 2) + 'px';
                                pupupInstance.popupDialogEl.style.left = (window.innerWidth / 2) - (popupRect.width / 2) + 'px';
                                togglePopupClassName('live-editor-dialog-winmid-fullheight-position', false, true);
                            } else {
                                //log('show 7.4');
                                pupupInstance.popupDialogEl.style.top = '0px';
                                pupupInstance.popupDialogEl.style.left = '0px';
                                togglePopupClassName('live-editor-dialog-fullwidth-fullheight-position', true, true);
                            }
                        }
                        //log('show 7', pupupInstance.popupDialogEl);

                        pupupInstance.popupDialogEl.style.visibility = '';
        
                        this.active = true;        

                        setTimeout(function() {
                            if(!Q.info.useTouchEvents) {
                                window.addEventListener('click', pupupInstance.hide);        
                            } else {
                                window.addEventListener('touchend', pupupInstance.hide);        
                            }
                        }, 0);
                    }

                    this.destroy = function() {
                        this.element.removeEventListener('mouseenter', onElementMouseEnterListener);
                        this.element.removeEventListener('mouseleave', onElementMouseLeaveListener);
                        delete pupupInstance;
                    }
        
                    function togglePopupClassName(classNameToApply, addXScrollClass, addYScrollClass) {
                        let classes = [
                            'live-editor-dialog-mid-below-position',
                            'live-editor-dialog-right-below-position',
                            'live-editor-dialog-left-below-position',
                            'live-editor-dialog-winmid-below-position',
                            'live-editor-dialog-fullwidth-below-position',
                            'live-editor-dialog-mid-above-position',
                            'live-editor-dialog-right-above-position',
                            'live-editor-dialog-left-above-position',
                            'live-editor-dialog-winmid-above-position',
                            'live-editor-dialog-fullwidth-above-position',
                            'live-editor-dialog-right-mid-position',
                            'live-editor-dialog-left-mid-position',
                            'live-editor-dialog-fullwidth-mid-position',
                            'live-editor-dialog-right-belowtop-position',
                            'live-editor-dialog-left-belowtop-position',
                            'live-editor-dialog-mid-belowtop-position',
                            'live-editor-dialog-fullwidth-belowtop-position',
                            'live-editor-dialog-right-abovebottom-position',
                            'live-editor-dialog-left-abovebottom-position',
                            'live-editor-dialog-fullwidth-abovebottom-position',
                            'live-editor-dialog-right-winmid-position',
                            'live-editor-dialog-left-winmid-position',
                            'live-editor-dialog-winmid-winmid-position',
                            'live-editor-dialog-fullwidth-winmid-position',
                            'live-editor-dialog-right-fullheight-position',
                            'live-editor-dialog-left-fullheight-position',
                            'live-editor-dialog-winmid-fullheight-position',
                            'live-editor-dialog-fullwidth-fullheight-position',
                            'live-editor-dialog-x-scroll',
                            'live-editor-dialog-y-scroll',
                        ];
                        for (let i in classes) {
                            if (classes[i] == classNameToApply || (classes[i] == 'live-editor-dialog-x-scroll' && addXScrollClass) || (classes[i] == 'live-editor-dialog-y-scroll' && addYScrollClass)) {
                                continue;
                            }
                            pupupInstance.popupDialogEl.classList.remove(classes[i]);
                        }
        
                        if (classNameToApply && classNameToApply != '' && !pupupInstance.popupDialogEl.classList.contains(classNameToApply)) {
                            pupupInstance.popupDialogEl.classList.add(classNameToApply);
                        }
        
                        if (addXScrollClass) {
                            pupupInstance.popupDialogEl.classList.add('live-editor-dialog-x-scroll');
                        }
                        if (addYScrollClass) {
                            pupupInstance.popupDialogEl.classList.add('live-editor-dialog-y-scroll');
                        }
                    }
        
                    this.popupDialogEl = document.createElement('DIV');
                    this.popupDialogEl.className = 'live-editor-dialog';
                    if(options.className) {
                        this.popupDialogEl.classList.add(options.className);
                    }
                    this.closeButtonEl = document.createElement('DIV');
                    this.closeButtonEl.className = 'live-editor-close-sign';
                    this.popupDialogEl.appendChild(this.closeButtonEl);
        
                    this.closeButtonEl.addEventListener('click', function (e) {
                        pupupInstance.hide(e);
                    });

                    if(!Q.info.useTouchEvents) {
                        this.element.addEventListener('mouseenter', onElementMouseEnterListener);

                        this.element.addEventListener('mouseleave', onElementMouseLeaveListener);

                        this.popupDialogEl.addEventListener('mouseenter', function (e) {
                            removeHoverTimerIfExists();
                        })
                        this.popupDialogEl.addEventListener('mouseleave', function (e) {
                            pupupInstance.hoverTimeout = setTimeout(function () {
                                pupupInstance.hide();
                            }, 600)

                        });
                       
                    } else {
                        this.element.addEventListener('touchend', function (e) {
                            if(pupupInstance.active) {
                                pupupInstance.hide(e);
                            } else {
                                pupupInstance.show(e);
                            }
                            
                        });
                    }   
                    
                    function onElementMouseEnterListener(e) {
                        removeHoverTimerIfExists();
                        pupupInstance.show(e);
                    }

                    function onElementMouseLeaveListener(e) {
                        pupupInstance.hoverTimeout = setTimeout(function () {
                            pupupInstance.hide(e);
                        }, 600)
                    }

                    function removeHoverTimerIfExists() {
                        if (pupupInstance.hoverTimeout != null) {
                            clearTimeout(pupupInstance.hoverTimeout);
                            pupupInstance.hoverTimeout = null;
                        }
                    }
                }

                function CustomSelect(element, options) {
                    var selectInstance = this;
                    this.originalSelect = element;
                    this.customSelectDropDownEl = null;
                    this.customSelectListEl = null;
                    this.customSelectedEl = null;
                    this.selectContainerEl = null;
                    this.closeButtonEl = null;
                    this.optionsList = [];
                    //this.selectedIndex = -1;
                    this._value = null;
                    this.spaceForArrow = 0;
                    this.isShown = false;

                    Object.defineProperties(this, {
                        'value': {
                            'set': function(val) {
                                for (let i in this.optionsList) {
                                    if(this.optionsList[i].value == val) {
                                        this.optionsList[i].customOptionEl.click();
                                        this._value = val;
                                        break;
                                    }
                                }
                            },
                            'get': function() {
                                return this._value;
                            }
                        }
                    });

                    this._syncOptionsList = function () {
                        let originalSelect = selectInstance.originalSelect;
                        let optionsNumber = originalSelect.options.length;
                        log('syncOptionsList optionsNumber', originalSelect.options);
                        for(let e = selectInstance.optionsList.length - 1; e >= 0; e--) {
                            let option = selectInstance.optionsList[i];
                            let sourceIsRemoved = true;
                            for (let h = 0; h < optionsNumber; h++) {
                                if(option.originalOptionEl == originalSelect.options[h]) {
                                    sourceIsRemoved = false;
                                    break;
                                }
                            }
                            if(option.customOptionEl != null && option.customOptionEl.parentElement != null) {
                                option.customOptionEl.parentElement.removeChild(option.customOptionEl);
                            }
                            if(sourceIsRemoved) {
                                selectInstance.optionsList.splice(e, 1);
                            }
                        }

                        for (let j = 0; j < optionsNumber; j++) {
                            let optionAlreadyExists = false;
                            let orderChanged = false;
                            for(let l in selectInstance.optionsList) {
                                if(selectInstance.optionsList[l].originalOptionEl == originalSelect.options[j]) {
                                    optionAlreadyExists = selectInstance.optionsList[l];
                                    if(j != l) orderChanged = true;
                                }
                            }
                            log('syncOptionsList optionAlreadyExists', optionAlreadyExists);

                            if(optionAlreadyExists != false && !orderChanged) {
                                continue;
                            } else if (optionAlreadyExists != false && orderChanged) {
                                selectInstance.customSelectListEl.appendChild(optionAlreadyExists.customOptionEl);
                                for(let e = selectInstance.optionsList.length - 1; e >= 0; e--) {
                                    if(selectInstance.optionsList[e] == optionAlreadyExists) {
                                        selectInstance.optionsList.splice(j, 0, selectInstance.optionsList.splice(e, 1)[0]);
                                        break;
                                    }
                                }
                                
                            } else {
                                let optionElementCon = document.createElement("DIV");
                                optionElementCon.className = 'live-editor-custom-select-option';
                                optionElementCon.dataset.selectValue = originalSelect.options[j].value;
                                optionElementCon.addEventListener("click", function(e) {
                                    selectInstance.selectOption(e.currentTarget);
                                });
                                selectInstance.customSelectListEl.appendChild(optionElementCon);

                                let optionElementText = document.createElement("DIV");
                                optionElementText.className = 'live-editor-custom-select-option-text';
                                optionElementText.innerHTML = originalSelect.options[j].innerHTML;
                                optionElementCon.appendChild(optionElementText);

                                selectInstance.optionsList.push({
                                    originalOptionEl: originalSelect.options[j],
                                    customOptionEl: optionElementCon,
                                    value: originalSelect.options[j].value
                                });
                            }
                        }
                   
                        for (let i = 0; i < optionsNumber; i++) {
                            if (originalSelect.options[i].selected == true) {
                                for(let c in selectInstance.optionsList) {
                                    if (originalSelect.options[i].value == selectInstance.optionsList[c].value) {
                                        selectInstance.selectOption(selectInstance.optionsList[c].customOptionEl);
                                    }
                                }
                                break;
                            }
                        }
                        
                    };

                    Object.defineProperty(this, "syncOptionsList", {
                        set(customFunction) {
                            this.customSyncOptionsList = customFunction;
                        },
                        get() {
                            if (this.customSyncOptionsList) {
                                return function () {
                                    let originalSelect = selectInstance.originalSelect;
                                    let optionsNumber = originalSelect.options.length;
                                    this.customSyncOptionsList();

                                    for (let i = 0; i < optionsNumber; i++) {
                                        if (originalSelect.options[i].selected == true && (selectInstance.selectedOption == null || selectInstance.selectedOption.originalOptionEl != originalSelect.options[i])) {
                                            for(let c in selectInstance.optionsList) {
                                                if (originalSelect.options[i].value == selectInstance.optionsList[c].value) {
                                                    selectInstance.selectOption(selectInstance.optionsList[c].customOptionEl);
                                                }
                                            }
                                            break;
                                        }
                                    }
                                }
                            } else {
                                return this._syncOptionsList;
                            }
                        }
                      });

                    this.selectOption = function (customOptionEl) {
                        log('select selectoption', customOptionEl, selectInstance.originalSelect.options.length)
                        /*when an item is clicked, update the original select box,
                        and the selected item:*/
                        let originalSelect = selectInstance.originalSelect;
                        let optionsNumber = originalSelect.options.length;
                        for (let i = 0; i < optionsNumber; i++) {
                            if (originalSelect.options[i].value == customOptionEl.dataset.selectValue) {
                                let optionInstance = null;
                                for(let c in selectInstance.optionsList) {
                                    if (originalSelect.options[i].value == selectInstance.optionsList[c].value) {
                                        optionInstance = selectInstance.optionsList[c];
                                    }
                                }
                                //originalSelect.selectedIndex = i;
                                log('select selectoption set value', originalSelect.options[i].value, originalSelect.value)

                                originalSelect.value = originalSelect.options[i].value;
                                log('select selectoption set value', originalSelect.value)
                                selectInstance.selectedOption = optionInstance;
                                originalSelect.dispatchEvent(new CustomEvent('change'));
                                selectInstance.customSelectedEl.innerHTML = originalSelect.options[i].innerHTML;
                                let currentlySelectedOptions = selectInstance.customSelectListEl.getElementsByClassName('live-editor-custom-select-same-as-selected');
                                let selectedOptionsNum = currentlySelectedOptions.length;
                                for (k = 0; k < selectedOptionsNum; k++) {
                                    currentlySelectedOptions[k].classList.remove('live-editor-custom-select-same-as-selected');
                                }
                                if (!customOptionEl.classList.contains('live-editor-custom-select-same-as-selected')) customOptionEl.classList.add('live-editor-custom-select-same-as-selected');
                                break;
                            }
                        }
                        selectInstance.hide();
                    }
                    this.hide = function (e) {
                        log('CustomSelect: hide')
                        if (e && (e.target == this.closeButtonEl || !selectInstance.customSelectDropDownEl.contains(e.target)) || e == null) {
                            if (selectInstance.customSelectDropDownEl.parentElement) selectInstance.customSelectDropDownEl.parentElement.removeChild(selectInstance.customSelectDropDownEl);
        
                            togglePopupClassName('', false, false);
        
                            window.removeEventListener('click', selectInstance.hide);
                            selectInstance.customSelectedEl.classList.remove("live-editor-custom-select-arrow-active");
                            selectInstance.isShown = false;
                        }
                    }
        
                    this.show = function (e) {        
                        selectInstance.customSelectDropDownEl.style.top = '';
                        selectInstance.customSelectDropDownEl.style.left = '';
                        selectInstance.customSelectDropDownEl.style.maxHeight = '';
                        selectInstance.customSelectDropDownEl.style.maxWidth = '';
                        togglePopupClassName('', false, false);
                       
                        let triggeringElementRect = selectInstance.customSelectedEl.getBoundingClientRect();
        
                        selectInstance.customSelectDropDownEl.style.position = 'fixed';
                        selectInstance.customSelectDropDownEl.style.visibility = 'hidden';
                        selectInstance.customSelectDropDownEl.style.top = triggeringElementRect.y + triggeringElementRect.height + selectInstance.spaceForArrow + 'px';
                        selectInstance.customSelectDropDownEl.style.left = (triggeringElementRect.x + (triggeringElementRect.width / 2)) + 'px';
                        selectInstance.customSelectDropDownEl.style.width = (triggeringElementRect.width) + 'px';
                        
                        document.body.appendChild(selectInstance.customSelectDropDownEl);
        
                        let popupRect = selectInstance.customSelectDropDownEl.getBoundingClientRect();
                        selectInstance.customSelectDropDownEl.style.left = ((triggeringElementRect.x + (triggeringElementRect.width / 2)) - (popupRect.width / 2)) + 'px';
        
                        //if ther is no room below (bottom) of button, show dialog above if there is enough room
        
                        let spaceForArrow = selectInstance.spaceForArrow;
                        let roomBelowButton = window.innerHeight - (triggeringElementRect.y + triggeringElementRect.height);
                        let roomBelowStartOfButton = window.innerHeight - triggeringElementRect.y;
                        let roomBelowMidOfButton = window.innerHeight - (triggeringElementRect.y + (triggeringElementRect.height / 2));
                        let roomAboveButton = triggeringElementRect.y;
                        let roomAboveEndOfButton = triggeringElementRect.y + triggeringElementRect.height;
                        let roomAboveMidOfButton = triggeringElementRect.y + (triggeringElementRect.height / 2);
                        let roomToLeftOfButton = triggeringElementRect.x;
                        let roomToRightOfStartOfButton = (window.innerWidth - triggeringElementRect.x);
                        let roomToLeftOfMidButton = triggeringElementRect.x + (triggeringElementRect.x / 2);
                        let roomToRightOfButton = (window.innerWidth - (triggeringElementRect.x + triggeringElementRect.width));
                        let roomToRightOfMidButton = (window.innerWidth - (triggeringElementRect.x + (triggeringElementRect.width / 2)));
                        let roomToLeftOfEndOfButton = triggeringElementRect.x + triggeringElementRect.width;
                        let midYOfTriggeringElement = triggeringElementRect.y + triggeringElementRect.height / 2;
                        let midXOfTriggeringElement = triggeringElementRect.x + triggeringElementRect.width / 2;
        
                        if (roomBelowButton >= popupRect.height + spaceForArrow) {
                            //log('show 1');
                            if (roomToLeftOfMidButton >= (popupRect.width / 2) && roomToRightOfMidButton >= (popupRect.width / 2)) {
                                //log('show 1.1');
                                selectInstance.customSelectDropDownEl.style.top = triggeringElementRect.y + triggeringElementRect.height + spaceForArrow + 'px';
                                selectInstance.customSelectDropDownEl.style.left = ((triggeringElementRect.x + (triggeringElementRect.width / 2)) - (popupRect.width / 2)) + 'px';
        
                                togglePopupClassName('live-editor-custom-select-mid-below-position', false, false);
                            } else if (roomToRightOfStartOfButton >= popupRect.width) {
                                //log('show 1.2');
                                selectInstance.customSelectDropDownEl.style.top = triggeringElementRect.y + triggeringElementRect.height + spaceForArrow + 'px';
                                selectInstance.customSelectDropDownEl.style.left = (triggeringElementRect.x) + 'px';
        
                                togglePopupClassName('live-editor-custom-select-right-below-position', false, false);
                            } else if (roomToLeftOfEndOfButton >= popupRect.width) {
                                //log('show 1.3');
                                selectInstance.customSelectDropDownEl.style.top = triggeringElementRect.y + triggeringElementRect.height + spaceForArrow + 'px';
                                selectInstance.customSelectDropDownEl.style.left = (triggeringElementRect.x + triggeringElementRect.width) - popupRect.width + 'px';
        
                                togglePopupClassName('live-editor-custom-select-left-below-position', false, false);
                            } else if (popupRect.width <= window.innerWidth) {
                                //log('show 1.4');
                                selectInstance.customSelectDropDownEl.style.top = triggeringElementRect.y + triggeringElementRect.height + spaceForArrow + 'px';
                                selectInstance.customSelectDropDownEl.style.left = (triggeringElementRect.x - roomToLeftOfButton) + 'px';
        
                                togglePopupClassName('live-editor-custom-select-winmid-below-position', false, false);
                            } else {
                                //log('show 1.5');
                                selectInstance.customSelectDropDownEl.style.top = triggeringElementRect.y + triggeringElementRect.height + spaceForArrow + 'px';
                                selectInstance.customSelectDropDownEl.style.left = '0px';
        
                                togglePopupClassName('live-editor-custom-select-fullwidth-below-position', true, false);
                            }
                        } else if(roomAboveButton >= popupRect.height + spaceForArrow) {
                            //log('show 2');
                            if (roomToLeftOfMidButton >= (popupRect.width / 2) && roomToRightOfMidButton >= (popupRect.width / 2)) {
                                //log('show 2.1');
                                selectInstance.customSelectDropDownEl.style.top = (triggeringElementRect.y - popupRect.height - spaceForArrow) + 'px';
                                selectInstance.customSelectDropDownEl.style.left = ((triggeringElementRect.x + (triggeringElementRect.width / 2)) - (popupRect.width / 2)) + 'px';
                                togglePopupClassName('live-editor-custom-select-mid-above-position', false, false);
                            } else if (roomToRightOfStartOfButton >= popupRect.width) {
                                //log('show 2.2');
                                selectInstance.customSelectDropDownEl.style.top = (triggeringElementRect.y - popupRect.height - spaceForArrow) + 'px';
                                selectInstance.customSelectDropDownEl.style.left = (triggeringElementRect.x) + 'px';
        
                                togglePopupClassName('live-editor-custom-select-right-above-position', false, false);
                            } else if (roomToLeftOfEndOfButton >= popupRect.width) {
                                //log('show 2.3');
                                selectInstance.customSelectDropDownEl.style.top = (triggeringElementRect.y - popupRect.height - spaceForArrow) + 'px';
                                selectInstance.customSelectDropDownEl.style.left = (triggeringElementRect.x + triggeringElementRect.width - popupRect.width) + 'px';
        
                                togglePopupClassName('live-editor-custom-select-left-above-position', false, false);
                            } else if (window.innerWidth >= popupRect.width) {
                                //log('show 2.4');;
                                selectInstance.customSelectDropDownEl.style.top = (triggeringElementRect.y - popupRect.height - spaceForArrow) + 'px';
                                selectInstance.customSelectDropDownEl.style.left = (triggeringElementRect.x - popupRect.width / 2) + 'px';
        
                                togglePopupClassName('live-editor-custom-select-winmid-above-position', false, false);
                            } else {
                                //log('show 2.5');
                                selectInstance.customSelectDropDownEl.style.top = (triggeringElementRect.y - popupRect.height - spaceForArrow) + 'px';
                                selectInstance.customSelectDropDownEl.style.left = '0px';
        
                                togglePopupClassName('live-editor-custom-select-fullwidth-above-position', true, false);
                            }
                        } else if (Math.min(roomBelowMidOfButton, roomAboveMidOfButton) >= popupRect.height / 2) {
                            //log('show 3');
                            if (roomToRightOfButton >= popupRect.width + spaceForArrow) {
                                //log('show 3.1');
                                selectInstance.customSelectDropDownEl.style.top = midYOfTriggeringElement - (popupRect.height / 2) + 'px';
                                selectInstance.customSelectDropDownEl.style.left = (triggeringElementRect.x + triggeringElementRect.width + spaceForArrow) + 'px';
        
                                togglePopupClassName('live-editor-custom-select-right-mid-position', false, false);
                            } else if (roomToLeftOfButton >= popupRect.width + spaceForArrow) {
                                //log('show 3.2');
                                selectInstance.customSelectDropDownEl.style.top = midYOfTriggeringElement - (popupRect.height / 2) + 'px';
                                selectInstance.customSelectDropDownEl.style.left = (triggeringElementRect.x - popupRect.width - spaceForArrow) + 'px';
        
                                togglePopupClassName('live-editor-custom-select-left-mid-position', false, false);
                            } else {
                                //log('show 3.3');
                                selectInstance.customSelectDropDownEl.style.top = midYOfTriggeringElement - (popupRect.height / 2) + 'px';
                                selectInstance.customSelectDropDownEl.style.left = '0px';
        
                                togglePopupClassName('live-editor-custom-select-fullwidth-mid-position', true, false);
                            }
                        } else if (roomBelowStartOfButton >= popupRect.height) {
                            //log('show 4');
                            if (roomToRightOfButton >= popupRect.width + spaceForArrow) {
                                //log('show 4.1');
                                selectInstance.customSelectDropDownEl.style.top = triggeringElementRect.y + 'px';
                                selectInstance.customSelectDropDownEl.style.left = (triggeringElementRect.x + triggeringElementRect.width + spaceForArrow) + 'px';
        
                                togglePopupClassName('live-editor-custom-select-right-belowtop-position', false, false);
                            } else if (roomToLeftOfButton >= popupRect.width + spaceForArrow) {
                                //log('show 4.2');
                                selectInstance.customSelectDropDownEl.style.top = (triggeringElementRect.y) + 'px';
                                selectInstance.customSelectDropDownEl.style.left = (triggeringElementRect.x - popupRect.width - spaceForArrow) + 'px';
        
                                togglePopupClassName('live-editor-custom-select-left-belowtop-position', false, false);
                            } else {
                                //log('show 4.3');
                                selectInstance.customSelectDropDownEl.style.top = (triggeringElementRect.y) + 'px';
                                selectInstance.customSelectDropDownEl.style.left = '0px';
        
                                togglePopupClassName('live-editor-custom-select-fullwidth-belowtop-position', true, false);
                            }
                        } else if (roomAboveEndOfButton >= popupRect.height) {
                            //log('show 5');
                            if (roomToRightOfButton >= popupRect.width + spaceForArrow) {
                                //log('show 5.1');
                                selectInstance.customSelectDropDownEl.style.top = (triggeringElementRect.y + triggeringElementRect.height - popupRect.height) + 'px';
                                selectInstance.customSelectDropDownEl.style.left = (triggeringElementRect.x + triggeringElementRect.width + spaceForArrow) + 'px';
        
                                togglePopupClassName('live-editor-custom-select-right-abovebottom-position', false, false);
                            } else if (roomToLeftOfButton >= popupRect.width + spaceForArrow) {
                                //log('show 5.2');
                                selectInstance.customSelectDropDownEl.style.top = (triggeringElementRect.y + triggeringElementRect.height - popupRect.height) + 'px';
                                selectInstance.customSelectDropDownEl.style.left = (triggeringElementRect.x - popupRect.width - spaceForArrow) + 'px';
        
                                togglePopupClassName('live-editor-custom-select-left-abovebottom-position', false, false);
                            } else {
                                //log('show 5.3');
                                selectInstance.customSelectDropDownEl.style.top = (triggeringElementRect.y + triggeringElementRect.height - popupRect.height) + 'px';
                                selectInstance.customSelectDropDownEl.style.left = '0px';
        
                                togglePopupClassName('live-editor-custom-select-fullwidth-abovebottom-position', false, false);
                            }
                        } else if(popupRect.height + spaceForArrow < window.innerHeight) {
                            //log('show 6');
                            if (roomToRightOfButton >= popupRect.width + spaceForArrow) {
                                //log('show 6.1');
                                selectInstance.customSelectDropDownEl.style.top = (window.innerHeight / 2) - (popupRect.height / 2) + 'px';
                                selectInstance.customSelectDropDownEl.style.left = (triggeringElementRect.x + triggeringElementRect.width + spaceForArrow) + 'px';
                                togglePopupClassName('live-editor-custom-select-right-winmid-position', false, false);
        
                            } else if (roomToLeftOfButton >= popupRect.width + spaceForArrow) {
                                //log('show 6.2');
        
                                selectInstance.customSelectDropDownEl.style.top = (window.innerHeight / 2) - (popupRect.height / 2) + 'px';
                                selectInstance.customSelectDropDownEl.style.left = (triggeringElementRect.x - spaceForArrow - popupRect.width) + 'px';
                                togglePopupClassName('live-editor-custom-select-left-winmid-position', false, false);
                            } else if(popupRect.width <= window.innerWidth) {
                                //log('show 6.3');
        
                                selectInstance.customSelectDropDownEl.style.top = (window.innerHeight / 2) - (popupRect.height / 2) + 'px';
                                selectInstance.customSelectDropDownEl.style.left = (triggeringElementRect.x - roomToLeftOfButton) + 'px';
                                togglePopupClassName('live-editor-custom-select-winmid-winmid-position', false, false);
                            } else {
                                //log('show 6.4');
        
                                selectInstance.customSelectDropDownEl.style.top = (window.innerHeight / 2) - (popupRect.height / 2) + 'px';
                                selectInstance.customSelectDropDownEl.style.left = '0px';
                                togglePopupClassName('live-editor-custom-select-fullwidth-winmid-position', true, false);
                            }
                        } else {
                            //log('show 7');
                            if (roomToRightOfButton >= popupRect.width + spaceForArrow) {
                                //log('show 7.1');
                                selectInstance.customSelectDropDownEl.style.top = '0px';
                                selectInstance.customSelectDropDownEl.style.left = (triggeringElementRect.x + triggeringElementRect.width + spaceForArrow) + 'px';
                                togglePopupClassName('live-editor-custom-select-right-fullheight-position', false, false);
        
                            } else if (roomToLeftOfButton >= popupRect.width + spaceForArrow) {
                                //log('show 7.2');
        
                                selectInstance.customSelectDropDownEl.style.top = '0px';
                                selectInstance.customSelectDropDownEl.style.left = (triggeringElementRect.x - spaceForArrow - popupRect.width) + 'px';
                                togglePopupClassName('live-editor-custom-select-left-fullheight-position', false, false);
                            } else if(popupRect.width <= window.innerWidth) {
                                //log('show 7.3');
        
                                selectInstance.customSelectDropDownEl.style.top = (window.innerHeight / 2) - (popupRect.height / 2) + 'px';
                                selectInstance.customSelectDropDownEl.style.left = (window.innerWidth / 2) - (popupRect.width / 2) + 'px';
                                togglePopupClassName('live-editor-custom-select-winmid-fullheight-position', false, true);
                            } else {
                                //log('show 7.4');
                                selectInstance.customSelectDropDownEl.style.top = '0px';
                                selectInstance.customSelectDropDownEl.style.left = '0px';
                                togglePopupClassName('live-editor-custom-select-fullwidth-fullheight-position', true, true);
                            }
                        }
        
                        selectInstance.customSelectDropDownEl.style.visibility = '';
        
                        setTimeout(function() {
                            window.addEventListener('click', selectInstance.hide);
                        }, 0);
        
                        if(!selectInstance.customSelectedEl.classList.contains("live-editor-custom-select-arrow-active")) {
                            selectInstance.customSelectedEl.classList.add("live-editor-custom-select-arrow-active");
                        }

                        selectInstance.isShown = true;
                    }
        
                    function togglePopupClassName(classNameToApply, addXScrollClass, addYScrollClass) {
                        let classes = [
                            'live-editor-custom-select-mid-below-position',
                            'live-editor-custom-select-right-below-position',
                            'live-editor-custom-select-left-below-position',
                            'live-editor-custom-select-winmid-below-position',
                            'live-editor-custom-select-fullwidth-below-position',
                            'live-editor-custom-select-mid-above-position',
                            'live-editor-custom-select-right-above-position',
                            'live-editor-custom-select-left-above-position',
                            'live-editor-custom-select-winmid-above-position',
                            'live-editor-custom-select-fullwidth-above-position',
                            'live-editor-custom-select-right-mid-position',
                            'live-editor-custom-select-left-mid-position',
                            'live-editor-custom-select-fullwidth-mid-position',
                            'live-editor-custom-select-right-belowtop-position',
                            'live-editor-custom-select-left-belowtop-position',
                            'live-editor-custom-select-mid-belowtop-position',
                            'live-editor-custom-select-fullwidth-belowtop-position',
                            'live-editor-custom-select-right-abovebottom-position',
                            'live-editor-custom-select-left-abovebottom-position',
                            'live-editor-custom-select-fullwidth-abovebottom-position',
                            'live-editor-custom-select-right-winmid-position',
                            'live-editor-custom-select-left-winmid-position',
                            'live-editor-custom-select-winmid-winmid-position',
                            'live-editor-custom-select-fullwidth-winmid-position',
                            'live-editor-custom-select-right-fullheight-position',
                            'live-editor-custom-select-left-fullheight-position',
                            'live-editor-custom-select-winmid-fullheight-position',
                            'live-editor-custom-select-fullwidth-fullheight-position',
                            'live-editor-custom-select-x-scroll',
                            'live-editor-custom-select-y-scroll',
                        ];
                        for (let i in classes) {
                            if (classes[i] == classNameToApply || (classes[i] == 'live-editor-custom-select-x-scroll' && addXScrollClass) || (classes[i] == 'live-editor-custom-select-y-scroll' && addYScrollClass)) {
                                continue;
                            }
                            selectInstance.customSelectDropDownEl.classList.remove(classes[i]);
                        }
        
                        if (classNameToApply && classNameToApply != '' && !selectInstance.customSelectDropDownEl.classList.contains(classNameToApply)) {
                            selectInstance.customSelectDropDownEl.classList.add(classNameToApply);
                        }
        
                        if (addXScrollClass) {
                            selectInstance.customSelectDropDownEl.classList.add('live-editor-custom-select-x-scroll');
                        }
                        if (addYScrollClass) {
                            selectInstance.customSelectDropDownEl.classList.add('live-editor-custom-select-y-scroll');
                        }
                    }
        
                    let selectParentDiv = selectInstance.selectContainerEl = document.createElement("DIV");
                    selectParentDiv.className = 'live-editor-custom-select';
                    if(!selectInstance.originalSelect.parentElement) {
                        console.warn('Select should have parent element.');
                        return;
                    }
                    selectInstance.originalSelect.parentElement.insertBefore(selectParentDiv, selectInstance.originalSelect);
                    selectParentDiv.appendChild(selectInstance.originalSelect);

                    /*for each element, create a new DIV that will act as the selected item:*/
                    let selectedOptionEl = selectInstance.customSelectedEl = document.createElement("DIV");
                    selectedOptionEl.setAttribute("class", "live-editor-custom-select-selected");
                    selectedOptionEl.innerHTML = selectInstance.originalSelect.selectedIndex != -1 ? selectInstance.originalSelect.options[selectInstance.originalSelect.selectedIndex].innerHTML : '';
                    selectParentDiv.appendChild(selectedOptionEl);

                    /*for each element, create a new DIV that will contain the option list:*/
                    let optionsListCon = selectInstance.customSelectDropDownEl = document.createElement("DIV");
                    optionsListCon.setAttribute("class", "live-editor-custom-select-items-con");
                    let optionsListEl = selectInstance.customSelectListEl = document.createElement("DIV");
                    optionsListEl.setAttribute("class", "live-editor-custom-select-items");
                    optionsListCon.appendChild(optionsListEl);
                    let selectControlsEl = selectInstance.customSelectControlsEl = document.createElement("DIV");
                    selectControlsEl.setAttribute("class", "live-editor-custom-select-controls");
                    optionsListCon.appendChild(selectControlsEl);


                    selectInstance.syncOptionsList();

                    selectedOptionEl.addEventListener("click", function (e) {
                        //e.stopPropagation();
                        if(!selectInstance.isShown) {
                            closeAllSelect(this);
                            selectInstance.show();
                        } else {
                            selectInstance.hide(e);
                        }
                    });

                    const config = {attributes: false, childList: true,characterData:false, subtree:true};
                    const callback = function(mutationList, observer) {
                        for (const mutation of mutationList) {
                            if (mutation.type === 'childList') {
                                selectInstance.syncOptionsList();
                            }
                        }
                    };

                    const observer = new MutationObserver(callback);
                    observer.observe(selectInstance.originalSelect, config);

                    function closeAllSelect(elmnt) {
                        return;
                        let existingSelectsLists = document.querySelectorAll('.live-editor-custom-select-items');
                        let existingOpenedSelectsNum = existingSelectsLists.length;
                        let i;
                        for (i = 0; i < existingOpenedSelectsNum; i++) {
                            if (existingSelectsLists[i] && existingSelectsLists[i].parentElement) existingSelectsLists[i].parentElement.removeChild(existingSelectsLists[i]);
                        }

                        let existingSelects = document.querySelectorAll('.live-editor-custom-select-selected');
                        let existingSelectsNum = existingSelects.length;
                        let a;
                        for (a = 0; a < existingSelectsNum; a++) {
                            existingSelects[a].classList.remove('live-editor-custom-select-arrow-active');
                        }
                    }
                }

                function generateId() {
                    return Date.now().toString(36) + Math.random().toString(36).replace(/\./g, "");
                }


                //show settings of soruce when user clicks gears button
                function showSpecificControls(elementToShow) {
                    activeDialog.specificControls.innerHTML = '';

                    let title = document.createElement('DIV');
                    title.className = 'live-editor-specific-controls-title';
                    activeDialog.specificControls.appendChild(title);
                    let backButton = document.createElement('DIV');
                    backButton.className = 'Q_button';
                    backButton.innerHTML = 'Back';
                    title.appendChild(backButton);
                    let titleText = document.createElement('DIV');
                    titleText.className = 'live-editor-specific-controls-title-text';
                    titleText.innerHTML = "Settings";
                    title.appendChild(titleText);

                    activeDialog.specificControls.appendChild(elementToShow);
                    activeDialog.specificControls.classList.add('live-editor-specific-controls-active');

                    backButton.addEventListener('click', function () {
                        activeDialog.specificControls.classList.remove('live-editor-specific-controls-active');
                    })
                }

                function createPopup() {
                    log('createPopup 00', scenesInterface)
                    var dialog=document.createElement('DIV');
                    dialog.className = 'live-editor-dialog-box live-editor-dialog_advanced_streaming';

                    var close=document.createElement('div');
                    close.className = 'live-editor-close-dialog-sign';
                    dialog.appendChild(close);

                    var dialogInner = document.createElement('DIV');
                    dialogInner.className = 'live-editor-dialog-inner';
                    dialog.appendChild(dialogInner);

                    var dialogTitle = document.createElement('DIV');
                    dialogTitle.className = 'live-editor-dialog-header Q_dialog_title';
                    dialogInner.appendChild(dialogTitle);
                    var dialogTitleText = document.createElement('DIV');
                    dialogTitleText.innerHTML = Q.getObject("webrtc.streamingSettings.title", _controlsTool.text);
                    dialogTitleText.className = 'live-editor-dialog-header-text';
                    dialogTitle.appendChild(dialogTitleText);
                    var dialogTitleStats = document.createElement('DIV');
                    dialogTitleStats.className = 'live-editor-dialog-header-stats';
                    dialogTitle.appendChild(dialogTitleStats);

                    var boxContent = document.createElement('DIV');
                    boxContent.className = 'live-editor-dialog-body';
                    dialogInner.appendChild(boxContent);

                    var streamingControls = document.createElement('DIV');
                    streamingControls.className = 'live-editor-streaming-controls';
                    boxContent.appendChild(streamingControls);

                    var generalControls = document.createElement('DIV');
                    generalControls.className = 'live-editor-general-controls';
                    streamingControls.appendChild(generalControls);

                    var specificControls = document.createElement('DIV');
                    specificControls.className = 'live-editor-specific-controls';
                    streamingControls.appendChild(specificControls);

                    var streamingToSectionEl = streamingToSection.createSection();
                    generalControls.appendChild(streamingToSectionEl);

                    var scenesColumn = scenesInterface.createScenesCol();
                    generalControls.appendChild(scenesColumn);

                    var sourcesColumn = document.createElement('DIV');
                    sourcesColumn.className = 'live-editor-sources';
                    _sourcesColumnEl = sourcesColumn;
                    generalControls.appendChild(sourcesColumn);
                    
                    var previewBox = document.createElement('DIV');
                    previewBox.className = 'live-editor-preview-and-chat';
                    boxContent.appendChild(previewBox);

                    var previewBoxBody = document.createElement('DIV');
                    previewBoxBody.className = 'live-editor-preview-body';
                    previewBox.appendChild(previewBoxBody);

                    var previewBoxBodyInner = document.createElement('DIV');
                    previewBoxBodyInner.className = 'live-editor-preview-body-inner';
                    previewBoxBody.appendChild(previewBoxBodyInner);

                    var sourceHoveringEl = _hoveringElement = document.createElement('DIV');
                    sourceHoveringEl.className = 'live-editor-canvas-preview-hovering';
                    previewBoxBodyInner.appendChild(sourceHoveringEl);                    

                    /*var sourceResizingEl = _resizingElement = document.createElement('DIV');
                    sourceResizingEl.className = 'live-editor-preview-resizing';
                    previewBoxBodyInner.appendChild(sourceResizingEl);*/

                    var chatBoxCon = _chatBoxContainer = document.createElement('DIV');
                    chatBoxCon.className = 'live-editor-chat-con';
                    previewBox.appendChild(chatBoxCon);


                   //let chatsInterface = textChatsInterface.createSection();
                   //chatBoxCon.appendChild(chatsInterface);

                    /*Q.activate(
                        Q.Tool.setUpElement(
                            _resizingElement,
                            "Q/resize",
                            {
                                move: true,
                                resize: true,
                                active: true,
                                //elementPosition: 'fixed',
                                showResizeHandles: true,
                                moveWithinArea: 'parent',
                                allowOverresizing: true,
                                negativeMoving: true,
                                onMoving: function () {

                                }
                            }
                        ),
                        {},
                        function () {
                            _resizingElementTool = this;
                            _resizingElement.style.display = 'none';
                        }
                    );*/

                    Q.activate(
                        Q.Tool.setUpElement(
                            dialog,
                            "Q/resize",
                            {
                                move: true,
                                elementPosition: 'fixed',
                                activateOnElement: dialogTitle,
                                keepInitialSize: true,
                                resize: false,
                                active: true,
                                moveWithinArea: 'window',
                            }
                        ),
                        {},
                        function () {

                        }
                    );

                    Q.activate(
                        Q.Tool.setUpElement(
                            dialog,
                            "Streams/fileManager",
                            {

                            }
                        ),
                        {},
                        function (toolEl) {
                            _fileManagerTool = Q.Tool.from(dialog, "Streams/fileManager");
                        }
                    )
                    
                    close.addEventListener('click', function () {
                        hide()
                    });

                    tool.advancedStreamingDialog = boxContent;

                    return {
                        dialogEl: dialog,
                        previewBoxEl: previewBoxBodyInner,
                        previewBoxParent: previewBoxBody,
                        streamingControls: streamingControls,
                        specificControls: specificControls
                    }
                }

                function createPopupHorizontalMobile() {
                    var dialog=document.createElement('DIV');
                    dialog.className = 'live-editor-dialog-box live-editor-dialog_advanced_streaming';

                    var close=document.createElement('div');
                    close.className = 'live-editor-close-dialog-sign live-editor-close-sign';
                    dialog.appendChild(close);

                    var dialogInner = document.createElement('DIV');
                    dialogInner.className = 'live-editor-dialog-inner';
                    dialog.appendChild(dialogInner);

                    var dialogTitle = document.createElement('DIV');
                    dialogTitle.innerHTML = Q.getObject("webrtc.streamingSettings.title", _controlsTool.text);
                    dialogTitle.className = 'live-editor-dialog-header Q_dialog_title';
                    dialogInner.appendChild(dialogTitle);

                    var boxContent = document.createElement('DIV');
                    boxContent.className = 'live-editor-dialog-body';
                    dialogInner.appendChild(boxContent);

                    var streamingControls = document.createElement('DIV');
                    streamingControls.className = 'live-editor-streaming-controls';
                    boxContent.appendChild(streamingControls);

                    var generalControls = document.createElement('DIV');
                    generalControls.className = 'live-editor-general-controls';
                    streamingControls.appendChild(generalControls);

                    var scenesColumn = scenesInterface.createScenesCol();
                    generalControls.appendChild(scenesColumn);

                    var sourcesColumn = document.createElement('DIV');
                    sourcesColumn.className = 'live-editor-sources';
                    _sourcesColumnEl = sourcesColumn;
                    generalControls.appendChild(sourcesColumn);
                    
                    var previewBox = document.createElement('DIV');
                    previewBox.className = 'live-editor-preview-and-chat';
                    boxContent.appendChild(previewBox);

                    var previewBoxBody = document.createElement('DIV');
                    previewBoxBody.className = 'live-editor-preview-body';
                    previewBox.appendChild(previewBoxBody);

                    var previewBoxBodyInner = document.createElement('DIV');
                    previewBoxBodyInner.className = 'live-editor-preview-body-inner';
                    previewBoxBody.appendChild(previewBoxBodyInner);

                    var sourceHoveringEl = _hoveringElement = document.createElement('DIV');
                    sourceHoveringEl.className = 'live-editor-canvas-preview-hovering';
                    previewBoxBodyInner.appendChild(sourceHoveringEl);

                    var streamingToSectionEl = streamingToSection.createSection();
                    previewBoxBody.appendChild(streamingToSectionEl);

                    /*var sourceResizingEl = _resizingElement = document.createElement('DIV');
                    sourceResizingEl.className = 'live-editor-preview-resizing';
                    previewBoxBodyInner.appendChild(sourceResizingEl);*/

                    var chatBoxCon = _chatBoxContainer = document.createElement('DIV');
                    chatBoxCon.className = 'live-editor-chat-con';
                    previewBox.appendChild(chatBoxCon);


                   //let chatsInterface = textChatsInterface.createSection();
                   //chatBoxCon.appendChild(chatsInterface);

                    /*Q.activate(
                        Q.Tool.setUpElement(
                            _resizingElement,
                            "Q/resize",
                            {
                                move: true,
                                resize: true,
                                active: true,
                                //elementPosition: 'fixed',
                                showResizeHandles: true,
                                moveWithinArea: 'parent',
                                allowOverresizing: true,
                                negativeMoving: true,
                                onMoving: function () {

                                }
                            }
                        ),
                        {},
                        function () {
                            _resizingElementTool = this;
                            _resizingElement.style.display = 'none';
                        }
                    );*/

                    Q.activate(
                        Q.Tool.setUpElement(
                            dialog,
                            "Q/resize",
                            {
                                move: true,
                                elementPosition: 'fixed',
                                activateOnElement: dialogTitle,
                                keepInitialSize: false,
                                resize: false,
                                active: true,
                                moveWithinArea: 'window',
                            }
                        ),
                        {},
                        function () {

                        }
                    );

                    Q.activate(
                        Q.Tool.setUpElement(
                            dialog,
                            "Streams/fileManager",
                            {

                            }
                        ),
                        {},
                        function (toolEl) {
                            _fileManagerTool = Q.Tool.from(dialog, "Streams/fileManager");
                        }
                    )

                    var controlsRect = _controlsTool.controlBar.getBoundingClientRect();
                    var dialogWidth = 996;
                    dialog.style.width = dialogWidth + 'px';
                    dialog.style.height = (dialogWidth / 1.4) + 'px';
                    log('dialogWidth', dialogWidth);
                    if(Q.info.isMobile) {
                        //dialog.style.left = (window.innerWidth / 2) - (dialogWidth / 2) + 'px';
                        //dialog.style.bottom = (controlsRect.height + 10) + 'px';
                    } else {
                        //dialog.style.left = (window.innerWidth / 2) - (dialogWidth / 2) + 'px';
                        //dialog.style.top = '100px';
                    }


                    close.addEventListener('click', function () {
                        hide()
                    });

                    tool.advancedStreamingDialog = boxContent;

                    return {
                        dialogEl: dialog,
                        previewBoxEl: previewBoxBodyInner,
                        previewBoxParent: previewBoxBody
                    }
                }

                function hide() {
                    if(activeDialog == null) return;
                    
                    if(activeDialog.dialogEl && activeDialog.dialogEl.parentElement) {
                        activeDialog.dialogEl.parentElement.removeChild(activeDialog.dialogEl);
                    }

                    isHidden = true;
                    var streamingCanvas = document.querySelector('.live-editor-video-stream-canvas');
                    if (streamingCanvas != null) {
                        streamingCanvas.style.position = 'absolute';
                        streamingCanvas.style.top = '-999999999px';
                        streamingCanvas.style.left = '0';
                        document.body.appendChild(streamingCanvas);
                    }

                    if (!tool.RTMPSender.isStreaming() && !tool.RTMPSender.isRecording() && !tool.state.p2pBroadcastIsActive) {
                        //tool.canvasComposer.videoComposer.stop();
                        tool.canvasComposer.stopCaptureCanvas(true); //if there is no active streaming or recording, then turn canvas rendering off to save CPU resources
                    }
                    
                    document.documentElement.classList.remove('Media_webrtc_live');
                    tool.webrtcUserInterface.screenRendering.switchScreensMode('minimizedStatic');

                    if (tool.livestreamStream) {
                        tool.livestreamStream.release(tool);
                    }
                }

                function showHorizontalRequired() {
                    var existingHorizontalRequired = document.querySelector('.Q_webrtc_orientHorizontally');
                    if(existingHorizontalRequired) return;
                    
                    var horizontalRequiredCon = document.createElement('DIV')
                    horizontalRequiredCon.className = 'Q_webrtc_orientHorizontally Q_orientHorizontally Q_floatAboveDocument';
                    horizontalRequiredCon.style.zIndex = '9999999999999999999999999999999999999999';
                    document.body.appendChild(horizontalRequiredCon);
                    horizontalRequiredCon.addEventListener('touchend', function () {
                        window.removeEventListener('resize', verticalToHorizontalOrientationChange);
                        if(typeof screen != 'undefined' && screen.orientation != null) {
                            screen.orientation.removeEventListener("change", verticalToHorizontalOrientationChange);
                        }
                        isOpening = false;
                        hideHorizontalRequired();
                    });
                }

                function hideHorizontalRequired() {
                    var horizontalRequiredCon = document.querySelector('.Q_webrtc_orientHorizontally');
                    if(horizontalRequiredCon && horizontalRequiredCon.parentNode != null) horizontalRequiredCon.parentNode.removeChild(horizontalRequiredCon) ;
                }

                function verticalToHorizontalOrientationChange() {
                    setTimeout(function() {
                        show(true);
                    }, 1600)
                    hideHorizontalRequired();
                    log('show vertical: remove handler')
                    window.removeEventListener('resize', verticalToHorizontalOrientationChange);
                    if(typeof screen != 'undefined' && screen.orientation != null) {
                        screen.orientation.removeEventListener("change", verticalToHorizontalOrientationChange);
                    }
                }

                function show(skipCheck) {
                    if(!skipCheck && (activeDialog && activeDialog.dialogEl && document.body.contains(activeDialog.dialogEl) || isOpening)) return;

                    tool.getOrCreateLivestreamStream().then(function () {
                        var dialogWidth = 996;
                        var dialog, previewBox;
                        if(Q.info.isMobile){
                            if(window.innerWidth > window.innerHeight) {
                                log('show horizontal')
                                if(mobileHorizontaldialogEl == null) {
                                    mobileHorizontaldialogEl = createPopupHorizontalMobile();
                                }
    
                                dialog = mobileHorizontaldialogEl.dialogEl;
                                previewBox = mobileHorizontaldialogEl.previewBoxEl;
                                activeDialog = mobileHorizontaldialogEl;
                                isOpening = false;
                                //_webrtcUserInterface.roomsMediaContainer().appendChild(dialog);
                                document.body.appendChild(dialog);
                                function horizontalToVerticaOrientationChange() {
                                    setTimeout(function () {
                                        log('show', activeDialog, activeDialog.dialogEl, document.body.contains(activeDialog.dialogEl))
                                        log('show', activeDialog && activeDialog.dialogEl && document.body.contains(activeDialog.dialogEl))
                                        if(activeDialog && activeDialog.dialogEl && document.body.contains(activeDialog.dialogEl) === true) {
                                            log('show 3')
    
                                            if(window.innerWidth < window.innerHeight) {
                                                log('show 4')
                                                hide();
                                                show(true);
                                            }
                                        }
                                    }, 1600)
                                    window.removeEventListener('resize', horizontalToVerticaOrientationChange);
    
                                }
                                window.addEventListener('resize', horizontalToVerticaOrientationChange);
    
                            } else {
                                log('show vertical')
    
                                isOpening = true;
                                showHorizontalRequired();
    
                                window.addEventListener('resize', verticalToHorizontalOrientationChange);
                                if(typeof screen != 'undefined' && screen.orientation != null) {
                                    screen.orientation.addEventListener("change", verticalToHorizontalOrientationChange);
                                }
                            }
    
                            if(mobileHorizontaldialogEl == null) return;
                        } else {
                            if(desktopDialogEl == null) {
                                desktopDialogEl = createPopup();
                            }
    
                            dialog = desktopDialogEl.dialogEl;
                            previewBox = desktopDialogEl.previewBoxEl;
                            activeDialog = desktopDialogEl;
                            if(desktopDialogEl == null) return;
                            //_webrtcUserInterface.roomsMediaContainer().appendChild(dialog);
                            document.body.appendChild(dialog);    
                            dialog.style.width = dialogWidth + 'px';
                            dialog.style.height = (dialogWidth / 1.4) + 'px';
                            log('dialogWidth', dialogWidth);
                        }

                        if(tool.livestreamStream) {
                            tool.livestreamStream.retain(tool);
                            tool.livestreamingEditor.textChatsInterface.createSection();
                        }
    
                        var dialogRect = Q.info.isMobile ? mobileHorizontaldialogEl.dialogEl.getBoundingClientRect() : desktopDialogEl.dialogEl.getBoundingClientRect();
    
                        if(dialog) {
                            tool.canvasComposer.videoComposer.compositeVideosAndDraw();
    
                            isHidden = false;
    
                            var controlsRect = _controlsTool.controlBar.getBoundingClientRect();
                            if(Q.info.isMobile) {
    
                                dialog.style.position = 'fixed';
                                dialog.style.width = '100%';
                                dialog.style.height = '100%';
                                dialog.style.maxWidth = 'none';
                                dialog.style.top = '0';
                                dialog.style.left = '0';
                                //dialog.style.left = (window.innerWidth / 2) - (dialogWidth / 2) + 'px';
                                //dialog.style.bottom = (controlsRect.height + 10) + 'px';
                            } else {
                                var winWidth = window.innerWidth;
                                var winHeight= window.innerHeight;
                                if(winWidth >= dialogWidth) {
                                    dialog.style.left = (winWidth / 2) - (dialogWidth / 2) + 'px';
                                } else {
                                    dialog.style.left = window.innerWidth / 100 * (5 / 2) + 'px';
                                    dialog.style.width = window.innerWidth / 100 * 95 + 'px';
                                }
    
                                if(winHeight > dialogRect.height) {
                                    dialog.style.top = (winHeight / 2) - (dialogRect.height / 2) + 'px';
                                } else {
                                    dialog.style.top =  window.innerHeight / 100 * (5 / 2) + 'px';
                                    dialog.style.height = window.innerHeight / 100 * 95 + 'px';
                                }
    
                                //dialog.style.bottom = (controlsRect.height + 10) + 'px';
    
                            }
    
                            var streamingCanvas = _streamingCanvas = document.querySelector('.live-editor-video-stream-canvas');
                            if(streamingCanvas != null) {
                                streamingCanvas.style.position = '';
                                streamingCanvas.style.top = '';
                                streamingCanvas.style.left = '';
                                previewBox.appendChild(streamingCanvas);
                            }
    
                            scenesInterface.syncList();
    
                            if(!_hoveringElementToolInstance) {
                                _hoveringElementToolInstance = scenesInterface.initHoveringTool();
                            }
                          
                            document.documentElement.classList.add('Media_webrtc_live');
                        }
                        
                        tool.webrtcUserInterface.screenRendering.switchScreensMode('minimizedStatic');
                    });
                }

                return {
                    hide: hide,
                    show: show,
                    toggle: function () {
                        if(isHidden) {
                            this.show();
                        } else this.hide();
                    },

                    scenesInterface: scenesInterface,
                    textChatsInterface: textChatsInterface
                }
            },
            getOrCreateLivestreamStream: function() {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    if (tool.livestreamStream != null) {
                        resolve();
                    } else {
                        let webrtcStream = tool.webrtcUserInterface.roomStream();

                        Q.req("Media/livestream", ["createLivestreamStream"], function (err, response) {
                            var msg = Q.firstErrorMessage(err, response && response.errors);

                            if (msg) {
                                console.error(msg);
                                return reject(msg);
                            }

                            let livestreamStreamData = response.slots.createLivestreamStream.livestreamStream;

                            Q.Streams.get(livestreamStreamData.fields.publisherId, livestreamStreamData.fields.name, function () {
                                if (!this || !this.fields) {
                                    console.error('Error while getting stream');
                                    return;
                                }

                                tool.livestreamStream = this;
                                if(tool.livestreamStream) tool.declareStreamEvents();

                                if(tool.livestreamingEditor && tool.livestreamingEditor.textChatsInterface) tool.livestreamingEditor.textChatsInterface.createSection();
                                resolve();
                            });

                        }, {
                            method: 'post',
                            fields: {
                                publisherId: webrtcStream.fields.publisherId,
                                streamName: webrtcStream.fields.name
                            }
                        });
                    }
                });
            },
            get: function () {
                var tool = this;
                let webrtcStream = tool.webrtcUserInterface.roomStream();

                return new Promise(function(resolve, reject) {
                    if (tool.livestreamingEditor != null) {
                        resolve(tool.livestreamingEditor);
                    } else {
                        tool.getOrCreateLivestreamStream().then(function () {
                            if (tool.livestreamStream) tool.declareStreamEvents();
                            tool.getApiCredentials().then(function (credentials) {
                                tool.livestreamingEditor = tool.create();
                                resolve(tool.livestreamingEditor);
                            });
                        });                        
                    }
                  });
                
            },
            refresh: function() {
                var tool = this;
            }
        }

    );

})(window.jQuery, window);