(function (Q, $, window, undefined) {

var Streams = Q.Streams;

/**
 * Full-screen presentation wrapper for Q/card/comparison.
 * leftImageUrl / rightImageUrl shown above each column when present.
 *
 * @class Media/presentation/card/comparison
 */
Q.Tool.define("Media/presentation/card/comparison", function (options) {
    var tool = this, state = tool.state;
    if (state.inline || !state.publisherId) {
        if (typeof state.left  === 'string') { try { state.left  = JSON.parse(state.left);  } catch (e) {} }
        if (typeof state.right === 'string') { try { state.right = JSON.parse(state.right); } catch (e) {} }
        if (typeof state.rows  === 'string') { try { state.rows  = JSON.parse(state.rows);  } catch (e) {} }
        var attrs = {};
        Q.each(state, function (k, v) {
            if (k !== 'publisherId' && k !== 'streamName' && k !== 'inline') attrs[k] = v;
        });
        Q.Template.render('Media/presentation/card/comparison', {
            title:         state.title         || '',
            leftImageUrl:  state.leftImageUrl  || null,
            rightImageUrl: state.rightImageUrl || null,
            'Q/card/comparison': attrs
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
        if (typeof attrs.left  === 'string') { try { attrs.left  = JSON.parse(attrs.left);  } catch (e) {} }
        if (typeof attrs.right === 'string') { try { attrs.right = JSON.parse(attrs.right); } catch (e) {} }
        if (typeof attrs.rows  === 'string') { try { attrs.rows  = JSON.parse(attrs.rows);  } catch (e) {} }
        Q.Template.render('Media/presentation/card/comparison', {
            title:         stream.fields.title,
            leftImageUrl:  attrs.leftImageUrl  || null,
            rightImageUrl: attrs.rightImageUrl || null,
            'Q/card/comparison': attrs
        }, function (err, html) {
            if (err) return;
            Q.replace(tool.element, html);
            Q.activate(tool.element, function () {
                tool.element.forEachTool('Q/card/comparison', function () {
                    var cardTool = this;
                    stream.onEphemeral('Streams/highlight').set(function (e) {
                        if (e) cardTool.highlight && cardTool.highlight(e.elementId);
                    }, tool);
                }, tool);
            });
        });
    });
}, { publisherId: null, streamName: null }, {});

})(Q, Q.jQuery, window);

Q.Template.set('Media/presentation/card/comparison',
    '<div class="Media_presentation_screen Media_presentation_card_screen">'
  + '<div class="Media_presentation_hero">'
  + '{{#if leftImageUrl}}'
  + '<div class="Media_presentation_card_comparison_images">'
  + '<img src="{{leftImageUrl}}"  class="Media_presentation_card_comparison_img" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
  + '<img src="{{rightImageUrl}}" class="Media_presentation_card_comparison_img" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
  + '</div>'
  + '{{/if}}'
  + '{{{tool "Q/card/comparison"}}}'
  + '<div class="Media_presentation_caption">{{title}}</div>'
  + '</div>'
  + '</div>'
);
