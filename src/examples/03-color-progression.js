// title: color progression
// description: book.progress with lerp() — two complementary hues trade places
//
// book.progress
//   A number from 0.0 (first page) to 1.0 (last page).
//   Use it with lerp(), map(), or direct multiplication to create gradual change.
//
//   lerp(a, b, book.progress)       — interpolate between two values
//   map(book.progress, 0, 1, a, b)  — same idea, sometimes clearer to read
//   colorMode(HSB); fill(book.progress * 360, 80, 100) — hue sweep
//
// This example uses book.progress to shift a hue across the spectrum while a
// complementary hue circle grows from nothing to overfill the page — so both
// color scales are always visible at once, trading dominance.
//
// TRY: Change 300 on the hueA line to 180 for a narrower sweep.
//      Try lerp(0, sqrt(2) * max(width, height), t) for exact edge-to-edge fill.

let book;

function setup() {
  book = createBook(4, 6, 16);
  book.setDPI(150);
  colorMode(HSB, 360, 100, 100);
}

function draw() {
  let t = book.progress; // 0 → 1

  // hue A travels across the spectrum; hue B is its complement (+160°)
  let hueA = (t * 300) % 360;
  let hueB = (hueA + 160) % 360;

  // background = hue A
  background(hueA, 65, 92);

  // circle filled with hue B — grows from nothing to overfill the page
  noStroke();
  fill(hueB, 75, 88);
  let d = lerp(0, sqrt(2) * max(width, height) * 2, t);
  circle(width / 2, height / 2, d);

  book.addPage();
}
