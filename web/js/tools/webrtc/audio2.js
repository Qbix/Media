(function ($, window, undefined) {
    function addTapHandler(element, callback) {
        let startX = 0;
        let startY = 0;
        let startTime = 0;

        const maxTime = 250;     // max duration for a "tap" (ms)
        const maxMove = 10;      // max movement allowed (px)

        if (Q.info.isTouchscreen) {
            element.addEventListener("touchstart", function (e) {
                const touch = e.changedTouches[0];
                startX = touch.clientX;
                startY = touch.clientY;
                startTime = Date.now();
            });

            element.addEventListener("touchend", function (e) {
                const touch = e.changedTouches[0];
                const dx = touch.clientX - startX;
                const dy = touch.clientY - startY;
                const dt = Date.now() - startTime;

                if (dt < maxTime && Math.abs(dx) < maxMove && Math.abs(dy) < maxMove) {
                    callback(e);
                }
                e.preventDefault();
                e.stopPropagation();
            });
        } else {
            element.addEventListener("click", callback);
        }
    }
    var ButtonInstance = function (data) {
        this.button = null;
        this.buttonInner = null;
        this.textEl = null;
        this.label = data.label;
        this.type = data.type;
        this.isActive = false;
        this.deviceId = data.deviceId;
        this.handler = data.handler.bind(this);
        this.setActive = function (state) {
            if (state) {
                this.button.classList.add('Media_webrtc_audio_list_item_active');
                this.isActive = true;
            } else {
                this.button.classList.remove('Media_webrtc_audio_list_item_active');
                this.isActive = false;
            }
        };
        this.show = function () {
            this.button.classList.remove('webrtc-audio-hidden');
            this.setActive(false);
        };
        this.hide = function () {
            this.button.classList.add('webrtc-audio-hidden');
        };
        this.remove = function () {
            this.button.remove();
        };

        var radioBtnItemCon = this.button = document.createElement('DIV');
        radioBtnItemCon.className = 'Media_webrtc_audio_list_item';
        if (data.deviceId) {
            radioBtnItemCon.dataset.deviceId = data.deviceId;
        }
        if (data.className) {
            let classes = (data.className).split(' ');
            for (let i in classes) {
                radioBtnItemCon.classList.add(classes[i]);
            }
        }

        var radioBtnItem = this.buttonInner = document.createElement('DIV');
        radioBtnItem.className = 'Media_webrtc_audio_list_item_btn';
        radioBtnItemCon.appendChild(radioBtnItem);


        var checkmark = document.createElement('DIV');
        checkmark.className = 'Media_webrtc_audio_list_item_checkmark';
        //checkmark.innerHTML = data.icon;
        radioBtnItem.appendChild(checkmark);
        
        var textLabelCon = this.textEl = document.createElement('DIV');
        textLabelCon.className = 'Media_webrtc_audio_list_item_text';
        radioBtnItem.appendChild(textLabelCon);
        var textLabel = document.createTextNode(data.label);
        textLabelCon.appendChild(textLabel);

        addTapHandler(radioBtnItem, this.handler);
        //radioBtnItem.addEventListener('click', this.handler);
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

    function log() { }
    if (Q.Media.WebRTCdebugger) {
        log = Q.Media.WebRTCdebugger.createLogMethod('audio.js')
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
    Q.Tool.define("Media/webrtc/audio2", function (options) {
        var tool = this;
        tool.text = Q.Text.collection[Q.Text.language]['Media/content'];

        tool.firstTimeLoaded = false;
        tool.audioinputListEl = null;
        tool.audiooutputListEl = null;
        tool.inputListButtons = new Map([]);
        tool.outputListButtons = new Map([]);

        tool.isPending = false;
        tool.audioInputDevices = [];
        tool.activeInputItem = null;
        tool.activeOutputItem = null;

        if(options.initStream) {
            tool.state.currentStream = options.initStream;
        }

        Q.addStylesheet('{{Media}}/css/tools/audio2.css?ts=' + performance.now(), function () {

        });

        tool.createList();
        tool.loadDevicesList();
        navigator.mediaDevices.addEventListener("devicechange", function() {
            tool.loadDevicesList();
        });
    },

        {
            onRefresh: new Q.Event(),
            onStream: new Q.Event(),
            initStream: null,
            currentStream: null,
            getUserMediaOnChange: false,
        },

        {
            createList: function () {
                var tool = this;

                var selectedAudioDevice = document.createElement('DIV');
                selectedAudioDevice.className = 'Media_webrtc_audio_select';
                tool.element.appendChild(selectedAudioDevice);

                var selectedAudioDeviceText = tool.selectDropdownSelected = document.createElement('DIV');
                selectedAudioDeviceText.className = 'Media_webrtc_audio_select_title';
                selectedAudioDeviceText.innerHTML = 'Default microphone';
                selectedAudioDevice.appendChild(selectedAudioDeviceText);
                var arrow = document.createElement('DIV');
                arrow.className = 'Media_webrtc_audio_select_arrow';
                selectedAudioDevice.appendChild(arrow);

                console.log('tool.audioTool', tool.audioTool)

                var audioDevicesContainer = document.createElement('DIV');
                audioDevicesContainer.className = 'Media_webrtc_audio_devices';
                var audioinputListTitle = document.createElement('DIV');
                audioinputListTitle.className = 'Media_webrtc_audio_list_title';
                audioinputListTitle.innerHTML = 'Select a microphone';
                audioDevicesContainer.appendChild(audioinputListTitle);
                var audioinputList = document.createElement('DIV');
                audioinputList.className = 'Media_webrtc_audio_list Media_webrtc_audioinput_list';
                audioDevicesContainer.appendChild(audioinputList);
                tool.audioinputListEl = audioinputList;
                var audiooutputListTitle = document.createElement('DIV');
                audiooutputListTitle.className = 'Media_webrtc_audio_list_title';
                audiooutputListTitle.innerHTML = 'Select a speaker';
                audioDevicesContainer.appendChild(audiooutputListTitle);
                var audiooutputList = document.createElement('DIV');
                audiooutputList.className = 'Media_webrtc_audio_list Media_webrtc_audiooutput_list';
                audioDevicesContainer.appendChild(audiooutputList);
                tool.audiooutputListEl = audiooutputList;

                Q.activate(
                    Q.Tool.setUpElement(
                        selectedAudioDevice,
                        "Media/webrtc/popupDialog",
                        {
                            content: audioDevicesContainer,
                            className: 'Media_webrtc_audio_device_popup',
                            triggerOn: 'lmb',
                            showArrow: false,
                            xPositionsOrder: ['right', 'middle', 'left'],
                            yPositionsOrder: ['below', 'above', 'middle', 'belowStartOfButton', 'aboveStartOfButton'],
                            onStateChanged: function (isActive) {
                                if(isActive) {
                                    selectedAudioDevice.classList.add('Media_webrtc_audio_select_active');
                                } else {
                                    selectedAudioDevice.classList.remove('Media_webrtc_audio_select_active');
                                }
                            }
                        }
                    ),
                    {},
                    function () {
                        tool.dropDownPopup = this;
                    }
                );

                return audioinputList;
            },
            setPending: function (state, elements) {
                var tool = this;
                tool.isPending = state;
                if (state) {
                    if (elements) {
                        elements.map(function (element) {
                            element.classList.add('Q_working');
                        })
                    }
                   
                    if (tool.selectDropdownSelected) {
                        tool.selectDropdownSelected.classList.add('Q_working');
                    }
                    if (tool.audioinputListEl) {
                        tool.audioinputListEl.classList.add('Q_working');
                    }
                } else {
                    if (elements) {
                        elements.map(function (element) {
                            element.classList.remove('Q_working');
                        })
                    }
                   
                    if (tool.selectDropdownSelected) {
                        tool.selectDropdownSelected.classList.remove('Q_working');
                    }
                    if (tool.audioinputListEl) {
                        tool.audioinputListEl.classList.remove('Q_working');
                    }
                }
            },
            stopCurrentStream: function () {
                var tool = this;
                if(!tool.state.currentStream) return;
                let tracks = tool.state.currentStream.getAudioTracks();
                for(let i in tracks) {
                    tracks[i].stop();
                }
                tool.state.currentStream = null;
            },
            toggleInputOption: function (button) {
                var tool = this;
                if(tool.activeInputItem) {
                    tool.activeInputItem.setActive(false);
                }
                button.setActive(true);
                tool.selectDropdownSelected.innerHTML = button.label;
                tool.activeInputItem = button;
            },
            toggleOutputOption: function (button) {
                var tool = this;
                if(tool.activeOutputItem) {
                    tool.activeOutputItem.setActive(false);
                }
                button.setActive(true);
                tool.selectDropdownSelected.innerHTML = button.label;
                tool.activeOutputItem = button;
            },
            requestSelectedAudioinput: function () {
                var tool = this;

                //if preparing dialog was just loaded with no selected device, request just default video device without specifying deviceId
                if (!tool.activeInputItem) {
                    tool.stopCurrentStream(); //just in case (if there is tool.state.initStream)
                    tool.getAudioStream({ }).then(function (audioStream) {
                        tool.setPending(false);
                        tool.state.currentStream = audioStream;
                        tool.hasMediaPermissions().then(function (granted) {
                            if (granted) {
                                tool.loadDevicesList();
                            }
                        })
                        Q.handle(tool.state.onStream, tool, [audioStream]);
                    }).catch(function (error) {
                        console.error(error);
                        tool.setPending(false);

                        if (_isiOSCordova) Q.Media.WebRTC.showIosPermissionsInstructions('Camera');
                        if (e.name == 'NotAllowedError' || e.name == 'MediaStreamError') {
                            Q.Media.WebRTC.showBrowserPermissionsInstructions('camera');
                        } else {
                            Q.alert(Q.getObject("webrtc.notices.cameraStartError", tool.text));
                        }
                    });
                    return;
                }
                tool.activeInputItem.handler();
            },
            hasMediaPermissions: function () {
                // 1. Try Permissions API
                if (navigator.permissions) {
                    return Promise.all([
                        navigator.permissions.query({ name: "camera" }),
                        navigator.permissions.query({ name: "microphone" })
                    ])
                        .then(function (results) {
                            var cam = results[0];
                            var mic = results[1];

                            if (cam.state === "granted" || mic.state === "granted") {
                                return true;
                            }

                            return false;
                        })
                        .catch(function () {
                            return navigator.mediaDevices.enumerateDevices().then(function (devices) {
                                return devices.some(function (d) { return d.label; });
                            });
                        });
                }

                // 2. No Permissions API → fallback
                return navigator.mediaDevices.enumerateDevices().then(function (devices) {
                    return devices.some(function (d) { return d.label; });
                });
            },
            loadDevicesList: function () {
                var tool = this;
                log('contros: loadDevicesList')
                if(tool.pendingDevicesUpdate) {
                    tool.queueDevicesUpdate = true;
                    return;
                }
                tool.pendingDevicesUpdate = true;
                tool.clearInputList();
               
                tool.getDevicesList().then(function (e) {
                    const audioInputDevices = e.audioInputDevices
                    const audioOutputDevices = e.audioOutputDevices
                    const fullInfoGranted = e.granted
                    console.log('audioInputDevices', audioInputDevices, fullInfoGranted)
                    audioInputDevices.forEach(function (mediaDevice, index) {
                        let label = mediaDevice.label;
                        console.log('mediaDevice.label', mediaDevice.label)

                        let inputItem = new ButtonInstance({
                            className: 'Media_webrtc_audio_input_item',
                            label: label || `Audio input ${index + 1}`,
                            type: 'input',
                            deviceId: mediaDevice.deviceId,
                            handler: async function (e) {
                                if(e) e.preventDefault();
                                if(e) e.stopPropagation();
                                if(tool.isPending) {
                                    return;
                                }
                                const cam = await navigator.permissions.query({ name: "camera" });

                                const btnInstance = this;
                                const radioBtnItem = btnInstance.button;
                                if(tool.dropDownPopup) tool.dropDownPopup.hide();

                                if(!tool.state.getUserMediaOnChange) {
                                    tool.stopCurrentStream();
                                    tool.toggleInputOption(btnInstance);
                                    return;
                                }

                                tool.setPending(true, [radioBtnItem]);

                                //some Android phones doesn't allow to get stream from the camera if stream from another camera is active (throws "NotReadableError: Could not start video source")
                                //so we need to stop old stream BEFORE requesting the new one (did not test if this error occurs when requesting audio, so this is just in case)
                                tool.stopCurrentStream();
                                tool.getAudioStream({ deviceId: mediaDevice.deviceId }).then(function (audioStream) {
                                    tool.toggleInputOption(btnInstance);
                                    tool.setPending(false, [radioBtnItem]);
                                    
                                    tool.state.currentStream = audioStream;

                                    tool.hasMediaPermissions().then(function (granted) {
                                        if(granted) {
                                            tool.loadDevicesList();
                                        }
                                    })
                                    Q.handle(tool.state.onStream, tool, [audioStream]);
                                }).catch(function (error) {
                                    console.error(error);
                                    tool.setPending(false, [radioBtnItem]);

                                    if (_isiOSCordova) Q.Media.WebRTC.showIosPermissionsInstructions('Camera');
                                    if (e.name == 'NotAllowedError' || e.name == 'MediaStreamError') {
                                        Q.Media.WebRTC.showBrowserPermissionsInstructions('camera');
                                    } else {
                                        Q.alert(Q.getObject("webrtc.notices.cameraStartError", tool.text));
                                    }
                                });
                            }
                        });
                        if (tool.state.currentStream) {
                            let currentTrack = tool.state.currentStream.getAudioTracks()[0];
                            var settings = currentTrack.getSettings();
                            if(settings.deviceId == inputItem.deviceId) {
                                tool.toggleInputOption(inputItem);
                            }
                        }
                        tool.audioinputListEl.insertBefore(inputItem.button, tool.audioinputListEl.firstChild);
                        tool.inputListButtons.set(inputItem.deviceId ?? Date.now().toString(36) + Math.random().toString(36).replace(/\./g, ""), inputItem);
                    });
                    audioOutputDevices.forEach(function (mediaDevice, index) {
                        let label = mediaDevice.label;

                        let item = new ButtonInstance({
                            className: 'Media_webrtc_audio_input_item',
                            label: label || `Audio output ${index + 1}`,
                            type: 'output',
                            deviceId: mediaDevice.deviceId,
                            handler: async function (e) {
                                if(e) e.preventDefault();
                                if(e) e.stopPropagation();
                                const btnInstance = this;
                                const radioBtnItem = btnInstance.button;
                                if (tool.dropDownPopup) tool.dropDownPopup.hide();
                                tool.toggleOutputOption(btnInstance);
                                return;

                            }
                        });
                       
                        tool.audiooutputListEl.insertBefore(item.button, tool.audiooutputListEl.firstChild);
                        tool.outputListButtons.set(item.deviceId ?? Date.now().toString(36) + Math.random().toString(36).replace(/\./g, ""), item);
                    });

                    tool.pendingDevicesUpdate = false;
                    if(tool.queueDevicesUpdate) {
                        tool.queueDevicesUpdate = false;
                        tool.loadDevicesList();
                    }
                })
            },
            getAudioStream: function (device) {

                var constraints
                if (device != null && device.deviceId != null && device.deviceId != '') {
                    constraints = { deviceId: { exact: device.deviceId } };
                    if (typeof cordova != 'undefined' && _isiOS && options.useCordovaPlugins) {
                        constraints = { deviceId: device.deviceId }
                    }
                } else if (device != null && device.groupId != null && device.groupId != '') {
                    constraints = { groupId: { exact: device.groupId } };
                    if (typeof cordova != 'undefined' && _isiOS && options.useCordovaPlugins) {
                        constraints = { groupId: device.groupId }
                    }
                } else {
                    constraints = true;
                }

                return navigator.mediaDevices.getUserMedia({
                    'audio': constraints
                })
            },
            clearInputList: function () {
                var tool = this;
                tool.inputListButtons.clear();
                tool.audioinputListEl.innerHTML = '';
            },
            getDevicesList: function () {
                log('getDevicesList');
                var tool = this;
                return new Promise(function (resolve, reject) {
                    tool.hasMediaPermissions().then(function (granted) {
                        let audioInputDevices = [];
                        let audioOutputDevices = [];

                        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                            navigator.mediaDevices.enumerateDevices().then(function (mediaDevicesList) {
                                console.log('mediaDevicesList', mediaDevicesList)
                                for (let i in mediaDevicesList) {
                                    let device = mediaDevicesList[i];
                                    if (device.kind == 'audioinput') {
                                        audioInputDevices.push(device);
                                    }
                                    if (device.kind == 'audiooutput') {
                                        audioOutputDevices.push(device);
                                    }
                                }

                                resolve({audioInputDevices: audioInputDevices, audioOutputDevices: audioOutputDevices, granted: granted});
                            }).catch(function (error) {
                                console.error('ERROR: cannot get device info', error);
                                reject(error);
                            });
                        } else {
                            reject('enumerateDevices is not supported');
                        }
                    }).catch(function (error) {
                        console.error(error);
                        reject(error);
                    });

                });
            },
            refresh: function () {
                
            }
        }

    );

})(window.jQuery, window);