<?php

if(!empty($layout)) {
    $url = preg_replace('/layout=\w*/', 'layout=' . ($layout == 'cards' ? 'list' : 'cards'), $url);
    setcookie('showsLayout', ($layout == 'cards' ? 'cards' : 'list') );
} else {
    $query = parse_url($url, PHP_URL_QUERY);

    $layout = Q::ifset($_COOKIE, 'showsLayout', 'cards');

    if (!is_null($query)) {
        $url .= ($layout == 'cards' ? '&layout=list' : '&layout=cards');
    } else {
        $url .= ($layout == 'cards' ? '?layout=list' : '?layout=cards');
    }
}

echo '<div class="Media_shows_layout"><a href="' . $url . '">' . ($layout == 'cards' ? '&#9776' : '&#8863') . '</a></div>';
?>

<?php if ($episodesStream->testWriteLevel("relate")) { ?>
    <button class="Q_button Media_newEpisode" name="addEpisode"><?php echo $NewEpisode ?></button>
<?php } ?>

<?php if (!empty(Q_Config::get("Media", "liveShow", null))) { ?>
<button class="Q_button Media_liveShow Q_pulsate"><?php echo $LiveShow ?></button>
<?php } ?>

<?php

echo Q::tool('Streams/related', array(
	"stream" => $episodesStream,
	"relationType" => 'Media/episode',
	"realtime" => true,
	"sortable" => false,
	"closeable" => false,
	"editable" => false,
	"infinitescroll" => true,
	"previewOptions" => array(
        //"closeable" => true,
        //"editable" => false,
        "expandable" => array("expanded" => false) // this for Media/episodes/preview
    ),
	"specificOptions" => array(
        "layout" => ($layout == 'list' ? 'list' : 'cards')
    ),

	"relatedOptions" => array(
        "limit" => $limit,
        "offset" => $offset,
        "withParticipant" => false
    )
), array(
	'classes' => 'Media_episodes' . ($layout == 'list' ? '' : ' Media_episodes_cards' )
)) ?>