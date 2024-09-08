const Q = require('Q');
const path = require('path');
const fs = require('fs');
const https = require('https');
const child_process = require('child_process');
const readline = require('readline');
const NodeMediaServer = require('node-media-server'),
    config = Q.Config.get(['Media', 'rtmp_server',], false),
    appName =  Q.Config.get(['Q','app']),
    _debug = Q.Config.get([appName, 'debugging',], false);


var qDir;

var appDir = path.dirname(require.main.filename) + '/../../';
var paths_filename = appDir + 'local/paths.js';
fs.exists(paths_filename, function (exists) {
    if (!exists) {
        return;
    }
    var paths = require(paths_filename);
    qDir = paths.Q_DIR;
});


/**
 * Static methods for MediaServer
 * @class MediaServer
 * @static
 */
function RTMPMediaServer() { }

RTMPMediaServer.getStreamKeyFromStreamPath = (path) => {
    let parts = path.split('/');
    return parts[parts.length - 1];
};

RTMPMediaServer.listen = function () {
    let mediaroot = appDir + 'files/' +  appName + '/uploads/Streams/';
    config.http.mediaroot = mediaroot;
    var nodeMediaSever = new NodeMediaServer(config);
    nodeMediaSever.on('prePublish', async function(id, StreamPath) {
        let session = nodeMediaSever.getSession(id);
        let streamName, publisherId, clips = [];
        let streamKey = RTMPMediaServer.getStreamKeyFromStreamPath(StreamPath);
        if(streamKey.indexOf('_') !== -1) {
            let keyElements = streamKey.split('_');
            publisherId = keyElements[0];
            streamName = keyElements[1];
        } else {
            publisherId = Q.plugins.Users.communityId();
            streamName = streamKey;
        }

        var subPath;
        if(publisherId.length >= 9) {
            subPath = (publisherId.toLowerCase()).substring(0,3) + '/' + publisherId.substring(3,6) + '/' + publisherId.substring(6,publisherId.length)
        } else {
            subPath = publisherId;
        }

        session.config.http.mediaroot = mediaroot + subPath + '/Streams/video';
        var segmentsDir = session.config.http.mediaroot + "/live/" + streamKey + "/";

        function createThumbnail(path, outPath) {
            console.log('createThumbnail');

            let ffmpeg = child_process.spawn('ffmpeg', ["-i", path, "-ss", "00:00:03.000", "-frames:v", "1", "-vf", "boxblur=7:1", outPath]);
            //q:v 10
            ffmpeg.on('close', (code, signal) => {
                //if(_debug) console.log('createThumbnail FFmpeg child process closed, code ' + code + ', signal ' + signal);
            });
            ffmpeg.stdin.on('error', (e) => {
                //if(_debug) console.log('createThumbnail FFmpeg STDIN Error', e);
            });
            ffmpeg.stderr.on('data', (data) => {
                //if(_debug) console.log('createThumbnail FFmpeg STDERR:', data.toString());
            });
        }

        function createClipStream(options) {
            console.log('createClipStream');

            child_process.exec("ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 " + options.videoFile, function(err, duration, stderr) {
                if(err) {
                    console.log('createClipStream ERROR', err);
                    return;
                }
                if(clips.indexOf(options.filename) !== -1)  return;

                clips.push(options.filename);
                //console.log('duration in s', duration);
                let floatNum = parseFloat(duration);
                let milliseconds = floatNum * 1000;
                //console.log('duration in ms', milliseconds);
                var phpScriptPath = appDir + "scripts/Media/clip.php";
                var argsString = '-video=' + options.videoFile + " -image=" + options.thumbnail + " -publisherId=" + publisherId + " -feedId=" + streamName + " -duration=" + milliseconds;
                child_process.exec("php " + phpScriptPath + " " +argsString, function(e, response, stderr) {
                    if(e) console.log(e);
                    console.log(response);
                });
            });
        }

        function createThumbnailsAndClips(callback) {
            fs.readdir(segmentsDir, function (err, files) {
                let checkIfCreated = false;
                if (!err) {
                    files.forEach((filename) => {
                        if (filename.endsWith('.mp4')) {

                            let name = filename.slice(0, -4);
                            if(!fs.existsSync(segmentsDir + name + '.jpg')) {
                                createThumbnail(segmentsDir + filename, segmentsDir + name + '.jpg');
                                checkIfCreated = true;
                            }


                            if(fs.existsSync(segmentsDir + name + '.jpg') && clips.indexOf(filename) === -1) {
                                createClipStream({
                                    videoFile: segmentsDir + filename,
                                    thumbnail: segmentsDir + filename.slice(0, -4) + '.jpg',
                                    filename: filename
                                });
                            }
                        }
                    })

                    if(callback != null) callback(checkIfCreated);
                }
            });
        }

        //session.config.trans.tasks[0].hlsFlags = "[hls_time=10:hls_list_size=3:strftime=1:strftime_mkdir=1:hls_segment_type=mpegts:hls_flags=+temp_file:hls_segment_filename=" + segmentsDir + "%s/video.ts]";
        session.config.trans.tasks[0].hlsFlags = "[f=segment:segment_time=60:strftime=1:reset_timestamps=1:segment_format=mp4:segment_format_options='movflags=+faststart']" + segmentsDir + "/%s.mp4|[hls_time=2:hls_list_size=3:hls_flags=delete_segments]";

        Q.plugins.Streams.fetchOne(publisherId, publisherId, 'Media/feed/' + streamName, function (error, stream) {

            if(!stream) {
                console.log("RTMPMediaServer : stream doesn't exist : reject");
                let session = nodeMediaSever.getSession(id);
                session.reject();
                return;
            }

            var watchMp4Files = setInterval(createThumbnailsAndClips, 5000);

            session.socket.on('close', () => {
                if(watchMp4Files != null) clearInterval(watchMp4Files);
                watchMp4Files = null;
                let tries = 50;

                let processUnprocessedFiles = function () {
                    createThumbnailsAndClips(function (unprocessedFiles) {
                        if(unprocessedFiles == false || tries <=0) return;
                        setTimeout(processUnprocessedFiles, 5000)
                        tries = tries - 1;
                    });
                }

                processUnprocessedFiles();
            });


            nodeMediaSever.on('preConnect', (id, args) => {
                if(_debug) console.log('[NodeEvent on preConnect]', `id=${id} args=${JSON.stringify(args)}`);
            });

            nodeMediaSever.on('postConnect', (id, args) => {
                if(_debug) console.log('[NodeEvent on postConnect]', `id=${id} args=${JSON.stringify(args)}`);
            });

            nodeMediaSever.on('doneConnect', (id, args) => {
                if(_debug) console.log('[NodeEvent on doneConnect]', `id=${id} args=${JSON.stringify(args)}`);
            });

            nodeMediaSever.on('prePublish', (id, StreamPath, args) => {
                if(_debug) console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
            });

            nodeMediaSever.on('postPublish', (id, StreamPath, args) => {
                if(_debug) console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
            });

            nodeMediaSever.on('donePublish', (id, StreamPath, args) => {
                if(_debug) console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
            });

            nodeMediaSever.on('prePlay', (id, StreamPath, args) => {
                if(_debug) console.log('[NodeEvent on prePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
            });

            nodeMediaSever.on('postPlay', (id, StreamPath, args) => {
                if(_debug) console.log('[NodeEvent on postPlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
            });

            nodeMediaSever.on('donePlay', (id, StreamPath, args) => {
                if(_debug) console.log('[NodeEvent on donePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
            });

            }
        )

    });

    nodeMediaSever.run();

};

module.exports = RTMPMediaServer;