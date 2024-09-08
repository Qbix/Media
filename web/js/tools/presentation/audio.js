(function (Q, $, window, undefined) {
    /**
     * @module Streams-tools
     */

    /**
     * Renders audio taking place in a presentation
     * in which the user has at least testReadLevel("content")
     * @class Media presentation audio
     * @constructor
     * @param {Object} [options] any options for the tool
     * @param {Object} options.publisherId
     * @param {Object} options.streamName
     */
    Q.Tool.define("Media/presentation/audio", function(options) {
            var tool = this;
            var state = tool.state;
            Q.Streams.retainWith(tool).get(state.publisherId, state.streamName, function (err, stream) {
                if (err) {
                    return;
                }

                Q.Template.render('Media/presentation/audio', {
                    title: stream.fields.title
                }).then(function (html) {
                    Q.replace(tool.element, html);

                    $(".Media_presentation_audio", tool.element).tool("Q/audio", {
                        url: stream.fileUrl()
                    }).activate(function () {
                        var audioTool = this;
                        stream.onEphemeral('Streams/play').set(function (ephemeral) {
                            var pos = Q.getObject("pos", ephemeral);
                            if (!isNaN(parseFloat(pos))) {
                                audioTool.setCurrentPosition(pos);
                            }
                            audioTool.play()
                        }, tool);
                        stream.onEphemeral('Streams/pause').set(function (ephemeral) {
                            var pos = Q.getObject("pos", ephemeral);
                            if (!isNaN(parseFloat(pos))) {
                                audioTool.setCurrentPosition(pos);
                            }
                            audioTool.pause()
                        }, tool);
                        stream.onEphemeral('Streams/seek').set(function (ephemeral) {
                            var pos = Q.getObject("pos", ephemeral);
                            if (!isNaN(parseFloat(pos))) {
                                audioTool.setCurrentPosition(pos);
                            }
                        }, tool);
                    });
                });
            });
        },
        {

        },
        {
        });

})(Q, Q.jQuery, window);

Q.Template.set('Media/presentation/audio',
    `<div class="Media_presentation_screen Media_presentation_audio_screen">
        <div class="Media_presentation_hero">
            <div class="Media_presentation_audio"></div>
            <div class="Media_presentation_caption Media_presentation_audio_caption">{{content}}</div>
        </div>
    </div>`
);