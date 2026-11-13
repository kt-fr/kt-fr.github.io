# Human-authored collage assets — overlay update

This archive contains **only** updated/new files, not a full website replacement.
Extract it into `/home/kartik/sra` (the archive paths start with `website/`).

```bash
cd /home/kartik/sra
# Back up the few files this patch changes before overwriting them if you have
# local changes since the archive supplied to ChatGPT.
tar -xzf ~/Downloads/website-curated-art-overlay.tar.gz -C /home/kartik/sra
cd website
python3 scripts/prepare-curated-art.py
python3 scripts/prepare-photo-props.py --only dumbbells knight jetson  # optional real photos
pnpm dev
```

Open the **port displayed by this new dev-server command**. If an old server is
still running on 4321, the new one may choose 4322 or another free port.
After generating assets, restart Astro to pick up the new files.

### What changes

- Football, volleyball, shuttlecock and ping-pong prefer actual published SVGs,
  downloaded from the artists' archives; originals remain on failure.
- Dumbbells and chess knight prefer the optional CC0 photographs; otherwise
  use the newly sourced public-domain illustrations if present.
- Jetson prefers the optional CC0 photographic cutout.
- McQueen's real SRA project image and the interactive Arduino `sonny` Easter
  egg stay as they were.
- Credits and source/rights register included. No production push/deploy.

### Limitations

- The artwork bytes **aren't bundled** because this workspace's network
  environment cannot fetch these files into the archive. The actual art is
  downloaded on the user's internet-connected machine.
- Downloaded assets and photographic masks must be visually checked; the
  selected SVGs were verified on source pages, but not rendered locally here.
- Nothing changes visually until the download step succeeds.
