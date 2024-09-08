<?php
function Media_newFeed_response_content() {
	$columns = array(
		'feeds' => Q::event('Media/feeds/response/column'),
		'newFeed' => Q::event('Media/newFeed/response/column')
	);
	$text = Q_Text::get('Media/content');
	Q_Response::setSlot('title', $text['newFeed']['Title']);
	return Q::view('Media/content/columns.php', @compact('user', 'columns'));
}