// Check the game's CHROME: the overlays that float above the pond. Two passes,
// both assert, and it exits non-zero. A VERIFICATION tool: nothing loads it at
// runtime.
//
//   NODE_PATH=/tmp/node_modules node tools/ui-check.mjs [--out dir] [--only name] [--skip-behaviour]
//
// Pass 1 (layout) sweeps twelve viewport shapes and checks that no two overlays
// overlap. Pass 2 (behaviour) drives the top bar at a phone and a desktop: the
// tray takes clicks, the jokes toggle does what it claims, and a real catch
// stands the pun bubble down. Pass 3 opens each browsable panel at all twelve
// shapes and holds P1's promise to it: the close button is top-left, on screen
// and thumb-sized wherever you are, and nothing in the panel hangs off the side.
//
// Why this exists: every overlap the top-bar rework fixed was a geometry bug,
// and not one of them could fail an assertion, because the only tools that
// opened a browser (spot-check, play-check) shoot a single 1280x720 window and
// print pictures for a human. The HUD chips overlapping the tackle box was
// visible on any phone for weeks. Overlap is arithmetic on two rectangles, so
// it is checkable, at every size, in about fifteen seconds.
//
// What it checks, per viewport and per state:
//   - no two overlays overlap, except the pairs ALLOWED below (each with the
//     reason it is allowed: a menu the kid opened is meant to cover things)
//   - nothing is clipped by the viewport edges
//   - the things a finger has to hit are big enough, and the line a kid has to
//     read is not tiny
//
// Two limits worth knowing. The card/banner/toast states are SYNTHESISED: the
// tool puts the DOM into the shape app.js leaves it in, because playing 11 real
// catches costs three minutes and this is a geometry check, not a gameplay one.
// The behaviour pass plays one real catch, which is what proves the synthetic
// shape is the real one; play-check.mjs still owns the beats themselves.
// And a screenshot per viewport lands in --out, because an assertion proves the
// code ran, not that the picture is right (CLAUDE.md).
import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";

const args = Object.fromEntries(process.argv.slice(2).join(" ")
  .split("--").filter(Boolean).map(s => s.trim().split(/\s+/, 2)).map(([k, v]) => [k, v ?? true]));
const outDir = args.out ?? "/tmp/layout";
const url = args.url ?? "http://localhost:8080/index.html";
mkdirSync(outDir, { recursive: true });

// The shapes the game is actually played in. Phones both ways up, a tablet both
// ways up, the laptop sizes, and the two extremes: a small window someone has
// dragged narrow, and an ultrawide where a fixed layout can strand things.
const VIEWPORTS = [
  { name: "phone-xs",        w: 320, h: 568 },
  { name: "phone-sm",        w: 360, h: 640 },
  { name: "phone",           w: 390, h: 844 },
  { name: "phone-land",      w: 740, h: 360 },
  { name: "phone-land-lg",   w: 844, h: 390 },
  { name: "tablet",          w: 768, h: 1024 },
  { name: "tablet-land",     w: 1024, h: 768 },
  { name: "small-window",    w: 900, h: 600 },
  { name: "laptop",          w: 1280, h: 800 },
  { name: "desktop",         w: 1440, h: 900 },
  { name: "desktop-lg",      w: 1920, h: 1080 },
  { name: "ultrawide",       w: 2560, h: 1080 },
];

// Every fixed overlay that can be on screen at once. #scene-viewport is the
// game itself and is meant to be under all of it, so it is not in the list.
const OVERLAYS = ["h1", "pun", "hud", "tacklebox", "controls", "catch-card",
                  "word", "guide-panel", "badge-toast", "unlock-banner"];

// Overlaps that are correct, with the reason. Anything not in here is a bug.
const ALLOWED = [
  ["controls", "*",            "the tackle box tray is a menu the kid opened: it covers what is behind it"],
  ["unlock-banner", "catch-card", "CLAUDE.md/style.css: the banner deliberately plays OVER a held card"],
  ["unlock-banner", "word",    "the celebration is 2.6s and the word box is not going anywhere"],
  ["unlock-banner", "pun",     "same: a banner is a moment, the bubble is behind it"],
  ["pun", "word",              "only on a short landscape screen, and #word outranks the top bar there"],
  ["pun", "h1",                "they are the same column and the bubble's shadow reaches the title"],
  ["unlock-banner", "guide-panel", "the banner is a 2.6s celebration at z-index 6 and paints over the keyboard, which nobody is typing on during it"],
];
const allowed = (a, b) => ALLOWED.some(([x, y]) =>
  (x === a && (y === b || y === "*")) || (x === b && (y === a || y === "*")));

// Overlaps that ARE wrong and are not being fixed here, each with where the
// decision is written down. They print as `known` rather than failing, so the
// sweep can be green when the game is as good as it is meant to be today, and
// the list stays short enough to read. A phone on its side is ~360px tall and
// has to hold the HUD, #word at 250px up and a 200px keyboard: the celebration
// overlays have nowhere left to go, and the fix is a landscape pass, not a
// nudge (BACKLOG.md, "Layout, found during the top-bar rework").
const KNOWN = [
  { pair: ["catch-card", "word"], when: vp => vp.h <= 400,
    why: "landscape: the card's band collapses to nothing, so the card is a sliver" },
  { pair: ["catch-card", "hud"], when: vp => vp.h <= 400, why: "same collapsed band" },
  { pair: ["badge-toast", "unlock-banner"], when: vp => vp.h <= 400,
    why: "landscape: the banner at 40% and the toast's band are the same strip (the toast is z12, so it reads)" },
];
const known = (a, b, vp) => KNOWN.find(k =>
  ((k.pair[0] === a && k.pair[1] === b) || (k.pair[0] === b && k.pair[1] === a)) && k.when(vp));

const require = createRequire("/tmp/node_modules/playwright/index.js");
const { chromium } = require("/tmp/node_modules/playwright/index.js");
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const problems = [], notes = [];
// free with a browser already open, and the class of bug that hides best: an
// unregistered PNG 404s into an invisible layer and nothing else goes wrong
page.on("pageerror", e => problems.push(`page error: ${e.message}`));
page.on("requestfailed", r => { if (r.url().includes("/assets/")) problems.push(`asset never loaded: ${r.url()}`); });

await page.goto(url);
await page.evaluate(() => {
  const now = Date.now();
  localStorage.setItem("tf:profile:layout", JSON.stringify({
    id: "layout", name: "Layout", avatar: "🎣", createdAt: now, updatedAt: now,
    totalCatches: 40, stage: 5, coins: 900, rank: "Angler", location: "pond",
    unlockedLocations: ["pond", "stream", "ocean"],
    upgrades: { rod: "deepsea", bait: "worm", boat: "classic", hat: "straw",
      owned: { rod: ["stick", "bamboo", "carbon", "deepsea"], bait: ["worm"], boat: ["classic"], hat: ["none", "straw"] } },
    collection: { pumpkinseed: 40 }, records: {}, badges: [],
    stats: { letters: {}, wordsTyped: 0, escapes: 0, sessionCount: 1, lastPlayed: now },
    jokesEndured: 0, speedBest: null,
  }));
  localStorage.setItem("tf:profiles", JSON.stringify([{ id: "layout", name: "Layout", avatar: "🎣", updatedAt: now }]));
  localStorage.setItem("tf:active", "layout");
});
await page.reload();
await page.waitForTimeout(800);
await page.click(".profile-cell:not(.add)");
await page.waitForTimeout(700);

// ---- the states, as app.js leaves the DOM in each ----
const setState = (state) => page.evaluate((state) => {
  const $ = id => document.getElementById(id);
  // reset to idle
  $("card-slot").hidden = true;
  $("catch-card").className = "";
  $("unlock-banner").classList.remove("show");
  $("badge-toast").classList.remove("show");
  $("pun").classList.remove("behind-card");
  if (state === "idle") return;
  if (state === "busy") {
    // a new species that unlocks letters and earns a badge: the three biggest
    // overlays the game can put up at once, all with their longest real text
    const card = $("catch-card");
    card.className = "catch plaque in";
    card.querySelector(".card-ribbon").textContent = "NEW SPECIES  ·  RECORD SIZE";
    card.querySelector(".card-name").textContent = "Sir Loin of Salmon";
    card.querySelector(".card-sub").textContent = "12.4 lb, a LUNKER!";
    card.querySelector(".card-pun").textContent = "✨ RARE! The deep gave up a good one ✨";
    card.querySelector(".card-coins").textContent = "+25 coins";
    const shape = card.querySelector(".card-fish");
    shape.style.width = "150px"; shape.style.height = "80px";
    $("card-slot").hidden = false;
    $("pun").classList.add("behind-card");     // what showCatchCard() does
    $("unlock-banner").querySelector(".banner-title").textContent = "NEW LETTERS UNLOCKED!";
    $("unlock-banner").querySelector(".letters").textContent = "R  T  N  S";
    $("unlock-banner").classList.add("show");
    $("badge-toast").innerHTML = "<span class='badge-medal'>\u{1F396}️</span> Badge earned: <b>Junk Collector</b>";
    $("badge-toast").classList.add("show");
  }
}, state);

const measure = () => page.evaluate((ids) => {
  const out = { boxes: {}, meta: {} };
  for (const id of ids) {
    const n = document.getElementById(id);
    if (!n) continue;
    const cs = getComputedStyle(n);
    if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.1) continue;
    const r = n.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    out.boxes[id] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
                      right: Math.round(r.right), bottom: Math.round(r.bottom) };
  }
  out.meta.statusFont = parseFloat(getComputedStyle(document.getElementById("status")).fontSize);
  out.meta.chipFont = parseFloat(getComputedStyle(document.querySelector(".chip")).fontSize);
  const tb = document.getElementById("tacklebox").getBoundingClientRect();
  out.meta.tackle = { w: Math.round(tb.width), h: Math.round(tb.height) };
  // the smallest thing in the tray a finger has to hit
  const trayBtns = [...document.querySelectorAll("#controls button")]
    .map(b => b.getBoundingClientRect()).filter(r => r.width && r.height);
  out.meta.trayMinH = trayBtns.length ? Math.round(Math.min(...trayBtns.map(r => r.height))) : null;
  return out;
}, OVERLAYS);

const hit = (a, b) => a.x < b.right && b.x < a.right && a.y < b.bottom && b.y < a.bottom;
const fail = (vp, state, msg) => problems.push(`${vp.name} ${vp.w}x${vp.h} [${state}]  ${msg}`);

async function checkViewport(vp) {
  await page.setViewportSize({ width: vp.w, height: vp.h });
  await page.waitForTimeout(160);
  for (const state of ["idle", "tray", "busy"]) {
    await setState(state === "tray" ? "idle" : state);
    const trayOpen = await page.evaluate(() => !document.getElementById("controls").hidden);
    if (state === "tray" && !trayOpen) { await page.click("#tacklebox"); await page.waitForTimeout(200); }
    if (state !== "tray" && trayOpen) { await page.click("#tacklebox"); await page.waitForTimeout(200); }
    await page.waitForTimeout(420);        // the toast fades over 300ms: measure it settled, not mid-transition
    const { boxes, meta } = await measure();
    const ids = Object.keys(boxes);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const [a, b] = [ids[i], ids[j]];
      if (!hit(boxes[a], boxes[b]) || allowed(a, b)) continue;
      const k = known(a, b, vp);
      if (k) notes.push(`${vp.name} ${vp.w}x${vp.h} [${state}]  ${a} x ${b}: ${k.why}`);
      else fail(vp, state, `${a} overlaps ${b}: ${JSON.stringify(boxes[a])} vs ${JSON.stringify(boxes[b])}`);
    }
    for (const [id, r] of Object.entries(boxes)) {
      if (r.x < -1 || r.y < -1 || r.right > vp.w + 1 || r.bottom > vp.h + 1)
        fail(vp, state, `${id} is clipped by the viewport: ${JSON.stringify(r)}`);
    }
    if (meta.tackle.w < 44 || meta.tackle.h < 44)
      fail(vp, state, `the tackle box is ${meta.tackle.w}x${meta.tackle.h}: under a 44px touch target`);
    if (meta.statusFont < 15)
      fail(vp, state, `the pun bubble is ${meta.statusFont}px: the game's voice should not be smaller than 15`);
    if (meta.chipFont < 10) fail(vp, state, `HUD chips are ${meta.chipFont}px`);
    if (state === "tray" && meta.trayMinH !== null && meta.trayMinH < 28)
      fail(vp, state, `a tray button is only ${meta.trayMinH}px tall`);
    if (state === "busy") await page.screenshot({ path: `${outDir}/${vp.name}.png` });
  }
  await setState("idle");
}

const only = typeof args.only === "string" ? args.only : null;
for (const vp of VIEWPORTS) {
  if (only && vp.name !== only) continue;
  const before = problems.length;
  await checkViewport(vp);
  console.log(`${problems.length === before ? "ok  " : "FAIL"}  ${vp.name.padEnd(14)} ${vp.w}x${vp.h}`);
}

// ---- pass 2: does the chrome actually work ----
// Geometry is only half of it. These are the behaviours the top bar claims, and
// every one of them was wrong at some point while it was being written.
const POOLS = JSON.parse(readFileSync(new URL("../data/puns.json", import.meta.url), "utf8"));
const check = (ok, msg) => { console.log(`${ok ? "ok  " : "FAIL"}  ${msg}`); if (!ok) problems.push(msg); };
const st = () => page.evaluate(() => document.getElementById("status").textContent);
const word = () => page.evaluate(() => document.getElementById("word").textContent.trim());
const typeWord = async () => { for (const c of (await word()).replace(/\u2423/g, " ")) {
  await page.keyboard.press(c === " " ? "Space" : c); await page.waitForTimeout(35); } };
// Where the line's far end is, read off the rendered <path>, and a wait for it
// to stop there. The lure is still in flight for backswingMs+flightMs after the
// last key of a cast, and NOTHING about the wait is decided until it lands:
// startWait() sets the wait flavour immediately, then castLine's callback rolls
// the wiggle and may replace that line with an instruction. Reading the bubble
// before the landing is what made this pass fail about one run in three
// (BACKLOG.md, 2026-09-04: 4 runs in 12, which is CONFIG.wiggle.chance to the
// run). The end of the LINE is the signal that does not care what each spot
// floats, which is why play-check.mjs waits on the same thing.
const lineEnd = () => page.evaluate(() => {
  const d = document.getElementById("line-path").getAttribute("d");
  return d ? d.split(" ").slice(-2).join(",") : "(no line)";
});
const castLands = async () => {
  let prev = null, settled = 0;
  for (let i = 0; i < 60 && settled < 2; i++) {
    const now = await lineEnd();
    settled = (now !== "(no line)" && now === prev) ? settled + 1 : 0;
    prev = now;
    await page.waitForTimeout(150);
  }
  return settled >= 2;
};
const enter = async () => { await page.reload(); await page.waitForTimeout(750);
  await page.click(".profile-cell:not(.add)"); await page.waitForTimeout(600); };

async function behaviour() {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);

  // the tray, inside a pointer-events:none top bar
  await page.click("#tacklebox"); await page.waitForTimeout(250);
  check(!(await page.evaluate(() => document.getElementById("controls").hidden)), "the tackle box opens the tray");
  const pad = await page.evaluate(() => { const r = document.getElementById("controls").getBoundingClientRect();
    return { x: r.x + 4, y: r.y + 4 }; });
  await page.mouse.click(pad.x, pad.y); await page.waitForTimeout(250);
  check(!(await page.evaluate(() => document.getElementById("controls").hidden)),
    "a click on the tray's own padding does not close it");
  await page.mouse.click(30, Math.round(844 * 0.62)); await page.waitForTimeout(250);
  check(await page.evaluate(() => document.getElementById("controls").hidden), "a click on the scene closes the tray");

  // the voice, at each spot: its own lines, and the instruction in every one
  const spots = ["pond", "stream", "ocean"];
  for (const spot of spots) {
    await page.click("#tacklebox"); await page.waitForTimeout(200);
    await page.click(`#locations .toggle-btn:nth-child(${spots.indexOf(spot) + 1})`);
    await page.waitForTimeout(500);
    check((await page.evaluate(() => document.getElementById("scene").className)) === `loc-${spot}`,
      `the tray switches water to the ${spot}`);
    const casts = new Set();
    for (let i = 0; i < 5; i++) { await enter(); casts.add(await st()); }
    const strays = [...casts].filter(c => !POOLS[spot].cast.includes(c));
    check(strays.length === 0,
      `every cast line at the ${spot} comes from its own pool${strays.length ? `: ${JSON.stringify(strays)}` : ""}`);
    check([...casts].every(c => /\btype\b.*\bcast\b/i.test(c)),
      `every ${spot} cast line seen keeps the literal instruction`);
  }

  // the jokes: dismissable, and the instruction survives it
  check(await page.evaluate(() => document.getElementById("pun-dismiss").hidden),
    "no dismiss x is offered on the cast instruction");
  await typeWord();
  check(await castLands(), "the cast comes to rest before the bubble is judged");
  // F4: about a third of casts land on a wiggle, whose prompt is an instruction
  // and carries no x. Type it out rather than skipping the rest of this block,
  // which is what the old branch did: the line the wait settles on afterwards
  // is flavour either way (wiggleDone, or the bite), so the dismiss path is now
  // exercised on every run instead of on two runs in three.
  const wiggled = POOLS.shared.wiggle.includes(await st());
  check((await page.evaluate(() => document.getElementById("pun-dismiss").hidden)) === wiggled,
    wiggled ? "no dismiss x on the wiggle instruction either" : "the dismiss x is offered on a flavour line");
  for (let i = 0; i < 8 && POOLS.shared.wiggle.includes(await st()); i++) {
    await typeWord(); await page.waitForTimeout(200);
  }
  check(!(await page.evaluate(() => document.getElementById("pun-dismiss").hidden)),
    "the dismiss x is offered on the flavour line the wait settles on");
  await page.click("#pun-dismiss"); await page.waitForTimeout(150);
  check((await st()) === "", "dismissing clears the line it was on");
  await enter();
  check(await page.evaluate(() => localStorage.getItem("tf:punsOn") === "off"), "the choice survives a reload");
  check(/\btype\b.*\bcast\b/i.test(await st()), "…and the cast instruction is still there with the jokes off");
  await page.evaluate(() => localStorage.setItem("tf:punsOn", "on"));
  await enter();

  // a real catch, at both ends of the range: the card, and the bubble standing down
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(250);
    await typeWord();
    let landed = false;
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(300);
      if (await page.evaluate(() => !document.getElementById("card-slot").hidden)) { landed = true; break; }
      if (await word()) await typeWord();
    }
    check(landed, `a catch lands and puts a card up at ${w}x${h}`);
    if (!landed) continue;
    await page.waitForTimeout(2800);
    const { boxes } = await measure();
    check(!boxes.pun, `the pun bubble stands down behind a real card at ${w}x${h}`);
    for (const id of Object.keys(boxes))
      if (id !== "catch-card" && hit(boxes["catch-card"], boxes[id]) && !allowed("catch-card", id))
        check(false, `a real card overlaps ${id} at ${w}x${h}`);
    await page.screenshot({ path: `${outDir}/catch-${w}x${h}.png` });
    await page.keyboard.press("a"); await page.waitForTimeout(500);
  }
}

// ---- pass 3: the browsable panels, at every shape ----
// P1 gave the collection, shop, journal and grown-ups panel a head that does
// not scroll, with the close in its top-left corner, and tabs instead of one
// long column. The promise is "the way out is always on screen", and that is
// geometry, so it belongs here rather than in a screenshot someone squints at.
// The first run of this found the collection grid hanging off the right of a
// phone: five fixed-width cells in a panel 366px wide, which the old panel had
// hidden by scrolling sideways.
const PANELS = [["collection", "collection-btn"], ["shop", "shop-btn"],
                ["journal", "journal-btn"], ["progress", "progress-btn"]];
async function panels() {
  console.log("");
  // from a clean game: pass 2 ends on a landed catch, and a card held over the
  // top bar makes the tackle box unclickable, which reads as this pass hanging
  await enter();
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.waitForTimeout(150);
    const before = problems.length;
    for (const [id, btn] of PANELS) {
      const trayHidden = await page.evaluate(() => document.getElementById("controls").hidden);
      if (trayHidden) await page.click("#tacklebox");
      await page.click("#" + btn);
      await page.waitForTimeout(220);
      const m = await page.evaluate((id) => {
        const root = document.getElementById(id);
        const panel = root.querySelector(".overlay-panel");
        const x = root.querySelector(".overlay-x");
        const body = root.querySelector(".overlay-body");
        const r = panel.getBoundingClientRect(), xr = x?.getBoundingClientRect();
        const tabs = [...root.querySelectorAll(".tab")].map(t => t.getBoundingClientRect());
        return {
          panel: { x: r.x, y: r.y, right: r.right, bottom: r.bottom },
          close: xr && { x: xr.x, y: xr.y, w: Math.round(xr.width), h: Math.round(xr.height) },
          wide: body ? body.scrollWidth > body.clientWidth + 1 : false,
          overflow: body ? body.scrollWidth - body.clientWidth : 0,
          tabTop: tabs.length ? Math.min(...tabs.map(t => t.y)) : null,
          tabH: tabs.length ? Math.round(Math.min(...tabs.map(t => t.height))) : null,
        };
      }, id);
      const P = (msg) => fail(vp, id, msg);
      if (m.panel.y < -1 || m.panel.bottom > vp.h + 1 || m.panel.x < -1 || m.panel.right > vp.w + 1)
        P(`the panel is off screen: ${JSON.stringify(m.panel)}`);
      if (!m.close) P("no close button in the head");
      else {
        // the whole point: it is up top, on screen, and big enough for a thumb
        if (m.close.y < -1 || m.close.y > vp.h - 20) P(`the close button is at y ${Math.round(m.close.y)} on a ${vp.h}px screen`);
        if (m.close.w < 30 || m.close.h < 30) P(`the close button is ${m.close.w}x${m.close.h}`);
        if (m.tabTop !== null && m.close.y > m.tabTop) P("the close button is below the tabs");
      }
      if (m.wide) P(`the panel body overflows sideways by ${m.overflow}px`);
      if (m.tabH !== null && m.tabH < 28) P(`a tab is only ${m.tabH}px tall`);
      await page.click(`#${id} .overlay-x`);
      await page.waitForTimeout(120);
      if (await page.evaluate((id) => !document.getElementById(id).hidden, id))
        P("the close button did not close it");
    }
    console.log(`${problems.length === before ? "ok  " : "FAIL"}  panels at ${vp.name.padEnd(14)} ${vp.w}x${vp.h}`);
  }
}

if (!args["skip-behaviour"] && !only) { console.log(""); await behaviour(); await panels(); }

await browser.close();
if (notes.length) console.log(`\n${notes.length} known and not fixed here (BACKLOG.md):\n`
  + notes.map(n => "  " + n).join("\n"));
console.log(problems.length ? `\n${problems.length} PROBLEM(S):\n` + problems.map(p => "  " + p).join("\n")
                            : "\nno layout problems at any viewport");
process.exit(problems.length ? 1 : 0);
