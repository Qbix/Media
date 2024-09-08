(function (workerScript) {

	var Media = Q.Media;

	var worker,
		fakeIdToCallback = {},
		lastFakeId = 0,
		maxFakeId = 0x7FFFFFFF, // 2 ^ 31 - 1, 31 bit, positive values of signed 32 bit integer
		logPrefix = 'HackTimer.js by turuslan: ';
	if (typeof (Worker) !== 'undefined') {
		function getFakeId() {
			do {
				if (lastFakeId == maxFakeId) {
					lastFakeId = 0;
				} else {
					lastFakeId++;
				}
			} while (fakeIdToCallback.hasOwnProperty(lastFakeId));
			return lastFakeId;
		}
		try {
			worker = new Worker(Q.url('{{Media}}/js/tools/webrtc/HackTimerWorker.js'));
			Q.Media.runWithSpecificFrameRate = function (callback, frameRate) {
				var fakeId = getFakeId();
				fakeIdToCallback[fakeId] = {
					callback: callback,
					parameters: Array.prototype.slice.call(arguments, 2)
				};
				worker.postMessage({
					name: 'runWithSpecificFrameRate',
					fakeId: fakeId,
					frameRate: frameRate
				});
				return fakeId;
			};
			Q.Media.stopRunWithSpecificFrameRate = function (fakeId) {
				if (fakeIdToCallback.hasOwnProperty(fakeId)) {
					delete fakeIdToCallback[fakeId];
					worker.postMessage({
						name: 'stopRunWithSpecificFrameRate',
						fakeId: fakeId
					});
				}
			};
			Q.Media.setWorkerInterval = function (callback, time /* , parameters */) {
				var fakeId = getFakeId();
				fakeIdToCallback[fakeId] = {
					callback: callback,
					parameters: Array.prototype.slice.call(arguments, 2)
				};
				worker.postMessage({
					name: 'setInterval',
					fakeId: fakeId,
					time: time
				});
				return fakeId;
			};
			Q.Media.clearWorkerInterval = function (fakeId) {
				if (fakeIdToCallback.hasOwnProperty(fakeId)) {
					delete fakeIdToCallback[fakeId];
					worker.postMessage({
						name: 'clearInterval',
						fakeId: fakeId
					});
				}
			};
			Q.Media.setWorkerTimeout = function (callback, time /* , parameters */) {
				var fakeId = getFakeId();
				fakeIdToCallback[fakeId] = {
					callback: callback,
					parameters: Array.prototype.slice.call(arguments, 2),
					isTimeout: true
				};
				worker.postMessage({
					name: 'setTimeout',
					fakeId: fakeId,
					time: time
				});
				return fakeId;
			};
			Q.Media.clearWorkerTimeout = function (fakeId) {
				if (fakeIdToCallback.hasOwnProperty(fakeId)) {
					delete fakeIdToCallback[fakeId];
					worker.postMessage({
						name: 'clearTimeout',
						fakeId: fakeId
					});
				}
			};
			worker.onmessage = function (event) {
				var data = event.data,
					fakeId = data.fakeId,
					request,
					parameters,
					callback;
				if (fakeIdToCallback.hasOwnProperty(fakeId)) {
					request = fakeIdToCallback[fakeId];
					callback = request.callback;
					parameters = request.parameters;
					if (request.hasOwnProperty('isTimeout') && request.isTimeout) {
						delete fakeIdToCallback[fakeId];
					}
				}
				if (typeof (callback) === 'string') {
					try {
						callback = new Function(callback);
					} catch (error) {
						console.log(logPrefix + 'Error parsing callback code string: ', error);
					}
				}
				if (typeof (callback) === 'function') {
					callback.apply(window, parameters);
				}
			};
			worker.onerror = function (event) {
				console.log(event);
			};
		} catch (error) {
			console.log(logPrefix + 'Initialisation failed');
			console.error(error);
		}
	} else {
		console.log(logPrefix + 'Initialisation failed - HTML5 Web Worker is not supported');
	}
})('HackTimerWorker.js');
