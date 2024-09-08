const Q = require('Q');
module.exports = function(socket, io, expressApp) {
    var WebRTC =  Q.plugins.Media.WebRTC;

    var nspName = '/webrtc';
    var roomId;
    var socketRoom;
    var userPlatformId;
    
    socket.on('Media/webrtc/joined', function (identity, cb) {
        console.log('WebRTC.rooms Media/webrtc/joined before',identity)
        userPlatformId = identity.username.split('\t')[0];
        roomId = identity.room;
        socketRoom = identity.roomPublisher + '_' + identity.room;

        if(!WebRTC.rooms[socketRoom]) {
            WebRTC.rooms[socketRoom] = {};
        }

        if(!WebRTC.rooms[socketRoom][userPlatformId]) {
            WebRTC.rooms[socketRoom][userPlatformId] = {};
        }

        WebRTC.rooms[socketRoom][userPlatformId][socket.id] = socket;

        console.log('WebRTC.rooms Media/webrtc/joined after',WebRTC.rooms)
    });


    socket.on('disconnect', function() {
        if(!WebRTC.rooms[socketRoom]) return;

        if (WebRTC.rooms[socketRoom][userPlatformId]) {
            delete WebRTC.rooms[socketRoom][userPlatformId][socket.id];

            if (Object.keys(WebRTC.rooms[socketRoom][userPlatformId]).length == 0) {
                delete WebRTC.rooms[socketRoom][userPlatformId]
            }
        }

        io.of('/webrtc').in(socketRoom).fetchSockets().then(function (clients) {
            if(clients.length == 0) {
                delete WebRTC.rooms[socketRoom];
            }
        });
    });
};