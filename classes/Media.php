<?php
/**
 * Media
 * @module Media
 * @main Media
 */
/**
 * Static methods for the Media plugin
 * @class Media
 * @abstract
 */
abstract class Media
{
	/**
	 * Fetch or create presentation stream
	 * @method presentationStream
	 * @param {string} [$asUserId=null]
	 *   The id of the user who is trying to obtain it. Defaults to logged-in user.
	 * @param {boolean} [$publisherId] the community publishing the stream
	 * @param {boolean} [$experienceId] a string describing which experience the presentation belongs to
	 *   (may correspond to a single location + area, or be syndicated across multiple ones).
	 *   The corresponding "Streams/experience/:experienceId" stream must exist.
	 * @throws {Users_Exception_NotLoggedIn} If user is not logged in and
	 *   $throwIfNotLoggedIn is true
	 */
	static function presentationStream($asUserId, $publisherId, $experienceId)
	{
		Streams_Stream::fetchOrCreate($asUserId, $publisherId, "Media/presentation/$experienceId", array(
			'type' => 'Media/presentation',
			'relate' => array(
				'publisherId' => $publisherId,
				'streamName' => "Streams/experience/$experienceId"
			)
		));
	}

	/**
	 * Fetch or create user recordings stream
	 * @method presentationStream
	 * @param {string} [$asUserId=null]
	 *   The id of the user who is trying to obtain it. Defaults to logged-in user.
	 * @param {boolean} [$publisherId] the community publishing the stream
	 * @param {boolean} [$experienceId] a string describing which experience the presentation belongs to
	 *   (may correspond to a single location + area, or be syndicated across multiple ones).
	 *   The corresponding "Streams/experience/:experienceId" stream must exist.
	 * @throws {Users_Exception_NotLoggedIn} If user is not logged in and
	 *   $throwIfNotLoggedIn is true
	 */
	static function userRecordingsStream($userId)
	{
		Streams_Stream::fetchOrCreate($userId, $userId, "Media/user/recordings");
	}

	/**
	 * Select feeds related to community
	 * @method filterFeeds
	 * @param {string} [$params.communityId]
	 * @param {string} [$params.offset]
	 * @param {string} [$params.limit]
	 * @return {array} The streams, filtered by the above parameters
	 */
	static function filterFeeds ($params = array()) {
		$loggedUser = Users::loggedInUser();
		$communityId = Q::ifset($params, 'communityId', Users::currentCommunityId(true));
		$isAdmin = self::isFeedsAdmin(null, $communityId);

		if (!$loggedUser) {
			return null;
		}

		if (!$isAdmin) {
			$relations = Streams::related(
				$loggedUser->id,
				$loggedUser->id,
				"Media/feeds",
				true,
				array(
					"limit" => Q::ifset($params, 'limit', Q_Config::get('Media', 'pageSizes', 'feeds', 'limit', 100)),
					"offset" => Q::ifset($params, 'offset', 0),
					"orderBy" => false,
					"type" => "Media/feed",
					"relationsOnly" => true
				)
			);

			return $relations;
		}

		$usersInvolved = Users_Contact::select()->where(array(
			"userId" => $communityId
		))->fetchDbRows();

		$used = array();
		$relations = array();
		foreach ($usersInvolved as $user) {
			if (in_array($user->contactUserId, $used)) {
				continue;
			}
			$used[] = $user->contactUserId;

			$relations = array_merge($relations, Streams::related(
				Q::ifset($options, 'asUserId', null),
				$user->contactUserId,
				"Media/feeds",
				true,
				array(
					"limit" => Q::ifset($params, 'limit', Q_Config::get('Media', 'pageSizes', 'feeds', 'limit', 100)),
					"offset" => Q::ifset($params, 'offset', 0),
					"orderBy" => false,
					"type" => "Media/feed",
					"relationsOnly" => true
				)
			));
		}

		return $relations;
	}

	/**
	 * Check whether user authorized to create new feed
	 * @method newFeedAuthorized
	 * @param {string} [$userId=null] User id need to check. If null - logged user.
	 * @param {string} [$communityId=null] Community id. If null - current community.
	 * @return boolean
	 */
	static function newFeedAuthorized ($userId = null, $communityId = null) {
		if (!$userId) {
			$user = Users::loggedInUser();

			if (!$user) {
				return false;
			}
			$userId = $user->id;
		}

		$anyoneNewFeed = Q_Config::get('Media', 'feeds', 'anyoneNewFeed', false);
		if ($anyoneNewFeed) {
			return true;
		}

		$communityId = $communityId ?: Users::currentCommunityId();

		$labelsAuthorized = Q_Config::get("Media", "access", "feeds", "admins", null);
		if ($labelsAuthorized) {
			// check if user have permissions in current community
			if (!empty(Users::roles($communityId, $labelsAuthorized, array(), $userId))) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Whether user have feeds permissions
	 * @method isFeedsAdmin
	 * @param {string} [$userId=null] User id need to check. If null - logged user.
	 * @return boolean
	 */
	static function isFeedsAdmin ($userId = null, $communityId = null) {
		if (!$userId) {
			$user = Users::loggedInUser(false, false);

			if (!$user) {
				return false;
			}
			$userId = $user->id;
		}

		$communityId = $communityId ?: Users::currentCommunityId();

		$labelsAuthorized = Q_Config::get("Media", "access", "feeds", "admins", null);
		if ($labelsAuthorized && !empty(Users::roles($communityId, $labelsAuthorized, array(), $userId))) {
			return true;
		}

		return false;
	}

	/**
	 * Fetch or create stream
	 * @method getOrCreateStream
	 * @param {string} $publisherId
	 * @param {string} [$streamType] If empty, means stream already exists and $fields["streamName"] must defined.
	 * @param {array} $fields Stream fields
	 * @param {string} [$fields.streamName] If empty, means need to create new srteam and $streamType must defined.
	 * @return Streams_Stream
	 */
	static function getOrCreateStream($publisherId, $streamName=null, $streamType=null, $fields=array()) {
		if (!$publisherId) {
			throw new Q_Exception_RequiredField(array('field' => 'publisherId'));
		}
		return Streams_Stream::fetchOrCreate($publisherId, $publisherId, $streamName, array(
			'type' => $streamType
		));
	}

	/**
	 * Create Media/clip stream and relate to feed
	 * @method createClip
	 * @param {array} $params
	 * @param {string} [$params[video]] Path to video file
	 * @param {string} [$params[publisherId]] Feed and clip streams publisher
	 * @param {string} [$params[feedId]] Last part of feed stream name
	 * @param {string} [$params[image]] Path to thumbnail file
	 * @param {string} [$params[duration]] video duration in milliseconds
	 */
	static function createClip ($params) {
		if (empty($params["video"]) || !is_file($params["video"])) {
			throw new Exception("wrong video path");
		}
		if (empty($params["publisherId"])) {
			throw new Exception("publisherId undefined");
		}
		if (empty($params["feedId"])) {
			throw new Exception("feedId undefined");
		}
		if (empty($params["duration"])) {
			throw new Exception("duration undefined");
		}

		$streamType = $relationType = "Media/clip";

		$stream = Streams::create($params["publisherId"], $params["publisherId"], $streamType, array(
			"attributes" => array("duration" => $params["duration"])
		));

		// attach file to stream
		$res = Websites_File::saveStreamFile($stream, $params["video"], "file", true);
		$stream->setAttribute("Q.file.url", $res["url"]);
		$stream->save();

		// set icon
		if (!empty($params["image"]) && is_file($params["image"])) {
			$res = Websites_File::saveStreamFile($stream, $params["image"], "icon", true);
			$stream->icon = $res["url"];
			$stream->save();
		}

		// relate to feed
		// need to relate exactly after video file attach, because client may get Streams/relatedTo message before file attached
		Streams::relate(
			$params["publisherId"],
			$params["publisherId"],
			"Media/feed/".$params["feedId"],
			$relationType,
			$stream->publisherId,
			$stream->name,
			array(
				'weight' => time()
			)
		);
	}

	/**
	 * Check if user participatd to stream and participate if not
	 * @method joinIfNotJoined
	 * @param {string} $publisherId
	 * @param {string} $streamName
	 * @param {string|object|null} [$user] If null use logged in user.
	 */
	static function joinIfNotJoined ($publisherId, $streamName, $userId=null) {
		if (empty($userId)) {
			$userId = Users::loggedInUser();
		}
		if (gettype($userId) == "object") {
			$userId = Q::ifset($userId, "id", null);
		}

		// user not logged in
		if (empty($userId)) {
			return;
		}

		// join to Media/feeds category to get messages
		$participated = Streams_Participant::select("count(*) as res")->where(array(
			"publisherId" => $publisherId,
			"streamName" => $streamName,
			"userId" => $userId,
			"state" => 'participating'
		))->execute()->fetchAll(PDO::FETCH_ASSOC)[0]["res"];
		if ($participated == 0) {
			Streams::join($userId, $publisherId, array($streamName), array("skipRelationMessages" => true));
		}
	}

	/**
	 * Private method to create Media/live streams and all needed actions including related streams
	 * @method createLiveStream
	 * @return  Streams_Stream
	 */
	private static function createLiveStream () {
		$communityId = Users::currentCommunityId(true);

		// create live stream
		$livestream = Streams::create($communityId, $communityId, "Media/live", array(
			"attributes" => array(
				"video" => Q_Config::get("Media", "liveShow", "video", null),
				"audio" => Q_Config::get("Media", "liveShow", "audio", null)
			)
		), array('relate' => array(
			"publisherId" => $communityId,
			"streamName" => "Media/live",
			"type" => "Media/live",
			"weight" => time()
		)));

		// create main webrtc stream and relate to livestream
		$relationTypes = Q_Config::expect("Media", "clip", "webrtc", "relations");
		$webrtcStream = Streams::create($communityId, $communityId, 'Media/webrtc', array(
			'readLevel' => 40,
			'writeLevel' => 0,
			'adminLevel' => 0,
			'attributes' => array(
				'resumeClosed' => true
			)
		), array('relate' => array(
			"publisherId" => $livestream->publisherId,
			"streamName" => $livestream->name,
			"type" => $relationTypes["main"],
			"inheritAccess" => false
		)));

		foreach(array('mic', 'camera', 'screen') as $permissionName) {
			$webrtcStream->addPermission($permissionName);
		}
		$webrtcStream->changed();
		$webrtcStream->save();

		// set full access to Users/hosts
		$access = new Streams_Access();
		$access->publisherId = $webrtcStream->publisherId;
		$access->streamName = $webrtcStream->name;
		$access->ofContactLabel = "Users/hosts";
		$access->readLevel = 40;
		$access->writeLevel = 30;
		$access->adminLevel = 30;
		$access->save();

		return $livestream;
	}

	/**
	 * Get current live show stream.
	 * @method getCurrentLiveShow
	 * @return  Streams_Stream
	 */
	static function getCurrentLiveShow () {
		$communityId = Users::currentCommunityId(true);

		$stream = Streams_Stream::select()->where(array(
			"publisherId" => $communityId,
			"type" => "Media/live"
		))
		->ignoreCache()
		->options(array("dontCache" => true))
		->orderBy('insertedTime', false)
		->limit(1)
		->fetchDbRow();

		if ($stream) {
			$stream = Streams::fetchOne($stream->publisherId, $stream->publisherId, $stream->name);

			// if last stream created today, return one
			if (date('Ymd') == date('Ymd', strtotime($stream->insertedTime))) {
				return $stream;
			}
		}

		return self::createLiveStream();
	}

	/**
	 * Get current live show stream.
	 * @method getCurrentLiveShow
	 * @return  Streams_Stream
	 */
	static function getCurrentLiveShowWebrtc () {
		$liveShow = self::getCurrentLiveShow();
		$relationTypes = Q_Config::expect("Media", "clip", "webrtc", "relations");

		$streams = Streams::related($liveShow->publisherId, $liveShow->publisherId, $liveShow->name, true, array(
			'limit' => 1,
			'streamsOnly' => true
		));
		return $streams ? reset($streams) : null;
	}


	/**
	 * Format time in milliseconds to time like hh:mm:ss
	 * @method formatTime
	 * @param {string|integer} $time - time in milliseconds
	 * @param {boolean} [$options.emptyHours=false] - show empty hours like 00
	 * @param {boolean} [$options.emptyMinutes=true] - show empty minutes like 00
	 * @return  string
	 */
	static function formatTime ($time, $options = array()) {
		$options = array_merge(array(
			"emptyHours" => false,
			"emptyMinutes" => true
		), $options);

		$time = $time/1000;
		$seconds = bcmod($time, 60);
		$minutes = bcmod(intdiv($time, 60), 60);
		$hours = intdiv($time, 3600);
		$items = array();
		if ($hours != "0" || $options["emptyHours"]) {
			$items[] = $hours;
		}
		if ($minutes != "0" || !empty($hours) || $options["emptyMinutes"]) {
			$items[] = $minutes;
		}
		$items[] = $seconds;

		$items = array_map(function($value){
			return strlen($value) == 1 ? "0".$value : $value;
		}, $items);

		return implode(":", $items);
	}

	static $columns = array();
	static $options = array();
}