<?php
function Media_clips_response_loadMore () {
	$communityId = Q::ifset($_REQUEST, 'communityId', Users::currentCommunityId());
	$episodesStream = Streams::fetchOne(null, $communityId, 'Media/episodes', true);

	$offset = Q::ifset($_REQUEST, 'offset', 0);
	$limit = Q::ifset($_REQUEST, 'limit', Q_Config::get(
		'Media', 'pageSizes', 'clips', 10
	));

	$relations = Streams::related($episodesStream->publisherId, $episodesStream->publisherId, $episodesStream->name,true, array(
		"type" => "Media/episode",
		"relationsOnly" => true,
		"limit" => $limit,
		"offset" => $offset
	));

	$clips = array();
	foreach ($relations as $relation) {
		$clips[] = array("publisherId" => $relation->fromPublisherId, "streamName" => $relation->fromStreamName);
	}

	return $clips;
}