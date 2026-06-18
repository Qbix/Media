(function (Q, $, window, undefined) {

    var Streams = Q.Streams;
    var Media = Q.Media;
    
    /**
     * @module Streams-tools
     */
    
    /**
     * Renders a PDF taking place in a presentation
     * in which the user has at least testReadLevel("content")
     * @class Media presentation pdf
     * @constructor
     * @param {Object} [options] any options for the tool
     * @param {Object} options.publisherId
     * @param {Object} options.streamName
     */
    Q.Tool.define("Media/presentation/pdf", function (options) {
        var tool = this;
        var state = tool.state;
        Streams.retainWith(tool).get(state.publisherId, state.streamName, function (err, stream) {
            if (err) return;
            var opts = Q.extend({}, stream.getAllAttributes(), {
                publisherId: stream.fields.publisherId,
                streamName: stream.fields.name,
                autoplay: true,
                url: stream.fileUrl() || stream.iconUrl('80')
            });
            Q.Template.render('Media/presentation/pdf', {
                'Q/pdf': opts,
                title: stream.fields.title
            }, null, { tool: tool }).then(function (html) {
                tool.element.forEachTool('Q/pdf', function () {
                    var pdfTool = this;
                    tool._pdfTool = pdfTool;
                    pdfTool.state.onRefresh.addOnce(function () {
                        var lastScrollEphemeral = null;
                        tool._scroll = function (ephemeral) {
                            lastScrollEphemeral = ephemeral;
                            var st = Q.getObject('scrollTop', ephemeral);
                            if (st) st = pdfTool.element.scrollHeight / 100 * st;
                            var sl = Q.getObject('scrollLeft', ephemeral);
                            if (sl) sl = pdfTool.element.scrollWidth / 100 * sl;
                            pdfTool.setCurrentPosition(st, sl);
                        };
                        // The slide-render primitive — same body as old _slide
                        tool.goToSlide = function (index) {
                            pdfTool.element.setAttribute('data-slideMode', true);
                            state.trackScroll = pdfTool.element.slideIndex === index;
                            if (state.trackScroll) {
                                pdfTool.element.removeAttribute('data-slideMode');
                            }
                            $('canvas', pdfTool.element).each(function (i, el) {
                                el.style.display = (i === index || state.trackScroll) ? 'block' : 'none';
                            });
                            if (state.trackScroll) tool._scroll(lastScrollEphemeral);
                            pdfTool.element.slideIndex = state.trackScroll ? null : index;
                        };
                        if (Q.getObject('cacheData.slideIndex', pdfTool) != null) {
                            tool.goToSlide(pdfTool.cacheData.slideIndex);
                        }
                        stream.onEphemeral('Streams/scroll').set(tool._scroll, tool);
                        // Slide/reveal listeners are GONE from this file.
                        // Parent Media/presentation tool dispatches goToSlide() to us.
                    }, tool);
                }, tool);
                Q.replace(tool.element, html);
                Q.activate(tool.element);
                setTimeout(function () {
                    var caption = tool.element.querySelector('.Media_presentation_caption');
                    if (caption) caption.addClass('Media_presentation_fadeout');
                }, 10);
            });
        });
    }, { trackScroll: false }, {});
    
    })(Q, Q.jQuery, window);
        
    Q.Template.set('Media/presentation/pdf',
        '<div class="Media_presentation_screen Media_presentation_pdf_screen">'
        + '<div class="Media_presentation_hero">'
            + '{{{tool "Q/pdf"}}}'
            + '<div class="Media_presentation_caption Media_presentation_pdf_caption">{{title}}</div>'
        + '</div>'
        + '</div>'
    );