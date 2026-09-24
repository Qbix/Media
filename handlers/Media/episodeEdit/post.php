<?php
/**
 * POST actions for the Media/episodeEdit page — a slot-dispatched handler
 * on the SAME action the page itself renders under (module=Media,
 * action=episodeEdit), not a standalone route of its own. See
 * Media/webrtc/post.php for the established pattern this follows:
 * Q_Request::slotName($name) checks which slot the client asked for in
 * this particular request, and dispatches accordingly.
 *
 * @class HTTP
 * @method post
 */
function Media_episodeEdit_post($params = array())
{
	$request = array_merge($_REQUEST, $params);

	if (Q_Request::slotName('deleteVideo')) {
		Q_Valid::requireFields(array('publisherId', 'streamName'), $request, true);
		$publisherId = Q::ifset($request, 'publisherId', null);
		$streamName = Q::ifset($request, 'streamName', null);

		Media::deleteEpisode($publisherId, $streamName, Users::loggedInUser(true));

		Q_Response::setSlot('deleteVideo', true);
		return;
	}
}
