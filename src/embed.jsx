/*
 * Entry point for the embeddable build.
 *
 * Built by `npm run build:embed` into a single self-contained `dist/embed.js`
 * (IIFE, styles injected at runtime, Area GeoJSON bundled in) so any site can
 * drop in:
 *
 *   <div id="ca-area-map"></div>
 *   <script src="https://cawscit.github.io/area-maps/embed.js"></script>
 *
 * This file is additive — the GitHub Pages app still builds from main.jsx and
 * is unaffected.
 */

import './embed.css';
import { createRoot } from 'react-dom/client';

import Areas from './areas/Areas.json';
import GeoMapComponent from './GeoMapComponent.jsx';

const DEFAULT_TARGET = 'ca-area-map';
const DEFAULT_HEIGHT = '600px';
const CONTAINER_CLASS = 'ca-area-map-embed';
const ROOT_KEY = '__caAreaMapRoot';

// `document.currentScript` is only meaningful while the bundle is first
// evaluated, so capture it now to read the <script> tag's data-* attributes.
const hostScript = document.currentScript;

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return !['false', '0', 'no', 'off'].includes(String(value).toLowerCase());
};

const resolveElement = (target) => {
  if (!target) return null;
  if (typeof target !== 'string') return target;

  // Accept a CSS selector ("#map", ".map") or a bare element id ("ca-area-map").
  if (/^[#.[]/.test(target)) return document.querySelector(target);
  return document.getElementById(target) || document.querySelector(target);
};

/**
 * Settings come from (highest priority first): the options argument, data-*
 * attributes on the container, then data-* attributes on the <script> tag.
 */
const resolveOptions = (element, options) => {
  const attr = (name) =>
    element?.dataset?.[name] ?? hostScript?.dataset?.[name] ?? undefined;

  return {
    height: options.height ?? attr('height') ?? DEFAULT_HEIGHT,
    showHeader: parseBoolean(options.header ?? attr('header'), true),
    autoLoadMeetings: parseBoolean(options.meetings ?? attr('meetings'), false),
  };
};

/**
 * Render the Area map into an element.
 *
 * @param {string|Element} target Element, element id, or CSS selector.
 * @param {object} [options] `height`, `header`, `meetings` — see resolveOptions.
 * @returns {{element: Element, unmount: () => void}|null}
 */
function render(target, options = {}) {
  const element = resolveElement(target);

  if (!element) {
    console.warn(
      `[ca-area-map] No element found for "${target}". Add <div id="${DEFAULT_TARGET}"></div> to the page.`
    );
    return null;
  }

  // Re-rendering into the same element should replace, not stack, the map.
  if (element[ROOT_KEY]) element[ROOT_KEY].unmount();

  const settings = resolveOptions(element, options);

  element.classList.add(CONTAINER_CLASS);
  if (settings.height !== 'auto') element.style.height = settings.height;

  const root = createRoot(element);
  element[ROOT_KEY] = root;

  root.render(
    <GeoMapComponent
      initialData={Areas}
      fill
      showHeader={settings.showHeader}
      autoLoadMeetings={settings.autoLoadMeetings}
    />
  );

  return {
    element,
    unmount: () => {
      root.unmount();
      delete element[ROOT_KEY];
      element.classList.remove(CONTAINER_CLASS);
    },
  };
}

/** Mount into the default container (or whatever `data-target` points at). */
function autoMount() {
  const target = hostScript?.dataset?.target || DEFAULT_TARGET;
  return render(target);
}

// Public API for host pages that build their markup dynamically or need to
// mount more than one map. Assigned explicitly rather than relying on the
// bundler's IIFE export, which an app-mode build tree-shakes away.
window.CAAreaMap = { render, autoMount, areas: Areas };

if (document.readyState === 'loading') {
  // The script may be in <head>, i.e. ahead of the container in the document.
  document.addEventListener('DOMContentLoaded', autoMount, { once: true });
} else {
  autoMount();
}
