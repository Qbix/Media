(function (Q, $, window, undefined) {

var Streams = Q.Streams;

/**
 * Full-screen presentation wrapper for Q/card/stat.
 * Supports optional imageUrl / imageCredit from web search results.
 *
 * @class Media/presentation/card/stat
 */
Q.Tool.define("Media/presentation/card/stat", function (options) {
    var tool = this, state = tool.state;
    if (state.inline || !state.publisherId) {
        var attrs = {};
        Q.each(state, function (k, v) {
            if (k !== 'publisherId' && k !== 'streamName' && k !== 'inline') attrs[k] = v;
        });
        Q.Template.render('Media/presentation/card/stat', {
            title:       state.title       || '',
            imageUrl:    state.imageUrl    || null,
            imageCredit: state.imageCredit || null,
            'Q/card/stat': attrs
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
        Q.Template.render('Media/presentation/card/stat', {
            title:       stream.fields.title,
            imageUrl:    attrs.imageUrl    || null,
            imageCredit: attrs.imageCredit || null,
            'Q/card/stat': attrs
        }, function (err, html) {
            if (err) return;
            Q.replace(tool.element, html);
            Q.activate(tool.element);
        });
    });
}, { publisherId: null, streamName: null }, {});

})(Q, Q.jQuery, window);

Q.Template.set('Media/presentation/card/stat',
    '<div class="Media_presentation_screen Media_presentation_card_screen">'
  + '<div class="Media_presentation_hero">'
  + '{{#if imageUrl}}'
  + '<div class="Media_presentation_card_image">'
  + '<img src="{{imageUrl}}" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'">'
  + '{{#if imageCredit}}<span class="Media_presentation_card_image_credit">{{imageCredit}}</span>{{/if}}'
  + '</div>'
  + '{{/if}}'
  + '{{{tool "Q/card/stat"}}}'
  + '<div class="Media_presentation_caption">{{title}}</div>'
  + '</div>'
  + '</div>'
);
