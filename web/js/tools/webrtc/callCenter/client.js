(function ($, window, undefined) {
    

    var _icons = {
        hungUp: '<svg version="1.1" x="0px" y="0px" width="90.182373" height="62.977245" viewBox="-0.067 -0.378 90.182373 62.977245" enable-background="new -0.067 -0.378 101 101" xml:space="preserve" id="svg66" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs58"> </defs> <path fill="#FFFFFF" d="M 40.67337,-0.345341 C -5.9408979,0.549606 -0.37124761,23.629725 0.69580429,27.016099 1.8415328,32.774245 6.252342,35.655777 10.727075,34.024876 l 8.516746,-2.66681 c 4.589471,-1.673518 7.500506,-7.916837 6.499018,-13.947073 l -0.190135,-1.140812 c 15.486185,-4.382944 28.839905,-3.256885 39.261281,-0.357323 l -0.08523,0.486812 c -0.996571,6.030236 1.911187,12.275194 6.503935,13.950351 l 8.513468,3.547005 c 3.850238,1.404706 7.648025,-1.299803 9.365798,-5.622101 0.02295,0.01967 0.03442,0.03442 0.03442,0.03442 0,0 0.23603,-0.581879 0.473699,-1.57845 0.01967,-0.07704 0.03442,-0.16391 0.05409,-0.239308 0.03606,-0.183579 0.07704,-0.372075 0.116376,-0.576962 0.02459,-0.114737 0.05081,-0.224556 0.07376,-0.342571 l -0.0098,-0.0066 C 91.100177,18.219067 89.816765,-1.282904 40.67337,-0.345341 Z" style="fill:#d40000;stroke-width:1.6391" id="path62" /> <path fill="#FFFFFF" d="m 58.354305,43.518523 -9.001918,3.555201 V 26.230971 c 0,-0.396661 -0.321263,-0.719563 -0.717924,-0.719563 H 41.41752 c -0.399939,0 -0.721202,0.321263 -0.721202,0.719563 V 47.070446 L 31.69276,43.516884 c -0.299955,-0.121293 -0.647443,-0.02131 -0.842496,0.234391 -0.09671,0.131128 -0.142601,0.283564 -0.142601,0.440917 0,0.152436 0.04917,0.30815 0.149158,0.440917 l 13.596306,17.680935 c 0.136045,0.180301 0.349128,0.285203 0.573684,0.285203 0.224556,0 0.437639,-0.104902 0.572045,-0.285203 L 59.196801,44.633109 c 0.198331,-0.265534 0.198331,-0.617939 0.0016,-0.876917 -0.195052,-0.260616 -0.542541,-0.357323 -0.844135,-0.237669 z" style="fill:#d40000;stroke-width:1.6391" id="path64" /></svg>'
    };

    var ua = navigator.userAgent;
    var _isiOS = false;
    var _isAndroid = false;
    var _isiOSCordova = false;
    var _isAndroidCordova = false;
    if (ua.indexOf('iPad') != -1 || ua.indexOf('iPhone') != -1 || ua.indexOf('iPod') != -1) _isiOS = true;
    if (ua.indexOf('Android') != -1) _isAndroid = true;
    if (typeof cordova != 'undefined' && _isiOS) _isiOSCordova = true;
    if (typeof cordova != 'undefined' && _isAndroid) _isAndroidCordova = true;

    /**
     * Media/webrtc/callCenter/client tool.
     * tool for making a call to the call center endpoint (stream). Tool shows prompt dialog where user enters a topic of a call. After user entered the topic and clicked "Done", 
     * call request is made and appeared in the calls list in "manager" tool. In the time between used made call request and is accepted, user can chat with hosts via text chat.
     * 
     * @module Media
     * @constructor
     * @param {Object} options
     */
    Q.Tool.define("Media/webrtc/callCenter/client", function (options) {
        var tool = this;
        
        tool.myWaitingRoomStream = null;
        tool.currentActiveWebRTCRoom = null;
        tool.texts = {
            callCreatedTitle: 'Call request created',
            callCreated: 'Please wait until your call will be accepted. The host can interview you before accepting you to the live show. Please do not close this page.',
            putOnHoldTitle: 'Call was put on hold',
            putOnHold: 'Your call was put on hold. Please wait...',
            movedToInterviewTitle: 'Interview',
            movedToInterview: 'You was moved into interview room',
            callDeclinedTitle: 'Call declined',
            callDeclined: 'Your call was declined',
            callEndedTitle: 'Call ended',
            callEnded: 'Your call was ended',
            callAcceptedTitle: 'Your call was accepted',
            youInLiveTitle: 'You are in live show now',
            callAccepted: 'Your call was accepted. You are in live show now.',
            youCanceledCall: 'You canceled the call request.',
            youEndedCall: 'You ended the call.',
        };

        tool.loadStyles();
    },

        {
            onStatusChange: new Q.Event(),
            publisherId: null,
            streamName: null,
            onRefresh: new Q.Event()
        },

        {
            refresh: function () {
                var tool = this;
            },
            loadStyles: function () {
                return new Promise(function(resolve, reject){
                    Q.addStylesheet('{{Media}}/css/tools/callCenterClient.css?ts=' + performance.now(), function () {
                        resolve();
                    });
                });
            },
            declareStreamEventHandlers: function() {
                var tool = this;
                tool.myWaitingRoomStream.onMessage("Media/webrtc/accepted").set(function (message) {
                    tool.state.isActive = true;
                    Q.handle(tool.state.onStatusChange, null, [tool.state.isActive]);
                    tool.onAcceptedHandler(message);
                }, tool);
                tool.myWaitingRoomStream.onMessage("Media/webrtc/callEnded").set(function (message) {
                    tool.state.isActive = false;
                    Q.handle(tool.state.onStatusChange, null, [tool.state.isActive]);
                    tool.onCallEndedHandler(message);
                }, tool);
                tool.myWaitingRoomStream.onMessage("Media/webrtc/callDeclined").set(function (message) {
                    tool.state.isActive = false;
                    Q.handle(tool.state.onStatusChange, null, [tool.state.isActive]);
                    tool.onCallEndedHandler(message);
                }, tool);
                tool.myWaitingRoomStream.onMessage("Media/webrtc/interview").set(function (message) {
                    tool.state.isActive = true;
                    Q.handle(tool.state.onStatusChange, null, [tool.state.isActive]);
                    tool.onInterviewHandler(message);
                }, tool);
                tool.myWaitingRoomStream.onMessage("Media/webrtc/hold").set(function (message) {
                    tool.state.isActive = true;
                    Q.handle(tool.state.onStatusChange, null, [tool.state.isActive]);
                    tool.onHoldHandler(message);
                }, tool);

            },
            getCallCenterEndpointStream: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.Streams.get(tool.state.publisherId, tool.state.streamName, function (err, stream) {
                        if (!stream) {
                            console.error('Error while getting call center stream');
                            reject('Error while getting call center stream');
                            return;
                        }

                        resolve(stream);
                    });
                });
            },
            requestCall: function (onClose) {
                var tool = this;
                Q.Socket.onConnect().addOnce(function () {
                    var socket = Q.Socket.get();        
                    Q.prompt(null, function(topic) {
                        Q.req("Media/callCenter", ["room"], function (err, response) {
                            var msg = Q.firstErrorMessage(err, response && response.errors);
    
                            if (msg) {
                                return console.error(msg);
                            }
                            tool.state.isActive = true;
                            Q.handle(tool.state.onStatusChange, null, [tool.state.isActive]);
        
                            Q.Streams.get(response.slots.room.stream.fields.publisherId, response.slots.room.stream.fields.name, function (err, stream) {    
                                tool.myWaitingRoomStream = stream;
                                tool.declareStreamEventHandlers();
                                tool.showWaitingLoader(tool.texts.callCreatedTitle, tool.texts.callCreated);
                            });
    
                        }, {
                            method: 'post',
                            fields: {
                                publisherId: Q.Users.loggedInUserId(),
                                description: topic,
                                socketId: socket.socket.id,
                                closeManually: true,
                                relate: {
                                    publisherId: tool.state.publisherId,
                                    streamName: tool.state.streamName,
                                    relationType: 'Media/webrtc/callCenter/call'
                                }
                            }
                        });
    
                    }, {
                        title: 'What is this call about',
                        onClose: function () {
                            if(onClose) onClose();
                        }
                    })
                });
            },
            cancelCallRequest: function () {
                var tool = this;
                if(!tool.myWaitingRoomStream) return;

                Q.req("Media/webrtc", ["closeWaitingRoom"], function (err, response) {
                    var msg = Q.firstErrorMessage(err, response && response.errors);

                    if (msg) {
                        return console.error(msg);
                    }
                    tool.state.isActive = false;
                    Q.handle(tool.state.onStatusChange, null, [tool.state.isActive]);
                    if(tool.currentActiveWebRTCRoom && tool.currentActiveWebRTCRoom.isActive()) {
                        tool.showModalNotice(tool.texts.callEndedTitle, tool.texts.youEndedCall);
                        tool.currentActiveWebRTCRoom.stop();
                        tool.currentActiveWebRTCRoom  = null;
                    } else {
                        tool.showModalNotice(tool.texts.callEndedTitle, tool.texts.youCanceledCall);
                    }

                }, {
                    method: 'post',
                    fields: {
                        publisherId: tool.state.publisherId,
                        streamName: tool.state.streamName,
                        waitingRoomStreamName: tool.myWaitingRoomStream.fields.name,
                        waitingRoomUserId: tool.myWaitingRoomStream.fields.publisherId
                    }
                });
            },
            getWaitingLoaderSpinner: function () {
                let loader = document.createElement('SPAN');
                loader.className = 'media-callcenter-c-loader';
                loader.innerHTML = '<svg class="media-callcenter-c-loader-ring" viewBox="25 25 50 50" stroke-width="5"> <circle cx="50" cy="50" r="20" /></svg>';
                return loader;
            },
            showWaitingLoader: function (title, text) {
                var tool = this;
                let dialogContentCon = document.createElement('DIV');
                dialogContentCon.className = 'media-callcenter-c-waiting-dialog';
                let dialogTextContent = document.createElement('DIV');
                dialogContentCon.className = 'media-callcenter-c-waiting-content';
                dialogTextContent.innerHTML = text;
                dialogContentCon.appendChild(dialogTextContent);

                let chatCon = document.createElement('DIV');
                chatCon.className = 'media-callcenter-c-waiting-chat';
                dialogContentCon.appendChild(chatCon);

                let buttonsCon = document.createElement('DIV');
                buttonsCon.className = 'media-callcenter-c-waiting-buttons';
                dialogContentCon.appendChild(buttonsCon);
                let hangupButton = document.createElement('DIV');
                hangupButton.className = 'media-callcenter-c-waiting-hang-up Streams_chat_call Streams_chat_submit_replacement';
                hangupButton.innerHTML = _icons.hungUp;
                hangupButton.dataset.touchlabel = 'Cancel call request';
                buttonsCon.appendChild(hangupButton);
                //let loader = tool.getWaitingLoaderSpinner();
                //dialogContentCon.appendChild(loader);

                hangupButton.addEventListener('click', function () {
                    tool.hideWaitingLoader();
                    tool.cancelCallRequest();
                    if(tool.waitingRoomChatTool) {
                        tool.waitingRoomChatTool.remove();
                    }
                });

                Q.activate(
                    Q.Tool.setUpElement(chatCon, 'Streams/chat', Q.extend({}, {}, {
                        publisherId: tool.myWaitingRoomStream.fields.publisherId,
                        streamName: tool.myWaitingRoomStream.fields.name
                    })),
                    {},
                    function () {
                        let chatTool = this;
                        tool.waitingRoomChatTool = chatTool;
                    }
                )

                Q.Dialogs.push({
					title: title,
					content: dialogContentCon,
					className: 'media-callcenter-c-waiting',
					noClose: true,
                    onActivate: function (dialog) {
                        let title = dialog.querySelector('.Q_dialog_title');
                        title.appendChild(hangupButton);
                    }
				});
            },
            hideWaitingLoader: function () {
                for(let d = Q.Dialogs.dialogs.length - 1; d >= 0; d--){
                    Q.Dialogs.close(Q.Dialogs.dialogs[d]);
                }
            },
            showModalNotice: function (title, text) {
                var tool = this;
                let dialogContentCon = document.createElement('DIV');
                dialogContentCon.className = 'media-callcenter-c-waiting-dialog';
                let dialogTextContent = document.createElement('DIV');
                dialogContentCon.className = 'media-callcenter-c-waiting-content';
                dialogTextContent.innerHTML = text;
                dialogContentCon.appendChild(dialogTextContent);

                let chatCon = document.createElement('DIV');
                chatCon.className = 'media-callcenter-c-waiting-chat';
                dialogContentCon.appendChild(chatCon);

                Q.Dialogs.push({
					title: title,
					content: dialogContentCon,
					className: 'media-callcenter-c-waiting',
					noClose: false,
                    onActivate: function () {}
				});
            },
            onAcceptedHandler: function (message) {
                var tool = this;
                tool.hideWaitingLoader();
                if(tool.currentActiveWebRTCRoom && tool.currentActiveWebRTCRoom.isActive()) {
                    tool.currentActiveWebRTCRoom.notice.show(tool.texts.callAcceptedTitle);
                    tool.currentActiveWebRTCRoom.switchTo(tool.state.publisherId, tool.state.streamName.split('/').pop(), { resumeClosed: true }).then(function () {
                        tool.currentActiveWebRTCRoom.notice.show(tool.texts.youInLiveTitle);
                    });
                } else {
                    tool.currentActiveWebRTCRoom = Q.Media.WebRTC({
                        roomId: tool.state.streamName.split('/').pop(),
                        roomPublisherId: tool.state.publisherId,
                        element: document.body,
                        startWith: { video: false, audio: true },
                        onWebRTCRoomCreated: function () {
                            tool.currentActiveWebRTCRoom.notice.show(tool.texts.callAcceptedTitle);
                            tool.currentActiveWebRTCRoom.notice.show(tool.texts.youInLiveTitle);
                            let signalingLibInstance = tool.currentActiveWebRTCRoom.getWebrtcSignalingLib();
                            signalingLibInstance.event.on('beforeDisconnect', function (e) {
                                if (!e.roomIsSwitching && e.byLocalUser) {
                                    tool.cancelCallRequest();
                                }
                            });
                        }
                    });

                    tool.currentActiveWebRTCRoom.start();
                }

                tool.showModalNotice(tool.texts.callAcceptedTitle, tool.texts.callAccepted);

            },
            onCallEndedHandler: function (message) {
                var tool = this;
                tool.hideWaitingLoader();
                let notificationText, notificationTitle;
                if(message.type == 'Media/webrtc/callDeclined') {
                    notificationText = tool.texts.callDeclined;
                    notificationTitle = tool.texts.callDeclinedTitle;
                } else {
                    notificationText = tool.texts.callEnded;
                    notificationTitle = tool.texts.callEndedTitle;
                }
                if(tool.currentActiveWebRTCRoom && tool.currentActiveWebRTCRoom.isActive()) {
                    var message = JSON.parse(message.instructions);
                    var signalingLib = tool.currentActiveWebRTCRoom.getWebrtcSignalingLib();
                    var localParticipant = signalingLib.localParticipant();
    
                    var userId = localParticipant.identity != null ? localParticipant.identity.split('\t')[0] : null;
    
                    if(message.userId == userId) {
                        if(message.immediate === true) {
                            if(signalingLib.initNegotiationState == 'ended') tool.currentActiveWebRTCRoom.notice.show(notificationText);
                            tool.currentActiveWebRTCRoom.stop();
                            tool.currentActiveWebRTCRoom = null;
                        } else {
                            if(signalingLib.initNegotiationState == 'ended') tool.currentActiveWebRTCRoom.notice.show(notificationText);
    
                            setTimeout(function () {
                                tool.currentActiveWebRTCRoom.stop();
                                tool.currentActiveWebRTCRoom = null;
                            }, 5000);
                        }
                    }
                } else {
                    
                }
                
                tool.showModalNotice(notificationTitle, notificationText);
            },
            onInterviewHandler: function (message) {
                var tool = this;
                tool.hideWaitingLoader();
                if(tool.currentActiveWebRTCRoom && tool.currentActiveWebRTCRoom.isActive()) {
                    //tool.myWaitingRoomStream.setAttribute('closeManually', true);
                    var currentRoomStream = tool.currentActiveWebRTCRoom.roomStream();
                    if(currentRoomStream.fields.name == tool.myWaitingRoomStream.fields.name) {
                        return;
                    }
                    tool.currentActiveWebRTCRoom.switchTo(tool.myWaitingRoomStream.fields.publisherId, tool.myWaitingRoomStream.fields.name.split('/').pop(), { resumeClosed: true }).then(function () {
                        let signalingLibInstance = tool.currentActiveWebRTCRoom.getWebrtcSignalingLib();
                        signalingLibInstance.event.on('beforeDisconnect', function (e) {
                            if (!e.roomIsSwitching && e.byLocalUser) {
                                tool.cancelCallRequest();
                            }
                        }); 
                    });
                } else {
                    tool.currentActiveWebRTCRoom = Q.Media.WebRTC({
                        roomId: tool.myWaitingRoomStream.fields.name.split('/').pop(),
                        roomPublisherId: tool.myWaitingRoomStream.fields.publisherId,
                        element: document.body,
                        startWith: { video: false, audio: true },
                        onWebRTCRoomCreated: function () {
                            let signalingLibInstance = tool.currentActiveWebRTCRoom.getWebrtcSignalingLib();
                            signalingLibInstance.event.on('beforeDisconnect', function (e) {
                                if (!e.roomIsSwitching && e.byLocalUser) {
                                    tool.cancelCallRequest();
                                }
                            });
                        }
                    });

                    tool.currentActiveWebRTCRoom.start();
                }

                tool.showModalNotice(tool.texts.movedToInterviewTitle, tool.texts.movedToInterview);

            },
            onHoldHandler: function (message) {
                var tool = this;
                tool.hideWaitingLoader();
                if(tool.currentActiveWebRTCRoom && tool.currentActiveWebRTCRoom.isActive()) {
                    var message = JSON.parse(message.instructions);
                    var signalingLib = tool.currentActiveWebRTCRoom.getWebrtcSignalingLib();
                    var localParticipant = signalingLib.localParticipant();
    
                    var userId = localParticipant.identity != null ? localParticipant.identity.split('\t')[0] : null;
    
                    if(message.userId == userId) {
                        if(signalingLib.initNegotiationState == 'ended') tool.currentActiveWebRTCRoom.notice.show(message.msg);
                        //tool.showWaitingLoader(tool.texts.putOnHoldTitle, tool.texts.putOnHold);
                        tool.currentActiveWebRTCRoom.stop();
                        tool.currentActiveWebRTCRoom = null;
                    }
                } else {
                    //tool.showWaitingLoader(tool.texts.putOnHoldTitle, tool.texts.putOnHold);
                }
                tool.showWaitingLoader(tool.texts.putOnHoldTitle, tool.texts.putOnHold);

            }
        }

    );

})(window.jQuery, window);