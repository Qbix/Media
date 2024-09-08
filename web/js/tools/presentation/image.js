(function (Q, $, window, undefined) {

var Streams = Q.Streams;
var Users = Q.Users;
var Media = Q.Media;

/**
 * @module Streams-tools
 */

/**
 * Renders an image taking place in a presentation
 * in which the user has at least testReadLevel("content")
 * @class Media presentation image
 * @constructor
 * @param {Object} [options] any options for the tool
 * @param {Object} options.publisherId
 * @param {Object} options.streamName
 */
Q.Tool.define("Media/presentation/image", function(options) {
    var tool = this;
    var state = tool.state;
    Streams.get(state.publisherId, state.streamName)
    .then(function (stream) {
        Q.Template.render('Media/presentation/image', {
            srcOriginal: stream.iconUrl("original.png"),
            srcLargest: stream.iconUrl("largestHeight"),
            content: stream.fields.title
        }).then(function (html) {
            tool.element.innerHTML = html;
        });
    });
},
{
    
},
{
});

})(Q, Q.jQuery, window);
    
Q.Template.set('Media/presentation/image',
    '<div class="Media_presentation_screen Media_presentation_image_screen">'
    + '<div class="Media_presentation_hero">'
        + '<img class="Q_no_lazyload" src="{{srcOriginal}}" onerror="this.onerror=null;this.src=\'{{srcLargest}}\'">'
        + '<div class="Media_presentation_caption Media_presentation_image_caption">{{content}}</div>'
    + '</div>'
    + '</div>'
);