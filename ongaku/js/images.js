/* ------------------------------------------------------------------
   Ongaku — images.js
   Playlist covers are downloaded once, scaled down and kept as data
   URLs in localStorage. The original URL stays on the playlist record
   so it can be exported and re-downloaded elsewhere.

   Downloading a remote image depends on the image host allowing CORS.
   When that fails, the app keeps working and shows the remote URL
   directly, so the picture is not available offline.
------------------------------------------------------------------- */

(function () {
  "use strict";

  window.Ongaku = window.Ongaku || {};

  var PREFIX = "ongaku.cover.";
  var MAX_EDGE = 512;
  var JPEG_QUALITY = 0.84;

  function storageKey(playlistId) {
    return PREFIX + playlistId;
  }

  function get(playlistId) {
    try {
      var stored = window.localStorage.getItem(storageKey(playlistId));
      return stored && stored.indexOf("data:image/") === 0 ? stored : "";
    } catch (error) {
      return "";
    }
  }

  function remove(playlistId) {
    try {
      window.localStorage.removeItem(storageKey(playlistId));
    } catch (error) {
      /* storage unavailable — nothing else to do */
    }
  }

  function coverSource(playlist) {
    if (!playlist) return "";
    return get(playlist.id) || playlist.imageUrl || "";
  }

  function drawToDataUrl(image) {
    var width = image.naturalWidth || image.width;
    var height = image.naturalHeight || image.height;

    if (!width || !height) {
      throw new Error("The image has no size.");
    }

    var scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    var canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    var context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot process images.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var objectUrl = URL.createObjectURL(blob);
      var image = new Image();

      function cleanup() {
        URL.revokeObjectURL(objectUrl);
      }

      image.onload = function () {
        try {
          var dataUrl = drawToDataUrl(image);
          cleanup();
          resolve(dataUrl);
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      image.onerror = function () {
        cleanup();
        reject(new Error("The image could not be decoded."));
      };

      image.src = objectUrl;
    });
  }

  function download(url) {
    var controller =
      typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller
      ? window.setTimeout(function () {
          controller.abort();
        }, 20000)
      : null;

    return fetch(url, {
      mode: "cors",
      credentials: "omit",
      cache: "force-cache",
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Image request failed (" + response.status + ").");
      }
      var type = response.headers.get("content-type") || "";
      if (type && type.indexOf("image/") !== 0) {
        throw new Error("That URL does not point to an image.");
      }
      return response.blob();
    }).then(function (blob) {
      if (!blob.size) throw new Error("The image is empty.");
      return blobToDataUrl(blob);
    }).finally(function () {
      if (timer) window.clearTimeout(timer);
    });
  }

  /**
   * Download and store a cover. Resolves with { ok, dataUrl, error }
   * instead of rejecting so callers can save the playlist regardless.
   */
  function store(playlistId, url) {
    if (!url) {
      remove(playlistId);
      return Promise.resolve({ ok: true, dataUrl: "" });
    }

    return Promise.resolve()
      .then(function () {
        return download(url);
      })
      .then(function (dataUrl) {
        try {
          window.localStorage.setItem(storageKey(playlistId), dataUrl);
          return { ok: true, dataUrl: dataUrl };
        } catch (error) {
          var quota = error && error.name === "QuotaExceededError";
          return {
            ok: false,
            dataUrl: "",
            error: quota
              ? "This device is out of image storage. Try a smaller cover."
              : "The cover could not be saved on this device."
          };
        }
      })
      .catch(function (error) {
        return {
          ok: false,
          dataUrl: "",
          error: (error && error.message) || "The cover could not be downloaded."
        };
      });
  }

  window.Ongaku.images = {
    get: get,
    store: store,
    remove: remove,
    coverSource: coverSource
  };
})();
