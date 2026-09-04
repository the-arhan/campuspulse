// ============================================================
// CampusPulse — app.js
// Application state + rendering + event handling.
// Data comes only through CampusPulseAPI (api.js) — nothing in
// here touches localStorage directly, so swapping the API layer
// for real network calls later doesn't require changes here.
// ============================================================

const state = {
  issues: [],
  identity: null,
  view: "pulse",
  filters: { category: "all", sort: "priority", search: "" },
  exploreFilters: { category: "all", search: "" },
  reportDraft: { category: null, title: "", description: "", location: "", triedBefore: "", urgency: 3 },
  reportStep: 1,
  activeIssueId: null
};

const URGENCY_LABELS = { 1: "Minor", 2: "Worth flagging", 3: "Notable", 4: "Urgent", 5: "Critical" };

// ============================================================
// Utilities
// ============================================================
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function timeAgo(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function statusLabel(status) {
  return { "new": "New", "in-review": "Under review", "in-progress": "In progress", "resolved": "Resolved" }[status] || status;
}

function priorityScore(issue) {
  const statusWeight = { "new": 3, "in-review": 2, "in-progress": 1, "resolved": -6 };
  return issue.urgency * 12 + issue.affectedCount + (statusWeight[issue.status] || 0) * 4;
}

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function animateCounter(el, target) {
  const start = 0;
  if (prefersReducedMotion() || target === 0) { el.textContent = target.toLocaleString(); return; }
  const duration = 600;
  const startTime = performance.now();
  function tick(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased).toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.hidden = true; }, 2600);
}

function debounce(fn, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function findIssue(id) { return state.issues.find(i => i.id === id); }

// ============================================================
// Issue card rendering (shared by Pulse / Explore / Insights / Activity)
// ============================================================
function issueCardHTML(issue) {
  const cat = getCategory(issue.category);
  return `
    <article class="issue-card" data-id="${issue.id}" tabindex="0" role="button" aria-label="Open: ${escapeHtml(issue.title)}">
      <div class="issue-card-tags">
        <span class="tag category-${cat.id}">${cat.icon} ${escapeHtml(cat.label)}</span>
        <span class="status-pill status-${issue.status}">${statusLabel(issue.status)}</span>
      </div>
      <div class="issue-card-title">${escapeHtml(issue.title)}</div>
      <div class="issue-card-desc">${escapeHtml(issue.description)}</div>
      <div class="issue-card-footer">
        <div class="issue-card-meta">
          <span>📍 ${escapeHtml(issue.location)}</span>
          <span>${timeAgo(issue.createdAt)}</span>
          ${issue.solutions.length ? `<span class="solutions-indicator">💡 ${issue.solutions.length} solution${issue.solutions.length > 1 ? "s" : ""}</span>` : ""}
        </div>
        <button class="affected-btn ${CampusPulseAPI.isAffectedByMe(issue.id) ? "marked" : ""}" data-affected-id="${issue.id}" type="button">
          <span class="bolt">⚡</span><span class="affected-count">${issue.affectedCount}</span>
        </button>
      </div>
    </article>
  `;
}

// ============================================================
// PULSE view
// ============================================================
function renderHappeningNow() {
  const top = [...state.issues].sort((a, b) => b.affectedCount - a.affectedCount).slice(0, 6);
  document.getElementById("happeningNowList").innerHTML = top.map(issueCardHTML).join("");
}

function renderSurvivalGrid() {
  document.getElementById("survivalGrid").innerHTML = FIRST_YEAR_TOPICS.map(topic => `
    <button class="survival-chip" type="button" data-query="${escapeHtml(topic.query)}">
      <span class="icon">${topic.icon}</span>
      <span class="label">${escapeHtml(topic.label)}</span>
    </button>
  `).join("");
}

function matchesSearch(issue, term) {
  if (!term) return true;
  const haystack = `${issue.title} ${issue.description} ${issue.location}`.toLowerCase();
  return haystack.includes(term.toLowerCase());
}

function getFilteredSortedFeed() {
  const { category, sort, search } = state.filters;
  let list = state.issues.filter(i => (category === "all" || i.category === category) && matchesSearch(i, search));

  if (sort === "recent") list = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  else if (sort === "affected") list = list.sort((a, b) => b.affectedCount - a.affectedCount);
  else if (sort === "solved") list = list.filter(i => i.status === "resolved").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  else list = list.sort((a, b) => priorityScore(b) - priorityScore(a));

  return list;
}

function renderFeed() {
  const list = getFilteredSortedFeed();
  const feedList = document.getElementById("feedList");
  const empty = document.getElementById("feedEmpty");
  if (list.length === 0) { feedList.innerHTML = ""; empty.hidden = false; return; }
  empty.hidden = true;
  feedList.innerHTML = list.map(issueCardHTML).join("");
}

async function showFeedSkeleton(ms) {
  const skeleton = document.getElementById("feedSkeleton");
  const list = document.getElementById("feedList");
  skeleton.hidden = false;
  list.hidden = true;
  await new Promise(r => setTimeout(r, ms));
  skeleton.hidden = true;
  list.hidden = false;
}

// ============================================================
// EXPLORE view
// ============================================================
function renderCategoryGrid() {
  const counts = {};
  state.issues.forEach(i => { counts[i.category] = (counts[i.category] || 0) + 1; });

  const tiles = [{ id: "all", label: "All", icon: "🗂️" }, ...CATEGORIES].map(cat => {
    const isAll = cat.id === "all";
    const count = isAll ? state.issues.length : (counts[cat.id] || 0);
    const active = state.exploreFilters.category === cat.id;
    return `
      <button class="category-tile ${active ? "active" : ""}" type="button" data-explore-category="${cat.id}">
        <span class="icon">${cat.icon}</span>
        <span class="label">${escapeHtml(cat.label)}</span>
        <span class="count">${count} issue${count === 1 ? "" : "s"}</span>
      </button>
    `;
  }).join("");
  document.getElementById("categoryGrid").innerHTML = tiles;
}

function renderExploreList() {
  const { category, search } = state.exploreFilters;
  const list = state.issues
    .filter(i => (category === "all" || i.category === category) && matchesSearch(i, search))
    .sort((a, b) => priorityScore(b) - priorityScore(a));

  const heading = document.getElementById("exploreResultsHeading");
  heading.textContent = category === "all" ? "All issues" : getCategory(category).label;

  const exploreList = document.getElementById("exploreList");
  const empty = document.getElementById("exploreEmpty");
  if (list.length === 0) { exploreList.innerHTML = ""; empty.hidden = false; return; }
  empty.hidden = true;
  exploreList.innerHTML = list.map(issueCardHTML).join("");
}

// ============================================================
// INSIGHTS view
// ============================================================
async function renderInsights() {
  const insights = await CampusPulseAPI.getInsights();

  const statCards = [
    { num: insights.total, label: "Total problems shared" },
    { num: insights.totalAffected, label: "Students represented" },
    { num: insights.totalSolutions, label: "Solutions contributed" },
    { num: insights.resolved, label: "Marked resolved" }
  ];
  document.getElementById("insightStats").innerHTML = statCards.map(s => `
    <div class="insight-stat-card">
      <div class="num" data-count="${s.num}">0</div>
      <div class="label">${s.label}</div>
    </div>
  `).join("");
  document.querySelectorAll("#insightStats .num").forEach(el => animateCounter(el, Number(el.dataset.count)));

  // most reported this week
  const weekList = document.getElementById("insightWeekList");
  weekList.innerHTML = insights.mostReportedThisWeek.length
    ? insights.mostReportedThisWeek.map(i => `
        <div class="insight-list-item" data-id="${i.id}">
          <div><div class="title">${escapeHtml(i.title)}</div><div class="sub">${getCategory(i.category).label}</div></div>
          <div class="n">⚡ ${i.affectedCount}</div>
        </div>`).join("")
    : `<p class="insight-empty">No new reports in the last 7 days.</p>`;

  // most helpful solutions
  const solList = document.getElementById("insightSolutionsList");
  solList.innerHTML = insights.mostHelpfulSolutions.length
    ? insights.mostHelpfulSolutions.map(s => `
        <div class="insight-list-item" data-id="${s.issueId}">
          <div><div class="title">${escapeHtml(s.content.slice(0, 70))}${s.content.length > 70 ? "…" : ""}</div><div class="sub">on "${escapeHtml(s.issueTitle)}"</div></div>
          <div class="n">👍 ${s.helpfulCount}</div>
        </div>`).join("")
    : `<p class="insight-empty">No solutions yet — be the first to help.</p>`;

  // hotspots
  const maxHotspot = Math.max(...insights.hotspots.map(h => h.affected), 1);
  document.getElementById("insightHotspots").innerHTML = insights.hotspots.map(h => `
    <div class="bar-row">
      <span class="bar-label">${escapeHtml(h.location)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(h.affected / maxHotspot) * 100}%; background:var(--teal);"></div></div>
      <span class="bar-count">${h.affected}</span>
    </div>
  `).join("");

  // first-year challenges
  const fyList = document.getElementById("insightFirstYear");
  fyList.innerHTML = insights.firstYearChallenges.length
    ? insights.firstYearChallenges.map(i => `
        <div class="insight-list-item" data-id="${i.id}">
          <div><div class="title">${escapeHtml(i.title)}</div><div class="sub">${getCategory(i.category).label}</div></div>
          <div class="n">⚡ ${i.affectedCount}</div>
        </div>`).join("")
    : `<p class="insight-empty">Nothing tagged first-year yet.</p>`;

  // category chart
  const maxCat = Math.max(...Object.values(insights.byCategory), 1);
  document.getElementById("insightCategoryChart").innerHTML = Object.entries(insights.byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([catId, count]) => `
      <div class="bar-row">
        <span class="bar-label">${getCategory(catId).icon} ${getCategory(catId).label}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(count / maxCat) * 100}%"></div></div>
        <span class="bar-count">${count}</span>
      </div>
    `).join("");

  // status chart
  const statusColors = { "new": "var(--status-new)", "in-review": "var(--status-review)", "in-progress": "var(--status-progress)", "resolved": "var(--status-resolved)" };
  const totalStatus = Object.values(insights.byStatus).reduce((a, b) => a + b, 0) || 1;
  document.getElementById("insightStatusChart").innerHTML = `
    <div class="status-stack">
      ${Object.entries(insights.byStatus).map(([s, c]) => `<div style="width:${(c / totalStatus) * 100}%; background:${statusColors[s]}"></div>`).join("")}
    </div>
    <div class="status-legend">
      ${Object.entries(insights.byStatus).map(([s, c]) => `
        <div class="legend-row">
          <span class="legend-left"><span class="legend-dot" style="background:${statusColors[s]}"></span>${statusLabel(s)}</span>
          <span class="legend-count">${c}</span>
        </div>`).join("")}
    </div>
  `;
}

// ============================================================
// MY ACTIVITY view
// ============================================================
function renderActivity() {
  document.getElementById("activityIdentityName").textContent = state.identity.display;
  document.getElementById("anonymityExampleName").textContent = state.identity.display;

  const reportIds = new Set(CampusPulseAPI.getMyReportIds());
  const affectedIds = new Set(CampusPulseAPI.getMyAffectedIds());

  const myReports = state.issues.filter(i => reportIds.has(i.id));
  const myAffected = state.issues.filter(i => affectedIds.has(i.id) && !reportIds.has(i.id));

  const reportsList = document.getElementById("myReportsList");
  const reportsEmpty = document.getElementById("myReportsEmpty");
  if (myReports.length === 0) { reportsList.innerHTML = ""; reportsEmpty.hidden = false; }
  else { reportsEmpty.hidden = true; reportsList.innerHTML = myReports.map(issueCardHTML).join(""); }

  const affectedList = document.getElementById("myAffectedList");
  const affectedEmpty = document.getElementById("myAffectedEmpty");
  if (myAffected.length === 0) { affectedList.innerHTML = ""; affectedEmpty.hidden = false; }
  else { affectedEmpty.hidden = true; affectedList.innerHTML = myAffected.map(issueCardHTML).join(""); }
}

// ============================================================
// Filter dropdown population
// ============================================================
function populateCategorySelect() {
  const select = document.getElementById("filterCategory");
  CATEGORIES.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = `${cat.icon} ${cat.label}`;
    select.appendChild(opt);
  });
}

// ============================================================
// VIEW SWITCHING
// ============================================================
async function showView(view) {
  state.view = view;
  document.querySelectorAll(".view").forEach(v => v.hidden = true);
  document.getElementById(`view-${view}`).hidden = false;

  document.querySelectorAll(".nav-link, .bottom-nav-link[data-view]").forEach(link => {
    link.classList.toggle("active", link.dataset.view === view);
  });

  if (view === "insights") await renderInsights();
  if (view === "activity") renderActivity();
  if (view === "explore") { renderCategoryGrid(); renderExploreList(); }

  window.scrollTo({ top: 0, behavior: "auto" });
}

// ============================================================
// ISSUE MODAL
// ============================================================
function solutionCardHTML(sol, issueId) {
  const myVote = CampusPulseAPI.myHelpfulVote(sol.id);
  return `
    <div class="solution-card">
      <div class="content">${escapeHtml(sol.content)}</div>
      <div class="footer-row">
        <span class="author">${escapeHtml(sol.anonAuthor)} · ${timeAgo(sol.createdAt)}</span>
        <div class="helpful-btns">
          <button class="helpful-btn ${myVote === "helpful" ? "active-yes" : ""}" data-helpful="yes" data-issue-id="${issueId}" data-sol-id="${sol.id}" type="button">👍 Helpful (${sol.helpfulCount})</button>
          <button class="helpful-btn ${myVote === "not-helpful" ? "active-no" : ""}" data-helpful="no" data-issue-id="${issueId}" data-sol-id="${sol.id}" type="button">👎 (${sol.notHelpfulCount})</button>
        </div>
      </div>
    </div>
  `;
}

function renderIssueModal(issue) {
  const cat = getCategory(issue.category);
  const sortedSolutions = [...issue.solutions].sort((a, b) => b.helpfulCount - a.helpfulCount);

  document.getElementById("issueModalBody").innerHTML = `
    <div class="issue-modal-header">
      <div class="issue-card-tags">
        <span class="tag category-${cat.id}">${cat.icon} ${escapeHtml(cat.label)}</span>
        <span class="status-pill status-${issue.status}">${statusLabel(issue.status)}</span>
      </div>
      <h2 id="issueModalTitle" class="issue-modal-title">${escapeHtml(issue.title)}</h2>
      <p class="issue-modal-desc">${escapeHtml(issue.description)}</p>
      <div class="issue-modal-meta">
        <span>📍 ${escapeHtml(issue.location)}</span>
        <span>${timeAgo(issue.createdAt)}</span>
        <span>${escapeHtml(issue.anonAuthor)}</span>
      </div>
      ${issue.triedBefore ? `<div class="issue-modal-tried"><strong>Already tried:</strong> ${escapeHtml(issue.triedBefore)}</div>` : ""}
      <div class="issue-modal-actions">
        <button class="affected-btn ${CampusPulseAPI.isAffectedByMe(issue.id) ? "marked" : ""}" data-affected-id="${issue.id}" type="button">
          <span class="bolt">⚡</span> <span class="affected-count">${issue.affectedCount}</span> students have this too
        </button>
      </div>
    </div>

    <div class="solutions-section">
      <h3>💡 Solutions (${issue.solutions.length})</h3>
      <div id="solutionsList">
        ${sortedSolutions.length ? sortedSolutions.map(s => solutionCardHTML(s, issue.id)).join("") : `<p class="no-solutions">No solutions yet. Know a way around this?</p>`}
      </div>
      <div class="add-solution-box">
        <label class="field-label" for="newSolutionText">Know a way around this?</label>
        <textarea id="newSolutionText" rows="3" placeholder="Here's what worked for me..."></textarea>
        <button class="btn btn-primary" id="submitSolutionBtn" data-issue-id="${issue.id}" type="button">Share solution</button>
      </div>
    </div>
  `;
}

async function openIssueModal(id) {
  state.activeIssueId = id;
  const issue = findIssue(id);
  if (!issue) return;
  renderIssueModal(issue);
  document.getElementById("issueModalOverlay").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeIssueModal() {
  document.getElementById("issueModalOverlay").hidden = true;
  document.body.style.overflow = "";
  state.activeIssueId = null;
}

async function refreshOpenIssueModal() {
  if (!state.activeIssueId) return;
  const issue = findIssue(state.activeIssueId);
  if (issue) renderIssueModal(issue);
}

// ============================================================
// AFFECTED ("I have this too") toggle — shared handler
// ============================================================
async function handleAffectedClick(btn) {
  const id = btn.dataset.affectedId;
  const result = await CampusPulseAPI.toggleAffected(id);
  if (!result) return;

  const issueIndex = state.issues.findIndex(i => i.id === id);
  if (issueIndex >= 0) state.issues[issueIndex] = result.issue;

  showToast(result.marked ? "Added to the count. You're not alone." : "Removed from the count.");

  if (!prefersReducedMotion()) {
    btn.classList.add("pulse");
    setTimeout(() => btn.classList.remove("pulse"), 260);
  }

  // Re-render whatever's currently visible so counts stay in sync everywhere.
  renderCurrentView();
  await refreshOpenIssueModal();
}

function renderCurrentView() {
  if (state.view === "pulse") { renderHappeningNow(); renderFeed(); }
  else if (state.view === "explore") { renderCategoryGrid(); renderExploreList(); }
  else if (state.view === "activity") { renderActivity(); }
}

// ============================================================
// REPORT MODAL
// ============================================================
function renderReportCategoryGrid() {
  document.getElementById("reportCategoryGrid").innerHTML = CATEGORIES.map(cat => `
    <button type="button" class="category-tile ${state.reportDraft.category === cat.id ? "active" : ""}" data-report-category="${cat.id}">
      <span class="icon">${cat.icon}</span>
      <span class="label">${escapeHtml(cat.label)}</span>
    </button>
  `).join("");
}

function goToReportStep(step) {
  state.reportStep = step;
  document.querySelectorAll(".report-step").forEach(el => { el.hidden = Number(el.dataset.step) !== step; });
  document.querySelectorAll(".step-dot").forEach(dot => {
    const dotStep = Number(dot.dataset.step);
    dot.classList.toggle("active", dotStep === step);
    dot.classList.toggle("done", dotStep < step);
  });

  document.getElementById("reportBackBtn").hidden = step === 1;
  document.getElementById("reportNextBtn").hidden = step === 4;
  document.getElementById("reportSubmitBtn").hidden = step !== 4;

  if (step === 4) renderReportPreview();
}

function renderReportPreview() {
  const d = state.reportDraft;
  const cat = getCategory(d.category);
  document.getElementById("reportPreview").innerHTML = `
    <div class="issue-card-tags">
      <span class="tag category-${cat.id}">${cat.icon} ${escapeHtml(cat.label)}</span>
      <span class="status-pill status-new">New</span>
    </div>
    <div class="issue-card-title">${escapeHtml(d.title)}</div>
    <div class="issue-card-desc" style="-webkit-line-clamp:unset;">${escapeHtml(d.description)}</div>
    <div class="issue-card-meta" style="margin-top:10px;">
      <span>📍 ${escapeHtml(d.location || "Not specified")}</span>
      <span>${state.identity.display}</span>
    </div>
  `;
}

function validateReportStep(step) {
  if (step === 1 && !state.reportDraft.category) { showToast("Pick a category to continue."); return false; }
  if (step === 2) {
    const title = document.getElementById("reportTitle").value.trim();
    const description = document.getElementById("reportDescription").value.trim();
    if (!title || !description) { showToast("Add a title and description to continue."); return false; }
  }
  return true;
}

function collectStepData(step) {
  if (step === 2) {
    state.reportDraft.title = document.getElementById("reportTitle").value.trim();
    state.reportDraft.description = document.getElementById("reportDescription").value.trim();
    state.reportDraft.location = document.getElementById("reportLocation").value.trim();
  }
  if (step === 3) {
    state.reportDraft.triedBefore = document.getElementById("reportTried").value.trim();
    state.reportDraft.urgency = Number(document.getElementById("reportUrgency").value);
  }
}

function resetReportForm() {
  state.reportDraft = { category: null, title: "", description: "", location: "", triedBefore: "", urgency: 3 };
  document.getElementById("reportForm").reset();
  document.getElementById("reportUrgencyValue").textContent = URGENCY_LABELS[3];
  renderReportCategoryGrid();
  goToReportStep(1);
}

function openReportModal() {
  resetReportForm();
  document.getElementById("reportModalOverlay").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeReportModal() {
  document.getElementById("reportModalOverlay").hidden = true;
  document.body.style.overflow = "";
}

// ============================================================
// INIT + EVENT WIRING
// ============================================================
async function init() {
  state.identity = CampusPulseAPI.getOrCreateIdentity();
  populateCategorySelect();
  renderSurvivalGrid();
  renderReportCategoryGrid();

  await showFeedSkeleton(300);
  state.issues = await CampusPulseAPI.getIssues();

  renderHappeningNow();
  renderFeed();

  wireEvents();
}

function wireEvents() {
  // ---- top + bottom nav ----
  document.querySelectorAll(".nav-link, .bottom-nav-link[data-view]").forEach(link => {
    link.addEventListener("click", () => showView(link.dataset.view));
  });

  // ---- report entry points ----
  ["reportNavBtn", "heroReportBtn", "bottomReportBtn"].forEach(id => {
    document.getElementById(id).addEventListener("click", openReportModal);
  });
  document.getElementById("heroExploreBtn").addEventListener("click", () => {
    document.getElementById("feedList").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ---- anonymity info modal ----
  document.getElementById("anonymityInfoBtn").addEventListener("click", () => {
    document.getElementById("anonymityExampleName").textContent = state.identity.display;
    document.getElementById("anonymityModalOverlay").hidden = false;
  });
  document.getElementById("anonymityModalClose").addEventListener("click", () => document.getElementById("anonymityModalOverlay").hidden = true);
  document.getElementById("anonymityModalGotIt").addEventListener("click", () => document.getElementById("anonymityModalOverlay").hidden = true);

  // ---- pulse feed filters ----
  document.getElementById("filterCategory").addEventListener("change", e => { state.filters.category = e.target.value; renderFeed(); });
  document.getElementById("sortOrder").addEventListener("change", e => { state.filters.sort = e.target.value; renderFeed(); });
  document.getElementById("searchInput").addEventListener("input", debounce(e => { state.filters.search = e.target.value; renderFeed(); }, 200));

  // ---- survival chips ----
  document.getElementById("survivalGrid").addEventListener("click", e => {
    const chip = e.target.closest(".survival-chip");
    if (!chip) return;
    state.filters.search = chip.dataset.query;
    document.getElementById("searchInput").value = chip.dataset.query;
    renderFeed();
    document.getElementById("feedList").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ---- explore view ----
  document.getElementById("categoryGrid").addEventListener("click", e => {
    const tile = e.target.closest(".category-tile");
    if (!tile) return;
    state.exploreFilters.category = tile.dataset.exploreCategory;
    renderCategoryGrid();
    renderExploreList();
  });
  document.getElementById("exploreSearchInput").addEventListener("input", debounce(e => {
    state.exploreFilters.search = e.target.value;
    renderExploreList();
  }, 200));

  // ---- card clicks + affected buttons (event delegation across whole doc) ----
  document.addEventListener("click", e => {
    const affectedBtn = e.target.closest(".affected-btn");
    if (affectedBtn) { e.stopPropagation(); handleAffectedClick(affectedBtn); return; }

    const card = e.target.closest(".issue-card");
    if (card) { openIssueModal(card.dataset.id); return; }

    const insightItem = e.target.closest(".insight-list-item");
    if (insightItem) { openIssueModal(insightItem.dataset.id); return; }
  });
  document.addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("issue-card")) {
      e.preventDefault();
      openIssueModal(e.target.dataset.id);
    }
  });

  // ---- issue modal ----
  document.getElementById("issueModalClose").addEventListener("click", closeIssueModal);
  document.getElementById("issueModalOverlay").addEventListener("click", e => { if (e.target.id === "issueModalOverlay") closeIssueModal(); });

  document.getElementById("issueModalBody").addEventListener("click", async e => {
    const helpfulBtn = e.target.closest(".helpful-btn");
    if (helpfulBtn) {
      await CampusPulseAPI.markSolutionHelpful(helpfulBtn.dataset.issueId, helpfulBtn.dataset.solId, helpfulBtn.dataset.helpful === "yes");
      const updated = await CampusPulseAPI.getIssue(helpfulBtn.dataset.issueId);
      const idx = state.issues.findIndex(i => i.id === updated.id);
      if (idx >= 0) state.issues[idx] = updated;
      renderIssueModal(updated);
      return;
    }
    const submitSolBtn = e.target.closest("#submitSolutionBtn");
    if (submitSolBtn) {
      const textarea = document.getElementById("newSolutionText");
      const content = textarea.value.trim();
      if (!content) { showToast("Write a solution before sharing."); return; }
      await CampusPulseAPI.addSolution(submitSolBtn.dataset.issueId, content);
      const updated = await CampusPulseAPI.getIssue(submitSolBtn.dataset.issueId);
      const idx = state.issues.findIndex(i => i.id === updated.id);
      if (idx >= 0) state.issues[idx] = updated;
      renderIssueModal(updated);
      renderCurrentView();
      showToast("Solution shared. Thanks for helping out.");
    }
  });

  // ---- report modal: category selection ----
  document.getElementById("reportCategoryGrid").addEventListener("click", e => {
    const tile = e.target.closest(".category-tile");
    if (!tile) return;
    state.reportDraft.category = tile.dataset.reportCategory;
    renderReportCategoryGrid();
  });

  // ---- report modal: urgency slider ----
  document.getElementById("reportUrgency").addEventListener("input", e => {
    document.getElementById("reportUrgencyValue").textContent = URGENCY_LABELS[e.target.value];
  });

  // ---- report modal: navigation ----
  document.getElementById("reportNextBtn").addEventListener("click", () => {
    if (!validateReportStep(state.reportStep)) return;
    collectStepData(state.reportStep);
    goToReportStep(Math.min(4, state.reportStep + 1));
  });
  document.getElementById("reportBackBtn").addEventListener("click", () => {
    goToReportStep(Math.max(1, state.reportStep - 1));
  });
  document.getElementById("reportModalClose").addEventListener("click", closeReportModal);
  document.getElementById("reportModalOverlay").addEventListener("click", e => { if (e.target.id === "reportModalOverlay") closeReportModal(); });

  // ---- report modal: submit ----
  document.getElementById("reportForm").addEventListener("submit", async e => {
    e.preventDefault();
    const newIssue = await CampusPulseAPI.createIssue(state.reportDraft);
    state.issues.unshift(newIssue);
    closeReportModal();
    showToast("You're heard. Your post is live.");
    state.filters.sort = "recent";
    document.getElementById("sortOrder").value = "recent";
    renderCurrentView();
  });

  // ---- escape key closes any open modal ----
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (!document.getElementById("issueModalOverlay").hidden) closeIssueModal();
    if (!document.getElementById("reportModalOverlay").hidden) closeReportModal();
    if (!document.getElementById("anonymityModalOverlay").hidden) document.getElementById("anonymityModalOverlay").hidden = true;
  });
}

document.addEventListener("DOMContentLoaded", init);
