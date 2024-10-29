(function ($, window, undefined) {
    var _controlsToolIcons = []; 

    var ButtonInstance = function (data) {
        this.buttonEl = data.buttonEl;
        this.textEl = data.textEl;
        this.type = data.type;
        this.isActive = false;
        this.deviceId = data.deviceId;
        this.handler = data.handler.bind(this);
        this.makeActive = function () {
            this.buttonEl.classList.add('webrtc-audio-settings_popup_active');
            this.buttonEl.classList.add('webrtc-audio-disabled-radio');
            this.isActive = true;
        };
        this.switchToRegularState = function () {
            this.buttonEl.classList.remove('webrtc-audio-settings_popup_active');
            this.buttonEl.classList.remove('webrtc-audio-disabled-radio');
            this.isActive = false;
        };
        this.show = function () {
            this.buttonEl.classList.remove('webrtc-audio-hidden');
            this.switchToRegularState();
        };
        this.hide = function () {
            this.buttonEl.classList.add('webrtc-audio-hidden');
        };
        this.remove = function () {
            if (this.buttonEl.parentNode != null) this.buttonEl.parentNode.removeChild(this.buttonEl);
        };
    }

    var ua = navigator.userAgent;
    var _isiOS = false;
    var _isAndroid = false;
    var _isiOSCordova = false;
    var _isAndroidCordova = false;
    if (ua.indexOf('iPad') != -1 || ua.indexOf('iPhone') != -1 || ua.indexOf('iPod') != -1) _isiOS = true;
    if (ua.indexOf('Android') != -1) _isAndroid = true;
    if (typeof cordova != 'undefined' && _isiOS) _isiOSCordova = true;
    if (typeof cordova != 'undefined' && _isAndroid) _isAndroidCordova = true;

    function log(){}
    if(Q.Media.WebRTCdebugger) {
        log = Q.Media.WebRTCdebugger.createLogMethod('audio.js')
    }

    /**
     * Media/webrtc/control tool.
     * tool for managing audio during teleconference. User is able to choose a microphone that is used for sending audio via WebRTC and speakers (audio output) which plays incoming audio of other participants
     * @module Media
     * @class Media webrtc
     * @constructor
     * @param {Object} options
     *  Hash of possible options
     */
    Q.Tool.define("Media/webrtc/audio", function (options) {
        var tool = this;
        _controlsToolIcons = tool.state.controlsTool.getIcons();

        tool.audioinputListEl = null;
        tool.audioOutputListEl = null;
        tool.audioOutputListButtons = [];
        tool.audioInputListButtons = [];
        tool.turnOffAudioInputBtn = null;

        tool.webrtcUserInterface = options.webrtcUserInterface();
        tool.webrtcSignalingLib = tool.webrtcUserInterface.getWebrtcSignalingLib();

        Q.addStylesheet('{{Media}}/css/tools/audio.css?ts=' + performance.now(), function () {
          
        });

        tool.text = Q.Text.collection[Q.Text.language]['Media/content'];

        tool.createAudioInputList();
        tool.createAudioOutputList();
        tool.declareEventsHandlers();

        tool.loadAudioOutputList();
        tool.loadAudioInputList();
    },

        {
            onRefresh: new Q.Event(),
            controlsTool: null,
            webrtcUserInterface: null
        },

        {
            declareEventsHandlers: function () {
                var tool = this;
                var webrtcSignalingLib = tool.webrtcSignalingLib;
                var roomStream = tool.webrtcUserInterface.roomStream();
                
                webrtcSignalingLib.event.on('beforeSwitchRoom', function (e) {
                    tool.webrtcSignalingLib = e.newWebrtcSignalingLibInstance;
                    tool.declareEventsHandlers();
                });
                
                webrtcSignalingLib.event.on('micEnabled', function () {
                    tool.updateAudioInputList();
                });
                webrtcSignalingLib.event.on('micDisabled', function () {
                    tool.updateAudioInputList();
                    localStorage.setItem("Q.Media.webrtc.audioInputDeviceId", 'false');
                    localStorage.setItem("Q.Media.webrtc.audioInputGroupId", 'false');
                });
                webrtcSignalingLib.event.on('trackAdded', function (e) {
                    if(e.participant.isLocal) {
                        return;
                    }
                    var localParticipant = tool.webrtcSignalingLib.localParticipant();
                    var localUserId = localParticipant.identity != null ? localParticipant.identity.split('\t')[0] : Q.Users.loggedInUserId();
                    var remoteUserId = e.participant.identity != null ? e.participant.identity.split('\t')[0] : null;
                    if(!localUserId || !remoteUserId) {
                        return;
                    }

                    if (localUserId == remoteUserId && e.track.kind == 'audio') {
                        if (tool.turnOffAudioInputBtn) {
                            tool.turnOffAudioInputBtn.handler();
                        }
                    }
                });
                
                webrtcSignalingLib.event.on('deviceListUpdated', function () {
                    tool.loadAudioOutputList();
                    tool.loadAudioInputList();
                });
                webrtcSignalingLib.event.on('currentAudioinputDeviceChanged', function (device) {
                    tool.updateAudioInputList();
                    localStorage.setItem("Q.Media.webrtc.audioInputDeviceId", device.deviceId);
                    localStorage.setItem("Q.Media.webrtc.audioInputGroupId", device.groupId);
                });
                webrtcSignalingLib.event.on('currentAudiooutputDeviceChanged', function (device) {
                    tool.updateAudioOutputList();
                    localStorage.setItem("Q.Media.webrtc.audioOutputDeviceId", device.deviceId);
                    localStorage.setItem("Q.Media.webrtc.audioOutputGroupId", device.groupId);
                });

                webrtcSignalingLib.event.on('accessUpdated', function (device) {
                    tool.updateUIAccordingAccess();
                });

                roomStream.onMessage("Media/webrtc/globalPermissionsAdded").set(function (message) {
                    tool.updateUIAccordingAccess();
                }, tool);

                roomStream.onMessage("Media/webrtc/globalPermissionsRemoved").set(function (message) {
                    tool.updateUIAccordingAccess();
                }, tool);

                roomStream.onMessage("Media/webrtc/personalPermissionsAdded").set(function (message) {
                    tool.updateUIAccordingAccess();
                }, tool);

                roomStream.onMessage("Media/webrtc/personalPermissionsRemoved").set(function (message) {
                    tool.updateUIAccordingAccess();
                }, tool);

                roomStream.onMessage("Media/webrtc/resetPersonalPermissions").set(function (message) {
                    tool.updateUIAccordingAccess();
                }, tool);
            },
            updateUIAccordingAccess: function () {
                var tool = this;
                var localParticipant = tool.webrtcSignalingLib.localParticipant();

                if(localParticipant.hasPermission('mic')) {
                    tool.audioinputListEl.classList.remove('webrtc-audio-disabled');
                } else {
                    tool.audioinputListEl.classList.add('webrtc-audio-disabled');
                }
            },
            createAudioInputList: function () {
                var tool = this;
                let audioinputListCon = document.createElement('DIV');
                audioinputListCon.className = 'webrtc-audio-choose-input-audio-con';

                let inputListTilte = document.createElement('DIV');
                inputListTilte.className = 'webrtc-audio-choose-device-title';
                inputListTilte.innerHTML = Q.getObject("webrtc.audioSettings.microphone", tool.text);;

                var audioinputList = document.createElement('DIV');
                audioinputList.className = 'webrtc-audio-choose-device webrtc-audio-choose-audio-device';

                var turnOffradioBtnItem = document.createElement('DIV');
                turnOffradioBtnItem.className = 'webrtc-audio-settings_popup_item webrtc-audio-turn_video_off';
                turnOffradioBtnItem.dataset.deviceId = 'off';
                var textLabelCon = document.createElement('SPAN');
                textLabelCon.className = 'webrtc-audio-settings_popup_item_text webrtc-audio-turn_video_off_text';
                var textLabel = document.createTextNode(Q.getObject("webrtc.settingsPopup.micIsTurnedOff", tool.text));
                var checkmark = document.createElement('SPAN');
                checkmark.className = 'webrtc-audio-radio-checkmark';
                checkmark.innerHTML = _controlsToolIcons.switchOffCameras;
                textLabelCon.appendChild(textLabel);
                turnOffradioBtnItem.appendChild(textLabelCon);
                turnOffradioBtnItem.appendChild(checkmark);

                tool.turnOffAudioInputBtn = new ButtonInstance({
                    buttonEl: turnOffradioBtnItem,
                    textEl: textLabelCon,
                    type: 'off',
                    handler: function (e) {
                        tool.toggleAudioInputRadioButton(tool.turnOffAudioInputBtn);
                        tool.webrtcSignalingLib.localMediaControls.disableAudio();
                        Q.Dialogs.pop();
                        tool.state.controlsTool.closeAllDialogs();
                        tool.state.controlsTool.updateControlBar();
                    }
                });

                var localParticipant = tool.webrtcSignalingLib.localParticipant();
                var enabledAudioTracks = localParticipant.tracks.filter(function (t) {
                    return t.kind == 'audio' && t.mediaStreamTrack != null && t.mediaStreamTrack.enabled;
                }).length;
                if (enabledAudioTracks == 0 && localParticipant.audioStream == null) {
                    tool.toggleAudioInputRadioButton(tool.turnOffAudioInputBtn);
                }

                audioinputList.appendChild(turnOffradioBtnItem);
                audioinputListCon.appendChild(inputListTilte);
                audioinputListCon.appendChild(audioinputList);

                turnOffradioBtnItem.addEventListener('mouseup', tool.turnOffAudioInputBtn.handler)

                tool.audioinputListEl = audioinputList;
                return audioinputListCon;
            },
            toggleAudioInputRadioButton: function (buttonObj) {
                var tool = this;
                var deselectAudioInButtons = function () {
                    for (var i in tool.audioInputListButtons) {
                        if (tool.audioInputListButtons[i] == buttonObj) continue;
                        tool.audioInputListButtons[i].switchToRegularState();
                    }
                }

                if (buttonObj.type == 'audio') {
                    deselectAudioInButtons();
                    tool.turnOffAudioInputBtn.textEl.innerHTML = Q.getObject("webrtc.settingsPopup.turnOffAudioInput", tool.text);
                    tool.turnOffAudioInputBtn.switchToRegularState();
                } else if (buttonObj.type == 'off') {
                    deselectAudioInButtons();
                    tool.turnOffAudioInputBtn.textEl.innerHTML = Q.getObject("webrtc.settingsPopup.micIsTurnedOff", tool.text);
                }

                if (typeof buttonObj == "undefined") return;

                buttonObj.makeActive();
            },
            clearAudioInputList: function () {
                var tool = this;
                for (let c = tool.audioInputListButtons.length - 1; c >= 0; c--) {
                    tool.audioInputListButtons[c].remove();
                    tool.audioInputListButtons.splice(c, 1);
                }
            },
            loadAudioInputList: function () {
                var tool = this;
                var count = 1;

                tool.clearAudioInputList();
                log('controls: audio current device', tool.webrtcSignalingLib.localMediaControls.currentAudioInputDevice());

                tool.webrtcSignalingLib.localMediaControls.audioInputDevices().forEach(function (mediaDevice) {
                    log('controls: loadAudioInputList', mediaDevice);
                    var radioBtnItem = document.createElement('DIV');
                    radioBtnItem.className = 'webrtc-audio-settings_popup_item';
                    radioBtnItem.dataset.deviceId = mediaDevice.deviceId;

                    var textLabelCon = document.createElement('SPAN');
                    textLabelCon.className = 'webrtc-audio-settings_popup_item_text';
                    var textLabel = document.createTextNode(mediaDevice.label || `Audio input ${count}`);
                    var checkmark = document.createElement('SPAN');
                    
                    checkmark.className = 'webrtc-audio-radio-checkmark';
                    checkmark.innerHTML = _controlsToolIcons.microphoneTransparent;
                    textLabelCon.appendChild(textLabel);
                    radioBtnItem.appendChild(textLabelCon);
                    radioBtnItem.appendChild(checkmark);
                    tool.audioinputListEl.insertBefore(radioBtnItem, tool.audioinputListEl.firstChild);

                    var audioInputItem = new ButtonInstance({
                        buttonEl: radioBtnItem,
                        textEl: textLabelCon,
                        type: 'audio',
                        deviceId: mediaDevice.deviceId,
                        handler: function (e) {
                            if (!radioBtnItem.classList.contains('Q_working')) radioBtnItem.classList.add('Q_working');

                            var toggle = function () {
                                tool.toggleAudioInputRadioButton(audioInputItem);

                                Q.Dialogs.pop();
                                tool.state.controlsTool.closeAllDialogs();

                                tool.webrtcSignalingLib.localMediaControls.toggleAudioInputs({ deviceId: mediaDevice.deviceId, groupId: mediaDevice.groupId }, function () {
                                    if (radioBtnItem.classList.contains('Q_working')) radioBtnItem.classList.remove('Q_working');
                                    tool.state.controlsTool.updateControlBar();
                                }, function (e) {
                                    if (radioBtnItem.classList.contains('Q_working')) radioBtnItem.classList.remove('Q_working');
                                    if (_isiOSCordova) tool.showIosPermissionsInstructions('Audio');
                                })
                            }

                            if (tool.webrtcSignalingLib.limits && (tool.webrtcSignalingLib.limits.video || tool.webrtcSignalingLib.limits.audio)) {
                                if (tool.webrtcSignalingLib.localMediaControls.cameraIsEnabled() || tool.giveCameraTimer != null) {
                                    tool.webrtcSignalingLib.localMediaControls.canITurnMicOn().then(function (result) {
                                        toggle();
                                    });
                                } else {
                                    tool.state.controlsTool.limits.selectMediaDialog(function (result) {
                                        if (result.audio && result.video) {
                                            tool.webrtcSignalingLib.localMediaControls.canITurnCameraAndMicOn().then(function (result) {
                                                tool.state.controlsTool.videoInputsTool.turnOnCamera();
                                                toggle();
                                            });

                                            /*tool.webrtcSignalingLib.localMediaControls.canITurnMicOn().then(function(result) {
                                                toggle();
                                            });*/
                                        } else if (result.audio) {
                                            tool.webrtcSignalingLib.localMediaControls.canITurnMicOn().then(function (result) {
                                                toggle();
                                            });
                                        }
                                    }, function () {
                                        if(radioBtnItem.classList.contains('Q_working')) radioBtnItem.classList.remove('Q_working');
                                    });
                                }

                            } else {
                                toggle();
                            }

                        }
                    });

                    tool.audioInputListButtons.push(audioInputItem);

                    if (tool.webrtcSignalingLib.localMediaControls.currentAudioInputDevice() != null && tool.webrtcSignalingLib.localMediaControls.currentAudioInputDevice().deviceId == mediaDevice.deviceId) {
                        tool.toggleAudioInputRadioButton(audioInputItem);
                    }

                    radioBtnItem.addEventListener('mouseup', audioInputItem.handler)
                    count++;
                });

                tool.updateAudioInputList();
                tool.updateUIAccordingAccess();
                //if(turnOnCameraItem.parentNode != null) turnOnCameraItem.parentNode.removeChild(turnOnCameraItem);
            },
            updateAudioInputList: function () {
                var tool = this;
                log('controls: updateAudioInputList START', tool.webrtcSignalingLib.localMediaControls.currentAudioInputDevice());
                let audioInputIsActive = false;
                log('controls: updateAudioInputList: current ai device', tool.webrtcSignalingLib.localMediaControls.currentAudioInputDevice());

                tool.audioInputListButtons.forEach(function (audioInputItem) {
                    if (tool.webrtcSignalingLib.localMediaControls.currentAudioInputDevice() != null && tool.webrtcSignalingLib.localMediaControls.currentAudioInputDevice().deviceId == audioInputItem.deviceId) {
                        tool.toggleAudioInputRadioButton(audioInputItem);
                        audioInputIsActive = true
                    }

                });
                if (!audioInputIsActive) {
                    log('controls: updateAudioInputList: tool.turnOffAudioInputBtn');
                    tool.toggleAudioInputRadioButton(tool.turnOffAudioInputBtn);
                }
            },
            updateAudioOutputList: function () {
                var tool = this;
                tool.audioOutputListButtons.forEach(function (audioOutputItem) {
                    let currentDevice = tool.webrtcSignalingLib.localMediaControls.currentAudioOutputDevice();
                    if (currentDevice != null && currentDevice.deviceId == audioOutputItem.deviceId) {
                        tool.toggleAudioOutputRadioButton(audioOutputItem);
                    }
                });
            },
            createAudioOutputList: function () {
                var tool = this;
                var audioOutputListCon = document.createElement('DIV');
                audioOutputListCon.className = 'webrtc-audio-choose-output-device-con';

                let outputListTilte = document.createElement('DIV');
                outputListTilte.className = 'webrtc-audio-choose-device-title';
                outputListTilte.innerHTML = Q.getObject("webrtc.audioSettings.speakers", tool.text);

                var audioOutputList = document.createElement('DIV');
                audioOutputList.className = 'webrtc-audio-choose-device webrtc-audio-choose-output-audio';

                audioOutputListCon.appendChild(outputListTilte);
                audioOutputListCon.appendChild(audioOutputList);


                tool.audioOutputListEl = audioOutputList;
                return audioOutputListCon;
            },
            toggleAudioOutputRadioButton: function (buttonObj) {
                var tool = this;
                var deselectAudioOutButtons = function () {
                    for (var i in tool.audioOutputListButtons) {
                        if (tool.audioOutputListButtons[i] == buttonObj) continue;
                        tool.audioOutputListButtons[i].switchToRegularState();
                    }
                }

                deselectAudioOutButtons();

                if (typeof buttonObj == "undefined") return;

                buttonObj.makeActive();
            },
            checkIfSetSinkIdIsSupported: function () {
                var tool = this;
                var mediaElement = document.createElement('VIDEO');
                if ('setSinkId' in mediaElement) {
                    return true;
                }
                return false;
            },
            loadAudioOutputList: function () {
                var tool = this;
                log('controls: loadAudioOutputList START');
                tool.audioOutputListEl.innerHTML = '';
                tool.audioOutputListButtons = [];

                if (!tool.checkIfSetSinkIdIsSupported()) {
                    var alertNoticeCon = document.createElement('DIV');
                    alertNoticeCon.className = 'webrtc-audio-notice_alert';
                    alertNoticeCon.innerHTML = "Selecting output device is not supported in your browser";
                    tool.audioOutputListEl.appendChild(alertNoticeCon);
                    return;
                }

                var count = 1;

                tool.webrtcSignalingLib.localMediaControls.audioOutputDevices().forEach(function (mediaDevice) {
                    log('controls: loadAudioOutputList', mediaDevice);
                    var radioBtnItem = document.createElement('DIV');
                    radioBtnItem.className = 'webrtc-audio-settings_popup_item';
                    radioBtnItem.dataset.deviceId = mediaDevice.deviceId;

                    var textLabelCon = document.createElement('SPAN');
                    textLabelCon.className = 'webrtc-audio-settings_popup_item_text';
                    var textLabel = document.createTextNode(mediaDevice.label || `Audio input ${count}`);
                    var checkmark = document.createElement('SPAN');
                    checkmark.className = 'webrtc-audio-radio-checkmark';
                    checkmark.innerHTML = _controlsToolIcons.enabledSpeaker;
                    textLabelCon.appendChild(textLabel);
                    radioBtnItem.appendChild(textLabelCon);
                    radioBtnItem.appendChild(checkmark);
                    tool.audioOutputListEl.insertBefore(radioBtnItem, tool.audioOutputListEl.firstChild);

                    var audioOutputItem = new ButtonInstance({
                        buttonEl: radioBtnItem,
                        textEl: textLabelCon,
                        type: 'audio',
                        deviceId: mediaDevice.deviceId,
                        handler: function (e) {
                            tool.toggleAudioOutputRadioButton(audioOutputItem);

                            Q.Dialogs.pop();
                            tool.state.controlsTool.closeAllDialogs();

                            tool.webrtcSignalingLib.localMediaControls.toggleAudioOutputs(mediaDevice, function () {
                                tool.state.controlsTool.updateControlBar();
                            }, function (e) {
                                if (_isiOSCordova) tool.showIosPermissionsInstructions('Audio');
                            })

                        }
                    });

                    tool.audioOutputListButtons.push(audioOutputItem);

                    if (tool.webrtcSignalingLib.localMediaControls.currentAudioInputDevice() != null && tool.webrtcSignalingLib.localMediaControls.currentAudioInputDevice().deviceId == mediaDevice.deviceId) {
                        tool.toggleAudioOutputRadioButton(audioOutputItem);
                    }

                    radioBtnItem.addEventListener('mouseup', audioOutputItem.handler)
                    count++;
                });

                tool.updateAudioOutputList();
                //if(turnOnCameraItem.parentNode != null) turnOnCameraItem.parentNode.removeChild(turnOnCameraItem);
            },
            refresh: function () {
                var tool = this;
            },
            log: function log(text) {
                var tool = this;
                //if (!tool.state.debug.controls) return;
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

                if (tool.webrtcSignalingLib) tool.webrtcSignalingLib.event.dispatch('log', params);
            }
        }

    );

})(window.jQuery, window);