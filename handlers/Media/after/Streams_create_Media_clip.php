<?php
	
function Media_after_Streams_create_Media_clip ($params)
{
	$clip = $params['stream'];
	$weight = time();
	$communityId = Users::communityId();

	// relate to main chats category
	$clip->relateTo((object)array("publisherId" => $communityId, "name" => "Streams/chats/main"), $clip->type, $communityId, array(
		'skipAccess' => true,
		'weight' => $weight
	));
}