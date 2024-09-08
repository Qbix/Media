<?php

function Media_webrtc_response_apiCredentials($params = array()) {
    $params = array_merge($_REQUEST, $params);
    $appName = Q::app();
    $googleClientId = Q_Config::get('Users', 'apps', 'google', $appName, 'clientId', null);
    $facebookAppId = Q_Config::get('Users', 'apps', 'facebook', $appName, 'appId', null);

    
    return Q_Response::setSlot("apiCredentials", [
        'googleClientId' => $googleClientId,
        'facebookAppId' => $facebookAppId,
    ]);
}