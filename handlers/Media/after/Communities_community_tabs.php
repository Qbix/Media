<?php
function Media_after_Communities_community_tabs ($params, &$results) {
	$tabs = $params["tabs"];
	$communityId = $params["communityId"];

	$user = Users::loggedInUser();

	$contentParams = @compact("communityId");

	// collect tabs content and controls
	foreach ($tabs as $tab => $content) {
		if (!$content) {
			continue;
		}

		// skip importEvents if no permissions
		if($tab == "feedsAccess" && !$user) {
			continue;
		}

		// check content
		if (is_file(MEDIA_PLUGIN_VIEWS_DIR.DS."Media".DS."column".DS."community".DS.$tab.".php")) {
			$results[$tab]["content"] = Q::view("Media/column/community/".$tab.".php", $contentParams);
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