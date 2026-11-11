/* ------------------------------------------------------------------
   Ongaku — actions.js
   User flows shared by the playlist list and playlist detail views:
   create, edit, delete, add/edit/delete songs, export and import.
------------------------------------------------------------------- */

(function () {
  "use strict";

  window.Ongaku = window.Ongaku || {};

  var ui = window.Ongaku.ui;
  var db = window.Ongaku.db;
  var images = window.Ongaku.images;
  var player = window.Ongaku.player;
  var yt = window.Ongaku.youtube;

  /* Helpers -------------------------------------------------------- */

  function clearInvalid(form) {
    Array.prototype.forEach.call(
      form.querySelectorAll("[aria-invalid]"),
      function (field) {
        field.removeAttribute("aria-invalid");
      }
    );
  }

  function markInvalid(form, name, message) {
    var field = form.elements[name];
    if (field) {
      field.setAttribute("aria-invalid", "true");
      field.focus();
    }
    throw new Error(message);
  }

  function playlistFormHtml(playlist) {
    var name = playlist ? playlist.name : "";
    var imageUrl = playlist ? playlist.imageUrl : "";

    return (
      '<div class="form-grid">' +
        '<label class="field">' +
          '<span class="field__label">Playlist name</span>' +
          '<input name="name" type="text" maxlength="80" autocomplete="off" required' +
            ' placeholder="Late night drive" value="' + ui.escapeHtml(name) + '">' +
        "</label>" +
        '<label class="field">' +
          '<span class="field__label">Cover image URL <span class="field__hint">optional</span></span>' +
          '<input name="imageUrl" type="url" inputmode="url" autocomplete="off"' +
            ' placeholder="https://example.com/cover.jpg" value="' + ui.escapeHtml(imageUrl) + '">' +
          '<span class="field__hint">The image is downloaded and kept on this device.</span>' +
        "</label>" +
        (playlist
          ? '<p class="form-note">Editing the URL replaces the stored cover. Leave it untouched to keep the current one.</p>'
          : "") +
      "</div>"
    );
  }

  function readPlaylistForm(form) {
    clearInvalid(form);

    var name = form.elements.name.value.trim();
    var imageUrl = form.elements.imageUrl.value.trim();

    if (!name) {
      markInvalid(form, "name", "Give the playlist a name.");
    }

    if (imageUrl && !ui.isHttpUrl(imageUrl)) {
      markInvalid(
        form,
        "imageUrl",
        "The cover image URL must start with http:// or https://."
      );
    }

    return { name: name, imageUrl: imageUrl };
  }

  function songFormHtml(song) {
    var name = song ? song.name : "";
    var url = song ? song.url : "";
    var pictureUrl = song ? song.pictureUrl : "";

    return (
      '<div class="form-grid">' +
        '<label class="field">' +
          '<span class="field__label">Song name</span>' +
          '<input name="name" type="text" maxlength="120" autocomplete="off" required' +
            ' placeholder="Song title" value="' + ui.escapeHtml(name) + '">' +
        "</label>" +
        '<label class="field">' +
          '<span class="field__label">YouTube URL</span>' +
          '<input name="url" type="url" inputmode="url" autocomplete="off" required' +
            ' placeholder="https://www.youtube.com/watch?v=…" value="' + ui.escapeHtml(url) + '">' +
          '<span class="field__hint">Only the audio is played. Paste a watch, youtu.be, shorts or live link.</span>' +
        "</label>" +
        '<label class="field">' +
          '<span class="field__label">Song picture URL <span class="field__hint">optional</span></span>' +
          '<input name="pictureUrl" type="url" inputmode="url" autocomplete="off"' +
            ' placeholder="https://example.com/song.jpg" value="' + ui.escapeHtml(pictureUrl) + '">' +
          '<span class="field__hint">Falls back to the playlist cover, then to a placeholder.</span>' +
        "</label>" +
      "</div>"
    );
  }

  function readSongForm(form) {
    clearInvalid(form);

    var name = form.elements.name.value.trim();
    var url = form.elements.url.value.trim();
    var pictureUrl = form.elements.pictureUrl.value.trim();

    if (!name) {
      markInvalid(form, "name", "Give the song a name.");
    }

    if (!url || !yt.parseVideoId(url)) {
      markInvalid(form, "url", "Paste a valid YouTube link.");
    }

    if (pictureUrl && !ui.isHttpUrl(pictureUrl)) {
      markInvalid(
        form,
        "pictureUrl",
        "The song picture URL must start with http:// or https://."
      );
    }

    return { name: name, url: url, pictureUrl: pictureUrl };
  }

  /* Playlist flows ------------------------------------------------- */

  function createPlaylistFlow(options) {
    options = options || {};

    ui.openModal({
      title: "New playlist",
      content: playlistFormHtml(null),
      submitLabel: "Create playlist",
      pendingLabel: "Creating…",
      onSubmit: async function (form) {
        var data = readPlaylistForm(form);
        var playlist = await db.createPlaylist(data);
        var coverError = "";

        if (data.imageUrl) {
          var result = await images.store(playlist.id, data.imageUrl);
          if (!result.ok) coverError = result.error;
        }

        if (coverError) {
          ui.toast(
            "Playlist created, but the cover could not be saved. " +
              coverError +
              " It will load from its URL instead.",
            "error"
          );
        } else {
          ui.toast("Playlist created.");
        }

        if (typeof options.onDone === "function") options.onDone(playlist);
        return true;
      }
    });
  }

  function editPlaylistFlow(playlist, options) {
    options = options || {};

    ui.openModal({
      title: "Edit playlist",
      content: playlistFormHtml(playlist),
      submitLabel: "Save changes",
      pendingLabel: "Saving…",
      onSubmit: async function (form) {
        var data = readPlaylistForm(form);
        var imageChanged = data.imageUrl !== (playlist.imageUrl || "");
        var coverError = "";

        if (imageChanged) {
          if (data.imageUrl) {
            images.remove(playlist.id);
            var result = await images.store(playlist.id, data.imageUrl);
            if (!result.ok) coverError = result.error;
          } else {
            images.remove(playlist.id);
          }
        }

        var updated = await db.updatePlaylist(playlist.id, {
          name: data.name,
          imageUrl: data.imageUrl
        });

        player.syncPlaylist(updated, images.coverSource(updated));

        if (coverError) {
          ui.toast(
            "Playlist saved, but the cover could not be saved. " +
              coverError +
              " It will load from its URL instead.",
            "error"
          );
        } else {
          ui.toast("Playlist updated.");
        }

        if (typeof options.onDone === "function") options.onDone(updated);
        return true;
      }
    });
  }

  function deletePlaylistFlow(playlist, options) {
    options = options || {};

    var count = playlist.songs ? playlist.songs.length : 0;
    var songLabel = count === 1 ? "1 song" : count + " songs";

    ui.confirm({
      title: "Delete playlist?",
      message:
        "“" + playlist.name + "” and its " + songLabel +
        " will be removed from this device. This cannot be undone.",
      confirmLabel: "Delete playlist",
      danger: true
    })
      .then(async function (confirmed) {
        if (!confirmed) return;

        await db.deletePlaylist(playlist.id);
        images.remove(playlist.id);
        player.removePlaylist(playlist.id);
        ui.toast("Playlist deleted.");

        if (typeof options.onDone === "function") options.onDone();
      })
      .catch(function (error) {
        ui.toast(error.message || "The playlist could not be deleted.", "error");
      });
  }

  /* Song flows ----------------------------------------------------- */

  function songFormFlow(playlist, song, options) {
    options = options || {};
    var isEdit = !!song;

    ui.openModal({
      title: isEdit ? "Edit song" : "Add song",
      content: songFormHtml(song),
      submitLabel: isEdit ? "Save song" : "Add song",
      pendingLabel: "Saving…",
      onSubmit: async function (form) {
        var data = readSongForm(form);
        var updated;

        if (isEdit) {
          updated = await db.updateSong(playlist.id, song.id, data);
        } else {
          updated = await db.addSong(playlist.id, data);
        }

        player.syncPlaylist(updated, images.coverSource(updated));
        ui.toast(isEdit ? "Song updated." : "Song added.");

        if (typeof options.onDone === "function") options.onDone(updated);
        return true;
      }
    });
  }

  function deleteSongFlow(playlist, song, options) {
    options = options || {};

    ui.confirm({
      title: "Remove song?",
      message: "“" + song.name + "” will be removed from “" + playlist.name + "”.",
      confirmLabel: "Remove song",
      danger: true
    })
      .then(async function (confirmed) {
        if (!confirmed) return;

        var updated = await db.removeSong(playlist.id, song.id);
        player.syncPlaylist(updated, images.coverSource(updated));
        ui.toast("Song removed.");

        if (typeof options.onDone === "function") options.onDone(updated);
      })
      .catch(function (error) {
        ui.toast(error.message || "The song could not be removed.", "error");
      });
  }

  /* Import / export ------------------------------------------------ */

  function buildExport(playlists) {
    return {
      app: "ongaku",
      version: 1,
      exportedAt: new Date().toISOString(),
      playlists: playlists.map(function (playlist) {
        return {
          name: playlist.name,
          imageUrl: playlist.imageUrl || "",
          songs: (playlist.songs || []).map(function (song) {
            return {
              name: song.name,
              url: song.url,
              pictureUrl: song.pictureUrl || ""
            };
          })
        };
      })
    };
  }

  function exportPlaylists(playlists, filename) {
    if (!playlists || !playlists.length) {
      ui.toast("There are no playlists to export yet.", "error");
      return;
    }

    var date = new Date().toISOString().slice(0, 10);
    var payload = buildExport(playlists);
    var name =
      filename ||
      (playlists.length === 1
        ? "ongaku-" + ui.slugify(playlists[0].name) + ".json"
        : "ongaku-playlists-" + date + ".json");

    ui.downloadJson(payload, name);
    ui.toast(
      (playlists.length === 1 ? "Playlist" : "Playlists") +
        " exported. Covers are linked by URL, not embedded."
    );
  }

  function normalizeImportedPlaylist(raw) {
    if (!raw || typeof raw !== "object") return null;

    var name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (!name) return null;

    var imageUrl = typeof raw.imageUrl === "string" ? raw.imageUrl.trim() : "";
    if (imageUrl && !ui.isHttpUrl(imageUrl)) imageUrl = "";

    var songs = [];
    if (Array.isArray(raw.songs)) {
      raw.songs.forEach(function (rawSong) {
        if (!rawSong || typeof rawSong !== "object") return;

        var songName = typeof rawSong.name === "string" ? rawSong.name.trim() : "";
        var url = typeof rawSong.url === "string" ? rawSong.url.trim() : "";
        if (!songName || !yt.parseVideoId(url)) return;

        var pictureUrl =
          typeof rawSong.pictureUrl === "string" ? rawSong.pictureUrl.trim() : "";
        if (pictureUrl && !ui.isHttpUrl(pictureUrl)) pictureUrl = "";

        songs.push({ name: songName, url: url, pictureUrl: pictureUrl });
      });
    }

    return { name: name, imageUrl: imageUrl, songs: songs };
  }

  async function importPlaylists(file) {
    var text = await file.text();
    var payload;

    try {
      payload = JSON.parse(text);
    } catch (error) {
      throw new Error("That file is not valid JSON.");
    }

    var rawList = Array.isArray(payload)
      ? payload
      : payload && Array.isArray(payload.playlists)
        ? payload.playlists
        : null;

    if (!rawList) {
      throw new Error("That file does not contain an Ongaku playlist export.");
    }

    var entries = rawList.map(normalizeImportedPlaylist).filter(Boolean);
    if (!entries.length) {
      throw new Error("No valid playlists were found in that file.");
    }

    ui.busy("Preparing import…");

    var imported = 0;
    var coverFailures = 0;

    try {
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        ui.updateBusy(
          "Importing “" + entry.name + "” (" + (i + 1) + " of " + entries.length + ")…"
        );

        var playlist = await db.createPlaylist(entry);
        if (entry.imageUrl) {
          var result = await images.store(playlist.id, entry.imageUrl);
          if (!result.ok) coverFailures++;
        }
        imported++;
      }
    } finally {
      ui.clearBusy();
    }

    if (coverFailures) {
      ui.toast(
        "Imported " + imported + " " + (imported === 1 ? "playlist" : "playlists") +
          ". " + coverFailures + " cover" + (coverFailures === 1 ? "" : "s") +
          " could not be downloaded and will load from the URL.",
        "error"
      );
    } else {
      ui.toast(
        "Imported " + imported + " " + (imported === 1 ? "playlist" : "playlists") + "."
      );
    }

    return imported;
  }

  window.Ongaku.actions = {
    createPlaylistFlow: createPlaylistFlow,
    editPlaylistFlow: editPlaylistFlow,
    deletePlaylistFlow: deletePlaylistFlow,
    songFormFlow: songFormFlow,
    deleteSongFlow: deleteSongFlow,
    exportPlaylists: exportPlaylists,
    importPlaylists: importPlaylists
  };
})();
