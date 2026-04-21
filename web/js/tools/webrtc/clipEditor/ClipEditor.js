Q.Media.WebRTC.clipEditor.ClipEditor = function () {
    const thisInstance = this;
    let _file;

    this.player = new Q.Media.WebRTC.clipEditor.MediaPlayer();

    const container = this.element = document.createElement('DIV');
    container.className = 'clip-editor';

    const editorTitle = document.createElement('DIV');
    editorTitle.className = 'clip-editor-title';

    const filePickerContainer = document.createElement('DIV');
    filePickerContainer.className = 'clip-editor-player-picker';
    container.appendChild(filePickerContainer);

    const filePicker = document.createElement('INPUT');
    filePickerContainer.appendChild(filePicker);
    filePicker.type = 'file';

    filePicker.addEventListener('change', (e) => {
        const file = e.target.files[0];
        this.player.openFile(file);
    });

    const editorPlayer = document.createElement('DIV');
    editorPlayer.className = 'clip-editor-player';
    container.appendChild(editorPlayer);

    const editorPlayerView = document.createElement('DIV');
    editorPlayerView.className = 'clip-editor-player-view';
    editorPlayer.appendChild(editorPlayerView);

    console.log('this.player', this.player)
    editorPlayerView.appendChild(this.player.element);

    container.appendChild(buildTimeline());

    const clipTitle = document.createElement('DIV');
    clipTitle.className = 'clip-editor-clip-title';
    container.appendChild(clipTitle);

    function onFileOpen() {
          const file = e.target.files[0];
    }

    function buildTimeline() {
        const editorTimeline = document.createElement('DIV');
        editorTimeline.className = 'clip-editor-timeline';
        container.appendChild(editorTimeline);

        const clipBounds = document.createElement('DIV');
        clipBounds.className = 'clip-editor-timeline-clip';
        editorTimeline.appendChild(clipBounds);

        //let totalDuration = thisInstance.player.parser.totalDuration;

        Q.activate(
            Q.Tool.setUpElement(
                clipBounds,
                "Q/resize",
                {
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
                _allParticipantsListInstance.resizingElementTool = this;
            }
        );

        return editorTimeline;
    }
}