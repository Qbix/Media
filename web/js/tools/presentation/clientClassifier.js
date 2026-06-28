(function (Q, $, window, undefined) {

/**
 * Media/views/Media/presentation/clientClassifier.js
 *
 * Thin client. It does NOT classify. Classification, capture extraction, and
 * ephemeral emission all happen once, on the server (the Streams
 * CommandsClassifier). Running a second classifier in the browser only
 * duplicated that work, and the server emits the ephemerals anyway.
 *
 * The one thing the browser can do that the server can't cheaply is read the
 * text of the PDF pages it has already rendered. So that is all this does: it
 * extracts the page corpus and hands it to the server as context, so the
 * server's classifier can resolve "go to {{query}}" against the actual slides
 * without re-fetching or re-parsing the PDF.
 *
 * On each final transcript chunk, intercept() emits Streams/utterance with the
 * raw text and the current slide index, and -- the first time the corpus is
 * available and whenever it changes -- the extracted pages. The server caches
 * the pages on the session and references them when it runs the classifier.
 *
 * @module Media
 * @class Media.presentation.clientClassifier
 */

Q.Media = Q.Media || {};
Q.Media.ClientClassifier = Q.Media.ClientClassifier || {};

/**
 * @param {Object} options
 * @param {String} options.publisherId
 * @param {String} options.streamName
 * @param {Function} options.qEmit         emits a message up to the server
 * @param {Number} [options.slideIndex=0]
 */
Q.Media.ClientClassifier.create = function (options) {
    var publisherId = options.publisherId;
    var streamName  = options.streamName;
    var qEmit       = options.qEmit;

    var _slideIndex   = options.slideIndex || 0;
    var _pdfCorpus    = {};    // key -> [{ index, text }]
    var _pdfLoading   = {};    // key -> Promise
    var _contextDirty = true;  // resend the corpus to the server next utterance

    // -- PDF page corpus (the only client-only work) -------------------------

    function _pdfKey(pub, name) { return pub + ':' + name; }

    function _loadPdfCorpus(pub, name, url) {
        var key = _pdfKey(pub, name);
        if (_pdfCorpus[key]) return Promise.resolve(_pdfCorpus[key]);
        if (_pdfLoading[key]) return _pdfLoading[key];

        var pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib
            || (window.Q && Q.getObject('PDF.lib'));
        if (!pdfjsLib || !pdfjsLib.getDocument) {
            return Promise.resolve([]);
        }

        var promise = pdfjsLib.getDocument({ url: url }).promise.then(function (doc) {
            var numPages = doc.numPages;
            var pages = [];
            var chain = Promise.resolve();
            for (var i = 1; i <= numPages; i++) {
                (function (pageNum) {
                    chain = chain.then(function () {
                        return doc.getPage(pageNum).then(function (page) {
                            return page.getTextContent().then(function (content) {
                                var text = content.items
                                    .map(function (item) { return item.str; })
                                    .join(' ')
                                    .replace(/\s+/g, ' ')
                                    .trim()
                                    .slice(0, 400);
                                pages.push({ index: pageNum - 1, text: text.toLowerCase() });
                                page.cleanup();
                            });
                        });
                    });
                })(i);
            }
            return chain.then(function () {
                doc.destroy();
                _pdfCorpus[key] = pages;
                delete _pdfLoading[key];
                _contextDirty = true;
                return pages;
            });
        }).catch(function () {
            delete _pdfLoading[key];
            return [];
        });

        _pdfLoading[key] = promise;
        return promise;
    }

    function _loadAllPdfCorpora() {
        return new Promise(function (resolve) {
            Q.Streams.related(
                Q.Users.loggedInUserId(),
                publisherId,
                streamName,
                function (err, result) {
                    if (err || !result || !result.streams) return resolve();
                    var promises = [];
                    Q.each(result.streams, function (i, s) {
                        if (s.fields && s.fields.type === 'Media/pdf') {
                            var url = s.fileUrl ? s.fileUrl() : null;
                            if (url) {
                                promises.push(_loadPdfCorpus(s.fields.publisherId, s.fields.name, url));
                            }
                        }
                    });
                    Promise.all(promises).then(function () { resolve(); });
                }
            );
        });
    }

    // Flatten the corpus for the server, but only when it has changed since the
    // last send. Returns undefined when there's nothing new to ship.
    function _pdfContextDelta() {
        if (!_contextDirty) return undefined;
        var pages = [];
        Q.each(_pdfCorpus, function (key, list) {
            var parts = key.split(':');
            var pub  = parts[0];
            var name = parts.slice(1).join(':');
            list.forEach(function (p) {
                pages.push({ publisherId: pub, streamName: name, index: p.index, text: p.text });
            });
        });
        if (!pages.length) return undefined;
        _contextDirty = false;
        return { pages: pages };
    }

    // start loading the corpus immediately
    _loadAllPdfCorpora();

    // -- Public API ----------------------------------------------------------

    return {

        // Forward a final transcript chunk to the server, attaching the PDF page
        // context (once, and whenever it changes). The server classifies and
        // emits. Returns true so the caller doesn't also emit the utterance.
        intercept: function (text) {
            qEmit('Streams/utterance', {
                transcript: text,
                isFinal:    true,
                speaker:    Q.Users.loggedInUserId(),
                slideIndex: _slideIndex,
                pdf:        _pdfContextDelta()
            });
            return true;
        },

        setState: function (s) {
            if (s && s.slideIndex != null) { _slideIndex = s.slideIndex; }
        },

        // Resolve once the PDF corpus is available (or immediately if none).
        ready: function () { return _loadAllPdfCorpora(); },

        preloadPdfs: function () { return _loadAllPdfCorpora(); },

        // Force the corpus to be re-sent on the next utterance, e.g. after the
        // set of PDFs in the presentation changes.
        refreshContext: function () { _contextDirty = true; }
    };
};

})(Q, Q.jQuery, window);