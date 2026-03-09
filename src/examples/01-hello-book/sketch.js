// ─────────────────────────────────────────────────────────────────────────────
// 01 — hello book
//
// The simplest possible p5.book sketch.
// createBook(width, height, totalPages)  — sizes in inches by default.
// The canvas is created automatically with the correct aspect ratio.
// book.addPage()  — always call at the very end of draw().
// ─────────────────────────────────────────────────────────────────────────────

let book;

function setup() {
  // 4×6 inch book, 6 pages — canvas auto-created with correct aspect ratio
  book = createBook(4, 6, 6);
  book.setDPI(150); // bump pixel density for crisper output
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
