<?php

function Media_livestream_response_livestreamStream($params = array())
{
    $publisherId =  Q::ifset($params, 'publisherId', Q::ifset($_REQUEST, 'publisherId', Q::ifset($uri, 'publisherId', null)));
    $streamName =  Q::ifset($params, 'streamName', Q::ifset($_REQUEST, 'streamName', Q::ifset($uri, 'streamName', null)));

    $livestreamStream = Media_Livestream::getLivestreamStream($publisherId, $streamName);

    Q_Response::setSlot("livestreamStream", ['stream' => $livestreamStream]);
}
