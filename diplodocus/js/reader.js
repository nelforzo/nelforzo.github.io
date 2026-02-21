/**
 * reader.js — Full-screen reader view.
 *
 * Manages the reader HTML section, wires the TTSEngine to the UI,
 * and handles keyboard shortcuts while the reader is open.
 */

import { TTSEngine } from './tts.js';
import { escapeHtml, coverGradient, showToast } from './utils.js';
import { refreshCardProgress } from './library.js';
import { saveBookmark, renderBookmarkList } from './bookmarks.js';
import { loadSettings, resolveVoice, renderSettingsPanel } from './settings.js';

// ── Module state ──────────────────────────────────────────────

let engine         = null;
let coverUrl       = null;
let lastState      = 'idle';
let kbAbort        = null;   // AbortController for keyboard listener
let currentBookId  = null;   // id of the book currently open
let lastUpdate     = null;   // most recent onUpdate payload from engine

// ── DOM refs ──────────────────────────────────────────────────

const readerView  = document.getElementById('reader-view');
const elBookTitle = document.getElementById('reader-book-title');
const elCover     = document.getElementById('reader-cover');
const elChapter   = document.getElementById('reader-chapter-title');
const elSentence  = document.getElementById('reader-sentence');
const elFill      = document.getElementById('reader-progress-fill');
const elLabel     = document.getElementById('reader-progress-label');
const btnBack            = document.getElementById('reader-back-btn');
const btnRestart         = document.getElementById('ctrl-restart');
const btnPlay            = document.getElementById('ctrl-play');
const btnForward         = document.getElementById('ctrl-forward');
const btnSettings        = document.getElementById('ctrl-settings');
const settingsPanel      = document.getElementById('reader-settings-panel');
const btnSettingsClose   = document.getElementById('settings-close-btn');
const btnBookmarks       = document.getElementById('ctrl-bookmarks');
const bookmarksPanel     = document.getElementById('reader-bookmarks-panel');
const bookmarksList      = document.getElementById('bookmarks-list');
const bookmarksEmpty     = document.getElementById('bookmarks-empty');
const btnBookmarksAdd    = document.getElementById('bookmarks-add-btn');
const btnBookmarksClose  = document.getElementById('bookmarks-close-btn');

// ── Public API ────────────────────────────────────────────────

/**
 * Opens the reader for a book object (as stored in / returned from Dexie).
 * @param {{ id: number, title: string, coverBlob: Blob|null }} book
 */
export async function openReader(book) {
  _destroyEngine();
  _releaseCover();

  if (!('speechSynthesis' in window)) {
    alert('Text-to-speech is not supported in this browser.');
    return;
  }

  // Header
  elBookTitle.textContent = book.title;

  // Cover art
  if (book.coverBlob) {
    coverUrl = URL.createObjectURL(book.coverBlob);
    elCover.innerHTML = `<img src="${coverUrl}" alt="${escapeHtml(book.title)} cover">`;
  } else {
    const grad = coverGradient(book.title);
    const ltr  = escapeHtml(book.title.charAt(0).toUpperCase());
    elCover.innerHTML = `
      <div class="reader-cover-placeholder" style="background:${grad}">
        <span class="reader-cover-letter">${ltr}</span>
      </div>`;
  }

  currentBookId = book.id;

  // Media Session — lock-screen controls and OS media integration
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  book.title,
      artist: book.author ?? '',
      album:  book.title,
    });
    navigator.mediaSession.setActionHandler('play',          () => engine?.play());
    navigator.mediaSession.setActionHandler('pause',         () => engine?.pause());
    navigator.mediaSession.setActionHandler('nexttrack',     () => engine?.forward());
    navigator.mediaSession.setActionHandler('previoustrack', () => engine?.rewind());
    navigator.mediaSession.setActionHandler('seekforward',   () => engine?.forward());
    navigator.mediaSession.setActionHandler('seekbackward',  () => engine?.rewind());
  }

  // Reset panels
  _closeSettingsPanel();
  _closeBookmarksPanel();

  // Show reader, hide library
  readerView.classList.remove('hidden');
  document.getElementById('main').classList.add('hidden');
  document.querySelector('.app-header').classList.add('hidden');

  // Reset UI to loading state
  _render({ state: 'loading', chapIdx: 0, sentIdx: 0, totalChapters: 0, chapterTitle: '', currentSentence: '' });

  // Keyboard shortcuts
  kbAbort = new AbortController();
  document.addEventListener('keydown', _onKeyDown, { signal: kbAbort.signal });

  // Apply persisted playback settings (per-book, falling back to global defaults)
  const s = loadSettings(book.id);
  engine = new TTSEngine(_render);
  engine.rate  = s.rate;
  engine.pitch = s.pitch;
  engine.voice = resolveVoice(s.voiceURI);

  try {
    await engine.open(book.id);
  } catch (err) {
    elChapter.textContent  = 'Failed to load book';
    elSentence.textContent = err.message;
  }
}

/** Stops playback, saves position, and returns to the library. */
export function closeReader() {
  // Capture final update before destroying — stop() triggers one last emit
  engine?.stop();
  const finalUpdate = lastUpdate;
  const bookId      = currentBookId;

  _destroyEngine();
  _releaseCover();
  kbAbort?.abort();
  kbAbort       = null;
  currentBookId = null;

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = null;
  }

  readerView.classList.add('hidden');
  document.getElementById('main').classList.remove('hidden');
  document.querySelector('.app-header').classList.remove('hidden');

  // Reflect the new position on the library card immediately
  if (bookId && finalUpdate?.totalChapters > 0) {
    refreshCardProgress(bookId, finalUpdate);
  }
}

// ── Engine → UI ───────────────────────────────────────────────

function _render(update) {
  lastUpdate = update;
  const { state, chapIdx, sentIdx, totalChapters, chapterTitle, currentSentence } = update;
  lastState = state;

  // Chapter title / sentence
  if (totalChapters === 0 && state !== 'loading') {
    elChapter.textContent  = 'No chapters found';
    elSentence.textContent = 'Remove and re-import this book to enable playback.';
  } else {
    elChapter.textContent  = chapterTitle || '—';
    elSentence.textContent =
      state === 'loading' ? 'Loading…' :
      state === 'stopped' && !currentSentence ? 'Press play to start.' :
      currentSentence;
  }

  // Keep lock-screen chapter title in sync
  if ('mediaSession' in navigator && navigator.mediaSession.metadata && chapterTitle && chapterTitle !== '—') {
    navigator.mediaSession.metadata.title = chapterTitle;
  }

  // Chapter progress
  const chNum = chapIdx + 1;
  elFill.style.width  = totalChapters > 0 ? `${(chNum / totalChapters) * 100}%` : '0%';
  elLabel.textContent = totalChapters > 0 ? `Chapter ${chNum} of ${totalChapters}` : '';

  // Play/Pause icon toggle
  const isPlaying = state === 'playing';
  btnPlay.innerHTML = isPlaying ? _iconPause() : _iconPlay();
  btnPlay.title     = isPlaying ? 'Pause' : 'Play';
  btnPlay.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');

  // Enable / disable controls
  const ready = state !== 'idle' && state !== 'loading' && totalChapters > 0;
  btnPlay.disabled          = !ready;
  btnRestart.disabled       = !ready;
  btnForward.disabled       = !ready;
  btnBookmarksAdd.disabled  = !ready;

  readerView.dataset.state = state;
}

// ── Button handlers ───────────────────────────────────────────

btnBack.addEventListener('click', closeReader);

btnPlay.addEventListener('click', () => {
  if (!engine) return;
  if (lastState === 'playing') engine.pause();
  else engine.play();
});

btnRestart.addEventListener('click', () => engine?.restart());

btnForward.addEventListener('click', () => engine?.forward());

// ── Unload / visibility saving ────────────────────────────────
// Save position whenever the page is hidden (tab switch, close, minimize).
// Uses savePosition() which persists without changing playback state,
// so the TTS can resume naturally if the page comes back (e.g. tab switch).

function _saveOnHide() {
  if (!engine || lastState === 'idle' || lastState === 'loading' || lastState === 'stopped') return;
  engine.savePosition().catch(console.error);
}

window.addEventListener('pagehide', _saveOnHide);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    _saveOnHide();
  } else {
    // Page returned to foreground — restart the playback loop if iOS dropped it
    engine?.resumeIfStalled();
  }
});

// ── Keyboard shortcuts ────────────────────────────────────────

function _onKeyDown(e) {
  if (e.target.closest('input, textarea, select, button')) return;
  switch (e.key) {
    case ' ':
      e.preventDefault();
      if (lastState === 'playing') engine?.pause();
      else engine?.play();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      engine?.rewind();
      break;
    case 'ArrowRight':
      e.preventDefault();
      engine?.forward();
      break;
    case 'Escape':
      closeReader();
      break;
  }
}

// ── Settings ──────────────────────────────────────────────────

btnSettings.addEventListener('click', () => {
  const isOpen = settingsPanel.classList.toggle('open');
  btnSettings.classList.toggle('active', isOpen);
  if (isOpen) {
    _closeBookmarksPanel();
    renderSettingsPanel(settingsPanel, engine, currentBookId);
  }
});

btnSettingsClose.addEventListener('click', _closeSettingsPanel);

function _closeSettingsPanel() {
  settingsPanel.classList.remove('open');
  btnSettings.classList.remove('active');
}

// ── Bookmarks ─────────────────────────────────────────────────

btnBookmarks.addEventListener('click', () => {
  const isOpen = bookmarksPanel.classList.toggle('open');
  btnBookmarks.classList.toggle('active', isOpen);
  if (isOpen) {
    _closeSettingsPanel();
    _refreshBookmarkList();
  }
});

btnBookmarksClose.addEventListener('click', _closeBookmarksPanel);

btnBookmarksAdd.addEventListener('click', async () => {
  if (!engine || !currentBookId) return;
  const pos = engine.getPosition();
  await saveBookmark(currentBookId, pos);
  showToast('Bookmark saved', 'success');
  _refreshBookmarkList();
});

function _closeBookmarksPanel() {
  bookmarksPanel.classList.remove('open');
  btnBookmarks.classList.remove('active');
}

function _refreshBookmarkList() {
  if (!currentBookId) return;
  renderBookmarkList(bookmarksList, bookmarksEmpty, currentBookId, (chapIdx, sentIdx) => {
    engine?.jumpTo(chapIdx, sentIdx);
    _closeBookmarksPanel();
  }).catch(console.error);
}

// ── Helpers ───────────────────────────────────────────────────

function _destroyEngine() {
  engine?.destroy();
  engine     = null;
  lastState  = 'idle';
  lastUpdate = null;
}

function _releaseCover() {
  if (coverUrl) { URL.revokeObjectURL(coverUrl); coverUrl = null; }
  elCover.innerHTML = '';
}

function _iconPlay() {
  return `<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>`;
}

function _iconPause() {
  return `<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
  </svg>`;
}
