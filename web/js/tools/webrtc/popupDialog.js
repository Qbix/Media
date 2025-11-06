(function ($, window, undefined) {

    function PopupDialog(element, options) {
        var pupupInstance = this;
        this.element = element;
        this.content = options.content;
        this.arrowEl = null;
        this.closeButtonEl = null;
        this.popupDialogEl = null;
        this.hoverTimeout = null;
        this.active = false;
    
        let arrowSideSize = !options.showArrow ? 0 : 20;
        
        var _isTouchScreen = isTouchDevice();
    
        this.hide = function (e) {
            if (!e || (e && (e.target == this.closeButtonEl || !pupupInstance.popupDialogEl.contains(e.target)))) {
                if (pupupInstance.popupDialogEl.parentElement) pupupInstance.popupDialogEl.parentElement.removeChild(pupupInstance.popupDialogEl);
    
                togglePopupClassName('', false, false);
                pupupInstance.active = false;
                pupupInstance.popupDialogEl.style.height = '';
                //pupupInstance.popupDialogEl.style.overflowY = '';
    
                if (!_isTouchScreen) {
                    window.removeEventListener('click', pupupInstance.hide);
                } else {
                    window.removeEventListener('touchend', pupupInstance.hide);
                }
            }
        }
    
        this.show = function (e, elementToShowBy) {
            if(options.position == 'byPointer') {
                this.showByPointer(e);
            } else {
                this.showByElement(elementToShowBy);
            }
        }
    
        this.showByPointer = function (e) {
            pupupInstance.popupDialogEl.style.top = '';
            pupupInstance.popupDialogEl.style.left = '';
            pupupInstance.popupDialogEl.style.maxHeight = '';
            pupupInstance.popupDialogEl.style.maxWidth = '';
            togglePopupClassName('', false, false);
            let existingPopupDialog = document.querySelector('.webrtc-popup-dialog');
            if (existingPopupDialog && existingPopupDialog.parentElement) existingPopupDialog.parentElement.removeChild(existingPopupDialog);
    
            let triggeringElementRect = pupupInstance.element.getBoundingClientRect();
            let pointerX = e.clientX;
            let pointerY = e.clientY;
    
            pupupInstance.popupDialogEl.style.position = 'fixed';
            pupupInstance.popupDialogEl.style.visibility = 'hidden';
            pupupInstance.popupDialogEl.style.top = pointerY + arrowSideSize + 'px';
            pupupInstance.popupDialogEl.style.left = pointerX + 'px';
    
            if (pupupInstance.content instanceof Array) {
                for (let i in pupupInstance.content) {
                    pupupInstance.popupDialogBodyEl.appendChild(pupupInstance.content[i])
                }
            } else {
                pupupInstance.popupDialogBodyEl.appendChild(pupupInstance.content)
            }
    
            if(options.parent){
                options.parent.appendChild(pupupInstance.popupDialogEl);
            } else {
                document.body.appendChild(pupupInstance.popupDialogEl);
            }
    
            let popupRect = pupupInstance.popupDialogEl.getBoundingClientRect();
            //pupupInstance.popupDialogEl.style.left = ((triggeringElementRect.x + (triggeringElementRect.width / 2)) - (popupRect.width / 2)) + 'px';
    
            //if ther is no room below (bottom) of button, show dialog above if there is enough room
    
            let roomBelowButton = window.innerHeight - pointerY;
            let roomAboveButton = pointerY;
            let roomToLeftOfButton = pointerX;
            let roomToRightOfButton = (window.innerWidth - pointerX);
            
            function positionArrow(popupPositionLeft, popupPositionTop) {
                if (!options.showArrow) {
                    return;
                }
                //this function is not tested
                pupupInstance.arrowEl.style.top = '';
                pupupInstance.arrowEl.style.left = '';
                pupupInstance.arrowEl.style.right = '';
                pupupInstance.arrowEl.style.bottom = '';
                if(popupPositionTop >= pointerY) {
                    let arrowWidth = 40, arrowHeight = 20;
                    let arrowLeft = (pointerX - popupPositionLeft) - (arrowWidth / 2);
                    pupupInstance.arrowEl.style.top = 0;
                    pupupInstance.arrowEl.style.left = arrowLeft + 'px';
                } else if (popupPositionTop + popupRect.height <= pointerY) {
                    let arrowWidth = 40, arrowHeight = 20;
                    let arrowLeft = (pointerX - popupPositionLeft) - (arrowWidth / 2);
                    pupupInstance.arrowEl.style.bottom = 0;
                    pupupInstance.arrowEl.style.left = arrowLeft + 'px';
                } else if (popupPositionLeft >= pointerX) {
                    let arrowWidth = 20, arrowHeight = 40;
                    let arrowTop = (pointerY - popupPositionTop) - (arrowHeight / 2);
                    pupupInstance.arrowEl.style.top = arrowTop + 'px';
                    pupupInstance.arrowEl.style.left = 0;
                } else if (popupPositionLeft + popupRect.width <= pointerX) {
                    let arrowWidth = 20, arrowHeight = 40;
                    let arrowTop = (pointerY - popupPositionTop) - (arrowHeight / 2);
                    pupupInstance.arrowEl.style.top = arrowTop + 'px';
                    pupupInstance.arrowEl.style.right = 0;
                }
            }
    
            let mainYOrder = [
                {
                    positionName: 'above',
                    condition: roomAboveButton >= popupRect.height + arrowSideSize,
                    func: showPopupAbovePointer
                },
                {
                    positionName: 'below',
                    condition: roomBelowButton >= popupRect.height + arrowSideSize,
                    func: showPopupBelowPointer
                },
                {
                    positionName: 'middle',
                    condition: Math.min(roomBelowButton, roomAboveButton) >= popupRect.height / 2,
                    func: showPopupInTheMiddle
                }
            ];
    
            let restYPositions = [
                {
                    positionName: 'midWindow',
                    condition: popupRect.height + arrowSideSize < window.innerHeight,
                    func: showPopupMidWindow
                },
                {
                    positionName: 'fullHeight',
                    condition: null,
                    func: showPopupFullHeight
                }
            ];
    
            let ySortArray = ['below', 'middle', 'above'];
            if (options.yPositionsOrder && options.yPositionsOrder.length > 0) {
                ySortArray = options.yPositionsOrder;
            }
    
            mainYOrder.sort((a, b) => {
                const indexA = ySortArray.indexOf(a.positionName);
                const indexB = ySortArray.indexOf(b.positionName);
                return indexA - indexB;
            });
    
            let yPositionsOrder = mainYOrder.concat(restYPositions);
            for (let i = 0; i < yPositionsOrder.length; i++) {
                let position = yPositionsOrder[i];
                if (i !== yPositionsOrder.length - 1) {
                    if (position.condition === true) {
                        if (position.func) {
                            position.func();
                        }
                        break;
                    }
                } else {
                    if (position.func) {
                        position.func();
                    }
                }
            }
    
    
            pupupInstance.popupDialogEl.style.visibility = '';
    
            pupupInstance.active = true;
    
            setTimeout(function () {
                if (!_isTouchScreen) {
                    window.addEventListener('click', pupupInstance.hide);
                } else {
                    window.addEventListener('touchend', pupupInstance.hide);
                }
            }, 0);
    
            function showPopupBelowPointer() {
                let mainOrder = [
                    {
                        positionName: 'middle',
                        condition: roomToLeftOfButton >= (popupRect.width / 2) && roomToRightOfButton >= (popupRect.width / 2),
                        func: function () {
                            let popupLeft = (pointerX - (popupRect.width / 2));
                            let popupTop = pointerY + arrowSideSize;
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-mid-below-position', false, false);
                        }
                    },
                    {
                        positionName: 'right',
                        condition: roomToRightOfButton >= popupRect.width,
                        func: function () {
                            let popupLeft = pointerX;
                            let popupTop = pointerY + arrowSideSize;
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-right-below-position', false, false);
                        }
                    },
                    {
                        positionName: 'left',
                        condition: roomToLeftOfButton >= popupRect.width,
                        func: function () {
                            let popupLeft = pointerX - popupRect.width;
                            let popupTop = pointerY + arrowSideSize;
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-left-below-position', false, false);
                        }
                    }
                ];
    
                let restPositions = [
                    {
                        positionName: 'winmidBelow', //if there is space below pointer but content cannot me centralized relatively to pointer
                        condition: popupRect.width <= window.innerWidth,
                        func: function () {
                            let popupLeft = pointerX - roomToLeftOfButton;
                            let popupTop = pointerY + arrowSideSize;
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-winmid-below-position', false, false);
                        }
                    },
                    {
                        positionName: 'fullwidthBelow', //if there is space below pointer but too little width to fit content entirely
                        condition: null,
                        func: function () {
                            let popupLeft = 0;
                            let popupTop = pointerY + arrowSideSize;
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-fullwidth-below-position', true, false);
                        }
                    }
                ];
    
                let sortArray = ['middle', 'right', 'left'];
                if (options.xPositionsOrder && options.xPositionsOrder.length > 0) {
                    sortArray = options.xPositionsOrder;
                }
    
                mainOrder.sort((a, b) => {
                    const indexA = sortArray.indexOf(a.positionName);
                    const indexB = sortArray.indexOf(b.positionName);
                    return indexA - indexB;
                });
    
                let xPositionsOrder = mainOrder.concat(restPositions);
                for (let i = 0; i < xPositionsOrder.length; i++) {
                    let position = xPositionsOrder[i];
                    if (i !== xPositionsOrder.length - 1) {
                        if (position.condition === true) {
                            if (position.func) {
                                position.func();
                            }
                            break;
                        }
                    } else {
                        if (position.func) {
                            position.func();
                        }
                    }
                }
            }
    
            function showPopupAbovePointer() {
                let mainOrder = [
                    {
                        positionName: 'middle',
                        condition: roomToLeftOfButton >= (popupRect.width / 2) && roomToRightOfButton >= (popupRect.width / 2),
                        func: function () {
                            let popupLeft = (pointerX - (popupRect.width / 2));
                            let popupTop = (pointerY - popupRect.height - arrowSideSize);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-mid-above-position', false, false);
                        }
                    },
                    {
                        positionName: 'right',
                        condition: roomToRightOfButton >= popupRect.width,
                        func: function () {
                            let popupLeft = (pointerX);
                            let popupTop = (pointerY - popupRect.height - arrowSideSize);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-right-above-position', false, false);
                        }
                    },
                    {
                        positionName: 'left',
                        condition: roomToLeftOfButton >= popupRect.width,
                        func: function () {
                            let popupLeft = (pointerX - popupRect.width);
                            let popupTop = (pointerY - popupRect.height - arrowSideSize);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-left-above-position', false, false);
                        }
                    }
                ];
    
                let restPositions = [
                    {
                        positionName: 'winmidAbove', //if there is space above pointer but content cannot me centralized relatively to pointer
                        condition: window.innerWidth >= popupRect.width,
                        func: function () {
                            let popupLeft = pointerX - roomToLeftOfButton;
                            let popupTop = (pointerY - popupRect.height - arrowSideSize);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-winmid-above-position', false, false);
                        }
                    },
                    {
                        positionName: 'fullwidthAbove', //if there is space above pointer but too little width to fit content entirely
                        condition: null,
                        func: function () {
                            let popupLeft = 0;
                            let popupTop = (pointerY - popupRect.height - arrowSideSize);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-fullwidth-above-position', true, false);
                        }
                    }
                ];
    
                let sortArray = ['middle', 'right', 'left'];
                if(options.xPositionsOrder && options.xPositionsOrder.length > 0) {
                    sortArray = options.xPositionsOrder;
                }
    
                mainOrder.sort((a, b) => {
                    const indexA = sortArray.indexOf(a.positionName);
                    const indexB = sortArray.indexOf(b.positionName);
                    return indexA - indexB;
                });
    
                let xPositionsOrder = mainOrder.concat(restPositions);
                for(let i = 0; i < xPositionsOrder.length; i++) {
                    let position = xPositionsOrder[i];
                    if(i !== xPositionsOrder.length - 1) {
                        if(position.condition === true) {
                            if(position.func) {
                                position.func();
                            }
                            break;
                        }
                    } else {
                        if(position.func) {
                            position.func();
                        }
                    }
                }
                
            }
    
            function showPopupInTheMiddle() {
    
                let mainOrder = [
                    {
                        positionName: 'right',
                        condition: roomToRightOfButton >= popupRect.width + arrowSideSize,
                        func: function () {
                            let popupLeft = (pointerX + arrowSideSize);
                            let popupTop = pointerY - (popupRect.height / 2);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-right-mid-position', false, false);
                        }
                    },
                    {
                        positionName: 'left',
                        condition: roomToLeftOfButton >= popupRect.width + arrowSideSize,
                        func: function () {
                            let popupLeft = (pointerX - popupRect.width - arrowSideSize);
                            let popupTop = pointerY - (popupRect.height / 2);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-left-mid-position', false, false);
                        }
                    }
                ];
    
                let restPositions = [
                    {
                        positionName: 'fullwidthMid', //if there is space above pointer but content cannot me centralized relatively to pointer
                        condition: null,
                        func: function () {
                            let popupLeft = 0;
                            let popupTop = pointerY - (popupRect.height / 2);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = '0px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-fullwidth-mid-position', true, false);
                        }
                    }
                ];
    
                let sortArray = ['middle', 'right', 'left'];
                if(options.xPositionsOrder && options.xPositionsOrder.length > 0) {
                    sortArray = options.xPositionsOrder;
                }
    
                mainOrder.sort((a, b) => {
                    const indexA = sortArray.indexOf(a.positionName);
                    const indexB = sortArray.indexOf(b.positionName);
                    return indexA - indexB;
                });
    
                let xPositionsOrder = mainOrder.concat(restPositions);
                for(let i = 0; i < xPositionsOrder.length; i++) {
                    let position = xPositionsOrder[i];
                    if(i !== xPositionsOrder.length - 1) {
                        if(position.condition === true) {
                            if(position.func) {
                                position.func();
                            }
                            break;
                        }
                    } else {
                        if(position.func) {
                            position.func();
                        }
                    }
                }
            }
    
            function showPopupMidWindow() {
                let mainOrder = [
                    {
                        positionName: 'right',
                        condition: roomToRightOfButton >= popupRect.width + arrowSideSize,
                        func: function () {
                            let popupLeft = (pointerX + arrowSideSize);
                            let popupTop = (window.innerHeight / 2) - (popupRect.height / 2);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-right-winmid-position', false, false);
    
                        }
                    },
                    {
                        positionName: 'left',
                        condition: roomToLeftOfButton >= popupRect.width + arrowSideSize,
                        func: function () {
                            let popupLeft = (pointerX - arrowSideSize - popupRect.width);
                            let popupTop = (window.innerHeight / 2) - (popupRect.height / 2);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-left-winmid-position', false, false);
                        }
                    }
                ];
    
                let restPositions = [
                    {
                        positionName: 'winMidWinMid',
                        condition: popupRect.width <= window.innerWidth,
                        func: function () {    
                            pupupInstance.popupDialogEl.style.top = (window.innerHeight / 2) - (popupRect.height / 2) + 'px';
                            pupupInstance.popupDialogEl.style.left = (pointerX - roomToLeftOfButton) + 'px';
                            togglePopupClassName('webrtc-popup-dialog-winmid-winmid-position', false, false);
                        }
                    },
                    {
                        positionName: 'fullwidthWinmid',
                        condition: null,
                        func: function () {
                            //log('show 6.4');
    
                            pupupInstance.popupDialogEl.style.top = (window.innerHeight / 2) - (popupRect.height / 2) + 'px';
                            pupupInstance.popupDialogEl.style.left = '0px';
                            togglePopupClassName('webrtc-popup-dialog-fullwidth-winmid-position', true, false);
                        }
                    }
                ];
    
                let sortArray = ['middle', 'right', 'left'];
                if(options.xPositionsOrder && options.xPositionsOrder.length > 0) {
                    sortArray = options.xPositionsOrder;
                }
    
                mainOrder.sort((a, b) => {
                    const indexA = sortArray.indexOf(a.positionName);
                    const indexB = sortArray.indexOf(b.positionName);
                    return indexA - indexB;
                });
    
                let xPositionsOrder = mainOrder.concat(restPositions);
                for(let i = 0; i < xPositionsOrder.length; i++) {
                    let position = xPositionsOrder[i];
                    if(i !== xPositionsOrder.length - 1) {
                        if(position.condition === true) {
                            if(position.func) {
                                position.func();
                            }
                            break;
                        }
                    } else {
                        if(position.func) {
                            position.func();
                        }
                    }
                }
            }
    
            function showPopupFullHeight() {
                let mainOrder = [
                    {
                        positionName: 'right',
                        condition: roomToRightOfButton >= popupRect.width + arrowSideSize,
                        func: function () {
                            //log('show 7.1');
                            let popupLeft = (pointerX + arrowSideSize);
                            let popupTop = 0;
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-right-fullheight-position', false, false);
                        }
                    },
                    {
                        positionName: 'left',
                        condition: roomToLeftOfButton >= popupRect.width + arrowSideSize,
                        func: function () {
                            //log('show 7.2');
                            let popupLeft = (pointerX - arrowSideSize - popupRect.width);
                            let popupTop = 0;
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-left-fullheight-position', false, false);
                        }
                    }
                ];
    
                let restPositions = [
                    {
                        positionName: 'winMidFullHeight',
                        condition: popupRect.width <= window.innerWidth,
                        func: function () {
                            //log('show 7.3');
    
                            pupupInstance.popupDialogEl.style.top = (window.innerHeight / 2) - (popupRect.height / 2) + 'px';
                            pupupInstance.popupDialogEl.style.left = (window.innerWidth / 2) - (popupRect.width / 2) + 'px';
                            togglePopupClassName('webrtc-popup-dialog-winmid-fullheight-position', false, true);
                        }
                    },
                    {
                        positionName: 'fullHeightFullHeight',
                        condition: null,
                        func: function () {
                            //log('show 7.4');
                            pupupInstance.popupDialogEl.style.top = '0px';
                            pupupInstance.popupDialogEl.style.left = '0px';
                            togglePopupClassName('webrtc-popup-dialog-fullwidth-fullheight-position', true, true);
                        }
                    }
                ];
    
                let sortArray = ['middle', 'right', 'left'];
                if(options.xPositionsOrder && options.xPositionsOrder.length > 0) {
                    sortArray = options.xPositionsOrder;
                }
    
                mainOrder.sort((a, b) => {
                    const indexA = sortArray.indexOf(a.positionName);
                    const indexB = sortArray.indexOf(b.positionName);
                    return indexA - indexB;
                });
    
                let xPositionsOrder = mainOrder.concat(restPositions);
                for(let i = 0; i < xPositionsOrder.length; i++) {
                    let position = xPositionsOrder[i];
                    if(i !== xPositionsOrder.length - 1) {
                        if(position.condition === true) {
                            if(position.func) {
                                position.func();
                            }
                            break;
                        }
                    } else {
                        if(position.func) {
                            position.func();
                        }
                    }
                }
            }
        }
    
        this.showByElement = function (elementToShowBy) {
            pupupInstance.popupDialogEl.style.top = '';
            pupupInstance.popupDialogEl.style.left = '';
            pupupInstance.popupDialogEl.style.maxHeight = '';
            pupupInstance.popupDialogEl.style.maxWidth = '';
            togglePopupClassName('', false, false);
            let existingPopupDialog = document.querySelector('.webrtc-popup-dialog');
            if (existingPopupDialog && existingPopupDialog.parentElement) existingPopupDialog.parentElement.removeChild(existingPopupDialog);
    
            let triggeringElementRect = elementToShowBy ? elementToShowBy.getBoundingClientRect() : pupupInstance.element.getBoundingClientRect();
    
            pupupInstance.popupDialogEl.style.position = 'fixed';
            pupupInstance.popupDialogEl.style.visibility = 'hidden';
            pupupInstance.popupDialogEl.style.top = triggeringElementRect.y + triggeringElementRect.height + arrowSideSize + 'px';
            pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x + (triggeringElementRect.width / 2)) + 'px';
    
            if (pupupInstance.content instanceof Array) {
                for (let i in pupupInstance.content) {
                    pupupInstance.popupDialogBodyEl.appendChild(pupupInstance.content[i])
                }
            } else {
                pupupInstance.popupDialogBodyEl.appendChild(pupupInstance.content)
            }
    
            if(options.parent){
                options.parent.appendChild(pupupInstance.popupDialogEl);
            } else {
                document.body.appendChild(pupupInstance.popupDialogEl);
            }
    
            let popupRect = pupupInstance.popupDialogEl.getBoundingClientRect();
            pupupInstance.popupDialogEl.style.left = ((triggeringElementRect.x + (triggeringElementRect.width / 2)) - (popupRect.width / 2)) + 'px';
    
            //if ther is no room below (bottom) of button, show dialog above if there is enough room
            let roomBelowButton = window.innerHeight - (triggeringElementRect.y + triggeringElementRect.height);
            let roomBelowStartOfButton = window.innerHeight - triggeringElementRect.y;
            let roomBelowMidOfButton = window.innerHeight - (triggeringElementRect.y + (triggeringElementRect.height / 2));
            let roomAboveButton = triggeringElementRect.y;
            let roomAboveEndOfButton = triggeringElementRect.y + triggeringElementRect.height;
            let roomAboveMidOfButton = triggeringElementRect.y + (triggeringElementRect.height / 2);
            let roomToLeftOfButton = triggeringElementRect.x;
            let roomToRightOfStartOfButton = (window.innerWidth - triggeringElementRect.x);
            let roomToLeftOfMidButton = triggeringElementRect.x + (triggeringElementRect.width / 2);
            let roomToRightOfButton = (window.innerWidth - (triggeringElementRect.x + triggeringElementRect.width));
            let roomToRightOfMidButton = (window.innerWidth - (triggeringElementRect.x + (triggeringElementRect.width / 2)));
            let roomToLeftOfEndOfButton = triggeringElementRect.x + triggeringElementRect.width;
            let midYOfTriggeringElement = triggeringElementRect.y + triggeringElementRect.height / 2;
            let midXOfTriggeringElement = triggeringElementRect.x + triggeringElementRect.width / 2;
            
            function positionArrow(popupPositionLeft, popupPositionTop) {
                if (!options.showArrow) {
                    return;
                }
                pupupInstance.arrowEl.style.top = '';
                pupupInstance.arrowEl.style.left = '';
                pupupInstance.arrowEl.style.right = '';
                pupupInstance.arrowEl.style.bottom = '';
                if(popupPositionTop >= triggeringElementRect.bottom) {
                    let arrowWidth = 40, arrowHeight = 20;
                    let arrowLeft = (midXOfTriggeringElement - popupPositionLeft) - (arrowWidth / 2);
                    pupupInstance.arrowEl.style.top = 0;
                    pupupInstance.arrowEl.style.left = arrowLeft + 'px';
                } else if (popupPositionTop + popupRect.height <= triggeringElementRect.top) {
                    let arrowWidth = 40, arrowHeight = 20;
                    let arrowLeft = (midXOfTriggeringElement - popupPositionLeft) - (arrowWidth / 2);
                    pupupInstance.arrowEl.style.bottom = 0;
                    pupupInstance.arrowEl.style.left = arrowLeft + 'px';
                } else if (popupPositionLeft >= triggeringElementRect.right) {
                    let arrowWidth = 20, arrowHeight = 40;
                    let arrowTop = (midYOfTriggeringElement - popupPositionTop) - (arrowHeight / 2);
                    pupupInstance.arrowEl.style.top = arrowTop + 'px';
                    pupupInstance.arrowEl.style.left = 0;
                } else if (popupPositionLeft + popupRect.width <= triggeringElementRect.left) {
                    let arrowWidth = 20, arrowHeight = 40;
                    let arrowTop = (midYOfTriggeringElement - popupPositionTop) - (arrowHeight / 2);
                    pupupInstance.arrowEl.style.top = arrowTop + 'px';
                    pupupInstance.arrowEl.style.right = 0;
                }
            }
    
            let mainYOrder = [
                {
                    positionName: 'below',
                    condition: roomBelowButton >= popupRect.height + arrowSideSize,
                    func: showPopupBelowButton
                },
                {
                    positionName: 'above',
                    condition: roomAboveButton >= popupRect.height + arrowSideSize,
                    func: showPopupAboveButton
                },
                {
                    positionName: 'middle',
                    condition: Math.min(roomBelowMidOfButton, roomAboveMidOfButton) >= popupRect.height / 2,
                    func: showPopupInTheMiddleOfButton
                },
                {
                    positionName: 'belowStartOfButton',
                    condition: roomBelowStartOfButton >= popupRect.height,
                    func: showPopupBelowStartOfButton
                },
                {
                    positionName: 'aboveStartOfButton',
                    condition: roomAboveEndOfButton >= popupRect.height,
                    func: showPopupAboveEndOfButton
                }
            ];
    
            let restYPositions = [
                {
                    positionName: 'midWindow',
                    condition: popupRect.height + arrowSideSize < window.innerHeight,
                    func: showPopupInMiddleOfWindow
                },
                {
                    positionName: 'fullHeight',
                    condition: null,
                    func: showPopupFullHeightOfWindow
                }
            ];
    
            let ySortArray = ['below', 'above', 'middle', 'belowStartOfButton', 'aboveStartOfButton'];
            if (options.yPositionsOrder && options.yPositionsOrder.length > 0) {
                ySortArray = options.yPositionsOrder;
            }
    
            mainYOrder.sort((a, b) => {
                const indexA = ySortArray.indexOf(a.positionName);
                const indexB = ySortArray.indexOf(b.positionName);
                return indexA - indexB;
            });
        
            let yPositionsOrder = mainYOrder.concat(restYPositions);
            for (let i = 0; i < yPositionsOrder.length; i++) {
                let position = yPositionsOrder[i];
                if (i !== yPositionsOrder.length - 1) {
                    if (position.condition === true) {
                        if (position.func) {
                            position.func();
                        }
                        break;
                    }
                } else {
                    if (position.func) {
                        position.func();
                    }
                }
            }
    
    
            pupupInstance.popupDialogEl.style.visibility = '';
    
            pupupInstance.active = true;
    
            setTimeout(function () {
                if (!_isTouchScreen) {
                    window.addEventListener('click', pupupInstance.hide);
                } else {
                    window.addEventListener('touchend', pupupInstance.hide);
                }
            }, 0);
    
            function showPopupBelowButton() {
                let mainOrder = [
                    {
                        positionName: 'middle',
                        condition: roomToLeftOfMidButton >= (popupRect.width / 2) && roomToRightOfMidButton >= (popupRect.width / 2),
                        func: function () {
                            let popupLeft = ((triggeringElementRect.x + (triggeringElementRect.width / 2)) - (popupRect.width / 2));
                            let popupTop = triggeringElementRect.y + triggeringElementRect.height + arrowSideSize;
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-mid-below-position', false, false);
                        }
                    },
                    {
                        positionName: 'right',
                        condition: roomToRightOfStartOfButton >= popupRect.width,
                        func: function () {
                            let popupLeft = triggeringElementRect.x;
                            let popupTop = triggeringElementRect.y + triggeringElementRect.height + arrowSideSize;
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-right-below-position', false, false);
                        }
                    },
                    {
                        positionName: 'left',
                        condition: roomToLeftOfEndOfButton >= popupRect.width,
                        func: function () {
                            let popupLeft = (triggeringElementRect.x + triggeringElementRect.width) - popupRect.width;
                            let popupTop = triggeringElementRect.y + triggeringElementRect.height + arrowSideSize;
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-left-below-position', false, false);
                        }
                    }
                ];
    
                let restPositions = [
                    {
                        positionName: 'winmidBelow', //if there is space below pointer but content cannot me centralized relatively to pointer
                        condition: popupRect.width <= window.innerWidth,
                        func: function () {
                            let popupLeft = triggeringElementRect.x - roomToLeftOfButton;
                            let popupTop = triggeringElementRect.y + triggeringElementRect.height + arrowSideSize;
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-winmid-below-position', false, false);
                        }
                    },
                    {
                        positionName: 'fullwidthBelow', //if there is space below pointer but too little width to fit content entirely
                        condition: null,
                        func: function () {
                            let popupLeft = 0;
                            let popupTop = triggeringElementRect.y + triggeringElementRect.height + arrowSideSize;
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-fullwidth-below-position', true, false);
                        }
                    }
                ];
    
                let sortArray = ['middle', 'right', 'left'];
                if (options.xPositionsOrder && options.xPositionsOrder.length > 0) {
                    sortArray = options.xPositionsOrder;
                }
    
                mainOrder.sort((a, b) => {
                    const indexA = sortArray.indexOf(a.positionName);
                    const indexB = sortArray.indexOf(b.positionName);
                    return indexA - indexB;
                });
    
                let xPositionsOrder = mainOrder.concat(restPositions);
                for (let i = 0; i < xPositionsOrder.length; i++) {
                    let position = xPositionsOrder[i];
                    if (i !== xPositionsOrder.length - 1) {
                        if (position.condition === true) {
                            if (position.func) {
                                position.func();
                            }
                            break;
                        }
                    } else {
                        if (position.func) {
                            position.func();
                        }
                    }
                }
            }
    
            function showPopupAboveButton() {
                let mainOrder = [
                    {
                        positionName: 'middle',
                        condition: roomToLeftOfMidButton >= (popupRect.width / 2) && roomToRightOfMidButton >= (popupRect.width / 2),
                        func: function () {
                            let popupLeft = ((triggeringElementRect.x + (triggeringElementRect.width / 2)) - (popupRect.width / 2));
                            let popupTop = (triggeringElementRect.y - popupRect.height - arrowSideSize);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-mid-above-position', false, false);
                        }
                    },
                    {
                        positionName: 'right',
                        condition: roomToRightOfStartOfButton >= popupRect.width,
                        func: function () {
                            let popupLeft = (triggeringElementRect.x);
                            let popupTop = (triggeringElementRect.y - popupRect.height - arrowSideSize);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
            
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-right-above-position', false, false);
                        }
                    },
                    {
                        positionName: 'left',
                        condition: roomToLeftOfEndOfButton >= popupRect.width,
                        func: function () {
                            let popupLeft = (triggeringElementRect.x + triggeringElementRect.width - popupRect.width);
                            let popupTop = (triggeringElementRect.y - popupRect.height - arrowSideSize);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-left-above-position', false, false);
                        }
                    }
                ];
    
                let restPositions = [
                    {
                        positionName: 'winmidAbove', //if there is space above pointer but content cannot me centralized relatively to pointer
                        condition: window.innerWidth >= popupRect.width,
                        func: function () {
                            let popupLeft = triggeringElementRect.x - roomToLeftOfButton;
                            let popupTop = (triggeringElementRect.y - popupRect.height - arrowSideSize);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-winmid-above-position', false, false);
                        }
                    },
                    {
                        positionName: 'fullwidthAbove', //if there is space above pointer but too little width to fit content entirely
                        condition: null,
                        func: function () {
                            let popupLeft = 0;
                            let popupTop = (triggeringElementRect.y - popupRect.height - arrowSideSize);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
            
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-fullwidth-above-position', true, false);
                        }
                    }
                ];
    
                let sortArray = ['middle', 'right', 'left'];
                if(options.xPositionsOrder && options.xPositionsOrder.length > 0) {
                    sortArray = options.xPositionsOrder;
                }
    
                mainOrder.sort((a, b) => {
                    const indexA = sortArray.indexOf(a.positionName);
                    const indexB = sortArray.indexOf(b.positionName);
                    return indexA - indexB;
                });
    
                let xPositionsOrder = mainOrder.concat(restPositions);
                for(let i = 0; i < xPositionsOrder.length; i++) {
                    let position = xPositionsOrder[i];
                    if(i !== xPositionsOrder.length - 1) {
                        if(position.condition === true) {
                            if(position.func) {
                                position.func();
                            }
                            break;
                        }
                    } else {
                        if(position.func) {
                            position.func();
                        }
                    }
                }
            }
    
            function showPopupInTheMiddleOfButton() {
                let mainOrder = [
                    {
                        positionName: 'right',
                        condition: roomToRightOfButton >= popupRect.width + arrowSideSize,
                        func: function () {
                            let popupLeft = (triggeringElementRect.x + triggeringElementRect.width + arrowSideSize);
                            let popupTop = midYOfTriggeringElement - (popupRect.height / 2);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-right-mid-position', false, false);
                        }
                    },
                    {
                        positionName: 'left',
                        condition: roomToLeftOfButton >= popupRect.width + arrowSideSize,
                        func: function () {
                            let popupLeft = (triggeringElementRect.x - popupRect.width - arrowSideSize);
                            let popupTop = midYOfTriggeringElement - (popupRect.height / 2);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-left-mid-position', false, false);
                        }
                    }
                ];
    
                let restPositions = [
                    {
                        positionName: 'fullwidthMid', //if there is space above pointer but content cannot me centralized relatively to pointer
                        condition: null,
                        func: function () {
                            let popupLeft = 0;
                            let popupTop = midYOfTriggeringElement - (popupRect.height / 2);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = '0px';
            
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-fullwidth-mid-position', true, false);
                        }
                    }
                ];
    
                let sortArray = ['right', 'left'];
                if(options.xPositionsOrder && options.xPositionsOrder.length > 0) {
                    sortArray = options.xPositionsOrder;
                }
    
                mainOrder.sort((a, b) => {
                    const indexA = sortArray.indexOf(a.positionName);
                    const indexB = sortArray.indexOf(b.positionName);
                    return indexA - indexB;
                });
    
                let xPositionsOrder = mainOrder.concat(restPositions);
                for(let i = 0; i < xPositionsOrder.length; i++) {
                    let position = xPositionsOrder[i];
                    if(i !== xPositionsOrder.length - 1) {
                        if(position.condition === true) {
                            if(position.func) {
                                position.func();
                            }
                            break;
                        }
                    } else {
                        if(position.func) {
                            position.func();
                        }
                    }
                }
            }
            
            function showPopupBelowStartOfButton() {
                let mainOrder = [
                    {
                        positionName: 'right',
                        condition: roomToRightOfButton >= popupRect.width + arrowSideSize,
                        func: function () {
                            //log('show 4.1');
                            let popupLeft = (triggeringElementRect.x + triggeringElementRect.width + arrowSideSize);
                            let popupTop = triggeringElementRect.y;
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-right-belowtop-position', false, false);
                        }
                    },
                    {
                        positionName: 'left',
                        condition: roomToLeftOfButton >= popupRect.width + arrowSideSize,
                        func: function () {
                            //log('show 4.2');
                            let popupLeft = (triggeringElementRect.x - popupRect.width - arrowSideSize);
                            let popupTop = triggeringElementRect.y;
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-left-belowtop-position', false, false);
                        }
                    }
                ];
    
                let restPositions = [
                    {
                        positionName: 'fullwidthBelowTop', //if there is space below pointer but too little width to fit content entirely
                        condition: null,
                        func: function () {
                            //log('show 4.3');
                            pupupInstance.popupDialogEl.style.top = (triggeringElementRect.y) + 'px';
                            pupupInstance.popupDialogEl.style.left = '0px';
    
                            togglePopupClassName('webrtc-popup-dialog-fullwidth-belowtop-position', true, false);
                        }
                    }
                ];
    
                let sortArray = ['right', 'left'];
                if (options.xPositionsOrder && options.xPositionsOrder.length > 0) {
                    sortArray = options.xPositionsOrder;
                }
    
                mainOrder.sort((a, b) => {
                    const indexA = sortArray.indexOf(a.positionName);
                    const indexB = sortArray.indexOf(b.positionName);
                    return indexA - indexB;
                });
    
                let xPositionsOrder = mainOrder.concat(restPositions);
                for (let i = 0; i < xPositionsOrder.length; i++) {
                    let position = xPositionsOrder[i];
                    if (i !== xPositionsOrder.length - 1) {
                        if (position.condition === true) {
                            if (position.func) {
                                position.func();
                            }
                            break;
                        }
                    } else {
                        if (position.func) {
                            position.func();
                        }
                    }
                }
            }
    
            function showPopupAboveEndOfButton() {
                let mainOrder = [
                    {
                        positionName: 'right',
                        condition: roomToRightOfButton >= popupRect.width + arrowSideSize,
                        func: function () {
                            //log('show 5.1');
                            let popupLeft = (triggeringElementRect.x + triggeringElementRect.width + arrowSideSize);
                            let popupTop = (triggeringElementRect.y + triggeringElementRect.height - popupRect.height);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-right-abovebottom-position', false, false);
                        }
                    },
                    {
                        positionName: 'left',
                        condition: roomToLeftOfButton >= popupRect.width + arrowSideSize,
                        func: function () {
                            //log('show 5.2');
                            let popupLeft = (triggeringElementRect.x - popupRect.width - arrowSideSize);
                            let popupTop = (triggeringElementRect.y + triggeringElementRect.height - popupRect.height);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-left-abovebottom-position', false, false);
                        }
                    }
                ];
    
                let restPositions = [
                    {
                        positionName: 'fullwidthAboveBottom', //above bottom border of button
                        condition: null,
                        func: function () {
                            //log('show 5.3');
                            pupupInstance.popupDialogEl.style.top = (triggeringElementRect.y + triggeringElementRect.height - popupRect.height) + 'px';
                            pupupInstance.popupDialogEl.style.left = '0px';
    
                            togglePopupClassName('webrtc-popup-dialog-fullwidth-abovebottom-position', false, false);
                        }
                    }
                ];
    
                let sortArray = ['right', 'left'];
                if(options.xPositionsOrder && options.xPositionsOrder.length > 0) {
                    sortArray = options.xPositionsOrder;
                }
    
                mainOrder.sort((a, b) => {
                    const indexA = sortArray.indexOf(a.positionName);
                    const indexB = sortArray.indexOf(b.positionName);
                    return indexA - indexB;
                });
    
                let xPositionsOrder = mainOrder.concat(restPositions);
                for(let i = 0; i < xPositionsOrder.length; i++) {
                    let position = xPositionsOrder[i];
                    if(i !== xPositionsOrder.length - 1) {
                        if(position.condition === true) {
                            if(position.func) {
                                position.func();
                            }
                            break;
                        }
                    } else {
                        if(position.func) {
                            position.func();
                        }
                    }
                }
            }
    
            function showPopupInMiddleOfWindow() {
                let mainOrder = [
                    {
                        positionName: 'right',
                        condition: roomToRightOfButton >= popupRect.width + arrowSideSize,
                        func: function () {
                            //log('show 6.1');
                            let popupLeft = (triggeringElementRect.x + triggeringElementRect.width + arrowSideSize);
                            let popupTop = (window.innerHeight / 2) - (popupRect.height / 2);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-right-winmid-position', false, false);
                        }
                    },
                    {
                        positionName: 'left',
                        condition: roomToLeftOfButton >= popupRect.width + arrowSideSize,
                        func: function () {
                            //log('show 6.2');
                            let popupLeft = (triggeringElementRect.x - arrowSideSize - popupRect.width);
                            let popupTop = (window.innerHeight / 2) - (popupRect.height / 2);
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-left-winmid-position', false, false);
                        }
                    }
                ];
    
                let restPositions = [
                    {
                        positionName: 'winmidWinmid',
                        condition: popupRect.width <= window.innerWidth,
                        func: function () {
                            //log('show 6.3');
    
                            pupupInstance.popupDialogEl.style.top = (window.innerHeight / 2) - (popupRect.height / 2) + 'px';
                            pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x - roomToLeftOfButton) + 'px';
                            togglePopupClassName('webrtc-popup-dialog-winmid-winmid-position', false, false);
                        }
                    },
                    {
                        positionName: 'fullwidthWinmid',
                        condition: null,
                        func: function () {
                            //log('show 6.4');
    
                            pupupInstance.popupDialogEl.style.top = (window.innerHeight / 2) - (popupRect.height / 2) + 'px';
                            pupupInstance.popupDialogEl.style.left = '0px';
                            togglePopupClassName('webrtc-popup-dialog-fullwidth-winmid-position', true, false);
                        }
                    }
                ];
    
                let sortArray = ['right', 'left'];
                if (options.xPositionsOrder && options.xPositionsOrder.length > 0) {
                    sortArray = options.xPositionsOrder;
                }
    
                mainOrder.sort((a, b) => {
                    const indexA = sortArray.indexOf(a.positionName);
                    const indexB = sortArray.indexOf(b.positionName);
                    return indexA - indexB;
                });
    
                let xPositionsOrder = mainOrder.concat(restPositions);
                for (let i = 0; i < xPositionsOrder.length; i++) {
                    let position = xPositionsOrder[i];
                    if (i !== xPositionsOrder.length - 1) {
                        if (position.condition === true) {
                            if (position.func) {
                                position.func();
                            }
                            break;
                        }
                    } else {
                        if (position.func) {
                            position.func();
                        }
                    }
                }
            }
    
            function showPopupFullHeightOfWindow() {
                let mainOrder = [
                    {
                        positionName: 'right',
                        condition: roomToRightOfButton >= popupRect.width + arrowSideSize,
                        func: function () {
                            //log('show 7.1');
                            let popupLeft = (triggeringElementRect.x + triggeringElementRect.width + arrowSideSize);
                            let popupTop = 0;
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-right-fullheight-position', false, false);
                        }
                    },
                    {
                        positionName: 'left',
                        condition: roomToLeftOfButton >= popupRect.width + arrowSideSize,
                        func: function () {
                            //log('show 7.2');
                            let popupLeft = (triggeringElementRect.x - arrowSideSize - popupRect.width);
                            let popupTop = 0;
                            pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                            pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                            positionArrow(popupLeft, popupTop)
                            togglePopupClassName('webrtc-popup-dialog-left-fullheight-position', false, false);
                        }
                    }
                ];
    
                let restPositions = [
                    {
                        positionName: 'winmidFullheight',
                        condition: popupRect.width <= window.innerWidth,
                        func: function () {
                            //log('show 7.3');
    
                            pupupInstance.popupDialogEl.style.top = (window.innerHeight / 2) - (popupRect.height / 2) + 'px';
                            pupupInstance.popupDialogEl.style.left = (window.innerWidth / 2) - (popupRect.width / 2) + 'px';
                            togglePopupClassName('webrtc-popup-dialog-winmid-fullheight-position', false, true);
                        }
                    },
                    {
                        positionName: 'fullHeightFullHeight',
                        condition: null,
                        func: function () {
                            //log('show 7.4');
                            pupupInstance.popupDialogEl.style.top = '0px';
                            pupupInstance.popupDialogEl.style.left = '0px';
                            togglePopupClassName('webrtc-popup-dialog-fullwidth-fullheight-position', true, true);
                        }
                    }
                ];
    
                let sortArray = ['right', 'left'];
                if (options.xPositionsOrder && options.xPositionsOrder.length > 0) {
                    sortArray = options.xPositionsOrder;
                }
    
                mainOrder.sort((a, b) => {
                    const indexA = sortArray.indexOf(a.positionName);
                    const indexB = sortArray.indexOf(b.positionName);
                    return indexA - indexB;
                });
    
                let xPositionsOrder = mainOrder.concat(restPositions);
                for (let i = 0; i < xPositionsOrder.length; i++) {
                    let position = xPositionsOrder[i];
                    if (i !== xPositionsOrder.length - 1) {
                        if (position.condition === true) {
                            if (position.func) {
                                position.func();
                            }
                            break;
                        }
                    } else {
                        if (position.func) {
                            position.func();
                        }
                    }
                }
            }
        } 
    
        this.updateDialogSize = function () {
            let popupRect = pupupInstance.popupDialogEl.getBoundingClientRect();
            if(popupRect.bottom >= window.innerHeight) {
                let height = window.innerHeight - popupRect.top;
                pupupInstance.popupDialogEl.style.height = height + 'px';
                pupupInstance.popupDialogBodyEl.style.overflowY = 'auto';
            }
        }
    
        this.destroy = function () {
            this.element.removeEventListener('mouseenter', onElementMouseEnterListener);
            this.element.removeEventListener('mouseleave', onElementMouseLeaveListener);
            pupupInstance = null;
        }
    
        function togglePopupClassName(classNameToApply, addXScrollClass, addYScrollClass) {
            let classes = [
                'webrtc-popup-dialog-mid-below-position',
                'webrtc-popup-dialog-right-below-position',
                'webrtc-popup-dialog-left-below-position',
                'webrtc-popup-dialog-winmid-below-position',
                'webrtc-popup-dialog-fullwidth-below-position',
                'webrtc-popup-dialog-mid-above-position',
                'webrtc-popup-dialog-right-above-position',
                'webrtc-popup-dialog-left-above-position',
                'webrtc-popup-dialog-winmid-above-position',
                'webrtc-popup-dialog-fullwidth-above-position',
                'webrtc-popup-dialog-right-mid-position',
                'webrtc-popup-dialog-left-mid-position',
                'webrtc-popup-dialog-fullwidth-mid-position',
                'webrtc-popup-dialog-right-belowtop-position',
                'webrtc-popup-dialog-left-belowtop-position',
                'webrtc-popup-dialog-mid-belowtop-position',
                'webrtc-popup-dialog-fullwidth-belowtop-position',
                'webrtc-popup-dialog-right-abovebottom-position',
                'webrtc-popup-dialog-left-abovebottom-position',
                'webrtc-popup-dialog-fullwidth-abovebottom-position',
                'webrtc-popup-dialog-right-winmid-position',
                'webrtc-popup-dialog-left-winmid-position',
                'webrtc-popup-dialog-winmid-winmid-position',
                'webrtc-popup-dialog-fullwidth-winmid-position',
                'webrtc-popup-dialog-right-fullheight-position',
                'webrtc-popup-dialog-left-fullheight-position',
                'webrtc-popup-dialog-winmid-fullheight-position',
                'webrtc-popup-dialog-fullwidth-fullheight-position',
                'webrtc-popup-dialog-x-scroll',
                'webrtc-popup-dialog-y-scroll',
            ];
            for (let i in classes) {
                if (classes[i] == classNameToApply || (classes[i] == 'webrtc-popup-dialog-x-scroll' && addXScrollClass) || (classes[i] == 'webrtc-popup-dialog-y-scroll' && addYScrollClass)) {
                    continue;
                }
                pupupInstance.popupDialogEl.classList.remove(classes[i]);
            }
    
            if (classNameToApply && classNameToApply != '' && !pupupInstance.popupDialogEl.classList.contains(classNameToApply)) {
                pupupInstance.popupDialogEl.classList.add(classNameToApply);
            }
    
            if (addXScrollClass) {
                pupupInstance.popupDialogEl.classList.add('webrtc-popup-dialog-x-scroll');
            }
            if (addYScrollClass) {
                pupupInstance.popupDialogEl.classList.add('webrtc-popup-dialog-y-scroll');
            }
        }
    
        this.popupDialogEl = document.createElement('DIV');
        this.popupDialogEl.className = 'webrtc-popup-dialog';
        if (options.className) {
            this.popupDialogEl.classList.add(options.className);
        }
    
        if (options.showArrow) {
            this.arrowEl = document.createElement('DIV');
            this.arrowEl.className = 'webrtc-popup-dialog-arrow';
            this.popupDialogEl.appendChild(this.arrowEl);
        }
        
        this.closeButtonEl = document.createElement('DIV');
        this.closeButtonEl.className = 'webrtc-popup-dialog-close-sign';
        this.popupDialogEl.appendChild(this.closeButtonEl);
    
        this.popupDialogBodyEl = document.createElement('DIV');
        this.popupDialogBodyEl.className = 'webrtc-popup-dialog-body';
        this.popupDialogEl.appendChild(this.popupDialogBodyEl);
    
        this.closeButtonEl.addEventListener('click', function (e) {
            pupupInstance.hide(e);
        });
    
        if (!_isTouchScreen) {
            if(options.triggerOn == 'hover') {
                this.element.addEventListener('mouseenter', onElementMouseEnterListener);
    
                this.element.addEventListener('mouseleave', onElementMouseLeaveListener);
    
                this.popupDialogEl.addEventListener('mouseenter', function (e) {
                    removeHoverTimerIfExists();
                })
                this.popupDialogEl.addEventListener('mouseleave', function (e) {
                    pupupInstance.hoverTimeout = setTimeout(function () {
                        pupupInstance.hide();
                    }, 600)
    
                });
            } else if(options.triggerOn == 'lmb') {
                this.element.addEventListener('click', function (e) {
                    if (pupupInstance.active) {
                        pupupInstance.hide(e);
                    } else {
                        pupupInstance.show(e);
                    }
    
                });
            } else if(options.triggerOn == 'rmb') {
                this.element.addEventListener('click', function (e) {
                    if (e.button == 2) {
                        if (pupupInstance.active) {
                            pupupInstance.hide(e);
                        } else {
                            pupupInstance.show(e);
                        }
                    }
                });
            } else if(options.triggerOn == 'showImmediately') {
                pupupInstance.show(options.pointerEvent);
            } else {
                console.warn('Wrong triggerOn value');
            }
    
        } else {
            this.element.addEventListener('touchend', function (e) {
                if (pupupInstance.active) {
                    pupupInstance.hide(e);
                } else {
                    pupupInstance.show(e);
                }
    
            });
        }
    
        this.resizeObserver = new window.ResizeObserver(function (entries) {
            for (const entry of entries) {
                pupupInstance.updateDialogSize(true);
            }
    
        });
    
        this.resizeObserver.observe(this.popupDialogEl);
    
        function onElementMouseEnterListener(e) {
            removeHoverTimerIfExists();
            pupupInstance.show(e);
        }
    
        function onElementMouseLeaveListener(e) {
            pupupInstance.hoverTimeout = setTimeout(function () {
                pupupInstance.hide(e);
            }, 600)
        }
    
        function removeHoverTimerIfExists() {
            if (pupupInstance.hoverTimeout != null) {
                clearTimeout(pupupInstance.hoverTimeout);
                pupupInstance.hoverTimeout = null;
            }
        }
    
        function isTouchDevice() {
            return (('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0) ||
                (navigator.msMaxTouchPoints > 0));
        }
    
    }

    Q.Tool.define("Media/webrtc/popupDialog", function (options) {
        var tool = this;
        //window = tool.element.ownerDocument.defaultView;
        //document = window.document;

        tool.loadStyles().then(function () {
            tool.initPopupDialog();
        });
    },

        {
            className: null,
            content: null,
            triggerOn: 'hover'
        },

        {
            loadStyles: function () {
                return new Promise(function (resolve, reject) {
                    Q.addStylesheet('{{Media}}/css/tools/webrtcPopupDialog.css?ts=' + Date.now(), function () {
                        Q.handle(resolve, this);
                    });
                });
            },
            initPopupDialog: function () {
                var tool = this;
                tool.popupDialog = new PopupDialog(tool.element, {
                    showArrow: tool.state.showArrow,
                    className: tool.state.className,
                    content: tool.state.content,
                    triggerOn: tool.state.triggerOn,
                    parent: tool.state.parent,
                    xPositionsOrder: tool.state.xPositionsOrder,
                    yPositionsOrder: tool.state.yPositionsOrder
                })
            },
            hide: function () {
                var tool = this;
                if(tool.popupDialog) {
                    tool.popupDialog.hide();
                }
            },
            show: function (elementToShowBy) {
                var tool = this;
                if(tool.popupDialog) {
                    tool.popupDialog.show(null, elementToShowBy);
                }
            },
            destroy: function () {
                var tool = this;
                if(tool.popupDialog) {
                    tool.popupDialog.destroy();
                }
            }
        }

    );

})(window.jQuery, window);