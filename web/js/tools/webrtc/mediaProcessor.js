
(function (Q, $) { 
    
    Q.Media.WebRTC.MediaProcessor = function() {
        const processorInstance = this;
        this.videoTracks = [];
        this.workersPool = [];

        function VideoTrack(mediaStreamTrack) {
            const thisInstance = this;
            this.id = _generateId();
            this.stream = null;
            this.generatedTrack = null;
            this.trackProcessor = null;
            this.originalMediaStreamTrack = mediaStreamTrack;
            this.filters = [];
            this.worker = null;
            this.workerInfo = null;
            this.applyFilter = function (filterName, options) {
                let filterToApply;
                if(filterName == 'virtualBg') {
                    filterToApply = new VirtualBgFilter();
                    filterToApply.videoTrackProcessor = thisInstance;
                    filterToApply.trackId = this.id;
                    filterToApply.replaceWithColor = options.replaceWithColor;
                    if(options && options.filterId) {
                        filterToApply.id = options.filterId;
                    }

                    let workerMessage = {
                        cmd: 'addFiltersToTrack',
                        filterName: filterToApply.name,
                        id: filterToApply.id,
                        trackId: thisInstance.id,
                        replaceWithColor: filterToApply.replaceWithColor,
                        timestampFunc: 1
                    };

                    if(options && options.bgImage) {
                        if (typeof options.bgImage == 'string') {
                            _loadBgImageFromUrl(options.bgImage).then(function (imageBitMap) {
                                filterToApply.bgImage = imageBitMap;
                                workerMessage.bgImage = filterToApply.bgImage
                                _postMessageToWorker(workerMessage);
                            });
                        } else if (options.bgImage instanceof File){
                            _loadBgImageFromFile(options.bgImage).then(function (imageBitMap) {
                                filterToApply.bgImage = imageBitMap;
                                workerMessage.bgImage = filterToApply.bgImage
                                _postMessageToWorker(workerMessage);
                            });
                        } 
                    } else {
                        _postMessageToWorker(workerMessage);
                    }
                } else if(filterName == 'chromaKey') {
                    filterToApply = new ChromaKeyFilter();
                    filterToApply.videoTrackProcessor = thisInstance;
                    filterToApply.trackId = this.id;
                    if(options.keyColor != null) filterToApply.keyColor = options.keyColor;
                    if(options.similarity != null) filterToApply.similarity = options.similarity;
                    if(options.smoothless != null) filterToApply.smoothless = options.smoothless;
                    if(options.spill != null) filterToApply.spill = options.spill;
                    if(options && options.filterId) {
                        filterToApply.id = options.filterId;
                    }
                    _postMessageToWorker({
                        cmd: 'addFiltersToTrack',
                        filterName: filterToApply.name,
                        id: filterToApply.id,
                        trackId: thisInstance.id,
                        keyColor: filterToApply.keyColor,
                        similarity: filterToApply.similarity,
                        smoothless: filterToApply.smoothless,
                        spill: filterToApply.spill
                    })
                }
                
                return filterToApply;

                function _postMessageToWorker(workerMessage) {
        
                    thisInstance.worker.postMessage(workerMessage, filterToApply.bgImage ? [filterToApply.bgImage] : []);
        
                    thisInstance.filters.push(filterToApply);
                }

                function _loadBgImageFromUrl(url) {
                    return new Promise(function (resolve, reject) {        
                        var img = new Image();
                        img.src = url;
                        img.onload = function () {
                            createImageBitmap(img, {
                                premultiplyAlpha: 'none',
                                colorSpaceConversion: 'none',
                            }).then(function (bitmap) {
                                resolve(bitmap); 
                            })
                            
                        };
                    });
                }

                function _loadBgImageFromFile(file) {
                    return new Promise(function (resolve, reject) {        
                        function loadImage(fileReader) {
                            var img = new Image();
                            img.src = fileReader.result;
                            img.onload = function () {
                                createImageBitmap(img, {
                                    premultiplyAlpha: 'none',
                                    colorSpaceConversion: 'none',
                                }).then(function (bitmap) {
                                    resolve(bitmap); 
                                })
                            };
        
                        }
        
                        if (FileReader && file) {
                            var fr = new FileReader();
                            fr.onload = () => loadImage(fr);
                            fr.readAsDataURL(file);
                        }
                    });
                }
            };
            this.removeFilter = function (filterInstance) {
                for(let i = thisInstance.filters.length - 1; i >= 0; i--) {
                    if(thisInstance.filters[i] == filterInstance) {
                        let workerMessage = {
                            cmd: 'removeFilterFromTrack',
                            trackId: thisInstance.id,
                            filterId: filterInstance.id,
                        }
            
                        thisInstance.worker.postMessage(workerMessage);
                        thisInstance.filters.splice(i, 1);
                        return filterInstance;
                    }
                }
            };
            this.stop = function () {
                if(this.stopped) {
                    return;
                }
                this.stopped = true;
                this.worker.postMessage({ cmd: 'removeTrack', trackId: this.id }, []);
                this.workerInfo.tracksCounter = this.workerInfo.tracksCounter - 1;
                this.eventDispatcher.dispatch('stop');
            };
            this.eventDispatcher = new EventSystem();
        }
    
        function Filter() {
            let thisInstance = this;
            this.id = _generateId();
            this.name = null;
            this.track = null;
            this.videoTrackProcessor = null;
            this._active = null;
            this.updateParam = function (paramName, value) {
                thisInstance[paramName] = value;
                this.videoTrackProcessor.worker.postMessage({
                    cmd: 'updateFilterParam',
                    id: thisInstance.id,
                    trackId: thisInstance.trackId,
                    paramName: paramName,
                    value: value
                });
            }
        }
    
        function VirtualBgFilter() {
            Filter.call(this);
            this.name = 'virtualBg';
        }
    
        VirtualBgFilter.prototype = Object.create(Filter.prototype);

        function ChromaKeyFilter() {
            Filter.call(this);
            this.name = 'chromaKey';
            this.keyColor = '#00ff00';
            this.similarity = 0.4;
            this.smoothless = 0.08;
            this.spill = 0.1;
        }
        ChromaKeyFilter.prototype = Object.create(Filter.prototype);

        _createWorkersPool();

        function _createWorkersPool() {
            let workerUrl = Q.url('{{Media}}/js/tools/webrtc/mediaProcessorWorker.js');
            let logicalProcessorsNum = navigator.hardwareConcurrency;
            let i = 0;
            while (i < logicalProcessorsNum) {
                let worker = new Worker(workerUrl);
                processorInstance.workersPool.push({
                    worker:worker,
                    tracksCounter: 0
                });
    
                i++
            }
        }

        this.getLessBusyWorker = function () {
            let lessBusyWorker = this.workersPool.reduce(function (prev, curr) {
                return prev.tracksCounter < curr.tracksCounter ? prev : curr;
            });
            return lessBusyWorker;
        }

        this.removeFilter = function (filter, track) {
            if (!poolInstance.appliedFilters[track.id]) return;            
                for (let i = poolInstance.appliedFilters[track.id].filters.length - 1; i >= 0; i--) {
                    if (poolInstance.appliedFilters[track.id].filters[i] == filter) {
                        poolInstance.appliedFilters[track.id].worker.workerInstance.postMessage({
                            cmd: 'removeFiltersFromTrack',
                            id: filter.id,
                            trackId: track.id
                        })

                        poolInstance.appliedFilters[track.id].filters.splice(i, 1);
                        break;
                    }
                }
            
        }

        this.addVideoTrack = function (mediaStreamTrack, filters) {
            //mediaStreamTrack = mediaStreamTrack.clone();
            if(!mediaStreamTrack || mediaStreamTrack.kind != 'video') {
                console.warn('Wrong type of track')
                return;
            }

            let videoTrack = new VideoTrack()
            videoTrack.originalMediaStreamTrack = mediaStreamTrack;
            videoTrack.generatedTrack = new MediaStreamTrackGenerator({ kind: 'video' });
            videoTrack.trackProcessor = new MediaStreamTrackProcessor({ track: mediaStreamTrack });
            let lessBusyWorker = this.getLessBusyWorker();
            videoTrack.workerInfo = lessBusyWorker;
            videoTrack.worker = lessBusyWorker.worker;
            lessBusyWorker.tracksCounter = lessBusyWorker.tracksCounter + 1;

            let stream = new MediaStream();
            stream.addTrack(videoTrack.generatedTrack);
            videoTrack.stream = stream;
            /* let canvas = document.createElement('CANVAS');
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.zIndex = '999999999999';
            document.body.appendChild(canvas);
            let context = canvas.getContext('2d');
            videoTrack.worker.addEventListener('message', async function (e) {
                if (e.data.cmd == 'check') {
                    canvas.width = e.data.frame.codedWidth || e.data.frame.width;
                    canvas.height = e.data.frame.codedHeight || e.data.frame.height;
                    context.drawImage(
                        e.data.frame,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                      );
                      e.data.frame.close();
                }
            }, false); */
           /*  const transformer = new TransformStream({
                async transform(videoFrame, controller) {
                  videoFrame.close();
                },
              });
              videoTrack.trackProcessor.readable.pipeThrough(transformer).pipeTo(videoTrack.generatedTrack.writable); */
            
            videoTrack.worker.postMessage({ cmd: 'addTrack', trackId: videoTrack.id, trackProcessor: videoTrack.trackProcessor.readable, generatedTrack: videoTrack.generatedTrack.writable }, [videoTrack.trackProcessor.readable, videoTrack.generatedTrack.writable]);       
            return videoTrack;
        }

        function _generateId() {
            return Date.now().toString(36) + Math.random().toString(36).replace(/\./g, "");
        }
    }

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
                    callback(data, eventName);
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
    
})(Q, Q.jQuery);