<?php
function Media_feeds_response_load() {
	$communityId = Q::ifset($_REQUEST, 'communityId', Users::currentCommunityId());
	$offset = Q::ifset($_REQUEST, 'offset', 0);
	$limit = Q::ifset($_REQUEST, 'limit', Q_Config::get('Media', 'pageSizes', 'feeds', 10));

	$relations = Media::filterFeeds(@compact("communityId", "offset", "limit"));

	$res = array();
	foreach ($relations as $relation) {
		$res[] = Q::tool(array(
			"Streams/preview" => array(
				'publisherId' => $relation->fromPublisherId,
				'streamName' => $relation->fromStreamName,
				'closeable' => false
			),
			"Media/feed/preview" => array()
		), Q_Utils::normalize($relation->fromPublisherId . ' ' . $relation->fromStreamName));
	}

	return $res;
}

