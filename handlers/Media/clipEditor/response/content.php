<?php

function Media_clipEditor_response_content($params)
{
	Q_Response::addScript('{{Media}}/js/pages/clipEditor.js');
	return Q::view("Media/content/clipEditor.php");
}

