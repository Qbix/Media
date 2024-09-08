<?php

function Media_0_4_local()
{
	if (!file_exists(USERS_PLUGIN_FILES_DIR.DS.'Users'.DS.'icons'.DS.'Media')) {
		Q_Utils::symlink(
			MEDIA_PLUGIN_FILES_DIR.DS.'Media'.DS.'icons'.DS.'labels'.DS.'Media',
			USERS_PLUGIN_FILES_DIR.DS.'Users'.DS.'icons'.DS.'labels'.DS.'Media'
		);
	}
}

Media_0_4_local();