Q.page("Media/meeting", function () {
    var url = new URL(location.href);
    var roomId = url.searchParams.get("room");
    var inviteToken = url.searchParams.get("Q.Streams.token");
    var invitingUserId = url.searchParams.get("invitingUserId");
    var publisherId = url.searchParams.get("publisherId");

    if(roomId == null) {
        roomId = 'meeting4';
    }

    //var publisherId = Q.Users.communityId;

    function stopConference () {
        WebConference.stop();
    }

	function startConference() {
        var WebConference = Q.Media.WebRTC({
            element: document.body,
            roomId:roomId,
            roomPublisherId:publisherId,
            inviteToken:inviteToken,
            invitingUserId:invitingUserId,
            resumeClosed: true,
            defaultDesktopViewMode: 'maximized',
            defaultMobileViewMode: 'audio',
            mode: 'node',
            startWith: {video: false, audio: true},
            audioOnlyMode: false,
            onWebRTCRoomCreated: function() {

            },
            onWebrtcControlsCreated: function() {

            },
            beforeSwitch: function () {
                return new Promise((resolve, reject) => {
                    resolve();
                })
            },
            beforeScreenRender: [
                function (screen) {},
                function (screen) {}
            ]
        });

		WebConference.start();
    }

    if (!Q.Users.loggedInUser) {
        var currentUrl = window.location.href;
        if(inviteToken == null) {
            Q.Users.login({
                successUrl: currentUrl
            });
        }
		
		Q.Users.onComplete.setOnce(function () {
			Q.handle(currentUrl);
        });
    } else {
        startConference();
    }

    if(url.searchParams.get("dev")) {
        /* let settingsContainer = document.createElement('DIV');
        settingsContainer.style.position = 'fixed';
        settingsContainer.style.top = '100px';
        settingsContainer.style.left = '50px';
        settingsContainer.style.width = '500px';
        settingsContainer.style.height = '300px';
        settingsContainer.style.zIndex = '999999999';
        settingsContainer.style.background = 'white';
        document.body.appendChild(settingsContainer); */

        /* Q.activate(
            Q.Tool.setUpElement(
                settingsContainer,
                "Media/webrtc/recordings",
                {
                    publisherId: Q.Users.loggedInUserId(),
                    streamName: 'Media/webrtc/' + roomId,
                }
            ),
            {},
            function () {
                //tool.recordingsTool = this;
            }
        ); */
        


        setTimeout(function () {
            Q.Dialogs.push({
                title: 'Teleconference scheduler',
                className: '',
                content: Q.Tool.setUpElement('div', 'Media/webrtc/scheduler', Q.extend({}, {}, {
                    publisherId: Q.Users.loggedInUserId(),
                    streamName: 'Media/webrtc/' + roomId
                    //streamName: 'Media/webrtc/Qizbzcxoe'
                })),
                onActivate: function () {
    
                }
            });
        }, 2000);
        
        /* Q.activate(
            Q.Tool.setUpElement('DIV', 'Media/webrtc/settings', {
                publisherId: Q.Users.loggedInUserId(),
                streamName: 'Media/webrtc/' + roomId,
            }),
            {},
            function () {
                let tool = this;
                if(!tool.settingsUI) {
                    tool.state.onLoad.addOnce(function () {
                        settingsContainer.appendChild(tool.settingsUI);
                    });
                } else {
                    settingsContainer.appendChild(tool.settingsUI);
                }
            }
        ); */
    }

    return function () {
        // code to execute before page starts unloading
    };
}, 'Media');