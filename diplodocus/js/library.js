import db from './db.js';
import { deleteBook } from './storage.js';
import { showToast, escapeHtml, coverGradient } from './utils.js';

// Track object URLs so we can revoke them when cards are removed
const _objectUrls = new Map(); // bookId → url

/**
 * Creates and returns a book card DOM element.
 * @param {{ id: number, title: string, author: string, coverBlob?: Blob|null }} book
 */
export function createBookCard(book) {
  const card = document.createElement('article');
  card.className = 'book-card';
  card.dataset.id = book.id;

  card.innerHTML = `
    <div class="book-cover-wrap">${buildCoverHtml(book)}</div>
    <div class="book-info">
      <div class="book-title">${escapeHtml(book.title)}</div>
      <div class="book-author">${escapeHtml(book.author)}</div>
      <div class="book-progress-label">${buildProgressLabel(book)}</div>
    </div>
    <button class="book-remove-btn" title="Remove from library" aria-label="Remove ${escapeHtml(book.title)} from library">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/>
      </svg>
    </button>
  `;

  card.querySelector('.book-remove-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    confirmRemove(book);
  });

  // Clicking anywhere else opens the reader
  card.addEventListener('click', (e) => {
    if (e.target.closest('.book-remove-btn')) return;
    card.dispatchEvent(new CustomEvent('open-book', { bubbles: true, detail: book }));
  });

  return card;
}

function buildCoverHtml(book) {
  const progressBar = buildProgressBar(book);

  if (book.coverBlob) {
    const url = URL.createObjectURL(book.coverBlob);
    _objectUrls.set(book.id, url);
    return `<img class="book-cover" src="${url}" alt="${escapeHtml(book.title)} cover" loading="lazy" decoding="async">${progressBar}`;
  }

  const gradient = coverGradient(book.title);
  const letter   = escapeHtml((book.title || '?').charAt(0).toUpperCase());
  const snippet  = escapeHtml(book.title);
  return `
    <div class="book-cover-placeholder" style="background:${gradient}">
      <span class="cover-letter">${letter}</span>
      <span class="cover-title-snippet">${snippet}</span>
    </div>
    ${progressBar}`;
}

/** Returns a thin progress bar element or empty string. */
function buildProgressBar(book) {
  const pct = _progressPct(book);
  return pct > 0 ? `<div class="book-cover-progress" style="width:${pct.toFixed(1)}%"></div>` : '';
}

/** "Ch. X of Y" when started, "Y chapters" when unread, '' otherwise. */
function buildProgressLabel(book) {
  const { lastChapterIndex, chapterCount } = book;
  if (chapterCount > 0 && lastChapterIndex !== undefined) {
    return `Ch. ${lastChapterIndex + 1} of ${chapterCount}`;
  }
  if (chapterCount > 0) return `${chapterCount} chapters`;
  return '';
}

/** Percentage of chapters read (0–100), based on lastChapterIndex. */
function _progressPct(book) {
  const { lastChapterIndex, chapterCount } = book;
  if (!chapterCount || lastChapterIndex === undefined) return 0;
  return Math.min(100, (lastChapterIndex / chapterCount) * 100);
}

async function confirmRemove(book) {
  if (!confirm(`Remove "${book.title}" from your library?\n\nThe file will be deleted from local storage.`)) return;

  try {
    await Promise.all([
      db.books.delete(book.id),
      db.chapters.where('bookId').equals(book.id).delete(),
      deleteBook(book.id),
    ]);

    // Revoke object URL to free memory
    const url = _objectUrls.get(book.id);
    if (url) { URL.revokeObjectURL(url); _objectUrls.delete(book.id); }

    document.querySelector(`.book-card[data-id="${book.id}"]`)?.remove();
    updateEmptyState();
    showToast('Book removed from library', 'success');
  } catch (err) {
    console.error('Failed to remove book', err);
    showToast('Failed to remove book', 'error');
  }
}

/** Shows/hides the empty state based on whether the grid has cards. */
export function updateEmptyState() {
  const grid = document.getElementById('book-grid');
  const empty = document.getElementById('empty-state');
  const hasBooks = grid.children.length > 0;
  grid.classList.toggle('hidden', !hasBooks);
  empty.classList.toggle('hidden', hasBooks);
}

/**
 * Updates the progress bar and label on a library card after a reading session.
 * Called by reader.js when the reader closes.
 *
 * @param {number} bookId
 * @param {{ chapIdx: number, totalChapters: number }} update
 */
export function refreshCardProgress(bookId, { chapIdx, totalChapters }) {
  const card = document.querySelector(`.book-card[data-id="${bookId}"]`);
  if (!card) return;

  const pct = totalChapters > 0 ? Math.min(100, (chapIdx / totalChapters) * 100) : 0;

  // Update or create progress bar on the cover
  let bar = card.querySelector('.book-cover-progress');
  if (pct > 0) {
    if (bar) {
      bar.style.width = `${pct.toFixed(1)}%`;
    } else {
      card.querySelector('.book-cover-wrap')
        ?.insertAdjacentHTML('beforeend',
          `<div class="book-cover-progress" style="width:${pct.toFixed(1)}%"></div>`);
    }
  }

  // Update progress label
  const label = card.querySelector('.book-progress-label');
  if (label && totalChapters > 0) {
    label.textContent = `Ch. ${chapIdx + 1} of ${totalChapters}`;
  }
}
