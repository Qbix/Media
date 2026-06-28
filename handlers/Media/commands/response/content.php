<?php
/**
 * Renders the content slot for the Media/control page.
 * Embedded in the app layout (nav, footer, etc. stay visible).
 *
 * Route: presentation/:calendarId/control
 *        presentation/:communityId/:calendarId/control
 *
 * STREAM TOPOLOGY
 * ───────────────
 * Presentation stream (publisherId/Media/presentation/:calendarId):
 *   - Host:     writeLevel >= edit (30)   — full control
 *   - Guest:    writeLevel >= post (20)   — can make moves, post messages
 *   - Audience: writeLevel >= ephemeral (16) — reactions, live tool interactions
 *
 * Per-participant stream (asUserId/Media/presentation/:calendarId/participant):
 *   - Created via fetchOneOrCreate on join, related to presentation stream
 *   - publishedBy the participant themselves
 *   - inheritAccess from presentation stream
 *   - Used for: private notes, per-user CRDT state, guest-specific tool state
 *   - For the demo we keep this simple — main collaboration on presentation stream
 *
 * @return {string} HTML for the content slot
 */
function Media_commands_response_content()
{
    $uri         = Q_Request::uri();
    $calendarId  = $uri->calendarId;
    $communityId = isset($uri->communityId) ? $uri->communityId : null;
    $publisherId = $communityId ?: Q::app();

    if (!$calendarId) {
        throw new Q_Exception_RequiredField(array('field' => 'calendarId'));
    }

    $streamName = 'Media/presentation/' . $calendarId;
    $asUserId   = Users::loggedInUser(false, false);
    $asUserId   = $asUserId ? $asUserId->id : '';

    try {
        $stream = Streams_Stream::fetch($asUserId, $publisherId, $streamName, true);
    } catch (Exception $e) {
        throw new Q_Exception_MissingRow(array(
            'table'    => 'presentation stream',
            'criteria' => "$publisherId / $streamName"
        ));
    }

    // Guests need at least read access
    if (!$stream->testReadLevel('content')) {
        throw new Users_Exception_NotAuthorized();
    }

    $isHost = $stream->testWriteLevel('edit');
    $lang   = Q_Request::language() ?: 'en-US';

    // ── Tool backing stream ──────────────────────────────────────────────────
    // When a participant triggers a generated tool (e.g. chess board), we
    // create a Streams/chat stream published by that participant and relate
    // it to the presentation stream. The tool uses this stream for its messages
    // and ephemerals — no custom stream type needed for the demo.
    //
    // Relating to the presentation stream with inheritAccess:true means everyone
    // who has access to the presentation stream automatically has the same
    // access here — no per-user Streams_Access rows needed.
    //
    // This follows the standard Qbix pattern: relate + inheritAccess cascade
    // access from the category stream to the related stream automatically.
    //
    $toolStreamName    = null;
    $toolPublisherId   = $asUserId;

    if ($asUserId) {
        // One Streams/chat per participant per presentation session.
        // Name encodes both the session (calendarId) and the participant (asUserId).
        // Deterministic name → fetchOneOrCreate is idempotent on repeated loads.
        $tName = 'Streams/chat/' . $calendarId . '/' . $asUserId;

        $results = array();
        $toolStream = Streams::fetchOneOrCreate(
            $asUserId,
            $asUserId,
            $tName,
            array(
                'type'       => 'Streams/chat',
                'skipAccess' => false,
                'fields'     => array(
                    // Participant owns their stream — max on their own
                    'writeLevel' => Streams::$WRITE_LEVEL['max'],
                    'readLevel'  => Streams::$READ_LEVEL['content'],
                    'adminLevel' => Streams::$ADMIN_LEVEL['own'],
                    'title'      => 'Tool stream: ' . $calendarId,
                ),
                // Relate to the presentation stream + inherit its access.
                // Everyone who can access the presentation stream can access this too.
                'relate' => array(
                    'publisherId'   => $publisherId,
                    'streamName'    => $streamName,
                    'type'          => 'Media/presentation/tool',
                    'inheritAccess' => true,
                ),
            ),
            $results
        );

        if ($toolStream) {
            $toolStreamName  = $toolStream->name;
        }
    }

    // Pass vars into the page for JS tool activation
    Q_Response::setSlot('publisherId',           $publisherId);
    Q_Response::setSlot('streamName',            $streamName);
    Q_Response::setSlot('isHost',               $isHost);
    Q_Response::setSlot('toolPublisherId', $toolPublisherId);
    Q_Response::setSlot('toolStreamName',  $toolStreamName);
    Q_Response::setSlot('writeLevel',
        $stream->getWriteLevel()
    );

    // Scripts and styles needed by the control tool
    Q_Response::addScript('{{Media}}/js/tools/control.js');
    Q_Response::addStylesheet('{{Media}}/css/tools/control.css');
    Q_Response::addStylesheet('{{Q}}/css/tools/cards.css');

    return Q::view('Media/content/control.php', array(
        'publisherId'           => $publisherId,
        'streamName'            => $streamName,
        'calendarId'            => $calendarId,
        'communityId'           => $communityId,
        'isHost'               => $isHost,
        'lang'                  => $lang,
        'streamTitle'           => $stream->title,
        'screenUrl'             => Q_Uri::url("presentation/$calendarId"),
        'toolPublisherId' => $toolPublisherId,
        'toolStreamName'  => $toolStreamName,
        'writeLevel'            => $stream->getWriteLevel(),
    ));
}
