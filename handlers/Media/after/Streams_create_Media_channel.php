<?php
	
function Media_after_Streams_create_Media_channel ($params)
{
	$stream = $params['stream'];
	$weight = time();
	$communityId = Users::communityId();

	// relate to main chats category
	$stream->relateTo((object)array("publisherId" => $communityId, "name" => "Media/channels/main"), $stream->type, $communityId, array(
		'skipAccess' => true,
		'weight' => $weight
	));
}