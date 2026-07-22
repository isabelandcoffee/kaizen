# Kaizen — Project Context for Claude Code

Kaizen is a single-file phone-first PWA (mood/habit tracker) with three tabs:
**Tasks**, **Shrine**, and **Tally**. The entire app — HTML, CSS, and JS — lives in
one file: `kaizen.html`. There is no build step, no bundler, no external JS files.
Everything (including several embedded pixel-art PNGs as base64 data URIs) is
inline in that single HTML file.

## How to run it

Just open `kaizen.html` directly in a browser. No server, no npm install needed
for the app itself. For local testing with jsdom (see Testing section), you'll
want Node with the `jsdom` package available.

## Install target

The user installs this via Safari → Share → "Add to Home Screen" on an iPhone,
so it behaves like a standalone app (no browser chrome). Keep that constraint in
mind: no dependency on features that only work in a full browser tab, and the
CSS layout intentionally locks `html`/`body` to `100vh`/`100svh`/`100dvh` with
`overflow: hidden`, using an inner `#app` div as the actual scroll container, so
that `position: fixed` elements (like the floating action button) stay pinned to
the true viewport instead of scrolling away.

## State schema (persisted via `window.storage`, key `kaizen:data:v5`)

```js
state = {
  tasks: [{id, name, repeat: "daily" | [weekdayInts]}],
  taskLog: { "YYYY-MM-DD": {taskId: true} },       // resets naturally each day
  taskOrder: { "YYYY-MM-DD": [taskId, ...] },
  shrine: {
    theme: "summer"|"sakura"|"autumn"|"winter"|"dawn"|"rain"|"snowy"|"starry",
    prayers: [{id: "p"+Date.now(), text, date: ISOString}],
    centerpiece: "torii"|"boulder"|"spirit"|"cat"|"guadalupe"
  },
  tally: { count: 0 }
}
```

## Tab 1 — Tasks

Recurring daily checklist. Tasks reset at midnight (tracked per date key).
Checking a task sinks it to a faded "Completed" section. Tasks can be
drag-reordered (Pointer Events). A FAB (`+`) fixed at the true bottom of the
screen opens a bottom-sheet modal to add a task (name + Every Day or custom
weekday picker). A streak strip shows a 7-dot week row.

## Tab 2 — Shrine

This is the most complex part of the app. A `<canvas>` renders a small pixel-art
scene: sky/hills/ground (season-dependent palette), stone steps, three trees,
and a centerpiece.

**Trees**: `drawBigTree(tx, groundY, scale, theme)` draws a trunk + blocky
rectangle "blob" canopy for all seasons except **Winter**, where instead it
draws bare curving branches with small round buds (no leaf/bud color at all —
this was explicitly requested). Branch shape is seeded off `tx` so the three
trees don't look identical.

**Seasons** (`drawBase`): summer, sakura, autumn, winter, dawn, rain, snowy,
starry. **Starry Night** has its own twinkling star field + shooting stars,
drawn *inside* `drawBase` right after the sky fill and *before* hills/ground, so
trees and the horizon naturally occlude them (this ordering matters — don't
move star drawing to after the trees are drawn, or they'll render on top of
everything again).

**Centerpieces** — all five are now **real uploaded pixel-art images**, not
procedurally drawn shapes (this evolved over the course of the project; earlier
canvas-drawn versions were fully replaced):
- `torii` → `toriiImg` (`TORII_IMG_B64`)
- `boulder` → still procedurally drawn (`drawSacredBoulder`) — the one holdout
  that was never swapped for an uploaded image; has a shimenawa rope + 5
  diamond-fold shide streamers matching the real Shinto pattern
- `spirit` (fox) → `foxImg` (`FOX_IMG_B64`)
- `cat` → `catImg` (`CAT_IMG_B64`)
- `guadalupe` → `guadalupeImg` (`GUADALUPE_IMG_B64`)

Each image is loaded via `new Image(); img.src = "data:image/png;base64,..."`.
Background removal on all uploaded source images was done offline (flood-fill
from borders, gradient-tolerant where needed, then crop) — the *processing
scripts* aren't part of the shipped file, only the final cleaned PNGs (as
base64) are embedded. If the user uploads a new statue/character image to
replace one of these, redo that same pipeline: flood-fill background removal
(watch out for over-aggressive tolerance — it can leak into the artwork itself
and leave the image looking translucent/broken; keep tolerance low and verify
opacity % within the bounding box before finalizing), crop to content bbox,
resize, base64-encode, and splice into the `const X_IMG_B64 = "..."` constant.
**Careful when doing text-based find/replace across a large block that spans a
declaration boundary** — it's easy to accidentally delete an adjacent `const`
declaration if the replacement anchor isn't precise (this has happened before;
always grep to confirm the exact boundary line before replacing).

**Centerpiece palette previews**: `iconUrlFor(type)` decides how to render each
palette thumbnail. For image-based centerpieces it uses `imageThumbUrl(img)`
(fits the real image into a 48×48 canvas — always accurate, since it's the same
asset). For the boulder (still procedural) it uses `statueThumbUrl(type,
drawFn, cropOverride)`, which renders the real draw function onto an offscreen
canvas and crops in — also always accurate to the actual centerpiece, just via
a different mechanism. Avoid going back to hand-tuned ASCII-grid icons
(`cpIconUrl` / `CP_ICON_GRIDS`) for anything that has a real asset or draw
function available — those only exist now as a last-resort fallback.

**Moon phase icon** (top-left of header): calculated from the real current
date via `getMoonPhase()` (standard synodic-month formula, no API), then
matched against 9 real uploaded moon-phase pixel-art icons
(`MOON_PHASE_ICONS`, each with a measured `litFrac`/`waxSign`) via nearest-match
in `pickMoonIcon()`. Don't replace this with a procedurally-drawn moon unless
asked — the user explicitly prefers the real uploaded art.

**Prayers**: text entries hang as folded shide-paper shapes from a rope-bar
(pure CSS clip-path zigzag, matches the same diamond-fold shape used on the
boulder's shide). Tapping unfolds one into a readable card. Each prayer stores
`date` (ISO string) at creation. A "memory" box (`#prayerMemory`,
`renderPrayerMemory()`) shows any prayer written on today's exact calendar date
in a past year, framed as "N years ago today" — a deliberate "on this day"
feature. Old prayers without a `date` field still work: the date is recovered
from the `p` + timestamp `id`.

**No weather feature** — this was built (Open-Meteo API + geolocation with
Arandas, Jalisco fallback) and then explicitly removed at the user's request.
Don't re-add it unless asked.

## Tab 3 — Tally

Tap the board to add a brush-stroke tally mark; every 5th stroke draws a
diagonal slash completing the group. `brushStroke()` was simplified to a
single crisp opaque stroke (an earlier layered semi-transparent version looked
blurry). Board background is white (was cream/yellow, changed on request).

## Testing approach

There's no formal test suite in the shipped file, but throughout development,
jsdom-based Node scripts were used to catch real runtime errors before
delivering — this matters because the browser console isn't visible during
development. The general pattern:

```js
const { JSDOM } = require("jsdom");
const dom = new JSDOM(html, {
  runScripts: "dangerously", resources: "usable", pretendToBeVisual: true,
  beforeParse(window){
    // stub canvas getContext (fillRect, arc, drawImage, rect, etc. as no-ops)
    // stub window.storage (in-memory get/set)
    // stub requestAnimationFrame
    // window.onerror -> console.log so real errors surface
  }
});
```

Recommended before considering any change done:
1. Extract the `<script>` contents and run `node --check` on it (catches syntax
   errors instantly).
2. Run it through jsdom with the animation loop running for a few frames,
   across multiple themes/tabs, watching for `WINDOW ERROR` logs.
3. When touching the centerpiece palette, verify all 5 thumbnails still
   generate without throwing.

This has caught real bugs before (e.g. a temporal-dead-zone reference, and once
an accidental deletion of a `const IMG_B64` declaration during a large
find/replace) — don't skip it just because the change looks small.

## Known constraints / preferences

- No build tooling. Keep it a single HTML file.
- No external network calls (weather API was removed; don't reintroduce
  network dependencies without being asked).
- Season/theme-awareness matters: several elements were fixed for hardcoding a
  single season's color when they should adapt (grass tufts, hill/ground
  palette, etc.) — when adding new decorative elements, default to
  theme-conditional coloring rather than one fixed color.
- The user has limited ability to view images shared back — be precise and
  verify things programmatically (pixel analysis, ASCII-art dumps, measured
  bounding boxes) rather than assuming a visual description is correct.
