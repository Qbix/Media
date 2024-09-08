<?php
function Media_feeds_response_column ($params) {
	$request = array_merge($_REQUEST, $params);
	$user = Users::loggedInUser();
	$limit = Q::ifset($request, 'limit', Q_Config::get('Media', 'pageSizes', 'feeds', 100));
	$offset = Q::ifset($request, 'offset', 0);
	$communityId = Q::ifset($request, 'communityId', Users::currentCommunityId());
	$columnsStyle = Q_Config::get('Communities', 'layout', 'columns', 'style', 'classic');

	$relations = Media::filterFeeds(@compact("communityId", "limit", "offset"));

	Q_Response::addScript('{{Media}}/js/columns/feeds.js', 'Media');
	Q_Response::addStylesheet('{{Media}}/css/columns/feeds.css', 'Media');
	Q_Response::addStylesheet('{{Media}}/css/columns/feedComposer.css', 'Media');
	Q_Response::addStylesheet('{{Media}}/css/tools/feedPreview.css', 'Media');

	$newFeedAuthorized = Media::newFeedAuthorized();
	Q_Response::setScriptData('Q.plugins.Media.newFeedAuthorized', $newFeedAuthorized);
	$text = Q_Text::get('Media/content');
	$column = Q::view('Media/column/feeds.php', @compact('user', 'relations', 'newFeedAuthorized', 'text', 'columnsStyle'));

	$title = $text['feeds']['Title'];
	$url = Q_Uri::url("Media/feeds");

	$controls = null;
	if ($columnsStyle == 'classic') {
		$showControls = Q_Config::get('Media', 'feeds', 'controls', true);
		$controls = $showControls ? Q::view('Media/controls/feeds.php') : null;
	}
	Media::$columns['feeds'] = array(
		'title' => $title,
		'column' => $column,
		'columnClass' => 'Communities_column_'.$columnsStyle,
		'controls' => $controls,
		'close' => false,
		'url' => $url
	);
	Q_Response::setSlot('controls', $controls);

	$communityName = Users::communityName();
	$description = Q::text($text['feeds']['Description'], array($communityName));
	$keywords = Q::text($text['feeds']['Keywords'], array($communityName));
	Q_Response::setMeta(array(
		array('attrName' => 'name', 'attrValue' => 'title', 'content' => $title),
		array('attrName' => 'property', 'attrValue' => 'og:title', 'content' => $title),
		array('attrName' => 'property', 'attrValue' => 'twitter:title', 'content' => $title),
		array('attrName' => 'name', 'attrValue' => 'description', 'content' => $description),
		array('attrName' => 'property', 'attrValue' => 'og:description', 'content' => $description),
		array('attrName' => 'property', 'attrValue' => 'twitter:description', 'content' => $description),
		array('attrName' => 'name', 'attrValue' => 'keywords', 'content' => $keywords),
		array('attrName' => 'property', 'attrValue' => 'og:keywords', 'content' => $keywords),
		array('attrName' => 'property', 'attrValue' => 'twitter:keywords', 'content' => $keywords),
		array('attrName' => 'property', 'attrValue' => 'og:url', 'content' => $url),
		array('attrName' => 'property', 'attrValue' => 'twitter:url', 'content' => $url),
		array('attrName' => 'property', 'attrValue' => 'twitter:card', 'content' => 'summary')
	));

	return $column;
}

