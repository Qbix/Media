
Q.Media.WebRTC.livestreaming.NativeRecorder = function (options) {
    const thisInstance = this;

    const _bitrate = options.bitrate ?? 2 * 1024 * 1024;
    const _codecs = options.codecs;
    const _livestreamingTool = options.livestreamingTool;

    let _opfsRoot = null;
    let _fileHandle = null;
    let _accessHandle = null;
    let _writableHandle = null;
    let _writePosition = 0;
    let _bytesSinceCommit = 0;

    let _mediaStream;
    let _localRecordingsDB = null;
    let _recorderState = {
        state: 'inactive', //inactive->started->stopped
        chunks: [],
        writingInProgress: false,
        savedChunksNumber: 0,
        producedChunksNumber: 0,
    };

    function initOpfs() {
        return new Promise(async function (resolve, reject) {
            _opfsRoot = await navigator.storage.getDirectory();
            _fileHandle = await _opfsRoot.getFileHandle(_recorderState.recordingMetadata.fileName, {
                create: true
            });
            //_accessHandle = await _fileHandle.createSyncAccessHandle();
            const file = await _fileHandle.getFile();

            _writePosition = file.size;

            _writableHandle = await _fileHandle.createWritable({
                keepExistingData: true
            });

            await _writableHandle.seek(_writePosition);
            
            _lastCommit = Date.now();
            resolve();
        });
    }

    async function appendChunkToFile(typedArrayOrBuffer) {
        _writableHandle.write(typedArrayOrBuffer);
        _writePosition += typedArrayOrBuffer.byteLength;
        _bytesSinceCommit += typedArrayOrBuffer.byteLength;

        _recorderState.savedChunksNumber++;
        _recorderState.mediaRecorder.dispatchEvent(
            new CustomEvent("chunksaved", { detail: { chunk: typedArrayOrBuffer } })
        );

        if (_bytesSinceCommit >= 5 * 1024 * 1024 || Date.now() - _lastCommit > 20000) {
            console.warn('commit')
            await commit();
        }
        //_accessHandle.flush();
    }

    async function commit() {
        await _writableHandle.close();

        _writableHandle = await _fileHandle.createWritable({
            keepExistingData: true
        });

        await _writableHandle.seek(_writePosition);

        _bytesSinceCommit = 0;
        
        _lastCommit = Date.now();
    }

    async function downloadFromOPFS() {
        const file = await _fileHandle.getFile();
        
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;

        document.body.appendChild(a);
        a.click();
        a.remove();

        URL.revokeObjectURL(url);
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
            ondataavailable(e.data);
        });

        mediaRecorder.addEventListener('error', function (e) {
            console.log('mediaRecorder: error', e);
        });
        mediaRecorder.addEventListener('pause', function (e) {
            //console.log('mediaRecorder: pause', e);
        });
        mediaRecorder.addEventListener('resume', function (e) {
            //console.log('mediaRecorder: resume', e);
        });
        mediaRecorder.addEventListener('start', function (e) {
            //console.log('mediaRecorder: start', e);
        });
        mediaRecorder.addEventListener('stop', function (e) {
            //console.log('mediaRecorder: stop', e);
        });
        mediaRecorder.addEventListener('warning', function (e) {
            //console.log('mediaRecorder: warning', e);
        });

        mediaRecorder.start(5000); // Start recording, and dump data every 5 seconds

        return mediaRecorder;
    }

    function startMediaRecorder() {
        _recorderState.mediaRecorder = createRecorder(function (blob) {
            if (_recorderState == null) return;
            _recorderState.producedChunksNumber++;

            blob.arrayBuffer().then(function (buffer) {

                appendChunkToFile(buffer);

                /* let obj = {
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
                }); */
            });
        }, { codecs: options.codecs, bitrate: 2_000_000 });
    }

    this.startRecording = function () {
        //console.log('startRecording');
        return new Promise(async function (resolve, reject) {
            if (_recorderState.mediaRecorder && _recorderState.mediaRecorder.state != 'inactive') {
                //console.log('startRecording: recording is starting');
                return reject();
            }

            if (!_localRecordingsDB) {
                _localRecordingsDB = await Q.Media.WebRTC.livestreaming.initRecordingsDB();
            }
            _recorderState.startTime = Date.now();

            let extension = 'mp4';
            if (options.codec && options.codec.includes('mp4')) {
                extension = 'mp4';
            } else if (options.codec && options.codec.includes('webm')) {
                extension = 'webm';
            }

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
                codec: options.codecs,
                fileName: generateFileName() + '.' + extension
            }

            if (!_opfsRoot) {
                await initOpfs();
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
        //console.log('stopRecordingOnSever');
        return new Promise(async function (resolve, reject) {
            _recorderState.mediaRecorder.addEventListener('chunksaved', async function (e) {
                //console.log('mediaRecorder: chunksaved', _recorderState.savedChunksNumber, _recorderState.finalChunksNumber);

                //wait on last chunk to be saved
                if (_recorderState.savedChunksNumber < _recorderState.finalChunksNumber) {
                    return;
                }
                if (cancel) return resolve();

                if (_recorderState != null) {
                    if (_writableHandle) await _writableHandle.close();
                    downloadFromOPFS();
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
                //console.log('mediaRecorder: stop 2', e);
            });
            if (_recorderState.mediaRecorder && _recorderState.mediaRecorder.state != 'inactive') {
                //console.log('stopRecordingOnSever: stop recorder local');
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