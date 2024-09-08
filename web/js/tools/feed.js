(function (Q, $, window, undefined) {

var Media = Q.Media;
var Users = Q.Users;
var Streams = Q.Streams;

/**
 * Media/feed tool.
 * Renders interface for Media feed
 * @method Media/feed
 * @param {Object} [options] this is an object that contains parameters for this function
 *   @param {String} options.publisherId The publisher id
 *   @param {String} options.streamName The name of the stream
 *   @param {Object} options.show
 *   @param {Boolean} [options.show.rtmp=true]
 *   @param {Boolean} [options.show.participants=true]
 *   @param {Boolean} [options.show.chat=true]
 *   @param {Boolean} [options.show.time=true]
 *   @param {Boolean} [options.show.location=true]
 *   @param {Boolean} [options.startDate] Show only clips created after this date
 *   @param {Boolean} [options.endDate] Show only clips created before this date
 *   @param {Boolean|Integer} [options.hideParticipants=0] If integer, hide participants tool if participants less or equal to this number.
 *   If false, never hide participants tool.
 *   @param {array} [clips] Pass here clips objects in format {offset: <seconds>, duration: <seconds>, url: <string>} to show them in Q/video
 *   @param {Q.Event} [options.onRefresh] Occurs when the tool is refreshed
 *   @param {Q.Event} [options.onInvoke(button)] Occurs when the user clicks one of the buttons.
 *   @param {Q.Event} [options.onClose] Occurs when feed closed
 */
Q.Tool.define("Media/feed", function(options) {
	var tool = this;
	var state = this.state;
	var $toolElement = $(this.element);

	if (!state.publisherId) {
		throw new Q.Exception("Media/feed: publisherId required!");
	}
	if (!state.streamName) {
		throw new Q.Exception("Media/feed: streamName required!");
	}

	$toolElement.attr("data-admin", Q.getObject("isFeedsAdmin", Media));

	var pipe = new Q.pipe(['texts', 'style'], tool.refresh.bind(tool));

	// get Calendars texts
	Q.Text.get('Media/content', function (err, content) {
		var msg = Q.firstErrorMessage(err, content);
		if (msg) {
			return console.error(msg);
		}

		tool.text = content;
		tool.closeFeedConfirm = content.feed.CloseFeedConfirm;
		pipe.fill('texts')();
	});

	Q.addStylesheet('{{Media}}/css/tools/feed.css', { slotName: 'Media' }, pipe.fill('style'));

	// listen for related clips
	Streams.Stream.onMessage(state.publisherId, state.streamName, 'Streams/relatedTo').set(function(message) {
		var instructions = JSON.parse(message.instructions);
		var $videoBox = tool.$(".Media_feed_video");

		// add clip to Q/video tool
		if (Q.getObject("fromType", instructions) !== "Media/clip") {
			return;
		}

		Streams.get(instructions.fromPublisherId, instructions.fromStreamName, function (err) {
			if (err) {
				return;
			}

			var clipStream = this;
			var clip = {
				offset: 0,
				duration: parseInt(clipStream.getAttribute("duration") || 60000)/1000,
				url: Q.url(clipStream.fileUrl())
			};
			var videoTool = Q.Tool.from($videoBox[0], "Q/video");
			if (videoTool) {
				var pointers = videoTool.state.clips.pointers;
				var lastPointer = pointers[pointers.length - 1];

				clip.offset = Q.getObject("end", lastPointer) || 0;
				state.clips.push(clip);
				videoTool.addClipsPointer(clip);
			} else {
				state.clips.push(clip);
				tool.createVideo();
			}
		});

	}, tool);
},

{
	publisherId: null,
	streamName: null,
	show: {
		participants: false,
		closeFeed: false,
		chat: true,
		time: false,
		location: true
	},
	clips: [],
	startDate: null,
	endDate: null,
	hideParticipants: 0,
	skipClickable: [".Q_aspect_when"],
	onRefresh: new Q.Event(),
	onInvoke: Q.Event.factory(),
	onClose: new Q.Event()
},

{
	/**
	 * Refresh the HTML of the tool
	 * @method refresh
	 */
	refresh: function () {
		var tool = this;
		var $te = $(this.element);
		var state = tool.state;
		var isAdmin = false;
		var userId = Users.loggedInUserId();

		Streams.retainWith(tool).get.force(state.publisherId, state.streamName, function (err, feedStream, extra) {
			tool.stream = this;

			// if feed stream invalid or closed - exit
			if (!Streams.isStream(tool.stream) || !!Q.getObject(["fields", "closedTime"], tool.stream)) {
				Q.alert(tool.text.feed.FeedAlreadyClosed);
				return tool.remove();
			}

			// whether user have permissions to edit feed
			isAdmin = state.isAdmin = tool.stream.testWriteLevel('close');

			// on feed state changed feed
			tool.stream.onAttribute('state').set(function (attributes, k) {
				// if feed stream closed - remove tool
				if(attributes[k] === "closed"){

					// execute delete feed
					Q.handle(state.onInvoke("close"), tool, [tool.stream]);

					// remove tool if it didn't removed yet
					if (tool && !tool.removed) {
						Q.Tool.remove(tool.element);
					}
				}
			}, tool);

			// check if user is publisher or admin for current community
			if (isAdmin) {
				state.show.closeFeed = true;
			}

			if (!tool.stream.testReadLevel('participants')) {
				state.show.participants = false;
			}

			// check if venue is a part of address
			var location = tool.stream.getAttribute("location");
			if (location) {
				var venue = location.venue;
				var address = location.address;
				if (Q.typeOf(venue) === 'string' && Q.typeOf(address) === 'string' && venue.length > 0 && address.includes(venue)) {
					state.venueRedundant = true;
				}
			} else {
				state.show.location = false;
			}

			tool.participants = extra.participants || [];
			if (state.hideParticipants === false || Q.isEmpty(tool.participants)) {
				state.show.participants = false;
			}

			var fields = Q.extend({
				location: location,
				stream: tool.stream,
				rtmpLink: Media.getRTMPlink(tool.stream),
				text: tool.text.feed
			}, state);

			Q.Template.render("Media/feed", fields,function (err, html) {
				if (err) {
					return;
				}
				tool.element.innerHTML = html;
				Q.activate(tool.element, _proceed.bind(tool.stream));

				tool.$('.Media_info .Q_button').click(function () {
					var $this = $(this);
					var aspect = $this.attr('data-invoke');
					Q.handle(state.onInvoke(aspect), tool, [tool.stream, $this]);
				});

				// copy rtmp link to clipboard
				tool.$('.Streams_aspect_rtmp').click(function () {
					var textArea = document.createElement("textarea");
					textArea.value = Media.getRTMPlink(tool.stream);
					textArea.style.position = "absolute";
					textArea.style.top = "-1000px";
					document.body.appendChild(textArea);
					textArea.focus();
					textArea.select();
					document.execCommand('copy');
					textArea.remove();
				});

				var $rtmpContent = tool.$('.Streams_aspect_rtmp .Media_feed_rtmp');
				var widthDiff = $rtmpContent.width() - $("span", $rtmpContent).width();
				if (widthDiff < 0) {
					var moveTextLink = function (value) {
						$rtmpContent.animate({
							"text-indent": value
						}, 10000, function () {
							moveTextLink(value ? 0 : widthDiff);
						});
					};
					moveTextLink(widthDiff);
				}

				tool.$('.Media_info > div.Q_button').not(state.skipClickable.join()).plugin('Q/clickable', {
					press: {size: 1.2},
					release: {size: 1.2}
				});
			});
		}, {
			participants: 100
		});

		function _proceed () {
			var participantsTool = tool.child('Streams_participants');
			if (participantsTool) {
				participantsTool.Q.onStateChanged('count').add(function () {
					var $participants = $(participantsTool.element);
					if (state.hideParticipants === false || this.state.count > (parseInt(state.hideParticipants))) {
						$participants.show();
					} else {
						$participants.hide();
					}
				});
			}

			var $unseen = tool.$('.Streams_aspect_chats .Media_info_unseen');
			Q.Streams.Message.Total.setUpElement(
				$unseen[0],
				state.publisherId,
				state.streamName,
				'Streams/chat/message',
				tool
			);
			// some time this element appear in wrong place,
			// so wait till parent rendered and remove this attr to place element to right place
			setTimeout(function () {
				$unseen.removeAttr('data-state');
			}, 1000);

			// close event button handler
			tool.$(".Media_aspect_close").on(Q.Pointer.fastclick, function () {
				var $this = $(this);

				$this.addClass("Q_working");

				Streams.get(
					tool.stream.fields.publisherId,
					tool.stream.fields.name,
					function (err, stream, extra) {
						var msg = Q.firstErrorMessage(err);
						if (msg) {
							$this.removeClass("Q_working");
							console.warn(msg);
							return;
						}
						var participants = 0;
						Q.each(extra && extra.participants, function (userId, participant) {
							// skip feed publisher and participants with wrong state
							if (participant.state !== 'participating'
							|| userId === tool.stream.fields.publisherId) {
								return;
							}
							++participants;
						});
						/*if (participants) {
							var participantsConfirmText = tool.text.feed.CloseFeed.Cancel + "<br>";
							if (participants > 1) {
								participantsConfirmText += tool.text.feed.CloseFeed.Participants.interpolate({
									count: participants
								});
							} else {
								participantsConfirmText += tool.text.feed.CloseFeed.Participant;
							}
							return Q.confirm(participantsConfirmText, function (choice) {
								if (choice) {
									_closeFeed();
								} else {
									$this.removeClass("Q_working");
								}
							},
							{ title: tool.text.feed.CloseFeed.button }
							);
						}*/
						_closeFeed();
					}, 
					{participants: 1000}
				);
				
				function _closeFeed(){
					// send request to close feed
					Q.req('Media/feed', '', function (err, response) {
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

			// create Q/video
			if (state.clips.length) { // if clips defined in state
				tool.createVideo();
			} else { // get related clips streams
				Streams.related.force(state.publisherId, state.streamName, "Media/clip", true, {
					withParticipant: false,
					ascending: true,
					min: state.startDate,
					max: state.endDate
				}, function () {
					var relatedStreams = Q.getObject("relatedStreams", this);
					var offset = 0;
					Q.each(relatedStreams, function () {
						var duration = parseInt(this.getAttribute("duration") || 60000)/1000;
						state.clips.push({
							offset: offset,
							duration: duration,
							url: Q.url(this.fileUrl())
						});
						offset += duration;
					});

					if (!state.clips.length) {
						return tool.$(".Media_feed_video").addClass("Media_feed_video_empty").html(tool.text.feed.EmptyVideos);
					}

					tool.createVideo();
				});
			}
		}
	},
	/**
	 * Create Q/video tool with clips using state.clips
	 * @method createVideo
	 */
	createVideo: function () {
		var tool = this;
		var state = this.state;

		if (!state.clips.length) {
			return console.warn("Media/feed: clips list epty");
		}

		tool.$(".Media_feed_video").tool("Q/video", {
			url: state.clips[0].url,
			metrics: false,
			clips: {
				handler: function (offset) {
					var res = null;
					Q.each(state.clips, function () {
						if (offset >= this.offset && offset <= this.offset + this.duration) {
							res = this;
						}
					});

					return res;
				}
			}
		}).activate();
	},
	Q: {
		beforeRemove: function () {
			clearInterval(this.state.interval);
		}
	}
}

);

Q.Template.set('Media/feed',
'<div class="Media_info">' +
	'	<div class="Media_feed_title">' +
	'		{{{tool "Streams/inplace" "title" field="title" inplaceType="text" inplace-placeholder="Title of feed" inplace-selectOnEdit=true publisherId=stream.fields.publisherId streamName=stream.fields.name}}}' +
	'	</div>' +
	'	<div class="Media_feed_video"></div>' +
	'{{#if show.participants}}' +
	'	{{{tool "Streams/participants" "feed" max=peopleMax maxShow=10 showSummary=false showControls=true publisherId=stream.fields.publisherId streamName=stream.fields.name }}}' +
	'{{/if}}' +
	'	<div class="Q_button Streams_aspect_rtmp" data-invoke="rtmp">' +
	'		<div class="Feed_info_icon"><i class="qp-media-camera1"></i></div>' +
	'		<div class="Media_info_content Media_feed_rtmp"><span>{{rtmpLink}}</span></div>' +
	'		<div class="Media_info_note Media_info_content">{{text.RtmpLinkNote}}</div>' +
	'	</div>' +
	'	{{#if show.chat}}' +
	'		<div class="Q_button Streams_aspect_chats" data-invoke="chat">' +
	'			<div class="Feed_info_icon"><i class="qp-media-chat"></i></div>' +
	'			<div class="Media_info_content">{{text.Conversation}}</div>' +
	'			<div class="Media_info_unseen" data-state="waiting"></div>' +
	'		</div>' +
	'	{{/if}}' +
	'	{{#if show.time}}' +
	'		<div class="Q_button Q_aspect_when" data-invoke="time">' +
	'			<div class="Media_info_icon"><i class="qp-media-time"></i></div>' +
	'			<div class="Media_info_content">{{{tool "Q/timestamp" "start" capitalized=true}}}</div>' +
	'		</div>' +
	'	{{/if}}' +
	'	{{#if show.location}}' +
	'		<div class="Q_button Q_aspect_where" data-invoke="local">' +
	'			<div class="Media_info_icon"><i class="qp-media-location"></i></div>' +
	'			<div class="Media_info_content">' +
	'				<div class="Media_location_venue" data-redundant={{venueRedundant}}>{{location.venue}}</div>' +
	'				<div class="Media_location_address">{{location.address}}</div>' +
	'				<div class="Media_location_area">{{location.area.title}}</div>' +
	'			</div>' +
	'		</div>' +
	'	{{/if}}' +
	'	{{#if show.closeFeed}}' +
	'		<div class="Q_button Media_aspect_close">' +
	'			<div class="Media_info_icon"><img alt="Close Feed" src="{{toUrl "Q/plugins/Calendars/img/white/close.png"}}"></div>' +
	'			<div class="Media_info_content">{{text.CloseFeed.button}}</div>' +
	'		</div>' +
	'	{{/if}}' +
	'</div>'
);

})(Q, Q.jQuery, window);