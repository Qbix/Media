/**
 * Media/webrtc/event tool.
 * Manages WebRTC teleconference within a Calendars event:
 *   - Tracks the related WebRTC stream
 *   - Shows join/scheduler buttons for hosts
 *   - Displays a participant list
 *   - Posts "join" notices when the event starts
 *   - Starts/stops WebRTC rooms
 *
 * Activated as a child tool inside Calendars/event.
 *
 * @module Media-webrtc-event
 * @class Media/webrtc/event
 */
(function (Q, $, window, undefined) {

var Users = Q.Users;
var Streams = Q.Streams;

Q.Tool.define("Media/webrtc/event", function (options) {
	var tool = this;
	var state = tool.state;

	if (!state.publisherId || !state.streamName) {
		return;
	}

	tool.webrtcParticipants = {};

	// fetch the event stream to get timing + permissions
	Streams.retainWith(tool).get(
		state.publisherId, state.streamName,
		function (err) {
			if (err) {
				return;
			}
			if (tool.removed || !tool.element.isConnected) {
				return;
			}
			tool.eventStream = this;
			tool.refresh();
		}
	);
},

// ── Default options ───────────────────────────────────────────────
{
	publisherId: null,
	streamName: null,
	teleconference: false,
	startTime: null,
	autoStart: true,
	onWebrtcStarted: new Q.Event(),
	onWebrtcEnded: new Q.Event()
},

// ── Methods ───────────────────────────────────────────────────────
{
    refresh: function () {
        var tool = this;
        var state = tool.state;

        if (tool.removed || !tool.element.isConnected) {
            return;
        }

        if (!state.teleconference) {
            return;
        }

        Q.Template.render('Media/webrtc/event', {
            text: tool.text
        }, function (err, html) {
            if (err) {
                return;
            }
            if (tool.removed || !tool.element.isConnected) {
                return;
            }
            tool.element.innerHTML = html;

            Q.activate(tool.element, function () {
                tool._findWebrtcStream();
                tool._bindUIEvents();
                tool._trackEventStart();
                tool._updateStateAttr();
            });
        });
    },

	/**
	 * Find the related WebRTC stream for this event.
	 * @method _findWebrtcStream
	 * @private
	 */
	_findWebrtcStream: function () {
		var tool = this;
		var state = tool.state;

		Streams.related(
			state.publisherId, state.streamName,
			'Calendars/event/webrtc', true,
			{ dontFilterUsers: true },
			function () {
				if (tool.removed || !tool.element.isConnected) {
					return;
				}

				var webrtcStream = null;
				for (var i in this.relatedStreams) {
					if (this.relatedStreams[i].fields.type === 'Media/webrtc') {
						webrtcStream = this.relatedStreams[i];
						break;
					}
				}

				if (!webrtcStream) {
					return;
				}

				// fetch with participants
				Streams.get(
					webrtcStream.fields.publisherId,
					webrtcStream.fields.name,
					function (err, stream, extra) {
						if (tool.removed || !tool.element.isConnected) {
							return;
						}
						if (!stream) {
							return console.warn('WebRTC stream not found');
						}
						tool.webrtcStream = stream;
						tool._updateHostControls();
						tool._askToJoinIfHappening();
                        tool._updateStateAttr();
						tool._trackWebrtcParticipants(
							Object.keys(extra.participants)
						);
					},
					{ participants: 20 }
				);
			}
		);
	},

	/**
	 * Show/hide host-only controls (scheduler, enter room).
	 * @method _updateHostControls
	 * @private
	 */
	_updateHostControls: function () {
		var tool = this;
		var $schedulerBtn = tool.$(".Media_webrtc_event_scheduler");
		var $enterBtn = tool.$(".Media_webrtc_event_enter");

		if (!$schedulerBtn.length) {
			return;
		}

		if (!tool.webrtcStream || !tool.webrtcStream.testWriteLevel(40)) {
			return;
		}

		$schedulerBtn.removeClass("Q_hidden");
		if (!tool._eventIsHappening()) {
			$enterBtn.removeClass("Q_hidden");
		} else {
			$enterBtn.addClass("Q_hidden");
		}
	},

    /**
     * Reflect the event's temporal state onto the tool root element,
     * so the CSS can show the right sub-element in the button.
     * @method _updateStateAttr
     * @private
     */
    _updateStateAttr: function () {
        var stream = this.eventStream;
        if (!stream) return;
        if (this.removed || !this.element.isConnected) return;
        var now = Date.now();
        var start = stream.getAttribute('startTime') * 1000;
        var end = stream.getAttribute('endTime') * 1000;
        var state = (end < now) ? 'ended'
                : (start < now) ? 'happening'
                : 'waiting';
        this.element.setAttribute('data-state', state);
    },

	/**
	 * Bind click handlers for buttons.
	 * @method _bindUIEvents
	 * @private
	 */
	_bindUIEvents: function () {
		var tool = this;

		// join teleconference button
		tool.$(".Media_webrtc_event_join").on(Q.Pointer.fastclick + '.Media_webrtc_event', function () {
			tool._startWebRTC();
		});

		// scheduler (host only)
		tool.$(".Media_webrtc_event_scheduler").on(Q.Pointer.fastclick + '.Media_webrtc_event', function () {
			if (!tool.webrtcStream) {
				return;
			}
			Q.Dialogs.push({
				title: Q.getObject(['event', 'tool', 'updateTeleconference'], tool.text),
				apply: true,
				content: Q.Tool.setUpElement('div', 'Media/webrtc/scheduler', {
					publisherId: tool.webrtcStream.fields.publisherId,
					streamName: tool.webrtcStream.fields.name,
					showSaveButton: true
				}),
				onActivate: function (dialogElement, dialogObj) {
					tool._schedulerTool = Q.Tool.from(
						dialogObj.content, 'Media/webrtc/scheduler'
					);
				},
				onClose: function () {
					if (tool._schedulerTool) {
						tool._schedulerTool.createOrUpdateWebRTCStream()
							.catch(function (msg) {
								Q.Notices.add({ content: msg, timeout: 5 });
							});
					}
				}
			});
		});

		// enter room early (host only)
		tool.$(".Media_webrtc_event_enter").on(Q.Pointer.fastclick + '.Media_webrtc_event', function () {
			if (!tool.webrtcStream || !Q.Media) {
				return;
			}
			var roomId = tool.webrtcStream.fields.name.replace('Media/webrtc/', '');
			var conference = Q.Media.WebRTC({
				element: document.body,
				roomId: roomId,
				roomPublisherId: tool.webrtcStream.fields.publisherId,
				resumeClosed: true,
				defaultDesktopViewMode: 'maximized',
				defaultMobileViewMode: 'audio',
				mode: 'node',
				startWith: { video: false, audio: true },
				audioOnlyMode: false
			});
			conference.start();
		});
	},

	/**
	 * Track when Q/timestamp updates to re-check event timing.
	 * @method _trackEventStart
	 * @private
	 */
	_trackEventStart: function () {
		var tool = this;
		var toolKey = 'webrtc-event-start_' + tool.id;

		if (tool._detectTimestampTool()) {
			return;
		}

		var onActivate = Q.Tool.onActivate('Q/timestamp');
		onActivate.add(function () {
			if (tool.removed || !tool.element.isConnected) {
				onActivate.remove(toolKey);
				return;
			}
			tool._askToJoinIfHappening();
			if (tool._detectTimestampTool()) {
				onActivate.remove(toolKey);
			}
		}, toolKey);
	},

	/**
	 * Find and hook the Q/timestamp tool in our element.
	 * @method _detectTimestampTool
	 * @private
	 * @return {Boolean}
	 */
	_detectTimestampTool: function () {
		var tool = this;
		var toolKey = 'webrtc-event-start_' + tool.id;
		var tsTool = Q.Tool.from(
			tool.$(".Q_timestamp_tool"), "Q/timestamp"
		);

		if (!tsTool) {
			return false;
		}

		tsTool.state.beforeRefresh.set(function () {
			if (tool.removed || !tool.element.isConnected) {
				return;
			}
			tool._updateStateAttr();
			tool._askToJoinIfHappening();
		}, toolKey);

		return true;
	},

	/**
	 * Track who joins/leaves the WebRTC room.
	 * @method _trackWebrtcParticipants
	 * @private
	 */
	_trackWebrtcParticipants: function (initialUserIds) {
		var tool = this;

		if (!tool.webrtcStream
		|| !tool.webrtcStream.testReadLevel('participants')) {
			return;
		}

		var $list = tool.$(".Media_webrtc_event_participants");
		if (!$list.length) {
			return;
		}

		tool.webrtcStream.onMessage("Streams/joined").add(function (message) {
			if (!tool.webrtcParticipants[message.byUserId]) {
				tool._addParticipantAvatar(message.byUserId, $list);
			}
		}, tool);

		tool.webrtcStream.onMessage("Streams/left").add(function (message) {
			tool._removeParticipantAvatar(message.byUserId);
		}, tool);

		for (var i = 0; i < initialUserIds.length; i++) {
			tool._addParticipantAvatar(initialUserIds[i], $list);
		}
	},

	/**
	 * @method _addParticipantAvatar
	 * @private
	 */
	_addParticipantAvatar: function (userId, $list) {
		var tool = this;

		if (!$list.length || !$list[0].isConnected) {
			return;
		}

		var container = document.createElement('div');
		container.className = 'Media_webrtc_event_participant';

		Streams.Avatar.get(userId).then(function (avatar) {
			if (tool.removed || !container.isConnected) {
				return;
			}
			var img = document.createElement('img');
			img.src = avatar.iconUrl();
			img.alt = avatar.displayName();
			container.appendChild(img);

			var name = document.createElement('span');
			name.textContent = avatar.displayName();
			container.appendChild(name);
		});

		$list[0].appendChild(container);
		tool.webrtcParticipants[userId] = container;
	},

	/**
	 * @method _removeParticipantAvatar
	 * @private
	 */
	_removeParticipantAvatar: function (userId) {
		var el = this.webrtcParticipants[userId];
		if (el) {
			el.remove();
			delete this.webrtcParticipants[userId];
		}
	},

	/**
	 * Show a notice prompting the user to join if the event is live.
	 * @method _askToJoinIfHappening
	 * @private
	 */
	_askToJoinIfHappening: function () {
		var tool = this;

		if (!tool._eventIsHappening() || tool._webrtcIsActive()) {
			return;
		}

        tool._updateStateAttr();

		var stream = tool.eventStream;
		var noticeKey = 'eventStarted_' + stream.fields.name + '_'
			+ stream.getAttribute('startTime');

		if (Q.Notices.get(noticeKey)) {
			return;
		}

		var startTime = stream.getAttribute('startTime') * 1000;
		var endTime = stream.getAttribute('endTime') * 1000;
		var now = Date.now();
		var elapsed = now - startTime;

		// pick message based on elapsed time
		var msgKey = (elapsed < 5 * 60 * 1000)
			? 'StartedInEvent'
			: 'OngoingInEvent';
		var msgText = Q.getObject(
			['notifications', 'webrtc', msgKey], tool.text
		) || '';

		Q.Template.render('Media/webrtc/event/notice', {
			text: tool.text,
			message: msgText.interpolate({ event: stream.fields.title })
		}, function (err, html) {
			if (err) {
				return;
			}

			Q.Notices.add({
				closeable: false,
				key: noticeKey,
				type: 'online-event',
				timeout: 10,
				content: html
			});

			var noticeEl = Q.Notices.get(noticeKey);
			if (!noticeEl) {
				return;
			}

			noticeEl.onclick = null;

			var joinBtn = noticeEl.querySelector('.Media_webrtc_notice_join');
			var closeBtn = noticeEl.querySelector('.Media_webrtc_notice_close');

			if (joinBtn) {
				joinBtn.addEventListener('click', function () {
					tool._startWebRTC();
					Q.Notices.remove(noticeKey);
				});
			}

			if (closeBtn) {
				closeBtn.addEventListener('click', function () {
					Q.Notices.remove(noticeKey);
				});
			}
		});
	},

	/**
	 * Start the WebRTC room.
	 * @method _startWebRTC
	 * @private
	 */
	_startWebRTC: function () {
		var tool = this;
		var state = tool.state;
		var $te = $(tool.element);

		if (state._webrtcActive || !state.teleconference || !Q.Media) {
			return;
		}

		if (!tool._eventIsHappening()) {
			return;
		}

		var userId = Users.loggedInUserId();
		if (!userId) {
			return;
		}

		// check that user is going
		var parentTool = tool.parentTool();
		if (parentTool && parentTool.getGoing) {
			parentTool.getGoing(userId, function (going) {
				if (going !== 'yes') {
					return Q.alert(
						Q.getObject(['event', 'tool', 'YouAreNotParticipated'], tool.text)
					);
				}
				tool._doStartWebRTC();
			});
		} else {
			tool._doStartWebRTC();
		}
	},

	/**
	 * Actually initiate the WebRTC connection.
	 * @method _doStartWebRTC
	 * @private
	 */
	_doStartWebRTC: function () {
		var tool = this;
		var state = tool.state;
		var $te = $(tool.element);

		if (tool.removed || !tool.element.isConnected) {
			return;
		}

		state._webrtcActive = 'loading';
		$te.attr("data-webrtc", 'loading');

		Q.Media.WebRTC.start({
			publisherId: state.publisherId,
			streamName: state.streamName,
			relationType: 'Calendars/event/webrtc',
			tool: tool,
			useRelatedTo: true,
			onWebrtcControlsCreated: function () {
				$te.attr("data-webrtc", true);
			},
			onStart: function () {
				state._webrtcActive = this;

				var noticeKey = 'eventStarted_' + tool.eventStream.fields.name
					+ '_' + tool.eventStream.getAttribute('startTime');
				if (Q.Notices.get(noticeKey)) {
					Q.Notices.remove(noticeKey);
				}

				Q.handle(state.onWebrtcStarted, tool);
			},
			onEnd: function () {
				state._webrtcActive = false;
				$te.attr("data-webrtc", false);
				Q.handle(state.onWebrtcEnded, tool);
			}
		});
	},

	// ── Helpers ────────────────────────────────────────────────────

	/**
	 * @method _eventIsHappening
	 * @private
	 * @return {Boolean}
	 */
	_eventIsHappening: function () {
		var stream = this.eventStream;
		if (!stream) {
			return false;
		}
		var now = Date.now();
		var start = stream.getAttribute('startTime') * 1000;
		var end = stream.getAttribute('endTime') * 1000;
		return start < now && end > now;
	},

	/**
	 * Check if we're already in this WebRTC room.
	 * @method _webrtcIsActive
	 * @private
	 * @return {Boolean}
	 */
	_webrtcIsActive: function () {
		if (!this.webrtcStream || !Q.Media || !Q.Media.WebRTCRooms) {
			return false;
		}
		for (var r in Q.Media.WebRTCRooms) {
			var roomStream = Q.Media.WebRTCRooms[r].roomStream();
			if (roomStream.fields.publisherId === this.webrtcStream.fields.publisherId
			&& roomStream.fields.name === this.webrtcStream.fields.name) {
				return true;
			}
		}
		return false;
	},

	Q: {
		beforeRemove: function () {
			$(this.element).off('.Media_webrtc_event');
		}
	}
});

// ── Templates ─────────────────────────────────────────────────────────

// Partial used by Calendars/event/tool template.
// Contains the attendee-facing webrtc join button
// and the host-facing conference management tool.
Q.Template.set('Media/event/webrtc',
	'{{#if show.webrtc}}' +
	'  <div class="Q_button Media_aspect_webrtc" data-invoke="webrtc">' +
	'    <div class="Calendars_info_icon"><i class="qp-calendars-teleconference"></i></div>' +
	'    <div class="Calendars_info_content"></div>' +
	'  </div>' +
	'{{/if}}' +
	'{{#if show.teleconference}}' +
	'  <div class="Q_aspect_conference">' +
	'    {{{tool "Media/webrtc/event" publisherId=stream.fields.publisherId streamName=stream.fields.name' +
	'      teleconference=hasTeleconference startTime=startTime}}}' +
	'  </div>' +
	'{{/if}}',
	null, true
);

Q.Template.set('Media/webrtc/event',
	'<div class="Q_button Media_webrtc_event_button" data-invoke="teleconference">' +
	'  <div class="Calendars_info_icon"><i class="qp-calendars-teleconference"></i></div>' +
	'  <div class="Calendars_info_content">' +
	'    <div class="Media_webrtc_event_join">{{text.event.tool.JoinTeleConference}}</div>' +
	'    <div class="Media_webrtc_event_ended">{{text.event.tool.TeleConferenceEnded}}</div>' +
	'    <div class="Media_webrtc_event_scheduler Q_hidden"></div>' +
	'    <div class="Media_webrtc_event_enter Q_hidden"></div>' +
	'  </div>' +
	'</div>' +
	'<div class="Media_webrtc_event_participants"></div>'
);

Q.Template.set('Media/webrtc/event/notice',
	'<div class="Media_webrtc_notice">' +
	'  <div class="Media_webrtc_notice_avatar">' +
	'    <span class="qp-calendars-teleconference"></span>' +
	'  </div>' +
	'  <div class="Media_webrtc_notice_desc">' +
	'    <span class="Media_webrtc_notice_text">{{message}}</span>' +
	'  </div>' +
	'  <div class="Media_webrtc_notice_buttons">' +
	'    <button class="Q_button Media_webrtc_notice_join">{{text.event.tool.Join}}</button>' +
	'    <span class="Media_webrtc_notice_close">{{text.event.tool.Close}}</span>' +
	'  </div>' +
	'</div>'
);

})(Q, Q.jQuery, window);