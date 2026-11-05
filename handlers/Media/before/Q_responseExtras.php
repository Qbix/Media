<?php
function Media_before_Q_responseExtras() {
	Q_Response::addStylesheet('{{Media}}/css/Media.css', 'Media');
	Q_Response::addScript('{{Media}}/js/Media.js', 'Media');
	Q_Response::addScript('{{Media}}/js/WebRTC.js' , 'Media');

	Q_Response::setScriptData("Q.plugins.Assets.credits.amounts.watching", Q_Config::expect("Assets", "credits", "amounts", "watching"));
	Q_Response::setScriptData("Q.plugins.Media.clip.watching.earnPeriod", Q_Config::expect("Media", "clip", "watching", "earnPeriod"));
	Q_Response::setScriptData("Q.plugins.Media.clip.watching.metricsPeriod", Q_Config::get("Media", "clip", "watching", "metricsPeriod", 60));
	Q_Response::setScriptData("Q.plugins.Media.isFeedsAdmin", Media::isFeedsAdmin());
	Q_Response::setScriptData("Q.plugins.Media.rtmp.port", Q_Config::get("Media", "rtmp_server", "rtmp", "port", null));
	Q_Response::setScriptData("Q.plugins.Media.admins", Q_Config::expect("Media", "admins"));
	Q_Response::setScriptData("Q.plugins.Media.clip.createCost", Q_Config::expect("Media", "clip", "createCost"));
	Q_Response::setScriptData("Q.plugins.Media.clip.openFirstClip", Q_Config::expect("Media", "clip", "openFirstClip"));
	Q_Response::setScriptData("Q.plugins.Media.liveShow", Q_Config::get("Media", "liveShow", null));
	Q_Response::setScriptData("Q.plugins.Media.clip.webrtc", Q_Config::get("Media", "clip", "webrtc", null));
	Q_Response::setScriptData("Q.plugins.Media.episode.templateStyle", Q_Config::get("Media", "episode", "templateStyle", null));
	Q_Response::setScriptData("Q.plugins.Media.episode.payment", Q_Config::get("Media", "episode", "payment", array()));
	Q_Response::setScriptData("Q.plugins.Media.episode.paymentMechanism", Q_Config::get("Media", "episode", "paymentMechanism", array("perStream", "perMinute")));
	Q_Response::setScriptData("Q.plugins.Media.clip.allowCreateForRole", Q_Config::get("Media", "clip", "allowCreateForRole", "allUsers"));
	Q_Response::setScriptData("Q.plugins.Media.clip.clipToolLayout", Q_Config::get("Media", "clip", "clipToolLayout", "columns"));
	Q_Response::setScriptData("Q.plugins.Media.clip.episodePreviewLayout", Q_Config::get("Media", "clip", "episodePreviewLayout", "default"));
	Q_Response::setScriptData("Q.plugins.Media.clip.episodePreviewCardMinWidth", Q_Config::get("Media", "clip", "episodePreviewCardMinWidth", null));
	Q_Response::setScriptData("Q.plugins.Media.clip.episodePreviewReplaceColumn", Q_Config::get("Media", "clip", "episodePreviewReplaceColumn", false));
	Q_Response::setScriptData("Q.plugins.Media.clip.clipSearchLayout", Q_Config::get("Media", "clip", "clipSearchLayout", "searchAndColumnTitle"));
	Q_Response::setScriptData("Q.plugins.Media.clip.clipSearchResultLayout", Q_Config::get("Media", "clip", "clipSearchResultLayout", "cards"));
	Q_Response::setScriptData("Q.plugins.Media.channel.allowFollow", Q_Config::get("Media", "channel", "allowFollow", false));
	Q_Response::setScriptData("Q.plugins.Media.channel.showParticipants", Q_Config::get("Media", "channel", "showParticipants", true));
	Q_Response::setScriptData("Q.plugins.Media.channel.previewLayout", Q_Config::get("Media", "channel", "previewLayout", "default"));

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

	$templateStyle = Q_Request::isMobile() ? "tall" : "square";
	Q_Response::setScriptData("Q.plugins.Media.episode.templateStyle", $templateStyle);
	Q_Response::setScriptData("Q.plugins.Calendars.event.templateStyle", $templateStyle);
}