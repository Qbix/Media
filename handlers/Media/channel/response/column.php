<?php
function Media_channel_response_column(&$params, &$result)
{
	$url = Q_Request::url();
	$stream = $params['stream'];
	$title = $stream->title;
	$description = $stream->content;
	$keywords = $stream->getAttribute('keywords', '');
	if (is_array($keywords)) {
		$keywords = implode(', ', $keywords);
	}
	if (empty($keywords)) {
		$keywordsRows = Websites_Webpage::getKeywords($stream);
		if (!empty($keywordsRows)) {
			foreach ($keywordsRows as $keywordsRow) {
				$keywords .= $keywordsRow->title . ",";
			}
		}
	}
	$image = $stream->iconUrl("400");

	Q_Response::setCommonMetas(compact('title', 'description', 'keywords', 'image', 'url'));
	Q_Response::setSlot('title', $title);

	Q_Response::setScriptData("Q.plugins.Media.channels.current", array(
		"publisherId" => $stream->publisherId,
		"streamName" => $stream->name
	));

	return Q::view('Media/column/channel.php', array(
		'channelParams' => array(
			'publisherId' => $stream->publisherId,
			'streamName' => $stream->name
		)
	));
}
