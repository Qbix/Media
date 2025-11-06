const Q = require('Q');
const fs = require('fs');
const child_process = require('child_process');
const path = require('path');
const appDir = path.dirname(require.main.filename) + '/../../';
const appName =  Q.Config.get(['Q','app']);

module.exports = function (socket, io) {
    var _debug = Q.Config.get(['Streams', 'webrtc', 'debug'], false);
    var _debug = true;
    var WebRTC = Q.plugins.Media.WebRTC;
    var nspName = '/webrtc';
    var webrtcNamespace = io.of(nspName);

    var _localMediaStream = null;
    var _chunksNum = 0;

    function processChunk(data, infoData, chunkNum, end, callback) {
        var parallelRecordings = infoData.parallelRecordings;
        var extension = infoData.extension;

        if (parallelRecordings.length != 0) {
            for (let i in parallelRecordings) {
                socket.webrtcParticipant.recording.parallelRecordings.push(parallelRecordings[i]);
            }
            //fs.writeFileSync(socket.webrtcParticipant.recording.parallelRecordingsFile, JSON.stringify(socket.webrtcParticipant.recording.parallelRecordings))
        }

        function writeToStream() {
            if (!end) {
                _localMediaStream.write(data, function () {
                    _chunksNum = chunkNum;
                    socket.webrtcParticipant.recording.latestChunkTime = Date.now();

                    fs.writeFileSync(socket.webrtcParticipant.recording.recordingInfo, JSON.stringify(socket.webrtcParticipant.recording))

                    if (callback != null) {
                        callback({
                            status: "ok"
                        });
                    }
                });
            } else {
                _localMediaStream.end(data, function () {
                    socket.webrtcParticipant.recording.stopTime = Date.now();
                    _chunksNum = chunkNum;

                    fs.writeFileSync(socket.webrtcParticipant.recording.recordingInfo, JSON.stringify(socket.webrtcParticipant.recording))

                    if (callback != null) {
                        callback({
                            status: "ok"
                        });
                    }


                });
            }


            let chunkStream = fs.createWriteStream(socket.webrtcParticipant.recording.path, {
                'flags': 'a',
                'encoding': null,
                'mode': '0666'
            });

            chunkStream.on('error', (e) => {
                console.log('ERROR', e)
            });
            chunkStream.on('error', () => {
                console.log('CLOSED')
            });
            chunkStream.on('finish', () => {
                console.log('FINISHED')
            });

            chunkStream.write(data, function () {

            });
        }

        if (_localMediaStream != null) {
            writeToStream();
        } else {
            var streamName = 'Media/webrtc/' + socket.roomId;
            Q.plugins.Streams.fetchOne(socket.userPlatformId, socket.roomPublisherId, streamName, function (err, stream) {
                if (err || !stream) {
                    return;
                }

                var localRecordDir = appDir + 'files/' + appName + '/uploads/Media/webrtc_rec/' + socket.roomId + '/' + stream.getAttribute('startTime') + '/' + socket.userPlatformId + '/' + socket.startTime;
                if (!fs.existsSync(localRecordDir)) {
                    var oldmask = process.umask(0);
                    fs.mkdirSync(localRecordDir, { recursive: true, mode: '0777' });
                    process.umask(oldmask);
                }
                let filePath = localRecordDir + '/audio.' + extension;
                _localMediaStream = fs.createWriteStream(filePath);
                _localMediaStream.on('error', (e) => {
                    console.log('ERROR', e)
                });
                _localMediaStream.on('error', () => {
                    console.log('CLOSED')
                });
                _localMediaStream.on('finish', () => {
                    console.log('FINISHED')
                });

                socket.webrtcParticipant.recording.startTime = Date.now();
                socket.webrtcParticipant.recording.path = filePath;
                socket.webrtcParticipant.recording.localRecordDir = localRecordDir;
                socket.webrtcParticipant.recording.recordingInfo = localRecordDir + '/../../' + socket.userPlatformId + '_' + socket.startTime + '.json';
                writeToStream();
            });

        }




    }

    socket.on('Media/webrtc/localMedia', processChunk);

    function processRecordings() {
        if (!socket.webrtcRoom) return;
        var recordings = (socket.webrtcRoom.participants.map(function (p) {
            p.recording.participant = p;
            return p.recording;
        })).filter(function (r) {
            return r.path != null ? true : false;
        })

        if (recordings.length == 0) return;

        var startRecording = recordings.reduce(function (prev, current) {
            return current.startTime < prev.startTime ? current : prev
        });

        recordings.sort(function (a, b) {
            if (a.stopTime - a.startTime > b.stopTime - b.startTime) {
                return -1;
            }
            if (a.stopTime - a.startTime < b.stopTime - b.startTime) {
                return 1;
            }
            return 0
        })

        //map parallel recordings info to recording path
        function getRecordingInstance(rec) {
            for (let r in socket.webrtcRoom.participants) {
                let participant = socket.webrtcRoom.participants[r];
                if (participant.username == rec.participant.username && participant.sid == rec.participant.sid) {
                    return participant.recording;
                }
            }
        }

        for (let r in recordings) {
            let currentRecording = recordings[r];
            for (let p in currentRecording.parallelRecordings) {
                let rec = currentRecording.parallelRecordings[p];
                rec.recordingInstance = getRecordingInstance(rec);
            }
        }


        //add recordings as ffmpeg inputs

        var inputsNum = 1;
        var inputsLet = 'a';
        var offsetFromFirstRec = 0;
        var offsets = [];
        var processedRecsToSkip = [];
        var offsetsIndexes = [];
        var inputs = [];
        inputs.push('-i', startRecording.path)
        processedRecsToSkip.push(startRecording.participant.username)
        var currentRecording = startRecording;
        /*while(currentRecording != null) {
            console.log('processRecordings: currentRecording', currentRecording);

            if(currentRecording.parallelRecordings.length == 0) {
                currentRecording = null;
                continue;
            }

            for(let p in currentRecording.parallelRecordings) {
                let paralelRec = currentRecording.parallelRecordings[p];
                console.log('processRecordings: parallelRecordings rec', paralelRec);

                if(processedRecsToSkip.indexOf(paralelRec.participant.username) != -1) {
                    continue;
                }

                inputs.push('-i', paralelRec.recordingInstance.path);
                inputsLet =  String.fromCharCode(inputsLet.charCodeAt(0) + 1);
                offsets.push('[' + inputsNum + ']adelay=' + (offsetFromFirstRec + parseFloat(paralelRec.time)) + '|' + (offsetFromFirstRec + parseFloat(paralelRec.time)) + '[' + inputsLet + ']');
                offsetsIndexes.push('[' + inputsLet + ']');
                inputsNum++;
                processedRecsToSkip.push(paralelRec.participant.username);
            }

            var parallelRecThatEndsLast = currentRecording.parallelRecordings.reduce(function(prev, current) {
                return current.recordingInstance.stopTime > prev.recordingInstance.stopTime ? current : prev
            });

            console.log('processRecordings: parallelRecThatEndsLast', parallelRecThatEndsLast);
            offsetFromFirstRec = parseFloat(offsetFromFirstRec) + parseFloat(parallelRecThatEndsLast.time);
            currentRecording = parallelRecThatEndsLast.stopTime > currentRecording.stopTime ? parallelRecThatEndsLast.recordingInstance : null;
            console.log('processRecordings: offsetFromFirstRec', offsetFromFirstRec);
        }*/

        var localRecordDir = appDir + 'files/' + appName + '/uploads/Media/webrtc_rec/' + socket.roomId + '/' + socket.roomStartTime;

        inputs.unshift('-y');

        var amix = '[0]';

        for (let i in offsetsIndexes) {
            amix += offsetsIndexes[i];
        }

        var delays = offsets.join(';');
        inputs.push('-filter_complex', delays + (delays != '' ? ';' : '') + amix + 'amix=inputs=' + inputsNum);
        inputs.push(
            //'-acodec', 'libmp3lame',
            //'-f', 'mp3',
            localRecordDir + '/audio.wav');
        return;
        ffmpeg = child_process.spawn('ffmpeg', inputs);
        ffmpeg.on('close', (code, signal) => {
            console.log('FFmpeg child process closed, code ' + code + ', signal ' + signal);
            ffmpeg = null;
        });
        ffmpeg.stdin.on('error', (e) => {
            console.log('FFmpeg STDIN Error', e);
        });
        ffmpeg.stderr.on('data', (data) => {
            console.log('FFmpeg STDERR:', data.toString());
        });
    }

    socket.on('disconnect', function () {
        if (socket.webrtcParticipant && socket.webrtcParticipant.id == socket.id) {
            socket.webrtcParticipant.online = false;
            if (socket.webrtcParticipant.recording.stopTime == null) {
                socket.webrtcParticipant.recording.stopTime = socket.webrtcParticipant.recording.latestChunkTime;
            }
            socket.webrtcRoom.event.dispatch('participantDisconnected', socket.webrtcParticipant);
        }
        if (socket.webrtcRoom != null) {
            io.of('/webrtc').in(socket.webrtcRoom.id).fetchSockets().then(function (clients) {
                if (clients.length == 0) {
                    processRecordings();
                    //socket.webrtcRoom.close();
                }
            });
        }
    });
};