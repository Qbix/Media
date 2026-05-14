Q.Media.WebRTC.clipEditor.ClipEditor = function () {
    const thisInstance = this;
    let _file;

    thisInstance.icons = {
        playIcon: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="44px" height="50px" viewBox="-0.53 0 44 50" enable-background="new -0.53 0 44 50" xml:space="preserve"> <defs> </defs> <polygon points="0,0 43.143,24.91 0,49.82 "/> </svg>',
        pauseIcon: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="44px" height="51px" viewBox="-0.53 -0.91 44 51" enable-background="new -0.53 -0.91 44 51" xml:space="preserve"> <defs> </defs> <rect width="16.173" height="50"/> <rect x="26.97" y="0.09" width="16.173" height="50"/> </svg>',
        disabledEnabledSpeaker: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="25px" height="24px" viewBox="0 0 25 24" enable-background="new 0 0 25 24" xml:space="preserve"> <path d="M9.302,19.907c0.061,0.034,0.078,0.159,0.147,0.17c0.024,0.004,0.059,0.005,0.084,0.001 c0.025-0.001,0.063-0.006,0.088-0.016c0.048-0.021,0.115-0.049,0.15-0.088c0.018-0.02,0.075-0.043,0.088-0.064 c0.034-0.063,0.122-0.083,0.122-0.151H9.979v-4.622l-2.738,3.178L9.302,19.907z"/> <polygon class="MediaWebRTCDisabledparts" points="5.986,17.345 7.241,18.314 9.979,15.137 9.979,12.707 "/> <path d="M9.979,3.246c0-0.026-0.087-0.053-0.092-0.079C9.875,3.116,9.765,3.068,9.729,3.029C9.711,3.01,9.69,2.992,9.669,2.977 C9.647,2.962,9.622,2.951,9.599,2.94c-0.025-0.006-0.05-0.016-0.077-0.022c-0.07,0.003-0.091-0.011-0.156,0.017 c-0.023,0.01-0.045,0.011-0.067,0.024L4.591,6.464H0.603c-0.028,0-0.064,0.033-0.09,0.04c-0.054,0.015-0.11,0.073-0.15,0.113 C0.343,6.638,0.312,6.66,0.299,6.683C0.285,6.708,0.248,6.734,0.241,6.761C0.234,6.788,0.179,6.817,0.179,6.845v9.317 c0,0.029,0.055,0.044,0.062,0.07c0.007,0.026,0.069,0.039,0.083,0.063c0.029,0.05,0.068,0.063,0.118,0.09 c0.024,0.015,0.05-0.03,0.077-0.021c0.028,0.004,0.056-0.1,0.084-0.1H4.59l1.396,1.079l3.993-4.638V3.246z"/> <g id="MediaWebRTCWaves"> <path class="MediaWebRTCWaves1" d="M14.483,7.478c-0.949-2.085-2.251-3.412-2.282-3.443c-0.184-0.182-0.479-0.181-0.66,0.002 c-0.182,0.183-0.182,0.478,0.004,0.66c0.121,0.121,1.444,1.467,2.297,3.525l0.35-0.406L14.483,7.478z"/> <path class="MediaWebRTCWaves1" d="M14.394,10.011c0.475,2.369,0.058,5.299-2.856,8.301c-0.178,0.185-0.174,0.48,0.01,0.662 c0.09,0.086,0.207,0.129,0.324,0.129c0.123,0,0.246-0.045,0.336-0.138c3.443-3.549,3.648-7.058,2.899-9.783l-0.063,0.074 L14.394,10.011z"/> <path class="MediaWebRTCWaves2" d="M16.937,4.629c-0.997-1.646-1.97-2.637-2.001-2.667c-0.182-0.181-0.477-0.181-0.658,0.003 c-0.185,0.183-0.185,0.478,0.004,0.66c0.116,0.117,1.094,1.115,2.045,2.714l0.392-0.455L16.937,4.629z"/> <path class="MediaWebRTCWaves2" d="M17.113,6.853c1.516,3.375,2.169,8.372-2.842,13.536c-0.178,0.182-0.174,0.479,0.012,0.659 c0.09,0.086,0.207,0.132,0.324,0.132c0.121,0,0.242-0.048,0.336-0.144c5.503-5.673,4.534-11.267,2.8-14.915l-0.028,0.033 L17.113,6.853z"/> <path class="MediaWebRTCWaves1 MediaWebRTCDisabledparts" d="M14.191,7.815l-0.35,0.406c0.228,0.55,0.423,1.148,0.552,1.79l0.649-0.754l0.063-0.074 c-0.168-0.612-0.385-1.182-0.623-1.706L14.191,7.815z"/> <path class="MediaWebRTCDisabledparts MediaWebRTCWaves2" d="M16.718,4.884l-0.392,0.455c0.272,0.457,0.54,0.964,0.787,1.514l0.602-0.698l0.028-0.033 c-0.258-0.543-0.533-1.042-0.807-1.492L16.718,4.884z"/> </g> <polygon id="MediaWebRTCCrossline" points="20.305,1.034 19.104,0 0.179,21.971 1.38,23.006 "/> </svg>',
        upload: '<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M18.5 20L18.5 14M18.5 14L21 16.5M18.5 14L16 16.5" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/> <path d="M12 19H5C3.89543 19 3 18.1046 3 17V7C3 5.89543 3.89543 5 5 5H9.58579C9.851 5 10.1054 5.10536 10.2929 5.29289L12 7H19C20.1046 7 21 7.89543 21 9V11" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/> </svg>',
        ai: '<svg width="800px" height="800px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="#000000" class="bi bi-stars"> <path d="M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.829 1.828l1.936.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.829l-.645 1.936a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937-.645a2.89 2.89 0 0 0 1.828-1.828l.645-1.937zM3.794 1.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387A1.734 1.734 0 0 0 4.593 5.69l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.69A1.734 1.734 0 0 0 2.31 4.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.734 1.734 0 0 0 3.407 2.31l.387-1.162zM10.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732L9.1 2.137a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732L10.863.1z"/> </svg>',
        download: '<svg id="fi_7268609" enable-background="new 0 0 515.283 515.283" height="512" viewBox="0 0 515.283 515.283" width="512" xmlns="http://www.w3.org/2000/svg"><g><g><g><g><path d="m400.775 515.283h-286.268c-30.584 0-59.339-11.911-80.968-33.54-21.628-21.626-33.539-50.382-33.539-80.968v-28.628c0-15.811 12.816-28.628 28.627-28.628s28.627 12.817 28.627 28.628v28.628c0 15.293 5.956 29.67 16.768 40.483 10.815 10.814 25.192 16.771 40.485 16.771h286.268c15.292 0 29.669-5.957 40.483-16.771 10.814-10.815 16.771-25.192 16.771-40.483v-28.628c0-15.811 12.816-28.628 28.626-28.628s28.628 12.817 28.628 28.628v28.628c0 30.584-11.911 59.338-33.54 80.968-21.629 21.629-50.384 33.54-80.968 33.54zm-143.134-114.509c-3.96 0-7.73-.804-11.16-2.257-3.2-1.352-6.207-3.316-8.838-5.885-.001-.001-.001-.002-.002-.002-.019-.018-.038-.037-.057-.056-.005-.004-.011-.011-.016-.016-.016-.014-.03-.029-.045-.044-.01-.01-.019-.018-.029-.029-.01-.01-.023-.023-.032-.031-.02-.02-.042-.042-.062-.062l-114.508-114.509c-11.179-11.179-11.179-29.305 0-40.485 11.179-11.179 29.306-11.18 40.485 0l65.638 65.638v-274.409c-.001-15.811 12.815-28.627 28.626-28.627s28.628 12.816 28.628 28.627v274.408l65.637-65.637c11.178-11.179 29.307-11.179 40.485 0 11.179 11.179 11.179 29.306 0 40.485l-114.508 114.507c-.02.02-.042.042-.062.062-.011.01-.023.023-.032.031-.01.011-.019.019-.029.029-.014.016-.03.03-.044.044-.005.005-.012.012-.017.016-.018.019-.037.038-.056.056-.001 0-.001.001-.002.002-.315.307-.634.605-.96.895-2.397 2.138-5.067 3.805-7.89 4.995-.01.004-.018.008-.028.012-.011.004-.02.01-.031.013-3.412 1.437-7.158 2.229-11.091 2.229z" fill="rgb(0,0,0)"></path></g></g></g></g></svg>',
    }

    this.startClipInput;
    this.endClipInput;
    this.pendingClipRangeUpdate = false;
    this.clipSegments = [];

    this.player = new Q.Media.WebRTC.clipEditor.MediaPlayer();
    const timelineSize = {
        width: null
    }
    const clipTimeRange = {
        startTimeOffset: null,
        endTimeOffset: null,
        duration: null
    };

    const container = this.element = document.createElement('DIV');
    container.className = 'clip-editor';

    const containerMain = document.createElement('DIV');
    containerMain.className = 'clip-editor-main';
    container.appendChild(containerMain)

    const containerClips = document.createElement('DIV');
    containerClips.className = 'clip-editor-clips';
    container.appendChild(containerClips)
    const containerClipsList = document.createElement('DIV');
    containerClipsList.className = 'clip-editor-clips-list';
    containerClips.appendChild(containerClipsList)
    const clipsAnalyseStatus = document.createElement('DIV');
    clipsAnalyseStatus.className = 'clip-editor-clips-status';
    containerClips.appendChild(clipsAnalyseStatus);
    updateClipsUI('summerized');

    const editorTitle = document.createElement('DIV');
    editorTitle.className = 'clip-editor-title';



    const filePickerContainer = document.createElement('DIV');
    filePickerContainer.className = 'clip-editor-player-picker';
    containerMain.appendChild(filePickerContainer);

    filePickerContainer.appendChild(buildFilePicker());

    /* const filePicker = document.createElement('INPUT');
    filePickerContainer.appendChild(filePicker);
    filePicker.type = 'file';

    filePicker.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        await thisInstance.player.openFile(file);
        loadClipControls();
        setClipBounds(100, 200);
    }); */


    const editor = document.createElement('DIV');
    editor.className = 'clip-editor-editor clip-editor-hidden';
    containerMain.appendChild(editor)

    const editorPlayer = document.createElement('DIV');
    editorPlayer.className = 'clip-editor-player';
    editor.appendChild(editorPlayer);

    const editorPlayerView = document.createElement('DIV');
    editorPlayerView.className = 'clip-editor-player-view';
    editorPlayer.appendChild(editorPlayerView);

    console.log('this.player', this.player)
    editorPlayerView.appendChild(this.player.element);


    const editArea = document.createElement('DIV');
    editArea.className = 'clip-editor-edit-area';
    editor.appendChild(editArea);

    const clipControls = document.createElement('DIV');
    clipControls.className = 'clip-editor-controls';
    editArea.appendChild(clipControls);

    const generatedClips = document.createElement('DIV');
    generatedClips.className = 'clip-editor-result-clips';
    editArea.appendChild(generatedClips);

    const clipTitle = document.createElement('DIV');
    clipTitle.className = 'clip-editor-clip-title';
    editArea.appendChild(clipTitle);

    updateUI('fileNotSelected');

    function onFileOpen() {
        const file = e.target.files[0];
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function parseTime(timeStr) {
        const [mins, secs] = timeStr.split(':').map(Number);
        return mins * 60 + secs;
    }

    function getPageTime() {
        return performance.now() / 1000;
    }

    function updateUI(state) {
        if (state == 'fileNotSelected') {
            editor.classList.add('clip-editor-hidden');
            filePickerContainer.classList.remove('clip-editor-hidden');
        } else if (state == 'fileSelected') {
            editor.classList.remove('clip-editor-hidden');
            filePickerContainer.classList.add('clip-editor-hidden');
        }
    }

    function addGeneratedClip(fileBlob) {
        let fileItem = document.createElement('DIV');
        fileItem.className = 'clip-editor-clip-item';
        generatedClips.appendChild(fileItem);
        let fileItemTitle = document.createElement('DIV');
        fileItemTitle.className = 'clip-editor-clip-title';
        fileItemTitle.innerHTML = 'Text';
        fileItem.appendChild(fileItemTitle);
        let fileItemShare = document.createElement('DIV');
        fileItemShare.className = 'clip-editor-clip-share';
        fileItemShare.innerHTML = 'Share';
        fileItem.appendChild(fileItemShare);
        fileItemShare.addEventListener('click', function () {
            shareMp4(fileBlob);
        });

        /* const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;

        document.body.appendChild(a); */
    }

    async function shareMp4(blob) {
        // Make sure browser supports file sharing
        if (!navigator.canShare || !navigator.share) {
            console.error("Web Share API not supported");
            return;
        }

        const file = new File(
            [blob],
            "video.mp4",
            { type: "video/mp4" }
        );

        console.log('shareMp4 START', blob, file);
        console.log(navigator.canShare?.({ files: [file] })); // should be true
        // Check whether files can be shared
        /*  if (!navigator.canShare({ files: [file] })) {
             console.error("Sharing files is not supported");
             return;
         } */

        try {
            await navigator.share({
                title: "My Video",
                text: "Check out this video",
                files: [file]
            });

            console.log("Shared successfully");
        } catch (err) {
            console.error("Share cancelled or failed:", err);
        }
    }

    async function extractAudioFromVideo(videoFile) {
    const arrayBuffer = await videoFile.arrayBuffer();
    const audioCtx = new AudioContext();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    // Optional: close context to save memory
    await audioCtx.close(); 
    return audioBuffer;
}

async function encodeAudioBufferToAAC(audioBuffer) {
    const chunks = [];

   
const encoder = new AudioEncoder({
    output: (chunk) => {
        // 1. Create the 7-byte header
        const header = new Uint8Array(7);
        const adtsHeader = createADTSHeader(
            audioBuffer.sampleRate, 
            audioBuffer.numberOfChannels, 
            chunk.byteLength
        );
        
        // 2. Combine Header + AAC Data
        const body = new Uint8Array(chunk.byteLength);
        chunk.copyTo(body);
        
        const combined = new Uint8Array(7 + chunk.byteLength);
        combined.set(adtsHeader);
        combined.set(body, 7);
        
        chunks.push(combined);
    },
    error: (e) => console.error(e),
});
    // FIX 1: Complete the codec string (40.2 is AAC-LC)
    const config = {
        codec: 'mp4a.40.2', 
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        bitrate: 128000,
    };

    // Verify support before configuring
    const isSupported = await AudioEncoder.isConfigSupported(config);
    if (!isSupported.supported) {
        throw new Error("AAC encoding not supported on this browser/configuration.");
    }

    await encoder.configure(config);

    const blockSize = 2048;
    for (let i = 0; i < audioBuffer.length; i += blockSize) {
        const count = Math.min(blockSize, audioBuffer.length - i);

        // FIX 2: Ensure the data is sliced and packed correctly for 'f32-planar'
        const data = new AudioData({
            format: 'f32-planar',
            sampleRate: audioBuffer.sampleRate,
            numberOfFrames: count,
            numberOfChannels: audioBuffer.numberOfChannels,
            timestamp: (i / audioBuffer.sampleRate) * 1_000_000,
            data: getBufferSlice(audioBuffer, i, count)
        });

        encoder.encode(data);
        data.close(); 
    }

    await encoder.flush();
    encoder.close();

    return new Blob(chunks, { type: 'audio/aac' }); // Changed type to aac for raw stream
}

function createADTSHeader(sampleRate, channels, frameLength) {
    const samplingFrequencies = [
        96000, 88200, 64000, 48000, 44100, 32000, 
        24000, 22050, 16000, 12000, 11025, 8000, 7350
    ];
    
    const freqIdx = samplingFrequencies.indexOf(sampleRate);
    const adts = new Uint8Array(7);
    const totalLength = frameLength + 7;

    adts[0] = 0xFF; // Syncword (all 1s)
    adts[1] = 0xF1; // Layer 0, no CRC
    adts[2] = ((1 /* profile AAC-LC */ << 6) + (freqIdx << 2) + (channels >> 2));
    adts[3] = (((channels & 3) << 6) + (totalLength >> 11));
    adts[4] = ((totalLength & 0x7FF) >> 3);
    adts[5] = (((totalLength & 7) << 5) + 0x1F);
    adts[6] = 0xFC;

    return adts;
}

// FIX 3: Robust slicing logic
function getBufferSlice(buffer, offset, count) {
    const numChannels = buffer.numberOfChannels;
    // We create an array that holds all channel planes back-to-back
    const output = new Float32Array(count * numChannels);
    
    for (let ch = 0; ch < numChannels; ch++) {
        const channelData = buffer.getChannelData(ch);
        const slice = channelData.subarray(offset, offset + count);
        // Each channel starts at (channelIndex * count)
        output.set(slice, ch * count);
    }
    return output;
}

    function audioBufferToWav(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const length = buffer.length * numChannels * 2 + 44;
        const arrayBuffer = new ArrayBuffer(length);
        const view = new DataView(arrayBuffer);

        // WAV header
        const writeString = (offset, str) => {
            for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        };
        writeString(0, 'RIFF');
        view.setUint32(4, length - 8, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * 2, true);
        view.setUint16(32, numChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length - 44, true);

        // Interleave and convert to 16-bit PCM
        let offset = 44;
        const channels = [];
        for (let i = 0; i < numChannels; i++) channels.push(buffer.getChannelData(i));
        for (let i = 0; i < buffer.length; i++) {
            for (let c = 0; c < numChannels; c++) {
                const sample = Math.max(-1, Math.min(1, channels[c][i]));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    function buildFilePicker() {
        // Create drop area
        const dropZone = document.createElement('div');
        dropZone.className = 'clip-editor-drop-zone';
        dropZone.textContent = 'Drag & Drop a file here or Click to Select';

        const dropZoneIcon = document.createElement('div');
        dropZone.className = 'clip-editor-drop-zone';
        dropZone.innerHTML = thisInstance.icons.upload;


        // Hidden file input
        const input = document.createElement('input');
        input.type = 'file';
        input.hidden = true;
        document.body.appendChild(input);


        // File handler
        async function handleFiles(files) {
            if (!files.length) return;

            const file = files[0];
            thisInstance.file = file;
            dropZone.textContent = `Selected: ${file.name}`;
            await thisInstance.player.openFile(file);
            updateUI('fileSelected');
            loadClipControls();
            setClipBounds(100, 200);
        }


        // Open picker on click
        dropZone.addEventListener('click', () => {
            input.click();
        });

        input.addEventListener('change', () => {
            handleFiles(input.files);
        });


        // Prevent default drag behavior
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
            });
        });


        // Visual drag state
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('clip-editor-dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('clip-editor-dragover');
            });
        });


        // Drop handling
        dropZone.addEventListener('drop', e => {
            handleFiles(e.dataTransfer.files);
        });

        return dropZone;
    }

    function buildTimeline() {
        const currentTime = document.createElement('DIV');
        currentTime.className = 'clip-editor-time';
        editArea.appendChild(currentTime);

        const editorTimeline = document.createElement('DIV');
        editorTimeline.className = 'clip-editor-timeline';
        editArea.appendChild(editorTimeline);

        const clipBounds = thisInstance.clipBoundsElement = document.createElement('DIV');
        clipBounds.className = 'clip-editor-timeline-clip';
        editorTimeline.appendChild(clipBounds);

        const timeHandle = document.createElement('DIV');
        timeHandle.className = 'clip-editor-timeline-clip-handle';
        clipBounds.appendChild(timeHandle);

        thisInstance.player.on('initFragmetAppend', function () {
            console.log(getPageTime(), 'initFragmetAppend', thisInstance.pendingClipRangeUpdate)
            thisInstance.pendingClipRangeUpdate = false;
        })

        thisInstance.player.on('timeupdate', function (e) {
            updateHandlePosition(e.currentTime)
        })

        const myObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                console.log('time resize', entry.borderBoxSize[0].inlineSize)
                timelineSize.width = entry.borderBoxSize[0].inlineSize;
            }
            setClipBounds();
        });

        myObserver.observe(editorTimeline);

        //let totalDuration = thisInstance.player.parser.totalDuration;

        //timeHandle.addEventListener('');
        Q.activate(
            Q.Tool.setUpElement(
                clipBounds,
                "Q/resize",
                {
                    snapping: false,
                    move: true,
                    resize: true,
                    active: true,
                    resizeByWheel: false,
                    //elementPosition: 'fixed',
                    showResizeHandles: false,
                    moveWithinArea: 'parent',
                    allowOverresizing: true,
                    negativeMoving: false,
                    keepRatio: false,
                    dragThreeshold: 0,
                    minimalSize: 40,
                    handles: {
                        topleft: { show: false },
                        topright: { show: false },
                        bottomleft: { show: false },
                        bottomright: { show: false },
                        middletop: { show: false },
                        middlebottom: { show: false },
                        middleleft: {
                            height: 46,
                            width: 10,
                            left: function () { return '-' + (this.width()) + 'px'; },
                            bottom: function () { return 'calc(50% - ' + this.height() / 2 + 'px)'; }
                        },
                        middleright: {
                            height: 46,
                            width: 10,
                            right: function () { return '-' + (this.width()) + 'px'; },
                            bottom: function () { return 'calc(50% - ' + this.height() / 2 + 'px)'; }
                        }
                    },
                    onMoving: function () {

                    }
                }
            ),
            {},
            function () {
                let clipRangeResizeTool = this;
                clipRangeResizeTool.events.on('moving', onClipStartChange);
                clipRangeResizeTool.events.on('resizing', onClipWidthChange);
            }
        );

        Q.activate(
            Q.Tool.setUpElement(
                timeHandle,
                "Q/resize",
                {
                    snapping: false,
                    move: true,
                    resize: false,
                    active: true,
                    resizeByWheel: false,
                    //elementPosition: 'fixed',
                    showResizeHandles: false,
                    moveWithinArea: 'parent',
                    allowOverresizing: true,
                    negativeMoving: false,
                    keepRatio: false,
                    dragThreeshold: 0,
                    stopPropagation: true,
                    /* minimalSize: 40, */
                    handles: {
                        topleft: { show: false },
                        topright: { show: false },
                        bottomleft: { show: false },
                        bottomright: { show: false },
                        middletop: { show: false },
                        middlebottom: { show: false },
                        middleleft: { show: false },
                        middleright: { show: false },
                    },
                    onMoving: function () {

                    }
                }
            ),
            {},
            function () {
                this.events.on('moving', function () {
                    let handleRect = timeHandle.getBoundingClientRect();
                    let timelineRect = editorTimeline.getBoundingClientRect();
                    let offsetPercent = (handleRect.x - timelineRect.x) / timelineSize.width * 100;
                    let timeOffset = thisInstance.player.parser.totalDuration / 100 * offsetPercent;
                    setTime(timeOffset);
                });
            }
        );

        thisInstance.setTimeDebouncer = Q.debounce(async function (timeToSet) {
            await thisInstance.player.setTime(timeToSet);
        }, 500);

        function updateClipElementBounds(size) {
            let clipBoundsRect = size ? size : clipBounds.getBoundingClientRect();
            let timelineRect = editorTimeline.getBoundingClientRect();
            let clipStartPx = size && size.x != null ? size.x : clipBoundsRect.x;
            let offsetPercent = clipStartPx / timelineRect.width * 100;
            let timeToSet = thisInstance.player.parser.totalDuration / 100 * offsetPercent;
            let clipEnd = timeToSet + clipDuration;

            let clipDuration = thisInstance.player.parser.totalDuration / 100 * (clipBoundsRect.width / timelineRect.width * 100);

            clipTimeRange = {
                startTime: timeToSet,
                endTime: clipEnd,
                startTimeFormatted: formatTime(timeToSet),
                endTimeFormatted: formatTime(clipEnd),
                duration: clipDuration,
            }

            return clipBounds
        }

        function onClipWidthChange(e) {
            //updateClipElementBounds(e);
            console.log('onClipWidthChange START', e)

            let startTime = clipTimeRange.startTime;
            if (e.x != null) {
                let startOffsetPercent = e.x / timelineSize.width * 100;
                startTime = thisInstance.player.parser.totalDuration / 100 * startOffsetPercent;
            }

            let durationPercent = e.width / timelineSize.width * 100;
            let durationSeconds = thisInstance.player.parser.totalDuration / 100 * durationPercent;

            //if clip bound were changed by resizing by right side then we should not paass new startTime as x ws not changed
            setClipBounds(e.x != null ? startTime : null, startTime + durationSeconds);
            if (e.x != null) updateHandlePosition(startTime);
        }
        function onClipStartChange(e) {
            let offsetPercent = e.x / timelineSize.width * 100;
            let timeToSet = thisInstance.player.parser.totalDuration / 100 * offsetPercent;

            setClipBounds(timeToSet);
            updateHandlePosition(timeToSet);
        }

        function updateHandlePosition(currentTime) {
            if (thisInstance.pendingClipRangeUpdate) {
                return;
            }
            console.log(getPageTime(), 'updateHandlePosition START', currentTime, thisInstance.player.currentTime, thisInstance.player?.fetchSession?.startKeyframe?.time, thisInstance.player?.fetchSession?.pendingTimeToSet)
            let localTimeOffset = currentTime - clipTimeRange.startTime;
            let clipStartOffsetPercent = clipTimeRange.startTime / thisInstance.player.parser.totalDuration * 100;
            let timeOffsetPercent = currentTime / thisInstance.player.parser.totalDuration * 100;
            let localTimeOffsetPercent = localTimeOffset / clipTimeRange.duration * 100;
            let currentTimeOffsetPx = timelineSize.width / 100 * timeOffsetPercent;
            let clipStartPx = timelineSize.width / 100 * clipStartOffsetPercent;
            let localTimeOffsetPx = (currentTimeOffsetPx - clipStartPx);

            timeHandle.style.left = localTimeOffsetPx + 'px';
        }

        return editorTimeline;
    }

    function buildTimelineControls() {
        const editorTimelineControls = document.createElement('DIV');
        editorTimelineControls.className = 'clip-editor-timeline-controls';
        //editArea.appendChild(editorTimelineControls);

        const timelineButtons = document.createElement('DIV');
        timelineButtons.className = 'clip-editor-timeline-buttons';
        editorTimelineControls.appendChild(timelineButtons);

        const playerVolume = document.createElement('DIV');
        playerVolume.className = 'clip-editor-timeline-volume';
        timelineButtons.appendChild(playerVolume);
        const volumeIcon = document.createElement('DIV');
        volumeIcon.className = 'clip-editor-timeline-volume-icon';
        volumeIcon.innerHTML = thisInstance.icons.disabledEnabledSpeaker;
        playerVolume.appendChild(volumeIcon);
        const inputContainer = document.createElement('DIV');
        inputContainer.className = 'clip-editor-timeline-volume-input';
        playerVolume.appendChild(inputContainer);
        const playerVolumeInput = document.createElement('INPUT');
        playerVolumeInput.type = 'range';
        playerVolumeInput.min = '0';
        playerVolumeInput.max = '1';
        playerVolumeInput.step = '0.1';
        playerVolumeInput.value = thisInstance.player.getVolume();
        inputContainer.appendChild(playerVolumeInput);

        thisInstance.player.on('volumechange', function (e) {
            updateVolumeIcons(e.volume, e.muted);
        })

        volumeIcon.addEventListener('click', async function () {
            thisInstance.player.toggleMuted();

            let audioBuffer = await extractAudioFromVideo(thisInstance.file);

            
            console.log('audioBuffer', audioBuffer)
            let audioBlob = await encodeAudioBufferToAAC(audioBuffer);
            const url = URL.createObjectURL(audioBlob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'clipAudio.aac';

            document.body.appendChild(a);
            a.click();
        });

        playerVolumeInput.addEventListener('input', function () {
            if (playerVolumeInput.value > 0) {
                thisInstance.player.setMuted(false);
            }
            thisInstance.player.setVolume(playerVolumeInput.value);
        });

        const playPauseButton = document.createElement('DIV');
        playPauseButton.className = 'clip-editor-timeline-button clip-editor-timeline-play';
        timelineButtons.appendChild(playPauseButton);

        const timer = document.createElement('DIV');
        timer.className = 'clip-editor-timeline-timer';
        timelineButtons.appendChild(timer);

        thisInstance.player.on('timeupdate', function (e) {
            timer.innerHTML = formatTime(e.currentTime);
        })

        thisInstance.player.on('play', function () {
            playPauseButton.innerHTML = thisInstance.icons.pauseIcon;
        })
        thisInstance.player.on('pause', function () {
            playPauseButton.innerHTML = thisInstance.icons.playIcon;
        })

        playPauseButton.addEventListener('click', function () {

            thisInstance.player.playOrPause()
        });

        function updateVolumeIcons(volumeToSet, muted) {
            var disabledWaves = volumeIcon.querySelectorAll('.MediaWebRTCDisabledparts.MediaWebRTCWaves1 .MediaWebRTCDisabledparts.MediaWebRTCWaves2');
            var secondWaveParts = volumeIcon.querySelectorAll('.MediaWebRTCWaves2');
            var disabledPartOfSpeaker = volumeIcon.querySelector('polygon.MediaWebRTCDisabledparts');
            var crossline = volumeIcon.querySelector('#MediaWebRTCCrossline');

            function toggleSecondWave(value) {
                for (let i = 0; i < secondWaveParts.length; ++i) {
                    secondWaveParts[i].style.opacity = value;
                }
            }
            function toggleDisabledIcon(value) {
                for (let i = 0; i < disabledWaves.length; ++i) {
                    disabledWaves[i].style.opacity = (value === 1 ? 0 : 1);
                }
                disabledPartOfSpeaker.style.opacity = (value === 1 ? 0 : 1);
                crossline.style.opacity = (value === 1 ? 1 : 0);
            }

            if (volumeToSet <= 0.5 && volumeToSet > 0 && !muted) {
                toggleDisabledIcon(0);
                toggleSecondWave(0);
            } else if (volumeToSet > 0.5 && !muted) {
                toggleDisabledIcon(0);
                toggleSecondWave(1);
            } else {
                toggleSecondWave(1);
                toggleDisabledIcon(1);
            }
        }

        return editorTimelineControls;
    }

    function setTime(value) {
        console.log('setTime START', value);
        thisInstance.pendingClipRangeUpdate = true;
        thisInstance.player.setTime(value);
    }

    function setClipBounds(startTime, endTime) {
        if (startTime != null) clipTimeRange.startTime = startTime;
        if (endTime != null) {
            clipTimeRange.endTime = endTime;
        } else if (startTime != null) {
            clipTimeRange.endTime = clipTimeRange.startTime + clipTimeRange.duration;
        }

        clipTimeRange.duration = clipTimeRange.endTime - clipTimeRange.startTime;
        const widthPercent = clipTimeRange.duration / thisInstance.player.parser.totalDuration * 100;
        const leftPercent = clipTimeRange.startTime / thisInstance.player.parser.totalDuration * 100;
        const clipPxWidth = timelineSize.width / 100 * widthPercent;
        const clipPxLeft = timelineSize.width / 100 * leftPercent;

        thisInstance.clipBoundsElement.style.left = clipPxLeft + 'px';
        thisInstance.clipBoundsElement.style.width = clipPxWidth + 'px';

        if (thisInstance.startClipInput) thisInstance.startClipInput.value = formatTime(clipTimeRange.startTime);
        if (thisInstance.endClipInput) thisInstance.endClipInput.value = formatTime(clipTimeRange.endTime);

        if (thisInstance.setTimeDebouncer && startTime != null) {
            console.log(getPageTime(), 'before setTime', startTime)
            setTime(startTime);
            //thisInstance.setTimeDebouncer(startTime)
        }
    }

    function buildTimeRangeInputs() {
        const clipRange = document.createElement('DIV');
        clipRange.className = 'clip-editor-ranges';

        const clipRangeInputs = document.createElement('DIV');
        clipRangeInputs.className = 'clip-editor-ranges-inputs';
        clipRange.appendChild(clipRangeInputs);

        const startClipTime = document.createElement('DIV');
        startClipTime.className = 'clip-editor-range-start';
        clipRangeInputs.appendChild(startClipTime);

        const startLabel = document.createElement('LABEL');
        startLabel.className = 'clip-editor-range-start-label';
        startLabel.innerHTML = 'Start time';
        startClipTime.appendChild(startLabel);

        const startInputCon = document.createElement('DIV');
        startInputCon.className = 'clip-editor-range-start-input';
        startClipTime.appendChild(startInputCon);

        const clipStartInput = thisInstance.startClipInput = document.createElement('INPUT');
        clipStartInput.type = 'text';
        clipStartInput.value = formatTime(clipTimeRange.startClipTime);
        startInputCon.appendChild(clipStartInput);
        clipStartInput.addEventListener('input', function (e) {
            if (validateInputTime(e.target)) {
                clipStartInput.classList.remove('clip-editor-range-invalid');
            } else {
                clipStartInput.classList.add('clip-editor-range-invalid');
            };
        });


        const endClipTime = document.createElement('DIV');
        endClipTime.className = 'clip-editor-range-end';
        clipRangeInputs.appendChild(endClipTime);

        const endLabel = document.createElement('LABEL');
        endLabel.className = 'clip-editor-range-start-label';
        endLabel.innerHTML = 'End time';
        endClipTime.appendChild(endLabel);

        const endInputCon = document.createElement('DIV');
        endInputCon.className = 'clip-editor-range-end-input';
        endClipTime.appendChild(endInputCon);

        const clipEndInput = thisInstance.endClipInput = document.createElement('INPUT');
        clipEndInput.type = 'text';
        clipEndInput.value = formatTime(clipTimeRange.endClipTime);
        endInputCon.appendChild(clipEndInput);

        const makeClip = document.createElement('DIV');
        makeClip.className = 'clip-editor-create-clip';
        clipRange.appendChild(makeClip);
        const makeClipButton = document.createElement('BUTTON');
        makeClipButton.innerHTML = 'Create Clip';
        makeClip.appendChild(makeClipButton);
        makeClipButton.addEventListener('click', async function () {
            let file = await thisInstance.player.createClip(clipTimeRange.startTime, clipTimeRange.endTime);
            //addGeneratedClip(file);
            let segment = {
                parsedTime: clipTimeRange.startTime,
                parsedEndTime: clipTimeRange.endTime,
                formattedTime: formatTime(clipTimeRange.startTime),
                description: 'Clip ' + formatTime(clipTimeRange.startTime) + '-' + formatTime(clipTimeRange.endTime),
            };

            thisInstance.clipSegments.unshift(segment);
            addClipItemToList(segment, true);
            updateClipsUI('summerized');
        });


        const generateWithAi = document.createElement('DIV');
        generateWithAi.className = 'clip-editor-ai-clip';
        clipRange.appendChild(generateWithAi);

        const aiClipButton = document.createElement('BUTTON');
        generateWithAi.appendChild(aiClipButton);
        aiClipButton.addEventListener('click', startClipGenerator);

        const aiClipButtonIcon = document.createElement('SPAN');
        aiClipButtonIcon.className = 'clip-editor-button-icon';
        aiClipButtonIcon.innerHTML = thisInstance.icons.ai;
        aiClipButton.appendChild(aiClipButtonIcon);
        const aiClipButtonText = document.createElement('SPAN');
        aiClipButtonText.innerHTML = 'Generate Clips with AI';
        aiClipButton.appendChild(aiClipButtonText);


        function validateInputTime(input) {
            const regex = /^\d+:[0-5]\d$/;

            return regex.test(input.value);
        }
        return clipRange;
    }

    function fetchStream() {
        
    }

    function toAbsoluteUrl(str) {
        try {
            // If it's already a valid absolute URL, return as-is
            new URL(str);
            return str;
        } catch {
            // Otherwise treat it as a relative path and prepend location.origin
            return new URL(str, location.origin).href;
        }
    }

    function showAnalyseStage(stage) {

        let text;
        if(stage == 'transcribing') {
            text = 'Transcribing...'
        } else if(stage == 'transcribed') {
            text = 'Analysing...'
        } else if(stage == 'uploading') {
            text = 'Uploading...'
        }

        if (!thisInstance.clipsStageEl) {
            const clipsAnalyseStage = thisInstance.clipsStageEl = document.createElement('DIV');
            clipsAnalyseStage.className = 'clip-editor-clips-stage';
            clipsAnalyseStatus.appendChild(clipsAnalyseStage)
        }

        if (!thisInstance.clipsLoaderEl) {
            const clipsAnalyseLoader = thisInstance.clipsLoaderEl = document.createElement('DIV');
            clipsAnalyseLoader.className = 'clip-editor-clips-loader';
            clipsAnalyseStatus.appendChild(clipsAnalyseLoader)
        }

        thisInstance.clipsStageEl.innerHTML = text;

        if(stage != 'summerized') {
            clipsAnalyseStatus.appendChild(thisInstance.clipsStageEl);
            clipsAnalyseStatus.appendChild(thisInstance.clipsLoaderEl);
        } else {
            if(thisInstance.clipsStageEl.parentElement) thisInstance.clipsStageEl.parentElement.removeChild(thisInstance.clipsStageEl);
            if(thisInstance.clipsLoaderEl.parentElement) thisInstance.clipsLoaderEl.parentElement.removeChild(thisInstance.clipsLoaderEl);
        }
        
    }

    async function updateClipsUI(state) {
        let sampleData = `
"[00:06:56] 
Two friends and business partners discuss their comedy tour, emphasizing their close friendship beyond their professional relationship. They encourage fans to attend the "Finally" tour featuring Bobby Lee. The conversation touches on sensitivity in humor, personal jokes, and one partner's recent success in quitting smoking for health reasons.



[00:08:49]
A group discusses a person smoking outside and spitting a loogie into an outdoor sink, which dried due to the elements and air, resembling tar. The speaker connects this to the recent death of their dog, Remy, expressing feelings of anxiety and uncertainty about speaking but continuing the conversation nonetheless.



[00:10:48]

A group discusses the challenges of quitting smoking, the benefits of nicotine supplementation, and the health consequences of long-term smoking. They share personal experiences, including one speaker's father who suffered from smoking-related illness but quit years ago. The conversation highlights the lungs' ability to recover after quitting and references Keith Richards as a cultural example of heavy smoking. The importance of quitting to improve health is emphasized.



[00:12:24]
The conversation covers recent celebrity deaths, including Eric Dane, and the tendency for celebrities discussed on the show to pass away. It shifts to a Hollywood controversy involving Roseanne Arquette criticizing Quentin Tarantino's use of the N word in Pulp Fiction, leading to a heated online exchange. The discussion contrasts Tarantino's work with Steve McQueen's 12 Years a Slave and reflects on the nature of celebrity disputes." `;

        if (state == 'transcribing') {
            showAnalyseStage('transcribing')
        } else if (state == 'transcribed') {
            showAnalyseStage('transcribed')
        } else if (state == 'summerized') {
            showAnalyseStage('summerized');
            reloadClipsListUI();
        } else if (state == 'uploading') {
            showAnalyseStage('uploading');
        }

        if(thisInstance.generatorStream) {
            let summeryUrl = thisInstance.generatorStream.getAttribute('summeryUrl');
            if(summeryUrl){
                let rawText = await loadRemoteText(toAbsoluteUrl(summeryUrl));
                thisInstance.clipSegments = parseTranscript(rawText);
            }
        }

        if(thisInstance.clipSegments && thisInstance.clipSegments.length != 0) reloadClipsListUI();
    }

    function timeToSeconds(timeStr) {
        const [hh, mm, ss] = timeStr.split(':').map(Number);
        return hh * 3600 + mm * 60 + ss;
    }

    async function loadRemoteText(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.text();
        } catch (error) {
            console.error('Fetch error:', error);
        }
    }

    function parseTranscript(text) {
        const regex = /\[(\d{2}:\d{2}:\d{2})\]\s*([\s\S]*?)(?=\n\s*\[\d{2}:\d{2}:\d{2}\]|$)/g;

        const segments = [];
        let match;

        // First pass: collect segments
        while ((match = regex.exec(text)) !== null) {
            const formattedTime = match[1];
            let startTime = timeToSeconds(formattedTime);
            segments.push({
                parsedTime: timeToSeconds(formattedTime),
                formattedTime: formatTime(startTime),
                description: match[2]
                    .replace(/\r/g, '')
                    .replace(/\n+/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
            });
        }

        // Second pass: add end times (next segment's start)
        return segments.map((segment, i) => ({
            ...segment,
            parsedEndTime:
                i < segments.length - 1
                    ? segments[i + 1].parsedTime
                    : null // or use video duration if known
        }));
    }


    function reloadClipsListUI() {
        console.log('thisInstance.clipSegments', thisInstance.clipSegments)
        for(let i in thisInstance.clipSegments) {
            let segment = thisInstance.clipSegments[i];
            if(segment.element != null) continue;
            addClipItemToList(segment);
        }
    }

    function addClipItemToList(segment, prepend) {
        let clipItem = segment.element = document.createElement('DIV');
        clipItem.className = 'clip-editor-ai-clip';
        if(prepend) {
            containerClipsList.insertBefore(clipItem, containerClipsList.firstChild);
        } else {
            containerClipsList.appendChild(clipItem);
        }
        let time = document.createElement('DIV');
        time.className = 'clip-editor-ai-clip-time';
        time.innerHTML = segment.formattedTime;
        clipItem.appendChild(time);
        let clipItemTitle = document.createElement('DIV');
        clipItemTitle.className = 'clip-editor-ai-clip-title';
        clipItemTitle.innerHTML = segment.description;
        clipItem.appendChild(clipItemTitle);
        let clipItemButtons = document.createElement('DIV');
        clipItemButtons.className = 'clip-editor-ai-clip-buttons';
        clipItem.appendChild(clipItemButtons);
        let playButton = document.createElement('DIV');
        playButton.className = 'clip-editor-ai-clip-play';
        playButton.innerHTML = thisInstance.icons.playIcon;
        clipItemButtons.appendChild(playButton);

        playButton.addEventListener('click', function () {
            setClipBounds(segment.parsedTime, segment.parsedEndTime);
        });

        let downloadButton = document.createElement('DIV');
        downloadButton.className = 'clip-editor-ai-clip-download';
        downloadButton.innerHTML = thisInstance.icons.download;
        clipItemButtons.appendChild(downloadButton);
        downloadButton.addEventListener('click', async function () {
            let file = await thisInstance.player.createClip(segment.parsedTime, segment.parsedEndTime);
            const url = URL.createObjectURL(file);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'clip_' + (segment.parsedEndTime - segment.parsedTime) + '.mp4';

            document.body.appendChild(a);
            a.click();
        });
        let shareButtonCon = document.createElement('DIV');
        shareButtonCon.className = 'clip-editor-ai-clip-share-con';
        clipItemButtons.appendChild(shareButtonCon);
        let shareButton = document.createElement('DIV');
        shareButton.className = 'clip-editor-ai-clip-button clip-editor-ai-clip-share';
        shareButton.innerHTML = 'Share';
        shareButtonCon.appendChild(shareButton);

        shareButton.addEventListener('click', async function () {
            let file = await thisInstance.player.createClip(segment.parsedTime, segment.parsedEndTime);
            shareMp4(file);
        });

        return clipItem;
    }
    

    async function startClipGenerator() {

        Q.confirm(`The video will be uploaded to the server and analyzed by artificial intelligence. This may take some time. You can monitor the processing status in the right panel on this page.`, function (result) {
            if (!result) {
                return;
            }
            updateClipsUI('uploading');
            createClipGeneratorStream()
            .then(function (stream) {
                Q.Streams.get(stream.fields.publisherId, stream.fields.name, function (err, stream) {
                    thisInstance.generatorStream = stream;
                    updateClipsUI('transcribing');
                    console.log('roomDataObject.generatorStream 0', thisInstance.generatorStream)

                    stream.onMessage('Streams/changed').set(function (message) {
                        console.log('roomDataObject.generatorStream changed', message)

                        Q.Streams.get(message.publisherId, message.streamName, function (err) {
                            thisInstance.generatorStream = this;
                            console.log('roomDataObject.generatorStream 1', thisInstance.generatorStream)
                            updateClipsUI(thisInstance.generatorStream.getAttribute('state'));
                        });
                    });
                });
            });
            
        }, {
            title: 'Confirm action',
            ok: 'Continue',
            cancel: 'Cancel',
            noClose: false,
            mask: false
        });

        
        /* let blob = await thisInstance.player.parser.getAudio();
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;

        document.body.appendChild(a);
        a.click(); */
    }

    function createClipGeneratorStream() {
        let tool = this;
        return new Promise(async function (resolve, reject) {
            let formData = new FormData();
            let audioBuffer = await extractAudioFromVideo(thisInstance.file);

            
            console.log('audioBuffer', audioBuffer)
            let audioBlob = await encodeAudioBufferToAAC(audioBuffer);
            //let file = new File([myBlob], "audio.aac", { type: audioBlob.type });
            formData.append("fileToProcess", audioBlob, "audio.aac");

            Q.req("Media/clipEditor", ["processFile"], function (err, response) {
                var msg = Q.firstErrorMessage(err, response && response.errors);

                if (msg) {
                    return console.error(msg);
                }

                resolve(response.slots.processFile.stream);

            }, {
                xhr: function (xhr) {
                    let progressWindow = new Q.Media.WebRTC.clipEditor.ProgressBar();

                    console.log('createClipGeneratorStream xhr', xhr, progressWindow)
                    progressWindow.show();
                    xhr.upload.addEventListener('progress', function (e) {
                        console.log('uploadDir progress', e)
                        if (e.lengthComputable) {
                            let percent = Math.round((e.loaded / e.total) * 100);

                            progressWindow.updateProgress(percent);
                        }
                    });

                    xhr.onload = function () {
                        if (xhr.status === 200) {
                            console.log("Upload complete");
                            progressWindow.hide();
                        }
                    };
                },
                method: 'post',
                formdata: formData
            });

            
        });
    }

    function loadClipControls() {
        thisInstance.timelineElement = buildTimeline();
        clipControls.appendChild(buildTimelineControls());
        clipControls.appendChild(thisInstance.timelineElement);
        clipControls.appendChild(buildTimeRangeInputs());
    }
}

Q.Media.WebRTC.clipEditor.ProgressBar = function () {
    let _popupTool = null;
    let _progrssBarPopup = null;
    let _barProggressEl = null;
    let _progressText = null;
    let _barWidth = 400;
    let _barheight = 100;

    let dialog = document.createElement('DIV');
    dialog.className = 'clip-editor-progress-bar-popup';
    //dialog.style.position = 'absolute';
    dialog.style.width = _barWidth + 'px';
    dialog.style.height = _barheight + 'px';
    _progrssBarPopup = dialog;

    let dialogInner = document.createElement('DIV');
    dialogInner.className = 'clip-editor-progress-bar-popup-inner';
    dialog.appendChild(dialogInner);
    let boxContent = document.createElement('DIV');
    boxContent.className = 'clip-editor-progress-box clip-editor-box';
    dialogInner.appendChild(boxContent);
    let boxContentText = _progressText = document.createElement('DIV');
    boxContentText.className = 'clip-editor-progress-bar-status';
    boxContentText.innerHTML = 'Uploading...';
    boxContent.appendChild(boxContentText);
    let boxContentText2 = _progressText = document.createElement('DIV');
    boxContentText2.className = 'clip-editor-progress-bar-text';
    boxContentText2.innerHTML = 'Please do not close this page until the upload is complete.';
    boxContent.appendChild(boxContentText2);
    let progressBar = document.createElement('DIV');
    progressBar.className = 'clip-editor-progress-bar';
    boxContent.appendChild(progressBar);
    let progressEl = _barProggressEl = document.createElement('SPAN');
    progressEl.className = 'clip-editor-progress-el';
    progressBar.appendChild(progressEl);

    this.show = function () {
        /* let boxRect = activeDialog.dialogEl.getBoundingClientRect();
        let x = (boxRect.width / 2) - (_barWidth / 2);
        let y = (boxRect.height / 2) - (_barheight / 2);
        _progrssBarPopup.style.top = y + 'px';
        _progrssBarPopup.style.left = x + 'px';
        activeDialog.dialogEl.appendChild(_progrssBarPopup); */

        let x = (window.innerWidth / 2) - (_barWidth / 2)
        let y = (window.innerHeight / 2) - (_barheight / 2)
        const mouseEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y
        });

        //_progrssBarPopup.style.left = x + 'px';
        //_progrssBarPopup.style.top = y + 'px';

        Q.activate(
            Q.Tool.setUpElement(
                document.createElement('DIV'),
                "Media/webrtc/popupDialog",
                {
                    content: _progrssBarPopup,
                    className: 'media-upload-popup',
                    triggerOn: 'showImmediately',
                    pointerEvent: mouseEvent,
                    position: 'byPointer'
                }
            ),
            {},
            function () {
                console.log('_popupTool', _popupTool)
                _popupTool = this;
            }
        );
    }

    this.hide = function () {
        _popupTool.hide();
        if(_progrssBarPopup.parentElement) _progrssBarPopup.parentElement.removeChild(_progrssBarPopup);
    }

    this.updateProgress = function (percemt) {
        _barProggressEl.style.width = percemt + '%';
        _barProggressEl.innerHTML = percemt + '%';
    }

    this.updateTextStatus = function (text) {
        _progressText.innerHTML = text;
    }
}