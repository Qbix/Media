Q.Media.WebRTC.livestreaming.RoomSpeechRecognizer = function (options) {
    if(!options.webrtcSignalingLib) {
        console.error('webrtcSignalingLib is required');
        return;
    }

    const thisInstance = this;

    this.state = 'inactive'; //active || inactive

    const webrtcSignalingLib = options.webrtcSignalingLib;

    const speechRecognizers = new Map();

    webrtcSignalingLib.event.on('joined', syncParticipants);
    webrtcSignalingLib.event.on('participantConnected', syncParticipants);
    webrtcSignalingLib.event.on('participantDisconnected', syncParticipants);

    syncParticipants();

    function syncParticipants() {
        console.log('syncParticipants START')

        let participants = webrtcSignalingLib.roomParticipants();
        for (let i in participants) {
            const participant = participants[i];
            if (speechRecognizers.has(participant)) continue;

            const userSpeechRecognizer = new Q.Media.WebRTC.livestreaming.UserSpeechRecognizer({
                autoRestart: true,
                startTimeSinceOrigin: options.startTimeSinceOrigin,
                participant: participant
            })

            let newSpeechRecognizer = speechRecognizers.set(participant, userSpeechRecognizer);
            if(thisInstance.state == 'active') userSpeechRecognizer.start();
            console.log('syncParticipants recognizer added', newSpeechRecognizer)
        }

        for (const [participant, userSpeechRecognizer] of speechRecognizers) {
            let participantOffline = participants.indexOf(participant) === -1;
            if (participantOffline) {
                console.log('syncWithAudioTracks track deleted', participant)
                userSpeechRecognizer.stop();
                //speechRecognizers.delete(participant);
            }
        }
    }

    this.start = function () {
        for (const [participant, userSpeechRecognizer] of speechRecognizers) {
            userSpeechRecognizer.start();
        }

        this.state = 'active';
    }

    this.stop = function () {
        for (const [participant, userSpeechRecognizer] of speechRecognizers) {
            userSpeechRecognizer.stop();
            //speechRecognizers.delete(participant);
        }
        this.state = 'inactive';
    }

    this.exportJSON = function () {
        let allCaptions = [];
        for (const [participant, userSpeechRecognizer] of speechRecognizers) {
            let userCaptions = userSpeechRecognizer.getCaptions();
            allCaptions = allCaptions.concat(userCaptions);
        }
        allCaptions.sort((a, b) => a.start - b.start);

        console.log('allCaptions', allCaptions)
        return JSON.stringify(allCaptions);
    }

    this.saveToIndexedDB = function () {

    }
}