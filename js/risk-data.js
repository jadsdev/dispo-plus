/* =============================================
   RISK SIDEBAR — icon constants
   (local copies so this file has no dependency
   on maxpenalty.js being loaded on this page)
   ============================================= */
   const RISK_EYE_OPEN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
   const RISK_EYE_CLOSED = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
   
   /* =============================================
      RISK RATING REFERENCE DATA
      ============================================= */
   const riskRatingData = [
   
     { reason: "Aircraft Hijacking and Aviation Crime", risk: "High" },
     { reason: "Crimes Against the State", risk: "High" },
     { reason: "Explicit Sanctions", risk: "High" },
     { reason: "Exploitation of Children", risk: "High" },
     { reason: "Forced and Slave Labour", risk: "High" },
     { reason: "Former Explicit Sanctions", risk: "High" },
     { reason: "Former Implicit Sanctions", risk: "High" },
     { reason: "Hate Crime", risk: "High" },
     { reason: "Human Trafficking", risk: "High" },
     { reason: "Implicit Sanctions", risk: "High" },
     { reason: "Sanctions Related", risk: "High" },
     { reason: "Smuggling (human/drug)", risk: "High" },
     { reason: "Terror Related", risk: "High" },
     { reason: "Violent Crime", risk: "High" },
     { reason: "War Crime", risk: "High" },
   
     { reason: "Absconder or Fugitive", risk: "High", note: "If a confirmed fugitive" },
     { reason: "Absconder or Fugitive", risk: "Medium", note: "If an unconfirmed fugitive" },
   
     { reason: "Arms and Ammunition Possession", risk: "High" },
     { reason: "Arms and Ammunition Trafficking", risk: "Medium" },
   
     { reason: "Narcotics Trafficking", risk: "High", note: "Determine materiality of news (involvement, fact/speculation, resolution, credibility) — high-risk if material" },
     { reason: "Narcotics Trafficking", risk: "Medium", note: "Medium-risk if immaterial" },
   
     { reason: "Organized Crime", risk: "High", note: "Determine materiality of news (involvement, fact/speculation, resolution, credibility) — high-risk if material" },
     { reason: "Organized Crime", risk: "Medium", note: "Medium-risk if immaterial" },
   
     { reason: "Pharmaceutical Trafficking", risk: "High", note: "Determine materiality of news — high-risk if material" },
     { reason: "Pharmaceutical Trafficking", risk: "Medium", note: "Medium-risk if immaterial. Low-level drug activity is not high-risk (corner dealing vs. global/national trafficking)." },
   
     { reason: "Sexual Exploitation", risk: "High", note: "If involving a minor" },
     { reason: "Sexual Exploitation", risk: "Medium", note: "If not involving a minor" },
   
     { reason: "Bribery and Corruption", risk: "Medium", note: "Convicted" },
     { reason: "Bribery and Corruption", risk: "Low", note: "Indicted/charged but not convicted" },
   
     { reason: "Consumer Protection Violation", risk: "Medium", note: "Criminal case" },
     { reason: "Consumer Protection Violation", risk: "Low", note: "Civil case" },
     { reason: "Control or Regulation Violation", risk: "Medium", note: "Criminal case" },
     { reason: "Control or Regulation Violation", risk: "Low", note: "Civil case" },
     { reason: "Disciplinary Action", risk: "Medium", note: "Criminal case" },
     { reason: "Disciplinary Action", risk: "Low", note: "Civil case" },
   
     { reason: "Fraud", risk: "Medium", note: "Convicted" },
     { reason: "Fraud", risk: "Low", note: "Indicted/charged but not convicted" },
   
     { reason: "Extortion", risk: "Medium", note: "Convicted" },
     { reason: "Extortion", risk: "Low", note: "Indicted/charged but not convicted" },
   
     { reason: "Frozen and Seized Assets", risk: "Medium", note: "Convicted" },
     { reason: "Frozen and Seized Assets", risk: "Low", note: "Indicted/charged but not convicted" },
   
     { reason: "Illegal Gambling", risk: "Medium", note: "Convicted" },
     { reason: "Illegal Gambling", risk: "Low", note: "Indicted/charged but not convicted" },
   
     { reason: "Illegal Restraint or Kidnapping", risk: "Medium", note: "Convicted" },
     { reason: "Illegal Restraint or Kidnapping", risk: "Low", note: "Indicted/charged but not convicted" },
   
     { reason: "Money Laundering", risk: "Medium", note: "Convicted" },
     { reason: "Money Laundering", risk: "Low", note: "Indicted/charged but not convicted" },
   
     { reason: "Theft and Embezzlement", risk: "Medium", note: "Above $10k" },
     { reason: "Theft and Embezzlement", risk: "Low", note: "Under $10k" },
   
     { reason: "Unlawful Money Lending", risk: "Medium", note: "Convicted (e.g. loan shark)" },
     { reason: "Unlawful Money Lending", risk: "Low", note: "Indicted/charged but not convicted" },
   
     { reason: "Wildlife Crime", risk: "Medium" },
   
     { reason: "Abuse of Office", risk: "Low" },
     { reason: "Antitrust Violation or Unlawful Competition", risk: "Low" },
     { reason: "Arson and Destruction of Property", risk: "Low" },
     { reason: "Breach of Fiduciary Duty", risk: "Low" },
     { reason: "Counterfeiting or Piracy", risk: "Low" },
     { reason: "Cybercrime", risk: "Low" },
     { reason: "Data Privacy Breach", risk: "Low" },
     { reason: "Deported or Exiled", risk: "Low" },
     { reason: "Disqualified and Debarred", risk: "Low" },
     { reason: "Dissolved Company", risk: "Low" },
     { reason: "Energy Crime", risk: "Low" },
     { reason: "Environmental Crime", risk: "Low" },
     { reason: "Financial Services Warning", risk: "Low" },
     { reason: "Forgery and Uttering", risk: "Low" },
     { reason: "Healthcare Fraud", risk: "Low" },
     { reason: "Illegal Immigration", risk: "Low" },
     { reason: "Illegal Possession or Sale", risk: "Low" },
     { reason: "Insider Trading", risk: "Low" },
     { reason: "Insolvency, Liquidation or Bankruptcy", risk: "Low" },
     { reason: "IP Rights Infringement", risk: "Low" },
     { reason: "Labour Rights Violation", risk: "Low" },
     { reason: "Licence Revocation", risk: "Low" },
     { reason: "Obstruction of Justice", risk: "Low" },
     { reason: "Other", risk: "Low" },
     { reason: "Securities Violation", risk: "Low" },
     { reason: "Smuggling (all others)", risk: "Low" },
     { reason: "Tax and Customs Violation", risk: "Low" },
     { reason: "Tender Violation and Restrictions", risk: "Low" },
     { reason: "Trafficking in Stolen Goods", risk: "Low" },
     { reason: "Travel or Visa Restriction", risk: "Low" },
   
     { reason: "Aiding and Abetting", risk: "TBD", note: "Risk rating should be based on the crime / sub-category (e.g. Terrorism)" },
     { reason: "Conspiracy or Collusion", risk: "TBD", note: "Risk rating should be based on the crime / sub-category (e.g. Terrorism)" },
     { reason: "Human Rights Violation", risk: "TBD", note: "Risk rating should be based on the crime / sub-category (e.g. genocide, torture, arbitrary arrest)" },
   
     { reason: "PEP", risk: "N/A", note: "Risk irrelevant; review is not required" }
   ];
   
   /* =============================================
      RISK SIDEBAR — render, search, collapse
      ============================================= */
   const RISK_SIDEBAR_STATE_KEY = "riskSidebarCollapsed";
   
   function renderRiskList(filterText = "") {
     const list = document.getElementById("riskList");
     if (!list) return;
   
     const q = filterText.trim().toLowerCase();
     const filtered = q
       ? riskRatingData.filter(item => item.reason.toLowerCase().includes(q))
       : riskRatingData;
   
     if (filtered.length === 0) {
       list.innerHTML = `<div class="risk-empty">No matching reasons.</div>`;
       return;
     }
   
     list.innerHTML = filtered.map(item => `
       <div class="risk-item" data-risk="${item.risk}">
         <div class="risk-item-top">
           <span class="risk-item-name">${item.reason}</span>
           <span class="risk-badge ${item.risk === 'N/A' ? 'NA' : item.risk}">${item.risk}</span>
         </div>
         ${item.note ? `<div class="risk-item-note">${item.note}</div>` : ""}
       </div>
     `).join("");
   }
   
   /* =============================================
      RISK SIDEBAR — toggle + state
      ============================================= */
   function toggleRiskSidebar(e) {
     if (e) e.stopPropagation();
   
     const sidebar = document.getElementById("riskSidebar");
     const btn     = document.getElementById("riskSidebarToggle");
     if (!sidebar || !btn) return;
   
     const isNowCollapsed = sidebar.classList.toggle("collapsed");
     btn.innerHTML = isNowCollapsed ? RISK_EYE_CLOSED : RISK_EYE_OPEN;
     localStorage.setItem(RISK_SIDEBAR_STATE_KEY, isNowCollapsed ? "1" : "0");
   }
   
   function restoreRiskSidebarState() {
     const sidebar = document.getElementById("riskSidebar");
     const btn     = document.getElementById("riskSidebarToggle");
     if (!sidebar || !btn) return;
   
     if (localStorage.getItem(RISK_SIDEBAR_STATE_KEY) === "1") {
       sidebar.classList.add("collapsed");
       btn.innerHTML = RISK_EYE_CLOSED;
     } else {
       btn.innerHTML = RISK_EYE_OPEN;
     }
   }
   
   /* =============================================
      RISK SIDEBAR — click handlers
      ============================================= */
   
   // The small arrow/eye button
   function attachRiskSidebarToggleButton() {
     const btn = document.getElementById("riskSidebarToggle");
     if (!btn) return;
     btn.addEventListener("click", (e) => toggleRiskSidebar(e));
   }
   
   // Clicking the "Risk Rating Reference" header row toggles it
   function attachRiskSidebarHeaderToggle() {
     const header = document.getElementById("riskSidebarHeader");
     if (!header) return;
     header.addEventListener("click", () => toggleRiskSidebar());
   }
   
   // While collapsed, clicking anywhere on the sidebar strip expands it
   function attachRiskSidebarExpandOnClick() {
     const sidebar = document.getElementById("riskSidebar");
     if (!sidebar) return;
   
     sidebar.addEventListener("click", (e) => {
       if (!sidebar.classList.contains("collapsed")) return;
       if (e.target.closest("#riskSidebarToggle")) return;
       toggleRiskSidebar();
     });
   }
   
   /* =============================================
      INIT
      ============================================= */
   document.addEventListener("DOMContentLoaded", () => {
     renderRiskList();
     restoreRiskSidebarState();
     attachRiskSidebarToggleButton();
     attachRiskSidebarHeaderToggle();
     attachRiskSidebarExpandOnClick();
   
     const searchInput = document.getElementById("riskSearch");
     if (searchInput) {
       searchInput.addEventListener("input", () => renderRiskList(searchInput.value));
     }
   });