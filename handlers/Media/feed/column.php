<?php
/**
 * Shows the interface for an feed column
 *
 * @param {array} $_REQUEST 
 * @param {string} [$_REQUEST.feedId] Required. Last part of the streamName.
 * @optional
 * @return {string}
 */
function Media_feed_response_column ($params) {
	$feedId = Q::ifset($params, 'feedId', Communities::requestedId($params, 'feedId'));
	$publisherId = Users::currentCommunityId();
	$streamName = "Media/feed/".$feedId;
	$stream = $params['stream'] ?: Streams::fetchOne(null, $publisherId, $streamName);
	if (!$stream) {
		return;
	}

	Q_Response::setSlot('title', Q_Html::text($stream->title));
	
	$params = array_merge($params, array(
		'id:Streams_inplace-title' => array(
			'publisherId' => $stream->publisherId,
			'streamName' => $stream->name
		),
		'id:Streams_inplace-content' => array(
			'publisherId' => $stream->publisherId,
			'streamName' => $stream->name
		),
		'Streams/participants' => array(
			'publisherId' => $stream->publisherId,
			'streamName' => $stream->name,
			'invite' => array(
				'clickable' => true,
				'appUrl' => Q_Uri::url("Media/feed ".json_encode(array(
					'publisherId' => $stream->publisherId,
					'feedId' => $feedId
				)))
			)
		),
		'Q/timestamp' => array(
			'time' => $stream->getAttribute('startTime'),
			'capitalized' => true
		)
	));
	$params['show']['location'] = !empty($stream->getAttribute("location"));

	$column = Q::tool('Media/feed', $params);

	Q_Response::addScript('{{Media}}/js/columns/feeds.js', "Media");
	Q_Response::addScript('{{Media}}/js/columns/feed.js', "Media");
	Q_Response::addScript('{{Streams}}/js/tools/preview.js', "Media");
	Q_Response::addStylesheet('{{Media}}/css/columns/feeds.css');
	Q_Response::addStylesheet('{{Media}}/css/columns/feed.css');

	$url = Q_Uri::url("Media/feed feedId=$feedId");

	Media::$columns['feed'] = array(
		'name' => 'feed',
		'title' => $stream->title,
		'column' => $column,
		'close' => false,
		'columnClass' => 'Media_column_feed',
		'url' => $url
	);

	$stream->addPreloaded();

	return $column;
}