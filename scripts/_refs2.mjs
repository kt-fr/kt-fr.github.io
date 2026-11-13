import { chromium } from 'playwright-core';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const exe = join(homedir(), '.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell');
mkdirSync('/tmp/opencode/refs2', { recursive: true });

const sites = [
  ['vrushtee', 'https://vruga.site'],
  ['sarayu', 'https://sarayusapa.github.io/'],
  ['lakshya', 'https://lakshyaa1.github.io/'],
  ['tirth', 'https://dimios45.github.io/'],
  ['vedant', 'https://vedantmalkar.github.io'],
  ['mustafa', 'https://mt-tass.github.io'],
  ['sarvaarth', 'https://sarvaarthn.github.io/'],
  ['omkar', 'https://nomkar24.github.io/'],
  ['ashutosh', 'https://d4ggr.github.io/'],
  ['ashish', 'https://ashish4225.github.io/'],
  ['gargi', 'https://gg21-prog.github.io/'],
  ['pushkar', 'https://pushkardube.github.io/'],
  ['mehul', 'https://coffeempty.github.io/portfolio/'],
  ['sahil', 'https://sahilapage.github.io/'],
  ['paarth', 'https://paarth-shirsat.github.io/'],
  ['vedjain', 'https://vedjain773.github.io/'],
  ['bhakti', 'https://bhakti-a.github.io/'],
  ['shashvat', 'https://spr4bhu.github.io/'],
  ['archit', 'https://avm1234567.github.io/'],
  ['harshit', 'https://harshit6-b.github.io/'],
  ['aryanv', 'https://4rynv.github.io'],
  ['abhijeet', 'https://abhixb.github.io'],
  ['arhan', 'https://4rhan.github.io'],
  ['ansh', 'https://4n5hh.github.io/'],
  ['ksagar', 'https://ksagar.site/'],
  ['shaunak', 'https://shaunakkdatar.github.io/'],
  ['shrivishakh', 'https://5iri.me'],
  ['prajwal', 'https://crisiumnih.github.io'],
  ['sujal', 'https://5usu.github.io/'],
  ['kartikeya', 'https://noobmaster-version.github.io/spongefal/index.html'],
  ['piyush', 'https://piyushpatle26.github.io'],
  ['suchit', 'https://ilegend509.me/'],
];

const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const rows = [];

for (const [name, url] of sites) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 80)));
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2200);
    const info = await page.evaluate(() => {
      const cs = getComputedStyle(document.body);
      const h1 = document.querySelector('h1');
      const pick = (el) => el ? getComputedStyle(el) : null;
      const h1cs = pick(h1);
      const fonts = [...new Set([...document.querySelectorAll('h1,h2,h3,p,a,button,nav')]
        .slice(0, 80)
        .map((el) => getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim()))].slice(0, 6);
      const bigImgs = [...document.querySelectorAll('img')].filter((i) => i.naturalWidth > 150 && i.naturalHeight > 150 && i.getBoundingClientRect().top < 900);
      const canvas = document.querySelectorAll('canvas').length;
      const pre = document.querySelectorAll('pre,code').length;
      const sections = document.querySelectorAll('section').length;
      const nav = document.querySelectorAll('nav a').length;
      const links = [...document.querySelectorAll('a')].map((a) => a.getAttribute('href')).filter(Boolean);
      return {
        title: document.title,
        h1: h1?.innerText?.replace(/\s+/g, ' ').slice(0, 70) || '',
        h1size: h1cs ? Math.round(parseFloat(h1cs.fontSize)) : 0,
        h1font: h1cs ? h1cs.fontFamily.split(',')[0].replace(/["']/g, '').trim() : '',
        bg: cs.backgroundColor,
        color: cs.color,
        fonts,
        bigImgs: bigImgs.length,
        imgSrcs: bigImgs.slice(0, 3).map((i) => (i.currentSrc || i.src).split('/').pop().slice(0, 40)),
        canvas,
        pre,
        sections,
        nav,
        height: document.body.scrollHeight,
        email: links.some((l) => l.startsWith('mailto:')),
        github: links.some((l) => l.includes('github.com')),
        linkedin: links.some((l) => l.includes('linkedin.com')),
      };
    });
    await page.screenshot({ path: `/tmp/opencode/refs2/${name}-top.png` });
    rows.push({ name, url, ok: true, ...info, errors: errors.length });
    console.log(`${name}\t${info.bg}\t${info.h1size}px\t${info.h1font}\timgs=${info.bigImgs}\tcanvas=${info.canvas}\tpre=${info.pre}\tsec=${info.sections}\th=${info.height}\t${info.h1.slice(0, 40)}`);
  } catch (e) {
    rows.push({ name, url, ok: false, err: String(e).slice(0, 100) });
    console.log(`${name}\tFAILED\t${String(e).slice(0, 80)}`);
  }
  await ctx.close();
}
writeFileSync('/tmp/opencode/refs2/meta.json', JSON.stringify(rows, null, 2));
await browser.close();
