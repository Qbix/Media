Q.page("Media/meeting", function () {
    //return;
    console.log('Media/meeting')

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
        console.log('startConference START')
        try {
            var err = (new Error);
            console.log(err.stack);
        } catch (e) {

        }
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
                console.log('onWebRTCRoomCreated', this);
            },
            onWebrtcControlsCreated: function() {
                console.log('onWebrtcControlsCreated', this);
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
		Q.Users.login({
            successUrl: currentUrl
		});
		Q.Users.onComplete.setOnce(function () {
            console.log('onComplete')
			Q.handle(currentUrl);
        });
    } else {
        startConference();
    }

    if(url.searchParams.get("dev")) {
        let settingsContainer = document.createElement('DIV');
        settingsContainer.style.position = 'fixed';
        settingsContainer.style.top = '100px';
        settingsContainer.style.left = '50px';
        settingsContainer.style.width = '500px';
        settingsContainer.style.height = '300px';
        settingsContainer.style.zIndex = '999999999';
        settingsContainer.style.background = 'white';
        document.body.appendChild(settingsContainer);

        Q.activate(
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
        );
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