<?php

function Media_clip_response_column(&$params, &$result)
{
	$url = Q_Request::url();
	$stream = $params['stream'];
	$title = $stream->title;
	$allAttributes = $stream->getAllAttributes();
	$parts = explode('/', $episodeName = $stream->name);
	$episodeName = implode('/', array_slice($parts, 0, -1));

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

	Q_Response::setCommonMetas(compact(
		'title', 'description', 'keywords', 'image', 'url'
	));

	Q_Response::setSlot('title', $title);
	Q_Response::addStylesheet("{{Media}}/css/columns/episode.css");

	// Load and parse transcript
	$transcriptFile = APP_FILES_DIR . DS . 'AI' . DS . 'transcriptions' . DS . "{$episodeName}.mp3.transcript";
	$transcript = '';

	if (file_exists($transcriptFile)) {
		$lines = file($transcriptFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
		$transcript .= "<table class=\"media-transcript\">\n";
		$transcript .= "<thead><tr><th>Time</th><th>Speaker</th><th>Transcript</th></tr></thead>\n<tbody>\n";

		foreach ($lines as $line) {
			if (preg_match('/^(\d{2}:\d{2}:\d{2})\s*\|\s*([A-Z]):\s*(.+)$/', $line, $matches)) {
				$time = Q_Html::text($matches[1]);
				$speaker = Q_Html::text($matches[2]);
				$text = Q_Html::text($matches[3]);
				$transcript .= "<tr><td>{$time}</td><td>{$speaker}</td><td>{$text}</td></tr>\n";
			}
		}

		$transcript .= "</tbody>\n</table>\n";
	}

	$clipParams = array_merge(array(
		'publisherId' => $stream->publisherId,
		'streamName' => $stream->name
	), Q::ifset($params, "clipParams", array()));

	$episodeParams = compact('transcript');

    Q_Response::setScriptData("Q.plugins.Media.clips.current", array(
        "publisherId" => $stream->publisherId,
        "streamName" => $stream->name
    ));

    return Q::view('Media/column/clip.php', compact('clipParams', 'episodeParams', 'transcript'));
}
