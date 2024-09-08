<?php

/**
 * @module Media
 */

/**
 * Close feed stream
 * @class HTTP Media feed
 * @method delete
 * @param {array} $_REQUEST
 * @param {string} [$_REQUEST.publisherId] Required. Feed stream publisher id.
 * @param {string} [$_REQUEST.streamName] Required. Feed stream name.
 * @param {string} [$_REQUEST.userId] Optional. User id request to close stream. Logged user by default.
 */
function Media_feed_delete ($params) {
	$r = array_merge($_REQUEST, $params);
	$required = array('streamName', 'publisherId');
	Q_Valid::requireFields($required, $r, true);
	$publisherId = $r['publisherId'];
	$streamName = $r['streamName'];

	$userId = Q::ifset($r, 'userId', Users::loggedInUser(true)->id);

	$stream = Streams::fetchOne($userId, $publisherId, $streamName);

	// close stream
	$stream->close($publisherId);
}