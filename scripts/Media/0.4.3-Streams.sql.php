<?php
$communityId = Users::communityId();
Streams::fetchOneOrCreate($communityId, $communityId, "Media/channels/main");