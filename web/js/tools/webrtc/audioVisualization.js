(function ($, window, undefined) {

	var ua=navigator.userAgent;
	var _isiOS = false;
	var _isAndroid = false;
	var _isiOSCordova = false;
	var _isAndroidCordova = false;
	if(ua.indexOf('iPad')!=-1||ua.indexOf('iPhone')!=-1||ua.indexOf('iPod')!=-1) _isiOS = true;
	if(ua.indexOf('Android')!=-1) _isAndroid = true;
	if(typeof cordova != 'undefined' && _isiOS) _isiOSCordova = true;
	if(typeof cordova != 'undefined' && _isAndroid) _isAndroidCordova = true;


	Q.Tool.define("Media/audioVisualization", function(options) {

            this.state = Q.extend({}, this.state, options);
            Q.addStylesheet('{{Media}}/css/tools/audioVisualization.css?ts=' + performance.now(), function () {});
			this.create();

			},

		{
			editable: false,
			active: true,
			onCreate: new Q.Event(),
			onUpdate: new Q.Event(),
			onRefresh: new Q.Event(),
			onRender: new Q.Event(),
            info:{
                average: 0
            }
		},

        {
            create: function () {
            	var tool = this;
				var state = tool.state;
				var source = state.source;
				var constructorName = source.constructor.name;
                var context = tool.context = new AudioContext();
				if(constructorName == 'MediaStream') {
                    var src = context.createMediaStreamSource(source);
                    var analyser = context.createAnalyser();
                    tool.analyser = analyser;
                    tool.analyser.fftSize = 256;
                    tool.bufferLength = tool.analyser.frequencyBinCount;
                    tool.currentSource = src;

                    src.connect(analyser);
                    //analyser.connect(context.destination);
                } else if(constructorName == 'HTMLAudioElement' || constructorName == 'HTMLVideoElement' || constructorName == 'HTMLMediaElement') {

                    var src = context.createMediaElementSource(source);
                    var analyser = context.createAnalyser();
                    tool.analyser = analyser;
                    tool.currentSource = src;

                    src.connect(analyser);
                    analyser.connect(context.destination);
                } else {
				    throw 'Source should be type of MediaStream or HTMLMediaElement'
                }

                analyser.fftSize = 256;

                if(state.format == 'svg'){
                    if(state.shape == 'historyBars') {
                        tool.currentVisualization = tool.SVGVisualizationBuilder().historyBars();
                    } else if(state.shape == 'circular') {
                        tool.currentVisualization = tool.SVGVisualizationBuilder().circular();
                    }
                } else if(state.format == 'canvas'){
                    if(state.shape == 'historyBars') {
                        tool.currentVisualization = tool.CanvasVisualizationBuilder().historyBars();
                    } else if(state.shape == 'bars') {
                        tool.currentVisualization = tool.CanvasVisualizationBuilder().bars();
                    } else if(state.shape == 'circular') {
                        tool.CanvasVisualizationBuilder().circular();
                    }
                } else if(state.format == 'html'){
                    if(state.shape == 'bars') {
                        tool.currentVisualization = tool.HtmlVisualizationBuilder().bars();
                    } else if(state.shape == 'circles') {
                        tool.currentVisualization = tool.HtmlVisualizationBuilder().circles();
                    }
                }

                tool.context.onstatechange = function (e) {
                    if(e.target.state == 'closed' && tool.currentVisualization != null) {
                        tool.currentVisualization.stopRender();
                    }
                }
            },
            replaceSource: function (newSource) {
                if(!newSource) return false;
                var tool = this;
                var state = tool.state;
                var constructorName = newSource.constructor.name;
                var context = tool.context;
                tool.currentSource.disconnect(tool.analyser);

                if(constructorName == 'MediaStream') {
                    var src = context.createMediaStreamSource(newSource);
                    tool.currentSource = src;
                    src.connect(tool.analyser);
                } else if(constructorName == 'HTMLAudioElement' || constructorName == 'HTMLVideoElement' || constructorName == 'HTMLMediaElement') {
                    var src = tool.context.createMediaElementSource(newSource);
                    tool.currentSource = src;
                    src.connect(tool.analyser);
                    tool.analyser.connect(context.destination);
                } else {
                    throw 'Source should be type of MediaStream or HTMLMediaElement'
                }

                state.source = newSource;

            },
            stop:function() {
                var tool = this;
                console.log('STOP tool.context state', tool.state, tool.context.state);
                console.log('STOP tool source', tool.state.source);
                console.log('STOP tool status', tool.state.status);

                try {
                    var err = (new Error);
                    console.log(err.stack);
                } catch (e) {

                }
                if(tool.state.status == 'stopped') {
                    return console.warn('Tool already stopped');
                }
                tool.state.status = 'stopped';
                if(tool.currentVisualization) {
                    tool.currentVisualization.stopRender();
                }
                if(tool.currentSource && tool.analyser) {
                    tool.currentSource.disconnect(tool.analyser);
                }
                if(tool.context) {
                    tool.context.close();
                    console.log('tool.context state2', tool.context.state)

                }
            },
            pause:function() {
                var tool = this;
                console.log('visualization: pause');
                console.log('tool.context state', tool.context.state);
                if(tool.state.status == 'stopped') {
                    return console.warn('Tool already stopped');
                }
                if(tool.state.status == 'paused') {
                    return console.warn('Tool already paused');
                }
                tool.state.status = 'paused';
                if(tool.currentVisualization) {
                    console.log('pause:  tool.currentVisualization',  tool.currentVisualization);

                    tool.currentVisualization.stopRender();
                }
            },
            resume:function() {
                var tool = this;
                console.log('tool.context resume');
                if(tool.state.status == 'active') {
                    return console.warn('Tool already paused');
                }
                tool.state.status = 'active';
                if(tool.currentVisualization) {
                    tool.currentVisualization.startRender();
                }
            },
            refresh: function () {
                var tool = this;
            },
            SVGVisualizationBuilder: function () {
                //svg visualization is very CPU resources consuming
                var tool = this;
                var state = tool.state;

                function buildHistoryBarsVisualization() {
                    var _isRendering = false;
                    var _animationFrame = false;
                    var _SVGElement = null;
                    var _visualization = {
                        soundBars: null,
                        barsLength: null
                    };

                    var fillColor = '#95ffff';

                    function build() {
                        var visualisation = _visualization;
                        visualisation.soundBars = [];

                        var xmlns = 'http://www.w3.org/2000/svg';
                        var svg  = _SVGElement = document.createElementNS(xmlns, 'svg');
                        svg.setAttribute('width', state.size.width);
                        svg.setAttribute('height', state.size.height);

                        var clippath = document.createElementNS(xmlns, 'clipPath');
                        clippath.setAttributeNS(null, 'id', 'waveform-mask');

                        tool.element.appendChild(svg);
                        var bucketSVGWidth = 4;
                        var bucketSVGHeight = 0;
                        var spaceBetweenRects = 1;

                        var totalBarsNum =  Math.floor(state.size.width / (bucketSVGWidth + spaceBetweenRects));
                        var i;
                        for(i = 0; i < totalBarsNum; i++) {
                            var rect = document.createElementNS(xmlns, 'rect');
                            var x = (bucketSVGWidth * i + (spaceBetweenRects * (i + 1)))
                            var y = 0;
                            rect.setAttributeNS(null, 'x', x);
                            rect.setAttributeNS(null, 'y', 0);
                            rect.setAttributeNS(null, 'width', bucketSVGWidth + 'px');
                            rect.setAttributeNS(null, 'height', bucketSVGHeight + 'px');
                            rect.setAttributeNS(null, 'fill', fillColor);
                            rect.style.strokeWidth = '1';
                            rect.style.stroke = '#1479b5';

                            var barObject = {
                                volume: 0,
                                rect: rect,
                                x: x,
                                y: y,
                                width: bucketSVGWidth,
                                height: bucketSVGHeight,
                                fill: fillColor
                            }

                            visualisation.soundBars.push(barObject);
                            svg.appendChild(rect);
                        }
                        visualisation.barsLength = visualisation.soundBars.length;

                        startRender()
                    }

                    function startRender() {
                        function getAverage(freqData) {
                            var average = 0;
                            for(let i = 0; i < freqData.length; i++) {
                                average += freqData[i]
                            }
                            average = average / freqData.length;
                            return average;
                        }
                        function renderBars(visualization) {
                            if(_isRendering === false) return;
                            _animationFrame = requestAnimationFrame(function () {
                                renderBars(visualization)
                            });
                            var freqData = new Uint8Array(tool.analyser.frequencyBinCount);
                            tool.analyser.getByteFrequencyData(freqData);
                            let average = getAverage(freqData);

                            var barsLength = visualization.barsLength;
                            var i;
                            for(i = 0; i < barsLength; i++){
                                var bar = visualization.soundBars[i];
                                if(i == barsLength - 1) {
                                    bar.volume = average;
                                    var height = (average / 255) * 100;
                                    //if(bar.volume < 0.005) height = 0.1;
                                    bar.y = state.size.height - (state.size.height / 100 * height);
                                    bar.height = height;
                                    bar.rect.setAttributeNS(null, 'height', bar.height + '%');
                                    bar.rect.setAttributeNS(null, 'y', bar.y);

                                } else {
                                    var nextBar = visualization.soundBars[i + 1];
                                    bar.volume = nextBar.volume;
                                    bar.height = nextBar.height;
                                    bar.y = nextBar.y;
                                    bar.rect.setAttributeNS(null, 'height', bar.height + '%');
                                    bar.rect.setAttributeNS(null, 'y', bar.y);
                                }
                            }
                        }
                        _isRendering = true;
                        tool.state.status = 'active';
                        renderBars(_visualization);
                    }

                    function stopRender() {
                        if(_isRendering) {
                            cancelAnimationFrame(_animationFrame);
                            _isRendering = false;
                        }
                    }


                    function updatVisualizationWidth() {
                        if(_visualization == null || _SVGElement == null) return;

                        var visualization = _visualization;
                        _SVGElement.setAttribute('width', state.size.width);
                        _SVGElement.setAttribute('height', state.size.height);

                        var bucketSVGWidth = 4;
                        var bucketSVGHeight = 0;
                        var spaceBetweenRects = 1;
                        var totalBarsNum =  Math.floor(state.size.width / (bucketSVGWidth + spaceBetweenRects));
                        var currentBarsNum = visualization.soundBars.length;
                        if(totalBarsNum > currentBarsNum) {
                            var barsToCreate = totalBarsNum - currentBarsNum;
                            var xmlns = 'http://www.w3.org/2000/svg';
                            let i;
                            for (i = 0; i < currentBarsNum; i++) {
                                var bar = visualization.soundBars[i];

                                bar.x = (bucketSVGWidth * i + (spaceBetweenRects * (i + 1)));
                                bar.y = state.size.height - (state.size.height / 100 * bar.height);
                                bar.rect.setAttributeNS(null, 'x', bar.x);
                                bar.rect.setAttributeNS(null, 'y', bar.y);
                            }

                            var rectsToAdd = [];
                            let u;
                            for (u = 0; u < barsToCreate; u++) {
                                var rect = document.createElementNS(xmlns, 'rect');
                                var x = (bucketSVGWidth * (u + currentBarsNum) + (spaceBetweenRects * ((u + currentBarsNum) + 1)))
                                var y = 0;
                                rect.setAttributeNS(null, 'x', x);
                                rect.setAttributeNS(null, 'y', 0);
                                rect.setAttributeNS(null, 'width', bucketSVGWidth + 'px');
                                rect.setAttributeNS(null, 'height', bucketSVGHeight + 'px');
                                rect.setAttributeNS(null, 'fill', fillColor);
                                rect.style.strokeWidth = '1';
                                rect.style.stroke = '#1479b5';

                                var barObject = {
                                    volume: 0,
                                    rect: rect,
                                    x: x,
                                    y: y,
                                    width: bucketSVGWidth,
                                    height: 0,
                                    fill: fillColor
                                }

                                rectsToAdd.push(barObject);
                            }
                            visualization.soundBars = visualization.soundBars.concat(rectsToAdd)
                            let r;
                            for (r = 0; r < barsToCreate; r++) {
                                _SVGElement.insertBefore(rectsToAdd[r].rect, _SVGElement.firstChild);
                            }
                            visualization.barsLength = visualization.soundBars.length;

                        } else if(totalBarsNum < currentBarsNum) {
                            var barsToRemove = currentBarsNum - totalBarsNum;
                            visualization.barsLength = totalBarsNum;
                            let i;
                            for(i = totalBarsNum; i < currentBarsNum; i++) {
                                var bar = visualization.soundBars[i];
                                bar.rect.parentNode.removeChild(bar.rect);
                            }
                            visualization.soundBars.splice(totalBarsNum, barsToRemove);
                        }
                    }

                    return {
                        build:build,
                        startRender:startRender,
                        stopRender:stopRender,
                        updateWidth:updatVisualizationWidth
                    }
                }

                function buildCircularVisualization() {
                    var _isRendering = false;
                    var _animationFrame = false;
                    var _SVGElement = null;
                    var _visualization = {
                        soundBars: null,
                        barsLength: null
                    };

                    function build() {

                        var visualisation = _visualization;

                        visualisation.soundCircles = [];

                        var xmlns = 'http://www.w3.org/2000/svg';
                        var svg = _SVGElement = document.createElementNS(xmlns, 'svg');
                        svg.setAttribute('width', state.size.width);
                        svg.setAttribute('height', state.size.height);
                        svg.style.overflow = 'visible'
                        var clippath = document.createElementNS(xmlns, 'clipPath');
                        clippath.setAttributeNS(null, 'id', 'waveform-mask');

                        tool.element.appendChild(svg);

                        var totalCirclesNum =  10;
                        var i;
                        for(i = 0; i < totalCirclesNum; i++) {
                            var circle = document.createElementNS(xmlns, 'circle');

                            var cx = '50%'
                            var cy = '50%';
                            var fillColor = '#40fe00';
                            circle.setAttributeNS(null, 'fill', 'none');
                            circle.setAttributeNS(null, 'stroke', '#2bb7ca');
                            circle.setAttributeNS(null, 'stroke-width', '1');
                            //circle.setAttributeNS(null, 'stroke-miterlimit', '10');
                            circle.setAttributeNS(null, 'cx', cx);
                            circle.setAttributeNS(null, 'cy', cy);
                            circle.setAttributeNS(null, 'r', '0%');

                            var circleObject = {
                                volume: 0,
                                circle: circle,
                                cx: cx,
                                cy: cy,
                                radius: 0,
                                fill: fillColor
                            }

                            visualisation.soundCircles.push(circleObject);
                            svg.appendChild(circle);
                        }
                        visualisation.circlesLength = visualisation.soundCircles.length;

                        startRender();
                    }

                    function startRender() {
                        function getAverage(freqData) {
                            var average = 0;
                            for(let i = 0; i < freqData.length; i++) {
                                average += freqData[i]
                            }
                            average = average / freqData.length;
                            return average;
                        }
                        function renderCircles(visualization) {
                            if(_isRendering === false) return;
                            _animationFrame = requestAnimationFrame(function () {
                                renderCircles(visualization)
                            });
                            var freqData = new Uint8Array(tool.analyser.frequencyBinCount);
                            tool.analyser.getByteFrequencyData(freqData);
                            let average = getAverage(freqData);

                            var circlesLength = visualization.circlesLength;
                            var i;
                            for(i = 0; i < circlesLength; i++){
                                var circle = visualization.soundCircles[i];
                                if(i == circlesLength - 1) {
                                    circle.volume = average;
                                    var radius = (average / 255) * 100;
                                    // console.log('radius', radius);
                                    /*if(radius > 100)
                                        radius = 100;
                                    else if(circle.volume < 0.005) radius = 0.1;*/
                                    //var radius = (40 * circle.volume);
                                    circle.radius = 0 + radius;
                                    circle.opacity = 1 -  (0.025 * radius);

                                    circle.circle.setAttributeNS(null, 'r', circle.radius + '%');
                                    circle.circle.setAttributeNS(null, 'opacity', circle.opacity);

                                } else {
                                    var nextCircle = visualization.soundCircles[i + 1];
                                    circle.volume = nextCircle.volume;
                                    circle.radius = nextCircle.radius;
                                    circle.cx = nextCircle.cx;
                                    circle.cy = nextCircle.cy;
                                    circle.circle.setAttributeNS(null, 'r', circle.radius + '%');
                                    circle.circle.setAttributeNS(null, 'opacity', 1 - (0.025 * (circle.radius - 50)));
                                }
                            }
                        }

                        _isRendering = true;
                        tool.state.status = 'active';
                        renderCircles(_visualization);
                    }

                    function stopRender() {
                        if(_isRendering) {
                            cancelAnimationFrame(_animationFrame);
                            _isRendering = false;
                        }
                    }

                    return {
                        build:build,
                        startRender:startRender,
                        stopRender:stopRender
                    }
                }


                return {
                    historyBars: function () {
                        var historyBars = buildHistoryBarsVisualization();
                        historyBars.build();
                        return historyBars;
                    },
                    circular: function () {
                        var circles = buildCircularVisualization();
                        circles.build();
                        return circles;
                    }
                }
			},
            HtmlVisualizationBuilder: function () {
                var tool = this;
                var state = tool.state;

                function buildBarsVisualization() {
                    var _isRendering = false;
                    var _animationFrame = false;
                    var _visualizationContainer = null;
                    var _visualization = {
                        soundBars: [],
                        barsLength: null
                    };
                    var barWidth = 4;
                    var originalBarHeight = 64;
                    var originalBarWidth = 18;
                    var originalBgWidth = 178;
                    var timesSizeChanged = originalBarHeight > state.size.height ? originalBarHeight / state.size.height : state.size.height / originalBarHeight;
                    var newBgWidth = originalBgWidth / timesSizeChanged;
                    var newBarWidth = newBgWidth / 9;
                    var root = document.querySelector(':root');
                    root.style.setProperty('--barsSize', newBgWidth + 'px ' + state.size.height + 'px');
                    root.style.setProperty('--barWidth', newBarWidth + 'px');
                    for(let i = 0; i <=8; i++) {
                        root.style.setProperty('--avBar' + i + 'x', '-' + (newBarWidth*(i)) + 'px');
                    }

                    function build() {
                        var visualisation = _visualization;
                        visualisation.soundBars = [];

                        var container  = _visualizationContainer = document.createElement('DIV');
                        container.dataset.cssName = 'visualization-container';
                        container.style.width = state.size.width + 'px';
                        container.style.height = state.size.height + 'px';
                        tool.element.appendChild(container);

                        var totalBarsNum = 3;
                        var i;
                        for(i = 0; i < totalBarsNum; i++) {
                            let bar = document.createElement('DIV');
                            bar.className = 'visualization-bar-' + (i + 1);
                            var barObject = {
                                barEl: bar
                            }

                            visualisation.soundBars.push(barObject);
                            container.appendChild(bar);
                        }
                        visualisation.barsLength = visualisation.soundBars.length;

                        startRender()
                    }

                    function startRender() {
                        function calculateAverageLevel(startIndex, endIndex, freqData) {
                            let sum = 0;
                            for (let i = startIndex; i <= endIndex; i++) {
                                sum += freqData[i];
                            }
                            return Math.floor(sum / (endIndex - startIndex + 1) / 255 * 9);
                        }

                        function getAverage(freqData) {
                            var average = 0;
                            for(let i = 0; i < freqData.length; i++) {
                                average += freqData[i]
                            }
                            average = average / freqData.length;
                            return average;
                        }

                        const frequencyBands = [
                            { start: 20, end: 400 },  // Bar 1 represents the lower frequency range
                            { start: 400, end: 2000 }, // Bar 2 represents the mid frequency range
                            { start: 2000, end: 20000 } // Bar 3 represents the higher frequency range
                        ];

                        const minThreshold = 120;

                        var throttledRender;
                        function renderBars(visualization) {
                            if(_isRendering === false) return;
                            _animationFrame = requestAnimationFrame(throttledRender);
                            //throttledRender();
                            let bufferLength = tool.analyser.frequencyBinCount
                            var freqData = new Uint8Array(bufferLength);
                            tool.analyser.getByteFrequencyData(freqData);
                            tool.state.info.average = getAverage(freqData);
                            Q.handle(state.onRender, tool, [tool.state.info.average]);
                            
                            let levels = [];
                            for (let index in visualization.soundBars) {
                                const band = frequencyBands[parseInt(index)];
                                const bandData = freqData.slice(
                                    Math.floor(band.start / (tool.context.sampleRate / bufferLength)),
                                    Math.floor(band.end / (tool.context.sampleRate / bufferLength))
                                );
                                const maxAmplitude = Math.max(...bandData);
                                const audioLevel = Math.floor((maxAmplitude / 255) * 8);
                                //console.log('audioLevel', audioLevel)
                                // Ignore low noise volume below the threshold
                                if (maxAmplitude < minThreshold) {
                                    levels.push(0);
                                    continue;
                                }

                                levels.push(audioLevel);
                            };
                            _visualizationContainer.className = `visualization-container-${levels[0]}-${levels[1]}-${levels[2]}`;

                        }

                        _isRendering = true;
                        tool.state.status = 'active';
                        throttledRender = Q.throttle(function () {
                            renderBars(_visualization);
                        }, 15, true);
                        throttledRender();
                    }

                    function stopRender() {
                        if(_isRendering) {
                            cancelAnimationFrame(_animationFrame);
                            _isRendering = false;
                            _visualizationContainer.className = 'visualization-container-0-0-0';
                            tool.state.info.average = -1;
                            Q.handle(state.onRender, tool, [tool.state.info.average]);
                        }
                    }

                    return {
                        build:build,
                        startRender:startRender,
                        stopRender:stopRender,
                    }
                }

                function buildCirclesVisualization() {
                    var _isRendering = false;
                    var _animationFrame = false;
                    var _visualizationContainer = null;
                    var _visualization = {
                        soundCircles: [],
                        circlesLength: null
                    };
                    var barWidth = 4;
                    var originalBarHeight = 64;
                    var originalBarWidth = 18;
                    var originalBgWidth = 178;
                    var timesSizeChanged = originalBarHeight > state.size.height ? originalBarHeight / state.size.height : state.size.height / originalBarHeight;
                    var newBgWidth = originalBgWidth / timesSizeChanged;
                    var newBarWidth = newBgWidth / 9;
                    //var root = document.querySelector(':root');
                    //root.style.setProperty('--barsSize', newBgWidth + 'px ' + state.size.height + 'px');
                    //root.style.setProperty('--barWidth', newBarWidth + 'px');
                    //for(let i = 0; i <=8; i++) {
                        //root.style.setProperty('--avBar' + i + 'x', '-' + (newBarWidth*(i)) + 'px');
                    //}

                    var fadeOutTimeout = null;
                    var latestTimerUpdate = 0;

                    function build() {
                        var visualisation = _visualization;
                        visualisation.soundBars = [];

                        var container  = _visualizationContainer = document.createElement('DIV');
                        //container.dataset.cssName = 'pulse-visualization-container';
                        var width = parseInt(state.size.width);
                        var height = parseInt(state.size.height);
                        container.style.width = width + ((state.size.width.match(/(%|px)$/)||["px"])[0]);
                        container.style.height = height + ((state.size.height.match(/(%|px)$/)||["px"])[0]);
                        tool.element.appendChild(container);

                        var totalCirclesNum = 3;
                        var i;
                        for(i = 0; i < totalCirclesNum; i++) {
                            let circle = document.createElement('DIV');
                            circle.className = 'visualization-circle-' + (i + 1);
                            var circleObject = {
                                circleEl: circle
                            }

                            visualisation.soundCircles.push(circleObject);
                            //container.appendChild(circle);
                        }
                        visualisation.circlesLength = visualisation.soundCircles.length;

                        startRender()
                    }

                    function startRender() {
                        function calculateAverageLevel(startIndex, endIndex, freqData) {
                            let sum = 0;
                            for (let i = startIndex; i <= endIndex; i++) {
                                sum += freqData[i];
                            }
                            return Math.floor(sum / (endIndex - startIndex + 1) / 255 * 9);
                        }

                        function getAverage(freqData) {
                            var average = 0;
                            for(let i = 0; i < freqData.length; i++) {
                                average += freqData[i]
                            }
                            average = average / freqData.length;
                            return average;
                        }

                        const maxAudioLevel = 255; // Maximum scale factor for circles (original size + 20%)
                        const minAudioLevelThreshold = 20; // Minimum audio level threshold

                        var throttledRender;
                        function renderBars() {
                            if(_isRendering === false) return;
                            _animationFrame = requestAnimationFrame(throttledRender);
                            //throttledRender();
                            let bufferLength = tool.analyser.frequencyBinCount
                            var freqData = new Uint8Array(bufferLength);
                            tool.analyser.getByteFrequencyData(freqData);
                            let audioLevel = tool.state.info.average = getAverage(freqData);
                            Q.handle(state.onRender, tool, [tool.state.info.average]);
                            if (audioLevel > minAudioLevelThreshold) {
                                // Apply logarithmic scaling to the audio level
                                const scaledAudioLevel = Math.log10(1 + audioLevel) / Math.log10(1 + maxAudioLevel);
                                
                                // Calculate the scale factor based on the scaled audio level (with constraints)
                                const scaleFactor = 1 + scaledAudioLevel * 5; // Scale factor range: 1 to 6

                                // Round the scale factor to the nearest integer
                                const roundedScale = Math.round(scaleFactor);

                                // Update the parent container class name to apply the corresponding scale
                                _visualizationContainer.className = `pulse-visualization-container pulse-visualization-container-${roundedScale} pulse-visualization-fade`;
                                if (!fadeOutTimeout) {

                                    fadeOutTimeout = setTimeout(function () {
                                        _visualizationContainer.classList.remove('pulse-visualization-fade');
                                        fadeOutTimeout = null;
                                        latestTimerUpdate = null;

                                    }, 1400);
                                }                                 
                                
                                return;
                            } 

                            _visualizationContainer.className = 'pulse-visualization-container pulse-visualization-container-1' + (fadeOutTimeout ? ' pulse-visualization-fade' : '');
                        
                        }

                        _isRendering = true;
                        tool.state.status = 'active';
                        throttledRender = Q.throttle(function () {
                            renderBars();
                        }, 25, true);
                        throttledRender();
                    }

                    function stopRender() {
                        if(_isRendering) {
                            cancelAnimationFrame(_animationFrame);
                            _isRendering = false;
                            _visualizationContainer.className = 'visualization-container-0-0-0';
                            tool.state.info.average = -1;
                            Q.handle(state.onRender, tool, [tool.state.info.average]);
                        }
                    }

                    return {
                        build:build,
                        startRender:startRender,
                        stopRender:stopRender,
                    }
                }

                return {
                    bars: function () {
                        var bars = buildBarsVisualization();
                        bars.build();
                        return bars;
                    },
                    circles: function () {
                        var circles = buildCirclesVisualization();
                        circles.build();
                        return circles;
                    }
                }
			},
			CanvasVisualizationBuilder: function () {
                var tool = this;
                var state = tool.state;

                function buildBarsVisualization() {
                    var _isRendering = false;
                    var _animationFrame = false;
                    var _canvas = null;

                    function build() {
                        var canvas = _canvas = document.createElement("canvas");
                        canvas.width = state.size.width;
                        canvas.height = state.size.height;
                        console.log('tool.element', tool.element.offsetWidth, tool.element.offsetHeight)
                        tool.element.appendChild(canvas);

                        startRender()
                    }

                    function startRender() {
                        var ctx = _canvas.getContext("2d");

                        var bufferLength = tool.analyser.frequencyBinCount;
                        console.log(bufferLength);

                        var dataArray = new Uint8Array(bufferLength);

                        var WIDTH = _canvas.width;
                        var HEIGHT = _canvas.height;

                        var barWidth = (WIDTH / bufferLength) * 2.5;
                        var barHeight;
                        var x = 0;

                        var throttledRender;
                        function renderFrame() {
                            if(_isRendering === false) return;
                            _animationFrame = requestAnimationFrame(throttledRender);
                            //throttledRender();
                            x = 0;

                            tool.analyser.getByteFrequencyData(dataArray);

                            //ctx.fillStyle = "#000";
                            ctx.clearRect(0, 0, WIDTH, HEIGHT);

                            for (var i = 0; i < bufferLength; i++) {
                                barHeight = dataArray[i];

                                var r = barHeight + (25 * (i/bufferLength));
                                var g = 250 * (i/bufferLength);
                                var b = 50;

                                ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
                                ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

                                x += barWidth + 1;
                            }
                        }

                        _isRendering = true;
                        tool.state.status = 'active';
                        throttledRender = Q.throttle(function () {
                            renderFrame();
                        }, 25, true);
                        throttledRender();
                    }

                    function stopRender() {
                        if(_isRendering) {
                            cancelAnimationFrame(_animationFrame);
                            _isRendering = false;
                        }
                    }

                    return {
                        build:build,
                        startRender:startRender,
                        stopRender:stopRender
                    }
                }

                function buildHistoryBarsVisualization() {
                    var _isRendering = false;
                    var _animationFrame = false;
                    var _canvas = null;
                    var _visualization = {
                        soundBars: null,
                        barsLength: null
                    };

                    var bucketWidth = 4;
                    var bucketHeight = 0;
                    var spaceBetweenRects = 1;

                    function build() {
                        var visualization = _visualization;
                        visualization.soundBars = [];


                        var totalBarsNum =  Math.floor(state.size.width / (bucketWidth + spaceBetweenRects));
                        var i;
                        for(i = 0; i < totalBarsNum; i++) {
                            var x = (bucketWidth * i + (spaceBetweenRects * (i + 1)))
                            var y = state.size.height;
                            var fillColor = '#95ffff';

                            var barObject = {
                                volume: 0,
                                x: x,
                                y: y,
                                width: bucketWidth,
                                height: bucketHeight,
                                fill: fillColor
                            }

                            visualization.soundBars.push(barObject);
                        }
                        visualization.barsLength = visualization.soundBars.length;

                        var canvas = _canvas = document.createElement("canvas");
                        canvas.width = state.size.width;
                        canvas.height = state.size.height;
                        console.log('tool.element', tool.element.offsetWidth, tool.element.offsetHeight)
                        tool.element.appendChild(canvas);

                        startRender();
                    }

                    function startRender() {
                        var ctx = _canvas.getContext("2d");

                        var WIDTH = _canvas.width;
                        var HEIGHT = _canvas.height;

                        function getAverage(freqData) {
                            var average = 0;
                            for(let i = 0; i < freqData.length; i++) {
                                average += freqData[i]
                            }
                            average = average / freqData.length;
                            return average;
                        }


                        function renderFrame(visualization) {
                            if(tool.context.state == 'closed') return;
                            if(_isRendering === false) return;
                            _animationFrame = requestAnimationFrame(function () {
                                renderFrame(visualization);
                            });

                            if(tool.context.state != 'running') return;
                            var freqData = new Uint8Array(tool.analyser.frequencyBinCount);
                            tool.analyser.getByteFrequencyData(freqData);
                            let average = getAverage(freqData);

                            var barsLength = visualization.barsLength;
                            var i;
                            for(i = 0; i < barsLength; i++){
                                var bar = visualization.soundBars[i];
                                if(i == barsLength - 1) {
                                    bar.volume = average;
                                    var height = HEIGHT / 100 * ((average / 255) * 100);
                                    //if(bar.volume < 5) height = 1;

                                    bar.y = state.size.height - height;
                                    //bar.y = state.size.height / 2 - height / 2;
                                    bar.height = height;
                                } else {
                                    var nextBar = visualization.soundBars[i + 1];
                                    bar.volume = nextBar.volume;
                                    bar.height = nextBar.height;
                                    bar.y = nextBar.y;
                                }
                            }

                            ctx.clearRect(0, 0, WIDTH, HEIGHT);

                            for (let b in visualization.soundBars) {
                                let barHeight = visualization.soundBars[b].height;
                                let x = visualization.soundBars[b].x;
                                let y = visualization.soundBars[b].y;

                                ctx.fillStyle = "#95ffff";
                                ctx.fillRect(x, y, bucketWidth, barHeight);
                                ctx.strokeStyle = "rgb(20, 121, 181)";
                                ctx.strokeRect(x, y, bucketWidth, barHeight);

                            }
                        }

                        _isRendering = true;
                        tool.state.status = 'active';
                        renderFrame(_visualization);
                    }

                    function stopRender() {
                        if(_isRendering) {
                            cancelAnimationFrame(_animationFrame);
                            _isRendering = false;
                        }
                    }

                    return {
                        build: build,
                        startRender: startRender,
                        stopRender: stopRender,
                    }
                }

                function buildCircularVisualization() {

                }
                
                return {
                    historyBars: function () {
                        var historyBars = buildHistoryBarsVisualization();
                        historyBars.build();
                        return historyBars;
                    },
                    bars: function () {
                        var bars = buildBarsVisualization();
                        bars.build();
                        return bars;
                    },
                    circular: buildCircularVisualization
                }
			},
            show: function () {
                if (this.element != null) {
                    this.element.style.display = '';
                }
            },
            hide: function () {
                if (this.element != null) {
                    this.element.style.display = 'none';
                }
            }
        }
	);

})(window.jQuery, window);