// title: spread layout
// description: setSpread(), isLeftPage(), isRightPage(), setDirection(), setSaddleStitch()
//
// book.setSpread(true)
//   Enable two-page spread layout. Cover and back cover stay solo pages.
//   Inner pages are paired as spreads in the viewer and PDF export.
//   totalPages must be even.
//
// book.isLeftPage() / book.isRightPage()
//   True when the current page is on that side of the spread.
//   Returns false for the cover and back cover (solo pages).
//   For LTR books: odd page indices = left, even = right.
//
// book.setDirection("rtl")
//   Right-to-left reading order — for manga, Hebrew, Arabic, etc.
//   Reverses spread pairing and isLeftPage() / isRightPage() meaning.
//
// book.setSaddleStitch(true)
//   Enables the Saddle Stitch download option — pages reordered into
//   printer-spread pairs ready for folding and stapling.
//   Page count must be divisible by 4.
//
// TRY: Add book.setDirection("rtl") in setup() and notice how the viewer
//      reverses the spread order.
//      Download → Saddle Stitch, print double-sided, fold → instant zine.

let book;

function setup() {
  book = createBook(4, 6, 12); // 12 pages: 1 cover + 5 spreads + 1 back cover
  book.setDPI(150);
  book.setSpread(true);
  book.setSaddleStitch(true); // enables saddle-stitch PDF in the download menu
}

function draw() {
  if (book.isFirstPage() || book.isLastPage()) {
    // ── solo covers ──────────────────────────────────────────────────────────
    background(20);
    fill(240);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(book.isFirstPage() ? 28 : 16);
    text(
      book.isFirstPage() ? "spread\nlayout" : "the end",
      width / 2,
      height / 2,
    );
  } else if (book.isLeftPage()) {
    // ── left page of spread ──────────────────────────────────────────────────
    background(235);
    fill(20);
    noStroke();
    // large page number anchored bottom-left
    textAlign(LEFT, BOTTOM);
    textSize(72);
    text(book.pageNumber, 24, height - 24);
    // gutter guide at the right edge (where pages bind)
    stroke(180);
    strokeWeight(1);
    line(width - 4, 0, width - 4, height);
  } else {
    // ── right page of spread ─────────────────────────────────────────────────
    background(20);
    fill(235);
    noStroke();
    // large page number anchored top-right
    textAlign(RIGHT, TOP);
    textSize(72);
    text(book.pageNumber, width - 24, 24);
    // gutter guide at the left edge
    stroke(60);
    strokeWeight(1);
    line(4, 0, 4, height);
  }

  book.addPage();
}
