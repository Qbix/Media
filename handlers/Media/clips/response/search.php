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
    // Pass standard wildcard string, plus the complex expression under an explicit alias key
    $streams = Streams_Stream::select(
        "*, MATCH(title, content) AGAINST ($searchTerm) AS score"
    )
        ->where(new Db_Expression(
            "MATCH(title, content) AGAINST ($searchTerm)"
        ))
        ->where(array(
            'type' => 'Media/clip'
        ))
        ->orderBy(new Db_Expression('score'), false)
        ->limit(100) //TODO: refactor into pagination/load more
        ->fetchDbRows();

    return Q_Response::setSlot("search", array(
        'result' => $streams,
    ));
}