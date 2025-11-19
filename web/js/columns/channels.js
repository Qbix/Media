"use strict";
(function(Q, $, undefined) {

var Streams = Q.Streams;
var Media = Q.Media;

Q.exports(function (options, index, columnElement, data) {
	Q.addStylesheet('{{Media}}/css/columns/channels.css');

	var $menu = $(".Media_channels_menu", columnElement);
	var $menuItems = $(".Media_channels_menu_items", columnElement);
	var _selectItem = function (skipUpDown) {
		var $this = $(this);
		var action = $this.attr("data-action");

		$menu.attr("data-action", action);

		switch (action) {
			case 'all':
				$menu.html($this.html());
				$(".Media_channels .Media_channel_preview_tool", columnElement).show();
				$(".Media_channels_my .Media_channel_preview_tool:not(.Streams_preview_composer)", columnElement).hide();
				break;
			case 'my':
				$menu.html($this.html());
				$(".Media_channels .Media_channel_preview_tool", columnElement).hide();
				$(".Media_channels_my .Media_channel_preview_tool", columnElement).show();
				break;
			case 'search':
				var $input = $("<input type='text' name='search' placeholder='type...'>").on(Q.Pointer.fastclick, function (e) {
					e.stopPropagation();
					return false;
				}).on('focus', function() {
					if (!this.placeholder) {
						return;
					}
					this.dataset.placeholder = this.placeholder;  // Store original
					this.placeholder = '';  // Hide placeholder
				}).on('blur', function() {
					if (!this.value) {  // Only restore if input is empty
						this.placeholder = this.dataset.placeholder;
					}
				}).on('change', function () {

				});
				$menu.empty().append($input);
				break;
		}

		if (skipUpDown !== true) {
			_upDown();
		}
	};
	var _upDown = function () {
		var expanded = JSON.parse($menu.attr("data-expanded"));
		if (expanded) {
			$menu.attr("data-expanded", false);
			$menuItems.hide();
		} else {
			$menu.attr("data-expanded", true);
			$menuItems.width($menu.innerWidth()).show();
		}
	};
	$(">", $menuItems).on(Q.Pointer.fastclick, _selectItem);
	Q.handle(_selectItem, $(":first-child", $menuItems), [true]);
	$menu.on(Q.Pointer.fastclick, _upDown);

	/*var columnsTool = Q.Tool.from($(columnElement).closest(".Q_columns_tool")[0], "Q/columns");
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
	});*/
});
})(Q, Q.jQuery);