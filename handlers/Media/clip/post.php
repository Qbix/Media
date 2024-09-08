<?php
/**
 * Creates new clip stream and relates it to episode stream
 * @class HTTP 
 * @method post
 * @param {array} [$_REQUEST] Parameters that can come from the request
 * @return {void}
 */
function Media_clip_post($params = array())
{
	$params = array_merge($_REQUEST, $params);
	$text = Q_Text::get("Media/content");
    $publisherId = Q::ifset($params, 'publisherId', Users::loggedInUser(true)->id);

    // check if paid
	$paidInfo = Q_Config::get("Media", "clip", "createCost", null);
	$amount = Q::ifset($paidInfo, "amount", null);
	$isAdmin = (bool)Users::roles(array(Users::communityId(), Users::currentCommunityId()), Q_Config::expect("Media", "admins"));
	$assets_credits = null;
	if (!$isAdmin && !empty($paidInfo) && $amount) {
		$assets_credits = Assets_Credits::select()
			->where(array(
				'fromUserId' => $publisherId,
				'toStreamName' => "Media/clip"
			))
			->orderBy('insertedTime', false)
			->limit(1)
			->fetchDbRow();
		if (!$assets_credits || $assets_credits->getAttribute("processed") || ($assets_credits->amount < $amount)) {
			return Q_Response::setSlot("result", "needPayment");
		}
	}

    $clipStream = Streams::create($publisherId, $publisherId, 'Media/clip', array(
    	"title" => Q::ifset($params, "params", "title", null),
		"content" => Q::ifset($params, "params", "content", null),
		"icon" => Q::ifset($params, "params", "icon", null),
		"attributes" => Q::ifset($params, "params", "attributes", null)
	), array('relate' => array(
		"publisherId" => Q::ifset($params, "related", "publisherId", null),
		"streamName" => Q::ifset($params, "related", "streamName", null),
		"type" => Q::ifset($params, "related", "type", null)
	)));

	// if stream created mark credits row as processed
	if ($assets_credits && $clipStream) {
		$assets_credits->setAttribute("processed", true)->save();
	}

	Q_Response::setSlot("result", true);
    Q_Response::setSlot("stream", $clipStream);
}