<?php
/**
 * View for the Media/control page — the private host/guest control panel.
 * Rendered inside the app layout (nav bar, etc. remain visible).
 * Activates the Media/presentation/control tool.
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
<div id="Media_presentation_control_page"
     class="Q_tool Media_presentation_control_tool"
     <?php echo $toolAttrs ?>>
</div>
<script>
Q.onReady.add(function () {
    Q.activate(document.getElementById('Media_presentation_control_page'));
}, 'Media/control');
</script>
