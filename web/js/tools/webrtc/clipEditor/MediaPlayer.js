Q.Media.WebRTC.clipEditor.MediaPlayer = function () {
    const thisInstance = this;
    let _initSegment;
    let _fileHandle;
    let _mediaSource;
    let _sourceBuffer;
    let _mediaPlayer;
    let _parser;
    let _segmentsQueue = []
    this.bufferedSamples = []; //{ time, duration, offset, size, isKeyframe }
    this.currentTime;
    this.bufferedStartTime;
    this.bufferedEndTime;
    this.BUFFER_WINDOW;
    this.parser;

    const container = this.element = document.createElement('DIV');
    container.className = 'clip-editor-player';
    _mediaPlayer = this.videoPlayer = document.createElement('VIDEO');
    _mediaPlayer.muted = true;
    _mediaPlayer.controls = true;
    _mediaPlayer.className = 'clip-editor-player-media';
    _mediaPlayer.style.width = '100%';
    _mediaPlayer.style.aspectRatio = '16/9';
    _mediaPlayer.style.background = 'grey';
    container.appendChild(_mediaPlayer);

    _mediaPlayer.addEventListener('timeupdate', async function (e) {
        console.log('mediaPlayer event timeupdate START', _mediaPlayer.currentTime);
        //console.log('mediaPlayer buffered', _mediaPlayer.buffered.start(0), _mediaPlayer.buffered.end(0));
        const updated = await _parser.updateCurrentTime(_mediaPlayer.currentTime);
        thisInstance.needToBuffer = !updated;   
        console.log('mediaPlayer event timeupdate 2', updated, thisInstance.needToBuffer);
        const lastIndex = _mediaPlayer.buffered.length - 1;
        const start = _mediaPlayer.buffered.start(lastIndex);
        const end = _mediaPlayer.buffered.end(lastIndex);

        console.log('Last buffered range:', start, '→', end);   
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
        //console.log('appendSegment start');

        _segmentsQueue.push(fragment);
        processQueue();
    }

    function processQueue() {
        //console.log('processQueue start');
        //console.log('processQueue start', _sourceBuffer.updating);

        if (!_sourceBuffer || _sourceBuffer.updating) return;
        //console.log('processQueue start 2', _segmentsQueue.length);
        if (_segmentsQueue.length === 0) return;

        const segment = _segmentsQueue.shift();
        console.log('processQueue append', segment, _segmentsQueue);

        _sourceBuffer.appendBuffer(segment.data);
    }

    function handleParserEvents(){
        _parser.on('bufferingE');
    }

    this.setTime = function (time) {
        //this.parser.
    }

    this.openFile = function (fileHandle) {
        _mediaSource = new MediaSource();
        _mediaPlayer.src = URL.createObjectURL(_mediaSource);
        console.log('file: '+fileHandle.name+' ('+fmtBytes(fileHandle.size)+')','info');

        _parser = this.parser = new Q.Media.WebRTC.clipEditor.FMP4Parser(fileHandle, {
            onFragment: function (moofMdatPair) {
                //console.log('mediaSource event onFragment');
                //console.trace();
                appendSegment(moofMdatPair);
                console.log('mediaSource event onFragment', thisInstance, thisInstance.needToBuffer);

                if(thisInstance.needToBuffer) {
                    console.log('mediaSource event onFragment needToBuffer');

                    //const event = new Event('timeupdate', { bubbles: false });
                    //_mediaPlayer.dispatchEvent(new Event('timeupdate'));
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

                console.log(_parser.mimeType);        // ready
                console.log(_parser.initSegment);   // ArrayBuffer of ftyp+moov
                _sourceBuffer = _mediaSource.addSourceBuffer(_parser.mimeType);
                //_sourceBuffer.mode = 'sequence'

                _sourceBuffer.addEventListener('updateend', () => {
                    //console.log('processQueue updateend');

                    processQueue();
                });
                /* _sourceBuffer.addEventListener('update', () => {
                    console.log('processQueue update');
                });
                _sourceBuffer.addEventListener('updatestart', () => {
                    console.log('processQueue updatestart');
                }); */
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
                appendSegment({
                    data: _parser.initSegment
                });
                //console.log('_parser.flatMoofMdatPairs', _parser.flatMoofMdatPairs)

                //console.log('player: add buffer segments', _parser.flatMoofMdatPairs.length)
                //console.log('player: add buffer time', _parser.flatMoofMdatPairs[_parser.flatMoofMdatPairs.length - 1].time)
                /* for(let i in _parser.flatMoofMdatPairs) {
                                    //console.log('player: add buffer time', _parser.flatMoofMdatPairs[i].time)

                    //sourceBuffer.appendBuffer(_parser.flatMoofMdatPairs[i]);
                    appendSegment(_parser.flatMoofMdatPairs[i].data);
                     //processQueue();
                } */
                _parser.updateCurrentTime(0)
                _mediaPlayer.play();
            })

            // append part of it (NOT always safe unless properly segmented)
        });
        // step 1 — reads only until moov ends (≤ a few MB for most files)
        
        
    }

    this.replaceFile = function () {

    }

    this.setStartPositionr = function () {

    }

    this.setEndPositionr = function () {

    }


    function fmtBytes(b) {
        if (b < 1024) return b + ' B';
        if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
        return (b / 1048576).toFixed(1) + ' MB';
    }
}