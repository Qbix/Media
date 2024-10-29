<?php

function Media_teams_response_allParticipants($params = array()) {
    $params = array_merge($_REQUEST, $params);

    $publisherId = Q::ifset($params, 'publisherId', null);
    $streamName = Q::ifset($params, 'streamName', null);

    if(!$publisherId || !$streamName) {
        throw new Exception("publisherId and streamName are required params");
    }

    $gameStream = Streams_Stream::fetch(null, $publisherId, $streamName);

    if (is_null($gameStream)) {
        throw new Exception("No game found by specified params");
    }

    ;
    if(strpos($gameStream->fields['type'], 'Media/games') === false) {
        throw new Exception("Stream is not of Media/games type");
    }

    $participants = Streams_Participant::select()->where(array( 
        'publisherId' => $publisherId, 
        'streamName' => $streamName, 
        'state' => 'participating'
        ))->ignoreCache()->fetchDbRows();

    Q_Response::setSlot("allParticipants", $participants);
}