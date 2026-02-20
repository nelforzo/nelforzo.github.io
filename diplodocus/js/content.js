/**
 * content.js — EPUB content extraction and text tokenization.
 *
 * Provides two public functions for the TTS engine (Phase 3):
 *   getChapters(bookId)              → Chapter[] from IndexedDB (fast, no I/O)
 *   loadChapterSentences(bookId, href) → string[] from Cache Storage (parses on demand)
 */

import JSZip from 'jszip';
import db from './db.js';
import { getBook } from './storage.js';

// ── Public API ────────────────────────────────────────────────

/**
 * Returns the ordered chapter list for a book from IndexedDB.
 * @param {number} bookId
 * @returns {Promise<Array<{ id, bookId, spineIndex, title, href }>>}
 */
export async function getChapters(bookId) {
  return db.chapters
    .where('bookId').equals(bookId)
    .sortBy('spineIndex');
}

/**
 * Loads a chapter from Cache Storage, extracts its text, and tokenizes
 * it into an array of sentences ready for TTS playback.
 *
 * @param {number} bookId
 * @param {string} href  Full zip-relative path (e.g. "OEBPS/Text/ch1.html")
 * @returns {Promise<string[]>}
 */
export async function loadChapterSentences(bookId, href) {
  const epubBlob = await getBook(bookId);
  if (!epubBlob) throw new Error(`Book ${bookId} not found in storage`);

  const zip = await JSZip.loadAsync(epubBlob);
  const entry = findZipEntry(zip, href);
  if (!entry) throw new Error(`Chapter not found in EPUB: ${href}`);

  const html = await entry.async('text');
  const paragraphs = extractParagraphs(html);

  // Each paragraph is tokenized; results are flattened into a single sentence list.
  return paragraphs.flatMap(tokenizeSentences);
}

/**
 * Locates a zip entry by href, falling back gracefully when the stored path
 * was corrupted by an older version of resolveHref.
 *
 * Fallback strategies (tried in order):
 *   1. Exact match — the happy path for books imported after the path fix.
 *   2. URL-decoded match — handles stored paths with %20 etc. not yet decoded.
 *   3. Suffix match — handles paths that were truncated (e.g. "enson,..." instead
 *      of "Stephenson,...") or stored with a leading slash ("/ch1.htm").
 *      Matches the first HTML/XHTML entry whose lowercased path ends with the
 *      lowercased decoded href (stripped of a leading slash if present).
 *
 * @param {JSZip} zip
 * @param {string} href
 * @returns {JSZip.JSZipObject|null}
 */
function findZipEntry(zip, href) {
  // 1. Exact match
  const exact = zip.file(href);
  if (exact) return exact;

  // 2. URL-decoded match (stored as "OEBPS/Ste%20phenson.htm" → "OEBPS/Stephenson.htm")
  let decoded;
  try { decoded = decodeURIComponent(href); } catch { decoded = href; }
  if (decoded !== href) {
    const byDecoded = zip.file(decoded);
    if (byDecoded) return byDecoded;
  }

  // 3. Suffix match across all HTML/XHTML entries
  // Strip a leading slash before comparing so "/ch1.htm" matches "OEBPS/ch1.htm"
  const needle = decoded.replace(/^\//, '').toLowerCase();
  const htmlEntries = zip.file(/\.(x?html?|xml)$/i);
  for (const entry of htmlEntries) {
    if (entry.name.toLowerCase().endsWith(needle)) return entry;
  }

  return null;
}

// ── Text extraction ───────────────────────────────────────────

const BLOCK_TAGS = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'li', 'blockquote', 'td', 'th', 'caption', 'figcaption', 'dt', 'dd',
]);

/**
 * Parses an HTML string and returns an array of text paragraphs.
 * Targets "leaf" block elements — blocks that contain no further block-level
 * descendants — to avoid extracting the same text multiple times.
 */
function extractParagraphs(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Strip non-content nodes
  doc.querySelectorAll('script, style, nav').forEach(el => el.remove());

  const paragraphs = [];

  function walk(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();

    if (BLOCK_TAGS.has(tag)) {
      const hasBlockChild = [...node.children].some(c => BLOCK_TAGS.has(c.tagName.toLowerCase()));
      if (!hasBlockChild) {
        const text = node.textContent.replace(/\s+/g, ' ').trim();
        if (text) paragraphs.push(text);
        return; // don't descend; we've captured this block's text
      }
    }

    for (const child of node.childNodes) walk(child);
  }

  if (doc.body) walk(doc.body);

  // Fallback for EPUB files with no block-level markup
  if (paragraphs.length === 0 && doc.body) {
    const raw = doc.body.textContent.replace(/\s+/g, ' ').trim();
    if (raw) paragraphs.push(raw);
  }

  return paragraphs;
}

// ── Sentence tokenizer ────────────────────────────────────────

// Private-Use Area sentinels — safe placeholders that won't appear in book text
const SAFE_PERIOD  = '\uE001';
const SAFE_ELLIPSIS = '\uE002';

// Abbreviations that must not trigger a sentence split
const ABBREV_PATTERN = new RegExp(
  '\\b(' + [
    'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr', 'Rev', 'Gen',
    'Sgt', 'Cpl', 'Pvt', 'St', 'vs', 'etc', 'Inc', 'Ltd', 'Corp',
    'Co', 'Vol', 'No', 'Dept', 'approx', 'est', 'min', 'max', 'fig',
    'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
  ].join('|') + ')\\.', 'gi'
);

/**
 * Splits a paragraph of text into an array of sentences suitable for TTS.
 *
 * Handles:
 *   - Common abbreviations (Dr., Mr., etc.)
 *   - Decimal numbers (3.14, v1.2)
 *   - Single uppercase initials (J. R. R. Tolkien)
 *   - Ellipsis (... and ..)
 *   - Closing quotes after sentence-ending punctuation
 *
 * @param {string} text
 * @returns {string[]}
 */
export function tokenizeSentences(text) {
  text = text.replace(/\s+/g, ' ').trim();
  if (!text) return [];

  // 1. Protect ellipsis (two or more dots)
  text = text.replace(/\.{2,}/g, SAFE_ELLIPSIS);

  // 2. Protect decimal numbers: 3.14, v1.2.3
  text = text.replace(/(\d)\.(\d)/g, `$1${SAFE_PERIOD}$2`);

  // 3. Protect known abbreviations
  text = text.replace(ABBREV_PATTERN, (_, abbr) => abbr + SAFE_PERIOD);

  // 4. Protect single uppercase initials followed by another uppercase or end-of-string
  //    Catches "J. R. R. Tolkien" and "U.S.A." but not "end of sentence. Next"
  text = text.replace(/\b([A-Z])\.(?=\s*[A-Z]|$)/g, `$1${SAFE_PERIOD}`);

  // 5. Split on sentence boundaries:
  //    [.?!] optionally followed by a closing quote/bracket,
  //    then whitespace, then an uppercase letter or opening quote.
  //    Lookbehind keeps the punctuation on the left-hand sentence.
  const parts = text.split(/(?<=[.?!][\u201D\u2019"']?)\s+(?=[A-Z\u201C\u2018"'(])/);

  // 6. Restore sentinels and filter empty fragments
  return parts
    .map(s =>
      s
        .replace(new RegExp(SAFE_PERIOD,   'g'), '.')
        .replace(new RegExp(SAFE_ELLIPSIS, 'g'), '...')
        .trim()
    )
    .filter(s => s.length > 1);
}
