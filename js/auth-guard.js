/* =========================
   DISPO+ AUTH GUARD
   Include this on every PROTECTED page (inside /pages/), right after
   supabase-config.js. Blocks the page (body stays hidden via the
   html:not(.authed) CSS rule in <head>) until a valid Supabase session
   is confirmed, then reveals it. Redirects to ../login.html otherwise.
========================= */
(function () {
  function goToLogin() {
    var redirect = encodeURIComponent(location.pathname.split("/").pop() + location.search);
    location.replace("../login.html?redirect=" + redirect);
  }

  // Safety net: never leave this page invisible for more than 3s,
  // whatever goes wrong below.
  var revealTimeout = setTimeout(function () {
    document.documentElement.classList.add("authed");
  }, 3000);

  if (!window.supabase || !window.SUPABASE_URL || window.SUPABASE_URL === "YOUR_SUPABASE_PROJECT_URL") {
    console.error("dispo+ auth: supabase-config.js is not set up yet.");
    clearTimeout(revealTimeout);
    goToLogin();
    return;
  }

  var client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  window.dispoSupabase = client;

  client.auth.getSession()
    .then(function (res) {
      clearTimeout(revealTimeout);
      var session = res.data && res.data.session;
      if (!session) {
        goToLogin();
        return;
      }
      window.dispoUser = session.user;
      document.documentElement.classList.add("authed");
      document.dispatchEvent(new CustomEvent("dispo-auth-ready", { detail: { user: session.user } }));
    })
    .catch(function () {
      clearTimeout(revealTimeout);
      goToLogin();
    });

  client.auth.onAuthStateChange(function (event, session) {
    if (event === "SIGNED_OUT" || !session) {
      goToLogin();
    }
  });
})();