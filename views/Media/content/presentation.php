<?php
/**
 * View for the Media/presentation page.
 * Shared between normal layout mode and fullscreen mode (f=1).
 * In fullscreen mode this is the entire page body.
 */

$toolAttrs = Q_Html::attributes(array(
    'data-publisherId'       => $publisherId,
    'data-streamName'        => $streamName,
    'data-isHost'            => $isHost ? 'true' : 'false',
    'data-lang'              => $lang,
    'data-backgroundGallery' => $backgroundGallery,
    'data-controlUrl'        => $controlUrl,
));

?>
<?php if ($fullscreen): ?>
<!DOCTYPE html>
<html lang="<?php echo Q_Html::text($lang) ?>">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?php echo Q_Html::text($streamTitle) ?></title>
<?php Q_Response::printStylesheets() ?>
</head>
<body class="Media_presentation_fullscreen_body">
<?php endif ?>

<div id="Media_presentation_page"
     class="Q_tool Media_presentation_tool<?php echo $fullscreen ? ' Media_presentation_fullscreen' : '' ?>"
     <?php echo $toolAttrs ?>>
</div>
<script>
Q.onReady.add(function () {
    Q.activate(document.getElementById('Media_presentation_page'));
}, 'Media/presentation');
</script>

<?php if ($fullscreen): ?>
<?php Q_Response::printScripts() ?>
</body>
</html>
<?php endif ?>
