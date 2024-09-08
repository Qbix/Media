<div class="Communities_profile_section" id="Communities_profile_feedsAccess">
<?php
	Q_Response::addStylesheet('{{Media}}/css/columns/feedsAccess.css', "Media");
	echo Q::event('Media/feeds/response/access', @compact("communityId"));
?>
</div>