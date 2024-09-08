<?php
function Media_before_Streams_close_Media_feed ($params) {
	$stream = $params['stream'];

	$clipsRelated = $stream->related($stream->publisherId, true, array(
		"relationsOnly" => true,
		"type" => "Media/clip"
	));

	foreach ($clipsRelated as $relation) {
		$clip = Streams::fetchOne($relation->fromPublisherId, $relation->fromPublisherId, $relation->fromStreamName);
		if (!$clip instanceof Streams_Stream) {
			continue;
		}

		$clip->close($clip->publisherId);
	}
}