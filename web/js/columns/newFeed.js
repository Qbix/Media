"use strict";
(function(Q, $, undefined) {

Q.exports(function (options, index, columnElement, data) {
	var columnsTool = Q.Tool.from($(columnElement).closest(".Q_columns_tool")[0], "Q/columns");

	Q.addStylesheet('{{Media}}/css/columns/feedComposer.css', { slotName: 'Media' });

	columnElement.forEachTool('Media/feed/composer', function () {
		this.state.onCreate.set(function (stream) {
			Q.handle(Q.Media.pushFeedColumn, null, [stream, $(".Q_column_0", columnsTool.element)]);
		}, "Media/newFeed/column");
	});
});

})(Q, Q.jQuery);