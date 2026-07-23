/* =====================================================================
   DISPO+ THEME + NAV SHELL
   Handles: light/dark theme persistence, hamburger off-canvas sidebar,
   active nav link highlighting. Include on every page, after the
   page's own script(s).
===================================================================== */

(function () {
  const THEME_KEY = "dispo-theme";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelectorAll(".theme-opt").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.theme === theme);
    });
  }

  function getTheme() {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  }

  function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
  }

  window.dispoSetTheme = setTheme;

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(getTheme());

    // topbar quick toggle button
    const quickToggle = document.getElementById("themeToggleBtn");
    if (quickToggle) {
      quickToggle.addEventListener("click", () => {
        setTheme(getTheme() === "dark" ? "light" : "dark");
      });
    }

    // sidebar segmented control
    document.querySelectorAll(".theme-opt").forEach(btn => {
      btn.addEventListener("click", () => setTheme(btn.dataset.theme));
    });

    /* ---------- off-canvas nav sidebar ---------- */
    const sidebar    = document.getElementById("appnavSidebar");
    const overlay    = document.getElementById("appnavOverlay");
    const openBtn    = document.getElementById("hamburgerBtn");
    const closeBtn   = document.getElementById("appnavClose");

    function openNav() {
      sidebar.classList.add("open");
      overlay.classList.add("open");
      document.body.classList.add("appnav-locked");
    }

    function closeNav() {
      sidebar.classList.remove("open");
      overlay.classList.remove("open");
      document.body.classList.remove("appnav-locked");
    }

    if (openBtn)  openBtn.addEventListener("click", openNav);
    if (closeBtn) closeBtn.addEventListener("click", closeNav);
    if (overlay)  overlay.addEventListener("click", closeNav);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });

    /* ---------- active nav link ---------- */
    const current = window.location.pathname.split("/").pop() || "../index.html";
    document.querySelectorAll(".appnav-links a").forEach(link => {
      if (link.getAttribute("href") === current) link.classList.add("active");
    });
  });
})();
