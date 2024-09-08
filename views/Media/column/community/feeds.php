<div class="Communities_profile_section" id="Communities_profile_feeds">
<?php
	Q_Response::addStylesheet('{{Media}}/css/columns/feeds.css', "Media");
	echo Q::event('Media/feeds/response/column', @compact("communityId"));
?>
</div>