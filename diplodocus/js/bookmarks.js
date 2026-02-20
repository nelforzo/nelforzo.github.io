/**
 * bookmarks.js — Bookmark CRUD and list rendering.
 */

import db from './db.js';
import { escapeHtml } from './utils.js';

// ── Data layer ────────────────────────────────────────────────

export async function saveBookmark(bookId, { chapIdx, sentIdx, chapterTitle, excerpt }) {
  return db.bookmarks.add({
    bookId,
    chapIdx,
    sentIdx,
    chapterTitle,
    excerpt: (excerpt || '').slice(0, 160),
    addedAt: Date.now(),
  });
}

export async function removeBookmark(id) {
  return db.bookmarks.delete(id);
}

async function loadBookmarks(bookId) {
  const all = await db.bookmarks.where('bookId').equals(bookId).toArray();
  return all.sort((a, b) => b.addedAt - a.addedAt);
}

// ── Rendering ─────────────────────────────────────────────────

/**
 * Populates the bookmarks panel list for a book.
 *
 * @param {HTMLElement} listEl     - container for bookmark items
 * @param {HTMLElement} emptyEl    - "no bookmarks" message element
 * @param {number}      bookId
 * @param {Function}    onJump     - called with (chapIdx, sentIdx) when a bookmark is tapped
 */
export async function renderBookmarkList(listEl, emptyEl, bookId, onJump) {
  const bookmarks = await loadBookmarks(bookId);

  if (bookmarks.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  listEl.innerHTML = bookmarks.map(bm => `
    <div class="bookmark-item" data-id="${bm.id}">
      <button class="bookmark-jump-btn"
              data-chapidx="${bm.chapIdx}"
              data-sentidx="${bm.sentIdx}"
              aria-label="Jump to bookmark in ${escapeHtml(bm.chapterTitle || 'chapter')}">
        <div class="bookmark-meta">${escapeHtml(bm.chapterTitle || '—')}</div>
        <div class="bookmark-excerpt">${escapeHtml(bm.excerpt || '…')}</div>
      </button>
      <button class="bookmark-delete-btn" data-id="${bm.id}" aria-label="Delete bookmark">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `).join('');

  listEl.querySelectorAll('.bookmark-jump-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      onJump(parseInt(btn.dataset.chapidx, 10), parseInt(btn.dataset.sentidx, 10));
    });
  });

  listEl.querySelectorAll('.bookmark-delete-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      await removeBookmark(parseInt(btn.dataset.id, 10));
      await renderBookmarkList(listEl, emptyEl, bookId, onJump);
    });
  });
}
