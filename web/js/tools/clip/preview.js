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
		var tool = this;
		var state = this.state;

		var $submit = $(".Media_clip_composer_submit:visible", state.mainDialog);
		var title = $("input[name=title]:visible", state.mainDialog).val();
		var $currentContent = $(".Q_tabbing_container .Q_tabbing_item.Q_current", state.mainDialog);

		var clipTool = Q.Tool.from($(".Q_clip_tool", $currentContent), "Q/clip");
		var start = clipTool ? clipTool.getPosition("start") : null;
		var end = clipTool ? clipTool.getPosition("end") : null;
		var valid = !!(start && end);

		// A shared clip is capped at 15 seconds (see Media_clip_saveSafecloudClip's
		// own server-side re-check) — the plain YouTube/URL clip feature this
		// same Q/clip-based check also serves has no such cap. Unlike "start
		// or end just isn't set yet" (Save simply stays disabled, no message
		// needed), a range that IS fully set but too long gets an explicit
		// visible message — otherwise the only feedback was a silently
		// disabled Save button with no indication why.
		var categoryVideo = (state.category && state.category.getAttribute("video")) || {};
		var $rangeError = $(".Media_clip_composer_rangeError", $currentContent);
		if (valid && categoryVideo.source === "safecloud") {
			// Q_clip_position (what getPosition() reads) holds Q/clip's own
			// millisecond unit — convert to seconds before comparing against
			// the 15-SECOND cap, or a 1-second real gap (1000ms) always
			// fails a "<= 15" check written for seconds.
			var s = parseFloat(start) / 1000, e = parseFloat(end) / 1000;
			valid = isFinite(s) && isFinite(e) && e > s && (e - s) <= 15;
			$rangeError.text(valid ? "" : (
				(tool.text && tool.text.ClipRangeInvalid)
					|| "Clip must be between 0 and 15 seconds long."
			));
		} else {
			$rangeError.text("");
		}

		if (valid && title) {
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

		var categoryVideo = category.getAttribute("video") || {};
		// Safecloud-sourced episodes have no video.url (the encrypted
		// content only exists behind Q.Safecloud.Client.stream()) — this
		// composer builds a shareable clip for those from a pair of plain
		// numeric fields instead of the Q/video + Q/clip live-scrubbing UI
		// below, which only understands a plain playable URL. Embedding a
		// real scrubbable preview of the encrypted HLS stream inside this
		// dialog is a reasonable follow-up, not something this pass needs.
		var isSafecloud = categoryVideo.source === "safecloud";
		var videoUrl = Q.getObject("url", categoryVideo);
		var audioUrl = Q.getObject("url", category.getAttribute("audio"));

		var title = null;
		var content = null;

		/**
		 * Safecloud branch of _process() — computes a grant-based
		 * capability limited to [clipStart, clipEnd) via
		 * Q.Safecloud.Client.createShareLink (only possible because this
		 * dialog only ever shows for a viewer who already holds the
		 * episode's rootKey — see Media/clip.js's showAddClip, which is
		 * only reachable past its own payment gate) and always POSTs to
		 * Media/clip — even when editing an already-shared clip (`stream`
		 * set) — since Media_clip_saveSafecloudClip is what persists the
		 * new capability server-side; a plain stream.save() (what the
		 * non-safecloud branch below uses for edits) has no way to do that.
		 * @method _processSafecloud
		 */
		var _processSafecloud = function ($currentContent, _error) {
			var $title = $("input[name=title]", $currentContent);
			var titleVal = $title.length ? $title.val() : null;
			if (Q.isEmpty(titleVal)) {
				return _error(tool.text.NewClipTitlePlaceholder);
			}
			var $content = $("textarea[name=content]", $currentContent);
			var contentVal = $content.length ? $content.val() : null;

			// Q/clip's getPosition() is in milliseconds (see composer()'s own
			// comment on this) — everything downstream from here (the 15s
			// cap, the range sent to Q.Safecloud.Client.createShareLink and
			// stored server-side) is in seconds.
			var clipTool = Q.Tool.from($(".Q_clip_tool", $currentContent), "Q/clip");
			var clipStart = parseFloat(clipTool ? clipTool.getPosition("start") : NaN) / 1000;
			var clipEnd = parseFloat(clipTool ? clipTool.getPosition("end") : NaN) / 1000;
			if (!isFinite(clipStart) || !isFinite(clipEnd) || clipStart < 0
			|| clipEnd <= clipStart || (clipEnd - clipStart) > 15) {
				return _error(tool.text.ClipRangeInvalid
					|| "Clip must be between 0 and 15 seconds long.");
			}

			var safecloudVideo = Q.getObject("Media.clip.video", Q.plugins);
			if (!safecloudVideo || !safecloudVideo.manifest || !safecloudVideo.rootKey
			|| !Q.Safecloud || !Q.Safecloud.Client || !Q.Safecloud.Client.createShareLink) {
				return _error(tool.text.ClipNotAvailable
					|| "Can't create a clip right now — try reloading the page.");
			}

			// createShareLink's own naive fromSec/chunkDuration chunk-index
			// guess (manifest.chunkDuration never actually exists in this
			// schema, so it always falls back to a flat 6s assumption) can
			// drift from the real per-chunk boundaries enough, for a short/
			// arbitrary clip, to grant a range that excludes the chunk
			// playback actually needs — confirmed live as some (not all)
			// clips never starting, the service worker reporting
			// "segmentNotAvailable" for the exact chunk excluded this way.
			// The dialog's own player (toolPreview, above) has already
			// decrypted the real per-chunk timestamps as part of normal HLS
			// setup — see Client/stream.js's returned handle.index — so hand
			// them through here to let createShareLink use the same lookup
			// _prefetchLoop.js itself uses at actual playback time, instead
			// of it guessing blind.
			var playerIndex = tool.videoTool && tool.videoTool._handle && tool.videoTool._handle.index;
			var shareManifest = playerIndex
				? Q.extend({}, safecloudVideo.manifest, { _index: playerIndex })
				: safecloudVideo.manifest;

			Q.Safecloud.Client.createShareLink(shareManifest, safecloudVideo.rootKey, {
				teaser: [clipStart, clipEnd]
			}).then(function (r) {
				if (!r || !r.capability) {
					throw new Error("Failed to build the clip's capability");
				}
				var attrsVideo = {
					source: "safecloud",
					rootCid: categoryVideo.rootCid,
					clipStart: clipStart,
					clipEnd: clipEnd,
					// So Media_clip_response_column can look up the ORIGINAL
					// episode's own payment status when this clip is later
					// opened — the clip stream itself never has a "payment"
					// attribute (it isn't priced on its own), so without
					// this, that check would always read as "free" and hand
					// out the bounded/shared capability even to a viewer who
					// already has full paid/free access to the episode.
					episodePublisherId: category.fields.publisherId,
					episodeStreamName: category.fields.name
				};
				Q.req("Media/clip", ["result", "stream"], function (err, response) {
					var fem = Q.firstErrorMessage(err, response);
					if (fem) {
						return _error(fem);
					}
					if (Q.getObject("slots.result", response) === "needPayment") {
						var createCost = Q.getObject("clip.createCost", Q.Media);
						Q.Assets.pay({
							amount: createCost.amount,
							currency: createCost.currency,
							userId: Q.Users.currentCommunityId,
							toStream: { streamName: "Media/clip" },
							reason: "CreatePaidStream",
							onSuccess: function () {
								Q.handle(_processSafecloud, tool, [$currentContent, _error]);
							},
							onFailure: function () {
								state.mainDialog.removeClass('Q_uploading');
							}
						});
						return;
					}
					// NOT Q.handle(callback, ...) — callback is Streams/preview's
					// own "go ahead and create the stream yourself now" signal
					// (see the non-safecloud "new stream" branch below, which
					// proves the contract: it also never calls callback after
					// its own Q.req creates the stream). Calling it here — a
					// request that already fully created/updated the clip
					// itself via Media_clip_saveSafecloudClip — told
					// Streams/preview to ALSO run its own generic creation
					// flow on top, confirmed live: a second "Media/clip"
					// stream (with none of this attributes.video payload,
					// since Streams/preview's own flow knows nothing about
					// it) appeared alongside the correct one from a single
					// Save click.
					//
					// The episode's own "N Clips" list (Media/clip.js's
					// Streams/related, realtime: true) is a SEPARATE tool
					// instance from this composer — nothing here creates it
					// or wires them together directly. It's SUPPOSED to
					// live-update itself via a "Streams/relatedTo" message
					// (confirmed live, server-side: the message is posted
					// correctly, at the exact moment the relate happens), but
					// that requires the list to actually be retained/
					// subscribed to the episode stream's live messages, which
					// evidently isn't reliably the case here — confirmed
					// live: the list stayed showing only the old clips until
					// a full page reload. Rather than chase why the
					// subscription-based path isn't firing, just tell any
					// matching Streams/related instance already on this page
					// to refresh directly.
					Q.each(Q.Tool.byName("Streams/related"), function (id, related) {
						var rs = related.state;
						if (rs.relationType === "Media/clip"
						&& rs.publisherId === attrsVideo.episodePublisherId
						&& rs.streamName === attrsVideo.episodeStreamName) {
							related.refresh();
						}
					});
					tool.closeComposer();
					var newStream = Q.getObject(["slots", "stream"], response);
					if (newStream) {
						// NOT Q.Streams.invite — that generates a token-based
						// URL (?Q.Streams.token=...) through the real
						// Streams_Invite accept/decline machinery, which is
						// for granting PRIVATE access to specific people.
						// Confirmed live: opening a copied "invite" link
						// showed an unwanted "X has invited you to: Y —
						// Accept/Decline" prompt before the clip would even
						// load. A clip needs none of that — it's already
						// meant to be a plain, public link (the Safecloud
						// grant is what actually controls what's watchable,
						// entirely separate from Streams' own access
						// system), so this just shows the clip's own direct
						// URL with a copy button.
						tool.showClipCreatedDialog(newStream);
					}
				}, {
					method: "post",
					fields: {
						params: {
							title: titleVal,
							content: contentVal,
							attributes: { video: attrsVideo }
						},
						related: tool.preview.state.related,
						capability: JSON.stringify(r.capability)
					}
				});
			}).catch(function (err) {
				_error(err && err.message || String(err));
			});
		};

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

			if (action === "video" && isSafecloud) {
				return _processSafecloud($currentContent, _error);
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
					isVideo: !!videoUrl || isSafecloud,
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

				if (isSafecloud) {
					var $videoElement = $(".Q_tabbing_container [data-content=video] .Media_clip_composer_preview", state.mainDialog);
					var $videoClipElement = $(".Q_tabbing_container [data-content=video] .Media_clip_composer_clip", state.mainDialog);
					// Q/clip (like Q/video, whose convention it follows) works
					// in MILLISECONDS throughout (Q_clip_position holds
					// whatever getCurrentPosition() returns, fed straight
					// into Q.displayDuration()) — but clipStart/clipEnd are
					// stored server-side, and read back here, in SECONDS
					// (matching Media_clip_saveSafecloudClip's own floatval()
					// range check and Q.Safecloud.Client.createShareLink's
					// teaser option). Converted at this one boundary so nothing
					// downstream (Q/clip itself, or _processSafecloud's read-back
					// below) has to know both units exist.
					//
					// Also explicitly null (not undefined) when unset: Q/clip's
					// own refresh() checks `state.startPosition !== null` to
					// decide whether a button starts already "fixed" (green) —
					// undefined !== null is true, so passing undefined here
					// (as Q.getObject naturally returns for a brand new clip's
					// missing clipStart/clipEnd) incorrectly marked a fresh
					// composer's buttons as already set, with a literal
					// "undefined" for their raw (invisible-until-fixed)
					// Q_clip_position text.
					var savedVideo = stream ? (stream.getAttribute("video") || {}) : {};
					var savedClipStart = Q.getObject("clipStart", savedVideo);
					var savedClipEnd = Q.getObject("clipEnd", savedVideo);
					var videoClipStart = (savedClipStart != null) ? Math.round(savedClipStart * 1000) : null;
					var videoClipEnd = (savedClipEnd != null) ? Math.round(savedClipEnd * 1000) : null;
					// Only ever reachable for a viewer who already has full
					// access to the episode (see Media/clip.js's showAddClip,
					// gated behind its own payment check) — the full manifest
					// + rootKey (not a bounded capability) is what column.php
					// hands to exactly that viewer, for exactly this purpose.
					var safecloudVideo = Q.getObject("Media.clip.video", Q.plugins);
					// getCurrentPosition() returns milliseconds (matches
					// Q/video's own convention — see Safecloud/video.js's
					// own doc comment), but Q.Safecloud.Client.stream()'s
					// "at" option is in seconds.
					var startAt = (state.playerTool && state.playerTool.getCurrentPosition)
						? state.playerTool.getCurrentPosition() / 1000 : 0;

					if (!safecloudVideo || !safecloudVideo.manifest || !safecloudVideo.rootKey) {
						$videoClipElement.html("<div class='Media_clip_composer_rangeHint'>"
							+ (tool.text.ClipNotAvailable != null
								|| "Can't create a clip right now \u2014 try reloading the page.")
							+ "</div>");
					} else {
						$videoElement.tool("Safecloud/video", {
							manifest:   safecloudVideo.manifest,
							capability: { rootKey: safecloudVideo.rootKey },
							jetUrl:     Q.getObject("Media.clip.jetUrl", Q.plugins) || undefined,
							at:         startAt || 0
						}).activate(function () {
							var toolPreview = this;
							tool.videoTool = this;

							// Q/clip's own refresh() appends tool.originalHTML
							// (whatever was already in this element BEFORE the
							// tool was created) after its own rendered buttons —
							// a feature for embedders that want extra markup
							// preserved across refreshes, which this composer
							// has no use for. Confirmed live: leaving this
							// element non-empty (even just whitespace) at
							// Q/clip's construction meant that leftover content
							// re-appeared, literally as the text "undefined" in
							// one observed case, right after the buttons.
							$videoClipElement.empty();
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
							$("<div class='Media_clip_composer_rangeError'>").insertAfter($videoClipElement);
						});
					}
				} else if (videoUrl) {
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

					// Guards against a double-submit (a second click before
					// the first request's async work — createShareLink's
					// crypto + the POST itself — finishes) creating two
					// clip streams from one Save action; the server side
					// now also closes this with an atomic fetchOrCreate
					// (see Media_clip_saveSafecloudClip), but this is the
					// cheap first line of defense.
					if (state.mainDialog.hasClass('Q_uploading')) { return; }
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
	},
	/**
	 * Shown right after a shared clip is created/updated — just the one
	 * thing the creator actually needs at that moment (the link, and a way
	 * to copy it). Deliberately NOT Q.Streams.invite — see this method's
	 * own caller for why that generates the wrong kind of URL entirely for
	 * a clip (a real invite/access-grant token, prompting an Accept/Decline
	 * step, instead of a plain public link).
	 * @method showClipCreatedDialog
	 * @param {Object} stream The created/updated clip's exported stream fields
	 */
	showClipCreatedDialog: function (stream) {
		var tool = this;
		var text = tool.text || {};
		var url = Q.url('clip/' + stream.publisherId + '/' + stream.name.split('/').pop());

		var $content = $(
			"<div class='Media_clip_created'>" +
				"<p class='Media_clip_created_explanation'></p>" +
				"<div class='Media_clip_created_linkRow'>" +
					"<a target='_blank' rel='noopener'></a>" +
					"<button type='button' class='Media_clip_created_copy'></button>" +
				"</div>" +
			"</div>"
		);
		$(".Media_clip_created_explanation", $content)
			.text(text.ClipCreatedExplanation || "Anyone with this link can watch the clip:");
		$(".Media_clip_created_linkRow a", $content).attr("href", url).text(url);
		var copyLabel = text.Copy || "Copy";
		var $copy = $(".Media_clip_created_copy", $content)
			.attr("title", copyLabel).html("&#x29C9;");
		$copy.on(Q.Pointer.fastclick, function () {
			if (!navigator.clipboard) { return; }
			navigator.clipboard.writeText(url).then(function () {
				$copy.addClass("Media_clip_created_copied");
				setTimeout(function () {
					$copy.removeClass("Media_clip_created_copied");
				}, 1500);
			}).catch(function () {});
		});

		return Q.Dialogs.push({
			title: text.ClipCreatedTitle || "Clip link",
			className: "Media_clip_createdDialog",
			content: $content[0],
			removeOnClose: true
		});
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