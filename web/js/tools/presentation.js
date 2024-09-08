(function (Q, $, window, undefined) {

var Streams = Q.Streams;
var Users = Q.Users;
var Media = Q.Media;

/**
 * @module Streams-tools
 */

/**
 * Renders a presentation taking place on a stream
 * in which the user has at least testReadLevel("content")
 * @class Media presentation
 * @constructor
 * @param {Object} [options] any options for the tool
 * @param {Object} [options.show] optionally, pass the stream to show in the presentation initially
 * @param {Object} [options.publisherId]
 * @param {Object} [options.streamName]
 * @param {Boolean} [options.mode] forwards it to all the child tools. Can be "participant" or "broadcast".
 * @param {Object} [options.displayTools] keys are the types of streams that can be rendered,
 *  while values are the names of the tools to use,
 *  which will receive options "streamName", "publisherId", and "extra".
 *  The values can also be functions returning the tool names.
 *  Feel free to expand it in Q.Tool.define.options
 */
Q.Tool.define("Media/presentation", function(options) {
    var tool = this;
    var state = tool.state;
    tool.stack = [];


    tool.element.style.cursor = 'pointer';

    if (state.publisherId && state.streamName) {
        Streams.retainWith(tool).get(state.publisherId, state.streamName,
        function (err, stream) {
            if (err) {
                debugger;
                return;
            }

            if (!Q.isEmpty(state.show)) {
                tool.show(
                    state.show.publisherId,
                    state.show.streamName
                );
            }
            stream.onEphemeral('Media/presentation/show')
            .set(function (ephemeral) {
                if (ephemeral) {
                    tool.show(
                        ephemeral.publisherId, 
                        ephemeral.streamName
                    );
                }
            }, tool);
            var presentingUserIds = [stream.fields.publisherId];
            Q.each(this.participants, function () {
                if (this.testRoles('presenter')) {
                    presentingUserIds.push(this.userId);
                }
            });
            state.presentingUserIds = presentingUserIds;
            state.title = stream.fields.title;
            tool.refresh(stream);
        }, {
            participants: 100
        });

        // try to preload related tools
        Q.Streams.Tool.preloadRelated(state.publisherId, state.streamName, tool.element);
    }
    tool.current = {};
    tool.refresh();
},
{
    publisherId: null,
    streamName: null,
    title: "Untitled Presentation",
    ephemeral: null,
    mode: null,
    presentingUserIds: [],
    displayTools: {
        'Streams/image': 'Media/presentation/image',
        'Streams/video': 'Media/presentation/video',
        'Streams/audio': 'Media/presentation/audio',
        'Streams/pdf': 'Media/presentation/pdf',
        'Streams/webpage': 'Media/presentation/webpage',
        'Streams/question': 'Media/presentation/question'
    },
    animation: {
        duration: 500
    }
},
{
    refresh: function (stream) {
        var tool = this;
        var state = this.state;
        Q.Template.render(
            'Media/presentation',
            Q.take(tool.state, ['title', 'presentingUserIds']),
            { tool: tool }
        ).then(function (html) {
            Q.replace(tool.element, html);

            $(".Media_presentation_title", tool.element).tool("Streams/inplace", {
                editable: false,
                field: "title",
                publisherId: state.publisherId,
                streamName: state.streamName
            }).activate();

            Q.activate(tool.element);
        });
    },
    next: function () {

    },
    show: function (publisherId, streamName, transition = 'dissolve') {
        var tool = this;
        var state = this.state;
        if (tool.current.publisherId == publisherId
        &&  tool.current.streamName == streamName) {
            return tool.current.tool.nextState && tool.current.tool.nextState();
        }
        Streams.get(publisherId, streamName)
        .then(function (stream) {
            var toolName = state.displayTools[stream.fields.type];
            if (typeof toolName == 'function') {
                toolName = toolName(stream);
            }
            if (!toolName) {
                return console.warn("Media/presentation: no tool defined for displaying " + stream.fields.type);
            }
            if (!Q.Tool.defined(toolName)) {
                return console.warn("Media/presentation: tool " + toolName + " for rendering " + stream.fields.type + " was not defined");
            }
            if (!stream.testReadLevel('content')) {
                return console.warn("Media/presentation: can't view content of " + stream.fields.name);
            }

            var next;
            $(">.Q_tool", tool.element).each(function () {
                var thisTool = Q.Tool.from(this, toolName);
                if (Q.getObject("state.publisherId", thisTool) === publisherId && Q.getObject("state.streamName", thisTool) === streamName) {
                    next = this;
                }
            });
            if (!next) {
                next = Q.Tool.prepare('div', toolName, {
                    publisherId: publisherId,
                    streamName: streamName,
                    mode: state.mode
                }, null, tool.prefix);
                tool.element.appendChild(next);
            }

            var current = tool.stack[tool.stack.length-1]
                || tool.element.getElementsByClassName('Media_presentation_screen')[0];
            tool.stack.push(next);
            Q.activate(next, function () {
                // transition
                Q.Animation.play(function (x, y) {
                    next.style.display = 'block';
                    next.style.opacity = y;
                    if (!current) {
                        return;
                    }
                    current.style.opacity = 1-y;
                    if (y == 1) {
                        current.style.display = 'none';
                    }
                }, state.animation.duration, 'linear');
                tool.current.publisherId = publisherId;
                tool.current.streamName = streamName;
                tool.current.tool = this;
            });
        }).catch(function (exception) {
            debugger;
        });
    }
});

})(Q, Q.jQuery, window);

Q.Template.set('Media/presentation', 
    `<div class="Media_presentation_screen Media_presentation_title_screen">
        <div class="Media_presentation_title"></div>
        <div class="Media_presentation_presenters">
        {{#each presentingUserIds}}
            {{{tool "Users/avatar" userId=this}}}
        {{/each}}
        </div>
    </div>`
);


/*

	$('<div />').tool('Streams/related', {
		publisherId: state.publisherId,
		streamName: state.streamName,
		creatable: {
			'Media/presentation/slide': {
				title: 'New Slide'
			}
		},
		'.Media_presentation_slide_preview_tool': {
			onInvoke: 'Q.Media.Presentation.Slide.invoke'
		},
		relationType: 'Media/presentation/slides'
	}).appendTo(tool.element).activate();

*/