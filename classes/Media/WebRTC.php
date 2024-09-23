<?php
require MEDIA_PLUGIN_DIR.DS.'vendor'.DS.'autoload.php';

use Twilio\Jwt\AccessToken;
use Twilio\Jwt\Grants\VideoGrant;
use Twilio\Rest\Client;
/**
 * @module Media
 */

interface Media_WebRTC_Interface
{
    /**
     * Interface that an adapter must support
     * to implement the Media_WebRTC class.
     * @class Media_WebRTC_Interface
     * @constructor
     */

    /**
     * @method getOrCreateRoomStream
     * @param {string} $publisherId Id of room's publisher/initiator
     * @param {string} $roomId Room id in Qbix (last marp of stream name)
     * @return {Object}
     */
    function getOrCreateRoomStream($publisherId, $roomId, $resumeClosed, $accessLevels, $permissions);

}

/**
 * Base class for Media_WebRTC_... adapters
 *
 * @class Media_WebRTC
 */
abstract class Media_WebRTC
{

    /**
     * @method getTwilioTurnCredentials Retrievs credentials for using twilio turn server
     * @return {Array|null}
     * @throws Twilio_Exception
     */
    function getTwilioTurnCredentials() {
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
        $streamName = null;

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