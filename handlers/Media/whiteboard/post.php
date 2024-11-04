<?php

function Media_whiteboard_post($params = array()) {
    $params = array_merge($_REQUEST, $params);

    $loggedUserId = Users::loggedInUser(true)->id;
    $publisherId = Q::ifset($params, 'publisherId', null);
    $streamName = Q::ifset($params, 'streamName', null);

    if(!$publisherId || !$streamName) {
        throw new Exception('publisherId and streamName are required');
    }

    $stream = Streams_Stream::fetch($loggedUserId, $publisherId, $streamName);
    if(!$stream) {
        throw new Exception('Stream not found');
    }

    if(!$stream->testReadLevel('max')) {
        throw new Exception('Your are not authorized to do this action');
    }

    
    if(Q_Request::slotName('join')) {
       
        if(!$stream->testWriteLevel('join')) {
            throw new Exception('Your are not authorized to do this action');
        }

        $stream->join(array(
            "userId" => $loggedUserId,
            "subscribed" => true
        ));
	
		Q_Response::setSlot('join', true);
	}
}