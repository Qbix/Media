<?php
function Media_after_Communities_profile_tabs ($params, &$results) {
	$tabs = $params["tabs"];
	$userId = $params["userId"];
	$loggedUser = Users::loggedInUser();
	$loggedUserId = Q::ifset($loggedUser, "id", null);
	$text = Q_Text::get("Media/content");

	$contentParams = @compact("userId", "text");

	$isAdmin = false;
	$labelsAuthorized = Q_Config::get("Media", "access", "feeds", "admins", null);
	$communities = Users_Contact::select()->where(array(
		"contactUserId" => $userId,
		"userId " => new Db_Range('A', true, false, ord('Z')+1),
		"label" => $labelsAuthorized
	))->limit(1)->fetchDbRows();
	$isAdmin = !empty($communities);
	
	// collect tabs content and controls
	foreach ($tabs as $tab => $content) {
		if (!$content) {
			continue;
		}

		// skip importEvents if no permissions
		if($tab == "clips" && !$isAdmin) {
			continue;
		}

		// check tab
		if (is_file(MEDIA_PLUGIN_VIEWS_DIR.DS."Media".DS."column".DS."profile".DS.$tab."Tab.php")) {
			$results[$tab]["tab"] = Q::view("Media/column/profile/".$tab."Tab.php", $contentParams);
		}

		// check content
		if (is_file(MEDIA_PLUGIN_VIEWS_DIR.DS."Media".DS."column".DS."profile".DS.$tab.".php")) {
			$results[$tab]["content"] = Q::view("Media/column/profile/".$tab.".php", $contentParams);
		} elseif (is_file(MEDIA_PLUGIN_VIEWS_DIR.DS."Media".DS."column".DS.$tab.".php")) {
			$results[$tab]["content"] = Q::view("Media/column/".$tab.".php", $contentParams);
		}

		// check controls
		$controlView = MEDIA_PLUGIN_VIEWS_DIR.DS."Media".DS."column".DS."community".DS.$tab."Controls.php";
		if (is_file($controlView)) {
			$results[$tab]["controls"] = Q::view("Media/column/community/".$tab."Controls.php");
		}
	}
}