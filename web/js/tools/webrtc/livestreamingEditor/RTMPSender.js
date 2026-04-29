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

                    _mp4Streamer = new Q.Media.WebRTC.livestreaming.Mp4Recorder({
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
                        }, { codecs: supportedCodec, bitrate: 2_000_000 });
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
        let metadata = _localRecorder.recordingMetadata = {
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
            }, { codecs: codecs, bitrate: 2_000_000 });

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
            let dateFormat = new Date(parseInt(_localRecorder.recordingMetadata.startTime));
            let downloadName = dateFormat.getDate() +
                "-" + (dateFormat.getMonth() + 1) +
                "-" + dateFormat.getFullYear() +
                "_" + dateFormat.getHours() +
                "-" + dateFormat.getMinutes() +
                "-" + dateFormat.getSeconds();

            downloadFromIndexedDB(_localRecorder.recordingMetadata, downloadName);

            _localRecorder.chunks = [];
            _localRecorder.recordingMetadata = null;
            _localRecorder.startTime = null;
        }

        if (_streamingSocket['rec'] && _streamingSocket['rec'].socket && _streamingSocket['rec'].socket.connected) {
            _streamingSocket['rec'].socket.disconnect();
            delete _streamingSocket['rec'];
        }

        tool.webrtcSignalingLib.event.dispatch('localRecordingEnded', { participant: tool.webrtcSignalingLib.localParticipant() });
        tool.webrtcSignalingLib.signalingDispatcher.sendDataTrackMessage("localRecordingEnded");

    }

    function downloadFromIndexedDB(recordingItem, downloadName) {
        var tool = this;
        _localRecordingsDB.getByIndex('startTime', recordingItem.startTime, 'recordingsChunks').then(function (chunks) {
            chunks.sort(function (a, b) {
                var x = a.timestamp;
                var y = b.timestamp;
                if (x < y) { return -1; }
                if (x > y) { return 1; }
                return 0;
            });

            let allChunks = chunks.map(function (o) {
                return o.buffer;
            });

            let blob = new Blob(allChunks);

            let extension = 'mp4';
            if (recordingItem.codec && recordingItem.codec.includes('mp4')) {
                extension = 'mp4';
            } else if (recordingItem.codec && recordingItem.codec.includes('webm')) {
                extension = 'webm';
            }
            const url = URL.createObjectURL(blob);
            let downloadLink = document.createElement('A');
            downloadLink.style.position = 'absolute';
            downloadLink.style.top = '-999999px';
            downloadLink.href = url;
            downloadLink.download = downloadName + '.' + extension;
            document.body.appendChild(downloadLink);
            downloadLink.click();

            setTimeout(() => {
                URL.revokeObjectURL(url);
                downloadLink.remove();
            }, 1000);
        })
    }

    function startMp4LocalRecording() {
        let mediaStream = tool.canvasComposer.getMediaStream();
        if (!mediaStream) {
            mediaStream = tool.canvasComposer.captureStream();
        }

        let roomStream = _webrtcUserInterface.roomStream();

        let audioContext = tool.canvasComposer.audioComposer.getContext();
        let canvas = tool.canvasComposer.canvas();

        _mp4Recorder = new Q.Media.WebRTC.livestreaming.Mp4Recorder({
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




function log(){}
if(Q.Media.WebRTCdebugger) {
    log = Q.Media.WebRTCdebugger.createLogMethod('RtmpSender.js')
}