<div class="Media_channels_menuBox">
    <div class="Media_channels_menu" data-expanded="false"></div>
</div>
<div class="Media_channels_menu_items">
    <div data-action="all">All channels</div>
    <?php if ($currentUser) {?><div data-action="my">My channels</div><?php } ?>
    <div data-action="search">Search</div>
</div>

<?php
if ($currentUser) {
	echo Q::tool('Streams/related', array(
		"stream" => $myChannels,
		"relationType" => 'Media/channel',
		"realtime" => true,
		"sortable" => false,
		"closeable" => false,
		"editable" => false,
		"relatedOptions" => array(
			"limit" => $limit,
			"offset" => $offset,
			"withParticipant" => false
		),
		'creatable' => array(
			'Media/channel' => array(
				'title' => $channels['AddChannel']
			)
		)
	), array('classes' => 'Media_channels Media_channels_my'));
}

echo Q::tool('Streams/related', array(
	"stream" => $allChannels,
	"relationType" => 'Media/channel',
	"realtime" => true,
	"sortable" => false,
	"closeable" => false,
	"editable" => false,
	"infinitescroll" => true,
	"relatedOptions" => array(
        "limit" => $limit,
        "offset" => $offset,
        "withParticipant" => false
    )
), array('classes' => 'Media_channels')
) ?>