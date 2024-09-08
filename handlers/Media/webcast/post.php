<?php

/**
 * @module Media
 */

/**
 * Used to start a new Media/webcast stream (a real time audio/video call)
 * @class HTTP Media webcast
 * @method post
 * @param {array} [$_REQUEST] Parameters that can come from the request
 *   @param {string} $_REQUEST.publisherId  Required. The id of the user to publish the stream.
 *   @param {string} $_REQUEST.roomId Pass an ID for the room from the client, may already exist
 *   @param {string} $_REQUEST.closeManually If true, stream is not closed automatically by node.js
 * @return {void}
 */
function Media_webcast_post($params = array())
{

    $nodeUrl = trim(preg_replace('/(http\:\/\/)||(https\:\/\/)/', '', Q_Config::get('Q', 'node', 'url', null)), '/');
    $nodeHost = explode(':', $nodeUrl)[0];
    $nodePort = Q_Config::get('Q', 'node', 'port', null);
    $nodeUrl = Q_Config::get('Q', 'node', 'url', null);
    $https = strpos($nodeUrl, 'https:');
    $socketServer = ($https !== false ? 'https://' : 'http://') . $nodeHost . ':' . ((int)$nodePort);

    $config = Q_Config::get('Media', 'webrtc', Q_Config::get('Media', 'webrtc', array()));

    $options = Q::take($config, array(
        'turnServers' => array(),
        'useTwilioTurn' => array(),
        'livestreaming' => array(),
        'debug' => false
    ));
    extract($options);

	$params = array_merge($_REQUEST, $params);
	$loggedInUserId = Users::loggedInUser(true)->id;
	$publisherId = Q::ifset($params, 'publisherId', $loggedInUserId);
	$roomId = Q::ifset($params, 'roomId', null);
	$resumeClosed = Q::ifset($params, 'resumeClosed', true);
	$relate = Q::ifset($params, 'relate', null);
	$content = Q::ifset($params, 'content', null);
    $writeLevel = Q::ifset($params, 'writeLevel', 10);
    $closeManually = Q::ifset($params, 'closeManually', null);


    $webcastStream = Media_Webcast::getOrCreateStream($publisherId, $roomId);

    if($useTwilioTurn) {
        try {
            $turnCredentials = $webcastStream->getTwilioTurnCredentials();
            $turnServers = array_merge($turnServers, $turnCredentials);
        } catch (Exception $e) {

        }
    }

    $response = array(
        'socketServer' => $socketServer,
        'turnCredentials' => $turnServers,
        'debug' => $debug,
        'options' => array(
            'livestreaming' => $livestreaming
        )
    );

    $response['stream'] = $webcastStream;
    $response['roomId'] = $webcastStream->name;


	if ($publisherId == $loggedInUserId) {
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
			"inheritAccess" => true,
			"weight" => time()
		));
	}

	if ($resumeClosed !== null) {
        $response['stream']->setAttribute("resumeClosed", $resumeClosed)->save();
	}
	if ($socketServer !== null) {
        $response['stream']->setAttribute("nodeServer", $socketServer)->save();
	}

	if ($closeManually !== null) {
        $response['stream']->setAttribute("closeManually", $closeManually)->save();
	}
    $response['stream']->join();

	Q_Response::setSlot("room", $response);
}