<?php

function Media_livestream_response_participatedWebrtcUsers($params = array())
{
    $params = array_merge($_REQUEST, $params);
    $streamName = Q::ifset($params, 'streamName', null);
    $publisherId = Q::ifset($params, 'publisherId', null);

    if (is_null($streamName) || is_null($publisherId)) {
        throw new Q_Exception_RequiredField(array('field' => 'streamName or publisherId'));
    }

    $livestreamsRelations = Streams_RelatedTo::select()->where(array(
        "type" => "Media/webrtc/livestream",
        "fromPublisherId" => $publisherId,
        "fromStreamName" => $streamName,
        "toStreamName LIKE " => 'Media/webrtc/%'
    ))->limit(1)->fetchDbRows();

    if ($livestreamsRelations[0]) {

        $participants = Streams_Participant::select()->where(array(
            'publisherId' => $livestreamsRelations[0]->toPublisherId,
            'streamName' => $livestreamsRelations[0]->toStreamName
        ))->fetchDbRows(null, '', 'streamName');

        return Q_Response::setSlot("participatedWebrtcUsers", $participants);
    }

    Q_Response::setSlot("participatedWebrtcUsers", []);
}
