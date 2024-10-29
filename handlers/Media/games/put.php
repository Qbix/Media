<?php

/**
 * @module Media
 */

function Media_games_put($params = array())
{
	$params = array_merge($_REQUEST, $params);
    $publisherId = Q::ifset($params, 'publisherId', null);
	$streamName = Q::ifset($params, 'streamName', null);

    $loggedInUser = Users::loggedInUser(true);
	$loggedInUserId = $loggedInUser->id;

    if(Q_Request::slotName('changeTeam')) {
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
    }
    
}