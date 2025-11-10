(function (Q, $, window, undefined) {
/**
 * Media/channel tool.
 * Renders interface for Media channel
 * @method Media/channel
 * @param {Object} [options] this is an object that contains parameters for this function
 *   @param {String} options.publisherId The publisher id
 *   @param {String} options.streamName The name of the stream
 */
Q.Tool.define("Media/channel", function(options) {
	var state = this.state;

	if (!state.publisherId) {
		throw new Q.Exception("Media/channel: publisherId required!");
	}
	if (!state.streamName) {
		throw new Q.Exception("Media/channel: streamName required!");
	}

	this.refresh();
},

{
	publisherId: null,
	streamName: null,
	show: {
		participants: false,
		closeChannel: false
	}
},

{
	/**
	 * Refresh the HTML of the tool
	 * @method refresh
	 */
	refresh: function () {
		var tool = this;
		var $toolElement = $(this.element);
		var state = this.state;
		var userId = Q.Users.loggedInUserId();
		var isAdmin = false;

		Q.Streams.retainWith(tool).get.force(state.publisherId, state.streamName, function (err, stream, extra) {
			tool.stream = this;

			// if feed stream invalid or closed - exit
			if (!Q.Streams.isStream(tool.stream) || !!Q.getObject(["fields", "closedTime"], tool.stream)) {
				Q.alert(tool.text.channels.ChannelClosed);
				return tool.remove();
			}

			// whether user have permissions to edit feed
			isAdmin = tool.isAdmin = tool.stream.testWriteLevel('close');

			// check if user is publisher or admin for current community
			if (isAdmin) {
				state.show.closeChannel = true;
			}

			if (!tool.stream.testReadLevel('participants')) {
				state.show.participants = false;
			}

			tool.participants = extra.participants || [];
			if (state.hideParticipants === false) { // || Q.isEmpty(tool.participants)
				state.show.participants = false;
			}

			var fields = Q.extend({
				stream: tool.stream,
				text: tool.text.channels
			}, state);

			Q.Template.render("Media/channel", fields, function (err, html) {
				if (err) {
					return;
				}
				tool.element.innerHTML = html;
				Q.activate(tool.element, function () {
					// close event button handler
					tool.$(".Media_aspect_close").on(Q.Pointer.fastclick, function () {
						var $this = $(this);

						$this.addClass("Q_working");

						Q.Streams.get(
							tool.stream.fields.publisherId,
							tool.stream.fields.name,
							function (err, stream, extra) {
								var msg = Q.firstErrorMessage(err);
								if (msg) {
									$this.removeClass("Q_working");
									console.warn(msg);
									return;
								}
								_closeFeed();
							},
							{participants: 1000}
						);

						function _closeFeed(){
							// send request to close feed
							Q.req('Media/channel', '', function (err, response) {
								var r = response && response.errors;
								var msg = Q.firstErrorMessage(err, r);
								if (msg) {
									return Q.alert(msg);
								}

								Q.handle(state.onClose, tool);
							}, {
								method: 'delete',
								fields: {
									publisherId: tool.stream.fields.publisherId,
									streamName: tool.stream.fields.name
								}
							});
						}

						return false;
					});

					// icon
					$("<div>").tool("Streams/preview", Q.extend({
						closeable: false,
						editable: true
					}, state)).activate(function () {
						this.icon(tool.$("img.Streams_preview_icon")[0]);
					});

					// related clips
					tool.$(".Media_channel_clips").tool("Streams/related", {
						publisherId: state.publisherId,
						streamName: state.streamName,
						relationType: "Media/clip",
						creatable: {
							"Media/clip": {
								title: tool.text.NewClip
							}
						}
					}).activate();
				});

			});
		}, {
			participants: 100
		});
	}
}

);

Q.Template.set('Media/channel',
`
	<img class="Streams_preview_icon Q_square">
	{{{tool "Streams/inplace" "title" field="title" inplaceType="text" inplace-placeholder="Title of feed" inplace-selectOnEdit=true publisherId=stream.fields.publisherId streamName=stream.fields.name}}}
	{{#if show.participants}}
		{{{tool "Streams/participants" "feed" max=peopleMax maxShow=10 showSummary=false showControls=true publisherId=stream.fields.publisherId streamName=stream.fields.name }}}
	{{/if}}
	{{#if show.closeFeed}}
		<div class="Q_button Media_aspect_close">
			<div class="Media_info_icon"><img alt="Close Feed" src="{{toUrl "Q/plugins/Calendars/img/white/close.png"}}"></div>
			<div class="Media_info_content">{{text.CloseFeed.button}}</div>
		</div>
	{{/if}}
	<div class="Media_channel_clips"></div>
`
);

})(Q, Q.jQuery, window);