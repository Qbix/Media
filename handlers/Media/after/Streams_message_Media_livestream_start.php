<?php
function Media_after_Streams_message_Media_livestream_start($params) {
	//if livestream was started in teleconference that is a part of online event, we should post Media/livestream/started message to the event stream
	$stream = $params['stream'];

	$instruction = json_decode($params['message']->fields['instructions'], true);
	if ($stream->type == "Media/webrtc") {
		Media_WebRTC::postEventMessage($stream, 'livestreamStart', [
			'publisherId' => $instruction['livestreamPublisherId'],
			'streamName' => $instruction['livestreamStreamName']
		]);
	}
}