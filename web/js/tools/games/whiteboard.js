(function ($, window, undefined) {
    
    function Whiteboard(container, stream) {
        let _color = '#000';
        let _thickness = 2;
        let _canvasContentEl = null;
        let _wetInkCanvasEl = null;
        let _pathCommand = 'lineTo'; //arcTo|lineTo; also possible to refactor: https://jsfiddle.net/713qxso4/2/

        let events = new EventSystem();
        
        let isDragging = false;
        let offsetX = 0, offsetY = 0;

        let _isConnecting = false;
        let _middleButtonPressed = false;
        let _objectToRemove = null;
        
        let _canvasObjectsById = {};
        let _canvasObjects = [];
        window.getAllObjects = function () {
            return _canvasObjects;
        }
        let _wetInkCanvasWidth, _wetInkCanvasHeight, svgCanvasRect, _currentPath, isDrawing;
        let lastDraw;

        const scaleSpeed = 0.05;
        let wetInkTranslatePosition = { x: 0, y: 0 };
        let translatePosition = { x: 0, y: 0 };
        let target = { x: 0, y: 0 };
        let pointer = { x: 0, y: 0 };
        let scale = 1;

        let scaleState = {

        }

        let canvasContainer;
        let transformComponent;
        let svg;

        let _icons = {
            scaleDown: '<svg id="fi_5715783" height="512" viewBox="0 0 32 32" width="512" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1"><path d="m29.71 28.29-8.26-8.29a11 11 0 1 0 -1.45 1.45l8.26 8.26a1 1 0 0 0 1.42-1.42zm-25.71-15.29a9 9 0 1 1 9 9 9 9 0 0 1 -9-9z"></path><path d="m17 12h-8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2z"></path></svg>',
            scaleUp: '<svg id="fi_5715774" height="512" viewBox="0 0 32 32" width="512" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1"><path d="m29.71 28.29-8.26-8.29a11 11 0 1 0 -1.45 1.45l8.26 8.26a1 1 0 0 0 1.42-1.42zm-25.71-15.29a9 9 0 1 1 9 9 9 9 0 0 1 -9-9z"></path><path d="m17 12h-3v-3a1 1 0 0 0 -2 0v3h-3a1 1 0 0 0 0 2h3v3a1 1 0 0 0 2 0v-3h3a1 1 0 0 0 0-2z"></path></svg>',
            fit: '<svg id="fi_4979865" height="512" viewBox="0 0 512 512" width="512" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1"><path d="m440.23 0h-368.46a71.852 71.852 0 0 0 -71.77 71.771v368.459a71.851 71.851 0 0 0 71.77 71.77h368.46a71.851 71.851 0 0 0 71.77-71.77v-368.459a71.852 71.852 0 0 0 -71.77-71.771zm39.77 440.23a39.815 39.815 0 0 1 -39.77 39.77h-368.46a39.815 39.815 0 0 1 -39.77-39.77v-368.459a39.816 39.816 0 0 1 39.77-39.771h368.46a39.816 39.816 0 0 1 39.77 39.771zm-62.687-345.543a15.992 15.992 0 0 1 4.648 12.424l-6.72 96.527a16 16 0 0 1 -15.941 14.889q-.561 0-1.128-.039a16 16 0 0 1 -14.85-17.073l3.75-53.855-97.627 97.626a16 16 0 0 1 -22.627-22.627l97.627-97.627-53.856 3.75a16 16 0 0 1 -2.223-31.923l96.527-6.72a16.019 16.019 0 0 1 12.42 4.648zm-172.127 172.127a16 16 0 0 1 0 22.627l-97.627 97.627 53.856-3.75a16 16 0 1 1 2.223 31.923l-96.527 6.72q-.557.039-1.111.039a16 16 0 0 1 -15.96-17.111l6.72-96.527a16 16 0 1 1 31.923 2.223l-3.75 53.856 97.627-97.627a16 16 0 0 1 22.626 0z"></path></svg>',
        }

        _isConnecting = true;
        joinStream().then(function () {
            subscribeToEvents();
            getCanvasState().then(function (messages) {
            
                createWhiteboard();
                handleCanvasAreaDragging();
                handleCanvasAreaZooming();
    
                function onResize(){
                    let containerRect = container.getBoundingClientRect();
                    setSize(containerRect.width, containerRect.height);
                    svgCanvasRect = svg.getBoundingClientRect();
                } 
                window.addEventListener('resize', onResize);
                window.addEventListener('load', onResize);
        
                const scrollableResizeObserver = new ResizeObserver((entries) => {
                    onResize();
                });
                        
                scrollableResizeObserver.observe(container);
    
                window.addEventListener('mousedown', handleMouseDown);
                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('mouseup', handleMouseUp);
    
    
                loadCanvasState(messages);
            });
        });

        function subscribeToEvents() {
            stream.onMessage("Media/whiteboard/draw").set(function (message) {
                console.log('message: Media/whiteboard/draw', message);
                var instructions = JSON.parse(message.instructions);
                if(message.byUserId == Q.Users.loggedInUserId()) {
                    return;
                }

                if (!instructions.pathData) {
                    console.warn('Whiteboard: no drawingData found in message');
                    return;
                }
                let canvasObject = parseMessage(message);
                if(!_canvasObjectsById[instructions.id]) {
                    _canvasObjectsById[instructions.id] = canvasObject;
                }
                _canvasObjects.push(canvasObject);
                putObjectOnCanvas(canvasObject);
            });
            stream.onMessage("Media/whiteboard/remove").set(function (message) {
                console.log('message: Media/whiteboard/remove', message);
                var instructions = JSON.parse(message.instructions);
                if(message.byUserId == Q.Users.loggedInUserId()) {
                    console.log('message: Media/whiteboard/remove return');

                    return;
                }

                console.log('message: Media/whiteboard/remove 1', _canvasObjectsById);
                if(_canvasObjectsById[instructions.id]) {
                    console.log('message: Media/whiteboard/remove 1');

                    _canvasObjectsById[instructions.id].removed = true;
                    removeCanvasObjectLocally(_canvasObjectsById[instructions.id]);
                } else {
                    _canvasObjectsById[instructions.id] = 'removed'
                    console.log('message: Media/whiteboard/remove 2');
                }
            });
        }

        
        function CanvasObject(objectInfo) {
            this.id = objectInfo.id || generateId();
            this.objectElement = objectInfo.objectElement;
            this.strokeColor = objectInfo.strokeColor;
            this.strokeWidth = objectInfo.strokeWidth;
            this.fill = objectInfo.fill;
            this.pathData = objectInfo.pathData;
            this.x = objectInfo.x;
            this.y = objectInfo.y;
            this.removed = false;
            this.byUserId = objectInfo.byUserId;
            this.clone = function () {
                let clone =  Object.assign({}, this);
                console.log('this.objectElement BEFORE', this.objectElement)
                delete clone.clone;
                delete clone.objectElement;
                console.log('this.objectElement AFTER', this.objectElement)
                delete clone.isLocal;
                delete clone.toJSON;
                return clone;
            }
            this.toJSON = function () {
                let clone = this.clone();
                return JSON.stringify(clone);
            }
        }
        

        function createWhiteboard() {
            container.classList.add('whiteboard-container');

            canvasContainer = document.createElement("div");
            canvasContainer.className = "canvas-container";
            container.appendChild(canvasContainer);

            transformComponent = document.createElement("div");
            transformComponent.className = "transform-component";
            canvasContainer.appendChild(transformComponent);

            const canvasContent = _canvasContentEl = document.createElement('DIV');
            canvasContent.className = 'whiteboard-canvas'
            transformComponent.appendChild(canvasContent);

            const wetInkContainer = document.createElement('div');
            wetInkContainer.className = 'whiteboard-wetink';
            canvasContent.appendChild(wetInkContainer);

            svg = _wetInkCanvasEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            wetInkContainer.appendChild(svg);

            container.appendChild(createToolBar());
        }

        function generateId() {
            return Date.now().toString(36) + Math.random().toString(36).replace(/\./g, "");
        }

        function adjustWetInkCanvasSize() {
            // Calculate the total translation applied to transformComponent
            const totalTranslationX = translatePosition.x;
            const totalTranslationY = translatePosition.y;

            // Adjust the translation for _wetInkCanvasEl to counteract the parent transformations
            const canvasTransformX = -totalTranslationX / scale;
            const canvasTransformY = -totalTranslationY / scale;

            // Update the CSS transform for _wetInkCanvasEl
            _wetInkCanvasEl.style.transform = `translate(${canvasTransformX}px, ${canvasTransformY}px)`;
            wetInkTranslatePosition.x = canvasTransformX;
            wetInkTranslatePosition.y = canvasTransformY;
            // Update the size of _wetInkCanvasEl to match the scaled size
            const canvasWidth = _wetInkCanvasWidth / scale;
            const canvasHeight = _wetInkCanvasHeight / scale;
            _wetInkCanvasEl.style.width = `${canvasWidth}px`;
            _wetInkCanvasEl.style.height = `${canvasHeight}px`;

            // Update the viewBox attribute to maintain the same visible area
            let contRect = container.getBoundingClientRect();
            _wetInkCanvasEl.setAttribute('viewBox', `0 0 ${contRect.width} ${contRect.height}`);
        }

        function handleCanvasAreaDragging() {
            let startDragX, startDragY;
            let spacebarPressed = false;
            
            document.addEventListener("keydown", function (event) {
                if (event.key === ' ') {
                    spacebarPressed = true;
                    event.preventDefault();
                }
            })
            document.addEventListener("keyup", function (event) {
                if (event.key === ' ') {
                    spacebarPressed = false;
                    event.preventDefault();
                }
            })

            canvasContainer.addEventListener('mousedown', onDragStart);

            function onDragStart(e) {
                if(!spacebarPressed) {
                    return;
                }
                isDragging = true;
                startDragX = e.clientX;
                startDragY = e.clientY;
                if(translatePosition.x) {
                    offsetX = translatePosition.x
                }
                if(translatePosition.y) {
                    offsetY = translatePosition.y
                }
                canvasContainer.style.cursor = 'grabbing';

                window.addEventListener('mousemove', onDragMove);
            
                window.addEventListener('mouseup', onDragEnd);
            }

            function onDragMove(e) {
                const deltaX = e.clientX - startDragX;
                const deltaY = e.clientY - startDragY;
                offsetX += deltaX;
                offsetY += deltaY;
                transformComponent.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
                translatePosition.x = offsetX;
                translatePosition.y = offsetY;
                startDragX = e.clientX;
                startDragY = e.clientY;
            }

            function onDragEnd(e) {
                isDragging = false;
                offsetX = 0;
                offsetY = 0;
                adjustWetInkCanvasSize();
                canvasContainer.style.cursor = '';
                window.removeEventListener('mousemove', onDragMove);
                window.removeEventListener('mouseup', onDragEnd);
            }
        }

        function handleCanvasAreaZooming() {

            canvasContainer.addEventListener('wheel', handleMouseWheel, { passive: false });
        
            // Function to handle the mouse wheel event
            function handleMouseWheel(event) {
                event.preventDefault();
  
                pointer.x = event.clientX;
                pointer.y = event.clientY;
                target.x = (pointer.x - translatePosition.x) / scale;
                target.y = (pointer.y - translatePosition.y) / scale;
                console.log('event.deltaY', event.deltaY)
                let newScale = scale + (-1 * Math.max(-1, Math.min(1, event.deltaY)) * scaleSpeed * scale);
                
                
                // Uncomment to constrain scale
                // const max_scale = 4;
                // const min_scale = 1;
                // scale = Math.max(min_scale, Math.min(max_scale, scale));
              
               /*  translatePosition.x = -target.x * scale + pointer.x;
                translatePosition.y = -target.y * scale + pointer.y;
              
                transformComponent.style.transform = `translate(${translatePosition.x}px,${translatePosition.y}px) scale(${scale},${scale})`; */

                setScale(newScale);

                adjustWetInkCanvasSize();
            }
        }

        function setScale(scaleValue) {
            scale = scaleValue;
            translatePosition.x = -target.x * scale + pointer.x;
            translatePosition.y = -target.y * scale + pointer.y;
            console.log('translatePosition', translatePosition.x, translatePosition.y)
            transformComponent.style.transform = `translate(${translatePosition.x}px,${translatePosition.y}px) scale(${scale},${scale})`;
            
            events.dispatch('scale', { scale: scale })
        }

        function setTranslatePosition(x, y) {
            translatePosition.x = x;
            translatePosition.y = y;
            transformComponent.style.transform = `translate(${translatePosition.x}px, ${translatePosition.y}px) scale(${scale})`;
        }
        
        function createToolBar() {
            const toolBarContainer = document.createElement('DIV');
            toolBarContainer.className = 'whiteboard-toolbar'

            const toolBar = document.createElement('DIV');
            toolBar.className = 'whiteboard-toolbar-inner'
            toolBarContainer.appendChild(toolBar);

            const thicknessSetting = document.createElement('DIV');
            thicknessSetting.className = 'whiteboard-toolbar-thickness'
            toolBar.appendChild(thicknessSetting);

            const thicknessSlider = document.createElement('INPUT');
            thicknessSlider.className = 'toolbar-thickness-slider'
            thicknessSlider.type = 'range'
            thicknessSlider.min = 1;
            thicknessSlider.max = 6;
            thicknessSlider.value = _thickness;
            thicknessSetting.appendChild(thicknessSlider);

            thicknessSlider.addEventListener('input', (event) => {
                // Update the line thickness based on the slider value
                console.log(event.target.value)
                const newThickness = parseInt(event.target.value);
                setThickness(newThickness);
            });

            const colorSelectorCon = document.createElement('DIV');
            colorSelectorCon.className = 'whiteboard-toolbar-color'
            toolBar.appendChild(colorSelectorCon);

            const colorSelector = document.createElement('INPUT');
            colorSelector.className = 'toolbar-color-selector'
            colorSelector.type = 'color'
            colorSelector.value = _color;
            thicknessSetting.appendChild(colorSelector);

            colorSelector.addEventListener('input', (event) => {
                // Update the line color based on the selected color
                const newColor = event.target.value;
                setColor(newColor);
            });


            toolBarContainer.appendChild(createScaleBar());

            return toolBarContainer;
        }

        function createScaleBar() {
            let scaleBarContainer = document.createElement('DIV');
            scaleBarContainer.className = 'whiteboard-scalebar';
            let scaleBarContainerInner = document.createElement('DIV');
            scaleBarContainerInner.className = 'whiteboard-scalebar-inner';
            scaleBarContainer.appendChild(scaleBarContainerInner);
            let scaleDown = document.createElement('DIV');
            scaleDown.className = 'scalebar-scaledown';
            scaleDown.innerHTML = _icons.scaleDown;
            scaleBarContainerInner.appendChild(scaleDown);

            let scaleValue = document.createElement('DIV');
            scaleValue.className = 'scalebar-scalevalue';
            scaleValue.innerHTML =  (parseFloat(scale) * 100).toFixed(0) + '%';
            scaleBarContainerInner.appendChild(scaleValue);

            events.on('scale', function (e) {
                scaleValue.innerHTML =  (parseFloat(e.scale) * 100).toFixed(0) + '%';
            })

            let scaleUp = document.createElement('DIV');
            scaleUp.className = 'scalebar-scaleup';
            scaleUp.innerHTML = _icons.scaleUp;
            scaleBarContainerInner.appendChild(scaleUp);

            let fitInScreenBtn = document.createElement('DIV');
            fitInScreenBtn.className = 'scalebar-fit';
            fitInScreenBtn.innerHTML = _icons.fit;
            scaleBarContainerInner.appendChild(fitInScreenBtn);

            scaleUp.addEventListener('click', function (e) {
                scaleByButton('up');
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            })

            scaleDown.addEventListener('click', function (e) {
                scaleByButton('down');
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            })

            fitInScreenBtn.addEventListener('click', function (e) {
                fitInScreen();
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            })


            let scales = [400, 200, 100, 70, 50, 30];
            let scalesList = document.createElement('DIV');
            scalesList.className = 'whiteboard-scalebar-scalelist';
            let scalesListInner = document.createElement('UL');
            scalesListInner.className = 'whiteboard-scalebar-scalelist-ul';
            scalesList.appendChild(scalesListInner);

            for(let i in scales) {
                let item = document.createElement('LI');
                item.innerHTML = scales[i] + '%';
                scalesListInner.appendChild(item);
                item.addEventListener('click', function () {
                    scaleByButton(scales[i] / 100);
                    adjustWetInkCanvasSize();
                })
            }

            
            Q.activate(
                Q.Tool.setUpElement(
                    scaleValue,
                    "Media/webrtc/popupDialog",
                    {
                        content: scalesList,
                        className: 'whiteboard-scalebar-scalelist-popup',
                        triggerOn: 'click'
                    }
                ),
                {},
                function () {
                   
                }
            );

            function scaleByButton(action) {
                let canvasRect = canvasContainer.getBoundingClientRect();
                console.log('canvasRect', canvasRect)

                pointer.x = (canvasRect.width / 2) - canvasRect.x;
                pointer.y = (canvasRect.height / 2) - canvasRect.y;
                
                target.x = (pointer.x - translatePosition.x) / scale;
                target.y = (pointer.y - translatePosition.y) / scale;
                console.log('pointer', pointer.x, pointer.y)

                if(action == 'down') {
                    let newScale = scale + (-1 * +1 * scaleSpeed * scale);
                    setScale(newScale);
                } else if(action == 'up') {
                    let newScale = scale + (-1 * -1 * scaleSpeed * scale);
                    setScale(newScale);
                } else {
                    setScale(action);
                }

                adjustWetInkCanvasSize();
            }

            return scaleBarContainer;
        }

        /* function fitInScreen() {
            // Calculate the bounding box of all objects on the whiteboard
            let boundingBox = calculateBoundingBox();
            let containerRect = canvasContainer.getBoundingClientRect();
            console.log('boundingBox width', containerRect.width, boundingBox.width)
            console.log('boundingBox height', containerRect.height, boundingBox.height)
            console.log('boundingBox x', containerRect.x, boundingBox.x)
            console.log('boundingBox y', containerRect.y, boundingBox.y)
 
            // Calculate the scale needed to fit the bounding box within the canvas
            let scaleX = containerRect.width / boundingBox.width;
            let scaleY = containerRect.height / boundingBox.height;
            let fitScale = Math.min(scaleX, scaleY);
            let newScale = scale * fitScale;
            console.log('boundingBox fitScale', fitScale, scale)
            scale = newScale;
            

            const centerX = ((containerRect.width - boundingBox.width * scaleX) / 2);
            const centerY = ((containerRect.height - boundingBox.height * scaleY) / 2);
            console.log('centerY', centerY)

            const newTranslateX = centerX - (containerRect.x - boundingBox.x) / fitScale;
            const newTranslateY = centerY - (containerRect.y - boundingBox.y) / fitScale;
            
            translatePosition.x = (translatePosition.x - newTranslateX);
            translatePosition.y = (translatePosition.y - newTranslateY);
            console.log('translatePosition', translatePosition.x, translatePosition.y)
            transformComponent.style.transform = `translate(${translatePosition.x}px,${translatePosition.y}px) scale(${scale},${scale})`;

            events.dispatch('scale', { scale: scale })

            adjustWetInkCanvasSize();
        } */

        function fitInScreen() {
            // Calculate the bounding box of all objects on the whiteboard
            let boundingBox = calculateBoundingBox();
            let containerRect = canvasContainer.getBoundingClientRect();
            console.log('boundingBox width', containerRect.width, boundingBox.width)
            console.log('boundingBox height', containerRect.height, boundingBox.height)
            console.log('boundingBox x', containerRect.x, boundingBox.x)
            console.log('boundingBox y', containerRect.y, boundingBox.y)
 
            // Calculate the scale needed to fit the bounding box within the canvas
            let scaleX = containerRect.width / boundingBox.width;
            let scaleY = containerRect.height / boundingBox.height;
            let fitScale = Math.min(scaleX, scaleY);
            let newScale = scale * fitScale;
            console.log('boundingBox fitScale', fitScale, scale)
            scale = newScale;
            transformComponent.style.transform = `translate(${translatePosition.x}px,${translatePosition.y}px) scale(${scale},${scale})`;
            boundingBox = calculateBoundingBox();
            containerRect = canvasContainer.getBoundingClientRect();
            scaleX = containerRect.width / boundingBox.width;
            scaleY = containerRect.height / boundingBox.height;
            fitScale = Math.min(scaleX, scaleY);
            // Calculate the translation needed to center the bounding box

            const centerX = ((containerRect.width - boundingBox.width * scaleX) / 2);
            const centerY = ((containerRect.height - boundingBox.height * scaleY) / 2);
            console.log('centerY', centerY, centerX)

            const newTranslateX = centerX - (containerRect.x - boundingBox.x * fitScale) / fitScale;
            const newTranslateY = centerY - (containerRect.y - boundingBox.y * fitScale) / fitScale;
            console.log('newTranslateX', newTranslateX)

            translatePosition.x = (translatePosition.x - newTranslateX);
            translatePosition.y = (translatePosition.y - newTranslateY);
            console.log('translatePosition', translatePosition.x, translatePosition.y)
            transformComponent.style.transform = `translate(${translatePosition.x}px,${translatePosition.y}px) scale(${scale},${scale})`;

            events.dispatch('scale', { scale: scale })

            adjustWetInkCanvasSize();
        }

        function calculateBoundingBox() {
            // Assuming your whiteboard objects are stored in an array called 'whiteboardObjects'

            if (_canvasObjects.length === 0) {
                // No objects on the whiteboard
                return { x: 0, y: 0, width: 0, height: 0 };
            }

            // Initialize variables for the bounding box
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;

            // Iterate through all objects to find the bounding box
            _canvasObjects.forEach(obj => {
                if(obj.objectElement){
                    let rect = obj.svgGroupElement.getBoundingClientRect();
                    // Update min and max coordinates based on the object's position and size
                    minX = Math.min(minX, rect.x);
                    minY = Math.min(minY, rect.y);
                    maxX = Math.max(maxX, rect.x + rect.width);
                    maxY = Math.max(maxY, rect.y + rect.height);
                }
            });

            // Calculate the width and height of the bounding box
            const width = maxX - minX;
            const height = maxY - minY;

            // Return the bounding box as an object
            return { x: minX, y: minY, width, height };
        }

        function handleMouseDown(event) {
            console.log('handleMouseDown', event.target, event.currentTarget)
            if(event.target != canvasContainer && !canvasContainer.contains(event.target)) {
                return;
            }
            if (event && (event.which == 2 || event.button == 4 )) {
                _middleButtonPressed = true;
                let element = document.elementFromPoint(event.clientX, event.clientY);
                _objectToRemove = getObjectByElement(element);
                return;
            }

            if(isDragging) return; 
            if (event && (event.which == 3 || event.button == 2 )) {
                return;
            }
            if (!isDrawing) {
                /* let svgCanvasRect = transformComponent.getBoundingClientRect();
                // Calculate the adjusted starting point based on the current scale and translation
                const x = (event.clientX - translatePosition.x) / scale - svgCanvasRect.x;
                const y = (event.clientY - translatePosition.y) / scale - svgCanvasRect.y;
                drawOnCanvas(x, y);
                isDrawing = true; */
                let svgCanvasRect = transformComponent.getBoundingClientRect();
                drawOnCanvas(event.clientX + translatePosition.x - svgCanvasRect.x, event.clientY + translatePosition.y - svgCanvasRect.y);
                isDrawing = true;
            }
        }

        function getObjectByElement(element) {
            for(let i = _canvasObjects.length - 1; i >= 0; i--) {
                let object = _canvasObjects[i];
                if(!object.objectElement) continue;
                console.log('getObjectByElement for', object.objectElement)
                if(object.objectElement == element || object.objectElement.contains(element)) {
                    return object;
                }
            }
        }
    
        function drawOnCanvas(x, y) {
            console.log('drawOnCanvas START', translatePosition.x, translatePosition.y);
            /* 
                _currentPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                _currentPath.setAttribute('stroke', _color);
                _currentPath.setAttribute('stroke-width', _thickness);
                _currentPath.setAttribute('fill', 'none');
                // Calculate the adjusted starting point based on the current scale and translation
                const adjustedX = x;
                const adjustedY = y;
                _currentPath.setAttribute('d', `M${adjustedX},${adjustedY}`);
                svg.appendChild(_currentPath); */
            
             // Adjust coordinates based on the current scale and translation
            const adjustedX = x;
            const adjustedY = y;
        
            // Create a new path element and set its attributes
            _currentPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            _currentPath.setAttribute('stroke', _color);
            _currentPath.setAttribute('stroke-width', _thickness * scale);
            _currentPath.setAttribute('fill', 'none');
        
            _currentPath.setAttribute('d', `M${adjustedX},${adjustedY}`);
        
            // Add the path to the SVG canvas
            svg.appendChild(_currentPath);
        
            // Update the lastDraw object to keep track of the current position
            lastDraw = { x: adjustedX, y: adjustedY }; 
        }

        function handleMouseMove(event) {
            if(_middleButtonPressed) {
                let element = document.elementFromPoint(event.clientX, event.clientY);
                _objectToRemove = getObjectByElement(element);
                return;
            }
            if(isDragging) return;
            if (isDrawing && _currentPath) {
                if (_pathCommand == 'lineTo') {
                    let d = _currentPath.getAttribute('d');
                    const x = event.clientX - _wetInkCanvasEl.getBoundingClientRect().left;
                    const y = event.clientY - _wetInkCanvasEl.getBoundingClientRect().top;
                    _currentPath.setAttribute('d', d ? d + ` L${x},${y}` : `M${x},${y}`);
                } else if(_pathCommand == 'arcTo') {
                    let d = _currentPath.getAttribute('d');
                    const rx = 0;
                    const ry = 0;
                    const x = event.clientX - _wetInkCanvasEl.getBoundingClientRect().left;
                    const y = event.clientY - _wetInkCanvasEl.getBoundingClientRect().top;
                    const xAxisRotation = 0; // No rotation
                    const largeArcFlag = 0; // Smaller arc
                    const sweepFlag = 1; // Clockwise sweep

                    _currentPath.setAttribute('d', d ? d + ` A${rx},${ry} ${xAxisRotation} ${largeArcFlag},${sweepFlag} ${x},${y}` : `M${x},${y}`);
                }
            }
        }
    
        function handleMouseUp(e) {
            console.log('handleMouseUp', e)
            if (_middleButtonPressed) {

                console.log('handleMouseUp: _middleButtonPressed', e)
                if(_objectToRemove) {
                    console.log('handleMouseUp: _middleButtonPressed: _objectToRemove', _objectToRemove)
                    removeCanvasObject(_objectToRemove);
                }
                _middleButtonPressed = false;
                _objectToRemove = null;
                return;
            }

            if(isDragging) return;
            if (isDrawing && _currentPath) {
                //if (_pathCommand == 'lineTo') {
                    // Calculate the relative position of the path inside `_canvasContentEl`
                    let canvasContainerRect = transformComponent.getBoundingClientRect();

                    //const canvasContainerRect = canvasContainer.getBoundingClientRect();
                    const pathRect = _currentPath.getBoundingClientRect();
                    console.log('pathRect', pathRect)
                    const offsetX = pathRect.left - canvasContainerRect.left;
                    const offsetY = pathRect.top - canvasContainerRect.top;

                    // Calculate the path's d attribute and adjust x and y positions
                    const pathData = _currentPath.getAttribute('d');
                    const adjustedPathData = adjustPathData(pathData, offsetX, offsetY);
                    
                    // Calculate the adjusted position based on the current scale and translation
                    const adjustedOffsetX = (offsetX - translatePosition.x) / scale;
                    const adjustedOffsetY = (offsetY - translatePosition.y) / scale;

                    console.log('adjustedPathData', adjustedPathData)
                    //const simplifiedPathData = simplifySvgPath(adjustedPathData);
                    //console.log('simplifiedPathData', simplifiedPathData)

                    let canvasObject = new CanvasObject({
                        strokeColor: _color,
                        strokeWidth: _thickness,
                        fill: 'none',
                        pathData: adjustedPathData,
                        x: adjustedOffsetX,
                        y: adjustedOffsetY,
                        isLocal: true,
                        byUserId: Q.Users.loggedInUserId()
                    });

                    _canvasObjectsById[canvasObject.id] = canvasObject;
                    _canvasObjects.push(canvasObject);
                    putObjectOnCanvas(canvasObject);
                    // Remove the current path from `_wetInkCanvasEl`
                    _currentPath.remove();

                    _currentPath = null;
                    isDrawing = false;

                postCanvasObject(canvasObject.clone());
                //}
            }
        }

        function putObjectOnCanvas(object) {
            console.log('putObjectOnCanvas', object)
            if(object.objectElement) {
                _canvasContentEl.appendChild(object.objectElement);
                return;
            }

            if(object.x == 'NaN' || object.y == 'NaN') return;
            // Create a new DIV to hold the inkGroup SVG
            const canvasChild = document.createElement('div');
            canvasChild.className = 'child-canvas';
            canvasChild.dataset.id = object.id;
            canvasChild.style.position = 'absolute';
            canvasChild.style.left = object.x + 'px';
            canvasChild.style.top = object.y + 'px';

            // Create the inkGroup SVG
            const inkGroup = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            inkGroup.className = 'ink-group';
            const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            // Create the path with the adjusted d attribute
            const adjustedPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            adjustedPath.setAttribute('stroke', object.strokeColor);
            adjustedPath.setAttribute('stroke-width', object.strokeWidth);
            adjustedPath.setAttribute('fill', object.fill);
            adjustedPath.setAttribute('d', object.pathData);
            group.appendChild(adjustedPath);
            inkGroup.appendChild(group);

            // Append inkGroup to canvasChild
            canvasChild.appendChild(inkGroup);
            object.objectElement = canvasChild;
            object.svgGroupElement = group;
            // Insert canvasChild before `_wetInkCanvasEl`
            _canvasContentEl.appendChild(canvasChild);
        }

        function adjustPathData(pathData, offsetX, offsetY) {
            const pathCommands = pathData.match(/[A-Za-z][0-9.,\s-]*/g);
        
            if (!pathCommands) {
                return pathData;
            }
        
            let adjustedPathData = '';
            let x = 0;
            let y = 0;
        
            for (let i = 0; i < pathCommands.length; i++) {
                const command = pathCommands[i];
                const code = command[0];
                const values = command.trim().slice(1).split(/,|\s/).map(parseFloat);
                //console.log('values', values)
                if (code === 'M' || code === 'L') {
                    // Adjust x and y coordinates for M and L commands
                    const adjustedX = (values[0] - offsetX) / scale;
                    const adjustedY = (values[1] - offsetY) / scale;

                    // For subsequent commands, adjust relative to the previous point
                    adjustedPathData += `${code}${adjustedX},${adjustedY} `;
                    x = adjustedX;
                    y = adjustedY;
                    
                } else if (code === 'A') {
                    // Adjust x and y coordinates for M and L commands
                    const adjustedX = (values[5] - offsetX) / scale;
                    const adjustedY = (values[6] - offsetY) / scale;

                    // For subsequent commands, adjust relative to the previous point
                    adjustedPathData += `${code}${values[0]},${values[1]} ${values[2]} ${values[3]},${values[4]} ${adjustedX},${adjustedY} `;

                    x = adjustedX;
                    y = adjustedY;
                } else {
                    // Pass through other commands as-is
                    adjustedPathData += `${command} `;
                }
            }
        
            return adjustedPathData;
        }

        function simplifySvgPath(svgPathData, decimalPlaces) {
            // Split the path data into individual commands
            const commands = svgPathData.split(/[A-Za-z]/).filter(Boolean);
        
            // Function to round a number to a specific number of decimal places
            const round = (num, places) => Number(Number(num).toFixed(places));
        
            // Function to simplify coordinates in a command
            const simplifyCoordinates = (coordinates) => coordinates.map(coord => round(coord, decimalPlaces));
        
            // Process each command and simplify coordinates
            const simplifiedCommands = commands.map((command, index) => {
                // If the command is a moveto command (M) and not the first command
                if (index !== 0 && command[0] === 'M') {
                    // Skip the moveto command (to avoid duplication)
                    return '';
                }
        
                // If the command is a line-to command (L)
                if (command[0] === 'L') {
                    // Split command into parameters (coordinates)
                    const parameters = command.trim().split(/[ ,]+/).filter(Boolean);
        
                    // Process and simplify coordinates
                    const simplifiedParameters = simplifyCoordinates(parameters);
        
                    // Join the simplified parameters back into a string
                    return command[0] + simplifiedParameters.join(' ');
                } else {
                    // Return other commands as is (not modifying other commands)
                    return command;
                }
            });
        
            // Join the simplified commands back into a path string
            const simplifiedPathData = simplifiedCommands.join('');
        
            return simplifiedPathData;
        }

        function postCanvasObject(object) {
            console.log('postCanvasObject', object);
            return new Promise(function (resolve, reject) {
                Q.req("Media/whiteboard", ['draw'], function (err, response) {
                    var msg = Q.firstErrorMessage(err, response && response.errors);

                    if (msg) {
                        reject(msg);
                        console.error(msg)
                        return;
                    }

                    resolve(response.slots.getRoomParticipants)
                }, {
                    method: 'put',
                    fields: {
                        publisherId: stream.fields.publisherId,
                        streamName: stream.fields.name,
                        canvasObject: object,
                    }
                });
            });
        }

        function removeCanvasObjectLocally(object) {
            if(object.objectElement && object.objectElement.parentElement) {
                object.objectElement.parentElement.removeChild(object.objectElement);
            }

            delete _canvasObjectsById[object.id];

            for(let i = _canvasObjects.length - 1; i >= 0; i--) {
                if(_canvasObjects[i] == object) {
                    _canvasObjects.splice(i, 1)
                    break;
                }
            }
            
        }

        function removeCanvasObject(object) {
            console.log('removeCanvasObject', object)
            removeCanvasObjectLocally(object);

            return new Promise(function (resolve, reject) {
                Q.req("Media/whiteboard", ['remove'], function (err, response) {
                    var msg = Q.firstErrorMessage(err, response && response.errors);

                    if (msg) {
                        reject(msg);
                        console.error(msg)
                        return;
                    }

                    resolve(response.slots.getRoomParticipants)
                }, {
                    method: 'put',
                    fields: {
                        publisherId: stream.fields.publisherId,
                        streamName: stream.fields.name,
                        canvasObject: object.clone(),
                    }
                });
            });
        }

        function parseMessage(message) {
            let instructions = JSON.parse(message.instructions);
            let canvasObject = new CanvasObject({
                id: instructions.id,
                strokeColor: instructions.strokeColor,
                strokeWidth: instructions.strokeWidth,
                fill: instructions.fill,
                pathData: instructions.pathData,
                x: instructions.x,
                y: instructions.y,
                isLocal: message.byUserId == Q.Users.loggedInUserId(),
                byUserId: message.byUserId
            });

            return canvasObject;
        }

        function removeAllObjects() {
            for(let i = _canvasObjects.length - 1; i >= 0; i--) {
                removeCanvasObject(_canvasObjects[i]);
            }
        }
        window.removeAllObjects = removeAllObjects;

        function loadCanvasState(messages) {
            let canvasObjectsById = {};
            let canvasObjects = [];
            for(let i in messages) {
                let message = messages[i];
                let instructions = JSON.parse(message.fields.instructions);
                if(message.fields.type == 'Media/whiteboard/draw') {
                    let canvasObject = parseMessage(message.fields);
                    
                    if(isNaN(canvasObject.x) || isNaN(canvasObject.y)) continue;

                    if(canvasObjectsById[canvasObject.id] != 'removed') {
                        canvasObjectsById[canvasObject.id] = canvasObject;
                    } else if(canvasObjectsById[canvasObject.id] == 'removed') {
                        canvasObject.removed = true;
                        canvasObjectsById[canvasObject.id] = canvasObject
                    }
                    canvasObjects.push(canvasObject);
                    
                } else if(message.fields.type == 'Media/whiteboard/remove') {
                    if(canvasObjectsById[instructions.id]) {
                        canvasObjectsById[instructions.id].removed = true;
                    } else {
                        canvasObjectsById[instructions.id] = 'removed';
                    }
                }
                
            }

            for(let i = canvasObjects.length - 1; i >= 0; i--) {
                if(canvasObjects[i].removed) {
                    continue;
                }
                if(_canvasObjectsById[canvasObjects[i].id] && (_canvasObjectsById[canvasObjects[i].id] == 'removed' || _canvasObjectsById[canvasObjects[i].id].removed)) {
                    delete _canvasObjectsById[canvasObjects[i].id];
                    continue;
                } else if(_canvasObjectsById[canvasObjects[i].id]) {
                    continue;
                }
                
                _canvasObjectsById[canvasObjects[i].id] = canvasObjects[i]; 
                _canvasObjects.splice(0, 0, canvasObjects[i])   
            }

            for(let i in _canvasObjects) {
                console.log('pathData', _canvasObjects[i].pathData)
                putObjectOnCanvas(_canvasObjects[i]);
            }
        }

        function getCanvasState() {
            return new Promise(function (resolve, reject) {
                Q.req("Media/whiteboard", ["state"], function (err, response) {
                    var msg = Q.firstErrorMessage(err, response && response.errors);

                    if (msg) {
                        console.error(msg);
                        reject(msg)
                        return;
                    }

                    resolve(response.slots.state);
                }, {
                    method: 'get',
                    fields: {
                        publisherId: stream.fields.publisherId,
                        streamName: stream.fields.name,
                    }
                });
            });
        }

        function joinStream() {
            return new Promise(function (resolve, reject) {
                Q.req("Media/whiteboard", ['join'], function (err, response) {
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
                        publisherId: stream.fields.publisherId,
                        streamName: stream.fields.name
                    }
                });
            });
        }
        
        function setThickness(thickness) {
            _thickness = thickness;
            if (_currentPath) {
                _currentPath.setAttribute('stroke-width', _thickness);
            }
        }

        function setColor(color) {
            _color = color;
            if (_currentPath) {
                _currentPath.setAttribute('stroke', _color);
            }
        }

        function setSize(w, h) {
            _wetInkCanvasWidth = w, _wetInkCanvasHeight = h;

            const canvasWidth = _wetInkCanvasWidth / scale;
            const canvasHeight = _wetInkCanvasHeight / scale;
            _wetInkCanvasEl.style.width = `${canvasWidth}px`;
            _wetInkCanvasEl.style.height = `${canvasHeight}px`;

            // Update the viewBox attribute to maintain the same visible area
            let contRect = container.getBoundingClientRect();
            _wetInkCanvasEl.setAttribute('viewBox', `0 0 ${contRect.width} ${contRect.height}`);

            /* _wetInkCanvasEl.style.width = `${_wetInkCanvasWidth}px`;
            _wetInkCanvasEl.style.height = `${_wetInkCanvasHeight}px`;
            _wetInkCanvasEl.setAttribute('viewBox', `0 0 ${_wetInkCanvasWidth} ${_wetInkCanvasHeight}`); */
            console.log('setSize', w, h)
        };

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

    }

    /* stream.post({
            type: 'Media/draw/path',
            instructions: JSON.stringify({
                drawingData: drawingData,
                thickness: _thickness,
                color: _color
            }),
        }, function() {}); */

        /* stream.onMessage("Media/draw/path").set(function (message) {
            var instructions = JSON.parse(message.instructions);
            if(!instructions.drawingData) {
                console.warn('Whiteboard: no drawingData found in message');
                return;
            }
            const receivedPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            receivedPath.setAttribute('stroke', instructions.color);
            receivedPath.setAttribute('stroke-width', instructions.thickness);
            receivedPath.setAttribute('fill', 'none');
            receivedPath.setAttribute('d', instructions.drawingData);
            svg.appendChild(receivedPath);
        }); */


    Q.Tool.define("Media/whiteboard", function (options) {
        var tool = this;
        tool.init();  
    },

        {
            publisherId: null,
            streamName: null,
            onRefresh: new Q.Event()
        },

        {
            init: function () {
                var tool = this;
                console.log('Games/quickdraw: INIT');
                tool.loadStyles().then(function () {
                    tool.getStream().then(function (stream) {
                        tool.stream = stream;
                        tool.whiteboard = new Whiteboard(tool.element, stream);
                    })
                }).catch(function (err) {
                    Q.alert(err)
                });
            },
            loadStyles: function () {
                return new Promise(function (resolve, reject) {
                    Q.addStylesheet('{{Media}}/css/tools/whiteboard.css', function () {
                        resolve();
                    });
                });
            },
            getStream: function () {
                console.log('getStream');
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.Streams.get(tool.state.publisherId, tool.state.streamName, function (err, stream) {
                        if(!stream) {
                            console.error(err);
                            reject(err);
                            return;
                        }
            
                        resolve(stream);
                    });
                });
            }
        }

    );

})(window.jQuery, window);