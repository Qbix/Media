<?php
function Media_feeds_response_access($params) {
	$request = array_merge($_REQUEST, $params);
	$communityId = Q::ifset($request, 'communityId', null);
	$loggedUser = Users::loggedInUser(true);

	$communityUsers = Users_contact::select(array("contactUserId"))->where(array("userId" => $communityId))->execute()->fetchAll(PDO::FETCH_COLUMN);
	$messages = Streams_Message::select()->where(array(
		"publisherId" => $loggedUser->id,
		"type" => "Media/feed/access",
		"byUserId" => $communityUsers
	))->fetchDbRows();

	$dateFormat = "Y-m-d H:i:s";
	foreach ($messages as $i => $message) {
		$messages[$i]->date = date($dateFormat, strtotime($message->insertedTime));
		$messages[$i]->feed = Streams::fetchOne(null, $message->publisherId, $message->streamName);
		$messages[$i]->startDate = date($dateFormat, $message->getInstruction("startDate", null));
		$messages[$i]->endDate = date($dateFormat, $message->getInstruction("endDate", null));
		$messages[$i]->reason = $message->getInstruction("reason", null);
	}

	Q_Response::addStylesheet('{{Media}}/css/columns/feedsAccess.css', "Media");

	return Q::view("Media/content/feeds_access.php", @compact("messages"));
}

