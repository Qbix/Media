(function (Q, $, window, undefined) {
    /**
     * @module Streams-tools
     */

    /**
     * Renders video taking place in a presentation
     * in which the user has at least testReadLevel("content")
     * @class Media presentation video
     * @constructor
     * @param {Object} [options] any options for the tool
     * @param {Object} options.publisherId
     * @param {Object} options.streamName
     */
    Q.Tool.define("Media/presentation/video", function(options) {
            var tool = this;
            var state = tool.state;
            Q.Streams.retainWith(tool).get(state.publisherId, state.streamName, function (err, stream) {
                if (err) {
                    return;
                }

                Q.Template.render('Media/presentation/video', {
                    title: stream.fields.title
                }).then(function (html) {
                    Q.replace(tool.element, html);

                    $(".Media_presentation_video", tool.element).tool("Q/video", {
                        url: stream.fileUrl()
                    }).activate(function () {
                        var videoTool = this;
                        stream.onEphemeral('Streams/play').set(function (ephemeral) {
                            var pos = Q.getObject("pos", ephemeral);
                            if (!isNaN(parseFloat(pos))) {
                                videoTool.setCurrentPosition(pos);
                            }
                            videoTool.play()
                        }, tool);
                        stream.onEphemeral('Streams/pause').set(function (ephemeral) {
                            var pos = Q.getObject("pos", ephemeral);
                            if (!isNaN(parseFloat(pos))) {
                                videoTool.setCurrentPosition(pos);
                            }
                            videoTool.pause()
                        }, tool);
                        stream.onEphemeral('Streams/seek').set(function (ephemeral) {
                            var pos = Q.getObject("pos", ephemeral);
                            if (!isNaN(parseFloat(pos))) {
                                videoTool.setCurrentPosition(pos);
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

Q.Template.set('Media/presentation/video',
    `<div class="Media_presentation_screen Media_presentation_video_screen">
        <div class="Media_presentation_hero">
            <div class="Media_presentation_video"></div>
            <div class="Media_presentation_caption Media_presentation_video_caption">{{content}}</div>
        </div>
    </div>`
);