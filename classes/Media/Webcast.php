<?php

/**
 * Base class for Media_Webcast
 *
 * @class Media_Webcast
 */
class Media_Webcast
{

    /**
     * Fetch Media/webcast stream and check permissions
     * @method fetchStream
     * @param {string} $publisherId publisher of stream
     * @param {string} $roomId Room Id of room (last part of stream name)
     * @param {string} $resumeClosed Return existing stream if it exist, or create new otherwise
     * @return {array} The keys are "stream", "created", "roomId", "socketServer"
     */
    static function fetchStream($publisherId, $roomId, $resumeClosed = false) {
        if (!empty($roomId)) {
            $streamName = "Media/webcast/$roomId";
            $stream = Streams_Stream::fetch($publisherId, $publisherId, $streamName);
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
     * Create Media/webcast stream
     * @method createStream
     * @param {string} $publisherId publisher of stream
     * @param {string} $roomId Room Id of room (last part of stream name)
     * @param {string} $resumeClosed Return existing stream if it exist, or create new otherwise
     * @return {array} The keys are "stream", "created", "roomId", "socketServer"
     */
     static function createStream($publisherId, $roomId, $accessLevels = ['readLevel' => 40, 'writeLevel' => 23, 'adminLevel' => 20]) {
        $streamName = null;

        if (!empty($roomId)) {
            $streamName = "Media/webcast/$roomId";
        }

        $fields['name'] = $streamName;
        $fields['readLevel'] = $accessLevels['readLevel'];
        $fields['writeLevel'] = $accessLevels['writeLevel'];
        $fields['adminLevel'] = $accessLevels['adminLevel'];

        $stream = Streams::create($publisherId, $publisherId, 'Media/webcast', $fields);

        if (!$stream) {
            throw new Q_Exception("Failed during create webcast stream");
        }

        return $stream;
    }

    /**
     * Create or fetch Media/webcast stream
     * @method getOrCreateStream
     * @param {string} $publisherId publisher of stream
     * @param {string} $roomId Room Id of room (last part of stream name)
     * @param {string} $resumeClosed Return existing stream if it exist, or create new otherwise
     * @return {array} The keys are "stream", "created", "roomId", "socketServer"
     */
    static function getOrCreateStream($publisherId, $roomId, $accessLevels = ['readLevel' => 40, 'writeLevel' => 23, 'adminLevel' => 20]) {
        $streamName = null;

        if(strpos($roomId ? $roomId : '', 'Media/webcast/') !== false) {
            $roomId = explode('/', $roomId)[2];
        }

        $existingRoomStream = null;
        if(!empty($roomId)) {
            $existingRoomStream = self::fetchStream($publisherId, $roomId);
        }

        if(!is_null($existingRoomStream)) {
            return $existingRoomStream;
        } else {
            return self::createStream($publisherId, $roomId, $accessLevels);
        }

        throw new Q_Exception("Failed during create webcast stream");
    }
};