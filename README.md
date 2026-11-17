# Wonder World 3D

A learning game for five-year-olds. Type a concept such as **T. rex**, **giraffe**,
**Saturn** or **rocket**, and it appears as an animated 3D character you can spin
and zoom, with five short facts read aloud and a two-question quiz that earns
stars and stickers.

No build step, no frameworks, no dependencies. Open `index.html` through any
static server and it runs.

```sh
npm start            # serves on http://localhost:3000
# or
python3 -m http.server 3000
```

Serve it over HTTP rather than opening the file directly so the service worker
and offline mode work.

## How it works

| Piece | File | Notes |
| --- | --- | --- |
| GPU rendering | `src/renderer.js` | WebGL2 on a `<canvas>`. One shader pair does toon-ish lighting plus procedural patterns (spots, stripes, planet bands, continents, clouds, fire). The CPU only updates one matrix per part per frame. |
| Geometry | `src/primitives.js` | Procedural sphere, box, cylinder, cone, torus and disc. Each is uploaded to a VAO once and reused for every part. |
| Model recipes | `src/builders.js`, `src/library-*.js` | Every concept is a short list of primitives with position, scale, colour and animation (walk cycle, tail wag, wing flap, bob, spin, orbit). |
| Content | `src/library-*.js` | 42 concepts: 13 prehistoric, 16 animals, 6 space, 7 machines and nature. Each has aliases, facts, quiz questions and its own sky and ground colours. |
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
  scene: { sky: ['#8fd3ff', '#f1f8ff'], ground: '#7fc45f' },
  build: () => ground([ sphere([0, 1, 0], [0.9, 0.7, 0.7], '#8b5a2b'), /* ... */ ]),
  facts: ['Kiwi birds cannot fly.', /* 4 more, one idea each */],
  quiz: [{ q: 'Can a kiwi fly?', options: ['No', 'Yes'], answer: 0 }],
}
```

Models face +X, up is +Y, and `ground()` drops the model so its feet rest on
y = 0. Run `npm run check` to make sure every recipe still builds.

## Chrome modern web guidance applied

The app follows the current web.dev / Chrome guidance for fast, accessible,
installable web apps and sticks to Baseline-supported features, with graceful
fallbacks for the newest ones.

**GPU rendering through Canvas**
- `canvas.getContext('webgl2', { powerPreference: 'high-performance', desynchronized: true, alpha: false })`. Desynchronized canvas lets Chrome skip a compositor copy for lower input latency.
- Resolution is driven by `ResizeObserver` with `device-pixel-content-box`, so the backing store matches physical pixels exactly, capped at 2x for battery.
- One `requestAnimationFrame` loop that pauses when the tab is hidden; context loss is handled with `webglcontextlost` / `webglcontextrestored`.
- sRGB colours are linearised before lighting and gamma-encoded on output.

**Input and layout**
- Pointer Events with `setPointerCapture` for drag-to-rotate and two-finger pinch-to-zoom; `touch-action: none` on the canvas so the browser does not fight for the gesture.
- `100dvh`, `env(safe-area-inset-*)` and `viewport-fit=cover` for notched phones.
- Container queries (`cqi` units) size the fact text to the card, and `clamp()` keeps type fluid.
- Logical properties (`margin-inline-start`) for right-to-left readiness.

**Modern platform features with fallbacks**
- View Transitions API animates card changes where supported (`document.startViewTransition`), and simply swaps content elsewhere.
- Native `<dialog>` with `showModal()` for the celebration screen, `<datalist>` for autocomplete, `<input type="search">` with `enterkeyhint="go"`.
- Web Speech API for read-aloud, hidden when unavailable.
- `prefers-reduced-motion` disables auto-rotate, idle animation, confetti and transitions; `prefers-color-scheme` drives a dark theme through CSS custom properties, with `color-scheme` and dual `theme-color` meta tags.

**Performance and delivery**
- Native ES modules, no bundler, no third-party scripts; the whole app is a handful of small files.
- Geometry lives in VAOs created once; per-frame work is a few dozen uniform uploads.
- Service worker with a cache-first app shell for instant repeat loads and full offline play; `manifest.webmanifest` with a maskable SVG icon makes it installable.

**Accessibility**
- All controls are real buttons and inputs with 44–48 px targets and visible `:focus-visible` rings.
- Facts and quiz feedback are announced through `aria-live` regions; the canvas has a descriptive label.
- High-contrast text on translucent cards, and no information conveyed by colour alone.

## Browser support

Any browser with WebGL2: Chrome and Edge 56+, Firefox 51+, Safari 15+. Older
browsers get a friendly message instead of a blank screen.
