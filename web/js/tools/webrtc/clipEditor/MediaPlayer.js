Q.Media.WebRTC.clipEditor.MediaPlayer = function () {
    const thisInstance = this;
    let _initSegment;
    let _fileHandle;
    let _mediaSource;
    let _sourceBuffer;
    let _mediaPlayer;
    let _parser;
    let _segmentsQueue = [];
    this.bufferedSamples = []; //{ time, duration, offset, size, isKeyframe }
    this.currentTime;
    this.bufferedStartTime;
    this.bufferedEndTime;
    this.BUFFER_WINDOW;
    this.parser;
    //When users rewinds the video, It may take some time from the time user rewinds to the time when new data is appended to the source buffer.
    //So we need to prevent race conditions when user rewinds multiple times in a row. For this, we should track from what fetch session ("rewind" session) chunk is appended to the source buffer
    this.fetchSession = {
        sessionId: null,
        state: null, //initFetch, regularFetch
    };
    this.onBeforeFragmentAppend = [];
    this.bufferedFragments = new Map();
    this.eventDispatcher = new Q.Media.WebRTC.EventSystem();

    const container = this.element = document.createElement('DIV');
    container.className = 'clip-editor-player';
    _mediaPlayer = this.videoPlayer = document.createElement('VIDEO');
    _mediaPlayer.muted = true;
    _mediaPlayer.controls = false;
    _mediaPlayer.className = 'clip-editor-player-media';
    container.appendChild(_mediaPlayer);

    _mediaPlayer.addEventListener('timeupdate', async function (e) {
        console.log('mediaPlayer event timeupdate START', _sourceBuffer.timestampOffset, _mediaPlayer.currentTime, _mediaPlayer.duration);
        thisInstance.currentTime = _mediaPlayer.currentTime;
        thisInstance.eventDispatcher.dispatch('timeupdate', { currentTime: _mediaPlayer.currentTime });
        //console.log('mediaPlayer buffered', _mediaPlayer.buffered.start(0), _mediaPlayer.buffered.end(0));
        const updated = await _parser.updateCurrentTime(_mediaPlayer.currentTime, null, { fetchSessionInfo: thisInstance.fetchSession });
        thisInstance.needToBuffer = !updated;
        console.log('mediaPlayer event timeupdate 2', _mediaPlayer.duration, _mediaPlayer.buffered, updated, thisInstance.needToBuffer);
        if (_mediaPlayer.buffered.length != 0) {
            for (let i = 0; i <= _mediaPlayer.buffered.length - 1; i++) {
                const start = _mediaPlayer.buffered.start(i);
                const end = _mediaPlayer.buffered.end(i);

                console.log('Last buffered range:', i, start, '→', end);
            }

        }
    })

    _mediaPlayer.addEventListener('loadedmetadata', async function (e) {
        console.log('mediaPlayer event loadedmetadata START', e);
    })
    _mediaPlayer.addEventListener('loadedmetadata', async function (e) {
        console.log('mediaPlayer event loadedmetadata START', e);
    })
    _mediaPlayer.addEventListener('canplay', async function (e) {
        console.log('mediaPlayer event canplay START', e);
    })
    _mediaPlayer.addEventListener('play', async function (e) {
        thisInstance.eventDispatcher.dispatch('play');
    })
    _mediaPlayer.addEventListener('pause', async function (e) {
        thisInstance.eventDispatcher.dispatch('pause');
    })
    _mediaPlayer.addEventListener('volumechange', async function (e) {
        thisInstance.eventDispatcher.dispatch('volumechange', { volume: _mediaPlayer.volume, muted: _mediaPlayer.muted });
    })
    _mediaPlayer.addEventListener('durationchange', async function (e) {
        console.log('mediaPlayer event durationchange START', _mediaPlayer.duration);
    })
    _mediaPlayer.addEventListener('ended', async function (e) {
        console.log('mediaPlayer event ended START', e);
    })
    _mediaPlayer.addEventListener('error', async function (e) {
        console.error('mediaPlayer event error START', e);
    })
    _mediaPlayer.addEventListener('stalled', async function (e) {
        console.log('mediaPlayer event stalled START', e);
    })
    _mediaPlayer.addEventListener('waiting', async function (e) {
        console.log('mediaPlayer event waiting START', e);
    })

    function appendSegment(fragment) {
        console.log('appendSegment START', fragment);
        if(fragment.fetchSessionId != thisInstance.fetchSession.sessionId){
            console.error('Fetch sessions do not match', fragment.fetchSessionId, thisInstance.fetchSession.sessionId);
            return Promise.reject('Fetch sessions do not match');
        }
        //allow adding only init fragments that were produced during setTime method

        _segmentsQueue.push(fragment);
        processQueue();
        return Promise.resolve();
    }

    async function processQueue() {
        //console.log('processQueue start');
        console.log('processQueue start', _sourceBuffer.updating, _segmentsQueue);

        if (!_sourceBuffer || _sourceBuffer.updating) return;

        console.log('processQueue start 2', _segmentsQueue.length);
        if (_segmentsQueue.length === 0) {
            console.log('processQueue empty');

            return;
        }

        const segment = _segmentsQueue[0];
        console.log('processQueue start 3', _segmentsQueue.length);

        if(segment.fetchSessionId != thisInstance.fetchSession.sessionId){
            console.error('Fetch sessions do not match', segment.fetchSessionId, thisInstance.fetchSession.sessionId);

            return;
        }

        _segmentsQueue.shift();
        console.log('processQueue append START', segment);

        if (segment.lastPair) { //wait until last pair from this fetch session is added so there is enoght data to play and we can resolve setTime()
            for (let i = thisInstance.onBeforeFragmentAppend.length - 1; i >= 0; i--) {
                console.log('processQueue before append', thisInstance.onBeforeFragmentAppend[i]);
                thisInstance.onBeforeFragmentAppend[i].handler(segment);
                if (thisInstance.onBeforeFragmentAppend[i].once) thisInstance.onBeforeFragmentAppend.splice(i, 1);
            }

            if (segment.setTimeFragment) {
                thisInstance.eventDispatcher.dispatch('initFragmetAppend');
            }
        }
       

        console.log('processQueue append', segment);

        _sourceBuffer.appendBuffer(segment.data);
    }

    function isTimeBuffered(video, time, epsilon = 0.05) {
        const buffered = video.buffered;

        for (let i = 0; i < buffered.length; i++) {
            if (
                time >= buffered.start(i) - epsilon &&
                time <= buffered.end(i) + epsilon
            ) {
                return true;
            }
        }

        return false;
    }

    function handleParserEvents() {
        //_parser.on('bufferingE');
    }

    this.play = function () {
        console.log('player action play')
        _mediaPlayer.play();
    }
    this.pause = function () {
        console.log('player action pause')
        _mediaPlayer.pause();
    }

    this.playOrPause = function () {
        if (_mediaPlayer.paused) {
            _mediaPlayer.play();
        } else {
            _mediaPlayer.pause();
        }
    }

    this.getVolume = function () {
        return _mediaPlayer.volume;
    }

    this.setVolume = function (value) {
        return _mediaPlayer.volume = value;
    }

    this.getMuted = function () {
        return _mediaPlayer.muted;
    }

    this.setMuted = function (value) {
        return _mediaPlayer.muted = value;
    }

    this.toggleMuted = function () {
        if (_mediaPlayer.muted) {
            _mediaPlayer.muted = false;
        } else {
            _mediaPlayer.muted = true;
        }
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).replace(/\./g, "");
    }

    this.playFromTime = function(value) {
        _mediaPlayer.currentTime = value;
    }

    this.createClip = function (startTime, endTime) {
        return thisInstance.parser.createClip(startTime, endTime);
    }

    this.setTime = function (time) {
        let sessionId = generateId();
        //console.log('setTime START', time, sessionId)

        function addInitSegment(fetchSessionObject) {
            //console.log('addInitSegment START', fetchSessionObject.sessionId)

            return new Promise(function (resolve, reject) {
                if (_sourceBuffer.updating) {
                    //console.error('Wrong state of source buffer. Apped init segment only after the buffer is removed and when .updating is false');
                    return reject('Wrong state of source buffer. Apped init segment only after the buffer is removed and when .updating is false');
                }

                function onInitSegmentAdded() {
                    _sourceBuffer.removeEventListener('updateend', onInitSegmentAdded);
                    resolve();
                    return;
                }

                _sourceBuffer.addEventListener('updateend', onInitSegmentAdded);

                return appendSegment({
                    data: _parser.initSegment,
                    setTimeFragment: true,
                    fetchSessionId: fetchSessionObject.sessionId
                });
            });
        }

        return new Promise(function (resolve, reject) {
            async function clearBufferAndPlay(fetchSessionObject) {
                //console.log('setTime _sourceBuffer.updating 1', _sourceBuffer.updating, fetchSessionObject.sessionId)

                if (_sourceBuffer) {
                    _sourceBuffer.abort();
                    //console.log('setTime _sourceBuffer.updating 2', _sourceBuffer.updating, fetchSessionObject.sessionId)
                    //_sourceBuffer.remove sets _sourceBuffer.updating to true


                    async function onBufferRemoved(e) {
                        //console.log('onBufferRemoved START', fetchSessionObject.sessionId);
                        //console.log('onBufferRemoved e', e);

                        if (fetchSessionObject.sessionId != thisInstance.fetchSession.sessionId) {
                            //console.error('01 Fetch sessions do not match', fetchSessionObject.sessionId, thisInstance.fetchSession.sessionId);
                            return reject('Fetch sessions do not match');
                        }
                        _sourceBuffer.removeEventListener('updateend', onBufferRemoved);
                        //console.log('onBufferRemoved 1', fetchSessionObject.sessionId);

                        try {
                            await addInitSegment(fetchSessionObject);
                        } catch (error) {
                            //console.error('Error while adding init fragment');

                            return reject(error.message);
                        }
                        //console.log('onBufferRemoved 2', fetchSessionObject.sessionId);

                        /* if (_sourceBuffer.updating) {
                            console.error('02 Wrong state of source buffer', _sourceBuffer.updating, fetchSessionObject.sessionId);
                            return reject();
                        } */
                        //console.log('onBufferRemoved 3', fetchSessionObject.sessionId);

                        if (fetchSessionObject.sessionId != thisInstance.fetchSession.sessionId) {
                            //console.error('03 Fetch sessions do not match', fetchSessionObject.sessionId, thisInstance.fetchSession.sessionId);
                            return reject();
                        }
                        //console.log('onBufferRemoved 4', fetchSessionObject.sessionId);

                        //_mediaPlayer.addEventListener('canplay', moveCurrentTime)

                        //console.log('onBufferRemoved 5', fetchSessionObject.sessionId);
                        thisInstance.onBeforeFragmentAppend.push({
                            handler: moveCurrentTime,
                            once: true,
                        });
                        //console.log('onBufferRemoved 6', fetchSessionObject.sessionId);

                        let keyframe = await thisInstance.parser.setCurrentTime(time, fetchSessionObject);

                        async function moveCurrentTime(fragment) {
                            //console.log('moveCurrentTime start', fragment, fetchSessionObject.sessionId)

                            if (fragment.fetchSessionId != fetchSessionObject.sessionId) {
                                //console.error('04 Fetch sessions do not match', fragment.fetchSessionId, fetchSessionObject.sessionId);
                                return reject();
                            }

                            if(fragment.lastPair !== true) {
                                return;
                            }
                            //_sourceBuffer.removeEventListener('updateend', moveCurrentTime);

                            //console.log('setTime _sourceBuffer.updating 4', _sourceBuffer.updating, fetchSessionObject.startKeyframe.time, fetchSessionObject.sessionId)
                            //_sourceBuffer.timestampOffset = keyframe.time;
                            _mediaPlayer.currentTime = fetchSessionObject.startKeyframe.time;
                            //_mediaPlayer.currentTime = 0;
                            //_sourceBuffer.timestampOffset = 0;
                            //console.log('setTime _sourceBuffer.updating 5', _mediaPlayer.seekable, _mediaPlayer.duration, _mediaPlayer.currentTime, fetchSessionObject.startKeyframe.time, _sourceBuffer.timestampOffset, fetchSessionObject.sessionId)

                            resolve();
                        }
                        

                        /* if (_sourceBuffer.updating) {
                            thisInstance.onBeforeFragmentAppend.push({
                                handler: moveCurrentTime,
                                once: true,
                            });
                        } else {
                            moveCurrentTime();
                        } */




                        //_mediaPlayer.play();
                    }
                    //_sourceBuffer.addEventListener('updatestart', perndingRemoving);
                    if(_sourceBuffer.buffered.length !== 0) {
                        //console.log('setTime _sourceBuffer.updating 3', _sourceBuffer.updating, sessionId)

                        _sourceBuffer.addEventListener('updateend', onBufferRemoved);
                        _sourceBuffer.remove(0, Infinity);
                    } else {
                        //console.log('setTime _sourceBuffer.updating 4', _sourceBuffer.updating, sessionId)
                        onBufferRemoved();
                    }
                    //console.log('setTime _sourceBuffer.updating 5', _sourceBuffer.updating, sessionId)
                }
            }

            let newFetchSession = {
                sessionId: sessionId,
                state: 'initFetch',
                pendingTimeToSet: time
            };
            _segmentsQueue = [];
            thisInstance.fetchSession = newFetchSession;
            thisInstance.parser.fetchSession = newFetchSession; //this cancels current fetch session in the parser

            function initFetchSession() {
                //console.log('initFetchSession START', _sourceBuffer.updating);
                if(newFetchSession.sessionId != thisInstance.fetchSession.sessionId) {
                    //console.error('05 Fetch sessions do not match', newFetchSession.sessionId, thisInstance.fetchSession.sessionId);
                    return reject();
                }
                _sourceBuffer.removeEventListener('updateend', initFetchSession);
                //console.log('initFetchSession newFetchSession', newFetchSession);

                clearBufferAndPlay(newFetchSession);
            }

            //_mediaPlayer.pause();
            
            if (!_sourceBuffer.updating) {
                initFetchSession();
            } else {
                _sourceBuffer.addEventListener('updateend', initFetchSession);
            }
        });

    }

    this.openFile = function (fileHandle) {
        return new Promise(function (resolve, reject) {
            _mediaSource = new MediaSource();
            _mediaPlayer.src = URL.createObjectURL(_mediaSource);
            console.log('file: ' + fileHandle.name + ' (' + fmtBytes(fileHandle.size) + ')', 'info');

            //_parser = thisInstance.parser = new Q.Media.WebRTC.clipEditor.RegularMP4Parser(fileHandle, {
            _parser = thisInstance.parser = new Q.Media.WebRTC.clipEditor.RegularMP4Parser(fileHandle, {
                onFragment: function (moofMdatPair) {
                    console.log('mediaSource event onFragment', moofMdatPair);
                    //console.trace();
                    if (moofMdatPair.fetchSessionId != thisInstance.fetchSession.sessionId) {
                        return;
                    }
                    //if(!thisInstance.bufferedFragments.has)
                    appendSegment(moofMdatPair);
                    //console.log('mediaSource event onFragment', thisInstance, thisInstance.needToBuffer);

                    if (thisInstance.needToBuffer) {
                        //console.log('mediaSource event onFragment needToBuffer');

                        //const event = new Event('timeupdate', { bubbles: false });
                        //_mediaPlayer.dispatchEvent(new Event('timeupdate'));
                    }
                    if (_mediaPlayer.buffered.length != 0) {
                        for (let i = 0; i <= _mediaPlayer.buffered.length - 1; i++) {
                            const start = _mediaPlayer.buffered.start(i);
                            const end = _mediaPlayer.buffered.end(i);

                            console.log('Last buffered range:', i, start, '→', end);
                        }

                    }
                }
            });

            _mediaSource.addEventListener('sourceclose', (e) => {
                console.error('mediaSource event error', e);
            });

            _mediaSource.addEventListener('sourceended', () => {
                console.log('mediaSource event sourceended');
            });
            _mediaSource.addEventListener('timeupdate', (e) => {
                console.log('mediaSource event timeupdate', e);
            });
            _mediaSource.addEventListener('sourceopen', async () => {

                _parser.init().then(async function () {
                    console.log('PARSED INFO', _parser);        // ready

                    console.log('_parser.initSegment type', _parser.mimeType);        // ready
                    console.log('_parser.initSegment', _parser.initSegment);   // ArrayBuffer of ftyp+moov
                    _sourceBuffer = _mediaSource.addSourceBuffer(_parser.mimeType);
                    //_sourceBuffer.mode = 'sequence'

                    _sourceBuffer.addEventListener('updateend', (e) => {
                        console.log('sourceBuffer event updateend', e);

                        processQueue();
                    });
                    _sourceBuffer.addEventListener('update', (e) => {
                        console.log('sourceBuffer event update', e);
                    });
                    _sourceBuffer.addEventListener('updatestart', (e) => {
                        console.log('sourceBuffer event updatestart', e);
                    });
                    _sourceBuffer.addEventListener('abort', (e) => {
                        console.error('sourceBuffer event abort', e);
                    });
                    _sourceBuffer.addEventListener('error', (e) => {
                        console.error('sourceBuffer event error', e);
                    });

                    /* _mediaSource.addEventListener('updateend', () => {
                        console.log('updateend');
                    }); */

                    // step 2 — scan the rest for segment boundaries (optional, lazy)
                    //await _parser.setCurrentTime();
                    //sourceBuffer.appendBuffer(_parser.initSegment);
                    console.log('player: add init segment', _parser.initSegment)
                    /* appendSegment({
                        data: _parser.initSegment
                    }); */
                    //console.log('_parser.flatMoofMdatPairs', _parser.flatMoofMdatPairs)

                    //console.log('player: add buffer segments', _parser.flatMoofMdatPairs.length)
                    //console.log('player: add buffer time', _parser.flatMoofMdatPairs[_parser.flatMoofMdatPairs.length - 1].time)
                    /* for(let i in _parser.flatMoofMdatPairs) {
                                        //console.log('player: add buffer time', _parser.flatMoofMdatPairs[i].time)
    
                        //sourceBuffer.appendBuffer(_parser.flatMoofMdatPairs[i]);
                        appendSegment(_parser.flatMoofMdatPairs[i].data);
                         //processQueue();
                    } */
                    //_parser.updateCurrentTime(0)
                    _mediaPlayer.play();

                    resolve();
                })

                // append part of it (NOT always safe unless properly segmented)
            });
            // step 1 — reads only until moov ends (≤ a few MB for most files)
        });

    }

    this.replaceFile = function () {

    }

    this.on = function (event, handler) {
        thisInstance.eventDispatcher.on(event, handler);
    }


    function fmtBytes(b) {
        if (b < 1024) return b + ' B';
        if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
        return (b / 1048576).toFixed(1) + ' MB';
    }
}