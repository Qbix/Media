(function (Q, $) {
    /**
     * Media Tools
     * @module Media-tools
     * @main
     */
    var Streams = Q.Streams;

    var _icons = {
        settings: '<svg version="1.1" id="svg69" xml:space="preserve" width="682.66669" height="682.66669" viewBox="0 0 682.66669 682.66669" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><defs id="defs73"><clipPath clipPathUnits="userSpaceOnUse" id="clipPath83"><path d="M 0,512 H 512 V 0 H 0 Z" id="path81" /></clipPath></defs><g id="g75" transform="matrix(1.3333333,0,0,-1.3333333,0,682.66667)"><g id="g77"><g id="g79" clip-path="url(#clipPath83)"><g id="g85" transform="translate(256,334.6665)"><path d="m 0,0 c -43.446,0 -78.667,-35.22 -78.667,-78.667 0,-43.446 35.221,-78.666 78.667,-78.666 43.446,0 78.667,35.22 78.667,78.666 C 78.667,-35.22 43.446,0 0,0 Z m 220.802,-22.53 -21.299,-17.534 c -24.296,-20.001 -24.296,-57.204 0,-77.205 l 21.299,-17.534 c 7.548,-6.214 9.497,-16.974 4.609,-25.441 l -42.057,-72.845 c -4.889,-8.467 -15.182,-12.159 -24.337,-8.729 l -25.835,9.678 c -29.469,11.04 -61.688,-7.561 -66.862,-38.602 l -4.535,-27.213 c -1.607,-9.643 -9.951,-16.712 -19.727,-16.712 h -84.116 c -9.776,0 -18.12,7.069 -19.727,16.712 l -4.536,27.213 c -5.173,31.041 -37.392,49.642 -66.861,38.602 l -25.834,-9.678 c -9.156,-3.43 -19.449,0.262 -24.338,8.729 l -42.057,72.845 c -4.888,8.467 -2.939,19.227 4.609,25.441 l 21.3,17.534 c 24.295,20.001 24.295,57.204 0,77.205 l -21.3,17.534 c -7.548,6.214 -9.497,16.974 -4.609,25.441 l 42.057,72.845 c 4.889,8.467 15.182,12.159 24.338,8.729 l 25.834,-9.678 c 29.469,-11.04 61.688,7.561 66.861,38.602 l 4.536,27.213 c 1.607,9.643 9.951,16.711 19.727,16.711 h 84.116 c 9.776,0 18.12,-7.068 19.727,-16.711 l 4.535,-27.213 c 5.174,-31.041 37.393,-49.642 66.862,-38.602 l 25.835,9.678 c 9.155,3.43 19.448,-0.262 24.337,-8.729 L 225.411,2.911 c 4.888,-8.467 2.939,-19.227 -4.609,-25.441 z" style="fill:none;stroke:#000000;stroke-width:40;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-opacity:1" id="path87" /></g></g></g></g></svg>',
        call: '<svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"  viewBox="0 0 480.56 480.56" style="enable-background:new 0 0 480.56 480.56;" xml:space="preserve"> <g>  <g>  <path d="M365.354,317.9c-15.7-15.5-35.3-15.5-50.9,0c-11.9,11.8-23.8,23.6-35.5,35.6c-3.2,3.3-5.9,4-9.8,1.8  c-7.7-4.2-15.9-7.6-23.3-12.2c-34.5-21.7-63.4-49.6-89-81c-12.7-15.6-24-32.3-31.9-51.1c-1.6-3.8-1.3-6.3,1.8-9.4  c11.9-11.5,23.5-23.3,35.2-35.1c16.3-16.4,16.3-35.6-0.1-52.1c-9.3-9.4-18.6-18.6-27.9-28c-9.6-9.6-19.1-19.3-28.8-28.8  c-15.7-15.3-35.3-15.3-50.9,0.1c-12,11.8-23.5,23.9-35.7,35.5c-11.3,10.7-17,23.8-18.2,39.1c-1.9,24.9,4.2,48.4,12.8,71.3  c17.6,47.4,44.4,89.5,76.9,128.1c43.9,52.2,96.3,93.5,157.6,123.3c27.6,13.4,56.2,23.7,87.3,25.4c21.4,1.2,40-4.2,54.9-20.9  c10.2-11.4,21.7-21.8,32.5-32.7c16-16.2,16.1-35.8,0.2-51.8C403.554,355.9,384.454,336.9,365.354,317.9z"/>  <path d="M346.254,238.2l36.9-6.3c-5.8-33.9-21.8-64.6-46.1-89c-25.7-25.7-58.2-41.9-94-46.9l-5.2,37.1  c27.7,3.9,52.9,16.4,72.8,36.3C329.454,188.2,341.754,212,346.254,238.2z"/>  <path d="M403.954,77.8c-42.6-42.6-96.5-69.5-156-77.8l-5.2,37.1c51.4,7.2,98,30.5,134.8,67.2c34.9,34.9,57.8,79,66.1,127.5  l36.9-6.3C470.854,169.3,444.354,118.3,403.954,77.8z"/>  </g> </g> </svg>',
        hungUp: '<svg version="1.1" x="0px" y="0px" width="90.182373" height="62.977245" viewBox="-0.067 -0.378 90.182373 62.977245" enable-background="new -0.067 -0.378 101 101" xml:space="preserve" id="svg66" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs58"> </defs> <path fill="#FFFFFF" d="M 40.67337,-0.345341 C -5.9408979,0.549606 -0.37124761,23.629725 0.69580429,27.016099 1.8415328,32.774245 6.252342,35.655777 10.727075,34.024876 l 8.516746,-2.66681 c 4.589471,-1.673518 7.500506,-7.916837 6.499018,-13.947073 l -0.190135,-1.140812 c 15.486185,-4.382944 28.839905,-3.256885 39.261281,-0.357323 l -0.08523,0.486812 c -0.996571,6.030236 1.911187,12.275194 6.503935,13.950351 l 8.513468,3.547005 c 3.850238,1.404706 7.648025,-1.299803 9.365798,-5.622101 0.02295,0.01967 0.03442,0.03442 0.03442,0.03442 0,0 0.23603,-0.581879 0.473699,-1.57845 0.01967,-0.07704 0.03442,-0.16391 0.05409,-0.239308 0.03606,-0.183579 0.07704,-0.372075 0.116376,-0.576962 0.02459,-0.114737 0.05081,-0.224556 0.07376,-0.342571 l -0.0098,-0.0066 C 91.100177,18.219067 89.816765,-1.282904 40.67337,-0.345341 Z" style="fill:#d40000;stroke-width:1.6391" id="path62" /> <path fill="#FFFFFF" d="m 58.354305,43.518523 -9.001918,3.555201 V 26.230971 c 0,-0.396661 -0.321263,-0.719563 -0.717924,-0.719563 H 41.41752 c -0.399939,0 -0.721202,0.321263 -0.721202,0.719563 V 47.070446 L 31.69276,43.516884 c -0.299955,-0.121293 -0.647443,-0.02131 -0.842496,0.234391 -0.09671,0.131128 -0.142601,0.283564 -0.142601,0.440917 0,0.152436 0.04917,0.30815 0.149158,0.440917 l 13.596306,17.680935 c 0.136045,0.180301 0.349128,0.285203 0.573684,0.285203 0.224556,0 0.437639,-0.104902 0.572045,-0.285203 L 59.196801,44.633109 c 0.198331,-0.265534 0.198331,-0.617939 0.0016,-0.876917 -0.195052,-0.260616 -0.542541,-0.357323 -0.844135,-0.237669 z" style="fill:#d40000;stroke-width:1.6391" id="path64" /></svg>'
    };
    /**
     * Interface for rendering clip
     * @class Media clip
     * @constructor
     */
    Q.Tool.define("Media/clip", function(options) {
        var tool = this;
        var state = this.state;
        var userId = Q.Users.loggedInUserId();
        var $toolElement = $(this.element);
        tool.hostsUsers = Q.getObject("hosts", Q.Media) || [];
        tool.screenersUsers = Q.getObject("screeners", Q.Media) || [];

        if (!state.publisherId) {
            throw new Q.Error("Media/clip tool: missing options.publisherId");
        }
        if (!state.streamName) {
            throw new Q.Error("Media/clip tool: missing options.streamName");
        }

        $toolElement.attr("data-visualization", "clip");

        var pipe = new Q.pipe(['stream', 'webrtc'], function () {
            if (tool.isLive()) {
                tool.element.classList.add("Media_clip_live");
            }

            if (state.facesUse) {
                Q.ensure('Q.Users.Faces', function () {
                    tool.faces = new Q.Users.Faces({
                        debounce: state.facesDebounce
                    });

                    tool.faces.start(function () {
                        tool.faces.onEnter.add(function () {
                            state.face = true;
                        }, tool);
                        tool.faces.onLeave.add(function () {
                            state.face = false;
                        }, tool);
                    });
                });
            }

            tool.refresh();
        });

        Streams.get.force(state.publisherId, state.streamName, function (err) {
            if (err) {
                return;
            }

           
            tool.stream = this;

            $(tool.element).attr("data-type", this.fields.type);
            pipe.fill("stream")();

            // join user once he visited clip tool to allow get messages (relatedTo, unrelatedTo, ...)
            if (Q.Users.loggedInUserId()) {
                //this.join();
                this.observe();
            }

            // listen for message Media/webrtc/guest to manage video conference guest
            this.onMessage("Media/webrtc/guest").set(function (message) {
                var uId = message.getInstruction('userId');
                var joined = message.getInstruction('joined');

                // search this user avatr in all participants and add/remove Media_clip_guest class
                $(".Users_avatar_tool", tool.element).each(function () {
                    var avatarTool = Q.Tool.from(this, "Users/avatar");

                    if (Q.typeOf(avatarTool) !== "Q.Tool") {
                        return;
                    }

                    if (avatarTool.state.userId === uId) {
                        if (joined) {
                            this.classList.add("Media_clip_guest");
                            if (userId === uId) {
                                $toolElement.attr("data-visualization", "hosts");
                            }
                        } else {
                            this.classList.remove("Media_clip_guest");
                            if (userId === uId) {
                                $toolElement.attr("data-visualization", "clip");
                            }
                        }
                    }
                });
            }, tool);
        });

        tool.webrtcParticipants = [];
        // get live webrtc stream
        if (tool.isLive()) {
            Streams.get.force(state.publisherId, "Media/webrtc/live", function (err, stream, extra) {
                if (err) {
                    return Q.Error("Media/webrtc/live not found");
                }

                tool.webrtcParticipants = Object.keys(Q.getObject("participants", extra) || {});

                // if current user is a guest, switch visualization to "hosts"
                if (tool.webrtcParticipants.includes(userId)) {
                    $toolElement.attr("data-visualization", "hosts");
                }
                pipe.fill("webrtc")();
            }, {participants: 100});
        } else {
            pipe.fill("webrtc")();
        }
    }, {
        publisherId: null,
        streamName: null,
        facesDebounce: 30,
        facesUse: false,
        showDescription: true,
        qVideoOptions: null,
        qAudioOptions: null,
        earnPeriod: parseInt(Q.getObject("Media.clip.watching.earnPeriod", Q)) || 60,
        credits: parseInt(Q.getObject("Assets.credits.amounts.watching", Q)) || 1,
        withQuestions: false,
        minChatHeight: 200
    }, {
        refresh: function () {
            var tool = this;
            var state = this.state;
            var userId = Q.Users.loggedInUserId();
            var $toolElement = $(this.element);

            var video = tool.stream.getAttribute('video') || {};
            var audio = tool.stream.getAttribute('audio') || {};
            var showAddClip = userId && tool.stream.fields.type !== "Media/clip" && !tool.isLive();
            var showSegmentClips = !tool.isLive();
            var fields = {
                video: video,
                audio: audio,
                videoCurrent: video.url ? "Q_current" : null,
                audioCurrent: !video.url && audio.url ? "Q_current" : null,
                segmentsAreVisible: tool.stream.fields.type == 'Media/clip' && showSegmentClips ? "Q_current" : null,
                publisherId: state.publisherId,
                streamName: state.streamName,
                withQuestions: state.withQuestions,
                showSwitch: !tool.isLive(), //tool.stream.fields.type == 'Media/episode'
                showHosts: tool.isLive(),
                showAddClip: showAddClip,
                text: tool.text,
                description: state.showDescription ? tool.stream.fields.content : null
            };

            Q.Template.render('Media/clip', fields, function (err, html) {
                tool.element.innerHTML = html;
                var $hostsParticipants = $(".Media_clip_hosts_participants", $toolElement);
                var $participants = $(".Media_clip_participants", $toolElement);
                var $switchVisualizationBtn = $(".Media_clip_switch_visualization", $toolElement);
                var $joinMainRoomBtn = $(".Media_clip_join_main_room", $toolElement);
                var $clipsCount = $(".Media_clips_list_count", $toolElement);

                function switchToVoiceChatLayout() {
                    $toolElement.attr("data-visualization", "hosts");
                    $switchVisualizationBtn.html(tool.text.showTwitchLiveStream);
                }
                function switchToTwitchLivestream() {
                    $toolElement.attr("data-visualization", "clip");
                    $switchVisualizationBtn.html(tool.text.showVoiceChat);
                }

                // for live stream activate Media/calls tool instead of call icon
                if (tool.isLive()) {
                    if (userId) {
                        tool.waiting(function () {
                                return !!$(".Streams_chat_tool .Streams_chat_call", $toolElement).length;
                            },
                            function () {
                                tool.initCallCenter();
                            }, 200);
                    }
                }

                var _setHostAvatar = function () {
                    if (Q.typeOf(this) !== "Q.Tool") {
                        return;
                    }

                    var uId = this.state.userId;
                    var $this = $(this.element);
                    var isHostsParticipants = !!$this.closest(".Media_clip_hosts_participants").length;
                    if (tool.isHost(uId)) {
                        $this.addClass("Media_clip_host");
                        //if (!isHostsParticipants) {
                        $this.tool("Q/badge", {
                            tr: {
                                size: isHostsParticipants && !Q.info.isMobile ? "30px" : "20px",
                                icon: "{{Media}}/img/icons/Media/labels/hosts/40.png",
                                className: "Media_badge_host"
                            }
                        }).activate();
                        //}
                    } else if (tool.webrtcParticipants.includes(uId)) {
                        $this.addClass("Media_clip_guest");
                    }

                    // for hosts users add cross icon to allow kick guest from webrtc
                    if (tool.isHost(userId) && !tool.isHost(uId) && isHostsParticipants) {
                        $this.tool("Q/badge", {
                            tr: {
                                size: isHostsParticipants && !Q.info.isMobile ? "30px" : "20px",
                                icon: "{{Q}}/img/close.png",
                                onClick: function () {
                                    Q.confirm(tool.text.AreYouSureKick, function (res) {
                                        if (!res) {
                                            return;
                                        }

                                        Q.req('Media/calls', 'manage', null, {
                                            fields: {
                                                action: "leave", userId: uId
                                            }
                                        });
                                    });
                                }
                            }
                        }).activate();
                    }

                    // onclick avatar open profile
                    $this.on(Q.Pointer.fastclick, function () {
                        var columns = Q.Tool.from($this.closest(".Q_columns_tool"));
                        if (!columns || !uId) {
                            return;
                        }
                        var index = $this.closest('.Q_columns_column').data('index') || 0;
                        if (columns.state.$currentColumn.hasClass('Communities_column_profile')) {
                            columns.pop(null, {animation: {duration: 0}});
                        }
                        var o = {
                            name: 'profile',
                            url: Q.url('profile/' + uId),
                            columnClass: 'Communities_column_profile'
                        };
                        if (index !== null) {
                            columns.open(o, index + 1);
                        } else {
                            columns.push(o);
                        }
                        Q.addStylesheet('{{Communities}}/css/columns/profile.css', { slotName: 'Communities' });
                    });
                };

                if (tool.isLive()) {
                    $hostsParticipants[0] && $hostsParticipants[0].forEachTool("Users/avatar", _setHostAvatar);
                    if (tool.isHost(userId)) {
                        //$switchVisualizationBtn.css('display', 'block');
                    } else {
                        /*$hostsParticipants.tool("Streams/participants", {
                            publisherId: state.publisherId,
                            invite: null,
                            streamName: state.streamName,
                            showBlanks: false,
                            showSummary: false,
                            ordering: tool.hostsUsers,
                            avatar: {icon: Q.info.isMobile ? 50 : 80}
                        }).activate();*/
                    }
                }

                $participants[0] && $participants[0].forEachTool("Users/avatar", _setHostAvatar);
                $participants.tool("Streams/participants", {
                    publisherId: state.publisherId,
                    streamName: state.streamName,
                    ordering: tool.hostsUsers,
                    showBlanks: true
                }).activate();

                // make default visualization for regular user "clip" but for hosts user "hosts"
                $switchVisualizationBtn.on(Q.Pointer.fastclick, function () {
                    var currentVizualisation = $toolElement.attr("data-visualization");
                    if(currentVizualisation === "clip") {
                        switchToVoiceChatLayout();
                    } else {
                        switchToTwitchLivestream();
                    }
                    for(let r in Q.Media.WebRTCRooms) {
                        Q.Media.WebRTCRooms[r].screenRendering.updateLayout();
                    }
                });

                $joinMainRoomBtn.on(Q.Pointer.fastclick, function () {
                   if(state.callsTool) {
                       state.callsTool.initMainRoom();
                   }
                });

                // set valid height for chat tool and make it scrollable
                var pipeToolActivated = new Q.pipe(["tools", "media"], function () {
                    var scrollParent = tool.element.scrollingParent();

                    // decrease chat height to make tool not scrollable
                    tool.element.forEachTool("Streams/chat", function () {
                        var chatTool = this;
                        chatTool.state.openInSameColumn = ["Media/clip"];

                        chatTool.state.onRefresh.add(function () {
                            var $chatMessages = $(".Streams_chat_messages", chatTool.element);
                            if (!$chatMessages.length) {
                                return console.warn("Media/clip: element chatMessages not found");
                            }

                            var description = tool.stream.fields.content;
                            if (description) {
                                var urls = description.matchTypes('url', {requireScheme: true});
                                urls = Array.from(new Set(urls)); // remove dublicates
                                Q.each(urls, function (i, url) {
                                    description = description.split(url).join('<a href="'+url+'" target="_blank">'+url+'</a>');
                                });

                                var className = "Media_episode_description";
                                if (!$("." + className, $chatMessages).length) {
                                    var $description = $("<div class='" + className + "'>").html(description);
                                    $description.insertBefore(tool.$('.Media_clip_participants'));
                                    if ($description[0].isOverflowed()) {
                                        var fontSize = parseInt($description.css('font-size'));
                                        $description.plugin('Q/textfill', {
                                            minFontPixels: fontSize * 3 / 4,
                                            maxFontPixels: fontSize
                                        });
                                    }
                                }
                            }

                            Q.onLayout($chatMessages[0]).set(function () {
                                if (!$.contains(document, $chatMessages[0])) {
                                    return $chatMessages.remove();
                                }
                                var chatHeight = $chatMessages.height();
                                var stopScroll = false;
                                while (scrollParent.isOverflowed()) {
                                    stopScroll = true;
                                    if (chatHeight <= state.minChatHeight) {
                                        break;
                                    }
                                    chatHeight -= 10;
                                    $chatMessages.height(chatHeight);
                                }

                                while (scrollParent.offsetHeight - tool.element.offsetHeight > 20) {
                                    chatHeight += 10;
                                    $chatMessages.height(chatHeight);
                                }
                                if (stopScroll) {
                                    scrollingParent.style.overflow = 'hidden';
                                }
                            }, chatTool);
                        }, tool);
                    }, tool);
                });

                var video = tool.stream.getAttribute("video") || {};
                if (video.url) {
                    $(".Media_video", tool.element).tool("Q/video", Q.extend({
                        url: video.url,
                        clipStart: video.clipStart,
                        clipEnd: video.clipEnd,
                        ads: video.ads || [],
                        image: tool.stream.iconUrl(400),
                        metrics: {
                            publisherId: state.publisherId,
                            streamName: state.streamName
                        },
                        onPlaying: tool.watchClip.bind(tool),
                        onPlay: tool.joinClip.bind(tool)
                    }, state.qVideoOptions)).activate(function () {
						tool.videoTool = this;
                        pipeToolActivated.fill("media")();

                        // set Q/video tool height
                        // var $toolElement = $(this.element);
                        // $toolElement.css("height", Math.min($toolElement.parent().width()/1.78, 300));
                    });
                }
                var audio = tool.stream.getAttribute("audio") || {};
                if (audio.url) {
                    $(".Media_audio", tool.element).tool("Q/audio", Q.extend({
                        url: audio.url,
                        clipStart: audio.clipStart,
                        clipEnd: audio.clipEnd,
                        metrics: {
                            publisherId: state.publisherId,
                            streamName: state.streamName
                        },
                        onPlaying: tool.watchClip.bind(tool),
                        onPlay: tool.joinClip.bind(tool),
                        onLoad: function () {
                            pipeToolActivated.fill("media")();
                        }
                    }, state.qAudioOptions)).activate(function () {
                    	tool.audioTool = this;
                    });
                }

                var $questions = $(".Media_clip_questions", tool.element);
                if ($questions.length) {
                    $questions.tool("Streams/question", {
                        publisherId: state.publisherId,
                        streamName: state.streamName
                    });
                }

                Q.activate(tool.element, function () {
                    if (showAddClip) {
                        var videoPlayerTool = Q.Tool.from($(".Q_video_tool:visible", tool.element)[0], "Q/video");
                        var audioPlayerTool = Q.Tool.from($(".Q_audio_tool:visible", tool.element)[0], "Q/audio");

                        // create clip composer
                        $("button[name=addClip]", tool.element).tool("Streams/preview", {
                            publisherId: userId,
                            closeable: false,
                            editable: false,
                            related: {
                                publisherId: state.publisherId,
                                streamName: state.streamName,
                                type: "Media/clip"
                            },
                            creatable: {
                                title: tool.text.NewClip,
                                clickable: false,
                                streamType: "Media/clip"
                            }
                        }).tool("Media/clip/preview", {
                            category: tool.stream,
                            playerTool: videoPlayerTool || audioPlayerTool
                        }).activate();
                    }

                    pipeToolActivated.fill("tools")();
                });

                tool.$('.Media_tab').click(function () {
                    var $this = $(this);
                    $this.addClass('Q_current').siblings('.Media_tab').removeClass('Q_current');
                    var className = $this.attr('data-clip');
                    tool.$('.'+className).addClass('Q_current').siblings('.Media_player').removeClass('Q_current');
					tool.audioTool && tool.audioTool.pause();
					tool.videoTool && tool.videoTool.pause();
                });

                if(showSegmentClips) {
                    var $segmentsContainers = $(".Media_clips_list_segments, .Media_clips_list_segments_visible", $toolElement);

                    var pubId, strName;

                    if(tool.stream.fields.type === 'Media/episode') {
                        pubId = state.publisherId;
                        strName = state.streamName;
                    } else {
                        var parentStream = JSON.parse(tool.stream.fields.inheritAccess);
                        pubId = Q.getObject([1,0], parentStream) || Q.getObject([0,0], parentStream) || state.publisherId;
                        strName = Q.getObject([1,1], parentStream) || Q.getObject([0,1], parentStream) || state.streamName;
                    }

                    $segmentsContainers.each(function (el) {
                        let toolEl = this;
                        $(toolEl).tool("Streams/related", {
                            publisherId: pubId,
                            streamName: strName,
                            relationType: 'Media/clip',
                            editable: false,
                            closeable: true,
                            realtime: true,
                            sortable: false,
                            relatedOptions: {
                                withParticipant: false,
                                ascending: true
                            }
                        }).activate(function () {
                            this.state.onUpdate.add(function () {
                                $(this.element).attr("data-loading", false);
                            }, tool);


                            var openClipInSameColumn = function (publisherId, streamName) {
                                var clipId = streamName.split('/').pop();
                                var columns = Q.Tool.from($toolElement.closest(".Q_columns_tool"));
                                if (!columns) {
                                    return;
                                }
                                var index = $toolElement.closest('.Q_columns_column').data('index') || 0;

                                if (columns.state.$currentColumn.hasClass('Media_episode_segment_clip')) {
                                    columns.pop(null, {animation: {duration: 0}});
                                }

                                var url = Q.url('clip/' + (publisherId ? publisherId + '/' : '') + clipId);
                                var o = {
                                    name: 'profile',
                                    url: url,
                                    columnClass: 'Media_episode_segment_clip'
                                };
                                if (index !== null) {
                                    columns.open(o, index);
                                } else {
                                    columns.push(o);
                                }
                            }

                            // "view full episode" button
                            $("<div class='Media_clips_list_segments_viewFull'>").prependTo(toolEl).text(tool.text.ViewFullEpisode).on(Q.Pointer.fastclick, function () {
                                openClipInSameColumn(pubId, strName)
                            });

                            var count = 0;
                            $(toolEl)[0].forEachTool('Streams/preview', function () {
                                var clipTool = this;
                                var publisherId = this.state.publisherId;
                                var streamName = this.state.streamName;
                                var clipId = streamName.split('/').pop();

                                $(this.element).on(Q.Pointer.fastclick, function () {
                                    openClipInSameColumn(publisherId, streamName)
                                    /*Q.Media.loadClip(streamName.split('/').pop(), {
                                        publisherId: publisherId,
                                        trigger: clipTool.element
                                    });*/
                                });

                                count++;
                                if($clipsCount) $clipsCount.html(count);

                            });
                        });
                    });


                }
            });
        },
        initCallCenter: function () {
            var tool = this;
            if(!tool.stream) {
                return console.log('tool.stream not found');
            }
            console.log('initCallCenter');
            //if (tool.stream.testWriteLevel("edit")) {
            if (Q.Users.roles['Users/hosts'] != null || Q.Users.roles['Users/screeners'] != null) {

                tool.getMainWebRTCStreams().then(function (stream) {
                    if (stream && stream.fields.publisherId && stream.fields.name) {
                        activateTool(stream.fields.publisherId, stream.fields.name);
                        return;
                    } else {
                        Q.confirm('Do you want create WebRTC room for call center?', function (result) {
                            if (!result) {
                                return;
                            }
                            createWebRTCStream().then(function (stream) {
                                activateTool(stream.fields.publisherId, stream.fields.name);
                            })
    
                        });
                    }
                });
                

                function createWebRTCStream() {
                    return new Promise(function (resolve, reject) {
                        Q.req("Media/webrtc", ["room"], function (err, response1) {
                            var msg = Q.firstErrorMessage(err, response1 && response1.errors);

                            if (msg) {
                                Q.alert(msg);
                                reject(msg)
                                return;
                            }

                            let roomId = (response1.slots.room.roomId).replace('Media/webrtc/', '');
                            Q.Streams.get(response1.slots.room.stream.fields.publisherId, 'Media/webrtc/' + roomId, function (err, stream) {
                                resolve(stream);
                            });
                        }, {
                            method: 'post',
                            fields: {
                                publisherId: Q.Users.communityId,
                                writeLevel: 0,
                                useRelatedTo: false,
                                relate: {
                                    publisherId: tool.stream.fields.publisherId,
                                    streamName: tool.stream.fields.name,
                                    relationType: 'Media/webrtc/main',
                                    inheritAccess: false,
                                }
                            }
                        });
                    });
                }

                function activateTool(publisherId, streamName) {
                    let settingsIcon = document.createElement('DIV');
                    settingsIcon.className = "Media_clips_settings_btn";
                    settingsIcon.innerHTML = _icons.settings;
                    let callButtonToReplace = tool.element.querySelector('.Streams_chat_tool .Streams_chat_call');
                    if (callButtonToReplace) {
                        callButtonToReplace.replaceWith(settingsIcon);
                    }

                    var columnTools = Q.Tool.byName('Q/columns');
                    var columnTool = columnTools[Object.keys(columnTools)[0]];
                    var livestreamElement = document.createElement('DIV');
                    Q.activate(
                        Q.Tool.setUpElement(livestreamElement, 'Media/webrtc/callCenter/manager', {
                            publisherId: publisherId,
                            streamName: streamName,
                            chat: true,
                            chatContainer: columnTool
                        }),
                        {},
                        function () {
                            Q.invoke({
                                title: 'Calls list',
                                trigger: settingsIcon,
                                content: livestreamElement,
                                className: 'Media_clips_calls_list'
                            });
                            
                        }
                    );

                    settingsIcon.addEventListener('click', function () {
                        Q.invoke({
                            title: 'Calls list',
                            trigger: settingsIcon,
                            content: livestreamElement,
                            className: 'Media_clips_calls_list'
                        });
                    });
                }
            } else {
                tool.getMainWebRTCStreams().then(function (stream) {
                    if(!stream) {
                        console.log('no webrtc stream found');

                        return;
                    }
                    let callIcon = document.createElement('DIV');
                    callIcon.className = "Media_clips_call_btn Streams_chat_submit_replacement";
                    callIcon.innerHTML = _icons.call;
                    let callButtonToReplace = tool.element.querySelector('.Streams_chat_tool .Streams_chat_call');
                    if (callButtonToReplace) {
                        callButtonToReplace.replaceWith(callIcon);
                    }

                    Q.activate(
                        Q.Tool.setUpElement('div', 'Media/webrtc/callCenter/client', {
                            publisherId: stream.fields.publisherId,
                            streamName: stream.fields.name,
                            onStatusChange: function (isActive) {
                                console.log('onStatusChange', isActive);
                                if(isActive) {
                                    callIcon.innerHTML = _icons.hungUp;
                                    callIcon.classList.add('Media_clips_end_call_btn');
                                } else {
                                    callIcon.innerHTML = _icons.call;
                                    callIcon.classList.remove('Media_clips_end_call_btn');
                                }
                                
                                callIcon.classList.remove('Q_working');
                            }
                        }),
                        {},
                        function () {
                            var callCenterClient = this;

                            callIcon.addEventListener('click', function () {
                                callIcon.classList.add('Q_working');
                                if(!callCenterClient.state.isActive) {
                                    callCenterClient.requestCall(function () {
                                        callIcon.classList.remove('Q_working');
                                    });
                                } else {
                                    callCenterClient.cancelCallRequest();
                                }
                            });

                            /*callCenterClient.showWaitingLoader = function (title, text) {
                                var chatTool = Q.Tool.from($(".Q_tool.Streams_chat_tool[data-streams-chat*='" + tool.stream.fields.name + "']"), "Streams/chat");
                                console.log('chatTool', chatTool)
                                if (chatTool) {
                                    let dialogContentCon = document.createElement('DIV');
                                    dialogContentCon.className = 'media-callcenter-c-waiting-dialog';
                                    let dialogTextContent = document.createElement('DIV');
                                    dialogContentCon.className = 'media-callcenter-c-waiting-content';
                                    dialogTextContent.innerHTML = text;
                                    dialogContentCon.appendChild(dialogTextContent);
                                    let loader = document.createElement('SPAN');
                                    loader.className = 'media-callcenter-c-loader';
                                    loader.innerHTML = '<svg class="media-callcenter-c-loader-ring" viewBox="25 25 50 50" stroke-width="5"> <circle cx="50" cy="50" r="20" /></svg>';
                                    //dialogContentCon.appendChild(loader);
                                    
                                    let msg = chatTool.prepareMessages({
                                        "time": Date.now(),
                                        "notificationTemplate": dialogContentCon.outerHTML,
                                        "action": "Call created",
                                        "classes": " Streams_chat_to_me",
                                        "publisherId": "FTL",
                                        "streamName": "Media/live/Qqjnqwlap",
                                        "ordinal": 2,
                                        "insertedTime": "2023-06-12 14:28:14",
                                        "sentTime": "2023-06-12 14:28:14",
                                        "byUserId": "FTL",
                                        "byClientId": "",
                                        "type": "Media/webrtc",
                                        "content": dialogContentCon.outerHTML,
                                        "instructions": "",
                                        "weight": 1,
                                        "clientId": "",
                                        "typename": "Q.Streams.Message",
                                        "undefined": true
                                    }, 'join');
                                    chatTool.renderNotification(Q.first(msg), function (){});
                                }
                            }*/
                            
                        }
                    ); 
                });
            }
        },
        getCookie: function(name) {
            var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
            if (match) return match[2];
        },
        getMainWebRTCStreams: function () {
            var tool = this;
            return new Promise(function (resolve, reject) {
                tool.stream.relatedTo(Q.Media.clip.webrtc.relations.main, function(){
                    var keys = Object.keys(this.relatedStreams);
                    var stream = this.relatedStreams[keys[0]];
                    resolve(stream);
                })
            })
        },
        /**
         * Set user as guest of webrtc
         * @method setGuest
         */
        setGuest: function (userId) {

        },
        /**
         * Detect whether logged user is host
         * @method isHost
         */
        isHost: function (userId) {
            return this.hostsUsers.includes(userId);
        },
        /**
         * Detect whether live show
         * @method isLive
         */
        isLive: function () {
            return this.state.streamName.includes("Media/live/");
        },
        /**
         * Send request to server with info about user watch clip
         * @method watchClip
         */
        watchClip: function (watchingTool) {
            var tool = this;
            var state = this.state;

            if (isNaN(parseInt(tool.watchingTime))) {
                tool.watchingTime = 0;
            }

            tool.watchingTime += watchingTool.state.positionUpdatePeriod;

            if (tool.watchingTime < state.earnPeriod || !(!state.facesUse || state.face) || Q.isDocumentHidden()) {
                return;
            }

            tool.watchingTime = 0;

            Q.req("Media/clip", "watch", function (err, response) {
                var msg = Q.firstErrorMessage(err, response && response.errors);
                if (msg) {
                    return console.warn(msg);
                }

                // this need to avoid situation when server lags and time shifted
                tool.watchingTime = 0;

                var $clipCredits = $(".Media_clip_credits span", tool.element);
                $clipCredits.text(parseInt($clipCredits.text()) + state.credits);
                //$clipCredits.parent().show();
            }, {
                fields: {
                    publisherId: state.publisherId,
                    streamName: state.streamName
                }
            });
        },
        joinClip: function () {
            let tool = this;
            Streams.get.force(tool.state.publisherId, tool.state.streamName, function (err) {
                if (err) {
                    return;
                }

                if (Q.Users.loggedInUserId()) {
                    this.join();
                }

            });
        },
        waiting: function (condition, callback, period=500, timeOut=50000) {
            if (Q.handle(condition)) {
                return Q.handle(callback);
            }

            var timeOutCounter = 0;
            var timerId = setInterval(function () {
                if (Q.handle(condition)) {
                    Q.handle(callback);
                    clearInterval(timerId);
                    return;
                }

                timeOutCounter += period;
                if (timeOutCounter >= timeOut) {
                    console.warn("waiting: could not wait after " + timeOut + " milliseconds");
                    clearInterval(timerId);
                }
            }, period);
        },
        Q: {
            beforeRemove: function () {
                this.faces && this.faces.stop();
            }
        }
    });

    Q.Template.set('Media/clip',
        '{{#if showHosts}}'
        + '<div class="Media_clip_hosts">'
        + '		<div class="Media_clip_hosts_participants"></div>'
        + '		<button class="Media_clip_switch_visualization Q_button">{{text.switchVisualization}}</button>'
        + '		<button class="Media_clip_join_main_room Q_button">{{text.joinLiveShow}}</button>'
        + '</div>'
        + '{{/if}}'
        + '<div class="Media_clip_player"><div class="Media_clip_player_inner">'
        + '		<div class="Media_clip_credits">{{text.CreditsEarned}}: <span>0</span></div>'
        + '{{#if video.url}}'
        + '		<div class="{{videoCurrent}} Media_video Media_player"></div>'
        + '{{/if}}'
        + '{{#if audio.url}}'
        + '		<div class="{{audioCurrent}} Media_audio Media_player"></div>'
        + '{{/if}}'
        + '<div class="Media_clips_list Media_player">'
        + '<div class="Media_clips_list_segments"></div>'
        + '{{#if showAddClip}}'
        + '<button class="Q_button" name="addClip">{{text.NewClip}}</button>'
        + '{{/if}}'
        + '</div></div>'
        + '{{#if showSwitch}}'
        + '		<div class="Media_tabs">'
        + '     {{#if video.url}}'
        + '		    <div class="Media_tab {{videoCurrent}}" data-clip="Media_video">{{Video}}</div>'
        + '     {{/if}}'
        + '     {{#if audio.url}}'
        + '		    <div class="Media_tab {{audioCurrent}}" data-clip="Media_audio">{{Audio}}</div>'
        + '     {{/if}}'
        + '     {{#if video.url}}'
        + '		    <div class="Media_tab" data-clip="Media_clips_list"><span class="Media_clips_list_count"></span> {{Clips}}</div>'
        + '     {{/if}}'
        + '		</div>'
        + '{{/if}}'
        + '</div>'
        + '<div class="Media_clip_participants"></div>'
        + '{{#if withQuestions}}'
        + '		<div class="Media_clip_questions"></div>'
        + '{{/if}}'
        + '{{{tool "Streams/chat" "" publisherId=publisherId streamName=streamName}}}',
        {
            text: ['Media/content']
        }
    );
})(Q, Q.jQuery);