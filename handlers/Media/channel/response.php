<?php
function Media_channel_response($params)
{
	$currentUser = Users::loggedInUser();
	$text = Q_Text::get('Media/content');
	$channelsColumn = Q::event('Media/channels/response/column');
	Media::$columns = array(
		'channels' => array(
			'title' => $text['Channels'],
			'column' => $channelsColumn,
			'columnClass' => 'Media_column_channels'
		)
	);

	$uri = Q_Dispatcher::uri();
	$publisherId = Q::ifset($uri, 'publisherId', null);
	if (!$publisherId) {
		// Reached via some app's own pretty-URL route (e.g. Fans' /john or
		// /ebfydzou — see Fans/channelUsernameExists, config/app.json) —
		// whichever app-level route condition matched this already
		// confirmed the segment resolves to a real user before the route
		// was even allowed to match. Resolved again here (not passed
		// through from that guard) because Qbix's route-matching condition
		// event can only accept or reject a match — it has no way to
		// rewrite the matched field values the dispatcher ultimately sees,
		// so the real lookup has to happen in the handler either way. This
		// action itself stays app-agnostic: any app can point its own
		// "usernameOrId"-producing route here without Media needing to
		// know about it.
		$usernameOrId = Q::ifset($uri, 'usernameOrId', null);
		if ($usernameOrId) {
			$publisherId = Users::userIdFromUsernameOrId($usernameOrId);
		}
	}
	if (!$publisherId) {
		$publisherId = Q::ifset($currentUser, 'id', null);
	}

	if ($publisherId) {
		$stream = Streams::fetchOne(null, $publisherId, "Media/channel/".Q::ifset($uri, 'channelId', 'main'), true);
		$channelColumn = Q::event('Media/channel/response/column', compact("stream"));
		Media::$columns['channel'] = array(
			'title' => $stream->title,
			'column' => $channelColumn,
			'columnClass' => 'Media_column_channel'
		);
		Q_Response::setSlot('title', $stream->title);
		Q_Response::setSlot('column', $channelColumn);
	}

	if (Q_Request::slotName('content')) {
		$content = Q::view('Media/content/columns.php');
		Q_Response::setSlot('content', $content);
	}
	return true;
}