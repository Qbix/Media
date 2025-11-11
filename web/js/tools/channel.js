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
	},
	onClose: new Q.Event(function () {
		var $column = $(this.element).closest(".Media_column_channel");
		if ($column.length) {
			var columns = Q.Tool.from($column.closest(".Q_columns_tool")[0], "Q/columns");
			if (columns) {
				columns.close($column[0]);
			}
		}
	})
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
			if (isAdmin && state.streamName !== "Media/channel/main") {
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
					tool.$("button[name=closeChannel]").on(Q.Pointer.fastclick, function () {
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

								// send request to close feed
								Q.req('Media/channel', '', function (err, response) {
									var r = response && response.errors;
									var msg = Q.firstErrorMessage(err, r);
									if (msg) {
										$this.removeClass("Q_working");
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
							},
							{participants: 1000}
						);
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
					tool.$(".Media_episodes").tool("Streams/related", {
						publisherId: state.publisherId,
						streamName: state.streamName,
						relationType: "Media/episode",
						closeable: true,
						editable: true,
						sortable: false,
						specificOptions: {
							layout: "cards",
							templateStyle: "square"
						},
						creatable: {
							"Media/episode": {
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

Q.Template.set('Media/channel',`
	<img class="Streams_preview_icon Q_square">
	{{{tool "Streams/inplace" "title" field="title" inplaceType="text" inplace-placeholder="Title of feed" inplace-selectOnEdit=true publisherId=stream.fields.publisherId streamName=stream.fields.name}}}
	{{#if show.participants}}
		{{{tool "Streams/participants" "feed" max=peopleMax maxShow=10 showSummary=false showControls=true publisherId=stream.fields.publisherId streamName=stream.fields.name}}}
	{{/if}}
	{{#if show.closeChannel}}
		<button class="Q_button" name="closeChannel">Close channel</button>
	{{/if}}
	<div class="Media_episodes Media_episodes_cards"></div>
`);

})(Q, Q.jQuery, window);