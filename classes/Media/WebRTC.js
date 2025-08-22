"use strict";
/*jshint node:true */
/**
 * WebRTC class
 * @module Media
 * @main Media
 */
const Q = require('Q');
const fs = require('fs');
const { PassThrough } = require('stream');
const path = require('path');
const gfs = require('graceful-fs');

var express = require('express');
var app = express();
app.set('view engine', 'ejs');


const Streams_Avatar = Q.require('Streams/Avatar');
const Users = Q.require('Users');

const child_process = require('child_process');
const appDir = path.dirname(require.main.filename) + '/../../';
const appName =  Q.Config.get(['Q','app']);

/**
 * Static methods for WebRTC
 * @class WebRTC
 * @static
 */
function WebRTC() {

}

/**
 * Start internal listener for WebRTC
 * @method listen
 * @static
 * @param {Object} options={} So far no options are implemented.
 * @return {Users.Socket|null} The socket if connected, otherwise null
 */
WebRTC.listen = function () {

	if (WebRTC.listen.result) {
		return WebRTC.listen.result;
	}

	// Start external socket server
	var node = Q.Config.get(['Q', 'node']);
	if (!node) {
		return false;
	}
	var pubHost = Q.Config.get(['Media', 'node', 'host'], Q.Config.get(['Q', 'node', 'host'], null));
	var pubPort = Q.Config.get(['Media', 'node', 'port'], Q.Config.get(['Q', 'node', 'port'], null));
	var internalHost = Q.Config.get(['Media', 'nodeInternal', 'host'], Q.Config.get(['Q', 'nodeInternal', 'host'], null));
	var internalPort = Q.Config.get(['Media', 'nodeInternal', 'port'], Q.Config.get(['Q', 'nodeInternal', 'port'], null));

	if (pubHost === null) {
		throw new Q.Exception("Media: Missing config field: Streams/node/host");
	}
	if (pubPort === null) {
		throw new Q.Exception("Media: Missing config field: Streams/node/port");
	}

    /**
	 * @property socketServer
	 * @type {SocketNamespace}
	 * @private
	 */
	var socket = Q.Socket.listen({
		host: pubHost,
		port: pubPort,
		https: Q.Config.get(['Q', 'node', 'https'], false) || {},
	});
    var internalSever = Q.servers[internalPort][internalHost];

    if (!socket || !socket.io) {
        return null;
    }
    
    var expressApp = internalSever.attached.express;

    require('./WebRTC/WebcastServer')(socket);

    var _debug = Q.Config.get(['Media', 'webrtc', 'debug'], {});
    var io = socket.io;
    var webrtcNamespace = io.of('/webrtc');

    Q.plugins.Media.WebRTC.rooms = {};

    Q.plugins.Media.WebRTC.postLivestreamStartMessage =  function (stream, asUserId) {
        return new Promise(function (resolve, reject) {
            Q.plugins.Media.WebRTC.getCommunityAvatarInfo(asUserId).then(function (communityLogo) {
                Q.plugins.Media.WebRTC.getUserAvatarInfo(asUserId)
                .then(function (avatarInfo) {
                    let joinUrl = stream.url();
                    stream.post(asUserId, {
                        type: 'Media/livestream/start',
                        instructions: JSON.stringify({
                            streamTitle: stream.fields.title,
                            logoInfo: communityLogo,
                            avatarInfo: avatarInfo,
                            joinUrl: stream.url()
                        }),
                    }, function (err) {
                        if (err) {
                            console.error('posting error: Error while posting Media/livestream/start message');
                            reject(err);
                            return;
                        }
                        resolve();
                    });
    
                }).catch(function (err) {
                    reject(err);
                })
            }).catch(function (err) {
                reject(err);
            })
            
        })
    }

    Q.plugins.Media.WebRTC.getUserAvatarInfo =  function (userId) {
        return new Promise(function(resolve, reject) {
            Streams_Avatar.fetch(userId, userId, function (err, avatar) {
                if (err) {
                    console.error('posting error: Error while posting Media/livestream/start message');
                    console.error(err);
                    reject(err);
                }
                let info = {};
                if(avatar.fields.icon != null) {
                    info.src = Users.iconUrl(avatar.fields.icon, 80);
                }
    
                info.displayName = avatar.displayName();

                resolve(info);
            });
        })
    }

    Q.plugins.Media.WebRTC.getCommunityAvatarInfo =  function () {
        return new Promise(function(resolve, reject) {
            let communityId = Q.plugins.Users.communityId();
            Streams_Avatar.fetch(communityId, communityId, function (err, avatar) {
                if (err) {
                    console.error('posting error: Error while posting Media/livestream/start message');
                    console.error(err);
                    reject(err);
                }
                let info = {};
                if(avatar.fields.icon != null) {
                    info.src = Users.iconUrl(avatar.fields.icon, 80);
                }
    
                info.displayName = avatar.displayName();

                resolve(info);
            });
        })
    }
    /**
     * Puts socket client (WebRTC participant) into waiting room (forces client disconnect from socket server)
     * @param {Object} params - The parameters object.
     * @param {string} params.roomPublisherId - user id (within Qbix's users) of user/publisher of WebRTC room (stream's publisherId)
     * @param {string} params.roomId - room id (Qbix's stream's name) to which WebRTC participant is connected
     * @param {string} params.userId - user id (within Qbix's users) that must be put into waiting room
     * @param {string} params.soocketRoomId - id of room within socket.io (has next pattern: params.roomPublisherId + '_' + params.roomId)
     * @returns {Promise<Object>} A promise that resolves when user is put into waiting room
     */
    Q.plugins.Media.WebRTC.putInWaitingRoom = function (params) {
        return new Promise(function (resolve, reject) {
            if (!params.roomPublisherId || !params.roomId || !params.userId || !params.soocketRoomId) {
                return reject('Next params are required: roomPublisherId, roomId, userId, soocketRoomId');
            }

            Q.plugins.Streams.fetchOne(params.roomPublisherId, params.roomPublisherId, 'Media/webrtc/' + params.roomId, function (err, stream) {

                if (err || !stream) {
                    return reject('Error while fetching stream of WebRTC room');
                }

                if (!stream.testAdminLevel('manage')) {
                    return reject('No permissions to do action');;
                }

                stream.post(params.roomPublisherId, {
                    type: 'Media/webrtc/left'
                }, function (err) {
                    if (err) {
                        console.log('Something went wrong when posting Media/webrtc/left')
                    }
                });

                stream.leave({ userId: params.userId }, async function () {
                    var webrtcNamespace = io.of('/webrtc');
                    const clients = await webrtcNamespace.in(params.soocketRoomId).fetchSockets();

                    for (let i in clients) {
                        let socketClient = clients[i];
                        if (socketClient.userPlatformId == params.userId) {                            
                            //send message to client forcing him to dicsconnect from WebRTC room by himself
                            socketClient.emit('Media/webrtc/leave'); 

                            //seinding message to other clients with instruction to stop receiving media from the user who was put in waiting room
                            socketClient.broadcast.to(params.soocketRoomId).emit('Media/webrtc/participantDisconnected', socketClient.client.id);

                            //disconnect user from signaling server so he will not receive new media tracks from other participants
                            socketClient.disconnect();
                        }
                    }

                    resolve();
                });
            });
        });
    };

    expressApp.post('/Q/webrtc', Webrtc_request_handler);
    
    function Webrtc_request_handler(req, res, next) {
        var parsed = req.body;
        if (!Q.Utils.validate(req.body)) {
            return;
        }
        if (!req.internal || !req.validated
        || !parsed || !parsed['Q/method']) {
            return next();
        }
        switch (parsed['Q/method']) {
            case 'Media/webrtc/updateAccess':
                var roomId = parsed.roomId;
                var userId = parsed.userId;
                var newAccess = parsed.newAccess;
                newAccess.personalAccess = newAccess.personalAccess == true ? true : false;
                newAccess.isCohost = newAccess.isCohost == true ? true : false;
                newAccess.isAdmin = newAccess.isAdmin == true ? true : false;
                if(!WebRTC.rooms[roomId] || !WebRTC.rooms[roomId][userId] || !newAccess) {
                    return;
                }

                for (let client in WebRTC.rooms[roomId][userId]) {
                    if (Object.prototype.hasOwnProperty.call(WebRTC.rooms[roomId][userId], client)) {
                        WebRTC.rooms[roomId][userId][client]['access'] = newAccess;
                    }
                }

                break;
            case 'Media/webrtc/turnLimitsOnOrOff':
                var roomId = parsed.roomId;
                var action = parsed.action;
                if(!WebRTC.rooms[roomId]) {
                    return;
                }

                let limitsManager = require('./WebRTC/limitsManager')(socket, io);

                if(action == 'on') {
                    for (let userId in WebRTC.rooms[roomId]) {
                        for (let client in WebRTC.rooms[roomId][userId]) {
                            if (Object.prototype.hasOwnProperty.call(WebRTC.rooms[roomId][userId], client)) {
                                limitsManager.init(WebRTC.rooms[roomId][userId][client], io, roomId).then(function (limitsInfo) {
                                    WebRTC.rooms[roomId][userId][client].emit('Media/webrtc/limitsTurnedOn', limitsInfo);
                                });
                            }
                        }
                    }
                } else {
                    for (let i in WebRTC.roomsWithLimits) {
                        if(WebRTC.roomsWithLimits[i].id == roomId) {
                            WebRTC.roomsWithLimits[i].remove();
                            break;
                        }
                    }

                    for (let userId in WebRTC.rooms[roomId]) {
                        for (let client in WebRTC.rooms[roomId][userId]) {
                            if (Object.prototype.hasOwnProperty.call(WebRTC.rooms[roomId][userId], client)) {
                                if (WebRTC.rooms[roomId][userId][client].unsubscribeLimitsHandlers) {
                                    WebRTC.rooms[roomId][userId][client].unsubscribeLimitsHandlers();
                                }
                                WebRTC.rooms[roomId][userId][client].webrtcRoom = null;
                                WebRTC.rooms[roomId][userId][client].webrtcParticipant = null;
                                WebRTC.rooms[roomId][userId][client].emit('Media/webrtc/limitsTurnedOff');
                            }
                        }
                    }
                }

                break;
            case 'Media/webrtc/updateLimits':
                var roomId = parsed.roomId;
                var limits = parsed.limits;
                if(!WebRTC.rooms[roomId]) {
                    return;
                }
                for (let i in WebRTC.roomsWithLimits) {
                    if(WebRTC.roomsWithLimits[i].id == roomId) {
                        WebRTC.roomsWithLimits[i].limits = {
                            audio: limits.audio,
                            video: limits.video,
                            minimalTimeOfUsingSlot: limits.minimalTimeOfUsingSlot,
                            timeBeforeForceUserToDisconnect: limits.timeBeforeForceUserToDisconnect
                        };
                        break;
                    }
                }

                for (let userId in WebRTC.rooms[roomId]) {
                    for (let client in WebRTC.rooms[roomId][userId]) {
                        if (Object.prototype.hasOwnProperty.call(WebRTC.rooms[roomId][userId], client)) {
                            WebRTC.rooms[roomId][userId][client].emit('Media/webrtc/limitsUpdated', limits);
                        }
                    }
                }

                break;
            case 'Media/webrtc/forceDisconnect':
                break;
            case 'Media/webrtc/putInWaitingRoom':
                Q.plugins.Media.WebRTC.putInWaitingRoom({
                    roomPublisherId: parsed.roomPublisherId,
                    userId: parsed.userId,
                    roomId: parsed.roomId,
                    soocketRoomId: parsed.soocketRoomId,
                });
                break;
            case 'Media/livestream/reminders':
                let stream = Q.plugins.Streams.Stream.construct(JSON.parse(parsed.stream), true);
                let participant = new Q.plugins.Streams.Participant(JSON.parse(parsed.participant));
                let msg = Q.plugins.Streams.Message.construct(JSON.parse(parsed.msg), true);
				msg.fillMagicFields();

                stream.notify(participant, 'Media/livestream/reminder', msg, function(err) {
                    if (err) {
                        console.error(err);
                    }
                });
                break;
            default:
                break;
        }
        return next();
    }

    require('./WebRTC/streaming')(io);
    require('./WebRTC/recording')(io);


    webrtcNamespace.on('connection', function(socket) {
        require('./WebRTC/clientsManager')(socket, io, expressApp);

        require('./WebRTC/signaling')(socket, io, expressApp);

        require('./WebRTC/localRecording')(socket, io);

        //if( socket.handshake.query.limitsEnabled) require('./WebRTC/limitsManager')(socket, io);

        socket.on('Media/webrtc/log', function (message) {});

        socket.on('Media/webrtc/errorlog', function (message) {});

        socket.on('Media/webrtc/errorlog_timeout', function (message) {});

    });

    return WebRTC.listen.result = {
		socket: socket
	};

}

WebRTC.listen.options = {};

module.exports = WebRTC;