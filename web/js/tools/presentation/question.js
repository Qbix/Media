(function (Q, $, window, undefined) {

    var Streams = Q.Streams;
    var Media = Q.Media;
    
    /**
     * @module Streams-tools
     */
    
    /**
     * Renders a question taking place in a presentation
     * in which the user has at least testReadLevel("content")
     * @class Media presentation question
     * @constructor
     * @param {Object} [options] any options for the tool
     * @param {Object} options.publisherId
     * @param {Object} options.streamName
     * @param {String} [options.mode] If "participant", show full tool without QR code
     */
    Q.Tool.define("Media/presentation/question", function(options) {
        var tool = this;
        var state = tool.state;
        Streams.get(state.publisherId, state.streamName)
        .then(function (stream) {
            Q.Template.render('Media/presentation/question', {
                publisherId: stream.fields.publisherId,
                streamName: stream.fields.name
            }, null, {
                tool: tool
            }).then(function (html) {
                tool.element.innerHTML = html;
                tool.screen = tool.element.getElementsByClassName('Media_presentation_screen')[0];
                tool.screen.setAttribute("data-mode", state.mode);
                tool.hero = tool.element.getElementsByClassName('Media_presentation_hero')[0];
                tool.QRcode = tool.element.getElementsByClassName('Media_presentation_question_QR')[0];

                Q.activate(tool.element, function () {
                    if (state.mode === "participant") {
                        return;
                    }
                    Q.addScript("{{Q}}/js/qrcode/qrcode.js", function() {
                        var urlParams = new URLSearchParams(location.search);
                        urlParams.append('show[p]', state.publisherId);
                        urlParams.append('show[s]', state.streamName);
                        urlParams.append('m', 'p');
                        var url = location.origin + location.pathname + '?' + urlParams.toString();
                        new QRCode(tool.QRcode, {
                            text: url,
                            width: 200,
                            height: 200,
                            colorDark : "#000000",
                            colorLight : "#ffffff",
                            correctLevel : QRCode.CorrectLevel.H
                        });
                        tool.QRcode.getElementsByTagName('img')[0].title = url;
                    });
                });
            });            
        });
    },
    {
        mode: null
    },
    {
        nextState: function () {
            this.showAnswers(true);
        },
        showAnswers: function (whetherToShow) {
            var tool = this;
            if (whetherToShow) {
                this.screen.addClass('Media_presentation_question_showAnswers');
            } else {
                this.screen.removeClass('Media_presentation_question_showAnswers');
            }
            this.interval = setInterval(_updateAnswers, 100);
            function _updateAnswers() {
                var selector = '.Streams_answer_preview_tool[data-type=text] .Users_avatar_tool';
                var results = Q.$(selector, tool.element);
                results.forEach(function (element) {
                    var text = element.getAttribute('data-touchlabel');
                    var className = 'Media_presentation_answer_text_custom';
                    if (text && !element.getElementsByClassName(className).length) {
                        element.append(Q.element('div', {
                            "class": className
                        }, text));
                    }
                })
            };
        },
        Q: {
            beforeRemove: function () {
                this.interval && clearInterval(this.interval);
            }
        }
    });
    
    })(Q, Q.jQuery, window);

    Q.Template.set('Media/presentation/question',
        '<div class="Media_presentation_screen Media_presentation_question_screen">'
        + '<div class="Media_presentation_hero">'
            + '<div class="Q_tool Streams_preview_tool Streams_question_preview_tool"'
            + ' data-streams-preview=\'{"publisherId":"{{publisherId}}", "streamName": "{{streamName}}"}\'>'
            + '</div>'
        + '</div>'
        + '<div class="Media_presentation_question_scanQR">'
        +   '{{presentation.question.ScanThisQRCode}}:'
        +   '<div class="Media_presentation_question_QR"></div>'
        + '</div>'
        + '</div>'
    );