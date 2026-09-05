// Drive the real game in a real browser and watch the ambient actors (L1): do
// they appear at all, where do they end up, and how much of each one can any
// given screen shape actually see?
//
//   node tools/life-check.mjs                       # every spot, 1280x800, shots + assertions
//   node tools/life-check.mjs --loc pond --sweep    # ...and the twelve ui-check viewports
//
// Needs a server (`python3 -m http.server 8080`) and playwright:
//   cd /tmp && npm install playwright
//   NODE_PATH=/tmp/node_modules node tools/life-check.mjs
//
// Why this exists, and why ui-check.mjs is not it. An actor lives inside
// #scene-viewport, which ui-check deliberately excludes: the scene is MEANT to
// be under every overlay, so its rectangle overlaps everything and tells you
// nothing. The question here is the opposite one, and it is not about overlays
// at all: the scene is a 720x360 canvas scaled to COVER the viewport and
// anchored bottom-left, so how much of it exists on screen changes by a factor
// of four across the shapes the game is played in (a portrait phone gets design
// x 0..166 of 720). An actor can therefore be perfectly placed, perfectly
// animated, pass every assertion in the suite, and never once be seen.
//
// It found exactly that twice in one sitting: a frog surfacing squarely behind
// the word box, where a kid hears a croak and sees nothing, and then the much
// larger version of the same fact, which is that a phone held upright cannot
// see where the lure lands either (BACKLOG.md).
//
// The voices are sped up by rewriting config.js in flight rather than on disk,
// so a frog that speaks every 7-19s can be photographed in a few seconds. That
// deliberately breaks the one invariant the data test holds (an actor must not
// outlive the gap between its voice's firings), so actors overlap here in a way
// they never do in the real game: the density in these shots is an artefact of
// the tool, not the design.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { CONFIG } from "../config.js";

const args = Object.fromEntries(process.argv.slice(2).join(" ")
  .split("--").filter(Boolean).map(s => s.trim().split(/\s+/, 2)).map(([k, v]) => [k, v ?? true]));
const outDir = args.out ?? "/tmp/life";
const url = args.url ?? "http://localhost:8080/index.html";
const gapMs = +(args.gap ?? 900);
mkdirSync(outDir, { recursive: true });

const VIEWPORTS = [
  { name: "phone-xs", w: 320, h: 568 }, { name: "phone-sm", w: 360, h: 640 },
  { name: "phone", w: 390, h: 844 },    { name: "phone-land", w: 740, h: 360 },
  { name: "phone-land-lg", w: 844, h: 390 }, { name: "tablet", w: 768, h: 1024 },
  { name: "tablet-land", w: 1024, h: 768 },  { name: "small-window", w: 900, h: 600 },
  { name: "laptop", w: 1280, h: 800 },  { name: "desktop", w: 1440, h: 900 },
  { name: "desktop-lg", w: 1920, h: 1080 }, { name: "ultrawide", w: 2560, h: 1080 },
];
// The two shapes where the keyboard covers the scene from y=165 down. Known
// broken and listed as such in ui-check.mjs; an actor lost there is not news.
const LANDSCAPE = new Set(["phone-land", "phone-land-lg"]);

const require = createRequire(args.playwright ?? "/tmp/node_modules/playwright/index.js");
const { chromium } = require(args.playwright ?? "/tmp/node_modules/playwright/index.js");
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const problems = [], missing = [];
page.on("pageerror", e => problems.push(`page error: ${e.message}`));
page.on("response", r => { if (r.url().includes("/assets/") && r.status() >= 400) missing.push(`${r.status()} ${r.url()}`); });
await page.route("**/config.js", async route => {
  const r = await route.fetch();
  const body = (await r.text()).replace(/everyMs: \[\s*\d+,\s*\d+\s*\]/g, `everyMs: [${gapMs}, ${gapMs + 200}]`);
  await route.fulfill({ response: r, body });
});

// The way past #profiles: seed a profile, reload, click the card. Same as
// spot-check.mjs, and re-derived three times before anyone wrote it down.
async function enter(loc) {
  await page.goto(url);
  await page.evaluate((loc) => {
    const now = Date.now();
    localStorage.setItem("tf:profile:life", JSON.stringify({
      id: "life", name: "Life", avatar: "🎣", createdAt: now, updatedAt: now, totalCatches: 40,
      stage: 5, coins: 900, rank: "Angler", location: loc,
      unlockedLocations: ["pond", "stream", "ocean"],
      upgrades: { rod: "deepsea", bait: "worm", boat: "classic", hat: "straw",
        owned: { rod: ["stick", "bamboo", "carbon", "deepsea"], bait: ["worm"], boat: ["classic"], hat: ["none", "straw"] } },
      collection: {}, records: {}, badges: [], junk: {},
      stats: { letters: {}, wordsTyped: 0, escapes: 0, sessionCount: 1, lastPlayed: now },
      jokesEndured: 0, speedBest: null,
    }));
    localStorage.setItem("tf:profiles", JSON.stringify([{ id: "life", name: "Life", avatar: "🎣", updatedAt: now }]));
    localStorage.setItem("tf:active", "life");
  }, loc);
  await page.reload();
  await page.waitForTimeout(800);
  await page.click(".profile-cell:not(.add)");
  await page.waitForTimeout(400);
}

// One sample of every actor on screen: where it is in DESIGN space, and what
// fraction of it is hidden right now, counting both the overlays and the crop.
const sample = () => page.evaluate(() => {
  const frame = document.getElementById("scene-frame").getBoundingClientRect();
  const s = frame.width / 720;
  const rect = el => el.getBoundingClientRect();
  const overlays = ["word", "guide-panel", "topbar", "catch-card", "pun"]
    .map(id => document.getElementById(id))
    .filter(el => el && !el.hidden && el.getClientRects().length).map(rect);
  return [...document.querySelectorAll("#life .actor")].map(el => {
    const b = rect(el), area = b.width * b.height;
    if (!area) return null;
    const onScreen = Math.max(0, Math.min(b.right, innerWidth) - Math.max(b.left, 0))
                   * Math.max(0, Math.min(b.bottom, innerHeight) - Math.max(b.top, 0));
    let hidden = area - onScreen;
    for (const o of overlays)
      hidden += Math.max(0, Math.min(b.right, o.right) - Math.max(b.left, o.left))
              * Math.max(0, Math.min(b.bottom, o.bottom) - Math.max(b.top, o.top));
    return {
      kind: el.className.replace("actor actor-", ""),
      x: Math.round((b.left - frame.left) / s), y: Math.round(360 - (frame.bottom - b.top) / s),
      opacity: +getComputedStyle(el).opacity,
      hiddenPct: Math.round(100 * Math.min(hidden, area) / area),
    };
  }).filter(Boolean);
});

// Watch for a while and keep, per kind, the BEST moment it ever had. Worst-case
// is the wrong statistic: a crosser is supposed to start off-crop and fade out
// at the far end, so the only question is whether it is ever properly seen.
async function watch(ms, shoot = null) {
  const best = new Map(), spanX = new Map();
  for (let i = 0; i < ms / 130; i++) {
    await page.waitForTimeout(130);
    for (const a of await sample()) {
      if (a.opacity < 0.5) continue;
      best.set(a.kind, Math.min(best.get(a.kind) ?? 100, a.hiddenPct));
      const s = spanX.get(a.kind) ?? [999, -999];
      spanX.set(a.kind, [Math.min(s[0], a.x), Math.max(s[1], a.x)]);
      if (shoot && a.hiddenPct === 0 && !shoot.done.has(a.kind)) {
        shoot.done.add(a.kind);
        await page.screenshot({ path: `${outDir}/life-${shoot.loc}-${a.kind}.png` });
      }
    }
  }
  return { best, spanX };
}

let failures = 0;
const spots = args.loc ? [args.loc] : Object.keys(CONFIG.life);
for (const loc of spots) {
  const want = Object.keys(CONFIG.life[loc] ?? {});
  await enter(loc);
  await page.setViewportSize({ width: 1280, height: 800 });
  const { best, spanX } = await watch(6500, { loc, done: new Set() });
  console.log(`\n${loc}: ${want.length} actor(s) configured`);
  for (const kind of want) {
    const span = spanX.get(kind);
    if (!best.has(kind)) { console.log(`  FAIL ${kind}: never appeared`); failures++; continue; }
    console.log(`  ok   ${kind.padEnd(11)} x ${String(span[0]).padStart(3)}..${String(span[1]).padStart(3)}` +
                `  best moment ${best.get(kind)}% hidden  → ${outDir}/life-${loc}-${kind}.png`);
  }
  for (const kind of [...best.keys()].filter(k => !want.includes(k)))
    { console.log(`  FAIL ${kind}: appeared at ${loc}, which has no entry for it`); failures++; }

  if (!args.sweep) continue;
  console.log(`  how much of each is ever unobscured, by shape:`);
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.waitForTimeout(200);
    const seen = (await watch(3200)).best;
    const line = want.map(k => `${k} ${seen.has(k) ? String(100 - seen.get(k)).padStart(3) + "%" : "  0%"}`).join("  ");
    const blind = want.filter(k => !seen.has(k) || seen.get(k) > 60);
    const note = !blind.length ? "" : LANDSCAPE.has(vp.name) ? "   (landscape: known, ui-check lists it)" : `   ← ${blind.join(", ")} barely visible here`;
    console.log(`    ${vp.name.padEnd(14)} ${line}${note}`);
  }
}

if (missing.length) { console.log("\nmissing assets:", missing.join("  ")); failures += missing.length; }
if (problems.length) { console.log("\n" + problems.join("\n")); failures += problems.length; }
console.log(failures ? `\n${failures} problem(s)` : "\nevery configured actor appeared, and nothing appeared that shouldn't");
await browser.close();
process.exit(failures ? 1 : 0);
