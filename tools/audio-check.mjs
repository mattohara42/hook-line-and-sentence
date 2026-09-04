// Record what the game actually SOUNDS like, at each spot, and draw it.
// A VERIFICATION tool: nothing loads it at runtime.
//
//   NODE_PATH=/tmp/node_modules node tools/audio-check.mjs --secs 40 --out /tmp/audio
//
// Why it exists: S1's ambience is procedural, so the only things an assertion
// can reach are the numbers that went in. Whether a frog sounds like a frog,
// and whether the three spots sound like three different places, is the whole
// point of the milestone and none of it is testable. This is the audio version
// of "draw the thing you measured" (CLAUDE.md): it taps the master bus in a
// real browser, writes a .webm you can play, and renders a spectrogram PNG so
// the events are visible even without listening: a frog is a pair of blobs low
// down, a brook is a dense fizz up top, a swell is a slow bulge.
//
// It also fails loudly on a silent spot, which is the one bug here that IS
// checkable and would otherwise ship: a synth that throws leaves a bed playing
// and nothing else, and nothing in the console says a word.
//
// Needs the repo served (python3 -m http.server 8080) and playwright available
// (cd /tmp && npm install playwright). Chromium is already on the box.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";

const args = Object.fromEntries(process.argv.slice(2).join(" ")
  .split("--").filter(Boolean).map(s => s.trim().split(/\s+/, 2)).map(([k, v]) => [k, v ?? true]));
const secs = Number(args.secs ?? 40);
const outDir = args.out ?? "/tmp/audio";
const url = args.url ?? "http://localhost:8080/index.html";
const spots = (args.loc ? [args.loc] : ["pond", "stream", "ocean"]);
mkdirSync(outDir, { recursive: true });
const require = createRequire("/tmp/node_modules/playwright/index.js");
const { chromium } = require("/tmp/node_modules/playwright/index.js");

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("PAGE ERROR:", e.message));
page.on("console", m => { if (m.type() === "error") console.log("CONSOLE:", m.text()); });

// Tap the master bus before app.js runs. app.js connects its master gain to
// actx.destination, so a subclass that answers that question with a gain of its
// own gets the whole mix, recorder and analyser included, without app.js
// knowing or a single line of test-only code living in the game.
await page.addInitScript(() => {
  const Real = window.AudioContext || window.webkitAudioContext;
  window.__audio = { ctx: null };
  window.AudioContext = class extends Real {
    constructor(...a) {
      super(...a);
      this.__tap = this.createGain();
      this.__rec = this.createMediaStreamDestination();
      this.__analyser = this.createAnalyser();
      this.__analyser.fftSize = 1024;
      this.__analyser.smoothingTimeConstant = 0.3;
      this.__tap.connect(this.__rec);
      this.__tap.connect(this.__analyser);
      this.__tap.connect(super.destination);
      window.__audio.ctx = this;
    }
    get destination() { return this.__tap; }
  };
  window.webkitAudioContext = window.AudioContext;
});

const seed = (loc) => ({ loc });
for (const loc of spots) {
  await page.goto(url);
  await page.evaluate(({ loc }) => {
    const now = Date.now();
    localStorage.setItem("tf:profile:audiocheck", JSON.stringify({
      id: "audiocheck", name: "Ears", avatar: "🎣", createdAt: now, updatedAt: now,
      totalCatches: 40, stage: 5, coins: 900, rank: "Angler", location: loc,
      unlockedLocations: ["pond", "stream", "ocean"],
      upgrades: { rod: "deepsea", bait: "worm", boat: "classic", hat: "straw",
        owned: { rod: ["stick", "bamboo", "carbon", "deepsea"], bait: ["worm"],
                 boat: ["classic"], hat: ["none", "straw"] } },
      collection: { pumpkinseed: 40 }, records: {}, badges: [],
      stats: { letters: {}, wordsTyped: 0, escapes: 0, sessionCount: 1, lastPlayed: now },
      jokesEndured: 0, speedBest: null,
    }));
    localStorage.setItem("tf:profiles", JSON.stringify([{ id: "audiocheck", name: "Ears", avatar: "🎣", updatedAt: now }]));
    localStorage.setItem("tf:active", "audiocheck");
    localStorage.setItem("tf:soundOn", "on");
  }, seed(loc));
  await page.reload();
  await page.waitForTimeout(700);
  await page.click(".profile-cell:not(.add)");     // the click is also the gesture that opens the AudioContext
  await page.waitForTimeout(400);

  const scene = await page.evaluate(() => document.getElementById("scene").className);
  if (scene !== `loc-${loc}`) {
    console.error(`asked for ${loc} and the game is at ${scene}`);
    await browser.close(); process.exit(1);
  }

  process.stdout.write(`${loc.padEnd(7)}| listening for ${secs}s `);
  const cap = await page.evaluate(async (ms) => {
    const ctx = window.__audio.ctx;
    if (!ctx) return { error: "app.js never opened an AudioContext" };
    if (ctx.state === "suspended") await ctx.resume();
    const bins = 200;                        // ~0 to 8.6kHz of the 22kHz range
    const buf = new Uint8Array(ctx.__analyser.frequencyBinCount);
    const frames = [];
    const rec = new MediaRecorder(ctx.__rec.stream, { mimeType: "audio/webm" });
    const chunks = [];
    rec.ondataavailable = e => chunks.push(e.data);
    const done = new Promise(res => { rec.onstop = res; });
    rec.start();
    const t = setInterval(() => {
      ctx.__analyser.getByteFrequencyData(buf);
      frames.push(Array.from(buf.slice(0, bins)));
    }, 50);
    await new Promise(r => setTimeout(r, ms));
    clearInterval(t); rec.stop(); await done;
    const blob = new Blob(chunks, { type: "audio/webm" });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = ""; for (const b of bytes) bin += String.fromCharCode(b);

    // The spectrogram, drawn in the page because that is where a canvas is:
    // time across, frequency up, loudness as heat.
    const cv = document.createElement("canvas");
    cv.width = frames.length; cv.height = bins;
    const g = cv.getContext("2d");
    const img = g.createImageData(cv.width, cv.height);
    for (let x = 0; x < frames.length; x++) {
      for (let y = 0; y < bins; y++) {
        const v = frames[x][y] / 255;
        const i = ((bins - 1 - y) * cv.width + x) * 4;
        img.data[i]     = Math.round(255 * Math.min(1, v * 1.6));
        img.data[i + 1] = Math.round(255 * Math.min(1, Math.max(0, v * 1.5 - 0.25)));
        img.data[i + 2] = Math.round(255 * Math.min(1, Math.max(0, v * 1.4 - 0.55)));
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return { audio: btoa(bin), png: cv.toDataURL("image/png"), frames };
  }, secs * 1000);

  if (cap.error) { console.error(cap.error); await browser.close(); process.exit(1); }

  // What the picture says, in numbers. `loud` is how much of the run rose well
  // above the bed, which is the "did any voice actually speak" question.
  const energy = cap.frames.map(f => f.reduce((a, b) => a + b, 0) / f.length);
  const sorted = [...energy].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const peak = sorted[sorted.length - 1];
  // Transients rather than loud frames: a brook is dense enough that EVERY
  // frame is above the median, and the first version of this check called that
  // silence. A jump between frames is a thing starting, whatever the level.
  const jumps = energy.filter((e, i) => i && e - energy[i - 1] > 5).length;
  const perMin = jumps / (secs / 60);
  const band = (lo, hi) => cap.frames.reduce((a, f) =>
    a + f.slice(lo, hi).reduce((x, y) => x + y, 0) / (hi - lo), 0) / cap.frames.length;

  writeFileSync(`${outDir}/${loc}.webm`, Buffer.from(cap.audio, "base64"));
  writeFileSync(`${outDir}/${loc}.png`, Buffer.from(cap.png.split(",")[1], "base64"));
  console.log(`| median ${median.toFixed(1)}  peak ${peak.toFixed(1)}  events ${perMin.toFixed(0)}/min`
    + `  low ${band(0, 20).toFixed(1)}  mid ${band(20, 70).toFixed(1)}  high ${band(70, 200).toFixed(1)}`);
  if (peak < 3) { console.error(`${loc} is SILENT: nothing reached the master bus`); process.exitCode = 1; }
  if (perMin < 5) { console.error(`${loc} is a flat bed: no voice spoke in ${secs}s`); process.exitCode = 1; }
}

console.log(`\nwrote ${outDir}/<spot>.webm (play it) and <spot>.png (the spectrogram)`);
await browser.close();
