<?php
function Media_channels_response_loadMore () {
	$communityId = Q::ifset($_REQUEST, 'communityId', Users::currentCommunityId(true));
	$categoryStream = Streams::fetchOne(null, $communityId, 'Media/channels/main', true);

	$offset = Q::ifset($_REQUEST, 'offset', 0);
	$limit = Q::ifset($_REQUEST, 'limit', Q_Config::get(
		'Media', 'pageSizes', 'clips', 10
	));


	$relations = Streams::related($categoryStream->publisherId, $categoryStream->publisherId, $categoryStream->name,true, array(
		"type" => "Media/channel",
		"relationsOnly" => true,
		"limit" => $limit,
		"offset" => $offset
	));

	$channels = array();
	foreach ($relations as $relation) {
		$channels[] = array("publisherId" => $relation->fromPublisherId, "streamName" => $relation->fromStreamName);
	}

	return $channels;
}