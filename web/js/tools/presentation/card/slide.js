(function (Q, $, window, undefined) {

/**
 * Media/presentation/card/slide
 *
 * Renders an AI-composed HTML slide inline on the canvas.
 * The LLM writes raw HTML + CSS (scoped to .Media_presentation_slide_tool).
 * Images come directly from web search result URLs embedded by the LLM.
 *
 * Unlike other card types this does NOT wrap a Q primitive tool —
 * it injects the LLM's HTML directly and fires build-in animations.
 *
 * Build-in animations:
 *   data-build="N" data-build-effect="dissolve|rise|slideLeft|slideRight|scale"
 *   If state.buildAuto is true, all elements build in automatically after
 *   state.buildStagger ms stagger once the card appears.
 *
 * Credit line:
 *   state.credit — attribution string shown bottom-right (source URLs etc.)
 *
 * @class Media/presentation/card/slide
 */
Q.Tool.define("Media/presentation/card/slide", function (options) {
    var tool  = this;
    var state = tool.state;

    tool.element.classList.add('Media_presentation_slide_tool');

    var html    = state.html    || '';
    var credit  = state.credit  || '';

    // Inject the HTML
    var inner = document.createElement('div');
    inner.className = 'Media_slide_content';
    inner.innerHTML = html;
    tool.element.appendChild(inner);

    // Credit line
    if (credit) {
        var creditEl = document.createElement('div');
        creditEl.className = 'Media_presentation_slide_credit';
        creditEl.textContent = credit;
        tool.element.appendChild(creditEl);
    }

    // Activate any Q tools embedded in the HTML
    Q.activate(inner, function () {
        tool._prepareBuildElements();
        if (state.buildAuto) {
            tool.buildAll({ stagger: state.buildStagger || 500 });
        }
    });

}, {
    html:         '',
    credit:       '',
    buildAuto:    false,
    buildStagger: 500,
    buildDuration: 400,
    buildEffect:  'dissolve'
}, {

    _prepareBuildElements: function () {
        var tool    = this;
        var state   = tool.state;
        var content = tool.element.querySelector('.Media_slide_content');
        if (!content) return;

        tool._buildElements = [];
        tool._buildIndex    = 0;

        content.querySelectorAll('[data-build]').forEach(function (el) {
            var idx = parseInt(el.getAttribute('data-build'), 10);
            if (isNaN(idx)) return;
            el.style.transition = 'none';
            el.style.opacity    = '0';
            el.style.transform  = _hiddenTransform(
                el.getAttribute('data-build-effect') || state.buildEffect
            );
            tool._buildElements.push({ index: idx, el: el });
        });

        tool._buildElements.sort(function (a, b) { return a.index - b.index; });
    },

    buildIn: function (index, options) {
        var tool  = this;
        var state = tool.state;
        options   = options || {};
        var dur   = options.duration != null ? options.duration : state.buildDuration;

        (tool._buildElements || [])
            .filter(function (b) { return b.index === index; })
            .forEach(function (b) {
                var el     = b.el;
                var effect = options.effect || el.getAttribute('data-build-effect') || state.buildEffect;
                var delay  = parseInt(el.getAttribute('data-build-delay') || '0', 10);
                setTimeout(function () {
                    el.style.transition = 'opacity ' + dur + 'ms ease, transform ' + dur + 'ms ease';
                    el.style.opacity    = '1';
                    el.style.transform  = 'none';
                }, delay);
            });

        if (index >= tool._buildIndex) tool._buildIndex = index + 1;
        return tool;
    },

    buildAll: function (options) {
        var tool    = this;
        var state   = tool.state;
        options     = options || {};
        var dur     = options.duration != null ? options.duration : state.buildDuration;
        var stagger = options.stagger  != null ? options.stagger  : Math.round(dur * 1.4);

        (tool._buildElements || []).forEach(function (b, i) {
            setTimeout(function () {
                tool.buildIn(b.index, { duration: dur, effect: options.effect });
            }, i * stagger);
        });
        return tool;
    },

    nextBuild: function (options) {
        var tool = this;
        var next = (tool._buildElements || []).find(function (b) {
            return b.index >= tool._buildIndex;
        });
        if (next) tool.buildIn(next.index, options);
        return tool;
    }

});

function _hiddenTransform(effect) {
    switch (effect) {
        case 'rise':        return 'translateY(28px)';
        case 'slideLeft':   return 'translateX(-36px)';
        case 'slideRight':  return 'translateX(36px)';
        case 'scale':       return 'scale(0.82)';
        case 'dissolve':
        default:            return 'none';
    }
}

})(Q, Q.jQuery, window);
