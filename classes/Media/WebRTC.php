<?php
require MEDIA_PLUGIN_DIR.DS.'vendor'.DS.'autoload.php';

use Twilio\Jwt\AccessToken;
use Twilio\Jwt\Grants\VideoGrant;
use Twilio\Rest\Client;


/**
 * Base class for Media_WebRTC_... adapters
 *
 * @class Media_WebRTC
 */
abstract class Media_WebRTC
{

    /**
     * Creates or joins a room
     * @method getOrCreateRoomStream
     * @param {string} $publisherId Id of room's publisher
     * @param {string} $roomId Room id in Qbix (last segment of stream name).
     *  If it is empty, then a new room is created.
     * @param {string} $resumeClosed Use existing stream if it exists
     * @param {integer|string} $writeLevel To be used
     * @return {array} The keys are "stream", "created", "roomId", "socketServer"
     */
    static function getOrCreateRoomStream($publisherId, $roomId, $resumeClosed, $accessLevels = ['readLevel' => 40, 'writeLevel' => 23, 'adminLevel' => 20], $permissions = ['mic', 'camera', 'screen']) {
        if (empty($publisherId)) {
            throw new Q_Exception_RequiredField(array('field' => 'publisherId'));
        }

        if(count($accessLevels) < 3) {
            $accessLevels = array_merge (['readLevel' => 40, 'writeLevel' => 23, 'adminLevel' => 20], $accessLevels);
        }

        $webrtcStream = Media_WebRTC::getOrCreateStream($publisherId, $roomId, $resumeClosed, $permissions, $accessLevels);

        if (!$webrtcStream) {
            throw new Exception('Something went wrong when creating WebRTC stream');
        }

        if ($resumeClosed) {
            $webrtcStream->closedTime = null;
            $webrtcStream->changed();

            $endTime = $webrtcStream->getAttribute('endTime');
            $startTime = $webrtcStream->getAttribute('startTime');
            if($startTime == null || ($endTime != null && round(microtime(true) * 1000) > $endTime)) {
                $startTime =  round(microtime(true) * 1000);
                $webrtcStream->setAttribute('startTime', $startTime);
                $webrtcStream->clearAttribute('endTime');
                $webrtcStream->save();
            }
        }

        return $webrtcStream;
    }

    static function createWaitingRoomStream() {
        $userId = Users::loggedInUser(true)->id;
        $fields = array(
            'title' => Streams::displayName($userId) . " waiting room"
        );

        $fields['readLevel'] = 0;
        $fields['writeLevel'] = 0;
        $fields['adminLevel'] = 0;

        $stream = Streams::create($userId, $userId, 'Media/webrtc', $fields);
        if($stream) {
            $stream->setAttribute('isWaitingRoom', true);
            $stream->save();
            return $stream;
        } else {
            throw new Exception("Something went wrong when creating waiting room");
        }
    }

    static function getRoomStreamByInviteToken($invite) {
        return Streams_Stream::fetch(Users::loggedInUser(true)->id, $invite->publisherId, $invite->streamName, true);
    }

    static function getRoomStreamRelatedTo($toPublisherId, $toStreamName, $fromPublisherId, $fromStreamName, $type, $resumeClosed) {
        if (empty($toPublisherId)) {
            throw new Q_Exception_RequiredField(array('field' => 'publisherId'));
        }

        $fields = array(
            "toPublisherId" => $toPublisherId,
            "toStreamName" => $toStreamName,
            "type" => $type
        );

        if(!is_null($fromPublisherId)) {
            $fields['fromPublisherId'] = $fromPublisherId;
        }
        if(!is_null($fromStreamName)) {
            $fields['fromStreamName'] = $fromStreamName;
        }
        
        $lastRelated = Streams_RelatedTo::select()->where($fields)->orderBy("weight", false)->limit(1)->fetchDbRow();

        if ($lastRelated) {
            $webrtcStream = Streams_Stream::fetch(null, $lastRelated->fields['fromPublisherId'], $lastRelated->fields['fromStreamName']);

            if ($webrtcStream && $resumeClosed) {
                $webrtcStream->closedTime = null;
                $webrtcStream->changed();

                $endTime = $webrtcStream->getAttribute('endTime');
                $startTime = $webrtcStream->getAttribute('startTime');
                if($startTime == null || ($endTime != null && round(microtime(true) * 1000) > $endTime)) {
                    $startTime =  round(microtime(true) * 1000);
                    $webrtcStream->setAttribute('startTime', $startTime);
                    $webrtcStream->clearAttribute('endTime');
                    $webrtcStream->save();
                }


            }

            if (!$webrtcStream->testWriteLevel('join')) {
                throw new Users_Exception_NotAuthorized();
            }
            return $webrtcStream;
        }


        return null;
    }

    /**
     * @method getTwilioTurnCredentials Retrievs credentials for using twilio turn server
     * @return {Array|null}
     * @throws Twilio_Exception
     */
    static function getTwilioTurnCredentials() {
        $twilioAccountSid = Q_Config::expect('Media', 'twilio', 'accountSid');
        $twilioApiKey = Q_Config::expect('Media', 'twilio', 'apiKey');
        $twilioApiSecret = Q_Config::expect('Media', 'twilio', 'apiSecret');
        $authToken = Q_Config::expect('Media', 'twilio', 'authToken');

        $twilio = new Client($twilioApiKey, $twilioApiSecret, $twilioAccountSid);

        $token = $twilio->tokens->create();

        return $token->iceServers;
    }

    /**
     * Fetch Media/webrtc stream and check permissions
     * @method fetchStream
     * @param {string} $publisherId publisher of stream
     * @param {string} $roomId Room Id of room (last part of stream name)
     * @param {string} $resumeClosed Return existing stream if it exist, or create new otherwise
     * @return {array} The keys are "stream", "created", "roomId", "socketServer"
     */
    static function fetchStream($publisherId, $roomId, $resumeClosed) {
        if (!empty($roomId)) {
            $streamName = "Media/webrtc/$roomId";
            $stream = Streams_Stream::fetch(Users::loggedInUser(true)->id, $publisherId, $streamName);
            if (!$stream) {
                return null;
            }
            if (!$stream->testReadLevel("max")) {
                throw new Exception("Access denied");
            }
            if (($stream && $resumeClosed) || ($stream && empty($stream->closedTime))) {

                if($resumeClosed) {
                    $stream->closedTime = null;
                    $stream->changed();

                }

                return $stream;
            }
        }

        return null;
    }

    /**
     * Create Media/webrtc stream
     * @method createStream
     * @param {string} $publisherId publisher of stream
     * @param {string} $roomId Room Id of room (last part of stream name)
     * @param {string} $resumeClosed Return existing stream if it exist, or create new otherwise
     * @return {array} The keys are "stream", "created", "roomId", "socketServer"
     */
    static function createStream($publisherId, $roomId, $accessLevels, $permissions) {
        $streamName = null;

        if (!empty($roomId)) {
            $streamName = "Media/webrtc/$roomId";
        }

        // check quota
        //UNCOMMENT BEFORE COMMIT$quota = Users_Quota::check($publisherId, '', 'Media/webrtc', true, 1, Users::roles());
        $text = Q_Text::get('Media/content');
        $fields = array(
            'title' => Q::interpolate($text['webrtc']['streamTitle'], array(Streams::displayName($publisherId)))
        );

        $fields['name'] = $streamName;
        $fields['readLevel'] = $accessLevels['readLevel'];
        $fields['writeLevel'] = $accessLevels['writeLevel'];
        $fields['adminLevel'] = $accessLevels['adminLevel'];

        $stream = Streams::create($publisherId, $publisherId, 'Media/webrtc', $fields);

        if (!$stream) {
            throw new Q_Exception("Failed during create webrtc stream");
        }

        foreach($permissions as $permissionName) {
            $stream->addPermission($permissionName);
        }
        $stream->changed();
        $stream->save();

        $access = new Streams_Access();
        $access->publisherId = $stream->fields['publisherId'];
        $access->streamName = $stream->fields['name'];
        $access->ofContactLabel = 'Users/hosts';
        if(!$access->retrieve()) {
            $access->adminLevel = Streams::$ADMIN_LEVEL['manage'];
            $access->writeLevel = Streams::$WRITE_LEVEL['max'];
            $access->readLevel = Streams::$READ_LEVEL['max'];
            $access->save();
        }

        $access = new Streams_Access();
        $access->publisherId = $stream->fields['publisherId'];
        $access->streamName = $stream->fields['name'];
        $access->ofContactLabel = 'Users/screeners';
        if(!$access->retrieve()) {
            $access->readLevel = Streams::$WRITE_LEVEL['max'];
            $access->writeLevel = Streams::$WRITE_LEVEL['edit'];
            $access->save();
        }

        return $stream;
        // set quota
        /*UNCOMMENT BEFORE COMMIT if ($stream && $quota instanceof Users_Quota) {
            $quota->used();

            return $stream;
        }*/
    }

    /**
     * Create or fetch Media/webrtc stream
     * @method getOrCreateStream
     * @param {string} $publisherId publisher of stream
     * @param {string} $roomId Room Id of room (last part of stream name)
     * @param {string} $resumeClosed Return existing stream if it exist, or create new otherwise
     * @return {array} The keys are "stream", "created", "roomId", "socketServer"
     */
    static function getOrCreateStream($publisherId, $roomId, $resumeClosed, $permissions, $accessLevels) {
        if(strpos($roomId ? $roomId : '', 'Media/webrtc/') !== false) {
            $roomId = explode('/', $roomId)[2];
        }

        $existingRoomStream = null;
        if(!empty($roomId)) {
            $existingRoomStream = self::fetchStream($publisherId, $roomId, $resumeClosed);
        }

        if(!is_null($existingRoomStream)) {
            return $existingRoomStream;
        } else {
            return self::createStream($publisherId, $roomId, $accessLevels, $permissions);
        }

        throw new Q_Exception("Failed during create webrtc stream");
    }

    /**
     * Gives the user access to WebRTC room (stream of type Media/webrtc) by creating access record in the DB
     * This method is called when user is currently in the waiting room before joining WebRTC room
     * @method admitUserToRoom
     * @param {string} $publisherId publisherId of stream (type: Media/webrtc)
     * @param {string} $streamName streamName of WebRTC stream
     * @param {string} $waitingRoomStreamName stream name of the user's waiting room where user is waiting before joining the WebRTC room
     * @param {string} $userIdToAdmit id of a user to whom access to WebRTC room will be given
     */
    static function admitUserToRoom($publisherId, $streamName, $waitingRoomStreamName, $userIdToAdmit) {
        $webrtcStream = Streams_Stream::fetch(Users::loggedInUser(true)->id, $publisherId, $streamName);
        if(!$webrtcStream->testAdminLevel('manage')) {
            throw new Users_Exception_NotAuthorized();
        }

        if($userIdToAdmit == $publisherId) {
            throw new Exception("Admin's permissions/access cannot be changed");
        }

        $access = new Streams_Access();
        $access->publisherId = $publisherId;
        $access->streamName = $streamName;
        $access->ofUserId = $userIdToAdmit;
        $access->retrieve();
        $access->readLevel = Streams::$READ_LEVEL['max'];
        $access->writeLevel = Streams::$WRITE_LEVEL['relate'];
        $access->adminLevel = Streams::$ADMIN_LEVEL['invite'];
        $access->save();

        $waitingRoomStream = Streams_Stream::fetch($userIdToAdmit, $userIdToAdmit, $waitingRoomStreamName);

        //print_r($waitingRoomStream);die;
        if (!is_null($waitingRoomStream)) {
            $waitingRoomStream->setAttribute('status', 'accepted');    
            //$waitingRoomStream->close($userIdToAdmit);
            $waitingRoomStream->changed();
            //$waitingRoomStream->save();

            $waitingRoomStream->post($userIdToAdmit, array(
                'type' => 'Media/webrtc/admit',
                'instructions' => ['msg' => 'You will be joined to the room now']
            ));
        }
    }

    /**
     * Cancels access to webrtc room for specific participant by his user id by changing access record (readLevel) in DB
     * This method is called when the host clicks "Put in waiting room" near the WebRTC participant
     * @method cancelAccessToRoom
     * @param {string} $publisherId publisherId of stream (type: Media/webrtc)
     * @param {string} $streamName streamName of WebRTC stream
     * @param {string} $userId user id of participant to whom access will be canceled
     */
    static function cancelAccessToRoom($publisherId, $streamName, $userId) {
        $webrtcStream = Streams_Stream::fetch(Users::loggedInUser(true)->id, $publisherId, $streamName);
        if(!$webrtcStream->testAdminLevel('manage')) {
            throw new Users_Exception_NotAuthorized();
        }

        if($userId == $publisherId) {
            throw new Exception("Admin's permissions/access cannot be changed");
        }

        $access = new Streams_Access();
        $access->publisherId = $publisherId;
        $access->streamName = $streamName;
        $access->ofUserId = $userId;
        if($access->retrieve()){
            $access->readLevel = Streams::$READ_LEVEL['none'];
            $access->save();
        }

        $signalingServer = self::getSignalingSocketServerAddress();

        if($signalingServer) {
            Q_Utils::sendToNode(array(
                "Q/method" => "Media/webrtc/putInWaitingRoom",
                "roomPublisherId" => $publisherId,
                "userId" => $userId,
                "roomId" => explode('/', $streamName)[2],
                "soocketRoomId" => $publisherId . '_' . explode('/', $streamName)[2],
            ), $signalingServer);
        }
    }

    /**
     * Removed user's waiting room. This method is called when the host dismisses user from joining WebRTC room 
     * by clicking "Remove" on the user's waiting room in the list of waiting rooms.
     * Closing waiting room doesn't mean that user will not be able to ask to join again (then waiting room will be reopened)
     * @method closeWaitingRoom
     * @param {string} $publisherId publisherId of stream (type: Media/webrtc)
     * @param {string} $streamName streamName of WebRTC stream
     * @param {string} $waitingRoomStreamName stream name of the stream for waiting room where user is waiting before joining the WebRTC room
     * @param {string} $waitingRoomUserId id of the user who created the waiting room
     */
    static function closeWaitingRoom($publisherId, $streamName, $waitingRoomStreamName, $waitingRoomUserId) {
        $webrtcStream = Streams_Stream::fetch(Users::loggedInUser(true)->id, $publisherId, $streamName);
        if(!$webrtcStream->testAdminLevel('manage')) {
            throw new Users_Exception_Authorized();
        }

        $waitingRoomStream = Streams_Stream::fetch($waitingRoomUserId, $waitingRoomUserId, $waitingRoomStreamName);

        if (!is_null($waitingRoomStream)) {
            $waitingRoomStream->setAttribute('status', 'closed');            
            $waitingRoomStream->post($waitingRoomUserId, array(
                'type' => 'Media/webrtc/close',
                'instructions' => ['msg' => 'Your waiting room was closed.']
            ));
            $waitingRoomStream->changed();
            $waitingRoomStream->save();
            $waitingRoomStream->close($waitingRoomUserId);
        }
    }

    static function getSignalingSocketServerAddress() {
        $nodeh = Q_Config::expect('Q', 'nodeInternal', 'host');
        $nodep = Q_Config::expect('Q', 'nodeInternal', 'port');
        return $nodep && $nodeh ? "http://$nodeh:$nodep/Q/webrtc" : false;
    }

    /**
     * Create or fetch Media/webrtc stream
     * @method mergeRecordings
     * @param {string} $publisherId publisher of stream
     * @param {string} [$roomId=''] Room Id of room (last part of stream name)
     * @return {array} The keys are "stream", "created", "roomId", "socketServer"
     */
    static function mergeRecordings($publisherId, $roomId = '') {

        if(strpos($roomId ? $roomId : '', 'Media/webrtc/') !== false) {
            $roomId = explode('/', $roomId)[2];
        }

        $app = Q::app();
        $recsPath = (defined('APP_FILES_DIR') ? APP_FILES_DIR : Q_FILES_DIR).DS.$app.DS.'uploads'.DS.'Media'.DS.'webrtc_rec'.DS.$roomId;

        $startTimes = array_diff(scandir($recsPath), array('.', '..'));

        //check if call already merged
        $callsToMerge = [];
        foreach ($startTimes as $dir) {
            if (!file_exists($recsPath.DS.$dir.DS.'audio.mp3')) {
                array_push($callsToMerge, $dir);
            }
        }

        $recordings = [];
        //scan calls that were happened at specific times
        foreach ($callsToMerge as $callTime) {
            $callUsers = array_diff(scandir($recsPath.DS.$callTime), array('.', '..'));

            //scan users directories
            foreach ($callUsers as $usersRecordingsDir) {
                $fileInfo = pathinfo($usersRecordingsDir);
                if($fileInfo['extension'] == 'json') {
                    $recInfo = file_get_contents($recsPath.DS.$callTime.DS.$usersRecordingsDir);
                    $filename = explode('_', $fileInfo['filename']);
                    $recordings[$callTime][$filename[0] . "\t" . $filename[1]] = json_decode($recInfo, true);
                    continue;
                } else {
                    continue;
                }
            }

        }

        if(count($recordings) == 0) {
            return false;
        }

        function isStartRecording($username, $users) {
            foreach ($users as $key => $recording) {
                if(!array_key_exists('parallelRecordings', $recording)) {
                    continue;
                }

                foreach ($recording['parallelRecordings'] as $parallelRecording) {
                    if($parallelRecording['participant']['username'] == $username)
                    return false;
                }
            }

            return true;
        }

        function getPath($parallelRecording, $room) {
            foreach ($room as $username => $info) {

                if($username == $parallelRecording['participant']['username']) {
                    return $room[$username];
                }
            }
            return null;
        }

        function setParallelRecPath($room) {
            foreach ($room as $username => $info) {
                if(!array_key_exists('parallelRecordings', $info)) {
                    continue;
                }
                foreach ($info['parallelRecordings'] as $key => $parallelRecording) {
                    $user = getPath($parallelRecording, $room);
                    if(!is_null($user)) {
                        $info['parallelRecordings'][$key]['path'] = $user['path'];
                        $info['parallelRecordings'][$key]['recordingInstance'] = $user;
                    }
                }

                $room[$username]['parallelRecordings'] = $info['parallelRecordings'];


            }

            return $room;
        }


        foreach ($recordings as $key => $room) {
            $recordings[$key] = setParallelRecPath($room);

            $startRecording = null;
            foreach ( $recordings[$key] as $username => $info) {
                if(isStartRecording($username, $room)) {
                    $startRecording = $info;
                }
            }

            $localRecordDir = $recsPath . '/' . $key;
            $inputsNum = 1;
            $inputsLet = 'a';
            $offsetFromFirstRec = 0;
            $offsets = [];
            $processedRecsToSkip = [];
            $offsetsIndexes = [];
            $inputs = [];
            array_push($inputs, '-i', $startRecording['path']);
            array_push($startRecording['participant']['username'], $processedRecsToSkip);
            $currentRecording = $startRecording;
            while($currentRecording != null) {
                if(count($currentRecording['parallelRecordings']) == 0) {
                    $currentRecording = null;
                    continue;
                }

                foreach($currentRecording['parallelRecordings'] as $paralelRec) {
                    if(array_search($paralelRec['participant']['username'], $processedRecsToSkip) !== false) {
                        continue;
                    }

                    array_push($inputs, '-i', $paralelRec['path']);
                    $inputsLet =  chr(ord(substr($inputsLet, 0)) + 1);
                    array_push($offsets, '[' . $inputsNum . ']adelay=' . ($offsetFromFirstRec + floatval($paralelRec['time'])) . '|' . ($offsetFromFirstRec + floatval($paralelRec['time'])) . '[' . $inputsLet . ']');
                    array_push($offsetsIndexes, '[' . $inputsLet . ']');

                    $inputsNum++;
                    array_push($processedRecsToSkip, $paralelRec['participant']['username']);
                }

                $parallelRecThatEndsLast = array_reduce($currentRecording['parallelRecordings'], function($prev, $current) {
                        return $current['recordingInstance']['stopTime'] > $prev['recordingInstance']['stopTime'] ? $current : $prev;
                });

                $offsetFromFirstRec = floatval($offsetFromFirstRec) + floatval($parallelRecThatEndsLast['time']);
                $currentRecording = $parallelRecThatEndsLast['stopTime'] > $currentRecording['stopTime'] ? $parallelRecThatEndsLast['recordingInstance'] : null;
            }

            array_unshift($inputs,'-y');

            $amix = '[0]';
            foreach($offsetsIndexes as  $offset) {
                $amix .= $offset;
            }

            $delays = implode(';', $offsets);
            array_push($inputs, '-filter_complex', '"' . $delays . ($delays != ''? ';' : '') . $amix . 'amix=inputs=' . $inputsNum . '"');
            array_push($inputs,
                '-acodec', 'libmp3lame',
                $localRecordDir . '/audio.mp3');
            $output=null;
            $retval=null;
            $command = "/usr/bin/ffmpeg " . (implode(' ', $inputs)) . ' 2>&1';
            exec($command,$output);
            print_r($command);
            print_r($output);die;
        }
    }
};