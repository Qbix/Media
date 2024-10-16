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
    Q.Tool.define("Media/presentation/pdf", function(options) {
        var tool = this;
        var state = tool.state;
        Streams.retainWith(tool).get(state.publisherId, state.streamName, function (err, stream) {
            if (err) {
                return;
            }

            var options = Q.extend({}, stream.getAllAttributes(), {
                publisherId: stream.fields.publisherId,
                streamName: stream.fields.name,
                autoplay: true,
                url: stream.fileUrl() || stream.iconUrl('80')
            });
            Q.Template.render('Media/presentation/pdf', {
                'Q/pdf': options,
                title: stream.fields.title
            }, null, {
                tool: tool
            }).then(function (html) {
                tool.element.forEachTool("Q/pdf", function () {
                    var pdfTool = this;
                    pdfTool.state.onRefresh.addOnce(function () {
                        var lastScrollEphemeral = null;
                        var lastSlideEphemeral = null;
                        var _scroll = function (ephemeral) {
                            lastScrollEphemeral = ephemeral;
                            var scrollTop = Q.getObject("scrollTop", ephemeral);
                            if (scrollTop) {
                                scrollTop = pdfTool.element.scrollHeight/100*scrollTop;
                            }
                            var scrollLeft = Q.getObject("scrollLeft", ephemeral);
                            if (scrollLeft) {
                                scrollLeft = pdfTool.element.scrollWidth/100*scrollLeft;
                            }

                            pdfTool.setCurrentPosition(scrollTop, scrollLeft);
                        };
                        var _slide = function (ephemeral) {
                            lastSlideEphemeral = ephemeral;
                            state.trackScroll = pdfTool.element.slideIndex === ephemeral.slideIndex;
                            $("canvas", pdfTool.element).each(function (index, element) {
                                if (index === ephemeral.slideIndex) {
                                    element.style.display = 'block';
                                } else {
                                    element.style.display = state.trackScroll ? 'block' : 'none';
                                }
                            });
                            if (state.trackScroll) {
                                _scroll(lastScrollEphemeral);
                            }
                            pdfTool.element.slideIndex = state.trackScroll ? null : ephemeral.slideIndex;
                        };
                        if (Q.getObject('cacheData.slideIndex', pdfTool)) {
                            _slide({
                                slideIndex: pdfTool.cacheData.slideIndex
                            });
                        }
                        stream.onEphemeral('Streams/scroll').set(_scroll, tool);
                        stream.onEphemeral('Streams/slide').set(_slide, tool);
                    }, tool);
                }, tool);

                Q.replace(tool.element, html);
                Q.activate(tool.element);
                setTimeout(function () {
                    var caption = tool.element.querySelector('.Media_presentation_caption');
                    caption.addClass('Media_presentation_fadeout');
                }, 10);
            });
        });
    },
    {
        trackScroll: false
    },
    {

    });
    
    })(Q, Q.jQuery, window);
        
    Q.Template.set('Media/presentation/pdf',
        '<div class="Media_presentation_screen Media_presentation_pdf_screen">'
        + '<div class="Media_presentation_hero">'
            + '{{{tool "Q/pdf"}}}'
            + '<div class="Media_presentation_caption Media_presentation_pdf_caption">{{title}}</div>'
        + '</div>'
        + '</div>'
    );