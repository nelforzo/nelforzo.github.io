/* ------------------------------------------------------------------
   Ongaku — app.js
   Boots the player, registers routes and mounts screens. Runs last.
------------------------------------------------------------------- */

(function () {
  "use strict";

  var O = window.Ongaku;
  var ui = O.ui;
  var router = O.router;
  var screens = O.screens;

  var screenRoot = document.getElementById("screen");
  var main = document.getElementById("main");
  var renderToken = 0;
  var currentCleanup = null;
  var lastPath = null;

  function showError(error) {
    document.title = "Something went wrong — Ongaku";
    screenRoot.innerHTML =
      '<div class="empty-state">' +
        '<span class="empty-state__icon">' + ui.icon("alert", 28) + "</span>" +
        '<h2 class="empty-state__title">This page could not be loaded</h2>' +
        '<p class="empty-state__text">' +
          ui.escapeHtml(
            (error && error.message) ||
              "Check that this browser allows IndexedDB and try again."
          ) +
        "</p>" +
        '<div class="empty-state__actions">' +
          '<a class="btn btn--primary" href="#/playlists">Back to playlists</a>' +
        "</div>" +
      "</div>";
  }

  function show(route) {
    var screen = screens[route.screen];

    if (!screen) {
      showError(new Error("That screen does not exist."));
      return;
    }

    var token = ++renderToken;
    var samePath = lastPath === route.path;
    lastPath = route.path;

    if (currentCleanup) {
      try {
        currentCleanup();
      } catch (error) {
        /* ignore cleanup failures */
      }
      currentCleanup = null;
    }

    ui.closeMenu();
    ui.closeModal();

    screenRoot.innerHTML = '<div class="loading">Loading…</div>';

    Promise.resolve()
      .then(function () {
        return screen.render(route.params || {});
      })
      .then(function (html) {
        if (token !== renderToken) return;

        screenRoot.innerHTML = html;
        document.title = (screen.title || "Ongaku") + " — Ongaku";

        var cleanup = null;
        if (typeof screen.mount === "function") {
          cleanup = screen.mount(screenRoot, route.params || {});
        }

        if (token !== renderToken) {
          if (typeof cleanup === "function") {
            try {
              cleanup();
            } catch (error) {
              /* ignore */
            }
          }
          return;
        }

        currentCleanup = typeof cleanup === "function" ? cleanup : null;

        // Keep the reading position when a form/dialog refreshes the same
        // view, but start new routes at the top.
        if (!samePath) window.scrollTo(0, 0);

        if (main) {
          try {
            main.focus({ preventScroll: true });
          } catch (error) {
            main.focus();
          }
        }
      })
      .catch(function (error) {
        if (token !== renderToken) return;
        showError(error);
        ui.toast("This page could not be loaded.", "error");
      });
  }

  function initOfflineBanner() {
    var banner = document.getElementById("offline-banner");
    if (!banner) return;

    function update() {
      banner.hidden = navigator.onLine;
    }

    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
  }

  function initSkipLink() {
    var skipLink = document.querySelector(".skip-link");
    if (!skipLink || !main) return;

    skipLink.addEventListener("click", function (event) {
      event.preventDefault();
      main.focus();
      main.scrollIntoView({ block: "start" });
    });
  }

  function init() {
    O.player.init();
    initOfflineBanner();
    initSkipLink();

    router.register("playlists", "playlists");
    router.register("playlists/:id", "playlistDetail");

    O.app = {
      refresh: function () {
        router.refresh();
      }
    };

    router.start(show);
  }

  init();
})();
