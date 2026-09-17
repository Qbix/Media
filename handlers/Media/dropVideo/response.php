<?php
/**
 * Upload a video file to Safecloud encrypted storage and turn it into a
 * Media/episode clip.
 *
 * URL: /dropVideo
 * Fills: content slot
 */
function Media_dropVideo_response($params)
{
	// Not auto-loaded app-wide — the Safecloud/demo page is the only other
	// place that loads these explicitly, so this page must too.
	Q_Response::addScript('{{Safecloud}}/js/Safecloud.js', 'head');
	Q_Response::addScript('{{Safecloud}}/js/Safecloud/DataTrees.js', 'head');
	Q_Response::addScript('{{Media}}/js/pages/dropVideo.js');

	$jetUrl = Q_Config::get('Safecloud', 'jetUrl', Q_Request::baseUrl());
	Q_Response::setScriptData('Q.plugins.Media.dropVideo.jetUrl', $jetUrl);

	$text = Q_Text::get('Media/content');
	Q_Response::setSlot('title', Q::ifset($text, 'dropVideo', 'PageTitle', 'Upload a video'));

	$content = Q::view('Media/content/dropVideo.php', compact('jetUrl'));
	Q_Response::setSlot('content', $content);
}
