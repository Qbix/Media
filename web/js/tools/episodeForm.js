(function (Q, $) {
	/**
	 * Media Tools
	 * @module Media-tools
	 * @main
	 */

	/**
	 * The title/description/categories/price form shared by Media/videoUpload's
	 * step 2 (right after a fresh upload) and Media/episodeEdit (editing an
	 * existing episode's details later) — a two-column layout modeled on
	 * YouTube Studio's upload details screen: title/description/categories/
	 * price on the left, thumbnail + share links on the right, Save button
	 * at the bottom right.
	 *
	 * This tool never talks to the server itself — it only collects and
	 * validates input and fires state.onSave with the result. The embedder
	 * decides what "save" means (create-then-publish for a new upload,
	 * plain update for editing) and calls tool.setSaving()/tool.showError()
	 * to reflect the outcome.
	 *
	 * @class Media episodeForm
	 * @constructor
	 * @param {Object} [options]
	 *   @param {String} [options.title]
	 *   @param {String} [options.content]
	 *   @param {Array} [options.categories] Pre-selected interest names (bare,
 *     e.g. "Bodybuilding" — not "Category: Interest"). Legacy full
 *     "Category: Interest" strings from episodes saved before this format
 *     changed are still accepted and normalized on load.
	 *   @param {String} [options.posterUrl] Thumbnail <img> src
	 *   @param {Number} [options.videoDuration] Video length in seconds, if known
	 *   @param {Number} [options.priceStream] Initial one-time full-episode price
	 *   @param {Number} [options.pricePerMinute] Initial per-minute price (perMinute-only mechanism)
	 *   @param {Boolean} [options.allowPerMinute] Initial state of the "also allow per-minute" checkbox
	 *   @param {String} [options.onSiteUrl] Link to this episode's own clip page. Pass null while unknown yet — shows a "Creating…" placeholder.
	 *   @param {String} [options.standaloneUrl] Link to the standalone Safecloud player. Pass null while unknown yet.
	 *   @param {String} [options.saveLabel] Overrides the Save button's label
	 *   @param {Q.Event} [options.onSave] Fires with (fields) when Save is clicked and validation passes
	 */
	Q.Tool.define("Media/episodeForm", function (options) {
		var tool = this;
		tool.refresh();
	},

	{
		title: '',
		content: '',
		categories: [],
		posterUrl: null,
		videoDuration: 0,
		priceStream: 0,
		pricePerMinute: 0,
		allowPerMinute: false,
		onSiteUrl: null,
		standaloneUrl: null,
		saveLabel: null,
		onSave: new Q.Event()
	},

	{
		refresh: function () {
			var tool = this;
			var state = tool.state;
			var text = tool.text.episodeForm || {};
			var $te = $(tool.element).addClass("Media_episodeForm_tool").empty();

			// Categories/subcategories picked for this episode. Internally
			// still keyed by "Category: Interest" (matching Streams/interests'
			// own DOM id format, Q.normalize(category + ": " + interest) —
			// see interests.js) so the picker's checkboxes can be restored —
			// but the VALUE stored per key (and what actually gets saved/
			// displayed/filtered on) is just the bare interest name, per the
			// user's preference for "Bodybuilding" over "Fitness & Wellness:
			// Bodybuilding". Populated properly once Streams/interests'
			// onReady fires below (needs the loaded taxonomy to resolve a
			// bare saved interest name back to its parent category); until
			// then this just holds the raw options.categories values.
			tool.selectedCategories = {};
			tool.savedCategories = state.categories || [];
			// Saved interests that couldn't be matched back to a parent
			// category in the current taxonomy (see onReady below) — carried
			// through to Save unchanged instead of silently dropped.
			tool.unresolvedCategories = [];

			var $columns = $("<div class='Media_episodeForm_columns'>").appendTo($te);
			var $left = $("<div class='Media_episodeForm_left'>").appendTo($columns);
			var $right = $("<div class='Media_episodeForm_right'>").appendTo($columns);

			$(
				"<label class='Media_episodeForm_label Media_episodeForm_titleLabel'>" +
					"<span>" + (text.Title || "Title") + "</span>" +
					"<input type='text' class='Media_episodeForm_title' required/>" +
				"</label>"
			).appendTo($left);
			$(
				"<label class='Media_episodeForm_label Media_episodeForm_descriptionLabel'>" +
					"<span>" + (text.Description || "Description") + "</span>" +
					"<textarea class='Media_episodeForm_description'></textarea>" +
				"</label>"
			).appendTo($left);
			$(
				// A plain <div>, not <label> — this wraps a whole
				// Streams/interests widget (its own filter <input> plus a
				// tree of category spans), and a <label> containing any
				// descendant form control auto-focuses the FIRST one found
				// on any click anywhere inside it. With a real <label> here,
				// clicking any category/subcategory kept stealing focus
				// into the filter input and jumping the scroll position to
				// it, no matter what Q/expandable or Q/placeholders did.
				"<div class='Media_episodeForm_label Media_episodeForm_categoriesLabel'>" +
					"<span>" + (text.Categories || "Categories") + "</span>" +
					"<div class='Media_episodeForm_categories'></div>" +
				"</div>"
			).appendTo($left);
			var $pricing = $("<div class='Media_episodeForm_pricing'>").appendTo($left);

			var $title = $(".Media_episodeForm_title", $left).val(state.title || "");
			var $description = $(".Media_episodeForm_description", $left).val(state.content || "");

			$("<img class='Media_episodeForm_poster' alt=''/>")
				.attr("src", state.posterUrl || "")
				.appendTo($right);

			function renderLinkRow(labelText, rowClass) {
				var $row = $("<div class='Media_episodeForm_linkRow " + rowClass + "'>").appendTo($right);
				$("<span class='Media_episodeForm_linkLabel'>").text(labelText).appendTo($row);
				var $value = $("<div class='Media_episodeForm_linkValue'>").appendTo($row);
				var $link = $("<a class='Media_episodeForm_link' target='_blank' rel='noopener'>").appendTo($value);
				var copyLabel = text.Copy || "Copy";
				var $copy = $("<button type='button' class='Media_episodeForm_copy' title='" +
					copyLabel + "'>&#x29C9;</button>").appendTo($value);
				$copy.on(Q.Pointer.fastclick, function () {
					var url = $link.attr("href");
					if (!url || !navigator.clipboard) { return; }
					navigator.clipboard.writeText(url).then(function () {
						$copy.addClass("Media_episodeForm_copied");
						setTimeout(function () {
							$copy.removeClass("Media_episodeForm_copied");
						}, 1500);
					}).catch(function () {});
				});
				return $link;
			}

			var $onSiteLink = renderLinkRow(text.OnSiteLink || "Share link", "Media_episodeForm_onSiteRow");
			var $standaloneLink = renderLinkRow(text.StandaloneLink || "Standalone player link", "Media_episodeForm_standaloneRow");
			tool.setLinks(state.onSiteUrl, state.standaloneUrl);

			var $footer = $("<div class='Media_episodeForm_footer'>").appendTo($te);
			var $error = $("<div class='Media_episodeForm_error'>").appendTo($footer);
			var $save = $("<button class='Q_button Media_episodeForm_save' disabled>" +
				(state.saveLabel || text.Save || "Save") + "</button>").appendTo($footer);

			tool.elements = {
				title: $title, description: $description,
				onSiteLink: $onSiteLink, standaloneLink: $standaloneLink,
				save: $save, error: $error
			};

			// Which mechanisms this episode's payment fields offer — controlled
			// by Media.episode.paymentMechanism (see Media/before/Q_responseExtras.php).
			// This only shapes what the creator can set right now; playback
			// always reads the mechanism straight off the episode's own saved
			// payment attribute, so changing this config never affects
			// episodes already uploaded.
			var mechanisms = Q.getObject("Media.episode.paymentMechanism", Q.plugins) || ["perStream", "perMinute"];
			var hasStream = mechanisms.indexOf("perStream") >= 0;
			var hasMinute = mechanisms.indexOf("perMinute") >= 0;
			var $priceStream = null, $pricePerMinute = null, $allowPerMinute = null;
			var $perMinutePreview = null;

			if (hasStream) {
				$priceStream = $(
					"<label class='Media_episodeForm_label Media_episodeForm_priceStreamLabel'>" +
						"<span>" + (text.PriceStream || "Full episode price (credits, 0 = free)") + "</span>" +
						"<input type='number' min='0' step='1' class='Media_episodeForm_priceStream'/>" +
					"</label>"
				).appendTo($pricing).find(".Media_episodeForm_priceStream")
					.val(state.priceStream || 0);
			}

			if (hasStream && hasMinute) {
				// Both mechanisms: per-minute price isn't set directly — it's
				// derived from (full price / video length in minutes), so the
				// creator only gets a checkbox, not a second price field.
				var $checkboxLabel = $(
					"<label class='Media_episodeForm_label Media_episodeForm_allowPerMinuteLabel'>" +
						"<input type='checkbox' class='Media_episodeForm_allowPerMinute'/>" +
						"<span>" + (text.AllowPerMinute || "Also allow paying per minute watched") + "</span>" +
					"</label>"
				).appendTo($pricing);
				$allowPerMinute = $checkboxLabel.find(".Media_episodeForm_allowPerMinute")
					.prop("checked", !!state.allowPerMinute);
				$perMinutePreview = $("<div class='Media_episodeForm_perMinutePreview'>").appendTo($pricing);

				// Duration comes from Safecloud/upload's buildVideoIndex() step
				// and can legitimately be unavailable for some input files
				// (never blocks the upload, by design). Distinguish that from
				// "no price yet" so the checkbox doesn't silently accept a
				// check that will just save perMinute: 0 with no explanation.
				var canDerive = state.videoDuration > 0;

				function updateAllowPerMinuteState() {
					var hasPrice = (parseFloat($priceStream.val()) || 0) > 0;
					var enabled = canDerive && hasPrice;
					$allowPerMinute.prop("disabled", !enabled);
					if (!enabled && $allowPerMinute.prop("checked")) {
						$allowPerMinute.prop("checked", false);
					}
					if (!canDerive) {
						$perMinutePreview.text(text.PerMinuteNoDuration
							|| "Per-minute pricing isn't available for this video (couldn't determine its length).");
					} else if (!hasPrice) {
						$perMinutePreview.text(text.PerMinuteNeedsPrice
							|| "Set a full episode price first to enable per-minute billing.");
					} else {
						updatePerMinutePreview();
					}
				}

				function updatePerMinutePreview() {
					if (!$allowPerMinute.prop("checked")) {
						$perMinutePreview.text("");
						return;
					}
					var full = parseFloat($priceStream.val()) || 0;
					var minutes = state.videoDuration ? state.videoDuration / 60 : 0;
					// Floor at 1 minute — matches Media/dropVideo/post.php's
					// own authoritative calculation, so a very short video
					// doesn't preview one price and save a different one.
					var perMinute = Math.max(0.01, Math.round((full / Math.max(1, minutes)) * 100) / 100);
					$perMinutePreview.text((text.PerMinutePreview || "≈ {{amount}} credits per minute")
						.interpolate({amount: perMinute}));
				}
				$allowPerMinute.on("change", updatePerMinutePreview);
				$priceStream.on("input", updateAllowPerMinuteState);
				updateAllowPerMinuteState();
			} else if (hasMinute && !hasStream) {
				// Per-minute only: creator sets the rate directly.
				$pricePerMinute = $(
					"<label class='Media_episodeForm_label Media_episodeForm_pricePerMinuteLabel'>" +
						"<span>" + (text.PricePerMinute || "Price per minute (credits, 0 = free)") + "</span>" +
						"<input type='number' min='0' step='1' class='Media_episodeForm_pricePerMinute'/>" +
					"</label>"
				).appendTo($pricing).find(".Media_episodeForm_pricePerMinute")
					.val(state.pricePerMinute || 0);
			}

			$(".Media_episodeForm_categories", $left).tool("Streams/interests", {
				canAdd: false,
				all: false,
				onReady: function () {
					var interests = this;
					// This picker is for the episode's own categories, not the
					// viewer's personal profile interests — Streams/interests
					// pre-checks whatever the logged-in user already follows,
					// so clear that here to start with a blank slate before
					// applying this episode's own saved categories, if any.
					interests.$(".Streams_interest_title.Q_selected").removeClass("Q_selected");

					// Resolve tool.savedCategories (bare interest names, or —
					// for episodes saved before this format changed — legacy
					// "Category: Interest" strings) into the full
					// "Category: Interest" keys the highlight loop below and
					// toggleCategory() both key on. Only possible now, once
					// Streams/interests has finished loading the taxonomy
					// (interests.tree()) it needs to look up a bare
					// interest's parent category.
					tool.savedCategories.forEach(function (saved) {
						var category, interest;
						var colonIndex = saved.indexOf(": ");
						if (colonIndex >= 0) {
							// Legacy full string — trust it outright, no lookup needed.
							category = saved.slice(0, colonIndex);
							interest = saved.slice(colonIndex + 2);
						} else {
							interest = saved;
							category = tool.findCategoryForInterest(interest);
							if (!category) {
								// Not found anywhere in the current taxonomy (e.g. it
								// was removed/renamed since this episode was saved) —
								// nothing to highlight, but carry it forward so a
								// re-save without touching categories doesn't
								// silently drop it.
								tool.unresolvedCategories.push(interest);
								return;
							}
						}
						tool.selectedCategories[category + ": " + interest] = interest;
					});

					interests.$(".Q_expandable_tool").each(function () {
						var expandable = this.Q && this.Q("Q/expandable");
						if (expandable) {
							expandable.state.count = "";
							expandable.stateChanged(["count"]);
							// Picking categories for an episode should let
							// several parent categories stay open at once —
							// the default Q/expandable behavior (collapsing
							// every sibling when one expands) made the whole
							// list jump around as soon as a second category
							// was opened.
							expandable.state.autoCollapseSiblings = false;
						}
					});
					Object.keys(tool.selectedCategories).forEach(function (key) {
						var normalized = Q.normalize(key);
						var $el = interests.$("#Streams_interest_title_" + normalized);
						if (!$el.length) { return; }
						$el.addClass("Q_selected");
						var $expandable = $el.closest(".Q_expandable_tool");
						if ($expandable.length) {
							var expandable = $expandable[0].Q("Q/expandable");
							if (expandable) {
								expandable.expand({autoCollapseSiblings: false});
								var count = $expandable.find(".Streams_interest_title.Q_selected").length;
								expandable.state.count = count || "";
								expandable.stateChanged(["count"]);
							}
						}
					});
				},
				onClick: function (element, normalizedTitle, category, interest, wasSelected) {
					if (normalizedTitle === "*") {
						return false;
					}
					tool.toggleCategory(category, interest, element);
					return false; // cancel Streams/interests' own Interests.add/remove
				}
			}).activate();

			function updateSaveState() {
				$save.prop("disabled", !$.trim($title.val()));
			}
			$title.on("input", updateSaveState);
			updateSaveState();

			$save.on(Q.Pointer.fastclick, function () {
				if ($save.prop("disabled")) { return; }
				$error.text("");
				// Values (bare interest names), not keys ("Category: Interest") —
				// the parent is kept only for restoring/highlighting the picker,
				// see refresh() above. Deduped: two different parent categories
				// could in principle share a child interest name.
				var seen = {}, categoriesToSave = [];
				Q.each(tool.selectedCategories, function (key, interest) {
					if (!seen[interest]) { seen[interest] = true; categoriesToSave.push(interest); }
				});
				(tool.unresolvedCategories || []).forEach(function (interest) {
					if (!seen[interest]) { seen[interest] = true; categoriesToSave.push(interest); }
				});
				var fields = {
					title: $title.val(),
					content: $description.val(),
					categories: categoriesToSave,
					priceStream: Math.max(0, parseFloat($priceStream ? $priceStream.val() : 0) || 0),
					pricePerMinute: Math.max(0, parseFloat($pricePerMinute ? $pricePerMinute.val() : 0) || 0),
					allowPerMinute: $allowPerMinute ? $allowPerMinute.prop("checked") : false,
					videoDuration: state.videoDuration || 0
				};
				tool.setSaving(true);
				Q.handle(state.onSave, tool, [fields]);
			});
		},

		/**
		 * Looks up which top-level category a bare interest name belongs to,
		 * by searching the taxonomy Streams/interests already loaded
		 * (Q.Streams.Interests.all[communityId][category][subcategory]).
		 * Only meaningful after that picker's onReady has fired. Returns the
		 * first matching category, or null if not found anywhere (e.g. the
		 * interest was removed/renamed in the taxonomy since it was saved).
		 * @method findCategoryForInterest
		 * @param {String} interest
		 * @return {String|null}
		 */
		findCategoryForInterest: function (interest) {
			var communityId = Q.Users.communityId;
			var all = Q.getObject([communityId], Q.Streams.Interests.all) || {};
			for (var category in all) {
				var buckets = all[category];
				for (var subcategory in buckets) {
					if (buckets[subcategory]
					&& Object.prototype.hasOwnProperty.call(buckets[subcategory], interest)) {
						return category;
					}
				}
			}
			return null;
		},

		/**
		 * Toggles one "Category: Interest" pair on/off for this episode.
		 * @method toggleCategory
		 * @param {String} category
		 * @param {String} interest
		 * @param {Element} element The clicked .Streams_interest_title span
		 */
		toggleCategory: function (category, interest, element) {
			var tool = this;
			var $el = $(element);
			var key = category + ": " + interest;

			if (tool.selectedCategories[key]) {
				delete tool.selectedCategories[key];
				$el.removeClass("Q_selected");
			} else {
				// Value is the bare interest name — what actually gets saved/
				// displayed/filtered on (see the Save handler above); the key
				// keeps the parent only so this picker's own state can be
				// restored/highlighted correctly.
				tool.selectedCategories[key] = interest;
				$el.addClass("Q_selected");
			}

			var $expandable = $el.closest(".Q_expandable_tool");
			var expandable = $expandable.length && $expandable[0].Q("Q/expandable");
			if (expandable) {
				var count = $expandable.find(".Streams_interest_title.Q_selected").length;
				expandable.state.count = count || "";
				expandable.stateChanged(["count"]);
			}
		},

		/**
		 * Fills in (or updates) the two right-column link fields. Pass null
		 * for either to show a "Creating…" placeholder instead — used while
		 * a new upload's draft episode is still being created server-side.
		 * @method setLinks
		 * @param {String} [onSiteUrl]
		 * @param {String} [standaloneUrl]
		 */
		setLinks: function (onSiteUrl, standaloneUrl) {
			var tool = this;
			var text = tool.text.episodeForm || {};
			var placeholder = text.LinkPending || "Creating…";
			[[tool.elements && tool.elements.onSiteLink, onSiteUrl],
			 [tool.elements && tool.elements.standaloneLink, standaloneUrl]].forEach(function (pair) {
				var $link = pair[0], url = pair[1];
				if (!$link) { return; }
				if (url) {
					$link.attr("href", url).text(url);
				} else {
					$link.removeAttr("href").text(placeholder);
				}
			});
		},

		/**
		 * @method setSaving
		 * @param {Boolean} saving
		 */
		setSaving: function (saving) {
			var tool = this;
			var text = tool.text.episodeForm || {};
			if (!tool.elements) { return; }
			tool.elements.save
				.prop("disabled", saving)
				.text(saving ? (text.Saving || "Saving…") : (tool.state.saveLabel || text.Save || "Save"));
		},

		/**
		 * @method showError
		 * @param {String} message
		 */
		showError: function (message) {
			var tool = this;
			tool.setSaving(false);
			if (tool.elements) { tool.elements.error.text(message || ""); }
		}
	});

})(Q, Q.jQuery);
