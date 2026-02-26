// ─────────────────────────────────────────────────────────────────────────────
// 03 — color progression
//
// book.progress  — a number from 0.0 (first page) to 1.0 (last page)
//
// Use it with:
//   lerp(a, b, book.progress)          — interpolate between two values
//   map(book.progress, 0, 1, a, b)     — same idea, sometimes clearer
//   colorMode(HSB); fill(book.progress * 360, 80, 100);
// ─────────────────────────────────────────────────────────────────────────────

let book;

function setup() {
  createCanvas(400, 600);
  pixelDensity(2);
  colorMode(HSB, 360, 100, 100, 100);

  book = createBook(4, 6, 16);
}

function draw() {
  let t = book.progress; // 0 → 1

  // background hue shifts from blue (220) to red (360→0)
  let hue = lerp(220, 360, t) % 360;
  background(hue, 30, 96);

  // a circle grows from tiny to full-width
  let size = lerp(20, width * 1.2, t);
  fill(hue, 70, 55, 90);
  noStroke();
  circle(width / 2, height / 2, size);

  // page number
  colorMode(RGB);
  fill(80);
  textSize(13);
  textAlign(LEFT, TOP);
  text(book.pageNumber + " / " + book.totalPages, 20, 20);
  colorMode(HSB, 360, 100, 100, 100);

  book.addPage();
}
