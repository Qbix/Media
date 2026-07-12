# Media Plugin — LLM Coding Primer

Supplement to Q Framework, Streams, Users, Websites, and Calendars primers. Covers
WebRTC rooms, livestreaming, presentations, webcasting, clips/feeds/channels,
and live shows.

---

## 1. WebRTC Rooms

```php
// Create or fetch a WebRTC room
$stream = Media_WebRTC::getOrCreateRoomStream(
    $publisherId,           // room owner
    $roomId,                // null = auto-generate, or explicit ID
    $resumeClosed,          // true = reopen existing closed stream
    array(                  // access levels
        'readLevel'  => 40, // max
        'writeLevel' => 23, // relate
        'adminLevel' => 20  // invite
    ),
    array('mic', 'camera', 'screen')  // permissions added to stream
);
// Auto-creates Streams_Access rows for Users/hosts and Users/screeners
// Stream name: Media/webrtc/{roomId}

// Schedule a meeting with invited attendees
$result = Media_WebRTC::scheduleOrUpdateRoomStream(
    $streamName,       // null = create new
    $publisherId,      // null = create new
    array(
        'topic'              => 'Weekly Standup',
        'startTimeTs'        => $startTimestamp * 1000,  // milliseconds
        'endTimeTs'          => $endTimestamp * 1000,
        'timeZoneString'     => 'America/New_York',
        'accessType'         => 'trusted',    // 'trusted' or 'open'
        'scheduleLivestream' => true,          // auto-create livestream
        'invitedAttendeesIds'=> array($userId1, $userId2)  // or 'none'
    )
);
// Returns: ['webrtcStream' => ..., 'livestreamStream' => ...]

// Fetch an existing room
$stream = Media_WebRTC::fetchStream($publisherId, $roomId, $resumeClosed);

// Waiting room flow (trusted access rooms)
$waitingRoom = Media_WebRTC::createWaitingRoomStream();
// Sets attribute isWaitingRoom=true

// Host admits user from waiting room
Media_WebRTC::admitUserToRoom($publisherId, $streamName, $waitingRoomStreamName, $userIdToAdmit);
// Creates per-user Streams_Access row with read=max, write=relate, admin=invite
// Posts Media/webrtc/admit message to waiting room

// Host puts participant back in waiting room
Media_WebRTC::cancelAccessToRoom($publisherId, $streamName, $userId);
// Sets readLevel=none on user's access row
// Sends putInWaitingRoom command to Node.js signaling

// Host dismisses waiting room
Media_WebRTC::closeWaitingRoom($publisherId, $streamName, $waitingRoomStreamName, $waitingRoomUserId);

// TURN server credentials
$iceServers = Media_WebRTC::getTwilioTurnCredentials();
// Returns Twilio ICE server array for WebRTC NAT traversal
```

---

## 2. Livestreaming

```php
// Create or update a livestream (related to a WebRTC room)
$livestreamStream = Media_Livestream::createOrUpdateLivestreamStream(
    $publisherId,     // WebRTC room publisher
    $streamName,      // WebRTC room stream name (Media/webrtc/xxx)
    $startTimestamp   // unix seconds (null = use scheduled time or now)
);
// Creates Media/webrtc/livestream stream
// Relates to WebRTC room via 'Media/webrtc/livestream' type

// Get existing livestream for a room
$livestreamStream = Media_Livestream::getLivestreamStream($publisherId, $streamName);

// Manage RTMP destinations (YouTube Live, Facebook, custom)
$destStream = Media_Livestream::createOrUpdateChannel(
    $livestreamPublisherId,
    $livestreamStreamName,
    json_encode(array(
        'destId'   => 'youtube_main',
        'platform' => 'youtube',
        'rtmpUrl'  => 'rtmp://...',
        'streamKey'=> '...'
    )),
    false  // true = remove destination
);
// Creates Media/livestream/dest/{destId} stream, relates to livestream

// Audience tracking (race-condition-safe)
Media_Livestream::joinAudience($publisherId, $streamName, $socketId);
// Atomically increments $.audience in stream attributes via JSON_SET SQL
// Registers Node.js disconnect handler to auto-decrement

Media_Livestream::leaveAudience($publisherId, $streamName);
// Atomically decrements $.audience (min 0)

// Reminders
$reminders = Media_Livestream::updateReminders($publisherId, $streamName, '3600', 'set');
// Stores in participant extra.reminders = {'3600': false, ...}
// Sets subscription rule for 'livestream' delivery
```

---

## 3. Presentations

```php
// Create or fetch presentation + commands chat for a WebRTC room
$result = Media_WebRTC::getOrCreatePresentation($webrtcStreamName, $publisherId);
// Returns:
// 'presentationStream'  — Media/presentation stream
// 'commandsChatStream'  — Streams/chat for slide navigation commands
// 'publisherId', 'streamName', 'calendarId', 'isHost',
// 'toolPublisherId', 'toolStreamName', 'writeLevel'

// Presentation stream includes attributes:
// mode='broadcast', backgroundGallery with Ken Burns settings

// Commands sent as chat messages on the tool stream:
// Media/presentation/show    — navigate to slide
// Media/presentation/start   — start presentation
// Media/presentation/end     — end presentation
// Media/presentation/graph/update — update a chart
// Media/presentation/table/update — update a table
// Media/slide/build           — build slide animation

// Fetch or create presentation for an experience
Media::presentationStream($asUserId, $publisherId, $experienceId);
// Creates Media/presentation/{experienceId}, relates to Streams/experience/{experienceId}
```

---

## 4. Webcasting

```php
// Simpler than WebRTC — one-way broadcasting
$stream = Media_Webcast::getOrCreateStream($publisherId, $roomId, array(
    'readLevel'  => 40,
    'writeLevel' => 23,
    'adminLevel' => 20
));
// Stream name: Media/webcast/{roomId}

$stream = Media_Webcast::fetchStream($publisherId, $roomId, $resumeClosed);
$stream = Media_Webcast::createStream($publisherId, $roomId, $accessLevels);
```

---

## 5. Clips, Channels & Feeds

```php
// Create a video clip and relate to a feed
Media::createClip(array(
    'video'       => '/path/to/video.mp4',
    'publisherId' => $publisherId,
    'feedId'      => 'main',         // last part of Media/feed/{feedId}
    'image'       => '/path/to/thumb.jpg',  // optional thumbnail
    'duration'    => 120000          // milliseconds
));
// Creates Media/clip stream
// Attaches video via Websites_File::saveStreamFile()
// Sets icon from thumbnail
// Relates to Media/feed/{feedId} with weight=time()

// Get feeds for the current user (or all community feeds for admins)
$relations = Media::filterFeeds(array(
    'communityId' => $communityId,
    'limit'       => 100,
    'offset'      => 0
));

// Check feed creation permission
$authorized = Media::newFeedAuthorized($userId, $communityId);
// Checks Media.access.feeds.admins roles or Media.feeds.anyoneNewFeed config

// Check admin status
$isAdmin = Media::isFeedsAdmin($userId, $communityId);
```

---

## 6. Live Shows

```php
// Get or create today's live show (one per day per community)
$liveStream = Media::getCurrentLiveShow();
// Fetches most recent Media/live stream
// If created today → returns it
// Otherwise → creates new one with WebRTC room, Users/hosts access

// Get the WebRTC room for the current live show
$webrtcStream = Media::getCurrentLiveShowWebrtc();

// Live shows auto-create:
// 1. Media/live stream with video/audio config attributes
// 2. Media/webrtc room related via configured relation type
// 3. Streams_Access for Users/hosts with full permissions
// 4. mic/camera/screen permissions on the WebRTC stream
```

---

## 7. Recordings

```php
// Merge parallel recordings from a WebRTC call
Media_WebRTC::mergeRecordings($publisherId, $roomId);
// Scans {files_dir}/Media/webrtc_rec/{roomId}/{startTime}/
// Each participant has a JSON metadata file with timing info
// Uses ffmpeg to mix audio tracks with proper time offsets
// Output: audio.mp3 in the call directory

// User recordings category
Media::userRecordingsStream($userId);
// Creates/fetches Media/user/recordings stream
```

---

## 8. Integration with Calendars

```php
// WebRTC rooms relate to Calendars/event via 'Calendars/event/webrtc'
// Livestreams relate to events via 'Calendars/event/livestream'
// See Calendars_Event::create() with teleconference=true

// When a WebRTC room participant joins/leaves, Calendars_Event::postMessage()
// posts notification messages to the related event stream:
// Calendars/event/webrtc/started   — first participant joins
// Calendars/event/webrtc/ended     — last participant leaves
// Calendars/event/livestream/started — livestream begins
// Calendars/event/livestream/ended   — livestream ends
```

---

## 9. Common Mistakes

| Wrong | Right |
|-------|-------|
| Creating WebRTC streams with `Streams::create()` | Use `Media_WebRTC::getOrCreateRoomStream()` — handles permissions, access rows, resumeClosed |
| Manually tracking audience count with read-increment-write | Use `Media_Livestream::joinAudience()` — race-condition-safe JSON_SET SQL |
| Creating presentations without a commands chat stream | Use `Media_WebRTC::getOrCreatePresentation()` — creates both and relates them |
| Forgetting `resumeClosed` when reopening a room | Pass `$resumeClosed = true` to reopen existing streams; otherwise a new stream is created |
| Setting access on WebRTC streams without host/screener rows | `getOrCreateRoomStream()` auto-creates access for `Users/hosts` and `Users/screeners` |
| Creating clips without attaching the video file | Use `Media::createClip()` — handles `Websites_File::saveStreamFile()`, icon, and feed relation |
| Admitting users to open rooms | `admitUserToRoom()` is only for `"trusted"` access rooms; open rooms have public access levels |
| Scheduling meetings without `accessType` | Must specify `'trusted'` or `'open'`; determines whether waiting rooms are used |
| Missing Twilio config for TURN | `Media.twilio.accountSid/apiKey/apiSecret/authToken` required for `getTwilioTurnCredentials()` |

---

## 10. Stream Types Quick Reference

```
Media/webrtc              — Video conferencing room (permissions: mic, camera, screen)
Media/webrtc/livestream   — Broadcast layer on a WebRTC room
Media/webrtc/waitingRoom  — Waiting room for trusted-access rooms
Media/livestream/dest     — RTMP output destination (YouTube, Facebook, etc.)
Media/webcast             — One-way broadcast (simpler than WebRTC)
Media/presentation        — Slides with real-time navigation and Ken Burns backgrounds
Media/clip                — Video clip with file attachment and thumbnail
Media/episode             — Episode grouping clips
Media/channel             — Content directory for clips
Media/feed                — Social content feed
Media/live                — Daily live show (one per day per community)
Media/calls               — Call center category
Media/whiteboard          — Collaborative drawing

User streams:
  Media/calls/main        — Community call center (onInsert: community)
  Media/user/recordings   — Personal recordings
  Media/channels/main     — Channels category
  Media/channel/main      — Default channel
```

---

## 11. Configuration Reference

```
Media.twilio.accountSid           — Twilio account for TURN
Media.twilio.apiKey               — Twilio API key
Media.twilio.apiSecret            — Twilio API secret
Media.twilio.authToken            — Twilio auth token
Media.access.feeds.admins         — Labels that can manage feeds
Media.feeds.anyoneNewFeed         — Allow any user to create feeds
Media.liveShow.video              — Default video config for live shows
Media.liveShow.audio              — Default audio config for live shows
Media.clip.webrtc.relations.main  — Relation type for live show WebRTC rooms
Users.quotas.Media/webrtc.86400   — Daily room creation limits by role
```