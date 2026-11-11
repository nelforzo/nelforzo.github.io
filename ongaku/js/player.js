/* ------------------------------------------------------------------
   Ongaku — player.js
   Owns the playback queue, the sticky player bar and the bridge to
   the YouTube audio wrapper. Survives navigation: screens come and go,
   the player keeps going.
------------------------------------------------------------------- */

(function () {
  "use strict";

  window.Ongaku = window.Ongaku || {};

  var ui = window.Ongaku.ui;
  var yt = window.Ongaku.youtube;

  var state = {
    playlistId: null,
    playlistName: "",
    playlistCover: "",
    songs: [],
    index: -1,
    playing: false,
    loading: false,
    started: false,
    error: "",
    currentTime: 0,
    duration: 0
  };

  var subscribers = [];
  var els = {};
  var timer = null;
  var seeking = false;
  var initialized = false;
  var mediaSongId = null;
  var renderedCoverKey = "";

  var ERROR_MESSAGES = {
    2: "This video is not available.",
    5: "The YouTube player could not play this video.",
    100: "This video is unavailable or private.",
    101: "The owner does not allow this video to be played here.",
    150: "The owner does not allow this video to be played here."
  };

  function currentSong() {
    if (state.index < 0 || state.index >= state.songs.length) return null;
    return state.songs[state.index] || null;
  }

  function setError(message) {
    state.error = message || "";
    state.playing = false;
    state.loading = false;
    update();
    if (message) ui.toast(message, "error");
  }

  function loadCurrent(autoplay) {
    var song = currentSong();
    if (!song) return;

    var videoId = yt.parseVideoId(song.url);
    if (!videoId) {
      setError("This song needs a valid YouTube link.");
      return;
    }

    if (navigator.onLine === false) {
      setError("You're offline. Playback needs an internet connection.");
      return;
    }

    seeking = false;
    state.error = "";
    state.loading = true;
    state.playing = false;
    state.started = true;
    state.currentTime = 0;
    state.duration = 0;
    update();

    if (autoplay === false) return;

    yt.play(videoId)
      .then(function () {
        state.loading = false;
        update();
      })
      .catch(function (error) {
        setError(
          (error && error.message) ||
            "Playback could not start. Check your internet connection."
        );
      });
  }

  function play(playlist, index, cover) {
    if (!playlist || !Array.isArray(playlist.songs) || !playlist.songs.length) {
      return;
    }

    var target = Number(index);
    if (!Number.isFinite(target) || target < 0 || target >= playlist.songs.length) {
      target = 0;
    }

    state.playlistId = playlist.id;
    state.playlistName = playlist.name || "";
    state.playlistCover = cover || "";
    state.songs = playlist.songs.slice();
    state.index = target;
    loadCurrent(true);
  }

  function toggle() {
    if (!state.songs.length) return;

    if (!state.started) {
      loadCurrent(true);
      return;
    }

    if (state.error) {
      loadCurrent(true);
    } else if (state.playing) {
      yt.pause();
      state.playing = false;
      update();
    } else {
      state.loading = true;
      yt.resume();
      update();
    }
  }

  function next() {
    if (!state.songs.length) return;
    state.index = (state.index + 1) % state.songs.length;
    loadCurrent(true);
  }

  function prev() {
    if (!state.songs.length) return;
    state.index = (state.index - 1 + state.songs.length) % state.songs.length;
    loadCurrent(true);
  }

  function stop() {
    if (window.Ongaku.youtube) {
      try {
        yt.pause();
      } catch (error) {
        /* ignore */
      }
    }

    seeking = false;
    state.playlistId = null;
    state.playlistName = "";
    state.playlistCover = "";
    state.songs = [];
    state.index = -1;
    state.playing = false;
    state.loading = false;
    state.started = false;
    state.error = "";
    state.currentTime = 0;
    state.duration = 0;
    mediaSongId = null;

    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = "none";
      } catch (error) {
        /* ignore */
      }
    }

    update();
  }

  function seek(seconds) {
    var value = Math.max(0, Number(seconds) || 0);
    state.currentTime = value;
    yt.seek(value);
    els.current.textContent = ui.formatTime(value);
    ui.setRangeFill(els.seek, value, state.duration);
  }

  function handleState(code) {
    if (!state.songs.length) return;

    if (code === 1) {
      state.playing = true;
      state.loading = false;
      state.error = "";
    } else if (code === 2) {
      state.playing = false;
      state.loading = false;
    } else if (code === 3) {
      state.loading = true;
    } else if (code === 0) {
      state.playing = false;
      state.loading = false;
      update();
      next();
      return;
    } else if (code === 5) {
      state.loading = true;
    }

    update();
  }

  function handleError(code) {
    setError(ERROR_MESSAGES[code] || "This video could not be played.");
  }

  function handleReady() {
    update();
  }

  function syncPlaylist(playlist, cover) {
    if (!playlist || state.playlistId !== playlist.id) return;

    var song = currentSong();
    state.playlistName = playlist.name || "";

    if (state.playlistCover !== (cover || "")) {
      state.playlistCover = cover || "";
      mediaSongId = null;
    }

    if (!song) return;

    var songs = Array.isArray(playlist.songs) ? playlist.songs.slice() : [];
    var found = -1;

    for (var i = 0; i < songs.length; i++) {
      if (songs[i].id === song.id) {
        found = i;
        break;
      }
    }

    if (found === -1) {
      stop();
      return;
    }

    state.songs = songs;
    state.index = found;
    update();
  }

  function removePlaylist(playlistId) {
    if (state.playlistId === playlistId) stop();
  }

  function snapshot() {
    return {
      playlistId: state.playlistId,
      playlistName: state.playlistName,
      songs: state.songs.slice(),
      index: state.index,
      playing: state.playing,
      loading: state.loading,
      error: state.error,
      currentSong: currentSong()
    };
  }

  function notify() {
    var snap = snapshot();
    subscribers.slice().forEach(function (handler) {
      try {
        handler(snap);
      } catch (error) {
        if (window.console) window.console.error(error);
      }
    });
  }

  function updateMediaSession(song) {
    if (!("mediaSession" in navigator)) return;

    if (!song) {
      try {
        navigator.mediaSession.metadata = null;
      } catch (error) {
        /* ignore */
      }
      return;
    }

    try {
      var cover = song.pictureUrl || state.playlistCover;
      var artwork = cover ? [{ src: cover, sizes: "512x512" }] : [];
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: song.name,
        artist: state.playlistName || "Ongaku",
        album: "Ongaku",
        artwork: artwork
      });
      navigator.mediaSession.playbackState = state.playing ? "playing" : "paused";
      mediaSongId = song.id;
    } catch (error) {
      /* Media Session is a progressive enhancement */
    }
  }

  function update() {
    var song = currentSong();
    var visible = !!song;

    if (els.bar) els.bar.hidden = !visible;
    document.body.classList.toggle("has-player", visible);

    if (!visible) {
      renderedCoverKey = "";
      notify();
      return;
    }

    if (els.title) els.title.textContent = song.name;
    if (els.subtitle) {
      els.subtitle.textContent = state.error || state.playlistName;
    }

    var coverFallback = state.playlistCover;
    var coverSrc = song.pictureUrl || coverFallback;
    var coverKey = song.id + "|" + (song.pictureUrl || "") + "|" + coverFallback;

    if (coverKey !== renderedCoverKey) {
      renderedCoverKey = coverKey;
      ui.renderCoverInto(els.cover, coverSrc, coverFallback);
    }

    if (els.toggle) {
      els.toggle.innerHTML = state.playing ? ui.icon("pause", 18) : ui.icon("play", 18);
      els.toggle.setAttribute("aria-label", state.playing ? "Pause" : "Play");
      els.toggle.setAttribute("aria-pressed", String(state.playing));
    }

    if (els.open) {
      if (ui.isHttpUrl(song.url)) {
        els.open.href = song.url;
        els.open.hidden = false;
      } else {
        els.open.hidden = true;
      }
    }

    if (els.message) {
      els.message.textContent = state.error
        ? state.error
        : state.loading
          ? "Buffering…"
          : "";
      els.message.classList.toggle("is-error", !!state.error);
    }

    if (els.seek) {
      var duration = state.duration > 0 ? state.duration : 0;
      els.seek.max = String(Math.floor(duration));
      els.seek.value = String(Math.min(Math.floor(state.currentTime), Math.floor(duration)));
      els.seek.disabled = duration <= 0;
      ui.setRangeFill(els.seek, state.currentTime, duration);

      if (els.current) els.current.textContent = ui.formatTime(state.currentTime);
      if (els.duration) els.duration.textContent = ui.formatTime(duration);
    }

    if (mediaSongId !== song.id) {
      updateMediaSession(song);
    } else if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.playbackState = state.playing ? "playing" : "paused";
      } catch (error) {
        /* ignore */
      }
    }

    notify();
  }

  function tick() {
    if (!state.songs.length || !state.playing) return;

    var duration = yt.getDuration();
    var current = yt.getCurrentTime();

    if (duration > 0) state.duration = duration;
    state.currentTime = current;

    if (!seeking && els.seek) {
      els.seek.max = String(Math.floor(state.duration));
      els.seek.value = String(Math.min(Math.floor(current), Math.floor(state.duration)));
      els.seek.disabled = !(state.duration > 0);
      els.current.textContent = ui.formatTime(current);
      els.duration.textContent = ui.formatTime(state.duration);
      ui.setRangeFill(els.seek, current, state.duration);
    }
  }

  function initMediaSession() {
    if (!("mediaSession" in navigator)) return;

    function safely(action, handler) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {
        /* unsupported action */
      }
    }

    safely("play", function () {
      if (!state.playing) toggle();
    });
    safely("pause", function () {
      if (state.playing) toggle();
    });
    safely("previoustrack", prev);
    safely("nexttrack", next);
    safely("seekto", function (details) {
      if (details && Number.isFinite(details.seekTime)) seek(details.seekTime);
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;

    els.bar = document.getElementById("player");
    els.cover = document.getElementById("player-cover");
    els.title = document.getElementById("player-title");
    els.subtitle = document.getElementById("player-subtitle");
    els.toggle = document.getElementById("player-toggle");
    els.prev = document.getElementById("player-prev");
    els.next = document.getElementById("player-next");
    els.seek = document.getElementById("player-seek");
    els.current = document.getElementById("player-current");
    els.duration = document.getElementById("player-duration");
    els.message = document.getElementById("player-message");
    els.open = document.getElementById("player-open");

    if (!els.bar) return;

    els.toggle.addEventListener("click", toggle);
    els.prev.addEventListener("click", prev);
    els.next.addEventListener("click", next);

    els.seek.addEventListener("input", function () {
      seeking = true;
      var value = Number(els.seek.value) || 0;
      els.current.textContent = ui.formatTime(value);
      ui.setRangeFill(els.seek, value, Number(els.seek.max) || 0);
    });

    els.seek.addEventListener("change", function () {
      seeking = false;
      seek(Number(els.seek.value) || 0);
    });

    yt.onStateChange(handleState);
    yt.onError(handleError);
    yt.onReady(handleReady);

    initMediaSession();
    yt.load();

    timer = window.setInterval(tick, 400);
    update();
  }

  window.Ongaku.player = {
    init: init,
    play: play,
    toggle: toggle,
    next: next,
    prev: prev,
    stop: stop,
    seek: seek,
    syncPlaylist: syncPlaylist,
    removePlaylist: removePlaylist,
    subscribe: function (handler) {
      if (typeof handler !== "function") return function () {};
      subscribers.push(handler);
      handler(snapshot());
      return function () {
        var index = subscribers.indexOf(handler);
        if (index !== -1) subscribers.splice(index, 1);
      };
    },
    getState: snapshot
  };
})();
