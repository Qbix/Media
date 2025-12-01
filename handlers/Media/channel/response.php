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
	$publisherId = Q::ifset($uri, 'publisherId', Q::ifset($currentUser, 'id', null));

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