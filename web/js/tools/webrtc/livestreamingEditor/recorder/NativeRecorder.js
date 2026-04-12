
Q.Media.WebRTC.livestreaming.NativeRecorder = function (options) {
    const thisInstance = this;

    const _bitrate = options.bitrate ?? 2 * 1024 * 1024;
    const _codecs = options.codecs;
    const _livestreamingTool = options.livestreamingTool;
    let _mediaStream;
    let _localRecordingsDB = null;
    let _recorderState = {
        state: 'inactive', //inactive->started->stopped
        chunks: [],
        writingInProgress: false,
        savedChunksNumber: 0,
        producedChunksNumber: 0,
    };

    function createRecorder(ondataavailable) {
        //codecs = getSupportedStreamingCodec();

        let originalMediaStream = _livestreamingTool.canvasComposer.getMediaStream();

        _mediaStream = originalMediaStream.clone();

        let mediaRecorder = new MediaRecorder(_mediaStream, {
            mimeType: _codecs,
            audioBitsPerSecond: 128000,
            videoBitsPerSecond: _bitrate
        });

        mediaRecorder.onerror = function (e) {
            console.error(e);
        }

        mediaRecorder.addEventListener('dataavailable', function (e) {
            console.log('mediaRecorder: dataavailable', e);

            ondataavailable(e.data);
        });

        mediaRecorder.addEventListener('error', function (e) {
            console.log('mediaRecorder: error', e);
        });
        mediaRecorder.addEventListener('pause', function (e) {
            console.log('mediaRecorder: pause', e);
        });
        mediaRecorder.addEventListener('resume', function (e) {
            console.log('mediaRecorder: resume', e);
        });
        mediaRecorder.addEventListener('start', function (e) {
            console.log('mediaRecorder: start', e);
        });
        mediaRecorder.addEventListener('stop', function (e) {
            console.log('mediaRecorder: stop', e);
        });
        mediaRecorder.addEventListener('warning', function (e) {
            console.log('mediaRecorder: warning', e);
        });

        mediaRecorder.start(1000); // Start recording, and dump data every second

        return mediaRecorder;
    }

    function startMediaRecorder() {
        _recorderState.mediaRecorder = createRecorder(function (blob) {
            if (_recorderState == null) return;
            _recorderState.producedChunksNumber++;

            blob.arrayBuffer().then(function (buffer) {
                let obj = {
                    buffer: buffer,
                    timestamp: Date.now(),
                    roomKey: _recorderState.recordingMetadata.roomKey,
                    roomStream: _recorderState.recordingMetadata.roomStream,
                    startTime: _recorderState.recordingMetadata.startTime
                }

                _localRecordingsDB.save(obj, 'recordingsChunks').then(function (result) {
                    obj.objectId = result;
                    _recorderState.chunks.push(obj);
                    _recorderState.recordingMetadata.chunksCounter = _recorderState.recordingMetadata.chunksCounter + 1;
                    _localRecordingsDB.save(_recorderState.recordingMetadata, 'recordings').then(function (result) {
                        _recorderState.savedChunksNumber++;
                        _recorderState.mediaRecorder.dispatchEvent(
                            new CustomEvent("chunksaved", { detail: { chunk: obj } })
                        );
                    });
                });
            });
        }, { codecs: options.codecs, bitrate: 2_000_000 });
    }

    this.startRecording = function () {
        console.log('startRecording');
        return new Promise(async function (resolve, reject) {
            if (_recorderState.mediaRecorder && _recorderState.mediaRecorder.state != 'inactive') {
                console.log('startRecording: recording is starting');
                return reject();
            }

            if (!_localRecordingsDB) {
                _localRecordingsDB = await Q.Media.WebRTC.livestreaming.initRecordingsDB();
            }
            _recorderState.startTime = Date.now();

            let metadata = _recorderState.recordingMetadata = {
                roomKey: options.publisherId && options.streamName ? options.publisherId + '|' + options.streamName : '',
                roomStream: options.publisherId ? {
                    publisherId: options.publisherId,
                    name: options.streamName,
                    title: options.title,
                    startTime: options.startTime
                } : 'undefined',
                startTime: _recorderState.startTime,
                chunksCounter: 0,
                chunksUploadedCounter: 0,
                codec: options.codecs
            }
            _localRecordingsDB.save(metadata, 'recordings').then(function (result) {
                metadata.objectId = result;
                try {
                    startMediaRecorder();
                } catch (error) {
                    reject(error);
                }
                _recorderState.state = 'started';
                resolve();
            });
        });
    }

    /**
     * Stops recording and starts downloading recorded file.
     * What is events order when user clicks "Stop recording": stopRecording()->
     *
     * @param {*} cancel if true, cancels recording without downloading the file
     * @return {*} 
     */
    this.stopRecording = function (cancel) {
        console.log('stopRecordingOnSever');
        return new Promise(function (resolve, reject) {
            _recorderState.mediaRecorder.addEventListener('chunksaved', function (e) {
                console.log('mediaRecorder: chunksaved', _recorderState.savedChunksNumber, _recorderState.finalChunksNumber);

                //wait on last chunk to be saved
                if (_recorderState.savedChunksNumber != _recorderState.finalChunksNumber) {
                    return;
                }
                if (cancel) return resolve();

                if (_recorderState != null) {
                    let dateFormat = new Date(parseInt(_recorderState.recordingMetadata.startTime));
                    let downloadName = dateFormat.getDate() +
                        "-" + (dateFormat.getMonth() + 1) +
                        "-" + dateFormat.getFullYear() +
                        "_" + dateFormat.getHours() +
                        "-" + dateFormat.getMinutes() +
                        "-" + dateFormat.getSeconds();

                    Q.Media.WebRTC.livestreaming.downloadFromIndexedDB(_recorderState.recordingMetadata, downloadName);

                    _recorderState.chunks = [];
                    _recorderState.recordingMetadata = null;
                    _recorderState.startTime = null;
                    _recorderState.mediaRecorder = null;
                }
                resolve();
            });

            _recorderState.mediaRecorder.addEventListener('stop', function (e) {
                _recorderState.state = 'stopped';
                _recorderState.finalChunksNumber = _recorderState.producedChunksNumber;
                console.log('mediaRecorder: stop 2', e);
            });
            if (_recorderState.mediaRecorder && _recorderState.mediaRecorder.state != 'inactive') {
                console.log('stopRecordingOnSever: stop recorder local');
                if (_recorderState.mediaRecorder.stream) {
                    let tracks = _recorderState.mediaRecorder.stream.getTracks()
                    for (let t in tracks) {
                        tracks[t].stop();
                    }
                }
                _recorderState.mediaRecorder.stop();
            }


        });
    }

    this.cancelRecording = function () {
        this.stopRecording(true);
    }

    this.isRecording = function () {
        return (_recorderState.mediaRecorder && _recorderState.mediaRecorder.state != 'inactive');
    }
}