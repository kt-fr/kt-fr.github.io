import { initScene, initUno } from './scene';

export function initBench() {
  const stage = document.querySelector<HTMLElement>('.workbench');
  if (!stage) return;
  const greeting = stage.querySelector<HTMLElement>('[data-greeting]');
  function updateGreeting() {
    const hour = new Date().getHours();
    if (greeting) greeting.textContent = hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 17 ? 'Good afternoon' : 'Good evening';
  }
  updateGreeting();
  window.setInterval(updateGreeting, 60_000);
  const panels = [...document.querySelectorAll<HTMLDialogElement>('.bench-panel')];
  if (!panels.length || typeof panels[0].showModal !== 'function') return;
  let opener: HTMLElement | null = null;
  // Clicking a scrapbook object adds a little handwritten line about that
  // interest. The full About note remains readable without JavaScript.
  const interests: Record<string, string> = {
    dumbbells: "The gym is where I put the screens away, clear my head, and focus on the next rep.",
    football: "Football's my favourite excuse for a turf session with friends.",
    volleyball: "Volleyball is the kind of game where 'one last set' somehow turns into three.",
    helmet: "Sometimes all I need is a bike ride with no particular destination.",
    shuttle: "A badminton game is always a good idea.",
    knight: "Chess is my other way of losing track of time.",
    paddles: "I'm always down for an unplanned table-tennis game.",
    screwdriver: "There's usually some assembling, fixing, and starting over involved.",
    jetson: "I've spent a lot of time getting cameras, code, and actual hardware to work together.",
    uno: "Sometimes it takes a few wiring mistakes before things finally work.",
  };

  function open(id: string, source: HTMLElement | null) {
    const panel = panels.find((item) => item.id === id);
    if (!panel) return;
    const interestNote = panel.querySelector<HTMLElement>('[data-interest-note]');
    if (interestNote) {
      const message = source?.dataset.interest ? interests[source.dataset.interest] : undefined;
      interestNote.textContent = message ?? '';
      interestNote.hidden = !message;
    }
    for (const item of panels) if (item.open) item.close();
    opener = source;
    panel.showModal();
    document.body.classList.add('panel-is-open');
  }

  for (const panel of panels) {
    panel.close();
    const close = panel.querySelector<HTMLButtonElement>('[data-panel-close]');
    if (close) {
      close.hidden = false;
      close.addEventListener('click', () => panel.close());
    }
    panel.addEventListener('click', (event) => {
      const rect = panel.getBoundingClientRect();
      if (event.target === panel && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) panel.close();
    });
    panel.addEventListener('close', () => {
      if (panels.some((item) => item.open)) return;
      document.body.classList.remove('panel-is-open');
      opener?.focus({ preventScroll: true });
    });
  }

  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-panel]')) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      open(link.dataset.panel!, link);
    });
  }
  document.body.classList.add('bench-enhanced');
  initScene(stage);
  initUno(stage);
  const initial = location.hash.slice(1);
  if (panels.some((panel) => panel.id === initial)) open(initial, null);
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (panels.some((panel) => panel.id === id)) open(id, null);
  });
}
