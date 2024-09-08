<?php

function Media_webrtc_response_recordings($params = array()) {
    $params = array_merge($_REQUEST, $params);
    $streamName = Q::ifset($params, 'streamName', null);
    $publisherId = Q::ifset($params, 'publisherId', null);
    $offset = Q::ifset($params, 'offset', 0);
    $limit = Q::ifset($params, 'limit', 10);
    $loggedInUserId = Users::loggedInUser(true)->id;

    $recordings = Streams::related($loggedInUserId, $publisherId, $streamName, true, array(
        'type' => 'Media/webrtc/recording',
        'streamsOnly' => true,
        'limit' => $limit,
        'offset' => $offset
    ));
    return Q_Response::setSlot("recordings", $recordings);
}