// Rasterize the existing artwork, then add a scissor-cut paper margin. No new
// artwork, generative model, network download, or package installation is used.
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const cache = '/tmp/opencode/paper-cutouts';
mkdirSync(cache, { recursive: true });
const sources = {
  ...Object.fromEntries(['dumbbells', 'football', 'volleyball', 'shuttle', 'knight', 'paddles'].map((name) => [name, `curated/${name}.svg`])),
  mcqueen: 'mcqueen.webp', screwdriver: 'curated/screwdriver.png', 'jetson-render': 'curated/jetson-render.png', 'arduino-uno': 'curated/arduino-uno.svg', helmet: 'curated/helmet.png',
};
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? join(homedir(), '.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell'),
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage();
  for (const [name, path] of Object.entries(sources)) {
    const bytes = readFileSync(join('public/img/bench', path));
    const mime = path.endsWith('.svg') ? 'image/svg+xml' : path.endsWith('.png') ? 'image/png' : 'image/webp';
    const png = await page.evaluate(async (url) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const scale = url.startsWith('data:image/svg+xml') ? 900 / Math.max(image.naturalWidth, image.naturalHeight) : Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png').split(',')[1];
    }, `data:${mime};base64,${bytes.toString('base64')}`);
    writeFileSync(join(cache, name + '.png'), Buffer.from(png, 'base64'));
  }
} finally {
  await browser.close();
}
execFileSync('python3', ['scripts/prepare-paper-cutouts.py'], { stdio: 'inherit' });
