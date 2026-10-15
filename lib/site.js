/* Server-rendered content pages: concept explainers, the concept index,
   About / How to play / Privacy / Contact, and the sitemap.

   Used by the Vercel function in api/site.js and by the Vite dev/preview
   server (see vite.config.js), so `npm run dev` serves the same pages.

   Concept pages are only published once their puzzle's day has finished in
   every time zone (lastFinishedNumber), so nothing here can spoil a puzzle
   someone is still playing. */

import { PUZZLES, lastFinishedNumber, dateForNumberUTC, slugify } from "../src/puzzles.js";

export const ORIGIN = "https://engineerdle.com";
export const CONTACT_EMAIL = "hello@engineerdle.com";
const ADSENSE_CLIENT = "ca-pub-8271928500002157";
const POLICY_DATE = "October 15, 2026";
const POLICY_ISO = "2026-10-15";

/* ---------- Helpers ---------- */

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const longDate = (n) =>
  dateForNumberUTC(n).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
const isoDate = (n) => dateForNumberUTC(n).toISOString().slice(0, 10);


// Every puzzle that has been played and finished everywhere, oldest first.
function publishedPuzzles(now) {
  const last = Math.min(lastFinishedNumber(now), PUZZLES.length);
  return PUZZLES.slice(0, Math.max(0, last)).map((p, i) => ({ ...p, number: i + 1, slug: slugify(p.answer) }));
}

/* ---------- Layout ---------- */

const CSS = `
:root{--bg:#0B2A4A;--panel:#0F3255;--ink:#EAF2FA;--muted:#7FA8C9;--border:#3E5C78;--accent:#4CC9F0;--correct:#5FB489;--wrong:#E2795A}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--bg);color:var(--ink)}
body{font-family:'IBM Plex Sans',system-ui,sans-serif;font-size:16.5px;line-height:1.65;background-image:linear-gradient(rgba(140,190,230,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(140,190,230,.06) 1px,transparent 1px);background-size:24px 24px}
a{color:var(--accent)}
a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
::selection{background:var(--accent);color:var(--bg)}
.wrap{max-width:720px;margin:0 auto;padding:0 16px}
.top{border-bottom:1px solid var(--border)}
.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding-top:14px;padding-bottom:14px}
.brand{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:22px;color:var(--ink);text-decoration:none}
.nav{display:flex;gap:16px;flex-wrap:wrap;font-family:'IBM Plex Mono',monospace;font-size:12.5px;letter-spacing:.04em}
.nav a{color:var(--muted);text-decoration:none}
.nav a:hover,.nav a[aria-current]{color:var(--ink)}
main{padding:28px 0 40px}
.crumbs{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--muted);margin-bottom:10px}
.crumbs a{color:var(--muted)}
.eyebrow{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;color:var(--accent);text-transform:uppercase}
h1{font-family:'Space Grotesk',sans-serif;font-size:clamp(28px,6vw,38px);line-height:1.15;margin:6px 0 14px}
h2{font-family:'Space Grotesk',sans-serif;font-size:21px;line-height:1.3;margin:34px 0 10px}
h3{font-size:17px;margin:22px 0 6px}
p,li{color:#D5E3F0}
.lede{font-size:18px;color:var(--ink)}
.meta{display:flex;gap:22px;flex-wrap:wrap;border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:9px 0;margin:0 0 22px;font-family:'IBM Plex Mono',monospace;font-size:13px}
.meta span{color:var(--muted);font-size:10.5px;letter-spacing:.1em;display:block}
.clues{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.clues li{display:flex;gap:12px;padding:11px 14px;border:1px solid var(--border);border-radius:4px;background:rgba(255,255,255,.02)}
.clues b{font-family:'IBM Plex Mono',monospace;font-size:12.5px;color:var(--accent);padding-top:2px}
.cards{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.cards a{display:block;height:100%;padding:11px 13px;border:1px solid var(--border);border-radius:4px;text-decoration:none;color:var(--ink)}
.cards a:hover{border-color:var(--accent);background:rgba(76,201,240,.07)}
.cards small{display:block;font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--muted);margin-top:3px}
.cta{margin:34px 0 0;padding:18px;border:1px solid var(--accent);border-radius:4px;background:rgba(76,201,240,.07)}
.cta p{margin:0 0 12px;color:var(--ink)}
.btn{display:inline-block;padding:11px 16px;border-radius:4px;background:var(--accent);color:var(--bg);font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:13px;letter-spacing:.05em;text-decoration:none}
.pager{display:flex;justify-content:space-between;gap:12px;margin-top:28px;font-family:'IBM Plex Mono',monospace;font-size:13px}
.toc{display:flex;flex-wrap:wrap;gap:6px 14px;font-family:'IBM Plex Mono',monospace;font-size:12.5px;margin:0 0 8px}
.sq{font-family:'IBM Plex Mono',monospace}
.foot{border-top:1px solid var(--border);padding:22px 0 36px;font-size:13.5px;color:var(--muted)}
.foot nav{display:flex;flex-wrap:wrap;gap:8px 18px;margin-bottom:10px}
.foot a{color:var(--muted)}
.foot p{color:var(--muted);margin:0}
`;

const NAV = [
  ["/", "Play"],
  ["/concepts", "Concepts"],
  ["/how-to-play", "How to play"],
  ["/about", "About"],
];

function layout({ path, title, description, body, jsonLd, noindex = false }) {
  const url = ORIGIN + path;
  const nav = NAV.map(([href, label]) => `<a href="${href}"${href === path ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#0B2A4A">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`}
<meta property="og:type" content="article">
<meta property="og:site_name" content="Engineerdle">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ORIGIN}/preview.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>${CSS}</style>
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>` : ""}
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>
<script defer src="/_vercel/insights/script.js"></script>
</head>
<body>
<header class="top"><div class="wrap"><a class="brand" href="/">ENGINEER·DLE</a><nav class="nav" aria-label="Main">${nav}</nav></div></header>
<main><div class="wrap">
${body}
</div></main>
<footer class="foot"><div class="wrap">
<nav aria-label="Footer"><a href="/">Today's puzzle</a><a href="/concepts">Concept library</a><a href="/how-to-play">How to play</a><a href="/about">About</a><a href="/privacy">Privacy policy</a><a href="/contact">Contact</a></nav>
<p>© ${new Date().getUTCFullYear()} Engineerdle · A daily engineering puzzle.</p>
</div></footer>
</body>
</html>`;
}

const playCta = (text) =>
  `<div class="cta"><p>${text}</p><a class="btn" href="/">PLAY TODAY'S PUZZLE →</a></div>`;

/* ---------- Concept pages ---------- */

function conceptPage(p, all) {
  const related = all.filter((q) => q.discipline === p.discipline && q.slug !== p.slug).slice(-6).reverse();
  const prev = all[p.number - 2];
  const next = all[p.number];
  const disciplineAnchor = slugify(p.discipline);

  const body = `
<div class="crumbs"><a href="/">Engineerdle</a> › <a href="/concepts">Concepts</a> › <a href="/concepts#${disciplineAnchor}">${esc(p.discipline)}</a></div>
<div class="eyebrow">${esc(p.discipline)} · Puzzle #${p.number}</div>
<h1>${esc(p.answer)}</h1>
<div class="meta">
  <div><span>DISCIPLINE</span>${esc(p.discipline)}</div>
  <div><span>PUZZLE</span>#${p.number}</div>
  <div><span>PLAYED ON</span><time datetime="${isoDate(p.number)}">${longDate(p.number)}</time></div>
</div>

<h2>What is ${esc(p.answer)}?</h2>
<p class="lede">${esc(p.reveal)}</p>

<h2>The five clues</h2>
<p>Engineerdle #${p.number} described ${esc(p.answer)} with five clues, revealed one at a time from hardest to most direct. Each clue points at a different property of the concept.</p>
<ol class="clues">
${p.clues.map((c, i) => `<li><b>${String(i + 1).padStart(2, "0")}</b><span>${esc(c)}</span></li>`).join("\n")}
</ol>

${related.length ? `<h2>More ${esc(p.discipline)} concepts</h2>
<ul class="cards">
${related.map((q) => `<li><a href="/concept/${q.slug}">${esc(q.answer)}<small>Puzzle #${q.number}</small></a></li>`).join("\n")}
</ul>` : ""}

<nav class="pager" aria-label="Puzzle navigation">
  <span>${prev ? `<a href="/concept/${prev.slug}" rel="prev">← #${prev.number} ${esc(prev.answer)}</a>` : ""}</span>
  <span>${next ? `<a href="/concept/${next.slug}" rel="next">#${next.number} ${esc(next.answer)} →</a>` : ""}</span>
</nav>

${playCta("A new engineering concept every day: five clues, five guesses. How early can you name it?")}
`;

  const description = `${p.answer} explained: ${p.reveal}`.slice(0, 155).replace(/\s+\S*$/, "") + "…";
  return layout({
    path: `/concept/${p.slug}`,
    title: `${p.answer}: ${p.discipline} concept explained | Engineerdle`,
    description,
    body,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "DefinedTerm",
        name: p.answer,
        description: p.reveal,
        url: `${ORIGIN}/concept/${p.slug}`,
        inDefinedTermSet: { "@type": "DefinedTermSet", name: "Engineerdle concept library", url: `${ORIGIN}/concepts` },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Engineerdle", item: ORIGIN + "/" },
          { "@type": "ListItem", position: 2, name: "Concepts", item: `${ORIGIN}/concepts` },
          { "@type": "ListItem", position: 3, name: p.answer, item: `${ORIGIN}/concept/${p.slug}` },
        ],
      },
    ],
  });
}

function conceptsIndex(all) {
  const groups = {};
  for (const p of all) (groups[p.discipline] ??= []).push(p);
  const disciplines = Object.keys(groups).sort((a, b) => a.localeCompare(b));
  const latest = all.slice(-6).reverse();

  const body = `
<div class="eyebrow">Concept library</div>
<h1>Engineering concepts, explained</h1>
<p class="lede">Every past Engineerdle answer, with a plain-language explanation and the five clues used in the puzzle. ${all.length} concepts across ${disciplines.length} disciplines so far. A new one is added each day once its puzzle has finished worldwide.</p>

<h2>Latest</h2>
<ul class="cards">
${latest.map((p) => `<li><a href="/concept/${p.slug}">${esc(p.answer)}<small>#${p.number} · ${esc(p.discipline)}</small></a></li>`).join("\n")}
</ul>

<h2>By discipline</h2>
<nav class="toc" aria-label="Disciplines">${disciplines.map((d) => `<a href="#${slugify(d)}">${esc(d)}</a>`).join("")}</nav>
${disciplines
  .map(
    (d) => `<h3 id="${slugify(d)}">${esc(d)} <small style="color:var(--muted);font-weight:400">(${groups[d].length})</small></h3>
<ul class="cards">
${groups[d]
  .slice()
  .sort((a, b) => a.answer.localeCompare(b.answer))
  .map((p) => `<li><a href="/concept/${p.slug}">${esc(p.answer)}<small>Puzzle #${p.number}</small></a></li>`)
  .join("\n")}
</ul>`
  )
  .join("\n")}
${playCta("Test yourself on today's concept.")}
`;
  return layout({
    path: "/concepts",
    title: "Engineering concepts explained | Engineerdle concept library",
    description: `Plain-language explanations of ${all.length} engineering laws, theories, equations and phenomena from past Engineerdle puzzles, organised by discipline.`,
    body,
  });
}

/* ---------- Static pages ---------- */

function aboutPage(all) {
  const disciplines = new Set(PUZZLES.map((p) => p.discipline)).size;
  return layout({
    path: "/about",
    title: "About Engineerdle | The daily engineering puzzle",
    description: "Engineerdle is a free daily puzzle about engineering concepts: one law, theory, equation or phenomenon each day, revealed over five clues.",
    body: `
<div class="eyebrow">About</div>
<h1>About Engineerdle</h1>
<p class="lede">Engineerdle is a free daily puzzle for anyone who likes engineering. Each day there's one concept to name, such as a law, a theory, an equation, a component, a tool or a phenomenon, and five clues to help you get there.</p>

<h2>Why it exists</h2>
<p>Most of engineering is built on a few hundred core ideas that get taught once and then quietly taken for granted. Engineerdle is a small daily habit for keeping them sharp. The first clue usually describes a concept from an unusual angle, and each later clue gets more direct. Getting it on clue 1 means you really know the idea; getting it on clue 5 means you've learned something.</p>

<h2>What's covered</h2>
<p>The puzzle library spans ${PUZZLES.length} concepts across ${disciplines} disciplines, from thermodynamics, fluid mechanics and structural engineering to electronics, control systems, materials, manufacturing and computer science. Disciplines are rotated, so each week mixes several different fields.</p>
<p>After a puzzle's day is over, its answer, explanation and clues are added to the <a href="/concepts">concept library</a>, which currently holds ${all.length} explained concepts.</p>

<h2>How it works</h2>
<ul>
  <li>One puzzle per day, changing at midnight in your own time zone.</li>
  <li>Five attempts. Each wrong guess or skip unlocks another clue.</li>
  <li>No account and no sign-up. Your progress and streak are saved in your own browser.</li>
  <li>Past puzzles can be replayed from the archive inside the game.</li>
</ul>
<p>The full rules are on the <a href="/how-to-play">How to play</a> page.</p>

<h2>Who made it</h2>
<p>Hi my name's Jenny, I'm an engineer from New Zealand, Kia ora! Engineering is not my full time job. 50% of the time you can find me competing on the badminton court, but the other 50% I like to spend working on personal projects such as this one.</p>

<h2>Corrections and suggestions</h2>
<p>Spotted an inaccurate clue, or have a concept you'd like to see? Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. Corrections are always welcome.</p>
${playCta("Ready to try today's puzzle?")}
`,
  });
}

function howToPlayPage() {
  return layout({
    path: "/how-to-play",
    title: "How to play Engineerdle | Rules, clues and scoring",
    description: "How Engineerdle works: one engineering concept per day, five progressive clues, five attempts. Rules, scoring, streaks, sharing and tips.",
    body: `
<div class="eyebrow">Guide</div>
<h1>How to play Engineerdle</h1>
<p class="lede">Name the day's engineering concept in as few clues as possible. You have five attempts.</p>

<h2>The basics</h2>
<ol>
  <li><strong>Read the first clue.</strong> The day's discipline (for example <em>Thermodynamics</em> or <em>Electronics</em>) is shown above it as a hint.</li>
  <li><strong>Type a guess.</strong> Suggestions appear as you type; picking one fills the box, then press Enter or <em>Submit guess</em>. You can also type any answer you like.</li>
  <li><strong>Wrong guess? You get another clue.</strong> Each clue is more direct than the last. Clue 5 all but defines the concept.</li>
  <li><strong>Stuck? Skip.</strong> Skipping reveals the next clue without guessing, but it uses up one of your five attempts.</li>
</ol>
<p>The game ends when you name the concept or use all five attempts. Either way, you'll see the answer and a short explanation of it.</p>

<h2>What counts as correct</h2>
<p>Answers are matched generously. Capitalisation, punctuation and the word "the" are ignored, small typos are forgiven, and common alternative names are accepted. For example, <em>centre of gravity</em> is accepted for <em>Center of Mass</em>, and <em>specific heat</em> for <em>Specific Heat Capacity</em>.</p>

<h2>Scoring and sharing</h2>
<p>Your score is the attempt you solved it on: 1/5 is exceptional, 3/5 is a solid result, and X/5 means it got away. <em>Share result</em> copies a spoiler-free summary:</p>
<ul>
  <li><span class="sq">🟩</span> correct guess</li>
  <li><span class="sq">🟥</span> wrong guess</li>
  <li><span class="sq">⬜</span> skipped clue</li>
  <li><span class="sq">⬛</span> attempt not needed</li>
</ul>

<h2>Streaks, statistics and the archive</h2>
<p>The statistics panel tracks games played, solve rate, your current streak and your best streak. Only the current day's puzzle counts towards them. The archive lets you play any earlier puzzle you missed, without affecting your streak.</p>
<p>A new puzzle appears at midnight in your local time zone. Your progress is stored in your browser, so clearing site data or switching devices starts you fresh.</p>

<h2>Tips</h2>
<ul>
  <li>Use the discipline hint to narrow the field before you guess.</li>
  <li>Early clues often describe an everyday consequence of the concept rather than its definition. Think about where you'd see it in the real world.</li>
  <li>A wrong guess and a skip cost the same, so guessing is always free information.</li>
  <li>After each game, read the explanation. Past answers are collected in the <a href="/concepts">concept library</a>.</li>
</ul>
${playCta("That's everything. Go and play today's puzzle.")}
`,
  });
}

function privacyPage() {
  return layout({
    path: "/privacy",
    title: "Privacy policy | Engineerdle",
    description: "How Engineerdle handles data: game progress stays in your browser, privacy-friendly analytics, and Google AdSense advertising cookies.",
    body: `
<div class="eyebrow">Legal</div>
<h1>Privacy policy</h1>
<p>Last updated: ${POLICY_DATE}</p>
<p>This policy explains what information Engineerdle ("we", "the site"), available at engineerdle.com, collects and how it is used. Engineerdle has no user accounts and never asks for your name or email address to play.</p>

<h2>Game progress stored on your device</h2>
<p>Your guesses, puzzle progress and statistics (games played, solve rate and streaks) are saved in your browser's local storage. This data stays on your device and is not sent to us. You can delete it at any time by clearing this site's data in your browser settings.</p>

<h2>Analytics</h2>
<p>We use Vercel Web Analytics to understand how the site is used, for example how many people visit, which pages they view, and anonymous game events such as a puzzle being solved or a result being shared. Vercel Web Analytics does not use cookies, and the data is aggregated so it cannot be used to identify or follow individual visitors across sites.</p>

<h2>Advertising and cookies</h2>
<p>Engineerdle is free to play and is supported by advertising served by Google AdSense.</p>
<ul>
  <li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.</li>
  <li>Google's use of advertising cookies enables it and its partners to serve ads to users based on their visits to this site and/or other sites on the Internet.</li>
  <li>You can opt out of personalised advertising by visiting <a href="https://adssettings.google.com" rel="noopener">Google Ads Settings</a>. You can also opt out of some third-party vendors' use of cookies for personalised advertising at <a href="https://www.aboutads.info/choices/" rel="noopener">www.aboutads.info</a>.</li>
</ul>
<p>To learn more, see <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">how Google uses information from sites or apps that use its services</a>. Where the law requires it, for example in the European Economic Area, the UK and Switzerland, you will be asked for consent before cookies are used for personalised advertising, and you can change your choice at any time.</p>

<h2>Other third parties</h2>
<ul>
  <li><strong>Hosting:</strong> the site is hosted by Vercel, whose servers process standard request information (such as IP address and browser type) to deliver pages and protect against abuse.</li>
  <li><strong>Fonts:</strong> typefaces are loaded from Google Fonts, which receives your IP address when the fonts are downloaded.</li>
  <li><strong>Links:</strong> after a puzzle, the game links to Google Search and Wikipedia. Those sites have their own privacy policies.</li>
</ul>

<h2>Children</h2>
<p>Engineerdle is a general-audience site and is not directed at children under 13. We do not knowingly collect personal information from children.</p>

<h2>Your rights</h2>
<p>Because we do not hold accounts or personal profiles, there is usually no personal data for us to access, correct or delete. Your game data is in your own browser and you control it. For advertising data, use the Google controls above. If you have a privacy question or request, contact us.</p>

<h2>Changes to this policy</h2>
<p>If this policy changes, the updated version will be posted on this page with a new "last updated" date.</p>

<h2>Contact</h2>
<p>Questions about this policy: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
`,
  });
}

function contactPage() {
  return layout({
    path: "/contact",
    title: "Contact | Engineerdle",
    description: "Get in touch with Engineerdle: puzzle corrections, concept suggestions, bug reports and other questions.",
    body: `
<div class="eyebrow">Contact</div>
<h1>Contact</h1>
<p class="lede">The best way to reach Engineerdle is by email: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>

<h2>Good reasons to get in touch</h2>
<ul>
  <li><strong>Puzzle corrections:</strong> a clue that's inaccurate, misleading or ambiguous, or a correct answer that wasn't accepted. Please include the puzzle number.</li>
  <li><strong>Concept suggestions:</strong> a law, method, component or phenomenon you'd like to see as a future puzzle.</li>
  <li><strong>Bugs:</strong> something not working. Mention your device and browser if you can.</li>
  <li><strong>Privacy or advertising questions:</strong> see the <a href="/privacy">privacy policy</a> first, then email if you need more.</li>
</ul>
${playCta("In the meantime, today's puzzle is waiting.")}
`,
  });
}

function notFoundPage(path) {
  return layout({
    path,
    title: "Page not found | Engineerdle",
    description: "This page doesn't exist.",
    noindex: true,
    body: `
<div class="eyebrow">404</div>
<h1>Page not found</h1>
<p class="lede">There's nothing at this address. If you were looking for a concept explanation, it may not be published yet: each concept is added to the library once its puzzle's day has finished worldwide.</p>
<p><a href="/concepts">Browse the concept library</a> or <a href="/">play today's puzzle</a>.</p>
`,
  });
}

function sitemap(all) {
  const today = new Date().toISOString().slice(0, 10);
  const latest = all.length ? isoDate(all.at(-1).number) : today;
  const urls = [
    ["/", today, "daily", "1.0"],
    ["/concepts", latest, "daily", "0.9"],
    ["/how-to-play", POLICY_ISO, "monthly", "0.6"],
    ["/about", POLICY_ISO, "monthly", "0.5"],
    ["/contact", POLICY_ISO, "yearly", "0.3"],
    ["/privacy", POLICY_ISO, "yearly", "0.3"],
    ...all.map((p) => [`/concept/${p.slug}`, isoDate(p.number), "monthly", "0.7"]),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([loc, lastmod, freq, pri]) => `  <url><loc>${ORIGIN}${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${freq}</changefreq><priority>${pri}</priority></url>`).join("\n")}
</urlset>
`;
}

/* ---------- Router ---------- */

const CACHE_OK = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
const CACHE_MISS = "public, max-age=60, s-maxage=300";

// Returns { status, type, cache, body } for a request path, or null if the path isn't ours.
// The paths handled here must match the rewrites in vercel.json.
export function renderPath(rawPath, now = Date.now()) {
  const path = rawPath.replace(/\/+$/, "") || "/";
  const all = publishedPuzzles(now);
  const html = (body, status = 200) => ({
    status,
    type: "text/html; charset=utf-8",
    cache: status === 200 ? CACHE_OK : CACHE_MISS,
    body,
  });

  switch (path) {
    case "/about": return html(aboutPage(all));
    case "/how-to-play": return html(howToPlayPage());
    case "/privacy": return html(privacyPage());
    case "/contact": return html(contactPage());
    case "/concepts": return html(conceptsIndex(all));
    case "/sitemap.xml": return { status: 200, type: "application/xml; charset=utf-8", cache: CACHE_OK, body: sitemap(all) };
  }
  const m = path.match(/^\/concept\/([a-z0-9-]+)$/);
  if (m) {
    const p = all.find((q) => q.slug === m[1]);
    return p ? html(conceptPage(p, all)) : html(notFoundPage(path), 404);
  }
  return null;
}
