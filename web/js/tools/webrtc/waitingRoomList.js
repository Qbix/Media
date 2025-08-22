(function ($, window, undefined) {

    var ua = navigator.userAgent;
    var _isiOS = false;
    var _isAndroid = false;
    var _isiOSCordova = false;
    var _isAndroidCordova = false;
    if (ua.indexOf('iPad') != -1 || ua.indexOf('iPhone') != -1 || ua.indexOf('iPod') != -1) _isiOS = true;
    if (ua.indexOf('Android') != -1) _isAndroid = true;
    if (typeof cordova != 'undefined' && _isiOS) _isiOSCordova = true;
    if (typeof cordova != 'undefined' && _isAndroid) _isAndroidCordova = true;

    function log() { }
    if (Q.Media.WebRTCdebugger) {
        log = Q.Media.WebRTCdebugger.createLogMethod('waitingRoomList.js')
    }

    /**
     * Media/webrtc/control tool.
     * Users can chat with each other via WebRTC using Twilio or raw streams
     * @module Media
     * @class Media webrtc
     * @constructor
     * @param {Object} options
     *  Hash of possible options
     */
    Q.Tool.define("Media/webrtc/waitingRoomList", function (options) {
        var tool = this;
        tool.waitingRoomsListEl = null;
        tool.waitingRoomsList = [];
        tool.relatedStreams = [];
        tool.trackedStreams = [];

        tool.webrtcUserInterface = options.webrtcUserInterface();
        tool.webrtcRoomStream = tool.webrtcUserInterface.roomStream();
        tool.webrtcSignalingLib = tool.webrtcUserInterface.getWebrtcSignalingLib();

        tool.loadStyles().then(function () {
            Q.Socket.onConnect().addOnce(function () {
                tool.createList();
                tool.declareEventsHandlers();
            });
        });

    },

        {
            onRefresh: new Q.Event(),
            controlsTool: null,
            webrtcUserInterface: null,
            hostSocketId: null
        },

        {
            loadStyles: function () {
                return new Promise(function (resolve, reject) {
                    Q.addStylesheet('{{Media}}/css/tools/waitingRoomList.css?ts=' + Date.now(), function () {
                        Q.handle(resolve, this);
                    });
                });
            },
            refresh: function () {
                var tool = this;

            },
            declareEventsHandlers: function () {
                var tool = this;

            },
            /**
             * Create participants popup that appears while pointer hovers users button on desktop/in modal box on mobile
             * @method participantsPopup
             */
            createList: function () {
                var tool = this;
                var socket = Q.Socket.get();

                tool.state.hostSocketId = socket.socket.id;

                tool.waitingRoomsListEl = document.createElement('UL');
                tool.waitingRoomsListEl.className = 'Media_webrtc_participants-waiting-list';
                tool.element.appendChild(tool.waitingRoomsListEl);

                Q.activate(
                    Q.Tool.setUpElement('div', 'Streams/related', {
                        publisherId: tool.webrtcRoomStream.fields.publisherId,
                        streamName: tool.webrtcRoomStream.fields.name,
                        relationType: 'Media/webrtc/waitingRoom',
                        tag: 'div',
                        isCategory: true,
                        creatable: false,
                        realtime: true,
                        onUpdate: function (e) {
                            tool.relatedStreams = e.relatedStreams;
                            tool.reloadWaitingRoomsList();
                            if (!tool.roomsListLoaded) {
                                tool.roomsListLoaded = true;
                                tool.onRoomsListFirstLoadHandler()
                            }
                        }
                    }),
                    {},
                    function () {
                        let relatedTool = this;
                        tool.webrtcRoomStream.onMessage('Media/webrtc/waitingRooom').set(function (message) {
                            log('bindStreamsEvents: Streams/joined')
                            relatedTool.refresh();
                        });
                    }
                );
            },
            onRoomsListFirstLoadHandler: function () {
                var tool = this;
                //check whether some waiting rooms are already inactive and close them
                for (let i in tool.waitingRoomsList) {
                    let roomDataObject = tool.waitingRoomsList[i];

                    Q.req("Media/webrtc", ["closeIfOffline"], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);

                        if (msg) {
                            return console.error(msg);
                        }

                    }, {
                        method: 'post',
                        fields: {
                            publisherId: roomDataObject.webrtcStream.fields.publisherId,
                            streamName: roomDataObject.webrtcStream.fields.name,
                            socketId: roomDataObject.webrtcStream.getAttribute('socketId'),
                            hostSocketId: tool.state.hostSocketId
                        }
                    });
                }
            },
            handleStreamEvents: function (stream, roomDataObject) {
                var tool = this;
                var streamAlreadyTracked = false;
                for (let i in tool.trackedStreams) {
                    if(tool.trackedStreams[i].fields.name == stream.fields.name) {
                        streamAlreadyTracked = true;
                        break;
                    }
                }
                if(streamAlreadyTracked) {
                    return;
                }

                //TODO: refactor
                stream.onMessage('Media/webrtc/admit').set(function (message) {
                    Q.Streams.get(message.publisherId, message.streamName, function (err) {
                        roomDataObject.webrtcStream = this;
                        tool.relatedStreams[`${this.fields.publisherId}\t${this.fields.name}`] = this;
                        tool.reloadWaitingRoomsList();
                    });
                });
                stream.onMessage('Streams/changed').set(function (message) {
                    Q.Streams.get(message.publisherId, message.streamName, function (err) {
                        roomDataObject.webrtcStream = this;
                        tool.relatedStreams[`${this.fields.publisherId}\t${this.fields.name}`] = this;
                        tool.reloadWaitingRoomsList();
                    });
                });
                tool.trackedStreams.push(stream);
            },
            reloadWaitingRoomsList: function () {
                var tool = this;
                var relatedStreams = tool.relatedStreams;
                for (let s in relatedStreams) {
                    //add very new waiting rooms
                    let stream = relatedStreams[s];
                    let roomExists;
                    for (let c in tool.waitingRoomsList) {
                        if (stream.fields.name == tool.waitingRoomsList[c].webrtcStream.fields.name) {
                            roomExists = tool.waitingRoomsList[c];
                            break;
                        }
                    }

                    var status = stream.getAttribute('status');

                    if(roomExists != null) {
                        continue;
                    }

                    let roomDataObject = {
                        title: stream.fields.title,
                        topic: stream.fields.content,
                        webrtcStream: stream,
                        statusInfo: {
                            status: status ? status : 'waiting'
                        }
                    }
                    //stream.subscribe()
                    //stream.observe()
                    tool.handleStreamEvents(stream, roomDataObject);
                    
                    createRoomItemElement(roomDataObject);

                    tool.waitingRoomsList.unshift(roomDataObject);

                    tool.waitingRoomsList.sort(function (x, y) {
                        return y.timestamp - x.timestamp;
                    })

                    //tool.handleStreamEvents(stream, roomDataObject);
                }

                for (let c in tool.waitingRoomsList) {
                    tool.waitingRoomsListEl.appendChild(tool.waitingRoomsList[c].roomElement);
                }

                for (let i = tool.waitingRoomsList.length - 1; i >= 0; i--) {
                    let roomIsClosed = true;
                    for (let n in relatedStreams) {
                        let status = relatedStreams[n].getAttribute('status');

                        if (relatedStreams[n].fields.name == tool.waitingRoomsList[i].webrtcStream.fields.name && status == 'waiting') {
                            roomIsClosed = false;
                        }
                    }
                    if (roomIsClosed) {
                        if (tool.waitingRoomsList[i].roomElement && tool.waitingRoomsList[i].roomElement.parentElement != null) {
                            tool.waitingRoomsList[i].roomElement.parentElement.removeChild(tool.waitingRoomsList[i].roomElement);
                        }
                        tool.waitingRoomsList.splice(i, 1);
                    }
                }

                function createRoomItemElement(roomDataObject) {
                    var roomItemCon = document.createElement('LI');
                    roomItemCon.className = 'webrtc-waiting-item';
                    roomDataObject.roomElement = roomItemCon;

                    let roomItemAvatar = document.createElement('DIV');
                    roomItemAvatar.className = 'webrtc-waiting-item-avatar-con';
                    roomItemCon.appendChild(roomItemAvatar);

                    let roomItemAvatarTool = document.createElement('DIV');
                    roomItemAvatarTool.className = 'webrtc-waiting-item-avatar-tool';
                    roomItemAvatar.appendChild(roomItemAvatarTool);

                    Q.activate(
                        Q.Tool.setUpElement(
                            roomItemAvatarTool, // or pass an existing element
                            "Users/avatar",
                            {
                                userId: roomDataObject.webrtcStream.fields.publisherId,
                                contents: false
                            }
                        )
                    );


                    let roomItemAvatarText = document.createElement('DIV');
                    roomItemAvatarText.className = 'webrtc-waiting-item-avatar-texttool';

                    roomItemAvatar.appendChild(roomItemAvatarText);
                    Q.activate(
                        Q.Tool.setUpElement(
                            roomItemAvatarText, // or pass an existing element
                            "Users/avatar",
                            {
                                userId: roomDataObject.webrtcStream.fields.publisherId,
                                icon: false
                            }
                        )
                    );

                    let roomItemButtons = document.createElement('DIV');
                    roomItemButtons.className = 'webrtc-waiting-item-buttons';
                    roomItemCon.appendChild(roomItemButtons);
                    let roomItemButtonsAdmit = document.createElement('BUTTON');
                    roomItemButtonsAdmit.className = 'webrtc-waiting-button webrtc-waiting-item-buttons-admit';
                    roomItemButtonsAdmit.innerHTML = 'Admit';
                    roomItemButtons.appendChild(roomItemButtonsAdmit);
                    let roomItemButtonsRemove = document.createElement('BUTTON');
                    roomItemButtonsRemove.className = 'webrtc-waiting-button webrtc-waiting-item-buttons-remove';
                    roomItemButtonsRemove.innerHTML = 'Remove';
                    roomItemButtons.appendChild(roomItemButtonsRemove);

                    roomItemButtonsAdmit.addEventListener('click', function () {
                        tool.onAdmitHandler(roomDataObject);
                    })

                    roomItemButtonsRemove.addEventListener('click', function () {
                        tool.onRemoveHandler(roomDataObject);
                    })

                }
            },
            onAdmitHandler: function (roomDataObject) {
                var tool = this;
                Q.req("Media/webrtc", ["admitUserToRoom"], function (err, response) {
                    var msg = Q.firstErrorMessage(err, response && response.errors);

                    if (msg) {
                        return console.error(msg);
                    }
                    roomDataObject.statusInfo.status = 'accepted';
                }, {
                    method: 'post',
                    fields: {
                        publisherId: tool.webrtcRoomStream.fields.publisherId,
                        streamName: tool.webrtcRoomStream.fields.name,
                        waitingRoomStreamName: roomDataObject.webrtcStream.fields.name,
                        userIdToAdmit: roomDataObject.webrtcStream.fields.publisherId
                    }
                });
            },
            onRemoveHandler: function (roomDataObject) {
                var tool = this;
                Q.req("Media/webrtc", ["closeWaitingRoom"], function (err, response) {
                    var msg = Q.firstErrorMessage(err, response && response.errors);

                    if (msg) {
                        return console.error(msg);
                    }
                    roomDataObject.statusInfo.status = 'closed';
                }, {
                    method: 'post',
                    fields: {
                        publisherId: tool.webrtcRoomStream.fields.publisherId,
                        streamName: tool.webrtcRoomStream.fields.name,
                        waitingRoomStreamName: roomDataObject.webrtcStream.fields.name,
                        waitingRoomUserId: roomDataObject.webrtcStream.fields.publisherId
                    }
                });
            }
        }
    );

})(window.jQuery, window);