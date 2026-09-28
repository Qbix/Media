<div id="content">
<?= Q::tool('Media/episodeEdit', array(
	'jetUrl' => $jetUrl,
	'publisherId' => $publisherId,
	'streamName' => $streamName,
	'title' => $title,
	'content' => $content,
	'categories' => $categories,
	'visibility' => $visibility,
	'posterUrl' => $posterUrl,
	'onSiteUrl' => $onSiteUrl,
	'videoDuration' => $videoDuration,
	'priceStream' => $priceStream,
	'pricePerMinute' => $pricePerMinute,
	'allowPerMinute' => $allowPerMinute,
	'allowTeaser' => $allowTeaser,
	'manifest' => $manifest,
	'rootKey' => $rootKey
)) ?>
</div>
