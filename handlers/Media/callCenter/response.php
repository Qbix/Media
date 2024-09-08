<?php
function Media_callCenter_response($params) {
	
	//eturn Q::view('Media/content/columns.php');
	//return Q::view("Media/content/meeting.php");
	Q_Response::addScript('{{Media}}/js/pages/callCenter.js');
	$content = Q::view('Media/content/columns.php', $params);
	Q_Response::setSlot('content', $content);
}