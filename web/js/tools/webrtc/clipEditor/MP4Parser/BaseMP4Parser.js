Q.Media.WebRTC.clipEditor.BaseMP4Parser = function (file, options) {
    
}

const BaseMP4Parser = Q.Media.WebRTC.clipEditor.BaseMP4Parser;


BaseMP4Parser.prototype.findBoxOffsetInFile = async function (boxType) {
    const self = this;
    const path = self.BOX_PATHS[boxType];

    if (!path) {
        throw new Error("Unknown box type path");
    }

    return await self.findBoxOffsetInRange(
        self.file,
        path,
        0,
        0,
        self.file.size
    );
}

BaseMP4Parser.prototype.readViewUint32 = function (view, offset = 0) {
    console.log('readViewUint32', view)
    return view.getUint32(offset);
}
BaseMP4Parser.prototype.readViewUint64 = function (bytes, offset = 0) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const hi = view.getUint32(offset);
    const lo = view.getUint32(offset + 4);
    return hi * 0x100000000 + lo;
}



BaseMP4Parser.prototype.findBoxOffsetInRange = async function (file, targetPath, pathIndex, start, end) {
    const self = this;
    let offset = start;

    while (offset < end) {
        // read minimum header
        const { view, bytes } = await self.readChunk(offset, 16);

        let size = self.readViewUint32(view, 0);
        const type = self.readViewUint32(view, 4);

        let headerSize = 8;

        // 64-bit size
        if (size === 1) {
            size = self.readViewUint64(bytes, 8);
            headerSize = 16;
        }

        // invalid guard
        console.log('findBoxOffsetInRange size', size, headerSize);
        if (size < headerSize) {
            throw new Error("Invalid MP4 box size");
        }

        const nextOffset = offset + size;

        // match current path step
        if (type === targetPath[pathIndex]) {
            // if final target
            if (pathIndex === targetPath.length - 1) {
                return { offset: offset, size: size, headerSize: headerSize };
            }

            // go deeper inside this box
            const result = await self.findBoxOffsetInRange(
                file,
                targetPath,
                pathIndex + 1,
                offset + headerSize,
                offset + size
            );

            if (result !== null) return result;
        }

        offset = nextOffset;
    }

    return null;
}


BaseMP4Parser.prototype.readChunk = async function (offset, length) {
    const buffer = await this.file.slice(offset, offset + length).arrayBuffer();
    return {
        buffer,
        view: new DataView(buffer),
        bytes: new Uint8Array(buffer)
    };
}
BaseMP4Parser.prototype.parseBoxes_old = function (buf, start = 0, end = buf.length, depth = 0) {
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
            let childBoxes = self.parseBoxes_old(buf, dataStart, dataEnd, depth + 1)
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

BaseMP4Parser.prototype.parseBoxes = function (view, start = 0, end = view.byteLength, depth = 0) {
    let self = this;
    console.log('parseBoxes START', view)
    if(view instanceof Uint8Array) {
        view = new DataView(view.buffer);
    }

    if (!self.fallback) {
        self.fallback = new Set();
    }
 
    const CONTAINERS = new Set([ //These boxes contain children:
        self.BOX.moov, 
            self.BOX.mvex, 
            self.BOX.trak, 
                self.BOX.edts,     
                self.BOX.mdia,
                    self.BOX.minf, 
                        self.BOX.dinf,
                        self.BOX.stbl,  
        self.BOX.moof,
            self.BOX.traf
    ]);
    const LEAF_BOXES = new Map( [//boxes that contain cnly payload (containers are commented by //)
        [self.BOX.ftyp, null], 
        //self.BOX.moov,
            [self.BOX.mvhd, null],
            //self.BOX.trak,
                [self.BOX.tkhd, 'parseTkhdBox'],
                //self.BOX.edts,     
                //self.BOX.mdia,
                    //self.BOX.minf, 
                        //self.BOX.dinf,
                        //self.BOX.stbl,  
                            [self.BOX.stts, 'parseSttsBox'],
                            [self.BOX.stss, 'parseStssBox'], //keyframes
                            [self.BOX.ctts, 'parseCttsBox'],
                            [self.BOX.stsc, 'parseStscBox'],
                            [self.BOX.stsz, 'parseStszBox'],
                            [self.BOX.stco, 'parseStcoBox'],
                            [self.BOX.co64, null],
            //self.BOX.mvex
                [self.BOX.trex, 'parseTrexBox'],
        //self.BOX.moof
            [self.BOX.mfhd, 'parseMfhdBox'],
            //self.BOX.traf,
                [self.BOX.tfhd, 'parseTfhdBox'],
                [self.BOX.tfdt, 'parseTfdtBox'],
                [self.BOX.trun, 'parseTrunBox'],
        /* self.BOX.mdat,  */
    ]);

    let result = {};

    let offset = start;
    function boxNameToUint32Hex(str) {
        return (
            "0x" +
            (
                (str.charCodeAt(0) << 24) |
                (str.charCodeAt(1) << 16) |
                (str.charCodeAt(2) << 8) |
                str.charCodeAt(3)
            )
                .toString(16)
                .padStart(8, "0")
                .toUpperCase()
        );
    }
    while (offset + 8 <= end) {

        //let size = self.readUint32(buf, offset);
        let size = self.readViewUint32(view, offset);
        let size2 = view.getUint32(offset, true);
        let size3 = view.getUint32(offset, false);
        const type = self.readViewUint32(view, offset + 4);
        let readableType = self.BOX_TYPE[type];
        const readableType2 = self.readBoxTypeFromDecimal(type);
        if (readableType === undefined) {
            readableType = self.readBoxTypeFromDecimal(type);
            self.fallback.add(readableType);
            console.log('box type readableType fallback', readableType, "level " + depth)
        }
        //const bytes = new Uint8Array(view.buffer, offset, );
        console.log('parseBoxes WHILE', offset)

        //const typetext = new TextDecoder().decode(bytes);
        console.log('box type check', self.BOX_TYPE[type], readableType2, "level " + depth)
        console.log('box type check hex', boxNameToUint32Hex(readableType2))

        console.log('box type box type', readableType)
        console.log('box size box size', size);

        let headerSize = 8;

        // handle 64-bit size
        if (size === 1) {
            const high = self.readUint32(view.buffer, offset + 8);
            const low = self.readUint32(view.buffer, offset + 12);
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

        let boxData = view.buffer.slice(offset, offset + size);
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
        if (result[readableType] != null) {
            let storedBox = result[readableType];
            if (!Array.isArray(result[readableType])) {
                result[readableType] = [storedBox];
                //console.log('result[type] init', storedBox)

            }
            //console.log('result[type] push', type, result[type][0], result[type][1], result[type][2], result[type][3], result[type][4])

            //console.log('result[type] push', currentBox, type)

            let length = result[readableType].push(currentBox);
            referenceKey = length - 1;
            //console.log('result[type] pushed', referenceKey, type)

        } else {
            result[readableType] = currentBox;
        }


        // 👇 KEY PART: recursion
        if (CONTAINERS.has(type)) {
            let childBoxes = self.parseBoxes(view, dataStart, dataEnd, depth + 1)
            if (referenceKey != null) {
                result[readableType][referenceKey] = Object.assign({}, result[readableType][referenceKey], childBoxes);
            } else {
                result[readableType] = Object.assign({}, currentBox, childBoxes);
            }

        } else if (LEAF_BOXES.has(type) && LEAF_BOXES.get(type) !== null) {
            console.log('parseBoxes parse leaf 1', readableType, LEAF_BOXES.get(type))
            let parsed = self[LEAF_BOXES.get(type)](view, offset);
            if (referenceKey != null) {
                result[readableType][referenceKey] = Object.assign({}, result[readableType][referenceKey], parsed);
            } else {
                result[readableType] = Object.assign({}, currentBox, parsed);
            }

            console.log('parseBoxes parse leaf 2', readableType)
            console.log('parseBoxes parsed box', parsed)
        }

        offset += size;
    }

    console.log('parseBoxes fallback', self.fallback)
    return result;
}

BaseMP4Parser.prototype._parseFragment = function (moof, moofOffset) {
    const self = this;
    //const trafs = this._findBoxes(moof, 'traf');
    const parsed = this.parseBoxes_old(moof);
    console.log('_parseFragment', parsed)
    const results = {};
    results.samples = {};
    results.childBoxes = parsed.moof;

    if(!Array.isArray(parsed.moof.traf)) {
        parsed.moof.traf = [parsed.moof.traf];
    }
    for (const traf of parsed.moof.traf) {
        //const tfhd = this.findBox(traf.boxData, 'tfhd');
        //const tfdt = this.findBox(traf.boxData, 'tfdt');
        //const trun = this.findBox(traf.boxData, 'trun');

        const tfhdData = this.parseTfhdBox_old(traf.tfhd._boxData);
        traf._trackId = tfhdData.trackId;

        const parsedTfdt = this.parseTfdtBox_old(traf.tfdt._boxData);
        traf.tfdt.version = parsedTfdt.version;
        const baseTime = traf.tfdt.baseMediaDecodeTime = parsedTfdt.baseMediaDecodeTime;
        
        const trunData = this.parseTrunBox_old(traf.trun._boxData);
        const trunData2 = this.parseTrunBox(new DataView(traf.trun._boxData.buffer));
        console.log('_parseFragment trunData', trunData)
        console.log('_parseFragment trunData2', trunData2)

        const samples = [];

        let time = baseTime;
        let offset = moofOffset + trunData.dataOffset;

        const timescale = self.timescales[tfhdData.trackId]

        let containsKeyframe = false;

        for (let i = 0; i < trunData.samples.length; i++) {
            const s = trunData.samples[i];

            const duration =
                s.duration ?? tfhdData.defaultSampleDuration;

            const size =
                s.size ?? tfhdData.defaultSampleSize;

            /* const flags =
              s.flags ?? tfhdData.defaultSampleFlags;
            const isKeyframe = !(flags & 0x10000); */
            //const flags = s.flags ?? tfhdData.defaultSampleFlags;

            let flags;

            if (i === 0 && trunData.firstSampleFlags != null) {
                flags = trunData.firstSampleFlags;
            } else {
                flags = s.flags ?? tfhdData.defaultSampleFlags;
            }

            const dependsOn = (flags >> 24) & 0x3;
            const isKeyframe = dependsOn === 2;

            if (!containsKeyframe) containsKeyframe = isKeyframe;

            const sample = {
                _startOffsetInTrun: s._startOffsetInTrun,
                timescale: timescale,
                rawTime: time,
                time: time / timescale,
                duration: duration / timescale,
                offset,
                dataOffset: trunData.dataOffset,
                size,
                isKeyframe
            }

            endTime = sample.time + sample.duration;
            samples.push(sample);

            /* if(tfhdData.trackId == self.trackIdsInfo.videoTrackId) {
              
              self.sampleToTimeMap.set(sample.time, sample)
            } */

            time += duration;
            offset += size;
        }

        const result = {
            trackId: tfhdData.trackId,
            containsKeyframe: containsKeyframe,
            samples
        };

        if (result.trackId == self.trackIdsInfo.videoTrackId) {
            const lastSample = samples[samples.length - 1];
            const firstSample = samples[0];
            result.endTime = lastSample.time + lastSample.duration;
            result.startTime = firstSample.time;
            result.endOffset = lastSample.offset;
        }

        results.samples[tfhdData.trackId] = result
    }

    return results;
};

BaseMP4Parser.prototype.parseMfhdBox = function (view, offset = 0) {
    const self = this;
    let pos = offset;

    // Skip box header
    pos += 8;

    // FullBox header
    const version = view.getUint8(pos); 
    
    pos += 1;
    const flags =
        (view.getUint8(pos) << 16) |
        (view.getUint8(pos + 1) << 8) |
        (view.getUint8(pos + 2));

    pos += 3;
    const sequenceNumber = view.getUint32(pos); pos += 4;

    return {
        version,
        flags,
        sequenceNumber
    };
}

BaseMP4Parser.prototype.parseTfhdBox = function (view, offset = 0) {
    const self = this;
    let pos = offset;

    // Skip box header
    pos += 8;

    // FullBox header
    const version = view.getUint8(pos); 
    
    pos += 1;
    const flags =
        (view.getUint8(pos) << 16) |
        (view.getUint8(pos + 1) << 8) |
        (view.getUint8(pos + 2));

    pos += 3;
    const trackId = view.getUint32(pos); 
    
    pos += 4;

    let baseDataOffset = null;
    let sampleDescriptionIndex = null;
    let defaultSampleDuration = null;
    let defaultSampleSize = null;
    let defaultSampleFlags = null;

    if (flags & 0x000001) {
        baseDataOffset = self.readUint64(view, pos);
        pos += 8;
    }

    if (flags & 0x000002) {
        sampleDescriptionIndex = view.getUint32(pos);
        pos += 4;
    }

    if (flags & 0x000008) {
        defaultSampleDuration = view.getUint32(pos);
        pos += 4;
    }

    if (flags & 0x000010) {
        defaultSampleSize = view.getUint32(pos);
        pos += 4;
    }

    if (flags & 0x000020) {
        defaultSampleFlags = view.getUint32(pos);
        pos += 4;
    }

    return {
        version,
        flags,
        trackId,
        baseDataOffset,
        sampleDescriptionIndex,
        defaultSampleDuration,
        defaultSampleSize,
        defaultSampleFlags
    };
}

BaseMP4Parser.prototype.parseTfdtBox = function (view, offset = 0) {
    const self = this;
    let pos = offset;

    // Skip box header
    pos += 8;

    // FullBox header
    const version = view.getUint8(pos); 
    
    pos += 1;
    const flags =
        (view.getUint8(pos) << 16) |
        (view.getUint8(pos + 1) << 8) |
        (view.getUint8(pos + 2));

    pos += 3;
    let baseMediaDecodeTime;

    if (version === 1) {
        baseMediaDecodeTime = self.readUint64(view, pos);
        pos += 8;
    } else {
        baseMediaDecodeTime = view.getUint32(pos);
        pos += 4;
    }

    return {
        version,
        flags,
        baseMediaDecodeTime
    };
}

BaseMP4Parser.prototype.parseTfdtBox_old = function (buf) {
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

    const version = view.getUint8(8);

    if (version === 1) {
        const high = view.getUint32(12);
        const low = view.getUint32(16);
        return {
            version: version,
            baseMediaDecodeTime: high * 2 ** 32 + low
        }
    } else {
        return {
            version: version,
            baseMediaDecodeTime: view.getUint32(12)
        }
    }
};
BaseMP4Parser.prototype.parseTfhdBox_old = function (buf) {
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
BaseMP4Parser.prototype.parseTrunBox_old = function (buf) {
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

    if (flags & 0x000004) {
        firstSampleFlags = view.getUint32(offset);
        offset += 4;
    }

    const samples = [];

    for (let i = 0; i < sampleCount; i++) {
        const sample = {};
        sample._startOffsetInTrun = offset;

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


    return {
        dataOffset,
        firstSampleFlags,
        samples
    };
};

BaseMP4Parser.prototype.parseTrunBox = function (view, offset = 0) {
    const self = this;
    console.log('parseTrunBox START', view, offset)
    let pos = offset;

    // Skip box header
    pos += 8;

    // FullBox header
    const version = view.getUint8(pos); 

    pos += 1;
    const flags =
        (view.getUint8(pos) << 16) |
        (view.getUint8(pos + 1) << 8) |
        (view.getUint8(pos + 2));

    pos += 3;
    const sampleCount = view.getUint32(pos);

    pos += 4;

    let dataOffset = null;
    let firstSampleFlags = null;

    if (flags & 0x000001) {
        dataOffset = view.getInt32(pos);
        pos += 4;
    }

    if (flags & 0x000004) {
        firstSampleFlags = view.getUint32(pos);
        pos += 4;
    }

    const samples = new Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
        let sampleDuration = null;
        let sampleSize = null;
        let sampleFlags = null;
        let sampleCompositionTimeOffset = null;

        if (flags & 0x000100) {
            sampleDuration = view.getUint32(pos);
            pos += 4;
        }

        if (flags & 0x000200) {
            sampleSize = view.getUint32(pos);
            pos += 4;
        }

        if (flags & 0x000400) {
            sampleFlags = view.getUint32(pos);
            pos += 4;
        }

        if (flags & 0x000800) {
            if (version === 0) {
                sampleCompositionTimeOffset = view.getUint32(pos);
            } else {
                sampleCompositionTimeOffset = view.getInt32(pos);
            }
            pos += 4;
        }

        samples[i] = {
            duration: sampleDuration,
            size: sampleSize,
            flags: sampleFlags,
            ctsOffset: sampleCompositionTimeOffset
        };
    }

    return {
        version,
        flags,
        sampleCount,
        dataOffset,
        firstSampleFlags,
        samples
    };
}

BaseMP4Parser.prototype.parseTfhdBox2 = function (view) {
    //const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

    let offset = 8;

    const flags =
        (view.getUint8(9) << 16) |
        (view.getUint8(10) << 8) |
        view.getUint8(11);

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
    console.log('parseTfhdBox result', result)
    return result;
};
BaseMP4Parser.prototype.parseTrunBox222 = function (view) {
    console.log('parseTrunBox view', view)

    //const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let offset = 16;

    const flags =
        (view.getUint8(9) << 16) |
        (view.getUint8(10) << 8) |
        view.getUint8(11);

    const sampleCount = view.getUint32(12);
    console.log('parseTrunBox sampleCount', sampleCount)

    let dataOffset = 0;

    if (flags & 0x000001) {
        dataOffset = view.getInt32(offset);
        offset += 4;
    }

    if (flags & 0x000004) {
        firstSampleFlags = view.getUint32(offset);
        offset += 4;
    }

    const samples = [];

    for (let i = 0; i < sampleCount; i++) {
        const sample = {};
        sample._startOffsetInTrun = offset;

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

    console.log('parseTrunBox result', dataOffset, firstSampleFlags, samples)

    return {
        dataOffset,
        firstSampleFlags,
        samples
    };
};
BaseMP4Parser.prototype._parseSdtp = function (bytes) {
    const result = [];

    for (let i = 4; i < bytes.length; i++) { // skip version/flags
        const b = bytes[i];
        const dependsOn = (b >> 4) & 0x3;

        result.push(dependsOn === 2);
    }

    return result;
}
BaseMP4Parser.prototype.parseMfra = function (bytes) {
    const self = this;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    let offset = 0;
    const result = { tfras: {} };

    while (offset + 8 <= bytes.length) {
        let size = view.getUint32(offset);
        const type = String.fromCharCode(
            bytes[offset + 4],
            bytes[offset + 5],
            bytes[offset + 6],
            bytes[offset + 7]
        );

        let headerSize = 8;

        if (size === 1) {
            size = self.readUint64(view, offset + 8);
            headerSize = 16;
        }

        if (type === 'mfra') {
            // 🔥 IMPORTANT: parse INSIDE mfra
            const innerStart = offset + headerSize;
            const innerEnd = offset + size;

            let innerOffset = innerStart;

            while (innerOffset + 8 <= innerEnd) {
                let innerSize = view.getUint32(innerOffset);
                const innerType = String.fromCharCode(
                    bytes[innerOffset + 4],
                    bytes[innerOffset + 5],
                    bytes[innerOffset + 6],
                    bytes[innerOffset + 7]
                );

                let innerHeader = 8;

                if (innerSize === 1) {
                    innerSize = self.readUint64(view, innerOffset + 8);
                    innerHeader = 16;
                }

                if (innerType === 'tfra') {
                    const tfra = this._parseTfra(bytes, innerOffset, innerSize);
                    //result.tfras.push(tfra);
                    result.tfras[tfra.trackId] = tfra;
                }

                innerOffset += innerSize;
            }
        }

        offset += size;
    }

    return result;
};

BaseMP4Parser.prototype._parseTfra = function (bytes, start, size) {
    const self = this;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    let offset = start + 8; // skip box header

    const version = view.getUint8(offset);
    offset += 1;

    const flags =
        (view.getUint8(offset) << 16) |
        (view.getUint8(offset + 1) << 8) |
        view.getUint8(offset + 2);
    offset += 3;

    const trackId = view.getUint32(offset);
    offset += 4;

    const tmp = view.getUint32(offset);
    offset += 4;

    const lengthSizeOfTrafNum = ((tmp >> 4) & 0x3) + 1;
    const lengthSizeOfTrunNum = ((tmp >> 2) & 0x3) + 1;
    const lengthSizeOfSampleNum = (tmp & 0x3) + 1;

    const entryCount = view.getUint32(offset);
    offset += 4;

    const entries = [];

    for (let i = 0; i < entryCount; i++) {
        let time, moofOffset;

        if (version === 1) {
            time = self.readUint64(view, offset);
            offset += 8;

            moofOffset = self.readUint64(view, offset);
            offset += 8;
        } else {
            time = view.getUint32(offset);
            offset += 4;

            moofOffset = view.getUint32(offset);
            offset += 4;
        }

        const trafNumber = this._readVariable(view, offset, lengthSizeOfTrafNum);
        offset += lengthSizeOfTrafNum;

        const trunNumber = this._readVariable(view, offset, lengthSizeOfTrunNum);
        offset += lengthSizeOfTrunNum;

        const sampleNumber = this._readVariable(view, offset, lengthSizeOfSampleNum);
        offset += lengthSizeOfSampleNum;

        entries.push({
            rawTime: time,
            time: time / self.timescales[trackId],
            moofOffset,
            trafNumber,
            trunNumber,
            sampleNumber
        });
    }

    return {
        trackId,
        entries
    };
};

BaseMP4Parser.prototype.parseStszBox = function (view, offset = 0) {
    let pos = offset;

    // Skip MP4 box header
    pos += 8;

    // FullBox header
    const version = view.getUint8(pos); pos += 1;

    const flags =
        (view.getUint8(pos) << 16) |
        (view.getUint8(pos + 1) << 8) |
        (view.getUint8(pos + 2));
    pos += 3;

    const sampleSize = view.getUint32(pos); pos += 4;
    const sampleCount = view.getUint32(pos); pos += 4;

    let entrySizes = null;

    if (sampleSize === 0) {
        // sizes are explicitly listed
        entrySizes = new Uint32Array(sampleCount);

        for (let i = 0; i < sampleCount; i++) {
            entrySizes[i] = view.getUint32(pos);
            pos += 4;
        }
    }

    return {
        version,
        flags,
        sampleSize,     // if != 0 → constant size for all samples
        sampleCount,
        entrySizes      // null if sampleSize != 0
    };
}

BaseMP4Parser.prototype.parseStssBox = function (view, offset = 0) {
    let pos = offset;

    // Skip MP4 box header
    pos += 8;

    // FullBox header
    const version = view.getUint8(pos); pos += 1;

    const flags =
        (view.getUint8(pos) << 16) |
        (view.getUint8(pos + 1) << 8) |
        (view.getUint8(pos + 2));
    pos += 3;

    const entryCount = view.getUint32(pos); pos += 4;

    console.log('entryCount', entryCount);

    //const sampleNumbers = new Uint32Array(entryCount);
    const sampleNumbers = new Set();
    for (let i = 0; i < entryCount; i++) {
        const sampleNumer = view.getUint32(pos);
        //sampleNumbers[i] = view.getUint32(sampleNumer - 1); 
        sampleNumbers.add(sampleNumer - 1); // convert to 0-based
        pos += 4;
    }

    return {
        version,
        flags,
        entryCount,
        sampleNumbers
    };
}

BaseMP4Parser.prototype.parseStscBox = function (view, offset = 0) {
    let pos = offset;

    // Skip MP4 box header
    pos += 8;

    // FullBox header
    const version = view.getUint8(pos); pos += 1;

    const flags =
        (view.getUint8(pos) << 16) |
        (view.getUint8(pos + 1) << 8) |
        (view.getUint8(pos + 2));
    pos += 3;

    const entryCount = view.getUint32(pos); pos += 4;

    const entries = new Array(entryCount);

    for (let i = 0; i < entryCount; i++) {
        const firstChunk = view.getUint32(pos); pos += 4;
        const samplesPerChunk = view.getUint32(pos); pos += 4;
        const sampleDescriptionIndex = view.getUint32(pos); pos += 4;

        entries[i] = {
            firstChunk,              // 1-based
            samplesPerChunk,
            sampleDescriptionIndex
        };
    }

    return {
        version,
        flags,
        entryCount,
        entries
    };
}

BaseMP4Parser.prototype.parseStcoBox = function (view, offset = 0) {
    let pos = offset;


    // Skip MP4 box header
    pos += 8;

    // FullBox header
    const version = view.getUint8(pos); pos += 1;

    const flags =
        (view.getUint8(pos) << 16) |
        (view.getUint8(pos + 1) << 8) |
        (view.getUint8(pos + 2));
    pos += 3;

    const entryCount = view.getUint32(pos); pos += 4;

    const chunkOffsets = new Uint32Array(entryCount);

    for (let i = 0; i < entryCount; i++) {
        chunkOffsets[i] = view.getUint32(pos);
        pos += 4;
    }

    return {
        version,
        flags,
        entryCount,
        chunkOffsets
    };
}

BaseMP4Parser.prototype.parseSttsBox = function (view, offset = 0) {
    let pos = offset;

    // Skip MP4 box header
    pos += 8;

    // FullBox header
    const version = view.getUint8(pos); pos += 1;

    const flags =
        (view.getUint8(pos) << 16) |
        (view.getUint8(pos + 1) << 8) |
        (view.getUint8(pos + 2));
    pos += 3;

    const entryCount = view.getUint32(pos); pos += 4;

    const entries = new Array(entryCount);

    for (let i = 0; i < entryCount; i++) {
        const sampleCount = view.getUint32(pos); pos += 4;
        const sampleDelta = view.getUint32(pos); pos += 4;

        entries[i] = {
            sampleCount,
            sampleDelta
        };
    }

    return {
        version,
        flags,
        entryCount,
        entries
    };
}

BaseMP4Parser.prototype.parseCttsBox = function (view, offset = 0) {
    let pos = offset;

    // Skip MP4 box header
    pos += 8;

    // FullBox header
    const version = view.getUint8(pos); pos += 1;

    const flags =
        (view.getUint8(pos) << 16) |
        (view.getUint8(pos + 1) << 8) |
        (view.getUint8(pos + 2));
    pos += 3;

    const entryCount = view.getUint32(pos); pos += 4;

    const entries = new Array(entryCount);

    for (let i = 0; i < entryCount; i++) {
        const sampleCount = view.getUint32(pos); pos += 4;

        let sampleOffset;
        if (version === 0) {
            sampleOffset = view.getUint32(pos);
        } else {
            sampleOffset = view.getInt32(pos);
        }
        pos += 4;

        entries[i] = {
            sampleCount,
            sampleOffset
        };
    }

    return {
        version,
        flags,
        entryCount,
        entries
    };
}

BaseMP4Parser.prototype.parseTkhdBox = function (view, offset = 0) {

    let pos = offset;


    // Skip MP4 box header
    pos += 8;


    const version = view.getUint8(pos); pos += 1;

    const flags =
        (view.getUint8(pos) << 16) |
        (view.getUint8(pos + 1) << 8) |
        (view.getUint8(pos + 2));
    pos += 3;

    let creationTime, modificationTime, trackId, duration;

    if (version === 1) {
        creationTime = self.readUint64(view, pos); pos += 8;
        modificationTime = self.readUint64(view, pos); pos += 8;
        trackId = view.getUint32(pos); pos += 4;
        pos += 4; // reserved
        duration = self.readUint64(view, pos); pos += 8;
    } else {
        creationTime = view.getUint32(pos); pos += 4;
        modificationTime = view.getUint32(pos); pos += 4;
        trackId = view.getUint32(pos); pos += 4;
        pos += 4; // reserved
        duration = view.getUint32(pos); pos += 4;
    }

    pos += 8; // reserved (2x uint32)

    const layer = view.getInt16(pos); pos += 2;
    const alternateGroup = view.getInt16(pos); pos += 2;
    const volume = view.getInt16(pos); pos += 2; // 8.8 fixed
    pos += 2; // reserved

    // matrix (9 x int32)
    const matrix = new Int32Array(9);
    for (let i = 0; i < 9; i++) {
        matrix[i] = view.getInt32(pos);
        pos += 4;
    }

    const width = view.getUint32(pos); pos += 4;
    const height = view.getUint32(pos); pos += 4;

    return {
        version,
        flags,
        creationTime,
        modificationTime,
        trackId,
        duration,
        layer,
        alternateGroup,
        volume: volume / 256, // convert 8.8 fixed → float
        matrix,
        width: width / 65536,   // 16.16 fixed
        height: height / 65536  // 16.16 fixed
    };
}

/**
 * Parses an MP4 `trex` (Track Extends Box).
 *
 * The function expects that:
 * - `view` already contains the raw bytes of the entire `trex` box
 * - including the 8-byte MP4 box header:
 *     size (4 bytes)
 *     type (4 bytes)
 *
 * Box structure:
 *
 * aligned(8) class TrackExtendsBox extends FullBox('trex', 0, 0) {
 *     unsigned int(32) track_ID;
 *     unsigned int(32) default_sample_description_index;
 *     unsigned int(32) default_sample_duration;
 *     unsigned int(32) default_sample_size;
 *     unsigned int(32) default_sample_flags;
 * }
 *
 * @param {DataView} view
 * A DataView containing the raw bytes of the entire `trex` box.
 *
 * @param {number} [offset=0]
 * Byte offset inside the DataView where the `trex` box begins.
 *
 * @returns {Object}
 * Parsed `trex` box fields.
 */
BaseMP4Parser.prototype.parseTrexBox = function (view, offset = 0) {

    let pos = offset;

    // --------------------------------------------------
    // MP4 box header
    // --------------------------------------------------

    // Total size of the box in bytes
    const size = view.getUint32(pos);
    pos += 4;

    // Box type ('trex')
    const type = String.fromCharCode(
        view.getUint8(pos),
        view.getUint8(pos + 1),
        view.getUint8(pos + 2),
        view.getUint8(pos + 3)
    );
    pos += 4;

    // --------------------------------------------------
    // FullBox header
    // --------------------------------------------------

    // Version (usually 0)
    const version = view.getUint8(pos);
    pos += 1;

    // Flags (24-bit integer)
    const flags =
        (view.getUint8(pos) << 16) |
        (view.getUint8(pos + 1) << 8) |
        (view.getUint8(pos + 2));
    pos += 3;

    // --------------------------------------------------
    // trex fields
    // --------------------------------------------------

    // Track ID this trex applies to
    const trackId = view.getUint32(pos);
    pos += 4;

    // Default sample description index
    const defaultSampleDescriptionIndex = view.getUint32(pos);
    pos += 4;

    // Default sample duration
    const defaultSampleDuration = view.getUint32(pos);
    pos += 4;

    // Default sample size
    const defaultSampleSize = view.getUint32(pos);
    pos += 4;

    // Default sample flags
    const defaultSampleFlags = view.getUint32(pos);
    pos += 4;

    return {
        size,
        type,
        version,
        flags,

        trackId,
        defaultSampleDescriptionIndex,
        defaultSampleDuration,
        defaultSampleSize,
        defaultSampleFlags
    };
}


BaseMP4Parser.prototype.fourcc = function (offset) {
    return String.fromCharCode(
        this.view.getUint8(offset),
        this.view.getUint8(offset + 1),
        this.view.getUint8(offset + 2),
        this.view.getUint8(offset + 3)
    );
};


BaseMP4Parser.prototype.readBoxSize = function (buf, offset) {
    const size =
        (buf[offset] << 24) |
        (buf[offset + 1] << 16) |
        (buf[offset + 2] << 8) |
        buf[offset + 3];

    return size >>> 0;
}

BaseMP4Parser.prototype.readBoxType = function (buf, offset) {
    return String.fromCharCode(
        buf[offset],
        buf[offset + 1],
        buf[offset + 2],
        buf[offset + 3]
    );
}

BaseMP4Parser.prototype.readBoxTypeFromDecimal = function (num) {
    return String.fromCharCode(
        (num >> 24) & 0xFF,
        (num >> 16) & 0xFF,
        (num >> 8) & 0xFF,
        num & 0xFF
    );
}


BaseMP4Parser.prototype.readUint32 = function (buf, offset) {
    return (
        (buf[offset] << 24) |
        (buf[offset + 1] << 16) |
        (buf[offset + 2] << 8) |
        buf[offset + 3]
    ) >>> 0;
}

BaseMP4Parser.prototype.readUint64 = function (view, offset) {
    const hi = view.getUint32(offset);
    const lo = view.getUint32(offset + 4);
    return hi * 0x100000000 + lo;
}