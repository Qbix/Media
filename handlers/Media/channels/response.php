<?php
function Media_channels_response($params)
{
	$text = Q_Text::get('Media/content');
	$channelsColumn = Q::event('Media/channels/response/column');
	Media::$columns = array(
		'channels' => array(
			'title' => $text['Channels'],
			'column' => $channelsColumn,
			'columnClass' => 'Media_column_channels'
		)
	);
	Q_Response::addScript('{{Media}}/js/pages/channels.js');

	if (Q_Request::slotName('content')) {
		$content = Q::view('Media/content/columns.php', $params);
		Q_Response::setSlot('content', $content);
		// the title column has been set
	}

	return true;
}