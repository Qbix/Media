(function ($, window, undefined) {

    var ua = navigator.userAgent;
    var _isiOS = false;
    var _isAndroid = false;
    var _isiOSCordova = false;
    var _isAndroidCordova = false;
    if (ua.indexOf('iPad') != -1 || ua.indexOf('iPhone') != -1 || ua.indexOf('iPod') != -1) _isiOS = true;
    if (ua.indexOf('Android') != -1) _isAndroid = true;
    if (typeof cordova != 'undefined' && _isiOS) _isiOSCordova = true;
    if (typeof cordova != 'undefined' && _isAndroid) _isAndroidCordova = true;

    var _icons = {
        reset: '<svg id="Capa_1" enable-background="new 0 0 512.001 512.001" height="512" viewBox="0 0 512.001 512.001" width="512" xmlns="http://www.w3.org/2000/svg"><g><path d="m497 189.5h-56.88c-8.29 0-15 6.72-15 15s6.71 15 15 15h13.32v88c0 8.28 6.72 15 15 15 8.29 0 15-6.72 15-15v-88h13.56c8.28 0 15-6.72 15-15s-6.72-15-15-15z"/><path d="m169.4 219.5c8.284 0 15-6.716 15-15s-6.716-15-15-15h-43.4c-8.284 0-15 6.716-15 15v103c0 8.284 6.716 15 15 15h43.4c8.284 0 15-6.716 15-15s-6.716-15-15-15h-28.4v-21.5h25.2c8.284 0 15-6.716 15-15s-6.716-15-15-15h-25.2v-21.5z"/><path d="m386.19 219.5c8.28 0 15-6.72 15-15s-6.72-15-15-15h-43.4c-8.29 0-15 6.72-15 15v103c0 8.28 6.71 15 15 15h43.4c8.28 0 15-6.72 15-15s-6.72-15-15-15h-28.4v-21.5h25.19c8.29 0 15-6.72 15-15s-6.71-15-15-15h-25.19v-21.5z"/><path d="m70.69 322.5c3.52 0 7.06-1.23 9.91-3.74 6.22-5.47 6.82-14.95 1.35-21.17l-24.06-27.33c16.24-6.03 27.8-21.23 27.8-38.99 0-23.03-19.42-41.77-43.29-41.77h-27.38c-.01 0-.01 0-.02 0-8.28 0-15 6.72-15 15v103c0 8.28 6.72 15 15 15s15-6.72 15-15v-23.53l29.43 33.44c2.96 3.37 7.1 5.09 11.26 5.09zm-28.29-79.46c-2.94 0-7.61.01-12.26.04-.02-4.53-.05-18.84-.06-23.58h12.32c7.2 0 13.29 5.39 13.29 11.77s-6.09 11.77-13.29 11.77z"/><path d="m60.48 114.27c6.4 5.27 15.85 4.37 21.12-2.02 43.14-52.27 106.71-82.25 174.4-82.25 56.25 0 109.64 20.71 150.83 57.7h-22.31c-8.28 0-15 6.72-15 15 0 8.29 6.72 15 15 15h57.45c3.45 0 6.88-1.23 9.55-3.43 3.41-2.81 5.46-7.16 5.45-11.59v-57.42c0-8.29-6.72-15-15-15-8.29 0-15 6.71-15 15v20.2c-46.68-41.96-107.2-65.46-170.97-65.46-76.68 0-148.68 33.95-197.54 93.15-5.27 6.39-4.36 15.85 2.02 21.12z"/><path d="m256.79 292.5c-9.568.018-18.931-3.869-24.78-10.34-5.56-6.14-15.05-6.61-21.18-1.04-6.14 5.56-6.61 15.05-1.05 21.18 11.611 12.844 28.845 20.207 47.01 20.2 22.74 0 41.85-14.59 45.44-34.69 2.71-15.2-4.09-35.03-31.3-45.07-5.32-1.95-10.47-3.99-14.93-5.8-5.86-2.39-10.51-4.39-12.72-5.36-1.69-1.5-1.71-3.47-1.55-4.58.2-1.41 1.26-4.88 6.7-6.52 2.58-.78 5.13-1.04 7.57-.94 10.36.38 18.72 7.03 18.83 7.12 8.08 4.11 17.53 1.22 21.33-5.51 2.98-5.27 2.17-12.34-2.13-17.54-11.23-9.83-24.73-14.4-38.03-14.3-5.49.03-10.96.87-16.22 2.45-15.02 4.52-25.65 16.39-27.75 30.98-1.97 13.73 3.99 26.95 15.55 34.49.66.43 1.36.81 2.08 1.13.54.24 12.24 5.45 26.34 10.83 1.49.56 3.01 1.13 4.54 1.7 3.14 1.15 13.27 5.4 12.15 11.65-.85 4.79-7.18 9.96-15.9 9.96z"/><path d="m449.24 397.73c-6.38-5.27-15.84-4.37-21.11 2.02-42.66 51.69-105.29 81.58-172.13 82.24-56.961.583-111.386-20.199-153.1-57.69h22.31c8.28 0 15-6.72 15-15 0-8.29-6.72-15-15-15h-57.45c-8.06-.15-15.15 6.96-15 15.02v57.42c0 8.29 6.72 15 15 15 8.29 0 15-6.71 15-15v-20.2c47.205 42.46 108.759 66.036 173.24 65.45 75.83-.66 146.89-34.52 195.27-93.14 5.27-6.39 4.36-15.85-2.03-21.12z"/></g></svg>'
    }

    function log() { }
    if (Q.Media.WebRTCdebugger) {
        log = Q.Media.WebRTCdebugger.createLogMethod('limits.js')
    }

    /**
     * Media/webrtc/limitsManager tool.
     * Manages limits in the room
     * @module Media
     * @class Media webrtc
     * @constructor
     * @param {Object} options
     *  Hash of possible options
     */
    Q.Tool.define("Media/webrtc/limitsManager", function (options) {
        var tool = this;
        tool.roomStream = null;
        tool.limitsManagerUI = null;
        tool.limitsToggleCheckbox = null;
        tool.formInputs = {
            videoSlots: null,
            audioSlots: null,
            timeToSpeak: null,
            timeToEnd: null,
        };

        tool.loadStyles().then(function () {
            tool.loadRoomStream().then(function () {
                tool.createUI();
                tool.declareEventsHandlers();
                tool.updateInputValues();
                Q.handle(tool.state.onLoad, tool, []);
            });
        });
    },

        {
            publisherId: null,
            streamName: null,
            onRefresh: new Q.Event(),
            onTurnOnOff: new Q.Event(),
            onLimitsUpdate: new Q.Event(),
            onLoad: new Q.Event(),
        },

        {
            refresh: function () {
                tool.loadRoomStream().then(function () {
                    tool.createUI();
                });
            },
            loadStyles: function () {
                return new Promise(function (resolve, reject) {
                    Q.addStylesheet('{{Media}}/css/tools/webrtcLimitsManager.css?ts=' + Date.now(), function () {
                        resolve();
                    });
                });
            },
            loadRoomStream: function () {
                var tool = this;
                if(tool.roomStream) {
                    return new Promise(function (resolve, reject) {
                        tool.roomStream.refresh(function (err, stream) {
                            
                            tool.roomStream = stream;
                            resolve(stream);
                        }, {
                            fields: ['attributes']
                        });
                    });
                } else {
                    return new Promise(function (resolve, reject) {
                        Q.Streams.get(tool.state.publisherId, tool.state.streamName, function (err, stream) {
                            
                            tool.roomStream = stream;
                            resolve(stream);
                        }, {
                            fields: ['attributes']
                        });
                    });
                }
                
            },
            declareEventsHandlers: function () {
                var tool = this;
                var roomStream = tool.roomStream;

                roomStream.onMessage("Media/webrtc/turnLimitsOnOrOff").set(function (message) {
                    onMessageHandler(message, 'turnLimitsOnOrOff');
                }, tool);
                roomStream.onMessage("Media/webrtc/updateLimits").set(function (message) {
                    onMessageHandler(message, 'updateLimits');
                }, tool);

                function onMessageHandler(message, messageName) {
                    var message = JSON.parse(message.instructions);
                    if(message.byUserId != Q.Users.loggedInUserId()) {
                        tool.loadRoomStream().then(function () {
                            tool.updateInputValues();
                            let limits = tool.roomStream.getAttribute('limits');
                            if(messageName == 'updateLimits') {
                                Q.handle(tool.state.onLimitsUpdate, tool, [limits]);

                            } else if(messageName == 'turnLimitsOnOrOff'){
                                Q.handle(tool.state.onTurnOnOff, tool, [limits]);
                            }
                        });
                    }
                }
            },
            turnLimitsOnOrOff: function (actionToDo) {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/webrtc", ['turnLimitsOnOrOff'], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);
                        
                        if (msg) {
                            reject(msg);
                            console.error(msg)
                            return;
                        }
    
                        resolve()
                    }, {
                        method: 'post',
                        fields: {
                            publisherId: tool.roomStream.fields.publisherId,
                            streamName: tool.roomStream.fields.name,
                            actionToDo: actionToDo,
                        }
                    });
                });
            },
            createUI: function () {
                var tool = this;

                let container;
                if(!tool.limitsManagerUI) {
                    container = tool.limitsManagerUI = document.createElement('DIV');
                    container.className = 'webrtc-limits-manager';
                } else {
                    container = tool.limitsManagerUI;
                }
                
                container.innerHTML = '';

                container.appendChild(createToggleCheckbox());
                container.appendChild(createForm());

                function createToggleCheckbox() {
                    let limitsToggleCon = document.createElement('DIV');
                    limitsToggleCon.className = 'webrtc-permissions-limits-toggle';

                    let limitsToggleLabel = document.createElement('DIV');
                    limitsToggleLabel.className = 'webrtc-permissions-limitss-toggle-label';
                    limitsToggleLabel.innerHTML = 'Time Limits:';
                    limitsToggleCon.appendChild(limitsToggleLabel);

                    let limitsToggleCover = document.createElement('DIV');
                    limitsToggleCover.className = 'webrtc-permissions-limits-toggle-cover';
                    limitsToggleCon.appendChild(limitsToggleCover);

                    let limitsToggleButton = document.createElement('LABEL');
                    limitsToggleButton.className = 'webrtc-permissions-limits-toggle-button toggle-button-r';
                    limitsToggleCover.appendChild(limitsToggleButton);

                    let limitsToggleCheckbox = document.createElement('INPUT');
                    limitsToggleCheckbox.className = 'webrtc-permissions-limits-toggle-checkbox';
                    limitsToggleCheckbox.type = 'checkbox';
                    tool.limitsToggleCheckbox = limitsToggleCheckbox;

                    limitsToggleCheckbox.addEventListener('change', function () {
                        limitsToggleCheckbox.classList.add('Q_working');
                        tool.turnLimitsOnOrOff(limitsToggleCheckbox.checked ? 'on' : 'off').then(function () {
                            limitsToggleCheckbox.classList.remove('Q_working');
                        }).catch(function (e) {
                            console.error(e);
                            limitsToggleCheckbox.classList.remove('Q_working');
                            limitsToggleCheckbox.checked = limitsToggleCheckbox.checked ? false : true;
                        });
                    })

                    limitsToggleButton.appendChild(limitsToggleCheckbox);

                    let limitsToggleKnobs = document.createElement('DIV');
                    limitsToggleKnobs.className = 'webrtc-permissions-limits-toggle-knobs';
                    limitsToggleButton.appendChild(limitsToggleKnobs);

                    let limitsToggleLayer = document.createElement('DIV');
                    limitsToggleLayer.className = 'webrtc-permissions-limits-toggle-layer';
                    limitsToggleButton.appendChild(limitsToggleLayer);

                    return limitsToggleCon;
                }

            
                function createForm() {    
                    let formContainer = document.createElement('DIV');
                    formContainer.className = 'limits-form-container';

                    let videoNumCon = document.createElement('DIV');
                    videoNumCon.className = 'limits-form-param limits-manager-video-con';
                    formContainer.appendChild(videoNumCon);
                    
                    let videoNumText = document.createElement('DIV');
                    videoNumText.className = 'limits-form-label';
                    videoNumText.innerHTML = 'Video Slots';
                    videoNumCon.appendChild(videoNumText);
    
                    let videoNumInputCon = document.createElement('DIV');
                    videoNumInputCon.className = 'limits-form-input';
                    videoNumCon.appendChild(videoNumInputCon);

                    let videoNumInput = document.createElement('INPUT');
                    videoNumInput.className = 'limits-form-num-input limits-manager-video-input';
                    videoNumInput.type = 'number';
                    videoNumInputCon.appendChild(videoNumInput);
                    tool.formInputs.videoSlots = videoNumInput;
                    
                    let audioNumCon = document.createElement('DIV');
                    audioNumCon.className = 'limits-form-param limits-manager-audio-con';
                    formContainer.appendChild(audioNumCon);
                    
                    let audioNumText = document.createElement('DIV');
                    audioNumText.className = 'limits-form-label';
                    audioNumText.innerHTML = 'Audio Slots';
                    audioNumCon.appendChild(audioNumText);
    
                    let audioNumInputCon = document.createElement('DIV');
                    audioNumInputCon.className = 'limits-form-input';
                    audioNumCon.appendChild(audioNumInputCon);

                    let audioNumInput = document.createElement('INPUT');
                    audioNumInput.className = 'limits-manager-audio-input';
                    audioNumInput.type = 'number';
                    audioNumInputCon.appendChild(audioNumInput);
                    tool.formInputs.audioSlots = audioNumInput;
                    
                    let timeToTalkCon = document.createElement('DIV');
                    timeToTalkCon.className = 'limits-form-param limits-manager-time-speak';
                    formContainer.appendChild(timeToTalkCon);
                    
                    let timeToTalkText = document.createElement('DIV');
                    timeToTalkText.className = 'limits-form-label';
                    timeToTalkText.innerHTML = 'Time for speaker (seconds)';
                    timeToTalkCon.appendChild(timeToTalkText);

                    let timeToTalkInputCon = document.createElement('DIV');
                    timeToTalkInputCon.className = 'limits-form-input';
                    timeToTalkCon.appendChild(timeToTalkInputCon);

                    let timeToTalkInput = document.createElement('INPUT');
                    timeToTalkInput.className = 'limits-manager-time-speak-i';
                    timeToTalkInput.type = 'number';
                    timeToTalkInputCon.appendChild(timeToTalkInput);
                    tool.formInputs.timeToSpeak = timeToTalkInput;
                    
                    let timeToEndCon = document.createElement('DIV');
                    timeToEndCon.className = 'limits-form-param limits-manager-time-speak-end';
                    formContainer.appendChild(timeToEndCon);
                    
                    let timeToEndText = document.createElement('DIV');
                    timeToEndText.className = 'limits-form-label';
                    timeToEndText.innerHTML = 'Time for speaker to finish';
                    timeToEndCon.appendChild(timeToEndText);

                    let timeToEndInputCon = document.createElement('DIV');
                    timeToEndInputCon.className = 'limits-form-input';
                    timeToEndCon.appendChild(timeToEndInputCon);

                    let timeToEndInput = document.createElement('INPUT');
                    timeToEndInput.className = 'limits-manager-time-end-i';
                    timeToEndInput.type = 'number';
                    timeToEndInputCon.appendChild(timeToEndInput);
                    tool.formInputs.timeToEnd = timeToEndInput;
                    
                    let buttons = document.createElement('DIV');
                    buttons.className = 'limits-manager-buttons';
                    formContainer.appendChild(buttons);
    
                    let saveBtn = document.createElement('BUTTON');
                    saveBtn.className = 'Q_button';
                    saveBtn.innerHTML = 'Save';
                    buttons.appendChild(saveBtn);
    
                    saveBtn.addEventListener('click', function () {
                        return new Promise(function (resolve, reject) {
                            Q.req("Media/webrtc", ['updateLimits'], function (err, response) {
                                var msg = Q.firstErrorMessage(err, response && response.errors);
    
                                if (msg) {
                                    reject(msg);
                                    console.error(msg);
                                    return;
                                }
    
                                resolve()
                            }, {
                                method: 'post',
                                fields: {
                                    publisherId: tool.roomStream.fields.publisherId,
                                    streamName: tool.roomStream.fields.name,
                                    videoSlots: parseInt(videoNumInput.value),
                                    audioSlots: parseInt(audioNumInput.value),
                                    timeToTalk: parseInt(timeToTalkInput.value) * 1000,
                                    timeToEnd: parseInt(timeToEndInput.value) * 1000,
                                }
                            });
                        });
                    });

                    return formContainer;
                }

            },
            updateInputValues: function () {
                var tool = this;
                let limits = tool.roomStream.getAttribute('limits');
                if(limits && limits.active) {
                    tool.formInputs.videoSlots.disabled = false;
                    tool.formInputs.audioSlots.disabled = false;
                    tool.formInputs.timeToSpeak.disabled = false;
                    tool.formInputs.timeToEnd.disabled = false;
                    tool.limitsToggleCheckbox.checked = true;
                    tool.formInputs.videoSlots.value = limits.video;
                    tool.formInputs.audioSlots.value = limits.audio;
                    tool.formInputs.timeToSpeak.value = limits.minimalTimeOfUsingSlot ? limits.minimalTimeOfUsingSlot / 1000 : 0;
                    tool.formInputs.timeToEnd.value = limits.timeBeforeForceUserToDisconnect ? limits.timeBeforeForceUserToDisconnect / 1000 : 0;
                } else {
                    tool.limitsToggleCheckbox.checked = false;
                    tool.formInputs.videoSlots.disabled = true;
                    tool.formInputs.audioSlots.disabled = true;
                    tool.formInputs.timeToSpeak.disabled = true;
                    tool.formInputs.timeToEnd.disabled = true;
                }
            }
        }
    );

})(window.jQuery, window);