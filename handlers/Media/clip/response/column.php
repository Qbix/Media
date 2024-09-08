<?php

function Media_clip_response_column(&$params, &$result)
{
	$url = Q_Request::url();
	$stream = $params['stream'];
	$title = $stream->title;
	$allAttributes = $stream->getAllAttributes();
	$clipStart = Q::ifset($allAttributes, "video", "clipStart", null);
	$clipEnd = Q::ifset($allAttributes, "video", "clipEnd", null);
	// update title for clips
	if ($stream->type == "Media/clip" && $clipEnd) {
		$episode = Streams_Stream::select('ss.publisherId, ss.name, ss.title', 'ss')
		->join(Streams_relatedTo::table(true, 'srt'), array(
			'srt.toStreamName' => 'ss.name',
			'srt.toPublisherId' => 'ss.publisherId',
			'srt.type' => '"Media/clip"'
		))->where(array(
			'srt.fromPublisherId' => $stream->publisherId,
			'srt.fromStreamName' => $stream->name,
			'ss.type' => 'Media/episode'
		))->fetchDbRow();
		if ($episode) {
			$title = Media::formatTime($clipStart)."-".Media::formatTime($clipEnd)." ".$episode->title;
		}
	}
	$description = $stream->content;
	$keywords = $stream->getAttribute('keywords', '');
	if (empty($keywords)) {
		$keywordsRows = Websites_Webpage::getKeywords($stream);
		if (!empty($keywordsRows)) {
			foreach ($keywordsRows as $keywordsRow) {
				$keywords .= $keywordsRow->title.",";
			}
		}
	}
	$image = $stream->iconUrl("400");
	$video = Q::ifset($stream->getAttribute("video"), "url", null);
	Q_Response::setMeta(array(
		array('name' => 'name', 'value' => 'title', 'content' => $title),
		array('name' => 'property', 'value' => 'og:title', 'content' => $title),
		array('name' => 'property', 'value' => 'twitter:title', 'content' => $title),
		array('name' => 'name', 'value' => 'description', 'content' => $description),
		array('name' => 'property', 'value' => 'og:description', 'content' => $description),
		array('name' => 'property', 'value' => 'twitter:description', 'content' => $description),
		array('name' => 'name', 'value' => 'keywords', 'content' => $keywords),
		array('name' => 'property', 'value' => 'og:keywords', 'content' => $keywords),
		array('name' => 'property', 'value' => 'twitter:keywords', 'content' => $keywords),
		array('name' => 'name', 'value' => 'image', 'content' => $image),
		array('name' => 'property', 'value' => 'og:image', 'content' => $image),
		array('name' => 'property', 'value' => 'og:url', 'content' => $url),
		array('name' => 'property', 'value' => 'twitter:url', 'content' => $url),
		array('name' => 'property', 'value' => 'twitter:card', 'content' => 'summary'),
		array('name' => 'property', 'value' => 'twitter:image', 'content' => $image),
		array('name' => 'property', 'value' => 'og:type', 'content' => "video.episode")
	));

	if ($video) {
		Q_Response::setMeta(array(
			array('name' => 'property', 'value' => 'og:video', 'content' => $video)
		));
	}

	Q_Response::setSlot('title', $title);
	Q_Response::addStylesheet("{{Media}}/css/columns/clip.css");

	$clipParams = array_merge(array(
		'publisherId' => $stream->publisherId,
		'streamName' => $stream->name
	), Q::ifset($params, "clipParams", array()));
	return Q::view('Media/column/clip.php', compact('clipParams'));
}

