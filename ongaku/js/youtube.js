/* ------------------------------------------------------------------
   Ongaku — youtube.js
   Thin wrapper around the YouTube IFrame Player API. The iframe lives
   off-screen at 1×1 px so only audio is heard; the video is never
   shown. Loading the API and streaming audio both need internet.
------------------------------------------------------------------- */

(function () {
  "use strict";

  window.Ongaku = window.Ongaku || {};

  var apiPromise = null;
  var playerPromise = null;
  var player = null;

  var readyHandlers = [];
  var stateHandlers = [];
  var errorHandlers = [];

  function emit(handlers, value) {
    handlers.slice().forEach(function (handler) {
      try {
        handler(value);
      } catch (error) {
        // A listener should never break playback.
        if (window.console) window.console.error(error);
      }
    });
  }

  function loadApi() {
    if (window.YT && typeof window.YT.Player === "function") {
      return Promise.resolve();
    }
    if (apiPromise) return apiPromise;

    apiPromise = new Promise(function (resolve, reject) {
      var settled = false;

      var timeout = window.setTimeout(function () {
        if (settled) return;
        settled = true;
        apiPromise = null;
        reject(new Error("YouTube took too long to respond. Check your internet connection."));
      }, 20000);

      var previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof previousCallback === "function") {
          try {
            previousCallback();
          } catch (error) {
            /* ignore third-party callback errors */
          }
        }
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        if (window.YT && typeof window.YT.Player === "function") {
          resolve();
        } else {
          apiPromise = null;
          reject(new Error("The YouTube player could not be created."));
        }
      };

      var script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = function () {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        apiPromise = null;
        reject(new Error("YouTube could not be reached. Check your internet connection."));
      };
      document.head.appendChild(script);
    });

    return apiPromise;
  }

  function createPlayer() {
    return new Promise(function (resolve, reject) {
      var host = document.getElementById("yt-host");
      if (!host) {
        reject(new Error("The YouTube player is not available on this page."));
        return;
      }

      host.innerHTML = "";
      var mount = document.createElement("div");
      mount.id = "ongaku-yt-player";
      host.appendChild(mount);

      try {
        player = new window.YT.Player(mount.id, {
          width: 1,
          height: 1,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            iv_load_policy: 3
          },
          events: {
            onReady: function () {
              emit(readyHandlers, player);
              resolve(player);
            },
            onStateChange: function (event) {
              emit(stateHandlers, event.data);
            },
            onError: function (event) {
              emit(errorHandlers, event.data);
            }
          }
        });
      } catch (error) {
        player = null;
        reject(new Error("The YouTube player could not be created."));
      }
    });
  }

  function ensurePlayer() {
    if (player) return Promise.resolve(player);
    if (playerPromise) return playerPromise;

    playerPromise = loadApi()
      .then(createPlayer)
      .catch(function (error) {
        playerPromise = null;
        throw error;
      });

    return playerPromise;
  }

  function load() {
    return ensurePlayer().catch(function () {
      /* Errors surface when the user tries to play. */
    });
  }

  function play(videoId) {
    return ensurePlayer().then(function (instance) {
      instance.loadVideoById(videoId);
      instance.playVideo();
      return instance;
    });
  }

  function pause() {
    if (player && typeof player.pauseVideo === "function") player.pauseVideo();
  }

  function resume() {
    if (player && typeof player.playVideo === "function") player.playVideo();
  }

  function seek(seconds) {
    if (player && typeof player.seekTo === "function") {
      player.seekTo(Math.max(0, Number(seconds) || 0), true);
    }
  }

  function getCurrentTime() {
    if (player && typeof player.getCurrentTime === "function") {
      try {
        return player.getCurrentTime() || 0;
      } catch (error) {
        return 0;
      }
    }
    return 0;
  }

  function getDuration() {
    if (player && typeof player.getDuration === "function") {
      try {
        return player.getDuration() || 0;
      } catch (error) {
        return 0;
      }
    }
    return 0;
  }

  function parseVideoId(input) {
    var raw = String(input == null ? "" : input).trim();
    if (!raw) return null;

    if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;

    // Accept links pasted without a protocol: youtube.com/watch?v=…
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = "https://" + raw;

    var url;
    try {
      url = new URL(raw);
    } catch (error) {
      return null;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    var host = url.hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/^m\./, "");

    var id = null;

    if (host === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0];
    } else if (
      host === "youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      id = url.searchParams.get("v");
      if (!id) {
        var parts = url.pathname.split("/").filter(Boolean);
        if (
          parts[0] === "shorts" ||
          parts[0] === "embed" ||
          parts[0] === "live" ||
          parts[0] === "v"
        ) {
          id = parts[1];
        }
      }
    }

    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  }

  window.Ongaku.youtube = {
    load: load,
    play: play,
    pause: pause,
    resume: resume,
    seek: seek,
    getCurrentTime: getCurrentTime,
    getDuration: getDuration,
    parseVideoId: parseVideoId,
    onReady: function (handler) {
      readyHandlers.push(handler);
    },
    onStateChange: function (handler) {
      stateHandlers.push(handler);
    },
    onError: function (handler) {
      errorHandlers.push(handler);
    }
  };
})();
