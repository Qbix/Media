<?php

function Media_0_1_Streams()
{
	$app = Q::app();
	$communityId = Users::communityId();
	$admins = Q_Config::get("Media", "access", "feeds", "admins", array("Users/owners", "Users/admins", "Media/admins"));

	$text = Q_Text::get('Media/content');
	$stream = Streams::fetchOne($app, $communityId, 'Media/clips');
	if (!$stream) {
		Streams::create($app, $communityId, 'Streams/category', array(
			'name' => 'Media/clips',
			'title' => $text['categories']['Clips'],
			'readLevel' => 40,
			'writeLevel' => 20,
			'adminLevel' => 20
		));
	}

	$stream = Streams::fetchOne($app, $communityId, 'Media/episodes');
	if (!$stream) {
		Streams::create($app, $communityId, 'Streams/category', array(
			'name' => 'Media/episodes',
			'title' => $text['categories']['Episodes'],
			'readLevel' => 40,
			'writeLevel' => 20,
			'adminLevel' => 20
		));
	}

	foreach ($admins as $admin) {
		foreach (array("Media/clips", "Media/episodes") as $streamName) {
			$access = new Streams_Access();
			$access->publisherId= $app;
			$access->streamName = $streamName;
			$access->ofContactLabel = $admin;
			if (!$access->retrieve()) {
				$access->readLevel = 40;
				$access->writeLevel = 40;
				$access->adminLevel = 40;
				$access->save();
			}
		}
	}
}

Media_0_1_Streams();