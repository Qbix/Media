"use strict";

(function (Q, $) {

    var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
    var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
    var RTCSessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
    var Media = Q.Media;

    if(typeof DOMRect == 'undefined') {
        window.DOMRect = function(x, y, width, height){
            this.x = x;
            this.y = y;
            this.top = y;
            this.left = x;
            this.height = height;
            this.width = width;
        }
    }

    var promisifiedOldGUM = function(constraints, successCallback, errorCallback) {

        var getUserMedia = (navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia);

        //if(Q.info.isCordova && Q.info.platform === 'ios') getUserMedia = cordova.plugins.iosrtc.getUserMedia;

        if(!getUserMedia) {
            return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
        }

        return new Promise(function(successCallback, errorCallback) {
            getUserMedia.call(navigator, constraints, successCallback, errorCallback);
        });

    }

    if(navigator.mediaDevices === undefined) navigator.mediaDevices = {};
    if(navigator.mediaDevices.getUserMedia === undefined) navigator.mediaDevices.getUserMedia = promisifiedOldGUM;

    window.AudioContext = window.AudioContext || window.webkitAudioContext;

    var _debug = null;
    var _debugTimer = {};

    Media.WebRTC = function Media_WebRTC(options) {
        if(!new.target) {
            return new Media_WebRTC(options);
        }

        var module = {};

        /**
         * WebRTC options that also can be set it local/app.json
         * @param {Object} [_options] config options
         * @param {Object} [_options.startWith] Start conference with requesting camera and/or mic permissions. This option also is used as accessory variable.
         * @param {Boolean} [_options.startWith.audio] Start conference with requesting the permission to use microphone.
         * @param {Boolean} [_options.startWith.video] Start conference with requesting the permission to use camera.
         * @param {Boolean} [_options.showPreparingDialog] Show preparing dialog before user joins the conference. User can turn camera/mic/screensharing on/off in this dialog. If false, dialog will not be shown
         * @param {Boolean} [_options.useCordovaPlugins] Use iosrtc plugin's API to get permissions to camera/mic. Option is used for iOS < v.14
         * @param {Boolean} [_options.showScreenSharingInSeparateScreen] Show screen sharing video in separate screen. If false, screensharing video will be shown instead of camera.
         * @param {Boolean} [_options.minimizeOnPageSwitching] Switch layout to "minimized" when page was switched
         * @param {Boolean} [_options.leaveOtherActiveRooms] Leave active WebRTC rooms when connecting to current one
         * @param {Boolean} [_options.onlyOneScreenSharingAllowed] Allow only one screensharing within room
         * @param {Boolean} [_options.disconnectBtnInParticipants] Show "hang up" button in "participants popup"
         * @param {String} [_options.controlsPosition] Show controls on top|right|bottom|left. If not set, controls will be on bottom by default.
         * @param {Object} [_options.sounds] Play sounds when participant connects/disconnects or switches room
         * @param {String} [_options.sounds.participantConnected]
         * @param {String} [_options.sounds.participantDisconnected]
         * @param {String} [_options.sounds.roomSwitch]
         * @param {Object} [_options.liveStreaming] Live streaming settings
         * @param {Boolean} [_options.liveStreaming.startFbLiveViaGoLiveDialog] Start live streaming using facebook sdk
         * @param {Boolean} [_options.liveStreaming.sounds] Include _options.sounds into live stream.
         * @param {String} [_options.liveStreaming.audioLayoutBgColor] Background color of audio layout's participant screens
         * @param {Number} [_options.liveStreaming.tiledLayoutMargins] Margins between tiles (user's screens) in tiled layout
         * @param {Boolean} [_options.liveStreaming.loopAudio] Loop imported audio file
         * @param {Boolean} [_options.liveStreaming.loopVideo] Loop imported video file
         * @param {Boolean} [_options.liveStreaming.localOutput] Output sound of imported video/audio locally
         * @param {Object} [_options.webcastSettings]
         * @param {Boolean} [_options.webcastSettings.disconnectOnRoomSwitch] Disconnect users from root witch leaved/switched current room
         * @param {Q.Event} [_options.onWebRTCRoomCreated] Event that is fired when room is created
         * @param {Q.Event} [_options.onWebRTCRoomEnded] Event that is fired when room is ended
         * @param {Q.Event} [_options.onWebrtcControlsCreated] Event that is fired when room controls are creted
         * @param {Array} [_options.hosts] List of ids of room's hosts
         * @param {String} [_options.defaultDesktopViewMode] Default view mode (layout) for rendering participants' screens on desktop (regular | audio | maximized | minimized | tiled | manual | fullScreen | screenSharing)
         * @param {String} [_options.defaultMobileViewMode] Default view mode (layout) for rendering participants' screens on mobile (tiledMobile | sideBySideMobile | maximizedMobile | minimizedMobile | audio | squaresGrid)
         * @param {Object} [_options.relate] Relate roomStream to another stream when roomStream is created. Use already related (to already existing stream) stream as main roomStream
         * @param {String} [_options.relate.publisherId] publisherId of a stream to which roomStream will be related.
         * @param {String} [_options.relate.streamName] streamName of a stream to which roomStream will be related.
         * @param {Boolean} [_options.useRelatedTo] if true, instead of create new stream use last related webrtc stream (_options.relate should be filled)
         */
        var _options = {
            startWith: {
                audio: true,
                video: false
            },
            limits: {},
            streams: [],
            notForUsingTracks: [],
            audioOnlyMode: false,
            showPreparingDialog: false,
            useCordovaPlugins: false,
            showScreenSharingInSeparateScreen: true,
            minimizeOnPageSwitching: true,
            leaveOtherActiveRooms: true,
            onlyOneScreenSharingAllowed: true,
            disconnectBtnInParticipants: false,
            controlsPosition: 'auto',
            margins:null,
            sounds: {
                participantConnected:Q.url('{{Media}}/audio/user_connected.mp3'),
                participantDisconnected:Q.url('{{Media}}/audio/user_disconnected.mp3'),
                roomSwitch:Q.url('{{Media}}/audio/switch_room.mp3')
            },
            liveStreaming: {
                startFbLiveViaGoLiveDialog: false,
                /*timeSlice: 6000,*/
                sounds:true,
                audioLayoutBgColor: '#000',
                tiledLayoutMargins: 20,
                loopAudio: true,
                loopVideo: true,
                localOutput: true
                /*chunkSize: 10000*/
            },
            webcastSettings: {
                disconnectOnRoomSwitch: false
            },
            onWebRTCRoomCreated: new Q.Event(),
            onWebRTCRoomEnded: new Q.Event(),
            onWebrtcControlsCreated: new Q.Event(),
            beforeSwitch: null,
            hosts:[],
            defaultDesktopViewMode:null,
            defaultMobileViewMode:null,
            writeLevel:23,
            relate: {},
            useRelatedTo: false
        };

        overrideDefaultOptions(options);

        var webrtcSignalingLib;
        var _waitingRoomStream;

        var _roomStartTime = null;
        var _controls = null;
        var _controlsTool = null;
        var _roomsMedia = null;
        var _layoutTool = null;
        var _roomStream = null;
        var _renderedScreens = [];
        var _resizeObserver = null;
        var _isMobile = null;
        var _isAndroid = null;
        var _isiOS = null;
        var _isiOSWebView = null;
        var _events = new EventSystem();
        var text = Q.Text.collection[Q.Text.language]['Media/content'];

        var ua = navigator.userAgent;

        if(ua.indexOf('Android')!=-1||ua.indexOf('Windows Phone')!=-1||ua.indexOf('iPhone')!=-1||ua.indexOf('iPad')!=-1||ua.indexOf('iPod')!=-1) {
            _isMobile = true;
            if(ua.indexOf('iPad')!=-1||ua.indexOf('iPhone')!=-1||ua.indexOf('iPod')!=-1) {
                _isiOS = true;
            } else if (/android/i.test(ua)) {
                _isAndroid = true;
            }
        }

        var isSafari = /safari/.test( ua.toLowerCase());
        if( _isiOS ) {
            if ( isSafari ) {
                //browser
            } else if ( !isSafari && !Q.info.isCordova ) {
                _isiOSWebView = true;
            }
        } else {
            //not iOS
        }

        var browser = determineBrowser(navigator.userAgent)
        var _localInfo = {
            isMobile: _isMobile,
            platform: _isiOS ? 'ios' : (_isAndroid ? 'android' : null),
            isCordova: typeof cordova != 'undefined',
            isiOSWebView: _isiOSWebView,
            ua: navigator.userAgent,
            browserName: browser[0],
            browserVersion: browser[1]
        }

        if(_isiOS && _localInfo.browserName == 'Safari' && _localInfo.browserVersion < 14.4){
            _options.useCordovaPlugins = true;
            if(!navigator) navigator = {};
        }

        var appDebug = (function () {
            var _infoLog = [];

            _infoLog.push({type: 'info', log:_localInfo});

            var stderror = console.error.bind(console);

            console.error = function (txt) {

                try {
                    try {
                        var err = (new Error);
                    } catch (e) {

                    }

                    var i, argument;
                    var argumentsString = '';
                    for (i = 1; argument = arguments[i]; i++){
                        if (typeof argument == 'object') {
                            argumentsString = argumentsString + ', OBJECT';
                        } else {
                            argumentsString = argumentsString + ', ' + argument;
                        }
                    }

                    var today = new Date();
                    var dd = today.getDate();
                    var mm = today.getMonth() + 1;
                    var ua = navigator.userAgent;
                    var yyyy = today.getFullYear();
                    if (dd < 10) {
                        dd = '0' + dd;
                    }
                    if (mm < 10) {
                        mm = '0' + mm;
                    }
                    var today = dd + '/' + mm + '/' + yyyy + ' ' + today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();

                    var errorMessage = "\n\n" + today + " Error: " + txt + ', ' +  argumentsString + "\nurl: " + location.origin + "\nline: ";

                    if(typeof err != 'undefined' && typeof err.lineNumber != 'undefined') {
                        errorMessage = errorMessage + err.lineNumber + "\n " + ua+ "\n";
                    } else if(typeof err != 'undefined' && typeof err.stack != 'undefined')
                        errorMessage = errorMessage + err.stack + "\n " + ua+ "\n";
                    else errorMessage = errorMessage + "\n " + ua + "\n";

                    stderror.apply(console, arguments);
                    logError(errorMessage);

                } catch (e) {
                    stderror.apply(e.name + ' ' + e.message);
                    logError(e.name + ' ' + e.message);
                }
            }

            window.onerror = function(msg, url, line, col, error) {
                var extra = !col ? '' : '\ncolumn: ' + col;
                extra += !error ? '' : '\nerror: ' + error;

                var today = new Date();
                var dd = today.getDate();
                var mm = today.getMonth() + 1;

                var yyyy = today.getFullYear();
                if (dd < 10) {
                    dd = '0' + dd;
                }
                if (mm < 10) {
                    mm = '0' + mm;
                }
                var today = dd + '/' + mm + '/' + yyyy + ' ' + today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();

                var errMessage = "\n\n" + today + " Error: " + msg + "\nurl: " + url + "\nline: " + line + extra + "\nline: " + ua;

                logError(errMessage);
            }

            var url = new URL(location.href);
            var debug = url.searchParams.get("debug");

            var debugWidget = (function () {
                var _debugWidget;
                var _debugSideBar;
                var _debugOutput;
                var _debugWidgetLouncher;

                function createDebugOutput() {
                    _debugWidget = document.createElement('DIV');
                    _debugWidget.className = 'Media_webrtc_debug_container';
                    _debugSideBar = document.createElement('DIV');
                    _debugSideBar.className = 'Media_webrtc_debug_sidebar';
                    _debugOutput = document.createElement('DIV');
                    _debugOutput.className = 'Media_webrtc_debug_output';
                    var closeDebugWidget= document.createElement('DIV');
                    closeDebugWidget.className = 'Media_webrtc_debug_close';
                    closeDebugWidget.addEventListener('click', closeDebug)
                    _debugWidget.appendChild(_debugSideBar);
                    _debugWidget.appendChild(_debugOutput);
                    _debugWidget.appendChild(closeDebugWidget);
                    document.body.appendChild(_debugWidget);

                    _debugWidgetLouncher = document.createElement('DIV');
                    _debugWidgetLouncher.className = "Media_webrtc_debug_louncher active";
                    _debugWidgetLouncher.innerHTML = "Open Debugger";
                    _debugWidgetLouncher.addEventListener('click', openDebugWidget)
                    document.body.appendChild(_debugWidgetLouncher);
                }

                function closeDebug() {
                    if( _debugWidget.classList.contains('active')) _debugWidget.classList.remove('active');
                    if( !_debugWidgetLouncher.classList.contains('active')) _debugWidgetLouncher.classList.add('active');
                }

                function openDebugWidget() {
                    if(!_debugWidget.classList.contains('active')) _debugWidget.classList.add('active');
                    if(_debugWidgetLouncher.classList.contains('active')) _debugWidgetLouncher.classList.remove('active');
                    updateRoomsList();
                }

                function updateRoomsList() {
                    loadRoomsList(function (roomList) {
                        _debugSideBar.innerHTML = '';
                        var roomListEl = document.createElement('UL');
                        roomListEl.className = 'Media_webrtc_debug_room_list';
                        var i, room;
                        for(i = 0; room = roomList[i]; i++) {
                            var roomItem = document.createElement('LI');
                            roomItem.innerHTML = room.roomName + ', ' + room.date;
                            roomItem.dataset.startTimeDate = room.startTimeDate;
                            roomItem.dataset.roomName = room.roomName;
                            roomItem.addEventListener('click', updateParticipantsList)
                            if(room.startTimeTs == _roomStream.getAttribute('startTime') && room.roomName == _options.roomId) {
                                roomItem.classList.add('Media_webrtc_debug_active_room');
                            }
                            roomListEl.appendChild(roomItem);
                        }
                        _debugSideBar.appendChild(roomListEl);
                    });
                }

                function timestampToDate(unix_timestamp) {
// Create a new JavaScript Date object based on the timestamp
// multiplied by 1000 so that the argument is in milliseconds, not seconds.
                    var date = new Date(unix_timestamp * 1000);
// Hours part from the timestamp
                    var hours = date.getHours();
// Minutes part from the timestamp
                    var minutes = "0" + date.getMinutes();
// Seconds part from the timestamp
                    var seconds = "0" + date.getSeconds();

// Will display time in 10:30:23 format
                    var formattedTime = hours + ':' + minutes.substring(minutes.length-2) + ':' + seconds.substring(seconds.length-2);

                    return formattedTime;
                }

                function updateParticipantsList(e) {
                    var roomItem = e.target;
                    var roomName = roomItem.dataset.roomName;
                    var startTimeDate = roomItem.dataset.startTimeDate;
                    var existingList = roomItem.querySelector('UL')
                    var participantsListEl = existingList != null ? existingList : document.createElement('UL');
                    var localParticipant = webrtcSignalingLib.localParticipant();

                    participantsListEl.className = 'Media_webrtc_debug_participant_list';
                    loadParticipantList(roomName, startTimeDate, function (participantsList) {
                        participantsListEl.innerHTML = '';

                        var i, participant;
                        for(i = 0; participant = participantsList[i]; i++) {
                            var participantItem = document.createElement('LI');
                            participantItem.innerHTML = participant.username + ' (' + participant.connectedDateTime + ')';
                            if(participant.userId + '\t' + participant.connectedTime == localParticipant.identity) {
                                participantItem.innerHTML += ' (me)';
                            }
                            participantItem.dataset.roomName = roomName;
                            participantItem.dataset.callStartedDate = startTimeDate;
                            participantItem.dataset.userId = participant.userId;
                            participantItem.dataset.connectedTime = participant.connectedTime;
                            participantItem.addEventListener('click', updateOutputLog)
                            if(checkIfUserOnline(participant.userId, participant.connectedTime)){
                                participantItem.classList.add('Media_webrtc_debug_active_participant');
                            }

                            participantsListEl.appendChild(participantItem);
                        }
                        if(!roomItem.contains(participantsListEl)) roomItem.appendChild(participantsListEl);
                    });
                }

                function checkIfUserOnline(userId, connectionTime) {
                    var participants = webrtcSignalingLib.roomParticipants();
                    for (var i in participants) {
                        if(participants[i].identity == userId + '\t' + connectionTime) return true;
                    }
                    return false;
                }

                function updateOutputLog(e) {
                    e.stopPropagation();
                    var participantItem = e.target;
                    var roomName = participantItem.dataset.roomName;
                    var callStartedDate = participantItem.dataset.callStartedDate;
                    var userId = participantItem.dataset.userId;
                    var connectedTime = participantItem.dataset.connectedTime;

                    getLogByUser(roomName, callStartedDate, userId, connectedTime, function (logs) {
                        printLog(logs);
                    });
                }

                function printLog(logs) {
                    function flattenObject(source, depth) {
                        if(depth == null) depth = 0;
                        var target = {};
                        var keys = Object.keys(source);
                        if(keys.length == 0) {
                            keys = [];
                            for(var p in source) {
                                keys.push(p);
                                if(p == 10) break;
                            }
                        }
                        keys.forEach(k => {
                            if (source[k] !== null && (typeof source[k] === 'object' || typeof source[k] === 'function' || Array.isArray(source[k]))) {
                                let constName = source[k].constructor.name;
                                if(constName == 'HTMLDivElement') {
                                    target[k] = source[k].outerHTML;
                                } else if(constName == 'Text') {
                                    target[k] = source[k].innerText;
                                } else if(constName == 'DOMRect') {
                                    target[k] = flattenObject(source[k]);
                                } else {
                                    target[k] = (depth <= 2) ? flattenObject(source[k], depth + 1) : source[k].constructor.name;
                                }
                            } else {
                                target[k] = source[k];
                            }

                        });
                        return target;
                    }

                    _debugOutput.innerHTML = '';
                    var i, log;
                    for(i = 0; log = logs[i]; i++) {
                        var logItem = document.createElement('DIV');
                        logItem.className = 'Media_webrtc_debug_log_item';
                        if(log.type == 'error') {
                            logItem.classList.add('Media_webrtc_debug_log_error');
                        }
                        var logItemType = document.createElement('DIV');
                        logItemType.className = 'Media_webrtc_debug_log_type';
                        logItemType.innerHTML = log.type;
                        var logContent = document.createElement('DIV');
                        logContent.className = 'Media_webrtc_debug_log_contet';

                        if(log.log.constructor === Array) {
                            var logResultArr = [];
                            let logArray = log.log;
                            for (var k in logArray) {
                                if (logArray[k] !== null && (typeof logArray[k] === 'object' || typeof logArray[k] === 'function' || Array.isArray(logArray[k]))) {
                                    logResultArr.push(JSON.stringify(logArray[k]));
                                } else {
                                    logResultArr.push(logArray[k]);
                                }
                            }

                            logContent.innerText = logResultArr.join(', ');
                        } else {
                            logContent.innerHTML = JSON.stringify(log.log);

                        }

                        logItem.appendChild(logItemType);
                        logItem.appendChild(logContent);
                        _debugOutput.appendChild(logItem);
                    }

                }

                function loadRoomsList(callback) {
                    Q.req("Media/webrtc", ["logRoomList"], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);

                        if (msg) {
                            return Q.alert(msg);
                        }

                        callback(response.slots.logRoomList);
                    }, {
                        method: 'get',
                        fields: {}
                    });
                }

                function loadParticipantList(roomId, startTimeDate, callback) {
                    Q.req("Media/webrtc", ["logParticipantList"], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);

                        if (msg) {
                            return Q.alert(msg);
                        }

                        callback(response.slots.logParticipantList);
                    }, {
                        method: 'get',
                        fields: {
                            roomId: roomId,
                            startTimeDate: startTimeDate
                        }
                    });
                }

                function getLogByUser(roomId, callStartedDate, userId, startTime, callback) {
                    var userIdAndStartTime;
                    if(typeof userId == 'undefined' && typeof startTime == 'undefined') {
                        userIdAndStartTime = Q.Users.loggedInUser.id + '\t' + _roomStartTime;
                    } else {
                        userIdAndStartTime = userId + '\t' + startTime;
                    }

                    if(typeof roomId == 'undefined') {
                        roomId = _options.roomId;
                    }

                    if(_options.roomId == null && _options.roomPublisherId == null && _options.relate && _options.relate.publisherId == null && _options.relate.streamName == null) return;
                    Q.req("Media/webrtc", ["log"], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);

                        if (msg) {
                            return Q.alert(msg);
                        }

                        callback(JSON.parse(response.slots.log));
                    }, {
                        method: 'get',
                        fields: {
                            roomId: roomId,
                            publisherId: _options.roomPublisherId,
                            startTime: callStartedDate,
                            participant: userIdAndStartTime
                        }
                    });
                }

                return {
                    createDebugOutput:createDebugOutput,
                    openDebugWidget:openDebugWidget,
                    loadParticipantList:loadParticipantList
                }
            }())

            if(debug) {
                debugWidget.createDebugOutput();
            }

            function flattenArray(mArr) {
                return [].concat.apply([], mArr);
            }

            function flattenObject(source) {
                var target = {};
                var keys = Object.keys(source);
                if(keys.length == 0) {
                    keys = [];
                    for(var p in source) {
                        keys.push(p);
                        if(p == 10) break;
                    }
                }
                keys.forEach(k => {
                    if (source[k] !== null && (typeof source[k] === 'object' || typeof source[k] === 'function' || Array.isArray(source[k]))) {
                        let constName = source[k].constructor.name;
                        if(constName == 'HTMLDivElement') {
                            target[k] = 'HTMLDivElement';
                        } else if(constName == 'Text') {
                            target[k] = source[k].innerText;
                        } else if(constName == 'DOMRect') {
                            target[k] = flattenObject(source[k]);
                        } else {
                            target[k] = source[k].constructor.name;
                        }
                    } else {
                        target[k] = source[k];
                    }

                });
                return target;
            }


            function logInfo(args, fileName) {
                try {
                    var i, argument;
                    var consoleArr = [];

                    for (i = 0; argument = args[i]; i++){

                        if (typeof argument == 'string') {
                            consoleArr.push(argument);
                        } else if (typeof argument == 'object') {
                            consoleArr.push( flattenObject(argument));
                        } else if (typeof argument == 'array') {
                            consoleArr.push(flattenArray(argument));
                        } else {
                            consoleArr.push(argument);
                        }
                    }

                    var logObj = {
                        'type': fileName,
                        'log':consoleArr
                    };
                    _infoLog.push(logObj);

                } catch (e) {
                    var logObj = {
                        'type': fileName,
                        'log':args
                    };
                    _infoLog.push(logObj);
                }
            }

            function logError(errMessage) {
                var logObj = {
                    'type': "error",
                    'log':errMessage
                };
                _infoLog.push(logObj);
            }

            function getInfoLog() {
                return _infoLog;
            }

            function sendReportToServer() {
                if(_roomStream == null || _infoLog.length == 0 || _options.roomId == null || _options.roomPublisherId == null || !Q.Users.loggedInUser) return;
                var roomId = (_roomStream.fields.name).replace('Media/webrtc/', '');
                Q.req("Media/webrtc", ["updateLog"], function (err, response) {
                    var msg = Q.firstErrorMessage(err, response && response.errors);

                    if (msg) {
                        return Q.alert(msg);
                    }

                }, {
                    method: 'put',
                    fields: {
                        log: JSON.stringify(_infoLog.splice(0, _infoLog.length)),
                        roomId: roomId,
                        publisherId: _roomStream.fields.publisherId,
                        participant: Q.Users.loggedInUser.id + '\t' + _roomStartTime
                    }
                });
            }

            function createLogMethod(fileName) {
                var url = new URL(location.href);
                var consoleDebug = url.searchParams.get("console");
                return function () {
                    if (_debug === false) return;
                    var args = arguments
                    args = Array.prototype.slice.call(args);
                    var params = [];

                    if (consoleDebug) {
                        if (window.performance) {
                            var now = (window.performance.now() / 1000).toFixed(3);
                            params.push(now + ": " + fileName + ': ' + args.splice(0, 1));
                            params = params.concat(args);
                            console.log.apply(console, params);
                        } else {
                            params = params.concat(args);
                            console.log.apply(console, params);
                        }
                    }

                    logInfo(params, fileName);
                }
            }

            return {
                logInfo: logInfo,
                logError: logError,
                getInfoLog: getInfoLog,
                sendReportToServer: sendReportToServer,
                createLogMethod: createLogMethod,
                debugWidget: function() {return debugWidget;},
                isiOSwebView: function() {return _isiOSWebView;}
            }
        }());

        Q.Media.WebRTCdebugger = appDebug;

        log = appDebug.createLogMethod('WebRTC.js')

        var url = new URL(location.href);
        var sandbox = url.searchParams.get("sandbox");

        var sandboxWidget = (function () {
            let _participantsListCon = null;

            let _streamingIcons = {
                addItem: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm6 13h-5v5h-2v-5h-5v-2h5v-5h2v5h5v2z"/></svg>',
                removeItem: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm6 16.538l-4.592-4.548 4.546-4.587-1.416-1.403-4.545 4.589-4.588-4.543-1.405 1.405 4.593 4.552-4.547 4.592 1.405 1.405 4.555-4.596 4.591 4.55 1.403-1.416z"/></svg>',
                visible: '<svg width="540.50592" height="437.31812" viewBox="0 0 540.50592 437.31812" version="1.1" id="svg1689" sodipodi:docname="live_visibility_icon.svg" inkscape:version="1.2.1 (9c6d41e, 2022-07-14)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs1693" /> <sodipodi:namedview id="namedview1691" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" showgrid="false" inkscape:zoom="1.5652103" inkscape:cx="212.43151" inkscape:cy="221.69545" inkscape:window-width="1920" inkscape:window-height="1029" inkscape:window-x="0" inkscape:window-y="27" inkscape:window-maximized="1" inkscape:current-layer="svg1689" /> <path d="m 337.81621,227.8639 c 0,37.24987 -30.31337,67.56324 -67.56324,67.56324 -37.24987,0 -67.56324,-30.31337 -67.56324,-67.56324 0,-37.24987 30.31337,-67.56325 67.56324,-67.56325 37.24987,0 67.56324,30.31338 67.56324,67.56325 z m 202.68973,-10.11197 c 0,0 -95.75964,190.28062 -269.91515,190.28062 C 108.88943,408.03255 0,217.75193 0,217.75193 c 0,0 100.12872,-170.056681 270.59079,-170.056681 173.27719,0 269.91515,170.056681 269.91515,170.056681 z M 382.85838,227.8639 c 0,-62.09062 -50.51479,-112.60541 -112.60541,-112.60541 -62.09062,0 -112.60541,50.51479 -112.60541,112.60541 0,62.09062 50.51479,112.6054 112.60541,112.6054 62.09062,0 112.60541,-50.51478 112.60541,-112.6054 z" id="path1687" style="display:inline;stroke-width:22.521" /> </svg>',
                hidden: '<svg width="540.50592" height="437.31812" viewBox="0 0 540.50592 437.31812" version="1.1" id="svg1689" sodipodi:docname="live_visibility_icon.svg" inkscape:version="1.2.1 (9c6d41e, 2022-07-14)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs1693" /> <sodipodi:namedview id="namedview1691" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" showgrid="false" inkscape:zoom="1.5652103" inkscape:cx="212.43151" inkscape:cy="221.69545" inkscape:window-width="1920" inkscape:window-height="1029" inkscape:window-x="0" inkscape:window-y="27" inkscape:window-maximized="1" inkscape:current-layer="svg1689" /> <path id="path1687" style="display:inline;stroke-width:22.521" d="m 152.84766,76.064453 57.74218,56.474607 c 17.3238,-10.88282 37.73905,-17.28125 59.66407,-17.28125 62.09055,0 112.60351,50.51491 112.60351,112.60547 0,21.03425 -5.90182,40.66978 -15.98242,57.5332 l 64.62695,63.20704 c 71.22229,-55.83125 109.00391,-130.85157 109.00391,-130.85157 0,0 -96.639,-170.056638 -269.91602,-170.056638 -44.15503,0 -83.54337,11.459721 -117.74218,28.369141 z m 252.58007,290.945317 -58.33789,-57.0586 c -20.14357,18.86683 -47.12473,30.51758 -76.83593,30.51758 -62.09056,0 -112.60547,-50.51491 -112.60547,-112.60547 0,-28.81612 10.97175,-55.05304 28.83984,-74.99023 L 124.32422,92.072266 C 44.402437,142.45896 0,217.75195 0,217.75195 c 0,0 108.88865,190.28125 270.58984,190.28125 52.15054,0 97.213,-17.11736 134.83789,-41.02343 z m -161.13281,-201.50586 88.8418,86.89257 c 2.98302,-7.61638 4.67969,-15.87327 4.67969,-24.5332 0,-37.24983 -30.31267,-67.5625 -67.5625,-67.5625 -9.19449,0 -17.96129,1.86091 -25.95899,5.20313 z m 70.58789,112.94726 -96.22265,-94.11133 c -9.94452,11.76869 -15.97071,26.94827 -15.97071,43.52344 0,37.24983 30.31462,67.56445 67.56446,67.56445 17.11136,0 32.71103,-6.44924 44.6289,-16.97656 z" sodipodi:nodetypes="ccsscccscccsscccscccsscccssc" /> <rect id="rect454" width="31.390423" height="610.87592" x="1.5284805" y="24.889511" ry="14.836177" transform="rotate(-45.635355)" /> </svg>',
                enabledMicrophone: '<svg width="5.3250041mm" height="6.8486948mm" viewBox="0 0 5.3250041 6.8486948" version="1.1" id="svg502" xml:space="preserve" inkscape:version="1.2.1 (9c6d41e, 2022-07-14)" sodipodi:docname="disabled_mic.svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><sodipodi:namedview id="namedview504" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:document-units="mm" showgrid="false" inkscape:zoom="24.2312" inkscape:cx="-0.43332563" inkscape:cy="14.031497" inkscape:window-width="1920" inkscape:window-height="1029" inkscape:window-x="0" inkscape:window-y="27" inkscape:window-maximized="1" inkscape:current-layer="svg502" /><defs id="defs499" /><g inkscape:groupmode="layer" id="layer2" inkscape:label="Layer 2" transform="translate(0.02559968)" style="display:inline"><path d="m 84.259657,41.975451 c 0.0015,0.07894 0.06647,0.141484 0.145411,0.139982 0.04048,-7.58e-4 0.07458,-0.01762 0.100396,-0.04443 0.02581,-0.02682 0.04031,-0.06253 0.04058,-0.102012 -0.01952,-1.026205 -0.870338,-1.845253 -1.895513,-1.824736 -0.07894,0.0015 -0.141485,0.06647 -0.139983,0.145411 0.0015,0.07894 0.06647,0.141484 0.145412,0.139984 0.867335,-0.01548 1.587177,0.677474 1.603696,1.545803 z" id="path239-2" style="display:inline;stroke-width:0.14315" class="MediaWebRTCMicIconWawe2" transform="translate(-79.823299,-40.143779)" /><path d="m 83.832255,42.12633 c 0.04048,-7.58e-4 0.07458,-0.01762 0.100395,-0.04443 0.02581,-0.02682 0.04032,-0.06253 0.04058,-0.102012 -0.01351,-0.710452 -0.602385,-1.277331 -1.312835,-1.263814 -0.07894,0.0015 -0.141483,0.06647 -0.139983,0.145411 0.0015,0.07894 0.06647,0.141484 0.145414,0.139983 0.552571,-0.01051 1.010465,0.430284 1.020978,0.982856 0.0015,0.08097 0.06651,0.143508 0.145449,0.142006 z" id="path241" style="stroke-width:0.14315" class="MediaWebRTCMicIconWawe1" transform="translate(-79.823299,-40.143779)" /><path d="m 237.541,328.897 c 25.128,0 46.632,-8.946 64.523,-26.83 17.888,-17.884 26.833,-39.399 26.833,-64.525 V 91.365 c 0,-25.126 -8.938,-46.632 -26.833,-64.525 C 284.173,8.951 262.669,0 237.541,0 212.416,0 190.909,8.951 173.017,26.84 155.124,44.73 146.179,66.239 146.179,91.365 v 146.177 c 0,25.125 8.949,46.641 26.838,64.525 17.889,17.884 39.399,26.83 64.524,26.83 z" id="path375" transform="matrix(0.01221113,0,0,0.01221113,-0.29021299,1.047319)" inkscape:label="path375" /><path d="m 396.563,188.15 c -3.606,-3.617 -7.898,-5.426 -12.847,-5.426 -4.944,0 -9.226,1.809 -12.847,5.426 -3.613,3.616 -5.421,7.898 -5.421,12.845 v 36.547 c 0,35.214 -12.518,65.333 -37.548,90.362 -25.022,25.03 -55.145,37.545 -90.36,37.545 -35.214,0 -65.334,-12.515 -90.365,-37.545 -25.028,-25.022 -37.541,-55.147 -37.541,-90.362 v -36.547 c 0,-4.947 -1.809,-9.229 -5.424,-12.845 -3.617,-3.617 -7.895,-5.426 -12.847,-5.426 -4.952,0 -9.235,1.809 -12.85,5.426 -3.618,3.616 -5.426,7.898 -5.426,12.845 v 36.547 c 0,42.065 14.04,78.659 42.112,109.776 28.073,31.118 62.762,48.961 104.068,53.526 v 37.691 h -73.089 c -4.949,0 -9.231,1.811 -12.847,5.428 -3.617,3.614 -5.426,7.898 -5.426,12.847 0,4.941 1.809,9.233 5.426,12.847 3.616,3.614 7.898,5.428 12.847,5.428 h 182.719 c 4.948,0 9.236,-1.813 12.847,-5.428 3.621,-3.613 5.431,-7.905 5.431,-12.847 0,-4.948 -1.81,-9.232 -5.431,-12.847 -3.61,-3.617 -7.898,-5.428 -12.847,-5.428 h -73.08 v -37.691 c 41.299,-4.565 75.985,-22.408 104.061,-53.526 28.076,-31.117 42.12,-67.711 42.12,-109.776 v -36.547 c 0,-4.946 -1.813,-9.225 -5.435,-12.845 z" id="path377" transform="matrix(0.01221113,0,0,0.01221113,-0.29021299,1.047319)" /></g></svg>',
                disabledMicrophone: '<svg width="5.3250041mm" height="6.8486948mm" viewBox="0 0 5.3250041 6.8486948" version="1.1" id="svg502" xml:space="preserve" inkscape:version="1.2.1 (9c6d41e, 2022-07-14)" sodipodi:docname="disabled_mic.svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><sodipodi:namedview id="namedview504" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:document-units="mm" showgrid="false" inkscape:zoom="24.2312" inkscape:cx="-0.43332563" inkscape:cy="14.031497" inkscape:window-width="1920" inkscape:window-height="1029" inkscape:window-x="0" inkscape:window-y="27" inkscape:window-maximized="1" inkscape:current-layer="svg502" /><defs id="defs499" /><g inkscape:label="Layer 1" inkscape:groupmode="layer" id="layer1" transform="translate(-79.802132,-40.143836)" style="display:inline"><path id="path239-2-9" style="display:inline;stroke-width:0.14315" class="MediaWebRTCMicIconWawe2" d="M 2.9005981,0 C 2.8846674,-8.6953191e-5 2.8690742,1.9618652e-4 2.8530558,5.1676432e-4 2.7741159,0.00201676 2.7115107,0.06678662 2.7130127,0.14572754 c 0.0015,0.0789399 0.066269,0.14154313 0.1452108,0.14004313 0.6791554,-0.0121214 1.2677117,0.41009432 1.4991333,1.01079103 L 4.565096,1.0552327 C 4.2653668,0.43311249 3.630306,0.0039829 2.9005981,0 Z M 4.7175415,1.5208374 4.4612264,1.8184937 c 1.221e-4,0.00446 4.318e-4,0.00897 5.168e-4,0.013436 0.0015,0.07894 0.066787,0.1410284 0.1457275,0.1395264 0.04048,-7.58e-4 0.074436,-0.017632 0.1002523,-0.044442 0.02581,-0.02682 0.040554,-0.062321 0.040824,-0.1018026 C 4.746577,1.7214388 4.735837,1.6197193 4.7175415,1.5208374 Z M 3.751709,2.642216 1.903243,4.7878215 c 0.207074,0.1837261 0.4513688,0.2759521 0.7327718,0.2759521 0.306841,0 0.5695964,-0.1092449 0.7880656,-0.3276286 C 3.6425128,4.5177614 3.751709,4.254896 3.751709,3.9480794 Z M 1.6117879,5.1263021 1.3198161,5.4647827 c 0.30817,0.2717762 0.6725019,0.431023 1.0929565,0.4774902 v 0.4599203 h -0.892452 c -0.060433,0 -0.1124242,0.022495 -0.1565796,0.066663 -0.044168,0.044131 -0.066663,0.096146 -0.066663,0.1565796 0,0.060335 0.022495,0.1129654 0.066663,0.1570963 0.044155,0.044131 0.096146,0.066146 0.1565796,0.066146 H 3.751709 c 0.060421,0 0.1124852,-0.022003 0.1565796,-0.066146 0.044216,-0.044119 0.066663,-0.096749 0.066663,-0.1570963 0,-0.060421 -0.022446,-0.1124364 -0.066663,-0.1565796 C 3.8642066,6.4246878 3.8121413,6.4021932 3.751709,6.4021932 H 2.859257 V 5.9422729 C 3.363564,5.8865292 3.7871411,5.6685517 4.1299805,5.2885661 4.4728198,4.9085928 4.644161,4.4617401 4.644161,3.9480794 V 3.5015951 c 0,-0.060396 -0.021917,-0.1123754 -0.066146,-0.1565796 -0.044033,-0.044168 -0.096663,-0.066663 -0.1570963,-0.066663 -0.060372,0 -0.1123632,0.022495 -0.1565796,0.066663 -0.044119,0.044156 -0.066663,0.096172 -0.066663,0.1565796 v 0.4464843 c 0,0.4300024 -0.1527257,0.7976598 -0.45837,1.1032919 -0.3055462,0.3056443 -0.6732773,0.4583699 -1.1032918,0.4583699 -0.3933915,0 -0.7349131,-0.1276249 -1.0242264,-0.3834391 z M 1.3198161,5.4647827 c -0.8798774,-3.6431885 -0.4399387,-1.8215942 0,0 z M 1.0319784,5.1567912 1.3311849,4.8095256 C 1.1598178,4.5572928 1.074353,4.2700829 1.074353,3.9480794 V 3.5015951 c 0,-0.060408 -0.02252,-0.1124242 -0.066663,-0.1565796 -0.0441675,-0.044168 -0.0961101,-0.066663 -0.15657956,-0.066663 -0.0604694,0 -0.11295317,0.022495 -0.15709635,0.066663 -0.0441799,0.044156 -0.0661458,0.096172 -0.0661458,0.1565796 v 0.4464843 c 0,0.4554054 0.13465463,0.8583833 0.40411011,1.2087118 z M 1.6386597,4.4524414 3.7418905,2.01073 C 3.7111124,1.7684747 3.6054921,1.5565014 3.4240804,1.3751099 3.2056112,1.1566652 2.9428558,1.0474813 2.6360148,1.0474813 c -0.3068043,0 -0.5695843,0.1091839 -0.7880656,0.3276286 -0.2184936,0.2184568 -0.3276286,0.481249 -0.3276286,0.7880656 v 1.7849039 c 0,0.184067 0.039697,0.3520807 0.1183391,0.504362 z M 3.8891683,1.839681 4.1382487,1.5508097 C 3.9969597,0.98002029 3.4750777,0.56041034 2.8628743,0.57205811 c -0.07894,0.0015 -0.1415431,0.0667866 -0.1400431,0.14572753 0.0015,0.0789399 0.066267,0.14154413 0.1452108,0.14004314 C 3.4202676,0.84732534 3.878104,1.2875939 3.8891683,1.839681 Z" transform="translate(79.802132,40.143836)" sodipodi:nodetypes="scccccscccccccsccccssscccccscscsscscscccsscscsssscccccsscscsscccssscscccc" /><polygon class="MediaWebRTCMicIconCrossline" points="20.305,1.034 19.104,0 0.179,21.971 1.38,23.006 " transform="matrix(0.26458333,0,0,0.26458333,79.754772,40.268055)" style="font-variation-settings:normal;display:inline;opacity:1;vector-effect:none;fill-opacity:1;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1;-inkscape-stroke:none;stop-color:#000000;stop-opacity:1" id="polygon2082" /></g></svg>',
                participantsEnabledMic: '<svg width="118.11147mm" height="122.57976mm" viewBox="0 0 118.11147 122.57976" version="1.1" id="svg502" xml:space="preserve" inkscape:version="1.2.1 (9c6d41e, 2022-07-14)" sodipodi:docname="live_source_enabled_mic.svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><sodipodi:namedview id="namedview504" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:document-units="mm" showgrid="false" inkscape:zoom="0.757225" inkscape:cx="-214.59936" inkscape:cy="472.7789" inkscape:window-width="1920" inkscape:window-height="1029" inkscape:window-x="0" inkscape:window-y="27" inkscape:window-maximized="1" inkscape:current-layer="layer2" /><defs id="defs499" /><g inkscape:groupmode="layer" id="layer2" inkscape:label="Layer 2" transform="translate(55.951838,57.634966)" style="display:inline"><g id="g867" transform="translate(0.81433722,0.29295158)" style="display:inline"><path d="m 1.569985,26.932927 c 6.4834386,0 12.031824,-2.308214 16.647996,-6.922582 4.6154,-4.614363 6.923358,-10.1655888 6.923358,-16.648512 V -34.35424 c 0,-6.482926 -2.306152,-12.031827 -6.923358,-16.648516 -4.616172,-4.615657 -10.1645574,-6.925162 -16.647996,-6.925162 -6.4826632,0 -12.031824,2.309505 -16.648256,6.925162 -4.616688,4.615913 -6.924646,10.16559 -6.924646,16.648516 V 3.361833 c 0,6.4826649 2.30899,12.034149 6.924646,16.648512 4.615659,4.614368 10.1655928,6.922582 16.648256,6.922582 z" id="path375-3" inkscape:label="path375" style="display:inline;stroke-width:0.258016" /><path d="m 42.599121,-9.3821164 c -0.9304,-0.9332526 -2.037824,-1.4000066 -3.314738,-1.4000066 -1.275637,0 -2.38046,0.466754 -3.314737,1.4000066 -0.932218,0.9329994 -1.398696,2.0378247 -1.398696,3.3142225 V 3.361833 c 0,9.085793 -3.229853,16.856991 -9.688005,23.314885 -6.4561,6.458152 -14.228329,9.687226 -23.3143799,9.687226 -9.0857916,0 -16.8572471,-3.229074 -23.3156581,-9.687226 -6.457636,-6.456087 -9.686197,-14.228833 -9.686197,-23.314885 v -9.4297269 c 0,-1.2763978 -0.46675,-2.3812357 -1.399481,-3.3142225 -0.933247,-0.9332526 -2.037041,-1.4000066 -3.314739,-1.4000066 -1.277696,0 -2.382782,0.466754 -3.315511,1.4000066 -0.933505,0.9329994 -1.399998,2.0378247 -1.399998,3.3142225 V 3.361833 c 0,10.853461 3.622551,20.295317 10.865591,28.324015 7.243295,8.028958 16.193628,12.632746 26.8512596,13.810591 v 9.7249 H -22.004334 c -1.276927,0 -2.381752,0.467259 -3.314739,1.400512 -0.933253,0.932471 -1.400006,2.037804 -1.400006,3.314737 0,1.274855 0.466753,2.382266 1.400006,3.314737 0.932979,0.932471 2.037825,1.400514 3.314739,1.400514 h 47.144511 c 1.276672,0 2.38304,-0.467789 3.314738,-1.400514 0.934288,-0.932217 1.401295,-2.03962 1.401295,-3.314737 0,-1.276673 -0.467007,-2.38201 -1.401295,-3.314737 -0.931436,-0.93325 -2.037804,-1.400512 -3.314738,-1.400512 H 6.2843339 v -9.7249 C 16.940156,44.318594 25.889716,39.714806 33.133787,31.685848 40.377856,23.65715 44.001441,14.215294 44.001441,3.361833 v -9.4297269 c 0,-1.2761442 -0.467788,-2.3802046 -1.40232,-3.3142225 z" id="path377" style="display:inline;stroke-width:0.258016" /></g></g></svg>',
                participantsDisabledMic: '<svg width="118.11147mm" height="122.57976mm" viewBox="0 0 118.11147 122.57976" version="1.1" id="svg502" xml:space="preserve" inkscape:version="1.2.1 (9c6d41e, 2022-07-14)" sodipodi:docname="live_source_enabled_mic.svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><sodipodi:namedview id="namedview504" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:document-units="mm" showgrid="false" inkscape:zoom="0.757225" inkscape:cx="-214.59936" inkscape:cy="472.7789" inkscape:window-width="1920" inkscape:window-height="1029" inkscape:window-x="0" inkscape:window-y="27" inkscape:window-maximized="1" inkscape:current-layer="layer2" /><defs id="defs499" /><g inkscape:groupmode="layer" id="layer2" inkscape:label="Layer 2" transform="translate(55.951838,57.634966)" style="display:inline"><path id="path375-3" style="display:inline;stroke-width:0.258016" inkscape:label="path375" d="m 1.5697999,-57.927917 c -6.4826567,0 -12.0316519,2.309506 -16.6480799,6.925158 -4.616683,4.615909 -6.924641,10.165677 -6.924641,16.648597 v 0.701249 l 45.86335,44.857727 C 24.713393,8.7626975 25.141488,6.1487572 25.141488,3.3618817 V -34.354162 c 0,-6.48292 -2.306407,-12.031912 -6.923609,-16.648597 -4.616167,-4.615652 -10.164647,-6.925158 -16.6480791,-6.925158 z m 29.5217121,76.205167 6.976835,6.823873 c 3.953211,-6.47616 5.932971,-13.721954 5.932971,-21.7392413 v -9.4299154 c 0,-1.2761429 -0.46745,-2.3799926 -1.401981,-3.3140096 -0.930399,-0.9332517 -2.038131,-1.3999147 -3.315043,-1.3999147 -1.275636,0 -2.380251,0.466663 -3.314527,1.3999147 -0.932217,0.9329985 -1.398881,2.0376131 -1.398881,3.3140096 v 9.4299154 c 0,5.44377 -1.160781,10.4151563 -3.479374,14.9153683 z m 1.942,13.517005 -6.748425,-6.600114 c -0.449795,0.501306 -0.915557,0.996192 -1.401981,1.482597 -6.456094,6.458145 -14.228298,9.687264 -23.3143397,9.687264 -9.0857825,0 -16.8574853,-3.229119 -23.3158893,-9.687264 -6.45763,-6.456081 -9.686231,-14.228813 -9.686231,-23.3148563 v -9.4299154 c 0,-1.2763965 -0.466667,-2.3810237 -1.399397,-3.3140096 -0.933246,-0.9332517 -2.03683,-1.3999147 -3.314527,-1.3999147 -1.277694,0 -2.382832,0.466663 -3.31556,1.3999147 -0.933504,0.9329985 -1.400431,2.0376131 -1.400431,3.3140096 v 9.4299154 c 0,10.8534503 3.622971,20.2951623 10.866003,28.3238523 7.243288,8.02895 16.193454,12.632683 26.8510747,13.810527 v 9.724988 H -22.004472 c -1.276925,0 -2.38154,0.467179 -3.314526,1.400431 -0.933252,0.93247 -1.399915,2.038111 -1.399915,3.315043 0,1.274854 0.466663,2.382056 1.399915,3.314526 0.932978,0.93247 2.037614,1.400432 3.314526,1.400432 h 47.144409 c 1.276671,0 2.383346,-0.467708 3.315044,-1.400432 0.934287,-0.932216 1.401464,-2.03941 1.401464,-3.314526 0,-1.276672 -0.467177,-2.382317 -1.401464,-3.315043 -0.931436,-0.933249 -2.038111,-1.400431 -3.315044,-1.400431 H 6.2842408 V 45.496261 C 16.89133,44.323802 25.807046,39.755314 33.033512,31.794255 Z M 19.536145,18.592993 -22.002921,-22.035018 V 3.3618817 c 0,6.4826584 2.30899,12.0342373 6.924641,16.6485963 4.615655,4.614363 10.1654232,6.922575 16.6480799,6.922575 6.4834321,0 12.0319121,-2.308212 16.6480791,-6.922575 0.463034,-0.462929 0.901681,-0.935702 1.318266,-1.417485 z" transform="translate(0.81433625,0.29295133)" sodipodi:nodetypes="sssccssssccsscscssccccscsscscsssccscscsscscscccccssscc" /><rect id="rect454" width="8.3053827" height="161.62758" x="-4.4936342" y="-76.138618" ry="3.925405" transform="rotate(-45.635355)" /></g></svg>',
                participantsEnabledCamera: '<svg version="1.1" x="0px" y="0px" viewBox="0 0 469.35991 437.31813" xml:space="preserve" sodipodi:docname="video-camera.svg" width="469.35989" height="437.31812" inkscape:version="1.2.1 (9c6d41e, 2022-07-14)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><defs id="defs1011" /><sodipodi:namedview id="namedview1009" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" showgrid="false" inkscape:zoom="1.2480986" inkscape:cx="187.08458" inkscape:cy="189.88885" inkscape:window-width="1920" inkscape:window-height="1029" inkscape:window-x="0" inkscape:window-y="27" inkscape:window-maximized="1" inkscape:current-layer="Capa_1" /> <path d="M 266.09589,95.187057 H 52.591893 c -28.16,0 -51.2000001,23.040003 -51.2000001,51.200003 v 172.544 c 0,28.16 23.0400001,51.2 51.2000001,51.2 H 266.09589 c 28.16,0 51.2,-23.04 51.2,-51.2 v -172.544 c 0,-28.672 -23.04,-51.200003 -51.2,-51.200003 z" id="path966" /><path d="m 431.47189,123.68345 c -3.072,0.512 -6.144,2.048 -8.704,3.584 l -79.872,46.08 v 118.784 l 80.384,46.08 c 14.848,8.704 33.28,3.584 41.984,-11.264 2.56,-4.608 4.096,-9.728 4.096,-15.36 v -158.208 c 0,-18.944 -17.92,-34.304 -37.888,-29.696 z" id="path972" /> </svg>',
                participantsDisabledCamera: '<svg version="1.1" x="0px" y="0px" viewBox="0 0 467.96681 437.31813" xml:space="preserve" sodipodi:docname="video-camera.svg" width="467.9668" height="437.31812" inkscape:version="1.2.1 (9c6d41e, 2022-07-14)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><defs id="defs1011" /><sodipodi:namedview id="namedview1009" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" showgrid="false" inkscape:zoom="1.2480986" inkscape:cx="174.26508" inkscape:cy="222.73881" inkscape:window-width="1920" inkscape:window-height="1029" inkscape:window-x="0" inkscape:window-y="27" inkscape:window-maximized="1" inkscape:current-layer="Capa_1" /> <path id="path966" d="M 154.05859,95.187502 315.90234,253.48047 V 146.38672 c 0,-28.67197 -23.03925,-51.199218 -51.19922,-51.199218 z m 187.44531,183.332028 33.62696,32.88867 46.75586,26.80274 c 14.84798,8.70399 33.28038,3.58431 41.98437,-11.26367 2.56,-4.608 4.0957,-9.72739 4.09571,-15.35938 V 153.37891 c 0,-18.94398 -17.91874,-34.30331 -37.88672,-29.69532 -3.072,0.512 -6.14508,2.04799 -8.70508,3.58399 l -79.8711,46.08008 z M 315.90234,297.38672 109.16797,95.187502 H 51.199219 C 23.039247,95.187502 0,118.22675 0,146.38672 v 172.54492 c 0,28.15997 23.039247,51.19922 51.199219,51.19922 H 264.70312 c 28.15997,0 51.19922,-23.03925 51.19922,-51.19922 z" sodipodi:nodetypes="ccssccccccsccccccssssssc" /> <rect id="rect454" width="31.390423" height="610.87592" x="-9.9286299" y="13.175447" ry="14.836177" transform="rotate(-45.635355)" /></svg>',
                participantsEnabledScreenSource: '<svg enable-background="new 0 0 512 512" height="509.78607" viewBox="0 0 532.02655 509.78607" width="532.02655" version="1.1" sodipodi:docname="monitor.svg" inkscape:version="1.2.1 (9c6d41e, 2022-07-14)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs1614" /> <sodipodi:namedview id="namedview1612" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" showgrid="false" inkscape:zoom="1.1739077" inkscape:cx="145.66733" inkscape:cy="238.5196" inkscape:window-width="1920" inkscape:window-height="1029" inkscape:window-x="0" inkscape:window-y="27" inkscape:window-maximized="1" inkscape:current-layer="Capa_1" /> <path d="M 502.02657,47.786073 H 50.026568 c -16.54,0 -30,13.46 -30,30 V 375.78607 c 0,16.54 13.46,30 30,30 H 502.02657 c 16.54,0 30,-13.46 30,-30 V 77.786073 c 0,-16.54 -13.46,-30 -30,-30 z" id="path1605" /> <path d="m 436.02657,479.78607 h -81 v -44 h -158 v 44 h -81 c -8.28,0 -15,6.72 -15,15 0,8.28 6.72,15 15,15 h 320 c 8.28,0 15,-6.72 15,-15 0,-8.28 -6.72,-15 -15,-15 z" id="path1607" /> </svg>',
                participantsDisabledScreenSource: '<svg enable-background="new 0 0 512 512" height="509.78607" viewBox="0 0 532.02655 509.78607" width="532.02655" version="1.1" sodipodi:docname="monitor.svg" inkscape:version="1.2.1 (9c6d41e, 2022-07-14)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs1614" /> <sodipodi:namedview id="namedview1612" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" showgrid="false" inkscape:zoom="1.1739077" inkscape:cx="145.66733" inkscape:cy="238.5196" inkscape:window-width="1920" inkscape:window-height="1029" inkscape:window-x="0" inkscape:window-y="27" inkscape:window-maximized="1" inkscape:current-layer="Capa_1" /> <path id="path1605" d="m 119.30664,47.785156 366.0293,358.000004 h 16.6914 c 16.53999,0 30,-13.46002 30,-30 V 77.785156 c 0,-16.539983 -13.46001,-30 -30,-30 z M 435.63867,405.78516 69.609375,47.785156 H 50.027344 c -16.539984,0 -30,13.460017 -30,30 V 375.78516 c 0,16.53998 13.460016,30 30,30 z m -238.61133,30 v 44 h -81 c -8.27999,0 -15,6.72 -15,15 0,8.27999 6.72001,15 15,15 h 320 c 8.28,0 15,-6.72001 15,-15 0,-8.28 -6.72,-15 -15,-15 h -81 v -44 z" sodipodi:nodetypes="ccsssscccsssscccssssssccc" /> <rect id="rect454-3" width="34.749641" height="676.24829" x="-12.059921" y="13.492646" ry="16.423859" transform="rotate(-45.635355)" /> </svg>',
                plusIcon: '<svg id="Capa_1" enable-background="new 0 0 512 512" height="512" viewBox="0 0 512 512" width="512" xmlns="http://www.w3.org/2000/svg"><g><path d="m467 211h-166v-166c0-24.853-20.147-45-45-45s-45 20.147-45 45v166h-166c-24.853 0-45 20.147-45 45s20.147 45 45 45h166v166c0 24.853 20.147 45 45 45s45-20.147 45-45v-166h166c24.853 0 45-20.147 45-45s-20.147-45-45-45z"/></g></svg>',
            }
        
            function createSandboxUI() {
                var sandboxContainer = document.createElement('DIV');
                sandboxContainer.className = 'webrtc-sandbox';
                var sandboxControls = document.createElement('DIV');
                sandboxControls.className = 'webrtc-sandbox-controls';
                sandboxContainer.appendChild(sandboxControls);
                
                var addParticipantLink = document.createElement('DIV');
                addParticipantLink.className = 'Q_button';
                addParticipantLink.innerHTML = 'Add Participant';
                sandboxControls.appendChild(addParticipantLink);

                addParticipantLink.addEventListener('click', connectFakeParticipant)

                var participantsListCon = _participantsListCon = document.createElement('DIV');
                participantsListCon.className = 'webrtc-sandbox-participants'
                sandboxContainer.appendChild(participantsListCon);

                document.body.appendChild(sandboxContainer);
            }

            function connectFakeParticipant() {
                var fakeParticipant = new webrtcSignalingLib.RemoteParticipant();
                fakeParticipant.sid = generateId();
                fakeParticipant.identity = getRandomUserId() + '\t' + Date.now()
                webrtcSignalingLib.signalingDispatcher.participantConnected(fakeParticipant);
            }

            function disconnectParticipant(participant) {
                webrtcSignalingLib.signalingDispatcher.participantDisconnected(participant);
            }

            function getRandomUserId() {
                const names = [
                  "ajwcoiwm", "arkkkori", "aswbircz", "avtfxasp", "axtaimiy", "ayhpitdf", "bagykdwd", "bdyihnwq", "bgbnllcf", "brnyxtlt",
                  "bvelilmn", "cbvstskt", "cgathdpo", "cjmgazpe", "ckidhrtm", "cospjbjq", "cpduljef", "cvjrwlcc", "czubaqzq", "czyiakiq",
                  "dgqmgllu", "djklvzdb", "dtfmjoea", "ebkiznse", "eeeynlwp", "efzjezdy", "eopmkiim", "eyrmwuqv", "fdztbrys", "fhshbmbg"
                ];
              
                const randomIndex = Math.floor(Math.random() * names.length);
                return names[randomIndex];
              }
            
            function generateId() {
                return Date.now().toString(36) + Math.random().toString(36).replace(/\./g, "");
            }

            function ParticipantsList(){
                var _participantsList = [];
                var _participantsContainerEl = null;
                var _participantsListEl = null;

                _participantsContainerEl = document.createElement('DIV');
                _participantsContainerEl.className = 'webrtc-sandbox-participants-list-con';


                let participantTitleCon = document.createElement('DIV');
                participantTitleCon.className = 'webrtc-sandbox-participants-list-title-con';
                _participantsContainerEl.appendChild(participantTitleCon);

                let participantTitle = document.createElement('DIV');
                participantTitle.className = 'webrtc-sandbox-participants-list-title';
                participantTitle.innerHTML = 'Participants:';
                participantTitleCon.appendChild(participantTitle);

                _participantsListEl = document.createElement('DIV');
                _participantsListEl.className = 'webrtc-sandbox-participants-list';
                _participantsContainerEl.appendChild(_participantsListEl);

                declareOrRefreshEventHandlers();
                refreshList();

                function declareOrRefreshEventHandlers() {
                    webrtcSignalingLib.event.on('beforeSwitchRoom', function (e) {
                        //tool.updateWebrtcSignalingLibInstance(e.newWebrtcSignalingLibInstance);
                        declareOrRefreshEventHandlers();
                    });

                    webrtcSignalingLib.event.on('participantConnected', function (participant) {
                        log('ParticipantsList: participantConnected', webrtcSignalingLib.id, participant);
                        addParticipantItem(participant);
                    });
                    webrtcSignalingLib.event.on('participantDisconnected', function (participant) {
                        log('ParticipantsList: participantDisconnected', webrtcSignalingLib.id, participant);
                        removeParticipantItem(participant);
                    });
                    webrtcSignalingLib.event.on('participantRemoved', function (participant) {
                        log('ParticipantsList: participantRemoved', webrtcSignalingLib.id, participant);
                        removeParticipantItem(participant);
                    });
                    webrtcSignalingLib.event.on('trackAdded', function (e) {
                        log('ParticipantsList: trackAdded');
                        updateParticipantItem(e.participant);
                    });
                    webrtcSignalingLib.event.on('trackMuted', function (e) {
                        log('ParticipantsList: trackMuted');
                        updateParticipantItem(e.participant);
                    });
                    webrtcSignalingLib.event.on('audioMuted', function (participant) {
                        log('ParticipantsList: audioMuted');
                        updateParticipantItem(participant);
                    });
                    webrtcSignalingLib.event.on('audioUnmuted', function (participant) {
                        log('ParticipantsList: audioUnmuted');
                        updateParticipantItem(participant);
                    });
                    webrtcSignalingLib.event.on('cameraEnabled', function () {;
                        log('ParticipantsList: cameraEnabled');
                        updateParticipantItem(webrtcSignalingLib.localParticipant());
                        //updateLocalControlsButtonsState();
                    });
                    webrtcSignalingLib.event.on('cameraDisabled', function () {
                        log('ParticipantsList: cameraDisabled');
                        updateParticipantItem(webrtcSignalingLib.localParticipant());
                        //updateLocalControlsButtonsState();
                    });
                    webrtcSignalingLib.event.on('micEnabled', function () {;
                        log('ParticipantsList: micEnabled');
                        updateParticipantItem(webrtcSignalingLib.localParticipant());
                        //updateLocalControlsButtonsState();
                    });
                    webrtcSignalingLib.event.on('micDisabled', function () {
                        log('ParticipantsList: micDisabled');
                        updateParticipantItem(webrtcSignalingLib.localParticipant());
                        //updateLocalControlsButtonsState();
                    });

                }

                function refreshList() {
                    log('ParticipantsList: refreshList');
                    if (_participantsListEl) _participantsListEl.innerHTML = '';
                    _participantsList = [];
    
                    let roomParticipants = webrtcSignalingLib.roomParticipants()
                    addParticipantItem(webrtcSignalingLib.localParticipant());
                    for (var i in roomParticipants) {
                        if (roomParticipants[i].isLocal) continue;
                        addParticipantItem(roomParticipants[i]);
                    }
                }

                function addParticipantItem(participantInstance) {
                    log('ParticipantsList: addParticipantItem', participantInstance);
                    function ListItem(participantInstance) {
                        let listItemInstance = this;
                        this.participantInstance = participantInstance;
                        this.listType = 'mainParticipantVideo';
                        this.itemEl = null;
                        this.visibilityIconEl = null;
                        this.videoIconEl = null;
                        this.audioIconEl = null;
                        this.screenIconEl = null;
                        this.sourcesContainerEl = null;
                        this.show = function () {
                            for(let s in listItemInstance.participantSources) {
                                listItemInstance.switchVisibilityIcon(true);
                                break;
                            }
                        };
                        this.hide = function () {
                            for(let s in listItemInstance.participantSources) {
                                listItemInstance.switchVisibilityIcon(false);
                                break;
                            }
                        };
                        this.switchVisibilityIcon = function (visibility) {
                            if (visibility === true) {
                                this.visibilityIconEl.innerHTML = _streamingIcons.visible;
                            } else if (visibility === false) {
                                this.visibilityIconEl.innerHTML = _streamingIcons.hidden;
                            }
                        };
                        this.toggleVisibility = function () {
                            for (let s in listItemInstance.participantSources) {
                                if (listItemInstance.participantSources[s].sourceInstance.screenSharing) continue;
                                let sourceInstance = listItemInstance.participantSources[s].sourceInstance;

                                if (sourceInstance.active == true) {
                                    listItemInstance.hide();
                                } else {
                                    listItemInstance.show();
                                }
                                break;
                            }
                        };
                        this.toggleScreensharing = function() {
                            let screensharingSources = listItemInstance.participantSources.filter(function(s){
                                return s.sourceInstance.screenSharing ? true : false;
                            });

                            if(screensharingSources.length > 1) {
                                listItemInstance.screenIconEl.innerHTML = _streamingIcons.participantsEnabledScreenSource;
                                return;
                            } else if(screensharingSources.length == 1){
                                screensharingSources[0].toggleVisibility();

                                log('toggleScreensharing', screensharingSources[0].sourceInstance.active)
                                if(screensharingSources[0].sourceInstance.active) {
                                    listItemInstance.screenIconEl.innerHTML = _streamingIcons.participantsEnabledScreenSource;
                                } else {
                                    listItemInstance.screenIconEl.innerHTML = _streamingIcons.participantsDisabledScreenSource;
                                }
                            }
                        };
                        this.toggleAudio = function () {         
                            if (!listItemInstance.participantInstance.audioIsMuted) {
                                listItemInstance.muteAudio();
                            } else {
                                listItemInstance.unmuteAudio();
                            }
                        };
                        this.muteAudio = function () {
                            if (this.participantInstance.audioIsMuted == true) return;
                            this.participantInstance.muteAudio();
                            this.audioIconEl.innerHTML = _streamingIcons.participantsDisabledMic;
                        };
                        this.unmuteAudio = function () {
                            if (this.participantInstance.audioIsMuted == false) return;
                            this.participantInstance.unmuteAudio();
                            this.audioIconEl.innerHTML = _streamingIcons.participantsEnabledMic;
                        };
                        this.remove = function () {
                            log('ParticipantsList: ListItem: remove');

                            if (this.itemEl.parentNode != null) this.itemEl.parentNode.removeChild(this.itemEl);
                            for(let e = _participantsList.length - 1; e >= 0; e--) {
                                if(_participantsList[e].participantInstance == this) {
                                    _participantsList.splice(e, 1);
                                    break;
                                }
                            }
    
                        };
                        Object.defineProperty(this, "sourceInstance", {
                            get() {
                              for(let i in this.participantSources) {
                                if(!this.participantSources[i].sourceInstance.screenSharing) {
                                    return this.participantSources[i].sourceInstance;
                                }
                              }
                            }
                          });
                    }
                    var userId = participantInstance.identity != null ? participantInstance.identity.split('\t')[0] : Q.Users.loggedInUser.id;
                    
                    let listItemInstance = new ListItem(participantInstance);

                    let participantItemContainer = document.createElement('DIV');
                    participantItemContainer.className = 'webrtc-sandbox-participants-item-con';
                    let participantItemInnerCon = document.createElement('DIV');
                    participantItemInnerCon.className = 'webrtc-sandbox-participants-item-inner';
                    participantItemContainer.appendChild(participantItemInnerCon);
                    let disconnectParticipantBtn = document.createElement('DIV');
                    disconnectParticipantBtn.className = 'webrtc-sandbox-participants-item-disconnect';
                    disconnectParticipantBtn.innerHTML = _streamingIcons.removeItem;
                    participantItemInnerCon.appendChild(disconnectParticipantBtn);

                    disconnectParticipantBtn.addEventListener('click', function () {
                        disconnectParticipant(participantInstance);
                    })

                    let participantItemAvatar = document.createElement('DIV');
                    participantItemAvatar.className = 'webrtc-sandbox-participants-item-avatar';
                    participantItemInnerCon.appendChild(participantItemAvatar);

                    let participantItemAvatarTool = document.createElement('DIV');
                    participantItemAvatarTool.className = 'webrtc-sandbox-participants-item-avatar-tool';
                    participantItemAvatar.appendChild(participantItemAvatarTool);

                    Q.activate(
                        Q.Tool.setUpElement(
                            participantItemAvatarTool, // or pass an existing element
                            "Users/avatar",
                            {
                                userId: userId,
                                contents: false
                            }
                        )
                    );


                    let participantItemAvatarText = document.createElement('DIV');
                    participantItemAvatarText.className = 'webrtc-sandbox-participants-item-avatar-texttool';
                    
                    participantItemAvatar.appendChild(participantItemAvatarText);
                    Q.activate(
                        Q.Tool.setUpElement(
                            participantItemAvatarText, // or pass an existing element
                            "Users/avatar",
                            {
                                userId: userId,
                                icon: false
                            }
                        )
                    );

                    let participantItemControls = document.createElement('DIV');
                    participantItemControls.className = 'webrtc-sandbox-participants-item-controls';
                    participantItemInnerCon.appendChild(participantItemControls);


                    let audioBtnCon = document.createElement('DIV');
                    audioBtnCon.className = 'webrtc-sandbox-participants-item-btn webrtc-sandbox-participants-item-audio-btn';
                    participantItemControls.appendChild(audioBtnCon);
                    let audioBtnIcon = document.createElement('DIV');
                    audioBtnIcon.className = 'webrtc-sandbox-participants-item-icon webrtc-sandbox-participants-item-audio-icon';
                    audioBtnIcon.innerHTML = _streamingIcons.participantsDisabledMic;
                    audioBtnCon.appendChild(audioBtnIcon);

                    audioBtnCon.addEventListener('click', listItemInstance.toggleAudio);
                    
                    let screenBtnCon = document.createElement('DIV');
                    screenBtnCon.className = 'webrtc-sandbox-participants-item-btn webrtc-sandbox-participants-item-screen-btn';
                    if(!(participantInstance.isLocal && Q.info.isMobile)) participantItemControls.appendChild(screenBtnCon);
                    let screenBtnIcon = document.createElement('DIV');
                    screenBtnIcon.className = 'webrtc-sandbox-participants-item-icon webrtc-sandbox-participants-item-screen-icon';
                    screenBtnIcon.innerHTML = _streamingIcons.participantsEnabledScreenSource;
                    screenBtnCon.appendChild(screenBtnIcon);
                    let participantSourcesCon = document.createElement('DIV');
                    participantSourcesCon.className = 'webrtc-sandbox-participants-item-sources';
                    screenBtnIcon.addEventListener('click', listItemInstance.toggleScreensharing);

                    let cameraBtnCon = document.createElement('DIV');
                    cameraBtnCon.className = 'webrtc-sandbox-participants-item-btn webrtc-sandbox-participants-item-camera-btn';
                    participantItemControls.appendChild(cameraBtnCon);
                    let cameraBtnIcon = document.createElement('DIV');
                    cameraBtnIcon.className = 'webrtc-sandbox-participants-item-icon webrtc-sandbox-participants-item-camera-icon';
                    cameraBtnIcon.innerHTML = _streamingIcons.participantsDisabledCamera;
                    cameraBtnCon.appendChild(cameraBtnIcon);

                    _participantsListEl.appendChild(participantItemContainer);
        
                    listItemInstance.itemEl = participantItemContainer;
                    listItemInstance.videoIconEl = cameraBtnIcon;
                    listItemInstance.audioIconEl = audioBtnIcon;
                    listItemInstance.sourcesContainerEl = participantSourcesCon;
                    listItemInstance.screenIconEl = screenBtnIcon;
                    if(participantInstance.isLocal) {
                        _participantsList.unshift(listItemInstance);
                    } else {
                        _participantsList.push(listItemInstance);
                    }

                    cameraBtnCon.addEventListener('click', function(){
                        listItemInstance.toggleVisibility();
                    });
                
                    updateParticipantItem(participantInstance);
                }

                function updateParticipantItem() {

                }

                function removeParticipantItem(participant) {
                    log('ParticipantsList: removeParticipantItem', participant);
                    log('ParticipantsList: removeParticipantItem: _participantsList', _participantsList);
                    var item = _participantsList.filter(function (listItem) {
                        log('listItem', listItem.participantInstance)
                        return listItem.participantInstance == participant;
                    })[0];
                    log('ParticipantsList: removeParticipantItem: item', item);

                    if (item != null) item.remove();
                }

                function getListElement() {
                    log('ParticipantsList: getListElement');
                    return _participantsListEl;
                }
                function getListContainer() {
                    log('ParticipantsList: getListContainer');
                    return _participantsContainerEl;
                }

                return {
                    refreshList: refreshList,
                    getListElement: getListElement,
                    getListContainer: getListContainer
                }
            }

            function init() {
                let participantsList = new ParticipantsList();
                createSandboxUI();

                _participantsListCon.appendChild(participantsList.getListContainer());
            }

            return {
                init: init
            }
        }())

        if (sandbox) {
            let originalCallback = _options.onWebRTCRoomCreated;
            _options.onWebRTCRoomCreated = function () {
                originalCallback();
                sandboxWidget.init();
            }
        }

        /**
         * Show snipped with particular message
         * @method notice
         * @param {String} [message] Notice to show
         */
        var notice = (function() {
            
            var _notices = [];

            var Notice = function () {
                this.element = null;
                this.dissappearingTimer = null;
                this.top = null;
                this.update = function (message) {
                    this.element.innerHTML = message;
                    if(this.dissappearingTimer == null) return;

                    clearTimeout(this.dissappearingTimer);
                    this.dissappearingTimer = setTimeout(function() {
                        this.remove();
                    }.bind(this), 4000);
                };
                this.remove = function () {
                    log('notice: remove ', this.element.offsetTop)

                    this.element.classList.remove('shown');
                    setTimeout(function () {
                        if(this.element.parentNode != null) this.element.parentNode.removeChild(this.element);
                        for(let n = _notices.length - 1; n >= 0; n--) {
                            if(this == _notices[n]){
                                _notices.splice(n, 1);
                                break;
                            }
                        }
                        updateNoticesPostion();
                    }.bind(this), 200);
                };
            }

            function getMostBottomNotice() {
                if(_notices.length != 0) {
                    return Math.max.apply(Math, _notices.map(function(o) {
                        return o.element.offsetTop + o.element.offsetHeight;
                    }));
                }
                return 0;
            }

            function updateNoticesPostion() {    
                let sortedByTop = _notices.sort(function (a, b) {
                    return parseFloat(a.top) - parseFloat(b.top);
                })
        
                 for (let n = sortedByTop.length - 1; n >= 0; n--) {
        
                    if (n == 0) {
                        sortedByTop[n].element.style.top = '20px';
                        sortedByTop[n].top = 20;
        
                    } else {
                        if (sortedByTop[n - 1] != null && sortedByTop[n - 1].top != null) {
                            let top = (sortedByTop[n - 1].top + sortedByTop[n - 1].element.offsetHeight + 20);
                            sortedByTop[n].element.style.top = top + 'px';
                            sortedByTop[n].top = top;
                        }
                    }
                }
            }

            function show(message, withoutTimer, position) {

                var newNotice = new Notice();
                var noticeDiv;
                log('notice: show')

                /*if(newEl == null) {
					noticeDiv = document.querySelector('.notice-container-default');
					noticeDiv.innerHTML = message;
					var maxTop = getMostBottomNotice();
					if(maxTop != null) {
						noticeDiv.style.top = (maxTop + 20) + 'px';
					} else {
						noticeDiv.style.top = '';
					}
					noticeDiv.classList.add('shown');
					setTimeout(function () {
						noticeDiv.classList.remove('shown');
					}, 4000);
				} else {*/
                var maxTop = getMostBottomNotice();
                noticeDiv = document.createElement('DIV');
                noticeDiv.innerHTML = message;
                if(maxTop != null) {
                    let top = (maxTop + 20);
                    noticeDiv.style.top = top + 'px';
                    newNotice.top = top;
                }
                noticeDiv.classList.add('shown', 'notice-container');
                if(position != null) {
                    if(position == 'left') noticeDiv.classList.add('Media_webrtc_notice_position_left');
                    if(position == 'right') noticeDiv.classList.add('Media_webrtc_notice_position_right');
                } else {
                    noticeDiv.classList.add('Media_webrtc_notice_position_right');
                }

                if(withoutTimer == null) {

                    var dissappearingTimer = setTimeout(function () {
                        newNotice.remove();
                    }, 4000);

                    newNotice.dissappearingTimer = dissappearingTimer;
                }

                newNotice.element = noticeDiv;

                _notices.push(newNotice);
                document.body.appendChild(noticeDiv);
                return newNotice;
                //}
            }

            var noticeContainer = document.createElement('div');
            noticeContainer.className = 'notice-container notice-container-default';
            document.body.appendChild(noticeContainer);

            return {
                show:show,
            }
        }());

        /**
         * Render screens of all participants in the room
         * @method screensRendering
         */
        var screensRendering = (function () {
            var activeScreen;
            var activeScreenRect;
            var activeScreensType;
            var viewMode;
            var prevViewMode;
            var loudestMode;
            var loudestModeIsActive = false;
            var loudestModeIntervalFunc;
            var roomScreens = [];
            var _layoutEvents = new EventSystem();

            _layoutEvents.on('layoutRendered', function (e) {

                if(e.viewMode == 'audio') {
                    lockScreenResizingAndDragging();
                } else if(e.viewMode == 'minimized') {
                    updateScreensButtons();
                    /* if(loudestMode == 'disabled') {
                        disableLoudesScreenMode();
                    } */
                    unlockScreenResizingAndDragging();
                } else if(e.viewMode == 'screenSharing' || e.viewMode == 'fullScreen') {
                    updateScreensButtons()
                    lockScreenResizingAndDragging();
                } else if(e.viewMode == 'squaresGrid') {
                    updateScreensButtons()
                    lockScreenResizingAndDragging();
                } else {
                    updateScreensButtons();
                    unlockScreenResizingAndDragging();
                }
            })

            var Screen = function () {
                this.sid = null;
                this.participant = null;
                this.screenEl = null;
                this.videoCon = null;
                this.nameEl = null;
                this.videoScreen = {
                    screenEl: null,
                    nameEl: null,
                    videoCon: null
                };
                this.audioScreen = {
                    screenEl: null,
                    nameEl: null,
                    avatarCon: null,
                    avatarImgCon: null
                };
                this.tracks = [];
                this.streams = [];
                this.isMain = null;
                this.isLocal = null;
                this.isActive = false;
                this.screensharing = null;
                this.activeScreenType = null;
                this.videoTracks = function () {
                    return this.tracks.filter(function (trackObj) {
                        return trackObj.kind == 'video';
                    });
                }
                this.hasLiveTracks = function (kind, shouldBeUnmuted, shouldBeEnabled) {
                    var shouldBeLive = true; 
                    var hasLiveTracks = false;
                    for(let t in this.tracks) {
                        let track = this.tracks[t];
                        if(kind && kind != this.tracks[t].kind) continue;
                        let live = shouldBeLive ? track.mediaStreamTrack.readyState != 'ended' : true;
                        let streamIsActive = track.stream ? track.stream.active == true : false;
                        let unmuted = shouldBeUnmuted ? track.mediaStreamTrack.muted == false : true;
                        let enabled = shouldBeEnabled ? track.mediaStreamTrack.enabled == true : true;
                        if(live && streamIsActive && unmuted /*&& enabled*/) {
                            hasLiveTracks = true;
                            break;
                        }
                    }

                    return hasLiveTracks;
                }
                this.audioTracks = function () {
                    return this.tracks.filter(function (trackObj) {
                        return trackObj.kind == 'audio';
                    });
                }
                this.hasAnyTracks = function () {
                    var mediaElement = this.screenEl.querySelector('video, audio');
                    if(mediaElement != null) return true;
                    return false;
                };
                this.switchToAudioScreen = function () {
                    log('switchToAudioScreen : switchToAudioScreen0', this.activeScreenType)
                    if(this.activeScreenType == 'audio') return;
                    log('switchToAudioScreen : switchToAudioScreen1', this.activeScreenType)


                    this.show();
                    this.activeScreenType = 'audio';
                    this.removeAudioVisualization('video');
                    this.showAudioVisualization('audio');
                    //this.screenEl.innerHTML = '';
                    if(this.videoScreen.screenEl && this.videoScreen.screenEl.parentNode != null) {
                        this.videoScreen.screenEl.parentNode.removeChild(this.videoScreen.screenEl);
                    }
                    log('switchToAudioScreen : hasLiveTracks',  this.hasLiveTracks('video'));

                    this.fillAudioScreenWithAvatarOrVideo();
                    this.screenEl.appendChild(this.audioScreen.screenEl);
                };
                this.switchToVideoScreen = function () {
                    if(this.activeScreenType == 'video') return;
                    this.activeScreenType = 'video';
                    var videoTracks =  this.tracks.filter(function(t){
                        return t.kind == 'video' && t.mediaStreamTrack.enabled == true && t.mediaStreamTrack.readyState == 'live' ? true : false
                    })
                    log('switchToVideoScreen : videoTracks', videoTracks)
                    /*if(videoTracks.length == 0) {
                        this.hide();
                    } else {*/
                        for(let t in videoTracks) {
                            videoTracks[t].play();
                        }
                    //}
                    this.removeAudioVisualization('audio');
                    this.showAudioVisualization('video');

                    //this.screenEl.innerHTML = '';
                    if(this.audioScreen.screenEl && this.audioScreen.screenEl.parentNode != null) {
                        log('switchToVideoScreen : remove audio screenEl', videoTracks)

                        this.audioScreen.screenEl.parentNode.removeChild(this.audioScreen.screenEl);
                    }

                    /* if(this.videoTrackEl) {
                        log('switchToVideoScreen : append videoTrackEl', videoTracks)

                        this.videoScreen.videoCon.appendChild(this.videoTrackEl);
                    } */
                    log('switchToVideoScreen : append videoCon', this.videoScreen.videoCon)
                    log('switchToVideoScreen : append videoScreen.screenEl', this.videoScreen.screenEl)

                    this.fillVideoScreenWithAvatarOrVideo();
                    this.screenEl.appendChild(this.videoScreen.screenEl);
                };
                this.fillAudioScreenWithAvatarOrVideo = function () {
                    if(this.videoTrackEl && this.hasLiveTracks('video', true)) {
                        this.audioScreen.avatarImgCon.innerHTML = '';
                        this.audioScreen.avatarImgCon.appendChild(this.videoTrackEl);
                        if(options.useCanvasForVideo) {
                            this.audioScreen.avatarImgCon.appendChild(this.videoCanvasEl);
                        }
                    } else if (this.audioScreen.avatarImg != null){
                        this.audioScreen.avatarImgCon.innerHTML = '';
                        this.audioScreen.avatarImgCon.appendChild(this.audioScreen.avatarImg);
                    }
                }
                this.fillVideoScreenWithAvatarOrVideo = function () {
                    log('fillVideoScreenWithAvatarOrVideo');
                    if(this.videoTrackEl && this.hasLiveTracks('video', true)) {
                        log('fillVideoScreenWithAvatarOrVideo if1');

                        this.videoScreen.videoCon.innerHTML = '';
                        this.videoScreen.videoCon.appendChild(this.videoTrackEl);
                        /* this.videoTrackEl.style.position = 'absolute';
                        this.videoTrackEl.style.top = '-99999999px'; */
                        //this.videoTrackEl.play();
                        if(options.useCanvasForVideo) {
                            this.videoScreen.videoCon.appendChild(this.videoCanvasEl);
                        }
                    } else if (this.audioScreen.avatarImg != null){
                        log('fillVideoScreenWithAvatarOrVideo if2');
                        this.videoScreen.videoCon.innerHTML = '';
                        let avatarContainer = document.createElement('DIV');
                        avatarContainer.className = 'Media_webrtc_chat-participant-inavatar';
                        let dummy = document.createElement('DIV');
                        dummy.className = 'Media_webrtc_chat-participant-avatar-dummy';
                        //avatarContainer.appendChild(dummy);
                        avatarContainer.appendChild(this.audioScreen.avatarImg);
                        this.videoScreen.videoCon.appendChild(avatarContainer);
                    }
                }
                this.remove = function() {
                    let screen = this;
                    if(this.participant) {
                        for(let s in this.participant.screens) {
                            if(screen == this.participant.screens[s]){
                                this.participant.screens.splice(s, 1);
                                break;
                            }
                        }
                    }
                    this.hide();
                }
                this.hide = function() {
                    log('screen.hide');
                    let screen = this;
                    if(screen.videoIsChanging) {
                        return;
                    }
                    if(screen.screenEl != null && screen.screenEl.parentElement != null) {
                        log('screen.hide removeChild', screen.screenEl);

                        screen.screenEl.parentElement.removeChild(screen.screenEl);
                    }

                    for(let m in roomScreens) {
                        if(screen == roomScreens[m]){
                            screen.isActive = false;
                            roomScreens.splice(m, 1);
                            break;
                        }
                    }

                    if(screen.activeScreenType == 'video') {
                        let appendedToNextScreen = false;
                        if (screen.videoScreen.soundEl != null && screen.participant.voiceMeterTools && screen.participant.voiceMeterTools.simple != null
                            && screen.participant.voiceMeterTools.simple.element != null) {
                            log('screen.hide move sound', screen.participant.screens.length);

                            for (let s in screen.participant.screens) {
                                let scr = screen.participant.screens[s];
                                log('screen.hide move sound change');
                                if (scr == screen || !scr.isActive) continue;
                                log('screen.hide move sound change 2');
                                scr.videoScreen.soundEl.appendChild(screen.participant.voiceMeterTools.simple.element);
                                appendedToNextScreen = true;
                                break;
                            }
                        }
                        if (!appendedToNextScreen) {
                            this.removeAudioVisualization('video');
                        }
                    } else {
                        this.removeAudioVisualization('audio');
                    }
                };
                this.show = function() {
                    let screen = this;
                    log('screen.show: screen before check', screen);

                    var presentInScreensList = false;
                    for(let m in roomScreens) {
                        log('screen.show: screen check', m, screen == roomScreens[m]);
                        log('screen.show: screen check 2', roomScreens[m]);

                        if(screen == roomScreens[m]){
                            log('screen.show: screen exists in roomScreens');

                            presentInScreensList = true;
                            break;
                        }
                    }
                    screen.isActive = true;

                    if(!presentInScreensList) roomScreens.push(screen);
                    log('screen.show: after ', roomScreens.length);

                    webrtcSignalingLib.event.dispatch('screenShown', screen);

                    if(screen.activeScreenType == 'video') {
                        this.showAudioVisualization('video');
                    } else {
                        this.showAudioVisualization('audio');
                    }

                }
                this.showAudioVisualization = function (type) {
                    var screen = this;   
                    if (type == 'video') {
                        if (screen.participant.voiceMeterTools && screen.participant.voiceMeterTools.simple && screen.participant.voiceMeterTools.simple.element && !screen.participant.voiceMeterTools.simple.element.parentElement) {
                            screen.videoScreen.soundEl.appendChild(screen.participant.voiceMeterTools.simple.element);
                            screen.participant.voiceMeterTools.simple.resume();
                        }
                    } else if(type == 'audio') {
                        if (screen.participant.voiceMeterTools && screen.participant.voiceMeterTools.circles && screen.participant.voiceMeterTools.circles.element && !screen.participant.voiceMeterTools.circles.element.parentElement) {
                            screen.audioScreen.soundEl.appendChild(screen.participant.voiceMeterTools.circles.element);
                            screen.participant.voiceMeterTools.circles.resume();
                        }
                    }
                };
                this.removeAudioVisualization = function (type) {
                    var screen = this;

                    if(type == 'video') {
                        if (screen.participant.voiceMeterTools && screen.participant.voiceMeterTools.simple && screen.participant.voiceMeterTools.simple.element && screen.participant.voiceMeterTools.simple.element.parentElement) {
                            screen.participant.voiceMeterTools.simple.element.parentElement.removeChild(screen.participant.voiceMeterTools.simple.element);
                            screen.participant.voiceMeterTools.simple.pause();
                        }
                    } else if(type == 'audio') {
                        if (screen.participant.voiceMeterTools && screen.participant.voiceMeterTools.circles && screen.participant.voiceMeterTools.circles.element && screen.participant.voiceMeterTools.circles.element.parentElement) {
                            screen.participant.voiceMeterTools.circles.element.parentElement.removeChild(screen.participant.voiceMeterTools.circles.element);
                            screen.participant.voiceMeterTools.circles.pause();
                        }
                    }
                };

            };

            if(Q.info.isMobile){
                if(_options.audioOnlyMode) {
                    viewMode = prevViewMode = 'audio';
                } else {
                    viewMode = prevViewMode = _options.defaultMobileViewMode || 'maximizedMobile';
                }
            } else {
                if(_options.audioOnlyMode) {
                    viewMode = prevViewMode = 'audio';
                } else {
                    viewMode = prevViewMode = _options.defaultDesktopViewMode || 'regular';
                }
            }
            if(_options.minimizeOnPageSwitching) {
                Q.Page.onActivate('').set(function(){
                    if(viewMode == 'minimized' || viewMode == 'minimizedMobile') return;
                    switchScreensMode('minimizedStatic');
                }, 'Media.WebRTC');
            }

            function setViewMode(mode) {
                viewMode = mode;
                updateLayout();
            }

            /**
             * Updates current layout; usually is called by handlers binded on events triggered by WebRTC lib (app.js)
             * @method updateLayout
             */
            function updateLayout() {
                if(webrtcSignalingLib == null) return;
                log('updateLayout, current mode is ', viewMode);

                log('updateLayout, roomScreens', roomScreens.length);

                var roomParticipants = webrtcSignalingLib.roomParticipants();
                var i, participantScreen;
                for(i = 0; participantScreen = roomScreens[i]; i++) {
                    if(participantScreen.isLocal) updateLocalScreenClasses(participantScreen);

                }

                function doPlayTracks() {
                    var i, screen;
                    for (i = 0; screen = roomScreens[i]; i++) {
                        if(screen.videoTrack && screen.isActive) {
                            screen.videoTrack.play();
                        }
                    }
                }

                if(Q.info.isMobile){
                    if(viewMode == 'tiledMobile'){
                        renderTiledScreenGridMobile();
                    } else if(viewMode == 'sideBySideMobile'){
                        if(roomScreens.length != 2) {
                            renderTiledScreenGridMobile();
                        } else {
                            renderSideBySideGridMobile();
                        }
                    } else if(viewMode == 'maximizedMobile') {
                        if(activeScreen == null && roomScreens.length == 2) {
                            var i, screen;
                            for(i = 0; screen = roomScreens[i]; i++) {
                                if(!screen.isLocal) {
                                    activeScreen = screen;
                                }
                            }
                        }

                        if(activeScreen != null && !_roomsMedia.contains(activeScreen.screenEl)) {
                            activeScreen = roomScreens[0];
                        }

                        renderMaximizedScreensGridMobile();
                    } else if(viewMode == 'minimizedMobile') {
                        renderMinimizedScreensGridMobile();
                    } else if(viewMode == 'audio') {
                        renderAudioScreensGrid();
                    } else if(viewMode == 'squaresGrid') {
                        renderSquaresGridMobile();
                    }

                    doPlayTracks();
                } else {
                    //renderMinimizedScreensGrid()
                    if(viewMode == null || viewMode == 'regular'){
                        renderDesktopScreensGrid();
                    } else if(viewMode == 'audio'){
                        renderAudioScreensGrid();
                    } else if(viewMode == 'maximized'){
                        renderMaximizedScreensGrid();
                    } else if(viewMode == 'minimized'){
                        renderMinimizedScreensGrid();
                    } else if(viewMode == 'tiled'){
                        renderTiledScreenGridDesktop();
                    } else if(viewMode == 'manual'){
                        renderManualScreensGrid();
                    } else if(viewMode == 'fullScreen' || viewMode == 'screenSharing'){
                        renderFullScreenLayout();
                    }
                    /*if(activeScreen && activeScreen.isLocal && roomParticipants.length == 1) {
						renderMinimizedScreensGrid();
						viewMode == 'maximized';
					}*/

                    doPlayTracks();

                }

                bindScreensEvents();
            }

            /**
             * Returns active (maximized) screen
             * @returns {Object}
             */
            function getActiveSreen() {
                return activeScreen;
            }

            /**
             * Returns active screens view mode
             * @returns {String}
             */
            function getActiveViewMode() {
                return viewMode;
            }

            /**
             * Returns active loudest mode or "disabled" if loudest mode is turned off
             * @returns {String}
             */
            function getLoudestMode() {
                return loudestMode;
            }

            /**
             * Create participant's screen element that contains participant's video and is rendered one the page
             * @method createRoomScreen
             * @param {Object} [screen] screen object generated by webrtcSignalingLib (WebRTC library)
             * @return {HTMLElement}
             */
            function createRoomScreen(participant) {
                //log('createRoomScreen', participant, participant.isLocal);
                //check whether it was room switching
                /*if(participant.isLocal) {
                    for(let s in roomScreens) {
                        log('onParticipantConnected for', participant.isLocal, roomScreens[s].participant.sid == participant.sid)

                        if(roomScreens[s].participant.isLocal && roomScreens[s].participant.sid != participant.sid) {
                            log('onParticipantConnected for break', roomScreens[s].participant.sid, participant.sid)

                            roomScreens[s].participant = participant;
                            return;
                        }
                    }
                }*/
                var screen = new Screen();
                screen.sid = participant.sid;
                screen.participant = participant;
                screen.isLocal = participant.isLocal;
                participant.screens.push(screen);

                var chatParticipantEl = screen.screenEl = document.createElement('DIV');
                chatParticipantEl.className = 'Media_webrtc_chat-participant';
                chatParticipantEl.dataset.participantName = screen.sid;
                if(screen.screensharing) chatParticipantEl.classList.add('Media_webrtc_chat-active-screen-sharing');

                var videoScreen = createVideoScreen(screen);
                var audioScreen = createAudioScreen(screen);

                /*if(viewMode != 'audio') {
                    screen.switchToVideoScreen();
                } else {
                    screen.switchToAudioScreen();
                }*/
                //chatParticipantEl.appendChild(videoScreen.videoCon);
                //chatParticipantEl.appendChild(audioScreen.nameEl);
                //chatParticipantEl.appendChild(audioScreen.avatarCon);


                if(Q.info.isTouchscreen) {
                    chatParticipantEl.addEventListener('touchstart', moveScreenFront);
                } else chatParticipantEl.addEventListener('mousedown', moveScreenFront);

                if(Q.info.isTouchscreen) {
                    chatParticipantEl.addEventListener('touchend', function (e) {
                        var resizeTool = Q.Tool.from(chatParticipantEl, "Q/resize");
                        if(resizeTool.isScreenResizing) return;
                        toggleViewModeByScreenClick(e);
                    }, false);
                } else chatParticipantEl.addEventListener('click', toggleViewModeByScreenClick);


                if(screen.isLocal) updateLocalScreenClasses(screen);

                _renderedScreens.push(chatParticipantEl);
                return screen;
            }

            /**
             * Create participant's screen element that contains participant's video and is rendered one the page
             * @method createRoomScreen
             * @param {Object} [screen] screen object generated by webrtcSignalingLib (WebRTC library)
             * @return {HTMLElement}
             */
            function createVideoScreen(screen) {
                log('createVideoScreen', screen);

                var videoScreenEl = screen.videoScreen.screenEl = document.createElement('DIV');
                videoScreenEl.className = 'Media_webrtc_chat-participant-video-screen';
                videoScreenEl.dataset.participantName = screen.sid;
                if(screen.screensharing) videoScreenEl.classList.add('Media_webrtc_chat-active-screen-sharing');
                var chatParticipantVideoCon = screen.videoScreen.videoCon = document.createElement('DIV');
                chatParticipantVideoCon.className = 'Media_webrtc_chat-participant-video';
                var chatParticipantName = screen.videoScreen.nameEl = document.createElement('DIV');
                chatParticipantName.className = 'Media_webrtc_chat-participant-name';
                var participantVoice = screen.videoScreen.soundEl = document.createElement('DIV');
                participantVoice.className = "Media_webrtc_participant-voice";
                var participantNameTextCon = screen.videoScreen.nameTextEl = document.createElement("DIV");
                participantNameTextCon.className = "Media_webrtc_participant-name-text";
                var participantNameText = document.createElement("DIV");
                var userId = screen.participant.identity != null ? screen.participant.identity.split('\t')[0] : Q.Users.loggedInUser.id;

                Q.activate(
                    Q.Tool.setUpElement(
                        participantNameText, // or pass an existing element
                        "Users/avatar",
                        {
                            userId: userId,
                            icon: false
                        }
                    ),
                    {},
                    function () {
                        setTimeout(function () {
                            screensRendering.updateLayout();
                        }, 1000);

                    }
                );

                const ro = new window.ResizeObserver(entries => {
                    for(let entry of entries){
                        const width = entry.contentRect.width;
                        const height = entry.contentRect.height;

                        if(width/height < 1) {
                            if(entry.target.classList.contains('Media_webrtc_chat-video-horizontal')) entry.target.classList.remove('Media_webrtc_chat-video-horizontal')
                            if(!entry.target.classList.contains('Media_webrtc_chat-video-vertical')) entry.target.classList.add('Media_webrtc_chat-video-vertical')
                        } else {
                            if(entry.target.classList.contains('Media_webrtc_chat-video-vertical')) entry.target.classList.remove('Media_webrtc_chat-video-vertical')
                            if(!entry.target.classList.contains('Media_webrtc_chat-video-horizontal')) entry.target.classList.add('Media_webrtc_chat-video-horizontal')
                        }
                    }
                })

                ro.observe(screen.videoScreen.videoCon)

                if(screen.participant.voiceMeterTools && screen.participant.voiceMeterTools.simple && !screen.participant.voiceMeterTools.simple.element.parentElement) {
                    participantVoice.appendChild(screen.participant.voiceMeterTools.simple.element);
                }

                participantNameTextCon.appendChild(participantNameText);
                chatParticipantName.appendChild(participantNameTextCon);
                chatParticipantName.appendChild(participantVoice);
                videoScreenEl.appendChild(chatParticipantName);

                var screensBtns= document.createElement("DIV");
                screensBtns.className = "Media_webrtc_participant-screen-btns";
                var fullScreenBtn = document.createElement("BUTTON");
                fullScreenBtn.className = 'Media_webrtc_fullscreen-btn'
                var maximizeBtn = document.createElement("BUTTON");
                maximizeBtn.className = 'Media_webrtc_maximize-btn'
                maximizeBtn.innerHTML = '<img src="' + Q.url('{{Q}}/img/grow.png') + '">';
                var minimizeBtn = document.createElement("BUTTON");
                minimizeBtn.className = 'Media_webrtc_minimize-btn';
                minimizeBtn.style.display = 'none';
                minimizeBtn.innerHTML = '<img src="' + Q.url('{{Q}}/img/shrink.png') + '">';
                if(screen.screensharing) screensBtns.appendChild(fullScreenBtn)
                screensBtns.appendChild(maximizeBtn)
                screensBtns.appendChild(minimizeBtn)
                chatParticipantName.appendChild(screensBtns);

                if(screen.screensharing) {
                    fullScreenBtn.addEventListener('click', function (e) {
                        switchScreensMode('fullScreen', screen);
                        e.preventDefault();
                        e.stopPropagation();
                    });
                }

                maximizeBtn.addEventListener('click', function (e) {
                    switchScreensMode('maximizedStatic', screen);
                    e.preventDefault();
                    e.stopPropagation();
                });

                minimizeBtn.addEventListener('click', function (e) {
                    switchScreensMode('minimizedStatic');
                    e.preventDefault();
                    e.stopPropagation();
                });

                videoScreenEl.appendChild(chatParticipantVideoCon);

                chatParticipantVideoCon.addEventListener('click', function (e) {
                    e.preventDefault();
                });

                return screen.videoScreen;
            }

            /**
             * Create participant's screen element that contains participant's video and is rendered one the page
             * @method createRoomScreen
             * @param {Object} [screen] screen object generated by webrtcSignalingLib (WebRTC library)
             * @return {HTMLElement}
             */
            function createAudioScreen(screen) {
                log('createAudioScreen', screen);
                var audioScreenEl = screen.audioScreen.screenEl = document.createElement('DIV');
                audioScreenEl.className = 'Media_webrtc_chat-participant-audio-screen';
                audioScreenEl.dataset.participantName = screen.sid;
                if(screen.screensharing) audioScreenEl.classList.add('Media_webrtc_chat-active-screen-sharing');
                var chatParticipantAvatarCon = screen.audioScreen.avatarCon = document.createElement('DIV');
                chatParticipantAvatarCon.className = 'Media_webrtc_chat-participant-avatar-con';
                audioScreenEl.appendChild(chatParticipantAvatarCon);
                var dummyElForEqualHeight = document.createElement('DIV');
                dummyElForEqualHeight.className = 'Media_webrtc_chat-participant-avatar-dummy';
                chatParticipantAvatarCon.appendChild(dummyElForEqualHeight);

                var chatParticipantAvatarInner = screen.audioScreen.avatarImgCon = document.createElement('DIV');
                chatParticipantAvatarInner.className = 'Media_webrtc_chat-participant-avatar';
                chatParticipantAvatarCon.appendChild(chatParticipantAvatarInner);
                var chatParticipantAudio = screen.audioScreen.soundEl = document.createElement('DIV');
                chatParticipantAudio.className = 'Media_webrtc_chat-participant-audio';
                chatParticipantAvatarCon.appendChild(chatParticipantAudio);
                var chatParticipantName = screen.audioScreen.nameEl = document.createElement('DIV');
                chatParticipantName.className = 'Media_webrtc_chat-participant-name';
                audioScreenEl.appendChild(chatParticipantName);
                var participantNameTextCon = document.createElement("DIV");
                participantNameTextCon.className = "Media_webrtc_participant-name-text";
                chatParticipantName.appendChild(participantNameTextCon);
                var participantNameText = document.createElement("DIV");
                participantNameTextCon.appendChild(participantNameText);
                log('createAudioScreen circles', screen.participant.voiceMeterTools);
                if(screen.participant.voiceMeterTools && screen.participant.voiceMeterTools.circles && !screen.participant.voiceMeterTools.circles.element.parentElement) {
                    log('createAudioScreen circles');
                    chatParticipantAudio.appendChild(screen.participant.voiceMeterTools.circles.element)
                }

                var userId = screen.participant.identity != null ? screen.participant.identity.split('\t')[0] : Q.Users.loggedInUser.id;

                Q.Streams.Avatar.get(userId, function (err, avatar) {
                    if (!avatar) {
                        return;
                    }
                    log('createAudioScreen: setAvatar', screen);

                    participantNameText.innerHTML = avatar.firstName;
                    var largestSize = Q.largestSize(Q.image.sizes['Users/icon'], false, {
                        minimumDimensions: '400x400'
                    });
                    var src = Q.url(avatar.iconUrl(largestSize));
                    if(src != null) {
                        var avatarImg = new Image();
                        avatarImg.src = src;
                        avatarImg.setAttribute('draggable', false);

                        chatParticipantAvatarInner.appendChild(avatarImg);
                        screen.audioScreen.avatarImg = avatarImg;

                        if(screen.activeScreenType == 'audio') {
                            screen.fillAudioScreenWithAvatarOrVideo();
                        } else {
                            screen.fillVideoScreenWithAvatarOrVideo();
                        }
                    }
                });

                chatParticipantAvatarCon.addEventListener('click', function (e) {
                    e.preventDefault();
                });

                _layoutEvents.dispatch('audioScreenCreated', {audioScreen:screen.audioScreen, participant:screen.participant});

                return screen.audioScreen;
            }


            /**
             * Appends HTML media element of the track to existing screen
             * @method newTrackAdded
             * @param {Object} [track] new track
             * @return {HTMLElement}
             */
            function newTrackAdded(track, participant) {
                log('newTrackAdded START', track, participant.screens.length, participant.isLocal);
                if(participant.screens.length >= 1) log('newTrackAdded', participant.screens[0].tracks.length);
                var trackParentScreen;
                if(track.kind == 'video') {
                    if(track.parentScreen != null) {
                        trackParentScreen = track.parentScreen;
                    }  else if(participant.screens.length == 1 && participant.screens[0].tracks.length == 0){
                        log('newTrackAdded if2');

                        trackParentScreen = participant.screens[0];
                    } else {
                        log('newTrackAdded else');
                        trackParentScreen = createRoomScreen(participant);
                    }

                    trackParentScreen.videoTrack = track;
                    trackParentScreen.videoTrackEl = track.trackEl;
                    trackParentScreen.videoCanvasEl = track.videoCanvasEl;
                    //trackParentScreen.videoScreen.videoCon.appendChild(track.trackEl);

                    if(trackParentScreen.activeScreenType == 'audio') {
                        trackParentScreen.fillAudioScreenWithAvatarOrVideo();
                    } else {
                        trackParentScreen.fillVideoScreenWithAvatarOrVideo();
                    }
                } else if(!track.screensharing) {
                    if(participant.voiceMeterTools && Object.keys(participant.voiceMeterTools) != 0) {
                        log('newTrackAdded else if1');

                        for(let i in participant.voiceMeterTools) {
                            participant.voiceMeterTools[i].replaceSource(track.stream);
                        }
                    } else {
                        if(!participant.voiceMeterTools) {
                            participant.voiceMeterTools = {};
                        }
                        log('newTrackAdded else if2');
                        

                        //if(!screen || !screen.videoScreen || !screen.videoScreen.soundEl) return;
                        
                        var soundMeter = document.createElement('DIV');
                        soundMeter.className = 'Media_webrtc_voice-meter';
                        Q.activate(
                            Q.Tool.setUpElement(
                                soundMeter,
                                "Media/audioVisualization",
                            ),
                            {
                                source: track.stream,
                                format:'html',
                                shape: 'bars',
                                onRender: function (average) {
                                    participant.voiceMeterAverage = average
                                },
                                size: {
                                    width:26,
                                    height: 26
                                }
                            },
                            function () {
                                participant.voiceMeterTools.simple = this;
                                let screen = participant.screens.filter(function (o) {
                                    return o.screensharing ? false : true;
                                })[0];
                                if(!screen) {
                                    screen = participant.screens[0];
                                }
                                if(screen && screen.videoScreen && screen.videoScreen.soundEl != null) {
                                    screen.videoScreen.soundEl.appendChild(soundMeter);
                                }
                            }
                        );

                        
                        
                        var circlesSoundMeter = document.createElement('DIV');
                        circlesSoundMeter.className = 'Media_webrtc_voice-meter-circles';
                        Q.activate(
                            Q.Tool.setUpElement(
                                circlesSoundMeter,
                                "Media/audioVisualization",
                            ),
                            {
                                source: track.stream,
                                format:'html',
                                shape: 'circles',
                                onRender: function (average) {
                                    participant.voiceMeterAverage = average
                                },
                                size: {
                                    width:'100%',
                                    height: '100%'
                                }
                            },
                            function () {
                                participant.voiceMeterTools.circles = this;
                                let screen = participant.screens.filter(function (o) {
                                    return o.screensharing ? false : true;
                                })[0];
                                if(!screen) {
                                    screen = participant.screens[0];
                                }
                                if(screen && screen.audioScreen && screen.audioScreen.soundEl != null) {
                                    log('newTrackAdded else if2 circles');
        
                                    screen.audioScreen.soundEl.appendChild(circlesSoundMeter);
                                }
                            }
                        );

                        
                    }
                }


            }


            function onParticipantConnected(participant) {
                log('onParticipantConnected', participant,participant.isLocal)

                if(participant.screens.length == 0) {
                    var newScreen = createRoomScreen(participant);
                    if(!(webrtcSignalingLib.limits && (webrtcSignalingLib.limits.audio || webrtcSignalingLib.limits.video))) {
                        addScreenToCommonList(newScreen);
                    }
                } else {
                    for(let s in participant.screens) {
                        addScreenToCommonList(participant.screens[s]);
                    }
                }
            }

            function onParticipantDisconnected(participant) {
                screensRendering.removeScreensByParticipant(participant);
                //addScreenToCommonList(newScreen);
            }

            function videoTrackIsAdding(track, participant) {
                if(track.parentScreen != null) return;

                var screenToAttach;
                if(track.kind == 'video' && track.screensharing) {
                    log('videoTrackIsAdding: screensharing', participant.screens);

                    if(!participant.isLocal) {
                        screenToAttach = participant.screens.filter(function (scrn) {
                            return scrn.screensharing == true && !scrn.hasLiveTracks('video');
                        })[0];

                        //if remote user connects to room after screensharingStarting event (and skips this event, which prepares screen for screensharing)
                        if(!screenToAttach) {
                            screenToAttach = participant.screens.filter(function (scrn) {
                                return !scrn.hasLiveTracks('video');
                            })[0];
                        }
                    } else {
                        screenToAttach = participant.screens.filter(function (scrn) {
                            return !scrn.hasLiveTracks('video');
                        })[0];
                    }

                    if(!screenToAttach) {
                        screenToAttach = createRoomScreen(participant);
                    }
                    track.parentScreen = screenToAttach;
                    screenToAttach.videoTrack = track;
                    screenToAttach.videoTrackEl = track.trackEl;
                } else if(track.kind == 'video') {
                    log('videoTrackIsAdding: regular video', participant.isLocal);

                    for(var s in participant.screens) {
                        log('videoTrackIsAdding for', participant.screens[s].hasLiveTracks('video', true))
                        if(!participant.screens[s].screensharing && !participant.screens[s].hasLiveTracks('video', true)) {
                            screenToAttach = participant.screens[s];
                            break;
                        }
                    }
                    log('videoTrackIsAdding: screenToAttach', screenToAttach);


                    if(!screenToAttach) {
                        screenToAttach = createRoomScreen(participant);
                    }

                    track.parentScreen = screenToAttach;
                    if(screenToAttach.videoTrackEl != null) {
                        if(screenToAttach.videoTrackEl.parentNode) screenToAttach.videoTrackEl.parentNode.removeChild(screenToAttach.videoTrackEl)
                    }
                    screenToAttach.videoTrack = track;
                    screenToAttach.videoTrackEl = track.trackEl;

                }

                if(screenToAttach != null) screenToAttach.screensharing = track.screensharing == true ? true : false;

                track.participant = participant;

                if(screenToAttach != null) screenToAttach.tracks.push(track);

                showLoader('videoTrackIsBeingAdded', {screen: screenToAttach, participant: participant});
            }

            /**
             * Make screens resizible and movable
             * @method bindScreensEvents
             */
            function bindScreensEvents() {

                var i, participantScreen;
                for(i = 0; participantScreen = roomScreens[i]; i++) {
                    var resizeTool = Q.Tool.from(participantScreen.screenEl, "Q/resize");
                    if(resizeTool == null) {
                        let screen = participantScreen;
                        Q.activate(
                            Q.Tool.setUpElement(
                                participantScreen.screenEl, // or pass an existing element
                                "Q/resize",
                                {
                                    movable: true,
                                    active: true,
                                    showShadow: false,
                                    moveWithinArea: 'window',
                                    keepRatioBasedOnElement: null
                                }
                            ),
                            {},
                            function () {
                                let tool = this;
                                tool.state.keepRatioBasedOnElement = {
                                    get width() {
                                        if(screen.videoTrackEl) {
                                            return screen.screenEl.getBoundingClientRect().width;
                                        }
                                        return null
                                    },
                                    get height() {
                                        if(screen.videoTrackEl) {
                                            return screen.screenEl.getBoundingClientRect().height;
                                        }
                                        return null
                                    }
                                }
                            }
                        );
                    }

                }
            }

            /**
             * Returns new size with keeping ratio (helper function for rendering layouts)
             * @method getElementSizeKeepingRatio
             * @param {Objet} [initSize] Initial size
             * @param {Integer} [initSize.width] Initial width
             * @param {Integer} [initSize.height] Initial height
             * @param {Object} [baseSize] Size to which initial size should be changed with keeping ratio.
             * @param {Integer} [baseSize.width] Max width
             * @param {Integer} [baseSize.height] Max height
             * @return {Object}
             */
            function getElementSizeKeepingRatio(initSize, baseSize) {
                var ratio = Math.min(baseSize.width / initSize.width, baseSize.height / initSize.height);

                return { width: Math.floor(initSize.width*ratio), height: Math.floor(initSize.height*ratio)};
            }

            /**
             * Updates layout and screen element class when video's loadedmetadata event is triggered
             * @method getElementSizeKeepingRatio
             * @param {HTMLElement} [videoEl] HTML video element
             * @param {Object} [screen] Parent screen of video element
             * @param {Boolean} [reset] Whether to reset current screen's size in case if it was resized manually.
             */
            function fitScreenToVideo(videoEl, screen) {
                log('fitScreenToVideo');
                if(videoEl.videoHeight != null && videoEl.videoWidth != null && videoEl.videoHeight != 0 && videoEl.videoWidth != 0 && videoEl.parentNode != null) {

                    if (videoEl.videoHeight > videoEl.videoWidth) {
                        if ((viewMode == 'maximized' || viewMode == 'maximizedMobile' || viewMode == 'regular') && !videoEl.parentNode.classList.contains('isVertical')) videoEl.parentNode.classList.add('isVertical');
                        videoEl.className = 'isVertical';
                    } else if (videoEl.videoWidth) {
                        if ((viewMode == 'maximized' || viewMode == 'maximizedMobile' || viewMode == 'regular') && !videoEl.parentNode.classList.contains('isHorizontal')) videoEl.parentNode.classList.add('isHorizontal');
                        videoEl.className = 'isHorizontal';
                    }

                }

                var resizeTool = Q.Tool.from(screen.screenEl, "Q/resize");
                if(resizeTool != null) {
                    //resizeTool.state.keepRatioBasedOnElement = videoEl;
                }
            }

            /**
             * Flip local video from front camera / remove flipping of screensharing video
             * @method updateLocalScreenClasses
             * @param {Object} [screen] Local screen to update.
             */
            function updateLocalScreenClasses(screen) {
                if(screen.screensharing == true) {
                    screen.screenEl.classList.add('Media_webrtc_chat-active-screen-sharing');
                    screen.screenEl.classList.add('Media_webrtc_chat-local-screen-sharing');
                    screen.videoScreen.videoCon.classList.remove('Media_webrtc_chat-flipped-video');
                }

                var frontCameraDevice = webrtcSignalingLib.localMediaControls.frontCameraDevice();
                var currentCameraDevice = webrtcSignalingLib.localMediaControls.currentCameraDevice();
                if(!screen.screensharing && (Q.info.isMobile && ((screen.videoTrack && screen.videoTrack.frontCamera) || currentCameraDevice == frontCameraDevice)) || (!Q.info.isMobile && !screen.screensharing)) {
                    if(screen.videoScreen.videoCon != null) {
                        screen.videoScreen.videoCon.classList.add('Media_webrtc_chat-flipped-video');
                    }
                    screen.screenEl.classList.remove('Media_webrtc_chat-active-screen-sharing');
                } else if(screen.videoScreen.videoCon) {
                    screen.videoScreen.videoCon.classList.remove('Media_webrtc_chat-flipped-video');
                }
            }

            function lockScreenResizingAndDragging() {
                log('lockScreenResizingAndDragging');
                for(var s in roomScreens) {
                    var resizeTool = Q.Tool.from(roomScreens[s].screenEl, "Q/resize");
                    if(resizeTool) resizeTool.state.active = false;
                }
            }

            function unlockScreenResizingAndDragging() {
                log('unlockScreenResizingAndDragging');
                for(var s in roomScreens) {
                    var resizeTool = Q.Tool.from(roomScreens[s].screenEl, "Q/resize");
                    if(resizeTool) resizeTool.state.active = true;
                }
            }

            /**
             * Updates icons of Maximize/Minimize buttons (top right of participant's screen) when view mode is changed
             * @method updateScreensButtons
             */
            function updateScreensButtons() {

                if(viewMode == 'regular') {
                    var i, screen;
                    for (i = 0; screen = roomScreens[i]; i++) {
                        var maximizeBtn = screen.videoScreen.nameEl.querySelector('.Media_webrtc_maximize-btn');
                        var minimizeBtn = screen.videoScreen.nameEl.querySelector('.Media_webrtc_minimize-btn');
                        if(!Q.info.isMobile)  maximizeBtn.style.display = '';
                        minimizeBtn.style.display = 'none';
                    }

                } else if(viewMode == 'maximized' || viewMode == 'maximizedMobile') {
                    var i, screen;
                    for (i = 0; screen = roomScreens[i]; i++) {

                        var maximizeBtn = screen.videoScreen.nameEl.querySelector('.Media_webrtc_maximize-btn');
                        var minimizeBtn = screen.videoScreen.nameEl.querySelector('.Media_webrtc_minimize-btn');
                        if(screen == activeScreen) {
                            maximizeBtn.style.display = 'none';
                            minimizeBtn.style.display = '';
                        } else {
                            if(!Q.info.isMobile){
                                maximizeBtn.style.display = '';
                            } else {
                                maximizeBtn.style.display = 'none';

                            }
                            minimizeBtn.style.display = 'none';
                        }
                    }

                } else if(viewMode == 'minimized' || viewMode == 'tiled' || viewMode == 'minimizedMobile' || viewMode == 'squaresGrid') {
                    var i, screen;
                    for (i = 0; screen = roomScreens[i]; i++) {
                        var maximizeBtn = screen.videoScreen.nameEl.querySelector('.Media_webrtc_maximize-btn');
                        var minimizeBtn = screen.videoScreen.nameEl.querySelector('.Media_webrtc_minimize-btn');
                        maximizeBtn.style.display = 'none';
                        minimizeBtn.style.display = 'none';
                    }
                } else if(viewMode == 'screenSharing') {
                    var i, screen;
                    for (i = 0; screen = roomScreens[i]; i++) {
                        var maximizeBtn = screen.videoScreen.nameEl.querySelector('.Media_webrtc_maximize-btn');
                        var minimizeBtn = screen.videoScreen.nameEl.querySelector('.Media_webrtc_minimize-btn');
                        if(!Q.info.isMobile) maximizeBtn.style.display = 'none';
                        minimizeBtn.style.display = 'none';
                    }
                }

            }

            /**
             * Move screen front while dragging it.
             * @method moveScreenFront
             */
            function moveScreenFront(e) {
                if(e != null && viewMode == 'screenSharing') return;
                var screenEl = this;
                var currentHighestZIndex = Math.max.apply(Math, roomScreens.map(function(o) { return o.screenEl != null && o.screenEl.style.zIndex != '' ? o.screenEl.style.zIndex : 1000; }))
                screenEl.style.zIndex = currentHighestZIndex+1;

                if(Q.info.isCordova && Q.info.platform === 'ios' && _options.useCordovaPlugins) {
                    var video = screenEl.querySelector('video');

                    if(video != null) {
                        video.style.zIndex = currentHighestZIndex+1;
                    }
                }

            }

            /**
             * On mobile, moves maximized screen back when new minimized screen added and while animation.
             * @method moveScreenBack
             * @param {Object} [screenEl] HTML element of the screen.
             */
            function moveScreenBack(e) {
                var screenEl = this;
                var currentLowestZIndex = Math.min.apply(Math, roomScreens.map(function(o) {
                    return o.screenEl != null && o.screenEl.style.zIndex != '' ? o.screenEl.style.zIndex : 1000;
                }).filter(function (el) {return el != null;}))

                screenEl.style.zIndex = currentLowestZIndex-1;
            }

            /**
             * Shows loader on participant's screen when new video is being added or changed.
             * @method showLoader
             * @param {String} [loaderName] Name of loader that depends on what action happened (camera toggling etc).
             * @param {Object} [participant] Participant on whose screen loader should be displayed.
             */
            function showLoader(loaderName, usefulData) {
                log('showLoader', loaderName, usefulData)

                var participant = usefulData.participant;
                var screen;
                if(usefulData.screen != null) {
                    screen = usefulData.screen;
                } else {
                    screen = participant.screens.filter(function (scrn) {
                        return (scrn.screensharing == true && !scrn.hasLiveTracks('video'));
                    })[0];
                    log('showLoader screen 1', screen)

                    if(screen == null) {
                        screen = participant.screens.filter(function (scrn) {
                            return !scrn.screensharing;
                        })[0];
                    }
                }

                log('showLoader', screen,  participant.screens.length)
                if(screen == null) return;
                if(screen.screenEl == null) {
                    log('showLoader createRoomScreen')

                    screensRendering.createRoomScreen(screen);
                }


                if(loaderName == 'videoTrackIsBeingAdded' || loaderName == 'beforeCamerasToggle') {
                    if(screen != null) screen.videoIsChanging = true;
                    participant.videoIsChanging = true;
                    var loader = screen.screenEl.querySelector('.spinner-load');
                    if(loader != null) return;
                    var loaderCon = document.createElement('DIV');
                    loaderCon.className = 'spinner-load';
                    loaderCon.innerHTML = '<div class="sk-circle">\n' +
                        '  <div class="sk-circle1 sk-child"></div>\n' +
                        '  <div class="sk-circle2 sk-child"></div>\n' +
                        '  <div class="sk-circle3 sk-child"></div>\n' +
                        '  <div class="sk-circle4 sk-child"></div>\n' +
                        '  <div class="sk-circle5 sk-child"></div>\n' +
                        '  <div class="sk-circle6 sk-child"></div>\n' +
                        '  <div class="sk-circle7 sk-child"></div>\n' +
                        '  <div class="sk-circle8 sk-child"></div>\n' +
                        '  <div class="sk-circle9 sk-child"></div>\n' +
                        '  <div class="sk-circle10 sk-child"></div>\n' +
                        '  <div class="sk-circle11 sk-child"></div>\n' +
                        '  <div class="sk-circle12 sk-child"></div>\n' +
                        '</div>';

                    screen.screenEl.appendChild(loaderCon);
                } else if(loaderName == 'videoMuted') {
                    if(participant.isLocal) return;
                    var loader = screen.screenEl.querySelector('.connect-spinner-con');
                    if(loader != null) return;
                    var loaderCon = document.createElement('DIV');
                    loaderCon.className = 'connect-spinner-con';
                    var loader = document.createElement('DIV');
                    loader.className = 'connect-spinner spinner-bounce-middle';
                    loaderCon.appendChild(loader);
                    if(screen.videoScreen.videoCon != null) screen.videoScreen.videoCon.appendChild(loaderCon);
                } else if(loaderName == 'screensharingStarting') {
                    if(screen != null) screen.videoIsChanging = true;
                    participant.videoIsChanging = true;
                    var loader = screen.screenEl.querySelector('.spinner-load');
                    if(loader != null) return;
                    var loaderCon = document.createElement('DIV');
                    loaderCon.className = 'spinner-load';
                    var loaderIcon = document.createElement('DIV');
                    loaderIcon.className = 'Media_webrtc_screen-sharing';
                    loaderIcon.innerHTML = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"    viewBox="130.35 175.058 235.692 150.425"    enable-background="new 130.35 175.058 235.692 150.425" xml:space="preserve">  <path shape-rendering="auto" image-rendering="auto" color-rendering="auto" fill="#FFFFFF" d="M153.86,175.058   c-6.743,0-12.271,5.542-12.271,12.285v110.45c0,6.743,5.528,12.271,12.271,12.271h188.672c6.742,0,12.271-5.527,12.271-12.271   V187.343c0-6.743-5.527-12.285-12.271-12.285L153.86,175.058L153.86,175.058z M153.86,182.085h188.672   c2.971,0,5.243,2.285,5.243,5.257v110.45c0,2.972-2.272,5.243-5.243,5.243H153.86c-2.971,0-5.243-2.271-5.243-5.243V187.343   C148.617,184.371,150.889,182.085,153.86,182.085L153.86,182.085z"/>  <path fill="#FFFFFF" d="M130.35,312.092c0,7.418,5.123,13.391,11.483,13.391H354.56c6.36,0,11.482-5.973,11.482-13.391H130.35z    M265.75,316.858h-35.101c-0.542,0-0.978-0.437-0.978-0.978s0.436-0.979,0.978-0.979h35.101c0.542,0,0.978,0.436,0.978,0.979   C266.728,316.422,266.292,316.858,265.75,316.858z"/>  <path fill="#FFFFFF" d="M193.391,291.705c-0.146,0-0.294-0.021-0.44-0.063c-0.729-0.214-1.198-0.92-1.113-1.675   c7.413-65.442,58.168-70.528,73.548-70.528c1.435,0,2.632,0.042,3.541,0.09v-20.55c0-0.63,0.379-1.199,0.961-1.442   c0.58-0.242,1.252-0.113,1.701,0.332l32.512,32.179c0.296,0.293,0.463,0.694,0.463,1.111s-0.167,0.817-0.465,1.111l-32.512,32.114   c-0.448,0.443-1.119,0.575-1.7,0.33c-0.581-0.242-0.96-0.812-0.96-1.441v-20.548c-1.78-0.149-3.449-0.185-4.634-0.185   c-13.734,0-48,4.706-69.501,48.296C194.523,291.378,193.973,291.705,193.391,291.705z"/>  </svg>';
                    loaderCon.appendChild(loaderIcon);
                    screen.screenEl.appendChild(loaderCon);
                    //screen.screensharing = true;

                    Q.Pointer.activateTouchlabels(document.body);

                    if(_controlsTool && _controlsTool.participantsListTool) _controlsTool.participantsListTool.showScreen(screen);

                    switchScreensMode('fullScreen', screen);
                    screensRendering.updateLayout();

                }
            }

            /**
             * Hide loader that has shown previously.
             * @method hideLoader
             * @param {String} [loaderName] Name of loader that depends on what action happened (camera toggling etc).
             * @param {Object} [participant] Participant on whose screen loader should be displayed.
             */
            function hideLoader(loaderName, usefulData) {
                log('hideLoader', loaderName, usefulData)

                var participant = usefulData.participant;
                var screens = [];
                if(usefulData.screen != null) {
                    screens.push(usefulData.screen);
                } else {
                    screens = participant.screens;
                }
                log('hideLoader screens', screens)

                if(screens.length == 0) return;

                var i, screen;
                for(i = 0; screen = screens[i]; i++) {
                    if(screen.screenEl == null) continue;
                    log('hideLoader for', screen)

                    screen.videoIsChanging = false;
                    participant.videoIsChanging = false;
                    if(loaderName == 'screensharingFailed' || loaderName == 'videoTrackLoaded' || loaderName == 'afterCamerasToggle') {
                        var loader = screen.screenEl.querySelector('.spinner-load');
                        if(loader != null && loader.parentNode != null) loader.parentNode.removeChild(loader);
                    } else if(loaderName == 'videoUnmuted') {
                        if(participant.isLocal) return;
                        var loader = screen.screenEl.querySelector('.connect-spinner-con');
                        if(loader != null && loader.parentNode != null) loader.parentNode.removeChild(loader);
                    }

                    log('hideLoader for check', loaderName == 'screensharingFailed', screen.screensharing, !screen.hasLiveTracks('video'))

                    if(loaderName == 'screensharingFailed' && screen.screensharing && !screen.hasLiveTracks('video')){
                        log('cancel screensharing screen', screen)
                        screen.screensharing = false;
                        if(participant.screens.length > 1) {
                            screen.hide();
                        }
                        screensRendering.updateLayout();
                    }
                }

            }

            var viewModeToSwitchBack;
            /**
             * Toggle view mode (Maximized, minimized etc) on screen click.
             * @method toggleViewModeByScreenClick
             * @param {Object} [e] Click/tap event.
             */
            function toggleViewModeByScreenClick(e) {
                log('toggleViewModeByScreenClick')
                log('toggleViewModeByScreenClick: current viewMode', viewMode)

                if(viewMode == 'audio' || viewMode == 'squaresGrid') return;

                e.stopImmediatePropagation();
                e.preventDefault();

                if(viewMode == 'tiled' || viewMode == 'regular' || viewMode == 'tiledMobile' || viewMode == 'sideBySideMobile' || viewMode == 'maximizedMobile') {
                    viewModeToSwitchBack = viewMode;
                }

                var tappedScreen = roomScreens.filter(function (obj) {
                    return obj.screenEl.contains(e.target) || obj.screenEl == e.target;
                })[0];

                log('tappedScreen', tappedScreen);
                if(tappedScreen == null) return;
                var resizeTool = Q.Tool.from(tappedScreen.screenEl, "Q/resize");
                //var videoResizeTool = Q.Tool.from(tappedScreen.videoScreen.videoCon, "Q/resize");
                if(resizeTool != null) {
                    if(resizeTool.state.appliedRecently) return;
                }
                /*if(videoResizeTool != null) {
                    if(videoResizeTool.state.appliedRecently) return;
                }*/

                if(activeScreen && !activeScreen.screenEl.contains(e.target) && (viewMode == 'maximized' || viewMode == 'maximizedMobile')) {
                    log('toggleViewModeByScreenClick 1')

                    tappedScreen.screenEl.style.zIndex = '';

                    switchScreensMode('maximizedStatic', tappedScreen);
                    return;
                } else if(activeScreen && !activeScreen.screenEl.contains(e.target) && (viewMode == 'fullScreen' || viewMode == 'screenSharing')) {
                    log('toggleViewModeByScreenClick 2')

                    tappedScreen.screenEl.style.zIndex = '';

                    switchScreensMode('fullScreen', tappedScreen);
                    return;
                } else if(activeScreen && (activeScreen.screenEl.contains(e.target) || activeScreen.screenEl == e.target)) {
                    log('toggleViewModeByScreenClick 3')

                    tappedScreen.screenEl.style.zIndex = '';
                    
                    switchScreensMode('minimizedStatic');
                    return;
                } /*else if (activeScreen == null && (viewMode == 'tiledMobile') && viewModeToSwitchBack != null) {
                    log('toggleViewModeByScreenClick 4.0')

                    tappedScreen.screenEl.style.zIndex = '';

                    renderSideBySideGridMobile();

                    return;
                }*/ else if (activeScreen == null && (viewMode == 'tiled' || viewMode == 'tiledMobile' || viewMode == 'sideBySideMobile') && viewModeToSwitchBack != null) {
                    log('toggleViewModeByScreenClick 4')

                    tappedScreen.screenEl.style.zIndex = '';

                    switchScreensMode('maximizedStatic', tappedScreen);
                    return;
                } else if (activeScreen == null && (viewMode == 'minimized' || viewMode == 'minimizedMobile') && viewModeToSwitchBack != null) {
                    log('toggleViewModeByScreenClick 5')

                    tappedScreen.screenEl.style.zIndex = '';
                    if(viewModeToSwitchBack == 'tiled' || viewModeToSwitchBack == 'tiledMobile' || viewModeToSwitchBack == 'maximizedMobile' || viewModeToSwitchBack == 'regular') {
                        if(viewModeToSwitchBack == 'maximizedMobile') viewModeToSwitchBack = 'tiledMobile';
                        toggleViewMode(viewModeToSwitchBack, tappedScreen);
                    }

                    return;
                }

                toggleViewMode(null, tappedScreen);
                bindScreensEvents();
            }

            /**
             * Toggle participants' screens view mode.
             * @method toggleViewMode
             * @param {Object} [tappedScreen] Screen that has tapped/clicked in order to maximize it
             */
            function toggleViewMode(modeToSwitch, tappedScreen) {
                log('toggleViewMode', modeToSwitch);
                var modes;
                if(Q.info.isMobile)
                    modes = ['tiledMobile', 'maximizedMobile'];
                else modes = ['regular', 'maximized', 'tiled'];

                if(typeof modeToSwitch == 'undefined' || modeToSwitch == null) {
                    var i, mode;

                    for (i = 0; mode = modes[i]; i++) {
                        if (mode == viewMode || viewMode == null) {
                            if (i != modes.length - 1) {
                                modeToSwitch = modes[i + 1];
                            } else modeToSwitch = modes[0];
                            break;
                        }
                    }
                    ;
                }

                if((modeToSwitch == null || modeToSwitch == 'regular') && !Q.info.isMobile) {
                    switchScreensMode('floatingView');
                } else if(modeToSwitch == 'minimized') {
                    switchScreensMode('minimizedStatic');
                } else if(modeToSwitch == 'maximized') {
                    switchScreensMode('maximizedStatic', tappedScreen);
                } else if(modeToSwitch == 'tiledMobile') {
                    if(roomScreens.length == 1) {
                        switchScreensMode('maximizedStatic', tappedScreen);
                    } else {
                        switchScreensMode('tiledView');
                    }
                } else if((modeToSwitch == null || modeToSwitch == 'maximizedMobile') && Q.info.isMobile) {
                    switchScreensMode('maximizedStatic', tappedScreen);
                } else if(modeToSwitch == 'minimizedMobile') {
                    switchScreensMode('minimizedStatic');
                } else if(modeToSwitch == 'tiled') {
                    if(roomScreens.length == 1) {
                        modeToSwitch = 'regular';
                        switchScreensMode('floatingView');
                    } else {
                        switchScreensMode('tiledView');
                    }

                }
            }

            function switchScreensMode(modeName, screenToSetActive) {

                if (modeName != 'loudest' && modeName != 'loudestExceptMe') {
                    toggleLoudestScreenMode('disabled');
                }
                if (modeName == 'maximizedStatic') {
                    if (Q.info.isMobile) {
                        renderMaximizedScreensGridMobile(screenToSetActive);
                    } else {
                        renderMaximizedScreensGrid(screenToSetActive);
                    }
                } else if (modeName == 'minimizedStatic') {
                    if (Q.info.isMobile) {
                        renderMinimizedScreensGridMobile();
                    } else {
                        renderMinimizedScreensGrid();
                    }
                } else if (modeName == 'tiledView') {
                    if (Q.info.isMobile) {
                        renderTiledScreenGridMobile();
                    } else {
                        renderTiledScreenGridDesktop();
                    }
                } else if (modeName == 'loudestExceptMe') {
                    toggleLoudestScreenMode('allButMe');
                } else if (modeName == 'loudest') {
                    toggleLoudestScreenMode('all');
                } else if (modeName == 'fullScreen') {
                    var maximize = function (screen) {
                        if (Q.info.isMobile) {
                            renderMaximizedScreensGridMobile(screen, 300);
                        } else { 
                            renderFullScreenLayout(screen, 300);
                        }
                    }
                    var activeScreen = screenToSetActive != null ? screenToSetActive : getActiveSreen();
                    if (activeScreen != null) {
                        maximize(activeScreen);
                    } else {
                        var screens = getScreens();
                        maximize(screens[0]);
                    }
                } else if (modeName == 'audio') {
                    renderAudioScreensGrid();
                } else if (modeName == 'floatingView') { //desktop only
                    renderDesktopScreensGrid();
                } else if (modeName == 'manual') { //desktop only
                    renderManualScreensGrid();
                } else if (modeName == 'squaresView') {
                    renderSquaresGridMobile();
                }

                _layoutEvents.dispatch('screensModeChanged', modeName)
            }

            function switchScreenType(modeToSwitchTo) {
                log('switchScreenType', modeToSwitchTo, roomScreens.length)
               
                //if(modeToSwitchTo == activeScreensType) return;
                var participants = webrtcSignalingLib.roomParticipants();
                if(modeToSwitchTo == 'video') {
                    for(let p in participants) {
                        let pScreens = participants[p].screens;
                        for (let s = pScreens.length - 1; s >= 0; s--) {
                            log('switchScreenType fortchScreenType for', s)

                            pScreens[s].switchToVideoScreen();
                        }
                    }
                } else if(modeToSwitchTo == 'audio') {
                    for(let p in participants) {
                        let pScreens = participants[p].screens;
                        for(let s = pScreens.length - 1; s >= 0 ; s--){
                            log('switchScreenType fortchScreenType for', s)

                            pScreens[s].switchToAudioScreen();
                        }
                    }

                }

                activeScreensType = modeToSwitchTo;
            }

            /**
             * Prepares screens for layout changing. Changes class of screens and its container depending on passed
             * layout when layout is being changed.
             * @method toggleScreensClass
             * @param {String} [layout] layout name
             * @return {Array} Sreens (HTML elements) to render
             */
            function toggleScreensClass(layout) {
                var gridClasses = [
                    'Media_webrtc_tiled-screens-grid',
                    'Media_webrtc_squares-screens-grid',
                    'Media_webrtc_side-by-side-screens-grid',
                    'Media_webrtc_maximized-screens-grid',
                    'Media_webrtc_fullscreen-grid',
                    'Media_webrtc_regular-screens-grid',
                    'Media_webrtc_audio-screens-grid',
                ];
                var screenClasses = [
                    'Media_webrtc_squares-grid-screen',
                    'Media_webrtc_tiled-grid-screen',
                    'Media_webrtc_minimized-small-screen',
                    'Media_webrtc_maximized-main-screen',
                    'Media_webrtc_regular-screen',
                    'Media_webrtc_audio-screen',
                ];

                if(layout == 'tiledVertical' || layout == 'tiledHorizontal') {
                    var screenClass = 'Media_webrtc_tiled-grid-screen';
                    var elements = [];
                    for(var s in roomScreens) {
                        let screen = roomScreens[s];
                        if(screen.activeScreenType == 'audio') continue;
                        for (var o in screenClasses) {
                            if(screenClasses[o] == screenClass) continue;
                            if (screen.screenEl.classList.contains(screenClasses[o])) screen.screenEl.classList.remove(screenClasses[o]);
                        }
                        if(!screen.screenEl.classList.contains(screenClass)) screen.screenEl.classList.add(screenClass);

                        /*if(!_roomsMedia.contains(screen.screenEl)) {
							screen.videoScreen.videoCon.style.display = 'none';
						} else {
							screen.videoScreen.videoCon.style.display = '';
						}*/

                        elements.push(screen.screenEl);
                    };


                    var containerClass = 'Media_webrtc_tiled-screens-grid';
                    for (var x in gridClasses) {
                        if(gridClasses[x] == containerClass) continue;
                        if (_roomsMedia.classList.contains(gridClasses[x])) _roomsMedia.classList.remove(gridClasses[x]);
                    }
                    _roomsMedia.classList.add(containerClass);

                    return elements;

                }

                if(layout == 'tiledVerticalMobile' || layout == 'tiledHorizontalMobile' || layout == 'sideBySideMobile') {
                    var screenClass = 'Media_webrtc_tiled-grid-screen';
                    var elements = [];
                    for(var s in roomScreens) {
                        let screen = roomScreens[s];
                        if(screen.activeScreenType == 'audio') continue;
                        for (var o in screenClasses) {
                            if(screenClasses[o] == screenClass) continue;
                            if (screen.screenEl.classList.contains(screenClasses[o])) screen.screenEl.classList.remove(screenClasses[o]);
                        }
                        if(!screen.screenEl.classList.contains(screenClass)) screen.screenEl.classList.add(screenClass);

                        /*if(!_roomsMedia.contains(screen.screenEl)) {
							screen.videoScreen.videoCon.style.display = 'none';
						} else {
							screen.videoScreen.videoCon.style.display = '';
						}*/

                        elements.push(screen.screenEl);
                    }


                    var containerClass = layout == 'sideBySideMobile' ? 'Media_webrtc_side-by-side-screens-grid' : 'Media_webrtc_tiled-screens-grid';
                    for (var x in gridClasses) {
                        if(gridClasses[x] == containerClass) continue;
                        if (_roomsMedia.classList.contains(gridClasses[x])) _roomsMedia.classList.remove(gridClasses[x]);
                    }
                    _roomsMedia.classList.add(containerClass);

                    return elements;

                }

                if(layout == 'squaresGrid') {
                    var screenClass = 'Media_webrtc_squares-grid-screen';
                    var elements = [];
                    for(var s in roomScreens) {
                        let screen = roomScreens[s];
                        if(screen.activeScreenType == 'audio') continue;
                        for (var o in screenClasses) {
                            if(screenClasses[o] == screenClass) continue;
                            if (screen.screenEl.classList.contains(screenClasses[o])) screen.screenEl.classList.remove(screenClasses[o]);
                        }
                        if(!screen.screenEl.classList.contains(screenClass)) screen.screenEl.classList.add(screenClass);

                        /*if(!_roomsMedia.contains(screen.screenEl)) {
							screen.videoScreen.videoCon.style.display = 'none';
						} else {
							screen.videoScreen.videoCon.style.display = '';
						}*/

                        elements.push(screen.screenEl);
                    }


                    var containerClass = 'Media_webrtc_squares-screens-grid';
                    for (var x in gridClasses) {
                        if(gridClasses[x] == containerClass) continue;
                        if (_roomsMedia.classList.contains(gridClasses[x])) _roomsMedia.classList.remove(gridClasses[x]);
                    }
                    _roomsMedia.classList.add(containerClass);

                    return elements;

                }

                if(layout == 'minimizedScreensGrid' || layout == 'maximizedScreensGrid'
                    || layout == 'maximizedVerticalMobile' || layout == 'maximizedHorizontalMobile'
                    || layout == 'minimizedVerticalMobile' || layout == 'minimizedHorizontalMobile') {


                    var containerClass = 'Media_webrtc_maximized-screens-grid';
                    var screenClass = 'Media_webrtc_minimized-small-screen';
                    var maximizedScreenClass = 'Media_webrtc_maximized-main-screen';
                    var isMinimizedLayout = layout == 'minimizedScreensGrid' || layout == 'minimizedVerticalMobile' || layout == 'minimizedHorizontalMobile';

                    var elements = []
                    log('toggleScreensClass roomScreens', isMinimizedLayout, layout);

                    for(var s in roomScreens) {
                        let screen = roomScreens[s];
                        if(screen.activeScreenType == 'audio') continue;
                        for (var o in screenClasses) {
                            if(screenClasses[o] == screenClass && screen != activeScreen) continue;
                            if (screen.screenEl.classList.contains(screenClasses[o])) screen.screenEl.classList.remove(screenClasses[o]);
                        }

                        if(!screen.screenEl.classList.contains(screenClass) && screen != activeScreen) {
                            screen.screenEl.classList.add(screenClass);
                        } else if (!screen.screenEl.classList.contains(maximizedScreenClass) && screen == activeScreen && !isMinimizedLayout) {
                            screen.screenEl.classList.add(maximizedScreenClass);
                        }

                        /*if(!_roomsMedia.contains(screen.screenEl)) {
							if(screen.videoTrackEl != null && screen.videoTrackEl.videoWidth == 0 && screen.videoTrackEl.videoHeight == 0) screen.videoTrackEl.style.display = 'none';
						}*/

                        if(!Q.info.isMobile) {
                            elements.push(screen.screenEl);
                        } else {
                            if(screen == activeScreen) {
                                elements.unshift(screen.screenEl);
                            } else {
                                elements.push(screen.screenEl);
                            }
                            if(screen == activeScreen) moveScreenBack.call(screen.screenEl);
                        }

                    }

                    log('toggleScreensClass elements', elements);
                    for (var x in gridClasses) {
                        if(gridClasses[x] == containerClass) continue;
                        if (_roomsMedia.classList.contains(gridClasses[x])) _roomsMedia.classList.remove(gridClasses[x]);
                    }
                    _roomsMedia.classList.add(containerClass);
                    return elements;
                }

                if(layout == 'screenSharing') {
                    log('toggleScreensClass screenSharing');

                    var containerClass = 'Media_webrtc_fullscreen-grid';
                    var screenClass = 'Media_webrtc_minimized-small-screen';
                    var maximizedScreenClass = 'Media_webrtc_maximized-main-screen';


                    var elements = []
                    log('toggleScreensClass roomScreens', roomScreens);

                    var localScreensIncludedToRender = false;
                    for(var s in roomScreens) {
                        let screen = roomScreens[s];
                        if(screen.activeScreenType == 'audio') continue;

                        for (var o in screenClasses) {
                            if(screenClasses[o] == screenClass && screen != activeScreen) continue;
                            if (screen.screenEl.classList.contains(screenClasses[o])) screen.screenEl.classList.remove(screenClasses[o]);
                        }
                        if(!screen.screenEl.classList.contains(screenClass) && screen != activeScreen) {
                            screen.screenEl.classList.add(screenClass);
                        } else if (!screen.screenEl.classList.contains(maximizedScreenClass) && screen == activeScreen) {
                            screen.screenEl.classList.add(maximizedScreenClass);
                        }

                        if(screen.participant == activeScreen.participant && localScreensIncludedToRender == false) {
                            var screensharingScreens = [];
                            var cameraScreens = [];
                            for(let c in screen.participant.screens) {
                                let pScreen = screen.participant.screens[c];
                                log('toggleScreensClass pScreen.isActive', pScreen.isActive);
                                if(!pScreen.isActive) continue;
                                if(pScreen.screensharing == true) {
                                    log('toggleScreensClass screensharing=true');

                                    screensharingScreens.push(pScreen.screenEl);
                                    moveScreenBack.call(pScreen.screenEl);
                                } else {
                                    log('toggleScreensClass screensharing=false');

                                    cameraScreens.push(pScreen.screenEl);
                                    moveScreenFront.call(pScreen.screenEl);
                                }
                            }
                            log('toggleScreensClass s', screensharingScreens, cameraScreens);

                            //if(!screen.participant.isLocal) {
                            log('toggleScreensClass s', screensharingScreens, cameraScreens);
                            let scrns = cameraScreens.concat(screensharingScreens);
                            log('toggleScreensClass scrns', scrns);

                            scrns.map(function(el){
                                log('toggleScreensClass map', el);

                                elements.unshift(el);
                            })
                            /*} else {

                                screensharingScreens.concat(cameraScreens).map(function(el){
                                    log('toggleScreensClass map', el);

                                    elements.unshift(el);
                                })
                            }*/

                            localScreensIncludedToRender = true;

                        } else if (screen.participant != activeScreen.participant) {
                            log('toggleScreensClass if2');

                            elements.push(screen.screenEl);
                        }

                    }

                    log('toggleScreensClass elements', elements);
                    for (var x in gridClasses) {
                        if(gridClasses[x] == containerClass) continue;
                        if (_roomsMedia.classList.contains(gridClasses[x])) _roomsMedia.classList.remove(gridClasses[x]);
                    }
                    _roomsMedia.classList.add(containerClass);
                    return elements;
                }

                if(layout == 'fullScreen') {
                    log('toggleScreensClass fullScreen');

                    var containerClass = 'Media_webrtc_fullscreen-grid';
                    var screenClass = 'Media_webrtc_minimized-small-screen';
                    var maximizedScreenClass = 'Media_webrtc_maximized-main-screen';


                    var elements = [];
                    for(var s in roomScreens) {
                        let screen = roomScreens[s];
                        if(screen.activeScreenType == 'audio') continue;

                        for (var o in screenClasses) {
                            if(screenClasses[o] == screenClass && screen != activeScreen) continue;
                            if (screen.screenEl.classList.contains(screenClasses[o])) screen.screenEl.classList.remove(screenClasses[o]);
                        }
                        if(!screen.screenEl.classList.contains(screenClass) && screen != activeScreen) {
                            screen.screenEl.classList.add(screenClass);
                            if(screen.screenEl.classList.contains(maximizedScreenClass)) screen.screenEl.classList.remove(maximizedScreenClass)
                        } else if (!screen.screenEl.classList.contains(maximizedScreenClass) && screen == activeScreen) {
                            screen.screenEl.classList.add(maximizedScreenClass);
                        }

                        if(screen == activeScreen) {
                            elements.unshift(screen.screenEl);
                            moveScreenBack.call(screen.screenEl);
                        } else {
                            elements.push(screen.screenEl);
                        }
                    }

                    log('toggleScreensClass elements', elements);
                    for (var x in gridClasses) {
                        if(gridClasses[x] == containerClass) continue;
                        if (_roomsMedia.classList.contains(gridClasses[x])) _roomsMedia.classList.remove(gridClasses[x]);
                    }
                    _roomsMedia.classList.add(containerClass);
                    return elements;
                }

                if(layout == 'regularScreensGrid' || layout == 'manualScreensGrid') {
                    var screenClass = 'Media_webrtc_regular-screen';


                    var elements = [];
                    for(var s in roomScreens) {
                        let screen = roomScreens[s];
                        if(screen.activeScreenType == 'audio') continue;

                        for (var o in screenClasses) {
                            if (screen.screenEl.classList.contains(screenClasses[o])) screen.screenEl.classList.remove(screenClasses[o]);
                        }

                        if(!screen.screenEl.classList.contains(screenClass)) {
                            screen.screenEl.classList.add(screenClass);
                        }

                        /*if(!_roomsMedia.contains(screen.screenEl)) {
                            if(screen.videoTrackEl != null && screen.videoTrackEl.videoWidth == 0 && screen.videoTrackEl.videoHeight == 0) screen.videoTrackEl.style.display = 'none';
                        }*/

                        elements.push(screen.screenEl);
                    }

                    var containerClass = 'Media_webrtc_regular-screens-grid';
                    for (var x in gridClasses) {
                        if(gridClasses[x] == containerClass) continue;
                        if (_roomsMedia.classList.contains(gridClasses[x])) _roomsMedia.classList.remove(gridClasses[x]);
                    }
                    _roomsMedia.classList.add(containerClass);
                    return elements;
                }

                if(layout == 'audioScreensGrid') {
                    var screenClass = 'Media_webrtc_audio-screen';

                    var elements = [];
                    for(var s in roomScreens) {
                        let screen = roomScreens[s];

                        for (var o in screenClasses) {
                            if (screen.screenEl.classList.contains(screenClasses[o])) screen.screenEl.classList.remove(screenClasses[o]);
                        }

                        if(!screen.screenEl.classList.contains(screenClass)) {
                            screen.screenEl.classList.add(screenClass);
                        }

                        var userId = screen.participant.identity != null ? screen.participant.identity.split('\t')[0] : null;

                        if(_options.hosts && _options.hosts.indexOf(userId) != -1) {
                            elements.unshift(screen.screenEl);
                        } else {
                            elements.push(screen.screenEl);
                        }
                    }

                    var containerClass = 'Media_webrtc_audio-screens-grid';
                    for (var x in gridClasses) {
                        if(gridClasses[x] == containerClass) continue;
                        if (_roomsMedia.classList.contains(gridClasses[x])) _roomsMedia.classList.remove(gridClasses[x]);
                    }
                    _roomsMedia.classList.add(containerClass);
                    return elements;
                }
            }

            /**
             * Render tiled view mode on mobile.
             * @method renderTiledScreenGridMobile
             */
            function renderTiledScreenGridMobile() {
                //log('renderTiledScreenGridMobile', roomScreens.length);
                switchScreenType('video');

                if(window.innerHeight > window.innerWidth) {
                    //_roomsMedia.className = 'Media_webrtc_tiled-vertical-grid';
                    var elements = toggleScreensClass('tiledVerticalMobile');
                    prevViewMode = viewMode;
                    _layoutTool.animate('tiledVerticalMobile', elements, 500, true);
                } else {
                    //_roomsMedia.className = 'Media_webrtc_tiled-horizontal-grid';
                    var elements = toggleScreensClass('tiledHorizontalMobile');
                    prevViewMode = viewMode;
                    _layoutTool.animate('tiledHorizontalMobile', elements, 500, true);
                }

                viewMode = 'tiledMobile';
                activeScreen = null;
                _layoutEvents.dispatch('layoutRendered', {prevViewMode:prevViewMode, viewMode});
            }

            /**
             * Render videos side by side (only when 2 videos)
             * @method renderSideBySideGridMobile
             */
            function renderSideBySideGridMobile() {
                log('renderSideBySideGridMobile');
                switchScreenType('video');

                //if(roomScreens.length <= 1) return;


                if(window.innerHeight > window.innerWidth) {
                    //_roomsMedia.className = 'Media_webrtc_tiled-vertical-grid';
                    var elements = toggleScreensClass('sideBySideMobile');
                    prevViewMode = viewMode;
                    _layoutTool.animate('sideBySideMobile', elements, 500, true);
                } else {
                    //_roomsMedia.className = 'Media_webrtc_tiled-horizontal-grid';
                    var elements = toggleScreensClass('tiledHorizontalMobile');
                    prevViewMode = viewMode;
                    _layoutTool.animate('tiledHorizontalMobile', elements, 500, true);
                }

                viewMode = 'sideBySideMobile';
                activeScreen = null;
                _layoutEvents.dispatch('layoutRendered', {prevViewMode:prevViewMode, viewMode});
            }

            /**
             * Render tiled view mode on desktop/tablet.
             * @method renderTiledScreenGridMobile
             */
            function renderTiledScreenGridDesktop() {
                log('renderTiledScreenGridDesktop')

                switchScreenType('video');

                if(window.innerHeight > window.innerWidth) {
                    //_roomsMedia.className = 'Media_webrtc_tiled-vertical-grid';
                    var elements = toggleScreensClass('tiledVertical');
                    prevViewMode = viewMode;
                    _layoutTool.animate('tiledVertical', elements, 500, true);
                } else {
                    //_roomsMedia.className = 'Media_webrtc_tiled-horizontal-grid';
                    var elements = toggleScreensClass('tiledHorizontal');
                    prevViewMode = viewMode;
                    _layoutTool.animate('tiledHorizontal', elements, 500, true);
                }
                viewMode = 'tiled';
                activeScreen = null;

                _layoutEvents.dispatch('layoutRendered', {prevViewMode:prevViewMode, viewMode});
            }

            /**
             * Render normal view mode on desktop/tablet (screens are about same size side by side at the middle of the screen).
             * @method renderDesktopScreensGrid
             */
            function renderDesktopScreensGrid() {
                //log('renderDesktopScreensGrid', prevViewMode);
                if(_layoutTool == null || _controls == null) return;
                activeScreen = null;

                _layoutTool.maximizedScreen = null;

                switchScreenType('video');

                var elements = toggleScreensClass('regularScreensGrid');
                if(!_layoutTool.getLayoutGenerator('regularScreensGrid')) {
                    _layoutTool.setLayoutGenerator('regularScreensGrid', function (container, count) {
                        return customLayouts.regularScreensGrid(_options.element, roomScreens);
                    });
                }

                prevViewMode = viewMode;
                _layoutTool.animate('regularScreensGrid', elements, 500, true);
                viewMode = 'regular';

                _layoutEvents.dispatch('layoutRendered', {prevViewMode:prevViewMode, viewMode});
            }

            /**
             * Render avatars with audio visualization.
             * @method renderAudioScreensGrid
             */
            function renderAudioScreensGrid() {
                //log('renderAudioScreensGrid', prevViewMode);
                if(_layoutTool == null || _controls == null) return;
                activeScreen = null;

                _layoutTool.maximizedScreen = null;

                switchScreenType('audio');

                var elements = toggleScreensClass('audioScreensGrid');
                if(!_layoutTool.getLayoutGenerator('audioScreensGrid')) {
                    _layoutTool.setLayoutGenerator('audioScreensGrid', function (container, count) {
                        return customLayouts.audioScreensGrid(_roomsMedia, roomScreens);
                    });
                }

                prevViewMode = viewMode;

                _layoutTool.animate('audioScreensGrid', elements, 500, true);

                viewMode = 'audio';

                _layoutEvents.dispatch('layoutRendered', {prevViewMode:prevViewMode, viewMode});
            }

            /**
             * Render layout where screens aren't sorted and every new screen appear in the middle of page
             * @method renderManualScreensGrid
             */
            function renderManualScreensGrid() {
                if(_layoutTool == null || _controls == null) return;
                activeScreen = null;
                _layoutTool.maximizedScreen = null;

                switchScreenType('video');

                var elements = toggleScreensClass('manualScreensGrid');
                if(!_layoutTool.getLayoutGenerator('manualScreensGrid')) {
                    _layoutTool.setLayoutGenerator('manualScreensGrid', function (container, count) {
                        return customLayouts.manualScreensGrid(document.body, roomScreens);
                    });
                }

                prevViewMode = viewMode;
                _layoutTool.animate('manualScreensGrid', elements, 500, true);
                viewMode = 'manual';

                _layoutEvents.dispatch('layoutRendered', {prevViewMode:prevViewMode, viewMode});
            }

            /**
             * Render participant's screen in minimized view mode on desktop.
             * @method renderMinimizedScreensGrid
             */
            function renderMinimizedScreensGrid() {
                //log('renderMinimizedScreensGrid')
                if(_layoutTool == null || _controls == null) return;

                activeScreen = null;

                if(!_layoutTool.getLayoutGenerator('minimizedScreensGrid')) {
                    _layoutTool.setLayoutGenerator('minimizedScreensGrid', function (container, count) {
                        return customLayouts.minimizedOrMaximizedScreenGrid(_roomsMedia, count, _controls.querySelector('.Media_webrtc_conference-control'), false);
                    });
                }

                switchScreenType('video');

                var elements = toggleScreensClass('minimizedScreensGrid');

                prevViewMode = viewMode;
                _layoutTool.animate('minimizedScreensGrid', elements, 500, true);
                viewMode = 'minimized';

                _layoutEvents.dispatch('layoutRendered', {prevViewMode:prevViewMode, viewMode});
            }

            /**
             * Render maximized view mode on desktop (one screen is maximized, rest - minimized).
             * @method renderMaximizedScreensGrid
             */
            function renderMaximizedScreensGrid(screenToMaximize, duration) {
                if(typeof duration == 'undefined') duration = 500;
                //log('renderMaximizedScreensGrid', screenToMaximize)
                //TODO: check if "(screenToMaximize != null && screenToMaximize == activeScreen)" impacts updating layout
                if(_layoutTool == null || _controls == null || (screenToMaximize != null && screenToMaximize == activeScreen && !(viewMode == 'screenSharing' || viewMode == 'fullScreen'))) return;

                switchScreenType('video');

                if(screenToMaximize != null && screenToMaximize.isActive) activeScreen = screenToMaximize;
                if(screenToMaximize == null && (activeScreen == null || activeScreen.isLocal) /*&& roomScreens.length == 2*/) {
                    var screensToTakeInc = roomScreens.filter(function (s) {
                        return (!s.isLocal ? true : false);
                    });
                    if(screensToTakeInc.length != 0) {

                        activeScreen = screensToTakeInc.reduce(function (prev, current) {
                            return (prev.participant.connectedTime > current.participant.connectedTime) ? prev : current;
                        });

                    }
                }

                if(activeScreen == null || !_roomsMedia.contains(activeScreen.screenEl)) activeScreen = roomScreens[0];

                if(!_layoutTool.getLayoutGenerator('maximizedScreensGrid')) _layoutTool.setLayoutGenerator('maximizedScreensGrid', function (container, count) {
                    return customLayouts.minimizedOrMaximizedScreenGrid(_roomsMedia, count, _controls.querySelector('.Media_webrtc_conference-control'), true);
                });

                var elements = toggleScreensClass('maximizedScreensGrid');
                prevViewMode = viewMode;
                _layoutTool.animate('maximizedScreensGrid', elements, duration, true);
                viewMode = 'maximized';

                _layoutEvents.dispatch('layoutRendered', {prevViewMode:prevViewMode, viewMode});
            }

            /**
             * Maximize screensharing screen.
             * @method renderFullScreenLayout
             * @param {Object} [screenToMaximize] Screen that contains screensharing video.
             */
            function renderFullScreenLayout(screenToMaximize) {
                //log('renderFullScreenLayout', screenToMaximize, activeScreen)
                if(_layoutTool == null || _controls == null/* || (screenToMaximize != null && screenToMaximize == activeScreen)*/) return;
                switchScreenType('video');

                _layoutTool.maximizedScreen = null;
                if(screenToMaximize != null) activeScreen = screenToMaximize;
                if((screenToMaximize != null && !screenToMaximize.isActive) || (screenToMaximize == null && (activeScreen == null || !activeScreen.isActive))) {

                    var screenToActivate;
                    for(let i in roomScreens) {
                        let screen = roomScreens[i];
                        if(!screen.isLocal && screen.isActive) {
                            screenToActivate = screen;
                        }
                    }
                    if(screenToActivate == null) {
                        for(let i in roomScreens) {
                            let screen = roomScreens[i];

                            if(!screen.isLocal) {
                                screenToActivate = screen;
                            }
                        }
                    }

                    activeScreen = screenToActivate;
                }

                var elements = toggleScreensClass(activeScreen && activeScreen.screensharing ? 'screenSharing' : 'fullScreen');
                prevViewMode = viewMode;
                _layoutTool.animate('fullScreen', elements, 100, true);
                viewMode = activeScreen && activeScreen.screensharing ? 'screenSharing' : 'fullScreen';

                _layoutEvents.dispatch('layoutRendered', {prevViewMode:prevViewMode, viewMode});
            }

            /**
             * Maximaze tapped screen to full, make another screens minimized.
             * @method renderMaximizedScreensGridMobile
             * @param {Object} [screenToMaximize] Screen that has tapped in order to maximize.
             */
            function renderMaximizedScreensGridMobile(screenToMaximize) {
                //log('renderMaximizedScreensGridMobile')
                if(_layoutTool == null || _controls == null || (screenToMaximize != null && screenToMaximize == activeScreen)) return;
                switchScreenType('video');

                if(screenToMaximize != null && screenToMaximize.isActive) activeScreen = screenToMaximize;
                if(screenToMaximize == null && (activeScreen == null /*|| activeScreen.isLocal*/)/* && roomScreens.length == 2*/) {

                    var i, screen;
                    for(i = 0; screen = roomScreens[i]; i++) {
                        if(!screen.isLocal) {
                            activeScreen = screen;
                        }
                    }
                }

                if(activeScreen == null || !_roomsMedia.contains(activeScreen.screenEl)) activeScreen = roomScreens[0];

                if(window.innerHeight > window.innerWidth) {
                    var elements = toggleScreensClass('maximizedVerticalMobile');
                    prevViewMode = viewMode;
                    _layoutTool.animate('maximizedVerticalMobile', elements, 100, true);
                } else {
                    var elements = toggleScreensClass('maximizedHorizontalMobile');
                    prevViewMode = viewMode;
                    _layoutTool.animate('maximizedHorizontalMobile', elements, 100, true);
                }

                viewMode = 'maximizedMobile';

                _layoutEvents.dispatch('layoutRendered', {prevViewMode:prevViewMode, viewMode});
            }

            /**
             * Minimize all screens.
             * @method renderMinimizedScreensGridMobile
             */
            function renderMinimizedScreensGridMobile() {
                //log('renderMinimizedScreensGridMobile')
                if(_layoutTool == null || _controls == null) return;
                activeScreen = null;

                switchScreenType('video');

                if(window.innerHeight > window.innerWidth) {
                    var elements = toggleScreensClass('minimizedVerticalMobile');
                    prevViewMode = viewMode;
                    _layoutTool.animate('minimizedVerticalMobile', elements, 100, true);
                } else {
                    var elements = toggleScreensClass('minimizedHorizontalMobile');
                    prevViewMode = viewMode;
                    _layoutTool.animate('minimizedHorizontalMobile', elements, 100, true);
                }

                viewMode = 'minimizedMobile';
                _layoutEvents.dispatch('layoutRendered', {prevViewMode:prevViewMode, viewMode});
            }

            /**
             * Renders screens in scrollable container.
             * @method renderSquaresGridMobile
             */
            function renderSquaresGridMobile() {
                //log('renderSquaresGridMobile')
                if(_layoutTool == null || _controls == null) return;
                activeScreen = null;

                switchScreenType('video');
                if(!_layoutTool.getLayoutGenerator('squaresGrid')) _layoutTool.setLayoutGenerator('squaresGrid', function (container, count) {
                    return customLayouts.squaresGrid(new DOMRect(0, 0, 375, 812), count, _controls.querySelector('.Media_webrtc_conference-control'), true);
                });
                var elements = toggleScreensClass('squaresGrid');

                prevViewMode = viewMode;
                _layoutTool.animate('squaresGrid', elements, 100, true);

                viewMode = 'squaresGrid';
                _layoutEvents.dispatch('layoutRendered', {prevViewMode:prevViewMode, viewMode});
            }


            function maximizeLoudestUser(state) {
                if(state.stopped === true) {
                    return;
                }
                let roomParticipants = webrtcSignalingLib.roomParticipants();

                let fakeDefaultLoudest = {
                    voiceMeterTools: {
                        simple:{
                            state: {
                                info: {
                                    average: 0
                                }
                            }
                        }
                    },
                    voiceMeterAverage: -1
                }

                //let voiceMeterTool = prev.voiceMeterTools.simple.state.status == active ? prev.voiceMeterTools.simple : prev.voiceMeterTools.circles;
            
                const loudestParticipant = roomParticipants.reduce(function(prev, current) {
                    return  (!current.voiceMeterAverage || prev.voiceMeterAverage > current.voiceMeterAverage) ? prev : current
                }, fakeDefaultLoudest)

                if(loudestParticipant == fakeDefaultLoudest)  {
                    state.animationRequest = window.requestAnimationFrame(state.function);
                    return;
                }

                if(activeScreen != loudestParticipant.screens[0] || (viewMode != 'minimized' && viewMode != 'maximized')) {
                    if (!Q.info.isMobile) {
                        renderMaximizedScreensGrid(loudestParticipant.screens[0], 0);
                    } else {
                        renderMaximizedScreensGridMobile(loudestParticipant.screens[0], 0);
                    }
                }
                
                state.animationRequest = window.requestAnimationFrame(state.function);
    
            }

            function maximizeLoudestUserButMe(state) {
                if(state.stopped === true) {
                    return;
                }

                if(webrtcSignalingLib.limits) {
                    return;
                }

                let roomParticipants = webrtcSignalingLib.roomParticipants();
                let loudestParticipant = null;
                
                if(roomParticipants.length > 1) {
                    loudestParticipant = roomParticipants.reduce(function(prev, current) {
                        return (current.isLocal || !current.voiceMeterAverage || prev.voiceMeterAverage > current.voiceMeterAverage) ? prev : current;
                    })
                }
                 
                if(loudestParticipant == null)  {
                    state.animationRequest = requestAnimationFrame(state.function);
                    return;
                }
                
                if (loudestParticipant.screens[0] && (activeScreen != loudestParticipant.screens[0] || (viewMode != 'minimized' && viewMode != 'maximized'))) {
                    if (!Q.info.isMobile) {
                        renderMaximizedScreensGrid(loudestParticipant.screens[0], 0);
                    } else {
                        renderMaximizedScreensGridMobile(loudestParticipant.screens[0], 0);
                    }
                }
                
                state.animationRequest = requestAnimationFrame(state.function);
    
            }

            function toggleLoudestScreenMode(mode) {
                loudestMode = mode;
                disableLoudesScreenMode();

                if (mode == 'disabled') {
                    return;
                }

                if(webrtcSignalingLib.limits) {
                    return;
                }

                if (mode == 'allButMe') {
                    switchScreensMode('minimizedStatic');
                }

                if(mode == 'all') {
                    let state = loudestModeIntervalFunc = {
                        stopped: false
                    };

                    let maximizeLoudest = Q.throttle(function () {
                        maximizeLoudestUser(state);
                    }, 100, true);
                    state.function = maximizeLoudest;

                    maximizeLoudest(loudestModeIntervalFunc);

                } else if (mode == 'allButMe') {
                    let state = loudestModeIntervalFunc = {
                        stopped: false
                    };

                    let maximizeLoudest = Q.throttle(function () {
                        maximizeLoudestUserButMe(state);
                    }, 100, true);

                    state.function = maximizeLoudest;

                    maximizeLoudest(loudestModeIntervalFunc);
                }

            }
            function disableLoudesScreenMode() {
                if (loudestModeIntervalFunc != null) {
                    loudestModeIntervalFunc.stopped = true;
                    cancelAnimationFrame(loudestModeIntervalFunc.animationRequest)
                    loudestModeIntervalFunc = null;
                }
            }

            /**
             * Custom layouts for Q.layout tool (layouts are taking into accout ratio of participants' video).
             */
            var customLayouts = {

                /**
                 * Prepare data for animated changing view mode to normal. Takes into account ratio of video.
                 * @method regularScreensGrid
                 * @param {Object} [container] HTML parent element participants' screens.
                 * @return {Array} List of DOMRects that will be passed to Q.layout.
                 */ 
                regularScreensGrid: function (container) {
                    var containerRect = container == document.body ? new DOMRect(0, 0, window.innerWidth, window.innerHeight) : container.getBoundingClientRect();
                    var parentWidth = containerRect.width;
                    var parentHeight = containerRect.height;
                    var defaultRectWidth = containerRect.width < 555 ? containerRect.width : 555;
                    var defaultRectHeight = containerRect.height < 416 ? containerRect.height : 416;
                    var maxLongestSide =  Math.min(defaultRectWidth, defaultRectHeight);
                    var defaultDOMRect = getElementSizeKeepingRatio({
                        width: defaultRectWidth,
                        height: defaultRectHeight
                    }, {width: maxLongestSide, height: maxLongestSide})
                    var centerX = containerRect.width / 2;
                    var centerY = containerRect.height / 2;
                    var rectsRows = [];
                    var currentRow = [];
                    var spaceBetween = 10;
                    var prevRect = null;
                    var count = roomScreens.length;

                    var minX, maxX, maxX, minY, maxY;
                    var nextAction = null;

                    var i;
                    for (i = 0; i < count; i++) {
                        var screen = roomScreens[i];
                        var screenElRect = screen.screenEl.getBoundingClientRect();
                        var videoWidth = screen.videoTrackEl != null && screen.videoTrackEl.videoWidth != 0 ? screen.videoTrackEl.videoWidth : 0
                        var videoHeight = (screen.videoTrackEl != null && screen.videoTrackEl.videoHeight != 0 ? screen.videoTrackEl.videoHeight : 0);

                        //if video element has width and height, rect's proportions will be based on the size of video
                        var newRectSize = null;
                        if(videoWidth != 0 && videoHeight != 0) {
                            newRectSize = getElementSizeKeepingRatio({
                                width: videoWidth,
                                height: videoHeight
                            }, {width: maxLongestSide, height: maxLongestSide})
                        } else {
                            //if video's size still = 0x0, rect's proportions will be 4:3
                            newRectSize = defaultDOMRect;
                        }

                        if(videoWidth != 0 && videoHeight != 0) newRectSize.height = newRectSize.height + 50;

                        var prevRow = rectsRows[rectsRows.length - 1];

                        //new row started - no rects in current row yet
                        if(currentRow.length == 0) {
                            //if it's very first rect. render it strictly in the center
                            if(rectsRows.length == 0) {
                                var x = centerX - (newRectSize.width / 2);
                                var y = centerY - (newRectSize.height / 2);
                                var domRect = new DOMRect(x, y, newRectSize.width, newRectSize.height);
                                currentRow.push(domRect);
                                prevRect = domRect;
                            } else {
                                let minY = Math.min.apply(Math, rectsRows[0].map(function(r) { return r.top; }));
                                let maxY = Math.max.apply(Math, rectsRows[rectsRows.length - 1].map(function(r) { return r.top + r.height;}));
                                let freeYRoom = (minY - containerRect.top) + ((containerRect.top + containerRect.height) - maxY);

                                if(freeYRoom >= (newRectSize.height + spaceBetween * 2)) {
                                    //if there is enough room for one more row, make new row AND align ALL rects vertically inside its parent
                                    var topPosition = maxY + spaceBetween;
                                    var newMaxY = topPosition + newRectSize.height;
                                    var newTopPosition = centerY - ((newMaxY - minY) / 2);
                                    if(newTopPosition <= spaceBetween) {
                                        newTopPosition = spaceBetween;
                                    }
                                    var moveAllRectsOn = minY - newTopPosition;

                                    for(var x in rectsRows) {

                                        var row = rectsRows[x];
                                        var s;
                                        for(s = 0; s < row.length; s++) {
                                            row[s].y = row[s].top - moveAllRectsOn;
                                        }
                                    }
                                    var domRect = new DOMRect(centerX - (newRectSize.width / 2), topPosition - moveAllRectsOn, newRectSize.width, newRectSize.height);
                                    prevRect = domRect;
                                    currentRow.push(domRect);
                                }
                            }
                        } else {
                            let minX = Math.min.apply(Math, currentRow.map(function (r) {
                                return r.left;
                            }));
                            let maxX = Math.max.apply(Math, currentRow.map(function (r) {
                                return r.left + r.width;
                            }));

                            let freeXRoom = (minX - containerRect.left) + ((containerRect.left + containerRect.width) - maxX);

                            //if threre is enough space in current row (horizontally), continue adding new rect to current row
                            if (freeXRoom >= (newRectSize.width + spaceBetween * 2)) {
                                var topOfSmallest = Math.max.apply(Math, currentRow.map(function (r) {return r.top;}));
                                var bottomOfSmallest = Math.min.apply(Math, currentRow.map(function (r) {return r.top + r.height;}));
                                var topPosition = (topOfSmallest + ((bottomOfSmallest - topOfSmallest) / 2)) - (newRectSize.height / 2)

                                //insert new rect centralized vertically relatively to current row
                                var domRect = new DOMRect(prevRect.left + (prevRect.width + spaceBetween), topPosition, newRectSize.width, newRectSize.height);
                                prevRect = domRect;
                                currentRow.push(domRect);

                                let minX = Math.min.apply(Math, currentRow.map(function (r) {return r.left;}));
                                let maxX = Math.max.apply(Math, currentRow.map(function (r) {return r.left + r.width;}));

                                var newLeftPosition = centerX - ((maxX - minX) / 2);
                                var moveAllRectsOn = minX - newLeftPosition;

                                //if current row intersects with previous top row, move current row lower
                                if (prevRow != null) {
                                    var maxYOfAllPrevRow = Math.max.apply(Math, prevRow.map(function (r) {
                                        return r.top + r.height;
                                    }));
                                    var minYOfAllCurRow = Math.min.apply(Math, currentRow.map(function (r) {
                                        return r.top;
                                    }));
                                    if (minYOfAllCurRow <= maxYOfAllPrevRow) {
                                        var topOfSmallest = Math.max.apply(Math, currentRow.map(function (r) {return r.top;}));
                                        var bottomOfSmallest = Math.min.apply(Math, currentRow.map(function (r) {return r.top + r.height;}));

                                        var x;
                                        var rowLength = currentRow.length;
                                        for (x = 0; x < rowLength; x++) {
                                            var topPosition = (topOfSmallest + ((bottomOfSmallest - topOfSmallest) / 2)) - (currentRow[x].height / 2) + (maxYOfAllPrevRow - minYOfAllCurRow) + spaceBetween
                                            currentRow[x].y = topPosition;

                                        }
                                    }
                                }

                                //centralize all rects in current row horizontally
                                for (var x in currentRow) {
                                    var newXPosition = currentRow[x].x - moveAllRectsOn;
                                    currentRow[x].x = newXPosition;
                                }
                            }
                        }


                        let allRects = []
                        let allRows = [...rectsRows, ...[currentRow]];
                        for(let x in allRows) {
                            for(let r in allRows[x]) {
                                allRects.push(allRows[x][r]);
                            }
                        }

                        minX = Math.min.apply(Math, currentRow.map(function (r) {return r.left;}));
                        maxX = Math.max.apply(Math, currentRow.map(function (r) {return r.left + r.width;}));
                        let freeXRoom = (minX - containerRect.left) + ((containerRect.left + containerRect.width) - maxX);
                        minY = Math.min.apply(Math, allRects.map(function(r) { return r.top; }));
                        maxY = Math.max.apply(Math, allRects.map(function(r) { return r.top + r.height;}));
                        let freeYRoom = (minY - containerRect.top) + ((containerRect.top + containerRect.height) - maxY);

                        if(i+1 != roomScreens.length && freeXRoom < (newRectSize.width + spaceBetween * 2) && freeYRoom < (newRectSize.height + spaceBetween * 2)){
                            // if there is no free room horizontally and vertically in parent container, move to next step - adding rects making parent container scrollable
                            nextAction = 'makeScrollable';
                            rectsRows.push(currentRow);
                            currentRow = [];
                            break;
                        } else if(i+1 == roomScreens.length || freeXRoom <= (newRectSize.width + spaceBetween * 2)){
                            // if there is no free room horizontally anymore AND there is free room vertically, insert new row
                            rectsRows.push(currentRow);
                            currentRow = [];
                        }
                    }

                    var rects = [];
                    var k, row;
                    for(k= 0; row = rectsRows[k]; k++) {
                        rects = rects.concat(row);
                    }
                    var minX = Math.min.apply(Math, rects.map(function(r) { return r.left; }));
                    var maxX = Math.max.apply(Math, rects.map(function(r) { return r.left + r.width;}));
                    var minY = Math.min.apply(Math, rects.map(function(r) { return r.top; }));
                    var maxY = Math.max.apply(Math, rects.map(function(r) { return r.top + r.height;}));

                    //if parent container doesn't have space for new rectangles, it will continue adding new rects to this container making it scrollable
                    if(nextAction == 'makeScrollable') {
                        //if aspect ratio is more than 2.5, put new rects to the right of container - it will create horizontal scrollbar
                        if(containerRect.width / containerRect.height >= 2.5) {

                            //align all rects by left side
                            if(minX > spaceBetween) {
                                let moveAllRectsOn = minX - spaceBetween;
                                for (let x in rectsRows) {
                                    let row = rectsRows[x];
                                    for (let s in row) {
                                        row[s].x = row[s].x - moveAllRectsOn;
                                    }
                                }
                            }

                            let currentCol = [];
                            for (i = i+1; i < count; i++) {
                                var screen = roomScreens[i];

                                var videoWidth = screen.videoTrackEl != null && screen.videoTrackEl.videoWidth != 0 ? screen.videoTrackEl.videoWidth : 0
                                var videoHeight = (screen.videoTrackEl != null && screen.videoTrackEl.videoHeight != 0 ? screen.videoTrackEl.videoHeight : 0);

                                //if video element has width and height, rect's proportions will be based on the size of video
                                var newRectSize = null;
                                if(videoWidth != 0 && videoHeight != 0) {
                                    newRectSize = getElementSizeKeepingRatio({
                                        width: videoWidth,
                                        height: videoHeight
                                    }, {width: maxLongestSide, height: maxLongestSide})
                                } else {
                                    //if video's size still = 0x0, rect's proportions will be 4:3
                                    newRectSize = defaultDOMRect;
                                }

                                if(videoWidth != 0 && videoHeight != 0) newRectSize.height = newRectSize.height + 50;

                                //new row started - no rects in current col yet
                                if(currentCol.length == 0) {
                                    //create first rectangle in col and align it vertically
                                    let minY = Math.min.apply(Math, rectsRows[0].map(function(r) { return r.top; }));
                                    let maxY = Math.max.apply(Math, rectsRows[rectsRows.length - 1].map(function(r) { return r.top + r.height;}));
                                    let freeYRoom = (minY - containerRect.top) + ((containerRect.top + containerRect.height) - maxY);

                                    let minX = Math.min.apply(Math, rectsRows[0].map(function (r) {return r.left;}));
                                    let maxX = Math.max.apply(Math, rectsRows[rectsRows.length - 1].map(function (r) {return r.left + r.width;}));
                                    let freeXRoom = (minX - containerRect.left) + ((containerRect.left + containerRect.width) - maxX);

                                    var domRect = new DOMRect(maxX + spaceBetween, centerY - (newRectSize.height / 2), newRectSize.width, newRectSize.height);
                                    currentCol.push(domRect);
                                    prevRect = domRect;


                                } else {
                                    let minY = Math.min.apply(Math, currentCol.map(function (r) {
                                        return r.top;
                                    }));
                                    let maxY = Math.max.apply(Math, currentCol.map(function (r) {
                                        return r.top + r.height;
                                    }));

                                    let freeYRoom = (minY - containerRect.top) + ((containerRect.top + containerRect.height) - maxY);

                                    //if threre is enough space in current col, continue adding new rect to current row
                                    if (freeYRoom >= (newRectSize.height + spaceBetween * 2)) {

                                        let topOfSmallest = Math.max.apply(Math, currentCol.map(function (r) {
                                            return r.top;
                                        }));
                                        let bottomOfSmallest = Math.min.apply(Math, currentCol.map(function (r) {
                                            return r.top + r.height;
                                        }));
                                        let topPosition = (topOfSmallest + ((bottomOfSmallest - topOfSmallest) / 2)) - (newRectSize.height / 2)

                                        let domRect = new DOMRect(prevRect.left, prevRect.top + (prevRect.height + spaceBetween), newRectSize.width, newRectSize.height);
                                        prevRect = domRect;
                                        currentCol.push(domRect);

                                        let minY = Math.min.apply(Math, currentCol.map(function (r) {
                                            return r.top;
                                        }));
                                        let maxY = Math.max.apply(Math, currentCol.map(function (r) {
                                            return r.top + r.height;
                                        }));


                                        let newTopPosition = centerY - ((maxY - minY) / 2);
                                        let moveAllRectsOn = minY - newTopPosition;

                                        //centralize all rects in current col
                                        for (let x in currentCol) {
                                            let newYPosition = currentCol[x].top - moveAllRectsOn;
                                            currentCol[x].y = newYPosition;
                                        }
                                    } else {
                                        //if there is no enogh space in current col, create new col and continue
                                        i = i - 1;
                                        rectsRows.push(currentCol);
                                        currentCol = [];
                                        continue;
                                    }
                                }

                                if(i+1 == roomScreens.length){
                                    rectsRows.push(currentCol);
                                    currentCol = [];
                                }

                            }
                        } else {
                            //if aspect ratio is less than 2.5, add new rects on the bottom - it will create vertical scrollbar

                            //align all rects to the top of parent container
                            if(minY > spaceBetween) {
                                let moveAllRectsOn = minY - spaceBetween;
                                for (let x in rectsRows) {
                                    let row = rectsRows[x];
                                    for (let s in row) {
                                        row[s].y = row[s].y - moveAllRectsOn;
                                    }
                                }
                            }

                            let currentRow = [];
                            for (i = i+1; i < count; i++) {
                                var screen = roomScreens[i];

                                let prevRow = rectsRows[rectsRows.length - 1];
                                var screenElRect = screen.screenEl.getBoundingClientRect();
                                var videoWidth = screen.videoTrackEl != null && screen.videoTrackEl.videoWidth != 0 ? screen.videoTrackEl.videoWidth : 0
                                var videoHeight = (screen.videoTrackEl != null && screen.videoTrackEl.videoHeight != 0 ? screen.videoTrackEl.videoHeight : 0);

                                //if video element has width and height, rect's proportions will be based on the size of video
                                var newRectSize = null;
                                if(videoWidth != 0 && videoHeight != 0) {

                                    newRectSize = getElementSizeKeepingRatio({
                                        width: videoWidth,
                                        height: videoHeight
                                    }, {width: maxLongestSide, height: maxLongestSide})
                                } else {
                                    //if video's size still = 0x0, rect's proportions will be 4:3
                                    newRectSize = defaultDOMRect;
                                }


                                if(videoWidth != 0 && videoHeight != 0) newRectSize.height = newRectSize.height + 50;

                                //new row started - no rects in current row yet
                                if(currentRow.length == 0) {
                                    //create first rectangle in current row and centralize it

                                    let minY = Math.min.apply(Math, rectsRows[0].map(function(r) { return r.top; }));
                                    let maxY = Math.max.apply(Math, rectsRows[rectsRows.length - 1].map(function(r) { return r.top + r.height;}));
                                    let freeYRoom = (minY - containerRect.top) + ((containerRect.top + containerRect.height) - maxY);

                                    let minX = Math.min.apply(Math, rectsRows[0].map(function (r) {return r.left;}));
                                    let maxX = Math.max.apply(Math, rectsRows[rectsRows.length - 1].map(function (r) {return r.left + r.width;}));
                                    let freeXRoom = (minX - containerRect.left) + ((containerRect.left + containerRect.width) - maxX);

                                    var domRect = new DOMRect(centerX - (newRectSize.width / 2), maxY + spaceBetween, newRectSize.width, newRectSize.height);
                                    currentRow.push(domRect);
                                    prevRect = domRect;
                                } else {
                                    let minX = Math.min.apply(Math, currentRow.map(function (r) {
                                        return r.left;
                                    }));
                                    let maxX = Math.max.apply(Math, currentRow.map(function (r) {
                                        return r.left + r.width;
                                    }));

                                    let freeXRoom = (minX - containerRect.left) + ((containerRect.left + containerRect.width) - maxX);

                                    //if threre is enough space in current row (horizontally), continue adding new rect to current row
                                    if (freeXRoom >= (newRectSize.height + spaceBetween * 2)) {

                                        let topOfSmallest = Math.max.apply(Math, currentRow.map(function (r) {
                                            return r.top;
                                        }));
                                        let bottomOfSmallest = Math.min.apply(Math, currentRow.map(function (r) {
                                            return r.top + r.height;
                                        }));
                                        let topPosition = (topOfSmallest + ((bottomOfSmallest - topOfSmallest) / 2)) - (newRectSize.height / 2)

                                        //insert new rect centralizad vertically relatively to current row
                                        let domRect = new DOMRect(prevRect.left + (prevRect.width + spaceBetween), topPosition , newRectSize.width, newRectSize.height);
                                        prevRect = domRect;
                                        currentRow.push(domRect);

                                        let minX = Math.min.apply(Math, currentRow.map(function (r) {
                                            return r.left;
                                        }));
                                        let maxX = Math.max.apply(Math, currentRow.map(function (r) {
                                            return r.left + r.width;
                                        }));

                                        //if current row intersects with previous top row, move current row lower
                                        if (prevRow != null) {
                                            let maxYOfAllPrevRow = Math.max.apply(Math, prevRow.map(function (r) {
                                                return r.top + r.height;
                                            }));
                                            let minYOfAllCurRow = Math.min.apply(Math, currentRow.map(function (r) {
                                                return r.top;
                                            }));
                                            if (minYOfAllCurRow <= maxYOfAllPrevRow) {
                                                let topOfSmallest = Math.max.apply(Math, currentRow.map(function (r) {return r.top;}));
                                                let bottomOfSmallest = Math.min.apply(Math, currentRow.map(function (r) {return r.top + r.height;}));

                                                let x;
                                                let rowLength = currentRow.length;
                                                for (x = 0; x < rowLength; x++) {
                                                    let topPosition = (topOfSmallest + ((bottomOfSmallest - topOfSmallest) / 2)) - (currentRow[x].height / 2) + (maxYOfAllPrevRow - minYOfAllCurRow) + spaceBetween
                                                    currentRow[x].y = topPosition;

                                                }
                                            }
                                        }

                                        let newLeftPosition = centerX - ((maxX - minX) / 2);
                                        let moveAllRectsOn = minX - newLeftPosition;

                                        //centralize all rects in current row horizontally
                                        for (let x in currentRow) {
                                            currentRow[x].x = currentRow[x].left - moveAllRectsOn;
                                        }
                                    } else {
                                        //if there is no enough space in current row, create new row below
                                        i = i - 1;
                                        rectsRows.push(currentRow);
                                        currentRow = [];
                                        continue;
                                    }
                                }

                                if(i+1 == roomScreens.length){
                                    rectsRows.push(currentRow);
                                    currentRow = [];
                                }
                            }
                        }
                    }

                    var rects = [];
                    var i, row;
                    for(i = 0; row = rectsRows[i]; i++) {
                        rects = rects.concat(row);
                    }

                    return rects;
                },

                /**
                 * Prepare data for animated changing view mode to audio layout
                 * @method audioScreensGrid
                 * @param {Object} [container] HTML parent element participants' screens.
                 * @return {Array} List of DOMRects that will be passed to Q.layout.
                 */
                audioScreensGrid: function (container, roomScreens) {
                    var parentRect = container == document.body ? new DOMRect(0, 0, window.innerWidth, window.innerHeight) : container.getBoundingClientRect();
                    var count = roomScreens.length;
                    if(count == 0 || parentRect == 0 || parentRect.height == 0) return false;
                    var rects = [];

                    //var mainRadius = Math.min(size.parentWidth, size.parentHeight);

                    var centerX = parentRect.width / 2;
                    var centerY = parentRect.height / 2;
                    var spaceBetween = 15;

                    var ratio = parentRect.width / parentRect.height;
                    var isRatherNotMobile = parentRect.width < 360 || parentRect.height < 360;

                    if(ratio > 4.2 || (isRatherNotMobile && ratio > 3.8)) {
                        var rectHeight = (parentRect.height / 100  * 80) + 19;
                        if(rectHeight > parentRect.height) rectHeight = parentRect.height - 5;
                        var rectWidth = rectHeight - 19;
                        var spaceBetween = 15;
                        var startFrom  = (parentRect.width / 2) - ((rectWidth * count) + (spaceBetween * count)) / 2;
                        var prevRect = new DOMRect(startFrom, 0, 0, 0);
                        for ( var i=0; i<=count; i++ ) {
                            let x = prevRect.x + prevRect.width + spaceBetween;
                            let y = (parentRect.height / 2) - (rectHeight / 2);
                            let newRect = new DOMRect(x, y, rectWidth, rectHeight);
                            rects.push(newRect);
                            prevRect = newRect;
                        }

                        return rects;
                    } else  if(isRatherNotMobile && ratio < 0.40) {
                        var rectWidth = parentRect.width / 100  * 70;
                        var rectHeight = rectWidth + 19; //19 - height of "name" element
                        var spaceBetween = 10;
                        var startFrom  = (parentRect.height / 2) - ((rectHeight * count) + (spaceBetween * count)) / 2;

                        var prevRect = new DOMRect(0, startFrom, 0, 0);
                        for ( var i=0; i<=count; i++ ) {
                            let x = (parentRect.width / 2) - (rectWidth / 2);
                            let y = prevRect.y + prevRect.height + spaceBetween;
                            let newRect = new DOMRect(x, y, rectWidth, rectHeight);
                            rects.push(newRect);
                            prevRect = newRect;
                        }

                        return rects;
                    } else if(count === 1) {
                        var basicSize = Math.min(parentRect.width, parentRect.height)
                        var maxSize = basicSize / 100  * 70;
                        var rectWidth = maxSize > 150 ? 150 : maxSize;
                        var rectHeight = rectWidth + 19;
                        let x = (parentRect.width / 2) - (rectWidth / 2);
                        let y = (parentRect.height / 2) - (rectHeight / 2);
                        let newRect = new DOMRect(x, y, rectWidth, rectHeight);
                        rects.push(newRect);
                        return rects;
                    }

                    function stepSize() {
                        //return Math.PI/48 + Math.PI/36;
                        return  Math.PI/count;
                    }

                    function calculateSide( n , r)
                    {
                        var theta, theta_in_radians;

                        theta = 360 / n;
                        theta_in_radians = theta * Math.PI / 180;

                        return 2 * r * Math.sin(theta_in_radians / 2);
                    }

                    function radCircle(lRad, rRad) {

                        var mainRadius = _layoutTool.mainCircleRadius;
                        var x = centerX + mainRadius * Math.sin(lRad);
                        var y = centerY - mainRadius * Math.cos(lRad);
                        var r = rRad * Math.PI/3 * mainRadius * 0.95;
                        var sideLength  = calculateSide(count, mainRadius);
                        //var sideLength = 2*(mainRadius*Math.cos(radians))


                        if (count > 1 && r > (sideLength / 2)) r = sideLength / 2;
                        if (r > mainRadius) r = mainRadius;
                        r = r - spaceBetween

                        var layoutRect = new DOMRect(x - r, y - r, r*2, r*2);
                        rects.push(layoutRect);
                        return layoutRect;
                    }

                    var firstStep = 0, rad = 0, step = 0;
                    firstStep = step = stepSize();

                    if(count == 2 && Q.info.isMobile) {

                    } else {
                        var totalSteps = ((step*(count-1))*2)/2;
                        rad = -totalSteps;
                    }


                    var minSide = Math.min(parentRect.width, parentRect.height);

                    /*if(!Q.info.isMobile && count <= 2) {
                        if(!_layoutTool.mainCircleRadius || _layoutTool.mainCircleRadius > 120) _layoutTool.mainCircleRadius = 120;
                    } else if(Q.info.isMobile && count > 2 && count <= 4) {
                        if(!_layoutTool.mainCircleRadius || _layoutTool.mainCircleRadius > 150) _layoutTool.mainCircleRadius = 150;
                    }*/

                    if(_layoutTool.mainCircleRadius == null || _layoutTool.mainCircleRadius > minSide / 2) {
                        _layoutTool.mainCircleRadius = minSide / 4;
                    }



                    for ( var i=0; i<=count; i++ ) {
                        var newRect = radCircle(rad, step);

                        var twentyPercent = ((newRect.width / 2) / 100 * 20);

                        if(spaceBetween > twentyPercent) {

                            if( _layoutTool.mainCircleRadius + twentyPercent * count < (minSide / 2) - (newRect.width / 2) ) {
                                _layoutTool.mainCircleRadius += twentyPercent * count;
                                return this.audioScreensGrid(container, roomScreens)
                            }
                        } else if ((_layoutTool.mainCircleRadius + (newRect.width / 2)) * 2 >= minSide) {
                            var diff = (_layoutTool.mainCircleRadius + (newRect.width / 2)) * 2 - minSide
                            _layoutTool.mainCircleRadius = _layoutTool.mainCircleRadius - (diff / 2);

                            return this.audioScreensGrid(container, roomScreens);
                        }

                        rad += step;

                        var radLeft = Math.PI*2 - rad;

                        if ( radLeft < firstStep ) {
                            //break;
                        } else {
                            step = stepSize();

                            /*let nextRadleft = Math.PI*2 - step
                            if ( nextRadleft < firstStep ) {
                                //break;
                            }*/
                        }

                        rad += step;
                    }

                    return rects;
                },

                /**
                 * Prepare data for animated changing view mode to manual. It will add
                 * @method manualScreensGrid
                 * @param {Object} [container] HTML parent element participants' screens.
                 * @return {Array} List of DOMRects that will be passed to Q.layout.
                 */
                manualScreensGrid: function (container, roomScreens) {

                    var containerRect = container == document.body ? new DOMRect(0, 0, window.innerWidth, window.innerHeight) : container.getBoundingClientRect();
                    var layoutRects = [];
                    var parentWidth = containerRect.width;
                    var parentHeight = containerRect.height;
                    var centerX = containerRect.width / 2;
                    var centerY = containerRect.height / 2;

                    var count = roomScreens.length;
                    var i;
                    for (i = 0; i < count; i++) {
                        let screen = roomScreens[i];

                        let mappedRects = _layoutTool.state.currentMappedRects;
                        let screenExists = false;
                        for (let r in mappedRects) {
                            if(screen.screenEl == mappedRects[r].el) {
                                layoutRects.push(screen.screenEl.getBoundingClientRect());
                                screenExists = true;
                                break;
                            }
                        }

                        var videoWidth = screen.videoTrackEl != null && screen.videoTrackEl.videoWidth != 0 ? screen.videoTrackEl.videoWidth : 0
                        var videoHeight = (screen.videoTrackEl != null && screen.videoTrackEl.videoHeight != 0 ? screen.videoTrackEl.videoHeight : 0);


                        if(!screenExists) {
                            var newRectSize = null;

                            newRectSize = getElementSizeKeepingRatio({
                                width: videoWidth,
                                height: videoHeight
                            }, {width: 250, height: 250})

                            var rect = new DOMRect(centerX - (newRectSize.width / 2), centerY - (newRectSize.height / 2), newRectSize.width, newRectSize.height);
                            if (videoWidth != 0 && videoHeight != 0) rect.height = newRectSize.height + 50;
                            moveScreenFront.call(screen.screenEl);
                            layoutRects.push(rect);

                        }
                    }

                    return layoutRects;
                },

                /**
                 * Prepare data (rectangles) for animated changing view mode to maximized/minimized.
                 * @method minimizedOrMaximizedScreenGrid
                 * @param {Object} [container] HTML parent element participants' screens.
                 * @param {Integer} [count] number of screens to render.
                 * @param {Object} [elementToWrap] HTML element that will be wrapped by minimized screens.
                 * @param {Boolean} [maximized] Render maximized view mode.
                 * @return {Array} List of DOMRects that will be passed to Q.layout.
                 */
                minimizedOrMaximizedScreenGrid: function minimizedOrMaximizedScreenGrid(container, count, elementToWrap, maximized) {
                    log('minimizedOrMaximizedScreenGrid', container, count, _layoutTool.currentRects.length, maximized)
                    var initCount = count;
                    var wrapElement = elementToWrap;
                    var elementToWrap = elementToWrap.getBoundingClientRect();

                    if(roomScreens.length == 0) return;
                    var rebuild;
                    var rectsRegenerated = false;

                    var prevElPos = _layoutTool.elementToWrapPosition;

                    if((prevElPos != null && (elementToWrap.top != prevElPos.top || elementToWrap.left != prevElPos.left))
                        || (_layoutTool.state.currentGenerator != 'maximizedScreensGrid' && _layoutTool.state.currentGenerator != 'minimizedScreensGrid')) {
                        _layoutTool.currentRects = [];
                        _layoutTool.state.currentMappedRects = [];
                        rebuild = true;
                    }
                    _layoutTool.elementToWrapPosition = elementToWrap;

                    var rectWidth = 90;
                    var rectHeight = 90;
                    var spaceBetween = 10;
                    var defaultSide = 'top-full';

                    var containerRect = container.getBoundingClientRect();
                    var parentWidth = containerRect.width;
                    var parentHeight = containerRect.height;

                    if(!maximized) {
                        _layoutTool.state.currentGenerator = 'minimizedScreensGrid';
                    } else {
                        _layoutTool.state.currentGenerator = 'maximizedScreensGrid';
                    }
                    log('minimizedOrMaximizedScreenGrid: rebuild', rebuild)

                    if(_layoutTool.basicGridRects.length == 0 || _layoutTool.basicGridRects.length < count || rebuild) {
                        log('minimizedOrMaximizedScreenGrid if1')
            
                        _layoutTool.basicGridRects = build(container, count, elementToWrap, maximized);
                    }

                    if(_layoutTool.currentRects.length == 0 /*|| _layoutTool.basicGridRects.length < count*/ || rebuild) {
                        log('minimizedOrMaximizedScreenGrid: 1')
                        _layoutTool.currentRects = build(container, count, elementToWrap, maximized);
                        rectsRegenerated = true;
                    } else {
                        log('minimizedOrMaximizedScreenGrid: 2')

                        if(count > _layoutTool.currentRects.length) {
                            log('minimizedOrMaximizedScreenGrid: 3')
                            var availableRects = addAndUpdate(container, count, elementToWrap, maximized);
                            _layoutTool.currentRects = _layoutTool.currentRects.concat(availableRects);
                            rectsRegenerated = true;

                        } else if(count < _layoutTool.currentRects.length) {
                            log('minimizedOrMaximizedScreenGrid: 4')
                            _layoutTool.currentRects = removeAndUpdate(container, count, elementToWrap, maximized);
                            rectsRegenerated = true;
                        }
                    }

                    if(maximized || (activeScreen != null && maximized != false)) {
                        log('minimizedOrMaximizedScreenGrid: 5')
                        _layoutTool.currentRects = maximizeScreen();
                    } else if(!maximized && !rectsRegenerated) {
                        log('minimizedOrMaximizedScreenGrid: 6')
                        _layoutTool.currentRects = minimizeScreen();
                    }


                    log('minimizedOrMaximizedScreenGrid: _layoutTool.currentRects', _layoutTool.currentRects)

                    return  _layoutTool.currentRects;

                    function getControlsAlign() {

                        //let intersect = (elementToWrap.top < containerRect.bottom && (elementToWrap.left < containerRect.right || elementToWrap.right > containerRect.left)) ||
                        //    (elementToWrap.bottom > containerRect.top && (elementToWrap.left < containerRect.right || elementToWrap.right > containerRect.left));

                        let intersectsEnough;
                        if(intersects(containerRect, elementToWrap)) {
                            if((elementToWrap.top < containerRect.bottom && elementToWrap.bottom >= containerRect.bottom && containerRect.bottom - elementToWrap.top >= spaceBetween) ||
                                (elementToWrap.top > containerRect.top && elementToWrap.bottom < containerRect.bottom) ||
                                (elementToWrap.bottom > containerRect.top && elementToWrap.top <= containerRect.top && elementToWrap.bottom - containerRect.top >= spaceBetween)) {
                                intersectsEnough = true;
                            }
                        }

                        if(!document.body.contains(wrapElement) || !intersectsEnough) return defaultSide;
                        //var containerRect = container == document.body ? new DOMRect(0, 0, window.innerWidth, window.innerHeight) : container.getBoundingClientRect();
                        var parentHeight = containerRect.height;

                        if(wrapElement.classList.contains('Q_resize_snapped_left') && (elementToWrap.top - containerRect.top) < parentHeight / 2) {
                            return 'topleft';
                        } else if(wrapElement.classList.contains('Q_resize_snapped_left') && (elementToWrap.top - containerRect.top) >= parentHeight / 2) {
                            return 'bottomleft';
                        } else if(wrapElement.classList.contains('Q_resize_snapped_right') && (elementToWrap.top - containerRect.top) < parentHeight / 2) {
                            return 'topright';
                        } else if(wrapElement.classList.contains('Q_resize_snapped_right') && (elementToWrap.top - containerRect.top) >= parentHeight / 2) {
                            return 'bottomright';
                        } else if(wrapElement.classList.contains('Q_resize_snapped_top')) {
                            return 'top';
                        } else if(wrapElement.classList.contains('Q_resize_snapped_bottom')) {
                            return 'bottom';
                        } else {
                            return 'bottom';
                        }
                    }

                    function intersects(r1, r2) {
                        return !(r2.left > r1.right ||
                            r2.right < r1.left ||
                            r2.top > r1.bottom ||
                            r2.bottom < r1.top);
                    }

                    function maximizeScreen(){
                        //log('minimizedOrMaximizedScreenGrid: maximizeScreen', JSON.stringify(_layoutTool.currentRects))

                        var indexToMaximize;

                        for(let s in roomScreens) {
                            if(activeScreen == roomScreens[s]) {
                                indexToMaximize = parseInt(s);
                                break;
                            }
                        }
                        log('minimizedOrMaximizedScreenGrid: maximizeScreen: indexToMaximize', indexToMaximize, _layoutTool.maximizedScreen)


                        var currentMaximizedIndex;
                        if(_layoutTool.maximizedScreen != null) {
                            for(let s in roomScreens) {
                                if(_layoutTool.maximizedScreen == roomScreens[s]) {
                                    currentMaximizedIndex = s;
                                    break;
                                }
                            }
                        }

                        log('minimizedOrMaximizedScreenGrid: maximizeScreen: currentMaximizedIndex', currentMaximizedIndex)


                        var align = getControlsAlign();

                        if(activeScreenRect != null) {
                            //log('minimizedOrMaximizedScreenGrid: maximizeScreen: if1', JSON.stringify(activeScreenRect));

                            var rectsToTakeInc = _layoutTool.currentRects.filter(function(r, i){
                                return (r.x == activeScreenRect.x && r.y == activeScreenRect.y
                                && r.width == activeScreenRect.width && r.height == activeScreenRect.height ? false : true)
                            });
                            var minY = Math.min.apply(Math, rectsToTakeInc.map(function(o) { return o.y; }));
                            var maxY = Math.max.apply(Math, rectsToTakeInc.map(function(o) { return o.y + o.height; }));
                        } else {
                            log('minimizedOrMaximizedScreenGrid: maximizeScreen: if2');
                            var minY = Math.min.apply(Math, _layoutTool.currentRects.map(function(o) { return o.y; }));
                            var maxY = Math.max.apply(Math, _layoutTool.currentRects.map(function(o) { return o.y + o.height; }));
                        }

                        log('minimizedOrMaximizedScreenGrid: maximizeScreen: minY', minY, maxY);

                        var y, baseHeight;
                        if(align == 'bottom' || align == 'bottomleft' || align == 'bottomright' || align == 'bottom-full') {
                            baseHeight = (minY - spaceBetween) - 50;
                        } else if (align == 'top' || align == 'topleft' || align == 'topright' || align == 'top-full') {
                            baseHeight = parentHeight - (maxY + spaceBetween) - 50;
                        }
                        var videoWidth = typeof activeScreen != 'undefined' && activeScreen.videoTrackEl != null && activeScreen.videoTrackEl.videoWidth != 0 ? activeScreen.videoTrackEl.videoWidth : 480;
                        var videoHeight = typeof activeScreen != 'undefined' && activeScreen.videoTrackEl != null && activeScreen.videoTrackEl.videoHeight != 0 ? activeScreen.videoTrackEl.videoHeight : 270;

                        var mainScreenSize = getElementSizeKeepingRatio({
                            width: videoWidth,
                            height: videoHeight
                        }, {width: parentWidth / 100 * 90, height: Math.min(baseHeight - 50, ((parentHeight - (align == 'top' || align == 'bottom' ? elementToWrap.height : spaceBetween)) / 100 * 90) - 50)})
                        mainScreenSize.height = mainScreenSize.height + 50;
                        log('minimizedOrMaximizedScreenGrid: maximizeScreen: mainScreenSize', mainScreenSize);

                        if(align == 'bottom' || align == 'bottomleft' || align == 'bottomright' || align == 'bottom-full') {
                            if(align == 'bottom') minY = count > 1 ? minY : parentHeight - elementToWrap.height;
                            y = (minY / 2) - mainScreenSize.height / 2;
                        } else if (align == 'top' || align == 'topleft' || align == 'topright' || align == 'top-full') {
                            y = ((parentHeight - maxY) / 2) - (mainScreenSize.height / 2) + maxY;
                        }

                        var maximizedRect = new DOMRect((parentWidth / 2) - mainScreenSize.width / 2, y, mainScreenSize.width, mainScreenSize.height);

                        if(indexToMaximize != null) {
                            log('minimizedOrMaximizedScreenGrid: maximizeScreen: if3');

                            var minimizedRect = _layoutTool.currentRects[indexToMaximize];

                            minimizedRect = new DOMRect(minimizedRect.x, minimizedRect.y, minimizedRect.width, minimizedRect.height);
                            _layoutTool.currentRects[indexToMaximize].x = maximizedRect.x;
                            _layoutTool.currentRects[indexToMaximize].y = maximizedRect.y;
                            _layoutTool.currentRects[indexToMaximize].width = maximizedRect.width;
                            _layoutTool.currentRects[indexToMaximize].height = maximizedRect.height;

                            activeScreenRect = _layoutTool.currentRects[indexToMaximize];
                        }

                        //log('minimizedOrMaximizedScreenGrid: maximizeScreen: before if4', JSON.stringify(_layoutTool.currentRects));
                        log('minimizedOrMaximizedScreenGrid: maximizeScreen: before if4 minimizedRect', minimizedRect);
                        log('minimizedOrMaximizedScreenGrid: maximizeScreen: before if4 id', !currentMaximizedIndex, indexToMaximize != null, currentMaximizedIndex == indexToMaximize);

                        /*if(!currentMaximizedIndex && indexToMaximize || currentMaximizedIndex == indexToMaximize) {
                            log('minimizedOrMaximizedScreenGrid: maximizeScreen: if4');

                            if(_layoutTool.currentRects.length == 3 && roomScreens[1] == activeScreen) {
                                log('minimizedOrMaximizedScreenGrid: maximizeScreen: if4.1');

                                _layoutTool.currentRects[2].x = minimizedRect.x;
                                _layoutTool.currentRects[2].y = minimizedRect.y;
                                _layoutTool.currentRects[2].width = minimizedRect.width;
                                _layoutTool.currentRects[2].height = minimizedRect.height;
                            }
                        }*/

                        log('minimizedOrMaximizedScreenGrid: maximizeScreen: before if5', currentMaximizedIndex, currentMaximizedIndex != indexToMaximize);

                        if(currentMaximizedIndex && currentMaximizedIndex != indexToMaximize) {
                            log('minimizedOrMaximizedScreenGrid: maximizeScreen: if5');

                            _layoutTool.currentRects[currentMaximizedIndex].x = minimizedRect.x;
                            _layoutTool.currentRects[currentMaximizedIndex].y = minimizedRect.y;
                            _layoutTool.currentRects[currentMaximizedIndex].width = minimizedRect.width;
                            _layoutTool.currentRects[currentMaximizedIndex].height = minimizedRect.height;
                        } else {
                            log('minimizedOrMaximizedScreenGrid: maximizeScreen: if6');

                            _layoutTool.currentRects = fillFreeSpaceWithClosestRects(minimizedRect, _layoutTool.currentRects, (activeScreenRect ? [activeScreenRect] : null))
                        }

                        _layoutTool.maximizedScreen = activeScreen;

                        return _layoutTool.currentRects;
                    }

                    function minimizeScreen(){
                        log('minimizedOrMaximizedScreenGrid: minimizeScreen', activeScreen, initCount)

                        var currentMaximizedIndex;
                        if(_layoutTool.maximizedScreen != null) {
                            for (var s in roomScreens) {
                                if (_layoutTool.maximizedScreen == roomScreens[s]) {
                                    currentMaximizedIndex = parseInt(s, 10);
                                    break;
                                }
                            }
                        }
                        log('minimizedOrMaximizedScreenGrid: minimizeScreen: currentMaximizedIndex', currentMaximizedIndex)

                        if(currentMaximizedIndex == null) {
                            activeScreenRect = activeScreen = _layoutTool.maximizedScreen = null
                            return _layoutTool.currentRects;
                        }

                        var count = _layoutTool.currentRects.length + 1;
                        //var count = _layoutTool.currentRects.length;
                        var rects = addAndUpdate(container, count, elementToWrap, maximized);
                        //var rects = build(container, count, elementToWrap, maximized);
                        _layoutTool.currentRects[currentMaximizedIndex] = new DOMRect(rects[0].x, rects[0].y, rects[0].width, rects[0].height);
                        //_layoutTool.currentRects[currentMaximizedIndex] = new DOMRect(rects[rects.length - 1].x, rects[rects.length - 1].y, rects[rects.length - 1].width, rects[rects.length - 1].height);
                        activeScreenRect = activeScreen = _layoutTool.maximizedScreen = null

                        return _layoutTool.currentRects;
                    }

                    function getRectsGridParams(wrapElPosition) {
                        log('minimizedOrMaximizedScreenGrid: getRectsGridParams')
                        var rectsPerRow =  Math.floor(parentWidth / (rectWidth + spaceBetween));

                        var rectsOnLeftSide, rectsOnRightSide, numOfRowsAlongWrapEl
                        if(wrapElPosition == 'bottom' || wrapElPosition == 'top') {
                            rectsOnLeftSide = Math.floor((elementToWrap.left - containerRect.left) / (rectWidth + spaceBetween));
                            rectsOnRightSide = Math.floor((containerRect.right - elementToWrap.right) / (rectWidth + spaceBetween));
                            //numOfRowsAlongWrapEl = Math.floor((elementToWrap.top + spaceBetween) / (rectWidth + spaceBetween));
                            if(rectsOnLeftSide < 0) rectsOnLeftSide = 0;
                            if(rectsOnRightSide < 0) rectsOnRightSide = 0;

                            if (wrapElPosition == 'bottom') {
                                let num = (containerRect.top + containerRect.height - elementToWrap.top) / (rectHeight + spaceBetween);
                                numOfRowsAlongWrapEl = num > 0 && num < 0.5 ? 1 : Math.ceil(num);
                            } else if (wrapElPosition == 'top') {
                                let num = (elementToWrap.bottom - containerRect.top) / (rectHeight + spaceBetween);
                                numOfRowsAlongWrapEl = num > 0 && num < 0.5 ? 1 : Math.ceil(num);
                            }
                        } else if(wrapElPosition == 'bottomleft' || wrapElPosition == 'bottomright') {
                            //rectsOnLeftSide = rectsOnRightSide =  Math.floor(rectsPerRow / 2);
                            //numOfRowsAlongWrapEl = Math.floor(parentHeight / (rectHeight + spaceBetween));
                            rectsOnLeftSide = rectsOnRightSide = numOfRowsAlongWrapEl = 0;
                        } else if(wrapElPosition == 'topleft' || wrapElPosition == 'topright') {
                            //rectsOnLeftSide = rectsOnRightSide = Math.floor(rectsPerRow / 2);
                            //numOfRowsAlongWrapEl = Math.floor(parentHeight / (rectHeight + spaceBetween));
                            rectsOnLeftSide = rectsOnRightSide = numOfRowsAlongWrapEl = 0;
                        } else {
                            rectsOnLeftSide = rectsOnRightSide = numOfRowsAlongWrapEl = 0;
                        }


                        return {
                            rectsOnLeftSide: rectsOnLeftSide,
                            rectsOnRightSide: rectsOnRightSide,
                            numOfRowsAlongWrapEl: numOfRowsAlongWrapEl,
                            rectsPerRow: rectsPerRow
                        }
                    }

                    function build(container, count, elementToWrap, maximized) {
                        log('minimizedOrMaximizedScreenGrid: build START', count)
                        //var containerRect = container == document.body ? new DOMRect(0, 0, window.innerWidth, window.innerHeight) : container.getBoundingClientRect();
                        var parentWidth = containerRect.width;
                        var parentHeight = containerRect.height;

                        var align = getControlsAlign();

                        var rectWidth = 90;
                        var rectHeight = 90;
                        var spaceBetween = 10;
                        var gridParams = getRectsGridParams(align);
                        var rectsOnLeftSide = gridParams.rectsOnLeftSide;
                        var rectsOnRightSide = gridParams.rectsOnRightSide;
                        var numOfRowsAlongWrapEl = gridParams.numOfRowsAlongWrapEl;
                        var perRow = gridParams.rectsPerRow;

                        //if(numOfRowsAlongWrapEl == 0 && (rectsOnLeftSide != 0 || rectsOnRightSide != 0)) numOfRowsAlongWrapEl = 1;
                        var totalRectsOnSides = numOfRowsAlongWrapEl == 0 ? 0 : (rectsOnLeftSide * numOfRowsAlongWrapEl) + (rectsOnRightSide * numOfRowsAlongWrapEl);

                        if(count < totalRectsOnSides) totalRectsOnSides = count;

                        var rects = [];
                        var currentRowRects = [];

                        /*if(maximized) {
                            count = totalRectsOnSides = count - 1;
                        }*/

                        if(align == 'top' || align == 'bottom') {
                            var isNextNewLast = false;
                            var startFrom, side;
                            startFrom = side = rectsOnRightSide != 0 ? 'right' : 'left';
                            var rowItemCounter = 1;
                            var leftSideCounter = 0;
                            var rightSideCounter = 0;
                            var createNewRowOnLeft = false;
                            var createNewRowOnRight = false;
                            var i, x, y, prevRect, latestLeftRect, latestRightRect;
                            for (i = 0; i < totalRectsOnSides; i++) {
                                log('build totalRectsOnSides for')

                                if (side == "right") {
                                    log('build totalRectsOnSides for right')

                                    if (latestRightRect) prevRect = latestRightRect
                                    if (rightSideCounter >= 1) {
                                        y = prevRect.y;
                                        x = prevRect.x + (rectWidth + spaceBetween);

                                    } else if (createNewRowOnRight) {

                                        if (align == 'bottom' || align == 'bottomleft' || align == 'bottomright') {
                                            y = prevRect.y - (rectHeight + spaceBetween);
                                        } else if (align == 'top' || align == 'topleft' || align == 'topright') {
                                            y = prevRect.y + prevRect.height + spaceBetween;
                                        }

                                        if (align == 'bottomleft' || align == 'bottomright' || align == 'topleft' || align == 'topright') {
                                            x = startFrom == 'right' ? parentWidth / 2 - rectWidth / 2 : latestLeftRect.left + rectWidth + spaceBetween;
                                        } else {
                                            var allRects = currentRowRects;
                                            for (var a in rects) {
                                                allRects = allRects.concat(rects[a]);
                                            }
                                            x = allRects.filter(function (rect) {
                                                return rect.side == 'right';
                                            }).reduce(function (prev, current) {
                                                return (prev.rect.x < current.rect.x) ? prev : current;
                                            }).rect.x
                                        }

                                        createNewRowOnRight = false;
                                    } else {

                                        if (align == 'bottom' || align == 'bottomleft' || align == 'bottomright') {
                                            y = parentHeight - (rectHeight + spaceBetween);
                                        } else if (align == 'top' || align == 'topleft' || align == 'topright') {
                                            y = spaceBetween;
                                        }

                                        if (align == 'bottomleft' || align == 'bottomright' || align == 'topleft' || align == 'topright') {
                                            x = startFrom == 'right' ? parentWidth / 2 - rectWidth / 2 : latestLeftRect.left + rectWidth + spaceBetween;
                                        } else {
                                            x = ((elementToWrap.left - containerRect.left) + elementToWrap.width + spaceBetween);
                                        }

                                    }

                                    rightSideCounter++;

                                    if (rightSideCounter == rectsOnRightSide) {
                                        log('build totalRectsOnSides for createNewRowOnRight')

                                        createNewRowOnRight = true;
                                        rightSideCounter = 0;
                                    }
                                    if (rectsOnLeftSide != 0) {
                                        log('build totalRectsOnSides for right next', rightSideCounter, createNewRowOnRight, (createNewRowOnLeft && createNewRowOnRight), (createNewRowOnLeft && rightSideCounter > 1 && !createNewRowOnRight))

                                        if (rectsOnLeftSide == rectsOnRightSide) {
                                            side = 'left';
                                            log('build totalRectsOnSides for left next 0')

                                        } else if (rectsOnLeftSide != rectsOnRightSide) {
                                            if ((!createNewRowOnLeft && !createNewRowOnRight)
                                                || (createNewRowOnRight && !createNewRowOnLeft)
                                                || (createNewRowOnLeft && createNewRowOnRight && (rectsOnRightSide == 1 || rectsOnLeftSide == 1))) {
                                                side = 'left';
                                                log('build totalRectsOnSides for left next 1')

                                            } else if ((createNewRowOnLeft && createNewRowOnRight) || (createNewRowOnLeft && rightSideCounter > 1 && !createNewRowOnRight)) {
                                                side = 'right';
                                                log('build totalRectsOnSides for left next 2')
                                            }
                                        }
                                    }

                                    var rect = latestRightRect = new DOMRect(x, y, rectWidth, rectHeight);
                                    currentRowRects.push({side: 'right', rect: rect});
                                } else if (side == "left") {
                                    log('build totalRectsOnSides for left')
                                    if (latestLeftRect) prevRect = latestLeftRect;

                                    if (leftSideCounter >= 1) {

                                        y = prevRect.y;
                                        x = prevRect.x - (rectWidth + spaceBetween);

                                    } else if (createNewRowOnLeft) {
                                        if (align == 'bottom' || align == 'bottomleft' || align == 'bottomright') {
                                            y = prevRect.y - (rectHeight + spaceBetween);
                                        } else if (align == 'top' || align == 'topleft' || align == 'topright') {
                                            y = prevRect.y + (rectHeight + spaceBetween);
                                        }

                                        if (align == 'bottomleft' || align == 'bottomright' || align == 'topleft' || align == 'topright') {
                                            x = startFrom == 'left' ? parentWidth / 2 - rectWidth / 2 : latestRightRect.left - rectWidth - spaceBetween;
                                        } else {
                                            var allRects = currentRowRects;
                                            for (var a in rects) {
                                                allRects = allRects.concat(rects[a]);
                                            }
                                            x = allRects.filter(function (rect) {
                                                return rect.side == 'left';
                                            }).reduce(function (prev, current) {
                                                return (prev.rect.x > current.rect.x) ? prev : current;
                                            }).rect.x;
                                        }

                                        createNewRowOnLeft = false;
                                    } else {
                                        if (align == 'bottom' || align == 'bottomleft' || align == 'bottomright') {
                                            y = parentHeight - (rectHeight + spaceBetween);
                                        } else if (align == 'top' || align == 'topleft' || align == 'topright') {
                                            y = spaceBetween;
                                        }

                                        if (align == 'bottomleft' || align == 'bottomright' || align == 'topleft' || align == 'topright') {
                                            x = startFrom == 'left' ? parentWidth / 2 - rectWidth / 2 : latestRightRect.left - rectWidth - spaceBetween;
                                        } else {
                                            x = ((elementToWrap.left - containerRect.left) - (rectWidth + spaceBetween));
                                        }
                                    }

                                    leftSideCounter++;

                                    if (leftSideCounter == rectsOnLeftSide) {
                                        createNewRowOnLeft = true;
                                        leftSideCounter = 0;
                                    }

                                    if (rectsOnRightSide != 0) {
                                        if (rectsOnLeftSide == rectsOnRightSide) {
                                            side = 'right';
                                        } else if (rectsOnLeftSide != rectsOnRightSide) {
                                            if (createNewRowOnRight && !createNewRowOnLeft) {
                                                side = 'left';
                                            } else if ((!createNewRowOnLeft && !createNewRowOnRight) ||
                                                (createNewRowOnLeft && createNewRowOnRight) ||
                                                (createNewRowOnLeft && !createNewRowOnRight) ||
                                                (createNewRowOnLeft && createNewRowOnRight && rectsOnLeftSide == 1)) {
                                                side = 'right';
                                            }
                                        }
                                    }

                                    var rect = latestLeftRect = new DOMRect(x, y, rectWidth, rectHeight);
                                    currentRowRects.push({side: 'left', rect: rect});
                                }

                                if (i == perRow - 1 || i == totalRectsOnSides - 1) {
                                    rects.push(currentRowRects);
                                    currentRowRects = [];
                                }

                                count = count - 1;
                            }
                        }

                        if(align == 'bottomleft' || align == 'bottomright' || align == 'topleft' || align == 'topright') {

                            for(var i in rects){
                                var currentRowRects = rects[i];
                                var minX = Math.min.apply(Math, currentRowRects.map(function(o) { return o.rect.x; }));
                                var maxX = Math.max.apply(Math, currentRowRects.map(function(o) { return o.rect.x+o.rect.width; }));

                                var rowWidth = maxX - minX;

                                var newMinX = parentWidth / 2 - rowWidth / 2;

                                var fixOn = Math.abs(minX - newMinX);
                                for (var r = 0; r < currentRowRects.length; r++) {
                                    if(minX > parentWidth - maxX) {
                                        currentRowRects[r].rect.x = currentRowRects[r].rect.x - fixOn;
                                    } else {
                                        currentRowRects[r].rect.x = currentRowRects[r].rect.x + fixOn;
                                    }
                                }
                            }

                        }

                        var arr = [];
                        for(var i in rects){
                            arr = arr.concat(rects[i]);
                        }
                        rects = arr;

                        var minX, maxX, minY, maxY;
                        log('minimizedOrMaximizedScreenGrid: build 2')

                        if(align == 'bottom' || align == 'top') {
                            minX = Math.min.apply(Math, rects.map(function (o) {
                                return o.rect.x;
                            }));
                            maxX = Math.max.apply(Math, rects.map(function (o) {
                                return o.rect.x + o.rect.width;
                            }));
                            if (minX > (elementToWrap.left - containerRect.left)) minX = (elementToWrap.left - containerRect.left) + spaceBetween;
                            if (maxX < (elementToWrap.left - containerRect.left)) maxX = elementToWrap.right -  containerRect.left;
                            minY = Math.min.apply(Math, rects.map(function (o) {
                                return o.rect.y;
                            }));
                            maxY = Math.max.apply(Math, rects.map(function (o) {
                                return o.rect.y;
                            }));

                            var rectsNum = Math.ceil((maxX-minX)/(rectWidth + spaceBetween));
                            rectWidth = ((maxX-minX)-(spaceBetween*(rectsNum-1)))/rectsNum;
                            perRow =  Math.ceil(rectsNum);
                        } else if(align == 'bottomleft' || align == 'bottomright' || align == 'topleft' || align == 'topright') {
                            //var perRow =  Math.floor(parentWidth / (rectWidth + spaceBetween));
                            //let intersect = (elementToWrap.top < containerRect.bottom && (elementToWrap.left < containerRect.right || elementToWrap.right > containerRect.left)) ||
                            //    (elementToWrap.bottom > containerRect.top && (elementToWrap.left < containerRect.right || elementToWrap.right > containerRect.left));
                            let intersect = intersects(containerRect, elementToWrap);
                            perRow =  Math.floor((parentWidth - elementToWrap.width) / (rectWidth + spaceBetween));

                            if(align == 'bottomleft' || align == 'topleft') {
                                if(intersect) perRow =  Math.floor((parentWidth - (elementToWrap.right - containerRect.left)) / (rectWidth + spaceBetween));
                                maxX =  parentWidth - spaceBetween;
                            } else if (align == 'bottomright' || align == 'topright') {
                                if(intersect) perRow =  Math.floor((parentWidth - (containerRect.right - elementToWrap.left)) / (rectWidth + spaceBetween));
                                maxX = (elementToWrap.left - containerRect.left) - spaceBetween;
                            }

                            minY = spaceBetween;
                            maxY = parentHeight;
                        } else {
                            minX = spaceBetween;
                            maxX = parentWidth - spaceBetween;
                            minY = spaceBetween;
                            maxY = parentHeight;
                        }

                        var latestRect;
                        var isNextNewLast = false;
                        var rowItemCounter = 1;
                        var i;
                        for (i = 1; i <= count; i++) {
                            //var firstRect = new DOMRect(size.parentWidth - (rectWidth + spaceBetween), size.parentHeight - (rectHeight + spaceBetween), rectWidth, rectHeight)
                            if(latestRect != null) var prevRect = latestRect;
                            var currentRow = isNextNewLast  ? perRow : Math.ceil(i/perRow);
                            var isNextNewRow  = rowItemCounter  == perRow;
                            isNextNewLast = isNextNewLast == true ? true : isNextNewRow && currentRow + 1 == perRow;

                            var x,y
                            if(rowItemCounter > 1 && prevRect) {
                                y = prevRect.y;
                                x = prevRect.x - (rectWidth + spaceBetween);
                            } else {
                                var startX = maxX;
                                if(align == 'bottom' || align == 'bottomleft' || align == 'bottomright') {
                                    var startY = prevRect != null ? prevRect.y : maxY;
                                    y = startY - (rectHeight + spaceBetween);
                                } else if (align == 'top' || align == 'topleft' || align == 'topright') {
                                    y = prevRect != null ? (prevRect.y + rectHeight + spaceBetween) : minY;
                                } else if (align == 'top-full'){
                                    var startY = prevRect != null ? prevRect.y  + rectHeight + spaceBetween: minY;
                                    y = startY;
                                } else if (align == 'bottom-full'){
                                    var startY = prevRect != null ? prevRect.y : maxY;
                                    y = startY - (rectHeight + spaceBetween);
                                }
                                x = startX - rectWidth;
                            }
                            var rect = latestRect = new DOMRect(x, y, rectWidth, rectHeight);

                            rects.push({side:null, rect: rect});

                            if(rowItemCounter == perRow) {
                                rowItemCounter = 1;
                            } else rowItemCounter++;
                        }

                        rects = rects.map(function(rectObj){
                            return rectObj.rect;
                        });

                        //log('minimizedOrMaximizedScreenGrid: build rects', JSON.stringify(rects))
                        //return alignFullRows(rects)
                        return rects;
                    }

                    function addAndUpdate(container, count, elementToWrap, maximized) {
                        log('minimizedOrMaximizedScreenGrid: addAndUpdate', count)
                        //log('minimizedOrMaximizedScreenGrid: addAndUpdate: _layoutTool.currentRects', JSON.stringify(_layoutTool.currentRects))
                        var align = getControlsAlign();

                        var currentRects = _layoutTool.currentRects;

                        if(_layoutTool.maximizedScreen != null) {
                            currentRects = _layoutTool.currentRects.filter(function(r, i){
                                log('minimizedOrMaximizedScreenGrid: addAndUpdate: filter', r.width)

                                return (r.x == activeScreenRect.x && r.y == activeScreenRect.y
                                && r.width == activeScreenRect.width && r.height == activeScreenRect.height ? false : true)
                            });
                        } else {
                            currentRects = _layoutTool.currentRects;
                        }

                        //var containerRect = container == document.body ? new DOMRect(0, 0, window.innerWidth, window.innerHeight) : container.getBoundingClientRect();

                        var gridParams = getRectsGridParams(align);
                        var rectsOnLeftSide = gridParams.rectsOnLeftSide;
                        var rectsOnRightSide = gridParams.rectsOnRightSide;
                        var numOfRowsAlongWrapEl = gridParams.numOfRowsAlongWrapEl;
                        var perRow = gridParams.rectsPerRow;

                        var getRectsRows = function () {
                            log('minimizedOrMaximizedScreenGrid: getRectsRows')
                            var rows = {};
                            var left = [];
                            var right = [];
                            var none = [];
                            var i, count = currentRects.length;
                            for(i = 0; i < count; i++) {
                                var rect = currentRects[i];


                                if(align == 'bottom' || align == 'top') {
                                    let isTopFullRow = align == 'top' && rect.top >= (elementToWrap.bottom - containerRect.top);
                                    let isBottomFullRow = align == 'bottom' && rect.bottom <= (elementToWrap.top - containerRect.top);

                                    if(rect.left < (elementToWrap.left - containerRect.left) && !isTopFullRow && !isBottomFullRow) {
                                        if(rows[rect.top + '_l'] == null) rows[rect.top + '_l'] = [];

                                        rows[rect.top + '_l'].push({indx: i, top: rect.top, rect:rect, side:'left'});
                                    } else if (rect.left >= (elementToWrap.left - containerRect.left) && !isTopFullRow && !isBottomFullRow){

                                        if(rows[rect.top + '_r'] == null) rows[rect.top + '_r'] = [];

                                        rows[rect.top + '_r'].push({indx: i, top: rect.top, rect:rect, side:'right'});
                                    } else {
                                        if(rows[rect.top] == null) rows[rect.top] = [];

                                        rows[rect.top].push({indx: i, top: rect.top, rect:rect, side:'none'});
                                    }
                                } else {
                                    if(rows[rect.top] == null) rows[rect.top] = [];

                                    rows[rect.top].push({indx: i, top: rect.top, rect:rect, side:'none'});
                                }
                            }

                            var rowsArray = [];
                            for (var property in rows) {
                                if (rows.hasOwnProperty(property)) {
                                    if(rows[property][0].side == 'left') {
                                        left.push(rows[property]);
                                    } else if(rows[property][0].side == 'right') {
                                        right.push(rows[property]);
                                    } else {
                                        none.push(rows[property]);
                                    }
                                    rowsArray.push(rows[property]);
                                }
                            }

                            return {
                                left: left,
                                right: right,
                                none: none,
                                all: rowsArray
                            };
                        }

                        var getAvailableRects = function (sortedRows) {
                            log('minimizedOrMaximizedScreenGrid: getAvailableRects')
                            var  rows = sortedRows.all;
                            var availableRects = [];
                            var availableRectsFullRow = [];
                            var availableRectsOnLeft = [];
                            var availableRectsOnRight = [];


                            var minX, maxX, minY, maxY;

                            if(align == 'bottom' || align == 'top') {

                                minX = Math.min.apply(Math, currentRects.map(function (o) {return o.x;}));
                                maxX = Math.max.apply(Math, currentRects.map(function (o) {return o.x + o.width;}));

                                if (minX > (elementToWrap.left - containerRect.left)) minX = (elementToWrap.left - containerRect.left) + spaceBetween;
                                if (maxX < (elementToWrap.left - containerRect.left)) maxX = (elementToWrap.left - containerRect.left) + elementToWrap.width;


                            } else if(align == 'bottomleft' || align == 'topleft') {
                                //var perRow =  Math.floor(parentWidth / (rectWidth + spaceBetween));
                                //perRow =  Math.floor((parentWidth - elementToWrap.width) / rectWidth);
                                perRow =  Math.floor((parentWidth - (elementToWrap.right - containerRect.left)) / (rectWidth + spaceBetween));
                                maxX =  parentWidth - spaceBetween;
                                minX =  elementToWrap.right - containerRect.left;
                            } else if(align == 'bottomright' || align == 'topright') {
                                //perRow =  Math.floor((parentWidth - elementToWrap.width) / rectWidth);
                                perRow =  Math.floor((parentWidth - (elementToWrap.right - containerRect.right)) / (rectWidth + spaceBetween));
                                maxX = (elementToWrap.left - containerRect.left);
                                minX = spaceBetween;
                            } else {
                                perRow =  Math.floor(parentWidth / rectWidth);
                                minX = spaceBetween;
                                maxX = parentWidth;
                            }

                            /*var minX = Math.min.apply(Math, currentRects.map(function(o) { return o.x; }));
                            var maxX = Math.max.apply(Math, currentRects.map(function(o) { return o.x+o.width; }));*/
                            var maxWidth = maxX - minX;

                            var i, rowsCount = rows.length;
                            for(i = 0; i < rowsCount; i++) {
                                var row = rows[i];
                                var sampleRect = row[0];

                                if(sampleRect.side == 'left') {

                                    var maxRectsOnLeftSide = Math.floor((elementToWrap.left - containerRect.left) / (sampleRect.rect.width + spaceBetween));

                                    if(row.length != maxRectsOnLeftSide){
                                        var rowsMinX = Math.min.apply(Math, row.map(function(o) { return o.rect.x; }));
                                        var rowsMaxX = Math.max.apply(Math, row.map(function(o) { return o.rect.x+o.rect.width; }));

                                        var r, numRectsToAdd = maxRectsOnLeftSide - row.length, prevRect;
                                        for(r = 0; r < numRectsToAdd; r++){
                                            var newRect;
                                            if(r == 0) {
                                                newRect = new DOMRect(rowsMinX - sampleRect.rect.width - spaceBetween, sampleRect.rect.y, sampleRect.rect.width, sampleRect.rect.height)
                                            } else {
                                                newRect = new DOMRect(prevRect.x - sampleRect.rect.width - spaceBetween, sampleRect.rect.y, sampleRect.rect.width, sampleRect.rect.height)
                                            }
                                            availableRectsOnLeft.push(newRect);

                                            prevRect = newRect;
                                        }
                                    }

                                } else if (sampleRect.side == 'right') {

                                    var maxRectsOnRightSide = Math.floor((containerRect.right - elementToWrap.right) / (row[0].rect.width + spaceBetween));

                                    if(row.length != maxRectsOnRightSide){
                                        var rowsMinX = Math.min.apply(Math, row.map(function(o) { return o.rect.x; }));
                                        var rowsMaxX = Math.max.apply(Math, row.map(function(o) { return o.rect.x+o.rect.width; }));

                                        var r, numRectsToAdd = maxRectsOnRightSide - row.length, prevRect;
                                        for(r = 0; r < numRectsToAdd; r++){
                                            var newRect;
                                            if(r == 0) {
                                                newRect = new DOMRect(rowsMaxX + spaceBetween, sampleRect.rect.y, sampleRect.rect.width, sampleRect.rect.height)
                                            } else {
                                                newRect = new DOMRect(prevRect.x + prevRect.width + spaceBetween, sampleRect.rect.y, sampleRect.rect.width, sampleRect.rect.height)
                                            }
                                            availableRectsOnRight.push(newRect);

                                            prevRect = newRect;
                                        }
                                    }

                                } else {

                                    var maxRectsInCurrentRow = Math.floor((maxWidth + spaceBetween) / (sampleRect.rect.width + spaceBetween));

                                    if(row.length != maxRectsInCurrentRow){
                                        var rowsMinX = Math.min.apply(Math, row.map(function(o) { return o.rect.x; }));
                                        var rowsMaxX = Math.max.apply(Math, row.map(function(o) { return o.rect.x+o.rect.width; }));

                                        var r, numRectsToAdd = maxRectsInCurrentRow - row.length, prevRect;
                                        for(r = 0; r < numRectsToAdd; r++){
                                            var newRect;
                                            if(r == 0) {
                                                newRect = new DOMRect(rowsMinX - sampleRect.rect.width - spaceBetween, sampleRect.rect.y, sampleRect.rect.width, sampleRect.rect.height)
                                            } else {
                                                newRect = new DOMRect(prevRect.x - sampleRect.rect.width - spaceBetween, sampleRect.rect.y, sampleRect.rect.width, sampleRect.rect.height)
                                            }
                                            availableRectsFullRow.push(newRect);

                                            prevRect = newRect;
                                        }
                                    }
                                }


                            }

                            if(sortedRows.left.length != sortedRows.right.length) {

                                //if there are more rows on the left side than on the right, complete row on the right side
                                if(sortedRows.left.length > sortedRows.right.length && rectsOnRightSide != 0){

                                    var rowsToCreate = sortedRows.left.length - sortedRows.right.length;

                                    var i;
                                    for(i = sortedRows.right.length; i < sortedRows.left.length; i++) {
                                        var leftRow = sortedRows.left[i];
                                        var sampleRect = leftRow[0];

                                        var r, prevRect;
                                        for(r = 0; r < rectsOnRightSide; r++){
                                            var newRect;
                                            if(r == 0) {
                                                newRect = new DOMRect((elementToWrap.right - containerRect.left) + spaceBetween, sampleRect.rect.y, rectWidth, rectHeight)
                                            } else {
                                                newRect = new DOMRect(prevRect.x + prevRect.width + spaceBetween, sampleRect.rect.y, rectWidth, rectHeight)
                                            }

                                            availableRectsOnRight.push(newRect);

                                            prevRect = newRect;
                                        }

                                    }

                                } else if(sortedRows.right.length > sortedRows.left.length && rectsOnLeftSide != 0) {

                                    var rowsToCreate = sortedRows.right.length - sortedRows.left.length;

                                    var i;
                                    for(i = sortedRows.left.length; i < sortedRows.right.length; i++) {

                                        var rightRow = sortedRows.right[i];
                                        var sampleRect = rightRow[0];

                                        var r, prevRect;
                                        for(r = 0; r < rectsOnLeftSide; r++){
                                            var newRect;
                                            if(r == 0) {
                                                newRect = new DOMRect((elementToWrap.left - containerRect.left) - sampleRect.rect.width - spaceBetween, sampleRect.rect.y, sampleRect.rect.width, sampleRect.rect.height)
                                            } else {
                                                newRect = new DOMRect(prevRect.x - sampleRect.rect.width - spaceBetween, sampleRect.rect.y, sampleRect.rect.width, sampleRect.rect.height)
                                            }

                                            availableRectsOnLeft.push(newRect);

                                            prevRect = newRect;
                                        }

                                    }

                                }
                            }


                            var longerSide = availableRectsOnRight.length >= availableRectsOnLeft.length ? availableRectsOnRight : availableRectsOnLeft;
                            var shorterSide = availableRectsOnRight.length >= availableRectsOnLeft.length ? availableRectsOnLeft : availableRectsOnRight;

                            var alternatedArray = [];

                            var i, length = longerSide.length;
                            for (i = 0; i < length; i++) {
                                var sampleRect = longerSide[i];

                                var currentLeftRow = sortedRows.left.filter(function(r){
                                    return r[0].top == sampleRect.top ? true : false;
                                })[0];
                                var currentRightRow = sortedRows.right.filter(function(r){
                                    return r[0].top == sampleRect.top ? true : false;
                                })[0];

                                if(currentLeftRow != null && currentRightRow != null && currentLeftRow.length != 0 && currentRightRow.length != 0) {
                                    if(currentRightRow.length <= currentLeftRow.length) {
                                        if(availableRectsOnRight[i] != null) alternatedArray.push(availableRectsOnRight[i]);
                                        if(availableRectsOnLeft[i] != null) alternatedArray.push(availableRectsOnLeft[i]);
                                    } else {
                                        if(availableRectsOnLeft[i] != null) alternatedArray.push(availableRectsOnLeft[i]);
                                        if(availableRectsOnRight[i] != null) alternatedArray.push(availableRectsOnRight[i]);
                                    }
                                } else if(currentLeftRow == null && currentRightRow != null) {
                                    if(availableRectsOnLeft[i] != null) alternatedArray.push(availableRectsOnLeft[i]);
                                    if(availableRectsOnRight[i] != null) alternatedArray.push(availableRectsOnRight[i]);
                                } else if(currentLeftRow != null && currentRightRow == null) {
                                    if(availableRectsOnRight[i] != null) alternatedArray.push(availableRectsOnRight[i]);
                                    if(availableRectsOnLeft[i] != null) alternatedArray.push(availableRectsOnLeft[i]);
                                }

                            }

                            availableRects = availableRects.concat(alternatedArray);
                            availableRects = availableRects.concat(availableRectsFullRow);
                            return availableRects;
                        }

                        var createNewRows = function(numRectsToAdd, rows, availableRects) {
                            log('minimizedOrMaximizedScreenGrid: createNewRows')
                            // var containerRect = container == document.body ? new DOMRect(0, 0, window.innerWidth, window.innerHeight) : container.getBoundingClientRect();
                            var parentWidth = containerRect.width;
                            var parentHeight = containerRect.height;

                            var align = getControlsAlign();

                            var gridParams = getRectsGridParams(align);
                            var rectsOnLeftSide = gridParams.rectsOnLeftSide;
                            var rectsOnRightSide = gridParams.rectsOnRightSide;
                            var numOfRowsAlongWrapEl = gridParams.numOfRowsAlongWrapEl;
                            var perRow = gridParams.rectsPerRow;

                            var minX = Math.min.apply(Math, currentRects.map(function(o) { return o.x; }));
                            var maxX = Math.max.apply(Math, currentRects.map(function(o) { return o.x+o.width; }));
                            var maxWidth = maxX - minX;
                            var minY = currentRects.length == 0 ? parentHeight : Math.min.apply(Math, currentRects.map(function(o) { return o.y; }));
                            var maxY = Math.max.apply(Math, currentRects.map(function(o) { return o.y; }));

                            var newRects = [];

                            var craeteRowsOnControlsSides = function(){
                                var startFrom, side;
                                var minLeftY, minRightY, maxLeftY, maxRightY;

                                var figureOutCoordsonLeft = function() {
                                    if(rows.left.length != 0) {
                                        var allrects = [];
                                        for(var l in rows.left) {
                                            allrects = allrects.concat(rows.left[l])
                                        }
                                        minLeftY = Math.min.apply(Math, allrects.map(function(o) { return o.top; }));
                                        maxLeftY = Math.max.apply(Math, allrects.map(function(o) { return o.top; }));
                                    } else {
                                        if(align == 'bottom' || align == 'bottomleft' || align == 'bottomright' || align == 'bottom-full') {
                                            minLeftY = maxLeftY = parentHeight;
                                        } else if (align == 'top' || align == 'topleft' || align == 'topright' || align == 'top-full') {
                                            minLeftY = maxLeftY = (0 - rectHeight);
                                        }
                                    }
                                }

                                var figureOutCoordsonRight = function() {
                                    if(rows.right.length != 0) {

                                        var allrects = [];
                                        for(var l in rows.right) {
                                            allrects = allrects.concat(rows.right[l])
                                        }
                                        minRightY = Math.min.apply(Math, allrects.map(function(o) { return o.top; }));
                                        maxRightY = Math.max.apply(Math, allrects.map(function(o) { return o.top; }));
                                    } else {

                                        if(align == 'bottom' || align == 'bottomleft' || align == 'bottomright' || align == 'bottom-full') {
                                            minRightY = maxRightY = parentHeight;
                                        } else if (align == 'top' || align == 'topleft' || align == 'topright' || align == 'top-full') {
                                            minRightY = maxRightY = (0 - rectHeight);
                                        }

                                    }
                                }

                                if(rows.left.length == rows.right.length && rows.right.length != 0) {
                                    figureOutCoordsonRight();
                                    figureOutCoordsonLeft();
                                    startFrom = side = 'right';

                                } else if (rectsOnRightSide != 0 && rectsOnLeftSide != 0) {
                                    figureOutCoordsonRight();
                                    figureOutCoordsonLeft();

                                    if (rows.right.length < rows.left.length) {
                                        startFrom = side = 'right';
                                    } else if (rows.left.length < rows.right.length) {
                                        startFrom = side = 'left';
                                    } else {
                                        startFrom = side = 'right';
                                    }
                                } else if (rectsOnLeftSide != 0) {
                                    figureOutCoordsonLeft();

                                    startFrom = side = 'left';
                                } else if (rectsOnRightSide != 0) {
                                    figureOutCoordsonRight();

                                    startFrom = side = 'right';
                                } else {

                                }

                                var numOfRowsAlongWrapEl = gridParams.numOfRowsAlongWrapEl, rectsToTheTopOnLeft = 0, rectsToTheTopOnRight = 0;

                                if(align == 'bottom' || align == 'bottomleft' || align == 'bottomright') {
                                    if (minLeftY) rectsToTheTopOnLeft = Math.ceil((minLeftY - elementToWrap.top  + spaceBetween) / (rectHeight + spaceBetween));
                                    if (minRightY) rectsToTheTopOnRight = Math.ceil((minRightY - elementToWrap.top + spaceBetween) / (rectHeight + spaceBetween));

                                    /*if(minY < containerRect.bottom - elementToWrap.top) {
                                        numOfRowsAlongWrapEl = 0;
                                        rectsToTheTopOnLeft = 0;
                                        rectsToTheTopOnRight = 0;
                                    }*/

                                } else if (align == 'top' || align == 'topleft' || align == 'topright') {

                                    if(maxLeftY) rectsToTheTopOnLeft = Math.ceil(((elementToWrap.top + elementToWrap.height) - (maxLeftY + rectHeight) + spaceBetween) / (rectHeight + spaceBetween));
                                    if(maxRightY) rectsToTheTopOnRight = Math.ceil(((elementToWrap.top + elementToWrap.height) - (maxRightY + rectHeight) + spaceBetween) / (rectHeight + spaceBetween));

                                    /*if(minY < elementToWrap.top - containerRect.top) {
                                        log('addAndUpdate createNewRows craeteRowsOnControlsSides if 123');

                                        numOfRowsAlongWrapEl = 0;
                                        rectsToTheTopOnLeft = 0;
                                        rectsToTheTopOnRight = 0;
                                    }*/
                                }

                                /*var count = numRectsToAdd;
                                var totalRectsOnLeftSide = gridParams.rectsOnLeftSide * gridParams.numOfRowsAlongWrapEl;
                                var totalRectsOnRightSide = gridParams.rectsOnRightSide * gridParams.numOfRowsAlongWrapEl;
                                var totalRectsOnSides = totalRectsOnLeftSide + totalRectsOnRightSide;*/

                                var count = numRectsToAdd;
                                var totalRectsOnLeftSide = rectsToTheTopOnLeft * numOfRowsAlongWrapEl;
                                var totalRectsOnRightSide = rectsToTheTopOnRight * numOfRowsAlongWrapEl;
                                var totalRectsOnSides = totalRectsOnLeftSide + totalRectsOnRightSide;

                                if(count < totalRectsOnSides) totalRectsOnSides = count;

                                var rects = [];
                                var currentRowRects = [];

                                /*if(maximized) {
                                    count = totalRectsOnSides = count - 1;
                                }*/

                                var leftSideCounter = 0;
                                var rightSideCounter = 0;
                                var createNewRowOnLeft = false;
                                var createNewRowOnRight = false;
                                var i, x, y, prevRect, latestLeftRect, latestRightRect;
                                for (i = 0; i < totalRectsOnSides; i++) {
                                    if(side == "right") {

                                        if(latestRightRect) prevRect = latestRightRect
                                        if(rightSideCounter >= 1) {

                                            y = prevRect.y;
                                            x = prevRect.x + (rectWidth + spaceBetween);

                                        } else if(createNewRowOnRight) {

                                            if(align == 'bottom' || align == 'bottomleft' || align == 'bottomright') {
                                                y = prevRect.y - (rectHeight + spaceBetween);
                                            } else if (align == 'top' || align == 'topleft' || align == 'topright') {
                                                y = prevRect.y + prevRect.height + spaceBetween;
                                            }

                                            if(align == 'bottomleft' || align == 'bottomright' || align == 'topleft' || align == 'topright') {
                                                x = startFrom == 'right' ? parentWidth / 2 - rectWidth / 2 : latestLeftRect.left + rectWidth + spaceBetween;
                                            } else {
                                                var allRects = currentRowRects;
                                                for (var a in rects) {
                                                    allRects = allRects.concat(rects[a]);
                                                }
                                                x = allRects.filter(function(rect){
                                                    return rect.side == 'right';
                                                }).reduce(function(prev, current) {
                                                    return (prev.rect.x < current.rect.x) ? prev : current;
                                                }).rect.x
                                            }

                                            createNewRowOnRight = false;
                                        } else {

                                            if(align == 'bottom' || align == 'bottomleft' || align == 'bottomright') {
                                                y = minRightY - (rectHeight + spaceBetween);
                                            } else if (align == 'top' || align == 'topleft' || align == 'topright') {
                                                y = maxRightY + rectHeight + spaceBetween;
                                            }

                                            if(align == 'bottomleft' || align == 'bottomright' || align == 'topleft' || align == 'topright') {
                                                x = startFrom == 'right' ? parentWidth / 2 - rectWidth / 2 : latestLeftRect.left + rectWidth + spaceBetween;
                                            } else {
                                                x = ((elementToWrap.left - containerRect.left) + elementToWrap.width + spaceBetween);
                                            }

                                        }

                                        rightSideCounter++;

                                        if(rightSideCounter == rectsOnRightSide) {
                                            createNewRowOnRight = true;
                                            rightSideCounter = 0;
                                        }
                                        if (totalRectsOnLeftSide != 0) {
                                            if (rectsOnLeftSide == rectsOnRightSide) {
                                                side = 'left';
                                            } else if (rectsOnLeftSide != rectsOnRightSide && !createNewRowOnLeft) {
                                                side = 'left';
                                            } else if (rectsOnLeftSide != rectsOnRightSide && createNewRowOnLeft && createNewRowOnRight) {
                                                side = 'left';
                                            }

                                        }
                                        var rect = latestRightRect = new DOMRect(x, y, rectWidth, rectHeight);
                                        currentRowRects.push({side:'right', rect: rect});

                                    } else if(side == "left") {

                                        if(latestLeftRect) prevRect = latestLeftRect;

                                        if(leftSideCounter >= 1 ) {

                                            y = prevRect.y;
                                            x = prevRect.x - (rectWidth + spaceBetween);

                                        } else if(createNewRowOnLeft) {

                                            if(align == 'bottom' || align == 'bottomleft' || align == 'bottomright') {
                                                y = prevRect.y - (rectHeight + spaceBetween);
                                            } else if (align == 'top' || align == 'topleft' || align == 'topright') {
                                                y = prevRect.y + (rectHeight + spaceBetween);
                                            }

                                            if(align == 'bottomleft' || align == 'bottomright' || align == 'topleft' || align == 'topright') {
                                                x = startFrom == 'left' ? parentWidth / 2 - rectWidth / 2 : latestRightRect.left - rectWidth - spaceBetween;
                                            } else {
                                                var allRects = currentRowRects;
                                                for (var a in rects) {
                                                    allRects = allRects.concat(rects[a]);
                                                }
                                                x = allRects.filter(function(rect){
                                                    return rect.side == 'left';
                                                }).reduce(function(prev, current) {
                                                    return (prev.rect.x > current.rect.x) ? prev : current;
                                                }).rect.x;
                                            }

                                            createNewRowOnLeft = false;
                                        } else {

                                            if(align == 'bottom' || align == 'bottomleft' || align == 'bottomright') {
                                                y = minLeftY - (rectHeight + spaceBetween);
                                            } else if (align == 'top' || align == 'topleft' || align == 'topright') {
                                                y = maxLeftY + rectHeight + spaceBetween;
                                            }

                                            if(align == 'bottomleft' || align == 'bottomright' || align == 'topleft' || align == 'topright') {
                                                x = startFrom == 'left' ? parentWidth / 2 - rectWidth / 2 : latestRightRect.left - rectWidth - spaceBetween;
                                            } else {
                                                x = ((elementToWrap.left - containerRect.left) - (rectWidth + spaceBetween));
                                            }
                                        }

                                        leftSideCounter++;

                                        if(leftSideCounter == rectsOnLeftSide) {
                                            createNewRowOnLeft = true;
                                            leftSideCounter = 0;
                                        }

                                        if (totalRectsOnRightSide != 0) {
                                            if (rectsOnLeftSide == rectsOnRightSide) {
                                                side = 'right';
                                            } else if (rectsOnLeftSide != rectsOnRightSide && !createNewRowOnRight) {
                                                side = 'right';
                                            } else if (rectsOnLeftSide != rectsOnRightSide && createNewRowOnLeft && createNewRowOnRight) {
                                                side = 'right';
                                            }
                                        }

                                        var rect = latestLeftRect = new DOMRect(x, y, rectWidth, rectHeight);
                                        currentRowRects.push({side:'left', rect: rect});


                                    }

                                    if(i == perRow - 1 || i == totalRectsOnSides - 1) {
                                        rects.push(currentRowRects);
                                        currentRowRects = [];
                                    }

                                    count = count - 1;
                                }


                                var arr = [];
                                for(var i in rects){
                                    arr = arr.concat(rects[i]);
                                }

                                return arr.map(function(rectObj){
                                    return rectObj.rect;
                                });
                            }

                            var createFullRows = function(count) {
                                log('minimizedOrMaximizedScreenGrid: createFullRows')
                                var allRects = currentRects.concat(newRects).concat(availableRects);
                                var minX, maxX, rectsNum;
                                if(align == 'top' || align == 'bottom') {

                                    var minX = allRects.length != 0 ? Math.min.apply(Math, allRects.map(function(o) { return o.x; })) : 0;
                                    var maxX = allRects.length != 0 ? Math.max.apply(Math, allRects.map(function(o) { return o.x+o.width; })) : 0;
                        
                                    if(minX > (elementToWrap.left - containerRect.left)) minX = (elementToWrap.left - containerRect.left) + spaceBetween;
                                    if(maxX < (elementToWrap.left - containerRect.left)) maxX = (elementToWrap.left - containerRect.left) + elementToWrap.width;

                                    rectsNum = Math.ceil((maxX-minX)/(rectWidth + spaceBetween));
                                    rectWidth = ((maxX-minX)-(spaceBetween*(rectsNum-1)))/rectsNum;


                                } else if (align == 'bottomleft' || align == 'topleft') {
                                    maxX =  parentWidth - spaceBetween;
                                    minX =  (elementToWrap.left - containerRect.left) + spaceBetween;
                                    rectsNum = Math.floor((maxX-minX)/(rectWidth + spaceBetween));

                                } else if (align == 'bottomright' || align == 'topright') {
                                    maxX = (elementToWrap.left - containerRect.left) - spaceBetween;
                                    minX = spaceBetween;
                                    rectsNum = Math.floor((maxX-minX)/(rectWidth + spaceBetween));
                                } else {
                                    maxX = parentWidth - spaceBetween;
                                    minX = spaceBetween;
                                    rectsNum = Math.floor((maxX-minX)/(rectWidth + spaceBetween));
                                }

                                var minY, maxY;
                                if (align == 'top-full') {
                                    minY = allRects.length != 0 ? Math.min.apply(Math, allRects.map(function(o) { return o.y; })) : 0;
                                    maxY = allRects.length != 0 ? Math.max.apply(Math, allRects.map(function(o) { return o.y+o.height; })) : 0;
                                } else {
                                    minY = allRects.length != 0 ? Math.min.apply(Math, allRects.map(function(o) { return o.y; })) : 0;
                                    maxY = allRects.length != 0 ? Math.max.apply(Math, allRects.map(function(o) { return o.y; })) : 0;
                                }

                                var perRow = rectsNum;

                                var rects = []
                                var latestRect, createNewRow;
                                var isNextNewLast = false;
                                var rowItemCounter = 1;

                                var i;
                                for (i = 1; i <= count; i++) {
                                    //var firstRect = new DOMRect(size.parentWidth - (rectWidth + spaceBetween), size.parentHeight - (rectHeight + spaceBetween), rectWidth, rectHeight)
                                    var currentRow = isNextNewLast  ? perRow : Math.ceil(i/perRow);
                                    var isNextNewRow = rowItemCounter == perRow;
                                    isNextNewLast = isNextNewLast == true ? true : isNextNewRow && currentRow + 1 == perRow;

                                    var x,y
                                    if(rowItemCounter > 1) {
                                        y = latestRect.y;
                                        x = latestRect.x - (rectWidth + spaceBetween);
                                    } else if(createNewRow) {
                                        if(align == 'bottom' || align == 'bottomleft' || align == 'bottomright' || align == 'bottom-full') {
                                            y =  latestRect.y - (rectHeight + spaceBetween);
                                        } else if (align == 'top' || align == 'topleft' || align == 'topright' || align == 'top-full') {
                                            y =  latestRect.y + latestRect.height + spaceBetween;
                                        }
                                        x = maxX - rectWidth;
                                        createNewRow = false;
                                    } else {
                                        if(align == 'bottom' || align == 'bottomleft' || align == 'bottomright') {
                                            y = minY - (rectHeight + spaceBetween);
                                        } else if (align == 'top' || align == 'topleft' || align == 'topright') {
                                            y = maxY + rectHeight + spaceBetween;
                                        } else if (align == 'top-full'){
                                            y = maxY + spaceBetween;
                                        } else if (align == 'bottom-full'){
                                            y = minY - (rectHeight + spaceBetween);
                                        }
                                        x = maxX - rectWidth;
                                    }
                                    var rect = latestRect = new DOMRect(x, y, rectWidth, rectHeight);

                                    rects.push({side:null, rect: rect});

                                    if(rowItemCounter == perRow) {
                                        createNewRow = true;
                                        rowItemCounter = 1;
                                    } else rowItemCounter++;

                                }

                                return rects.map(function(rectObj){
                                    return rectObj.rect;
                                });
                            }

                            if((rows.left.length == numOfRowsAlongWrapEl && rows.right.length == numOfRowsAlongWrapEl)
                                || (rows.left.length == 0 && rows.right.length == numOfRowsAlongWrapEl)
                                || (rows.right.length == 0 && rows.left.length == numOfRowsAlongWrapEl)
                                || (rectsOnLeftSide == 0 && rectsOnRightSide == 0)) {

                                newRects = createFullRows(numRectsToAdd);

                            } else {

                                newRects = craeteRowsOnControlsSides();

                                if(newRects.length < numRectsToAdd) {
                                    newRects = newRects.concat(createFullRows(numRectsToAdd - newRects.length));
                                }

                            }

                            return newRects;
                        }

                        var rectsToAddNum = count - _layoutTool.currentRects.length;

                        var rows = getRectsRows();
                        var availableRects = getAvailableRects(rows);
                        log('minimizedOrMaximizedScreenGrid: rows', rows)
                        log('minimizedOrMaximizedScreenGrid: availableRects', availableRects)

                        var newRows;
                        if(rectsToAddNum > availableRects.length) {
                            rectsToAddNum = (rectsToAddNum - availableRects.length);
                            newRows = createNewRows(rectsToAddNum, rows, availableRects);
                            availableRects = availableRects.concat(newRows);
                        } else if(availableRects.length > rectsToAddNum) {
                            availableRects = availableRects.slice(0, rectsToAddNum);
                        }

                        //resultRects = alignFullRows(resultRects);

                        return availableRects;

                    }

                    function alignFullRows(elementRects) {
                        var groupBy = function(xs, key) {
                            var groupedRows = xs.reduce(function(rv, x) {
                                (rv[x[key]] = rv[x[key]] || []).unshift(x);
                                return rv;
                            }, {});

                            var groupedArray = [];
                            for (var property in groupedRows) {
                                if (groupedRows.hasOwnProperty(property)) {
                                    groupedArray.push(groupedRows[property]);
                                }
                            }

                            return groupedArray;
                        };

                        var sortByX = function compare( a, b ) {
                            if ( a.rect.left < b.rect.left ){
                                return -1;
                            }
                            if ( a.rect.left > b.rect.left ){
                                return 1;
                            }
                            return 0;
                        }

                        var fullRowsRects = [];
                        var i, count = elementRects.length;
                        for (i = 0; i < count; i++) {
                            var rect = elementRects[i];
                            if(rect.top + rect.height <= elementToWrap.top) {
                                fullRowsRects.push({indx: i, top: rect.top, rect: rect});
                            }
                        }

                        var fullWidthRows = groupBy(fullRowsRects, 'top');

                        var minX = Math.min.apply(Math, elementRects.map(function(o) { return o.x; }));
                        var maxX = Math.max.apply(Math, elementRects.map(function(o) { return o.x+o.width; }));

                        var i, rowCount = fullWidthRows.length;

                        for (i = 0; i < rowCount; i++) {
                            var row = fullWidthRows[i];
                            row.sort(sortByX);

                            var x, rectsCount = row.length, widthSum = 0;
                            for (x = 0; x < rectsCount; x++) {
                                let rect = row[x];
                                widthSum += rect.rect.width;
                            }
                            widthSum = widthSum + ((rectsCount - 1) * spaceBetween)


                            var newMinX = ((maxX - minX) / 2) - (widthSum / 2) + minX;

                            let prevRect = null;
                            for (let r = 0; r < row.length; r++) {


                                if(r != 0) {
                                    elementRects[row[r].indx].x = prevRect.x + prevRect.width + spaceBetween;
                                } else {
                                    elementRects[row[r].indx].x = newMinX;
                                }

                                prevRect = elementRects[row[r].indx];
                            }

                        }

                        return elementRects;
                    };

                    function compareLayoutStates(prevRects, newRects) {
                        log('minimizedOrMaximizedScreenGrid: compareLayoutStates')
                        var diffEls = [];
                        var count = prevRects.length;

                        var findInCurrentLayout = function (prevLayoutRect) {

                            var count = newRects.length;
                            for (var c = 0; c < count; c++) {

                                var diffTop = Math.abs(prevLayoutRect.top - newRects[c].top);
                                var diffLeft = Math.abs(prevLayoutRect.left - newRects[c].left);

                                if((diffTop + diffLeft) / 2 < 2) {
                                    return true;
                                }
                            }

                            return false;
                        }

                        for (let i = 0; i < count; i++) {
                            var prevLayoutRect = new DOMRect(prevRects[i].x, prevRects[i].y, prevRects[i].width, prevRects[i].height);
                            if(!findInCurrentLayout(prevLayoutRect)) {

                                diffEls.push(prevLayoutRect);
                            }
                        }

                        return diffEls;
                    }

                    function changeRectPosition(oldRect, newRect, rects) {
                        var i, count = rects.length;
                        for (i = 0; i < count; i++) {
                            if(oldRect.top == rects[i].top && oldRect.left == rects[i].left) {
                                rects[i] = newRect;
                                break;
                            }
                        }
                        return rects;
                    }

                    function findClosest(diffRect, rects) {
                        if(!diffRect) return null;
                        var closestOnTop = findClosesVerticallyRect(diffRect, rects);

                        if(closestOnTop != null) {
                            return closestOnTop
                        } else {
                            var closestOnSide = findClosesHorizontalyRect(diffRect, rects);

                            if(closestOnSide != null) {
                                return closestOnSide;
                            }
                        }
                        return null;
                    }



                    function findClosesVerticallyRect(rect, rects) {
                        log('minimizedOrMaximizedScreenGrid: findClosesVerticallyRect')
                        var distance = function (x1,y1,x2,y2) {
                            return Math.sqrt(Math.pow(x2-x1,2)+Math.pow(y2-y1,2));
                        }

                        var align = getControlsAlign();

                        var nextRow;
                        if(align == 'bottom' || align == 'bottomleft' || align == 'bottomright' || align == 'bottom-full') {
                            nextRow = rects.filter(function (r) {
                                if (r.top < rect.top) return true;
                                return false;
                            })

                        } else if (align == 'top' || align == 'topleft' || align == 'topright' || align == 'top-full') {
                            nextRow = rects.filter(function (r) {
                                if (r.top > rect.top) return true;
                                return false;
                            })
                        }

                        if(nextRow.length != 0) {
                            var isRowFull
                            if(align == 'bottom') {
                                isRowFull = nextRow[0].top + nextRow[0].height < (elementToWrap.top - containerRect.top);

                            } else if (align == 'top') {
                                isRowFull = nextRow[0].top > (elementToWrap.top - containerRect.top);
                            } else {
                                isRowFull = true;
                            }

                            var closestVerticaly;
                            closestVerticaly = nextRow.reduce(function (prev, current) {
                                return (distance(current.left, current.top + current.height, rect.left, rect.top + rect.height) < distance(prev.left, prev.top + prev.height, rect.left, rect.top + rect.height)) ? current : prev;
                                //return (Math.abs((current.left + current.width / 2) -  Math.abs(rect.left + rect.width / 2)) <  Math.abs((prev.left + prev.width / 2) - Math.abs(rect.left + rect.width / 2))) ? current : prev;
                            })



                            if ((!isRowFull && Math.sign(90 - Math.abs((closestVerticaly.left + 90) - (rect.left + 90))) >= 0) || isRowFull) {
                                return closestVerticaly;
                            } else {
                                return null;
                            }
                        } else {
                            return null;
                        }
                    }

                    function findClosesHorizontalyRect(rect, rects) {
                        log('minimizedOrMaximizedScreenGrid: findClosesHorizontalyRect')
                        var distance = function (x1,y1,x2,y2) {
                            return Math.sqrt(Math.pow(x2-x1,2)+Math.pow(y2-y1,2));
                        }

                        var align = getControlsAlign();

                        var isRowFull
                        if(align == 'bottom') {
                            isRowFull = rect.top + rect.height < (elementToWrap.top - containerRect.top);

                        } else if (align == 'top') {
                            isRowFull = rect.top > (elementToWrap.top - containerRect.top) + elementToWrap.height;
                        } else {
                            isRowFull = true;
                        }

                        var currentRowRect;
                        if(isRowFull) {
                            currentRowRect = rects.filter(function (r) {
                                if (r.top == rect.top && r.left < rect.left) {
                                    return true
                                }
                                return false;
                            })
                        } else if(rect.left <= elementToWrap.left) {
                            currentRowRect = rects.filter(function (r) {
                                if (r.top == rect.top && r.left < rect.left && rect.left < (elementToWrap.left - containerRect.left)) {
                                    return true
                                }
                                return false;
                            })
                        } else {
                            currentRowRect = rects.filter(function (r) {
                                if (r.top == rect.top && r.left > rect.left && rect.left > (elementToWrap.left - containerRect.left)) {
                                    return true
                                }
                                return false;
                            })
                        }

                        if(currentRowRect.length != 0) {
                            var closestHorizontaly = currentRowRect.reduce(function (prev, current) {
                                return (distance(current.left, current.top + 90, rect.left, rect.top + 90) < distance(prev.left, prev.top + 90, rect.left, rect.top + 90)) ? current : prev;
                                //return (90 - Math.abs((current.left+90) - (rect.left+90)) > 90 - Math.abs((prev.left+90) - (rect.left+90))) ? current : prev;
                            })

                            return closestHorizontaly;
                        }

                        return null;
                        /*for (var i = 0; i < count; i++) {
                            var rect = newRects[i];
                            if(rect.top + rect.height )
                        }*/
                    }

                    function fillFreeSpaceWithClosestRects(spaceToFill, rects, skipRects) {
                        var closest;
                        if(skipRects != null) {
                            closest = findClosest(spaceToFill, rects.filter(function(o, i) {
                                var exclude = false;
                                for(let r in skipRects) {
                                    if(skipRects[r].x == o.x && skipRects[r].y == o.y
                                        && skipRects[r].width == o.width  && skipRects[r].height == o.height) {

                                        exclude = true;
                                        break;
                                    }
                                }

                                return (exclude == false ? true : false);
                            }));
                        } else {
                            closest = findClosest(spaceToFill, rects);
                        }

                        if(closest != null) {
                            changeRectPosition(closest, spaceToFill, rects);
                            return fillFreeSpaceWithClosestRects(closest, rects, (activeScreenRect ? [activeScreenRect] : null));
                        } else {
                            //rects = alignFullRows(rects);
                            return rects;
                        }
                    }

                    function removeAndUpdate() {
                        log('minimizedOrMaximizedScreenGrid: removeAndUpdate')
                        var count = roomScreens.length;

                        var elementRects = [];

                        var currentlyMaximizedElIndex;
                        for (let i = 0; i < count; i++) {
                            var screen = roomScreens[i];
                            if(screen == activeScreen) currentlyMaximizedElIndex = i;
                            var screenRect = screen.screenEl.getBoundingClientRect();
                            if(_roomsMedia.contains(screen.screenEl)) elementRects.push(screenRect);
                        }

                        var actualLayoutRects = []
                        for(var i = 0; i < _layoutTool.state.currentMappedRects.length; i++) {
                            if(_roomsMedia.contains(_layoutTool.state.currentMappedRects[i].el) ) {
                                actualLayoutRects.push(_layoutTool.state.currentMappedRects[i].rect);
                            }
                        }

                        var diff = compareLayoutStates(_layoutTool.basicGridRects, actualLayoutRects);

                        var resultLayoutRects;

                        if(diff.length != 0) {
                            for(var s in diff) {
                                resultLayoutRects = fillFreeSpaceWithClosestRects(diff[s], actualLayoutRects, (activeScreenRect ? [activeScreenRect] : null));
                            }
                        } else resultLayoutRects = elementRects;


                        return resultLayoutRects;
                    }
                },
                squaresGrid: function (container, count) {
                    if(roomScreens.length == 0) return;

                    var defaultSide = 'top-full';

                    var containerRect = container.constructor.name != 'DOMRect' ? container.getBoundingClientRect() : container;
                    var parentWidth = containerRect.width;
                    var parentHeight = containerRect.height;
                    var startFromX = container.constructor.name == 'DOMRect' ? container.x : 0;
                    var startFromY = container.constructor.name == 'DOMRect' ? container.y : 0;

                    _layoutTool.state.currentGenerator = 'squaresGrid';

                    if(_layoutTool.currentRects.length == 0) {
                        _layoutTool.currentRects = build(container, count);
                    } else {

                        if(count > _layoutTool.currentRects.length) {
                            _layoutTool.basicGridRects = build(container, count);
                            //var availableRects = addAndUpdate(container, count);
                            //_layoutTool.currentRects = _layoutTool.basicGridRects = _layoutTool.currentRects.concat(availableRects);
                            let numOfEls = _layoutTool.basicGridRects.length - _layoutTool.currentRects.length;
                            let last = _layoutTool.basicGridRects.slice(Math.max(_layoutTool.basicGridRects.length - numOfEls, 0))

                            let updatedRects = updateRealToBasicGrid();
                            _layoutTool.currentRects = updatedRects.concat(last);

                        } else if(count < _layoutTool.currentRects.length) {
                            _layoutTool.basicGridRects = build(container, count);
                            _layoutTool.currentRects = updateRealToBasicGrid();
                            //_layoutTool.currentRects = removeAndUpdate();
                        }
                    }

                    return  _layoutTool.currentRects;

                    function getLayoutType() {
                        return defaultSide;
                    }

                    function build(container, count) {
                        if(count == 1) {
                            return buildGrid(container, count, 1)
                        } else if(count == 2) {
                            return buildGrid(container, count, 2)
                        } else if(count == 3 ) {

                            var first = buildGrid(container, 1, 1)
                            var second = buildGrid(container, count - 1, 2, first)
                            return first.concat(second);

                        } else if(count == 4) {

                            return buildGrid(container, count, 2)

                        } else/* if(count == 2 || count == 3 || count == 4 || count == 6) */{

                            return buildGrid(container, count, 2)

                        }


                    }

                    function buildGrid(container, count, perRow, existingRects) {
                        var align = getLayoutType();

                        var rectWidth = 90;
                        var rectHeight = 90;
                        var spaceBetween = 5;

                        if(perRow == 1) {
                            rectWidth = parentWidth - (spaceBetween * 2);
                            rectHeight = (rectWidth / 16) * 9;
                        } else if(perRow == 2) {
                            rectWidth = (parentWidth - (spaceBetween * (perRow + 1))) / 2;
                            rectHeight = rectWidth / 4 * 3;
                        } else if(perRow == 3) {
                            rectWidth = (parentWidth - (spaceBetween * (perRow + 1))) / 3;
                            rectHeight = rectWidth / 4 * 3;
                        } else {
                            rectWidth = (parentWidth - (spaceBetween * (perRow + 1))) / perRow;
                            rectHeight = rectWidth / 4 * 3;
                        }

                        var rects = [];

                        var arr = [];
                        for(var i in rects){
                            arr = arr.concat(rects[i]);
                        }
                        rects = arr;

                        var minX, maxX, minY, maxY;
                        if(existingRects != null) {
                            minX = Math.min.apply(Math, existingRects.map(function(o) { return o.x; }));
                            maxX = Math.max.apply(Math, existingRects.map(function(o) { return o.x+o.width; }));
                            minY = Math.min.apply(Math, existingRects.map(function(o) { return o.y; }));
                            maxY = Math.max.apply(Math, existingRects.map(function(o) { return o.y + o.height; }));
                        } else {
                            minX = startFromX + spaceBetween;
                            maxX = parentWidth;
                            minY = startFromY + spaceBetween;
                            maxY = spaceBetween;
                        }

                        var latestRect;
                        var isNextNewLast = false;
                        var rowItemCounter = 1;
                        var i;
                        for (i = 1; i <= count; i++) {
                            //var firstRect = new DOMRect(size.parentWidth - (rectWidth + spaceBetween), size.parentHeight - (rectHeight + spaceBetween), rectWidth, rectHeight)
                            if(latestRect != null) var prevRect = latestRect;
                            var currentRow = isNextNewLast  ? perRow : Math.ceil(i/perRow);
                            var isNextNewRow  = rowItemCounter  == perRow;
                            isNextNewLast = isNextNewLast == true ? true : isNextNewRow && currentRow + 1 == perRow;

                            var x,y
                            if(rowItemCounter > 1 && prevRect) {
                                y = prevRect.y;
                                x = prevRect.x + (rectWidth + spaceBetween);
                            } else {
                                if (align == 'top-full'){
                                    x = minX;
                                    var startY = prevRect != null ? prevRect.y  + rectHeight + spaceBetween : maxY + spaceBetween;
                                    y = startY;
                                } else if (align == 'bottom-full'){
                                    var startY = prevRect != null ? prevRect.y : parentHeight;
                                    y = startY - (rectHeight + spaceBetween);
                                    x = minX;
                                }
                            }
                            if(i == count && rowItemCounter != perRow) {
                                x = startFromX + ((parentWidth / 2) - (rectWidth / 2))
                            }
                            var rect = latestRect = new DOMRect(x, y, rectWidth, rectHeight);

                            rects.push({side:null, rect: rect});

                            if(rowItemCounter == perRow) {
                                rowItemCounter = 1;
                            } else rowItemCounter++;
                        }

                        rects = rects.map(function(rectObj){
                            return rectObj.rect;
                        });

                        //return alignFullRows(rects)
                        return rects;
                    }

                    function updateRealToBasicGrid() {

                        var actualLayoutRects = []
                        for(var i = 0; i < _layoutTool.state.currentMappedRects.length; i++) {
                            if(_roomsMedia.contains(_layoutTool.state.currentMappedRects[i].el) ) {
                                actualLayoutRects.push({
                                    key: actualLayoutRects.length,
                                    rect: _layoutTool.state.currentMappedRects[i].rect
                                });
                            }
                        }

                        let actualLayoutRectsClone = [...actualLayoutRects];

                        for(let r in _layoutTool.basicGridRects) {
                            let rect = _layoutTool.basicGridRects[r];

                            let closestIndex = closest(rect, actualLayoutRectsClone);

                            if(closestIndex == null) continue;

                            actualLayoutRects[closestIndex].rect.x = rect.x;
                            actualLayoutRects[closestIndex].rect.y = rect.y;
                            actualLayoutRects[closestIndex].rect.width = rect.width;
                            actualLayoutRects[closestIndex].rect.height = rect.height;
                            //rectsToSkip.push(closestIndex);

                            for(let c in actualLayoutRectsClone) {
                                if(actualLayoutRectsClone[c].key == closestIndex) {
                                    actualLayoutRectsClone.splice(c, 1);
                                }

                            }
                        }

                        return actualLayoutRects.map(function (o) {
                            return o.rect;
                        })

                        function closest(rect, rects) {
                            var distance = function (x1,y1,x2,y2) {
                                return Math.sqrt(Math.pow(x2-x1,2)+Math.pow(y2-y1,2));
                            }

                            if(rects.length != 0) {

                                let closestRect = rects.reduce(function (prev, current, index) {
                                    return (distance(current.rect.left, current.rect.top + current.rect.height, rect.left, rect.top + rect.height) < distance(prev.rect.left, prev.rect.top + prev.rect.height, rect.left, rect.top + rect.height)) ? current : prev;
                                })

                                return closestRect.key;

                            } else {
                                return null;
                            }
                        }
                    }
                }
            }

            function removeScreensByParticipant(participant) {
                log('removeScreensByParticipant', participant, roomScreens.length);

                for(var i = roomScreens.length -1; i >= 0; i--){
                    if(roomScreens[i].participant != participant || roomScreens[i].participant.sid != participant.sid) continue;
                    log('removeScreensByParticipant remove', roomScreens[i]);

                    var screenEl = roomScreens[i].screenEl;
                    removeScreenFromCommonList(roomScreens[i]);
                    if(screenEl != null && screenEl.parentNode != null) screenEl.parentNode.removeChild(screenEl)
                }
            }

            function addScreenToCommonList(screen) {
                log('addScreenToCommonList');
                try {
                    var err = (new Error);
                    log(err.stack);
                } catch (e) {

                }
                screen.show();
                /*app.event.dispatch('screenAdded', {
                    screen: screen,
                    participant: screen.participant
                });*/
                if(_controlsTool && _controlsTool.participantsListTool) _controlsTool.participantsListTool.updateItem(screen.participant);
                updateLayout();

            }

            function removeScreenFromCommonList(screen, removeScreenEntirely) {
                log('removeScreenFromCommonList')
                try {
                    var err = (new Error);
                    log(err.stack);
                } catch (e) {

                }
                if(!removeScreenEntirely) {
                    screen.hide();
                } else {
                    screen.remove();
                }

                /*app.event.dispatch('screenRemoved', {
                    screen: screen,
                    participant: screen.participant
                });*/
                if(_controlsTool && _controlsTool.participantsListTool) _controlsTool.participantsListTool.updateItem(screen.participant);

                updateLayout();
            }


            //this function replaces video with avatar inside screen when video was muted/ended.
            //Usually we should ignore mute event for video of screensharing
            function onVideoMute(track, participant, shouldBeUnmuted, counter) {
                log('onVideoMute: START', track);

                //if mute event was triggered multiple times, we should cancel timout after which the video be changed to avatar
                //usually, track is muted multiple times when somebody shares screen/ browser's tab. If this tab has only static frame/content (without moving mouse or video in it),
                //then the track will constantly fire mute/unmute event every few seconds (Chrome, Safari). So we need to avoid constant switching user's screen 
                //content from video to avatar and back.
                if(!counter && track.muteTimer) {
                    clearTimeout(track.muteTimer);
                    track.muteTimer = null;
                }

                if(!counter && !track.screensharing) {
                    screensRendering.showLoader('videoMuted', {screen: track.parentScreen, participant: participant});
                }

                screensRendering.hideLoader('videoTrackLoaded', {screen: track.parentScreen, participant: participant});

                if(track.parentScreen == null || track.kind != 'video') return;

                if(track.parentScreen.activeScreenType == 'audio') {
                    track.parentScreen.fillAudioScreenWithAvatarOrVideo();
                    return;
                } 

                log('onVideoMute: screens.length',  participant.screens.length);
                let actionDone = false;
                if(participant.screens.length == 1 && !track.parentScreen.hasLiveTracks('video', shouldBeUnmuted)) {
                    log('onVideoMute: 1', track.stream.active, track.parentScreen.hasLiveTracks('video'), track.parentScreen.tracks);

                    track.parentScreen.fillVideoScreenWithAvatarOrVideo();
                    if (track.parentScreen.screensharing) {
                        log('onVideoMute: 1.3');
                        track.parentScreen.screensharing = false;
                    }
                    actionDone = true;
                   
                } else if(participant.screens.length > 1 && !track.parentScreen.hasLiveTracks('video', shouldBeUnmuted)) {
                    log('onVideoMute: 2');
                    removeScreenFromCommonList(track.parentScreen, true);
                    if(track.parentScreen.screensharing) {
                        log('onVideoMute: 2.1');
                        track.parentScreen.screensharing = false;
                    }
                    actionDone = true;
                }

                //for now Chrome (maybe other) do not change MediaStream's status to inactive right after track was stopped by remote side
                //so we need to check whether track is active after some time
                if(counter == null) {
                    counter = 0;
                }
                if(!actionDone && counter <= 10) {
                    log('onVideoMute: timer', track.screensharing);

                    track.muteTimer = setTimeout(function(){
                        onVideoMute(track, participant, !track.screensharing && counter > 5 ? true : false, counter + 1)                    
                    }, 1000);
                }
                
            }

            //Usually when video is muted, it is replaced by the user's avatar in its parent screen. So when video is UNmuted, we need to replace avatar
            //with video back
            function onVideoUnMute(track) {
                log('mediaStreamTrack unmuted 1', track, track.stream.active);

                if(track.unmuteTimer) {
                    clearTimeout(track.unmuteTimer);
                    track.unmuteTimer = null;
                }

                screensRendering.hideLoader('videoUnmuted', {screen: track.parentScreen, participant: track.participant});

                if(track.parentScreen == null) { // usually there should be parentScreen, so it's little chance this condition will happen
                    resumePlay();
                    return;
                }

                if(track.parentScreen.activeScreenType == 'audio') {
                    track.parentScreen.fillAudioScreenWithAvatarOrVideo();
                    return;
                } else {
                    track.parentScreen.fillVideoScreenWithAvatarOrVideo();
                }

                //probably (not sure) we need to append HTMLVideoElement to the DOM first (by calling fillVideo(Audio)ScreenWithAvatarOrVideo()) and then call .play() on it
                //otherwise it may not work
                resumePlay(track.screensharing ? true : false);

                function resumePlay(checkPeriodicallyUntilePlay) {
                    //The thing is that when video is muted, HTMLVideoElement is paused and when video is UNmuted, HTMLVideoElement will not resume playing automatically
                    //so we need to resume playing manually. In particular this bug happens when somebody shares browser's tab: when there is no dynamic image in this tab,
                    //video will constantly fire mute/unmute event every few seconds - this pauses video playback, so we need to resume it manually every time
                    if(track.trackEl && track.trackEl.paused) {
                        log('mediaStreamTrack unmuted play', track);
    
                        track.trackEl.play();
                        if (checkPeriodicallyUntilePlay) {
                            track.unmuteTimer = setTimeout(function () {
                                resumePlay(checkPeriodicallyUntilePlay);
                            }, 1000)
                        }
                    }
                }
            }

            function onVideoTrackLoaded(track) {
                log('onVideoTrackLoaded', track)
                if(track.parentScreen == null || track.kind != 'video') return;
                track.parentScreen.isActive = true;

                addScreenToCommonList(track.parentScreen);
                updateLayout();

                hideLoader('videoTrackLoaded', {screen: track.parentScreen, participant: track.parentScreen.participant});

                if(track.trackEl) {
                    fitScreenToVideo(track.trackEl, track.parentScreen);
                    track.play();
                }
            }

            function onScreensharingStarting(e) {
                let videoTracks = e.participant.videoTracks(true);
                if(videoTracks.length != 0) {
                    var screenForScreensharing = createRoomScreen(e.participant);
                    screenForScreensharing.screensharing = true;
                } else {
                    e.participant.screens[0].screensharing = true;
                }
            }

            function onSomeonesCameraEnabled(participant) {
                if(webrtcSignalingLib.limits && (webrtcSignalingLib.limits.audio || webrtcSignalingLib.limits.video)) {
                    for(let i in participant.screens) {
                        addScreenToCommonList(participant.screens[i]);
                    }
                }
            }

            function onSomeonesMicEnabled(participant) {
                if(webrtcSignalingLib.limits && (webrtcSignalingLib.limits.audio || webrtcSignalingLib.limits.video)) {
                    for(let i in participant.screens) {
                        addScreenToCommonList(participant.screens[i]);
                    }
                }
            }

            function onSomeonesCameraDisabled(participant) {
                if(!participant.localMediaControlsState.camera && !participant.localMediaControlsState.mic) {
                    for(let i in participant.screens) {
                        removeScreenFromCommonList(participant.screens[i]);
                    }
                }
            }

            function onSomeonesMicDisabled(participant) {
                if(!participant.localMediaControlsState.camera && !participant.localMediaControlsState.mic) {
                    for(let i in participant.screens) {
                        removeScreenFromCommonList(participant.screens[i]);
                    }
                }
            }

            function removeParticipantsScreens() {
                for(var i = roomScreens.length -1; i >= 0; i--){
                    var currentScreen = this;
                    var screen = roomScreens[i];
                    if(currentScreen != screen.participant) continue;
                    screen.isActive = false;
                    if(screen.screenEl && screen.screenEl.parentNode != null) screen.screenEl.parentNode.removeChild(screen.screenEl);
                    roomScreens.splice(i, 1);
                }
            }

            function getScreens(all) {
                if(all) {
                    return roomScreens;
                } else {
                    return roomScreens.filter(function (screen) {
                        return (screen.isActive == true);
                    });
                }
            }

            function layoutEvents() {
                return _layoutEvents;
            }
            function on(eventName, handler) {
                return _layoutEvents.on(eventName, handler);
            }

            return {
                setViewMode:setViewMode,
                updateLayout:updateLayout,
                removeScreensByParticipant:removeScreensByParticipant,
                removeScreenFromCommonList:removeScreenFromCommonList,
                addScreenToCommonList:addScreenToCommonList,
                onVideoMute:onVideoMute,
                onVideoUnMute:onVideoUnMute,
                onVideoTrackLoaded:onVideoTrackLoaded,
                onScreensharingStarting:onScreensharingStarting,
                onSomeonesCameraEnabled:onSomeonesCameraEnabled,
                onSomeonesMicEnabled:onSomeonesMicEnabled,
                onSomeonesCameraDisabled:onSomeonesCameraDisabled,
                onSomeonesMicDisabled:onSomeonesMicDisabled,
                onParticipantConnected:onParticipantConnected,
                onParticipantDisconnected:onParticipantDisconnected,
                getActiveViewMode:getActiveViewMode,
                getLoudestMode:getLoudestMode,
                getActiveSreen:getActiveSreen,
                getScreens:getScreens,
                layoutEvents:layoutEvents,
                on:on,
                createRoomScreen:createRoomScreen,
                removeParticipantsScreens:removeParticipantsScreens,
                videoTrackIsAdding:videoTrackIsAdding,
                newTrackAdded:newTrackAdded,
                fitScreenToVideo:fitScreenToVideo,
                toggleViewMode:toggleViewMode,
                updateLocalScreenClasses:updateLocalScreenClasses,
                disableLoudesScreenMode:disableLoudesScreenMode,
                showLoader:showLoader,
                hideLoader:hideLoader,
                switchScreensMode:switchScreensMode
            };
        })()

        /**
         * Bind Qbix stream events. Currentlt isn't in use.
         * @method bindStreamsEvents
         * @param {Object} [stream] stream that represents room
         */
        function bindStreamsEvents(stream) {
            log('bindStreamsEvents', stream)
            stream.onMessage('Streams/joined').set(function (message) {
                log('bindStreamsEvents: Streams/joined')

            });

            stream.onMessage('Streams/connected').set(function (message) {

            });

            stream.onMessage("Streams/left").set(function (message) {

            });

            stream.onMessage("Streams/closed").set(function (message) {

            });

            stream.onMessage("Media/webrtc/forceDisconnect").set(function (message) {
                log('bindStreamsEvents: Media/webrtc/forceDisconnect add', message);
                if(!module.isActive()) return;
                var message = JSON.parse(message.content);
                var roomParticipants = webrtcSignalingLib.roomParticipants();
                var localParticipant = webrtcSignalingLib.localParticipant();

                var userId = localParticipant.identity != null ? localParticipant.identity.split('\t')[0] : null;

                if(message.userId == userId) {
                    if(message.immediate === true) {
                        if(webrtcSignalingLib.initNegotiationState == 'ended') notice.show(message.msg || text.webrtc.notices.forceDisconnectingImmediately);
                        module.stop();
                    } else {
                        if(webrtcSignalingLib.initNegotiationState == 'ended') notice.show(message.msg || text.webrtc.notices.forceDisconnecting);

                        setTimeout(function () {
                            module.stop();
                        }, 5000);
                    }
                } else {
                    for(let p in roomParticipants) {
                        if(roomParticipants[p].isLocal) continue;
                        var platformId = roomParticipants[p].identity != null ? roomParticipants[p].identity.split('\t')[0] : null;
                        if(userId == platformId) {
                            roomParticipants[p].remove();
                        }
                    }
                }

            });

            stream.onMessage("Media/webrtc/globalPermissionsAdded").set(function (message) {
                var insturctions = JSON.parse(message.instructions);
                onGlobalPermissionAdded(insturctions)
            });

            stream.onMessage("Media/webrtc/globalPermissionsRemoved").set(function (message) {
                var insturctions = JSON.parse(message.instructions);
                onGlobalPermissionRemoved(insturctions)
            });

            stream.onMessage("Media/webrtc/personalPermissionsAdded").set(function (message) {
                var insturctions = JSON.parse(message.instructions);
                onPersonalPermissionAdded(insturctions)
            });

            stream.onMessage("Media/webrtc/personalPermissionsRemoved").set(function (message) {
                var insturctions = JSON.parse(message.instructions);
                onPersonalPermissionUpdated(insturctions)
            });

            stream.onMessage("Media/webrtc/makeCohost").set(function (message) {
                var insturctions = JSON.parse(message.instructions);
                onPersonalPermissionUpdated(insturctions)
            });

            stream.onMessage("Media/webrtc/resetPersonalPermissions").set(function (message) {
                var insturctions = JSON.parse(message.instructions);
                onPersonalPermissionUpdated(insturctions)
            });

            stream.onMessage("Media/webrtc/addOrRemoveCohost").set(function (message) {
                var insturctions = JSON.parse(message.instructions);
                onPersonalPermissionUpdated(insturctions)
            });

            function onGlobalPermissionAdded(insturctions) {
                let localParticipant = webrtcSignalingLib.localParticipant();
                if (!localParticipant.access.personalAccess) {
                    if (insturctions.permission == 'mic' && !localParticipant.hasPermission('mic')) {
                        notice.show('The host has allowed the use of a microphone in this room');
                    } else if (insturctions.permission == 'camera' && !localParticipant.hasPermission('camera')) {
                        notice.show('The host has allowed the use of a camera in this room');
                    } else if (insturctions.permission == 'screen' && !localParticipant.hasPermission('screen')) {
                        notice.show('The host has allowed the use of a screen sharing in this room');
                    }
                }

                var participants = webrtcSignalingLib.roomParticipants();
                for (let i = participants.length - 1; i >= 0; i--) {
                    if(participants[i].access.personalAccess || participants[i].access.isAdmin) {
                        continue;
                    }
                    participants[i].access = insturctions.access;
                }

            }

            function onGlobalPermissionRemoved(insturctions) {
                let localParticipant = webrtcSignalingLib.localParticipant();
                var participants = webrtcSignalingLib.roomParticipants();
                for (let i = participants.length - 1; i >= 0; i--) {
                    if(participants[i].access.personalAccess || participants[i].access.isAdmin) {
                        continue;
                    }
                    participants[i].access = insturctions.access;
                }

                if(insturctions.permission == 'mic' && !localParticipant.hasPermission('mic')) {
                    webrtcSignalingLib.localMediaControls.disableAudio();
                    notice.show('The host has restricted the use of the microphone in this room');
                } else if (insturctions.permission == 'camera' && !localParticipant.hasPermission('camera')) {
                    webrtcSignalingLib.localMediaControls.disableVideo('camera');
                    notice.show('The host has restricted the use of the camera in this room');
                } else if (insturctions.permission == 'screen' && !localParticipant.hasPermission('screen')) {
                    webrtcSignalingLib.screenSharing.stopShareScreen()
                    notice.show('The host has restricted the use of the screen sharing in this room');
                }
            }

            function onPersonalPermissionAdded(insturctions) {
                if(insturctions.ofUserId == Q.Users.loggedInUserId()) {
                    let localParticipant = webrtcSignalingLib.localParticipant();
                    localParticipant.access = insturctions.access;

                    if (insturctions.permission == 'mic' && localParticipant.hasPermission('mic')) {
                        notice.show('The host has allowed you to use the microphone in this room');
                    } else if (insturctions.permission == 'camera' && localParticipant.hasPermission('camera')) {
                        notice.show('The host has allowed you to use the camera in this room');
                    } else if (insturctions.permission == 'screen' && localParticipant.hasPermission('screen')) {
                        notice.show('The host has allowed you to share screen in this room');
                    }
                    return;
                }

                var participants = webrtcSignalingLib.roomParticipants();
                for (let i = participants.length - 1; i >= 0; i--) {
                    var userId = participants[i].identity != null ? participants[i].identity.split('\t')[0] : null;

                    if(insturctions.ofUserId != userId) {
                        continue;
                    }

                    participants[i].access = insturctions.access;
                }
            }

            function onPersonalPermissionUpdated(insturctions) {
                if (insturctions.ofUserId == Q.Users.loggedInUserId()) {
                    let localParticipant = webrtcSignalingLib.localParticipant();

                    let prevMicPermission = localParticipant.hasPermission('mic');
                    let prevCameraPermission = localParticipant.hasPermission('camera');
                    let prevScreenPermission = localParticipant.hasPermission('screen');

                    localParticipant.access = insturctions.access;

                    if (prevMicPermission == true && !localParticipant.hasPermission('mic')) {
                        webrtcSignalingLib.localMediaControls.disableAudio();
                        notice.show('The host has limited your ability to use the microphone in this room');
                    } else if (prevMicPermission == false && localParticipant.hasPermission('mic')) {
                        notice.show('The host has allowed you to use the microphone in this room');
                    }
                    if (prevCameraPermission == true && !localParticipant.hasPermission('camera')) {
                        webrtcSignalingLib.localMediaControls.disableVideo('camera');
                        notice.show('The host has limited your ability to use the camera in this room');
                    } else if (prevCameraPermission == false && localParticipant.hasPermission('camera')) {
                        notice.show('The host has allowed you to use the camera in this room');
                    }
                    if (prevScreenPermission == true && !localParticipant.hasPermission('screen')) {
                        webrtcSignalingLib.screenSharing.stopShareScreen()
                        notice.show('The host has limited your ability to share screen in this room');
                    } else if (prevScreenPermission == false && localParticipant.hasPermission('screen')) {
                        notice.show('The host has allowed you to share screen in this room');
                    }

                    return;
                }

                var participants = webrtcSignalingLib.roomParticipants();
                for (let i = participants.length - 1; i >= 0; i--) {
                    var userId = participants[i].identity != null ? participants[i].identity.split('\t')[0] : null;

                    if(insturctions.ofUserId != userId) {
                        continue;
                    }

                    participants[i].access = insturctions.access;

                    if (!participants[i].hasPermission('mic')) {
                        let audioTracks = participants[i].audioTracks();
                        for (let t = audioTracks.length - 1; t >= 0; t--) {
                            if(audioTracks[t].mediaStreamTrack) {
                                audioTracks[t].stop();
                            }
                        }
                    }
                    if (!participants[i].hasPermission('camera')) {
                        let videoTracks = participants[i].videoTracks();
                        for (let t = videoTracks.length - 1; t >= 0; t--) {
                            if(!videoTracks[t].screensharing && videoTracks[t].mediaStreamTrack) {
                                videoTracks[t].stop();
                            }
                        }
                    } 
                    if (!participants[i].hasPermission('screen')) {
                        let videoTracks = participants[i].videoTracks();
                        for (let t = videoTracks.length - 1; t >= 0; t--) {
                            if(videoTracks[t].screensharing && videoTracks[t].mediaStreamTrack) {
                                videoTracks[t].stop();
                            }
                        }
                    }
                }
            }
        }

        /**
         * Bind events that are triggered by WebRTC library (app.js)
         * @method bindConferenceEvents
         */
        function bindConferenceEvents(webrtcSignalingLib) {
            function setRealName(participant, callback) {
                var userId = participant.identity != null ? participant.identity.split('\t')[0] : null;

                if(userId != null){
                    var firstName;
                    var lastName;
                    var fullName = '';
                    Q.Streams.get(userId, 'Streams/user/firstName', function () {
                        if(!this || !this.fields) {
                            console.warn('Error while getting Streams/user/firstName');
                            return;
                        }
                        firstName = this.fields.content;
                        if(firstName != null) {
                            fullName += firstName;
                        }
                        try {
                            Q.Streams.get(userId, 'Streams/user/lastName', function () {
                                lastName = this.fields.content;

                                if(lastName != null) {
                                    fullName += ' ' + lastName;
                                }

                                participant.username = fullName;

                                if(callback != null) callback({firstName:firstName, lastName:lastName});
                            });
                        } catch (e) {
                            participant.username = fullName;
                            if(callback != null) callback({firstName:firstName, lastName:lastName});
                        }

                    });
                }
            }
            function setUserGreeting(participant, callback) {
                var userId = participant.identity != null ? participant.identity.split('\t')[0] : null;
                if(userId != null){
                    Q.Streams.get(userId, 'Streams/greeting/' + Q.Users.communityId, function () {
                        if(!this || !this.fields) {
                            console.warn('Error while getting Streams/user/firstName');
                            return;
                        }
                        participant.greeting = this.fields.content;
                    });
                }
            }

            function setUserAvatar(participant) {
                log('setUserAvatar', participant);
                var userId = participant.identity != null ? participant.identity.split('\t')[0] : null;

                if(userId != null){
                    Q.Streams.Avatar.get(userId, function (err, avatar) {
                        if (!avatar) {
                            return;
                        }

                        var size = Q.largestSize(Q.image.sizes['Users/icon']);
                        var src = Q.url(avatar.iconUrl(size));
                        if(src != null) {
                            var avatarImg = new Image();
                            avatarImg.src = src;
                            log('setUserAvatar set');

                            participant.avatar = {src:src, image:avatarImg};
                        }


                    });
                }
            }

            webrtcSignalingLib.event.on('log', function (params) {
                appDebug.logInfo(params, true);
            });

            webrtcSignalingLib.event.on('joined', function (participant) {
                if(document.querySelector('.Media_webrtc_instructions_dialog') == null) Q.Dialogs.pop();
                setRealName(participant);
                setUserAvatar(participant);
                setUserGreeting(participant);
                screensRendering.onParticipantConnected(participant);
            });

            webrtcSignalingLib.event.on('participantConnected', function (participant) {
                log('user joined',  participant);
                setRealName(participant, function(name){
                    if(webrtcSignalingLib.initNegotiationState == 'ended') notice.show(text.webrtc.notices.joining.interpolate({userName: name.firstName}));
                });
                setUserAvatar(participant);
                setUserGreeting(participant);
                screensRendering.onParticipantConnected(participant);

                if(webrtcSignalingLib.initNegotiationState == 'ended') {
                    log('play joined music');

                    if(Q.Audio.collection[_options.sounds.participantConnected]) {
                        log('play joined music 1', _options.sounds.participantConnected, this);
                        Q.Audio.collection[_options.sounds.participantConnected].audio.play()
                    } else {
                        Q.Audio.load(_options.sounds.participantConnected, function () {
                            log('play joined music 2', _options.sounds.participantConnected, this);

                            Q.Audio.collection[_options.sounds.participantConnected].audio.play()
                        });
                    }

                }

                //screensRendering.updateLayout();
            });
            webrtcSignalingLib.event.on('participantDisconnected', function (participant) {
                log('user disconnected',  participant);
                try {
                    var err = (new Error);
                    log(err.stack);
                } catch (e) {

                }
                var userId = participant.identity != null ? participant.identity.split('\t')[0] : null;


                if(userId != null){
                    Q.Streams.get(userId, 'Streams/user/firstName', function () {
                        if(!this || !this.fields) {
                            console.warn('Error while getting Streams/user/firstName');
                            return;
                        }
                        var firstName = this.fields.content;
                        notice.show(text.webrtc.notices.sbLeftRoom.interpolate({userName: firstName}));

                    });
                }

                for(let i in participant.voiceMeterTools) {
                    participant.voiceMeterTools[i].stop();
                }
                    
                if(Q.Audio.collection[_options.sounds.participantDisconnected]) {
                    log('play leave music 1', _options.sounds.participantDisconnected, this);
                    Q.Audio.collection[_options.sounds.participantDisconnected].audio.play()
                } else {
                    Q.Audio.load(_options.sounds.participantDisconnected, function () {
                        log('play leave music 2', _options.sounds.participantDisconnected, this);
                        Q.Audio.collection[_options.sounds.participantDisconnected].audio.play()
                    });
                }

                screensRendering.onParticipantDisconnected(participant);

                screensRendering.updateLayout();
            });
            webrtcSignalingLib.event.on('localParticipantDisconnected', function (participant) {
                log('you left the room')
                notice.show(Q.getObject("webrtc.notices.youLeftRoom", text));
                screensRendering.updateLayout();
                for(let i in participant.voiceMeterTools) {
                    participant.voiceMeterTools[i].stop();
                }
            });
            webrtcSignalingLib.event.on('participantRemoved', function (participant) {
                log('you left the room')
                //screensRendering.removeParticipantsScreens();
                screensRendering.onParticipantDisconnected(participant);
                for(let i in participant.voiceMeterTools) {
                    participant.voiceMeterTools[i].stop();
                }
            });

            webrtcSignalingLib.event.on('beforeDisconnect', function (e) {
            
                var participants = webrtcSignalingLib.roomParticipants();
                for(let i in participants) {
                    if(e.roomIsSwitching) {
                        if(!participants[i].isLocal) {
                            for(let r in participants[i].voiceMeterTools) {
                                participants[i].voiceMeterTools[r].stop();
                            }
                        }
                    } else {
                        for(let r in participants[i].voiceMeterTools) {
                            participants[i].voiceMeterTools[r].stop();
                        }
                    }
                }
            });

            webrtcSignalingLib.event.on('screenAdded', function (participant) {
                log('screen added', participant)
                screensRendering.updateLayout();
            });
            webrtcSignalingLib.event.on('screenRemoved', function (participant) {
                log('screen removed', participant)
                screensRendering.updateLayout();
            });
            webrtcSignalingLib.event.on('trackAdded', function (e) {
                log('track added', e)
                screensRendering.newTrackAdded(e.track, e.participant);
                //screensRendering.updateLayout();


                //screensRendering.newTrackAdded(e.track);
            });

            webrtcSignalingLib.event.on('trackMuted', function (e) {
                log('track muted', e)
                if(e.track.kind == 'video') {
                    screensRendering.onVideoMute(e.track, e.participant);
                }
            });

            webrtcSignalingLib.event.on('trackUnmuted', function (e) {
                log('track unmuted', e)
                if(e.track.kind == 'video') {
                    screensRendering.onVideoUnMute(e.track);
                }
            });

            webrtcSignalingLib.event.on('videoTrackIsBeingAdded', function (e) {
                log('video track is being added', e)
                screensRendering.videoTrackIsAdding(e.track, e.participant);
                screensRendering.updateLayout();
            });

            webrtcSignalingLib.event.on('videoTrackLoaded', function (e) {
                log('video track loaded', e)
                screensRendering.onVideoTrackLoaded(e.track);
            });

            webrtcSignalingLib.event.on('remoteScreensharingStarting', function (e) {
                log('screen sharing is being started', e)
                screensRendering.onScreensharingStarting(e);
                screensRendering.showLoader('screensharingStarting', {participant: e.participant});
            });

            webrtcSignalingLib.event.on('remoteScreensharingStarted', function (e) {
                log('screen sharing is started', e)

                var handleScreensharring = function() {
                    let tracks = e.participant.tracks;
                    let screensharingTrack;
                    for (let i in tracks) {
                        if(!tracks[i].stream) continue;    
                        if(tracks[i].stream.id == e.content.streamId) {
                            screensharingTrack = tracks[i];
                        }
                    }
    
                    if(!screensharingTrack) {
                        return false;
                    }

                    let currentViewMode = screensRendering.getActiveViewMode();
                    let currentViewModeIsRight = false;
                    if(Q.info.isMobile) {
                        if(currentViewMode == 'maximizedMobile') currentViewModeIsRight = true
                    } else {
                        if(currentViewMode == 'fullScreen' || currentViewMode == 'screenSharing') currentViewModeIsRight = true
                    }
                    if(screensharingTrack.parentScreen && screensharingTrack.parentScreen.screensharing && currentViewModeIsRight) {
                        return true
                    };
    
                    screensRendering.switchScreensMode('fullScreen', screensharingTrack.parentScreen);
                    
                    screensRendering.updateLayout();

                    return true;
                }

                var checkIfScreensharingTrackAdded = function () {
                    setTimeout(function () {
                        if (!handleScreensharring()) {
                            checkIfScreensharingTrackAdded();
                        }
                    }, 500);
                }

                if(!handleScreensharring()) {
                    checkIfScreensharingTrackAdded();
                }                
            });

            webrtcSignalingLib.event.on('afterCamerasToggle', function (e) {
                screensRendering.hideLoader('afterCamerasToggle', {participant: e.participant});
            });
            webrtcSignalingLib.event.on('beforeCamerasToggle', function (e) {
                screensRendering.showLoader('beforeCamerasToggle', {participant: e.participant});
            });
            webrtcSignalingLib.event.on('screensharingStarted', function (e) {
                log('screen sharing started', e)
                
            });
            webrtcSignalingLib.event.on('remoteScreensharingFailed', function (e) {
                log('screen sharing failed')
                screensRendering.hideLoader('screensharingFailed', {participant: e.participant});
            });
            webrtcSignalingLib.event.on('screensharingStopped', function (e) {
                //screensharingStopped is local only event that is fired when localParticipant stops sharing screen
                log('screen sharing stopped')
                let usersScreens = webrtcSignalingLib.localParticipant().screens;
                for(let s in usersScreens) {
                    if(usersScreens[s].screensharing && usersScreens.length > 1) {
                        usersScreens[s].remove();
                    }
                }
                screensRendering.updateLayout();
            });
            webrtcSignalingLib.event.on('cameraRequested', function (e) {
                log('somebody requested camera')


            });

            webrtcSignalingLib.event.on('someonesCameraEnabled', function (e) {
                screensRendering.onSomeonesCameraEnabled(e.participant);
            })
            webrtcSignalingLib.event.on('someonesMicEnabled', function (e) {
                screensRendering.onSomeonesMicEnabled(e.participant);
            })

            webrtcSignalingLib.event.on('someonesCameraDisabled', function (e) {
                screensRendering.onSomeonesCameraDisabled(e.participant);
            })
            webrtcSignalingLib.event.on('someonesMicDisabled', function (e) {
                screensRendering.onSomeonesMicDisabled(e.participant);
            })
            webrtcSignalingLib.event.on('micDisabled', function (e) {
                let localParticipant = webrtcSignalingLib.localParticipant();
                for(let i in localParticipant.voiceMeterTools) {
                    localParticipant.voiceMeterTools[i].pause();
                }
            })
            webrtcSignalingLib.event.on('micEnabled', function (e) {
                let localParticipant = webrtcSignalingLib.localParticipant();
                for(let i in localParticipant.voiceMeterTools) {
                    localParticipant.voiceMeterTools[i].resume();
                }
            })
            webrtcSignalingLib.event.on('limitsTurnedOn', function (e) {
                if(webrtcSignalingLib.localMediaControls.micIsEnabled() && webrtcSignalingLib.localMediaControls.cameraIsEnabled()) {
                    notice.show('The host set time limits. Your mic and camera were turned off.');
                } else if(webrtcSignalingLib.localMediaControls.micIsEnabled()){
                    notice.show('The host set time limits. Your mic was turned off.');
                } else if(webrtcSignalingLib.localMediaControls.cameraIsEnabled()){
                    notice.show('The host set time limits. Your camera was turned off.');
                } else {
                    notice.show('The host set time limits.');
                }

            })
            webrtcSignalingLib.event.on('limitsTurnedOff', function (e) {
                notice.show('The host set time limits. You can use microphone and camera without any limitation now.');
            })
            webrtcSignalingLib.event.on('limitsUpdated', function (e) {
                notice.show('Time limits updated by the host.');
            })

            webrtcSignalingLib.event.on('connected', function () {
                log('Connected to server')
                connectionState.updateStatus('Connected');
                connectionState.show();

                setTimeout(function () {
                    connectionState.hide();

                }, 1000);
            });
            webrtcSignalingLib.event.on('connectError', function () {
                log('Server connection failed')
                connectionState.show();
                //connectionState.updateStatus('reconnecting', 'Server connection failed: ');
            });
            webrtcSignalingLib.event.on('reconnectError', function () {
                log('Server reconnection failed')
                connectionState.updateStatus('reconnection failed', 'Server connection failed: ');
            });
            webrtcSignalingLib.event.on('reconnectAttempt', function (n) {
                log('Server reconnection attempt ' + n)
                connectionState.updateStatus('reconnection attempt ' + n, 'Server connection failed: ');
            });
            webrtcSignalingLib.event.on('forceLeave', function () {
                log('force leave')
                module.stop(null, true);
                module.start();
            });

            var updateLayoutOnResize = function() {
                setTimeout(function () {
                    screensRendering.updateLayout();
                }, 1000)
            }

            window.addEventListener("resize", updateLayoutOnResize);

            webrtcSignalingLib.event.on('disconnected', function () {
                window.removeEventListener('resize', updateLayoutOnResize);
            });

        }

        /**
         * Show dialog with insturctions in case when it's impossible to access microphone or camera.
         * @method showInstructionsDialog
         * @param {String} [kind] Name of device that is not accessible.
         */
        var connectionState = (function () {

            var preparingWindow = (_options.showPreparingDialog || (!_options.startWith.video && !_options.startWith.audio));

            var _notice = null;
            var _currentState = preparingWindow ? "Checking room's state" : 'Connecting...';

            function show(state) {
                if(state != null) updateStatus(state);
            }

            function hide() {
                var removeNotice = function() {
                    if(_notice != null && _notice.element.parentNode != null && document.body.contains(_notice.element)) {
                        _notice.remove();
                    }
                }

                if(_currentState.toLowerCase() == 'connected') {
                    setTimeout(removeNotice, 4000);
                } else {
                    removeNotice();
                }

            }

            function updateStatus(state, text) {
                _currentState = state;
                var message = ''
                if(text != null) message += text;
                if(state != null) message += state;

                if(_notice != null && document.body.contains(_notice.element)) {
                    _notice.update(message);
                } else {
                    _notice = notice.show(message, true, 'left');
                }
            }

            return {
                show:show,
                hide:hide,
                updateStatus:updateStatus
            }

        }());

        /**
         * Show dialog with insturctions in case when it's impossible to access microphone or camera.
         * @method showInstructionsDialog
         * @param {String} [kind] Name of device that is not accessible.
         */
        function showInstructionsDialog(kind) {
            var instructionsPermissionDialog = document.createElement('DIV');
            instructionsPermissionDialog.className = 'Media_webrtc_devices_dialog_inner';
            var dialogList = document.createElement('OL');
            dialogList.className = 'Media_webrtc_instructions_dialog';

            if(Q.info.platform === 'ios') {
                dialogList.innerHTML = `<div>` + text.webrtc.webIosInstructionsDialog.permissionDenied.interpolate({kind: kind}) + `</div>`;
                //Q.getObject("webrtc.allow." + titleText, text)
            } else {
                dialogList.innerHTML = `<div>` + text.webrtc.webInstructionsDialog.permissionDenied.interpolate({kind: kind}) + `</div>
									<li>` + Q.getObject("webrtc.webInstructionsDialog.point1", text) + `</li>
									<li>` + text.webrtc.webInstructionsDialog.point2.interpolate({hostname: location.hostname}) + `</li>`;
            }

            instructionsPermissionDialog.appendChild(dialogList);
            Q.Dialogs.push({
                title: Q.getObject("webrtc.webInstructionsDialog.dialogTitle", text),
                className: 'Media_webrtc_devices_dialog',
                content: instructionsPermissionDialog,
                apply: true
            });
        }

        /**
         * Show dialog with buttons to get permissions for camera and/or mirophone and "Join room" button.
         * @method showPreparingDialog
         */
        function showPreparingDialog(callback, closeCallback, streams) {
            var micSVG = '<svg class="microphone-icon" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px"    y="0px" viewBox="-0.165 -0.245 99.499 99.498"    enable-background="new -0.165 -0.245 99.499 99.498" xml:space="preserve">  <path fill="#FFFFFF" d="M49.584-0.245c-27.431,0-49.749,22.317-49.749,49.749c0,27.432,22.317,49.749,49.749,49.749   c27.432,0,49.75-22.317,49.75-49.749C99.334,22.073,77.016-0.245,49.584-0.245z M41.061,32.316c0-4.655,3.775-8.43,8.431-8.43   c4.657,0,8.43,3.774,8.43,8.43v19.861c0,4.655-3.773,8.431-8.43,8.431c-4.656,0-8.431-3.775-8.431-8.431V32.316z M63.928,52.576   c0,7.32-5.482,13.482-12.754,14.336v5.408h6.748v3.363h-16.86V72.32h6.749v-5.408c-7.271-0.854-12.753-7.016-12.754-14.336v-10.33   h3.362v10.125c0,6.115,4.958,11.073,11.073,11.073c6.116,0,11.073-4.958,11.073-11.073V42.246h3.363V52.576z"/>  </svg>';
            var disabledMicSVG = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"    viewBox="0.049 -0.245 99.499 99.498" enable-background="new 0.049 -0.245 99.499 99.498"    xml:space="preserve">  <path fill="#FFFFFF" d="M49.797,99.253c-27.431,0-49.749-22.317-49.749-49.749c0-27.431,22.317-49.749,49.749-49.749   c27.432,0,49.75,22.317,49.75,49.749C99.548,76.936,77.229,99.253,49.797,99.253z M49.797,3.805   c-25.198,0-45.698,20.5-45.698,45.699s20.5,45.699,45.698,45.699c25.2,0,45.7-20.501,45.7-45.699S74.997,3.805,49.797,3.805z"/>  <path fill="#FFFFFF" d="M49.798,60.607c4.657,0,8.43-3.775,8.43-8.431v-8.634L44.893,59.024   C46.276,60.017,47.966,60.607,49.798,60.607z"/>  <path fill="#FFFFFF" d="M58.229,32.316c0-4.656-3.773-8.43-8.43-8.43c-4.656,0-8.43,3.775-8.431,8.43v19.861   c0,0.068,0.009,0.135,0.01,0.202l16.851-19.563V32.316z"/>  <path fill="#FFFFFF" d="M48.117,66.912v5.408h-6.749v3.363h16.86V72.32h-6.748v-5.408c7.271-0.854,12.754-7.016,12.754-14.336   v-10.33H60.87v10.125c0,6.115-4.957,11.073-11.072,11.073c-2.537,0-4.867-0.862-6.733-2.297l-2.305,2.675   C42.813,65.475,45.331,66.585,48.117,66.912z"/>  <path fill="#FFFFFF" d="M38.725,52.371V42.246h-3.362v10.33c0,1.945,0.397,3.803,1.102,5.507l2.603-3.022   C38.852,54.198,38.725,53.301,38.725,52.371z"/>  <rect x="47.798" y="11.385" transform="matrix(0.7578 0.6525 -0.6525 0.7578 43.3634 -20.8757)" fill="#C12337" width="4" height="73.163"/>  </svg>';
            var cameraSVG = '<svg version="1.1"    xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:a="http://ns.adobe.com/AdobeSVGViewerExtensions/3.0/"    x="0px" y="0px" width="101px" height="101px" viewBox="-0.335 -0.255 101 101" enable-background="new -0.335 -0.255 101 101"    xml:space="preserve">  <defs>  </defs>  <path opacity="0.2" d="M50,2.5C23.809,2.5,2.5,23.808,2.5,50S23.808,97.499,50,97.499c26.191,0,47.5-21.308,47.5-47.499   C97.5,23.809,76.19,2.5,50,2.5z"/>  <path fill="#FFFFFF" d="M50,0C22.431,0,0,22.43,0,50c0,27.57,22.429,49.999,50,49.999c27.57,0,50-22.429,50-49.999   C100,22.431,77.569,0,50,0z M77.71,61.245l-15.599-9.006v8.553H25.516V37.254h36.595v8.839l15.599-9.006V61.245z"/>  </svg>';
            var disabledCameraSVG = '<svg  version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"    viewBox="-0.165 -0.245 99.499 99.498" enable-background="new -0.165 -0.245 99.499 99.498"    xml:space="preserve">  <path fill="#FFFFFF" d="M49.584-0.245c-27.431,0-49.749,22.317-49.749,49.749c0,27.432,22.317,49.749,49.749,49.749   c27.432,0,49.75-22.317,49.75-49.749C99.334,22.073,77.016-0.245,49.584-0.245z M49.584,95.203   c-25.198,0-45.698-20.501-45.698-45.699s20.5-45.699,45.698-45.699c25.199,0,45.699,20.5,45.699,45.699S74.783,95.203,49.584,95.203   z"/>  <polygon fill="#FFFFFF" points="61.635,39.34 43.63,60.242 61.635,60.242 61.635,51.732 77.156,60.693 77.156,36.656 61.635,45.617    "/>  <polygon fill="#FFFFFF" points="25.223,36.822 25.223,60.242 34.391,60.242 54.564,36.822 "/>  <rect x="47.585" y="11.385" transform="matrix(0.7578 0.6525 -0.6525 0.7578 43.3117 -20.7363)" fill="#C12337" width="4" height="73.163"/>  </svg>';
            var screenSharingSVG = '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"  width="100px" height="100px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"> <path fill="#FFFFFF" d="M50.072,0.054c-27.57,0-49.999,22.429-49.999,50c0,27.57,22.429,50,49.999,50  c27.571,0,50.001-22.43,50.001-50C100.073,22.484,77.644,0.054,50.072,0.054z M76.879,63.696H53.705v5.222h5.457v3.77H40.987v-3.77  h5.458v-5.222H23.268V31.439H76.88L76.879,63.696L76.879,63.696z"/> </svg>';
            var disabledScreenSharingSVG = '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"  width="100px" height="100px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"> <path fill="#FFFFFF" d="M50.172,100.346C22.508,100.346,0,77.838,0,50.172C0,22.508,22.508,0,50.172,0  c27.666,0,50.173,22.508,50.173,50.172C100.346,77.838,77.839,100.346,50.172,100.346z M50.172,4.084  C24.76,4.084,4.084,24.76,4.084,50.172c0,25.414,20.675,46.088,46.088,46.088c25.414,0,46.088-20.675,46.088-46.088  C96.261,24.76,75.586,4.084,50.172,4.084z"/> <g>  <polygon fill="#FCFCFC" points="60.309,31.439 23.268,31.439 23.268,63.696 32.533,63.696 "/>  <polygon fill="#FCFCFC" points="68.252,31.439 40.478,63.696 46.444,63.696 46.444,68.918 40.987,68.918 40.987,72.688   59.162,72.688 59.162,68.918 53.705,68.918 53.705,63.696 76.879,63.696 76.88,63.696 76.88,31.439 "/> </g> <rect x="47.83" y="11.444" transform="matrix(-0.7577 -0.6526 0.6526 -0.7577 56.1462 117.2643)" fill="#C12337" width="4.02" height="73.532"/> </svg>';
            var userSVG = '<svg version="1.1" id="Слой_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"  width="100px" height="100px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"> <path d="M65.904,52.834c-4.734,3.725-10.695,5.955-17.172,5.955c-6.316,0-12.146-2.119-16.821-5.68C16.654,55.575,5,68.803,5,84.757  c0,11.78,14.356,10.197,32.065,10.197h25.869C80.643,94.954,95,97,95,84.757C95,68.051,82.221,54.333,65.904,52.834z"/> <path d="M48.732,55.057c13.286,0,24.092-10.809,24.092-24.095c0-13.285-10.807-24.094-24.092-24.094  c-13.285,0-24.093,10.809-24.093,24.094C24.64,44.248,35.448,55.057,48.732,55.057z"/> </svg>';

            var usersAvatar = null;
            var preJoiningStreams = [];

            var preAudioStream, preVideoStream;
            if(streams.length != 0) {
                preAudioStream = {kind:'audio', stream:new MediaStream()};
                preVideoStream = {kind:'camera', stream:new MediaStream()};

                for(let s in streams) {
                    let tracks = streams[s].getTracks();
                    for(let t in tracks) {
                        if(tracks[t].kind == 'audio') {
                            preAudioStream.stream.addTrack(tracks[t]);
                        } else {
                            preVideoStream.stream.addTrack(tracks[t]);
                        }
                    }
                }
                if(preAudioStream.stream.getTracks().length != 0) {
                    preJoiningStreams.push(preAudioStream);
                    _options.startWith.audio = true;
                } else {
                    preAudioStream = null;
                }
                if(preVideoStream.stream.getTracks().length != 0) {
                    preJoiningStreams.push(preVideoStream);
                    _options.startWith.video = true;
                } else {
                    preVideoStream = null;
                }
            }

            var md = navigator.mediaDevices;

            var setAvatarOnPreview = function(cameraPreview) {
                if(!cameraPreview.parentNode.classList.contains('Media_webrtc_preparing_active-audio')) cameraPreview.parentNode.classList.add('Media_webrtc_preparing_active-audio');

                if(usersAvatar != null) {
                    cameraPreview.innerHTML = '';
                    cameraPreview.appendChild(usersAvatar);
                } else {
                    Q.Streams.Avatar.get(Q.Users.loggedInUserId(), function (err, avatar) {
                        if (!avatar) {
                            return;
                        }

                        var src = Q.url(avatar.iconUrl(400));
                        if(src != null) {
                            var avatarImg = new Image();
                            avatarImg.src = src;
                            let avatarCon = document.createElement('DIV');
                            avatarCon.className = 'Media_webrtc_preparing_camera-preview-avatar-con';
                            avatarCon.appendChild(avatarImg);
                            cameraPreview.innerHTML = '';
                            cameraPreview.appendChild(avatarCon);
                            usersAvatar = avatarCon;

                        }
                    });
                }
            }

            var gotDevicesList = function(mediaDevices) {
                var videoDevices = 0;
                var audioDevices = 0;
                for(var i in mediaDevices) {
                    if (mediaDevices[i].kind === 'videoinput' || mediaDevices[i].kind === 'video') {
                        videoDevices++;
                    } else if (mediaDevices[i].kind === 'audioinput' || mediaDevices[i].kind === 'audio') {
                        audioDevices++;
                    }
                }

                var mediaDevicesDialog = document.createElement('DIV');
                mediaDevicesDialog.className = 'Media_webrtc_preparing_dialog_inner';

                if(Q.info.isMobile){
                    var close=document.createElement('div');
                    close.className = 'Media_webrtc_close-dialog-sign';
                    close.innerHTML = '&#10005;';
                    close.addEventListener('click', function() {
                        let preparingScreen = document.querySelector('.Media_webrtc_preparing_screen');
                        if(preparingScreen != null && preparingScreen.parentNode != null) preparingScreen.parentNode.removeChild(preparingScreen);
                        if(checkStatusInterval) {
                            clearInterval(checkStatusInterval);
                            checkStatusInterval = null;
                        }
                        switchMic(true);
                        switchCamera(true);
                        switchScreenshare(true);
                        Q.handle(_options.onWebRTCRoomEnded);
                        if(closeCallback != null) closeCallback();
                    });
                    mediaDevicesDialog.appendChild(close);
                }


                var cameraPreview = document.createElement('DIV');
                cameraPreview.className = 'Media_webrtc_preparing_camera-preview';

                var buttonsCon = document.createElement('DIV');
                buttonsCon.className = 'Media_webrtc_devices_dialog_buttons_con';
                var buttonsInner = document.createElement('DIV');
                buttonsInner.className = 'Media_webrtc_devices_dialog_buttons_inner_con';

                if(Q.info.isCordova && Q.info.platform === 'ios' && _options.useCordovaPlugins) {
                    buttonsCon.style.position = 'relative';
                    mediaDevicesDialog.classList.add('Media_webrtc_preparing_dialog_inner_cordova');
                    mediaDevicesDialog.style.background = 'black';
                }

                var switchMicBtn = document.createElement('DIV');
                switchMicBtn.type = 'button';
                switchMicBtn.className = 'Media_webrtc_prep-switch-mic';
                switchMicBtn.innerHTML = preAudioStream ? micSVG : disabledMicSVG;

                var switchCameraBtn = document.createElement('DIV');
                switchCameraBtn.type = 'button';
                switchCameraBtn.className = 'Media_webrtc_prep-switch-camera';
                switchCameraBtn.innerHTML = preVideoStream ? cameraSVG : disabledCameraSVG;

                var switchScreenSharingBtn = document.createElement('DIV');
                switchScreenSharingBtn.type = 'button';
                switchScreenSharingBtn.className = 'Media_webrtc_prep-switch-screen';
                switchScreenSharingBtn.innerHTML = disabledScreenSharingSVG;

                var joinButtonCon = document.createElement('DIV');
                joinButtonCon.className = 'Media_webrtc_join-button-con';
                var joinButton = document.createElement('DIV');
                joinButton.type = 'button';
                joinButton.className = 'Q_button Media_webrtc_join-button';
                joinButton.innerHTML = Q.getObject("webrtc.preparing.joinNow", text);


                //meetingStatus.appendChild(participantsIcon);
                mediaDevicesDialog.appendChild(cameraPreview);
                buttonsInner.appendChild(switchMicBtn);
                if(!_options.audioOnlyMode) buttonsInner.appendChild(switchCameraBtn);
                if(!(Q.info.isMobile || Q.info.isTablet || _options.audioOnlyMode) || Q.info.isCordova) buttonsInner.appendChild(switchScreenSharingBtn);
                buttonsCon.appendChild(buttonsInner);
                mediaDevicesDialog.appendChild(buttonsCon);
                joinButtonCon.appendChild(joinButton);
                mediaDevicesDialog.appendChild(joinButtonCon);
                //mediaDevicesDialog.appendChild(breakEl);

                if(!preVideoStream) setAvatarOnPreview(cameraPreview);

                var switchMic = function (off) {
                    if(audioDevices == 0) {
                        Q.alert('Audio input devices were not found on your device.')
                        return
                    }

                    let audioIsAlreadyEnabled = false;
                    for(let s in preJoiningStreams) {
                        if(preJoiningStreams[s].kind == 'audio') {
                            audioIsAlreadyEnabled = s;
                        }
                    }
                    log('switchMic: audioIsAlreadyEnabled ' +  audioIsAlreadyEnabled)

                    if((_options.startWith.audio === false || audioIsAlreadyEnabled === false || preJoiningStreams[audioIsAlreadyEnabled].stream == null) && off == null) {
                        log('switchMic: getUserMedia: before')

                        if(audioIsAlreadyEnabled !== false && preJoiningStreams[audioIsAlreadyEnabled].stream != null) {
                            _options.startWith.audio = true;
                            switchMicBtn.innerHTML = micSVG;
                        } else {
                            var preStream = {kind:'audio', stream:null};
                            preJoiningStreams.push(preStream);

                            md.getUserMedia({audio:true})
                                .then(function (stream) {
                                    log('switchMic: getUserMedia: got stream')

                                    preStream.stream = stream;
                                    switchMicBtn.innerHTML = micSVG;
                                    _options.startWith.audio = true;
                                }).catch(function (err) {
                                if(err.name == "NotAllowedError") showInstructionsDialog('camera/microphone');
                                for (let s = preJoiningStreams.length - 1; s >= 0; s--) {
                                    if(preJoiningStreams[s] == preStream) {
                                        preJoiningStreams.splice(s, 1);
                                    }
                                }
                                console.log(err.name + ": " + err.message);
                                console.error(err.name + ": " + err.message);
                            });
                        }

                    } else if(_options.startWith.audio === true && audioIsAlreadyEnabled !== false && preJoiningStreams[audioIsAlreadyEnabled].stream != null) {

                        if(off) {
                            let tracks = preJoiningStreams[audioIsAlreadyEnabled].stream.getAudioTracks();
                            for(let t in tracks) {
                                tracks[t].stop();
                            }

                            preJoiningStreams.splice(audioIsAlreadyEnabled, 1);
                        }

                        switchMicBtn.innerHTML = disabledMicSVG;
                        _options.startWith.audio = false;
                    }
                }

                switchMicBtn.addEventListener('mouseup', function () {
                    switchMic();
                });

                var setVideoPreview = function(stream) {
                    log('setVideoPreview', stream);
                    let videoPreview = document.createElement('video');
                    let screenVideo = cameraPreview.querySelector('video');
                    try {
                        videoPreview.srcObject = stream;

                    } catch (e) {
                        console.log(e);
                        console.error(e);
                    }

                    videoPreview.setAttributeNode(document.createAttribute('autoplay'));
                    videoPreview.setAttributeNode(document.createAttribute('playsinline'));
                    if(screenVideo != null) {
                        screenVideo.parentElement.insertBefore(videoPreview, screenVideo);
                    } else {
                        cameraPreview.innerHTML = '';
                        cameraPreview.appendChild(videoPreview);
                    }

                    if(cameraPreview.parentNode.classList.contains('Media_webrtc_preparing_active-audio')) {
                        cameraPreview.parentNode.classList.remove('Media_webrtc_preparing_active-audio');
                    }



                    videoPreview.play().then((e) => {
                        log('camera: play func success')
                    }).catch((e) => {
                        console.log(e)
                        console.error(e)
                        log('camera: play func error')
                    });
                }

                var switchCamera = function (off) {
                    if(videoDevices == 0) {
                        Q.alert('Video input devices were not found on your device.')
                        return
                    }

                    let cameraIsAlreadyEnabled = false;
                    for(let s in preJoiningStreams) {
                        if(preJoiningStreams[s].kind == 'camera') {
                            cameraIsAlreadyEnabled = s;
                        }
                    }

                    log('switchCamera', cameraIsAlreadyEnabled)

                    if(cameraIsAlreadyEnabled === false && off == null) {
                        log('switchCamera: getUserMedia: before')

                        var preStream = {kind:'camera', stream:null};
                        preJoiningStreams.push(preStream);

                        let constraints;
                        if(Q.info.isCordova) {
                            constraints = {
                                'audio': false,
                                'video': {
                                    width: { min: 320, max: 1920 },
                                    height: { min: 240, max: 1080 }
                                }
                            }
                        } else {
                            constraints = {video:true};
                        }
                        md.getUserMedia(constraints)
                            .then(function (stream) {
                                preStream.stream = stream;
                                setVideoPreview(stream);
                                switchCameraBtn.innerHTML = cameraSVG;
                                _options.startWith.video = true;
                            }).catch(function (err) {
                            if(err.name == "NotAllowedError") showInstructionsDialog('camera/microphone');
                            for (let s = preJoiningStreams.length - 1; s >= 0; s--) {
                                if(preJoiningStreams[s] == preStream) {
                                    preJoiningStreams.splice(s, 1);
                                }
                            }
                            console.log(err.name + ": " + err.message);
                            console.error(err.name + ": " + err.message);

                        });
                    } else if(cameraIsAlreadyEnabled !== false && preJoiningStreams[cameraIsAlreadyEnabled].stream != null) {
                        let tracks = preJoiningStreams[cameraIsAlreadyEnabled].stream.getVideoTracks();
                        for(let t in tracks) {
                            tracks[t].stop();
                        }
                        preJoiningStreams.splice(cameraIsAlreadyEnabled, 1);
                        switchCameraBtn.innerHTML = disabledCameraSVG;
                        let screenVideo = cameraPreview.querySelectorAll('video');
                        if(screenVideo.length == 2) {
                            cameraPreview.removeChild(cameraPreview.firstChild);
                        } else {
                            setAvatarOnPreview(cameraPreview);
                        }
                        _options.startWith.video = false;
                    }

                }
                if(preVideoStream) setVideoPreview(preVideoStream.stream);

                switchCameraBtn.addEventListener('mouseup', function () {
                    switchCamera();
                });

                var switchScreenshare = function (off) {
                    let screenIsAlreadyEnabled = false;
                    for(let s in preJoiningStreams) {
                        if(preJoiningStreams[s].kind == 'screen') {
                            screenIsAlreadyEnabled = s;
                        }
                    }

                    var getUserScreen = function() {
                        if(navigator.getDisplayMedia || navigator.mediaDevices.getDisplayMedia) {

                            if(navigator.mediaDevices.getDisplayMedia) {
                                return navigator.mediaDevices.getDisplayMedia({video: true, audio: true});
                            }
                            else if(navigator.getDisplayMedia) {
                                return navigator.getDisplayMedia({video: true, audio: true})
                            }
                            return;
                        }
                    }

                    if(screenIsAlreadyEnabled === false && off == null) {
                        log('switchScreenshare: getUserScreen: before')

                        var preStream = {kind:'screen', stream:null};
                        preJoiningStreams.push(preStream);

                        getUserScreen().then(function (stream) {
                            stream.getVideoTracks()[0][Symbol.for('webrtcTrackType')] = 'screen';
                            stream.getVideoTracks()[0].contentHint = 'detail';
                            preStream.stream = stream;
                            let screenPreview = document.createElement('video');
                            let cameraVideos = cameraPreview.querySelector('video');
                            if(cameraVideos != null) {
                                cameraPreview.appendChild(screenPreview);
                            } else {
                                cameraPreview.innerHTML = '';
                                cameraPreview.appendChild(screenPreview);
                            }

                            if(cameraPreview.parentNode.classList.contains('Media_webrtc_preparing_active-audio')) {
                                cameraPreview.parentNode.classList.remove('Media_webrtc_preparing_active-audio');
                            }

                            screenPreview.srcObject = stream;
                            screenPreview.setAttributeNode(document.createAttribute('autoplay'));
                            screenPreview.setAttributeNode(document.createAttribute('playsinline'));

                            switchScreenSharingBtn.innerHTML = screenSharingSVG;
                            screenPreview.play().then((e) => {
                                log('screen: play func success')
                            }).catch((e) => {
                                console.log(e)
                                console.error(e)
                                log('screen: play func error')

                            });

                            _options.startWith.video = true;
                        }).catch(function(error) {
                            for (let s = preJoiningStreams.length - 1; s >= 0; s--) {
                                if(preJoiningStreams[s] == preStream) {
                                    preJoiningStreams.splice(s, 1);
                                }
                            }
                            console.log(error.name + ': ' + error.message);
                            console.error(error.name + ': ' + error.message);
                        });
                    } else if(screenIsAlreadyEnabled !== false && preJoiningStreams[screenIsAlreadyEnabled].stream != null) {
                        let tracks = preJoiningStreams[screenIsAlreadyEnabled].stream.getVideoTracks();
                        for(let t in tracks) {
                            tracks[t].stop();
                        }

                        preJoiningStreams.splice(screenIsAlreadyEnabled, 1);
                        switchScreenSharingBtn.innerHTML = disabledScreenSharingSVG;
                        let screenVideo = cameraPreview.querySelectorAll('video');
                        if(screenVideo.length == 2) {
                            cameraPreview.removeChild(cameraPreview.lastChild);
                        } else {
                            setAvatarOnPreview(cameraPreview);
                        }
                        _options.startWith.video = false;
                    }

                }
                //if(_options.showPreparingDialog.screen === true) switchScreenshare();
                switchScreenSharingBtn.addEventListener('mouseup', function () {
                    switchScreenshare();
                });

                //var roomId = _options.roomId != null ? _options.roomId : null;
                //if(_options.roomPublisherId == null) _options.roomPublisherId = Q.Users.loggedInUser.id;

                function checkmeetingStatus() {

                    Q.req("Media/webrtc", ["status"], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);

                        if (msg) {
                            return Q.alert(msg);
                        }

                        if(!response.slots) return;
                        let stream = response.slots.status.stream;
                        let live = response.slots.status.live;
                        if(live) {
                            if(connectionState) {
                                connectionState.updateStatus('Room is live');
                            }
                        } else {
                            if(connectionState){
                                connectionState.updateStatus('Room is offline');
                            }
                        }
                    }, {
                        method: 'get',
                        fields: {
                            roomId: _options.roomId,
                            publisherId: _options.roomPublisherId,
                        }
                    });
                }
                if(_options.roomId != null && _options.roomPublisherId != null) {
                    checkmeetingStatus();
                    var checkStatusInterval = setInterval(checkmeetingStatus, 3000);
                }

                var joinAction = false;
                var joinNow = function() {
                    if(_options.streams == null) {
                        _options.streams = [];
                    }

                    let audioEnabled = false;
                    for(let s in preJoiningStreams) {
                        if(preJoiningStreams[s].kind == 'audio') {
                            audioEnabled = true;
                        }
                    }
                    if((Q.info.isMobile || Q.info.isTablet) && !Q.info.isCordova && audioEnabled == false) {
                        if(connectionState) connectionState.show('You should to turn microphone on to be able to join');
                        return;
                    }

                    for(let s in preJoiningStreams) {
                        _options.streams.push(preJoiningStreams[s].stream);
                    }

                    joinAction = true;
                    var dialog = Q.Dialogs.pop();
                    joinAction = false;
                    //if(dialog && dialog.parentNode != null) dialog.parentNode.removeChild(dialog);

                    if(checkStatusInterval) {
                        clearInterval(checkStatusInterval);
                        checkStatusInterval = null;
                    }

                    let preparingScreen = document.querySelector('.Media_webrtc_preparing_screen');
                    if(preparingScreen != null && preparingScreen.parentNode != null) preparingScreen.parentNode.removeChild(preparingScreen);
                    if(callback != null) callback()
                }

                joinButton.addEventListener('mouseup', joinNow);


                if(Q.info.isMobile && !Q.info.isCordova) {
                    var screen = document.createElement('DIV')
                    screen.className = 'Media_webrtc_preparing_screen';
                    screen.appendChild(mediaDevicesDialog);
                    if( _options.element != null) document.body.appendChild(screen);
                } else {


                    Q.Dialogs.push({
                        title: text.webrtc.preparing.dialogTitle,
                        className: 'Media_webrtc_preparing_dialog',
                        content: mediaDevicesDialog,
                        apply: false,
                        mask: false,
                        hidePrevious:true,
                        removeOnClose: true,
                        beforeClose: function() {
                            if(joinAction) return;
                            if(checkStatusInterval) {
                                clearInterval(checkStatusInterval);
                                checkStatusInterval = null;
                            }
                            switchMic(true);
                            switchCamera(true);
                            switchScreenshare(true);
                            Q.handle(_options.onWebRTCRoomEnded);
                            if(closeCallback != null) closeCallback();

                        },
                        onClose:function () {

                        },
                    });
                }



            }

            if(Q.info.isCordova && Q.info.platform === 'ios' && _options.useCordovaPlugins) {
                cordova.plugins.iosrtc.enumerateDevices().then(gotDevicesList)
            } else {
                navigator.mediaDevices.enumerateDevices().then(gotDevicesList)
            }

        }

        /**
         * Prepare media tracks while user are joining the room and publish them after user is joined the room.
         * @method getMediaStream
         */
        function getMediaStream(constrains) {
            log('getMediaStream: video = ' + (constrains != null && constrains.video))
            log('getMediaStream: audio = ' + (constrains != null && constrains.audio))
            log('getMediaStream: audio = ', constrains.audio)

            if(Q.info.isCordova && Q.info.platform === 'ios' && _options.useCordovaPlugins) {
                return new Promise(function(resolve, reject) {

                    cordova.plugins.iosrtc.enumerateDevices().then(function(mediaDevicesList) {
                        var mediaDevices = mediaDevicesList;

                        var videoDevices = 0;
                        var audioDevices = 0;
                        for (var i in mediaDevices) {
                            if (mediaDevices[i].kind.indexOf('video') != -1) {
                                videoDevices++;
                            } else if (mediaDevices[i].kind.indexOf('audio') != -1) {
                                audioDevices++;
                            }
                        }

                        var showInstructionsDialogIos = function(kind) {
                            var instructionsPermissionDialog = document.createElement('DIV');
                            instructionsPermissionDialog.className = 'Media_webrtc_devices_dialog_inner';
                            var dialogList = document.createElement('OL');
                            dialogList.className = 'Media_webrtc_instructions_dialog';
                            dialogList.innerHTML = `<div>` + text.webrtc.iosInstructionsDialog.permissionDenied.interpolate({kind: kind}) + `</div>
									<li>` + Q.getObject("webrtc.iosInstructionsDialog.point1", text) + `</li>
									<li>` + Q.getObject("webrtc.iosInstructionsDialog.point2", text) + `</li>
									<li>` + text.webrtc.iosInstructionsDialog.point3.interpolate({kind: kind}) + `</li>
									<li>` + text.webrtc.iosInstructionsDialog.point4.interpolate({communityId: Q.Users.communityId}) + `</li>`;
                            instructionsPermissionDialog.appendChild(dialogList);
                            Q.Dialogs.push({
                                title: Q.getObject("webrtc.iosInstructionsDialog.dialogTitle", text),
                                className: 'Media_webrtc_devices_dialog',
                                content: instructionsPermissionDialog,
                                apply: true
                            });
                        }

                        if(constrains.video && videoDevices != 0 && constrains.audio && audioDevices != 0) {

                            cordova.plugins.iosrtc.getUserMedia( { video: true, audio: false } )
                                .then(function (videoStream) {
                                    log('requestVideoStream: got stream');
                                    cordova.plugins.iosrtc.getUserMedia( { video: false, audio: true } )
                                        .then(function (audioStream) {
                                            log('requestAudioStream: got stream');
                                            resolve([videoStream, audioStream]);
                                        })
                                        .catch(function (err) {
                                            showInstructionsDialogIos('Microphone');
                                        });
                                })
                                .catch(function (err) {
                                    showInstructionsDialogIos('Camera');
                                });

                        } else if(constrains.video && videoDevices != 0) {

                            cordova.plugins.iosrtc.getUserMedia( { video: true, audio: false } )
                                .then(function (videoStream) {
                                    log('requestVideoStream: got stream');
                                    resolve([videoStream]);
                                })
                                .catch(function (err) {
                                    showInstructionsDialogIos('Camera');
                                });
                        } else if(constrains.audio && audioDevices != 0) {

                            cordova.plugins.iosrtc.getUserMedia( { video: false, audio: true } )
                                .then(function (audioStream) {
                                    log('requestVideoStream: got stream');

                                    resolve([audioStream]);
                                })
                                .catch(function (err) {
                                    showInstructionsDialogIos('Microphone');
                                });
                        }

                    }).catch(function (err) {
                        reject(err);
                    });

                });
            }

            return new Promise(function(resolve, reject) {
                log('getMediaStream: before enumerate');

                navigator.mediaDevices.enumerateDevices().then(function (mediaDevices) {
                    var videoDevices = 0;
                    var audioDevices = 0;
                    for(var i in mediaDevices) {
                        if (mediaDevices[i].kind === 'videoinput' || mediaDevices[i].kind === 'video') {
                            videoDevices++;
                        } else if (mediaDevices[i].kind === 'audioinput' || mediaDevices[i].kind === 'audio') {
                            audioDevices++;
                        }
                    }

                    log('getMediaStream: before getUserMedia');
                    //if(!Q.info.isMobile && !Q.info.isTablet && (!constrains.video || videoDevices == 0) && (!constrains.audio || audioDevices == 0)) return;

                    navigator.mediaDevices.getUserMedia({video:videoDevices != 0 ? constrains.video : false, audio:audioDevices != 0 ? constrains.audio : false})
                        .then(function (stream) {
                            log('getMediaStream: getUserMedia: got stream');

                            resolve([stream]);
                        }).catch(function(err) {
                            reject(err);
                        });
                }).catch(function (e) {
                    reject(e);
                });
            });

        }

        /**
         * Init conference using own node.js server for signalling process.
         * @method initWithStreams
         * @param {Object} [turnCredentials] Creadentials that are needed to use TURN server.
         * @param {String} [turnCredentials.url] Address of TURN server
         * @param {String} [turnCredentials.credential] Passphrase
         * @param {String} [turnCredentials.username] Username
         */
        function initWithNodeServer(socketServer, turnCredentials) {
            log('initWithNodeServer');       

            var filterStreams = function (streams) {
                if(!_roomStream.testWriteLevel('contribute')) {
                    return [];
                }

                for(let s in streams) {
                    let audioTracks = streams[s].getAudioTracks();
                    let videoTracks = streams[s].getVideoTracks();

                    if(audioTracks.length != 0 && !module.hasPermission('mic')) {
                        for(let t in audioTracks) {
                            audioTracks[t].stop();
                            streams[s].removeTrack(audioTracks[t]);
                        }
                        _options.startWith.audio = false;
                    }

                    if(videoTracks.length != 0) {
                        let screensharingTracks = [];
                        let cameraTracks = [];
                        for(let t in videoTracks) {
                            if(videoTracks[t][Symbol.for('webrtcTrackType')] == 'screen') {
                                screensharingTracks.push(videoTracks[t]);
                            } else {
                                cameraTracks.push(videoTracks[t]);
                            }
                        }

                        let cameraIsNotAllowed, screenIsNotAllowed;
                        if(cameraTracks.length != 0 && !module.hasPermission('camera')) {
                            for(let t in cameraTracks) {
                                cameraTracks[t].stop();
                                streams[s].removeTrack(cameraTracks[t]);
                            }
                            cameraIsNotAllowed = true;
                        }

                        if(screensharingTracks.length != 0 && !module.hasPermission('screen')) {
                            for(let t in screensharingTracks) {
                                screensharingTracks[t].stop();
                                streams[s].removeTrack(screensharingTracks[t]);
                            }
                            screenIsNotAllowed = true;
                        }

                        if(cameraIsNotAllowed && screenIsNotAllowed) {
                            _options.startWith.video = false;
                        }
                    }
                }
                return streams;
            }

            var initConference = function(){
                log('initWithNodeServer: initConference');

                if(typeof Media.WebRTCRoomClient == 'undefined') return;
                var roomId = (_roomStream.fields.name).replace('Media/webrtc/', '');
                var roomStartTime = _roomStream.getAttribute('startTime');
                log('initWithNodeServer: initConference: roomId = ' + roomId)
                log('initWithNodeServer: initConference: roomStartTime = ' + roomStartTime)
                log('initWithNodeServer: initConference: _roomStream = ', _roomStream)
                log('initWithNodeServer: initConference: webrtcSignalingLib = ', webrtcSignalingLib)
                log('initWithNodeServer: initConference: _options = ',_options)
                log('initWithNodeServer: initConference: _localInfo = ',_localInfo)

                let rememberedAudioDevice = localStorage.getItem("Q.Media.webrtc.audioOutputDeviceId");
                let useCanvasForVideo = options.useCanvasForVideo = _localInfo.platform == 'ios' && _localInfo.browserVersion >= 17;
                webrtcSignalingLib = new Q.Media.WebRTCRoomClient({
                    mode:'node',
                    useAsLibrary: true,
                    socket: Q.Socket,
                    nodeServer: socketServer,
                    roomName: roomId,
                    roomStartTime: roomStartTime,
                    roomPublisher: _roomStream.getAll().publisherId,
                    sid: Q.Users.loggedInUser.id,
                    username:  Q.Users.loggedInUser.id + '\t' + _roomStartTime,
                    video: false,
                    audio: false,
                    startWith: _options.startWith,
                    streams: _options.streams != null ? filterStreams(_options.streams) : null,
                    sinkId: rememberedAudioDevice && rememberedAudioDevice != 'false' ? rememberedAudioDevice : null,
                    notForUsingTracks: _options.notForUsingTracks != null ? _options.notForUsingTracks : null,
                    sounds: _options.sounds != null ? _options.sounds : null,
                    onlyOneScreenSharingAllowed: _options.onlyOneScreenSharingAllowed,
                    liveStreaming: _options.liveStreaming,
                    showScreenSharingInSeparateScreen: _options.showScreenSharingInSeparateScreen,
                    turnCredentials: turnCredentials,
                    debug: _debug,
                    useCordovaPlugins: _options.useCordovaPlugins,
                    useCanvasForVideo: useCanvasForVideo,
                    logger: appDebug.createLogMethod('app.js')
                });

                bindConferenceEvents(webrtcSignalingLib);
                log('initWithNodeServer: initConference: start init');

                webrtcSignalingLib.init(function (app) {
                    log('initWithNodeServer: initConference: inited');
                    log('initWithNodeServer: webrtcSignalingLib', webrtcSignalingLib, app);
                    //updateParticipantData();
                    connectionState.hide();
                    _debugTimer.loadEnd = performance.now();

                    Q.handle(_options.onWebRTCRoomCreated);
                    if(window.opener) {
                        window.opener.postMessage('webrtcstarted', '*');
                    }
                    /* if(Q.Media.onWebRTCStarted) {
                        Q.handle(Q.Media.onWebRTCStarted);
                    } */

                    let localParticipant = webrtcSignalingLib.localParticipant();

                    Q.activate(
                        document.body.appendChild(
                            Q.Tool.setUpElement(
                                "div", // or pass an existing element
                                "Media/webrtc/controls",
                                {
                                    webrtcRoomInstance: function () {
                                        return module;
                                    },
                                    debug: _debug,
                                    onCreate: function () {
                                        Q.handle(_options.onWebrtcControlsCreated, this);
                                    },
                                    onChildToolsLoaded: function () {
                                        var moveWithinArea = 'window';
                                        let _controlsTool = this;
                                        let _controls = this.element;
                                        var elementsToIgnore = [
                                            _controlsTool.videoInputsTool.videoinputListEl,
                                            _controlsTool.audioTool.audioOutputListEl,
                                            _controlsTool.audioTool.audioinputListEl,
                                            _controlsTool.participantsListTool.participantListEl,
                                            _controlsTool.textChat.chatBox
                                            ];

                                        Q.activate(
                                            Q.Tool.setUpElement(
                                                _controls.firstChild, // or pass an existing element
                                                "Q/resize",
                                                {
                                                    move: true,
                                                    resize: false,
                                                    active: true,
                                                    ignoreOnElements: elementsToIgnore,
                                                    elementPosition: 'fixed',
                                                    snapToSidesOnly: true,
                                                    moveWithinArea: moveWithinArea, //window/parent/DOMRect
                                                    onMovingStart: function () {
                                                        _controls.classList.add('isMoving');
                                                    },
                                                    onMovingStop: function () {
                                                        _controls.classList.remove('isMoving');
                                                    },
                                                    onMoved: function () {
                                                        screensRendering.updateLayout();
                                                    }
                                                }
                                            ),
                                            {},
                                            function () {
                                                log('initWithNodeServer: initConference: activated controls', this);
                                                
                                                var columnsTools = Q.Tool.byName('Q/columns');
                                                var dashboard = document.getElementById('dashboard_slot');
                                                var columnsTool = columnsTools[Object.keys(columnsTools)[0]];
                                                var updateArearectangle = function () {
                    
                                                    var moveWithinArea;
                                                    if(Object.keys(columnsTools).length == 0 && dashboard) {
                                                        var dashboardPos = dashboard.classList.contains('Q_fixed_top') ? 'top' : 'bottom';
                    
                                                        var windowWidth =  window.innerWidth;
                                                        var windowHeight =  window.innerHeight;
                                                        var dashboardHeight =  dashboard.offsetHeight;
                    
                                                        if(dashboardPos == 'bottom') {
                                                            moveWithinArea = new DOMRect(0, 0, windowWidth, windowHeight - dashboardHeight);
                                                        } else if(dashboardPos == 'top') {
                                                            moveWithinArea = new DOMRect(0, dashboardHeight, windowWidth, windowHeight - dashboardHeight);
                                                        }
                                                    } else {
                    
                                                        var currentColumn = columnsTool.state.$currentColumn.get()[0];
                                                        moveWithinArea = currentColumn.getBoundingClientRect();
                                                    }
                    
                                                    return moveWithinArea;
                                                }
                    
                                                if(Q.info.isMobile) {
                                                    moveWithinArea = updateArearectangle();
                                                }
                    
                                                var resizeTool = this;
                                                if (columnsTool && Q.info.isMobile) {
                                                    columnsTool.state.onActivate.add(function () {
                                                        var moveWithinArea = updateArearectangle();
                                                        resizeTool.setContainerRect(moveWithinArea);
                                                        screensRendering.updateLayout();
                                                    });
                                                    columnsTool.state.onClose.add(function () {
                                                        var moveWithinArea = updateArearectangle();
                                                        resizeTool.setContainerRect(moveWithinArea);
                                                        screensRendering.updateLayout();
                                                    });

                                                }

                                                if (typeof screen != 'undefined' && screen.orientation != null) {
                                                    screen.orientation.addEventListener("change", function () {
                                                        setTimeout(function () {
                                                            var moveWithinArea = updateArearectangle();
                                                            resizeTool.setContainerRect(moveWithinArea);
                                                            screensRendering.updateLayout();
                                                        }, 1000);
                                                    });
                                                }

                                                window.addEventListener("resize", function () {
                                                    setTimeout(function () {
                                                        var moveWithinArea = updateArearectangle();
                                                        resizeTool.setContainerRect(moveWithinArea);
                                                        screensRendering.updateLayout();
                                                    }, 1000);
                                                });

                                                if (_options.controlsPosition == 'top') {
                                                    this.snapTo('top');
                                                } else if (_options.controlsPosition == 'bottom') {
                                                    this.snapTo('bottom');
                                                } else if (_options.controlsPosition == 'left') {
                                                    this.snapTo('left');
                                                } else if (_options.controlsPosition == 'right') {
                                                    this.snapTo('right');
                                                } else {
                                                    this.snapTo('bottom');
                                                }
                                            }
                                        );
                                    }
                                }

                            )
                        ),
                        {},
                        function () {
                            log('initWithNodeServer: initConference: activate controls', webrtcSignalingLib.initNegotiationState );

                            //get info about active camera/mic slot requests
                            if(webrtcSignalingLib.initNegotiationState == 'ended') {
                                log('initWithNodeServer: initConference: fi1');

                                webrtcSignalingLib.socketConnection().emit('Media/webrtc/controlsLoaded')
                            } else {
                                log('initWithNodeServer: initConference: fi2');
                                webrtcSignalingLib.event.on('initNegotiationEnded', function () {
                                    log('initWithNodeServer: initConference: initNegotiationEnded');

                                    webrtcSignalingLib.socketConnection().emit('Media/webrtc/controlsLoaded')
                                })
                            }

                            _controls = this.element;
                            log('initWithNodeServer: initConference: activate controls', this, this.element);

                            _controlsTool = this;
                            screensRendering.updateLayout();
                            }
                    );
                });
                /*webrtcSignalingLib.event.on('joined', function () {
                    navigator.mediaDevices.enumerateDevices().then(function (mediaDevices) {
                        webrtcSignalingLib.localMediaControls.loadDevicesList(mediaDevices);
                    }).catch(function (e) {
                        console.error('ERROR: cannot get device info: ' + e.message);
                    });
                });*/
            }
            

            var findScript = function (src) {
                var scripts = document.getElementsByTagName('script');
                var src = Q.url(src);
                for (var i=0; i<scripts.length; ++i) {
                    var srcTag = scripts[i].getAttribute('src');
                    if (srcTag && srcTag.indexOf(src) != -1) {
                        return true;
                    }
                }
                return null;
            };

            if(findScript('{{Media}}/js/tools/webrtc/app.js')) {
                log('initWithNodeServer: app.js exists');

                initConference();
            } else {
                log('initWithNodeServer: add app.js');
                Q.addScript([
                    "{{Media}}/js/tools/webrtc/app.js",
                    "{{Media}}/js/tools/webrtc/HackTimer.js",
                    "{{Media}}/js/tools/webrtc/RecordRTC.js",
                    "{{Media}}/js/tools/webrtc/mp4-muxer.min.js",
                    "https://accounts.google.com/gsi/client",
                ], function () {
                    initConference();
                });
            }

        }

        function overrideDefaultOptions(options) {
            if(typeof options === 'object') {
                for (var key in options) {
                    if(key == 'mode') continue;
                    _options[key] = options.hasOwnProperty(key) && typeof options[key] !== 'undefined' ? options[key] : _options[key];
                }

                /*if(!Q.info.isMobile && options.defaultDesktopViewMode != null) {
                    screensRendering.setViewMode(options.defaultDesktopViewMode );
                } else if(Q.info.isMobile && options.defaultMobilevViewMode != null) {
                    screensRendering.setViewMode(options.defaultMobileViewMode);
                }*/
            }

        }

        function unsetResizeObserver() {
           if(_resizeObserver == null) return;

            _resizeObserver.unobserve(_roomsMedia);
        }

        function setResizeObserver() {
            if(typeof ResizeObserver == 'undefined') return;
            _resizeObserver = new window.ResizeObserver(entries => {
                screensRendering.updateLayout();
            });

            _resizeObserver.observe(_roomsMedia);
        }

        /**
         * Start WebRTC conference room
         * @method start
         * @param {Object} [options] Options, including:
         * @param {Object} [options.element] Parent DOM element where video screens will be rendered
         * @param {String} [options.roomId] Uniq id of room that will be part of Stream name (Media/webrtc/[roomId])
         * @param {Number} [options.roomPublisherId] Id of publisher of the stream (stream represents room).
         *      Is required as argument for getting Stream from db
         */
        module.start = function () {
            log('module.start');
            if(!text) {
                Q.Text.get('Media/content', function (err, content) {
                    text = content;
                    module.start();
                });
                return;
            }
            
            loadStyles().then(function () {
                return loadMediProcessor();
            }).then(function() {
                startConference();
            });

            function loadStyles() {
                return new Promise(function (resolve, reject) {
                    Q.addStylesheet('{{Media}}/css/tools/webrtc.css?ts=' + performance.now(), function () {
                        resolve();
                    });
                });
            }
            function loadMediProcessor() {
                return new Promise(function (resolve, reject) {
                    Q.addScript([
                        '{{Media}}/js/tools/webrtc/mediaProcessor.js',
                    ], function () {
                        Q.Media.WebRTC.mediaProcessor = new Q.Media.WebRTC.MediaProcessor();
                        resolve();
                    });
                });
            }

            function startConference() {
                var socket = Q.Socket.get();
                if(!socket) {
                    setTimeout(startConference, 100)
                    return;
                }

                var preparingWindow = (_options.showPreparingDialog/* || (!_options.startWith.video && !_options.startWith.audio)*/);

                connectionState.show(preparingWindow ? "Checking room's state" : 'Connecting...');

                _debugTimer.loadStart = performance.now();

                _roomStartTime = Date.now();

                appDebug.sendReportsInterbal = setInterval(function () {
                    appDebug.sendReportToServer();
                }, 3000);

                if (appDebug.isiOSwebView()) {
                    return Q.alert(text.webrtc.notices.openInBrowserAlert != null ? text.webrtc.notices.openInBrowserAlert : 'Open link in Safari browser to join the conference.');
                }

                var ua = navigator.userAgent;
                var startWith = _options.startWith || {};
                var preparingWindow = (_options.showPreparingDialog/* || (!_options.startWith.video && !_options.startWith.audio)*/);

                log('start: onTextLoad', preparingWindow, _options.showPreparingDialog.video, _options.showPreparingDialog.audio);


                if((typeof window.RTCPeerConnection == 'undefined' && typeof window.mozRTCPeerConnection == 'undefined' && typeof  window.webkitRTCPeerConnection == 'undefined')) {
                    Q.alert('Unfortunatelly your browser doesn\'t support WebRTC')
                }

                //prevent connecting to the same room if user is already connected to this room
                if(Q.Media.WebRTCRooms != null && Q.Media.WebRTCRooms.length != 0 && _options.roomPublisherId && _options.roomId) {
                    for(var r in Q.Media.WebRTCRooms) {
                        let streamOfRoom = Q.Media.WebRTCRooms[r].roomStream();

                        if(streamOfRoom.fields.publisherId == _options.roomPublisherId && streamOfRoom.fields.name == 'Media/webrtc/' + _options.roomId) {
                            connectionState.updateStatus('You are already connected to this room');

                            console.warn('Prevented connecting to the same room')
                            setTimeout(function() {
                                connectionState.hide();
                            }, 3000);
                            return;
                        }
                    }
                }

                if(_options.leaveOtherActiveRooms) {
                    log('start: onTextLoad: leave existing rooms');
                    if(Q.Media.WebRTCRooms != null && Q.Media.WebRTCRooms.length != 0) {
                        for(var r in Q.Media.WebRTCRooms) {
                            Q.Media.WebRTCRooms[r].stop();
                        }
                    }
                }
                log('start: onTextLoad: continue');

                //var roomId = _options.roomId != null ? _options.roomId : null;
                //if(_options.roomPublisherId == null) _options.roomPublisherId = Q.Users.loggedInUser.id;

                var roomsMedia = document.createElement('DIV');
                roomsMedia.className = 'Media_webrtc_room-media Q_floatAboveDocument';
                if(_options.margins != null) {
                    var totalHeight = 0;
                    var totalWidth = 0;
                    if(_options.margins.top != null) {
                        roomsMedia.style.top = _options.margins.top + 'px';
                        totalHeight = totalHeight + _options.margins.top
                    }
                    if(_options.margins.right != null) {
                        roomsMedia.style.right = _options.margins.right + 'px';
                        totalWidth = totalWidth + _options.margins.right
                    }
                    if(_options.margins.bottom != null) {
                        roomsMedia.style.bottom = _options.margins.bottom + 'px';
                        totalHeight = totalHeight + _options.margins.bottom
                    }
                    if(_options.margins.left != null) {
                        roomsMedia.style.left = _options.margins.left + 'px';
                        totalWidth = totalWidth + _options.margins.left
                    }

                    roomsMedia.style.height = 'calc(100% - ' + totalHeight + 'px)';
                    roomsMedia.style.width = 'calc(100% - ' + totalWidth + 'px)';

                } else if(Q.info.isMobile) {
                    var columnsTools = Q.Tool.byName('Q/columns');
                    var columnsTool = columnsTools[Object.keys(columnsTools)[0]];
                    var dashboard = document.getElementById('dashboard_slot');

                    var updateContainerSize = function () {
                        if(Object.keys(columnsTools).length == 0 && dashboard) {
                            log('initWithNodeServer: initConference: activate controls: no columns');
                            var dashboardPos = dashboard.classList.contains('Q_fixed_top') ? 'top' : 'bottom';

                            var windowWidth =  window.innerWidth;
                            var windowHeight =  window.innerHeight;
                            var dashboardHeight =  dashboard.offsetHeight;
                            log('initWithNodeServer: initConference: activate controls: no columns', windowWidth, windowHeight, dashboardHeight);
                            var moveWithinArea;
                            roomsMedia.style.height = 'calc(100% - ' + dashboardHeight + 'px)';
                            if(dashboardPos == 'bottom') {
                                roomsMedia.style.top = '0px';
                            } else if(dashboardPos == 'top') {
                                roomsMedia.style.top = dashboardHeight + 'px';
                            }
                        } else if (Object.keys(columnsTools).length != 0) {
                            var currentColumn = columnsTool.state.$currentColumn.get()[0];
                            var currentColumnRect = currentColumn.getBoundingClientRect();
                            roomsMedia.style.height = currentColumnRect.height + 'px';
                            log('initWithNodeServer: initConference: activate controls: columns != 0', currentColumn, currentColumnRect);

                        } else {
                            roomsMedia.style.height = '100%';
                        }
                    }
                    updateContainerSize();

                    if(columnsTool) columnsTool.state.onClose.add(updateContainerSize);
                    if(columnsTool) columnsTool.state.onActivate.add(updateContainerSize);
                }

                if (!_options.element) {
                    _options.element = document.body;
                }
                if (_options.element != document.body) {
                    _options.element.dataset.webrtcContainer = true;
                }
                (_options.element || document.body).appendChild(roomsMedia);
                _roomsMedia = roomsMedia;
                setResizeObserver();
                Q.activate(
                    Q.Tool.setUpElement(
                        _roomsMedia, // or pass an existing element
                        "Q/layouts",
                        {/*alternativeContainer: Q.info.isMobile ? null : document.body*/}
                    ),
                    {},
                    function () {
                        _layoutTool = this;
                        Media.layoutTool = _layoutTool;
                        _layoutTool.currentRects = [];
                        _layoutTool.basicGridRects = [];
                    }
                );


                var createOrJoinRoomStream = function (roomId, asPublisherId) {
                    log('createRoomStream START', roomId, asPublisherId)
                    try {
                        var err = (new Error);
                        console.log(err.stack);
                    } catch (e) {
        
                    }
                    Q.req("Media/webrtc", ["room"], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);

                        log('err, response ', err, response )
                        if (_options.inviteToken && response.slots.room.waitingRoomStream) {
                            var waitingRoomStream = response.slots.room.waitingRoomStream;
                            connectionState.updateStatus('Waiting for yout call to be accepted.');
                            if(_waitingRoomStream != null) {
                                return;
                            }
                            Q.Streams.get(waitingRoomStream.fields.publisherId, waitingRoomStream.fields.name, function (err, stream) {
                                log('got waiting room stream', stream)
                                
                                _waitingRoomStream = stream;
                                stream.onMessage('Media/webrtc/admit').set(function (message) {
                                    createOrJoinRoomStream(roomId, asPublisherId);
                                });
                                stream.onMessage('Media/webrtc/close').set(function (message) {
                                    let instructions = JSON.parse(message.instructions)
                                    log('Media/webrtc/close', message)
                                    if(instructions.msg) {
                                        connectionState.updateStatus(instructions.msg);
                                    }
                                    module.stop();
                                });
                            });
                            return;
                        } else if (msg) {
                            _options.streams.map(function (mediStream) {
                                mediStream.getTracks().forEach(function (t) {
                                    t.stop();
                                })
                            });
                            _options.notForUsingTracks.map(function (track) {
                                track.stop();
                            });
                            if(roomsMedia && roomsMedia.parentElement) {
                                roomsMedia.parentElement.removeChild(roomsMedia);
                            }
                            connectionState.updateStatus('Disconnected');
                            setTimeout(function() {
                                connectionState.hide();
                            }, 3000);
                            return Q.alert(msg);
                        }
                        log('createRoomStream: joined/connected', response.slots.room);

                        roomId = (response.slots.room.roomId).replace('Media/webrtc/', '');
                        if(_options.roomId == null) _options.roomId = roomId;
                        if(_options.roomPublisherId == null) _options.roomPublisherId = response.slots.room.stream.fields.publisherId;
                        var turnCredentials = response.slots.room.turnCredentials;
                        var socketServer = Q.url(response.slots.room.socketServer);
                        _debug = response.slots.room.debug;

                        overrideDefaultOptions(response.slots.room.options);
                        log('createRoomStream: Q.Streams.get', response.slots.room, response.slots.room.stream.fields);
                        log('createRoomStream: Q.Streams.get 2', _options.roomPublisherId);

                        //var connectUrl = updateQueryStringParameter(location.href, 'Q.rid', roomId);
                        //connectUrl = updateQueryStringParameter(connectUrl, 'Q.pid', asPublisherId);
                        Q.Streams.get(response.slots.room.stream.fields.publisherId, 'Media/webrtc/' + roomId, function (err, stream) {
                            log('createRoomStream: joined/connected: pull stream');

                            _roomStream = stream;
                            if(Q.Media.WebRTCRooms == null){
                                Q.Media.WebRTCRooms = [];
                            }

                            //prevent connecting to the same room if user is already connected to this room
                            if (Q.Media.WebRTCRooms != null && Q.Media.WebRTCRooms.length != 0) {
                                for (var r in Q.Media.WebRTCRooms) {
                                    let streamOfRoom = Q.Media.WebRTCRooms[r].roomStream();

                                    if (streamOfRoom.fields.publisherId == _roomStream.flelds.publisherId && streamOfRoom.fields.name == _roomStream.flelds.name) {
                                        connectionState.updateStatus('You are already connected to this room');
                                        setTimeout(function() {
                                            connectionState.hide();
                                        }, 3000);
                                        unsetResizeObserver();
                                        console.warn('Prevented connecting to the same room')
                                        return;
                                    }
                                }
                            }

                            Q.Media.WebRTCRooms.push(module);

                            _options.hosts = response.slots.room.hosts;
                            bindStreamsEvents(stream);

                            initWithNodeServer(socketServer, turnCredentials);
                        });

                    }, {
                        method: 'post',
                        fields: {
                            roomId: _options.roomId,
                            publisherId: asPublisherId,
                            inviteToken: _options.inviteToken,
                            invitingUserId: _options.invitingUserId,
                            socketId: socket.socket.id,
                            description: _options.description,
                            resumeClosed: _options.resumeClosed,
                            closeManually: _options.closeManually,
                            writeLevel: _options.writeLevel,
                            useRelatedTo: _options.useRelatedTo,
                            relate: _options.relate
                        }
                    });
                }

                let rememberedAudioDeviceId = localStorage.getItem("Q.Media.webrtc.audioInputDeviceId");
                let rememberedVideoDeviceId = localStorage.getItem("Q.Media.webrtc.videoInputDeviceId");
                rememberedAudioDeviceId = rememberedAudioDeviceId != 'false' ? rememberedAudioDeviceId : false;
                rememberedVideoDeviceId = rememberedVideoDeviceId != 'false' ? rememberedVideoDeviceId : false;
                let audioConstraints, videoConstraints;
                if(rememberedAudioDeviceId) {
                    audioConstraints = {deviceId: rememberedAudioDeviceId}
                } else if (rememberedAudioDeviceId === false) {
                    audioConstraints = true;
                    _options.startWith.audio = false;
                } else {
                    audioConstraints = true;
                }

                if(rememberedVideoDeviceId !== false && rememberedVideoDeviceId !== null) {
                    videoConstraints = {deviceId: rememberedVideoDeviceId}
                    _options.startWith.video = true;
                } else if(rememberedVideoDeviceId == false) {
                    videoConstraints = false;
                } else if(startWith.video) {
                    videoConstraints = true;
                } else {
                    videoConstraints = false;
                    _options.startWith.video = false;
                }
                log('start: constraints', videoConstraints, audioConstraints);

                if(Q.info.isMobile || Q.info.isTablet) {
                    log('start: onTextLoad: connect from mobile/tablet browser');

                    if(preparingWindow) {
                        showPreparingDialog(function () {
                            createOrJoinRoomStream(_options.roomId, _options.roomPublisherId);
                        }, function () {
                            connectionState.updateStatus('Disconnected');
                            setTimeout(function() {
                                connectionState.hide();
                            }, 3000);
                            unsetResizeObserver();
                        });
                    } else {

                        let premissionGrantedCallback = function (streams) {
                            _options.streams = _options.streams.concat(streams);

                            if(streams.length != 0) {
                                let audioTracks = streams[0].getAudioTracks();
                                if(audioTracks.length != 0) {
                                    let trackClone = audioTracks[0].clone();
                                    _options.notForUsingTracks.push(trackClone);
                                } else {
                                    Q.confirm('Allow access to microphone to be able to join videoconference', function (result) {
                                        if (!result) return;
                                        module.start();
                                    });
                                    return;
                                }
                            }

                            createOrJoinRoomStream(_options.roomId, _options.roomPublisherId);
                        };

                        if (Q.info.isCordova && Q.info.isAndroid()) {
                            log('start: onTextLoad: isCordova && isAndroid');

                            var showInstructions = function(kind) {
                                var instructionsPermissionDialog = document.createElement('DIV');
                                instructionsPermissionDialog.className = 'Media_webrtc_devices_dialog_inner';
                                var dialogList = document.createElement('OL');
                                dialogList.className = 'Media_webrtc_instructions_dialog';
                                dialogList.innerHTML = `<div>` + text.webrtc.androidInstructionsDialog.permissionDenied.interpolate({kind: kind}) + `</div>
									<li>` + Q.getObject("webrtc.androidInstructionsDialog.point1", text) + `</li>
									<li>` + Q.getObject("webrtc.androidInstructionsDialog.point2", text) + `</li>
									<li>` + text.webrtc.androidInstructionsDialog.point3.interpolate({communityId: Q.Users.communityId}) + `</li>
									<li>` + Q.getObject("webrtc.androidInstructionsDialog.point4", text) + `</li>
									<li>` + text.webrtc.androidInstructionsDialog.point5.interpolate({kind: kind}) + `</li>`;
                                instructionsPermissionDialog.appendChild(dialogList);
                                Q.Dialogs.push({
                                    title: Q.getObject("webrtc.androidInstructionsDialog.dialogTitle", text),
                                    className: 'Media_webrtc_devices_dialog',
                                    content: instructionsPermissionDialog,
                                    apply: true
                                });
                            }

                            var requestMicPermission = function (callback) {
                                cordova.plugins.permissions.checkPermission("android.permission.RECORD_AUDIO", function(result){
                                    if(!result.hasPermission) {
                                        cordova.plugins.permissions.requestPermission("android.permission.RECORD_AUDIO", function(result){
                                            if(!result.hasPermission) {
                                                showInstructions('audio');
                                            } else {
                                                if(callback != null) callback();
                                            }
                                        }, function(){
                                            console.log("Permission is not granted");
                                            console.error("Permission is not granted");
                                        })
                                    } else {
                                        if(callback != null) callback();
                                    }
                                }, function(){
                                    console.log("Permission is not granted");
                                    console.error("Permission is not granted");
                                })
                            }

                            var requestCameraPermission = function (callback) {
                                cordova.plugins.permissions.checkPermission("android.permission.CAMERA", function(result){
                                    if(!result.hasPermission) {
                                        cordova.plugins.permissions.requestPermission("android.permission.CAMERA", function(result){
                                            if(!result.hasPermission) {
                                                showInstructions('video');
                                            } else {
                                                if(callback != null) callback();
                                            }
                                        }, function(){
                                            console.log("Permission is not granted");
                                            console.error("Permission is not granted");
                                        })
                                    } else {
                                        //Permission granted
                                        if(callback != null) callback();
                                    }
                                }, function(){
                                    console.log("Permission is not granted");
                                    console.error("Permission is not granted");
                                })
                            }

                            if(startWith.audio && startWith.video && !_options.audioOnlyMode) {
                                requestMicPermission(function () {
                                    requestCameraPermission(function () {
                                        getMediaStream({video: true, audio: true}).then(function (streams) {
                                            premissionGrantedCallback(streams);
                                        }).catch(function (err) {
                                            console.log(err.name + ": " + err.message);
                                            console.error(err.name + ": " + err.message);
                                            if(err.name == 'NotAllowedError') showInstructionsDialog('camera/microphone');
                                        });
                                    });
                                });
                            } else if (startWith.audio) {
                                requestMicPermission(function () {
                                    getMediaStream({video: false, audio: true}).then(function (streams) {
                                        premissionGrantedCallback(streams);
                                    }).catch(function (err) {
                                        console.log(err.name + ": " + err.message);
                                        console.error(err.name + ": " + err.message);
                                        if(err.name == 'NotAllowedError') showInstructionsDialog('camera/microphone');
                                    });
                                });
                            } else if (startWith.video && !_options.audioOnlyMode) {
                                requestCameraPermission(function () {
                                    getMediaStream({video: true, audio: true}).then(function (streams) {
                                        premissionGrantedCallback(streams);
                                    }).catch(function (err) {
                                        console.log(err.name + ": " + err.message);
                                        console.error(err.name + ": " + err.message);
                                        if(err.name == 'NotAllowedError') showInstructionsDialog('camera/microphone');
                                    });
                                });
                            }

                        } else if(!Q.info.isCordova || (Q.info.isCordova && Q.info.platform === 'ios' && !_options.useCordovaPlugins) || (Q.info.isCordova && Q.info.platform === 'ios' && _options.useCordovaPlugins)){
                            log('start: onTextLoad: isCordova && isiOS');

                            //requesting access to users media. Audio should always be true to avoid autoplay issues
                            if(startWith.video && startWith.audio && !_options.audioOnlyMode) {
                                getMediaStream({video: true, audio: true}).then(function (streams) {
                                    premissionGrantedCallback(streams);
                                }).catch(function (err) {
                                    console.log(err.name + ": " + err.message);
                                    console.error(err.name + ": " + err.message);
                                    if(err.name == 'NotAllowedError') showInstructionsDialog('camera/microphone');
                                });
                            } else {
                                getMediaStream({video: startWith.video, audio: true}).then(function (streams) {
                                    premissionGrantedCallback(streams);
                                }).catch(function (err) {
                                    console.log(err.name + ": " + err.message);
                                    console.error(err.name + ": " + err.message);
                                    if(err.name == 'NotAllowedError') showInstructionsDialog('camera/microphone');
                                });

                            }
                        }
                    }

                } else {

                    log('start: onTextLoad: regular connect (desktop)');

                    if(preparingWindow) {
                        getMediaStream({video: startWith.video, audio: true}).then(function (streams) {
                            showPreparingDialog(function () {
                                createOrJoinRoomStream(_options.roomId, _options.roomPublisherId);
                            }, function () {
                                unsetResizeObserver();
                                connectionState.updateStatus('Disconnected');
                                setTimeout(function() {
                                    connectionState.hide();
                                }, 3000);
                            }, streams);
                        }).catch(function (err) {
                            console.log(err.name + ": " + err.message);
                            console.error(err.name + ": " + err.message);
                            if(err.name == 'NotAllowedError') showInstructionsDialog('camera/microphone');
                        });

                    } else {
                        let premissionGrantedCallback = function (streams) {
                            _options.streams = _options.streams.concat(streams);

                            if(streams.length != 0) {
                                let audioTracks = streams[0].getAudioTracks();
                                if(audioTracks.length != 0) {
                                    let trackClone = audioTracks[0].clone();
                                    _options.notForUsingTracks.push(trackClone);
                                } else {
                                    Q.confirm('Allow access to microphone to be able to join videoconference', function (result) {
                                        if (!result) return;
                                        module.start();
                                    });
                                    return;
                                }
                            }
                            
                            createOrJoinRoomStream(_options.roomId, _options.roomPublisherId);
                        };
                        
                        //requesting access to users media. Audio should always be true to avoid autoplay issues
                        if(startWith.video && startWith.audio && !_options.audioOnlyMode) {
                            getMediaStream({video: videoConstraints, audio: audioConstraints}).then(function (streams) {
                                premissionGrantedCallback(streams);
                            }).catch(function (err) {
                                console.log(err.name + ": " + err.message);
                                console.error(err.name + ": " + err.message);
                                if(err.name == 'NotAllowedError') showInstructionsDialog('camera/microphone');
                            });
                        } else {
                            getMediaStream({video: videoConstraints, audio: audioConstraints}).then(function (streams) {
                                premissionGrantedCallback(streams);
                            }).catch(function (err) {
                                console.log(err.name + ": " + err.message);
                                console.error(err.name + ": " + err.message);
                                if(err.name == 'NotAllowedError') showInstructionsDialog('camera/microphone');
                            });

                        }

                    }


                }

            }

            return module;
        }
        /**
         * Mutes all audio media stream tracks of all participants by setting track.enabled = false
         * we need this method for call center inside livestreaming editor when streamer wants to 
         * interview person who made call request. So it works next way: 1) main room is muted for streamer;
         * 2) streamer started new room with the person who called; 3) main room is unmuted when interview was ended.
         * @method muteRoom
         * @param {function} callback executed when all actions done.
         */
        module.muteRoom = function () {
            webrtcSignalingLib.localMediaControls.muteAllAudio();
        }
        module.unmuteRoom = function () {
            webrtcSignalingLib.localMediaControls.unmuteAllAudio();
        }

        module.switchTo = function (publisherId, streamName, options) {
            log('switch WebRTC conference room', publisherId, streamName);
            log('switch webrtcSignalingLib', webrtcSignalingLib);

            log('switchTo: _options.beforeSwitch', _options.beforeSwitch)
            var publisherToJoinFrom = _roomStream.fields.publisherId;
            var roomIdToJoinFrom = _roomStream.fields.name.replace('Media/webrtc/', '');
            var roomIdToJoinTo = streamName.replace('Media/webrtc/', '');

            if(roomIdToJoinFrom == roomIdToJoinTo && publisherId == publisherToJoinFrom) {
                return Promise.resolve();
            }
            
            module.pendingRoomSwitch = { streamName: 'Media/webrtc/' + roomIdToJoinTo, publisherId: publisherId };

            if(_options.beforeSwitch) {
                return _options.beforeSwitch().then(function () {
                    return continueSwitching();
                });
            } else {
                return continueSwitching();
            }

            function continueSwitching() {
                log('switchTo: promise: onResolve')

                if(notice) connectionState.updateStatus(Q.getObject("webrtc.notices.switchingRoom", text));

                var socket = Q.Socket.get('/webrtc', Q.nodeUrl({webrtc: true}));
                socket.disconnect();

                _events.dispatch('beforeRoomSwitch', {
                    from: {
                        publisherId: _roomStream.fields.publisherId,
                        name: _roomStream.fields.name
                    },
                    to: {
                        publisherId: publisherId,
                        name: streamName
                    }
                });

                return new Promise (function (resolve, reject) {

                    function onPlayEnd() {

                        log('switchTo: createRoomStream')

                        Q.req("Media/webrtc", ["room"], function (err, response) {
                            var msg = Q.firstErrorMessage(err, response && response.errors);

                            if (msg) {
                                return Q.alert(msg);
                            }
                            log('switchTo: createRoomStream: joined/connected');


                            Q.Streams.get(publisherId, 'Media/webrtc/' + roomIdToJoinTo, function (err, stream) {
                                log('switchTo: createRoomStream: joined/connected: pull stream', stream);

                                _roomStream = stream;
                                if(Q.Media.WebRTCRooms == null){
                                    Q.Media.WebRTCRooms = [];
                                }

                                log('switchTo: createOrJoinRoomStream: webrtcSignalingLib', webrtcSignalingLib)

                                bindStreamsEvents(_roomStream);
                                webrtcSignalingLib.switchTo(publisherId, roomIdToJoinTo).then(function (newRoomClientInstance) {
                                    log('switchTo: createOrJoinRoomStream: newRoomClientInstance', newRoomClientInstance)
                                    bindConferenceEvents(newRoomClientInstance);

                                    newRoomClientInstance.event.on('initNegotiationEnded', function () {
                                        log('switchTo: createOrJoinRoomStream: initNegotiationEnded')
                                        webrtcSignalingLib = newRoomClientInstance;

                                        //updateParticipantData();

                                        screensRendering.updateLayout();
                                        module.pendingRoomSwitch = null;
                                        resolve();
                                    });
                                });


                            });

                        }, {
                            method: 'post',
                            fields: {
                                roomId: roomIdToJoinTo,
                                publisherId: publisherId,
                                resumeClosed: options && options.resumeClosed != null ? options.resumeClosed : _options.resumeClosed
                            }
                        });
                    }

                    function playSwitchSound() {
                        log('switchTo: playSwitchSound')

                        let playSwitchSound = Q.Audio.collection[_options.sounds.roomSwitch].audio.play();
                        playSwitchSound.then(function () {
                            log('switchTo: playSwitchSound success')
                            Q.Audio.collection[_options.sounds.roomSwitch].onEnded.set(function () {
                                onPlayEnd()

                                Q.Audio.collection[_options.sounds.roomSwitch].onEnded.remove('Q.WebRTC.switchTo');
                            }, 'Q.WebRTC.switchTo');

                        }).catch(function(e){
                            log('switchTo: playSwitchSound error')
                            onPlayEnd()
                            console.log(e);
                            console.error(e);
                        });
                    }

                    if(Q.Audio.collection[_options.sounds.roomSwitch]) {
                        log('switchTo: playSwitchSound')

                        playSwitchSound();
                    } else {
                        log('switchTo: .Audio.load')

                        Q.Audio.load(_options.sounds.roomSwitch, function () {
                            playSwitchSound();
                        });
                    }
                });
            }
        }

        /**
         * Stops WebRTC conference room (closes all peer2peer connections,
         * clears all timeouts, removes tools)
         * @method stop
         * @param {function} callback executed when all actions done.
         */
        module.stop = function (callback, suspend, byLocalUser) {
            log('WebRTC.stop', webrtcSignalingLib);

            if (!module.isActive() || _roomStream == null) {
                return Q.handle(callback);
            }

            if(webrtcSignalingLib && webrtcSignalingLib.localParticipant() != null) webrtcSignalingLib.localParticipant().online = false;

            if(appDebug.sendReportsInterbal != null) {
                appDebug.sendReportToServer();
                clearTimeout(appDebug.sendReportsInterbal);
            }
            _roomStream.leave();
            if(webrtcSignalingLib) webrtcSignalingLib.disconnect(null, byLocalUser);

            var socket = Q.Socket.get('/webrtc', Q.nodeUrl({webrtc: true}));
            if(socket) {
                socket.disconnect();
                delete Q.Socket.getAll()['/webrtc']
            }

            //_options.streams = [];
            if(!suspend) {
                for(let i in _options.streams) {
                    let tracks = _options.streams[i].getTracks();
                    for(let t in tracks) {
                        tracks[t].stop();
                    }
                }
                _options.streams = [];
            }
            if(_roomsMedia.parentNode != null) _roomsMedia.parentNode.removeChild(_roomsMedia);
            if(_controls != null) {
                var controlsTool = Q.Tool.from(_controls, "Media/webrtc/controls");
                screensRendering.disableLoudesScreenMode();
                if(_controls.parentNode != null) _controls.parentNode.removeChild(_controls);
                Q.Tool.remove(controlsTool);
            }

            _layoutTool.clearCustomGenerators();
            Q.Tool.remove(_layoutTool);
            window.removeEventListener('beforeunload', stop);
            unsetResizeObserver();
            webrtcSignalingLib = null;
            Q.handle(_options.onWebRTCRoomEnded);
            if(window.opener) {
                window.opener.postMessage('webrtcstopped', '*');
            }
            Q.Page.onActivate('').remove('Media.WebRTC');

            var currentRoom = Q.Media.WebRTCRooms.indexOf(module);
            if(currentRoom != -1) {
                Q.Media.WebRTCRooms.splice(currentRoom, 1);
            }
        }

        module.getWebrtcSignalingLib = function () {
            return webrtcSignalingLib;
        }

        module.controls = function () {
            return _controlsTool;
        }

        module.roomsMediaContainer = function () {
            return _roomsMedia;
        }

        module.roomStream = function () {
            return _roomStream;
        }

        module.refreshRoomStream = function () {
            return new Promise(function (resolve, reject) {
                _roomStream.refresh(function () {
                    _roomStream = this;
                    resolve(this);
                }, {evenIfNotRetained: true})
            });
        }

        module.hasPermission = function (permissionName) {
            if(_roomStream.testAdminLevel('manage')) {
                return true;
            }
            
            if(permissionName == 'share') {
                if(!_roomStream.testAdminLevel('share')) {
                    return false;
                }
            } else {
                if(!_roomStream.testWriteLevel('contribute')) {
                    return false;
                }

                if (_roomStream.access.permissions.indexOf(permissionName) != -1) {
                    return true;
                }
                
                return false;
            }  
        }

        module.getOptions = function () {
            return _options;
        }

        module.isActive = function () {
            return webrtcSignalingLib != null && webrtcSignalingLib.state != 'disconnected' ? true : false;
        }

        module.text = function () {
            return Q.Text.collection[Q.Text.language]['Media/content'];
        }

        module.screenRendering = screensRendering;
        module.notice = notice;
        module.events = _events;

        return module;

        /**
         * Event system of app
         *
         * @method app.event
         * @return {Object}
         */
        function EventSystem(){

            var events = {};

            var CustomEvent = function (eventName) {

                this.eventName = eventName;
                this.callbacks = [];

                this.registerCallback = function(callback) {
                    this.callbacks.push(callback);
                }

                this.unregisterCallback = function(callback) {
                    const index = this.callbacks.indexOf(callback);
                    if (index > -1) {
                        this.callbacks.splice(index, 1);
                    }
                }

                this.fire = function(data) {
                    const callbacks = this.callbacks.slice(0);
                    callbacks.forEach((callback) => {
                        callback(data);
                    });
                }
            }

            var dispatch = function(eventName, data) {
                const event = events[eventName];
                if (event) {
                    event.fire(data);
                }
            }

            var on = function(eventName, callback) {
                let event = events[eventName];
                if (!event) {
                    event = new CustomEvent(eventName);
                    events[eventName] = event;
                }
                event.registerCallback(callback);
            }

            var off = function(eventName, callback) {
                const event = events[eventName];
                if (event && event.callbacks.indexOf(callback) > -1) {
                    event.unregisterCallback(callback);
                    if (event.callbacks.length === 0) {
                        delete events[eventName];
                    }
                }
            }

            var destroy = function () {
                events = {};
            }

            return {
                dispatch:dispatch,
                on:on,
                off:off,
                destroy:destroy
            }
        }

        function log(text) {
            if(_debug === false) return;
            var args = Array.prototype.slice.call(arguments);
            var params = [];

            if (window.performance) {
                var now = (window.performance.now() / 1000).toFixed(3);
                params.push(now + ": " + args.splice(0, 1));
                params = params.concat(args);
                console.log.apply(console, params);
            } else {
                params = params.concat(args);
                console.log.apply(console, params);
            }
            appDebug.logInfo(params);
        }

        function determineBrowser(ua) {
            var ua= navigator.userAgent, tem,
                M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
            if(/trident/i.test(M[1])){
                tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
                return 'IE '+(tem[1] || '');
            }
            if(M[1]=== 'Chrome'){
                tem= ua.match(/\b(OPR|Edge?)\/(\d+)/);
                if(tem!= null) return tem.slice(1).join(' ').replace('OPR', 'Opera').replace('Edg ', 'Edge ');
            }
            M= M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
            if((tem= ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
            return M;
        }
    };

    /**
     * Start live stream conference related to some stream.
     * @method WebRTC.start
     * @param {Object} options options for the method
     * @param {String} options.publisherId Required. Publisher of stream to which webrtc will be related.
     * @param {String} options.streamName Required. Name of stream to which webrtc will be related.
     * @param {String} [options.relationType='Media/webrtc']
     * @param {HTMLElement} [options.element=document.body] Parent DOM element where video screens will be rendered
     * @param {String} [options.tool=true] Tool to relate Q.events to. By default true used - which means page.
     * @param {String} [options.resumeClosed=true]  If false, close stream completely (unrelate) when last participant
     * left, and create new stream next time instead resume.
     * @param {Function} [options.onWebrtcControlsCreated] Callback called when Webrtc Controls Created
     * @param {Function} [options.onStart] Callback called when Webrtc started.
     * @param {Function} [options.onEnd] Callback called when Webrtc ended.
     */
    Media.WebRTC.start = function (options) {
        options = Q.extend({
            element: document.body,
            mode: 'node',
            tool: true,
            relationType: "Media/webrtc",
            resumeClosed: true
        }, options);

        let conference = Q.Media.WebRTC({
            audioOnlyMode: options.audioOnlyMode,
            element: options.element,
            roomId: options.roomId,
            roomPublisherId: options.roomPublisherId || options.publisherId,
            defaultDesktopViewMode: options.defaultDesktopViewMode,
            defaultMobileViewMode: options.defaultDesktopViewMode,
            writeLevel: options.writeLevel,
            resumeClosed: options.resumeClosed,
            closeManually: options.closeManually,
            description: options.description,
            useRelatedTo: !!options.useRelatedTo,
            relate: {
                publisherId: options.publisherId,
                streamName: options.streamName,
                relationType: options.relationType
            },
            onWebrtcControlsCreated: function () {
                //TODO: for some reason this.Q.beforeRemove doesn't call when user leave conference
                // may be tool doesn't close at all?

                Q.handle(options.onWebrtcControlsCreated, this);

                this.Q.beforeRemove.set(function () {
                    Q.handle(options.onEnd, this);
                }, this);

                // this is duplicate to above approach
                /*Q.Streams.Stream.onMessage(stream.fields.publisherId, stream.fields.name, 'Streams/left').set(function(message) {
                    if (message.byUserId !== userId) {
                        return;
                    }

                    Q.handle(options.onEnd, this);
                }, options.tool);*/
            },
            onWebRTCRoomCreated: function () {
                Q.handle(options.onStart, this);
            },
            onWebRTCRoomEnded: function () {
                Q.handle(options.onEnd, this);
            }
        });
        Q.Socket.onConnect().addOnce(function () {
            conference.start();
        });

        return conference;

    }
})(Q, Q.jQuery);