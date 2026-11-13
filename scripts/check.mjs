// Local Chromium verification. Run pnpm build, pnpm preview, then pnpm check.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4321';
const SHOTS = process.env.SHOT_DIR ?? '/tmp/opencode/shots/personal';
const executablePath = process.env.CHROME_PATH ?? join(homedir(), '.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell');
const pages = [['/', 'home'], ['/work/mcqueen/', 'mcqueen'], ['/credits/', 'credits'], ['/404.html', '404']];
const widths = [320, 390, 768, 1000, 1280, 1440];
const problems = [];
const links = new Map();
const expect = (value, message) => { if (!value) problems.push(message); };
mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });

function watch(page, label) {
  page.on('pageerror', (e) => problems.push(`${label}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${label}: ${m.text()}`); });
  page.on('requestfailed', (r) => problems.push(`${label}: failed ${r.url()}`));
  page.on('request', (r) => {
    if (/^https?:/.test(r.url())) expect(new URL(r.url()).origin === new URL(BASE).origin, `${label}: external request ${r.url()}`);
  });
}

async function inspect(page, label) {
  await page.evaluate(() => document.fonts.ready);
  const result = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    robots: document.querySelector('meta[name="robots"]')?.content,
    h1: document.querySelectorAll('h1').length,
    banned: /\bVERIFIED\b|\bUSER-REPORTED\b/.test(document.body.innerText),
    old: !!document.querySelector('.window, .dock, [data-theme], [data-theme-set], .scene, [data-decode]'),
    broken: [...document.images].filter((e) => e.getClientRects().length && (!e.complete || !e.naturalWidth)).map((e) => e.src),
    empty: [...document.querySelectorAll('a')].filter((e) => !e.textContent.trim() && !e.getAttribute('aria-label') && !e.querySelector('img[alt]')).length,
  }));
  expect(result.overflow <= 1, `${label}: horizontal overflow ${result.overflow}px`);
  expect(result.robots === 'index, follow', `${label}: public indexing metadata missing`);
  expect(result.h1 === 1, `${label}: expected one h1`);
  expect(!result.banned, `${label}: banned status wording`);
  expect(!result.old, `${label}: obsolete desktop/theme markup`);
  expect(!result.broken.length, `${label}: broken ${result.broken.join(', ')}`);
  expect(!result.empty, `${label}: unnamed link`);
  // External URLs and mail compose hand-offs should never replace the site tab.
  // In-page scrapbook panels, skip links, and Home/Back navigation stay in this tab.
  const outbound = await page.$$eval('a[href^="https://"], a[href^="http://"], a[href^="mailto:"]', (items) => items.map((item) => ({
    href: item.getAttribute('href'),
    target: item.getAttribute('target'),
    rel: item.rel.split(/\s+/),
  })));
  for (const item of outbound) {
    expect(item.target === '_blank', `${label}: outbound link must open separately: ${item.href}`);
    expect(item.rel.includes('noopener') && item.rel.includes('noreferrer'), `${label}: outbound link missing tab isolation: ${item.href}`);
  }
  const featuredWork = await page.$$eval('a[href="/work/mcqueen/"]', (items) => items.map((item) => ({
    target: item.getAttribute('target'), rel: item.rel.split(/\s+/),
  })));
  expect(featuredWork.every((item) => item.target === '_blank' && item.rel.includes('noopener')), `${label}: featured work should open separately`);
  const hrefs = await page.$$eval('a[href^="/"], a[href^="#"]', (els) => [...new Set(els.map((e) => e.getAttribute('href')))]);
  for (const href of hrefs) {
    if (href.startsWith('#')) {
      expect(await page.locator(href).count() === 1, `${label}: missing target ${href}`);
    } else {
      const url = new URL(href, BASE);
      const key = url.origin + url.pathname;
      if (!links.has(key)) links.set(key, (await page.request.get(key)).status());
      expect(links.get(key) === 200, `${label}: ${href} returns ${links.get(key)}`);
    }
  }
}

async function inspectScene(page, label, moving = false) {
  const result = await page.evaluate(() => {
    const intro = document.querySelector('.bench-intro').getBoundingClientRect();
    const stage = document.querySelector('.workbench').getBoundingClientRect();
    return [...document.querySelectorAll('[data-prop]')].map((e) => {
      const a = e.getBoundingClientRect();
      const overlap = a.left < intro.right && a.right > intro.left && a.top < intro.bottom && a.bottom > intro.top;
      const visible = Math.max(0, Math.min(a.right, stage.right) - Math.max(a.left, stage.left)) * Math.max(0, Math.min(a.bottom, stage.bottom) - Math.max(a.top, stage.top));
      return { prop: e.dataset.prop, overlap, visible: visible / (a.width * a.height) };
    });
  });
  for (const prop of result) {
    if (!moving) expect(!prop.overlap, `${label}: ${prop.prop} overlaps introduction`);
    expect(prop.visible > .25, `${label}: ${prop.prop} mostly outside scene`);
  }
  if (!moving) {
    const captionClear = await page.locator('[data-note="after"] > span').evaluate((e) => {
      const a = e.getBoundingClientRect();
      return ['dumbbells','football','helmet'].every((name) => {
        const b = document.querySelector(`[data-prop="${name}"]`).getBoundingClientRect();
        return !(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
      });
    });
    expect(captionClear, `${label}: off-duty caption overlaps its objects`);
    const arrows = await page.locator('.annotation-arrows > path').evaluateAll((els) => els.map((e) => {
      const stage = document.querySelector('.workbench').getBoundingClientRect();
      const box = document.querySelector(`[data-prop="${e.dataset.target}"]`).getBoundingClientRect();
      const point = e.getAttribute('d') ? e.getPointAtLength(e.getTotalLength()) : { x:-1, y:-1 };
      return { target:e.dataset.target, drawn:!!e.getAttribute('d'), aligned:point.x >= box.left-stage.left && point.x <= box.right-stage.left && point.y >= box.top-stage.top && point.y <= box.bottom-stage.top };
    }));
    expect(arrows.length === 4 && arrows.every((a) => a.drawn && a.aligned), `${label}: misaligned/missing caption arrow ${arrows.filter((a) => !a.drawn || !a.aligned).map((a) => a.target).join(', ')}`);
  }
}

try {
  // The visitor's local clock, not the build machine or a fixed Mumbai time.
  for (const [hour, greeting] of [[0, 'Good evening'], [9, 'Good morning'], [14, 'Good afternoon'], [19, 'Good evening']]) {
    const page = await browser.newPage({ timezoneId:'UTC' });
    await page.clock.setFixedTime(new Date(`2026-11-14T${String(hour).padStart(2,'0')}:00:00Z`));
    await page.goto(BASE, { waitUntil:'networkidle' });
    expect(await page.locator('[data-greeting]').textContent() === greeting, `local greeting failed at hour ${hour}`);
    expect((await page.locator('h1').innerText()).replace(/\s+/g,' ') === `${greeting}, I'm Kartik Tagore and I'm into building things`, 'full-name introduction changed');
    if (hour === 0) {
      const before = await page.locator('.ink-word').evaluate((e) => getComputedStyle(e).fontFamily);
      await page.waitForFunction((value) => getComputedStyle(document.querySelector('.ink-word')).fontFamily !== value, before, { timeout:2500 });
    }
    await page.close();
  }
  console.log('ok local-clock greetings and full-name introduction');
  for (const [path, name] of pages) {
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const label = `${name}@${width}`;
      watch(page, label);
      expect((await page.goto(BASE + path, { waitUntil: 'networkidle' }))?.status() === 200, `${label}: failed navigation`);
      await inspect(page, label);
      if (name === 'home') {
        expect(await page.locator('dialog[open]').count() === 0, `${label}: panels not enhanced`);
        await inspectScene(page, label);
        expect(await page.locator('.phone,.pliers,.sra-board,.solder,.perfboard').count() === 0, `${label}: removed clutter remains`);
        expect(await page.locator('.uno-aside').textContent() === 'sonny...', `${label}: hidden caption changed`);
        expect(await page.locator('.site-header nav,.signature > span,.scroll-cue,.site-footer a[href="/credits/"]').count() === 0, `${label}: removed UI remains`);
        expect(await page.locator('.site-footer a[href="mailto:kartiktagorekt@gmail.com"]').count() === 1, `${label}: contact link missing`);
        expect(await page.locator('.car-object').getAttribute('href') === 'https://blog.sravjti.in/2026/10/20/mcqueen.html', `${label}: McQueen blog link incorrect`);
        expect((await page.locator('#now li').allTextContents()).join('|') === 'Open-source work.|Autonomous systems.|Robot learning.', `${label}: exploration order incorrect`);
        expect(!/further explore/i.test((await page.locator('#now .panel-content').innerText())), `${label}: redundant further-explore line remains`);
        expect((await page.locator('.notebook strong').innerText()).includes('A few projects.'), `${label}: notebook copy not updated`);
        expect((await page.locator('#away .panel-content').innerText()).includes('on the turf playing something like football or volleyball'), `${label}: off-duty wording incorrect`);
        expect(!(await page.locator('#away .panel-content').innerText()).includes("And I'm always up for badminton or a game of table tennis."), `${label}: deleted sentence remains`);
        expect(await page.locator('a[href="/about/"], .intro-about').count() === 0, `${label}: deleted About page link remains`);
        expect(await page.locator('.bench-panel').evaluateAll((els) => els.length === 4 && els.every((e) => getComputedStyle(e).backgroundImage.includes('paper-grain.png') && getComputedStyle(e, '::before').content !== 'none')), `${label}: panels lost sticky-note paper/tape styling`);
        for (const [selector, id] of [['.notebook', 'now'], ['.jetson', 'away'], ['.screwdriver', 'away'], ['.uno-info','away'], ...['dumbbells', 'football', 'helmet', 'volleyball', 'shuttle', 'knight', 'paddles'].map((name) => ['.' + name, 'away'])]) {
          const trigger = page.locator(selector);
          await trigger.click({ timeout:5000 });
          await page.locator(`#${id}`).waitFor({ state: 'visible' });
          expect(await page.locator(`#${id}`).evaluate((e) => e.matches(':modal')), `${label}: ${id} not modal`);
          if (id === 'away') {
            const interest = await trigger.getAttribute('data-interest');
            expect(await page.locator('#away [data-interest-note]').isVisible() === !!interest, `${label}: object-specific About note visibility incorrect`);
            if (interest) expect((await page.locator('#away [data-interest-note]').innerText()).trim().length > 20, `${label}: ${interest} lacks personal note`);
            if (interest === 'dumbbells') expect((await page.locator('#away [data-interest-note]').innerText()).includes('next rep'), `${label}: gym note not distinct`);
            if (interest === 'volleyball') expect((await page.locator('#away [data-interest-note]').innerText()).includes('last set'), `${label}: volleyball note not distinct`);
          }
          expect(await page.locator(`#${id} .panel-content`).evaluate((el) => {
            const css = getComputedStyle(el);
            return css.scrollbarWidth === 'none' && css.overflowX === 'hidden';
          }), `${label}: visible scrollbar or horizontal track inside note`);
          expect(await page.evaluate(() => document.body.classList.contains('panel-is-open')), `${label}: scroll not locked`);
          await page.keyboard.press('Escape');
          await page.waitForFunction((target) => !document.getElementById(target).open && !document.body.classList.contains('panel-is-open'), id);
          expect(await trigger.evaluate((e) => e === document.activeElement), `${label}: ${id} focus not restored`);
        }
        expect(await page.locator('.workbench').evaluate((e) => e.scrollLeft === 0 && e.scrollTop === 0), `${label}: focusing an edge object shifted the workbench`);
        expect(await page.locator('.marginalia-left').textContent() === 'after class, find me here', `${label}: off-duty caption changed`);
        expect(await page.locator('.intro-kicker').count() === 0, `${label}: redundant intro kicker remains`);
        expect(await page.locator('.ink-word').textContent() === 'building', `${label}: highlighted verb changed`);
        expect(await page.locator('.uno-art').getAttribute('src') === '/img/bench/paper/arduino-uno.webp', `${label}: supplied UNO artwork missing`);
        expect(await page.locator('.jetson img').getAttribute('src') === '/img/bench/paper/jetson-render.webp', `${label}: supplied Jetson render missing`);
        expect(await page.locator('[data-note="bits"]').count() === 0, `${label}: removed board caption remains`);
        expect(!(await page.locator('.bench-intro').innerText()).includes('Production') && (await page.locator('.bench-intro').innerText()).includes('second-year student at VJTI'), `${label}: student wording incorrect`);
        expect(await page.locator('.ink-letter').count() === 8, `${label}: animated building lettering incomplete`);
        expect(await page.locator('[data-prop]').evaluateAll((els) => els.every((e) => getComputedStyle(e.querySelector('.cut-paper') ?? e, '::before').content !== 'none')), `${label}: object missing tape`);
        await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
      }
      await page.screenshot({ path: join(SHOTS, `${name}-${width}.png`), fullPage: true });
      console.log(`ok ${label}`);
      await page.close();
    }
  }

  // Keyboard opening, native focus trap, explicit close, backdrop, direct hash, blocked storage.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    watch(page, 'interaction');
    await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw Error('blocked'); } }); });
    await page.goto(BASE + '/?theme=bootleg', { waitUntil: 'networkidle' });
    await page.locator('.notebook').focus();
    await page.keyboard.press('Enter');
    expect(await page.locator('#now').evaluate((e) => e.open), 'keyboard open failed');
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      expect(await page.locator('#now').evaluate((e) => document.activeElement === document.body || e.contains(document.activeElement)), 'background element received focus');
    }
    await page.locator('.signature').evaluate((e) => e.focus());
    expect(await page.locator('.signature').evaluate((e) => e !== document.activeElement), 'native modal failed to make the background inert');
    await page.locator('#now [data-panel-close]').click();
    await page.locator('#now').waitFor({ state: 'hidden' });
    await page.locator('.dumbbells').click();
    await page.screenshot({ path: join(SHOTS, 'away-panel-1440.png') });
    expect((await page.locator('#away .panel-content').innerText()).includes('random walk'), 'personal About note lacks random walks');
    await page.mouse.click(10, 300);
    await page.locator('#away').waitFor({ state: 'hidden' });
    await page.goto(BASE + '/#now', { waitUntil: 'networkidle' });
    expect(await page.locator('#now').evaluate((e) => e.matches(':modal')), 'direct hash did not open Now');
    await page.setViewportSize({ width: 320, height: 700 });
    expect(await page.locator('#now').evaluate((e) => e.getBoundingClientRect().width <= innerWidth), 'modal overflows phone');
    await page.screenshot({ path: join(SHOTS, 'now-panel-320.png') });
    await page.keyboard.press('Escape');
    await page.close();
    console.log('ok keyboard, focus trap/return, close, backdrop, deep link, resize, blocked storage');
  }

  for (const [path, name] of pages) {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width, height: 900 } });
      watch(page, `no-js/${name}@${width}`);
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      await inspect(page, `no-js/${name}@${width}`);
      if (name === 'home') {
        expect(await page.locator('dialog[open]').count() === 4, `no-js@${width}: content missing`);
        expect(await page.locator('[data-greeting]').textContent() === 'Hi', 'no-JS greeting fallback missing');
        expect(await page.locator('[data-panel-close]:visible').count() === 0, 'no-js: inert controls visible');
        expect(await page.locator('.uno-controls:visible,.scene-controls:visible').count() === 0, 'no-js: inert scene controls visible');
        expect((await page.locator('#now').innerText()).includes('Open-source work'), 'no-js: Now text missing');
      }
      await page.close();
    }
  }
  console.log('ok no-JS: all pages on mobile and desktop');

  // Actual wheel input, intermediate arrangements, bounds, reverse and keyboard alternative.
  for (const width of [1280, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    watch(page, `scroll@${width}`);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const initial = await page.locator('.dumbbells').evaluate((e) => e.getBoundingClientRect().y);
    const starts = await page.locator('[data-prop]').evaluateAll((els) => Object.fromEntries(els.map((e) => { const r = e.getBoundingClientRect(); return [e.dataset.prop, { x:r.x, y:r.y }]; })));
    await page.mouse.move(width / 2, 450);
    for (let step = 1; step <= 8; step++) {
      await page.mouse.wheel(0, 325);
      await page.waitForTimeout(750);
      await inspectScene(page, `scroll@${width}/${step}`, step < 8);
      if (step === 4 || step === 8) expect(await page.locator('.bench-intro').evaluate((e) => e.inert) === (step === 4), `scroll@${width}: intro inert/restoration failed`);
      if (step === 8) {
        const ends = await page.locator('[data-prop]').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { name:e.dataset.prop, x:r.x, y:r.y }; }));
        for (const end of ends) expect(Math.hypot(end.x - starts[end.name].x, end.y - starts[end.name].y) > 40, `scroll@${width}: ${end.name} did not reach a different place`);
      }
      expect(await page.evaluate(() => scrollY === 0), 'desktop wheel scrolled document');
      if (step === 4 || step === 8) {
        await page.screenshot({ path: join(SHOTS, `arrangement-${step / 4}-${width}.png`) });
        for (const selector of ['.notebook', '.jetson', '.dumbbells', '.football', '.helmet', '.volleyball', '.shuttle', '.knight', '.paddles']) {
          // Layered objects remain keyboard reachable; focus brings them forward.
          await page.locator(selector).focus();
          await page.keyboard.press('Enter');
          expect(await page.locator('dialog[open]').count() === 1, `scroll@${width}: layered ${selector} inaccessible`);
          await page.keyboard.press('Escape');
          await page.waitForFunction(() => !document.querySelector('dialog[open]'));
        }
      }
    }
    await page.mouse.wheel(0, -10000);
    await page.waitForTimeout(1400);
    expect(Math.abs(await page.locator('.dumbbells').evaluate((e) => e.getBoundingClientRect().y) - initial) < 1, 'reverse scroll did not restore arrangement');
    await page.locator('.workbench').focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(1200);
    expect(Math.abs(await page.locator('.dumbbells').evaluate((e) => e.getBoundingClientRect().y) - initial) > 30, 'keyboard rearrange did not move props');
    await page.locator('.rearrange').click();
    await page.waitForTimeout(1200);
    expect(Math.abs(await page.locator('.dumbbells').evaluate((e) => e.getBoundingClientRect().y) - initial) < 1, 'reset button failed');
    await page.locator('.notebook').click();
    const modalScroll = await page.locator('.dumbbells').getAttribute('style');
    await page.mouse.wheel(0, 1300);
    expect(await page.locator('.dumbbells').getAttribute('style') === modalScroll, 'modal wheel altered scene');
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => !document.body.classList.contains('scroll-scene'));
    expect(!await page.locator('body').evaluate((e) => e.classList.contains('scroll-scene')), 'mobile retained desktop scroll lock');
    await page.mouse.move(200, 600);
    await page.mouse.wheel(0, 550);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => scrollY > 0), 'mobile document cannot scroll');
    expect(await page.locator('.dumbbells').evaluate((e) => Math.abs(parseFloat(new DOMMatrix(getComputedStyle(e).transform).m42)) <= 12), 'mobile movement too large');
    await page.close();
  }
  console.log('ok wheel rearrangements, intermediate clearance, prop clicks, reverse, keyboard, modal pause, mobile scroll');

  for (const [width, height] of [[600, 900], [700, 900], [1100, 860], [1440, 860], [1440, 650], [1920, 900], [1920, 1080]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    watch(page, `edge@${width}x${height}`);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const moving = await page.locator('.rearrange').isVisible();
    for (let arrangement = 0; arrangement < (moving ? 3 : 1); arrangement++) {
      if (arrangement) {
        await page.locator('.workbench').focus();
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(1300);
      }
      await inspectScene(page, `edge@${width}x${height}/${arrangement}`, arrangement === 1);
    if (arrangement === 0 || arrangement === 2) {
      const overlap = await page.evaluate(() => {
        const r = (name) => document.querySelector(name).getBoundingClientRect();
        const a = r('.screwdriver');
        return ['.uno', '.jetson', '.shuttle'].filter((name) => { const b=r(name); return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; });
      });
      expect(!overlap.length, `edge@${width}x${height}/${arrangement}: screwdriver collides with ${overlap.join(',')}`);
    }
      expect(await page.locator('.object-caption').evaluate((e) => !e.getClientRects().length || e.getBoundingClientRect().bottom <= document.querySelector('.workbench').getBoundingClientRect().bottom + 1), `edge@${width}x${height}/${arrangement}: car caption clipped`);
    }
    await page.screenshot({ path: join(SHOTS, `edge-${width}x${height}.png`), fullPage: true });
    await page.close();
  }
  console.log('ok intermediate breakpoints, short screens, wide screens and caption visibility');

  // Hidden board sequence: ordinary/short presses must not activate it.
  for (const mode of ['pointer', 'keyboard', 'touch', 'reduced']) {
    const page = await browser.newPage({ viewport: mode === 'touch' ? { width: 390, height: 844 } : { width: 1440, height: 900 }, hasTouch: mode === 'touch', reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
    watch(page, `uno/${mode}`);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const board = page.locator('.uno');
    const power = page.locator('.uno-power');
    const connector = page.locator('.uno-connector');
    await power.click();
    expect(!await board.evaluate((e) => e.classList.contains('is-fried')), 'ordinary power click fried board');
    await connector.click();
    await power.focus();
    await page.keyboard.down('Enter');
    await page.waitForTimeout(200);
    await page.keyboard.up('Enter');
    await page.waitForTimeout(1600);
    expect(!await board.evaluate((e) => e.classList.contains('is-fried')), 'short hold fried board');
    await connector.click();
    if (mode === 'keyboard' || mode === 'reduced') {
      await power.focus();
      await page.keyboard.down(' ');
      await page.waitForTimeout(1650);
      await page.keyboard.up(' ');
    } else {
      await power.scrollIntoViewIfNeeded();
      const box = await power.boundingBox();
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      if (mode === 'touch') {
        const client = await page.context().newCDPSession(page);
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await page.waitForTimeout(1650);
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.waitForTimeout(1650);
        await page.mouse.up();
      }
    }
    expect(await board.evaluate((e) => e.classList.contains('is-fried')), `${mode}: sequence failed`);
    expect(await page.locator('.uno-reset').evaluate((e) => e.offsetTop > e.closest('.uno').clientHeight), `${mode}: reset not below board`);
    expect(await page.locator('.uno-aside').evaluate((e) => e.offsetTop > e.closest('.uno').clientHeight), `${mode}: sonny not below board`);
    expect(await page.locator('.uno-aside').evaluate((e) => parseFloat(getComputedStyle(e).fontSize) >= 18), `${mode}: sonny too small`);
    await page.waitForTimeout(850);
    await page.screenshot({ path: join(SHOTS, `uno-${mode}.png`), fullPage: mode === 'touch' });
    await page.waitForTimeout(1800);
    expect(await page.locator('.uno-aside').evaluate((e) => getComputedStyle(e).opacity === '0'), 'private caption stayed visible');
    expect(await board.evaluate((e) => e.classList.contains('is-fried')), 'charred state did not persist');
    await page.locator('.uno-reset').click();
    expect(!await board.evaluate((e) => e.classList.contains('is-fried')), 'reset failed');
    expect(await connector.evaluate((e) => e === document.activeElement), 'reset did not return focus');
    // A connector expires, and an interrupted hold is cancelled.
    await connector.click();
    await page.waitForTimeout(6600);
    expect(await connector.getAttribute('aria-pressed') === 'false', 'connector did not expire');
    await connector.click();
    await power.focus();
    await page.keyboard.down('Enter');
    await page.keyboard.press('Escape');
    await page.keyboard.up('Enter');
    await page.waitForTimeout(1600);
    expect(!await board.evaluate((e) => e.classList.contains('is-fried')), 'Escape did not cancel hold');
    await page.close();
  }
  console.log('ok UNO: gated trigger, short hold, pointer/keyboard/touch/reduced, caption expiry, persistent char/reset, timeout/cancel');

  {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    expect(await page.locator('.car-object').evaluate((e) => getComputedStyle(e).transitionDuration === '0s'), 'reduced motion: hover transition remains');
    expect(await page.locator('.scene-controls:visible').count() === 0, 'reduced motion: rearrange controls remain');
    expect(await page.locator('.ink-letter').evaluateAll((els) => els.every((e) => getComputedStyle(e).animationName === 'none')), 'reduced motion: lettering still moves');
    expect(await page.locator('.ink-word').evaluate((e) => getComputedStyle(e).animationName === 'none'), 'reduced motion: font still switches');
    const before = await page.locator('.car-object').getAttribute('style');
    await page.mouse.wheel(0, 1300);
    await page.waitForTimeout(200);
    expect(await page.locator('.car-object').getAttribute('style') === before, 'reduced motion: scroll moved objects');
    await page.goto(BASE + '/work/mcqueen/', { waitUntil: 'networkidle' });
    expect(await page.locator('.packet').first().evaluate((e) => getComputedStyle(e).display === 'none'), 'reduced motion: animated diagram packet remains');
    await page.close();
  }
  console.log('ok reduced motion');

  const luminance = (hex) => {
    const v = hex.match(/\w\w/g).map((s) => parseInt(s, 16) / 255).map((c) => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
    return .2126 * v[0] + .7152 * v[1] + .0722 * v[2];
  };
  const pairs = [['2e302b', 'f5f2e4'], ['666252', 'f5f2e4'], ['a44731', 'f5f2e4'], ['2e302b', 'ebe6d0'], ['57564d', 'f5f2e4'], ['555d52', 'eee5cd'], ['292d29', 'e4b9a0'], ['37473a', 'ced6c5']];
  for (const [fg, bg] of pairs) {
    const a = luminance(fg), b = luminance(bg);
    const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    expect(ratio >= 4.5, `contrast #${fg}/#${bg}: ${ratio.toFixed(2)}`);
  }
  expect((await (await fetch(BASE + '/robots.txt')).text()).includes('Allow: /'), 'robots.txt changed');
  console.log(`ok ${pairs.length} contrast pairs and robots.txt`);
} catch (error) {
  problems.push(error.stack ?? String(error));
} finally {
  await browser.close();
}
console.log(problems.length ? `PROBLEMS (${problems.length}):\n${problems.join('\n')}` : 'OK: no problems found');
process.exitCode = problems.length ? 1 : 0;
