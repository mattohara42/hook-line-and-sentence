#!/usr/bin/env node
// generate-words.mjs — builds data/words.json for Hook, Line and Sentence.
// Usage: node generate-words.mjs <input-wordlist.txt> <output.json>
// Input: one word per line, ordered by frequency (most common first).

import { readFileSync, writeFileSync } from "fs";

// Curated stop-list of non-words a dictionary filter can't catch — acronyms,
// abbreviations, foreign words, prefixes. Shared with tests/data.test.mjs so
// words.json and any regeneration stay in sync. See BACKLOG → Word pool.
const BLOCKLIST = JSON.parse(readFileSync(new URL("../data/blocklist.json", import.meta.url), "utf8"));

// ---- Config ----
const CFG = {
  minLen: 3,
  maxLen: 8,
  maxWords: 3000,          // keep the most frequent N after filtering
  rareLetters: "qxzj",     // presence bumps difficulty by 1
  // data/blocklist.json (the curated stop-list) plus a few proper-noun/junk
  // tokens this generator has always dropped.
  blocklist: new Set([...BLOCKLIST, "aaa","aka","ada","ala","dallas","alaska","gal","hag"]),
  // real words the web-frequency list misses; home row needs the help
  supplements: ["salad","flask","lash","slash","sag","lag","fads","lads","gall","gala","flags","halls","glads","salads"],
};

// Default letter-unlock order (stage 1 = home row; each stage adds letters).
// Tuning this is a design decision — counts per stage are reported below.
const UNLOCK_STAGES = [
  { name: "1. home row", adds: "asdfghjkl" },
  { name: "2. +e +i",    adds: "ei" },
  { name: "3. +r +u",    adds: "ru" },
  { name: "4. +t +o",    adds: "to" },
  { name: "5. +n +c",    adds: "nc" },
  { name: "6. +w +m +y", adds: "wmy" },
  { name: "7. +p +v +b", adds: "pvb" },
  { name: "8. +q +x +z", adds: "qxz" },
];

// ---- Load & filter ----
const [,, inPath = "words-all.txt", outPath = "words.json"] = process.argv;
const raw = readFileSync(inPath, "utf8").split(/\r?\n/);
const dict = new Set(readFileSync("dict.txt", "utf8").split(/\r?\n/).map(w => w.trim()));

const seen = new Set();
const words = [];
for (const line of raw) {
  const w = line.trim().toLowerCase();
  if (!/^[a-z]+$/.test(w)) continue;                    // letters only
  if (w.length < CFG.minLen || w.length > CFG.maxLen) continue;
  if (!dict.has(w)) continue;                          // must be a real dictionary word
  if (CFG.blocklist.has(w)) continue;
  if (seen.has(w)) continue;
  seen.add(w);
  words.push(w);
  if (words.length >= CFG.maxWords) break;              // input is frequency-ordered
}
for (const w of CFG.supplements) {
  if (dict.has(w) && !seen.has(w)) { seen.add(w); words.push(w); }
}

// ---- Tag ----
// difficulty: 1 = short (2-3), 2 = medium (4-5), 3 = long (6-8); rare letters bump +1 (cap 3... no, allow 4 for spicy words)
function difficulty(w) {
  let d = w.length <= 3 ? 1 : w.length <= 5 ? 2 : 3;
  if ([...w].some(c => CFG.rareLetters.includes(c))) d += 1;
  return Math.min(d, 4);
}
const pool = words.map(w => ({
  w,
  letters: [...new Set(w)].sort().join(""),
  d: difficulty(w),
  theme: "core",
}));

writeFileSync(outPath, JSON.stringify(pool));
console.log(`Wrote ${pool.length} words to ${outPath}`);

// ---- Stage coverage report (the experiment) ----
console.log("\nUnlock stage coverage:");
let unlocked = "";
for (const stage of UNLOCK_STAGES) {
  unlocked += stage.adds;
  const set = new Set(unlocked);
  const avail = pool.filter(e => [...e.letters].every(c => set.has(c)));
  const byD = [1,2,3,4].map(d => avail.filter(e => e.d === d).length);
  console.log(`  ${stage.name.padEnd(14)} ${String(avail.length).padStart(4)} words  (d1:${byD[0]} d2:${byD[1]} d3:${byD[2]} d4:${byD[3]})`);
  if (avail.length && avail.length <= 40)
    console.log(`     └─ ${avail.map(e => e.w).join(", ")}`);
}
