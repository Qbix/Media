<?php if ($currentUser) {
	echo "<h2>{$channels['MyChannels']}</h2>";
	echo Q::tool('Streams/related', array(
		"stream" => $myChannels,
		"relationType" => 'Media/channel',
		"realtime" => true,
		"sortable" => false,
		"closeable" => true,
		"editable" => true,
		"previewOptions" => array(
			"closeable" => true,
			"editable" => true,
			"expandable" => array("expanded" => false) // this for Media/episodes/preview
		),
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
	), array('classes' => 'Media_channels Media_episodes_cards'));
} ?>
<?php
echo "<h2>{$channels['AllChannels']}</h2>";
echo Q::tool('Streams/related', array(
	"stream" => $allChannels,
	"relationType" => 'Media/channel',
	"realtime" => true,
	"sortable" => false,
	"closeable" => false,
	"editable" => false,
	"infinitescroll" => true,
	"previewOptions" => array(
        "closeable" => false,
        "editable" => false,
        "expandable" => array("expanded" => false) // this for Media/episodes/preview
    ),
	"relatedOptions" => array(
        "limit" => $limit,
        "offset" => $offset,
        "withParticipant" => false
    )
), array('classes' => 'Media_channels Media_episodes_cards')
) ?>