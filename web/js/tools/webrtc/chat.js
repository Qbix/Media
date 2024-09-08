(function (Q, $, window, undefined) {
	/**
	 * This Streams/chat
	 * @class Streams/audio/chat
	 * @constructor
	 * @param {Object} [options] this is an object that contains parameters for this function
	 * @param {string} [options.appendTo=bubble] Where to append preview tool in chat message:
	 * 	bubble - inside bubble element of message,
	 * 	message - inside message element itself
	 */
	Q.Tool.define("Media/webrtc/chat", ["Streams/chat"], function (options, chatTool) {
		var tool = this;
        tool.chatTool = chatTool;

        // For now, for backward compatibility
        // let's just put startWebRTC tool on the chat tool.
        // Really, we should remove references to webrtc from Streams,
        // but this will be an exception since it's used in so many places.
        chatTool.startWebRTC = function () {
            tool.startWebRTC();
        }

        // call button handler
        var isTextarea = (chatTool.state.inputType === 'textarea');
        var sel1 = '.Streams_chat_composer textarea';
        var sel2 = '.Streams_chat_composer input[type=text]';
        var $input = tool.$(isTextarea ? sel1: sel2);

        chatTool.state.onRefresh.set(function () {
            var $element = $('<div class="Streams_chat_call Streams_chat_submit_replacement Q_appear" data-touchlabel="' + tool.chatTool.text.chat.JoinWebRTC + '"></div>');
            $(this.element).find('.Streams_chat_submit').after($element);
            $element.on(Q.Pointer.fastclick, function(e){
                e.stopPropagation();
                e.preventDefault();
                $input.blur();
                tool.startWebRTC();
            });
        }, tool);
	},

	{
		
	},

	{
        /**
         * @method startWebRTC
         * Trying to connect user to video/audio conversation related to current chat stream.
         * If WebRTC stream doesn't exist, try to create one.
         */
        startWebRTC: function () {
            console.log('startWebRTC');
            var tool = this;
            var state = this.state;
            var chatTool = tool.chatTool;
            if (chatTool.state.webrtc) {
                return console.log('startWebRTC state.webrtc');
            }
            chatTool.element.setAttribute('data-webrtc', 'loading');
            Q.Media.WebRTC.start({
                roomPublisherId: Q.Users.loggedInUserId(),
                publisherId: chatTool.state.publisherId,
                streamName: chatTool.state.streamName,
                closeManually: true,
                tool: tool,
                useRelatedTo: true,
                onWebrtcControlsCreated: function () {
                    chatTool.element.setAttribute('data-webrtc', true);
                },
                onStart: function () {
                    chatTool.state.webrtc = this;
                },
                onEnd: function () {
                    chatTool.state.webrtc = null;
                    chatTool.element.setAttribute('data-webrtc', false);
                }
            });
        }
	});

})(Q, Q.jQuery, window);