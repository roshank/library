# Wonder World 3D

A learning game for five-year-olds. Type a concept such as **T. rex**, **giraffe**,
**Saturn** or **rocket**, and it appears as an animated 3D creature or object you
can spin and zoom, with five short facts read aloud and a two-question quiz that
earns stars and stickers.

No build step, no frameworks, no dependencies. Serve the folder with any static
server and open it in a modern browser.

```sh
npm start            # serves on http://localhost:3000
# or
python3 -m http.server 3000
```

Serve it over HTTP rather than opening the file directly: the mesh worker and
the service worker both need it.

## Live demo

Every push to `main` is published to GitHub Pages by
`.github/workflows/pages.yml` at **https://roshank.github.io/library/**. The
workflow enables Pages on first run; if the deploy step reports that Pages is
not configured, open the repository's Settings → Pages and set the source to
"GitHub Actions", then re-run the workflow. All asset paths are relative, so the
app also works from any other static host (Netlify, Vercel, an S3 bucket) with
no configuration.

## How it works

| Piece | File | Notes |
| --- | --- | --- |
| Recipes | `src/builders.js`, `src/library-*.js` | Every concept is a short list of primitives (ellipsoids, capsules, cones, boxes, tori) with position, scale, colour, material and animation (walk cycle, tail wag, wing flap, bob, spin, orbit). 42 concepts: 13 prehistoric, 16 animals, 6 space, 7 machines and nature. |
| Sculpting | `src/sdf.js`, `src/mesh-worker.js`, `src/model.js` | Creature recipes are fused into **one smooth organic surface**: each primitive becomes a signed-distance field, the fields are blended with smooth-min, and the zero surface is meshed with surface nets in a Web Worker. Normals and ambient occlusion are sampled from the field. Every vertex gets up to four bone weights, so the walk and wag animations deform the body smoothly instead of hinging rigid pieces. Eyes, teeth, claws, machines and planets stay as rigid primitives. |
| Rendering | `src/renderer.js`, `src/primitives.js` | WebGL2 cinematic pipeline: shadow-map pass → HDR multisampled scene pass (Cook-Torrance GGX, hemisphere ambient, glossy sky reflection, subsurface wrap for skin, procedural scales/fur/rock bump detail, cellular giraffe spots, stripes, gas-giant bands, continents, drifting clouds) → bloom → ACES tone mapping and vignette. Sky with sun glow and clouds, or a star field in space; procedural grass, sand, snow, rock, asphalt and animated water ground types. |
| Search | `src/search.js` | Exact, prefix and bigram similarity matching so "velocoraptor" and "trex" still work. |
| Unknown words | `src/mystery.js` | Anything not in the library becomes a deterministic "mystery friend" grown from the word, with facts that encourage the child to go and find out, plus "did you mean" links. |
| Game loop | `src/main.js` | Home → facts → quiz → celebration. Stars and a sticker book persist in `localStorage`. |
| Read aloud | `src/speech.js` | Web Speech API at a slower rate, with a toggle. |

### Adding a concept

Add an entry to one of the `src/library-*.js` files:

```js
{
  id: 'kiwi', name: 'Kiwi Bird', emoji: '🥝', category: 'Animals',
  aliases: ['kiwi', 'kiwi bird'],
  scene: { sky: ['#5c9fe0', '#a3c3df'], ground: '#5f8a3c', groundType: 'grass', sun: [0.4, 0.75, 0.5] },
  material: { skin: 'fur', pattern: 'mottle', rough: 0.78, sss: 0.4 },
  build: () => ground([ sphere([0, 1, 0], [0.9, 0.7, 0.7], '#8b5a2b'), /* ... */ ]),
  facts: ['Kiwi birds cannot fly.', /* 4 more, one idea each */],
  quiz: [{ q: 'Can a kiwi fly?', options: ['No', 'Yes'], answer: 0 }],
}
```

Models face +X, up is +Y, and `ground()` drops the model so its feet rest on
y = 0. Parts flagged `hard: true` (eyes, teeth, claws) are rendered rigid instead
of being fused; `blend` controls how softly a part melts into its neighbours.
Concepts in the Dinosaurs, Animals and Mystery categories are sculpted; others
render as rigid parts unless they set `mesh: 'organic'`. Run `npm run check`
to make sure every recipe still builds.

### Debugging the renderer

Open the page with `?debug` and the renderer is exposed as `window.__renderer`.
Useful knobs: `autoRotate`, `shadows`, `exposure`, `camera.yaw`, and
`debugMode` (1 normals, 2 sun dot product, 3 sun vector).

## Chrome modern web guidance applied

The app follows current web.dev / Chrome guidance for fast, accessible,
installable web apps and sticks to Baseline-supported features, with graceful
fallbacks for the newest ones.

**GPU rendering through Canvas**
- `canvas.getContext('webgl2', { powerPreference: 'high-performance', desynchronized: true, alpha: false })`; desynchronized lets Chrome skip a compositor copy for lower input latency.
- Resolution follows `ResizeObserver` with `device-pixel-content-box`, capped at 1.5× because the post-processing chain makes each pixel cost more.
- One `requestAnimationFrame` loop that pauses when the tab is hidden; context loss handled with `webglcontextlost` / `webglcontextrestored`.
- HDR targets use `EXT_color_buffer_float` when available and fall back to 8-bit; multisampling uses `renderbufferStorageMultisample`.
- Mesh sculpting runs in a module Web Worker and transfers its buffers, so the main thread never blocks.

**Input and layout**
- Pointer Events with `setPointerCapture` for drag-to-rotate and two-finger pinch-to-zoom; `touch-action: none` on the canvas.
- `100dvh`, `env(safe-area-inset-*)` and `viewport-fit=cover` for notched phones; container queries and `clamp()` for fluid type; logical properties for right-to-left readiness.

**Modern platform features with fallbacks**
- View Transitions API animates card changes where supported, with the overlay made click-through so quick taps are never swallowed.
- Native `<dialog>` with `showModal()`, `<datalist>` autocomplete, `<input type="search">` with `enterkeyhint="go"`.
- Web Speech API for read-aloud, hidden when unavailable.
- `prefers-reduced-motion` disables auto-rotate, idle animation, confetti and transitions; `prefers-color-scheme` drives a dark theme through CSS custom properties with `color-scheme` and dual `theme-color` meta tags.

**Performance and delivery**
- Native ES modules, no bundler, no third-party scripts.
- Primitive geometry lives in VAOs created once; per-frame work is a few dozen uniform uploads and one bone-matrix array.
- Service worker with a cache-first app shell for instant repeat loads and offline play; `manifest.webmanifest` with a maskable SVG icon makes it installable.

**Accessibility**
- Real buttons and inputs with 44–48 px targets and visible `:focus-visible` rings.
- Facts and quiz feedback are announced through `aria-live` regions; the canvas has a descriptive label.

## Browser support

Any browser with WebGL2: Chrome and Edge 56+, Firefox 51+, Safari 15+. Older
browsers get a friendly message instead of a blank screen.
