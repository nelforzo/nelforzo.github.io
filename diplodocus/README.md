# Diplodocus

A local-first e-reader that **listens, not reads**.

Diplodocus is a browser-based EPUB reader with a twist: instead of displaying the text of a book on screen, it uses the browser's built-in Text-to-Speech engine (Web Speech API) to read it aloud. Your library and all book files live entirely in the browser — nothing is sent to a server.

---

## How it works

1. **Import** EPUB files from your file system (file picker or drag-and-drop).
2. **Open** a book — the reader screen shows playback controls, not text.
3. **Listen.** The app reads the book chapter by chapter, sentence by sentence.
4. **Stop anytime.** Your position is saved automatically.
5. **Resume** exactly where you left off the next time you open the book.

---

## Storage model

| What | Where | Why |
|---|---|---|
| EPUB files (raw) | Cache Storage | Large binary blobs, served efficiently |
| Book metadata, covers, reading position | IndexedDB (Dexie) | Structured, queryable, persistent |

---

## Playback controls

| Control | Action |
|---|---|
| **Rewind** | Jump to the start of the current chapter |
| **Play / Pause** | Start or pause narration |
| **Stop** | Stop narration and save position |
| **Forward** | Skip to the next chapter |

---

## Current state

- [x] Library screen — grid view of imported books
- [x] EPUB import — file picker and drag-and-drop, duplicate detection
- [x] EPUB metadata extraction — title, author, cover image
- [x] Cache Storage layer for raw EPUB files
- [x] IndexedDB (Dexie) schema for book metadata and chapters
- [x] EPUB spine + TOC parsing (EPUB 2 NCX and EPUB 3 nav)
- [x] HTML text extraction (block-level DOM traversal)
- [x] Sentence tokenizer with abbreviation and decimal protection
- [x] `TTSEngine` class — sentence-queue TTS player with position memory
- [x] Reader screen — full-screen player view with cover, chapter info, progress
- [x] Playback controls (Rewind / Play-Pause / Stop / Forward) + keyboard shortcuts
- [x] Position persistence — saves on stop, every 5 sentences, and on page hide
- [x] Library cards show reading progress (bar + "Ch. X of Y" label)

---

## Roadmap

### Phase 2 — EPUB content extraction ✓
Parse the readable content out of an EPUB so the TTS engine has clean text to work with.

- [x] Parse EPUB spine to produce an ordered list of content documents
- [x] Extract and clean body text from HTML content files (strip tags, handle whitespace)
- [x] Parse the Table of Contents (NCX / EPUB 3 nav) to get named chapters
- [x] Tokenise each chapter into sentences (splitting on `.`, `?`, `!` with edge-case handling)
- [x] Store the parsed chapter list in IndexedDB (`chapters` table, keyed by `bookId`)

### Phase 3 — TTS reader engine ✓
Wrap the Web Speech API into a reliable, stateful playback engine.

- [x] Sentence-queue player using `SpeechSynthesisUtterance` (one utterance at a time)
- [x] Pause implemented as `cancel()` + remembered position (avoids Chrome 15s resume bug)
- [x] Chapter boundary detection — advances automatically when a chapter ends
- [x] `TTSEngine` class: `play()`, `pause()`, `stop()`, `rewind()`, `forward()`, `destroy()`
- [x] Sentence cache per chapter; next chapter pre-warmed while current plays
- [x] Position auto-saved to IndexedDB on `stop()` and book completion

### Phase 4 — Reader screen & controls ✓
A dedicated screen that opens when a book is tapped from the library.

- [x] Full-screen reader view (no page reload — swap views with show/hide)
- [x] Playback controls: Rewind, Play/Pause, Stop, Forward
- [x] Current chapter title and chapter X of Y progress bar
- [x] Current sentence displayed as narration progresses
- [x] Keyboard shortcuts: Space (play/pause), ← (rewind), → (forward), Esc (close)

### Phase 5 — Position persistence ✓
Never lose your place.

- [x] Save position on `stop()` (explicit) and every 5 sentences (throttled auto-save)
- [x] Save on `pagehide` and `visibilitychange → hidden` without stopping playback
- [x] Restore saved `{ chapterIndex, sentenceIndex }` automatically on book open
- [x] Chapter progress bar on every library card (thin line at the bottom of the cover)
- [x] "Ch. X of Y" label per card, updated live when the reader closes
- [x] Bug fix: `resolveHref` now uses `http://x/` base so path resolution is correct
      across all browsers and handles absolute hrefs (e.g. `/cvi.htm`) and `../` paths

### Phase 6 — Playback settings
- [ ] Voice selector (list available `SpeechSynthesisVoice` entries)
- [ ] Speed control (0.5× – 2×)
- [ ] Pitch control
- [ ] Persist settings per-book or globally in IndexedDB

### Phase 7 — Polish & UX
- [ ] Keyboard shortcuts (Space = play/pause, ← → = chapter nav)
- [ ] Sleep timer (stop after N minutes)
- [ ] Chapter list / jump-to-chapter panel
- [ ] Book detail screen (title, author, file size, time remaining estimate)
- [ ] Library sort and filter options

---

## Running locally

ES modules and the Cache Storage API require a server — open `index.html` directly over `file://` will not work.

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .

# Deno
deno run --allow-net --allow-read https://deno.land/std/http/file_server.ts
```

Then open `http://localhost:8000`.

---

## Tech stack

- **Vanilla JS** (ES modules, no framework)
- **Standard CSS** (custom properties, grid, no preprocessor)
- **Dexie.js** — ergonomic IndexedDB wrapper
- **JSZip** — EPUB/ZIP parsing in the browser
- **Web Speech API** — browser-native TTS, no API key required
