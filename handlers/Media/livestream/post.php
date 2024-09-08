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
	$publisherId = Q::ifset($params, 'publisherId', $loggedInUserId);
	$streamName = Q::ifset($params, 'streamName', null);

	

	$response = [];

	if (Q_Request::slotName('createLivestreamStream')) {
		$webrtcStream = Streams_Stream::fetch($publisherId, $publisherId, $streamName);

		if (!$webrtcStream) {
			throw new Q_Exception("Please pass WebRTC stream's name and publisher id as params for this request.");
		}

		//get livestream stream that was created by the person who opened livestream editor in webrtc chat room
		$livestreamStreamRelation = Streams_RelatedTo::select()->where(array(
			"toPublisherId" => $publisherId,
			"toStreamName" => $streamName,
			"type" => "Media/webrtc/livestream"
		))->orderBy("weight", false)->limit(1)->fetchDbRow();


		if (is_null($livestreamStreamRelation) || empty($livestreamStreamRelation)) {
			//if there is no livestream stream found, create it and relate it to webrtc stream of room
			$livestreamStream = Streams::create($loggedInUserId, $loggedInUserId, 'Media/webrtc/livestream', ['readLevel' => 40, 'writeLevel' => 23, 'adminLevel' => 20]);
			$livestreamStream->subscribe();
			$livestreamStream->join(['subscribed' => true]);

			$livestreamStream->relateTo((object)array(
				"publisherId" => $publisherId,
				"name" => $streamName
			), "Media/webrtc/livestream", $loggedInUserId, array(
				"inheritAccess" => false,
				"weight" => time()
			));
		} else {
			$livestreamStream = Streams_Stream::fetch($loggedInUserId, $livestreamStreamRelation->fromPublisherId, $livestreamStreamRelation->fromStreamName);
		}

		if (is_null($livestreamStream)) {
			throw new Q_Exception("Something went wrong when fetching livestream stream");
		}

		$response['livestreamStream'] = $livestreamStream;

		Q_Response::setSlot("createLivestreamStream", $response);
	} else if (Q_Request::slotName('createOrUpdateChannel')) {
		$liveStreamPublisherId = Q::ifset($params, 'liveStreamPublisherId', $loggedInUserId);
		$liveStreamName = Q::ifset($params, 'liveStreamName', null);
		$destinationObjectJson = Q::ifset($params, 'destinationObject', null);
		$remove = Q::ifset($params, 'remove', false);

		$livestreamStream = Streams_Stream::fetch($loggedInUserId, $liveStreamPublisherId, $liveStreamName);
		
		if (is_null($livestreamStream) || is_null($destinationObjectJson)) {
			throw new Q_Exception("Something went wrong when fetching livestream stream");
		}

		$destinationObject = json_decode($destinationObjectJson, true);

		if(!isset($destinationObject['destId'])) {
			throw new Q_Exception("destId is missing");
		}

		$destinationStream = Streams_Stream::fetch($loggedInUserId, $liveStreamPublisherId, 'Media/livestream/dest/' . $destinationObject['destId']);
		
		if($remove && !is_null($destinationStream)) {			
            $destinationStream->close($loggedInUserId);
		} else {
			if (is_null($destinationStream)) {
				$destinationStream = Streams::create($loggedInUserId, $loggedInUserId, 'Media/livestream/dest', ['name' => 'Media/livestream/dest/' . $destinationObject['destId']]);
				$destinationStream->subscribe();
				$destinationStream->join(['subscribed' => true]);
		
				$destinationStream->relateTo((object)array(
					"publisherId" => $liveStreamPublisherId,
					"name" => $liveStreamName
				), "Media/livestream/dest", $loggedInUserId, array(
					"inheritAccess" => false,
					"weight" => time()
				));
			}
	
			$destinationStream->closedTime = null;
			$destinationStream->content = $destinationObjectJson;
			$destinationStream->changed();
	
		}
		
		$response['destinationStream'] = $destinationStream;

		Q_Response::setSlot("createOrUpdateChannel", $response);
		
	}
}
