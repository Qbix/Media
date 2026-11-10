<?php

/**
 * AJAX endpoint: the distinct-viewer count for a single Media/episode
 * stream, for the "<count> views" line at the top of the 'playerOnly'
 * layout's about card (see clip.js's own views/date insertion in its
 * refresh()). There's no simple per-stream view counter column to
 * just read off the stream itself -- same situation, same fix, as
 * Media_clips_response_search's own "viewsCount" field (plugins/Media/
 * handlers/Media/clips/response/search.php) and
 * Media::mostViewedEpisodes()'s own ranking query: COUNT(DISTINCT
 * userId) from Streams_Metrics, which has one row per (userId,
 * publisherId, streamName) that ever watched any portion of the
 * stream. Neither of those can be reused as-is for this (one's a
 * full-text title search across all episodes, the other a top-10
 * ranking query), so this is a small endpoint of its own.
 *
 * fetchAll(PDO::FETCH_ASSOC), not fetchDbRow(): a plain aggregate SELECT
 * like this one doesn't populate every real column Streams_Metrics
 * itself has, and fetchDbRow() tries to hydrate a full ORM row object
 * from the result -- confirmed live, it threw "Streams_Metrics does not
 * have userId field set" for exactly that reason. Media::mostViewedEpisodes()
 * hits the same kind of aggregate query and already uses fetchAll(PDO
 * ::FETCH_ASSOC) for it, not the ORM row fetchers, for the same reason.
 */
function Media_clip_response_viewsCount($params)
{
	$publisherId = Q::ifset($_REQUEST, 'publisherId', null);
	$streamName = Q::ifset($_REQUEST, 'streamName', null);
	if (!$publisherId || !$streamName) {
		throw new Q_Exception_RequiredField(array('field' => 'publisherId/streamName'));
	}

	$rows = Streams_Metrics::select("COUNT(DISTINCT userId) AS viewsCount")
		->where(array(
			'publisherId' => $publisherId,
			'streamName' => $streamName
		))
		->fetchAll(PDO::FETCH_ASSOC);

	$viewsCount = $rows ? (int)$rows[0]['viewsCount'] : 0;
	return Q_Response::setSlot('viewsCount', $viewsCount);
}
