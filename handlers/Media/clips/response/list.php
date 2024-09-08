<?php
function Media_clips_response_list ($params) {
	$userId = $params["userId"];

	$clips = Streams_Stream::select()->where(array(
		"publisherId" => $userId,
		"type" => "Media/clip",
		"closedTime" => null
	))->fetchDbRows();

	foreach ($clips as $clip) {
		if (preg_match("/\.\w+$/", $clip->icon)) {
			$iconUrl = $clip->iconUrl();
		} else {
			$iconUrl = $clip->iconUrl(50);
		}
	echo'<div class="Streams_preview_tool Media_feed_preview_tool Streams_preview Streams_preview_stream" style="position: relative;">'.
		'	<div class="Streams_preview_container Streams_preview_view Q_clearfix">'.
		'		<img alt="icon" class="Streams_preview_icon" src="'.$iconUrl.'">'.
		//'		<div class="Streams_preview_contents " style="width: 206px;"><h3 class="Streams_preview_title Streams_preview_view">'.$clip->title.'</h3></div>'.
		'	</div>'.
		'</div>';
	}
}

