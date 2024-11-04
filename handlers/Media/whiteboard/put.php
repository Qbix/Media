<?php

function Media_whiteboard_put($params = array()) {
    $params = array_merge($_REQUEST, $params);

    $loggedUserId = Users::loggedInUser(true)->id;
    $publisherId = Q::ifset($params, 'publisherId', null);
    $streamName = Q::ifset($params, 'streamName', null);

    if(!$publisherId || !$streamName) {
        throw new Exception('publisherId and streamName are required');
    }

    if(Q_Request::slotName('draw')) {
        $canvasObject = Q::ifset($params, 'canvasObject', null);
        if(!$canvasObject) {
            throw new Exception('canvasObject is required');
        }
		Streams_Message::post($loggedUserId, $publisherId, $streamName, array(
            'type' => 'Media/whiteboard/draw',
            'instructions' => $canvasObject
        ), true);
		Q_Response::setSlot('draw', true);
	} else if(Q_Request::slotName('remove')) {
        $canvasObject = Q::ifset($params, 'canvasObject', null);
        if(!$canvasObject) {
            throw new Exception('canvasObject is required');
        }
        $canvasObject['pathData'] = '';
		Streams_Message::post($loggedUserId, $publisherId, $streamName, array(
            'type' => 'Media/whiteboard/remove',
            'instructions' => $canvasObject
        ), true);
		Q_Response::setSlot('remove', true);
    }
}