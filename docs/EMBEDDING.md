# Embedding the Area map on another site

Any website can render the C.A. Area map by adding a container element and one
script tag:

```html
<div id="ca-area-map"></div>
<script src="https://cawscit.github.io/area-maps/embed.js"></script>
```

That is the whole integration. The script finds `#ca-area-map`, renders the map
into it, and injects its own styles. There is no stylesheet to include, no
build step, and no framework requirement on the host site.

## Options

Settings are read from `data-*` attributes on the container. The same
attributes can be put on the `<script>` tag instead to set a default for every
map on the page.

| Attribute       | Default       | Description                                                                                  |
| --------------- | ------------- | -------------------------------------------------------------------------------------------- |
| `data-height`   | `600px`       | Height of the map. Any CSS length. Use `auto` to size it entirely from your own CSS.         |
| `data-header`   | `true`        | Set to `false` to hide the green C.A. header bar and its "Load all meetings" button.         |
| `data-meetings` | `false`       | Set to `auto` to fetch and plot meeting locations on load instead of waiting for the button. |
| `data-target`   | `ca-area-map` | **Script tag only.** Element id or CSS selector to mount into.                               |

```html
<div
  id="ca-area-map"
  data-height="70vh"
  data-header="false"
  data-meetings="auto"
></div>
<script src="https://cawscit.github.io/area-maps/embed.js"></script>
```

## JavaScript API

The script also exposes `window.CAAreaMap`, for pages that build their markup
dynamically or want more than one map:

```js
const map = CAAreaMap.render('#my-container', {
  height: '400px',
  header: false,
  meetings: 'auto',
});

map.unmount(); // tear it down again
```

- `CAAreaMap.render(target, options)` — `target` is an element, element id, or
  CSS selector. Returns `{ element, unmount() }`, or `null` if the target was
  not found. Options take priority over `data-*` attributes.
- `CAAreaMap.autoMount()` — mount into the default container.
- `CAAreaMap.areas` — the raw Area GeoJSON `FeatureCollection`, if you want to
  do your own lookups against it.

## Notes for integrators

- **Size.** `embed.js` is ~815 KB (~273 KB gzipped) because the Area GeoJSON
  and Leaflet are bundled into it. Load it at the bottom of the page, or with
  `defer`, so it does not block rendering.
- **Styles are contained.** Every selector the embed injects is rewritten at
  build time to only match inside `.ca-area-map-embed`, so Tailwind's reset,
  its utilities and Leaflet's stylesheet cannot restyle the host page.
- **The reverse is not guaranteed.** Host CSS can still reach into the embed by
  inheritance, and a host rule whose class name collides with a Tailwind
  utility the map uses (`.flex`, `.border`, `.rounded`, …) will apply its other
  declarations to our markup. The visible surfaces are pinned defensively, but
  if a host theme is aggressive enough, an `<iframe>` pointed at
  <https://cawscit.github.io/area-maps/> is the fully isolated alternative.
- **Third-party requests.** The map loads OpenStreetMap tiles, the C.A. logo
  from `cawscit.github.io`, and — only when meetings are shown — the C.A.
  meetings API. A host `Content-Security-Policy` has to allow those.
- **Calling it twice** on the same container replaces the existing map rather
  than stacking a second one.

## How it is built and deployed

- `src/embed.jsx` is the entry point. It renders the same `GeoMapComponent`
  the GitHub Pages app uses, with `fill` set so the map sizes to the host's
  container instead of the viewport.
- `vite.embed.config.js` builds it into a single IIFE. It scopes and inlines
  the stylesheet, and rewrites asset URLs so they resolve against wherever
  `embed.js` itself is served from.
- `npm run build:embed` produces `dist/embed.js`;
  `npm run build:all` runs the site build and the embed build together.
- The **Deploy to GitHub Pages** workflow runs both builds on every push to
  `main`, so `embed.js` is regenerated and published automatically.

## Testing it locally

```bash
npm run build:all
npm run preview
```

Then open <http://localhost:4173/area-maps/embed-demo.html>. That page
(`public/embed-demo.html`) mounts three maps with different options inside a
deliberately hostile host stylesheet, so you can confirm both that the embed
renders and that it leaves the surrounding page alone.
