(function (Q, $) {
	/**
	 * Media Tools
	 * @module Media-tools
	 * @main
	 */

	/**
	 * Upload a video file to Safecloud encrypted storage, collect title and
	 * description, and (by default) POST to Media/dropVideo to create a
	 * Media/episode stream from it.
	 *
	 * Reusable outside this tool's own page: pass options.action = null and
	 * handle options.onSave yourself (it always fires with the collected
	 * payload, regardless of whether the default POST runs) to embed this
	 * tool somewhere that needs different save behavior.
	 *
	 * @class Media videoUpload
	 * @constructor
	 * @param {Object} [options]
	 *   @param {String} [options.jetUrl] Safecloud Jet server URL, passed through to Safecloud/upload
	 *   @param {String} [options.action='Media/dropVideo'] Q.req endpoint to POST to when Save is clicked. Pass null to disable the automatic POST (reusability hook).
	 *   @param {String} [options.posterUrl] Placeholder thumbnail shown in step 2 — just a static image for now.
	 *   @param {Q.Event} [options.onSave] Fires with (payload) when Save is clicked, before any request is sent.
	 *   @param {Q.Event} [options.onSaved] Fires with (err, stream) after the default POST completes (only if options.action is set).
	 *   @param {Q.Event} [options.onError]
	 */
	Q.Tool.define("Media/videoUpload", function (options) {
		var tool = this;
		tool.refresh();
	},

	{
		jetUrl: null,
		action: "Media/dropVideo",
		posterUrl: "{{Media}}/img/icons/Media/episode/400.png",
		onSave: new Q.Event(),
		onSaved: new Q.Event(),
		onError: new Q.Event(function (err) {
			console.warn("Media/videoUpload error:", err && err.message || err);
		})
	},

	{
		/**
		 * Step 1 — just the Safecloud/upload drop area.
		 * @method refresh
		 */
		refresh: function () {
			var tool = this;
			var state = tool.state;
			var $te = $(tool.element);

			$te.empty()
				.removeClass("Media_videoUpload_step2")
				.addClass("Media_videoUpload_step1");

			$("<div class='Media_videoUpload_drop'>").appendTo($te)
				.tool("Safecloud/upload", {
					jetUrl: state.jetUrl,
					accept: "video/*",
					onStore: tool.videoStored.bind(tool),
					onError: function (err) {
						Q.handle(state.onError, tool, [err]);
					}
				}).activate();
		},

		/**
		 * Step 2 — title/description/save form, shown once the file has
		 * finished uploading and encrypting.
		 * @method videoStored
		 * @param {Object} manifest
		 * @param {String} rootKey
		 * @param {String} [videoThumbnail] Data URL of a frame grabbed from the
		 *   video during the "Preparing…" stage (see Safecloud/upload's
		 *   captureVideoThumbnail). Falls back to state.posterUrl if missing.
		 */
		videoStored: function (manifest, rootKey, videoThumbnail) {
			var tool = this;
			var state = tool.state;
			var text = tool.text.videoUpload || {};

			tool.manifest = manifest;
			tool.rootKey = rootKey;
			tool.videoThumbnail = videoThumbnail || null;
			// Categories/subcategories the user picks for THIS video, keyed by
			// "Category: Interest" (matching Streams/interests' own title
			// format) — kept separate from the uploader's own personal
			// interests, see the Streams/interests onReady/onClick handling below.
			tool.selectedCategories = {};

			var $te = $(tool.element);
			$te.empty()
				.removeClass("Media_videoUpload_step1")
				.addClass("Media_videoUpload_step2");

			var defaultTitle = String(manifest.name || "").replace(/\.[^.\/]+$/, "");

			var $form = $(
				"<div class='Media_videoUpload_form'>" +
					"<img class='Media_videoUpload_poster' alt=''/>" +
					"<label class='Media_videoUpload_label Media_videoUpload_titleLabel'>" +
						"<span>" + (text.Title || "Title") + "</span>" +
						"<input type='text' class='Media_videoUpload_title' required/>" +
					"</label>" +
					"<label class='Media_videoUpload_label Media_videoUpload_descriptionLabel'>" +
						"<span>" + (text.Description || "Description") + "</span>" +
						"<textarea class='Media_videoUpload_description'></textarea>" +
					"</label>" +
					"<label class='Media_videoUpload_label Media_videoUpload_categoriesLabel'>" +
						"<span>" + (text.Categories || "Categories") + "</span>" +
						"<div class='Media_videoUpload_categories'></div>" +
					"</label>" +
					"<button class='Q_button Media_videoUpload_save' disabled>" +
						(text.Save || "Save") +
					"</button>" +
				"</div>"
			).appendTo($te);

			$(".Media_videoUpload_poster", $form).attr(
				"src", tool.videoThumbnail || Q.url(state.posterUrl));

			var $title = $(".Media_videoUpload_title", $form).val(defaultTitle);
			var $description = $(".Media_videoUpload_description", $form);
			var $save = $(".Media_videoUpload_save", $form);

			$(".Media_videoUpload_categories", $form).tool("Streams/interests", {
				canAdd: false,
				all: false,
				onReady: function () {
					// This picker is for the video's own categories, not the
					// uploader's personal profile interests — Streams/interests
					// pre-checks whatever the logged-in user already follows,
					// so clear that here to start every video with a blank slate.
					this.$(".Streams_interest_title.Q_selected").removeClass("Q_selected");
					this.$(".Q_expandable_tool").each(function () {
						var expandable = this.Q && this.Q("Q/expandable");
						if (expandable) {
							expandable.state.count = "";
							expandable.stateChanged(["count"]);
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
				$save.prop("disabled", true).text(text.Saving || "Saving…");
				tool.save($title.val(), $description.val());
			});
		},

		/**
		 * Toggles one "Category: Interest" pair on/off for this video, and
		 * keeps the Streams/interests expandable's little counter in sync
		 * the way the tool would have, had we not canceled its own handling.
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
				tool.selectedCategories[key] = true;
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
		 * @method save
		 * @param {String} title
		 * @param {String} content
		 */
		save: function (title, content) {
			var tool = this;
			var state = tool.state;
			var payload = {
				title: title,
				content: content,
				manifest: tool.manifest,
				rootKey: tool.rootKey,
				videoThumbnail: tool.videoThumbnail,
				categories: Object.keys(tool.selectedCategories || {})
			};

			// Always fires — the raw, embedder-agnostic hook that keeps this
			// tool reusable outside its own default POST-to-Media/dropVideo
			// behavior (e.g. a future Streams/video/preview integration can
			// set action:null and take it from here itself).
			Q.handle(state.onSave, tool, [payload]);

			if (!state.action) {
				return;
			}

			Q.req(state.action, ["result", "stream"], function (err, response) {
				var msg = Q.firstErrorMessage(err, response && response.errors);
				if (msg) {
					Q.handle(state.onError, tool, [new Error(msg)]);
					return;
				}
				var stream = Q.getObject(["slots", "stream"], response);
				Q.handle(state.onSaved, tool, [null, stream]);
			}, {
				method: "post",
				fields: {
					title: payload.title,
					content: payload.content,
					manifest: JSON.stringify(payload.manifest),
					rootKey: payload.rootKey,
					videoThumbnail: payload.videoThumbnail || "",
					categories: JSON.stringify(payload.categories)
				}
			});
		}
	});

})(Q, Q.jQuery);
