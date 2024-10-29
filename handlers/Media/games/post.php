<?php

/**
 * @module Media
 */

function Media_games_post($params = array())
{
	$params = array_merge($_REQUEST, $params);

    $loggedInUser = Users::loggedInUser(true);
	$loggedInUserId = $loggedInUser->id;
    $slotNames = Q_Request::slotNames();

    $games = ['quickdraw', 'othergame'];

    if(array_search($slotNames[0], $games) === false) {
        throw new Exception("Game doesn't exist");
    }

    $gameName = $slotNames[0];
    $gameStream = Streams::create($loggedInUserId, $loggedInUserId, 'Media/games/' . $gameName, ['readLevel'=> 40, 'writeLevel' => 40]);

    if($gameName == 'quickdraw') { // add default teams
        $gameStream->setAttribute('teams', array(
            0 => array('id' => 'team1', 'name' => 'Team 1'),
            1 => array('id' => 'team2', 'name' => 'Team 2')
        ));
        $gameStream->save();
    }

    return Q_Response::setSlot($gameName, $gameStream);
    
    
}