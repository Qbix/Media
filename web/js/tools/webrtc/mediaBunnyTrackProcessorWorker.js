const sendMessage = (message, transfer) => {
    if (transfer) {
        self.postMessage(message, { transfer });
    } else {
        self.postMessage(message);
    }
};
sendMessage({
    type: "support",
    supported: typeof MediaStreamTrackProcessor !== "undefined"
});
const abortControllers = /* @__PURE__ */ new Map();
const activeTracks = /* @__PURE__ */ new Map();
self.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
        case "videoTrack":
            {
                activeTracks.set(message.trackId, message.track);
                const processor = new MediaStreamTrackProcessor({ track: message.track });
                const consumer = new WritableStream({
                    write: (videoFrame) => {
                        if (!activeTracks.has(message.trackId)) {
                            videoFrame.close();
                            return;
                        }
                        sendMessage({
                            type: "videoFrame",
                            trackId: message.trackId,
                            videoFrame
                        }, [videoFrame]);
                    }
                });
                const abortController = new AbortController();
                abortControllers.set(message.trackId, abortController);
                processor.readable.pipeTo(consumer, {
                    signal: abortController.signal
                }).catch((error) => {
                    if (error instanceof DOMException && error.name === "AbortError") return;
                    sendMessage({
                        type: "error",
                        trackId: message.trackId,
                        error
                    });
                });
            }
            ;
            break;
        case "stopTrack":
            {
                const abortController = abortControllers.get(message.trackId);
                if (abortController) {
                    abortController.abort();
                    abortControllers.delete(message.trackId);
                }
                const track = activeTracks.get(message.trackId);
                track?.stop();
                activeTracks.delete(message.trackId);
                sendMessage({
                    type: "trackStopped",
                    trackId: message.trackId
                });
            }
            ;
            break;
        default:
            assertNever(message);
    }
});