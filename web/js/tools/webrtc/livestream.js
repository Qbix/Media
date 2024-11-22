(function ($, window, undefined) {
    var _icons = {
        askQuestion: '<svg id="fi_2207581" enable-background="new 0 0 24 24" height="512" viewBox="0 0 24 24" width="512" xmlns="http://www.w3.org/2000/svg"><g><path d="m18 1h-12c-2.757 0-5 2.243-5 5v8c0 2.414 1.721 4.434 4 4.899v3.101c0 .369.203.708.528.882.148.079.31.118.472.118.194 0 .388-.057.555-.168l5.748-3.832h5.697c2.757 0 5-2.243 5-5v-8c0-2.757-2.243-5-5-5zm-6.555 16.168-4.445 2.963v-2.131c0-.552-.447-1-1-1-1.654 0-3-1.346-3-3v-8c0-1.654 1.346-3 3-3h12c1.654 0 3 1.346 3 3v8c0 1.654-1.346 3-3 3h-6c-.072 0-.174.007-.291.043-.116.035-.204.085-.264.125z"></path><path d="m12 4c-1.654 0-3 1.346-3 3 0 .552.447 1 1 1s1-.448 1-1c0-.551.448-1 1-1s1 .449 1 1c0 .322-.149.617-.409.808-1.011.74-1.591 1.808-1.591 2.929v.263c0 .552.447 1 1 1s1-.448 1-1v-.263c0-.653.484-1.105.773-1.317.768-.564 1.227-1.468 1.227-2.42 0-1.654-1.346-3-3-3z"></path><circle cx="12" cy="14" r="1"></circle></g></svg>',
        join: '<svg width="800px" height="800px" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"> <title>mic</title> <g id="Layer_2" data-name="Layer 2"> <g id="invisible_box" data-name="invisible box"> <rect width="48" height="48" fill="none"/> </g> <g id="Q3_icons" data-name="Q3 icons"> <g> <path d="M24,30a8,8,0,0,0,8-8V10a8,8,0,0,0-16,0V22A8,8,0,0,0,24,30ZM20,10a4,4,0,0,1,8,0V22a4,4,0,0,1-8,0Z"/> <path d="M40,22V20a2,2,0,0,0-4,0v2a12,12,0,0,1-24,0V20a2,2,0,0,0-4,0v2A16.1,16.1,0,0,0,22,37.9V42H14a2,2,0,0,0,0,4H33a2,2,0,0,0,0-4H26V37.9A16.1,16.1,0,0,0,40,22Z"/> </g> </g> </g> </svg>'
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
        tool.webrtcStream = null; //internal use only: use getWebRTCStream method to get webrtcStream
        tool.activeLivestreamings = [];
        tool.inactiveLivestreamings = [];
        tool.videoContainerEl = null;
        tool.videoContainerTabsEl = null;
        tool.textChatContainerEl = null;
        tool.relatedStreams = [];
        tool.privateChatStream = null;
        tool.callCenterClientTool = null;

        Q.addStylesheet('{{Media}}/css/tools/livestream.css?ts=' + performance.now(), function () {
            console.log('tool.state.publisherId, tool.state.streamName', tool.state.publisherId, tool.state.streamName)
            Q.Streams.get(tool.state.publisherId, tool.state.streamName, function (err) {
                if(!this || !this.fields) {
                    console.error('Error while getting stream', err);
                    return;
                }
                tool.livestreamStream = this;
                tool.livestreamStream.observe();
                
                tool.declareStreamEventHandlers();
                
                tool.syncLivestreamsList();
                tool.create();
               
                
            });
            
        });
    },

        {
            publisherId: null,
            streamName: null,
            webrtcPublisherId: null,
            webrtStreamName: null,
            layout: null, //wide||vertical
            wide_minChatWidth: 320,
            onRefresh: new Q.Event(),
            onUpdate: new Q.Event(),
            onWebrtcStreamLoaded: new Q.Event()
        },

        {
            refresh: function () {
                var tool = this;
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
                        }, tool);
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
                    tool.livestreamStream.refresh(function () {
                        tool.livestreamStream = this;
                        resolve();
                    })
                });
            },
            declareStreamEventHandlers: function() {
                var tool = this;
                console.log('declareStreamEventHandlers');
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
                    
                }, tool);
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
                }, tool);
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
                }, tool);

                tool.state.onUpdate.add(function (e, e2, e3) {
                    console.log('onUpdate', e, e2, e3);
                    if(tool.activeLivestreamings.length == 0 && e.prevNumOfLives != 0) {
                        console.log('onUpdate 1');
                        tool.videoContainerEl.innerHTML = '<div class="media-livestream-nolives">No livestreams for now</div>';
                    } else if((e.prevNumOfLives == 0 || e.prevNumOfLives == -1) && tool.activeLivestreamings.length != 0) {
                        console.log('onUpdate 2', tool.videoTabsTool.tabs);
                        tool.activeLivestreamings[0].tabObject.tabElement.click();
                    }

                    if(tool.activeLivestreamings.length <= 1) {
                        tool.videoContainerTabsConEl.style.display = 'none';
                    } else {
                        tool.videoContainerTabsConEl.style.display = '';
                    }
                }, tool);
            },
            create: function () {
                var tool = this;
                var resizeDetectorEl = tool.horizontalResizeDetector = document.createElement('DIV');
                resizeDetectorEl.className = 'media-livestream-resize-detector';
                tool.element.appendChild(resizeDetectorEl);

                const ro = new window.ResizeObserver(entries => {
                    for(let entry of entries){
                        const width = entry.contentRect.width;
                        const height = entry.contentRect.height;
                        let newHeight = width / 16 * 9;
                        console.log('newHeight', newHeight)
                        //livestreamVideoInner.style.height = newHeight > 480 ? newHeight : 480 + 'px';
                        tool.updateUIOnResize(width, height);
                    }
                })

                ro.observe(resizeDetectorEl)

                var toolContainer = document.createElement('DIV');
                toolContainer.className = 'media-livestream-container';
                tool.element.appendChild(toolContainer);

                var primaryColumn = document.createElement('DIV');
                primaryColumn.className = 'media-livestream-primary-column';
                toolContainer.appendChild(primaryColumn);

                var toolContainerInner = document.createElement('DIV');
                toolContainerInner.className = 'media-livestream-container-inner';
                primaryColumn.appendChild(toolContainerInner);

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

                if (tool.state.webrtcPublisherId && tool.state.webrtcStreamName) {
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
                                    tool.currentActiveWebRTCRoom = Q.Media.WebRTC({
                                        roomId: tool.state.webrtcStreamName,
                                        roomPublisherId: tool.state.webrtcPublisherId,
                                        element: document.body,
                                        startWith: { video: false, audio: true },
                                        onWebRTCRoomCreated: function () {
                                           
                                        }
                                    });
            
                                    tool.currentActiveWebRTCRoom.start();
                                });
                            }
                        });
                }


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
                    function () { }
                );

                var reactionsCon = document.createElement('DIV');
                reactionsCon.className = 'media-livestream-video-reactions';
                secondColumn.appendChild(reactionsCon);
                tool.createReactionsUI().then(function (element) {
                    reactionsCon.appendChild(element);
                })

                Q.handle(tool.state.onUpdate, tool, [{
                    prevNumOfLives: -1
                }]);
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

                console.log('webrtcUsersRect.bottom > window.innerHeight', webrtcUsersRect.bottom, window.innerHeight)
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
                console.log('syncLivestreamsList');
                var tool = this;
               

                let livestreams = tool.livestreamStream.getAttribute('lives');
                console.log('syncLivestreamsList', livestreams);

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
                console.log('tool.activeLivestreamings', tool.activeLivestreamings)
            },
            updateIframeSize: function () {

            },
            generateLivestreamVideo: function (livestreamData) {
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
                            console.log('webcast: turnServers', response.slots);
    
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
                                    var mediaElement = broadcastClient.mediaControls.getMediaElement();
                                    mediaElement.style.width = '100%';
                                    mediaElement.style.height = '100%';
                                    mediaElement.style.maxWidth = '100%';
                                    mediaElement.style.maxHeight = '100%';
                                    broadcastCon.appendChild(mediaElement);
        
                                    localParticipantId.innerHTML = 'My ID: ' + (broadcastClient.localParticipant().sid).replace('/broadcast#', '');
                                });
        
                                broadcastClient.event.on('trackAdded', onTrackAdded)
                                broadcastClient.event.on('joinedCallback', function () {
                                    localParticipantIdColor.style.backgroundColor = broadcastClient.localParticipant().color;
                                })
        
                                function onTrackAdded(track) {
                                    console.log('onTrackAdded');
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

                    return broadcastCon;
                    
                }
                
            },
            videoTabsTool: {
                tabs: [],
                syncVideoTabsList: function () {
                    console.log('syncVideoTabsList');
                    var tool = this;

                    for(let i in tool.activeLivestreamings) {
                        let livestreamData = tool.activeLivestreamings[i];
    
                        let tabExists = false;
                        for (let t in tool.videoTabsTool.tabs) {
                            if( tool.videoTabsTool.tabs[t].livestreamData == livestreamData) {
                                tabExists = tool.videoTabsTool.tabs[t];
                                break;
                            }
                        }
                        console.log('syncVideoTabsList tabExists', tabExists);

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
                            console.log('broadcastClient.predisconnect', tab.livestreamData.broadcastClient.id);
                            tab.livestreamData.broadcastClient.disconnect();
                            tab.livestreamData.broadcastClient = null;
                        }
                    }
                    
                    tool.videoContainerEl.innerHTML = '';
                    let tabContent = tool.generateLivestreamVideo(clickedTabObject.livestreamData);
                    tool.videoContainerEl.appendChild(tabContent);
                    tool.updateUIOnResize();
                }
            }           
        }

    );

})(window.jQuery, window);