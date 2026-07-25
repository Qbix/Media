# Media Plugin

Video conferencing, livestreaming, presentations, webcasting, content channels, social feeds, clips, call centers, whiteboards, and live shows for the Qbix platform. Media builds on Streams, Users, Websites, and Calendars to provide a complete real-time media stack — WebRTC rooms with waiting rooms and role-based permissions, livestream broadcasting with audience tracking, slide presentations with real-time navigation, one-way webcasting, video clip management with feeds, and YouTube integration. No custom database tables; everything is built on Streams infrastructure.

## Core Concepts

### WebRTC Video Conferencing

`Media/webrtc` streams represent video conferencing rooms. `Media_WebRTC::getOrCreateRoomStream()` creates or fetches a room with configurable access levels and permissions (mic, camera, screen). Rooms support `resumeClosed` — reopening a previously closed stream rather than creating a new one, which preserves the stream name and relations.

**Access model:** Each room auto-creates `Streams_Access` rows for `Users/hosts` (full admin/write/read) and `Users/screeners` (read + edit). The `accessType` attribute controls whether a room is `"open"` (public access levels) or `"trusted"` (locked down, participants need individual access grants).

**Waiting rooms:** `Media/webrtc/waitingRoom` streams let users request entry to a trusted room. The host calls `Media_WebRTC::admitUserToRoom()` to grant access (creates a per-user `Streams_Access` row) or `closeWaitingRoom()` to dismiss. The admitted user's waiting room receives a `Media/webrtc/admit` message that triggers the client to join the main room.

**Scheduling:** `Media_WebRTC::scheduleOrUpdateRoomStream()` creates or updates a scheduled meeting with invited attendees, optional livestream, start/end times, timezone, and topic. Handles invite management — compares current vs. new attendee lists, removes stale invites, sends new ones.

**Recording:** Client-side recordings are stored per-user per-call. `Media_WebRTC::mergeRecordings()` uses ffmpeg to combine parallel recordings from multiple participants into a single audio file, handling time offsets between users who joined at different times. Recordings are stored in the user's `Media/user/recordings` category stream.

**TURN servers:** `Media_WebRTC::getTwilioTurnCredentials()` fetches ICE server credentials from Twilio for NAT traversal.

**Node.js signaling:** `Media/WebRTC/signaling.js` runs a WebSocket signaling server on the Qbix Node.js process, managing room membership, SDP exchange, and ICE candidate relay. Supporting modules handle client management, rate limiting, local recording coordination, and streaming.

### Livestreaming

`Media/webrtc/livestream` streams represent a broadcast layer on top of a WebRTC room. `Media_Livestream::createOrUpdateLivestreamStream()` creates the livestream stream and relates it to the WebRTC room via `Media/webrtc/livestream` relation type.

**Destinations:** `Media/livestream/dest` streams represent RTMP output destinations (YouTube Live, Facebook Live, custom RTMP). Each destination is related to the livestream stream.

**Audience tracking:** `Media_Livestream::joinAudience()` tracks viewers with race-condition-safe SQL using `JSON_SET` with `CAST(COALESCE(...) AS UNSIGNED) + 1` to atomically increment the audience count in stream attributes. On disconnect, a Node.js event handler calls `leaveAudience()` to decrement.

**Reminders:** Per-user reminder preferences stored in participant extras. `updateReminders()` sets/unsets reminder times, and subscription rules deliver notifications via the `livestream` channel.

### Presentations

`Media/presentation` streams support slide-based presentations with real-time navigation across all viewers. Features include slide show/navigate commands, graph/table updates, and a background gallery with Ken Burns pan-and-zoom effects.

`Media_WebRTC::getOrCreatePresentation()` creates a presentation stream related to a WebRTC room, along with a `Streams/chat` "tool stream" for sending commands (slide navigation, graph updates). The tool stream inherits access from the WebRTC room. Commands are sent as chat messages on the tool stream and received by all presentation viewers.

Message types: `Media/presentation/show`, `Media/presentation/start`, `Media/presentation/end`, `Media/presentation/graph/update`, `Media/presentation/table/update`, `Media/slide/build`.

### Webcasting

`Media/webcast` streams provide one-way broadcasting (simpler than WebRTC). `Media_Webcast` offers the standard fetch/create/getOrCreate pattern without waiting rooms or permission complexity. The `RTMPMediaServer.js` and `WebcastServer.js` handle the server-side streaming infrastructure.

### Channels & Clips

`Media/channel` streams serve as content directories for video clips. Each user has `Media/channels/main` (category of all their channels) and `Media/channel/main` (default channel).

`Media/clip` streams hold individual video content. `Media::createClip()` creates a clip stream, attaches the video file via `Websites_File::saveStreamFile()`, sets the icon from a thumbnail, and relates the clip to its feed with `weight = time()`.

`Media/episode` streams group clips into episodes (e.g. dated shows).

### Feeds

`Media/feed` streams provide social-media-style content feeds. `Media::filterFeeds()` returns feeds for the current user, or all community feeds for admins (controlled by `Media.access.feeds.admins` config). `Media::newFeedAuthorized()` checks whether a user can create feeds (either admin role or `Media.feeds.anyoneNewFeed` config).

### Live Shows

`Media/live` streams represent daily live broadcasts. `Media::getCurrentLiveShow()` fetches or creates today's live stream (one per day per community), with a main WebRTC room auto-created and related. The WebRTC room gets full access for `Users/hosts` and permissions for mic/camera/screen.

### Call Center

`Media/calls/main` is a community-level stream (auto-created via `Streams.onInsert.community`) for managing incoming calls. The call center interface allows screeners to manage call participants and hosts to approve/reject callers.

### Whiteboards

`Media/whiteboard` streams provide collaborative drawing surfaces, created via POST and updated via PUT handlers.

### Games

Game-related streams and handlers support interactive game content within the media infrastructure.

### YouTube Integration

`Media_YoutubeClipGenerator` handles YouTube clip generation. Webhook routes handle YouTube callbacks, and clips can be imported from YouTube with video IDs.

## Stream Types

| Type | Purpose |
|---|---|
| `Media/webrtc` | WebRTC video conferencing room |
| `Media/webrtc/livestream` | Livestream broadcast layer on a WebRTC room |
| `Media/webrtc/waitingRoom` | Waiting room for trusted-access WebRTC rooms |
| `Media/livestream/dest` | RTMP output destination for a livestream |
| `Media/webcast` | One-way broadcast stream |
| `Media/presentation` | Slide presentation with real-time navigation |
| `Media/clip` | Individual video clip |
| `Media/episode` | Episode grouping clips |
| `Media/channel` | Content directory for clips |
| `Media/feed` | Social-media-style content feed |
| `Media/live` | Daily live show stream |
| `Media/calls` | Call center category |
| `Media/whiteboard` | Collaborative drawing surface |

## User Streams

| Stream Name | Purpose |
|---|---|
| `Media/calls/main` | Community call center (auto-created) |
| `Media/user/recordings` | Personal recordings category |
| `Media/channels/main` | Category of user's channels |
| `Media/channel/main` | Default user channel |

## Roles

`Media/admins` — Full media management, can grant/revoke hosts and screeners. `Users/hosts` — Show hosts with broad permissions (can grant members/guests/screeners, full access to WebRTC rooms). `Users/screeners` — Call screeners with read + edit access to WebRTC rooms.

## Database

No custom tables. All data lives in Streams infrastructure — stream attributes (startTime, endTime, audience, scheduledStartTime, accessType, resumeClosed, isWaitingRoom), participant extras (listener, reminders), relations (Media/webrtc/livestream, Media/presentation, Media/presentation/tool, Media/livestream/dest, Media/clip, Media/feed, Media/live), and access rows.

## Configuration

```json
{
    "Media": {
        "twilio": { "accountSid": "...", "apiKey": "...", "apiSecret": "...", "authToken": "..." },
        "access": { "feeds": { "admins": ["Media/admins", "Users/owners"] } },
        "feeds": { "anyoneNewFeed": false },
        "clip": { "webrtc": { "relations": { "main": "Media/webrtc" } } }
    },
    "Users": {
        "quotas": { "Media/webrtc": { "86400": { "": 10, "Users/owners": 1000 } } }
    }
}
```