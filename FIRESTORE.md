# Firestore Schema — Hook, Line and Sentence v1

Design goal: **one document read per app launch, one write per catch.** Same
Firestore + localStorage-fallback pattern as Family Hub.

## Structure

```
typingFishing/
└── profiles/{profileId}          ← one doc per kid; everything embedded
```

One collection, one doc per kid. No subcollections in v1 — profile data is
small (a few KB even after months of play), and embedded maps keep reads
cheap and the offline/localStorage fallback trivial (the doc IS the save file).

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

  // silent stats — feeds the v2 adaptive meter; kids never see these
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

  jokesEndured: 0                  // reserved for the groan counter (backlog)
}
```

## Write strategy

- **On catch (the only hot path):** one `update()` with increments — 
  `totalCatches`, `coins`, `collection.{fishId}`, merged letter stats 
  accumulated locally during the fight. Firestore `increment()` for counters.
- **On shop purchase / stage unlock:** one update each. Rare events.
- **Letter stats batching:** accumulate in memory during reeling; flush with
  the catch write. Never write per-keystroke.
- **Escape:** increment `stats.escapes` only — piggyback on next write if
  offline.

## Fallback & conflicts

- localStorage mirror keyed `tf:profile:{id}`, written on every Firestore
  write. On launch: Firestore wins if reachable; localStorage otherwise;
  reconcile by `updatedAt` (newest wins — kids play one device at a time,
  so last-write-wins is fine; don't build merge logic).

## Auth

- Reuse Family Hub's Google OAuth (GIS token client). One parent login;
  profiles are app-level, not Firebase-auth-level. Known consideration from
  Family Hub: silent token refresh needed for long-lived sessions.

## Explicitly not in v1

- Per-session history docs (aggregates only)
- Multi-device merge logic
- Firebase Auth per kid

## Cloud saves setup (self-hosting)

**Cloud saves are optional.** With no Firebase config the game runs entirely on
localStorage — every profile, catch, and stat is saved on that one
device/browser, no account needed. Set up Firebase only if you want a kid's
progress to sync across devices (e.g. the tablet and the desktop) behind one
parent Google sign-in. Without a valid config the game just plays offline; it
never errors.

This is a one-time setup, in two flavors: a brand-new Firebase project, or
adding Hook, Line and Sentence to a Firebase project you already use for something else.

### What the game needs from Firebase

- **Firestore** (Native mode) — one document per kid in a single collection
  (documents live directly in the collection named by `config.js` →
  `firebase.collection`, default `typingFishing`).
- **Google sign-in** (Firebase Authentication) — one parent login; each doc is
  stamped with the caller's `ownerUid`, which the rules use to keep families
  separate.
- A **Web app** registration, which yields the `firebaseConfig` values that go
  into `config.js`.

### Path A — a new Firebase project

1. **Create a project** at <https://console.firebase.google.com> → *Add
   project*.
2. **Firestore Database** → *Create database* → **Native mode**, pick a region.
3. **Authentication** → *Get started* → enable the **Google** provider.
4. **Project settings** (⚙) → *Your apps* → add a **Web app** (`</>`); copy the
   `firebaseConfig` object it shows.
5. **Paste those values into `config.js`** under `firebase.config` (`apiKey`,
   `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).
   Leave `firebase.collection` as `"typingFishing"` unless you want a different
   name.
6. **Security rules** — Firestore → *Rules*. Because the database is new,
   there's no existing ruleset to merge into, so wrap the
   `match /typingFishing/{profileId} { … }` block from `firestore.rules`
   in the standard skeleton (the commented-out template at the bottom of that
   file shows the shape) — `rules_version = '2'; service cloud.firestore {
   match /databases/{database}/documents { …paste the block here… } }` — and
   *Publish*.
7. **Authorized domains** — Authentication → *Settings* → *Authorized domains* →
   add the domain you'll deploy to (e.g. `yourgame.netlify.app`). `localhost` is
   already allowed for local dev.
8. **Deploy** (see below), then run the verification checklist.

### Path B — an existing Firebase project

Use this if you already run other apps/collections in a Firebase project (this
is how the reference install shares one project with "Family Hub").

1. **Reuse or add a Web app** in that project's settings; copy its
   `firebaseConfig` into `config.js` → `firebase.config`.
2. If `typingFishing` might collide with an existing collection, change
   `firebase.collection` in `config.js` to something unique.
3. **Enable the Google** sign-in provider if it isn't already (Authentication →
   Sign-in method).
4. **Security rules — do NOT overwrite your existing rules.** In Firestore →
   *Rules*, paste **only** the `match /typingFishing/{profileId} { … }` block
   from `firestore.rules` *inside* your existing
   `match /databases/{database}/documents { … }` block, alongside your other
   rules, and *Publish*. (If you renamed the collection in step 2, rename the
   match path to match.)
5. **Authorized domains** — add your deploy domain (Authentication → Settings).
6. **Deploy** and verify.

### About the `config.js` firebase values

The Firebase web config is a set of **public identifiers, not secrets** —
access is controlled entirely by the Firestore security rules, so it's fine that
they live in a committed file. `firebase.sdkVersion` pins the gstatic CDN SDK
version; bump it if an import 404s.

### Deploy

No build step — deploy the repo's static files to any static host (Netlify,
GitHub Pages, Cloudflare Pages, Firebase Hosting, …). **Cloud-save sign-in needs
HTTPS**, so verify the signed-in path on your real `https://` URL, not a
plain-http or mismatched-subdomain preview.

## M4b live-verification checklist

> This is the **reference install's** live-verify record. For your own project,
> complete *Cloud saves setup* above first, then substitute your project and
> deploy domain wherever the checklist names the reference install
> (`familyhub-5fc43`, `hook-line-and-sentence.netlify.app`). The walkthrough and
> failure-signature table apply to any project unchanged.

The sync code (`app.js`) is complete; M4b is "done" once the signed-in
cross-device path is verified live. Sign-in popups need HTTPS, so test on the
production URL **`https://hook-line-and-sentence.netlify.app`** — not a `deploy-preview-*`
URL (different subdomain won't match the authorized domain).

### One-time setup (Firebase console, `familyhub-5fc43` project — shared with Family Hub)

- [ ] **Authorize the domain.** Auth → Settings → Authorized domains → add
  `hook-line-and-sentence.netlify.app`. (Sign-in popup is rejected without it.)
- [ ] **Merge the rules.** Firestore Database → Rules → paste *only* the
  `match /typingFishing/{profileId} { … }` block from `firestore.rules`
  *inside* the existing `match /databases/{database}/documents { … }` block —
  **do not** overwrite the Family Hub rules — then Publish.
- [ ] **Confirm HTTPS deploy** at `https://hook-line-and-sentence.netlify.app`.

### Walkthrough (on the profile picker, watch the sync bar)

- [ ] **SDK loads** — button reads **"SIGN IN TO SYNC"**. (If it says *"playing
  offline"* and the button is hidden, the Firebase SDK failed to load.)
- [ ] **Sign in** — click it, pick the parent Google account → status flips to
  **"☁ synced · your@email"**, button becomes **SIGN OUT**.
- [ ] **Write-on-catch** — land one fish → Firestore console shows a doc per kid
  in the `typingFishing` collection, each with `ownerUid` = your uid and the
  live fields (`totalCatches`, `coins`, `collection`, `stats`, …).
- [ ] **Read-on-launch (the real bar)** — open a *second* browser/device, sign
  in with the *same* account → the kids' profiles appear in the picker, pulled
  from Firestore (not created fresh). Cross-device sync working.
- [ ] **Offline fallback** — sign out (or throttle network offline) → game still
  plays and saves locally with **no errors**. (Verified in-sandbox; sanity-check
  live.)

**Done when:** a catch on one device shows up on another (newest `updatedAt`
wins — reconciled by timestamp, no merge logic), and two profiles keep fully
separate state across reloads.

### Failure signatures (DevTools → Console)

Each setup gap emits a specific breadcrumb, so the error names the fix:

| Console message | Cause | Fix |
|-----------------|-------|-----|
| `Sync unavailable; playing offline on localStorage.` | Firebase SDK didn't load (network/CDN, or `firebase.sdkVersion` in `config.js` 404'd) | not a setup step — check the CDN/version |
| `sign-in failed` + `auth/unauthorized-domain` | domain not authorized | setup step 1 |
| `sync push failed` + *Missing or insufficient permissions* | rules not merged/published | setup step 2 |
| `profile pull failed` | rules or `ownerUid` mismatch on read | setup step 2 |
