<?php

/**
 * View for the Media/control page — the private host/guest control panel.
 * Rendered inside the app layout (nav bar, etc. remain visible).
 * Activates the Media/presentation/commands tool.
 */

$toolAttrs = Q_Html::attributes(array(
    'data-publisherId'       => $publisherId,
    'data-streamName'        => $streamName,
    'data-isHost'            => $isHost ? 'true' : 'false',
    'data-lang'              => $lang,
    'data-screenUrl'         => $screenUrl,
    'data-toolPublisherId'   => $toolPublisherId,
    'data-toolStreamName'    => $toolStreamName,
    'data-writeLevel'        => $writeLevel,
));

?>
<div id="Media_presentation_commands_page">
    <?php echo Q::tool('Media/presentation/commands', array(
        "publisherId" => $publisherId,
        "streamName" => $streamName,
        "isHost" => $isHost ? 'true' : 'false',
        "lang" => $lang,
        "screenUrl" => $screenUrl,
        "toolPublisherId" => $toolPublisherId,
        "toolStreamName" => $toolStreamName,
        "writeLevel" => $writeLevel
    )) ?>
</div>
