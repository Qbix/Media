Q.page("Media/youtube", function () {
    
    let previewTools = new Set();

    function overrideOnInvokeHanlder() {

        let episodePreviewTools = Q.Tool.byName('Media/episode/preview');
        console.log('previewTool episodePreviewTools', episodePreviewTools)

        for (let i in episodePreviewTools) {
            const previewTool = episodePreviewTools[i];
            if (previewTools.has(previewTool)) continue;
            console.log('previewTool add click')
            previewTool.state.onInvoke = function () {
                var stream = previewTool.stream;
                var url = Q.url('clip/' + (stream.fields.publisherId ? stream.fields.publisherId + '/' : '') + 'youtube/' + stream.fields.name.split('/').pop());
                            console.log('previewTool add url', url)

                //var url = Q.url('yt/clip/' + (options.publisherId ? options.publisherId + '/' : '') + clipId);
                Q.invoke({
                    title: '&#8987 ...',
                    url: url,
                    trigger: previewTool.element,
                    className: 'Streams_chat_streams_video'
                });
            }
            previewTools.add(previewTool);
        }
    }
    
    Q.Tool.onActivate('Media/episode/preview').add(overrideOnInvokeHanlder, true);
    /* const domObserver = new MutationObserver(function (mutations) {
			mutations.forEach(function(mutation) {
				if (mutation.type !== 'childList' || Q.isEmpty(mutation.removedNodes)) {
					return;
				}

				mutation.removedNodes.forEach(function(removedElement) {
					if (removedElement.classList.contains("Streams_preview_tool")) {
						Q.Tool.remove(tool.element, true, true);
					}
				});
			});
		}); */

    return function () {
        // code to execute before page starts unloading
    };
}, 'Media');