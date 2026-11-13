// Public user site: repository kt-fr.github.io is served from the domain root.
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://kt-fr.github.io',
  server: { host: '127.0.0.1', port: 4321 },
});
