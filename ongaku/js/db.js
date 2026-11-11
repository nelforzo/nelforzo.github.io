/* ------------------------------------------------------------------
   Ongaku — db.js
   IndexedDB persistence through Dexie. A playlist embeds its songs,
   which keeps writes and exports simple.
------------------------------------------------------------------- */

(function () {
  "use strict";

  window.Ongaku = window.Ongaku || {};

  var db = new Dexie("ongaku");

  db.version(1).stores({
    playlists: "++id, name, createdAt"
  });

  function uid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function normalizeSong(input) {
    if (!input) return null;

    var name = String(input.name == null ? "" : input.name).trim();
    if (!name) return null;

    return {
      id: input.id || uid(),
      name: name,
      url: String(input.url == null ? "" : input.url).trim(),
      pictureUrl: String(input.pictureUrl == null ? "" : input.pictureUrl).trim(),
      addedAt: Number(input.addedAt) || Date.now()
    };
  }

  function normalizeSongs(list) {
    if (!Array.isArray(list)) return [];
    return list.map(normalizeSong).filter(Boolean);
  }

  function normalizePlaylist(input) {
    if (!input) return null;

    var name = String(input.name == null ? "" : input.name).trim();
    if (!name) return null;

    return {
      name: name,
      imageUrl: String(input.imageUrl == null ? "" : input.imageUrl).trim(),
      songs: normalizeSongs(input.songs)
    };
  }

  async function listPlaylists() {
    var playlists = await db.playlists.toArray();
    return playlists.sort(function (a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  async function getPlaylist(id) {
    var numeric = Number(id);
    if (!Number.isFinite(numeric)) return null;

    var playlist = (await db.playlists.get(numeric)) || null;
    if (!playlist) return null;

    if (!Array.isArray(playlist.songs)) playlist.songs = [];
    return playlist;
  }

  async function createPlaylist(input) {
    var normalized = normalizePlaylist(input);
    if (!normalized) throw new Error("A playlist needs a name.");

    var now = Date.now();
    var record = {
      name: normalized.name,
      imageUrl: normalized.imageUrl,
      songs: normalized.songs,
      createdAt: now,
      updatedAt: now
    };

    record.id = await db.playlists.add(record);
    return record;
  }

  async function updatePlaylist(id, patch) {
    var numeric = Number(id);
    var playlist = await getPlaylist(numeric);
    if (!playlist) throw new Error("Playlist not found.");

    var update = Object.assign({}, patch, { updatedAt: Date.now() });
    await db.playlists.update(numeric, update);
    return getPlaylist(numeric);
  }

  async function deletePlaylist(id) {
    var numeric = Number(id);
    await db.playlists.delete(numeric);
    return numeric;
  }

  async function addSong(playlistId, song) {
    var playlist = await getPlaylist(playlistId);
    if (!playlist) throw new Error("Playlist not found.");

    var normalized = normalizeSong(song);
    if (!normalized) throw new Error("A song needs a name.");

    var songs = playlist.songs.concat([normalized]);
    return updatePlaylist(playlist.id, { songs: songs });
  }

  async function updateSong(playlistId, songId, patch) {
    var playlist = await getPlaylist(playlistId);
    if (!playlist) throw new Error("Playlist not found.");

    var found = false;
    var songs = playlist.songs.map(function (song) {
      if (song.id !== songId) return song;
      found = true;
      return normalizeSong(Object.assign({}, song, patch, { id: song.id })) || song;
    });

    if (!found) throw new Error("Song not found.");
    return updatePlaylist(playlist.id, { songs: songs });
  }

  async function removeSong(playlistId, songId) {
    var playlist = await getPlaylist(playlistId);
    if (!playlist) throw new Error("Playlist not found.");

    var songs = playlist.songs.filter(function (song) {
      return song.id !== songId;
    });

    return updatePlaylist(playlist.id, { songs: songs });
  }

  window.Ongaku.db = {
    uid: uid,
    listPlaylists: listPlaylists,
    getPlaylist: getPlaylist,
    createPlaylist: createPlaylist,
    updatePlaylist: updatePlaylist,
    deletePlaylist: deletePlaylist,
    addSong: addSong,
    updateSong: updateSong,
    removeSong: removeSong
  };
})();
