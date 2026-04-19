Q.Media.WebRTC.clipEditor.ClipEditor = function () {
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

    const editorTimeline = document.createElement('DIV');
    editorTimeline.className = 'clip-editor-timeline';

    const clipTitle = document.createElement('DIV');
    clipTitle.className = 'clip-editor-clip-title';

    function onFileOpen() {
          const file = e.target.files[0];
    }
}