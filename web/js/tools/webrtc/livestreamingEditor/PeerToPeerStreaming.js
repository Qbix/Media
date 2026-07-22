Q.Media.WebRTC.livestreaming.PeerToPeerStreaming = function (tool) {
        var thisInstance = this;
        var _broadcastClient = null;
        var _linkToLiveInput = null;

        createSectionElement();   

        function generateLinkToLivestreamTool() {
            let livestreamId = (tool.livestreamStream.fields.name).replace('Media/webrtc/livestream/', '');
            _linkToLiveInput.value = location.origin + '/livestream/' + tool.livestreamStream.fields.publisherId + '/' + livestreamId;
        }

        function createSectionElement() {
            var roomId = 'broadcast-' + tool.webrtcUserInterface.getOptions().roomId + '-' + (tool.webrtcSignalingLib.localParticipant().sid).replace('/webrtc#', '');

            var broadcastingCon = thisInstance.element = document.createElement('DIV');
            broadcastingCon.className = 'live-editor-dialog-window-content live-editor-stream-to-section-p2p'

            var broadcastingSettings = document.createElement('DIV');
            broadcastingSettings.className = 'live-editor-stream-to-section-p2p-start_settings';
            broadcastingCon.appendChild(broadcastingSettings);

            var startBroadcastingBtnCon = document.createElement('DIV');
            startBroadcastingBtnCon.className = 'live-editor-stream-to-section-p2p-start';
            broadcastingSettings.appendChild(startBroadcastingBtnCon);

            var startBroadcastingBtn = document.createElement('BUTTON');
            startBroadcastingBtn.type = 'button';
            startBroadcastingBtn.className = 'livestream_button';
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
            stopBroadcastingBtn.className = 'livestream_button';
            stopBroadcastingBtn.innerHTML = Q.getObject("webrtc.settingsPopup.stop", tool.text);
            stopBroadcastingBtnCon.appendChild(stopBroadcastingBtn);

            var shareBroadcastingBtnCon = document.createElement('DIV');
            shareBroadcastingBtnCon.className = 'live-editor-stream-to-section-p2p-share';
            buttonsCon.appendChild(shareBroadcastingBtnCon);

            var shareBroadcastingBtn = document.createElement('BUTTON');
            shareBroadcastingBtn.type = 'button';
            shareBroadcastingBtn.className = 'livestream_button';
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

                            _broadcastClient = tool.broadcastClient = window.WebRTCWebcastClient({
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
                            tool.streamingAndRecording.showLiveIndicator('p2p');
                            generateLinkToLivestreamTool();

                            _broadcastClient.init(function () {
                                tool.canvasComposer.captureStream();
                                var stream = tool.canvasComposer.getMediaStream();

                                if (stream != null) stream = stream.clone();

                                _broadcastClient.mediaControls.publishStream(stream);
                                tool.state.p2pBroadcastIsActive = true;
                                tool.streamingAndRecording.updateSourcesControlPanel();
                                tool.webrtcSignalingLib.signalingDispatcher.sendDataTrackMessage('webcastStarted', roomId)
                                tool.webrtcSignalingLib.event.dispatch('webcastStarted', { participant: tool.webrtcSignalingLib.localParticipant() });
                            });

                            _broadcastClient.event.on('disconnected', function () {
                                tool.webrtcSignalingLib.signalingDispatcher.sendDataTrackMessage('webcastEnded')
                                tool.webrtcSignalingLib.event.dispatch('webcastEnded', { participant: tool.webrtcSignalingLib.localParticipant() });

                                tool.state.p2pBroadcastIsActive = false;
                                _broadcastClient = tool.broadcastClient = null;
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
                tool.streamingAndRecording.updateSourcesControlPanel();
                tool.streamingAndRecording.hideLiveIndicator('p2p');
            })
            shareBroadcastingBtn.addEventListener('click', function () {
                if (tool.livestreamStream) {
                    let oldSendBy = Q.Streams.Dialogs.invite.options.sendBy;
                    Q.Streams.Dialogs.invite.options.sendBy = null;
                    Q.Streams.invite(tool.livestreamStream.fields.publisherId, tool.livestreamStream.fields.name, {
                        title: 'Share Livestream',
                        addLabel: [],
                        addMyLabel: []
                    }, function () {
                        Q.Streams.Dialogs.invite.options.sendBy = oldSendBy;
                    });
                }
            })

            return broadcastingCon;
        } 
}