const STORAGE_KEY = "templateState_v1";

function saveState() {
  const state = {
    inputs: {},
    radios: {},
    fillers: selectedFillers
  };

  // save inputs + textarea
  document.querySelectorAll("input, textarea").forEach(el => {
    if (el.type === "radio") {
      if (el.checked) state.radios[el.name] = el.value;
    } else if (el.id) {
      state.inputs[el.id] = el.value;
    }
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (!saved) return;

  // restore inputs
  Object.entries(saved.inputs || {}).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });

  // restore radios
  Object.entries(saved.radios || {}).forEach(([name, value]) => {
    const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (el) el.checked = true;
  });

  // restore fillers array
  if (Array.isArray(saved.fillers)) {
    selectedFillers.length = 0;
    selectedFillers.push(...saved.fillers);
  }

  // ✅ FIX: sync filler UI buttons
  document.querySelectorAll("#pmFillers .selectBtn").forEach(btn => {
    btn.classList.toggle("active", selectedFillers.includes(btn.textContent));
  });
}

// ── TIME BAR ──
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

(function highlightActiveTab() {
  const current = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".tab-item").forEach(tab => {
    if (tab.dataset.page === current) {
      tab.classList.add("active");
    }
  });
})();

// ── NAVBAR ACTIVE LINK ──
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  generateTemplate();

  const currentPage = window.location.pathname.split("/").pop();
  document.querySelectorAll(".navbar a").forEach(link => {
    const href = link.getAttribute("href");
    if (href === currentPage || (currentPage === "" && href === "index.html")) {
      link.classList.add("active");
    }
  });
});

// ── GENERATE TEMPLATE ──
function generateTemplate() {
  const offense = document.getElementById("offenseDesc")?.value.trim() || "";
  const lines = [];

  lines.push("Potential Match");

    // Risk Rating at top
  const riskRating = getRiskRating();
  if (riskRating) lines.push(`Risk Rating: ${riskRating}\n`);

  addMatch(lines, "nameMatch", "Name", "nameValue");
  addMatch(lines, "genderMatch", "Gender", "genderValue");
  addMatch(lines, "citizenshipMatch", "Citizenship", "citizenshipValue");
  addMatch(lines, "residencyMatch", "Residency", "residencyValue");

  if (offense) {
    lines.push("\n" + offense);
  }

  if (selectedFillers.length === 0) {
    lines.push(
      "\nThere is no additional factor found to close the hit, therefore escalating the case as a potential match."
    );
  } else {
    selectedFillers.forEach(filler => {
      switch (filler) {
        case "Juvenile":
          lines.push(
            "\nThere is no additional factor found to close the hit other than the report relates to an offence committed when the subject was a minor (under 18) therefore escalating the case as a potential match."
          );
          break;

        case "Residency Mismatch":
          lines.push(
            "\nThere is no additional factor found to close the hit other than the hit and user have different residency therefore escalating the case as a potential match."
          );
          break;

        case "Maximum Penalty":
          lines.push(
            "\nThere is no additional factor found to close the hit other than maximum sentence of the offence therefore escalating the case as a potential match."
          );
          break;
      }
    });
  }

  const output = document.getElementById("output");

  // show placeholder only if absolutely nothing exists
if (
  lines.length === 1 &&
  lines[0] === "Potential Match"
) {
  output.textContent = "Template will appear here.";
  output.classList.remove("has-content");
  return;
}

output.textContent = lines.join("\n");
output.classList.add("has-content");
}

// ── ADD MATCH FACTOR ──
function addMatch(lines, radioName, label, valueId) {
  const selected = document.querySelector(`input[name="${radioName}"]:checked`);
  if (!selected) return;

  const value = document.getElementById(valueId)?.value.trim();
  if (!value) return;

  if (selected.value === "match") {
    lines.push(`${label} match (${value})`);
  }
}

// ── FILLERS ──
const fillers = ["Maximum Penalty", "Juvenile", "Residency Mismatch"];
const selectedFillers = [];
const fillerGrid = document.getElementById("pmFillers");

fillers.forEach(filler => {
  const btn = document.createElement("button");
  btn.className = "selectBtn";
  btn.textContent = filler;

  btn.onclick = () => {
    const isActive = btn.classList.contains("active");

    // ── IF CLICKED AGAIN → UNSELECT ──
    if (isActive) {
      btn.classList.remove("active");
      selectedFillers.length = 0;

      saveState();
      generateTemplate();
      return;
    }

    // ── OTHERWISE: SINGLE SELECT ──
    document.querySelectorAll("#pmFillers .selectBtn")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");

    selectedFillers.length = 0;
    selectedFillers.push(filler);

    saveState();
    generateTemplate();
  };

  fillerGrid.appendChild(btn);
});

// ── RISK RATING ──
function getRiskRating() {
  const selected = document.querySelector('input[name="riskRating"]:checked');
  return selected ? selected.value : "";
}

// ── AUTO UPDATE ──
[
  "nameValue",
  "genderValue",
  "residencyValue",
  "citizenshipValue",
  "offenseDesc"
].forEach(id => {
  const el = document.getElementById(id);

  if (el) {
    el.addEventListener("input", function () {
      autoCapitalize(this);
      generateTemplate();
    });
  }
});

document.querySelectorAll('input[type="radio"]').forEach(radio => {
  radio.addEventListener('click', function(e) {
    const name = this.name;

    // if this radio is already checked, uncheck it
    if (this.dataset.wasChecked === 'true') {
      this.checked = false;
      this.dataset.wasChecked = 'false';
    } else {
      // uncheck all radios with the same name first
      document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
        r.dataset.wasChecked = 'false';
      });
      this.dataset.wasChecked = 'true';
    }

    generateTemplate();
    saveState();
  });
});

// ── COPY OUTPUT ──
function copyText() {
  const output = document.getElementById("output");

  navigator.clipboard.writeText(output.innerText);

  const hint = document.getElementById("copyHint");

  hint.classList.add("copied-flash");

  hint.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
    copied
  `;

  setTimeout(() => {
    hint.classList.remove("copied-flash");

    hint.innerHTML = `
      <svg viewBox="0 0 24 24">
        <rect x="9" y="9" width="13" height="13" rx="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
      click to copy
    `;
  }, 1200);
}

function autoCapitalize(el) {
  const start = el.selectionStart;
  const end = el.selectionEnd;

  el.value = el.value
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());

  el.setSelectionRange(start, end);
}

// ── CLEAR STATE ──
function clearState() {
  localStorage.removeItem(STORAGE_KEY);

  // ── RESET INPUTS ──
  document.querySelectorAll("input, textarea").forEach(el => {
    if (el.type === "radio") {
      el.checked = false;
      el.dataset.wasChecked = "false";
    } else {
      el.value = "";
    }
  });

  // ── RESET FILLERS ──
  selectedFillers.length = 0;
  document.querySelectorAll("#pmFillers .selectBtn").forEach(btn => {
    btn.classList.remove("active");
  });

  // ── RESET OUTPUT ──
  const output = document.getElementById("output");
  if (output) {
    output.textContent = "Template will appear here.";
    output.classList.remove("has-content");
  }

  generateTemplate();
}

// ── SAVE / CHANGE LISTENERS ──
document.addEventListener("input", () => {
  generateTemplate();
  saveState();
});

document.addEventListener("change", () => {
  generateTemplate();
  saveState();
});


document.getElementById("clearAll").addEventListener("click", clearState);

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

window.addEventListener("beforeunload", () => {
  localStorage.setItem("scrollPos:" + location.pathname, window.scrollY);
});

window.addEventListener("load", () => {
  const saved = localStorage.getItem("scrollPos:" + location.pathname);
  if (saved !== null) {
    window.scrollTo(0, parseInt(saved, 10));
  }
});