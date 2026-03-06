# p5.book — ideas & suggestions

These are ideas for improving the library. Nothing is implemented here — just
design thinking for future consideration, roughly ordered by impact.


## 2. PNG output option alongside JPEG

**Problem:** `addPage()` encodes every page as JPEG at 0.92 quality. JPEG
introduces compression artifacts that are visible on flat-colour or
typographic pages — exactly the content books tend to have.

**Impact:** Print shops warn against JPEG for spot colours and fine text.

**Idea:** Let the user choose encoding:

```js
book = createBook(5, 8, 12, { imageType: "png" }); // lossless
book = createBook(5, 8, 12, { jpegQuality: 0.98 });
```

PNG is larger but lossless; a quality slider (0–1) for JPEG would also help.

---

## 3. spine Proxy is re-evaluated on every property access

**Problem:** The spine is a `Proxy` that creates `_spineGfx` lazily on the
first property access. But the check `if (!_self._spineGfx)` runs on _every_
property access (including reads inside `draw()`). This is harmless but adds
unnecessary overhead for books that use the spine heavily.

**Idea:** After `_spineGfx` is created, swap the proxy for the actual
`p5.Graphics` object directly (or use a simple flag so the Proxy
short-circuits after first creation).

---

## 4. `addPage()` promise chain grows linearly

**Problem:** Each `addPage()` call chains a new `.then()` onto
`this._pageQueue`. For a 200-page book this creates a 200-node promise chain.
It works but keeps 200 closures alive simultaneously.

**Idea:** Replace the chained promise queue with a simple async FIFO that lets
each page complete before queueing the next — or use a short `await
new Promise(rAF)` helper without chaining on the outer object:

```js
// instead of chaining onto this._pageQueue:
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

**Idea:** Check `this._rtl` and set `ctx.direction = "rtl"` on the p5 drawing
context before calling `p.text()`, then restore. Also flip column order so
column 0 is on the right.

---

## 6. Cache edge textures in the 3D viewer

**Problem:** Every time `render3D()` is called (on mode switch, every bleed
toggle, every time the spine changes), three `_makePageEdge()` calls each
create a `<canvas>`, paint stripes, and call `.toDataURL()`. Each is O(w×h).

**Idea:** Memoize by `(w, h, color, axis)` key. A simple `Map` with a string
key keeps stale results out of memory and avoids thrashing for common sequences
like bleed toggle.

---

## 7. 3D viewer: one color picker controls all three edges

**Problem:** The "edge & paper" color picker in the 3D viewer GUI updates all
three edges simultaneously. But `set3DEdgeColor([r, t, b])` supports
per-edge colors. The GUI doesn't expose this — visual configurations set via
`set3DEdgeColor([...])` are immediately over-written if the user touches the
picker.

**Idea:** Either add three separate pickers (fore-edge / top / bottom), or
initialize the single picker from the _fore-edge_ value and apply it to all
three consistently.

---

## 8. Keyboard shortcut cheat sheet in the viewer

**Problem:** The viewer responds to ← / → arrow keys for flipbook navigation
but there is no visible hint about this.

**Idea:** A small `?` icon in the toolbar that shows a popover / tooltip:

| key       | action               |
| --------- | -------------------- |
| `←` / `→` | previous / next page |
| `G`       | toggle grid view     |
| `3`       | toggle 3D view       |

---

## 9. Viewer toolbar button to copy `book.progress` value / page number

Designers composing generative books often want to screenshot a specific page
and note which parameters produced it. A "copy page info" button in the toolbar
(or a click-to-copy on the page info panel) would speed up that loop.

---

## 10. `book.exportFrames(format)` — frame sequence for compositing

**Problem:** There is no way to get individual high-res page images without
going through the PDF.

**Idea:** Add `book.exportFrames("png")` or `"jpeg"` which triggers a ZIP
download of all raw captured canvases. Could hook into the existing
`_rawCanvases[]` array. Useful for users who want to hand the pages to
InDesign, Affinity, or Figma.

---

## 11. Async `setup()` — document the pattern more prominently

**Problem:** Many creative uses (fetch text, load fonts, load images) require
`async setup()`. This works fine in p5.js 2.x but is not mentioned in the
p5.book docs.

**Idea:** Add an explicit quick-start example or an `async` tip in the docs.
Example 08 (text-flow) already uses it, but it's easy to miss.

---

## 12. Responsive viewer layout for narrow screens

**Problem:** The 3D control panel is `position: absolute; right: 0; bottom: 0`
and overlaps the book model on small viewports (laptops, tablets in portrait).

**Idea:** Below a breakpoint (~600 px wide), collapse the controls into a
bottom drawer or let the panel scroll alongside the 3D scene.

---

## 13. `createBook` — allow omitting totalPages more naturally

**Problem:** When `totalPages` is not known, the user must pass `null` or rely
on the fact that anything non-number is treated as the filename arg. This is
a bit implicit.

**Idea:** Document the `book = createBook("A5")` pattern (no total pages, no
filename) explicitly and add a small guard so passing `undefined` clearly
means "unknown count" rather than accidentally triggering filename parsing.

---

## 14. `book.page` is mutable — make it read-only

**Problem:** `book.page` is a plain property. Nothing stops a sketch from
accidentally writing `book.page = 5`, which would break the page counter and
progress calculations silently.

**Idea:** Expose it as a getter only:

```js
get page() { return this._page; }
```

Same for `pageNumber`, `totalPages`, `bleedWidth`, `bleedHeight`, `progress`.

---

## 15. Tighter CSS isolation for viewer styles

**Problem:** Viewer CSS is injected globally into `document.head`. Rules like
`.p5book-viewer button` could match buttons outside the viewer if someone
inspects or extends the DOM structure.

**Idea:** Use the `:where(.p5book-viewer)` selector to keep specificity low
and prevent leaking into host-page styles, or use a CSS Shadow DOM /
`CSSStyleSheet.replace()` with `@scope` (Chrome 118+).

---

## 16. Progress bar during PDF encoding is per-promise, not per-rAF paint

**Problem:** The progress bar updates via `rAF`, which only fires when the
browser actually paints. On machines where jsPDF JPEG encoding takes longer
than one frame, the browser "freezes" between rAF ticks and the bar appears
to stall — even though encoding is progressing.

**Idea:** Move the heavy JPEG encode + `pdf.addImage()` calls into a Web Worker
using `OffscreenCanvas`. The worker posts progress events; the main thread
updates the bar smoothly. This would also unblock the main thread so the
sketch stays responsive.

---

## 17. `bleed` proxy silently ignores calls before `setBleed()`

**Problem:** If a user writes `book.bleed.background(220)` without having
called `setBleed()`, nothing happens and there is no warning. This is
intentional (convenience), but it can mask misconfigurations.

**Idea:** In development mode (or always), log a one-time `console.warn` the
first time `book.bleed` is accessed without bleed being set. Flag with
`this._bleedWarnedOnce` to avoid spam.

---

## 18. 3D viewer shadow is a static gradient, not responsive to lighting angle

**Problem:** The drop shadow ellipse below the book uses a fixed opacity based
on `sin(rotX)` but doesn't shift in position or shape when the book tilts.
On large rotX values the shadow looks detached.

**Idea:** Offset the shadow `translateX` by a function of `rotY` and scale its
width by `cos(rotX)`, so it behaves more like a contact shadow.

---

## 19. Export viewer state as URL hash / permalink

For web-based demos / shareable sketches, encoding `mode`, `current` page, and
basic 3D settings (rotY, spinSpeed, size) into the URL `#hash` would let users
share a link to a specific view. Read them back on load with
`URLSearchParams(location.hash.slice(1))`.
