// title: page numbers
// description: book.page, book.pageNumber, book.totalPages, book.progress, isFirstPage(), isLastPage()
//
// Four ways to track position in the book:
//
//   book.page         — 0-based index (first page = 0) — use as an array index
//   book.pageNumber   — 1-based (first page = 1) — use for display
//   book.totalPages   — total pages passed to createBook()
//   book.progress     — 0.0 on the first page, 1.0 on the last
//
//   book.isFirstPage()  — true only on the first page (cover)
//   book.isLastPage()   — true only on the last page (back cover)
//
// In this example the NUMBER OF RINGS encodes the page — the shape itself
// becomes the page number without any text.
//
// TRY: Replace circles with rect()s or any other geometry.
//      Use book.progress instead of book.pageNumber to control something.

let book;

function setup() {
  book = createBook(4, 6, 10);
  book.setDPI(150);
}

function draw() {
  background(245);
  noFill();
  stroke(0);
  strokeWeight(2);

  // one ring per page — ring count IS the page number
  let n = book.pageNumber;
  for (let i = 1; i <= n; i++) {
    // map ring index to diameter using book.totalPages as the ceiling
    let d = map(i, 1, book.totalPages, 24, min(width, height) * 0.88);
    circle(width / 2, height / 2, d);
  }

  book.addPage();
}
