# Paper-mounted derivatives

These WebPs preserve the existing sourced artwork; they are not replacement illustrations.
Originals remain in `../curated/` and the parent directory, with provenance in
`../CURATED-SOURCES.md` and `../SOURCES.md`. All source permissions still apply to derivatives;
publication remains subject to the existing permission review, especially McQueen photography.

Rebuild from the website root: `node scripts/prepare-paper-cutouts.mjs`.
Requires the already-installed Chromium/playwright-core, Pillow, and NumPy. No network requests.
The script rasterizes SVGs at higher resolution, crops transparency, fills enclosed silhouette
holes for the paper backing, varies the backing's dilation along its boundary, and composites
the artwork on paper tinted with the existing grain. Wider, rougher margins use varied dilation
and a multi-scale toothed boundary; deterministic monochrome print grain also textures the
artwork pixels. Originals remain unchanged. The supplied Jetson render's connected white
backdrop is removed before processing, while enclosed light hardware details remain.
Processing intermediates are in
`/tmp/opencode/paper-cutouts/`, not the source directories.
