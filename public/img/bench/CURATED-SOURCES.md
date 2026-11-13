# Curated original vector art — human-created, no AI generation

These six assets are downloaded from established art archives by running
`python3 scripts/prepare-curated-art.py`.  The downloaded files are the
actual artists' SVGs, not assistant-generated approximations. The downloader
verifies they are SVG before using them. Source pages were reviewed
2026-11-13. The `curated/` directory is populated **only after** a successful
download on your computer; no online image bytes were bundled into this patch.

| File | Artist / provenance | Source page | Reuse status |
|---|---|---|---|
| `dumbbells.svg` | OpenClipart contributors, *Dumbbell drawing* | https://freesvg.org/dumbbell-drawing | Public domain / FreeSVG CC0 |
| `football.svg` | OpenClipart contributors, *Soccerball.svg* | https://commons.wikimedia.org/wiki/File:Soccerball.svg | Public domain |
| `volleyball.svg` | Angelo Gelmi, Svgalbertian, Luan, adapted *Volleyball (transparent).svg* | https://commons.wikimedia.org/wiki/File:Volleyball_(transparent).svg | CC0 / public domain |
| `shuttle.svg` | OpenClipart illustration based on gnokii, *shuttlecock* | https://freesvg.org/shuttlecock | Public domain / FreeSVG CC0 |
| `knight.svg` | CyrilKato / Sashité, *Chess white knight.svg* | https://commons.wikimedia.org/wiki/File:Chess_white_knight.svg | CC0 1.0 |
| `paddles.svg` | OpenClipart, *Pong and Paddle ns* | https://freesvg.org/paddle | Public domain / FreeSVG CC0 |

For more photographic diversity, run
`python3 scripts/prepare-photo-props.py --only dumbbells knight jetson`.
These three existing source selections are CC0, but background removal quality
varies and needs visual review. The site prefers photographic cutouts for those
three items when the files exist, and illustrations for the others.

**McQueen** remains the source photograph supplied by the SRA project blog:
https://blog.sravjti.in/2026/10/20/mcqueen.html — confirm permission for
personal republication with the project team. **Arduino UNO Q** retains its
original site illustration because use of an official manufacturer product
photo was not cleared. The fictional `sonny` interaction is unchanged.

Do not copy third-party image-search thumbnails or artwork from the Josh/Sadok
design reference sites without permission. Even when no credit is legally
required for public-domain art, these links preserve provenance.

## User-supplied helmet (2026-11-14)

`curated/helmet.png` is the unchanged user-supplied download `helmet_2783747.png`,
a 512×512 red-and-white motorcycle helmet illustration. Included on explicit request to
represent bike riding. Original artist, source URL and license are UNKNOWN; do not infer a
license from the filename. Local preview only until provenance/reuse rights are confirmed.
`paper/helmet.webp` adds the same paper backing as the other objects; it is not new artwork.

## User-supplied Arduino UNO (2026-11-14)

`curated/arduino-uno.svg` is the unchanged `ArduinoUno.svg` supplied in Downloads.
It depicts a classic UNO, not UNO Q; no hardware installation claim is implied.
Original creator, source URL and reuse license are not established by the supplied file.
Local preview only until provenance/permissions are confirmed. `paper/arduino-uno.webp`
is its paper-mounted derivative. The previous site illustration and derivative remain on
disk, but are no longer selected for the homepage. The fictional interaction is preserved.

## User-supplied Jetson render (2026-11-14)

`curated/jetson-render.png` is the unchanged supplied `jetson render.PNG` (910×634).
Its author/source/license are UNKNOWN; local preview only until rights are confirmed.
`paper/jetson-render.webp` removes only the connected near-white backdrop, preserves the
render's light hardware details, and adds print grain and irregular paper margins. It replaces
the old Jetson drawing in the scene, without claiming installed hardware or a new achievement.
