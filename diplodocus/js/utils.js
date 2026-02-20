// ── Toast notifications ───────────────────────────────────────

/** @param {string} message @param {'success'|'error'|''} type */
export function showToast(message, type = '') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = ['toast', type].filter(Boolean).join(' ');
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    setTimeout(() => toast.remove(), 320);
  }, 3200);
}

// ── HTML escaping ─────────────────────────────────────────────

const _div = document.createElement('div');

/** Escapes a string for safe insertion into HTML. */
export function escapeHtml(str) {
  _div.textContent = str ?? '';
  return _div.innerHTML;
}

// ── Cover placeholder color ───────────────────────────────────

const GRADIENTS = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#a18cd1', '#fbc2eb'],
  ['#fccb90', '#d57eeb'],
  ['#a1c4fd', '#c2e9fb'],
  ['#fd7043', '#ff8a65'],
  ['#26c6da', '#00acc1'],
];

/**
 * Returns a deterministic CSS gradient string based on the book title.
 * @param {string} title
 * @returns {string} CSS linear-gradient value
 */
export function coverGradient(title) {
  let hash = 0;
  for (const ch of title) hash = (Math.imul(hash, 31) + ch.charCodeAt(0)) | 0;
  const [a, b] = GRADIENTS[Math.abs(hash) % GRADIENTS.length];
  return `linear-gradient(145deg, ${a}, ${b})`;
}
