"use strict";
(function(Q, $, undefined) {

var Communities = Q.Communities;

Q.exports(function (options, index, columnElement, data) {
	var text;

	Q.addStylesheet('{{Media}}/css/columns/feed.css', { slotName: 'Media' });

	var pipe = new Q.pipe(['feed', 'text'], function () {
		var state = feedTool.state;

		state.onInvoke('chat').set(function (stream, $trigger) {
			Communities.pushChatColumn(stream, $trigger, {
				excludedRelatedStreams: ["Streams/question", "Media/clip"]
			});
		}, "Media/feed/column");

		state.onInvoke('local').set(function (stream) {
			var location = stream.getAttribute("location");
			if (Q.isEmpty(location)) {
				return console.warn("feed stream location empty");
			}
			var latitude = location.lat;
			var longitude = location.lng;
			var q = location.venue;
			var addr = location.address;
			Q.confirm(text.feed.WhichMaps, function (val) {
				var url;

				if (val === null) {
					return;
				}

				if (val === true) {
					url = 'https://www.google.com/maps/search/?api=1';
					url += '&query=' + encodeURIComponent(q || addr);
				} else if (val === false) {
					url = 'https://maps.apple.com/?dirflg=d';
					if (latitude && longitude) {
						url += '&sll=' + latitude + ',' + longitude;
					}
					url += '&q' + encodeURIComponent(q);
					url += '&daddr=' + encodeURIComponent(addr);
				}
				Q.openUrl(url);
			}, {
				title: text.feed.GetDirections,
				ok: 'Google',
				cancel: 'Apple',
				noClose: false
			});
		}, "Media/feed/column");

		state.onClose.set(function () {
			var $trigger = $(this.element);
			var min = parseInt($trigger.closest('.Q_columns_column').data('index'));
			var columns = Q.Tool.from($trigger.closest('.Q_columns_tool')[0], "Q/columns");
			columns.close({min: min}, null, {animation: {duration: 0}});
		}, "Media/feed/column");
	});


	var feedTool;
	columnElement.forEachTool('Media/feed', function () {
		feedTool = this;
		pipe.fill('feed')();
	});

	Q.Text.get('Media/content', function (err, content) {
		text = content;
		pipe.fill('text')();
	}, 'Media/feed/column');

	columnElement.forEachTool("Users/avatar", function () {
		var tool = this;
		var userId = this.state.userId;
		var $te = $(this.element);

		// open profile onclick
		$te.on(Q.Pointer.fastclick, function () {
			if (Q.Users.isCommunityId(userId)) {
				Communities.openCommunityProfile.call(this, userId);
			} else {
				Communities.openUserProfile.call(this, userId);
			}
			return false;
		});
	}, "Media/feed/column");
});

})(Q, Q.jQuery);