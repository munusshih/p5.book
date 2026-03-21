# p5.book

A simple PDF book generator for [p5.js 2.0](https://p5js.org).  
Turn your generative sketches into real, multi-page PDFs — no build tools, no npm, just `<script>` tags.

## Start Here

- [Step-by-step workshop guide](https://p5-book.vercel.app/workshop/)
- [Docs index](https://p5-book.vercel.app/)
- [Starter sketch (p5 editor)](https://editor.p5js.org/munusshih/sketches/u8Ox1CmnM)

## Setup

Add these three scripts to your HTML, **in order**:

```html
<!-- 1. p5.js 2.0 -->
<script src="https://cdn.jsdelivr.net/npm/p5@2/lib/p5.min.js"></script>

<!-- 2. jsPDF (required by p5.book) -->
<script src="https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js"></script>

<!-- 3. p5.book -->
<script src="https://cdn.jsdelivr.net/gh/munusshih/p5.book@main/p5.book.js?v=2"></script>
```

## Quick Start

If you want to start fast, open the starter sketch above and remix it.

```js
let book;

function setup() {
  // 5×8 inch book, 10 pages — canvas auto-created with correct aspect ratio
  book = createBook(5, 8, 10);

  // or use a named size:
  // book = createBook("A5", 10);
}

function draw() {
  // background fades from black to white across the book
  background(lerp(0, 255, book.progress));

  if (book.isFirstPage()) {
    fill(255);
    text("My Book", 50, 50);
  } else if (book.isLastPage()) {
    fill(0);
    text("The End", 50, 50);
  } else {
    fill(0);
    text("Page " + book.pageNumber, 50, 50);
  }

  // capture this frame — PDF downloads automatically on the last page
  book.addPage();
}
```

That's it! Run your sketch — it will loop through all pages and download **book.pdf** when done.

## How It Works

Each call to `draw()` produces one page.  
`book.addPage()` captures the canvas and adds it to the PDF.  
After the last page, the PDF is saved and the sketch stops automatically.

```
setup()  →  createBook(w, h, pages)
draw()   →  [draw your art]  →  book.addPage()  →  repeat...  →  PDF saved!
```

## API

### `createBook(...)` — two ways to use it

**Option A — named paper size:**

```js
book = createBook("A4", 10); // A4, 10 pages
book = createBook("A5", 10, "zine.pdf"); // A5, custom filename
book = createBook("letter", 20); // US letter
```

Supported names (case-insensitive): `A3` `A4` `A5` `A6` `letter` `legal` `tabloid` — any format [jsPDF knows](https://raw.githack.com/MrRio/jsPDF/master/docs/jsPDF.html).

**Option B — custom dimensions:**

```js
book = createBook(5, 8, 20); // 5×8 inches (default unit)
book = createBook(15, 20, 20, "cm"); // 15×20 cm
book = createBook(150, 200, 20, "mm"); // 150×200 mm
book = createBook(5, 8, 20, "in", "zine"); // with custom filename
```

You can also pass an **options object** as the last argument:

```js
book = createBook(5, 8, 20, { imageType: "png" }); // lossless PNG (larger file)
book = createBook(5, 8, 20, { jpegQuality: 0.98 }); // JPEG quality 0–1 (default 0.92)
book = createBook(5, 8, 20, { progressBar: true }); // full-screen overlay instead of corner counter
```

| Unit   | Description      |
| ------ | ---------------- |
| `"in"` | Inches (default) |
| `"cm"` | Centimeters      |
| `"mm"` | Millimeters      |
| `"px"` | Pixels           |
| `"pt"` | Points           |

### `book.addPage()`

Capture the current canvas as the next page. Call this **once at the end of `draw()`**.

```js
function draw() {
  // ... your drawing code ...
  book.addPage(); // always last
}
```

### `book.page`

Current page index, **0-based**. The first page is `0`.

### `book.pageNumber`

Current page number, **1-based**. Easier to display to readers.

```js
text("Page " + book.pageNumber, 20, 20); // shows "Page 1", "Page 2", ...
```

### `book.totalPages`

The total number of pages you passed to `createBook()`.

### `book.progress`

A number from `0.0` (first page) to `1.0` (last page). Perfect for animations or colors that gradually evolve across the whole book.

```js
// background gets lighter page by page
background(lerp(0, 255, book.progress));

// shape grows across the book
circle(width / 2, height / 2, book.progress * width);
```

### `book.isFirstPage()` / `book.isLastPage()`

Convenience helpers so you don't have to write `book.page === 0` etc.

```js
if (book.isFirstPage()) {
  text("Cover", 50, 50);
} else if (book.isLastPage()) {
  text("The End", 50, 50);
} else {
  text("Page " + book.pageNumber, 50, 50);
}
```

### `book.isLeftPage()` / `book.isRightPage()`

Check if the current page is on the left or right side of a spread. Only meaningful when `setSpread(true)` is enabled. Returns `false` for cover and back cover (which are solo pages).

```js
book.setSpread(true);

function draw() {
  background(255);

  if (book.isLeftPage()) {
    // content for left pages
    textAlign(RIGHT);
    text("Page " + book.pageNumber, width - 20, 30);
  } else if (book.isRightPage()) {
    // content for right pages
    textAlign(LEFT);
    text("Page " + book.pageNumber, 20, 30);
  }

  book.addPage();
}
```

**Note:** Page numbering in spreads:

- Page 0 (cover) — solo, neither left nor right
- LTR (default): odd indices (1, 3, 5...) = **left**, even indices (2, 4, 6...) = **right**
- RTL: odd indices (1, 3, 5...) = **right**, even indices (2, 4, 6...) = **left**
- Last page (back cover) — solo, neither left nor right

### `book.setDPI(dpi)`

Set the canvas DPI for high-quality print output. Call in `setup()`, **before** `addPage()`.

```js
book.setDPI(300); // standard print resolution
```

This automatically adjusts `pixelDensity()` based on your trim width, so you don't need to call `pixelDensity()` yourself.

### `book.setBleed(amount, [unit])`

Add bleed and automatically enable print marks. Call this in `setup()`, **before** `addPage()`.

```js
book.setBleed(0.125); // 1/8" bleed — US standard
book.setBleed(3, "mm"); // 3mm bleed  — European standard
```

The PDF page expands to include bleed on all four sides plus a mark margin. Two sets of marks are drawn at each corner on every page:

| Mark            | Style        | Meaning                            |
| --------------- | ------------ | ---------------------------------- |
| **Trim marks**  | solid lines  | Where the paper gets **cut**       |
| **Bleed marks** | dashed lines | Where artwork should **extend to** |

### `book.bleed`

A `p5.Graphics` buffer the same size as the full bleed area. Draw into it to fill the bleed zone — typically just a `background()` that extends to the cut edge.

```js
function draw() {
  // draw into the bleed buffer — fills the bleed zone in the PDF
  book.bleed.background(220); // or an image, gradient, etc.

  // draw your trim content on the main canvas as usual
  fill(0);
  text("Page " + book.pageNumber, 20, 20);

  book.addPage();
}
```

**Rules:**

- `book.bleed` is a `p5.Graphics` object — use any p5 drawing methods on it
- Only the portion outside the trim box is visible in the PDF (the bleed zone)
- If `setBleed()` was not called, `book.bleed` is a no-op — all calls are silently ignored
- If `setBleed()` is called but you never draw into `book.bleed`, the bleed area stays blank (print marks are still drawn)

### `book.setPrintMarks(enabled)`

Show or hide all print marks (trim + bleed). `setBleed()` enables them automatically; call this to turn them off while keeping the bleed.

```js
book.setBleed(0.125);
book.setPrintMarks(false); // bleed is still there, marks are not drawn
```

### `book.setSpread(enabled)`

Enable spread layout: cover and back cover are solo pages, inner pages pair as two-page spreads in the preview, PDF export, and print. Call in `setup()`, **before** `addPage()`.

```js
book.setSpread(true);
```

**Requirements:**

- Total page count must be **even**
- Must be called before the first `addPage()`

When enabled:

- Page 1 (cover) is displayed alone
- Pages 2–3, 4–5, etc. are displayed as spreads
- Last page (back cover) is displayed alone
- PDF export automatically creates spread pages without inner bleed at the gutter

### `book.setDirection(dir)`

Set reading direction. Default is `"ltr"` (left-to-right). Use `"rtl"` for right-to-left books (Arabic, Hebrew, manga, etc.). Call in `setup()`, **before** `addPage()`.

```js
book.setSpread(true);
book.setDirection("rtl"); // right-to-left reading order
```

When `"rtl"` is set:

- Spread pairs are physically flipped in the PDF and viewer — the first inner page appears on the **right** side
- `isLeftPage()` / `isRightPage()` return correct values for RTL layout
- Viewer arrow keys flip: `→` goes to the previous spread, `←` goes to the next
- `textBox()` column order is reversed and `canvas.direction` is set to `"rtl"` so Arabic/Hebrew text renders correctly

---

### `book.setSaddleStitch(enabled)`

Enable saddle-stitch imposition button in the viewer. Page count must be **divisible by 4**.

```js
book.setSaddleStitch(true);
```

When enabled, the viewer shows a dropdown to choose between:

- **PDF** — normal page order
- **Saddle Stitch** — printer spread imposition for saddle-stitch binding

### `book.bleedWidth` / `book.bleedHeight`

Trim size + bleed on both sides, in the book's unit. Read-only. These are provided for reference — you don't need to use them to size your canvas anymore.

```js
// book = createBook(5, 8, 10)  +  book.setBleed(0.125)
console.log(book.bleedWidth); // 5.25
console.log(book.bleedHeight); // 8.25
```

### `book.save([filename])`

Manually trigger the PDF download. You usually don't need this — it's called automatically after the last `addPage()`.

```js
book.save("my-zine.pdf");
```

When `setSpread(true)` is enabled, this exports the spread-format PDF automatically.

### `book.saveSaddleStitch([filename])`

Export a saddle-stitch imposition PDF. Page count must be divisible by 4.

```js
book.saveSaddleStitch(); // downloads "book-saddle.pdf"
book.saveSaddleStitch("my-zine-print.pdf");
```

Pages are reordered into printer spreads for saddle-stitch binding:

- For an 8-page book: [8,1], [2,7], [6,3], [4,5]

**Note:** This is called automatically when the user selects "Saddle Stitch" in the viewer dropdown (if `setSaddleStitch(true)` was enabled).

### `book.exportFrames([format])`

Download every captured page as an individual image file. Useful for importing pages into InDesign, Affinity Publisher, Figma, or video compositing tools.

```js
book.exportFrames(); // PNG (default)
book.exportFrames("png"); // explicit PNG
book.exportFrames("jpeg"); // JPEG, using the book's jpegQuality setting
```

Files are named `<basename>-0001.png`, `-0002.png`, … and downloaded one by one with a small stagger to avoid browser throttling. Also accessible via **Frames (PNG)** / **Frames (JPG)** in the viewer's download dropdown.

### `book.finish([filename])`

Manually show the viewer and stop the loop. Use when you don't know the total page count upfront (e.g. text reflow).

```js
let textLeft = "...long text...";

function draw() {
  background(255);
  textLeft = book.textBox(textLeft, 20, 20, width - 40, height - 40);
  book.addPage();

  if (!textLeft) {
    book.finish(); // all text placed — show viewer
  }
}
```

When a total page count is passed to `createBook()`, the viewer opens automatically after the last page — you don't need `finish()`.

### `book.textBox(str, x, y, w, h)`

Draw wrapped text into a rectangular box with automatic line breaks. Returns overflow text that didn't fit.

```js
let overflow = "Long text here...";

function draw() {
  background(255);

  // render text, get what didn't fit
  overflow = book.textBox(overflow, 20, 20, width - 40, height - 40);

  book.addPage();

  // stop when all text has been placed
  if (!overflow) {
    book.finish();
  }
}
```

Respects current `textSize()`, `textLeading()`, `textAlign()`, `book.letterSpacing()`, and `book.columnNum()`.

Chinese, Japanese, and Korean text is automatically detected and wrapped character-by-character (no space needed between characters).

### `book.columnNum(n, [gutter])`

Set the number of columns for `textBox()`. Returns the current column count if called with no arguments.

```js
book.columnNum(2, 20); // 2 columns, 20px gutter
book.columnNum(1); // back to single column

let cols = book.columnNum(); // get current count
```

Persists like `textSize()` — affects all subsequent `textBox()` calls until changed.

### `book.letterSpacing(px)`

Set CSS letter-spacing. Persists like `textSize()`. Negative values tighten, positive loosen. Applied to both the main canvas and the bleed layer.

```js
book.letterSpacing(-2); // tighten — good for large headlines
book.letterSpacing(4); // loosen — spaced-out labels
book.letterSpacing(0); // reset to normal
```

### `book.bleed.draw(fn)`

Scoped drawing into the bleed layer. `fn` receives the bleed `p5.Graphics` object as its argument, so you can route drawing calls without prefixing every line with `book.bleed.`.

```js
book.bleed.draw((g) => {
  g.background(20);
  g.noFill();
  g.stroke(255);
  for (let i = 50; i < 800; i += 50) {
    g.ellipse(g.width / 2, g.height / 2, i, i);
  }
});
```

If `setBleed()` was not called, `bleed.draw()` is a no-op — the function is never called.

### `book.spine`

A `p5.Graphics` buffer (200 × canvas-height px) for drawing the book spine. Its content appears in the **3D viewer** as the spine face, and can be used to design your spine artwork.

```js
function setup() {
  book = createBook(5.5, 8.5, 200);

  // draw spine content once at the start
  book.spine.background(20);
  book.spine.fill(200);
  book.spine.textAlign(CENTER, CENTER);
  book.spine.textSize(12);
  // rotated text runs bottom-to-top along the spine
  book.spine.push();
  book.spine.translate(100, book.spine.height / 2);
  book.spine.rotate(-HALF_PI);
  book.spine.text("My Book Title", 0, 0);
  book.spine.pop();
}
```

Or use the scoped helper:

```js
book.spine.draw((g) => {
  g.background(20);
  g.fill(200);
  g.noStroke();
  g.textSize(12);
  g.push();
  g.translate(100, g.height / 2);
  g.rotate(-HALF_PI);
  g.textAlign(CENTER, CENTER);
  g.text("My Book Title", 0, 0);
  g.pop();
});
```

**Notes:**

- The spine canvas is 200 px wide × canvas height tall. Scale your drawings accordingly.
- If you never draw on `book.spine`, a default spine is auto-generated (dark gradient + filename).
- Spine thickness in the 3D viewer is automatically calculated from `totalPages` (≈ 0.1 mm per leaf).

## Full Example

```html
<!DOCTYPE html>
<html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/p5@2/lib/p5.min.js"></script>
    <script src="https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/munusshih/p5.book@main/p5.book.js?v=2"></script>
  </head>
  <body>
    <script>
      let book;

      function setup() {
        book = createBook(4, 6, 12); // 4×6 in, 12 pages — canvas auto-created
        book.setDPI(300); // high-res for print
        book.setBleed(0.125); // 1/8" bleed
        book.setSpread(true); // spread layout
        book.setSaddleStitch(true); // enable saddle-stitch option
      }

      function draw() {
        // bleed layer — extends to cut edge
        let hue = map(book.progress, 0, 1, 0, 360);
        colorMode(HSB);
        book.bleed.background(hue, 80, 100);

        // trim layer — main canvas
        colorMode(RGB);
        clear(); // keep transparent so bleed shows through

        // circle grows across the book
        noStroke();
        fill(255);
        circle(width / 2, height / 2, book.progress * width);

        // page number
        fill(255);
        textSize(20);
        if (book.isFirstPage()) {
          text("My Book", 20, 30);
        } else if (book.isLastPage()) {
          text("The End", 20, 30);
        } else {
          text("Page " + book.pageNumber, 20, 30);
        }

        book.addPage();
      }
    </script>
  </body>
</html>
```

## Tips

- **Canvas** — `createBook()` auto-creates the canvas at 500 px wide with your book's aspect ratio. No need to call `createCanvas()`.
- **Resolution** — use `book.setDPI(300)` in `setup()` for crisp print quality. This is preferred over `pixelDensity()` because it also resizes the canvas height so both axes are exactly on-spec.
- **Bleed size** — standard bleed: 0.125 in (US) or 3 mm (Europe).
- **Spread layout** — use `book.setSpread(true)` for books where the cover/back are solo and inner pages pair as spreads.
- **Saddle-stitch** — enable `book.setSaddleStitch(true)` to add a printer spread export option (page count must be divisible by 4).
- **Text reflow** — use `book.textBox()` with `book.columnNum()` to flow long text across multiple pages automatically. RTL books use `book.setDirection("rtl")` — column order and text direction are handled automatically.
- **Slow down** — p5.book captures every frame, so `frameRate(1)` can give you more time to animate per page.
- **Unknown page count** — don't pass `totalPages` to `createBook()`, use `book.finish()` when done.
- **Export frames** — use `book.exportFrames()` or the **Frames (PNG/JPG)** option in the download dropdown to save each page as a standalone image.
- **Viewer shortcuts** — `←`/`→` to flip pages, `[` first page, `]` last page, `?` keyboard cheat sheet.
- **Viewer styling** — override CSS variables in your stylesheet — see [test/style.css](test/style.css) for the full list.

---

## License

MIT — free to use, remix, and share.
