#!/usr/bin/env bash
set -euo pipefail
REPO="kt-fr/kt-fr.github.io"
SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
for cmd in gh git pnpm rsync; do
  command -v "$cmd" >/dev/null || { echo "Missing $cmd. Install it before publishing." >&2; exit 1; }
done
gh auth status >/dev/null
cd "$SITE_DIR"
# Stop if source is not buildable. Do not publish partial output.
pnpm build
if ! gh repo view "$REPO" --json name >/dev/null 2>&1; then
  echo "Creating public GitHub repository $REPO (website only)..."
  gh repo create "$REPO" --public --description "Personal scrapbook website"
fi
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
gh repo clone "$REPO" "$STAGE/site"
# Refuse to overwrite a pre-existing, unrelated public repository.
if git -C "$STAGE/site" rev-parse --verify HEAD >/dev/null 2>&1 && \
   { [ ! -f "$STAGE/site/package.json" ] || [ ! -f "$STAGE/site/.github/workflows/deploy.yml" ]; }; then
  echo "Repository already contains other content. Stopping to protect it." >&2
  exit 1
fi
# The clone is separate from /home/kartik/sra, which must stay local-only.
rsync -a --delete \
  --exclude='/.git/' \
  --exclude='/node_modules/' \
  --exclude='/dist/' \
  --exclude='/.astro/' \
  --exclude='/.env' \
  --exclude='/.env.*' \
  --exclude='/test-results/' \
  --exclude='/playwright-report/' \
  --exclude='/.cache/' \
  --exclude='*.log' \
  "$SITE_DIR/" "$STAGE/site/"
cd "$STAGE/site"
git checkout -B main
if ! git config user.name >/dev/null; then git config user.name 'kt-fr'; fi
if ! git config user.email >/dev/null; then
  ID="$(gh api user --jq .id)"
  git config user.email "${ID}+kt-fr@users.noreply.github.com"
fi
git add -A
if ! git diff --cached --quiet; then
  git commit -m "Publish personal scrapbook website"
  git push --set-upstream origin main
else
  echo "No content changes to publish."
fi
# Enable workflow-based Pages where the REST API permits it.
if ! gh api --method POST "repos/$REPO/pages" -f build_type=workflow >/dev/null 2>&1; then
  gh api --method PUT "repos/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 || true
fi
gh workflow run deploy.yml --repo "$REPO" --ref main >/dev/null 2>&1 || true
echo
echo 'Source: https://github.com/kt-fr/kt-fr.github.io'
echo 'Website: https://kt-fr.github.io'
echo 'Actions: https://github.com/kt-fr/kt-fr.github.io/actions'
echo 'If Pages does not deploy: Settings > Pages > Build and deployment > Source > GitHub Actions'
