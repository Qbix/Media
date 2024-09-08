Q.page('Media/presentation', function () {

    var page = Q.getObject(Q.Media.pages.presentation) || {};
    var content = document.getElementById('content');
    if (page.mode === 'participant' || page.noFullscreen) {
        if (!Q.Pointer.clickedAtLeastOnce) {
            Q.alert(Q.text.Media.presentation.Alert, {
                title: ""
            });
        }
    } else {
        content.addEventListener('click', function () {
            Q.Visual.requestFullscreen(content);
        });
    }

    var presentation = page.presentation;
    if (presentation && presentation.publisherId && presentation.streamName) {
        return _showPresentation(presentation.publisherId, presentation.streamName);
    }

    Q.Streams.related.byTimestamps(
        page.calendar.publisherId,
        page.calendar.streamName,
        'Calendars/events',
        // events that started in the last 24 hours
        { min: Date.now() / 1000 - 60*60*24 },
        function (err, list) {
            var latestTimestamp = 0, latestItem = null;
            Q.each(list, function (i, item) {
                var now = Date.now() / 1000;
                if (item.timestamp < now) {
                    if (item.timestamp > latestTimestamp) {
                        latestTimestamp = item.timestamp;
                        latestItem = item;
                    }
                    return;
                }
                setTimeout(_showRelatedPresentation.bind(item), (item.timestamp - now) * 1000);
                // TODO: make Q/countdown tool appear 30 seconds before,
                // from config Media/presentation/countdown/seconds = 30
            });
            if (latestItem) {
                _showRelatedPresentation.call(latestItem);
            }
        }
    );

    function _showRelatedPresentation () {
        // get the first presentation related to event
        Q.Streams.related(
            this.publisherId,
            this.streamName, 
            'Media/presentations',
            true,
            { limit: 1 },
            function (err) {
                var ps = Q.first(this.relatedStreams);
                if (!ps) {
                    return; // there was no presentation
                }

                _showPresentation(ps.fields.publisherId, ps.fields.name);
            }
        );
    }

    function _showPresentation (publisherId, streamName) {
        // switch to new presentation
        var oldContainer = document.getElementById('content');
        var newContainer = document.createElement('div');
    
        newContainer.appendChild(Q.Tool.prepare('div', 'Media/presentation', {
            publisherId: publisherId,
            streamName: streamName,
            show: page.show,
            mode: page.mode
        }));
        Q.activate(Q.replace(oldContainer, newContainer));
    }

});
