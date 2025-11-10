(function (Q, $, window, undefined) {

/**
* Media/channel/preview tool.
* Renders a tool to preview Media clip
* @class Media/channel/preview
* @constructor
* @param {Object} [options] options to pass besides the ones to Streams/preview tool
*/
Q.Tool.define("Media/channel/preview", ["Streams/preview"], function _Media_clip_preview (options, preview) {
	var tool = this;
	tool.preview = preview;

	//preview.state.creatable.preprocess = tool.composer.bind(this);
	/*preview.state.onCreate.set(function () {
		Q.Dialogs.pop();
	}, tool);*/

	preview.state.onRefresh.add(tool.refresh.bind(tool));
},

{
	relationType: "Media/channel",
	onInvoke: new Q.Event(function () {
		var tool = this;
		var stream = this.stream;

		Q.invoke({
			title: stream.fields.title,
			content: $("<div>").tool("Media/channel", {
				publisherId: stream.fields.publisherId,
				streamName: stream.fields.name
			}),
			trigger: tool.element,
			callback: function (options, index, div, data) {
				console.log("Media/channel tool loaded");
			}
		});
	}, 'Media/channel/preview')
},

{
	refresh: function (stream, callback) {
		var tool = this;
		var state = this.state;
		var $toolElement = $(tool.element);

		tool.stream = stream;

		// retain with stream
		Q.Streams.retainWith(tool).get(stream.fields.publisherId, stream.fields.name);

		setTimeout(function () {
			$toolElement.tool("Streams/default/preview").activate(function () {
				$toolElement.off(Q.Pointer.fastclick).on(Q.Pointer.fastclick, function () {
					Q.handle(state.onInvoke, tool);
				});
			});
		}, 0);
	}
});

})(Q, Q.jQuery, window);