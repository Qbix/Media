<?php
/**
 * Lets an episode's creator edit its title/description/categories/price —
 * the same Media/episodeForm UI Media/videoUpload's step 2 uses, pre-filled
 * from the episode's saved attributes. Reached from the "Edit video" button
 * Media/clip.js shows under the video player, creator-only.
 *
 * URL: /clip/:publisherId/:clipId/edit
 * Fills: content slot
 */
function Media_episodeEdit_response($params)
{
	if (!Q_Request::slotName('content')) {
		// An AJAX request for some other slot (e.g. episodeEdit/post.php's
		// "deleteVideo") doesn't carry :clipId in the URI the way the page's
		// own GET route does — nothing here is relevant to it.
		return;
	}

	$uri = Q_Dispatcher::uri();
	$publisherId = Q::ifset($uri, 'publisherId', Users::currentCommunityId(true));
	$clipId = Q::ifset($uri, 'clipId', null);
	if (!$clipId) {
		throw new Q_Exception_RequiredField(array('field' => 'clipId'));
	}

	// Same candidate-name resolution Media_clip_response uses, so this
	// route accepts the exact same URLs Media/clip.js's "Edit video" link
	// (tool.stream.url() + "/edit") produces.
	$stream = Streams_Stream::select()->where(array(
		"publisherId" => $publisherId,
		"name" => array("$clipId", "Media/clip/$clipId", "Media/episode/$clipId")
	))->fetchDbRow();
	if (empty($stream)) {
		throw new Q_Exception_MissingRow(array('table' => 'stream', 'criteria' => "publisherId=$publisherId, clipId=$clipId"));
	}

	$user = Users::loggedInUser(true);
	$episode = Streams_Stream::fetch($user->id, $publisherId, $stream->name, true);
	if (!$episode->testWriteLevel('edit')) {
		throw new Users_Exception_NotAuthorized();
	}

	$video = $episode->getAttribute('video') ?: array();
	$rootCid = Q::ifset($video, 'rootCid', null);
	$safecloud = $rootCid ? Media::safecloudVideoRead($rootCid) : null;

	$payment = $episode->getAttribute('payment') ?: array();
	$mechanisms = Q_Config::get('Media', 'episode', 'paymentMechanism', array('perStream', 'perMinute'));
	$hasStream = in_array('perStream', $mechanisms);
	$hasMinute = in_array('perMinute', $mechanisms);
	// Only meaningful in the "both" case — a nonzero saved perMinute price
	// there can only have come from the "allow per-minute" checkbox having
	// been checked (see Media/dropVideo/post.php's derivation), so that's
	// the faithful way to reconstruct the checkbox's own initial state.
	$allowPerMinute = ($hasStream && $hasMinute && floatval(Q::ifset($payment, 'perMinute', 0)) > 0);

	// Not auto-loaded app-wide — needed client-side for
	// Q.Safecloud.Client.createShareLink (the standalone-player link).
	Q_Response::addScript('{{Safecloud}}/js/Safecloud.js', 'head');
	Q_Response::addScript('{{Safecloud}}/js/Safecloud/DataTrees.js', 'head');

	// Falls back to Qbix's own node server (see
	// Media/dropVideo/response.php's identical fallback for why).
	$jetUrl = Q_Config::get('Safecloud', 'jetUrl',
		Q_Config::get('Q', 'node', 'url', Q_Request::baseUrl()));

	$text = Q_Text::get('Media/content');
	Q_Response::setSlot('title', Q::ifset($text, 'episodeEdit', 'PageTitle', 'Edit video'));

	$content = Q::view('Media/content/episodeEdit.php', array(
		'jetUrl' => $jetUrl,
		'publisherId' => $episode->publisherId,
		'streamName' => $episode->name,
		'title' => $episode->title,
		'content' => $episode->content,
		'categories' => $episode->getAttribute('categories') ?: array(),
		'visibility' => $episode->getAttribute('visibility') ?: 'public',
		'posterUrl' => $episode->iconUrl(400),
		'onSiteUrl' => $episode->url(),
		'videoDuration' => floatval($episode->getAttribute('videoDuration', 0)),
		'priceStream' => floatval(Q::ifset($payment, 'amount', 0)),
		'pricePerMinute' => floatval(Q::ifset($payment, 'perMinute', 0)),
		'allowPerMinute' => $allowPerMinute,
		'manifest' => $safecloud ? $safecloud['manifest'] : null,
		'rootKey' => $safecloud ? $safecloud['rootKey'] : null
	));
	Q_Response::setSlot('content', $content);
}
