var fakeIdToId = {};
onmessage = function (event) {
	var data = event.data,
		name = data.name,
		fakeId = data.fakeId,
		time;
	if (data.hasOwnProperty('time')) {
		time = data.time;
	}
	switch (name) {
		case 'runWithSpecificFrameRate':
			fakeIdToId[fakeId] = animateWithSpecificFrameRate(event.data.frameRate, function () {
				postMessage({ fakeId: fakeId });
			})
			break;
		case 'stopRunWithSpecificFrameRate':
			if (fakeIdToId.hasOwnProperty(fakeId)) {
				fakeIdToId[fakeId]();
				delete fakeIdToId[fakeId];
			}
			break;
		case 'setInterval':
			fakeIdToId[fakeId] = setInterval(function () {
				postMessage({ fakeId: fakeId });
			}, time);
			break;
		case 'clearInterval':
			if (fakeIdToId.hasOwnProperty(fakeId)) {
				clearInterval(fakeIdToId[fakeId]);
				delete fakeIdToId[fakeId];
			}
			break;
		case 'setTimeout':
			fakeIdToId[fakeId] = setTimeout(function () {
				postMessage({ fakeId: fakeId });
				if (fakeIdToId.hasOwnProperty(fakeId)) {
					delete fakeIdToId[fakeId];
				}
			}, time);
			break;
		case 'clearTimeout':
			if (fakeIdToId.hasOwnProperty(fakeId)) {
				clearTimeout(fakeIdToId[fakeId]);
				delete fakeIdToId[fakeId];
			}
			break;
	}
}

function animateWithSpecificFrameRate(frameRate, callback) {
	var stopped = false;

	const updateRate = frameRate;
	const updatePeriod = 1000 / updateRate;

	let lastTickTime = null;
	function tick() {
		if(stopped) {
			return;
		}

		const now = performance.now();

		if (lastTickTime === null) {
			callback();
			lastTickTime = now;
			tick();
			return;
		}

		// This loop now encodes as many frames as necessary to "catch up" with now again
		while (now - lastTickTime >= updatePeriod) {
			callback();
			lastTickTime += updatePeriod;
		}

		setTimeout(tick, 0);
	}

	setTimeout(tick, 0);

	return function () {
		stopped = true;
	}
}