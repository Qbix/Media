<?php

/**
 * Subscribe or unsubscribe from livestream notifications on a stream.
 *
 * @param {array} $params
 * @param {string} $params.publisherId Required.
 * @param {string} $params.streamName Required.
 * @param {string} $params.action Required. "subscribe" or "unsubscribe"
 */
function Media_livestreamSubscription_post($params)
{
	$r = array_merge($_REQUEST, $params);
	Q_Valid::requireFields(array('action', 'publisherId', 'streamName'), $r, true);

	$action = $r['action'];
	$publisherId = $r['publisherId'];
	$streamName = $r['streamName'];
	$user = Users::loggedInUser(true);

	$stream = Streams_Stream::fetch($user->id, $publisherId, $streamName, true);
	$participant = $stream->getParticipant();
	$subscription = false;

	$livestreamTypes = array(
		'Media/livestream/started',
		'Media/livestream/stopped'
	);

	if ($action === 'subscribe') {
		if ($participant && $participant->subscribed === 'yes') {
			$subscription = $stream->subscription();
			if (!$subscription) {
				throw new Q_Exception("User is subscribed but has no subscription record");
			}
			$filters = json_decode($subscription->filter, true);
			$filters['types'] = array_values(array_unique(
				array_merge($filters['types'], $livestreamTypes)
			));
			$subscription->filter = Q::json_encode($filters);
			$subscription->save();
		} else {
			$participant = $stream->subscribe(array(
				'filter' => array('types' => $livestreamTypes)
			));
			$subscription = $stream->subscription();
		}
	} else {
		$going = $participant ? $participant->getExtra('going') : null;
		if ($going === 'yes') {
			$subscription = $stream->subscription();
			if (!$subscription) {
				throw new Q_Exception("User is subscribed but has no subscription record");
			}
			$filters = json_decode($subscription->filter, true);
			$filters['types'] = array_values(array_diff(
				$filters['types'], $livestreamTypes
			));
			$subscription->filter = Q::json_encode($filters);
			$subscription->save();
		} else {
			$stream->unsubscribe();
			$participant = $stream->getParticipant();
			$subscription = $stream->subscription();
		}
	}

	Q_Response::setSlot('stream', $stream);
	Q_Response::setSlot('subscription', $subscription);
	Q_Response::setSlot('participant', $participant);
}