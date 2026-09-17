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
			'categories' => $categories
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
