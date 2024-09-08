<?php
/**
 * Request access to feed clips by date range
 *
 * @param {array} $_REQUEST
 * @param {string} [$_REQUEST.feedId] Required. Last part of the streamName.
 * @param {string} [$_REQUEST.startDate] Required.
 * @param {string} [$_REQUEST.endDate] Required.
 * @param {string} [$_REQUEST.reason] Required.
 * @optional
 * @return {string}
 */
function Media_feed_response_access ($params) {
	$request = array_merge($_REQUEST, $params);

	$userId = Users::loggedInUser(true)->id;

	$publisherId = $request['publisherId'];
	if (!$publisherId) {
		throw new Q_Exception_WrongValue(array('field' => 'publisherId', 'range' => "not empty"));
	}

	$streamName = $request['streamName'];
	if (!$streamName) {
		throw new Q_Exception_WrongValue(array('field' => 'streamName', 'range' => "not empty"));
	}

	$stream = $params['stream'] ?: Streams::fetchOne($userId, $publisherId, $streamName);
	if (!$stream) {
		throw new Streams_Exception_NoSuchStream();
	}

	$startDate = $request["startDate"];
	if (!$startDate) {
		throw new Q_Exception_WrongValue(array('field' => 'startDate', 'range' => "not empty"));
	}
	$startDate = is_numeric($startDate) ?: strtotime($startDate);

	$endDate = $request["endDate"];
	if ($endDate) {
		$endDate = is_numeric($endDate) ?: strtotime($endDate);
	} else {
		$endDate += $startDate + 60*60*24; // if end date empty, set it startDate + day
	}

	$reason = $request["reason"];
	if (!$reason) {
		throw new Q_Exception_WrongValue(array('field' => 'reason', 'range' => "not empty"));
	}

	// add access rows for clips
	$clips = Streams::related($userId, $publisherId, $streamName,true, array(
		'weight' => new Db_Range($startDate, false, false, $endDate),
		"type" => "Media/clip",
		"relationsOnly" => true
	));
	foreach ($clips as $clip) {
		$access = new Streams_Access();
		$access->publisherId = $clip->fromPublisherId;
		$access->streamName = $clip->fromStreamName;
		$access->ofUserId = $userId;
		$access->readLevel = 40;
		if (!$access->retrieve()) {
			$access->save();
		}
	}

	$stream->post($userId, array(
		"type" => "Media/feed/access",
		"instructions" => array(
			"startDate" => $startDate,
			"endDate" => $endDate,
			"reason" => $reason
		)
	), true);
}