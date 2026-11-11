/* Playlist detail screen ------------------------------------------ */

(function () {
  "use strict";

  window.Ongaku = window.Ongaku || {};
  window.Ongaku.screens = window.Ongaku.screens || {};

  var ui = window.Ongaku.ui;
  var db = window.Ongaku.db;
  var images = window.Ongaku.images;
  var actions = window.Ongaku.actions;
  var player = window.Ongaku.player;
  var router = window.Ongaku.router;

  var renderState = { playlist: null, cover: "" };

  function refresh() {
    router.refresh();
  }

  function songRow(song, index, playlist) {
    var pstate = player.getState();
    var isCurrent =
      pstate.playlistId === playlist.id &&
      pstate.currentSong &&
      pstate.currentSong.id === song.id;

    var rowClass = "song-row";
    if (isCurrent) {
      rowClass += " is-current" + (pstate.playing ? " is-playing" : "");
    }

    var name = ui.escapeHtml(song.name);
    var coverFallback = song.pictureUrl ? renderState.cover : "";
    var coverSrc = song.pictureUrl || renderState.cover;

    return (
      '<div class="' + rowClass + '" data-song-id="' + ui.escapeHtml(song.id) + '">' +
        '<button class="song-row__play" type="button" data-play-index="' + index + '"' +
          ' aria-label="Play ' + name + '">' +
          '<span class="song-row__index">' + (index + 1) + "</span>" +
          '<span class="song-row__icon song-row__icon--play">' + ui.icon("play", 16) + "</span>" +
          '<span class="song-row__icon song-row__icon--pause">' + ui.icon("pause", 16) + "</span>" +
        "</button>" +
        ui.coverHtml(coverSrc, "cover--thumb", coverFallback) +
        '<div class="song-row__text">' +
          '<p class="song-row__title">' + name + "</p>" +
          '<p class="song-row__meta">' +
            '<span class="song-row__source">YouTube</span>' +
            '<span class="song-row__url">' + ui.escapeHtml(song.url) + "</span>" +
          "</p>" +
        "</div>" +
        '<button class="icon-btn song-row__menu" type="button"' +
          ' data-song-menu="' + ui.escapeHtml(song.id) + '"' +
          ' aria-label="Options for ' + name + '"' +
          ' aria-haspopup="menu" aria-expanded="false">' +
          ui.icon("more", 18) +
        "</button>" +
      "</div>"
    );
  }

  function emptySongs() {
    return (
      '<div class="empty-state">' +
        '<span class="empty-state__icon">' + ui.icon("music", 28) + "</span>" +
        '<h2 class="empty-state__title">No songs yet</h2>' +
        '<p class="empty-state__text">Add a YouTube link to start building this playlist. Only the audio will play.</p>' +
        '<div class="empty-state__actions">' +
          '<button class="btn btn--primary" type="button" data-action="add-song">' +
            ui.icon("plus", 18) + "Add song" +
          "</button>" +
        "</div>" +
      "</div>"
    );
  }

  function notFound() {
    return (
      '<section class="detail-top">' +
        '<a class="back-link" href="#/playlists">' + ui.icon("back", 18) + "All playlists</a>" +
      "</section>" +
      '<div class="empty-state">' +
        '<span class="empty-state__icon">' + ui.icon("alert", 28) + "</span>" +
        '<h2 class="empty-state__title">Playlist not found</h2>' +
        '<p class="empty-state__text">It may have been deleted on this device.</p>' +
        '<div class="empty-state__actions">' +
          '<a class="btn btn--primary" href="#/playlists">Back to playlists</a>' +
        "</div>" +
      "</div>"
    );
  }

  function render(params) {
    return db.getPlaylist(params.id).then(function (playlist) {
      if (!playlist) {
        renderState = { playlist: null, cover: "" };
        return notFound();
      }

      var cover = images.coverSource(playlist);
      renderState = { playlist: playlist, cover: cover };

      var count = playlist.songs.length;
      var countLabel = count + (count === 1 ? " song" : " songs");
      var name = ui.escapeHtml(playlist.name);

      return (
        '<section class="detail-top">' +
          '<a class="back-link" href="#/playlists">' + ui.icon("back", 18) + "All playlists</a>" +
          '<div class="detail-top__actions">' +
            '<button class="btn btn--ghost btn--sm" type="button" data-action="export">' +
              ui.icon("download", 16) + "Export" +
            "</button>" +
            '<button class="icon-btn" type="button" data-action="playlist-menu"' +
              ' aria-label="Playlist options" aria-haspopup="menu" aria-expanded="false">' +
              ui.icon("more", 20) +
            "</button>" +
          "</div>" +
        "</section>" +

        '<section class="detail-hero">' +
          ui.coverHtml(cover, "cover--hero") +
          '<div class="detail-hero__body">' +
            '<p class="eyebrow">Playlist</p>' +
            '<h1 class="detail-hero__title">' + name + "</h1>" +
            '<p class="detail-hero__meta">' + countLabel + " · YouTube audio</p>" +
            '<div class="detail-hero__actions">' +
              '<button class="btn btn--primary detail-hero__play" type="button" data-action="play"' +
                (count ? "" : " disabled") + ">" +
                ui.icon("play", 18) + "Play" +
              "</button>" +
              '<button class="btn btn--ghost" type="button" data-action="add-song">' +
                ui.icon("plus", 18) + "Add song" +
              "</button>" +
            "</div>" +
          "</div>" +
        "</section>" +

        '<section class="song-list" aria-label="Songs in ' + name + '">' +
          '<div class="song-list__head" aria-hidden="true">' +
            "<span>#</span><span></span><span>Title</span><span></span>" +
          "</div>" +
          (count ? playlist.songs.map(function (song, index) {
            return songRow(song, index, playlist);
          }).join("") : emptySongs()) +
        "</section>"
      );
    });
  }

  function openPlaylistMenu(anchor, playlist) {
    ui.openMenu(anchor, [
      {
        label: "Edit playlist",
        icon: "edit",
        onSelect: function () {
          actions.editPlaylistFlow(playlist, { onDone: refresh });
        }
      },
      {
        label: "Export playlist",
        icon: "download",
        onSelect: function () {
          actions.exportPlaylists([playlist]);
        }
      },
      {
        label: "Delete playlist",
        icon: "trash",
        danger: true,
        onSelect: function () {
          actions.deletePlaylistFlow(playlist, {
            onDone: function () {
              window.location.hash = "#/playlists";
            }
          });
        }
      }
    ]);
  }

  function openSongMenu(anchor, playlist, song) {
    var index = playlist.songs.indexOf(song);

    ui.openMenu(anchor, [
      {
        label: "Play song",
        icon: "play",
        onSelect: function () {
          player.play(playlist, index, renderState.cover);
        }
      },
      {
        label: "Edit song",
        icon: "edit",
        onSelect: function () {
          actions.songFormFlow(playlist, song, { onDone: refresh });
        }
      },
      {
        label: "Remove song",
        icon: "trash",
        danger: true,
        onSelect: function () {
          actions.deleteSongFlow(playlist, song, { onDone: refresh });
        }
      }
    ]);
  }

  function mount(root) {
    var playlist = renderState.playlist;
    if (!playlist) {
      document.title = "Playlist not found — Ongaku";
      return function cleanup() {
        ui.closeMenu();
      };
    }

    document.title = playlist.name + " — Ongaku";

    function findSong(id) {
      return playlist.songs.filter(function (song) {
        return String(song.id) === String(id);
      })[0];
    }

    function onClick(event) {
      var actionButton = event.target.closest("[data-action]");
      if (actionButton) {
        var action = actionButton.getAttribute("data-action");

        if (action === "play") {
          if (playlist.songs.length) {
            player.play(playlist, 0, renderState.cover);
          }
        } else if (action === "add-song") {
          actions.songFormFlow(playlist, null, { onDone: refresh });
        } else if (action === "export") {
          actions.exportPlaylists([playlist]);
        } else if (action === "playlist-menu") {
          openPlaylistMenu(actionButton, playlist);
        }
        return;
      }

      var playButton = event.target.closest("[data-play-index]");
      if (playButton) {
        var index = Number(playButton.getAttribute("data-play-index"));
        var song = playlist.songs[index];
        if (!song) return;

        var pstate = player.getState();
        var isCurrent =
          pstate.playlistId === playlist.id &&
          pstate.currentSong &&
          pstate.currentSong.id === song.id;

        if (isCurrent) {
          player.toggle();
        } else {
          player.play(playlist, index, renderState.cover);
        }
        return;
      }

      var songMenuButton = event.target.closest("[data-song-menu]");
      if (songMenuButton) {
        var songId = songMenuButton.getAttribute("data-song-menu");
        var targetSong = findSong(songId);
        if (targetSong) openSongMenu(songMenuButton, playlist, targetSong);
      }
    }

    function syncRows(snapshot) {
      var rows = root.querySelectorAll("[data-song-id]");

      Array.prototype.forEach.call(rows, function (row) {
        var isCurrent =
          snapshot.playlistId === playlist.id &&
          snapshot.currentSong &&
          String(snapshot.currentSong.id) === row.getAttribute("data-song-id");

        row.classList.toggle("is-current", !!isCurrent);
        row.classList.toggle("is-playing", !!(isCurrent && snapshot.playing));

        var playButton = row.querySelector(".song-row__play");
        var titleEl = row.querySelector(".song-row__title");
        if (playButton) {
          playButton.setAttribute(
            "aria-label",
            (isCurrent && snapshot.playing ? "Pause " : "Play ") +
              (titleEl ? titleEl.textContent : "song")
          );
        }
      });
    }

    root.addEventListener("click", onClick);
    var unsubscribe = player.subscribe(syncRows);

    return function cleanup() {
      root.removeEventListener("click", onClick);
      unsubscribe();
      ui.closeMenu();
    };
  }

  window.Ongaku.screens.playlistDetail = {
    title: "Playlist",
    render: render,
    mount: mount
  };
})();
