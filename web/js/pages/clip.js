Q.page('Media/clip', function () {
	var $mediaEpisodes = $(".Streams_related_tool.Media_episodes");
	if (!$mediaEpisodes.length) {
		throw new Q.Error("Media episodes category doesn't found");
	}

	var mediaEpisodesTool = Q.Tool.from($mediaEpisodes[0], "Streams/related");
	if (!mediaEpisodesTool) {
		throw new Q.Error("Media episodes category tool doesn't found");
	}

	var selectedClipId = Q.getObject("Media.clip.selectedClipId", Q);
	var openFirstClip = Q.getObject("Media.clip.openFirstClip", Q);
	var expanded = false;
	// select item and expand
	mediaEpisodesTool.element.forEachTool(function () {
        var previewTool = Q.Tool.from(this.element, "Streams/preview");
		var expandable = Q.Tool.from(this.element, "Q/expandable");
		var episodePreview = Q.Tool.from(this.element, "Media/episode/preview");

		// Streams/preview and Q/expandable should be activated
		if (!(previewTool /*&& expandable */&& episodePreview && episodePreview.stream)) {
			return;
		}
		var previewState = previewTool.state;

        if (!expanded && previewState.publisherId && previewState.streamName) {
            if (selectedClipId && previewState.streamName.endsWith(selectedClipId)) {
				if(expandable) expandable.expand();
				if ($(".Q_columns_tool .Q_columns_column").length < 2 && episodePreview.stream) {
					episodePreview.openFullEpisode();
				}
				expanded = true;
			} else if (!selectedClipId && ((Q.info.isMobile && openFirstClip.mobile) || (!Q.info.isMobile && openFirstClip.desktop))) {
				if (expandable && openFirstClip.expand)  {
					expandable.expand();
				}
				if(episodePreview.stream) episodePreview.openFullEpisode();
				expanded = true;
			}
		}

	}, mediaEpisodesTool);

	var userId = Q.Users.loggedInUserId();
	if (userId) {
		var $button = $('button.Media_newEpisode');
		var title = $button.text();
		$button.tool("Streams/preview", {
			publisherId: userId,
			closeable: false,
			editable: false,
			related: {
				publisherId: Q.Users.communityId,
				streamName: mediaEpisodesTool.state.streamName,
				type: mediaEpisodesTool.state.relationType
			},
			creatable: {
				title: title,
				clickable: false,
				addIconSize: 0,
				streamType: "Media/episode"
			}
		}).tool("Media/episode/preview").activate();
	}

	return function () {
		expanded = false;
	}
}, "Media/clip");