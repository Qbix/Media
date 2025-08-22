<?php

function Media_webrtc_response_participatedUsers($params = array()) {
    $params = array_merge($_REQUEST, $params);
    $streamName = Q::ifset($params, 'streamName', null);
    $publisherId = Q::ifset($params, 'publisherId', null);

    if (is_null($streamName) || is_null($publisherId)) {
        throw new Q_Exception_RequiredField(array('field' => 'streamName or publisherId'));
    }

    $participants = Streams_Participant::select()->where(array(
        'publisherId' => $publisherId,
        'streamName' => $streamName
    ))->fetchDbRows(null, '', 'streamName');

    Q_Response::setSlot("participatedUsers", $participants);
}