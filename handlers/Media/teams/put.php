<?php

function Media_teams_put($params = array()) {
    $params = array_merge($_REQUEST, $params);

    $loggedUserId = Users::loggedInUser(true)->id;
    $publisherId = Q::ifset($params, 'publisherId', null);
    $streamName = Q::ifset($params, 'streamName', null);
    
    if(!$publisherId || !$streamName) {
        throw new Exception("publisherId and streamName, and teamId are required params");
    }

    if(Q_Request::slotName('switchTeam')) {

        $teamId = Q::ifset($params, 'teamId', null);
        if(!$teamId) {
            throw new Exception("teamId is required param");
        }

        $stream = Streams_Stream::fetch($loggedUserId, $publisherId, $streamName);
        $meAsParticipant = $stream->participant();

        if ($meAsParticipant) {
            $meAsParticipant->setExtra('teamId', $teamId);
            $meAsParticipant->save();
            $stream->post($publisherId, array(
                'type' => 'Games/teams/userChangedTeam',
                'instructions' => [
                    'userId' => $loggedUserId,
                    'teamId' => $teamId
                ]
            ));
        }

        Q_Response::setSlot('switchTeam', $meAsParticipant);
	} else if(Q_Request::slotName('changeTeamName')) {

        $teamId = Q::ifset($params, 'teamId', null);
        $newTeamName = Q::ifset($params, 'newTeamName', null);

        if(!$teamId || !$newTeamName) {
            throw new Exception("teamId and newTeamName are required params");
        }

        $gameStream = Streams_Stream::fetch($loggedUserId, $publisherId, $streamName);

        $teams = $gameStream->getAttribute('teams');

        foreach ($teams as $key => $value) {
            if ($value['id'] == $teamId) {
                $teams[$key]['name'] = $newTeamName;
            }
        }

        $gameStream->setAttribute('teams', $teams);
        $gameStream->save();

        $gameStream->post($publisherId, array(
            'type' => 'Games/teams/teamNameChanged',
            'instructions' => []
        ));

        Q_Response::setSlot('changeTeamName', $teams);
	}
}