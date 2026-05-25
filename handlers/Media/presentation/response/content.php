<?php
/**
 * Renders the content slot for the Media/presentation page.
 *
 * Route: presentation/:calendarId
 *        presentation/:communityId/:calendarId
 *
 * Query parameters:
 *   f=1   Fullscreen mode — strips the layout entirely (no nav, no footer,
 *         no chrome). The presentation tool fills 100vw × 100vh.
 *         Use this when screensharing, casting, or projecting.
 *         Equivalent to "naked page": echoes HTML and returns false.
 *
 * Normal mode (no f=1): returns the HTML string for embedding in the
 * app layout. The presentation tool still fills its container.
 *
 * @return {string|false} HTML for content slot, or false to skip layout (f=1)
 */
function Media_presentation_response_content()
{
    $uri         = Q_Request::uri();
    $calendarId  = $uri->calendarId;
    $communityId = isset($uri->communityId) ? $uri->communityId : null;
    $publisherId = $communityId ?: Q::app();
    $fullscreen  = Q_Request::get('f', false) === '1'
                || Q_Request::get('f', false) === true;

    if (!$calendarId) {
        throw new Q_Exception_RequiredField(array('field' => 'calendarId'));
    }

    $streamName = 'Media/presentation/' . $calendarId;

    try {
        $stream = Streams_Stream::fetch(null, $publisherId, $streamName, true);
    } catch (Exception $e) {
        throw new Q_Exception_MissingRow(array(
            'table'    => 'presentation stream',
            'criteria' => "$publisherId / $streamName"
        ));
    }

    if (!$stream->testReadLevel('content')) {
        throw new Users_Exception_NotAuthorized();
    }

    $isHost = $stream->testWriteLevel('edit');
    $lang   = Q_Request::language() ?: 'en-US';

    // Background gallery: enabled if the stream has a backgroundGallery attribute
    $bgGallery = $stream->getAttribute('backgroundGallery');

    Q_Response::addScript('{{Media}}/js/tools/presentation.js');
    Q_Response::addStylesheet('{{Media}}/css/tools/presentation.css');
    Q_Response::addStylesheet('{{Q}}/css/tools/cards.css');

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
