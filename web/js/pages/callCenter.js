Q.page("Media/callCenter", function () {
    var url = new URL(location.href);
    var role = url.searchParams.get("role");
    var publisherId = url.searchParams.get("publisherId");
    var streamName = url.searchParams.get("streamName");

    if(role == 'manager') {
    
        var contentEl = document.getElementById('content');
        var livestreamElement = document.createElement('DIV');
        livestreamElement.style.marginTop = '10px';
        //livestreamElement.style.position = 'absolute';
        //livestreamElement.style.width = '634px';
        //livestreamElement.style.height = 'auto';
        contentEl.appendChild(livestreamElement);

        if(publisherId && streamName) {
            activateTool(publisherId, streamName);
            return;
        } else {
            Q.confirm('Do you want create WebRTC room for call center?', function (result) {
                if (!result) {
                    return;
                }
                createWebRTCStream().then(function(stream) {
                    activateTool(stream.fields.publisherId, stream.fields.name);
                })
                
            });
        }


        function createWebRTCStream() {
            return new Promise(function (resolve, reject) {
                Q.req("Media/webrtc", ["room"], function (err, response1) {
                    var msg = Q.firstErrorMessage(err, response1 && response1.errors);
    
                    if (msg) {
                        Q.alert(msg);
                        reject(msg)
                        return;
                    }
                    
                    let roomId = (response1.slots.room.roomId).replace('Media/webrtc/', '');
                    Q.Streams.get(response1.slots.room.stream.fields.publisherId, 'Media/webrtc/' + roomId, function (err, stream) {
                        resolve(stream);
                    });
                }, {
                    method: 'post',
                    fields: {
                        publisherId: Q.Users.loggedInUserId(),
                        writeLevel: 0,
                    }
                });
            });  
        }

        function activateTool(publisherId, streamName) {

            var columnTools = Q.Tool.byName('Q/columns');
            var columnTool = columnTools[Object.keys(columnTools)[0]];
            columnTool.push({
                title: 'Calls',
                column: Q.Tool.setUpElement(livestreamElement, 'Media/webrtc/callCenter/manager', {
                    publisherId: publisherId,
                    streamName: streamName,
                    columnTool: columnTool
                }),
            });
        }
    
       
    } else {
        if(!publisherId && !streamName) {
            return;
        }

        var _callCenterClientTool;
        Q.activate(
            Q.Tool.setUpElement('div', 'Media/webrtc/callCenter/client', {
                publisherId: publisherId,
                streamName: streamName,
            }),
            {},
            function () {
                _callCenterClientTool = this;
                _callCenterClientTool.requestCall();
            }
        ); 
    }

    
   
    return function () {
        // code to execute before page starts unloading
    };
}, 'Media');