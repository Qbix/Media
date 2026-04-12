Q.Media.WebRTC.livestreaming.Recorder = function (tool) {
    var thisInstance = this;
    this.livestreamingTool = tool;
    var _webrtcUserInterface = tool.webrtcUserInterface;
    var _localRecordingsDB = null;
    var _streamingSocket = {};
    var _localRecorder = {
        chunks: []
    };
    var _activeRecorder = null;
    
    Q.Media.WebRTC.livestreaming.initRecordingsDB().then(function (dbApi) {
        _localRecordingsDB = dbApi;
    });

    this.startTimeSinceOrigin = null;

    this.startRecording = function (options) {
        return new Promise(function (resolve, reject) {
            if (_activeRecorder) {
                reject('Recording already in progress');
                return;
            }

            let roomStream = _webrtcUserInterface.roomStream();
            if (options.mediabunnyRecorder) {              
                _activeRecorder = new Q.Media.WebRTC.livestreaming.MediabunnyRecorder({
                    livestreamingTool: tool,
                    //subtitles: true,
                    recording: true,
                    bitrateMode: 'constant',
                    bitrate: 2_000_000,
                    keyFrameInterval: 1,
                    latencyMode: 'quality',
                    roomStream: roomStream,
                    publisherId: roomStream.fields.publisherId,
                    streamName: roomStream.fields.name,
                    title: roomStream.fields.title,
                    startTime: roomStream.getAttribute('startTime'),
                });

                _activeRecorder.startRecording()
                    .then(function () {
                        thisInstance.startTimeSinceOrigin = performance.now();
                        tool.webrtcSignalingLib.event.dispatch('localRecordingStarted', {
                            participant: tool.webrtcSignalingLib.localParticipant(),
                            mp4Recorder: _activeRecorder,
                            format: options.mediaRecorderCodecs.indexOf('mp4') != -1 ? 'mp4' : 'webm'

                        });
                        tool.webrtcSignalingLib.signalingDispatcher.sendDataTrackMessage("localRecordingStarted");
                        return resolve();
                    })
                    .catch(function (error) {
                        thisInstance.cancelRecording();
                        return reject(error);
                    });
            } else {
                _activeRecorder = new Q.Media.WebRTC.livestreaming.NativeRecorder({ 
                    livestreamingTool: tool,
                    codecs: options.mediaRecorderCodecs,
                    publisherId: roomStream.fields.publisherId,
                    streamName: roomStream.fields.name,
                    title: roomStream.fields.title,
                    startTime: roomStream.getAttribute('startTime'),
                });

                _activeRecorder.startRecording()
                    .then(function () {
                        thisInstance.startTimeSinceOrigin = performance.now();
                        tool.webrtcSignalingLib.event.dispatch('localRecordingStarted', {
                            participant: tool.webrtcSignalingLib.localParticipant(),
                            mp4Recorder: _activeRecorder,
                            format: options.mediaRecorderCodecs.indexOf('mp4') != -1 ? 'mp4' : 'webm'

                        });
                        tool.webrtcSignalingLib.signalingDispatcher.sendDataTrackMessage("localRecordingStarted");
                        return resolve();
                    })
                    .catch(function (error) {
                        thisInstance.cancelRecording();
                        return reject(error);
                    });
            }
        });
    }

    this.stopRecording = function(download) {
         return new Promise(function (resolve, reject) {
            if(!_activeRecorder) {
                return reject('No active recordings');
             }

             let notice = tool.webrtcUserInterface.notice.show(Q.getObject("webrtc.notices.processingRecording", tool.text), true);
             _activeRecorder.stopRecording().then(function (data) {

                 tool.webrtcSignalingLib.event.dispatch('localRecordingEnded', {
                     participant: tool.webrtcSignalingLib.localParticipant(),
                 });
                 tool.webrtcSignalingLib.signalingDispatcher.sendDataTrackMessage("localRecordingEnded");

                 setTimeout(function () {
                     notice.remove();
                 }, 2000);
                 resolve(data);
             });
             _activeRecorder = null;
            
         });
    }

    this.cancelRecording = function () {
        _activeRecorder.cancelRecording();
        _activeRecorder = null;
        tool.webrtcUserInterface.notice.show(Q.getObject("webrtc.notices.recordingCanceled", tool.text) || 'Recording canceled', true);
    }

    this.addSubtitle = function (text) {
        if(_activeRecorder && typeof _activeRecorder.addSubtitle == 'function') {
            return _activeRecorder.addSubtitle(text);
        }
        return Promise.resolve();
    }

    this.patchCaptions = function (captions) {
        if(_activeRecorder && typeof _activeRecorder.patchCaptions == 'function') {
            return _activeRecorder.patchCaptions(captions);
        }
        return Promise.resolve();
    }

    this.isRecording = function () {
        return _activeRecorder != null;
    }
   
}

Q.Media.WebRTC.livestreaming.initRecordingsDB = function () {
    return new Promise(function (resolve, reject) {
        const localRecordingsDB = Q.Media.WebRTC.indexedDbAPI('localRecodingsDB', {
            version: 6,
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
                },
                {
                    name: 'captions',
                    indexes: [
                        { name: 'recordingId', unique: true }
                    ]
                }
            ],

        });
        localRecordingsDB.init().then(function () {
            resolve(localRecordingsDB);
        });
    });
}

Q.Media.WebRTC.livestreaming.initRecordingsDB().then(function (dbApi) {
    Q.Media.WebRTC.livestreaming.localRecordingsDB = dbApi;
});


Q.Media.WebRTC.livestreaming.downloadFromIndexedDB = function (recordingItem, downloadName) {
    if(!Q.Media.WebRTC.livestreaming.localRecordingsDB) return;
    Q.Media.WebRTC.livestreaming.localRecordingsDB.getByIndex('startTime', recordingItem.startTime, 'recordingsChunks').then(function (chunks) {
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


function log(){}
if(Q.Media.WebRTCdebugger) {
    log = Q.Media.WebRTCdebugger.createLogMethod('RtmpSender.js')
}