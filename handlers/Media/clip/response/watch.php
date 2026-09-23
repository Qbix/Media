<?php

/**
 * Q_Dispatcher treats a literal null return from a slot-response handler
 * like this one as a mistake (substitutes a "Don't return null" warning
 * string as the slot's value instead) — every branch below returns an
 * array, even for "nothing happened this tick" cases, rather than null or
 * a bare return.
 */
function Media_clip_response_watch ($params) {
	Q_Valid::nonce(true);

	$user = Users::loggedInUser();

	// non logged user can't earn credits
	if (!$user) {
		return array();
	}

	$request = array_merge($_REQUEST, $params);
	$publisherId = $request['publisherId'];
	$streamName = $request['streamName'];
	if (!$publisherId || !$streamName) {
		return array();
	}

	$stream = Streams_Stream::fetch($user->id, $publisherId, $streamName, true);
	$status = Media::episodePaymentStatus($stream, $user->id);
	$isPaidEpisode = $status['perStreamAmount'] > 0 || $status['perMinuteAmount'] > 0;

	if ($isPaidEpisode && !$status['isOwner']) {
		if ($status['fullyPaid']) {
			// Paid in full — whether via a one-time purchase or by having
			// accrued enough through per-minute charges — means free
			// unlimited viewing from here on, but NOT switching over to
			// earning credits too: that would let someone pay just enough
			// to "unlock", then keep watching for infinite free credits.
			return array();
		}
		if ($status['perMinuteAmount'] > 0) {
			return Media_clip_chargeForWatching($stream, $user, $status);
		}
		// perStream-only and not yet paid — shouldn't be reachable at all
		// (Media/clip/response/column.php withholds the Safecloud key
		// entirely in this case, so there's nothing to watch/tick against),
		// but no-op defensively rather than falling through to granting
		// free credits on unpaid content.
		return array();
	}

	// ---- existing earn behavior, unchanged, for episodes with no payment
	// attribute at all (i.e. completely free, exactly as before this
	// feature existed) ----
	$reason = "WatchClip";
	$earnPeriod = (int)Q_Config::expect("Media", "clip", "watching", "earnPeriod");

	// <check if request not earlier than earnPeriod>
	$lastMessage = Assets_Credits::select()->where(array(
		"toUserId" => $user->id,
		"reason" => $reason
	))->orderBy('insertedTime', false)->limit(1)->fetchDbRow();
	if (!empty($lastMessage)) {
		$db = Streams::db();
		$insertedTime = $db->fromDateTime($lastMessage->insertedTime);
		$currentTime = $db->getCurrentTimestamp();

		if ($currentTime < $insertedTime + $earnPeriod) {
			return array();
		}
	}
	// </check if request not earlier than earnPeriod>

	$amount = Q_Config::expect("Assets", "credits", "amounts", "watching");
	Assets_Credits::grant(null, $amount, $reason, $user->id, array(
		"fromPublisherId" => $publisherId,
		"fromStreamName" => $streamName
	));

	return array('earned' => true, 'amount' => $amount);
}

/**
 * Charges the viewer $status['perMinuteAmount'] credits for this tick of
 * watching a per-minute-priced episode. Throttled per (user, episode) pair —
 * not just per user — so watching two different paid episodes back-to-back
 * doesn't incorrectly throttle the second one against the first's timer.
 *
 * The "watch" slot's whole value is this function's return value (see the
 * caller, Media_clip_response_watch — a slot-specific response handler,
 * where the return value directly becomes response.slots.watch on the
 * client, not something read via Q_Response::setSlot for extra slot names
 * that weren't part of the original request).
 *
 * @method Media_clip_chargeForWatching
 * @param {Streams_Stream} $stream
 * @param {Users_User} $user
 * @param {array} $status From Media::episodePaymentStatus()
 * @return {array} {charged:true, amount} on success,
 *   {insufficientCredits:true} if the user's balance was too low, or
 *   {} if this tick was throttled (too soon since the last charge)
 */
function Media_clip_chargeForWatching($stream, $user, $status)
{
	$reason = "WatchPaidEpisode";
	$period = (int)Q_Config::get("Media", "clip", "watching", "earnPeriod", 60);

	// <check if request not earlier than $period, for THIS episode specifically>
	$lastMessage = Assets_Credits::select()->where(array(
		"fromUserId" => $user->id,
		"reason" => $reason,
		"toPublisherId" => $stream->publisherId,
		"toStreamName" => $stream->name
	))->orderBy('insertedTime', false)->limit(1)->fetchDbRow();
	if (!empty($lastMessage)) {
		$db = Streams::db();
		$insertedTime = $db->fromDateTime($lastMessage->insertedTime);
		$currentTime = $db->getCurrentTimestamp();

		if ($currentTime < $insertedTime + $period) {
			return array();
		}
	}
	// </check>

	try {
		Assets_Credits::spend(null, $status['perMinuteAmount'], $reason, $user->id, array(
			'toPublisherId' => $stream->publisherId,
			'toStreamName' => $stream->name,
			'fromStreamName' => $stream->name
		));
	} catch (Assets_Exception_NotEnoughCredits $e) {
		return array('insufficientCredits' => true);
	}

	return array('charged' => true, 'amount' => $status['perMinuteAmount']);
}
