(function (Q, $) {
    /**
     * Media Tools
     * @module Media-tools
     * @main
     */
    var Streams = Q.Streams;

    /**
     * Interface for searching clips using fulltext index
     * @class Media/clip/search
     * @constructor
     */
    Q.Tool.define("Media/clip/search", function(options) {
        var tool = this;

        tool.element.innerHTML = '';
        tool.resutlsElement = document.querySelector('.' + tool.state.resultsElementClass);
        tool.hideElement = document.querySelector('.' + tool.state.hideElementOnResult);

        tool.sendSearchRequest = Q.debounce(async function (query) {
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

            var streams = results.result.map(function (item) {
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

            streams.forEach(function (stream) {
                Q.activate(
                    Q.Tool.setUpElement('DIV', ['Streams/preview', 'Media/episode/preview'], {
                        publisherId: stream.fields.publisherId,
                        streamName: stream.fields.name,
                        stream: stream,
                        editable: false,
                        closable: false,
                        creatable: false,
                        layout: 'cards',
                        previewOptions: {
                            previewType: 'Media/episode/preview',
                             layout: 'cards',
                        },
                        specificOptions: {
                            previewType: 'Media/episode/preview',
                             layout: 'cards',
                        }
                }),
                    {
                        layout: 'cards'
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
            
        }, 300);

        if(!tool.state.inited) tool.buildUI();
    }, {
        dontShowMontage: true,
        currentSearchResult: []
    }, {
        refresh: function () {
            const tool = this;
        },
        buildUI: function () {
            const tool = this;
            tool.state.inited = true;
            let container = tool.container = document.createElement('DIV');
            container.className = 'Media_clip_search';

            let innerContainer = document.createElement('DIV');
            innerContainer.className = 'Media_clip_search_container';
            container.appendChild(innerContainer);

            let regularUI = document.createElement('DIV');
            regularUI.className = 'Media_clip_search_regular';
            innerContainer.appendChild(regularUI);

            let clipsTitle = document.createElement('H2');
            clipsTitle.className = 'Media_clip_search_title';
            clipsTitle.innerHTML = 'Episodes';
            regularUI.appendChild(clipsTitle);

            let icons = document.createElement('DIV');
            icons.className = 'Media_clip_search_icons';
            regularUI.appendChild(icons);

            let searchIcon = document.createElement('DIV');
            searchIcon.className = 'Media_clip_search_icons_item Media_clip_search_icons_search';
            icons.appendChild(searchIcon);
            searchIcon.addEventListener('click', toggleState)

            let searchBar = document.createElement('DIV');
            searchBar.className = 'Media_clip_search_input_bar';
            innerContainer.appendChild(searchBar);
            let searchInput = document.createElement('INPUT');
            searchInput.className = 'Media_clip_search_input_field';
            searchInput.placeholder = 'Filter clips';
            searchInput.type = 'text';
            searchBar.appendChild(searchInput);

            container.addEventListener("transitionend", function () {
                if(container.classList.contains('Media_clip_search_active')) {
                    searchInput.focus();
                }
            });

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
            })

            let searchStateIcons = document.createElement('DIV');
            searchStateIcons.className = 'Media_clip_search_icons';
            searchBar.appendChild(searchStateIcons);

            let closeIcon = document.createElement('DIV');
            closeIcon.className = 'Media_clip_search_icons_item Media_clip_search_icons_close';
            searchStateIcons.appendChild(closeIcon);
            closeIcon.addEventListener('click', toggleState)

            tool.element.appendChild(container);

            function toggleState() {
                if(container.classList.contains('Media_clip_search_active')) {
                    container.classList.remove('Media_clip_search_active');
                    tool.updateSearchResultsElement('regular');
                    tool.hideOrShowMainClipList('show'); 
                } else {
                    container.classList.add('Media_clip_search_active');
                }
            }
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