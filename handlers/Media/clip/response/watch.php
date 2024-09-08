<?php

function Media_clip_response_watch ($params) {
	Q_Valid::nonce(true);

	$user = Users::loggedInUser();

	// non logged user can't earn credits
	if (!$user) {
		return;
	}

	$request = array_merge($_REQUEST, $params);
	$publisherId = $request['publisherId'];
	$streamName = $request['streamName'];
	if (!$publisherId || !$streamName) {
		return;
	}

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
			return;
		}
	}
	// </check if request not earlier than earnPeriod>

	$amount = Q_Config::expect("Assets", "credits", "amounts", "watching");
	Assets_Credits::grant(null, $amount, $reason, $user->id, array(
		"fromPublisherId" => $publisherId,
		"fromStreamName" => $streamName
	));

	return compact('amount', 'commission');
}