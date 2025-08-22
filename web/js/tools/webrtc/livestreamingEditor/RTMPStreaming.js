Q.Media.WebRTC.livestreaming.RTMPStreaming = function (tool) {
    var _streamingToCustomRtmpSection = null;
    var _mainContainer = null;
    var _activeView = null;
    var _addDestinationMenuEl = null;
    var _addDestinationMenuPopup = null;
    var _destinationsListEl = null;
    var _destinations = [];
    var GOOGLE_SCOPES = 'https://www.googleapis.com/auth/youtube.force-ssl';


    window.addEventListener('storage', function () {
        synchronizeDbWithLocalStorage()
            .then(function () {
                return getDestinationsFromDb();
            })
            .then(function () {
                updateDestinationsList();
            });;
    });
   
    //const FACEBOOK_APP_SECRET = 'bfe8cd74ad8ba7c87176ed37dcc227e9';
    function connectGoogleAccount() {
        
        return new Promise(function (resolve, reject) {
            if(!tool.state.googleClientId) {
                reject(`Google API credentials not found. Please set client id in app.json -> Users -> apps => google -> ${Q.Users.communityName} -> clientId. Google APP should have Youtube Data API enabled.`);
                return;
            }
            let newWindow;
            // Google's OAuth 2.0 endpoint for requesting an access token
            var oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';

            // Create <form> element to submit parameters to OAuth 2.0 endpoint.
            var form = document.createElement('form');
            form.setAttribute('method', 'GET'); // Send as a GET request.
            form.setAttribute('action', oauth2Endpoint);

            // Parameters to pass to OAuth 2.0 endpoint.

            var params = {
                'client_id': tool.state.googleClientId,
                'redirect_uri': 'https://' + location.host + '/livestreamAuth',
                'response_type': 'code',
                'access_type': 'offline',
                'prompt': 'consent',
                'scope': GOOGLE_SCOPES,
                'include_granted_scopes': 'true',
                'state': 'pass-through value'
            };

            // Add form parameters as hidden input values.
            for (var p in params) {
                var input = document.createElement('input');
                input.setAttribute('type', 'hidden');
                input.setAttribute('name', p);
                input.setAttribute('value', params[p]);
                form.appendChild(input);
            }
            let storageEventFired = false;
            function handleLocalStorageChange(event) {
                if (event.key === 'q_google_webrtc_access_tokens') {
                    storageEventFired = true;
                    window.removeEventListener('storage', handleLocalStorageChange);
                    resolve();
                }
            }

            window.addEventListener('storage', handleLocalStorageChange);

            function checkWindowOpened() {
                if (!storageEventFired && newWindow.closed) {
                    reject('Authorization failed.');
                } else if (!storageEventFired && !newWindow.closed) {
                    setTimeout(checkWindowOpened, 500);
                }
            }

            // Add form to page and submit it to open the OAuth 2.0 endpoint.
            // Open a new window with custom content
            newWindow = window.open("", "_blank", "width=600,height=600");
            // document.body.appendChild(form);
            newWindow.document.body.appendChild(form);
            form.submit();

            checkWindowOpened();
        });
    }

    function connectFacebookAccount() {
        return new Promise(function (resolve, reject) {
            if(!tool.state.facebookAppId) {
                reject(`Facebook API credentials not found. Please set client id in app.json -> Users -> apps => facebook -> ${Q.Users.communityName} -> appId.`);
                return;
            }
            // Google's OAuth 2.0 endpoint for requesting an access token
            let loginWindow;
            const redirectUri = 'https://' + location.host + '/livestreamAuth';
            const scope = 'public_profile,email,publish_video,pages_manage_posts';
            const state = 'some_random_string'; // optional, for security

            const url = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${tool.state.facebookAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`;
            let storageEventFired = false;
            function handleLocalStorageChange(event) {
                if (event.key === 'q_google_webrtc_access_tokens') {
                    storageEventFired = true;
                    window.removeEventListener('storage', handleLocalStorageChange);
                    resolve();
                }
            }

            window.addEventListener('storage', handleLocalStorageChange);

            loginWindow = window.open(url, 'Facebook Login', 'width=620,height=960');

            function checkWindowOpened() {
                if (!storageEventFired && loginWindow.closed) {
                    reject('Authorization failed.');
                } else if (!storageEventFired && !loginWindow.closed) {
                    setTimeout(checkWindowOpened, 500);
                }
            }

            checkWindowOpened();
        });
    }

    function saveOrUpdateChannelInDB(destinationObject, remove) {
        return new Promise(function (resolve, reject) {
            Q.req("Media/livestream", ["createOrUpdateChannel"], function (err, response) {
                var msg = Q.firstErrorMessage(err, response && response.errors);

                if (msg) {
                    console.error(msg);
                    return reject(msg);
                }

                let destinationStream = response.slots.createOrUpdateChannel.destinationStream;

                resolve(destinationStream);

            }, {
                method: 'post',
                fields: {
                    liveStreamPublisherId: tool.livestreamStream.fields.publisherId,
                    liveStreamName: tool.livestreamStream.fields.name,
                    destinationObject: JSON.stringify(destinationObject),
                    remove: remove
                }
            });
        });
    }

    function synchronizeDbWithLocalStorage() {
        return new Promise(function (resolve, reject) {
            let storageItems;
            let existingTokens = localStorage.getItem('q_google_webrtc_access_tokens');

            if (existingTokens) {
                storageItems = JSON.parse(existingTokens);
            } else {
                storageItems = [];
            }

            let promises = [];
            for (let i = storageItems.length - 1; i >= 0; i--) {
                let storageItem = storageItems[i];
                if (storageItem.synced) {
                    continue;
                } else {
                    let liveDestItem;
                    if (storageItem.type == 'youtube') {
                        for (let d in _destinations) {
                            let destItem = _destinations[d];
                            if (destItem.channelInfo.channelId == storageItem.channelId) {
                                liveDestItem = destItem;
                                break;
                            }
                        }

                        if (liveDestItem) {
                            liveDestItem.channelInfo.channelTitle = storageItem.channelTitle;
                            liveDestItem.channelInfo.channelDesc = storageItem.channelDesc;
                            liveDestItem.channelInfo.accessToken = storageItem.accessToken;
                            liveDestItem.channelInfo.accessTokenExpiresIn = storageItem.accessTokenExpiresIn;
                        }
                    } else if (storageItem.type == 'facebook') {
                        for (let d in _destinations) {
                            let destItem = _destinations[d];
                            if (destItem.channelInfo.profileId == storageItem.profileId) {
                                liveDestItem = destItem;
                                break;
                            }
                        }

                        if (liveDestItem) {
                            liveDestItem.channelInfo.accessToken = storageItem.accessToken;
                            liveDestItem.channelInfo.accessTokenExpiresIn = storageItem.accessTokenExpiresIn;
                        }
                    }

                    let promise = saveOrUpdateChannelInDB(liveDestItem ? liveDestItem.channelInfo : storageItem);
                    promise.then(function () {
                        storageItems.splice(i, 1);
                    });
                    promises.push(promise);
                }
            }

            Promise.all(promises).then(function () {
                localStorage.setItem('q_google_webrtc_access_tokens', JSON.stringify(storageItems));
                resolve();
            })
        });
    }

    function onCustomRTMP(destinationItem) {
        var container = document.createElement('DIV');
        container.className = 'view-slider-view live-editor-stream-to-edit-dest';

        var viewControls = document.createElement('DIV');
        viewControls.className = 'view-slider-view-ctl';
        container.appendChild(viewControls);

        var back = document.createElement('DIV');
        back.className = 'view-slider-view-back';
        back.innerHTML = tool.icons.back;
        viewControls.appendChild(back);
        back.addEventListener('click', function () {
            slideViewRight(_streamingToCustomRtmpSection);
        })

        var title = document.createElement('DIV');
        title.className = 'view-slider-view-title';
        title.innerHTML = 'Add custom RTMP';
        viewControls.appendChild(title);

        var viewContent = document.createElement('DIV');
        viewContent.className = 'view-slider-view-content';
        container.appendChild(viewContent);

        var rtmpLiveItem = document.createElement('DIV');
        rtmpLiveItem.className = 'live-editor-stream-rtmp-rtmp-item';
        viewContent.appendChild(rtmpLiveItem);

        var rtmpLiveURL = document.createElement('LABEL');
        rtmpLiveURL.className = 'live-editor-stream-rtmp-rtmp-url';
        rtmpLiveItem.appendChild(rtmpLiveURL);

        var rtmpLiveCaption = document.createElement('SPAN');
        rtmpLiveCaption.className = 'live-editor-stream-rtmp-rtmp-cap';
        rtmpLiveCaption.innerHTML = 'Paste RTMP URL here';
        rtmpLiveURL.appendChild(rtmpLiveCaption);

        var rtmpLiveURLInput = document.createElement('INPUT');
        rtmpLiveURLInput.className = 'live-editor-stream-rtmp-rtmp-url-inp';
        rtmpLiveURLInput.type = 'text';
        rtmpLiveURLInput.placeholder = 'Paste RTMP URL here';
        rtmpLiveURLInput.autocomplete = 'off';
        rtmpLiveURLInput.name = 'rtmpUrl';
        if(destinationItem) rtmpLiveURLInput.value = destinationItem.channelInfo.rtmpUrl;
        rtmpLiveURL.appendChild(rtmpLiveURLInput);

        var rtmpLiveStreamKey = document.createElement('LABEL');
        rtmpLiveStreamKey.className = 'live-editor-stream-rtmp-key';
        rtmpLiveItem.appendChild(rtmpLiveStreamKey);

        var fakeInput = document.createElement('INPUT');
        fakeInput.style.height = '1px';
        fakeInput.style.width = '1px';
        fakeInput.style.padding = '0';
        fakeInput.style.border = '0';
        fakeInput.style.position = 'absolute';
        fakeInput.style.left = '0';
        fakeInput.style.top = '-99999px';
        fakeInput.tabindex = '-1';
        fakeInput.type = 'password';
        fakeInput.autocomplete = 'off';
        fakeInput.name = 'fakeInput';
        rtmpLiveStreamKey.appendChild(fakeInput);

        var rtmpLiveKeyCaption = document.createElement('SPAN');
        rtmpLiveKeyCaption.className = 'live-editor-stream-rtmp-rtmp-cap';
        rtmpLiveKeyCaption.innerHTML = 'Stream key';
        rtmpLiveStreamKey.appendChild(rtmpLiveKeyCaption);

        var rtmpLiveStreamKeyInput = document.createElement('INPUT');
        rtmpLiveStreamKeyInput.className = 'live-editor-stream-rtmp-inp';
        rtmpLiveStreamKeyInput.type = 'password';
        rtmpLiveStreamKeyInput.placeholder = 'Stream Key';
        rtmpLiveStreamKeyInput.name = 'streamKey';
        rtmpLiveStreamKeyInput.autocomplete = 'off';
        if(destinationItem) rtmpLiveStreamKeyInput.value = destinationItem.channelInfo.rtmpStreamKey;
        rtmpLiveStreamKey.appendChild(rtmpLiveStreamKeyInput);

        var linkToLiveCon = document.createElement('LABEL');
        linkToLiveCon.className = 'live-editor-stream-rtmp-live-link';
        linkToLiveCon.style.display = 'none';
        rtmpLiveItem.appendChild(linkToLiveCon);

        var rtmpLiveLinkCaption = document.createElement('SPAN');
        rtmpLiveLinkCaption.className = 'live-editor-stream-rtmp-rtmp-cap';
        rtmpLiveLinkCaption.innerHTML = 'Link to livestream (optional)';
        linkToLiveCon.appendChild(rtmpLiveLinkCaption);

        var linkToLiveInput = document.createElement('INPUT');
        linkToLiveInput.className = 'live-editor-stream-rtmp-live-link-inp';
        linkToLiveInput.type = 'text';
        linkToLiveInput.name = 'linkToLive';
        linkToLiveInput.placeholder = 'Link to livestream';
        linkToLiveInput.autocomplete = 'off';
        linkToLiveCon.appendChild(linkToLiveInput);

        var saveButtonCon = document.createElement('DIV');
        saveButtonCon.className = 'live-editor-stream-to-edit-buttons';
        viewContent.appendChild(saveButtonCon);
        
        var removeDest = document.createElement('DIV');
        removeDest.className = 'live-editor-stream-to-edit-remove';
        removeDest.innerHTML = 'Remove destination';
        saveButtonCon.appendChild(removeDest);

        removeDest.addEventListener('click', function () {
            saveOrUpdateChannelInDB(destinationItem.channelInfo, true)
                .then(function () {
                    return getDestinationsFromDb();
                }).then(function () {
                    slideViewRight(_streamingToCustomRtmpSection);
                    updateDestinationsList();
                });

        })

        var saveBtn = document.createElement('BUTTON');
        saveBtn.className = 'Q_button';
        saveBtn.innerHTML = 'Save';
        saveButtonCon.appendChild(saveBtn);


        saveBtn.addEventListener('click', function () {
            if(rtmpLiveURLInput.value.trim() == '') {
                Q.alert('Please enter RTMP URL of destination.');
                return;
            }
            viewContent.classList.add('Q_working');
            if(destinationItem) {
                destinationItem.channelInfo.rtmpUrl = rtmpLiveURLInput.value;
                destinationItem.channelInfo.rtmpStreamKey = rtmpLiveStreamKeyInput.value;
                
                saveOrUpdateChannelInDB(destinationItem.channelInfo)
                    .then(function () {
                        viewContent.classList.remove('Q_working');
                        return getDestinationsFromDb();
                    }).then(function () {
                        slideViewRight(_streamingToCustomRtmpSection);
                        updateDestinationsList();
                    });
            } else {
               
                let dataToSave = {
                    destId: Date.now().toString(10) + Math.random().toString(10).replace(/\./g, ""),
                    type: 'customRtmp',
                    rtmpUrl: rtmpLiveURLInput.value,
                    rtmpStreamKey: rtmpLiveStreamKeyInput.value,
                    updatedAt: Date.now(),
                    createdAt: Date.now()
                }
                saveOrUpdateChannelInDB(dataToSave)
                .then(function () {
                    viewContent.classList.remove('Q_working');
                    return getDestinationsFromDb();
                }).then(function () {
                    slideViewRight(_streamingToCustomRtmpSection);
                    updateDestinationsList();
                });
            }
           

        });

        slideViewLeft(container);
    }

    function slideViewLeft(element) {
        if (_activeView == element) return;

        var elementToShow = element;
        var elementToHide = _activeView;
        _mainContainer.appendChild(elementToShow);

        elementToShow.classList.add('view-slider-hidden-on-right');

        var mainRect = _mainContainer.getBoundingClientRect();

        _mainContainer.style.width = mainRect.width + 'px';
        _mainContainer.style.height = mainRect.height + 'px';
        _mainContainer.classList.add('view-slider-transition');

        elementToShow.addEventListener("transitionend", onSlideTransitionEnd);
        _mainContainer.addEventListener("transitionend", onParentSizeTransitionEnd)

        elementToShow.classList.add('view-slider-sliding');

        setTimeout(function () {
            elementToShow.classList.remove('view-slider-hidden-on-right');
            elementToHide.classList.add('view-slider-hidden-on-left');
            _mainContainer.style.width = element.scrollWidth + 'px';
            _mainContainer.style.height = element.scrollHeight + 'px';
        }, 0)

        function onSlideTransitionEnd(e) {
            if (e.target != elementToShow) return;

            elementToHide.classList.remove('view-slider-hidden-on-left');
            elementToShow.classList.remove('view-slider-sliding');

            elementToHide.remove();

            _activeView = elementToShow;

            elementToShow.removeEventListener('transitionend', onSlideTransitionEnd);
        }

        function onParentSizeTransitionEnd(e) {
            if (e.target != _mainContainer) return;
            _mainContainer.classList.remove('view-slider-transition');
            _mainContainer.style.width = 'auto';
            _mainContainer.style.height = 'auto';

            _mainContainer.removeEventListener('transitionend', onParentSizeTransitionEnd);

        }
    }

    function slideViewRight(element) {
        if (_activeView == element) return;

        var elementToShow = element;
        var elementToHide = _activeView;
        _mainContainer.appendChild(elementToShow);

        elementToShow.classList.add('view-slider-hidden-on-left');

        var mainRect = _mainContainer.getBoundingClientRect();

        _mainContainer.style.width = mainRect.width + 'px';
        _mainContainer.style.height = mainRect.height + 'px';
        _mainContainer.classList.add('view-slider-transition');

        elementToShow.addEventListener("transitionend", onSlideTransitionEnd);
        _mainContainer.addEventListener("transitionend", onParentSizeTransitionEnd)

        elementToShow.classList.add('view-slider-sliding');

        setTimeout(function () {
            elementToShow.classList.remove('view-slider-hidden-on-left');
            elementToHide.classList.add('view-slider-hidden-on-right');
            _mainContainer.style.width = element.scrollWidth + 'px';
            _mainContainer.style.height = element.scrollHeight + 'px';
        }, 0)

        function onSlideTransitionEnd(e) {
            if (e.target != elementToShow) return;

            elementToHide.classList.remove('view-slider-hidden-on-right');
            elementToShow.classList.remove('view-slider-sliding');

            elementToHide.remove();

            _activeView = elementToShow;

            elementToShow.removeEventListener('transitionend', onSlideTransitionEnd);
        }

        function onParentSizeTransitionEnd(e) {
            if (e.target != _mainContainer) return;
            _mainContainer.classList.remove('view-slider-transition');
            _mainContainer.style.width = 'auto';
            _mainContainer.style.height = 'auto';
            _mainContainer.removeEventListener('transitionend', onParentSizeTransitionEnd);
        }
    }

    function onDestinationEdit(destinationObject) {

        if (destinationObject.type == 'youtube') {
            onYoutubeDestinationEdit();
        } else if (destinationObject.type == 'facebook') {
            onFbDestinationEdit();
        } else if (destinationObject.type == 'customRtmp') {
            onCustomRTMP(destinationObject);
        }

        function onYoutubeDestinationEdit() {
            let container = document.createElement('DIV');
            container.className = 'view-slider-view live-editor-stream-to-edit-dest';

            var viewControls = document.createElement('DIV');
            viewControls.className = 'view-slider-view-ctl';
            container.appendChild(viewControls);

            var back = document.createElement('DIV');
            back.className = 'view-slider-view-back';
            back.innerHTML = tool.icons.back;
            viewControls.appendChild(back);
            back.addEventListener('click', function () {
                slideViewRight(_streamingToCustomRtmpSection);
            })

            var title = document.createElement('DIV');
            title.className = 'view-slider-view-title';
            title.innerHTML = 'Stream Settings';
            viewControls.appendChild(title);

            var viewContent = document.createElement('DIV');
            viewContent.className = 'view-slider-view-content';
            container.appendChild(viewContent);

            var streamTilteLabel = document.createElement('LABEL');
            streamTilteLabel.className = 'live-editor-stream-to-edit-param';
            viewContent.appendChild(streamTilteLabel);

            var streamTilteCaption = document.createElement('DIV');
            streamTilteCaption.className = 'live-editor-stream-to-edit-param-title';
            streamTilteCaption.innerHTML = 'Title';
            streamTilteLabel.appendChild(streamTilteCaption);

            var streamTitleInput = document.createElement('INPUT');
            streamTitleInput.type = 'text';
            streamTitleInput.placeholder = 'Title of Live Stream';
            streamTitleInput.autocomplete = 'off';
            streamTitleInput.name = 'streamTitle';
            streamTitleInput.value = destinationObject.channelInfo.streamTitle ? destinationObject.channelInfo.streamTitle : 'Streaming with Qbix';
            streamTilteLabel.appendChild(streamTitleInput);

            var streamDescCon = document.createElement('DIV');
            streamDescCon.className = 'live-editor-stream-to-edit-param';
            viewContent.appendChild(streamDescCon);

            var streamDescCaption = document.createElement('DIV');
            streamDescCaption.className = 'live-editor-stream-to-edit-param-title';
            streamDescCaption.innerHTML = 'Description';
            streamDescCon.appendChild(streamDescCaption);

            var streamDescArea = document.createElement('TEXTAREA');
            streamDescArea.placeholder = 'Description of Live Stream';
            streamDescArea.value = destinationObject.channelInfo.streamDesc ? destinationObject.channelInfo.streamDesc : '';
            streamDescCon.appendChild(streamDescArea);

            var privacyLabel = document.createElement('LABEL');
            privacyLabel.className = 'live-editor-stream-to-edit-param';
            viewContent.appendChild(privacyLabel);

            var privacyLabelCaption = document.createElement('DIV');
            privacyLabelCaption.className = 'live-editor-stream-to-edit-param-title';
            privacyLabelCaption.innerHTML = 'Privacy';
            privacyLabel.appendChild(privacyLabelCaption);

            var privacySelect = _privacySelect = document.createElement('SELECT');
            privacyLabel.appendChild(privacySelect);

            var privacyBlock = document.createElement('OPTGROUP');
            privacyBlock.label = Q.getObject("webrtc.settingsPopup.publishOnTimeline", tool.text);
            privacySelect.appendChild(privacyBlock);

            var option1 = document.createElement('OPTION');
            option1.name = 'privacy';
            option1.value = 'public';
            option1.innerHTML = 'Public';
            option1.selected = true;
            privacyBlock.appendChild(option1);
            if (destinationObject.channelInfo.streamPrivacy == 'public') option1.selected = true;
            var option2 = document.createElement('OPTION');
            option2.innerHTML = 'Unlisted';
            option2.name = 'privacy';
            option2.value = 'unlisted';
            if (destinationObject.channelInfo.streamPrivacy == 'unlisted') option2.selected = true;
            privacyBlock.appendChild(option2);
            var option3 = document.createElement('OPTION');
            option3.innerHTML = 'Private';
            option3.name = 'privacy';
            option3.value = 'private';
            if (destinationObject.channelInfo.streamPrivacy == 'private') option3.selected = true;
            privacyBlock.appendChild(option3);

            var saveButtonCon = document.createElement('DIV');
            saveButtonCon.className = 'live-editor-stream-to-edit-buttons';
            viewContent.appendChild(saveButtonCon);

            var removeDest = document.createElement('DIV');
            removeDest.className = 'live-editor-stream-to-edit-remove';
            removeDest.innerHTML = 'Remove destination';
            saveButtonCon.appendChild(removeDest);

            removeDest.addEventListener('click', function () {
                saveOrUpdateChannelInDB(destinationObject.channelInfo, true)
                    .then(function () {
                        return getDestinationsFromDb();
                    }).then(function () {
                        slideViewRight(_streamingToCustomRtmpSection);
                        updateDestinationsList();
                    });

            })

            var saveButton = document.createElement('BUTTON');
            saveButton.className = 'Q_button';
            saveButton.innerHTML = 'Save';
            saveButtonCon.appendChild(saveButton);

            saveButton.addEventListener('click', function () {
                destinationObject.channelInfo.streamDesc = streamDescArea.value;
                destinationObject.channelInfo.streamTitle = streamTitleInput.value;
                destinationObject.channelInfo.privacyStatus = privacySelect.value;
                saveOrUpdateChannelInDB(destinationObject.channelInfo)
                    .then(function () {
                        return getDestinationsFromDb();
                    }).then(function () {
                        slideViewRight(_streamingToCustomRtmpSection);
                        updateDestinationsList();
                    });
            });

            slideViewLeft(container);
        }

        function onFbDestinationEdit() {
            let container = document.createElement('DIV');
            container.className = 'view-slider-view live-editor-stream-to-edit-dest';

            var viewControls = document.createElement('DIV');
            viewControls.className = 'view-slider-view-ctl';
            container.appendChild(viewControls);

            var back = document.createElement('DIV');
            back.className = 'view-slider-view-back';
            back.innerHTML = tool.icons.back;
            viewControls.appendChild(back);
            back.addEventListener('click', function () {
                slideViewRight(_streamingToCustomRtmpSection);
            })

            var title = document.createElement('DIV');
            title.className = 'view-slider-view-title';
            title.innerHTML = 'Stream Settings';
            viewControls.appendChild(title);

            var viewContent = document.createElement('DIV');
            viewContent.className = 'view-slider-view-content';
            container.appendChild(viewContent);

            var streamTilteLabel = document.createElement('LABEL');
            streamTilteLabel.className = 'live-editor-stream-to-edit-param';
            viewContent.appendChild(streamTilteLabel);

            var streamTilteCaption = document.createElement('DIV');
            streamTilteCaption.className = 'live-editor-stream-to-edit-param-title';
            streamTilteCaption.innerHTML = 'Title';
            streamTilteLabel.appendChild(streamTilteCaption);

            var streamTitleInput = document.createElement('INPUT');
            streamTitleInput.type = 'text';
            streamTitleInput.placeholder = 'Title of Live Stream';
            streamTitleInput.autocomplete = 'off';
            streamTitleInput.name = 'streamTitle';
            streamTitleInput.value = destinationObject.channelInfo.streamTitle ? destinationObject.channelInfo.streamTitle : 'Streaming with Qbix';
            streamTilteLabel.appendChild(streamTitleInput);

            var streamDescCon = document.createElement('DIV');
            streamDescCon.className = 'live-editor-stream-to-edit-param';
            viewContent.appendChild(streamDescCon);

            var streamDescCaption = document.createElement('DIV');
            streamDescCaption.className = 'live-editor-stream-to-edit-param-title';
            streamDescCaption.innerHTML = 'Description';
            streamDescCon.appendChild(streamDescCaption);

            var streamDescArea = document.createElement('TEXTAREA');
            streamDescArea.placeholder = 'Description of Live Stream';
            streamDescArea.value = destinationObject.channelInfo.streamDesc ? destinationObject.channelInfo.streamDesc : '';
            streamDescCon.appendChild(streamDescArea);

            var privacyLabel = document.createElement('LABEL');
            privacyLabel.className = 'live-editor-stream-to-edit-param';
            viewContent.appendChild(privacyLabel);

            var privacyLabelCaption = document.createElement('DIV');
            privacyLabelCaption.className = 'live-editor-stream-to-edit-param-title';
            privacyLabelCaption.innerHTML = 'Privacy';
            privacyLabel.appendChild(privacyLabelCaption);

            var privacySelect = _privacySelect = document.createElement('SELECT');
            privacyLabel.appendChild(privacySelect);

            var privacyBlock = document.createElement('OPTGROUP');
            privacyBlock.label = Q.getObject("webrtc.settingsPopup.publishOnTimeline", tool.text);
            privacySelect.appendChild(privacyBlock);

            var option1 = document.createElement('OPTION');
            option1.name = 'privacy';
            option1.value = 'EVERYONE';
            option1.innerHTML = Q.getObject("webrtc.settingsPopup.fbPublicAccess", tool.text);
            option1.selected = true;
            privacyBlock.appendChild(option1);
            if (destinationObject.channelInfo.streamPrivacy == 'EVERYONE') option1.selected = true;
            var option2 = document.createElement('OPTION');
            option2.innerHTML = Q.getObject("webrtc.settingsPopup.fbFriendsAccess", tool.text);
            option2.name = 'privacy';
            option2.value = 'ALL_FRIENDS';
            if (destinationObject.channelInfo.streamPrivacy == 'ALL_FRIENDS') option2.selected = true;
            privacyBlock.appendChild(option2);
            var option3 = document.createElement('OPTION');
            option3.innerHTML = Q.getObject("webrtc.settingsPopup.fbOnlyMeLiveAccess", tool.text);
            option3.name = 'privacy';
            option3.value = 'SELF';
            if (destinationObject.channelInfo.streamPrivacy == 'SELF') option3.selected = true;
            privacyBlock.appendChild(option3);

            var saveButtonCon = document.createElement('DIV');
            saveButtonCon.className = 'live-editor-stream-to-edit-buttons';
            viewContent.appendChild(saveButtonCon);

            var removeDest = document.createElement('DIV');
            removeDest.className = 'live-editor-stream-to-edit-remove';
            removeDest.innerHTML = 'Remove destination';
            saveButtonCon.appendChild(removeDest);

            removeDest.addEventListener('click', function () {
                saveOrUpdateChannelInDB(destinationObject.channelInfo, true)
                    .then(function () {
                        return getDestinationsFromDb();
                    }).then(function () {
                        slideViewRight(_streamingToCustomRtmpSection);
                        updateDestinationsList();
                    });

            })

            var saveButton = document.createElement('BUTTON');
            saveButton.className = 'Q_button';
            saveButton.innerHTML = 'Save';
            saveButtonCon.appendChild(saveButton);

            saveButton.addEventListener('click', function () {
                destinationObject.channelInfo.streamDesc = streamDescArea.value;
                destinationObject.channelInfo.streamTitle = streamTitleInput.value;
                destinationObject.channelInfo.streamPrivacy = privacySelect.value;
                saveOrUpdateChannelInDB(destinationObject.channelInfo)
                    .then(function () {
                        return getDestinationsFromDb();
                    }).then(function () {
                        slideViewRight(_streamingToCustomRtmpSection);
                        updateDestinationsList();
                    });
            });

            slideViewLeft(container);
        }
    }

    function createAddDestinationMenu() {
        var container = document.createElement('DIV');
        container.className = 'live-editor-stream-to-add-dest';

        var containerInner = document.createElement('DIV');
        containerInner.className = 'live-editor-stream-to-add-inner';
        container.appendChild(containerInner);

        var addYoutubeDest = document.createElement('DIV');
        addYoutubeDest.className = 'live-editor-stream-to-add-item live-editor-stream-to-add-youtube';
        containerInner.appendChild(addYoutubeDest);
        var addYoutubeDestIcon = document.createElement('DIV');
        addYoutubeDestIcon.className = 'live-editor-stream-to-add-icon';
        addYoutubeDest.appendChild(addYoutubeDestIcon);
        var addYoutubeDestText = document.createElement('DIV');
        addYoutubeDestText.className = 'live-editor-stream-to-add-text';
        addYoutubeDestText.innerHTML = 'Youtube';
        addYoutubeDest.appendChild(addYoutubeDestText);

        addYoutubeDest.addEventListener('click', function () {
            if(_addDestinationMenuPopup) _addDestinationMenuPopup.popupDialog.hide();
            connectGoogleAccount()
                .then(function () {
                    synchronizeDbWithLocalStorage()
                        .then(function () {
                            return getDestinationsFromDb();
                        })
                        .then(function () {
                            updateDestinationsList();
                        });
                })
                .catch(function (e) {
                    Q.alert(e);
                });
        });

        var addFacebookDest = document.createElement('DIV');
        addFacebookDest.className = 'live-editor-stream-to-add-item live-editor-stream-to-add-facebook';
        containerInner.appendChild(addFacebookDest);
        var addFacebookDestIcon = document.createElement('DIV');
        addFacebookDestIcon.className = 'live-editor-stream-to-add-icon';
        addFacebookDest.appendChild(addFacebookDestIcon);
        var addFacebookDestText = document.createElement('DIV');
        addFacebookDestText.className = 'live-editor-stream-to-add-text';
        addFacebookDestText.innerHTML = 'Facebook';
        addFacebookDest.appendChild(addFacebookDestText);

        addFacebookDest.addEventListener('click', function () {
            if(_addDestinationMenuPopup) _addDestinationMenuPopup.popupDialog.hide();
            connectFacebookAccount()
                .then(function () {
                    synchronizeDbWithLocalStorage()
                        .then(function () {
                            return getDestinationsFromDb();
                        })
                        .then(function () {
                            updateDestinationsList();
                        });
                })
                .catch(function (e) {
                    Q.alert(e);
                });
        });

        var addTwitchDest = document.createElement('DIV');
        addTwitchDest.className = 'live-editor-stream-to-add-item live-editor-stream-to-add-twitch';
        //containerInner.appendChild(addTwitchDest);
        var addTwitchDestIcon = document.createElement('DIV');
        addTwitchDestIcon.className = 'live-editor-stream-to-add-icon';
        addTwitchDest.appendChild(addTwitchDestIcon);
        var addTwitchDestText = document.createElement('DIV');
        addTwitchDestText.className = 'live-editor-stream-to-add-text';
        addTwitchDestText.innerHTML = 'Twitch';
        addTwitchDest.appendChild(addTwitchDestText);

        var addCustomRtmpDest = document.createElement('DIV');
        addCustomRtmpDest.className = 'live-editor-stream-to-add-item live-editor-stream-to-add-custom';
        containerInner.appendChild(addCustomRtmpDest);
        var addCustomRtmpDestIcon = document.createElement('DIV');
        addCustomRtmpDestIcon.className = 'live-editor-stream-to-add-icon';
        addCustomRtmpDest.appendChild(addCustomRtmpDestIcon);
        var addCustomRtmpDestText = document.createElement('DIV');
        addCustomRtmpDestText.className = 'live-editor-stream-to-add-text';
        addCustomRtmpDestText.innerHTML = 'Custom RTMP';
        addCustomRtmpDest.appendChild(addCustomRtmpDestText);

        addCustomRtmpDest.addEventListener('click', function () {
            if(_addDestinationMenuPopup) _addDestinationMenuPopup.popupDialog.hide();
            onCustomRTMP();
        });

        return container;
    }

    function createSectionElement() {
        var mainContainer = _mainContainer = document.createElement('DIV');
        mainContainer.className = 'view-slider-con';

        var rtmpStreaming = _activeView = _streamingToCustomRtmpSection = document.createElement('DIV');
        rtmpStreaming.className = 'view-slider-view live-editor-dialog-window-content live-editor-stream-rtmp'
        mainContainer.appendChild(rtmpStreaming);

        var addChannelControls = document.createElement('DIV');
        addChannelControls.className = 'live-editor-stream-to-add';
        rtmpStreaming.appendChild(addChannelControls);

        var addDestinationBtn = document.createElement('DIV');
        addDestinationBtn.className = 'live-editor-stream-to-add-btn';
        //if(!tool.state.managingVisualSources) addDestinationBtn.classList.add('live-editor-inactive');
        addDestinationBtn.innerHTML = tool.icons.addItem;
        addChannelControls.appendChild(addDestinationBtn);
        _addDestinationMenuEl = createAddDestinationMenu();
        //addDestinationBtn.appendChild(dropUpMenu);


        Q.activate(
            Q.Tool.setUpElement(
                addDestinationBtn,
                "Media/webrtc/popupDialog",
                {
                    content: _addDestinationMenuEl,
                    className: 'live-editor-stream-to-add-popup',
                    triggerOn: 'lmb'
                }
            ),
            {},
            function () {
                _addDestinationMenuPopup = this;
            }
        );

        var destinationsListCon = _destinationsListEl = document.createElement('DIV');
        destinationsListCon.className = 'live-editor-stream-to-dests';
        rtmpStreaming.appendChild(destinationsListCon);

        var rtmpStreamingSettings = document.createElement('DIV');
        rtmpStreamingSettings.className = 'live-editor-stream-rtmp-start-settings';
        rtmpStreaming.appendChild(rtmpStreamingSettings);

        var youtubeLiveItem = document.createElement('DIV');
        youtubeLiveItem.className = 'live-editor-stream-rtmp-rtmp-item live-editor-stream-yt';
        rtmpStreamingSettings.insertBefore(youtubeLiveItem, rtmpStreamingSettings.firstChild);

        var startStreamingBtnCon = document.createElement('DIV');
        startStreamingBtnCon.className = 'live-editor-stream-rtmp-start';
        rtmpStreamingSettings.appendChild(startStreamingBtnCon);

        var startStreamingBtn = document.createElement('DIV');
        startStreamingBtn.className = 'Q_button live-editor-stream-rtmp-go-live';
        startStreamingBtnCon.appendChild(startStreamingBtn);

        var startStreamingBtnLoader = document.createElement('DIV');
        startStreamingBtnLoader.className = 'live-editor-stream-rtmp-loader';
        startStreamingBtn.appendChild(startStreamingBtnLoader);

        var startStreamingBtnText = document.createElement('DIV');
        startStreamingBtnText.className = 'live-editor-stream-rtmp-text';
        startStreamingBtnText.innerHTML = 'Go Live';
        startStreamingBtn.appendChild(startStreamingBtnText);

        startStreamingBtn.addEventListener('click', function (e) {
            if (typeof MediaRecorder == 'undefined') {
                alert('MediaRecorder is not supported in your browser.')
                return;
            }

            startOrStopStreamingToRtmp();
        })

        tool.eventDispatcher.on('destinationLiveProcessed', function (e) {
            let totalLives = e.totalDestinationsNum;
            let processedLives = e.processedDestinationsNum;
            let percent = processedLives / totalLives * 100;
            startStreamingBtnLoader.style.width = percent + '%';
        });

        tool.eventDispatcher.on('destinationLiveCreated', function (e) {
            startStreamingBtn.classList.add('live-editor-stream-to-rtmp-active');
            _streamingToCustomRtmpSection.classList.add('live-editor-stream-rtmp-active');

            startStreamingBtnText.innerHTML = 'Stop Streaming';
        });

        tool.eventDispatcher.on('livestreamingStartPending', function () {
            _streamingToCustomRtmpSection.classList.add('live-editor-stream-to-rtmp-pending');
        });
        tool.eventDispatcher.on('livestreamingStartFailed', inactiveStreamingUI);

        tool.eventDispatcher.on('livestreamingEnded', inactiveStreamingUI);

        function inactiveStreamingUI() {
            startStreamingBtnText.innerHTML = 'Go Live';
            startStreamingBtn.classList.remove('live-editor-stream-to-rtmp-active');
            _streamingToCustomRtmpSection.classList.remove('live-editor-stream-rtmp-active');
            _streamingToCustomRtmpSection.classList.remove('live-editor-stream-to-rtmp-pending');

            startStreamingBtnLoader.style.width = '';
        }

        return rtmpStreaming;
    }


    function getCurrentTimeInISOFormat() {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-based
        const day = String(now.getUTCDate()).padStart(2, '0');
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        const seconds = String(now.getUTCSeconds()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
    }

    function initYoutubeBroadcast(youtubeDestination) {
        return new Promise(function (resolve, reject) {
            let part = 'snippet,status,contentDetails';
            const requestURL = `https://www.googleapis.com/youtube/v3/liveBroadcasts?part=${encodeURIComponent(part)}&access_token=${encodeURIComponent(youtubeDestination.channelInfo.accessToken)}`;

            fetch(requestURL, {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + youtubeDestination.channelInfo.accessToken,
                    'Content-Type': 'application/json; charset=UTF-8',
                },
                body: JSON.stringify({
                    snippet: {
                        title: youtubeDestination.channelInfo.streamTitle,
                        description: youtubeDestination.channelInfo.streamDesc,
                        scheduledStartTime: getCurrentTimeInISOFormat()
                    },
                    status: {
                        privacyStatus: youtubeDestination.channelInfo.privacyStatus || 'public'
                    },
                    contentDetails: {
                        enableAutoStart: true
                    }
                }),
            })
                .then(function (response) {
                    if (response.status >= 401) {
                        response.json().then(function (resp) {
                            reject({ code: response.status, error: resp.error });
                        })
                    } else {

                        return response.json().then(function (response) {
                            resolve(response);
                        });
                    }
                })
        });
    }

    function getYoutubeBroadcast(youtubeDestination) {
        return new Promise(function (resolve, reject) {
            let part = 'snippet,status,contentDetails';
            const requestURL = `https://www.googleapis.com/youtube/v3/liveBroadcasts?part=${encodeURIComponent(part)}&id=${youtubeDestination.broadcastId}`;

            fetch(requestURL, {
                method: 'GET',
                headers: {
                    Authorization: 'Bearer ' + youtubeDestination.channelInfo.accessToken,
                    'Content-Type': 'application/json; charset=UTF-8',
                }
            })
                .then(function (response) {
                    if (response.status >= 401) {
                        reject({ code: response.status, error: response.error });
                    }
                    return response.json();
                })
                .then(function (response) {
                    resolve(response);
                })
                .catch(function (error) {
                    reject(error);
                });
        });
    }

    function getYoutubeLivestream(youtubeDestination) {
        return new Promise(function (resolve, reject) {
            let part = 'snippet,status,contentDetails';
            const requestURL = `https://www.googleapis.com/youtube/v3/liveStreams?part=${encodeURIComponent(part)}&id=${youtubeDestination.streamId}`;

            fetch(requestURL, {
                method: 'GET',
                headers: {
                    Authorization: 'Bearer ' + youtubeDestination.channelInfo.accessToken,
                    'Content-Type': 'application/json; charset=UTF-8',
                }
            })
                .then(function (response) {
                    if (response.status >= 401) {
                        reject({ code: response.status, error: response.error });
                    }
                    return response.json();
                })
                .then(function (response) {
                    resolve(response);
                })
                .catch(function (error) {
                    reject(error);
                });
        });
    }

    function initYoutubeLivestream(youtubeDestination) {
        return new Promise(function (resolve, reject) {
            let part = 'snippet,cdn,contentDetails,status';
            const requestURL = `https://www.googleapis.com/youtube/v3/liveStreams?part=${encodeURIComponent(part)}&access_token=${encodeURIComponent(youtubeDestination.channelInfo.accessToken)}`;

            fetch(requestURL, {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + youtubeDestination.channelInfo.accessToken,
                    'Content-Type': 'application/json; charset=UTF-8',
                },
                body: JSON.stringify({
                    cdn: {
                        format: '',
                        ingestionType: 'rtmp',
                        resolution: '1080p',
                        frameRate: '30fps',
                    },
                    snippet: {
                        title: youtubeDestination.channelInfo.streamTitle,
                        description: youtubeDestination.channelInfo.streamDesc
                    },
                    contentDetails: {
                        isReusable: true,
                    }
                }),
            })
                .then(function (response) {
                    if (response.status >= 401) {
                        reject({ code: response.status, error: response.error });
                    }
                    return response.json();
                })
                .then(function (response) {
                    resolve(response);
                })
                .catch(function (error) {
                    reject(error);
                });
        });
    }

    function deleteYoutubeLivestream(youtubeDestination) {
        return new Promise(function (resolve, reject) {
            const requestURL = `https://www.googleapis.com/youtube/v3/liveStreams?id=${youtubeDestination.streamId}`;

            fetch(requestURL, {
                method: 'DELETE',
                headers: {
                    Authorization: 'Bearer ' + youtubeDestination.channelInfo.accessToken,
                    'Content-Type': 'application/json; charset=UTF-8',
                }
            })
                .then(function (response) {
                    if (response.status >= 401) {
                        reject({ code: response.status, error: response.error });
                    }
                    resolve(response);
                })
                .catch(function (error) {
                    reject(error);
                });
        });
    }

    function deleteYoutubeBroadcast(youtubeDestination) {
        return new Promise(function (resolve, reject) {
            const requestURL = `https://www.googleapis.com/youtube/v3/liveBroadcasts?id=${youtubeDestination.broadcastId}`;

            fetch(requestURL, {
                method: 'DELETE',
                headers: {
                    Authorization: 'Bearer ' + youtubeDestination.channelInfo.accessToken,
                    'Content-Type': 'application/json; charset=UTF-8',
                }
            })
                .then(function (response) {
                    if (response.status >= 401) {
                        reject({ code: response.status, error: response.error });
                    }
                    resolve(response);
                })
                .catch(function (error) {
                    reject(error);
                });
        });
    }

    function bindYoutubeLivestreamToBroadcast(broadcastId, streamId, youtubeDestination) {
        return new Promise(function (resolve, reject) {
            let part = 'snippet';
            const requestURL = `https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?id=${broadcastId}&streamId=${streamId}&part=${encodeURIComponent(part)}`;

            fetch(requestURL, {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + youtubeDestination.channelInfo.accessToken,
                    'Content-Type': 'application/json; charset=UTF-8',
                },
                body: JSON.stringify({
                    streamId: streamId
                }),
            })
                .then(function (response) {
                    if (response.status >= 401) {
                        reject({ code: response.status });
                    }
                    return response.json();
                })
                .then(function (response) {
                    resolve(response);
                })
                .catch(function (error) {
                    reject(error);
                });
        });
    }

    function transitionYoutubeBroadcastToLive(broadcastId, youtubeDestination, status) {
        return new Promise(function (resolve, reject) {
            let part = 'status';

            const requestURL = `https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?broadcastStatus=${status}&id=${broadcastId}&part=${encodeURIComponent(part)}`;

            fetch(requestURL, {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + youtubeDestination.channelInfo.accessToken,
                    'Content-Type': 'application/json; charset=UTF-8',
                }
            })
                .then(function (response) {
                    if (response.status >= 401) {
                        reject({ code: response.status });
                    }
                    return response.json();
                })
                .then(function (response) {
                    resolve(response);
                })
                .catch(function (error) {
                    reject(error);
                });
        });
    }

    function initFacebookLivestream(facebookDestination) {
        return new Promise(function (resolve, reject) {
            const endpoint = `https://graph.facebook.com/v20.0/${facebookDestination.channelInfo.profileId}/live_videos`;

            const params = new URLSearchParams();
            params.append('access_token', facebookDestination.channelInfo.accessToken);
            params.append('title', facebookDestination.channelInfo.streamTitle);
            params.append('description', facebookDestination.channelInfo.streamDesc);
            params.append('privacy', JSON.stringify({ value: facebookDestination.channelInfo.streamPrivacy }));
            params.append('status', 'LIVE_NOW'); // Can also be 'SCHEDULED'

            fetch(endpoint, {
                method: 'POST',
                body: params
            })
                .then(response => response.json())
                .then(data => {
                    if (data.id && data.stream_url) {
                        console.log('Live Video Created Successfully!');
                        console.log('Stream URL:', data.stream_url);
                        resolve(data);
                    } else {
                        console.error('Error creating live video:', data.error.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    reject(error);
                });
        });
    }

    function getFacebookLivestream(facebookDestination) {
        return new Promise(function (resolve, reject) {
            let fields = 'permalink_url,id,embed_html,status';
            const requestURL = `https://graph.facebook.com/v20.0/${facebookDestination.liveVideoId}?fields=${encodeURIComponent(fields)}&access_token=${facebookDestination.channelInfo.accessToken}`;

            fetch(requestURL, {
                method: 'GET',
                headers: {
                    Authorization: 'Bearer ' + facebookDestination.channelInfo.accessToken,
                    'Content-Type': 'application/json; charset=UTF-8',
                }
            })
                .then(function (response) {
                    if (response.status >= 401) {
                        reject({ code: response.status, error: response.error });
                    }
                    return response.json();
                })
                .then(function (response) {
                    resolve(response);
                })
                .catch(function (error) {
                    reject(error);
                });
        });
    }

    function stopFacebookLivestream(facebookDestination) {
        return new Promise(function (resolve, reject) {
            const requestURL = `https://graph.facebook.com/v20.0/${facebookDestination.liveVideoId}?end_live_video=true&access_token=${facebookDestination.channelInfo.accessToken}`;

            fetch(requestURL, {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + facebookDestination.channelInfo.accessToken,
                    'Content-Type': 'application/json; charset=UTF-8',
                }
            })
                .then(function (response) {
                    if (response.status >= 401) {
                        reject({ code: response.status, error: response.error });
                    }

                    resolve(response);
                })
                .catch(function (error) {
                    reject(error);
                });
        });
    }

    function deleteFacebookLivestream(facebookDestination) {
        return new Promise(function (resolve, reject) {
            const requestURL = `https://graph.facebook.com/v20.0/${facebookDestination.liveVideoId}?access_token=${facebookDestination.channelInfo.accessToken}`;

            fetch(requestURL, {
                method: 'DELETE',
                headers: {
                    Authorization: 'Bearer ' + facebookDestination.channelInfo.accessToken,
                    'Content-Type': 'application/json; charset=UTF-8',
                }
            })
                .then(function (response) {
                    if (response.status >= 401) {
                        reject({ code: response.status, error: response.error });
                    }

                    resolve(response);
                })
                .catch(function (error) {
                    reject(error);
                });
        });
    }

    function getRtmpForEachDestination(index, rtmpsArr, oneDestinationLiveProcessed) {
        if (_destinations[index].channelInfo.enabled === false) {
            proceedToNextDestination();
            return;
        }

        function proceedToNextDestination() {
            if (_destinations[index + 1]) {
                getRtmpForEachDestination(index + 1, rtmpsArr, oneDestinationLiveProcessed);
            }
        }

        let destinationItem = _destinations[index];
        if (destinationItem.channelInfo.type == 'youtube') {
            let broadcastId, streamId, ingestionInfo;
            initYoutubeBroadcast(destinationItem)
                .then(function (response) {
                    broadcastId = destinationItem.broadcastId = response.id;
                    return initYoutubeLivestream(destinationItem);
                })
                .then(function (response) {
                    streamId = destinationItem.streamId = response.id;
                    ingestionInfo = response.cdn.ingestionInfo;
                    return bindYoutubeLivestreamToBroadcast(broadcastId, streamId, destinationItem);
                })
                .then(function (response) {
                    let rtmpData = {
                        rtmpUrl: ingestionInfo.rtmpsIngestionAddress + '/' + ingestionInfo.streamName,
                        type: 'youtube',
                        streamId: streamId,
                        broadcastId: broadcastId,
                        id: generateId()
                    }
                    rtmpsArr.push(rtmpData);

                    if(oneDestinationLiveProcessed) oneDestinationLiveProcessed({ destination: destinationItem, success: true });
                })
                .catch(function (e) {
                    if (e.code == 401) {
                        connectGoogleAccount()
                            .then(function () {
                                return synchronizeDbWithLocalStorage();
                            })
                            .then(function () {
                                getRtmpForEachDestination(index, rtmpsArr, oneDestinationLiveProcessed); //try again
                            }).catch(function (e) {
                                oneDestinationLiveProcessed({
                                    destination: destinationItem,
                                    success: false,
                                    reason: 'Authentication error'
                                })
                               // showErrorAlert('Youtube', 'Authentication error');
                            });
                    } else {
                        if(oneDestinationLiveProcessed) {
                            oneDestinationLiveProcessed({
                                destination: destinationItem,
                                success: false,
                                reason: e.error.message
                            })
                        }
                        //showErrorAlert('Youtube', e.error.message);
                    }

                });
        } else if (destinationItem.channelInfo.type == 'facebook') {
            initFacebookLivestream(destinationItem)
                .then(function (response) {                    
                    let rtmpData = {
                        rtmpUrl: response.stream_url,
                        linkToLive: '',
                        type: 'facebook',
                        liveVideoId: response.id,
                        id: generateId()
                    }
                    rtmpsArr.push(rtmpData);

                    destinationItem.liveVideoId = response.id;

                    getFacebookLivestream(destinationItem).then(function (response) {
                        let shareid = response.permalink_url.split('/');
                        destinationItem.shareId = shareid[3];
                        rtmpData.shareId = shareid[3];
                        if(oneDestinationLiveProcessed) oneDestinationLiveProcessed({ destination: destinationItem, success: true });
                    });
                })
                .catch(function (e) {
                    if (e.code == 401) {
                        connectFacebookAccount()
                            .then(function () {
                                return synchronizeDbWithLocalStorage();
                            })
                            .then(function () {
                                getRtmpForEachDestination(index, rtmpsArr, oneDestinationLiveProcessed); //try again
                            }).catch(function (e) {
                                oneDestinationLiveProcessed({
                                    destination: destinationItem,
                                    success: false,
                                    reason: 'Authentication error'
                                })
                                //showErrorAlert('Facebook', 'Authentication error');
                            });;
                    } else {
                        if(oneDestinationLiveProcessed) {
                            oneDestinationLiveProcessed({
                                destination: destinationItem,
                                success: false,
                                reason: e.message
                            })
                        }
                        //showErrorAlert('Facebook', e.message);
                    }
                });
        } else if (destinationItem.channelInfo.type == 'customRtmp') {
            let rtmpUrl = destinationItem.channelInfo.rtmpUrl;
            if(destinationItem.channelInfo.rtmpStreamKey && destinationItem.channelInfo.rtmpStreamKey.trim() != '') {
                if(destinationItem.channelInfo.rtmpUrl.endsWith('/')) {
                    rtmpUrl = destinationItem.channelInfo.rtmpUrl + destinationItem.channelInfo.rtmpStreamKey;
                } else {
                    rtmpUrl = destinationItem.channelInfo.rtmpUrl + '/' + destinationItem.channelInfo.rtmpStreamKey;
                }
            }
            let rtmpData = {
                rtmpUrl: rtmpUrl,
                linkToLive: '',
                type: 'customRtmp',
                id: generateId()
            }
            rtmpsArr.push(rtmpData);
            oneDestinationLiveProcessed({
                destination: destinationItem,
                success: true,
            })
        }

        proceedToNextDestination();
    }

    function startOrStopStreamingToRtmp() {
        if (tool.RTMPSender.isStreaming()) {

            tool.RTMPSender.endStreaming('custom');
            stopStreamToEachDestination();

            tool.state.rtmpLiveIsActive = false;
            tool.eventDispatcher.dispatch('livestreamingEnded');

        } else {

            let processedLivesCounter = 0;
            let totalLivesToBeCreated = _destinations.filter(function (o) {
                return o.channelInfo.enabled;
            }).length;

            if(totalLivesToBeCreated === 0) {
                Q.alert('Please add some destinations before starting livestreaming.');
                return;
            }

            let rtmpUrlsArr = [];
            let destinationsProcessed = [];
            
            getRtmpForEachDestination(0, rtmpUrlsArr,
                function (e) { //oneDestinationLiveProcessed: live created via API of corresponding platform
                    destinationsProcessed.push(e)

                    processedLivesCounter++;
                    
                    tool.eventDispatcher.dispatch('destinationLiveProcessed', {
                        destination: e.destination,
                        processedDestinationsNum: processedLivesCounter,
                        totalDestinationsNum: totalLivesToBeCreated,
                        success: e.success
                    });

                    if(processedLivesCounter === totalLivesToBeCreated) {
                        let startedDesctinations = destinationsProcessed.filter(function (o) {
                            return o.success;
                        });
                        let failedDestinations = destinationsProcessed.filter(function (o) {
                            return !o.success;
                        });

                        if(failedDestinations.length != 0) {
                            let list = '<ul class="live-editor-stream-to-failed">';
                            for(let f in failedDestinations) {
                                let dest = failedDestinations[f];
                                list += `<li><span>${dest.destination.channelInfo.type}</span>: ${dest.reason}</li>`;
                            }
                            list += '</ul>';
                            if (startedDesctinations.length != 0) {
                               
                                Q.confirm(`We were not able to start live stream on next platforms: ${list} <br />Click "Skip" to ignore this destination(s) and continue to publish video to other destinations or click "Cancel" to stop publishing live stream.`, function (result) {
                                    if (!result) {
                                        onLivestreamingStartFailure();
                                        return;
                                    }

                                    deleteCreatedLivestreams(failedDestinations.map(function (o) {
                                        return o.destination;
                                    }))

                                    oneDestinationLiveCreated();
                                }, {
                                    title: 'Error',
                                    ok: 'Skip',
                                    cancel: 'Cancel',
                                    noClose: false,
                                    mask: false
                                });
                            } else {
                                Q.alert(`We were not able to start live stream to all destinations: ${list}`, {
                                    title: 'Error',
                                    mask: false
                                });
                            }
                        } else {
                            oneDestinationLiveCreated();
                        }

                    }

                },
            );

            function onLivestreamingStartFailure() {
                deleteCreatedLivestreams(_destinations);

                tool.eventDispatcher.dispatch('livestreamingStartFailed');
            }

            function deleteCreatedLivestreams(destinations){
                let destinationsList = destinations ? destinations : _destinations;
                for (let i in destinationsList) {
                    let destItem = destinationsList[i];
                    if (destItem.channelInfo.type == 'youtube') {
                        if (destItem.streamId) {
                            deleteYoutubeLivestream(destItem)
                                .then(function () {
                                    if (destItem.broadcastId) {
                                        deleteYoutubeBroadcast(destItem).then(function () {
                                            destItem.streamId = null;
                                            destItem.broadcastId = null;
                                        });
                                    };
                                })
                        };
                        
                    } else if (destItem.channelInfo.type == 'facebook') {
                        if (destItem.liveVideoId) {
                            deleteFacebookLivestream(destItem).then(function() {
                                destItem.liveVideoId = null;
                            });
                        };
                    }
                }
            }

            function oneDestinationLiveCreated() {
                if (rtmpUrlsArr.length == 0) {
                    console.error('RTMP URL or key is invalid');
                    return;
                }
    
    
                let youtubeDestinations = _destinations.filter(function (destItem) {
                    return destItem.channelInfo.type == 'youtube';
                });
    
                function publishYoutubeBroadcast(index) {
                    let destItem = youtubeDestinations[index];
                    if (destItem.channelInfo.enabled === false) {
                        if (youtubeDestinations[index + 1]) publishYoutubeBroadcast(index + 1);
                        return;
                    }
                    getYoutubeBroadcast(destItem)
                        .then(function (response) { });
    
                    function checkIfStreamIsActive() {
                        getYoutubeLivestream(destItem)
                            .then(function (response) {    
                                if (response.items[0].status.streamStatus == 'ready' || response.items[0].status.streamStatus == 'active') {
                                    destItem.published = true;
                                    if (youtubeDestinations[index + 1]) publishYoutubeBroadcast(index + 1);
    
                                    /* transitionYoutubeBroadcastToLive(destItem.broadcastId, destItem, 'live')
                                        .then(function () {
                                            
                                        }); */
                                } else {
                                    setTimeout(checkIfStreamIsActive, 3000);
                                }
    
                            });
                    }
                    checkIfStreamIsActive()
    
    
                }
    
                if(youtubeDestinations.length != 0) publishYoutubeBroadcast(0);
    
                let useMp4Muxer = typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined' && typeof MediaStreamTrackProcessor !== 'undefined';
                tool.RTMPSender.startStreaming(rtmpUrlsArr, 'custom', tool.livestreamStream, useMp4Muxer)
                    .then(function () {
                        tool.state.rtmpLiveIsActive = true;
                        tool.eventDispatcher.dispatch('destinationLiveCreated');
                    });
                
            }
        }       
    }

    function stopStreamToEachDestination() {

        function stopYoutubeLive(destinationItem) {
            transitionYoutubeBroadcastToLive(destinationItem.broadcastId, destinationItem, 'complete')
                .then(function (response) {

                })
                .catch(function (e) {
                    if (e.code == 401) {
                        connectGoogleAccount()
                            .then(function () {
                                stopYoutubeLive(destinationItem); //try again
                            });
                    } else {
                        Q.alert('Error while stopping Youtube broadcast', e.error.message);
                    }

                });
        }

        function stopFacebookLive(destinationItem) {
            stopFacebookLivestream(destinationItem)
                .then(function (response) {

                })
                .catch(function (e) {
                    if (e.code == 401) {
                        connectFacebookAccount()
                            .then(function () {
                                stopFacebookLive(destinationItem); //try again
                            });
                    } else {
                        Q.alert('Error while stopping Facebook broadcast', e.error.message);
                    }

                });
        }

        for (let i in _destinations) {
            let destinationItem = _destinations[i];
            if (destinationItem.channelInfo.enabled === false) {
                continue;
            }

            if (destinationItem.channelInfo.type == 'youtube' && destinationItem.broadcastId != null) {
                stopYoutubeLive(destinationItem);
            } else if (destinationItem.channelInfo.type == 'facebook' && destinationItem.liveVideoId != null) {
                stopFacebookLive(destinationItem);
            }
        }
    }

    function refreshYoutubeToken() {
        /* CLIENT_ID = 'YOUR_CLIENT_ID'
        CLIENT_SECRET = 'YOUR_CLIENT_SECRET'
        REFRESH_TOKEN = 'YOUR_REFRESH_TOKEN'
        
        # Request a new access token using the refresh token
        token_url = 'https://oauth2.googleapis.com/token'
        token_data = {
            'client_id': YOU,
            'client_secret': CLIENT_SECRET,
            'refresh_token': REFRESH_TOKEN,
            'grant_type': 'refresh_token'
        }
        token_response = requests.post(token_url, data=token_data)
        token_info = token_response.json()
        
        # Extract the new access token
        new_access_token = token_info['access_token'] */
    }

    function getDestinationsFromDb() {
        return new Promise(function (resolve, reject) {
            Q.Streams.related(
                tool.livestreamStream.fields.publisherId,
                tool.livestreamStream.fields.name,
                null,
                true,
                { dontFilterUsers: true },
                function (err) {
                    if (err) {
                        console.warn('Error while retrieving related streams');
                        reject();
                    }
                    let relatedStreams = this.relatedStreams;

                    function refreshAllStreams() {
                        function refreshStream(streams, key) {
                            return new Promise(function (resolve, reject) {
                                streams[key].refresh(function (arg1, arg2) {
                                    streams[key] = this;
                                    resolve();
                                },
                                    { evenIfNotRetained: true })
                            });
                        }

                        return new Promise(function (resolve, reject) {

                            let keys = Object.keys(relatedStreams);

                            if(keys.length == 0) {
                                return resolve();
                            }

                            function itterate(keyNum) {
                                refreshStream(relatedStreams, keys[keyNum])
                                    .then(function () {
                                        if (relatedStreams[keys[keyNum + 1]]) {
                                            itterate(keyNum + 1)
                                        } else {
                                            resolve();
                                        }
                                    });
                            }

                            itterate(0)
                        });
                    }

                    refreshAllStreams().then(function () {
                        for (let i in relatedStreams) {
                            if (!relatedStreams[i].fields.content || relatedStreams[i].fields.closedTime) {
                                continue;
                            }
                            let chennelItem = JSON.parse(relatedStreams[i].fields.content);

                            let channelExist = false;
                            for (let d in _destinations) {
                                if (_destinations[d].channelInfo.destId == chennelItem.destId) {
                                    channelExist = _destinations[d];
                                    break;
                                }
                            }

                            if (channelExist !== false) {
                                channelExist.channelInfo = chennelItem;
                                continue;
                            }

                            _destinations.splice(0, 0, {
                                type: chennelItem.type,
                                channelInfo: chennelItem
                            });
                        }

                        for (let i = _destinations.length - 1; i >= 0; i--) {
                            let destinationItem = _destinations[i];
                            let exist = false;
                            for (let s in relatedStreams) {
                                if (relatedStreams[s].fields.name == 'Media/livestream/dest/' + destinationItem.channelInfo.destId && !relatedStreams[s].fields.closedTime) {
                                    exist = true;
                                    break;
                                }
                            }

                            if (!exist) {
                                destinationItem.itemEl.remove();
                                _destinations.splice(i, 1)
                            }
                        }
                        resolve();
                    });

                }
            );
        });

    }

    function getDestinationsFromLocalStorage() {
        let existingChannels = localStorage.getItem('q_google_webrtc_access_tokens');

        let storageItems;
        if (existingChannels) {
            storageItems = JSON.parse(existingChannels);
        } else {
            storageItems = [];
        }

        for (let i in storageItems) {
            let chennelItem = storageItems[i];

            let channelExist = false;
            for (let d in _destinations) {
                if (_destinations[d].channelId == chennelItem.channelId) {
                    channelExist = true;
                    break;
                }
            }

            if (channelExist) continue;

            _destinations.splice(0, 0, {
                type: 'youtube',
                channelInfo: chennelItem
            });
        }
    }

    function replaceExceptLastThree(str) {
        const lastThree = str.slice(-3);
        
        const replacedStr = str.slice(0, -3).replace(/./g, '*') + lastThree;
        
        return replacedStr;
    }

    function getPlatformFromURL(url) {
        const platforms = {
            youtube: "youtubeLogo",
            twitch: "twitchLogo",
            telegram: "telegramLogo",
            "twitter.com": "xLogo",
            "x.com": "xLogo",
            facebook: "fbLogo"
        };
    
        const lowerCaseURL = url.toLowerCase();
    
        for (const keyword in platforms) {
            if (lowerCaseURL.includes(keyword)) {
                return platforms[keyword];
            }
        }
    
        return "liveLogo";
    }

    function updateDestinationsList() {
        for (let i in _destinations) {
            let destinationItem = _destinations[i];

            if (!destinationItem.itemEl) {
                let destName, streamTitle, destIcon, streamIconSvg;

                if (destinationItem.channelInfo.type == 'youtube') {
                    destName = destinationItem.channelInfo.channelTitle;
                    streamTitle = destinationItem.channelInfo.streamTitle;
                    destIcon = destinationItem.channelInfo.thumbnail ? destinationItem.channelInfo.thumbnail : destinationItem.channelInfo.thumbnails.default.url;
                } else if (destinationItem.channelInfo.type == 'facebook') {
                    destName = destinationItem.channelInfo.channelTitle;
                    streamTitle = destinationItem.channelInfo.streamTitle;
                    streamIconSvg = tool.icons.fbLogo;
                } else if (destinationItem.channelInfo.type == 'customRtmp') {
                    destName = destinationItem.channelInfo.rtmpUrl;
                    if(destinationItem.channelInfo.rtmpStreamKey) streamTitle = 'Stream Key: ' + replaceExceptLastThree(destinationItem.channelInfo.rtmpStreamKey);
                    let icon = getPlatformFromURL(destinationItem.channelInfo.rtmpUrl);
                    streamIconSvg = tool.icons[icon];
                }

                let itemEl = document.createElement('DIV');
                itemEl.className = 'live-editor-stream-to-dest-item live-editor-stream-to-dest-' + destinationItem.channelInfo.type;

                let itemIconCon = document.createElement('DIV');
                itemIconCon.className = 'live-editor-stream-to-dest-icon';
                itemEl.appendChild(itemIconCon)

                let itemIconInner = document.createElement('DIV');
                itemIconInner.className = 'live-editor-stream-to-dest-icon-inner';
                itemIconCon.appendChild(itemIconInner)

                if (destIcon) {
                    let itemIconImg = document.createElement('IMG');
                    itemIconImg.src = destIcon;
                    itemIconInner.appendChild(itemIconImg);
                } else if (streamIconSvg) {
                    let itemIconImg = document.createElement('DIV');
                    itemIconImg.className = 'live-editor-stream-to-dest-icon-svg';
                    itemIconImg.innerHTML = streamIconSvg;
                    itemIconInner.appendChild(itemIconImg);
                }

                let itemDescription = document.createElement('DIV');
                itemDescription.className = 'live-editor-stream-to-dest-desc';
                itemEl.appendChild(itemDescription);

                let itemDescriptionInner = document.createElement('DIV');
                itemDescriptionInner.className = 'live-editor-stream-to-dest-desc-inner';
                itemDescription.appendChild(itemDescriptionInner);

                let channelName = document.createElement('DIV');
                channelName.className = 'live-editor-stream-to-dest-channel';
                channelName.innerHTML = destName;
                itemDescriptionInner.appendChild(channelName);

                let streamTitleEl = document.createElement('DIV');
                streamTitleEl.className = 'live-editor-stream-to-dest-title';
                streamTitleEl.innerHTML = streamTitle;
                itemDescriptionInner.appendChild(streamTitleEl);

                let editItem = document.createElement('DIV');
                editItem.className = 'live-editor-stream-to-dest-edit';
                itemEl.appendChild(editItem)

                let editItemInner = document.createElement('DIV');
                editItemInner.className = 'live-editor-stream-to-dest-edit-inner';
                editItem.appendChild(editItemInner)

                let editItemText = document.createElement('SPAN');
                editItemText.innerHTML = 'Edit';
                editItemInner.appendChild(editItemText)

                editItemText.addEventListener('click', function () {
                    onDestinationEdit(destinationItem);
                });

                let turnOnOff = document.createElement('DIV');
                turnOnOff.className = 'live-editor-stream-to-dest-toggle';
                itemEl.appendChild(turnOnOff);

                let turnOnOffInner = document.createElement('DIV');
                turnOnOffInner.className = 'live-editor-stream-to-dest-toggle-inner';
                turnOnOff.appendChild(turnOnOffInner);

                let turnOnOffCheckbox = document.createElement('INPUT');
                turnOnOffCheckbox.className = 'live-editor-stream-to-dest-check';
                turnOnOffCheckbox.type = 'checkbox';
                turnOnOffCheckbox.checked = destinationItem.channelInfo.enabled ? true : false;
                turnOnOffInner.appendChild(turnOnOffCheckbox);
                turnOnOffCheckbox.addEventListener('change', function () {
                    destinationItem.channelInfo.enabled = turnOnOffCheckbox.checked;
                    destinationItem.itemEl.classList.add('Q_working');

                    saveOrUpdateChannelInDB(destinationItem.channelInfo).then(function () {
                        destinationItem.itemEl.classList.remove('Q_working');
                    });
                });

                destinationItem.itemEl = itemEl;
                destinationItem.streamNameEl = channelName;
                destinationItem.streamTitleEl = streamTitleEl;
            } else {
                if (destinationItem.channelInfo.type == 'customRtmp') {
                    destinationItem.streamNameEl.innerHTML = destinationItem.channelInfo.rtmpUrl;
                } else {
                    destinationItem.streamTitleEl.innerHTML = destinationItem.channelInfo.streamTitle;
                }
            }


            _destinationsListEl.appendChild(destinationItem.itemEl);
        }
    }

    createSectionElement();
    getDestinationsFromDb().then(function () {
        updateDestinationsList();
    });

    function getSection() {
        return _mainContainer;
    }

    function onStreamingEndedOrStoppedHandler() {
        rtmpStreamingSettings.style.display = 'block';
        rtmpLiveSection.style.display = 'none';
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).replace(/\./g, "");
    }

    return {
        getSection: getSection,
        onStreamingEndedOrStoppedHandler: onStreamingEndedOrStoppedHandler
    }
};