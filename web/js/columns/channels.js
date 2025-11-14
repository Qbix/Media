"use strict";
(function(Q, $, undefined) {

var Streams = Q.Streams;
var Media = Q.Media;

Q.exports(function (options, index, columnElement, data) {
	var loggedUserId = Q.Users.loggedInUserId();
	var $channelsColumn = $(".Media_column_channels", columnElement);

	Q.addStylesheet('{{Media}}/css/columns/channels.css');

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