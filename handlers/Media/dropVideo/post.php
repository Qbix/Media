<?php
/**
 * Creates a Media/episode stream from a video already uploaded to
 * Safecloud encrypted storage (see Media/videoUpload tool / Safecloud/upload
 * tool). Relates it to the uploader's own Media/channel/main — relating to
 * the community's Media/episodes category (and Streams/chats/main) happens
 * automatically via the existing Media_after_Streams_create_Media_episode
 * hook for every Media/episode stream, regardless of how it was created.
 *
 * @class HTTP
 * @method post
 * @param {array} [$_REQUEST] Parameters that can come from the request
 *   @param {string} [$_REQUEST.title] Defaults to the uploaded file's name
 *   @param {string} [$_REQUEST.content] Optional description
 *   @param {string} $_REQUEST.manifest JSON-encoded Safecloud public manifest
 *   @param {string} $_REQUEST.rootKey Safecloud root decryption key (base64)
 *   @param {string} [$_REQUEST.videoThumbnail] "data:image/jpeg;base64,..." data URL
 *     of a frame grabbed client-side from the video (see Safecloud/upload's
 *     captureVideoThumbnail). Used as the episode's icon; falls back to the
 *     Media/episode type's default icon if empty or missing.
 *   @param {string} [$_REQUEST.categories] JSON-encoded array of "Category: Interest"
 *     strings picked in the Streams/interests picker (see Media/videoUpload)
 *   @param {string} [$_REQUEST.priceStream] One-time full-episode price, in credits.
 *     0 or absent means free (default taken from Media.episode.payment.amount config).
 *     Ignored entirely when Media.episode.paymentMechanism is perMinute-only.
 *   @param {string} [$_REQUEST.pricePerMinute] Price per minute watched, in credits.
 *     Only used directly when Media.episode.paymentMechanism is perMinute-only;
 *     when both mechanisms are enabled, the per-minute price is instead derived
 *     server-side from priceStream/videoDuration (see $_REQUEST.allowPerMinute)
 *     and this value is ignored — the client never gets to set it directly in
 *     that case, exactly so it can't be tampered with independently of the price
 *     the creator actually set.
 *   @param {string} [$_REQUEST.allowPerMinute] "1" if the creator checked
 *     "also allow per-minute" (both-mechanisms case only)
 *   @param {string} [$_REQUEST.videoDuration] Video length in seconds, used with
 *     priceStream to derive the per-minute rate (both-mechanisms case only)
 * @return {void}
 */
function Media_dropVideo_post($params = array())
{
	$params = array_merge($_REQUEST, $params);
	$publisherId = Q::ifset($params, 'publisherId', Users::loggedInUser(true)->id);

	$manifestJson = Q::ifset($params, 'manifest', null);
	$rootKey = Q::ifset($params, 'rootKey', null);
	$manifest = $manifestJson ? json_decode($manifestJson, true) : null;

	if (empty($manifest) || empty($rootKey)) {
		throw new Q_Exception_RequiredField(array('field' => 'manifest/rootKey'));
	}

	$title = trim((string) Q::ifset($params, 'title', ''));
	if ($title === '') {
		$title = Q::ifset($manifest, 'name', 'Untitled Episode');
	}

	$rootCid = Q::ifset($manifest, 'rootCid', null);
	if (empty($rootCid)) {
		throw new Q_Exception_RequiredField(array('field' => 'manifest.rootCid'));
	}

	$categoriesJson = Q::ifset($params, 'categories', null);
	$categories = $categoriesJson ? json_decode($categoriesJson, true) : array();
	if (!is_array($categories)) {
		$categories = array();
	}
	$categories = array_values(array_filter(array_map('strval', $categories)));

	// Which mechanisms this community currently allows for NEW uploads (see
	// Media/before/Q_responseExtras.php — the upload form only shows fields
	// matching this). Read fresh here too, authoritatively, rather than
	// trusting whichever fields the client happened to submit — this is
	// what makes it safe to derive the per-minute price server-side below
	// instead of accepting a client-supplied one in the "both" case.
	$mechanisms = Q_Config::get('Media', 'episode', 'paymentMechanism', array('perStream', 'perMinute'));
	$hasStream = in_array('perStream', $mechanisms);
	$hasMinute = in_array('perMinute', $mechanisms);

	// Prices default to the community/app's configured defaults (which the
	// upload form itself already shows as the pre-filled field values) —
	// re-reading them here too means a tampered/omitted client field can't
	// silently make an episode free.
	$priceStreamInput = Q::ifset($params, 'priceStream', null);
	$priceStream = $hasStream
		? (is_numeric($priceStreamInput)
			? max(0, floatval($priceStreamInput))
			: floatval(Q_Config::get('Media', 'episode', 'payment', 'amount', 0)))
		: 0;

	if ($hasStream && $hasMinute) {
		// Per-minute isn't independently settable here — it's derived from
		// the full price and the video's own length, so a tampered client
		// field claiming a different rate (or a wildly wrong duration) can't
		// produce a per-minute price disconnected from the price the
		// creator actually set for the whole episode.
		$allowPerMinute = filter_var(Q::ifset($params, 'allowPerMinute', false), FILTER_VALIDATE_BOOLEAN);
		$videoDuration = floatval(Q::ifset($params, 'videoDuration', 0));
		if ($allowPerMinute && $priceStream > 0 && $videoDuration > 0) {
			$durationMinutes = max(1, $videoDuration / 60);
			$pricePerMinute = round($priceStream / $durationMinutes, 2);
		} else {
			$pricePerMinute = 0;
		}
	} elseif ($hasMinute) {
		// perMinute-only mechanism: creator sets the rate directly.
		$pricePerMinuteInput = Q::ifset($params, 'pricePerMinute', null);
		$pricePerMinute = is_numeric($pricePerMinuteInput)
			? max(0, floatval($pricePerMinuteInput))
			: floatval(Q_Config::get('Media', 'episode', 'payment', 'perMinute', 0));
	} else {
		$pricePerMinute = 0;
	}

	// The full manifest (with its bindingProof signature/publicKey, which
	// alone is several hundred bytes serialized as per-byte objects) is far
	// larger than the 1023-character hard limit on Streams_Stream's own
	// attributes column (Base_Streams_Stream::beforeSet_attributes()) — it
	// can't be stored directly on the stream. Persist it in a file keyed by
	// rootCid instead (see Media::safecloudVideoWrite()); the stream's
	// "video" attribute only needs a tiny reference to find it again.
	Media::safecloudVideoWrite($rootCid, $manifest, $rootKey);

	$episode = Streams::create($publisherId, $publisherId, 'Media/episode', array(
		'title' => $title,
		'content' => Q::ifset($params, 'content', null),
		'attributes' => array(
			'video' => array(
				'source' => 'safecloud',
				'rootCid' => $rootCid
			),
			'categories' => $categories,
			// "amount" is the one-time full-episode price — this exact key
			// is what Assets_Credits::getPaymentsInfo() reads to compute
			// whether a user has paid enough (see Media/clip/response/column.php,
			// mirrors how Calendars prices Calendars/event). "perMinute" is
			// an extra key it ignores; reserved for the future per-minute feature.
			'payment' => array(
				'currency' => 'credits',
				'amount' => $priceStream,
				'perMinute' => $pricePerMinute
			)
		)
		// no 'icon' set -> falls back to the Media/episode type's default icon
	));

	// Use the client-captured video frame as the episode's icon, saved via
	// the same generic Q_Image::postNewImage() path every other stream icon
	// upload in this app goes through (see Streams/stream/post.php). Passing
	// a subpath of {splitId}/{episode->name}/icon/{time} makes Streams'
	// before/Q_Utils_canWriteToPath hook resolve it back to this stream and
	// the after/Q_image_save hook set+save its "icon" field automatically —
	// we just need to re-fetch afterward since that hook writes to a
	// separate PHP object instance, not this one.
	$videoThumbnail = Q::ifset($params, 'videoThumbnail', null);
	if ($videoThumbnail) {
		Q_Image::postNewImage(array(
			'icon' => array(
				'data' => $videoThumbnail,
				'path' => 'Q' . DS . 'uploads' . DS . 'Streams',
				'subpath' => Q_Utils::splitId($publisherId) . DS . $episode->name . DS . 'icon' . DS . time()
			),
			'save' => 'Media/episode'
		));
		$episode = Streams_Stream::fetch($publisherId, $publisherId, $episode->name, true);
	}

	// Relate to the uploader's own channel so it shows up there and so
	// Media/clip.js's joinClip() (which looks for a "Media/channel/*"
	// relation) can join the viewer to it. The community's Media/episodes
	// category and Streams/chats/main are already handled automatically by
	// Media_after_Streams_create_Media_episode for every Media/episode
	// stream, regardless of publisher.
	Streams::fetchOneOrCreate($publisherId, $publisherId, 'Media/channel/main');
	$episode->relateTo(
		(object) array('publisherId' => $publisherId, 'name' => 'Media/channel/main'),
		'Media/episode',
		$publisherId,
		array('skipAccess' => true, 'weight' => time())
	);

	Q_Response::setSlot('result', true);
	Q_Response::setSlot('stream', $episode->exportArray());
}
