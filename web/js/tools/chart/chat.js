(function (Q, $, window, undefined) {

/**
 * @module Media
 */

/**
 * Chat extension for adding chart-type content to a presentation.
 * Same pattern as Media/card/chat.
 *
 * @class Media/chart/chat
 * @constructor
 * @param {Object} [options]
 * @param {String} options.publisherId  Presentation stream publisherId
 * @param {String} options.streamName   Presentation stream streamName
 */
Q.Tool.define("Media/chart/chat", ["Streams/chat"], function (options) {
    var tool = this;
    var state = tool.state;
    tool.chatTool = Q.Tool.from(this.element, "Streams/chat");

    if (!Q.Users.loggedInUserId()) return;

    // // Bar chart
    // tool.chatTool.addMenuItem('chart_bar', {
    //     title:     'Bar chart',
    //     icon:      '{{Q}}/img/icons/chart-bar.png',
    //     className: 'Media_chart_chat_bar',
    //     handler:   function () { _showBarComposer(); }
    // });

    // // Line chart
    // tool.chatTool.addMenuItem('chart_line', {
    //     title:     'Line chart',
    //     icon:      '{{Q}}/img/icons/chart-line.png',
    //     className: 'Media_chart_chat_line',
    //     handler:   function () { _showLineComposer(); }
    // });

    function _showBarComposer() {
        var $form = $('<div class="Media_chart_composer"></div>');
        $form.html(
            '<div class="Media_card_composer_row"><label>Title</label><input name="title" placeholder="Global AI Funding 2020–2025"></div>' +
            '<div class="Media_card_composer_row"><label>Unit</label><input name="unit" placeholder="B USD"></div>' +
            '<div class="Media_card_composer_row"><label>Source</label><input name="source" placeholder="Bloomberg"></div>' +
            '<div class="Media_card_composer_row"><label>Data rows — one per line: Label, Value</label>' +
            '<textarea name="items_raw" rows="6" placeholder="2020, 22\n2021, 68\n2022, 115\n2023, 189"></textarea>' +
            '<span class="Media_chart_composer_hint">Each line: label, value &nbsp;·&nbsp; Comma-separated</span></div>'
        );

        Q.Dialogs.push({
            title: 'Bar chart',
            className: 'Media_chart_composer_dialog',
            content: $form,
            apply: true,
            beforeClose: function (dialog, cancelled) {
                if (cancelled) return;
                var title  = $form.find('[name=title]').val().trim();
                var unit   = $form.find('[name=unit]').val().trim();
                var source = $form.find('[name=source]').val().trim();
                var raw    = $form.find('[name=items_raw]').val().trim();
                var items  = raw.split('\n').map(function (line) {
                    var parts = line.split(',');
                    return { label: (parts[0] || '').trim(), value: (parts[1] || '').trim() };
                }).filter(function (d) { return d.label && d.value; });
                _createChartStream('Media/chart/bar', {
                    title:  title,
                    unit:   unit,
                    source: source,
                    items:  JSON.stringify(items)
                });
            }
        });
    }

    function _showLineComposer() {
        var $form = $('<div class="Media_chart_composer"></div>');
        $form.html(
            '<div class="Media_card_composer_row"><label>Title</label><input name="title" placeholder="Revenue Growth"></div>' +
            '<div class="Media_card_composer_row"><label>X Label</label><input name="xLabel" placeholder="Year"></div>' +
            '<div class="Media_card_composer_row"><label>Y Label</label><input name="yLabel" placeholder="USD B"></div>' +
            '<div class="Media_card_composer_row"><label>Source</label><input name="source" placeholder="Bloomberg"></div>' +
            '<div class="Media_card_composer_row"><label>Data points (x, y — one per line)</label>' +
            '<textarea name="series_raw" rows="6" placeholder="2020, 22\n2021, 68\n2022, 115"></textarea></div>'
        );

        Q.Dialogs.push({
            title: 'Line chart',
            className: 'Media_chart_composer_dialog',
            content: $form,
            apply: true,
            beforeClose: function (dialog, cancelled) {
                if (cancelled) return;
                var title   = $form.find('[name=title]').val().trim();
                var xLabel  = $form.find('[name=xLabel]').val().trim();
                var yLabel  = $form.find('[name=yLabel]').val().trim();
                var source  = $form.find('[name=source]').val().trim();
                var raw     = $form.find('[name=series_raw]').val().trim();
                var data = raw.split('\n').map(function (line) {
                    var parts = line.split(',');
                    return { x: parseFloat(parts[0]) || 0, y: parseFloat(parts[1]) || 0 };
                }).filter(function (d) { return !isNaN(d.x) && !isNaN(d.y); });
                _createChartStream('Media/chart/line', {
                    title:  title,
                    xLabel: xLabel,
                    yLabel: yLabel,
                    source: source,
                    series: JSON.stringify([{ label: title, data: data }])
                });
            }
        });
    }

    function _createChartStream(type, attrs) {
        Q.Streams.create({
            publisherId: state.publisherId,
            type:        type,
            title:       attrs.title || type,
            attributes:  JSON.stringify(attrs)
        }, function (err) {
            if (err) return Q.alert(Q.firstErrorMessage(err));
            // Stream created and related — nothing more to do
        }, {
            publisherId:   state.publisherId,
            streamName:    state.streamName,
            type:          'Media/presentation/cards',
            inheritAccess: true
        });
    }
},
{
    publisherId: null,
    streamName:  null
},
{});

})(Q, Q.jQuery, window);
