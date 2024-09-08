<?php
function Media_newFeed_response_column ($options = array()) {
	if (!Media::newFeedAuthorized()) {
		throw new Users_Exception_NotAuthorized();
	}

	$options = array_merge($_REQUEST, $options);
	$uri = Q_Dispatcher::uri();
	$options['publisherId'] = Q::ifset($options, 'publisherId', Q::ifset($uri, 'publisherId', null));

	$text = Q_Text::get('Media/content');
	$title = $text['newFeed']['Title'];

	$column = Q::tool('Media/feed/composer', $options);
	Media::$columns['newFeed'] = array(
		'title' => $title,
		'column' => $column
	);

	Q_Response::setSlot('title', $title);
	Q_Response::addStylesheet('{{Media}}/css/columns/feedComposer.css', 'Media');
	Q_Response::addScript('{{Media}}/js/columns/newFeed.js', 'Media');
	return $column;
}