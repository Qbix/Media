<?php

function Media_webcast_response_turnServers($params = array()) {
    $params = array_merge($_REQUEST, $params);
    $turnServers = Q_Config::get('Media', 'webrtc', 'turnServers', []);
    $useTwilioTurn = Q_Config::get('Media', 'webrtc', 'useTwilioTurnServers', false);

    if($useTwilioTurn) {
        try {
            $turnCredentials = Media_WebRTC::getTwilioTurnCredentials();
            $turnServers = array_merge($turnServers, $turnCredentials);
        } catch (Exception $e) {
            
        }
    }
    
    return Q_Response::setSlot("turnServers", $turnServers);
}