<?php
function Media_after_Streams_create_Media_episode ($params) {
	$episode = $params['stream'];
	$video = $episode->getAttribute("video");
	$audio = $episode->getAttribute("audio");
	$duration = (int)Q::ifset($video, "duration", 0) * 1000;
	$weight = time();
	$communityId = Users::communityId();

	// relate to main chats category
	$episode->relateTo((object)array("publisherId" => $communityId, "name" => "Streams/chats/main"), $episode->type, $communityId, array(
		'skipAccess' => true,
		'weight' => time()
	));

	if (!$video || !$duration) {
		return;
	}

	$relatedOptions = Q_Config::get("Media", "episodes", "clips", array());
	foreach ($relatedOptions as $i => $relatedOption) {
		$times = array($relatedOption[0], $relatedOption[1]);

		foreach ($times as $j => $time) {
			if (!$time) {
				continue;
			}

			$times[$j] = (strtotime($time) - strtotime('TODAY')) * 1000;
		}

		// if duration less than clipStart, break
		if ($duration < $times[0]) {
			break;
		}

		// if duration more than clipStart but less than clipEnd, make clipEnd=duration
		if ($duration < $times[1]) {
			$times[1] = $duration;
			$relatedOption[1] = secondsToTime($duration);
		}

		$title = "Segment (".preg_replace("/^00:/", "", $relatedOption[0])." - ".preg_replace("/^00:/", "", $relatedOption[1]).")";

		// skip if stream with this title already exists
		$exists = Streams_Stream::select("srt.*, ss.*", "ss")->where(array(
			"ss.title" => $title,
			"ss.type" => "Media/clip",
			"srt.toPublisherId" => $episode->publisherId,
			"srt.toStreamName" => $episode->name,
			"srt.type" => "Media/clip",
		))->join(Streams_RelatedTo::table(true, "srt"), array(
			"srt.fromPublisherId" => "ss.publisherId",
			"srt.fromStreamName" => "ss.name"
		), "LEFT")->fetchDbRow();
		if ($exists) {
			continue;
		}

		Streams::create($episode->publisherId, $episode->publisherId, "Media/clip", array(
			"title" => $title,
			"icon" => $episode->icon,
			"attributes" => array(
				"video" => array(
					"url" => $video["url"],
					"clipStart" => $times[0],
					"clipEnd" => $times[1]
				)
			)
		), array('relate' => array(
			"publisherId" => $episode->publisherId,
			"streamName" => $episode->name,
			"type" => "Media/clip",
			"weight" => $weight + $i
		)));
	}
}

function secondsToTime ($seconds) {
	$seconds = $seconds/1000;

	$hours = floor($seconds/3600);
	$hours = $hours < 10 ? "0".$hours : $hours;

	$minutes = floor(($seconds - $hours * 3600)/60);
	$minutes = $minutes < 10 ? "0".$minutes : $minutes;

	$seconds = floor($seconds - $hours * 3600 - $minutes * 60);
	$seconds = $seconds < 10 ? "0".$seconds : $seconds;

	return $hours.":".$minutes.":".$seconds;
}