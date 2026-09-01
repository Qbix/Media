<?php

function Media_livestreamSubscription_response_subscription($params)
{
    $publisherId = Q_Request::requireFields('publisherId', true);
    $streamName = Q_Request::requireFields('streamName', true);
    $userId = Users::loggedInUser(true)->id;

    $subscription = Streams_Subscription::select('*')
        ->where(array(
            'publisherId' => $publisherId,
            'streamName' => $streamName,
            'ofUserId' => $userId
        ))
        ->limit(1)
        ->fetchDbRow();

    return compact('subscription');
}