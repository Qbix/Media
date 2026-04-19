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
        let participants = webrtcSignalingLib.roomParticipants();
        for (let i in participants) {
            const participant = participants[i];
            if (speechRecognizers.has(participant)) continue;

            const userSpeechRecognizer = new Q.Media.WebRTC.livestreaming.UserSpeechRecognizer({
                autoRestart: true,
                startTimeSinceOrigin: options.startTimeSinceOrigin,
                participant: participant,
                onSegment: options.onSegment
            })

            let newSpeechRecognizer = speechRecognizers.set(participant, userSpeechRecognizer);
            if(thisInstance.state == 'active') userSpeechRecognizer.start();
        }

        for (const [participant, userSpeechRecognizer] of speechRecognizers) {
            let participantOffline = participants.indexOf(participant) === -1;
            if (participantOffline) {
                userSpeechRecognizer.stop();
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
        }
        this.state = 'inactive';
    }

    this.getCaptions = function () {
        let allCaptions = [];
        for (const [participant, userSpeechRecognizer] of speechRecognizers) {
            let userCaptions = userSpeechRecognizer.getCaptions();
            allCaptions = allCaptions.concat(userCaptions);
        }
        allCaptions.sort((a, b) => a.start - b.start);
        return allCaptions;
    }

    this.exportJSON = function () {
        

        return JSON.stringify(this.getCaptions());
    }

    this.exportWebVTT = function () {
        const captions = this.getCaptions();
        return captions.map((c, i) => {
            return (
                formatTime(c.start, '.') + " --> " + formatTime(c.end || now(), '.') + "\n" +
                c.text.trim() + "\n"
            );
        }).join("\n");
    };

    this.saveToIndexedDB = function () {

    }

    function formatTime(ms, timeSeparator) {
        const totalSeconds = Math.floor(ms / 1000);
        const msPart = Math.floor(ms % 1000);

        const s = totalSeconds % 60;
        const m = Math.floor(totalSeconds / 60) % 60;
        const h = Math.floor(totalSeconds / 3600);

        return (
            String(h).padStart(2, '0') + ":" +
            String(m).padStart(2, '0') + ":" +
            String(s).padStart(2, '0') + timeSeparator +
            String(msPart).padStart(3, '0')
        );
    }
}