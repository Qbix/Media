<?php
require MEDIA_PLUGIN_DIR.DS.'vendor'.DS.'autoload.php';


/**
 * Base class for Media_Livestream_... adapters
 *
 * @class Media_Livestream
 */
abstract class Media_Livestream
{

    static function createOrUpdateLivestreamStream($publisherId, $streamName, $time) {
        $loggedInUserId = Users::loggedInUser(true)->id;
        $webrtcStream = Streams_Stream::fetch($publisherId, $publisherId, $streamName);

		if (!$webrtcStream) {
			throw new Q_Exception("Please pass WebRTC stream's name and publisher id as params for this request.");
		}

		if(!$time) {
			$time = $webrtcStream->getAttribute('scheduledStartTime');
			if(!$time) $time = time();
		}

		//get livestream stream that was created by the person who opened livestream editor in webrtc chat room
		$livestreamStream = self::getLivestreamStream($publisherId, $streamName);

		if (is_null($livestreamStream)) {
			//if there is no livestream stream found, create it and relate it to webrtc stream of room
			$livestreamStream = Streams::create($loggedInUserId, $loggedInUserId, 'Media/webrtc/livestream', ['readLevel' => 40, 'writeLevel' => 23, 'adminLevel' => 20]);
			$livestreamStream->subscribe();
			$livestreamStream->join(['subscribed' => true]);

			$livestreamStream->relateTo((object)array(
				"publisherId" => $publisherId,
				"name" => $streamName
			), "Media/webrtc/livestream", $loggedInUserId, array(
				"inheritAccess" => false,
				"weight" => $time
			));
		} else {
			$relatedTo = new Streams_RelatedTo();
            $relatedTo->toPublisherId = $publisherId;
            $relatedTo->toStreamName = $streamName;
            $relatedTo->type = 'Media/webrtc/livestream';
            $relatedTo->fromPublisherId = $livestreamStream->publisherId;
            $relatedTo->fromStreamName = $livestreamStream->name;
            if ($retrieved = $relatedTo->retrieve()) {
                $relatedTo->weight = $time;
                $relatedTo->save();
            }
		}
		
		if (is_null($livestreamStream)) {
			throw new Q_Exception("Something went wrong when fetching livestream stream");
		}

		$livestreamStream->setAttribute('scheduledStartTime', $time * 1000);
		$livestreamStream->setAttribute('endTime', '');
		$livestreamStream->changed();
		$livestreamStream->save();

        return $livestreamStream;
    }

    static function getLivestreamStream($publisherId, $streamName)
    {
        $livestreamStreamRelation = Streams_RelatedTo::select()->where(array(
            "toPublisherId" => $publisherId,
            "toStreamName" => $streamName,
            "fromPublisherId" => Users::loggedInUser(true)->id,
            "type" => "Media/webrtc/livestream"
        ))->orderBy("weight", false)->limit(1)->fetchDbRow();

        if (!is_null($livestreamStreamRelation)) {
            return Streams_Stream::fetch(Users::loggedInUser(true)->id, $livestreamStreamRelation->fromPublisherId, $livestreamStreamRelation->fromStreamName);
        }

        return null;
    }

    static function createOrUpdateChannel($liveStreamPublisherId, $liveStreamName, $destinationObjectJson, $remove) {
        $loggedInUserId = Users::loggedInUser(true)->id;

        $livestreamStream = Streams_Stream::fetch($loggedInUserId, $liveStreamPublisherId, $liveStreamName);
		
		if (is_null($livestreamStream) || is_null($destinationObjectJson)) {
			throw new Q_Exception("Something went wrong when fetching livestream stream");
		}

		$destinationObject = json_decode($destinationObjectJson, true);

		if(!isset($destinationObject['destId'])) {
			throw new Q_Exception("destId is missing");
		}

		$destinationStream = Streams_Stream::fetch($loggedInUserId, $liveStreamPublisherId, 'Media/livestream/dest/' . $destinationObject['destId']);
		
		if($remove && !is_null($destinationStream)) {			
            $destinationStream->close($loggedInUserId);
		} else {
			if (is_null($destinationStream)) {
				$destinationStream = Streams::create($loggedInUserId, $loggedInUserId, 'Media/livestream/dest', ['name' => 'Media/livestream/dest/' . $destinationObject['destId']]);
				$destinationStream->subscribe();
				$destinationStream->join(['subscribed' => true]);
		
				$destinationStream->relateTo((object)array(
					"publisherId" => $liveStreamPublisherId,
					"name" => $liveStreamName
				), "Media/livestream/dest", $loggedInUserId, array(
					"inheritAccess" => false,
					"weight" => time()
				));
			}
	
			$destinationStream->closedTime = null;
			$destinationStream->content = $destinationObjectJson;
			$destinationStream->changed();
	
		}

        return $destinationStream;
    }

	static function updateReminders($publisherId, $streamName, $reminderTime, $action) {
        $livestreamStream = Streams_Stream::fetch($publisherId, $publisherId, $streamName);

		$meAsParticipant = $livestreamStream->participant();
        if (!$meAsParticipant || $meAsParticipant->fields['state'] != 'participating') {
			$livestreamStream->join(['subscribed' => true]);
			$meAsParticipant = $livestreamStream->participant();			
		}

		$reminders = $meAsParticipant->getExtra("reminders");
		if(!$reminders) {
			$reminders = [];
		}

		if($action == 'set') {
			if(!array_key_exists($reminderTime, $reminders)){
				$reminders[$reminderTime] = false;
			}
		} else if($action == 'unset') {
			if(array_key_exists($reminderTime, $reminders)){
				unset($reminders[$reminderTime]);
			}
		}

		$meAsParticipant->setExtra('reminders', $reminders);
		$meAsParticipant->save();

		self::setSubscriptionRule($publisherId, $streamName);

		return $reminders;
	}

	static function setSubscriptionRule($publisherId, $streamName) {
		$userId = Users::loggedInUser(true)->id;

		$rules = Streams_SubscriptionRule::select()->where(array(
			'ofUserId'    => $userId,
			'publisherId' => $publisherId,
			'streamName'  => $streamName
		))->fetchDbRows(null, '', 'ordinal');

		if (!$rule = array_pop($rules)) {
			$rule              = new Streams_SubscriptionRule();
			$rule->ofUserId    = $userId;
			$rule->publisherId = $publisherId;
			$rule->streamName  = $streamName;
			$rule->relevance   = 1;
		}

		$rule->deliver = Q::json_encode(['to' => 'livestream']);
		$rule->save();
	}
    
};