<?php

function Media_webrtc_response_log($params = array()) {
    $params = array_merge($_REQUEST, $params);

    $loggedUserId = Users::loggedInUser(true)->id;
    $roomId = Q::ifset($params, 'roomId', null);
    $startTime = Q::ifset($params, 'startTime', null);
    $participant = Q::ifset($params, 'participant', null);
    $participantInfo = preg_split('/\t/', $participant);

    $logsDirectory = str_replace('/', DS, Q_Config::get('Q', 'logs', 'directory', 'Q/logs'));
    $path = (defined('APP_FILES_DIR') ? APP_FILES_DIR : Q_FILES_DIR).DS.$logsDirectory.DS.'webrtc';

    $folderName = $roomId . '_' . $startTime;

    $path .= DS.$folderName;
    $filename = $participantInfo[0] . '_' . $participantInfo[1] . '.log';

    if (file_exists($path.DS.$filename)) {
        $logContent = file_get_contents($path.DS.$filename);
        $jsonToParse = '[' . $logContent . ']';
        //logs are appended to file without any preprocessing of logfile (decoding/encoding json) to avoid loading CPU
        try {
            $json = json_decode($jsonToParse);
        } catch (Exception $e) {
            throw new Exception($e);
        }
        
        if(count($json) != 0) {
            Q_Response::setSlot("log", json_encode($json));
        }
    } else {
        print_r('does not exist');die();
    }
}