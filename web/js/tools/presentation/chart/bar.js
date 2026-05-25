(function (Q, $, window, undefined) {

var Streams = Q.Streams;

/**
 * Full-screen presentation wrapper for Q/chart/bar.
 *
 * @class Media/presentation/chart/bar
 */
Q.Tool.define("Media/presentation/chart/bar", function (options) {
    var tool = this, state = tool.state;
    // Inline mode: data passed directly as options (AI pipeline path)
    if (state.inline || !state.publisherId) {

        // Inline mode: render directly from state options, skip stream fetch
        if (typeof state.items === 'string') { try { state.items = JSON.parse(state.items); } catch (e) {} }
        var attrs = {};
        Q.each(state, function (k, v) {
            if (k !== 'publisherId' && k !== 'streamName' && k !== 'inline') attrs[k] = v;
        });
        Q.Template.render('Media/presentation/chart/bar', {
            title: state.title || '',
            'Q/chart/bar': attrs
        }, function (err, html) {
            if (err) return;
            Q.replace(tool.element, html);
            Q.activate(tool.element);
            tool.element.forEachTool('Q/chart/bar', function () {
                // No stream in inline mode — live ephemerals not wired
            }, tool);
        });
        return;
    }
    Streams.retainWith(tool).get(state.publisherId, state.streamName,
    function (err, stream) {
        if (err) return;
        var attrs = stream.getAllAttributes();
        if (typeof attrs.items === 'string') { try { attrs.items = JSON.parse(attrs.items); } catch (e) {} }
        Q.Template.render('Media/presentation/chart/bar', {
            title: stream.fields.title,
            'Q/chart/bar': attrs
        }, function (err, html) {
            if (err) return;
            Q.replace(tool.element, html);
            Q.activate(tool.element, function () {
                tool.element.forEachTool('Q/chart/bar', function () {
                    var chartTool = this;
                    stream.onEphemeral('Streams/highlight').set(function (e) {
                        chartTool.highlight && chartTool.highlight(e.elementId);
                    }, tool);
                }, tool);
            });
        });
    });
}, { publisherId: null, streamName: null }, {});

})(Q, Q.jQuery, window);

Q.Template.set('Media/presentation/chart/bar',
    '<div class="Media_presentation_screen Media_presentation_chart_screen">'
  + '<div class="Media_presentation_hero">'
  + '  {{{tool "Q/chart/bar"}}}'
  + '  <div class="Media_presentation_caption">{{title}}</div>'
  + '</div>'
  + '</div>'
);
