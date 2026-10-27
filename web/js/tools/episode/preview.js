(function (Q, $, window, undefined) {

	/**
	 * Format a duration in seconds as "m:ss" (or "h:mm:ss" past an hour),
	 * for the largeThumbCard layout's over-thumbnail duration badge.
	 * @method _formatDuration
	 * @private
	 * @param {Number} seconds
	 * @return {String}
	 */
	function _formatDuration(seconds) {
		seconds = Math.max(0, Math.round(seconds || 0));
		var h = Math.floor(seconds / 3600);
		var m = Math.floor((seconds % 3600) / 60);
		var s = seconds % 60;
		var ss = (s < 10 ? "0" : "") + s;
		if (h > 0) {
			return h + ":" + (m < 10 ? "0" : "") + m + ":" + ss;
		}
		return m + ":" + ss;
	}

	/**
	 * Format a count as an abbreviated string ("696K", "2.3M"), for the
	 * searchResultCard layout's views stat.
	 * @method _formatCount
	 * @private
	 * @param {Number} count
	 * @return {String}
	 */
	function _formatCount(count) {
		count = Math.max(0, Math.round(count || 0));
		if (count < 1000) {
			return String(count);
		}
		if (count < 1000000) {
			return (Math.round(count / 100) / 10) + "K";
		}
		return (Math.round(count / 100000) / 10) + "M";
	}

	// Keep <html>.Media_clip in sync with whether an episode's own detail
	// column is actually open, for the largeThumbCard layout's row-style CSS
	// (see episodePreview.css). Q's router already adds this class on a real
	// full page load to /clip/..., but Q/columns opens/closes the clip
	// column as an in-place AJAX column push/pop — it never touches
	// Q.info.uri or re-runs the router's page-class logic, so that alone
	// misses the common "click a thumbnail" path entirely. Media/clip tool
	// instances activate/get removed exactly when that column opens/closes
	// (regardless of navigation path), so hook those instead.
	Q.Tool.onActivate('Media/clip').add(function () {
		document.documentElement.classList.add('Media_clip');
	}, 'Media/episode/preview');
	Q.Tool.beforeRemove('Media/clip').add(function () {
		document.documentElement.classList.remove('Media_clip');
	}, 'Media/episode/preview');

	/**
	 * Media/episode/preview tool.
	 * Renders a tool to preview Media episode
	 * @class Media/episode/preview
	 * @constructor
	 * @param {Object} [options] options to pass besides the ones to Streams/preview tool
	 * @param {boolean|object} [options.expandable=false] If true - make preview expandable. Also can be {expanded: [false|true]} to expand/collapse loaded tools
	 * @param {function} [options.layout] Can be "default", "cards", "largeThumbCard"
	 *   (a YouTube-home-style card: thumbnail with duration overlay, title,
	 *   author avatar + name, and upload date), or "searchResultCard" (a
	 *   YouTube-search-result-style row: thumbnail with duration overlay on
	 *   the left, title/views/date/author/one-line description on the
	 *   right). Defaults to the app-wide config Media.clip.episodePreviewLayout
	 *   (set by Media_before_Q_responseExtras from Q_Config — "default" on the
	 *   platform, overridden per-app, e.g. "largeThumbCard" in Fans's own
	 *   local/app.json) rather than a fixed value, so most callers never
	 *   need to pass this explicitly at all.
	 * @param {Number} [options.viewsCount] For the "searchResultCard" layout,
	 *   the number to show as the views stat. Unlike duration/date/author,
	 *   this isn't derivable from the stream itself (there's no per-stream
	 *   view counter on the model) — callers that want it shown (e.g.
	 *   Media/clip/search.js, which gets it from its own search response)
	 *   must pass it explicitly; omitted entirely when not provided.
	 * @param {String} [options.templateStyle=classic] Template style. Can be "classic", "square" (icon square on the left) and "tall" (icon on the top).
	 * @param {function} [options.onResults] Set here function to update results before render.
	 * @param {Number} [options.cardMinWidth] For "cards"/"largeThumbCard" layouts, the
	 *   minimum width (in px) each card is allowed to shrink to in the
	 *   surrounding .Media_episodes_cards grid, before another column is
	 *   added — i.e. this controls how many cards fit per row. Defaults to
	 *   the app-wide config Media.clip.episodePreviewCardMinWidth, falling
	 *   back to the grid's own CSS default (300px) when neither is set.
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
		layout: Q.getObject("Media.clip.episodePreviewLayout", Q.plugins) || "default",
		cardMinWidth: Q.getObject("Media.clip.episodePreviewCardMinWidth", Q.plugins) || null,
		viewsCount: null,
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
			var publishDate;

			if (publishTime) {
				publishDate = new Date(parseInt(publishTime) * 1000);
			} else if (stream.fields && stream.fields.insertedTime) {
				// Neither attribute is set for episodes saved before either the
				// YouTube-scrape path (which sets video.publishTime) or the
				// safecloud-upload path (which now sets publishTime on first
				// publish — see Media/dropVideo/post.php) ran, and for a
				// safecloud upload that predates that fix — fall back to the
				// stream's own insertedTime rather than showing no date at all.
				publishDate = new Date(stream.fields.insertedTime.replace(' ', 'T') + 'Z');
			}

            if(publishDate) {
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

			if (state.cardMinWidth) {
				var $cardsContainer = $toolElement.closest('.Media_episodes_cards');
				if ($cardsContainer.length) {
					$cardsContainer[0].style.setProperty('--Media_episode_card_minWidth', state.cardMinWidth + 'px');
				}
			}

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
            } else if (state.layout === 'largeThumbCard') {
                // videoDuration is its own top-level stream attribute (see
                // Media/episodeEdit/response.php); the "video" attribute itself
                // only holds source/rootCid/clipStart/clipEnd for Safecloud-hosted
                // clips. Older YouTube-imported episodes instead nest duration
                // inside "video", so fall back to that.
                var videoDuration = stream.getAttribute('videoDuration')
                    || Q.getObject('duration', stream.getAttribute('video'));
                var duration = videoDuration ? _formatDuration(videoDuration) : null;

                Q.Template.render('Media/episode/largeThumbCard', {
                    iconURL: stream.iconUrl(400),
                    title: stream.fields.title,
                    duration: duration
                }, function (err, html) {
                    if (err) {
                        return;
                    }

                    tool.element.innerHTML = html;

                    // icon-only avatar (contents:false hides the name)
                    $('.Media_episode_largeThumbCard_avatar', tool.element).tool('Users/avatar', {
                        userId: publisherId,
                        icon: 40,
                        contents: false
                    }).activate();

                    // name-only avatar (icon:false hides the icon image)
                    $('.Media_episode_largeThumbCard_author', tool.element).tool('Users/avatar', {
                        userId: publisherId,
                        icon: false,
                        "short": true
                    }).activate();

                    if (publishDate) {
                        $('.Media_episode_largeThumbCard_date', tool.element).tool('Q/timestamp', {
                            time: Math.floor(publishDate.getTime() / 1000)
                        }).activate();
                    }
                });

                $toolElement.on(Q.Pointer.fastclick, function () {
                    Q.handle(state.onInvoke, tool);
                });
            } else if (state.layout === 'searchResultCard') {
                var searchVideoDuration = stream.getAttribute('videoDuration')
                    || Q.getObject('duration', stream.getAttribute('video'));
                var searchDuration = searchVideoDuration ? _formatDuration(searchVideoDuration) : null;
                var viewsText = state.viewsCount ? _formatCount(state.viewsCount) : null;

                Q.Template.render('Media/episode/searchResultCard', {
                    iconURL: stream.iconUrl(400),
                    title: stream.fields.title,
                    duration: searchDuration,
                    viewsText: viewsText,
                    description: stream.fields.content || ''
                }, function (err, html) {
                    if (err) {
                        return;
                    }

                    tool.element.innerHTML = html;

                    $('.Media_episode_searchResultCard_avatar', tool.element).tool('Users/avatar', {
                        userId: publisherId,
                        icon: 40,
                        contents: false
                    }).activate();

                    $('.Media_episode_searchResultCard_author', tool.element).tool('Users/avatar', {
                        userId: publisherId,
                        icon: false,
                        "short": true
                    }).activate();

                    if (publishDate) {
                        $('.Media_episode_searchResultCard_date', tool.element).tool('Q/timestamp', {
                            time: Math.floor(publishDate.getTime() / 1000)
                        }).activate();
                    }
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
				trigger: tool.element,
				// Config-driven, app-specific opt-in (see loadClip's own
				// comment) -- off by default on the platform, on for Fans
				// via Media.clip.episodePreviewReplaceColumn in its
				// local/app.json, same wiring pattern as episodePreviewLayout.
				replace: !!Q.getObject("Media.clip.episodePreviewReplaceColumn", Q.plugins)
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

	Q.Template.set("Media/episode/largeThumbCard", `
<div class="Media_episode_largeThumbCard">
    <div class="Media_episode_largeThumbCard_thumb"
         style="background-image: url({{iconURL}});">
        {{#if duration}}
        <span class="Media_episode_largeThumbCard_duration">{{duration}}</span>
        {{/if}}
    </div>
    <div class="Media_episode_largeThumbCard_meta">
        <div class="Media_episode_largeThumbCard_avatar"></div>
        <div class="Media_episode_largeThumbCard_text">
            <div class="Media_episode_largeThumbCard_title">{{{title}}}</div>
            <div class="Media_episode_largeThumbCard_sub">
                <span class="Media_episode_largeThumbCard_author"></span>
                <span class="Media_episode_largeThumbCard_date"></span>
            </div>
        </div>
    </div>
</div>`);

	Q.Template.set("Media/episode/searchResultCard", `
<div class="Media_episode_searchResultCard">
    <div class="Media_episode_searchResultCard_thumb"
         style="background-image: url({{iconURL}});">
        {{#if duration}}
        <span class="Media_episode_searchResultCard_duration">{{duration}}</span>
        {{/if}}
    </div>
    <div class="Media_episode_searchResultCard_meta">
        <div class="Media_episode_searchResultCard_title">{{{title}}}</div>
        <div class="Media_episode_searchResultCard_stats">
            {{#if viewsText}}
            <span class="Media_episode_searchResultCard_views">{{viewsText}}</span>
            {{/if}}
            <span class="Media_episode_searchResultCard_date"></span>
        </div>
        <div class="Media_episode_searchResultCard_authorRow">
            <div class="Media_episode_searchResultCard_avatar"></div>
            <span class="Media_episode_searchResultCard_author"></span>
        </div>
        {{#if description}}
        <div class="Media_episode_searchResultCard_description">{{description}}</div>
        {{/if}}
    </div>
</div>`);

})(Q, Q.jQuery, window);