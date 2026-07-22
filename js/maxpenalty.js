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

function saveState(){
  localStorage.setItem("dispoState", JSON.stringify(selected));
}

function capitalizeWords(text) {
  return text.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

function normalizeFillerValue(value) {
  // Only strip the specific "(PAKISTAN ONLY)" annotation — other
  // parenthetical suffixes (e.g. "(Birthdate to Issuing Date)") are
  // meaningful and must stay so each filler keeps a distinct key.
  return String(value || "")
    .replace(/\s*\(PAKISTAN ONLY\)\s*$/i, "")
    .trim()
    .toUpperCase();
}

const dropdownFieldConfig = {
  country: {
    label: "User jurisdiction",
    invalidMessage: "The entered country is not available. Please input a valid country.",
    list: jurisdictionList,
    key: "country"
  },
  hitCountry: {
    label: "Hit jurisdiction",
    invalidMessage: "The entered country is not available. Please input a valid country.",
    list: jurisdictionList,
    key: "hitCountry"
  },
  citizenship: {
    label: "User citizenship",
    invalidMessage: "The entered citizenship is not available. Please input a valid citizenship.",
    list: citizenshipList,
    key: "citizenship"
  },
  hitCitizenship: {
    label: "Hit citizenship",
    invalidMessage: "The entered citizenship is not available. Please input a valid citizenship.",
    list: citizenshipList,
    key: "hitCitizenship"
  }
};

let toastTimer;

function findDropdownMatch(value, dataList) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  return dataList.find(item => item.toLowerCase() === normalized) || "";
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast show ${type}`;

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

function setDropdownFieldError(input, hasError) {
  input.classList.toggle("input-error", hasError);
  input.setAttribute("aria-invalid", hasError ? "true" : "false");
}

function validateDropdownField(input, { showMessage = false, focusInvalid = false, clearInvalid = false } = {}) {
  if (!input || !dropdownFieldConfig[input.id]) return true;
  const config = dropdownFieldConfig[input.id];
  const value = input.value.trim();
  const shouldMarkInvalid = showMessage || focusInvalid || input.classList.contains("input-error");

  if (!value) {
    selected[config.key] = "";
    setDropdownFieldError(input, false);
    return true;
  }

  const match = findDropdownMatch(value, config.list);
  if (match) {
    input.value = match;
    selected[config.key] = match;
    setDropdownFieldError(input, false);
    return true;
  }

  if (showMessage) showToast(config.invalidMessage, "error");
  if (shouldMarkInvalid) setDropdownFieldError(input, true);

  if (clearInvalid) {
    input.value = "";
    selected[config.key] = "";
    saveState();
    generate();
  }

  if (focusInvalid) {
    input.focus();
    input.select();
  }

  return false;
}

document.addEventListener("DOMContentLoaded", () => {
  const currentPage = window.location.pathname.split("/").pop();
  document.querySelectorAll(".navbar a").forEach(link => {
    const href = link.getAttribute("href");
    if(href === currentPage || (currentPage === "" && href === "index.html")){
      link.classList.add("active");
    }
  });
});

const monthIndex = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3,
  May: 4, Jun: 5, Jul: 6, Aug: 7,
  Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

const dobInput = document.getElementById("dob");

dobInput.addEventListener("input", () => {
  let val = dobInput.value.replace(/\D/g, '');
  val = val.slice(0, 8);
  if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
  if (val.length > 5) val = val.slice(0, 5) + '/' + val.slice(5);
  dobInput.value = val;
  selected.dob = val;
  saveState();
  generate();
});

const idIssueInput = document.getElementById("idIssueDate");

idIssueInput.addEventListener("input", (e) => {
  let val = e.target.value.replace(/\D/g, "");
  val = val.slice(0, 8);
  let formatted = val;
  if (val.length > 2) formatted = val.slice(0, 2) + "/" + val.slice(2);
  if (val.length > 4) formatted = val.slice(0, 2) + "/" + val.slice(2, 4) + "/" + val.slice(4);
  e.target.value = formatted;
  selected.idIssueDate = formatted;
  saveState();
  generate();
});

idIssueInput.addEventListener("keypress", (e) => {
  if (!/[0-9]/.test(e.key)) e.preventDefault();
});

const idExpiryInput = document.getElementById("idExpiryDate");

if (idExpiryInput) {
  idExpiryInput.addEventListener("input", (e) => {
    let val = e.target.value.replace(/\D/g, "");
    val = val.slice(0, 8);
    let formatted = val;
    if (val.length > 2) formatted = val.slice(0, 2) + "/" + val.slice(2);
    if (val.length > 4) formatted = val.slice(0, 2) + "/" + val.slice(2, 4) + "/" + val.slice(4);
    e.target.value = formatted;
    selected.idExpiryDate = formatted;
    saveState();
    generate();
  });

  idExpiryInput.addEventListener("keypress", (e) => {
    if (!/[0-9]/.test(e.key)) e.preventDefault();
  });
}

function isMinorAtOffense(dobStr, offMonth, offYear) {
  if (!dobStr || !offMonth || !offYear) return false;
  const parts = dobStr.split("/");
  if (parts.length !== 3) return false;
  const day   = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year  = parseInt(parts[2], 10);
  const dob   = new Date(year, month, day);
  if (isNaN(dob)) return false;
  const offenseDate = new Date(parseInt(offYear, 10), monthIndex[offMonth] + 1, 0);
  let age = offenseDate.getFullYear() - dob.getFullYear();
  const mDiff = offenseDate.getMonth() - dob.getMonth();
  if (mDiff < 0 || (mDiff === 0 && offenseDate.getDate() < dob.getDate())) age--;
  return age < 18;
}

function resolveCountryKey() {
  const citizenship = selected.citizenship?.trim();
  if (citizenship && citizenshipToCountry[citizenship]) return citizenshipToCountry[citizenship];
  const jurisdiction = selected.country?.trim();
  if (jurisdiction) return jurisdiction;
  return "";
}

function setupAutocomplete(inputId, dropdownId, dataList, targetKey) {
  const input    = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  let activeIndex    = -1;
  let currentItems   = [];
  let pickedFromList = false;

  function render(value) {
    dropdown.innerHTML = "";
    activeIndex    = -1;
    currentItems   = [];
    pickedFromList = false;
    if (!value) { dropdown.style.display = "none"; return; }
    const matches = dataList.filter(item => item.toLowerCase().includes(value.toLowerCase()));
    if (matches.length === 0) { dropdown.style.display = "none"; return; }
    currentItems = matches;
    matches.forEach((match) => {
      const div = document.createElement("div");
      div.className = "autocomplete-item";
      div.textContent = match;
      div.addEventListener("click", () => {
        pickedFromList = true;
        selectItem(match);
      });
      dropdown.appendChild(div);
    });
    dropdown.style.display = "block";
  }

  function updateHighlight() {
    dropdown.querySelectorAll(".autocomplete-item").forEach((el, i) => {
      el.style.background = "";
      el.style.color = "";
      if (i === activeIndex) {
        el.style.background = "var(--card)";
        el.style.color      = "var(--accent)";
      }
    });
  }

  function selectItem(value) {
    input.value         = value;
    selected[targetKey] = value;
    dropdown.style.display = "none";
    activeIndex = -1;
    saveState();
    generate();
  }

  input.addEventListener("input", () => render(input.value));

  input.addEventListener("keydown", (e) => {
    const items = dropdown.querySelectorAll(".autocomplete-item");
    if (dropdown.style.display === "none" || items.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); activeIndex = (activeIndex + 1) % items.length; updateHighlight(); }
    if (e.key === "ArrowUp")   { e.preventDefault(); activeIndex = (activeIndex - 1 + items.length) % items.length; updateHighlight(); }
    if (e.key === "Enter") {
      e.preventDefault();
      pickedFromList = true;
      const target = activeIndex >= 0 ? currentItems[activeIndex] : currentItems[0];
      if (target) selectItem(target);
    }
    if (e.key === "Escape") dropdown.style.display = "none";
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (!pickedFromList) {
        validateDropdownField(input, { showMessage: true, focusInvalid: true });
      }
    }, 150);
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) dropdown.style.display = "none";
  });
}

// ─────────────────────────────────────────────
//  ACTIVE PENALTIES TABLE
//  (data lives in data.js — this just tracks the active slice)
// ─────────────────────────────────────────────
let penalties = penaltiesByCountry["Pakistan"];

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
let selected = {
  month:          "",
  year:           "",
  status:         "",
  offense:        "",
  sentence:       "",
  fillers:        [],
  dob:            "",
  given:          "",
  surname:        "",
  country:        "",
  hitCountry:     "",
  citizenship:    "",
  hitCitizenship: "",
  idType:         "",
  idIssueDate:    "",
  idExpiryDate:   "",
  offenseCountry: "Pakistan"
};

const saved = localStorage.getItem("dispoState");
if (saved) selected = { ...selected, ...JSON.parse(saved) };

penalties = penaltiesByCountry[selected.offenseCountry] || penaltiesByCountry["Pakistan"];

// ─────────────────────────────────────────────
//  BUILD BUTTONS
// ─────────────────────────────────────────────
function createButtons() {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  months.forEach(m => {
    document.getElementById("monthGrid").innerHTML +=
      `<button class="selectBtn" onclick="pick('month','${m}',this)">${m}</button>`;
  });

  for (let i = 1980; i <= 2026; i++) {
    document.getElementById("yearGrid").innerHTML +=
      `<button class="selectBtn" onclick="pick('year','${i}',this)">${i}</button>`;
  }

  rebuildOffenseButtons();

  [
    "COMMON NAME",
    "JUVENILE",
    "RESIDENCY MISMATCH",
    "CITIZENSHIP MISMATCH (PAKISTAN ONLY)",
    "CITIZENSHIP (BIRTHDATE TO ISSUING DATE)",
    "CITIZENSHIP (ISSUING DATE TO EXPIRY DATE)",
    "CITIZENSHIP (ISSUING DATE TO CREATION DATE)"
  ].forEach(d => {
    document.getElementById("dispGrid").innerHTML +=
      `<button class="selectBtn" onclick="pick('fillers','${d}',this)">${d}</button>`;
  });

  ["Arrested","Detained","Convicted"].forEach(s => {
    document.getElementById("statusGrid").innerHTML +=
      `<button class="selectBtn" onclick="pick('status','${s}',this)">${s}</button>`;
  });
}

function rebuildOffenseButtons() {
  const grid = document.getElementById("offenseGrid");
  grid.innerHTML = "";
  Object.keys(penalties).forEach(o => {
    grid.innerHTML +=
      `<button class="selectBtn" onclick="pick('offense','${o}',this)" data-offense="${o}">${o}</button>`;
  });
}

// ─────────────────────────────────────────────
//  OFFENSE COUNTRY DROPDOWN
// ─────────────────────────────────────────────
function initOffenseCountryDropdown() {
  const select = document.getElementById("offenseCountry");
  if (!select) return;

  select.value = selected.offenseCountry || "Pakistan";

  select.addEventListener("change", () => {
    selected.offenseCountry = select.value;
    penalties = penaltiesByCountry[selected.offenseCountry] || penaltiesByCountry["Pakistan"];

    if (selected.offense && !penalties[selected.offense]) {
      selected.offense  = "";
      selected.sentence = "";
    }

    rebuildOffenseButtons();

    if (selected.offense) {
      document.querySelectorAll("#offenseGrid .selectBtn").forEach(b => {
        b.classList.toggle("active", b.textContent === selected.offense);
      });
    }

    updateOffenseLock();
    saveState();
    generate();
  });
}

// ─────────────────────────────────────────────
//  OFFENSE LOCK (Convicted → Corruption only)
// ─────────────────────────────────────────────
function updateOffenseLock() {
  const buttons = document.querySelectorAll("#offenseGrid .selectBtn");
  if (selected.status === "Convicted") {
    buttons.forEach(b => {
      if (b.textContent !== "Corruption") {
        b.disabled = true;
        b.classList.add("disabled");
      } else {
        b.disabled = false;
        b.classList.add("active");
      }
    });
  } else {
    buttons.forEach(b => {
      b.disabled = false;
      b.classList.remove("disabled");
    });
  }
}

// ─────────────────────────────────────────────
//  PICK
// ─────────────────────────────────────────────
function pick(type, value, btn) {

  if (type === "fillers") {
    const normalizedValue = normalizeFillerValue(value);
    let index = selected.fillers.findIndex(f => normalizeFillerValue(f) === normalizedValue);
    if (index > -1) {
      selected.fillers.splice(index, 1);
      btn.classList.remove("active");
    } else {
      selected.fillers.push(normalizedValue);
      btn.classList.add("active");
    }
    if (selected.fillers.length === 0) {
      clearErrorMessage();
    }
    saveState(); generate(); return;
  }

  if (type === "status") {
    if (selected.status === value) {
      selected.status = "";
      btn.classList.remove("active");
      updateOffenseLock(); saveState(); generate(); return;
    }
    selected.status = value;
    document.querySelectorAll("#statusGrid .selectBtn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    if (value === "Convicted") {
      selected.offense  = "Corruption";
      selected.sentence = penalties["Corruption"];
      document.querySelectorAll("#offenseGrid .selectBtn").forEach(b => {
        b.classList.toggle("active", b.textContent === "Corruption");
      });
    }
    updateOffenseLock(); saveState(); generate(); return;
  }

  if (selected[type] === value) {
    selected[type] = "";
    btn.classList.remove("active");
    saveState(); generate(); return;
  }

  if (type === "offense") {
    if (selected.status === "Convicted" && value !== "Corruption") return;
    selected.offense  = value;
    selected.sentence = penalties[value];
  }

  selected[type] = value;
  btn.parentElement.querySelectorAll(".selectBtn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  saveState(); generate();
}

// ─────────────────────────────────────────────
//  GENERATE
// ─────────────────────────────────────────────
function showErrorMessage(messageOrMessages) {
  const out        = document.getElementById("output");
  const minorAlert = document.getElementById("minorAlert");
  const copyHint   = document.getElementById("copyHint");
  const messages = Array.isArray(messageOrMessages)
    ? messageOrMessages.filter(Boolean)
    : [messageOrMessages].filter(Boolean);

  if (minorAlert) {
    minorAlert.style.display = "block";
    const listMarkup = messages.map(msg => `<div style="margin-top:4px;">• ${msg}</div>`).join("");
    minorAlert.innerHTML = `<span style="color:var(--red);font-weight:700;">ERROR:</span>${listMarkup}`;
  }
  if (copyHint) copyHint.style.display = "none";
  if (out) {
    out.classList.remove("has-content");
    out.innerHTML = "";
  }
}

function clearErrorMessage() {
  const minorAlert = document.getElementById("minorAlert");
  const copyHint   = document.getElementById("copyHint");
  if (minorAlert) {
    minorAlert.style.display = "none";
    minorAlert.innerHTML = "";
  }
  if (copyHint) copyHint.style.display = "inline-flex";
}

function extractErrorMessages(html) {
  if (!html) return [];
  const matches = [...html.matchAll(/<span[^>]*>ERROR:\s*([^<]+)<\/span>/gi)];
  return matches.map(match => match[1].trim()).filter(Boolean);
}

function generate() {
  const out        = document.getElementById("output");
  const minorAlert = document.getElementById("minorAlert");
  const copyHint   = document.getElementById("copyHint");

  const dobVal       = document.getElementById("dob").value.trim();
  const givenInput   = document.getElementById("given");
  const surnameInput = document.getElementById("surname");
  const countryInput = document.getElementById("country");

  givenInput.value   = capitalizeWords(givenInput.value);
  surnameInput.value = capitalizeWords(surnameInput.value);
  countryInput.value = capitalizeWords(countryInput.value);

  const givenVal   = givenInput.value.trim();
  const middleVal  = document.getElementById("middleName")?.value?.trim();
  const surnameVal = surnameInput.value.trim();
  const countryVal = resolveCountryKey();
  const countryKey = resolveCountryKey();

  // ── Minor check ──
  let minor = false;
  if (dobVal && selected.year) {
    if (selected.month) {
      minor = isMinorAtOffense(dobVal, selected.month, selected.year);
    } else {
      const parts = dobVal.split("/");
      if (parts.length === 3) minor = (selected.year - parseInt(parts[2], 10)) < 18;
    }
  }

  const hasJuvenile = selected.fillers.includes("JUVENILE");
  const validationErrors = [];
  const requiredFieldErrors = [];
  const hasAnyInput = Boolean(
    selected.status ||
    selected.offense ||
    selected.year ||
    selected.month ||
    selected.fillers.length ||
    givenVal ||
    middleVal ||
    surnameVal ||
    selected.country ||
    selected.hitCountry ||
    selected.citizenship ||
    selected.hitCitizenship ||
    selected.idType ||
    selected.idIssueDate ||
    selected.idExpiryDate ||
    selected.dob
  );

  if (minor && !hasJuvenile) {
    validationErrors.push("Juvenile disposition is required because the offense occurred when the user was a minor.");
  }

  const selectedFillerKeys = selected.fillers.map(normalizeFillerValue);
  if (selectedFillerKeys.includes("COMMON NAME") && (!givenVal || !countryVal)) {
    requiredFieldErrors.push("Common Name cannot be generated (missing Given Name and/or Country).");
  }
  if (selectedFillerKeys.includes("RESIDENCY MISMATCH") && (!selected.country || !selected.hitCountry)) {
    requiredFieldErrors.push("Residency Mismatch cannot be generated (missing Hit Info or User Country).");
  }
  if (selectedFillerKeys.includes("CITIZENSHIP MISMATCH") && (!selected.citizenship || !selected.hitCitizenship)) {
    requiredFieldErrors.push("Citizenship Mismatch cannot be generated (missing User or Hit Citizenship).");
  }
  if (selectedFillerKeys.includes("CITIZENSHIP (BIRTHDATE TO ISSUING DATE)")) {
    if (!selected.citizenship || !selected.hitCitizenship) {
      requiredFieldErrors.push("Citizenship (Birthdate to Issuing Date) cannot be generated (missing User or Hit Citizenship).");
    } else if (!selected.country || !selected.idIssueDate) {
      requiredFieldErrors.push("Citizenship (Birthdate to Issuing Date) cannot be generated (missing User Jurisdiction and/or ID Issuing Date).");
    }
  }
  if (selectedFillerKeys.includes("CITIZENSHIP (ISSUING DATE TO EXPIRY DATE)")) {
    if (!selected.citizenship || !selected.hitCitizenship) {
      requiredFieldErrors.push("Citizenship (Issuing Date to Expiry Date) cannot be generated (missing User or Hit Citizenship).");
    } else if (!selected.idType || !selected.idIssueDate || !selected.idExpiryDate) {
      requiredFieldErrors.push("Citizenship (Issuing Date to Expiry Date) cannot be generated (missing ID Type, ID Issuing Date, and/or ID Expiration Date).");
    }
  }
  if (selectedFillerKeys.includes("CITIZENSHIP (ISSUING DATE TO CREATION DATE)")) {
    if (!selected.citizenship || !selected.hitCitizenship) {
      requiredFieldErrors.push("Citizenship (Issuing Date to Creation Date) cannot be generated (missing User or Hit Citizenship).");
    } else if (!selected.idType || !selected.idIssueDate) {
      requiredFieldErrors.push("Citizenship (Issuing Date to Creation Date) cannot be generated (missing ID Type and/or ID Issuing Date).");
    }
  }

  clearErrorMessage();

  const lines = [];

  // ── Max Penalty ──
  const maxPenalty = hasAnyInput ? buildMaxPenaltyText({
    status:         selected.status,
    offense:        selected.offense,
    sentence:       selected.sentence,
    month:          selected.month,
    year:           selected.year,
    offenseCountry: selected.offenseCountry
  }) : "";
  if (maxPenalty) lines.push(maxPenalty);

  // ── Filler dispositions ──
  const dispositionText = [];

  selected.fillers.forEach(d => {
    const fillerKey = normalizeFillerValue(d);

    if (fillerKey === "COMMON NAME") {
      dispositionText.push(buildCommonNameText({ givenVal, middleVal, surnameVal, countryVal, countryKey }));
    }

    if (fillerKey === "JUVENILE") {
      dispositionText.push(buildJuvenileText({ isMinor: minor }));
    }

    if (fillerKey === "RESIDENCY MISMATCH") {
      dispositionText.push(buildResidencyMismatchText({
        userCountry:    (selected.country   || "").trim().toLowerCase(),
        hitCountry:     (selected.hitCountry || "").trim().toLowerCase(),
        userCountryRaw: selected.country,
        hitCountryRaw:  selected.hitCountry
      }));
    }

    if (fillerKey === "CITIZENSHIP MISMATCH") {
      dispositionText.push(buildCitizenshipMismatchText({
        userCitizenship: selected.citizenship,
        hitCitizenship:  selected.hitCitizenship,
        hitCountry:      selected.hitCountry,
        idIssueDate:     selected.idIssueDate,
        offenseMonth:    selected.year
      }));
    }

    if (fillerKey === "CITIZENSHIP (BIRTHDATE TO ISSUING DATE)") {
      dispositionText.push(buildCitizenshipBirthToIssuingText({
        userCitizenship:  selected.citizenship,
        hitCitizenship:   selected.hitCitizenship,
        hitCountry:       selected.hitCountry,
        userJurisdiction: selected.country,
        idIssueDate:      selected.idIssueDate,
        offenseYear:      selected.year,
        userResidency:    selected.country
      }));
    }

    if (fillerKey === "CITIZENSHIP (ISSUING DATE TO EXPIRY DATE)") {
      dispositionText.push(buildCitizenshipIssuingToExpiryText({
        userCitizenship: selected.citizenship,
        hitCitizenship:  selected.hitCitizenship,
        hitCountry:      selected.hitCountry,
        idType:          selected.idType,
        idIssueDate:     selected.idIssueDate,
        idExpiryDate:    selected.idExpiryDate,
        offenseYear:     selected.year,
        userResidency:   selected.country
      }));
    }

    if (fillerKey === "CITIZENSHIP (ISSUING DATE TO CREATION DATE)") {
      dispositionText.push(buildCitizenshipIssuingToCreationText({
        userCitizenship: selected.citizenship,
        hitCitizenship:  selected.hitCitizenship,
        hitCountry:      selected.hitCountry,
        idType:          selected.idType,
        idIssueDate:     selected.idIssueDate,
        offenseYear:     selected.year
      }));
    }
  });

  const renderedParts = [];

  if (maxPenalty) renderedParts.push(maxPenalty);
  if (dispositionText.length) renderedParts.push(dispositionText.join("<br><br>"));

  if (renderedParts.length || validationErrors.length || requiredFieldErrors.length) {
    const combined = renderedParts.join("<br><br>");
    const templateErrors = extractErrorMessages(combined);
    const allErrors = [...new Set([...validationErrors, ...requiredFieldErrors, ...templateErrors].filter(Boolean))];
    if (allErrors.length) {
      showErrorMessage(allErrors);
      return;
    }

    out.innerHTML = combined;
    out.classList.add("has-content");
    clearErrorMessage();
  } else {
    out.innerText = "Template will appear here.";
    out.classList.remove("has-content");
    clearErrorMessage();
  }
}

function adjustOutputHeight() {
  const out = document.getElementById("output");
  if (!out) return;
  out.style.height = "auto";
}

adjustOutputHeight();

function copyText() {
  const out  = document.getElementById("output");
  const hint = document.getElementById("copyHint");
  const minorAlert = document.getElementById("minorAlert");
  const text = out?.innerText || "";

  if (!text || text === "Template will appear here.") return;
  if (minorAlert && minorAlert.style.display === "block") {
    showErrorMessage(minorAlert.innerText.replace(/^ERROR:\s*/i, ""));
    return;
  }

  navigator.clipboard.writeText(text);
  if (!hint) return;
  hint.classList.add("copied-flash");
  hint.innerHTML = hint.innerHTML.replace("click to copy", "copied!");
  setTimeout(() => {
    hint.classList.remove("copied-flash");
    hint.innerHTML = hint.innerHTML.replace("copied!", "click to copy");
  }, 1500);
}

document.querySelectorAll(".textInput").forEach(el => {
  el.addEventListener("input", function() {
    const cursorPos = this.selectionStart;

    if (dropdownFieldConfig[this.id]) {
      validateDropdownField(this);
    } else {
      this.value = capitalizeWords(this.value);
      this.setSelectionRange(cursorPos, cursorPos);
    }

    selected.given          = document.getElementById("given").value;
    selected.middleName     = document.getElementById("middleName")?.value || "";
    selected.surname        = document.getElementById("surname").value;
    selected.country        = findDropdownMatch(document.getElementById("country").value, jurisdictionList);
    selected.hitCountry     = findDropdownMatch(document.getElementById("hitCountry").value, jurisdictionList);
    selected.citizenship    = findDropdownMatch(document.getElementById("citizenship")?.value || "", citizenshipList);
    selected.hitCitizenship = findDropdownMatch(document.getElementById("hitCitizenship")?.value || "", citizenshipList);
    selected.idType         = document.getElementById("idType")?.value || "";
    selected.idIssueDate    = document.getElementById("idIssueDate")?.value || "";
    selected.idExpiryDate   = document.getElementById("idExpiryDate")?.value || "";

    saveState();
    generate();
  });
});

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
createButtons();
initOffenseCountryDropdown();

setupAutocomplete("citizenship",    "citizenshipDropdown",    citizenshipList,  "citizenship");
setupAutocomplete("hitCitizenship", "hitCitizenshipDropdown", citizenshipList,  "hitCitizenship");
setupAutocomplete("country",        "countryDropdown",        jurisdictionList, "country");
setupAutocomplete("hitCountry",     "hitCountryDropdown",     jurisdictionList, "hitCountry");

function restoreUI() {
  if (selected.month)   document.querySelectorAll("#monthGrid .selectBtn").forEach(b => { if (b.textContent === selected.month)   b.classList.add("active"); });
  if (selected.year)    document.querySelectorAll("#yearGrid .selectBtn").forEach(b  => { if (b.textContent == selected.year)     b.classList.add("active"); });
  if (selected.offense) document.querySelectorAll("#offenseGrid .selectBtn").forEach(b => { if (b.textContent === selected.offense) b.classList.add("active"); });

  selected.fillers.forEach(val => {
    document.querySelectorAll("#dispGrid .selectBtn").forEach(b => {
      if (normalizeFillerValue(b.textContent) === normalizeFillerValue(val)) b.classList.add("active");
    });
  });

  document.getElementById("given").value          = selected.given          || "";
  document.getElementById("middleName").value      = selected.middleName     || "";
  document.getElementById("surname").value         = selected.surname        || "";
  document.getElementById("country").value         = selected.country        || "";
  document.getElementById("hitCountry").value      = selected.hitCountry     || "";
  document.getElementById("citizenship").value     = selected.citizenship    || "";
  document.getElementById("hitCitizenship").value  = selected.hitCitizenship || "";
  document.getElementById("idType").value          = selected.idType         || "";
  document.getElementById("idIssueDate").value     = selected.idIssueDate    || "";
  if (document.getElementById("idExpiryDate")) document.getElementById("idExpiryDate").value = selected.idExpiryDate || "";
  document.getElementById("dob").value             = selected.dob            || "";

  const offenseCountrySelect = document.getElementById("offenseCountry");
  if (offenseCountrySelect && selected.offenseCountry) {
    offenseCountrySelect.value = selected.offenseCountry;
    penalties = penaltiesByCountry[selected.offenseCountry] || penaltiesByCountry["Pakistan"];
  }
}

document.getElementById("clearAll").addEventListener("click", () => {
  ["given","middleName","surname","country","hitCountry","dob",
   "citizenship","hitCitizenship","idType","idIssueDate","idExpiryDate"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  selected = {
    month: "", year: "", status: "", offense: "", sentence: "",
    fillers: [], dob: "", given: "", middleName: "", surname: "",
    country: "", hitCountry: "", citizenship: "", hitCitizenship: "",
    idType: "", idIssueDate: "", idExpiryDate: "",
    offenseCountry: "Pakistan"
  };

  const offenseCountrySelect = document.getElementById("offenseCountry");
  if (offenseCountrySelect) offenseCountrySelect.value = "Pakistan";
  penalties = penaltiesByCountry["Pakistan"];
  rebuildOffenseButtons();

  document.querySelectorAll(".selectBtn").forEach(btn => btn.classList.remove("active"));

  const out = document.getElementById("output");
  out.innerText = "Template will appear here.";
  out.classList.remove("has-content");
  clearErrorMessage();

  localStorage.setItem("dispoState", JSON.stringify(selected));
});

document.getElementById("dob").addEventListener("input", () => { saveState(); generate(); });

const copyHint = document.getElementById("copyHint");
if (copyHint) copyHint.addEventListener("click", copyText);

const outDiv = document.getElementById("output");
if (outDiv) outDiv.addEventListener("click", copyText);

function goTab(page) { window.location.href = page; }

const pages = [
  "productivity.html","maxpenalty.html","common-name.html",
  "potential-match.html","remission.html","playbook.html","jpgpdf.html"
];

function goNext() { const i = getCurrentIndex(); if (i < pages.length - 1) window.location.href = pages[i + 1]; }
function goPrev() { const i = getCurrentIndex(); if (i > 0) window.location.href = pages[i - 1]; }
function getCurrentIndex() { return pages.indexOf(window.location.pathname.split("/").pop()); }

window.addEventListener("beforeunload", () => {
  const page = window.location.pathname.split("/").pop();
  localStorage.setItem("scroll_" + page, window.scrollY);
});

window.addEventListener("load", () => {
  const page   = window.location.pathname.split("/").pop();
  const scroll = localStorage.getItem("scroll_" + page);
  if (scroll !== null) setTimeout(() => window.scrollTo(0, parseInt(scroll)), 50);
});

// ─────────────────────────────────────────────
//  FINAL INIT
// ─────────────────────────────────────────────
updateOffenseLock();
restoreUI();

setTimeout(() => {
  document.querySelectorAll("#statusGrid .selectBtn").forEach(b => {
    if (b.textContent === selected.status) b.classList.add("active");
  });
}, 0);

generate();

setTimeout(() => {
  const page   = window.location.pathname.split("/").pop();
  const scroll = localStorage.getItem("scroll_" + page);
  if (scroll !== null) window.scrollTo(0, parseInt(scroll));
}, 100);

/* =============================================
   DETAILS SIDEBAR
   ============================================= */

   function refreshDetailsSidebar() {
    const fields = {
      "dsb-given":          selected.given          || "—",
      "dsb-middle":         selected.middleName      || "—",
      "dsb-surname":        selected.surname         || "—",
      "dsb-dob":            selected.dob             || "—",
      "dsb-idtype":         selected.idType          || "—",
      "dsb-idissue":        selected.idIssueDate     || "—",
      "dsb-idexpiry":       selected.idExpiryDate    || "—",
      "dsb-country":        selected.country         || "—",
      "dsb-citizenship":    selected.citizenship     || "—",
      "dsb-hitcountry":     selected.hitCountry      || "—",
      "dsb-hitcitizenship": selected.hitCitizenship  || "—"
    };
    Object.entries(fields).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });
  }
  
  // Refresh on every generate() call — hook into saveState
  const _origSaveState = saveState;
  saveState = function() {
    _origSaveState();
    refreshDetailsSidebar();
  };
  
  refreshDetailsSidebar();