<?php
function Media_clip_response_live ($params) {
	$stream = Media::getCurrentLiveShow();
	return array(
		"publisherId" => $stream->publisherId,
		"streamName" => $stream->name
	);
}