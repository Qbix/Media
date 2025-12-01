(function (Q, $, window, undefined) {

	/**
	 * Media/episode/preview tool.
	 * Renders a tool to preview Media episode
	 * @class Media/episode/preview
	 * @constructor
	 * @param {Object} [options] options to pass besides the ones to Streams/preview tool
	 * @param {boolean|object} [options.expandable=false] If true - make preview expandable. Also can be {expanded: [false|true]} to expand/collapse loaded tools
	 * @param {function} [options.layout="default"] Can be "default" or "cards".
	 * @param {String} [options.templateStyle=classic] Template style. Can be "classic", "square" (icon square on the left) and "tall" (icon on the top).
	 * @param {function} [options.onResults] Set here function to update results before render.
	 */
	Q.Tool.define("Media/episode/preview", ["Streams/preview"], function _Media_episode_preview (options, preview) {
		var tool = this;
		var state = this.state;
		tool.preview = preview;
		tool.previewState = preview.state;

		// apply template class
		$(tool.element).addClass("Media_episode_preview_template_" + tool.state.templateStyle);

			// inherit expandable from preview
		if (preview.state.expandable && !state.expandable) {
			state.expandable = preview.state.expandable;
		}

		// save preview closeable and editable to current preview and set to false in streams/preview
		// this need because streams/preview add Q/actions to element, but Q/expandable ignore filled elements
		state.closeable = preview.state.closeable;
		state.editable = preview.state.editable;
		if (state.layout === "default") {
			preview.state.closeable = preview.state.editable = false;
		}

		preview.state.onCreate.set(function () {
			Q.Dialogs.pop();
		}, tool);

		Q.Text.get('Media/content', function (err, text) {
			var msg = Q.firstErrorMessage(err);
			if (msg) {
				return console.warn(msg);
			}

			tool.text = text;
			preview.state.onRefresh.add(tool.refresh.bind(tool));
			preview.state.creatable.preprocess = tool.composer.bind(tool);
		});

		// observe dom elements for mutation
		tool.domObserver = new MutationObserver(function (mutations) {
			mutations.forEach(function(mutation) {
				if (mutation.type !== 'childList' || Q.isEmpty(mutation.removedNodes)) {
					return;
				}

				mutation.removedNodes.forEach(function(removedElement) {
					if (removedElement.classList.contains("Streams_preview_tool")) {
						Q.Tool.remove(tool.element, true, true);
					}
				});
			});
		});
	},

	{
		relationType: "Media/clip",
		expandable: false,
		templateStyle: Q.Media.episode.templateStyle || "classic",
		onResults: null,
		layout: "default",
		onInvoke: function () {
			this.openFullEpisode();
		}
	},
	{
		refresh: function (stream, callback) {
			var tool = this;
			var state = this.state;
			tool.stream = stream;
			var publisherId = stream.fields.publisherId;
			var streamName = stream.fields.name;
			var $toolElement = $(tool.element);
			var $relatedSegments = $("<div class='Media_episode_related_clips' data-loading='true'>");

			if (!Q.Streams.isStream(stream) || $toolElement.prop("name") === "addEpisode") {
				return;
			}

			// retain with stream
			Q.Streams.retainWith(tool).get(publisherId, streamName);

            var publishTime = stream.getAttribute("publishTime") || Q.getObject("publishTime", stream.getAttribute("video"));
			var dateFormatted, dateFormattedForCard;

            if(publishTime) {
                var publishDate = new Date(parseInt(publishTime) * 1000);
                var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                var year = publishDate.getFullYear();
                var month = months[publishDate.getMonth()];
                var date = publishDate.getDate();
                var hour = publishDate.getHours();
                var min = publishDate.getMinutes();
                var ampm = hour >= 12 ? 'pm' : 'am';
                hour = hour % 12;
                hour = hour ? hour : 12;
                min = min < 10 ? '0' + min : min;
                dateFormatted = month + " " + date + ", " + year;
                dateFormattedForCard = month + " " + date + ", " + year + ", " + hour + ":" + min + ' ' + ampm;
            }

			var _onPreviewActivated = function () {
				// set beforeClose method to confirm
				this.preview.state.beforeClose = function (_delete) {
					Q.confirm(tool.text.AreYouSureDeleteEpisode, function (result) {
						if (result){
							_delete();
						}
					});
				};

				if(dateFormatted) {
					$(".Streams_preview_title", this.element).append(" <span class='Media_episode_publishTime'>" + dateFormatted + "</span>");
				}
			};

			if(state.layout === 'cards') {
				Q.Template.render('Media/episode/card', {
					iconURL:stream.iconUrl(400),
					title:stream.fields.title,
					date: dateFormattedForCard
				}, function (err, html) {
					if(err){
						return;
					}
					
					tool.element.innerHTML = html;
					$('.Streams_preview_episode_users_inner', tool.element).tool('Streams/participants', {
                        publisherId: stream.fields.publisherId,
                        streamName: stream.fields.name,
                        templates: {
                            invite: {
                                fields: {
                                    alt: 'Share',
                                    title: 'Share'
                                }
                            }
                        }
					}).activate();

					$('.Streams_preview_episode_card_title', tool.element).plugin('Q/textfill', {
						maxFontPixels: 25,
						minFontPixels: 12
					}, stream.fields.name.split("/").pop());
                });

				$toolElement.on(Q.Pointer.fastclick, function () {
                    Q.handle(state.onInvoke, tool);
                });
            } else {
                if (!state.expandable) {
                    $toolElement.tool("Streams/preview", {
                        publisherId: publisherId,
                        streamName: streamName,
                        closeable: state.closeable,
                        editable: state.editable
                    }).tool("Streams/default/preview", {
						onRefresh: _onPreviewActivated,
						onInvoke: new Q.Event(function () {}, 'Streams/default/preview')
                    }).activate();

                    // "view full episode" button
					$toolElement.on(Q.Pointer.fastclick, function () {
						Q.handle(state.onInvoke, tool);
					});

                    return;
                }

                $toolElement.tool("Q/expandable", Q.extend(state.expandable, {
                    title: "",
                    content: "",
                    evenIfFilled: true,
                    onExpand: function () {
                        $relatedSegments.tool("Streams/related", {
                            publisherId: publisherId,
                            streamName: streamName,
                            relationType: state.relationType,
                            editable: false,
                            closeable: true,
                            realtime: true,
                            sortable: false,
                            relatedOptions: {
                                withParticipant: false,
                                ascending: true
                            }
                        }).activate(function () {
                            this.state.onUpdate.add(function () {
                                $(this.element).attr("data-loading", false);
                            }, tool);
                        });
                    }
                })).activate(function () {
                    var $h2 = $("h2", this.element);
                    var $content = $(".Q_expandable_content", this.element);

                    // observe preview tool element for DOM modifications
                    if ($h2[0] instanceof HTMLElement) {
                        tool.domObserver.observe($h2[0], {childList: true});
                    } else {
                        console.warn("Media/episode/preview: h2 is not a HTMLElement");
                    }


                    // remove duplicated Q/actions
					$toolElement.plugin("Q/actions", "remove");

                    $("<div>").appendTo($h2).tool("Streams/preview", {
                        publisherId: publisherId,
                        streamName: streamName,
                        closeable: state.closeable,
                        editable: state.editable
                    }).tool("Streams/default/preview", {
						onRefresh: _onPreviewActivated,
						onInvoke: new Q.Event(function () {}, 'Streams/default/preview')
                    }).activate();

                    // "view full episode" button
                    $("<button class='Q_button' name='viewFull'>").appendTo($content).text(tool.text.ViewFullEpisode).on(Q.Pointer.fastclick, tool.openFullEpisode.bind(tool));

                    $relatedSegments.appendTo($content);
                    $relatedSegments[0].forEachTool('Streams/preview', function () {
                        var clipTool = this;
                        var publisherId = this.state.publisherId;
                        var streamName = this.state.streamName;

                        $(this.element).on(Q.Pointer.fastclick, function () {
                            Q.Media.loadClip(streamName.split('/').pop(), {
                                publisherId: publisherId,
                                trigger: clipTool.element
                            });
                        });
                    });
                });
			}
		},
		/**
		 * Open full episode column
		 * @method openFullEpisode
		 */
		openFullEpisode: function () {
			var tool = this;
			var stream = this.stream;

			Q.Media.loadClip(stream.fields.name.split('/').pop(), {
				publisherId: stream.fields.publisherId,
				trigger: tool.element
			});
		},
		/**
		 * Start composer dialog
		 * @method composer
		 * @param {function} callback Need to call this function to start create stream process
		 */
		composer: function (callback) {
			var tool = this;
			var state = this.state;

			Q.Dialogs.push({
				title: tool.text.NewEpisode,
				className: "Media_dialog_newEpisode",
				content: "<div data-name='title'></div><button class='Q_button' type='button' name='add'>Add New Episode</button>",
				onActivate: function (dialog) {
					var $title = $("input[name=title]", dialog);
					var platform = null;
					var videoUrl = null;
					var videoId = null;
					var publishTime = null;
					var audioUrl = null;
					var $submit = $("button[name=add]", dialog);

					$("div[data-name=title]", dialog).tool("Websites/lookup", {
						platforms: {
							youtube: true
						},
						onResults: function (results) {
							return Q.typeOf(state.onResults) === "function" && state.onResults(results);
						}
					}).activate(function () {
						this.state.onChoose.set(function (element, detailes) {
							$title = $("input[name=filter]", this.element);
							platform = $(element).attr("data-platform");
							videoUrl = $(element).attr("data-url");
							publishTime = $(element).attr("data-time") || null;
							videoId = $(element).attr("data-videoId");

							var videoTool = Q.Tool.from($(".Q_video_tool", dialog), "Q/video");
							if (videoTool) {
								videoTool.state.url = videoUrl;
								videoTool.refresh();
							} else {
								$("<div>").insertBefore($submit).tool("Q/video", {
									url: videoUrl
								}).activate();
							}
						}, tool);
						this.state.onClear.set(function () {
							var videoTool = Q.Tool.from($(".Q_video_tool", dialog), "Q/video");
							videoTool && Q.Tool.remove(videoTool.element, true, true);
						}, tool);
					});

					$submit.on(Q.Pointer.fastclick, function () {
						var title = $title.val();

						// if videoUrl didn't choose with Q/filter, than may be user type url manually
						videoUrl = videoUrl || $("input[name=filter]", dialog).val();

						if (!videoUrl && !audioUrl) {
							return Q.alert("Please define even one url");
						}

						if (videoUrl && !videoUrl.isUrl()) {
							return Q.alert("Wrong video url");
						}
						if (audioUrl && !audioUrl.isUrl()) {
							return Q.alert("Wrong audio url");
						}

						dialog.addClass("Q_working");

						Q.req('Websites/scrape', ['result'], function (err, response) {
							Q.Dialogs.pop();

							var msg = Q.firstErrorMessage(err, response && response.errors);
							if (msg) {
								return Q.alert(msg);
							}

							var result = response.slots.result;
							if (Q.typeOf(state.onResults) === "function") {
								result = state.onResults([result])[0];
							}

							// remove from title all cyrilic symbols, because some time may be exception from mysql (https://issues.qbix.com/issues/2406)
							title = (title || result.title).replace(/[\u0250-\ue007]/g, '');
							var content = String(result.description).replace(/[\u0250-\ue007]/g, '');
							var weight = null;
							if (result.publishTime) {
								weight = /^\d+$/.test(result.publishTime) ? result.publishTime : (new Date(result.publishTime)).getTime().toString().slice(0, -3);
							} else {
								weight = new Date();
							}

							Q.handle(callback, tool.preview, [{
								title: title,
								content: content,
								icon: result.iconBig || result.iconSmall,
								attributes: {
									video: {url: videoUrl, duration: result.duration},
									audio: {url: audioUrl},
									publishTime: publishTime
								}
							}, weight]);
						}, {
							method: 'post',
							fields: {
								url: videoUrl || audioUrl,
								videoId,
								platform
							}
						});
					});
				}
			});
		}
	});
	
	Q.Template.set("Media/episode/card", `
<div class="Streams_preview_episode_card_con">
    <div class="Streams_preview_episode_card_inner">
        <div class="Streams_preview_episode_card_bg"
             style="background-image: url({{iconURL}});"></div>
        <div class="Streams_preview_episode_card_fg">
            <div class="Streams_preview_episode_card_title">
            	<div class="Streams_preview_episode_card_title_text">{{{title}}}</div>
            </div>
            <div class="Streams_preview_episode_card_info">
                <div class="Streams_preview_episode_card_info_date">
                    <div class="Streams_preview_episode_info_date_text">{{date}}</div>
                </div>
            </div>
        </div>
    </div>
    <div class="Streams_preview_episode_users_con">
        <div class="Streams_preview_episode_users_inner"></div>
    </div>
</div>`);
	
})(Q, Q.jQuery, window);