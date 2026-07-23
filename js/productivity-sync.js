/* =========================
   DISPO+ CLOUD SYNC (Supabase)
   Include this on productivity.html AFTER productivity.js and after
   auth-guard.js has run. Mirrors the full local state — case queue /
   session + history — to a Supabase table keyed by user_id, so an
   agent's data follows them to another browser or device.

   Reuses STORAGE_KEY / HISTORY_KEY / showToast from productivity.js —
   don't redeclare them here, they're already global on this page.

   Table expected (see productivity-sync.sql):
     productivity_snapshots(
       user_id uuid primary key references auth.users(id),
       productivity_state jsonb,
       productivity_history jsonb,
       shift_start_time bigint,
       updated_at timestamptz
     )
========================= */
(function () {
  var SYNC_TABLE = "productivity_snapshots";
  var SYNC_INTERVAL_MS = 60000; // matches the existing folder-autosave cadence
  var PULLED_FLAG = "dispo_sync_pulled_once";

  var supabaseUserId = null;
  var syncClient = null;
  var lastPushedSignature = "";

  function buildRemotePayload() {
    var stateRaw = localStorage.getItem(STORAGE_KEY);
    var historyRaw = localStorage.getItem(HISTORY_KEY);
    var shiftRaw = localStorage.getItem("shiftStartTime_v2");

    var stateObj = null, historyObj = null;
    try { stateObj = stateRaw ? JSON.parse(stateRaw) : null; } catch (e) { stateObj = null; }
    try { historyObj = historyRaw ? JSON.parse(historyRaw) : null; } catch (e) { historyObj = null; }

    return {
      user_id: supabaseUserId,
      productivity_state: stateObj,
      productivity_history: historyObj,
      shift_start_time: shiftRaw ? Number(shiftRaw) : null,
      updated_at: new Date().toISOString()
    };
  }

  function pushSnapshot() {
    if (!syncClient || !supabaseUserId) return;

    var payload = buildRemotePayload();
    var signature = JSON.stringify(payload.productivity_state) + "|" +
                    JSON.stringify(payload.productivity_history) + "|" +
                    payload.shift_start_time;

    if (signature === lastPushedSignature) return;
    lastPushedSignature = signature;

    syncClient.from(SYNC_TABLE).upsert(payload, { onConflict: "user_id" })
      .then(function (res) {
        if (res.error) console.error("dispo+ cloud sync failed:", res.error.message);
      });
  }

  // Exposed so productivity.js can force an immediate push right after
  // clearing local data (end shift / clear history), instead of
  // waiting up to 60s and risking a stale row getting pulled back down.
  window.dispoPushSnapshotNow = pushSnapshot;

  function pullSnapshotOnce() {
    if (!syncClient || !supabaseUserId) return;
    if (sessionStorage.getItem(PULLED_FLAG)) return; // once per tab session is enough

    syncClient.from(SYNC_TABLE).select("*").eq("user_id", supabaseUserId).maybeSingle()
      .then(function (res) {
        sessionStorage.setItem(PULLED_FLAG, "1");
        if (res.error || !res.data) return;

        // Never clobber an in-progress local session on this device —
        // only restore from the cloud when this browser is empty
        // (e.g. a brand-new device or a cleared browser).
        if (localStorage.getItem(STORAGE_KEY)) return;

        var data = res.data;
        var restoredSomething = false;

        if (data.productivity_state) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.productivity_state));
          restoredSomething = true;
        }
        if (data.productivity_history) {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(data.productivity_history));
          restoredSomething = true;
        }
        if (data.shift_start_time) {
          localStorage.setItem("shiftStartTime_v2", String(data.shift_start_time));
        }

        if (restoredSomething) {
          if (typeof showToast === "function") {
            showToast("Restored your data from the cloud", "success");
          }
          setTimeout(function () { location.reload(); }, 700);
        }
      });
  }

  function initSync(user, client) {
    supabaseUserId = user.id;
    syncClient = client;

    pullSnapshotOnce();
    pushSnapshot(); // sync this device's current state right away too
    setInterval(pushSnapshot, SYNC_INTERVAL_MS);
  }

  if (window.dispoUser && window.dispoSupabase) {
    initSync(window.dispoUser, window.dispoSupabase);
  } else {
    document.addEventListener("dispo-auth-ready", function (e) {
      initSync(e.detail.user, window.dispoSupabase);
    });
  }
})();
