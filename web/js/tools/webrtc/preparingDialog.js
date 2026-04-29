(function ($, window, undefined) {

    var _icons = {
        micSVG: '<svg class="microphone-icon" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px"    y="0px" viewBox="-0.165 -0.245 99.499 99.498"    enable-background="new -0.165 -0.245 99.499 99.498" xml:space="preserve">  <path fill="#FFFFFF" d="M49.584-0.245c-27.431,0-49.749,22.317-49.749,49.749c0,27.432,22.317,49.749,49.749,49.749   c27.432,0,49.75-22.317,49.75-49.749C99.334,22.073,77.016-0.245,49.584-0.245z M41.061,32.316c0-4.655,3.775-8.43,8.431-8.43   c4.657,0,8.43,3.774,8.43,8.43v19.861c0,4.655-3.773,8.431-8.43,8.431c-4.656,0-8.431-3.775-8.431-8.431V32.316z M63.928,52.576   c0,7.32-5.482,13.482-12.754,14.336v5.408h6.748v3.363h-16.86V72.32h6.749v-5.408c-7.271-0.854-12.753-7.016-12.754-14.336v-10.33   h3.362v10.125c0,6.115,4.958,11.073,11.073,11.073c6.116,0,11.073-4.958,11.073-11.073V42.246h3.363V52.576z"/>  </svg>',
        disabledMicSVG: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"    viewBox="0.049 -0.245 99.499 99.498" enable-background="new 0.049 -0.245 99.499 99.498"    xml:space="preserve">  <path fill="#FFFFFF" d="M49.797,99.253c-27.431,0-49.749-22.317-49.749-49.749c0-27.431,22.317-49.749,49.749-49.749   c27.432,0,49.75,22.317,49.75,49.749C99.548,76.936,77.229,99.253,49.797,99.253z M49.797,3.805   c-25.198,0-45.698,20.5-45.698,45.699s20.5,45.699,45.698,45.699c25.2,0,45.7-20.501,45.7-45.699S74.997,3.805,49.797,3.805z"/>  <path fill="#FFFFFF" d="M49.798,60.607c4.657,0,8.43-3.775,8.43-8.431v-8.634L44.893,59.024   C46.276,60.017,47.966,60.607,49.798,60.607z"/>  <path fill="#FFFFFF" d="M58.229,32.316c0-4.656-3.773-8.43-8.43-8.43c-4.656,0-8.43,3.775-8.431,8.43v19.861   c0,0.068,0.009,0.135,0.01,0.202l16.851-19.563V32.316z"/>  <path fill="#FFFFFF" d="M48.117,66.912v5.408h-6.749v3.363h16.86V72.32h-6.748v-5.408c7.271-0.854,12.754-7.016,12.754-14.336   v-10.33H60.87v10.125c0,6.115-4.957,11.073-11.072,11.073c-2.537,0-4.867-0.862-6.733-2.297l-2.305,2.675   C42.813,65.475,45.331,66.585,48.117,66.912z"/>  <path fill="#FFFFFF" d="M38.725,52.371V42.246h-3.362v10.33c0,1.945,0.397,3.803,1.102,5.507l2.603-3.022   C38.852,54.198,38.725,53.301,38.725,52.371z"/>  <rect x="47.798" y="11.385" transform="matrix(0.7578 0.6525 -0.6525 0.7578 43.3634 -20.8757)" fill="#C12337" width="4" height="73.163"/>  </svg>',
        cameraSVG: '<svg version="1.1"    xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:a="http://ns.adobe.com/AdobeSVGViewerExtensions/3.0/"    x="0px" y="0px" width="101px" height="101px" viewBox="-0.335 -0.255 101 101" enable-background="new -0.335 -0.255 101 101"    xml:space="preserve">  <defs>  </defs>  <path opacity="0.2" d="M50,2.5C23.809,2.5,2.5,23.808,2.5,50S23.808,97.499,50,97.499c26.191,0,47.5-21.308,47.5-47.499   C97.5,23.809,76.19,2.5,50,2.5z"/>  <path fill="#FFFFFF" d="M50,0C22.431,0,0,22.43,0,50c0,27.57,22.429,49.999,50,49.999c27.57,0,50-22.429,50-49.999   C100,22.431,77.569,0,50,0z M77.71,61.245l-15.599-9.006v8.553H25.516V37.254h36.595v8.839l15.599-9.006V61.245z"/>  </svg>',
        disabledCameraSVG: '<svg  version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"    viewBox="-0.165 -0.245 99.499 99.498" enable-background="new -0.165 -0.245 99.499 99.498"    xml:space="preserve">  <path fill="#FFFFFF" d="M49.584-0.245c-27.431,0-49.749,22.317-49.749,49.749c0,27.432,22.317,49.749,49.749,49.749   c27.432,0,49.75-22.317,49.75-49.749C99.334,22.073,77.016-0.245,49.584-0.245z M49.584,95.203   c-25.198,0-45.698-20.501-45.698-45.699s20.5-45.699,45.698-45.699c25.199,0,45.699,20.5,45.699,45.699S74.783,95.203,49.584,95.203   z"/>  <polygon fill="#FFFFFF" points="61.635,39.34 43.63,60.242 61.635,60.242 61.635,51.732 77.156,60.693 77.156,36.656 61.635,45.617    "/>  <polygon fill="#FFFFFF" points="25.223,36.822 25.223,60.242 34.391,60.242 54.564,36.822 "/>  <rect x="47.585" y="11.385" transform="matrix(0.7578 0.6525 -0.6525 0.7578 43.3117 -20.7363)" fill="#C12337" width="4" height="73.163"/>  </svg>',
        screenSharingSVG: '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"  width="100px" height="100px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"> <path fill="#FFFFFF" d="M50.072,0.054c-27.57,0-49.999,22.429-49.999,50c0,27.57,22.429,50,49.999,50  c27.571,0,50.001-22.43,50.001-50C100.073,22.484,77.644,0.054,50.072,0.054z M76.879,63.696H53.705v5.222h5.457v3.77H40.987v-3.77  h5.458v-5.222H23.268V31.439H76.88L76.879,63.696L76.879,63.696z"/> </svg>',
        disabledScreenSharingSVG: '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"  width="100px" height="100px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"> <path fill="#FFFFFF" d="M50.172,100.346C22.508,100.346,0,77.838,0,50.172C0,22.508,22.508,0,50.172,0  c27.666,0,50.173,22.508,50.173,50.172C100.346,77.838,77.839,100.346,50.172,100.346z M50.172,4.084  C24.76,4.084,4.084,24.76,4.084,50.172c0,25.414,20.675,46.088,46.088,46.088c25.414,0,46.088-20.675,46.088-46.088  C96.261,24.76,75.586,4.084,50.172,4.084z"/> <g>  <polygon fill="#FCFCFC" points="60.309,31.439 23.268,31.439 23.268,63.696 32.533,63.696 "/>  <polygon fill="#FCFCFC" points="68.252,31.439 40.478,63.696 46.444,63.696 46.444,68.918 40.987,68.918 40.987,72.688   59.162,72.688 59.162,68.918 53.705,68.918 53.705,63.696 76.879,63.696 76.88,63.696 76.88,31.439 "/> </g> <rect x="47.83" y="11.444" transform="matrix(-0.7577 -0.6526 0.6526 -0.7577 56.1462 117.2643)" fill="#C12337" width="4.02" height="73.532"/> </svg>',
        userSVG: '<svg version="1.1" id="Слой_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"  width="100px" height="100px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"> <path d="M65.904,52.834c-4.734,3.725-10.695,5.955-17.172,5.955c-6.316,0-12.146-2.119-16.821-5.68C16.654,55.575,5,68.803,5,84.757  c0,11.78,14.356,10.197,32.065,10.197h25.869C80.643,94.954,95,97,95,84.757C95,68.051,82.221,54.333,65.904,52.834z"/> <path d="M48.732,55.057c13.286,0,24.092-10.809,24.092-24.095c0-13.285-10.807-24.094-24.092-24.094  c-13.285,0-24.093,10.809-24.093,24.094C24.64,44.248,35.448,55.057,48.732,55.057z"/> </svg>',
        screenSharingSVG: '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"  width="100px" height="100px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"> <path fill="#FFFFFF" d="M50.072,0.054c-27.57,0-49.999,22.429-49.999,50c0,27.57,22.429,50,49.999,50  c27.571,0,50.001-22.43,50.001-50C100.073,22.484,77.644,0.054,50.072,0.054z M76.879,63.696H53.705v5.222h5.457v3.77H40.987v-3.77  h5.458v-5.222H23.268V31.439H76.88L76.879,63.696L76.879,63.696z"/> </svg>',
        disabledScreenSharingSVG: '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"  width="100px" height="100px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"> <path fill="#FFFFFF" d="M50.172,100.346C22.508,100.346,0,77.838,0,50.172C0,22.508,22.508,0,50.172,0  c27.666,0,50.173,22.508,50.173,50.172C100.346,77.838,77.839,100.346,50.172,100.346z M50.172,4.084  C24.76,4.084,4.084,24.76,4.084,50.172c0,25.414,20.675,46.088,46.088,46.088c25.414,0,46.088-20.675,46.088-46.088  C96.261,24.76,75.586,4.084,50.172,4.084z"/> <g>  <polygon fill="#FCFCFC" points="60.309,31.439 23.268,31.439 23.268,63.696 32.533,63.696 "/>  <polygon fill="#FCFCFC" points="68.252,31.439 40.478,63.696 46.444,63.696 46.444,68.918 40.987,68.918 40.987,72.688   59.162,72.688 59.162,68.918 53.705,68.918 53.705,63.696 76.879,63.696 76.88,63.696 76.88,31.439 "/> </g> <rect x="47.83" y="11.444" transform="matrix(-0.7577 -0.6526 0.6526 -0.7577 56.1462 117.2643)" fill="#C12337" width="4.02" height="73.532"/> </svg>'
            
    };

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
        log = Q.Media.WebRTCdebugger.createLogMethod('participants.js')
    }

    function Button(options) {
        this.element = null;
        this.handler = options.handler;
        this.onIcon = options.onIcon;
        this.offIcon = options.offIcon;
        this.setActive = function (state) {
            if (state) {
                switchMicBtn.innerHTML = options.onIcon;
            } else {
                switchMicBtn.innerHTML = options.offIcon;
            }
        };

        const switchMicBtn = this.element = this.element = document.createElement('DIV');
        switchMicBtn.type = 'button';
        switchMicBtn.className = 'Media_webrtc_prep-button';
        if (options.className) {
            switchMicBtn.classList.add(options.className);
        }
        switchMicBtn.innerHTML = options.offIcon;

        switchMicBtn.addEventListener('mouseup', this.handler);

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
    Q.Tool.define("Media/webrtc/preparingDialog", function (options) {
        var tool = this;
        tool.text = Q.Text.collection[Q.Text.language]['Media/content'];

        tool.audioTool = null;
        tool.videoTool = null;

        if (Q.info.isMobile && !Q.info.isCordova) {
            tool.element.classList.add('Media_webrtc_preparing_screen');
        }

        tool.loadStyles().then(function () {
            tool.show();
        })
    },

        {
            onRefresh: new Q.Event(),
            onCancel: new Q.Event(),
            onShow: new Q.Event(),
            canceled: false,
            initAudioStream: null,
            initVideoStream: null,
        },

        {
            loadStyles: function () {
                return new Promise(function (resolve, reject) {
                    Q.addStylesheet('{{Media}}/css/tools/preparingDialog.css?ts=' + Date.now(), function () {
                        resolve();
                    });
                });
            },
            refresh: function () {
                var tool = this;
                tool.refreshList();
            },
            onCancel: function () {
                var tool = this;
                tool.state.canceled = true;
                if (tool.videoTool) tool.videoTool.stopCurrentStream();
                if (tool.audioTool) tool.audioTool.stopCurrentStream();
            },
            show: function (callback, closeCallback) {
                var tool = this;
                var usersAvatar = createAvatarElement();
                var preJoiningAudioOutputDeviceId = tool.state.initAudioOutputDeviceId;
                var preJoiningStreams = tool.preJoiningStreams = {
                    camera: { kind: 'camera', stream: tool.state.initVideoStream, mediaElement: null },
                    audio: { kind: 'audio', stream: tool.state.initAudioStream, mediaElement: null },
                    screen: { kind: 'screen', stream: null, mediaElement: null }
                };

                var mediaDevicesDialog = document.createElement('DIV');
                mediaDevicesDialog.className = 'Media_webrtc_preparing';
                tool.element.appendChild(mediaDevicesDialog);

                var cameraPreviewContainer = document.createElement('DIV');
                cameraPreviewContainer.className = 'Media_webrtc_preparing_camera-preview-con';
                mediaDevicesDialog.appendChild(cameraPreviewContainer);

                var cameraPreview = document.createElement('DIV');
                cameraPreview.className = 'Media_webrtc_preparing_camera-preview';
                cameraPreviewContainer.appendChild(cameraPreview);

                var buttonsCon = document.createElement('DIV');
                buttonsCon.className = 'Media_webrtc_devices_dialog_buttons_con';
                cameraPreviewContainer.appendChild(buttonsCon);

                var buttonsInner = document.createElement('DIV');
                buttonsInner.className = 'Media_webrtc_devices_dialog_buttons_inner_con';
                buttonsCon.appendChild(buttonsInner);

                var deviceChooser = document.createElement('DIV');
                deviceChooser.className = 'Media_preparing_devices';
                mediaDevicesDialog.appendChild(deviceChooser);

                var audioDeviceChooser = document.createElement('DIV');
                audioDeviceChooser.className = 'Media_preparing_devices_audio';
                deviceChooser.appendChild(audioDeviceChooser);
                var selectedAudioDevice = document.createElement('DIV');
                selectedAudioDevice.className = 'Media_preparing_devices_audio_tool';
                audioDeviceChooser.appendChild(selectedAudioDevice);

                var videoDeviceChooser = document.createElement('DIV');
                videoDeviceChooser.className = 'Media_preparing_devices_video';
                deviceChooser.appendChild(videoDeviceChooser);
                var selectedVideoDevice = document.createElement('DIV');
                selectedVideoDevice.className = 'Media_preparing_devices_video_tool';
                videoDeviceChooser.appendChild(selectedVideoDevice);

                if (tool.state.showMicrophone !== false) {
                    tool.microphoneButton = new Button({
                        className: 'Media_webrtc_prep-switch-mic',
                        onIcon: _icons.micSVG,
                        offIcon: _icons.disabledMicSVG,
                        handler: function () {
                            if (tool.audioTool.isPending) return;
                            if (preJoiningStreams.audio != null && preJoiningStreams.audio.stream != null) {
                                tool.audioTool.stopCurrentStream();
                                tool.audioTool.state.getUserMediaOnChange = false;
                                if (preJoiningStreams.audio.mediaElement) preJoiningStreams.audio.mediaElement.remove();
                                tool.microphoneButton.setActive(false);
                                preJoiningStreams.audio.stream = null;
                            } else {
                                tool.microphoneButton.element.classList.add('Q_working');

                                tool.audioTool.state.getUserMediaOnChange = true;
                                tool.audioTool.requestSelectedAudioinput();
                            }
                        }
                    });
                    buttonsInner.appendChild(tool.microphoneButton.element);

                    if(preJoiningStreams.audio.stream) {
                        tool.microphoneButton.setActive(true);
                    }

                    Q.activate(
                        Q.Tool.setUpElement(
                            'DIV',
                            "Media/webrtc/audio2",
                            {
                                initAudioOutputDeviceId: tool.state.initAudioOutputDeviceId,
                                initStream: tool.state.initAudioStream,
                                onStream: function (stream) {
                                    if(tool.state.canceled) {
                                         tool.audioTool.stopCurrentStream();
                                        return;
                                    }
                                    tool.microphoneButton.element.classList.remove('Q_working');
                                    preJoiningStreams.audio.stream = stream;
                                    tool.microphoneButton.setActive(true);
                                },
                                onAudioOutputChange : function (deviceId) {
                                    preJoiningAudioOutputDeviceId = deviceId;
                                }
                            }
                        ),
                        {},
                        function () {
                            tool.audioTool = this;
                            selectedAudioDevice.appendChild(tool.audioTool.element);
                        }
                    );
                }
                if (tool.state.showCamera !== false) {
                    tool.cameraButton = new Button({
                        className: 'Media_webrtc_prep-switch-camera',
                        onIcon: _icons.cameraSVG,
                        offIcon: _icons.disabledCameraSVG,
                        handler: function () {
                            if (tool.videoTool.isPending) return;
                            if (preJoiningStreams.camera != null && preJoiningStreams.camera.stream != null) {
                                tool.videoTool.stopCurrentStream();
                                tool.videoTool.state.getUserMediaOnChange = false;
                                if (preJoiningStreams.camera.mediaElement) preJoiningStreams.camera.mediaElement.remove();
                                tool.cameraButton.setActive(false);
                                preJoiningStreams.camera.stream = null;
                                updatePreview();
                            } else {
                                tool.cameraButton.element.classList.add('Q_working');

                                tool.videoTool.state.getUserMediaOnChange = true;
                                tool.videoTool.requestSelectedCamera();
                            }
                        }
                    });
                    buttonsInner.appendChild(tool.cameraButton.element);

                    if (preJoiningStreams.camera.stream) {
                        tool.cameraButton.setActive(true);
                    }

                    Q.activate(
                        Q.Tool.setUpElement(
                            'DIV',
                            "Media/webrtc/video2",
                            {
                                initStream: tool.state.initVideoStream,
                                onStream: function (stream) {
                                    if(tool.state.canceled) {
                                        tool.videoTool.stopCurrentStream();
                                        return;
                                    }
                                    tool.cameraButton.element.classList.remove('Q_working');
                                    preJoiningStreams.camera.stream = stream;
                                    tool.cameraButton.setActive(true);

                                    updatePreview();
                                }
                            }
                        ),
                        {},
                        function () {
                            tool.videoTool = this;
                            selectedVideoDevice.appendChild(tool.videoTool.element);
                        }
                    );
                }

                var joinButtonCon = document.createElement('DIV');
                joinButtonCon.className = 'Media_webrtc_join-button-con';
                mediaDevicesDialog.appendChild(joinButtonCon);

                var joinButton = document.createElement('DIV');
                joinButton.type = 'button';
                joinButton.className = 'Q_button Media_webrtc_join-button';
                joinButton.innerHTML = Q.getObject("webrtc.preparing.joinNow", tool.text);
                joinButtonCon.appendChild(joinButton);

                updatePreview();
               
                joinButton.addEventListener('click', function () {
                    let streams = [];
                    if(preJoiningStreams.camera.stream) {
                        streams.push(preJoiningStreams.camera.stream);
                    }
                    if(preJoiningStreams.audio.stream) {
                        streams.push(preJoiningStreams.audio.stream);
                    }

                    //if audio and video streams are the same stream, remove duplicates
                    var map = new Map();

                    for (var i = 0; i < streams.length; i++) {
                        var stream = streams[i];
                        map.set(stream.id, stream);
                    }

                    var uniqueById = Array.from(map.values());

                    Q.handle(tool.state.onJoin, null, [uniqueById, preJoiningAudioOutputDeviceId]);
                });

                function updatePreview() {
                    let videoOrAvatar;
                    if (preJoiningStreams.camera && preJoiningStreams.camera.stream) {
                        if (!preJoiningStreams.camera.mediaElement) {
                            preJoiningStreams.camera.mediaElement = createVideoElement(preJoiningStreams.camera.stream);
                        }
                        preJoiningStreams.camera.mediaElement.srcObject = preJoiningStreams.camera.stream;
                        usersAvatar.remove();
                        videoOrAvatar = preJoiningStreams.camera.mediaElement;
                    } else {
                        videoOrAvatar = usersAvatar;
                    }

                    cameraPreview.appendChild(videoOrAvatar);

                    if (preJoiningStreams.camera && preJoiningStreams.camera.mediaElement) {
                        preJoiningStreams.camera.mediaElement.play().catch((e) => {
                            console.error(e)
                        });
                    }
                    if (preJoiningStreams.screen && preJoiningStreams.screen.mediaElement) {
                        preJoiningStreams.screen.mediaElement.play().catch((e) => {
                            console.error(e)
                        });
                    }
                }

                function createVideoElement(stream) {
                    let videoPreview = document.createElement('video');
                    videoPreview.muted = true;
                    try {
                        videoPreview.srcObject = stream;

                    } catch (e) {
                        console.log(e);
                        console.error(e);
                    }

                    videoPreview.setAttributeNode(document.createAttribute('autoplay'));
                    videoPreview.setAttributeNode(document.createAttribute('playsinline'));


                    return videoPreview;
                }
                function createAvatarElement(cameraPreview) {
                    let avatarCon = document.createElement('DIV');
                    avatarCon.className = 'Media_webrtc_preparing_camera-preview-avatar-con';

                    Q.Streams.Avatar.get(Q.Users.loggedInUserId()).then(function (avatar) {
                        if (!avatar) {
                            return;
                        }

                        var src = Q.url(avatar.iconUrl(1000));
                        if (src != null) {
                            var avatarImg = new Image();
                            avatarImg.src = src;
                            avatarCon.appendChild(avatarImg);
                        }
                    });

                    return avatarCon;
                }
                Q.handle(tool.state.onShow, null, []);

            },
            checkMeetingStatus: function () {

                Q.req("Media/webrtc", ["status"], function (err, response) {
                    var msg = Q.firstErrorMessage(err, response && response.errors);

                    if (msg) {
                        return Q.alert(msg);
                    }

                    if (!response.slots) return;
                    let stream = response.slots.status.stream;
                    let live = response.slots.status.live;
                    if (live) {
                        if (connectionState) {
                            connectionState.updateStatus('Room is live');
                        }
                    } else {
                        if (connectionState) {
                            connectionState.updateStatus('Room is offline');
                        }
                    }
                }, {
                    method: 'get',
                    fields: {
                        roomId: _options.roomId,
                        publisherId: _options.roomPublisherId,
                    }
                });
            }

        }

    );

})(window.jQuery, window);