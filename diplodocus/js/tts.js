/**
 * tts.js — Web Speech API engine for sentence-by-sentence TTS playback.
 *
 * Design notes:
 *   - "Pause" is implemented as cancel() + remember sentenceIndex, not
 *     speechSynthesis.pause(), which is unreliable in Chrome (stops after ~15s).
 *   - One utterance at a time. The next sentence is queued in the `end` handler.
 *   - Chapters are parsed lazily and cached in memory.
 *   - Position is persisted to IndexedDB on stop() and on book completion.
 */

import { getChapters, loadChapterSentences } from './content.js';
import db from './db.js';

export class TTSEngine {
  // ── Private state ───────────────────────────────────────────
  #bookId   = null;
  #chapters = [];
  #cache    = new Map();   // chapterIndex → string[]
  #chapIdx  = 0;
  #sentIdx  = 0;
  #state    = 'idle';      // 'idle' | 'loading' | 'playing' | 'paused' | 'stopped'
  #onUpdate = null;

  // ── Configurable (Phase 6 will expose UI for these) ─────────
  rate  = 1.0;
  pitch = 1.0;
  voice = null;   // null = browser default

  constructor(onUpdate) {
    this.#onUpdate = onUpdate;
  }

  // ── Lifecycle ───────────────────────────────────────────────

  /**
   * Loads a book's chapters and restores the last saved position.
   * Sets state to 'stopped' when ready.
   */
  async open(bookId) {
    window.speechSynthesis.cancel();
    this.#bookId = bookId;
    this.#cache.clear();
    this.#state  = 'loading';
    this.#emit();

    this.#chapters = await getChapters(bookId);

    const book     = await db.books.get(bookId);
    const savedCh  = book?.lastChapterIndex  ?? 0;
    const savedSen = book?.lastSentenceIndex ?? 0;

    this.#chapIdx = Math.max(0, Math.min(savedCh,  this.#chapters.length - 1));
    this.#sentIdx = Math.max(0, savedSen);

    this.#state = 'stopped';
    this.#emit();
  }

  /** Release resources — call when leaving the reader. */
  destroy() {
    window.speechSynthesis.cancel();
    this.#state    = 'idle';
    this.#onUpdate = null;
  }

  // ── Playback controls ───────────────────────────────────────

  play() {
    if (this.#state === 'playing' || this.#state === 'loading' || this.#state === 'idle') return;
    this.#state = 'playing';
    this.#emit();
    this.#advance().catch(err => this.#fail(err));
  }

  /** Cancel the current utterance but remember where we are. */
  pause() {
    if (this.#state !== 'playing') return;
    window.speechSynthesis.cancel();
    this.#state = 'paused';
    this.#emit();
  }

  /** Cancel + save position to IndexedDB. */
  stop() {
    window.speechSynthesis.cancel();
    this.#state = 'stopped';
    this.#emit();
    this.#persist().catch(console.error);
  }

  /**
   * Persist current position without changing playback state.
   * Called externally on page-hide / visibility-change events.
   */
  savePosition() {
    return this.#persist();
  }

  /** Returns the current position and sentence text (for bookmarking). */
  getPosition() {
    return {
      chapIdx:      this.#chapIdx,
      sentIdx:      this.#sentIdx,
      chapterTitle: this.#chapters[this.#chapIdx]?.title ?? '',
      excerpt:      this.#cache.get(this.#chapIdx)?.[this.#sentIdx] ?? '',
    };
  }

  /** Jump to a specific chapter and sentence; resumes playback if already playing. */
  jumpTo(chapIdx, sentIdx) {
    if (this.#state === 'idle' || this.#state === 'loading') return;
    const wasPlaying = this.#state === 'playing';
    window.speechSynthesis.cancel();
    this.#chapIdx = Math.max(0, Math.min(chapIdx, this.#chapters.length - 1));
    this.#sentIdx = Math.max(0, sentIdx);
    this.#emit();
    if (wasPlaying) {
      this.#state = 'playing';
      this.#advance().catch(err => this.#fail(err));
    }
  }

  /** Jump to the very beginning of the book (chapter 0, sentence 0). */
  restart() {
    const wasPlaying = this.#state === 'playing';
    window.speechSynthesis.cancel();
    this.#chapIdx = 0;
    this.#sentIdx = 0;
    this.#emit();
    if (wasPlaying) {
      this.#state = 'playing';
      this.#advance().catch(err => this.#fail(err));
    }
  }

  /** Jump to the first sentence of the current chapter. */
  rewind() {
    const wasPlaying = this.#state === 'playing';
    window.speechSynthesis.cancel();
    this.#sentIdx = 0;
    this.#emit();
    if (wasPlaying) {
      this.#state = 'playing';
      this.#advance().catch(err => this.#fail(err));
    }
  }

  /** Jump to the start of the next chapter. */
  forward() {
    if (this.#chapters.length === 0) return;
    const wasPlaying = this.#state === 'playing';
    window.speechSynthesis.cancel();
    if (this.#chapIdx < this.#chapters.length - 1) {
      this.#chapIdx++;
      this.#sentIdx = 0;
    }
    this.#emit();
    if (wasPlaying) {
      this.#state = 'playing';
      this.#advance().catch(err => this.#fail(err));
    }
  }

  // ── Internal playback loop ──────────────────────────────────

  async #advance() {
    if (this.#state !== 'playing') return;

    if (this.#chapters.length === 0) {
      this.#state = 'stopped';
      this.#emit();
      return;
    }

    let sentences;
    try {
      sentences = await this.#loadSentences(this.#chapIdx);
    } catch (err) {
      // Chapter failed to load — skip it rather than halting playback
      console.warn(`Skipping chapter ${this.#chapIdx} (${err.message})`);
      if (this.#chapIdx < this.#chapters.length - 1) {
        this.#chapIdx++;
        this.#sentIdx = 0;
        this.#emit();
        return this.#advance();
      }
      this.#state = 'stopped';
      this.#emit();
      return;
    }

    // Chapter exhausted → advance to the next
    if (this.#sentIdx >= sentences.length) {
      if (this.#chapIdx < this.#chapters.length - 1) {
        this.#chapIdx++;
        this.#sentIdx = 0;
        this.#emit();
        return this.#advance();
      }
      // Book complete — reset to the beginning
      this.#state   = 'stopped';
      this.#chapIdx = 0;
      this.#sentIdx = 0;
      this.#emit();
      this.#persist().catch(console.error);
      return;
    }

    const text      = sentences[this.#sentIdx];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate  = this.rate;
    utterance.pitch = this.pitch;
    if (this.voice) utterance.voice = this.voice;

    utterance.addEventListener('end', () => {
      if (this.#state !== 'playing') return;
      this.#sentIdx++;
      this.#emit();
      // Throttled auto-save: persist every 5 sentences so a sudden
      // tab-close loses at most a few sentences of progress.
      if (this.#sentIdx % 5 === 0) this.#persist().catch(console.error);
      this.#advance().catch(err => this.#fail(err));
    });

    utterance.addEventListener('error', e => {
      // 'canceled' / 'interrupted' = we called cancel() on purpose
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      console.warn(`TTS error (${e.error}):`, text.slice(0, 60));
      if (this.#state !== 'playing') return;
      // Skip the problematic sentence and continue
      this.#sentIdx++;
      this.#advance().catch(err => this.#fail(err));
    });

    window.speechSynthesis.speak(utterance);

    // Pre-warm next chapter while this one plays
    if (this.#sentIdx === 0 && this.#chapIdx < this.#chapters.length - 1) {
      this.#loadSentences(this.#chapIdx + 1).catch(() => {});
    }
  }

  async #loadSentences(chapIdx) {
    if (!this.#cache.has(chapIdx)) {
      const chapter   = this.#chapters[chapIdx];
      const sentences = await loadChapterSentences(this.#bookId, chapter.href);
      this.#cache.set(chapIdx, sentences.length > 0 ? sentences : ['(No readable text in this chapter.)']);
    }
    return this.#cache.get(chapIdx);
  }

  async #persist() {
    if (!this.#bookId) return;
    await db.books.update(this.#bookId, {
      lastChapterIndex:  this.#chapIdx,
      lastSentenceIndex: this.#sentIdx,
    });
  }

  #fail(err) {
    console.error('Playback error:', err);
    this.#state = 'stopped';
    this.#emit();
  }

  #emit() {
    if (!this.#onUpdate) return;
    const cached = this.#cache.get(this.#chapIdx);
    this.#onUpdate({
      state:           this.#state,
      chapIdx:         this.#chapIdx,
      sentIdx:         this.#sentIdx,
      totalChapters:   this.#chapters.length,
      chapterTitle:    this.#chapters[this.#chapIdx]?.title ?? '',
      currentSentence: cached?.[this.#sentIdx] ?? '',
    });
  }
}
