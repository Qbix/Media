(function (Q, $, window, undefined) {

var Streams = Q.Streams;

/**
 * Full-screen presentation wrapper for Q/card/glossary.
 * No image support — definitions don't benefit from photos.
 *
 * @class Media/presentation/card/glossary
 */
Q.Tool.define("Media/presentation/card/glossary", function (options) {
    var tool = this, state = tool.state;
    if (state.inline || !state.publisherId) {
        var attrs = {};
        Q.each(state, function (k, v) {
            if (k !== 'publisherId' && k !== 'streamName' && k !== 'inline') attrs[k] = v;
        });
        Q.Template.render('Media/presentation/card/glossary', {
            title: state.title || '',
            'Q/card/glossary': attrs
        }, function (err, html) {
            if (err) return;
            Q.replace(tool.element, html);
            Q.activate(tool.element);
        });
        return;
    }
    Streams.retainWith(tool).get(state.publisherId, state.streamName,
    function (err, stream) {
        if (err) return;
        var attrs = stream.getAllAttributes();
        Q.Template.render('Media/presentation/card/glossary', {
            title: stream.fields.title,
            'Q/card/glossary': attrs
        }, function (err, html) {
            if (err) return;
            Q.replace(tool.element, html);
            Q.activate(tool.element);
        });
    });
}, { publisherId: null, streamName: null }, {});

})(Q, Q.jQuery, window);

Q.Template.set('Media/presentation/card/glossary',
    '<div class="Media_presentation_screen Media_presentation_card_screen">'
  + '<div class="Media_presentation_hero">'
  + '{{{tool "Q/card/glossary"}}}'
  + '<div class="Media_presentation_caption">{{title}}</div>'
  + '</div>'
  + '</div>'
);
