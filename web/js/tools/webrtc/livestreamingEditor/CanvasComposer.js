Q.Media.WebRTC.livestreaming.CanvasComposer = function (tool) {
    var getOptions = function () {
        return tool.webrtcSignalingLib && tool.webrtcSignalingLib.getOptions()
    }                    
    var _composerIsActive = false;
    var _canvas = null;
    var _canvasMediStream = null;
    var _mediaRecorder = null;
    var _mediaRecorders = [];
    var _fps = 30;
    var _videoTrackIsMuted = false;
    var _dataListeners = [];
    var _eventDispatcher = new EventSystem();

    var _scenes = [];
    var _activeScene = null;
    var _defaultScene = null;
    var _globalAudioSources = [];
    var _webrtcAudioConnectedToDest = {};

    var Scene = function () {
        var sceneInstance = this;
        this.id = generateId();
        this.title = null;
        this.sources = []; //usual user's visual and audio sources. This array corresponds to the list of sources in user's interface.
        this.removedWebrtcSources = []; //for tracking which sources were removed from canvas
        this.visualSources = []; //this array contains list onf visual sources from this.sources array. Any changes regarding visual sources in this.sources will cause changes in this.visualSources.
        this.additionalSources = []; //for titles
        this.overlaySources = []; //for watermarks
        this.backgroundSources = []; //for backgrounds
        this.webrtcAudioSources = [];
        this.audioSources = [];
        this.videoAudioSources = [];
        this.eventDispatcher = new EventSystem();
        this.eventDispatcher.on('sourceAdded', updateVisualSourcesOrdering)
        this.eventDispatcher.on('sourceRemoved', updateVisualSourcesOrdering)
        this.eventDispatcher.on('sourceMoved', updateVisualSourcesOrdering)
        this.eventDispatcher.on('webrtcLayoutUpdated', updateVisualSourcesOrdering)

        function updateVisualSourcesOrdering() {
            //log('updateVisualSourcesOrdering START', sceneInstance.sources);
            let visualSources = [];

            //get all visual sourcesa
            //for(let i = sceneInstance.sources.length - 1; i >= 0; i--) {
            for(let i in sceneInstance.sources) {
                let source = sceneInstance.sources[i];
                //log('updateVisualSourcesOrdering for', source);

                if(source.sourceType == 'video' || source.sourceType == 'videoInput' || source.sourceType == 'image') {
                    visualSources.push(source)
                } else if (source.sourceType == 'group' && source.groupType == 'webrtc') {
                    //log('updateVisualSourcesOrdering: GROUP', source.sources[0], source.sources[1]);

                    for(let c in source.sources) {
                    //for(let c = source.sources.length - 1; c >= 0; c--) {
                        visualSources.push(source.sources[c])
                        //log('updateVisualSourcesOrdering: GROUP FOR', visualSources[0], visualSources[1]);

                    }
                    //visualSources = [...visualSources, ...groupSources]
                    //log('updateVisualSourcesOrdering: GROUP2', visualSources[0], visualSources[1]);
                }

            }

            //log('updateVisualSourcesOrdering: visualSources', visualSources.map(o => o.name));

            //remove sources from rendering that are not in the list (but still are rendered) 
            for(let i = sceneInstance.visualSources.length - 1; i >= 0; i--) {
                let source = sceneInstance.visualSources[i];
                let sourceIsRemoved = true;
                for (let c in visualSources) {
                    if(source == visualSources[c]) {
                        sourceIsRemoved = false;
                        break;
                    }
                }
                if(sourceIsRemoved) {
                    sceneInstance.visualSources.splice(i, 1);
                }
            }

            //log('updateVisualSourcesOrdering rects BEFORE', JSON.stringify(visualSources.map(o=>o.kind)))
            //log('updateVisualSourcesOrdering rects BEFORE', visualSources[0], visualSources[1])
            //add sources to rendering (if it's new sources)
            //or change source's position in the rendering list (if source is already rendered)
            for (let s = visualSources.length - 1; s >= 0; s--) {
                let source = visualSources[s];
                let sourceIsRenderedAtIndex = false;
                for (let i in sceneInstance.visualSources) {
                    //log('updateVisualSourcesOrdering: for: for', source == sceneInstance.visualSources[i]);

                    if(source == sceneInstance.visualSources[i]) {
                        sourceIsRenderedAtIndex = i;
                        break;
                    }
                }

                //log('updateVisualSourcesOrdering: for sourceIsRenderedAtIndex', sourceIsRenderedAtIndex);
                if(sourceIsRenderedAtIndex === false && source.active == true) {
                    //log('updateVisualSourcesOrdering: add new source at the end');
                    //sceneInstance.visualSources.unshift(source);
                    sceneInstance.visualSources.splice(s, 0, source);

                } else {

                    //log('updateVisualSourcesOrdering: move source', sourceIsRenderedAtIndex, s);
                    sceneInstance.visualSources.splice(s, 0, sceneInstance.visualSources.splice(sourceIsRenderedAtIndex, 1)[0]);
                }
            }
            //sceneInstance.visualSources.reverse();
            //log('updateVisualSourcesOrdering:  sceneInstance.visualSources',  sceneInstance.visualSources);

        }

        this.eventDispatcher.on('sourceRemoved', function (removedSource) {
            log('sourceRemoved', removedSource)
            function removeChildSources(parentSources) {
                log('removeChildSources', parentSources)

                var nextToRemove = [];
                for(let c in parentSources) {
                    let parentSource = parentSources[c];

                    let scene = sceneInstance;
                    for (let i = scene.sources.length - 1; i >= 0; i--) {
                        let source = scene.sources[i];
                        if (source.parentGroup == parentSource) {
                            nextToRemove.push(source);
                            videoComposer.removeSource(source, true);
                        }
                    }

                    let i = scene.additionalSources.length;
                    while (i--) {
                        log('removeChildSources while', parentSources)
                        log('removeChildSources while baseSource', scene.additionalSources[i].baseSource)

                        if (scene.additionalSources[i].baseSource == parentSource) {
                            nextToRemove.push(scene.additionalSources[i]);
                            videoComposer.removeAdditionalSource(scene.additionalSources[i], true);
                        }
                    }
                    
                }
                if(nextToRemove.length != 0) {
                    removeChildSources(nextToRemove);
                }
            }
            removeChildSources([removedSource])
        });
    }

    function createScene(name) {
        log('canvasComposer: createScene');
        var newScene = new Scene();
        newScene.id = generateId();
        newScene.title = name;
        _scenes.push(newScene);

        _eventDispatcher.dispatch('sceneCreated', newScene);
        return newScene;
    }

    for(let i = 1; i <= 10; i++) {
        let scene = createScene('Scene ' + i);
        if(i == 1) _defaultScene = _activeScene = scene;
    }

    function removeScene(sceneInstance) {
        log('canvasComposer: removeScene', sceneInstance);
        for (let s in _scenes) {
            if (_scenes[s] == sceneInstance) {
                _scenes.splice(s, 1)
                break;
            }
        }
        log('canvasComposer: removeScene: scenes.sources', sceneInstance.sources.length);

        for (let r in sceneInstance.sources) {
            videoComposer.removeSource(sceneInstance.sources[r], sceneInstance, true);
        }
        log('canvasComposer: removeScene: scenes.sources 2', sceneInstance.sources.length);        
    }

    function getScenes() {
        return _scenes;
    }

    function moveSceneUp(scene) {
        log('_scenes BEFORE',_scenes.map(function(o) { return o.title}))
        let index;
        for(let i in _scenes) {
            if(scene == _scenes[i]) {
                index = parseInt(i);
                break;
            }
        }
        if(index != null) {
            moveScene(index, index - 1);
        }
        log('_scenes AFTER',_scenes.map(function(o) { return o.title}))
    }

    function moveSceneDown(scene) {
        let index;
        for(let i in _scenes) {
            if(scene == _scenes[i]) {
                index = parseInt(i);
                break;
            }
        }
        if(index != null) {
            moveScene(index, index + 1);
        }
    }

    function moveScene(old_index, new_index) {
        log('moveScene', old_index, new_index);
        if (new_index < 0) {
            new_index = 0;
        }
        if (new_index >= _scenes.length) {
            new_index = _scenes.length - 1;
        }
        _scenes.splice(new_index, 0, _scenes.splice(old_index, 1)[0]);
        _eventDispatcher.dispatch('sceneMoved');

        return _scenes;
    }

    function selectScene(sceneInstance) {
        //TODO: pause remote video
        log('selectScene', sceneInstance);

        let sceneExists = false;
        for(let s in _scenes) {
            if(_scenes[s] == sceneInstance) sceneExists = true;
        }
        if(sceneExists) {
            //pause all playing video/audio sources of previous scene
            for (let i in _activeScene.sources) {
                if(_activeScene.sources[i].sourceType == 'video' && _activeScene.sources[i].videoInstance) {
                    _activeScene.sources[i].videoInstance.pause();
                    _activeScene.sources[i].videoInstance.currentTime = 0;
                } else if(_activeScene.sources[i].sourceType == 'audio' && _activeScene.sources[i].audioInstance) {
                    _activeScene.audioSources[i].audioInstance.pause();
                    _activeScene.audioSources[i].audioInstance.currentTime = 0;
                }
            }
            for (let i in _activeScene.audioSources) {
                if(_activeScene.audioSources[i].sourceType == 'audio' && _activeScene.audioSources[i].audioInstance) {
                    _activeScene.audioSources[i].audioInstance.pause();
                    _activeScene.audioSources[i].audioInstance.currentTime = 0;
                } else if (_activeScene.audioSources[i].sourceType == 'webrtcaudio' && _activeScene.audioSources[i].mediaStreamTrack) {
                    _activeScene.audioSources[i].mediaStreamTrack.enabled = false;
                }
                
            }
            //currently only one webrtc group is possible in the scene, so we need to break loop
            for(let i in _activeScene.sources) {
                if(_activeScene.sources[i].sourceType == 'group' && _activeScene.sources[i].groupType == 'webrtc') {
                    if(_activeScene.sources[i].checkLoudestInterval) {
                        _activeScene.sources[i].checkLoudestInterval.stop();
                        break;
                    }
                }
            }

            let prevSelectedScene = _activeScene;
            _activeScene = sceneInstance;

            for(let i in _activeScene.sources) {
                if(_activeScene.sources[i].sourceType == 'group' && _activeScene.sources[i].groupType == 'webrtc') {
                    if(_activeScene.sources[i].checkLoudestInterval) {
                        _activeScene.sources[i].checkLoudestInterval.start();
                        break;
                    }
                }
            }
             //play all playing video/audio sources of new scene
            for (let i in _activeScene.sources) {
                if(_activeScene.sources[i].sourceType != 'video') continue;
                if(_activeScene.sources[i].videoInstance) {
                    _activeScene.sources[i].videoInstance.play();
                }
            }
            for (let i in _activeScene.audioSources) {
                if(_activeScene.audioSources[i].sourceType == 'audio' && _activeScene.audioSources[i].audioInstance) {
                    _activeScene.audioSources[i].audioInstance.play();
                } else if (_activeScene.audioSources[i].sourceType == 'webrtcaudio' && _activeScene.audioSources[i].mediaStreamTrack) {
                    if(_activeScene.audioSources[i].active)  _activeScene.audioSources[i].mediaStreamTrack.enabled = true;
                }
            }
            _eventDispatcher.dispatch('sceneSelected', {
                prevActiveScene: prevSelectedScene,
                activeSene: _activeScene
            });
            return true;
        }
        return false;
    }

    function getActiveScene() {
        return _activeScene;
    }

    var videoComposer = (function () {
        var _webrtcAudioGroup = null;
        var _availableWebRTCSources = [];
        var _size = {width:1920, height: 1080};
        var _inputCtx = null;
        var _isActive = null;
        var _canvasRenderInterval = null;

        function createCanvas() {
            var videoCanvas = document.createElement("CANVAS");
            videoCanvas.className = "live-editor-video-stream-canvas";
            videoCanvas.style.position = 'absolute';
            videoCanvas.style.top = '-999999999px';
            //videoCanvas.style.top = '0';
            videoCanvas.style.left = '0';
            //videoCanvas.style.zIndex = '9999999999999999999';
            videoCanvas.style.backgroundColor = '#000000';
            videoCanvas.width = _size.width;
            videoCanvas.height = _size.height;

            _inputCtx = videoCanvas.getContext('2d', { alpha: false, desynchronized: true });

            _canvas = videoCanvas;

        }
        createCanvas();

        function setCanvasSize(width, height){
            _size.width = width;
            _size.height = height;
            _canvas.width = _size.width;
            _canvas.height = _size.height;
        }

        function getCanvasSize() {
            return _size;
        }

        function setWebrtcLayoutRect(width, height, x, y){
            log('setWebrtcLayoutRect', width, height, x, y);
            if(width === null || height === null || x === null || y === null) return;
            if(width != null) _webrtcLayoutRect.width = parseFloat(width);
            if(height != null) _webrtcLayoutRect.height = parseFloat(height);
            if(x != null) _webrtcLayoutRect.x = parseFloat(x);
            if(y != null) _webrtcLayoutRect.y = parseFloat(y);
            if(_webrtcLayoutRect.updateTimeout != null) {
                clearTimeout(_webrtcLayoutRect.updateTimeout);
                _webrtcLayoutRect.updateTimeout = null;
            }
            _webrtcLayoutRect.updateTimeout = setTimeout(function () {
                updateActiveWebRTCLayouts();

            }, 100)

        }

        function getWebrtcLayoutRect(){
            return _webrtcLayoutRect;
        }

        var Source = function () {
            this._id = null;
            this.active = true;
            this._name = null;
            this.rect = null;
            this.parentGroup = null;
            this._color = null;
            this.on = function (event, callback) {
                if(this.eventDispatcher != null) this.eventDispatcher.on(event, callback)
            };
            this.params = {};
        }

        Object.defineProperties(Source.prototype, {
            'name': {
                'set': function(val) {
                    this._name = val;
                    if(this.eventDispatcher != null) this.eventDispatcher.dispatch('nameChanged', val)
                },
                'get': function() {
                    return this._name;
                }
            },
            'color': {
                'get': function () {
                    if(this._color != null) return this._color;
                    var letters = '0123456789ABCDEF';
                    var color = '#';
                    for (let i = 0; i < 6; i++) {
                        color += letters[Math.floor(Math.random() * 16)];
                    }
                    this._color = color;
                    return color;
                }
            },
            'rect': {
                'set': function(value) {
                    this._rect = value;
                    if(this.eventDispatcher != null) this.eventDispatcher.dispatch('rectChanged')
                },
                'get': function() {
                    return this._rect;
                }
            },
            'id': {
                'set': function(value) {
                    this._id = value;
                },
                'get': function() {
                    if(this._id == null) {
                        this._id = generateId();
                    }
                    return this._id;
                }
            }
        });

        var ImageSource = function () {
            var imageInstance = this;
            this.imageInstance = null;
            this.link = null;
            this.sourceType = 'image';
            this.rect = {
                _width:null,
                _height:null,
                _x:null,
                _y:null,
                set x(value) {
                    this._x = value;
                    if(imageInstance.eventDispatcher != null) imageInstance.eventDispatcher.dispatch('rectChanged')
                },
                set y(value) {
                    this._y = value;
                    if(imageInstance.eventDispatcher != null) imageInstance.eventDispatcher.dispatch('rectChanged')
                },
                set width(value) {
                    this._width = value;
                    if(imageInstance.eventDispatcher != null) imageInstance.eventDispatcher.dispatch('rectChanged')
                },
                set height(value) {
                    this._height = value;
                    if(imageInstance.eventDispatcher != null) imageInstance.eventDispatcher.dispatch('rectChanged')
                },
                get x() {return this._x;},
                get y() {return this._y;}
            };
            this.updateRect = function (width, height, x, y) {
                this.rect._width = width;
                this.rect._height = height;
                this.rect._x = x;
                this.rect._y = y;
            };

            this.eventDispatcher = new EventSystem();

            Object.defineProperties(this.rect, {
                'x': {
                    'set': function(value) {
                        this._x = value;
                        if(imageInstance.eventDispatcher != null) imageInstance.eventDispatcher.dispatch('rectChanged')
                    }
                },
                'y': {
                    'set': function(value) {
                        this._y = value;
                        if(imageInstance.eventDispatcher != null) imageInstance.eventDispatcher.dispatch('rectChanged')
                    }
                },
                'width': {
                    'set': function(value) {
                        this._width = value;
                        if(imageInstance.eventDispatcher != null) imageInstance.eventDispatcher.dispatch('rectChanged')
                    }
                },
                'height': {
                    'set': function(value) {
                        this._height = value;
                        if(imageInstance.eventDispatcher != null) imageInstance.eventDispatcher.dispatch('rectChanged')
                    }
                }
            });
        }

        ImageSource.prototype = new Source();

        var VideoSource = function () {
            var videoInstance = this;
            this.videoInstance = null;
            this.link = null;
            this.sourceType = 'video';
            this.audioSourceNode = null;
            this.rect = {
                _width:null,
                _height:null,
                _x:null,
                _y:null,
                set x(value) {
                    this._x = value;
                    if(videoInstance.eventDispatcher != null) videoInstance.eventDispatcher.dispatch('rectChanged')
                },
                set y(value) {
                    this._y = value;
                    if(videoInstance.eventDispatcher != null) videoInstance.eventDispatcher.dispatch('rectChanged')
                },
                get x() {return this._x;},
                get y() {return this._y;}
            };
            this.updateRect = function (width, height, x, y) {
                this.rect._width = width;
                this.rect._height = height;
                this.rect._x = x;
                this.rect._y = y;
            };

            this.setVolume = function (value) {
                if (!this.gainNode) return;
                this.gainNode.gain.value = value;
                if (this.eventDispatcher != null) this.eventDispatcher.dispatch('volumeChanged', value);
            };

            this.eventDispatcher = new EventSystem();

            Object.defineProperties(this.rect, {
                'x': {
                    'set': function(value) {
                        this._x = value;
                        if(videoInstance.eventDispatcher != null) videoInstance.eventDispatcher.dispatch('rectChanged')
                    }
                },
                'y': {
                    'set': function(value) {
                        this._y = value;
                        if(videoInstance.eventDispatcher != null) videoInstance.eventDispatcher.dispatch('rectChanged')
                    }
                },
                'width': {
                    'set': function(value) {
                        this._width = value;
                        if(videoInstance.eventDispatcher != null) videoInstance.eventDispatcher.dispatch('rectChanged')
                    }
                },
                'height': {
                    'set': function(value) {
                        this._height = value;
                        if(videoInstance.eventDispatcher != null) videoInstance.eventDispatcher.dispatch('rectChanged')
                    }
                }
            });
        }
        VideoSource.prototype = new Source();

        var VideoInputSource = function () {
            var instance = this;
            this.mediaStream = null;
            this.videoInstance = null;
            this.sourceType = 'videoInput';
            this.audioSourceNode = null;
            this.rect = {
                _width: null,
                _height: null,
                _x: null,
                _y: null,
                set x(value) {
                    this._x = value;
                    if (instance.eventDispatcher != null) instance.eventDispatcher.dispatch('rectChanged');
                },
                set y(value) {
                    this._y = value;
                    if (instance.eventDispatcher != null) instance.eventDispatcher.dispatch('rectChanged');
                },
                set width(value) {
                    this._width = value;
                    if (instance.eventDispatcher != null) instance.eventDispatcher.dispatch('rectChanged');
                },
                set height(value) {
                    this._height = value;
                    if (instance.eventDispatcher != null) instance.eventDispatcher.dispatch('rectChanged');
                },
                get x() { return this._x; },
                get y() { return this._y; }
            };
            // original size of video
            this.originalSize = {};
            this.frameRate = null;
            this.isScreensharing = false;

            this.update = function (e) {
                log('VideoInputSource update', e);
                
                if (instance.mediaStream != null && e.stream && e.stream != instance.mediaStream) {
                    let tracks = instance.mediaStream.getTracks();
                    for (let t in tracks) {
                        tracks[t].stop();
                    }

                    instance.mediaStream = e.stream;
                }
                if (e.originalSize != null) {
                    instance.originalSize = e.originalSize;
                }
                if (e.frameRate != null) {
                    instance.frameRate = e.frameRate;
                }
                instance.name = e.name;
            }

            this.eventDispatcher = new EventSystem();

        }
        VideoInputSource.prototype = new Source();

        var ReactionsSource = function (options) {
            var instance = this;
            this.sourceType = 'reactions';
            this.reactionsImages = {};
            this.particles = [];
            this.queue = [];
            this.animationIsActive = false;
            this.imagesLoaded = false;
            this.rect = {
                _width: null,
                _height: null,
                _x: null,
                _y: null,
                set x(value) {
                    this._x = value;
                    if (instance.eventDispatcher != null) instance.eventDispatcher.dispatch('rectChanged');
                },
                set y(value) {
                    this._y = value;
                    if (instance.eventDispatcher != null) instance.eventDispatcher.dispatch('rectChanged');
                },
                set width(value) {
                    this._width = value;
                    if (instance.eventDispatcher != null) instance.eventDispatcher.dispatch('rectChanged');
                },
                set height(value) {
                    this._height = value;
                    if (instance.eventDispatcher != null) instance.eventDispatcher.dispatch('rectChanged');
                },
                get x() { return this._x; },
                get y() { return this._y; }
            };
            this.addReaction = function (type) {
                if(instance.particles.length < 10) {
                    instance.particles.push(new Particle(instance.canvas.width / 2, instance.canvas.height, type));
                } else {
                    instance.queue.push(new Particle(instance.canvas.width / 2, instance.canvas.height, type));
                }

                if(!instance.animationIsActive) {
                    if(instance.imagesLoaded) {
                        instance.animationInterval = Q.Media.runWithSpecificFrameRate(animate, _fps);
                    }

                    function waitOnImagesLoad() {
                        instance.animationInterval = Q.Media.runWithSpecificFrameRate(animate, _fps);
                        instance.eventDispatcher.off('imagesLoaded', waitOnImagesLoad);
                    }

                    instance.eventDispatcher.on('imagesLoaded', waitOnImagesLoad);
                }
            };
            this.eventDispatcher = new EventSystem();

            createReactionsCanvas();

            function createReactionsCanvas() {
                instance.canvas = document.createElement("CANVAS");
                instance.canvas.width = options.width;
                instance.canvas.height = options.height;
                instance.eventDispatcher.on('rectChanged', function () {
                    instance.canvas.width = instance.rect._width;
                    instance.canvas.height = instance.rect._height;
                });

                instance.ctx = instance.canvas.getContext('2d');

                let emoji = Object.keys(tool.icons.reactions);

                let imgsLoaded = 0;
                for(let i in emoji) {
                    let emojiIcon = emoji[i];
                    // Step 4: Create a new image element
                    let img = new Image();
    
                    // Step 5: Once the image is loaded, draw it on the canvas
                    img.onload = function () {
                        instance.reactionsImages[emojiIcon] = img;
                        imgsLoaded++;
                        if(imgsLoaded == emoji.length) {
                            instance.imagesLoaded = true;
                            instance.eventDispatcher.dispatch('imagesLoaded');
                        }
                    };
    
                    // Set the source of the image to the SVG data URL
                    img.src = Q.url(tool.icons.reactions[emojiIcon]); 
                }

                
                
            }

            function createParticles(num) {
                for (var i = 0; i < num; i++) {
                    instance.particles.push(new Particle(instance.canvas.width / 2, instance.canvas.height));
                }
            }

            // Animation loop
            function animate() {
                instance.animationIsActive = true;
                instance.ctx.clearRect(0, 0, instance.ctx.canvas.width, instance.ctx.canvas.height);

                for(let i = instance.particles.length - 1; i >= 0; i--) {
                    let particle = instance.particles[i];
                    particle.update();
                    particle.draw();

                    // Remove particle if it's faded out
                    if (particle.alpha <= 0) {
                        instance.particles.splice(i, 1);
                        if(instance.particles.length < 50 && instance.queue.length != 0) {
                            let fromQueue = instance.queue.splice(0, 1)[0];
                            instance.particles.push(fromQueue);
                        }
                    }
                }

                // Repeat the animation until all particles are gone
                if (instance.particles.length <= 0) {
                    instance.animationIsActive = false;
                    Q.Media.stopRunWithSpecificFrameRate(instance.animationInterval);
                }
            }

            // Particle constructor function
            function Particle(x, y, type) {
                console.log('Particle type', type)
                this.type = type;
                this.x = x;
                this.y = y;
                this.size = 70;  // Adjust as needed
                this.speedY = 3.5;
                this.startX = randomIntFromInterval(0, instance.canvas.width - this.size);  // Store the starting x position
                this.startY = y;  // Store the starting y position
                this.alpha = 1.0;  // Start fully opaque
                this.amplitude = 20; // Amplitude of the zigzag
                this.frequency = 0.05; // Frequency of the zigzag
        
                this.img = instance.reactionsImages[this.type];  // emoji img
                console.log('Particle',  this.amplitude, this.frequency,  this.speedY)
                this.randomise(true);
            }

            Particle.prototype.update = function() {
                this.x = this.x - this.movementX;
                this.y = this.y - this.movementY;
            
                
                //this.y -= this.speedY;  // Move up
    
                // Calculate the zigzag movement
                //this.x = this.startX + Math.sin(this.y * this.frequency) * this.amplitude;
    
                // Update alpha based on the vertical position
                var distanceTraveled = this.startY - this.y;
                var totalDistance = instance.canvas.height;
                this.alpha = 1 - (distanceTraveled / totalDistance);
                if (this.alpha < 0) this.alpha = 0;
    
                // Ensure the particle stays within the canvas width
                if (this.x < 0 && instance.rect.x != 0) {
                    this.x = 0;
                } else if (this.x > instance.canvas.width - this.size && instance.rect.x + instance.rect._width < _size.width) {
                    this.x = instance.canvas.width - this.size;
                }
            };
            Particle.prototype.randomise = function(init) {
                this.movementX = this.generateDecimalBetween(-0.4, 0.4);
                this.movementY = this.generateDecimalBetween(2, 3.5);
                this.x = this.generateDecimalBetween(0, instance.canvas.width);
                this.y = init ? instance.canvas.height : this.generateDecimalBetween(0, instance.canvas.height);
            };
            Particle.prototype.generateDecimalBetween = function(min, max) {
                return (Math.random() * (min - max) + max).toFixed(2);
            };

            Particle.prototype.draw = function () {
                instance.ctx.globalAlpha = this.alpha;
                instance.ctx.drawImage(this.img, this.x, this.y, this.size, this.size);
            };
            
        }
        ReactionsSource.prototype = new Source();

        var RectObjectSource = function (rect) {
            this.sourceType = 'webrtcrect';
            this.widthFrom = rect.widthFrom;
            this.widthTo = rect.widthTo;
            this.heightFrom = rect.heightFrom;
            this.heightTo = rect.heightTo;
            this.frame = rect.frame;
            this.frames= rect.frames;
            this.xFrom = rect.xFrom;
            this.xTo = rect.xTo;
            this.yFrom = rect.yFrom;
            this.yTo = rect.yTo;
            this.fill = rect.fill;
            this.baseSource = rect.baseSource;
            this.eventDispatcher = new EventSystem();

        }
        RectObjectSource.prototype = new Source();

        var StrokeRectObjectSource = function (rect) {
            this.sourceType = 'strokerect';
            this.widthFrom = rect.widthFrom;
            this.widthTo = rect.widthTo;
            this.heightFrom = rect.heightFrom;
            this.heightTo = rect.heightTo;
            this.frame = rect.frame;
            this.frames= rect.frames;
            this.xFrom = rect.xFrom;
            this.xTo = rect.xTo;
            this.yFrom = rect.yFrom;
            this.yTo = rect.yTo;
            this.strokeStyle = rect.strokeStyle;
            this.lineWidth = rect.lineWidth;
            this.baseSource = rect.baseSource;
            this.eventDispatcher = new EventSystem();

        }
        StrokeRectObjectSource.prototype = new Source();

        var TextObjectSource = function (text) {
            this.sourceType = 'webrtctext';
            this.text = text.text;
            this.font = text.font;
            this.fillStyle = text.fillStyle;
            this.textHeight = text.textHeight;
            this.latestSize = text.latestSize;
            this.frame = text.frame;
            this.frames= text.frames;
            this.xFrom = text.xFrom;
            this.xTo = text.xTo;
            this.yFrom = text.yFrom;
            this.yTo = text.yTo;
            this.fill = text.fill;
            this.baseSource = text.baseSource;
            this.eventDispatcher = new EventSystem();

        }
        TextObjectSource.prototype = new Source();

        var GroupSource = function () {
            let groupInstance = this;
            this.groupType = null;
            this.sourceType = 'group';
            this.layoutName = null;
            this.scene = null;
            this.layoutManager = null; 
            this._currentLayout = null; 
            this.prevLayout = null; 
            this.pendingLayoutUpdate = null; 
            this.sources = []; 
            this.removedWebrtcSources = []; 
            this.layoutUpdateQueue = []; 
            this.activePresenterSources = []; 
            this.size = {width:_size.width, height:_size.height};
            this.rect = {
                _width:1920, 
                _height: 1080, 
                _x: 0, 
                _y: 0, 
                updateTimeout: null,
                updateGroupLayout: function () {
                    if(this.updateTimeout != null) {
                        clearTimeout(this.updateTimeout);
                        this.updateTimeout = null;
                    }
                    this.updateTimeout = setTimeout(function () {
                        updateWebRTCLayout(groupInstance);
                    }, 100)
                },
                set x(value) {
                    this._x = value;
                    if(groupInstance.eventDispatcher != null) groupInstance.eventDispatcher.dispatch('rectChanged');
                    this.updateGroupLayout();
                },
                set y(value) {
                    this._y = value;
                    if(groupInstance.eventDispatcher != null) groupInstance.eventDispatcher.dispatch('rectChanged');
                    this.updateGroupLayout();
                },
                set width(value) {
                    this._width = value;
                    if(groupInstance.eventDispatcher != null) groupInstance.eventDispatcher.dispatch('rectChanged');
                    this.updateGroupLayout();
                },
                set height(value) {
                    this._height = value;
                    if(groupInstance.eventDispatcher != null) groupInstance.eventDispatcher.dispatch('rectChanged');
                    this.updateGroupLayout();
                },
                get x() {return this._x;},
                get y() {return this._y;},
                get width() {return this._width;},
                get height() {return this._height;}
            };
            this.params = {
                tiledLayoutMargins: getOptions().liveStreaming && getOptions().liveStreaming.tiledLayoutMargins ? getOptions().liveStreaming.tiledLayoutMargins : 0,
                tiledLayoutInnerMargins: getOptions().liveStreaming && getOptions().liveStreaming.tiledLayoutInnerMargins ? getOptions().liveStreaming.tiledLayoutInnerMargins : 0,
                tiledLayoutOuterHorizontalMargins: getOptions().liveStreaming && getOptions().liveStreaming.tiledLayoutOuterHorizontalMargins ? getOptions().liveStreaming.tiledLayoutOuterHorizontalMargins : 0,
                tiledLayoutOuterVerticalMargins: getOptions().liveStreaming && getOptions().liveStreaming.tiledLayoutOuterVerticalMargins ? getOptions().liveStreaming.tiledLayoutOuterVerticalMargins : 0,
                audioLayoutBgColor: getOptions().liveStreaming && getOptions().liveStreaming.audioLayoutBgColor ? getOptions().liveStreaming.audioLayoutBgColor : "rgba(255, 255, 255, 0)",
                defaultLayout: getOptions().liveStreaming && getOptions().liveStreaming.defaultLayout ? getOptions().liveStreaming.defaultLayout : 'tiledStreamingLayout',
            };
            this.addChildSource = function(sourceInstance) {

                for (let i = groupInstance.removedWebrtcSources.length - 1; i >= 0; i--) {
                    let source = groupInstance.removedWebrtcSources[i];
                    if (source.track == sourceInstance.track) {
                        sourceInstance.isNewSourceOnCanvas = false;
                    }
                }
                if(groupInstance.groupType == 'webrtc') {
                    groupInstance.sources.push(sourceInstance);
                } else {
                    groupInstance.sources.splice(0, 0, sourceInstance)
                }
                _activeScene.eventDispatcher.dispatch('sourceAdded', sourceInstance);                                
            };
            this.getChildSources = function(type, active) {
                if(groupInstance.groupType == 'webrtc') {
                    if(active == null) {
                        return [...groupInstance.sources];

                    }
                    return groupInstance.sources.filter(function (source) {
                        return source.sourceType == type && source.active === true;
                    });
                }
            }
                
            this.eventDispatcher = new EventSystem();
        }
        GroupSource.prototype = new Source();

        Object.defineProperties(GroupSource.prototype, {
            'currentLayout': {
                'set': function(val) {
                    if(this.prevLayout != this._currentLayout) {
                        this.prevLayout = this._currentLayout;
                    }
                    this._currentLayout = val;
                },
                'get': function() {
                    return this._currentLayout;
                }
            }
        });

        /*var webrtcGroup = new GroupSource()
        webrtcGroup.name = 'Participants';
        webrtcGroup.groupType = 'webrtc';
        webrtcGroup.layoutManager = new LayoutManager(webrtcGroup);
        _defaultScene.sources.push(webrtcGroup);*/
       
        var WebRTCStreamSource = function (participant, parentGroup) {
            this.kind = null;
            this.participant = participant;
            this.parentGroup = parentGroup;
            this.name = participant.username ? participant.username.toLowerCase() : '';
            this.displayName = participant.username ? participant.username.toUpperCase() : '';
            this.avatar = participant.avatar ? participant.avatar.image : null;
            this.track = null;
            this.mediaStream = null;
            this.audioSourceNode = null;
            this.htmlVideoEl = null;
            this.screenSharing = false;
            this.sourceType = 'webrtc';
            this.caption =  participant.greeting;
            this.isNewSourceOnCanvas = true;
            this.eventDispatcher = new EventSystem();
            this.params = {
                captionBgColor: '#26A553',
                captionFontColor: '#FFFFFF',
                displayVideo: 'cover',
                flip: participant.isLocal ? true : false
            };
        }
        WebRTCStreamSource.prototype = new Source();

        _eventDispatcher.on('sourceRemoved', function (removedSource) {
            log('sourceRemoved', removedSource)
            function removeChildSources(parentSources) {
                log('removeChildSources', parentSources)

                var nextToRemove = [];
                for(let c in parentSources) {
                    let parentSource = parentSources[c];
                    for (let s in _scenes) {
                        let scene = _scenes[s];
                        for (let i = scene.sources.length - 1; i >= 0; i--) {
                            let source = scene.sources[i];
                            if (source.baseSource == parentSource) {
                                nextToRemove.push(source);
                                removeSource(source, true);
                            }
                        }
                    }
                    //var nextToRemove = [];
                    for (let s in _scenes) {
                        let scene = _scenes[s];
                        let i = scene.additionalSources.length;
                        while (i--) {
                            log('removeChildSources while', parentSources)
                            log('removeChildSources while baseSource', scene.additionalSources[i].baseSource)

                            if (scene.additionalSources[i].baseSource == parentSource) {
                                nextToRemove.push(scene.additionalSources[i]);
                                removeAdditionalSource(scene.additionalSources[i], true);
                            }
                        }
                    }
                }
                if(nextToRemove.length != 0) {
                    removeChildSources(nextToRemove);
                }
            }
            removeChildSources([removedSource])
        });

        function getWebrtcGroupIndex(webrtcGroup) {
            for (let j in _activeScene.sources) {
                if (_activeScene.sources[j] == webrtcGroup) {

                    var childItems = 0;
                    for(let i in _activeScene.sources) {
                        if(_activeScene.sources[i].parentGroup == webrtcGroup) {
                            childItems++;
                        }
                    }

                    return {index:parseInt(j), childItemsNum: childItems };
                }
            }
            return {index:0, childItemsNum: 0 };
        }

        function addSource(newSource, scene, successCallback, failureCallback) {
            console.log('addSource: start', newSource)
            var scene = scene || _activeScene;

            if( newSource instanceof RectObjectSource || newSource instanceof StrokeRectObjectSource || newSource instanceof TextObjectSource) {
                addAdditionalSource(newSource);
                return;
            }

            function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {
                var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
                return { width: srcWidth*ratio, height: srcHeight*ratio };
            }

            if(newSource.sourceType == 'webrtcGroup') {
                log('addSource: add webrtcGroup')
                var webrtcGroup = new GroupSource()
                webrtcGroup.scene = scene;
                webrtcGroup.name = newSource.title || 'Participants';
                webrtcGroup.groupType = 'webrtc';
                webrtcGroup.layoutManager = new LayoutManager(webrtcGroup);
                webrtcGroup.checkLoudestInterval = addMonitoringVolume(webrtcGroup);
                if(_activeScene == scene) {
                    webrtcGroup.checkLoudestInterval.start();
                }

                scene.sources.splice(0, 0, webrtcGroup)
                scene.eventDispatcher.dispatch('sourceAdded', webrtcGroup);
                
                return webrtcGroup;
            } else if(newSource.sourceType == 'webrtc') {
                //seems this code is redundant now as visual webrtc sources are added in updateWebRTCLayout
                log('addSource webrtc')
                let webrtcGroup = getWebrtcGroupIndex(newSource.parentGroup);
                let insertAfterIndex = webrtcGroup.index + 1 + webrtcGroup.childItemsNum;
               
                log('addSource add at the end ' + insertAfterIndex, scene.sources.length)

                newSource.audioSource = audioComposer.addSource({
                    sourceType: 'webrtcaudio',
                    participant: newSource.participant
                }, scene);

                for (let i = scene.removedWebrtcSources.length - 1; i >= 0; i--) {
                    let source = scene.removedWebrtcSources[i];
                    if (source.track == newSource.track) {
                        newSource.isNewSourceOnCanvas = false;
                    }
                }
                scene.sources.splice(insertAfterIndex, 0, newSource)
                scene.eventDispatcher.dispatch('sourceAdded', newSource);
                return;

            } else if(newSource.sourceType == 'image') {
                log('addSource image')

                var imageSource = new ImageSource();
                imageSource.imageInstance = newSource.imageInstance;
                imageSource.name = newSource.title;
                scene.sources.splice(0, 0, imageSource)

                scene.eventDispatcher.dispatch('sourceAdded', imageSource);

                return imageSource;
            } else if(newSource.sourceType == 'videoInput') {
                log('addSource videoInput')
                let stream = newSource.mediaStreamInstance;

                var video = document.createElement('VIDEO');
                video.muted = false;
                video.loop = getOptions().liveStreaming && getOptions().liveStreaming.loopVideo ? getOptions().liveStreaming.loopVideo : true;
                video.setAttribute("playsinline","");
                video.addEventListener('loadedmetadata', event => {
                    log(video.videoWidth, video.videoHeight)
                })
                video.style.position = 'absolute';
                video.style.top = '-999999999px';
                document.body.appendChild(video);
                video.srcObject = stream;
                var videoInputSource = new VideoInputSource();
                videoInputSource.videoInstance = video;
                videoInputSource.mediaStream = stream;
                videoInputSource.name = newSource.title;
                videoInputSource.id = generateId();
                videoInputSource.sceneId = scene.id;
                videoInputSource.originalSize = newSource.originalSize;
                videoInputSource.frameRate = newSource.frameRate;
                videoInputSource.isScreensharing = newSource.screensharing;
                scene.sources.splice(0, 0, videoInputSource);
                var playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.then(function() {
                        if(successCallback != null) successCallback();
                    }).catch(function(error) {
                        if(failureCallback != null) failureCallback(error);
                    });
                }
                if (videoInputSource.mediaStream.getAudioTracks().length != 0) {
                    log('addSource videoInput: add audio')
                    audioComposer.addSource(videoInputSource, scene);
                }
                scene.eventDispatcher.dispatch('sourceAdded', videoInputSource);

                return videoInputSource;
            } else if(newSource.sourceType == 'imageBackground') {
                log('addSource image')

                var imageSource = new ImageSource();
                imageSource.imageInstance = newSource.imageInstance;
                imageSource.name = newSource.title;
                scene.backgroundSources.splice(0, 0, imageSource)

                scene.eventDispatcher.dispatch('sourceAdded', imageSource);

                return imageSource;
            } else if(newSource.sourceType == 'imageOverlay') {
                log('addSource image')

                var imageSource = new ImageSource();
                imageSource.imageInstance = newSource.imageInstance;
                imageSource.name = newSource.title;
                if(newSource.opacity) imageSource.opacity = newSource.opacity;

                let imageWidth = imageSource.imageInstance.naturalWidth;
                let imageHeight = imageSource.imageInstance.naturalHeight;

                let fitSize = calculateAspectRatioFit(imageWidth, imageHeight, 100, 100);
                if(newSource.position == 'right-bottom') {
                    imageSource.rect._x = _size.width - (fitSize.width + 20);
                    imageSource.rect._y = _size.height - (fitSize.height + 20);
                } else  if(newSource.position == 'right-top') {
                    imageSource.rect._x = _size.width - (fitSize.width + 20);
                    imageSource.rect._y = 20;
                } else  if(newSource.position == 'left-top') {
                    imageSource.rect._x = 20;
                    imageSource.rect._y = 20;
                } else  if(newSource.position == 'left-bottom') {
                    imageSource.rect._x = 20;
                    imageSource.rect._y = _size.height - (fitSize.height + 20);
                } else  if(newSource.position == 'center-bottom') {
                    imageSource.rect._x = _size.width / 2 - fitSize.height / 2;
                    imageSource.rect._y = _size.height - (fitSize.height + 20);
                } else  if(newSource.position == 'center-top') {
                    imageSource.rect._x = _size.width / 2 - fitSize.height / 2;
                    imageSource.rect._y = 20;
                }
                imageSource.rect._width = fitSize.width;
                imageSource.rect._height = fitSize.height;

                scene.overlaySources.splice(0, 0, imageSource)

                scene.eventDispatcher.dispatch('sourceAdded', imageSource);

                return imageSource;
            } else if(newSource.sourceType == 'video') {
                log('addSource video')
                var video = document.createElement('VIDEO');
                video.muted = false;
                video.setAttribute("playsinline","");
                video.loop = getOptions().liveStreaming && getOptions().liveStreaming.loopVideo ? getOptions().liveStreaming.loopVideo : true;
                video.addEventListener('loadedmetadata', event => {
                    log(video.videoWidth, video.videoHeight)
                })
                video.src = newSource.url;
                var videoSource = new VideoSource();
                videoSource.videoInstance = video;
                videoSource.name = newSource.title;
                scene.sources.splice(0, 0, videoSource);
                var playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.then(function() {
                        if(successCallback != null) successCallback();
                    }).catch(function(error) {
                        if(failureCallback != null) failureCallback(error);
                    });
                }
                audioComposer.addSource(videoSource, scene);
                scene.eventDispatcher.dispatch('sourceAdded', videoSource);

                return videoSource;
            } else if(newSource.sourceType == 'videoBackground') {
                log('addSource video')

                var video = document.createElement('VIDEO');
                video.muted = true;
                video.setAttribute("playsinline","");
                video.style.display = 'none';
                video.loop = getOptions().liveStreaming && getOptions().liveStreaming.loopVideo ? getOptions().liveStreaming.loopVideo : true;
                video.addEventListener('loadedmetadata', event => {
                    log(video.videoWidth, video.videoHeight)
                })
                video.src = newSource.url;
                var videoSource = new VideoSource();
                videoSource.videoInstance = video;
                videoSource.name = newSource.title;
                scene.backgroundSources.splice(0, 0, videoSource);

                video.muted = true;
                video.autoplay = true;
                /*var playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.then(function() {
                        if(successCallback != null) successCallback();
                    }).catch(function(error) {
                        if(failureCallback != null) failureCallback(error);
                    });
                }*/

                scene.eventDispatcher.dispatch('sourceAdded', videoSource);

                return videoSource;
            } else if(newSource.sourceType == 'reactions') {
                let source = new ReactionsSource({
                    width: _size.width / 2,
                    height: (_size.height / 2)
                });
                source.rect._x = (_size.width / 100 * 25);
                source.rect._y = _size.height - (_size.height / 2);
                source.rect._width = _size.width / 2;
                source.rect._height = (_size.height / 2);

                scene.overlaySources.splice(0, 0, source)
                scene.eventDispatcher.dispatch('sourceAdded', source);

                return source;
            } else {
                scene.sources.unshift(newSource);
                //scene.eventDispatcher.dispatch('sourceAdded', newSource);

            }
        }

        function addAdditionalSource(newSource, backward) {
            if(backward){
                _activeScene.additionalSources.push(newSource);
            } else {
                _activeScene.additionalSources.unshift(newSource);
            }
            _activeScene.eventDispatcher.dispatch('sourceAdded', newSource);
        }

        function removeSource(source, doNotFireEvent) {
            log('removeSource: start', source)
            if( source instanceof RectObjectSource || source instanceof TextObjectSource) {
                removeAdditionalSource(source, doNotFireEvent);
                return;
            }

            if(source.sourceType == 'webrtc' || (source.sourceType == 'group' && source.groupType == 'webrtc')) {
                log('removeSource before',  _activeScene.sources.length)

                for (let j in _activeScene.sources) {
                    if (_activeScene.sources[j] == source) {
                        _activeScene.sources.splice(j, 1)
                        _activeScene.removedWebrtcSources.push(source);
                        break;
                    }
                }
                log('removeSource after',  _activeScene.sources.length)

                if(source.videoInstance != null) source.videoInstance.pause();
                audioComposer.muteSourceLocally(source);
                if(!doNotFireEvent) _activeScene.eventDispatcher.dispatch('sourceRemoved', source);
                return;
            }

            for (let j in _activeScene.sources) {
                if (_activeScene.sources[j] == source) {
                    _activeScene.sources.splice(j, 1)
                    break;
                }
            }
            if(source.videoInstance != null) source.videoInstance.pause();
            audioComposer.muteSourceLocally(source);
            if(!doNotFireEvent) _activeScene.eventDispatcher.dispatch('sourceRemoved', source);
        }

        function removeAdditionalSource(source, doNotFireEvent) {
            for (let j in _activeScene.additionalSources) {
                if (_activeScene.additionalSources[j] == source) {
                    _activeScene.additionalSources.splice(j, 1)
                    break;
                }
            }
            if(!doNotFireEvent) _activeScene.eventDispatcher.dispatch('sourceRemoved', source);
        }

        function moveSource(old_index, new_index) {
            log('moveSource', old_index, new_index);
            
            if (new_index < 0) {
                new_index = 0;
            }
            if (new_index >= _activeScene.sources.length) {
                new_index = _activeScene.sources.length - 1;
            }
            _activeScene.sources.splice(new_index, 0, _activeScene.sources.splice(old_index, 1)[0]);
            _activeScene.eventDispatcher.dispatch('sourceMoved');

            return _activeScene.sources;
        }

        function moveSourceBackward(source) {
            log('moveSourceBackward');
            /*if(source.sourceType == 'group') {
                var childItems = 0;
                for(let i in _activeScene.sources) {
                    if(_activeScene.sources[i].parentGroup == source) {
                        childItems++;
                    }
                }
                log('moveSourceBackward childItems', childItems);

                for(let i in _activeScene.sources) {
                    if(_activeScene.sources[i] == source) {
                        log('moveForward ==', i);

                        _activeScene.sources.splice(i + 1, 0, ...(_activeScene.sources.splice(i, childItems + 1)) );
                        _activeScene.eventDispatcher.dispatch('sourceMoved');

                        break;
                    }
                }
                log('moveSourceBackward  _activeScene.sources',  _activeScene.sources);

                return;
            }*/
            for(let i in _activeScene.sources) {
                if(_activeScene.sources[i] == source) {
                    log('moveForward ==', i);
                    log('moveSourceBackward for', _activeScene.sources[i], source);
                    let indexToInsert = parseInt(i) + 1;
                    let childItems = 0;
                    if(_activeScene.sources[i].parentGroup != null && _activeScene.sources[i].parentGroup != _activeScene.sources[indexToInsert].parentGroup) {
                        break;
                    } else if(_activeScene.sources[i].parentGroup != null && _activeScene.sources[i].parentGroup == _activeScene.sources[indexToInsert].parentGroup) {
                        moveSource(i, indexToInsert + childItems);
                        break;
                    } /*else if(_activeScene.sources[indexToInsert] && _activeScene.sources[indexToInsert].sourceType == 'group') {
                        for(let i in _activeScene.sources) {
                            let groupToSkip = _activeScene.sources[indexToInsert].parentGroup != null ? _activeScene.sources[indexToInsert].parentGroup :  _activeScene.sources[indexToInsert];
                            if(_activeScene.sources[i].parentGroup == groupToSkip) {
                                childItems++;
                            }
                        }
                    }*/
                    moveSource(i, indexToInsert + childItems);
                    break;
                }
            }
        }

        function moveSourceForward(source) {
            log('moveSourceForward', source);
            if(source.sourceType == 'group') {
                var childItems = 0;
                for(let i in _activeScene.sources) {
                    if(_activeScene.sources[i].parentGroup == source) {
                        childItems++;
                    }
                }
                log('moveSourceForward childItems', childItems);

                for(let i in _activeScene.sources) {
                    if(_activeScene.sources[i] == source) {
                        log('moveForward ==', i);

                        _activeScene.sources.splice(i - (childItems + 1), 0, ...(_activeScene.sources.splice(i, childItems + 1)) );
                        _activeScene.eventDispatcher.dispatch('sourceMoved');

                        break;
                    }
                }
                log('moveSourceForward  _activeScene.sources',  _activeScene.sources);

                return;
            }

            for(let i in _activeScene.sources) {
                log('moveSourceForward i', i);
                log('moveSourceForward for', _activeScene.sources[i], source);

                if(_activeScene.sources[i] == source) {
                    let indexToInsert = parseInt(i) - 1;
                    let childItems = 0;
                    log('moveSourceForward for parentGroup', _activeScene.sources[i].parentGroup);

                    /*if(_activeScene.sources[i].parentGroup == null && _activeScene.sources[indexToInsert] && _activeScene.sources[indexToInsert].parentGroup != null) {
                        for(let i in _activeScene.sources) {
                            if(_activeScene.sources[i].parentGroup ==  _activeScene.sources[indexToInsert].parentGroup) {
                                childItems++;
                            }
                        }
                        log('moveSourceForward for 1');

                    } else*/
                    if(_activeScene.sources[i].parentGroup != null && _activeScene.sources[indexToInsert] && _activeScene.sources[i].parentGroup == _activeScene.sources[indexToInsert]) {
                        return;
                    }
                    log('moveSourceForward for childItems', childItems);

                    moveSource(i, indexToInsert - childItems);
                    break;
                }
            }
        }

        function showSource(source, excludeFromLayout) {
            log('showSource', source);
            if(source.sourceType == 'group') {
                for(let i in _activeScene.sources) {
                    if(_activeScene.sources[i].parentGroup == source) {
                        _activeScene.sources[i].active = true;
                        if(_activeScene.sources[i].sourceType == 'webrtc') {

                        }
                    }
                }
            }

            source.active = true;

            if(source.sourceType == 'webrtc' || source.groupType == 'webrtc') {
                updateActiveWebRTCLayouts();
            }

            function showChildAdditionalSources(parentSources) {
                var nextToShow = [];
                for(let c in parentSources) {
                    let parentSource = parentSources[c];
                    for (let s in _scenes) {
                        let scene = _scenes[s];
                        for (let i = scene.sources.length - 1; i >= 0; i--) {
                            let source = scene.sources[i];
                            if (source.baseSource == parentSource) {
                                nextToShow.push(source);
                                source.active = true;
                            }
                        }
                    }

                    for (let s in _scenes) {
                        let scene = _scenes[s];
                        let i = scene.additionalSources.length;
                        while (i--) {
                            log('removeChildSources while', parentSources)
                            log('removeChildSources while baseSource', scene.additionalSources[i].baseSource)

                            if (scene.additionalSources[i].baseSource == parentSource) {
                                nextToShow.push(scene.additionalSources[i]);
                                scene.additionalSources[i].active = true;
                            }
                        }
                    }
                }
                if(nextToShow.length != 0) {
                    showChildAdditionalSources(nextToShow);
                }
            }
            showChildAdditionalSources([source])


            _activeScene.eventDispatcher.dispatch('sourceShowed', source);
        }

        function hideSource(source) {
            log('hideSource', source);
            if(source.sourceType == 'group') {
                for(let i in _activeScene.sources) {
                    if(_activeScene.sources[i].parentGroup == source) {
                        _activeScene.sources[i].active = false;
                    }
                }
            }

            source.active = false;

            if(source.sourceType == 'webrtc' || source.groupType == 'webrtc') {
                updateActiveWebRTCLayouts();
            }

            function hideChildAdditionalSources(parentSources) {
                log('removeChildSources', parentSources)

                var nextToHide = [];
                for(let c in parentSources) {
                    let parentSource = parentSources[c];
                    for (let s in _scenes) {
                        let scene = _scenes[s];
                        for (let i = scene.sources.length - 1; i >= 0; i--) {
                            let source = scene.sources[i];
                            if (source.baseSource == parentSource) {
                                nextToHide.push(source);
                                source.active = false;
                            }
                        }
                    }

                    for (let s in _scenes) {
                        let scene = _scenes[s];
                        let i = scene.additionalSources.length;
                        while (i--) {
                            log('removeChildSources while', parentSources)
                            log('removeChildSources while baseSource', scene.additionalSources[i].baseSource)

                            if (scene.additionalSources[i].baseSource == parentSource) {
                                nextToHide.push(scene.additionalSources[i]);
                                scene.additionalSources[i].active = false;
                            }
                        }
                    }
                }
                if(nextToHide.length != 0) {
                    hideChildAdditionalSources(nextToHide);
                }
            }
            hideChildAdditionalSources([source])
        }

        function updateActiveWebRTCLayouts(layoutName) {
            log('updateActiveWebRTCLayouts start')

            for(let i in _activeScene.sources) {
                if(_activeScene.sources[i].sourceType == 'group' && _activeScene.sources[i].groupType == 'webrtc') {
                    let layoutToRender = layoutName != 'previous' ? layoutName : _activeScene.sources[i].prevLayout;
                    updateWebRTCLayout(_activeScene.sources[i], layoutToRender);
                }
            }
        }

        function updateWebRTCLayout(webrtcGroupSource, layoutName, startAsEmpty) {
            log('updateWebRTCCanvasLayout start', layoutName, webrtcGroupSource.currentLayout, startAsEmpty)
            
            function getTransitionTime() {
                return webrtcGroupSource.currentLayout == 'loudestFullScreen' && webrtcGroupSource.loudestMode ? 0 : 300
            }
          
            if(webrtcGroupSource.pendingLayoutUpdate) {
                //log('updateWebRTCCanvasLayout: pendingLayoutUpdate: cancel')
                webrtcGroupSource.layoutUpdateQueue.push({args: Array.prototype.slice.call(arguments)});
                return;
            }
            
            var participants = tool.webrtcSignalingLib.roomParticipants(true);

            webrtcGroupSource.pendingLayoutUpdate = true;

            if(layoutName == 'loudestFullScreen' || (!layoutName && webrtcGroupSource.currentLayout == 'loudestFullScreen')) {
                webrtcGroupSource.loudestMode = true;
                layoutName = 'loudestFullScreen'
            } if(layoutName == 'floatingScreenSharing' || (!layoutName && webrtcGroupSource.currentLayout == 'floatingScreenSharing')) {
                webrtcGroupSource.loudestMode = true;
                layoutName = 'floatingScreenSharing'
            } else {
                webrtcGroupSource.loudestMode = false;
            }

            log('updateWebRTCCanvasLayout: layoutChanged = ', layoutName, webrtcGroupSource.currentLayout, !webrtcGroupSource.loudestMode, (layoutName != webrtcGroupSource.currentLayout && !webrtcGroupSource.loudestMode))

            var layoutChanged = false;
            if(layoutName && ((layoutName != webrtcGroupSource.currentLayout && !webrtcGroupSource.loudestMode) || (layoutName == 'tiledStreamingLayout' && webrtcGroupSource.currentLayout == 'tiledStreamingLayout' && webrtcGroupSource.currentLayoutMode == 'audioOnly'))) {
                layoutChanged = true;
                log('updateWebRTCCanvasLayout: layoutChanged true1');
            }

            if(layoutName == 'audioOnly') {
                webrtcGroupSource.currentLayoutMode = 'audioOnly';
            } else if(layoutName) {
                webrtcGroupSource.currentLayoutMode = 'regular';
            }

            log('updateWebRTCCanvasLayout: layoutChanged true2', webrtcGroupSource.layoutManager.currentRects.length, participants.length);

            if(webrtcGroupSource.layoutManager.currentRects.length != participants.length) {
                layoutChanged = true;

                log('updateWebRTCCanvasLayout: layoutChanged true2');
            }
            
            var allWebRTCSources = [...webrtcGroupSource.sources];
            allWebRTCSources = allWebRTCSources.reverse();
            log('updateWebRTCCanvasLayout: order cur', JSON.stringify(allWebRTCSources.map(function (o) {
                return {id: o.id, rect: o.rect}
            })));
            //create canvas screens/streams for new participants
            for (let v in participants) {
                //log('updateWebRTCCanvasLayout participant', participants[v].online, participants[v])

                //get those tracks of participant that are rendered currently on canvas
                let renderedTracks = [];
                for (let j in allWebRTCSources) {
                    if (allWebRTCSources[j].participant == participants[v]) {
                        renderedTracks.push(allWebRTCSources[j])
                    }
                }

                //log('updateWebRTCCanvasLayout renderedTracks', renderedTracks)

                //if participant is offline, remove those track from canvas
                if (participants[v].online == false) {
                    for(let t = allWebRTCSources.length - 1; t >= 0; t--) {
                        if(allWebRTCSources[t].participant == participants[v]) {
                            allWebRTCSources.splice(t, 1);
                        }
                    }
                    //log('updateWebRTCCanvasLayout participants[v].online == false: REMOVE ALL TRACKS')
                    continue;
                }

                //if participant has no any of his video/audio on canvas, 
                //add him as avatar+audio visualization on canvas - this is default representation of user on the canvas
                if(renderedTracks.length == 0) {
                    let canvasStream = new WebRTCStreamSource(participants[v], webrtcGroupSource);
                    canvasStream.kind = 'audio';
                    canvasStream.mainStream = true;
                    canvasStream.active = startAsEmpty ? false : true;
                    allWebRTCSources.push(canvasStream);
                }

                //add audio of user if still not added
                audioComposer.addSource({
                    sourceType: 'webrtcaudio',
                    participant: participants[v]
                }, webrtcGroupSource.scene);
            }

            for (let v in participants) {
                //get those tracks of participant that are rendered currently on canvas
                let renderedTracks = [];
                for (let j in allWebRTCSources) {
                    if (allWebRTCSources[j].participant == participants[v]) {
                        renderedTracks.push(allWebRTCSources[j])
                    }
                }

                let inactiveSourcesOfUser = webrtcGroupSource.removedWebrtcSources.filter(function (o) {
                    return o.participant == participants[v];
                });

                let videoTracks = participants[v].tracks.filter(function (trackObj) {
                    return trackObj.kind == 'video' && !(/*trackObj.mediaStreamTrack.muted == true ||*/ trackObj.mediaStreamTrack.enabled == false || trackObj.mediaStreamTrack.readyState == 'ended' || trackObj.stream.active == false);
                });

                //check if all currently rendered video tracks of the user are still active (readyState is not "ended" etc.)
                //and if not - remove this track from canvas or replace it with audio+avatar
                for(let t = allWebRTCSources.length - 1; t >= 0; t--) {
                    if(allWebRTCSources[t].participant == participants[v] && allWebRTCSources[t].kind == 'video') {
                        let trackIsAcite = videoTracks.indexOf(allWebRTCSources[t].track) != -1;
                        if(!trackIsAcite) {
                            if(!allWebRTCSources[t].mainStream) {
                                allWebRTCSources.splice(t, 1);
                            } else {
                                allWebRTCSources[t].kind = 'audio';
                                allWebRTCSources[t].track = null;
                                allWebRTCSources[t].mediaStream = null;
                                allWebRTCSources[t].htmlVideoEl = null;
                            }
                        }
                    }
                }

                //if user doesn't have any video tracks, skip him (he will still have video+audio visualization on the canvas)
                if(videoTracks.length == 0) {
                    continue;
                }

                //check if all users's active video tracks are rendered on canvas; if not - add this track on canvas by 
                //replacing current avatar+audio visualization with video track, or, if it's screensharing - by adding additional video 
                //on canvas because there should be scrensharing video and the avatar/camera video of the user who's this screensharing is
                for(let t in videoTracks) {
                    let videoIsRendered = false;
                    for(let r in renderedTracks) {
                        if(renderedTracks[r].track && renderedTracks[r].track == videoTracks[t]) {
                            videoIsRendered = true;
                        }
                    }

                    if(videoIsRendered) {
                        continue;
                    }

                    //add additional video if this track is screensharing
                    if (videoTracks[t].screensharing) {
                        let canvasStream = new WebRTCStreamSource(participants[v], webrtcGroupSource);
                        canvasStream.kind = 'video';
                        canvasStream.name = canvasStream.name + '(screen)';
                        canvasStream.track = videoTracks[t];
                        canvasStream.mediaStream = videoTracks[t].stream;
                        canvasStream.htmlVideoEl = videoTracks[t].trackEl;
                        canvasStream.active = startAsEmpty ? false : true;
                        canvasStream.screenSharing = true;
                        canvasStream.params.flip = false;

                        allWebRTCSources.push(canvasStream)
                    } else {
                        for (let r in renderedTracks) {
                            if (renderedTracks[r].mainStream) {
                                renderedTracks[r].kind = 'video';
                                renderedTracks[r].track = videoTracks[t];
                                renderedTracks[r].mediaStream = videoTracks[t].stream;
                                renderedTracks[r].htmlVideoEl = videoTracks[t].livestreamVideoProcessor && videoTracks[t].livestreamVideoProcessor.processedTrack ? videoTracks[t].livestreamVideoProcessor.processedTrack.trackEl : videoTracks[t].trackEl;
                                renderedTracks[r].parentGroup = webrtcGroupSource;
                                renderedTracks[r].active = startAsEmpty ? false : true;
                                break;
                            }
                        }
                    }
                }                                
            }

            var videoTracksOfUserWhoShares = [];
            //if user has screensharing tracks and current layout is any of *screensharing, we should take ALL videos of this user 
            //and put it at the beginning of webrtc group as layout rectangles are generated in corresponding order - (first rects - for screensharing and for the videos
            //of the user who shares screen, next - all the rest rectangles)
            let screensharingLayout = layoutName == 'screenSharing' || layoutName == 'audioScreenSharing' || layoutName == 'sideScreenSharing' || layoutName == 'floatingScreenSharing' 
            || ((webrtcGroupSource.currentLayout == 'screenSharing' || webrtcGroupSource.currentLayout == 'audioScreenSharing' || webrtcGroupSource.currentLayout == 'sideScreenSharing' || webrtcGroupSource.currentLayout == 'floatingScreenSharing') && !layoutName)
            if(screensharingLayout) {
                log('updateWebRTCCanvasLayout: sdaraort streams')

                var getOtherUsersTracks = function(participant, screenSharingStream) {

                    //add another screensharing of this participant to the beginning of group
                    for(let k = allWebRTCSources.length - 1; k >= 0; k--){

                        if(allWebRTCSources[k].participant != participant) continue;
                        if(allWebRTCSources[k].screenSharing && allWebRTCSources[k] != screenSharingStream) {
                            videoTracksOfUserWhoShares.unshift(allWebRTCSources[k]);
                            allWebRTCSources.splice(k, 1);
                        }
                    }

                    //add video from cameras after screensharings videos (so screensharing is on background of other videos)
                    for(let k = allWebRTCSources.length - 1; k >= 0; k--){
                        if(allWebRTCSources[k].participant != participant) continue;

                        if(!allWebRTCSources[k].screenSharing) {
                            videoTracksOfUserWhoShares.push(allWebRTCSources[k])
                            allWebRTCSources.splice(k, 1);
                        }
                    }
                }

                // check if there are new screensharing streams added
                for(let r = 0; r < allWebRTCSources.length; r++){
                    if(!allWebRTCSources[r].screenSharing) continue;

                    let screenSharingStream = allWebRTCSources[r];
                    allWebRTCSources.splice(r, 1);
                    videoTracksOfUserWhoShares.unshift(screenSharingStream)

                    getOtherUsersTracks(screenSharingStream.participant, screenSharingStream)

                    break;
                }
                
                allWebRTCSources = videoTracksOfUserWhoShares.concat(allWebRTCSources);   
                webrtcGroupSource.activePresenterSources = videoTracksOfUserWhoShares;
            } else {
                webrtcGroupSource.activePresenterSources = [];
                //if it's not any of screensharing layouts, remove screensharing videos from layout
                console.log('remove screensharing')
                for(let k = allWebRTCSources.length - 1; k >= 0; k--){    
                    if(allWebRTCSources[k].screenSharing) {
                        allWebRTCSources.splice(k, 1);
                        console.log('remove screensharing 1')
                    }
                }
            }
          
            let loudestSource;
            if(webrtcGroupSource.loudestMode) {
                //we have specific scenario for floatingScreenSharing layout. This layout shows 1) presenter 2) his screensharing
                //3) the loudest person (except presenter) in the room. So we need to find the loudest person except presenter
                //and move him to the index 3 
                if(layoutName == 'floatingScreenSharing' || (!layoutName && webrtcGroupSource.currentLayout == 'floatingScreenSharing')) {
                    let allExceptPresenter = allWebRTCSources.filter(function (o) {
                        if(videoTracksOfUserWhoShares.indexOf(o) != -1) {
                            return false;
                        } else {
                            return true;
                        }
                    });

                    if(allExceptPresenter.length != 0) {
                        let loudest = allExceptPresenter.reduce(function (current, previous) {
                            return current.audioLevel >= previous.audioLevel ? current : previous;
                        }, allExceptPresenter[0])
                        for(let k in allWebRTCSources){
                            if(allWebRTCSources[k] == loudest)  {
                                loudestSource = allWebRTCSources.splice(k, 1)[0];
                                console.log('floatingScreenSharing: loudestSource', loudestSource);

                                allWebRTCSources.splice(0, 0, loudestSource);
                                break;
                            } 
                        } 
                    }
                } else {
                    for(let k in allWebRTCSources){
                        if(allWebRTCSources[k].screenSharing || !allWebRTCSources[k].loudest) continue;
                        loudestSource = allWebRTCSources.splice(k, 1)[0];              
                        allWebRTCSources.unshift(loudestSource);    
                        break;
                    } 
                }
            }
            console.log('floatingScreenSharing: loudestSource allWebRTCSources', allWebRTCSources[0], allWebRTCSources[1], allWebRTCSources[2]);

            //log('updateWebRTCCanvasLayout: webrtcGroupSource.currentLayoutMode', webrtcGroupSource.currentLayoutMode)
            //log('updateWebRTCCanvasLayout: screensharing added', allWebRTCSources.map(o=>o.name), allWebRTCSources)

            //if current layout mode is "audioOnly", remove all video tracks except .mainStream = true, and change kind of rest video tracks to "audio"
            if(webrtcGroupSource.currentLayoutMode == 'audioOnly') {
                let onlyAudioStreams = [];
                for(let s in allWebRTCSources) {
                    if(allWebRTCSources[s].mainStream) {
                        allWebRTCSources[s].kind = 'audio';
                        allWebRTCSources[s].track = null;
                        allWebRTCSources[s].mediaStream = null;
                        allWebRTCSources[s].htmlVideoEl = null;
                        onlyAudioStreams.push(allWebRTCSources[s]);
                    }
                }
                allWebRTCSources = onlyAudioStreams;
            } else if (layoutName == 'audioScreenSharing' || (!layoutName && webrtcGroupSource.currentLayout == 'audioScreenSharing')) {
                //if current layout is "audioScreenSharing", leave only one video track on canvas (track who's .screenSharing prop is true)
                //and change the king of rest video tracks (.mainStream == true) to 'audio'
                //log('updateWebRTCCanvasLayout: audioScreenSharing')

                let screensharingPlusAudio = [];
                for(let s in allWebRTCSources) {
                    if(parseInt(s) == 0) {
                        screensharingPlusAudio.push(allWebRTCSources[s]);
                    } else if(allWebRTCSources[s].mainStream) {
                        allWebRTCSources[s].kind = 'audio';
                        allWebRTCSources[s].track = null;
                        allWebRTCSources[s].mediaStream = null;
                        allWebRTCSources[s].htmlVideoEl = null;
                        screensharingPlusAudio.push(allWebRTCSources[s]);
                    }
                }
                allWebRTCSources = screensharingPlusAudio;
            } else if(layoutName == 'floatingScreenSharing' || (!layoutName && webrtcGroupSource.currentLayout == 'floatingScreenSharing')) {
                //console.log('allWebRTCSources floatingScreenSharing', allWebRTCSources)
                allWebRTCSources = allWebRTCSources.splice(0, 3);
            }

            //if filtered video should be rendered on canvas, then replace current (not filtered) with filtered videos
            for(let y in allWebRTCSources) {
                console.log('allWebRTCSources[y]', allWebRTCSources[y])
                if(!allWebRTCSources[y].track || allWebRTCSources[y].track.kind != 'video') continue;
                if(!allWebRTCSources[y].track.livestreamVideoProcessor || Object.keys(allWebRTCSources[y].track.livestreamVideoProcessor.appliedFilters).length == 0) continue;

                let participant = allWebRTCSources[y].participant;
                let mediaProcessorInfo = allWebRTCSources[y].track.livestreamVideoProcessor;
                if(allWebRTCSources[y].htmlVideoEl == mediaProcessorInfo.processedTrack.trackEl) continue;
                allWebRTCSources[y].htmlVideoEl = mediaProcessorInfo.processedTrack.trackEl;
                allWebRTCSources[y].htmlVideoEl.play();

                let trackInstance = allWebRTCSources[y].track;
                let source = allWebRTCSources[y];
                mediaProcessorInfo.videoProcessorTrack.eventDispatcher.on('stop', function () {
                    console.log('videoProcessorTrack STOP', source, mediaProcessorInfo, trackInstance.trackEl)

                    source.htmlVideoEl = trackInstance.trackEl;
                    source.htmlVideoEl.play();
                })



            }

            //log('updateWebRTCCanvasLayout: audio layout applied', allWebRTCSources.map(o=>o.name), allWebRTCSources)
            //log('updateWebRTCCanvasLayout: layoutName', webrtcGroupSource.currentLayout, layoutName)

            //generate layout rectangles depending on layout name (if it is passed to this func, or webrtcGroupSource.currentLayout otherwise)
            let streamsNum = allWebRTCSources.filter(function (o) {
                return o.active == true;
            }).length;
            
            if(layoutName != null && layoutName != 'audioOnly') {
                //log('updateWebRTCCanvasLayout layout', layoutName, streamsNum);

                layoutRects = webrtcGroupSource.layoutManager.layoutGenerator(layoutName, streamsNum);
                webrtcGroupSource.currentLayout = layoutName;
                webrtcGroupSource.currentLayoutMode = 'regular';
            } else {
                if(layoutName == 'audioOnly' || (!layoutName && webrtcGroupSource.currentLayoutMode == 'audioOnly')) {
                    //log('updateWebRTCCanvasLayout layout 2', layoutName, streamsNum);

                    layoutRects = webrtcGroupSource.layoutManager.layoutGenerator('tiledStreamingLayout', streamsNum);
                    webrtcGroupSource.currentLayout = 'tiledStreamingLayout';
                    webrtcGroupSource.currentLayoutMode = 'audioOnly';
                } else if(webrtcGroupSource.currentLayout != null) {
                    //log('updateWebRTCCanvasLayout layout currentLayout', webrtcGroupSource.currentLayout);

                    layoutRects = webrtcGroupSource.layoutManager.layoutGenerator(webrtcGroupSource.currentLayout, streamsNum);
                    webrtcGroupSource.currentLayoutMode = 'regular';
                } else {
                    //log('updateWebRTCCanvasLayout layout tiledStreamingLayout');

                    layoutRects = webrtcGroupSource.layoutManager.layoutGenerator(webrtcGroupSource.params.defaultLayout, streamsNum);
                    //log('updateWebRTCCanvasLayout layout tiledStreamingLayout after', layoutRects);

                    webrtcGroupSource.currentLayout = webrtcGroupSource.params.defaultLayout;
                    webrtcGroupSource.currentLayoutMode = 'regular';
                }
            }
            //log('updateWebRTCCanvasLayout: rects new', JSON.stringify(layoutRects));

            layoutRects = [...layoutRects];
            console.log('updateWebRTCCanvasLayout: layout original', layoutRects[0], layoutRects[1], layoutRects[2]);

            let reservedForPresenter = [];
            let activeVideosOfUserWhoShares = videoTracksOfUserWhoShares.filter(function (o) {
                return o.active ? true : false;
            });
            if(screensharingLayout && activeVideosOfUserWhoShares.length != 0) {
                reservedForPresenter = layoutRects.splice(0, activeVideosOfUserWhoShares.length);
            }
            
            let reservedForLoudest;
            if(webrtcGroupSource.loudestMode) {
                reservedForLoudest = [layoutRects.splice(0, 1)[0]]
            }

            layoutRects = layoutRects.reverse();
            log('updateWebRTCCanvasLayout: rects reservedForPresenter', JSON.stringify(reservedForPresenter));
            log('updateWebRTCCanvasLayout: rects reservedForLoudest', reservedForLoudest);
            log('updateWebRTCCanvasLayout: rects new', JSON.stringify(layoutRects));
            //log('updateWebRTCCanvasLayout layout result', JSON.stringify(layoutRects));
            log('updateWebRTCCanvasLayout: order new', JSON.stringify(allWebRTCSources.map(function (o) {
                return {id: o.id, rect: o.rect}
            })));

            let activeWebRTCSources = allWebRTCSources.filter(function (o) {
                return o.active == true;
            });

            webrtcGroupSource.sources = allWebRTCSources;
            activeWebRTCSources.reverse();
            log('distributeRectsForOtherStreams for BEFORE', activeWebRTCSources.length);
            console.log('updateWebRTCCanvasLayout: layout result2', layoutRects[0], layoutRects[1], layoutRects[2]);
            console.log('updateWebRTCCanvasLayout: layout reservedForPresenter', reservedForPresenter[0], reservedForPresenter[1], reservedForPresenter[2]);

            //assign layout rects to all sources that are supposed to be rendered on canvas
            //for(let r = 0; r < allWebRTCSources.length; r++){
            let layoutIsUpdating = false;
            for(let r = activeWebRTCSources.length - 1; r >= 0; r--){
                let newRectOfStream;
                //log('distributeRectsForOtherStreams for', layoutRects.length);
                if(!activeWebRTCSources[r].rect) {
                    activeWebRTCSources[r].rect = new DOMRect(0, 0, 0, 0);
                }

                log('distributeRectsForOtherStreams for START', activeWebRTCSources[r], activeWebRTCSources[r].screenSharing);

                if((screensharingLayout && activeVideosOfUserWhoShares.indexOf(activeWebRTCSources[r]) != -1)) {
                    //first rects are reserved for the user who shares screen
                    //OR first rect are reserved for the loudest source
                    log('distributeRectsForOtherStreams 1');

                    /* newRectOfStream = layoutRects[r];
                    layoutRects.splice(r, 1); */
                    if(activeWebRTCSources[r].screenSharing) {
                        newRectOfStream = reservedForPresenter.splice(0, 1)[0];
                    } else {
                        newRectOfStream = reservedForPresenter.shift();
                    }
                } else if (webrtcGroupSource.loudestMode && loudestSource == activeWebRTCSources[r]){
                    newRectOfStream = reservedForLoudest.shift();
                    log('updateWebRTCCanvasLayout 2')
                }/*  else if(layoutChanged) {
                    //log('distributeRectsForOtherStreams layoutChange=true');
                    //to avoid situation when a source randomly changes it's position on canvas
                    let closestRectInfo = findClosestRectIndex(activeWebRTCSources[r].rect, layoutRects, []);
                    if(closestRectInfo) newRectOfStream = layoutRects[closestRectInfo.index];
                    log('updateWebRTCCanvasLayout 2')

                    layoutRects.splice(closestRectInfo.index, 1);
                } */ else {
                    log('updateWebRTCCanvasLayout 3')

                    newRectOfStream = layoutRects.pop();
                    
                    //layoutRects.splice(r, 1);
                }
                log('distributeRectsForOtherStreams for result', newRectOfStream);

                layoutIsUpdating = true;
                let starttime = performance.now();
                let rectToUpdate = activeWebRTCSources[r].rect;
                let startPositionRect = {y:rectToUpdate.y, x:rectToUpdate.x, width:rectToUpdate.width,height:rectToUpdate.height};
                moveit(rectToUpdate, newRectOfStream, startPositionRect, getTransitionTime(), starttime, activeWebRTCSources[r], parseInt(r) == 0 ? notPendingAnymore : null);
            }
            console.log('updateWebRTCCanvasLayout: result1', activeWebRTCSources[0], activeWebRTCSources[1], activeWebRTCSources[2]);
            console.log('updateWebRTCCanvasLayout: result1.1', webrtcGroupSource.sources[0], webrtcGroupSource.sources[1], webrtcGroupSource.sources[2]);

            //if(screensharingLayout) {
                //webrtcGroupSource.sources.reverse();
                webrtcGroupSource.sources.sort((firstValue, secondValue) => {

                    var indexA = activeWebRTCSources.indexOf(firstValue);
                    var indexB = activeWebRTCSources.indexOf(secondValue);

                    if (indexA === -1 && indexB === -1) {
                        return 0; // Maintain the current order if both are not in arrayB
                    } else if (indexA === -1) {
                        return 1; // Move the object not in arrayB to a higher index
                    } else if (indexB === -1) {
                        return -1; // Move the object not in arrayB to a lower index
                    }

                    // Sort based on the order in arrayB
                    return indexA - indexB;
                 });
            //}
            console.log('updateWebRTCCanvasLayout: result2', allWebRTCSources[0], allWebRTCSources[1], allWebRTCSources[2]);
            console.log('updateWebRTCCanvasLayout: result2.1', webrtcGroupSource.sources[0], webrtcGroupSource.sources[1], webrtcGroupSource.sources[2]);

            log('updateWebRTCCanvasLayout reversed', webrtcGroupSource.sources);

            //if layout is floatingScreenSharing, then screensharing video should be above camera videos 
            //(this is exceptions as usually screen sharing video is full-screen and below other video)
            if(webrtcGroupSource.currentLayout == 'floatingScreenSharing' && allWebRTCSources.length >= 2) {
                console.log('floatingScreenSharing: result', allWebRTCSources[0], allWebRTCSources[1], allWebRTCSources[2]);

                webrtcGroupSource.sources.splice(0, 0, allWebRTCSources.splice(1, 1)[0]);
                console.log('floatingScreenSharing: result', allWebRTCSources[0], allWebRTCSources[1], allWebRTCSources[2]);
            }
            _activeScene.eventDispatcher.dispatch('webrtcLayoutUpdated');
            
            if(!layoutIsUpdating) {
                notPendingAnymore();
            }
            function notPendingAnymore() {
                log('notPendingAnymore')
                webrtcGroupSource.pendingLayoutUpdate = false;

                if(webrtcGroupSource.layoutUpdateQueue.length != 0) {
                    let queueItem = webrtcGroupSource.layoutUpdateQueue.splice(0, 1)[0];
                    updateWebRTCLayout.apply(null, queueItem.args)
                    return;
                }
            }
        }

        function getLoudestSource(webrtcGroup) {
            for(let i in webrtcGroup.sources) {
                if(webrtcGroup.sources[i].loudest == true) {
                    return webrtcGroup.sources[i]
                }
            }
            return webrtcGroup.sources[0]
        }

        function addMonitoringVolume(webrtcGroup) {
            var volumeCheckInterval;
            function startInterval() {
                volumeCheckInterval = Q.Media.setWorkerInterval(function () {
                    let currentLoudestSource = {
                        auidoLevel: 0,
                        source: null
                    };

                    for(let i in webrtcGroup.sources) {
                        //if it's floatingScreenSharing layout, then skip sources of the person who shares screen
                        if(webrtcGroup.currentLayout == 'floatingScreenSharing' && webrtcGroup.activePresenterSources.indexOf(webrtcGroup.sources[i]) != -1) {
                            continue;
                        }
                        if(!webrtcGroup.sources[i].active || webrtcGroup.sources[i].screenSharing) {
                            continue;
                        }
                        let participant = webrtcGroup.sources[i].participant;
                        if(!participant.voiceMeterTools || !participant.voiceMeterTools.simple || !participant.voiceMeterTools.simple.analyser) {
                            continue;
                        }
                        let auidoLevel;
                        if (participant.localMediaControlsState.mic == false) {
                            auidoLevel = 0;
                        } else {
                            let analyser = participant.voiceMeterTools.simple.analyser;
                            let bufferLength = analyser.frequencyBinCount;
                            let dataArray = new Uint8Array(bufferLength);
                            analyser.getByteFrequencyData(dataArray);
                            let average = getAverage(dataArray);
                            auidoLevel = average;
                        }

                        if(currentLoudestSource.source === null) {
                            currentLoudestSource.source = webrtcGroup.sources[i];
                            currentLoudestSource.auidoLevel = auidoLevel;
                            currentLoudestSource.source.auidoLevel = auidoLevel;

                            continue;
                        }

                        if (auidoLevel >= currentLoudestSource.auidoLevel) {
                            currentLoudestSource.source = webrtcGroup.sources[i];
                            currentLoudestSource.auidoLevel = auidoLevel;
                        }
                    }
                    
                    if(currentLoudestSource.source) {
                        for(let a in webrtcGroup.sources) {
                            if(webrtcGroup.sources[a] == currentLoudestSource.source) {
                                webrtcGroup.sources[a].loudest = true;
                                continue;
                            }
                            webrtcGroup.sources[a].loudest = false;
                        }
                        if((webrtcGroup.currentLayout == 'loudestFullScreen' || webrtcGroup.currentLayout == 'floatingScreenSharing') && webrtcGroup.loudestSource != currentLoudestSource.source && webrtcGroup.loudestMode == true) {
                            updateWebRTCLayout(webrtcGroup);
                            webrtcGroup.loudestSource = currentLoudestSource.source;
                        }
                    }
                
                }, 41);
            }

            return {
                start: function () {
                    if(!volumeCheckInterval) {
                        startInterval();
                    }
                },
                stop: function () {
                    if(volumeCheckInterval) {
                        Q.Media.clearWorkerInterval(volumeCheckInterval);
                        volumeCheckInterval = null;
                    }
                }
            }
        }

        function findClosestRectIndex(rect, rects, skipRects) {
            if(!skipRects) skipRects = [];
            //log('findClosestRectIndex', rect);
            var distance = function (x1, y1, x2, y2) {
                return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            }

            rects = rects.map(function (o, i) {
                return {
                    rect: o,
                    index: i
                }
            })

            rects = rects.filter(function (o) {
                if(skipRects.indexOf(o.rect) != -1) {
                    return false;
                }
                return true;
            });

            rects = rects.reverse();

            if (rects.length != 0) {

                let closestRect = rects.reduce(function (prev, current, index) {
                    //console.log('reduce', prev, current)
                    return (distance(current.rect.left + (current.rect.width / 2), current.rect.top + (current.rect.height / 2), rect.left + (rect.width / 2), rect.top + (rect.height / 2)) < distance(prev.rect.left + (prev.rect.width / 2), prev.rect.top + (prev.rect.height / 2), rect.left + (rect.width / 2), rect.top + (rect.height / 2))) ? current : prev;
                })

                let dist =  distance(closestRect.rect.left + (closestRect.rect.width / 2), closestRect.rect.top + (closestRect.rect.height / 2), rect.left + (rect.width / 2), rect.top + (rect.height / 2))

                return {
                    index: closestRect.index,
                    distance:dist
                };

            } else {
                return null;
            }
        }

        function moveit(rectToUpdate, distRect, startPositionRect, duration, starttime, streamData, callback){
            //console.log('moveit START', distRect);
            var cb = function () {
                var timestamp = performance.now();
                var runtime = timestamp - starttime
                var progress = runtime / duration;
                progress = Math.min(progress, 1);

                rectToUpdate.y = startPositionRect.y + (distRect.y - startPositionRect.y) * progress;
                rectToUpdate.x = startPositionRect.x + (distRect.x - startPositionRect.x) * progress;
                rectToUpdate.width = startPositionRect.width + (distRect.width - startPositionRect.width) * progress;
                rectToUpdate.height = startPositionRect.height + (distRect.height - startPositionRect.height) * progress;

                if (runtime >= duration) {
                    rectToUpdate.y = distRect.y;
                    rectToUpdate.x = distRect.x;
                    rectToUpdate.width = distRect.width;
                    rectToUpdate.height = distRect.height;
                    if(callback) callback ();
                    Q.Media.stopRunWithSpecificFrameRate(moveInterval);
                }

                if (streamData.eventDispatcher != null) streamData.eventDispatcher.dispatch('rectChanged')
            }
            var moveInterval = Q.Media.runWithSpecificFrameRate(cb, _fps);
            //var moveInterval = Q.Media.setWorkerInterval(callback, 1000 / _fps);
        }

        function getEase(currentProgress, start, distance, steps) {
            currentProgress /= steps/2;
            if (currentProgress < 1) return distance/2 * Math.pow( 2, 10 * (currentProgress - 1) ) + start;
            currentProgress--;
            return distance/2 * ( -Math.pow( 2, -10 * currentProgress) + 2 ) + start;
        };

        function getX(params) {
            let distance = params.xTo - params.xFrom;
            let steps = params.frames;
            let currentProgress = params.frame;
            return getEase(currentProgress, params.xFrom, distance, steps, 3);
        }

        function getY(params) {
            let distance = params.yTo - params.yFrom;

            let steps = params.frames;
            let currentProgress = params.frame;
            return getEase(currentProgress, params.yFrom, distance, steps, 3);
        }

        function getWidth(params) {
            let distance = params.widthTo - params.widthFrom;
            //log('width', params.widthTo)
            let steps = params.frames;
            let currentProgress = params.frame;
            return getEase(currentProgress, params.widthFrom, distance, steps, 3);
        }

        function getHeight(params) {
            let distance = params.heightTo - params.heightFrom;
            let steps = params.frames;
            let currentProgress = params.frame;
            return getEase(currentProgress, params.heightFrom, distance, steps, 3);
        }

        var _fpsData = 0;
        /* setInterval(function () {
            console.log('fps', _fpsData)
            _fpsData = 0;
        }, 1000) */
        function drawVideosOnCanvas() {
            if(!_isActive) return;

            _inputCtx.clearRect(0, 0, _size.width, _size.height);

            for(let i = _activeScene.backgroundSources.length - 1; i >= 0; i--) {
                if(_activeScene.backgroundSources[i].active == false) continue;

                let streamData = _activeScene.backgroundSources[i];

                if(streamData.sourceType == 'image') {
                    drawImage(streamData);
                } else if(streamData.sourceType == 'video') {
                    drawVideo(streamData);
                }
            }

            /*for(let i = _activeScene.sources.length - 1; i >= 0; i--) {
                if(_activeScene.sources[i].active == false ||_activeScene.sources[i].sourceType == 'group') continue;

                let streamData = _activeScene.sources[i];

                if(streamData.sourceType == 'webrtc' && streamData.kind == 'video') {
                    drawSingleVideoOnCanvas(streamData.htmlVideoEl, streamData, _size.width, _size.height, streamData.htmlVideoEl.videoWidth, streamData.htmlVideoEl.videoHeight);
                    streamData.eventDispatcher.dispatch('userRendered')

                } else if(streamData.sourceType == 'webrtc' && streamData.kind == 'audio') {
                    drawSingleAudioOnCanvas(streamData);
                    streamData.eventDispatcher.dispatch('userRendered')

                } else if(streamData.sourceType == 'image') {
                    drawImage(streamData);
                } else if(streamData.sourceType == 'video' || streamData.sourceType == 'videoInput') {
                    drawVideo(streamData);
                } 
            }*/

            for(let i = _activeScene.visualSources.length - 1; i >= 0; i--) {
            //for(let i = 0; i < _activeScene.visualSources.length; i++) {
                if(_activeScene.visualSources[i].active == false || _activeScene.visualSources[i].sourceType == 'group') continue;

                let streamData = _activeScene.visualSources[i];

                if(streamData.sourceType == 'image') {
                    drawImage(streamData);
                } else if(streamData.sourceType == 'video' || streamData.sourceType == 'videoInput') {
                    drawVideo(streamData);
                } else if(streamData.sourceType == 'webrtc' && streamData.kind == 'video') {
                    drawSingleVideoOnCanvas(streamData.htmlVideoEl, streamData, _size.width, _size.height, streamData.htmlVideoEl.videoWidth, streamData.htmlVideoEl.videoHeight);
                    streamData.eventDispatcher.dispatch('userRendered')

                } else if(streamData.sourceType == 'webrtc' && streamData.kind == 'audio') {
                    drawSingleAudioOnCanvas(streamData);
                    streamData.eventDispatcher.dispatch('userRendered')

                }
            }

            for(let i = _activeScene.additionalSources.length - 1; i >= 0; i--) {
                if(_activeScene.additionalSources[i] == null || _activeScene.additionalSources[i].active == false ||_activeScene.additionalSources[i].sourceType == 'group') continue;

                let streamData = _activeScene.additionalSources[i];

                if(streamData.sourceType == 'webrtcrect') {

                    _inputCtx.save();
                    _inputCtx.beginPath();
                    _inputCtx.rect(streamData.baseSource.rect.x, streamData.baseSource.rect.y, streamData.baseSource.rect.width, streamData.baseSource.rect.height);
                    _inputCtx.clip();

                    _inputCtx.fillStyle = streamData.fill;
                    _inputCtx.fillRect( getX(streamData),  getY(streamData),getWidth(streamData), getHeight(streamData));
                    if (streamData.frame < streamData.frames) {
                        streamData.frame = streamData.frame + 1;
                    } else if (streamData.frame == streamData.frames){
                        streamData.eventDispatcher.dispatch('animationEnded');
                        streamData.frame = streamData.frame + 1;
                    }

                    _inputCtx.restore();


                } else if(streamData.sourceType == 'strokerect') {

                    _inputCtx.save();
                    _inputCtx.beginPath();
                    _inputCtx.rect(streamData.baseSource.rect.x, streamData.baseSource.rect.y, streamData.baseSource.rect.width, streamData.baseSource.rect.height);
                    _inputCtx.clip();

                    _inputCtx.lineWidth = streamData.lineWidth;
                    _inputCtx.strokeStyle = streamData.strokeStyle;
                    _inputCtx.strokeRect( getX(streamData), getY(streamData), getWidth(streamData), getHeight(streamData));
                    if (streamData.frame < streamData.frames) {
                        streamData.frame = streamData.frame + 1;
                    } else if (streamData.frame == streamData.frames){
                        streamData.eventDispatcher.dispatch('animationEnded');
                        streamData.frame = streamData.frame + 1;
                    }

                    _inputCtx.restore();


                } else if(streamData.sourceType == 'webrtctext') {
                    _inputCtx.save();
                    _inputCtx.beginPath();
                    _inputCtx.rect(streamData.baseSource.baseSource.rect.x, streamData.baseSource.baseSource.rect.y, streamData.baseSource.baseSource.rect.width, streamData.baseSource.baseSource.rect.height);
                    _inputCtx.clip();

                    _inputCtx.font = streamData.font;
                    _inputCtx.shadowBlur = 5;
                    _inputCtx.shadowOffsetX = 2;
                    _inputCtx.shadowOffsetY = 3;
                    _inputCtx.shadowColor = "black";
                    _inputCtx.fillStyle = streamData.fillStyle;
                    _inputCtx.fillText(streamData.text, getX(streamData),  getY(streamData));

                    if (streamData.frame < streamData.frames) {
                        streamData.frame = streamData.frame + 1;
                    } else if (streamData.frame == streamData.frames){
                        streamData.eventDispatcher.dispatch('animationEnded');
                        streamData.frame = streamData.frame + 1;
                    }

                    _inputCtx.restore();
                }
            }

            for(let i = _activeScene.overlaySources.length - 1; i >= 0; i--) {
                if(_activeScene.overlaySources[i].active == false ||_activeScene.overlaySources[i].sourceType == 'group') continue;

                let streamData = _activeScene.overlaySources[i];

                if(streamData.sourceType == 'image' || streamData.sourceType == 'reactions') {
                    drawImage(streamData);
                } else if(streamData.sourceType == 'video') {
                    drawVideo(streamData);
                }
            }
            
            _fpsData++;

            //requestAnimationFrame(function() {
            //    drawVideosOnCanvas();
            //});
        }

        function drawImage(imageSource) {
            var imageInstanse = imageSource.imageInstance || imageSource.canvas;
            var width = imageInstanse.width;
            var height = imageInstanse.height;


            var scale = Math.max(_size.width / width, _size.height / height);
            // get the top left position of the image
            var x, y, outWidth, outHeight;
            if(imageSource.rect._x != null) {
                x = imageSource.rect._x;
                y = imageSource.rect._y;
                outWidth = imageSource.rect._width;
                outHeight = imageSource.rect._height;
            } else {
                x = (_size.width / 2) - (width / 2) * scale;
                y = (_size.height / 2) - (height / 2) * scale;
                outWidth = width * scale;
                outHeight = height * scale;
                imageSource.rect.x = x;
                imageSource.rect.y = y;
                imageSource.rect.width = outWidth;
                imageSource.rect.height = outHeight;
            }

            _inputCtx.save();
            if(imageSource.opacity) {
                _inputCtx.globalAlpha = imageSource.opacity;
            }
            _inputCtx.drawImage(imageInstanse,
                x, y,
                outWidth, outHeight);
            _inputCtx.restore();

        }

        function drawVideo(videoSource) {

            var videoOrImg = videoSource.videoInstance;

            var width = videoOrImg.videoWidth;
            var height = videoOrImg.videoHeight;

            var scale = Math.max(_size.width / width, _size.height / height);

            var x, y, outWidth, outHeight;
            if(videoSource.rect._x != null) {
                x = videoSource.rect._x;
                y = videoSource.rect._y;
                outWidth = videoSource.rect._width;
                outHeight = videoSource.rect._height;
            } else if (width != 0 && height != 0) {
                x = (_size.width / 2) - (width / 2) * scale;
                y = (_size.height / 2) - (height / 2) * scale;
                outWidth = width * scale;
                outHeight = height * scale;
                videoSource.rect.x = x;
                videoSource.rect.y = y;
                videoSource.rect.width = outWidth;
                videoSource.rect.height = outHeight;
            } else {
                return;
            }

            // get the top left position of the image

            _inputCtx.drawImage(videoOrImg,
                x, y,
                outWidth, outHeight);

        }

        function drawSingleVideoOnCanvas(localVideo, data, canvasWidth, canvasHeight, videoWidth, videoHeight) {
            if(data.participant.online == false) return;
            //_inputCtx.translate(data.rect.x, data.rect.y);


            var currentWidth = data.htmlVideoEl.videoWidth;
            var currentHeight = data.htmlVideoEl.videoHeight;

            /*if(data.widthLog != null && data.heightLog != null) {
                if(data.widthLog !=currentWidth || data.heightLog != currentHeight) {
                    log('dimensions changed width: ' + data.widthLog + ' -> ' + currentWidth);
                    log('dimensions changed height: ' + data.heightLog + ' -> ' + currentHeight);
                }
            }*/

            data.widthLog = currentWidth;
            data.heightLog = currentHeight;
            data.widthLog = currentWidth;
            data.heightLog = currentHeight;

            //if(!data.screenSharing) {
            if(data.params.displayVideo == 'cover') {
                var widthToGet = data.rect.width, heightToGet = data.rect.height, ratio = data.rect.width / data.rect.height;
                var x, y;

                var scale = Math.max( data.rect.width / currentWidth, (data.rect.height / currentHeight));

                widthToGet =  data.rect.width / scale;
                heightToGet = currentHeight;
                //log('draw', widthToGet / heightToGet, data.rect.width / data.rect.height)

                if((widthToGet / heightToGet).toFixed(2) != (data.rect.width / data.rect.height).toFixed(2)) {
                    //log('draw if1')
                    widthToGet = currentWidth;
                    heightToGet = data.rect.height / scale;

                    x = 0;
                    y = ((currentHeight / 2) - (heightToGet / 2));
                } else {
                    //log('draw if2')
                    x = ((currentWidth / 2) - (widthToGet / 2));
                    y = 0;
                }
                /* if size is smaller than rect widthToGet = data.rect.width / scale;
                heightToGet = data.rect.height / scale;*/
                let rectX = data.rect.x;
                if (data.params.flip) {
                    _inputCtx.save();
                    _inputCtx.translate(data.rect.width, 0);
                    _inputCtx.scale(-1, 1);
                    rectX = Math.sign(rectX) == 1 ? -Math.abs(rectX) : Math.abs(rectX);
                    draw();
                    _inputCtx.restore();
                } else {
                    draw();
                }

                function draw() {
                    _inputCtx.drawImage( localVideo,
                        x, y,
                        widthToGet, heightToGet,
                        rectX, data.rect.y,
                        data.rect.width, data.rect.height);
                }
            } else {
                _inputCtx.fillStyle = "#000000";
                _inputCtx.fillRect(data.rect.x, data.rect.y, data.rect.width, data.rect.height);

                var hRatio = data.rect.width / currentWidth;
                var vRatio = data.rect.height / currentHeight;
                var ratio  = Math.min ( hRatio, vRatio );

                var outWidth = currentWidth*ratio;
                var outHeight = currentHeight*ratio;
                var freeWidthPx = ( data.rect.width - outWidth ) / 2;
                var freeHeightPx = ( data.rect.height - outHeight ) / 2
                var centerShift_x = data.rect.x + freeWidthPx;
                var centerShift_y = data.rect.y + freeHeightPx;

                let rectX = centerShift_x;
                let rectWidth = currentWidth * ratio;
                if (data.params.flip) {
                    _inputCtx.save();
                    _inputCtx.translate(rectWidth, 0);
                    _inputCtx.scale(-1, 1);
                    rectX = Math.sign(rectX) == 1 ? -Math.abs(rectX) : Math.abs(rectX);
                    draw();
                    _inputCtx.restore();
                } else {
                    draw();
                }

                function draw() {
                    _inputCtx.drawImage( localVideo,
                        0, 0,
                        currentWidth, currentHeight,
                        rectX, centerShift_y,
                        rectWidth, currentHeight * ratio);
                }
            }



            //(currentWidth/2) - (widthToGet / 2), (currentHeight/2) - (heightToGet / 2),

            _inputCtx.strokeStyle = "black";



            _inputCtx.beginPath();
            _inputCtx.moveTo(data.rect.x + data.rect.width, data.rect.y);
            _inputCtx.lineTo(data.rect.x + data.rect.width, data.rect.y);
            _inputCtx.stroke();

            //_inputCtx.strokeRect(data.rect.x, data.rect.y, data.rect.width, data.rect.height);
        }

        function drawSingleAudioOnCanvas(data) {

            if(data.participant.online == false) return;

            //_inputCtx.clearRect(data.rect.x, data.rect.y, data.rect.width, data.rect.height);

            _inputCtx.fillStyle = data.parentGroup.params.audioLayoutBgColor;
            _inputCtx.fillRect(data.rect.x, data.rect.y, data.rect.width, data.rect.height);

            //drawAudioVisualization(data);

            var width, height;
            if(data.participant.avatar != null) {

                var avatar = data.participant.avatar.image;
                width = avatar.naturalWidth;
                height = avatar.naturalHeight;

                var scale = Math.min( (data.rect.width / 2) / width,  (data.rect.height / 2) / height);
                var scaledWidth = width * scale;
                var scaledHeight = height * scale;
                // get the top left position of the image
                var x = data.rect.x + (( data.rect.width / 2) - (width / 2) * scale);
                var y;

                y = data.rect.y + ((data.rect.height / 2) - (height / 2) * scale);

                var size = Math.min(scaledHeight, scaledWidth);
                var radius =  size / 2;

                drawSimpleCircleAudioVisualization(data, x, y, radius, scale, size);


                _inputCtx.save();


                _inputCtx.beginPath();
                _inputCtx.arc(x + (size / 2), y + (size / 2), radius, 0, Math.PI * 2 , false); //draw the circle
                _inputCtx.clip(); //call the clip method so the next render is clipped in last path
                //_inputCtx.strokeStyle = "blue";
                //_inputCtx.stroke();
                _inputCtx.closePath();

                _inputCtx.drawImage(avatar,
                    x, y,
                    width * scale, height * scale);
                _inputCtx.restore();
            }
        }

        function displayName(webrtcSource) {
            log('videoComposer: displayName')
            log('videoComposer: displayName: _activeScene.sources', _activeScene.sources.length)
            log('videoComposer: displayName: source', webrtcSource)

            if(webrtcSource == null || webrtcSource.displayNameTimeout != null) return;

            var rectWidth = webrtcSource.rect.width;
            var xPos = webrtcSource.rect.x + ((webrtcSource.rect.width - rectWidth) / 2);
            var rectHeight = webrtcSource.rect.height / 100 * 20;
            if(rectHeight > 100) rectHeight = 100;
           
            var nameLabel = new RectObjectSource({
                baseSource: webrtcSource,
                frame: 0,
                frames: 100
                //fill: webrtcSource.params.captionBgColor
            });
            nameLabel.name = 'Rectangle';

            Object.defineProperties(nameLabel, {
                'widthFrom': {
                    'get': function() {
                        return this.baseSource.rect.width;
                    }
                },
                'widthTo': {
                    'get': function() {
                        return this.baseSource.rect.width;
                    }
                },
                'heightFrom': {
                    'get': function() {
                        return this.baseSource.rect.height / 100 * 20;
                    }
                },
                'heightTo': {
                    'get': function() {
                        return this.baseSource.rect.height / 100 * 20;
                    }
                },
                'xFrom': {
                    'get': function() {
                        return this.baseSource.rect.x;
                    }
                },
                'xTo': {
                    'get': function() {
                        return this.baseSource.rect.x;
                    }
                },
                'yFrom': {
                    'get': function() {
                        return this.baseSource.rect.y + this.baseSource.rect.height;
                    }
                },
                'yTo': {
                    'get': function() {
                        return webrtcSource.rect.y + webrtcSource.rect.height - this.heightTo;
                    }
                },
                'fill': {
                    'get': function() {
                        return webrtcSource.params.captionBgColor;
                    }
                }
            });

            function getFontSizeinfo() {

                _inputCtx.save();
                let fontSize = (nameLabel.heightTo / 100 * 40);
                _inputCtx.font =  fontSize + "px Arial, sans-serif";

                var nameTextSize = _inputCtx.measureText(webrtcSource.name);
                
                var fitTextFont = function() {
                    fontSize = fontSize - 1;
                    _inputCtx.font =  fontSize + "px Arial, sans-serif";
                    nameTextSize = _inputCtx.measureText(webrtcSource.name.toUpperCase());

                    if(nameTextSize.width >= (nameLabel.baseSource.rect.width - 40)) {
                        fitTextFont();
                    }
                }
                
                if(nameTextSize.width >= (nameLabel.baseSource.rect.width - 40)) {
                    fitTextFont();
                }
                font = _inputCtx.font;
                _inputCtx.restore();

                return {
                    fontSize: fontSize,
                    font: font,
                    textSize: nameTextSize
                }
            }
                    
            var fontSizeInfo = getFontSizeinfo();
            var fontSize = fontSizeInfo.fontSize;
            var font = fontSizeInfo.font;
            var nameTextSize = fontSizeInfo.textSize;

            log('nameTextSize.font', font)

            var nameText = new TextObjectSource({
                baseSource: nameLabel,
                frame: 0,
                frames: 100,
                textHeight: nameTextSize.fontBoundingBoxAscent + nameTextSize.fontBoundingBoxDescent,
                fillStyle: webrtcSource.params.captionFontColor,
                font: font,
                latestSize: fontSize,
                //text: textName.toUpperCase()
            });
            nameText.name = 'Text: ' + webrtcSource.name;
   
            webrtcSource.on('nameChanged', function (newName) {
                var fontSizeInfo = getFontSizeinfo();
                nameText.font = fontSizeInfo.font;
                nameText.latestSize = fontSizeInfo.fontSize;
                nameText.textHeight = fontSizeInfo.textSize.fontBoundingBoxAscent + fontSizeInfo.textSize.fontBoundingBoxDescent;
                webrtcSource.displayName = webrtcSource.name?.toUpperCase();
            })
            webrtcSource.eventDispatcher.on('rectChanged', function() {
                var fontSizeInfo = getFontSizeinfo();
                nameText.font = fontSizeInfo.font;
                nameText.latestSize = fontSizeInfo.fontSize;
                nameText.textHeight = fontSizeInfo.textSize.fontBoundingBoxAscent + fontSizeInfo.textSize.fontBoundingBoxDescent;
            });
            
            log('font', nameText.font)
            Object.defineProperties(nameText, {
                'xFrom': {
                    'get': function() {
                        return this.baseSource.xFrom + 20;
                    }
                },
                'xFrom': {
                    'get': function() {
                        return this.baseSource.xFrom + 20;
                    }
                },
                'xTo': {
                    'get': function() {
                        return this.baseSource.xTo + 20;
                    }
                },
                'yFrom': {
                    'get': function() {
                        return this.baseSource.yFrom + this.textHeight + (this.baseSource.heightFrom / 100 * 5);
                    }
                },
                'yTo': {
                    'get': function() {
                        return this.baseSource.yTo + this.textHeight + (this.baseSource.heightTo / 100 * 5);
                    }
                },
                /*'font': {
                    'get': function() {
                        let size = (this.baseSource.heightTo / 100 * 40);
                        if(this.latestSize === size) {
                            return size + 'px Arial';
                        }

                        //layout should be updated as some changes were applied
                        this.latestSize = size;
                        _inputCtx.font = size + "px Arial";
                        log('updating.....')
                        let nameTextSize = _inputCtx.measureText(webrtcSource.name);
                        this.textHeight = nameTextSize.fontBoundingBoxAscent + nameTextSize.fontBoundingBoxDescent;

                        return size + 'px Arial';
                    }
                },*/
                'fillStyle': {
                    'get': function() {
                        return webrtcSource.params.captionFontColor;
                    }
                },
                'text': {
                    'get': function() {
                        return  webrtcSource.displayName || webrtcSource.name;
                    }
                },
            });


            let captionFontSize = (rectHeight / 100 * 20);
            _inputCtx.font = captionFontSize + "px Arial";
            var captionTextSize = _inputCtx.measureText(webrtcSource.caption);
            var captionTextWidth = captionTextSize.width;
            var captionTextHeight =  captionTextSize.fontBoundingBoxAscent + captionTextSize.fontBoundingBoxDescent;
            log('nameTextHeight', captionTextHeight)
           
            var captionText = new TextObjectSource({
                baseSource: nameLabel,
                frame: 0,
                frames: 100,
                textHeight: captionTextHeight,
                //fillStyle: webrtcSource.params.captionFontColor,
                latestSize: captionFontSize,
                font: captionFontSize + 'px Arial'
                //text: captionText
            });
            captionText.name = 'Text: ' + captionText;

            Object.defineProperties(captionText, {
                'xFrom': {
                    'get': function() {
                        return this.baseSource.xFrom + 20;
                    }
                },
                'xTo': {
                    'get': function() {
                        return this.baseSource.xTo + 20;
                    }
                },
                'yFrom': {
                    'get': function() {
                        return this.baseSource.yFrom + nameText.textHeight + this.textHeight + (this.baseSource.heightFrom / 100 * 10);
                    }
                },
                'yTo': {
                    'get': function() {
                        return this.baseSource.yTo + nameText.textHeight + this.textHeight + (this.baseSource.heightTo / 100 * 10);
                    }
                },
                'font': {
                    'get': function() {
                        let size = (this.baseSource.heightTo / 100 * 20);
                        if(this.latestSize === size) {
                            return size + 'px Arial';
                        }

                        //layout should be updated as some changes were applied
                        this.latestSize = size;
                        _inputCtx.font = size + "px Arial";
                        log('updating.....')
                        let nameTextSize = _inputCtx.measureText(webrtcSource.caption);
                        this.textHeight = nameTextSize.fontBoundingBoxAscent + nameTextSize.fontBoundingBoxDescent;

                        return size + 'px Arial';
                    }
                },
                'fillStyle': {
                    'get': function() {
                        return webrtcSource.params.captionFontColor;
                    }
                },
                'text': {
                    'get': function() {
                        return webrtcSource.caption;
                    }
                },
            });

            addAdditionalSource(nameLabel, true);

            addAdditionalSource(nameText);

            addAdditionalSource(captionText);
        }

        /*hides name label and all text sources that are related to it */
        function hideName(webrtcSource) {
            var dependentTextSources = [];
            var nameBgSource;
           
            for(let i in _activeScene.additionalSources) {
                if(_activeScene.additionalSources[i].sourceType != 'webrtcrect' || _activeScene.additionalSources[i].baseSource != webrtcSource) continue;
                nameBgSource = _activeScene.additionalSources[i];
                break;
            }
            for(let i in _activeScene.additionalSources) {
                if(_activeScene.additionalSources[i].baseSource != nameBgSource || _activeScene.additionalSources[i].sourceType != 'webrtctext') continue;
                dependentTextSources.push( _activeScene.additionalSources[i]);
            }

            var neYFrom = nameBgSource.yTo;
            var neYTo = nameBgSource.yFrom + 100;
            nameBgSource.yFrom = neYFrom;
            var oldYTo = nameBgSource.yTo;
            nameBgSource.yTo = neYTo;

            Object.defineProperties(nameBgSource, {
                'yFrom': {
                    'get': function() {
                        return oldYTo;
                    }
                },
                'yTo': {
                    'get': function() {
                        return this.baseSource.rect.y + this.baseSource.rect.height;
                    }
                }
            });
            nameBgSource.frame = 0;

            for(let r in dependentTextSources) {
                let textSource = dependentTextSources[r];
                textSource.yFrom = textSource.yTo;
                textSource.yTo = textSource.yFrom + 100;
                textSource.frame = 0;
                textSource.on('animationEnded', function() {
                    removeAdditionalSource(textSource);

                });
            }

            nameBgSource.on('animationEnded', function() {
                removeAdditionalSource(nameBgSource);
            });

        }


        function displayBorder(webrtcSource) {
            if(!webrtcSource.participant.online) return;

            if(webrtcSource == null) return;

            var rectWidth = webrtcSource.rect.width;
            var xPos = webrtcSource.rect.x + ((webrtcSource.rect.width - rectWidth) / 2);
            var rectHeight = webrtcSource.rect.height;

            var whiteBorderWidth = 6;
            var doubleBorderWidth = whiteBorderWidth * 2;
            var dividedBorderWidth = whiteBorderWidth / 2;

            var border = new StrokeRectObjectSource({
                baseSource: webrtcSource,
                frame: 0,
                frames: 0,
                lineWidth:whiteBorderWidth,
                strokeStyle: '#FFFFFF'
            });
            border.name = 'whiteBorder';

            Object.defineProperties(border, {
                'widthFrom': {
                    'get': function() {
                        return this.baseSource.rect.width - whiteBorderWidth;
                    }
                },
                'widthTo': {
                    'get': function() {
                        return this.baseSource.rect.width - whiteBorderWidth;
                    }
                },
                'heightFrom': {
                    'get': function() {
                        return this.baseSource.rect.height - whiteBorderWidth;
                    }
                },
                'heightTo': {
                    'get': function() {
                        return this.baseSource.rect.height - whiteBorderWidth;
                    }
                },
                'xFrom': {
                    'get': function() {
                        return this.baseSource.rect.x + dividedBorderWidth;
                    }
                },
                'xTo': {
                    'get': function() {
                        return this.baseSource.rect.x + dividedBorderWidth;
                    }
                },
                'yFrom': {
                    'get': function() {
                        return this.baseSource.rect.y + dividedBorderWidth;
                    }
                },
                'yTo': {
                    'get': function() {
                        return this.baseSource.rect.y + dividedBorderWidth;
                    }
                }
            });

            var colorBorderLineWidth = 10;
            var doubleColorBorderWidth = colorBorderLineWidth * 2;
            var halfColorBorderWidth = colorBorderLineWidth / 2;

            var colorBorder = new StrokeRectObjectSource({
                baseSource: webrtcSource,
                frame: 0,
                frames: 0,
                lineWidth:colorBorderLineWidth
                //strokeStyle: webrtcSource.params.captionBgColor
            });
            colorBorder.name = 'colorBorder';

            Object.defineProperties(colorBorder, {
                'widthFrom': {
                    'get': function() {
                        return this.baseSource.rect.width - doubleBorderWidth - colorBorderLineWidth;
                    }
                },
                'widthTo': {
                    'get': function() {
                        return this.baseSource.rect.width - doubleBorderWidth - colorBorderLineWidth;
                    }
                },
                'heightFrom': {
                    'get': function() {
                        return this.baseSource.rect.height - doubleBorderWidth - colorBorderLineWidth;
                    }
                },
                'heightTo': {
                    'get': function() {
                        return this.baseSource.rect.height - doubleBorderWidth - colorBorderLineWidth;
                    }
                },
                'xFrom': {
                    'get': function() {
                        return this.baseSource.rect.x + whiteBorderWidth + halfColorBorderWidth;
                    }
                },
                'xTo': {
                    'get': function() {
                        return this.baseSource.rect.x + whiteBorderWidth + halfColorBorderWidth;
                    }
                },
                'yFrom': {
                    'get': function() {
                        return this.baseSource.rect.y + whiteBorderWidth + halfColorBorderWidth;
                    }
                },
                'yTo': {
                    'get': function() {
                        return this.baseSource.rect.y + whiteBorderWidth + halfColorBorderWidth;
                    }
                },
                'strokeStyle': {
                    'get': function() {
                        return webrtcSource.params.captionBgColor;
                    }
                }
            });

            addAdditionalSource(border);
            addAdditionalSource(colorBorder, true);
        }

        function hideBorder(webrtcSource) {
            if(!webrtcSource.participant.online) return;
            var dependentTextSources = [];
            var whiteBorder, colorBorder;

            for(let i in _activeScene.additionalSources) {
                if(_activeScene.additionalSources[i].name != 'whiteBorder' || _activeScene.additionalSources[i].baseSource.participant != webrtcSource.participant) continue;
                whiteBorder = _activeScene.additionalSources[i];
                break;
            }

            for(let i in _activeScene.additionalSources) {
                if(_activeScene.additionalSources[i].name != 'colorBorder' || _activeScene.additionalSources[i].baseSource.participant != webrtcSource.participant) continue;
                colorBorder = _activeScene.additionalSources[i];
                break;
            }

            removeAdditionalSource(whiteBorder);
            removeAdditionalSource(colorBorder);
        }

        function getAverage(freqData) {
            var average = 0;
            for(let i = 0; i < freqData.length; i++) {
                average += freqData[i]
            }
            average = average / freqData.length;
            return average;
        }

        function drawSimpleCircleAudioVisualization(data, x, y, radius, scale, size) {
            let audioVisualizationTools = data.participant.voiceMeterTools;
            if(!audioVisualizationTools || !audioVisualizationTools.simple) return;
            var analyser = audioVisualizationTools.simple.analyser;
            //log('data.participant', analyser == null, data.participant.localMediaControlsState.mic == false)

            if(analyser == null || data.participant.localMediaControlsState.mic == false) return;
            var bufferLength = analyser.frequencyBinCount;
            var dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);
            var average = getAverage(dataArray);

            _inputCtx.save();
            _inputCtx.beginPath();
            _inputCtx.rect(data.rect.x, data.rect.y, data.rect.width, data.rect.height);
            _inputCtx.clip();
            //_inputCtx.stroke();

            var radius = radius + (radius / 100 * ((average / 255) * 100));
            //_inputCtx.fillStyle = "#505050";
            _inputCtx.fillStyle = "rgba(255, 255, 255, 0.4)";
            _inputCtx.beginPath();

            _inputCtx.arc(data.rect.x + (data.rect.width / 2), data.rect.y + (data.rect.height / 2), radius, 0, 2 * Math.PI);

            _inputCtx.fill();
            //var radius =  size / 2  + (bass * 0.25);

            _inputCtx.restore();
        }

        function drawCircleAudioVisualization(data, x, y, radius, scale, size) {
            var analyser = data.participant.soundMeter.analyser;
            if(analyser == null) return;
            var bufferLength = analyser.frequencyBinCount;
            var dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);
            //just show bins with a value over the treshold
            var threshold = 0;
            // clear the current state
            //_inputCtx.clearRect(data.rect.x, data.rect.y, data.rect.width, data.rect.height);
            //the max count of bins for the visualization
            var maxBinCount = dataArray.length;

            _inputCtx.save();
            _inputCtx.beginPath();
            _inputCtx.rect(data.rect.x, data.rect.y, data.rect.width, data.rect.height);
            _inputCtx.clip();
            //_inputCtx.stroke();

            _inputCtx.globalCompositeOperation='source-over';

            //_inputCtx.scale(0.5, 0.5);
            _inputCtx.translate(x + radius, y + radius);
            _inputCtx.fillStyle = "#fff";

            var bass = Math.floor(dataArray[1]); //1Hz Frequenz
            var radius = (bass * 0.1 + radius);
            //var radius =  size / 2  + (bass * 0.25);

            //go over each bin
            var x = x;
            for ( let i = 0; i < maxBinCount; i++ ){

                var value = dataArray[i];
                var barHeight = value / 2;
                if(Math.floor(barHeight) == 0) barHeight = 1;
                /*var r = barHeight + (25 * (i/bufferLength));
                var g = 250 * (i/bufferLength);
                var b = 50;

                _inputCtx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";*/
                if (value >= threshold) {
                    _inputCtx.fillRect(0, -radius, 2, -barHeight);
                    _inputCtx.rotate(((180 / 128) * Math.PI / 180));
                }
            }

            /*for ( let i = 0; i < maxBinCount; i++ ){

                var value = dataArray[i];
                if (value >= threshold) {
                    _inputCtx.rotate(-(180 / 128) * Math.PI / 180);
                    _inputCtx.fillRect(0, radius, 2, value / 2);
                }
            }

            for ( let i = 0; i < maxBinCount; i++ ){

                var value = dataArray[i];
                if (value >= threshold) {
                    _inputCtx.rotate((180 / 128) * Math.PI / 180);
                    _inputCtx.fillRect(0, radius, 2, value / 2);
                }
            }*/


            _inputCtx.restore();
        }

        function drawAudioVisualization(data) {
            let audioVisualizationTools = data.participant.voiceMeterTools;
            if(!audioVisualizationTools || !audioVisualizationTools.simple) return;
            var analyser = audioVisualizationTools.simple.analyser;
            if(analyser == null || data.participant.localMediaControlsState.mic == false) return;

            var analyser = audioVisualization.analyser;
            var bufferLength = analyser.frequencyBinCount;
            var dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);

            var WIDTH = data.rect.width;
            var HEIGHT = data.rect.height / 2;
            var barWidth = 2;
            var barsNum = Math.floor(data.rect.width / barWidth);
            var barHeight;

            //var x = data.rect.x;
            var y = data.rect.y + 36;
            var x = ((data.rect.x + data.rect.width - data.rect.x) / 2) - barWidth + data.rect.x;

            var lastRightX = x, lastLeftX = x, side = 'l';
            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] * 0.2;

                //var r = barHeight + (25 * (i/bufferLength));
                var r = '0';
                //var g = 250 * (i/bufferLength);
                var g = 250;
                var b = 50;

                _inputCtx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
                _inputCtx.fillRect(x, y - (barHeight / 2), barWidth, barHeight);

                if(side == 'l') {
                    lastLeftX = x;
                    side = 'r';

                    x = lastRightX + barWidth + 1;

                    if(x + barWidth >= data.rect.x + data.rect.width) break;
                } else if(side == 'r') {
                    lastRightX = x;
                    side = 'l';

                    x = lastLeftX - barWidth - 1;
                    if(x - barWidth <= data.rect.x) break;
                }


            }
        }

        function compositeVideosAndDraw() {
            log('compositeVideosAndDraw 0');
            log('compositeVideosAndDraw');
            if(_isActive) return;
            
            if (!document.body.contains(_canvas)) document.body.appendChild(_canvas);

            _isActive = true;
            audioComposer.mix();
            updateActiveWebRTCLayouts();

            //drawVideosOnCanvas();
            //audioTimerLoop(drawVideosOnCanvas, 1000 / 60)

            if(!_canvasRenderInterval) {
                 log('compositeVideosAndDraw', tool.webrtcSignalingLib.state)
                _canvasRenderInterval = Q.Media.runWithSpecificFrameRate(function () {
                    drawVideosOnCanvas();

                    if(tool.webrtcSignalingLib.state == 'disconnected' && _canvasRenderInterval != null) {
                        Q.Media.stopRunWithSpecificFrameRate(_canvasRenderInterval);
                        _canvasRenderInterval = null;
                    }
                }, _fps);
            }
            refreshEventListeners();
        }

        function refreshEventListeners() {
            var webrtcSignalingLib = tool.webrtcSignalingLib;
            var updateCanvas = function(data, eventName) {
                log('updateCanvas: event', eventName);
                if(_isActive == true) {
                    updateActiveWebRTCLayouts();
                }
            }

            tool.eventDispatcher.on('beforeSwitchRoom', function (e) {
                refreshEventListeners();
            });
            webrtcSignalingLib.event.on('initNegotiationEnded', updateCanvas);
            webrtcSignalingLib.event.on('videoTrackLoaded', updateCanvas);
            webrtcSignalingLib.event.on('audioTrackLoaded', updateCanvas);
            webrtcSignalingLib.event.on('participantDisconnected', updateCanvas);
            webrtcSignalingLib.event.on('trackMuted', updateCanvas);
            webrtcSignalingLib.event.on('trackUnmuted', updateCanvas);
            webrtcSignalingLib.event.on('screenHidden', updateCanvas);
            webrtcSignalingLib.event.on('screenShown', updateCanvas);
            webrtcSignalingLib.event.on('audioMuted', updateCanvas);
            webrtcSignalingLib.event.on('audioUnmuted', updateCanvas);
            webrtcSignalingLib.event.on('filterApplied', updateCanvas);
            webrtcSignalingLib.event.on('filterRemoved', updateCanvas);
            //webrtcSignalingLib.event.on('screensharingStarted', switchToSideScreensharing);
            //webrtcSignalingLib.event.on('remoteScreensharingStarted', switchToSideScreensharing);
            //webrtcSignalingLib.event.on('screensharingStopped', switchBackFromSideScreensharing);
            //webrtcSignalingLib.event.on('remoteScreensharingStopped', switchBackFromSideScreensharing);

            _eventDispatcher.on('drawingStop', function () {
                webrtcSignalingLib.event.off('initNegotiationEnded', updateCanvas);
                webrtcSignalingLib.event.off('videoTrackLoaded', updateCanvas);
                webrtcSignalingLib.event.off('audioTrackLoaded', updateCanvas);
                webrtcSignalingLib.event.off('participantDisconnected', updateCanvas);
                webrtcSignalingLib.event.off('trackMuted', updateCanvas);
                webrtcSignalingLib.event.off('trackUnmuted', updateCanvas);
                webrtcSignalingLib.event.off('screenHidden', updateCanvas);
                webrtcSignalingLib.event.off('screenShown', updateCanvas);
                webrtcSignalingLib.event.off('audioMuted', updateCanvas);
                webrtcSignalingLib.event.off('audioUnmuted', updateCanvas);
                webrtcSignalingLib.event.off('filterApplied', updateCanvas);
                webrtcSignalingLib.event.off('filterRemoved', updateCanvas);
                //webrtcSignalingLib.event.off('screensharingStarted', switchToSideScreensharing);
                //webrtcSignalingLib.event.off('remoteScreensharingStarted', switchToSideScreensharing);
                //webrtcSignalingLib.event.off('screensharingStopped', switchBackFromSideScreensharing);
                //webrtcSignalingLib.event.off('remoteScreensharingStopped', switchBackFromSideScreensharing);
            });
        }

        function LayoutManager(webrtcGroupSource) {
            var _layoutManagerContext = this;
            var _webrtcGroupSource = webrtcGroupSource;
            this.currentRects = [];
            this.basicGridRects = [];
            this.currentGenerator = null;

            this.layoutGenerator = function(layoutName, numberOfRects) {
                //log('layoutGenerator', layoutName, _webrtcGroupSource.rect)

                var layouts = {
                    tiledStreamingLayout: function (container, count) {
                        //var size = {parentWidth: _size.width, parentHeight: _size.height};
                        var size = { parentWidth: _webrtcGroupSource.rect.width, parentHeight: _webrtcGroupSource.rect.height, x: _webrtcGroupSource.rect.x, y: _webrtcGroupSource.rect.y };
                        return tiledStreamingLayout(size, count);
                    },
                    screenSharing: function (container, count) {
                        var size = { parentWidth: _webrtcGroupSource.rect.width, parentHeight: _webrtcGroupSource.rect.height, x: _webrtcGroupSource.rect.x, y: _webrtcGroupSource.rect.y };

                        return screenSharingLayout(count, size, true);
                    },
                    sideScreenSharing: function (container, count) {
                        var size = { parentWidth: _webrtcGroupSource.rect.width, parentHeight: _webrtcGroupSource.rect.height, x: _webrtcGroupSource.rect.x, y: _webrtcGroupSource.rect.y };

                        return sideScreenSharingLayout(count, size);
                    },
                    floatingScreenSharing: function (container, count) {
                        var size = { parentWidth: _webrtcGroupSource.rect.width, parentHeight: _webrtcGroupSource.rect.height, x: _webrtcGroupSource.rect.x, y: _webrtcGroupSource.rect.y };

                        return floatingScreenSharingLayout(count, size);
                    },
                    audioScreenSharing: function (container, count) {
                        var size = { parentWidth: _webrtcGroupSource.rect.width, parentHeight: _webrtcGroupSource.rect.height, x: _webrtcGroupSource.rect.x, y: _webrtcGroupSource.rect.y };

                        return audioScreenSharingLayout(count, size, true);
                    },
                    loudestFullScreen: function (container, count) {
                        var size = { parentWidth: _webrtcGroupSource.rect.width, parentHeight: _webrtcGroupSource.rect.height, x: _webrtcGroupSource.rect.x, y: _webrtcGroupSource.rect.y };

                        return audioScreenSharingLayout(count, size, true);
                    }
                }

                /*function getCurrentLayoutRects() {
                    var actualLayoutRects = [];
                    for (let i in _webrtcGroupSource.sources) {
                        if (_webrtcGroupSource.sources[i].sourceType != 'webrtc') continue;
                        actualLayoutRects.push({
                            key: actualLayoutRects.length,
                            rect: _webrtcGroupSource.sources[i].rect
                        });
                    }
                    return actualLayoutRects;
                }*/
                
                function getCurrentLayoutRects() {
                    var actualLayoutRects = [];
                    
                    console.log('getCurrentLayoutRects START', _layoutManagerContext.currentRects.length, _layoutManagerContext.basicGridRects.length)
                    if (_layoutManagerContext.basicGridRects.length >= _layoutManagerContext.currentRects.length) {
                    //if (screens.length >= _layoutManagerContext.currentRects.length) {
                        console.log('getCurrentLayoutRects 1')
                        for (let i in _layoutManagerContext.currentRects) {
                            //if (_screens[i].sourceType != 'webrtc') continue;
                            //let rect = _layoutManagerContext.currentRects[i].getBoundingClientRect();
                            let rect = _layoutManagerContext.currentRects[i];
                            actualLayoutRects.push({
                                key: i,
                                rect: rect
                                //rect: new DOMRect(rect.x - parentRect.x, rect.y - parentRect.y, rect.width, rect.height)
                            });
                        }
                    } else {
                        console.log('getCurrentLayoutRects 2')
                        for (let i in _webrtcGroupSource.sources) {
                            console.log('_webrtcGroupSource.sources[i].active', _webrtcGroupSource.sources[i].active)
                            if (_webrtcGroupSource.sources[i].sourceType != 'webrtc' || !_webrtcGroupSource.sources[i].active) continue;
                            actualLayoutRects.push({
                                key: i,
                                rect: _webrtcGroupSource.sources[i].rect
                            });
                        }
                    }
                    return actualLayoutRects;
                }

                function findClosestRectIndex(rect, rects) {
                    var distance = function (x1, y1, x2, y2) {
                        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                    }

                    rects = rects.map(function (o, i) {
                        return {
                            key: i,
                            rect: o
                        }
                    });
    
                    if (rects.length != 0) {
    
                        let closestRect = rects.reduce(function (prev, current, index) {
                            //console.log('reduce', prev, current)
                            return (distance(current.rect.left + (current.rect.width / 2), current.rect.top + (current.rect.height / 2), rect.left + (rect.width / 2), rect.top + (rect.height / 2)) < distance(prev.rect.left + (prev.rect.width / 2), prev.rect.top + (prev.rect.height / 2), rect.left + (rect.width / 2), rect.top + (rect.height / 2))) ? current : prev;
                        })
    
                        return closestRect.key;
    
                    } else {
                        return null;
                    }
                }

                function updateRealToBasicGrid(action) {
                    log('updateRealToBasicGrid START', action)

                    var actualLayoutRects = getCurrentLayoutRects(action);
                    var basicGridRectsClone = [..._layoutManagerContext.basicGridRects];


                    log('updateRealToBasicGrid updateRects', _layoutManagerContext.basicGridRects.length, _layoutManagerContext.basicGridRects);
                    log('updateRealToBasicGrid updateRects', actualLayoutRects.length);

                    //for(let r = _layoutManagerContext.basicGridRects.length - 1; r >= 0 ; r--){
                    for (let r in actualLayoutRects) {
                        let rect = actualLayoutRects[r].rect;

                        log('updateRealToBasicGrid actualLayoutRectsClone', basicGridRectsClone);
                        log('updateRealToBasicGrid rect', rect);

                        let closestIndex = findClosestRectIndex(rect, basicGridRectsClone);

                        log('updateRealToBasicGrid closestIndex1', r, closestIndex);
                        log('updateRealToBasicGrid closestIndex2', rect.x, rect.y, rect.width, rect.height);
                        if (basicGridRectsClone[closestIndex]) {
                            log('updateRealToBasicGrid closestIndex3 rect', basicGridRectsClone[closestIndex]);
                        }

                        if (closestIndex === null) continue;

                        actualLayoutRects[r].rect = new DOMRect(basicGridRectsClone[closestIndex].x, basicGridRectsClone[closestIndex].y, basicGridRectsClone[closestIndex].width, basicGridRectsClone[closestIndex].height);

                        /*var diffTop = Math.abs((newPositionRect.top + (newPositionRect.height / 2)) - (actualLayoutRects[closestIndex].rect.top + (actualLayoutRects[closestIndex].rect.height / 2)));
                        var diffLeft = Math.abs((newPositionRect.left + (newPositionRect.width / 2)) - (actualLayoutRects[closestIndex].rect.left + (actualLayoutRects[closestIndex].rect.width / 2)));
                        if ((diffTop + diffLeft) / 2 > 2) {
                            actualLayoutRects[closestIndex].rect = newPositionRect;
                        }*/

                        for (let c in basicGridRectsClone) {
                            if (parseInt(c) == closestIndex) {
                                basicGridRectsClone.splice(c, 1);
                            }
                        }

                    }

                    let results = actualLayoutRects.map(function (o) {
                        return o.rect;
                    });

                    console.log('actualLayoutRects res', results)
                    return results;


                }

                function tiledStreamingLayout(container, count) {
                    log('tiledStreamingLayout START', count, _layoutManagerContext.currentRects.length)
                    let layoutIsSwitching = false;
                    if (_layoutManagerContext.currentGenerator != 'tiledStreamingLayout') {
                        layoutIsSwitching = true
                    }

                    _layoutManagerContext.currentGenerator = 'tiledStreamingLayout';

                    
                    let currentRectsNum = getCurrentLayoutRects().length;

                    log('tiledStreamingLayout currentRectsNum', count, currentRectsNum, _layoutManagerContext.currentRects.length)
        
                    if (currentRectsNum == 0 || layoutIsSwitching) {
                        log('tiledStreamingLayout 0')
        
                        _layoutManagerContext.currentRects = _layoutManagerContext.basicGridRects = build(container, count);
                    } else {
        
                        if (count > currentRectsNum) {
                            log('tiledStreamingLayout 1')
        
                            /* _layoutManagerContext.basicGridRects = build(container, count);
                            let numOfEls = _layoutManagerContext.basicGridRects.length - currentRectsNum;
                            let last = _layoutManagerContext.basicGridRects.slice(Math.max(_layoutManagerContext.basicGridRects.length - numOfEls, 0))
        
                            log('tiledStreamingLayout 1 last', last)
                            
                            _layoutManagerContext.currentRects = _layoutManagerContext.currentRects.concat(last);
                            
                            log('tiledStreamingLayout 1 currentRects', _layoutManagerContext.currentRects)

                            _layoutManagerContext.currentRects = updateRealToBasicGrid('add'); */

                            _layoutManagerContext.currentRects = build(container, count);
                            
        
                        } else if (count < currentRectsNum) {
                            log('tiledStreamingLayout 2')
        
                            /* _layoutManagerContext.basicGridRects = build(container, count);
                            _layoutManagerContext.currentRects = updateRealToBasicGrid('remove'); */

                            _layoutManagerContext.currentRects = build(container, count);
                        } else {
                            log('tiledStreamingLayout 3')
        
                            /* _layoutManagerContext.basicGridRects = build(container, count);
                            _layoutManagerContext.currentRects = updateRealToBasicGrid('remove'); */

                            _layoutManagerContext.currentRects = build(container, count);
                        }
                    }
        
                    console.log('tiledStreamingLayout _layoutManagerContext.currentRects', _layoutManagerContext.currentRects.length)
                    return _layoutManagerContext.currentRects;
        
                    function build() {
                        log('build')
                        var size = container;
        
        
                        if (count == 1) {
                            return simpleGrid(count, size, 1);
                        } else if (count == 2) {
                            return simpleGrid(count, size, 2);
                        } else if (count == 3) {
                            return simpleGrid(count, size, 3);
                        } else if (count == 4) {
                            return simpleGrid(count, size, 2);
                        } else if (count == 5) {
                            return simpleGrid(count, size, 3);
                        } else if (count >= 6 && count < 13) {
                            return simpleGrid(count, size, 3);
                        } else {
                            return simpleGrid(count, size, 4);
                        }
                    }
        
                    function getElementSizeKeepingRatio(initSize, baseSize) {
                        log('getElementSizeKeepingRatio', baseSize.width, initSize.width, baseSize.height, initSize.height)
                        var ratio = Math.min(baseSize.width / initSize.width, baseSize.height / initSize.height);
        
                        return { width: Math.floor(initSize.width * ratio), height: Math.floor(initSize.height * ratio) };
                    }
        
                    function simpleGrid(count, size, perRow, rowsNum) {
                        //log('simpleGrid', size, count);
                        var rects = [];
                        var innerMargin = _webrtcGroupSource.params.tiledLayoutInnerMargins != null ? parseInt(_webrtcGroupSource.params.tiledLayoutInnerMargins) : 0;
                        var outerHorizontalMargin = _webrtcGroupSource.params.tiledLayoutOuterHorizontalMargins != null ? parseInt(_webrtcGroupSource.params.tiledLayoutOuterHorizontalMargins) : 0;
                        var outerVerticalMargin = _webrtcGroupSource.params.tiledLayoutOuterVerticalMargins != null ? parseInt(_webrtcGroupSource.params.tiledLayoutOuterVerticalMargins) : 0;
        
                        var rectHeight;
                        var rectWidth = ((size.parentWidth - (innerMargin * (perRow - 1)) - (outerHorizontalMargin * 2)) / perRow);
        
                        if (rowsNum == null) {
                            rowsNum = Math.ceil(count / perRow);			
                        }
        
                        rectHeight = (size.parentHeight - (innerMargin * (rowsNum - 1)) - (outerVerticalMargin * 2)) / rowsNum;
        
                        console.log('simpleGrid: rowsNum', rowsNum);
        
                        var isNextNewLast = false;
                        var rowItemCounter = 1;
                        var i;
                        for (i = 1; i <= count; i++) {
                            log('simpleGrid for', currentRow, rowsNum, i);
        
                            var prevRect = rects[rects.length - 1] ? rects[rects.length - 1] : new DOMRect(size.x, size.y, 0, 0);
                            var currentRow = isNextNewLast ? rowsNum : Math.ceil(i / perRow);
                            var isNextNewRow = rowItemCounter == perRow;
                            isNextNewLast = isNextNewLast == true ? true : isNextNewRow && currentRow + 1 == rowsNum;
        
                            let x, y;
                            if (rowItemCounter == 1) {
                                if(rects.length == 0) {
                                    y = (prevRect.y + prevRect.height) + outerVerticalMargin;
                                } else {
                                    y = (prevRect.y + prevRect.height) + innerMargin;
                                }
                                x = size.x + outerHorizontalMargin;
                            } else {
                                y = prevRect.y;
                                x = prevRect.x + prevRect.width + innerMargin;
                            }
                            log('simpleGrid for y', y, i);
        
                            var rect = new DOMRect(x, y, rectWidth, rectHeight);
        
                            rects.push(rect);
        
                            if (rowItemCounter == perRow) {
                                rowItemCounter = 1;
                            } else rowItemCounter++;
                        }
        
                        log('simpleGrid rects', rects, rects.length);
        
                        return rects;
                        let rcts = centralizeRects(rects);
                        log('simpleGrid centralizeRects', rcts, rcts.length);
        
                        return rcts;
                    }
        
                    function getRectsRows(rects) {
                        var rows = {};
                        var i, count = rects.length;
                        for (i = 0; i < count; i++) {
                            var rect = rects[i];
        
                            if (rows[rect.top] == null) rows[rect.top] = [];
        
                            rows[rect.top].push({ indx: i, top: rect.top, rect: rect, side: 'none' });
        
                        }
        
                        var rowsArray = [];
                        for (let property in rows) {
                            if (rows.hasOwnProperty(property)) {
                                rowsArray.push(rows[property]);
                            }
                        }
        
                        return rowsArray;
                    }
        
                    function centralizeRects(rects) {
        
                        var centerX = container.x + container.parentWidth / 2;
                        var centerY = container.y + container.parentHeight / 2;
        
                        var minY = Math.min.apply(Math, rects.map(function (r) { return r.y; }));
                        var maxY = Math.max.apply(Math, rects.map(function (r) { return r.y + r.height; }));
        
                        var sortedRows = getRectsRows(rects);
                        log('centralizeRects sortedRows', sortedRows)
        
                        var alignedRects = []
                        for (let r in sortedRows) {
                            let row = sortedRows[r].map(function (r) { return r.rect; });
                            var rowMinX = Math.min.apply(Math, row.map(function (r) { return r.x; }));
                            var rowMaxX = Math.max.apply(Math, row.map(function (r) { return r.x + r.width; }));
                            var rowTotalWidth = rowMaxX - rowMinX;
                            log('centralizeRects rowTotalWidth', rowMinX, rowMaxX, rowTotalWidth)
                            log('centralizeRects centerX', centerX)
                            var newXPosition = centerX - (rowTotalWidth / 2);
                            log('centralizeRects newXPosition', newXPosition)
        
                            var moveAllRectsOn = newXPosition - rowMinX;
        
                            for (let s = 0; s < row.length; s++) {
                                alignedRects.push(new DOMRect(row[s].left + moveAllRectsOn, row[s].top, row[s].width, row[s].height));
                            }
                        }
        
                        var totalHeight = maxY - minY;
        
                        var newTopPosition = centerY - (totalHeight / 2);
                        var moveAllRectsOn = newTopPosition - minY;
                        for (let s = 0; s < alignedRects.length; s++) {
                            alignedRects[s] = new DOMRect(alignedRects[s].left, alignedRects[s].top + moveAllRectsOn, alignedRects[s].width, alignedRects[s].height);
                        }
        
                        return alignedRects;
                    }
                }

                function screenSharingLayout(count, size, maximized) {
                    log('screenSharingLayout START')
                    _layoutManagerContext.currentGenerator = 'screenSharingLayout';
                    var rects = [];

                    if (maximized) {
                        var mainScreenRect = new DOMRect(size.x, size.y, size.parentWidth, size.parentHeight);
                        rects.push(mainScreenRect);
                        count--;
                    }

                    var rectWidth, rectHeight;
                    if (_size.width > _size.height) {
                        rectHeight = _size.height / 100 * 15.5;
                        rectWidth = rectHeight / 9 * 16;
                    } else {
                        rectWidth = _size.width / 100 * 16.5;
                        rectHeight = rectWidth / 16 * 9;
                    }
                    var spaceBetween = 10;
                    var totalRects = (size.parentWidth * (size.parentHeight - 66)) / ((rectWidth + spaceBetween) * (rectHeight + spaceBetween));
                    var perCol = Math.floor((size.parentHeight - 66) / (rectHeight + spaceBetween));
                    var perRow = Math.floor(size.parentWidth / (rectWidth + spaceBetween));

                    var side = 'right'
                    var isNextNewLast = false;
                    var createNewColOnRight = null;
                    var createNewColOnLeft = null;
                    var latestRightRect = null;
                    var latestLeftRect = null;
                    var colItemCounter = 1;
                    var leftSideCounter = 0;
                    var rightSideCounter = 0;
                    var i;
                    for (i = 1; i <= count; i++) {
                        var firstRect = new DOMRect(size.parentWidth, size.parentHeight - 66, rectWidth, rectHeight)
                        var prevRect = rects.length > 1 ? rects[rects.length - 2] : firstRect;
                        var currentCol = isNextNewLast ? perRow : Math.ceil(i / perCol);
                        var isNextNewCol = colItemCounter == perCol;
                        isNextNewLast = isNextNewLast == true ? true : isNextNewCol && currentCol + 1 == perRow;

                        var x, y, rect, prevRect;
                        if (side == "right") {
                            prevRect = latestRightRect;
                            if (rightSideCounter > 0 && !createNewColOnRight) {
                                y = prevRect.y - (rectHeight + spaceBetween);
                                x = prevRect.x;
                            } else if (createNewColOnRight) {
                                y = size.y + ((size.parentHeight - 66) - (rectHeight + spaceBetween));
                                x = prevRect.x - (rectWidth + spaceBetween);
                                createNewColOnRight = false;
                            } else {
                                y = size.y + ((size.parentHeight - 66) - (rectHeight + spaceBetween));
                                x = size.x + (size.parentWidth - (rectWidth + spaceBetween));
                            }
                            rightSideCounter++;

                            rect = new DOMRect(x, y, rectWidth, rectHeight);
                            latestRightRect = rect;

                            side = 'left';

                            if (rightSideCounter % perCol == 0) {
                                createNewColOnRight = true;
                            }
                        } else {
                            prevRect = latestLeftRect;
                            if (leftSideCounter > 0 && !createNewColOnLeft) {
                                y = prevRect.y - (rectHeight + spaceBetween);
                                x = prevRect.x;
                            } else if (createNewColOnLeft) {
                                y = size.y + ((size.parentHeight - 66) - (rectHeight + spaceBetween));
                                x = prevRect.x + prevRect.width + spaceBetween;
                                createNewColOnLeft = false;
                            } else {
                                y = size.y + ((size.parentHeight - 66) - (rectHeight + spaceBetween));
                                x = size.x + spaceBetween;
                            }
                            leftSideCounter++;

                            rect = new DOMRect(x, y, rectWidth, rectHeight);
                            latestLeftRect = rect;

                            side = 'right';

                            if (leftSideCounter % perCol == 0) {
                                createNewColOnLeft = true;
                            }
                        }

                        rects.push(rect);

                        if (isNextNewCol) {
                            colItemCounter = 1;
                        } else colItemCounter++;
                    }

                    return rects;
                }

                function audioScreenSharingLayout(count, size, maximized) {
                    var initCount = count;
                    //log('audioScreenSharingLayout START', count)
                    _layoutManagerContext.currentGenerator = 'audioScreenSharingLayout';
                    var rects = [];

                    if (maximized) {
                        var mainScreenRect = new DOMRect(size.x, size.y, size.parentWidth, size.parentHeight);
                        rects.push(mainScreenRect);
                        count--;
                    }

                    var rectWidth, rectHeight;
                    if (_size.width > _size.height) {
                        rectHeight = _size.height / 100 * 15.5;
                        rectWidth = rectHeight / 9 * 16;
                    } else {
                        rectWidth = _size.width / 100 * 16.5;
                        rectHeight = rectWidth / 16 * 9;
                    }


                    var spaceBetween = 10;
                    //var totalRects = (size.parentWidth * size.parentHeight) / ((rectWidth + spaceBetween) * (rectHeight + spaceBetween));
                    var perCol = Math.floor(size.parentHeight / (rectHeight + spaceBetween));
                    var perRow = Math.floor(size.parentWidth / (rectWidth + spaceBetween));
                    var oneSidePerRow = Math.floor((size.parentWidth / 100 * 20) / (rectWidth + spaceBetween));
                    var totalRects = (oneSidePerRow * perCol) * 2;

                    if (totalRects < count) {
                        var newPerCol, newPerRow, newOneSidePerRow, newTotalRects;
                        var newRectWidth = rectWidth;
                        var newRectHeight = rectHeight;
                        var ratio = rectWidth / rectHeight;
                        function decrementSize() {
                            if (newRectWidth <= 0 || newRectHeight <= 0) return;
                            newRectWidth = newRectWidth - 1;
                            newRectHeight = newRectWidth / ratio;
                            newPerCol = Math.floor(size.parentHeight / (newRectHeight + spaceBetween));
                            newPerRow = Math.floor(size.parentWidth / (newRectWidth + spaceBetween));
                            newOneSidePerRow = Math.floor((size.parentWidth / 100 * 20) / (newRectWidth + spaceBetween));

                            newTotalRects = (newOneSidePerRow * newPerCol) * 2;

                            if (newTotalRects < count) {
                                decrementSize();
                            }
                        }

                        decrementSize()
                        perCol = newPerCol;
                        perRow = newPerRow;
                        totalRects = newTotalRects;
                        rectWidth = newRectWidth;
                        rectHeight = newRectHeight;
                    }


                    var createNewRow = null;
                    var latestRect = null;
                    var rowItemCounter = 0;
                    var i;
                    for (i = 1; i <= count; i++) {
                        var firstRect = new DOMRect(size.parentWidth, size.parentHeight, rectWidth, rectHeight)
                        var prevRect = rects.length > 1 ? rects[rects.length - 2] : firstRect;
                        var currentRow = Math.ceil(i / perRow);

                        var x, y, rect, prevRect;
                        prevRect = latestRect;
                        if (rowItemCounter > 0 && !createNewRow) {
                            y = prevRect.y;
                            x = prevRect.x - (rectWidth + spaceBetween);
                        } else if (createNewRow) {
                            y = prevRect.y - (rectHeight + spaceBetween);
                            x = size.x + (size.parentWidth - (rectWidth + spaceBetween));
                            createNewRow = false;
                        } else {
                            y = size.y + (size.parentHeight - (rectHeight + spaceBetween));
                            x = size.x + (size.parentWidth - (rectWidth + spaceBetween));
                        }
                        rowItemCounter++;

                        rect = new DOMRect(x, y, rectWidth, rectHeight);
                        latestRect = rect;

                        if (rowItemCounter % perRow == 0) {
                            createNewRow = true;
                        }

                        rects.push(rect);
                    }

                    return rects;
                }

                function floatingScreenSharingLayout(count, size) {

                    _layoutManagerContext.currentGenerator = 'floatingScreenSharing';
                    
                    let cameraRectWidth = size.parentWidth / 100 * 60;
                    let cameraRect = new DOMRect(size.x, size.y, cameraRectWidth, size.parentHeight);

                    let screensharingWidth = size.parentWidth / 100 * 47;
                    let screensharingHeight = screensharingWidth /16 * 9;
                    console.log('screensharingWidth', screensharingWidth, screensharingHeight)
                    let screensharingX = size.x + size.parentWidth - screensharingWidth - (size.parentWidth / 100 * 0.7);
                    let screensharingY = (size.y + (size.parentHeight / 2)) - (screensharingHeight / 2);
                    let screensharingRect = new DOMRect(screensharingX, screensharingY, screensharingWidth, screensharingHeight);
                    let loudestHeight = size.parentHeight - screensharingRect.bottom;
                    let loudestWidth = loudestHeight / 9 * 16;
                    let loudestUserRect = new DOMRect(cameraRect.x + cameraRect.width, screensharingY + screensharingHeight, loudestWidth, loudestHeight);
                    return [screensharingRect, cameraRect, loudestUserRect];
                }

                function sideScreenSharingLayout(count, size) {
                    log('sideScreenSharingLayout START', count, _layoutManagerContext.currentRects.length, _layoutManagerContext.currentGenerator)
                    var spaceBetween = 22;

                    if (_layoutManagerContext.currentGenerator != 'sideScreenSharingLayout') {
                        log('sideScreenSharingLayout reset currentRects')

                        _layoutManagerContext.currentRects = [];
                    }
                    _layoutManagerContext.currentGenerator = 'sideScreenSharingLayout';

                    let currentRectsNum = getCurrentLayoutRects().length;

                    if (currentRectsNum == 0) {

                        log('sideScreenSharingLayout if0')
                        _layoutManagerContext.currentRects = build();
                    } else {

                        log('sideScreenSharingLayout if1.0', currentRectsNum)
                        if (count > currentRectsNum) {
                            log('sideScreenSharingLayout if1.2')

                             _layoutManagerContext.basicGridRects = build();
                            let numOfEls = _layoutManagerContext.basicGridRects.length - currentRectsNum;

                            let last = _layoutManagerContext.basicGridRects.slice(Math.max(_layoutManagerContext.basicGridRects.length - numOfEls, 0))
        
                            log('tiledStreamingLayout 1 last', last)
                            log('tiledStreamingLayout 1 before', _layoutManagerContext.currentRects.length, _layoutManagerContext.basicGridRects.length)

                            _layoutManagerContext.currentRects = updateRealToBasicGrid(); 
                            log('tiledStreamingLayout 1 after', _layoutManagerContext.currentRects.length, _layoutManagerContext.basicGridRects.length)

                            _layoutManagerContext.currentRects = _layoutManagerContext.currentRects.concat(last);
                            log('tiledStreamingLayout 1 after 2', _layoutManagerContext.currentRects.length, _layoutManagerContext.basicGridRects.length)

                            log('tiledStreamingLayout 1 currentRects', _layoutManagerContext.currentRects)


                            /* _layoutManagerContext.basicGridRects = build();
                            let numOfEls = _layoutManagerContext.basicGridRects.length - currentRectsNum;
                            let last = _layoutManagerContext.basicGridRects.slice(Math.max(_layoutManagerContext.basicGridRects.length - numOfEls, 0))

                            let updatedRects = updateRealToBasicGrid();
                            _layoutManagerContext.currentRects = updatedRects.concat(last); */

                        } else if (count < currentRectsNum) {
                            log('sideScreenSharingLayout if')
                            _layoutManagerContext.basicGridRects = build();
                            //_layoutManagerContext.currentRects = updateRealToBasicGrid();
                            _layoutManagerContext.currentRects = _layoutManagerContext.basicGridRects;
                        } else {
                            log('sideScreenSharingLayout 3')

                            _layoutManagerContext.basicGridRects = build();
                            //_layoutManagerContext.currentRects = updateRealToBasicGrid();
                            _layoutManagerContext.currentRects = _layoutManagerContext.basicGridRects;
                        }
                    }

                    console.log('_layoutManagerContext.currentRects', _layoutManagerContext.currentRects)
                    return _layoutManagerContext.currentRects;

                    function build() {

                        log('build')
                        let innerContainerWidth = size.parentWidth - spaceBetween * 2;
                        let innerContainerHeight = innerContainerWidth / 16 * 8;

                        let sideWidth = size.parentWidth / 100 * (count == 5 ? 45 : 40);
                        let sideSize = { parentWidth: sideWidth, parentHeight: innerContainerHeight + (spaceBetween * 2), x: size.x, y: size.y };
                        let rects = [];
                        if (count - 1 == 1) {
                            rects = simpleGrid(count - 1, sideSize, 1, 1);
                        } else if (count - 1 == 2) {
                            rects = simpleGrid(count - 1, sideSize, 1, 2, true);
                        } else if (count - 1 == 3) {
                            rects = simpleGrid(count - 1, sideSize, 1, 3, true);
                        } else if (count - 1 == 4) {
                            rects = simpleGrid(count - 1, sideSize, 2, 2);
                        } else if (count - 1 == 5) {
                            rects = simpleGrid(count - 1, sideSize, 2, null, true);
                        } else if (count - 1 >= 6 && count - 1 <= 9) {
                            rects = simpleGrid(count - 1, sideSize, 2, null, true);
                        } else if (count - 1 > 9 && count - 1 < 11) {
                            rects = simpleGrid(count - 1, sideSize, 2, null, true);
                        } else {
                            rects = simpleGrid(count - 1, sideSize, 3, null, true);
                        }
                        log('build: rects 1', rects.length)

                        log('innerContainerHeight', innerContainerHeight, size.parentHeight - (spaceBetween * 2))

                        if (innerContainerHeight > size.parentHeight - (spaceBetween * 2)) {
                            innerContainerHeight = size.parentHeight - (spaceBetween * 2);
                        }

                        if (count == 1) {
                            var mainScreen = new DOMRect(size.x + spaceBetween, size.y + spaceBetween, innerContainerWidth, innerContainerHeight);
                            rects.unshift(mainScreen);
                        } else {
                            var minX = Math.min.apply(Math, rects.map(function (rect) { return rect.x; }));
                            var maxX = Math.max.apply(Math, rects.map(function (rect) { return rect.x + rect.width; }));
                            log('maxX', rects, maxX)
                            var mainScreen = new DOMRect(maxX + spaceBetween, size.y + spaceBetween, innerContainerWidth - (maxX - size.x), innerContainerHeight);
                            rects.unshift(mainScreen);
                        }
                        log('build: rects 2', rects[0], rects[1])

                        //return rects;
                        return centralizeRectsVertically(rects);
                    }
                    
                    function simpleGrid(count, size, perRow, rowsNum, asSquares) {
                        log('simpleGrid START', count);
                        //log('simpleGrid container size', size.parentWidth, size.parentHeight);
                        var rects = [];
                        var spaceBetween = 22;
                        var rectHeight;
                        var rectWidth = (size.parentWidth / perRow) - (spaceBetween * (perRow));

                        //log('simpleGrid (rectWidth * perRow', rectWidth, perRow, size.parentWidth, ((rectWidth * perRow) / size.parentWidth) * 100);
                        // if(((rectWidth * perRow) / size.parentWidth) * 100 > 24 ) rectWidth = size.parentWidth / 100 * 24;

                        if (rowsNum == null) {
                            //log('simpleGrid if1');

                            let primaryRectHeight = size.parentHeight / Math.ceil(count / perRow)
                            rowsNum = Math.floor(size.parentHeight / (primaryRectHeight));
                            if (rowsNum == 0) rowsNum = 1;
                            log('simpleGrid if1 primaryRectHeight', primaryRectHeight, rowsNum);
                            rectHeight = (size.parentHeight - (spaceBetween * rowsNum) - spaceBetween) / rowsNum;
                        } else {
                            log('simpleGrid if2');
                            rectHeight = (size.parentHeight - (spaceBetween * rowsNum) - spaceBetween) / rowsNum;
                        }
                        //log('simpleGrid rect size0', rectWidth, rectHeight);

                        //log('simpleGrid (rectWidth * perRow', rectWidth, perRow, size.parentWidth, ((rectWidth * perRow) / size.parentWidth) * 100);
                        let rectSize = Math.min(rectWidth, rectHeight);
                        //if(((rectSize * perRow) / size.parentWidth) * 100 > 40 ) rectSize = (size.parentWidth / 100 * 40) / perRow;

                        if (asSquares) {
                            var newRectSize = getElementSizeKeepingRatio({
                                width: 500,
                                height: 500
                            }, { width: rectSize, height: rectSize })

                            rectWidth = newRectSize.width;
                            rectHeight = newRectSize.height;
                        }

                        //log('simpleGrid rect size1', rectWidth, rectHeight);

                        if (rowsNum == null) rowsNum = Math.floor(size.parentHeight / (rectHeight + spaceBetween));
                        //log('simpleGrid 1', size.parentHeight, rectHeight, rectHeight + spaceBetween);

                        var isNextNewLast = false;
                        var rowItemCounter = 1;
                        var i;
                        for (i = 1; i <= count; i++) {
                            //log('simpleGrid for', currentRow, rowsNum);

                            var prevRect = rects[rects.length - 1] ? rects[rects.length - 1] : new DOMRect(size.x, size.y, 0, 0);
                            var currentRow = isNextNewLast ? rowsNum : Math.ceil(i / perRow);
                            var isNextNewRow = rowItemCounter == perRow;
                            isNextNewLast = isNextNewLast == true ? true : isNextNewRow && currentRow + 1 == rowsNum;

                            if (rowItemCounter == 1) {
                                var y = (prevRect.y + prevRect.height) + spaceBetween;
                                var x = size.x + spaceBetween;
                            } else {
                                var y = prevRect.y;
                                var x = prevRect.x + prevRect.width + spaceBetween;
                            }

                            var rect = new DOMRect(x, y, rectWidth, rectHeight);

                            rects.push(rect);

                            if (rowItemCounter == perRow) {
                                rowItemCounter = 1;
                            } else rowItemCounter++;
                        }


                        //log('simpleGrid rects', rects);



                        //return centralizeRects(rects);
                        return rects;
                    }

                    function getRectsRows(rects) {
                        var rows = {};
                        var i, count = rects.length;
                        for (i = 0; i < count; i++) {
                            var rect = rects[i];

                            if (rows[rect.top] == null) rows[rect.top] = [];

                            rows[rect.top].push({ indx: i, top: rect.top, rect: rect, side: 'none' });

                        }

                        var rowsArray = [];
                        for (var property in rows) {
                            if (rows.hasOwnProperty(property)) {
                                rowsArray.push(rows[property]);
                            }
                        }

                        return rowsArray;
                    }

                    function centralizeRects(rects) {

                        var centerX = size.parentWidth / 2;
                        var centerY = size.parentHeight / 2;

                        var minY = Math.min.apply(Math, rects.map(function (r) { return r.y; }));
                        var maxY = Math.max.apply(Math, rects.map(function (r) { return r.y + r.height; }));

                        var sortedRows = getRectsRows(rects);
                        log('centralizeRects sortedRows', sortedRows)

                        var alignedRects = []
                        for (let r in sortedRows) {
                            let row = sortedRows[r].map(function (r) { return r.rect; });
                            var rowMinX = Math.min.apply(Math, row.map(function (r) { return r.x; }));
                            var rowMaxX = Math.max.apply(Math, row.map(function (r) { return r.x + r.width; }));
                            var rowTotalWidth = rowMaxX - rowMinX;
                            log('centralizeRects rowTotalWidth', rowMinX, rowMaxX, rowTotalWidth)
                            log('centralizeRects centerX', centerX)
                            var newXPosition = centerX - (rowTotalWidth / 2);
                            log('centralizeRects newXPosition', newXPosition)

                            var moveAllRectsOn = newXPosition - rowMinX;

                            for (let s = 0; s < row.length; s++) {
                                alignedRects.push(new DOMRect(row[s].left + moveAllRectsOn, row[s].top, row[s].width, row[s].height));
                            }
                        }

                        var totalHeight = maxY - minY;

                        var newTopPosition = centerY - (totalHeight / 2);
                        var moveAllRectsOn = newTopPosition - minY;
                        for (let s = 0; s < alignedRects.length; s++) {
                            alignedRects[s] = new DOMRect(alignedRects[s].left, alignedRects[s].top + moveAllRectsOn, alignedRects[s].width, alignedRects[s].height);
                        }

                        return alignedRects;
                    }

                    function centralizeRectsVertically(rects) {

                        var centerY = size.parentHeight / 2;

                        var minY = Math.min.apply(Math, rects.map(function (r) { return r.y; }));
                        var maxY = Math.max.apply(Math, rects.map(function (r) { return r.y + r.height; }));

                        var sortedRows = getRectsRows(rects);
                        log('centralizeRects sortedRows', sortedRows)

                        var totalHeight = maxY - minY;

                        var newTopPosition = size.y + (centerY - (totalHeight / 2));
                        var moveAllRectsOn = newTopPosition - minY;
                        for (let s = 0; s < rects.length; s++) {
                            rects[s] = new DOMRect(rects[s].left, rects[s].top + moveAllRectsOn, rects[s].width, rects[s].height);
                        }

                        return rects;
                    }

                    function getElementSizeKeepingRatio(initSize, baseSize) {
                        log('getElementSizeKeepingRatio', baseSize.width, initSize.width, baseSize.height, initSize.height)
                        var ratio = Math.min(baseSize.width / initSize.width, baseSize.height / initSize.height);

                        return { width: Math.floor(initSize.width * ratio), height: Math.floor(initSize.height * ratio) };
                    }
                }

                return layouts[layoutName](new DOMRect(0, 0, _size.width, _size.height), numberOfRects);
            }

        }
        

        function stop() {
            log('videoComposer: stop')

            _isActive = false;
            
            if(_canvasRenderInterval){
                Q.Media.stopRunWithSpecificFrameRate(_canvasRenderInterval);
                _canvasRenderInterval = null;
            }

            for(let s in _scenes) {
                let scene = _scenes[s];
                for(let i in scene.sources) {
                    if(scene.sources[i].sourceType == 'group' && scene.sources[i].groupType == 'webrtc') {
                        let webrtcGroup = scene.sources[i];
                        if(webrtcGroup.checkLoudestInterval) {
                            webrtcGroup.checkLoudestInterval.stop();
                        }
                    }
                }
            }

            _eventDispatcher.dispatch('drawingStop');
        }

        function isActive() {
            return _isActive;
        }

        return {
            getWebrtcGroupIndex: getWebrtcGroupIndex,
            updateActiveWebRTCLayouts: updateActiveWebRTCLayouts,
            updateWebRTCLayout: updateWebRTCLayout,
            compositeVideosAndDraw: compositeVideosAndDraw,
            refreshEventListeners: refreshEventListeners,
            stop: stop,
            isActive: isActive,
            addSource: addSource,
            removeSource: removeSource,
            removeAdditionalSource: removeAdditionalSource,
            moveSourceForward: moveSourceForward,
            moveSourceBackward: moveSourceBackward,
            showSource: showSource,
            hideSource: hideSource,
            setWebrtcLayoutRect: setWebrtcLayoutRect,
            getWebrtcLayoutRect: getWebrtcLayoutRect,
            getCanvasSize: getCanvasSize,
            displayName: displayName,
            hideName: hideName,
            displayBorder: displayBorder,
            hideBorder: hideBorder
        }
    }());

    var audioComposer = (function(){
        var audioContext = null;
        var _dest = null;
        var _stopSilenceLoop = null;
        var _globalMicSource = null;

        var AudioSource = function () {
            this.active = true;
            this._name = null;
            this.parentGroup = null;
            this.sourceType = 'audio';
            this.scope = 'scene'; //global || scene
            this.sourceNode = null;
            this.setVolume = function (value) {
                if (!this.gainNode) return;
                this.gainNode.gain.value = value;
                if (this.eventDispatcher != null) this.eventDispatcher.dispatch('volumeChanged', value);
            };
            this.on = function (event, callback) {
                if (this.eventDispatcher != null) this.eventDispatcher.on(event, callback)
            };
            this.off = function (event, callback) {
                if (this.eventDispatcher != null) this.eventDispatcher.off(event, callback)
            };
            this.eventDispatcher = new EventSystem();
        }

        Object.defineProperties(AudioSource.prototype, {
            'name': {
                'set': function(val) {
                    this._name = val;
                    if(this.eventDispatcher != null) this.eventDispatcher.dispatch('nameChanged', val)
                },
                'get': function(val) {
                    return this._name;
                }
            }
        });

        var WebRTCAudioSource = function (participant) {
            this.kind = null;
            this.participant = participant;
            this.name = participant.username;
            this.avatar = participant.avatar ? participant.avatar.image : null;
            this.track = null;
            this.mediaStream = null;
            this.mediaStreamTrack = null;
            this.htmlVideoEl = null;
            this.screenSharing = false;
            this.sourceType = 'webrtcaudio';
            this.gainNode = null;
            this.average = 0;
            this.averageHistory = new Array(500);
            this.detectSound = function () {
                let soundDetected = false;
                let webrtcSourceInstance = this;
                if(!webrtcSourceInstance.analyserNode) {
                    console.error('webrtcSourceInstance.analyserNode is undefined');
                    return;
                }

                webrtcSourceInstance.averageHistory.fill(undefined);
                Object.seal(webrtcSourceInstance.averageHistory);
                var bufferLength = webrtcSourceInstance.analyserNode.frequencyBinCount;
                var domainData = new Uint8Array(bufferLength);
                var currentHistoryIndex = 0;

                function detect() {
                    webrtcSourceInstance.analyserNode.getByteFrequencyData(domainData);

                    let average = getAverage(domainData);
                    webrtcSourceInstance.average = average;
                    webrtcSourceInstance.averageHistory[currentHistoryIndex] = average;
                    currentHistoryIndex = currentHistoryIndex == 500 ? 0 : currentHistoryIndex + 1;
                    if(webrtcSourceInstance.mediaStreamTrack.readyState == 'live' && tool.webrtcSignalingLib.state != 'disconnected') {
                        window.requestAnimationFrame(detect);
                    } 
                }

                window.requestAnimationFrame(detect);

                function getAverage(freqData) {
                    var average = 0;
                    for(let i = 0; i < freqData.length; i++) {
                        average += freqData[i]
                    } 
                    average = average / freqData.length;
                    return average;
                }

                
            }
            this.eventDispatcher = new EventSystem();
        }
        WebRTCAudioSource.prototype = new AudioSource();

        var AudioInputSource = function () {
            this.sourceType = 'audioInput';
            this.gainNode = null;
            this.analyserNode = null;
            this.streams = [];
            this.addStream = function (mediaStream) {
                if (audioContext == null) audioComposer.mix();
                log('AudioInputSource 1');
                if(this.gainNode == null && this.analyserNode == null) {
                    log('AudioInputSource 2');
                    this.gainNode = audioContext.createGain();;
                    this.analyserNode = audioContext.createAnalyser();
                    this.analyserNode.fftSize = 512;
                    this.gainNode.connect(this.analyserNode);
                    this.analyserNode.connect(_dest);
                }
                
                log('AudioInputSource 3', this.gainNode);
                log('AudioInputSource 3.1', this.analyserNode);

                const source = audioContext.createMediaStreamSource(mediaStream);
                source.connect(this.gainNode);

                var streamInfo = {
                    mediaStream: mediaStream,
                    sourceNode: source
                }
                this.streams.push(streamInfo);
                if (this.eventDispatcher != null) this.eventDispatcher.dispatch('streamAdded', streamInfo);
            };
            this.connect = function () {
                log('AudioInputSource connect');

                this.analyserNode.connect(_dest);
            };
            this.disconnect = function () {
                log('AudioInputSource disconnect');

                this.analyserNode.disconnect(_dest);
            };
        }
        AudioInputSource.prototype = new AudioSource();

        /*Object.defineProperties(AudioInputSource.prototype, {
            'mediaStream': {
                'set': function (val) {
                    
                },
                'get': function (val) {
                    return this._mediaStream;
                }
            }
        });*/

        function addGlobalAudioSource(newSource) {

            //if access to mic was granted
            if (newSource.mediaStream && audioContext == null) {
                audioComposer.mix();
            }

            var audioSource = new AudioInputSource();
            if (newSource.mediaStream) audioSource.addStream(newSource.mediaStream);
            audioSource.name = newSource.title;
            audioSource.scope = 'global';
            _globalAudioSources.splice(0, 0, audioSource);

            /*if (newSource.mediaStream) {
                const source = audioContext.createMediaStreamSource(audioSource.mediaStream);
                var gainNode = audioContext.createGain();
                source.connect(gainNode);
                //gainNode.connect(_dest);
                var analyserNode = audioContext.createAnalyser();
                analyserNode.fftSize = 512;
                gainNode.connect(analyserNode);
                analyserNode.connect(_dest);

                audioSource.sourceNode = source;
                audioSource.gainNode = gainNode;
                audioSource.analyserNode = analyserNode;
            }*/

            //_eventDispatcher.dispatch('sourceAdded', audioSource);
            return audioSource;
        }

        function addSource(newSource, scene) {
            log('addSource audio', newSource, newSource.participant, getOptions().liveStreaming)
            var scene = scene || _activeScene;

            if (audioContext == null) {
                audioComposer.mix();
            }

            if(newSource.sourceType == 'webrtcaudio') {
                //webrtc audio sources is not scene specific sources, they are like global audio sources;
                let participant = newSource.participant;
                log('addSource audio: if1', participant, participant.tracks)

                let audioTracks = participant.tracks.filter(function (trackObj) {
                    return trackObj.kind == 'audio' && trackObj.mediaStreamTrack.muted != true && trackObj.mediaStreamTrack.enabled == true
                    && trackObj.mediaStreamTrack.readyState != 'ended'
                    && trackObj.stream.active; 
                });
                log('addSource audio: audioTracks', audioTracks.length)

                if(audioTracks.length == 0) return null;

                let existing = _webrtcAudioConnectedToDest[audioTracks[0].mediaStreamTrack.id];
                if(existing) {
                    log('addSource audio: audioTracks: track with such id already exists')
                }

                if(existing && existing.mediaStreamTrack.readyState != 'ended' && existing.mediaStream.active) {
                    log('addSource audio: audioTracks: already connected', audioTracks.length)

                    //audio stream already connected to main canvas stream
                    return;
                }

                log('addSource audio: if1.1')
                var newAudio = new WebRTCAudioSource(participant);
                newAudio.track = audioTracks[0];
                newAudio.mediaStream = audioTracks[0].stream;//.clone();
                newAudio.mediaStreamTrack = audioTracks[0].mediaStreamTrack;
                newAudio.participant = participant;

                if(!newSource.participant.isLocal) {
                    log('addSource audio: webrtc', audioContext.state, audioContext)

                    if(this.gainNode == null && this.analyserNode == null) {
                        log('addSource audio: webrtc: gainNode, analyserNode');
                        newAudio.gainNode = audioContext.createGain();
                        newAudio.analyserNode = audioContext.createAnalyser();
                        newAudio.analyserNode.minDecibels = -45;
                        newAudio.analyserNode.fftSize = 1024;
                        newAudio.gainNode.connect(newAudio.analyserNode);
                        newAudio.analyserNode.connect(_dest);
                    }
                    log('addSource audio: webrtc: tracks', newAudio.mediaStream.getTracks().length)

                    var connectAudio = function () {
                        console.log('connectAudio2',  newAudio.mediaStream.getAudioTracks())

                        const source = audioContext.createMediaStreamSource(newAudio.mediaStream);
                        source.connect(newAudio.gainNode);
                        _webrtcAudioConnectedToDest[audioTracks[0].mediaStreamTrack.id] = newAudio;
                    }

                    connectAudio();

                    //newAudio.detectSound();
                    let soundCheck = function () {
                        var getAverage = function (array) {
                            return array.reduce((a, b) => a + b) / array.length
                        }
                        let history = newAudio.averageHistory;
                        log('webrtc audio status: participant', participant.username);
                        log('webrtc audio status: average', getAverage(history));
                        log('webrtc audio status: trackInfo', newAudio.mediaStreamTrack.muted, newAudio.mediaStreamTrack.enabled);

                        if(newAudio.mediaStreamTrack.readyState == 'live' && tool.webrtcSignalingLib.state != 'disconnected') {
                            setTimeout(soundCheck, 5000);
                        } 
                    }
                    //setTimeout(soundCheck, 5000);

                    //let newStream = audioContext.createMediaStreamSource(newAudio.mediaStream);
                    //newStream.connect(_dest)
                }
                scene.webrtcAudioSources.splice(0, 0, newAudio)
                return newAudio;
            }  else if(newSource.sourceType == 'audioInput') {
                log('addSource audio: if2')

                var audioSource = new AudioInputSource();
                if (newSource.mediaStreamInstance) audioSource.addStream(newSource.mediaStreamInstance);
                audioSource.name = newSource.title;
                audioSource.scope = 'scene';
                        
                scene.sources.splice(0, 0, audioSource)
                scene.eventDispatcher.dispatch('sourceAdded', audioSource);
                return;
            } else if(newSource.sourceType == 'audio') {
                log('addSource audio: if3')
                var audio = document.createElement('audio');
                audio.muted = false;
                audio.loop = getOptions().liveStreaming && getOptions().liveStreaming.loopAudio ? getOptions().liveStreaming.loopAudio : true;
                audio.src = newSource.url;

                document.body.appendChild(audio);

                var audioSource = new AudioSource();
                audioSource.audioInstance = audio;
                audioSource.name = newSource.title;
                audioSource.scope = 'scene';
                scene.sources.splice(0, 0, audioSource)
                let sourceNode = audioContext.createMediaElementSource(audioSource.audioInstance);
                var gainNode = audioContext.createGain();
                sourceNode.connect(gainNode);
                //source.connect(_dest)
                var analyserNode = audioContext.createAnalyser();
                analyserNode.fftSize = 512;
                gainNode.connect(analyserNode);
                analyserNode.connect(_dest);

                if (getOptions().liveStreaming && getOptions().liveStreaming.localOutput) analyserNode.connect(audioContext.destination);
                audioSource.sourceNode = sourceNode;
                audioSource.gainNode = gainNode;
                audioSource.analyserNode = analyserNode;
                audioSource.audioInstance.play();

                log('addSource sources', scene.audioSources)
                scene.eventDispatcher.dispatch('sourceAdded', audioSource);
                return audioSource;
            } else if(newSource.sourceType == 'video') {
                log('addSource audio: if4')
                log('addSource audio type', newSource.sourceType)

                const source = newSource.sourceType == 'video' ? audioContext.createMediaElementSource(newSource.videoInstance) : audioContext.createMediaStreamSource(newSource.mediaStream);
                var gainNode = audioContext.createGain();
                source.connect(gainNode);
                var analyserNode = audioContext.createAnalyser();
                analyserNode.fftSize = 512;
                gainNode.connect(analyserNode);
                analyserNode.connect(_dest);
                if (getOptions().liveStreaming && getOptions().liveStreaming.localOutput && newSource.sourceType != 'videoInput') {
                    analyserNode.connect(audioContext.destination);
                }
                newSource.audioSourceNode = source;
                newSource.gainNode = gainNode;
                newSource.analyserNode = analyserNode;
                scene.videoAudioSources.splice(0, 0, newSource)

                //_eventDispatcher.dispatch('sourceAdded', newSource);
                return newSource;
            }

        }

        function removeSource(source) {
            if (source.sourceType != 'video') {
                for (let j in _activeScene.sources) {
                    if (_activeScene.sources[j] == source) {
                        _activeScene.sources.splice(j, 1);
                    }
                }
            } else {
                for (let j in _activeScene.videoAudioSources) {
                    if (_activeScene.videoAudioSources[j] == source) {
                        _activeScene.videoAudioSources.splice(j, 1);
                    }
                }
            }

            if(source.mediaStream != null) {
                let tracks = source.mediaStream.getTracks();
                for(let t in tracks) {
                    tracks[t].stop();
                }
            }

            if(source.streamType == 'audioInput' && source.streams.length != 0) {
                for (let i in source.streams) {
                    let tracks = source.streams[i].mediaStream.getTracks();
                    for (let t in tracks) {
                        tracks[t].stop();
                    }
                }
            }
            if(source.audioInstance != null) source.audioInstance.pause();
            muteSourceLocally(source);
        }

        function muteSource(source, localOutput) {
            log('muteSource', source, localOutput);
            //source.mediaStreamTrack.enabled = false;
            if(source.sourceType == 'webrtcaudio' && source.participant.isLocal) {
               
            } else if(source.sourceType == 'webrtcaudio' && !source.participant.isLocal) {
                if(source.mediaStreamTrack.enabled == true) {
                    log('muteSource webrtc', source);
                    source.mediaStreamTrack.enabled = false;
                }
            } else if(source.sourceType == 'audio' || source.sourceType == 'audioInput' || source.sourceType == 'video') {
                log('muteSource: audio || video', source, localOutput);

                source.analyserNode.disconnect(_dest);
                if(localOutput) muteSourceLocally(source);
            }
        }

        function muteSourceLocally(source) {
            if(source.sourceType == 'webrtcaudio') {

            } else if (source.sourceType == 'audio' || source.sourceType == 'video') {
                if (source.analyserNode) source.analyserNode.disconnect(audioContext.destination);
            }
        }

        function unmuteSource(source, localOutput) {
            //source.mediaStreamTrack.enabled = true;
            if(source.sourceType == 'webrtcaudio') {
                if(source.mediaStreamTrack.enabled == false) {
                    log('unmuteSource unmute webrtc', source);
                    source.mediaStreamTrack.enabled = true;
                }
            } else if(source.sourceType == 'audio' || source.sourceType == 'audioInput' || source.sourceType == 'video') {
                source.analyserNode.connect(_dest);
                if(localOutput) unmuteSourceLocally(source);
            }
        }

        function unmuteSourceLocally(source) {
            if(source.sourceType == 'webrtcaudio') {

            } if (source.sourceType == 'audio') {
                source.analyserNode.connect(audioContext.destination);
            } else if (source.sourceType == 'video') {
                source.analyserNode.connect(audioContext.destination);
            }
        }

        function audioSilenceLoop(frequency) {

            var freq = frequency / 1000;      // AudioContext time parameters are in seconds
            // Chrome needs our oscillator node to be attached to the destination
            // So we create a silent Gain Node
            var silence = audioContext.createGain();
            silence.gain.value = 0;
            silence.connect(_dest);

            onOSCend();

            var stopped = false;       // A flag to know when we'll stop the loop
            function onOSCend() {
                var osc = audioContext.createOscillator();
                osc.onended = onOSCend; // so we can loop
                osc.connect(silence);
                osc.start(0); // start it now
                osc.stop(audioContext.currentTime + freq); // stop it next frame
                //callback(audioContext.currentTime); // one frame is done
                if (stopped) {  // user broke the loop
                    osc.onended = function () {
                        //audioContext.close(); // clear the audioContext
                        return;
                    };
                }
            };
            // return a function to stop our loop
            return function () {
                stopped = true;
            };
        }

        function mix(recreate) {
            log('audioComposer: mix', audioContext?.state);
            if (audioContext == null || recreate) {
                log('audioComposer: create AudioContext');
                audioContext = new AudioContext({
                    sampleRate: 44100,
                    latencyHint: 'playback'
                });
            }
            if (_dest == null || recreate) {
                log('audioComposer: createMediaStreamDestination');
                _dest = audioContext.createMediaStreamDestination();
            }

            //if(_stopSilenceLoop) _stopSilenceLoop();
            if(_stopSilenceLoop == null) {
                _stopSilenceLoop = audioSilenceLoop(1000 / 60);
            }

            /*if(_canvasMediStream) {
                log('audioComposer: addTrack');

                _canvasMediStream.addTrack(_dest.stream.getTracks()[0]);
            }*/

            if(recreate) return;
            function declareOrRefreshEventHandlers() {
                var webrtcSignalingLib = tool.webrtcSignalingLib;

                function updateAudioSources(e, eventName) {
                    var track = e.track || e.tracks[0];
                    log('audioComposer: updateAudioSources', e, track.kind, eventName);
                    if(e.track) log('audioComposer: updateAudioSources: track.kind',track.kind);
                    let participant = eventName == 'audioTrackLoaded' || eventName == 'trackAdded' || 'trackUnmuted' ? e.participant : e;
                    log('audioComposer: updateAudioSources participant', participant);

                    if(!participant) {
                        return;
                    }

                    if(eventName == 'trackUnmuted' && track.kind != 'audio') {
                        return;
                    }

                    let audioTracks = participant.tracks.filter(function (trackObj) {
                        return trackObj.kind == 'audio'
                        && trackObj.mediaStreamTrack.enabled != false
                        && trackObj.mediaStreamTrack.readyState != 'ended'; 
                    });

                    if(audioTracks.length == 0) {
                        log('audioComposer: updateAudioSources audioTracks.length == 0');

                        return;
                    }
                    let participantsAudioSourse = addSource({
                        sourceType: 'webrtcaudio',
                        participant: e.participant
                    });

                    for(let i in _activeScene.sources) {
                        if(_activeScene.sources[i].participant == e.participant && !_activeScene.sources[i].screenSharing) {
                            _activeScene.sources[i].audioSource = participantsAudioSourse;
                            break;
                        }
                    }

                }

                tool.eventDispatcher.on('beforeSwitchRoom', declareOrRefreshEventHandlers);

                webrtcSignalingLib.event.on('audioTrackLoaded', updateAudioSources);
                webrtcSignalingLib.event.on('audioMuted', updateAudioSources);
                webrtcSignalingLib.event.on('trackUnmuted', updateAudioSources);
                webrtcSignalingLib.event.on('audioUnmuted', updateAudioSources);
                webrtcSignalingLib.event.on('trackAdded', updateAudioSources);

                _eventDispatcher.on('drawingStop', function () {
                    tool.eventDispatcher.off('beforeSwitchRoom', declareOrRefreshEventHandlers);
                    webrtcSignalingLib.event.off('audioTrackLoaded', updateAudioSources);
                    webrtcSignalingLib.event.off('audioMuted', updateAudioSources);
                    webrtcSignalingLib.event.off('trackUnmuted', updateAudioSources);
                    webrtcSignalingLib.event.off('audioUnmuted', updateAudioSources);
                    webrtcSignalingLib.event.off('trackAdded', updateAudioSources);
                });

                if(getOptions().liveStreaming && getOptions().liveStreaming.sounds) {
                    webrtcSignalingLib.event.on('participantConnected', function (e) {
                        if (_canvasMediStream == null || _dest == null) return;

                        var connectedAudio = new Audio(getOptions().sounds.participantConnected)
                        var audioSource = audioContext.createMediaElementSource(connectedAudio);
                        audioSource.connect(_dest);
                        connectedAudio.play();
                        //audioSource.disconnect(_dest);
                    })

                    webrtcSignalingLib.event.on('participantDisconnected', function (e) {
                        if (_canvasMediStream == null || _dest == null) return;
                        var disconnectedAudio = new Audio(getOptions().sounds.participantDisconnected)
                        var audioSource = audioContext
                            .createMediaElementSource(disconnectedAudio);
                        audioSource.connect(_dest);
                        disconnectedAudio.play();
                        //audioSource.disconnect(_dest);
                    })
                }
            }
            
            function addMeAsGlobalAudioSource() {
                if(_globalMicSource) return;

                var webrtcSignalingLib = tool.webrtcSignalingLib;

                _globalMicSource = addGlobalAudioSource({
                    title: 'Microphone'
                });


                let localAudioTracks = webrtcSignalingLib.localParticipant().audioTracks(true);

                if (localAudioTracks[0] != null && localAudioTracks[0].stream != null) {
                    log('localAudioTracks[0].stream', localAudioTracks[0].stream)
                    _globalMicSource.addStream(localAudioTracks[0].stream);
                }

                //if mic was disabled/enabled, it will mute/unmute me in livestream
                function declareOrRefreshEventHandlers() {
                    var webrtcSignalingLib = tool.webrtcSignalingLib;
                    tool.eventDispatcher.on('beforeSwitchRoom', onBeforeSwitchRoom);
                    webrtcSignalingLib.event.on('trackAdded', onTrackAdded);
                    webrtcSignalingLib.event.on('trackUnmuted', onTrackUnmuted);
                    webrtcSignalingLib.event.on('micEnabled', onMicEnabled);
                    webrtcSignalingLib.event.on('micDisabled', onMicDisabled);

                    _eventDispatcher.on('drawingStop', function () {
                        tool.eventDispatcher.off('beforeSwitchRoom', onBeforeSwitchRoom);
                        webrtcSignalingLib.event.off('trackAdded', onTrackAdded);
                        webrtcSignalingLib.event.off('trackUnmuted', onTrackUnmuted);
                        webrtcSignalingLib.event.off('micEnabled', onMicEnabled);
                        webrtcSignalingLib.event.off('micDisabled', onMicDisabled);
                    });

                    function onBeforeSwitchRoom() {
                        declareOrRefreshEventHandlers();
                    }

                    function onTrackAdded(e) {
                        if (!e.participant.isLocal || e.track.kind != 'audio') return;
                        _globalMicSource.addStream(e.track.stream);
                    }

                    function onTrackUnmuted(e) {
                        if (!e.participant.isLocal || e.track.kind != 'audio' || !e.track.stream) return;
                        _globalMicSource.addStream(e.track.stream);
                    }

                    function onMicEnabled() {
                        _globalMicSource.connect();
                    }
                    
                    function onMicDisabled() {
                        _globalMicSource.disconnect();
                    }
                }

                declareOrRefreshEventHandlers();
                
            }

            declareOrRefreshEventHandlers();
            addMeAsGlobalAudioSource();

        }

        function stop() {
            if(_stopSilenceLoop) {
                _stopSilenceLoop();
                _stopSilenceLoop = null;
            }
            
            if(_globalMicSource) {
                _globalMicSource = null;
            }
            
            for (let s in _activeScene.audioSources) {
                if(_activeScene.audioSources[s].mediaStreamTrack) {
                    _activeScene.audioSources[s].mediaStreamTrack.stop();
                }
            }
            if(_dest != null) _dest.disconnect();
            _dest = null;
        }

        function suspend() {
            if(_dest != null) {
                _dest.disconnect();
                _dest = null;
            }
            if(audioContext != null) {
                audioContext.close();
                audioContext = null;
            }
        }

        return {
            mix: mix,
            stop: stop,
            suspend: suspend,
            getDestination: function () {
                return _dest;
            },
            getContext: function () {
                return audioContext;
            },
            addGlobalAudioSource: addGlobalAudioSource,
            addSource: addSource,
            removeSource: removeSource,
            muteSource: muteSource,
            unmuteSource: unmuteSource,
            muteSourceLocally: muteSourceLocally,
            unmuteSourceLocally: unmuteSourceLocally
        }
    }());

    function addDataListener(callbackFunction) {
        _dataListeners.push(callbackFunction);
    }

    function removeDataListener(callbackFunction) {
        var index = _dataListeners.indexOf(callbackFunction);

        if (index > -1) {
            _dataListeners.splice(index, 1);
        }
    }

    function trigerDataListeners(blob) {
        for(let i in _dataListeners) {
            _dataListeners[i](blob);
        }
    }

    function captureStream() {
        log('captureStream', _canvasMediStream, _fps);

        if(!videoComposer.isActive()) {
            log('captureStream : compositeVideosAndDraw');

            videoComposer.compositeVideosAndDraw();
        }
        
        _canvasMediStream = _canvas.captureStream(_fps); // 30 FPS
        
        var vTrack = _canvasMediStream.getVideoTracks()[0];

        vTrack.addEventListener('mute', function(e){
            _videoTrackIsMuted = true;
            log('captureStream: TRACK MUTED');
        });
        vTrack.addEventListener('unmute', function(e){
            _videoTrackIsMuted = false;
            log('captureStream: TRACK UNMUTED');
        });
        audioComposer.mix();
        function addAudioTrack() {                            
            let destinationNode = audioComposer.getDestination();
            log('destinationNode', destinationNode, destinationNode.stream.getTracks())
            if (destinationNode && destinationNode.stream.getTracks().length != 0) {
                log('captureStream addAudioTrack', destinationNode.stream);
                _canvasMediStream.addTrack(destinationNode.stream.getTracks()[0]);
            }
        }
        addAudioTrack();
        /*let destinationNode = audioComposer.getDestination();
        if(destinationNode && destinationNode.stream.getTracks().length != 0) {
            log('captureStream addAudioTrack');
            _canvasMediStream.addTrack(destinationNode.stream.getTracks()[0]);
        }*/


        _composerIsActive = true;

        return _canvasMediStream;
    }

    function getSupportedStreamingCodec() {
        var localInfo = tool.webrtcSignalingLib.getLocalInfo();
        var codecs = false;

        if (localInfo.browserName && localInfo.browserName.toLowerCase() == 'safari') {
            if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
                codecs = 'video/mp4;codecs=h264';
            }
        } else {
            if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
                codecs = 'video/webm;codecs=h264';
            } else if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
                codecs = 'video/mp4;codecs=h264';
            } /*  else if (Q.info.isMobile && Q.info.isAndroid()) {
                codecs = 'video/webm;codecs=vp8';
            } */
        }

        return codecs;
    }

    function createRecorder(ondataavailable, codecs) {
        log('createRecorder START');

        if(_canvasMediStream == null) {
            log('createRecorder captureStream');
            captureStream();
        }

        log('createRecorder if1 else', _canvasMediStream);
        
        //codecs = getSupportedStreamingCodec();

        if(!codecs) {
            console.log('codecs', codecs)
            throw new Error('No supported codecs found.');
        } 

        let mediaRecorder = new MediaRecorder(_canvasMediStream.clone(), {
            mimeType: codecs,
            audioBitsPerSecond : 128000,
            videoBitsPerSecond: 3 * 1024 * 1024
        });

        mediaRecorder.onerror = function (e) {
            console.error(e);
        }

        mediaRecorder.addEventListener('dataavailable', function (e) {
            //console.log('dataavailable', e.data.size);
            ondataavailable(e.data);
        });

        mediaRecorder.addEventListener('error', function (e) {
            log('mediaRecorder: error', e);
        });
        mediaRecorder.addEventListener('pause', function (e) {
            log('mediaRecorder: pause', e);
        });
        mediaRecorder.addEventListener('resume', function (e) {
            log('mediaRecorder: resume', e);
        });
        mediaRecorder.addEventListener('start', function (e) {
            log('mediaRecorder: start', e);
        });
        mediaRecorder.addEventListener('stop', function (e) {
            log('mediaRecorder: stop', e);
        });
        mediaRecorder.addEventListener('warning', function (e) {
            log('mediaRecorder: warning', e);
        });

        mediaRecorder.start(1000); // Start recording, and dump data every second

        return mediaRecorder;
    }

    function stopCaptureCanvas(stopCanvasDrawingAndMixing) {
        log('stopCaptureCanvas', stopCanvasDrawingAndMixing)                        
        
        //if user ends call, stop all processes related to livestreaming
        if(stopCanvasDrawingAndMixing) {
            log('stopCaptureCanvas: stopCanvasDrawingAndMixing')
            videoComposer.stop();
            audioComposer.stop();
        }

        if(_canvasMediStream != null) {
            log('stopCaptureCanvas: stop tracks')
            let tracks = _canvasMediStream.getTracks();
            for(let t in tracks) {
                if(tracks[t].kind == 'audio') {
                    continue;
                }
                tracks[t].stop()
            }
            _canvasMediStream = null;
        }
        
        _composerIsActive = false;

    }

    function saveToFile(file, fileName) {
        log('saveToFile')
        if (!file) {
            throw 'Blob object is required.';
        }

        if (!file.type) {
            try {
                file.type = 'video/webm';
            } catch (e) {}
        }

        var fileExtension = (file.type || 'video/webm').split('/')[1];

        if (fileName && fileName.indexOf('.') !== -1) {
            var splitted = fileName.split('.');
            fileName = splitted[0];
            fileExtension = splitted[1];
        }

        var fileFullName = (fileName || (Math.round(Math.random() * 9999999999) + 888888888)) + '.' + fileExtension;

        if (typeof navigator.msSaveOrOpenBlob !== 'undefined') {
            return navigator.msSaveOrOpenBlob(file, fileFullName);
        } else if (typeof navigator.msSaveBlob !== 'undefined') {
            return navigator.msSaveBlob(file, fileFullName);
        }

        var hyperlink = document.createElement('a');
        hyperlink.href = URL.createObjectURL(file);
        hyperlink.download = fileFullName;

        hyperlink.style = 'display:none;opacity:0;color:transparent;';
        (document.body || document.documentElement).appendChild(hyperlink);

        if (typeof hyperlink.click === 'function') {
            hyperlink.click();
        } else {
            hyperlink.target = '_blank';
            hyperlink.dispatchEvent(new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
            }));
        }

        URL.revokeObjectURL(hyperlink.href);
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).replace(/\./g, "");
    }

    function randomIntFromInterval(min, max) { // min and max included 
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    function EventSystem() {

        var events = {};

        var CustomEvent = function (eventName) {

            this.eventName = eventName;
            this.callbacks = [];

            this.registerCallback = function (callback) {
                this.callbacks.push(callback);
            }

            this.unregisterCallback = function (callback) {
                const index = this.callbacks.indexOf(callback);
                if (index > -1) {
                    this.callbacks.splice(index, 1);
                }
            }

            this.fire = function (data) {
                const callbacks = this.callbacks.slice(0);
                callbacks.forEach((callback) => {
                    callback(data);
                });
            }
        }

        var dispatch = function (eventName, data) {
            const event = events[eventName];
            if (event) {
                event.fire(data);
            }
        }

        var on = function (eventName, callback) {
            let event = events[eventName];
            if (!event) {
                event = new CustomEvent(eventName);
                events[eventName] = event;
            }
            event.registerCallback(callback);
        }

        var off = function (eventName, callback) {
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
            dispatch: dispatch,
            on: on,
            off: off,
            destroy: destroy
        }
    }

    return {
        videoComposer: videoComposer,
        audioComposer: audioComposer,
        captureStream: captureStream,
        getMediaStream: function() {
            return _canvasMediStream;
        },
        addDataListener: addDataListener,
        removeDataListener: removeDataListener,
        mediaRecorder: function () {
            return _mediaRecorder;
        },
        canvas: function () {
            return _canvas;
        },
        getSupportedStreamingCodec: getSupportedStreamingCodec,
        createRecorder: createRecorder,
        stopCaptureCanvas: stopCaptureCanvas,
        isActive: function () {
            return _composerIsActive;
            //if(_mediaRecorder != null) return true;
            //return false;
        },
        eventDispatcher: function () {
            return _eventDispatcher
        },
        on: function (event, handler) {
            _eventDispatcher.on(event, handler);
        },
        off: function () {

        },
        createScene: createScene,
        getScenes: getScenes,
        getActiveScene: getActiveScene,
        videoTrackIsMuted: function () {
            return _videoTrackIsMuted;
        },
        createScene: createScene,
        removeScene: removeScene,
        moveSceneUp: moveSceneUp,
        moveSceneDown: moveSceneDown,
        getScenes: getScenes,
        selectScene: selectScene,
        getActiveScene: getActiveScene
    }
}