// ─────────────────────────────────────────────────────────────────────────────
// 01 — hello book
//
// The simplest possible p5.book sketch.
// createBook(width, height, totalPages)  — sizes in inches by default.
// book.addPage()  — always call at the very end of draw().
// ─────────────────────────────────────────────────────────────────────────────

let book;

function setup() {
  createCanvas(400, 600);
  pixelDensity(2); // crisper output

  // 4×6 inch book, 6 pages
  book = createBook(4, 6, 6);
}

function draw() {
  background(255);

  // draw something on every page
  fill(0);
  noStroke();
  textSize(24);
  text("page " + book.pageNumber, 30, 50);

  // always call addPage() last
  // after the final page the viewer opens automatically
  book.addPage();
}
