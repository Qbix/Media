const Q = require('Q');
module.exports = function(socket, io, expressApp) {
    var _debug = Q.Config.get(['Streams', 'webrtc', 'debug'], false);
    var _debug = false;
    var WebRTC =  Q.plugins.Media.WebRTC;
    var nspName = '/webrtc';
    var webrtcNamespace = io.of(nspName);
    var roomPublisherId;
    var roomId;
    var socketRoom;
    socket.on('Media/webrtc/joined', function (identity, cb) {
        log('Got message: joined ', identity, socket.id);
        socket.socketSid = identity.sid;
        socket.username = identity.username;
        socket.userPlatformId = identity.username.split('\t')[0];
        socket.startTime = identity.username.split('\t')[1];
        socket.info = identity.info;
        socket.roomStartTime = identity.roomStartTime;
        socket.roomPublisherId = roomPublisherId = identity.roomPublisher;
        socket.roomId = roomId = identity.room;
        socket.socketRoom = socketRoom = identity.roomPublisher + '_' + identity.room;

        function onParticipantValidation(access, limitsInfo) {
            socket.access = access;

            if(!socket.sentInvite) {
                socket.sentInvite = [];
            }

            log('Participant joined to room', socketRoom);

            socket.emit('Media/webrtc/joined',{
                access: access,
                limits: limitsInfo
            }, async function () {
                log('sent message Media/webrtc/joined');

                socket.join(socketRoom, function () {
                    log(socket.id + ' now in rooms: ', socket.rooms);
                    io.of('/webrtc').in(socketRoom).allSockets().then(function (clients) {
                        log('PARTICIPANTS IN THE ROOM', clients.length);
                    });
                })

                /* for (let c in clients) {
                    let socketClient = clients[c];
                    if (socketClient.client.id == socket.client.id || (socketClient.sentInvite && socketClient.sentInvite.indexOf(socket.client.id) != -1)) {
                        continue;
                    }
                    socket.sentInvite.push(socketClient.client.id);
                    log('allSockets clients: send invite');

                    socket.to(nspName + '#' + socketClient.client.id).emit('Media/webrtc/participantConnected', {
                        username: identity.username,
                        sid: socket.client.id,
                        info: identity.info,
                        fromSid: identity.sid,
                        oldSids: identity.oldSids ? identity.oldSids.map(function (sid) { return sid.replace(nspName + '#', '') }) : null,
                        access: access
                    });

                } */

                socket.broadcast.to(socketRoom).emit('Media/webrtc/participantConnected', {
                    username:identity.username,
                    sid:socket.id,
                    info:identity.info,
                    fromSid:identity.sid,
                    oldSids:identity.oldSids ? identity.oldSids.map(function(sid){return sid.replace(nspName + '#', '')}) : null,
                    access: access
                });

                const clients = await webrtcNamespace.in(socketRoom).fetchSockets();

                log('allSockets clients', clients.length);

                var participantsList = [];
                for (var i in clients) {
                    if (socket.id != clients[i].id) {
                        participantsList.push({ sid: clients[i].id });
                    }
                }
                socket.emit('Media/webrtc/roomParticipants', participantsList);


            });            
        }

        var streamName = 'Media/webrtc/' + roomId;
        Q.plugins.Streams.fetchOne(socket.userPlatformId, roomPublisherId, streamName, function (err, stream) {
            if(err || !stream) {
                return;
            }

            stream.post(socket.userPlatformId, {
                type: 'Media/webrtc/joined'
            }, function (err) {
                if (err) {
                    console.log('Something went wrong when posting Media/webrtc/joined')
                    return;
                }
                let limitsConfig = stream.getAttribute('limits', null)
                if(limitsConfig != null && limitsConfig.active) {
                    let limitsManager = require('./limitsManager')(socket, io);

                    limitsManager.init(socket, io, socketRoom, identity).then(function (limitsInfo) {
                        log('INIT LIMITS')

                        getAccessAndProceed(limitsInfo);
                    });
                } else {
                    getAccessAndProceed();
                }

                function getAccessAndProceed(limitsInfo) {
                    Q.plugins.Streams.Access.SELECT('*').where({
                        'publisherId': roomPublisherId,
                        'streamName': streamName,
                        'ofUserId': socket.userPlatformId
                    }).limit(1).execute(function (err, rows) {
                        var permissions = [];
                        var personalAccess = false;
                        if (rows.length != 0 && rows[0].fields.permissions != null) {
                            permissions = JSON.parse(rows[0].fields.permissions);
                            personalAccess = true;
                        } else {
                            permissions = stream.getAllPermissions();
                        }
                        let isAdmin = stream.testAdminLevel('max') || stream.fields.publisherId == socket.userPlatformId;
                        let isCohost = stream.testAdminLevel('manage');
                        onParticipantValidation({
                            'readLevel': stream.get('readLevel', 0),
                            'writeLevel': stream.get('writeLevel', 0),
                            'adminLevel': stream.get('adminLevel', 0),
                            'permissions': isAdmin ? ['mic', 'camera', 'screen'] : permissions,
                            'personalAccess': personalAccess,
                            'isAdmin': isAdmin,
                            'isCohost': isCohost
                        }, limitsInfo);
                    });
                }
                
            });            
        });


    });

    socket.on('Media/webrtc/confirmOnlineStatus', function(message) {
        log('confirmOnlineStatus', message);
        message.fromSid = socket.id;
        //socket.to(nspName + '#' + message.targetSid).emit('Media/webrtc/confirmOnlineStatus', message);
        socket.to(message.targetSid).emit('Media/webrtc/confirmOnlineStatus', message);

    });

    socket.on('Media/webrtc/canISendOffer', function(message) {
        log('canISendOffer', message);
        message.fromSid = socket.id;
        //socket.to(nspName + '#' + message.targetSid).emit('Media/webrtc/canISendOffer', message);
        socket.to(message.targetSid).emit('Media/webrtc/canISendOffer', message);

    });

    socket.on('Media/webrtc/signalling', function(message) {
        log('SIGNALLING MESSAGE', message.type, message.name, message.targetSid, socket.id);
        log('SIGNALLING message.targetSid', message.targetSid);
        message.fromSid = socket.id;
        if(message.type == 'offer') {
            message.info = socket.info;
            message.access = socket.access;
            if(message.oldSids) {
                message.oldSids = message.oldSids.map(function(sid){return sid.replace(nspName + '#', '')})
            }
        }
        //webrtcNamespace.in(socketRoom).to(message.targetSid).emit('Media/webrtc/signalling', message);
        socket.to(message.targetSid).emit('Media/webrtc/signalling', message);
    });

    socket.on('Media/webrtc/putInWaitingRoom', function(message) {
        log('putInWaitingRoom', message);
        if(message.userId == null || socket.userPlatformId == null) {
            return;
        }
        var userId = message.userId;
        var streamName = 'Media/webrtc/' + roomId;
        Q.plugins.Streams.fetchOne(socket.userPlatformId, roomPublisherId, streamName, function (err, stream) {
            log('PUT IN WAITING ROOM: fetchOne');

            if(err || !stream) {
                return;
            }

            if(!stream.testAdminLevel('manage')) {
                log('No permissions to do action');
                return;
            }

            stream.post(socket.userPlatformId, {
                type: 'Media/webrtc/left'
            }, function (err) {
                if (err) {
                    console.log('Something went wrong when posting Media/webrtc/left')
                    return;
                }
            });  

            stream.leave({ userId: message.userId }, async function () {
                if (_debug) log('PUT IN WAITING ROOM: LEAVE STREAM');


                const clients = await webrtcNamespace.in(socketRoom).fetchSockets();

                for (let i in clients) {
                    let socketClient = clients[i];
                    if (socketClient.userPlatformId == userId) {
                        log('PUT IN WAITING ROOM: disconnect', socketClient.client.id, socketClient.userPlatformId);
                        socket.to(socketClient.id).emit('Media/webrtc/leave');
                        socket.broadcast.to(socketRoom).emit('Media/webrtc/participantDisconnected', socketClient.client.id);
                        socket.emit('Media/webrtc/participantDisconnected', socketClient.client.id);
                        socketClient.disconnect();
                    }
                }

                
            });


        });
    });

    socket.on('disconnect', function() {
        log('DISCONNECT', socket.id, socket.userPlatformId, 'Media/webrtc/' + roomId);

        if(!socketRoom) return;
        log('DISCONNECT', socket.id, socket.userPlatformId, 'Media/webrtc/' + roomId);
        io.of('/webrtc').in(socketRoom).allSockets().then(function (clients) {
            log('PARTICIPANTS IN THE ROOM', clients.length);

            var streamName = 'Media/webrtc/' + roomId;
            
            Q.plugins.Streams.fetchOne(socket.userPlatformId, roomPublisherId, streamName, function (err, stream) {
                if (err || !stream) {
                    return;
                }

                stream.leave({ userId: socket.userPlatformId }, function () {
                    log('DISCONNECT: LEAVE STREAM');
                });

                stream.post(socket.userPlatformId, {
                    type: 'Media/webrtc/left'
                }, function (err) {
                    if (err) {
                        console.log('Something went wrong when posting Media/webrtc/left')
                        return;
                    }
                });

                if (clients.length > 0) {
                    stream.setAttribute('endTime', +Date.now());
                    stream.save();
                    if ((stream.getAttribute('resumeClosed') == null || [false, "false"].includes(stream.getAttribute('resumeClosed'))) && (stream.getAttribute('closeManually') == null || [false, "false"].includes(stream.getAttribute('closeManually')))) {
                        log('DISCONNECT: Q.plugins.Streams.fetchOne: CLOSE');

                        Q.plugins.Streams.close(socket.userPlatformId, roomPublisherId, streamName);
                    }
                }
            });
        });

        socket.broadcast.to(socketRoom).emit('Media/webrtc/participantDisconnected', socket.id);
    });

    function log() {
        if(_debug === false) return;
        var args = arguments

        args = Array.prototype.slice.call(args);
        var params = [];
        let fileName = 'Signaling';
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