<?php
function Media_after_Streams_message_Streams_closed ($params) {
	$stream = $params['stream'];

	if ($stream->type == "Media/feed") {
		// send message to feeds categories about feed closed
		$participatedCategories = Streams_Participant::select()->where(array(
			"streamName" => "Media/feeds",
			"userId" => $stream->publisherId,
			"state" => "participating"
		))->fetchDbRows();
		foreach ($participatedCategories as $participatedCategory) {
			Streams_Message::post($stream->publisherId, $participatedCategory->publisherId, $participatedCategory->streamName, array(
				'type' => 'Media/feed/closed',
				'instructions' => array("publisherId" => $stream->publisherId, "streamName" => $stream->name)
			), true);
		}
	}

	// remove all stream files
	$dir = preg_replace("/{{baseUrl}}/", APP_WEB_DIR, $stream->getAttribute("Q.file.url", ""));
	$dir = preg_replace("#".$stream->name.".+#", $stream->name, $dir);

	if (!is_dir($dir)) {
		return;
	}

	$files = new RecursiveIteratorIterator(
		new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
		RecursiveIteratorIterator::CHILD_FIRST
	);
	foreach ($files as $fileinfo) {
		$todo = ($fileinfo->isDir() ? 'rmdir' : 'unlink');
		$todo($fileinfo->getRealPath());
	}
	rmdir($dir);
}