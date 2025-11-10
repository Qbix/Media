<?php
function Media_clip_response($params)
{
	$currentUser = Users::loggedInUser();
	$text = Q_Text::get('Media/content');
	$clipsColumn = Q::event('Media/clips/response/column');
	Media::$columns = array(
		'clips' => array(
			'title' => $text['Clips'],
			'column' => $clipsColumn,
			'columnClass' => 'Media_column_clips'
		)
	);
	Q_Response::addScript('{{Media}}/js/pages/clip.js');
	$uri = Q_Dispatcher::uri();
	$clipId = Q::ifset($uri, 'clipId', null);
	$episodeDate = Q::ifset($uri, 'episodeDate', '');
	$clipTime = Q::ifset($uri, 'clipTime', '');
	if ($episodeDate && $clipTime) {
		$clipId = "$episodeDate/$clipTime";
	}
	Q_Response::setScriptData("Q.plugins.Media.clip.selectedClipId", $clipId);

	if ($clipId) {
		$params['publisherId'] = $publisherId = Q::ifset($uri, 'publisherId', Users::currentCommunityId(true));
		if ($clipId === 'live') {
			$params['stream'] = $stream = Media::getCurrentLiveShow();
			$params['streamName'] = $streamName = $stream->name;

			// if user is Users/hosts, join him to Media/webrtc/live stream
			if ($currentWebrtc = Media::getCurrentLiveShowWebrtc()
			and $currentUser && (bool)Users::roles($publisherId, array("Users/hosts"), array(), $currentUser->id)) {
				Streams::join($currentUser->id, $currentWebrtc->publisherId, array($currentWebrtc->name), array(
					"noVisit" => true
				));
			}
		} else {
			// try to find stream among clips and episodes
			$params['stream'] = $stream = Streams_Stream::select()->where(array(
				"publisherId" => $publisherId,
				"name" => array("$clipId", "Media/clip/$clipId", "Media/episode/$clipId")
			))->fetchDbRow();
			if (empty($stream)) {
				throw new Exception("Clip not found");
			}
			$params['streamName'] = $streamName = $stream->name;
		}

		$clipColumn = Q::event('Media/clip/response/column', $params);
		Media::$columns['clip'] = array(
			'title' => $stream->title,
			'column' => $clipColumn,
			'columnClass' => 'Media_column_clip'
		);
		Q_Response::setSlot('title', $stream->title);
		Q_Response::setSlot('column', $clipColumn);
	}

	if (Q_Request::slotName('content')) {
		$content = Q::view('Media/content/columns.php', $params);
		Q_Response::setSlot('content', $content);
		// the title column has been set
	}
	return true;
}