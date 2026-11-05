(function (Q, $, window, undefined) {

/**
 * Background for .Media_channel_cover when no cover image has been set
 * (either no Media/channel/cover relation at all yet, or one exists but
 * its own icon is still Streams/image's own unset default -- same "/Q/
 * plugins/" detection used for the channel icon's own avatar fallback,
 * see refresh() below). A plain inline SVG data URL, not a real asset
 * file, so there's nothing to upload/host for a placeholder -- built
 * with encodeURIComponent() rather than hand-escaped, so the quotes and
 * "#" in the fill colors don't need any manual care.
 * @property _coverPlaceholderUrl
 * @private
 */
var _coverPlaceholderUrl = "url('data:image/svg+xml," + encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 300">'
	+ '<rect width="1000" height="300" fill="#2a2a2e"/>'
	+ '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"'
	+ ' font-family="sans-serif" font-size="36" fill="#7a7a82">No cover image</text>'
	+ '</svg>'
) + "')";

/**
 * Media/channel tool.
 * Renders interface for Media channel
 * @method Media/channel
 * @param {Object} [options] this is an object that contains parameters for this function
 *   @param {String} options.publisherId The publisher id
 *   @param {String} options.streamName The name of the stream
 */
Q.Tool.define("Media/channel", function(options) {
	var tool = this;
	var state = this.state;
	var $toolElement = $(this.element);

	if (!state.publisherId) {
		throw new Q.Exception("Media/channel: publisherId required!");
	}
	if (!state.streamName) {
		throw new Q.Exception("Media/channel: streamName required!");
	}

	// update column title
	var $column = $toolElement.closest(".Media_column_channel");
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

			// Follow button -- never shown to the channel's own owner,
			// and only when the app has opted into the feature (see
			// Media.channel.allowFollow, default false)
			state.showFollow = !isAdmin && !!Q.getObject("Media.channel.allowFollow", Q.plugins);

			if (!tool.stream.testReadLevel('participants')) {
				state.show.participants = false;
			}

			tool.participants = extra.participants || [];
			if (state.hideParticipants === false) { // || Q.isEmpty(tool.participants)
				state.show.participants = false;
			}

			// Whether to show the full Streams/participants list, or just
			// a "<N> followers" count in its place (see Media.channel.
			// showParticipants's own doc comment, default true -- Fans
			// overrides this to false). Read-level/hideParticipants above
			// can only ever turn the list off, never back on, so this is
			// applied as a further restriction on top, not a replacement.
			var showParticipants = Q.getObject("Media.channel.showParticipants", Q.plugins) !== false;
			if (!showParticipants) {
				state.show.participants = false;
			}
			state.show.followersCount = !showParticipants;

			var fields = Q.extend({
				stream: tool.stream,
				text: tool.text.channels,
				// Read by the shared 'Media/followButton' partial (see
				// Media.js) -- a separate field from "text" above since
				// Media/clip.js's own playerOnly template, which includes
				// the same partial, already uses "text" for its own,
				// differently-shaped tool.text (the whole object, not
				// just .channels).
				channelsText: tool.text.channels
			}, state);

			Q.Template.render("Media/channel", fields, function (err, html) {
				if (err) {
					return;
				}

				Q.replace(tool.element, html);

				var $cover = tool.$(".Media_channel_cover");
				var $coverEdit = tool.$(".Media_channel_cover i");

				// Show the placeholder immediately, before the async
				// _getOrCreateCoverImageStream() call below resolves, so
				// there's no flash of blank background while it loads.
				$cover[0].style['background-image'] = _coverPlaceholderUrl;

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

					// Same "/Q/plugins/" detection used for the channel
					// icon's own avatar fallback -- a real uploaded cover
					// lives under "/Q/uploads/...", while the platform's
					// own built-in default icon (never actually a real
					// cover photo) lives under "/Q/plugins/...". Only
					// override the placeholder set above when there's an
					// actual uploaded cover to show.
					var hasOwnCover = coverStream.fields.icon
						&& coverStream.fields.icon.indexOf('/Q/plugins/') === -1;
					if (hasOwnCover) {
						$cover[0].style['background-image'] = "url(" + _getCoverUrl() + ")";
					}

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
					var $icon = tool.$("img.Media_channel_icon");
					this.icon($icon[0]);

					// A very new channel can have no real icon of its own
					// yet -- fields.icon either still Media/channel's own
					// configured default (confirmed live to be an already-
					// expanded "/Q/plugins/..." path, not the short symbolic
					// name from config -- same detection Media/channel/
					// preview.js's own mediaChannel row already uses) or,
					// for a channel created through a path that never even
					// filled that default in, genuinely empty -- either way
					// icon() above just rendered a blank/broken <img>. Fall
					// back to the creator's own avatar, same as the
					// channels list does. Checked (and, for the broken-
					// image case, re-checked on the element's own native
					// error event, since icon()'s onLoad callback is itself
					// gated on the ORIGINAL image successfully loading --
					// it never fires at all for a 404, so it can't be used
					// to trigger this) right after calling icon() above,
					// not before -- icon() unconditionally sets element.src
					// itself, so setting it first would just get
					// overwritten. Only ever changes src, never touches the
					// imagepicker click-to-change wiring icon() just set up
					// on this same element, so that keeps working exactly
					// as before.
					var _fallbackToAvatar = function () {
						if ($icon.data('Media_channel_icon_fallback')) {
							return;
						}
						$icon.data('Media_channel_icon_fallback', true);
						Q.Streams.Avatar.get(tool.stream.fields.publisherId, function (err, avatar) {
							if (!err && avatar) {
								$icon.attr('src', avatar.iconUrl(80));
							}
						});
					};
					var icon = tool.stream.fields.icon;
					if (!icon || icon.indexOf('/Q/plugins/') >= 0) {
						_fallbackToAvatar();
					} else {
						$icon.one('error', _fallbackToAvatar);
					}
				});

				// title
				tool.$(".Media_channel_title").tool("Streams/inplace", {
					publisherId: state.publisherId,
					streamName: state.streamName,
					field: "title",
					inplaceType: "text"
				}).activate();

				// follow / subscribe / mute / unfollow -- shared with
				// Media/clip.js's own Follow button (see Media.js's own
				// Q.Media.wireFollowButton and 'Media/followButton'
				// template, used by both via {{> Media/followButton}}).
				var $follow = tool.$(".Media_channel_follow");
				if ($follow.length) {
					Q.Media.wireFollowButton(tool, $follow, tool.stream);
				}

				// share -- same Q.Streams.invite(publisherId, streamName)
				// call Media/clip.js's own Share button uses (see its
				// refresh()), just for the channel stream instead of the
				// episode/clip stream.
				tool.$(".Media_channel_share_btn").on(Q.Pointer.fastclick, function () {
					Q.Streams.invite(state.publisherId, state.streamName, { dontAutoAccept: false });
				});

				// participants
				tool.$(".Media_channel_participants").tool("Streams/participants", {
					showSummary: false,
					showControls: true,
					publisherId: state.publisherId,
					streamName: state.streamName
				}).activate();

				// followers count -- shown instead of the participants list
				// when Media.channel.showParticipants is false (see
				// state.show.followersCount, set in refresh() above).
				var $followersCount = tool.$(".Media_channel_followersCount");
				if ($followersCount.length) {
					Q.req('Media/channel', ['followersCount'], function (err, response) {
						var count = !err && response && response.slots
							? response.slots.followersCount : 0;
						var text = tool.text.channels;
						$followersCount.text(count + ' ' + (count === 1 ? text.Follower : text.Followers));
					}, {
						method: 'get',
						fields: {
							publisherId: state.publisherId,
							streamName: state.streamName
						}
					});
				}

				// related clips
				tool.$(".Media_episodes").tool("Streams/related", {
					publisherId: state.publisherId,
					streamName: state.streamName,
					relationType: "Media/episode",
					closeable: true,
					editable: true,
					sortable: false,
					specificOptions: {
						// Was hardcoded to "cards", silently overriding
						// Media/episode/preview's own config-driven default
						// (Media.clip.episodePreviewLayout) -- read the same
						// config here instead, same fix as Fans' clips.php,
						// so apps that set it to "largeThumbCard" (e.g. Fans)
						// get that here too, while anyone not setting it
						// keeps today's "cards" behavior unchanged.
						layout: Q.getObject("Media.clip.episodePreviewLayout", Q.plugins) || "cards",
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
	},
	Q: {
		beforeRemove: function () {

		}
	}
}

);

Q.Template.set('Media/channel',`
	<div class="Media_channel_cover">{{#if isAdmin}}<i class="qp-media-pencil"></i>{{/if}}</div>
	<img class="Media_channel_icon">
	<div class="Media_channel_title"></div>
	{{#if show.followersCount}}
		<div class="Media_channel_followersCount"></div>
	{{/if}}
	<div class="Media_channel_actions">
		{{#if showFollow}}
			{{> Media/followButton}}
		{{/if}}
		<button class="Media_channel_share_btn Media_clip_share_btn Q_button" type="button">
			<svg viewBox="0 0 24 24" width="18" height="18" fill="none"
				stroke="currentColor" stroke-width="2" stroke-linecap="round"
				stroke-linejoin="round">
				<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/>
				<polyline points="16 6 12 2 8 6"/>
				<line x1="12" y1="2" x2="12" y2="15"/>
			</svg>
			<span>{{text.Share}}</span>
		</button>
	</div>
	{{#if show.participants}}
		<div class="Media_channel_participants"></div>
	{{/if}}
	{{#if show.closeChannel}}
		<button class="Q_button" name="closeChannel">Close channel</button>
	{{/if}}
	<div class="Media_episodes Media_episodes_cards"></div>
`,
	{
		partials: ['Media/followButton']
	}
);

})(Q, Q.jQuery, window);