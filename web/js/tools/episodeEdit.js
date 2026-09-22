(function (Q, $) {
	/**
	 * Media Tools
	 * @module Media-tools
	 * @main
	 */

	/**
	 * Lets an episode's creator edit its title/description/categories/price
	 * after the fact — the same Media/episodeForm UI Media/videoUpload's
	 * step 2 uses for a fresh upload, just pre-filled from the episode's
	 * already-saved attributes instead of a just-finished upload. Reached
	 * from the "Edit video" button Media/clip.js shows under the video
	 * player (creator-only — see Media_episodeEdit_response's testWriteLevel
	 * check).
	 *
	 * @class Media episodeEdit
	 * @constructor
	 * @param {Object} [options] All of these are normally filled in server-side
	 *   by Media_episodeEdit_response from the episode's own saved attributes.
	 *   @param {String} [options.jetUrl]
	 *   @param {String} [options.action='Media/dropVideo'] Q.req endpoint for the update POST.
	 *   @param {String} options.publisherId
	 *   @param {String} options.streamName
	 *   @param {String} [options.title]
	 *   @param {String} [options.content]
	 *   @param {Array} [options.categories]
	 *   @param {String} [options.posterUrl]
	 *   @param {String} [options.onSiteUrl] The episode's own clip-page URL.
	 *   @param {Number} [options.videoDuration]
	 *   @param {Number} [options.priceStream]
	 *   @param {Number} [options.pricePerMinute]
	 *   @param {Boolean} [options.allowPerMinute]
	 *   @param {Object} [options.manifest] Safecloud public manifest, for the standalone-player link
	 *   @param {String} [options.rootKey] Safecloud root key, for the standalone-player link
	 *   @param {Q.Event} [options.onSaved] Fires with (err, stream) after the update POST completes.
	 *   @param {Q.Event} [options.onError]
	 */
	Q.Tool.define("Media/episodeEdit", function (options) {
		var tool = this;
		tool.refresh();
	},

	{
		jetUrl: null,
		action: "Media/dropVideo",
		publisherId: null,
		streamName: null,
		title: '',
		content: '',
		categories: [],
		posterUrl: null,
		onSiteUrl: null,
		videoDuration: 0,
		priceStream: 0,
		pricePerMinute: 0,
		allowPerMinute: false,
		manifest: null,
		rootKey: null,
		onSaved: new Q.Event(),
		onError: new Q.Event(function (err) {
			console.warn("Media/episodeEdit error:", err && err.message || err);
		})
	},

	{
		refresh: function () {
			var tool = this;
			var state = tool.state;
			var $te = $(tool.element).empty();

			$("<div class='Media_episodeEdit_form'>").appendTo($te)
				.tool("Media/episodeForm", {
					title: state.title,
					content: state.content,
					categories: state.categories,
					posterUrl: state.posterUrl,
					videoDuration: state.videoDuration,
					priceStream: state.priceStream,
					pricePerMinute: state.pricePerMinute,
					allowPerMinute: state.allowPerMinute,
					onSiteUrl: state.onSiteUrl,
					onSave: function (fields) {
						tool.save(fields);
					}
				}).activate(function () {
					tool.formTool = this;

					if (state.manifest && state.rootKey
					&& Q.Safecloud && Q.Safecloud.Client && Q.Safecloud.Client.createShareLink) {
						Q.Safecloud.Client.createShareLink(state.manifest, state.rootKey, {
							embed: true,
							jetUrl: state.jetUrl
						}).then(function (r) {
							tool.formTool.setLinks(state.onSiteUrl, r && r.embedUrl);
						}).catch(function () {});
					}
				});
		},

		/**
		 * @method save
		 * @param {Object} fields From Media/episodeForm's onSave — see its docs.
		 */
		save: function (fields) {
			var tool = this;
			var state = tool.state;

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
				// Back to the clip page to see the result, same as any
				// other "edit this, then view it" flow in this app.
				location.href = (stream && stream.url) || state.onSiteUrl || Q.url('clips');
			}, {
				method: "post",
				fields: {
					streamName: state.streamName,
					publisherId: state.publisherId,
					title: fields.title,
					content: fields.content,
					categories: JSON.stringify(fields.categories),
					priceStream: fields.priceStream,
					pricePerMinute: fields.pricePerMinute,
					allowPerMinute: fields.allowPerMinute ? "1" : "",
					videoDuration: fields.videoDuration
				}
			});
		}
	});

})(Q, Q.jQuery);
