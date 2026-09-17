Q.page("Media/dropVideo", function () {
	var el = document.querySelector('.Media_videoUpload_tool');
	if (!el) {
		return;
	}
	var tool = Q.Tool.from(el, 'Media/videoUpload');
	if (!tool) {
		return;
	}
	tool.state.onSaved.add(function (err, stream) {
		if (err || !stream) {
			return;
		}
		// Media/episode's own declared url template, e.g. /clip/:publisherId/:streamName
		location.href = stream.url || Q.url('clips');
	}, 'Media/dropVideo');
});
