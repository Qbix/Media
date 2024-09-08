<?php

/**
 * @module Media
 */

/**
 * Used to start a new Media/webrtc stream (a real time audio/video call)
 * @class HTTP Media webrtc
 * @method post
 * @param {array} [$_REQUEST] Parameters that can come from the request
 *   @param {string} $_REQUEST.publisherId  Required. The id of the user to publish the stream.
 *   @param {string} $_REQUEST.roomId Pass an ID for the room from the client, may already exist
 *   @param {string} $_REQUEST.closeManually If true, stream is not closed automatically by node.js
 * @return {void}
 */
function Media_webrtc_post($params = array())
{
    $socketServerHost = Q_Config::get('Media', 'webrtc', 'socketServerHost', '');
    $socketServerHost = trim(str_replace('/(http\:\/\/) || (https\:\/\/)/', '', $socketServerHost), '/');
    $socketServerPort = Q_Config::get('Media', 'webrtc', 'socketServerPort', null);
    if(!empty($socketServerHost) && !empty($socketServerPort)){
        $socketServer = $socketServerHost . ':' . $socketServerPort;
    } else {
        $socketServer = trim(str_replace('/(http\:\/\/) || (https\:\/\/)/', '', Q_Config::expect('Q', 'node', 'url')), '/');
    }

    $turnServers = Q_Config::get('Media', 'webrtc', 'turnServers', []);
    $useTwilioTurn = Q_Config::get('Media', 'webrtc', 'useTwilioTurnServers', null);
    $livestreamingConfig = Q_Config::get('Media', 'webrtc', 'livestreaming', []);
    $globalLimitsConfig = Q_Config::get('Media', 'webrtc', 'limits', []);
    $debug = Q_Config::get('Media', 'webrtc', 'debug', false);

	$params = array_merge($_REQUEST, $params);
	$loggedInUserId = Users::loggedInUser(true)->id;
	$publisherId = Q::ifset($params, 'publisherId', $loggedInUserId);
	$roomId = Q::ifset($params, 'roomId', null);
	$inviteToken = Q::ifset($params, 'inviteToken', null);
	$invitingUserId = Q::ifset($params, 'invitingUserId', null);
	$socketId = Q::ifset($params, 'socketId', null);
	$callDescription = Q::ifset($params, 'description', null); 
	$resumeClosed = Q::ifset($params, 'resumeClosed', null);
	$relate = Q::ifset($params, 'relate', null);
	$content = Q::ifset($params, 'content', null);
	$taskStreamName = Q::ifset($params, 'taskStreamName', null);
    $writeLevel = Q::ifset($params, 'writeLevel', 23);
    $permissions = Q::ifset($params, 'permissions', ['mic', 'camera', 'screen']);
    $closeManually = Q::ifset($params, 'closeManually', null);
	$useRelatedTo = filter_var(Q::ifset($params, 'useRelatedTo', false), FILTER_VALIDATE_BOOLEAN);

    $nodeh = Q_Config::expect('Q', 'nodeInternal', 'host');
	$nodep = Q_Config::expect('Q', 'nodeInternal', 'port');
	$signalingServer = $nodep && $nodeh ? "http://$nodeh:$nodep/Q/webrtc" : false;

    if(Q_Request::slotName('data')) {
        //this is requests which were sent by node.js when some event was fired (client.on('disconnect'), for example)

        $cmd = Q::ifset($params, 'cmd', null);
        $streamName = Q::ifset($params, 'streamName', null);
        $publisherId = Q::ifset($params, 'publisherId', $loggedInUserId);
        $hostSocketId = Q::ifset($params, 'hostSocketId', null);

        if($cmd == 'closeStream') {
            //this slot is used to close stream when user closes browser tab and disconnect socket event is fired
            $streamToClose = Streams_Stream::fetch(null, $publisherId, $streamName);
    
            if(!is_null($streamToClose)) {
                $streamToClose->setAttribute('status', 'closed');
                //$streamToClose->close($publisherId);
                $streamToClose->changed();
                //$streamToClose->save();
            }
    
            return Q_Response::setSlot('data', ['cmd'=> $cmd, 'publisherId' => $publisherId, 'streamName' => $streamName]);
        } else if($cmd == 'closeIfOffline') {
            //this slot is used to close inactive stream when a host loades list of waiting rooms (we should close waiting rooms of users thar are inactive)

            $userIsOnline = filter_var(Q::ifset($params, 'userIsOnline', false), FILTER_VALIDATE_BOOLEAN);
            $webrtcStream = Streams_Stream::fetch(null, $publisherId, $streamName);
    
            $streamWasClosed = false;
            if($userIsOnline === false) {
                //$webrtcStream->close($publisherId);
                $webrtcStream->setAttribute('status', 'closed');
                $webrtcStream->changed();
                //$webrtcStream->save();
                $streamWasClosed = true;
            }
    
            return Q_Response::setSlot('data', ['cmd'=> $cmd, 'streamWasClosed' =>  $streamWasClosed, 'userIsOnline' => $userIsOnline, 'publisherId' => $publisherId, 'streamName' => $streamName]);
        }
    } else if(Q_Request::slotName('closeIfOffline')) {
        if (!$loggedInUserId) {
            throw new Users_Exception_NotAuthorized();
        }
        $streamName = Q::ifset($params, 'streamName', null);
        $publisherId = Q::ifset($params, 'publisherId', null);
        $hostSocketId = Q::ifset($params, 'hostSocketId', null);
        $usersSocketId = Q::ifset($params, 'socketId', null);
        if(!$usersSocketId) {
            $streamToClose = Streams_Stream::fetch(null, $publisherId, $streamName);
    
            if(!is_null($streamToClose)) {
                $streamToClose->setAttribute('status', 'closed');
                //$streamToClose->close($publisherId);
                $streamToClose->changed();
                //$streamToClose->save();
            }
            return Q_Response::setSlot("closeIfOffline", 'done');
        }
        if(!$streamName || !$publisherId || !$hostSocketId) {
            throw new Exception('streamName, publisherId, hostSocketId are required');
        }
        Q_Utils::sendToNode(array(
            "Q/method" => "Users/checkIfOnline",
            "socketId" => $usersSocketId,
            "userId" => $publisherId,
            "operatorSocketId" => $hostSocketId,
            "operatorUserId" => $loggedInUserId,
            "handlerToExecute" => 'Media/webrtc',
            "data" => array(
                "cmd" => 'closeIfOffline',
                "publisherId" => $publisherId,
                "streamName" => $streamName
            ),
        ));
        
        return Q_Response::setSlot("closeIfOffline", 'done');
    } else if(Q_Request::slotName('admitUserToRoom')) {
        $streamName = Q::ifset($params, 'streamName', null);
        $publisherId = Q::ifset($params, 'publisherId', null);
        $waitingRoomStreamName = Q::ifset($params, 'waitingRoomStreamName', null);
        $userIdToAdmit = Q::ifset($params, 'userIdToAdmit', null);

        $webrtcStream = Streams_Stream::fetch($loggedInUserId, $publisherId, $streamName);
        if(!$webrtcStream->testAdminLevel('manage')) {
            throw new Users_Exception_NotAuthorized();
        }

        if($userIdToAdmit == $publisherId) {
            throw new Exception("Admin's permissions/access cannot be changed");
        }

        $access = new Streams_Access();
        $access->publisherId = $publisherId;
        $access->streamName = $streamName;
        $access->ofUserId = $userIdToAdmit;
        $access->retrieve();
        $access->readLevel = Streams::$READ_LEVEL['max'];
        $access->save();

        $waitingRoomStream = Streams_Stream::fetch($userIdToAdmit, $userIdToAdmit, $waitingRoomStreamName);

        //print_r($waitingRoomStream);die;
        if (!is_null($waitingRoomStream)) {
            $waitingRoomStream->setAttribute('status', 'accepted');    
            //$waitingRoomStream->close($userIdToAdmit);
            $waitingRoomStream->changed();
            //$waitingRoomStream->save();

            $waitingRoomStream->post($userIdToAdmit, array(
                'type' => 'Media/webrtc/admit',
                'instructions' => ['msg' => 'You will be joined to the room now']
            ));
        }
    
        return Q_Response::setSlot("admitUserToRoom", 'done');
    } else if(Q_Request::slotName('cancelAccessToRoom')) {
        $streamName = Q::ifset($params, 'streamName', null);
        $publisherId = Q::ifset($params, 'publisherId', null);
        $userId = Q::ifset($params, 'userId', null);

        $webrtcStream = Streams_Stream::fetch($loggedInUserId, $publisherId, $streamName);
        if(!$webrtcStream->testAdminLevel('manage')) {
            throw new Users_Exception_NotAuthorized();
        }

        if($userId == $publisherId) {
            throw new Exception("Admin's permissions/access cannot be changed");
        }

        $access = new Streams_Access();
        $access->publisherId = $publisherId;
        $access->streamName = $streamName;
        $access->ofUserId = $userId;
        $access->retrieve();
        $access->readLevel = Streams::$READ_LEVEL['none'];
        $access->save();
    
        return Q_Response::setSlot("cancelAccessToRoom", 'done');
    } else if(Q_Request::slotName('closeWaitingRoom')) {
        $streamName = Q::ifset($params, 'streamName', null);
        $publisherId = Q::ifset($params, 'publisherId', null);
        $waitingRoomStreamName = Q::ifset($params, 'waitingRoomStreamName', null);
        $waitingRoomUserId = Q::ifset($params, 'waitingRoomUserId', null);

        $webrtcStream = Streams_Stream::fetch($loggedInUserId, $publisherId, $streamName);
        if(!$webrtcStream->testAdminLevel('manage') && $loggedInUserId != $waitingRoomUserId) {
            throw new Users_Exception_Authorized();
        }

        $waitingRoomStream = Streams_Stream::fetch($waitingRoomUserId, $waitingRoomUserId, $waitingRoomStreamName);

        if (!is_null($waitingRoomStream)) {
            $waitingRoomStream->setAttribute('status', 'closed');            
            $waitingRoomStream->post($waitingRoomUserId, array(
                'type' => 'Media/webrtc/close',
                'instructions' => ['msg' => 'Your waiting room was closed.']
            ));
            $waitingRoomStream->changed();
            $waitingRoomStream->save();
            $waitingRoomStream->close($waitingRoomUserId);
        }
    
        return Q_Response::setSlot("closeWaitingRoom", 'done');
    } else if(Q_Request::slotName('addOrRemoveGlobalPermission')) {
        $streamName = Q::ifset($params, 'streamName', null);
        $publisherId = Q::ifset($params, 'publisherId', null);
        $permissionName = Q::ifset($params, 'permissionName', null);
        $actionToDo = Q::ifset($params, 'actionToDo', null);

        if(!$permissionName || !$actionToDo) {
            throw new Exception('permissionName is required');
        }

        $webrtcRoomStream = Streams_Stream::fetch($loggedInUserId, $publisherId, $streamName);

        if(!$webrtcRoomStream) {
            throw new Exception('WebRTC stream not found');
        }
        if(!$webrtcRoomStream || !$webrtcRoomStream->testAdminLevel('manage')) {
            throw new Users_Exception_NotAuthorized();
        }

        $all = $webrtcRoomStream->getAllPermissions();
        $msgType = null;
        if ($actionToDo == 'add') {
            $webrtcRoomStream->addPermission($permissionName);
            $msgType = 'Media/webrtc/globalPermissionsAdded';
        } elseif ($actionToDo == 'remove') {
            if (in_array($permissionName, $all)) {
                for ($i = count($all) - 1; $i >= 0; $i--) {
                    if ($all[$i] == $permissionName) {
                        array_splice($all, $i, 1);
                        break;
                    }
                }
            }
            $webrtcRoomStream->permissions = $all;
            $msgType = 'Media/webrtc/globalPermissionsRemoved';
        }
        $webrtcRoomStream->changed();
        $webrtcRoomStream->save();

        $webrtcRoomStream = Streams_Stream::fetch($loggedInUserId, $publisherId, $streamName);

        $newAccess = array(
			'readLevel' => $webrtcRoomStream->fields['readLevel'],
			'writeLevel' => $webrtcRoomStream->fields['writeLevel'],
			'adminLevel' => $webrtcRoomStream->fields['adminLevel'],
			'permissions' => $webrtcRoomStream->fields['permissions'] !== NULL ? json_decode($webrtcRoomStream->fields['permissions']) : []
		);

        if ($msgType) {
            $webrtcRoomStream->post($publisherId, array(
                'type' => $msgType,
                'instructions' => ['permission' => $permissionName, 'access' => $newAccess]
            ));
        }
    
        return Q_Response::setSlot("addOrRemoveGlobalPermission", $newAccess);
    } else if(Q_Request::slotName('setOrRemoveGeneralAccess')) {
        $streamName = Q::ifset($params, 'streamName', null);
        $publisherId = Q::ifset($params, 'publisherId', null);
        $userIdToAdmit = Q::ifset($params, 'userIdToAdmit', null);
        $actionToDo = Q::ifset($params, 'actionToDo', null);
        $relatedStreamName = Q::ifset($params, 'relatedStreamName', null);
        $relatedStreamPublisherId = Q::ifset($params, 'relatedStreamPublisherId', null);

        $possibleActions = ['makeStreamPublic', 'makeStreamPrivate', 'addInheritFromStream', 'removeInheritFromStream'];
        if(is_null($actionToDo) || array_search($actionToDo, $possibleActions) === false) {
            throw new Exception("actionToDo field is wrong or empty");
        }

        $webrtcStream = Streams_Stream::fetch($loggedInUserId, $publisherId, $streamName);
        if(!$webrtcStream->testAdminLevel('manage')) {
            throw new Users_Exception_NotAuthorized();
        }

        if($userIdToAdmit == $publisherId) {
            throw new Exception("Admin's permissions/access cannot be changed");
        }

        if($actionToDo == 'makeStreamPublic') {
            $webrtcStream->readLevel = 40;
        } else if ($actionToDo == 'makeStreamPrivate') {
            $webrtcStream->readLevel = 0;
        } else if ($actionToDo == 'addInheritFromStream') {
            $addInheritFrom = [$relatedStreamPublisherId, $relatedStreamName];
            $inheritFromString = json_encode([$addInheritFrom]);
            if(isset($webrtcStream->inheritAccess) && is_array($webrtcStream->inheritAccess)) {
                $existingInherit = $webrtcStream->inheritAccess;
                array_push($existingInherit, $addInheritFrom);
                $inheritFromString = json_encode($existingInherit);
            }
            $webrtcStream->inheritAccess = $inheritFromString;
        } else if ($actionToDo == 'removeInheritFromStream') {
            if(isset($webrtcStream->inheritAccess) && is_array($webrtcStream->inheritAccess)) {
                $existingInherit = $webrtcStream->inheritAccess;
                $index = findSubarrayIndex($existingInherit, $relatedStreamPublisherId, $relatedStreamName);
                if($index !== -1) {
                    array_splice($existingInherit, $index, 1);
                }
                $inheritFromString = json_encode($existingInherit);
            }
            $webrtcStream->inheritAccess = $inheritFromString;
        }

        $webrtcStream->changed();
        $webrtcStream->save();
    
        return Q_Response::setSlot("setOrRemoveGeneralAccess", 'done');

    } else if(Q_Request::slotName('addOrRemovePersonalPermission')) {
        $streamName = Q::ifset($params, 'streamName', null);
        $publisherId = Q::ifset($params, 'publisherId', null);
        $permissionName = Q::ifset($params, 'permissionName', null);
        $actionToDo = Q::ifset($params, 'actionToDo', null);
        $ofUserId = Q::ifset($params, 'ofUserId', null);

        if(!$permissionName || !$actionToDo) {
            throw new Exception('permissionName is required');
        }

        if($ofUserId == $publisherId) {
            throw new Exception("Admin's permissions cannot be changed");
        }

        $webrtcRoomStream = Streams_Stream::fetch($loggedInUserId, $publisherId, $streamName);
        if(!$webrtcRoomStream) {
            throw new Exception('WebRTC stream not found');
        }

        if(!$webrtcRoomStream->testAdminLevel('manage')) {
            throw new Users_Exception_NotAuthorized();
        }

        
        $msgType = null;
        $access = new Streams_Access();
        $access->publisherId = $publisherId;
        $access->streamName = $streamName;
        $access->ofUserId = $ofUserId;
       
        if ($actionToDo == 'add') {
            $all = [];
            if ($access->retrieve() && !is_null($access->permissions)) {
                $all = json_decode($access->permissions);
            } else {
                $all = $webrtcRoomStream->getAllPermissions();
            }

            if (!in_array($permissionName, $all)) {
                $all[] = $permissionName;
            }

            $access->permissions = json_encode($all);
            $msgType = 'Media/webrtc/personalPermissionsAdded';
        } elseif ($actionToDo == 'remove') {

            if($access->retrieve() && !is_null($access->permissions)) {
                $all = json_decode($access->permissions);
            } else {
                $all = $webrtcRoomStream->getAllPermissions();
            }

            if (in_array($permissionName, $all)) {
                for ($i = count($all) - 1; $i >= 0; $i--) {
                    if ($all[$i] == $permissionName) {
                        array_splice($all, $i, 1);
                        break;
                    }
                }
            }
            $access->permissions = json_encode($all);           
            $msgType = 'Media/webrtc/personalPermissionsRemoved';
            
        }

        $access->save();

        $webrtcRoomStream = Streams_Stream::fetch($ofUserId, $publisherId, $streamName);

        $newAccess = array(
			'readLevel' => $webrtcRoomStream->get('readLevel', $webrtcRoomStream->readLevel),
			'writeLevel' => $webrtcRoomStream->get('writeLevel', $webrtcRoomStream->writeLevel),
			'adminLevel' => $webrtcRoomStream->get('adminLevel', $webrtcRoomStream->adminLevel),
			'permissions' => $webrtcRoomStream->get('permissions', $webrtcRoomStream->getAllPermissions()),
            'personalAccess' => true,
            'isCohost' => $webrtcRoomStream->testAdminLevel('manage'),
		);

        if ($msgType) {
            $webrtcRoomStream->post($loggedInUserId, array(
                'type' => $msgType,
                'instructions' => ['permission' => $permissionName, 'ofUserId' => $ofUserId, 'access' => $newAccess]
            ));
        }
    
        return Q_Response::setSlot("addOrRemovePersonalPermission", $newAccess);
    } else if(Q_Request::slotName('resetPersonalPermissions')) {
        $streamName = Q::ifset($params, 'streamName', null);
        $publisherId = Q::ifset($params, 'publisherId', null);
        $ofUserId = Q::ifset($params, 'ofUserId', null);

        if($ofUserId == $publisherId) {
            throw new Exception("Admin's permissions cannot be changed");
        }

        $webrtcRoomStream = Streams_Stream::fetch($loggedInUserId, $publisherId, $streamName);
        if(!$webrtcRoomStream) {
            throw new Exception('WebRTC stream not found');
        }

        if(!$webrtcRoomStream->testAdminLevel('manage')) {
            throw new Users_Exception_NotAuthorized();
        }
        
        $msgType = null;
        $access = new Streams_Access();
        $access->publisherId = $publisherId;
        $access->streamName = $streamName;
        $access->ofUserId = $ofUserId;

        if($access->retrieve()) {
            //$access->remove();
            $access->permissions = null;
            $access->save();
        }

        $webrtcRoomStream = Streams_Stream::fetch($ofUserId, $publisherId, $streamName);
    
        $newAccess = array(
			'readLevel' => $webrtcRoomStream->get('readLevel', $webrtcRoomStream->readLevel),
			'writeLevel' => $webrtcRoomStream->get('writeLevel', $webrtcRoomStream->writeLevel),
			'adminLevel' => $webrtcRoomStream->get('adminLevel', $webrtcRoomStream->adminLevel),
			'permissions' => $webrtcRoomStream->get('permissions', $webrtcRoomStream->getAllPermissions()),
            'personalAccess' => false
		);

        $webrtcRoomStream->post($loggedInUserId, array(
            'type' => 'Media/webrtc/resetPersonalPermissions',
            'instructions' => ['ofUserId' => $ofUserId, 'access' => $newAccess]
        ));
    
        return Q_Response::setSlot("resetPersonalPermissions", $newAccess);
    } else if(Q_Request::slotName('addOrRemoveCohost')) {
        $streamName = Q::ifset($params, 'streamName', null);
        $publisherId = Q::ifset($params, 'publisherId', null);
        $userId = Q::ifset($params, 'userId', null);
        $actionToDo = Q::ifset($params, 'actionToDo', null);

        if($userId == $publisherId) {
            throw new Exception("Admin's permissions/access cannot be changed");
        }

        if(!$actionToDo || ($actionToDo != 'add' && $actionToDo != 'remove')) {
            throw new Exception('actionToDo is required: add OR remove');
        }

        $webrtcStream = Streams_Stream::fetch($loggedInUserId, $publisherId, $streamName);
        if(!$webrtcStream->testAdminLevel('max')) {
            throw new Users_Exception_NotAuthorized();
        }

        $personalAccess = false;
        $access = new Streams_Access();
        $access->publisherId = $publisherId;
        $access->streamName = $streamName;
        $access->ofUserId = $userId;
        if($access->retrieve()) {
            $personalAccess = true;
        }

        if($actionToDo == 'add') {
            $usersContact = new Users_Contact();
            $usersContact->userId = $publisherId;
            $usersContact->contactUserId = $userId;
            $usersContact->label = "Users/hosts";
            if (!$usersContact->retrieve()) {
                $usersContact->save();
            }
        } else {
            $usersContact = new Users_Contact();
            $usersContact->userId = $publisherId;
            $usersContact->contactUserId = $userId;
            $usersContact->label = "Users/hosts";
            $usersContact->remove();
        }

        //$webrtcStream->calculateAccess($userId, true);

        //$stillCohost0 = $webrtcStream->testAdminLevel('manage');

        $webrtcStream = Streams_Stream::fetch($userId, $publisherId, $streamName);

        $isCohost = $webrtcStream->testAdminLevel('manage');

        $newAccess = array(
			'readLevel' => $webrtcStream->get('readLevel', $webrtcStream->readLevel),
			'writeLevel' => $webrtcStream->get('writeLevel', $webrtcStream->writeLevel),
			'adminLevel' => $webrtcStream->get('adminLevel', $webrtcStream->adminLevel),
			'permissions' => $webrtcStream->get('permissions', $webrtcStream->getAllPermissions()),
            'personalAccess' => $personalAccess,
            'isCohost' => $isCohost,
            'isAdmin' => false,
		);
        
        $webrtcStream->post($loggedInUserId, array(
            'type' => 'Media/webrtc/addOrRemoveCohost',
            'instructions' => ['ofUserId' => $userId, 'access' => $newAccess]
        ));

        if($signalingServer) {
            //we need to update access in real time to make connecting to room faster
            //so indstead of: participant connected socket server -> make req to get info about other users' access (php)
            //user gets access info when he is connected to the socket server without additional requests
            //and also user cannot to forge his permissions as other users don't get them from him but from server
            $result = Q_Utils::sendToNode(array(
                "Q/method" => "Media/webrtc/updateAccess",
                "userId" => $userId,
                "roomId" => $publisherId . '_' . explode('/', $streamName)[2],
                "newAccess" => $newAccess,
                "data" => $newAccess
            ), $signalingServer);
        }

        return Q_Response::setSlot("addOrRemoveCohost", $newAccess);
    } else if(Q_Request::slotName('getRoomParticipants')) {
        $streamName = Q::ifset($params, 'streamName', null);
        $publisherId = Q::ifset($params, 'publisherId', null);

        $webrtcStream = Streams_Stream::fetch($loggedInUserId, $publisherId, $streamName);

        $participants = $webrtcStream->getParticipants(array(
            "state" => "participating"
        ));

        return Q_Response::setSlot("getRoomParticipants", $participants);
    } else if(Q_Request::slotName('turnLimitsOnOrOff')) {
        $streamName = Q::ifset($params, 'streamName', null);
        $publisherId = Q::ifset($params, 'publisherId', null);
        $actionToDo = Q::ifset($params, 'actionToDo', null);

        if(!$actionToDo || ($actionToDo != 'on' && $actionToDo != 'off')) {
            throw new Exception('actionToDo is required: add OR remove');
        }

        $webrtcStream = Streams_Stream::fetch($loggedInUserId, $publisherId, $streamName);
        if(!$webrtcStream->testAdminLevel('max')) {
            throw new Users_Exception_NotAuthorized();
        }


        if($actionToDo == 'on') {
            $limits = $webrtcStream->getAttribute('limits', null);
            if(is_null($limits)) {
                $webrtcStream->setAttribute('limits', [
                    'active' => true,
                    'video' => 1,
                    'audio' => 1,
                    'minimalTimeOfUsingSlot' => 20000,
                    'timeBeforeForceUserToDisconnect' => 10000
                ]);

            } else {
                $limits['active'] = true;
                $webrtcStream->setAttribute('limits', $limits);
            }
            
            $webrtcStream->changed();
            $webrtcStream->save();
        } else {
            $limits = $webrtcStream->getAttribute('limits', null);
            if(is_null($limits)) {
                $webrtcStream->setAttribute('limits', [
                    'active' => false,
                    'video' => 1,
                    'audio' => 1,
                    'minimalTimeOfUsingSlot' => 20000,
                    'timeBeforeForceUserToDisconnect' => 10000
                ]);

            } else {
                $limits['active'] = false;
                $webrtcStream->setAttribute('limits', $limits);
            }
            
            $webrtcStream->changed();
            $webrtcStream->save();
        }

        $webrtcStream->post($loggedInUserId, array(
            'type' => 'Media/webrtc/turnLimitsOnOrOff',
            'instructions' => ['action' => $actionToDo]
        ));

        if($signalingServer) {
            Q_Utils::sendToNode(array(
                "Q/method" => "Media/webrtc/turnLimitsOnOrOff",
                "roomId" => $publisherId . '_' . explode('/', $streamName)[2],
                'action' => $actionToDo
            ), $signalingServer);
        }

        return Q_Response::setSlot("turnLimitsOnOrOff", 'done');
    } else if(Q_Request::slotName('updateLimits')) {
        $streamName = Q::ifset($params, 'streamName', null);
        $publisherId = Q::ifset($params, 'publisherId', null);
        $minimalTimeOfUsingSlot = Q::ifset($params, 'timeToTalk', null);
        $timeBeforeForceUserToDisconnect = Q::ifset($params, 'timeToEnd', null);
        $videoSlots = Q::ifset($params, 'videoSlots', null);
        $audioSlots = Q::ifset($params, 'audioSlots', null);

        $webrtcStream = Streams_Stream::fetch($loggedInUserId, $publisherId, $streamName);
        if(!$webrtcStream->testAdminLevel('max')) {
            throw new Users_Exception_NotAuthorized();
        }

        $limits = $webrtcStream->getAttribute('limits', null);

        $newLimits = [
            'active' => is_null($limits) ? false : $limits['active'],
            'video' => $videoSlots,
            'audio' => $audioSlots,
            'minimalTimeOfUsingSlot' => $minimalTimeOfUsingSlot,
            'timeBeforeForceUserToDisconnect' => $timeBeforeForceUserToDisconnect
        ];

        $webrtcStream->setAttribute('limits', $newLimits);

        $webrtcStream->changed();
        $webrtcStream->save();
        

        $webrtcStream->post($loggedInUserId, array(
            'type' => 'Media/webrtc/updateLimits',
            'instructions' => ['limits' => $newLimits]
        ));

        if($signalingServer) {
            Q_Utils::sendToNode(array(
                "Q/method" => "Media/webrtc/updateLimits",
                "roomId" => $publisherId . '_' . explode('/', $streamName)[2],
                "limits" => $newLimits
            ), $signalingServer);
        }

        return Q_Response::setSlot("updateLimits", 'done');
    } else if(Q_Request::slotName('recording')) {
        //this slot is not used for now; it is supposed to merge separate audio recordings of webrtc conference into one file
        $communityId = Q::ifset($_REQUEST, 'communityId', Users::communityId());
        $luid = Users::loggedInUser(true)->id;
        $app = Q::app();

        $task = isset($_REQUEST['taskStreamName'])
            ? Streams_Stream::fetch($luid, $communityId, $taskStreamName, true)
            : Streams::create($luid, $communityId, 'Streams/task', array(), array(
                'skipAccess' => true
            )/*, array(
                'publisherId' => $app,
                'streamName' => "Media/webrtc/meeting4",
                'type' => 'Media/webrtc'
            )*/);
        Q_Response::setSlot("recording", $task);

        //Media_WebRTC::mergeRecordings($publisherId, $roomId);
        return;
    }

    $webrtc = new Media_WebRTC_Node();

    if($useTwilioTurn) {
        try {
            $turnCredentials = $webrtc->getTwilioTurnCredentials();
            $turnServers = array_merge($turnServers, $turnCredentials);
        } catch (Exception $e) {
        }
    }

    $response = array(
        'socketServer' => $socketServer,
        'turnCredentials' => $turnServers,
        'debug' => $debug,
        'options' => array(
            'livestreaming' => $livestreamingConfig,
            'limits' => $globalLimitsConfig
        )
    );

    $webrtcStream = null;
    if(!is_null($inviteToken) && !is_null($invitingUserId)){

        $webrtcStream = $webrtc->getRoomStreamByInviteToken($inviteToken, $resumeClosed);
        if (!$webrtcStream) {
            throw new Exception("Room does not exist");
        };
        if ($webrtcStream->testReadLevel("max")) {
            if ($resumeClosed) {
                $webrtcStream->closedTime = null;
                $webrtcStream->changed();
    
                $endTime = $webrtcStream->getAttribute('endTime');
                $startTime = $webrtcStream->getAttribute('startTime');
                if ($startTime == null || ($endTime != null && round(microtime(true) * 1000) > $endTime)) {
                    $startTime = round(microtime(true) * 1000);
                    $webrtcStream->setAttribute('startTime', $startTime);
                    $webrtcStream->clearAttribute('endTime');
                    $webrtcStream->save();
                }
            }
        } else {
            $waitingRoomStream = $webrtc->getRoomStreamRelatedTo($webrtcStream->fields["publisherId"], $webrtcStream->fields["name"], $loggedInUserId, null, 'Media/webrtc/waitingRoom', true);

            //print_r($waitingRoomStream);die;
            if(is_null($waitingRoomStream)) {
                $waitingRoomStream = $webrtc->createWaitingRoomStream();
                $newStream = true;
            }
            
            $waitingRoomStream->setAttribute('socketId', $socketId);
            $waitingRoomStream->setAttribute('status', 'waiting');
            $waitingRoomStream->join(['subscribed' => true]);
            $waitingRoomStream->subscribe(['userId' => $webrtcStream->fields['publisherId']]);
            if ($newStream) {
                $waitingRoomStream->relateTo((object)array(
                    "publisherId" => $webrtcStream->fields["publisherId"],
                    "name" => $webrtcStream->fields["name"]
                ), 'Media/webrtc/waitingRoom', $webrtcStream->fields["publisherId"], array(
                    "inheritAccess" => false, //true doesn't work for some reason so I call the code below
                    "weight" => time()
                ));
            } 

            $addInheritFrom = [$webrtcStream->fields["publisherId"], $webrtcStream->fields["name"]];
            $inheritFromString = json_encode([$addInheritFrom]);
            if(isset($waitingRoomStream->inheritAccess) && is_array($waitingRoomStream->inheritAccess)) {
                $existingInherit = $waitingRoomStream->inheritAccess;
                array_push($existingInherit, $addInheritFrom);
                $inheritFromString = json_encode($existingInherit);
            }
            $waitingRoomStream->inheritAccess = $inheritFromString;

            $waitingRoomStream->changed();
            $waitingRoomStream->save();
            
            $response['waitingRoomStream'] = $waitingRoomStream;

            $webrtcStream->post($webrtcStream->fields['publisherId'], array(
                'type' => 'Media/webrtc/waitingRooom',
            ));

            //if user closes tab with waiting room, we should close waiting room stream
            Q_Utils::sendToNode(array(
                "Q/method" => "Users/addEventListener",
                "socketId" => $socketId,
                "userId" => $loggedInUserId,
                "eventName" => 'disconnect',
                "handlerToExecute" => 'Media/webrtc',
                "data" => array(
                    "cmd" => 'closeStream',
                    "publisherId" => $waitingRoomStream->fields['publisherId'],
                    "streamName" => $waitingRoomStream->fields['name']
                ),
            ));

            return Q_Response::setSlot("room", $response);  
            
        }      
    } else if($useRelatedTo && !empty($relate)) {
        $webrtcStream = $webrtc->getRoomStreamRelatedTo($relate["publisherId"], $relate["streamName"], null, null, $relate["relationType"], $resumeClosed);
    
        if(is_null($webrtcStream)) {
            $webrtcStream = $webrtc->getOrCreateRoomStream($publisherId, $roomId, $resumeClosed, ['writeLevel' => $writeLevel], $permissions);
        }

    } else {
        $webrtcStream = $webrtc->getOrCreateRoomStream($publisherId, $roomId, $resumeClosed, ['writeLevel' => $writeLevel], $permissions);
    }

    if (!$webrtcStream->testReadLevel("max")) {
        throw new Exception('Access denied');
    }

    $response['stream'] = $webrtcStream;
    $response['roomId'] = $webrtcStream->name;

    $specificLimitsConfig = $webrtcStream->getAttribute('limits', null);

    if(!is_null($specificLimitsConfig)) {
        if(isset($specificLimitsConfig['video'])) {
            $response['options']['limits']['video'] = $specificLimitsConfig['video'];
        }
        if(isset($specificLimitsConfig['audio'])) {
            $response['options']['limits']['audio'] = $specificLimitsConfig['audio'];
        }
        if(isset($specificLimitsConfig['minimalTimeOfUsingSlot'])) {
            $response['options']['limits']['minimalTimeOfUsingSlot'] = $specificLimitsConfig['minimalTimeOfUsingSlot'];
        }
        if(isset($specificLimitsConfig['timeBeforeForceUserToDisconnect'])) {
            $response['options']['limits']['timeBeforeForceUserToDisconnect'] = $specificLimitsConfig['timeBeforeForceUserToDisconnect'];
        }
    }

    // check maxCalls
	if (!empty($relate["publisherId"]) && !empty($relate["streamName"]) && !empty($relate["relationType"])) {
		// if calls unavailable, throws exception
		Streams::checkAvailableRelations($publisherId, $relate["publisherId"], $relate["streamName"], $relate["relationType"], array(
			"postMessage" => false,
			"throw" => true,
			"singleRelation" => true
		));
	}

	if ($publisherId == $loggedInUserId || $response['stream']->testWriteLevel('edit')) {
		if ($content) {
            $response['stream']->content = $content;
            $response['stream']->changed();
		}
	}

	if (!empty($relate["publisherId"]) && !empty($relate["streamName"]) && !empty($relate["relationType"])) {
        $response['stream']->relateTo((object)array(
			"publisherId" => $relate["publisherId"],
			"name" => $relate["streamName"]
		), $relate["relationType"], $response['stream']->publisherId, array(
			"inheritAccess" => filter_var($relate["inheritAccess"], FILTER_VALIDATE_BOOLEAN),
			"weight" => time()
		));
	}

	if ($resumeClosed !== null) {
        $response['stream']->setAttribute("resumeClosed", $resumeClosed);
	}

	if ($closeManually !== null) {
        $response['stream']->setAttribute("closeManually", $closeManually);
	}

	if ($callDescription !== null) {
        $response['stream']->content = $callDescription;
	}

    $meAsParticipant = $response['stream']->participant();
    if (!$meAsParticipant || $meAsParticipant->fields['state'] != 'participating') {
        $response['stream']->join();
    }   

    $response['stream']->save();

	Q_Response::setSlot("room", $response);
}


function findSubarrayIndex($array, $firstElement, $secondElement) {
    foreach ($array as $index => $subarray) {
        if ($subarray[0] === $firstElement && $subarray[1] === $secondElement) {
            return $index;
        }
    }
    return -1;
}