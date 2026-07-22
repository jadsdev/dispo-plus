const ACCORDION_KEY = "playbookAccordionState";

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

  const el = document.getElementById("timeBar");
  if (el) el.textContent = `${date} | PHT: ${pht} | Dublin: ${dublin}`;
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

/* =========================
   CLICK-TO-COPY SAMPLE DISPOSITION
========================= */
function copyDisposition(el) {
  const text = el.textContent.trim();
  navigator.clipboard.writeText(text);

  el.classList.add("copied");
  clearTimeout(el._copyTimeout);
  el._copyTimeout = setTimeout(() => {
    el.classList.remove("copied");
  }, 1000);
}

/* =========================
   NAVIGATION ARROWS
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
   ACTIVE NAV
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const current = window.location.pathname.split("/").pop();

  document.querySelectorAll(".navbar a").forEach(a => {
    if (a.getAttribute("href") === current) {
      a.classList.add("active");
    }
  });
});


/* =========================
   ACCORDION TOGGLE
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const accordion = document.querySelector(".accordion");
  if (!accordion) return;

  loadAccordionState();

  accordion.addEventListener("click", (e) => {
    const header = e.target.closest(".acc-header");
    if (!header) return;

    const item = header.closest(".acc-item");

    if (item) {
      item.classList.toggle("open");
      saveAccordionState();
    }
  });
});

/* =========================
   SAVE ACCORDION STATE
========================= */

function saveAccordionState() {
  const state = Array.from(document.querySelectorAll(".acc-item")).map(item => {
    return item.classList.contains("open");
  });

  localStorage.setItem(ACCORDION_KEY, JSON.stringify(state));
}


function loadAccordionState() {
  const saved = localStorage.getItem(ACCORDION_KEY);

  if (!saved) return;

  const state = JSON.parse(saved);

  document.querySelectorAll(".acc-item").forEach((item, index) => {
    if (state[index]) {
      item.classList.add("open");
    } else {
      item.classList.remove("open");
    }
  });
}

/* =========================
   FILTER CHIPS (new)
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const chips = document.querySelectorAll(".filter-chip");
  if (!chips.length) return;

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");

      const filter = chip.dataset.filter;

      document.querySelectorAll(".acc-item").forEach(item => {
        const match = filter === "all" || item.dataset.section === filter;
        item.style.display = match ? "" : "none";
      });

      document.querySelectorAll(".acc-section-label").forEach(label => {
        const section = label.classList.contains("standalone") ? "standalone" : "supplemental";
        const match = filter === "all" || filter === section;
        label.style.display = match ? "" : "none";
      });
    });
  });
});

/* =========================
   EXPAND ALL / COLLAPSE ALL (new)
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const expandBtn = document.getElementById("expandAllBtn");
  const collapseBtn = document.getElementById("collapseAllBtn");

  if (expandBtn) {
    expandBtn.addEventListener("click", () => {
      document.querySelectorAll(".acc-item").forEach(item => item.classList.add("open"));
saveAccordionState();
    });
  }

  if (collapseBtn) {
    collapseBtn.addEventListener("click", () => {
      document.querySelectorAll(".acc-item").forEach(item => item.classList.remove("open"));
saveAccordionState();
    });
  }
});

/* =========================
 SEARCH SYSTEM (DROPDOWN + ENTER)
========================= */

const searchInput = document.getElementById("playbookSearch");
const dropdown = document.getElementById("searchDropdown");

let searchItems = [];
let activeIndex = -1;

function buildSearchIndex() {
searchItems = Array.from(document.querySelectorAll(".acc-item")).map(item => {
  const title = item.querySelector(".acc-header")?.innerText || "";
  return { title, element: item };
});
}

function renderDropdown(value) {
dropdown.innerHTML = "";
activeIndex = -1;

if (!value) {
  dropdown.style.display = "none";
  return;
}

const matches = searchItems.filter(i =>
  i.title.toLowerCase().includes(value.toLowerCase())
);

if (!matches.length) {
  dropdown.style.display = "none";
  return;
}

matches.forEach((item, index) => {
  const div = document.createElement("div");
  div.className = "search-item";
  div.textContent = item.title;

  div.dataset.index = index;

  div.onclick = () => {
    selectItem(item);
  };

  dropdown.appendChild(div);
});

dropdown.style.display = "block";
}

function selectItem(item) {
searchInput.value = item.title;
hideDropdown();

// Reset any active filter so the matched item is guaranteed visible
document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
const allChip = document.querySelector('.filter-chip[data-filter="all"]');
if (allChip) allChip.classList.add("active");
document.querySelectorAll(".acc-item").forEach(i => (i.style.display = ""));
document.querySelectorAll(".acc-section-label").forEach(l => (l.style.display = ""));

// Open the matched entry so its content is visible, not just its title
item.element.classList.add("open");

scrollToItem(item.element);
}

function scrollToItem(el) {
el.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideDropdown() {
dropdown.style.display = "none";
activeIndex = -1;
}

/* =========================
 KEYBOARD NAVIGATION
========================= */

function updateActive() {
const items = dropdown.querySelectorAll(".search-item");

items.forEach((el, i) => {
  el.classList.toggle("active", i === activeIndex);
});
}

searchInput.addEventListener("input", (e) => {
renderDropdown(e.target.value);
});

searchInput.addEventListener("keydown", (e) => {
const items = dropdown.querySelectorAll(".search-item");

if (!items.length) return;

if (e.key === "ArrowDown") {
  e.preventDefault();
  activeIndex = (activeIndex + 1) % items.length;
  updateActive();
}

if (e.key === "ArrowUp") {
  e.preventDefault();
  activeIndex = (activeIndex - 1 + items.length) % items.length;
  updateActive();
}

if (e.key === "Enter") {
  e.preventDefault();

  if (activeIndex >= 0) {
    const item = searchItems.filter(i =>
      i.title.toLowerCase().includes(searchInput.value.toLowerCase())
    )[activeIndex];

    if (item) {
      selectItem(item);
    }
  } else if (items.length > 0) {
    items[0].click();
  }
}

if (e.key === "Escape") {
  hideDropdown();
}
});

/* click outside closes */
document.addEventListener("click", (e) => {
if (!e.target.closest(".search-wrapper")) {
  hideDropdown();
}
});

/* init */
buildSearchIndex();

/* =========================
   DEEP LINK FROM OTHER PAGES (?entry=...)
   Lets other pages (e.g. maxpenalty.html's Father's Name
   sidebar search) link straight to a specific playbook entry.
========================= */
(function openDeepLinkedEntry() {
  const params = new URLSearchParams(window.location.search);
  const entryTitle = params.get("entry");
  if (!entryTitle) return;

  const match = searchItems.find((i) => i.title.trim() === entryTitle.trim());
  if (match) {
    selectItem(match);
  }
})();