<?php

function Media_webrtc_response_personalPermissions($params = array()) {
    $params = array_merge($_REQUEST, $params);
    $streamName = Q::ifset($params, 'streamName', null);
    $publisherId = Q::ifset($params, 'publisherId', null);
	$loggedInUserId = Users::loggedInUser(true)->id;
    $ofUserId = Q::ifset($params, 'ofUserId', null);

    $webrtcRoomStream = Streams_Stream::fetch($loggedInUserId, $publisherId, $streamName);
    if(!$webrtcRoomStream) {
        throw new Q_Exception_MissingRow(array('table' => 'stream', 'criteria' => "name = $streamName"));
    }
    if(!$webrtcRoomStream->testAdminLevel('manage')) {
        throw new Users_Exception_NotAuthorized();
    }

    $webrtcRoomStream = Streams_Stream::fetch($ofUserId, $publisherId, $streamName);

    $personalAccess = false;
    $access = new Streams_Access();
    $access->publisherId = $publisherId;
    $access->streamName = $streamName;
    $access->ofUserId = $ofUserId;
    $personalPermissions = [];
    if($access->retrieve() && $access->fields['permissions'] !== NULL) {
        $personalAccess = true;
        $personalPermissions = json_decode($access->permissions);
    }

    $publicPermissions = $webrtcRoomStream->fields['permissions'] !== NULL ? json_decode($webrtcRoomStream->fields['permissions']) : []; 
    $permissions = $personalAccess ? $personalPermissions : $publicPermissions;
    $newAccess = array(
        'readLevel' => $webrtcRoomStream->get('readLevel', $webrtcRoomStream->readLevel),
        'writeLevel' => $webrtcRoomStream->get('writeLevel', $webrtcRoomStream->writeLevel),
        'adminLevel' => $webrtcRoomStream->get('adminLevel', $webrtcRoomStream->adminLevel),
        'permissions' => $permissions,
        'personalAccess' => $personalAccess,
        'isCohost' => $personalAccess
    );

    //print_r($webrtcRoomStream);die($ofUserId);
    return Q_Response::setSlot("personalPermissions", $newAccess);

    /*$access = new Streams_Access();
    $access->publisherId = $publisherId;
    $access->streamName = $streamName;
    $access->ofUserId = $ofUserId;
    if($access->retrieve()) {
        return Q_Response::setSlot("personalPermissions", $webrtcRoomStream->access);
    }

    return Q_Response::setSlot("personalPermissions", false);*/
}