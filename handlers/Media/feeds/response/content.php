<?php
function Media_feeds_response_content ($params) {
	Q::event('Media/feeds/response/column', $params);
	return Q::view('Media/content/columns.php');
}