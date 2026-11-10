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

		// This tool's own instance can be torn down while its DOM --
		// including the Media/clip child appended below -- survives
		// untouched (e.g. Q/tabs' "retain" tab-caching stashes a whole
		// rendered subtree via Q.Tool.remove() when leaving a tab, then
		// restores that same markup and re-activates it when the tab is
		// switched back to; the restore resurrects this constructor
		// without the child it appended last time ever having gone
		// away). Appending another child unconditionally here would
		// leave two Media/clip elements sharing one id, each getting
		// its own Safecloud player and independently calling
		// Streams/join -- confirmed live as the cause of duplicate
		// "credits granted" notices and a video column that stops
		// opening after its mask gets confused by the extra element.
		// Re-activating a surviving child is a safe no-op when it's
		// already fully active, so check first instead of duplicating.
		var element = this.element.querySelector('.Media_clip_tool');
		if (!element) {
			element = Q.Tool.setUpElement('div', 'Media/clip', options, 'Media_clip');
			this.element.appendChild(element);
		}
		Q.activate(element);
	});
})(Q, Q.jQuery);