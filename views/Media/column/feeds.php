<div class="Media_feeds_column" data-emptyFeeds="<?php echo empty($relations) ?>">
	<?php if ($columnsStyle == 'classic'): ?>
        <div id="Media_new_feed" class="Communities_top_controls">
            <input name="query" value="" type="text" id="Media_feedChooser_input" class="Media_feedChooser_input" placeholder="<?php echo $text['feeds']['filterFeeds'] ?>">
            <?php if ($newFeedAuthorized): ?>
                <button id="Media_new_feed_button" class="Q_button Q_aspect_when"><?php echo $text['feeds']['NewFeed']; ?></button>
            <?php endif; ?>
        </div>
	<?php endif; ?>

    <div class="Media_no_items">
        <?php echo $text['feeds']['NoneYet'] ?>
    </div>
    <div class="Media_feeds Communities_column_flex">
        <?php foreach ($relations as $relation) {
            echo Q::tool(array(
                "Streams/preview" => array(
                    "publisherId" => $relation->fromPublisherId,
                    "streamName" => $relation->fromStreamName,
                    "editable" => false,
                    "closeable" => true
                ),
                "Media/feed/preview" => array()
            ), array(
				'id' => Q_Utils::normalize($relation->fromPublisherId . ' ' . $relation->fromStreamName)
			));
        } ?>
    </div>
</div>