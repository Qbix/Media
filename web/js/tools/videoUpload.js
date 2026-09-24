(function (Q, $) {
	/**
	 * Media Tools
	 * @module Media-tools
	 * @main
	 */

	/**
	 * Upload a video file to Safecloud encrypted storage, then collect
	 * title/description/categories/price and POST to Media/dropVideo to
	 * turn it into a Media/episode stream.
	 *
	 * As soon as the upload finishes, the episode is created right away as
	 * a draft (unlisted — see Media_after_Streams_create_Media_episode and
	 * Media/dropVideo/post.php) so the details form's share link and
	 * standalone-player link both work immediately, the same way YouTube
	 * Studio's upload flow gives you a working watch link before you've
	 * finished filling in the details. Clicking Save updates that same
	 * draft with the final details and publishes it (relates it into
	 * Media/episodes, the uploader's channel, etc.) — see
	 * Media/episodeForm for the actual form UI, shared with Media/episodeEdit.
	 *
	 * @class Media videoUpload
	 * @constructor
	 * @param {Object} [options]
	 *   @param {String} [options.jetUrl] Safecloud Jet server URL, passed through to Safecloud/upload
	 *   @param {String} [options.action='Media/dropVideo'] Q.req endpoint used for both
	 *     the initial draft-creation POST (no streamName) and the publish-on-Save
	 *     POST (with streamName) — see Media/dropVideo/post.php.
	 *   @param {String} [options.posterUrl] Fallback thumbnail if no video frame could be captured.
	 *   @param {Q.Event} [options.onSaved] Fires with (err, stream) after the publish POST completes.
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
		 * Step 2 — creates the episode as a draft right away, then shows the
		 * shared Media/episodeForm (title/description/categories/price +
		 * share links) once the file has finished uploading and encrypting.
		 * @method videoStored
		 * @param {Object} manifest
		 * @param {String} rootKey
		 * @param {String} [videoThumbnail] Data URL of a frame grabbed from the
		 *   video during the "Preparing…" stage (see Safecloud/upload's
		 *   captureVideoThumbnail). Falls back to state.posterUrl if missing.
		 * @param {Number} [videoDuration] Video length in seconds, if known —
		 *   used to derive a per-minute price from the full-episode price
		 *   when both payment mechanisms are enabled (see Media.episode.paymentMechanism).
		 */
		videoStored: function (manifest, rootKey, videoThumbnail, videoDuration) {
			var tool = this;
			var state = tool.state;

			tool.manifest = manifest;
			tool.rootKey = rootKey;
			tool.videoThumbnail = videoThumbnail || null;
			tool.videoDuration = videoDuration || 0;
			tool.draftStream = null;

			var $te = $(tool.element);
			$te.empty()
				.removeClass("Media_videoUpload_step1")
				.addClass("Media_videoUpload_step2");

			var defaultTitle = String(manifest.name || "").replace(/\.[^.\/]+$/, "");
			var posterUrl = tool.videoThumbnail || Q.url(state.posterUrl);

			var $form = $("<div class='Media_videoUpload_form'>").appendTo($te);
			$form.tool("Media/episodeForm", {
				title: defaultTitle,
				posterUrl: posterUrl,
				videoDuration: tool.videoDuration,
				visibility: 'public',
				saveLabel: (tool.text.videoUpload || {}).Publish || "Save",
				onSave: function (fields) {
					tool.publish(fields);
				},
				onDelete: function () {
					tool.deleteVideo();
				}
			}).activate(function () {
				tool.formTool = this;

				// Standalone player link only needs the manifest/rootKey we
				// already have in memory — no server round trip.
				if (Q.Safecloud && Q.Safecloud.Client && Q.Safecloud.Client.createShareLink) {
					Q.Safecloud.Client.createShareLink(manifest, rootKey, {
						embed: true,
						jetUrl: state.jetUrl
					}).then(function (r) {
						tool.standaloneUrl = r && r.embedUrl;
						tool.formTool.setLinks(tool.onSiteUrl, tool.standaloneUrl);
					}).catch(function () {});
				}

				// Create the draft episode right away so the "share on
				// site" link (and Save itself, which just updates this
				// same stream) both work as soon as possible — never
				// blocks on the user filling in the rest of the form first.
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
					if (!stream) { return; }
					tool.draftStream = stream;
					tool.onSiteUrl = stream.url;
					tool.formTool.setLinks(tool.onSiteUrl, tool.standaloneUrl);
				}, {
					method: "post",
					fields: {
						title: defaultTitle,
						manifest: JSON.stringify(manifest),
						rootKey: rootKey,
						videoThumbnail: tool.videoThumbnail || "",
						videoDuration: tool.videoDuration
					}
				});
			});
		},

		/**
		 * Publishes the draft episode created in videoStored() with the
		 * final details from Media/episodeForm, then shows a confirmation
		 * dialog with the finished episode's links.
		 * @method publish
		 * @param {Object} fields From Media/episodeForm's onSave — see its docs.
		 */
		publish: function (fields) {
			var tool = this;
			var state = tool.state;

			if (!state.action || !tool.draftStream) {
				// Draft creation hasn't resolved yet (or reuse without a
				// server action) — the raw fields are still available to
				// an embedder that only wants Media/episodeForm's output.
				tool.formTool.showError(
					(tool.text.videoUpload || {}).NotReady
					|| "Still preparing your upload — please wait a moment and try again."
				);
				return;
			}

			Q.req(state.action, ["result", "stream"], function (err, response) {
				var msg = Q.firstErrorMessage(err, response && response.errors);
				if (msg) {
					tool.formTool.showError(msg);
					Q.handle(state.onError, tool, [new Error(msg)]);
					return;
				}
				var stream = Q.getObject(["slots", "stream"], response);
				tool.formTool.setSaving(false);
				Q.handle(state.onSaved, tool, [null, stream]);
				tool.showPublishedDialog(stream);
			}, {
				method: "post",
				fields: {
					streamName: tool.draftStream.name,
					publisherId: tool.draftStream.publisherId,
					title: fields.title,
					content: fields.content,
					categories: JSON.stringify(fields.categories),
					visibility: fields.visibility,
					priceStream: fields.priceStream,
					pricePerMinute: fields.pricePerMinute,
					allowPerMinute: fields.allowPerMinute ? "1" : "",
					videoDuration: fields.videoDuration
				}
			});
		},

		/**
		 * Discards the draft episode created in videoStored() — lets the
		 * uploader abandon an in-progress upload before ever clicking Save.
		 * @method deleteVideo
		 */
		deleteVideo: function () {
			var tool = this;
			if (!tool.draftStream) {
				// Draft creation hasn't resolved yet — nothing server-side to delete.
				location.href = Q.url('clips');
				return;
			}
			// "deleteVideo" is a slot on the SAME Media/dropVideo action this
			// page posts its Save to, handled by handlers/Media/dropVideo/post.php
			// — not a standalone route (see Media/webrtc/post.php for the
			// established pattern).
			Q.req(tool.state.action, ["deleteVideo"], function (err, response) {
				var msg = Q.firstErrorMessage(err, response && response.errors);
				if (msg) {
					tool.formTool.showError(msg);
					return;
				}
				location.href = Q.url('clips');
			}, {
				method: "post",
				fields: {
					streamName: tool.draftStream.name,
					publisherId: tool.draftStream.publisherId
				}
			});
		},

		/**
		 * @method showPublishedDialog
		 * @param {Object} stream The published episode's exported stream fields
		 */
		showPublishedDialog: function (stream) {
			var tool = this;
			var text = tool.text.videoUpload || {};
			var posterUrl = stream.icon
				? Q.Streams.iconUrl(stream.icon, 400)
				: (tool.videoThumbnail || Q.url(tool.state.posterUrl));
			var duration = _formatDuration(tool.videoDuration);
			var uploadedOn = new Date().toLocaleDateString();

			var $content = $(
				"<div class='Media_videoUpload_published'>" +
					"<div class='Media_videoUpload_publishedSummary'>" +
						"<div class='Media_videoUpload_publishedThumb'>" +
							"<img alt=''/>" +
							"<span class='Media_videoUpload_publishedDuration'></span>" +
						"</div>" +
						"<div class='Media_videoUpload_publishedInfo'>" +
							"<div class='Media_videoUpload_publishedTitle'></div>" +
							"<div class='Media_videoUpload_publishedDate'></div>" +
						"</div>" +
					"</div>" +
					"<div class='Media_videoUpload_publishedLinks'></div>" +
					"<div class='Media_videoUpload_publishedFooter'>" +
						"<button class='Q_button Media_videoUpload_publishedClose'>" +
							(text.Close || "Close") +
						"</button>" +
					"</div>" +
				"</div>"
			);
			$(".Media_videoUpload_publishedThumb img", $content).attr("src", posterUrl);
			$(".Media_videoUpload_publishedDuration", $content).text(duration);
			$(".Media_videoUpload_publishedTitle", $content).text(stream.title || "");
			$(".Media_videoUpload_publishedDate", $content)
				.text((text.UploadedOn || "Uploaded {{date}}").interpolate({date: uploadedOn}));

			function linkRow(labelText, url) {
				if (!url) { return; }
				var $row = $("<div class='Media_videoUpload_publishedLinkRow'>").appendTo(
					$(".Media_videoUpload_publishedLinks", $content));
				$("<span class='Media_videoUpload_publishedLinkLabel'>").text(labelText).appendTo($row);
				var $value = $("<div class='Media_videoUpload_publishedLinkValue'>").appendTo($row);
				$("<a target='_blank' rel='noopener'>").attr("href", url).text(url).appendTo($value);
				var copyLabel = text.Copy || "Copy";
				var $copy = $("<button type='button' class='Media_videoUpload_publishedCopy' title='" +
					copyLabel + "'>&#x29C9;</button>").appendTo($value);
				$copy.on(Q.Pointer.fastclick, function () {
					if (!navigator.clipboard) { return; }
					navigator.clipboard.writeText(url).then(function () {
						$copy.addClass("Media_videoUpload_publishedCopied");
						setTimeout(function () {
							$copy.removeClass("Media_videoUpload_publishedCopied");
						}, 1500);
					}).catch(function () {});
				});
			}
			linkRow(text.OnSiteLink || "Share link", tool.onSiteUrl || stream.url);
			linkRow(text.StandaloneLink || "Standalone player link", tool.standaloneUrl);

			var dialog = Q.Dialogs.push({
				title: text.PublishedTitle || "Video published",
				className: "Media_videoUpload_publishedDialog",
				content: $content[0],
				removeOnClose: true,
				onActivate: function () {
					$(".Media_videoUpload_publishedClose", $content).on(Q.Pointer.fastclick, function () {
						Q.Dialogs.pop();
						location.href = stream.url || tool.onSiteUrl || Q.url('clips');
					});
				}
			});
			return dialog;
		}
	});

	function _formatDuration(seconds) {
		seconds = Math.max(0, Math.round(seconds || 0));
		var m = Math.floor(seconds / 60);
		var s = seconds % 60;
		return m + ":" + (s < 10 ? "0" : "") + s;
	}

})(Q, Q.jQuery);
