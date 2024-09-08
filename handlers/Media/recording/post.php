<?php

function Media_recording_post($params = array())
{
	$params = array_merge($_REQUEST, $params);
	$loggedInUserId = Users::loggedInUser(true)->id;

	if (Q_Request::slotName('recording')) { //create stream for recording
		$publisherId = Q::ifset($params, 'publisherId', $loggedInUserId);
		$streamName = Q::ifset($params, 'streamName', null);

		$webrtcStream = Streams_Stream::fetch($publisherId, $publisherId, $streamName);

		if (!$webrtcStream) {
			throw new Q_Exception("Please pass WebRTC stream's name and publisher id as params for this request.");
		}

		$response = [];

		$recordingStream = Streams::create($loggedInUserId, $loggedInUserId, 'Media/webrtc/recording', array('writeLevel' => 23));
		$recordingStream->subscribe();
		$recordingStream->join(['subscribed' => true]);

		$recordingStream->relateTo((object)array(
			"publisherId" => $publisherId,
			"name" => $streamName
		), "Media/webrtc/recording", $loggedInUserId, array(
			"inheritAccess" => false,
			"weight" => time()
		));

		$recordingStream->relateTo(
			Media::userRecordingsStream(), 
			"Media/webrtc/recording",
			$loggedInUserId,
			array(
				"inheritAccess" => false,
				"weight" => time()
			)
		);

		if (is_null($recordingStream)) {
			throw new Q_Exception("Something went wrong");
		}

		$response['recordingStream'] = $recordingStream;

		Q_Response::setSlot("recording", $response);
	} else if (Q_Request::slotName('processRecording')) {

		$publisherId = Q::ifset($params, 'publisherId', null);
		$streamName = Q::ifset($params, 'streamName', null);
		$path = Q::ifset($params, 'path', null);

		if(!$streamName || !$publisherId || !$path) {
            throw new Exception('streamName, publisherId and path are required');
        }

		$recordingStream = Streams_Stream::fetch($loggedInUserId, $publisherId, $streamName);
        if(!$recordingStream->testAdminLevel('manage')) {
            throw new Exception('Your are not authorized to do this action');
        }

		$paths = $recordingStream->getAttribute('paths', []);

		if(count($paths) == 0) {
			throw new Exception('Nothing to process');
		}
		
		$pathExists = false;
		foreach($paths as &$item) {
			if($item['path'] == $path) {
				$pathExists = &$item;
				break;
			}
		}

		if($pathExists === false) {
			throw new Exception('path is not valid');
		}

		$appName = Q::app();

		$folderPath = APP_DIR . '/files/' . $appName . $path . '/';

		if (!file_exists($folderPath)) {
			throw new Exception('path does not exist');
		}
		
		// Get all files in the folder
		$allFiles = glob($folderPath . '*');

		if (count($allFiles) == 0) {
			throw new Exception('Chunks not found');
		}

		// Filter out files without extensions
		$files = array_filter($allFiles, function ($file) {
			return is_file($file) && pathinfo($file, PATHINFO_EXTENSION) === '';
		});

		// Sort files by filename (timestamp)
		natsort($files);
		
		// Create and write the sorted filenames to a text file
		//file_put_contents($outputFilePath, implode(PHP_EOL, $fileLines));
		$pathData = explode('/', $files[count($files) - 1]);
		$fileName = $pathData[count($pathData) - 1];
		$cmd = "cat " . implode(' ', $files) . " > $folderPath$fileName.webm 2>&1; echo $?";
		$combineResult = shell_exec($cmd);
		if (!file_exists($folderPath . "$fileName.webm")) {
			throw new Exception($combineResult);
		}

		$pathExists['recFile'] = $path . "/$fileName.webm";
		$recordingStream->setAttribute('paths', $paths);
		$recordingStream->changed();
		$recordingStream->save();

		Q_Response::setSlot("processRecording", $pathExists['recFile']);
	}

}