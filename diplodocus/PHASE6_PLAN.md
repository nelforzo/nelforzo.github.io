# Phase 6 — Playback Settings

## Context
Phase 6 exposes the voice, speed, and pitch controls that are already wired into TTSEngine
but never changed from their defaults. Settings are global (not per-book) and persisted in
`localStorage` (no DB migration needed).

---

## Design

**Settings panel** — slides up from above the controls, identical animation pattern to the
bookmarks panel (`max-height` 0 → 280px). Opened by a ⚙ gear button on the LEFT side of
the controls bar (symmetrical with the 🔖 bookmark button on the right).

Opening the settings panel closes the bookmarks panel, and vice versa.

Controls layout after change:
```
[⚙ Settings]   [↺]  [▶]  [⏭]   [🔖 Bookmarks]
```

**Panel contents:**
```
Voice        [System default ▾]
Speed  0.5×  [────●───────────] 2×   (value: 1.0×)
Pitch  low   [────────●───────] high (value: 1.0)
```

Changes apply to the engine immediately (take effect on the next sentence) and save to
`localStorage` on every input event.

---

## Files

| File | Change |
|---|---|
| `js/settings.js` | **New** — load/save (localStorage), resolveVoice(), renderSettingsPanel() |
| `js/reader.js` | Add settings DOM refs, wire button toggle, apply settings on open |
| `index.html` | Add ⚙ button + settings panel HTML before bookmarks panel |
| `css/styles.css` | Settings panel styles; split `.ctrl-btn-side` into left/right variants |

`js/tts.js` and `js/db.js` require **no changes** — `rate`, `pitch`, `voice` properties
are already declared (tts.js:26-28) and applied to every utterance (tts.js:212-214).

---

## Implementation steps

### 1. `js/settings.js` (new file)

```js
const KEY = 'ereader-settings';
const DEFAULTS = { rate: 1.0, pitch: 1.0, voiceURI: null };

export function loadSettings() { … }    // merge stored JSON with DEFAULTS
export function saveSettings(patch) { … } // merge-write to localStorage
export function resolveVoice(voiceURI) { … } // find SpeechSynthesisVoice by URI

export function renderSettingsPanel(panelEl, engine) { … }
// Populates voice select, rate/pitch sliders.
// Listens to speechSynthesis 'voiceschanged' to populate voice list.
// On each input: update engine property + call saveSettings().
```

Voice list: flat `<select>` populated from `speechSynthesis.getVoices()`, sorted by lang
then name, with a "System default" option at the top. Handles the async `voiceschanged`
event so it works in Chrome (where getVoices() is empty on first call).

### 2. `index.html`

Add inside `.reader-bottom`, **before** `.reader-bookmarks-panel`:
```html
<div id="reader-settings-panel" class="reader-settings-panel">
  <div class="settings-panel-header">
    <span class="settings-panel-title">Settings</span>
    <button id="settings-close-btn" class="settings-close-btn" aria-label="Close settings">
      <!-- ✕ SVG icon -->
    </button>
  </div>
  <div class="settings-body">
    <label class="settings-row">
      <span class="settings-label">Voice</span>
      <select id="settings-voice" class="settings-select"></select>
    </label>
    <label class="settings-row">
      <span class="settings-label">Speed</span>
      <div class="settings-slider-wrap">
        <span class="settings-slider-min">0.5×</span>
        <input type="range" id="settings-rate" min="0.5" max="2" step="0.1" value="1">
        <span class="settings-slider-max">2×</span>
        <span class="settings-slider-val" id="settings-rate-val">1.0×</span>
      </div>
    </label>
    <label class="settings-row">
      <span class="settings-label">Pitch</span>
      <div class="settings-slider-wrap">
        <span class="settings-slider-min">low</span>
        <input type="range" id="settings-pitch" min="0.5" max="2" step="0.1" value="1">
        <span class="settings-slider-max">high</span>
        <span class="settings-slider-val" id="settings-pitch-val">1.0</span>
      </div>
    </label>
  </div>
</div>
```

Change bookmarks button class: `ctrl-btn ctrl-btn-side` → `ctrl-btn ctrl-btn-side ctrl-btn-side-right`

Add settings button (left side of `.reader-controls-main`, before restart button):
```html
<button class="ctrl-btn ctrl-btn-side ctrl-btn-side-left" id="ctrl-settings" title="Settings" aria-label="Settings">
  <!-- gear SVG -->
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
</button>
```

### 3. `css/styles.css`

Split `.ctrl-btn-side { right: 20px }` into:
```css
.ctrl-btn-side {
  position: absolute;
  color: var(--text-muted);
}
.ctrl-btn-side-left  { left: 20px; }
.ctrl-btn-side-right { right: 20px; }
.ctrl-btn-side:hover  { color: var(--text); }
.ctrl-btn-side.active { color: var(--primary); }
```

Add `.reader-settings-panel` (same slide animation as bookmarks):
```css
.reader-settings-panel {
  background: var(--surface);
  border-top: 1px solid var(--border);
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.28s ease;
}
.reader-settings-panel.open {
  max-height: 280px;
  overflow-y: auto;
}

.settings-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--surface);
  z-index: 1;
}
.settings-panel-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text);
}
.settings-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: 4px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  transition: background 0.15s;
}
.settings-close-btn:hover { background: var(--surface-2); color: var(--text); }

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}
.settings-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.settings-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.settings-select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font-size: 0.875rem;
  cursor: pointer;
}
.settings-slider-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.settings-slider-min,
.settings-slider-max {
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
}
.settings-slider-wrap input[type="range"] {
  flex: 1;
  accent-color: var(--primary);
  cursor: pointer;
}
.settings-slider-val {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary);
  min-width: 2.5rem;
  text-align: right;
}
```

### 4. `js/reader.js`

```js
import { loadSettings, saveSettings, resolveVoice, renderSettingsPanel } from './settings.js';

// New DOM refs to add:
const btnSettings       = document.getElementById('ctrl-settings');
const settingsPanel     = document.getElementById('reader-settings-panel');
const btnSettingsClose  = document.getElementById('settings-close-btn');

// In openReader(), after engine = new TTSEngine(_render) and before engine.open():
const s = loadSettings();
engine.rate  = s.rate;
engine.pitch = s.pitch;
engine.voice = resolveVoice(s.voiceURI);

// Also reset settings panel on open:
_closeSettingsPanel();

// Settings button handler:
btnSettings.addEventListener('click', () => {
  const isOpen = settingsPanel.classList.toggle('open');
  btnSettings.classList.toggle('active', isOpen);
  if (isOpen) {
    _closeBookmarksPanel();
    renderSettingsPanel(settingsPanel, engine);
  }
});

btnSettingsClose.addEventListener('click', _closeSettingsPanel);

function _closeSettingsPanel() {
  settingsPanel.classList.remove('open');
  btnSettings.classList.remove('active');
}

// Also close settings panel in _closeBookmarksPanel() and vice versa:
// When bookmarks opens → call _closeSettingsPanel()
// When settings opens  → call _closeBookmarksPanel()
```

---

## Persistence

- **Storage**: `localStorage` key `ereader-settings`, JSON `{ rate, pitch, voiceURI }`
- **Load**: on every `openReader()` call, before starting engine
- **Save**: on every slider `input` event and voice `change` event
- **Apply**: directly mutate `engine.rate`, `engine.pitch`, `engine.voice` — takes effect on next utterance

---

## Verification

1. Open a book, start playback
2. Open settings (⚙ button)
3. Change speed to 1.5× — next sentence plays faster
4. Change voice — next sentence uses new voice
5. Close reader, reopen book — settings restored from localStorage
6. Open settings panel while bookmarks panel is open — bookmarks closes automatically
