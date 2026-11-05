(function (Q, $, window, undefined) {

/**
* Media/channel/preview tool.
* Renders a tool to preview Media clip
* @class Media/channel/preview
* @constructor
* @param {Object} [options] options to pass besides the ones to Streams/preview tool
*/
Q.Tool.define("Media/channel/preview", ["Streams/preview"], function _Media_clip_preview (options, preview) {
	var tool = this;
	tool.preview = preview;

	//preview.state.creatable.preprocess = tool.composer.bind(this);
	/*preview.state.onCreate.set(function () {
		Q.Dialogs.pop();
	}, tool);*/

	preview.state.onRefresh.add(tool.refresh.bind(tool));
},

{
	relationType: "Media/channel",
	onInvoke: new Q.Event(function () {
		var tool = this;
		var stream = this.stream;

		Q.Media.pushChannelColumn(stream, $(tool.element));
	}, 'Media/channel/preview')
},

{
	refresh: function (stream, callback) {
		var tool = this;
		var state = this.state;
		var $toolElement = $(tool.element);

		tool.stream = stream;

		// retain with stream
		Q.Streams.retainWith(tool).get(stream.fields.publisherId, stream.fields.name);

		// Which row layout to render -- "default" (the platform default,
		// unchanged from before this option existed) keeps using the
		// generic Streams/default/preview tool, same as every other
		// stream type; "mediaChannel" (opt-in per app, e.g. Fans, via
		// Media.channel.previewLayout) renders the richer avatar/title/
		// followers/description/Follow row instead (see
		// renderMediaChannel below).
		var previewLayout = Q.getObject("Media.channel.previewLayout", Q.plugins) || 'default';
		if (previewLayout === 'mediaChannel') {
			return tool.renderMediaChannel(stream);
		}

		setTimeout(function () {
			$toolElement.tool("Streams/default/preview").activate(function () {
				$toolElement.off(Q.Pointer.fastclick).on(Q.Pointer.fastclick, function () {
					Q.handle(state.onInvoke, tool);
				});
			});
		}, 0);
	},
	/**
	 * Renders the "Media/channel/mediaChannel" row layout: avatar on the
	 * left, title + follower count + description in the middle, and a
	 * Follow button on the far right (Spotify-podcast-list style).
	 * Built directly off Q.Streams.Avatar.get, same reasoning as Media/
	 * clip.js's own author byline -- a plain icon+title preview tool has
	 * nowhere to grow a follower count or Follow button into.
	 * @method renderMediaChannel
	 * @param {Streams_Stream} stream
	 */
	renderMediaChannel: function (stream) {
		var tool = this;
		var state = tool.state;
		var $toolElement = $(tool.element);

		// Media/channel's own configured default icon (plugins/Media/
		// config/plugin.json's "Streams"/"types"/"Media/channel"/
		// "defaults"/"icon") is "Streams/category" -- but stream.fields.
		// icon doesn't hold that short symbolic name verbatim; it's
		// already been expanded to a full platform-icon path by the time
		// it's stored ("{{baseUrl}}/Q/plugins/Streams/img/icons/Streams/
		// category", confirmed live -- an exact-match check against the
		// short name alone never actually matched). A real uploaded icon
		// (set via the imagepicker on the channel's own page, see
		// channel.js) instead lives under "/Q/uploads/...", so checking
		// for the platform's own built-in icon directory distinguishes
		// "still the default" from "an admin set a real one", regardless
		// of which specific default icon a stream type is configured
		// with.
		var hasOwnIcon = stream.fields.icon
			&& stream.fields.icon.indexOf('/Q/plugins/') === -1;

		if (hasOwnIcon) {
			_render(stream.iconUrl(80));
		} else {
			// No custom channel icon -- fall back to the creator's own
			// avatar, same Q.Streams.Avatar.get technique Media/clip.js's
			// author byline already uses.
			Q.Streams.Avatar.get(stream.fields.publisherId, function (err, avatar) {
				_render((!err && avatar) ? avatar.iconUrl(80) : stream.iconUrl(80));
			});
		}

		function _render(iconUrl) {
			Q.Template.render('Media/channel/mediaChannel', {
				title: stream.fields.title,
				description: stream.fields.content
			}, function (err, html) {
				if (err) {
					return;
				}
				Q.replace(tool.element, html);
				$toolElement.addClass('Media_channel_mediaChannel_tool');
				tool.$('.Media_channel_mediaChannel_icon').attr('src', iconUrl);

				$toolElement.off(Q.Pointer.fastclick).on(Q.Pointer.fastclick, function (e) {
					// Don't navigate to the channel when the click was on
					// (or inside) the Follow button -- that has its own
					// handler (see Q.Media.wireFollowButton).
					if ($(e.target).closest('.Media_channel_follow').length) {
						return;
					}
					Q.handle(state.onInvoke, tool);
				});

				// "<N> followers" -- same endpoint and pluralization
				// Media/channel.js's own followers count and Media/
				// clip.js's author byline both already use.
				var $followersCount = tool.$('.Media_channel_mediaChannel_followersCount');
				Q.req('Media/channel', ['followersCount'], function (err, response) {
					var count = !err && response && response.slots
						? response.slots.followersCount : 0;
					var text = tool.text.channels;
					$followersCount.text(count + ' ' + (count === 1 ? text.Follower : text.Followers));
				}, {
					method: 'get',
					fields: {
						publisherId: stream.fields.publisherId,
						streamName: stream.fields.name
					}
				});

				var allowFollow = !!Q.getObject("Media.channel.allowFollow", Q.plugins);
				if (!allowFollow || stream.testWriteLevel('close')) {
					return; // feature off, or this row is the viewer's own channel
				}

				// Same partial + wiring Media/channel.js's own Follow
				// button and Media/clip.js's author byline both use.
				Q.Template.render('Media/followButton', {
					channelsText: tool.text.channels
				}, function (err, html) {
					if (err) {
						return;
					}
					var $follow = $(html).appendTo(tool.$('.Media_channel_mediaChannel_actions'));
					Q.Media.wireFollowButton(tool, $follow, stream);
				});
			});
		}
	}
});

Q.Template.set('Media/channel/mediaChannel',
	'<img class="Media_channel_mediaChannel_icon" alt="icon" src="">'
	+ '<div class="Media_channel_mediaChannel_info">'
	+ '	<div class="Media_channel_mediaChannel_title">{{title}}</div>'
	+ '	<div class="Media_channel_mediaChannel_followersCount"></div>'
	+ '	{{#if description}}'
	+ '		<div class="Media_channel_mediaChannel_description">{{description}}</div>'
	+ '	{{/if}}'
	+ '</div>'
	+ '<div class="Media_channel_mediaChannel_actions"></div>'
);

})(Q, Q.jQuery, window);
