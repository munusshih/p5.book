# p5.book — ideas & suggestions

Design thinking for future consideration, roughly ordered by impact.
Items marked **✅ done** are already implemented in the library.

---

## 1. ✅ done — docs infrastructure (completed this session)

The documentation site was migrated to **Astro** with the following
improvements made:

- MDX source files (`src/pages/index.mdx`, `src/pages/workshop/worksheet.mdx`)
  replace the old hand-written HTML
- Shared `Base.astro` layout eliminates HTML-shell duplication between the Doc
  and Worksheet layouts
- CSS split into `base.css` (design tokens + reset + shared elements),
  `doc.css` (docs-specific), and `worksheet.css` (workshop-specific) — raw hex
  values replaced with CSS custom properties throughout
- `@/` path alias maps to `src/` in both Vite config and `tsconfig.json`
- Custom Astro plugin serves `/p5.book.js` from the repo root in dev and copies
  it to `dist/` on build, so local sketches use the same absolute path as the
  CDN version
- `src/env.d.ts` added for Astro TypeScript support
- `package.json` updated with `private: true` and `engines: { node: ">=18" }`

---

## 2. ✅ done — PNG output option alongside JPEG

`createBook()` already accepts `{ imageType: "png" }` and `{ jpegQuality }`.
The docs should make this more prominent with a dedicated example.

---

## 3. Spine Proxy re-evaluates on every property access

**Problem:** The spine is a `Proxy` that creates `_spineGfx` lazily on the
first property access. But the check `if (!_self._spineGfx)` runs on _every_
property access (including reads inside `draw()`). This adds unnecessary
overhead for books that use the spine heavily.

**Idea:** After `_spineGfx` is created, swap the proxy for the actual
`p5.Graphics` object directly (or use a simple flag so the Proxy
short-circuits after first creation).

---

## 4. `addPage()` promise chain grows linearly

**Problem:** Each `addPage()` call chains a new `.then()` onto
`this._pageQueue`. For a 200-page book this creates a 200-node promise chain.
It works but keeps 200 closures alive simultaneously.

**Idea:** Replace the chained promise queue with a simple async FIFO:

```js
async _enqueuePageWork(fn) {
  await this._pageQueue;
  this._pageQueue = fn(); // fn returns a new settled promise
}
```

---

## 5. `textBox()` does not support RTL text

**Problem:** `textBox()` always lays text left-to-right, even when
`book.setDirection("rtl")` is active. Arabic / Hebrew / Persian text will
appear mirrored.

**Idea:** Check `this._rtl` and set `ctx.direction = "rtl"` on the canvas
context before calling `p.text()`, then restore. Also flip column order so
column 0 is on the right.

---

## 6. Cache edge textures in the 3D viewer

**Problem:** Every time `render3D()` is called, three `_makePageEdge()` calls
each create a `<canvas>`, paint stripes, and call `.toDataURL()`. Each is
O(w×h), and it happens on every mode switch or bleed toggle.

**Idea:** Memoize by `(w, h, color, axis)` key. A simple `Map` with a string
key avoids thrashing for common sequences like bleed toggle.

---

## 7. 3D viewer: one color picker controls all three edges

**Problem:** The "edge & paper" color picker updates all three edges
simultaneously, but `set3DEdgeColor([r, t, b])` supports per-edge colors.
Any `set3DEdgeColor([...])` call is immediately overwritten if the user
touches the picker.

**Idea:** Either add three separate pickers (fore-edge / top / bottom), or
initialize the single picker from the _fore-edge_ value and apply it
consistently to all three.

---

## 8. ✅ done — Keyboard shortcut cheat sheet in the viewer

A `?` button opens a keyboard-shortcuts dialog. Arrow keys, `G`, `3`, etc. are
all documented. No further work needed.

---

## 9. Viewer toolbar button to copy page info

Designers composing generative books often want to screenshot a specific page
and note which parameters produced it. A "copy page info" button (or
click-to-copy on the page info panel) would speed up that loop.

---

## 10. ✅ done — `book.exportFrames(format)` — frame sequence for compositing

`exportFrames("png")` and `exportFrames("jpeg")` are already implemented and
exposed in the viewer's export dropdown. No further work needed.

---

## 11. Document `async setup()` more prominently

**Problem:** Many creative uses (fetch text, load fonts, load images) require
`async setup()`. This works fine in p5.js 2.x but is not mentioned in the
p5.book docs.

**Idea:** Add an explicit quick-start example or an `async` tip. Example 08
(text-flow) already uses it, but it is easy to miss.

---

## 12. Responsive viewer layout for narrow screens

**Problem:** The 3D control panel is `position: absolute; right: 0; bottom: 0`
and overlaps the book model on small viewports (laptops, tablets in portrait).

**Idea:** Below ~600 px, collapse the controls into a bottom drawer or let the
panel scroll alongside the 3D scene.

---

## 13. Allow omitting `totalPages` more naturally

**Problem:** When `totalPages` is not known, the user must pass `null` or rely
on implicit filename-argument parsing. This is a bit surprising.

**Idea:** Document the `book = createBook("A5")` pattern explicitly and add a
guard so passing `undefined` clearly means "unknown count".

---

## 14. Make `book.page` (and related props) read-only

**Problem:** `book.page` is a plain property. Writing `book.page = 5` would
break the page counter and progress calculations silently.

**Idea:** Expose as getters only: `page`, `pageNumber`, `totalPages`,
`bleedWidth`, `bleedHeight`, `progress`.

---

## 15. Tighter CSS isolation for viewer styles

**Problem:** Viewer CSS is injected globally into `document.head`. Rules like
`.p5book-viewer button` could match buttons outside the viewer.

**Idea:** Use `:where(.p5book-viewer)` selectors to keep specificity low, or
adopt `@scope` (Chrome 118+) / a CSS Shadow DOM approach.

---

## 16. Move JPEG encoding to a Web Worker

**Problem:** The progress bar updates via `rAF`. On machines where jsPDF
encoding takes longer than one frame, the browser freezes between ticks and
the bar appears to stall.

**Idea:** Move JPEG encode + `pdf.addImage()` calls into a Web Worker using
`OffscreenCanvas`. The worker posts progress events; the main thread updates
the bar smoothly.

---

## 17. Warn once when `book.bleed` is accessed without `setBleed()`

**Problem:** Writing `book.bleed.background(220)` without calling `setBleed()`
silently does nothing and can mask misconfigurations.

**Idea:** Log a one-time `console.warn` the first time `book.bleed` is accessed
without bleed being enabled, guarded by `this._bleedWarnedOnce`.

---

## 18. 3D viewer shadow does not respond to tilt angle

**Problem:** The drop shadow ellipse uses fixed opacity based on `sin(rotX)`
but does not shift in position or shape when the book tilts.

**Idea:** Offset shadow `translateX` by a function of `rotY` and scale its
width by `cos(rotX)` to behave more like a contact shadow.

---

## 19. Export viewer state as URL hash / permalink

Encoding `mode`, current page, and basic 3D settings (`rotY`, `spinSpeed`,
`size`) into the URL `#hash` would let users share a link to a specific view.
Read back on load with `URLSearchParams(location.hash.slice(1))`.
