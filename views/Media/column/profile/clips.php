<div class="Communities_profile_section <?php echo $userId ? 'Communities_profile_anotherUser' : 'Communities_profile_loggedInUser' ?>" id="Communities_profile_clips">
	<?php echo Q::event('Media/clips/response/list', @compact("userId")) ?>
</div>
