<div id="content">
<?= Q::tool('Media/episodeEdit', array(
	'jetUrl' => $jetUrl,
	'publisherId' => $publisherId,
	'streamName' => $streamName,
	'title' => $title,
	'content' => $content,
	'categories' => $categories,
	'posterUrl' => $posterUrl,
	'onSiteUrl' => $onSiteUrl,
	'videoDuration' => $videoDuration,
	'priceStream' => $priceStream,
	'pricePerMinute' => $pricePerMinute,
	'allowPerMinute' => $allowPerMinute,
	'manifest' => $manifest,
	'rootKey' => $rootKey
)) ?>
</div>
