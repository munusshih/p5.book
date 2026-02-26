# p5.book

A simple PDF book generator for [p5.js 2.0](https://p5js.org).  
Turn your generative sketches into real, multi-page PDFs — no build tools, no npm, just `<script>` tags.

---

## Setup

Add these three scripts to your HTML, **in order**:

```html
<!-- 1. p5.js 2.0 -->
<script src="https://cdn.jsdelivr.net/npm/p5@2/lib/p5.min.js"></script>

<!-- 2. jsPDF (required by p5.book) -->
<script src="https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js"></script>

<!-- 3. p5.book -->
<script src="https://cdn.jsdelivr.net/gh/munusshih/p5.book@main/p5.book.js"></script>
```

---

## Quick Start

```js
let book;

function setup() {
  createCanvas(500, 800);

  // 5×8 inch book, 10 pages
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

---

## How It Works

Each call to `draw()` produces one page.  
`book.addPage()` captures the canvas and adds it to the PDF.  
After the last page, the PDF is saved and the sketch stops automatically.

```
setup()  →  createBook(w, h, pages)
draw()   →  [draw your art]  →  book.addPage()  →  repeat...  →  PDF saved!
```

---

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

| Unit   | Description      |
| ------ | ---------------- |
| `"in"` | Inches (default) |
| `"cm"` | Centimeters      |
| `"mm"` | Millimeters      |
| `"px"` | Pixels           |
| `"pt"` | Points           |

---

### `book.addPage()`

Capture the current canvas as the next page. Call this **once at the end of `draw()`**.

```js
function draw() {
  // ... your drawing code ...
  book.addPage(); // always last
}
```

---

### `book.page`

Current page index, **0-based**. The first page is `0`.

---

### `book.pageNumber`

Current page number, **1-based**. Easier to display to readers.

```js
text("Page " + book.pageNumber, 20, 20); // shows "Page 1", "Page 2", ...
```

---

### `book.totalPages`

The total number of pages you passed to `createBook()`.

---

### `book.progress`

A number from `0.0` (first page) to `1.0` (last page). Perfect for animations or colors that gradually evolve across the whole book.

```js
// background gets lighter page by page
background(lerp(0, 255, book.progress));

// shape grows across the book
circle(width / 2, height / 2, book.progress * width);
```

---

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

---

### `book.save([filename])`

Manually trigger the PDF download. You usually don't need this — it's called automatically after the last `addPage()`.

```js
book.save("my-zine.pdf");
```

---

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

---

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

---

### `book.setPrintMarks(enabled)`

Show or hide all print marks (trim + bleed). `setBleed()` enables them automatically; call this to turn them off while keeping the bleed.

```js
book.setBleed(0.125);
book.setPrintMarks(false); // bleed is still there, marks are not drawn
```

---

### `book.bleedWidth` / `book.bleedHeight`

Trim size + bleed on both sides, in the book's unit. Read-only. These are provided for reference — you don't need to use them to size your canvas anymore.

```js
// book = createBook(5, 8, 10)  +  book.setBleed(0.125)
console.log(book.bleedWidth); // 5.25
console.log(book.bleedHeight); // 8.25
```

---

## Full Example

```html
<!DOCTYPE html>
<html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/p5@2/lib/p5.min.js"></script>
    <script src="https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/munusshih/p5.book@main/p5.book.js"></script>
  </head>
  <body>
    <script>
      let book;

      function setup() {
        createCanvas(400, 600);
        book = createBook(4, 6, 12); // 4×6 in, 12 pages
        // or: createBook(10, 15, 12, "cm");
        // or: createBook("A5", 12);
      }

      function draw() {
        // background shifts from dark to light using book.progress
        background(lerp(20, 240, book.progress));

        // circle grows across the book
        let hue = map(book.progress, 0, 1, 0, 360);
        colorMode(HSB);
        fill(hue, 80, 100);
        noStroke();
        circle(width / 2, height / 2, book.progress * width);

        // page number in the corner
        colorMode(RGB);
        fill(0);
        textSize(20);

        if (book.isFirstPage()) {
          text("My Generative Book", 20, 30);
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

---

## Tips

- **Resolution** — use `pixelDensity(2)` or higher in `setup()` for crisp print quality.
- **Canvas size** — make your canvas match your page ratio. A 5×8 in page? Try `createCanvas(500, 800)`.
- **Bleed size** — if you're using `setBleed()`, size your canvas to `book.bleedWidth * scale` × `book.bleedHeight * scale` so your art extends all the way to the cut edge.
- **Slow down** — p5.book captures every frame, so `frameRate(1)` can give you more time to animate per page.
- **Page count** — the sketch automatically stops after the last page, so you don't need `noLoop()`.

---

## License

MIT — free to use, remix, and share.
