Q.Media.WebRTC.livestreaming.RecordingPopup = function (tool) {
    var thisInstance = this;
    var _localRecordingTimer = null;

    const VIDEO_BITRATES = [
        2_097_152,   // 2 Mbps
        4_194_304,   // 4 Mbps
        5_242_880,   // 5 Mbps
        8_388_608,   // 8 Mbps
        10_485_760,  // 10 Mbps
        12_582_912,  // 12 Mbps
        16_777_216,  // 16 Mbps
        25_165_824,  // 24 Mbps
        33_554_432,  // 32 Mbps
        50_331_648,  // 48 Mbps
        67_108_864,  // 64 Mbps
        83_886_080,  // 80 Mbps
        100_663_296, // 96 Mbps
    ];

    var recordingParams = {
        bitrate: {
            video: null,
            audio: null
        }
    }

    function createSectionElement() {

        var recordingCon = thisInstance.element = document.createElement('DIV');
        recordingCon.className = 'live-editor-stream-to-section-rec';

        var recordingButtons = document.createElement('DIV');
        recordingButtons.className = 'live-editor-stream-to-section-rec-buttons';
        recordingCon.appendChild(recordingButtons);

        var startLocalRecBtn = document.createElement('DIV');
        startLocalRecBtn.className = 'live-editor-rec-start';
        recordingButtons.appendChild(startLocalRecBtn);

        var startLocRecordingBtn = document.createElement('DIV');
        startLocRecordingBtn.className = 'live-editor-rec-start-btn livestream_button';
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
        getRecordingsBtn.className = 'livestream_button';
        getRecordingsBtn.innerHTML = 'Show Recordings';
        recordingsContainer.appendChild(getRecordingsBtn);

        /* let recordingFormats = document.createElement('DIV');
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
        } */

        let settingsEl = generateSettings();
        Q.activate(
            Q.Tool.setUpElement(
                dropDownArrCon,
                "Media/webrtc/popupDialog",
                {
                    content: settingsEl,
                    triggerOn: 'lmb',
                    className: 'live-editor-rec-server-dropdown',
                    parent: recordingCon
                }
            ),
            {},
            function () {

            }
        );

        startButtonTextCon.addEventListener('click', function () {

            if (tool.state.localRecording.state != 'active') {
                updateRecordingState('pending');
                checkStorageQuotaBeforeRecording()
                    .then(function (fileHandle) {
                        return startRecording(fileHandle);
                    })
                    .then(function () {
                        updateRecordingState('active');
                    })
                    .catch(function (error) {
                        if (error === 'cancelled') {
                            // user dismissed the low storage warning without choosing an option
                            updateRecordingState('inactive');
                            return;
                        }
                        tool.recorder.cancelRecording();
                        tool.webrtcUserInterface.notice.show(Q.getObject("webrtc.notices.errorWhileStartingRecording", tool.text) || 'Error while starting recording');
                        updateRecordingState('inactive');
                        console.error(error);
                    });

            } else {
                updateRecordingState('pending');
                stopRecording().then(function () {
                    updateRecordingState('inactive');
                });
            }

        })

        var LOW_STORAGE_WARNING_THRESHOLD_MB = 4560;

        function estimateAvailableStorageMB() {
            return new Promise(async function (resolve) {
                if (!navigator.storage || !navigator.storage.estimate) {
                    return resolve(null);
                }
                try {
                    var estimate = await navigator.storage.estimate();
                    resolve(((estimate.quota || 0) - (estimate.usage || 0)) / 1_000_000);
                } catch (error) {
                    console.error('estimateAvailableStorageMB failed', error);
                    resolve(null);
                }
            });
        }

        // Checks OPFS storage quota before recording starts. Resolves with a
        // FileSystemFileHandle if the user picked a disk location instead,
        // or with undefined if there's enough space or the user chose to
        // continue recording to browser storage anyway.
        function checkStorageQuotaBeforeRecording() {
            return estimateAvailableStorageMB().then(function (availableMB) {
                if (availableMB === null || availableMB >= LOW_STORAGE_WARNING_THRESHOLD_MB) {
                    return;
                }

                return new Promise(function (resolve, reject) {
                    showLowStorageDialog(availableMB, resolve, reject);
                });
            });
        }

        function showLowStorageDialog(availableMB, resolve, reject) {
            var canvasSize = tool.canvasComposer.videoComposer.getCanvasSize();
            var totalBitrate = (recordingParams.bitrate.video || 0) + (recordingParams.bitrate.audio || 0);
            var mbPerMinute = parseFloat(calculateSize(totalBitrate, canvasSize, 1)) || 0;
            var minutesLeft = mbPerMinute > 0 ? (availableMB / mbPerMinute) : 0;

            var container = document.createElement('DIV');
            container.className = 'live-editor-rec-low-storage-warning';

            var message = document.createElement('P');
            message.innerHTML = 'Your browser has very little storage quota left to keep recording: about '
                + Math.max(0, Math.round(availableMB)) + ' MB (~' + Math.max(0, minutesLeft).toFixed(1) + ' min) remaining. '
                + 'You can continue recording to browser storage, or save the recording directly to a location on your disk.';
            container.appendChild(message);

            var buttonsCon = document.createElement('DIV');
            buttonsCon.className = 'live-editor-rec-low-storage-warning-buttons';
            container.appendChild(buttonsCon);

            var continueBtn = document.createElement('BUTTON');
            continueBtn.className = 'livestream_button live-editor-rec-continue-anyway-btn';
            continueBtn.innerHTML = 'Continue anyway';
            buttonsCon.appendChild(continueBtn);

            var saveOnDiskBtn = document.createElement('BUTTON');
            saveOnDiskBtn.className = 'livestream_button live-editor-rec-save-on-disk-btn';
            saveOnDiskBtn.innerHTML = 'Save on disk';
            buttonsCon.appendChild(saveOnDiskBtn);

            if (!window.showSaveFilePicker) {
                saveOnDiskBtn.classList.add('Q_disabled');
            }

            var settled = false;

            var dialog = Q.Dialogs.push({
                title: "Storage quota warning",
                content: container,
				className: "Assets_Payment_status",
                onClose: function () {
                    if (!settled) {
                        settled = true;
                        reject('cancelled');
                    }
                }
            });

            continueBtn.addEventListener('click', function () {
                settled = true;
                Q.Dialogs.close(dialog);
                resolve();
            });

            saveOnDiskBtn.addEventListener('click', async function () {
                if (!window.showSaveFilePicker) {
                    return;
                }
                try {
                    var fileHandle = await window.showSaveFilePicker({
                        suggestedName: generateFileName(),
                        types: [{
                            description: 'Video recording',
                            accept: {
                                'video/mp4': ['.mp4']
                            }
                        }]
                    });
                    settled = true;
                    Q.Dialogs.close(dialog);
                    resolve(fileHandle);
                } catch (error) {
                    console.error('showLowStorageDialog: showSaveFilePicker failed or cancelled', error);
                }
            });
        }

        function generateFileName(prefix = 'capture') {
            const now = new Date();

            const pad = (value) => String(value).padStart(2, '0');

            return `${prefix}_${now.getFullYear()
                }-${pad(now.getMonth() + 1)
                }-${pad(now.getDate())
                }_${pad(now.getHours())
                }-${pad(now.getMinutes())
                }-${pad(now.getSeconds())
                }`;
        }

        function calculateSize(
            bitrate,
            { width, height } = {},
            minutes = 1
        ) {
            // File size is determined by bitrate and duration.
            // width/height are accepted for API consistency but are not used
            // when a fixed bitrate is provided.

            const seconds = minutes * 60;
            const bytes = (bitrate * seconds) / 8;

            // Decimal MB (1 MB = 1,000,000 bytes)
            return (bytes / 1_000_000).toFixed(1);
        }

        function getRecommendedVideoBitrate({
            width,
            height,
            fps = 30,
        }) {
            const maxDimension = Math.max(width, height);

            let targetBitrate;

            // Base recommendations for ~30 FPS.
            if (maxDimension <= 1280) {
                targetBitrate = 5_242_880;
            } else if (maxDimension <= 1920) {
                targetBitrate = 10_485_760;
            } else if (maxDimension <= 2560) {
                targetBitrate = 25_165_824;
            } else {
                targetBitrate = 50_331_648;
            }

            // FPS adjustments.
            if (fps > 60) {
                targetBitrate *= 2;
            } else if (fps > 30) {
                targetBitrate *= 1.5;
            }

            // Return the nearest bitrate from VIDEO_BITRATES
            // that is >= the target.
            return (
                VIDEO_BITRATES.find(
                    (bitrate) => bitrate >= targetBitrate
                ) ??
                VIDEO_BITRATES[VIDEO_BITRATES.length - 1]
            );
        }

        function generateSettings() {            

            var canvasSize = tool.canvasComposer.videoComposer.getCanvasSize();

            const recommendedVideoBitrate = getRecommendedVideoBitrate({ width: canvasSize.width, height: canvasSize.height, fps: 30 });

            const VIDEO_BITRATE_OPTIONS = VIDEO_BITRATES.map((bitrate) => ({
                bitrate,
                caption:
                    `${Math.round(bitrate / 1024 / 1024)} Mbps` +
                    ` (1 min is ~${calculateSize(
                        bitrate,
                        { width: canvasSize.width, height: canvasSize.height },
                        1
                    )} MB)`,
                default: bitrate == recommendedVideoBitrate
            }));

            const AUDIO_BITRATE_OPTIONS = [
                {
                    bitrate: 64_000,
                    caption: '64 kbps',
                },
                {
                    bitrate: 96_000,
                    caption: '96 kbps',
                },
                {
                    bitrate: 128_000,
                    caption: '128 kbps',
                    default: true
                },
                {
                    bitrate: 160_000,
                    caption: '160 kbps',
                },
                {
                    bitrate: 192_000,
                    caption: '192 kbps',
                },
                {
                    bitrate: 256_000,
                    caption: '256 kbps',
                },
                {
                    bitrate: 320_000,
                    caption: '320 kbps',
                },
            ];

            let bitrateOptions = [
                {
                    type: 'video',
                    label: 'Video',
                    options: VIDEO_BITRATE_OPTIONS
                },
                {
                    type: 'audio',
                    label: 'Audio',
                    options: AUDIO_BITRATE_OPTIONS
                }
            ]

            let recordingSettings = document.createElement('DIV');
            recordingSettings.className = 'live-editor-rec-server-dropdown-inner';

            bitrateOptions.forEach(function (type) {
                let bitrateParam = document.createElement('DIV');
                bitrateParam.className = 'live-editor-rec-settings-param live-editor-rec-settings-bitrate';
                recordingSettings.appendChild(bitrateParam);
                let bitrateParamCaption = document.createElement('DIV');
                bitrateParamCaption.className = 'live-editor-rec-settings-caption';
                bitrateParamCaption.innerText = type.label + ' bitrate';
                bitrateParam.appendChild(bitrateParamCaption);
                let bitrateParamSelect = document.createElement('SELECT');
                bitrateParam.appendChild(bitrateParamSelect);
                type.options.forEach(function (value) {
                    let option = document.createElement('OPTION');
                    option.value = value.bitrate;
                    option.innerHTML = value.caption;
                    if (value.default) {
                        option.selected = true;
                        recordingParams.bitrate[type.type] = value.bitrate;
                    }
                    bitrateParamSelect.appendChild(option);
                });
                recordingSettings.appendChild(bitrateParam);

            })



            return recordingSettings;
        }

        function startRecording(fileHandle) {
            return new Promise(function (resolve, reject) {
                try {
                    let mediaRecorderCodecs;
                    if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264') || MediaRecorder.isTypeSupported('video/mp4;codecs:h264')) {
                        mediaRecorderCodecs = MediaRecorder.isTypeSupported('video/mp4;codecs=h264') ? 'video/mp4;codecs=h264' : 'video/mp4;codecs:h264';
                    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264') || MediaRecorder.isTypeSupported('video/webm;codecs:h264')) {
                        mediaRecorderCodecs = MediaRecorder.isTypeSupported('video/webm;codecs=h264') ? 'video/webm;codecs=h264' : 'video/webm;codecs:h264';
                    }

                    tool.recorder.startRecording({
                        subtitles: false, //disabled for now due to bug of 100% cpu usage
                        mediabunnyRecorder: false, //mp4Checkbox.checked && mp4MuxerRecordingSupported
                        mediaRecorderCodecs: mediaRecorderCodecs,
                        videoBitrate: recordingParams.bitrate.video,
                        audioBitrate: recordingParams.bitrate.audio,
                        fileHandle: fileHandle || null,
                        fileName: fileHandle ? fileHandle.name : generateFileName(),
                        onRequestStop: function () {
                            updateRecordingState('pending');
                            stopRecording().then(function () {
                                updateRecordingState('inactive');
                            });
                        }
                    })
                        .then(function () {
                            try {
                                tool.speechRecognizer = new Q.Media.WebRTC.livestreaming.RoomSpeechRecognizer({
                                    webrtcSignalingLib: tool.webrtcSignalingLib,
                                    startTimeSinceOrigin: tool.recorder.startTimeSinceOrigin,
                                    onSegment: function (e) {
                                        //console.log('speechRecognizer onSegment')
                                        //if(e.segment) tool.recorder.addSubtitle(e.formatted);
                                    }
                                })
                                tool.speechRecognizer.start();
                            } catch (error) {
                                tool.recorder.cancelRecording(); 
                                return reject(error);
                            }
                            resolve();
                        })
                        .catch(function (error) {
                            reject(error);
                            return;
                        });
                } catch (error) {
                    reject(error);
                    return;
                }
            });
        }

        function stopRecording() {
            return new Promise(async function (resolve, reject) {
                if (tool.speechRecognizer) {
                    //await tool.recorder.patchCaptions(tool.speechRecognizer.exportWebVTT());
                    tool.recorder.stopRecording()
                        .then(function (recordingData) {
                            if (tool.speechRecognizer) {
                                tool.speechRecognizer.stop();
                                //tool.recorder.patchCaptions(tool.speechRecognizer.exportWebVTT());
                                //console.log('speechRecognizer srt', tool.speechRecognizer.exportJSON())
                            }

                            resolve();
                        })
                        .catch(function () {
                            tool.webrtcUserInterface.notice.show(Q.getObject("webrtc.notices.errorWhileStoppingRecording", tool.text) || 'Error while stopping recording occured');
                            resolve();
                        });

                } else {

                    tool.recorder.stopRecording()
                        .then(function (recordingData) {
                            resolve();
                        })
                        .catch(function () {
                            tool.webrtcUserInterface.notice.show(Q.getObject("webrtc.notices.errorWhileStoppingRecording", tool.text) || 'Error while stopping recording occured');
                            resolve();
                        });;
                }
            });
        }

        function updateRecordingState(state) {
            tool.state.localRecording.state = state;
            updateRecordingUI();
        }

        function updateRecordingUI() {
            if (tool.state.localRecording.state == 'pending') {
                startLocRecordingBtn.classList.add('Q_working');
            } else if (tool.state.localRecording.state == 'active') {
                startLocRecordingBtn.classList.remove('Q_working');
                startLocRecordingBtn.classList.add('live-editor-rec-start-btn-active');
                startButtonText.innerHTML = 'Stop Recording';
                startButtonTimer.innerHTML = '';
                tool.streamingAndRecording.showLiveIndicator('rec');
                tool.state.localRecording.active = true;
                //tool.state.localRecording.sendingToServer = recordingStream ? true : false;
                tool.state.localRecording.pending = false;
                _localRecordingTimer = new Timer(startButtonTimer);
                _localRecordingTimer.start();
            } else { //inactive
                startLocRecordingBtn.classList.remove('Q_working');
                startLocRecordingBtn.classList.remove('live-editor-rec-start-btn-active');
                startButtonText.innerHTML = 'Start Recording';
                startButtonTimer.innerHTML = '';
                tool.streamingAndRecording.updateSourcesControlPanel();
                tool.streamingAndRecording.hideLiveIndicator('rec');

                if (_localRecordingTimer) {
                    _localRecordingTimer.stop();
                    _localRecordingTimer = null;
                }
            }
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

            this.start = function () {
                if (timerInstance.intervalId === null) {
                    timerInstance.startTime = Date.now();
                    timerInstance.intervalId = setInterval(function () {
                        timerInstance.updateTime()
                    }, 1000);
                }
            }

            this.stop = function () {
                if (timerInstance.intervalId !== null) {
                    clearInterval(timerInstance.intervalId);
                    timerInstance.intervalId = null;
                }
            }

            this.updateTime = function () {
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
}