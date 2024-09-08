<?php
/**
 * Creates new Media/feed stream
 * @class HTTP
 * @method post
 * @param {array} [$_REQUEST] Parameters that can come from the request
 * @return {void}
 */
function Media_feed_post ($params = array()) {
	$loggedUser = Users::loggedInUser(true);

	if (!Media::newFeedAuthorized($loggedUser->id)) {
		throw new Users_Exception_NotAuthorized();
	}

	$params = array_merge($_REQUEST, $params);
	$mainCommunityId = Users::communityId();
	$title = Q::ifset($params, 'title', "Untitled feed");
	$placeId = Q::ifset($params, 'placeId', null);
	$areaSelected = Q::ifset($params, 'areaSelected', null);
	$relationType = "Media/feed";

	// create own category and join
	$category = Media::getOrCreateStream($loggedUser->id, "Media/feeds", "Streams/category", array(
		"title" => "Feeds for ".$loggedUser->displayName()
	));
    $stream = Streams::create($loggedUser->id, $loggedUser->id, 'Media/feed', @compact("title"),
	array(
		'relate' => array(
			"publisherId" => $category->publisherId,
			"streamName" => $category->name,
			"type" => $relationType,
			"weight" => time()
		)
	));
	$stream->join(array(
		"userId" => $loggedUser->id,
		"subscribed" => true
	));

	// send message to all community categories
	$participatedCategories = Streams_Participant::select()->where(array(
		"streamName" => "Media/feeds",
		"userId" => $loggedUser->id,
		"state" => "participating"
	))->fetchDbRows();
	foreach ($participatedCategories as $participatedCategory) {
		Streams_Message::post($loggedUser->id, $participatedCategory->publisherId, $participatedCategory->streamName, array(
			'type' => 'Media/feed/created',
			'instructions' => array("publisherId" => $stream->publisherId, "streamName" => $stream->name)
		), true);
	}

	// set location
	if ($placeId) {
		$locationStream = Places_Location::stream(null, $mainCommunityId, $placeId);
		$stream->relateTo($locationStream, $relationType);

		if ($areaSelected) {
			if (gettype($areaSelected) == 'string') {
				$areaSelected = json_decode($areaSelected);
			}
			$areaStream = Streams::fetchOne(null, $areaSelected->publisherId, $areaSelected->streamName);
			$stream->relateTo($areaStream, $relationType);
		}

		$stream->setAttribute("location", array(
			"lat" => $locationStream->getAttribute('latitude'),
			"lng" => $locationStream->getAttribute('longitude'),
			"timeZone" => $locationStream->getAttribute('timeZone'),
			"venue" => $locationStream->title,
			"address" => $locationStream->getAttribute("address"),
			"placeId" => $placeId,
			"area" => $areaSelected
		));
		$stream->save();
	}

	return Q_Response::setSlot("stream", $stream);
}