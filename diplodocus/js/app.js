import './debug.js';
import db from './db.js';
import { storeBook } from './storage.js';
import { parseEpubMetadata } from './epub.js';
import { createBookCard, updateEmptyState } from './library.js';
import { showToast } from './utils.js';
import { openReader } from './reader.js';
import { APP_VERSION } from './version.js';

document.getElementById('app-version').textContent = APP_VERSION;

// ── Bootstrap ─────────────────────────────────────────────────

async function init() {
  await loadLibrary();
  setupImportTriggers();
  setupDragAndDrop();

  // Book card → reader
  document.addEventListener('open-book', e => {
    openReader(e.detail).catch(console.error);
  });
}

// ── Library loading ───────────────────────────────────────────

async function loadLibrary() {
  const books = await db.books.orderBy('addedAt').reverse().toArray();
  const grid = document.getElementById('book-grid');
  for (const book of books) {
    grid.appendChild(createBookCard(book));
  }
  updateEmptyState();
}

// ── Import ────────────────────────────────────────────────────

async function restoreBookFile(book, file) {
  await storeBook(book.id, file);
  if (file.size !== book.fileSize) {
    await db.books.update(book.id, { fileSize: file.size });
  }
}

async function importFiles(fileList) {
  const files = [...fileList].filter(f => f.name.toLowerCase().endsWith('.epub'));

  if (files.length === 0) {
    showToast('No EPUB files found in selection', 'error');
    return;
  }

  const byFilename = new Map(
    (await db.books.toArray()).map(b => [b.filename, b])
  );

  const toRestore = [];
  const toImport  = [];

  for (const file of files) {
    const existing = byFilename.get(file.name);
    if (existing) toRestore.push({ file, book: existing });
    else toImport.push(file);
  }

  const total = toRestore.length + toImport.length;
  const progress = showProgress();
  let restored = 0;
  let imported = 0;
  let failed   = 0;
  let done     = 0;

  for (const { file, book } of toRestore) {
    progress.setLabel(`Restoring "${shortenName(file.name)}"…`);

    try {
      await restoreBookFile(book, file);
      restored++;
    } catch (err) {
      console.error(`Failed to restore "${file.name}":`, err);
      failed++;
    }

    done++;
    progress.setPercent((done / total) * 100);
  }

  for (const file of toImport) {
    progress.setLabel(`Importing "${shortenName(file.name)}"…`);

    try {
      const { title, author, coverBlob, chapters } = await parseEpubMetadata(file);

      const id = await db.books.add({
        title,
        author,
        filename: file.name,
        fileSize: file.size,
        addedAt: new Date(),
        coverBlob: coverBlob ?? null,
        chapterCount: chapters.length,
      });

      // Store chapters in their own table for fast lookup by the TTS engine
      if (chapters.length > 0) {
        await db.chapters.bulkAdd(chapters.map(ch => ({ ...ch, bookId: id })));
      }

      await storeBook(id, file);

      // Prepend card to grid
      const grid = document.getElementById('book-grid');
      const card = createBookCard({ id, title, author, coverBlob, chapterCount: chapters.length });
      grid.insertBefore(card, grid.firstChild);

      imported++;
    } catch (err) {
      console.error(`Failed to import "${file.name}":`, err);
      failed++;
    }

    done++;
    progress.setPercent((done / total) * 100);
  }

  progress.close();
  updateEmptyState();

  // Summary toast
  const parts = [];
  if (restored) parts.push(`${restored} book${restored !== 1 ? 's' : ''} restored`);
  if (imported) parts.push(`${imported} book${imported !== 1 ? 's' : ''} imported`);
  if (failed)   parts.push(`${failed} failed`);
  const ok = restored + imported;
  showToast(parts.join(' · '), failed > 0 && ok === 0 ? 'error' : 'success');
}

function shortenName(name, max = 40) {
  return name.length > max ? name.slice(0, max - 1) + '…' : name;
}

// ── Progress dialog ───────────────────────────────────────────

function showProgress() {
  const overlay  = document.getElementById('import-overlay');
  const statusEl = document.getElementById('import-status');
  const barEl    = document.getElementById('import-progress-bar');
  const detailEl = document.getElementById('import-detail');

  overlay.classList.remove('hidden');
  barEl.style.width = '0%';
  detailEl.textContent = '';

  return {
    setLabel(msg) { statusEl.textContent = msg; },
    setPercent(pct) { barEl.style.width = `${pct}%`; },
    close() { overlay.classList.add('hidden'); },
  };
}

// ── Import triggers ───────────────────────────────────────────

function setupImportTriggers() {
  const fileInput      = document.getElementById('file-input');
  const importBtn      = document.getElementById('import-btn');
  const emptyImportBtn = document.getElementById('empty-import-btn');

  const openPicker = () => fileInput.click();
  importBtn.addEventListener('click', openPicker);
  emptyImportBtn.addEventListener('click', openPicker);

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      importFiles(e.target.files);
      e.target.value = ''; // reset so same file can be re-selected
    }
  });
}

// ── Drag and drop ─────────────────────────────────────────────
// Uses a counter to avoid spurious dragenter/dragleave events
// when the pointer moves over child elements.

function setupDragAndDrop() {
  const dragOverlay = document.getElementById('drag-overlay');
  let dragDepth = 0;

  document.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth++;
    if (dragDepth === 1) dragOverlay.classList.remove('hidden');
  });

  document.addEventListener('dragover', (e) => {
    if (hasFiles(e)) e.preventDefault(); // required to allow drop
  });

  document.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) dragOverlay.classList.add('hidden');
  });

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    dragOverlay.classList.add('hidden');
    if (e.dataTransfer?.files.length) importFiles(e.dataTransfer.files);
  });
}

function hasFiles(e) {
  return e.dataTransfer?.types?.includes('Files');
}

// ── Start ─────────────────────────────────────────────────────

init().catch(console.error);
