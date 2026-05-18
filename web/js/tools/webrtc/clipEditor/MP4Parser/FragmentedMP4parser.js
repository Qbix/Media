Q.Media.WebRTC.clipEditor.FragmentedMP4parser = function (file, options) {
    const self = this;
    this.initBoxes = new Map();
    this.initSegment = null;
    this.initSegmentEnd = null;
    this.ftypBox = null;
    this.moovBox = null;
    this.parsedMoovBox = null;
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
        [self.BOX.trak]: [self.BOX.moov, self.BOX.trak],
        [self.BOX.mdia]: [self.BOX.moov, self.BOX.trak, self.BOX.mdia],
        [self.BOX.minf]: [self.BOX.moov, self.BOX.trak, self.BOX.mdia, self.BOX.minf],
        [self.BOX.stbl]: [self.BOX.moov, self.BOX.trak, self.BOX.mdia, self.BOX.minf, self.BOX.stbl],
        [self.BOX.stss]: [self.BOX.moov, self.BOX.trak, self.BOX.mdia, self.BOX.minf, self.BOX.stbl, self.BOX.stss],
    };
}

const FragmentedMP4parser = Q.Media.WebRTC.clipEditor.FragmentedMP4parser;
FragmentedMP4parser.prototype = Object.create(Q.Media.WebRTC.clipEditor.BaseMP4Parser.prototype);

FragmentedMP4parser.prototype.updateCurrentTime = async function (currentTime, startOffset, options = {}) {
    const self = this;
    const fetchSessionInfo = options.fetchSessionInfo;
    console.log('updateCurrentTime START', currentTime, startOffset, fetchSessionInfo)
    console.log('updateCurrentTime initfetch=' + (startOffset != null))
    console.log('updateCurrentTime sessionId', fetchSessionInfo.sessionId, self.fetchSession.sessionId)
    if(fetchSessionInfo.sessionId !== self.fetchSession.sessionId) {
        //new fetch session was initiated so we don't need mediaData anymore
        console.error('Fetch sessions do not match', fetchSessionInfo.sessionId, self.fetchSession.sessionId)
        return false;
    }

    let calledBySetCurrentTime = false
    if(startOffset != null) {
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
    if(self.latestBufferedFragment) {
        let totalBufferedTime = self.latestBufferedFragment.endTime - self.firstBufferedFragment.startTime;
        console.log('updateCurrentTime totalBufferedTime', totalBufferedTime)
        bufferedTimeLeft = self.latestBufferedFragment.endTime - currentTime;
    }
   
    let offsetStartScanFrom = self.latestBufferedFragment ? self.latestBufferedFragment.endOffset : self.initSegmentEnd;
    let offsetEndScanAt = self.latestBufferedFragment ? self.latestBufferedFragment.endOffset + self.CHUNK_SIZE : self.initSegmentEnd + self.CHUNK_SIZE;
    if(offsetEndScanAt > self.file.size) offsetEndScanAt = self.file.size;
    if(offsetStartScanFrom == offsetEndScanAt) {
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

    const mediaData = await self.scanSegments(offsetStartScanFrom, offsetEndScanAt, { fetchSessionInfo: fetchSessionInfo, regularFetch: true });
    console.log('updateCurrentTime mediaData', mediaData.moofMdatPairs)
   
    if(fetchSessionInfo.sessionId !== self.fetchSession.sessionId) {
        //new fetch session was initiated so we don't need mediaData anymore
        console.error('Fetch sessions do not match', fetchSessionInfo.sessionId, self.fetchSession.sessionId, calledBySetCurrentTime)

        return false;
    }

    if (startOffset == null && fetchSessionInfo.state == 'initFetch') {
        console.error('initfetch in progress', fetchSessionInfo.sessionId, calledBySetCurrentTime)
        return false;
    }
    console.log('updateCurrentTime mediaData 2', calledBySetCurrentTime)

    if(mediaData.moofMdatPairs.length === 0) {
        if(startOffset == null && fetchSessionInfo.state == 'initFetch') {
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
        endOffset: lastPair.endOffset
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
FragmentedMP4parser.prototype.setCurrentTime = async function (time, fetchSessionInfo) {
    console.log('setCurrentTime START', time)
    const self = this;
    if(fetchSessionInfo.sessionId !== self.fetchSession.sessionId) {
        //new fetch session was initiated so we don't need mediaData anymore
        return false;
    }
    self.segmentToTimeMap.clear();
    const keyFrameToBufferFrom = self.findSampleAtTime(time);
    fetchSessionInfo.startKeyframe = keyFrameToBufferFrom;
    await self.updateCurrentTime(keyFrameToBufferFrom.time, keyFrameToBufferFrom.moofOffset, { fetchSessionInfo: fetchSessionInfo, abortIsNotAllowed: true });
    return keyFrameToBufferFrom;
}

FragmentedMP4parser.prototype.createClip = async function (startTime, endTime) {
    console.log('createClip START', startTime, endTime)
    const self = this;
    const startKeyframe = self.findSampleAtTime(startTime);
    const endTimeKeyframe = self.findSampleAtTime(endTime);

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
    //return FragmentedMP4parser.prototype.downloadClip(accumulated);
}

FragmentedMP4parser.prototype.downloadClip = function (bytes, fileName = 'clip.mp4') {
    const self = this;

    const blob = new Blob(
        [bytes],
        { type: self.mimeType }
    );

    return blob
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
}

FragmentedMP4parser.prototype.write64 = function (view, off, value) {
    const hi = Math.floor(value / 0x100000000);
    const lo = value >>> 0;

    view.setUint32(off, hi);
    view.setUint32(off + 4, lo);
}

FragmentedMP4parser.prototype.patchTfdtBoxeWithinMoof = function (moofBoxInfo, clipStartTimeSec){
    const self = this;
    console.log('moofBoxInfo.parsed.childBoxes.traf', moofBoxInfo, self.trackIdsInfo.videoTrackId, moofBoxInfo.parsed.childBoxes.traf)
    

    


   self.write64(view, startOffset, newTime);
}

FragmentedMP4parser.prototype.patchMfhd = function (u8, start, end, state) {

    const view = new DataView(
      u8.buffer,
      u8.byteOffset,
      u8.byteLength
    );

    let off = start;

    while (off + 8 <= end) {

      let size = view.getUint32(off);
      let headerSize = 8;

      if (size === 1) {
        size = readUint64(
          view,
          off + 8
        );
        headerSize = 16;
      }

      if (
        size < headerSize ||
        off + size > end
      ) {
        break;
      }

      const type = readType(
        u8,
        off
      );

      //---------------------------------
      // patch mfhd.sequence_number
      //---------------------------------
      if (type === "mfhd") {

        const seqOffset =
          off +
          headerSize +
          4; // skip version+flags

        view.setUint32(
          seqOffset,
          state.nextSequence
        );

        state.nextSequence++;
      }

      //---------------------------------
      // recurse containers
      //---------------------------------
      if (
        type === "moof"
      ) {
        patchBoxes(
          u8,
          off + headerSize,
          off + size,
          state
        );
      }

      off += size;
    }
  }

FragmentedMP4parser.prototype.patchTfdtBoxes = function (moofSegments, clipStartTimeSec, clipEndTimeSec) {
    const self = this;
    
    const state = { 
        nextSequenceNumber: 1
    };

    for (let i = 0; i < moofSegments.length; i++) {
        const moofBoxInfo = moofSegments[i];
        const trafs = moofBoxInfo.parsed.childBoxes.traf;
        const mfhd = moofBoxInfo.parsed.childBoxes.mfhd;
        console.log('patch tfdt START', moofBoxInfo)

        if(trafs.length == 3) {
                    console.log('patch tfdt subtitle', moofBoxInfo)

        }
        const view = new DataView(
            moofBoxInfo.moofMdatPair.buffer,
            moofBoxInfo.moofMdatPair.byteOffset,
            moofBoxInfo.moofMdatPair.byteLength
        );

        let subtittleTraf = null;
        for(let t in trafs) {

            const trafBox = trafs[t];
            const trackId = trafBox._trackId
            console.log('patch tfdt for traf', trafBox)
            if(!trafBox) continue; //some moofs may not contain subtitle tracks
            const tfdtBox = trafBox.tfdt;
            const version = tfdtBox.version;
            const oldTime = tfdtBox.baseMediaDecodeTime;
            const startOffset = tfdtBox._dataStartOffset;

            if(trackId === self.trackIdsInfo.textTrackId) {
                subtittleTraf = trafBox;
            }

            const trackTimescale = self.timescales[trackId];
            const shift =  Math.floor(clipStartTimeSec * trackTimescale);

            console.log('patch tfdt for traf trackId', trackId)
            if (version === 1) {
                const newTime = Math.max( 0, oldTime - shift );
                console.log('patch tfdt 1 oldTime', trackId, oldTime, newTime)
                self.write64( view, startOffset, newTime );
            } else {
                const newTime = Math.max( 0, oldTime - shift ); 
                console.log('patch tfdt 2 oldTime', oldTime, newTime) 
                view.setUint32( startOffset, newTime );
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
            const clipEndRaw = Math.floor( clipEndTimeSec * subtitleTimescale );
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



        const sequenceNumber = view.getUint32( mfhd._boxStartOffset + 12 );

        console.log('patch tfdt mfhd', mfhd._dataStartOffset, state.nextSequenceNumber, sequenceNumber)

        view.setUint32(
          mfhd._boxStartOffset + 12,
          state.nextSequenceNumber
        );

        const newSequenceNumber = view.getUint32( mfhd._boxStartOffset + 12 );
        console.log('patch tfdt mfhd 2', mfhd._dataStartOffset, state.nextSequenceNumber, newSequenceNumber)


        state.nextSequenceNumber++
    }
}


FragmentedMP4parser.prototype.patchTfdtBoxes3 = function (
    moofMdatPairs,
    clipStartTimeSec
) {
    const self = this;

    function readType(u8, off) {
        return String.fromCharCode(
            u8[off + 4],
            u8[off + 5],
            u8[off + 6],
            u8[off + 7]
        );
    }

    function read64(view, off) {
        const hi = view.getUint32(off);
        const lo = view.getUint32(off + 4);
        return hi * 0x100000000 + lo;
    }

    function write64(view, off, val) {
        const hi = Math.floor(val / 0x100000000);
        const lo = val >>> 0;

        view.setUint32(off, hi);
        view.setUint32(off + 4, lo);
    }

    function getTrackIdFromTfhd(u8, boxOffset) {

        const view = new DataView(
            u8.buffer,
            u8.byteOffset,
            u8.byteLength
        );

        let headerSize = 8;

        if (view.getUint32(boxOffset) === 1) {
            headerSize = 16;
        }

        // fullbox:
        // version+flags = 4 bytes
        // then track_ID
        return view.getUint32(
            boxOffset + headerSize + 4
        );
    }

    function patchBoxes(u8, start, end, currentTrackId) {

        const view = new DataView(
            u8.buffer,
            u8.byteOffset,
            u8.byteLength
        );

        let off = start;

        while (off + 8 <= end) {

            let size = view.getUint32(off);
            let headerSize = 8;

            if (size === 1) {
                size = read64(view, off + 8);
                headerSize = 16;
            }

            if (size < headerSize || off + size > end) {
                break;
            }

            const type = readType(u8, off);
            let trackId = currentTrackId;

            console.log('patch tfdt type', type, trackId)
            //--------------------------------
            // tfhd gives track id
            //--------------------------------
            if (type === "tfhd") {
                trackId = getTrackIdFromTfhd(
                    u8,
                    off
                );
            }
            console.log('patch tfdt type 2', trackId)

            //--------------------------------
            // patch tfdt using THAT track scale
            //--------------------------------
            if (type === "tfdt" && trackId) {

                const trackScale =
                    self.timescales[trackId];

                const shift =
                    Math.floor(
                        clipStartTimeSec *
                        trackScale
                    );
                console.log('patch tfdt shift', shift)

                const version =
                    view.getUint8(
                        off + headerSize
                    );

                if (version === 1) {

                    const oldTime =
                        read64(
                            view,
                            off + headerSize + 4
                        );

                        
                    const newTime =
                        Math.max(
                            0,
                            oldTime - shift
                        );
                        console.log('patch tfdt oldTime', oldTime, newTime)
                    write64(
                        view,
                        off + headerSize + 4,
                        newTime
                    );

                } else {

                    const oldTime =
                        view.getUint32(
                            off + headerSize + 4
                        );

                    const newTime =
                        Math.max(
                            0,
                            oldTime - shift
                        );
                        console.log('patch tfdt oldTime', oldTime, newTime)

                    view.setUint32(
                        off + headerSize + 4,
                        newTime
                    );
                }
            }

            //--------------------------------
            // recurse
            //--------------------------------
            if (
                type === "moof" ||
                type === "traf"
            ) {
                patchBoxes(
                    u8,
                    off + headerSize,
                    off + size,
                    trackId
                );
            }

            off += size;
        }
    }

    for (let i = 0; i < moofMdatPairs.length; i++) {

        patchBoxes(
            moofMdatPairs[i].data,
            0,
            moofMdatPairs[i].data.byteLength,
            null
        );
    }

    return moofMdatPairs;
};

FragmentedMP4parser.prototype.patchTfdtBoxes2 = function (moofMdatPairs, clipStartTimeSec) {
    const self = this;

    const videoTrackId = self.trackIdsInfo.videoTrackId;
    const timescale = self.timescales[videoTrackId];

    // shift amount in raw decode-time units
    const shift = Math.floor(clipStartTimeSec * timescale);

    function readType(u8, off) {
        return String.fromCharCode(
            u8[off + 4],
            u8[off + 5],
            u8[off + 6],
            u8[off + 7]
        );
    }

    function readUint64(view, off) {
        const hi = view.getUint32(off);
        const lo = view.getUint32(off + 4);
        return hi * 0x100000000 + lo;
    }

    function writeUint64(view, off, val) {
        const hi = Math.floor(val / 0x100000000);
        const lo = val >>> 0;

        view.setUint32(off, hi);
        view.setUint32(off + 4, lo);
    }

    function patchBoxesRecursive(u8, start, end) {
        const view = new DataView(
            u8.buffer,
            u8.byteOffset,
            u8.byteLength
        );

        let offset = start;

        while (offset + 8 <= end) {

            let size = view.getUint32(offset);
            const type = readType(u8, offset);

            let headerSize = 8;

            if (size === 1) {
                size = readUint64(view, offset + 8);
                headerSize = 16;
            }

            if (size < headerSize || offset + size > end) {
                break;
            }

            // ---- patch tfdt ----
            if (type === 'tfdt') {

                const version = view.getUint8(offset + headerSize);

                if (version === 1) {
                    // 64-bit baseMediaDecodeTime
                    const oldTime = readUint64(
                        view,
                        offset + headerSize + 4
                    );

                    const newTime = Math.max(0, oldTime - shift);

                    writeUint64(
                        view,
                        offset + headerSize + 4,
                        newTime
                    );
                } else {
                    // version 0 => 32-bit
                    const oldTime = view.getUint32(
                        offset + headerSize + 4
                    );

                    const newTime = Math.max(0, oldTime - shift);

                    view.setUint32(
                        offset + headerSize + 4,
                        newTime
                    );
                }
            }

            // recurse into container boxes
            if (
                type === 'moof' ||
                type === 'traf'
            ) {
                patchBoxesRecursive(
                    u8,
                    offset + headerSize,
                    offset + size
                );
            }

            offset += size;
        }
    }

    for (let i = 0; i < moofMdatPairs.length; i++) {
        const chunk = moofMdatPairs[i].data;

        // mutate bytes in-place
        patchBoxesRecursive(
            chunk,
            0,
            chunk.byteLength
        );
    }

    return moofMdatPairs;
};

FragmentedMP4parser.prototype.read64 = function (view, off) {
    const hi = view.getUint32(off);
    const lo = view.getUint32(off + 4);
    return hi * 0x100000000 + lo;
}

FragmentedMP4parser.prototype.findBoxOffset = function (targetType, start, end, view, bytes) {
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
FragmentedMP4parser.prototype.patchMoovDurations = function (moovBoxBytes, clipDurationSec) {
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
    for(let i in traks) {
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

FragmentedMP4parser.prototype.patchMoovDurations2 = function (moovBoxBytes, clipDurationSec) {
    const moovBytes = new Uint8Array(moovBoxBytes);
    function typeAt(u8, off) {
        return String.fromCharCode(
            u8[off + 4],
            u8[off + 5],
            u8[off + 6],
            u8[off + 7]
        );
    }

    function read64(view, off) {
        const hi = view.getUint32(off);
        const lo = view.getUint32(off + 4);
        return hi * 0x100000000 + lo;
    }

    function write64(view, off, value) {
        const hi = Math.floor(value / 0x100000000);
        const lo = value >>> 0;

        view.setUint32(off, hi);
        view.setUint32(off + 4, lo);
    }

    const view = new DataView(
        moovBytes.buffer,
        moovBytes.byteOffset,
        moovBytes.byteLength
    );

    function patchBoxes(start, end) {
        let off = start;

        while (off + 8 <= end) {

            let size = view.getUint32(off);
            let headerSize = 8;

            if (size === 1) {
                size = read64(view, off + 8);
                headerSize = 16;
            }

            if (size < headerSize || off + size > end) {
                break;
            }

            const type = typeAt(moovBytes, off);

            //-----------------------------------
            // mvhd
            //-----------------------------------
            if (type === 'mvhd') {
                console.log('patchMoovDurations mvhd')
                const version = view.getUint8(off + headerSize);

                if (version === 1) {

                    const timescaleOffset = off + headerSize + 20;
                    const durationOffset = off + headerSize + 24;

                    const timescale = view.getUint32(timescaleOffset);

                    const newDur =
                        Math.floor(clipDurationSec * timescale);

                    write64(view, durationOffset, newDur);

                } else {

                    const timescaleOffset = off + headerSize + 12;
                    const durationOffset = off + headerSize + 16;

                    const timescale = view.getUint32(timescaleOffset);

                    const newDur =
                        Math.floor(clipDurationSec * timescale);

                    view.setUint32(durationOffset, newDur);
                }
            }

            //-----------------------------------
            // tkhd
            //-----------------------------------
            if (type === 'tkhd') {
                console.log('patchMoovDurations tkhd')

                const version = view.getUint8(off + headerSize);

                if (version === 1) {

                    const durationOffset = off + headerSize + 28;

                    // Usually movie timescale:
                    const movieTimescale =
                        this.movieTimescale ||
                        this.timescales[this.trackIdsInfo.videoTrackId];

                    const newDur =
                        Math.floor(clipDurationSec * movieTimescale);

                    write64(view, durationOffset, newDur);

                } else {

                    const durationOffset = off + headerSize + 20;

                    const movieTimescale =
                        this.movieTimescale ||
                        this.timescales[this.trackIdsInfo.videoTrackId];

                    const newDur =
                        Math.floor(clipDurationSec * movieTimescale);

                    view.setUint32(durationOffset, newDur);
                }
            }

            //-----------------------------------
            // mdhd
            //-----------------------------------
            if (type === 'mdhd') {
                console.log('patchMoovDurations mdhd')

                const version = view.getUint8(off + headerSize);

                if (version === 1) {

                    const timescaleOffset = off + headerSize + 20;
                    const durationOffset = off + headerSize + 24;

                    const timescale =
                        view.getUint32(timescaleOffset);

                    const newDur =
                        Math.floor(clipDurationSec * timescale);

                    write64(view, durationOffset, newDur);

                } else {

                    const timescaleOffset = off + headerSize + 12;
                    const durationOffset = off + headerSize + 16;

                    const timescale =
                        view.getUint32(timescaleOffset);

                    const newDur =
                        Math.floor(clipDurationSec * timescale);

                    view.setUint32(durationOffset, newDur);
                }
            }

            //-----------------------------------
            // recurse into containers
            //-----------------------------------
            if (
                type === 'moov' ||
                type === 'trak' ||
                type === 'mdia'
            ) {
                patchBoxes.call(
                    this,
                    off + headerSize,
                    off + size
                );
            }

            off += size;
        }
    }

    patchBoxes.call(
        this,
        0,
        moovBytes.byteLength
    );

    return moovBytes;
};

FragmentedMP4parser.prototype.init = async function () {
    const self = this;
    await self.loadInit();
    await self.loadMfra();

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

FragmentedMP4parser.prototype.loadInit = async function () {
    const self = this;
    let ftypOffset = await self.findBoxOffsetInFile(self.BOX.ftyp);
    self.ftypBox = await self.readChunk(ftypOffset.offset, ftypOffset.size);

    let moovOffset = await self.findBoxOffsetInFile(self.BOX.moov);
    self.moovBox = await self.readChunk(moovOffset.offset, moovOffset.size);

    let parsedMoov = self.parseBoxes(self.moovBox.view);
    self.parsedMoovBox = parsedMoov.moov;
    console.log('parsedMoovBox', self.parsedMoovBox)

    const init = new Uint8Array(self.ftypBox.bytes.length + self.moovBox.bytes.length);
    init.set(self.ftypBox.bytes, 0);
    init.set(self.moovBox.bytes, self.ftypBox.bytes.length);
    self.initSegment = init;
    self.initSegmentEnd = init.length;

    self._extractMime(self.moovBox.bytes);

    self.timescales = self.getTimescales(self.moovBox.bytes);
    self.trackIdsInfo = self.getTrackInfo(self.moovBox.bytes);
}
FragmentedMP4parser.prototype.loadInit2 = function () {
    var view = null;
    var self = this;
    var offset = 0;
    var accumulated = new Uint8Array(0);

    function readNextChunk() {
        var start = offset;
        var end = Math.min(start + self.CHUNK_SIZE, self.file.size);
        if (start >= end) {
            return Promise.reject(new Error('reached end of file without finding moov'));
        }

        return self.file.slice(start, end).arrayBuffer().then(function (chunkBuf) {
            // append chunk to accumulated buffer
            var chunk = new Uint8Array(chunkBuf);
            var merged = new Uint8Array(accumulated.byteLength + chunk.byteLength);
            merged.set(accumulated, 0);
            merged.set(chunk, accumulated.byteLength);
            accumulated = merged;
            offset = end;

            let buffer = accumulated.buffer;
            console.log('accumulated.byteLength', accumulated.byteLength);
            let view = new DataView(buffer);

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

            // try to parse top-level box headers from what we have so far
            //var moovEnd = self._scanTopLevelBoxes(accumulated.byteLength);

            /* var moov2 = self.findBox(accumulated, 'moov');
            if(moov2) {
              self._extractMime(moov2);
            } */

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
FragmentedMP4parser.prototype.loadMfra = function () {
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

FragmentedMP4parser.prototype.estimateDuration = function (tfra, timescale) {
    const last = tfra.entries[tfra.entries.length - 1];
    return last.time / timescale;
}

FragmentedMP4parser.prototype.scanFragmentsAtPercentOffset = function (percent, direction) {

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

FragmentedMP4parser.prototype.getTimescales = function (moov) {
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

FragmentedMP4parser.prototype.getTrackInfo = function (moov) {
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
                }
                
                //console.log('track', trackId, '=', tracks[trackId]);
            }
        }

        offset += size;
    }

    return tracks; // { 1: 'video', 2: 'audio' }
}

// Parse top-level box headers from what is currently in self.buf.
// Returns the byte offset of moov's end if moov is fully within the buffer,
// null if we need more data.
FragmentedMP4parser.prototype._scanTopLevelBoxes = function (available) {
    console.log('_scanTopLevelBoxes')
    this.boxes = new Map();
    var offset = 0;
    var moovEnd = null;

    while (offset + 8 <= available) {
        var boxSize = this.view.getUint32(offset);
        var boxType = this.fourcc(offset + 4);
        var headerSize = 8;

        if (boxSize === 1) {
            if (offset + 16 > available) break; // need more data for extended size
            var hi = this.view.getUint32(offset + 8);
            var lo = this.view.getUint32(offset + 12);
            boxSize = hi * 0x100000000 + lo;
            headerSize = 16;
        }
        if (boxSize === 0) boxSize = this.file.size - offset;
        if (boxSize < headerSize) break;

        var boxEnd = offset + boxSize;
        this.boxes[boxType] = { type: boxType, start: offset, end: boxEnd, headerSize: headerSize };

        if (boxType === 'moov') {
            if (boxEnd <= available) {
                moovEnd = boxEnd;
                this._initEnd = boxEnd; // ftyp always precedes moov, so initEnd = moovEnd
            } else {
                return null; // moov found but not fully loaded yet
            }
        }

        offset = boxEnd;
    }

    // also account for ftyp in _initEnd
    if (this.boxes.has('ftyp')) {
        // _initEnd is already moovEnd; ftyp comes before it, nothing to do
    }

    return moovEnd;
};

FragmentedMP4parser.prototype.readUint32 = function (buf, offset) {
    return (
        (buf[offset] << 24) |
        (buf[offset + 1] << 16) |
        (buf[offset + 2] << 8) |
        buf[offset + 3]
    ) >>> 0;
}

FragmentedMP4parser.prototype.readUint64 = function (view, offset) {
    const hi = view.getUint32(offset);
    const lo = view.getUint32(offset + 4);
    return hi * 0x100000000 + lo;
}
FragmentedMP4parser.prototype._readVariable = function (view, offset, size) {
    let val = 0;
    for (let i = 0; i < size; i++) {
        val = (val << 8) | view.getUint8(offset + i);
    }
    return val;
};

FragmentedMP4parser.prototype.readType = function (buf, offset) {
    return String.fromCharCode(
        buf[offset],
        buf[offset + 1],
        buf[offset + 2],
        buf[offset + 3]
    );
}
FragmentedMP4parser.prototype.parseBoxes2 = function (buf, start = 0, end = buf.length, depth = 0) {
    let self = this;
    const CONTAINERS = new Set([
        'moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf', //These boxes contain children:
        'moof', 'traf'
    ]);

    let result = {};

    let offset = start;

    while (offset + 8 <= end) {
        let size = self.readUint32(buf, offset);
        const type = self.readType(buf, offset + 4);

        let headerSize = 8;

        // handle 64-bit size
        if (size === 1) {
            const high = self.readUint32(buf, offset + 8);
            const low = self.readUint32(buf, offset + 12);
            size = high * 2 ** 32 + low;
            headerSize = 16;
        }

        if (size < headerSize || offset + size > end) {
            console.warn('Invalid box', { type, offset, size });
            break;
        }

        // debug tree view
        /* console.log(
          ' '.repeat(depth * 2) + type,
          `(size=${size})`
        ); */

        const dataStart = offset + headerSize;
        const dataEnd = offset + size;

        let boxData = buf.slice(offset, offset + size);
        //if box already exist, then there can be multiple boxes of this type in on moof segment (e.g. traf)
        let currentBox = {
            _boxStartOffset: offset,
            _boxEndOffset: dataEnd,
            _dataStartOffset: dataStart,
            _dataEndOffset: dataEnd,
            _headerSize: headerSize,
            _boxData: boxData
        };
        let referenceKey;
        if (result[type] != null) {
            let storedBox = result[type];
            if (!Array.isArray(result[type])) {
                result[type] = [storedBox];
                //console.log('result[type] init', storedBox)

            }
            //console.log('result[type] push', type, result[type][0], result[type][1], result[type][2], result[type][3], result[type][4])

            //console.log('result[type] push', currentBox, type)

            let length = result[type].push(currentBox);
            referenceKey = length - 1;
            //console.log('result[type] pushed', referenceKey, type)

        } else {
            result[type] = currentBox;
        }

        // 👇 KEY PART: recursion
        if (CONTAINERS.has(type)) {
            let childBoxes = FragmentedMP4parser.prototype.parseBoxes(buf, dataStart, dataEnd, depth + 1)
            if (referenceKey != null) {
                result[type][referenceKey] = Object.assign({}, result[type][referenceKey], childBoxes);
            } else {
                result[type] = Object.assign({}, currentBox, childBoxes);
            }

        }

        offset += size;
    }

    return result;
}

// Scan moof+mdat segments from the region AFTER the init segment.
// Call this after loadInit() resolves.
// Reads the remainder of the file in 1MB chunks to build the segment index.
FragmentedMP4parser.prototype.scanSegments = async function (startOffset, endOffset, options = {}) {
    let self = this;

    const fetchSessionInfo = options.fetchSessionInfo;
  
    //let absoluteBase = self.initSegmentEnd; // byte offset in the file where accumulation starts
    let absoluteBase = startOffset; // byte offset in the file where accumulation starts
    console.log('scanSegments START', fetchSessionInfo, startOffset, endOffset)

    async function readNextChunk(start, end) {
        console.log('readNextChunk START', start, end, fetchSessionInfo)

        if(options.regularFetch === true && fetchSessionInfo.sessionId !== self.fetchSession.sessionId) {
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
            if(options.regularFetch === true && fetchSessionInfo.sessionId !== self.fetchSession.sessionId) {
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
                        console.log('fragments scanSegments moofBoxData', moofSegment.moofBoxData)
                        //const fragments = self.parseBoxes(moofSegment.moofBoxData);
                        console.log('fragments scanSegments fragments', fragments)

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

                        if(options.regularFetch == false) {
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
FragmentedMP4parser.prototype.readSegment = function (start, end) {
    return this.file.slice(start, end).arrayBuffer();
};

/* FragmentedMP4parser.prototype.initSegment = function () {
  if (!this._initEnd) return null;
  return this.buf.slice(0, this._initEnd);
}; */

FragmentedMP4parser.prototype._extractMime = function (moovBox) {
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

FragmentedMP4parser.prototype.fourcc = function (offset) {
    return String.fromCharCode(
        this.view.getUint8(offset),
        this.view.getUint8(offset + 1),
        this.view.getUint8(offset + 2),
        this.view.getUint8(offset + 3)
    );
};


FragmentedMP4parser.prototype.readBoxSize = function (buf, offset) {
    const size =
        (buf[offset] << 24) |
        (buf[offset + 1] << 16) |
        (buf[offset + 2] << 8) |
        buf[offset + 3];

    return size >>> 0;
}

FragmentedMP4parser.prototype.readBoxType = function (buf, offset) {
    return String.fromCharCode(
        buf[offset],
        buf[offset + 1],
        buf[offset + 2],
        buf[offset + 3]
    );
}

FragmentedMP4parser.prototype.findBox = function findBox(buf, targetType) {
    let offset = 0;

    while (offset + 8 <= buf.length) {
        const size = FragmentedMP4parser.prototype.readBoxSize(buf, offset);
        const type = FragmentedMP4parser.prototype.readBoxType(buf, offset + 4);

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


FragmentedMP4parser.prototype.getStringFromBuffer = function (buffer, start, length) {
    return String.fromCharCode.apply(null, buffer.slice(start, start + length));
}

FragmentedMP4parser.prototype.findSampleAtTime = function (time) {
    const trackId = this.trackIdsInfo.videoTrackId;
    const tfra = this.mfraBoxInfo?.tfras?.[trackId];

    if (!tfra || !tfra.entries || tfra.entries.length === 0) {
        return null;
    }

    const entries = tfra.entries;

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
        index: resultIndex,

        time: entry.time,
        rawTime: entry.rawTime,

        moofOffset: entry.moofOffset,
        sampleNumber: entry.sampleNumber,
        trafNumber: entry.trafNumber,
        trunNumber: entry.trunNumber,

        // useful for range calculations
        nextTime: nextEntry ? nextEntry.time : null,
        nextMoofOffset: nextEntry ? nextEntry.moofOffset : null
    };
};

FragmentedMP4parser.prototype.fetch = function () {

}
FragmentedMP4parser.prototype.findNearestKeyframe = function () {

}

FragmentedMP4parser.prototype.readDataFromFile = async function () {
    /* const fragments = this._parseFragment(moof, moofOffset, timescale);
  
    for (const f of fragments) {
      this.samples.push(...f.samples);
    } */

    var self = this;
    let currentOffset;
    self.startOffset = currentOffset = self.startOffset;
    self.startOffset = self.startOffset;
    var accumulated = new Uint8Array(0);

    function readNextChunk() {
        var start = currentOffset;
        var end = Math.min(start + self.CHUNK_SIZE, self.file.size);
        if (start >= end) {
            return Promise.reject(new Error('reached end of file without finding moov'));
        }

        return self.file.slice(start, end).arrayBuffer().then(function (chunkBuf) {
            // append chunk to accumulated buffer
            var chunk = new Uint8Array(chunkBuf);
            var merged = new Uint8Array(accumulated.byteLength + chunk.byteLength);
            merged.set(accumulated, 0);
            merged.set(chunk, accumulated.byteLength);
            accumulated = merged;
            currentOffset = self.endOffset = end;

            //let buffer = accumulated.buffer;
            //console.log('accumulated.byteLength', accumulated.byteLength);

            // moov not yet fully read — fetch next chunk
            //return readNextChunk();
        });
    }

    return readNextChunk();
};
FragmentedMP4parser.prototype.buildSamples = async function () {
    var self = this;
    /* const fragments = this._parseFragment(moof, moofOffset, timescale);
  
    for (const f of fragments) {
      this.samples.push(...f.samples);
    } */

    const moofs = await self.scanSegments();

    for (const moof of moofs) {
        const fragments = this._parseFragment(moof.moofBoxData, offset, this.timescale);

        for (const f of fragments) {
            this.samples.push(...f.samples);
        }
    }
};

FragmentedMP4parser.prototype._parseSampleTables = function (trak) {
    const stts = this._findBox(trak, 'stts');
    const stsz = this._findBox(trak, 'stsz');
    const stco = this._findBox(trak, 'stco') || this._findBox(trak, 'co64');
    const stsc = this._findBox(trak, 'stsc');
    const stss = this._findBox(trak, 'stss'); // optional

    return {
        stts: this._parseStts(stts),
        stsz: this._parseStsz(stsz),
        stco: this._parseStco(stco),
        stsc: this._parseStsc(stsc),
        stss: stss ? this._parseStss(stss) : null
    };
};

FragmentedMP4parser.prototype._buildSamplesFromFragment = function (
    traf,
    mdatOffset,
    timescale
) {
    const samples = [];

    const tfhd = this._findBox(traf, 'tfhd');
    const tfdt = this._findBox(traf, 'tfdt');
    const trun = this._findBox(traf, 'trun');

    const tfhdData = this._parseTfhd(tfhd);
    const baseTime = this._parseTfdt(tfdt); // decode time
    const trunData = this._parseTrun(trun);

    let time = baseTime;
    let offset = mdatOffset + trunData.dataOffset;

    for (let i = 0; i < trunData.samples.length; i++) {
        const s = trunData.samples[i];

        const duration =
            s.duration ?? tfhdData.defaultSampleDuration;

        const size =
            s.size ?? tfhdData.defaultSampleSize;

        const flags =
            s.flags ?? tfhdData.defaultSampleFlags;

        const isKeyframe = !(flags & 0x10000); // sample_is_non_sync_sample

        samples.push({
            time: time / timescale,
            duration: duration / timescale,
            offset,
            size,
            isKeyframe
        });

        time += duration;
        offset += size;
    }

    return samples;
};

FragmentedMP4parser.prototype.getAudio = async function () {

    /* const mediaData = await self.scanSegments(0, self.file.size, { regularFetch: false });
    console.log('getAudio mediaData', mediaData) */

    /* self.patchTfdtBoxes(mediaData.moofMdatPairs, startKeyframe.time);

    const clipDuration = endTimeKeyframe.time - startKeyframe.time;

    const patchedMoovBox = self.patchMoovDurations(
        self.moovBox,
        clipDuration
    );

    var accumulated = new Uint8Array(patchedMoovBox.byteLength);
    accumulated.set(patchedMoovBox, 0);
    for (let i in mediaData.moofMdatPairs) {
        let chunk = mediaData.moofMdatPairs[i].data;
        var merged = new Uint8Array(accumulated.byteLength + chunk.byteLength);
        merged.set(accumulated, 0);
        merged.set(chunk, accumulated.byteLength);
        accumulated = merged;
    } */

    /* return new Blob(
        [accumulated],
        { type: self.mimeType }
    ); */
}

FragmentedMP4parser.prototype.extractAudioSamples = function (fragment) {

  let audioChunks = [];

  for (const traf of fragment.moof.traf) {

      const tfhd = parseTfhd(traf.tfhd._boxData);

      if (tfhd.trackId !== audioTrackId) {
          continue;
      }

      const trun = parseTrun(traf.trun._boxData);

      let offset = moofOffset + trun.dataOffset;

      for (const s of trun.samples) {

          let size = s.size || tfhd.defaultSampleSize;

          audioChunks.push(
             fragmentData.slice(
                offset,
                offset + size
             )
          );

          offset += size;
      }
  }

  return audioChunks;
}