/*
  image-export.js
  Add images via click-upload, drag & drop, or paste (Ctrl+V).
  Caption each one, arrange order, then export as a single PDF
  laid out in a grid (2 / 4 / 6 / 9 per page).
*/

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
  const current = window.location.pathname.split("/").pop() || "../index.html";
  document.querySelectorAll(".tab-item").forEach(tab => {
    if (tab.dataset.page === current) {
      tab.classList.add("active");
    }
  });
})();

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

(function () {
  "use strict";

  // ---------- state ----------
  // each item: { id, dataUrl, caption, naturalWidth, naturalHeight }
  let images = JSON.parse(localStorage.getItem("jpgpdf_images")) || [];

  // ---------- element refs ----------
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const imageGrid = document.getElementById("imageGrid");
  const emptyState = document.getElementById("emptyState");
  const layoutSelect = document.getElementById("layoutSelect");
  const filenameInput = document.getElementById("filenameInput");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const generateBtn = document.getElementById("generateBtn");
  const toast = document.getElementById("toast");

  // ---------- helpers ----------
  function uid() {
    return (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(16).slice(2));
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function getImageDimensions(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = dataUrl;
    });
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;

    for (const file of files) {
      try {
        const dataUrl = await readFileAsDataURL(file);
        const dims = await getImageDimensions(dataUrl);
        images.push({
          id: uid(),
          dataUrl,
          caption: "",
          naturalWidth: dims.w,
          naturalHeight: dims.h,
        });

        saveImages();

      } catch (err) {
        console.error("Could not read image:", err);
      }
    }
    render();
  }

  function saveImages() {
    localStorage.setItem("jpgpdf_images", JSON.stringify(images));
  }

  // ---------- filename persistence ----------
  function saveFilename() {
    localStorage.setItem("jpgpdf_filename", filenameInput.value || "");
  }

  function restoreFilename() {
    const saved = localStorage.getItem("jpgpdf_filename");
    if (saved !== null) filenameInput.value = saved;
  }

  filenameInput.addEventListener("input", saveFilename);

  // ---------- rendering ----------
  function render() {
    if (!images.length) {
      imageGrid.hidden = true;
      emptyState.hidden = false;
      generateBtn.disabled = true;
      imageGrid.innerHTML = "";
      return;
    }

    emptyState.hidden = true;
    imageGrid.hidden = false;
    generateBtn.disabled = false;

    imageGrid.innerHTML = "";
    images.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "image-card";
      card.dataset.id = item.id;

      card.innerHTML = `
        <div class="thumb-wrap">
          <img src="${item.dataUrl}" alt="Uploaded image ${index + 1}">
        </div>
        <div class="card-body">
          <input
            type="text"
            class="caption-input"
            placeholder="Add a caption..."
            value="${escapeHtml(item.caption)}"
          >
          <div class="card-actions">
            <div class="order-btns">
              <button type="button" class="icon-btn move-up" title="Move earlier" ${index === 0 ? "disabled" : ""}>&uarr;</button>
              <button type="button" class="icon-btn move-down" title="Move later" ${index === images.length - 1 ? "disabled" : ""}>&darr;</button>
            </div>
            <button type="button" class="icon-btn remove" title="Remove">&times;</button>
          </div>
        </div>
      `;

      card.querySelector(".caption-input").addEventListener("input", (e) => {
  item.caption = e.target.value;
  saveImages();
});
      card.querySelector(".move-up").addEventListener("click", () => moveImage(item.id, -1));
      card.querySelector(".move-down").addEventListener("click", () => moveImage(item.id, 1));
      card.querySelector(".remove").addEventListener("click", () => removeImage(item.id));

      imageGrid.appendChild(card);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function moveImage(id, direction) {
    const idx = images.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= images.length) return;
    [images[idx], images[newIdx]] = [images[newIdx], images[idx]];
    saveImages();
    render();
  }

  function removeImage(id) {
    images = images.filter((i) => i.id !== id);
    saveImages();
    render();
  }

  // ---------- input handlers ----------
  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener("change", (e) => {
    addFiles(e.target.files);
    fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) {
      addFiles(dt.files);
    }
  });

  document.addEventListener("paste", (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    const files = [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length) {
      e.preventDefault();
      addFiles(files);
      showToast(files.length > 1 ? "Images pasted" : "Image pasted");
    }
  });

  clearAllBtn.addEventListener("click", () => {
    if (confirm("Remove all added images?")) {
      images = [];
  
      // Clear filename input
      filenameInput.value = "";
  
      // Remove saved filename
      localStorage.removeItem("jpgpdf_filename");
  
      saveImages();
      render();
  
      showToast("Cleared");
    }
  });

  // ---------- PDF generation ----------
  const LAYOUTS = {
    "2": { cols: 1, rows: 2 },
    "4": { cols: 2, rows: 2 },
    "6": { cols: 2, rows: 3 },
    "9": { cols: 3, rows: 3 },
  };

  function detectImageFormat(dataUrl) {
    if (dataUrl.startsWith("data:image/png")) return "PNG";
    if (dataUrl.startsWith("data:image/webp")) return "WEBP";
    return "JPEG";
  }

  generateBtn.addEventListener("click", () => {
    if (!images.length) return;

    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      showToast("PDF library failed to load — check your connection");
      return;
    }

    const layoutKey = layoutSelect.value;
    const { cols, rows } = LAYOUTS[layoutKey];
    const perPage = cols * rows;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const cellPad = 3;
    const captionHeight = 8;

    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const cellWidth = usableWidth / cols;
    const cellHeight = usableHeight / rows;
    const imgAreaHeight = cellHeight - captionHeight;

    images.forEach((item, index) => {
      const posInPage = index % perPage;

      if (index > 0 && posInPage === 0) {
        doc.addPage();
      }

      const col = posInPage % cols;
      const row = Math.floor(posInPage / cols);

      const cellX = margin + col * cellWidth;
      const cellY = margin + row * cellHeight;

      // fit image within the cell's image area, preserving aspect ratio
      const maxW = cellWidth - cellPad * 2;
      const maxH = imgAreaHeight - cellPad * 2;
      const ratio = Math.min(maxW / item.naturalWidth, maxH / item.naturalHeight);
      const drawW = item.naturalWidth * ratio;
      const drawH = item.naturalHeight * ratio;

      const drawX = cellX + (cellWidth - drawW) / 2;
      const drawY = cellY + (imgAreaHeight - drawH) / 2;

      try {
        doc.addImage(item.dataUrl, detectImageFormat(item.dataUrl), drawX, drawY, drawW, drawH);
      } catch (err) {
        console.error("Failed to add image to PDF:", err);
      }

      // caption
      const caption = (item.caption || "").trim();
      if (caption) {
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        const captionY = cellY + imgAreaHeight + 5;
        const lines = doc.splitTextToSize(caption, cellWidth - cellPad * 2);
        doc.text(lines[0], cellX + cellWidth / 2, captionY, { align: "center" });
      }
    });

    const rawName = (filenameInput.value || "images-export").trim().replace(/\.pdf$/i, "");
    doc.save(`${rawName || "images-export"}.pdf`);
    showToast("PDF generated");
  });

  // ---------- init ----------
  restoreFilename();
  render();
})();