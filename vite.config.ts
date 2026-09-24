import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { legacyJs, legacyCss } from './vite.legacy';

export default defineConfig({
  plugins: [react(), legacyJs(), viteSingleFile()],
  css: {
    postcss: { plugins: [legacyCss()] },
  },
  build: {
    // La minification JS (cible ES5) est faite par legacyJs()
    minify:        false,
    cssMinify:     'esbuild',
    // esbuild réécrit `inset`, etc. pour Safari 9
    cssTarget:     'safari9',
    modulePreload: false,
    rollupOptions: {
      output: { format: 'iife' },
    },
  },
});
