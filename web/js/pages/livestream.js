Q.page("Media/livestream", function () {
    var url = new URL(location.href);
    var publisherId = Q.Media.livestream ? Q.Media.livestream.publisherId : null;
    var livestreamId =  Q.Media.livestream ? Q.Media.livestream.livestreamId : null;

    if(publisherId == null || livestreamId == null) {
        console.error('URL should contain publisherId and livestreamId')
        return;
    }
    var streamName
    if(livestreamId != null) {
        streamName = 'Media/webrtc/livestream/' + livestreamId;
    }

    var contentEl = document.getElementById('content');
    var livestreamElement = document.createElement('DIV');
    /* livestreamElement.style.position = 'absolute'; */
    livestreamElement.style.width = '100%';
    livestreamElement.style.height = 'inherit';
    contentEl.appendChild(livestreamElement);

    Q.activate(
        Q.Tool.setUpElement(livestreamElement, 'Media/webrtc/livestream', {
            publisherId: publisherId,
            streamName: streamName,
            webrtcPublisherId: Q.Media.livestream.roomPublisherId,
            webrtcStreamName: Q.Media.livestream.roomStreamName,
        }),
        {},
        function () {
            console.log('related', this)
        }
    );
   
    return function () {
        // code to execute before page starts unloading
    };
}, 'Media');