# The save file: Hook, Line and Sentence

**Cloud saves are gone as of 2026-09-05.** The game writes to localStorage and
nothing else: no Firebase config, no SDK, no sign-in, no network write. Why is
in `BACKLOG.md` -> *Release hygiene* and in the commit that did it; the short
version is that sync rode on a Firebase project shared with Family Hub whose
rules authorised any Google account on earth, and the game's URL had been
shared. **`firestore.rules` now denies everything, and publishing it in the
console is a step only Matt can do.**

This file survives as **the shape of the save document**, which did not change:
the localStorage mirror always was the Firestore document, byte for byte, so
everything under *Profile document* below is live and current. The cloud
sections that follow it are kept as the design for a sync that would need its
own Firebase project if it ever came back.

## Structure

One document per kid, in localStorage under `tf:profile:{id}`, with
`tf:profiles` as the picker's index and `tf:active` as the last one played.
Everything is embedded in the one document: profile data is small (a few KB
even after months of play), and embedded maps keep the save trivial to read and
write in one go (the document IS the save file).

## Profile document

```js
{
  name: "Kid Name",
  avatar: "🐸",                    // emoji picker, keep it simple
  createdAt: <timestamp>,
  updatedAt: <timestamp>,

  // progression
  totalCatches: 42,
  stage: 3,                        // derived from totalCatches + config, but
                                   // stored so the UI never recomputes wrong
  coins: 37,
  // equipped + everything bought (owned gates re-purchase in the shop).
  // One key per shop kind. `boat` arrived with the boat shop and `hat` with R7;
  // both are back-filled on load (activateProfile) rather than migrated in a
  // pass, so an older document syncs down and opens without a rewrite.
  upgrades: { rod: "bamboo", bait: "worm", boat: "classic", hat: "none",
              owned: { rod: ["stick", "bamboo"], bait: ["worm"],
                       boat: ["classic"], hat: ["none"] } },

  // collection: fishId → count (silhouette = key absent)
  collection: { bluegill: 12, carp: 3, walleye: 1 },

  // records: fishId → best catch weight in lb (fish size variants)
  records: { bluegill: 0.9, walleye: 7.4 },

  // badges: earned journal badge ids (see BADGES in app.js)
  badges: ["firstmate", "homerow", "hooked"],

  // silent stats: feeds the v2 adaptive meter; kids never see these
  stats: {
    letters: {                     // per-letter aggregates, max 26 entries
      a: { n: 310, errors: 12, msTotal: 148000 },   // avg ms = msTotal / n
      s: { n: 290, errors: 31, msTotal: 177000 },
      // ...
    },
    wordsTyped: 480,
    escapes: 3,
    sessionCount: 14,
    lastPlayed: <timestamp>,
  },

  // junk: junkId → count (T3). Same shape as `collection`, same write path: an
  // increment on one key, folded into the write the catch was making anyway.
  // Absent key = never pulled, which is what the journal's shelf shows locked.
  junk: { boot: 6, can: 2 },

  // The LIFETIME groan total, and deliberately not the sum of `junk`: saves
  // from before T3 counted pulls without recording which kind, so the two
  // legitimately disagree on an old save. Junk badges count `junk`, never this.
  jokesEndured: 8
}
```

## Write strategy

`persistSave()` writes the whole document, and every mutation goes through it:
a catch, a junk pull, a shop purchase, a stage unlock, an escape. Letter stats
still accumulate in memory during the reel and land with the catch, never per
keystroke, which was a Firestore economy at the time and is now just the
sensible thing to do to localStorage.

## Auth

None. There is no account, no sign-in and no third-party script on the page.
The profile picker is app-level and always was.

## Explicitly not here

- Any network write of any kind
- Cross-device sync (this was what cloud saves bought, and what removing them
  cost)
- Per-session history docs (aggregates only)

## If cloud saves ever come back

They need their **own Firebase project**, not this one reopened. The blast
radius of the old arrangement was Family Hub's data, and no game feature is
worth that. What a revival would take, in order:

1. A new Firebase project of its own: Firestore in Native mode, the Google
   sign-in provider enabled, a Web app registered for its config values.
2. That config back in `config.js`, and the sync module back in `app.js`. Both
   were removed whole in one commit, so `git log -- app.js` has the working
   code rather than a description of it: `syncInit`, `signIn`, `syncPush` and
   `pullProfiles`, about 80 lines, plus the picker's sign-in bar.
3. Rules that authorise the family rather than the internet. The old ones
   checked `request.auth != null` and stamped `ownerUid`, which kept families
   from reading each other but let anyone create documents. A uid allowlist is
   the minimum; App Check is the real answer.
4. The deploy domain added to Auth -> Settings -> Authorized domains, because
   the sign-in popup is rejected without it.

The write shape above still applies: one read per launch, one write per catch,
reconcile by `updatedAt` with no merge logic, because kids play one device at
a time.

## Before any of that, the question that killed it

Sync collects other people's children's data. The game is complete without it,
it has no analytics, no crash reporting and no third-party scripts, and that is
most of what makes it safe to hand to another family. Adding a cloud back is a
privacy decision first and a feature second.
