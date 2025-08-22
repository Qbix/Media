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

    var _icons = {
        reset: '<svg id="Capa_1" enable-background="new 0 0 512.001 512.001" height="512" viewBox="0 0 512.001 512.001" width="512" xmlns="http://www.w3.org/2000/svg"><g><path d="m497 189.5h-56.88c-8.29 0-15 6.72-15 15s6.71 15 15 15h13.32v88c0 8.28 6.72 15 15 15 8.29 0 15-6.72 15-15v-88h13.56c8.28 0 15-6.72 15-15s-6.72-15-15-15z"/><path d="m169.4 219.5c8.284 0 15-6.716 15-15s-6.716-15-15-15h-43.4c-8.284 0-15 6.716-15 15v103c0 8.284 6.716 15 15 15h43.4c8.284 0 15-6.716 15-15s-6.716-15-15-15h-28.4v-21.5h25.2c8.284 0 15-6.716 15-15s-6.716-15-15-15h-25.2v-21.5z"/><path d="m386.19 219.5c8.28 0 15-6.72 15-15s-6.72-15-15-15h-43.4c-8.29 0-15 6.72-15 15v103c0 8.28 6.71 15 15 15h43.4c8.28 0 15-6.72 15-15s-6.72-15-15-15h-28.4v-21.5h25.19c8.29 0 15-6.72 15-15s-6.71-15-15-15h-25.19v-21.5z"/><path d="m70.69 322.5c3.52 0 7.06-1.23 9.91-3.74 6.22-5.47 6.82-14.95 1.35-21.17l-24.06-27.33c16.24-6.03 27.8-21.23 27.8-38.99 0-23.03-19.42-41.77-43.29-41.77h-27.38c-.01 0-.01 0-.02 0-8.28 0-15 6.72-15 15v103c0 8.28 6.72 15 15 15s15-6.72 15-15v-23.53l29.43 33.44c2.96 3.37 7.1 5.09 11.26 5.09zm-28.29-79.46c-2.94 0-7.61.01-12.26.04-.02-4.53-.05-18.84-.06-23.58h12.32c7.2 0 13.29 5.39 13.29 11.77s-6.09 11.77-13.29 11.77z"/><path d="m60.48 114.27c6.4 5.27 15.85 4.37 21.12-2.02 43.14-52.27 106.71-82.25 174.4-82.25 56.25 0 109.64 20.71 150.83 57.7h-22.31c-8.28 0-15 6.72-15 15 0 8.29 6.72 15 15 15h57.45c3.45 0 6.88-1.23 9.55-3.43 3.41-2.81 5.46-7.16 5.45-11.59v-57.42c0-8.29-6.72-15-15-15-8.29 0-15 6.71-15 15v20.2c-46.68-41.96-107.2-65.46-170.97-65.46-76.68 0-148.68 33.95-197.54 93.15-5.27 6.39-4.36 15.85 2.02 21.12z"/><path d="m256.79 292.5c-9.568.018-18.931-3.869-24.78-10.34-5.56-6.14-15.05-6.61-21.18-1.04-6.14 5.56-6.61 15.05-1.05 21.18 11.611 12.844 28.845 20.207 47.01 20.2 22.74 0 41.85-14.59 45.44-34.69 2.71-15.2-4.09-35.03-31.3-45.07-5.32-1.95-10.47-3.99-14.93-5.8-5.86-2.39-10.51-4.39-12.72-5.36-1.69-1.5-1.71-3.47-1.55-4.58.2-1.41 1.26-4.88 6.7-6.52 2.58-.78 5.13-1.04 7.57-.94 10.36.38 18.72 7.03 18.83 7.12 8.08 4.11 17.53 1.22 21.33-5.51 2.98-5.27 2.17-12.34-2.13-17.54-11.23-9.83-24.73-14.4-38.03-14.3-5.49.03-10.96.87-16.22 2.45-15.02 4.52-25.65 16.39-27.75 30.98-1.97 13.73 3.99 26.95 15.55 34.49.66.43 1.36.81 2.08 1.13.54.24 12.24 5.45 26.34 10.83 1.49.56 3.01 1.13 4.54 1.7 3.14 1.15 13.27 5.4 12.15 11.65-.85 4.79-7.18 9.96-15.9 9.96z"/><path d="m449.24 397.73c-6.38-5.27-15.84-4.37-21.11 2.02-42.66 51.69-105.29 81.58-172.13 82.24-56.961.583-111.386-20.199-153.1-57.69h22.31c8.28 0 15-6.72 15-15 0-8.29-6.72-15-15-15h-57.45c-8.06-.15-15.15 6.96-15 15.02v57.42c0 8.29 6.72 15 15 15 8.29 0 15-6.71 15-15v-20.2c47.205 42.46 108.759 66.036 173.24 65.45 75.83-.66 146.89-34.52 195.27-93.14 5.27-6.39 4.36-15.85-2.03-21.12z"/></g></svg>'
    }

    function log() { }
    if (Q.Media.WebRTCdebugger) {
        log = Q.Media.WebRTCdebugger.createLogMethod('permissions.js')
    }

    /**
     * Media/webrtc/permissionsManager tool.
     * Manages users permissions to publish mic/camera/screen into WebRTC room
     * @module Media
     * @class Media webrtc
     * @constructor
     * @param {Object} options
     *  Hash of possible options
     */
    Q.Tool.define("Media/webrtc/permissionsManager", function (options) {
        var tool = this;
        tool.participantsList = [];
        tool.participantsContainerEl = null;
        tool.participantsListEl = null;
        tool.allParticipantsItemEl = null;
        tool.permissionsManagerUI = null;
        tool.roomStream = null;

        tool.loadStyles().then(function () {
            tool.loadRoomStream().then(function () {
                tool.createList();
                tool.declareEventsHandlers();
                tool.refreshList();
                Q.handle(tool.state.onLoad, tool, []);
            });
        });
    },

        {
            publisherId: null,
            streamName: null,
            onRefresh: new Q.Event(),
        },

        {
            loadStyles: function () {
                return new Promise(function (resolve, reject) {
                    Q.addStylesheet('{{Media}}/css/tools/webrtcPermissionManager.css?ts=' + Date.now(), function () {
                        Q.handle(resolve, this);
                    });
                });
            },
            loadRoomStream: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.Streams.get(tool.state.publisherId, tool.state.streamName, function (err, stream) {

                        tool.roomStream = stream;
                        resolve(stream);
                    });
                });
            },
            declareEventsHandlers: function () {
                var tool = this;
                var roomStream = tool.roomStream;

                roomStream.onMessage("Media/webrtc/joined").set(function (message) {
                    log('ParticipantsList: Streams/participating', message);
                    tool.addParticipantItem(message.byUserId);
                }, tool);

                roomStream.onMessage("Media/webrtc/left").set(function (message) {
                    log('ParticipantsList: Streams/participating', message);
                    tool.removeParticipantItem(message.byUserId);
                }, tool);

                roomStream.onMessage("Media/webrtc/globalPermissionsAdded").set(function (message) {
                    log('ParticipantsList: Media/webrtc/globalPermissionsAdded', message);
                    var message = JSON.parse(message.instructions);
                    if (!message.access) {
                        return console.warn('No access updated');
                    }
                    tool.refreshPublicPermissions(message.access);
                }, tool);

                roomStream.onMessage("Media/webrtc/globalPermissionsRemoved").set(function (message) {
                    log('ParticipantsList: Media/webrtc/globalPermissionsRemoved', message);
                    var message = JSON.parse(message.instructions);
                    if (!message.access) {
                        return console.warn('No access updated');
                    }
                    tool.refreshPublicPermissions(message.access);
                }, tool);

                roomStream.onMessage("Media/webrtc/personalPermissionsAdded").set(function (message) {
                    log('ParticipantsList: Media/webrtc/personalPermissionsAdded', message);
                    var message = JSON.parse(message.instructions);
                    if (!message.access || !message.ofUserId) {
                        return console.warn('No access updated');
                    }
                    tool.refreshPersonalPermissions(message.access, message.ofUserId);
                }, tool);

                roomStream.onMessage("Media/webrtc/personalPermissionsRemoved").set(function (message) {
                    log('ParticipantsList: Media/webrtc/personalPermissionsRemoved', message);
                    var message = JSON.parse(message.instructions);
                    if (!message.access || !message.ofUserId) {
                        return console.warn('No access updated');
                    }

                    tool.refreshPersonalPermissions(message.access, message.ofUserId);
                }, tool);

                roomStream.onMessage("Media/webrtc/resetPersonalPermissions").set(function (message) {
                    log('ParticipantsList: Media/webrtc/resetPersonalPermissions', message);
                    var message = JSON.parse(message.instructions);
                    if (!message.access || !message.ofUserId) {
                        return console.warn('No access updated');
                    }

                    tool.refreshPersonalPermissions(message.access, message.ofUserId);
                }, tool);

                roomStream.onMessage("Media/webrtc/addOrRemoveCohost").set(function (message) {
                    var insturctions = JSON.parse(message.instructions);
                    if (!insturctions.ofUserId) {
                        return;
                    }

                    tool.refreshList();
                });
            },
            createList: function () {
                var tool = this;
                let container = tool.permissionsManagerUI = document.createElement('DIV');
                container.className = 'webrtc-permissions-container';

                //container.appendChild(tool.createAccessSettings());

                let table = tool.permissionsTableEl = document.createElement('TABLE');
                table.style.width = '100%';
                table.setAttribute('border', '0');
                container.appendChild(table);


            },
            refreshList: function () {
                var tool = this;

                tool.loadAllParticipants().then(function (roomParticipants) {
                    log('ParticipantsList: refreshList');
                    if (tool.permissionsTableEl) tool.permissionsTableEl.innerHTML = '';
                    tool.participantsList = [];


                    let allpermissions = tool.roomStream.fields.permissions ? JSON.parse(tool.roomStream.fields.permissions) : [];
                    let micIsNotAllowed = allpermissions.indexOf('mic') == -1;
                    let cameraIsNotAllowed = allpermissions.indexOf('camera') == -1;
                    let screenIsNotAllowed = allpermissions.indexOf('screen') == -1;

                    let namesTr = document.createElement('TR');
                    tool.permissionsTableEl.appendChild(namesTr);
                    let permissionsTh = document.createElement('TH');
                    permissionsTh.innerHTML = 'Permissions:';
                    namesTr.appendChild(permissionsTh);
                    let permissionsMic = document.createElement('TH');
                    permissionsMic.innerHTML = 'Microphone';
                    namesTr.appendChild(permissionsMic);
                    let permissionsCamera = document.createElement('TH');
                    permissionsCamera.innerHTML = 'Camera';
                    namesTr.appendChild(permissionsCamera);
                    let permissionsScreen = document.createElement('TH');
                    permissionsScreen.innerHTML = 'Screen sharing';
                    namesTr.appendChild(permissionsScreen);

                    let globalTr = document.createElement('TR');
                    globalTr.className = 'webrtc-permissions-item-con';
                    tool.permissionsTableEl.appendChild(globalTr);
                    let permissionsName = document.createElement('TD');
                    permissionsName.innerHTML = 'All Users:';
                    globalTr.appendChild(permissionsName);
                    let globalMicTd = document.createElement('TD');
                    globalMicTd.className = 'webrtc-permissions-item-box';
                    globalTr.appendChild(globalMicTd);
                    let micPermissionInput = document.createElement('INPUT');
                    micPermissionInput.type = 'checkbox';
                    micPermissionInput.checked = micIsNotAllowed == true ? false : true;
                    globalMicTd.appendChild(micPermissionInput);

                    micPermissionInput.addEventListener('click', function () {
                        micPermissionInput.classList.add('Q_working');
                        if (micPermissionInput.checked) {
                            tool.addOrRemoveGlobalPermission('mic', 'add')
                                .then(function () {
                                    micPermissionInput.classList.remove('Q_working');
                                })
                                .catch(function (err) {
                                    micPermissionInput.checked = false;
                                    micPermissionInput.classList.remove('Q_working');
                                });
                        } else {
                            tool.addOrRemoveGlobalPermission('mic', 'remove')
                                .then(function () {
                                    micPermissionInput.classList.remove('Q_working');
                                })
                                .catch(function (err) {
                                    micPermissionInput.checked = true;
                                    micPermissionInput.classList.remove('Q_working');
                                });
                        }
                    });

                    let globalCameraTd = document.createElement('TD');
                    globalCameraTd.className = 'webrtc-permissions-item-box';
                    globalTr.appendChild(globalCameraTd);
                    let cameraPermissionInput = document.createElement('INPUT');
                    cameraPermissionInput.type = 'checkbox';
                    cameraPermissionInput.checked = cameraIsNotAllowed == true ? false : true;
                    globalCameraTd.appendChild(cameraPermissionInput);

                    cameraPermissionInput.addEventListener('click', function () {
                        cameraPermissionInput.classList.add('Q_working');
                        if (cameraPermissionInput.checked) {
                            tool.addOrRemoveGlobalPermission('camera', 'add')
                                .then(function () {
                                    cameraPermissionInput.classList.remove('Q_working');
                                })
                                .catch(function (err) {
                                    cameraPermissionInput.checked = false;
                                    cameraPermissionInput.classList.remove('Q_working');
                                });
                        } else {
                            tool.addOrRemoveGlobalPermission('camera', 'remove')
                                .then(function () {
                                    cameraPermissionInput.classList.remove('Q_working');
                                })
                                .catch(function (err) {
                                    cameraPermissionInput.checked = true;
                                    cameraPermissionInput.classList.remove('Q_working');
                                });
                        }
                    });

                    let globalScreen = document.createElement('TD');
                    globalScreen.className = 'webrtc-permissions-item-box';
                    globalTr.appendChild(globalScreen);
                    let screenPermissionInput = document.createElement('INPUT');
                    screenPermissionInput.type = 'checkbox';
                    screenPermissionInput.checked = screenIsNotAllowed == true ? false : true;
                    globalScreen.appendChild(screenPermissionInput);

                    screenPermissionInput.addEventListener('click', function () {
                        screenPermissionInput.classList.add('Q_working');
                        if (screenPermissionInput.checked) {
                            tool.addOrRemoveGlobalPermission('screen', 'add')
                                .then(function () {
                                    screenPermissionInput.classList.remove('Q_working');
                                })
                                .catch(function (err) {
                                    screenPermissionInput.checked = false;
                                    screenPermissionInput.classList.remove('Q_working');
                                });
                        } else {
                            tool.addOrRemoveGlobalPermission('screen', 'remove')
                                .then(function () {
                                    screenPermissionInput.classList.remove('Q_working');
                                })
                                .catch(function (err) {
                                    screenPermissionInput.checked = true;
                                    screenPermissionInput.classList.remove('Q_working');
                                });
                        }
                    });

                    let controlsCell = document.createElement('TD');
                    controlsCell.className = 'webrtc-permissions-item-controls';
                    globalTr.appendChild(controlsCell);

                    for (var i in roomParticipants) {
                        tool.addParticipantItem(roomParticipants[i].fields.userId);
                    }

                    Q.handle(tool.state.onRefresh, tool, []);
                });
            },
            refreshPublicPermissions: function (updatedAccess) {
                var tool = this;
                if (!updatedAccess.permissions) return;
                let micIsAllowed = updatedAccess.permissions.indexOf('mic') != -1;
                let cameraIsAllowed = updatedAccess.permissions.indexOf('camera') != -1;
                let screenIsAllowed = updatedAccess.permissions.indexOf('screen') != -1;
                for (let i = tool.participantsList.length - 1; i >= 0; i--) {
                    if (tool.participantsList[i].personalAccess == true) {
                        continue;
                    }

                    if (micIsAllowed) {
                        tool.participantsList[i].micCheckbox.checked = true;
                    } else {
                        tool.participantsList[i].micCheckbox.checked = false;
                    }

                    if (cameraIsAllowed) {
                        tool.participantsList[i].cameraCheckbox.checked = true;
                    } else {
                        tool.participantsList[i].cameraCheckbox.checked = false;
                    }

                    if (screenIsAllowed) {
                        tool.participantsList[i].screenCheckbox.checked = true;
                    } else {
                        tool.participantsList[i].screenCheckbox.checked = false;
                    }

                    if (updatedAccess.personalAccess) {
                        tool.participantsList[i].resetButton.classList.remove('webrtc-permissions-disabled');
                    } else {
                        tool.participantsList[i].resetButton.classList.add('webrtc-permissions-disabled');
                    }
                }
            },
            refreshPersonalPermissions: function (updatedAccess, ofUserId) {
                var tool = this;
                if (!updatedAccess.permissions) return;
                let micIsAllowed = updatedAccess.permissions.indexOf('mic') != -1;
                let cameraIsAllowed = updatedAccess.permissions.indexOf('camera') != -1;
                let screenIsAllowed = updatedAccess.permissions.indexOf('screen') != -1;
                for (let i = tool.participantsList.length - 1; i >= 0; i--) {
                    if (tool.participantsList[i].userId != ofUserId) {
                        continue;
                    }
                    tool.participantsList[i].personalAccess = updatedAccess.personalAccess;

                    if (micIsAllowed) {
                        tool.participantsList[i].micCheckbox.checked = true;
                    } else {
                        tool.participantsList[i].micCheckbox.checked = false;
                    }

                    if (cameraIsAllowed) {
                        tool.participantsList[i].cameraCheckbox.checked = true;
                    } else {
                        tool.participantsList[i].cameraCheckbox.checked = false;
                    }

                    if (screenIsAllowed) {
                        tool.participantsList[i].screenCheckbox.checked = true;
                    } else {
                        tool.participantsList[i].screenCheckbox.checked = false;
                    }

                    if (updatedAccess.personalAccess) {
                        tool.participantsList[i].resetButton.classList.remove('webrtc-permissions-disabled');
                    } else {
                        tool.participantsList[i].resetButton.classList.add('webrtc-permissions-disabled');
                    }

                    break;
                }
            },
            addParticipantItem: function (userId) {
                var tool = this;
                if (userId == Q.Users.loggedInUserId()) return;
                //if (participantInstance.access.isAdmin || (participantInstance.access.isCohost && !localParticipant.access.isAdmin)) return;
                log('ParticipantsList: addParticipantItem');
                function ListItem() {
                    let listItemInstance = this;
                    this.userId = null;
                    this.itemEl = null;
                    this.micCheckbox = null;
                    this.cameraCheckbox = null;
                    this.screenCheckbox = null;
                    this.personalAccess = false;
                    this.remove = function () {
                        if (this.itemEl && this.itemEl.parentElement) {
                            this.itemEl.parentElement.removeChild(this.itemEl);
                        }

                        for (let i = tool.participantsList.length - 1; i >= 0; i--) {
                            if (tool.participantsList[i] == listItemInstance) {
                                tool.participantsList.splice(i, 1);
                                break;
                            }
                        }
                    }
                }
                tool.getUserPermission(userId).then(function (access) {
                    let userPermissions = access.permissions ? access.permissions : [];
                    let micIsNotAllowed = userPermissions.indexOf('mic') == -1;
                    let cameraIsNotAllowed = userPermissions.indexOf('camera') == -1;
                    let screenIsNotAllowed = userPermissions.indexOf('screen') == -1;

                    let listItemInstance = new ListItem();
                    listItemInstance.userId = userId;
                    listItemInstance.personalAccess = access.personalAccess;

                    let participantItemContainer = document.createElement('TR');
                    participantItemContainer.className = 'webrtc-permissions-item-con';
                    listItemInstance.itemEl = participantItemContainer;
                    tool.permissionsTableEl.appendChild(participantItemContainer);

                    let participantItemAvatar = document.createElement('TD');
                    participantItemContainer.appendChild(participantItemAvatar);

                    let participantItemAvatarImg = document.createElement('DIV');
                    participantItemAvatar.appendChild(participantItemAvatarImg);

                    Q.activate(
                        Q.Tool.setUpElement(
                            participantItemAvatarImg,
                            "Users/avatar",
                            {
                                userId: userId,
                                contents: true
                            }
                        ),
                        {},
                        function () {

                        }
                    );

                    let micPermissionCon = document.createElement('TD');
                    micPermissionCon.className = 'webrtc-permissions-item-box';
                    participantItemContainer.appendChild(micPermissionCon);
                    let micPermissionInput = document.createElement('INPUT');
                    micPermissionInput.type = 'checkbox';
                    micPermissionInput.checked = micIsNotAllowed ? false : true;
                    micPermissionCon.appendChild(micPermissionInput);
                    listItemInstance.micCheckbox = micPermissionInput;

                    micPermissionInput.addEventListener('click', function () {
                        micPermissionInput.classList.add('Q_working');
                        if (micPermissionInput.checked) {
                            tool.addOrRemovePersonalPermission('mic', userId, 'add')
                                .then(function () {
                                    micPermissionInput.classList.remove('Q_working');
                                })
                                .catch(function (err) {
                                    micPermissionInput.checked = false;
                                    micPermissionInput.classList.remove('Q_working');
                                });
                        } else {
                            tool.addOrRemovePersonalPermission('mic', userId, 'remove')
                                .then(function () {
                                    micPermissionInput.classList.remove('Q_working');
                                })
                                .catch(function (err) {
                                    micPermissionInput.checked = true;
                                    micPermissionInput.classList.remove('Q_working');
                                });
                        }
                    });

                    let cameraPermissionCon = document.createElement('TD');
                    cameraPermissionCon.className = 'webrtc-permissions-item-box';
                    participantItemContainer.appendChild(cameraPermissionCon);
                    let cameraPermissionInput = document.createElement('INPUT');
                    cameraPermissionInput.type = 'checkbox';
                    cameraPermissionInput.checked = cameraIsNotAllowed ? false : true;
                    cameraPermissionCon.appendChild(cameraPermissionInput);
                    listItemInstance.cameraCheckbox = cameraPermissionInput;

                    cameraPermissionInput.addEventListener('click', function () {
                        cameraPermissionInput.classList.add('Q_working');
                        if (cameraPermissionInput.checked) {
                            tool.addOrRemovePersonalPermission('camera', userId, 'add')
                                .then(function () {
                                    cameraPermissionInput.classList.remove('Q_working');
                                })
                                .catch(function (err) {
                                    cameraPermissionInput.checked = false;
                                    cameraPermissionInput.classList.remove('Q_working');
                                });
                        } else {
                            tool.addOrRemovePersonalPermission('camera', userId, 'remove')
                                .then(function () {
                                    cameraPermissionInput.classList.remove('Q_working');
                                })
                                .catch(function (err) {
                                    cameraPermissionInput.checked = true;
                                    cameraPermissionInput.classList.remove('Q_working');
                                });
                        }
                    });

                    let screenPermissionCon = document.createElement('TD');
                    screenPermissionCon.className = 'webrtc-permissions-item-box';
                    participantItemContainer.appendChild(screenPermissionCon);
                    let screenPermissionInput = document.createElement('INPUT');
                    screenPermissionInput.type = 'checkbox';
                    screenPermissionInput.checked = screenIsNotAllowed ? false : true;
                    screenPermissionCon.appendChild(screenPermissionInput);
                    listItemInstance.screenCheckbox = screenPermissionInput;

                    screenPermissionInput.addEventListener('click', function () {
                        screenPermissionInput.classList.add('Q_working');
                        if (screenPermissionInput.checked) {
                            tool.addOrRemovePersonalPermission('screen', userId, 'add')
                                .then(function () {
                                    screenPermissionInput.classList.remove('Q_working');
                                })
                                .catch(function (err) {
                                    screenPermissionInput.checked = false;
                                    screenPermissionInput.classList.remove('Q_working');
                                });
                        } else {
                            tool.addOrRemovePersonalPermission('screen', userId, 'remove')
                                .then(function () {
                                    screenPermissionInput.classList.remove('Q_working');
                                })
                                .catch(function (err) {
                                    screenPermissionInput.checked = true;
                                    screenPermissionInput.classList.remove('Q_working');
                                });
                        }
                    });

                    let permissionsControls = document.createElement('TD');
                    permissionsControls.className = 'webrtc-permissions-item-controls';
                    participantItemContainer.appendChild(permissionsControls);
                    let setSameAsGlobal = document.createElement('DIV');
                    setSameAsGlobal.className = 'webrtc-permissions-item-controls-reset';
                    setSameAsGlobal.dataset.touchlabel = 'Same as Global';
                    setSameAsGlobal.innerHTML = _icons.reset;
                    permissionsControls.appendChild(setSameAsGlobal);
                    listItemInstance.resetButton = setSameAsGlobal;

                    if (access.personalAccess) {
                        setSameAsGlobal.classList.remove('webrtc-permissions-disabled');
                    } else {
                        setSameAsGlobal.classList.add('webrtc-permissions-disabled');
                    }

                    setSameAsGlobal.addEventListener('click', function () {
                        tool.resetUserPermissionToGlobal(userId);
                    })

                    tool.participantsList.push(listItemInstance);
                });
            },
            removeParticipantItem: function (userId) {
                var tool = this;
                var item = tool.participantsList.filter(function (listItem) {
                    return listItem.userId == userId;
                })[0];
                log('ParticipantsList: removeParticipantItem: item', item);

                if (item != null) item.remove();
            },
            loadAllParticipants: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/webrtc", ['getRoomParticipants'], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);

                        if (msg) {
                            reject(msg);
                            console.error(msg)
                            return;
                        }

                        resolve(response.slots.getRoomParticipants)
                    }, {
                        method: 'post',
                        fields: {
                            publisherId: tool.roomStream.fields.publisherId,
                            streamName: tool.roomStream.fields.name,
                        }
                    });
                });
            },
            addOrRemoveGlobalPermission: function (permissionName, action) {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/webrtc", ['addOrRemoveGlobalPermission'], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);

                        if (msg) {
                            reject(msg);
                            console.error(msg)
                            return;
                        }

                        resolve()
                    }, {
                        method: 'post',
                        fields: {
                            publisherId: tool.roomStream.fields.publisherId,
                            streamName: tool.roomStream.fields.name,
                            permissionName: permissionName,
                            actionToDo: action,
                        }
                    });
                });
            },
            addOrRemovePersonalPermission: function (permissionName, ofUserId, action) {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/webrtc", ['addOrRemovePersonalPermission'], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);

                        if (msg) {
                            reject(msg);
                            console.error(msg)
                            return;
                        }

                        resolve()
                    }, {
                        method: 'post',
                        fields: {
                            publisherId: tool.roomStream.fields.publisherId,
                            streamName: tool.roomStream.fields.name,
                            permissionName: permissionName,
                            ofUserId: ofUserId,
                            actionToDo: action,
                        }
                    });
                });
            },
            getUserPermission: function (ofUserId) {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/webrtc", ['personalPermissions'], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);

                        if (msg) {
                            reject(msg);
                            console.error(msg)
                            return;
                        }
                        resolve(response.slots.personalPermissions)
                    }, {
                        method: 'get',
                        fields: {
                            publisherId: tool.roomStream.fields.publisherId,
                            streamName: tool.roomStream.fields.name,
                            ofUserId: ofUserId
                        }
                    });
                });
            },
            resetUserPermissionToGlobal: function (ofUserId) {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/webrtc", ['resetPersonalPermissions'], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);

                        if (msg) {
                            reject(msg);
                            console.error(msg)
                            return;
                        }
                        resolve()
                    }, {
                        method: 'post',
                        fields: {
                            publisherId: tool.roomStream.fields.publisherId,
                            streamName: tool.roomStream.fields.name,
                            ofUserId: ofUserId
                        }
                    });
                });
            }
        }
    );

})(window.jQuery, window);