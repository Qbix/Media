Q.Media.WebRTC.clipEditor.MediaPlayer = function () {
    let _initSegment;
    let _fileHandle;
    let _mediaSource;
    let _sourceBuffer;
    let _mediaPlayer;
    let _segmentsQueue = []
    this.bufferedSamples = []; //{ time, duration, offset, size, isKeyframe }
    this.currentTime;
    this.bufferedStartTime;
    this.bufferedEndTime;
    this.BUFFER_WINDOW;

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

    _mediaPlayer.addEventListener('timeupdate', function (e) {
        console.log('mediaPlayer event timeupdate', _mediaPlayer.currentTime);
        //console.log('mediaPlayer buffered', _mediaPlayer.buffered.start(0), _mediaPlayer.buffered.end(0));
        
        
    })

    function appendSegment(data) {
        _segmentsQueue.push(data);
        processQueue();
    }

    function processQueue() {
        //console.log('processQueue start');
        //console.log('processQueue start', _sourceBuffer.updating);

        if (_sourceBuffer.updating) return;
        //console.log('processQueue start 2', _segmentsQueue.length);
        if (_segmentsQueue.length === 0) return;

        const segment = _segmentsQueue.shift();
        //console.log('processQueue append', _sourceBuffer);

        _sourceBuffer.appendBuffer(segment);
    }

    this.openFile = function (fileHandle) {
        _mediaSource = new MediaSource();
        _mediaPlayer.src = URL.createObjectURL(_mediaSource);
        console.log('file: '+fileHandle.name+' ('+fmtBytes(fileHandle.size)+')','info');

        var parser = new Q.Media.WebRTC.clipEditor.FMP4Parser(fileHandle);

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
           
            parser.init().then(async function () {
                console.log('PARSED INFO', parser);        // ready

                console.log(parser.mimeType);        // ready
                console.log(parser.initSegment);   // ArrayBuffer of ftyp+moov
                _sourceBuffer = _mediaSource.addSourceBuffer(parser.mimeType);
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
                await parser.setCurrentTime();
                //sourceBuffer.appendBuffer(parser.initSegment);
                //console.log('player: add init segment', parser.initSegment)
                appendSegment(parser.initSegment);
                //console.log('parser.flatMoofMdatPairs', parser.flatMoofMdatPairs)

                //console.log('player: add buffer segments', parser.flatMoofMdatPairs.length)
                console.log('player: add buffer time', parser.flatMoofMdatPairs[parser.flatMoofMdatPairs.length - 1].time)
                for(let i in parser.flatMoofMdatPairs) {
                                    //console.log('player: add buffer time', parser.flatMoofMdatPairs[i].time)

                    //sourceBuffer.appendBuffer(parser.flatMoofMdatPairs[i]);
                    appendSegment(parser.flatMoofMdatPairs[i].data);
                     //processQueue();
                }
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