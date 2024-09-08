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
    
        var _isTouchScreen = isTouchDevice();
    
        this.hide = function (e) {
            //console.log('PopupDialog: hide', pupupInstance.element)
            if (!e || (e && (e.target == this.closeButtonEl || !pupupInstance.popupDialogEl.contains(e.target)))) {
                //console.log('PopupDialog: hide', !e, (e && (e.target == this.closeButtonEl || !pupupInstance.popupDialogEl.contains(e.target))))
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
    
        this.show = function (e) {
            pupupInstance.popupDialogEl.style.top = '';
            pupupInstance.popupDialogEl.style.left = '';
            pupupInstance.popupDialogEl.style.maxHeight = '';
            pupupInstance.popupDialogEl.style.maxWidth = '';
            togglePopupClassName('', false, false);

            let existingPopupDialog = document.querySelector('.webrtc-popup-dialog');
            if (existingPopupDialog && existingPopupDialog.parentElement) {
                if(!options.parent || (options.parent && existingPopupDialog != options.parent && !existingPopupDialog.contains(options.parent))) {
                    existingPopupDialog.parentElement.removeChild(existingPopupDialog);
                } 
            }
    
            let triggeringElementRect = pupupInstance.element.getBoundingClientRect();
    
            pupupInstance.popupDialogEl.style.position = 'fixed';
            pupupInstance.popupDialogEl.style.visibility = 'hidden';
            pupupInstance.popupDialogEl.style.top = triggeringElementRect.y + triggeringElementRect.height + 20 + 'px';
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
    
            if (roomBelowButton >= popupRect.height + 20) {
                //console.log('show 1');
                if (roomToLeftOfMidButton >= (popupRect.width / 2) && roomToRightOfMidButton >= (popupRect.width / 2)) {
                    //console.log('show 1.1', popupRect.width);
                    let popupLeft = ((triggeringElementRect.x + (triggeringElementRect.width / 2)) - (popupRect.width / 2));
                    let popupTop = triggeringElementRect.y + triggeringElementRect.height + 20;
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-mid-below-position', false, false);
                } else if (roomToRightOfStartOfButton >= popupRect.width) {
                    //console.log('show 1.2', triggeringElementRect);
                    let popupLeft = triggeringElementRect.x;
                    let popupTop = triggeringElementRect.y + triggeringElementRect.height + 20;
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-right-below-position', false, false);
                } else if (roomToLeftOfEndOfButton >= popupRect.width) {
                    //console.log('show 1.3');
                    let popupLeft = (triggeringElementRect.x + triggeringElementRect.width) - popupRect.width;
                    let popupTop = triggeringElementRect.y + triggeringElementRect.height + 20;
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-left-below-position', false, false);
                } else if (popupRect.width <= window.innerWidth) {
                    //console.log('show 1.4');
                    let popupLeft = triggeringElementRect.x - roomToLeftOfButton;
                    let popupTop = triggeringElementRect.y + triggeringElementRect.height + 20;
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-winmid-below-position', false, false);
                } else {
                    //console.log('show 1.5');
                    let popupLeft = 0;
                    let popupTop = triggeringElementRect.y + triggeringElementRect.height + 20;
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-fullwidth-below-position', true, false);
                }
            } else if (roomAboveButton >= popupRect.height + 20) {
                //console.log('show 2');
                if (roomToLeftOfMidButton >= (popupRect.width / 2) && roomToRightOfMidButton >= (popupRect.width / 2)) {
                    //log('show 2.1');
                    let popupLeft = ((triggeringElementRect.x + (triggeringElementRect.width / 2)) - (popupRect.width / 2));
                    let popupTop = (triggeringElementRect.y - popupRect.height - 20);
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-mid-above-position', false, false);
                } else if (roomToRightOfStartOfButton >= popupRect.width) {
                    //log('show 2.2');
                    let popupLeft = (triggeringElementRect.x);
                    let popupTop = (triggeringElementRect.y - popupRect.height - 20);
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-right-above-position', false, false);
                } else if (roomToLeftOfEndOfButton >= popupRect.width) {
                    //log('show 2.3');
                    let popupLeft = (triggeringElementRect.x + triggeringElementRect.width - popupRect.width);
                    let popupTop = (triggeringElementRect.y - popupRect.height - 20);
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-left-above-position', false, false);
                } else if (window.innerWidth >= popupRect.width) {
                    //log('show 2.4');;
                    let popupLeft = triggeringElementRect.x - roomToLeftOfButton;
                    let popupTop = (triggeringElementRect.y - popupRect.height - 20);
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-winmid-above-position', false, false);
                } else {
                    //log('show 2.5');
                    let popupLeft = 0;
                    let popupTop = (triggeringElementRect.y - popupRect.height - 20);
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-fullwidth-above-position', true, false);
                }
            } else if (Math.min(roomBelowMidOfButton, roomAboveMidOfButton) >= popupRect.height / 2) {
                //log('show 3');
                if (roomToRightOfButton >= popupRect.width + 20) {
                    //log('show 3.1');
                    let popupLeft = (triggeringElementRect.x + triggeringElementRect.width + 20);
                    let popupTop = midYOfTriggeringElement - (popupRect.height / 2);
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-right-mid-position', false, false);
                } else if (roomToLeftOfButton >= popupRect.width + 20) {
                    //log('show 3.2');
                    let popupLeft = (triggeringElementRect.x - popupRect.width - 20);
                    let popupTop = midYOfTriggeringElement - (popupRect.height / 2);
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-left-mid-position', false, false);
                } else {
                    //log('show 3.3');
                    let popupLeft = 0;
                    let popupTop = midYOfTriggeringElement - (popupRect.height / 2);
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = '0px';
    
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-fullwidth-mid-position', true, false);
                }
            } else if (roomBelowStartOfButton >= popupRect.height) {
                //log('show 4');
                if (roomToRightOfButton >= popupRect.width + 20) {
                    //log('show 4.1');
                    let popupLeft = (triggeringElementRect.x + triggeringElementRect.width + 20);
                    let popupTop = triggeringElementRect.y;
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-right-belowtop-position', false, false);
                } else if (roomToLeftOfButton >= popupRect.width + 20) {
                    //log('show 4.2');
                    let popupLeft = (triggeringElementRect.x - popupRect.width - 20);
                    let popupTop = triggeringElementRect.y;
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-left-belowtop-position', false, false);
                } else {
                    //log('show 4.3');
                    pupupInstance.popupDialogEl.style.top = (triggeringElementRect.y) + 'px';
                    pupupInstance.popupDialogEl.style.left = '0px';
    
                    togglePopupClassName('webrtc-popup-dialog-fullwidth-belowtop-position', true, false);
                }
            } else if (roomAboveEndOfButton >= popupRect.height) {
                //log('show 5');
                if (roomToRightOfButton >= popupRect.width + 20) {
                    //log('show 5.1');
                    let popupLeft = (triggeringElementRect.x + triggeringElementRect.width + 20);
                    let popupTop = (triggeringElementRect.y + triggeringElementRect.height - popupRect.height);
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-right-abovebottom-position', false, false);
                } else if (roomToLeftOfButton >= popupRect.width + 20) {
                    //log('show 5.2');
                    let popupLeft = (triggeringElementRect.x - popupRect.width - 20);
                    let popupTop = (triggeringElementRect.y + triggeringElementRect.height - popupRect.height);
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-left-abovebottom-position', false, false);
                } else {
                    //log('show 5.3');
                    pupupInstance.popupDialogEl.style.top = (triggeringElementRect.y + triggeringElementRect.height - popupRect.height) + 'px';
                    pupupInstance.popupDialogEl.style.left = '0px';
    
                    togglePopupClassName('webrtc-popup-dialog-fullwidth-abovebottom-position', false, false);
                }
            } else if (popupRect.height + 20 < window.innerHeight) {
                //log('show 6');
                if (roomToRightOfButton >= popupRect.width + 20) {
                    //log('show 6.1');
                    let popupLeft = (triggeringElementRect.x + triggeringElementRect.width + 20);
                    let popupTop = (window.innerHeight / 2) - (popupRect.height / 2);
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-right-winmid-position', false, false);
    
                } else if (roomToLeftOfButton >= popupRect.width + 20) {
                    //log('show 6.2');
                    let popupLeft = (triggeringElementRect.x - 20 - popupRect.width);
                    let popupTop = (window.innerHeight / 2) - (popupRect.height / 2);
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-left-winmid-position', false, false);
                } else if (popupRect.width <= window.innerWidth) {
                    //log('show 6.3');
    
                    pupupInstance.popupDialogEl.style.top = (window.innerHeight / 2) - (popupRect.height / 2) + 'px';
                    pupupInstance.popupDialogEl.style.left = (triggeringElementRect.x - roomToLeftOfButton) + 'px';
                    togglePopupClassName('webrtc-popup-dialog-winmid-winmid-position', false, false);
                } else {
                    //log('show 6.4');
    
                    pupupInstance.popupDialogEl.style.top = (window.innerHeight / 2) - (popupRect.height / 2) + 'px';
                    pupupInstance.popupDialogEl.style.left = '0px';
                    togglePopupClassName('webrtc-popup-dialog-fullwidth-winmid-position', true, false);
                }
            } else {
                //log('show 7');
                if (roomToRightOfButton >= popupRect.width + 20) {
                    //log('show 7.1');
                    let popupLeft = (triggeringElementRect.x + triggeringElementRect.width + 20);
                    let popupTop = 0;
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-right-fullheight-position', false, false);
                } else if (roomToLeftOfButton >= popupRect.width + 20) {
                    //log('show 7.2');
                    let popupLeft = (triggeringElementRect.x - 20 - popupRect.width);
                    let popupTop = 0;
                    pupupInstance.popupDialogEl.style.top = popupTop + 'px';
                    pupupInstance.popupDialogEl.style.left = popupLeft + 'px';
    
                    positionArrow(popupLeft, popupTop)
                    togglePopupClassName('webrtc-popup-dialog-left-fullheight-position', false, false);
                } else if (popupRect.width <= window.innerWidth) {
                    //log('show 7.3');
    
                    pupupInstance.popupDialogEl.style.top = (window.innerHeight / 2) - (popupRect.height / 2) + 'px';
                    pupupInstance.popupDialogEl.style.left = (window.innerWidth / 2) - (popupRect.width / 2) + 'px';
                    togglePopupClassName('webrtc-popup-dialog-winmid-fullheight-position', false, true);
                } else {
                    //log('show 7.4');
                    pupupInstance.popupDialogEl.style.top = '0px';
                    pupupInstance.popupDialogEl.style.left = '0px';
                    togglePopupClassName('webrtc-popup-dialog-fullwidth-fullheight-position', true, true);
                }
            }
            //log('show 7', pupupInstance.popupDialogEl);
    
            pupupInstance.popupDialogEl.style.visibility = '';
    
            pupupInstance.active = true;
    
            setTimeout(function () {
                if (!_isTouchScreen) {
                    window.addEventListener('click', pupupInstance.hide);
                } else {
                    window.addEventListener('touchend', pupupInstance.hide);
                }
            }, 0);
        }
    
        this.updateDialogSize = function () {
            //console.log('updateDialogSize');
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
            delete pupupInstance;
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
        this.arrowEl = document.createElement('DIV');
        this.arrowEl.className = 'webrtc-popup-dialog-arrow';
        this.popupDialogEl.appendChild(this.arrowEl);
        
        this.closeButtonEl = document.createElement('DIV');
        this.closeButtonEl.className = 'webrtc-close-sign';
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
            } else {
                this.element.addEventListener('click', function (e) {
                    if (pupupInstance.active) {
                        //console.log('popupDialog: hide')
                        pupupInstance.hide(e);
                    } else {
                        //console.log('popupDialog: show')
                        pupupInstance.show(e);
                    }
    
                });
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
                    className: tool.state.className,
                    content: tool.state.content,
                    triggerOn: tool.state.triggerOn,
                    parent: tool.state.parent,
                })
            },
            hide: function () {
                var tool = this;
                if(tool.popupDialog) {
                    tool.popupDialog.hide();
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