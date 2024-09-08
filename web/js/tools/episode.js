(function (Q, $) {
	/**
	 * Media Tools
	 * @module Media-tools
	 * @main
	 */
	var Users = Q.Users;
	var Streams = Q.Streams;

	/**
	 * Interface for rendering episode
	 * @class Media episode
	 * @constructor
	 */
	Q.Tool.define("Media/episode", function(options) {

		var element = Q.Tool.setUpElement('div', 'Media/clip', options, 'Media_clip');
		this.element.appendChild(element);
		Q.activate(element);
	});
})(Q, Q.jQuery);