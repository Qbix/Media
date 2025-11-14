/**
 * Media plugin's front end code
 *
 * @module Media
 * @class Media
 */
"use strict";
/* jshint -W014 */
(function(Q, $) {
	/**
	 * Text for Media plugin, will be overridden by loaded language file
	 * @property Q.text.Media
	 * @type {Object}
	 */
	Q.text.Media = {

	};
	Q.Text.addFor(
		['Q.Tool.define', 'Q.Template.set'],
		'Media/', ["Media/content"]
	);
	Q.Tool.define({
		"Media/presentation": {
			js: "{{Media}}/js/tools/presentation.js",
			css: "{{Media}}/css/tools/presentation.css"
		},
		"Media/presentation/image": {
			js: "{{Media}}/js/tools/presentation/image.js",
			css: "{{Media}}/css/tools/presentation.css"
		},
		"Media/presentation/video": {
			js: "{{Media}}/js/tools/presentation/video.js",
			css: "{{Media}}/css/tools/presentation.css"
		},
		"Media/presentation/audio": {
			js: "{{Media}}/js/tools/presentation/audio.js",
			css: "{{Media}}/css/tools/presentation.css"
		},
		"Media/presentation/pdf": {
			js: "{{Media}}/js/tools/presentation/pdf.js",
			css: "{{Media}}/css/tools/presentation.css"
		},
		"Media/presentation/webpage": {
			js: "{{Media}}/js/tools/presentation/webpage.js",
			css: "{{Media}}/css/tools/presentation.css"
		},
		"Media/presentation/question": {
			js: "{{Media}}/js/tools/presentation/question.js",
			css: "{{Media}}/css/tools/presentation.css"
		},
		"Media/presentation/slide": {
			js: "{{Media}}/js/tools/presentation/slide.js",
			css: "{{Media}}/css/tools/presentation.css"
		},
		"Media/clip": {
			js: "{{Media}}/js/tools/clip.js",
			css: "{{Media}}/css/tools/clip.css",
			text: ["Streams/content", "Media/content"]
		},
		"Media/clip/preview": {
			js: "{{Media}}/js/tools/clip/preview.js",
			css: "{{Media}}/css/tools/episodePreview.css"
		},
		"Media/episode": {
			js: "{{Media}}/js/tools/episode.js",
			css: "{{Media}}/css/tools/episode.css"
		},
		"Media/episode/preview": {
			js: "{{Media}}/js/tools/episode/preview.js",
			css: "{{Media}}/css/tools/episodePreview.css"
		},
		"Media/channel/preview": {
			js: "{{Media}}/js/tools/channel/preview.js",
			css: "{{Media}}/css/tools/channelPreview.css"
		},
		"Media/channel": {
			js: "{{Media}}/js/tools/channel.js",
			css: "{{Media}}/css/tools/channel.css"
		},
		"Media/feed": "{{Media}}/js/tools/feed.js",
		"Media/feed/composer": "{{Media}}/js/tools/feed/composer.js",
		"Media/audioVisualization"	 : "{{Media}}/js/tools/webrtc/audioVisualization.js",
		"Media/webrtc"	   : "{{Media}}/js/tools/webrtc/webrtc.js",
		"Media/webrtc/scheduler"  : {
			js: "{{Media}}/js/tools/webrtc/webrtcScheduler.js",
			css: "{{Media}}/css/tools/webrtcScheduler.css",
		},
		"Media/webrtc/preview" : "{{Media}}/js/tools/webrtc/preview.js",
		"Media/webrtc/default/preview" : "{{Media}}/js/tools/webrtc/default/preview.js",
		"Media/webrtc/call/preview" : "{{Media}}/js/tools/webrtc/call/preview.js",
		"Media/webrtc/settings"  : "{{Media}}/js/tools/webrtc/webrtcSettings.js",
		"Media/webrtc/recordings"  : {
			js: "{{Media}}/js/tools/webrtc/recordings.js",
			css: "{{Media}}/css/tools/webrtcRecordings.css"
		},
		"Media/webrtc/controls"  : "{{Media}}/js/tools/webrtc/controls.js",
		"Media/webrtc/participants"  : "{{Media}}/js/tools/webrtc/participants.js",
		"Media/webrtc/waitingRoomList"  : "{{Media}}/js/tools/webrtc/waitingRoomList.js",
		"Media/webrtc/permissionsManager"  : "{{Media}}/js/tools/webrtc/permissionsManager.js",
		"Media/webrtc/limitsManager"  : "{{Media}}/js/tools/webrtc/limitsManager.js",
		"Media/webrtc/video"  : "{{Media}}/js/tools/webrtc/video.js",
		"Media/webrtc/audio"  : "{{Media}}/js/tools/webrtc/audio.js",
		"Media/webrtc/livestreaming"  : {
			js: "{{Media}}/js/tools/webrtc/livestreamingEditor/livestreamingEditor.js",
			css: "{{Media}}/css/tools/livestreamingEditor.css",
		},
		"Media/webrtc/livestream"  : "{{Media}}/js/tools/webrtc/livestream.js",
		"Media/webrtc/callCenter/manager"  : "{{Media}}/js/tools/webrtc/callCenter/manager.js",
		"Media/webrtc/callCenter/client"  : "{{Media}}/js/tools/webrtc/callCenter/client.js",
		"Media/webrtc/popupDialog"  : "{{Media}}/js/tools/webrtc/popupDialog.js",
		"Media/webrtc/chat": "{{Media}}/js/tools/webrtc/chat.js",
		"Media/calls": "{{Media}}/js/tools/calls.js",
		"Media/calls/call": "{{Media}}/js/tools/call.js",
		"Games/teams": "{{Media}}/js/tools/games/teams.js",
		"Games/quickdraw": "{{Media}}/js/tools/games/quickdraw.js",
		"Media/whiteboard": "{{Media}}/js/tools/games/whiteboard.js"
	});

	var Media = Q.Media = Q.plugins.Media = {
		loadClip: function (clipId, options) {
			options = options || {};
			var url = Q.url('clip/' + (options.publisherId ? options.publisherId + '/' : '') + clipId);
			var columns = options.columns || Q.Tool.byId('Q_columns-Media');
			Q.invoke({
				title: '&#8987 ...',
				url: url,
				trigger: options.trigger,
				className: 'Streams_chat_streams_video'
			});

			/*var textFillTools = $('.Q_textfill_tool');

            $(textFillTools).each(function () {
                var textfillTool = Q.Tool.from(this, "Q/textfill");
                if(textfillTool) textfillTool.remove();
                setTimeout(function () {
                    $(textfillTool.element).tool('Q/textfill').activate();
                }, 2000);
            });*/
		},
		pushFeedColumn: function (stream, $trigger, startDate, endDate) {
			$trigger = $($trigger || this.element);
			var publisherId = stream.fields.publisherId;
			var streamName = stream.fields.name;
			var min = parseInt($trigger.closest('.Q_columns_column').data('index')) + 1;
			var columns = Q.Tool.from($trigger.closest('.Q_columns_tool')[0], "Q/columns");
			columns.close({min: min}, null, {animation: {duration: 0}});
			columns.push({
				title: "",//stream.fields.title
				name: "feed",
				column: Q.Tool.setUpElement('div', 'Media/feed', {
					publisherId: publisherId,
					streamName: streamName,
					startDate: startDate,
					endDate: endDate
				}),
				columnClass: 'Media_column_feed',
				onActivate: function () {

				},
				onClose: function () {
					$trigger.removeClass("Q_current");
				}
			});
		},
		pushChannelColumn: function (stream, $trigger) {
			$trigger = $($trigger || this.element);
			var publisherId = stream.fields.publisherId;
			var streamName = stream.fields.name;
			var min = parseInt($trigger.closest('.Q_columns_column').data('index')) + 1;
			var columns = Q.Tool.from($trigger.closest('.Q_columns_tool')[0], "Q/columns");
			columns.close({min: min}, null, {animation: {duration: 0}});
			columns.push({
				title: stream.fields.title,
				name: "channel",
				column: Q.Tool.setUpElement('div', 'Media/channel', {
					publisherId: publisherId,
					streamName: streamName
				}),
				columnClass: 'Media_column_channel',
				onActivate: function () {

				},
				onClose: function () {
					$trigger.removeClass("Q_selected");
				}
			});
		},
		/**
		 * Generate RTMP link for this stream
		 * @method getRTMPlink
		 * @param {Streams_Stream} stream
		 */
		getRTMPlink: function (stream) {
			var parsedUrl = Q.baseUrl().parseUrl();
			var host = parsedUrl.host;
			var port = Q.Media.rtmp.port;

			return "rtmp://" + host + ":" + port + "/live/" + stream.fields.publisherId + "_" + stream.fields.name.split("/").pop();
		}
	};

	Media.Presentation = {
		pages: {}
	};

	Media.Presentation.Slide = {
		invoke: function (preview) {
			var ps = preview.state;
			Q.Streams.get(ps.publisherId, ps.streamName, function () {
				var className = 'Media_presentation_slide_dialog';
				var editable = this.testWriteLevel('edit');
				if (editable) {
					className += 'Media_presentation_slide_editable'
				}
				var element = Q.Tool.setUpElement('div', 'Media/presentation/slide', {
					publisherId: ps.publisherId,
					streamName: ps.streamName
				});
				Q.Dialogs.push({
					title: this.fields.title,
					content: element,
					className: className,
					apply: editable,
					onActivate: function () {
						if (editable) {
							element.Q.tool.forEachChild('Streams/html', function () {
								this.state.onFroalaEditor.add(function () {
									this.focus();
								}, this)
							});
						}
					}
				});
			});
		}
	};

	Media.Episode = {
		toolName: function (streamType, options) {
			return 'Streams/default/preview';
		}
	}

	var columnsOptions = {
		scrollbarsAutoHide: false,
		handlers: {
			feeds: "{{Media}}/js/columns/feeds.js",
			feed: "{{Media}}/js/columns/feed.js",
			newFeed: "{{Media}}/js/columns/newFeed.js",
			channels: "{{Media}}/js/columns/channels.js",
		}
	};

	Q.Tool.define.options('Q/columns', columnsOptions);
	Q.Tool.define.options('Streams/chat', {
		handleTheirOwnClicks: ["Media/webrtc/preview"]
	});

	Q.Streams.Tool.highlightPreviews('Media/episode');

	// listen for Media/feed/closed message and remove preview tool
	Q.Streams.onMessage('Media/feed', 'Media/feed/access')
	.set(function (message) {
		var streamName = message.streamName || '';
		var publisherId = message.publisherId || '';
		var instructions = message.getAllInstructions();

		if (publisherId !== Q.Users.loggedInUserId()) {
			return;
		}

		var pipe = new Q.Pipe(["stream", "avatar", "text"], function (params, subjects) {
			var text = params.text[1];
			var stream = subjects.stream;
			var avatar = subjects.avatar;

			try {
				var template = Q.Template.compile(text.notifications["Media/feed/access"], 'handlebars');
				var html = template({
					stream: stream,
					avatar: avatar,
					instructions: instructions
				});
				Q.Notices.add({
					content: html,
					timeout: 5
				});
			} catch (e) {
				console.warn(e);
			}

		});
		Q.Streams.get(publisherId, streamName, pipe.fill("stream"));
		Q.Streams.Avatar.get(message.byUserId, pipe.fill("avatar"));
		Q.Text.get("Media/content", pipe.fill("text"));
	}, "Media.feed");


	// show Q.Notice when somebody opened webrtc in chat where current user participated
	Q.Streams.onMessage('', 'Streams/relatedTo')
	.set(function (message) {
		var publisherId = message.publisherId;
		var streamName = message.streamName;
		var toUrl = message.getInstruction('toUrl');
		var conversationUrl;

		// only relation type Media/webrtc and not for myself
		if (message.getInstruction('type') !== 'Media/webrtc'
		|| publisherId === Q.Users.loggedInUserId()
		|| !toUrl) {
			return;
		}

		// skip messages older than 24 hours
		var timeDiff = Math.abs((new Date(message.sentTime).getTime() - new Date().getTime()))/1000;
		if (timeDiff >= parseInt(Q.Streams.notifications.notices.expired)) {
			return;
		}

		toUrl += '?startWebRTC';

		Q.Text.get("Streams/content", function (err, text) {
			Q.Streams.showNoticeIfSubscribed({
				publisherId: publisherId,
				streamName: streamName,
				messageType: message.type,
				callback: function () {
					Q.Template.render('Media/chat/webrtc/available', {
						avatar: Q.Tool.setUpElementHTML('div', 'Users/avatar', {
							userId: publisherId,
							icon: false,
							short: true
						}),
						text: text.chat.startedConversation
					}, function (err, html) {
						if (err) {
							return;
						}

						Q.Notices.add({
							content: html,
							handler: function () {
								if (window.location.href.includes(conversationUrl)) {
									var tool = Q.Tool.from($(".Q_tool.Streams_chat_tool[data-streams-chat*='" + streamName + "']"), "Streams/chat");

									if (tool) {
										return tool.startWebRTC && tool.startWebRTC();
									}
								}

								Q.handle(toUrl);
							}
						});
					});
				}
			});
		});
	}, "Media.chat.webrtc");

	Media.closeAllLivestreamTools = function (except) {
		return new Promise(function (resolve, reject) {
			let existingLivestreamTools = Q.Tool.byName('Media/webrtc/livestream');
			
			//Just in case. Probably this should never happen when there are multiple livestream tools opened on one page
			//custom removeTool() method is used (instead of Q.Tool.remove())as it returns promise that resolves when animation of clising the tool ended
			const removals = Object.values(existingLivestreamTools).map(function (tool) {
				let skip = except.find(function(streamInfo) {
					return streamInfo.publisherId == tool.state.publisherId && streamInfo.streamName == tool.state.streamName;
				})
				if(!skip) return tool.removeTool()
			});

			console.log('removals', removals)
			if (removals.length != 0) {
				Promise.all(removals).then(function () {
					resolve();
				})
			} else {
				resolve();
			}
		});
	}
	
	Media.openLivestreamTool = function (publisherId, streamName) {
		return new Promise(function (resolve, reject) {
			let existingLivestreamTools = Q.Tool.byName('Media/webrtc/livestream');
			let tools = Object.values(existingLivestreamTools)
			let alreadyActive = tools.find(function (tool) {
				return publisherId == tool.state.publisherId && streamName == tool.state.streamName;
			})

			if(alreadyActive) {
				console.warn('Tool for this livestream already exists');
				resolve();
				return;
			}

			Q.Media.closeAllLivestreamTools([{ publisherId: publisherId, streamName:streamName }]).then(function () {
				var pageEl = document.getElementById('page');
				var livestreamElement = document.createElement('DIV');
				livestreamElement.style.display = 'none'; //should be none to prevent unwanted showing of body.s scrollbar for a split second when tool is in activating process
				livestreamElement.style.width = '100%';
				livestreamElement.style.height = 'inherit';
				pageEl.appendChild(livestreamElement);

				Q.activate(
					Q.Tool.setUpElement(livestreamElement, 'Media/webrtc/livestream', {
						publisherId: publisherId,
						streamName: streamName,
						mode: 'compact',
					}),
					{},
					function () {
						resolve();
					}
				);
			});
		});
	}

	Q.page('', function () {
		var fsc = Q.first(document.getElementsByClassName('Media_fullscreen_capable'));
		if (fsc instanceof Element) {
			fsc.style.cursor = 'pointer';
			fsc.addEventListener('click', function () {
				var oFsc = {navigationUI: 'hide'};
				if (fsc.requestFullScreen) {
					fsc.requestFullscreen(oFsc);
				} else if (fsc.mozRequestFullScreen) {
					fsc.mozRequestFullScreen(oFsc);
				} else if (fsc.webkitRequestFullScreen) {
					fsc.webkitRequestFullScreen(oFsc);
				}
			});
		}
	}, 'Media');

	Q.Streams.Chat.extensions.push('Media/webrtc/chat');

	Q.Template.set('Media/chat/webrtc/available',
		'<div class="Streams_chat_webrtc_available">'+
		'	{{{avatar}}} {{text}}'+
		'</div>'
	);

	Q.onInit.add(function () {
		Q.Text.get('Media/content', function (err, text) {
			if (!text) {
				return;
			}
			Q.extend(Q.text.Media, 10, text);
		});
	}, 'Media');
})(Q, Q.jQuery);
