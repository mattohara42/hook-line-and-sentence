// Drive the real game in a real browser, past the profile modal, and screenshot
// a spot. An ART PIPELINE / verification tool: nothing loads it at runtime.
//
//   node tools/spot-check.mjs --loc ocean --hat straw --rod deepsea
//   node tools/spot-check.mjs --loc pond --out /tmp/pond.png
//
// Needs a server (`python3 -m http.server 8080`) and playwright available:
//   cd /tmp && npm install playwright
//   node --experimental-... no; just: NODE_PATH=/tmp/node_modules node tools/spot-check.mjs
//
// Why this exists: CLAUDE.md requires visual claims to be checked in a browser
// and screenshots to be taken PAST the startup modal, because #profiles covers
// the viewport until an angler is created. app.js is an ES module, so nothing is
// on `window`: the way in is to seed a profile in localStorage, reload, and
// click the card. That was re-derived three times in one session before it got
// written down. It also prints the rig's layer stack and any failed asset
// request, which is how an unregistered gear PNG shows itself.
import { createRequire } from "node:module";

const args = Object.fromEntries(process.argv.slice(2).join(" ")
  .split("--").filter(Boolean).map(s => s.trim().split(/\s+/, 2)).map(([k, v]) => [k, v ?? true]));
const loc = args.loc ?? "pond";
const out = args.out ?? `/tmp/spot-${loc}.png`;
const url = args.url ?? "http://localhost:8080/index.html";
const require = createRequire(args.playwright ?? "/tmp/node_modules/playwright/index.js");
const { chromium } = require(args.playwright ?? "/tmp/node_modules/playwright/index.js");

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const missing = [];
page.on("requestfailed", r => { if (r.url().includes("/assets/")) missing.push(r.url()); });
page.on("response", r => { if (r.url().includes("/assets/") && r.status() >= 400) missing.push(`${r.status()} ${r.url()}`); });

await page.goto(url);
await page.evaluate(([loc, rod, hat, boat]) => {
  const now = Date.now();
  const save = {
    id: "spotcheck", name: "Spot", avatar: "🎣", createdAt: now, updatedAt: now,
    totalCatches: 40, stage: 5, coins: 900, rank: "Angler", location: loc,
    unlockedLocations: ["pond", "stream", "ocean"],
    upgrades: { rod, bait: "worm", boat, hat,
      owned: { rod: ["stick", "bamboo", "carbon", "deepsea"], bait: ["worm"],
               boat: ["classic"], hat: ["none", "straw", "bucket", "beanie", "souwester"] } },
    collection: {}, records: {}, badges: [],
    stats: { letters: {}, wordsTyped: 0, escapes: 0, sessionCount: 1, lastPlayed: now },
    jokesEndured: 0, speedBest: null,
  };
  localStorage.setItem("tf:profile:spotcheck", JSON.stringify(save));
  localStorage.setItem("tf:profiles", JSON.stringify([{ id: "spotcheck", name: "Spot", avatar: "🎣", updatedAt: now }]));
  localStorage.setItem("tf:active", "spotcheck");
}, [loc, args.rod ?? "deepsea", args.hat ?? "straw", args.boat ?? "classic"]);

await page.reload();
await page.waitForTimeout(900);
await page.click(".profile-cell:not(.add)");   // the picker gates play; there is no autopick
await page.waitForTimeout(1100);

console.log("scene :", await page.evaluate(() => document.getElementById("scene").className));
console.log("layers:", (await page.evaluate(() => [...document.querySelectorAll(".rig-layer")]
  .map(d => `${d.dataset.id} ${d.style.backgroundImage.replace(/.*assets\//, "").replace(/"\)$/, "")}`))).join("  "));
await page.screenshot({ path: out });
console.log("shot  :", out);
console.log("missing assets:", missing.length ? missing : "none");
await browser.close();
