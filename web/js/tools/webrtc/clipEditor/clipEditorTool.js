(function ($, window, undefined) {
    Q.Tool.define("Media/webrtc/clipEditor", function (options) {
        var tool = this;
        if(!Q.Media.WebRTC.clipEditor) {
            Q.Media.WebRTC.clipEditor = {};
        }
        Q.Media.WebRTC.clipEditor.tool = tool;

        tool.importChildClasses()
        .then(function () {
            tool.clipEditor = new Q.Media.WebRTC.clipEditor.ClipEditor();
            tool.element.appendChild(tool.clipEditor.element);
        })
        .catch(function (error) {
            console.error(error);
        });
    },

        {
            onRefresh: new Q.Event(),
            onLoad: new Q.Event(),
        },

        {
            importChildClasses: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.addScript([
                        '{{Media}}/js/tools/webrtc/EventSystem.js',
                        '{{Media}}/js/tools/webrtc/clipEditor/MP4Parser/BaseMP4Parser.js',
                        '{{Media}}/js/tools/webrtc/clipEditor/MP4Parser/RegularMP4parser.js',
                        '{{Media}}/js/tools/webrtc/clipEditor/MP4Parser/FragmentedMP4parser.js',
                        '{{Media}}/js/tools/webrtc/clipEditor/MediaPlayer.js',
                        '{{Media}}/js/tools/webrtc/clipEditor/ClipEditor.js',
                    ], function () {
                        resolve();
                    });
                });
            },
            refresh: function () {
             
            },
        }
    )
})(window.jQuery, window);