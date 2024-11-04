Q.Media.WebRTC.livestreaming.RTMPSender = function (tool) {
    var _webrtcUserInterface = tool.webrtcUserInterface;
    var _localRecordingsDB = null;
    var _streamingSocket = {};
    var _localRecorder = {
        chunks: []
    };
    var _mp4Recorder = null;
    var _mp4Streamer = null;

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
        var secure = _options.nodeServer.indexOf('https://') == 0;
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
            secure: secure,
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
        log('startStreaming', rtmpUrls);
        if (useMp4Muxer) {
            return startStreamingUsingMp4Muxer();
        } else {
            return startStreamingUsingMediaRecorder();
        }

        function startStreamingUsingMp4Muxer() {
            return new Promise(function (resolve, reject) {
                connect(rtmpUrls, service, livestreamStream, 'Mp4Muxer', function () {
                    log('startStreaming connected');

                    if (_streamingSocket[service].mediaRecorder) {
                        log('startStreaming: mediaRecorder exists');
                        resolve();
                    }
                    _streamingSocket[service].active = true;

                    let mediaStream = tool.canvasComposer.getMediaStream();
                    if (!mediaStream) {
                        mediaStream = tool.canvasComposer.captureStream();
                    }
                    let roomStream = _webrtcUserInterface.roomStream();

                    let audioContext = tool.canvasComposer.audioComposer.getContext();
                    let canvas = tool.canvasComposer.canvas();

                    let chunknum = 0;
                    let firstChunks = [];
                    let initSent = false;
                    _mp4Streamer = new Mp4Recorder({
                        mediaStream: mediaStream,
                        audioContext: audioContext,
                        canvas: canvas,
                        publisherId: roomStream.fields.publisherId,
                        streamName: roomStream.fields.name,
                        title: roomStream.fields.title,
                        startTime: roomStream.getAttribute('startTime'),
                        recording: false,
                        onDataAvailable: function (buffer) {
                            //parseMp4(buffer);
                            //console.log('onDataAvailable')
                            let blob = new Blob([buffer]);
                            if (_streamingSocket[service] == null) return;
                            /* let string = new TextDecoder().decode(buffer);
                            console.log('onDataAvailable', string.toString(16)) */
                            if (_streamingSocket[service].connected) {
                                _streamingSocket[service].socket.emit('Media/webrtc/videoData', blob);
                                /* if(_streamingSocket[service].chunksSkipped != 0) {
                                    console.log('onDataAvailable send init blob', _streamingSocket[service].chunksSkipped, _mp4Streamer.ftypBox);

                                    let ftypBlob = new Blob([_mp4Streamer.ftypBox]);
                                    _streamingSocket[service].socket.emit('Media/webrtc/videoData', ftypBlob);

                                    let moovBlob = new Blob([_mp4Streamer.moovBox, buffer]);
                                    _streamingSocket[service].socket.emit('Media/webrtc/videoData', moovBlob);

                                    _streamingSocket[service].chunksSkipped = 0;
                                } else {
                                    console.log('onDataAvailable send regular blob');

                                    _streamingSocket[service].socket.emit('Media/webrtc/videoData', blob);
                                } */
                            } else {
                                _streamingSocket[service].chunksSkipped++;
                            }
                            if (chunknum == 0 || chunknum == 1) {
                                firstChunks[chunknum] = blob;
                            }
                            chunknum++;
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
    const mediaStream = options.mediaStream; //for audio input
    const audioContext = options.audioContext; //for audio input
    let _opfsRoot = null;
    let _tempDir = null;

    this.recordingId = Date.now().toString(36) + Math.random().toString(36).replace(/\./g, "");;
    let fileName = 'mp4_' + this.recordingId;
    let chunkHandles = [];
    let infoFile = null;
    let chunkCounter = -1;

    let muxer = null;
    this.videoEncoder = null;
    this.fps = 0;
    let audioEncoder = null;
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
    this.ftypBox = null;
    this.moovBox = null;

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

    function findFtypBox(uint8Array) {
        let offset = 0;
        while (offset < uint8Array.length) {
            const size = uint8Array[offset] << 24 |
                uint8Array[offset + 1] << 16 |
                uint8Array[offset + 2] << 8 |
                uint8Array[offset + 3];
            const type = getStringFromBuffer(uint8Array, offset + 4, 4);

            if (type === 'ftyp') {
                return uint8Array.slice(offset, offset + size);
            }

            offset += size;
        }

        return null;
    }

    function findMoovBox(uint8Array) {
        let offset = 0;
        while (offset < uint8Array.length) {
            const size = (uint8Array[offset] << 24) |
                (uint8Array[offset + 1] << 16) |
                (uint8Array[offset + 2] << 8) |
                (uint8Array[offset + 3]);
            const type = getStringFromBuffer(uint8Array, offset + 4, 4);

            if (type === 'moov') {
                return uint8Array.slice(offset, offset + size);
            }

            offset += size;
        }

        return null;
    }

    function getStringFromBuffer(buffer, start, length) {
        return String.fromCharCode.apply(null, buffer.slice(start, start + length));
    }

    this.startRecording = async function () {
        // Check for VideoEncoder availability
        if (typeof VideoEncoder === 'undefined') {
            alert("Looks like your user agent doesn't support VideoEncoder / WebCodecs API yet.");
            return;
        }
        if (!_opfsRoot || !_tempDir) {
            await initOpfs();
        }

        videoTrack = mediaStream?.getVideoTracks()[0].clone();

        if (typeof AudioEncoder !== 'undefined') {
            audioTrack = mediaStream?.getAudioTracks()[0].clone();
            audioSampleRate = audioContext.sampleRate;
            if (audioTrack?.getCapabilities().sampleRate) {
                audioSampleRate = audioTrack?.getCapabilities().sampleRate.max;
            }
        } else {
            console.warn('AudioEncoder not available; no need to acquire a user media audio track.');
        }

        // Create an MP4 muxer with a video track and maybe an audio track
        muxer = new Mp4Muxer.Muxer({
            /* target: new Mp4Muxer.ArrayBufferTarget(), */
            target: new Mp4Muxer.StreamTarget({
                onData: async function (buffer) {
                    if (chunkCounter == -1) {
                        let info = {
                            publisherId: options.publisherId,
                            streamName: options.streamName,
                            webrtcStarttime: options.startTime,
                            title: options.title,
                        }
                        infoFile = await saveTempChunk(JSON.stringify(info), fileName + '_info')
                    }


                    chunkCounter++;
                    if (options.recording !== false) {
                        let chunkHandle = await saveTempChunk(buffer, fileName + '_' + chunkCounter);
                        if (chunkHandle) chunkHandles.push(chunkHandle);
                    }

                    if (options.onDataAvailable) {
                        options.onDataAvailable(buffer);
                    }
                }

            }),
            video: {
                codec: 'avc',
                width: canvas.width,
                height: canvas.height
            },
            audio: audioTrack ? {
                codec: 'aac',
                sampleRate: audioSampleRate,
                numberOfChannels: 2
            } : undefined,

            // Puts metadata to the start of the file. Since we're using ArrayBufferTarget anyway, this makes no difference
            // to memory footprint.
            fastStart: 'fragmented',

            // Because we're directly pumping a MediaStreamTrack's data into it, which doesn't start at timestamp = 0
            firstTimestampBehavior: 'offset'
        });

        thisInstance.videoEncoder = new VideoEncoder({
            output: function (chunk, meta) {
                return muxer.addVideoChunk(chunk, meta)
            },
            error: e => console.error(e)
        });
        thisInstance.videoEncoder.configure({
            codec: 'avc1.4d0029',
            width: canvas.width,
            height: canvas.height,
            bitrate: 1e6
        });

        startTime = document.timeline.currentTime;
        startTimestamp = +new Date();
        recording = true;
        lastKeyFrame = -Infinity;
        framesGenerated = 0;

        if (videoTrack) {
            console.log('videoTrack', videoTrack)
            let videoTrackProcessor = new MediaStreamTrackProcessor({ track: videoTrack });
            let consumer = new WritableStream({
                write(frame) {
                    fpsCounter2++

                    if (!recording) {
                        frame.close();
                        return;
                    }
                    let currentTime = document.timeline.currentTime;
                    let elapsedTime = currentTime - startTime;

                    framesGenerated++;
                    fpsCounter++;
                    // Ensure a video key frame at least every 10 seconds for good scrubbing
                    let needsKeyFrame = elapsedTime - lastKeyFrame >= 5000;
                    if (needsKeyFrame) lastKeyFrame = elapsedTime;

                    //fps counter
                    if (currentTime - lastFrameTime >= 1000) { // Update the FPS counter every second
                        thisInstance.fps = fpsCounter;
                        fpsCounter = 0;
                        lastFrameTime = currentTime;
                    }

                    thisInstance.videoEncoder.encode(frame, { keyFrame: needsKeyFrame });
                    frame.close();
                }
            });
            videoTrackProcessor.readable.pipeTo(consumer);
        }

        if (audioTrack) {
            audioEncoder = new AudioEncoder({
                output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
                error: e => console.error(e)
            });
            audioEncoder.configure({
                codec: 'mp4a.40.2',
                numberOfChannels: 2,
                sampleRate: audioSampleRate,
                bitrate: 128000
            });

            // Create a MediaStreamTrackProcessor to get AudioData chunks from the audio track
            let trackProcessor = new MediaStreamTrackProcessor({ track: audioTrack, maxBufferSize: 100 });
            let consumer = new WritableStream({
                write(audioData) {
                    if (!recording) {
                        audioData.close();
                        return;
                    }
                    audioEncoder.encode(audioData);
                    audioData.close();
                }
            });
            trackProcessor.readable.pipeTo(consumer);
        }
    };

    this.endRecording = async function () {
        recording = false;

        videoTrack?.stop();
        audioTrack?.stop();

        await thisInstance.videoEncoder?.flush();
        await audioEncoder?.flush();
        muxer.finalize();
        if (options.recording !== false) {
            await checkIfFinalChunkExist();
            await mergeAndSaveAndDownload();
        }

        thisInstance.videoEncoder = null;
        audioEncoder = null;
        muxer = null;
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
}

function log(){}
if(Q.Media.WebRTCdebugger) {
    log = Q.Media.WebRTCdebugger.createLogMethod('RtmpSender.js')
}