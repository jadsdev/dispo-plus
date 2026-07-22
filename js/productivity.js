const STORAGE_KEY = "productivityState_v2";
const HISTORY_KEY = "productivityHistory_v2";

let activeCaseSeconds = 0;
let shiftStartTime = null;
let activeTimers = new Map();
let activeCaseRow = null;
let activeIntervals = new Map();
let historyPage = 1;
const HISTORY_PAGE_SIZE = 3; // days per page

function changeHistoryPage(dir) {
  historyPage += dir;
  if (historyPage < 1) historyPage = 1;
  renderHistory();
}

(function highlightActiveTab() {
  const current = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".tab-item").forEach(tab => {
    if (tab.dataset.page === current) tab.classList.add("active");
  });
})();

/* =========================
   TIME BAR
========================= */
function updateTimes() {
  const now = new Date();

  const date = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  const pht = now.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  const dublin = now.toLocaleTimeString("en-GB", {
    timeZone: "Europe/Dublin",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  document.getElementById("timeBar").textContent =
    `${date} | PHT: ${pht} | Dublin: ${dublin}`;
}
setInterval(updateTimes, 1000);
updateTimes();

/* =========================
   FORMAT TIME
========================= */
function formatTime(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* =========================
   SAVE STATE
========================= */
function saveState() {
  const rows = [];

  document.querySelectorAll("#rows tr").forEach(row => {

    rows.push({
      uid: row.querySelector(".uidInput").value,
      status: row.querySelector(".statusSelect").value,
      location: row.querySelector(".locationSelect").value,
      issuing: row.querySelector(".issuingInput").value,
      hits: row.querySelector(".hitsInput").value,

      startText: row.querySelector(".startInput").value,
      endText: row.querySelector(".endCell").textContent,

      startTimestamp: row.dataset.startTimestamp || null,

      liveSeconds: row.dataset.liveSeconds || 0,
      finalSeconds: row.dataset.finalSeconds || 0,

      finalized: row.dataset.finalized === "true",
      active: activeCaseRow === row
    });

  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    shiftStartTime,
    rows
  }));
}

/* =========================
   LOAD STATE
========================= */
function loadState() {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (!data || !data.rows) return;

  // recreate rows
  data.rows.forEach(() => addRow(false));

  const allRows = document.querySelectorAll("#rows tr");

  data.rows.forEach((r, i) => {
    const row = allRows[i];
    if (!row) return;

    // ── restore basic inputs ──
    row.querySelector(".uidInput").value = r.uid || "";
    row.querySelector(".statusSelect").value = r.status || "Pending";
    updateStatusStyle(row.querySelector(".statusSelect"));

    row.querySelector(".locationSelect").value = r.location || "";
    row.querySelector(".issuingInput").value = r.issuing || "";
    row.querySelector(".hitsInput").value = r.hits || "";

    row.querySelector(".startInput").value = r.startText || "--:--:--";
    row.querySelector(".endCell").textContent = r.endText || "--:--:--";

    // ── restore timing data ──
    row.dataset.startTimestamp = r.startTimestamp || "";
    row.dataset.liveSeconds = r.liveSeconds || 0;
    row.dataset.finalSeconds = r.finalSeconds || 0;

    // ── finalize lock ──
    if (r.finalized) {
      applyRowLock(row);
      return;
    }

    // ── restore ACTIVE case safely ──
    const isRunning =
      r.startTimestamp &&
      (!r.endText || r.endText === "--:--:--") &&
      !r.finalized;

      if (isRunning) {

        const start = Number(r.startTimestamp);
        if (!start) return;
      
        activeCaseRow = row;
        activeTimers.set(row, start);
      
        row.classList.add("activeRow");
      
        row.dataset.startTimestamp = start;
      
        const elapsed = Math.floor((Date.now() - start) / 1000);
        row.dataset.liveSeconds = elapsed;
      
        // restore UI safely
        row.querySelector(".startInput").value =
        r.startText || new Date(start).toLocaleTimeString("en-GB", {
          timeZone: "Europe/Dublin"
        });
      
        // ❌ DO NOT start timer immediately here
        // let DOM finish first
        setTimeout(() => {
          startLiveTimer(row);
          updateTotals();
          updateLiveStatus();
        }, 50);
      }

  });

  refreshStartButtons();
  updateLiveStatus();
  updateTotals();
}

function startShift() {
  if (shiftStartTime) {
    showToast("Shift already active", "error");
    return;
  }

  shiftStartTime = Date.now();
  localStorage.setItem("shiftStartTime_v2", shiftStartTime);

  updateShiftUI();
  showToast("Shift started", "success");
}

function endShift() {
  if (!shiftStartTime) {
    showToast("No active shift", "error");
    return;
  }

  if (activeCaseRow) {
    showToast("Finish the active case before ending shift", "error");
    return;
  }

  // Stop all intervals
  document.querySelectorAll("#rows tr").forEach(row => stopInterval(row));

  // Clear the board
  document.getElementById("rows").innerHTML = "";

  activeCaseRow = null;
  activeTimers.clear();
  activeIntervals.clear();

  updateTotals();
  updateLiveStatus();

  shiftStartTime = null;
  localStorage.removeItem("shiftStartTime_v2");
  localStorage.removeItem(STORAGE_KEY);        // clear current session state
  updateShiftUI();

  const sessionEl = document.querySelector(".activeSessionMini");
if (sessionEl) {
  sessionEl.classList.remove("live-on", "live-dot");
}

const liveStatus = document.getElementById("liveStatus");
if (liveStatus) {
  liveStatus.textContent = "IDLE";
  liveStatus.className = "liveStatus live-off";
}

const session = document.querySelector(".activeSessionMini");
if (session) {
  session.classList.remove("active");
  session.querySelector(".liveDot")?.classList.remove("active");
}

  showToast("Shift ended", "success");
}

function isShiftActive() {
  return !!shiftStartTime;
}

function updateStatusStyle(select) {
  select.classList.remove(
    "status-inprogress",
    "status-verified",
    "status-resubmit",
    "status-escalate",
    "status-rejected"
  );

  const val = select.value;

  if (val === "Verified") select.classList.add("status-verified");
  else if (val === "Resubmit") select.classList.add("status-resubmit");
  else if (val === "Escalate") select.classList.add("status-escalate");
  else if (val === "Rejected") select.classList.add("status-rejected");
  else select.classList.add("status-inprogress");
}

function updateShiftUI() {
  const el = document.getElementById("shiftStatus");
  const startBtn = document.getElementById("startShiftBtn");
  const endBtn = document.getElementById("endShiftBtn");

  if (!el) return;

  if (!shiftStartTime) {
    el.textContent = "No Active Shift";
    el.className = "shift-off";

    if (startBtn) startBtn.disabled = false;
    if (endBtn) endBtn.disabled = true;
    return;
  }

  const date = new Date(shiftStartTime).toLocaleDateString("en-CA", {
    timeZone: "Europe/Dublin"
  });

  const time = new Date(shiftStartTime).toLocaleTimeString("en-GB", {
    timeZone: "Europe/Dublin",
    hour: "2-digit",
    minute: "2-digit"
  });

  el.textContent = `${date} | Started ${time}`;
  el.className = "shift-active";

  if (startBtn) startBtn.disabled = true;
  if (endBtn) endBtn.disabled = false;
}

/* =========================
   BUTTON CONTROL
========================= */
function refreshStartButtons() {

  document.querySelectorAll("#rows tr").forEach(row => {

    const startBtn = row.querySelector(".startBtn");
    const stopBtn = row.querySelector(".stopBtn");

    const isFinalized = row.dataset.finalized === "true";
    const isActive = activeCaseRow === row;

    // ─────────────────────────
    // 1. FINALIZED ROW (locked forever)
    // ─────────────────────────
    if (isFinalized) {
      startBtn.disabled = true;
      stopBtn.disabled = true;
    
      // 🔒 ensure everything stays locked
      row.querySelectorAll("input, select").forEach(el => {
        el.disabled = true;
      });
    
      return;
    }

    // ─────────────────────────
    // 2. ACTIVE ROW (currently running case)
    // ─────────────────────────
    if (isActive) {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      return;
    }

    // ─────────────────────────
    // 3. SOME OTHER CASE IS ACTIVE
    // (lock start for all other rows)
    // ─────────────────────────
    if (activeCaseRow) {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      return;
    }

    // ─────────────────────────
    // 4. NO ACTIVE CASE (idle state)
    // ─────────────────────────
    startBtn.disabled = false;
    stopBtn.disabled = false;

  });
}

function getDublinDate() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Dublin"
  }); // YYYY-MM-DD format
}

function saveToHistory(row, sec) {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || {};
  const dateKey = getDublinDate();

  if (!history[dateKey]) {
    history[dateKey] = { cases: [] };          // ← was []
  }

  // guard: if somehow stored as bare array, upgrade it
  if (Array.isArray(history[dateKey])) {
    history[dateKey] = { cases: history[dateKey] };
  }

  history[dateKey].cases.push({               // ← was .push directly
    uid: row.querySelector(".uidInput")?.value || "",
    status: row.querySelector(".statusSelect")?.value || "",
    location: row.querySelector(".locationSelect")?.value || "",
    issuing: row.querySelector(".issuingInput")?.value || "",
    hits: row.querySelector(".hitsInput")?.value || "0",
    time: sec,
    timestamp: Date.now()
  });

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function lockRow(row) {
  const startBtn = row.querySelector(".startBtn");
  const stopBtn = row.querySelector(".stopBtn");

  startBtn.disabled = true;
  stopBtn.disabled = true;

  row.classList.add("finished-row");
}

function applyRowLock(row) {
  row.dataset.finalized = "true";

  const startBtn = row.querySelector(".startBtn");
  const stopBtn = row.querySelector(".stopBtn");
  const deleteBtn = row.querySelector(".deleteBtn");

  // HARD LOCK
  startBtn.disabled = true;
  stopBtn.disabled = true;

  startBtn.classList.add("locked");
  stopBtn.classList.add("locked");

  row.classList.add("finished-row");

  // 🔒 disable ALL inputs inside row (except delete button)
  row.querySelectorAll("input, select").forEach(el => {
    el.disabled = true;
  });

  // re-enable ONLY delete button
  deleteBtn.disabled = false;
}

/* =========================
   ADD ROW
========================= */
function addRow(save = true) {
  const table = document.getElementById("rows");
  const row = document.createElement("tr");

  row.innerHTML = `
    <td><input class="input uidInput" placeholder="UID"></td>

    <td>
      <select class="statusSelect">
        <option>Pending</option>
        <option>Verified</option>
        <option>Resubmit</option>
        <option>Escalate</option>
        <option>Rejected</option>
      </select>
    </td>

    <td>
      <select class="locationSelect">
        <option>ROW</option>
        <option>EU</option>
        <option>RFI-ROW</option>
        <option>RFI-EU</option>
      </select>
    </td>

    <td><input class="input issuingInput" placeholder="Issuing"></td>
    <td><input class="input hitsInput" type="text" placeholder="0" min="0"></td>

    <td><input class="startCell startInput" placeholder="--:--:--" readonly></td>
    <td class="endCell">--:--:--</td>

    <td>
      <button class="startBtn">Start</button>
      <button class="stopBtn">End</button>
      <button class="deleteBtn">✕</button>
    </td>
  `;

  table.appendChild(row);
  bindRow(row);

  refreshStartButtons();
  updateTotals();

  if (save) saveState();
}

function flash(el){
  el.classList.remove("updated");
  void el.offsetWidth;
  el.classList.add("updated");
}

flash(document.getElementById("cases"));
flash(document.getElementById("hits"));
flash(document.getElementById("totalTime"));
flash(document.getElementById("aht"));
flash(document.getElementById("util"));

function openStatusModal(callback) {
  const modal = document.getElementById("statusModal");
  if (!modal) return;

  modal.classList.add("open");

  function close(status) {
    modal.classList.remove("open");
    modal.onclick = null;
    document.getElementById("modalCancelBtn").onclick = null;
    document.getElementById("modalCloseBtn").onclick = null;
    callback(status);
  }

  document.getElementById("modalCancelBtn").onclick = () => close(null);
  document.getElementById("modalCloseBtn").onclick  = () => close(null);

  modal.onclick = (e) => {
    if (e.target === modal) close(null);
    const item = e.target.closest(".status-item");
    if (item) close(item.dataset.status);
  };
}

/* =========================
   BIND ROW
========================= */
function bindRow(row) {

  const status = row.querySelector(".statusSelect");
  const startInput = row.querySelector(".startInput");

  startInput.addEventListener("click", () => {
    if (row.dataset.finalized === "true") return;
    if (!row.dataset.startTimestamp) {
      showToast("Start the case first", "error");
      return;
    }
  
    if (row.querySelector(".startEditOverlay")) return;
  
    const current = startInput.value;
    const td = startInput.closest("td");
  
    const editor = document.createElement("input");
editor.type = "text";
editor.value = current;
editor.className = "startEditOverlay";

// Use fixed positioning based on td's screen position
const rect = td.getBoundingClientRect();
editor.style.position = "fixed";
editor.style.top = rect.top + "px";
editor.style.left = rect.left + "px";
editor.style.width = rect.width + "px";
editor.style.height = rect.height + "px";

document.body.appendChild(editor);
    editor.focus();
    editor.select();
  
    let committed = false;
  
    function commit() {
      if (committed) return;
      committed = true;
      editor.remove();
  
      const val = editor.value.trim();
      if (!val || val === current) return;
  
      // Accept either "132458" (6 digits) or "13:24:58"
    let normalized = val.replace(/:/g, "");
    if (!/^\d{6}$/.test(normalized)) {
      showToast("Enter 6 digits e.g. 132458 or 13:24:58", "error");
      return;
    }

    const hh = Number(normalized.slice(0, 2));
    const mm = Number(normalized.slice(2, 4));
    const ss = Number(normalized.slice(4, 6));

    if (hh > 23 || mm > 59 || ss > 59) {
      showToast("Invalid time values", "error");
      return;
    }

    // Normalize display to HH:MM:SS
    const formattedVal = `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  
      // Reliable Dublin → UTC conversion using Intl
      const now = new Date();
      const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Dublin",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false
      });
      const p = {};
      fmt.formatToParts(now).forEach(({ type, value }) => p[type] = value);
  
      // Dublin "now" as fake-UTC ms
      const dublinNowFake = new Date(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`).getTime();
      // Target time as fake-UTC ms (same date)
      const targetFake = new Date(
        `${p.year}-${p.month}-${p.day}T${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}Z`
      ).getTime();
      // Real offset = actual UTC - Dublin fake UTC
      const offsetMs = now.getTime() - dublinNowFake;
      // Real UTC timestamp for the entered Dublin time
      const newTimestamp = targetFake + offsetMs;
  
      if (isNaN(newTimestamp)) { showToast("Invalid time", "error"); return; }
  
      // Apply new start
      startInput.value = formattedVal;
      row.dataset.startTimestamp = newTimestamp;
  
      // If case still running — restart timer from new start
      if (activeCaseRow === row) {
        const elapsed = Math.floor((Date.now() - newTimestamp) / 1000);
        row.dataset.liveSeconds = elapsed;
        stopInterval(row);
        startLiveTimer(row);
        document.getElementById("activeCaseTime").textContent = formatTime(elapsed);
      }
  
      // If finalized — recalc duration against end time
      if (row.dataset.finalized === "true") {
        const endText = row.querySelector(".endCell").textContent.trim();
        if (endText && endText !== "--:--:--") {
          const [eh, em, es] = endText.split(":").map(Number);
          const endFake = new Date(
            `${p.year}-${p.month}-${p.day}T${String(eh).padStart(2,"0")}:${String(em).padStart(2,"0")}:${String(es).padStart(2,"0")}Z`
          ).getTime();
          const endTimestamp = endFake + offsetMs;
          row.dataset.finalSeconds = Math.max(0, Math.floor((endTimestamp - newTimestamp) / 1000));
        }
      }
  
      updateTotals();
      saveState();
      showToast("Start time updated", "success");
    }
  
    editor.addEventListener("keydown", (e) => {
      if (e.key === "Enter")  { e.preventDefault(); commit(); }
      if (e.key === "Escape") { committed = true; editor.remove(); }
    });
  
    editor.addEventListener("blur", commit);
  });

startInput.addEventListener("keydown", (e) => {
  if (!isEditing) return;

  if (e.key === "Enter") {
    e.preventDefault();
    isEditing = false;
    startInput.setAttribute("readonly", true);
    startInput.classList.remove("editing");
    recalcFromStartInput(row);
  }

  if (e.key === "Escape") {
    e.preventDefault();
    isEditing = false;
    startInput.setAttribute("readonly", true);
    startInput.classList.remove("editing");
  }
});

startInput.addEventListener("blur", () => {
  if (!isEditing) return;
  isEditing = false;
  startInput.setAttribute("readonly", true);
  startInput.classList.remove("editing");
  recalcFromStartInput(row);
});

// initial color
updateStatusStyle(status);

// change color on update
status.addEventListener("change", () => {
  updateStatusStyle(status);
  saveState();
});

row.querySelector(".startBtn").onclick = () => {
  if (row.dataset.finalized === "true") return; // 🔒 BLOCK FINISHED

  if (activeCaseRow && activeCaseRow !== row) return;

  if (!shiftStartTime) {
    showToast("Start shift first", "error");
    return;
  }

  const now = Date.now();

  row.dataset.startTimestamp = now;

  row.querySelector(".startInput").value =
  new Date(now).toLocaleTimeString("en-GB", { timeZone: "Europe/Dublin" });

  row.querySelector(".endCell").textContent = "--:--:--";

  activeCaseRow = row;
  activeTimers.set(row, now);

  document.getElementById("activeCaseUid").textContent =
  row.querySelector(".uidInput").value || "—";

  row.classList.add("activeRow");

  startLiveTimer(row);

  refreshStartButtons();
  updateLiveStatus();
  saveState();
};

row.querySelector(".stopBtn").onclick = () => {
  if (row.dataset.finalized === "true") return;

  const start = Number(row.dataset.startTimestamp);
  if (!start) return;

  // ✅ Open modal FIRST — don't stop anything yet
  openStatusModal((status) => {
    if (!status) return; // cancelled — case keeps running, nothing changes

    const end = Date.now();

    // ✅ Only stop timer and finalize AFTER status is chosen
    stopInterval(row);
    activeTimers.delete(row);

    const sec = Math.floor((end - start) / 1000);
    row.dataset.finalSeconds = sec;

    row.querySelector(".endCell").textContent =
      new Date(end).toLocaleTimeString("en-GB", {
        timeZone: "Europe/Dublin"
      });

    row.classList.remove("activeRow");
    activeCaseRow = null;

    const select = row.querySelector(".statusSelect");
    select.value = status;
    updateStatusStyle(select);

    row.dataset.finalized = "true";
    applyRowLock(row);

    saveToHistory(row, sec);

    refreshStartButtons();
    updateTotals();
    updateLiveStatus();
    saveState();

    showToast(`Case saved as ${status}`, "success");
  });
};

  row.querySelector(".deleteBtn").onclick = () => {
    if (activeCaseRow === row) {
      resetActiveCaseDisplay();
      activeCaseRow = null;
      document.getElementById("activeCaseTime").textContent = "0:00:00";
    }

    activeTimers.delete(row);
    stopInterval(row);

    row.remove();

    updateLiveStatus();
    refreshStartButtons();
    updateTotals();
    saveState();
  };

  const issuingInput = row.querySelector(".issuingInput");

issuingInput.addEventListener("input", (e) => {
  const cursorPos = e.target.selectionStart;
  e.target.value = e.target.value.toUpperCase();
  e.target.setSelectionRange(cursorPos, cursorPos);
});

  // ✅ Auto-save when any input changes
  row.querySelectorAll(".uidInput, .statusSelect, .locationSelect, .issuingInput, .hitsInput")
    .forEach(el => el.addEventListener("change", saveState));
}

function startCase(row) {
  if (row.classList.contains("locked-row")) return;

  row.classList.add("activeRow");

  // disable start button immediately
  row.querySelector(".startBtn").disabled = true;
}

function finishCase(row) {
  row.classList.add("locked-row");   // 🔒 permanent lock

  row.querySelector(".startBtn").disabled = true;
  row.querySelector(".stopBtn").disabled = true;
}

/* =========================
   LIVE TIMER
========================= */
function startLiveTimer(row) {

  stopInterval(row);

  const start = Number(row.dataset.startTimestamp);

  const startTick = () => {
    const elapsed = Math.floor((Date.now() - start) / 1000);

    row.dataset.liveSeconds = elapsed;

    if (row === activeCaseRow) {
      document.getElementById("activeCaseTime").textContent = formatTime(elapsed);
      document.getElementById("activeCaseUid").textContent =
        row.querySelector(".uidInput").value || "—";
    }

    updateTotals();
  };

  startTick(); // 🔥 immediate update (removes delay feel)

const id = setInterval(startTick, 1000);
activeIntervals.set(row, id);

  // 🔥 IMPORTANT: update instantly (prevents 0:00 flash)
  const initial = Math.floor((Date.now() - start) / 1000);

  if (row === activeCaseRow) {
    document.getElementById("activeCaseTime").textContent =
      formatTime(initial);
  }

  updateTotals();
}

function stopInterval(row) {
  const id = activeIntervals.get(row);
  if (id) clearInterval(id);
  activeIntervals.delete(row);

  activeCaseSeconds = 0;

  // ❌ DO NOT reset UI here during restore
  if (!row) return;
}

const pages = [
  "productivity.html",
  "maxpenalty.html",
  "common-name.html",
  "potential-match.html",
  "remission.html",
  "playbook.html",
  "jpgpdf.html"
];
  
  function getCurrentIndex() {
    const current = window.location.pathname.split("/").pop();
    return pages.indexOf(current);
  }
  
  function goNext() {
    const i = getCurrentIndex();
    if (i < pages.length - 1) {
      window.location.href = pages[i + 1];
    }
  }
  
  function goPrev() {
    const i = getCurrentIndex();
    if (i > 0) {
      window.location.href = pages[i - 1];
    }
  }

  /* =========================
   RECALC FROM EDITED START TIME
========================= */
function recalcFromStartInput(row) {
  const startInput = row.querySelector(".startInput");
  const raw = startInput.value.trim();
  if (!raw || raw === "--:--:--") return;

  const [hh, mm, ss] = raw.split(":").map(Number);
  if (isNaN(hh) || isNaN(mm) || isNaN(ss)) {
    showToast("Invalid format — use HH:MM:SS", "error");
    return;
  }

  // Get Dublin's current UTC offset dynamically
  const now = new Date();

// Get today's date string in Dublin time (YYYY-MM-DD)
const today = now.toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });

// Build a date string and parse it as Dublin local time using Intl
const dublinDateStr = `${today}T${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;

// Use Intl to find what UTC time corresponds to this Dublin local time
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Dublin",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
  hour12: false
});

// Get current Dublin time parts to calculate offset
const parts = formatter.formatToParts(now);
const p = {};
parts.forEach(({ type, value }) => p[type] = value);

const dublinNowStr = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
const dublinNowMs = new Date(dublinNowStr).getTime(); // treat as UTC to get the number
const offsetMs = now.getTime() - dublinNowMs; // actual offset: UTC - Dublin_local

const newTimestamp = new Date(dublinDateStr).getTime() + offsetMs;

if (isNaN(newTimestamp)) {
  showToast("Invalid time", "error");
  return;
}

  row.dataset.startTimestamp = newTimestamp;

  // Still running — update live elapsed
  if (activeCaseRow === row) {
    const elapsed = Math.floor((Date.now() - newTimestamp) / 1000);
    row.dataset.liveSeconds = elapsed;
    document.getElementById("activeCaseTime").textContent = formatTime(elapsed);
  }

  // Finalized — recalc duration against stored end time
  if (row.dataset.finalized === "true") {
    const endText = row.querySelector(".endCell").textContent.trim();
    if (endText && endText !== "--:--:--") {
      const [eh, em, es] = endText.split(":").map(Number);
      const endTimestamp = new Date(
  `${today}T${String(eh).padStart(2,"0")}:${String(em).padStart(2,"0")}:${String(es).padStart(2,"0")}`
).getTime() + offsetMs;
      row.dataset.finalSeconds = Math.max(0, Math.floor((endTimestamp - newTimestamp) / 1000));
    }
  }

  updateTotals();
  saveState();
  showToast("Start time updated", "success");
}

/* =========================
   TOTALS
========================= */
function updateTotals() {
  let total = 0;
  let hits = 0;
  let completedCases = 0;

  document.querySelectorAll("#rows tr").forEach(r => {
    const status = r.querySelector(".statusSelect")?.value;
    const time = Number(r.dataset.finalSeconds || r.dataset.liveSeconds || 0);
    const hit = Number(r.querySelector(".hitsInput")?.value || 0);

    const isCompleted = status !== "Pending";

    if (isCompleted) {
      total += time;
      hits += hit;
      completedCases++;
    }
  });

  // ✅ Live case: add its elapsed time to the running total for Utilization,
  // and count it into the AHT average so AHT updates live too
  let liveTime = 0;
let caseCountForAht = completedCases;

// 🔥 include active case in ALL footer metrics
if (activeCaseRow) {
  liveTime = Number(activeCaseRow.dataset.liveSeconds || 0);
  caseCountForAht += 1;
}

// TOTAL FOOTER VALUES
const totalForUtil = total + liveTime;
const totalForAht = total + liveTime;

  document.getElementById("cases").textContent = completedCases;
  document.getElementById("hits").textContent = hits;

  document.getElementById("aht").textContent =
    formatTime(caseCountForAht ? Math.floor(totalForAht / caseCountForAht) : 0);

  document.getElementById("totalTime").textContent = formatTime(totalForUtil);

  const SHIFT_SECONDS = 8 * 60 * 60;
  const util = (totalForUtil / SHIFT_SECONDS) * 100;
  document.getElementById("util").textContent = util.toFixed(1) + "%";
}

/* =========================
   LIVE STATUS
========================= */
function updateLiveStatus() {
  const el = document.getElementById("liveStatus");

  const isLive = activeCaseRow !== null;
  const shiftActive = isShiftActive();

  if (shiftActive && isLive) {
    el.textContent = "LIVE";
    el.className = "liveStatus live-on";
  } 
  else if (shiftActive && !isLive) {
    el.textContent = "IDLE";
    el.className = "liveStatus live-off";
  } 
  else {
    el.textContent = "SHIFT OFF";
    el.className = "liveStatus live-off";

    document.getElementById("activeCaseTime").textContent = "0:00:00";
    document.getElementById("activeCaseUid").textContent = "—";
  }

  // 🔥 FIX MINI SESSION UI HERE (THIS WAS MISSING CONSISTENCY)
  const session = document.querySelector(".activeSessionMini");
  if (session) {
    if (shiftActive) {
      session.classList.add("active");
    } else {
      session.classList.remove("active");
    }
  }
}

/* =========================
   VISIBILITY CHANGE — re-sync timer when tab regains focus
========================= */
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {

    document.querySelectorAll("#rows tr").forEach(row => {
      const start = Number(row.dataset.startTimestamp);

      if (!start) return;

      const elapsed = Math.floor((Date.now() - start) / 1000);
      row.dataset.liveSeconds = elapsed;

      if (row === activeCaseRow) {
        document.getElementById("activeCaseTime").textContent =
          formatTime(elapsed);
      }
    });

    updateTotals();
    updateLiveStatus();
  }
});

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

function clearAllCases() {
  const rows = document.getElementById("rows");

  if (!rows || rows.children.length === 0) {
    showToast("No cases to clear", "error");
    return;
  }

  // ── WARNING STATE ──
  const confirmClear = confirm(
    "⚠ Warning: This will permanently clear all cases.\n\nDo you want to continue?"
  );

  if (!confirmClear) {
    showToast("Clear cancelled", "error");
    return;
  }

  // ── CLEAR ACTION ──
  rows.innerHTML = "";

  document.getElementById("cases").textContent = "0";
  document.getElementById("hits").textContent = "0";
  document.getElementById("totalTime").textContent = "0:00:00";

  const aht = document.getElementById("aht");
  const util = document.getElementById("util");
  const status = document.getElementById("liveStatus");

  if (aht) aht.textContent = "0:00:00";
  if (util) util.textContent = "0.00%";

  if (status) {
    status.textContent = "IDLE";
    status.className = "liveStatus live-off";
  }

  localStorage.removeItem("productivityState_v2");

  if (typeof activeTimers !== "undefined") activeTimers.clear?.();
  if (typeof activeIntervalRows !== "undefined") activeIntervalRows.clear?.();

  showToast("All cases cleared", "success");
  updateTotals();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || {};
  const container = document.getElementById("historyList");
  const search = document.getElementById("historySearch")?.value?.toLowerCase() || "";

  if (!container) return;

  container.innerHTML = "";

  const dates = Object.keys(history).sort().reverse();

  if (dates.length === 0) {
    container.innerHTML = `<div class="no-history">No history entries found</div>`;
    return;
  }

  // ── PAGINATION ──
  const start = (historyPage - 1) * HISTORY_PAGE_SIZE;
  const end = start + HISTORY_PAGE_SIZE;
  const pagedDates = dates.slice(start, end);

  document.getElementById("historyPageInfo").textContent =
    `${historyPage} / ${Math.ceil(dates.length / HISTORY_PAGE_SIZE)}`;

  const SHIFT_SECONDS = 8 * 60 * 60;

  pagedDates.forEach(dateKey => {
    const day = history[dateKey];
    let cases = day.cases || [];

    // ── UID FILTER ──
    const searchLower = search.toLowerCase();

    if (searchLower) {
  historyPage = 1;
}

if (searchLower) {
  cases = cases.filter(c => {
    const uid = (c.uid || "").toLowerCase();
    const status = (c.status || "").toLowerCase();
    const location = (c.location || "").toLowerCase();
    const issuing = (c.issuing || "").toLowerCase();

    // SHIFT DATE SEARCH (key upgrade)
    const dateMatch = dateKey.toLowerCase().includes(searchLower);

    return (
      uid.includes(searchLower) ||
      status.includes(searchLower) ||
      location.includes(searchLower) ||
      issuing.includes(searchLower) ||
      dateMatch
    );
  });
}

    if (cases.length === 0 && search) return;

    let totalTime = 0;
    let totalHits = 0;

    cases.forEach(c => {
      totalTime += Number(c.time || 0);
      totalHits += Number(c.hits || 0);
    });

    const aht = cases.length ? Math.floor(totalTime / cases.length) : 0;
    const util = (totalTime / SHIFT_SECONDS) * 100;

    let html = `
      <div class="history-card">
        <h3>${dateKey}</h3>

        <p>
          Cases: ${cases.length} |
          Hits: ${totalHits} |
          Time: ${formatTime(totalTime)} |
          AHT: ${formatTime(aht)} |
          Utilization: ${util.toFixed(1)}%
        </p>

        <table class="history-table">
          <thead>
            <tr>
              <th>UID</th>
              <th>Status</th>
              <th>Location</th>
              <th>Issuing</th>
              <th>Hits</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
    `;

    cases.forEach(c => {
      html += `
        <tr>
          <td>${c.uid}</td>
          <td class="status-cell status-${(c.status || "").toLowerCase()}">${c.status}</td>
          <td>${c.location}</td>
          <td>${c.issuing}</td>
          <td>${c.hits}</td>
          <td>${formatTime(c.time)}</td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    container.innerHTML += html;
  });
}

function resetActiveCaseDisplay() {
  if (!activeCaseRow) {
    document.getElementById("activeCaseTime").textContent = "0:00:00";
    document.getElementById("activeCaseUid").textContent = "—";
  }
}

function clearAllHistory() {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || {};

  const hasData = Object.keys(history).length > 0;

  if (!hasData) {
    showToast("No history to clear", "error");
    return;
  }

  const confirmClear = confirm(
    "⚠ This will permanently delete ALL shift history.\n\nContinue?"
  );

  if (!confirmClear) {
    showToast("Clear cancelled", "error");
    return;
  }

  // Clear storage
  localStorage.removeItem(HISTORY_KEY);

  // Clear UI
  const container = document.getElementById("historyList");
  if (container) container.innerHTML = "";

  // Reset chart if exists
  if (dailyChart) {
    dailyChart.destroy();
    dailyChart = null;
  }

  showToast("All history cleared", "success");
}



/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {

   // ✅ restore shift
   const savedShift = localStorage.getItem("shiftStartTime_v2");
   if (savedShift) {
     shiftStartTime = Number(savedShift);
   }

   const currentPage = location.pathname.split("/").pop();
document.querySelectorAll(".navbar a").forEach(a => {
  if (a.getAttribute("href") === currentPage) {
    a.classList.add("active");
  }
});

loadState();
updateShiftUI();
updateLiveStatus();   // 🔥 ADD THIS
renderHistory();
setInterval(saveState, 1000);
});