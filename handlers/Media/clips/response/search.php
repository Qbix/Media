<?php

function Media_clips_response_search($params = array()) {
    $queryString = Q::ifset($_GET, 'queryString', null);

    if(!isset($queryString)) {
         throw new Exception('queryString is required');
    }

    // 1. Establish a connection to the Streams database cluster
    $db = Streams::db();

    // 2. Safely escape your search term to prevent syntax injections
    $searchTerm = $db->quote($queryString);

    // Closed (offline) episodes should still be findable by their own
    // publisher -- e.g. so they can locate and manage a video that went
    // offline -- but stay excluded for everyone else, matching the /clips
    // listings' own closedTime behavior (see Streams_Stream::testReadLevel,
    // which already grants the publisher full access to their own closed
    // streams via publishedByFetcher).
    $user = Users::loggedInUser();
    $loggedInUserId = $user ? $user->id : null;
    // Title only -- streams_stream's shared "content" column is VARBINARY
    // (binary-safe storage used by many stream types across the whole
    // platform, not just Media/clip), and MySQL's FULLTEXT indexes don't
    // support binary columns, so only "title" (a plain VARCHAR, see
    // Media/0.4.5-Streams.mysql's own titleFulltext index) can be matched
    // without changing that shared column's type platform-wide.
    //
    // viewsCount: there's no simple per-stream view counter on the model,
    // so approximate it the same way Media::mostViewedEpisodes sources its
    // own ranking -- from Streams_Metrics, which has one row per
    // (userId, publisherId, streamName) that ever watched any portion of
    // the stream -- i.e. a distinct-viewer count. Read by Media/clip/search.js
    // and threaded into Media/episode/preview's "viewsCount" option for the
    // searchResultCard layout (see that option's own doc comment).
    // Closed episodes are visible in results only to their own publisher
    // (see the comment above) -- everyone else only ever matches the
    // closedTime IS NULL side of this.
    $visibilityExpr = $loggedInUserId
        ? "(closedTime IS NULL OR publisherId = " . $db->quote($loggedInUserId) . ")"
        : "closedTime IS NULL";

    $streamTable = Streams_Stream::table();
    $metricsTable = Streams_Metrics::table();
    $streams = Streams_Stream::select(
        "*, MATCH(title) AGAINST ($searchTerm) AS score, "
        . "(SELECT COUNT(DISTINCT mt.userId) FROM $metricsTable mt "
        . "WHERE mt.publisherId = $streamTable.publisherId AND mt.streamName = $streamTable.name) AS viewsCount"
    )
        ->where(new Db_Expression(
            "MATCH(title) AGAINST ($searchTerm)"
        ))
        ->where(array(
            // Episodes are stored with type "Media/episode" (see e.g.
            // Media::mostViewedEpisodes, every Streams/related relationType
            // elsewhere in this plugin) -- "Media/clip" was never a real
            // stream type, so this filter matched nothing at all regardless
            // of the search query.
            'type' => 'Media/episode'
        ))
        ->where(new Db_Expression($visibilityExpr))
        ->orderBy(new Db_Expression('score'), false)
        ->limit(100) //TODO: refactor into pagination/load more
        ->fetchDbRows();

    return Q_Response::setSlot("search", array(
        'result' => $streams,
    ));
}