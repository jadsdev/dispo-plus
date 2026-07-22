const STORAGE_KEY = "remissionApp_v1";

/* =========================
   TIME BAR
========================= */
function updateTime() {
  const now = new Date();

  const date = now.toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
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

  const dub = now.toLocaleTimeString("en-IE", {
    timeZone: "Europe/Dublin",
    hour12: false
  });

  const bar = document.getElementById("timeBar");
  if (bar) bar.textContent = `${date} | PHT: ${pht} | Dublin: ${dub}`;
}

updateTime();
setInterval(updateTime, 1000);

(function highlightActiveTab() {
  const current = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".tab-item").forEach(tab => {
    if (tab.dataset.page === current) {
      tab.classList.add("active");
    }
  });
})();

/* =========================
   PAGE NAV
========================= */
const pages = [
  "productivity.html",
  "maxpenalty.html",
  "common-name.html",
  "potential-match.html",
  "remission.html",
  "playbook.html",
  "jpgpdf.html"
];

const current = pages.indexOf("remission.html");

function goPrev() {
  if (current > 0) location.href = pages[current - 1];
}

function goNext() {
  if (current < pages.length - 1) location.href = pages[current + 1];
}

/* =========================
   DATA
========================= */
const jurisdictionData = {
  "Albania (5-25 years)": 0.25,
  "Albania (Less than 5 years)": 0.3333,
  "Argentina": 0.3333,
  "Bangladesh": 0.3333,
  "Botswana": 0.3333,
  "Brazil": 0.3333,
  "China": 0.50,
  "Cote D'Ivoire": 0.3333,
  "El Salvador": 0.3333,
  "Fiji": 0.00,
  "France": 0.50,
  "Germany": 0.3333,
  "Ghana": 0.3333,
  "India": 0.50,
  "Indonesia": 0.3333,
  "Israel": 0.3333,
  "Italy": 0.25,
  "Japan": 0.00,
  "Kenya": 0.3333,
  "Kiribati": 0.3333,
  "Malaysia": 0.3333,
  "Moldova": 0.50,
  "Morocco": 0.50,
  "Myanmar": 0.1667,
  "Nepal": 0.50,
  "Nigeria": 0.3333,
  "Pakistan": 0.3333,
  "Papua New Guinea": 0.3333,
  "Philippines": 0.00,
  "Romania (10 years and above)": 0.3333,
  "Romania (less than 10 years)": 0.50,
  "S.Korea": 0.3333,
  "Seychelles": 0.3333,
  "Singapore": 0.3333,
  "Turkey": 0.3333,
  "UK - Other Crimes": 0.50,
  "UK - Violent Crimes": 0.3333,
  "Ukraine (Severe Crimes)": 0.3333,
  "Ukraine (Average Crimes)": 0.50,
  "USA": 0.15,
  "Vietnam": 0.3333,
  "Russia": 0.3333,
  "Lebanon": 0.3333,
  "Cyprus": 0.3333,
  "Guinea": 0.3333,
  "Burkina Faso (6 months and above)": 0.50,
  "Tasmania, AUS": 0.3333,
  "NSW/Queensland/Victoria/S. & W. Australia, AUS": 0.00,
  "Syria": 0.3333,
  "Senegal": 0.50,
  "Afghanistan": 0.00,
  "Taiwan": 0.3333,
  "Iran (less than 10 years)": 0.3333,
  "Iran (More than 10 years)": 0.50,
  "Azerbaijan (Severe Crimes)": 0.3333,
  "Azerbaijan (Average Crimes)": 0.50,
  "Kuwait": 0.3333,
  "Serbia": 0.3333,
  "New Zealand (below 2 years)": 0.50,
  "New Zealand (above 2 years)": 0.3333,
  "Kazakhstan (Average Crime)": 0.6666,
  "Kazakhstan (Grievous Crime)": 0.3333
};

/* =========================
   ELEMENTS (DECLARED EARLY)
========================= */
let jurisdictionSelect,
  sentenceMonthsInput,
  sentenceYearsInput,
  totalMonthsInput,
  startInput,
  idIssueInput,
  releaseOutput,
  statusBox,
  summaryBox,
  offense,
  sentenceYears,
  sentenceMonths,
  startDate,
  templateOutput,
  templateOutputCard;

/* =========================
   INIT
========================= */
function initRemissionApp() {
  jurisdictionSelect = document.getElementById("jurisdiction");
  sentenceMonthsInput = document.getElementById("sentenceMonths");
  sentenceYearsInput = document.getElementById("sentenceYears");
  totalMonthsInput = document.getElementById("totalMonths");
  startInput = document.getElementById("startDate");
  releaseOutput = document.getElementById("releaseDate");
  statusBox = document.getElementById("status");
  summaryBox = document.getElementById("summary");
  idIssueInput = document.getElementById("idIssueDate");

  offense = document.getElementById("offense");
  sentenceYears = document.getElementById("sentenceYears");
  sentenceMonths = document.getElementById("sentenceMonths");
  startDate = document.getElementById("startDate");
  templateOutput = document.getElementById("templateOutput");
  templateOutputCard = document.getElementById("templateOutputCard");

  /* populate dropdown */
  Object.keys(jurisdictionData).forEach(country => {
    const opt = document.createElement("option");
    opt.value = country;
    opt.textContent = country;
    jurisdictionSelect.appendChild(opt);
  });

  bindEvents();
  loadState();
}

/* =========================
   YEARS / MONTHS — additive, whole numbers only
   Years and Months are independent components of one sentence
   length (e.g. 8 yrs + 7 mos), not alternate representations of
   the same value. Total Months is the read-only derived sum that
   calculate() and the templates use.
========================= */
function sanitizeWholeNumber(input, max) {
  let digits = input.value.replace(/[^\d]/g, ""); // strip everything non-digit, including "."
  if (digits !== "") {
    let n = parseInt(digits, 10);
    if (max !== undefined && n > max) n = max;
    digits = String(n);
  }
  input.value = digits;
}

function updateTotalMonths() {
  const years = parseInt(sentenceYearsInput.value, 10) || 0;
  const months = parseInt(sentenceMonthsInput.value, 10) || 0;
  const total = years * 12 + months;
  totalMonthsInput.value = total || "";
  return total;
}

/* =========================
   EVENTS
========================= */
function bindEvents() {
  sentenceYearsInput.addEventListener("input", () => {
    sanitizeWholeNumber(sentenceYearsInput);
    updateTotalMonths();
    calculate();
    saveState();
  });

  sentenceMonthsInput.addEventListener("input", () => {
    sanitizeWholeNumber(sentenceMonthsInput, 11); // months component can't exceed 11
    updateTotalMonths();
    calculate();
    saveState();
  });

  [startInput, idIssueInput].forEach(el => {
    el.addEventListener("input", () => {
      validateDMYDate(el);
      calculate();
      saveState();
    });
  });

  jurisdictionSelect.addEventListener("input", () => {
    calculate();
    saveState();
  });

  offense.addEventListener("input", () => {
    generateTemplate();
    saveState();
  });

  templateOutput.addEventListener("click", () => copyTemplate(templateOutput, "copyHintToday"));
  templateOutputCard.addEventListener("click", () => copyTemplate(templateOutputCard, "copyHintCard"));

  const clearAllBtn = document.getElementById("clearAllBtn");
  if (clearAllBtn) clearAllBtn.addEventListener("click", clearAllFields);
}

/* =========================
   CLEAR ALL FIELDS
========================= */
function clearAllFields() {
  jurisdictionSelect.value = "";
  sentenceYearsInput.value = "";
  sentenceMonthsInput.value = "";
  totalMonthsInput.value = "";
  offense.value = "";
  startInput.value = "";
  idIssueInput.value = "";
  releaseOutput.value = "";

  summaryBox.innerHTML = "";

  templateOutput.textContent = "Template will appear here.";
  templateOutputCard.textContent = "Template will appear here.";

  localStorage.removeItem(STORAGE_KEY);

  updateTemplateValidity();

  if (typeof showToast === "function") {
    showToast("Fields cleared");
  }
}

/* =========================
   CALCULATE
========================= */
function calculate() {
  const country = jurisdictionSelect.value;
  const remission = jurisdictionData[country];

  const totalMonths = parseInt(totalMonthsInput.value, 10) || 0;

  const start = toDateOnly(startInput.value);

  // Stop calculation if date is incomplete
  if (
    !totalMonths ||
    !start ||
    remission === undefined
  ) {
    releaseOutput.value = "";
    summaryBox.innerHTML = "";
    generateTemplate();
    updateTemplateValidity();
    return;
  }

  const effectiveMonths = Math.round(totalMonths * (1 - remission));

  const release = new Date(start);
  release.setMonth(release.getMonth() + effectiveMonths);

  releaseOutput.value = formatDMY(release);

  summaryBox.innerHTML = `
    Sentence: ${totalMonths} months<br>
    Sentence (Years): ${(totalMonths / 12).toFixed(2)} years<br>
    Effective Sentence: ${effectiveMonths} months<br>
    Release Date: ${release.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })}
  `;

  generateTemplate();
  updateTemplateValidity();
}

function toDateOnly(dateStr) {
  if (!dateStr || !dateStr.includes("/")) return null;

  const parts = dateStr.split("/");

  if (parts.length !== 3) return null;

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);

  if (
    !day ||
    !month ||
    !year ||
    year.toString().length !== 4
  ) {
    return null;
  }

  const d = new Date(year, month - 1, day);

  // Prevent invalid dates like 32/13/2026
  if (
    d.getDate() !== day ||
    d.getMonth() !== month - 1 ||
    d.getFullYear() !== year
  ) {
    return null;
  }

  d.setHours(0,0,0,0);

  return d;
}

function updateTemplateValidity() {
  const hintToday = document.getElementById("copyHintToday");
  const hintCard = document.getElementById("copyHintCard");

  // ── Neutral state: nothing entered yet ──
  if (!totalMonthsInput.value || !startDate.value) {
    templateOutput.classList.remove("valid", "invalid");
    templateOutput.classList.add("neutral");
    if (hintToday) hintToday.classList.add("disabled");

    templateOutputCard.classList.remove("valid", "invalid");
    templateOutputCard.classList.add("neutral");
    if (hintCard) hintCard.classList.add("disabled");

    statusBox.classList.remove("success", "error", "neutral");
    statusBox.classList.add("neutral");
    setStatusTyping("Enter sentence details to begin.");
    return;
  }

  const release = toDateOnly(releaseOutput.value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = toDateOnly(startInput.value);
  const idDate = toDateOnly(idIssueInput.value);

  // ── Jail Term (Date Today) validity ──
  const todayValid = release && today && release > today;

  templateOutput.classList.remove("valid", "invalid", "neutral");
  templateOutput.classList.add(todayValid ? "valid" : "invalid");
  if (hintToday) hintToday.classList.toggle("disabled", !todayValid);

  // ID Issuing Date is independent from Sentence Start Date
  const cardValid = release && idDate && release > idDate;

  templateOutputCard.classList.remove("valid", "invalid", "neutral");
  templateOutputCard.classList.add(cardValid ? "valid" : "invalid");
  if (hintCard) hintCard.classList.toggle("disabled", !cardValid);

  // ── STATUS ──
  statusBox.classList.remove("success", "error", "neutral");

  const missing = [];
  if (!jurisdictionSelect.value) missing.push("Jurisdiction");
  if (!idIssueInput.value) missing.push("ID Issuing Date");

  if (missing.length) {
    statusBox.classList.add("error");
    setStatusTyping(`Missing required field(s): ${missing.join(", ")}.`);
    return;
  }

  if (!release) {
    statusBox.classList.add("error");
    setStatusTyping("Unable to calculate release date — check sentence and start date inputs.");
    return;
  }

  if (todayValid && cardValid) {
    statusBox.classList.add("success");
    setStatusTyping("Both templates apply — hit is still in prison today and was in prison at ID issuance.");
  } else if (todayValid && !cardValid) {
    statusBox.classList.add("success");
    setStatusTyping("Only Jail Term (Date Today) applies — hit was already released by the ID issuing date.");
  } else if (!todayValid && cardValid) {
    statusBox.classList.add("success");
    setStatusTyping("Only Jail Term (Card Issuing Date) applies — hit has since been released.");
  } else {
    statusBox.classList.add("error");
    setStatusTyping("Neither template applies — hit was already released before both reference dates.");
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "[Sentence start date]";

  const d = toDateOnly(dateStr);

  if (!d) return "[Invalid start date]";

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function formatReleaseDate(dateStr) {
  if (!dateStr) return "[Release Date]";

  const d = toDateOnly(dateStr);

  if (!d) return "[Invalid release date]";

  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric"
  });
}

function formatDMY(date) {
  if (!date) return "";

  const d = new Date(date);

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

function limitYearInput(input) {
  if (!input.value) return;

  // Remove anything except numbers and /
  input.value = input.value.replace(/[^\d/]/g, "");

  const parts = input.value.split("/");

  if (parts[2]) {
    parts[2] = parts[2].slice(0, 4); // max 4 digit year
  }

  input.value = parts.join("/");
}

function validateDMYDate(input) {
  let value = input.value.replace(/\D/g, ""); // numbers only

  // Limit to DDMMYYYY (8 digits)
  value = value.slice(0, 8);

  // Automatically add /
  if (value.length > 4) {
    value = value.slice(0, 2) + "/" + value.slice(2, 4) + "/" + value.slice(4);
  } 
  else if (value.length > 2) {
    value = value.slice(0, 2) + "/" + value.slice(2);
  }

  input.value = value;
}

/* =========================
   TEMPLATE
========================= */
function generateTemplate() {
  if (!totalMonthsInput.value || !startDate.value) {
    templateOutput.textContent = "Template will appear here.";
    templateOutputCard.textContent = "Template will appear here.";
    return;
  }

  const months = totalMonthsInput.value || "XX";
  const off = offense.value || "[offense]";
  const start = formatDate(startDate.value);
  const release = releaseOutput.value
    ? formatReleaseDate(releaseOutput.value)
    : "[Release Date based on remission calculator]";

  const country = jurisdictionSelect.value || "[jurisdiction]";
  const remission = jurisdictionData[country];
  const remissionPct = remission !== undefined
    ? (remission * 100).toFixed(2) + "%"
    : "[remission %]";

  templateOutput.textContent =
`Jail Term Mismatch. Per CMS, hit was sentenced to ${months} month(s) imprisonment for ${off} in ${start}. Hit is eligible for release on ${release} applying the remission period of ${remissionPct} remission percentage of the total sentence. The subject is likely to still be in prison therefore highly unlikely to have access to TikTok through a personal device, hence concluding hit as false positive.`;

  templateOutputCard.textContent =
`Jail term mismatch. Per CMS, hit was sentenced to ${months} month(s) imprisonment for ${off} starting ${start}. Hit is eligible for release on ${release} applying the remission period of ${remissionPct} of the total sentence. As it is unlikely for the hit to have been able to renew their ID during imprisonment, this hit is a false positive.`;
}

/* =========================
   COPY
========================= */
function copyTemplate(sourceEl, hintId) {
  const text = sourceEl.innerText;
  if (!text || text === "Template will appear here.") return;

  if (sourceEl.classList.contains("invalid")) {
    if (typeof showToast === "function") {
      showToast("This template's conditions aren't met yet");
    }
    return;
  }

  navigator.clipboard.writeText(text);

  const hint = document.getElementById(hintId);
  if (!hint) return;

  const svg = hint.querySelector("svg");

  hint.innerHTML = "";
  hint.appendChild(svg);
  hint.appendChild(document.createTextNode(" copied!"));
  hint.style.color = "var(--accent)";

  clearTimeout(hint._resetTimer);
  hint._resetTimer = setTimeout(() => {
    hint.innerHTML = "";
    hint.appendChild(svg);
    hint.appendChild(document.createTextNode(" click to copy"));
    hint.style.color = "";
  }, 1200);

  if (typeof showToast === "function") {
    showToast("Copied template");
  }
}

/* =========================
   STATUS
========================= */
function setStatusTyping(text, delay = 800) {
  const el = statusBox;

  if (!el) return;

  el.classList.remove("typing", "has-content");
  el.classList.add("loading");

  el.textContent = "Processing...";

  setTimeout(() => {
    el.classList.remove("loading");
    el.classList.add("typing");

    el.textContent = "";

    const words = text.split(" ");
    let i = 0;

    const interval = setInterval(() => {
      el.textContent = words.slice(0, i + 1).join(" ");
      i++;

      if (i >= words.length) {
        clearInterval(interval);
        el.classList.remove("typing");
        el.classList.add("has-content");
      }
    }, 60);
  }, delay);
}

/* =========================
   SAVE / LOAD
========================= */
function saveState() {
  const state = {
    jurisdiction: jurisdictionSelect.value,
    years: sentenceYearsInput.value,
    months: sentenceMonthsInput.value,
    startDate: startInput.value,
    idIssueDate: idIssueInput.value,
    offense: offense.value,
    releaseDate: releaseOutput.value,
    summaryHTML: summaryBox.innerHTML,
    template: templateOutput.textContent,
    templateCard: templateOutputCard.textContent,
    statusText: statusBox.textContent,
    statusClass: statusBox.className
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  const state = JSON.parse(saved);

  jurisdictionSelect.value = state.jurisdiction || "";
  sentenceYearsInput.value = state.years || "";
  sentenceMonthsInput.value = state.months || "";
  startInput.value = state.startDate || "";
  idIssueInput.value = state.idIssueDate || "";
  offense.value = state.offense || "";

  updateTotalMonths();

  requestAnimationFrame(() => {
    calculate();
    generateTemplate();
    updateTemplateValidity();
  });
}

/* =========================
   START
========================= */
document.addEventListener("DOMContentLoaded", initRemissionApp);