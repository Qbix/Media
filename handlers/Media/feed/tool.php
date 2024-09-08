<?php
/**
 * @module Media-tools
 */

/**
 * Renders interface for Media/feed
 * @class Media feed
 * @constructor
 * @param {Object} [$options] this is an object that contains parameters for this function
 *   @param {String} $options.publisherId The publisher id
 *   @param {String} $options.streamName The name of the stream
 */
function Media_feed_tool($options) {
	$stream = null;
	if (!empty($options['stream'])) {
		$stream = $options['stream'];
		$stream->addPreloaded();
		$options['publisherId'] = $stream->publisherId;
		$options['streamName'] = $stream->name;
		unset($options['stream']);
	}

	Q_Response::setToolOptions($options);
	Q_Response::addScript('{{Media}}/js/tools/feed.js', "Media");
	Q_Response::addStylesheet('{{Media}}/css/tools/feed.css', "Media");
	return '';
}