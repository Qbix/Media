Q.Media.WebRTC.livestreaming.RTMPSender = function (tool) {
    var _webrtcUserInterface = tool.webrtcUserInterface;
    var _localRecordingsDB = null;
    var _streamingSocket = {};
    var _localRecorder = {
        chunks: []
    };
    var _mp4Recorder = null;
    var _mp4Streamer = null;
    var trackIdsInfo;
    loadIndexedDbAPI();

    function loadIndexedDbAPI() {
        return new Promise(function (resolve, reject) {
            Q.addScript([
                '{{Media}}/js/tools/webrtc/IndexedDbAPI.js',
            ], function () {
                _localRecordingsDB = Q.Media.WebRTC.indexedDbAPI('localRecodingsDB', {
                    version: 5,
                    stores: [
                        {
                            name: 'recordings',
                            indexes: [
                                { name: 'startTime', unique: false },
                                { name: 'roomKey', unique: false },
                                { name: 'recordingId', unique: true }
                            ]
                        },
                        {
                            name: 'recordingsChunks',
                            indexes: [
                                { name: 'startTime', unique: false },
                                { name: 'roomKey', unique: false }
                            ]
                        }
                    ],

                });
                _localRecordingsDB.init().then(function () {
                    resolve();
                });
            });
        });
    }

    function connect(rtmpUrls, platform, livestreamOrRecordingStream, recorderType, callback) {
        if (typeof io == 'undefined') return;
        log('startStreaming connect');

        var _options = tool.webrtcSignalingLib.getOptions();
        var streamingInfo = {
            socket: null,
            chunksSkipped: 0,
            connected: false
        }
        _streamingSocket[platform] = streamingInfo;

        let mediaRecorderCodec = tool.canvasComposer.getSupportedStreamingCodec();
        var _localInfo = tool.webrtcSignalingLib.getLocalInfo();
        streamingInfo.socket = io.connect(_options.nodeServer + '/webrtc', {
            query: {
                rtmp: rtmpUrls.length != 0 ? JSON.stringify(rtmpUrls) : '',
                recording: platform == 'rec' ? true : '',
                livestreamStream: platform != 'rec' && livestreamOrRecordingStream ? JSON.stringify({ publisherId: livestreamOrRecordingStream.fields.publisherId, streamName: livestreamOrRecordingStream.fields.name }) : null,
                recordingStream: platform == 'rec' && livestreamOrRecordingStream ? JSON.stringify({ publisherId: livestreamOrRecordingStream.fields.publisherId, streamName: livestreamOrRecordingStream.fields.name }) : null,
                localInfo: JSON.stringify(_localInfo),
                recorderType: recorderType,
                mediaRecorderCodec: mediaRecorderCodec,
                platform: platform,
                roomId: _webrtcUserInterface.roomStream() ? _webrtcUserInterface.roomStream().fields.name.split('/')[2] : 'undefined',
                roomStartTime: _webrtcUserInterface.roomStream() ? _webrtcUserInterface.roomStream().getAttribute('startTime') : 'undefined',
                userId: tool.webrtcSignalingLib.localParticipant().identity.split('\t')[0],
                userConnectedTime: tool.webrtcSignalingLib.localParticipant().connectedTime,
                streamingStartTime: Date.now(),
                recordingStartTime: _localRecorder.startTime
            },
            transports: ['websocket'],
            'force new connection': true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 100
        });
        let socket = streamingInfo.socket;
        socket.on('connect', function (e) {
            log('sender connect:', e)
            streamingInfo.connected = true;
            if (!streamingInfo.chunksSkipped || streamingInfo.chunksSkipped === 0) {
                log('sender connect: callback')
                if (callback != null) callback();
            }
        });
        socket.on('error', function (e) {
            log('sender error0:', e)
        });
        socket.io.on('connect_error', function (e) {
            streamingInfo.connected = false;
            log('sender error1:', e)
        });
        socket.io.on('reconnect_error', function (e) {
            streamingInfo.connected = false;
            log('sender error3:', e)
        });
        socket.io.on('reconnect_failed', function (e) {
            streamingInfo.connected = false;
            log('sender error4 reconnect_failed:', e)
        });

        socket.io.on('reconnect_attempt', function (e) {
            streamingInfo.connected = false;
            log('sender: reconnect_attempt');
        });
        socket.on('Media/webrtc/liveStreamingStopped', function (e) {
            log('sender: liveStreamingStopped');
            //socket.disconnect();
            tool.webrtcSignalingLib.event.dispatch('liveStreamingStopped', e);
            tool.webrtcSignalingLib.signalingDispatcher.sendDataTrackMessage("liveStreamingEnded", e.platform);
        });
        socket.on('disconnect', function (reason) {
            log('sender: disconnect', reason);
            streamingInfo.connected = false;

            //if connection was closed by user via clicking "End streaming" button
            if (reason == 'io client disconnect') {
                streamingInfo.active = false;
                if (streamingInfo.mediaRecorder) {
                    if (streamingInfo.mediaRecorder.state != 'inactive') {
                        streamingInfo.mediaRecorder.stop();
                    }
                    streamingInfo.mediaRecorder = null;
                    delete streamingInfo.mediaRecorder;
                }
            }
        });

        window.addEventListener('online', function () {
            log('USER ONLINE', streamingInfo);
            streamingInfo.connected = true;
            if (streamingInfo.mediaRecorder && streamingInfo.mediaRecorder.state == 'paused') {
                log('USER ONLINE: mediaRecorder.resume');
                streamingInfo.mediaRecorder.resume();
            }
        });
        window.addEventListener('offline', function () {
            log('USER OFFLINE', streamingInfo);
            if (streamingInfo.mediaRecorder && streamingInfo.mediaRecorder.state == 'recording') {
                log('USER ONLINE: mediaRecorder.pause');
                streamingInfo.mediaRecorder.pause();
            }
        });
    }

    function startStreaming(rtmpUrls, service, livestreamStream, useMp4Muxer) {
        log('startStreaming', rtmpUrls, useMp4Muxer);
        if (useMp4Muxer) {
            log('startStreamin 1');

            return startStreamingUsingMp4Muxer();
        } else {
            log('startStreamin 2');
            return startStreamingUsingMediaRecorder();
        }

        function startStreamingUsingMp4Muxer() {
            //console.log('startStreamingUsingMp4Muxer START');
            return new Promise(function (resolve, reject) {
                connect(rtmpUrls, service, livestreamStream, 'Mp4Muxer', function () {
                    log('startStreaming connected', _mp4Streamer);

                    if (_streamingSocket[service].mediaRecorder || _mp4Streamer != null) {
                        log('startStreaming: mediaRecorder exists');
                        resolve();
                        return;
                    }
                    _streamingSocket[service].active = true;

                    let mediaStream = tool.canvasComposer.getMediaStream();
                    if (!mediaStream) {
                        mediaStream = tool.canvasComposer.captureStream();
                    }
                    let roomStream = _webrtcUserInterface.roomStream();


                    let videoTrack = mediaStream.getVideoTracks()[0]
                    videoTrack.addEventListener('mute', function () {
                        console.log('videoTrack event MUTE')
                    });
                    videoTrack.addEventListener('unmute', function () {
                        console.log('videoTrack event UNMUTE')
                    });
                    videoTrack.addEventListener('ended', function () {
                        console.log('videoTrack event ENDED')
                    });
                    let audioContext = tool.canvasComposer.audioComposer.getContext();
                    let canvas = tool.canvasComposer.canvas();

                    let chunknum = 0;
                    let firstChunks = [];
                    let initSent = false;
                    //let lastChunkTimestamp = Date.now();

                    function sendToSocket(dataObject) {
                        if (_streamingSocket[service]?.connected) {
                            _streamingSocket[service].socket.emit('Media/webrtc/videoData', {
                                payload: new Blob([dataObject.payload]),
                                lastSequenceNumber: dataObject.lastSequenceNumber,
                                lastVideoTimestamp: dataObject.lastVideoTimestamp,
                                lastAudioTimestamp: dataObject.lastAudioTimestamp,
                            });
                        } else {
                            _streamingSocket[service].chunksSkipped++;
                        }
                    }



                    function readBoxSize(uint8Array, offset) {
                        // Use unsigned right shift to avoid negative numbers from << 24
                        return ((uint8Array[offset] << 24) |
                            (uint8Array[offset + 1] << 16) |
                            (uint8Array[offset + 2] << 8) |
                            uint8Array[offset + 3]) >>> 0; // >>> 0 forces unsigned 32-bit
                    }

                    function findBox(uint8Array, boxType) {
                        let offset = 0;
                        while (offset + 8 <= uint8Array.length) { // need at least 8 bytes for size+type
                            const size = readBoxSize(uint8Array, offset);
                            const type = getStringFromBuffer(uint8Array, offset + 4, 4);

                            if (size < 8) {
                                console.error(`Invalid box size ${size} at offset ${offset}`);
                                break; // prevent infinite loop
                            }

                            if (type === boxType) {
                                return uint8Array.slice(offset, offset + size);
                            }

                            offset += size;
                        }
                        return null;
                    }


                    function getStringFromBuffer(buffer, start, length) {
                        return String.fromCharCode.apply(null, buffer.slice(start, start + length));
                    }

                    _mp4Streamer = new Mp4Recorder({
                        bitrateMode: 'constant',
                        bitrate: 4_000_000,
                        keyFrameInterval: 1,
                        latencyMode: 'realtime',
                        mediaStream: mediaStream,
                        audioContext: audioContext,
                        canvas: canvas,
                        publisherId: roomStream.fields.publisherId,
                        streamName: roomStream.fields.name,
                        title: roomStream.fields.title,
                        startTime: roomStream.getAttribute('startTime'),
                        recording: false,
                        onDataAvailable: function (chunk) {
                            //console.log('onDataAvailable triggered')
                            if (_streamingSocket[service] == null) return;

                            const prev = _mp4Streamer.fragmentBuffer;
                            //console.log('prev combined size is ', prev.length);

                            const combined = new Uint8Array(prev.length + chunk.length);
                            combined.set(prev, 0);
                            combined.set(chunk, prev.length);
                            _mp4Streamer.fragmentBuffer = combined;

                            if (!_mp4Streamer.initSegment) {
                                //console.log('waiting for initSegment...');
                                return;
                            }

                            //console.log('current combined size is ', combined.length);

                            const { fragments, lastCompleteEnd } = _mp4Streamer.findAllFragments(combined);
                            //console.log('current fragments size is ', fragments.length);
                            //console.log('accumulated fragments ', fragments);

                            if (fragments.length === 0) return;

                            // We have video — send everything we have
                            const totalFragmentsSize = fragments.reduce((sum, f) => sum + f.moof.length + f.mdat.length, 0);
                            const needsInit = _mp4Streamer.initSegmentSent !== true;
                            const initSize = needsInit ? _mp4Streamer.initSegment.length : 0;

                            const payload = new Uint8Array(initSize + totalFragmentsSize);
                            let writeOffset = 0;

                            if (needsInit) {
                                payload.set(_mp4Streamer.initSegment, writeOffset);
                                writeOffset += _mp4Streamer.initSegment.length;
                                _mp4Streamer.initSegmentSent = true;
                                _streamingSocket[service].chunksSkipped = 0;
                            }

                            let lastVideoTimestamp = -Infinity;
                            let lastAudioTimestamp = -Infinity;
                            let lastSequenceNumber = -Infinity;
                            for (const fragment of fragments) {
                                const info = _mp4Streamer.getFragmentInfo(fragment.moof);
                                const trackType = _mp4Streamer.trackIdsInfo[info.trackId];
                                //console.log('sending fragment:', info);
                                //_mp4Streamer.getTracksInfo(info);

                                payload.set(fragment.moof, writeOffset);
                                writeOffset += fragment.moof.length;
                                payload.set(fragment.mdat, writeOffset);
                                writeOffset += fragment.mdat.length;

                                if (trackType === 'video') _mp4Streamer.lastVideoInfo = info;
                                else if (trackType === 'audio') _mp4Streamer.lastAudioInfo = info;

                                lastSequenceNumber = Math.max(lastSequenceNumber, info.sequenceNumber);
                                lastVideoTimestamp = Math.max(lastSequenceNumber, info.tracks[_mp4Streamer.trackIdsInfo.videoTrackId].timestamp);
                                lastAudioTimestamp = Math.max(lastSequenceNumber, info.tracks[_mp4Streamer.trackIdsInfo.audioTrackId].timestamp);

                                if (info.sequenceNumber >= 2 && info.sequenceNumber <= 5 && !_streamingSocket[service].placeholderSent) {
                                    //const payload = new Uint8Array(fragment.moof.length + fragment.mdat.length);
                                    //payload.set(fragment.moof, 0);
                                    //payload.set(fragment.mdat, fragment.moof.length);

                                    if (_streamingSocket[service]?.connected) {
                                        _streamingSocket[service].socket.emit('Media/webrtc/offlinePlaceholder', {
                                            moof: fragment.moof,
                                            mdat: fragment.mdat,
                                            timescales: _mp4Streamer.timescales,
                                            trackIdsInfo: _mp4Streamer.trackIdsInfo,
                                        });
                                        _streamingSocket[service].placeholderSent = true;
                                    }
                                }
                            }

                            sendToSocket({
                                payload: payload,
                                lastSequenceNumber: lastSequenceNumber,
                                lastVideoTimestamp: lastVideoTimestamp,
                                lastAudioTimestamp: lastAudioTimestamp,
                            });
                            _mp4Streamer.fragmentBuffer = combined.slice(lastCompleteEnd);
                        }
                    });

                    _mp4Streamer.startRecording();

                    tool.webrtcSignalingLib.event.dispatch('liveStreamingStarted', { participant: tool.webrtcSignalingLib.localParticipant(), platform: service });
                    tool.webrtcSignalingLib.signalingDispatcher.sendDataTrackMessage("liveStreamingStarted", service);
                    resolve();
                });
            });
        }

        function startStreamingUsingMediaRecorder() {
            return new Promise(function (resolve, reject) {
                connect(rtmpUrls, service, livestreamStream, 'MediaRecorder', function () {
                    log('startStreaming connected');
                    
                    if (_streamingSocket[service].mediaRecorder) {
                        log('startStreaming: mediaRecorder exists');
                        return;
                    }
                    _streamingSocket[service].active = true;

                    let supportedCodec = tool.canvasComposer.getSupportedStreamingCodec();
                    try {
                        _streamingSocket[service].mediaRecorder = tool.canvasComposer.createRecorder(function (blob) {
                            if (_streamingSocket[service] == null) return;

                            if (_streamingSocket[service].connected) {
                                _streamingSocket[service].socket.emit('Media/webrtc/videoData', blob);
                            }
                        }, supportedCodec);
                    } catch (error) {
                        reject(error);
                        return;
                    }

                    tool.webrtcSignalingLib.event.dispatch('liveStreamingStarted', { participant: tool.webrtcSignalingLib.localParticipant(), platform: service });
                    tool.webrtcSignalingLib.signalingDispatcher.sendDataTrackMessage("liveStreamingStarted", service);

                    resolve();
                });
            });
        }
    }

    function endStreaming(service, stopCanvasDrawingAndMixing) {
        log('endStreaming', service);

        if (_mp4Streamer) {
            _mp4Streamer.endRecording().then(function () {

            });
            _mp4Streamer = null;
        }


        if (_streamingSocket[service].mediaRecorder && _streamingSocket[service].mediaRecorder.state != 'inactive') {
            _streamingSocket[service].mediaRecorder.stop();
        }

        let activeStreamingsOrrRecordings = 0;
        for (let propName in _streamingSocket) {
            if (service && propName == service) continue;
            if (_streamingSocket[propName] != null && _streamingSocket[propName].socket.connected) {
                activeStreamingsOrrRecordings++;
            }
        }

        if (activeStreamingsOrrRecordings == 0 && (!_localRecorder.mediaRecorder || _localRecorder.mediaRecorder.state == 'inactive') && !_mp4Recorder) {
            tool.canvasComposer.stopCaptureCanvas(stopCanvasDrawingAndMixing);
        }

        if (service != null && _streamingSocket[service] != null) {
            _streamingSocket[service].socket.emit('Media/webrtc/endStream');
            _streamingSocket[service].socket.disconnect();
            delete _streamingSocket[service];

        } else {
            for (let propName in _streamingSocket) {
                if (_streamingSocket[propName] != null && _streamingSocket[propName].socket.connected) {
                    _streamingSocket[propName].socket.disconnect();
                    _streamingSocket[propName] = null;
                }
            }
        }

        tool.webrtcSignalingLib.event.dispatch('liveStreamingEnded', { participant: tool.webrtcSignalingLib.localParticipant(), platform: service });
        tool.webrtcSignalingLib.signalingDispatcher.sendDataTrackMessage("liveStreamingEnded", service);

    }

    function startRecordingOnServer(recordingStream) {
        log('startRecordingOnServer');
        connect([], 'rec', recordingStream, 'MediaRecorder', function () {
            log('startRecordingOnServer connected');
            if (_streamingSocket['rec'].mediaRecorder) {
                log('startRecordingOnServer: mediaRecorder exists');
                return;
            }
            _streamingSocket['rec'].mediaRecorder = tool.canvasComposer.createRecorder(function (blob) {
                if (_streamingSocket['rec'] == null) return;
                if (_streamingSocket['rec'].connected) {
                    _streamingSocket['rec'].socket.emit('Media/webrtc/videoData', blob);
                }

            });

            tool.webrtcSignalingLib.event.dispatch('recordingOnSeverStarted', { participant: tool.webrtcSignalingLib.localParticipant() });
            tool.webrtcSignalingLib.signalingDispatcher.sendDataTrackMessage("recordingOnSeverStarted");
        });
    }

    function stopRecordingOnSever(stopCanvasDrawingAndMixing) {
        log('stopRecordingOnSever');

        if (_streamingSocket['rec'].mediaRecorder && _streamingSocket['rec'].mediaRecorder.state != 'inactive') {
            log('stopRecordingOnSever: stop recorder');
            if (_streamingSocket['rec'].mediaRecorder.stream) {
                let tracks = _streamingSocket['rec'].mediaRecorder.stream.getTracks()
                for (let t in tracks) {
                    tracks[t].stop();
                }
            }
            _streamingSocket['rec'].mediaRecorder.stop();
        }

        let activeStreamingsOrrRecordings = 0;
        for (let propName in _streamingSocket) {
            if (propName == 'rec') continue;
            if (_streamingSocket[propName] != null && _streamingSocket[propName].socket.connected) {
                activeStreamingsOrrRecordings++;
            }
        }

        log('stopRecordingOnSever: activeStreamingsOrrRecordings', activeStreamingsOrrRecordings);
        if (activeStreamingsOrrRecordings == 0) {
            log('stopRecordingOnSever: stopCaptureCanvas');
            tool.canvasComposer.stopCaptureCanvas(stopCanvasDrawingAndMixing);
        }

        if (_streamingSocket['rec'] != null) {
            log('stopRecordingOnSever: socket.disconnect');
            _streamingSocket['rec'].socket.disconnect();
            delete _streamingSocket['rec'];

        }

        tool.webrtcSignalingLib.event.dispatch('recordingOnSeverEnded', { participant: tool.webrtcSignalingLib.localParticipant() });
        tool.webrtcSignalingLib.signalingDispatcher.sendDataTrackMessage("recordingOnSeverEnded");

    }

    function startLocalRecording(recordingStream, codecs) {
        log('startLocalRecording');
        if (_localRecorder.mediaRecorder && _localRecorder.mediaRecorder.state != 'inactive') {
            log('startLocalRecording: recording is starting');
            return;
        }

        _localRecorder.startTime = Date.now();

        let roomStream = _webrtcUserInterface.roomStream();
        let metadata = {
            roomKey: roomStream ? roomStream.fields.publisherId + '|' + roomStream.fields.name : '',
            roomStream: roomStream ? {
                publisherId: roomStream.fields.publisherId,
                name: roomStream.fields.name,
                title: roomStream.fields.title,
                startTime: roomStream.getAttribute('startTime')
            } : 'undefined',
            startTime: _localRecorder.startTime,
            chunksCounter: 0,
            chunksUploadedCounter: 0,
            codec: codecs
        }
        _localRecordingsDB.save(metadata, 'recordings').then(function (result) {
            metadata.objectId = result;
            /* if (recordingStream) { //this code was needed for parallel sending and saveing recorded chunks on server. Currently we use only local recording so we don't need this code for now 
                connectToServer().then(function () {
                    startRecorder(result);
                });
            } else { */
                startRecorder(result);
            //}
        });

        function connectToServer() {
            return new Promise(function (resolve, reject) {
                connect([], 'rec', recordingStream, 'MediaRecorder', function () {
                    log('startRecordingOnServer connected');
                    resolve();
                });
            });
        }

        function startRecorder() {
            _localRecorder.mediaRecorder = tool.canvasComposer.createRecorder(function (blob) {
                if (_localRecorder == null) return;
                blob.arrayBuffer().then(function (buffer) {
                    let obj = {
                        buffer: buffer,
                        timestamp: Date.now(),
                        roomKey: metadata.roomKey,
                        roomStream: metadata.roomStream,
                        startTime: metadata.startTime
                    }

                    _localRecordingsDB.save(obj, 'recordingsChunks').then(function (result) {
                        _localRecorder.chunks.push(obj);
                        metadata.chunksCounter = metadata.chunksCounter + 1;
                        _localRecordingsDB.save(metadata, 'recordings').then(function (result) {

                            /* if (_streamingSocket['rec'] && _streamingSocket['rec'].connected) {
                                _streamingSocket['rec'].socket.emit('Media/webrtc/videoData', { blob: blob, timestamp: Date.now(), type: blob.type });
                            } */

                        });
                    });
                });
            }, codecs);

            tool.webrtcSignalingLib.event.dispatch('localRecordingStarted', { participant: tool.webrtcSignalingLib.localParticipant() });
            tool.webrtcSignalingLib.signalingDispatcher.sendDataTrackMessage("localRecordingStarted");
        }
    }

    function stopLocalRecording(stopCanvasDrawingAndMixing) {
        log('stopRecordingOnSever');

        if (_localRecorder.mediaRecorder && _localRecorder.mediaRecorder.state != 'inactive') {
            log('stopRecordingOnSever: stop recorder local');
            if (_localRecorder.mediaRecorder.stream) {
                let tracks = _localRecorder.mediaRecorder.stream.getTracks()
                for (let t in tracks) {
                    tracks[t].stop();
                }
            }
            _localRecorder.mediaRecorder.stop();
        }

        let activeStreamingsOrrRecordings = 0;
        for (let propName in _streamingSocket) {
            if (propName == 'rec') continue;
            if (_streamingSocket[propName] != null && _streamingSocket[propName].socket.connected) {
                activeStreamingsOrrRecordings++;
            }
        }

        log('stopRecordingOnSever: activeStreamingsOrrRecordings', activeStreamingsOrrRecordings);
        if (activeStreamingsOrrRecordings == 0 && !_mp4Recorder) {
            log('stopRecordingOnSever: stopCaptureCanvas');
            tool.canvasComposer.stopCaptureCanvas(stopCanvasDrawingAndMixing);
        }

        if (_localRecorder != null) {
            _localRecorder.chunks = [];
        }

        if (_streamingSocket['rec'] && _streamingSocket['rec'].socket && _streamingSocket['rec'].socket.connected) {
            _streamingSocket['rec'].socket.disconnect();
            delete _streamingSocket['rec'];
        }

        tool.webrtcSignalingLib.event.dispatch('localRecordingEnded', { participant: tool.webrtcSignalingLib.localParticipant() });
        tool.webrtcSignalingLib.signalingDispatcher.sendDataTrackMessage("localRecordingEnded");

    }

    function startMp4LocalRecording() {
        let mediaStream = tool.canvasComposer.getMediaStream();
        if (!mediaStream) {
            mediaStream = tool.canvasComposer.captureStream();
        }

        let roomStream = _webrtcUserInterface.roomStream();

        let audioContext = tool.canvasComposer.audioComposer.getContext();
        let canvas = tool.canvasComposer.canvas();

        _mp4Recorder = new Mp4Recorder({
            recording: true,
            bitrateMode: 'constant',
            bitrate: 2_000_000,
            keyFrameInterval: 4,
            latencyMode: 'quality',
            mediaStream: mediaStream,
            audioContext: audioContext,
            canvas: canvas,
            publisherId: roomStream.fields.publisherId,
            streamName: roomStream.fields.name,
            title: roomStream.fields.title,
            startTime: roomStream.getAttribute('startTime')
        });

        let metadata = {
            recordingId: _mp4Recorder.recordingId,
            roomKey: roomStream ? roomStream.fields.publisherId + '|' + roomStream.fields.name : '',
            roomStream: roomStream ? {
                publisherId: roomStream.fields.publisherId,
                name: roomStream.fields.name,
                title: roomStream.fields.title,
                startTime: roomStream.getAttribute('startTime')
            } : 'undefined',
            startTime: +new Date(),
            format: 'mp4',
            storage: 'opfs',
        }

        _localRecordingsDB.save(metadata, 'recordings').then(function (result) {
            _mp4Recorder.startRecording();
        });

        tool.webrtcSignalingLib.event.dispatch('localRecordingStarted', {
            participant: tool.webrtcSignalingLib.localParticipant(),
            mp4Recorder: _mp4Recorder,
            format: 'mp4'

        });
        tool.webrtcSignalingLib.signalingDispatcher.sendDataTrackMessage("localRecordingStarted");
    }

    function stopMp4LocalRecording(stopCanvasDrawingAndMixing) {
        if (!_mp4Recorder) {
            console.alert('No active recording');
            return;
        }
        let notice = tool.webrtcUserInterface.notice.show(Q.getObject("webrtc.notices.processingRecording", tool.text), true);
        _mp4Recorder.endRecording().then(function () {
            setTimeout(function () {
                notice.remove();
            }, 2000);
        });
        _mp4Recorder = null;

        let activeStreamingsOrrRecordings = 0;
        for (let propName in _streamingSocket) {
            if (propName == 'rec') continue;
            if (_streamingSocket[propName] != null && _streamingSocket[propName].socket.connected) {
                activeStreamingsOrrRecordings++;
            }
        }

        if (activeStreamingsOrrRecordings == 0) {
            tool.canvasComposer.stopCaptureCanvas(stopCanvasDrawingAndMixing);
        }

        tool.webrtcSignalingLib.event.dispatch('localRecordingEnded', {
            participant: tool.webrtcSignalingLib.localParticipant(),
            format: 'mp4'

        });
        tool.webrtcSignalingLib.signalingDispatcher.sendDataTrackMessage("localRecordingEnded");
    }

    return {
        goLive: function () {
            log('goLiveDialog goLive');
        },
        isStreaming: function (platform) {
            if (!platform) {
                for (let propName in _streamingSocket) {
                    log('livestreamingManager: isStreaming', propName, _streamingSocket[propName]);
                    if (_streamingSocket[propName] != null && _streamingSocket[propName].socket.active) {
                        return true;
                    }
                }
            } else if (platform != null && _streamingSocket[platform] != null && _streamingSocket[platform].active) {
                return true;
            }
            return false;
        },
        isRecording: function () {
            return (_localRecorder.mediaRecorder && _localRecorder.mediaRecorder.state != 'inactive') || _mp4Recorder != null;
        },
        startStreaming: startStreaming,
        endStreaming: endStreaming,
        startRecordingOnServer: startRecordingOnServer,
        stopRecordingOnSever: stopRecordingOnSever,
        startLocalRecording: startLocalRecording,
        stopLocalRecording: stopLocalRecording,
        startMp4LocalRecording: startMp4LocalRecording,
        stopMp4LocalRecording: stopMp4LocalRecording,
    }
}



function Mp4Recorder(options) {
    const thisInstance = this;
    const canvas = options.canvas;
    const mediaStream = options.mediaStream;
    const audioContext = options.audioContext;
    const bitrateMode = options.bitrateMode ? options.bitrateMode : 'constant';
    const bitrate = options.bitrate ? options.bitrate : 1_000_000;
    const keyFrameInterval = options.keyFrameInterval ? options.keyFrameInterval : 5;
    const latencyMode = options.latencyMode ? options.latencyMode : "quality"; 
    let _opfsRoot = null;
    let _tempDir = null;

    this.recordingId = Date.now().toString(36) + Math.random().toString(36).replace(/\./g, "");;
    let fileName = 'mp4_' + this.recordingId;
    let chunkHandles = [];
    let infoFile = null;
    let chunkCounter = -1;

    let output = null;
    let chunks = [];
    //this.videoEncoder = null;
    this.fps = 0;
    //let audioEncoder = null;
    let startTime = null;
    let startTimestamp = null;
    let recording = false;
    let audioTrack = null;
    let videoTrack = null;
    let audioSampleRate
    let lastKeyFrame = null;
    let framesGenerated = 0;
    let fpsCounter = 0;
    let fpsCounter2 = 0;
    let lastFrameTime = 0;
    this.recording = options.recording;
    this.ftypBox = null;
    this.moovBox = null;
    this.timescales = null;
    this.trackIdsInfo = null;
    this.fragmentBuffer = new Uint8Array(0);

    function initOpfs() {
        return new Promise(async function (resolve, reject) {
            _opfsRoot = await navigator.storage.getDirectory();
            _tempDir = await _opfsRoot.getDirectoryHandle("temp", {
                create: true,
            });
            resolve();
        });
    }

    async function saveTempChunk(arrayBuffer, name) {
        const draftHandle = await _tempDir.getFileHandle(`${name}`, { create: true });
        const writable = await draftHandle.createWritable();
        // Write the contents of the file to the stream.
        await writable.write(arrayBuffer);
        // Close the stream, which persists the contents.
        let closed = await writable.close();
        return typeof closed === 'undefined' ? draftHandle : null;
    }

    function saveStaticFile(name, fileBlob) {
        return new Promise(async function (resolve, reject) {
            const draftHandle = await _opfsRoot.getFileHandle(name, { create: true }).catch(function (e) {
                console.error(e)
            });
            const writable = await draftHandle.createWritable().catch(function (e) {
                console.error(e)
            });
            // Write the contents of the file to the stream.
            await writable.write(fileBlob);
            // Close the stream, which persists the contents.
            await writable.close();

            resolve();
        });
    }

    this.startRecording = async function () {
        //console.log('startRecording START')

        const Mediabunny = Q.Media.WebRTC.Mediabunny;
        // Check for VideoEncoder availability
        if (typeof VideoEncoder === 'undefined') {
            alert("Looks like your user agent doesn't support VideoEncoder / WebCodecs API yet.");
            return;
        }
        if (!_opfsRoot || !_tempDir) {
            await initOpfs();
        }

        videoTrack = mediaStream?.getVideoTracks()[0].clone();
        videoTrack.addEventListener('mute', function () {
            console.log('videoTrack event MUTE')
        });
        videoTrack.addEventListener('unmute', function () {
            console.log('videoTrack event UNMUTE')
        });
        videoTrack.addEventListener('ended', function () {
            console.log('videoTrack event ENDED')
        });
        if (typeof AudioEncoder !== 'undefined') {
            audioTrack = mediaStream?.getAudioTracks()[0].clone();
            audioSampleRate = audioContext.sampleRate;
            if (audioTrack?.getCapabilities().sampleRate) {
                audioSampleRate = audioTrack?.getCapabilities().sampleRate.max;
            }
        } else {
            console.warn('AudioEncoder not available; no need to acquire a user media audio track.');
        }
                    let lastChunkTimestamp = Date.now();

        output = new Mediabunny.Output({
            format: new Mediabunny.Mp4OutputFormat({ fastStart: "fragmented" }),
            target: new Mediabunny.StreamTarget(
                new WritableStream({
                    async write(chunk) {
                        /* let nowTs = Date.now();
                        let secondsSinceLastChunk = (nowTs - lastChunkTimestamp) / 1000;
                        lastChunkTimestamp = nowTs;
                        console.log('onDataAvailable chunk', secondsSinceLastChunk) */
                        
                        if (!thisInstance.recording) {
                            if (thisInstance.ftypBox == null) {
                                const ftypBox = findBox(chunk.data, 'ftyp');
                                thisInstance.ftypBox = ftypBox;
                            }
                            if (thisInstance.moovBox == null) {
                                const moovBox = findBox(chunk.data, 'moov');
                                if (moovBox) {
                                    thisInstance.moovBox = moovBox;
                                    thisInstance.timescales = getTimescales(moovBox);
                                    thisInstance.trackIdsInfo = trackIdsInfo = thisInstance.getTrackInfo(moovBox);
                                    thisInstance.trackIdsInfo.videoTrackId = Object.keys(thisInstance.trackIdsInfo).find(id => thisInstance.trackIdsInfo[id] === 'video');
                                    thisInstance.trackIdsInfo.audioTrackId = Object.keys(thisInstance.trackIdsInfo).find(id => thisInstance.trackIdsInfo[id] === 'audio');
                                }
                            }

                            if (thisInstance.ftypBox && thisInstance.moovBox && !thisInstance.initSegment) {
                                const init = new Uint8Array(thisInstance.ftypBox.length + thisInstance.moovBox.length);
                                init.set(thisInstance.ftypBox, 0);
                                init.set(thisInstance.moovBox, thisInstance.ftypBox.length);
                                thisInstance.initSegment = init;

                                // Strip ftyp+moov from the front before passing to onDataAvailable
                                const headerSize = thisInstance.ftypBox.length + thisInstance.moovBox.length;
                                chunk = { ...chunk, data: chunk.data.slice(headerSize) };
                            }
                        }

                        if (chunkCounter == -1) {
                            let info = {
                                publisherId: options.publisherId,
                                streamName: options.streamName,
                                webrtcStarttime: options.startTime,
                                title: options.title,
                            }
                            infoFile = await saveTempChunk(JSON.stringify(info), fileName + '_info')
                        }

                        //chunks.push(chunk.data);

                        chunkCounter++;
                        if (options.recording !== false) {
                            let chunkHandle = await saveTempChunk(chunk.data, fileName + '_' + chunkCounter);
                            if (chunkHandle) chunkHandles.push(chunkHandle);
                        }
                        if (options.onDataAvailable) {
                            options.onDataAvailable(chunk.data);
                        }
                    },

                    close() {
                        console.trace('WritableStream close() called');
                    },
                    abort(err) {
                        console.trace('WritableStream abort() called', err);
                    }
                }), {
                    chunked: true,
                    chunkSize: 0.5 * 1024 * 1024
                }

            )
        });

        if (videoTrack) {
            videoSource = new Mediabunny.MediaStreamVideoTrackSource(videoTrack, {
                codec: "avc",
                bitrateMode: bitrateMode,
                bitrate: bitrate,
                keyFrameInterval: keyFrameInterval,
                latencyMode: latencyMode
            });

            output.addVideoTrack(videoSource);
        }

        if (audioTrack) {
			// Add the audio track, with the media stream track as the source
			const audioSource = new Mediabunny.MediaStreamAudioTrackSource(audioTrack, {
				codec: 'aac',
				bitrate: Mediabunny.QUALITY_MEDIUM,
			});
			//audioSource.errorPromise.catch(cancelRecording); // Make sure errors are bubbled up

			output.addAudioTrack(audioSource);
		}
        
        await output.start();

        startTime = document.timeline.currentTime;
        startTimestamp = +new Date();
        recording = true;
        lastKeyFrame = -Infinity;
        framesGenerated = 0;
    };

    this.endRecording = async function () {
        recording = false;

        videoTrack?.stop();
        audioTrack?.stop();

        //await thisInstance.videoEncoder?.flush();
        //await audioEncoder?.flush();
        await output.finalize();
        if (options.recording !== false) {
            await checkIfFinalChunkExist();
            await mergeAndSaveAndDownload();
        }

        //thisInstance.videoEncoder = null;
        //audioEncoder = null;
        output = null;
        startTime = null;
        startTimestamp = null;
        firstAudioTimestamp = null;
        return true;
    };

    function checkIfFinalChunkExist() {
        return new Promise(function (resolve) {
            async function doCheck() {
                let finalChunkHandle = chunkHandles[chunkHandles.length - 1];
                let fileBlob = await finalChunkHandle.getFile();
                containsMfraBox(fileBlob).then(function (result) {
                    if (result === false) {
                        setTimeout(doCheck, 100);
                        return;
                    }

                    resolve();
                })
            }

            doCheck();

        });
    }

    async function containsMfraBox(blob) {
        // Read the Blob as an ArrayBuffer
        const arrayBuffer = await blob.arrayBuffer();

        // Create a DataView to read the binary data
        const dataView = new DataView(arrayBuffer);

        // Define the mfra box identifier in ASCII
        const mfraIdentifier = 'mfra';

        // Function to check if current position matches the mfra identifier
        function matchesMfra(dataView, position) {
            for (let i = 0; i < mfraIdentifier.length; i++) {
                if (dataView.getUint8(position + i) !== mfraIdentifier.charCodeAt(i)) {
                    return false;
                }
            }
            return true;
        }

        // Iterate through the data to find the mfra identifier
        for (let i = 0; i < dataView.byteLength - mfraIdentifier.length; i++) {
            if (matchesMfra(dataView, i)) {
                return true;
            }
        }

        return false;
    }

    async function mergeAndSaveAndDownload() {
        if (chunkHandles.length == 0) {
            return;
        }
        let chunksToRemove = [...chunkHandles];
        if (infoFile) {
            chunksToRemove.push(infoFile);
        }
        let info = chunkHandles[0].name.split('_');
        let format = info[0];
        let firstChunk = await chunkHandles[0].getFile();
        let timestamp = firstChunk.lastModified;

        let blobs = [];
        await retrieveBlobs(chunkHandles, blobs).catch(function (e) {
            console.error(e)
        });

        blobs.sort(function (a, b) {
            return a.lastModified - b.lastModified; // Sorting in descending order
        });

        let fileBlob = new Blob(blobs);
        const date = new Date(parseInt(timestamp));

        let day = date.getDate();
        let month = date.getMonth() + 1;
        let year = date.getFullYear();
        let hours = date.getHours();
        let minutes = date.getMinutes();
        let seconds = date.getSeconds();

        // This arrangement can be altered based on how we want the date's format to appear.
        let currentDate = `${day}-${month}-${year}-${hours}-${minutes}-${seconds}`;
        let downloadName = `${currentDate}.${format}`;
        let fileName = `${thisInstance.recordingId}.${format}`;

        await saveStaticFile(fileName, fileBlob);

        return downloadRecording()

        function downloadRecording() {
            return new Promise(function (resolve, reject) {
                function tryDownload() {
                    _opfsRoot.getFileHandle(fileName)
                        .then(function (finalFileHandle) {
                            finalFileHandle.getFile().then(function (finalFile) {
                                if (finalFile.size != fileBlob.size) { //probably this conditions will never happen
                                    setTimeout(tryDownload, 200)
                                    return;
                                }
                                downloadBlob(finalFile, downloadName);
                                removeTempFiles();
                                resolve();
                            });
                        })
                        .catch(function (e) {
                            setTimeout(tryDownload, 200)
                        });
                }

                tryDownload();
            });
        }

        async function retrieveBlobs(tempFilesInfo, blobs) {
            let handle = tempFilesInfo.shift();
            let file = await handle.getFile()
            blobs.push(file);
            if (tempFilesInfo.length != 0) {
                return await retrieveBlobs(tempFilesInfo, blobs);
            } else {
                return blobs;
            }
        }

        async function removeTempFiles() {
            for (let i in chunksToRemove) {
                await chunksToRemove[i].remove();
            }
        }
    }

    function downloadBlob(blob, downloadName) {
        if (!downloadName) {
            let dateFormat = new Date();
            downloadName = dateFormat.getDate() +
                "-" + (dateFormat.getMonth() + 1) +
                "-" + dateFormat.getFullYear() +
                "_" + dateFormat.getHours() +
                "-" + dateFormat.getMinutes() +
                "-" + dateFormat.getSeconds();
        }

        let url = window.URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    };



function readBoxSize(uint8Array, offset) {
    // Use unsigned right shift to avoid negative numbers from << 24
    return ((uint8Array[offset] << 24) |
        (uint8Array[offset + 1] << 16) |
        (uint8Array[offset + 2] << 8) |
        uint8Array[offset + 3]) >>> 0; // >>> 0 forces unsigned 32-bit
}

function findBox(uint8Array, boxType) {
    let offset = 0;
    while (offset + 8 <= uint8Array.length) { // need at least 8 bytes for size+type
        const size = readBoxSize(uint8Array, offset);
        const type = getStringFromBuffer(uint8Array, offset + 4, 4);

        if (size < 8) {
            console.error(`Invalid box size ${size} at offset ${offset}`);
            break; // prevent infinite loop
        }

        if (type === boxType) {
            return uint8Array.slice(offset, offset + size);
        }

        offset += size;
    }
    return null;
}


function getStringFromBuffer(buffer, start, length) {
    return String.fromCharCode.apply(null, buffer.slice(start, start + length));
}


function logBufferBoxes(buffer) {
    let offset = 0;
    const boxes = [];
    while (offset + 8 <= buffer.length) {
        const size = ((buffer[offset] << 24) | (buffer[offset+1] << 16) | 
                      (buffer[offset+2] << 8) | buffer[offset+3]) >>> 0;
        const type = String.fromCharCode(
            buffer[offset+4], buffer[offset+5], 
            buffer[offset+6], buffer[offset+7]
        );
        if (size < 8) break;
        const complete = offset + size <= buffer.length;
        boxes.push(`${type}(size=${size},complete=${complete})`);
        if (!complete) break;
        offset += size;
    }
    console.log('buffer boxes:', boxes.join(' | '));
}

this.findAllFragments = function (buffer) {
    //logBufferBoxes(buffer);
    const moofs = [];
    const mdats = [];
    let offset = 0;

    while (offset + 8 <= buffer.length) {
        const size = ((buffer[offset] << 24) | (buffer[offset+1] << 16) | 
                      (buffer[offset+2] << 8) | buffer[offset+3]) >>> 0;
        const type = String.fromCharCode(
            buffer[offset+4], buffer[offset+5], 
            buffer[offset+6], buffer[offset+7]
        );

        if (size < 8) break;

        // Only collect COMPLETE boxes
        if (offset + size > buffer.length) break;

        if (type === 'moof') {
            moofs.push({ offset, size, data: buffer.slice(offset, offset + size) });
        } else if (type === 'mdat') {
            mdats.push({ offset, size, data: buffer.slice(offset, offset + size) });
        }

        offset += size;
    }

    // Pair by order — moof[n] with mdat[n]
    const pairCount = Math.min(moofs.length, mdats.length);
    const fragments = [];

    for (let i = 0; i < pairCount; i++) {
        const moof = moofs[i];
        const mdat = mdats[i];
        if (i === 0) {
            const m = moofs[0].data;
            //console.log('first moof bytes:', [...m.slice(0, 32)].map(b => b.toString(16).padStart(2, '0')).join(' '));
        }
        const info = thisInstance.getFragmentInfo(moofs[i].data);
        //console.log(`pair ${i}: moof size=${moof.size} mdat size=${mdat.size} trackId=${info.trackId} type=${trackIdsInfo[info.trackId]}`);
        //console.log('trackIdsInfo full:', JSON.stringify(trackIdsInfo));
        fragments.push({
            moof: moof.data,
            mdat: mdat.data,
            fragmentEnd: mdat.offset + mdat.size
        });
    }

    const lastCompleteEnd = fragments.length > 0
        ? fragments[fragments.length - 1].fragmentEnd
        : 0;

    //console.log('moofs found:', moofs.length, 'mdats found:', mdats.length, 'pairs:', pairCount, 'lastCompleteEnd:', lastCompleteEnd);

    return { fragments, lastCompleteEnd };
}

function getFragmentDuration(moof) {
    // find traf -> trun -> sample durations
    // if trun has a default duration, use that * sample count
    const view = new DataView(moof.buffer, moof.byteOffset);
    let offset = 8;
    
    while (offset + 8 <= moof.length) {
        const size = view.getUint32(offset);
        const type = String.fromCharCode(moof[offset+4], moof[offset+5], moof[offset+6], moof[offset+7]);
        
        if (type === 'traf') {
            let trafOffset = offset + 8;
            let defaultDuration = null;
            let sampleCount = null;
            let sampleDurations = [];
            
            while (trafOffset + 8 <= offset + size) {
                const boxSize = view.getUint32(trafOffset);
                const boxType = String.fromCharCode(moof[trafOffset+4], moof[trafOffset+5], moof[trafOffset+6], moof[trafOffset+7]);
                
                if (boxType === 'tfhd') {
                    const flags = (moof[trafOffset+9] << 16) | (moof[trafOffset+10] << 8) | moof[trafOffset+11];
                    let tfhdOffset = trafOffset + 16; // skip size+type+version+flags+track_id
                    if (flags & 0x000001) tfhdOffset += 8;  // base-data-offset
                    if (flags & 0x000002) tfhdOffset += 4;  // sample-description-index
                    if (flags & 0x000008) {
                        defaultDuration = view.getUint32(tfhdOffset);
                    }
                }
                
                if (boxType === 'trun') {
                    const flags = (moof[trafOffset+9] << 16) | (moof[trafOffset+10] << 8) | moof[trafOffset+11];
                    sampleCount = view.getUint32(trafOffset + 12);
                    let trunOffset = trafOffset + 16;
                    if (flags & 0x000001) trunOffset += 4; // data-offset
                    if (flags & 0x000004) trunOffset += 4; // first-sample-flags
                    
                    for (let i = 0; i < sampleCount; i++) {
                        if (flags & 0x000100) { // sample-duration-present
                            sampleDurations.push(view.getUint32(trunOffset));
                            trunOffset += 4;
                        }
                        if (flags & 0x000200) trunOffset += 4; // sample-size
                        if (flags & 0x000400) trunOffset += 4; // sample-flags
                        if (flags & 0x000800) trunOffset += 8; // sample-composition-time-offset
                    }
                }
                
                if (boxSize < 8) break;
                trafOffset += boxSize;
            }
            
            if (sampleDurations.length > 0) {
                return sampleDurations.reduce((a, b) => a + b, 0);
            }
            if (defaultDuration && sampleCount) {
                return defaultDuration * sampleCount;
            }
        }
        
        if (size < 8) break;
        offset += size;
    }
    return null;
}

    function getTimescale(moov) {
        // find trak -> mdia -> mdhd -> timescale
        // mdhd structure: size+type+version+flags+creation+modification+timescale
        let offset = 8;
        const view = new DataView(moov.buffer, moov.byteOffset);

        function findBox(buf, targetType, start, end) {
            let o = start;
            while (o + 8 <= end) {
                const size = view.getUint32(o);
                const type = String.fromCharCode(buf[o + 4], buf[o + 5], buf[o + 6], buf[o + 7]);
                if (type === targetType) return { offset: o, size };
                if (size < 8) break;
                o += size;
            }
            return null;
        }

        const trak = findBox(moov, 'trak', 8, moov.length);
        if (!trak) return null;
        const mdia = findBox(moov, 'mdia', trak.offset + 8, trak.offset + trak.size);
        if (!mdia) return null;
        const mdhd = findBox(moov, 'mdhd', mdia.offset + 8, mdia.offset + mdia.size);
        if (!mdhd) return null;

        const version = moov[mdhd.offset + 8];
        const timescaleOffset = mdhd.offset + 8 + 1 + 3 + (version === 1 ? 16 : 8);
        return view.getUint32(timescaleOffset);
    }

    function getTimescales(moov) {
        const timescales = {}; // { trackId: timescale }
        const view = new DataView(moov.buffer, moov.byteOffset);

    function findBoxOffset(targetType, start, end) {
        let o = start;
        while (o + 8 <= end) {
            const size = view.getUint32(o);
            const type = String.fromCharCode(moov[o+4], moov[o+5], moov[o+6], moov[o+7]);
            if (size < 8) break;
            if (type === targetType) return { offset: o, size };
            o += size;
        }
        return null;
    }

    let offset = 8;
    while (offset + 8 <= moov.length) {
        const size = view.getUint32(offset);
        const type = String.fromCharCode(moov[offset+4], moov[offset+5], moov[offset+6], moov[offset+7]);
        if (size < 8) break;

        if (type === 'trak') {
            const trakEnd = offset + size;

            const tkhd = findBoxOffset('tkhd', offset + 8, trakEnd);
            const trackId = tkhd ? view.getUint32(tkhd.offset + 20) : null;

            const mdia = findBoxOffset('mdia', offset + 8, trakEnd);
            if (mdia && trackId !== null) {
                const mdhd = findBoxOffset('mdhd', mdia.offset + 8, mdia.offset + mdia.size);
                if (mdhd) {
                    const version = moov[mdhd.offset + 8];
                    const timescaleOffset = mdhd.offset + 12 + (version === 1 ? 16 : 8);
                    timescales[trackId] = view.getUint32(timescaleOffset);
                }
            }
        }

        offset += size;
    }

    return timescales; // e.g. { 1: 90000, 2: 44100 }
}

    this.getFragmentInfo = function (moof) {
        const view = new DataView(moof.buffer, moof.byteOffset, moof.byteLength);
        let sequenceNumber = null;
        const tracks = {}; // { trackId: { timestamp, fragmentDuration, sampleCount } }

        let offset = 8;

        while (offset + 8 <= moof.length) {
            const size = view.getUint32(offset);
            const type = String.fromCharCode(moof[offset + 4], moof[offset + 5], moof[offset + 6], moof[offset + 7]);
            if (size < 8) break;

            if (type === 'mfhd') {
                sequenceNumber = view.getUint32(offset + 12);
            }

            if (type === 'traf') {
                let trackId = null;
                let timestamp = null;
                let fragmentDuration = null;
                let sampleCount = null;
                let defaultDuration = null;
                let sampleDurations = [];

                let trafOffset = offset + 8;
                while (trafOffset + 8 <= offset + size) {
                    const boxSize = view.getUint32(trafOffset);
                    const boxType = String.fromCharCode(moof[trafOffset + 4], moof[trafOffset + 5], moof[trafOffset + 6], moof[trafOffset + 7]);

                    if (boxType === 'tfhd') {
                        trackId = view.getUint32(trafOffset + 12);
                        const flags = (moof[trafOffset + 9] << 16) | (moof[trafOffset + 10] << 8) | moof[trafOffset + 11];
                        let tfhdOffset = trafOffset + 16;
                        if (flags & 0x000001) tfhdOffset += 8;
                        if (flags & 0x000002) tfhdOffset += 4;
                        if (flags & 0x000008) defaultDuration = view.getUint32(tfhdOffset);
                    }

                    if (boxType === 'tfdt') {
                        const version = moof[trafOffset + 8];
                        const tsOffset = trafOffset + 12;
                        timestamp = version === 1
                            ? Number(view.getBigUint64(tsOffset))
                            : view.getUint32(tsOffset);
                    }

                    if (boxType === 'trun') {
                        const flags = (moof[trafOffset + 9] << 16) | (moof[trafOffset + 10] << 8) | moof[trafOffset + 11];
                        sampleCount = view.getUint32(trafOffset + 12);
                        let trunOffset = trafOffset + 16;
                        if (flags & 0x000001) trunOffset += 4;
                        if (flags & 0x000004) trunOffset += 4;
                        for (let i = 0; i < sampleCount; i++) {
                            if (flags & 0x000100) { sampleDurations.push(view.getUint32(trunOffset)); trunOffset += 4; }
                            if (flags & 0x000200) trunOffset += 4;
                            if (flags & 0x000400) trunOffset += 4;
                            if (flags & 0x000800) trunOffset += 8;
                        }
                    }

                    if (boxSize < 8) break;
                    trafOffset += boxSize;
                }

                if (sampleDurations.length > 0) {
                    fragmentDuration = sampleDurations.reduce((a, b) => a + b, 0);
                } else if (defaultDuration !== null && sampleCount !== null) {
                    fragmentDuration = defaultDuration * sampleCount;
                }

                if (trackId !== null) {
                    tracks[trackId] = { timestamp, fragmentDuration, sampleCount };
                }
            }

            offset += size;
        }

        return { sequenceNumber, tracks };
        // e.g. { sequenceNumber: 5, tracks: { 1: { timestamp, fragmentDuration, sampleCount }, 2: { ... } } }
    }

    this.getTracksInfo = function (info) {
        console.log('getTracksInfo', info)
        const videoTrackId = Object.keys(thisInstance.trackIdsInfo).find(id => thisInstance.trackIdsInfo[id] === 'video');
        const audioTrackId = Object.keys(thisInstance.trackIdsInfo).find(id => thisInstance.trackIdsInfo[id] === 'audio');

        const videoInfo = info.tracks[videoTrackId];
        const audioInfo = info.tracks[audioTrackId];

        if (videoInfo) {
            const durationSeconds = videoInfo.fragmentDuration / thisInstance.timescales[videoTrackId];
            console.log('video frames:', videoInfo.sampleCount,
                'duration ticks:', videoInfo.fragmentDuration,
                'duration seconds:', durationSeconds.toFixed(3),
                'fps:', (videoInfo.sampleCount / durationSeconds).toFixed(1));
        }

        if (audioInfo) {
            console.log('audio samples:', audioInfo.sampleCount,
                'duration ticks:', audioInfo.fragmentDuration);
        }
    }

    this.getTrackInfo = function (moov) {
        const view = new DataView(moov.buffer, moov.byteOffset);
        const tracks = {};

        function findBoxOffset(targetType, start, end) {
            let o = start;
            while (o + 8 <= end) {
                const size = view.getUint32(o);
                const type = String.fromCharCode(moov[o + 4], moov[o + 5], moov[o + 6], moov[o + 7]);
                if (size < 8) break;
                if (type === targetType) return { offset: o, size };
                o += size;
            }
            return null;
        }

        let offset = 8;
        while (offset + 8 <= moov.length) {
            const size = view.getUint32(offset);
            const type = String.fromCharCode(moov[offset + 4], moov[offset + 5], moov[offset + 6], moov[offset + 7]);
            if (size < 8) break;

            if (type === 'trak') {
                const trakEnd = offset + size;

                const tkhd = findBoxOffset('tkhd', offset + 8, trakEnd);
                let trackId = null;
                if (tkhd) {
                    // offset +20 = size(4)+type(4)+version(1)+flags(3)+creation(4)+modification(4)
                    trackId = view.getUint32(tkhd.offset + 20);
                }

                const mdia = findBoxOffset('mdia', offset + 8, trakEnd);
                let handlerType = null;
                if (mdia) {
                    const hdlr = findBoxOffset('hdlr', mdia.offset + 8, mdia.offset + mdia.size);
                    if (hdlr) {
                        handlerType = String.fromCharCode(
                            moov[hdlr.offset + 16],
                            moov[hdlr.offset + 17],
                            moov[hdlr.offset + 18],
                            moov[hdlr.offset + 19]
                        );
                    }
                }

                if (trackId !== null && handlerType !== null) {
                    if (handlerType === 'vide') tracks[trackId] = 'video';
                    else if (handlerType === 'soun') tracks[trackId] = 'audio';
                    console.log('track', trackId, '=', tracks[trackId]);
                }
            }

            offset += size;
        }

        return tracks; // { 1: 'video', 2: 'audio' }
    }
}

function log(){}
if(Q.Media.WebRTCdebugger) {
    log = Q.Media.WebRTCdebugger.createLogMethod('RtmpSender.js')
}