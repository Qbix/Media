<?php
function Media_after_Users_Contact_removeExecute ($params) {
	// Update avatar as viewed by everyone who was in that contacts list
	$contacts =	Streams::$cache['contacts_removed'];
	foreach ($contacts as $contact) {
		$ca = Users_Contact::select("count(*) as res")->where(array(
			"userId" => $contact->userId,
			"contactUserId" => $contact->contactUserId
		))->execute()->fetchAll(PDO::FETCH_ASSOC)[0]["res"];
		if ($ca) {
			continue;
		}

		$feedsStreamName = "Media/feeds";
		Media::getOrCreateStream($contact->userId, $feedsStreamName, "Streams/category", array(
			"title" => "Feeds for ".$contact->userId
		));
		Streams::leave($contact->contactUserId, $contact->userId, array($feedsStreamName), array("skipRelationMessages" => true));
	}
}