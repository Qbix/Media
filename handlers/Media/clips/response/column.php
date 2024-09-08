<?php
function Media_clips_response_column() {
	$communityId = Users::communityId();
	$episodesStream = Streams::fetchOne(null, $communityId, 'Media/episodes', true);
	$limit = Q_Config::get("Media", "pageSizes", "clips", 10);
	$offset = 0;
	$showLiveButton = false;
	$liveShow = Q_Config::get("Media", "liveShow", null);
	if ($liveShow) {
		$date_utc = new \DateTime("now", new \DateTimeZone($liveShow["timeZone"]));
		$hour = (int)$date_utc->format('H');
		if ((int)$liveShow["startTime"] <= $hour && (int)$liveShow["endTime"] > $hour) {
			$showLiveButton = true;
		}
	}

	$layout = Q::ifset($_GET, 'layout', null);
	$url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";

	return Q::view('Media/column/clips.php', @compact(
		'episodesStream', 'showLiveButton', 'limit', 'offset',
		'layout', 'url'
	));
}

