<?php

/**
 * @module Media
 */

/**
 * Used to start a new Media/webrtc stream (a real time audio/video call)
 * Handler to which requests from front-end are made. Both manager.js and client.js send requests to this handler. 
 * @class HTTP Media webrtc
 * @method post
 * @param {array} [$_REQUEST] Parameters that can come from the request
 *   @param {string} $_REQUEST.publisherId  Required. The id of the user to publish the stream.
 *   @param {string} $_REQUEST.roomId Pass an ID for the room from the client, may already exist
 *   @param {string} $_REQUEST.closeManually If true, stream is not closed automatically by node.js
 * @return {void}
 */
function Media_callCenter_post($params = array())
{
    $config = Q_Config::get('Media', 'webrtc', Q_Config::get('Media', 'webrtc', array()));
    $options = Q::take($config, array(
        'socketServerHost' => '',
        'socketServerPort' => null,
        'turnServers' => array(),
        'useTwilioTurn' => array(),
        'livestreaming' => array(),
        'globalLimits' => array(),
        'debug' => false
    ));
    extract($options);
    $socketServerHost = Q::ifset($config, 'socketServerHost', '');
    $socketServerHost = trim(str_replace('/(http\:\/\/) || (https\:\/\/)/', '', $socketServerHost), '/');
    if(!empty($socketServerHost) && !empty($socketServerPort)){
        $socketServer = $socketServerHost . ':' . $socketServerPort;
    } else {
        $socketServer = trim(str_replace('/(http\:\/\/) || (https\:\/\/)/', '', Q_Config::expect('Q', 'node', 'url')), '/');
    }

	$params = array_merge($_REQUEST, $params);
    $publisherId = Q::ifset($params, 'publisherId', null);
	$streamName = Q::ifset($params, 'streamName', null);
	$roomId = Q::ifset($params, 'roomId', null);
	$socketId = Q::ifset($params, 'socketId', null);
	$operatorSocketId = Q::ifset($params, 'operatorSocketId', null);
	$callDescription = Q::ifset($params, 'description', null);
	$resumeClosed = Q::ifset($params, 'resumeClosed', null);
	$relate = Q::ifset($params, 'relate', null);
	$content = Q::ifset($params, 'content', null);
    $writeLevel = Q::ifset($params, 'writeLevel', 23);
    $closeManually = Q::ifset($params, 'closeManually', null);
    $useRelatedTo = Q::ifset($params, 'useRelatedTo', null);
    $cmd = Q::ifset($params, 'cmd', null);

    if(Q_Request::slotName('data')) {
        if($cmd == 'closeStream') {
            //print_r($_REQUEST);die;
            Q_Valid::signature(true, $_REQUEST);
            $webrtcStream = Streams_Stream::fetch($publisherId, $publisherId, $streamName);
    
            if(!is_null($webrtcStream)) {
                //return Q_Response::setSlot('data', ['publisherId' => $publisherId, 'streamName' => get_class_methods($webrtcStream)]);
                $webrtcStream->close($publisherId);
                $webrtcStream->changed();
                //$webrtcStream->save();
            }
    
            return Q_Response::setSlot('data', ['cmd'=> $cmd, 'publisherId' => $publisherId, 'streamName' => $streamName, 'req' => $_REQUEST]);
        } else if($cmd == 'closeIfOffline') {
            Q_Valid::signature(true, $_REQUEST);

            $userIsOnline = Q::ifset($params, 'userIsOnline', false);
            $webrtcStream = Streams_Stream::fetch(null, $publisherId, $streamName);
    
            $streamWasClosed = false;
            if($userIsOnline === false || $userIsOnline === 'false' || $userIsOnline === 0 || $userIsOnline === '0') {
                $webrtcStream->close($publisherId);
                $webrtcStream->changed();
                //$webrtcStream->save();
                $streamWasClosed = true;
            }
    
            return Q_Response::setSlot('data', ['cmd'=> $cmd, 'streamWasClosed' =>  $streamWasClosed, 'userIsOnline' => $userIsOnline, 'publisherId' => $publisherId, 'streamName' => $streamName]);
        }

        return Q_Response::setSlot('data', 'unknown command');
    }

    $loggedInUser = Users::loggedInUser(true);
	$loggedInUserId = $loggedInUser->id;
	$publisherId = Q::ifset($params, 'publisherId', $loggedInUserId);
    if(Q_Request::slotName('makeCallCenterFromStream')) {
        // makeCallCenterFromStream means giving access to this stream for Users/hosts

        $webrtcStream = Streams_Stream::fetch($loggedInUserId, $publisherId, $streamName);

        if(!$webrtcStream->testAdminLevel('manage')) {
            $access = new Streams_Access();
            $access->publisherId = $publisherId;
            $access->streamName = $streamName;
            $access->ofContactLabel = 'Users/hosts';
            if (!$access->retrieve()) {
                $access->readLevel = Streams::$READ_LEVEL['max'];
                $access->writeLevel = Streams::$WRITE_LEVEL['max'];
                $access->adminLevel = Streams::$ADMIN_LEVEL['invite'];
                $access->save();
            }
        }
    
        return Q_Response::setSlot("makeCallCenterFromStream", 'done');
    } else if(Q_Request::slotName('closeIfOffline')) {
        if ($loggedInUser) {
            if(is_null($socketId)) {
                $webrtcStream = Streams_Stream::fetch(null, $publisherId, $streamName);
                $webrtcStream->close($publisherId);
                $webrtcStream->changed();
            } else {
                // check if any participants in the call are online
                Q_Utils::sendToNode(array(
                    "Q/method" => "Users/checkIfOnline",
                    "socketId" => $socketId,
                    "userId" => $publisherId,
                    "operatorSocketId" => $operatorSocketId,
                    "operatorUserId" => $loggedInUserId,
                    "handlerToExecute" => 'Media/callCenter',
                    "data" => [
                        "cmd" => 'closeIfOffline',
                        "publisherId" => $publisherId,
                        "streamName" => $streamName
                    ],
                ));
            }
            
        }
    
        return Q_Response::setSlot("closeIfOffline", 'done');
    } else if(Q_Request::slotName('acceptHandler')) {
        $waitingRoom = Q::ifset($params, 'waitingRoom', null);
        $liveShowRoom = Q::ifset($params, 'liveShowRoom', null);
        $callStatus = Q::ifset($params, 'callStatus', 'none');

        if(!$waitingRoom || !$liveShowRoom) {
            throw new Exception('waitingRoom and liveShowRoom are required');
        }

        $waitingRoomStream = Streams::fetchOne($loggedInUserId, $waitingRoom['publisherId'], $waitingRoom['streamName']);
        $liveShowRoomStream = Streams::fetchOne($loggedInUserId, $liveShowRoom['publisherId'], $liveShowRoom['streamName']);

        if(!$waitingRoomStream || !$liveShowRoomStream) {
            throw new Exception('Streams not found');
        }

        $status = $waitingRoomStream->getAttribute('status');

        //print_r($status);
        //print_r('---');
        //print_r($callStatus);die;
        if($status != $callStatus) {
            throw new Exception('Another manager is interviewing or already accepted this call');
        }

        $access = new Streams_Access();
        $access->publisherId = $liveShowRoom['publisherId'];
        $access->streamName = $liveShowRoom['streamName'];
        $access->ofUserId = $waitingRoom['publisherId'];
        if (!$access->retrieve()) {
            $access->readLevel = Streams::$READ_LEVEL['max'];
            $access->writeLevel = Streams::$WRITE_LEVEL['relate'];
            $access->adminLevel = Streams::$ADMIN_LEVEL['invite'];
            $access->save();
        }
    
        $waitingRoomStream->post($publisherId, array(
            'type' => 'Media/webrtc/accepted',
            'instructions' => [
                'msg' => 'Your call request was accepted'
            ]
        ));

        $waitingRoomStream->setAttribute('status', 'accepted');
        $waitingRoomStream->setAttribute('acceptedByUserId', $loggedInUserId);
        $waitingRoomStream->changed();
        //$waitingRoomStream->save();

        $liveShowRoomStream->post($publisherId, array(
            'type' => 'Media/webrtc/accepted',
            'instructions' => [
                'waitingRoom' => $waitingRoom,
                'byUserId' => $loggedInUserId
            ]
        ));

        return Q_Response::setSlot("acceptHandler", 'request sent');
    } else if(Q_Request::slotName('endOrDeclineCallHandler')) {
        $waitingRoom = Q::ifset($params, 'waitingRoom', null);
        $liveShowRoom = Q::ifset($params, 'liveShowRoom', null);
        $action = Q::ifset($params, 'action', null);
        $callStatus = Q::ifset($params, 'callStatus', 'none');

        if(!$waitingRoom || !$liveShowRoom || !$action) {
            throw new Exception('$waitingRoom, $liveShowRoom and $action are required');
        }

        $waitingRoomStream = Streams::fetchOne($loggedInUserId, $waitingRoom['publisherId'], $waitingRoom['streamName']);
        $liveShowRoomStream = Streams::fetchOne($loggedInUserId, $liveShowRoom['publisherId'], $liveShowRoom['streamName']);

        if(!$waitingRoomStream || !$liveShowRoomStream) {
            throw new Exception('Streams not found');
        }

        $status = $waitingRoomStream->getAttribute('status');

        if($status != $callStatus) {
            throw new Exception('Another manager already accepted, declined or ended this call');
        }

        $access = new Streams_Access();
        $access->publisherId = $liveShowRoom['publisherId'];
        $access->streamName = $liveShowRoom['streamName'];
        $access->ofUserId = $waitingRoom['publisherId'];
        if ($access->retrieve()) {
            $access->remove();
        }

        $instructions = [
            'immediate' => true, 
            'userId' => $waitingRoom['publisherId']
        ];
        $messageType = 'Media/webrtc/callEnded';
        if($action == 'endCall') {
            $messageType = 'Media/webrtc/callEnded';
            $instructions['msg'] = 'Call ended';
        } else if($action == 'declineCall') {
            $messageType = 'Media/webrtc/callDeclined';
            $instructions['msg'] = 'Your call request was declined';
        }
    
        $waitingRoomStream->post($publisherId, array(
            'type' => $messageType,
            'instructions' => $instructions
        ));

        $waitingRoomStream->setAttribute('status', $action == 'endCall' ? 'ended' : 'declined');
        $waitingRoomStream->setAttribute('endedOrDeclinedByUserId', $loggedInUserId);
        $waitingRoomStream->changed();
        //$waitingRoomStream->save();

        $liveShowRoomStream->post($publisherId, array(
            'type' => $messageType,
            'instructions' => [
                'waitingRoom' => $waitingRoom,
                'byUserId' => $loggedInUserId
            ]
        ));

        $waitingRoomStream->close($waitingRoom['publisherId']);

        return Q_Response::setSlot("endOrDeclineCallHandler", 'done');
    } else if (Q_Request::slotName('interviewHandler')) {
        $waitingRoom = Q::ifset($params, 'waitingRoom', null);
        $liveShowRoom = Q::ifset($params, 'liveShowRoom', null);
        $callStatus = Q::ifset($params, 'callStatus', 'none');

        if(!$waitingRoom || !$liveShowRoom) {
            throw new Exception('$waitingRoom, $liveShowRoom and $action are required');
        }

        $waitingRoomStream = Streams::fetchOne($loggedInUserId, $waitingRoom['publisherId'], $waitingRoom['streamName']);
        $liveShowRoomStream = Streams::fetchOne($loggedInUserId, $liveShowRoom['publisherId'], $liveShowRoom['streamName']);

        if(!$waitingRoomStream || !$liveShowRoomStream) {
            throw new Exception('Streams not found');
        }

        $status = $waitingRoomStream->getAttribute('status');

        if($status != $callStatus) {
            throw new Exception('Another manager already changed status of this call');
        }

        $waitingRoomStream->post($publisherId, array(
            'type' => 'Media/webrtc/interview',
            'instructions' => ['msg' => 'Operator started interview with you']
        ));

        $waitingRoomStream->setAttribute('status', 'interview');
        $waitingRoomStream->setAttribute('interviewedByUserId', $loggedInUserId);
        $waitingRoomStream->changed();
        //$waitingRoomStream->save();

        $liveShowRoomStream->post($publisherId, array(
            'type' => 'Media/webrtc/interview',
            'instructions' => [
                'waitingRoom' => $waitingRoom,
                'byUserId' => $loggedInUserId
            ]
        ));
        return Q_Response::setSlot("interviewHandler", 'done');
    } else if (Q_Request::slotName('markApprovedHandler')) {
        $waitingRoom = Q::ifset($params, 'waitingRoom', null);
        $liveShowRoom = Q::ifset($params, 'liveShowRoom', null);
        $isApproved = Q::ifset($params, 'isApproved', null);
        $isApproved = $isApproved == 'true' ? true : false;

        //var_dump($isApproved);die;
        if(!$waitingRoom || !$liveShowRoom) {
            throw new Exception('$waitingRoom, $liveShowRoom and $action are required');
        }

        $waitingRoomStream = Streams::fetchOne($loggedInUserId, $waitingRoom['publisherId'], $waitingRoom['streamName']);
        $liveShowRoomStream = Streams::fetchOne($loggedInUserId, $liveShowRoom['publisherId'], $liveShowRoom['streamName']);

        if(!$waitingRoomStream || !$liveShowRoomStream) {
            throw new Exception('Streams not found');
        }

        $waitingRoomStream->setAttribute('isApproved', $isApproved);
        $waitingRoomStream->setAttribute('isApprovedByUserId', $loggedInUserId);
        $waitingRoomStream->changed();
        //$waitingRoomStream->save();

        $liveShowRoomStream->post($publisherId, array(
            'type' => 'Media/webrtc/approved',
            'instructions' => [
                'waitingRoom' => $waitingRoom,
                'byUserId' => $loggedInUserId,
                'isApproved' => $isApproved
            ]
        ));
        return Q_Response::setSlot("markApprovedHandler", 'done');
    } else if (Q_Request::slotName('holdHandler')) {
        $waitingRoom = Q::ifset($params, 'waitingRoom', null);
        $liveShowRoom = Q::ifset($params, 'liveShowRoom', null);
        $onHold = Q::ifset($params, 'onHold', null);
        $onHold = $onHold == 'true' ? true : false;

        if(!$waitingRoom || !$liveShowRoom) {
            throw new Exception('$waitingRoom, $liveShowRoom and $action are required');
        }

        $waitingRoomStream = Streams::fetchOne($loggedInUserId, $waitingRoom['publisherId'], $waitingRoom['streamName']);
        $liveShowRoomStream = Streams::fetchOne($loggedInUserId, $liveShowRoom['publisherId'], $liveShowRoom['streamName']);

        if(!$waitingRoomStream || !$liveShowRoomStream) {
            throw new Exception('Streams not found');
        }

        $waitingRoomStream->post($publisherId, array(
            'type' => 'Media/webrtc/hold',
            'instructions' => [
                'msg' => 'Your call was put on hold...',
                'userId' => $waitingRoom['publisherId']
            ]
        ));

        $waitingRoomStream->setAttribute('onHold', $onHold);
        $waitingRoomStream->setAttribute('putOnHoldByUserId', $loggedInUserId);
        $waitingRoomStream->setAttribute('status', 'created');
        //$waitingRoomStream->changed();
        $waitingRoomStream->save();

        $liveShowRoomStream->post($publisherId, array(
            'type' => 'Media/webrtc/hold',
            'instructions' => [
                'waitingRoom' => $waitingRoom,
                'byUserId' => $loggedInUserId,
                'onHold' => $onHold
            ]
        ));
        return Q_Response::setSlot("holdHandler", 'done');
    } else {
        if (!$socketId) {
            throw new Exception('To continue you should be connected to the socket server.');
        }

        if($useTwilioTurn) {
            try {
                $turnCredentials = Media_WebRTC::getTwilioTurnCredentials();
                $turnServers = array_merge($turnServers, $turnCredentials);
            } catch (Exception $e) {
            }
        }
    
        $response = array(
            'socketServer' => $socketServer,
            'turnCredentials' => $turnServers,
            'debug' => $debug,
            'options' => array(
                'livestreaming' => $livestreaming,
                'limits' => $globalLimits
            )
        );
    
        $webrtcStream = null;
        if(!empty($useRelatedTo) && !empty($useRelatedTo["publisherId"]) && !empty($useRelatedTo["streamName"]) && !empty($useRelatedTo["relationType"])) {
    
            $webrtcStream = Media_WebRTC::getRoomStreamRelatedTo($useRelatedTo["publisherId"], $useRelatedTo["streamName"], null, null, $useRelatedTo["relationType"], $resumeClosed);
    
            if(is_null($webrtcStream)) {
                $webrtcStream = Media_WebRTC::getOrCreateRoomStream($publisherId, $roomId, $resumeClosed, ['writeLevel' => $writeLevel]);
            }
    
        } else {
            $webrtcStream = Media_WebRTC::getOrCreateRoomStream($publisherId, $roomId, $resumeClosed, ['writeLevel' => $writeLevel]);
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
        /*if (!empty($relate["publisherId"]) && !empty($relate["streamName"]) && !empty($relate["relationType"])) {
            // if calls unavailable, throws exception
            Streams::checkAvailableRelations($publisherId, $relate["publisherId"], $relate["streamName"], $relate["relationType"], array(
                "postMessage" => false,
                "throw" => true,
                "singleRelation" => true
            ));
        }*/
    
        if ($resumeClosed !== null) {
            $response['stream']->setAttribute("resumeClosed", $resumeClosed);
        }
    
        if ($closeManually !== null) {
            $response['stream']->setAttribute("closeManually", $closeManually);
        }
    
        if ($callDescription !== null) {
            $response['stream']->content = $callDescription;
        }
    
        if($socketId !== null) {
            $response['stream']->setAttribute("socketId", $socketId);
        }
    
        $response['stream']->join();
    
        $response['stream']->setAttribute('status', 'created');

        $response['stream']->changed($publisherId);
        $response['stream']->save(false, true, true);


        if (!empty($relate["publisherId"]) && !empty($relate["streamName"]) && !empty($relate["relationType"])) {
            $callCenterStream = Streams_Stream::fetch($loggedInUserId, $relate["publisherId"], $relate["streamName"]);
            $refetchedStream = Streams_Stream::fetch($callCenterStream->fields['publisherId'],  $webrtcStream->fields["publisherId"],  $webrtcStream->fields["name"], ['refetch' => true]);

            //var_dump($callCenterStream->testAdminLevel('manage'));die;
            if($response['stream']->testWriteLevel('suggest')) {
                $response['stream']->relateTo((object) array(
                    "publisherId" => $relate["publisherId"],
                    "name" => $relate["streamName"]
                ), $relate["relationType"], $callCenterStream->fields['publisherId'], array(
                    "inheritAccess" => true, 
                    "weight" => time(),
                    "ignoreCache" => true
                ));
            } else {
                throw new Exception("You don't have permission to create a call.");
            }
        }    
    
        // close created stream when user is disconnected
        $sessionId = Q_Session::id();
    
        if ($loggedInUser) {
            Q_Utils::sendToNode(array(
                "Q/method" => "Users/addEventListener",
                "sessionId" => $sessionId,
                "socketId" => $socketId,
                "userId" => $loggedInUserId,
                "eventName" => 'disconnect',
                "handlerToExecute" => 'Media/callCenter',
                "data" => [
                    "cmd" => 'closeStream',
                    "publisherId" => $response['stream']->publisherId,
                    "streamName" => $response['stream']->name
                ],
            ));
        }
    
        return Q_Response::setSlot("room", $response);
    }
    
}