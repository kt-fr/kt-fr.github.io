# Kartik's corner of the internet

A personal still life: robotics, gym, and sports, arranged like a scrapbook × sports-editorial
spread. Astro, CSS, local photo cut-outs, published human-created illustrations, and small vanilla
TypeScript interactions. No client framework, animation library, physics engine, analytics,
new dependency, or third-party runtime request.

**GitHub Pages deployment:** `kt-fr.github.io`. The repo is deliberately separate from the broader SRA workspace. The public site permits indexing. Deploy with `bash scripts/publish-github-pages.sh` after reviewing changes.

```bash
pnpm dev        # http://127.0.0.1:4321
pnpm build      # four static pages in dist/
pnpm preview    # serves dist/ locally; rebuild after source changes
pnpm check      # local Chromium checks; needs current build + running preview
```

## The scene

- Actual McQueen and pliers photographs, the supplied classic UNO illustration and Jetson, and a Now notebook.
  Detached decorative wires remain hidden.
- Curated dumbbell, football, volleyball, shuttlecock, chess knight, and paddle illustrations.
- The supplied motorcycle helmet PNG represents bike riding; its reuse license is still unknown.
  The off-duty and notebook clusters have nearby handwritten captions; the boards stay unlabelled. Every
  object carries one or two torn translucent tape strips, including the notebook. Captions move
  with their clusters; after the pile, boards move upward, the off-duty cluster moves downward,
  McQueen moves to the top, and the notebook moves down the right side.
- Introduction: a browser-local morning/afternoon/evening greeting, full name, highlighted
  “building”, and conversational first-person copy. It updates each minute; no-JS uses “Hi”.
  The redundant “little about me” line is removed. Caption arrows follow measured object
  positions in both spreads and on mobile, not fixed unicode arrow characters. The chess
  knight/shuttle positions are swapped; McQueen is larger and the helmet medium-sized.
- Latest refinement restores a medium helmet, separates the left sports cluster, relocates
  pliers to the right, and repositions the post-pile off-duty caption. The board caption and its
  arrows are removed (boards stay). The supplied Jetson PNG replaces the old drawing, with
  its connected white backdrop removed. All artwork has wider, rougher paper margins and
  deterministic print grain; notebook/tape retain grain textures too. The larger introduction
  says “second-year student at VJTI”, without the degree name. Individual letters in “building”
  have a small staggered ink wobble, static under reduced motion. The private caption is larger.
- Wheel input on a sufficiently large desktop scene moves/rotates/scales objects between
  spread → deliberately overlapping pile → different spread. Staggered curved paths and
  individual rotations reverse smoothly. The introduction fades and becomes inert around the pile,
  returning with the final spread; header navigation remains available. This is a
  bounded sequence, not random physics. A small **Rearrange** button also works by keyboard.
  Ctrl-wheel/browser zoom and horizontal gestures are left alone; modal input is not captured.
- Phones/tablets/short viewports use normal scrolling; mobile object drift is capped at 12px.
  Resizing clears the previous transforms. Reduced motion keeps a static composition.
- Sports/gym props open **Away from the bench**. Notebook opens **Now**, Jetson opens McQueen
  notes, and McQueen links to its project page. Existing `#sac`, `#now`, and `#mcqueen-notes`
  links remain supported. The blog link is in the McQueen note and project page.
- Native dialogs support close, Escape, backdrop, focus restoration, and background inertness.
  No JavaScript: all four notes remain readable below the scene, with native anchor links.
- The illustrated UNO contains a deliberately unadvertised, silent visual interaction.
  It has pointer, touch, keyboard, cancellation, reset, and reduced-motion paths. No audio,
  flashing screen, hardware API, real connection, or instructions to operate physical hardware.
  Discovery details are intentionally omitted here and from the visible UI.
  Its connector/reset-button hotspots match the new artwork; the private caption and reset
  control sit below the board. Supplied helmet, UNO and Jetson source licenses remain unconfirmed.

## Assets & source

`public/img/bench/SOURCES.md` and `CURATED-SOURCES.md` record provenance. Six published
illustrations are installed in `curated/`; the hardware illustrations and real McQueen/pliers
photographs remain. No artwork was copied from the scroll-behavior reference.
`node scripts/prepare-paper-cutouts.mjs` rasterizes those existing sources using local Chromium,
then uses existing Pillow/NumPy to add silhouette-following irregular paper margins and grain.
Outputs live in `public/img/bench/paper/`; original sources are unchanged. Derivatives now include
print grain on artwork pixels, not only the backing paper. No generated replacement
illustration, new dependency, or download is involved. See `paper/README.md` for processing details.
Fonts are self-hosted with their OFL licenses. Rebuild the existing photo cut-outs using the
already available Pillow installation: `python3 scripts/prepare-bench.py`.

```text
src/pages/index.astro             personal scene, intro, four notes
src/styles/personal-scene.css     compositions, board effects, responsive/reduced motion
src/styles/scrapbook.css          warm paper, cutout shadows, latest compositions
src/styles/global.css            shared styles, paper pages, native note panels
src/scripts/scene.ts              wheel arrangements, mobile drift, hidden board interaction
src/scripts/bench.ts              dialog enhancement, focus restoration, direct hashes
src/components/BenchPanel.astro   readable no-JS/native-dialog note
src/pages/work/mcqueen.astro      short, visual-first project in “we” voice
public/img/bench/                 local artwork and retained source/license records
scripts/check.mjs                browser verification
```

## Verification scope

`pnpm check` covers four pages × six widths, errors, external requests, indexing guards,
images/links, overflow, all sports links and note dialogs, keyboard/focus/deep links, no-JS,
blocked storage, contrast, reduced motion, actual wheel input/reverse/bounds, intermediate
resting intro clearance, deliberate pile overlap, layered keyboard activation, intro inert/restoration,
mobile scrolling, and pointer/keyboard/touch board paths.
Latest verified build is served locally at `http://127.0.0.1:4323`; current dev source at `4322`.
Port `4321` was an older preview and must not be assumed current.
Run `BASE_URL=http://127.0.0.1:4323 SHOT_DIR=/tmp/opencode/shots/grain-final pnpm check`.
Screenshots: `/tmp/opencode/shots/grain-final/`. Includes local-clock greeting cases, supplied
UNO/Jetson selection, four remaining caption-arrow endpoints, actual lettering motion and its
reduced-motion fallback, and below-board caption/reset placement and caption size.
Check the command's exit code and final result;
the coverage list alone is not a passing-test claim.

Local Chromium verification only—not cross-browser proof or a full accessibility audit.
No sporting achievements, metrics, status tags, invented personal lore, or stock portrait.
GSoC 2027 remains preparation. Portrait is absent; GitHub Pages is the selected host.

## About-page cleanup (November 2026)

The standalone `/about/` route and its in-scene links were intentionally removed.
Personal details remain available through object-triggered paper notes, including no-JS fallbacks.
The notebook now reads “A few projects. A lot to learn.” and retains the `#now` note.
