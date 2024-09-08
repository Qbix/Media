(function (Q, $, window, undefined) {

var Users = Q.Users;
var Streams = Q.Streams;

/**
 * This tool lets the user create new camera feed
 * @class Media/feed
 * @constructor
 * @param {Object} [options] this is an object that contains parameters for this function
 *   @param {Q.Event} [options.onCreate] This event eexecute when the tool successfully creates a new feed
 *   @param {Function} [options.setLocation] Function to obtain the user's location,
 *     defaults to showing a dialog with Places/user/location tool.
 */
Q.Tool.define("Media/feed/composer", function(options) {
	var tool = this;
	var state = this.state;

	var pipe = Q.pipe(['styles', 'scripts', 'texts'], tool.refresh.bind(tool));

	Q.addStylesheet([
		'{{Media}}/css/tools/feedComposer.css',
		'{{Q}}/pickadate/themes/default.css',
		'{{Q}}/pickadate/themes/default.date.css'
	], pipe.fill('styles'));

	Q.addScript([
		'{{Q}}/pickadate/picker.js',
		'{{Q}}/pickadate/picker.date.js'
	], function () {
		var waitingPickadate = setInterval(function () {
			if (Q.typeOf($().pickadate) !== 'function') {
				return;
			}

			clearInterval(waitingPickadate);

			pipe.fill('scripts')();
		}, 100);
	});

	Q.Text.get('Media/content', function (err, text) {
		tool.text = text;
		pipe.fill('texts')();
	});
},

{
	onCreate: new Q.Event(),
	setLocation: function () {
		var tool = this;
		var title = Q.getObject(['newFeed', 'locationTitle'], tool.text);
		var element = Q.Tool.setUpElement('div', 'Places/user/location');
		Q.Dialogs.push({
			title: title || 'Set Your Location',
			content: element,
			onActivate: function (dialog) {
				var $element = $(dialog).find('.Places_user_location_set');
				Q.Pointer.hint($element, { show: { delay: 1000 } });
				Q.Tool.from(element).state.onSet.set(function () {
					tool.$location.attr('data-locationDefined', true);
					Q.Dialogs.pop();
				}, tool);
			}
		});
	},
	show: {
		location: true,
		date: false
	}
},

{
	refresh: function () {
		var tool = this;
		var state = tool.state;

		// check if composer filled, if no - render template and call refresh again
		if (!tool.element.innerHTML) {
			return Q.Template.render('Media/feed/composer',{
				show: state.show,
				newFeed: tool.text.newFeed
			}, function (err, html) {
				tool.element.innerHTML = html;
				Q.activate(tool.element);
				tool.refresh();
			});
		}

		tool.$composer = tool.$('.Media_feed_composer');
		tool.$location = tool.$('.Media_feed_composer_location');
		tool.$address = tool.$('.Places_address_tool');
		tool.$results = tool.$('.Q_filter_results', tool.$address);
		tool.$time = tool.$('.Media_feed_composer_time');
		tool.$date = tool.$('.Media_feed_composer_date');
		tool.$privacy = tool.$('.Media_feed_composer_privacy');
		tool.$labels = tool.$('.Media_feed_composer_labels');
		tool.$title = tool.$('.Media_feed_composer_title input').plugin("Q/placeholders");
		tool.$create = tool.$('button.Media_feed_composer_create');

		tool.$create.on(Q.Pointer.click, function () {
			if (tool.$date.length) {
				var day = tool.$date.nextAll('input[name=date]').val().split('/');
				//var time = tool.$time.val().split(':');
				var date = new Date(
					day[0], day[1]-1, day[2]
					//time[0], time[1]
				);
			}

			//var localStartDateTime = day.join('-') + ' ' + time.join(':');
			//var labels = tool.$labels.val();
			//if (labels === 'Media/*') {
			//	labels = '';
			//}

			var locationTool, areasTool;
			locationTool = Q.Tool.from(tool.$(".Places_location_tool"), "Places/location");
			state.placeId = Q.getObject('state.location.placeId', locationTool);

			areasTool = Q.Tool.from(tool.$(".Places_areas_tool"), "Places/areas");
			if (areasTool && areasTool.state.areaSelected) {
				state.areaSelected = JSON.stringify(areasTool.state.areaSelected);
			}

			var feedTitle = tool.$title.val();
			if (!feedTitle) {
				tool.$title.addClass("Q_errorFlash");

				// remove class when transaction ended
				tool.$title.one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(e) {
					tool.$title.removeClass("Q_errorFlash");
				});

				return;
			}

			var fields = {
				title: feedTitle,
				placeId: state.placeId,
				areaSelected: state.areaSelected || null,
				//localStartDateTime: localStartDateTime,
				//timezone: date.getTimezoneOffset(),
				//labels: labels
			};

			var intl = Q.Intl.calendar();
			if (intl.timeZone) {
				fields.timezoneName = intl.timeZone;
			}
			var $this = $(this);
			$this.addClass('Q_working').attr('disabled', 'disabled');

			Q.req('Media/feed', ['stream'], function (err, data) {
				var msg = Q.firstErrorMessage(err, data && data.errors);
				if (msg) {
					$this.removeClass('Q_working').removeAttr('disabled');
					return alert(msg);
				}

				var stream = data.slots.stream;
				Q.Streams.get(stream.publisherId, stream.name, function (err) {
					if (err) {
						return;
					}

					Q.handle(state.onCreate, tool, [this]);
				});
				//var stream = Q.Streams.Stream.construct(data.slots.stream, null, null, true);
			}, {
				method: 'post',
				fields: fields
			});

		});

		var date = new Date( Date.now() + 1000 * 60 * 60 * 24 );
		var y = date.getFullYear();
		var m = date.getMonth();
		var d = date.getDate();

		if (tool.$date.length) {
			tool.$date.pickadate({
				weekdaysShort: state.weekdays,
				showMonthsShort: true,
				format: 'ddd, mmm d, yyyy',
				formatSubmit: 'yyyy/mm/dd',
				hiddenName: true,
				min: new Date(),
				container: 'body',
				onStart: function () {
					this.set('select', new Date(y, m, d));
				}
			}).on('change', function () {
				_hideEarlierTimes(tool.$date, tool.$time);
			});
			_hideEarlierTimes(tool.$date, tool.$time);
		}

		// Set My Location button
		Streams.retainWith(true).get(Users.loggedInUser.id, "Places/user/location", function (err) {
			if (!err && this.getAttribute('latitude') && this.getAttribute('longitude')) {
				tool.$location.attr('data-locationDefined', true);
				return;
			}

			tool.$location.attr('data-locationDefined', false);
			tool.$('.Media_feed_composer_location_button').plugin('Q/clickable', {
				className: 'Media_feed_composer_location_button',
				press: {size: 1.2},
				release: {size: 1.2}
			}).on(Q.Pointer.fastclick, function () {
				Q.handle(state.setLocation, tool);
			});
		});

		function _hideEarlierTimes($date, $time) {
			var day = $date.nextAll('input[name=date]')
				.val().split('/');
			var now = new Date();
			$time.find('option').show();
			var shouldHide = true;
			if (now.getFullYear() !== parseInt(day[0])
				|| now.getMonth() !== parseInt(day[1])-1
				|| now.getDate() !== parseInt(day[2])) {
				shouldHide = false;
			}
			var now = new Date();
			var hours = now.getHours();
			var minutes = now.getMinutes();
			var $selected;
			$time.find('option').each(function () {
				var $option = $(this);
				var parts = $option.attr('value').split(':');
				if (parts[0] < hours
				|| (parts[0] == hours && parts[1] <= minutes)) {
					if (shouldHide) {
						$option.hide();
					}
				} else if (!$selected) {
					$time.val($option.attr('value'));
					$selected = $option;
				}
			});
		}
	}
});

Q.Template.set('Media/feed/composer',
'<div class="Media_feed_composer_title Media_feed_composer_section">' +
	'	<input name="feedTitle" class="Media_feed_composer_title Q_placeholder" placeholder="{{newFeed.FeedTitle}}">' +
	'</div>' +
	'{{#if show.location}}' +
	'<div class="Media_feed_composer_location Media_feed_composer_section" data-locationDefined="{{locationDefined}}">' +
		'{{{tool "Places/location" showCurrent=false showAreas=true}}}' +
		'<button class="Media_feed_composer_location_button Q_button">{{newFeed.SetLocation}}</button>' +
	'</div>' +
	'{{/if}}' +
	'{{#if show.date}}' +
	'<div class="Media_feed_composer_times Media_feed_composer_section">' +
	'	<div class="Media_feed_composer_date_container">' +
	'		<label for="Media_feed_composer_date">{{newFeed.Day}}:</label>' +
	'		<input name="date" class="Media_feed_composer_date">' +
	'	</div>' +
	//'	<div class="Media_feed_composer_time_container">' +
	//'		<label>{{newFeed.Starting}}:</label>' +
	//'		<select name="time" class="Media_feed_composer_time"></select>' +
	//'	</div>' +
	'</div>' +
	'{{/if}}' +
	/*'<div class="Media_feed_composer_privacy Media_feed_composer_section">' +
	'	<select name="labels" class="Media_feed_composer_labels">' +
	'	{{#each labels}}' +
	'		<option value="{{@key}}">{{this}}</option>' +
	'	{{/each}}' +
	'	</select>' +
	'</div>' +*/
	'<div class="Q_buttons Media_feed_composer_section">' +
	'	<button class="Q_button Q_aspect_when Media_feed_composer_create">{{newFeed.Create}}</button>' +
	'</div>'
);

})(Q, Q.jQuery, window);