(function (Q, $, window, document, undefined) {

    /**
     * @module Media-tools
     */
    
    /**
     * Renders a Media/slide stream,
     * including an interface to edit the presentation slide
     * for users who have the permissions to do so.
     * @method Media presentation slide
     * @param {Object} options
     * @param {String} options.publisherId
     * @param {String} options.streamName
     */
    Q.Tool.define("Media/slide", function () {
        var tool = this;
        var state = tool.state;
        $('<div />').tool('Streams/html', {
            publisherId: state.publisherId,
            streamName: state.streamName,
            field: 'html'
        }).appendTo(tool.element).activate();
    },
    
    {
    
    }
    
    );
    
    })(Q, Q.jQuery, window, document);