<?php

/**
 * @module Media
 */

/**
 * Used to start a new Media/webrtc stream (a real time audio/video call)
 * @class HTTP Media webrtc
 * @method post
 * @param {array} [$_REQUEST] Parameters that can come from the request
 *   @param {string} $_REQUEST.publisherId  Required. The id of the user to publish the stream.
 *   @param {string} $_REQUEST.roomId Pass an ID for the room from the client, may already exist
 *   @param {string} $_REQUEST.closeManually If true, stream is not closed automatically by node.js
 * @return {void}
 */
function Media_youtube_post($params = array())
{
    $params = array_merge($_REQUEST, $params);
    $communityId = Q::ifset($_REQUEST, 'communityId', Users::communityId());

    error_log('Media_clipEditor_post handler', 4); 
    if($_SERVER["HTTP_USER_AGENT"] == "AssemblyAI-Webhook") {
        Q_Response::flushEarly();
        $name = Q::ifset($_REQUEST, 'name', null);
        $publisherId = Q::ifset($_REQUEST, 'publisher', null);
        if(is_null($name) || is_null($publisherId)) {
            return;
        }

        Q_Request::handleInput();
        $transcriptId = Q::ifset($_REQUEST, 'transcript_id', null);
        if (!$transcriptId || Q::ifset($_REQUEST, 'status', null) !== 'completed') {
            return '';
        }

        $stream = AI_ClipGenerator::getStream($publisherId, 'Media/ai/clips/' . $name);
        $stream->setAttribute('state', 'transcribed');
        $stream->changed();
        $stream->save();

        $saveDir = APP_FILES_DIR . DS . $communityId . DS . 'uploads' . DS . 'AI' . DS . 'transcriptions';
        error_log('before summerize');
        try {
            AI_ClipGenerator::summerize($transcriptId, $saveDir);
        } catch (Exception $e) {
            // Code to handle the error
            error_log("Caught exception: " . $e->getMessage(), 4);
        }



        $baseUrl = Q_Config::expect('Q', 'web', 'appRootUrl');
        $transcriptUrl = '/Q/uploads/AI/transcriptions/' . $transcriptId . '.transcript';
        $summeryUrl = '/Q/uploads/AI/transcriptions/' . $transcriptId . '.summary';

        $stream->setAttribute('transcriptUrl', $transcriptUrl);
        $stream->setAttribute('summeryUrl', $summeryUrl);
        $stream->setAttribute('state', 'summerized');
        error_log('after summerize', 4);
        $stream->changed();
        $stream->save();
        
        //$result = AI_ClipGenerator::summerize('a0630464-c040-4dc9-bbf9-e181217db253', $saveDir);
        return;
    }

    //$loggedInUserId = Users::loggedInUser(true)->id;
    //$publisherId = Q::ifset($params, 'publisherId', $loggedInUserId);

    if (Q_Request::slotName('processFile')) {
        $uploadDir = APP_FILES_DIR . DS . $communityId . DS. 'uploads' . DS . 'AI' . DS . 'transcriptions' . DS . 'processing'. DS;
        $targetFile = '';
        
        if (!empty($_FILES)) {
            $file = reset($_FILES);
            $fileName = basename($file["name"]);
            $ext = pathinfo($_FILES["fileToProcess"]["name"], PATHINFO_EXTENSION);
            $uniqueName = bin2hex(random_bytes(16));
            $newName = $uniqueName . "." . $ext;
            $targetFile = $uploadDir . $newName;
            // Create folder if it doesn't exist
          
            if (!is_dir($uploadDir)) {
                if (!mkdir($uploadDir, 0775, true) && !is_dir($uploadDir)) {
                    throw new Exception('Failed to create directory: ' . $uploadDir);
                }
            }
            // Move uploaded file from temp location to your folder
            if (!move_uploaded_file($_FILES["fileToProcess"]["tmp_name"], $targetFile)) {
                throw new Exception('Upload failed');
            } else {
                $stream = AI_ClipGenerator::createStream($targetFile, $fileName, $newName, 'Media/ai/clips/' . $uniqueName);
                $stream->join(['subscribed' => true]);
            }
        }
        
        return Q_Response::setSlot("processFile", ['stream' => $stream]);
    } 
}