(function ($, window, undefined) {

    Q.Tool.define("Games/quickdraw", function (options) {
        var tool = this;

        tool.init();
             
    },

        {
            publisherId: null,
            streamName: null,
            onRefresh: new Q.Event()
        },

        {
            init: function () {
                var tool = this;
                tool.loadStyles().then(function () {
                    tool.getGameStream().then(function (stream) {
                        tool.gameStream = stream;
                        let status = stream.getAttribute('status');
                        /* if(!status || status == 'gathering') {
                            tool.showTeamChooser();
                        } */
                        tool.initAndConnect();
                    })
                }).catch(function (err) {
                    Q.alert(err)
                });
            },
            loadStyles: function () {
                return new Promise(function (resolve, reject) {
                    Q.addStylesheet('{{Media}}/css/tools/quickdraw.css', function () {
                        resolve();
                    });
                });
            },
            getGameStream: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.Streams.get(tool.state.publisherId, tool.state.streamName, function (err, stream) {
                        if(!stream) {
                            console.error(err);
                            reject(err);
                            return;
                        }
            
                        resolve(stream);
                    });
                });
            },
            showTeamChooser: function () {
                var tool = this;
                let teamsContainer = document.createElement('DIV');
                teamsContainer.className = 'teams-chooser-con';
                tool.element.appendChild(teamsContainer);
                Q.activate(
                    Q.Tool.setUpElement(teamsContainer, 'Games/teams', {
                        publisherId: tool.state.publisherId,
                        streamName: tool.state.streamName,
                        onGameStart: function () {
                            initAndConnect();
                        }
                    }),
                    {},
                    function () {

                    }
                );
            },
            initAndConnect: function () {
                var tool = this;
                let whiteboradContainer = document.createElement('DIV');
                whiteboradContainer.className = 'qd-whiteboard';
                tool.element.appendChild(whiteboradContainer);

                Q.activate(
                    Q.Tool.setUpElement(whiteboradContainer, 'Media/whiteboard', {
                        publisherId: tool.gameStream.fields.publisherId,
                        streamName: tool.gameStream.fields.name,
                    }),
                    {},
                    function () {
                        tool.whiteboard = this;
                    }
                ); 
            }
        }

    );

})(window.jQuery, window);