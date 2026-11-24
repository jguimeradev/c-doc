// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  trailingSlash: 'always',
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
  },
});
