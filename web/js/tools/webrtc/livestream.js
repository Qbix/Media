(function ($, window, undefined) {
    var _icons = {
        askQuestion: '<svg id="fi_2207581" enable-background="new 0 0 24 24" height="512" viewBox="0 0 24 24" width="512" xmlns="http://www.w3.org/2000/svg"><g><path d="m18 1h-12c-2.757 0-5 2.243-5 5v8c0 2.414 1.721 4.434 4 4.899v3.101c0 .369.203.708.528.882.148.079.31.118.472.118.194 0 .388-.057.555-.168l5.748-3.832h5.697c2.757 0 5-2.243 5-5v-8c0-2.757-2.243-5-5-5zm-6.555 16.168-4.445 2.963v-2.131c0-.552-.447-1-1-1-1.654 0-3-1.346-3-3v-8c0-1.654 1.346-3 3-3h12c1.654 0 3 1.346 3 3v8c0 1.654-1.346 3-3 3h-6c-.072 0-.174.007-.291.043-.116.035-.204.085-.264.125z"></path><path d="m12 4c-1.654 0-3 1.346-3 3 0 .552.447 1 1 1s1-.448 1-1c0-.551.448-1 1-1s1 .449 1 1c0 .322-.149.617-.409.808-1.011.74-1.591 1.808-1.591 2.929v.263c0 .552.447 1 1 1s1-.448 1-1v-.263c0-.653.484-1.105.773-1.317.768-.564 1.227-1.468 1.227-2.42 0-1.654-1.346-3-3-3z"></path><circle cx="12" cy="14" r="1"></circle></g></svg>',
        join: '<svg width="800px" height="800px" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"> <title>mic</title> <g id="Layer_2" data-name="Layer 2"> <g id="invisible_box" data-name="invisible box"> <rect width="48" height="48" fill="none"/> </g> <g id="Q3_icons" data-name="Q3 icons"> <g> <path fill="#000000" d="M24,30a8,8,0,0,0,8-8V10a8,8,0,0,0-16,0V22A8,8,0,0,0,24,30ZM20,10a4,4,0,0,1,8,0V22a4,4,0,0,1-8,0Z"/> <path fill="#000000" d="M40,22V20a2,2,0,0,0-4,0v2a12,12,0,0,1-24,0V20a2,2,0,0,0-4,0v2A16.1,16.1,0,0,0,22,37.9V42H14a2,2,0,0,0,0,4H33a2,2,0,0,0,0-4H26V37.9A16.1,16.1,0,0,0,40,22Z"/> </g> </g> </g> </svg>',
        arrowDown: '<svg width="800px" height="800px" viewBox="0 -4.5 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="Dribbble-Light-Preview" transform="translate(-220.000000, -6684.000000)" fill="#000000"> <g id="icons" transform="translate(56.000000, 160.000000)"> <path d="M164.292308,6524.36583 L164.292308,6524.36583 C163.902564,6524.77071 163.902564,6525.42619 164.292308,6525.83004 L172.555873,6534.39267 C173.33636,6535.20244 174.602528,6535.20244 175.383014,6534.39267 L183.70754,6525.76791 C184.093286,6525.36716 184.098283,6524.71997 183.717533,6524.31405 C183.328789,6523.89985 182.68821,6523.89467 182.29347,6524.30266 L174.676479,6532.19636 C174.285736,6532.60124 173.653152,6532.60124 173.262409,6532.19636 L165.705379,6524.36583 C165.315635,6523.96094 164.683051,6523.96094 164.292308,6524.36583" id="arrow_down-[#338]"> </path> </g> </g> </g> </svg>',
        share: '<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M16 7L12 3M12 3L8 7M12 3V16M20 13V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18L4 13" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/> </svg>',
        close: '<svg fill="#000000" width="800px" height="800px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4.293,18.293,10.586,12,4.293,5.707A1,1,0,0,1,5.707,4.293L12,10.586l6.293-6.293a1,1,0,1,1,1.414,1.414L13.414,12l6.293,6.293a1,1,0,1,1-1.414,1.414L12,13.414,5.707,19.707a1,1,0,0,1-1.414-1.414Z"/></svg>',
        viewerUser: '<svg width="42.473919mm" height="48.740181mm" viewBox="0 0 42.473919 48.740181" version="1.1" id="svg1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><defs id="defs1" /><g id="layer1" transform="translate(-107.11929,-113.67575)"><path id="path1" d="m 128.38286,113.67575 c -8.45499,0 -15.37529,6.9203 -15.37529,15.37529 0,7.22019 5.04816,13.31685 11.7874,14.94482 -1.8198,3.00454 -3.68758,3.50263 -9.00514,3.50263 -7.42036,0.76407 -8.33723,5.99032 -8.62118,8.52403 -0.11107,2.14225 0,6.39341 0,6.39341 h 5.9738 v -6.13503 c 0,-0.8298 0.51685,-2.45571 2.19573,-2.77657 1.75575,-0.17579 1.74326,-0.004 4.90771,-0.0646 4.45694,-0.0853 7.3473,-3.33563 8.1101,-4.3 0.76254,0.9641 3.65335,4.21466 8.11062,4.3 3.16443,0.0606 3.15196,-0.11119 4.90771,0.0646 1.67886,0.32086 2.19573,1.94677 2.19573,2.77657 v 6.13503 h 5.97379 c 0,0 0.11107,-4.25116 0,-6.39341 -0.28395,-2.53371 -1.2008,-7.75996 -8.62118,-8.52403 -5.311,0 -7.18073,-0.4971 -8.99841,-3.49178 6.76246,-1.61112 11.83338,-7.71892 11.83338,-14.95567 0,-8.45499 -6.91978,-15.37529 -15.37477,-15.37529 z m 0,6.1991 c 5.10428,0 9.17567,4.07192 9.17567,9.17619 0,5.10427 -4.07139,9.17566 -9.17567,9.17566 -5.10426,0 -9.17567,-4.07139 -9.17567,-9.17566 0,-5.10427 4.07141,-9.17619 9.17567,-9.17619 z" /></g></svg>'
    }

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
     * Media/webrtc/livestream tool.
     * 
     * @module Media
     * @constructor
     * @param {Object} options
     */
    Q.Tool.define("Media/webrtc/livestream", function (options) {
        var tool = this;
        
        tool.livestreamStream = null;
        tool.webrtcStream = null;
        tool.eventStream = null;
        tool.activeLivestreamings = [];
        tool.allLivestreamings = [];
        tool.videoContainerEl = null;
        tool.videoContainerTabsEl = null;
        tool.textChatContainerEl = null;
        tool.relatedStreams = [];
        tool.privateChatStream = null;
        tool.callCenterClientTool = null;
        tool.invitedUsers = [];
        tool.participatedUsers = [];
        tool.livestreamStreamParticipants = {};

        tool.compactBeforeWidget = null;
        tool.compactDuringWidget = null;
        tool.compactAfterWidget = null;

        Q.addStylesheet('{{Media}}/css/tools/livestream.css?ts=' + performance.now(), function () {
            Q.Streams.get(tool.state.publisherId, tool.state.streamName, function (err, stream, extra) {
                if(!this || !this.fields) {
                    console.error('Error while getting stream', err);
                    return;
                }
                tool.livestreamStream = this;
                tool.livestreamStreamParticipants = extra.participants;
                
                //tool.livestreamStream.observe();
                tool.livestreamStream.relatedFrom('Media/webrtc/livestream', {}, function () {
                    for(let i in this.relatedStreams) {
                        let relatedStream = this.relatedStreams[i];
                        if(relatedStream.fields.type == 'Media/webrtc') {
                            tool.webrtcStream = relatedStream;
                            break;
                        }
                    }

                    if(!tool.webrtcStream) {
                        return;
                    }

                    tool.state.onWebRTCStreamRefresh = Q.Streams.Stream.onRefresh(tool.webrtcStream.fields.publisherId, tool.webrtcStream.fields.name);
                    tool.state.onWebRTCStreamRefresh.set(function () {
                        tool.webrtcStream = this;
                        tool.updateWidgetStateOnStreamUpdate();
                    });
                })
                tool.livestreamStream.relatedFrom('Calendars/event/livestream', {}, function () {
                   for(let i in this.relatedStreams) {
                        let relatedStream = this.relatedStreams[i];
                        if(relatedStream.fields.type == 'Calendars/event') {
                            tool.eventStream = relatedStream;
                            break;
                        }
                    }

                    if(!tool.eventStream) return;

                    tool.state.onEventStreamRefresh = Q.Streams.Stream.onRefresh(tool.eventStream.fields.publisherId, tool.eventStream.fields.name);
                    tool.state.onEventStreamRefresh.set(function (param1, param2, param3, param4) {
                        tool.eventStream = this;
                        Q.handle(tool.state.onEventUpdate, tool);
                    });
                    Q.handle(tool.state.onEventUpdate, tool);

                })

                tool.state.onLivestreamStreamRefresh = Q.Streams.Stream.onRefresh(tool.state.publisherId, tool.state.streamName);
                tool.state.onLivestreamStreamRefresh.set(function(param1, param2, param3, param4) {
                    tool.livestreamStream = this;
                    tool.syncLivestreamsList();
                    Q.handle(tool.state.onLivestreamUpdate, tool);
                });

                tool.declareStreamEventHandlers();

                tool.syncLivestreamsList();

                //tool.createCompactDuring();
                //tool.createCompactAfter();
                //tool.createFull();
                //return;
                tool.updateWidgetStateOnStreamUpdate();

                tool.state.onLivestreamUpdate.add(function () {
                    tool.updateInvitedList();
                    tool.updateWidgetStateOnStreamUpdate();
                })

                tool.state.onActiveLivestreamingsUpdated.add(function (e) {
                    tool.updateWidgetStateOnStreamUpdate();
                });
               
                
            }, {participants: 100});
            
        });
    },

        {
            publisherId: null,
            streamName: null,
            webrtcPublisherId: null,
            webrtStreamName: null,
            showAsWidget: true,
            invitedSpeakers: [],
            layout: null, //wide||vertical
            startMode: 'compact', //compact||full
            mode: 'full', //compact||full
            wide_minChatWidth: 320,
            onEventUpdate: new Q.Event(),
            onLivestreamUpdate: new Q.Event(),
            onRefresh: new Q.Event(),
            onUpdate: new Q.Event(),
            onWebrtcStreamLoaded: new Q.Event(),
            onActiveLivestreamingsUpdated: new Q.Event(),
            onLivestreaStreamRefresh: new Q.Event(),
            onInvitedUsersListUpdate: new Q.Event(),
            onLiveIsPlaying: new Q.Event(),
            onEventStreamRefresh: null,
            onLivestreamStreamRefresh: null,
            onWebRTCStreamRefresh: null
        },

        {
            refresh: function () {
                var tool = this;
            },
            removeAllEventHandlers: function() {
                var tool = this;
                tool.livestreamStream.onMessage("Streams/changed").removeAllHandlers();
                tool.livestreamStream.onMessage("Media/livestream/start").removeAllHandlers();
                tool.livestreamStream.onMessage("Media/livestream/stop").removeAllHandlers();

                tool.state.onUpdate.removeAllHandlers();
                tool.state.onLivestreamUpdate.removeAllHandlers();
                tool.state.onLivestreaStreamRefresh.removeAllHandlers();
                tool.state.onActiveLivestreamingsUpdated.removeAllHandlers();
                tool.state.onWebrtcStreamLoaded.removeAllHandlers();
                tool.state.onLiveIsPlaying.removeAllHandlers();
                
                if(tool.state.onLivestreamStreamRefresh) {
                    tool.state.onLivestreamStreamRefresh.removeAllHandlers()
                }
                if(tool.state.onWebRTCStreamRefresh) {
                    tool.state.onWebRTCStreamRefresh.removeAllHandlers()
                }
            },
            stopPlayer: function () {
                let tool = this;
                for(let i in tool.allLivestreamings) {
                    let livestreamingObject = tool.allLivestreamings[i];

                    if(livestreamingObject.broadcastClient != null) {
                        livestreamingObject.broadcastClient.disconnect();
                    }

                    if (livestreamingObject.mediaElement && livestreamingObject.mediaElement.parentElement) {
                        livestreamingObject.mediaElement.parentElement.removeChild(livestreamingObject.mediaElement)
                    }
                }
            },
            removeTool: function (removedByQbixMethod) {
                let tool = this;
                return new Promise(function (resolve, reject) {
                    tool.removeAllEventHandlers();
                    tool.stopPlayer();

                    if (tool.currentWidgetUI) {
                        let widgetElement = tool.currentWidgetUI.widgetEl.querySelector('.media-livestream-widget');

                        let debouncer; //in case when transitionend is triggered multiple times 
                        widgetElement.addEventListener('transitionend', function () {
                            if(debouncer) clearTimeout(debouncer);
                            debouncer = setTimeout(function () {
                                if (!removedByQbixMethod) {
                                    Q.Tool.remove(tool.id);
                                }
                                if (tool.element.parentElement) tool.element.parentElement.removeChild(tool.element);
                                resolve();
                            }, 300);
                            
                        });

                        widgetElement.classList.add('media-livestream-widget-removed');

                    }
                    tool.livestreamStream.leave();
                });
            },
            getWebRTCStream: function () {
                //promise returns webrtc stream (if it was loaded, permissions are ok etc) or null otherwise
                var tool = this;
                if(tool.webrtcStream != null && tool.webrtcStream != 'inProgress' && tool.webrtcStream != 'failed') {
                    return new Promise(function (resolve, reject) {
                        resolve(tool.webrtcStream);
                    });
                } else  if(tool.webrtcStream != null && tool.webrtcStream == 'inProgress') {
                    return new Promise(function (resolve, reject) {
                        tool.state.onWebrtcStreamLoaded.addOnce(function (e) {
                            resolve(tool.webrtcStream != 'failed' ? tool.webrtcStream : null);
                        });
                    });
                    
                } else if(tool.webrtcStream == 'failed') {
                    return new Promise.resolve(null);
                }

                tool.webrtcStream != 'inProgress';
                return new Promise(function (resolve, reject) {
                    Q.Streams.get(tool.state.webrtcPublisherId, tool.state.webrtcStreamName, function (err) {
                        if(!this || !this.fields) {
                            console.error('Error while getting stream', err);
                            tool.webrtcStream = 'failed';
                            Q.handle(tool.state.onWebrtcStreamLoaded, tool);
                            resolve(null);
                            return;
                        }
                        tool.webrtcStream = this;
                        Q.handle(tool.state.onWebrtcStreamLoaded, tool);
                        resolve(tool.webrtcStream);

                    });
                });
            },
            refreshLivestreamStream: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    tool.livestreamStream.refresh(function (err, param1, extra) {
                        if(err != null) {
                            reject(err);
                        }

                        tool.livestreamStreamParticipants = extra.participants;
                        tool.livestreamStream = this;
                        Q.handle(tool.state.onLivestreaStreamRefresh, tool);
                        resolve();
                    }, 
                    {
                        evenIfNotRetained: true,
                        participants: 100,
                        extra: true
                    })
                });
            },
            declareStreamEventHandlers: function() {
                var tool = this;
                window.livestreamStream = tool.livestreamStream;
                tool.livestreamStream.onMessage("Streams/changed").set(function (message) {
                    console.log('declareStreamEventHandlers: Streams/changed', message);
                    var prevNumOfLives = tool.activeLivestreamings.length;
                    tool.refreshLivestreamStream().then(function () {
                        tool.syncLivestreamsList();
                        tool.videoTabsTool.syncVideoTabsList.apply(tool);
                        Q.handle(tool.state.onUpdate, tool, [{
                            prevNumOfLives: prevNumOfLives
                        }]);
                    });
                    
                });
                tool.livestreamStream.onMessage("Media/livestream/start").set(function (message) {
                    console.log('declareStreamEventHandlers: Media/livestream/start');
                    var prevNumOfLives = tool.activeLivestreamings.length;
                    tool.refreshLivestreamStream().then(function () {
                        tool.syncLivestreamsList();
                        tool.videoTabsTool.syncVideoTabsList.apply(tool);
                        Q.handle(tool.state.onUpdate, tool, [{
                            prevNumOfLives: prevNumOfLives
                        }]);
                    });
                });
                tool.livestreamStream.onMessage("Media/livestream/stop").set(function (message) {
                    console.log('declareStreamEventHandlers: Media/livestream/stop');
                    var prevNumOfLives = tool.activeLivestreamings.length;
                    tool.refreshLivestreamStream().then(function () {

                        tool.syncLivestreamsList();
                        tool.videoTabsTool.syncVideoTabsList.apply(tool);
                        
                        Q.handle(tool.state.onUpdate, tool, [{
                            prevNumOfLives: prevNumOfLives
                        }]);
                    });
                });

                tool.state.onUpdate.add(function (e, e2, e3) {
                    if(!tool.videoContainerTabsConEl) return;
                    if(tool.activeLivestreamings.length == 0 && e.prevNumOfLives != 0) {
                        tool.videoContainerEl.innerHTML = '<div class="media-livestream-nolives">No livestreams for now</div>';
                    } else if((e.prevNumOfLives == 0 || e.prevNumOfLives == -1) && tool.activeLivestreamings.length != 0) {
                        if(tool.activeLivestreamings[0].tabObject) tool.activeLivestreamings[0].tabObject.tabElement.click();
                    }

                    if(tool.activeLivestreamings.length <= 1) {
                        tool.videoContainerTabsConEl.style.display = 'none';
                    } else {
                        tool.videoContainerTabsConEl.style.display = '';
                    }
                });
            },
            setReminder: function (action) {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/livestream", ["setReminderOnLivestreamStart"], function (err, response) {
                        let msg = Q.firstErrorMessage(err, response && response.errors);

                        if(msg) {
                            console.error(msg);
                            reject(msg);
                            return;
                        }
                        
                        resolve(response.slots.setReminderOnLivestreamStart);
                    }, {
                        method: 'post',
                        fields: {
                            publisherId: tool.state.publisherId,
                            streamName: tool.state.streamName,
                            action: action
                        }
                    });
                });
            },
            joinLivestreamAsListener: function () {
                var tool = this;
                var socketConnection = Q.Socket.get();
                if(!socketConnection) return;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/livestream", ["joinLivestreamAsListener"], function (err, response) {
                        let msg = Q.firstErrorMessage(err, response && response.errors);

                        if(msg) {
                            console.error(msg);
                            reject(msg);
                            return;
                        }
                        
                        resolve(response.slots.setReminderOnLivestreamStart);
                    }, {
                        method: 'post',
                        fields: {
                            publisherId: tool.state.publisherId,
                            streamName: tool.state.streamName,
                            socketId: socketConnection.socket.id
                        }
                    });
                });
            },
            getInvitedPeople: function (webrtcStream) {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/livestream", ["invitedWebrtcUsers"], function (err, response) {
                        let msg = Q.firstErrorMessage(err, response && response.errors);

                        if(msg) {
                            console.error(msg);
                            reject(msg);
                            return;
                        }
                        
                        resolve(response.slots.invitedWebrtcUsers);
                    }, {
                        method: 'get',
                        fields: {
                            publisherId: tool.state.publisherId,
                            streamName:  tool.state.streamName
                        }
                    });
                });
            },
            getParticipatedPeople: function (webrtcStream) {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/livestream", ["participatedWebrtcUsers"], function (err, response) {
                        let msg = Q.firstErrorMessage(err, response && response.errors);

                        if(msg) {
                            console.error(msg);
                            reject(msg);
                            return;
                        }
                        
                        resolve(response.slots.participatedWebrtcUsers);
                    }, {
                        method: 'get',
                        fields: {
                            publisherId: tool.state.publisherId,
                            streamName:  tool.state.streamName
                        }
                    });
                });
            },
            getLivestreamListenersNumber: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/livestream", ["participatedUsersNumber"], function (err, response) {
                        let msg = Q.firstErrorMessage(err, response && response.errors);

                        if(msg) {
                            console.error(msg);
                            reject(msg);
                            return;
                        }
                        
                        resolve(response.slots.participatedUsersNumber);
                    }, {
                        method: 'get',
                        fields: {
                            publisherId: tool.state.publisherId,
                            streamName:  tool.state.streamName
                        }
                    });
                });
            },
            updateWidgetStateOnStreamUpdate: function () {
                var tool = this;

                let scheduledStartTime = parseInt(tool.livestreamStream.getAttribute('scheduledStartTime'));
                let meetingEnded = tool.livestreamStream.getAttribute('endTime');
                if(tool.state.mode == 'full'){
                    tool.switchWidgetState('full');
                } else {
                    if (tool.activeLivestreamings.length != 0) {
                        //show "during" state event if scheduledStartTime has not come but there are activeLivestreamings
                        tool.switchWidgetState('during');
                    } else {
                        tool.switchWidgetState('before');
                        /* if (scheduledStartTime && scheduledStartTime > Date.now()) {
                            tool.switchWidgetState('before');
                            setTimeout(function () {
                                tool.switchWidgetState('during');
                            }, scheduledStartTime - Date.now())
    
                        } else if (!meetingEnded) {
                            tool.switchWidgetState('during');
                        } else {
                            tool.switchWidgetState('after');
                        } */
                    }
                }
                
            },
            switchWidgetState: function(stateName) {
                var tool = this;
                if(tool.widgetState == stateName) {
                    return;
                }
                tool.widgetState = stateName;
                tool.element.innerHTML = '';
                if(stateName == 'before') {
                    tool.stopPlayer();

                    if(!tool.compactBeforeWidget) {
                        tool.compactBeforeWidget = tool.createCompactBefore();
                    }

                    if(tool.currentWidgetUI && tool.currentWidgetUI.isMinimized()) {
                        tool.compactBeforeWidget.minimizeWidget(true);
                    } else {
                        tool.compactBeforeWidget.maximizeWidget(true);
                    }
        
                    tool.currentWidgetUI = tool.compactBeforeWidget;
                    tool.element.appendChild(tool.compactBeforeWidget.widgetEl);

                    toggleToolClass('media-livestream-before');       
                } else if(stateName == 'during') {
                    if(!tool.compactDuringWidget) {
                        tool.compactDuringWidget = tool.createCompactDuring();
                    }

                    if(tool.currentWidgetUI && tool.currentWidgetUI.isMinimized()) {
                        tool.compactDuringWidget.minimizeWidget(true);
                    } else {
                        tool.compactDuringWidget.maximizeWidget(true);
                    }

                    tool.currentWidgetUI = tool.compactDuringWidget;
                    
                    tool.element.appendChild(tool.compactDuringWidget.widgetEl);

                    toggleToolClass('media-livestream-during');       
                } else if(stateName == 'after') {
                    //we don't need "after" state for now
                    if(!tool.compactAfterWidget) {
                        tool.compactAfterWidget = tool.createCompactAfter();
                    }

                    if(tool.currentWidgetUI && tool.currentWidgetUI.isMinimized()) {
                        tool.compactAfterWidget.minimizeWidget(true);
                    } else {
                        tool.compactAfterWidget.maximizeWidget(true);
                    }

                    tool.currentWidgetUI = tool.compactAfterWidget;
                    tool.element.appendChild(tool.compactAfterWidget.widgetEl);

                    toggleToolClass('media-livestream-after');       
                } else if(stateName == 'full') {
                    //we don't need "after" state for now
                    if(!tool.fullWidget) {
                        tool.fullWidget = tool.createFull();
                    }

                    /* if(tool.currentWidgetUI && tool.currentWidgetUI.isMinimized()) {
                        tool.compactAfterWidget.minimizeWidget(true);
                    } else {
                        tool.compactAfterWidget.maximizeWidget(true);
                    } */

                    tool.videoTabsTool.syncVideoTabsList.apply(tool);
                        
                    tool.currentWidgetUI = tool.fullWidget;
                    tool.element.appendChild(tool.fullWidget.widgetEl);

                    toggleToolClass('media-livestream-full');       
                }

                function toggleToolClass(className) {
                    let allClasses = [
                        'media-livestream-before',
                        'media-livestream-during',
                        'media-livestream-after',
                        'media-livestream-full'
                    ];

                    for(let i in allClasses) {
                        if(allClasses[i] != className) {
                            tool.element.classList.remove(allClasses[i]);
                        }
                    }

                    tool.element.classList.add(className);
                }
            },
            createWidgetTopBar: function () {
                let tool = this;
                let widgetControls = document.createElement('DIV');
                widgetControls.className = 'media-livestream-widget-controls';
                
                let minimizeButton = document.createElement('BUTTON');
                minimizeButton.className = 'media-livestream-widget-controls-min media-livestream-widget-controls-btn';
                minimizeButton.innerHTML = _icons.arrowDown;
                widgetControls.appendChild(minimizeButton);
               
                minimizeButton.addEventListener('click', function () {
                    tool.currentWidgetUI.minimizeWidget();
                });

                let rightSideButtons = document.createElement('DIV');
                rightSideButtons.className = 'media-livestream-widget-controls-buttons';
                widgetControls.appendChild(rightSideButtons);

                let shareButton = document.createElement('BUTTON');
                shareButton.className = 'media-livestream-widget-controls-share media-livestream-widget-controls-btn';
                shareButton.innerHTML = _icons.share;
                rightSideButtons.appendChild(shareButton);

                shareButton.addEventListener('click', function () {
                    Q.Streams.invite(tool.livestreamStream.fields.publisherId, tool.livestreamStream.fields.name, { 
                        title: 'Share Livestream'
                    });
                });

                let leaveButton = document.createElement('BUTTON');
                leaveButton.className = 'media-livestream-widget-controls-leave media-livestream-widget-controls-btn';
                leaveButton.innerHTML = 'Leave';
                rightSideButtons.appendChild(leaveButton);

                leaveButton.addEventListener('click', function () {
                    tool.remove();
                })

                return widgetControls;
            },
            createLivestreamDescription: function () {
                let tool = this;
                let livestreamDescriptionEl = document.createElement('DIV');
                livestreamDescriptionEl.className = 'media-livestream-description';

                let publisherName = document.createElement('DIV');
                publisherName.className = 'media-livestream-publisher-name';
                livestreamDescriptionEl.appendChild(publisherName);

                let publisherAvatarCon = document.createElement('DIV');
                publisherAvatarCon.className = 'media-livestream-publisher-icon';
                publisherName.appendChild(publisherAvatarCon);

                let livestreamTitle = document.createElement('DIV');
                livestreamTitle.className = 'media-livestream-title';
                livestreamDescriptionEl.appendChild(livestreamTitle);

                let livestreamTitleText = document.createElement('H1');
                livestreamTitleText.className = 'media-livestream-title-text';
                livestreamTitleText.innerHTML = tool.livestreamStream.fields.title;
                livestreamTitle.appendChild(livestreamTitleText);

                Q.activate(
                    Q.Tool.setUpElement(
                        publisherAvatarCon,
                        "Users/avatar",
                        {
                            userId:  tool.state.publisherId,
                            contents: true,
                            icon: 50
                        }
                    ),
                    {},
                    function () {

                    }
                );

                return livestreamDescriptionEl;
            },
            updateInvitedList: function () {
                let tool = this;
                tool.getInvitedPeople(tool.webrtcStream).then(function (invitedUsers) {
                    tool.state.invitedSpeakers = invitedUsers;
                    //tool.invitedUsers = invitedUsers;
                    
                    for(let i in invitedUsers) {
                        if(invitedUsers[i].fields.userId == '' || invitedUsers[i].fields.userId == null) continue;
                        let alreadyExists = false;
                        for(let p in tool.invitedUsers) {
                            if(tool.invitedUsers[p].userId == invitedUsers[i].fields.userId) {
                                alreadyExists = true;
                                break;
                            }
                        }
                        if(alreadyExists) continue;
                        let userObject = invitedUsers[i].fields;
                        tool.invitedUsers.push(userObject);
                    }

                    for(let i = tool.invitedUsers.length - 1; i >= 0; i--) {
                        let exist = false;
                        for(let p in invitedUsers) {
                            if(tool.invitedUsers[i].userId == invitedUsers[p].fields.userId) {
                                exist = true;
                                break;
                            }
                        }
                        if(exist === false) {
                            tool.invitedUsers.splice(i, 1);
                        }
                    }
                    
                    Q.handle(tool.state.onInvitedUsersListUpdate, tool);
                });
            },
            createCompactBefore: function () {
                let tool = this;

                let _minimized = false;

                parentContainer = tool.element;

                let _minimizedWidget = createMinimized();

                let widgetContainer0 = document.createElement('DIV');
                widgetContainer0.className = 'media-livestream-widget-container';

                let widgetContainer = document.createElement('DIV');
                widgetContainer.className = 'media-livestream-widget media-livestream-widget-before';
                widgetContainer0.appendChild(widgetContainer);

                let widgetControlsCon = document.createElement('DIV');
                widgetControlsCon.className = 'media-livestream-widget-controls-con';
                widgetContainer.appendChild(widgetControlsCon);

                let topWidgetBar = tool.createWidgetTopBar();
                widgetControlsCon.appendChild(topWidgetBar);

                let livestreamDescription = tool.createLivestreamDescription();
                widgetControlsCon.appendChild(livestreamDescription);

                let offlineText = document.createElement('DIV');
                offlineText.className = 'media-livestream-offline-text';
                offlineText.innerHTML = 'Stream is offline';
                widgetContainer.appendChild(offlineText);

                let countdown = document.createElement('DIV');
                countdown.className = 'media-livestream-countdown';
                widgetContainer.appendChild(countdown);
                let countdownTitle = document.createElement('DIV');
                countdownTitle.className = 'media-livestream-countdown-title';
                countdownTitle.innerHTML = 'Event start time:&nbsp';
                countdown.appendChild(countdownTitle);
                let countdownToolContainer = document.createElement('DIV');
                countdownToolContainer.className = 'media-livestream-countdown-container';
                countdown.appendChild(countdownToolContainer);
                

                if(tool.eventStream) showCountdown();
                tool.state.onEventUpdate.add(showCountdown);

                function showCountdown() {
                    if(tool.countdownTool) {
                        tool.countdownTool.remove();
                        if(tool.countdownTool.element.parentElement) tool.countdownTool.element.parentElement.removeChild(tool.countdownTool.element);
                    }
                    countdownToolContainer.innerHTML = '';
                    let countdownTool = document.createElement('DIV');
                    countdownTool.className = 'media-livestream-countdown-tool';
                    countdownToolContainer.appendChild(countdownTool);
                    Q.activate(
                        Q.Tool.setUpElement(
                            countdownTool,
                            "Q/timestamp",
                            {
                                time: parseInt(tool.eventStream.getAttribute('startTime')),
                                capitalized: true,
                                relative: true
                            }
                        ),
                        function () {
                            tool.countdownTool = this;
                        }
                    );
                }

                let metingParticipants = document.createElement('DIV');
                metingParticipants.className = 'media-livestream-meeting-users';
                widgetContainer.appendChild(metingParticipants);

                tool.state.onInvitedUsersListUpdate.add(function () {
                    updateInvitedList();
                })
                updateInvitedList();

                let reminderButtonCon = document.createElement('DIV');
                reminderButtonCon.className = 'media-livestream-reminder';
                widgetContainer.appendChild(reminderButtonCon);
                let reminderButton = document.createElement('BUTTON');
                reminderButtonCon.appendChild(reminderButton);

                updateNotifyStatus();
                tool.state.onLivestreaStreamRefresh.add(updateNotifyStatus)

                //reminderButton.addEventListener('click', showRemindersDialog);
                reminderButton.addEventListener('click', function () {
                    let action = tool.livestreamStream.participant && tool.livestreamStream.participant.subscribed == 'yes' ? 'unset' : 'set';
                    tool.setReminder(action).then(function () {
                        tool.refreshLivestreamStream();
                        //updateNotifyStatus();
                    }); 
                });

                //parentContainer.appendChild(widgetContainer0);

                function updateInvitedList() {
                    for(let i in tool.invitedUsers) {
                        let userObject = tool.invitedUsers[i];
                        if(userObject.userId == '' || userObject.userId == null || userObject.avatarContainerEl != null) continue;
                        
                        let isHost = userObject.userId == tool.state.publisherId;
                        let userItem = userObject.avatarContainerEl = document.createElement('DIV');
                        userItem.className = 'media-livestream-meeting-user';
                        if(isHost) {
                            metingParticipants.insertBefore(userItem, metingParticipants.firstChild);
                        } else {
                            metingParticipants.appendChild(userItem);
                        }

                        let userAvatar = document.createElement('DIV');
                        userAvatar.className = 'media-livestream-meeting-user-avatar';
                        userItem.appendChild(userAvatar);
                        let userRole = document.createElement('DIV');
                        userRole.className = 'media-livestream-meeting-user-role';
                        userRole.innerHTML = isHost ? 'Host' : 'Speaker';
                        userItem.appendChild(userRole);
                        Q.activate(
                            Q.Tool.setUpElement(
                                userAvatar,
                                "Users/avatar",
                                {
                                    userId: userObject.userId,
                                    icon: 50,
                                    contents: true
                                }
                            ),
                            function () {
                                userObject.avatarTool = this;
                            }
                        );
                    }

                    for(let e in metingParticipants.children) {
                        let active = false;
                        for(let i in tool.invitedUsers) {
                            if(metingParticipants.children[e] == tool.invitedUsers[i].avatarContainerEl) {
                                active = true;
                                break;
                            }
                        }

                        if(active == false) {
                            if(metingParticipants.children[e].parentElement) metingParticipants.children[e].parentElement.removeChild(metingParticipants.children[e]);
                        }
                    }
                }

                function updateNotifyStatus() {
                    if(tool.livestreamStream.participant && tool.livestreamStream.participant.subscribed == 'yes') {
                        reminderButton.classList.add('media-livestream-reminder-on');
                        reminderButton.innerHTML = 'Notification On';
                    } else {
                        reminderButton.classList.remove('media-livestream-reminder-on');

                        reminderButton.innerHTML = 'Notify Me';
                    }
                }

                function showRemindersDialog() {
                    let existingReminders = {};
                    if(tool.livestreamStream.participant) {
                        let usersReminders = tool.livestreamStream.participant.getExtra('reminders');
                        if(usersReminders != null) existingReminders = usersReminders;
                    }

                    let remindersContainer = document.createElement('DIV');
                    remindersContainer.className = 'media-livestream-widget-reminders';
                    
                    let remindersTitle = document.createElement('DIV');
                    remindersTitle.className = 'media-livestream-widget-reminders-title';
                    remindersTitle.innerHTML = 'I want to be notified of an event in:';
                    remindersContainer.appendChild(remindersTitle); 

                    let remindersList = document.createElement('DIV');
                    remindersList.className = 'media-livestream-widget-reminders-list';
                    remindersContainer.appendChild(remindersList);

                    let options = [
                        {key: '600', title: '10 Minutes'},
                        {key: '3600', title: '1 hour'},
                        {key: '7200', title: '2 hours'},
                        {key: '86400', title: '24 hours'},
                    ];

                    for(let i in options) {
                        let checkboxLabel = document.createElement('LABEL');
                        checkboxLabel.className = 'media-livestream-widget-reminders-item';
                        remindersList.appendChild(checkboxLabel);

                        let checkboxInput = document.createElement('INPUT');
                        checkboxInput.type = 'checkbox';
                        checkboxInput.value = options[i].key;
                        checkboxInput.checked = options[i].key in existingReminders ? true : false;
                        checkboxLabel.appendChild(checkboxInput);

                        let checkboxCaption = document.createElement('SPAN');
                        checkboxCaption.innerHTML = options[i].title;
                        checkboxLabel.appendChild(checkboxCaption);

                        checkboxInput.addEventListener('change', function () {
                            if(checkboxInput.checked) {
                                tool.updateReminders(checkboxInput.value, 'set');
                            } else {
                                tool.updateReminders(checkboxInput.value, 'unset');
                            }
                        });
                    }

                    Q.Dialogs.push({
                        title: 'Set Reminders',
                        className: 'Media_webrtc_devices_dialog',
                        content: remindersContainer,
                        apply: true
                    });
                }

                function minimizeWidget(skipAnimation) {
                    _minimized = true;
                    function onTransitionEnd() {
                        if(widgetContainer.parentElement) widgetContainer.parentElement.removeChild(widgetContainer);
                        widgetContainer0.appendChild(_minimizedWidget.minimizedWidgetEl);
                        _minimizedWidget.minimizedWidgetEl.classList.remove('media-livestream-widget-minimized');
                        _minimizedWidget.minimizedWidgetEl.style.transition = '';
                        widgetContainer.removeEventListener('transitionend', onTransitionEnd)
                    }

                    if(!skipAnimation) {
                        widgetContainer.addEventListener('transitionend', onTransitionEnd);
                    } else {
                        _minimizedWidget.minimizedWidgetEl.style.transition = 'none';
                        onTransitionEnd();
                    }

                    if(widgetContainer.classList.contains('media-livestream-widget-minimized')) {
                        widgetContainer.classList.remove('media-livestream-widget-minimized');
                    } else {
                        widgetContainer.classList.add('media-livestream-widget-minimized');
                    }
                }

                function maximizeWidget(skipAnimation) {
                    _minimized = false;
                    function onTransitionEnd() {
                        if(_minimizedWidget.minimizedWidgetEl.parentElement) _minimizedWidget.minimizedWidgetEl.parentElement.removeChild(_minimizedWidget.minimizedWidgetEl);
                        widgetContainer0.appendChild(widgetContainer);

                        function removeCSSClass() {
                            widgetContainer.classList.remove('media-livestream-widget-minimized');
                            _minimizedWidget.minimizedWidgetEl.style.transition = '';
                        }

                        if(!skipAnimation) {
                            setTimeout(removeCSSClass, 0);
                        } else {
                            removeCSSClass();
                        }
                       
                        _minimizedWidget.minimizedWidgetEl.removeEventListener('transitionend', onTransitionEnd)
                    }
                    
                    if(!skipAnimation) {
                        _minimizedWidget.minimizedWidgetEl.addEventListener('transitionend', onTransitionEnd)
                    } else {
                        _minimizedWidget.minimizedWidgetEl.style.transition = 'none';
                        onTransitionEnd();
                    }
                    
                    _minimizedWidget.minimizedWidgetEl.classList.add('media-livestream-widget-minimized');       
                }

                function createMinimized() {
                    //_minimized = true;
                    let minimizedWidgetContainer = document.createElement('DIV');
                    minimizedWidgetContainer.className = 'media-livestream-widget media-livestream-widget-before-minimized';

                    minimizedWidgetContainer.addEventListener('click', maximizeWidget);

                    let innerContainer = document.createElement('DIV');
                    innerContainer.className = 'media-livestream-widget-before-min-in';
                    minimizedWidgetContainer.appendChild(innerContainer);
    
                    let livestreamTitle = document.createElement('DIV');
                    livestreamTitle.className = 'media-livestream-title';
                    innerContainer.appendChild(livestreamTitle);
    
                    let livestreamTitleText = document.createElement('H1');
                    livestreamTitleText.className = 'media-livestream-title-text';
                    livestreamTitleText.innerHTML = tool.livestreamStream.fields.title;
                    livestreamTitle.appendChild(livestreamTitleText);

                    let close = document.createElement('DIV');
                    close.className = 'media-livestream-close';
                    close.innerHTML = _icons.close;
                    minimizedWidgetContainer.appendChild(close);

                    close.addEventListener('click', function(e) {
                        tool.remove();
                        e.stopPropagation();
                        e.preventDefault();
                    })

                    return {
                        minimizedWidgetEl: minimizedWidgetContainer,
                    };
                }

                function isMinimized() {
                    return _minimized;
                }

                return {
                    widgetEl: widgetContainer0,
                    minimizeWidget: minimizeWidget,
                    maximizeWidget: maximizeWidget,
                    isMinimized: isMinimized
                };
            },
            createCompactDuring: function () {
                let tool = this;

                let _listOfLives = [];
                let _activePlayerLive = null
                let _mediaPlayerElementContainer = null;
                let _minimized = false;
                let _joinButton = null;
                let _streamsList = createStremsList();
                let _streamsListPopup = null;
                let _minimizedWidgetViewerCounterEl = null;
                let _participantsTool = null;

                let _minimizedWidget = createMinimized();

                let widgetContainer0 = document.createElement('DIV');
                widgetContainer0.className = 'media-livestream-widget-container';

                let widgetContainer = document.createElement('DIV');
                widgetContainer.className = 'media-livestream-widget media-livestream-widget-during';
                widgetContainer0.appendChild(widgetContainer);

                let widgetControlsCon = document.createElement('DIV');
                widgetControlsCon.className = 'media-livestream-widget-controls-con';
                widgetContainer.appendChild(widgetControlsCon);

                let topWidgetBar = tool.createWidgetTopBar();
                widgetControlsCon.appendChild(topWidgetBar);

                let livestreamDescription = tool.createLivestreamDescription();
                widgetControlsCon.appendChild(livestreamDescription);
                
                let livestreamListeners = document.createElement('DIV');
                livestreamListeners.className = 'media-livestream-listeners';
                widgetControlsCon.appendChild(livestreamListeners);
                let livestreamListenersCounter = document.createElement('SPAN');
                livestreamListenersCounter.className = 'media-livestream-listeners-count';
                livestreamListeners.appendChild(livestreamListenersCounter);
                let livestreamListenersText = document.createElement('SPAN');
                livestreamListenersText.className = 'media-livestream-listeners-text';
                livestreamListenersText.innerHTML = 'people';
                livestreamListeners.appendChild(livestreamListenersText);
                let waitingOrListeningText = document.createElement('SPAN');
                waitingOrListeningText.className = 'media-livestream-listeners-text2';
                waitingOrListeningText.innerHTML = ' listening';
                livestreamListeners.appendChild(waitingOrListeningText);

                let currentlyStreamingTo = document.createElement('DIV');
                currentlyStreamingTo.className = 'media-livestream-streaming-to';
                widgetControlsCon.appendChild(currentlyStreamingTo);
                let currentlyStreamingToText = document.createElement('SPAN');
                currentlyStreamingToText.className = 'media-livestream-streaming-to-text';
                currentlyStreamingToText.innerHTML = 'Also streamed to';
                currentlyStreamingTo.appendChild(currentlyStreamingToText);
                let currentlyStreamingToList = document.createElement('SPAN');
                currentlyStreamingToList.className = 'media-livestream-streaming-to-list';
                currentlyStreamingTo.appendChild(currentlyStreamingToList);
                showInfoAboutLives();


                function updateListOfLives() {
                    currentlyStreamingToList.innerHTML = '';
                    //_activePlayerLive

                    for(let i = tool.activeLivestreamings.length - 1; i >= 0; i--) {
                        let livestreamData = tool.activeLivestreamings[i];

                        if(_activePlayerLive == livestreamData) {
                            continue;
                        }

                        if(!livestreamData.streamingToListItem) {
                            let livestreamItem = document.createElement('SPAN');
                            livestreamItem.className = 'media-livestream-streaming-to-list-item';
    
                            let livestreamItemPlatform = document.createElement('SPAN');
                            livestreamItemPlatform.className = 'media-livestream-streaming-to-list-platform';
                            livestreamItemPlatform.dataset.itemName = livestreamData.externalId || livestreamData.roomId; //roomId - is room id for p2p broadcast
                            livestreamItem.appendChild(livestreamItemPlatform);
    
                            if(livestreamData.platform == 'Peer2Peer') {
                                livestreamItemPlatform.innerHTML = 'Peer to Peer';
                            } else {
                                livestreamItemPlatform.innerHTML = livestreamData.platform;
                            }
    
                            livestreamItemPlatform.addEventListener('click', function (e) {
                                playLive(livestreamData, livestreamData.platform == 'Peer2Peer');
                            });

                            livestreamData.streamingToListItem = livestreamItem;
                        }

                        currentlyStreamingToList.appendChild(document.createTextNode(' '));
                        currentlyStreamingToList.appendChild(livestreamData.streamingToListItem);
                    }

                    const children = currentlyStreamingToList.children;

                    for (let i = 0; i < children.length; i++) {
                        if (i < children.length - 1) {
                            children[i].insertAdjacentText("afterend", ", ");
                        }
                    }

                    if(tool.activeLivestreamings.length <= 1) {
                        currentlyStreamingTo.style.display = 'none';
                    } else {
                        currentlyStreamingTo.style.display = '';
                    }
                }

                tool.state.onLiveIsPlaying.add(function () {
                    tool.refreshLivestreamStream();
                });
                tool.state.onLiveIsPlaying.add(updateListOfLives);
                tool.state.onActiveLivestreamingsUpdated.add(updateListOfLives);

                let metingParticipants = document.createElement('DIV');
                metingParticipants.className = 'media-livestream-meeting-users';
                widgetContainer.appendChild(metingParticipants);

                var webrtcParticipantsTool = tool.webrtcParticipantsTool = document.createElement('DIV');
                webrtcParticipantsTool.className = 'media-livestream-meeting-users-tool';
                metingParticipants.appendChild(webrtcParticipantsTool);

                Q.activate(
                    Q.Tool.setUpElement(webrtcParticipantsTool, 'Streams/participants', {
                        publisherId: tool.state.publisherId,
                        streamName: tool.state.streamName,
                        invite: false,
                        showBlanks: false,
                        showSummary: false,
                        ordering: [tool.state.publisherId, ...tool.invitedUsers.map(function (o) {
                            return o.userId;
                        })],
                        filter: function (userId, element) {
                            /* console.log('participants filter', userId, element)
                            if(userId == tool.state.publisherId) {
                                return true;
                            } else {
                                let invitedUsers = tool.invitedUsers;
                                for(let i in invitedUsers) {
                                    if(userId == invitedUsers[i].userId) {
                                        return true;
                                    }
                                }
                            }

                            let participantInstance = tool.livestreamStreamParticipants[userId];
                            if(participantInstance && participantInstance.extra != '') {
                                let extra = JSON.parse(participantInstance.extra);
                                if(!extra.listener && extra.listener != 'yes') {
                                    return false
                                }
                            }
                            return true; */
                        }
                    }),
                    {},
                    function () {
                        _participantsTool = this;
                        tool.state.onInvitedUsersListUpdate.add(function () {
                            _participantsTool.state.ordering = [tool.state.publisherId, ...tool.invitedUsers.map(function (o) {
                                return o.userId;
                            })];
                            _participantsTool.refresh();
                            filterAvatars();
                        })
                        updateMaxSizeOfUsersList();
                        window.addEventListener('resize', updateMaxSizeOfUsersList);
                    }
                );

                function filterAvatars() {
                    //return;
                    let avatarsContainer = webrtcParticipantsTool.querySelector('.Streams_participants_avatars');
                    if(!avatarsContainer) return;

                    for (const avatarElement of avatarsContainer.children) {
                        var avatartTool = Q.Tool.from(avatarElement, 'Users/avatar');
                        if(!avatartTool) return;
                        let userId = avatartTool.state.userId;

                        
                        if (userId.trim() != '') {
                            let roleEl = avatartTool.element.querySelector('.media-livestream-user-role');
                            if(!roleEl) {
                                roleEl = document.createElement('SPAN');
                                roleEl.className = 'media-livestream-user-role';
                                avatartTool.element.appendChild(roleEl);
                            }
                            
                            let userRole = 'Listener';
                            if(userId == tool.state.publisherId) {
                                userRole = 'Host';
                            } else {
                                let invitedUsers = tool.invitedUsers;
                                for(let i in invitedUsers) {
                                    if(userId == invitedUsers[i].userId) {
                                        userRole = 'Speaker';
                                        break;
                                    }
                                }
                            }
                            
                            if(userRole == 'Listener') {
                                let participantInstance = tool.livestreamStreamParticipants[userId];
                                if(participantInstance && participantInstance.extra != '') {
                                    let extra = JSON.parse(participantInstance.extra);
                                    if(!extra.listener && extra.listener != 'yes') {
                                        avatartTool.remove();
                                        if(avatartTool.element.parentElement) avatartTool.element.parentElement.removeChild(avatartTool.element);
                                        continue;
                                    }
                                }
                            }
                            roleEl.innerHTML = userRole;
                        }
                    }

                    /* if(window.fillWithUsers == null) {
                        window.fillWithUsers = function (number = 50) {
                            let container = webrtcParticipantsTool.querySelector('.Streams_participants_avatars');
                            if(!container) return;
                            for(let i = 0; i < number; i++) {
                                container.appendChild(avatarToolEl.cloneNode(true))
                            }
                        }
                    } */
                    
                }

                function updateMaxSizeOfUsersList() {
                    let baseHeight = window.innerHeight / 100 * 90;
                    widgetContainer.style.maxHeight = baseHeight + 'px';
                }

                var livestreamPlayerCon = document.createElement('DIV');
                livestreamPlayerCon.className = 'media-livestream-player-con';
                widgetContainer.appendChild(livestreamPlayerCon);

                let resizeObserver = new ResizeObserver(function (entries) {
                    for (let entry of entries) {
                        if (entry.contentBoxSize[0]) {
                            let rect = entry.contentBoxSize[0];
                            let elheight = rect.blockSize;
                            metingParticipants.style.marginBottom = elheight + 'px';
                            break;
                        }
                    }
                });

                resizeObserver.observe(livestreamPlayerCon);

                var livestreamWidngetPlayer = document.createElement('DIV');
                livestreamWidngetPlayer.className = 'media-livestream-player';
                livestreamPlayerCon.appendChild(livestreamWidngetPlayer);

                var livestreamWidngetButtons = document.createElement('DIV');
                livestreamWidngetButtons.className = 'media-livestream-buttons';
                livestreamPlayerCon.appendChild(livestreamWidngetButtons);

               

                let joinButtonCon
                if(2 < 1 && tool.webrtcStream && tool.webrtcStream.testWriteLevel('contribute')) {
                    joinButtonCon = document.createElement('DIV');
                    joinButtonCon.className = 'media-livestream-join';
                    livestreamWidngetButtons.appendChild(joinButtonCon);
                    _joinButton = document.createElement('BUTTON');
                    _joinButton.className = 'Q_button media-livestream-join-stage';
                    _joinButton.innerHTML = 'Join the Stage';
                    joinButtonCon.appendChild(_joinButton);
                    _joinButton.addEventListener('click', function () {
                        if(!tool.state.webrtcStream) return;

                        tool.currentActiveWebRTCRoom = Q.Media.WebRTC({
                            roomId: tool.state.webrtcStream.fields.name,
                            roomPublisherId: tool.state.webrtcStream.publisherId,
                            element: document.body,
                            startWith: { video: false, audio: true },
                            onWebRTCRoomCreated: function () {
                               
                            }
                        });

                        tool.currentActiveWebRTCRoom.start();
                    });
                } else {
                    joinButtonCon = document.createElement('DIV');
                    joinButtonCon.className = 'media-livestream-join';
                    livestreamWidngetButtons.appendChild(joinButtonCon);
                    _joinButton = document.createElement('BUTTON');
                    _joinButton.className = 'Q_button media-livestream-join-audience';
                    _joinButton.innerHTML = 'Join Audience';
                    joinButtonCon.appendChild(_joinButton); 

                   
                    Q.activate(
                        Q.Tool.setUpElement(
                            _joinButton,
                            "Media/webrtc/popupDialog",
                            {
                                content: _streamsList,
                                className: 'media-livestream-streams-list-popup',
                                triggerOn: 'lmb',
                                showArrow: true,
                                xPositionsOrder: ['middle', 'right', 'left'],
                                yPositionsOrder: ['above', 'below', 'middle', 'belowStartOfButton', 'aboveStartOfButton']
    
                            }
                        ),
                        {},
                        function () {
                            _streamsListPopup = this;
                        }
                    );
                }

                if(_listOfLives.length === 0) {
                    onNoActiveLivestreams();
                } else {
                    onLivestreamStarted();
                }

                //parentContainer.appendChild(widgetContainer0);

                updateRealTimeInfo();

                tool.state.onLivestreamUpdate.add(updateRealTimeInfo)
                tool.state.onLivestreamUpdate.add(showInfoAboutLives);

                function minimizeWidget(skipAnimation) {
                    _minimized = true;
                    let paused = false;
                    if(_mediaPlayerElementContainer) {
                        let mediaElements = _mediaPlayerElementContainer.querySelectorAll('audio, video');
                        paused = mediaElements[0] && mediaElements[0].paused;
                    }
                    
                    function onTransitionEnd() {
                        if(widgetContainer.parentElement) widgetContainer.parentElement.removeChild(widgetContainer);
                        widgetContainer0.appendChild(_minimizedWidget.minimizedWidgetEl);
                        _minimizedWidget.minimizedWidgetEl.classList.remove('media-livestream-widget-minimized');
                        _minimizedWidget.minimizedWidgetEl.style.transition = '';
                        if(_mediaPlayerElementContainer) {
                            _minimizedWidget.mediaContainerEl.appendChild(_mediaPlayerElementContainer);
                            if(!paused) {
                                let mediaElements = _mediaPlayerElementContainer.querySelectorAll('audio, video');
                                mediaElements.forEach(element => {
                                    element.play();
                                });
                            }
                        }
                        widgetContainer.removeEventListener('transitionend', onTransitionEnd);
                    }

                    if(!skipAnimation) {
                        widgetContainer.addEventListener('transitionend', onTransitionEnd)
                    } else {
                        _minimizedWidget.minimizedWidgetEl.style.transition = 'none';
                        onTransitionEnd();
                    }

                    if(widgetContainer.classList.contains('media-livestream-widget-minimized')) {
                        widgetContainer.classList.remove('media-livestream-widget-minimized');
                    } else {
                        widgetContainer.classList.add('media-livestream-widget-minimized');
                    }
                }

                function maximizeWidget(skipAnimation) {
                    _minimized = false;
                    let paused = false;
                    if (_mediaPlayerElementContainer) {
                        let mediaElements = _mediaPlayerElementContainer.querySelectorAll('audio, video');
                        paused = mediaElements[0] && mediaElements[0].paused;
                    }
                    function onTransitionEnd() {
                        if(_minimizedWidget.minimizedWidgetEl.parentElement) _minimizedWidget.minimizedWidgetEl.parentElement.removeChild(_minimizedWidget.minimizedWidgetEl);
                        widgetContainer0.appendChild(widgetContainer);
                        if (_mediaPlayerElementContainer) {
                            livestreamWidngetPlayer.appendChild(_mediaPlayerElementContainer);
                            if (!paused) {
                                let mediaElements = _mediaPlayerElementContainer.querySelectorAll('audio, video');
                                mediaElements.forEach(element => {
                                    element.play();
                                });
                            }
                        }

                        function removeCSSClass() {
                            widgetContainer.classList.remove('media-livestream-widget-minimized');
                            _minimizedWidget.minimizedWidgetEl.style.transition = '';
                            if(_participantsTool) _participantsTool.refresh();
                        }
                        setTimeout(removeCSSClass, 0);
                        _minimizedWidget.minimizedWidgetEl.removeEventListener('transitionend', onTransitionEnd)
                    }

                    if(!skipAnimation) {
                        _minimizedWidget.minimizedWidgetEl.addEventListener('transitionend', onTransitionEnd)
                    } else {
                        _minimizedWidget.minimizedWidgetEl.style.transition = 'none';
                        onTransitionEnd();
                    }

                    _minimizedWidget.minimizedWidgetEl.classList.add('media-livestream-widget-minimized');            
                }

                function createMinimized() {
                    //_minimized = true;
                    let minimizedWidgetContainer = document.createElement('DIV');
                    minimizedWidgetContainer.className = 'media-livestream-widget media-livestream-widget-during-minimized';

                    minimizedWidgetContainer.addEventListener('click', maximizeWidget);

                    let innerContainer = document.createElement('DIV');
                    innerContainer.className = 'media-livestream-widget-before-min-in';
                    minimizedWidgetContainer.appendChild(innerContainer);
    
                    let livestreamTitle = document.createElement('DIV');
                    livestreamTitle.className = 'media-livestream-title';
                    innerContainer.appendChild(livestreamTitle);
    
                    let livestreamTitleAndConunter = document.createElement('DIV');
                    livestreamTitleAndConunter.className = 'media-livestream-title-con';
                    livestreamTitle.appendChild(livestreamTitleAndConunter);

                    let livestreamTitleText = document.createElement('H1');
                    livestreamTitleText.className = 'media-livestream-title-text';
                    livestreamTitleText.innerHTML = tool.livestreamStream.fields.title;
                    livestreamTitleAndConunter.appendChild(livestreamTitleText);

                    let livestreamViewers = document.createElement('DIV');
                    livestreamViewers.className = 'media-livestream-title-viewers';
                    livestreamTitleAndConunter.appendChild(livestreamViewers);
                    let livestreamViewersIcon = document.createElement('DIV');
                    livestreamViewersIcon.className = 'media-livestream-title-viewers-icon';
                    livestreamViewersIcon.innerHTML = _icons.viewerUser;
                    livestreamViewers.appendChild(livestreamViewersIcon);
                    let livestreamViewersCount = _minimizedWidgetViewerCounterEl = document.createElement('DIV');
                    livestreamViewersCount.className = 'media-livestream-title-viewers-counter';
                    livestreamViewersCount.innerHTML = '0';
                    livestreamViewers.appendChild(livestreamViewersCount);

                    let close = document.createElement('DIV');
                    close.className = 'media-livestream-close';
                    close.innerHTML = _icons.close;
                    livestreamTitle.appendChild(close);
                    
                    close.addEventListener('click', function(e) {
                        tool.remove();
                        e.stopPropagation();
                        e.preventDefault();
                    })

                    let mediaContainer = document.createElement('DIV');
                    mediaContainer.className = 'media-livestream-player';
                    innerContainer.appendChild(mediaContainer);

                    return {
                        minimizedWidgetEl: minimizedWidgetContainer,
                        mediaContainerEl: mediaContainer
                    };
                }

                function createStremsList() {
                    let streamsMenu = document.createElement('DIV');
                    streamsMenu.className = 'media-livestream-streams-menu';

                    return streamsMenu;
                }

                function showInfoAboutLives() {
                    for(let i = tool.activeLivestreamings.length - 1; i >= 0; i--) {
                        let livestreamData = tool.activeLivestreamings[i];
                        /* if(livestreamData.platform == 'Peer2Peer') {
                            continue;
                        } */
                        let itemExists = false;
                        for (let t in _listOfLives) {
                            if( _listOfLives[t].livestreamData == livestreamData) {
                                itemExists = _listOfLives[t];
                                break;
                            }
                        }

                        if(itemExists !== false) {
                            continue;
                        }
    
                        //let streamingToListItem = addListItemToStreamingToList(livestreamData);
                        let listenDropUpListItem, watchDropUpListItem;
                        if(livestreamData.platform == 'Peer2Peer') {
                            listenDropUpListItem = addListItemToDropUpMenu(livestreamData, 'audio');
                            watchDropUpListItem = addListItemToDropUpMenu(livestreamData, 'video');
                        } else {
                            watchDropUpListItem = addListItemToDropUpMenu(livestreamData);
                        }
                        
                        let itemObject = {
                            key: livestreamData.externalId || livestreamData.roomId,
                            //streamingToListItem: streamingToListItem,
                            listenDropUpListItem: listenDropUpListItem,
                            watchDropUpListItem: watchDropUpListItem,
                            livestreamData: livestreamData
                        }
                        _listOfLives.push(itemObject);
                    }

                    function addListItemToStreamingToList(livestreamData) {
                        window.addListItemToStreamingToList = function() {
                            addListItemToStreamingToList(livestreamData);
                        };
                        
                        let livestreamItem = document.createElement('SPAN');
                        livestreamItem.className = 'media-livestream-streaming-to-list-item';
    
                        let livestreamItemToWith = document.createElement('SPAN');
                        livestreamItemToWith.className = 'media-livestream-streaming-to-list-item-how';
                        livestreamItem.appendChild(livestreamItemToWith);
                        if(livestreamData.platform == 'Peer2Peer') {
                            livestreamItemToWith.innerHTML = 'with ';
                        } else {
                            livestreamItemToWith.innerHTML = 'to ' + livestreamData.platform;
                        }

                        let livestreamItemPlatform = document.createElement('SPAN');
                        livestreamItemPlatform.className = 'media-livestream-streaming-to-list-platform';
                        livestreamItemPlatform.dataset.itemName = livestreamData.externalId || livestreamData.roomId; //roomId - is room id for p2p broadcast
                        livestreamItem.appendChild(livestreamItemPlatform);

                        if(livestreamData.platform == 'Peer2Peer') {
                            livestreamItemPlatform.innerHTML = 'Peer to Peer';
                        } else {
                            livestreamItemPlatform.innerHTML = livestreamData.platform;
                        }
                        currentlyStreamingToList.appendChild(livestreamItem);

                        livestreamItemPlatform.addEventListener('click', function (e) {
                            playLive(livestreamData, livestreamData.platform == 'Peer2Peer');
                        });

                        return livestreamItem;
                    }

                    function addListItemToDropUpMenu(livestreamData, audioOrVideo) {
                        let livestreamItem = document.createElement('DIV');
                        livestreamItem.className = 'media-livestream-streams-menu-item';

                        let livestreamItemPlatform = document.createElement('SPAN');
                        livestreamItemPlatform.className = 'media-livestream-streams-menu-item-name';
                        livestreamItemPlatform.dataset.itemName = livestreamData.externalId || livestreamData.roomId; //roomId - is room id for p2p broadcast
                        livestreamItem.appendChild(livestreamItemPlatform);

                        if(livestreamData.platform == 'Peer2Peer') {
                            livestreamItemPlatform.innerHTML = audioOrVideo == 'audio' ? 'Listen with Peer to Peer' : 'Watch with Peer to Peer';
                        } else {
                            livestreamItemPlatform.innerHTML = livestreamData.platform;
                        }
                        _streamsList.appendChild(livestreamItem);

                        livestreamItem.addEventListener('click', function (e) {
                            playLive(livestreamData, audioOrVideo == 'audio');
                            if(_streamsListPopup) {
                                _streamsListPopup.hide();
                            }
                        });

                        return livestreamItem;
                    }

                    for(let i = _listOfLives.length - 1; i >= 0; i--) {
                        let live = _listOfLives[i];
                        let inactive = true;
                        for(let r = tool.activeLivestreamings.length - 1; r >= 0; r--) {
                            if(live.livestreamData == tool.activeLivestreamings[r]) {
                                inactive = false;
                                break;
                            }
                        }

                        if(inactive) {
                            if(live.listenDropUpListItem.parentElement) {
                                live.listenDropUpListItem.parentElement.removeChild(live.listenDropUpListItem);
                            }
                            if(live.watchDropUpListItem.parentElement) {
                                live.watchDropUpListItem.parentElement.removeChild(live.watchDropUpListItem);
                            }
                            _listOfLives.splice(i, 1)
                            onLiveRemoved(live.livestreamData);
                        }

                    }

                    if(_listOfLives.length === 0) {
                        //currentlyStreamingTo.style.display = 'none';
                        onNoActiveLivestreams();
                    } else {
                        //currentlyStreamingTo.style.display = '';
                        onLivestreamStarted();
                    }

                }

                function onNoActiveLivestreams() {
                    if(_joinButton) {
                        _joinButton.dataset.touchlabel = 'Live stream is inactive';
                        _joinButton.setAttribute('disabled', true);
                    }
                    if(waitingOrListeningText) {
                        waitingOrListeningText.innerHTML = 'waiting'
                    }
                }

                function onLivestreamStarted() {
                    //currentlyStreamingTo.style.display = '';
                    
                    if(_joinButton) {
                        _joinButton.dataset.touchlabel = '';
                        _joinButton.removeAttribute('disabled');
                    }

                    if(waitingOrListeningText) {
                        waitingOrListeningText.innerHTML = 'listening'
                    }
                }

                function playLive(livestreamData, onlyAudio) {
                    if(livestreamData.platform == 'Peer2Peer' && livestreamData.broadcastClient) return;

                    //deactivate previous players, especially of peer2peer broadcast
                    if(_activePlayerLive) {
                        if(_activePlayerLive.platform == 'Peer2Peer' && _activePlayerLive.broadcastClient){
                            _activePlayerLive.broadcastClient.disconnect();
                            _activePlayerLive.broadcastClient = null;
                        }
                    }

                    _activePlayerLive = livestreamData;

                    livestreamWidngetPlayer.innerHTML = '';
                    let streamingContainer = tool.generateLivestreamVideo(livestreamData, onlyAudio);
                    livestreamWidngetPlayer.appendChild(streamingContainer);
                    _mediaPlayerElementContainer = streamingContainer;

                    if(_joinButton.classList.contains('media-livestream-join-audience')) {
                        joinButtonCon.style.display = 'none';
                    }

                    /* tool.livestreamStream.join({
                        extra: JSON.stringify({listener: 'yes'})
                    }, function () {

                    }); */
                    tool.joinLivestreamAsListener();

                    Q.handle(tool.state.onLiveIsPlaying, tool);
                }

                function onLiveRemoved(live) {
                    if(live.platform != 'Peer2Peer') return;

                    if(_mediaPlayerElementContainer && _mediaPlayerElementContainer.parentElement) {
                        _mediaPlayerElementContainer.parentElement.removeChild(_mediaPlayerElementContainer);
                    }
                    if(_joinButton.classList.contains('media-livestream-join-audience')) {
                        joinButtonCon.style.display = '';
                    }
                }

                function updateRealTimeInfo() {
                    livestreamListenersCounter.innerHTML = tool.livestreamStream.fields.participatingCount + ' ';
                    _minimizedWidgetViewerCounterEl.innerHTML = tool.livestreamStream.fields.participatingCount;
                }

                function isMinimized() {
                    return _minimized;
                }

                return {
                    widgetEl: widgetContainer0,
                    minimizeWidget: minimizeWidget,
                    maximizeWidget: maximizeWidget,
                    isMinimized: isMinimized
                };
            },
            //we don't need "after" state for now
            createCompactAfter: function () {
                let tool = this;

                let _listOfLives = [];
                let _activePlayerLive = null
                let _mediaPlayerElementContainer = null;
                let _minimized = false;
                let _joinButton = null;
                let _streamsList = createStremsList();
                let _streamsListPopup = null;

                parentContainer = tool.element;
                //parentContainer.style.display = 'none';

                let _minimizedWidget = createMinimized();

                let widgetContainer0 = document.createElement('DIV');
                widgetContainer0.className = 'media-livestream-widget-container';

                let widgetContainer = document.createElement('DIV');
                widgetContainer.className = 'media-livestream-widget media-livestream-widget-after';
                widgetContainer0.appendChild(widgetContainer);

                let widgetControls = document.createElement('DIV');
                widgetControls.className = 'media-livestream-widget-controls';
                widgetContainer.appendChild(widgetControls);
                
                let minimizeButton = document.createElement('BUTTON');
                minimizeButton.className = 'media-livestream-widget-controls-min media-livestream-widget-controls-btn';
                minimizeButton.innerHTML = _icons.arrowDown;
                widgetControls.appendChild(minimizeButton);
               
                minimizeButton.addEventListener('click', function () {
                    tool.currentWidgetUI.minimizeWidget();
                });

                let rightSideButtons = document.createElement('DIV');
                rightSideButtons.className = 'media-livestream-widget-controls-buttons';
                widgetControls.appendChild(rightSideButtons);

                let shareButton = document.createElement('BUTTON');
                shareButton.className = 'media-livestream-widget-controls-share media-livestream-widget-controls-btn';
                shareButton.innerHTML = _icons.share;
                rightSideButtons.appendChild(shareButton);

                shareButton.addEventListener('click', function () {
                    Q.Streams.invite(tool.livestreamStream.fields.publisherId, tool.livestreamStream.fields.name, { 
                        title: 'Share Livestream'
                    });
                });

                let publisherName = document.createElement('DIV');
                publisherName.className = 'media-livestream-publisher-name';
                widgetContainer.appendChild(publisherName);
                let publisherAvatarCon = document.createElement('DIV');
                publisherAvatarCon.className = 'media-livestream-publisher-icon';
                publisherName.appendChild(publisherAvatarCon);

                let livestreamTitle = document.createElement('DIV');
                livestreamTitle.className = 'media-livestream-title';
                widgetContainer.appendChild(livestreamTitle);

                let livestreamTitleText = document.createElement('H1');
                livestreamTitleText.className = 'media-livestream-title-text';
                livestreamTitleText.innerHTML = tool.livestreamStream.fields.title;
                livestreamTitle.appendChild(livestreamTitleText);

                Q.activate(
                    Q.Tool.setUpElement(
                        publisherAvatarCon,
                        "Users/avatar",
                        {
                            userId:  tool.state.publisherId,
                            contents: true,
                            icon: 50
                        }
                    ),
                    {},
                    function () {

                    }
                );

                let livestreamListeners = document.createElement('DIV');
                livestreamListeners.className = 'media-livestream-listeners';
                widgetContainer.appendChild(livestreamListeners);
                let livestreamListenersCounter = document.createElement('SPAN');
                livestreamListenersCounter.className = 'media-livestream-listeners-count';
                livestreamListeners.appendChild(livestreamListenersCounter);

                tool.getLivestreamListenersNumber().then(function (number) {
                    livestreamListenersCounter.innerHTML = number;
                });

                let livestreamListenersText = document.createElement('SPAN');
                livestreamListenersText.className = 'media-livestream-listeners-text';
                livestreamListenersText.innerHTML = 'people tuned in';
                livestreamListeners.appendChild(livestreamListenersText);

                let currentlyStreamingTo = document.createElement('DIV');
                currentlyStreamingTo.className = 'media-livestream-streaming-to';
                widgetContainer.appendChild(currentlyStreamingTo);
                let currentlyStreamingToText = document.createElement('SPAN');
                currentlyStreamingToText.className = 'media-livestream-streaming-to-text';
                currentlyStreamingToText.innerHTML = 'Also streamed ';
                currentlyStreamingTo.appendChild(currentlyStreamingToText);
                let currentlyStreamingToList = document.createElement('SPAN');
                currentlyStreamingToList.className = 'media-livestream-streaming-to-list';
                currentlyStreamingTo.appendChild(currentlyStreamingToList);
                showInfoAboutLives();

                let metingParticipants = document.createElement('DIV');
                metingParticipants.className = 'media-livestream-meeting-users';
                widgetContainer.appendChild(metingParticipants);


                tool.getParticipatedPeople(tool.webrtcStream).then(function (participatedUsers) {                    
                    for(let i in participatedUsers) {
                        let alreadyExists = false;
                        for(let p in tool.participatedUsers) {
                            if(tool.participatedUsers[p].userId == participatedUsers[i].fields.userId) {
                                alreadyExists = true;
                                break;
                            }
                        }
                        if(alreadyExists) continue;
                        let isHost = participatedUsers[i].fields.userId == tool.state.publisherId;
                        let userObject = participatedUsers[i].fields;
                        tool.participatedUsers.push(userObject);
                        let userItem = document.createElement('DIV');
                        userItem.className = 'media-livestream-meeting-user';
                        if(isHost) {
                            metingParticipants.insertBefore(userItem, metingParticipants.firstChild);
                        } else {
                            metingParticipants.appendChild(userItem);
                        }

                        let userAvatar = document.createElement('DIV');
                        userAvatar.className = 'media-livestream-meeting-user-avatar';
                        userItem.appendChild(userAvatar);
                        let userRole = document.createElement('DIV');
                        userRole.className = 'media-livestream-meeting-user-role';
                        userRole.innerHTML = isHost ? 'Host' : 'Speaker';
                        userItem.appendChild(userRole);
                        Q.activate(
                            Q.Tool.setUpElement(
                                userAvatar,
                                "Users/avatar",
                                {
                                    userId: participatedUsers[i].fields.userId,
                                    icon: 50,
                                    contents: true
                                }
                            ),
                            function () {
                                userObject.avatarTool = this;
                            }
                        );
                    }
                });

                var livestreamWidngetPlayer = document.createElement('DIV');
                livestreamWidngetPlayer.className = 'media-livestream-player';
                widgetContainer.appendChild(livestreamWidngetPlayer);

                var livestreamWidngetButtons = document.createElement('DIV');
                livestreamWidngetButtons.className = 'media-livestream-buttons';
                widgetContainer.appendChild(livestreamWidngetButtons);

               

                let joinButtonCon
                joinButtonCon = document.createElement('DIV');
                joinButtonCon.className = 'media-livestream-recording';
                livestreamWidngetButtons.appendChild(joinButtonCon);
                _joinButton = document.createElement('BUTTON');
                _joinButton.className = 'Q_button media-livestream-play-recording';
                _joinButton.innerHTML = 'Play Recording';
                joinButtonCon.appendChild(_joinButton);


                Q.activate(
                    Q.Tool.setUpElement(
                        _joinButton,
                        "Media/webrtc/popupDialog",
                        {
                            content: _streamsList,
                            className: 'media-livestream-streams-list-popup',
                            triggerOn: 'lmb',
                            showArrow: true,
                            xPositionsOrder: ['middle', 'right', 'left'],
                            yPositionsOrder: ['above', 'below', 'middle', 'belowStartOfButton', 'aboveStartOfButton']

                        }
                    ),
                    {},
                    function () {
                        _streamsListPopup = this;
                    }
                );


                if(_listOfLives.length === 0) {
                    onNoActiveLivestreams();
                } else {
                    onLivestreamStarted();
                }

                //parentContainer.appendChild(widgetContainer0);

                tool.state.onLivestreamUpdate.add(showInfoAboutLives);

                function minimizeWidget(skipAnimation) {
                    _minimized = true;
                    let paused = false;
                    if(_mediaPlayerElementContainer) {
                        let mediaElements = _mediaPlayerElementContainer.querySelectorAll('audio, video');
                        paused = mediaElements[0] && mediaElements[0].paused;
                    }
                    
                    function onTransitionEnd() {
                        if(widgetContainer.parentElement) widgetContainer.parentElement.removeChild(widgetContainer);
                        widgetContainer0.appendChild(_minimizedWidget.minimizedWidgetEl);
                        _minimizedWidget.minimizedWidgetEl.classList.remove('media-livestream-widget-minimized');
                        _minimizedWidget.minimizedWidgetEl.style.transition = '';
                        if(_mediaPlayerElementContainer) {
                            _minimizedWidget.mediaContainerEl.appendChild(_mediaPlayerElementContainer);
                            if(!paused) {
                                let mediaElements = _mediaPlayerElementContainer.querySelectorAll('audio, video');
                                mediaElements.forEach(element => {
                                    element.play();
                                });
                            }
                        }
                        widgetContainer.removeEventListener('transitionend', onTransitionEnd)
                    }

                    if(!skipAnimation) {
                        widgetContainer.addEventListener('transitionend', onTransitionEnd);
                    } else {
                        _minimizedWidget.minimizedWidgetEl.style.transition = 'none';
                        onTransitionEnd();
                    }
                    
                    if(widgetContainer.classList.contains('media-livestream-widget-minimized')) {
                        widgetContainer.classList.remove('media-livestream-widget-minimized');
                    } else {
                        widgetContainer.classList.add('media-livestream-widget-minimized');
                    }
                }

                function maximizeWidget(skipAnimation) {
                    _minimized = false;
                    let paused = false;
                    if (_mediaPlayerElementContainer) {
                        let mediaElements = _mediaPlayerElementContainer.querySelectorAll('audio, video');
                        paused = mediaElements[0] && mediaElements[0].paused;
                    }
                    function onTransitionEnd() {
                        if(_minimizedWidget.minimizedWidgetEl.parentElement) _minimizedWidget.minimizedWidgetEl.parentElement.removeChild(_minimizedWidget.minimizedWidgetEl);
                        widgetContainer0.appendChild(widgetContainer);
                        if (_mediaPlayerElementContainer) {
                            livestreamWidngetPlayer.appendChild(_mediaPlayerElementContainer);
                            if (!paused) {
                                let mediaElements = _mediaPlayerElementContainer.querySelectorAll('audio, video');
                                mediaElements.forEach(element => {
                                    element.play();
                                });
                            }
                        }

                        function removeCSSClass() {
                            widgetContainer.classList.remove('media-livestream-widget-minimized');
                            _minimizedWidget.minimizedWidgetEl.style.transition = '';
                        }
                        setTimeout(removeCSSClass, 0);
                        _minimizedWidget.minimizedWidgetEl.removeEventListener('transitionend', onTransitionEnd)
                    }

                    if(!skipAnimation) {
                        _minimizedWidget.minimizedWidgetEl.addEventListener('transitionend', onTransitionEnd)
                    } else {
                        _minimizedWidget.minimizedWidgetEl.style.transition = 'none';
                        onTransitionEnd();
                    }

                    _minimizedWidget.minimizedWidgetEl.classList.add('media-livestream-widget-minimized');            
                }

                function createMinimized() {
                    //_minimized = true;
                    let minimizedWidgetContainer = document.createElement('DIV');
                    minimizedWidgetContainer.className = 'media-livestream-widget media-livestream-widget-after-minimized';

                    minimizedWidgetContainer.addEventListener('click', maximizeWidget);

                    let innerContainer = document.createElement('DIV');
                    innerContainer.className = 'media-livestream-widget-before-min-in';
                    minimizedWidgetContainer.appendChild(innerContainer);
    
                    let livestreamTitle = document.createElement('DIV');
                    livestreamTitle.className = 'media-livestream-title';
                    innerContainer.appendChild(livestreamTitle);
    
                    let livestreamTitleAndConunter = document.createElement('DIV');
                    livestreamTitleAndConunter.className = 'media-livestream-title-con';
                    livestreamTitle.appendChild(livestreamTitleAndConunter);

                    let livestreamTitleText = document.createElement('H1');
                    livestreamTitleText.className = 'media-livestream-title-text';
                    livestreamTitleText.innerHTML = tool.livestreamStream.fields.title;
                    livestreamTitleAndConunter.appendChild(livestreamTitleText);

                    let livestreamViewers = document.createElement('DIV');
                    livestreamViewers.className = 'media-livestream-title-viewers';
                    livestreamTitleAndConunter.appendChild(livestreamViewers);
                    let livestreamViewersIcon = document.createElement('DIV');
                    livestreamViewersIcon.className = 'media-livestream-title-viewers-icon';
                    livestreamViewersIcon.innerHTML = _icons.viewerUser;
                    livestreamViewers.appendChild(livestreamViewersIcon);
                    let livestreamViewersCount = _minimizedWidgetViewerCounterEl = document.createElement('DIV');
                    livestreamViewersCount.className = 'media-livestream-title-viewers-counter';
                    livestreamViewersCount.innerHTML = '0';
                    livestreamViewers.appendChild(livestreamViewersCount);

                    let close = document.createElement('DIV');
                    close.className = 'media-livestream-close';
                    close.innerHTML = _icons.close;
                    livestreamTitle.appendChild(close);

                    close.addEventListener('click', function(e) {
                        tool.remove();
                        e.stopPropagation();
                        e.preventDefault();
                    })

                    let mediaContainer = document.createElement('DIV');
                    mediaContainer.className = 'media-livestream-player';
                    innerContainer.appendChild(mediaContainer);

                    return {
                        minimizedWidgetEl: minimizedWidgetContainer,
                        mediaContainerEl: mediaContainer
                    };
                }

                function createStremsList() {
                    let streamsMenu = document.createElement('DIV');
                    streamsMenu.className = 'media-livestream-streams-menu';

                    return streamsMenu;
                }

                function showInfoAboutLives() {
                    for(let i = tool.activeLivestreamings.length - 1; i >= 0; i--) {
                        let livestreamData = tool.activeLivestreamings[i];
                        /* if(livestreamData.platform == 'Peer2Peer') {
                            continue;
                        } */
                        let itemExists = false;
                        for (let t in _listOfLives) {
                            if( _listOfLives[t].livestreamData == livestreamData) {
                                itemExists = _listOfLives[t];
                                break;
                            }
                        }

                        if(itemExists !== false) {
                            continue;
                        }
    
                        let streamingToListItem = addListItemToStreamingToList(livestreamData);
                        let listenDropUpListItem, watchDropUpListItem;
                        if(livestreamData.platform == 'Peer2Peer') {
                            listenDropUpListItem = addListItemToDropUpMenu(livestreamData, 'audio');
                            watchDropUpListItem = addListItemToDropUpMenu(livestreamData, 'video');
                        } else {
                            watchDropUpListItem = addListItemToDropUpMenu(livestreamData);
                        }
                        
                        let itemObject = {
                            key: livestreamData.externalId || livestreamData.roomId,
                            streamingToListItem: streamingToListItem,
                            listenDropUpListItem: listenDropUpListItem,
                            watchDropUpListItem: watchDropUpListItem,
                            livestreamData: livestreamData
                        }
                        _listOfLives.push(itemObject);
                    }

                    function addListItemToStreamingToList(livestreamData) {

                        let livestreamItem = document.createElement('SPAN');
                        livestreamItem.className = 'media-livestream-streaming-to-list-item';
    
                        let livestreamItemToWith = document.createElement('SPAN');
                        livestreamItemToWith.className = 'media-livestream-streaming-to-list-item-how';
                        livestreamItem.appendChild(livestreamItemToWith);
                        if(livestreamData.platform == 'Peer2Peer') {
                            livestreamItemToWith.innerHTML = 'with ';
                        } else {
                            livestreamItemToWith.innerHTML = 'to ' + livestreamData.platform;
                        }

                        let livestreamItemPlatform = document.createElement('SPAN');
                        livestreamItemPlatform.className = 'media-livestream-streaming-to-list-platform';
                        livestreamItemPlatform.dataset.itemName = livestreamData.externalId || livestreamData.roomId; //roomId - is room id for p2p broadcast
                        livestreamItem.appendChild(livestreamItemPlatform);

                        if(livestreamData.platform == 'Peer2Peer') {
                            livestreamItemPlatform.innerHTML = 'Peer to Peer';
                        } else {
                            livestreamItemPlatform.innerHTML = livestreamData.platform;
                        }
                        currentlyStreamingToList.appendChild(livestreamItem);

                        livestreamItemPlatform.addEventListener('click', function (e) {
                            playLive(livestreamData, livestreamData.platform == 'Peer2Peer');
                        });

                        return livestreamItem;
                    }
                    

                    function addListItemToDropUpMenu(livestreamData, audioOrVideo) {
                        let livestreamItem = document.createElement('DIV');
                        livestreamItem.className = 'media-livestream-streams-menu-item';

                        let livestreamItemPlatform = document.createElement('SPAN');
                        livestreamItemPlatform.className = 'media-livestream-streams-menu-item-name';
                        livestreamItemPlatform.dataset.itemName = livestreamData.externalId || livestreamData.roomId; //roomId - is room id for p2p broadcast
                        livestreamItem.appendChild(livestreamItemPlatform);

                        if(livestreamData.platform == 'Peer2Peer') {
                            livestreamItemPlatform.innerHTML = audioOrVideo == 'audio' ? 'Listen with Peer to Peer' : 'Watch with Peer to Peer';
                        } else {
                            livestreamItemPlatform.innerHTML = livestreamData.platform;
                        }
                        _streamsList.appendChild(livestreamItem);

                        livestreamItem.addEventListener('click', function (e) {
                            playLive(livestreamData, audioOrVideo == 'audio');
                            if(_streamsListPopup) {
                                _streamsListPopup.hide();
                            }
                        });

                        return livestreamItem;
                    }

                    for(let i = _listOfLives.length - 1; i >= 0; i--) {
                        let live = _listOfLives[i];
                        let inactive = true;
                        for(let r = tool.activeLivestreamings.length - 1; r >= 0; r--) {
                            if(live.livestreamData == tool.activeLivestreamings[r]) {
                                inactive = false;
                                break;
                            }
                        }

                        if(inactive) {
                            if(live.streamingToListItem.parentElement) {
                                live.streamingToListItem.parentElement.removeChild(live.streamingToListItem);
                            }
                            if(live.listenDropUpListItem.parentElement) {
                                live.listenDropUpListItem.parentElement.removeChild(live.listenDropUpListItem);
                            }
                            if(live.watchDropUpListItem.parentElement) {
                                live.watchDropUpListItem.parentElement.removeChild(live.watchDropUpListItem);
                            }
                            _listOfLives.splice(i, 1)
                            onLiveRemoved(live.livestreamData);
                        }

                    }

                    if(_listOfLives.length === 0) {
                        currentlyStreamingTo.style.display = 'none';
                        onNoActiveLivestreams();
                    } else {
                        currentlyStreamingTo.style.display = '';
                        onLivestreamStarted();
                    }

                }

                function onNoActiveLivestreams() {
                    if(_joinButton) {
                        _joinButton.dataset.touchlabel = 'Live stream is inactive';
                        _joinButton.setAttribute('disabled', true);
                    }
                }

                function onLivestreamStarted() {
                    currentlyStreamingTo.style.display = '';
                    
                    if(_joinButton) {
                        _joinButton.dataset.touchlabel = '';
                        _joinButton.removeAttribute('disabled');
                    }
                }

                function playLive(livestreamData, onlyAudio) {
                    if(livestreamData.platform == 'Peer2Peer' && livestreamData.broadcastClient) return;

                    //deactivate previous players, especially of peer2peer broadcast
                    if(_activePlayerLive) {
                        if(_activePlayerLive.platform == 'Peer2Peer' && _activePlayerLive.broadcastClient){
                            _activePlayerLive.broadcastClient.disconnect();
                            _activePlayerLive.broadcastClient = null;
                        }
                    }

                    _activePlayerLive = livestreamData;

                    livestreamWidngetPlayer.innerHTML = '';
                    let streamingContainer = tool.generateLivestreamVideo(livestreamData, onlyAudio);
                    livestreamWidngetPlayer.appendChild(streamingContainer);
                    _mediaPlayerElementContainer = streamingContainer;

                    if(_joinButton.classList.contains('media-livestream-join-audience')) {
                        joinButtonCon.style.display = 'none';
                    }

                    tool.livestreamStream.join();
                }

                function onLiveRemoved(live) {
                    if(live.platform != 'Peer2Peer') return;

                    if(_mediaPlayerElementContainer && _mediaPlayerElementContainer.parentElement) {
                        _mediaPlayerElementContainer.parentElement.removeChild(_mediaPlayerElementContainer);
                    }
                    if(_joinButton.classList.contains('media-livestream-join-audience')) {
                        joinButtonCon.style.display = '';
                    }
                }

                function isMinimized() {
                    return _minimized
                }

                return {
                    widgetEl: widgetContainer0,
                    minimizeWidget: minimizeWidget,
                    maximizeWidget: maximizeWidget,
                    isMinimized: isMinimized
                };
            },
            createFull: function () {

                var tool = this;

                var resizeDetectorEl = tool.horizontalResizeDetector = document.createElement('DIV');
                resizeDetectorEl.className = 'media-livestream-resize-detector';
                tool.element.appendChild(resizeDetectorEl);
                const ro = new window.ResizeObserver(entries => {
                    for(let entry of entries){
                        const width = entry.contentRect.width;
                        const height = entry.contentRect.height;
                        let newHeight = width / 16 * 9;
                        //livestreamVideoInner.style.height = newHeight > 480 ? newHeight : 480 + 'px';
                        tool.updateUIOnResize(width, height);
                    }
                })

                ro.observe(resizeDetectorEl)

                var toolContainer = document.createElement('DIV');
                toolContainer.className = 'media-livestream-container';

                var primaryColumn = document.createElement('DIV');
                primaryColumn.className = 'media-livestream-primary-column';
                toolContainer.appendChild(primaryColumn);

                var toolContainerInner = document.createElement('DIV');
                toolContainerInner.className = 'media-livestream-container-inner';
                primaryColumn.appendChild(toolContainerInner);

                /* let livestreamTitle = document.createElement('DIV');
                livestreamTitle.className = 'media-livestream-title';
                toolContainerInner.appendChild(livestreamTitle);

                let livestreamTitleText = document.createElement('H1');
                livestreamTitleText.className = 'media-livestream-title-text';
                livestreamTitleText.innerHTML = tool.livestreamStream.fields.title;
                livestreamTitle.appendChild(livestreamTitleText); */

                var livestreamingTabsCon = tool.videoContainerTabsConEl = document.createElement('DIV');
                livestreamingTabsCon.className = 'media-livestream-video-tabs-con';
                toolContainerInner.appendChild(livestreamingTabsCon);

                var livestreamingTabsTool = tool.videoContainerTabsEl = document.createElement('DIV');
                livestreamingTabsTool.className = 'media-livestream-video-tabs-tool';
                livestreamingTabsCon.appendChild(livestreamingTabsTool);

                tool.videoTabsTool.syncVideoTabsList.apply(tool);

                var livestreamVideoCon = document.createElement('DIV');
                livestreamVideoCon.className = 'media-livestream-video-con';
                toolContainerInner.appendChild(livestreamVideoCon);

                var livestreamVideoInner = tool.videoContainerEl = document.createElement('DIV');
                livestreamVideoInner.className = 'media-livestream-video-inner';
                livestreamVideoCon.appendChild(livestreamVideoInner);

                const videoResizeObserver = new window.ResizeObserver(entries => {
                    tool.updateUIOnResize();
                })

                videoResizeObserver.observe(livestreamVideoInner)

                var webrtcParticipantsTool = tool.webrtcParticipantsTool = document.createElement('DIV');
                webrtcParticipantsTool.className = 'media-livestream-participants-tool';
                toolContainerInner.appendChild(webrtcParticipantsTool);

                if (tool.state.webrtcPublisherId && tool.state.webrtcStreamName) {
                    Q.activate(
                        Q.Tool.setUpElement(webrtcParticipantsTool, 'Streams/participants', {
                            publisherId: tool.state.webrtcPublisherId,
                            streamName: tool.state.webrtcStreamName,
                            invite: false,
                            showBlanks: true,
                            showSummary: false
                        }),
                        {},
                        function () { }
                    );
                }


                var secondColumn = document.createElement('DIV');
                secondColumn.className = 'media-livestream-side-column';
                toolContainer.appendChild(secondColumn);

                var livestreamParticipantsCon = document.createElement('DIV');
                livestreamParticipantsCon.className = 'media-livestream-participants-con';
                secondColumn.appendChild(livestreamParticipantsCon);

                var livestreamParticipantsTool = document.createElement('DIV');
                livestreamParticipantsTool.className = 'media-livestream-participants-tool';
                livestreamParticipantsCon.appendChild(livestreamParticipantsTool);

                Q.activate(
                    Q.Tool.setUpElement(livestreamParticipantsTool, 'Streams/participants', {
                        publisherId: tool.state.publisherId,
                        streamName: tool.state.streamName,
                        invite: true,
                        showBlanks: true,
                        showSummary: false
                    }),
                    {},
                    function () { }
                );

                var livestreamChatBtnsCon = document.createElement('DIV');
                livestreamChatBtnsCon.className = 'media-livestream-chat-buttons-con';
                secondColumn.appendChild(livestreamChatBtnsCon);

                var livestreamChatBtnsInner = document.createElement('DIV');
                livestreamChatBtnsInner.className = 'media-livestream-chat-buttons-inner';
                livestreamChatBtnsCon.appendChild(livestreamChatBtnsInner);

                /* if (tool.state.webrtcPublisherId && tool.state.webrtcStreamName) {
                        var livestreamChatButton = document.createElement('BUTTON');
                        livestreamChatButton.className = 'media-livestream-chat-button';
                        livestreamChatBtnsInner.appendChild(livestreamChatButton);
                        var livestreamChatButtonIcon = document.createElement('SPAN');
                        livestreamChatButtonIcon.className = 'media-livestream-chat-button-icon';
                        livestreamChatButtonIcon.innerHTML = _icons.askQuestion;
                        livestreamChatButton.appendChild(livestreamChatButtonIcon);
                        var livestreamChatButtonText = document.createElement('SPAN');
                        livestreamChatButtonText.innerHTML = 'Ask a Question / Request to Join';
                        livestreamChatButton.appendChild(livestreamChatButtonText);
    
                        Q.activate(
                            Q.Tool.setUpElement('div', 'Media/webrtc/callCenter/client', {
                                publisherId: tool.state.webrtcPublisherId,
                                streamName: tool.state.webrtcStreamName,
                            }),
                            {},
                            function () {
                                tool.callCenterClientTool = this;
    
                            }
                        );
    
                        livestreamChatButton.addEventListener('click', function () {
                            tool.callCenterClientTool.requestCall();
                        });
                        
                        tool.getWebRTCStream().then(function (webrtcStream) {
                            if(webrtcStream && webrtcStream.testWriteLevel('contribute')) {
                                livestreamChatBtnsInner.innerHTML = '';
                                let livestreamChatButton = document.createElement('BUTTON');
                                livestreamChatButton.className = 'media-livestream-chat-button';
                                livestreamChatBtnsInner.appendChild(livestreamChatButton);
                                let livestreamChatButtonIcon = document.createElement('SPAN');
                                livestreamChatButtonIcon.className = 'media-livestream-chat-button-icon';
                                livestreamChatButtonIcon.innerHTML = _icons.join;
                                livestreamChatButton.appendChild(livestreamChatButtonIcon);
                                let livestreamChatButtonText = document.createElement('SPAN');
                                livestreamChatButtonText.innerHTML = 'Go on Stage';
                                livestreamChatButton.appendChild(livestreamChatButtonText);

                                livestreamChatButton.addEventListener('click', function () {
                                    tool.goOnStage();
                                });
                            }
                        });
                } */


                var livestreamChatCon = document.createElement('DIV');
                livestreamChatCon.className = 'media-livestream-chat-con';
                secondColumn.appendChild(livestreamChatCon);

                var livestreamChatInner = document.createElement('DIV');
                livestreamChatInner.className = 'media-livestream-chat-inner';
                livestreamChatCon.appendChild(livestreamChatInner);
                
                var livestreamChatToolCon = document.createElement('DIV');
                livestreamChatToolCon.className = 'media-livestream-chat-tool-con';
                livestreamChatInner.appendChild(livestreamChatToolCon);
                tool.textChatContainerEl = livestreamChatToolCon;

                Q.activate(
                    Q.Tool.setUpElement(
                        livestreamChatToolCon,
                        "Streams/chat",
                        {
                            publisherId: tool.state.publisherId,
                            streamName: tool.state.streamName
                        }
                    )
                    ,
                    {},
                    function () {
                        let chatTool = this;
                        setTimeout(function () {
                            let placeholder = chatTool.element.querySelector('.Q_placeholder');
                            if(placeholder) placeholder.innerHTML = 'Ask a question';

                        }, 500);
                        Q.Tool.onActivate('Media/webrtc/chat').add(function (arg1, arg2) {
                            let chatWebrtcTool = this;
                            if (chatTool.element == chatWebrtcTool.element || chatTool.element.contains(chatWebrtcTool.element)) {
                                if (tool.webrtcStream && tool.webrtcStream.testWriteLevel('contribute')) {
                                    chatWebrtcTool.startWebRTC = function () {
                                        tool.goOnStage();
                                    }

                                    setTimeout(function () {
                                        let callButton = chatWebrtcTool.element.querySelector('.Streams_chat_call');
                                        callButton.classList.add('media-livestream-chat-call');
                                        if (callButton) {
                                            const encodedSVG = encodeURIComponent(_icons.join)
                                                .replace(/'/g, "%27")
                                                .replace(/fill%3D%22%23000000%22/g, 'fill%3D%22%233f76e5%22');
    
                                            // Construct the data URL
                                            const dataURL = `data:image/svg+xml,${encodedSVG}`;
                                            callButton.style.filter = 'none';
                                            callButton.style.backgroundImage = `url("${dataURL}")`;
                                        }
                                    }, 500);
                                } else {
                                    setTimeout(function () {
                                        let callButton = chatWebrtcTool.element.querySelector('.Streams_chat_call');
                                        if (callButton) {
                                            tool.state.onLivestreamUpdate.add(function () {
                                                if(tool.activeLivestreamings.length === 0) {
                                                    callButton.dataset.touchlabel = 'Livestream is inactive';
                                                } else {
                                                    callButton.dataset.touchlabel = ''
                                                }
                                            });
                                        }
                                    }, 500);
                                    
                                    chatWebrtcTool.startWebRTC = function () {
                                        if(tool.activeLivestreamings.length === 0) {
                                            return;
                                        }
                                        if (tool.callCenterClientTool) tool.callCenterClientTool.requestCall();
                                    }
                                }

                            }

                        });
                    }
                );

                var reactionsCon = document.createElement('DIV');
                reactionsCon.className = 'media-livestream-video-reactions';
                secondColumn.appendChild(reactionsCon);
                tool.reactionsEl = reactionsCon;
                

                tool.createReactionsUI().then(function (element) {
                    tool.state.onLivestreamUpdate.add(function () {
                        if(tool.activeLivestreamings.length === 0) {
                            element.classList.add('Q_disabled');
                            reactionsCon.dataset.touchlabel = 'Livestream is inactive';
                        } else {
                            element.classList.remove('Q_disabled');
                            reactionsCon.dataset.touchlabel = ''
                        }
                    });
                    
                    reactionsCon.appendChild(element);
                })

                Q.handle(tool.state.onUpdate, tool, [{
                    prevNumOfLives: -1
                }]);

                return {
                    widgetEl: toolContainer
                };
            },
            goOnStage: function () {
                let tool = this;
                if(!tool.webrtcStream) return;
                tool.currentActiveWebRTCRoom = Q.Media.WebRTC({
                    roomId: tool.webrtcStream.fields.name,
                    roomPublisherId: tool.webrtcStream.fields.publisherId,
                    element: document.body,
                    startWith: { video: false, audio: true },
                    onWebRTCRoomCreated: function () {
                       
                    }
                });

                tool.currentActiveWebRTCRoom.start();
            },
            importIcons: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.addScript([
                        '{{Media}}/js/tools/webrtc/livestreamingEditor/streamingIcons.js',
                    ], function () {
                        tool.icons = Q.Media.WebRTC.livestreaming.streamingIcons;
                        resolve();
                    });
                });
            },
            createReactionsUI: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    tool.importIcons().then(function () {
                        var reactionsCon = document.createElement('DIV');
                        reactionsCon.className = 'media-livestream-reactions';
        
                        var reactions = Object.keys(tool.icons.reactions);
                        

                        for(let i in reactions) {
                            let reactionType = reactions[i]
                            let item = document.createElement('DIV');
                            item.className = 'media-livestream-reactions-item';
                            //item.dataset.touchlabel = reactionType;
                            reactionsCon.appendChild(item);
                            let itemIcon = document.createElement('DIV');
                            itemIcon.className = 'media-livestream-reactions-icon';
                            item.appendChild(itemIcon);
                            let itemIconImg = document.createElement('IMG');
                            itemIconImg.src = Q.url(tool.icons.reactions[reactionType]);
                            itemIcon.appendChild(itemIconImg);

                            item.addEventListener('click', function () {
                                tool.sendReaction(reactionType);
                            })
                        }
        
                        resolve(reactionsCon);
                    })
                });
            },
            sendReaction: function (reaction) {
                var tool = this;
                if(!tool.sendReactionFunc) {
                    tool.sendReactionFunc = Q.throttle(function () {
                        Q.Streams.Stream.ephemeral(tool.state.publisherId, tool.state.streamName, {
                            type: "Media/livestream/reaction",
                            reaction
                        });         
                    }, 10000)
                }

                tool.sendReactionFunc();
            },
            updateUIOnResize: function (width, height) {
                var tool = this;
                let toolRect = tool.element.getBoundingClientRect();
                if(!width) width = toolRect.width;
                let videoRect = tool.videoContainerEl.getBoundingClientRect();
                let webrtcUsersRect = tool.webrtcParticipantsTool.getBoundingClientRect();
                let verticalHeight = toolRect.width / 16 * 9; //determine video's height if it was vertical layout
                if((width / 16 * 9) - tool.state.wide_minChatWidth <= (toolRect.height / 2) && toolRect.height - verticalHeight >= toolRect.height / 2.5) {
                    if(tool.state.layout != 'vertical') renderVertcalLayout();
                } else {
                    if(tool.state.layout != 'wide') renderWideLayout();
                }

                //if(webrtcUsersRect.bottom > window.innerHeight) {
                    let newHeight = videoRect.height - (videoRect.bottom - window.innerHeight) - webrtcUsersRect.height;
                    let newWidth = newHeight / 9 * 16;
                    tool.videoContainerEl.style.width = newWidth + 'px';
                //}

                function renderWideLayout() {
                    tool.state.layout = 'wide';
                    tool.element.classList.remove('media-livestream-vertical');
                    tool.element.classList.add('media-livestream-wide');
                }

                function renderVertcalLayout() {
                    tool.state.layout = 'vertical';
                    tool.element.classList.remove('media-livestream-wide');
                    tool.element.classList.add('media-livestream-vertical');

                }

                function isElementFullyVisibleAndNotCovered(element) {
                    const rect = element.getBoundingClientRect();
                
                    // Check if the element is fully within the viewport
                    const isInViewport = (
                        rect.top >= 0 &&
                        rect.left >= 0 &&
                        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
                    );
                
                    if (!isInViewport) {
                        return false;
                    }
                
                    // Check if the corners are not covered by another element
                    const topLeftElement = document.elementFromPoint(rect.left, rect.top);
                    const bottomRightElement = document.elementFromPoint(rect.right - 1, rect.bottom - 1);
                
                    return (
                        topLeftElement === element &&
                        bottomRightElement === element
                    );
                }
            },
            syncLivestreamsList: function () {
                var tool = this;
               
                if(!tool.livestreamStream) {
                    return;
                }
                
                let livestreams = tool.livestreamStream.getAttribute('lives');

                for (let i in livestreams) {
                    let livestreamItem = livestreams[i];
                    let livestreamExternalId;
                    if(livestreamItem.type == 'youtube') {
                        livestreamExternalId = livestreamItem.broadcastId;
                    } else if (livestreamItem.type == 'facebook') {
                        livestreamExternalId = livestreamItem.liveVideoId;
                    }

                    let livestreamingExists = null;
                    for(let a in tool.activeLivestreamings) {
                        let activeStreamData = tool.activeLivestreamings[a];

                        if(activeStreamData.externalId == livestreamExternalId) {
                            livestreamingExists = activeStreamData;
                            break;
                        }
                    }

                    if(!livestreamingExists) {

                        let livestreamInfo = {
                            platform: livestreamItem.type,
                            externalId: livestreamExternalId,
                            shareId: livestreamItem.shareId
                        };
    
                        tool.activeLivestreamings.unshift(livestreamInfo);
                        tool.allLivestreamings.unshift(livestreamInfo);
                    }
                }

                //only one p2p broadcast is possible
                let p2pRoom = tool.livestreamStream.getAttribute('p2pRoom');
                if(p2pRoom && p2pRoom != '') {
                    let exist = null;
                    for(let e = tool.activeLivestreamings.length - 1; e >= 0; e--) {
                        if(tool.activeLivestreamings[e].platform == 'Peer2Peer') {
                            exist = tool.activeLivestreamings[e];
                            break;
                        }
                    }

                    if(!exist) {
                        let livestreamInfo = {
                            platform: 'Peer2Peer',
                            roomId: p2pRoom
                        };
    
                        tool.activeLivestreamings.unshift(livestreamInfo);
                        tool.allLivestreamings.unshift(livestreamInfo);
                    } else {
                        exist.roomId = p2pRoom; 
                        
                    }
                    
                } 

                for(let i = tool.activeLivestreamings.length - 1; i >= 0; i-- in tool.activeLivestreamings) {
                    let activeLivestreamItem = tool.activeLivestreamings[i];

                  

                    if(activeLivestreamItem.platform == 'Peer2Peer') {
                        if(!p2pRoom || p2pRoom == '') {
                            activeLivestreamItem.offline = true;
                            if(activeLivestreamItem.broadcastClient) {
                                activeLivestreamItem.broadcastClient.disconnect();
                                activeLivestreamItem.broadcastClient = null;
                            }
                            tool.activeLivestreamings.splice(i, 1);
                        } else {
                            activeLivestreamItem.offline = false;
                        }
                        continue;
                    }

                    let stillActive = false;
                    for (let s in livestreams) {
                        if (livestreams[s].type == 'youtube' && livestreams[s].broadcastId == activeLivestreamItem.externalId) {
                            stillActive = true;
                            break;
                        } else if (livestreams[s].type == 'facebook' && livestreams[s].liveVideoId == activeLivestreamItem.externalId) {
                            stillActive = true;
                            break;
                        }
                    }


                    if(stillActive === false) {
                        activeLivestreamItem.offline = true;
                        tool.activeLivestreamings.splice(i, 1);
                    }
                }
                Q.handle(tool.state.onActiveLivestreamingsUpdated, tool);
            },
            updateIframeSize: function () {

            },
            generateLivestreamVideo: function (livestreamData, asAudio) {
                var src, title;
                let platforms = ['youtube', 'facebook', 'twitch'];
                if(platforms.indexOf(livestreamData.platform) != -1) {
                    if(livestreamData.platform == 'youtube') {
                        let liveVideoId = livestreamData.externalId;
                        src = `https://www.youtube.com/embed/${liveVideoId}?controls=1&modestbranding=1&rel=0&enablejsapi=1`;
                        title = 'Youtube video player';
                    } else if(livestreamData.platform == 'facebook') {
                        let liveVideoId = livestreamData.shareId;
                        src = `https://www.facebook.com/plugins/video.php?href=https://www.facebook.com/facebook/videos/${liveVideoId}/`;
                        title = 'Facebook video player';
                    } else if(livestreamData.platform == 'twitch') {
                        let twitchChannelName = livestreamData.linkToLive.split("/").pop();
                        let parentDomain = location.origin.replace('https://', '');
                        src = `https://player.twitch.tv/?channel=${twitchChannelName}&parent=${parentDomain}`;
                        title = 'Twitch video player';
                    }
    
                    let iframeContainer = document.createElement('DIV');
                    iframeContainer.className = 'media-livestream-video-iframe-con';
                    let iframe = document.createElement('IFRAME');
                    if(livestreamData.platform == 'youtube') iframe.id = 'youtube-player';
                    iframe.src = src;
                    iframe.title = title;
                    iframe.sandbox = '';
                    iframe.frameborder = 0;
                    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
                    iframe.setAttribute('allowfullscreen', '');
                    function playVideo() {
                        playerIframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                    }
            
                    function pauseVideo() {
                        playerIframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                    }
            
                    function seekTo(seconds) {
                        playerIframe.contentWindow.postMessage('{"event":"command","func":"seekTo","args":[' + seconds + ', true]}', '*');
                    }
            
                    // Listen for messages from the iframe (optional)
                    window.addEventListener('message', function(event) {
                        // Ensure the message is from the YouTube iframe
                        /* if (event.origin !== 'https://www.youtube.com') {
                            return;
                        } */
                    
                        // Parse the data received from the iframe
                        var data = JSON.parse(event.data);
                    
                        // Handle different events
                        if (data.event === 'onStateChange') {
                            handlePlayerStateChange(data);
                        } else if (data.event === 'onReady') {
                            console.log('Player is ready');
                        }
                    }, false);

                    function handlePlayerStateChange(data) {
                        switch(data.info) {
                            case YT.PlayerState.PLAYING:
                                console.log('Video started playing');
                                break;
                            case YT.PlayerState.PAUSED:
                                console.log('Video paused');
                                break;
                            case YT.PlayerState.ENDED:
                                console.log('Video ended');
                                break;
                            // Add more cases for other states if needed
                            default:
                                console.log('Unhandled state change: ', data.info);
                        }
                    }
                    iframeContainer.appendChild(iframe);
                    return iframeContainer;
                } else if(livestreamData.platform == 'Peer2Peer') {
                    var broadcastCon = document.createElement('DIV');
                    broadcastCon.className = 'media-livestream-video-webcast-con';

                    var statsDataCon = document.createElement('DIV');
                    statsDataCon.className = 'media-livestream-video-webcast-stats';
                    broadcastCon.appendChild(statsDataCon);

                    var levelCounterCon = document.createElement('DIV');
                    levelCounterCon.className = 'media-livestream-video-webcast-stats-item media-livestream-video-webcast-stat-level';
                    statsDataCon.appendChild(levelCounterCon);

                    var levelCounter = document.createElement('DIV');
                    levelCounter.className = 'media-livestream-video-webcast-stats-item-in';
                    levelCounterCon.appendChild(levelCounter);

                    var localParticipantIdCon = document.createElement('DIV');
                    localParticipantIdCon.className = 'media-livestream-video-webcast-stats-item media-livestream-video-webcast-stat-local';
                    statsDataCon.appendChild(localParticipantIdCon);

                    var localParticipantId = document.createElement('DIV');
                    localParticipantId.className = 'media-livestream-video-webcast-stats-lp-id-text';
                    localParticipantIdCon.appendChild(localParticipantId);

                    var localParticipantIdColor = document.createElement('DIV');
                    localParticipantIdColor.className = 'media-livestream-video-webcast-stats-lp-id-color';
                    localParticipantIdCon.appendChild(localParticipantIdColor);

                    var iFollowIdCon = document.createElement('DIV');
                    iFollowIdCon.className = 'media-livestream-video-webcast-stats-item media-livestream-video-webcast-stat-follow';
                    statsDataCon.appendChild(iFollowIdCon);

                    var iFollowId = document.createElement('DIV');
                    iFollowId.className = 'media-livestream-video-webcast-stats-foll-id';
                    iFollowIdCon.appendChild(iFollowId);

                    var iFollowIdColor = document.createElement('DIV');
                    iFollowIdColor.className = 'media-livestream-video-webcast-stats-foll-col';
                    iFollowIdCon.appendChild(iFollowIdColor);

                    Q.addScript('{{Media}}/js/tools/webrtc/broadcast.js', function () {
                        Q.req("Media/webcast", ["turnServers"], function (err, response) {
                            var msg = Q.firstErrorMessage(err, response && response.errors);
    
                            if (msg) {
                                console.error(msg);
                                return;
                            }
    
                            var turnCredentials = response.slots.turnServers;
                            
                            Q.Streams.get(Q.Users.communityId, 'Media/webcast/' + livestreamData.roomId, function (err, stream) {
    
                                if (!stream) return;
        
                                var socketServer = stream.getAttribute('nodeServer');
        
                                var broadcastClient = livestreamData.broadcastClient = window.WebRTCWebcastClient({
                                    mode: 'node',
                                    role: 'receiver',
                                    nodeServer: socketServer,
                                    roomName: livestreamData.roomId,
                                    turnCredentials: turnCredentials,
                                });
        
                                broadcastClient.init(function () {    
                                    //var mediaElement = broadcastClient.mediaControls.getMediaElement(asAudio);
                                    var mediaElement = livestreamData.mediaElement = document.createElement(asAudio ? 'AUDIO' : 'VIDEO');
                                    mediaElement.muted = false;
                                    mediaElement.controls = true;
                                    mediaElement.autoplay = true;
                                    mediaElement.playsInline = true;
                                    mediaElement.setAttribute('webkit-playsinline', true);
                                    if(!asAudio) {
                                        mediaElement.muted = true;
                                        mediaElement.style.width = '100%';
                                        mediaElement.style.height = '100%';
                                        mediaElement.style.maxWidth = '100%';
                                        mediaElement.style.maxHeight = '100%';
                                    }
                                    broadcastCon.appendChild(mediaElement);
                                    var mediaStream = broadcastClient.mediaControls.getMediaStream();
                                    mediaElement.srcObject = mediaStream;
        
                                    localParticipantId.innerHTML = 'My ID: ' + (broadcastClient.localParticipant().sid).replace('/broadcast#', '');
                                });
        
                                broadcastClient.event.on('trackAdded', onTrackAdded)
                                broadcastClient.event.on('joinedCallback', function () {
                                    localParticipantIdColor.style.backgroundColor = broadcastClient.localParticipant().color;
                                })
        
                                function onTrackAdded(track) {
                                    levelCounter.innerHTML = 'Webcast level: ' + track.participant.distanceToRoot;
                                    iFollowId.innerHTML = 'I follow: ' + track.participant.sid.replace('/broadcast#', '');
                                    iFollowIdColor.style.backgroundColor = track.participant.color;
        
                                }
                            });
                        }, {
                            method: 'get',
                            fields: {
                            }
                        });
                        
                    });

                    if(asAudio) {
                        broadcastCon.classList.add('media-livestream-video-webcast-audio'); 
                    }
                    return broadcastCon;
                    
                }
                
            },
            videoTabsTool: {
                tabs: [],
                syncVideoTabsList: function () {
                    var tool = this;
                    if(tool.state.mode != 'full') return;

                    for(let i in tool.activeLivestreamings) {
                        let livestreamData = tool.activeLivestreamings[i];
    
                        let tabExists = false;
                        for (let t in tool.videoTabsTool.tabs) {
                            if( tool.videoTabsTool.tabs[t].livestreamData == livestreamData) {
                                tabExists = tool.videoTabsTool.tabs[t];
                                break;
                            }
                        }

                        if(tabExists !== false) {
                            if(!tool.videoContainerTabsEl.contains(tabExists.tabElement)) {
                                tabExists.tabElement.classList.add('media-livestream-video-tabs-tool-tab-streaming');
                                if(tool.videoContainerTabsEl.childElementCount != null) {
                                    tool.videoContainerTabsEl.insertBefore(tabExists.tabElement, tool.videoContainerTabsEl.firstChild);
                                } else {
                                    tool.videoContainerTabsEl.appendChild(tabExists.tabElement);
                                }
                            }
                            tabExists.active = true;
                            continue;
                        }
    
                        let livestreamVideoTabsItem = document.createElement('DIV');
                        livestreamVideoTabsItem.className = 'media-livestream-video-tabs-tool-tab media-livestream-video-tabs-tool-tab-streaming media-livestream-video-tabs-tool-tab-' + livestreamData.platform;
                        livestreamVideoTabsItem.dataset.tabName = livestreamData.externalId || livestreamData.roomId; //roomId - is room id for p2p broadcast
                        if(tool.videoContainerTabsEl.childElementCount != null) {
                            tool.videoContainerTabsEl.insertBefore(livestreamVideoTabsItem, tool.videoContainerTabsEl.firstChild);
                        } else {
                            tool.videoContainerTabsEl.appendChild(livestreamVideoTabsItem);
                        }

                        let livestreamVideoTabsItemTitle = document.createElement('DIV');
                        livestreamVideoTabsItemTitle.className = 'media-livestream-video-tabs-tool-tab-title';
                        livestreamVideoTabsItemTitle.innerHTML = livestreamData.platform;
                        livestreamVideoTabsItem.appendChild(livestreamVideoTabsItemTitle);
                        
                        let tabObject = {
                            title: livestreamData.platform,
                            key: livestreamData.externalId || livestreamData.roomId,
                            tabElement: livestreamVideoTabsItem,
                            active: true,
                            //tabContent: tool.generateLivestreamVideo(livestreamData),
                            livestreamData: livestreamData
                        }
    
                        livestreamData.tabObject = tabObject;
                        tool.videoTabsTool.tabs.push(tabObject);
    
                        livestreamVideoTabsItem.addEventListener('click', function (e) {
                            tool.videoTabsTool.tabHandler.bind(tool)(e);
                        });
                    }
                    for (let t in tool.videoTabsTool.tabs) {
                        if (tool.videoTabsTool.tabs[t].livestreamData.offline) {
                            tool.videoTabsTool.tabs[t].tabElement.classList.remove('media-livestream-video-tabs-tool-tab-streaming');
                            tool.videoTabsTool.tabs[t].tabElement.classList.add('media-livestream-video-tabs-tool-tab-offline');
                        } else {
                            tool.videoTabsTool.tabs[t].tabElement.classList.add('media-livestream-video-tabs-tool-tab-streaming');
                            tool.videoTabsTool.tabs[t].tabElement.classList.remove('media-livestream-video-tabs-tool-tab-offline');
                        }
                    }
                },
                tabHandler: function(e) {
                    var tool = this;
                    var clickedTabName = e.currentTarget.dataset.tabName;
                    var clickedTabObject = null;
                    for (let i in tool.videoTabsTool.tabs) {
                        let tab = tool.videoTabsTool.tabs[i];
                        if (tab.key != clickedTabName) {
                            tab.tabElement.classList.remove('media-livestream-video-tabs-tool-tab-active')
                        }
                        if (tab.key == clickedTabName && !tab.tabElement.classList.contains('media-livestream-video-tabs-tool-tab-active')) {
                            tab.tabElement.classList.add('media-livestream-video-tabs-tool-tab-active')
                        }
                        if (tab.key == clickedTabName) {
                            clickedTabObject = tab;
                        }
                    }

                    if(!clickedTabObject) return;

                    for (let i in tool.videoTabsTool.tabs) {
                        let tab = tool.videoTabsTool.tabs[i];

                        if(tab.livestreamData && tab.livestreamData.broadcastClient != null) {
                            tab.livestreamData.broadcastClient.disconnect();
                            tab.livestreamData.broadcastClient = null;
                        }
                    }
                    
                    tool.videoContainerEl.innerHTML = '';
                    let tabContent = tool.generateLivestreamVideo(clickedTabObject.livestreamData);
                    tool.videoContainerEl.appendChild(tabContent);
                    tool.updateUIOnResize();
                }
            },
            Q: {
                beforeRemove: function () {
                    this.removeTool(true);
                }
            }       
        }

    );

})(window.jQuery, window);