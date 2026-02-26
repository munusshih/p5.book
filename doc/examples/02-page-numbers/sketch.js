// ─────────────────────────────────────────────────────────────────────────────
// 02 — page numbers
//
// book.page        — 0-based index   (first page = 0)
// book.pageNumber  — 1-based number  (first page = 1)
// book.totalPages  — total you passed to createBook()
// book.isFirstPage()  — true when drawing the first page
// book.isLastPage()   — true when drawing the last page
// ─────────────────────────────────────────────────────────────────────────────

let book;

function setup() {
  createCanvas(400, 600);
  pixelDensity(2);

  book = createBook(4, 6, 8); // 4×6 in, 8 pages
}

function draw() {
  // ── cover ──────────────────────────────────────────────────────────
  if (book.isFirstPage()) {
    background(10);
    fill(255);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("Cover", width / 2, height / 2);

    // ── back cover ─────────────────────────────────────────────────────
  } else if (book.isLastPage()) {
    background(10);
    fill(255);
    textSize(20);
    textAlign(CENTER, CENTER);
    text("The End", width / 2, height / 2);

    // ── interior pages ─────────────────────────────────────────────────
  } else {
    background(255);
    fill(0);
    textAlign(LEFT, TOP);

    // page number in the corner
    textSize(14);
    text(book.pageNumber + " / " + book.totalPages, 24, 24);

    // centered content
    textSize(64);
    textAlign(CENTER, CENTER);
    text(book.pageNumber, width / 2, height / 2);
  }

  book.addPage(); // always last
}
