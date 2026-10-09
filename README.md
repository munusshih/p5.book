# p5.book

[![npm version](https://img.shields.io/npm/v/p5.book.svg)](https://www.npmjs.com/package/p5.book)
[![npm downloads](https://img.shields.io/npm/dm/p5.book.svg)](https://www.npmjs.com/package/p5.book)
[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/munusshih/p5.book/release.yml?branch=main)](https://github.com/munusshih/p5.book/actions/workflows/release.yml)

![A banner showing what p5.book can do](https://raw.githubusercontent.com/munusshih/p5.book/main/public/assets/banner.gif)

p5.book is a PDF book generator for [p5.js 2.0](https://p5js.org). It captures each canvas frame as a page, compiles them into a PDF, and opens a built-in viewer with 3D preview and print-ready export options.

Designed specifically for artists, designers, and educators who want to create custom books with code! The library is capable of creating everything from simple bound zines to generative photo books, portfolios, and computational novels.

## Start here

- **[Make your first book](https://editor.p5js.org/munusshih/sketches/u8Ox1CmnM)** — open the starter sketch and remix it in your browser.
- **[Learn with the workshop](https://p5-book.vercel.app/workshop/comp-book/)** — make a computational book step by step.
- **[Get help or share feedback](https://github.com/munusshih/p5.book/issues/new/choose)** — questions, confusing instructions, and unfinished ideas are welcome.
- **[Contribute](https://github.com/munusshih/p5.book/blob/main/CONTRIBUTING.md)** — help with code, examples, documentation, or testing a printed book.

## Setup

Add these three scripts to your HTML, **in order**:

```html
<!-- 1. p5.js 2.0 -->
<script src="https://cdn.jsdelivr.net/npm/p5@2/lib/p5.min.js"></script>

<!-- 2. jsPDF (required by p5.book) -->
<script src="https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js"></script>

<!-- 3. p5.book -->
<script src="https://unpkg.com/p5.book@latest/p5.book.js"></script>
```

## Quick Start

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

  // capture this frame — the viewer opens after the last page
  book.addPage();
}
```

Run your sketch to generate the book. When the viewer opens, use **download** to save the PDF.

## How It Works

Each call to `draw()` produces one page.  
`book.addPage()` captures the canvas and adds it to the PDF.  
After the last page, the sketch stops and the viewer opens.

```
setup()  →  createBook(w, h, pages)
draw()   →  [draw your art]  →  book.addPage()  →  repeat...  →  viewer opens
```

## Documentation

See the [API reference](https://p5-book.vercel.app/) and [workshop guide](https://p5-book.vercel.app/workshop/) for examples, print settings, and book layouts.

## License

[MIT](LICENSE) — free to use, remix, and share.
