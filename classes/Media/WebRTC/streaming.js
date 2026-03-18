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
        let userJustReconnected = false;
        let lastKeyframeData = null;

        if(reconnectedUser && !reconnectedUser.ended) {
            //restore livestream if user was disconnected for a few seconds. However, Facebook stops live stream automatically after 10 seconds when there are no chunks 
            reconnectedUser.socket = socket;
            if(reconnectedUser.ffmpegCloseTimeout) clearTimeout(reconnectedUser.ffmpegCloseTimeout);
            userJustReconnected = true; //set it to false right after user is reconnected 
            handleSocketEvents(reconnectedUser);
            return;
        } else {
            streamingUser = {
                userId: socket.handshake.query.userId,
                streamingStartTime: streamingStartTime,
                offlinePlaceholder: null,
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
                        Q.plugins.Media.WebRTC.postLivestreamStartOrStopMessage('Media/livestream/start', {
                                streamToPostTo: stream, 
                                asUserId: livestreamStream.publisherId, 
                                cookie: socket.handshake.headers.cookie
                            }).then(function () {
                            if (parseInt(i) == rtmpUrlsData.length - 1) {
                                initFFMpegProcess(streamingUser);
                            }
                        }).catch(function (err) {
                            console.error(err)
                            console.log('Something went wrong when posting to stream with next publisherId and streamName', livestreamStream.publisherId, livestreamStream.streamName)
                        });

                        /* stream.post(livestreamStream.publisherId, {
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
                        }); */
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
                    Q.plugins.Media.WebRTC.postLivestreamStartOrStopMessage('Media/livestream/stop', {
                        streamToPostTo: stream,
                        asUserId: livestreamStream.publisherId,
                        cookie: socket.handshake.headers.cookie
                    }).then(function () {
                        if (parseInt(i) == rtmpUrlsData.length - 1) {
                            initFFMpegProcess(streamingUser);
                        }
                    }).catch(function (err) {
                        console.error(err)
                        console.log('Something went wrong when posting to stream with next publisherId and streamName', livestreamStream.publisherId, livestreamStream.streamName)
                    });

                    /* stream.setAttribute('endTime', +Date.now());

                    stream.post(livestreamStream.publisherId, {
                        type: 'Media/livestream/stop',
                    }, function (err) {
                        if (err) {
                            console.log('Something went wrong when posting to stream with next publisherId and streamName', livestreamStream.publisherId, livestreamStream.streamName)
                            return;
                        }
                    }); */
                }
                
                //stream.save()

                
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

        // When switching FROM placeholder TO live stream,
        // buffer incoming packets until you see a keyframe (IDR)
        function isKeyframe(chunk) {
            // For H.264 in FLV: check NAL unit type
            // NAL type 5 = IDR (keyframe)
            // This is a simplified check — use a proper FLV/NALU parser in production
            return chunk.includes(Buffer.from([0x65, 0x88])) || // IDR slice
                chunk.includes(Buffer.from([0x00, 0x00, 0x00, 0x01, 0x65]));
        }

        function findFirstIDROffset(buffer) {
            // Look for Annex B start codes: 00 00 00 01 or 00 00 01
            let i = 0;
            while (i < buffer.length - 4) {
                let startCodeLen = 0;

                if (buffer[i] === 0 && buffer[i + 1] === 0 && buffer[i + 2] === 0 && buffer[i + 3] === 1) {
                    startCodeLen = 4;
                } else if (buffer[i] === 0 && buffer[i + 1] === 0 && buffer[i + 2] === 1) {
                    startCodeLen = 3;
                }

                if (startCodeLen > 0) {
                    const nalByte = buffer[i + startCodeLen];
                    const nalType = nalByte & 0x1F;

                    // NAL type 5 = IDR slice (keyframe)
                    // NAL type 7 = SPS (always comes just before IDR)
                    if (nalType === 5 || nalType === 7) {
                        return i; // offset where the keyframe unit begins
                    }
                }

                i++;
            }
            return -1; // no IDR in this chunk
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
                    console.log('STREAM copy', rtmpUrls)
                    
                    for (let i in rtmpUrls) {
                        //rtmpUrls[i] = appDir + (+Date.now()) + '.flv'; //for testing
                        rtmpUrls[i] = appDir + (+Date.now()) + '.flv'; //for testing
                        params = params.concat([
                            '-pix_fmt', 'yuv420p',
                            '-vcodec', 'copy',
                            '-seekable', '0',
                            '-fflags', '+genpts+discardcorrupt',
                            '-avoid_negative_ts', 'make_zero',
                            '-err_detect', 'ignore_err',
                            '-use_wallclock_as_timestamps', '1',
                            '-flvflags', '+add_keyframe_index+no_duration_filesize',
                        ]);
                        
                        params = params.concat([
                            '-codec:a', 'aac',
                            '-strict', '-2', '-ar', '44100',
                            '-af', 'aresample=async=1',
                            '-max_muxing_queue_size', '1024'
                        ]);
        
                        params = params.concat([
                            '-r', '30',
                            '-f', 'flv', rtmpUrls[i]
                        ]);
                    }
                } else {
                    console.log('STREAM convert', rtmpUrls)
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
                    
                    rtmpUrls[0] = appDir + (+Date.now()) + '.flv'; //for testing

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
                
                console.log('STREAM ffmpeg params', params)

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
                        //console.log('passThrough data', data)
                   
                    streamingUser.ffmpegProcess.stdin.write(data);
                } else {
                    createFfmpegProcess();
                }
            })
            
        }

        function killFFmpegProcess(streamingUser) {
            if (streamingUser.placeholderInterval) {
                clearInterval(streamingUser.placeholderInterval);
                streamingUser.placeholderInterval = null;
            }

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
                    streamingUser.passThrough.on('end', () => {
                        console.log('passThrough END');
                    });

                    streamingUser.passThrough.on('close', () => {
                        console.log('passThrough CLOSE');
                    });

                    streamingUser.passThrough.on('finish', () => {
                        console.log('passThrough FINISH');
                    });

                    ffmpeg.on('close', (code, signal) => {
                        console.log('FFmpeg closed, code:', code, 'signal:', signal);
                        console.log('stack:', new Error().stack);
                    });
                }
                console.log('on videoData', userJustReconnected, data);

                  // Stop placeholder
                if (streamingUser.placeholderInterval) {
                    console.log('user reconnected')
                    console.log('last properties generated by placeholder');
                    console.log('streamingUser.lastSequenceNumber', streamingUser.lastSequenceNumber);
                    console.log('streamingUser.lastVideoTimestamp', streamingUser.lastVideoTimestamp);
                    console.log('streamingUser.lastAudioTimestamp', streamingUser.lastAudioTimestamp);
                    
                    clearInterval(streamingUser.placeholderInterval);
                    streamingUser.placeholderInterval = null;
                }

                if (data.lastSequenceNumber <= streamingUser.lastSequenceNumber) {
                    console.log('dropping stale chunk, client seq:', data.lastSequenceNumber,
                        'server seq:', streamingUser.lastSequenceNumber);
                    return;
                }

                if (data.lastVideoTimestamp <= streamingUser.lastVideoTimestamp ||
                    data.lastAudioTimestamp <= streamingUser.lastAudioTimestamp) {
                    console.log('dropping stale chunk by timestamp, client video ts:', data.lastVideoTimestamp,
                        'server video ts:', streamingUser.lastVideoTimestamp);
                    return;
                }

                if (data.lastSequenceNumber != null) {
                    streamingUser.lastSequenceNumber = data.lastSequenceNumber;
                    streamingUser.lastVideoTimestamp = data.lastVideoTimestamp;
                    streamingUser.lastAudioTimestamp = data.lastAudioTimestamp;
                }

                streamingUser.passThrough.push(data.payload);
                chunksNum++;
            });
            streamingUser.socket.on('Media/webrtc/offlinePlaceholder', function (data) {
                if(!streamingUser.offlinePlaceholder) {
                    streamingUser.offlinePlaceholder = data;
                }
                console.log('got offlinePlaceholder', streamingUser.offlinePlaceholder)
            });

            streamingUser.socket.on('disconnect', function (reason) {
                console.log(streamingUser.socket.id + ' FFmpeg USER DISCONNECTED', streamingUser.ffmpegProcess.killed, reason);
                if (reason == 'client namespace disconnect') {
                    streamingUser.ended = true;
                    killFFmpegProcess(streamingUser);
                } else {
                    streamingUser.ffmpegCloseTimeout = setTimeout(function () {
                        streamingUser.ended = true;
                        killFFmpegProcess(streamingUser);
                    }, 600000);

                    if (!streamingUser.offlinePlaceholder) return;

                    const { moof, mdat, timescales, trackIdsInfo } = streamingUser.offlinePlaceholder;

                    // Get video and audio track IDs
                    const videoTrackId = parseInt(Object.keys(trackIdsInfo).find(id => trackIdsInfo[id] === 'video'));
                    const audioTrackId = parseInt(Object.keys(trackIdsInfo).find(id => trackIdsInfo[id] === 'audio'));

                    const videoTimescale = timescales[videoTrackId];
                    const audioTimescale = timescales[audioTrackId];

                    // Get fragment duration from the placeholder moof
                    const placeholderInfo = getFragmentInfo(Buffer.from(moof));
                    const videoFragDuration = placeholderInfo.tracks[videoTrackId]?.fragmentDuration;
                    const audioFragDuration = placeholderInfo.tracks[audioTrackId]?.fragmentDuration;

                    // Start from last known timestamps
                    let currentVideoTimestamp = streamingUser.lastVideoTimestamp;
                    let currentAudioTimestamp = streamingUser.lastAudioTimestamp;
                    let currentSequenceNumber = streamingUser.lastSequenceNumber;

                    // Calculate interval in ms from fragment duration
                    const intervalMs = (videoFragDuration / videoTimescale) * 1000;
                    console.log('placeholderInterval intervalMs', intervalMs);
                    streamingUser.placeholderInterval = setInterval(() => {
                        currentSequenceNumber++;
                        currentVideoTimestamp += videoFragDuration;
                        currentAudioTimestamp += audioFragDuration;

                        // Keep server state in sync with what we're sending to FFmpeg
                        streamingUser.lastSequenceNumber = currentSequenceNumber;
                        streamingUser.lastVideoTimestamp = currentVideoTimestamp;
                        streamingUser.lastAudioTimestamp = currentAudioTimestamp;

                        const patchedMoof = patchMoofForPlaceholder(
                            Buffer.from(moof),
                            currentVideoTimestamp,
                            currentAudioTimestamp,
                            currentSequenceNumber
                        );

                        const placeholder = Buffer.concat([
                            Buffer.from(patchedMoof),
                            Buffer.from(mdat)
                        ]);

                        if(streamingUser.passThrough) streamingUser.passThrough.push(placeholder);
                        /* console.log('pushed placeholder seq:', currentSequenceNumber,
                            'videoTs:', currentVideoTimestamp,
                            'audioTs:', currentAudioTimestamp); */
                    }, intervalMs);
                }
                
            });
        }
    });

    function patchMoofForPlaceholder(moof, videoTimestamp, audioTimestamp, sequenceNumber) {
        const patched = new Uint8Array(moof);
        const view = new DataView(patched.buffer, patched.byteOffset, patched.byteLength);

        let offset = 8; // skip moof size+type

        while (offset + 8 <= patched.length) {
            const size = view.getUint32(offset);
            const type = String.fromCharCode(patched[offset + 4], patched[offset + 5], patched[offset + 6], patched[offset + 7]);
            if (size < 8) break;

            if (type === 'mfhd') {
                // patch sequence number
                view.setUint32(offset + 12, sequenceNumber);
            }

            if (type === 'traf') {
                let trackId = null;
                let trafOffset = offset + 8;

                while (trafOffset + 8 <= offset + size) {
                    const boxSize = view.getUint32(trafOffset);
                    const boxType = String.fromCharCode(patched[trafOffset + 4], patched[trafOffset + 5], patched[trafOffset + 6], patched[trafOffset + 7]);

                    if (boxType === 'tfhd') {
                        trackId = view.getUint32(trafOffset + 12);
                    }

                    if (boxType === 'tfdt') {
                        const version = patched[trafOffset + 8];
                        const tsOffset = trafOffset + 12;
                        const newTimestamp = trackId === 1 ? videoTimestamp : audioTimestamp;

                        if (version === 1) {
                            view.setBigUint64(tsOffset, BigInt(newTimestamp));
                        } else {
                            view.setUint32(tsOffset, newTimestamp);
                        }
                    }

                    if (boxSize < 8) break;
                    trafOffset += boxSize;
                }
            }

            offset += size;
        }

        return patched;
    }

    function getFragmentInfo(moof) {
        const view = new DataView(moof.buffer, moof.byteOffset, moof.byteLength);
        let sequenceNumber = null;
        const tracks = {}; // { trackId: { timestamp, fragmentDuration, sampleCount } }

        let offset = 8;

        while (offset + 8 <= moof.length) {
            const size = view.getUint32(offset);
            const type = String.fromCharCode(moof[offset + 4], moof[offset + 5], moof[offset + 6], moof[offset + 7]);
            if (size < 8) break;

            if (type === 'mfhd') {
                sequenceNumber = view.getUint32(offset + 12);
            }

            if (type === 'traf') {
                let trackId = null;
                let timestamp = null;
                let fragmentDuration = null;
                let sampleCount = null;
                let defaultDuration = null;
                let sampleDurations = [];

                let trafOffset = offset + 8;
                while (trafOffset + 8 <= offset + size) {
                    const boxSize = view.getUint32(trafOffset);
                    const boxType = String.fromCharCode(moof[trafOffset + 4], moof[trafOffset + 5], moof[trafOffset + 6], moof[trafOffset + 7]);

                    if (boxType === 'tfhd') {
                        trackId = view.getUint32(trafOffset + 12);
                        const flags = (moof[trafOffset + 9] << 16) | (moof[trafOffset + 10] << 8) | moof[trafOffset + 11];
                        let tfhdOffset = trafOffset + 16;
                        if (flags & 0x000001) tfhdOffset += 8;
                        if (flags & 0x000002) tfhdOffset += 4;
                        if (flags & 0x000008) defaultDuration = view.getUint32(tfhdOffset);
                    }

                    if (boxType === 'tfdt') {
                        const version = moof[trafOffset + 8];
                        const tsOffset = trafOffset + 12;
                        timestamp = version === 1
                            ? Number(view.getBigUint64(tsOffset))
                            : view.getUint32(tsOffset);
                    }

                    if (boxType === 'trun') {
                        const flags = (moof[trafOffset + 9] << 16) | (moof[trafOffset + 10] << 8) | moof[trafOffset + 11];
                        sampleCount = view.getUint32(trafOffset + 12);
                        let trunOffset = trafOffset + 16;
                        if (flags & 0x000001) trunOffset += 4;
                        if (flags & 0x000004) trunOffset += 4;
                        for (let i = 0; i < sampleCount; i++) {
                            if (flags & 0x000100) { sampleDurations.push(view.getUint32(trunOffset)); trunOffset += 4; }
                            if (flags & 0x000200) trunOffset += 4;
                            if (flags & 0x000400) trunOffset += 4;
                            if (flags & 0x000800) trunOffset += 8;
                        }
                    }

                    if (boxSize < 8) break;
                    trafOffset += boxSize;
                }

                if (sampleDurations.length > 0) {
                    fragmentDuration = sampleDurations.reduce((a, b) => a + b, 0);
                } else if (defaultDuration !== null && sampleCount !== null) {
                    fragmentDuration = defaultDuration * sampleCount;
                }

                if (trackId !== null) {
                    tracks[trackId] = { timestamp, fragmentDuration, sampleCount };
                }
            }

            offset += size;
        }

        return { sequenceNumber, tracks };
        // e.g. { sequenceNumber: 5, tracks: { 1: { timestamp, fragmentDuration, sampleCount }, 2: { ... } } }
    }

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