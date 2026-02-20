// Cache Storage for raw EPUB files.
// Keys are /books/{id} — id comes from IndexedDB.

const CACHE_NAME = 'ereader-books-v1';

export async function storeBook(id, file) {
  const cache = await caches.open(CACHE_NAME);
  const response = new Response(file, {
    headers: { 'Content-Type': 'application/epub+zip' },
  });
  await cache.put(`/books/${id}`, response);
}

export async function getBook(id) {
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(`/books/${id}`);
  if (!response) return null;
  return response.blob();
}

export async function deleteBook(id) {
  const cache = await caches.open(CACHE_NAME);
  await cache.delete(`/books/${id}`);
}
