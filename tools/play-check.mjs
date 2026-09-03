// Play one real catch in a real browser and screenshot every beat of it.
// A VERIFICATION tool: nothing loads it at runtime.
//
//   NODE_PATH=/tmp/node_modules node tools/play-check.mjs --loc pond --tag f1 --out /tmp/shots
//
// spot-check.mjs takes one still of a spot; this takes the whole catch — cast,
// wait, approach, bite, reel, landing, and the beat after it — because the
// Catch Feel epic (BUILD_PLAN_FEEL.md) is entirely about things that are only
// wrong for a moment. Every F1 bug was found here and none of them would have
// failed an assertion: the duplicate ripple, the placeholder body showing
// through the approach silhouette, and the line's far end jumping at the bite
// are all three-frame problems.
//
// It also prints, at each beat, the numbers behind the picture: #fish's
// position and class list, how many species layers are mounted, and where the
// line's <path> actually ends (in design px, since the path is drawn inside
// the scaled #scene-frame). Read those, then look at the shot — the class list
// is what showed `.rigged` being wiped.
//
// Needs the repo served (python3 -m http.server 8080) and playwright available
// (cd /tmp && npm install playwright). Chromium is already on the box.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const args = Object.fromEntries(process.argv.slice(2).join(" ")
  .split("--").filter(Boolean).map(s => s.trim().split(/\s+/, 2)).map(([k, v]) => [k, v ?? true]));
const loc = args.loc ?? "pond";
const outDir = args.out ?? "/tmp/shots";   // one PNG per beat, named <tag>-<beat>.png
const tag = args.tag ?? "now";
const url = args.url ?? "http://localhost:8080/index.html";
mkdirSync(outDir, { recursive: true });
const require = createRequire("/tmp/node_modules/playwright/index.js");
const { chromium } = require("/tmp/node_modules/playwright/index.js");

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const missing = [];
page.on("requestfailed", r => { if (r.url().includes("/assets/")) missing.push(r.url()); });
page.on("pageerror", e => console.log("PAGE ERROR:", e.message));

await page.goto(url);
await page.evaluate(([loc]) => {
  const now = Date.now();
  localStorage.setItem("tf:profile:spotcheck", JSON.stringify({
    id: "spotcheck", name: "Spot", avatar: "🎣", createdAt: now, updatedAt: now,
    totalCatches: 40, stage: 5, coins: 900, rank: "Angler", location: loc,
    unlockedLocations: ["pond", "stream", "ocean"],
    upgrades: { rod: "carbon", bait: "worm", boat: "classic", hat: "straw",
      owned: { rod: ["stick", "bamboo", "carbon"], bait: ["worm"], boat: ["classic"], hat: ["none", "straw"] } },
    collection: {}, records: {}, badges: [],
    stats: { letters: {}, wordsTyped: 0, escapes: 0, sessionCount: 1, lastPlayed: now },
    jokesEndured: 0, speedBest: null,
  }));
  localStorage.setItem("tf:profiles", JSON.stringify([{ id: "spotcheck", name: "Spot", avatar: "🎣", updatedAt: now }]));
  localStorage.setItem("tf:active", "spotcheck");
}, [loc]);
await page.reload();
await page.waitForTimeout(900);
await page.click(".profile-cell:not(.add)");
await page.waitForTimeout(1000);

const shot = n => page.screenshot({ path: `${outDir}/${tag}-${n}.png` });
const word = () => page.evaluate(() => document.getElementById("word").textContent.trim());
const status = () => page.evaluate(() => document.getElementById("status").textContent);
// where the line's far end actually is, read off the rendered <path>
const lineEnd = () => page.evaluate(() => {
  const d = document.getElementById("line-path").getAttribute("d");
  return d ? d.split(" ").slice(-2).join(",") : "(no line)";
});
const fishAt = () => page.evaluate(() => {
  const f = document.getElementById("fish");
  return `${f.style.left},${f.style.top} cls=[${f.className}] layers=${f.querySelectorAll(".fish-layer").length}`;
});

async function typeWord() {
  const w = await word();
  const clean = w.replace(/␣/g, " ");
  for (const ch of clean) { await page.keyboard.press(ch === " " ? "Space" : ch); await page.waitForTimeout(45); }
  return clean;
}

console.log("cast word:", await word(), "| status:", await status());
await shot("1-cast");
await typeWord();
// the lure is still in flight for backswingMs+flightMs; measure at rest
await page.waitForFunction(() => document.getElementById("bobber").classList.contains("on"), { timeout: 8000 });
await page.waitForTimeout(120);
console.log("waiting   | line end:", await lineEnd(), "| status:", await status());
await shot("2-waiting");

// catch the approach silhouette: poll until #fish has opacity
await page.waitForFunction(() => document.getElementById("fish").style.opacity === "1", { timeout: 15000 });
console.log("approach  |", await fishAt());
await shot("3-approach");
await page.waitForTimeout(250);
await shot("3b-approach-late");
console.log("approach+ |", await fishAt());

// bite: wait for the reel phase (the word box refills)
await page.waitForFunction(() => document.getElementById("word").textContent.trim().length > 0, { timeout: 15000 });
await page.waitForTimeout(120);
console.log("bite      |", await fishAt(), "| line end:", await lineEnd(), "| status:", await status());
await shot("4-bite");

// reel it in
for (let i = 0; i < 12; i++) {
  const left = await page.evaluate(() => document.getElementById("dist").textContent);
  if (left === "—") break;
  await typeWord();
  await page.waitForTimeout(520);
  if (i === 0) await shot("5-reeling");
  if (left.startsWith("1 ")) { await page.waitForTimeout(120); await shot("6-landing"); }
}
await page.waitForTimeout(300);
console.log("landed    | status:", await status());
await shot("7-caught");
await page.waitForTimeout(1600);
console.log("after     | status:", await status(), "| word:", await word());
await shot("8-after");
console.log("missing assets:", missing.length ? missing : "none");
await browser.close();
