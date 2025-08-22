(function ($, window, undefined) {

    var _icons = {
        accessIcon: '<svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"> <g> <g> <g> <path d="M131.5,472H60.693c-8.538,0-13.689-4.765-15.999-7.606c-3.988-4.906-5.533-11.29-4.236-17.519 c20.769-99.761,108.809-172.616,210.445-174.98c1.693,0.063,3.39,0.105,5.097,0.105c1.722,0,3.434-0.043,5.142-0.107 c24.853,0.567,49.129,5.24,72.236,13.917c10.34,3.885,21.871-1.352,25.754-11.693c3.883-10.34-1.352-21.871-11.693-25.754 c-3.311-1.244-6.645-2.408-9.995-3.512C370.545,220.021,392,180.469,392,136C392,61.01,330.991,0,256,0 c-74.991,0-136,61.01-136,136c0,44.509,21.492,84.092,54.643,108.918c-30.371,9.998-58.871,25.546-83.813,46.062 c-45.732,37.617-77.529,90.086-89.532,147.743c-3.762,18.066,0.744,36.622,12.363,50.908C25.221,503.847,42.364,512,60.693,512 H131.5c11.046,0,20-8.954,20-20C151.5,480.954,142.546,472,131.5,472z M160,136c0-52.935,43.065-96,96-96s96,43.065,96,96 c0,51.367-40.554,93.438-91.326,95.885c-1.557-0.028-3.114-0.052-4.674-0.052c-1.564,0-3.127,0.023-4.689,0.051 C200.546,229.43,160,187.362,160,136z"/> <path d="M496.689,344.607c-8.561-19.15-27.845-31.558-49.176-31.607h-62.372c-0.045,0-0.087,0-0.133,0 c-22.5,0-42.13,13.26-50.029,33.807c-1.051,2.734-2.336,6.178-3.677,10.193H200.356c-5.407,0-10.583,2.189-14.35,6.068 l-34.356,35.388c-7.567,7.794-7.529,20.203,0.085,27.95l35,35.612c3.76,3.826,8.9,5.981,14.264,5.981h65c11.046,0,20-8.954,20-20 c0-11.046-8.954-20-20-20h-56.614l-15.428-15.698L208.814,397h137.491c9.214,0,17.235-6.295,19.426-15.244 c1.618-6.607,3.648-12.959,6.584-20.596c1.936-5.036,6.798-8.16,12.741-8.16c0.013,0,0.026,0,0.039,0h62.371 c5.656,0.013,10.524,3.053,12.705,7.932c5.369,12.012,11.78,30.608,11.828,50.986c0.048,20.529-6.356,39.551-11.739,51.894 c-2.17,4.978-7.079,8.188-12.56,8.188c-0.011,0-0.022,0-0.033,0h-63.125c-5.533-0.013-10.716-3.573-12.896-8.858 c-2.339-5.671-4.366-12.146-6.197-19.797c-2.571-10.742-13.367-17.366-24.105-14.796c-10.743,2.571-17.367,13.364-14.796,24.106 c2.321,9.699,4.978,18.118,8.121,25.738c8.399,20.364,27.939,33.555,49.827,33.606h63.125c0.043,0,0.083,0,0.126,0 c21.351-0.001,40.647-12.63,49.18-32.201c6.912-15.851,15.137-40.511,15.072-67.975 C511.935,384.434,503.638,360.153,496.689,344.607z"/> <circle cx="431" cy="412" r="20"/> </g> </g> </g> </svg>',
        timerIcon: '<svg version="1.1" id="fi_833614" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g> <g> <g> <path d="M391.84,48.87l54.306,45.287c3.739,3.119,8.281,4.641,12.798,4.641c5.729,0,11.415-2.448,15.371-7.191 c7.074-8.483,5.932-21.095-2.552-28.169L417.457,18.15c-8.481-7.074-21.094-5.933-28.169,2.551 C382.214,29.184,383.356,41.795,391.84,48.87z"></path> <path d="M53.057,98.797c4.516,0,9.059-1.522,12.798-4.641L120.16,48.87c8.483-7.074,9.626-19.686,2.552-28.169 c-7.073-8.482-19.686-9.625-28.169-2.551L40.237,63.437c-8.483,7.074-9.626,19.686-2.552,28.169 C41.642,96.349,47.328,98.797,53.057,98.797z"></path> <path d="M422.877,109.123C383.051,69.297,331.494,45.474,276,40.847V20c0-11.046-8.954-20-20-20c-11.046,0-20,8.954-20,20v20.847 c-55.494,4.627-107.051,28.449-146.877,68.275C44.548,153.697,20,212.962,20,276s24.548,122.303,69.123,166.877 C133.697,487.452,192.962,512,256,512c50.754,0,99.118-15.869,139.864-45.894c8.893-6.552,10.789-19.072,4.237-27.965 c-6.553-8.894-19.074-10.789-27.966-4.237C338.313,458.827,298.154,472,256,472c-108.075,0-196-87.925-196-196S147.925,80,256,80 s196,87.925,196,196c0,33.01-8.354,65.638-24.161,94.356c-5.326,9.677-1.799,21.839,7.878,27.165 c9.674,5.324,21.838,1.8,27.165-7.878C481.931,355.032,492,315.735,492,276C492,212.962,467.452,153.697,422.877,109.123z"></path> <path d="M353.434,155.601c-8.584-6.947-21.178-5.622-28.128,2.965l-63.061,77.925C260.209,236.17,258.124,236,256,236 c-22.056,0-40,17.944-40,40c0,22.056,17.944,40,40,40c22.056,0,40-17.944,40-40c0-5.052-0.951-9.884-2.668-14.338l63.067-77.933 C363.348,175.142,362.021,162.548,353.434,155.601z"></path> </g> </g></g></svg>'
    }

    function log() { }
    if (Q.Media.WebRTCdebugger) {
        log = Q.Media.WebRTCdebugger.createLogMethod('settings.js')
    }

    /**
     * Media/webrtc/settings tool.
     * Parent tool for permissions and limits manager tools
     * @module Media
     * @class Media webrtc
     * @constructor
     * @param {Object} options
     *  Hash of possible options
     */
    Q.Tool.define("Media/webrtc/settings", function (options) {
        var tool = this;
        tool.navItems = [];

        tool.loadStyles().then(function () {
            tool.loadRoomStream().then(function () {
                tool.createUI();
                //tool.declareEventsHandlers();
                Q.handle(tool.state.onLoad, tool, []);
            });
        });
    },

        {
            publisherId: null,
            streamName: null,
            onRefresh: new Q.Event(),
            onLoad: new Q.Event(),
        },

        {
            refresh: function () {
                tool.loadRoomStream().then(function () {
                    tool.createUI();
                });
            },
            loadStyles: function () {
                return new Promise(function (resolve, reject) {
                    Q.addStylesheet('{{Media}}/css/tools/webrtcSettings.css?ts=' + Date.now(), function () {
                        resolve();
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

                roomStream.onMessage("Media/webrtc/turnLimitsOnOrOff").set(function (message) {
                    onMessageHandler(message, 'turnLimitsOnOrOff');
                }, tool);
                roomStream.onMessage("Media/webrtc/updateLimits").set(function (message) {
                    onMessageHandler(message, 'updateLimits');
                }, tool);
            },
            createUI: function () {
                var tool = this;

                let settingsContainer = tool.settingsUI = document.createElement('DIV');
                settingsContainer.className = 'webrtc-settings';

                let settingsContainerInner = document.createElement('DIV');
                settingsContainerInner.className = 'webrtc-settings-container';
                settingsContainer.appendChild(settingsContainerInner);

                let settingsNavigation = document.createElement('DIV');
                settingsNavigation.className = 'settings-navigation';
                settingsContainerInner.appendChild(settingsNavigation);

                let settingsNavigationInner = document.createElement('DIV');
                settingsNavigationInner.className = 'settings-navigation-inner';
                settingsNavigation.appendChild(settingsNavigationInner);

                settingsNavigationInner.appendChild(createNavitem({
                    key: 'permissions',
                    text: 'Permissions',
                    icon: 'accessIcon',
                    className: 'settings-item-permissions'
                }));

                settingsNavigationInner.appendChild(createNavitem({
                    key: 'limits',
                    text: 'Time limits',
                    icon: 'timerIcon',
                    className: 'settings-item-limits'
                }));

                let settingsParamsContainer = tool.settingsParams = document.createElement('DIV');
                settingsParamsContainer.className = 'settings-params';
                settingsContainer.appendChild(settingsParamsContainer);

                if(settingsNavigationInner.firstChild) settingsNavigationInner.firstChild.click();

                function createNavitem(options) {
                    let navItem = document.createElement('DIV');
                    navItem.className = 'settings-item settings-item-permissions';
                    if(options.className) {
                        navItem.classList.add(options.className);
                    }

                    let navItemIcon = document.createElement('DIV');
                    navItemIcon.className = 'settings-item-icon';
                    navItemIcon.innerHTML = _icons[options.icon];
                    navItem.appendChild(navItemIcon);

                    let navItemText = document.createElement('DIV');
                    navItemText.className = 'settings-item-text';
                    navItemText.innerHTML = options.text;
                    navItem.appendChild(navItemText);

                    let navItemObject = {
                        navEl: navItem,
                        navKey: options.key
                    }

                    navItem.addEventListener('click', function () {
                        tool.navItemHandler(navItemObject);
                    });

                    tool.navItems.push(navItemObject);

                    return navItem;
                }

            },
            navItemHandler: function (e) {
                var tool = this;
                for(let i in tool.navItems) {
                    tool.navItems[i].navEl.classList.remove('settings-item-active');
                }

                e.navEl.classList.add('settings-item-active');

                tool.showSettings(e.navKey);
            },
            showSettings: function (key) {
                var tool = this;
                if(key == 'permissions') {
                    if(!tool.permissionsManagerTool) {
                        tool.activatePermissionsManager().then(function () {
                            showSettings();
                        });
                    } else {
                        showSettings();
                    }
                    
                    function showSettings() {
                        tool.settingsParams.innerHTML = '';
                        tool.settingsParams.appendChild(tool.permissionsManagerTool.permissionsManagerUI);
                    }
                } else if(key == 'limits') {
                    if(!tool.limitsManagerTool) {
                        tool.activateLimitsManager().then(function () {
                            showSettings();
                        });
                    } else {
                        showSettings();
                    }
                    
                    function showSettings() {
                        tool.settingsParams.innerHTML = '';
                        tool.settingsParams.appendChild(tool.limitsManagerTool.limitsManagerUI);
                    }
                }
            },
            activatePermissionsManager: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.activate(
                        Q.Tool.setUpElement('DIV', 'Media/webrtc/permissionsManager', {
                            publisherId: tool.roomStream.fields.publisherId,
                            streamName: tool.roomStream.fields.name,
                            onLoad: function () {
                                resolve();
                            },
                        }),
                        {},
                        function () {
                            tool.permissionsManagerTool = this;
                        }
                    );
                });
            },
            activateLimitsManager: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.activate(
                        Q.Tool.setUpElement('DIV', 'Media/webrtc/limitsManager', {
                            publisherId: tool.roomStream.fields.publisherId,
                            streamName: tool.roomStream.fields.name,
                            onLoad: function () {
                                resolve();
                            },
                        }),
                        {},
                        function () {
                            tool.limitsManagerTool = this;
                        }
                    );
                });
            }
        }
    );

})(window.jQuery, window);