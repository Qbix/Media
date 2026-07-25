<?php
function Media_after_Streams_message_Media_livestream_stop($params) {
		//if livestream was started in teleconference that is a part of online event, we should post Media/livestream/stopped message to the event stream
	$stream = $params['stream'];

	if ($stream->type == "Media/webrtc") {
		Media_WebRTC::postEventMessage($stream, 'livestreamStop');
	}
}