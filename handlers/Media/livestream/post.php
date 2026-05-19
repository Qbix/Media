<?php

/**
 * @module Media
 */

/**
 * Creates streams that are needed for livestreaming via
 * @class HTTP Media livestream
 * @method post
 * @param {array} [$_REQUEST] Parameters that can come from the request
 *   @param {string} $_REQUEST.publisherId  Required. The id of the user to publish the stream.
 *   @param {string} $_REQUEST.roomId Pass an ID for the room from the client, may already exist
 *   @param {string} $_REQUEST.closeManually If true, stream is not closed automatically by node.js
 * @return {void}
 */
function Media_livestream_post($params = array())
{
	$params = array_merge($_REQUEST, $params);
	$loggedInUserId = Users::loggedInUser(true)->id;

	$streamName = Q::ifset($params, 'streamName', null);
    $publisherId = Q::ifset($params, 'publisherId', null);

	$response = [];

	if (Q_Request::slotName('createLivestreamStream')) {
		$publisherId = Q::ifset($params, 'publisherId', $loggedInUserId);
		$response['livestreamStream'] = Media_Livestream::createOrUpdateLivestreamStream($publisherId, $streamName, null);

		Q_Response::setSlot("createLivestreamStream", $response);
	} else if (Q_Request::slotName('updateReminders')) {
		$action = Q::ifset($params, 'action', null);
		$reminderTime = Q::ifset($params, 'reminderTime', null);

		if(!$publisherId || !$streamName || !$action || !$reminderTime) {
			throw new Exception("publisherId, streamName and action should be specified");
		}

		$response['reminders'] = Media_Livestream::updateReminders($publisherId, $streamName, $reminderTime, $action);

		Q_Response::setSlot("updateReminders", $response);
	} else if (Q_Request::slotName('setReminderOnLivestreamStart')) {
		$action = Q::ifset($params, 'action', 'unset');

		if(!$publisherId || !$streamName || !$action) {
			throw new Exception("publisherId, streamName and action should be specified");
		}

		$livestreamStream = Streams_Stream::fetch($publisherId, $publisherId, $streamName);

		if($action === 'set') {
			$livestreamStream->subscribe();
		} else {
			$livestreamStream->unsubscribe();
		}

		$response['success'] = true;
		Q_Response::setSlot("setReminderOnLivestreamStart", $response);
	} else if (Q_Request::slotName('createOrUpdateChannel')) {
		$liveStreamPublisherId = Q::ifset($params, 'liveStreamPublisherId', $loggedInUserId);
		$liveStreamName = Q::ifset($params, 'liveStreamName', null);
		$destinationObjectJson = Q::ifset($params, 'destinationObject', null);
		$remove = Q::ifset($params, 'remove', false);
		
		$response['destinationStream'] = Media_Livestream::createOrUpdateChannel($liveStreamPublisherId, $liveStreamName, $destinationObjectJson, $remove);

		Q_Response::setSlot("createOrUpdateChannel", $response);
		
	} else if(Q_Request::slotName('joinLivestreamAudience')) {
        if (!$loggedInUserId) {
            throw new Users_Exception_NotAuthorized();
        }
        $usersSocketId = Q::ifset($params, 'socketId', null);
      
        if(!$streamName || !$publisherId || !$usersSocketId) {
            throw new Exception('streamName, publisherId, usersSocketId are required');
        }

		Media_Livestream::joinAudience($publisherId, $streamName, $usersSocketId);       

		return Q_Response::setSlot("joinLivestreamAudience", $response);  
    } else if(Q_Request::slotName('leaveLivestreamAsListener')) {
        if (!$loggedInUserId) {
            throw new Users_Exception_NotAuthorized();
        }

        if(!$streamName || !$publisherId) {
            throw new Exception('streamName, publisherId are required');
        }

        Media_Livestream::leaveAudience($publisherId, $streamName);

		return Q_Response::setSlot("leaveLivestreamAsListener", $response);  
    } else if(Q_Request::slotName('data')) {
        //this is requests which were sent by node.js when some event was fired (client.on('disconnect'), for example)
        $cmd = Q::ifset($params, 'cmd', null);

        if($cmd == 'leaveStream') {
			if (!$streamName || !$publisherId) {
				throw new Exception('streamName, publisherId are required');
			}

			//this slot is used to handle disconnection of user (closing the tab) in livestream widget tool
			Media_Livestream::leaveAudience($publisherId, $streamName);

			return Q_Response::setSlot('data', ['cmd' => $cmd, 'publisherId' => $publisherId, 'streamName' => $streamName]);
		}
	}
}
