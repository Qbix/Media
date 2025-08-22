<?php

function Media_webrtc_response_invitedUsers($params = array()) {
    $params = array_merge($_REQUEST, $params);
    $streamName = Q::ifset($params, 'streamName', null);
    $publisherId = Q::ifset($params, 'publisherId', null);

    if (is_null($streamName) || is_null($publisherId)) {
        throw new Q_Exception_RequiredField(array('field' => 'streamName or publisherId'));
    }

    $invites = Streams_Invite::select()->where(
        array(
            'streamName' => $streamName,
            'publisherId' => $publisherId,
            'invitingUserId' => $publisherId,
            'userId !=' => ''
        )
    )->fetchDbRows();

    Q_Response::setSlot("invitedUsers", $invites);
}