<?php
function Media_clips_response_column() {
	$communityId = Users::communityId();
	$category = Q::ifset($_GET, 'category', null);

	if ($category) {
		// Every Media/episode gets auto-related to this shared, platform-wide
		// index hub per its "categories" attribute (see the "syncRelations"
		// config on Media/episode + registerRelations() call in
		// Media/scripts/Media/0.4.4-Streams.sql.php) — same relationsOnly
		// listing tool as below, just pointed at a filtered relation type
		// instead of the community's whole Media/episodes category.
		$episodesStream = Streams::fetchOne('Streams', 'Streams', 'Streams/search/all', true);
		$relationType = 'attribute/categories=' . $category;
	} else {
		$episodesStream = Streams::fetchOne(null, $communityId, 'Media/episodes', true);
		$relationType = 'Media/episode';
	}

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
		'episodesStream', 'relationType', 'showLiveButton', 'limit', 'offset',
		'layout', 'url', 'category'
	));
}

