<?php
function Media_before_Q_responseExtras() {
	Q_Response::addStylesheet('{{Media}}/css/Media.css', 'Media');
	Q_Response::addScript('{{Media}}/js/Media.js', 'Media');
	Q_Response::addScript('{{Media}}/js/WebRTC.js' , 'Media');

	Q_Response::setScriptData("Q.plugins.Assets.credits.amounts.watching", Q_Config::expect("Assets", "credits", "amounts", "watching"));
	Q_Response::setScriptData("Q.plugins.Media.clip.watching.earnPeriod", Q_Config::expect("Media", "clip", "watching", "earnPeriod"));
	Q_Response::setScriptData("Q.plugins.Media.isFeedsAdmin", Media::isFeedsAdmin());
	Q_Response::setScriptData("Q.plugins.Media.rtmp.port", Q_Config::get("Media", "rtmp_server", "rtmp", "port", null));
	Q_Response::setScriptData("Q.plugins.Media.admins", Q_Config::expect("Media", "admins"));
	Q_Response::setScriptData("Q.plugins.Media.clip.createCost", Q_Config::expect("Media", "clip", "createCost"));
	Q_Response::setScriptData("Q.plugins.Media.clip.openFirstClip", Q_Config::expect("Media", "clip", "openFirstClip"));
	Q_Response::setScriptData("Q.plugins.Media.liveShow", Q_Config::get("Media", "liveShow", null));
	Q_Response::setScriptData("Q.plugins.Media.clip.webrtc", Q_Config::get("Media", "clip", "webrtc", null));
	Q_Response::setScriptData("Q.plugins.Media.episode.templateStyle", Q_Config::get("Media", "episode", "templateStyle", null));

	// collect user id's with label Users/hosts
	$hosts = Users_Contact::select()->where(array(
		'userId' => Users::currentCommunityId(true),
		'label' => array("Users/hosts")
	))->fetchDbRows(null, null, 'contactUserId');
	$hosts = array_keys($hosts);
	Q_Response::setScriptData("Q.plugins.Media.hosts", $hosts);
	$screeners = Users_Contact::select()->where(array(
		'userId' => Users::currentCommunityId(true),
		'label' => array("Users/screeners")
	))->fetchDbRows(null, null, 'contactUserId');
    $screeners = array_keys($screeners);
	Q_Response::setScriptData("Q.plugins.Media.screeners", $screeners);
}