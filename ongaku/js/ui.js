/* ------------------------------------------------------------------
   Ongaku — ui.js
   Shared UI helpers: icons, escaping, covers, toasts, modals,
   context menus, busy overlay and file downloads.
------------------------------------------------------------------- */

(function () {
  "use strict";

  window.Ongaku = window.Ongaku || {};

  var icons = {
    play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" stroke="none"/>',
    prev: '<path d="M6 5h2v14H6zM20 5v14L9 12z" fill="currentColor" stroke="none"/>',
    next: '<path d="M18 5h-2v14h2zM4 5v14l11-7z" fill="currentColor" stroke="none"/>',
    more: '<circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 19l-7-7 7-7"/>',
    edit: '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M13.5 7.5l3 3"/>',
    trash: '<path d="M4 7h16M9 7V5h6v2M6.5 7l.9 13h9.2l.9-13M10 11v5M14 11v5"/>',
    download: '<path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"/>',
    upload: '<path d="M12 20V9m0 0L8 13m4-4l4 4M5 4h14"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>',
    alert: '<path d="M12 8v5"/><circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none"/><path d="M10.3 3.9L2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'
  };

  function icon(name, size) {
    var px = size || 20;
    return (
      '<svg viewBox="0 0 24 24" width="' + px + '" height="' + px + '"' +
      ' fill="none" stroke="currentColor" stroke-width="1.8"' +
      ' stroke-linecap="round" stroke-linejoin="round"' +
      ' aria-hidden="true" focusable="false">' +
      (icons[name] || "") +
      "</svg>"
    );
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatTime(seconds) {
    var total = Number(seconds);
    if (!isFinite(total) || total < 0) total = 0;
    total = Math.floor(total);
    var hours = Math.floor(total / 3600);
    var minutes = Math.floor((total % 3600) / 60);
    var secs = total % 60;
    if (hours > 0) {
      return hours + ":" + String(minutes).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
    }
    return minutes + ":" + String(secs).padStart(2, "0");
  }

  function isHttpUrl(value) {
    try {
      var url = new URL(String(value).trim());
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (error) {
      return false;
    }
  }

  function slugify(value) {
    return String(value || "ongaku")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "ongaku";
  }

  function coverHtml(src, className, fallback) {
    var classes = "cover" + (className ? " " + className : "");
    var image = "";
    if (src) {
      image =
        '<img class="cover__img" src="' + escapeHtml(src) + '" alt=""' +
        ' loading="lazy" decoding="async" referrerpolicy="no-referrer"' +
        (fallback && fallback !== src
          ? ' data-fallback="' + escapeHtml(fallback) + '"'
          : "") +
        ">";
    }
    return (
      '<div class="' + classes + '">' +
        '<span class="cover__fallback" aria-hidden="true">' + icon("music", 24) + "</span>" +
        image +
      "</div>"
    );
  }

  function renderCoverInto(element, src, fallback) {
    if (!element) return;

    element.innerHTML =
      '<span class="cover__fallback" aria-hidden="true">' + icon("music", 24) + "</span>";

    if (!src) return;

    var img = document.createElement("img");
    img.className = "cover__img";
    img.src = src;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    if (fallback && fallback !== src) {
      img.setAttribute("data-fallback", fallback);
    }
    element.appendChild(img);
  }

  function setRangeFill(input, value, max) {
    var percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
    input.style.setProperty("--range-progress", percent + "%");
  }

  /* Toasts --------------------------------------------------------- */

  function toast(message, type) {
    var region = document.getElementById("toast-region");
    if (!region) return;

    var el = document.createElement("div");
    el.className = "toast" + (type === "error" ? " toast--error" : "");
    el.setAttribute("role", type === "error" ? "alert" : "status");
    el.textContent = message;
    region.appendChild(el);

    while (region.children.length > 4) {
      region.removeChild(region.firstElementChild);
    }

    window.setTimeout(function () {
      el.classList.add("toast--out");
      window.setTimeout(function () {
        if (el.parentNode) el.remove();
      }, 220);
    }, type === "error" ? 5200 : 3800);
  }

  /* Busy overlay --------------------------------------------------- */

  var busyEl = null;
  var busyTextEl = null;

  function setBusy(message) {
    if (!busyEl) return;
    busyTextEl.textContent = message || "Working…";
    busyEl.hidden = false;
  }

  function updateBusy(message) {
    if (busyEl) busyTextEl.textContent = message;
  }

  function clearBusy() {
    if (busyEl) busyEl.hidden = true;
  }

  /* Modal ---------------------------------------------------------- */

  var modal = null;
  var modalForm = null;
  var modalTitle = null;
  var modalBody = null;
  var modalActions = null;
  var modalError = null;
  var currentModal = null;

  function showModalError(message) {
    if (!modalError) return;
    modalError.textContent = message;
    modalError.hidden = false;
  }

  function clearModalError() {
    if (!modalError) return;
    modalError.textContent = "";
    modalError.hidden = true;
  }

  function closeModal() {
    if (modal && modal.open) modal.close();
  }

  function openModal(options) {
    if (!modal) return;

    if (modal.open) {
      modal.close();
    }

    var opts = Object.assign(
      {
        title: "",
        content: "",
        submitLabel: "Save",
        cancelLabel: "Cancel",
        pendingLabel: "Saving…",
        danger: false
      },
      options
    );

    currentModal = opts;
    modalTitle.textContent = opts.title;
    modalBody.innerHTML = opts.content;
    modalActions.innerHTML = "";
    clearModalError();

    var cancelButton = null;
    if (opts.cancelLabel !== null) {
      cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "btn btn--ghost";
      cancelButton.textContent = opts.cancelLabel || "Cancel";
      cancelButton.addEventListener("click", closeModal);
      modalActions.appendChild(cancelButton);
    }

    var submitButton = null;
    if (opts.submitLabel) {
      submitButton = document.createElement("button");
      submitButton.type = "submit";
      submitButton.className = "btn " + (opts.danger ? "btn--danger" : "btn--primary");
      submitButton.textContent = opts.submitLabel;
      modalActions.appendChild(submitButton);
    }

    modal.showModal();

    window.requestAnimationFrame(function () {
      var target =
        modalBody.querySelector("input, textarea, select") ||
        (opts.danger ? cancelButton : submitButton) ||
        cancelButton ||
        modal.querySelector("#modal-close");
      if (target) target.focus();
    });
  }

  function bindModal() {
    modal = document.getElementById("modal");
    if (!modal) return;

    modalForm = document.getElementById("modal-form");
    modalTitle = document.getElementById("modal-title");
    modalBody = document.getElementById("modal-body");
    modalActions = document.getElementById("modal-actions");
    modalError = document.getElementById("modal-error");

    var closeButton = document.getElementById("modal-close");
    if (closeButton) closeButton.addEventListener("click", closeModal);

    modal.addEventListener("click", function (event) {
      if (event.target === modal) closeModal();
    });

    modal.addEventListener("close", function () {
      var onClose = currentModal && currentModal.onClose;
      currentModal = null;
      clearModalError();
      if (typeof onClose === "function") onClose();
    });

    modal.addEventListener("cancel", function (event) {
      if (currentModal && currentModal.busy) event.preventDefault();
    });

    modalBody.addEventListener("input", function (event) {
      clearModalError();
      if (event.target && event.target.removeAttribute) {
        event.target.removeAttribute("aria-invalid");
      }
    });

    modalForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!currentModal || currentModal.busy) return;

      var opts = currentModal;
      var submitButton = modalActions.querySelector('button[type="submit"]');
      var idleLabel = submitButton ? submitButton.textContent : "";

      opts.busy = true;
      clearModalError();
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = opts.pendingLabel;
      }

      Promise.resolve(opts.onSubmit ? opts.onSubmit(modalForm) : true)
        .then(function (result) {
          if (result === false) return;
          closeModal();
        })
        .catch(function (error) {
          showModalError(
            error && error.message
              ? error.message
              : "Something went wrong. Please try again."
          );
        })
        .finally(function () {
          opts.busy = false;
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = idleLabel;
          }
        });
    });
  }

  function confirmDialog(options) {
    return new Promise(function (resolve) {
      var settled = false;
      function finish(value) {
        if (settled) return;
        settled = true;
        resolve(value);
      }

      openModal({
        title: options.title || "Are you sure?",
        content: '<p class="modal__text">' + escapeHtml(options.message || "") + "</p>",
        submitLabel: options.confirmLabel || "Confirm",
        cancelLabel: "Cancel",
        danger: !!options.danger,
        pendingLabel: "Working…",
        onSubmit: function () {
          finish(true);
          return true;
        },
        onClose: function () {
          finish(false);
        }
      });
    });
  }

  /* Context menu --------------------------------------------------- */

  var openMenuEl = null;
  var menuAnchor = null;
  var menuDocHandler = null;

  function closeMenu() {
    if (!openMenuEl) return;

    openMenuEl.remove();
    openMenuEl = null;

    if (menuAnchor) {
      menuAnchor.setAttribute("aria-expanded", "false");
      menuAnchor = null;
    }

    if (menuDocHandler) {
      document.removeEventListener("pointerdown", menuDocHandler, true);
      menuDocHandler = null;
    }

    window.removeEventListener("resize", closeMenu);
    window.removeEventListener("scroll", closeMenu, true);
  }

  function openMenu(anchor, items) {
    closeMenu();

    if (!anchor || !items || !items.length) return;

    var menu = document.createElement("div");
    menu.className = "menu";
    menu.setAttribute("role", "menu");

    items.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "menu__item" + (item.danger ? " menu__item--danger" : "");
      button.setAttribute("role", "menuitem");
      if (item.icon) {
        button.innerHTML = icon(item.icon, 17) + "<span>" + escapeHtml(item.label) + "</span>";
      } else {
        button.textContent = item.label;
      }
      button.addEventListener("click", function () {
        closeMenu();
        item.onSelect();
      });
      menu.appendChild(button);
    });

    document.body.appendChild(menu);
    menu.style.visibility = "hidden";
    menu.style.left = "0px";
    menu.style.top = "0px";

    var rect = anchor.getBoundingClientRect();
    var width = menu.offsetWidth;
    var height = menu.offsetHeight;
    var left = Math.min(rect.right - width, window.innerWidth - width - 8);
    var top = rect.bottom + 6;

    if (top + height > window.innerHeight - 8) {
      top = Math.max(8, rect.top - height - 6);
    }

    menu.style.left = Math.max(8, left) + "px";
    menu.style.top = top + "px";
    menu.style.visibility = "visible";

    openMenuEl = menu;
    menuAnchor = anchor;
    anchor.setAttribute("aria-expanded", "true");

    menuDocHandler = function (event) {
      if (menu.contains(event.target) || anchor.contains(event.target)) return;
      closeMenu();
    };
    document.addEventListener("pointerdown", menuDocHandler, true);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    menu.addEventListener("keydown", function (event) {
      var buttons = Array.prototype.slice.call(menu.querySelectorAll(".menu__item"));
      var index = buttons.indexOf(document.activeElement);

      if (event.key === "ArrowDown") {
        event.preventDefault();
        buttons[(index + 1) % buttons.length].focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        buttons[(index - 1 + buttons.length) % buttons.length].focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        anchor.focus();
      }
    });

    window.requestAnimationFrame(function () {
      var first = menu.querySelector(".menu__item");
      if (first) first.focus();
    });
  }

  /* File download -------------------------------------------------- */

  function downloadJson(data, filename) {
    var blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  /* Init ----------------------------------------------------------- */

  function init() {
    busyEl = document.getElementById("busy");
    busyTextEl = document.getElementById("busy-text");

    bindModal();

    // Cover images fall back one step (e.g. song art -> playlist art)
    // and disappear to reveal the placeholder if that also fails.
    document.addEventListener(
      "error",
      function (event) {
        var img = event.target;
        if (!img || img.tagName !== "IMG" || !img.classList.contains("cover__img")) {
          return;
        }

        var fallback = img.getAttribute("data-fallback");
        if (fallback) {
          img.removeAttribute("data-fallback");
          img.src = fallback;
        } else {
          img.remove();
        }
      },
      true
    );
  }

  window.Ongaku.ui = {
    icon: icon,
    escapeHtml: escapeHtml,
    formatTime: formatTime,
    isHttpUrl: isHttpUrl,
    slugify: slugify,
    coverHtml: coverHtml,
    renderCoverInto: renderCoverInto,
    setRangeFill: setRangeFill,
    toast: toast,
    busy: setBusy,
    updateBusy: updateBusy,
    clearBusy: clearBusy,
    openModal: openModal,
    closeModal: closeModal,
    confirm: confirmDialog,
    openMenu: openMenu,
    closeMenu: closeMenu,
    downloadJson: downloadJson
  };

  init();
})();
