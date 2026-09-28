<?php
/**
 * Creates (or, for a Safecloud-sourced episode, updates the requesting
 * user's existing) clip stream and relates it to the episode stream.
 * @class HTTP
 * @method post
 * @param {array} [$_REQUEST] Parameters that can come from the request
 *   @param {array} [$_REQUEST.params] {title, content, icon, attributes}
 *   @param {array} [$_REQUEST.related] {publisherId, streamName, type} — the episode this clip is of
 *   @param {string} [$_REQUEST.capability] JSON-encoded grant-based capability
 *     limited to [attributes.video.clipStart, attributes.video.clipEnd) —
 *     required when attributes.video.source is "safecloud" (see
 *     Q.Safecloud.Client.createShareLink's teaser mode, called client-side
 *     with an arbitrary range instead of always [0, 15] — only the
 *     requesting viewer's own browser holds the rootKey needed to compute
 *     this, which is also why access is naturally gated to viewers who
 *     already have it: see Media_clip_response_column's payment gate).
 * @return {void}
 */
function Media_clip_post($params = array())
{
	$params = array_merge($_REQUEST, $params);
	$publisherId = Q::ifset($params, 'publisherId', Users::loggedInUser(true)->id);

    // check if paid
	$paidInfo = Q_Config::get("Media", "clip", "createCost", null);
	$amount = Q::ifset($paidInfo, "amount", null);
	$isAdmin = (bool)Users::roles(array(Users::communityId(), Users::currentCommunityId()), Q_Config::expect("Media", "admins"));
	$assets_credits = null;
	if (!$isAdmin && !empty($paidInfo) && $amount) {
		$assets_credits = Assets_Credits::select()
			->where(array(
				'fromUserId' => $publisherId,
				'toStreamName' => "Media/clip"
			))
			->orderBy('insertedTime', false)
			->limit(1)
			->fetchDbRow();
		if (!$assets_credits || $assets_credits->getAttribute("processed") || ($assets_credits->amount < $amount)) {
			return Q_Response::setSlot("result", "needPayment");
		}
	}

	$attributes = Q::ifset($params, "params", "attributes", null);
	$relatedPublisherId = Q::ifset($params, "related", "publisherId", null);
	$relatedStreamName = Q::ifset($params, "related", "streamName", null);
	$relatedType = Q::ifset($params, "related", "type", null);
	$video = Q::ifset($attributes, "video", null);

	if (Q::ifset($video, "source", null) === "safecloud") {
		$clipStream = Media_clip_saveSafecloudClip(
			$publisherId, $params, $attributes, $video, $relatedPublisherId, $relatedStreamName, $relatedType
		);
	} else {
		$clipStream = Streams::create($publisherId, $publisherId, 'Media/clip', array(
			"title" => Q::ifset($params, "params", "title", null),
			"content" => Q::ifset($params, "params", "content", null),
			"icon" => Q::ifset($params, "params", "icon", null),
			"attributes" => $attributes
		), array('relate' => array(
			"publisherId" => $relatedPublisherId,
			"streamName" => $relatedStreamName,
			"type" => $relatedType
		)));
	}

	// if stream created mark credits row as processed
	if ($assets_credits && $clipStream) {
		$assets_credits->setAttribute("processed", true)->save();
	}

	Q_Response::setSlot("result", true);
    Q_Response::setSlot("stream", $clipStream);
}

/**
 * Safecloud-specific branch of Media_clip_post — a viewer sharing an
 * up-to-15-second range of a paywalled Safecloud episode. Distinct from
 * the plain-URL (YouTube) case above because:
 *  - The capability (not just clipStart/clipEnd numbers) has to be
 *    persisted server-side too — see Media::safecloudClipCapabilityWrite's
 *    own doc comment for why it can't just live in the stream's own
 *    attributes column.
 *  - "At most one clip per user per video" needs enforcing atomically —
 *    see $clipName's own comment below for why a plain check-then-create
 *    (a SELECT for an existing relation, then Streams::create if none was
 *    found) isn't enough: confirmed live, a single Save click produced
 *    two separate "Media/clip" streams with the same title, because
 *    nothing closed the race window between those two steps.
 * @return {Streams_Stream}
 */
function Media_clip_saveSafecloudClip(
	$publisherId, $params, $attributes, $video, $relatedPublisherId, $relatedStreamName, $relatedType
) {
	if (empty($relatedPublisherId) || empty($relatedStreamName)) {
		throw new Q_Exception_RequiredField(array('field' => 'related'));
	}

	// Re-check server-side, authoritatively — showAddClip in Media/clip.js
	// only hides the button when this is false, it doesn't stop a direct
	// POST here.
	$episode = Streams_Stream::fetch($publisherId, $relatedPublisherId, $relatedStreamName, true);
	if (!$episode->getAttribute('allowClips')) {
		throw new Q_Exception("This video doesn't allow sharing clips");
	}

	$clipStart = floatval(Q::ifset($video, 'clipStart', 0));
	$clipEnd = floatval(Q::ifset($video, 'clipEnd', 0));
	// A small epsilon tolerance for float rounding on the client — not an
	// invitation to smuggle a longer range through, just avoids rejecting
	// e.g. 15.0000000002 due to floating-point drift in the browser's own
	// arithmetic computing it.
	if ($clipEnd <= $clipStart || $clipStart < 0 || ($clipEnd - $clipStart) > 15.05) {
		throw new Q_Exception("Clip range must be between 0 and 15 seconds long");
	}

	$capabilityJson = Q::ifset($params, 'capability', null);
	$capability = $capabilityJson ? json_decode($capabilityJson, true) : null;
	if (!$capability) {
		throw new Q_Exception_RequiredField(array('field' => 'capability'));
	}

	// One clip per (creator, episode) — a deterministic name (derived from
	// the episode alone; $publisherId already namespaces it to this one
	// creator) instead of Streams::create's usual random one, combined
	// with Streams::fetchOneOrCreate's own begin/commit-locked fetch-or-
	// create, is what actually closes the race window a plain "SELECT for
	// an existing relation, then create if none found" left open: two
	// near-simultaneous requests for the SAME (publisherId, $clipName)
	// now land on the exact same row (one creates it, the other's create
	// attempt finds it already there under that lock) instead of each
	// blindly creating its own randomly-named stream.
	// No slash inside the part after "Media/clip/" — the clip's own URL
	// (/clip/:publisherId/:clipId, and Media_clip_response's own routing,
	// which matches stream names literally as "Media/clip/$clipId") both
	// assume that remainder is a single path segment, same as an
	// auto-generated id (e.g. "Qftzjccxp") always is. Confirmed live: a
	// name with an extra internal slash (the earlier 'Media/clip/for/'
	// . $hash attempt) broke that assumption, and opening that exact
	// clip's page failed to load at all.
	$clipName = 'Media/clip/for' . substr(sha1($relatedPublisherId . '/' . $relatedStreamName), 0, 20);

	$results = array();
	$clipStream = Streams::fetchOneOrCreate($publisherId, $publisherId, $clipName, array(
		'type' => 'Media/clip',
		'fields' => array(
			'title' => Q::ifset($params, "params", "title", null),
			'content' => Q::ifset($params, "params", "content", null),
			'attributes' => $attributes
		),
		'relate' => array(
			'publisherId' => $relatedPublisherId,
			'streamName' => $relatedStreamName,
			'type' => $relatedType
		),
		'skipAccess' => true
	), $results);

	if (empty($results['created'])) {
		// Already existed (a prior clip, or a duplicate/retried request
		// that lost the fetchOrCreate race) — fetchOrCreate only applies
		// 'fields' on the branch that actually creates the row, so this
		// save's title/content/range need applying explicitly here.
		$title = Q::ifset($params, "params", "title", null);
		if ($title !== null) {
			$clipStream->title = $title;
		}
		$content = Q::ifset($params, "params", "content", null);
		if ($content !== null) {
			$clipStream->content = $content;
		}
		$clipStream->setAttribute('video', $video);
		$clipStream->save();
	}

	Media::safecloudClipCapabilityWrite($clipStream->publisherId, $clipStream->name, $capability);

	return $clipStream;
}
