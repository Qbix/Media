<?php
require_once USERS_PLUGIN_DIR . DS . 'vendor' . DS . 'autoload.php';

/**
 * Class for processing Youtube videos into clips
 *
 * @class Media_YoutubeClipGenerator
 */
class Media_YoutubeClipGenerator
{

    static function makeYoutubeRequest($options)
    {
        $apiKey = Q_Config::expect("Websites", "youtube", "keys", "server");
        $query = Q::ifset($options, "query", null);
        $endPointResource = Q::ifset($options, "endPointResource", null);

        if ($endPointResource === null && $query === null) {
            throw new Exception('Media_YoutubeClipGenerator::makeYoutubeRequest: videoId or query should defined');
        }

        $endPoint = "https://youtube.googleapis.com/youtube/v3/$endPointResource";

        $query["key"] = $apiKey;

        $youtubeApiUrl = $endPoint . '?' . http_build_query($query);
        $result = Q::json_decode(Q_Utils::get($youtubeApiUrl), true);
        if (Q::ifset($result, "error", null)) {
            throw new Exception("Youtube API error: " . Q::ifset($result, "error", "message", null));
        }

        return $result;
    }

    static function getAllChannelsVideo($channelId = null, $options = array(
        'numberToProcess' => INF
    ))
    {
        if ($channelId === null) {
            $channelId = Q_Config::get("Websites", "youtube", "channelId", null);
        }

        $channelData = self::makeYoutubeRequest([
            'query' => [
                'part' => 'contentDetails',
                'id' => $channelId,
            ],
            'endPointResource' => 'channels'
        ]);

        $uploadsPlaylistId =  Q::ifset($channelData, "items", 0, "contentDetails", "relatedPlaylists", "uploads", null);

        if ($uploadsPlaylistId === null) {
            throw new Exception('Media_YoutubeClipGenerator::getAllChannelsVideo: playlist with uploads not found');
        }

        $videos = [];
        $nextPageToken = null;
        do {
            error_log('getAllChannelsVideo fetch playlist: ' . $uploadsPlaylistId, 4); 
            // Build query parameters dynamically
            $queryParams = [
                'part'       => 'snippet',
                'playlistId' => $uploadsPlaylistId,
                'maxResults' => 50,
            ];

            // Append nextPageToken if it exists from the previous loop iteration
            if ($nextPageToken) {
                $queryParams['pageToken'] = $nextPageToken;
            }

            $playlistData = self::makeYoutubeRequest([
                'query' => $queryParams,
                'endPointResource' => 'playlistItems'
            ]);

            // Parse and extract the relevant video metadata
            if (isset($playlistData['items'])) {
                foreach ($playlistData['items'] as $item) {
                    $videos[] = $item['snippet'];
                }
            }
            error_log('getAllChannelsVideo fetch: number of videos: ' . count($videos), 4); 

            // Update the token for the next iteration loop (returns null if on the last page)
            $nextPageToken = $playlistData['nextPageToken'] ?? null;
            if(count($videos) >= $options['numberToProcess']) break;
        } while ($nextPageToken !== null);

        $videoIds = array_map(fn($snippet) => Q::ifset($snippet, "resourceId", "videoId", null), $videos);

        return $videoIds;
    }

    static function processChannelIntoEpisodes($channelId = null, $options = array(
        'numberToProcess' => INF,
        'update' => false
    ))
    {
        $communityId = Users::communityId();
 
        Users::setLoggedInUser($communityId);

        if ($channelId === null) {
            $channelId = Q_Config::get("Websites", "youtube", "channelId", null);
        }

        $allvideoIds = self::getAllChannelsVideo($channelId, array(
            'numberToProcess' => $options['numberToProcess'],
        ));
        $episodeStreams = self::createEpisodeFromYoutubeVideos($allvideoIds, array(
            'update' => $options['update'],
            'numberToProcess' => $options['numberToProcess']
        ));

        return $episodeStreams;
    }

    static function getInfoAboutYoutubeVideos($videoIds = null)
    {
        if ($videoIds === null) {
            throw new Exception('Media_YoutubeClipGenerator::getInfoAboutYoutubeVideos: videoIds should defined');
        }

        if (is_string($videoIds)) {
            $videoId = $videoIds;
            $videoIds = array($videoId);
        }

        $videoIds = implode(",", $videoIds);

        $videosInfo = self::makeYoutubeRequest([
            'query' => [
                'part' => 'snippet,contentDetails,topicDetails',
                'id' => $videoIds,
            ],
            'endPointResource' => 'videos'
        ]);

        $items = Q::ifset($videosInfo, "items", null);
        return $items;
    }

    /**
     * Creates episode stream that corresponds one youtube video
     *
     * @param string $videoId Id of a Youtube video for which episode stream should be created
     * @param boolean $update If true AND spisode stream already exists for this video, synchronize data between Youtube video info and existing episode stream
     * @return array
     */
    static function createEpisodeFromYoutubeVideos($videoIds = null, $options = array(
        'update' => false,
        'numberToProcess' => INF
    ))
    {
        if ($videoIds === null) {
            throw new Exception('Media_YoutubeClipGenerator::createEpisodeFromYoutubeVideos: videoIds should defined');
        }

        $errors = array();

        if (is_string($videoIds)) {
            $videoId = $videoIds;
            $videoIds = array($videoId);
        }

        $idChunks = array_chunk($videoIds, 50);
        $detailedInfo = [];

        // 3. Process each chunk part by part and merge the results
        foreach ($idChunks as $chunk) {
            try {
                $chunkDetails = self::getInfoAboutYoutubeVideos($chunk);

                if (is_array($chunkDetails)) {
                    $detailedInfo = array_merge($detailedInfo, $chunkDetails);
                }
            } catch (Exception $e) {
                $errors[] = array(
                    "error" => "Media_YoutubeClipGenerator::getInfoAboutYoutubeVideos: " . $e->getMessage()
                );
            }
        }

        $communityId = Users::communityId();
        $category = Streams::fetchOne($communityId, $communityId, "Media/episodes");
        $streamType = "Media/episode";
        $relationType = "Media/episode/youtube";
        
        $createdEpisodes = array();
        $updatedEpisodes = array();

        foreach ($detailedInfo as $info) {
            try {
                $videoId = Q::ifset($info, "id", null);
                $streamName = $streamType . '/yt_' . $videoId;
                $existingEpisode = Streams::fetchOne($communityId, $communityId, $streamName);

                if ($existingEpisode && $options['update'] === false) {
                    continue;
                }

                $duration = Q::ifset($info, "contentDetails", "duration", null);

                if ($duration) {
                    $h = $m = $s = array(0);
                    preg_match("/\d{1,2}h/i", $duration, $h);
                    preg_match("/\d{1,2}m/i", $duration, $m);
                    preg_match("/\d{1,2}s/i", $duration, $s);
                    $duration = (int)reset($h) * 3600 + (int)reset($m) * 60 + (int)reset($s);
                }
                error_log('createEpisodeFromYoutubeVideos: duration: ' . $duration, 4); 

                $title = Q::ifset($info, "snippet", "title", null);
                $description = Q::ifset($info, "snippet", "description", null);
                $publishTime = Q::ifset($info, "snippet", "publishedAt", null);
                $audioLanguage = Q::ifset($info, "snippet", "defaultAudioLanguage", null);
                $thumbnails = Q::ifset($info, "snippet", "thumbnails", array()); //array("default" => null, "medium" => null, "hight" => null, "standard" => null, "maxres" => null)
                $icon = Q::ifset($thumbnails, "high", "url", null);

                $videoData = array(
                    "id" => $videoId,
                    "url" => "https://www.youtube.com/watch?v=" . $videoId,
                    "duration" => $duration,
                );
                $audioData = array(
                    "url" => null,
                    "language" => $audioLanguage
                );

                if (isset($existingEpisode)) {
                    $existingEpisode->title = $title;
                    $existingEpisode->content = $description;
                    $existingEpisode->icon = $icon;
                    $existingEpisode->setAttribute('video', $videoData);
                    $existingEpisode->setAttribute('audio', $audioData);
                    $existingEpisode->setAttribute('thumbnails', $thumbnails);
                    $existingEpisode->setAttribute('publishTime', isset($publishTime) ? strtotime($publishTime) : null);
                    $existingEpisode->save();
                    $episodeStream = $existingEpisode;
                    $updatedEpisodes[] = $episodeStream;
                } else {
                    $episodeStream = Streams::create($communityId, $communityId, $streamType, array(
                        "title" => $title,
                        "content" => $description,
                        "name" => $streamName,
                        "icon" => $icon,
                        "attributes" => array(
                            "video" => $videoData,
                            "audio" => $audioData,
                            "thumbnails" => $thumbnails,
                            "publishTime" => isset($publishTime) ? strtotime($publishTime) : null
                        )
                    ), array('relate' => array(
                        "publisherId" => $category->publisherId,
                        "streamName" => $category->name,
                        "type" => $relationType,
                        "weight" => isset($publishTime) ? strtotime($publishTime) : null
                    )));
                    $createdEpisodes[] = $episodeStream;
                }
                
                if(isset($options['numberToProcess']) && count($createdEpisodes) >= $options['numberToProcess']) {
                    break;
                }
            } catch (Exception $e) {
                $errors[] = array(
                    "videoId" =>Q::ifset($info, "id", null),
                    "error" => $e->getMessage()
                );
            }
        }

        if (count($errors) !== 0) {
            foreach ($errors as $error) {
                Q::log($error);
            }
        }

        return array(
            'createdEpisodes' => $createdEpisodes,
            'updatedEpisodes' => $updatedEpisodes
        );
    }

    static function processEpisodeIntoClips($episodeStream, $options = array(
        'recreateSubs' => false,  
        'recreateSummary' => false
        ))
    {
        $episodeStream->setAttribute('clipsState', 'transcribing');
        $episodeStream->save();

        $communityId = Users::communityId();
        $serverPath = APP_FILES_DIR . DS . $communityId;

        $videoInfo = $episodeStream->getAttribute('video');
        $audioInfo = $episodeStream->getAttribute('audio');
        $existingSubs = $episodeStream->getAttribute('subs');
        $existingSummary = $episodeStream->getAttribute('summary');
        $weight = $episodeStream->getAttribute("publishTime") ?: time();
        
        $url = $videoInfo['url'];
        $videoId = $videoInfo['id'];
        $totalDuration = $videoInfo['duration'];
        $audioLanguage = isset($audioInfo['language']) ? $audioInfo['language'] : 'en';

        if (!isset($existingSubs) || (isset($options['recreateSubs']) && $options['recreateSubs'] === true)) {
            try {
                $subsFiles = self::retrieveCaptions($url, $videoId, $audioLanguage);
            } catch (Exception $e) {
                $episodeStream->setAttribute('clipsState', 'transcribeError');
                $episodeStream->save();
                Q::log($e);
                print_r($e);
                throw new Exception("Failed to retrieve captions");
            }

            $episodeStream->setAttribute('subs', $subsFiles);
            $episodeStream->setAttribute('clipsState', 'transcribed');
            $episodeStream->save();
        }


        if (!isset($existingSummary) || (isset($options['recreateSummary']) && $options['recreateSummary'] === true)) {
            $subsFiles = $episodeStream->getAttribute('subs');
            $rawVtt = file_get_contents($serverPath . $subsFiles[0]);

            try {
                $summaryPath = self::summarize($rawVtt, $videoId);
            } catch (Exception $e) {
                $episodeStream->setAttribute('clipsState', 'summarizeError');
                $episodeStream->save();
                Q::log($e);
                print_r($e);
                throw new Exception("Failed to make a summary");
            }

            $episodeStream->setAttribute('summary', $summaryPath);
            $episodeStream->setAttribute('clipsState', 'summarized');
            $episodeStream->save();
        }

        $summaryPath = $episodeStream->getAttribute('summary');
        $summaryRawJson = file_get_contents($serverPath . $summaryPath);
        $segments = json_decode($summaryRawJson, true);

        $speakers = array();
        $clipStreams = array();
        foreach ($segments as $index => $segment) {
            echo "Creating clip ... \n";
            set_time_limit(0);
            if($segment['speakers'] != '') {
                $speakers[] = $segment['speakers'];
            }
            
            $startInS = $segment['ts'];
            $startInMs = $startInS * 1000;

            $endInS = isset($segments[$index + 1]) ? $segments[$index + 1]['ts'] : $totalDuration;
            $endInMs = $endInS * 1000;
            
            $name = $episodeStream->name . '_' . $startInS . '_' . $endInS;

            $existingClip = Streams::fetchOne($episodeStream->publisherId, $episodeStream->publisherId, $name);

            $title = $segment['title'];
            $content = $segment['summary'];
            if(isset($segment['keywords']) && !empty($segment['keywords'])) $content = $content . "\n\n\n" . $segment['keywords'];
            $content = self::trimAtLastSeparator($content, 4095);

            if(isset($existingClip)) {
                echo "Clips exists. Updating ... \n";
                //$existingClip->title = $title;
                $existingClip->content = $content;
                $existingClip->save();
                continue;
            }

            $clipStream = Streams::create($episodeStream->publisherId, $episodeStream->publisherId, "Media/clip", array(
                "name" => $name,
                "title" => $title,
                "content" => $content,
                "icon" => $episodeStream->icon,
                "attributes" => array(
                    "video" => array(
                        "url" => $url,
                        "clipStart" => $startInMs,
                        "clipEnd" => $endInMs
                    )
                )
            ), array('relate' => array(
                "publisherId" => $episodeStream->publisherId,
                "streamName" => $episodeStream->name,
                "type" => "Media/clip",
                "weight" => $weight + $index
            )));

            $clipStreams[] = $clipStream;
        }

        return array(
            'clipStreams' => $clipStreams,
            'speakers' => $speakers
        );
    }

    static function trimAtLastSeparator(string $text, int $maxLength = 4095): string
    {
        if (mb_strlen($text) <= $maxLength) {
            return $text;
        }

        $truncated = mb_substr($text, 0, $maxLength);

        $lastComma = mb_strrpos($truncated, ',');
        $lastDot   = mb_strrpos($truncated, '.');

        $lastSeparator = max(
            $lastComma !== false ? $lastComma : -1,
            $lastDot !== false ? $lastDot : -1
        );

        if ($lastSeparator !== -1) {
            return mb_substr($truncated, 0, $lastSeparator);
        }

        return $truncated;
    }

    static function getSpeakersFromSummary($episodeStream)
    {
        $communityId = Users::communityId();
        $serverPath = APP_FILES_DIR . DS . $communityId;

        $summaryPath = $episodeStream->getAttribute('summary');
        $summaryRawJson = file_get_contents($serverPath . $summaryPath);
        $segments = json_decode($summaryRawJson, true);

        $speakers = array();
        foreach ($segments as $segment) {
            if($segment['speakers'] != '') {
                $speakers[] = $segment['speakers'];
            }
        }

        return $speakers;
    }

    static function identifySpeakersFromSummary($episodeStream)
    {
        $speakers = self::getSpeakersFromSummary($episodeStream);
        $names = implode(', ', $speakers);
        $title = $episodeStream->title;
        $description = $episodeStream->content;

        $text = <<<HEREDOC
            INPUT:
            - Title: $title
            - Description: 
            $description

            - Names: $names
        HEREDOC;

        $prompt = <<<'EOF'
You are an AI system that identifies actual participants in a YouTube video and cleans a raw names list extracted from subtitles.

INPUT:
$text

TASKS:

1. Identify Video Participants
Extract ONLY people who directly participate in the video, including:
- hosts
- guests
- interviewees
- speakers
- presenters
- co-hosts

Do NOT include:
- people only mentioned in discussion
- celebrities referenced in stories or news
- organizations
- brands
- websites
- fictional characters
- non-human entities

Use context from the title and description to determine whether someone is an actual participant in the video.

2. Clean the Names List
The Names field contains comma-separated entries extracted from subtitles.

For each entry:
- Determine whether it is a person name
- Normalize capitalization
- Correct obvious spelling mistakes if confidence is high

Classify each name:
- isFull = true → contains BOTH first name and last name
- isFull = false → only first name OR only last name OR incomplete/uncertain name

Remove:
- obvious non-human entities
- roles or labels (e.g. "unnamed male speaker")
- empty or unclear entries

3. Merge and Normalize
Merge names from:
- title/description participants
- cleaned subtitle names

Then:
- remove duplicates (case-insensitive, normalized)
- keep best version of each name

4. OUTPUT FORMAT (STRICT)

Return ONLY a JSON array of objects:

[
  {
    "name": "Noah Fearnley",
    "isFull": true
  },
  {
    "name": "Macayla",
    "isFull": false
  }
]

Rules:
- Do NOT return plain strings
- Do NOT include explanations
- Do NOT include extra fields
- Always return valid JSON
EOF;

        $LLM = new AI_LLM_Openai();
        $response = $LLM->executeModel($prompt, compact('text'));
        
        return $response;
    }

    function generateKeywords($text, $options = array())
    {
        if (!isset($options['temperature'])) {
            $options['temperature'] = 0;
        }
        if (!isset($options['max_tokens'])) {
            $options['max_tokens'] = 1000;
        }

        if (!trim($text)) {
            return array();
        }

        $instructions = <<<HEREDOC
    You are a language model tasked with extracting structured summaries for indexing, using clearly labeled XML-style tags.

    Output exactly these sections:
    <keywords> one line, max 400 characters

    Rules:
    - No extra text
    - No markdown
    - No explanations

    Text to process:
    $text
HEREDOC;
        $LLM = new AI_LLM_Openai();
        $raw = $LLM->executeModel($instructions, compact('text'), $options);
        $content = is_array($raw)
            ? json_encode($raw)
            : (string)$raw;

        $content = trim(preg_replace('/^```.*?\n|\n```$/s', '', $content));

        preg_match('/<keywords>(.*?)<\/keywords>/s', $content, $k);

        $keywordsString = trim(isset($k[1]) ? $k[1] : '');

        $keywords = $keywordsString !== ''
            ? preg_split('/\s*,\s*/', $keywordsString)
            : array();

        return compact('keywords');
    }

    static function retrieveCaptions($url, $videoId, $language = "en")
    {
        $communityId = Users::communityId();
        $serverPath = APP_FILES_DIR . DS . $communityId;
        $publicPath = DS . 'uploads' . DS . 'AI' . DS . 'transcriptions' . DS;
        $uploadDir = $serverPath . $publicPath;

        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0775, true) && !is_dir($uploadDir)) {
                throw new Exception('Failed to create directory: ' . $uploadDir);
            }
        }

        $outputTemplate = $uploadDir . "%(id)s.%(ext)s";

        // Get metadata
        $json = shell_exec("yt-dlp --dump-json " . escapeshellarg($url));
        $data = json_decode($json, true);

        if (!$data) {
            throw new Exception("Failed to parse yt-dlp JSON");
        }

        $subs = $data['subtitles'] ?? [];
        $auto = $data['automatic_captions'] ?? [];

        // Normalize language matching (en matches en-GB, en-US, etc.)
        $matchLang = function ($available, $target) {
            $target = strtolower($target);
            foreach ($available as $lang => $tracks) {
                $langLower = strtolower($lang);
                if ($langLower === $target || str_starts_with($langLower, $target . '-')) {
                    return $lang;
                }
            }
            return null;
        };

        // Prefer manual captions
        $selectedLang = $matchLang($subs, $language);
        $useAuto = false;

        if (!$selectedLang) {
            $selectedLang = $matchLang($auto, $language);
            $useAuto = true;
        }

        if (!$selectedLang) {
            throw new Exception("No matching captions found for language: $language");
        }

        // Build yt-dlp command
        $cmd = "yt-dlp "
            . "--skip-download "
            . ($useAuto ? "--write-auto-subs " : "--write-subs ")
            . "--sub-langs " . escapeshellarg($selectedLang) . " "
            . "--sub-format vtt "
            . "--convert-subs vtt "
            . "--js-runtimes node "
            . "--extractor-args " . escapeshellarg("youtube:player_client=android") . " "
            . "--force-overwrites "
            . "-o " . escapeshellarg($outputTemplate) . " "
            . escapeshellarg($url) . " 2>&1";

        exec($cmd, $outputLines, $exitCode);

        if ($exitCode !== 0) {
            throw new Exception("yt-dlp failed:\n" . implode("\n", $outputLines));
        }

        // Find downloaded VTT
        $files = glob($uploadDir . $videoId . '*.vtt');

        if (empty($files)) {
            throw new Exception("No captions file created for videoId: $videoId");
        }

        foreach($files as $key => $file) {
            if ($useAuto) {
                $rawVtt = file_get_contents($file);
                $normalizedVtt = self::normalizeVtt($rawVtt);
                file_put_contents($file, $normalizedVtt);
            }
            $files[$key] = str_replace($serverPath, "", $file);
        }

        return $files;
    }

    static function normalizeVtt($vtt)
    {
        $lines = explode("\n", $vtt);
        $entries = [];
        $current = null;

        foreach ($lines as $line) {
            $line = trim($line);

            // timecode
            if (preg_match('/^\d{2}:\d{2}:\d{2}\.\d{3} -->/', $line)) {
                if ($current) {
                    $entries[] = $current;
                }
                $current = [
                    'time' => $line,
                    'text' => ''
                ];
                continue;
            }

            if (!$current || !$line) continue;

            // remove word-level tags
            $line = preg_replace('/<\d{2}:\d{2}:\d{2}\.\d{3}><c>(.*?)<\/c>/', '$1', $line);

            // strip other tags
            $line = strip_tags($line);

            $current['text'] .= ' ' . $line;
        }

        if ($current) {
            $entries[] = $current;
        }

        // normalize whitespace
        foreach ($entries as &$e) {
            $e['text'] = trim(preg_replace('/\s+/', ' ', $e['text']));
        }

        // 🔥 remove overlaps
        $clean = [];
        $prevText = '';

        foreach ($entries as $entry) {
            $text = $entry['text'];

            if ($prevText) {
                $text = self::removeOverlap($prevText, $text);
            }

            if ($text !== '') {
                $clean[] = [
                    'time' => $entry['time'],
                    'text' => $text
                ];
                $prevText = $entry['text']; // important: original full text
            }
        }

        // build VTT string
        $out = "WEBVTT\n\n";
        $i = 1;

        foreach ($clean as $entry) {
            $out .= $i++ . "\n";
            $out .= $entry['time'] . "\n";
            $out .= $entry['text'] . "\n\n";
        }

        return $out;
    }

    static function removeOverlap($prev, $curr)
    {
        $prevWords = explode(' ', $prev);
        $currWords = explode(' ', $curr);

        $maxOverlap = min(count($prevWords), count($currWords));

        for ($i = $maxOverlap; $i > 0; $i--) {
            $prevSlice = array_slice($prevWords, -$i);
        $currSlice = array_slice($currWords, 0, $i);

            if ($prevSlice === $currSlice) {
                return implode(' ', array_slice($currWords, $i));
            }
        }

        return $curr;
    }

    static public function summarize($webvtt, $id = null)
    {
        // 1. Parse VTT → entries
        $entries = self::parseVtt($webvtt);

        $count = count($entries);
        if (!$count) {
            return;
        }

        // 2. Chunk into ~10 parts
        $chunks = array_chunk($entries, max(1, ceil($count / 10)), true);

        $result = array();

        foreach ($chunks as $chunk) {
            $source = '';

            foreach ($chunk as $entry) {
                $source .= $entry['line'] . "\n";
            }

            if (!trim($source)) {
                continue;
            }

            $first = reset($chunk);
            $last  = end($chunk);

            $start = $first['start'];
            $end   = $last['end'];

            $LLM = new AI_LLM_Openai();

            $chunkResult = null;
            $done = false;

            $LLM->summarize(
                $source,
                [
                    'callback' => function ($res) use (&$chunkResult, &$done) {
                        $chunkResult = $res;
                        $done = true;
                    }
                ]
            );

            // wait (your async pattern)
            $tries = 0;
            while (!$done && $tries < 50) {
                usleep(20000);
                $tries++;
            }

            if (!is_array($chunkResult)) {
                continue;
            }

            $keywordsResponse = $LLM->keywords($chunkResult['keywords'] ?? []);
            $parsedRespose = json_decode($keywordsResponse, true);
            $keywords = Q::ifset($parsedRespose, "output", 0, "content", 0, "text", []);

            $s = floor($start / 1000);
            $hms = Q_Utils::secondsToHMS($s);

            $result[] = array(
                "ts" => $s,
                "hms" => $hms,
                "title" => $chunkResult['title'] ?? '',
                "summary" => $chunkResult['summary'] ?? '',
                "speakers" => $chunkResult['speakers'] ?? '',
                "keywords" => $keywords
            );
        }

        $name = ($id ?: uniqid()) . ".summary";
        $publicPath = DS . 'uploads' . DS . 'AI' . DS . 'transcriptions' . DS . $name;
        $communityId = Users::communityId();
        $serverPath = APP_FILES_DIR . DS . $communityId;
        $summaryPath = $serverPath . $publicPath;
       
        file_put_contents($summaryPath, json_encode($result));
        return $publicPath;
    }

    static function parseVtt($vtt)
    {
        $lines = preg_split('/\r\n|\r|\n/', $vtt);

        $entries = [];
        $current = null;

        foreach ($lines as $line) {
            $line = trim($line);

            // Match time line
            if (preg_match('/^(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/', $line, $m)) {

                if ($current) {
                    $entries[] = $current;
                }

                $current = [
                    'start' => self::vttTimeToMs($m[1]),
                    'end'   => self::vttTimeToMs($m[2]),
                    'line'  => ''
                ];

                continue;
            }

            if (!$current || $line === '' || is_numeric($line)) {
                continue;
            }

            // clean tags
            $line = preg_replace('/<\d{2}:\d{2}:\d{2}\.\d{3}><c>(.*?)<\/c>/', '$1', $line);
            $line = strip_tags($line);

            $current['line'] .= ' ' . $line;
        }

        if ($current) {
            $entries[] = $current;
        }

        // normalize text
        foreach ($entries as &$e) {
            $e['line'] = trim(preg_replace('/\s+/', ' ', $e['line']));
        }

        return $entries;
    }

    static function vttTimeToMs($time)
    {
        list($h, $m, $s) = explode(':', $time);
        list($s, $ms) = explode('.', $s);

        return ((int)$h * 3600 + (int)$m * 60 + (int)$s) * 1000 + (int)$ms;
    }

    static function getXTwitterLists()
    {
        $apiKey = Q_Config::expect("Websites", "youtube", "keys", "server");
        $query = Q::ifset($options, "query", null);
        $endPointResource = Q::ifset($options, "endPointResource", null);

        if ($endPointResource === null && $query === null) {
            throw new Exception('Media_YoutubeClipGenerator::makeYoutubeRequest: videoId or query should defined');
        }

        $endPoint = "https://youtube.googleapis.com/youtube/v3/$endPointResource";

        $query["key"] = $apiKey;

        $youtubeApiUrl = $endPoint . '?' . http_build_query($query);
        $result = Q::json_decode(Q_Utils::get($youtubeApiUrl), true);
        if (Q::ifset($result, "error", null)) {
            throw new Exception("Youtube API error: " . Q::ifset($result, "error", "message", null));
        }

        return $result;
        // 1. Set your configuration values
        $apiKey = 'new1_74ecdb0af26047608238d6e918291ed9';
        $userId = 'TWITTER_USER_ID'; // e.g., '12' for @jack

        // 2. Define the api.io endpoint for fetching user lists
        $url = "https://api.twitterapi.io/twitter/user/lists?userId=" . urlencode($userId);

        // 3. Initialize cURL
        $ch = curl_init();

        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "GET",
            CURLOPT_HTTPHEADER => [
                "X-API-Key: " . $apiKey, // Or "Authorization: Bearer " . $apiKey depending on your tier config
                "Accept: application/json"
            ],
        ]);

        // 4. Execute the request
        $response = curl_exec($ch);
        $err = curl_error($ch);

        curl_close($ch);

        // 5. Handle the output
        if ($err) {
            echo "cURL Error #:" . $err;
        } else {
            // Decode the JSON data into a structured PHP array
            $data = json_decode($response, true);

            if (isset($data['lists'])) {
                foreach ($data['lists'] as $list) {
                    echo "List Name: " . $htmlentities($list['name']) . "<br>";
                    echo "List ID: " . $list['id_str'] . "<br>";
                    echo "Description: " . htmlentities($list['description']) . "<br>";
                    echo "Subscriber Count: " . $list['subscriber_count'] . "<br>";
                    echo "-----------------------------------<br>";
                }
            } else {
                echo "Could not find any lists or API error occurred. Response:<br>";
                print_r($data);
            }
        }
    }
}
