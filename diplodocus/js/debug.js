/**
 * debug.js — In-app debug log.
 *
 * Usage:  import { dbg } from './debug.js';
 *         dbg('TAG', 'message', anyValue);
 *
 * Tap the version number in the header to open the log overlay.
 */

const MAX_ENTRIES = 300;
const _log = [];

/** Add an entry to the circular log buffer (also console.debug). */
export function dbg(tag, ...args) {
  const msg = args.map(a => {
    if (a === null)      return 'null';
    if (a === undefined) return 'undefined';
    try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
    catch { return String(a); }
  }).join(' ');

  _log.push({ t: new Date().toISOString().slice(11, 23), tag, msg });
  if (_log.length > MAX_ENTRIES) _log.shift();
  console.debug(`[${tag}] ${msg}`);
}

// ── Overlay ───────────────────────────────────────────────────

let _overlay = null;

function _buildOverlay() {
  const el = document.createElement('div');
  el.className = 'debug-overlay';
  el.innerHTML = `
    <div class="debug-dialog">
      <div class="debug-header">
        <span class="debug-title">Debug Log</span>
        <div class="debug-actions">
          <button class="debug-btn" id="debug-copy-btn">Copy</button>
          <button class="debug-btn" id="debug-clear-btn">Clear</button>
          <button class="debug-btn debug-btn-close" id="debug-close-btn">✕</button>
        </div>
      </div>
      <div class="debug-log" id="debug-log-content"></div>
    </div>`;
  document.body.appendChild(el);

  el.querySelector('#debug-close-btn').addEventListener('click', _hide);
  el.addEventListener('click', e => { if (e.target === el) _hide(); });

  el.querySelector('#debug-clear-btn').addEventListener('click', () => {
    _log.length = 0;
    _renderLog();
  });

  el.querySelector('#debug-copy-btn').addEventListener('click', () => {
    const text = _log.map(e => `[${e.t}] [${e.tag}] ${e.msg}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      const btn = el.querySelector('#debug-copy-btn');
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    });
  });

  return el;
}

function _renderLog() {
  const content = document.getElementById('debug-log-content');
  if (!content) return;
  if (_log.length === 0) {
    content.innerHTML = '<p class="debug-empty">No entries yet.</p>';
    return;
  }
  content.innerHTML = _log.slice().reverse().map(e =>
    `<div class="debug-entry">
      <span class="debug-entry-meta">[${e.t}] <b>${e.tag}</b></span>
      <span class="debug-entry-msg">${e.msg}</span>
    </div>`
  ).join('');
}

function _show() {
  if (!_overlay) _overlay = _buildOverlay();
  _renderLog();
  _overlay.classList.add('open');
}

function _hide() {
  _overlay?.classList.remove('open');
}

// ── Wire version tap ──────────────────────────────────────────

function _wire() {
  const ver = document.querySelector('.app-version');
  if (!ver) return;
  ver.addEventListener('click', _show);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _wire);
} else {
  _wire();
}
