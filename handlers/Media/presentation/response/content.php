<?php

function Media_presentation_response_content($params)
{
    $uri = Q_Dispatcher::uri();
    $calendarId = $uri->calendarId ? $uri->calendarId : 'main';
    $calendar = array(
        'publisherId' => $uri->communityId ? $uri->communityId : Users::currentCommunityId(true),
        'streamName' => "Calendars/calendar/$calendarId",
        'calendarId' => $calendarId
    );
    $publisherId = $uri->communityId ? $uri->communityId : Users::currentCommunityId(true);
    $calendarId = $uri->calendarId ? $uri->calendarId : 'main';
    $streamName = "Calendars/calendar/$calendarId";
    Streams_Stream::fetch(null, $publisherId, $streamName, true);
    $presentation = Q::take($_REQUEST, array('p', 's', 'nf'), Q::$null, array(
        'p' => 'publisherId',
        's' => 'streamName',
        'nf' => 'noFullscreen'
    ));
    if ($_REQUEST['show']) {
        $show = Q::take($_REQUEST['show'], array('p', 's'), Q::$null, array(
            'p' => 'publisherId',
            's' => 'streamName'
        ));
    }
    $mode = Q::ifset($_REQUEST, 'm', 'broadcast');
    $values = array('b' => 'broadcast', 'p' => 'participant');
    $mode = Q::ifset($values, $mode, $mode);
    Q_Response::setScriptData('Q.Media.pages.presentation', @compact(
        'calendar', 'presentation', 'show', 'mode'
    ));
    Q_Response::addScript('{{Media}}/js/pages/presentation.js');

    return Q::view('Media/content/presentation.php', compact('calendarId'));
}