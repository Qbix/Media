Q.page("Media/clipEditor", function () {
    let contentElement = document.querySelector('#content');
    let clipeditorContainer = document.createElement('DIV');
    contentElement.appendChild(clipeditorContainer);

    Q.activate(
        Q.Tool.setUpElement(
            clipeditorContainer,
            "Media/webrtc/clipEditor",
            {

            }
        ),
        {},
        function () {
            //tool.recordingsTool = this;
        }
    );

    return function () {
        // code to execute before page starts unloading
    };
}, 'Media');