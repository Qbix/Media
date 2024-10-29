<?php

function Media_whiteboard_response_state($params = array()) {
    $params = array_merge($_REQUEST, $params);
    $streamName = Q::ifset($params, 'streamName', null);
    $publisherId = Q::ifset($params, 'publisherId', null);
    $loggedInUserId = Users::loggedInUser(true)->id;

    $messages = Streams_Message::select()->where(array(
		"streamName" => $streamName,
		"publisherId" => $publisherId,
		"type" => array("Media/whiteboard/draw", "Media/whiteboard/remove"),
	))->fetchDbRows();

    //$query = $recordedMeetings->getSql();
    //$recordings = $recordedMeetings->fetchAll();

    return Q_Response::setSlot("state", $messages);
}