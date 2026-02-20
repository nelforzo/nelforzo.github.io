import JSZip from 'jszip';

// ── Public API ────────────────────────────────────────────────

/**
 * Parses an EPUB file and returns metadata + ordered chapter list.
 *
 * @param {File} file
 * @returns {Promise<{
 *   title:        string,
 *   author:       string,
 *   coverBlob:    Blob|null,
 *   chapters:     Array<{ spineIndex: number, title: string, href: string }>,
 * }>}
 */
export async function parseEpubMetadata(file) {
  const zip = await JSZip.loadAsync(file);

  // 1. Locate the OPF via META-INF/container.xml
  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) throw new Error('Invalid EPUB: missing META-INF/container.xml');

  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, 'application/xml');
  const opfPath = containerDoc.querySelector('rootfile')?.getAttribute('full-path');
  if (!opfPath) throw new Error('Invalid EPUB: cannot locate OPF path in container.xml');

  // 2. Parse the OPF
  const opfXml = await zip.file(opfPath)?.async('text');
  if (!opfXml) throw new Error(`Invalid EPUB: missing OPF file at ${opfPath}`);

  const opfDoc = parser.parseFromString(opfXml, 'application/xml');

  // Directory that contains the OPF — all manifest hrefs are relative to it
  const opfDir = opfPath.includes('/')
    ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1)
    : '';

  const title =
    opfDoc.querySelector('metadata > title, metadata > *|title')?.textContent?.trim() ||
    file.name.replace(/\.epub$/i, '');

  const author =
    opfDoc.querySelector('metadata > creator, metadata > *|creator')?.textContent?.trim() ||
    'Unknown Author';

  const coverBlob = await extractCover(zip, opfDoc, opfDir);
  const chapters  = await parseChapters(zip, opfDoc, opfDir);

  return { title, author, coverBlob, chapters };
}

// ── Chapter / spine parsing ───────────────────────────────────

/**
 * Builds the ordered chapter list by combining the spine reading order
 * with chapter titles sourced from the EPUB's Table of Contents.
 */
async function parseChapters(zip, opfDoc, opfDir) {
  const manifest = opfDoc.querySelector('manifest');
  const spine    = opfDoc.querySelector('spine');
  if (!manifest || !spine) return [];

  // Build manifest lookup: id → { fullHref, mediaType }
  const manifestById = {};
  for (const item of manifest.querySelectorAll('item')) {
    const id        = item.getAttribute('id');
    const href      = item.getAttribute('href') || '';
    const mediaType = item.getAttribute('media-type') || '';
    manifestById[id] = {
      fullHref:  resolveHref(opfDir, href),
      mediaType,
    };
  }

  // Walk the spine in reading order; keep only HTML/XHTML content documents
  const spineItems = [];
  for (const itemref of spine.querySelectorAll('itemref')) {
    const idref = itemref.getAttribute('idref');
    const entry = manifestById[idref];
    if (!entry) continue;
    const mt = entry.mediaType;
    if (mt.includes('html') || mt.includes('xml') || mt === '') {
      spineItems.push(entry.fullHref);
    }
  }

  // Build TOC map: fullHref (fragment-stripped) → chapter title
  const tocMap = await parseToc(zip, opfDoc, opfDir);

  return spineItems.map((href, index) => ({
    spineIndex: index,
    href,
    title: tocMap.get(href) || (index === 0 ? 'Introduction' : `Chapter ${index}`),
  }));
}

// ── TOC parsing ───────────────────────────────────────────────

/**
 * Parses the EPUB Table of Contents.
 * Tries EPUB 3 nav document first, then falls back to EPUB 2 NCX.
 * Returns a Map<fullZipHref, chapterTitle>.
 */
async function parseToc(zip, opfDoc, opfDir) {
  // EPUB 3: <item properties="nav">
  const navItem = opfDoc.querySelector('manifest item[properties~="nav"]');
  if (navItem) {
    const navHref = resolveHref(opfDir, navItem.getAttribute('href') || '');
    const navHtml = await zip.file(navHref)?.async('text');
    if (navHtml) {
      const navDir = dirOf(navHref);
      return parseTocFromNav(navHtml, navDir);
    }
  }

  // EPUB 2: NCX referenced from <spine toc="..."> or by media-type
  const ncxId   = opfDoc.querySelector('spine')?.getAttribute('toc');
  const ncxItem = ncxId
    ? opfDoc.querySelector(`manifest item[id="${ncxId}"]`)
    : opfDoc.querySelector('manifest item[media-type="application/x-dtbncx+xml"]');

  if (ncxItem) {
    const ncxHref = resolveHref(opfDir, ncxItem.getAttribute('href') || '');
    const ncxXml  = await zip.file(ncxHref)?.async('text');
    if (ncxXml) {
      const ncxDir = dirOf(ncxHref);
      return parseTocFromNcx(ncxXml, ncxDir);
    }
  }

  return new Map();
}

function parseTocFromNav(html, navDir) {
  const map = new Map();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Find <nav epub:type="toc"> or the first <nav> if that's absent
  const nav = doc.querySelector('nav[epub\\:type="toc"], nav');
  if (!nav) return map;

  for (const a of nav.querySelectorAll('a[href]')) {
    const [path] = (a.getAttribute('href') || '').split('#');
    if (!path) continue;
    const fullHref = resolveHref(navDir, path);
    const title    = a.textContent.replace(/\s+/g, ' ').trim();
    if (title && !map.has(fullHref)) map.set(fullHref, title);
  }
  return map;
}

function parseTocFromNcx(xml, ncxDir) {
  const map = new Map();
  const doc = new DOMParser().parseFromString(xml, 'application/xml');

  for (const navPoint of doc.querySelectorAll('navPoint')) {
    const src   = navPoint.querySelector('content')?.getAttribute('src') || '';
    const label = navPoint.querySelector('navLabel text')?.textContent?.replace(/\s+/g, ' ')?.trim();
    if (!src || !label) continue;
    const [path] = src.split('#');
    const fullHref = resolveHref(ncxDir, path);
    if (!map.has(fullHref)) map.set(fullHref, label);
  }
  return map;
}

// ── Cover extraction ──────────────────────────────────────────

async function extractCover(zip, opfDoc, opfDir) {
  const manifest = opfDoc.querySelector('manifest');
  if (!manifest) return null;

  // Strategy 1: <meta name="cover" content="item-id">
  const coverMeta = opfDoc.querySelector('metadata > meta[name="cover"]');
  if (coverMeta) {
    const item = manifest.querySelector(`item[id="${coverMeta.getAttribute('content')}"]`);
    if (item) {
      const blob = await readManifestItem(zip, item, opfDir);
      if (blob) return blob;
    }
  }

  // Strategy 2: <item properties="cover-image">
  const coverImageItem = manifest.querySelector('item[properties="cover-image"]');
  if (coverImageItem) {
    const blob = await readManifestItem(zip, coverImageItem, opfDir);
    if (blob) return blob;
  }

  // Strategy 3: any image item whose id or href mentions "cover"
  for (const item of manifest.querySelectorAll('item')) {
    const mt = item.getAttribute('media-type') || '';
    if (!mt.startsWith('image/')) continue;
    const id   = (item.getAttribute('id')   || '').toLowerCase();
    const href = (item.getAttribute('href') || '').toLowerCase();
    if (id.includes('cover') || href.includes('cover')) {
      const blob = await readManifestItem(zip, item, opfDir);
      if (blob) return blob;
    }
  }

  return null;
}

async function readManifestItem(zip, item, opfDir) {
  const href      = item.getAttribute('href');
  const mediaType = item.getAttribute('media-type') || 'image/jpeg';
  if (!href) return null;
  const entry = zip.file(resolveHref(opfDir, href));
  if (!entry) return null;
  const data = await entry.async('arraybuffer');
  return new Blob([data], { type: mediaType });
}

// ── Path helpers ──────────────────────────────────────────────

/**
 * Resolves an href relative to a base directory (zip path like "OEBPS/").
 * Uses the URL API for correct handling of "../" and absolute paths.
 * Returns the full zip-relative path (no leading slash, not URL-encoded).
 *
 * Uses http://x/ as a dummy base because "http" is a well-defined "special"
 * scheme — unlike custom schemes (e.g. "epub://"), browsers parse it
 * consistently, with the hostname in the host field and path starting at "/".
 */
function resolveHref(baseDir, href) {
  const decoded = decodeURIComponent(href);
  try {
    const url = new URL(decoded, `http://x/${baseDir}`);
    // pathname is always "/<baseDir>/..." — strip the leading "/"
    return decodeURIComponent(url.pathname.slice(1));
  } catch {
    return baseDir + decoded;
  }
}

/** Returns the directory portion of a zip path (with trailing slash). */
function dirOf(zipPath) {
  return zipPath.includes('/') ? zipPath.slice(0, zipPath.lastIndexOf('/') + 1) : '';
}
