(function (Q, $, window, undefined) {

/**
* Media/clip/preview tool.
* Renders a tool to preview Media clip
* @class Media/clip/preview
* @constructor
* @param {Object} [options] options to pass besides the ones to Streams/preview tool
*/
Q.Tool.define("Media/clip/preview", ["Streams/preview"], function _Media_clip_preview (options, preview) {
	var tool = this;
	tool.preview = preview;

	Q.Assets.Payments.load();

	preview.state.creatable.preprocess = tool.composer.bind(this);

	/*preview.state.onCreate.set(function () {
		Q.Dialogs.pop();
	}, tool);*/

	Q.addStylesheet('{{Media}}/css/tools/clipPreview.css', { slotName: 'Media' });

	Q.Text.get('Media/content', function (err, text) {
		var msg = Q.firstErrorMessage(err);
		if (msg) {
			return console.warn(msg);
		}

		tool.text = text;
		preview.state.onRefresh.add(tool.refresh.bind(tool));
	});
},

{
	relationType: "Media/clip",
	expandable: {
		expanded: true
	}
},

{
	refresh: function (stream, callback) {
		var tool = this;
		var state = this.state;
		var $toolElement = $(tool.element);

		if (!Q.Streams.isStream(stream) || $toolElement.prop("name") === "addClip") {
			return;
		}

		tool.stream = stream;

		// retain with stream
		Q.Streams.retainWith(tool).get(stream.fields.publisherId, stream.fields.name);

		setTimeout(function () {
			$toolElement.tool("Streams/default/preview").activate();
		}, 0);
	},
	/**
	 * Check if for ready for submit
	 * @method checkForm
	 */
	checkForm: function () {
		var state = this.state;

		var $submit = $(".Media_clip_composer_submit:visible", state.mainDialog);
		var clipTool = Q.Tool.from($(".Q_tabbing_container .Q_tabbing_item.Q_current .Q_clip_tool", state.mainDialog), "Q/clip");
		var clipStart = clipTool ? clipTool.getPosition("start") : null;
		var clipEnd = clipTool ? clipTool.getPosition("end") : null;
		var title = $("input[name=title]:visible", state.mainDialog).val();

		if (clipStart && clipEnd && title) {
			$submit.removeClass("Q_disabled");
		} else {
			$submit.addClass("Q_disabled");
		}
	},
	/**
	 * Start composer dialog
	 * @method composer
	 * @param {function} callback Need to call this function to start create stream process
	 */
	composer: function (callback) {
		var tool = this;
		var state = this.state;
		var category = state.category;
		var stream = this.stream;

		var videoUrl = Q.getObject("url", category.getAttribute("video"));
		var audioUrl = Q.getObject("url", category.getAttribute("audio"));

		var title = null;
		var content = null;

		/**
		 * Process composer submitting
		 * @method _process
		 */
		var _process = function() {
			var _error = function (err) {
				state.mainDialog.removeClass('Q_uploading');
				Q.alert(err);
			};

			var action = state.mainDialog.attr('data-action');
			var $currentContent = $(".Q_tabbing_container [data-content=" + action + "]", state.mainDialog);
			if (!$currentContent.length) {
				return _error("No action selected");
			}
			var clipTool = Q.Tool.from($(".Q_clip_tool", $currentContent), "Q/clip");
			var clipStart = clipTool ? clipTool.getPosition("start") : null;
			var clipEnd = clipTool ? clipTool.getPosition("end") : null;

			var title = $("input[name=title]", $currentContent);
			title = title.length ? title.val() : null;
			if (Q.isEmpty(title)) {
				return _error(text.NewClipTitlePlaceholder);
			}

			var content = $("textarea[name=content]", $currentContent);
			content = content.length ? content.val() : null;

			var params = {
				title: title,
				content: content,
				icon: category.fields.icon
			};

			if (action === "video") {
				// url defined
				if (!videoUrl) {
					return _error("Video url not found");
				}

				params.attributes = {
					video: {
						url: videoUrl,
						clipStart: clipStart,
						clipEnd: clipEnd
					}
				};
			} else if (action === "audio") {
				// url defined
				if (!audioUrl) {
					return _error("Audio url not found");
				}

				params.attributes = {
					audio: {
						url: audioUrl,
						clipStart: clipStart,
						clipEnd: clipEnd
					}
				};
			} else {
				_error("Incorrect action " + action);
			}

			// edit stream
			if (stream) {
				Q.each(params, function (name, value) {
					stream.pendingFields[name] = value;
				});
				stream.save({
					onSave: function () {
						Q.handle(callback, tool, [params]);
						tool.closeComposer();
					}
				});
			} else { // new stream
				Q.req("Media/clip", ["result"],function (err, response) {
					var fem = Q.firstErrorMessage(err, response);
					if (fem) {
						return Q.alert(fem);
					}

					if (Q.getObject("slots.result", response) === "needPayment") {
						var createCost = Q.getObject("clip.createCost", Q.Media);
						Q.Assets.pay({
							amount: createCost.amount,
							currency: createCost.currency,
							userId: Q.Users.currentCommunityId,
							toStream: {
								streamName: "Media/clip"
							},
							reason: "CreatePaidStream",
							onSuccess: function () {
								Q.handle(_process, state.mainDialog);
							},
							onFailure: function () {
								state.mainDialog.removeClass('Q_uploading');
							},
						});
						return;
					}

					tool.closeComposer();
				}, {
					method: "post",
					fields: {
						params: params,
						related: tool.preview.state.related
					}
				});
			}
		};

		Q.invoke({
			title: tool.text.NewClip,
			columnClass: "Media_clip_dialog",
			className: "Media_clip_dialog",
			template: {
				name: 'Media/clip/composer',
				fields: {
					title: title,
					content: content,
					isVideo: !!videoUrl,
					isAudio: !!audioUrl,
					text: tool.text
				}
			},
			trigger: Q.info.isMobile ? tool.element : null,
			onActivate: function () {
				// if opened in columns - third argument is a column element,
				// if opened dialog - first argument is dialog element
				state.mainDialog = arguments[2] instanceof HTMLElement ? arguments[2] : arguments[0];
				if (!(state.mainDialog instanceof $)) {
					state.mainDialog = $(state.mainDialog);
				}

				if (videoUrl) {
					var $videoElement = $(".Q_tabbing_container [data-content=video] .Media_clip_composer_preview", state.mainDialog);
					var $videoClipElement = $(".Q_tabbing_container [data-content=video] .Media_clip_composer_clip", state.mainDialog);
					var videoClipStart = stream ? Q.getObject("clipStart", stream.getAttribute("video")) : null;
					var videoClipEnd = stream ? Q.getObject("clipEnd", stream.getAttribute("video")) : null;
					var start = state.playerTool ? state.playerTool.getCurrentPosition() : null;
					$videoElement.tool("Q/video", {
						url: videoUrl,
						start: start,
						image: category.iconUrl(400),
						clipStart: videoClipStart,
						clipEnd: videoClipEnd
					}).activate(function () {
						var toolPreview = this;
						tool.videoTool = this;

						$videoClipElement.tool("Q/clip", {
							startPosition: videoClipStart,
							startPositionDisplay: videoClipStart ? Q.displayDuration(videoClipStart) : null,
							endPosition: videoClipEnd,
							endPositionDisplay: videoClipEnd ? Q.displayDuration(videoClipEnd) : null,
							onStart: function (setNewPosition) {
								if (setNewPosition) {
									var time = toolPreview.getCurrentPosition();

									toolPreview.state.clipStart = time;
									this.setPosition(time, Q.displayDuration(time), "start");
								} else {
									toolPreview.state.clipStart = null;
								}

								tool.checkForm();
							},
							onEnd: function (setNewPosition) {
								if (setNewPosition) {
									var time = toolPreview.getCurrentPosition();

									toolPreview.state.clipEnd = time;
									this.setPosition(time, Q.displayDuration(time), "end");
								} else {
									toolPreview.state.clipEnd = null;
								}

								tool.checkForm();
							}
						}).activate(function () {
							toolPreview.clipTool = this;
						});
					});
				}

				if (audioUrl) {
					var $audioElement = $(".Q_tabbing_container [data-content=audio] .Media_clip_composer_preview", state.mainDialog);
					var $audioClipElement = $(".Q_tabbing_container [data-content=audio] .Media_clip_composer_clip", state.mainDialog);
					var audioClipStart = stream ? Q.getObject("clipStart", stream.getAttribute("audio")) : null;
					var audioClipEnd = stream ? Q.getObject("clipEnd", stream.getAttribute("audio")) : null;
					$audioElement.tool("Q/audio", {
						url: audioUrl,
						clipStart: audioClipStart,
						clipEnd: audioClipEnd
					}).activate(function () {
						var toolPreview = this;
						tool.audioTool = this;

						$audioClipElement.tool("Q/clip", {
							startPosition: audioClipStart,
							startPositionDisplay: audioClipStart ? Q.displayDuration(audioClipStart) : null,
							endPosition: audioClipEnd,
							endPositionDisplay: audioClipEnd ? Q.displayDuration(audioClipEnd) : null,
							onStart: function (setNewPosition) {
								if (setNewPosition) {
									var time = toolPreview.state.currentPosition;

									toolPreview.state.clipStart = time;
									this.setPosition(time, Q.displayDuration(time), "start");
								} else {
									toolPreview.state.clipStart = null;
								}

								tool.checkForm();
							},
							onEnd: function (setNewPosition) {
								if (setNewPosition) {
									var time = toolPreview.state.currentPosition;

									toolPreview.state.clipEnd = time;
									this.setPosition(time, Q.displayDuration(time), "end");
								} else {
									toolPreview.state.clipEnd = null;
								}

								tool.checkForm();
							}
						}).activate(function () {
							toolPreview.clipTool = this;
						});
					});
				}

				// save by URL
				$("button[name=save]", state.mainDialog).on(Q.Pointer.click, function (e) {
					e.preventDefault();
					e.stopPropagation();

					state.mainDialog.addClass('Q_uploading');
					Q.handle(_process, state.mainDialog);
				});

				var _selectTab = function () {
					var $this = $(this);
					var action = $this.attr('data-name');

					state.mainDialog.attr("data-action", action);
					$this.addClass('Q_current').siblings().removeClass('Q_current');
					$(".Q_tabbing_container .Q_tabbing_item[data-content=" + action + "]", state.mainDialog).addClass('Q_current').siblings().removeClass('Q_current');

					// pause all exists players
					Q.each($(".Q_video_tool, .Q_audio_tool", state.mainDialog), function () {
						var videoTool = Q.Tool.from(this, "Q/video");
						var audioTool = Q.Tool.from(this, "Q/audio");

						videoTool && videoTool.pause();
						audioTool && audioTool.pause();
					});
				};

				// custom tabs implementation
				$(".Q_tabbing_tabs .Q_tabbing_tab", state.mainDialog).on(Q.Pointer.fastclick, _selectTab);

				Q.handle(_selectTab, $(".Q_tabbing_tabs .Q_tabbing_tab:visible:first", state.mainDialog)[0]);

				// set focus to title input and check
				var $title = $("input[name=title]:visible", state.mainDialog);
				$title
				.on("blur", function () {
					if ($title.val()) {
						$title.removeClass("Q_error");
					} else {
						$title.addClass("Q_error");
					}
				})
				.on("change keyup input", function () {
					if ($title.val()) {
						$title.removeClass("Q_error");
					} else {
						$title.addClass("Q_error");
					}

					tool.checkForm();
				})
				.focus();
			}
		});
	},
	closeComposer: function () {
		var mainDialog = this.state.mainDialog;
		if (!mainDialog) {
			return;
		}

		if(mainDialog.hasClass("Q_columns_column")) {
			var columns = Q.Tool.from(mainDialog.closest(".Q_columns_tool")[0], "Q/columns");
			columns.close({min: parseInt(mainDialog.attr("data-index"))});
		} else {
			Q.Dialogs.pop();
		}
	}
});

Q.Template.set('Media/clip/composer',
	'<div class="Media_clip_composer" data-video="{{isVideo}}" data-audio="{{isAudio}}"><form>'
	+ '  <div class="Q_tabbing_tabs">'
	+ '  	<div data-name="video" class="Q_tabbing_tab">{{text.Video}}</div>'
	+ '  	<div data-name="audio" class="Q_tabbing_tab Q_disabled">{{text.Audio}}</div>'
	+ '  </div>'
	+ '  <div class="Q_tabbing_container">'
	+ '	 	<div class="Q_tabbing_item" data-content="video">'
	+ '			<input name="title" value="{{title}}" placeholder="{{text.NewClipTitlePlaceholder}}" required>'
	+ '			<textarea name="content" placeholder="{{text.NewClipDescriptionPlaceholder}}">{{content}}</textarea>'
	+ '			<div class="Media_clip_composer_preview"></div>'
	+ '			<div class="Media_clip_composer_clip"></div>'
	+ '  	</div>'
	+ '  	<div class="Q_tabbing_item" data-content="audio">'
	+ '			<input name="title" value="{{title}}" placeholder="{{text.NewClipTitlePlaceholder}}" required>'
	+ '			<textarea name="content" placeholder="{{text.NewClipDescriptionPlaceholder}}">{{content}}</textarea>'
	+ '			<div class="Media_clip_composer_preview"></div>'
	+ '			<div class="Media_clip_composer_clip"></div>'
	+ '		</div>'
	+ '  </div>'
	+ '  <div class="Media_clip_composer_submit Q_disabled"><button name="save" class="Q_button" type="button">{{text.Save}}</button></div>'
	+ '</form></div>'
);

})(Q, Q.jQuery, window);