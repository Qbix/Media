const Q = require('Q');
const fs = require('fs');
const { PassThrough } = require('stream');
const path = require('path');
const child_process = require('child_process');
const appDir = path.dirname(require.main.filename) + '/../../';
const appName =  Q.Config.get(['Q','app']);

module.exports = function (io) {
    var _debug = Q.Config.get(['Streams', 'webrtc', 'debug'], false);
    var _debug = true;
    var WebRTC = Q.plugins.Media.WebRTC;
    var nspName = '/webrtc';
    var webrtcNamespace = io.of(nspName);
    var _streamingUsers = new Map();
    //const pipePath = path.join(__dirname, 'input_pipe');
   
    /* if (!fs.existsSync(pipePath)) {
        require('child_process').execSync(`mkfifo ${pipePath}`);
    } */

    webrtcNamespace.on('connection', function (socket) {
        var streamingDataStream = new PassThrough();
        //const pipeWriteStream = fs.createWriteStream(pipePath);
        var streamingUser = null;
        var ffmpeg;

        if (!socket.handshake.query.rtmp) return;
        var livestreamStreamData = socket.handshake.query.livestreamStream ? JSON.parse(socket.handshake.query.livestreamStream) : null;
        var streamingStartTime = socket.handshake.query.streamingStartTime;
        let reconnectedUser = _streamingUsers.get(livestreamStreamData.publisherId + '_' + livestreamStreamData.streamName + '_' + streamingStartTime);

        if(reconnectedUser && !reconnectedUser.ended) {
            //restore livestream if user was disconnected for a few seconds. However, Facebook stops live stream automatically after 10 seconds when there are no chunks 
            reconnectedUser.socket = socket;
            if(reconnectedUser.ffmpegCloseTimeout) clearTimeout(reconnectedUser.ffmpegCloseTimeout);
            handleSocketEvents(reconnectedUser);
            return;
        } else {
            streamingUser = {
                userId: socket.handshake.query.userId,
                streamingStartTime: streamingStartTime,
                socket: socket,
                ffmpegProcess: null,
                passThrough: streamingDataStream,
                ended: false
            };
    
            _streamingUsers.set(livestreamStreamData.publisherId + '_' + livestreamStreamData.streamName + '_' + streamingStartTime, streamingUser);
            handleSocketEvents(streamingUser);
        }

        var usersInfo = JSON.parse(socket.handshake.query.localInfo);
        var rtmpUrlsData = socket.handshake.query.rtmp ? JSON.parse(socket.handshake.query.rtmp) : [];
        var platform = socket.handshake.query.platform;
        var isAndroid = usersInfo.platform == 'android' ? true : false      

        if (rtmpUrlsData.length == 0) return;

        let rtmpUrls = rtmpUrlsData.map(function (rtmpData) {
            return rtmpData.rtmpUrl;
        });
        
        if (livestreamStreamData && livestreamStreamData.publisherId != null && livestreamStreamData.streamName != null) {
            postStartMessageAndBeginLivestreaming(livestreamStreamData);
        } else {
            initFFMpegProcess(streamingUser);
        }

        function postStartMessageAndBeginLivestreaming(livestreamStream) {

            Q.plugins.Streams.fetchOne(livestreamStream.publisherId, livestreamStream.publisherId, livestreamStream.streamName, function (err, stream) {
                if (err || !stream) {
                    console.log('No livestream stream found with next publisherId and streamName', livestreamStream.publisherId, livestreamStream.streamName);
                    return;
                }

                let lives = [];
                for (let i in rtmpUrlsData) {
                    let rtmpUrlInfo = rtmpUrlsData[i];
                    rtmpUrlInfo.platform = determinePlatformUserStreamingTo(rtmpUrlInfo.linkToLive || rtmpUrlInfo.rtmpUrl);
                    delete rtmpUrlInfo.rtmpUrl;
                    if(rtmpUrlInfo.type == 'youtube') {
                        lives.push({
                            type: 'youtube',
                            broadcastId: rtmpUrlInfo.broadcastId
                        });
                    } else if(rtmpUrlInfo.type == 'facebook') {
                        lives.push({
                            type: 'facebook',
                            liveVideoId: rtmpUrlInfo.liveVideoId,
                            shareId: rtmpUrlInfo.shareId
                        });
                    } else if(rtmpUrlInfo.type == 'custom') {
                        lives.push({
                            type: 'custom',
                            linkToLive: rtmpUrlInfo.linkToLive
                        });
                    }

                    stream.setAttribute('lives', lives);
                    stream.setAttribute('endTime', '');
                    stream.save();

                    //do not post Media/livestream/start mesage if p2p broadcast is active
                    let p2pRoom = stream.getAttribute('p2pRoom');
                    if(!p2pRoom || p2pRoom == '') {
                        stream.post(livestreamStream.publisherId, {
                            type: 'Media/livestream/start',
                            instructions: {
                                name: ''
                            }
                        }, function (err) {
                            if (err) {
                                console.log('Something went wrong when posting to stream with next publisherId and streamName', livestreamStream.publisherId, livestreamStream.streamName)
                                return;
                            }
                            if (parseInt(i) == rtmpUrlsData.length - 1) {
                                initFFMpegProcess(streamingUser);
                            }
                        });
                    } else {
                        if (parseInt(i) == rtmpUrlsData.length - 1) {
                            initFFMpegProcess(streamingUser);
                        }
                    }

                   
                }
            });
        }

        function postStopMessageAndStopLivestreaming(livestreamStream) {
            Q.plugins.Streams.fetchOne(livestreamStream.publisherId, livestreamStream.publisherId, livestreamStream.streamName, function (err, stream) {
                if (err || !stream) {
                    console.log('No livestream stream found with next publisherId and streamName', livestreamStream.publisherId, livestreamStream.streamName);
                    return;
                }

                stream.setAttribute('lives', []);
                let p2pRoom = stream.getAttribute('p2pRoom');
                //do not send Media/livestream/stop message when p2p broadcast is still active
                if(!p2pRoom || p2pRoom == '') {
                    stream.setAttribute('endTime', +Date.now());

                    stream.post(livestreamStream.publisherId, {
                        type: 'Media/livestream/stop',
                    }, function (err) {
                        if (err) {
                            console.log('Something went wrong when posting to stream with next publisherId and streamName', livestreamStream.publisherId, livestreamStream.streamName)
                            return;
                        }
                    });
                }
                
                stream.save()

                
            });
        }

        function determinePlatformUserStreamingTo(urlString) {
            if (!urlString || urlString.trim() == '') return;
            if (urlString.indexOf('youtube.com') != -1 || urlString.indexOf('youtu.be') != -1) {
                return 'youtube';
            } else if (urlString.indexOf('twitch.tv') != -1) {
                return 'twitch';
            }
        }

        function initFFMpegProcess(streamingUser) {
            var m264BrowserSupport = false
            for (let c in usersInfo.supportedVideoMimeTypes) {
                let mimeType = usersInfo.supportedVideoMimeTypes[c];
                if (mimeType.toLowerCase().indexOf('h264') != -1) {
                    m264BrowserSupport = true;
                    break;
                }
            }
            var mp4IsSupported = usersInfo.supportedVideoMimeTypes.indexOf('video/mp4;codecs=h264') != -1;
            var recorderType = socket.handshake.query.recorderType; //Mp4Muxer || MediaRecorder
            var mediaRecorderCodec = socket.handshake.query.mediaRecorderCodec; //Mp4Muxer || MediaRecorder
            var encoder, format;
            if(recorderType == 'Mp4Muxer') {
                encoder = 'copy';
                format = 'mov,mp4,m4a,3gp,3g2,mj2';
            } else {
                if(mediaRecorderCodec == 'video/mp4;codecs=h264' || mediaRecorderCodec == 'video/mp4;codecs:h264') {
                    encoder = 'copy'
                    format = 'mov,mp4,m4a,3gp,3g2,mj2';
                } else {
                    encoder = 'libx264'
                    format = 'webm';
                    if(mediaRecorderCodec && mediaRecorderCodec.includes('mp4')) {
                        format = 'mp4';
                    }
                }
            }

            function createFfmpegProcess() {
                if (!streamingUser.passThrough) {
                    streamingUser.passThrough = new PassThrough();
                }
                var params = ['-re'];

                //var params = ['-r', '24'];
                if (format != 'webm') {
                    params.push('-f', format);
                }

                params.push('-i', '-');
                //for some reason we cannot stream to youtube using tee muxer and "copy" codec (TLS error), so we need to do multiple output (when c:v is copy) in next way
                if (encoder == 'copy') {
                    for (let i in rtmpUrls) {
                        params = params.concat([
                            '-pix_fmt', 'yuv420p',
                            '-vcodec', 'copy',
                            '-flvflags', '+add_keyframe_index+no_duration_filesize',
                        ]);
                        
                        params = params.concat([
                            '-codec:a', 'aac',
                            '-strict', '-2', '-ar', '44100',
                            '-af', 'aresample=async=1',
                            '-max_muxing_queue_size', '1024'
                        ]);
        
                        params = params.concat([
                            '-flvflags', '+add_keyframe_index+no_duration_filesize',
                            '-r', '30',
                            '-f', 'flv', rtmpUrls[i]
                        ]);
                    }
                } else {
                    params = params.concat([
                        '-pix_fmt', 'yuv420p',
                        '-vcodec', 'libx264',
                        '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease',
                        '-preset', 'slow',
                        '-profile:v', 'high',
                        '-b:v', '2M',
                        '-bufsize', '512k',
                        '-crf', '18',
                        '-g', '30',
                        '-bf', '2',
                        '-movflags', '+faststart',
                        '-max_interleave_delta', '20000000',
                    ]);

                    params = params.concat([
                        '-codec:a', 'aac',
                        '-strict', '-2', '-ar', '44100',
                        '-af', 'aresample=async=1',
                        '-max_muxing_queue_size', '1024'
                    ]);
                    
                    if (rtmpUrls.length > 1) {
                        var outputEndpoints = '';
                        for (let u in rtmpUrls) {
                            if (u == rtmpUrls.length - 1) {
                                outputEndpoints += '[f=flv:flvflags=+add_keyframe_index+no_duration_filesize:onfail=ignore]' + rtmpUrls[u];
                            } else {
                                outputEndpoints += '[f=flv:flvflags=+add_keyframe_index+no_duration_filesize:onfail=ignore]' + rtmpUrls[u] + '|'
                            }
                        }
                        params = params.concat([
                            '-map', '0',
                            '-f', 'tee', outputEndpoints
                        ]);
                    } else {
                        params = params.concat([
                            '-flvflags', '+add_keyframe_index+no_duration_filesize',
                            '-r', '30',
                            '-f', 'flv', rtmpUrls[0]
                        ]);
                    }
                }
                
                ffmpeg = child_process.spawn('ffmpeg', params, { detached: true });
                streamingUser.ffmpegProcess = ffmpeg;

                /*ffmpeg -re -i SampleM.flv -acodec libmp3lame -ar 44100 -b:a 128k \
  -pix_fmt yuv420p -profile:v baseline -s 426x240 -bufsize 6000k \
  -vb 400k -maxrate 1500k -deinterlace -vcodec libx264           \
  -preset veryfast -g 30 -r 30 -f flv                            \
  -flvflags no_duration_filesize                                 \
  "rtmp://live-api.facebook.com:80/rtmp/my_key"*/

                // If FFmpeg stops for any reason, close the WebSocket connection.
                ffmpeg.on('close', (code, signal) => {
                    console.log(streamingUser.socket.id + ' FFmpeg child process closed, code ' + code + ', signal ' + signal);

                    //if ffmpeg did not end by a user but by some error, post message to the user about an error
                    if (!streamingUser.ended) {
                        streamingUser.socket.emit('Media/webrtc/liveStreamingStopped', { platform: platform, rtmpUrl: rtmpUrls });
                    } 
                    if (streamingUser.passThrough) streamingUser.passThrough.end();
                    streamingUser.passThrough = null;
                });
                // Handle STDIN pipe errors by logging to the console.
                // These errors most commonly occur when FFmpeg closes and there is still
                // data to write.  If left unhandled, the server will crash.
                ffmpeg.stdin.on('error', (e) => {
                    console.log(streamingUser.socket.id + ' FFmpeg STDIN Error', e);
                });

                // FFmpeg outputs all of its messages to STDERR.  Let's log them to the console.
                ffmpeg.stderr.on('data', (data) => {
                    console.log(streamingUser.socket.id + ' FFmpeg STDERR:', data.toString());
                });

                
            }
            createFfmpegProcess();

            streamingUser.passThrough.on('data', function (data) {
                if (streamingUser.ffmpegProcess != null) {
                    streamingUser.ffmpegProcess.stdin.write(data);
                } else {
                    createFfmpegProcess();
                }
            })
            
        }

        function killFFmpegProcess(streamingUser) {
            streamingUser.ffmpegProcess.kill('SIGINT');
            streamingUser.ffmpegProcess.stdin.write('q');
            streamingUser.ffmpegProcess.stdin.end();
            setTimeout(function () {
                if (!streamingUser.ffmpegProcess.killed && livestreamStreamData && livestreamStreamData.publisherId != null && livestreamStreamData.streamName != null) {
                    postStopMessageAndStopLivestreaming(livestreamStreamData);
                }
                streamingUser.ffmpegProcess = null;
            }, 1000)
        }

        function handleSocketEvents(streamingUser) {
            let chunksNum = 0;
            // When data comes in from the WebSocket, write it to FFmpeg's STDIN.
            streamingUser.socket.on('Media/webrtc/videoData', function (data) {
                if (!streamingUser.passThrough) {
                    streamingUser.passThrough = new PassThrough();
                }
                streamingUser.passThrough.push(data);
                chunksNum++;
            });

            streamingUser.socket.on('disconnect', function (reason) {
                console.log(streamingUser.socket.id + ' FFmpeg USER DISCONNECTED', streamingUser.ffmpegProcess.killed, reason);
                if(reason == 'client namespace disconnect') {
                    streamingUser.ended = true;
                    killFFmpegProcess(streamingUser);
                } else {
                    streamingUser.ffmpegCloseTimeout = setTimeout(function () {
                        streamingUser.ended = true;
                        killFFmpegProcess(streamingUser);
                    }, 600000);
                }
                
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