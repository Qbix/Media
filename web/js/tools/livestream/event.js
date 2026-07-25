/**
 * Media/livestream/event tool.
 * Manages livestream subscriptions and live-stream listings
 * within a Calendars event:
 *   - Tracks related livestream streams via Streams/related
 *   - Shows a list of active livestreams with join buttons
 *   - Toggles "notify me when livestream starts" subscription
 *
 * Activated as a child tool inside Calendars/event.
 *
 * @module Media-livestream-event
 * @class Media/livestream/event
 */
(function (Q, $, window, undefined) {

var Users = Q.Users;
var Streams = Q.Streams;

Q.Tool.define("Media/livestream/event", function (options) {
	var tool = this;
	var state = tool.state;

	if (!state.publisherId || !state.streamName) {
		return;
	}

	tool.livestreamsList = [];
	tool._subscribed = false;
	tool._subscription = null;

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
		},
		{ withParticipant: true }
	);
},

// ── Default options ───────────────────────────────────────────────
{
	publisherId: null,
	streamName: null
},

// ── Methods ───────────────────────────────────────────────────────
{
	refresh: function () {
		var tool = this;

		if (tool.removed || !tool.element.isConnected) {
			return;
		}

		Q.Template.render('Media/livestream/event', {
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
				tool._bindEvents();
				tool._trackLivestreams();
				tool._loadSubscription();
			});
		});
	},

	/**
	 * Bind message listeners on the event stream.
	 * @method _bindEvents
	 * @private
	 */
	_bindEvents: function () {
		var tool = this;

		tool.eventStream.onMessage("Media/livestream/started")
			.set(function () {
				tool._refreshAllStreams();
			}, tool);

		tool.eventStream.onMessage("Media/livestream/stopped")
			.set(function () {
				tool._refreshAllStreams();
			}, tool);

		// toggle notification subscription
		var $toggle = tool.$(".Media_livestream_event_toggle");
		if ($toggle.length) {
			$toggle.on(Q.Pointer.fastclick + '.Media_livestream_event', function () {
				tool.element.classList.add('Q_working');

				var action = tool._subscribed ? 'unsubscribe' : 'subscribe';
				tool._toggleSubscription(action).then(function () {
					if (tool.removed || !tool.element.isConnected) {
						return;
					}
					tool.element.classList.remove('Q_working');
					tool._updateToggleUI();
				});
			});
		}
	},

	/**
	 * Set up a hidden Streams/related tool to track livestreams.
	 * @method _trackLivestreams
	 * @private
	 */
	_trackLivestreams: function () {
		var tool = this;

		var relatedEl = Q.Tool.setUpElement('div', 'Streams/related', {
			publisherId: tool.state.publisherId,
			streamName: tool.state.streamName,
			relationType: 'Media/livestream',
			tag: 'div',
			isCategory: true,
			creatable: false,
			realtime: true,
			onUpdate: function (e) {
				if (tool.removed || !tool.element.isConnected) {
					return;
				}
				tool._syncLivestreamsList(e.relatedStreams);
			}
		}, null, tool.prefix);

		Q.activate(relatedEl, {}, function () {
			tool._relatedTool = this;
			tool._refreshDebounced = Q.debounce(function () {
				if (tool._relatedTool && !tool.removed) {
					tool._relatedTool.refresh();
				}
			}, 500);
		});
	},

	/**
	 * Sync the visual list with the related streams data.
	 * @method _syncLivestreamsList
	 * @private
	 */
	_syncLivestreamsList: function (relatedStreams) {
		var tool = this;
		var $list = tool.$(".Media_livestream_event_list");

		if (!$list.length) {
			return;
		}

		var streams = Object.values(relatedStreams);

		for (var i = 0; i < streams.length; i++) {
			var ls = streams[i];
			var existing = tool._findInList(ls.fields.publisherId, ls.fields.name);

			var lives = ls.getAttribute('lives');
			var p2pLive = ls.getAttribute('p2pRoom');
			var isActive = (lives && lives.length !== 0)
				|| (p2pLive != null && p2pLive !== '');

			if (existing) {
				// show/hide based on active state
				if (isActive && existing.el) {
					$list[0].appendChild(existing.el);
				} else if (!isActive && existing.el && existing.el.parentElement) {
					existing.el.parentElement.removeChild(existing.el);
				}
				continue;
			}

			// new livestream
			var item = {
				publisherId: ls.fields.publisherId,
				streamName: ls.fields.name,
				stream: ls,
				el: null
			};

			item.el = tool._createListItem(ls);
			tool.livestreamsList.push(item);

			if (isActive) {
				$list[0].appendChild(item.el);
			}

			// auto-refresh when stream attributes change
			Streams.Stream.onRefresh(ls.fields.publisherId, ls.fields.name)
				.add(function () {
					if (tool._refreshDebounced) {
						tool._refreshDebounced();
					}
				}, tool);
		}

		// remove items no longer in relatedStreams
		for (var s = tool.livestreamsList.length - 1; s >= 0; s--) {
			var found = false;
			for (var r in relatedStreams) {
				if (tool.livestreamsList[s].streamName === relatedStreams[r].fields.name
				&& tool.livestreamsList[s].publisherId === relatedStreams[r].fields.publisherId) {
					found = true;
					break;
				}
			}
			if (!found) {
				if (tool.livestreamsList[s].el && tool.livestreamsList[s].el.parentElement) {
					tool.livestreamsList[s].el.parentElement.removeChild(
						tool.livestreamsList[s].el
					);
				}
				tool.livestreamsList.splice(s, 1);
			}
		}
	},

	/**
	 * Find a livestream in the local list by publisher/name.
	 * @method _findInList
	 * @private
	 */
	_findInList: function (publisherId, streamName) {
		for (var i = 0; i < this.livestreamsList.length; i++) {
			if (this.livestreamsList[i].publisherId === publisherId
			&& this.livestreamsList[i].streamName === streamName) {
				return this.livestreamsList[i];
			}
		}
		return null;
	},

	/**
	 * Create a DOM element for a livestream list item.
	 * @method _createListItem
	 * @private
	 */
	_createListItem: function (livestreamStream) {
		var tool = this;

		var container = document.createElement('div');
		container.className = 'Media_livestream_event_item';

		Streams.Avatar.get(livestreamStream.fields.publisherId)
			.then(function (avatar) {
				if (tool.removed || !container.isConnected) {
					return;
				}

				var img = document.createElement('img');
				img.src = avatar.iconUrl();
				img.className = 'Media_livestream_event_avatar';
				container.appendChild(img);

				var nameEl = document.createElement('span');
				nameEl.className = 'Media_livestream_event_name';
				nameEl.textContent = avatar.displayName()
					+ ' ' + (tool.text.event.tool.IsLive || 'is live');
				container.appendChild(nameEl);

				var joinBtn = document.createElement('a');
				joinBtn.href = '#';
				joinBtn.className = 'Media_livestream_event_join Q_button';
				joinBtn.textContent = tool.text.event.tool.Join;
				container.appendChild(joinBtn);

				joinBtn.addEventListener('click', function (e) {
					e.preventDefault();
					if (e.ctrlKey || e.button === 1) {
						window.open(livestreamStream.url(), "_blank");
						return;
					}
					if (Q.Media) {
						Q.Media.openLivestreamTool(
							livestreamStream.fields.publisherId,
							livestreamStream.fields.name
						);
					}
				});
			});

		return container;
	},

	/**
	 * Refresh all tracked livestream streams.
	 * @method _refreshAllStreams
	 * @private
	 */
	_refreshAllStreams: function () {
		for (var i = 0; i < this.livestreamsList.length; i++) {
			if (this.livestreamsList[i].stream) {
				this.livestreamsList[i].stream.refresh(null, {
					evenIfNotRetained: true
				});
			}
		}
	},

	// ── Subscription ──────────────────────────────────────────────

	/**
	 * Load the current user's livestream subscription state.
	 * @method _loadSubscription
	 * @private
	 */
	_loadSubscription: function () {
		var tool = this;
		var state = tool.state;

		Q.req('Media/livestreamSubscription', 'subscription', function (err, response) {
			if (err) {
				return;
			}
			if (tool.removed || !tool.element.isConnected) {
				return;
			}
			var sub = Q.getObject("slots.subscription.subscription", response);
			tool._applySubscriptionState(sub);
			tool._updateToggleUI();
		}, {
			method: 'get',
			fields: {
				publisherId: state.publisherId,
				streamName: state.streamName
			}
		});
	},

	/**
	 * Toggle the subscription on or off.
	 * @method _toggleSubscription
	 * @private
	 * @return {Q.Promise}
	 */
	_toggleSubscription: function (action) {
		var tool = this;
		var state = tool.state;

		return new Q.Promise(function (resolve, reject) {
			Q.req('Media/livestreamSubscription',
				['stream', 'subscription', 'participant'],
				function (err, response) {
					if (err) {
						return reject(err);
					}

					// refresh event stream to pick up participant changes
					Streams.Stream.refresh(
						state.publisherId, state.streamName,
						function () {
							if (tool.removed) {
								return resolve();
							}
							tool.eventStream = this;
							tool._applySubscriptionState(
								Q.getObject("slots.subscription", response)
							);
							resolve();
						},
						{ withParticipant: true, messages: true, unlessSocket: true }
					);
				}, {
					method: 'post',
					fields: {
						publisherId: state.publisherId,
                        streamName: state.streamName,
						action: action
					}
				}
			);
		});
	},

	/**
	 * Update internal subscription state from server data.
	 * @method _applySubscriptionState
	 * @private
	 */
	_applySubscriptionState: function (subscriptionData) {
		if (!subscriptionData) {
			this._subscription = null;
			this._subscribed = false;
			return;
		}

		this._subscription = subscriptionData;

		var filter = JSON.parse(subscriptionData.fields.filter || '{}');
		var types = filter.types || [];

		this._subscribed = (
			this.eventStream.participant
			&& this.eventStream.participant.subscribed === 'yes'
			&& types.indexOf('Media/livestream/started') !== -1
			&& types.indexOf('Media/livestream/stopped') !== -1
		);
	},

	/**
	 * Update the toggle button text.
	 * @method _updateToggleUI
	 * @private
	 */
	_updateToggleUI: function () {
		if (this.removed || !this.element.isConnected) {
			return;
		}

		var $content = this.$(".Media_livestream_event_status");
		if (!$content.length) {
			return;
		}

		$content.text(
			this._subscribed
				? (this.text.event.tool.LiveStreamNotificationOn || 'Notifications on')
				: (this.text.event.tool.LiveStreamNotifyMe || 'Notify me')
		);
	},

	Q: {
		beforeRemove: function () {
			$(this.element).off('.Media_livestream_event');
		}
	}
});

// ── Templates ─────────────────────────────────────────────────────────

// Partial used by Calendars/event/tool template.
// Contains the livestream toggle and list.
Q.Template.set('Media/event/livestream',
	'{{#if show.livestream}}' +
	'  <div class="Q_aspect_livestream">' +
	'    {{{tool "Media/livestream/event" publisherId=stream.fields.publisherId streamName=stream.fields.name}}}' +
	'  </div>' +
	'{{/if}}',
	null, true
);

Q.Template.set('Media/livestream/event',
	'<div class="Q_button Media_livestream_event_toggle">' +
	'  <div class="Calendars_info_icon">' +
	'    <i class="qp-calendars-livestream"></i>' +
	'  </div>' +
	'  <div class="Calendars_info_content">' +
	'    <span class="Media_livestream_event_status">' +
	'      {{text.event.tool.LiveStreamNotifyMe}}' +
	'    </span>' +
	'  </div>' +
	'</div>' +
	'<div class="Media_livestream_event_list"></div>'
);

})(Q, Q.jQuery, window);