"use strict";
(function(Q, $, undefined) {

var Streams = Q.Streams;
var Media = Q.Media;

Q.exports(function (options, index, columnElement, data) {
	Q.addStylesheet('{{Media}}/css/columns/clips.css');

	var columnsTool = Q.Tool.from($(columnElement).closest(".Q_columns_tool")[0], "Q/columns");
	if (columnsTool) {
		columnsTool.state.beforeClose.set(function (index, prevIndex, div) {
			if (!$(div).hasClass("Media_column_clips")) {
				return;
			}

			var clipTool = Q.Tool.from($(".Media_clip_tool", div)[0], "Media/clip");
			if (clipTool) {
				$(".Media_episode_preview_tool[data-publisherId='" + clipTool.state.publisherId + "'][data-streamName='" + clipTool.state.streamName + "']", columnElement).removeClass("Q_selected");
			}
		});
	}

	var _setSelectedPreview = function ($toolElement) {
		$toolElement.addClass("Q_selected").siblings(".Media_episode_preview_tool").removeClass("Q_selected");
	};
	columnElement.forEachTool('Media/episode/preview', function () {
		var $toolElement = $(this.element);
		var currentClip = Q.getObject("clips.current", Q.Media);
		if (currentClip && (currentClip.publisherId === this.preview.state.publisherId && currentClip.streamName === this.preview.state.streamName)) {
			_setSelectedPreview($toolElement);
		}

		$toolElement.on(Q.Pointer.fastclick, function () {
			_setSelectedPreview($toolElement);
		});
	});
});
})(Q, Q.jQuery);