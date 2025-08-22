(function ($, window, undefined) {

    let _icons = {
        removeItem: '<svg width="800px" height="800px" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="#000000" d="M195.2 195.2a64 64 0 0 1 90.496 0L512 421.504 738.304 195.2a64 64 0 0 1 90.496 90.496L602.496 512 828.8 738.304a64 64 0 0 1-90.496 90.496L512 602.496 285.696 828.8a64 64 0 0 1-90.496-90.496L421.504 512 195.2 285.696a64 64 0 0 1 0-90.496z"/></svg>',
        next: '<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path fill-rule="evenodd" clip-rule="evenodd" d="M8.29289 4.29289C8.68342 3.90237 9.31658 3.90237 9.70711 4.29289L16.7071 11.2929C17.0976 11.6834 17.0976 12.3166 16.7071 12.7071L9.70711 19.7071C9.31658 20.0976 8.68342 20.0976 8.29289 19.7071C7.90237 19.3166 7.90237 18.6834 8.29289 18.2929L14.5858 12L8.29289 5.70711C7.90237 5.31658 7.90237 4.68342 8.29289 4.29289Z" fill="#000000"/> </svg>',
        prev: '<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path fill-rule="evenodd" clip-rule="evenodd" d="M15.7071 4.29289C16.0976 4.68342 16.0976 5.31658 15.7071 5.70711L9.41421 12L15.7071 18.2929C16.0976 18.6834 16.0976 19.3166 15.7071 19.7071C15.3166 20.0976 14.6834 20.0976 14.2929 19.7071L7.29289 12.7071C7.10536 12.5196 7 12.2652 7 12C7 11.7348 7.10536 11.4804 7.29289 11.2929L14.2929 4.29289C14.6834 3.90237 15.3166 3.90237 15.7071 4.29289Z" fill="#000000"/> </svg>',
        shareIcon: '<svg version="1.1" id="svg285" xml:space="preserve" width="682.66669" height="682.66669" viewBox="0 0 682.66669 682.66669" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><defs id="defs289"><clipPath clipPathUnits="userSpaceOnUse" id="clipPath299"><path d="M 0,512 H 512 V 0 H 0 Z" id="path297" /></clipPath></defs><g id="g291" transform="matrix(1.3333333,0,0,-1.3333333,0,682.66667)"><g id="g293"><g id="g295" clip-path="url(#clipPath299)"><g id="g301" transform="translate(239.9331,239.9331)"><path d="M 0,0 257.067,257.067" style="fill:none;stroke:#000000;stroke-width:30;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-opacity:1" id="path303" /></g><g id="g305" transform="translate(239.9331,239.9331)"><path d="m 0,0 c 0,0 -144.396,41.256 -201.802,57.658 -13.692,3.912 -23.131,16.425 -23.131,30.666 v 0.008 c 0,14.325 9.396,26.954 23.118,31.07 96.083,28.825 458.882,137.665 458.882,137.665 0,0 -108.84,-362.799 -137.665,-458.882 -4.116,-13.722 -16.745,-23.118 -31.07,-23.118 h -0.008 c -14.241,0 -26.754,9.439 -30.666,23.131 C 41.256,-144.396 0,0 0,0 Z" style="fill:none;stroke:#000000;stroke-width:30;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-opacity:1" id="path307" /></g></g></g></g></svg>',
    }
    /**
     * Media/webrtc/scheduler tool.
     * 
     * @module Media
     * @constructor
     * @param {Object} options
     */
    Q.Tool.define("Media/webrtc/scheduler", function (options) {
        var tool = this;
        tool.topicInputEl = null;
        tool.startTimePicker = null;
        tool.endTimePicker = null;
        tool.timeZoneSelectEl = null;
        tool.attendeesContainerEl = null;
        tool.openAccessTypeInputEl = null;
        tool.trustedAccessTypeInputEl = null;

        if(tool.state.publisherId && tool.state.streamName) {
            tool.getWebRTCStream().then(function () {
                tool.state.meetingParams.topic = tool.webrtcStream.fields.title;
                //tool.state.meetingParams.startTimeTs = parseInt(tool.webrtcStream.getAttribute('scheduledStartTime'));
                //tool.state.meetingParams.endTimeTs = parseInt(tool.webrtcStream.getAttribute('scheduledEndTime'));
                tool.state.meetingParams.timeZoneString = tool.webrtcStream.getAttribute('timeZoneString');
                tool.state.meetingParams.accessType = tool.webrtcStream.getAttribute('accessType');
                tool.state.meetingParams.scheduleLivestream = tool.webrtcStream.getAttribute('scheduleLivestream') == "true";
                tool.getInvitedPeople().then(function (invitedUsers) {
                    tool.invitedUsers = invitedUsers;
                    for(let i in invitedUsers) {
                        tool.addInvitedUser(invitedUsers[i].fields.userId, invitedUsers[i])
                    }
                });
                tool.createUI();
            });
        } else {
            tool.createUI();
        }

        
    },

        {
            publisherId: null,
            streamName: null,
            meetingParams:{
                topic: null,
                startTimeTs: null,
                endTimeTs: null,
                timeZoneString: null,
                invitedAttendeesIds: [],
                accessType: null,
            },
            onSave: new Q.Event(),
            onRefresh: new Q.Event(),
            onUpdate: new Q.Event(),
        },

        {
            refresh: function () {
                var tool = this;
            },
            getInvitedPeople: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/webrtc", ["invitedUsers"], function (err, response) {
                        let msg = Q.firstErrorMessage(err, response && response.errors);

                        if(msg) {
                            console.error(msg);
                            reject(msg);
                            return;
                        }
                        
                        resolve(response.slots.invitedUsers);
                    }, {
                        method: 'get',
                        fields: {
                            publisherId: tool.state.publisherId,
                            streamName: tool.state.streamName
                        }
                    });
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
                        }, tool);
                    });
                    
                } else if(tool.webrtcStream == 'failed') {
                    return new Promise.resolve(null);
                }

                tool.webrtcStream != 'inProgress';
                return new Promise(function (resolve, reject) {
                    Q.Streams.get(tool.state.publisherId, tool.state.streamName, function (err) {
                        if(!this || !this.fields) {
                            console.error('Error while getting stream', err);
                            tool.webrtcStream = 'failed';
                            resolve(null);
                            return;
                        }
                        tool.webrtcStream = this;
                        resolve(tool.webrtcStream);

                    });
                });
            },
            getLivestreamStream: function () {
                var tool = this;
                if(!tool.state.publisherId || !tool.state.streamName) {
                    return Promise.resolve();
                }
                return new Promise(function (resolve, reject) {
                    Q.Streams.related(tool.state.publisherId, tool.state.streamName, 'Media/webrtc/livestream', true, { dontFilterUsers: true }, function () {   
                        resolve(this.relatedStreams[Object.keys(this.relatedStreams)[0]]);
                    });
                });
            },
            createOrUpdateWebRTCStream: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/webrtc", ["scheduleOrUpdateRoomStream"], function (err, response) {
                        let msg = Q.firstErrorMessage(err, response && response.errors);

                        if(msg) {
                            console.error(msg);
                            reject(msg);
                            return;
                        }
                        
                        resolve(response.slots.scheduleOrUpdateRoomStream);
                    }, {
                        method: 'post',
                        fields: {
                            publisherId: tool.state.publisherId,
                            streamName: tool.state.streamName,
                            meetingParams: tool.state.meetingParams
                        }
                    });
                });
            },
            declareStreamEventHandlers: function() {
                var tool = this;
               
            },
            createUI: function () {
                let tool = this;
                let parentContainer = tool.element;

                let widgetContainer = document.createElement('DIV');
                widgetContainer.className = 'webrtc-scheduler-widget';

                let topicField = document.createElement('DIV');
                topicField.className = 'webrtc-scheduler-config webrtc-scheduler-topic';
                widgetContainer.appendChild(topicField)
                let topicFieldLabel = document.createElement('DIV');
                topicFieldLabel.className = 'webrtc-scheduler-field-label';
                topicFieldLabel.innerHTML = 'Topic';
                topicField.appendChild(topicFieldLabel)
                let topicFieldInput = document.createElement('INPUT');
                topicFieldInput.placeholder = 'e.g. Daily Meeting';
                topicFieldInput.type = 'text';
                topicFieldInput.className = 'webrtc-scheduler-topic-input';
                topicField.appendChild(topicFieldInput)
                topicFieldInput.addEventListener('input', function () {
                    tool.state.meetingParams.topic = topicFieldInput.vlaue;
                });

                if(tool.state.meetingParams.topic) {
                    topicFieldInput.value = tool.state.meetingParams.topic;
                }

                /* let dateContainer = document.createElement('DIV');
                dateContainer.className = 'webrtc-scheduler-config webrtc-scheduler-date';
                widgetContainer.appendChild(dateContainer)
                dateContainer.appendChild(createDatePicker());


                let timezoneField = document.createElement('DIV');
                timezoneField.className = 'webrtc-scheduler-config webrtc-scheduler-timezone';
                widgetContainer.appendChild(timezoneField)
                let timezoneFieldLabel = document.createElement('DIV');
                timezoneFieldLabel.className = 'webrtc-scheduler-field-label';
                timezoneFieldLabel.innerHTML = 'Time Zone';
                timezoneField.appendChild(timezoneFieldLabel)
                
                // Get a list of supported timezones
                const timezones = Intl.supportedValuesOf("timeZone");
                const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

                // Create a SELECT element
                const timeZoneSelect = document.createElement("select");

                // Function to get the GMT offset for a timezone
                function getGMTOffset(timeZone) {
                    const now = new Date();
                    const formatter = new Intl.DateTimeFormat('en-US', {
                        timeZone,
                        timeZoneName: 'short'
                    });
                    const parts = formatter.formatToParts(now);
                    const offsetPart = parts.find(part => part.type === 'timeZoneName');
                    return offsetPart ? offsetPart.value : '';
                }

                // Populate the SELECT element with timezone names and offsets
                timezones.forEach(timezone => {
                    const offset = getGMTOffset(timezone);
                    const option = document.createElement("option");
                    option.value = timezone;
                    if((!tool.state.meetingParams.timeZoneString && userTimeZone == timezone) || tool.state.meetingParams.timeZoneString == timezone) option.selected = true;
                    option.textContent = `${timezone} (${offset})`;
                    timeZoneSelect.appendChild(option);
                });

                timeZoneSelect.addEventListener('change', function () {
                    tool.state.meetingParams.timeZoneString = select.value;
                })

                // Append the SELECT element to the body or a specific container
                timezoneField.appendChild(timeZoneSelect); */

                let attendeesField = document.createElement('DIV');
                attendeesField.className = 'webrtc-scheduler-config webrtc-scheduler-attendees';
                widgetContainer.appendChild(attendeesField)
                let attendeesFieldLabel = document.createElement('DIV');
                attendeesFieldLabel.className = 'webrtc-scheduler-field-label';
                attendeesFieldLabel.innerHTML = 'Attendees';
                attendeesField.appendChild(attendeesFieldLabel)

                let attendeesFieldInputCon = document.createElement('DIV');
                attendeesFieldInputCon.className = 'webrtc-scheduler-field-chooser';
                attendeesField.appendChild(attendeesFieldInputCon)

                var userChooserInput = document.createElement('INPUT');
                userChooserInput.className = 'text Media_userChooser_input webrtc-scheduler-query';
                userChooserInput.type = 'text';
                userChooserInput.name = 'query';
                userChooserInput.autocomplete = 'off';
                userChooserInput.placeholder = 'Start typing to find user';
                attendeesFieldInputCon.appendChild(userChooserInput);

                var selectedUsers = document.createElement("TABLE");
                selectedUsers.className = 'webrtc-scheduler-attendees-roles';
                attendeesField.appendChild(selectedUsers);
          

                Q.activate(
                    Q.Tool.setUpElement(attendeesFieldInputCon, 'Streams/userChooser', {}),
                    {},
                    function () {
                        this.state.onChoose.set(function (userId, avatar) {
                            tool.addInvitedUser(userId)
                        }, tool);
                    }
                );

                let accessTypeField = document.createElement('DIV');
                accessTypeField.className = 'webrtc-scheduler-config webrtc-scheduler-accessType';
                widgetContainer.appendChild(accessTypeField)

                let accessFieldLabel = document.createElement('DIV');
                accessFieldLabel.className = 'webrtc-scheduler-field-label';
                accessFieldLabel.innerHTML = 'Access Type';
                accessTypeField.appendChild(accessFieldLabel);
                
                let openFieldLabel = document.createElement('LABEL');
                openFieldLabel.className = 'webrtc-scheduler-field-label';
                accessTypeField.appendChild(openFieldLabel)
                let openFieldInput = document.createElement('INPUT');
                openFieldInput.type = 'radio';
                openFieldInput.name = 'accessType';
                openFieldInput.checked = tool.state.meetingParams.accessType == 'open';
                openFieldInput.className = 'webrtc-scheduler-accessType-input';
                openFieldLabel.appendChild(openFieldInput)
                let openFieldDesc = document.createElement('DIV');
                openFieldDesc.className = 'webrtc-scheduler-accessType-desc';
                openFieldLabel.appendChild(openFieldDesc)
                let openFieldText = document.createElement('DIV');
                openFieldText.className = 'webrtc-scheduler-accessType-text';
                openFieldText.innerHTML = 'Open';
                openFieldDesc.appendChild(openFieldText)
                let openFieldCaption = document.createElement('DIV');
                openFieldCaption.className = 'webrtc-scheduler-accessType-caption';
                openFieldCaption.innerHTML = 'Anyone can join without asking.';
                openFieldDesc.appendChild(openFieldCaption)
                
                let trustedFieldLabel = document.createElement('LABEL');
                trustedFieldLabel.className = 'webrtc-scheduler-field-label';
                accessTypeField.appendChild(trustedFieldLabel);
                let trustedFieldInput = document.createElement('INPUT');
                trustedFieldInput.type = 'radio';
                trustedFieldInput.checked = tool.state.meetingParams.accessType == 'trusted';
                trustedFieldInput.name = 'accessType';
                trustedFieldInput.className = 'webrtc-scheduler-accessType-input';
                trustedFieldLabel.appendChild(trustedFieldInput);
                let trustedFieldDesc = document.createElement('DIV');
                trustedFieldDesc.className = 'webrtc-scheduler-accessType-desc';
                trustedFieldLabel.appendChild(trustedFieldDesc);
                let trustedFieldText = document.createElement('DIV');
                trustedFieldText.className = 'webrtc-scheduler-accessType-text';
                trustedFieldText.innerHTML = 'Trusted';
                trustedFieldDesc.appendChild(trustedFieldText);
                let trustedFieldCaption = document.createElement('DIV');
                trustedFieldCaption.className = 'webrtc-scheduler-accessType-caption';
                trustedFieldCaption.innerHTML = 'Only invited people can join. Everyone else must ask to join.';
                trustedFieldDesc.appendChild(trustedFieldCaption);

                openFieldInput.addEventListener('click', onAccessTypeChange);
                trustedFieldInput.addEventListener('click', onAccessTypeChange);

                let scheduleLivestream = document.createElement('DIV');
                scheduleLivestream.className = 'webrtc-scheduler-config webrtc-scheduler-livestream';
                widgetContainer.appendChild(scheduleLivestream)
                let livestreamLabel = document.createElement('LABEL');
                livestreamLabel.className = 'webrtc-scheduler-field-label';
                scheduleLivestream.appendChild(livestreamLabel);
                let livestreamInput = document.createElement('INPUT');
                livestreamInput.type = 'checkbox';
                livestreamInput.checked = tool.state.meetingParams.scheduleLivestream;
                livestreamInput.name = 'scheduleLivestream';
                livestreamInput.className = 'webrtc-scheduler-scheduleLivestream-input';
                livestreamLabel.appendChild(livestreamInput);
                let livestreaDesc = document.createElement('DIV');
                livestreaDesc.className = 'webrtc-scheduler-livestream-desc';
                livestreamLabel.appendChild(livestreaDesc);
                let livestreaText = document.createElement('DIV');
                livestreaText.className = 'webrtc-scheduler-livestream-text';
                livestreaText.innerHTML = 'Schedule live stream';
                livestreaDesc.appendChild(livestreaText);

                tool.getLivestreamStream().then(function(stream) {
                    if (!stream) return;
                    let livestreaShare = document.createElement('DIV');
                    livestreaShare.className = 'webrtc-scheduler-livestream-share';
                    scheduleLivestream.appendChild(livestreaShare);
                    let livestreaShareBtn = document.createElement('BUTTON');
                    livestreaShareBtn.className = 'Q_button';
                    livestreaShare.appendChild(livestreaShareBtn);
                    let livestreaShareBtnText = document.createElement('SPAN');
                    livestreaShareBtnText.className = 'webrtc-scheduler-livestream-share-text';
                    livestreaShareBtnText.innerHTML = 'Share Livestream';
                    livestreaShareBtn.appendChild(livestreaShareBtnText);
                    let livestreaShareBtnIcon = document.createElement('SPAN');
                    livestreaShareBtnIcon.className = 'webrtc-scheduler-livestream-share-icon';
                    livestreaShareBtnIcon.innerHTML = _icons.shareIcon;
                    livestreaShareBtn.appendChild(livestreaShareBtnIcon);

                    livestreaShareBtn.addEventListener('click', function () {
                        Q.Streams.invite(stream.fields.publisherId, stream.fields.name, { 
                            title: 'Share Livestream',
                            addLabel: [],
                            addMyLabel: [] 
                        });
                    });
                });

                let buttons = document.createElement('DIV');
                buttons.className = 'webrtc-scheduler-buttons';
                widgetContainer.appendChild(buttons);

                let result = document.createElement('DIV');
                result.className = 'webrtc-scheduler-result';
                buttons.appendChild(result);

                let cancelButton = document.createElement('DIV');
                cancelButton.className = 'Q_button webrtc-scheduler-button-cancel';
                cancelButton.innerHTML = 'Cancel';
                buttons.appendChild(cancelButton);

                let okButton = document.createElement('DIV');
                okButton.className = 'Q_button webrtc-scheduler-button-ok';
                okButton.innerHTML = 'Save';
                buttons.appendChild(okButton);


                okButton.addEventListener('click', function () {
                    okButton.classList.add('Q_working');
                    tool.state.meetingParams.topic = topicFieldInput.value;
                    //tool.state.meetingParams.startTimeTs = tool.startTimePicker.getTime();
                    //tool.state.meetingParams.endTimeTs = tool.endTimePicker.getTime();
                    //tool.state.meetingParams.timeZoneString = timeZoneSelect.value;
                    tool.state.meetingParams.accessType = trustedFieldInput.checked ? 'trusted' : 'open';
                    tool.state.meetingParams.scheduleLivestream = livestreamInput.checked;

                    tool.createOrUpdateWebRTCStream().then(function (resoponse) {
                        okButton.classList.remove('Q_working');
                        result.innerHTML = '';
                        let successEl = document.createElement('SPAN');
                        successEl.className = 'webrtc-scheduler-result-suucess';
                        successEl.innerHTML = tool.state.publisherId ? 'Meeting updated' : 'Meeting scheduled';
                        result.appendChild(successEl);
                        
                        Q.handle(tool.state.onSave, null, [resoponse]);
                    }).catch(function (msg) {
                        result.innerHTML = '';
                        let errorEl = document.createElement('SPAN');
                        errorEl.className = 'webrtc-scheduler-result-error';
                        errorEl.innerHTML = msg;
                        result.appendChild(errorEl);

                        okButton.classList.remove('Q_working');
                    });
                    
                });

                parentContainer.appendChild(widgetContainer);

                function onAccessTypeChange() {
                    if(trustedFieldInput.checked) {
                        tool.state.meetingParams.accessType = 'trusted';
                    } else {
                        tool.state.meetingParams.accessType = 'open';
                    }
                }

                /* if(!tool.state.publisherId) {
                    tool.addInvitedUser(Q.Users.loggedInUserId());
                } */
                tool.addInvitedUser = function(userId, inviteRow) {             
                    if(tool.state.meetingParams.invitedAttendeesIds.indexOf(userId) !== -1) {
                        return;
                    }
                    tool.state.meetingParams.invitedAttendeesIds.push(userId);
                    var userItem = document.createElement("TR");
                    userItem.className = 'webrtc-scheduler-attendees-roles-item';
                    var userItemAvatar = document.createElement("TD");
                    userItemAvatar.className = 'webrtc-scheduler-attendees-roles-avatar';
                    userItem.appendChild(userItemAvatar);

                    var state = document.createElement("TD");
                    state.className = 'webrtc-scheduler-attendees-roles-state';
                    state.innerHTML = inviteRow ? inviteRow.fields.state : 'new';
                    userItem.appendChild(state);
                  
                    var removeUser = document.createElement("TD");
                    var removeUserBtns = document.createElement("DIV");
                    removeUserBtns.className = 'webrtc-scheduler-attendees-buttons';
                    removeUser.appendChild(removeUserBtns);
                    userItem.appendChild(removeUser);

                    var removeUserBtn = document.createElement("DIV");
                    removeUserBtn.className = 'webrtc-scheduler-attendees-roles-item-remove';
                    removeUserBtn.innerHTML = _icons.removeItem;
                    removeUserBtns.appendChild(removeUserBtn);

                    selectedUsers.appendChild(userItem)

                    Q.activate(
                        Q.Tool.setUpElement(
                            userItemAvatar, // or pass an existing element
                            "Users/avatar",
                            {
                                userId: userId,
                                icon: 40,
                                contents: true
                            }
                        )
                    );

                    removeUser.addEventListener('click', function () {
                        if (userItem.parentElement != null) {
                            let ids = tool.state.meetingParams.invitedAttendeesIds;
                            for(let p = ids.length - 1; p >= 0; p--) {
                                if(ids[p] == userId) {
                                    ids.splice(p, 1);
                                    break;
                                }
                            }
                            userItem.parentElement.removeChild(userItem);
                        }
                    });
                }

                function createDatePicker() {
                    if(2 < 1) {
                        let container = document.createElement('DIV');
                        container.className = 'webrtc-scheduler-datetime-input';

                        let startDateTimeCon = document.createElement("DIV");
                        startDateTimeCon.className = 'webrtc-scheduler-datetime-start';
                        container.appendChild(startDateTimeCon);

                        let startDateCon = document.createElement("DIV");
                        startDateCon.className = 'webrtc-scheduler-datetime-date';
                        container.appendChild(startDateCon);

                        let dateDiv = document.createElement("DIV");
                        dateDiv.className = 'webrtc-scheduler-date-btn';
                        startDateCon.appendChild(dateDiv);

                        let datetimeInput = document.createElement('INPUT');
                        datetimeInput.className = 'webrtc-scheduler-date-input';
                        datetimeInput.type = 'date';
                        datetimeInput.style.position = 'absolute';
                        datetimeInput.style.opacity = '0';
                        datetimeInput.style.width = '100%';
                        datetimeInput.style.height = '100%';
                        startDateCon.appendChild(datetimeInput);

                        let startTimeCon = document.createElement("DIV");
                        startTimeCon.className = 'webrtc-scheduler-datetime-date';
                        container.appendChild(startTimeCon);

                        let timeDiv = document.createElement("DIV");
                        timeDiv.className = 'webrtc-scheduler-time-btn';
                        startTimeCon.appendChild(timeDiv);

                        let timeInput = document.createElement('INPUT');
                        timeInput.className = 'webrtc-scheduler-date-input';
                        timeInput.type = 'date';
                        timeInput.style.position = 'absolute';
                        timeInput.style.opacity = '0';
                        timeInput.style.width = '100%';
                        timeInput.style.height = '100%';
                        startTimeCon.appendChild(timeInput);

                        //new TimePicker();


                        dateDiv.addEventListener('click', function () {
                            datetimeInput.style.display = 'inline'; // Ensure input is visible for interaction
                            datetimeInput.focus(); // Focus the input
                            datetimeInput.click(); // Simulate a click
                        });
                        datetimeInput.addEventListener('change', function () {
                            const dateValue = datetimeInput.value; // Get the value in YYYY-MM-DD format
                            if (dateValue) {
                              // Convert to a Date object
                              const date = new Date(dateValue);

                              const defaultFormatter = new Intl.DateTimeFormat();
                              const options = defaultFormatter.resolvedOptions();
                              const formattedDate = defaultFormatter.format(date);
                              // Format according to OS locale settings
                      
                              // Display the formatted date
                              dateDiv.innerHTML = formattedDate;
                            } else {
                                dateDiv.innerHTML = 'None';
                            }
                        });

                        const today = new Date();
                        const formattedDate = today.toISOString().split('T')[0];
                        datetimeInput.value = formattedDate;
                        datetimeInput.dispatchEvent(new Event('change'));

                        return container;
                    }

                    let container = document.createElement('DIV');
                    container.className = 'webrtc-scheduler-datetime-input';

                    let startDateTimeCon = document.createElement("DIV");
                    startDateTimeCon.className = 'webrtc-scheduler-datetime-start';
                    container.appendChild(startDateTimeCon);

                    tool.startTimePicker = new TimePicker(startDateTimeCon, tool.state.meetingParams.startTimeTs ? new Date(tool.state.meetingParams.startTimeTs) : null);     
                    tool.startTimePicker.onTimeUpdate.add(function (dateInstance) {
                        tool.state.meetingParams.startTimeTs = dateInstance.getTime();
                    }, tool);

                    let toDate = document.createElement("DIV");
                    toDate.className = 'webrtc-scheduler-datetime-todate';
                    toDate.innerHTML = 'to';
                    container.appendChild(toDate);

                    let endTimeCon = document.createElement("DIV");
                    endTimeCon.className = 'webrtc-scheduler-datetime-end';
                    container.appendChild(endTimeCon);

                    tool.endTimePicker = new TimePicker(endTimeCon, tool.state.meetingParams.endTimeTs ? new Date(tool.state.meetingParams.endTimeTs) : null);
                    tool.endTimePicker.onTimeUpdate.add(function (dateInstance) {
                        tool.state.meetingParams.endTimeTs = dateInstance.getTime();
                    }, tool);
                    
                    return container;
                }
               
                function TimePicker(htmlElement, dateInstance) {
                    let thisTimePicker= this;
                    let _datePicker = generateCalendar(new Date());
                    let _dateInstance = dateInstance ? dateInstance : new Date();
                    let yearCalendarPopup = null;
                    let validationPopup = null;
                    let timeFormat24h = has24hFormat();

                    this.onTimeUpdate = new Q.Event();
                    
                    this.getTime = function() {
                        return _dateInstance.getTime();
                    }

                    function _onTimeUpdate(){
                        Q.handle(thisTimePicker.onTimeUpdate, null, [_dateInstance]);
                    }
                    
                    let container = document.createElement('DIV');
                    container.className = 'media-time-picker';

                    let yearCon = document.createElement("DIV");
                    yearCon.className = 'media-time-picker-year';
                    container.appendChild(yearCon);
                    let dateValidation = document.createElement("DIV");
                    dateValidation.className = 'media-time-picker-invalid';
                    //yearCon.appendChild(dateValidation);

                    Q.activate(
                        Q.Tool.setUpElement(
                            document.createElement('DIV'),
                            "Media/webrtc/popupDialog",
                            {
                                content: dateValidation,
                                className: 'media-calendar-popup',
                                triggerOn: '',
                                xPositionsOrder: ['middle', 'right', 'left'],
                                yPositionsOrder: ['above', 'below', 'middle', 'belowStartOfButton', 'aboveStartOfButton']

                            }
                        ),
                        {},
                        function () {
                            validationPopup = this;
                        }
                    );

                    let dateInput = document.createElement("INPUT");
                    dateInput.type = 'text';
                    dateInput.className = 'webrtc-scheduler-date-btn';
                    yearCon.appendChild(dateInput);

                    dateInput.addEventListener('input', function () {
                        if(matchesDateFormat(dateInput.value, 'dd MMM yyyy') === false && matchesDateFormat(dateInput.value, 'd MMM yyyy') === false) {
                            //showValidationTooltip('Invalid date');
                            dateValidation.innerHTML = 'Invalid date';
                            if(validationPopup) validationPopup.show(dateInput);
                        } else {
                            if(validationPopup) validationPopup.hide();
                            _datePicker.setDate(dateInput.value);
                        }
                    });
                    dateInput.value = getFormattedDate(_dateInstance, 'd MMM yyyy');
                    dateInput.dispatchEvent(new Event('input'));

                    Q.activate(
                        Q.Tool.setUpElement(
                            dateInput,
                            "Media/webrtc/popupDialog",
                            {
                                content: _datePicker.getCalendar(),
                                className: 'media-calendar-popup',
                                triggerOn: 'lmb',
                                xPositionsOrder: ['right', 'left', 'middle']
                            }
                        ),
                        {},
                        function () {
                            yearCalendarPopup = this;
                        }
                    );

                    _datePicker.onDateSelect(function (formattedDate, dateInstance) {
                        dateInput.value = formattedDate;
                        _dateInstance.setFullYear(dateInstance.getFullYear());
                        _dateInstance.setMonth(dateInstance.getMonth());
                        _dateInstance.setDate(dateInstance.getDate());
                        _onTimeUpdate();
                        //yearCalendarPopup.hide();
                    });

                    //_datePicker.setToday();


                    let timeCon = document.createElement("DIV");
                    timeCon.className = 'media-time-picker-time';
                    container.appendChild(timeCon);

                    let timeInput = document.createElement('INPUT');
                    timeInput.type = 'text';
                    timeInput.className = 'media-time-picker-value';
                    timeCon.appendChild(timeInput);
                    let timeDropdown = generateTimeDropDown();

                    timeInput.addEventListener('input', function () {
                        if(isValidTimeFormat(timeInput.value)) {
                            const amPmRegex = /\b(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)\b/i;

                            if(amPmRegex.test(timeInput.value)) {
                                let dateInstance = convertTo24HourFormat(timeInput.value);
                                _dateInstance.setHours(dateInstance.getHours());
                                _dateInstance.setMinutes(dateInstance.getMinutes());
                            } else {
                                let dateInstance = new Date(`1970-01-01T${timeInput.value}:00`);
                                _dateInstance.setHours(dateInstance.getHours());
                                _dateInstance.setMinutes(dateInstance.getMinutes());
                            }
                            _onTimeUpdate();
                            if(validationPopup) validationPopup.hide();

                        } else {
                            dateValidation.innerHTML = 'Invalid time';
                            if(validationPopup) validationPopup.show(timeInput);
                        }
                    });

                    timeInput.value = timeFormat24h ? getFormatted24hTime(_dateInstance) : getFormattedAmPmTime(_dateInstance);
                    timeInput.dispatchEvent(new Event('input'));

                    timeDropdown.onTimeSlected(function(formattedTime, dateInstance) {
                        timeInput.value = formattedTime;
                        _dateInstance.setHours(dateInstance.getHours());
                        _dateInstance.setMinutes(dateInstance.getMinutes());
                        _onTimeUpdate();
                    });

                    Q.activate(
                        Q.Tool.setUpElement(
                            timeInput,
                            "Media/webrtc/popupDialog",
                            {
                                content: timeDropdown.getTimePicker(),
                                className: '',
                                triggerOn: 'lmb',
                                xPositionsOrder: ['right', 'left', 'middle']
                            }
                        ),
                        {},
                        function () {
                           
                        }
                    );
                    

                    htmlElement.appendChild(container);

                    function getFormatted24hTime(date) {
                        if(!date) date = new Date();
                        const hours = date.getHours().toString().padStart(2, '0'); // Get hours and pad to 2 digits
                        const minutes = date.getMinutes().toString().padStart(2, '0'); // Get minutes and pad to 2 digits

                        const formatted = `${hours}:${minutes}`;
                        return formatted;
                    }

                    function getFormattedAmPmTime(date) {
                        if(!date) date = new Date();
                    
                        let hours = date.getHours();
                        const minutes = date.getMinutes().toString().padStart(2, '0');
                        const period = hours >= 12 ? 'PM' : 'AM';
                    
                        hours = hours % 12 || 12; // Convert to 12-hour format, replacing 0 with 12
                        return `${hours}:${minutes} ${period}`;
                    }

                    function convertTo24HourFormat(time) {
                        const [timePart, modifier] = time.split(" ");
                        let [hours, minutes] = timePart.split(":").map(Number);

                        if (modifier === "PM" && hours !== 12) {
                            hours += 12;
                        } else if (modifier === "AM" && hours === 12) {
                            hours = 0;
                        }

                        let format24String = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
                        return new Date(`1970-01-01T${format24String}:00`);
                    }

                    function isValidTimeFormat(timeString) {
                        const amPmRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
                        const twentyFourHourRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

                        return amPmRegex.test(timeString) || twentyFourHourRegex.test(timeString);
                    }

                    function matchesDateFormat(dateString, format) {
                        const regexMap = {
                            yyyy: '\\d{4}',
                            MM: '(0[1-9]|1[0-2])',
                            dd: '(0[1-9]|[1-2][0-9]|3[0-1])',
                            d: '([1-9]|[1-2][0-9]|3[0-1])',
                            MMM: '[A-Za-z]{3}',
                            MMMM: '[A-Za-z]+',
                            HH: '([0-1][0-9]|2[0-3])',
                            mm: '[0-5][0-9]',
                            ss: '[0-5][0-9]'
                        };
                    
                        let regexString = format.replace(/yyyy|MMMM|MMM|MM|dd|d|HH|mm|ss/g, matched => regexMap[matched]);
                        const regex = new RegExp(`^${regexString}$`);
                    
                        return regex.test(dateString);
                    }
                    

                    function generateTimeDropDown() {
                        let _currentTime = new Date();
                        let _onTimeSelect = new Q.Event();
                        let timeFormat24h = has24hFormat();
                        let timePicker;
                        if (!timeFormat24h) {
                            timePicker = document.createElement('DIV');
                            timePicker.className = 'media-time-picker-hours';
                    
                            let timePickerInner = document.createElement('DIV');
                            timePickerInner.className = 'media-time-picker-hours-inner';
                            timePicker.appendChild(timePickerInner);
                    
                            let timeValues = generateTimeArray(15);
                    
                            for (let i in timeValues) {
                                let hourItem = document.createElement('DIV');
                                hourItem.className = 'media-time-picker-list-item media-time-picker-hours-hour';
                                hourItem.innerHTML = timeValues[i].formattedTime;
                                timePickerInner.appendChild(hourItem);
                    
                                hourItem.addEventListener('click', function () {
                                    _currentTime.setHours();
                                    Q.handle(_onTimeSelect, null, [timeValues[i].formattedTime, timeValues[i].dateInstance]);
                                });
                            }
                        } else {
                            timePicker = document.createElement('DIV');
                            timePicker.className = 'media-time-picker-hours media-time-picker-24h';
                    
                            let timePickerInner = document.createElement('DIV');
                            timePickerInner.className = 'media-time-picker-hours-inner';
                            timePicker.appendChild(timePickerInner);
                    
                            let timeValues = generateTimeArray(15, true); // Assuming true generates 24-hour format
                    
                            for (let i in timeValues) {
                                let hourItem = document.createElement('DIV');
                                hourItem.className = 'media-time-picker-list-item media-time-picker-hours-hour';
                                hourItem.innerHTML = timeValues[i].formattedTime;
                                timePickerInner.appendChild(hourItem);
                    
                                hourItem.addEventListener('click', function () {
                                    _currentTime.setHours(timeValues[i].hours, timeValues[i].minutes);
                                    Q.handle(_onTimeSelect, null, [timeValues[i].formattedTime, timeValues[i].dateInstance]);
                                });
                            }
                        }
                    
                        return {
                            getTimePicker: function () {
                                return timePicker;
                            },
                            onTimeSlected: function (callback) {
                                _onTimeSelect.add(callback, tool);
                            }
                        };
                    }

                    function has24hFormat() {
                        const now = new Date();
                        const formattedTime = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).format(now);
    
                        if (formattedTime.toLowerCase().includes('am') || formattedTime.toLowerCase().includes('pm')) {
                            return false;
                        } else {
                            return true;
                        }
                    }

                    function generateCalendar() {
                        let _onDateSelect = new Q.Event();
                        let _currentShownDate = new Date();
                        let _daysGrid = null;
                        let allGeneratedDates = new Map();
                        let allGeneratedMonths = new Map();
                    
                        let calendarContainer = document.createElement('DIV');
                        calendarContainer.className = 'media-calendar';
                    
                        let calendarHeader = document.createElement('DIV');
                        calendarHeader.className = 'media-calendar-header';
                        calendarContainer.appendChild(calendarHeader);
                    
                        let calendarCurrent = document.createElement('DIV');
                        calendarCurrent.className = 'media-calendar-current';
                        calendarHeader.appendChild(calendarCurrent);
                    
                        let controls = document.createElement('DIV');
                        controls.className = 'media-calendar-controls';
                        calendarHeader.appendChild(controls);
                    
                        let calendarPrev = document.createElement('DIV');
                        calendarPrev.className = 'media-calendar-prev';
                        calendarPrev.innerHTML = _icons.prev;
                        calendarPrev.addEventListener('click', () => {
                            const prevMonthDate = new Date(_currentShownDate.getFullYear(), _currentShownDate.getMonth() - 1, 1);
                            showMonth(prevMonthDate);

                        });
                        controls.appendChild(calendarPrev);
                    
                        let calendarNext = document.createElement('DIV');
                        calendarNext.className = 'media-calendar-next';
                        calendarNext.innerHTML = _icons.next;
                        calendarNext.addEventListener('click', () => {
                            const nextMonthDate = new Date(_currentShownDate.getFullYear(), _currentShownDate.getMonth() + 1, 1);
                            showMonth(nextMonthDate);
                        });
                        controls.appendChild(calendarNext);
                    
                        _daysGrid = document.createElement('DIV');
                        _daysGrid.className = 'media-calendar-days-grid';
                        calendarContainer.appendChild(_daysGrid);
                    
                        let todayBtn = document.createElement('DIV');
                        todayBtn.className = 'media-calendar-days-today';
                        todayBtn.innerHTML = 'Today';
                        calendarContainer.appendChild(todayBtn);

                        todayBtn.addEventListener('click', setToday);
                    
                        _daysGrid.appendChild(generateDays(_currentShownDate));

                        function showMonth(date) {
                            if(!date) date = _currentShownDate; 
                            _daysGrid.innerHTML = '';
                            const newCalendar = generateDays(date);
                            _daysGrid.appendChild(newCalendar);
                        }
                    
                        function generateDays(date) {
                            _currentShownDate = date;
                            const month = date.getMonth(); // 0-11 (January is 0, December is 11)
                            const year = date.getFullYear();
                    
                            
                            // Days of the week
                            const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                            const daysOfWeek2 = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
                    
                            // Get the first and last day of the month
                            const firstDay = new Date(year, month, 1);
                            const lastDay = new Date(year, month + 1, 0); // Day 0 of the next month is the last day of the current month
                    
                            // Get the weekday of the first and last days
                            const firstWeekday = firstDay.getDay();
                            const lastDate = lastDay.getDate();
                    
                            calendarCurrent.innerHTML = `${firstDay.toLocaleString('default', { month: 'long' })} ${year}`;

                            let alreadyGenerated = allGeneratedMonths.get(month + '-' + year);
                            if(alreadyGenerated) {
                               return alreadyGenerated;

                            }

                            let calendarDays = document.createElement('DIV');
                            calendarDays.className = 'media-calendar-days';
                    
                            // Add the days of the week headers
                            daysOfWeek2.forEach(day => {
                                let dayHeader = document.createElement('DIV');
                                dayHeader.className = 'media-calendar-days-header';
                                dayHeader.innerHTML = day;
                                calendarDays.appendChild(dayHeader);
                            });
                    
                            // Add leading empty divs for days before the 1st of the month
                            for (let i = 0; i < firstWeekday; i++) {
                                let emptyDay = document.createElement('DIV');
                                emptyDay.className = 'media-calendar-days-empty';
                                calendarDays.appendChild(emptyDay);
                            }
                    
                            // Add the days of the month
                            const today = new Date();
                            for (let day = 1; day <= lastDate; day++) {
                                let dayItem = document.createElement('DIV');
                                dayItem.className = 'media-calendar-days-day';
                                dayItem.innerHTML = day;
                    
                                let currentDayDate = cloneDate(_currentShownDate);
                                currentDayDate.setDate(day);
                                // Highlight the current day
                                if (
                                    day === today.getDate() &&
                                    month === today.getMonth() &&
                                    year === today.getFullYear()
                                ) {
                                    dayItem.classList.add('media-calendar-now');
                                }

                                let dayObject = {
                                    dateInstance: currentDayDate,
                                    dayItemEl: dayItem
                                };

                                allGeneratedDates.set(getFormattedDate(currentDayDate, 'd MMM yyyy'), dayObject);

                                dayItem.addEventListener('click', function () {
                                    selectDate(dayObject);
                                });
                                calendarDays.appendChild(dayItem);
                            }
                            allGeneratedMonths.set(month + '-' + year, calendarDays);
                            return calendarDays;
                        }

                        function setToday() {
                            showMonth(new Date());
                            setDate(getFormattedDate(new Date(), 'd MMM yyyy'), false);
                        }

                        function selectDate(dayObject, doNotTriggerEvent = false) {
                            allGeneratedDates.forEach((value, key, map) => {
                                value.dayItemEl.classList.remove('media-calendar-selected');
                            });
                            dayObject.dayItemEl.classList.add('media-calendar-selected');

                            _currentShownDate = dayObject.dateInstance;
                            if(!doNotTriggerEvent) Q.handle(_onDateSelect, null, [getSelectedDate('d MMM yyyy'), _currentShownDate]);
                        }

                        function setDate(dateString, doNotTriggerEvent = true) {
                            let dateDayObject = allGeneratedDates.get(dateString);
                            if(dateDayObject) {
                                selectDate(dateDayObject, doNotTriggerEvent);
                            } else {
                                let date = new Date(dateString);
                                generateDays(date);
                                showMonth(date)
                                dateDayObject = allGeneratedDates.get(dateString);
                                if(dateDayObject) selectDate(dateDayObject)
                            }
                        }

                        function cloneDate(date) {
                            if (!(date instanceof Date)) {
                                throw new Error("Invalid date. Please pass a valid Date instance.");
                            }
                            return new Date(date.getTime());
                        }

                        function getSelectedDate(format) {
                            return getFormattedDate(_currentShownDate, format)
                        }
                    
                        return {
                            onDateSelect: function(callback) {
                                _onDateSelect.add(callback, tool);
                            },
                            getSelectedDate: getSelectedDate,
                            getCalendar: function () {
                                return calendarContainer;
                            },
                            setDate:setDate,
                            setToday:setToday
                        };
                    }
                    
                    
                }

                function getFormattedDate(date, format) {
                    if (!date) date = _currentShownDate;

                    if (!format) {
                        const defaultFormatter = new Intl.DateTimeFormat();
                        const options = defaultFormatter.resolvedOptions();
                        const formattedDate = defaultFormatter.format(date);

                        return formattedDate;
                    }

                    const map = {
                        yyyy: date.getFullYear(),
                        MM: (date.getMonth() + 1).toString().padStart(2, '0'),
                        dd: date.getDate().toString().padStart(2, '0'),
                        d: date.getDate(), // Day without padding
                        HH: date.getHours().toString().padStart(2, '0'),
                        mm: date.getMinutes().toString().padStart(2, '0'),
                        ss: date.getSeconds().toString().padStart(2, '0'),
                        MMM: date.toLocaleString('default', { month: 'short' }),
                        MMMM: date.toLocaleString('default', { month: 'long' })
                    };
                
                    return format.replace(/yyyy|MMMM|MMM|MM|dd|d|HH|mm|ss/g, matched => map[matched]);
                }
                
                function generateTimeArray(step, format24hours) {
                    if (step <= 0) {
                        throw new Error("Step must be a positive integer.");
                    }

                    const timeArray = [];
                  

                    if (format24hours) {
                        const start = new Date(0, 0, 0, 0, 0); // Start at 00:00
                        const end = new Date(0, 0, 0, 23, 59); // End at 23:59

                        let currentTime = new Date(start);

                        while (currentTime <= end) {
                            // Format the time as "HH:mm"
                            const hours = currentTime.getHours().toString().padStart(2, "0");
                            const minutes = currentTime.getMinutes().toString().padStart(2, "0");
                            const formattedTime = `${hours}:${minutes}`;

                            timeArray.push({
                                formattedTime: formattedTime,
                                dateInstance: new Date(currentTime.getTime())
                            });

                            // Increment the time by the step in minutes
                            currentTime.setMinutes(currentTime.getMinutes() + step);
                        }

                    } else {
                        const start = new Date(0, 0, 0, 0, 0); // Start at 12:00 AM
                        const end = new Date(0, 0, 0, 23, 45); // End at 11:45 PM
    
                        let currentTime = new Date(start);

                        while (currentTime <= end) {
                        
                            // Format the time as "hh:mm AM/PM"
                            const hours = currentTime.getHours();
                            const minutes = currentTime.getMinutes();
                            const period = hours >= 12 ? "PM" : "AM";
                            const formattedHours = hours % 12 || 12; // Convert to 12-hour format
                            const formattedMinutes = minutes.toString().padStart(2, "0");
                            const formattedTime = `${formattedHours}:${formattedMinutes} ${period}`;
    
                            timeArray.push({
                                formattedTime:formattedTime,
                                dateInstance: new Date(currentTime.getTime())
                            });
    
                            // Increment the time by the step in minutes
                            currentTime.setMinutes(currentTime.getMinutes() + step);
                        }
                    }
                   

                    return timeArray;
                }

               
            }      
        }

    );

})(window.jQuery, window);