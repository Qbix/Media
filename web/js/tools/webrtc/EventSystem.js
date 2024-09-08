Q.Media.WebRTC.EventSystem = function() {

    var events = {};

    var CustomEvent = function (eventName) {

        this.eventName = eventName;
        this.callbacks = [];

        this.registerCallback = function (callback) {
            this.callbacks.push(callback);
        }

        this.unregisterCallback = function (callback) {
            const index = this.callbacks.indexOf(callback);
            if (index > -1) {
                this.callbacks.splice(index, 1);
            }
        }

        this.fire = function (data) {
            const callbacks = this.callbacks.slice(0);
            callbacks.forEach((callback) => {
                callback(data);
            });
        }
    }

    var dispatch = function (eventName, data) {
        const event = events[eventName];
        if (event) {
            event.fire(data);
        }
    }

    var on = function (eventName, callback) {
        let event = events[eventName];
        if (!event) {
            event = new CustomEvent(eventName);
            events[eventName] = event;
        }
        event.registerCallback(callback);
    }

    var off = function (eventName, callback) {
        const event = events[eventName];
        if (event && event.callbacks.indexOf(callback) > -1) {
            event.unregisterCallback(callback);
            if (event.callbacks.length === 0) {
                delete events[eventName];
            }
        }
    }

    var destroy = function () {
        events = {};
    }

    return {
        dispatch: dispatch,
        on: on,
        off: off,
        destroy: destroy
    }
}