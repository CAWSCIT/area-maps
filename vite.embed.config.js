import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import postcss from 'postcss';

/**
 * Build config for the embeddable script (`npm run build:embed`).
 *
 * Produces a single self-contained `dist/embed.js` that third-party sites can
 * drop onto a page. The GitHub Pages app is built separately by
 * vite.config.js and is not affected by anything in here.
 */

/** Class added to the host's container element by src/embed.jsx. */
const SCOPE = '.ca-area-map-embed';

/** Where embed.js is published, used only as a last-resort asset fallback. */
const PUBLISHED_BASE = 'https://cawscit.github.io/area-maps/';

/**
 * Resolved once, synchronously, while embed.js is executing — that is the only
 * time `document.currentScript` is meaningful. Everything the bundle loads
 * later (the C.A. logo) is resolved against it, so the same embed.js works
 * from GitHub Pages, from a local `npm run preview`, or from a mirror, with no
 * hard-coded origin.
 */
const BASE_RUNTIME_SNIPPET =
  `window.__caAreaMapBase=(function(){try{` +
  `var s=document.currentScript&&document.currentScript.src;` +
  `return s?s.slice(0,s.lastIndexOf('/')+1):'';` +
  `}catch(e){return '';}})();\n`;

/**
 * Rewrite every selector so it only matches inside our own container.
 *
 * The embed injects its stylesheet into a page we do not control. Without
 * this, Tailwind's preflight reset, its utilities (`.container`, `.border`,
 * `.flex`, …) and Leaflet's stylesheet would all be loose on the host's
 * markup and would restyle their site.
 */
const scopeSelector = (selector) => {
  const trimmed = selector.trim();

  // Our own reset already targets the container.
  if (trimmed === SCOPE || trimmed.startsWith(`${SCOPE} `)) return trimmed;

  // Document-level selectors become the container: theme variables and
  // preflight's root rules should apply to our subtree, nothing wider.
  if (['html', 'body', ':root', ':host'].includes(trimmed)) return SCOPE;

  return `${SCOPE} ${trimmed}`;
};

const scopeCssPlugin = () => {
  const seen = new WeakSet();

  return {
    postcssPlugin: 'ca-scope-css',
    Rule(rule) {
      if (seen.has(rule)) return;
      seen.add(rule);

      // Keyframe steps ("from", "50%") are not selectors.
      const parent = rule.parent;
      if (parent?.type === 'atrule' && /keyframes$/.test(parent.name)) return;

      // `:root, :host` both collapse onto the container — dedupe the result.
      rule.selectors = [...new Set(rule.selectors.map(scopeSelector))];
    },
  };
};
scopeCssPlugin.postcss = true;

/**
 * Lib-style builds emit CSS as a separate file, which would force embedders to
 * add a second <link>. Scope the stylesheet, then fold it into the bundle and
 * inject it at runtime, so `embed.js` is the only thing anyone has to include.
 */
function scopeAndInjectCss() {
  return {
    name: 'ca-scope-and-inject-css',
    apply: 'build',
    enforce: 'post',
    async generateBundle(_options, bundle) {
      let css = '';

      for (const [fileName, asset] of Object.entries(bundle)) {
        if (asset.type === 'asset' && fileName.endsWith('.css')) {
          css += asset.source;
          delete bundle[fileName];
        }
      }

      if (!css) return;

      const scoped = await postcss([scopeCssPlugin()]).process(css, {
        from: undefined,
      });

      const entry = Object.values(bundle).find(
        (chunk) => chunk.type === 'chunk' && chunk.isEntry
      );

      if (!entry) {
        this.warn('No entry chunk found; embed styles were not injected.');
        return;
      }

      // Guarded so a host page's CSP, or a duplicated <script> tag, degrades
      // gracefully instead of throwing before the map renders.
      entry.code =
        BASE_RUNTIME_SNIPPET +
        `(function(){try{` +
        `if(document.querySelector('style[data-ca-area-map]'))return;` +
        `var s=document.createElement('style');` +
        `s.setAttribute('data-ca-area-map','');` +
        `s.textContent=${JSON.stringify(scoped.css)};` +
        `(document.head||document.documentElement).appendChild(s);` +
        `}catch(e){console.error('[ca-area-map] failed to inject styles',e);}})();\n` +
        entry.code;
    },
  };
}

export default defineConfig({
  // An embed runs on somebody else's origin, so a relative asset URL would
  // resolve against the host's site. Asset URLs are rewritten to resolve at
  // runtime instead (see experimental.renderBuiltUrl); this is only the
  // fallback baked in for the rare case that cannot be rewritten.
  base: PUBLISHED_BASE,
  plugins: [react(), tailwindcss(), scopeAndInjectCss()],
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      // CSS cannot run code; all CSS-referenced assets are inlined anyway.
      if (hostType !== 'js') return PUBLISHED_BASE + filename;

      return {
        runtime: `(window.__caAreaMapBase||${JSON.stringify(
          PUBLISHED_BASE
        )})+${JSON.stringify(filename)}`,
      };
    },
  },
  build: {
    // Keep the GitHub Pages build that ran before us.
    emptyOutDir: false,
    // One stylesheet, which scopeAndInjectCss() then folds into embed.js.
    cssCodeSplit: false,
    // Inline the small assets (Leaflet's control sprites) so embed.js is
    // effectively self-contained. The C.A. logo is a 1.2 MB traced SVG and is
    // deliberately left as a separate request against `base` above — base64ing
    // it would add ~1.7 MB to every embed.
    //
    // Note: this is why the embed is NOT built with Vite's `build.lib` mode,
    // which ignores assetsInlineLimit and inlines every asset regardless.
    assetsInlineLimit: 100 * 1024,
    rollupOptions: {
      input: fileURLToPath(new URL('src/embed.jsx', import.meta.url)),
      output: {
        format: 'iife',
        entryFileNames: 'embed.js',
        // Everything in one file — embedders include a single <script>.
        inlineDynamicImports: true,
      },
    },
  },
});
