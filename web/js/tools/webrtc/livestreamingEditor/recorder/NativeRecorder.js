
Q.Media.WebRTC.livestreaming.NativeRecorder = function (options) {
    const thisInstance = this;

    const _codecs = options.codecs;
    const _livestreamingTool = options.livestreamingTool;

    let _opfsRoot = null;
    let _recordingsDir = null;
    let _fileHandle = null;
    let _writableHandle = null;
    let _writePosition = 0;
    let _bytesSinceCommit = 0;
    let _writeChainPromise = Promise.resolve();
    let _lastCommit = null;

    const _externalFileHandle = options.fileHandle || null;
    let _usingOPFS = !_externalFileHandle;
    let _lowQuotaDialog = null;

    const LOW_OPFS_QUOTA_THRESHOLD_MB = 50;

    let _mediaStream;
    let _localRecordingsDB = null;
    let _recorderState = {
        state: 'inactive', //inactive->started->stopped
        chunks: [],
        writingInProgress: false,
        savedChunksNumber: 0,
        producedChunksNumber: 0,
    };

    function initOpfsDir() {
        return new Promise(async function (resolve, reject) {
            _opfsRoot = await navigator.storage.getDirectory();
            _recordingsDir = await _opfsRoot.getDirectoryHandle("recordings", {
                create: true,
            });

            resolve();
        });
    }

    // Creates/opens the actual recording file inside OPFS. Only used when
    // recording is being written to OPFS (not to an externally picked disk file).
    function initOpfsFile() {
        return new Promise(async function (resolve, reject) {
            _fileHandle = await _recordingsDir.getFileHandle(_recorderState.recordingMetadata.fileName, {
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

    async function initExternalFile() {
        _fileHandle = _externalFileHandle;
        _writePosition = 0;

        _writableHandle = await _fileHandle.createWritable({
            keepExistingData: false
        });

        await _writableHandle.seek(0);

        _lastCommit = Date.now();
    }

    async function checkOpfsQuota() {
        if (_lowQuotaDialog) return;
        if (!navigator.storage || !navigator.storage.estimate) return;

        try {
            const estimate = await navigator.storage.estimate();
            const availableMB = ((estimate.quota || 0) - (estimate.usage || 0)) / 1_000_000;

            if (availableMB < LOW_OPFS_QUOTA_THRESHOLD_MB) {
                showLowQuotaDuringRecordingDialog(availableMB);
            }
        } catch (error) {
            console.error('checkOpfsQuota failed', error);
        }
    }

    function showLowQuotaDuringRecordingDialog(availableMB) {
        let container = document.createElement('DIV');
        container.className = 'live-editor-rec-low-storage-warning';

        let message = document.createElement('P');
        message.innerHTML = 'Browser storage is almost full: about ' + Math.max(0, Math.round(availableMB))
            + ' MB left. Stop recording, or save it to a location on disk to keep going.';
        container.appendChild(message);

        let buttonsCon = document.createElement('DIV');
        buttonsCon.className = 'live-editor-rec-low-storage-warning-buttons';
        container.appendChild(buttonsCon);

        let stopBtn = document.createElement('BUTTON');
        stopBtn.className = 'livestream_button live-editor-rec-stop-btn';
        stopBtn.innerHTML = 'Stop recording';
        buttonsCon.appendChild(stopBtn);

        let saveOnDiskBtn = document.createElement('BUTTON');
        saveOnDiskBtn.className = 'livestream_button live-editor-rec-save-on-disk-btn';
        saveOnDiskBtn.innerHTML = 'Save on disk';
        buttonsCon.appendChild(saveOnDiskBtn);

        if (!window.showSaveFilePicker) {
            saveOnDiskBtn.classList.add('Q_disabled');
        }

        _lowQuotaDialog = Q.Dialogs.push({
            title: "Storage quota warning",
            content: container,
            onClose: function () {
                _lowQuotaDialog = null;
            }
        });

        stopBtn.addEventListener('click', function () {
            Q.Dialogs.close(_lowQuotaDialog);
            _lowQuotaDialog = null;
            if (typeof options.onRequestStop == 'function') {
                options.onRequestStop();
            } else {
                thisInstance.stopRecording();
            }
        });

        saveOnDiskBtn.addEventListener('click', async function () {
            if (!window.showSaveFilePicker) {
                return;
            }
            try {
                const newHandle = await window.showSaveFilePicker({
                    suggestedName: _recorderState.recordingMetadata.fileName,
                    types: [{
                        description: 'Video recording',
                        accept: {
                            'video/webm': ['.webm'],
                            'video/mp4': ['.mp4']
                        }
                    }]
                });

                await moveRecordingToExternalFile(newHandle);

                Q.Dialogs.close(_lowQuotaDialog);
                _lowQuotaDialog = null;
            } catch (error) {
                console.error('showLowQuotaDuringRecordingDialog: save on disk failed or cancelled', error);
            }
        });
    }

    function moveRecordingToExternalFile(newHandle) {
        const oldRecordingsDir = _recordingsDir;
        const oldFileName = _fileHandle.name;

        return _writeChainPromise = _writeChainPromise.then(async function () {
            await _writableHandle.close();

            const oldFile = await _fileHandle.getFile();
            const newWritable = await newHandle.createWritable({ keepExistingData: false });

            await newWritable.write(await oldFile.arrayBuffer());

            _fileHandle = newHandle;
            _writableHandle = newWritable;
            _usingOPFS = false;

            _recorderState.recordingMetadata.fileHandle = _fileHandle;
            
            _localRecordingsDB.save(_recorderState.recordingMetadata, 'recordings').then(function (result) { });

            if (oldRecordingsDir) {
                try {
                    await oldRecordingsDir.removeEntry(oldFileName);
                } catch (error) {
                    console.error('moveRecordingToExternalFile: failed to remove old OPFS file', error);
                }
            }
        });
    }

    async function appendChunkToFile(typedArrayOrBuffer) {
        //console.log((performance.now() / 1000) + ' appendChunkToFile BEFORE', _writePosition, typedArrayOrBuffer.byteLength);
        _writableHandle.write(typedArrayOrBuffer);
        _writePosition += typedArrayOrBuffer.byteLength;
        _bytesSinceCommit += typedArrayOrBuffer.byteLength;
        //console.log((performance.now() / 1000) + ' appendChunkToFile AFTER', _writePosition);

        _recorderState.savedChunksNumber++;
        _recorderState.mediaRecorder.dispatchEvent(
            new CustomEvent("chunksaved", { detail: { chunk: typedArrayOrBuffer } })
        );

        if (_recorderState.state != 'stopped' && (_bytesSinceCommit >= 5 * 1024 * 1024 || Date.now() - _lastCommit > 10000)) {
            //console.warn((performance.now() / 1000) + ' commit')
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

        if (_usingOPFS) {
            await checkOpfsQuota();
        }
    }

    async function saveJson(fileName, data) {
        const fileHandle = await _recordingsDir.getFileHandle(fileName, {
            create: true
        });

        const writable = await fileHandle.createWritable();

        await writable.write(JSON.stringify(data, null, 2));

        await writable.close();
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

    const _audioOnly = !!(_codecs && _codecs.indexOf('audio/') === 0);

    function createRecorder(ondataavailable) {
        //codecs = getSupportedStreamingCodec();

        let originalMediaStream = _livestreamingTool.canvasComposer.getMediaStream();

        _mediaStream = originalMediaStream.clone();

        if (_audioOnly) {
            _mediaStream.getVideoTracks().forEach(function (track) {
                _mediaStream.removeTrack(track);
                track.stop();
            });
        }

        let mediaRecorderOptions = { mimeType: _codecs };
        if (_mediaStream.getAudioTracks().length) {
            mediaRecorderOptions.audioBitsPerSecond = options.audioBitrate ?? 128000;
        }
        if (_mediaStream.getVideoTracks().length) {
            mediaRecorderOptions.videoBitsPerSecond = options.videoBitrate ?? 2 * 1024 * 1024;
        }

        let mediaRecorder = new MediaRecorder(_mediaStream, mediaRecorderOptions);

        mediaRecorder.onerror = function (e) {
            console.error(e);
        }

        mediaRecorder.addEventListener('dataavailable', function (e) {
            //console.log('mediaRecorder: dataavailable', e, e.data.size);
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

            // Start converting to ArrayBuffer right away (parallel, for speed), but
            // chain the actual file append onto _writeChainPromise so chunks are
            // written in the order they were produced, not in the order their
            // (variable-duration) blob.arrayBuffer() conversion happens to resolve.
            let bufferPromise = blob.arrayBuffer();

            _writeChainPromise = _writeChainPromise
                .then(function () {
                    return bufferPromise;
                })
                .then(function (buffer) {
                    return appendChunkToFile(buffer);
                })
                .catch(function (error) {
                    console.error('appendChunkToFile failed', error);
                });
        });
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
            if (_codecs && _codecs.includes('mp4')) {
                extension = _audioOnly ? 'm4a' : 'mp4';
            } else if (_codecs && _codecs.includes('webm')) {
                extension = _audioOnly ? 'weba' : 'webm';
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
                await initOpfsDir();
            }

            await saveJson(metadata.fileName + '.json', metadata);

            if (_usingOPFS) {
                await initOpfsFile();
            } else {
                await initExternalFile();
            }

            _recorderState.recordingMetadata.fileHandle = _fileHandle;
            /* try {
                startMediaRecorder();
            } catch (error) {
                reject(error);
            }
            _recorderState.state = 'started';
            resolve(); */
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
        console.log('stopRecording');
        return new Promise(async function (resolve, reject) {
            console.log('stopRecording START');

            if (_lowQuotaDialog) {
                Q.Dialogs.close(_lowQuotaDialog);
                _lowQuotaDialog = null;
            }

            _recorderState.mediaRecorder.addEventListener('chunksaved', async function (e) {
                //console.log('mediaRecorder: chunksaved', _recorderState.savedChunksNumber, _recorderState.finalChunksNumber);

                //console.log((performance.now() / 1000) + ' stopRecording: chunksaved');
                //wait on last chunk to be saved
                if (_recorderState.savedChunksNumber < _recorderState.finalChunksNumber) {
                    return;
                }
                //console.log((performance.now() / 1000) + ' stopRecording: finish');

                if (cancel) return resolve();

                if (_recorderState != null) {
                    if (_writableHandle) await _writableHandle.close();
                    if (_usingOPFS) {
                        downloadFromOPFS();
                    }
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
            console.log('stopRecordingOnSever: stop recorder local', _recorderState.mediaRecorder.state);
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