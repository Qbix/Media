(function (Q, $, window, undefined) {

    var Streams = Q.Streams;

    /**
     * @module Streams-tools
     */

    /**
     * Renders a webpage presentation using Q/webpage
     * @class Media presentation webpage
     * @constructor
     * @param {Object} [options]
     * @param {String} options.publisherId
     * @param {String} options.streamName
     */
    Q.Tool.define("Media/presentation/webpage", function (options) {
        var tool = this;
        var state = tool.state;

        Streams.retainWith(tool).get(state.publisherId, state.streamName, function (err, stream) {
            if (err) return;

            var url = stream.getAttribute("url");
            var innerWidth = parseInt(stream.getAttribute("innerWidth") || state.innerWidth || 0, 10) || null;

            Q.Template.render("Media/presentation/webpage", {
                'Q/webpage': {
                    url: url,
                    innerWidth: innerWidth
                },
                title: stream.getAttribute("title") || ""
            }, null, {
                tool: tool
            }).then(function (html) {
                Q.replace(tool.element, html);
                Q.activate(tool.element);
            });
        });
    }, {
        innerWidth: null
    }, {});

})(Q, Q.jQuery, window);

Q.Template.set("Media/presentation/webpage",
    `<div class="Media_presentation_screen Media_presentation_webpage_screen">
        <div class="Media_presentation_hero">
            {{{tool "Q/webpage"}}}
            <div class="Media_presentation_caption Media_presentation_webpage_caption">{{title}}</div>
        </div>
    </div>`
);