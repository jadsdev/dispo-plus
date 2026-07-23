// ── STORAGE HELPERS ──
function saveState(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadState(key) {
  return JSON.parse(localStorage.getItem(key)) || null;
}

// ── HELPERS ──
function capitalizeWords(text) {
  return text.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function findNameData(obj, country, name) {
  const countryData = obj[country];
  if (!countryData) return null;
  const key = Object.keys(countryData).find(
    k => k.toLowerCase() === name.toLowerCase()
  );
  return key ? countryData[key] : null;
}

// ── TIME BAR ──
let toastTimer;

function findJurisdictionMatch(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  return jurisdictionLibrary.find(item => item.toLowerCase() === normalized) || "";
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

function setJurisdictionError(hasError) {
  locationInput.classList.toggle("input-error", hasError);
  locationInput.setAttribute("aria-invalid", hasError ? "true" : "false");
}

function validateJurisdiction({ showMessage = false, focusInvalid = false } = {}) {
  const value = locationInput.value.trim();
  const shouldMarkInvalid = showMessage || focusInvalid || locationInput.classList.contains("input-error");

  if (!value) {
    setJurisdictionError(false);
    return true;
  }

  const match = findJurisdictionMatch(value);
  if (match) {
    locationInput.value = match;
    setJurisdictionError(false);
    return true;
  }

  if (showMessage) {
    showToast("The entered country is not available. Please select a country from the dropdown list.", "error");
  }
  if (shouldMarkInvalid) setJurisdictionError(true);

  if (focusInvalid) {
    locationInput.focus();
    locationInput.select();
  }

  return false;
}

function updateTimes() {
  const now = new Date();
  const date = now.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric"
  });
  const pht = now.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
  });
  const dublin = now.toLocaleTimeString("en-GB", {
    timeZone: "Europe/Dublin",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  });
  document.getElementById("timeBar").textContent =
    `${date} | PHT: ${pht} | Dublin: ${dublin}`;
}
setInterval(updateTimes, 1000);
updateTimes();

(function highlightActiveTab() {
  const current = window.location.pathname.split("/").pop() || "../index.html";
  document.querySelectorAll(".tab-item").forEach(tab => {
    if (tab.dataset.page === current) {
      tab.classList.add("active");
    }
  });
})();

// ── ELEMENT DECLARATIONS ──
const givenNameInput   = document.getElementById("givenName");
const middleNameInput  = document.getElementById("middleName");
const surnameInput     = document.getElementById("surname");
const locationInput    = document.getElementById("location");
const jurisdictionDropdown = document.getElementById("jurisdictionDropdown");
const commonOutput     = document.getElementById("commonOutput");

const fatherUserInput  = document.getElementById("fatherUser");
const fatherHitInput   = document.getElementById("fatherHit");
const fatherLinksInput = document.getElementById("fatherLinks");
const fatherOutput     = document.getElementById("fatherOutput");

const idTypeMismatchInput = document.getElementById("idTypeMismatch");
const userIdNumberInput   = document.getElementById("userIdNumber");
const hitIdNumberInput    = document.getElementById("hitIdNumber");
const idMismatchOutput    = document.getElementById("idMismatchOutput");

// ── COMMON NAME ──
const COMMON_KEY = "commonNameState";

function saveCommonState() {
  saveState(COMMON_KEY, {
    givenName:  givenNameInput.value,
    middleName: middleNameInput.value,
    surname:    surnameInput.value,
    location:   findJurisdictionMatch(locationInput.value),
    output:     commonOutput.innerText
  });
}

function loadCommonState() {
  const state = loadState(COMMON_KEY);
  if (!state) return;

  givenNameInput.value   = state.givenName  || "";
  middleNameInput.value  = state.middleName || "";
  surnameInput.value     = state.surname    || "";
  locationInput.value    = findJurisdictionMatch(state.location) || "";
  commonOutput.innerText = state.output     || "Template will appear here.";

  if (state.output && state.output !== "Template will appear here.") {
    if (state.output.includes("Please fill in") || state.output.includes("not found")) {
      commonOutput.classList.add("has-error");
      commonOutput.classList.remove("has-content");
    } else {
      commonOutput.classList.add("has-content");
      commonOutput.classList.remove("has-error");
    }
  } else {
    commonOutput.classList.remove("has-content", "has-error");
  }
}

// ── DROPDOWN ──
function setupDropdown(inputId, dropdownId, data, onSelect) {
  const input    = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);

  let activeIndex    = -1;
  let currentItems   = [];
  let pickedFromList = false;

  function render(list) {
    dropdown.innerHTML = "";
    activeIndex  = -1;
    currentItems = list; // full list stored here

    list.slice(0, 10).forEach((item) => {
      const div = document.createElement("div");
      div.className = "autocomplete-item";
      div.textContent = item;

      div.onclick = () => {
        pickedFromList = true;
        input.value = item;
        validateJurisdiction();
        dropdown.style.display = "none";
        activeIndex = -1;
        if (onSelect) onSelect(item);
      };

      dropdown.appendChild(div);
    });

    dropdown.style.display = list.length ? "block" : "none";
  }

  input.addEventListener("input", () => {
    const value = input.value.toLowerCase().trim();
    pickedFromList = false; // reset on new keystroke
    if (!value) {
      dropdown.style.display = "none";
      currentItems = [];
      return;
    }
    const filtered = data.filter(item => item.toLowerCase().includes(value));
    render(filtered);
  });

  input.addEventListener("keydown", (e) => {
    const items = dropdown.querySelectorAll(".autocomplete-item");
    if (!items.length) return;

    if (e.key === "ArrowDown") {
      activeIndex = (activeIndex + 1) % items.length;
    }
    if (e.key === "ArrowUp") {
      activeIndex = (activeIndex - 1 + items.length) % items.length;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const target = activeIndex >= 0 ? currentItems[activeIndex] : currentItems[0];
      if (target) {
        pickedFromList = true;
        input.value = target;
        validateJurisdiction();
        dropdown.style.display = "none";
        activeIndex = -1;
        if (onSelect) onSelect(target);
      }
    }

    items.forEach((el, i) => {
      el.classList.toggle("active", i === activeIndex);
    });
  });

  // ── AUTO-SELECT FIRST ON BLUR ──
  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (!pickedFromList) {
        validateJurisdiction({ showMessage: true, focusInvalid: true });
      }
    }, 150);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".dropdown-wrap")) {
      dropdown.style.display = "none";
      activeIndex = -1;
    }
  });
}

setupDropdown(
  "location",
  "jurisdictionDropdown",
  jurisdictionLibrary,
  () => generateCommon()
);

locationInput.addEventListener("input", function() {
  const cursorPos = this.selectionStart;
  this.value = capitalizeWords(this.value);
  this.setSelectionRange(cursorPos, cursorPos);
  validateJurisdiction();
  if (!this.value.trim()) generateCommon();
});

// ── GENERATE COMMON ──
function generateCommon() {

  const givenVal   = givenNameInput.value.trim();
  const middleVal  = middleNameInput.value.trim();
  const surnameVal = surnameInput.value.trim();
  const countryVal = locationInput.value.trim();
  const fullName   = [givenVal, middleVal, surnameVal].filter(Boolean).join(" ");

  commonOutput.style.color = "";

  if (countryVal && !findJurisdictionMatch(countryVal)) {
    commonOutput.innerText = "Template will appear here.";
    commonOutput.classList.remove("has-content", "has-error");
    saveCommonState();
    return;
  }

  if (!givenVal && !surnameVal && !countryVal) {
    commonOutput.innerText = "Template will appear here.";
    commonOutput.classList.remove("has-content", "has-error");
    saveCommonState();
    return;
  }

  if (!givenVal || !countryVal) {
    commonOutput.innerText = "Please fill in Given Name and Country.";
    commonOutput.classList.add("has-error");
    commonOutput.classList.remove("has-content");
    saveCommonState();
    return;
  }

  const givenData   = findNameData(NameStatsByCountry, countryVal, givenVal);
  const middleData  = middleVal  ? findNameData(NameStatsByCountry, countryVal, middleVal)  : null;
  const surnameData = surnameVal ? findNameData(NameStatsByCountry, countryVal, surnameVal) : null;

  const missingGiven   = !givenData;
  const missingSurname = surnameVal && !surnameData;

  if (missingGiven || missingSurname) {
    let errorMsg = "";
    if (missingGiven && missingSurname) {
      errorMsg = `ERROR: "${givenVal}" and "${surnameVal}" are not found in the common name list for ${countryVal}. Common Name disposition cannot be applied.`;
    } else if (missingGiven) {
      errorMsg = `ERROR: "${givenVal}" is not found in the common name list for ${countryVal}. Common Name disposition cannot be applied.`;
    } else {
      errorMsg = `ERROR: "${surnameVal}" is not found in the common name list for ${countryVal}. Common Name disposition cannot be applied.`;
    }
    commonOutput.innerHTML = `<span style="color:var(--red);font-weight:600;">${errorMsg}</span>`;
    commonOutput.classList.add("has-error");
    commonOutput.classList.remove("has-content");
    saveCommonState();
    return;
  }

  if (middleVal && !middleData) {
    commonOutput.innerHTML = `<span style="color:var(--red);font-weight:600;">ERROR: "${middleVal}" is not found in the common name list for ${countryVal}. Common Name disposition cannot be applied.</span>`;
    commonOutput.classList.add("has-error");
    commonOutput.classList.remove("has-content");
    saveCommonState();
    return;
  }

  const template =
    `Common name match. As per CMS, the hit is ${fullName} with location in ${countryVal} and no other identifiers noted. ` +
    `As per KYC, our user is ${fullName} and country of stay is ${countryVal}. ` +
    `Noted name and location match between hit and user, however as per "TTL Onboarding Risk-Based Disposition Factors", ` +
    `${givenVal} has an incidence of ${givenData.incidence} and a ratio of ${givenData.frequency}. ` +
    `${middleVal && middleData
      ? `${middleVal} has an incidence of ${middleData.incidence} and a ratio of ${middleData.frequency}. `
      : ""}` +
    `${surnameVal && surnameData
      ? `${surnameVal} has an incidence of ${surnameData.incidence} and a ratio of ${surnameData.frequency}. `
      : ""}` +
    `Given the commonality of the name components, it is unlikely that user and hit are the same individual. Hence, this is a false positive.`;

  commonOutput.innerText = template;
  commonOutput.classList.remove("has-error");
  commonOutput.classList.add("has-content");
  saveCommonState();
}

// ── COPY HINTS ──
function setCopyHint(hint) {
  const svg = hint.querySelector("svg");
  hint.innerHTML = "";
  hint.appendChild(svg);
  hint.appendChild(document.createTextNode(" copied!"));
  hint.style.color = "var(--accent)";
}

function resetCopyHint(hint) {
  const svg = hint.querySelector("svg");
  hint.innerHTML = "";
  hint.appendChild(svg);
  hint.appendChild(document.createTextNode(" click to copy"));
  hint.style.color = "";
}

function canCopyOutput(outputEl) {
  if (!outputEl) return false;
  const text = outputEl.innerText?.trim() || "";
  return text !== "" && text !== "Template will appear here." && !outputEl.classList.contains("has-error") && !outputEl.classList.contains("neutral");
}

function copyCommon() {
  if (!canCopyOutput(commonOutput)) return;
  navigator.clipboard.writeText(commonOutput.innerText);
  const hint = commonOutput.parentElement.querySelector(".copy-hint");
  setCopyHint(hint);
  setTimeout(() => resetCopyHint(hint), 1200);
}

function copyFather() {
  if (!canCopyOutput(fatherOutput)) return;
  navigator.clipboard.writeText(fatherOutput.innerText);
  const hint = fatherOutput.parentElement.querySelector(".copy-hint");
  if (!hint) return;
  setCopyHint(hint);
  setTimeout(() => resetCopyHint(hint), 1200);
}

// ── ID MISMATCH ──
// ── ID MISMATCH ──
const ID_MISMATCH_KEY = "idMismatchState";

function saveIdMismatchState() {
  saveState(ID_MISMATCH_KEY, {
    idType: idTypeMismatchInput.value,
    userId: userIdNumberInput.value,
    hitId:  hitIdNumberInput.value,
    output: idMismatchOutput.innerText,
    isError: idMismatchOutput.classList.contains("has-error"),
    isNeutral: idMismatchOutput.classList.contains("neutral")
  });
}

function loadIdMismatchState() {
  const state = loadState(ID_MISMATCH_KEY);
  if (!state) return;

  idTypeMismatchInput.value = state.idType || "";
  userIdNumberInput.value   = state.userId || "";
  hitIdNumberInput.value    = state.hitId || "";
  idMismatchOutput.innerText = state.output || "Template will appear here.";

  idMismatchOutput.classList.remove("has-error", "has-content", "neutral");
  if (state.isError) {
    idMismatchOutput.classList.add("has-error");
  } else if (state.isNeutral) {
    idMismatchOutput.classList.add("neutral");
  } else if (state.output && state.output !== "Template will appear here.") {
    idMismatchOutput.classList.add("has-content");
  }
}

function generateIdMismatch() {
  const idTypeVal = idTypeMismatchInput.value.trim();
  const userVal   = userIdNumberInput.value.trim();
  const hitVal    = hitIdNumberInput.value.trim();

  if (!idTypeVal && !userVal && !hitVal) {
    idMismatchOutput.innerText = "Template will appear here.";
    idMismatchOutput.classList.remove("has-content", "has-error", "neutral");
    saveIdMismatchState();
    return;
  }

  if (!idTypeVal) {
    idMismatchOutput.innerHTML = `<span class="error-text">ERROR: Please input an ID type.</span>`;
    idMismatchOutput.classList.add("has-error");
    idMismatchOutput.classList.remove("has-content", "neutral");
    saveIdMismatchState();
    return;
  }

  if (!userVal || !hitVal) {
    idMismatchOutput.innerHTML = `<span class="neutral-text">Please fill in User ID Number and Hit ID Number.</span>`;
    idMismatchOutput.classList.add("neutral");
    idMismatchOutput.classList.remove("has-content", "has-error");
    saveIdMismatchState();
    return;
  }

  if (userVal.toUpperCase() === hitVal.toUpperCase()) {
    idMismatchOutput.innerHTML = `<span class="error-text">ERROR: User ID number and hit ID number are the same. This cannot be used as a false positive disposition.</span>`;
    idMismatchOutput.classList.add("has-error");
    idMismatchOutput.classList.remove("has-content", "neutral");
    saveIdMismatchState();
    return;
  }

  const template =
    `ID number mismatch. Hit's ID number is ${hitVal} as per CMS while as per KYC, user's ID number is ${userVal}. ` +
    `As both are ${idTypeVal} numbers (same format and does not expire) and differ, this is a false positive.`;

  idMismatchOutput.innerText = template;
  idMismatchOutput.classList.add("has-content");
  idMismatchOutput.classList.remove("has-error", "neutral");
  saveIdMismatchState();
}

function copyIdMismatch() {
  if (!canCopyOutput(idMismatchOutput)) return;
  navigator.clipboard.writeText(idMismatchOutput.innerText);
  const hint = idMismatchOutput.parentElement.querySelector(".copy-hint");
  if (!hint) return;
  setCopyHint(hint);
  setTimeout(() => resetCopyHint(hint), 1200);
}

// ── NAME INPUT LISTENERS ──
[givenNameInput, middleNameInput, surnameInput].forEach(el => {
  el.addEventListener("input", function() {
    const cursorPos = this.selectionStart;
    this.value = capitalizeWords(this.value);
    this.setSelectionRange(cursorPos, cursorPos);
    generateCommon();
  });
});

document.getElementById("clearCommon").addEventListener("click", () => {
  givenNameInput.value   = "";
  middleNameInput.value  = "";
  surnameInput.value     = "";
  locationInput.value    = "";
  commonOutput.innerText = "Template will appear here.";
  commonOutput.classList.remove("has-content", "has-error");
  localStorage.removeItem(COMMON_KEY);
});

// ── FATHER'S NAME ──
const FATHER_KEY = "fatherState";

function saveFatherState() {
  saveState(FATHER_KEY, {
    user:      fatherUserInput.value,
    hit:       fatherHitInput.value,
    links:     fatherLinksInput.value,
    output:    fatherOutput.innerText,
    isError:   fatherOutput.classList.contains("has-error"),
    isNeutral: fatherOutput.classList.contains("neutral")
  });
}

function loadFatherState() {
  const state = loadState(FATHER_KEY);
  if (!state) return;

  fatherUserInput.value  = state.user   || "";
  fatherHitInput.value   = state.hit    || "";
  fatherLinksInput.value = state.links  || "";
  fatherOutput.innerText = state.output || "Template will appear here.";

  fatherOutput.classList.remove("has-error", "has-content", "neutral");
  if (state.isError) {
    fatherOutput.classList.add("has-error");
  } else if (state.isNeutral) {
    fatherOutput.classList.add("neutral");
  } else if (state.output && state.output !== "Template will appear here.") {
    fatherOutput.classList.add("has-content");
  }
}

// ── ARABIC NAME VARIATIONS ──
const ARABIC_VARIATIONS = [
  ["Muhammad", "Mohammad", "Mohammed", "Muhammed", "Muhamad", "Mohamed", "Mohammed", "Mohamud", "Mohammod", "Mohd", "Mhd", "Mahmoud", "Mahmood", "Mehmet", "Mahamoud"],
  ["Ahmad", "Ahmed", "Achmed", "Ahmet", "Ehmed"],
  ["Omar", "Umar", "Ömer", "Oumar"],
  ["Ali", "Alawi", "Aly", "Aliy", "Elly"],
  ["Hussein", "Hussain", "Husayn", "Al-Hassan", "Hoessein"],
  ["Hassan", "Hasan", "Hassen", "Hassane", "Hasson"],
  ["Khalid", "Khaled", "Khalead", "Halid", "Halit"],
  ["Kareem", "Karim", "Kerim", "Kharim"],
  ["Suleiman", "Sulayman", "Soliman", "Suleyman", "Solomon"],
  ["Tariq", "Tareq", "Tareck", "Tarik", "Tarreq"],
  ["Majid", "Magid", "Majd", "Majed", "Macit"],
  ["Malik", "Malek", "Melik", "Maliq"],
  ["Jibril", "Gibril", "Djibril", "Gabriel", "Jabril"],
  ["Yusuf", "Youssef", "Yusef", "Joseph", "Yousif", "Yousef"],
  ["Ibrahim", "Ebrahim", "Abraham", "Ibraheem", "Ibrahima"],
  ["Musa", "Mousa", "Moosa", "Moses", "Moussa"],
  ["Dawood", "Dawud", "Dawoud", "David", "Davut"],
  ["Mustafa", "Moustafa", "Mostafa", "Mostapha"],
  ["Zayn", "Zain", "Zayne", "Zein", "Zayd"],
  ["Rayyan", "Ryan", "Rayan", "Raian"],
  ["Bilal", "Belal", "Bilel"],
  ["Yassin", "Yasin", "Yaseen", "Jasin"],
  ["Hamza", "Hamzah", "Humza"],
  ["Amir", "Ameer", "Emir"],
];

function getVariantGroup(name) {
  const lower = name.toLowerCase();
  return ARABIC_VARIATIONS.find(group =>
    group.some(v => v.toLowerCase() === lower)
  ) || null;
}

function isVariation(name1, name2) {
  const group = getVariantGroup(name1);
  if (!group) return false;
  return group.some(v => v.toLowerCase() === name2.toLowerCase());
}

function namesMatch(fullName1, fullName2) {
  const normalize = value => value.trim().replace(/\s+/g, " ").toLowerCase();
  return normalize(fullName1) === normalize(fullName2);
}

function getVariationMatch(userTokens, hitTokens) {
  const userFirst = userTokens[0];
  const userLast  = userTokens[userTokens.length - 1];
  const hitFirst  = hitTokens[0];
  const hitLast   = hitTokens[hitTokens.length - 1];

  if (!userFirst || !hitFirst || !userLast || !hitLast) return null;

  const firstMatch     = isVariation(userFirst, hitFirst);
  const lastExactMatch = userLast.toLowerCase() === hitLast.toLowerCase();

  if (!lastExactMatch) return null;
  if (firstMatch && lastExactMatch) return { userFirst, hitFirst, userLast, hitLast };

  return null;
}

function generateFather() {

  const userVal = fatherUserInput.value.trim();
  const hitVal  = fatherHitInput.value.trim();

  if (!userVal && !hitVal) {
    fatherOutput.innerText = "Template will appear here.";
    fatherOutput.classList.remove("has-content", "has-error", "neutral");
    saveFatherState();
    return;
  }

  if (!userVal || !hitVal) {
    fatherOutput.innerHTML = `<span class="neutral-text">Please fill in both Father's Name fields.</span>`;
    fatherOutput.classList.remove("has-content", "has-error");
    fatherOutput.classList.add("neutral");
    saveFatherState();
    return;
  }

  if (namesMatch(userVal, hitVal)) {
    fatherOutput.innerHTML = `<span class="error-text">ERROR: Father's names are an exact match. This cannot be used as a false positive disposition.</span>`;
    fatherOutput.classList.add("has-error");
    fatherOutput.classList.remove("has-content");
    saveFatherState();
    return;
  }

  const userTokens     = userVal.split(/\s+/);
  const hitTokens      = hitVal.split(/\s+/);
  const variationMatch = getVariationMatch(userTokens, hitTokens);

  if (variationMatch) {
    fatherOutput.innerHTML = `<span class="error-text">ERROR: "${variationMatch.userFirst}" → "${variationMatch.hitFirst}" are known Arabic name variations in matching positions. This cannot be used as a false positive disposition.</span>`;
    fatherOutput.classList.add("has-error");
    fatherOutput.classList.remove("has-content");
    saveFatherState();
    return;
  }

  const linkVal = fatherLinksInput.value.trim();
  const template =
    `Father's name mismatch. ` +
    (linkVal ? `Per CMS article (${linkVal}), ` : `Per CMS, `) +
    `hit's father's name is ${hitVal}. ` +
    `Per KYC, customer's father's name is ${userVal}. ` +
    `Hence this is a false positive.`;

  fatherOutput.innerText = template;
  fatherOutput.classList.add("has-content");
  fatherOutput.classList.remove("has-error", "neutral");
  saveFatherState();
}

[fatherUserInput, fatherHitInput].forEach(el => {
  el.addEventListener("input", function() {
    const cursorPos = this.selectionStart;
    this.value = capitalizeWords(this.value);
    this.setSelectionRange(cursorPos, cursorPos);
    generateFather();
  });
});

fatherLinksInput.addEventListener("input", () => generateFather());

[idTypeMismatchInput, userIdNumberInput, hitIdNumberInput].forEach(el => {
  el.addEventListener("input", function() {
    if (this === idTypeMismatchInput) {
      const cursorPos = this.selectionStart;
      this.value = this.value.toUpperCase();
      this.setSelectionRange(cursorPos, cursorPos);
    }
    generateIdMismatch();
  });
});

document.getElementById("clearFather").addEventListener("click", () => {
  fatherUserInput.value  = "";
  fatherHitInput.value   = "";
  fatherOutput.innerText = "Template will appear here.";
  fatherOutput.classList.remove("has-content", "has-error");
  localStorage.removeItem(FATHER_KEY);
});

document.getElementById("clearIdMismatch").addEventListener("click", () => {
  idTypeMismatchInput.value = "";
  userIdNumberInput.value   = "";
  hitIdNumberInput.value    = "";
  idMismatchOutput.innerText = "Template will appear here.";
  idMismatchOutput.classList.remove("has-content", "has-error", "neutral");
  localStorage.removeItem(ID_MISMATCH_KEY);
});

// ── NAVIGATION ──
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
  return pages.indexOf(window.location.pathname.split("/").pop());
}

function goNext() {
  const index = getCurrentIndex();
  if (index < pages.length - 1) window.location.href = pages[index + 1];
}

function goPrev() {
  const index = getCurrentIndex();
  if (index > 0) window.location.href = pages[index - 1];
}

function navigateWithAnimation(direction, targetPage) {
  window.location.href = targetPage;
}

window.addEventListener("beforeunload", () => {
  localStorage.setItem("scrollPos:" + location.pathname, window.scrollY);
});

window.addEventListener("load", () => {
  const saved = localStorage.getItem("scrollPos:" + location.pathname);
  if (saved !== null) window.scrollTo(0, parseInt(saved, 10));
});

document.addEventListener("DOMContentLoaded", () => {
  const current = window.location.pathname.split("/").pop().split("?")[0];
  document.querySelectorAll(".navbar a").forEach(link => {
    if (link.getAttribute("href").split("/").pop() === current) {
      link.classList.add("active");
    }
  });
});

// ── LOAD STATE ON PAGE LOAD ──
loadCommonState();
loadFatherState();
loadIdMismatchState();
