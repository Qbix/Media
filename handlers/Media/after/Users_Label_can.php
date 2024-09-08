<?php
function Media_after_Users_Label_can ($params, &$result) {
	$labelsCanManageMedia = Q_Config::get("Media", "access", "feeds", "admins", array());

	$result['manageMedia'] = false;
	foreach ($params["userCommunityRoles"] as $label => $role) {
		if (in_array($label, $labelsCanManageMedia)) {
			$result['manageMedia'] = true;
		}
	}
}