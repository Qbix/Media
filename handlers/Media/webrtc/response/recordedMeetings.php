<?php

function Media_webrtc_response_recordedMeetings($params = array()) {
    $params = array_merge($_REQUEST, $params);
    $offset = Q::ifset($params, 'offset', 0);
    $limit = Q::ifset($params, 'limit', 10);
    $loggedInUserId = Users::loggedInUser(true)->id;

    $recordedMeetings = Media::userRecordingsStream($loggedInUserId)->related($loggedInUserId, false, array(
        'type' => 'Media/webrtc/recording',
        'fromStreamName' => new Db_Range('Media/webrtc/', false, false, true),
        'streamsOnly' => true
    ));
    return Q_Response::setSlot("recordedMeetings", $recordedMeetings);
}