(function (Q, $, window, undefined) {

var Streams = Q.Streams;

/**
 * Full-screen presentation wrapper for Q/card/profile.
 * When imageUrl is present, renders in two-column layout: image left, card right.
 *
 * @class Media/presentation/card/profile
 */
Q.Tool.define("Media/presentation/card/profile", function (options) {
    var tool = this, state = tool.state;
    if (state.inline || !state.publisherId) {
        if (typeof state.tags === 'string') { try { state.tags = JSON.parse(state.tags); } catch (e) {} }
        var attrs = {};
        Q.each(state, function (k, v) {
            if (k !== 'publisherId' && k !== 'streamName' && k !== 'inline') attrs[k] = v;
        });
        Q.Template.render('Media/presentation/card/profile', {
            title:       state.title       || '',
            imageUrl:    state.imageUrl    || null,
            imageCredit: state.imageCredit || null,
            'Q/card/profile': attrs
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
        if (typeof attrs.tags === 'string') { try { attrs.tags = JSON.parse(attrs.tags); } catch (e) {} }
        Q.Template.render('Media/presentation/card/profile', {
            title:       stream.fields.title,
            imageUrl:    attrs.imageUrl    || null,
            imageCredit: attrs.imageCredit || null,
            'Q/card/profile': attrs
        }, function (err, html) {
            if (err) return;
            Q.replace(tool.element, html);
            Q.activate(tool.element, function () {
                tool.element.forEachTool('Q/card/profile', function () {
                    var cardTool = this;
                    // Listen for the durable Media/presentation/reveal message
                    // instead of the legacy Streams/reveal ephemeral. The
                    // message carries the reveal index inside its JSON
                    // instructions field.
                    if (stream.onMessage) {
                        stream.onMessage('Media/presentation/reveal', function (msg) {
                            var instr = {};
                            try { instr = JSON.parse(msg.instructions || '{}'); } catch (e) {}
                            if (instr.index != null && cardTool.reveal) {
                                cardTool.reveal(instr.index);
                            }
                        });
                    }
                }, tool);
            });
        });
    });
}, { publisherId: null, streamName: null }, {});

})(Q, Q.jQuery, window);

Q.Template.set('Media/presentation/card/profile',
    '<div class="Media_presentation_screen Media_presentation_card_screen{{#if imageUrl}} Media_presentation_card_withimage{{/if}}">'
  + '<div class="Media_presentation_hero">'
  + '{{#if imageUrl}}'
  + '<div class="Media_presentation_card_image">'
  + '<img src="{{imageUrl}}" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'">'
  + '{{#if imageCredit}}<span class="Media_presentation_card_image_credit">{{imageCredit}}</span>{{/if}}'
  + '</div>'
  + '{{/if}}'
  + '<div class="Media_presentation_card_body">'
  + '{{{tool "Q/card/profile"}}}'
  + '<div class="Media_presentation_caption">{{title}}</div>'
  + '</div>'
  + '</div>'
  + '</div>'
);
