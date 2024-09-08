const Q = require('Q');
const fs = require('fs');
const path = require('path');
const appDir = path.dirname(require.main.filename) + '/../../';
const appName =  Q.Config.get(['Q','app']);

module.exports = function (io) {
    var _debug = Q.Config.get(['Streams', 'webrtc', 'debug'], false);
    var _debug = true;
    var WebRTC = Q.plugins.Media.WebRTC;
    var nspName = '/webrtc';
    var webrtcNamespace = io.of(nspName);

    webrtcNamespace.on('connection', function (socket) {
        if (_debug) console.log('streaming: made sockets connection', socket.id);

        if (!socket.handshake.query.recording) return;

        if (_debug) console.log('made sockets connection (LIVE STREAMING)', socket.id);
        var usersInfo = JSON.parse(socket.handshake.query.localInfo);
        var recordingStreamData = socket.handshake.query.recordingStream ? JSON.parse(socket.handshake.query.recordingStream) : null;

        let userId = socket.handshake.query.userId;
        let userConnectedTime = socket.handshake.query.userConnectedTime;
        let roomStartTime = socket.handshake.query.roomStartTime;
        let roomId = socket.handshake.query.roomId;
        let recordingStartTime = socket.handshake.query.recordingStartTime;

        var projectFiles = appDir + 'files/' + appName;
        let localRecordDir = '/uploads/Media/recordings/' + roomId + '/' + roomStartTime + '/' + userId + '/' + recordingStartTime;
        let filePath = projectFiles + localRecordDir;
        if (!fs.existsSync(projectFiles + localRecordDir)) {
            var oldmask = process.umask(0);
            mkdirp(projectFiles + localRecordDir);
            process.umask(oldmask);
        }

        if(socket.handshake.query.recording && recordingStreamData && recordingStreamData.publisherId != null && recordingStreamData.streamName != null) {
            postStartMessage(recordingStreamData);
        }

        function mkdirp(dir) {
            if (fs.existsSync(dir)) { return true }
            const dirname = path.dirname(dir)
            mkdirp(dirname);
            fs.mkdirSync(dir);
        }

        socket.on('Media/webrtc/videoData', function (data, callback) {
            //console.log(socket.id + ' VIDEODATA', data);
            fs.writeFile(filePath + '/' + data.timestamp, data.blob, function (err) {
                if(err) {
                    console.error(err);
                }
                if(callback) callback({ message: err ? "failure" : "success" });
            });
        });

        socket.on('disconnect', function () {
            postStopMessage(recordingStreamData);
        });

        function postStartMessage(livestreamOrRecordingStream) {

            Q.plugins.Streams.fetchOne(livestreamOrRecordingStream.publisherId, livestreamOrRecordingStream.publisherId, livestreamOrRecordingStream.streamName, function (err, stream) {
                if (err || !stream) {
                    console.log('No livestream stream found with next publisherId and streamName', livestreamOrRecordingStream.publisherId, livestreamOrRecordingStream.streamName);
                    return;
                }
                let existingPaths = stream.getAttribute('paths');
                if (!existingPaths) {
                    existingPaths = [];
                }
                existingPaths.push({ path: localRecordDir });
                stream.setAttribute('paths', existingPaths);
                stream.save();

                stream.post(livestreamOrRecordingStream.publisherId, {
                    type: 'Media/recording/start'
                }, function (err) {
                    if (err) {
                        console.log('Something went wrong when posting to stream with next publisherId and streamName', livestreamOrRecordingStream.publisherId, livestreamOrRecordingStream.streamName)
                        return;
                    }
                });

            });
        }

        function postStopMessage(livestreamOrRecordingStream) {
            Q.plugins.Streams.fetchOne(livestreamOrRecordingStream.publisherId, livestreamOrRecordingStream.publisherId, livestreamOrRecordingStream.streamName, function (err, stream) {
                if (err || !stream) {
                    console.log('No livestream stream found with next publisherId and streamName', livestreamOrRecordingStream.publisherId, livestreamOrRecordingStream.streamName);
                    return;
                }

                stream.post(livestreamOrRecordingStream.publisherId, {
                    type: 'Media/recording/stop'
                }, function (err) {
                    if (err) {
                        console.log('Something went wrong when posting to stream with next publisherId and streamName', livestreamOrRecordingStream.publisherId, livestreamOrRecordingStream.streamName)
                        return;
                    }
                });
            });
        }
    });

    function log() {
        if (_debug === false) return;
        var args = arguments

        args = Array.prototype.slice.call(args);
        var params = [];
        let fileName = 'Streaming';
        if (process) {
            let time = process.hrtime()[0];
            var now = (time / 1000).toFixed(3);
            params.push(time + ": " + fileName + ': ' + args.splice(0, 1));
            params = params.concat(args);
            console.log.apply(console, params);
        } else {
            params = params.concat(args);
            console.log.apply(console, params);
        }
    }
};