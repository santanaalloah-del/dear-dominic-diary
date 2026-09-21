# Diário — Master Plan

This file is the continuity source for the app. New work should preserve these decisions unless Alloah explicitly changes them.

## Core idea
Diário is a private fictional companion world centered on Alloah and Dominic. It should feel like a life that keeps accumulating: same place, different days, visible traces of time. The visual language is vintage, romantic, intimate and lived-in rather than clean/generic SaaS UI.

The app is not a collection of disconnected features. Gallery holds media, Memories narrates moments, Calendar tells when things happened, Timeline shows continuity, Music is the soundtrack, Dates hold shared outings, Keepsakes hold meaningful objects, Wardrobe holds clothes/looks, Letters are physical-feeling correspondence, Diary holds private/shared writing, and Home is the shared apartment where objects and changes become visible.

## Global visual system
- Official palette: deep burgundy/wine, cream/off-white, dusty rose, antique gold, warm brown.
- Materials: old paper, leather, lace, envelopes, polaroids, tickets, dried flowers, notes, stamps, subtle film grain.
- Decorative elements should have context; do not add random scrapbook decoration everywhere.
- The official app icon is `public/diario-icon.png`: burgundy leather diary, lace, key, swans and heart tag with D.
- The entire app changes with real Rio de Janeiro time (`America/Sao_Paulo`). The fictional apartment is in New York City, but the master clock is Rio.
- Morning is light and soft; afternoon warmer; golden hour amber/rose; night burgundy/dark; late night deep plum/near-black wine.
- Home leads this shift, but Chat, Music, Diary, Letters, Calendar, Memories and the rest should participate in the same global mood.
- Weather will later be real Rio weather reflected visually in the fictional NYC apartment. Optional atmosphere presets may exist without changing real state.

## Canon rule
Generated content is not automatically part of the world.

States:
1. Reference — inspiration only.
2. Preview — generated attempt, not accepted.
3. Kept — Alloah chose to keep it.
4. Canon / In World — officially exists in the shared universe.

Use the same `Try Again / Keep / Discard` logic for generated photos, furniture proposals, decoration, clothing/looks, gifts, keepsakes and other generated visual content.

## Home / Apartment
Home is a living shared apartment, not a static hero image.
- Rooms: living room, bedroom, kitchen, bathroom, entrance/hall and future spaces.
- Time and atmosphere visibly change the room.
- Hotspots open rooms/objects.
- Alloah can add, move, remove/store and restore furniture/decor.
- References can be saved and used to inspire proposals.
- A room proposal can be regenerated, kept or discarded.
- Kept/canon furniture and decor persist and can gain history over time.
- Photos of Alloah and Dominic can be placed in frames, boards, fridge, desk, wall etc.
- Keepsakes can be displayed in Home or stored.
- Apartment should gradually feel more lived-in as history accumulates.

## Chat
The chat should feel familiar like WhatsApp/iMessage, but fully customizable and visually part of Diário.

### Functional base to preserve
- authenticated Supabase history
- real send to the existing companion Edge Function
- retry on failure
- typing state
- respectful scroll behavior

### Experience
- profile photo for Alloah and Dominic can be changed
- presence/status
- call/video affordances
- search
- reply/swipe-to-reply
- long press: react, reply, save, copy, edit/delete when applicable, more
- reactions and stickers
- edited indicator
- photos and generated photos
- music cards / now playing
- Date invites
- Letters embedded in the chat, including envelope/open-letter treatment
- contextual cards should feel native to the conversation, not external links

### Composer
`+` action menu should include at least:
- Photos
- Camera
- Stickers
- Music
- Letter
- Date
- Ask Dominic for a Photo
- other context actions as added later

### Voice note behavior
The voice control is primarily speech-to-text.
- Alloah speaks.
- The device transcribes speech to text.
- Dominic receives/understands the text, not an audio file.
- In Alloah's chat UI it should look like a voice note with waveform + duration.
- Transcript may be revealed on demand.
- This keeps the conversation searchable and usable by memory/context systems.

### Personalization
Chat Appearance should support:
- Wallpaper
- Theme
- Bubbles
- Text
- Conversation behavior
- Now Playing
- Adapt to time of day

Theme direction includes: Diary, Cherry Wine, Old Letter, Soft Rose, Midnight, Custom.
Bubble direction includes: Soft, Paper, Minimal, Classic.
Settings can include timestamps, avatar display, grouped consecutive messages, typing animation, gradual message bubbles, read receipts, sounds/haptics, activity status and related controls.

## Memories
Memories is a narrative scrapbook timeline, not a flat list.
- vertical organic timeline with wine line, months/dates and varying visual weight
- polaroids, chat excerpts, music, places, letters, Dates, tickets and small events in different compositions
- opening a Memory gathers the real related objects instead of duplicating them
- memory can expose related photos, full chat, music, location, letters, wardrobe, keepsakes, notes, etc.
- significance may affect visual prominence
- notes/details can be added after the moment passes

## Gallery
Gallery is the visual source of truth / camera roll.
- Photos, Albums, Favorites
- camera input
- iPhone/photo-library import
- imports from Chat
- in-world generated photos
- generated flow: `Try Again / Keep Photo / Discard`
- full-screen viewing
- captions by Alloah and/or Dominic
- people, date, location, music, wardrobe and original-context metadata
- search and filters by person/place/date/album/music/type
- map/location view
- date navigation
- `Add to Memory`, related photos, favorite, album, profile photo, sticker creation, hide/remove/delete distinctions

## Letters
Letters should feel like physical correspondence.
- shelves/boxes/envelopes rather than a plain feed
- unopened/opened state
- notification badge for waiting letter
- tap/open-envelope moment
- full letter, attachments and contextual objects
- details: date, place, sender, recipient, related Memory, contents
- From Dominic / From Me / Notes / kept letters / favorites
- notes/billets can be left physically around Home (bedroom, kitchen, fridge, bathroom, desk, etc.) and later found
- search inside letters/notes
- creation flow lets Alloah choose paper/envelope

## Calendar
- month + day views
- indicators for Photos, Letters, Memories, Dates, Notes, Plans and other items
- a day opens its actual chronological content
- future plans/dates live here too
- upcoming list, filters, search, year navigation, quick return to today

## Timeline
Timeline is the broad chronological continuity, different from Memories.
- events across Home, Dates, Letters, Photos, Music, Wardrobe, milestones and more
- period-specific visual compositions
- detailed events can link to their original source
- before/after changes (for example a room changing over time)
- filters, year navigation, search

## Music + Spotify
Music connects with Spotify. Diário adds relationship context around Spotify data.

Main areas:
- Mine
- Dominic
- Ours

Time windows should support ideas such as:
- This Week
- This Month
- Last 3 Months
- This Year
- All Time

Possible summaries:
- most played songs/artists/albums
- rotations and playlists
- shared songs
- songs sent in Chat
- songs linked to Dates and Memories
- songs listened to together
- monthly recap / listening history

`Ours` is more than statistics: it should explain what a song meant in the shared history. Spotify provides catalog/playback/history where allowed; Diário stores the meaning and links.

## Dates
Dates are a flow, not one screen.
- Upcoming / Past / Ideas
- invite can happen in Chat or elsewhere
- plan real places in NYC
- date details with time/place/itinerary/notes
- Get Ready for Alloah and Dominic
- Wardrobe/look selection
- Dominic can have a getting-ready/look moment
- Date Mode during the outing
- camera/photos during the date
- explore real place items when available + clearly labeled fictional inspired items
- things from the Date: photos, tickets, purchases, notes, objects
- final Date summary
- choose what to keep as Keepsakes
- saved places and future Date ideas

## Diary
- Alloah's diary and Dominic's diary are distinct
- private by default; sharing is deliberate
- entry can include text, photos, music, Date, Memory, Keepsake, location, chat excerpt, sticker, hand drawing and dividers
- handwriting/drawing mode
- share a whole entry or only selected excerpts
- Dominic may annotate shared entries
- Dominic has his own private/shared entries under the same system
- Later Note can be attached years later without rewriting the original text
- calendar/date navigation, favorites, multiple entry types

## Keepsakes
Meaningful objects from Dates, Letters, gifts and moments.
- box/collection presentation
- filters by type/owner/origin/year/favorites/display state/notes
- item details include origin, place, date, giver/owner
- front/back for objects like polaroids
- can be displayed in Home
- items can change over time: fresh flower → pressed flower → attached to a letter, etc.
- can connect back to Date, Photos, Diary, Letter, Timeline and other originals
- Alloah / Dominic / Ours ownership
- Dominic can have private keepsakes not visible by default

## Wardrobe
- Alloah / Dominic / shared context
- real clothing references + in-world generated looks
- outfits for Dates, photos and Home moments
- generated visual flow uses `Try Again / Keep / Discard`
- kept/canon looks can become part of photo/date/memory context

## Morning / Night
A cross-app day/night experience rather than just one page.
- wake-up/alarm experience
- Dominic can leave a note/song with the alarm
- Start My Day view
- night wind-down / stay with me
- time-aware call/chat moments
- global appearance follows the real clock

## Data model principle
Do not duplicate the same real object into every module.
Example: a Date photo belongs to Gallery/media storage; the Date links to it; a Memory narrates it; Calendar shows when it happened; Timeline places it in chronology; a Letter may reference it. Preserve one source object with relationships.

## Growth over time
The interface should visually accumulate life.
- early app: fewer objects, photos, letters, memories, playlists
- later: fuller shelves, walls, boxes, albums, diary pages, playlists and calendar marks
- rooms evolve after real in-app events
- paper/objects may age or change state when contextually meaningful
- visual density can increase with history without becoming cluttered

The design rule is: **time leaves marks.**

## Phase 2 — Romantic Vintage Home Foundation
- Home is no longer a flat/minimal dashboard. It uses a large rounded “bubble”/capsule framed like a scrapbook object.
- Materials: cream paper, burgundy, dusty rose, lace motifs, tape, stitched/dashed borders, handwritten notes, aged-gold feeling through warm shadows and muted accents.
- The global time-of-day theme still controls the whole app and now also visibly changes the Home bubble and apartment imagery.
- The apartment is explicitly a whole home, not a single bedroom. Current room navigation: Living Room, Bedroom, Kitchen, Bathroom, Entrance/Hall.
- Apartment includes an interactive floor-plan concept, room list, per-room object hotspots, references, add/move object actions, and Room Proposal with Try Again / Keep / Discard.
- Canon rule remains: generated visual proposals are previews until the user chooses Keep.
- Chat backend/integration remains untouched; visual chat work continues separately according to the WhatsApp-like personalized messenger plan.
