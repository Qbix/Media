(function (Q, $, window, undefined) {

/**
 * Media/presentation/card/slide
 *
 * Renders an AI-composed HTML slide inline on the canvas.
 * The LLM writes raw HTML + CSS. Images come directly from web search result
 * URLs embedded by the LLM.
 *
 * CSS scoping is enforced in code, not just by prompt instruction: the LLM's
 * markup and <style> block are wrapped/rewritten (see _scopeSlideHtml below)
 * so every selector only ever matches inside a private, randomly-named
 * marker div placed around the LLM's own content -- never any ancestor
 * (.Media_slide_content, .Media_presentation_slide_tool) or sibling slide
 * instance. This closes off a real, repeatedly-observed failure mode: the
 * LLM has no visibility into the DOM it's being injected into, so telling it
 * "scope your CSS to class X" is unreliable -- it may (correctly, from its
 * own perspective) write a rule FOR class X, or even create its own element
 * named X, with no way to know X already exists as an ancestor one level up
 * with exactly one child. Either way, a rule like display:grid scoped to
 * that ancestor turns IT into e.g. a 2-column grid with one populated column
 * and one empty one, instead of laying out the LLM's own elements. Scoping
 * by DOM wrapping (this file) rather than by naming convention (the prompt)
 * makes this collision structurally impossible regardless of what class
 * names the LLM chooses, including ones it reuses verbatim from this app.
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

    // Inject the HTML (CSS-scoped -- see _scopeSlideHtml)
    var inner = document.createElement('div');
    inner.className = 'Media_slide_content';
    inner.innerHTML = _scopeSlideHtml(html);
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
        tool._fitToScreen();
        if (state.buildAuto) {
            tool.buildAll({ stagger: state.buildStagger || 500 });
        }
    });

}, {
    html:         '',
    credit:       '',
    // Defaults to true: unlike Media/slide (which advances builds via
    // Media/slide/build stream messages/ephemerals), this inline AI-card
    // variant has no manual-advance mechanism at all -- if buildAuto were
    // false and the LLM's JSON response happened to omit the (optional)
    // buildAuto field, every data-build element would stay at opacity:0
    // forever, with no way to ever reveal it. Defaulting to true means a
    // card is never silently, unrecoverably blank just because the model
    // didn't think to set this field.
    buildAuto:    true,
    buildStagger: 500,
    buildDuration: 400,
    buildEffect:  'dissolve',
    // _fitToScreen won't shrink text past this scale even if content is
    // still taller than the viewport at this point -- past some size,
    // illegibly small text is worse than a bit of clipped overflow.
    minFitScale:  0.5,
    // Extra breathing room (px) below the viewport-derived budget, on top
    // of .Media_presentation_card_screen's own 48px padding, so a shrunk
    // slide doesn't touch the viewport edges.
    fitMargin:    60
}, {

    /**
     * Shrink the slide's content (via CSS transform, not by reflowing text
     * into a smaller box) if it's taller than the viewport can show.
     *
     * .Media_presentation_card_screen -- the class tool.element carries --
     * is deliberately height:fit-content!important with no ceiling (see
     * presentation.css): it's meant to hug short cards (a stat, a quote)
     * without wasted empty space. That means tool.element.clientHeight is
     * NOT a usable "how much room do I have" measurement here -- it just
     * mirrors whatever height the content already wants, so it can never
     * detect an overflow. The actual constraint comes from the viewport
     * (via the nearest .Media_presentation_tool ancestor, which IS sized to
     * fill it), not from this card's own box.
     *
     * The content div (.Media_slide_content) is left with its normal
     * fit-content sizing when nothing needs to shrink; scaling only ever
     * kicks in when the LLM's slide is actually too tall.
     */
    _fitToScreen: function () {
        var tool    = this;
        var state   = tool.state;
        var content = tool.element.querySelector('.Media_slide_content');
        var marker  = content && content.firstElementChild;
        if (!content || !marker) return;

        // Reset any previous pass before re-measuring the natural size.
        content.style.height   = '';
        content.style.overflow = '';
        marker.style.transform = '';

        var screenTool = tool.element.closest('.Media_presentation_tool');
        var viewport   = (screenTool && screenTool.clientHeight) || window.innerHeight;
        var available  = viewport - 96 - state.fitMargin; // 96 = 48px top+bottom padding

        var natural = marker.scrollHeight;
        if (!available || available <= 0 || !natural || natural <= available) return;

        var scale = Math.max(available / natural, state.minFitScale);
        marker.style.transformOrigin = 'top center';
        marker.style.transform       = 'scale(' + scale + ')';
        // transform is paint-only and doesn't shrink the space content's
        // layout box reserves -- pin it explicitly to the new visual size
        // so nothing downstream (e.g. this card's own fit-content height)
        // still reserves room for the pre-scale height.
        content.style.height   = Math.round(natural * scale) + 'px';
        content.style.overflow = 'hidden';
    },

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

/**
 * Wrap the LLM's HTML in a private, randomly-named marker div and rewrite
 * any <style> block's selectors so they're scoped underneath it -- see the
 * "CSS scoping is enforced in code" note in the class doc comment above for
 * why this can't just be a prompt instruction. A fresh random marker per
 * call also means two different slide instances, even with identical class
 * names inside their LLM-written markup, can never cross-match each other.
 * @private
 */
function _scopeSlideHtml(html) {
    if (!html) return html;
    var markerClass = '_slideScope' + Date.now().toString(36)
        + Math.random().toString(36).slice(2, 8);
    var scoped = html.replace(
        /<style\b([^>]*)>([\s\S]*?)<\/style>/gi,
        function (full, attrs, css) {
            return '<style' + attrs + '>' + _scopeCss(css, markerClass) + '</style>';
        }
    );
    return '<div class="' + markerClass + '">' + scoped + '</div>';
}

/**
 * Prefix every plain-rule selector with ".markerClass " (descendant
 * combinator) so it can only match inside the marker div. Recurses into
 * @media/@supports bodies (their inner rules are ordinary selectors that
 * need the same treatment); @keyframes/@font-face/@import/etc. are passed
 * through untouched (their bodies aren't element selectors, or don't target
 * elements at all, so there's nothing to scope and no collision risk).
 * Not a full CSS parser -- just enough structure (brace matching, top-level
 * comma splitting) for the simple stylesheets these slides actually contain.
 * @private
 */
function _scopeCss(css, markerClass) {
    var prefix = '.' + markerClass + ' ';
    var out = '';
    var i = 0;
    while (i < css.length) {
        var rest = css.slice(i);
        var atMatch = /^\s*@([a-zA-Z-]+)/.exec(rest);
        if (atMatch) {
            var braceIdx = css.indexOf('{', i);
            var semiIdx  = css.indexOf(';', i);
            if (semiIdx !== -1 && (braceIdx === -1 || semiIdx < braceIdx)) {
                // Statement at-rule with no block, e.g. @import/@charset.
                out += css.slice(i, semiIdx + 1);
                i = semiIdx + 1;
                continue;
            }
            if (braceIdx === -1) { out += rest; break; }
            var endIdx = _matchBrace(css, braceIdx);
            var kind = atMatch[1].toLowerCase();
            var header = css.slice(i, braceIdx + 1);
            var body   = css.slice(braceIdx + 1, endIdx);
            if (kind === 'media' || kind === 'supports') {
                body = _scopeCss(body, markerClass);
            }
            out += header + body + '}';
            i = endIdx + 1;
            continue;
        }
        var braceIdx2 = css.indexOf('{', i);
        if (braceIdx2 === -1) { out += rest; break; }
        var endIdx2 = _matchBrace(css, braceIdx2);
        var selectorText = css.slice(i, braceIdx2);
        var declText = css.slice(braceIdx2, endIdx2 + 1);
        var scopedSelectors = selectorText.split(',').map(function (s) {
            s = s.trim();
            return s ? prefix + s : s;
        }).filter(function (s) { return s; }).join(', ');
        out += scopedSelectors + declText;
        i = endIdx2 + 1;
    }
    return out;
}

/** Index of the '}' matching the '{' at openIdx, or the string end. @private */
function _matchBrace(css, openIdx) {
    var depth = 0;
    for (var j = openIdx; j < css.length; j++) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') {
            depth--;
            if (depth === 0) return j;
        }
    }
    return css.length;
}

})(Q, Q.jQuery, window);
