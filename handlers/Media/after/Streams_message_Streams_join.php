<?php
function Media_after_Streams_message_Streams_join($params) {
	$message = $params['message'];
	$stream = $params['stream'];

	if ($stream->type == "Media/webrtc") {
		Media_WebRTC::postEventMessage($stream, 'join');
	}
}