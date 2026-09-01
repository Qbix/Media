<?php
$adminsLabels = Q_Config::get("Media", "admins", array("Users/owners", "Users/admins", "Media/admins"));
foreach ($adminsLabels as $admin) {
	$access = new Streams_Access();
	$access->publisherId = "";
	$access->streamName = "Media/presentation*";
	$access->ofContactLabel = $admin;
	if (!$access->retrieve()) {
		$access->readLevel = 40;
		$access->writeLevel = 40;
		$access->adminLevel = 40;
		$access->save();
	}
}
