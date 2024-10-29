<?php
function Media_games_response($params) {
	
	Q_Response::addScript('{{Media}}/js/pages/games.js');
	$page = Q::view("Media/content/games.php");
	Q_Response::setSlot('content', $page);
}