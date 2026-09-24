<?php
/**
 * Creates or publishes a Media/episode stream from a video uploaded to
 * Safecloud encrypted storage (see Media/videoUpload tool / Safecloud/upload
 * tool).
 *
 * Two modes, distinguished by whether $_REQUEST.streamName is present:
 *
 *  - CREATE (no streamName): called right after the Safecloud upload
 *    finishes, before the uploader has filled in title/description/
 *    categories/price/visibility. Creates the episode immediately as a
 *    draft (attributes.draft = true, attributes.visibility = 'private',
 *    readLevel = none) with just a filename-derived title, so the uploader
 *    already has a working share link and standalone-player link while
 *    filling in the rest of the form — but genuinely readable by nobody
 *    but the publisher yet (readLevel enforces this for real, not just a
 *    listing convention), and not related into Media/episodes,
 *    Streams/chats/main, or the uploader's channel.
 *
 *  - PUBLISH (streamName present): called when the uploader clicks Save on
 *    the details form. Updates the existing draft (or a previously
 *    published episode being edited — see Media/episodeEdit) with the
 *    final title/description/categories/price, clears the draft flag, and
 *    applies the chosen visibility (private/unlisted/public) — readLevel
 *    and every visibility-dependent relation (Media/episodes, the category
 *    search hub, the uploader's channel) are re-applied on EVERY publish
 *    call, not just the first, so changing an already-published episode's
 *    visibility later actually takes effect instead of only ever adding
 *    relations in. Streams/chats/main is related once, on the first
 *    draft->published transition only, regardless of visibility (it's
 *    discussion bookkeeping, not a content-discovery surface).
 *
 * @class HTTP
 * @method post
 * @param {array} [$_REQUEST] Parameters that can come from the request
 *   @param {string} [$_REQUEST.streamName] Existing episode's stream name —
 *     present means "publish/update", absent means "create a new draft".
 *   @param {string} [$_REQUEST.publisherId] Defaults to the logged-in user.
 *   @param {string} [$_REQUEST.title] Defaults to the uploaded file's name (create only)
 *   @param {string} [$_REQUEST.content] Optional description
 *   @param {string} [$_REQUEST.manifest] JSON-encoded Safecloud public manifest (create only)
 *   @param {string} [$_REQUEST.rootKey] Safecloud root decryption key, base64 (create only)
 *   @param {string} [$_REQUEST.videoThumbnail] "data:image/jpeg;base64,..." data URL
 *     of a frame grabbed client-side from the video (see Safecloud/upload's
 *     captureVideoThumbnail). Used as the episode's icon; falls back to the
 *     Media/episode type's default icon if empty or missing. (create only)
 *   @param {string} [$_REQUEST.categories] JSON-encoded array of bare interest
 *     names (e.g. "Bodybuilding") picked in the Streams/interests picker
 *     (see Media/videoUpload) — episodeForm.js keeps track of each one's
 *     parent category only to restore/highlight the picker, not for saving
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
 *   @param {string} [$_REQUEST.visibility] "private" | "unlisted" | "public"
 *     (publish/edit only — a freshly created draft is always "private"
 *     regardless of this param, until the first Save). Defaults to "public"
 *     if missing/invalid.
 * @return {void}
 */
function Media_dropVideo_post($params = array())
{
	$params = array_merge($_REQUEST, $params);
	$publisherId = Q::ifset($params, 'publisherId', Users::loggedInUser(true)->id);
	$streamName = Q::ifset($params, 'streamName', null);

	// "Delete video" for the upload form — lets the uploader abandon a
	// draft they haven't Saved yet (Media/episodeEdit's own "deleteVideo"
	// slot, in its own post.php, covers the already-published-episode
	// case). A separate slot on this SAME action, not a standalone route —
	// see Media/webrtc/post.php for the established pattern this follows.
	if (Q_Request::slotName('deleteVideo')) {
		Media::deleteEpisode($publisherId, $streamName, Users::loggedInUser(true));
		Q_Response::setSlot('deleteVideo', true);
		return;
	}

	// ── Which mechanisms this community currently allows for NEW uploads
	// (see Media/before/Q_responseExtras.php — the upload form only shows
	// fields matching this). Re-read fresh here, authoritatively, rather
	// than trusting whichever fields the client happened to submit — this
	// is what makes it safe to derive the per-minute price server-side
	// below instead of accepting a client-supplied one in the "both" case.
	$mechanisms = Q_Config::get('Media', 'episode', 'paymentMechanism', array('perStream', 'perMinute'));
	$hasStream = in_array('perStream', $mechanisms);
	$hasMinute = in_array('perMinute', $mechanisms);

	$categoriesJson = Q::ifset($params, 'categories', null);
	$categories = $categoriesJson ? json_decode($categoriesJson, true) : array();
	if (!is_array($categories)) {
		$categories = array();
	}
	$categories = array_values(array_filter(array_map('strval', $categories)));

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

	$visibility = _Media_dropVideo_visibility(Q::ifset($params, 'visibility', null));

	if ($streamName) {
		$episode = _Media_dropVideo_publish(
			$publisherId, $streamName, $params, $categories, $priceStream, $pricePerMinute, $visibility
		);
	} else {
		$episode = _Media_dropVideo_createDraft($publisherId, $params, $categories, $priceStream, $pricePerMinute);
	}

	Q_Response::setSlot('result', true);
	Q_Response::setSlot('stream', $episode->exportArray());
}

/**
 * Validates a visibility value from the client, defaulting to "public" —
 * never trust an unrecognized value into readLevel/relation logic below.
 * @return {string} "private" | "unlisted" | "public"
 */
function _Media_dropVideo_visibility($visibility)
{
	$allowed = array('private', 'unlisted', 'public');
	return in_array($visibility, $allowed, true) ? $visibility : 'public';
}

/**
 * CREATE branch — see Media_dropVideo_post's docblock.
 * @return {Streams_Stream}
 */
function _Media_dropVideo_createDraft($publisherId, $params, $categories, $priceStream, $pricePerMinute)
{
	$manifestJson = Q::ifset($params, 'manifest', null);
	$rootKey = Q::ifset($params, 'rootKey', null);
	$manifest = $manifestJson ? json_decode($manifestJson, true) : null;
	// Not nested under the "video" attribute on purpose — Media_after_
	// Streams_create_Media_episode reads video.duration (in seconds) to
	// decide whether to run YouTube-style auto-clip-segmentation, which
	// safecloud uploads deliberately opt out of (Protocol.md: the plain
	// manifest carries no duration, only the encrypted index track does).
	// Kept as its own top-level attribute purely so Media/episodeEdit can
	// re-derive a per-minute rate later without needing the rootKey to
	// decrypt anything.
	$videoDuration = floatval(Q::ifset($params, 'videoDuration', 0));

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
		// A draft is always genuinely Private, not just unlisted from the
		// clips page — readLevel 'none' means only the publisher (who
		// always has full access regardless of readLevel) can read it at
		// all, closing a real gap: before this, a draft's readLevel stayed
		// at the type's default (full/public) and only the *listing*
		// relate was skipped, so anyone who obtained/guessed a draft's
		// direct URL could already view it.
		'readLevel' => Streams::$READ_LEVEL['none'],
		'attributes' => array(
			'draft' => true,
			'visibility' => 'private',
			'video' => array(
				'source' => 'safecloud',
				'rootCid' => $rootCid
			),
			'videoDuration' => $videoDuration,
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

	return $episode;
}

/**
 * PUBLISH branch — see Media_dropVideo_post's docblock. Updates an existing
 * episode (draft or already-published — Media/episodeEdit reuses this same
 * path) with the final details. Visibility (private/unlisted/public) is
 * re-applied on every save, not just the first publish, so switching an
 * already-published episode back to Private or Unlisted later actually
 * takes it out of the places it was related into, not just skips relating
 * a new one in.
 * @return {Streams_Stream}
 */
function _Media_dropVideo_publish($publisherId, $streamName, $params, $categories, $priceStream, $pricePerMinute, $visibility)
{
	$user = Users::loggedInUser(true);
	$episode = Streams_Stream::fetch($user->id, $publisherId, $streamName, true);
	if (!$episode->testWriteLevel('edit')) {
		throw new Users_Exception_NotAuthorized();
	}

	$wasDraft = (bool) $episode->getAttribute('draft');

	$title = trim((string) Q::ifset($params, 'title', ''));
	if ($title !== '') {
		$episode->title = $title;
	}
	if (array_key_exists('content', $params)) {
		$episode->content = Q::ifset($params, 'content', '');
	}

	$episode->setAttribute('draft', false);
	$episode->setAttribute('visibility', $visibility);
	if ($wasDraft) {
		// Media/episode/preview.js reads this (falling back to
		// video.publishTime, which the YouTube-scrape path sets instead) to
		// show the upload date in the episode list — safecloud uploads never
		// set either, which is why "Streams_preview_episode_info_date_text"
		// was rendering empty. Only set on the draft->published transition,
		// not every edit, so a later Media/episodeEdit save doesn't bump it.
		$episode->setAttribute('publishTime', time());
	}
	$episode->setAttribute('categories', $categories);
	$episode->setAttribute('payment', array(
		'currency' => 'credits',
		'amount' => $priceStream,
		'perMinute' => $pricePerMinute
	));

	// Private = only the publisher can read at all (readLevel 'none' —
	// the publisher always has full access regardless). Unlisted/Public
	// both stay fully readable via direct link; what differs between them
	// is purely which places the episode gets related into, below.
	//
	// Direct property assignment, NOT ->set('readLevel', ...): Db_Row::set()
	// is a completely different, generic key-value tree store ($this->p, a
	// Q_Tree) used elsewhere in this codebase for arbitrary extra config —
	// it has nothing to do with this object's real readLevel COLUMN, so it
	// silently no-oped (never even marked the field modified) instead of
	// erroring, and every visibility change past the initial draft-creation
	// (which happens to go through Streams::create()'s own, correctly-
	// implemented handling of the readLevel option) had no effect at all.
	// Confirmed live: an episode saved as "Unlisted" kept its original
	// draft-time readLevel of 0 (Private) in the database untouched.
	$episode->readLevel = ($visibility === 'private')
		? Streams::$READ_LEVEL['none']
		: Streams::$READ_LEVEL['max'];

	$episode->save();

	$communityId = Users::communityId();
	$weight = time();

	// Site-wide clips listing — Public only.
	_Media_dropVideo_ensureRelation(
		$episode, $communityId, "Media/episodes", $episode->type,
		$visibility === 'public', $weight
	);

	// Category search hub — Public only. attributes.categories itself is
	// left untouched by visibility (so the creator's own chosen categories
	// keep displaying/restoring correctly in the picker regardless of
	// visibility) — this explicit per-category relate/unrelate is what
	// actually controls whether the episode is discoverable by category,
	// run unconditionally every save so it's also corrected on a
	// visibility-only change (categories attribute unchanged, so
	// Streams_Stream::syncRelations's own diff-based auto-sync — see the
	// Media/episode type's "syncRelations" config — would otherwise have
	// nothing to react to).
	if ($categories) {
		$hub = Streams::fetchOne('Streams', 'Streams', 'Streams/search/all', true);
		if ($hub) {
			foreach ($categories as $category) {
				_Media_dropVideo_ensureRelation(
					$episode, $hub->publisherId, $hub->name,
					'attribute/categories=' . $category,
					$visibility === 'public', $weight
				);
			}
		}
	}

	// Uploader's own channel — shown for Unlisted and Public (per this
	// app's chosen "Unlisted" semantics: hidden from the site-wide listing
	// and category browsing, but still visible on the creator's own
	// channel/profile), hidden for Private. Also what lets Media/clip.js's
	// joinClip() (which looks for a "Media/channel/*" relation) join a
	// viewer to it.
	Streams::fetchOneOrCreate($publisherId, $publisherId, 'Media/channel/main');
	_Media_dropVideo_ensureRelation(
		$episode, $publisherId, 'Media/channel/main', 'Media/episode',
		$visibility !== 'private', $weight
	);

	// Chat thread — bookkeeping for the episode's own discussion, not a
	// content-discovery surface, so unaffected by visibility. Only ever
	// related once, same as before, so its own relation weight/order isn't
	// touched on every subsequent edit.
	if ($wasDraft) {
		$episode->relateTo((object) array("publisherId" => $communityId, "name" => "Streams/chats/main"), $episode->type, $communityId, array(
			'skipAccess' => true,
			'weight' => $weight
		));
	}

	return $episode;
}

/**
 * Relates or unrelates $episode to/from a single (toPublisherId,
 * toStreamName, type) target so it matches $shouldBeRelated, without
 * disturbing an already-correct relation's weight (only a NEW relate call
 * sets $weight; nothing re-touches one that already exists).
 */
function _Media_dropVideo_ensureRelation($episode, $toPublisherId, $toStreamName, $type, $shouldBeRelated, $weight)
{
	$existing = Streams_RelatedTo::select()->where(array(
		"toPublisherId" => $toPublisherId,
		"toStreamName" => $toStreamName,
		"type" => $type,
		"fromPublisherId" => $episode->publisherId,
		"fromStreamName" => $episode->name
	))->limit(1)->fetchDbRow();

	if ($shouldBeRelated && !$existing) {
		$episode->relateTo((object) array("publisherId" => $toPublisherId, "name" => $toStreamName), $type, $toPublisherId, array(
			'skipAccess' => true,
			'weight' => $weight
		));
	} elseif (!$shouldBeRelated && $existing) {
		Streams::unrelate(
			$episode->publisherId, $toPublisherId, $toStreamName, $type,
			$episode->publisherId, $episode->name,
			array('skipAccess' => true)
		);
	}
}
