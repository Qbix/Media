<?php
function Media_channels_response_column() {
	$currentUser = Users::loggedInUser();
	$communityId = Users::communityId();
	$mainChannelsStreamName = 'Media/channels/main';

	$myChannels = null;
	if ($currentUser) {
		$type = "Media/channel";
		$streamName = 'Media/channel/main';
		$myChannels = Streams::fetchOneOrCreate($currentUser->id, $currentUser->id, $mainChannelsStreamName);
		$myChannel = Streams_RelatedTo::select()->where(array(
			"toPublisherId" => $myChannels->publisherId,
			"toStreamName" => $myChannels->name,
			"type" => $type
		))->limit(1)->fetchDbRow();
		if (empty($myChannel)) {
			$alreadyExists = Streams::fetchOne($currentUser->id, $currentUser->id, $streamName);
			if ($alreadyExists) {
				if ($alreadyExists->closedTime != null) {
					$alreadyExists->closedTime = null;
					$alreadyExists->save();
				}
				$alreadyExists->relateTo((object)array("publisherId" => $communityId, "name" => $mainChannelsStreamName), $type, $communityId, array(
					'skipAccess' => true,
					'weight' => strtotime($alreadyExists->insertedTime)
				));
				$alreadyExists->relateTo((object)array("publisherId" => $currentUser->id, "name" => $mainChannelsStreamName), $type, $currentUser->id, array(
					'skipAccess' => true,
					'weight' => strtotime($alreadyExists->insertedTime)
				));
			} else {
				Streams::create($currentUser->id,
					$currentUser->id,
					$type,
					array(
						'title' => "My Clips",
						'icon' => $currentUser->icon,
						'name' => $streamName
					),
					array(
						'relate' => array(
							"publisherId" => $myChannels->publisherId,
							"streamName" => $myChannels->name,
							"type" => $type
						)
					)
				);
			}
		}
	}

	$allChannels = Streams::fetchOne(null, $communityId, 'Media/channels/main', true);
	$limit = Q_Config::get("Media", "pageSizes", "channels", 10);
	$offset = 0;

	Q_Response::addStylesheet("{{Media}}/css/columns/channels.css", "Media");

	return Q::view('Media/column/channels.php', @compact(
		'allChannels', 'limit', 'offset', 'currentUser', 'myChannels'
	));
}

