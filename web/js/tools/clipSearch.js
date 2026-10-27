(function (Q, $) {
    /**
     * Media Tools
     * @module Media-tools
     * @main
     */
    var Streams = Q.Streams;

    Q.Template.set("Media/clip/search/searchAndColumnTitle", `
<div class="Media_clip_search_container">
    <div class="Media_clip_search_regular">
        <h2 class="Media_clip_search_title">{{title}}</h2>
        <div class="Media_clip_search_icons">
            <div class="Media_clip_search_icons_item Media_clip_search_icons_search"></div>
        </div>
    </div>
    <div class="Media_clip_search_input_bar">
        <input class="Media_clip_search_input_field" type="text" placeholder="{{placeholder}}">
        <div class="Media_clip_search_icons">
            <div class="Media_clip_search_icons_item Media_clip_search_icons_close"></div>
        </div>
    </div>
</div>`);

    Q.Template.set("Media/clip/search/searchBarOnly", `
<div class="Media_clip_search_container">
    <div class="Media_clip_search_input_bar">
        <div class="Media_clip_search_icons">
            <div class="Media_clip_search_icons_item Media_clip_search_icons_search"></div>
        </div>
        <input class="Media_clip_search_input_field" type="text" placeholder="{{placeholder}}">
    </div>
</div>`);

    /**
     * Interface for searching clips using fulltext index
     * @class Media/clip/search
     * @constructor
     * @param {Object} [options] options to pass besides the ones to Streams/preview tool
     * @param {String} [options.layout="searchAndColumnTitle"] Can be "searchAndColumnTitle"
     *   (a column-title-style header: shows a page title by default, with a search icon
     *   that reveals the search bar in its place) or "searchBarOnly" (the search bar --
     *   input plus search icon, nothing else -- is always shown, with no title and
     *   nothing to reveal/toggle). Defaults to the app-wide config
     *   Media.clip.clipSearchLayout (set by Media_before_Q_responseExtras from
     *   Q_Config -- "searchAndColumnTitle" on the platform, overridden to
     *   "searchBarOnly" in Fans's own local/app.json) rather than a fixed value.
     * @param {String} [options.title="Episodes"] Title shown by the "searchAndColumnTitle" layout.
     * @param {String} [options.placeholder="Filter clips"] Placeholder text for the search input.
     * @param {String} [options.resultsElementClass] Class name of the element search results
     *   get appended into. If not found on the page, results just aren't rendered anywhere.
     * @param {String} [options.hideElementOnResult] Class name of an element to hide while
     *   search results are showing (e.g. the main unfiltered clips list), shown again after.
     */
    Q.Tool.define("Media/clip/search", function(options) {
        var tool = this;

        tool.element.innerHTML = '';
        

        // Named separately from the debounced wrapper below so the Enter-key
        // handler in buildUI() can trigger a search immediately (bypassing
        // the 300ms debounce) instead of just restarting the debounce timer.
        tool.performSearch = async function (query) {
            tool.resutlsElement = tool.state.resultsElementClass
                ? document.querySelector('.' + tool.state.resultsElementClass)
                : null;
            tool.hideElement = tool.state.hideElementOnResult
                ? document.querySelector('.' + tool.state.hideElementOnResult)
                : null;

            tool.searchRequestId = Q.uuid('Media/clips/' + Date.now());
            const requestId = tool.searchRequestId;
            let results;
            try {
                results = await tool.makeSearchRequest(query);
            } catch (e) {
                tool.updateSearchResultsElement('notFound', e.toString());
                return;
            }

            if (requestId !== tool.searchRequestId) {
                return;
            }

            var items = results.result;
            var streams = items.map(function (item) {
                return new Q.Streams.Stream(item.fields);
            });

            if(streams.length == 0) {
                if(tool.searchInProgress) {
                    tool.updateSearchResultsElement('notFound', 'No results for "' + query + '"');
                } else {
                    tool.updateSearchResultsElement('regular');
                }
                return;
            }

            tool.searchInProgress = false;
            tool.updateSearchResultsElement('found');
            tool.hideOrShowMainClipList('hide');

            // Config-driven, app-specific opt-in: "cards" everywhere by
            // default, "searchResultCard" (YouTube-search-result-style row)
            // for Fans via Media.clip.clipSearchResultLayout in its own
            // local/app.json -- same wiring pattern as episodePreviewLayout.
            var resultLayout = Q.getObject("Media.clip.clipSearchResultLayout", Q.plugins) || "cards";

            streams.forEach(function (stream, i) {
                // Not derivable from the stream itself -- see Media/episode/preview.js's
                // own "viewsCount" option doc comment -- so threaded through here from
                // the search response (Media/clips/response/search.php).
                // Db_Row's magic __set() folds any extra SELECT columns
                // (like this one) into .fields alongside the real model
                // fields, not onto the item itself -- confirmed by
                // inspecting the actual JSON shape search.php returns.
                var viewsCount = items[i] && items[i].fields && items[i].fields.viewsCount;

                Q.activate(
                    Q.Tool.setUpElement('DIV', ['Streams/preview', 'Media/episode/preview'], {
                        publisherId: stream.fields.publisherId,
                        streamName: stream.fields.name,
                        stream: stream,
                        editable: false,
                        closable: false,
                        creatable: false,
                        layout: resultLayout,
                        viewsCount: viewsCount,
                        previewOptions: {
                            previewType: 'Media/episode/preview',
                             layout: resultLayout,
                             viewsCount: viewsCount,
                        },
                        specificOptions: {
                            previewType: 'Media/episode/preview',
                             layout: resultLayout,
                             viewsCount: viewsCount,
                        }
                }),
                    {
                        // This (Q.activate's own options arg), not the
                        // toolOptions passed to Q.Tool.setUpElement above,
                        // is what actually overrides Media/episode/preview's
                        // state here -- confirmed empirically: setUpElement's
                        // multi-tool-array form only applies a bare options
                        // object (as opposed to one already keyed per tool
                        // name) to the FIRST tool name in the array
                        // ('Streams/preview'), leaving the second
                        // ('Media/episode/preview', the one that actually
                        // reads layout/viewsCount) with nothing -- so without
                        // this, layout would silently fall back to whatever
                        // Media.clip.episodePreviewLayout resolves to instead.
                        layout: resultLayout,
                        viewsCount: viewsCount
                    },
                    function () {
                        if (!tool.resutlsElement) {
                            console.warn('No element found for showing search results');
                            return;
                        }

                        tool.state.currentSearchResult.push(this);

                        tool.resutlsElement.appendChild(this.element);
                    }
                );
            });

        };
        tool.sendSearchRequest = Q.debounce(tool.performSearch, 300);

        if(!tool.state.inited) tool.buildUI();
    }, {
        dontShowMontage: true,
        currentSearchResult: [],
        layout: Q.getObject("Media.clip.clipSearchLayout", Q.plugins) || "searchAndColumnTitle",
        title: "Episodes",
        placeholder: "Filter clips",
        resultsElementClass: null,
        hideElementOnResult: null
    }, {
        refresh: function () {
            const tool = this;
        },
        buildUI: function () {
            var tool = this;
            var state = tool.state;
            tool.state.inited = true;

            var isSearchBarOnly = (state.layout === 'searchBarOnly');
            var templateName = isSearchBarOnly
                ? 'Media/clip/search/searchBarOnly'
                : 'Media/clip/search/searchAndColumnTitle';

            Q.Template.render(templateName, {
                title: state.title,
                placeholder: state.placeholder
            }, function (err, html) {
                if (err) {
                    return;
                }

                var container = tool.container = document.createElement('DIV');
                container.className = 'Media_clip_search Media_clip_search_layout_' + state.layout;
                container.innerHTML = html;
                tool.element.appendChild(container);

                var searchInput = container.querySelector('.Media_clip_search_input_field');
                var searchIcon = container.querySelector('.Media_clip_search_icons_search');
                var closeIcon = container.querySelector('.Media_clip_search_icons_close');

                function toggleState() {
                    if (container.classList.contains('Media_clip_search_active')) {
                        container.classList.remove('Media_clip_search_active');
                        tool.updateSearchResultsElement('regular');
                        tool.hideOrShowMainClipList('show');
                    } else {
                        container.classList.add('Media_clip_search_active');
                    }
                }

                if (isSearchBarOnly) {
                    // Always shown -- the search icon has nothing to reveal,
                    // just focuses the (already-visible) input.
                    if (searchIcon) {
                        searchIcon.addEventListener('click', function () {
                            searchInput.focus();
                        });
                    }
                } else {
                    container.addEventListener("transitionend", function () {
                        if (container.classList.contains('Media_clip_search_active')) {
                            searchInput.focus();
                        }
                    });
                    if (searchIcon) {
                        searchIcon.addEventListener('click', toggleState);
                    }
                    if (closeIcon) {
                        closeIcon.addEventListener('click', toggleState);
                    }
                }

                searchInput.addEventListener('input', async function(e) {
                    if (searchInput.value.trim() === '' || searchInput.value.trim().length < 3) {
                        tool.updateSearchResultsElement('invalid');
                        tool.hideOrShowMainClipList('show');
                        tool.searchInProgress = false;
                        return;
                    }

                    tool.searchInProgress = true;
                    tool.updateSearchResultsElement('loading');
                    tool.hideOrShowMainClipList('hide');
                    let resutls = tool.sendSearchRequest(searchInput.value);
                });

                searchInput.addEventListener('keydown', function (e) {
                    if (e.key !== 'Enter' || searchInput.value.trim().length < 3) {
                        return;
                    }

                    // Search right away instead of waiting out the 300ms
                    // debounce the 'input' listener above uses while typing.
                    tool.searchInProgress = true;
                    tool.updateSearchResultsElement('loading');
                    tool.hideOrShowMainClipList('hide');
                    tool.performSearch(searchInput.value);
                });
            });
        },
        makeSearchRequest: function (query) {
            var tool = this;
            return new Promise(function (resolve, reject) {
                Q.req("Media/clips", ['search'], function (err, response) {
                    var msg = Q.firstErrorMessage(err, response && response.errors);

                    if (msg) {
                        reject(msg);
                        console.error(msg)
                        return;
                    }
                    resolve(response.slots.search)
                }, {
                    method: 'get',
                    fields: {
                        queryString: query
                    }
                });
            });
        },
        updateSearchResultsElement: function (state, caption) {
            var tool = this;
            tool.state.currentSearchResult.forEach(function (tool) {
                tool.remove();
            });
            tool.state.currentSearchResult = [];

            if (!tool.resutlsElement) {
                return;
            }

            if(state == 'notFound') {
                tool.resutlsElement.innerHTML = caption ? caption : '';
                toggleClass('Media_clips_search_notFound');
            } else if(state == 'found') {
                tool.resutlsElement.innerHTML = '';
                toggleClass();
            } else if(state =='loading') {
                tool.resutlsElement.innerHTML = '<div class="Media_clip_search_loader"></div>';
                toggleClass('Media_clip_search_loading');
            } else {
                toggleClass(null);
                tool.resutlsElement.innerHTML = '';
            }

            function toggleClass(classNameToApply) {
                let classes = ['Media_clip_search_loading', 'Media_clips_search_notFound'];

                classes.forEach(function (name) {
                    if(!classNameToApply || (classNameToApply && name != classNameToApply)) {
                        tool.resutlsElement.classList.remove(name);
                    }
                })
                if(classNameToApply) tool.resutlsElement.classList.add(classNameToApply);
            }
        },
        hideOrShowMainClipList: function (action) {
            var tool = this;

            if(!tool.hideElement) return;

            if(action == 'hide') {
                tool.hideElement.style.display = 'none';
            } else {
                tool.hideElement.style.display = '';
            }
        },
        Q: {
            beforeRemove: function () {

            }
        }
    });


})(Q, Q.jQuery);
