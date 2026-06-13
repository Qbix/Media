Q.Media.WebRTC.livestreaming.UserSpeechRecognizer = function (options) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.error("SpeechRecognition not supported in this browser");
        return;
    }

    let _audioTrack = options.audioTrack;
    let _participant = options.participant;
    let _userId = _participant?.identity?.split('\t')[0]
    let _audioContext;
    let _addedTracks = new Map();
    let _destinationNode;
    let _localRecordingsDB = null;

    /* let syncWithAudioTracksDebouncer = Q.debounce(function () {
        syncWithAudioTracks();
    }, 500); */

    const recognition = new SpeechRecognition();

    // ===== CONFIG =====
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = options?.lang || ''; // default browser language

    // ===== STATE =====

    this.state = 'inactive';
    let recordingStartTime = options.startTimeSinceOrigin;
    let captions = [];
    let previousSegment = null;
    let currentSegment = null;
    let speechStartTime = null;

    function Segment({ text, start }) {
        this.userId = _userId;
        this.displayName = _participant.username;
        this.text = text != null ? text : '';
        this.start = start;
        this.end = null;
    }

    loadIndexedDbAPI();

    async function loadIndexedDbAPI() {
        if (!_localRecordingsDB) {
            _localRecordingsDB = await Q.Media.WebRTC.livestreaming.initRecordingsDB();
        }
    }

    function now() {
        return performance.now() - recordingStartTime;
    }

    function formatTime(ms, timeSeparator) {
        const totalSeconds = Math.floor(ms / 1000);
        const msPart = Math.floor(ms % 1000);

        const s = totalSeconds % 60;
        const m = Math.floor(totalSeconds / 60) % 60;
        const h = Math.floor(totalSeconds / 3600);

        return (
            String(h).padStart(2, '0') + ":" +
            String(m).padStart(2, '0') + ":" +
            String(s).padStart(2, '0') + timeSeparator +
            String(msPart).padStart(3, '0')
        );
    }

    // ===== EVENTS =====

    recognition.addEventListener('speechstart', function () {
        speechStartTime = now();

        if (!currentSegment) {
            currentSegment = new Segment({
                start: speechStartTime,
                text: ""
            });
        }
    });

    recognition.addEventListener('result', function (event) {
        if(_participant.isLocal && _participant.localMediaControlsState.mic == false) return;
        if(this.state == 'inactive') return; //result events can still fire after you call SpeechRecognition.stop(), so we should stop adding new captions after recording is stopped

        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const text = result[0].transcript;

            if (!currentSegment) {
                currentSegment = new Segment({
                    start: speechStartTime != null ? speechStartTime : now(),
                    text: ""
                });
            }
            
            if (result.isFinal) {
                if(text != null) currentSegment.text += text;
                currentSegment.end = now();
                
                if (currentSegment.end != currentSegment.start) {
                    captions.push(currentSegment);
                    if(options.onSegment) {
                        options.onSegment({
                            formatted: formatTime(currentSegment.start, ',') + " --> " + formatTime(currentSegment.end || now(), ',') + "\n" +  currentSegment.text.trim() + "\n\n",
                            segment: currentSegment
                        });
                    }
                    previousSegment = currentSegment;
                    speechStartTime = null;
                    currentSegment = null;
                }
                
            } else {
                interimTranscript += text;
            }
        }

        // optional callback
        if (options?.onResult) {
            options.onResult({
                interim: interimTranscript,
                captions
            });
        }

    });

    recognition.addEventListener('speechend', function () {
        if (currentSegment) {
            currentSegment.end = now();
            captions.push(currentSegment);
            currentSegment = null;
        }
    });

    recognition.addEventListener('error', function (event) {
        if (options?.onError) {
            options.onError(event);
        }
    });

    recognition.addEventListener('start', function (event) {
        syncWithAudioTracks();
    });

    recognition.addEventListener('end', function () {
        _addedTracks = new Map();
        if (options?.autoRestart) {
            try {
                recognition.start();
            } catch (e) {
                console.warn("Restart failed:", e);
            }
        }

        if (options?.onEnd) {
            options.onEnd();
        }
    });

    function startListenOnTracks() {
        _participant.eventDispatcher.on('trackAdded', syncWithAudioTracks);
    }

    function stopListenOnTracks() {
        _participant.eventDispatcher.off('trackAdded', syncWithAudioTracks);
    }

    function syncWithAudioTracks() {
        if (!_audioTrack) {
            generateDestination();
        }

        let webrtcAudioTracks = _participant.audioTracks({ readyState: 'live' });
        for (let i in webrtcAudioTracks) {
            const track = webrtcAudioTracks[i];
            if (_addedTracks.has(track.id)) continue;
            const stream = new MediaStream([track.mediaStreamTrack]);
            const source = _audioContext.createMediaStreamSource(stream);
            source.connect(_destinationNode);
            let newTrackObject = _addedTracks.set(track.mediaStreamTrack.id, {
                trackInstance: track,
                stream: stream,
                mediaStreamTrack: track.mediaStreamTrack,
                source: source
            });

            track.mediaStreamTrack.addEventListener('ended', syncWithAudioTracks);
        }

        for (const [key, value] of _addedTracks) {
            let trackIsInactive = webrtcAudioTracks.indexOf(value.trackInstance) === -1;
            if (trackIsInactive) {
                _addedTracks.delete(key);
            }
        }
    }

    function generateDestination(recreate) {
        if (_audioContext == null || recreate) {
            _audioContext = Q.Media.WebRTC.audioContext != null ? Q.Media.WebRTC.audioContext : new AudioContext({
                //sampleRate: 44100, //commented because of Firefox error: "DOMException: AudioContext.createMediaStreamSource: Connecting AudioNodes from AudioContexts with different sample-rate is currently not supported"
                latencyHint: 'interactive'
            });
        }
        if (_destinationNode == null || recreate) {
            _destinationNode = _audioContext.createMediaStreamDestination();
            if (_destinationNode && _destinationNode.stream.getTracks().length != 0) {
                _audioTrack = _destinationNode.stream.getTracks()[0];
            }
        }
    }

    function disconnectDestination() {
        _destinationNode.disconnect();
        _destinationNode.stream.getTracks().forEach(track => track.stop());
        _audioTrack = null;
    }

    // ===== API =====

    this.start = function () {
        captions = [];
        previousSegment = null;
        currentSegment = null;
        speechStartTime = null;
        startListenOnTracks()
        syncWithAudioTracks();

        if(!_audioTrack) {
            throw new Error('Error while starting speech speech recognizer');

        }
        recognition.start(_audioTrack);
        this.state = 'active';
    };

    this.stop = function () {
        stopListenOnTracks()
        recognition.stop()
        
        disconnectDestination();
        _addedTracks = new Map();
        //recordingStartTime = null;
        //captions = [];
        previousSegment = null;
        currentSegment = null;
        speechStartTime = null;
        this.state = 'inactive';
    };

    this.getCaptions = function () {
        return captions;
    };

    this.exportSRT = function () {
        return captions.map((c, i) => {
            return (
                (i + 1) + "\n" +
                formatTime(c.start, ',') + " --> " + formatTime(c.end || now(), ',') + "\n" +
                c.text.trim() + "\n"
            );
        }).join("\n");
    };

    this.exportWebVTT = function () {
        return captions.map((c, i) => {
            return (
                formatTime(c.start, '.') + " --> " + formatTime(c.end || now(), '.') + "\n" +
                c.text.trim() + "\n"
            );
        }).join("\n");
    };

    this.saveToIndexedDB = function (recordingId) {
        return _localRecordingsDB.save({
            recordingId: recordingId, 
            captions: this.exportSRT()
        }, 'captions').then(function (result) {
            
        });
    };
};