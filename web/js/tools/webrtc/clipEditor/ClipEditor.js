Q.Media.WebRTC.clipEditor.ClipEditor = function () {
    const thisInstance = this;
    let _file;

    this.startClipInput;
    this.endClipInput;
    this.player = new Q.Media.WebRTC.clipEditor.MediaPlayer();

    const container = this.element = document.createElement('DIV');
    container.className = 'clip-editor';
    const containerMain = this.element = document.createElement('DIV');
    containerMain.className = 'clip-editor-main';
    container.appendChild(containerMain)
    
    const containerClips = this.element = document.createElement('DIV');
    containerClips.className = 'clip-editor-clips';
    container.appendChild(containerClips)

    const editorTitle = document.createElement('DIV');
    editorTitle.className = 'clip-editor-title';

    const filePickerContainer = document.createElement('DIV');
    filePickerContainer.className = 'clip-editor-player-picker';
    containerMain.appendChild(filePickerContainer);

    const filePicker = document.createElement('INPUT');
    filePickerContainer.appendChild(filePicker);
    filePicker.type = 'file';

    filePicker.addEventListener('change', (e) => {
        const file = e.target.files[0];
        this.player.openFile(file);
        loadClipControls();
    });

    const editorPlayer = document.createElement('DIV');
    editorPlayer.className = 'clip-editor-player';
    containerMain.appendChild(editorPlayer);

    const editorPlayerView = document.createElement('DIV');
    editorPlayerView.className = 'clip-editor-player-view';
    editorPlayer.appendChild(editorPlayerView);

    console.log('this.player', this.player)
    editorPlayerView.appendChild(this.player.element);


    const clipControls = document.createElement('DIV');
    clipControls.className = 'clip-editor-controls';
    containerMain.appendChild(clipControls);

    const clipTitle = document.createElement('DIV');
    clipTitle.className = 'clip-editor-clip-title';
    containerMain.appendChild(clipTitle);

    function onFileOpen() {
          const file = e.target.files[0];
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function parseTime(timeStr) {
        const [mins, secs] = timeStr.split(':').map(Number);
        return mins * 60 + secs;
    }

    function buildTimeline() {
        const editorTimeline = document.createElement('DIV');
        editorTimeline.className = 'clip-editor-timeline';
        containerMain.appendChild(editorTimeline);

        const clipBounds = document.createElement('DIV');
        clipBounds.className = 'clip-editor-timeline-clip';
        editorTimeline.appendChild(clipBounds);

        //let totalDuration = thisInstance.player.parser.totalDuration;

        Q.activate(
            Q.Tool.setUpElement(
                clipBounds,
                "Q/resize",
                {
                    snapping: false,
                    move: true,
                    resize: true,
                    active: true,
                    resizeByWheel: false,
                    //elementPosition: 'fixed',
                    showResizeHandles: false,
                    moveWithinArea: 'parent',
                    allowOverresizing: true,
                    negativeMoving: false,
                    keepRatio: false,
                    onMoving: function () {

                    }
                }
            ),
            {},
            function () {
                let clipRangeResizeTool = this;
                clipRangeResizeTool.events.on('moving', onClipBoundsChange);
            }
        );

        function onClipBoundsChange(e) {
            let clipBoundsRect = clipBounds.getBoundingClientRect();
            let timelineRect = editorTimeline.getBoundingClientRect();
            let offsetPercent = e.x / timelineRect.width * 100;
            let timeToSet = thisInstance.player.parser.totalDuration / 100 * offsetPercent;
            console.log('onClipBoundsChange', offsetPercent, formatTime(parseFloat(timeToSet)))

            let clipDuration = thisInstance.player.parser.totalDuration / 100 * (clipBoundsRect.width / timelineRect.width * 100);
            thisInstance.startClipInput.value = formatTime(timeToSet);
            thisInstance.endClipInput.value = formatTime(timeToSet + clipDuration);

            thisInstance.player.setTime(timeToSet);
        }

        return editorTimeline;
    }

    function buildTimeRangeInputs() {
        const clipRange = document.createElement('DIV');
        clipRange.className = 'clip-editor-ranges';

        const clipRangeInputs = document.createElement('DIV');
        clipRangeInputs.className = 'clip-editor-ranges-inputs';
        clipRange.appendChild(clipRangeInputs);

        const startClipTime = document.createElement('DIV');
        startClipTime.className = 'clip-editor-range-start';
        clipRangeInputs.appendChild(startClipTime);

        const clipStartInput = thisInstance.startClipInput = document.createElement('INPUT');
        clipStartInput.type = 'text';
        clipStartInput.value = '0:00';
        startClipTime.appendChild(clipStartInput);
        clipStartInput.addEventListener('input', function (e) {
            if(validateInputTime(e.target)) {
                clipStartInput.classList.remove('clip-editor-range-invalid');
                
            } else {
                clipStartInput.classList.add('clip-editor-range-invalid');
            };
        });


        const endClipTime = document.createElement('DIV');
        endClipTime.className = 'clip-editor-range-start';
        clipRangeInputs.appendChild(endClipTime);
        const clipEndInput = thisInstance.endClipInput = document.createElement('INPUT');
        clipEndInput.type = 'text';
        clipEndInput.value = '0:00';
        endClipTime.appendChild(clipEndInput);
        
        const makeClip = document.createElement('DIV');
        makeClip.className = 'clip-editor-create-clip';
        clipRange.appendChild(makeClip);
        const makeClipButton = document.createElement('BUTTON');
        makeClipButton.innerHTML = 'Create Clip';
        makeClip.appendChild(makeClipButton);


        function validateInputTime(input) {
            const regex = /^\d+:[0-5]\d$/;

            return regex.test(input.value);
        }
        return clipRange;
    }

    function loadClipControls() {
        clipControls.appendChild(buildTimeline());
        clipControls.appendChild(buildTimeRangeInputs());
    }
}