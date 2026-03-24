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
                this.button.classList.add('Media_webrtc_video_list_item_active');
                this.isActive = true;
            } else {
                this.button.classList.remove('Media_webrtc_video_list_item_active');
                this.isActive = false;
            }
        };
        this.show = function () {
            this.button.classList.remove('webrtc-video-hidden');
            this.setActive(false);
        };
        this.hide = function () {
            this.button.classList.add('webrtc-video-hidden');
        };
        this.remove = function () {
            this.button.remove();
        };

        var radioBtnItemCon = this.button = document.createElement('DIV');
        radioBtnItemCon.className = 'Media_webrtc_video_list_item';
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
        radioBtnItem.className = 'Media_webrtc_video_list_item_btn';
        radioBtnItemCon.appendChild(radioBtnItem);


        var checkmark = document.createElement('DIV');
        checkmark.className = 'Media_webrtc_video_list_item_checkmark';
        //checkmark.innerHTML = data.icon;
        radioBtnItem.appendChild(checkmark);
        
        var textLabelCon = this.textEl = document.createElement('DIV');
        textLabelCon.className = 'Media_webrtc_video_list_item_text';
        radioBtnItem.appendChild(textLabelCon);
        var textLabel = document.createTextNode(data.label);
        textLabelCon.appendChild(textLabel);

        //radioBtnItem.addEventListener('mouseup', this.handler);
        addTapHandler(radioBtnItem, this.handler);

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
        log = Q.Media.WebRTCdebugger.createLogMethod('video.js')
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
    Q.Tool.define("Media/webrtc/video2", function (options) {
        var tool = this;
        tool.text = Q.Text.collection[Q.Text.language]['Media/content'];

        tool.videoinputListEl = null;
        tool.cameraListButtons = new Map([]);

        tool.isPending = false;
        tool.activeItem = null;

        Q.addStylesheet('{{Media}}/css/tools/video2.css?ts=' + performance.now(), function () {

        });
        if(options.initStream) {
            tool.state.currentStream = options.initStream;
        }
        tool.createList();
        tool.loadCamerasList();
        navigator.mediaDevices.addEventListener("devicechange", function() {
            tool.loadCamerasList();
        });
    },

        {
            onRefresh: new Q.Event(),
            onStream: new Q.Event(),
            initStream: null,
            currentStream: null,
            getUserMediaOnChange: true,
        },

        {
            createList: function () {
                var tool = this;

                var selectedVideoDevice = document.createElement('DIV');
                selectedVideoDevice.className = 'Media_webrtc_video_select';
                tool.element.appendChild(selectedVideoDevice);
                var selectedVideoDeviceTitle = tool.selectDropdownSelected = document.createElement('DIV');
                selectedVideoDeviceTitle.className = 'Media_webrtc_video_select_title';
                selectedVideoDeviceTitle.innerHTML = 'Default camera';
                selectedVideoDevice.appendChild(selectedVideoDeviceTitle);
                var arrow = document.createElement('DIV');
                arrow.className = 'Media_webrtc_video_select_arrow';
                selectedVideoDevice.appendChild(arrow);

                var videoinputList = document.createElement('DIV');
                videoinputList.className = 'Media_webrtc_video_list';
                tool.videoinputListEl = videoinputList;

                Q.activate(
                    Q.Tool.setUpElement(
                        selectedVideoDevice,
                        "Media/webrtc/popupDialog",
                        {
                            content: tool.videoinputListEl,
                            className: 'Media_webrtc_video_device_popup',
                            triggerOn: 'lmb',
                            showArrow: false,
                            xPositionsOrder: ['right', 'middle', 'left'],
                            yPositionsOrder: ['above', 'below', 'middle', 'belowStartOfButton', 'aboveStartOfButton'],
                            onStateChanged: function (isActive) {
                                if(isActive) {
                                    selectedVideoDevice.classList.add('Media_webrtc_video_select_active');
                                } else {
                                    selectedVideoDevice.classList.remove('Media_webrtc_video_select_active');
                                }
                            }
                        }
                    ),
                    {},
                    function () {
                        tool.dropDownPopup = this;
                    }
                );

                return videoinputList;
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
                    if (tool.videoinputListEl) {
                        tool.videoinputListEl.classList.add('Q_working');
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
                    if (tool.videoinputListEl) {
                        tool.videoinputListEl.classList.remove('Q_working');
                    }
                }
            },
            stopCurrentStream: function () {
                var tool = this;
                if(!tool.state.currentStream) return;
                let tracks = tool.state.currentStream.getVideoTracks();
                for(let i in tracks) {
                    tracks[i].stop();
                    //tool.state.initStream may contain both audio and video tracks so we need to remove "ended" tracks from the active stream as this stream will be used by WebRTC app later
                    tool.state.currentStream.removeTrack(tracks[i]);
                }
                tool.state.currentStream = null;
            },
            toggleButton: function (button) {
                var tool = this;
                if(tool.activeItem) {
                    tool.activeItem.setActive(false);
                }
                button.setActive(true);
                tool.selectDropdownSelected.innerHTML = button.label;
                tool.activeItem = button;
            },
            requestSelectedCamera: function () {
                var tool = this;
                //if preparing dialog was just loaded with no selected device, request just default video device without specifying deviceId
                if (!tool.activeItem) {
                    //some Android phones doesn't allow to get stream from the camera if stream from another camera is active (throws "NotReadableError: Could not start video source")
                    //so we need to stop old stream BEFORE requesting the new one
                    tool.stopCurrentStream(); 
                    tool.getCameraStream({}).then(function (videoStream) {
                        
                        tool.setPending(false);

                        tool.state.currentStream = videoStream;

                        tool.hasMediaPermissions().then(function (granted) {
                            if (granted) {
                                tool.loadCamerasList();
                            }
                        })
                        Q.handle(tool.state.onStream, tool, [videoStream]);
                    }).catch(function (error) {
                        console.error(error);
                        tool.setPending(false);

                        if (_isiOSCordova) Q.Media.WebRTC.showIosPermissionsInstructions('Camera');
                        if (error.name == 'NotAllowedError' || error.name == 'MediaStreamError') {
                            Q.Media.WebRTC.showBrowserPermissionsInstructions('camera');
                        } else {
                            Q.alert(Q.getObject("webrtc.notices.cameraStartError", tool.text));
                        }
                    });
                    return;
                }
                tool.activeItem.handler();
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
            loadCamerasList: function () {
                var tool = this;
                if(tool.pendingDevicesUpdate) {
                    tool.queueDevicesUpdate = true;
                    return;
                }
                tool.pendingDevicesUpdate = true;
                tool.clearCameraList();
                tool.getDevicesList().then(function (e) {
                    const videoInputDevices = e.videoInputDevices
                    const fullInfoGranted = e.granted
                    videoInputDevices.forEach(function (mediaDevice, index) {
                        let label = mediaDevice.label;
                        let cameraItem = new ButtonInstance({
                            className: 'Media_webrtc_video_camera_item',
                            label: label || `Camera ${index + 1}`,
                            type: 'camera',
                            deviceId: mediaDevice.deviceId,
                            handler: async function (e) {
                                if(e) e.preventDefault();
                                if(e) e.stopPropagation();
                                if(tool.isPending) {
                                    return;
                                }

                                const btnInstance = this;
                                const radioBtnItem = btnInstance.button;
                                if(tool.dropDownPopup) tool.dropDownPopup.hide();

                                if(!tool.state.getUserMediaOnChange) {
                                    tool.stopCurrentStream();
                                    tool.toggleButton(btnInstance);
                                    return;
                                }

                                tool.setPending(true, [radioBtnItem]);

                                //some Android phones doesn't allow to get stream from the camera if stream from another camera is active (throws "NotReadableError: Could not start video source")
                                //so we need to stop old stream BEFORE requesting the new one
                                tool.stopCurrentStream();
                                tool.getCameraStream({ deviceId: mediaDevice.deviceId }).then(function (videoStream) {
                                    tool.toggleButton(btnInstance);
                                    tool.setPending(false, [radioBtnItem]);
                                    
                                    tool.state.currentStream = videoStream;

                                    tool.hasMediaPermissions().then(function (granted) {
                                        if(granted) {
                                            tool.loadCamerasList();
                                        }
                                    })
                                    Q.handle(tool.state.onStream, tool, [videoStream]);
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
                            let currentTrack = tool.state.currentStream.getVideoTracks()[0];
                            var settings = currentTrack.getSettings();
                            if(settings.deviceId == cameraItem.deviceId) {
                                tool.toggleButton(cameraItem);
                            }
                        }
                        tool.videoinputListEl.insertBefore(cameraItem.button, tool.videoinputListEl.firstChild);
                        tool.cameraListButtons.set(cameraItem.deviceId, cameraItem);
                    });
                    tool.pendingDevicesUpdate = false;
                    if(tool.queueDevicesUpdate) {
                        tool.queueDevicesUpdate = false;
                        tool.loadCamerasList();
                    }
                })
            },
            getCameraStream: function (camera) {

                var constraints
                if (camera != null && camera.deviceId != null && camera.deviceId != '') {
                    constraints = { deviceId: { exact: camera.deviceId } };
                    if (typeof cordova != 'undefined' && _isiOS && options.useCordovaPlugins) {
                        constraints = { deviceId: camera.deviceId }
                    }
                } else if (camera != null && camera.groupId != null && camera.groupId != '') {
                    constraints = { groupId: { exact: camera.groupId } };
                    if (typeof cordova != 'undefined' && _isiOS && options.useCordovaPlugins) {
                        constraints = { groupId: camera.groupId }
                    }
                } else {
                    constraints = true;
                }

                return navigator.mediaDevices.getUserMedia({
                    'audio': false,
                    'video': constraints
                })
            },
            clearCameraList: function () {
                var tool = this;
                tool.cameraListButtons.clear();
                tool.videoinputListEl.innerHTML = '';
            },
            getDevicesList: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    tool.hasMediaPermissions().then(function (granted) {
                        let videoInputDevices = [];

                        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                            navigator.mediaDevices.enumerateDevices().then(function (mediaDevicesList) {
                                for (let i in mediaDevicesList) {
                                    let device = mediaDevicesList[i];
                                    if (device.kind.indexOf('video') != -1) {
                                        videoInputDevices.push(device);
                                    }
                                }

                                resolve({videoInputDevices: videoInputDevices, granted: granted});
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
            }
        }

    );

})(window.jQuery, window);