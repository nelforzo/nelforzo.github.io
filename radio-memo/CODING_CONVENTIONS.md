# Coding Conventions

This document defines the comprehensive coding standards for the Radio Memo project. Following these conventions ensures consistency, maintainability, and quality across the codebase.

## Table of Contents
1. [Naming Conventions](#naming-conventions)
2. [Code Style](#code-style)
3. [JavaScript Conventions](#javascript-conventions)
4. [CSS Conventions](#css-conventions)
5. [HTML Conventions](#html-conventions)
6. [Documentation Requirements](#documentation-requirements)
7. [Service Worker](#service-worker)
8. [Database](#database)
9. [Performance](#performance)
10. [Testing](#testing)
11. [File Structure](#file-structure)

---

## Naming Conventions

### Variables
- Use `snake_case` for all variable names
- Use descriptive names that clearly indicate purpose
- Constants should also use `snake_case` (not SCREAMING_CASE)
- Examples:
  ```javascript
  const total_count = 10;
  const frequency_unit = 'MHz';
  let current_page = 1;
  const ITEMS_PER_PAGE = 10;  // Constant
  let cached_total_count = null;
  let is_loading_logs = false;
  ```

### Functions
- Use `camelCase` for all function names
- Use descriptive, action-oriented names (verbs)
- This applies to function declarations and function expressions
- **Note**: Variables that hold function values should still use `camelCase` (not `snake_case`)
- Examples:
  ```javascript
  function loadLogs() { }
  function formatTimestamp() { }
  function detectBandFromFrequency() { }
  async function handleFormSubmit() { }

  // Even when assigning to a variable, use camelCase
  const handleFormSubmit = function() { };
  const exportLogs = async function() { };
  ```

### IDs and Classes (HTML/CSS)
- Use `kebab-case` for HTML element IDs
- Use `kebab-case` for CSS class names
- Examples:
  ```html
  <div id="new-log-form"></div>
  <button class="btn-primary"></button>
  ```

---

## Code Style

### Visual Aesthetic
- **Font**: DotGothic16 for all UI elements
- **Theme**: Pixelated, retro terminal/amateur radio aesthetic
- **Colors**: High contrast (black text on white, or light text on dark in dark mode)
- **Borders**: Subtle gray borders (`#ccc` in light mode, `#555` in dark mode)
- **No rounded corners**: All borders use `border-radius: 0`
- **No shadows**: Do not use `box-shadow` or `text-shadow`
- **Monospaced pixel font**: Applied throughout the entire interface

### Design Principles
- Minimalist, functional design
- Clear visual hierarchy
- Consistent spacing and alignment
- High readability on all screen sizes
- Dark mode support via `prefers-color-scheme`

---

## JavaScript Conventions

### Variable Declarations
- Always use `const` for values that don't change
- Use `let` for values that will be reassigned
- **Never use `var`** - it has function scope and can cause bugs
- Examples:
  ```javascript
  const db = new Dexie('RadioMemoDatabase');  // Won't be reassigned
  let current_page = 1;  // Will be reassigned
  const ITEMS_PER_PAGE = 10;  // Constant value
  ```

### Async/Await
- Prefer `async/await` over promise chains for better readability
- Always handle errors with try/catch blocks
- Examples:
  ```javascript
  async function loadLogs() {
      try {
          const logs = await db.logs.toArray();
          displayLogs(logs);
      } catch (error) {
          alert('ログの読み込みに失敗しました。');
      }
  }
  ```

### Error Handling
- Use try/catch for async operations
- Provide user-friendly error messages
- Log detailed errors to console for debugging
- Examples:
  ```javascript
  try {
      await db.logs.add(log_data);
      hideNewLogForm();
      await loadLogs();
  } catch (error) {
      alert('ログの保存に失敗しました。');
      console.error('Save error:', error);
  }
  ```

### Event Listeners
- Use named functions for event handlers when possible
- Use event delegation for dynamically generated content
- Remove event listeners when no longer needed to prevent memory leaks
- Examples:
  ```javascript
  // Good: Named function
  new_log_btn.addEventListener('click', showNewLogForm);

  // Good: Event delegation
  logs_container.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-delete')) {
          deleteLog(parseInt(e.target.dataset.logId));
      }
  });
  ```

### Function Patterns
- Keep functions focused on a single responsibility
- Functions should be small and easy to understand
- Use meaningful parameter names
- Return early to avoid deep nesting

### Code Organization
- Group related functionality together
- Place constants at the top of files
- Initialize service worker early
- Set up event listeners in a dedicated setup function

---

## CSS Conventions

### Border Styling
- **No border-radius**: Always use `border-radius: 0` for square corners
- **No box-shadow**: Do not use shadows anywhere
- **Subtle borders**: Use `#ccc` (light mode) or `#555` (dark mode)
- Examples:
  ```css
  .btn-primary {
      border: 1px solid #000;
      border-radius: 0;  /* Always square */
  }
  ```

### Dark Mode Support
- Use `@media (prefers-color-scheme: dark)` for dark mode styles
- Provide contrasting colors for readability
- Light mode: `#fff` background, `#000` text, `#ccc` borders
- Dark mode: `#1a1a1a` or `#2a2a2a` background, `#e0e0e0` text, `#555` borders
- Examples:
  ```css
  body {
      background-color: #fff;
      color: #000;
  }

  @media (prefers-color-scheme: dark) {
      body {
          background-color: #1a1a1a;
          color: #e0e0e0;
      }
  }
  ```

### Responsive Design
- Mobile-first approach
- Use flexbox and CSS Grid for layouts
- Test on mobile (320px+), tablet (768px+), and desktop (1200px+)
- Common breakpoints:
  ```css
  @media (max-width: 600px) { /* Mobile */ }
  @media (min-width: 768px) { /* Tablet */ }
  @media (min-width: 900px) { /* Desktop grid */ }
  @media (min-width: 1200px) { /* Large desktop */ }
  @media (min-width: 1600px) { /* Extra large */ }
  ```

### Typography
- **Font family**: `'DotGothic16', monospace` for all elements
- Apply to all form elements explicitly:
  ```css
  input, textarea, select, button {
      font-family: 'DotGothic16', monospace;
  }
  ```
- Font sizes: Minimum 14px for body text, 16px for inputs (prevents iOS zoom)

### Hover States
- Subtle background color changes
- Light mode: Hover to `#e0e0e0`
- Dark mode: Hover to `#3a3a3a`
- No text decoration changes on buttons
- Examples:
  ```css
  .btn-primary:hover {
      background-color: #e0e0e0;
  }

  @media (prefers-color-scheme: dark) {
      .btn-primary:hover {
          background-color: #3a3a3a;
      }
  }
  ```

---

## HTML Conventions

### Semantic HTML
- Use semantic elements (`<header>`, `<main>`, `<footer>`, `<section>`)
- Use proper heading hierarchy (`<h1>`, `<h2>`, etc.)
- Use `<button>` for actions, `<a>` for navigation
- Examples:
  ```html
  <header>
      <h1>RADIO MEMO</h1>
  </header>
  <main>
      <section id="logList">
          <h2>ログ一覧</h2>
      </section>
  </main>
  ```

### Accessibility
- Add ARIA roles where appropriate (`role="button"`)
- Include `tabindex` for keyboard navigation
- Provide `title` attributes for context
- Use proper `<label>` elements for form inputs
- Examples:
  ```html
  <h1 id="pageTitle" role="button" tabindex="0" title="最初のページに戻る">
      RADIO MEMO
  </h1>
  <label for="frequency">周波数:</label>
  <input type="number" id="frequency" name="frequency">
  ```

### Form Structure
- Group related inputs with class="form-group"
- Use proper input types (`number`, `text`, `file`)
- Include `required` attribute for mandatory fields
- Use `placeholder` for helpful hints
- Examples:
  ```html
  <div class="form-group">
      <label for="callsign">相手局コールサイン:</label>
      <input type="text" id="callsign" name="callsign" placeholder="例: JA1ABC">
  </div>
  ```

### Data Attributes
- Use `data-*` attributes for storing element-specific data
- Examples:
  ```html
  <button class="btn-delete" data-log-id="${log.id}">削除</button>
  ```

---

## Documentation Requirements

### Function Documentation (JSDoc)
- **All functions must have JSDoc comments**
- Include a brief description of what the function does
- Document all parameters with `@param` tags (include type and description)
- Document return values with `@returns` tag (include type and description)
- Use `@throws` if the function can throw errors (optional)
- Add examples for complex functions (optional)

#### JSDoc Format:
```javascript
/**
 * Brief description of what the function does
 *
 * @param {type} paramName - Description of the parameter
 * @param {type} anotherParam - Description of another parameter
 * @returns {type} Description of return value
 */
function functionName(paramName, anotherParam) {
    // implementation
}
```

#### Examples:
```javascript
/**
 * Formats frequency with appropriate unit based on band
 *
 * @param {string} frequency - Frequency value
 * @param {string} band - Band type (LF, MF, HF, VHF, UHF)
 * @returns {string} Formatted frequency with unit (always 3 decimal places)
 */
function formatFrequencyWithUnit(frequency, band) {
    const unit = getFrequencyUnit(band);
    const frequency_num = parseFloat(frequency);
    return `${frequency_num.toFixed(3)} ${unit}`;
}

/**
 * Handles form submission and saves log data to database
 *
 * @param {Event} event - Form submit event
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    // implementation
}
```

### Inline Comments
- Add comments where code intent is not immediately obvious
- Explain "why" rather than "what" when possible
- Keep comments concise and relevant
- Use Japanese for user-facing strings, English for code comments
- Examples:
  ```javascript
  // Skip if value hasn't changed (performance optimization)
  if (current_value_key === last_frequency_value) {
      return;
  }

  // Calculate total pages, ensuring at least 1 page exists
  total_pages = Math.max(1, Math.ceil(total_count / ITEMS_PER_PAGE));
  ```

### File Headers
- Add a comment at the top of JavaScript files describing the file's purpose
- Examples:
  ```javascript
  // Service Worker for offline functionality
  // v38: Soften container border colors to subtle grays
  ```

### When to Update Documentation
- When adding new functions
- When changing function signatures
- When modifying behavior
- When fixing bugs that affect function contracts

---

## Service Worker

### Cache Versioning Strategy
- **Update cache version with every change** to HTML, CSS, or JS files
- Use semantic naming: `radio-memo-v##`
- Increment version number sequentially
- Include a comment describing what changed in this version
- Examples:
  ```javascript
  // v38: Soften container border colors to subtle grays
  const CACHE_NAME = 'radio-memo-v38';
  ```

### Files to Cache
- All HTML, CSS, and JS files
- All PWA manifest and icon files
- External dependencies (Dexie.js, Google Fonts)
- Examples:
  ```javascript
  const urls_to_cache = [
      './',
      './index.html',
      './style.css',
      './app.js',
      './manifest.json',
      './icon-512.png',
      './icon-192.png',
      './apple-touch-icon.png',
      './radio-memo.png',
      'https://unpkg.com/dexie@3.2.4/dist/dexie.js',
      'https://fonts.googleapis.com/css2?family=DotGothic16&display=swap'
  ];
  ```

### Cache Strategy
- **Cache-first** for app resources (HTML, CSS, JS, icons)
- **Network-first** would be used for API calls (not applicable in this app)
- Skip caching for non-GET requests
- Skip caching for chrome-extension, blob, and data URLs
- Only cache whitelisted CDN resources (unpkg.com, googleapis.com, gstatic.com)

### Service Worker Lifecycle
- Use `self.skipWaiting()` in install event to activate immediately
- Use `self.clients.claim()` in activate event to take control of all pages
- Clean up old caches in activate event

---

## Database

### IndexedDB with Dexie
- Use Dexie.js for IndexedDB operations
- Database name: `RadioMemoDatabase`
- Single table: `logs`

### Schema Versioning
- Increment version number for each schema change
- Use `.upgrade()` to migrate existing data
- Always provide default values for new fields
- Examples:
  ```javascript
  // Version 2: Add UUID field
  db.version(2).stores({
      logs: '++id, uuid, band, frequency, memo, timestamp'
  }).upgrade(tx => {
      return tx.table('logs').toCollection().modify(log => {
          if (!log.uuid) {
              log.uuid = generateUUID();
          }
      });
  });
  ```

### Data Structure
- Auto-incrementing `id` field (primary key)
- `uuid` field for import/export and data portability
- `timestamp` stored as ISO 8601 string (UTC)
- `frequency` stored as string with 3 decimal places
- Optional fields use empty strings (not null)

### UUID Generation
- Use `crypto.randomUUID()` for modern browsers (cryptographically secure)
- Fallback to Math.random() for older browsers
- Generate UUID for every new log entry

---

## Performance

### Event Listener Optimization
- **Avoid operations on input events** - they fire on every keystroke
- Use `blur` or `change` events for calculations
- Examples:
  ```javascript
  // Good: Use blur for formatting
  frequency_input.addEventListener('blur', formatFrequencyInput);

  // Bad: Would fire on every keystroke
  // frequency_input.addEventListener('input', formatFrequencyInput);
  ```

### Value Change Detection
- Cache previous values to avoid unnecessary processing
- Skip operations if value hasn't changed
- Examples:
  ```javascript
  const current_value_key = `${value}|${frequency_unit.value}`;

  // Skip if value hasn't changed (performance optimization)
  if (current_value_key === last_frequency_value) {
      return;
  }
  last_frequency_value = current_value_key;
  ```

### Event Delegation
- Use event delegation for dynamically generated content
- Single listener on container instead of multiple listeners on children
- Improves performance and prevents memory leaks
- Examples:
  ```javascript
  // Good: Event delegation
  logs_container.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-delete')) {
          deleteLog(parseInt(e.target.dataset.logId));
      }
  });

  // Bad: Multiple listeners (avoid this)
  // document.querySelectorAll('.btn-delete').forEach(btn => {
  //     btn.addEventListener('click', handleDelete);
  // });
  ```

### Database Optimization
- Cache frequently accessed values (total count)
- Invalidate cache when data changes
- Use batch operations for bulk imports
- Examples:
  ```javascript
  // Cache total count
  if (cached_total_count === null) {
      cached_total_count = await db.logs.count();
  }

  // Invalidate on data change
  cached_total_count = null;

  // Batch imports
  await db.logs.bulkAdd(logs_to_import);
  ```

### Prevent Concurrent Operations
- Use flags to prevent concurrent database operations
- Examples:
  ```javascript
  let is_loading_logs = false;

  async function loadLogs() {
      if (is_loading_logs) return;
      is_loading_logs = true;
      try {
          // load logs
      } finally {
          is_loading_logs = false;
      }
  }
  ```

---

## Testing

### Browser Testing
- **Test in Safari** (macOS and iOS) - primary target platform
- Test in Chrome/Edge (secondary)
- Test in Firefox (tertiary)

### Theme Testing
- **Test in both light and dark modes**
- Toggle system dark mode to verify all elements
- Check border colors, text colors, backgrounds

### Device Testing
- **Mobile**: iPhone (Safari), Android (Chrome)
- **Tablet**: iPad (Safari)
- **Desktop**: macOS (Safari, Chrome), Windows (Edge, Chrome)

### Screen Size Testing
- Small mobile: 320px - 600px
- Large mobile: 600px - 768px
- Tablet: 768px - 900px
- Desktop: 900px - 1200px
- Large desktop: 1200px+

### Offline Functionality
- Test that app works offline after initial load
- Verify service worker caches all resources
- Test that database operations work offline

### Feature Testing Checklist
- [ ] Create new log entry
- [ ] Edit frequency and auto-detect band
- [ ] Format frequency to 3 decimal places
- [ ] Save log with all fields (callsign, QTH, RST, memo)
- [ ] View paginated log list
- [ ] Navigate between pages
- [ ] Delete log entry with confirmation
- [ ] Export logs to CSV
- [ ] Import logs from CSV (with duplicate detection)
- [ ] Toggle dark/light mode (system preference)
- [ ] Click page title to return to first page
- [ ] Expand/collapse long memo text

---

## File Structure

### Project Organization
```
radio-memo/
├── index.html          # Main HTML file
├── style.css           # All CSS styles
├── app.js              # Main application logic
├── sw.js               # Service worker for offline support
├── manifest.json       # PWA manifest
├── README.md           # Project documentation
├── CODING_CONVENTIONS.md  # This file
├── icon-512.png        # PWA icon (512x512)
├── icon-192.png        # PWA icon (192x192)
├── apple-touch-icon.png  # iOS home screen icon
└── radio-memo.png      # Favicon
```

### File Purposes

#### index.html
- Main HTML structure
- PWA meta tags and manifest links
- External font links (DotGothic16)
- Script includes (Dexie.js, app.js)

#### style.css
- All application styles
- Light and dark mode support
- Responsive breakpoints
- Typography and layout

#### app.js
- Database setup and migrations (Dexie)
- Event listener setup
- Form handling and validation
- Log CRUD operations
- Pagination logic
- Import/export functionality
- CSV parsing

#### sw.js
- Service worker registration
- Cache management
- Offline support
- Cache versioning

### Dependencies

#### External Dependencies
- **Dexie.js** (v3.2.4) - IndexedDB wrapper
  - URL: https://unpkg.com/dexie@3.2.4/dist/dexie.js
- **DotGothic16 Font** - Google Fonts
  - URL: https://fonts.googleapis.com/css2?family=DotGothic16&display=swap

#### No Build Process
- No bundler required (Webpack, Vite, etc.)
- No transpilation needed
- Pure vanilla JavaScript (ES6+)
- Direct CSS (no preprocessors)

---

## Additional Best Practices

### Code Quality
1. Keep functions small and focused
2. Use meaningful variable and function names
3. Avoid deep nesting (use early returns)
4. Handle errors gracefully
5. Validate user input

### Security
- Escape HTML to prevent XSS attacks (use `escapeHtml()` function)
- Use cryptographically secure UUIDs when available
- No inline JavaScript in HTML
- No eval() or similar dynamic code execution

### Maintainability
- Follow DRY principle (Don't Repeat Yourself)
- Comment complex logic
- Keep related code together
- Use consistent formatting
- Update documentation when code changes

### Git Commit Messages
- Use clear, descriptive commit messages
- Start with action verb (Add, Update, Fix, Remove, etc.)
- Examples:
  - "Add DotGothic16 font and redesign page title"
  - "Remove rounded borders for unified square aesthetic"
  - "Soften container border colors to subtle grays"

---

## Version History

- **v1** - Initial conventions document
- **v2** - Comprehensive update with all coding standards
