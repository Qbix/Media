<?php

function Media_meeting_response_content($params)
{
	Q_Response::addScript('{{Media}}/js/pages/meeting.js');
    /*$streamName = "Websites/article/123456";
    $publisherId = 'FTL';
    $communityId = 'FTL';
    $asUserId = 'FTL';
    $stream = Streams_Stream::fetch($publisherId, $publisherId, $streamName);


    Streams::relate(
        $asUserId,
        $communityId,
        'Websites/article/123',
        'Websites/announcements',
        $stream->publisherId,
        $stream->name
    );*/

	return Q::view("Media/content/meeting.php");
}

