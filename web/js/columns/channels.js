"use strict";
(function(Q, $, undefined) {

var Streams = Q.Streams;
var Media = Q.Media;

Q.exports(function (options, index, columnElement, data) {
	Q.addStylesheet('{{Media}}/css/columns/channels.css');

	var columnsTool = Q.Tool.from($(columnElement).closest(".Q_columns_tool")[0], "Q/columns");
	if (columnsTool) {
		columnsTool.state.beforeClose.set(function (index, prevIndex, div) {
			if (!$(div).hasClass("Media_column_channel")) {
				return;
			}

			var channelTool = Q.Tool.from($(".Media_channel_tool", div)[0], "Media/channel");
			if (channelTool) {
				$(".Media_channel_preview_tool[data-publisherId='" + channelTool.state.publisherId + "'][data-streamName='" + channelTool.state.streamName + "']", columnElement).removeClass("Q_selected");
			}
		});
	}

	var _setSelectedPreview = function ($toolElement) {
		$toolElement.addClass("Q_selected").siblings(".Media_channel_preview_tool").removeClass("Q_selected");
	};
	columnElement.forEachTool('Media/channel/preview', function () {
		var $toolElement = $(this.element);
		var currentChannel = Q.getObject("channels.current", Q.Media);
		if (currentChannel && (currentChannel.publisherId === this.preview.state.publisherId && currentChannel.streamName === this.preview.state.streamName)) {
			_setSelectedPreview($toolElement);
		}

		this.state.onInvoke && this.state.onInvoke.set(function (preview) {
			_setSelectedPreview($toolElement);
		}, 'Media/channel/column');
	});
});
})(Q, Q.jQuery);