Q.Media.WebRTC.clipEditor.RegularMP4Parser = function (file, options) {
    const self = this;
    this.initBoxes = new Map();
    this.initSegment = null;
    this.initSegmentEnd = null;
    this.ftypBox = null;
    this.moovBox = null;
    this.parsedMoovBox = null;
    this.parsedOriginalMoovBox = null;
    this.bufferedSegments = [];
    this.timescales = null;
    this.trackIdsInfo = null;
    this.file = file;
    this.buf = null;       // accumulated ArrayBuffer of the header region
    this.view = null;
    this.boxes = [];
    this.segments = [];    // populated lazily via scanSegments()
    this.mimeType = null;
    this._initEnd = 0;
    this.startOffset = 0;
    this.endOffset = null;
    this.CHUNK_SIZE = 1 * 1024 * 1024; // 1 MB
    this.eventDispatcher = new Q.Media.WebRTC.EventSystem();
    this.segmentToTimeMap = new Map();
    this.sampleToTimeMap = new Map();
    this.flatMoofMdatPairs = [];
    this.keyframes = [];
    this.totalDuration;
    this.onFragment = options.onFragment;

    // This property is for real time playing and means the fragment from which playing started. 
    // The size between firstBufferedFragment and latestBufferedFragment should be CHUNK_SIZE. Threre should be no time gaps between firstBufferedFragment and latestBufferedFragment
    this.firstBufferedFragment = null;

    //this property is for real time playing and means the latest buffered fragment
    this.latestBufferedFragment = null;
    this.BOX_MOOV = 0x6D6F6F76; // "moov"
    this.BOX_MDAT = 0x6D646174; // "mdat"
    this.BOX = {
        ftyp: 0x66747970,
        moov: 0x6D6F6F76,
            mvhd: 0x6D766864,
            trak: 0x7472616B,
                tkhd: 0x746B6864,
                edts: 0x65647473,
                    elst: 0x656C7374,
                tref: 0x74726566,
                mdia: 0x6D646961,
                    mdhd: 0x6D646864,
                    hdlr: 0x68646C72,
                    minf: 0x6D696E66,
                        vmhd: 0x766D6864,
                        dinf: 0x64696E66,
                            dref: 0x64726566, 
                        smhd: 0x736D6864,
                        stbl: 0x7374626C,
                            stsd: 0x73747364,
                            stts: 0x73747473,
                            stss: 0x73747373,
                            ctts: 0x63747473,
                            stsc: 0x73747363,
                            stsz: 0x7374737A,
                            stco: 0x7374636F,
                            sgpd: 0x73677064,
                            sbgp: 0x73626770,
                            co64: 0x636F3634,
                        nmhd: 0x6E6D6864,
            udta: 0x75647461,
            mvex: 0x6D766578,
                trex: 0x74726578,
        mdat: 0x6D646174,

        //fragmented mp4 box
        moof: 0x6D6F6F66,
            mfhd: 0x6D666864,
            traf: 0x74726166,
                tfhd: 0x74666864,
                tfdt: 0x74666474,
                trun: 0x7472756E,
    };

    this.BOX_TYPE = Object.fromEntries(
        Object.entries(self.BOX).map(([key, value]) => [value, key])
    );

    this.BOX_PATHS = {
        [self.BOX.ftyp]: [self.BOX.ftyp],
        [self.BOX.moov]: [self.BOX.moov],
        [self.BOX.mvex]: [self.BOX.moov, self.BOX.mvex],
        [self.BOX.trex]: [self.BOX.moov, self.BOX.mvex, self.BOX.trex],
        [self.BOX.trak]: [self.BOX.moov, self.BOX.trak],
        [self.BOX.mdia]: [self.BOX.moov, self.BOX.trak, self.BOX.mdia],
        [self.BOX.minf]: [self.BOX.moov, self.BOX.trak, self.BOX.mdia, self.BOX.minf],
        [self.BOX.stbl]: [self.BOX.moov, self.BOX.trak, self.BOX.mdia, self.BOX.minf, self.BOX.stbl],
        [self.BOX.stss]: [self.BOX.moov, self.BOX.trak, self.BOX.mdia, self.BOX.minf, self.BOX.stbl, self.BOX.stss],
    };
}

const RegularMP4Parser = Q.Media.WebRTC.clipEditor.RegularMP4Parser;

RegularMP4Parser.prototype = Object.create(Q.Media.WebRTC.clipEditor.BaseMP4Parser.prototype);

RegularMP4Parser.prototype.updateCurrentTime = async function (currentTime, startOffset, options = {}) {
    const self = this;
    const fetchSessionInfo = options.fetchSessionInfo;
    console.log('updateCurrentTime START', currentTime, startOffset, fetchSessionInfo)
    console.log('updateCurrentTime self', self)
    console.log('updateCurrentTime initfetch=' + (startOffset != null))
    console.log('updateCurrentTime sessionId', fetchSessionInfo.sessionId, self.fetchSession.sessionId)
    if (fetchSessionInfo.sessionId !== self.fetchSession.sessionId) {
        //new fetch session was initiated so we don't need mediaData anymore
        console.error('Fetch sessions do not match', fetchSessionInfo.sessionId, self.fetchSession.sessionId)
        return false;
    }

    let calledBySetCurrentTime = false
    if (startOffset != null) {
        calledBySetCurrentTime = true;
    }

    if (calledBySetCurrentTime && fetchSessionInfo.state == 'initFetch') {
        // if this is first fetch in this fetch session, reset firstBufferedFragment and latestBufferedFragment
        self.firstBufferedFragment = null;
        self.latestBufferedFragment = null;
    }

    if (!calledBySetCurrentTime && fetchSessionInfo.state == 'initFetch') {
        console.error('initfetch in progress', fetchSessionInfo.sessionId)
        return false;
    }

    //if we had enogh data, stop scanning new segments
    let bufferedTimeLeft = 0;
    if (self.latestBufferedFragment) {
        let totalBufferedTime = self.latestBufferedFragment.endTime - self.firstBufferedFragment.startTime;
        console.log('updateCurrentTime totalBufferedTime', totalBufferedTime)
        bufferedTimeLeft = self.latestBufferedFragment.endTime - currentTime;
    }

    let offsetStartScanFrom = self.latestBufferedFragment ? self.latestBufferedFragment.endOffset : self.initSegmentEnd;
    let offsetEndScanAt = self.latestBufferedFragment ? self.latestBufferedFragment.endOffset + self.CHUNK_SIZE : self.initSegmentEnd + self.CHUNK_SIZE;
    if (offsetEndScanAt > self.file.size) offsetEndScanAt = self.file.size;
    if (offsetStartScanFrom == offsetEndScanAt) {
        console.log('updateCurrentTime return 000', calledBySetCurrentTime)
        return true;
    }
    if (startOffset) {
        offsetStartScanFrom = startOffset;
        offsetEndScanAt = offsetStartScanFrom + self.CHUNK_SIZE;
    }
    //if(self.latestBufferedFragment.)
    console.log('updateCurrentTime left', bufferedTimeLeft)
    let needToBuffer = bufferedTimeLeft < 10;
    if (!needToBuffer && fetchSessionInfo.state != 'initFetch') {
        console.log('updateCurrentTime return', !needToBuffer)
        //if(needToBuffer) self.needToBuffer = true;
        return false;
    }

    const mediaData = await self.scanSegments(currentTime, self.CHUNK_SIZE, { fetchSessionInfo: fetchSessionInfo, regularFetch: true });
    console.log('updateCurrentTime mediaData', mediaData.moofMdatPairs)

    if (fetchSessionInfo.sessionId !== self.fetchSession.sessionId) {
        //new fetch session was initiated so we don't need mediaData anymore
        console.error('Fetch sessions do not match', fetchSessionInfo.sessionId, self.fetchSession.sessionId, calledBySetCurrentTime)

        return false;
    }

    if (startOffset == null && fetchSessionInfo.state == 'initFetch') {
        console.error('initfetch in progress', fetchSessionInfo.sessionId, calledBySetCurrentTime)
        return false;
    }
    console.log('updateCurrentTime mediaData 2', calledBySetCurrentTime)

    if (mediaData.moofMdatPairs.length === 0) {
        if (startOffset == null && fetchSessionInfo.state == 'initFetch') {
            console.error('initfetch never changed', calledBySetCurrentTime)
        }
        return true;
    }

    console.log('updateCurrentTime mediaData 3', calledBySetCurrentTime)
    if (!self.firstBufferedFragment) {
        const firstSegment = mediaData.moofMdatPairs[0];
        self.firstBufferedFragment = {
            startTime: firstSegment.startTime,
            endTime: firstSegment.endTime,
            startOffset: firstSegment.startOffset
        };
    }
    let lastPair = mediaData.moofMdatPairs[mediaData.moofMdatPairs.length - 1];
    self.latestBufferedFragment = {
        startTime: lastPair.startTime,
        endTime: lastPair.endTime,
        endOffset: lastPair.endOffset,
        keyframeIndex: lastPair.endOffset
    };

    lastPair.lastPair = true;

    console.log('updateCurrentTime mediaData 4', calledBySetCurrentTime)
    if (self.onFragment) {
        for (let i in mediaData.moofMdatPairs) {
            if (!self.segmentToTimeMap.has(mediaData.moofMdatPairs[i].startTime)) {
                self.segmentToTimeMap.set(mediaData.moofMdatPairs[i].startTime, {
                    startOffset: mediaData.moofMdatPairs[i].startOffset,
                    endOffset: mediaData.moofMdatPairs[i].endOffset,
                    startTime: mediaData.moofMdatPairs[i].startTime,
                    endTime: mediaData.moofMdatPairs[i].endTime
                })
                // if this function was called by setCurrentTime, mark these fragments to notice the player that he received start fragments of the data after setCurrentTime was called
                if (fetchSessionInfo.state == 'initFetch') {
                    mediaData.moofMdatPairs[i].setTimeFragment = true;
                }
                self.onFragment(mediaData.moofMdatPairs[i]);
            } else {
                console.log('segmentToTimeMap has', self.segmentToTimeMap)
            }
        }
        fetchSessionInfo.state = 'regularFetch';
    }

    /* if(self.needToBuffer) {
        self.updateCurrentTime();
    } */
    console.log('updateCurrentTime END', self.latestBufferedFragment.endOffset)

    return true;
}

RegularMP4Parser.prototype.setCurrentTime = async function (time, fetchSessionInfo) {
    console.log('setCurrentTime START', time)
    const self = this;
    if (fetchSessionInfo.sessionId !== self.fetchSession.sessionId) {
        //new fetch session was initiated so we don't need mediaData anymore
        return false;
    }
    self.segmentToTimeMap.clear();
    const keyFrameToBufferFrom = self.findSampleAtTime(time, self.keyframeSamples);
    fetchSessionInfo.startKeyframe = keyFrameToBufferFrom;
    await self.updateCurrentTime(keyFrameToBufferFrom.time, keyFrameToBufferFrom.fileOffset, { fetchSessionInfo: fetchSessionInfo, abortIsNotAllowed: true });
    return keyFrameToBufferFrom;
}

RegularMP4Parser.prototype.createFragmentAtTime = async function ({
    timeSec,
    trackId,
}) {
    const self = this;
    const samples = self.samples;
    // --------------------------------------------------
    // 1. Find start sample (nearest previous keyframe)
    // --------------------------------------------------
    const startKeyframe = self.findSampleAtTime(timeSec, self.keyframeSamples);
    console.log('startKeyframe', startKeyframe);
    const startIndex = startKeyframe.index;
    // --------------------------------------------------
    // 2. Collect samples until end time
    // --------------------------------------------------
    let endIndex = startIndex + 1;

    while (
        endIndex < samples.length &&
        samples[endIndex].isKeyframe === false
    ) {
        endIndex++;
    }
    console.log('createFragmentAtTime start end', startIndex, endIndex, samples.length);

    const fragmentSamples = samples.slice(startIndex, endIndex);
    const sequenceNumber = startIndex + 1;
    // --------------------------------------------------
    // 3. Build mdat ranges (merge contiguous)
    // --------------------------------------------------
    const mdatRanges = [];

    let current = null;

    for (const s of fragmentSamples) {
        if (
            current &&
            current.offset + current.size === s.fileOffset
        ) {
            current.size += s.size;
        } else {
            current = {
                offset: s.fileOffset,
                size: s.size
            };
            mdatRanges.push(current);
        }
    }

    // --------------------------------------------------
    // 4. Build moof
    // --------------------------------------------------
    const moof = self.buildMoof({
        samples: fragmentSamples,
        baseMediaDecodeTime: fragmentSamples[0].dts,
        trackId,
        sequenceNumber
    });


    var accumulated = new Uint8Array(self.ftypBox.byteLength + patchedMoovBox.byteLength);
    accumulated.set(moof, 0);
    for (let i in mdatRanges) {
        const { bytes } = await self.readChunk(mediaData.moofMdatPairs[i].offset, mediaData.moofMdatPairs[i].size);
        var merged = new Uint8Array(accumulated.byteLength + bytes.byteLength);
        merged.set(accumulated, accumulated.byteLength);
        merged.set(bytes, accumulated.byteLength);
        accumulated = merged;
    }


    return {
        moof,
        mdatRanges,
        moofMdatPair: accumulated
    };
}
RegularMP4Parser.prototype.createFragmentAtKeyframeIndex = async function ({
    keyframeIndex,
    trackId,
}) {
    const self = this;
    const samples = self.samples;
    // --------------------------------------------------
    // 1. Find start sample (nearest previous keyframe)
    // --------------------------------------------------
    const startKeyframe = self.samples[keyframeIndex];
    console.log('startKeyframe', startKeyframe);
    const startIndex = startKeyframe.index;
    // --------------------------------------------------
    // 2. Collect samples until end time
    // --------------------------------------------------
    let endIndex = startIndex + 1;

    while (
        endIndex < samples.length &&
        samples[endIndex].isKeyframe === false
    ) {
        endIndex++;
    }
    console.log('createFragmentAtTime start end', startIndex, endIndex, samples.length);

    const fragmentVideoSamples = samples.slice(startIndex, endIndex);
    const sequenceNumber = startIndex + 1;

    const startAudioSample = self.findSampleAtTime(startKeyframe.time, self.audioSamples);
    const endAudioSample = self.findSampleAtTime(samples[endIndex].time, self.audioSamples);
    const fragmentAudioSamples = self.audioSamples.slice(startAudioSample.index, endAudioSample.index);

    const fragmentSamples = fragmentVideoSamples.concat(fragmentAudioSamples);

    fragmentSamples.sort((a, b) => a.commonTime - b.commonTime);

    console.log('createFragmentAtTime sorted', fragmentSamples);


    // --------------------------------------------------
    // 3. Build mdat ranges (merge contiguous)
    // --------------------------------------------------
    const mdatRanges = [];

    let current = null;

    for (const s of fragmentSamples) {
        if (
            current &&
            current.offset + current.size === s.fileOffset
        ) {
            current.size += s.size;
        } else {
            current = {
                offset: s.fileOffset,
                size: s.size
            };
            mdatRanges.push(current);
        }
    }

    // --------------------------------------------------
    // 4. Build moof
    // --------------------------------------------------
    const moof = self.buildMoof({
        samples: fragmentSamples,
        videoSamples: fragmentVideoSamples,
        audioSamples: fragmentAudioSamples,
        sequenceNumber
    });

    let totalMdatSize = 0;
    for (let r in mdatRanges) {
        totalMdatSize += mdatRanges[r].size
    }

    console.log('createFragmentAtTime start mdatRanges', mdatRanges);

    var mediaBytes = new Uint8Array(totalMdatSize);
    for (let i in mdatRanges) {
        const { bytes } = await self.readChunk(mdatRanges[i].offset, mdatRanges[i].size);
        var merged = new Uint8Array(mediaBytes.byteLength + bytes.byteLength);
        merged.set(mediaBytes, 0);
        merged.set(bytes, mediaBytes.byteLength);
        mediaBytes = merged;
    }

    const mdat = self.createBox("mdat", [
        mediaBytes
    ]);

    var moofMdatPair = new Uint8Array(moof.byteLength + mdat.byteLength);
    moofMdatPair.set(moof, 0);
    moofMdatPair.set(mdat, moof.byteLength);

    let viewww = new DataView(moofMdatPair.buffer);
    console.log('moofMdatPair parsed', self.parseBoxes(viewww));

    return {
        moof,
        mdatRanges,
        moofMdatPair: moofMdatPair
    };
}

RegularMP4Parser.prototype.buildMoof = function ({
    samples,
    videoSamples,
    audioSamples,
    sequenceNumber
}) {

    console.log('buildMoof start end', samples, videoSamples, audioSamples, sequenceNumber);
    const self = this;

    // --------------------------------------------------
    // mfhd
    // --------------------------------------------------
    const mfhd = self.createMfhdBox(sequenceNumber);

    const baseVideoMediaDecodeTime = videoSamples[0].dts;
    const baseAudioMediaDecodeTime = audioSamples[0].dts;
  
    const videoTrafBox = self.createTrafBox(videoSamples, self.trackIdsInfo.videoTrackId, baseVideoMediaDecodeTime);
    const audioTrafBox = self.createTrafBox(audioSamples, self.trackIdsInfo.audioTrackId, baseAudioMediaDecodeTime);

    // --------------------------------------------------
    // moof
    // --------------------------------------------------
    const moof = self.createBox("moof", [
        mfhd,
        videoTrafBox,
        audioTrafBox
    ]);

    let currentOffset = moof.byteLength + 8;
    let videoDataOffset;
    let audioDataOffset;
    for(let s in samples) {
        if(videoDataOffset == null && samples[s].trackId === self.trackIdsInfo.videoTrackId) {
            videoDataOffset = currentOffset;
        }
        if(audioDataOffset == null && samples[s].trackId === self.trackIdsInfo.audioTrackId) {
            audioDataOffset = currentOffset;
        }

        if(videoDataOffset != null && audioDataOffset != null) {
            console.log('buildMoof break')

            break;
        }
        currentOffset += samples[s].size;
    }

    console.log('buildMoof dataOffset', videoDataOffset, audioDataOffset)
    console.log('buildMoof parsed moof', self.parseBoxes(moof))
    // --------------------------------------------------
    // Patch data_offset
    // --------------------------------------------------
    self.patchTrunDataOffset(moof, self.trackIdsInfo.videoTrackId, videoDataOffset);
    self.patchTrunDataOffset(moof, self.trackIdsInfo.audioTrackId, audioDataOffset);
    

    return moof;
};

RegularMP4Parser.prototype.createTrafBox = function (samples, trackId, baseMediaDecodeTime) {
    const self = this;
    // --------------------------------------------------
    // tfhd (default-base-is-moof)
    // --------------------------------------------------
    const tfhd = self.createBox("tfhd", [
        self.fullBoxHeader(0, 0x020000),
        uint32(trackId)
    ]);

    // --------------------------------------------------
    // tfdt (version 1 = 64-bit)
    // --------------------------------------------------
    const tfdt = self.createBox("tfdt", [
        self.fullBoxHeader(1, 0),
        uint64(baseMediaDecodeTime)
    ]);

    // --------------------------------------------------
    // trun
    // --------------------------------------------------
    const trunEntries = [];

    for (const s of samples) {
        trunEntries.push(uint32(s.duration));
        trunEntries.push(uint32(s.size));

        const flags = s.isKeyframe
            ? 0x02000000
            : 0x01010000;

        trunEntries.push(uint32(flags));
    }

    const TRUN_FLAGS =
        0x000001 | // data offset
        0x000100 | // duration
        0x000200 | // size
        0x000400;  // flags

    const trun = self.createBox("trun", [
        self.fullBoxHeader(0, TRUN_FLAGS),
        uint32(samples.length),
        uint32(0), // patched later
        ...trunEntries
    ]);

    // --------------------------------------------------
    // traf
    // --------------------------------------------------
    const traf = self.createBox("traf", [
        tfhd,
        tfdt,
        trun
    ]);

    function uint32(v) {
        const arr = new Uint8Array(4);
        new DataView(arr.buffer).setUint32(0, v);
        return arr;
    }

    function uint64(v) {
        const arr = new Uint8Array(8);
        const view = new DataView(arr.buffer);
        view.setUint32(0, Math.floor(v / 2 ** 32));
        view.setUint32(4, v >>> 0);
        return arr;
    }

    return traf;
}

/**
 * Creates an mfhd (Movie Fragment Header) box.
 * @param {number} sequenceNumber - The sequence number of the fragment.
 * @returns {Uint8Array} - The complete mfhd box.
 */
RegularMP4Parser.prototype.createMfhdBox = function (sequenceNumber) {
    const size = 16; // 4 (size) + 4 (type) + 4 (ver/flags) + 4 (seq)
    const buffer = new Uint8Array(size);
    const view = new DataView(buffer.buffer);

    // Write Box Size
    view.setUint32(0, size);

    // Write Box Type: 'mfhd'
    view.setUint8(4, 0x6D); // m
    view.setUint8(5, 0x66); // f
    view.setUint8(6, 0x68); // h
    view.setUint8(7, 0x64); // d

    // Write Version (0) and Flags (0)
    view.setUint32(8, 0);

    // Write Sequence Number
    view.setUint32(12, sequenceNumber);

    return buffer;
}

RegularMP4Parser.prototype.createBox = function (type, payloadParts) {
    console.log('createBox START', type, payloadParts);
    let size = 8;

    for (const p of payloadParts) size += p.byteLength;

    const result = new Uint8Array(size);
    const view = new DataView(result.buffer);

    view.setUint32(0, size);

    result.set([
        type.charCodeAt(0),
        type.charCodeAt(1),
        type.charCodeAt(2),
        type.charCodeAt(3)
    ], 4);

    let offset = 8;

    for (const p of payloadParts) {
        result.set(p, offset);
        offset += p.byteLength;
    }

    return result;
}

RegularMP4Parser.prototype.fullBoxHeader = function (version, flags) {
    const arr = new Uint8Array(4);
    arr[0] = version;
    arr[1] = (flags >> 16) & 0xFF;
    arr[2] = (flags >> 8) & 0xFF;
    arr[3] = flags & 0xFF;
    return arr;
}

/**
 * Patches trun.data_offset for a specific track.
 *
 * @param {Uint8Array} moof
 * Complete moof box bytes.
 *
 * @param {number} trackId
 * Track ID whose trun should be patched.
 *
 * @param {number} value
 * New trun.data_offset value.
 */
RegularMP4Parser.prototype.patchTrunDataOffset = function (
    moof,
    trackId,
    value
) {

    const view = new DataView(
        moof.buffer,
        moof.byteOffset,
        moof.byteLength
    );

    // --------------------------------------------------
    // Verify root box = moof
    // --------------------------------------------------

    const rootType =
        String.fromCharCode(
            moof[4],
            moof[5],
            moof[6],
            moof[7]
        );

    if (rootType !== "moof") {
        throw new Error("Expected moof box");
    }
    
    const moofSize = view.getUint32(0);

    // --------------------------------------------------
    // Scan moof children
    // --------------------------------------------------

    let pos = 8;

    while (pos < moofSize - 8) {

        const boxSize = view.getUint32(pos);

        const type =
            String.fromCharCode(
                moof[pos + 4],
                moof[pos + 5],
                moof[pos + 6],
                moof[pos + 7]
            );
console.log('patchTrunDataOffset type', type)
        // --------------------------------------------------
        // traf
        // --------------------------------------------------

        if (type === "traf") {

            const trafStart = pos;
            const trafEnd = trafStart + boxSize;

            let trafPos = trafStart + 8;

            let currentTrackId = null;
            let trunPos = null;

            // ----------------------------------------------
            // Scan traf children
            // ----------------------------------------------

            while (trafPos < trafEnd - 8) {

                const childSize =
                    view.getUint32(trafPos);

                const childType =
                    String.fromCharCode(
                        moof[trafPos + 4],
                        moof[trafPos + 5],
                        moof[trafPos + 6],
                        moof[trafPos + 7]
                    );

console.log('patchTrunDataOffset childType', childType)
                // ------------------------------------------
                // tfhd
                // ------------------------------------------

                if (childType === "tfhd") {

                    currentTrackId = view.getUint32(trafPos + 12);
                }
console.log('patchTrunDataOffset currentTrackId', currentTrackId)

                // ------------------------------------------
                // trun
                // ------------------------------------------

                if (childType === "trun") {

                    trunPos = trafPos;
                }

                trafPos += childSize;
            }

            // ----------------------------------------------
            // Patch matching track
            // ----------------------------------------------

            if (
                currentTrackId === trackId &&
                trunPos !== null
            ) {

                // trun:
                // size(4)
                // type(4)
                // version+flags(4)
                // sampleCount(4)
                // dataOffset(4)

                const dataOffsetPos = trunPos + 16;

                view.setUint32(
                    dataOffsetPos,
                    value
                );

                return;
            }
        }

        pos += boxSize;
    }

    throw new Error(
        `trun for trackId=${trackId} not found`
    );
};

RegularMP4Parser.prototype.createFragmentedMoovBox = function () {
    // 1. Build your trex boxes
    const trexes = [];
    for(let i in this.trackIdsInfo.array) {
        const track = this.trackIdsInfo.array[i];
        const trex = this.createTrexBox({ trackId: track.trackId });
        trexes.push(trex);
    }

    // 2. Wrap them into an mvex container
    const mvexBox = this.createMvexBox([...trexes]);
    console.log('createFragmentedMoovBox mvex', trexes)
    let moovCopy = new Uint8Array(this.originalMoovBox.bytes);
    // 3. Patch your existing moov binary array
    const readyToStreamMoov = this.patchMoovWithMvex(moovCopy, mvexBox);

    return readyToStreamMoov;
}

/**
 * Creates a trex (Track Extends) box.
 * @param {Object} config - Configuration options for the track defaults.
 * @param {number} config.trackId - The ID of the track (e.g., 1 for video, 2 for audio).
 * @param {number} [config.defaultSampleDescriptionIndex=1] - Index of the sample description.
 * @param {number} [config.defaultSampleDuration=0] - Default duration of samples.
 * @param {number} [config.defaultSampleSize=0] - Default size of samples (0 if variable, like video).
 * @param {number} [config.defaultSampleFlags=0] - Default flags for samples.
 * @returns {Uint8Array} The complete trex box.
 */
RegularMP4Parser.prototype.createTrexBox = function (config) {
    const size = 32;
    const buffer = new Uint8Array(size);
    const view = new DataView(buffer.buffer);

    // [Offset 0] Size: 32 bytes
    view.setUint32(0, size);

    // [Offset 4] Type: 'trex'
    view.setUint32(4, 0x74726578);

    // [Offset 8] Version (0) & Flags (0)
    view.setUint32(8, 0);

    // [Offset 12] Track ID
    view.setUint32(12, config.trackId);

    // [Offset 16] Default Sample Description Index
    view.setUint32(16, config.defaultSampleDescriptionIndex ?? 1);

    // [Offset 20] Default Sample Duration
    view.setUint32(20, config.defaultSampleDuration ?? 0);

    // [Offset 24] Default Sample Size
    view.setUint32(24, config.defaultSampleSize ?? 0);

    // [Offset 28] Default Sample Flags
    view.setUint32(28, config.defaultSampleFlags ?? 0);

    return buffer;
}

/**
 * Patches an existing moov box by appending an mvex box and updating the size.
 * @param {Uint8Array} originalMoov - The original moov box binary data.
 * @param {Uint8Array} mvexBox - The pre-built mvex box (containing trex boxes).
 * @returns {Uint8Array} The newly expanded and patched moov box.
 */
RegularMP4Parser.prototype.patchMoovWithMvex = function (originalMoov, mvexBox) {
    const originalView = new DataView(originalMoov.buffer, originalMoov.byteOffset, originalMoov.byteLength);
    
    // Verify we are actually looking at a moov box
    const boxType = originalView.getUint32(4);
    if (boxType !== 0x6D6F6F76) { // 'moov'
        throw new Error("Provided buffer is not a valid 'moov' box.");
    }

    // Calculate new total size
    const originalSize = originalView.getUint32(0);
    const newSize = originalSize + mvexBox.byteLength;

    // Allocate the new buffer
    const patchedMoov = new Uint8Array(newSize);

    // 1. Copy the original moov contents completely
    patchedMoov.set(originalMoov, 0);

    // 2. Append the mvex box to the end
    patchedMoov.set(mvexBox, originalSize);

    // 3. Update the 4-byte Size header of the moov box (at offset 0)
    const patchedView = new DataView(patchedMoov.buffer, patchedMoov.byteOffset, patchedMoov.byteLength);
    patchedView.setUint32(0, newSize);

    const patchedSize = patchedView.getUint32(0);

    console.log('patchMoovWithMvex size', originalSize, patchedSize);
    return patchedMoov;
}

/**
 * Helper function to wrap trex boxes inside a container mvex box.
 * @param {Uint8Array[]} trexBoxes - Array of pre-built trex boxes.
 * @returns {Uint8Array} Complete mvex box.
 */
RegularMP4Parser.prototype.createMvexBox = function (trexBoxes) {
    // Total size = 8 bytes (Size + Type) + combined size of all child trex boxes
    const childrenSize = trexBoxes.reduce((sum, box) => sum + box.byteLength, 0);
    const totalSize = 8 + childrenSize;

    const mvex = new Uint8Array(totalSize);
    const view = new DataView(mvex.buffer);

    // Write Header
    view.setUint32(0, totalSize);
    view.setUint32(4, 0x6D766578); // 'mvex'

    // Write Children
    let offset = 8;
    for (const trex of trexBoxes) {
        mvex.set(trex, offset);
        offset += trex.byteLength;
    }

    return mvex;
}


// Example usage for an audio track (where every sample has fixed duration/flags):
/* const audioTrex = createTrexBox({
    trackId: 2,
    defaultSampleDuration: 1024, // common for AAC
    defaultSampleFlags: 0x02000000 // typically marks samples as sync/keyframes
}); */

RegularMP4Parser.prototype.createClip = async function (startTime, endTime) {
    console.log('createClip START', startTime, endTime)
    const self = this;
    const startKeyframe = self.findSampleAtTime(startTime, self.keyframeSamples);
    const endTimeKeyframe = self.findSampleAtTime(endTime, self.keyframeSamples);

    const mediaData = await self.scanSegments(startKeyframe.moofOffset, endTimeKeyframe.moofOffset, { regularFetch: false });
    console.log('createClip mediaData', mediaData)
    //self.patchTfdtBoxes(mediaData.moofMdatPairs, startKeyframe.time);
    self.patchTfdtBoxes(mediaData.moofSegments, startKeyframe.time, endTimeKeyframe.time);

    const clipDuration = endTimeKeyframe.time - startKeyframe.time;
    console.log('createClip clipDuration', clipDuration)

    const patchedMoovBox = self.patchMoovDurations(
        self.moovBox,
        clipDuration
    );

    var accumulated = new Uint8Array(self.ftypBox.byteLength + patchedMoovBox.byteLength);
    accumulated.set(self.ftypBox, 0);
    accumulated.set(patchedMoovBox, self.ftypBox.byteLength);
    for (let i in mediaData.moofMdatPairs) {
        let chunk = mediaData.moofMdatPairs[i].data;
        var merged = new Uint8Array(accumulated.byteLength + chunk.byteLength);
        merged.set(accumulated, 0);
        merged.set(chunk, accumulated.byteLength);
        accumulated = merged;
    }

    return new Blob(
        [accumulated],
        { type: self.mimeType }
    );
}

RegularMP4Parser.prototype.write64 = function (view, off, value) {
    const hi = Math.floor(value / 0x100000000);
    const lo = value >>> 0;

    view.setUint32(off, hi);
    view.setUint32(off + 4, lo);
}

RegularMP4Parser.prototype.read64 = function (view, off) {
    const hi = view.getUint32(off);
    const lo = view.getUint32(off + 4);
    return hi * 0x100000000 + lo;
}

RegularMP4Parser.prototype.patchTfdtBoxes = function (moofSegments, clipStartTimeSec, clipEndTimeSec) {
    const self = this;

    const state = {
        nextSequenceNumber: 1
    };

    for (let i = 0; i < moofSegments.length; i++) {
        const moofBoxInfo = moofSegments[i];
        const trafs = moofBoxInfo.parsed.childBoxes.traf;
        const mfhd = moofBoxInfo.parsed.childBoxes.mfhd;
        console.log('patch tfdt START', moofBoxInfo)

        if (trafs.length == 3) {
            console.log('patch tfdt subtitle', moofBoxInfo)

        }
        const view = new DataView(
            moofBoxInfo.moofMdatPair.buffer,
            moofBoxInfo.moofMdatPair.byteOffset,
            moofBoxInfo.moofMdatPair.byteLength
        );

        let subtittleTraf = null;
        for (let t in trafs) {

            const trafBox = trafs[t];
            const trackId = trafBox._trackId
            console.log('patch tfdt for traf', trafBox)
            if (!trafBox) continue; //some moofs may not contain subtitle tracks
            const tfdtBox = trafBox.tfdt;
            const version = tfdtBox.version;
            const oldTime = tfdtBox.baseMediaDecodeTime;
            const startOffset = tfdtBox._dataStartOffset;

            if (trackId === self.trackIdsInfo.textTrackId) {
                subtittleTraf = trafBox;
            }

            const trackTimescale = self.timescales[trackId];
            const shift = Math.floor(clipStartTimeSec * trackTimescale);

            console.log('patch tfdt for traf trackId', trackId)
            if (version === 1) {
                const newTime = Math.max(0, oldTime - shift);
                console.log('patch tfdt 1 oldTime', trackId, oldTime, newTime)
                self.write64(view, startOffset, newTime);
            } else {
                const newTime = Math.max(0, oldTime - shift);
                console.log('patch tfdt 2 oldTime', oldTime, newTime)
                view.setUint32(startOffset, newTime);
            }
            const check =
                view.getUint32(
                    tfdtBox._boxStartOffset + tfdtBox._headerSize + 4
                );
            console.log('patch tfdt 2 check', check)
        }

        if (subtittleTraf) {
            const samples = moofBoxInfo.parsed.samples[self.trackIdsInfo.textTrackId].samples;
            const subtittleTrun = subtittleTraf.trun;
            const subtitleTimescale = self.timescales[self.trackIdsInfo.textTrackId];
            const clipEndRaw = Math.floor(clipEndTimeSec * subtitleTimescale);
            const lastSample = samples[samples.length - 1];
            console.log('patch subtitle 2 samples', samples, lastSample)

            const newDuration = Math.max(1, clipEndRaw - lastSample.rawTime);
            console.log(
                "patch subtitle duration",
                lastSample.duration,
                "->",
                newDuration
            );

            let sampleOffsetInMoof = subtittleTrun._boxStartOffset + lastSample._startOffsetInTrun;
            const check = view.getUint32(sampleOffsetInMoof);
            console.log('patch subtitle 2 check 1', check, sampleOffsetInMoof, subtittleTrun._boxStartOffset, subtittleTrun._boxStartOffset, lastSample._startOffsetInTrun)

            view.setUint32(sampleOffsetInMoof, newDuration);
            const check2 = view.getUint32(sampleOffsetInMoof);

            console.log('patch subtitle 2 check 2', check2)
        }



        const sequenceNumber = view.getUint32(mfhd._boxStartOffset + 12);

        console.log('patch tfdt mfhd', mfhd._dataStartOffset, state.nextSequenceNumber, sequenceNumber)

        view.setUint32(
            mfhd._boxStartOffset + 12,
            state.nextSequenceNumber
        );

        const newSequenceNumber = view.getUint32(mfhd._boxStartOffset + 12);
        console.log('patch tfdt mfhd 2', mfhd._dataStartOffset, state.nextSequenceNumber, newSequenceNumber)


        state.nextSequenceNumber++
    }
}

RegularMP4Parser.prototype.findBoxOffset = function (targetType, start, end, view, bytes) {
    console.log('findBoxOffset START', targetType, start, end, view);

    let offset = start;
    while (offset + 8 <= end) {
        const size = view.getUint32(offset);
        const type = view.getUint32(offset + 4);
        //const type2 = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
        let headerSize = 8;

        if (size === 1) {
            size = self.read64(view, offset + 8);
            headerSize = 16;
        }

        if (size < headerSize || offset + size > end) {
            break;
        }
        console.log('findBoxOffset tkhd type', type);

        if (size < 8) break;
        if (type === targetType) return { offset: offset, size, headerSize };
        offset += size;
    }
    return null;
}

RegularMP4Parser.prototype.findBoxOffset2 = function (targetType, start, end, view, bytes) {
    console.log('findBoxOffset START', targetType, start, end, view, bytes);

    let offset = start;
    while (offset + 8 <= end) {
        const size = view.getUint32(offset);
        const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
        let headerSize = 8;

        if (size === 1) {
            size = self.read64(view, offset + 8);
            headerSize = 16;
        }

        if (size < headerSize || offset + size > end) {
            break;
        }
        console.log('findBoxOffset tkhd type', type);

        if (size < 8) break;
        if (type === targetType) return { offset: offset, size, headerSize };
        offset += size;
    }
    return null;
}

RegularMP4Parser.prototype.patchMoovDurations = function (moovBoxBytes, clipDurationSec) {
    const self = this;
    const moovBytes = new Uint8Array(moovBoxBytes);
    const view = new DataView(
        moovBytes.buffer,
        moovBytes.byteOffset,
        moovBytes.byteLength
    );

    let mvhd = self.parsedMoovBox.mvhd;
    console.log('patchMoovDurations mvhd', mvhd);
    if (mvhd) {
        const version = view.getUint8(mvhd._boxStartOffset + mvhd._headerSize);

        console.log('patchMoovDurations mvhd version', version)
        if (version === 1) {
            const timescaleOffset = mvhd._boxStartOffset + mvhd._headerSize + 20;
            const durationOffset = mvhd._boxStartOffset + mvhd._headerSize + 24;

            const timescale = view.getUint32(timescaleOffset);
            const newDur = Math.floor(clipDurationSec * timescale);

            write64(view, durationOffset, newDur);

        } else {
            const timescaleOffset = mvhd._boxStartOffset + mvhd._headerSize + 12;
            const durationOffset = mvhd._boxStartOffset + mvhd._headerSize + 16;

            const timescale = view.getUint32(timescaleOffset);
            const newDur = Math.floor(clipDurationSec * timescale);

            view.setUint32(durationOffset, newDur);
        }
    }

    let traks = self.parsedMoovBox.trak;
    for (let i in traks) {
        const trak = traks[i];
        const tkhd = self.findBoxOffset('tkhd', trak._boxStartOffset + 8, trak._boxEndOffset, view, moovBytes);
        const mdhd = trak.mdia.mdhd;
        console.log('patchMoovDurations tkhd offset', tkhd);



        let trackId = null;
        let timescale = null;
        if (tkhd) {
            // offset +20 = size(4)+type(4)+version(1)+flags(3)+creation(4)+modification(4)
            trackId = view.getUint32(tkhd.offset + 20);
            console.log('patchMoovDurations trackId', trackId);

            timescale = this.timescales[trackId];

            const version = view.getUint8(tkhd.offset + tkhd.headerSize);
            console.log('patchMoovDurations version', version);

            if (version === 1) {
                const durationOffset = tkhd.offset + tkhd.headerSize + 28;
                const newDur = Math.floor(clipDurationSec * timescale);

                write64(view, durationOffset, newDur);

            } else {
                const durationOffset = tkhd.offset + tkhd.headerSize + 20;
                const newDur = Math.floor(clipDurationSec * timescale);

                view.setUint32(durationOffset, newDur);
            }
        }

        if (mdhd) {
            console.log('patchMoovDurations mdhd')

            const version = view.getUint8(mdhd._boxStartOffset + mdhd._headerSize);

            if (version === 1) {

                const timescaleOffset = mdhd._boxStartOffset + mdhd._headerSize + 20;
                const durationOffset = mdhd._boxStartOffset + mdhd._headerSize + 24;

                const timescale = view.getUint32(timescaleOffset);
                console.log('patchMoovDurations mdhd timescale', timescale)

                const newDur = Math.floor(clipDurationSec * timescale);

                write64(view, durationOffset, newDur);

            } else {

                const timescaleOffset = mdhd._boxStartOffset + mdhd._headerSize + 12;
                const durationOffset = mdhd._boxStartOffset + mdhd._headerSize + 16;

                const timescale = view.getUint32(timescaleOffset);
                console.log('patchMoovDurations mdhd timescale', timescale)

                const newDur = Math.floor(clipDurationSec * timescale);

                view.setUint32(durationOffset, newDur);
            }
        }



    }
    return moovBytes;
}

RegularMP4Parser.prototype.init = async function () {
    const self = this;
    await self.loadInit();

    return;
    //await self.loadMfra();

    //let parsedMoov = self.parseBoxes(self.moovBox);
    console.log('lastMoofOffset parsedMoov', self.parsedMoovBox)

    let moofEntires = self?.mfraBoxInfo?.tfras[self.trackIdsInfo.videoTrackId]?.entries;
    console.log('lastMoofOffset tfras', moofEntires)

    let lastMoofOffset = moofEntires[moofEntires.length - 1].moofOffset;
    console.log('lastMoofOffset 0', lastMoofOffset)
    const segmentsData = await self.scanSegments(lastMoofOffset);
    const lastMoofs = segmentsData.moofSegments;
    console.log('lastMoofOffset 1', lastMoofs)
    let parsedSamples = lastMoofs[lastMoofs.length - 1].parsed.samples[self.trackIdsInfo.videoTrackId].samples
    let lastSample = parsedSamples[parsedSamples.length - 1];

    self.totalDuration = lastSample.time + lastSample.duration;
    console.log('lastMoofOffset duration', self.totalDuration)

    //const parsedMoof = await self._parseFragment(lastMoofs[lastMoofs.length - 1]);

    return true;
}
// Read the file chunk by chunk until moov box is fully loaded.
// Resolves when mimeType and initSegment() are ready.


RegularMP4Parser.prototype.loadInit = async function () {
    const self = this;
    let ftypOffset = await self.findBoxOffsetInFile(self.BOX.ftyp);
    self.ftypBox = await self.readChunk(ftypOffset.offset, ftypOffset.size);
    console.log('loadInit ftypOffset', ftypOffset, self.ftypBox, self.parseBoxes(self.ftypBox.view))

    let moovOffset = await self.findBoxOffsetInFile(self.BOX.moov);
    self.originalMoovBox = await self.readChunk(moovOffset.offset, moovOffset.size);
    console.log('loadInit moovOffset', moovOffset, self.originalMoovBox, self.parseBoxes(self.originalMoovBox.view))

    const init = new Uint8Array(self.ftypBox.bytes.length + self.originalMoovBox.bytes.length);
    init.set(self.ftypBox.bytes, 0);
    init.set(self.originalMoovBox.bytes, self.ftypBox.bytes.length);
    self.originalInitSegment = init;
    //self.initSegmentEnd = init.length;


    //let buffer = await self.file.arrayBuffer();
    //console.log('parsedMoov 1', buffer)
    //self.moovBox = await self.findBox(new Uint8Array(buffer), 'moov');
    console.log('parsedMoov 2', self.originalMoovBox)
    let parsed = self.parseBoxes(self.originalMoovBox.view);
    self.parsedOriginalMoovBox = parsed.moov;
    console.log('parsedMoov 3', self.parsedOriginalMoovBox)
    self.timescales = self.getTimescales(self.originalMoovBox.bytes);
    self.trackIdsInfo = self.getTrackInfo(self.originalMoovBox.bytes);
    self._extractMime(self.originalMoovBox.bytes);
    
    let traks = {};
    for (let i in self.parsedOriginalMoovBox.trak) {
        const trak = self.parsedOriginalMoovBox.trak[i];
        traks[trak.tkhd.trackId] = trak;
    }
    
    self.parsedOriginalMoovBox.trak = traks;
    self.keyframesSampleNumbers = self.parsedOriginalMoovBox?.trak[self.trackIdsInfo.videoTrackId]?.mdia?.minf?.stbl?.stss?.sampleNumbers;
    self.chunkOffsets = self.parsedOriginalMoovBox?.trak[self.trackIdsInfo.videoTrackId]?.mdia?.minf?.stbl?.stco?.chunkOffsets;
    self.sampleSizes = self.parsedOriginalMoovBox?.trak[self.trackIdsInfo.videoTrackId]?.mdia?.minf?.stbl?.stsz?.entrySizes;
    self.sampleToChunk = self.parsedOriginalMoovBox?.trak[self.trackIdsInfo.videoTrackId]?.mdia?.minf?.stbl?.stsc?.entries;
    console.log('lastMoofOffset parsedMoov', self.timescales, self.trackIdsInfo)
    console.log('lastMoofOffset self.keyframesSampleNumbers', self.keyframesSampleNumbers)
    console.log('lastMoofOffset self.chunkOffsets', self.chunkOffsets)
    console.log('lastMoofOffset self.sampleSizes', self.sampleSizes)
    console.log('lastMoofOffset self.sampleToChunk', self.sampleToChunk)
    console.log('lastMoofOffset 1111', self.parsedOriginalMoovBox?.trak[self.trackIdsInfo.videoTrackId]?.mdia?.minf?.stbl)


    self.fragmentedMoovBox = self.createFragmentedMoovBox();
    console.log('loadInit self.fragmentedMoovBox', self.fragmentedMoovBox)

    const fragmentedInit = new Uint8Array(self.ftypBox.bytes.length + self.fragmentedMoovBox.length);
    fragmentedInit.set(self.ftypBox.bytes, 0);
    fragmentedInit.set(self.fragmentedMoovBox, self.ftypBox.bytes.length);
    self.initSegment = fragmentedInit;

    console.log('loadInit initSegment', self.initSegment, self.parseBoxes(self.initSegment))


    let sampleTable = self.buildSampleTable(self.parsedOriginalMoovBox?.trak[self.trackIdsInfo.videoTrackId]?.mdia?.minf?.stbl, self.trackIdsInfo.videoTrackId);
    let audioSampleTable = self.buildSampleTable(self.parsedOriginalMoovBox?.trak[self.trackIdsInfo.audioTrackId]?.mdia?.minf?.stbl, self.trackIdsInfo.audioTrackId);
    self.samples = sampleTable.samples;
    self.audioSamples = audioSampleTable.samples;
    self.keyframeSamples = sampleTable.keyframeSamples;
    
    console.log('lastMoofOffset samples', sampleTable, audioSampleTable)
    

    //let moovOffset = await self.findBoxOffsetInFile(self.BOX.moov);
    //self.moovBox = self.readChunk(moovOffset.offset, moovOffset.size);
}

RegularMP4Parser.prototype.buildSampleTable = function ({ stsz, stsc, stco, stts, ctts = null}, trackId) {
    const self = this;
    const sampleCount = stsz.sampleCount;

    const samples = new Array(sampleCount);
    const keyframeSamples = new Array();

    // --------------------------------------------------
    // 1. Expand sample sizes
    // --------------------------------------------------
    const sizes = new Uint32Array(sampleCount);

    if (stsz.sampleSize !== 0) {
        sizes.fill(stsz.sampleSize);
    } else {
        for (let i = 0; i < sampleCount; i++) {
            sizes[i] = stsz.entrySizes[i];
        }
    }

    // --------------------------------------------------
    // 2. Build sample → chunk map
    // --------------------------------------------------
    const sampleToChunk = new Uint32Array(sampleCount);

    let sampleIndex = 0;

    for (let i = 0; i < stsc.entries.length; i++) {
        const entry = stsc.entries[i];
        const next = stsc.entries[i + 1];

        const startChunk = entry.firstChunk - 1;
        const endChunk = next ? next.firstChunk - 1 : stco.chunkOffsets.length;

        for (let chunk = startChunk; chunk < endChunk; chunk++) {
            for (let j = 0; j < entry.samplesPerChunk; j++) {
                if (sampleIndex < sampleCount) {
                    sampleToChunk[sampleIndex++] = chunk;
                }
            }
        }
    }

    // --------------------------------------------------
    // 3. Compute offset inside each chunk
    // --------------------------------------------------
    const offsetInChunk = new Uint32Array(sampleCount);
    const chunkSampleStart = {}; // chunkIndex -> first sample index

    for (let i = 0; i < sampleCount; i++) {
        const chunk = sampleToChunk[i];

        if (chunkSampleStart[chunk] === undefined) {
            chunkSampleStart[chunk] = i;
            offsetInChunk[i] = 0;
        } else {
            offsetInChunk[i] =
                offsetInChunk[i - 1] + sizes[i - 1];
        }
    }

    // --------------------------------------------------
    // 4. Compute file offsets
    // --------------------------------------------------
    const fileOffsets = new Float64Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
        const chunk = sampleToChunk[i];
        fileOffsets[i] =
            stco.chunkOffsets[chunk] + offsetInChunk[i];
    }

    // --------------------------------------------------
    // 5. Expand stts → DTS + duration
    // --------------------------------------------------
    const dts = new Float64Array(sampleCount);
    const duration = new Uint32Array(sampleCount);

    let time = 0;
    let index = 0;

    for (const entry of stts.entries) {
        for (let i = 0; i < entry.sampleCount; i++) {
            dts[index] = time;
            duration[index] = entry.sampleDelta;
            time += entry.sampleDelta;
            index++;
        }
    }

    // --------------------------------------------------
    // 6. Expand ctts → PTS offsets
    // --------------------------------------------------
    let pts = new Float64Array(sampleCount);

    if (ctts) {
        let idx = 0;

        for (const entry of ctts.entries) {
            for (let i = 0; i < entry.sampleCount; i++) {
                pts[idx] = dts[idx] + entry.sampleOffset;
                idx++;
            }
        }
    } else {
        for (let i = 0; i < sampleCount; i++) {
            pts[i] = dts[i];
        }
    }

    // --------------------------------------------------
    // 7. Build final table
    // --------------------------------------------------
    for (let i = 0; i < sampleCount; i++) {
        samples[i] = {
            trackId: trackId,
            index: i,
            size: sizes[i],
            dts: dts[i],
            pts: pts[i],
            time: dts[i] / self.timescales[trackId],
            commonTime: dts[i] * 1000000 / self.timescales[trackId],
            duration: duration[i],
            chunkIndex: sampleToChunk[i],
            offsetInChunk: offsetInChunk[i],
            fileOffset: fileOffsets[i],
            isKeyframe: trackId === self.trackIdsInfo.videoTrackId ? self.keyframesSampleNumbers.has(i) : null,
        };

        if(samples[i].isKeyframe){
            keyframeSamples.push(samples[i]);
        }
    }

    return {
        samples, keyframeSamples
    };
}

RegularMP4Parser.prototype.loadInit2 = async function () {
    var view = null;
    var self = this;
    var offset = 0;
    var accumulated = new Uint8Array(0);

    //let parsed = self.parseBoxes(this.file.size, 0, this.file.size);

    //const moov = self.findBoxOffset('moov', 0, this.file.size, view, self.file);
    //console.log('readNextChunk parsed', parsed);

    /* let box = await self.findBoxWithinFile('ftyp', 0);
    console.log('readNextChunk box', box);
    return; */
    let init = await self.findBoxOffsetInFile(self.BOX.moov);
    console.log('init', init)

    function readNextChunk() {
        var start = offset;
        var end = Math.min(start + self.CHUNK_SIZE, self.file.size);
        if (start >= end) {
            return Promise.reject(new Error('reached end of file without finding moov'));
        }
        console.log('readNextChunk START', start, end);

        return self.file.slice(start, end).arrayBuffer().then(function (chunkBuf) {
            // append chunk to accumulated buffer
            var chunk = new Uint8Array(chunkBuf);
            var merged = new Uint8Array(accumulated.byteLength + chunk.byteLength);
            merged.set(accumulated, 0);
            merged.set(chunk, accumulated.byteLength);

            //const tkhd = self.findBoxOffset('moov', trak._boxStartOffset + 8, trak._boxEndOffset, view, moovBytes);

            accumulated = merged;
            offset = end;

            let buffer = accumulated.buffer;
            console.log('accumulated.byteLength', accumulated.byteLength);
            let view = new DataView(buffer);
            //let box = await self.findBoxWithinFile('ftyp', 0);
            const moovStart = self.findBoxOffset(self.BOX_MOOV, 0, end, view, merged);
            console.log('loadInit moovStart', moovStart != null);


            if (self.ftypBox == null) {
                const ftypBox = self.findBox(accumulated, 'ftyp');
                console.log('accumulated.byteLength ftypBox', buffer);

                self.ftypBox = ftypBox;
            }
            if (self.moovBox == null) {
                const moovBox = self.findBox(accumulated, 'moov');
                if (moovBox) {

                    self.moovBox = moovBox;
                    let parsed = self.parseBoxes(moovBox);
                    self.parsedMoovBox = parsed.moov;
                    console.log('moovBox', moovBox)
                    self.timescales = self.getTimescales(moovBox);
                    self.trackIdsInfo = self.getTrackInfo(moovBox);
                    console.log('timescales', self.timescales)
                    console.log('trackIdsInfo', self.trackIdsInfo)

                }
            }

            if (self.ftypBox && self.moovBox && !self.initSegment) {
                const init = new Uint8Array(self.ftypBox.length + self.moovBox.length);
                init.set(self.ftypBox, 0);
                init.set(self.moovBox, self.ftypBox.length);
                self.initSegment = init;
                self.initSegmentEnd = init.length;

                // Strip ftyp+moov from the front before passing to onDataAvailable
                //const headerSize = self.ftypBox.length + self.moovBox.length;
            }

            if (self.moovBox != null) {
                // we have everything we need — extract mime from the moov bytes we hold
                self._extractMime(self.moovBox);
                return; // done — resolve
            }

            // moov not yet fully read — fetch next chunk
            return readNextChunk();
        });
    }

    return readNextChunk();
};

//Load mfraand parse to seek instantly without scanning
RegularMP4Parser.prototype.loadMfra = function () {
    const self = this;

    return new Promise(async function (resolve, reject) {
        try {
            const fileSize = self.file.size;

            // Step 1: read last 32 bytes (safe margin)
            const tailSize = Math.min(64, fileSize);
            const tailStart = fileSize - tailSize;

            const buf = await self.file.slice(tailStart, fileSize).arrayBuffer();
            const bytes = new Uint8Array(buf);
            const view = new DataView(buf);

            // Step 2: find 'mfro' from the end
            let mfroOffset = -1;

            for (let i = bytes.length - 16; i >= 0; i--) {
                const type =
                    String.fromCharCode(
                        bytes[i + 4],
                        bytes[i + 5],
                        bytes[i + 6],
                        bytes[i + 7]
                    );

                if (type === 'mfro') {
                    mfroOffset = i;
                    break;
                }
            }

            if (mfroOffset === -1) {
                console.warn('mfro not found → no mfra');
                resolve(null);
                return;
            }

            // Step 3: read mfra size
            const mfraSize = view.getUint32(mfroOffset + 12);

            // Step 4: compute mfra position
            const mfraStart = fileSize - mfraSize;

            // Step 5: load mfra
            const mfraBuf = await self.file.slice(mfraStart, fileSize).arrayBuffer();
            const mfraBytes = new Uint8Array(mfraBuf);

            console.log('mfra found at:', mfraStart, 'size:', mfraSize);

            // optional: parse it
            self.mfraBox = mfraBytes;
            self.mfraBoxInfo = self.parseMfra(mfraBytes);
            //self.mfraBoxInfo2 = self.parseBoxes(mfraBytes);
            console.log('self.mfraBoxInfo', self.mfraBoxInfo)
            //console.log('self.mfraBoxInfo2', self.mfraBoxInfo2)
            resolve(mfraBytes);

        } catch (e) {
            reject(e);
        }
    });
};

RegularMP4Parser.prototype.estimateDuration = function (tfra, timescale) {
    const last = tfra.entries[tfra.entries.length - 1];
    return last.time / timescale;
}

RegularMP4Parser.prototype.scanFragmentsAtPercentOffset = function (percent, direction) {

    var self = this;
    //if we hat enogh data, stop scanning new segments
    if (self.currentReadingOffset + self.CHUNK_SIZE <= self.endOffset) {
        return Promise.resolve(null);
    }
    var offset = self.endOffset != null ? self.endOffset : self.initSegmentEnd;
    if (self.currentReadingOffset > self.endOffset) {
        offset = self.currentReadingOffset;
    }
    var accumulated = new Uint8Array(0);
    var absoluteBase = offset; // byte offset in the file where accumulation starts
    console.log('scanSegments START', offset, absoluteBase)

    return new Promise(function (resolve, reject) {
        function readNextChunk(end) {
            let moofSegments = [];
            //let flatMoofMdatPairs = [];
            var start = offset;
            var end = end != null ? end : Math.min(start + self.CHUNK_SIZE, self.file.size);

            console.log('readNextChunk START', start, end)
            //console.trace();
            if (start >= end) return Promise.resolve(); // done

            return self.file.slice(start, end).arrayBuffer().then(async function (chunkBuf) {
                var chunk = new Uint8Array(chunkBuf);
                var merged = new Uint8Array(accumulated.byteLength + chunk.byteLength);
                merged.set(accumulated, 0);
                merged.set(chunk, accumulated.byteLength);
                accumulated = merged;
                offset = end;

                // parse boxes from accumulated, using absoluteBase to get real file offsets
                var localView = new DataView(accumulated.buffer);
                var localOffset = 0;

                while (localOffset + 8 <= accumulated.byteLength) {
                    var boxSize = localView.getUint32(localOffset);
                    var boxType = String.fromCharCode(
                        accumulated[localOffset + 4], accumulated[localOffset + 5],
                        accumulated[localOffset + 6], accumulated[localOffset + 7]
                    );
                    var headerSize = 8;

                    if (boxSize === 1) {
                        if (localOffset + 16 > accumulated.byteLength) break;
                        var hi = localView.getUint32(localOffset + 8);
                        var lo = localView.getUint32(localOffset + 12);
                        boxSize = hi * 0x100000000 + lo;
                        headerSize = 16;
                    }
                    if (boxSize === 0) boxSize = self.file.size - (absoluteBase + localOffset);
                    if (boxSize < headerSize) break;

                    if (localOffset + boxSize > accumulated.byteLength) {
                        //if box is not fully loaded yet, fix end of accumulated so it contains entire box
                        end = end + ((localOffset + boxSize) - accumulated.byteLength);
                        return await readNextChunk(end);
                        break; // box not fully loaded yet
                    }

                    var absStart = absoluteBase + localOffset;
                    var absEnd = absStart + boxSize;

                    if (boxType === 'moof') {
                        // peek at the next box
                        let moofSegment = {
                            start: absStart,
                            end: absEnd,
                            moofBoxData: accumulated.slice(localOffset, localOffset + boxSize),
                            followingMdatSegment: null
                        };
                        var nextLocalOffset = localOffset + boxSize;
                        if (nextLocalOffset + 8 <= accumulated.byteLength) {
                            var nextSize = localView.getUint32(nextLocalOffset);
                            var nextType = String.fromCharCode(
                                accumulated[nextLocalOffset + 4], accumulated[nextLocalOffset + 5],
                                accumulated[nextLocalOffset + 6], accumulated[nextLocalOffset + 7]
                            );
                            if (nextType === 'mdat') {
                                if (nextLocalOffset + nextSize > accumulated.byteLength) {
                                    //if box is not fully loaded yet, fix end of accumulated so it contains entire box
                                    var diff = ((nextLocalOffset + nextSize) - accumulated.byteLength);
                                    end = end + diff;
                                    return await readNextChunk(end);
                                    break; // box not fully loaded yet
                                }
                                var mdatAbsEnd = absoluteBase + nextLocalOffset + nextSize;
                                moofSegment.followingMdatSegment = {
                                    start: absStart,
                                    end: mdatAbsEnd,
                                    mdatBoxData: accumulated.slice(nextLocalOffset, nextLocalOffset + nextSize)
                                };
                                moofSegments.push(moofSegment);

                                const fragments = self._parseFragment(moofSegment.moofBoxData, moofSegment.start);
                                //console.log('fragments scanSegments', fragments[self.trackIdsInfo.videoTrackId].samples.length)
                                const moofMdatPair = new Uint8Array(moofSegment.moofBoxData.length + moofSegment.followingMdatSegment.mdatBoxData.length);
                                moofMdatPair.set(moofSegment.moofBoxData, 0);
                                moofMdatPair.set(moofSegment.followingMdatSegment.mdatBoxData, moofSegment.moofBoxData.length);
                                if (!self.segmentToTimeMap.has(moofMdatPair)) {
                                    self.segmentToTimeMap.set(moofMdatPair, moofSegment);
                                    self.flatMoofMdatPairs.push({
                                        data: moofMdatPair,
                                        time: fragments[self.trackIdsInfo.videoTrackId].endTime
                                    });
                                }

                                localOffset = nextLocalOffset + nextSize;
                                continue;
                            }
                        } else {
                            //if moof+mdat pair is not fully loaded yet, fix end of accumulated so it contains entire these two segments
                            end = end + ((localOffset + boxSize + 8) - accumulated.byteLength);
                            return await readNextChunk(end);
                            break; // need next chunk to see the mdat
                        }
                        //self.segments.push({ start: absStart, end: absEnd });
                    }

                    localOffset += boxSize;
                }

                // trim accumulated to only unprocessed tail
                accumulated = accumulated.slice(localOffset);
                absoluteBase += localOffset;
                self.endOffset = absoluteBase;

                console.log('readNextChunk resolve');
                resolve(moofSegments);
                //return readNextChunk();
            });
        }

        return readNextChunk();
    });

};

RegularMP4Parser.prototype.getTimescales = function (moov) {
    const timescales = {}; // { trackId: timescale }
    const view = new DataView(moov.buffer, moov.byteOffset);

    function findBoxOffset(targetType, start, end) {
        let o = start;
        while (o + 8 <= end) {
            const size = view.getUint32(o);
            const type = String.fromCharCode(moov[o + 4], moov[o + 5], moov[o + 6], moov[o + 7]);
            if (size < 8) break;
            if (type === targetType) return { offset: o, size };
            o += size;
        }
        return null;
    }

    let offset = 8;
    while (offset + 8 <= moov.length) {
        const size = view.getUint32(offset);
        const type = String.fromCharCode(moov[offset + 4], moov[offset + 5], moov[offset + 6], moov[offset + 7]);
        if (size < 8) break;

        if (type === 'trak') {
            const trakEnd = offset + size;

            const tkhd = findBoxOffset('tkhd', offset + 8, trakEnd);
            const trackId = tkhd ? view.getUint32(tkhd.offset + 20) : null;

            const mdia = findBoxOffset('mdia', offset + 8, trakEnd);
            if (mdia && trackId !== null) {
                const mdhd = findBoxOffset('mdhd', mdia.offset + 8, mdia.offset + mdia.size);
                if (mdhd) {
                    const version = moov[mdhd.offset + 8];
                    const timescaleOffset = mdhd.offset + 12 + (version === 1 ? 16 : 8);
                    timescales[trackId] = view.getUint32(timescaleOffset);
                }
            }
        }

        offset += size;
    }

    return timescales; // e.g. { 1: 90000, 2: 44100 }
}

RegularMP4Parser.prototype.getTrackInfo = function (moov) {
    const view = new DataView(moov.buffer, moov.byteOffset);
    const tracks = {
        array: []
    };

    function findBoxOffset(targetType, start, end) {
        let o = start;
        while (o + 8 <= end) {
            const size = view.getUint32(o);
            const type = String.fromCharCode(moov[o + 4], moov[o + 5], moov[o + 6], moov[o + 7]);
            if (size < 8) break;
            if (type === targetType) return { offset: o, size };
            o += size;
        }
        return null;
    }

    let offset = 8;
    while (offset + 8 <= moov.length) {
        const size = view.getUint32(offset);
        const type = String.fromCharCode(moov[offset + 4], moov[offset + 5], moov[offset + 6], moov[offset + 7]);
        if (size < 8) break;

        if (type === 'trak') {
            const trakEnd = offset + size;

            const tkhd = findBoxOffset('tkhd', offset + 8, trakEnd);
            let trackId = null;
            if (tkhd) {
                // offset +20 = size(4)+type(4)+version(1)+flags(3)+creation(4)+modification(4)
                trackId = view.getUint32(tkhd.offset + 20);
            }

            const mdia = findBoxOffset('mdia', offset + 8, trakEnd);
            let handlerType = null;
            if (mdia) {
                const hdlr = findBoxOffset('hdlr', mdia.offset + 8, mdia.offset + mdia.size);
                if (hdlr) {
                    handlerType = String.fromCharCode(
                        moov[hdlr.offset + 16],
                        moov[hdlr.offset + 17],
                        moov[hdlr.offset + 18],
                        moov[hdlr.offset + 19]
                    );
                }
            }
                    console.log('tracks.textTrackId handlerType', handlerType)

            if (trackId !== null && handlerType !== null) {
                if (handlerType === 'vide') {
                    tracks.videoTrackId = trackId;
                    tracks.array.push({ trackId: trackId, type: 'video' });
                } else if (handlerType === 'soun') {
                    tracks.audioTrackId = trackId;
                    tracks.array.push({ trackId: trackId, type: 'audio' });
                } else if (handlerType === 'text') {
                    tracks.textTrackId = trackId;
                    tracks.array.push({ trackId: trackId, type: 'text' });
                } else if (handlerType === 'tmcd') {
                    tracks.tmcdTrackId = trackId;
                    tracks.array.push({ trackId: trackId, type: 'tmcd' });
                }

                //console.log('track', trackId, '=', tracks[trackId]);
            }
        }

        offset += size;
    }

    return tracks; // { 1: 'video', 2: 'audio' }
}


RegularMP4Parser.prototype._readVariable = function (view, offset, size) {
    let val = 0;
    for (let i = 0; i < size; i++) {
        val = (val << 8) | view.getUint8(offset + i);
    }
    return val;
};

RegularMP4Parser.prototype.readType = function (buf, offset) {
    return String.fromCharCode(
        buf[offset],
        buf[offset + 1],
        buf[offset + 2],
        buf[offset + 3]
    );
}

// Scan moof+mdat segments from the region AFTER the init segment.
// Call this after loadInit() resolves.
// Reads the remainder of the file in 1MB chunks to build the segment index.
RegularMP4Parser.prototype.scanSegments = async function (startKeyframeIndex, accumulateSize, options = {}) {
    const self = this;
    const fetchSessionInfo = options.fetchSessionInfo;
    let acumulatedSize = 0;
    //self.CHUNK_SIZE
    const moofSegments = [];
    const moofMdatPairs = [];

    for (let i = startKeyframeIndex; i < self.samples.length; i++) {
        const sample = self.samples[i];
        if(!sample.isKeyframe) {
            continue;
        }
        if(acumulatedSize >= accumulateSize) {
            break;
        }
        let fragment = await self.createFragmentAtKeyframeIndex({
            keyframeIndex: i,
            trackId: self.trackIdsInfo.videoTrackId,
            sequenceNumber: 1
        });

        const pairToBuffer = {
            data: fragment.moofMdatPair,
            startOffset: sample.fileOffset,
            endOffset: sample.fileOffset + fragment.moofMdatPair.byteLength,
            startTime: sample.time,
            //endTime: endTime,
            fetchSessionId: fetchSessionInfo ? fetchSessionInfo.sessionId : null
        };

        /* if (options.regularFetch == false) {
            moofSegment.moofMdatPair = moofMdatPair;
        } */

        moofMdatPairs.push(pairToBuffer);

        acumulatedSize += fragment.moofMdatPair.byteLength;
    }    

    return {
        moofSegments: moofSegments,
        moofMdatPairs: moofMdatPairs
    }
}
RegularMP4Parser.prototype.scanSegments_old = async function (startOffset, endOffset, options = {}) {
    let self = this;

    const fetchSessionInfo = options.fetchSessionInfo;

    //let absoluteBase = self.initSegmentEnd; // byte offset in the file where accumulation starts
    let absoluteBase = startOffset; // byte offset in the file where accumulation starts
    console.log('scanSegments START', fetchSessionInfo, startOffset, endOffset)

    async function readNextChunk(start, end) {
        console.log('readNextChunk START', start, end, fetchSessionInfo)

        if (options.regularFetch === true && fetchSessionInfo.sessionId !== self.fetchSession.sessionId) {
            console.error('new fetch session started');
            return {
                moofSegments: [],
                moofMdatPairs: []
            }
        }
        let moofSegments = [];
        let moofMdatPairs = [];
        let accumulated = new Uint8Array(0);

        //console.trace();

        const chunkBuf = await self.file.slice(start, end).arrayBuffer();
        let chunk = new Uint8Array(chunkBuf);
        let merged = new Uint8Array(accumulated.byteLength + chunk.byteLength);
        merged.set(accumulated, 0);
        merged.set(chunk, accumulated.byteLength);
        accumulated = merged;
        offset = end;

        // parse boxes from accumulated, using absoluteBase to get real file offsets
        let localView = new DataView(accumulated.buffer);
        let localOffset = 0;

        while (localOffset + 8 <= accumulated.byteLength) {
            if (options.regularFetch === true && fetchSessionInfo.sessionId !== self.fetchSession.sessionId) {
                console.error('new fetch session started');
                return {
                    moofSegments: [],
                    moofMdatPairs: []
                }
            }
            console.log('scanSegments while start', localOffset, accumulated.byteLength)

            let boxSize = localView.getUint32(localOffset);
            let boxType = String.fromCharCode(
                accumulated[localOffset + 4], accumulated[localOffset + 5],
                accumulated[localOffset + 6], accumulated[localOffset + 7]
            );
            let headerSize = 8;

            if (boxSize === 1) {
                if (localOffset + 16 > accumulated.byteLength) break;
                let hi = localView.getUint32(localOffset + 8);
                let lo = localView.getUint32(localOffset + 12);
                boxSize = hi * 0x100000000 + lo;
                headerSize = 16;
            }
            if (boxSize === 0) boxSize = self.file.size - (absoluteBase + localOffset);
            if (boxSize < headerSize) break;

            if (localOffset + boxSize > accumulated.byteLength) {
                console.log('fix end 1', localOffset, boxSize, boxType, localOffset + boxSize, accumulated.byteLength)

                //if box is not fully loaded yet, fix end of accumulated so it contains entire box
                let fixedEnd = end + ((localOffset + boxSize) - accumulated.byteLength);
                return await readNextChunk(start, fixedEnd);
                break; // box not fully loaded yet
            }

            let absStart = absoluteBase + localOffset;
            let absEnd = absStart + boxSize;
            console.log('scanSegments boxType', boxType, absStart, absEnd)

            if (boxType === 'moof') {
                // peek at the next box
                let moofSegment = {
                    startOffset: absStart,
                    endOffset: absEnd,
                    moofBoxData: accumulated.slice(localOffset, localOffset + boxSize),
                    followingMdatSegment: null
                };
                let nextLocalOffset = localOffset + boxSize;
                console.log('scanSegments moof found', moofSegment.endOffset - self.initSegmentEnd, nextLocalOffset)
                if (nextLocalOffset + 8 <= accumulated.byteLength) {
                    let nextSize = localView.getUint32(nextLocalOffset);
                    let nextType = String.fromCharCode(
                        accumulated[nextLocalOffset + 4], accumulated[nextLocalOffset + 5],
                        accumulated[nextLocalOffset + 6], accumulated[nextLocalOffset + 7]
                    );
                    if (nextType === 'mdat') {
                        console.log('scanSegments mdat found', localOffset, moofMdatPairs.length)

                        if (nextLocalOffset + nextSize > accumulated.byteLength) {
                            //if box is not fully loaded yet, fix end of accumulated so it contains entire box
                            let diff = ((nextLocalOffset + nextSize) - accumulated.byteLength);
                            let fixedEnd = end + diff;
                            console.log('fix end 2', boxSize, nextLocalOffset + nextSize, accumulated.byteLength)
                            console.log('fix end 2', end, diff)

                            return await readNextChunk(start, fixedEnd);
                            break; // box not fully loaded yet
                        }
                        let mdatAbsEnd = absoluteBase + nextLocalOffset + nextSize;
                        moofSegment.followingMdatSegment = {
                            startOffset: absStart,
                            endOffset: mdatAbsEnd,
                            mdatBoxData: accumulated.slice(nextLocalOffset, nextLocalOffset + nextSize)
                        };
                        moofSegments.push(moofSegment);

                        const fragments = self._parseFragment(moofSegment.moofBoxData, moofSegment.startOffset);
                        moofSegment.parsed = fragments;
                        //console.log('fragments scanSegments', fragments[self.trackIdsInfo.videoTrackId])
                        const moofMdatPair = new Uint8Array(moofSegment.moofBoxData.length + moofSegment.followingMdatSegment.mdatBoxData.length);
                        moofMdatPair.set(moofSegment.moofBoxData, 0);
                        moofMdatPair.set(moofSegment.followingMdatSegment.mdatBoxData, moofSegment.moofBoxData.length);
                        console.log('fragments scanSegments endOffset', fragments.samples[self.trackIdsInfo.videoTrackId].endOffset)

                        const endTime = fragments.samples[self.trackIdsInfo.videoTrackId].endTime;
                        const startTime = fragments.samples[self.trackIdsInfo.videoTrackId].startTime;
                        const pairToBuffer = {
                            data: moofMdatPair,
                            startOffset: moofSegment.startOffset,
                            endOffset: moofSegment.followingMdatSegment.endOffset,
                            startTime: startTime,
                            endTime: endTime,
                            fetchSessionId: fetchSessionInfo ? fetchSessionInfo.sessionId : null
                        };

                        if (options.regularFetch == false) {
                            moofSegment.moofMdatPair = moofMdatPair;
                        }

                        moofMdatPairs.push(pairToBuffer);
                        console.log('fix localOffset', nextLocalOffset, nextSize, nextLocalOffset + nextSize, accumulated.byteLength)

                        localOffset = nextLocalOffset + nextSize;
                        continue;
                    }
                } else {
                    //if moof+mdat pair is not fully loaded yet, fix end of accumulated so it contains entire these two segments
                    let fixedEnd = end + ((localOffset + boxSize + 8) - accumulated.byteLength);
                    return await readNextChunk(start, fixedEnd);
                    break; // need next chunk to see the mdat
                }
                //self.segments.push({ start: absStart, end: absEnd });
            }

            localOffset += boxSize;
        }

        // trim accumulated to only unprocessed tail
        accumulated = accumulated.slice(localOffset);
        absoluteBase += localOffset;

        return {
            moofSegments: moofSegments,
            moofMdatPairs: moofMdatPairs
        }
    }

    const moofSegments = await readNextChunk(startOffset, endOffset);
    console.log('scanSegments resolve');
    return moofSegments;
};

// Read a specific byte range from the file — used to feed a segment into SourceBuffer.
RegularMP4Parser.prototype.readSegment = function (start, end) {
    return this.file.slice(start, end).arrayBuffer();
};

/* RegularMP4Parser.prototype.initSegment = function () {
  if (!this._initEnd) return null;
  return this.buf.slice(0, this._initEnd);
}; */

RegularMP4Parser.prototype._extractMime = function (moovBox) {
    const view = new DataView(moovBox.buffer);

    let codec = '';
    let isVideo = false;

    const containerBoxes = new Set([
        'moov', 'trak', 'mdia', 'minf', 'stbl', 'stsd'
    ]);

    function readType(v, off) {
        return String.fromCharCode(
            v.getUint8(off),
            v.getUint8(off + 1),
            v.getUint8(off + 2),
            v.getUint8(off + 3)
        );
    }

    function readSize(v, off) {
        let size = v.getUint32(off);

        if (size === 1) {
            // 64-bit largesize
            const high = v.getUint32(off + 8);
            const low = v.getUint32(off + 12);
            size = high * 2 ** 32 + low;
            return { size, headerSize: 16 };
        }

        return { size, headerSize: 8 };
    }

    function scan(v, off, end) {
        while (off + 8 <= end) {
            const { size, headerSize } = readSize(v, off);
            const type = readType(v, off + 4);

            if (size < headerSize || off + size > end) {
                console.warn('Invalid box size', { type, size, off });
                break;
            }

            // DEBUG (optional)
            // console.log('BOX', type, 'size', size, 'offset', off);

            // --- codec detection ---
            // detect sample entry
            if (type === 'avc1' || type === 'avc3') {
                isVideo = true;

                // scan inside avc1 for avcC
                let innerOff = off + headerSize + 78;
                // 78 bytes = typical visual sample entry header
                // safer approach below (see note)

                while (innerOff + 8 <= off + size) {
                    const innerSize = v.getUint32(innerOff);
                    const innerType = readType(v, innerOff + 4);

                    if (innerSize < 8 || innerOff + innerSize > off + size) break;

                    if (innerType === 'avcC') {
                        const avcCStart = innerOff + 8;
                        codec = parseAvcC(v, avcCStart);
                        break;
                    }

                    innerOff += innerSize;
                }
            }

            if (type === 'hev1' || type === 'hvc1') {
                codec = 'hev1.1.6.L93.B0';
                isVideo = true;
            }

            if (type === 'vp09') {
                codec = 'vp09.00.10.08';
                isVideo = true;
            }

            if (type === 'av01') {
                codec = 'av01.0.04M.08';
                isVideo = true;
            }

            // --- recurse into container boxes ---
            if (containerBoxes.has(type)) {
                let childOffset = off + headerSize;

                // special handling for stsd
                if (type === 'stsd') {
                    // skip version (1) + flags (3) + entry_count (4)
                    childOffset += 8;
                }

                scan(v, childOffset, off + size);
            }

            off += size;
        }
    }

    function parseAvcC(v, start) {
        // start = beginning of avcC box payload (after header)

        const profile_idc = v.getUint8(start + 1);
        const profile_compat = v.getUint8(start + 2);
        const level_idc = v.getUint8(start + 3);

        function toHex(n) {
            return n.toString(16).padStart(2, '0').toUpperCase();
        }

        return `avc1.${toHex(profile_idc)}${toHex(profile_compat)}${toHex(level_idc)}`;
    }

    scan(view, 0, moovBox.byteLength);

    console.log('_extractMime result — codec:', codec, 'isVideo:', isVideo);

    if (isVideo && codec) {
        this.mimeType = `video/mp4; codecs="${codec},mp4a.40.2"`;
    }
};

RegularMP4Parser.prototype.fourcc = function (offset) {
    return String.fromCharCode(
        this.view.getUint8(offset),
        this.view.getUint8(offset + 1),
        this.view.getUint8(offset + 2),
        this.view.getUint8(offset + 3)
    );
};


RegularMP4Parser.prototype.readBoxSize = function (buf, offset) {
    const size =
        (buf[offset] << 24) |
        (buf[offset + 1] << 16) |
        (buf[offset + 2] << 8) |
        buf[offset + 3];

    return size >>> 0;
}

RegularMP4Parser.prototype.readBoxType = function (buf, offset) {
    return String.fromCharCode(
        buf[offset],
        buf[offset + 1],
        buf[offset + 2],
        buf[offset + 3]
    );
}

RegularMP4Parser.prototype.readBoxTypeFromDecimal = function (num) {
    return String.fromCharCode(
        (num >> 24) & 0xFF,
        (num >> 16) & 0xFF,
        (num >> 8) & 0xFF,
        num & 0xFF
    );
}

RegularMP4Parser.prototype.findBox = function findBox(buf, targetType) {
    let offset = 0;

    while (offset + 8 <= buf.length) {
        const size = RegularMP4Parser.prototype.readBoxSize(buf, offset);
        const type = RegularMP4Parser.prototype.readBoxType(buf, offset + 4);

        if (size < 8 || offset + size > buf.length) {
            console.error('Invalid box at', offset);
            break;
        }

        if (type === targetType) {
            return buf.slice(offset, offset + size);
        }

        offset += size;
    }

    return null;
}

RegularMP4Parser.prototype.readBytes = async function (offset, length) {
    return this.file.slice(offset, offset + length).arrayBuffer()
}

RegularMP4Parser.prototype.findBoxWithinFile = async function (targetType, start = 0, end = this.file.size) {
    const self = this;
    let offset = start;

    while (offset < end) {

        // 1. Read header (at least 8 bytes)
        const header = await self.readBytes(offset, 8);
        const view = new DataView(header);

        let size = view.getUint32(0);
        const type = readType(header, 4);

        let headerSize = 8;

        // 2. Handle large size
        if (size === 1) {
            const extended = await self.readBytes(offset + 8, 8);
            size = self.readUint64(extended);
            headerSize = 16;
        }

        // 3. Handle invalid / incomplete
        if (size < headerSize) throw new Error("Invalid box");

        // 4. FOUND
        if (type === targetType) {
            return {
                offset,
                size,
                headerSize
            };
        }

        // 5. If container → recurse
        if (isContainer(type)) {
            const result = await self.findBoxWithinFile(
                file,
                targetType,
                offset + headerSize,
                offset + size
            );
            if (result) return result;
        }

        // 6. Skip box
        offset += size;
    }

    return null;
}


RegularMP4Parser.prototype.getStringFromBuffer = function (buffer, start, length) {
    return String.fromCharCode.apply(null, buffer.slice(start, start + length));
}

RegularMP4Parser.prototype.findSampleAtTime = function (time, samples) {
    const self = this;
    //const trackId = this.trackIdsInfo.videoTrackId;

    const entries = samples;

    // --- Binary search: find last entry with entry.time <= time ---
    let left = 0;
    let right = entries.length - 1;
    let resultIndex = 0;

    while (left <= right) {
        const mid = (left + right) >> 1;
        const entry = entries[mid];

        if (entry.time <= time) {
            resultIndex = mid;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    const entry = entries[resultIndex];
    const nextEntry = entries[resultIndex + 1];

    return {
        index: entry.index,
        time: entry.time,
        fileOffset: entry.fileOffset,

        // useful for range calculations
        nextTime: nextEntry ? nextEntry.time : null,
        nextFileOffset: nextEntry ? nextEntry.fileOffset : null
    };
};


