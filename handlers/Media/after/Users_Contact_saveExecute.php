<?php
function Media_after_Users_Contact_saveExecute ($params) {
	$inserted = $params['inserted'];
	$modifiedFields = $params['modifiedFields'];
	$contact = $params['row'];
	$communityId = $contact->userId;

	if (!Users::isCommunityId($communityId)) {
		return;
	}

	if ($inserted) {
		$feedsStreamName = "Media/feeds";
		Media::getOrCreateStream($communityId, $feedsStreamName, "Streams/category", array(
			"title" => "Feeds for ".$communityId
		));
		Media::joinIfNotJoined($communityId, $feedsStreamName, $contact->contactUserId);
	}
}