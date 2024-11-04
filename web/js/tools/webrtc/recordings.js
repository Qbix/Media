(function ($, window, undefined) {

    function log() { }
    if (Q.Media.WebRTCdebugger) {
        log = Q.Media.WebRTCdebugger.createLogMethod('recordings.js')
    }

    var _icons = {
        cloud: '<svg id="fi_2930014" enable-background="new 0 0 512 512" height="512" viewBox="0 0 512 512" width="512" xmlns="http://www.w3.org/2000/svg"><g id="Cloud_1_"><g><path d="m421 406h-330c-24.05 0-46.794-9.327-64.042-26.264-17.384-17.069-26.958-39.705-26.958-63.736s9.574-46.667 26.958-63.736c13.614-13.368 30.652-21.995 49.054-25.038-.008-.406-.012-.815-.012-1.226 0-66.168 53.832-120 120-120 24.538 0 48.119 7.387 68.194 21.363 14.132 9.838 25.865 22.443 34.587 37.043 14.079-8.733 30.318-13.406 47.219-13.406 44.886 0 82.202 33.026 88.921 76.056 18.811 2.88 36.244 11.581 50.122 25.208 17.383 17.069 26.957 39.704 26.957 63.736s-9.574 46.667-26.957 63.736c-17.249 16.937-39.993 26.264-64.043 26.264zm-330-150c-33.636 0-61 26.916-61 60s27.364 60 61 60h330c33.636 0 61-26.916 61-60s-27.364-60-61-60h-15v-15c0-33.084-26.916-60-60-60-15.766 0-30.68 6.12-41.995 17.233l-16.146 15.858-8.315-21.049c-13.689-34.651-46.482-57.042-83.544-57.042-49.626 0-90 40.374-90 90 0 3.544.556 7.349 1.144 11.378l2.687 18.622z"></path></g></g></svg>',
        local: '<svg id="fi_4173210" height="512" viewBox="0 0 32 32" width="512" xmlns="http://www.w3.org/2000/svg" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" sodipodi:docname="ui-drive-harddisk-ssd-hdd.svg" inkscape:version="1.0.1 (3bc2e813f5, 2020-09-07)"><g id="layer1" inkscape:groupmode="layer" inkscape:label="Design"><path id="path1345" d="m9.0681 6.99993c-1.144 0-2.0586.64037-2.6055 1.35156-1.248 2.01914-2.345 4.02539-3.5703 6.14844-.4772.82647-.8812 1.69622-.8923 2.50014v4c0 2.1987 1.8013 4 4 4h20c2.1987 0 4-1.8013 4-4v-4c-.069-.98121-.4762-1.83313-.8923-2.50014-1.2873-2.17743-2.3402-4.13744-3.5844-6.12886-.5345-.71018-1.4416-1.37109-2.5918-1.37109zm0 2h13.8594c.5118 0 .6647.13454.9941.57227.7395 1.19978 1.3445 2.28157 2.0059 3.42773h-19.8594c.6605-1.13599 1.3367-2.34265 1.9805-3.42969.3298-.42897.5015-.57031 1.0195-.57031zm-3.0703 6h20c1.1253 0 2 .8747 2 2v4c0 1.1253-.8747 2-2 2h-20c-1.1253 0-2-.8747-2-2v-4c0-1.1253.8747-2 2-2z" sodipodi:nodetypes="ccccsssscccccssccccssssssssss" inkscape:connector-curvature="0" font-variant-ligatures="normal" font-variant-position="normal" font-variant-caps="normal" font-variant-numeric="normal" font-variant-alternates="normal" font-feature-settings="normal" text-indent="0" text-align="start" text-decoration-line="none" text-decoration-style="solid" text-decoration-color="rgb(0,0,0)" text-transform="none" text-orientation="mixed" white-space="normal" shape-padding="0" isolation="auto" mix-blend-mode="normal" solid-color="rgb(0,0,0)" solid-opacity="1" vector-effect="none" paint-order="normal"></path><path id="path1347" d="m24 18.99998a.99999995.99999495 0 0 1 -1 1.00002.99999995.99999495 0 0 1 -1-1.00002.99999995.99999495 0 0 1 1-.99998.99999995.99999495 0 0 1 1 .99998z" inkscape:connector-curvature="0" paint-order="normal"></path><path id="path1349" d="m18.9862 19.99993h-9.9741967c-1.3523.0191-1.3523-2.01914 0-2h9.9741967c.5638-.008 1.0225.45187 1.0138 1.0095-.01.55764-.4623.99805-1.0138.9905z" sodipodi:nodetypes="cccccc" inkscape:connector-curvature="0" font-variant-ligatures="normal" font-variant-position="normal" font-variant-caps="normal" font-variant-numeric="normal" font-variant-alternates="normal" font-feature-settings="normal" text-indent="0" text-align="start" text-decoration-line="none" text-decoration-style="solid" text-decoration-color="rgb(0,0,0)" text-transform="none" text-orientation="mixed" white-space="normal" shape-padding="0" isolation="auto" mix-blend-mode="normal" solid-color="rgb(0,0,0)" solid-opacity="1" vector-effect="none"></path></g></svg>',
        download: '<svg id="fi_7268609" enable-background="new 0 0 515.283 515.283" height="512" viewBox="0 0 515.283 515.283" width="512" xmlns="http://www.w3.org/2000/svg"><g><g><g><g><path d="m400.775 515.283h-286.268c-30.584 0-59.339-11.911-80.968-33.54-21.628-21.626-33.539-50.382-33.539-80.968v-28.628c0-15.811 12.816-28.628 28.627-28.628s28.627 12.817 28.627 28.628v28.628c0 15.293 5.956 29.67 16.768 40.483 10.815 10.814 25.192 16.771 40.485 16.771h286.268c15.292 0 29.669-5.957 40.483-16.771 10.814-10.815 16.771-25.192 16.771-40.483v-28.628c0-15.811 12.816-28.628 28.626-28.628s28.628 12.817 28.628 28.628v28.628c0 30.584-11.911 59.338-33.54 80.968-21.629 21.629-50.384 33.54-80.968 33.54zm-143.134-114.509c-3.96 0-7.73-.804-11.16-2.257-3.2-1.352-6.207-3.316-8.838-5.885-.001-.001-.001-.002-.002-.002-.019-.018-.038-.037-.057-.056-.005-.004-.011-.011-.016-.016-.016-.014-.03-.029-.045-.044-.01-.01-.019-.018-.029-.029-.01-.01-.023-.023-.032-.031-.02-.02-.042-.042-.062-.062l-114.508-114.509c-11.179-11.179-11.179-29.305 0-40.485 11.179-11.179 29.306-11.18 40.485 0l65.638 65.638v-274.409c-.001-15.811 12.815-28.627 28.626-28.627s28.628 12.816 28.628 28.627v274.408l65.637-65.637c11.178-11.179 29.307-11.179 40.485 0 11.179 11.179 11.179 29.306 0 40.485l-114.508 114.507c-.02.02-.042.042-.062.062-.011.01-.023.023-.032.031-.01.011-.019.019-.029.029-.014.016-.03.03-.044.044-.005.005-.012.012-.017.016-.018.019-.037.038-.056.056-.001 0-.001.001-.002.002-.315.307-.634.605-.96.895-2.397 2.138-5.067 3.805-7.89 4.995-.01.004-.018.008-.028.012-.011.004-.02.01-.031.013-3.412 1.437-7.158 2.229-11.091 2.229z" fill="rgb(0,0,0)"></path></g></g></g></g></svg>',
        inProgress: '<svg id="fi_7154465" height="512" viewBox="0 0 24 24" width="512" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1"><path d="m12.1 19.58a1.746 1.746 0 0 1 -.872-.234l-5.2-3a1.752 1.752 0 0 1 -.64-2.391l.75-1.3a4.4 4.4 0 0 1 3.462-1.831.235.235 0 0 0 .18-.313 4.4 4.4 0 0 1 -.146-3.917l.75-1.3a1.754 1.754 0 0 1 2.39-.641l5.2 3a1.752 1.752 0 0 1 .64 2.391l-.75 1.3a4.4 4.4 0 0 1 -3.464 1.832.233.233 0 0 0 -.18.312 4.4 4.4 0 0 1 .146 3.918l-.75 1.3a1.75 1.75 0 0 1 -1.516.874zm-.2-13.66a.25.25 0 0 0 -.217.125l-.75 1.3a3.092 3.092 0 0 0 .23 2.585 1.737 1.737 0 0 1 -1.377 2.384 3.093 3.093 0 0 0 -2.353 1.093l-.75 1.3a.25.25 0 0 0 .091.342l5.2 3a.252.252 0 0 0 .341-.092l.75-1.3a3.092 3.092 0 0 0 -.23-2.585 1.735 1.735 0 0 1 1.377-2.383 3.1 3.1 0 0 0 2.353-1.094l.75-1.3a.25.25 0 0 0 -.091-.342l-5.2-3a.253.253 0 0 0 -.124-.033z"></path><path d="m22 12.75a.75.75 0 0 1 -.75-.75 9.25 9.25 0 0 0 -15.791-6.541 9.427 9.427 0 0 0 -.862.993.75.75 0 0 1 -1.2-.9 11.235 11.235 0 0 1 1-1.15 10.75 10.75 0 0 1 18.353 7.598.75.75 0 0 1 -.75.75z"></path><path d="m12 22.75a10.748 10.748 0 0 1 -10.75-10.75.75.75 0 0 1 1.5 0 9.25 9.25 0 0 0 15.791 6.541 9.331 9.331 0 0 0 .861-.992.751.751 0 0 1 1.2.9 11.087 11.087 0 0 1 -1 1.151 10.684 10.684 0 0 1 -7.602 3.15z"></path><path d="m20.485 21.235a.75.75 0 0 1 -.75-.75v-2.078h-2.079a.75.75 0 0 1 0-1.5h2.829a.75.75 0 0 1 .75.75v2.828a.75.75 0 0 1 -.75.75z"></path><path d="m6.343 7.093h-2.828a.75.75 0 0 1 -.75-.75v-2.828a.75.75 0 0 1 1.5 0v2.078h2.078a.75.75 0 0 1 0 1.5z"></path></svg>',
        startProcess: '<svg id="fi_4438685" enable-background="new 0 0 512.022 512.022" height="512" viewBox="0 0 512.022 512.022" width="512" xmlns="http://www.w3.org/2000/svg"><g><g id="Page-1_30_"><g id="_x30_31---Rotate-Video"><g clip-rule="evenodd" fill-rule="evenodd"><path id="Path_162_" d="m35.31 229.529v19.986c.017 4.591-3.486 8.428-8.06 8.828l-17.655 1.545c-2.464.215-4.904-.613-6.728-2.283s-2.864-4.028-2.867-6.501c0-9.172 0-21.575 0-21.575.029-9.739 7.917-17.626 17.655-17.655 4.684-.025 9.177 1.855 12.447 5.208 3.353 3.27 5.233 7.763 5.208 12.447z"></path><path id="Path_161_" d="m41.931 336.343-16.084 7.486c-2.242 1.049-4.822 1.108-7.11.163s-4.074-2.807-4.922-5.132c-3.794-10.957-6.818-22.166-9.048-33.545-.439-2.445.173-4.961 1.685-6.932s3.784-3.213 6.26-3.423l17.796-1.554c4.513-.365 8.57 2.743 9.393 7.194 1.683 8.409 3.888 16.706 6.603 24.841 1.493 4.269-.481 8.976-4.573 10.902z"></path><path id="Path_160_" d="m82.37 404.659-12.526 12.526c-1.743 1.762-4.146 2.711-6.623 2.613-2.477-.097-4.798-1.232-6.398-3.125-7.264-8.975-13.9-18.44-19.862-28.328-1.246-2.144-1.534-4.713-.791-7.079.742-2.366 2.446-4.311 4.693-5.359l16.075-7.53c4.112-1.892 8.989-.367 11.29 3.531 4.494 7.266 9.42 14.255 14.751 20.93 2.86 3.514 2.597 8.621-.609 11.821z"></path><path id="Path_159_" d="m143.678 455.074-7.53 16.075c-1.048 2.248-2.993 3.951-5.359 4.693s-4.935.455-7.079-.791c-9.888-5.962-19.353-12.598-28.328-19.862-1.9-1.593-3.042-3.911-3.148-6.388s.835-4.884 2.592-6.633l12.526-12.526c3.208-3.176 8.296-3.42 11.794-.565 6.708 5.319 13.73 10.231 21.027 14.707 3.888 2.31 5.401 7.184 3.505 11.29z"></path><path id="Path_158_" d="m218.58 481.504-1.554 17.796c-.209 2.475-1.452 4.747-3.423 6.26-1.971 1.512-4.487 2.124-6.932 1.685-11.379-2.231-22.588-5.254-33.545-9.048-2.325-.849-4.187-2.635-5.132-4.922-.945-2.288-.886-4.867.163-7.11l7.512-16.084c1.926-4.087 6.627-6.061 10.893-4.573 8.135 2.715 16.431 4.92 24.841 6.603 4.445.831 7.543 4.886 7.177 9.393z"></path><path id="Path_157_" d="m302.53 497.949c.648 2.385.266 4.933-1.053 7.024s-3.454 3.533-5.886 3.975c-7.592 1.236-15.286 2.098-23.084 2.586-3.884.247-7.739.406-11.564.477-2.48-.002-4.844-1.047-6.515-2.879s-2.494-4.282-2.269-6.752l1.554-17.708c.422-4.501 4.157-7.967 8.678-8.051 6.179-.185 12.491-.653 18.856-1.333 2.375-.256 4.74-.547 7.062-.883 4.388-.592 8.526 2.192 9.631 6.479z"></path><path id="Path_156_" d="m379.533 479.87c-10.098 5.676-20.588 10.623-31.391 14.804-2.332.855-4.915.688-7.118-.459-2.202-1.147-3.82-3.169-4.455-5.57l-4.537-16.967c-1.142-4.363 1.187-8.885 5.402-10.487 7.98-3.147 15.752-6.797 23.27-10.929 3.947-2.245 8.952-1.13 11.573 2.578l10.028 14.327c1.422 2.021 1.931 4.546 1.404 6.96-.527 2.415-2.041 4.498-4.176 5.743z"></path><path id="Path_155_" d="m448.486 424.062c-7.588 8.683-15.752 16.846-24.435 24.435-1.896 1.604-4.38 2.336-6.843 2.015s-4.677-1.664-6.098-3.701l-9.984-14.248c-2.577-3.713-1.933-8.774 1.492-11.723 6.438-5.697 12.523-11.782 18.22-18.22 2.951-3.417 8.005-4.057 11.714-1.483l14.239 9.984c2.038 1.42 3.383 3.633 3.706 6.096.322 2.463-.408 4.948-2.011 6.845z"></path><path id="Path_154_" d="m494.663 348.154c-4.181 10.803-9.128 21.293-14.804 31.391-1.245 2.134-3.328 3.649-5.743 4.176-2.414.527-4.939.018-6.96-1.404l-14.301-10.028c-3.707-2.621-4.822-7.626-2.578-11.573 4.131-7.517 7.782-15.29 10.929-23.27 1.603-4.215 6.125-6.545 10.487-5.402l16.967 4.537c2.396.641 4.411 2.261 5.553 4.463s1.305 4.782.45 7.11z"></path><path id="Path_153_" d="m511.479 272.519c-.494 7.792-1.357 15.487-2.587 23.084-.443 2.428-1.882 4.56-3.969 5.878-2.086 1.318-4.63 1.703-7.013 1.061l-17.046-4.555c-4.284-1.109-7.063-5.245-6.471-9.631.344-2.357.636-4.723.883-7.062 10.649-92.516-37.922-181.76-121.395-223.05s-183.881-25.737-250.951 38.871h54.872c8.893-.21 16.67 5.956 18.494 14.663.882 5.13-.544 10.389-3.899 14.369-3.354 3.981-8.295 6.278-13.5 6.278h-97.104c-9.739-.029-17.626-7.917-17.655-17.655v-96.008c-.213-8.893 5.955-16.669 14.663-18.485 5.129-.882 10.386.543 14.366 3.896 3.98 3.352 6.279 8.29 6.282 13.494v53.142c76.271-72.808 189.395-91.374 284.938-46.766s153.94 143.255 147.092 248.476z"></path><path id="Path_152_" d="m237.153 212.801c-3.443-2.534-7.636.503-7.636 4.855v76.712c0 4.414 4.237 7.362 7.636 4.855l51.844-38.356c1.467-1.185 2.32-2.969 2.32-4.855s-.853-3.67-2.32-4.855z"></path></g><path id="Shape_88_" d="m256 150.081c-58.504 0-105.931 47.427-105.931 105.931s47.427 105.931 105.931 105.931 105.931-47.427 105.931-105.931c0-28.095-11.161-55.039-31.026-74.905-19.866-19.866-46.81-31.026-74.905-31.026zm43.502 124.972-51.844 38.338c-6.684 5.005-15.629 5.782-23.075 2.004-7.887-4.027-12.815-12.172-12.721-21.027v-76.712c-.101-8.862 4.828-17.015 12.721-21.045 7.448-3.77 16.389-2.993 23.075 2.004l51.844 38.356c5.961 4.516 9.464 11.563 9.464 19.041s-3.502 14.525-9.464 19.041z"></path></g></g></g></svg>',
        remove: '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.87 122.87"><title>remove</title><path d="M18,18A61.45,61.45,0,1,1,0,61.44,61.28,61.28,0,0,1,18,18ZM77.38,39l6.53,6.54a4,4,0,0,1,0,5.63L73.6,61.44,83.91,71.75a4,4,0,0,1,0,5.63l-6.53,6.53a4,4,0,0,1-5.63,0L61.44,73.6,51.13,83.91a4,4,0,0,1-5.63,0L39,77.38a4,4,0,0,1,0-5.63L49.28,61.44,39,51.13a4,4,0,0,1,0-5.63L45.5,39a4,4,0,0,1,5.63,0L61.44,49.28,71.75,39a4,4,0,0,1,5.63,0ZM61.44,10.54a50.91,50.91,0,1,0,36,14.91,50.83,50.83,0,0,0-36-14.91Z"/></svg>'
    }    

    /**
     * Media/webrtc/recordings tool.
     * Shows local and server webrtc recordings
     * @module Media
     * @class Media webrtc
     * @constructor
     * @param {Object} options
     *  Hash of possible options
     */
    Q.Tool.define("Media/webrtc/recordings", function (options) {
        var tool = this;
        tool.listContainer = null;
        tool.serverRecordingsList = null;
        tool.relatedServerRecordingsTool = null;
        tool.paginationEl = null;
        tool.tabItems = [];
        
        tool.loadIndexedDbAPI().then(function () {
            return tool.loadRoomStream();
        }).then(function () {
            return tool.localRecordingsDB.init();
        }).then(function () {
            return navigator.storage.getDirectory();
        }).then(function (opfsRoot) {
            tool.opfsRoot = opfsRoot;
            return tool.opfsRoot.getDirectoryHandle("temp", {
                create: true,
            })
        }).then(function (tempDir) {
            tool.opfstempDir = tempDir;
           
            tool.createUI();
            Q.handle(tool.state.onLoad, tool, []);
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
               /*  tool.loadRoomStream().then(function () {
                    tool.createUI();
                }); */
            },
            loadIndexedDbAPI: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.addScript([
                        '{{Media}}/js/tools/webrtc/IndexedDbAPI.js',
                    ], function () {
                        tool.localRecordingsDB = Q.Media.WebRTC.indexedDbAPI('localRecodingsDB', {
                            version: 5,
                            stores: [
                                {
                                    name: 'recordings',
                                    indexes: [
                                        {name: 'startTime', unique: false},
                                        {name: 'roomKey', unique: false},
                                        {name: 'recordingId', unique: true}
                                    ]
                                },
                                {
                                    name: 'recordingsChunks',
                                    indexes: [
                                        {name: 'startTime', unique: false},
                                        {name: 'roomKey', unique: false}
                                    ]
                                }
                            ],
                            
                        });
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
            createUI: function () {
                var tool = this;

                var recordingCon = document.createElement('DIV');
                recordingCon.className = 'webrtc-recordings';
                tool.element.appendChild(recordingCon);

                var recordingsTabs = document.createElement('DIV');
                recordingsTabs.className = 'webrtc-recordings-tabs';
                recordingCon.appendChild(recordingsTabs);
                
                recordingsTabs.appendChild(createTab({
                    key: 'local',
                    icon: 'local',
                    text: 'Local',
                    touchlabel: 'Local Recordings (double click to reload)'
                }));

                /* recordingsTabs.appendChild(createTab({
                    key: 'cloud',
                    icon: 'cloud',
                    text: 'Cloud',
                    touchlabel: 'Cloud Recordings (double click to reload)'
                })); */

                function createTab(options) {
                    let recordingsTab = document.createElement('DIV');
                    recordingsTab.className = 'webrtc-recordings-tabs-item';
                    recordingsTab.dataset.touchlabel = options.touchlabel;
                    recordingsTabs.appendChild(recordingsTab);
                    let recordingsTabIcon = document.createElement('DIV');
                    recordingsTabIcon.className = 'webrtc-recordings-tabs-item-icon';
                    recordingsTabIcon.innerHTML = _icons[options.icon];
                    recordingsTab.appendChild(recordingsTabIcon);
                    let recordingsTabText = document.createElement('DIV');
                    recordingsTabText.className = 'webrtc-recordings-tabs-item-text';
                    recordingsTabText.innerHTML = options.text;
                    recordingsTab.appendChild(recordingsTabText);

                    options.tablEl = recordingsTab;

                    recordingsTab.addEventListener('click', function () {
                        tool.onTabHandler(options);
                    });
                    
                    recordingsTab.addEventListener('dblclick', function () {
                        tool.onTabDblHandler(options);
                    });

                    tool.tabItems.push(options);
                    return recordingsTab;
                }
                

                var listContainer = tool.listContainer = document.createElement('DIV');
                listContainer.className = 'webrtc-recordings-list';
                recordingCon.appendChild(listContainer);

                tool.createCloudRecordingsList();
                tool.createLocalRecordingsList();
                
                recordingsTabs.firstChild.click();
            },
            onTabHandler: function (e) {
                var tool = this;
                for(let i in tool.tabItems) {
                    tool.tabItems[i].tablEl.classList.remove('webrtc-recordings-tabs-item-active');
                }

                e.tablEl.classList.add('webrtc-recordings-tabs-item-active');

                tool.listContainer.innerHTML = '';
                if(e.key == 'cloud') {
                    tool.listContainer.appendChild(tool.serverRecordingsList);
                } else if(e.key == 'local') {
                    tool.listContainer.appendChild(tool.localRecordingsList);
                }
            },
            onTabDblHandler: function (e) {
                var tool = this;
                tool.onTabHandler(e);
                if(e.key == 'cloud') {
                    tool.reloadCloudTabContent()
                }
            },
            showLoader: function () {
                var tool = this;
                if(tool.loaderEl) {
                    tool.loaderEl.remove();
                }
                let loaderContainer = document.createElement('DIV');
                loaderContainer.className = 'webrtc-recordings-loader';
                loaderContainer.innerHTML = '<div class="lds-ring"><div></div><div></div><div></div><div></div></div>';
                tool.loaderEl = loaderContainer;
                tool.listContainer.appendChild(loaderContainer);
            },
            hideLoader: function () {
                var tool = this;
                if(tool.loaderEl) {
                    tool.loaderEl.remove();
                }
            },
            createCloudRecordingsList: function () {
                var tool = this;

                let listOfServerRecordings = tool.serverRecordingsList = document.createElement('DIV');
                listOfServerRecordings.className = 'webrtc-recordings-ser-list';

                let breadcrumbsDiv = document.createElement('DIV');
                breadcrumbsDiv.className = 'webrtc-recordings-breadcrumbs';
                listOfServerRecordings.appendChild(breadcrumbsDiv);

                //tool.listOfCloudRecordedRooms = createListOfRecordedRooms();
                //listOfServerRecordings.appendChild(tool.listOfCloudRecordedRooms);

                function createListOfRecordedRooms() {
                    let _currentHeight = 0;
                    let _currentOffset = 0;
                    let _limit = 5;
                    let _isFetching = false;
                    let _fetchedAll = false;
                    let _fetchQueue = [];

                    let listOfRecordedRooms = document.createElement('DIV');
                    listOfRecordedRooms.className = 'webrtc-recordings-ser-recorded-rooms';

                    let roomsListContent = document.createElement('DIV');
                    roomsListContent.className = 'webrtc-recordings-ser-list-content';
                    listOfRecordedRooms.appendChild(roomsListContent);

                    let loadMoreButtonCon = document.createElement('DIV');
                    loadMoreButtonCon.className = 'webrtc-recordings-ser-list-more';
                    listOfRecordedRooms.appendChild(loadMoreButtonCon);
                    let loadMoreButton = document.createElement('BUTTON');
                    loadMoreButton.className = 'webrtc-recordings-ser-list-more-btn';
                    loadMoreButton.innerHTML = 'Load';
                    loadMoreButtonCon.appendChild(loadMoreButton);

                    //listOfRecordedRooms.addEventListener('scroll', checkScroll);
                    loadMoreButton.addEventListener('click', fetchMore);

                    let resizeObserver = new ResizeObserver(function (entries) {
                        for (let entry of entries) {
                            if (entry.contentBoxSize[0]) {
                                let rect = entry.contentBoxSize[0];
                                _currentHeight = rect.blockSize;
                                break;
                            }
                        }
                    });

                    resizeObserver.observe(listOfRecordedRooms);

                    renderBreadcrumbs();
                    fetchMore();

                    return listOfRecordedRooms;

                    function checkScroll() {
                        if (listOfRecordedRooms.scrollTop + _currentHeight >= listOfRecordedRooms.scrollHeight - 100) {
                            fetchMore();
                        }
                    }

                    function showButtonLoader() {
                        loadMoreButton.classList.add('webrtc-recordings-btn-loading');
                    }

                    function hideButtonLoader() {
                        loadMoreButton.classList.remove('webrtc-recordings-btn-loading');
                    }

                    function reloadListOfRooms() {
                        roomsListContent.innerHTML = '';
                        loadMoreButton.classList.remove('webrtc-recordings-btn-disabled');
                        _currentOffset = 0;
                        _fetchedAll = false;
                        fetchMore();
                    }

                    tool.reloadCloudTabContent = reloadListOfRooms;

                    function fetchMore() {
                        if (_fetchedAll) {
                            return;
                        }
                        if (_isFetching) {
                            _fetchQueue.push({ foo: 'bar' });
                            return;
                        }
                        _isFetching = true;
                        showButtonLoader();
                        getRecordedMeetings(_currentOffset, _limit).then(function (listOfRoomStreams) {
                            hideButtonLoader();
                            renderListOfMeetings(listOfRoomStreams);
                            _currentOffset += _limit;
                            _isFetching = false;

                            if (listOfRoomStreams.length != 0) {
                                loadMoreButton.classList.remove('webrtc-recordings-btn-disabled');
                            }

                            if (_fetchQueue.length != 0 && listOfRoomStreams.length != 0) {
                                _fetchQueue.shift();
                                fetchMore();
                            } else if (listOfRoomStreams.length == 0) {
                                _fetchQueue = [];
                                _fetchedAll = true;
                                loadMoreButton.classList.add('webrtc-recordings-btn-disabled');
                            }
                        });
                    }

                    function getRecordedMeetings(offset, limit) {
                        return new Promise(function (resolve, reject) {
                            Q.req("Media/webrtc", ['recordedMeetings'], function (err, response) {
                                var msg = Q.firstErrorMessage(err, response && response.errors);

                                if (msg) {
                                    reject(msg);
                                    console.error(msg)
                                    return;
                                }

                                resolve(response.slots.recordedMeetings)
                            }, {
                                method: 'get',
                                fields: {
                                    publisherId: tool.roomStream.fields.publisherId,
                                    streamName: tool.roomStream.fields.name,
                                    offset: offset,
                                    limit: limit,
                                }
                            });
                        });
                    }

                    function renderListOfMeetings(listOfRoomStreams) {
                        for(let i in listOfRoomStreams) {
                            let roomStream = listOfRoomStreams[i];
                            let roomInfoContainer = document.createElement('DIV');
                            roomInfoContainer.className = 'webrtc-recordings-ser-list-item';
                            roomsListContent.appendChild(roomInfoContainer);
    
                            let roomInfoContainerInner = document.createElement('DIV');
                            roomInfoContainerInner.className = 'webrtc-recordings-ser-list-item-inner';
                            roomInfoContainer.appendChild(roomInfoContainerInner);
    
                            let roomInfoTitle = document.createElement('DIV');
                            roomInfoTitle.className = 'webrtc-recordings-ser-list-item-title';
                            roomInfoTitle.innerHTML = roomStream.title;
                            roomInfoContainerInner.appendChild(roomInfoTitle);
    
                            let roomInfoDate = document.createElement('DIV');
                            roomInfoDate.className = 'webrtc-recordings-ser-list-item-date';
                            roomInfoContainerInner.appendChild(roomInfoDate);
    
                            let expandableCon = document.createElement('DIV');
                            expandableCon.className = 'webrtc-recordings-ser-list-item-exp';
                            roomInfoContainer.appendChild(expandableCon);
    
                            roomInfoContainer.addEventListener('click', function () {
                                showRoomRecordings(roomStream);
                            });
    
                            Q.activate(
                                Q.Tool.setUpElement(
                                    roomInfoDate,
                                    "Q/timestamp",
                                    {
                                        time: roomStream.insertedTime,
                                        capitalized: true,
                                        relative: true
                                    }
                                ),
                                function () {
                                   
                                }
                            );
                        }
                    }

                    function showRoomRecordings(roomStream) {
    
                        Q.activate(
                            Q.Tool.setUpElement(
                                'DIV',
                                "Q/timestamp",
                                {
                                    time: roomStream.insertedTime,
                                    capitalized: true,
                                    relative: true
                                }
                            ),
                            function () {
                                renderBreadcrumbs(this.element.textContent + ': ' + roomStream.title);
                                //tool.listOfCloudRecordedRooms.style.display = 'none';
                                tool.activeListOfServerRecordings = createListOfRecordingsByRoom(roomStream);
                                listOfServerRecordings.appendChild(tool.activeListOfServerRecordings.listOfRecordingsEl);
                            }
                        );
                        
                    }
                }

                function showListOfRooms() {
                    renderBreadcrumbs();
                    //tool.listOfCloudRecordedRooms.style.display = '';
                    if(tool.activeListOfServerRecordings) {
                        tool.activeListOfServerRecordings.remove();
                    }
                }

                function createListOfRecordingsByRoom(roomStream) {
                    let _currentHeight = 0;
                    let _currentOffset = 0;
                    let _limit = 5;
                    let _isFetching = false;
                    let _fetchedAll = false;
                    let _fetchQueue = [];

                    let listOfRecordings = document.createElement('DIV');
                    listOfRecordings.className = 'webrtc-recordings-ser-recs';
                    listOfServerRecordings.appendChild(listOfRecordings);

                    let listEl = document.createElement('DIV');
                    listEl.className = 'webrtc-recordings-ser-recs-list';
                    listOfRecordings.appendChild(listEl);

                    let loadMoreButtonCon = document.createElement('DIV');
                    loadMoreButtonCon.className = 'webrtc-recordings-ser-list-more';
                    listOfRecordings.appendChild(loadMoreButtonCon);
                    let loadMoreButton = document.createElement('BUTTON');
                    loadMoreButton.className = 'webrtc-recordings-ser-list-more-btn';
                    loadMoreButton.innerHTML = 'Load';
                    loadMoreButtonCon.appendChild(loadMoreButton);

                    //listOfRecordings.addEventListener('scroll', checkScroll);
                    loadMoreButton.addEventListener('click', fetchMore);

                    let resizeObserver = new ResizeObserver(function (entries) {
                        for (let entry of entries) {
                            if (entry.contentBoxSize[0]) {
                                let rect = entry.contentBoxSize[0];
                                _currentHeight = rect.blockSize;
                                break;
                            }
                        }
                    });

                    resizeObserver.observe(listOfRecordings);

                    fetchMore();

                    return {
                        listOfRecordingsEl: listOfRecordings,
                        remove: function () {
                            if(listOfRecordings) {
                                listOfRecordings.remove();
                                resizeObserver.unobserve(listOfRecordings);
                            }
                        }
                    };

                    function checkScroll() {
                        if (listOfRecordings.scrollTop + _currentHeight >= listOfRecordings.scrollHeight - 100) {
                            fetchMore();
                        }
                    }

                    function showButtonLoader() {
                        loadMoreButton.classList.add('webrtc-recordings-btn-loading');
                    }

                    function hideButtonLoader() {
                        loadMoreButton.classList.remove('webrtc-recordings-btn-loading');
                    }

                    function fetchMore() {
                        if (_fetchedAll) {
                            return;
                        }
                        if (_isFetching) {
                            _fetchQueue.push({ foo: 'bar' });
                            return;
                        }
                        _isFetching = true;
                        showButtonLoader();
                        getMeetingRecordings(_currentOffset, _limit).then(function (recordingsList) {
                            hideButtonLoader();
                            renderListOfRecordings(recordingsList);
                            _currentOffset += _limit;
                            _isFetching = false;

                            if (recordingsList.length != 0) {
                                loadMoreButton.classList.remove('webrtc-recordings-btn-disabled');
                            }

                            if (_fetchQueue.length != 0 && recordingsList.length != 0) {
                                _fetchQueue.shift();
                                fetchMore();
                            } else if (recordingsList.length == 0) {
                                _fetchQueue = [];
                                _fetchedAll = true;
                                loadMoreButton.classList.add('webrtc-recordings-btn-disabled');
                            }
                        });
                    }

                    function getMeetingRecordings(offset, limit) {
                        return new Promise(function (resolve, reject) {
                            Q.req("Media/webrtc", ['recordings'], function (err, response) {
                                var msg = Q.firstErrorMessage(err, response && response.errors);
        
                                if (msg) {
                                    reject(msg);
                                    console.error(msg)
                                    return;
                                }
        
                                resolve(response.slots.recordings)
                            }, {
                                method: 'get',
                                fields: {
                                    publisherId: roomStream.toPublisherId,
                                    streamName: roomStream.toStreamName,
                                    offset: offset,
                                    limit: limit,
                                }
                            });
                        });
                    }

                    function renderListOfRecordings(recordingsList) {
                        for(let i in recordingsList) {
                            let recordingStream = recordingsList[i];
                            let attributes = JSON.parse(recordingStream.attributes);
                            
                            let roomInfoContainer = document.createElement('DIV');
                            roomInfoContainer.className = 'webrtc-recordings-ser-list-item';
                            listEl.appendChild(roomInfoContainer);
    
                            let roomInfoContainerInner = document.createElement('DIV');
                            roomInfoContainerInner.className = 'webrtc-recordings-ser-list-item-inner';
                            roomInfoContainer.appendChild(roomInfoContainerInner);
    
                            let roomInfoTitle = document.createElement('DIV');
                            roomInfoTitle.className = 'webrtc-recordings-ser-list-item-title';
                            roomInfoTitle.innerHTML = recordingStream.title;
                            roomInfoContainerInner.appendChild(roomInfoTitle);
    
                            let roomInfoDate = document.createElement('DIV');
                            roomInfoDate.className = 'webrtc-recordings-ser-list-item-date';
                            roomInfoContainerInner.appendChild(roomInfoDate);
    
                            let controlsCon = document.createElement('DIV');
                            controlsCon.className = 'webrtc-recordings-ser-list-item-controls';
                            roomInfoContainerInner.appendChild(controlsCon);
    
                            let links = attributes.links;
                            if(!links) {
                                links = [];
                            }
                            if(attributes.link) {
                                links.push(attributes.link); //for backward compatibility
                            }
                            for(let l in links) {
                                let link = Q.url(links[l]);
                                let fullNameData = link.split('/');
                                let fullName = fullNameData[fullNameData.length - 1];
                                let fileName = fullName.split('.')[0];
                                let extension = fullName     .split('.')[1];
                                let dateFormat = new Date(parseInt(fileName));
                                let downloadName = dateFormat.getDate()+
                                "-"+(dateFormat.getMonth()+1)+
                                "-"+dateFormat.getFullYear()+
                                "_"+dateFormat.getHours()+
                                "-"+dateFormat.getMinutes()+
                                "-"+dateFormat.getSeconds();

                                let download = document.createElement('A');
                                download.className = 'webrtc-recordings-controls-item webrtc-recordings-ser-list-item-download';
                                download.innerHTML = _icons.download;
                                download.download = downloadName + '.' + extension;
                                download.href = link;
                                controlsCon.appendChild(createDownloadLink());
                            }
    
                            let paths = attributes.paths;
                            if(!paths) {
                                paths = [];
                            }
                            for(let l in paths) {
                                let pathInfo = paths[l];
                                if(!pathInfo.recFile) {
                                    let processVideo = document.createElement('DIV');
                                    processVideo.className = 'webrtc-recordings-controls-item webrtc-recordings-ser-list-item-process';
                                    processVideo.innerHTML = _icons.startProcess;
                                    controlsCon.appendChild(processVideo);
    
                                    processVideo.addEventListener('click', function() {
                                        processVideo.classList.add('Q_working');
                                        processVideo.innerHTML = _icons.inProgress;
                                        processCloudRecording(recordingStream, pathInfo.path).then(function (filePath) {
                                            processVideo.classList.remove('Q_working');
                                            processVideo.replaceWith(createDownloadLink(filePath));
                                        });
                                    });
                                } else if(pathInfo.recFile) {
                                    let downloadLink = createDownloadLink(pathInfo.recFile);
                                    controlsCon.appendChild(downloadLink);
                                }
                            }
    

                            Q.activate(
                                Q.Tool.setUpElement(
                                    roomInfoDate,
                                    "Q/timestamp",
                                    {
                                        time: recordingStream.insertedTime,
                                        capitalized: true,
                                        relative: false
                                    }
                                ),
                                function () {
                                   
                                }
                            );
                        }

                        function createDownloadLink(recFilePath) {
                            let link = Q.url('{{baseUrl}}/Q' + recFilePath);
                            let fullNameData = link.split('/');
                            let fullName = fullNameData[fullNameData.length - 1];
                            let fileName = fullName.split('.')[0];
                            let extension = fullName.split('.')[1];
                            let dateFormat = new Date(parseInt(fileName));
                            let downloadName = dateFormat.getDate() +
                                "-" + (dateFormat.getMonth() + 1) +
                                "-" + dateFormat.getFullYear() +
                                "_" + dateFormat.getHours() +
                                "-" + dateFormat.getMinutes() +
                                "-" + dateFormat.getSeconds();

                            let download = document.createElement('A');
                            download.className = 'webrtc-recordings-controls-item webrtc-recordings-ser-list-item-download';
                            download.innerHTML = _icons.download;
                            download.download = downloadName + '.' + extension;
                            download.href = link;

                            return download;
                        }
                    }

                    function processCloudRecording(recordingStream, path) {
                        return new Promise(function (resolve, reject) {
                            Q.req("Media/recording", ['processRecording'], function (err, response) {
                                var msg = Q.firstErrorMessage(err, response && response.errors);

                                if (msg) {
                                    reject(msg);
                                    console.error(msg)
                                    return;
                                }

                                resolve(response.slots.processRecording)
                            }, {
                                method: 'post',
                                fields: {
                                    publisherId: recordingStream.publisherId,
                                    streamName: recordingStream.name,
                                    path: path
                                }
                            });
                        });
                    }

                }

                function renderBreadcrumbs(roomTitle, recordingIndex) {
                    breadcrumbsDiv.style.display = '';
                    breadcrumbsDiv.innerHTML = '';

                    // Breadcrumb for the list of recorded rooms
                    const roomsCrumb = document.createElement('SPAN');
                    roomsCrumb.className = 'webrtc-recordings-breadcrumbs-item';
                    roomsCrumb.innerHTML = 'List of Recorded Rooms';
                    roomsCrumb.addEventListener('click', function () {
                        showListOfRooms();
                    });
                    breadcrumbsDiv.appendChild(roomsCrumb);

                    // Breadcrumb for the selected room
                    if (roomTitle) {
                        const roomCrumb = document.createElement('SPAN');
                        roomCrumb.className = 'webrtc-recordings-breadcrumbs-item';
                        roomCrumb.innerHTML = roomTitle;
                        roomCrumb.addEventListener('click', function () {

                        });
                        breadcrumbsDiv.appendChild(roomCrumb);
                    }
                }
                
            },
            createLocalRecordingsList: async function () {
                var tool = this;

                var listOfLocalRecordings = tool.localRecordingsList = document.createElement('DIV');
                listOfLocalRecordings.className = 'webrtc-recordings-loc-list';

                let breadcrumbsDiv = document.createElement('DIV');
                breadcrumbsDiv.className = 'webrtc-recordings-breadcrumbs';
                listOfLocalRecordings.appendChild(breadcrumbsDiv);

                for await (const [k, v] of tool.opfstempDir.entries()) {
                    let tempFiles = document.createElement('DIV');
                    tempFiles.className = 'webrtc-recordings-temp';
                    listOfLocalRecordings.appendChild(tempFiles);
                    let caption = document.createElement('DIV');
                    caption.className = 'webrtc-recordings-temp-caption';
                    caption.innerHTML = 'You have unfinished recordings. Please choose an action.';
                    tempFiles.appendChild(caption);

                    let buttons = document.createElement('DIV');
                    buttons.className = 'webrtc-recordings-temp-buttons';
                    tempFiles.appendChild(buttons)
                    let removeAll = document.createElement('DIV');
                    removeAll.className = 'webrtc-recordings-temp-remove Q_button';
                    removeAll.innerHTML = 'Remove All';
                    buttons.appendChild(removeAll);
                    let save = document.createElement('DIV');
                    save.className = 'webrtc-recordings-temp-save Q_button';
                    save.innerHTML = 'Save and Download';
                    buttons.appendChild(save);

                    save.addEventListener('click', function () {
                        saveUnfinishedRecordings(true)
                        tempFiles.parentElement.removeChild(tempFiles);
                    })
                    removeAll.addEventListener('click', function () {
                        removeUnfinishedChunks();
                        tempFiles.parentElement.removeChild(tempFiles);
                    })

                    break;
                }

                tool.getLocalRecordings().then(function (recordings) {
                  tool.listOfLocalRecordedRooms = createListOfRecordedRooms(recordings);
                  listOfLocalRecordings.appendChild(tool.listOfLocalRecordedRooms);
                })

                async function saveUnfinishedRecordings(download) {
                    let fileHandles = {};
                    for await (const [name, handle] of tool.opfstempDir.entries()) {
                        let info = name.split('_');
                        let format = info[0];
                        let id = info[1];

                        
                        
                        if(!fileHandles[id]) {
                            fileHandles[id] = { handles: [], infoChunk: null };
                        }

                        if (info[2] == 'info') {
                            fileHandles[id].infoChunk = handle;
                        } else {
                            fileHandles[id].handles.push(handle);
                        }
                    }

                    for(let i in fileHandles) {
                        tool.localRecordingsDB.getByIndex('recordingId', i, 'recordings').then(async function (recs) {
                            if(recs.length != 0) {
                                let recordingInfo = recs[0];
                                let timestamp = recordingInfo.startTime;
                                let format = recordingInfo.format;
                                let id = recordingInfo.recordingId;
                                let filesToRemove = [fileHandles[i].infoChunk, ...fileHandles[i].handles];
                                let blobs = [];
                                await retrieveBlobs(fileHandles[i].handles, blobs).catch(function (e) {
                                    console.error(e)
                                });

                                blobs.sort(function (a, b) {
                                    return a.lastModified - b.lastModified; // Sorting in descending order
                                });

                                let fileBlob = new Blob(blobs);
                                let fileName = `${id}.${format}`;
                                await saveStaticFile(fileName, fileBlob);

                                if(download) {
                                    const date = new Date(parseInt(timestamp));

                                    let day = date.getDate();
                                    let month = date.getMonth() + 1;
                                    let year = date.getFullYear();
                                    let hours = date.getHours();
                                    let minutes = date.getMinutes();
                                    let seconds = date.getSeconds();
                                    let currentDate = `${day}-${month}-${year}-${hours}-${minutes}-${seconds}`;

                                    let downloadName = `${currentDate}.${format}`;
    
                                    downloadBlob(fileBlob, downloadName);
                                }

                                setTimeout(function () {
                                    removeTempFiles(filesToRemove);
                                }, 1000);
                            }
                        })
                    }
                };

                async function removeUnfinishedChunks() {
                    let fileHandles = {};
                    for await (const [name, handle] of tool.opfstempDir.entries()) {
                        let info = name.split('_');
                        let format = info[0];
                        let id = info[1];

                        
                        
                        if(!fileHandles[id]) {
                            fileHandles[id] = { handles: [], infoChunk: null };
                        }

                        if (info[2] == 'info') {
                            fileHandles[id].infoChunk = handle;
                        } else {
                            fileHandles[id].handles.push(handle);
                        }
                    }

                    for(let i in fileHandles) {
                        tool.localRecordingsDB.getByIndex('recordingId', i, 'recordings').then(async function (recs) {
                            if(recs.length != 0) {
                                let recordingInfo = recs[0];
                                let filesToRemove = [fileHandles[i].infoChunk, ...fileHandles[i].handles];

                                setTimeout(function () {
                                    tool.localRecordingsDB.delete(recordingInfo.objectId,'recordings').then(function () {
                                        removeTempFiles(filesToRemove);
                                    });
                                }, 1000);
                            }
                        })
                    }
                };

                async function removeTempFiles(chunksToRemove) {
                    for(let i in chunksToRemove) {
                        await chunksToRemove[i].remove();
                    }
                }

                function downloadBlob(blob, downloadName) {
                    if(!downloadName) {
                        let dateFormat = new Date();
                        downloadName = dateFormat.getDate() +
                            "-" + (dateFormat.getMonth() + 1) +
                            "-" + dateFormat.getFullYear() +
                            "_" + dateFormat.getHours() +
                            "-" + dateFormat.getMinutes() +
                            "-" + dateFormat.getSeconds();
                    }
                
                    let url = window.URL.createObjectURL(blob);
                    let a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = downloadName;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                };

                function saveStaticFile(name, fileBlob) {
                    return new Promise(async function (resolve, reject) {
                        const draftHandle = await tool.opfsRoot.getFileHandle(name, { create: true }).catch(function (e) {
                            console.error(e)
                        });
                        const writable = await draftHandle.createWritable().catch(function (e) {
                            console.error(e)
                        });
                        // Write the contents of the file to the stream.
                        await writable.write(fileBlob);
                        // Close the stream, which persists the contents.
                        await writable.close();
            
                        resolve();
                    });
                }
        
                async function retrieveBlobs(fileHandles, blobs) {
                    let handle = fileHandles.shift();
                    console.log('retrieveBlobs', fileHandles, handle)
                    let file = await handle.getFile()
                    blobs.push(file);
                    if(fileHandles.length != 0) {
                        return await retrieveBlobs(fileHandles, blobs);
                    } else {
                        return blobs;
                    }
                }

                function createListOfRecordedRooms(recordings) {
                    let _rawRecordings = recordings;
                    let _recordingsFromDB = [];
                    
                    for(let r in recordings) {
                        let room = {
                            room: {
                                publisherId: recordings[r][0].roomStream.publisherId,
                                name: recordings[r][0].roomStream.name,
                                title: recordings[r][0].roomStream.title,
                                startTime: recordings[r][0].roomStream.startTime
                            },
                        };

                        let recordingSessions = {};
                        for(let c in recordings[r]) {
                            let chunkItem = recordings[r][c];
                            if(!recordingSessions[chunkItem.startTime]) {
                                recordingSessions[chunkItem.startTime] = { 
                                    startTime: chunkItem.startTime,
                                    objectId: chunkItem.objectId,
                                    chunks: [],
                                    recordingId: chunkItem.recordingId,
                                    format: chunkItem.format,
                                    storage: chunkItem.storage,
                                 };
                            }
                        }
                        let toBeSorted = Object.values(recordingSessions);
                        toBeSorted.sort(function(a,b){
                            return (b.startTime) - (a.startTime);
                          });
                        room.recordings = toBeSorted;

                        _recordingsFromDB.push(room);
                    }

                    let _currentHeight = 0;
                    let _currentOffset = 0;
                    let _limit = 5;
                    let _isFetching = false;
                    let _fetchedAll = false;
                    let _fetchQueue = [];

                    let listOfRecordedRooms = document.createElement('DIV');
                    listOfRecordedRooms.className = 'webrtc-recordings-ser-recorded-rooms';

                    let roomsListContent = document.createElement('DIV');
                    roomsListContent.className = 'webrtc-recordings-ser-list-content';
                    listOfRecordedRooms.appendChild(roomsListContent);

                    let loadMoreButtonCon = document.createElement('DIV');
                    loadMoreButtonCon.className = 'webrtc-recordings-ser-list-more';
                    listOfRecordedRooms.appendChild(loadMoreButtonCon);
                    let loadMoreButton = document.createElement('BUTTON');
                    loadMoreButton.className = 'webrtc-recordings-ser-list-more-btn';
                    loadMoreButton.innerHTML = 'Load';
                    loadMoreButtonCon.appendChild(loadMoreButton);

                    loadMoreButton.addEventListener('click', fetchMore);

                    renderBreadcrumbs();
                    fetchMore();

                    return listOfRecordedRooms;

                    function showButtonLoader() {
                        loadMoreButton.classList.add('webrtc-recordings-btn-loading');
                    }

                    function hideButtonLoader() {
                        loadMoreButton.classList.remove('webrtc-recordings-btn-loading');
                    }

                    function reloadListOfRooms() {
                        roomsListContent.innerHTML = '';
                        loadMoreButton.classList.remove('webrtc-recordings-btn-disabled');
                        _currentOffset = 0;
                        _fetchedAll = false;
                        fetchMore();
                    }

                    //tool.reloadLocalTabContent = reloadListOfRooms;

                    function fetchMore() {
                        if (_fetchedAll) {
                            return;
                        }
                       
                        showButtonLoader();
                        getRecordedMeetings(_currentOffset, _limit).then(function (listOfRoomStreams) {
                            hideButtonLoader();
                            renderListOfMeetings(listOfRoomStreams);
                            _currentOffset += _limit;
                            _isFetching = false;

                            if (listOfRoomStreams.length != 0) {
                                loadMoreButton.classList.remove('webrtc-recordings-btn-disabled');
                            }

                            if (_fetchQueue.length != 0 && listOfRoomStreams.length != 0) {
                                _fetchQueue.shift();
                                fetchMore();
                            } else if (listOfRoomStreams.length == 0) {
                                _fetchQueue = [];
                                _fetchedAll = true;
                                loadMoreButton.classList.add('webrtc-recordings-btn-disabled');
                            }
                        });
                    }

                    function getRecordedMeetings(offset, limit) {
                        return new Promise(function (resolve, reject) {
                            let rooms = _recordingsFromDB.slice(offset, offset + limit);
                            _currentOffset += _limit;
                            _isFetching = false;

                            if (rooms.length != 0) {
                                loadMoreButton.classList.remove('webrtc-recordings-btn-disabled');
                            }

                            if (rooms.length == 0) {
                                _fetchQueue = [];
                                _fetchedAll = true;
                                loadMoreButton.classList.add('webrtc-recordings-btn-disabled');
                            }

                            resolve(rooms);
                        });
                    }

                    function renderListOfMeetings(listOfRecordedLocallyRooms) {
                        for(let i in listOfRecordedLocallyRooms) {
                            let recItem = listOfRecordedLocallyRooms[i];
                            let roomInfoContainer = document.createElement('DIV');
                            roomInfoContainer.className = 'webrtc-recordings-ser-list-item';
                            roomsListContent.appendChild(roomInfoContainer);
    
                            let roomInfoContainerInner = document.createElement('DIV');
                            roomInfoContainerInner.className = 'webrtc-recordings-ser-list-item-inner';
                            roomInfoContainer.appendChild(roomInfoContainerInner);
    
                            let roomInfoTitle = document.createElement('DIV');
                            roomInfoTitle.className = 'webrtc-recordings-ser-list-item-title';
                            roomInfoTitle.innerHTML = recItem.room.title;
                            roomInfoContainerInner.appendChild(roomInfoTitle);
    
                            let roomInfoDate = document.createElement('DIV');
                            roomInfoDate.className = 'webrtc-recordings-ser-list-item-date';
                            roomInfoContainerInner.appendChild(roomInfoDate);
    
                            let expandableCon = document.createElement('DIV');
                            expandableCon.className = 'webrtc-recordings-ser-list-item-exp';
                            roomInfoContainer.appendChild(expandableCon);
    
                            roomInfoContainer.addEventListener('click', function () {
                                showRoomRecordings(recItem);
                            });
                            
                            Q.activate(
                                Q.Tool.setUpElement(
                                    roomInfoDate,
                                    "Q/timestamp",
                                    {
                                        time: recItem.room.startTime,
                                        capitalized: true,
                                        relative: true
                                    }
                                ),
                                function () {
                                   
                                }
                            );
                        }
                    }

                    function showRoomRecordings(roomItem) {
    
                        Q.activate(
                            Q.Tool.setUpElement(
                                'DIV',
                                "Q/timestamp",
                                {
                                    time: roomItem.room.startTime,
                                    capitalized: true,
                                    relative: true
                                }
                            ),
                            function () {
                                renderBreadcrumbs(this.element.textContent + ': ' + roomItem.room.title);
                                tool.listOfLocalRecordedRooms.style.display = 'none';
                                tool.activeListOfLocalRecordings = createListOfRecordingsByRoom(roomItem);
                                listOfLocalRecordings.appendChild(tool.activeListOfLocalRecordings.listOfRecordingsEl);
                            }
                        );
                        
                    }
                }

                function createListOfRecordingsByRoom(roomItem) {
                    let _currentHeight = 0;
                    let _currentOffset = 0;
                    let _limit = 5;
                    let _isFetching = false;
                    let _fetchedAll = false;
                    let _fetchQueue = [];

                    let listOfRecordings = document.createElement('DIV');
                    listOfRecordings.className = 'webrtc-recordings-ser-recs';
                    listOfLocalRecordings.appendChild(listOfRecordings);

                    let listEl = document.createElement('DIV');
                    listEl.className = 'webrtc-recordings-ser-recs-list';
                    listOfRecordings.appendChild(listEl);

                    let loadMoreButtonCon = document.createElement('DIV');
                    loadMoreButtonCon.className = 'webrtc-recordings-ser-list-more';
                    listOfRecordings.appendChild(loadMoreButtonCon);
                    let loadMoreButton = document.createElement('BUTTON');
                    loadMoreButton.className = 'webrtc-recordings-ser-list-more-btn';
                    loadMoreButton.innerHTML = 'Load';
                    loadMoreButtonCon.appendChild(loadMoreButton);

                    loadMoreButton.addEventListener('click', fetchMore);

                    fetchMore();

                    return {
                        listOfRecordingsEl: listOfRecordings,
                        remove: function () {
                            if(listOfRecordings) {
                                listOfRecordings.remove();
                            }
                        }
                    };

                    function showButtonLoader() {
                        loadMoreButton.classList.add('webrtc-recordings-btn-loading');
                    }

                    function hideButtonLoader() {
                        loadMoreButton.classList.remove('webrtc-recordings-btn-loading');
                    }

                    function fetchMore() {
                        if (_fetchedAll) {
                            return;
                        }
                        if (_isFetching) {
                            _fetchQueue.push({ foo: 'bar' });
                            return;
                        }
                        _isFetching = true;
                        showButtonLoader();
                        getMeetingRecordings(_currentOffset, _limit).then(function (recordingsList) {
                            hideButtonLoader();
                            renderListOfRecordings(recordingsList);
                            _currentOffset += _limit;
                            _isFetching = false;

                            if (recordingsList.length != 0) {
                                loadMoreButton.classList.remove('webrtc-recordings-btn-disabled');
                            }

                            if (recordingsList.length == 0) {
                                _fetchQueue = [];
                                _fetchedAll = true;
                                loadMoreButton.classList.add('webrtc-recordings-btn-disabled');
                            }
                        });
                    }

                    function getMeetingRecordings(offset, limit) {
                        return new Promise(function (resolve, reject) {
                            let recordings = roomItem.recordings.slice(offset, offset + limit); 
                            resolve(recordings);
                        });
                    }

                    function renderListOfRecordings(recordingsList) {
                        for(let i in recordingsList) {
                            let recordingItem = recordingsList[i];
                            //let attributes = JSON.parse(recordingStream.attributes);
                            //link = Q.url(attributes.link);

                            let roomInfoContainer = document.createElement('DIV');
                            roomInfoContainer.className = 'webrtc-recordings-ser-list-item';
                            listEl.appendChild(roomInfoContainer);
    
                            let roomInfoContainerInner = document.createElement('DIV');
                            roomInfoContainerInner.className = 'webrtc-recordings-ser-list-item-inner';
                            roomInfoContainer.appendChild(roomInfoContainerInner);
    
                            let roomInfoDate = document.createElement('DIV');
                            roomInfoDate.className = 'webrtc-recordings-ser-list-item-date';
                            roomInfoContainerInner.appendChild(roomInfoDate);
    
                            let controlsCon = document.createElement('DIV');
                            controlsCon.className = 'webrtc-recordings-ser-list-item-controls';
                            roomInfoContainerInner.appendChild(controlsCon);
    
                            let remove = document.createElement('DIV');
                            remove.className = 'webrtc-recordings-controls-item webrtc-recordings-ser-list-item-remove';
                            remove.innerHTML = _icons.remove;
                            controlsCon.appendChild(remove);
    
                            let download = document.createElement('DIV');
                            download.className = 'webrtc-recordings-controls-item webrtc-recordings-ser-list-item-download';
                            download.innerHTML = _icons.download;
                            if(recordingItem.format == 'opfs') controlsCon.appendChild(download); //TODO: implement removing chunks from indexedDb or refactor webm recording

                            remove.addEventListener('click', function (e) {
                                e.stopPropagation();
                                e.preventDefault();
                                tool.localRecordingsDB.delete(recordingItem.objectId,'recordings').then(function () {
                                    tool.opfsRoot.getFileHandle(recordingItem.recordingId + '.' + recordingItem.format).then(function (fileHandle) {
                                        fileHandle.remove();
                                    }).catch(function (e) {
                                         console.error(e);
                                    });
                                    roomInfoContainer.parentElement.removeChild(roomInfoContainer);

                                });
                                
                            });
                            
                            roomInfoContainer.addEventListener('click', function () {
                                let dateFormat = new Date(parseInt(recordingItem.startTime));
                                let downloadName = dateFormat.getDate() +
                                    "-" + (dateFormat.getMonth() + 1) +
                                    "-" + dateFormat.getFullYear() +
                                    "_" + dateFormat.getHours() +
                                    "-" + dateFormat.getMinutes() +
                                    "-" + dateFormat.getSeconds();

                                if(recordingItem.storage == 'opfs') {
                                   tool.opfsRoot.getFileHandle(recordingItem.recordingId + '.' + recordingItem.format).then(function (fileHandle) {
                                       fileHandle.getFile().then(function (file) {
                                           let downloadLink = document.createElement('A');
                                           downloadLink.style.position = 'absolute';
                                           downloadLink.style.top = '-999999px';
                                           downloadLink.href = URL.createObjectURL(file);
                                           downloadLink.download = downloadName + '.' + recordingItem.format;
                                           document.body.appendChild(downloadLink);
                                           downloadLink.click();
                                       });
                                   }).catch(function (e) {
                                        console.error(e);
                                   });
                                } else {
                                    tool.localRecordingsDB.getByIndex('startTime', recordingItem.startTime, 'recordingsChunks').then(function (chunks) {
                                        chunks.sort(function(a, b){
                                            var x = a.timestamp;
                                            var y = b.timestamp;
                                            if (x < y) {return -1;}
                                            if (x > y) {return 1;}
                                            return 0;
                                        });
    
                                        let allChunks = chunks.map(function (o) {
                                            return o.buffer;
                                        });
                                        
                                        let blob = new Blob(allChunks/* , {
                                            type: 'video/webm'
                                        } */);
    
                                        let extension = 'mp4';
                                        if(recordingItem.codec && recordingItem.codec.includes('mp4')) {
                                            extension = 'mp4';
                                        } else if(recordingItem.codec && recordingItem.codec.includes('webm')) {
                                            extension = 'webm';
                                        }
                                        let downloadLink = document.createElement('A');
                                        downloadLink.style.position = 'absolute';
                                        downloadLink.style.top = '-999999px';
                                        downloadLink.href = URL.createObjectURL(blob);
                                        downloadLink.download = downloadName + '.' + extension;
                                        document.body.appendChild(downloadLink);
                                        downloadLink.click();
                                    })
                                }
                            });
    
                            Q.activate(
                                Q.Tool.setUpElement(
                                    "DIV",
                                    "Q/timestamp",
                                    {
                                        time: recordingItem.startTime,
                                        capitalized: true,
                                        relative: false,
                                        format: '{day-week} {date+week} {year+year} %l:%M:%S %P'
                                    }
                                ),
                                {},
                                function () {
                                    let tool = this;
                                    setTimeout(function () {
                                        roomInfoDate.innerHTML = tool.element.textContent;
                                        //download.download = tool.element.textContent.replace(/[\s, :]/g,"_") + '.webm';
                                    }, 200)
                                }
                            );
                        }
                    }

                }

                function renderBreadcrumbs(roomTitle, recordingIndex) {
                    breadcrumbsDiv.style.display = '';
                    breadcrumbsDiv.innerHTML = '';

                    // Breadcrumb for the list of recorded rooms
                    const roomsCrumb = document.createElement('SPAN');
                    roomsCrumb.className = 'webrtc-recordings-breadcrumbs-item';
                    roomsCrumb.innerHTML = 'List of Locally Recorded Rooms';
                    roomsCrumb.addEventListener('click', function () {
                        showListOfRooms();
                    });
                    breadcrumbsDiv.appendChild(roomsCrumb);

                    // Breadcrumb for the selected room
                    if (roomTitle) {
                        const roomCrumb = document.createElement('SPAN');
                        roomCrumb.className = 'webrtc-recordings-breadcrumbs-item';
                        roomCrumb.innerHTML = roomTitle;
                        roomCrumb.addEventListener('click', function () {

                        });
                        breadcrumbsDiv.appendChild(roomCrumb);
                    }
                }

                function showListOfRooms() {
                    renderBreadcrumbs();
                    tool.listOfLocalRecordedRooms.style.display = '';
                    if(tool.activeListOfLocalRecordings) {
                        tool.activeListOfLocalRecordings.remove();
                    }
                }
            },

            getLocalRecordings: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    let recordings = {};
                    tool.localRecordingsDB.getAll('recordings').then(function (rawRecordingsList) {

                        for(let i in rawRecordingsList) {
                            let recordObject = rawRecordingsList[i].value;
                            if(!recordings[recordObject.roomKey]) {
                                recordings[recordObject.roomKey] = [];
                            }
                            recordings[recordObject.roomKey].push(recordObject);
                        }
                        for(let i in recordings) {
                            recordings[i].sort(function(a, b){
                                var x = a.startTime;
                                var y = b.startTime;
                                if (x < y) {return -1;}
                                if (x > y) {return 1;}
                                return 0;
                            });
                        }
                        resolve(recordings);
                        
                    });
                });
            },

            clearAllRecordings: function () {
                var tool = this;
                return tool.localRecordingsDB.clear();
            },

            loadServerRecordings: function (relatedStreams) {
                var tool = this;
                tool.serverRecordingsList.innerHTML = '';
               
                let recordingStreams = Object.values(relatedStreams);

                if(recordingStreams.length == 0) {
                    //return;
                }

                
                let recsTitle = document.createElement('DIV');
                recsTitle.className = 'live-editor-stream-to-section-rec-loc-title';
                recsTitle.innerHTML = 'Server Recordings History ';
                tool.serverRecordingsList.appendChild(recsTitle);
                let totalNumberOfRecs = 0;
                for(let i in recordingStreams) {
                    let url = recordingStreams[i].getAttribute('link');
                    if(!url) {
                        continue;
                    }

                    if(parseInt(i) == 10) {
                        totalNumberOfRecs++;
                        break;
                    }
                    totalNumberOfRecs++;

                    let fullUrl = Q.url(url);
                    let recItem = document.createElement('DIV');
                    recItem.className = 'live-editor-stream-to-section-rec-ser-item';
                    tool.serverRecordingsList.appendChild(recItem);
                    let recItemName = document.createElement('DIV');
                    recItemName.className = 'live-editor-stream-to-section-rec-ser-item-name';
                    recItem.appendChild(recItemName);

                    let a = document.createElement('a');
                    recItemName.appendChild(a);
                    a.href = fullUrl;
                    
                    let insertedTime =  Date.parse(recordingStreams[i].fields.insertedTime) / 1000;
                    let parts = fullUrl.split('/');
                    let fullFileName = parts[parts.length - 1];
                    let timestamp = url ? fullFileName.split('.')[0] : null;
                    let extension = fullFileName.split('.')[1];

                    Q.activate(
                        Q.Tool.setUpElement(
                            a,
                            "Q/timestamp",
                            {
                                time: timestamp || insertedTime,
                                capitalized: true,
                                relative: false,
                                format: '{day-week} {date+week} {year+year} %l:%M %P'
                            }
                        ),
                        {},
                        function () {
                            setTimeout(function () {
                                a.download = a.innerHTML.replace(/[\s, :]/g,"_") + '.' + extension;
                            }, 200)
                        }
                    );
                }
                
                let nav = document.createElement('DIV');
                nav.className = 'live-editor-stream-to-section-recs-nav';
                tool.serverRecordingsList.appendChild(nav);
                if (tool.relatedServerRecordingsTool.state.relatedOptions.offset > 0) {
                    let prevBtn = document.createElement('DIV');
                    prevBtn.className = 'live-editor-stream-to-section-recs-nav-prev';
                    prevBtn.innerHTML = '< prev';
                    nav.appendChild(prevBtn);

                    prevBtn.addEventListener('click', function () {
                        tool.relatedServerRecordingsTool.state.relatedOptions.offset = tool.relatedServerRecordingsTool.state.relatedOptions.offset - 10;
                        tool.relatedServerRecordingsTool.refresh();
                    });
                }
                if (totalNumberOfRecs > 10) {
                    let nextBtn = document.createElement('DIV');
                    nextBtn.className = 'live-editor-stream-to-section-recs-nav-next';
                    nextBtn.innerHTML = 'next >';
                    nav.appendChild(nextBtn);

                    nextBtn.addEventListener('click', function () {
                        tool.relatedServerRecordingsTool.state.relatedOptions.offset = tool.relatedServerRecordingsTool.state.relatedOptions.offset + 10;
                        tool.relatedServerRecordingsTool.refresh();
                    });
                }
            },
        }
    );

})(window.jQuery, window);