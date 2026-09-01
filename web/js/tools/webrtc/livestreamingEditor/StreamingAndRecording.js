Q.Media.WebRTC.livestreaming.StreamingAndRecording = function (tool) {

    let thisInstance = this;
    this.element = null;

    let _recordingIconEl = null;
    let _p2pBroadcastIconEl = null;
    let _customRtmpIconEl = null;

    let rtmpStreaming = new Q.Media.WebRTC.livestreaming.RTMPStreaming(tool);
    let recordingPopup = new Q.Media.WebRTC.livestreaming.RecordingPopup(tool);
    let peerToPeerStreaming = new Q.Media.WebRTC.livestreaming.PeerToPeerStreaming(tool);

    createSection();

    function declareOrRefreshEventHandlers() {
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

    function createSection() {
        var sectionContainer = thisInstance.element = document.createElement('DIV');
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
                        content: recordingPopup.element,
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
                        content: peerToPeerStreaming.element,
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
            customStreamIcon.addEventListener('click', function () {
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
            recordingBtn.addEventListener('click', function () {
                let streamingControlsEl = document.querySelector('.live-editor-preview');
                let rectangleToShowIn = streamingControlsEl ? streamingControlsEl.getBoundingClientRect() : null;
                let settingsDialog = new SimpleDialog({
                    content: recordingPopup.element,
                    rectangleToShowIn: rectangleToShowIn,
                    title: 'Record',
                    className: 'live-editor-modal-window'
                });
            });

            peerToPeerStreamingBtn.addEventListener('click', function () {
                let streamingControlsEl = document.querySelector('.live-editor-preview');
                let rectangleToShowIn = streamingControlsEl ? streamingControlsEl.getBoundingClientRect() : null;
                let settingsDialog = new SimpleDialog({
                    content: peerToPeerStreaming.element,
                    rectangleToShowIn: rectangleToShowIn,
                    title: 'Peer To Peer Broadcast',
                    className: 'live-editor-modal-window'
                });
            });

            customStreamBtn.addEventListener('click', function () {
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

    this.showLiveIndicator = function (platform) {
        if (platform == 'custom') {
            if (!_customRtmpIconEl.classList.contains('live-editor-stream-to-is-active')) {
                _customRtmpIconEl.classList.add('live-editor-stream-to-is-active');
            }
        } else if (platform == 'p2p') {
            if (!_p2pBroadcastIconEl.classList.contains('live-editor-stream-to-is-active')) {
                _p2pBroadcastIconEl.classList.add('live-editor-stream-to-is-active');
            }
        } else if (platform == 'rec') {
            if (!_recordingIconEl.classList.contains('live-editor-stream-to-is-active')) {
                _recordingIconEl.classList.add('live-editor-stream-to-is-active');
            }
        }
    }
    
    this.hideLiveIndicator = function (platform) {
        if (platform == 'custom') {
            _customRtmpIconEl.classList.remove('live-editor-stream-to-is-active');
        } else if (platform == 'p2p') {
            _p2pBroadcastIconEl.classList.remove('live-editor-stream-to-is-active');
        } else if (platform == 'rec') {
            _recordingIconEl.classList.remove('live-editor-stream-to-is-active');
        }
    }
    this.updateSourcesControlPanel = function() {
        if (!tool.livestreamingEditor.scenesInterface) return;
        let scenes = tool.livestreamingEditor.scenesInterface.getScenesList();
        for (let i in scenes) {
            scenes[i].sourcesInterface.updateSourceControlPanelButtons();
        }
    }
}