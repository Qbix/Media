(function (Q, $, window, undefined) {

    /**
     * Media/webrtc/preview tool.
     * Renders a tool to preview Media/webrtc
     * @class Media/webrtc/preview
     * @constructor
     * @param {Object} [options] options to pass besides the ones to Streams/preview tool
     * @param {Q.Event} [options.onWebRTCRoomCreated]
     * @param {Q.Event} [options.onWebrtcControlsCreated]
     * @param {Q.Event} [options.onWebRTCRoomEnded]
     * @param {Q.Event} [options.onRefresh] called when tool element completely rendered
     */
    Q.Tool.define("Media/webrtc/preview", ["Streams/preview"], function _Media_webrtc_preview (options, preview) {
            var tool = this;
            this.state = Q.extend({}, this.state, options);

            var state = this.state;
            tool.preview = preview;

            Q.addStylesheet('{{Media}}/css/tools/previews.css', { slotName: 'Streams' });

            Q.Text.get(["Streams/content", "Media/content"], function (err, text) {
                var msg = Q.firstErrorMessage(err);
                if (msg) {
                    return console.warn(msg);
                }

                tool.text = text;
                tool.preview.state.onRefresh.add(tool.refresh.bind(tool));
            });

            if(this.state.previewType == 'Media/webrtc/call/preview') {
                $(tool.element).tool("Media/webrtc/call/preview", {
                    publisherId: state.publisherId,
                    streamName: state.streamName,
                    relationType: state.relationType,
                    editable: false,
                    closeable: true,
                    sortable: false,
                    realtime: true,
                }).activate(function () {

                });
            } else {
                $(tool.element).tool("Media/webrtc/default/preview", {
                    publisherId: state.publisherId,
                    streamName: state.streamName,
                    relationType: state.relationType,
                    editable: false,
                    closeable: true,
                    sortable: false,
                    realtime: true,
                }).activate(function () {

                });
            }


        },

        {

        },

        {
            refresh: function (stream) {

            }

        });

})(Q, Q.jQuery, window);