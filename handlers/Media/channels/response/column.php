<?php
function Media_channels_response_column() {
	$currentUser = Users::loggedInUser();
	$communityId = Users::communityId();

	$myChannels = null;
	if ($currentUser) {
		$myChannels = Streams::fetchOneOrCreate($currentUser->id, $currentUser->id, 'Media/channels/main');
	}

	$allChannels = Streams::fetchOne(null, $communityId, 'Media/channels/main', true);
	$limit = Q_Config::get("Media", "pageSizes", "channels", 10);
	$offset = 0;

	return Q::view('Media/column/channels.php', @compact(
		'allChannels', 'limit', 'offset', 'currentUser', 'myChannels'
	));
}

