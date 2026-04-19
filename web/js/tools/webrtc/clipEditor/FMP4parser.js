Q.Media.WebRTC.clipEditor.FMP4Parser = function (file) {
  this.initBoxes = new Map();
  this.initSegment = null;
  this.initSegmentEnd = null;
  this.ftypBox = null;
  this.moovBox = null;
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
  this.CHUNK_SIZE = 10 * 1024 * 1024; // 1 MB
  this.eventDispatcher = new Q.Media.WebRTC.EventSystem();
  this.segmentToTimeMap = new Map();
  this.flatMoofMdatPairs = [];
}

const MP4Parser = Q.Media.WebRTC.clipEditor.FMP4Parser;

MP4Parser.prototype.setCurrentTime = async function () {
  var self = this;

  const moofs = await self.scanSegments();
  self.bufferedSegments.push(...moofs);
  return Promise.resolve();
  //self.eventDispatcher.dispatch('read');
  //self.buildSamples();
  //self.scanSegments();
}

// Read the file chunk by chunk until moov box is fully loaded.
// Resolves when mimeType and initSegment() are ready.
MP4Parser.prototype.loadInit = function () {
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
          console.log('moovBox', moovBox)
          self.timescales = self.getTimescales(moovBox);
          self.trackIdsInfo = self.getTrackInfo(moovBox);
          self.trackIdsInfo.videoTrackId = Object.keys(self.trackIdsInfo).find(id => self.trackIdsInfo[id] === 'video');
          self.trackIdsInfo.audioTrackId = Object.keys(self.trackIdsInfo).find(id => self.trackIdsInfo[id] === 'audio');
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

MP4Parser.prototype.getTimescales = function (moov) {
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

MP4Parser.prototype.getTrackInfo = function (moov) {
  const view = new DataView(moov.buffer, moov.byteOffset);
  const tracks = {};

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
        if (handlerType === 'vide') tracks[trackId] = 'video';
        else if (handlerType === 'soun') tracks[trackId] = 'audio';
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
MP4Parser.prototype._scanTopLevelBoxes = function (available) {
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

MP4Parser.prototype.readUint32 = function (buf, offset) {
  return (
    (buf[offset] << 24) |
    (buf[offset + 1] << 16) |
    (buf[offset + 2] << 8) |
    buf[offset + 3]
  ) >>> 0;
}

MP4Parser.prototype.readType = function (buf, offset) {
  return String.fromCharCode(
    buf[offset],
    buf[offset + 1],
    buf[offset + 2],
    buf[offset + 3]
  );
}
MP4Parser.prototype.parseBoxes = function (buf, start = 0, end = buf.length, depth = 0) {
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
      boxData: boxData
    };
    let referenceKey;
    if (result[type] != null) {
      let storedBox  = result[type];
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
      let childBoxes = MP4Parser.prototype.parseBoxes(buf, dataStart, dataEnd, depth + 1)
      if(referenceKey != null) {
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
MP4Parser.prototype.scanSegments = function () {
  var self = this;
  //if we hat enogh data, stop scanning new segments
  if (self.currentReadingOffset + self.CHUNK_SIZE <= self.endOffset) {
    return Promise.resolve(null);
  }
  var offset = self.endOffset != null ? self.endOffset : self.initSegmentEnd;
  if(self.currentReadingOffset > self.endOffset) {
    offset = self.currentReadingOffset;
  }
  var accumulated = new Uint8Array(0);
  var absoluteBase = offset; // byte offset in the file where accumulation starts

  return new Promise(function (resolve, reject) {
    function readNextChunk() {
      let moofSegments = [];
      //let flatMoofMdatPairs = [];
      var start = offset;
      var end = Math.min(start + self.CHUNK_SIZE, self.file.size);
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
            return await readNextChunk();
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
                  end = end + ((nextLocalOffset + nextSize) - accumulated.byteLength);
                  return await readNextChunk();
                  break; // box not fully loaded yet
                }
                var mdatAbsEnd = absoluteBase + nextLocalOffset + nextSize;
                moofSegment.followingMdatSegment = { 
                  start: absStart, 
                  end: mdatAbsEnd,
                  mdatBoxData: accumulated.slice(nextLocalOffset, nextLocalOffset + nextSize)
                 };
                moofSegments.push(moofSegment);

                const fragments = self._parseFragment(moofSegment.moofBoxData, moofSegment.start, self.timescales[self.trackIdsInfo.videoTrackId]);
                //console.log('fragments scanSegments', fragments[self.trackIdsInfo.videoTrackId])
                const moofMdatPair = new Uint8Array(moofSegment.moofBoxData.length + moofSegment.followingMdatSegment.mdatBoxData.length);
                moofMdatPair.set(moofSegment.moofBoxData, 0);
                moofMdatPair.set(moofSegment.followingMdatSegment.mdatBoxData, moofSegment.moofBoxData.length);
                if(!self.segmentToTimeMap.has(moofMdatPair)) {
                    self.segmentToTimeMap.set(moofMdatPair, moofSegment);
                    self.flatMoofMdatPairs.push({
                      data: moofMdatPair,
                      time: fragments[self.trackIdsInfo.videoTrackId].latestTime
                    });
                }
               
                localOffset = nextLocalOffset + nextSize;
                continue;
              }
            } else {
              //if moof+mdat pair is not fully loaded yet, fix end of accumulated so it contains entire these two segments
              end = end + ((localOffset + boxSize + 8) - accumulated.byteLength);
              return await readNextChunk();
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

// Read a specific byte range from the file — used to feed a segment into SourceBuffer.
MP4Parser.prototype.readSegment = function (start, end) {
  return this.file.slice(start, end).arrayBuffer();
};

/* MP4Parser.prototype.initSegment = function () {
  if (!this._initEnd) return null;
  return this.buf.slice(0, this._initEnd);
}; */

MP4Parser.prototype._extractMime = function (moovBox) {
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

MP4Parser.prototype.fourcc = function (offset) {
  return String.fromCharCode(
    this.view.getUint8(offset),
    this.view.getUint8(offset + 1),
    this.view.getUint8(offset + 2),
    this.view.getUint8(offset + 3)
  );
};


MP4Parser.prototype.readBoxSize = function (buf, offset) {
  const size =
    (buf[offset] << 24) |
    (buf[offset + 1] << 16) |
    (buf[offset + 2] << 8) |
    buf[offset + 3];

  return size >>> 0;
}

MP4Parser.prototype.readBoxType = function (buf, offset) {
  return String.fromCharCode(
    buf[offset],
    buf[offset + 1],
    buf[offset + 2],
    buf[offset + 3]
  );
}

MP4Parser.prototype.findBox = function findBox(buf, targetType) {
  let offset = 0;

  while (offset + 8 <= buf.length) {
    const size = MP4Parser.prototype.readBoxSize(buf, offset);
    const type = MP4Parser.prototype.readBoxType(buf, offset + 4);

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


MP4Parser.prototype.getStringFromBuffer = function (buffer, start, length) {
  return String.fromCharCode.apply(null, buffer.slice(start, start + length));
}

MP4Parser.prototype.findSampleAtTime = function (time, alignToKeyframe = false) {
  const samples = this.samples;

  if (!samples || samples.length === 0) {
    return null;
  }

  // --- Binary search ---
  let left = 0;
  let right = samples.length - 1;
  let resultIndex = 0;

  while (left <= right) {
    const mid = (left + right) >> 1;
    const s = samples[mid];

    if (s.time <= time) {
      resultIndex = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  // At this point:
  // samples[resultIndex].time <= time

  // --- Align to keyframe if needed ---
  if (alignToKeyframe) {
    let i = resultIndex;

    while (i > 0 && !samples[i].isKeyframe) {
      i--;
    }

    resultIndex = i;
  }

  return {
    index: resultIndex,
    ...samples[resultIndex]
  };
};
MP4Parser.prototype.fetch = function () {

}
MP4Parser.prototype.findNearestKeyframe = function () {

}

MP4Parser.prototype.readDataFromFile = async function () {
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
MP4Parser.prototype.buildSamples = async function () {
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

MP4Parser.prototype._parseSampleTables = function (trak) {
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

MP4Parser.prototype._buildSamplesFromFragment = function (
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

MP4Parser.prototype._parseTfdt = function (buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  const version = view.getUint8(8);

  if (version === 1) {
    const high = view.getUint32(12);
    const low = view.getUint32(16);
    return high * 2 ** 32 + low;
  } else {
    return view.getUint32(12);
  }
};
MP4Parser.prototype._parseTfhd = function (buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  const flags =
    (view.getUint8(9) << 16) |
    (view.getUint8(10) << 8) |
    view.getUint8(11);

  let offset = 12;

  const trackId = view.getUint32(offset);
  offset += 4;

  const result = {
    trackId,
    defaultSampleDuration: 0,
    defaultSampleSize: 0,
    defaultSampleFlags: 0
  };

  if (flags & 0x000008) {
    result.defaultSampleDuration = view.getUint32(offset);
    offset += 4;
  }

  if (flags & 0x000010) {
    result.defaultSampleSize = view.getUint32(offset);
    offset += 4;
  }

  if (flags & 0x000020) {
    result.defaultSampleFlags = view.getUint32(offset);
    offset += 4;
  }

  return result;
};
MP4Parser.prototype._parseTrun = function (buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  const flags =
    (view.getUint8(9) << 16) |
    (view.getUint8(10) << 8) |
    view.getUint8(11);

  const sampleCount = view.getUint32(12);

  let offset = 16;

  let dataOffset = 0;

  if (flags & 0x000001) {
    dataOffset = view.getInt32(offset);
    offset += 4;
  }

  const samples = [];

  for (let i = 0; i < sampleCount; i++) {
    const sample = {};

    if (flags & 0x000100) {
      sample.duration = view.getUint32(offset);
      offset += 4;
    }

    if (flags & 0x000200) {
      sample.size = view.getUint32(offset);
      offset += 4;
    }

    if (flags & 0x000400) {
      sample.flags = view.getUint32(offset);
      offset += 4;
    }

    if (flags & 0x000800) {
      sample.ctsOffset = view.getUint32(offset);
      offset += 4;
    }

    samples.push(sample);
  }

  return { dataOffset, samples };
};

MP4Parser.prototype._parseFragment = function (moof, moofOffset, timescale) {
  //const trafs = this._findBoxes(moof, 'traf');
  const parsed = this.parseBoxes(moof);
  const results = {};

  for (const traf of parsed.moof.traf) {
    //const tfhd = this.findBox(traf.boxData, 'tfhd');
    //const tfdt = this.findBox(traf.boxData, 'tfdt');
    //const trun = this.findBox(traf.boxData, 'trun');

    const tfhdData = this._parseTfhd(traf.tfhd.boxData);
    const baseTime = this._parseTfdt(traf.tfdt.boxData);
    const trunData = this._parseTrun(traf.trun.boxData);

    const samples = [];
    let latestTime;

    let time = baseTime;
    let offset = moofOffset + trunData.dataOffset;

    for (let i = 0; i < trunData.samples.length; i++) {
      const s = trunData.samples[i];

      const duration =
        s.duration ?? tfhdData.defaultSampleDuration;

      const size =
        s.size ?? tfhdData.defaultSampleSize;

      const flags =
        s.flags ?? tfhdData.defaultSampleFlags;

      const isKeyframe = !(flags & 0x10000);

      const sample = {
        time: time / timescale,
        duration: duration / timescale,
        offset,
        size,
        isKeyframe
      }

      latestTime = sample.time;
      samples.push(sample);

      time += duration;
      offset += size;
    }

    results[tfhdData.trackId] = {
      latestTime: latestTime,
      trackId: tfhdData.trackId,
      samples
    };
  }

  return results;
};


class LimitedMap {
  constructor(limit) {
    this.limit = limit;
    this.map = new Map();
  }

  set(key, value) {
    if (this.map.size >= this.limit) {
      const firstKey = this.map.keys().next().value; // oldest entry
      this.map.delete(firstKey);
    }
    this.map.set(key, value);
  }

  get(key) {
    return this.map.get(key);
  }
}