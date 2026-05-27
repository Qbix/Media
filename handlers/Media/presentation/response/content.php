<?php

function Media_presentation_response_content($params)
{
    $uri = Q_Dispatcher::uri();
    $calendarId = $uri->calendarId ? $uri->calendarId : 'main';
    $communityId = $uri->communityId ? $uri->communityId : Users::currentCommunityId(true);
    $calendar = array(
        'publisherId' => $communityId,
        'streamName' => "Calendars/calendar/$calendarId",
        'calendarId' => $calendarId
    );
    $fullscreen  = in_array(Q::ifset($_REQUEST, 'f', false), array('1', true), true);
    $publisherId = $communityId;
    $streamName = "Calendars/calendar/$calendarId";
    $stream = Streams_Stream::fetch(null, $publisherId, $streamName, true);
    $presentation = Q::take($_REQUEST, array('p', 's', 'nf'), Q::$null, array(
        'p' => 'publisherId',
        's' => 'streamName',
        'nf' => 'noFullscreen'
    ));
    if (!empty($_REQUEST['show'])) {
        $show = Q::take($_REQUEST['show'], array('p', 's'), Q::$null, array(
            'p' => 'publisherId',
            's' => 'streamName'
        ));
    }
    if (!$stream->testReadLevel('content')) {
        throw new Users_Exception_NotAuthorized();
    }
    $isHost = $stream->testWriteLevel('edit');
    $mode = Q::ifset($_REQUEST, 'm', 'broadcast');
    $values = array('b' => 'broadcast', 'p' => 'participant');
    $mode = Q::ifset($values, $mode, $mode);
    Q_Response::setScriptData('Q.Media.pages.presentation', @compact(
        'calendar', 'presentation', 'show', 'mode'
    ));
    Q_Response::addScript('{{Media}}/js/pages/presentation.js');
    Q_Response::addScript('{{Media}}/js/tools/presentation.js');
    Q_Response::addStylesheet('{{Media}}/css/tools/presentation.css');
    Q_Response::addStylesheet('{{Q}}/css/tools/cards.css');

    $langs   = Q_Request::languages();
    $lang = 'en-US';
    if ($langs) {
        $lang = $langs[0][0] . '-' . $langs[0][1];
    }
    $bgGallery = $stream->getAttribute('backgroundGallery');
    $vars = array(
        'publisherId'       => $publisherId,
        'streamName'        => $streamName,
        'calendarId'        => $calendarId,
        'communityId'       => $communityId,
        'isHost'            => $isHost,
        'lang'              => $lang,
        'streamTitle'       => $stream->title,
        'backgroundGallery' => $bgGallery ? Q::json_encode($bgGallery) : 'false',
        'controlUrl'        => Q_Uri::url("presentation/$calendarId/control"),
        'fullscreen'        => $fullscreen,
    );

    if ($fullscreen) {
        // Naked page — no layout chrome. Output immediately and tell Qbix
        // to skip the layout wrapper by returning false.
        // f=1 is the screenshare / projector / casting target.
        Q_Response::addStylesheet('{{Media}}/css/presentation-fullscreen.css');
        echo Q::view('Media/content/presentation.php', $vars);
        return false;
    }

    return Q::view('Media/content/presentation.php', $vars);
}