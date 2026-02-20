import Dexie from 'dexie';

const db = new Dexie('EReaderDB');

db.version(1).stores({
  books: '++id, title, author, filename, fileSize, addedAt',
});

db.version(2).stores({
  books:    '++id, title, author, filename, fileSize, addedAt',
  chapters: '++id, bookId, spineIndex',
});

db.version(3).stores({
  books:     '++id, title, author, filename, fileSize, addedAt',
  chapters:  '++id, bookId, spineIndex',
  bookmarks: '++id, bookId',
});

// Non-indexed fields (stored but not queryable):
//   books:     coverBlob, chapterCount
//   chapters:  title, href
//   bookmarks: chapIdx, sentIdx, chapterTitle, excerpt, addedAt

export default db;
