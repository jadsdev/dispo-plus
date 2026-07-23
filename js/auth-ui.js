/* =========================
   DISPO+ AUTH UI
   Include this on EVERY page (protected or public), at the bottom of
   <body>, after theme.js. Fills in #authUserBadge in the topbar:
     - logged out: a "Login" link
     - logged in:  avatar with initials + dropdown (name, email, logout)
   On protected pages it reuses the session auth-guard.js already
   confirmed. On the public index page it checks the session itself.
========================= */
(function () {
  function isProtectedPage() {
    return location.pathname.indexOf("/pages/") !== -1;
  }

  function loginHref() {
    return isProtectedPage() ? "../login.html" : "login.html";
  }

  function getClient() {
    if (window.dispoSupabase) return window.dispoSupabase;
    if (!window.supabase || !window.SUPABASE_URL || window.SUPABASE_URL === "YOUR_SUPABASE_PROJECT_URL") {
      return null;
    }
    window.dispoSupabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    return window.dispoSupabase;
  }

  function getMeta(user) {
    var m = user.user_metadata || {};
    var first = m.first_name || "";
    var last = m.last_name || "";
    var fullName = (first + " " + last).trim() || m.full_name || user.email;
    var initials = (first ? first[0] : "") + (last ? last[0] : "");
    if (!initials) initials = (user.email || "?").slice(0, 2);
    return { fullName: fullName, initials: initials.toUpperCase(), email: user.email };
  }

  function closeDropdown() {
    var dd = document.getElementById("authDropdown");
    var btn = document.getElementById("authAvatarBtn");
    if (dd) dd.classList.remove("open");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function renderBadge(user) {
    var el = document.getElementById("authUserBadge");
    if (!el) return;

    if (user) {
      var meta = getMeta(user);
      el.innerHTML =
        '<div class="auth-avatar-wrap">' +
          '<button type="button" class="auth-avatar-btn" id="authAvatarBtn" aria-haspopup="true" aria-expanded="false">' +
            '<span class="auth-avatar">' + meta.initials + '</span>' +
          '</button>' +
          '<div class="auth-dropdown" id="authDropdown">' +
            '<div class="auth-dropdown-name">' + meta.fullName + '</div>' +
            '<div class="auth-dropdown-email">' + meta.email + '</div>' +
            '<button type="button" id="authLogoutBtn" class="auth-logout-btn">Logout</button>' +
          '</div>' +
        '</div>';

      var avatarBtn = document.getElementById("authAvatarBtn");
      var dropdown = document.getElementById("authDropdown");

      avatarBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var isOpen = dropdown.classList.toggle("open");
        avatarBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });

      document.addEventListener("click", function (e) {
        if (!el.contains(e.target)) closeDropdown();
      });

      document.getElementById("authLogoutBtn").addEventListener("click", function () {
        var client = getClient();
        if (!client) return;
        client.auth.signOut().then(function () {
          location.href = loginHref();
        });
      });
    } else {
      el.innerHTML =
        '<a href="' + loginHref() + '" class="auth-login-btn">' +
          '<svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>' +
          'Login' +
        '</a>';
    }
  }

  // Protected pages: auth-guard.js already resolved the session.
  if (isProtectedPage()) {
    if (window.dispoUser) {
      renderBadge(window.dispoUser);
    } else {
      document.addEventListener("dispo-auth-ready", function (e) {
        renderBadge(e.detail.user);
      });
    }
    return;
  }

  // Public page (index.html): check session ourselves, non-blocking.
  var client = getClient();
  if (!client) {
    renderBadge(null);
    return;
  }

  client.auth.getSession().then(function (res) {
    renderBadge(res.data && res.data.session ? res.data.session.user : null);
  });

  client.auth.onAuthStateChange(function (_event, session) {
    renderBadge(session ? session.user : null);
  });
})();
