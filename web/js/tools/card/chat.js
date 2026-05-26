(function (Q, $, window, undefined) {

/**
 * @module Media
 */

/**
 * Chat extension that adds card-type content to a presentation via the + menu.
 * Follows the Streams/pdf/chat and Streams/question/chat pattern exactly.
 *
 * Usage: add as a dependency to Streams/chat on the presentation stream:
 *   $element.tool('Streams/chat', {...})
 *            .tool('Media/card/chat', {
 *                publisherId: presentationPublisherId,
 *                streamName:  presentationStreamName
 *            }).activate();
 *
 * The host taps + → picks a card type → fills a simple form → stream is
 * created with the card data as attributes → preview appears as a chat
 * message → tapping the preview emits Media/presentation/show ephemeral
 * (handled by pushPresentationColumn's forEachTool('Streams/preview') hook).
 *
 * When the AI pipeline is active, it creates the same streams and the same
 * previews appear in chat automatically. The host sees the card in chat
 * before it hits the shared screen (veto window).
 *
 * @class Media/card/chat
 * @constructor
 * @param {Object} [options]
 * @param {String} options.publisherId  Presentation stream publisherId
 * @param {String} options.streamName   Presentation stream streamName
 */
Q.Tool.define("Media/card/chat", ["Streams/chat"], function (options) {
    var tool = this;
    var state = tool.state;
    tool.chatTool = Q.Tool.from(this.element, "Streams/chat");

    if (!Q.Users.loggedInUserId()) return;

    var cards = [
        {
            key:   'stat',
            type:  'Media/card/stat',
            title: 'Stat card',
            icon:  '{{Q}}/img/icons/stat.png',
            fields: [
                { name: 'value',  label: 'Number',  placeholder: '4.2' },
                { name: 'unit',   label: 'Unit',    placeholder: 'T' },
                { name: 'label',  label: 'Label',   placeholder: 'Global AI investment 2024' },
                { name: 'delta',  label: 'Change',  placeholder: '+18%' },
                { name: 'source', label: 'Source',  placeholder: 'Bloomberg' },
                { name: 'url',    label: 'Link',    placeholder: 'https://...' }
            ]
        },
        {
            key:   'glossary',
            type:  'Media/card/glossary',
            title: 'Definition',
            icon:  '{{Q}}/img/icons/glossary.png',
            fields: [
                { name: 'term',       label: 'Term',       placeholder: 'LIDAR' },
                { name: 'definition', label: 'Definition', placeholder: 'Light detection and ranging...', textarea: true },
                { name: 'context',    label: 'Example',    placeholder: 'Used in autonomous vehicles...' },
                { name: 'source',     label: 'Source',     placeholder: 'Wikipedia' },
                { name: 'url',        label: 'Link',       placeholder: 'https://...' }
            ]
        },
        {
            key:   'quote',
            type:  'Media/card/quote',
            title: 'Quote',
            icon:  '{{Q}}/img/icons/quote.png',
            fields: [
                { name: 'quote',   label: 'Quote',   placeholder: '"The best way to..."', textarea: true },
                { name: 'speaker', label: 'Speaker', placeholder: 'Sam Altman' },
                { name: 'source',  label: 'Source',  placeholder: 'TechCrunch' },
                { name: 'url',     label: 'Link',    placeholder: 'https://...' }
            ]
        },
        {
            key:   'profile',
            type:  'Media/card/profile',
            title: 'Profile',
            icon:  '{{Q}}/img/icons/profile.png',
            fields: [
                { name: 'name',    label: 'Name',    placeholder: 'Andrej Karpathy' },
                { name: 'handle',  label: 'Handle',  placeholder: '@karpathy' },
                { name: 'bio',     label: 'Bio',     placeholder: 'AI researcher...', textarea: true },
                { name: 'iconUrl', label: 'Icon URL',placeholder: 'https://...' },
                { name: 'source',  label: 'Source',  placeholder: 'Twitter' },
                { name: 'url',     label: 'Link',    placeholder: 'https://...' }
            ]
        },
        {
            key:   'article',
            type:  'Media/card/article',
            title: 'Article',
            icon:  '{{Q}}/img/icons/article.png',
            fields: [
                { name: 'title',       label: 'Headline',  placeholder: 'AI investment surges...' },
                { name: 'publication', label: 'Source',    placeholder: 'Bloomberg' },
                { name: 'keyClaim',    label: 'Key claim', placeholder: 'Investment doubled...', textarea: true },
                { name: 'url',         label: 'Link',      placeholder: 'https://...' },
                { name: 'imageUrl',    label: 'Image URL', placeholder: 'https://...' },
                { name: 'date',        label: 'Date',      placeholder: 'May 2026' }
            ]
        },
        {
            key:   'comparison',
            type:  'Media/card/comparison',
            title: 'Comparison',
            icon:  '{{Q}}/img/icons/comparison.png',
            fields: [
                { name: 'left.label',  label: 'Left label',  placeholder: 'OpenAI' },
                { name: 'left.value',  label: 'Left value',  placeholder: '$157B' },
                { name: 'right.label', label: 'Right label', placeholder: 'Anthropic' },
                { name: 'right.value', label: 'Right value', placeholder: '$61B' }
            ]
        }
    ];

    Q.each(cards, function (i, card) {
        tool.chatTool.addMenuItem('card_' + card.key, {
            title:     card.title,
            icon:      card.icon,
            className: 'Media_card_chat_' + card.key,
            handler:   _makeHandler(card)
        });
    });

    function _makeHandler(card) {
        return function () {
            _showComposer(card);
        };
    }

    function _showComposer(card) {
        var $form = $('<div class="Media_card_composer"></div>');
        Q.each(card.fields, function (i, f) {
            var $row = $('<div class="Media_card_composer_row"></div>');
            $('<label></label>').text(f.label).appendTo($row);
            var $input = f.textarea
                ? $('<textarea></textarea>').attr('placeholder', f.placeholder).attr('name', f.name)
                : $('<input type="text">').attr('placeholder', f.placeholder).attr('name', f.name);
            $input.appendTo($row);
            $row.appendTo($form);
        });

        Q.Dialogs.push({
            title: card.title,
            className: 'Media_card_composer_dialog',
            content: $form,
            apply: true,
            onActivate: function (dialog) {
                $form.find('input, textarea').first().focus();
            },
            beforeClose: function (dialog, cancelled) {
                if (cancelled) return;
                var attrs = {};
                $form.find('[name]').each(function () {
                    var name  = $(this).attr('name');
                    var value = $(this).val().trim();
                    if (!value) return;
                    // Handle dotted names like 'left.label'
                    var parts = name.split('.');
                    if (parts.length === 2) {
                        attrs[parts[0]] = attrs[parts[0]] || {};
                        attrs[parts[0]][parts[1]] = value;
                    } else {
                        attrs[name] = value;
                    }
                });
                _createCardStream(card.type, attrs);
            }
        });
    }

    function _createCardStream(type, attrs) {
        // JSON-encode any object values (left, right, rows, tags)
        var flatAttrs = {};
        Q.each(attrs, function (k, v) {
            flatAttrs[k] = (typeof v === 'object') ? JSON.stringify(v) : v;
        });

        // Pass attributes as JSON in the create fields so they're set at creation time.
        // This avoids a separate setAttributes() call and race conditions.
        Q.Streams.create({
            publisherId: state.publisherId,
            type:        type,
            title:       flatAttrs.term || flatAttrs.value || flatAttrs.title || flatAttrs.name || type,
            attributes:  JSON.stringify(flatAttrs)
        }, function (err) {
            if (err) return Q.alert(Q.firstErrorMessage(err));
            // Stream created and related — nothing more to do
        }, {
            publisherId: state.publisherId,
            streamName:  state.streamName,
            type:        'Media/presentation/cards',
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

// ── Chat message renderer for Media/presentation/card/show ──────────────────
//
// Renders AI-committed cards inline in the Streams/chat message feed.
// Clicking a card preview replays it on the canvas.
// This handler is registered via Media.patch.js Q.Tool.define.options('Streams/chat').
//
// Called by Streams/chat with: (message, onRender)
//   message.fields.instructions — JSON with { visualizationType, visualizationData, streamType }
//   onRender(html)              — pass rendered HTML back to Streams/chat

Media_card_chat_messageHandler = function (message, onRender) {
    var instr = {};
    try { instr = JSON.parse(message.fields.instructions || '{}'); } catch (e) {}

    var type   = instr.visualizationType || 'card';
    var data   = instr.visualizationData || {};
    var stream = instr.streamType || '';

    // Build a human-readable one-line summary
    var summary = data.label || data.term || data.title || data.name
        || data.quote || data.speaker || data.credit
        || (data.left && data.right
            ? ((data.left.label || '') + ' vs ' + (data.right.label || ''))
            : '');
    if (!summary && data.value) summary = data.value + (data.unit ? ' ' + data.unit : '');
    if (!summary && data.html)  summary = 'HTML slide (' + data.html.length + ' chars)';
    summary = String(summary).slice(0, 80);

    // Icon per type
    var icons = {
        stat: '📊', glossary: '📖', quote: '💬', profile: '👤',
        article: '📰', comparison: '⚖️', barChart: '📊', lineChart: '📈',
        map: '🗺️', graph: '🕸️', table: '🗂️', slide: '🖼️'
    };
    var icon = icons[type] || '🃏';

    // Image thumbnail if present
    var imgHtml = '';
    var imgUrl  = data.imageUrl || data.leftImageUrl;
    if (imgUrl) {
        imgHtml = '<img class="Media_card_chat_thumb" src="' + Q.encodeHTML(imgUrl) + '"'
            + ' onerror="this.style.display=\'none\'" loading="lazy">';
    }

    var instrJson   = Q.encodeHTML(message.fields.instructions || '{}');
    var streamTypeE = Q.encodeHTML(stream);
    var typeE       = Q.encodeHTML(type);
    var summaryE    = Q.encodeHTML(summary || type);

    var html =
        '<div class="Media_card_chat_preview" data-instructions="' + instrJson + '"'
        + ' data-stream-type="' + streamTypeE + '"'
        + ' data-viz-type="' + typeE + '"'
        + ' title="Click to show on canvas">'
        + imgHtml
        + '<span class="Media_card_chat_icon">' + icon + '</span>'
        + '<span class="Media_card_chat_type">' + typeE + '</span>'
        + '<span class="Media_card_chat_summary">' + summaryE + '</span>'
        + '<button class="Media_card_chat_replay" type="button">▶ Show</button>'
        + '</div>';

    onRender(html);
};

// Event delegation for replay button clicks — wired once per page load
(function () {
    if (typeof document === 'undefined') return;
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.Media_card_chat_replay, .Media_card_chat_preview');
        if (!btn) return;
        var preview = btn.closest('.Media_card_chat_preview') || btn;
        var instrStr   = preview.getAttribute('data-instructions')  || '{}';
        var streamType = preview.getAttribute('data-stream-type')    || '';
        var vizType    = preview.getAttribute('data-viz-type')       || '';
        var instr = {};
        try { instr = JSON.parse(instrStr); } catch (ex) {}
        if (!instr.visualizationData) return;
        // Emit AI/proposal/show — control.js relays it to the presentation stream
        // which activates _showInlineCard on the canvas.
        var qs = Q.Socket.get('/Q', '');
        if (qs && qs.socket) {
            qs.socket.emit('AI/card/replay', {
                visualizationType: vizType || instr.visualizationType,
                visualizationData: instr.visualizationData,
                streamType:        streamType || instr.streamType
            });
        }
    }, false);
})();
