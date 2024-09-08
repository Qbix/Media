<?php

function Media_0_1_local()
{
	// symlink the icons folder
	Q_Utils::symlink(
		MEDIA_PLUGIN_FILES_DIR.DS.'Media'.DS.'icons',
		MEDIA_PLUGIN_WEB_DIR.DS.'img'.DS.'icons',
		true
	);
}

Media_0_1_local();