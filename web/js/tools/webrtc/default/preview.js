(function (Q, $, window, undefined) {

    /**
     * Media/webrtc/preview tool.
     * Renders a tool to preview Media/webrtc
     * @class Media/webrtc/preview
     * @constructor
     * @param {Object} [options] options to pass besides the ones to Streams/preview tool
     */
    Q.Tool.define("Media/webrtc/default/preview", ["Media/webrtc/preview"], function _Media_webrtc_default_preview (options, parentPreviewTool) {
            var tool = this;
            this.state = Q.extend({}, this.state, options);

            var state = this.state;
            tool.preview = parentPreviewTool.preview;

            parentPreviewTool.preview.state.editable = state.editable;

            Q.addStylesheet('{{Streams}}/css/tools/previews.css', { slotName: 'Streams' });

            Q.Text.get(["Streams/content", "Media/content"], function (err, text) {
                var msg = Q.firstErrorMessage(err);
                if (msg) {
                    return console.warn(msg);
                }

                tool.text = text;
                tool.preview.state.onRefresh.add(tool.refresh.bind(tool));
            });
        },

        {
            templates: {
                view: {
                    name: 'Media/webrtc/preview/view',
                    fields: { alt: 'icon', titleClass: '', titleTag: 'h3' }
                }
            }
        },

        {
            refresh: function (stream) {
                var tool = this;
                var state = this.state;
                var $toolElement = $(tool.element);

                if (!Q.Streams.isStream(stream)) {
                    return;
                }

                tool.stream = stream;

                // retain with stream
                Q.Streams.retainWith(tool).get(stream.fields.publisherId, stream.fields.name);

                var preamble = Q.getObject('webrtc.preview.Meeting', tool.text) || 'Meeting';
                var timeString = "";
                var endTime = stream.getAttribute("endTime");
                var startTime = stream.getAttribute("startTime");
                if (endTime) {
                    if (startTime) {
                        var durationArr = Q.displayDuration(parseInt(endTime) - parseInt(startTime)).split(":");
                        for (var i=durationArr.length-1; i>=0; i--) {
                            timeString = durationArr[i] + " " + (["sec", "min", "h"][durationArr.length - (i + 1)]);
                        }
                    } else {
                        timeString = new Date(endTime).toLocaleString();
                    }
                    preamble = Q.getObject('webrtc.preview.MeetingEnded', tool.text) || 'Meeting ended';
                }

                var fields = Q.extend({}, state.templates.view.fields, {
                    publisherId: stream.fields.publisherId,
                    streamName: stream.fields.name,
                    alt: 'icon',
                    title: stream.fields.title,
                    timeString: timeString,
                    preamble: preamble
                });
                Q.Template.render(
                    'Media/webrtc/preview/view',
                    fields,
                    function (err, html) {
                        if (err) return;
                        Q.replace(tool.element, html);
                        Q.activate(tool, function () {
                            // load the icon
                            // TODO: make this use flexbox instead
                            var jq = tool.$('img.Streams_preview_icon');
                            tool.preview.icon(jq[0], null);
                            var $pc = tool.$('.Streams_preview_contents');
                            var _adjustWidth = function () {
                                if ($pc.parent().is(':visible')) {
                                    $pc.width($pc[0].remainingWidth());
                                }
                            }();

                            Q.onLayout(tool.element).set(_adjustWidth, tool);
                            

                            tool.element.forEachTool('Users/avatar', function () {
                                let state = this.state;
                                let element = this.element;
                                $(element).on(Q.Pointer.fastclick, function () {
                                    if (Q.Users.isCommunityId(state.userId)) {
                                        Q.Communities.openCommunityProfile.call(this, state.userId);
                                    } else {
                                        Q.Communities.openUserProfile.call(this, state.userId);
                                    }
                                    return false;
                                });
                            });

                            Q.handle(state.onRefresh, tool);
                        });
                    },
                    state.templates.view
                );

                $toolElement.on(Q.Pointer.fastclick, function ($e) {
                    var WebConference = Q.Media.WebRTC({
                        element: document.body,
                        roomId: stream.fields.name.split('/').pop(),
                        roomPublisherId: stream.fields.publisherId,
                        mode: 'node',
                        startWith: {video: false, audio: true},
                        onWebRTCRoomCreated: function() {
                            console.log('onWebRTCRoomCreated', this);
                        },
                        onWebrtcControlsCreated: function() {
                            console.log('onWebrtcControlsCreated', this);
                        }
                    });
                    WebConference.start();
                    $e.stopImmediatePropagation();
                    return false;
                });
            }
        });

    Q.Template.set('Media/webrtc/preview/view',
        '<div class="Streams_preview_container Streams_preview_view Q_clearfix">'
        + '<img alt="{{alt}}" class="Streams_preview_icon">'
        + '<div class="Streams_preview_contents {{titleClass}}">'
        + '<{{titleTag}} class="Streams_preview_preamble">{{preamble}} <span class="Media_webrtc_duration">{{timeString}}</span></{{titleTag}}>'
        + '<{{titleTag}} class="Streams_preview_title">{{title}}</{{titleTag}}>'
        + '{{{tool "Streams/participants" "" publisherId=publisherId streamName=streamName maxShow=10 invite=false hideIfNoParticipants=true}}}'
        + '</div></div>'
    );

})(Q, Q.jQuery, window);