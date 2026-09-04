// ============================================================
// CampusPulse — api.js
// The data-access layer. Every function here returns a Promise,
// even though today it's backed by localStorage — that's
// deliberate, so switching to a real backend later is a matter
// of rewriting the *inside* of these functions, not anything
// that calls them.
//
// Later, this becomes:
//   async function getIssues() {
//     const res = await fetch("/api/issues");
//     return res.json();
//   }
// with every call site elsewhere in the app unchanged.
// ============================================================

const CampusPulseAPI = (() => {

  const ISSUES_KEY = "campuspulse_issues_v2";
  const IDENTITY_KEY = "campuspulse_identity_v2";
  const MY_REPORTS_KEY = "campuspulse_my_reports_v2";
  const MY_AFFECTED_KEY = "campuspulse_my_affected_v2";
  const MY_HELPFUL_KEY = "campuspulse_my_helpful_v2";

  // Small artificial delay so loading states are visible and the
  // rest of the app already behaves like it's talking to a real
  // network. Set to 0 to make everything instant.
  const LATENCY_MS = 220;

  function delay(value) {
    return new Promise(resolve => setTimeout(() => resolve(value), LATENCY_MS));
  }

  function readIssues() {
    const saved = localStorage.getItem(ISSUES_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fall through to seed */ }
    }
    return JSON.parse(JSON.stringify(SEED_ISSUES));
  }

  function writeIssues(issues) {
    localStorage.setItem(ISSUES_KEY, JSON.stringify(issues));
  }

  function readSet(key) {
    try { return new Set(JSON.parse(localStorage.getItem(key)) || []); }
    catch (e) { return new Set(); }
  }
  function writeSet(key, set) {
    localStorage.setItem(key, JSON.stringify([...set]));
  }

  // ---------------- Identity ----------------
  // GET/POST /api/auth/identity (conceptually)
  function getOrCreateIdentity() {
    const saved = localStorage.getItem(IDENTITY_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* regenerate below */ }
    }
    const adjective = IDENTITY_ADJECTIVES[Math.floor(Math.random() * IDENTITY_ADJECTIVES.length)];
    const noun = IDENTITY_NOUNS[Math.floor(Math.random() * IDENTITY_NOUNS.length)];
    const number = String(Math.floor(100 + Math.random() * 900));
    const identity = { name: `${adjective} ${noun}`, number, display: `${adjective} ${noun} #${number}` };
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
    return identity;
  }

  // ---------------- Issues ----------------

  // GET /api/issues
  function getIssues() {
    return delay(readIssues());
  }

  // GET /api/issues/:id
  function getIssue(id) {
    const issue = readIssues().find(i => i.id === id) || null;
    return delay(issue);
  }

  // POST /api/issues
  function createIssue(issueData) {
    const issues = readIssues();
    const identity = getOrCreateIdentity();
    const newIssue = {
      id: "issue-" + Date.now(),
      category: issueData.category,
      status: "new",
      urgency: issueData.urgency,
      firstYear: false,
      title: issueData.title,
      description: issueData.description,
      location: issueData.location || "Not specified",
      createdAt: new Date().toISOString(),
      affectedCount: 1,
      anonAuthor: identity.display,
      triedBefore: issueData.triedBefore || "",
      solutions: []
    };
    issues.unshift(newIssue);
    writeIssues(issues);

    const myReports = readSet(MY_REPORTS_KEY);
    myReports.add(newIssue.id);
    writeSet(MY_REPORTS_KEY, myReports);

    const myAffected = readSet(MY_AFFECTED_KEY);
    myAffected.add(newIssue.id);
    writeSet(MY_AFFECTED_KEY, myAffected);

    return delay(newIssue);
  }

  // POST /api/issues/:id/affected  (toggle)
  function toggleAffected(issueId) {
    const issues = readIssues();
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return delay(null);

    const myAffected = readSet(MY_AFFECTED_KEY);
    const alreadyMarked = myAffected.has(issueId);

    if (alreadyMarked) {
      issue.affectedCount = Math.max(0, issue.affectedCount - 1);
      myAffected.delete(issueId);
    } else {
      issue.affectedCount += 1;
      myAffected.add(issueId);
    }
    writeSet(MY_AFFECTED_KEY, myAffected);
    writeIssues(issues);
    return delay({ issue, marked: !alreadyMarked });
  }

  function isAffectedByMe(issueId) {
    return readSet(MY_AFFECTED_KEY).has(issueId);
  }

  function isReportedByMe(issueId) {
    return readSet(MY_REPORTS_KEY).has(issueId);
  }

  function getMyReportIds() {
    return [...readSet(MY_REPORTS_KEY)];
  }

  function getMyAffectedIds() {
    return [...readSet(MY_AFFECTED_KEY)];
  }

  // ---------------- Solutions ----------------

  // POST /api/issues/:id/solutions
  function addSolution(issueId, content) {
    const issues = readIssues();
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return delay(null);

    const identity = getOrCreateIdentity();
    const solution = {
      id: "sol-" + Date.now(),
      content,
      anonAuthor: identity.display,
      helpfulCount: 0,
      notHelpfulCount: 0,
      createdAt: new Date().toISOString()
    };
    issue.solutions.push(solution);
    writeIssues(issues);
    return delay(solution);
  }

  // POST /api/issues/:id/solutions/:solutionId/helpful  (toggle helpful/not helpful)
  function markSolutionHelpful(issueId, solutionId, helpful) {
    const issues = readIssues();
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return delay(null);
    const solution = issue.solutions.find(s => s.id === solutionId);
    if (!solution) return delay(null);

    const myHelpful = JSON.parse(localStorage.getItem(MY_HELPFUL_KEY) || "{}");
    const prevVote = myHelpful[solutionId];

    if (prevVote === "helpful") solution.helpfulCount = Math.max(0, solution.helpfulCount - 1);
    if (prevVote === "not-helpful") solution.notHelpfulCount = Math.max(0, solution.notHelpfulCount - 1);

    if (prevVote === (helpful ? "helpful" : "not-helpful")) {
      delete myHelpful[solutionId]; // clicking the same vote again clears it
    } else {
      if (helpful) solution.helpfulCount += 1; else solution.notHelpfulCount += 1;
      myHelpful[solutionId] = helpful ? "helpful" : "not-helpful";
    }

    localStorage.setItem(MY_HELPFUL_KEY, JSON.stringify(myHelpful));
    writeIssues(issues);
    return delay(solution);
  }

  function myHelpfulVote(solutionId) {
    const myHelpful = JSON.parse(localStorage.getItem(MY_HELPFUL_KEY) || "{}");
    return myHelpful[solutionId] || null;
  }

  // ---------------- Insights ----------------

  // GET /api/insights
  function getInsights() {
    const issues = readIssues();
    const now = Date.now();
    const WEEK = 7 * 86400000;

    const total = issues.length;
    const resolved = issues.filter(i => i.status === "resolved").length;
    const totalAffected = issues.reduce((sum, i) => sum + i.affectedCount, 0);
    const totalSolutions = issues.reduce((sum, i) => sum + i.solutions.length, 0);

    const mostReportedThisWeek = [...issues]
      .filter(i => now - new Date(i.createdAt).getTime() <= WEEK)
      .sort((a, b) => b.affectedCount - a.affectedCount)
      .slice(0, 5);

    const firstYearChallenges = [...issues]
      .filter(i => i.firstYear)
      .sort((a, b) => b.affectedCount - a.affectedCount)
      .slice(0, 5);

    const hotspotMap = {};
    issues.forEach(i => {
      hotspotMap[i.location] = (hotspotMap[i.location] || 0) + i.affectedCount;
    });
    const hotspots = Object.entries(hotspotMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([location, affected]) => ({ location, affected }));

    const allSolutions = [];
    issues.forEach(i => i.solutions.forEach(s => allSolutions.push({ ...s, issueTitle: i.title, issueId: i.id })));
    const mostHelpfulSolutions = allSolutions
      .sort((a, b) => b.helpfulCount - a.helpfulCount)
      .slice(0, 5);

    const byCategory = {};
    issues.forEach(i => { byCategory[i.category] = (byCategory[i.category] || 0) + 1; });

    const byStatus = { "new": 0, "in-review": 0, "in-progress": 0, "resolved": 0 };
    issues.forEach(i => { byStatus[i.status] = (byStatus[i.status] || 0) + 1; });

    return delay({
      total, resolved, totalAffected, totalSolutions,
      mostReportedThisWeek, firstYearChallenges, hotspots,
      mostHelpfulSolutions, byCategory, byStatus
    });
  }

  return {
    getOrCreateIdentity,
    getIssues, getIssue, createIssue,
    toggleAffected, isAffectedByMe, isReportedByMe, getMyReportIds, getMyAffectedIds,
    addSolution, markSolutionHelpful, myHelpfulVote,
    getInsights
  };
})();
