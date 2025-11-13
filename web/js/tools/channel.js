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

	// update column title
	var $column = $(this.element).closest(".Media_column_channel");
	if ($column.length) {
		$(".Q_title_slot", $column).tool("Streams/inplace", {
			publisherId: state.publisherId,
			streamName: state.streamName,
			field: "title",
			editable: false
		}).activate();
	}

	this.refresh();
},

{
	publisherId: null,
	streamName: null,
	show: {
		participants: true,
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
			isAdmin = state.isAdmin = tool.stream.testWriteLevel('close');

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

				Q.replace(tool.element, html);

				var $cover = tool.$(".Media_channel_cover");
				var $coverEdit = tool.$(".Media_channel_cover i");
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

				// cover image
				_getOrCreateCoverImageStream(function (err, coverStream) {
					if (err || !coverStream) {
						return;
					}

					var _getCoverUrl = function () {
						return coverStream.iconUrl(Q.image.defaultSize['Users/cover']) + '?' + new Date().getTime();
					};

					$cover[0].style['background-image'] = "url(" + _getCoverUrl() + ")";

					if (!isAdmin) {
						return;
					}

					$coverEdit[0].style['display'] = 'block';
					var splitId = coverStream.fields.publisherId.splitId('');
					var subpath = splitId + '/' + coverStream.fields.name + '/icon/' +  + Math.floor(Date.now()/1000);
					Q.Tool.setUpElement($coverEdit[0], 'Q/imagepicker', {
						saveSizeName: 'Users/cover',
						//showSize: state.icon || $img.width(),
						path: 'Q/uploads/Streams',
						subpath: subpath,
						save: "Users/cover",
						onSuccess: function () {
							coverStream.refresh(function () {
								$cover[0].style['background-image'] = "url(" + _getCoverUrl() + ")";
							}, {
								messages: true,
								changed: {icon: true},
								evenIfNotRetained: true
							});
						}
					});
					Q.activate($coverEdit[0]);
				});

				// icon
				$("<div>").tool("Streams/preview", Q.extend({
					closeable: false,
					editable: true,
					imagepicker: {
						showSize: "80"
					}
				}, state)).activate(function () {
					this.icon(tool.$("img.Media_channel_icon")[0]);
				});

				// title
				tool.$(".Media_channel_title").tool("Streams/inplace", {
					publisherId: state.publisherId,
					streamName: state.streamName,
					field: "title",
					inplaceType: "text"
				}).activate();

				// participants
				tool.$(".Media_channel_participants").tool("Streams/participants", {
					showSummary: false,
					showControls: true,
					publisherId: state.publisherId,
					streamName: state.streamName
				}).activate();

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
		}, {
			participants: 100
		});

		var _getOrCreateCoverImageStream = function (callback) {
			var relationType = "Media/channel/cover";
			Q.Streams.related.force(state.publisherId, state.streamName, relationType, true, {
				withParticipant: false
			}, function (err) {
				if (err) {
					return Q.handle(callback, null, [err]);
				}

				if (this.relations.length) {
					Q.Streams.get.force(this.relations[0].fromPublisherId, this.relations[0].fromStreamName, function (err) {
						if (err) {
							return Q.handle(callback, null, [err]);
						}

						Q.handle(callback, this, [null, this]);
					});
					return;
				}

				if (!isAdmin) {
					return Q.handle(callback, null);
				}

				Q.Streams.create({
					publisherId: state.publisherId,
					type: 'Streams/image',
					readLevel: 40
				}, function (err) {
					if (err) {
						return Q.handle(callback, null, [err]);
					}

					Q.handle(callback, this, [null, this]);
				}, {
					publisherId: state.publisherId,
					streamName: state.streamName,
					type: relationType
				});
			});
		};
	}
}

);

Q.Template.set('Media/channel',`
	<div class="Media_channel_cover">{{#if isAdmin}}<i class="qp-media-pencil"></i>{{/if}}</div>
	<img class="Media_channel_icon">
	<div class="Media_channel_title"></div>
	{{#if show.participants}}
		<div class="Media_channel_participants"></div>
	{{/if}}
	{{#if show.closeChannel}}
		<button class="Q_button" name="closeChannel">Close channel</button>
	{{/if}}
	<div class="Media_episodes Media_episodes_cards"></div>
`);

})(Q, Q.jQuery, window);