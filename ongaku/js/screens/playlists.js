/* Playlists screen ------------------------------------------------ */

(function () {
  "use strict";

  window.Ongaku = window.Ongaku || {};
  window.Ongaku.screens = window.Ongaku.screens || {};

  var ui = window.Ongaku.ui;
  var db = window.Ongaku.db;
  var images = window.Ongaku.images;
  var actions = window.Ongaku.actions;
  var router = window.Ongaku.router;

  var renderState = { playlists: [] };

  function songCount(playlist) {
    var count = playlist.songs ? playlist.songs.length : 0;
    return count + (count === 1 ? " song" : " songs");
  }

  function card(playlist) {
    var name = ui.escapeHtml(playlist.name);

    return (
      '<article class="playlist-card" data-playlist-id="' + playlist.id + '">' +
        '<a class="playlist-card__link" href="#/playlists/' + playlist.id + '">' +
          ui.coverHtml(images.coverSource(playlist), "playlist-card__cover") +
          '<div class="playlist-card__body">' +
            '<p class="playlist-card__title">' + name + "</p>" +
            '<p class="playlist-card__meta">' + songCount(playlist) + "</p>" +
          "</div>" +
        "</a>" +
        '<button class="icon-btn playlist-card__menu" type="button"' +
          ' data-playlist-menu="' + playlist.id + '"' +
          ' aria-label="Options for ' + name + '"' +
          ' aria-haspopup="menu" aria-expanded="false">' +
          ui.icon("more", 18) +
        "</button>" +
      "</article>"
    );
  }

  function emptyState() {
    return (
      '<div class="empty-state">' +
        '<span class="empty-state__icon">' + ui.icon("music", 28) + "</span>" +
        '<h2 class="empty-state__title">No playlists yet</h2>' +
        '<p class="empty-state__text">Create a playlist, give it a cover and add YouTube songs. The library stays on this device.</p>' +
        '<div class="empty-state__actions">' +
          '<button class="btn btn--primary" type="button" data-action="create">' +
            ui.icon("plus", 18) + "New playlist" +
          "</button>" +
          '<button class="btn btn--ghost" type="button" data-action="import">' +
            ui.icon("upload", 18) + "Import a backup" +
          "</button>" +
        "</div>" +
      "</div>"
    );
  }

  function openPlaylistMenu(anchor, playlist) {
    ui.openMenu(anchor, [
      {
        label: "Open playlist",
        icon: "music",
        onSelect: function () {
          window.location.hash = "#/playlists/" + playlist.id;
        }
      },
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
          actions.deletePlaylistFlow(playlist, { onDone: refresh });
        }
      }
    ]);
  }

  function refresh() {
    router.refresh();
  }

  function render() {
    return db.listPlaylists().then(function (playlists) {
      renderState = { playlists: playlists };

      var exportDisabled = playlists.length === 0;

      return (
        '<section class="page-head">' +
          "<div>" +
            '<p class="eyebrow">Library</p>' +
            '<h1 class="page-title">Your playlists</h1>' +
            '<p class="page-sub">Covers and playlists live on this device. Songs stream from YouTube when you play them.</p>' +
          "</div>" +
          '<div class="page-actions">' +
            '<button class="btn btn--ghost" type="button" data-action="import">' +
              ui.icon("upload", 18) + "Import" +
            "</button>" +
            '<button class="btn btn--ghost" type="button" data-action="export"' +
              (exportDisabled ? " disabled" : "") + ">" +
              ui.icon("download", 18) + "Export" +
            "</button>" +
            '<button class="btn btn--primary" type="button" data-action="create">' +
              ui.icon("plus", 18) + "New playlist" +
            "</button>" +
          "</div>" +
        "</section>" +
        (playlists.length
          ? '<div class="playlist-grid">' + playlists.map(card).join("") + "</div>"
          : emptyState())
      );
    });
  }

  function mount(root) {
    var playlists = renderState.playlists;
    var importInput = document.getElementById("import-file");

    function findPlaylist(id) {
      return playlists.filter(function (playlist) {
        return String(playlist.id) === String(id);
      })[0];
    }

    function onImportChange() {
      var file = importInput && importInput.files && importInput.files[0];
      if (importInput) importInput.value = "";
      if (!file) return;

      actions
        .importPlaylists(file)
        .then(function (count) {
          if (count) refresh();
        })
        .catch(function (error) {
          ui.toast(error.message || "The backup could not be imported.", "error");
        });
    }

    function onImportClick() {
      if (importInput) {
        importInput.value = "";
        importInput.click();
      }
    }

    function onClick(event) {
      var actionButton = event.target.closest("[data-action]");
      if (actionButton) {
        var action = actionButton.getAttribute("data-action");

        if (action === "create") {
          actions.createPlaylistFlow({
            onDone: function (playlist) {
              if (playlist && playlist.id) {
                window.location.hash = "#/playlists/" + playlist.id;
              } else {
                refresh();
              }
            }
          });
        } else if (action === "import") {
          onImportClick();
        } else if (action === "export") {
          actions.exportPlaylists(playlists);
        }
        return;
      }

      var menuButton = event.target.closest("[data-playlist-menu]");
      if (menuButton) {
        var playlist = findPlaylist(menuButton.getAttribute("data-playlist-menu"));
        if (playlist) openPlaylistMenu(menuButton, playlist);
      }
    }

    root.addEventListener("click", onClick);
    if (importInput) importInput.addEventListener("change", onImportChange);

    return function cleanup() {
      root.removeEventListener("click", onClick);
      if (importInput) importInput.removeEventListener("change", onImportChange);
      ui.closeMenu();
    };
  }

  window.Ongaku.screens.playlists = {
    title: "Your playlists",
    render: render,
    mount: mount
  };
})();
