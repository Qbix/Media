Q.page("Media/games", function () {
    var url = new URL(location.href);
    var publisherId = url.searchParams.get("publisherId");
    var streamName = url.searchParams.get("streamName");

    var contentEl = document.getElementById('content');
    /* var fileManager = document.createElement('DIV');
    fileManager.style.marginTop = '10px';
    fileManager.innerHTML = 'File Manager';
    contentEl.appendChild(fileManager); */
    
    var gameElement = document.createElement('DIV');
    //gameElement.style.marginTop = '10px';
    gameElement.style.width = '100%';
    gameElement.style.height = '100%';
    contentEl.appendChild(gameElement);

    

    /* Q.activate(
        Q.Tool.setUpElement(
            'DIV',
            "Streams/fileManager",
            {
                position: 'absolute'
            }
        ),
        {},
        function (toolEl) {
            let _fileManagerTool = this;
            fileManager.addEventListener('click', function () {
                let elementToShowIn = document.createElement('DIV');
                elementToShowIn.style.minWidth = '640px';
                elementToShowIn.style.minHeight = '360px';
               
                Q.Dialogs.push({
                    title: 'File Manager',
                    content: elementToShowIn,
                    onActivate: function () {
                        _fileManagerTool.showDialog(elementToShowIn);
                    }
                });
            })
        }
    ) */
    
    if (publisherId && streamName) {
        Q.Streams.get(publisherId, streamName, function (err, stream) {
            if(!stream) {
                showConfirm();
                return;
            }

            activateTool(publisherId, streamName);
        });
        
        return;
    } else {
        showConfirm();
    }

    function showConfirm() {
        Q.confirm('Do you want to create quickdraw game?', function (result) {
            if (!result) {
                return;
            }
            createGameStream('quickdraw').then(function (stream) {
                activateTool(stream.fields.publisherId, stream.fields.name);
            })

        });
    }

    function createGameStream(gameName) {
        return new Promise(function (resolve, reject) {
            Q.req("Media/games", [gameName], function (err, response) {
                var msg = Q.firstErrorMessage(err, response && response.errors);

                if (msg) {
                    Q.alert(msg);
                    reject(msg)
                    return;
                }

                Q.Streams.get(response.slots[gameName].fields.publisherId, response.slots[gameName].fields.name, function (err, stream) {
                    resolve(stream);
                });
            }, {
                method: 'post',
                fields: {
                    
                }
            });
        });
    }

    function activateTool(publisherId, streamName) {
        Q.activate(
            Q.Tool.setUpElement(gameElement, 'Games/quickdraw', {
                publisherId: publisherId,
                streamName: streamName
            }),
            {},
            function () {
                
            }
        ); 
    }
    return function () {
        // code to execute before page starts unloading
    };
}, 'Media');