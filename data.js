// ============================================================
// CampusPulse — data.js
// Static reference data + seed content. This is the only file
// that should need editing to change categories, wording, or
// the starting set of demo issues.
//
// When a real backend exists, SEED_ISSUES goes away — api.js
// will fetch from the server instead. Everything else here
// (CATEGORIES, IDENTITY_WORDS, FIRST_YEAR_TOPICS) is reference
// data the UI needs regardless of where issues come from.
// ============================================================

// ---- Categories -------------------------------------------------
// `id` is used everywhere in code and as a CSS class suffix
// (see .category-<id> in styles.css). `label`/`icon` are display
// only, so they're safe to reword without touching anything else.
const CATEGORIES = [
  { id: "academic",       label: "Academic",         icon: "🎓" },
  { id: "infrastructure", label: "Infrastructure",   icon: "🏗️" },
  { id: "hostel",         label: "Hostel",           icon: "🏠" },
  { id: "food-mess",      label: "Food & Mess",      icon: "🍽️" },
  { id: "wifi",           label: "Wi-Fi & Tech",     icon: "📶" },
  { id: "admin",          label: "Administration",   icon: "🗂️" },
  { id: "transport",      label: "Transport",        icon: "🚌" },
  { id: "safety",         label: "Safety",           icon: "🛡️" },
  { id: "campus-life",    label: "Campus Life",      icon: "✨" },
  { id: "other",          label: "Other",            icon: "💬" }
];

function getCategory(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

// ---- Anonymous identity word pools -------------------------------
// A student's identity is generated once per browser from these
// pools (see api.js -> getOrCreateIdentity) and stays stable.
const IDENTITY_ADJECTIVES = [
  "Midnight", "Sleepy", "Quiet", "Wandering", "Lost", "Curious",
  "Caffeinated", "Sleep-Deprived", "Undercover", "Nocturnal",
  "Restless", "Chronic", "Overthinking", "Half-Awake"
];
const IDENTITY_NOUNS = [
  "Owl", "Panda", "Raven", "Ghost", "Engineer", "Human", "Squirrel",
  "Wanderer", "Scholar", "Coder", "Explorer", "Fox", "Otter", "Pigeon"
];

// ---- First-year survival topics ----------------------------------
// Each topic maps to a search term used to filter the main feed.
const FIRST_YEAR_TOPICS = [
  { label: "Timetable confusion",   icon: "🗓️", query: "timetable" },
  { label: "Finding classrooms",    icon: "🧭", query: "building" },
  { label: "College ID delays",     icon: "🪪", query: "ID card" },
  { label: "Wi-Fi setup",           icon: "📶", query: "wi-fi" },
  { label: "Hostel issues",         icon: "🏠", query: "hostel" },
  { label: "Document submission",   icon: "📄", query: "document" },
  { label: "Bus routes",            icon: "🚌", query: "shuttle" },
  { label: "Mess problems",         icon: "🍽️", query: "mess" }
];

// ---- Seed issues ---------------------------------------------------
// `daysAgo` is only used to compute a realistic createdAt at load
// time below — edit daysAgo, not createdAt.
const SEED_ISSUES_RAW = [
  {
    id: "seed-1",
    category: "food-mess",
    status: "in-review",
    urgency: 4,
    firstYear: false,
    title: "Mess food quality has gone downhill this month",
    description: "Rice is undercooked most days and the vegetable options rarely change. Several students had stomach issues last week.",
    location: "North Campus Mess Hall",
    daysAgo: 6,
    affectedCount: 214,
    anonAuthor: "Anonymous Raven #472",
    triedBefore: "Mentioned it to the mess supervisor verbally, nothing changed.",
    solutions: [
      { id: "s1a", content: "Mess committee meets every Friday 5pm outside the mess hall — bring specific complaints and they actually note them down.", helpfulCount: 41, notHelpfulCount: 2, daysAgo: 4, anonAuthor: "Midnight Owl #118" },
      { id: "s1b", content: "Filed a written complaint through the mess committee register, food improved within about a week. Worth doing in writing, not just verbally.", helpfulCount: 19, notHelpfulCount: 0, daysAgo: 3, anonAuthor: "Quiet Scholar #905" }
    ]
  },
  {
    id: "seed-2",
    category: "safety",
    status: "new",
    urgency: 5,
    firstYear: false,
    title: "Street lights near Block D gate have been out for a week",
    description: "All three lampposts outside the Block D hostel gate are dark, making the walk back from the library unsafe after dark.",
    location: "Block D Gate",
    daysAgo: 4,
    affectedCount: 128,
    anonAuthor: "Campus Ghost #341",
    solutions: []
  },
  {
    id: "seed-3",
    category: "hostel",
    status: "in-progress",
    urgency: 4,
    firstYear: false,
    title: "Leaking ceiling in Room 214, Girls Hostel B",
    description: "Water drips onto the study desk whenever it rains. Reported to the warden twice already with no fix.",
    location: "Girls Hostel B, Room 214",
    daysAgo: 7,
    affectedCount: 61,
    anonAuthor: "Restless Fox #203",
    solutions: [
      { id: "s3a", content: "The warden's maintenance request form is pinned in the hostel WhatsApp group — faster than the paper register at the desk.", helpfulCount: 14, notHelpfulCount: 1, daysAgo: 5, anonAuthor: "Lost Engineer #667" }
    ]
  },
  {
    id: "seed-4",
    category: "wifi",
    status: "in-progress",
    urgency: 3,
    firstYear: true,
    title: "Wi-Fi drops every evening in Central Library",
    description: "Connection to CampusNet becomes unusable between 6-10pm, right during peak study hours before exams.",
    location: "Central Library, 2nd Floor",
    daysAgo: 5,
    affectedCount: 96,
    anonAuthor: "Caffeinated Human #558",
    solutions: [
      { id: "s4a", content: "Switch to the 'CampusNet-5G' network instead of the 2.4GHz one after 6pm — way more stable in my experience.", helpfulCount: 37, notHelpfulCount: 3, daysAgo: 4, anonAuthor: "Nocturnal Coder #291" }
    ]
  },
  {
    id: "seed-5",
    category: "academic",
    status: "new",
    urgency: 4,
    firstYear: true,
    title: "Exam timetable clashes for CS minor students",
    description: "Two core electives have been scheduled at the same time for the upcoming semester, affecting roughly 40 students.",
    location: "CS Department",
    daysAgo: 8,
    affectedCount: 89,
    anonAuthor: "Overthinking Scholar #414",
    solutions: []
  },
  {
    id: "seed-6",
    category: "infrastructure",
    status: "resolved",
    urgency: 3,
    firstYear: false,
    title: "Cracked pavement near Admin block ramp",
    description: "The wheelchair ramp leading to the admin block had a large crack that had become a tripping hazard.",
    location: "Admin Block Ramp",
    daysAgo: 11,
    affectedCount: 43,
    anonAuthor: "Wandering Otter #076",
    solutions: [
      { id: "s6a", content: "This got fixed after a bunch of us tagged the estates office directly instead of going through the general complaint box.", helpfulCount: 9, notHelpfulCount: 0, daysAgo: 6, anonAuthor: "Curious Panda #832" }
    ]
  },
  {
    id: "seed-7",
    category: "transport",
    status: "new",
    urgency: 2,
    firstYear: true,
    title: "Shuttle bus from Gate 2 consistently 20 minutes late",
    description: "The 8am campus shuttle from Gate 2 to the Engineering block has been late every day this week, causing students to miss first period.",
    location: "Gate 2 Shuttle Stop",
    daysAgo: 3,
    affectedCount: 74,
    anonAuthor: "Half-Awake Pigeon #519",
    solutions: [
      { id: "s7a", content: "The 7:40 shuttle (one before) is way more reliable if your first class is at 9 — I switched after the second late day.", helpfulCount: 22, notHelpfulCount: 1, daysAgo: 2, anonAuthor: "Sleepy Wanderer #630" }
    ]
  },
  {
    id: "seed-8",
    category: "campus-life",
    status: "in-review",
    urgency: 2,
    firstYear: false,
    title: "Overflowing bins outside Cafeteria 2",
    description: "Waste bins near the east cafeteria entrance haven't been emptied in days, attracting insects.",
    location: "Cafeteria 2, East Entrance",
    daysAgo: 5,
    affectedCount: 52,
    anonAuthor: "Undercover Squirrel #145",
    solutions: []
  },
  {
    id: "seed-9",
    category: "hostel",
    status: "resolved",
    urgency: 3,
    firstYear: false,
    title: "No hot water in Boys Hostel C, 3rd floor",
    description: "Geysers on the third floor hadn't worked for two weeks, especially rough with the cold mornings.",
    location: "Boys Hostel C, 3rd Floor",
    daysAgo: 15,
    affectedCount: 37,
    anonAuthor: "Chronic Explorer #388",
    solutions: []
  },
  {
    id: "seed-10",
    category: "wifi",
    status: "resolved",
    urgency: 1,
    firstYear: false,
    title: "Printer in Computer Lab 3 out of service",
    description: "Only working printer for assignment submissions had been down since Monday, big queue forming at Lab 1 instead.",
    location: "Computer Lab 3",
    daysAgo: 18,
    affectedCount: 21,
    anonAuthor: "Quiet Ghost #712",
    solutions: []
  },
  {
    id: "seed-11",
    category: "admin",
    status: "in-review",
    urgency: 4,
    firstYear: true,
    title: "College ID card delayed for over 3 weeks for new admits",
    description: "Without the ID card, the library, mess, and hostel gates all need manual sign-in. It's a daily hassle for new students.",
    location: "Admin Office",
    daysAgo: 9,
    affectedCount: 156,
    anonAuthor: "Curious Human #264",
    solutions: [
      { id: "s11a", content: "The admin office (Room 12) processes ID requests noticeably faster if you go right when they open at 9am, avoid lunchtime entirely.", helpfulCount: 28, notHelpfulCount: 1, daysAgo: 7, anonAuthor: "Midnight Fox #501" }
    ]
  },
  {
    id: "seed-12",
    category: "academic",
    status: "new",
    urgency: 2,
    firstYear: true,
    title: "No one tells first-years which building has which department",
    description: "Orientation covers the auditorium and library but not which block houses which department. Took most of us a week to figure out by asking around.",
    location: "Campus-wide",
    daysAgo: 10,
    affectedCount: 203,
    anonAuthor: "Wandering Scholar #099",
    solutions: [
      { id: "s12a", content: "There's an unofficial campus map pinned in most department freshers WhatsApp groups — way more useful than the official orientation one.", helpfulCount: 45, notHelpfulCount: 2, daysAgo: 8, anonAuthor: "Lost Panda #377" },
      { id: "s12b", content: "Department name boards are actually colour-coded by block, it's just never explained during orientation week.", helpfulCount: 12, notHelpfulCount: 1, daysAgo: 6, anonAuthor: "Restless Otter #822" }
    ]
  }
];

// Convert daysAgo -> real ISO timestamps once, at load time, so the
// rest of the app can work with normal dates (and so this swaps
// cleanly for real API timestamps later).
function materializeSeedIssues() {
  const now = Date.now();
  return SEED_ISSUES_RAW.map(issue => {
    const createdAt = new Date(now - issue.daysAgo * 86400000).toISOString();
    const solutions = (issue.solutions || []).map(sol => ({
      ...sol,
      createdAt: new Date(now - sol.daysAgo * 86400000).toISOString()
    }));
    const { daysAgo, ...rest } = issue;
    return { ...rest, createdAt, solutions };
  });
}

const SEED_ISSUES = materializeSeedIssues();
