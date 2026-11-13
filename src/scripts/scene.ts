type Pose = [number, number, number, number]; // left %, top %, width %, rotation

export function initScene(stage: HTMLElement) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 1100px) and (min-height: 760px) and (pointer: fine)');
  const controls = stage.querySelector<HTMLElement>('.scene-controls')!;
  const button = stage.querySelector<HTMLButtonElement>('.rearrange')!;
  // The reference's central interaction: loose desk objects gather into a
  // deliberate messy pile, then float out into a second still life.
  // Each tuple is [left %, top %, width %, rotation]. Overlap at pose 1
  // is intentional; pose 0 and pose 2 leave the text readable.
  const arrangements: Record<string, [Pose, Pose]> = {
    dumbbells: [[33, 35, 26, -128], [5, 68, 24, 10]],
    screwdriver: [[38, 53, 12, 112], [73, 40, 7.5, -12]],
    football: [[49, 50, 16, 110], [5, 22, 12.5, -25]],
    helmet: [[43, 28, 13, -64], [19, 64, 13, 15]],
    volleyball: [[56, 31, 13, -95], [84, 8, 13, 48]],
    shuttle: [[61, 51, 8, 145], [59, 73, 6.5, -35]],
    knight: [[46, 20, 10, -70], [64, 14, 10, 28]],
    paddles: [[43, 63, 12, 145], [84, 44, 12, -35]],
    jetson: [[37, 27, 13, -95], [7, 7, 13, 22]],
    car: [[44, 39, 28, -42], [40, 2, 26, 9]],
    uno: [[54, 62, 14, 58], [23, 12, 14, -18]],
    notebook: [[59, 22, 16, 48], [76, 60, 17, -12]],
    after: [[29, 20, 22, -10], [4, 58, 23, -2]],
    progress: [[67, 68, 20, 10], [76, 89, 20, -5]],
  };
  const props = [...stage.querySelectorAll<HTMLElement>('[data-prop], [data-note]')];
  const intro = stage.querySelector<HTMLElement>('.bench-intro');
  const arrows = stage.querySelector<SVGSVGElement>('.annotation-arrows')!;
  const annotations = [...stage.querySelectorAll<HTMLElement>('[data-points-to]')].flatMap((note) =>
    note.dataset.pointsTo!.split(' ').map((name) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.dataset.target = name;
      arrows.append(path);
      return { note, target: stage.querySelector<HTMLElement>(`[data-prop="${name}"]`)!, path };
    })
  );

  function drawAnnotations() {
    const origin = stage.getBoundingClientRect();
    arrows.setAttribute('viewBox', `0 0 ${origin.width} ${origin.height}`);
    annotations.forEach(({ note, target, path }, i) => {
      const label = note.firstElementChild!.getBoundingClientRect();
      const object = target.getBoundingClientRect();
      const dx = object.x + object.width / 2 - label.x - label.width / 2;
      const dy = object.y + object.height / 2 - label.y - label.height / 2;
      const distance = Math.hypot(dx, dy);
      // Anchor to measured bounds, with the tip slightly inside the cutout's
      // silhouette rather than a guessed unicode arrow beside the caption.
      const edge = (box: DOMRect, direction: number, gap: number) => {
        const t = Math.min((box.width / 2 + gap) / Math.max(.01, Math.abs(dx)), (box.height / 2 + gap) / Math.max(.01, Math.abs(dy)));
        return [box.x + box.width / 2 + dx * t * direction - origin.x, box.y + box.height / 2 + dy * t * direction - origin.y];
      };
      const start = edge(label, 1, -label.height * .25), end = edge(object, -1, -Math.min(object.width, object.height) * .30);
      const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
      if (distance < 1 || length < 5 || (end[0] - start[0]) * dx + (end[1] - start[1]) * dy <= 0) {
        path.setAttribute('d', '');
        return;
      }
      const bend = Math.min(22, length * .18) * (i % 2 ? -1 : 1);
      const cx = (start[0] + end[0]) / 2 - dy / distance * bend;
      const cy = (start[1] + end[1]) / 2 + dx / distance * bend;
      path.setAttribute('d', `M${start[0]},${start[1]}Q${cx},${cy} ${end[0]},${end[1]}`);
    });
  }
  let bases: Pose[] = [];
  let widthFactors: number[] = [];
  let target = 0;
  let current = 0;
  let frame = 0;
  let previous = 0;
  let mobileScroll = 0;
  let mobile = false;

  function render() {
    // A page turning: the little central note recedes behind the gathered pile.
    if (intro && !mobile) {
      const distanceFromPile = Math.abs(current - 1);
      intro.style.opacity = String(Math.min(1, distanceFromPile * 1.65));
      intro.inert = distanceFromPile < .65;
      stage.style.setProperty('--caption-opacity', String(Math.max(0, (distanceFromPile - .65) / .35)));
      intro.style.transform = `translateY(${Math.max(0, current - 1) * stage.clientHeight * .14 + (1 - Math.min(1, distanceFromPile)) * 8}px)`;
    }
    props.forEach((prop, i) => {
      if (mobile) {
        const shift = Math.min(12, mobileScroll * .012) * (i % 2 ? 1 : -1);
        prop.style.transform = `translate3d(0, ${shift}px, 0) rotate(${bases[i][3] + shift * .12}deg)`;
        return;
      }
      // CSS may cap large screens to sane pixel sizes. Preserve that cap
      // through both animated poses, instead of scaling props up on scroll.
      const poses = [bases[i], ...arrangements[(prop.dataset.prop ?? prop.dataset.note)!].map(
        ([x, y, width, angle]) => [x, y, width * widthFactors[i], angle] as Pose
      )];
      const index = Math.min(1, Math.floor(current));
      const segment = current - index;
      const delay = (i % 4) * .035;
      const progress = Math.max(0, Math.min(1, (segment - delay) / (1 - delay)));
      const t = progress * progress * (3 - 2 * progress);
      const from = poses[index], to = poses[index + 1];
      const pose = from.map((value, n) => value + (to[n] - value) * t);
      // Small, different arcs keep this from looking like a synchronized zoom.
      const arc = Math.sin(t * Math.PI);
      pose[0] += arc * (i % 2 ? 3 : -3);
      pose[1] += arc * ((i % 3) - 1) * 4;
      if (prop.dataset.prop === 'car') prop.style.setProperty('--pose-angle', `${pose[3]}deg`);
      prop.style.transform = `translate3d(${(pose[0] - bases[i][0]) * stage.clientWidth / 100}px, ${(pose[1] - bases[i][1]) * stage.clientHeight / 100}px, 0) rotate(${pose[3]}deg) scale(${pose[2] / bases[i][2]})`;
    });
    drawAnnotations();
  }

  function animate(now: number) {
    if (document.body.classList.contains('panel-is-open') || stage.querySelector('.is-holding')) {
      frame = 0;
      previous = 0;
      return;
    }
    const dt = Math.min(50, previous ? now - previous : 16);
    previous = now;
    current += (target - current) * (1 - Math.exp(-dt / 135));
    if (Math.abs(target - current) < .001) current = target;
    render();
    if (current !== target) frame = requestAnimationFrame(animate);
    else { frame = 0; previous = 0; }
  }

  function request() {
    if (!frame) frame = requestAnimationFrame(animate);
  }

  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    current = target = 0;
    mobile = !desktop.matches;
    stage.style.removeProperty('--caption-opacity');
    if (intro) { intro.style.removeProperty('opacity'); intro.style.removeProperty('transform'); intro.inert = false; }
    props.forEach((prop) => {
      prop.style.removeProperty('transform');
      prop.style.removeProperty('--pose-angle');
    });
    bases = props.map<Pose>((prop) => {
      const css = getComputedStyle(prop);
      return [parseFloat(css.getPropertyValue('--x')), parseFloat(css.getPropertyValue('--y')), parseFloat(css.width) / stage.clientWidth * 100, parseFloat(css.getPropertyValue('--angle'))];
    });
    document.body.classList.toggle('scroll-scene', desktop.matches && !reduced.matches);
    widthFactors = props.map((prop, index) => {
      const nominal = parseFloat(getComputedStyle(prop).getPropertyValue('--w'));
      return nominal > 0 ? bases[index][2] / nominal : 1;
    });
    controls.hidden = reduced.matches || mobile;
    drawAnnotations();
  }

  stage.addEventListener('wheel', (event) => {
    if (!desktop.matches || reduced.matches || event.ctrlKey || document.body.classList.contains('panel-is-open') || stage.querySelector('.is-holding')) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    target = Math.max(0, Math.min(2, target + delta / 1300));
    request();
  }, { passive: false });
  button.addEventListener('click', () => {
    target = 0;
    request();
  });
  stage.addEventListener('keydown', (event) => {
    if (event.target !== stage || !desktop.matches || reduced.matches) return;
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    target = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : Math.max(0, Math.min(2, Math.round(target) + (event.key === 'ArrowDown' ? 1 : -1)));
    request();
  });
  window.addEventListener('scroll', () => {
    if (!mobile || reduced.matches || document.body.classList.contains('panel-is-open')) return;
    mobileScroll = scrollY;
    request();
  }, { passive: true });
  window.addEventListener('resize', reset);
  desktop.addEventListener('change', reset);
  reduced.addEventListener('change', reset);
  document.fonts.ready.then(drawAnnotations);
  reset();
}

export function initUno(stage: HTMLElement) {
  const board = stage.querySelector<HTMLElement>('.uno')!;
  const controls = board.querySelector<HTMLElement>('.uno-controls')!;
  const connector = board.querySelector<HTMLButtonElement>('.uno-connector')!;
  const power = board.querySelector<HTMLButtonElement>('.uno-power')!;
  const reset = board.querySelector<HTMLButtonElement>('.uno-reset')!;
  const status = board.querySelector<HTMLElement>('.uno-status')!;
  let armed = false;
  let fried = false;
  let hold = 0;
  let expiry = 0;
  let effect = 0;

  function cancel() {
    clearTimeout(hold);
    hold = 0;
    board.classList.remove('is-holding');
  }

  function disarm() {
    cancel();
    armed = false;
    connector.setAttribute('aria-pressed', 'false');
    board.classList.remove('is-connected');
  }

  function start() {
    if (!armed || fried || hold || document.body.classList.contains('panel-is-open')) return;
    board.classList.add('is-holding');
    hold = window.setTimeout(() => {
      fried = true;
      disarm();
      board.classList.add('is-fried', 'is-frying');
      status.textContent = 'The illustrated board is fried.';
      reset.hidden = false;
      effect = window.setTimeout(() => board.classList.remove('is-frying'), 2450);
    }, 1500);
  }

  connector.addEventListener('click', () => {
    if (fried) return;
    disarm();
    armed = true;
    board.classList.add('is-connected');
    connector.setAttribute('aria-pressed', 'true');
    clearTimeout(expiry);
    expiry = window.setTimeout(disarm, 6500);
  });
  power.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    power.setPointerCapture(event.pointerId);
    start();
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) power.addEventListener(name, cancel);
  power.addEventListener('keydown', (event) => {
    if (![' ', 'Enter'].includes(event.key)) return;
    event.preventDefault();
    if (!event.repeat) start();
  });
  power.addEventListener('keyup', (event) => {
    if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); cancel(); }
  });
  // Leave the board or interrupt the page and an incomplete sequence is discarded.
  board.addEventListener('pointerleave', cancel);
  window.addEventListener('blur', disarm);
  document.addEventListener('visibilitychange', () => { if (document.hidden) disarm(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') disarm(); });
  reset.addEventListener('click', () => {
    clearTimeout(effect);
    clearTimeout(expiry);
    disarm();
    fried = false;
    board.classList.remove('is-fried', 'is-frying');
    status.textContent = '';
    reset.hidden = true;
    connector.focus({ preventScroll: true });
  });
  controls.hidden = false;
}
