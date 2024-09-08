<?php
foreach (array("Users/owners", "Users/admins", "Media/admins") as $admin) {
	$access = new Streams_Access();
	$access->publisherId= Users::communityId();
	$access->streamName = "Media/webrtc*";
	$access->ofContactLabel = $admin;
	if (!$access->retrieve()) {
		$access->readLevel = 40;
		$access->writeLevel = 40;
		$access->adminLevel = 40;
		$access->save();
	}
}
