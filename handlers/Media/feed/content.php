<?php
function Media_feed_response_content ($params) {
	$publisherId = Users::currentCommunityId();
	$feedId = Q::ifset($params, 'feedId', Communities::requestedId($params, 'feedId'));
	$streamName = "Media/feed/$feedId";
	$stream = Streams::fetchOne(null, $publisherId, $streamName, true);

	Q::event('Media/feeds/response/column', $params);

	$params['stream'] = $stream;
	Q::event('Media/feed/response/column', $params);

	return Q::view('Media/content/columns.php');
}