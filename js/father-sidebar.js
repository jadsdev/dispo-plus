/*
  father-sidebar.js
  Powers the compact "Father's Name Check" sidebar on maxpenalty.html:
    - Same generation logic as the Father's Name Mismatch card on
      common-name.html, sharing the same localStorage key ("fatherState")
      so both views stay in sync.
    - Collapsible panel matching the other dispo+ sidebars.
    - A playbook search box (backed by playbook-index.js) that shows
      results immediately on focus, and jumps straight to the matching
      entry on playbook.html when clicked.
*/

(function () {
  "use strict";

  const FATHER_KEY = "fatherState"; // shared with common-name.html

  const userInput  = document.getElementById("fatherSbUser");
  const hitInput   = document.getElementById("fatherSbHit");
  const linksInput = document.getElementById("fatherSbLinks");
  const output     = document.getElementById("fatherSbOutput");
  const clearBtn   = document.getElementById("fatherSbClear");
  const copyHint   = document.getElementById("fatherSbCopyHint");

  // sidebar isn't present on this page — bail out quietly
  if (!userInput) return;

  function capitalizeWords(text) {
    return text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // ── ARABIC NAME VARIATIONS (kept in sync with common-name.js) ──
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
    return ARABIC_VARIATIONS.find((group) => group.some((v) => v.toLowerCase() === lower)) || null;
  }

  function isVariation(name1, name2) {
    const group = getVariantGroup(name1);
    if (!group) return false;
    return group.some((v) => v.toLowerCase() === name2.toLowerCase());
  }

  function namesMatch(fullName1, fullName2) {
    const normalize = (value) => value.trim().replace(/\s+/g, " ").toLowerCase();
    return normalize(fullName1) === normalize(fullName2);
  }

  function getVariationMatch(userTokens, hitTokens) {
    const userFirst = userTokens[0];
    const userLast = userTokens[userTokens.length - 1];
    const hitFirst = hitTokens[0];
    const hitLast = hitTokens[hitTokens.length - 1];

    if (!userFirst || !hitFirst || !userLast || !hitLast) return null;

    const firstMatch = isVariation(userFirst, hitFirst);
    const lastExactMatch = userLast.toLowerCase() === hitLast.toLowerCase();

    if (!lastExactMatch) return null;
    if (firstMatch && lastExactMatch) return { userFirst, hitFirst, userLast, hitLast };
    return null;
  }

  // ── STATE (shared with common-name.html's Father's Name card) ──
  function saveFatherState() {
    localStorage.setItem(
      FATHER_KEY,
      JSON.stringify({
        user: userInput.value,
        hit: hitInput.value,
        links: linksInput.value,
        output: output.innerText,
        isError: output.classList.contains("has-error"),
        isNeutral: output.classList.contains("neutral"),
      })
    );
  }

  function loadFatherState() {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(FATHER_KEY));
    } catch (err) {
      saved = null;
    }
    if (!saved) return;

    userInput.value = saved.user || "";
    hitInput.value = saved.hit || "";
    linksInput.value = saved.links || "";
    output.innerText = saved.output || "Template will appear here.";

    output.classList.remove("has-error", "has-content", "neutral");
    if (saved.isError) {
      output.classList.add("has-error");
    } else if (saved.isNeutral) {
      output.classList.add("neutral");
    } else if (saved.output && saved.output !== "Template will appear here.") {
      output.classList.add("has-content");
    }
  }

  function generateFather() {
    const userVal = userInput.value.trim();
    const hitVal = hitInput.value.trim();

    if (!userVal && !hitVal) {
      output.innerText = "Template will appear here.";
      output.classList.remove("has-content", "has-error", "neutral");
      saveFatherState();
      return;
    }

    if (!userVal || !hitVal) {
      output.innerHTML = `<span class="neutral-text">Please fill in both Father's Name fields.</span>`;
      output.classList.remove("has-content", "has-error");
      output.classList.add("neutral");
      saveFatherState();
      return;
    }

    if (namesMatch(userVal, hitVal)) {
      output.innerHTML = `<span class="error-text">ERROR: Father's names are an exact match. This cannot be used as a false positive disposition.</span>`;
      output.classList.add("has-error");
      output.classList.remove("has-content");
      saveFatherState();
      return;
    }

    const userTokens = userVal.split(/\s+/);
    const hitTokens = hitVal.split(/\s+/);
    const variationMatch = getVariationMatch(userTokens, hitTokens);

    if (variationMatch) {
      output.innerHTML = `<span class="error-text">ERROR: "${variationMatch.userFirst}" → "${variationMatch.hitFirst}" are known Arabic name variations in matching positions. This cannot be used as a false positive disposition.</span>`;
      output.classList.add("has-error");
      output.classList.remove("has-content");
      saveFatherState();
      return;
    }

    const linkVal = linksInput.value.trim();
    const template =
      `Father's name mismatch. ` +
      (linkVal ? `Per CMS article (${linkVal}), ` : `Per CMS, `) +
      `hit's father's name is ${hitVal}. ` +
      `Per KYC, customer's father's name is ${userVal}. ` +
      `Hence this is a false positive.`;

    output.innerText = template;
    output.classList.add("has-content");
    output.classList.remove("has-error", "neutral");
    saveFatherState();
  }

  [userInput, hitInput].forEach((el) => {
    el.addEventListener("input", function () {
      const cursorPos = this.selectionStart;
      this.value = capitalizeWords(this.value);
      this.setSelectionRange(cursorPos, cursorPos);
      generateFather();
    });
  });

  linksInput.addEventListener("input", () => generateFather());

  clearBtn.addEventListener("click", () => {
    userInput.value = "";
    hitInput.value = "";
    linksInput.value = "";
    output.innerText = "Template will appear here.";
    output.classList.remove("has-content", "has-error", "neutral");
    localStorage.removeItem(FATHER_KEY);
  });

  output.addEventListener("click", () => {
    if (!output.classList.contains("has-content")) return;
    navigator.clipboard.writeText(output.innerText);

    const original = copyHint.innerHTML;
    copyHint.classList.add("copied-flash");
    copyHint.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg> copied`;

    clearTimeout(copyHint._resetTimer);
    copyHint._resetTimer = setTimeout(() => {
      copyHint.classList.remove("copied-flash");
      copyHint.innerHTML = original;
    }, 1200);
  });

  loadFatherState();

  // ── PLAYBOOK SEARCH ──
  // The list is always visible (not a popup), so it's browsable
  // at a glance even before typing anything.
  const searchInput = document.getElementById("fatherPlaybookSearch");
  const dropdown = document.getElementById("fatherPlaybookDropdown");
  const playbookIndex = window.playbookIndex || [];

  if (searchInput && dropdown && playbookIndex.length) {
    function renderResults(query) {
      const q = query.trim().toLowerCase();
      const matches = q
        ? playbookIndex.filter((item) => item.title.toLowerCase().includes(q))
        : playbookIndex; // full list by default

      if (!matches.length) {
        dropdown.innerHTML = `<div class="father-search-empty">No matching entries.</div>`;
        return;
      }

      dropdown.innerHTML = matches
        .map(
          (item) => `
        <div class="father-search-item" data-title="${item.title.replace(/"/g, "&quot;")}">
          <span class="fsi-title">${item.title}</span>
          <span class="fsi-tag ${item.section}">${item.section === "standalone" ? "SA" : "SUP"}</span>
        </div>
      `
        )
        .join("");

      dropdown.querySelectorAll(".father-search-item").forEach((el) => {
        el.addEventListener("click", () => {
          const title = el.dataset.title;
          const item = playbookIndex.find((i) => i.title === title);
          if (item) openTemplateModal(item);
        });
      });
    }

    searchInput.addEventListener("input", () => renderResults(searchInput.value));

    renderResults(""); // show the full list right away, before any typing
  }

  // ── TEMPLATE PREVIEW MODAL ──
  const ptOverlay = document.getElementById("ptModalOverlay");
  const ptTitle = document.getElementById("ptModalTitle");
  const ptTemplate = document.getElementById("ptModalTemplate");
  const ptNote = document.getElementById("ptModalNote");
  const ptClose = document.getElementById("ptModalClose");
  const ptCopyHint = document.getElementById("ptModalCopyHint");

  function openTemplateModal(item) {
    if (!ptOverlay) return;
    ptTitle.textContent = item.title;
    ptTemplate.textContent = item.template || "No sample disposition on file for this entry.";
    if (item.note) {
      ptNote.textContent = "Note: " + item.note;
      ptNote.hidden = false;
    } else {
      ptNote.hidden = true;
    }
    ptOverlay.classList.add("open");
  }

  function closeTemplateModal() {
    if (!ptOverlay) return;
    ptOverlay.classList.remove("open");
  }

  if (ptOverlay) {
    if (ptClose) ptClose.addEventListener("click", closeTemplateModal);

    ptOverlay.addEventListener("click", (e) => {
      if (e.target === ptOverlay) closeTemplateModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeTemplateModal();
    });

    if (ptTemplate) {
      ptTemplate.addEventListener("click", () => {
        navigator.clipboard.writeText(ptTemplate.textContent);
        const original = ptCopyHint.innerHTML;
        ptCopyHint.classList.add("copied-flash");
        ptCopyHint.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg> copied`;
        clearTimeout(ptCopyHint._resetTimer);
        ptCopyHint._resetTimer = setTimeout(() => {
          ptCopyHint.classList.remove("copied-flash");
          ptCopyHint.innerHTML = original;
        }, 1200);
      });
    }
  }
})();
