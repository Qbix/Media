"use strict";
(function(Q, $, undefined) {

var Communities = Q.Communities;
var Streams = Q.Streams;
var Media = Q.Media;

Q.exports(function (options, index, columnElement, data) {
	var $content = $(".Q_column_slot", columnElement);
	var loggedUserId = Q.Users.loggedInUserId();
	var $feedsColumn = $(".Media_feeds_column", columnElement);
	var $feedsBox = $(".Media_feeds", $feedsColumn);
	var $titleContainer = $('.Q_columns_title_container', columnElement);
	var underCommunityColumn = $feedsColumn.closest(".Communities_column_community").length;

	// if feeds column loaded from community column (feeds tab)
	// data.communityId defined to community selected
	var underCommunityId = Q.getObject('communityId', data);

	var currentCommunityId = Q.Users.currentCommunityId;

	Q.addStylesheet('{{Media}}/css/columns/feeds.css');
	Q.addStylesheet('{{Media}}/css/columns/feedComposer.css');
	Q.addStylesheet('{{Media}}/css/tools/feedPreview.css');
	Q.addStylesheet('{{Media}}/css/columns/feedsAccess.css');
	Q.addStylesheet([
		'{{Calendars}}/css/composer.css',
		'{{Q}}/pickadate/themes/default.css',
		'{{Q}}/pickadate/themes/default.date.css'
	]);
	Q.addScript([
		'{{Q}}/pickadate/picker.js',
		'{{Q}}/pickadate/picker.date.js'
	]);

	function _eachFeedPreview (callback) {
		$(".Media_feed_preview_tool", columnElement).each(function () {
			var tool = Q.Tool.from(this, "Streams/preview");

			tool && Q.handle(callback, tool);
		});
	}

	// add feed tool to the list
	function _addFeed(publisherId, streamName) {
		var exists = false;

		_eachFeedPreview(function () {
			if (this.state.publisherId === publisherId && this.state.streamName === streamName) {
				exists = true;
			}
		});

		if (exists) {
			return;
		}

		$('<div>').tool("Streams/preview", {
			publisherId: publisherId,
			streamName: streamName,
			editable: false,
			closeable: true
		}).tool("Media/feed/preview")
		.prependTo($feedsBox)
		.activate(function () {
			$(this.element).addClass("Q_newsflash");
		});

		$feedsColumn.attr("data-emptyFeeds", 0);
	}

	// listen for Media/feed/closed message and remove preview tool
	Q.Streams.Stream.onMessage(currentCommunityId, 'Media/feeds', 'Media/feed/closed')
	.set(function (message) {
		var instructions = message.getAllInstructions();

		// only relation type Media/webrtc and not for myself
		_eachFeedPreview(function () {
			if (this.state.publisherId === instructions.publisherId
			&& this.state.streamName === instructions.streamName) {
				Q.Tool.remove(this.element, true, true);
			}
		});
	}, "Media/feeds/column");

	Q.Streams.Stream.onMessage(currentCommunityId, 'Media/feeds', 'Media/feed/created')
	.set(function (message) {
		var instructions = message.getAllInstructions();
		_addFeed(instructions.publisherId, instructions.streamName);

	}, "Media/feeds/column");

	// apply infinitescroll tool
	$content.tool('Q/infinitescroll', {
		onInvoke: function () {
			var infiniteTool = this;
			var offset = $(">.Media_feed_preview_tool:visible", $feedsBox).length;

			// skip request if
			if (!this.state.offset) {
				return;
			}

			// skip duplicated (same offsets) requests
			if (this.state.offset >= offset) {
				return;
			}

			infiniteTool.setLoading(true);
			this.state.offset = offset;

			// if this scripts loaded under community column, load feeds from this community
			var communityId = underCommunityColumn ? Q.getObject("Q.Communities.manageCommunityId") || null : null;

			Q.req('Media/feeds', 'load', function (err, data) {
				infiniteTool.setLoading(false);
				err = Q.firstErrorMessage(err, data);
				if (err) {
					return console.error(err);
				}

				if (data.slots.load.length) {
					$(".Media_no_items", $feedsColumn).hide();
				}

				Q.each(data.slots.load, function () {
					$(this).appendTo($feedsBox).activate();
				});
			}, {
				fields: {
					communityId: communityId,
					offset: offset
				}
			});
		}
	}).activate();

	Q.Text.get('Media/content', function (err, text) {
		var _filterFeeds = function () {
			var filter = $(this).val();
			var allFeeds = $(".Media_feeds_column .Media_feeds .Media_feed_preview_tool");
			Q.each(allFeeds, function () {
				var $this = $(this);

				if (!filter || $(".Streams_preview_title", this).text().toUpperCase().indexOf(filter.toUpperCase()) >= 0) {
					if (Q.info.isMobile) {
						$this.attr('data-match', true);
					} else {
						$this.fadeIn(500);
					}
				} else {
					if (Q.info.isMobile) {
						$this.attr('data-match', false);
					} else {
						$this.fadeOut(500);
					}
				}
			});
		};

		var _newFeed = function () {
			var $this = $(this);
			$this.addClass('Q_pop');
			setTimeout(function(){
				$this.removeClass('Q_pop');
			}, 1000);

			var tool = Q.Tool.byId("Q_columns-Media");
			var index = $this.closest('.Q_columns_column').data('index') + 1 || 1;
			tool.close({min:index}, null, {animation:{duration:0}});
			tool.open({
				title: text.newFeed.Title,
				url: Q.url('newFeed' + (underCommunityId ? '/' + underCommunityId : '')),
				name: 'newFeed'
			}, index);
		};

		// <apply FaceBook column style>
		if (!underCommunityColumn && Q.getObject('layout.columns.style', Communities) === 'facebook') {
			// Create events search
			var $feedFilter = $('<input name="query" class="Media_feedChooser_input" placeholder="' + text.feeds.filterFeeds + '">')
				.on('input', _filterFeeds);

			var icons = [
				//$("<i class='qp-communities-interests'></i>").on(Q.Pointer.fastclick, _filterByInterests),
				//$("<i class='qp-communities-location'></i>").on(Q.Pointer.fastclick, _filterByLocation),
				$("<i class='qp-communities-search Communities_chooser_trigger'></i>")
			];

			if (Q.getObject('Q.Media.newFeedAuthorized')) {
				icons.unshift($("<i class='qp-communities-plus'></i>").on(Q.Pointer.fastclick, _newFeed));
			}

			$titleContainer.tool('Communities/columnFBStyle', {
				icons: icons,
				filter: [$feedFilter]
			}, 'Feeds_column').activate();
		}
		// </apply FaceBook column style>

		$('#Feed_new_feed_button', columnElement)
			.plugin('Q/clickable')
			.off([Q.Pointer.fastclick, 'Communities'])
			.on([Q.Pointer.fastclick, 'Communities'], _newFeed);
		//$('.Communities_filter_locations', columnElement).off(Q.Pointer.click).on(Q.Pointer.click, _filterByLocation);
		//$('.Communities_filter_interests', columnElement).off(Q.Pointer.click).on(Q.Pointer.click, _filterByInterests);
		$('input[name=query].Communities_feedChooser_input')
			.plugin('Q/placeholders')
			.off('input')
			.on('input', _filterFeeds);

		columnElement.forEachTool('Media/feed/preview', function () {
			this.state.onInvoke && this.state.onInvoke.set(function (preview) {
				var $toolElement = $(this.element);

				$toolElement.addClass("Q_working");

				Streams.related.force(preview.state.publisherId, preview.state.streamName, "Media/clip", true, {
					withParticipant: false,
					ascending: true,
					relationsOnly: true,
					stream: true
				}, function () {
					$toolElement.removeClass("Q_working");

					var stream = Q.getObject("stream", this);
					if (stream.testWriteLevel(40)) {
						return Q.handle(Media.pushFeedColumn, preview, [stream]);
					}

					var templateName;
					var enabled = [true];
					var relations = Q.getObject("relations", this);
					if (Q.isEmpty(relations)) {
						templateName = "Media/feed/empty";
					} else {
						templateName = "Media/feed/access";
						var minDate = parseInt(Q.getObject("weight", relations[0])) * 1000;
						var maxDate = parseInt(Q.getObject("weight", relations[relations.length-1])) * 1000;
						Q.each(relations, function () {
							var timeStamp = parseInt(this.weight) * 1000;

							if (isNaN(timeStamp)) {
								return;
							}

							enabled.push(new Date(timeStamp));
						});
					}

					var _updateTimes = function () {
						//TODO: need to create time list
					};

					Q.Dialogs.push({
						className: 'Media_feed_access',
						title: text.feeds.RequestFeedAccess,
						template: {
							name: templateName,
							fields: {
								text: text.feed
							}
						},
						mask: "Media_feed_access_mask",
						onActivate: function (dialog) {
							$("input[name=selectDate]", dialog).pickadate({
								showMonthsShort: true,
								format: 'ddd, mmm d, yyyy',
								formatSubmit: 'yyyy/mm/dd',
								hiddenName: true,
								min: new Date(minDate),
								max: new Date(maxDate),
								disable: enabled,
								container: 'body',
								onStart: function () {

								}
							}).on('change', function () {
								_updateTimes();
							});

							$("button[name=submit]", dialog).on(Q.Pointer.fastclick, function () {
								var $date = $("input[name=selectDate]", dialog);
								var $reason = $("textarea[name=reason]", dialog);
								var valid = true;

								if (!$date.val()) {
									valid = false;
									var $pickerInput = $(".picker__input", dialog);
									$pickerInput.addClass("Q_errorFlash").one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(e) {
										$pickerInput.removeClass("Q_errorFlash");
									});
								}

								if (!$reason.val()) {
									valid = false;
									$reason.addClass("Q_errorFlash").one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(e) {
										$reason.removeClass("Q_errorFlash");
									});
								}

								if (!valid) {
									return false;
								}

								var startDate = $date.val();
								var endDate = new Date(new Date(startDate).getTime() + 60*60*24 * 1000); // 24 hours by default
								endDate = endDate.getFullYear() + "/" + (endDate.getMonth() + 1) + "/" + endDate.getDate();

								Q.req("Media/feed", "access", function () {
									Q.handle(Media.pushFeedColumn, preview, [stream, preview.element, startDate, endDate]);
								}, {
									fields: {
										publisherId: stream.fields.publisherId,
										streamName: stream.fields.name,
										startDate: startDate,
										endDate: endDate,
										reason: $reason.val()
									}
								});

								Q.Dialogs.pop();
							});
						}
					});
				});

				$(this.element).addClass("Q_current").siblings(".Media_feed_preview_tool").removeClass("Q_current");
			}, 'Media/feed/column');
		});
	});
});

Q.Template.set("Media/feed/access",
	"{{text.SelectClip}}" +
	"<input name='selectDate'>" +
	"<textarea placeholder='{{text.AccessReason}}' name='reason'></textarea>" +
	"<button name='submit' class='Q_button'>{{text.Request}}</button>"
);
Q.Template.set("Media/feed/empty","{{text.EmptyVideos}}");
})(Q, Q.jQuery);