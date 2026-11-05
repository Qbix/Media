<?php

/**
 * AJAX endpoint: the number of followers of a channel, for the "<N>
 * followers" line Media/channel.js shows in place of the full
 * Streams/participants list when Media.channel.showParticipants is
 * false (see that config's own doc comment in plugins/Media/config/
 * plugin.json). A "follower" is a participant with state=
 * 'participating' -- the same definition the follow feature itself
 * uses (Streams.Stream.prototype.subscribe()/unsubscribe() both set
 * this; only leave() sets state='left', which is what "Unfollow"
 * calls) -- muted followers (subscribed='no') still count, same as
 * subscribed ones; only those who left don't.
 *
 * Matches the existing Media_livestream_response_participatedUsersNumber
 * (plugins/Media/handlers/Media/livestream/response/
 * participatedUsersNumber.php) -- same fetchDbRows()+count() shape,
 * just with the state filter this one additionally needs.
 */
function Media_channel_response_followersCount($params = array())
{
	$params = array_merge($_REQUEST, $params);
	$publisherId = Q::ifset($params, 'publisherId', null);
	$streamName = Q::ifset($params, 'streamName', null);
	if (!$publisherId || !$streamName) {
		throw new Q_Exception_RequiredField(array('field' => 'publisherId/streamName'));
	}

	$participants = Streams_Participant::select()->where(array(
		'publisherId' => $publisherId,
		'streamName' => $streamName,
		'state' => 'participating'
	))->fetchDbRows(null, '', 'userId');

	$count = $participants ? count($participants) : 0;
	Q_Response::setSlot('followersCount', $count);
}
