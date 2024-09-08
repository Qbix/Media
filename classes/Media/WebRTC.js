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

    //console.log('socket', socket.io.httpServer)
    var expressApp = internalSever.attached.express;

    require('./WebRTC/WebcastServer')(socket);

    var _debug = Q.Config.get(['Media', 'webrtc', 'debug'], {});
    var io = socket.io;
    var webrtcNamespace = io.of('/webrtc');

    Q.plugins.Media.WebRTC.rooms = [];

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
                console.log('WebRTC.rooms BEFORE updateAccess', newAccess)
                if(!WebRTC.rooms[roomId] || !WebRTC.rooms[roomId][userId] || !newAccess) {
                    return;
                }

                for (let client in WebRTC.rooms[roomId][userId]) {
                    if (Object.prototype.hasOwnProperty.call(WebRTC.rooms[roomId][userId], client)) {
                        console.log('WebRTC.rooms[roomId][userId]')
                        WebRTC.rooms[roomId][userId][client]['access'] = newAccess;
                    }
                }

                break;
            case 'Media/webrtc/turnLimitsOnOrOff':
                var roomId = parsed.roomId;
                var action = parsed.action;
                console.log('WebRTC.rooms BEFORE turnLimitsOnOrOff', action)
                if(!WebRTC.rooms[roomId]) {
                    return;
                }
                console.log('WebRTC.rooms BEFORE turnLimitsOnOrOff 2')

                let limitsManager = require('./WebRTC/limitsManager')(socket, io);

                console.log('WebRTC.rooms BEFORE turnLimitsOnOrOff limitsManager', limitsManager)

                if(action == 'on') {
                    console.log('WebRTC.rooms BEFORE turnLimitsOnOrOff WebRTC.rooms[roomId][', WebRTC.rooms[roomId])

                    for (let userId in WebRTC.rooms[roomId]) {
                        for (let client in WebRTC.rooms[roomId][userId]) {
                            console.log('WebRTC.rooms BEFORE turnLimitsOnOrOff WebRTC.rooms[roomId] 2', )

                            if (Object.prototype.hasOwnProperty.call(WebRTC.rooms[roomId][userId], client)) {
                                console.log('WebRTC.rooms[roomId][userId]')
                                limitsManager.init(WebRTC.rooms[roomId][userId][client], io, roomId).then(function (limitsInfo) {
                                    console.log('INITED LIMITS FOR USER', limitsInfo)
                                    WebRTC.rooms[roomId][userId][client].emit('Media/webrtc/limitsTurnedOn', limitsInfo);
                                });
                            }
                        }
                    }
                } else {
                    for (let i in WebRTC.roomsWithLimits) {
                        if(WebRTC.roomsWithLimits[i].id == roomId) {
                            console.log('WebRTC.rooms BEFORE turnLimitsOnOrOff OFF REMOVE ROOM')

                            WebRTC.roomsWithLimits[i].remove();
                            break;
                        }
                    }

                    for (let userId in WebRTC.rooms[roomId]) {
                        for (let client in WebRTC.rooms[roomId][userId]) {
                            if (Object.prototype.hasOwnProperty.call(WebRTC.rooms[roomId][userId], client)) {
                                console.log('WebRTC.rooms[roomId][userId] 2')
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
                console.log('WebRTC.rooms BEFORE updateLimits', limits)
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
                console.log('WebRTC.rooms BEFORE updateLimits 2')

                for (let userId in WebRTC.rooms[roomId]) {
                    for (let client in WebRTC.rooms[roomId][userId]) {
                        if (Object.prototype.hasOwnProperty.call(WebRTC.rooms[roomId][userId], client)) {
                            console.log('WebRTC.rooms[roomId][userId] 2')
                            WebRTC.rooms[roomId][userId][client].emit('Media/webrtc/limitsUpdated', limits);
                        }
                    }
                }

                break;
            case 'Media/webrtc/forceDisconnect':
                break;
            default:
                break;
        }
        return next();
    }

    require('./WebRTC/streaming')(io);
    require('./WebRTC/recording')(io);

    webrtcNamespace.on('connection', function(socket) {
        if(_debug) console.log('made sockets connection', socket.id);

        require('./WebRTC/clientsManager')(socket, io, expressApp);

        require('./WebRTC/signaling')(socket, io, expressApp);

        require('./WebRTC/localRecording')(socket, io);

        //if( socket.handshake.query.limitsEnabled) require('./WebRTC/limitsManager')(socket, io);

        socket.on('Media/webrtc/log', function (message) {
            if(_debug) console.log('CONSOLE.LOG', message);
        });

        socket.on('Media/webrtc/errorlog', function (message) {
            console.log('CONSOLE.ERROR', message);
            var todaysDay = new Date().toISOString().replace(/T.*/, ' ');
            console.log('CONSOLE.ERROR DATE', todaysDay);
        });

        socket.on('Media/webrtc/errorlog_timeout', function (message) {
            if(_debug) console.log('CONSOLE.ERROR', message);
            if(_debug) console.log('CONSOLE.ERROR DATE', (new Date().toISOString()));
        });

    });

    return WebRTC.listen.result = {
		socket: socket
	};

}

WebRTC.listen.options = {};

module.exports = WebRTC;