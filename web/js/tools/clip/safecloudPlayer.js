(function (Q, $) {
    /**
     * Media Tools
     * @module Media-tools
     */

    /**
     * Decides which real player (if any) renders this episode/clip's video,
     * and owns everything about gating that decision on payment — the
     * paywall and the teaser-ran-out prompt. Pulled out of Media/clip
     * itself: this is the one piece of that tool that's Safecloud-specific
     * (payment/teaser/DRM-style playback is used by exactly one app today),
     * while chat/participants/segment-clips/webrtc are genuinely shared.
     * Instantiated directly onto the SAME ".Media_video" element Media/clip
     * used to instantiate Q/video or Safecloud/video onto itself — multiple
     * named tools coexisting on one element is an established Q pattern
     * (see Media/clip's own chained `.tool("Streams/preview", {...})
     * .tool("Media/clip/preview", {...})`), so the real player tool still
     * ends up attached to the exact same DOM node as before; nothing about
     * where Q/video's or Safecloud/video's own markup lives has changed.
     * @class Media clip safecloudPlayer
     * @constructor
     * @param {Object} [options]
     *   @param {Streams.Stream} options.stream Already-fetched stream for
     *     the episode or clip being viewed — read-only here (Media/clip
     *     itself owns fetching/observing it).
     *   @param {String} options.publisherId
     *   @param {String} options.streamName
     *   @param {Object} [options.qVideoOptions] Passed through verbatim to
     *     whichever of Q/video / Safecloud/video actually gets instantiated.
     *   @param {Q.Event} [options.onPlay] Forwarded directly as the real
     *     player's own onPlay option — same calling convention as before
     *     (Media/clip passes tool.joinClip.bind(tool) here, unchanged).
     *   @param {Q.Event} [options.onPlaying] Same, for onPlaying
     *     (Media/clip passes tool.watchClip.bind(tool) here, unchanged).
     *   @param {Q.Event} [options.onPlayerReady] Fired with the REAL
     *     underlying player tool instance (Q/video or Safecloud/video) once
     *     it's activated, or with null if nothing was instantiated at all
     *     (paywall shown, or no video attribute). Media/clip uses this to
     *     set its own tool.videoTool exactly as it did before decomposition
     *     — nothing downstream (the tab-click pause handler, watchClip's
     *     insufficientCredits pause/resume) needed to change.
     *   @param {Q.Event} [options.onNeedsRefresh] Fired after a successful
     *     paywall payment, once updated script data has landed — Media/clip
     *     re-renders itself fully in response (exactly the same full
     *     tool.refresh() the old inline renderPaywall() used to call
     *     directly; it's just reached via an event now instead of a direct
     *     method call, since the paywall itself lives in this tool).
     */
    Q.Tool.define("Media/clip/safecloudPlayer", function (options) {
        var tool = this;
        tool.refresh();
    }, {
        stream: null,
        publisherId: null,
        streamName: null,
        qVideoOptions: null,
        onPlay: new Q.Event(),
        onPlaying: new Q.Event(),
        onPlayerReady: new Q.Event(),
        onNeedsRefresh: new Q.Event()
    }, {
        refresh: function () {
            var tool = this;
            var state = tool.state;
            var stream = state.stream;
            // Same config Media/clip.js's watchClip()/watching.earnPeriod
            // already uses, just the Streams.Metrics batching interval
            // instead — see Media.clip.watching.metricsPeriod's own config
            // comment (plugin.json) for what this actually controls.
            var metricsPeriod = Q.getObject("Media.clip.watching.metricsPeriod", Q.plugins) || 60;

            // Mirrors Media/clip/response/column.php's own withholding: the
            // Safecloud manifest/rootKey are never sent to script data at
            // all while payment.required is true and no teaser capability
            // applies — so there's nothing to instantiate, show the paywall
            // instead. See this tool's own renderPaywall for why that's
            // real enforcement, not just a UI nicety.
            var payment = Q.getObject("Media.clip.payment", Q.plugins) || {};
            var safecloudVideo = Q.getObject("Media.clip.video", Q.plugins);
            if (payment.required && !(safecloudVideo && safecloudVideo.teaser)) {
                var videoRef = stream.getAttribute("video") || {};
                tool.renderPaywall(payment, videoRef.rootCid);
                return Q.handle(state.onPlayerReady, tool, [null]);
            }

            var video = stream.getAttribute("video") || {};
            if (video.source === "safecloud" && safecloudVideo && safecloudVideo.manifest) {
                // Safecloud-encrypted upload (see Media/videoUpload,
                // Media/dropVideo) — plays via the same Safecloud/video
                // tool already proven out on /safecloud/demo, not Q/video
                // (which has no Safecloud awareness at all). clipStart/
                // clipEnd/ads/floating are not supported for these yet —
                // known v1 limitation, not an oversight.
                //
                // Teaser viewers get a grant-based capability straight
                // from the server (see column.php) instead of the
                // rootKey — sw.js already accepts either shape.
                //
                // Both the fixed-range teaser and a shared clip carry
                // their own [from, to) range as capability.teaserRange
                // (see Q.Safecloud.Client.createShareLink's teaser mode
                // — "teaser" here just means "grant-based, time-bounded
                // capability," a clip is exactly that with an arbitrary
                // range instead of always [0, 15]). Used for two
                // things: starting playback AT the range (not always
                // from 0 — a clip's whole point is to open right where
                // its creator chose, e.g. 5s into a 20s clip, not force
                // the viewer to scrub past the start themselves), and
                // stopping it exactly at the range's end (state.stopAt,
                // below) rather than wherever the grant's own chunk-
                // rounded boundary happens to fall, which can run a
                // couple of seconds past the intended cutoff.
                var teaserRange = safecloudVideo.teaser
                    ? Q.getObject("capability.teaserRange", safecloudVideo) : null;
                $(tool.element).tool("Safecloud/video", Q.extend({
                    manifest: safecloudVideo.manifest,
                    capability: safecloudVideo.teaser
                        ? safecloudVideo.capability
                        : { rootKey: safecloudVideo.rootKey },
                    // Was missing entirely — see Safecloud/video's own
                    // metrics doc comment for why streams_metrics needs
                    // this to ever get populated for Safecloud playback.
                    metrics: {
                        publisherId: state.publisherId,
                        streamName: state.streamName,
                        period: metricsPeriod
                    },
                    jetUrl: Q.getObject("Media.clip.jetUrl", Q.plugins) || undefined,
                    at: teaserRange ? teaserRange[0] : 0,
                    stopAt: teaserRange ? teaserRange[1] : undefined,
                    onPlay: state.onPlay,
                    onPlaying: state.onPlaying,
                    onTeaserEnd: safecloudVideo.teaser
                        ? tool.handleTeaserEnd.bind(tool)
                        : undefined
                }, state.qVideoOptions)).activate(function () {
                    Q.handle(state.onPlayerReady, tool, [this]);
                });
            } else if (video.url) {
                $(tool.element).tool("Q/video", Q.extend({
                    url: video.url,
                    clipStart: video.clipStart,
                    clipEnd: video.clipEnd,
                    ads: video.ads || [],
                    image: stream.iconUrl(400),
                    metrics: {
                        publisherId: state.publisherId,
                        streamName: state.streamName,
                        period: metricsPeriod
                    },
                    onPlaying: state.onPlaying,
                    onPlay: state.onPlay
                }, state.qVideoOptions)).activate(function () {
                    Q.handle(state.onPlayerReady, tool, [this]);
                });
            } else {
                Q.handle(state.onPlayerReady, tool, [null]);
            }
        },
        /**
         * Shown instead of a player when the episode requires a one-time
         * payment the current user hasn't made yet (see the payment.required
         * check in refresh()). Clicking "Unlock" goes through Q.Assets.pay(),
         * which already handles spending existing credits vs. falling
         * through to a credit-purchase dialog if the user is short — no
         * custom "not enough credits" UI needs to be built here.
         * @method renderPaywall
         * @param {Object} payment {upsell: {amount, currency}, ...} — the
         *   full script-data object from Media/clip/response/column.php;
         *   only reachable here when perStream is the sole mechanism and
         *   not yet paid, so payment.upsell.amount === the full price.
         * @param {String} [rootCid] Safecloud rootCid, if this episode's
         *   video is Safecloud-sourced — used to confirm at least one Drop
         *   can actually serve the content BEFORE charging, so a user isn't
         *   charged only to hit "No Drops available" once they try to play.
         */
        renderPaywall: function (payment, rootCid) {
            var tool = this;
            var state = tool.state;
            var amount = payment.upsell.amount;
            var currency = payment.upsell.currency;
            var label = (tool.text.UnlockEpisode || "Unlock this episode for {{amount}} {{currency}}")
                .interpolate({amount: amount, currency: currency});
            // tool.element IS ".Media_video" itself (see this tool's own
            // class comment on why) — no need to search for it the way the
            // pre-decomposition code searched from Media/clip's own root.
            var $wrap = $(tool.element)
                .empty()
                .addClass("Media_clip_paywall");
            var $button = $("<button class='Q_button Media_clip_unlock'>")
                .text(label)
                .appendTo($wrap);
            var $status = $("<div class='Media_clip_paywall_status'>").appendTo($wrap);

            function pay() {
                Q.Assets.pay({
                    amount: amount,
                    currency: currency,
                    reason: "EpisodeAccess",
                    toStream: {
                        publisherId: state.publisherId,
                        streamName: state.streamName
                    },
                    onSuccess: function () {
                        // The server withholds the safecloud manifest/rootKey
                        // (Q.plugins.Media.clip.video) from script data
                        // entirely while payment.required is true (see
                        // Media/clip/response/column.php) — a pure
                        // client-side refresh() has no way to get the
                        // now-unlockable key, so at least one round-trip is
                        // unavoidable. But it doesn't need a full page
                        // reload: re-request just this route's "column"
                        // slot, apply its scriptData/scriptLines the same
                        // way Q.loadUrl would (Q.loadUrl is itself the only
                        // normal caller of processScriptDataAndLines — nothing
                        // stops calling it directly), then ask Media/clip to
                        // re-render in place from the now-updated globals —
                        // its own template render re-creates this tool fresh
                        // too, which will see payment.required===false next
                        // time and render the real player instead.
                        var url = Q.url('clip/' + state.publisherId + '/'
                            + state.streamName.split('/').pop());
                        Q.req(url, ['column'], function (err, response) {
                            var msg = Q.firstErrorMessage(err);
                            if (msg) {
                                $status.text(msg);
                                $button.prop("disabled", false);
                                return;
                            }
                            Q.Response.processScriptDataAndLines(response);
                            Q.handle(state.onNeedsRefresh, tool);
                        }, { method: 'get', quiet: true });
                    },
                    onFailure: function () {
                        $button.prop("disabled", false);
                    }
                });
            }

            $button.on(Q.Pointer.fastclick, function () {
                $button.prop("disabled", true);

                if (!rootCid || !Q.Safecloud || !Q.Safecloud.Jets) {
                    return pay(); // nothing to pre-flight-check, e.g. non-Safecloud video
                }

                $status.text(tool.text.CheckingAvailability || "Checking availability…");
                Q.Safecloud.Jets.checkAvailable(rootCid, function (err, result) {
                    if (err) {
                        // The check itself failing (timeout, Jet unreachable)
                        // isn't proof the content is unavailable — fail open
                        // rather than permanently blocking a legitimate
                        // purchase over a flaky side-channel query.
                        console.warn("Media/clip/safecloudPlayer: checkAvailable failed, proceeding anyway:", err);
                        $status.text("");
                        return pay();
                    }
                    if (!result || !result.available) {
                        $status.text(tool.text.ContentUnavailable
                            || "This video isn't available to play right now — please try again later.");
                        $button.prop("disabled", false);
                        return;
                    }
                    $status.text("");
                    pay();
                });
            });
        },
        /**
         * Fired by the Safecloud/video tool when playback reaches the end
         * of a time-limited capability's granted range — either a
         * paywalled episode's teaser (see Media/clip/response/column.php's
         * allowTeaser branch, handed to anonymous AND logged-in-unpaid
         * viewers alike), or anyone's playback of a shared clip (see
         * its own, unconditionally-bounded branch there — a clip stays
         * bounded to its own range for EVERY viewer, logged in or not,
         * regardless of the underlying episode's price). The video is
         * already paused by the time this fires.
         * @method handleTeaserEnd
         */
        handleTeaserEnd: function () {
            var tool = this;
            var state = tool.state;
            var stream = state.stream;
            // Two independent detectors (the hls.js 403 handler and
            // _prefetchLoop's own videoElement 'waiting' listener, see
            // Client/stream.js and Client/_prefetchLoop.js) can both call
            // this for the same stream — belt-and-suspenders against
            // different flavors of grant-boundary failure. Guard here so
            // a viewer only ever sees the sign-in dialog/redirect once.
            if (tool._teaserEndHandled) { return; }
            tool._teaserEndHandled = true;

            if (stream.fields.type === "Media/clip") {
                // A shared clip's own range ended — since a clip is ALWAYS
                // bounded (see column.php's comment on why it can't just
                // hand out full access to a viewer who happens to already
                // have it), "sign in to buy" doesn't even apply here: an
                // already-logged-in viewer (confirmed live: including the
                // clip's own creator, sampling their own free video) was
                // getting that exact nonsensical prompt before this fix,
                // since this method used to unconditionally call
                // Q.Users.login() regardless of who was watching. The
                // episode's own page already has every access case
                // (sign-in, payment, free, already-paid) fully handled —
                // simplest and most correct is to send the viewer there
                // instead of duplicating any of that logic here — but only
                // if they choose to (an automatic redirect the instant
                // playback stops is jarring and easy to misread as the
                // page itself failing, especially since it happens with no
                // warning right as the video is still visibly paused on
                // screen), not the instant the range ends.
                var video = stream.getAttribute("video") || {};
                if (video.episodePublisherId && video.episodeStreamName) {
                    var episodeUrl = Q.url('clip/' + video.episodePublisherId + '/'
                        + video.episodeStreamName.split('/').pop());
                    Q.confirm(
                        tool.text.ClipEndedExplanation
                            || "That's the end of this clip.",
                        function (result) {
                            if (result) { location.href = episodeUrl; }
                        },
                        {
                            ok: tool.text.WatchFullVideo || "Watch full video",
                            cancel: tool.text.Close || "Close"
                        }
                    );
                    return;
                }
            }

            // An episode's own teaser ran out. A still-anonymous viewer
            // needs to sign in first (the teaser was their "watch a bit
            // before signing in" carrot); a viewer who's already logged in
            // but hasn't paid just needs the paywall, in place, right now —
            // no reload, and no pointless sign-in prompt for someone
            // already signed in.
            if (Q.Users.loggedInUserId()) {
                var payment = Q.getObject("Media.clip.payment", Q.plugins) || {};
                var video = stream.getAttribute("video") || {};
                tool.renderPaywall(payment, video.rootCid);
                return;
            }

            Q.Users.login({
                explanation: tool.text.TeaserSignInExplanation
                    || "Sign in to buy and keep watching this video.",
                onSuccess: function () {
                    // Reload so column.php re-evaluates this viewer as
                    // logged-in — showing the normal paywall (or the full
                    // video, if it's free/already paid) instead of the
                    // teaser capability just exhausted.
                    location.reload();
                }
            });
        }
    });
})(Q, Q.jQuery);
