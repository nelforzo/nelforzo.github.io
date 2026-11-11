/* ------------------------------------------------------------------
   Ongaku — router.js
   Hash routing with simple :params patterns, e.g. playlists/:id.
   Hash URLs keep the app server-less and work from file://.
------------------------------------------------------------------- */

(function () {
  "use strict";

  window.Ongaku = window.Ongaku || {};

  var routes = [];
  var onChange = function () {};
  var started = false;

  function split(path) {
    return String(path || "")
      .split("/")
      .filter(Boolean);
  }

  function currentPath() {
    return window.location.hash.replace(/^#\/?/, "").split("?")[0];
  }

  function find(path) {
    var segments = split(path);

    for (var i = 0; i < routes.length; i++) {
      var route = routes[i];
      if (route.segments.length !== segments.length) continue;

      var params = {};
      var matches = true;

      for (var j = 0; j < route.segments.length; j++) {
        var part = route.segments[j];
        if (part.charAt(0) === ":") {
          params[part.slice(1)] = decodeURIComponent(segments[j]);
        } else if (part !== segments[j]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        return {
          screen: route.screen,
          params: params,
          path: segments.join("/")
        };
      }
    }

    return null;
  }

  function handle() {
    var path = currentPath();

    if (!path) {
      window.location.hash = "#/playlists";
      return;
    }

    var match = find(path);
    if (!match) {
      window.location.hash = "#/playlists";
      return;
    }

    onChange(match);
  }

  window.Ongaku.router = {
    register: function (pattern, screen) {
      routes.push({ pattern: pattern, segments: split(pattern), screen: screen });
    },

    start: function (callback) {
      if (typeof callback === "function") onChange = callback;

      if (!started) {
        started = true;
        window.addEventListener("hashchange", handle);
      }

      if (!window.location.hash) {
        window.location.hash = "#/playlists";
      }

      handle();
    },

    navigate: function (path) {
      var next = "#/" + String(path || "").replace(/^#?\/?/, "");
      if (window.location.hash === next) handle();
      else window.location.hash = next;
    },

    refresh: handle
  };
})();
