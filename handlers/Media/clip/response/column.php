<?php

function Media_clip_response_column(&$params, &$result)
{
	$url = Q_Request::url();
	$stream = $params['stream'];

	// Visibility ("Private" — see Media/dropVideo/post.php, readLevel
	// 'none') gate — checked FIRST, before anything below (metas,
	// payment status, the Safecloud key) reads/exposes anything about
	// this stream to a viewer who isn't the publisher and isn't
	// otherwise granted access. Unlike the payment gate a few lines
	// down (a real, deliberate exception to the usual "just hide it in
	// the UI" approach for this feature), Streams' own readLevel system
	// already enforces this at the data-export layer — this check exists
	// only so a blocked viewer sees a clear message instead of Media/clip.js
	// silently rendering a blank/broken page around empty stream fields.
	$loggedInUser = Users::loggedInUser(false, false);
	$isPublisher = $loggedInUser && $loggedInUser->id === $stream->publisherId;
	if (!$isPublisher && !$stream->testReadLevel('content')) {
		Q_Response::setScriptData('Q.plugins.Media.clip.private', true);
		$text = Q_Text::get('Media/content');
		$message = Q::ifset($text, 'clip', 'PrivateVideo', 'This video is private.');
		Q_Response::setSlot('title', Q::ifset($text, 'clip', 'PrivateVideoTitle', 'Private video'));
		return "<div class='Media_clip_private' style='padding:64px 24px;text-align:center;"
			. "color:#888;font-size:15px;'>" . Q_Html::text($message) . "</div>";
	}

	$title = $stream->title;
	$allAttributes = $stream->getAllAttributes();
	$parts = explode('/', $episodeName = $stream->name);
	$episodeName = implode('/', array_slice($parts, 0, -1));

	$description = $stream->content;
	$keywords = $stream->getAttribute('keywords', '');
	if (is_array($keywords)) {
		$keywords = implode(', ', $keywords);
	}
	if (empty($keywords)) {
		$keywordsRows = Websites_Webpage::getKeywords($stream);
		if (!empty($keywordsRows)) {
			foreach ($keywordsRows as $keywordsRow) {
				$keywords .= $keywordsRow->title . ",";
			}
		}
	}
	$image = $stream->iconUrl("400");

	Q_Response::setCommonMetas(compact(
		'title', 'description', 'keywords', 'image', 'url'
	));

	Q_Response::setSlot('title', $title);
	Q_Response::addStylesheet("{{Media}}/css/columns/episode.css");

	// Payment gate. Media::episodePaymentStatus() reads prices straight off
	// this episode's own "payment" attribute (set at upload time via
	// Media/videoUpload/Media/dropVideo) and, via
	// Assets_Credits::getPaymentsInfo(), how much this viewer has already
	// paid toward it — one-time purchases and accrued per-minute charges
	// both count toward the same running total.
	//
	// Hard-gate (withhold the Safecloud key entirely, below) ONLY when a
	// one-time price is set and per-minute ISN'T offered as a fallback —
	// if per-minute billing is available, playback is never blocked on it;
	// per-minute charging (Media/clip/response/watch.php) or having fully
	// paid governs access incrementally instead of withholding the key.
	$status = Media::episodePaymentStatus($stream, $loggedInUser ? $loggedInUser->id : null);
	$hasPerStream = $status['perStreamAmount'] > 0;
	$hasPerMinute = $status['perMinuteAmount'] > 0;
	$paymentRequired = $hasPerStream && !$hasPerMinute && !$status['fullyPaid'];

	Q_Response::setScriptData('Q.plugins.Media.clip.payment', array(
		'required' => $paymentRequired,
		'perMinuteActive' => $hasPerMinute && !$status['fullyPaid'],
		'perMinuteAmount' => $status['perMinuteAmount'],
		'upsell' => ($hasPerStream && !$status['fullyPaid']) ? array(
			'amount' => $status['remaining'],
			'currency' => $status['currency']
		) : null,
		'currency' => $status['currency']
	));

	$video = $stream->getAttribute('video');
	if (Q::ifset($video, 'source', null) === 'safecloud') {
		// Not auto-loaded app-wide — needed here so Q.Safecloud.* exists
		// client-side when a safecloud clip is opened directly, not just
		// right after uploading in the same page session.
		Q_Response::addScript('{{Safecloud}}/js/Safecloud.js', 'head');
		Q_Response::addScript('{{Safecloud}}/js/Safecloud/DataTrees.js', 'head');
		Q_Response::setScriptData('Q.plugins.Media.clip.jetUrl',
			Q_Config::get('Safecloud', 'jetUrl', Q_Request::baseUrl()));

		// The stream's own "video" attribute only holds a rootCid reference
		// (see Media::safecloudVideoWrite() — the full manifest is too large
		// for the attributes column's 1023-char limit). Read the actual
		// manifest + rootKey back from disk and hand them to the client for
		// this one page load only — but never for a paid episode the current
		// user hasn't paid for yet: that key is what actually lets someone
		// decrypt the video, so withholding it (not just hiding the player in
		// the UI) is the one part of this feature that's real enforcement
		// rather than an honor-system client-side check.
		if (!$paymentRequired) {
			$safecloudVideo = Media::safecloudVideoRead(Q::ifset($video, 'rootCid', null));
			if ($safecloudVideo) {
				Q_Response::setScriptData('Q.plugins.Media.clip.video', $safecloudVideo);
			}
		}
	}

	// Load and parse transcript
	$transcriptFile = APP_FILES_DIR . DS . 'AI' . DS . 'transcriptions' . DS . "{$episodeName}.mp3.transcript";
	$transcript = '';

	if (file_exists($transcriptFile)) {
		$lines = file($transcriptFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
		$transcript .= "<table class=\"media-transcript\">\n";
		$transcript .= "<thead><tr><th>Time</th><th>Speaker</th><th>Transcript</th></tr></thead>\n<tbody>\n";

		foreach ($lines as $line) {
			if (preg_match('/^(\d{2}:\d{2}:\d{2})\s*\|\s*([A-Z]):\s*(.+)$/', $line, $matches)) {
				$time = Q_Html::text($matches[1]);
				$speaker = Q_Html::text($matches[2]);
				$text = Q_Html::text($matches[3]);
				$transcript .= "<tr><td>{$time}</td><td>{$speaker}</td><td>{$text}</td></tr>\n";
			}
		}

		$transcript .= "</tbody>\n</table>\n";
	}

	$clipParams = array_merge(array(
		'publisherId' => $stream->publisherId,
		'streamName' => $stream->name
	), Q::ifset($params, "clipParams", array()));

	$episodeParams = compact('transcript');

    Q_Response::setScriptData("Q.plugins.Media.clips.current", array(
        "publisherId" => $stream->publisherId,
        "streamName" => $stream->name
    ));

    return Q::view('Media/column/clip.php', compact('clipParams', 'episodeParams', 'transcript'));
}
