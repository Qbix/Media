Q.Media.WebRTC.livestreaming.RecordingPopup = function (tool) {
    var thisInstance = this;
    var _localRecordingTimer = null;

    const VIDEO_BITRATES = [
        2_097_152,   // 2 Mbps
        4_194_304,   // 4 Mbps
        5_242_880,   // 5 Mbps
        8_388_608,   // 8 Mbps
        10_485_760,  // 10 Mbps
        12_582_912,  // 12 Mbps
        16_777_216,  // 16 Mbps
        25_165_824,  // 24 Mbps
        33_554_432,  // 32 Mbps
        50_331_648,  // 48 Mbps
        67_108_864,  // 64 Mbps
        83_886_080,  // 80 Mbps
        100_663_296, // 96 Mbps
    ];

    var recordingParams = {
        bitrate: {
            video: null,
            audio: null
        },
        recording: {
            video: true,
            audio: false,
            transcript: false
        },
        transcriptLang: null
    }

    /**
 * getSupportedSpeechRecognitionLanguages()
 *
 * Returns an array of { lang, langString } objects representing languages
 * commonly supported by the Web Speech API's SpeechRecognition interface,
 * sorted so that:
 *
 *   1. The page's default language (<html lang="...">), if it matches a
 *      supported entry, comes first and gets `default: true`.
 *   2. Languages from navigator.languages come next, in the user's
 *      preference order (skipping anything already placed in step 1).
 *   3. Every remaining supported language follows, in table order.
 *
 * IMPORTANT CAVEAT:
 * The Web Speech API spec does NOT define a fixed list of supported
 * languages — that's entirely up to the underlying recognition service
 * (e.g. Chrome's cloud-based engine, or a given OS's on-device engine).
 * The table below reflects the commonly documented set of BCP-47 tags
 * Chrome's speech recognition service has historically accepted. It is
 * NOT guaranteed by spec, may differ across browsers/OS versions, and
 * can change without notice. If you need certainty for a given tag, use
 * SpeechRecognition.available({ langs: [...] }) where supported, or test
 * on your target browsers directly.
 */
    function getSupportedSpeechRecognitionLanguages() {
        const ALL_LANGUAGES = [
            { lang: 'af-ZA', langString: 'Afrikaans' },
            { lang: 'am-ET', langString: 'Amharic' },
            { lang: 'ar-AE', langString: 'Arabic (United Arab Emirates)' },
            { lang: 'ar-BH', langString: 'Arabic (Bahrain)' },
            { lang: 'ar-DZ', langString: 'Arabic (Algeria)' },
            { lang: 'ar-EG', langString: 'Arabic (Egypt)' },
            { lang: 'ar-IL', langString: 'Arabic (Israel)' },
            { lang: 'ar-IQ', langString: 'Arabic (Iraq)' },
            { lang: 'ar-JO', langString: 'Arabic (Jordan)' },
            { lang: 'ar-KW', langString: 'Arabic (Kuwait)' },
            { lang: 'ar-LB', langString: 'Arabic (Lebanon)' },
            { lang: 'ar-MA', langString: 'Arabic (Morocco)' },
            { lang: 'ar-OM', langString: 'Arabic (Oman)' },
            { lang: 'ar-PS', langString: 'Arabic (Palestinian Territories)' },
            { lang: 'ar-QA', langString: 'Arabic (Qatar)' },
            { lang: 'ar-SA', langString: 'Arabic (Saudi Arabia)' },
            { lang: 'ar-TN', langString: 'Arabic (Tunisia)' },
            { lang: 'ar-YE', langString: 'Arabic (Yemen)' },
            { lang: 'az-AZ', langString: 'Azerbaijani' },
            { lang: 'eu-ES', langString: 'Basque' },
            { lang: 'bn-BD', langString: 'Bengali (Bangladesh)' },
            { lang: 'bn-IN', langString: 'Bengali (India)' },
            { lang: 'bs-BA', langString: 'Bosnian' },
            { lang: 'bg-BG', langString: 'Bulgarian' },
            { lang: 'ca-ES', langString: 'Catalan' },
            { lang: 'zh-CN', langString: 'Chinese (Simplified, China)' },
            { lang: 'zh-HK', langString: 'Chinese (Traditional, Hong Kong)' },
            { lang: 'zh-TW', langString: 'Chinese (Traditional, Taiwan)' },
            { lang: 'hr-HR', langString: 'Croatian' },
            { lang: 'cs-CZ', langString: 'Czech' },
            { lang: 'da-DK', langString: 'Danish' },
            { lang: 'nl-BE', langString: 'Dutch (Belgium)' },
            { lang: 'nl-NL', langString: 'Dutch (Netherlands)' },
            { lang: 'en-AU', langString: 'English (Australia)' },
            { lang: 'en-CA', langString: 'English (Canada)' },
            { lang: 'en-GB', langString: 'English (United Kingdom)' },
            { lang: 'en-GH', langString: 'English (Ghana)' },
            { lang: 'en-IN', langString: 'English (India)' },
            { lang: 'en-IE', langString: 'English (Ireland)' },
            { lang: 'en-KE', langString: 'English (Kenya)' },
            { lang: 'en-NG', langString: 'English (Nigeria)' },
            { lang: 'en-NZ', langString: 'English (New Zealand)' },
            { lang: 'en-PH', langString: 'English (Philippines)' },
            { lang: 'en-ZA', langString: 'English (South Africa)' },
            { lang: 'en-TZ', langString: 'English (Tanzania)' },
            { lang: 'en-US', langString: 'English (United States)' },
            { lang: 'et-EE', langString: 'Estonian' },
            { lang: 'fil-PH', langString: 'Filipino' },
            { lang: 'fi-FI', langString: 'Finnish' },
            { lang: 'fr-BE', langString: 'French (Belgium)' },
            { lang: 'fr-CA', langString: 'French (Canada)' },
            { lang: 'fr-FR', langString: 'French (France)' },
            { lang: 'fr-CH', langString: 'French (Switzerland)' },
            { lang: 'gl-ES', langString: 'Galician' },
            { lang: 'ka-GE', langString: 'Georgian' },
            { lang: 'de-AT', langString: 'German (Austria)' },
            { lang: 'de-DE', langString: 'German (Germany)' },
            { lang: 'de-CH', langString: 'German (Switzerland)' },
            { lang: 'el-GR', langString: 'Greek' },
            { lang: 'gu-IN', langString: 'Gujarati' },
            { lang: 'he-IL', langString: 'Hebrew' },
            { lang: 'hi-IN', langString: 'Hindi' },
            { lang: 'hu-HU', langString: 'Hungarian' },
            { lang: 'is-IS', langString: 'Icelandic' },
            { lang: 'id-ID', langString: 'Indonesian' },
            { lang: 'it-IT', langString: 'Italian (Italy)' },
            { lang: 'it-CH', langString: 'Italian (Switzerland)' },
            { lang: 'ja-JP', langString: 'Japanese' },
            { lang: 'jv-ID', langString: 'Javanese' },
            { lang: 'kn-IN', langString: 'Kannada' },
            { lang: 'km-KH', langString: 'Khmer' },
            { lang: 'ko-KR', langString: 'Korean' },
            { lang: 'lo-LA', langString: 'Lao' },
            { lang: 'lv-LV', langString: 'Latvian' },
            { lang: 'lt-LT', langString: 'Lithuanian' },
            { lang: 'ms-MY', langString: 'Malay' },
            { lang: 'ml-IN', langString: 'Malayalam' },
            { lang: 'mr-IN', langString: 'Marathi' },
            { lang: 'ne-NP', langString: 'Nepali' },
            { lang: 'nb-NO', langString: 'Norwegian Bokmål' },
            { lang: 'fa-IR', langString: 'Persian' },
            { lang: 'pl-PL', langString: 'Polish' },
            { lang: 'pt-BR', langString: 'Portuguese (Brazil)' },
            { lang: 'pt-PT', langString: 'Portuguese (Portugal)' },
            { lang: 'pa-IN', langString: 'Punjabi' },
            { lang: 'ro-RO', langString: 'Romanian' },
            { lang: 'ru-RU', langString: 'Russian' },
            { lang: 'sr-RS', langString: 'Serbian' },
            { lang: 'si-LK', langString: 'Sinhala' },
            { lang: 'sk-SK', langString: 'Slovak' },
            { lang: 'sl-SI', langString: 'Slovenian' },
            { lang: 'es-AR', langString: 'Spanish (Argentina)' },
            { lang: 'es-BO', langString: 'Spanish (Bolivia)' },
            { lang: 'es-CL', langString: 'Spanish (Chile)' },
            { lang: 'es-CO', langString: 'Spanish (Colombia)' },
            { lang: 'es-CR', langString: 'Spanish (Costa Rica)' },
            { lang: 'es-DO', langString: 'Spanish (Dominican Republic)' },
            { lang: 'es-EC', langString: 'Spanish (Ecuador)' },
            { lang: 'es-SV', langString: 'Spanish (El Salvador)' },
            { lang: 'es-ES', langString: 'Spanish (Spain)' },
            { lang: 'es-US', langString: 'Spanish (United States)' },
            { lang: 'es-GT', langString: 'Spanish (Guatemala)' },
            { lang: 'es-HN', langString: 'Spanish (Honduras)' },
            { lang: 'es-MX', langString: 'Spanish (Mexico)' },
            { lang: 'es-NI', langString: 'Spanish (Nicaragua)' },
            { lang: 'es-PA', langString: 'Spanish (Panama)' },
            { lang: 'es-PY', langString: 'Spanish (Paraguay)' },
            { lang: 'es-PE', langString: 'Spanish (Peru)' },
            { lang: 'es-PR', langString: 'Spanish (Puerto Rico)' },
            { lang: 'es-UY', langString: 'Spanish (Uruguay)' },
            { lang: 'es-VE', langString: 'Spanish (Venezuela)' },
            { lang: 'su-ID', langString: 'Sundanese' },
            { lang: 'sw-KE', langString: 'Swahili (Kenya)' },
            { lang: 'sw-TZ', langString: 'Swahili (Tanzania)' },
            { lang: 'sv-SE', langString: 'Swedish' },
            { lang: 'ta-IN', langString: 'Tamil (India)' },
            { lang: 'ta-LK', langString: 'Tamil (Sri Lanka)' },
            { lang: 'ta-MY', langString: 'Tamil (Malaysia)' },
            { lang: 'ta-SG', langString: 'Tamil (Singapore)' },
            { lang: 'te-IN', langString: 'Telugu' },
            { lang: 'th-TH', langString: 'Thai' },
            { lang: 'tr-TR', langString: 'Turkish' },
            { lang: 'uk-UA', langString: 'Ukrainian' },
            { lang: 'ur-IN', langString: 'Urdu (India)' },
            { lang: 'ur-PK', langString: 'Urdu (Pakistan)' },
            { lang: 'uz-UZ', langString: 'Uzbek' },
            { lang: 'vi-VN', langString: 'Vietnamese' },
            { lang: 'zu-ZA', langString: 'Zulu' },
        ];

        // Grabs the primary subtag ("en" from "en-US") so a bare "en" can still
        // match a regional entry like "en-US".
        const primarySubtag = (tag) => tag.toLowerCase().split('-')[0];

        // When a tag has NO region ("en" instead of "en-US"), which regional
        // variant should it resolve to? Without this, a bare code fell back to
        // "whichever regional entry happens to appear first in ALL_LANGUAGES" —
        // which for English was en-AU, purely because of table order, not
        // because it meant anything. "en" now explicitly means "en-US".
        // The rest are reasonable common defaults — tune them to your audience
        // if a different regional variant makes more sense for you.
        const DEFAULT_REGION_FOR_BARE_LANG = {
            en: 'en-US',
            ar: 'ar-EG',
            es: 'es-ES',
            fr: 'fr-FR',
            de: 'de-DE',
            it: 'it-IT',
            nl: 'nl-NL',
            pt: 'pt-BR',
            zh: 'zh-CN',
            sw: 'sw-TZ',
            ta: 'ta-IN',
            ur: 'ur-PK',
        };

        const usedTags = new Set(); // exact lang tags already placed in `result`
        const usedPrimaryLangs = new Set(); // primary subtags already represented in `result`
        const result = [];

        function claim(tag, markAsDefault) {
            if (!tag) return false;

            const lowerTag = tag.toLowerCase();
            const primary = primarySubtag(lowerTag);

            // A variant of this language (any region) is already in the result —
            // don't add a second one. This is what stops "en-US" in
            // navigator.languages from bumping in a *different* English variant
            // once "en" has already resolved to en-US as the default.
            if (usedPrimaryLangs.has(primary)) return false;

            // 1. Exact regional match, e.g. "zh-cn" -> "zh-CN"
            let match = ALL_LANGUAGES.find((entry) => entry.lang.toLowerCase() === lowerTag);

            // 2. Bare language code (no region): use the known default region
            if (!match && !lowerTag.includes('-')) {
                const preferredTag = DEFAULT_REGION_FOR_BARE_LANG[primary];
                if (preferredTag) {
                    match = ALL_LANGUAGES.find((entry) => entry.lang.toLowerCase() === preferredTag.toLowerCase());
                }
            }

            // 3. Last resort: first table entry that shares the primary subtag
            if (!match) {
                match = ALL_LANGUAGES.find((entry) => primarySubtag(entry.lang) === primary);
            }

            if (!match) return false;

            usedTags.add(match.lang);
            usedPrimaryLangs.add(primary);
            result.push(markAsDefault ? { ...match, default: true } : { ...match });
            return true;
        }

        // 1. Page default language
        const htmlLang = document.documentElement.lang;
        claim(htmlLang, true);

        // 2. navigator.languages, in the user's preference order
        const preferredLangs =
            navigator.languages && navigator.languages.length
                ? navigator.languages
                : navigator.language
                    ? [navigator.language]
                    : [];

        preferredLangs.forEach((tag) => claim(tag, false));

        // 3. Everything else, in table order. Dedup by exact tag (not by primary
        // subtag) so other regional variants of an already-placed language —
        // en-AU, en-GB, etc. — still show up further down the list.
        ALL_LANGUAGES.forEach((entry) => {
            if (!usedTags.has(entry.lang)) {
                usedTags.add(entry.lang);
                result.push({ ...entry });
            }
        });

        return result;
    }

    function createSectionElement() {

        var recordingCon = thisInstance.element = document.createElement('DIV');
        recordingCon.className = 'live-editor-stream-to-section-rec';

        var recordingButtons = document.createElement('DIV');
        recordingButtons.className = 'live-editor-stream-to-section-rec-buttons';
        recordingCon.appendChild(recordingButtons);

        var startLocalRecBtn = document.createElement('DIV');
        startLocalRecBtn.className = 'live-editor-rec-start';
        recordingButtons.appendChild(startLocalRecBtn);

        var startLocRecordingBtn = document.createElement('DIV');
        startLocRecordingBtn.className = 'live-editor-rec-start-btn livestream_button';
        startLocalRecBtn.appendChild(startLocRecordingBtn);

        var startLocRecordingBtnInner = document.createElement('DIV');
        startLocRecordingBtnInner.className = 'live-editor-rec-start-btn-inner';
        startLocRecordingBtn.appendChild(startLocRecordingBtnInner);

        var startButtonTextCon = document.createElement('DIV');
        startButtonTextCon.className = 'live-editor-drop-down-btn-text';
        startLocRecordingBtnInner.appendChild(startButtonTextCon);

        var startButtonText = document.createElement('SPAN');
        startButtonText.className = 'live-editor-drop-down-btn-text-text';
        startButtonText.innerHTML = 'Start Recording';
        startButtonTextCon.appendChild(startButtonText);

        var startButtonTimer = document.createElement('SPAN');
        startButtonTimer.className = 'live-editor-drop-down-btn-timer';
        startButtonTextCon.appendChild(startButtonTimer);

        /* var dropDownArrCon = document.createElement('DIV');
        dropDownArrCon.className = 'live-editor-drop-down-btn-arr-con';
        startLocRecordingBtnInner.appendChild(dropDownArrCon);

        var dropDownArr = document.createElement('DIV');
        dropDownArr.className = 'live-editor-drop-down-btn-arr';
        dropDownArrCon.appendChild(dropDownArr); */

        let settingsEl = thisInstance.settingsEl = generateSettings();
        recordingCon.appendChild(settingsEl);

        var recordingsContainer = document.createElement('DIV');
        recordingsContainer.className = 'live-editor-stream-to-section-recs';
        recordingCon.appendChild(recordingsContainer);

        var getRecordingsBtn = document.createElement('BUTTON');
        getRecordingsBtn.className = 'livestream_button';
        getRecordingsBtn.innerHTML = 'Show Recordings';
        recordingsContainer.appendChild(getRecordingsBtn);

        /* let recordingFormats = document.createElement('DIV');
        recordingFormats.className = 'live-editor-rec-server-dropdown-inner';

        let mp4IsSupported = mp4MuxerRecordingSupported || MediaRecorder.isTypeSupported('video/mp4;codecs=h264') || MediaRecorder.isTypeSupported('video/mp4;codecs:h264');
        let mp4Label = document.createElement('LABEL');
        recordingFormats.appendChild(mp4Label);
        let mp4Checkbox = document.createElement('INPUT');
        mp4Checkbox.type = 'radio';
        mp4Checkbox.name = 'recFormat';
        mp4Checkbox.checked = mp4IsSupported ? true : false;
        mp4Label.appendChild(mp4Checkbox);
        let mp4LabelText= document.createElement('SPAN');
        mp4LabelText.innerHTML = 'mp4';
        mp4Label.appendChild(mp4LabelText);

        let webmIsSupported = (MediaRecorder.isTypeSupported('video/webm;codecs=h264') || MediaRecorder.isTypeSupported('video/webm;codecs:h264'));
        let webmLabel = document.createElement('LABEL');
        recordingFormats.appendChild(webmLabel);
        let webmCheckbox = document.createElement('INPUT');
        webmCheckbox.type = 'radio';
        webmCheckbox.name = 'recFormat';
        webmCheckbox.checked = !mp4IsSupported && webmIsSupported ? true : false;
        webmLabel.appendChild(webmCheckbox);
        let webmLabelText= document.createElement('SPAN');
        webmLabelText.innerHTML = 'webm';
        webmLabel.appendChild(webmLabelText);

        if(!mp4IsSupported) {
            mp4Label.classList.add('Q_disabled');
        }
        if(!webmIsSupported) {
            webmLabel.classList.add('Q_disabled');
        }
        if(!mp4IsSupported && !webmIsSupported) {
            startLocalRecBtn.classList.add('Q_disabled');
        } */

        /* Q.activate(
            Q.Tool.setUpElement(
                dropDownArrCon,
                "Media/webrtc/popupDialog",
                {
                    content: settingsEl,
                    triggerOn: 'lmb',
                    className: 'live-editor-rec-server-dropdown',
                    parent: recordingCon
                }
            ),
            {},
            function () {

            }
        ); */

        startButtonTextCon.addEventListener('click', function () {

            if (tool.state.localRecording.state != 'active') {
                updateRecordingState('pending');
                checkStorageQuotaBeforeRecording()
                    .then(function (fileHandle) {
                        return startRecording(fileHandle);
                    })
                    .then(function () {
                        updateRecordingState('active');
                    })
                    .catch(function (error) {
                        if (error === 'cancelled') {
                            // user dismissed the low storage warning, or chose to stop
                            // entirely after one of video/audio recording failed to start
                            updateRecordingState('inactive');
                            return;
                        }
                        cancelAllActiveRecordings();
                        tool.webrtcUserInterface.notice.show(Q.getObject("webrtc.notices.errorWhileStartingRecording", tool.text) || 'Error while starting recording');
                        updateRecordingState('inactive');
                        console.error(error);
                    });

            } else {
                updateRecordingState('pending');
                stopRecording().then(function () {
                    updateRecordingState('inactive');
                });
            }

        })

        var LOW_STORAGE_WARNING_THRESHOLD_MB = 4560;

        function estimateAvailableStorageMB() {
            return new Promise(async function (resolve) {
                if (!navigator.storage || !navigator.storage.estimate) {
                    return resolve(null);
                }
                try {
                    var estimate = await navigator.storage.estimate();
                    resolve(((estimate.quota || 0) - (estimate.usage || 0)) / 1_000_000);
                } catch (error) {
                    console.error('estimateAvailableStorageMB failed', error);
                    resolve(null);
                }
            });
        }

        // Checks OPFS storage quota before recording starts. Resolves with a
        // FileSystemFileHandle if the user picked a disk location instead,
        // or with undefined if there's enough space or the user chose to
        // continue recording to browser storage anyway.
        function checkStorageQuotaBeforeRecording() {
            return estimateAvailableStorageMB().then(function (availableMB) {
                if (availableMB === null || availableMB >= LOW_STORAGE_WARNING_THRESHOLD_MB) {
                    return;
                }

                return new Promise(function (resolve, reject) {
                    showLowStorageDialog(availableMB, resolve, reject);
                });
            });
        }

        function showLowStorageDialog(availableMB, resolve, reject) {
            var canvasSize = tool.canvasComposer.videoComposer.getCanvasSize();
            var totalBitrate = (recordingParams.recording.video ? (recordingParams.bitrate.video || 0) : 0)
                + (recordingParams.recording.audio ? (recordingParams.bitrate.audio || 0) : 0);
            var mbPerMinute = parseFloat(calculateSize(totalBitrate, canvasSize, 1)) || 0;
            var minutesLeft = mbPerMinute > 0 ? (availableMB / mbPerMinute) : 0;

            var container = document.createElement('DIV');
            container.className = 'live-editor-rec-low-storage-warning';

            var message = document.createElement('P');
            message.innerHTML = 'Your browser has very little storage quota left to keep recording: about '
                + Math.max(0, Math.round(availableMB)) + ' MB (~' + Math.max(0, minutesLeft).toFixed(1) + ' min) remaining. '
                + 'You can continue recording to browser storage, or save the recording directly to a location on your disk.';
            container.appendChild(message);

            var buttonsCon = document.createElement('DIV');
            buttonsCon.className = 'live-editor-rec-low-storage-warning-buttons';
            container.appendChild(buttonsCon);

            var continueBtn = document.createElement('BUTTON');
            continueBtn.className = 'livestream_button live-editor-rec-continue-anyway-btn';
            continueBtn.innerHTML = 'Continue anyway';
            buttonsCon.appendChild(continueBtn);

            var saveOnDiskBtn = document.createElement('BUTTON');
            saveOnDiskBtn.className = 'livestream_button live-editor-rec-save-on-disk-btn';
            saveOnDiskBtn.innerHTML = 'Save on disk';
            buttonsCon.appendChild(saveOnDiskBtn);

            if (!window.showSaveFilePicker) {
                saveOnDiskBtn.classList.add('Q_disabled');
            }

            var settled = false;

            var dialog = Q.Dialogs.push({
                title: "Storage quota warning",
                content: container,
				className: "Assets_Payment_status",
                onClose: function () {
                    if (!settled) {
                        settled = true;
                        reject('cancelled');
                    }
                }
            });

            continueBtn.addEventListener('click', function () {
                settled = true;
                Q.Dialogs.close(dialog);
                resolve();
            });

            saveOnDiskBtn.addEventListener('click', async function () {
                if (!window.showSaveFilePicker) {
                    return;
                }
                try {
                    var fileHandle = await window.showSaveFilePicker({
                        suggestedName: generateFileName(),
                        types: [{
                            description: 'Video recording',
                            accept: {
                                'video/mp4': ['.mp4']
                            }
                        }]
                    });
                    settled = true;
                    Q.Dialogs.close(dialog);
                    resolve(fileHandle);
                } catch (error) {
                    console.error('showLowStorageDialog: showSaveFilePicker failed or cancelled', error);
                }
            });
        }

        function generateFileName(prefix = 'Recording') {
            const now = new Date();

            const pad = (value) => String(value).padStart(2, '0');

            return `${prefix}_${now.getFullYear()
                }-${pad(now.getMonth() + 1)
                }-${pad(now.getDate())
                }_${pad(now.getHours())
                }-${pad(now.getMinutes())
                }-${pad(now.getSeconds())
                }`;
        }

        function calculateSize(
            bitrate,
            { width, height } = {},
            minutes = 1
        ) {
            // File size is determined by bitrate and duration.
            // width/height are accepted for API consistency but are not used
            // when a fixed bitrate is provided.

            const seconds = minutes * 60;
            const bytes = (bitrate * seconds) / 8;

            // Decimal MB (1 MB = 1,000,000 bytes)
            return (bytes / 1_000_000).toFixed(1);
        }

        function getRecommendedVideoBitrate({
            width,
            height,
            fps = 30,
        }) {
            const maxDimension = Math.max(width, height);

            let targetBitrate;

            // Base recommendations for ~30 FPS.
            if (maxDimension <= 1280) {
                targetBitrate = 5_242_880;
            } else if (maxDimension <= 1920) {
                targetBitrate = 10_485_760;
            } else if (maxDimension <= 2560) {
                targetBitrate = 25_165_824;
            } else {
                targetBitrate = 50_331_648;
            }

            // FPS adjustments.
            if (fps > 60) {
                targetBitrate *= 2;
            } else if (fps > 30) {
                targetBitrate *= 1.5;
            }

            // Return the nearest bitrate from VIDEO_BITRATES
            // that is >= the target.
            return (
                VIDEO_BITRATES.find(
                    (bitrate) => bitrate >= targetBitrate
                ) ??
                VIDEO_BITRATES[VIDEO_BITRATES.length - 1]
            );
        }

        function generateSettings() {            

            var canvasSize = tool.canvasComposer.videoComposer.getCanvasSize();

            const recommendedVideoBitrate = getRecommendedVideoBitrate({ width: canvasSize.width, height: canvasSize.height, fps: 30 });

            const VIDEO_BITRATE_OPTIONS = VIDEO_BITRATES.map((bitrate) => ({
                bitrate,
                caption:
                    `${Math.round(bitrate / 1024 / 1024)} Mbps` +
                    ` (1 min is ~${calculateSize(
                        bitrate,
                        { width: canvasSize.width, height: canvasSize.height },
                        1
                    )} MB)`,
                default: bitrate == recommendedVideoBitrate
            }));

            const AUDIO_BITRATE_OPTIONS = [
                {
                    bitrate: 64_000,
                    caption: '64 kbps',
                },
                {
                    bitrate: 96_000,
                    caption: '96 kbps',
                },
                {
                    bitrate: 128_000,
                    caption: '128 kbps',
                },
                {
                    bitrate: 160_000,
                    caption: '160 kbps',
                },
                {
                    bitrate: 192_000,
                    caption: '192 kbps',
                    default: true
                },
                {
                    bitrate: 256_000,
                    caption: '256 kbps',
                },
                {
                    bitrate: 320_000,
                    caption: '320 kbps',
                },
            ];

            let bitrateOptions = [
                {
                    type: 'video',
                    label: 'Video bitrate',
                    options: VIDEO_BITRATE_OPTIONS
                },
                {
                    type: 'audio',
                    label: 'Audio bitrate',
                    options: AUDIO_BITRATE_OPTIONS
                }
            ]

            let recordingSettings = document.createElement('DIV');
            recordingSettings.className = 'live-editor-stream-to-section-conf';
            /* let locationParam = document.createElement('DIV');
            locationParam.className = 'live-editor-rec-settings-param live-editor-rec-settings-location';
            recordingSettings.appendChild(locationParam); */
            let kindParam = document.createElement('DIV');
            kindParam.className = 'live-editor-rec-settings-param live-editor-rec-settings-kind';
            recordingSettings.appendChild(kindParam);
            [
                { kind: 'video', caption: 'Video', checked: recordingParams.recording.video }, 
                { kind: 'audio', caption: 'Audio',  checked: recordingParams.recording.audio },
                { kind: 'transcript', caption: 'Transcript',  checked: recordingParams.recording.transcript },
            
            ].forEach(function (kindItem) {
                let kindParamType = document.createElement('LABEL');
                kindParam.appendChild(kindParamType);
                let kindParamTypeInput = document.createElement('INPUT');
                kindParamTypeInput.value = kindItem.kind;
                if(kindItem.checked) kindParamTypeInput.checked = true;
                kindParamTypeInput.type = 'checkbox';
                kindParamType.appendChild(kindParamTypeInput);

                kindParamTypeInput.addEventListener('change', function (e) {
                    recordingParams.recording[kindItem.kind] = e.target.checked;
                })

                let kindParamTypeCaption = document.createElement('DIV');
                kindParamTypeCaption.innerHTML = kindItem.caption
                kindParamType.appendChild(kindParamTypeCaption);
            })

            bitrateOptions.forEach(function (type) {
                let bitrateParam = document.createElement('DIV');
                bitrateParam.className = 'live-editor-rec-settings-param live-editor-rec-settings-bitrate';
                recordingSettings.appendChild(bitrateParam);
                let bitrateParamCaption = document.createElement('DIV');
                bitrateParamCaption.className = 'live-editor-rec-settings-caption';
                bitrateParamCaption.innerText = type.label;
                bitrateParam.appendChild(bitrateParamCaption);
                let bitrateParamSelect = document.createElement('SELECT');
                bitrateParam.appendChild(bitrateParamSelect);
                type.options.forEach(function (value) {
                    let option = document.createElement('OPTION');
                    option.value = value.bitrate;
                    option.innerHTML = value.caption;
                    if (value.default) {
                        option.selected = true;
                        recordingParams.bitrate[type.type] = value.bitrate;
                    }
                    bitrateParamSelect.appendChild(option);
                });
                recordingSettings.appendChild(bitrateParam);

                bitrateParamSelect.addEventListener('change', function (e) {
                    recordingParams.bitrate[type.type] = parseInt(e.target.value);
                })
            })


            let transcriptLangs = getSupportedSpeechRecognitionLanguages();
            let transcriptLangParam = document.createElement('DIV');
            transcriptLangParam.className = 'live-editor-rec-settings-param live-editor-rec-settings-lang';
            recordingSettings.appendChild(transcriptLangParam);
            let transcriptLangParamCaption = document.createElement('DIV');
            transcriptLangParamCaption.className = 'live-editor-rec-settings-caption';
            transcriptLangParamCaption.innerText = 'Transcript language';
            transcriptLangParam.appendChild(transcriptLangParamCaption);
            let transcriptLangParamSelect = document.createElement('SELECT');
            transcriptLangParam.appendChild(transcriptLangParamSelect);
            transcriptLangs.forEach(function (value) {
                let option = document.createElement('OPTION');
                option.value = value.lang;
                option.innerHTML = value.langString;
                if (value.default) {
                    option.selected = true;
                    recordingParams.transcriptLang = value.lang;
                }
                transcriptLangParamSelect.appendChild(option);
            });
            recordingSettings.appendChild(transcriptLangParam);


            transcriptLangParamSelect.addEventListener('change', function (e) {
                recordingParams.transcriptLang = e.target.value;
            })

            return recordingSettings;
        }

        var _activeRecorderKinds = { video: false, audio: false };

        function getSupportedVideoCodecs() {
            if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264') || MediaRecorder.isTypeSupported('video/mp4;codecs:h264')) {
                return MediaRecorder.isTypeSupported('video/mp4;codecs=h264') ? 'video/mp4;codecs=h264' : 'video/mp4;codecs:h264';
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264') || MediaRecorder.isTypeSupported('video/webm;codecs:h264')) {
                return MediaRecorder.isTypeSupported('video/webm;codecs=h264') ? 'video/webm;codecs=h264' : 'video/webm;codecs:h264';
            }
        }

        function getSupportedAudioCodecs() {
            if (MediaRecorder.isTypeSupported('audio/mp4')) {
                return 'audio/mp4';
            } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                return 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                return 'audio/webm';
            }
        }

        function cancelAllActiveRecordings() {
            if (_activeRecorderKinds.video) {
                tool.videoRecorder.cancelRecording();
                _activeRecorderKinds.video = false;
            }
            if (_activeRecorderKinds.audio) {
                tool.audioRecorder.cancelRecording();
                _activeRecorderKinds.audio = false;
            }
        }

        function startVideoRecording(fileHandle) {
            return new Promise(function (resolve, reject) {
                try {
                    tool.videoRecorder.startRecording({
                        subtitles: false, //disabled for now due to bug of 100% cpu usage
                        mediabunnyRecorder: false, //mp4Checkbox.checked && mp4MuxerRecordingSupported
                        mediaRecorderCodecs: getSupportedVideoCodecs(),
                        videoBitrate: recordingParams.bitrate.video,
                        audioBitrate: recordingParams.bitrate.audio,
                        fileHandle: fileHandle || null,
                        fileName: fileHandle ? fileHandle.name : generateFileName(),
                        onRequestStop: function () {
                            updateRecordingState('pending');
                            stopRecording().then(function () {
                                updateRecordingState('inactive');
                            });
                        }
                    })
                        .then(function () {
                            if (recordingParams.recording.transcript) {
                                try {
                                    tool.speechRecognizer = new Q.Media.WebRTC.livestreaming.RoomSpeechRecognizer({
                                        lang: recordingParams.transcriptLang,
                                        webrtcSignalingLib: tool.webrtcSignalingLib,
                                        startTimeSinceOrigin: tool.videoRecorder.startTimeSinceOrigin,
                                        onSegment: function (e) {
                                            //console.log('speechRecognizer onSegment')
                                            //if(e.segment) tool.videoRecorder.addSubtitle(e.formatted);
                                        }
                                    })
                                    tool.speechRecognizer.start();
                                } catch (error) {
                                    tool.videoRecorder.cancelRecording();
                                    return reject(error);
                                }
                            }
                            resolve();
                        })
                        .catch(function (error) {
                            reject(error);
                            return;
                        });
                } catch (error) {
                    reject(error);
                    return;
                }
            });
        }

        function startAudioRecording() {
            return new Promise(function (resolve, reject) {
                try {
                    tool.audioRecorder.startRecording({
                        subtitles: false,
                        mediabunnyRecorder: false,
                        mediaRecorderCodecs: getSupportedAudioCodecs(),
                        audioBitrate: recordingParams.bitrate.audio,
                        fileName: generateFileName('capture_audio'),
                        onRequestStop: function () {
                            updateRecordingState('pending');
                            stopRecording().then(function () {
                                updateRecordingState('inactive');
                            });
                        }
                    })
                        .then(function () {
                            resolve();
                        })
                        .catch(function (error) {
                            reject(error);
                        });
                } catch (error) {
                    reject(error);
                }
            });
        }

        function showPartialRecordingFailureDialog(failedKind) {
            return new Promise(function (resolve) {
                var succeededKind = failedKind == 'video' ? 'audio' : 'video';

                var container = document.createElement('DIV');
                container.className = 'live-editor-rec-partial-failure-warning';

                var message = document.createElement('P');
                message.innerHTML = 'The ' + failedKind + ' recording failed to start. '
                    + 'You can continue with just the ' + succeededKind + ' recording, or stop recording entirely.';
                container.appendChild(message);

                var buttonsCon = document.createElement('DIV');
                buttonsCon.className = 'live-editor-rec-low-storage-warning-buttons';
                container.appendChild(buttonsCon);

                var continueBtn = document.createElement('BUTTON');
                continueBtn.className = 'livestream_button';
                continueBtn.innerHTML = 'Continue';
                buttonsCon.appendChild(continueBtn);

                var stopBtn = document.createElement('BUTTON');
                stopBtn.className = 'livestream_button';
                stopBtn.innerHTML = 'Stop';
                buttonsCon.appendChild(stopBtn);

                var dialog = Q.Dialogs.push({
                    title: "Recording failed to start",
                    content: container,
                    onClose: function () {
                        resolve('stop');
                    }
                });

                continueBtn.addEventListener('click', function () {
                    Q.Dialogs.close(dialog);
                    resolve('continue');
                });

                stopBtn.addEventListener('click', function () {
                    Q.Dialogs.close(dialog);
                    resolve('stop');
                });
            });
        }

        function startRecording(fileHandle) {
            return new Promise(function (resolve, reject) {
                var starts = [];

                if (recordingParams.recording.video) {
                    starts.push({ kind: 'video', promise: startVideoRecording(fileHandle) });
                }
                if (recordingParams.recording.audio) {
                    starts.push({ kind: 'audio', promise: startAudioRecording() });
                }

                if (!starts.length) {
                    reject('No recording kind selected');
                    return;
                }

                Promise.allSettled(starts.map(function (s) { return s.promise; }))
                    .then(function (results) {
                        var succeeded = [];
                        var failed = [];

                        results.forEach(function (result, i) {
                            var kind = starts[i].kind;
                            if (result.status == 'fulfilled') {
                                succeeded.push(kind);
                                _activeRecorderKinds[kind] = true;
                            } else {
                                failed.push({ kind: kind, error: result.reason });
                            }
                        });

                        if (!failed.length) {
                            return resolve();
                        }

                        if (!succeeded.length) {
                            return reject(failed[0].error);
                        }

                        // Partial failure: one kind started, the other didn't.
                        showPartialRecordingFailureDialog(failed[0].kind).then(function (action) {
                            if (action == 'continue') {
                                resolve();
                            } else {
                                cancelAllActiveRecordings();
                                reject('cancelled');
                            }
                        });
                    });
            });
        }

        function stopVideoRecording() {
            return new Promise(function (resolve) {
                if (tool.speechRecognizer) {
                    //await tool.videoRecorder.patchCaptions(tool.speechRecognizer.exportWebVTT());
                    tool.videoRecorder.stopRecording()
                        .then(function (recordingData) {
                            if (tool.speechRecognizer) {
                                tool.speechRecognizer.stop();
                                //tool.videoRecorder.patchCaptions(tool.speechRecognizer.exportWebVTT());
                                //console.log('speechRecognizer srt', tool.speechRecognizer.exportJSON())
                                tool.speechRecognizer.downloadVtt(recordingData.baseName);
                            }

                            resolve();
                        })
                        .catch(function (e) {
                            console.error(e);
                            tool.webrtcUserInterface.notice.show(Q.getObject("webrtc.notices.errorWhileStoppingRecording", tool.text) || 'Error while stopping recording occured');
                            resolve(e);
                        });

                } else {

                    tool.videoRecorder.stopRecording()
                        .then(function (recordingData) {
                            resolve();
                        })
                        .catch(function (e) {
                            console.error(e);
                            tool.webrtcUserInterface.notice.show(Q.getObject("webrtc.notices.errorWhileStoppingRecording", tool.text) || 'Error while stopping recording occured');
                            resolve();
                        });
                }
            });
        }

        function stopAudioRecording() {
            return new Promise(function (resolve) {
                tool.audioRecorder.stopRecording()
                    .then(function (recordingData) {
                        resolve();
                    })
                    .catch(function (e) {
                        console.error(e);
                        tool.webrtcUserInterface.notice.show(Q.getObject("webrtc.notices.errorWhileStoppingRecording", tool.text) || 'Error while stopping recording occured');
                        resolve();
                    });
            });
        }

        function stopRecording() {
            return new Promise(async function (resolve, reject) {
                var stops = [];

                if (_activeRecorderKinds.video) {
                    stops.push(stopVideoRecording());
                }
                if (_activeRecorderKinds.audio) {
                    stops.push(stopAudioRecording());
                }

                _activeRecorderKinds.video = false;
                _activeRecorderKinds.audio = false;

                await Promise.allSettled(stops);
                resolve();
            });
        }

        function updateRecordingState(state) {
            tool.state.localRecording.state = state;
            updateRecordingUI();
        }

        function updateRecordingUI() {
            if (tool.state.localRecording.state == 'pending') {
                startLocRecordingBtn.classList.add('Q_working');
                thisInstance.settingsEl.classList.add('live-editor-disabled');
            } else if (tool.state.localRecording.state == 'active') {
                startLocRecordingBtn.classList.remove('Q_working');
                startLocRecordingBtn.classList.add('live-editor-rec-start-btn-active');
                thisInstance.settingsEl.classList.add('live-editor-disabled');
                startButtonText.innerHTML = 'Stop Recording';
                startButtonTimer.innerHTML = '';
                tool.streamingAndRecording.showLiveIndicator('rec');
                tool.state.localRecording.active = true;
                //tool.state.localRecording.sendingToServer = recordingStream ? true : false;
                tool.state.localRecording.pending = false;
                _localRecordingTimer = new Timer(startButtonTimer);
                _localRecordingTimer.start();
            } else { //inactive
                startLocRecordingBtn.classList.remove('Q_working');
                thisInstance.settingsEl.classList.remove('live-editor-disabled');
                startLocRecordingBtn.classList.remove('live-editor-rec-start-btn-active');
                startButtonText.innerHTML = 'Start Recording';
                startButtonTimer.innerHTML = '';
                tool.streamingAndRecording.updateSourcesControlPanel();
                tool.streamingAndRecording.hideLiveIndicator('rec');

                if (_localRecordingTimer) {
                    _localRecordingTimer.stop();
                    _localRecordingTimer = null;
                }
            }
        }

        function createRecordingStream() {
            return new Promise(function (resolve, reject) {
                Q.req("Media/recording", ["recording"], function (err, response) {
                    var msg = Q.firstErrorMessage(err, response && response.errors);

                    if (msg) {
                        reject(msg);
                        return;
                    }

                    resolve(response.slots.recording.recordingStream);
                }, {
                    method: 'post',
                    fields: {
                        publisherId: tool.webrtcUserInterface.roomStream().fields.publisherId,
                        streamName: tool.webrtcUserInterface.roomStream().fields.name
                    }
                });
            });
        }

        getRecordingsBtn.addEventListener('click', function () {
            Q.Dialogs.push({
                title: 'My Recordings',
                className: 'live-editor-recordings-dialog',
                content: Q.Tool.setUpElement(
                    "DIV",
                    "Media/webrtc/recordings",
                    {
                        publisherId: tool.webrtcUserInterface.roomStream().fields.publisherId,
                        streamName: tool.webrtcUserInterface.roomStream().fields.name,
                    }
                ),
                apply: false
            });
        });


        function Timer(element) {
            var timerInstance = this;
            this.element = element;
            this.startTime = null;
            this.intervalId = null;

            this.start = function () {
                if (timerInstance.intervalId === null) {
                    timerInstance.startTime = Date.now();
                    timerInstance.intervalId = setInterval(function () {
                        timerInstance.updateTime()
                    }, 1000);
                }
            }

            this.stop = function () {
                if (timerInstance.intervalId !== null) {
                    clearInterval(timerInstance.intervalId);
                    timerInstance.intervalId = null;
                }
            }

            this.updateTime = function () {
                const currentTime = Date.now();
                const elapsedTime = Math.floor((currentTime - timerInstance.startTime) / 1000);
                const hours = Math.floor(elapsedTime / 3600);
                const minutes = Math.floor((elapsedTime % 3600) / 60);
                const seconds = elapsedTime % 60;

                timerInstance.element.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }


        return recordingCon;
    }

    createSectionElement();
}