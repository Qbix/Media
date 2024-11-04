<?php

/**
 * @module Media
 */

function Media_teams_post($params = array())
{
	$params = array_merge($_REQUEST, $params);

    $loggedInUser = Users::loggedInUser(true);
	$loggedInUserId = $loggedInUser->id;
	$publisherId = Q::ifset($params, 'publisherId', null);
	$streamName = Q::ifset($params, 'streamName', null);

    if(!$publisherId || !$streamName) {
        throw new Exception("publisherId and streamName are required params");
    }

    if(Q_Request::slotName('joinGameStream')) {
        $gameStream = Streams_Stream::fetch(null, $publisherId, $streamName);
    
        if(is_null($gameStream)) {
            throw new Exception("No game found by specified params");
        }

        $gameStream->join();
        $gameStream->subscribe();

        $participants = Streams_Participant::select()->where(array( 'publisherId' => $publisherId, 'streamName' => $streamName, 'state' => 'participating'))->ignoreCache()->fetchDbRows();
       
        $meAsParticipant = $gameStream->participant();

        $gameStream->post($publisherId, array(
            'type' => 'Games/teams/userJoined',
            'instructions' => [
                'participant' => $meAsParticipant->fields
            ]
        ));

        return Q_Response::setSlot('joinGameStream', $participants);
    } else if(Q_Request::slotName('addTeam')) {

	    $teamName = Q::ifset($params, 'teamName', null);

        if(is_null($teamName)) {
            throw new Exception("No name specified");
        }

        $gameStream = Streams_Stream::fetch(null, $publisherId, $streamName);
    
        if(is_null($gameStream)) {
            throw new Exception("No game found by specified params");
        }

        $teams = $gameStream->getAttribute('teams');

        array_push($teams, array(
            'id' => generateRandomString(),
            'name' => $teamName
        ));

        $gameStream->setAttribute('teams', $teams);
        $gameStream->save();

        $gameStream->post($publisherId, array(
            'type' => 'Games/teams/newTeamAdded',
            'instructions' => []
        ));

        return Q_Response::setSlot('addTeam', $teams);
    }   
}

function generateRandomString($length = 5) {
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $charactersLength = strlen($characters);
    $randomString = '';
    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[random_int(0, $charactersLength - 1)];
    }
    return $randomString;
}