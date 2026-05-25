<?php
function Media_youtube_response($params)
{
    Q_Response::addScript('{{Media}}/js/pages/youtubeEpisodes.js');
	$text = Q_Text::get('Media/content');
	$clipsColumn = Q::event('Media/youtube/response/column');
	Media::$columns = array(
		'clips' => array(
			'title' => $text['Clips'],
			'column' => $clipsColumn,
			'columnClass' => 'Media_column_clips'
		)
	);

	if (Q_Request::slotName('content')) {
		$content = Q::view('Media/content/columns.php', $params);
		Q_Response::setSlot('content', $content);
		// the title column has been set
	}
	return true;
}