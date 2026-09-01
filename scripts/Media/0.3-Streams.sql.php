<?php

function Media_0_3_Streams()
{
    try {
        Streams::updateStreamNames(array(
            'Streams/webrtc/live' => 'Media/live'
        ));
    } catch (Exception $e) {
        echo "NOTE: " . $e->getMessage() . PHP_EOL . "Continuing." . PHP_EOL;
    }
}

Media_0_3_Streams();