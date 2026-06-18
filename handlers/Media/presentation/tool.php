<?php

/**
 * Renders a Media/presentation stream,
 * including an interface to edit the presentation
 * for users who have the permissions to do so.
 * @param {array} $options
 * @param {string} $options.publisherId
 * @param {string} $options.streamName
 */
function Media_presentation_tool($options)
{
	Q_Response::addStylesheet('{{Media}}/css/tools/presentation.css', 'Media');
	Q_Response::addScript('{{Media}}/js/Media.js', 'Media');
    Q_Response::addScript('{{Media}}/js/tools/presentation.js', 'Media');

    // Bridge server config into the tool's client-side state.
    if (!isset($options['pexelsKey'])) {
        $options['pexelsKey']  = Q_Config::get('Media', 'gallery', 'pexelsKey',  null);
    }
    if (!isset($options['pixabayKey'])) {
        $options['pixabayKey'] = Q_Config::get('Media', 'gallery', 'pixabayKey', null);
    }

    Q_Response::setToolOptions($options);
    return '';
}