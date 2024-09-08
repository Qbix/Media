<?php

function Media_livestream_response_content($params)
{
	/*this probably should be moved to webcast handler*/
	$uri = Q_Dispatcher::uri();
	$publisherId =  Q::ifset($params, 'publisherId', Q::ifset($_REQUEST, 'publisherId', Q::ifset($uri, 'publisherId', null)));
	$livestreamId = Q::ifset($params, 'livestreamId', Q::ifset($_REQUEST, 'livestreamId', Q::ifset($uri, 'livestreamId', null)[count(Q::ifset($uri, 'livestreamId', null)) - 1]));

	$relatedFrom = Streams_RelatedFrom::select()
		->where(array(
			'fromPublisherId' => $publisherId,
			'fromStreamName' => "Media/webrtc/livestream/$livestreamId",
			'toStreamName LIKE ' => "Media/webrtc/%",
			'type' => 'Media/webrtc/livestream'
		));

	$relatedFrom->ignoreCache();

	$relatedFrom = $relatedFrom->fetchDbRows();
	Q_Response::setScriptData("Q.Media.livestream.publisherId", $publisherId);
	Q_Response::setScriptData("Q.Media.livestream.livestreamId", $livestreamId);
	if (count($relatedFrom) > 0) {
		Q_Response::setScriptData("Q.Media.livestream.roomPublisherId", $relatedFrom[0]->fields['toPublisherId']);
		Q_Response::setScriptData("Q.Media.livestream.roomStreamName", $relatedFrom[0]->fields['toStreamName']);
	}
	Q_Response::addScript('{{Media}}/js/pages/livestream.js?ts=' .time());

	return Q::view("Media/content/meeting.php");
}

