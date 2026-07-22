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

  const row = select.closest("tr");
  if (row) {
    row.classList.remove(
      "rowStatus-pending",
      "rowStatus-verified",
      "rowStatus-resubmit",
      "rowStatus-escalate",
      "rowStatus-rejected"
    );
  }

  const val = select.value;

  if (val === "Verified") { select.classList.add("status-verified"); row?.classList.add("rowStatus-verified"); }
  else if (val === "Resubmit") { select.classList.add("status-resubmit"); row?.classList.add("rowStatus-resubmit"); }
  else if (val === "Escalate") { select.classList.add("status-escalate"); row?.classList.add("rowStatus-escalate"); }
  else if (val === "Rejected") { select.classList.add("status-rejected"); row?.classList.add("rowStatus-rejected"); }
  else { select.classList.add("status-inprogress"); row?.classList.add("rowStatus-pending"); }
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

    if (isFinalized) {
      startBtn.disabled = true;
      stopBtn.disabled = true;
    
      row.querySelectorAll("input, select").forEach(el => {
        el.disabled = true;
      });
    
      return;
    }

    if (isActive) {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      return;
    }

    if (activeCaseRow) {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      return;
    }

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
    history[dateKey] = { cases: [] };
  }

  if (Array.isArray(history[dateKey])) {
    history[dateKey] = { cases: history[dateKey] };
  }

  history[dateKey].cases.push({
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
  renderDashboard();
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

  startBtn.disabled = true;
  stopBtn.disabled = true;

  startBtn.classList.add("locked");
  stopBtn.classList.add("locked");

  row.classList.add("finished-row");

  row.querySelectorAll("input, select").forEach(el => {
    el.disabled = true;
  });

  deleteBtn.disabled = false;
}

/* =========================
   ADD ROW
========================= */
function addRow(save = true) {
  const table = document.getElementById("rows");
  const row = document.createElement("tr");

  row.innerHTML = `
    <td class="fieldCell uidCell">
      <label class="fieldLabel">UID</label>
      <input class="input uidInput" placeholder="UID">
    </td>

    <td class="fieldCell statusCell">
      <label class="fieldLabel">Status</label>
      <select class="statusSelect">
        <option>Pending</option>
        <option>Verified</option>
        <option>Resubmit</option>
        <option>Escalate</option>
        <option>Rejected</option>
      </select>
    </td>

    <td class="fieldCell locationCell">
      <label class="fieldLabel">Location</label>
      <select class="locationSelect">
        <option>ROW</option>
        <option>EU</option>
        <option>RFI-ROW</option>
        <option>RFI-EU</option>
      </select>
    </td>

    <td class="fieldCell issuingCell">
      <label class="fieldLabel">Issuing</label>
      <input class="input issuingInput" placeholder="Issuing">
    </td>

    <td class="fieldCell hitsCell">
      <label class="fieldLabel">Hits</label>
      <input class="hitsInput" type="text" placeholder="0" min="0">
    </td>

    <td class="fieldCell startTimeCell">
      <label class="fieldLabel">Start Time</label>
      <input class="startCell startInput" placeholder="--:--:--" readonly>
    </td>

    <td class="fieldCell endTimeCell">
      <label class="fieldLabel">End Time</label>
      <span class="endCell">--:--:--</span>
    </td>

    <td class="fieldCell actionsCell">
      <label class="fieldLabel">&nbsp;</label>
      <div class="actionBtns">
        <button class="startBtn" title="Start">▶</button>
        <button class="stopBtn" title="End">■</button>
        <button class="deleteBtn" title="Delete">✕</button>
      </div>
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

    const formattedVal = `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  
      const now = new Date();
      const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Dublin",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false
      });
      const p = {};
      fmt.formatToParts(now).forEach(({ type, value }) => p[type] = value);
  
      const dublinNowFake = new Date(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`).getTime();
      const targetFake = new Date(
        `${p.year}-${p.month}-${p.day}T${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}Z`
      ).getTime();
      const offsetMs = now.getTime() - dublinNowFake;
      const newTimestamp = targetFake + offsetMs;
  
      if (isNaN(newTimestamp)) { showToast("Invalid time", "error"); return; }
  
      startInput.value = formattedVal;
      row.dataset.startTimestamp = newTimestamp;
  
      if (activeCaseRow === row) {
        const elapsed = Math.floor((Date.now() - newTimestamp) / 1000);
        row.dataset.liveSeconds = elapsed;
        stopInterval(row);
        startLiveTimer(row);
        document.getElementById("activeCaseTime").textContent = formatTime(elapsed);
      }
  
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

updateStatusStyle(status);

status.addEventListener("change", () => {
  updateStatusStyle(status);
  saveState();
});

row.querySelector(".startBtn").onclick = () => {
  if (row.dataset.finalized === "true") return;

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

  openStatusModal((status) => {
    if (!status) return;

    const end = Date.now();

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

  row.querySelectorAll(".uidInput, .statusSelect, .locationSelect, .issuingInput, .hitsInput")
    .forEach(el => el.addEventListener("change", saveState));
}

function startCase(row) {
  if (row.classList.contains("locked-row")) return;

  row.classList.add("activeRow");

  row.querySelector(".startBtn").disabled = true;
}

function finishCase(row) {
  row.classList.add("locked-row");

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

  startTick();

const id = setInterval(startTick, 1000);
activeIntervals.set(row, id);

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

  const now = new Date();

const today = now.toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });

const dublinDateStr = `${today}T${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Dublin",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
  hour12: false
});

const parts = formatter.formatToParts(now);
const p = {};
parts.forEach(({ type, value }) => p[type] = value);

const dublinNowStr = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
const dublinNowMs = new Date(dublinNowStr).getTime();
const offsetMs = now.getTime() - dublinNowMs;

const newTimestamp = new Date(dublinDateStr).getTime() + offsetMs;

if (isNaN(newTimestamp)) {
  showToast("Invalid time", "error");
  return;
}

  row.dataset.startTimestamp = newTimestamp;

  if (activeCaseRow === row) {
    const elapsed = Math.floor((Date.now() - newTimestamp) / 1000);
    row.dataset.liveSeconds = elapsed;
    document.getElementById("activeCaseTime").textContent = formatTime(elapsed);
  }

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

  let liveTime = 0;
let caseCountForAht = completedCases;

if (activeCaseRow) {
  liveTime = Number(activeCaseRow.dataset.liveSeconds || 0);
  caseCountForAht += 1;
}

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
   VISIBILITY CHANGE
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

  const confirmClear = confirm(
    "⚠ Warning: This will permanently clear all cases.\n\nDo you want to continue?"
  );

  if (!confirmClear) {
    showToast("Clear cancelled", "error");
    return;
  }

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

  const start = (historyPage - 1) * HISTORY_PAGE_SIZE;
  const end = start + HISTORY_PAGE_SIZE;
  const pagedDates = dates.slice(start, end);

  document.getElementById("historyPageInfo").textContent =
    `${historyPage} / ${Math.ceil(dates.length / HISTORY_PAGE_SIZE)}`;

  const SHIFT_SECONDS = 8 * 60 * 60;

  pagedDates.forEach(dateKey => {
    const day = history[dateKey];
    let cases = day.cases || [];

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

  localStorage.removeItem(HISTORY_KEY);

  const container = document.getElementById("historyList");
  if (container) container.innerHTML = "";

  if (typeof dailyChart !== "undefined" && dailyChart) {
    dailyChart.destroy();
    dailyChart = null;
  }

  renderDashboard();

  showToast("All history cleared", "success");
}

/* =========================
   DASHBOARD (month/week filter)
========================= */
let dashMode = "month";

function getHistoryData() {
  return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {};
}

function parseDateKey(key) {
  return new Date(key + "T00:00:00Z");
}

function getMonthKey(dateKey) {
  return dateKey.slice(0, 7);
}

function monthLabel(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function getWeekInfo(dateObj) {
  const day = dateObj.getUTCDay();
  const diffToMonday = (day === 0 ? -6 : 1 - day);

  const monday = new Date(dateObj);
  monday.setUTCDate(dateObj.getUTCDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return { key: monday.toISOString().slice(0, 10), monday, sunday };
}

function fmtShortDate(d) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function weekLabel(monday, sunday) {
  return `${fmtShortDate(monday)} – ${fmtShortDate(sunday)}`;
}

function buildDashPeriods(mode) {
  const history = getHistoryData();
  const dateKeys = Object.keys(history)
    .filter(dk => (history[dk].cases || []).length > 0)
    .sort()
    .reverse();

  const seen = new Map();

  dateKeys.forEach(dk => {
    if (mode === "month") {
      const mk = getMonthKey(dk);
      if (!seen.has(mk)) seen.set(mk, monthLabel(mk));
    } else {
      const { key, monday, sunday } = getWeekInfo(parseDateKey(dk));
      if (!seen.has(key)) seen.set(key, weekLabel(monday, sunday));
    }
  });

  return Array.from(seen.entries()).map(([key, label]) => ({ key, label }));
}

function computeDashStats(mode, periodKey) {
  const history = getHistoryData();
  const SHIFT_SECONDS = 8 * 60 * 60;

  let totalCases = 0, totalHits = 0, totalTime = 0, daysCount = 0;

  Object.keys(history).forEach(dk => {
    const cases = history[dk].cases || [];
    if (cases.length === 0) return;

    const matches = mode === "month"
      ? getMonthKey(dk) === periodKey
      : getWeekInfo(parseDateKey(dk)).key === periodKey;

    if (!matches) return;

    daysCount++;
    cases.forEach(c => {
      totalCases++;
      totalHits += Number(c.hits || 0);
      totalTime += Number(c.time || 0);
    });
  });

  const aht = totalCases ? Math.floor(totalTime / totalCases) : 0;
  const util = daysCount ? (totalTime / (daysCount * SHIFT_SECONDS)) * 100 : 0;

  return { totalCases, totalHits, totalTime, aht, util };
}

function updateDashStats(periodKey) {
  const els = {
    cases: document.getElementById("dashCases"),
    hits: document.getElementById("dashHits"),
    time: document.getElementById("dashTime"),
    aht: document.getElementById("dashAht"),
    util: document.getElementById("dashUtil"),
    utilBar: document.getElementById("utilBarFill")
  };
  if (!els.cases) return;

  if (!periodKey) {
    els.cases.textContent = "0";
    els.hits.textContent = "0";
    els.time.textContent = "0:00:00";
    els.aht.textContent = "0:00:00";
    els.util.textContent = "0.00%";
    if (els.utilBar) els.utilBar.style.width = "0%";
    return;
  }

  const stats = computeDashStats(dashMode, periodKey);
  els.cases.textContent = stats.totalCases;
  els.hits.textContent = stats.totalHits;
  els.time.textContent = formatTime(stats.totalTime);
  els.aht.textContent = formatTime(stats.aht);
  els.util.textContent = stats.util.toFixed(2) + "%";
  if (els.utilBar) els.utilBar.style.width = Math.min(100, stats.util) + "%";
}

function renderDashboard() {
  const select = document.getElementById("dashPeriodSelect");
  if (!select) return;

  document.querySelectorAll(".dashModeBtn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === dashMode);
  });

  const prevValue = select.value;
  const periods = buildDashPeriods(dashMode);

  select.innerHTML = "";

  if (periods.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No data yet";
    select.appendChild(opt);
    updateDashStats(null);
    return;
  }

  periods.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.key;
    opt.textContent = p.label;
    select.appendChild(opt);
  });

  select.value = periods.some(p => p.key === prevValue) ? prevValue : periods[0].key;
  updateDashStats(select.value);
}

function setDashMode(mode) {
  dashMode = mode;
  renderDashboard();
}

function onDashPeriodChange() {
  const select = document.getElementById("dashPeriodSelect");
  updateDashStats(select ? select.value : null);
}

/* =========================
   BACKUP FOLDER
========================= */
const BACKUP_DB_NAME = "dispoBackupDB";
const BACKUP_STORE_NAME = "handles";
const BACKUP_DIR_KEY = "backupDir";

function openBackupDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BACKUP_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(BACKUP_STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveBackupDirHandle(handle) {
  const db = await openBackupDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BACKUP_STORE_NAME, "readwrite");
    tx.objectStore(BACKUP_STORE_NAME).put(handle, BACKUP_DIR_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getSavedBackupDirHandle() {
  const db = await openBackupDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BACKUP_STORE_NAME, "readonly");
    const req = tx.objectStore(BACKUP_STORE_NAME).get(BACKUP_DIR_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function ensureBackupDirPermission(handle) {
  const opts = { mode: "readwrite" };
  try {
    if ((await handle.queryPermission(opts)) === "granted") return true;
    if ((await handle.requestPermission(opts)) === "granted") return true;
  } catch (err) {}
  return false;
}

async function chooseBackupFolder() {
  if (!window.showDirectoryPicker) {
    showToast("Folder picker isn't supported in this browser — use Chrome or Edge", "error");
    return null;
  }

  try {
    const handle = await window.showDirectoryPicker();
    await saveBackupDirHandle(handle);
    showToast(`Backup folder set: ${handle.name}`, "success");
    return handle;
  } catch (err) {
    return null;
  }
}

async function getBackupFolder(promptIfMissing) {
  if (!window.showDirectoryPicker) return null;

  const saved = await getSavedBackupDirHandle().catch(() => null);
  if (saved && (await ensureBackupDirPermission(saved))) return saved;

  if (!promptIfMissing) return null;
  return await chooseBackupFolder();
}

function downloadJSON(json, filename) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
  showToast("Backup downloaded", "success");
}

/* =========================
   BACKUP — export / import
========================= */
async function exportBackup() {
  const data = {
    exportedAt: new Date().toISOString(),
    productivityState: localStorage.getItem(STORAGE_KEY),
    productivityHistory: localStorage.getItem(HISTORY_KEY),
    shiftStartTime: localStorage.getItem("shiftStartTime_v2")
  };

  const json = JSON.stringify(data, null, 2);
  const filename = `dispo-productivity-backup-${new Date().toISOString().slice(0, 10)}.json`;

  const dirHandle = await getBackupFolder(true);

  if (dirHandle) {
    try {
      const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(json);
      await writable.close();
      showToast(`Backup saved to "${dirHandle.name}": ${filename}`, "success");
      return;
    } catch (err) {
      console.error(err);
      showToast("Couldn't save to folder — downloading instead", "error");
    }
  }

  downloadJSON(json, filename);
}

function triggerImportBackup() {
  document.getElementById("importBackupInput").click();
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    let data;
    try {
      data = JSON.parse(e.target.result);
    } catch (err) {
      showToast("Invalid backup file", "error");
      return;
    }

    if (!data.productivityState && !data.productivityHistory) {
      showToast("Backup file has no recognizable data", "error");
      return;
    }

    const confirmImport = confirm(
      "⚠ This will overwrite your current cases, history, and shift state with this backup.\n\nContinue?"
    );
    if (!confirmImport) {
      showToast("Import cancelled", "error");
      return;
    }

    if (data.productivityState) {
      localStorage.setItem(STORAGE_KEY, data.productivityState);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }

    if (data.productivityHistory) {
      localStorage.setItem(HISTORY_KEY, data.productivityHistory);
    }

    if (data.shiftStartTime) {
      localStorage.setItem("shiftStartTime_v2", data.shiftStartTime);
    } else {
      localStorage.removeItem("shiftStartTime_v2");
    }

    showToast("Backup restored — reloading...", "success");
    setTimeout(() => location.reload(), 900);
  };

  reader.onerror = () => showToast("Could not read backup file", "error");
  reader.readAsText(file);

  event.target.value = "";
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

/* =========================
   PRINT — all cases for the currently selected week/month
========================= */
function printSelectedPeriod() {
  const select = document.getElementById("dashPeriodSelect");
  if (!select || !select.value) {
    showToast("No data to print for this period", "error");
    return;
  }

  const periodKey = select.value;
  const periodLabel = select.options[select.selectedIndex].textContent;
  const history = getHistoryData();

  const dateKeys = Object.keys(history).sort();
  const rowsHtml = [];
  let totalCases = 0, totalHits = 0, totalTime = 0;

  dateKeys.forEach(dk => {
    const cases = history[dk].cases || [];
    if (cases.length === 0) return;

    const matches = dashMode === "month"
      ? getMonthKey(dk) === periodKey
      : getWeekInfo(parseDateKey(dk)).key === periodKey;

    if (!matches) return;

    cases.forEach(c => {
      totalCases++;
      totalHits += Number(c.hits || 0);
      totalTime += Number(c.time || 0);

      rowsHtml.push(`
        <tr>
          <td>${dk}</td>
          <td>${escapeHtml(c.uid)}</td>
          <td>${escapeHtml(c.status)}</td>
          <td>${escapeHtml(c.location)}</td>
          <td>${escapeHtml(c.issuing)}</td>
          <td>${c.hits}</td>
          <td>${formatTime(c.time)}</td>
        </tr>
      `);
    });
  });

  if (rowsHtml.length === 0) {
    showToast("No cases found for this period", "error");
    return;
  }

  const aht = totalCases ? Math.floor(totalTime / totalCases) : 0;

  const printArea = document.getElementById("printArea");
  printArea.innerHTML = `
    <h2>dispo+ Productivity Report</h2>
    <p>
      Period: ${escapeHtml(periodLabel)} (${dashMode === "month" ? "Monthly" : "Weekly"}) &nbsp;·&nbsp;
      Total Cases: ${totalCases} &nbsp;·&nbsp;
      Total Hits: ${totalHits} &nbsp;·&nbsp;
      Total Time: ${formatTime(totalTime)} &nbsp;·&nbsp;
      AHT: ${formatTime(aht)}
    </p>
    <table>
      <thead>
        <tr>
          <th>Date</th><th>UID</th><th>Status</th><th>Location</th><th>Issuing</th><th>Hits</th><th>Time</th>
        </tr>
      </thead>
      <tbody>${rowsHtml.join("")}</tbody>
    </table>
  `;

  window.print();
}

/* =========================
   AUTOSAVE — continuous background protection
   Every 10s: rotating localStorage snapshot of the live case queue +
   shift state (survives even if STORAGE_KEY itself gets cleared).
   Every 60s: if a backup folder is set, silently overwrites one fixed
   file there too — no prompts.
   On load: if live data is missing but a recent autosave exists,
   shows a recovery banner offering one-click restore.
========================= */
const AUTOSNAP_KEY = "dispo_productivity_autosnap";
const AUTOSNAP_MAX = 8;
const AUTOSNAP_INTERVAL_MS = 10000;
const AUTOSNAP_FOLDER_INTERVAL_MS = 60000;

let lastAutosnapSignature = "";

function currentSessionPayload() {
  return {
    savedAt: new Date().toISOString(),
    productivityState: localStorage.getItem(STORAGE_KEY),
    shiftStartTime: localStorage.getItem("shiftStartTime_v2")
  };
}

function takeAutoSnapshot() {
  const payload = currentSessionPayload();
  const signature = payload.productivityState + "|" + payload.shiftStartTime;

  if (signature === lastAutosnapSignature) return;
  lastAutosnapSignature = signature;

  if (!payload.productivityState) return;

  let snaps = [];
  try {
    snaps = JSON.parse(localStorage.getItem(AUTOSNAP_KEY)) || [];
  } catch (e) {
    snaps = [];
  }

  snaps.unshift(payload);
  if (snaps.length > AUTOSNAP_MAX) snaps = snaps.slice(0, AUTOSNAP_MAX);

  try {
    localStorage.setItem(AUTOSNAP_KEY, JSON.stringify(snaps));
    updateAutosaveIndicator(payload.savedAt);
  } catch (e) {
    console.error("dispo+ autosave failed:", e);
  }
}

async function writeAutoSnapshotToFolder() {
  const dirHandle = await getBackupFolder(false);
  if (!dirHandle) return;

  const payload = currentSessionPayload();
  if (!payload.productivityState) return;

  try {
    const fileHandle = await dirHandle.getFileHandle("dispo-productivity-autosave.json", { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(payload, null, 2));
    await writable.close();
  } catch (err) {
    console.error("dispo+ folder autosave failed:", err);
  }
}

function updateAutosaveIndicator(isoTime) {
  const el = document.getElementById("autosaveStatus");
  if (!el) return;
  const t = new Date(isoTime);
  el.textContent = `Autosaved ${t.toLocaleTimeString()}`;
}

function restoreLastAutosave() {
  let snaps = [];
  try {
    snaps = JSON.parse(localStorage.getItem(AUTOSNAP_KEY)) || [];
  } catch (e) {
    snaps = [];
  }

  if (snaps.length === 0) {
    showToast("No autosave available", "error");
    return;
  }

  const latest = snaps[0];
  const confirmRestore = confirm(
    `Restore autosave from ${new Date(latest.savedAt).toLocaleString()}?\n\nThis will replace your current case queue and shift state.`
  );
  if (!confirmRestore) return;

  if (latest.productivityState) {
    localStorage.setItem(STORAGE_KEY, latest.productivityState);
  }
  if (latest.shiftStartTime) {
    localStorage.setItem("shiftStartTime_v2", latest.shiftStartTime);
  } else {
    localStorage.removeItem("shiftStartTime_v2");
  }

  showToast("Autosave restored — reloading...", "success");
  setTimeout(() => location.reload(), 700);
}

function dismissRecoveryBanner() {
  const banner = document.getElementById("recoveryBanner");
  if (banner) banner.style.display = "none";
}

function checkForMissingDataOnLoad() {
  const liveState = localStorage.getItem(STORAGE_KEY);
  if (liveState) return;

  let snaps = [];
  try {
    snaps = JSON.parse(localStorage.getItem(AUTOSNAP_KEY)) || [];
  } catch (e) {
    snaps = [];
  }
  if (snaps.length === 0) return;

  const latest = snaps[0];
  const banner = document.getElementById("recoveryBanner");
  const msg = document.getElementById("recoveryBannerMsg");
  if (banner && msg) {
    msg.textContent = `Your current case data looks empty, but an autosave from ${new Date(latest.savedAt).toLocaleString()} is available.`;
    banner.style.display = "flex";
  }
}

function initAutoSave() {
  takeAutoSnapshot();
  checkForMissingDataOnLoad();
  setInterval(takeAutoSnapshot, AUTOSNAP_INTERVAL_MS);
  setInterval(writeAutoSnapshotToFolder, AUTOSNAP_FOLDER_INTERVAL_MS);
}

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {

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
updateLiveStatus();
renderHistory();
renderDashboard();
initAutoSave();
setInterval(saveState, 1000);
});