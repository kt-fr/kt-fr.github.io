# Personal site — collage composition refinement

Inspired by Josh Kern's playful, human-made, handwritten collage approach (webdesign.kernjosh.com), without copying his assets or visual identity.

Changes:
- Protect the central text zone, align 10 art objects within separated perimeter zones.
- Cap props on very wide monitors (the previous % widths caused huge collisions).
- Keep the hand-drawn illustrations, real McQueen photo, notebook, and Arduino Easter egg.
- Add unobtrusive handwritten marginalia to make the canvas feel less like a grid.
- Recompose scroll poses so movement doesn't pile props onto each other.
- Recompose tablet and mobile zones independently.
- Remove disconnected decorative wire overlay.

Files changed: src/pages/index.astro, src/styles/personal-scene.css, src/scripts/scene.ts.

Run: `pnpm dev` from website/ and open the local URL printed by Astro. Force-refresh with Ctrl+Shift+R if an old tab is cached. Don't run a second `pnpm dev` if one is already running; Astro's hot reload should update the existing instance.

Check desktop, middle scroll pose, end scroll pose, and phone width. No upstream publishing or Git actions.
