<?php
function Media_channel_delete ($params) {
	$request = array_merge($_REQUEST, $params);
	Q_Valid::requireFields(["publisherId", "streamName"], $request, true);
	$loggedInUserId = Users::loggedInUser(true)->id;
	$publisherId = Q::ifset($request, "publisherId", null);
	$streamName = Q::ifset($request, "streamName", null);
	$adminLabels = Q_Config::get("Users", "communities", "admins", null);
	// if user try to update align profile or is not an admin
	if ($publisherId != $loggedInUserId && !(bool)Users::roles(null, $adminLabels, array(), $loggedInUserId)) {
		throw new Users_Exception_NotAuthorized();
	}

	if ($streamName == "Media/channel/main") {
		throw new Exception("You can't close main channel");
	}

	Streams_Stream::fetch($publisherId, $publisherId, $streamName, true)->close($publisherId);
}