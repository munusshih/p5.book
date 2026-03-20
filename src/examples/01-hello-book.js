// title: hello book
// description: createBook(), setDPI(), addPage() — the absolute minimum
//
// createBook(width, height, totalPages)   — custom size (inches by default)
// createBook("A5", 12)                    — named paper sizes: A3 A4 A5 A6 letter
// createBook(5, 8, 12, "cm", "my-zine")  — with unit + filename
//
// book.setDPI(dpi)
//   Sets canvas pixel density for crisp output.
//   150 — lighter file size    300 — print-ready quality
//
// book.addPage()
//   Captures the current canvas as a PDF page. Always the last call in draw().
//   After the final page the viewer opens automatically.
//
// TRY: Change 4, 6, 6 to different dimensions or page counts.
//      Swap createBook(4, 6, 6) for createBook("A5", 6) to use a standard size.

let book;

function setup() {
  book = createBook(4, 6, 6); // 4×6 in, 6 pages — canvas auto-created
  book.setDPI(150);
  colorMode(HSB, 360, 100, 100);
}

function draw() {
  background(random(360), 60, 92);

  // big page number, centered
  fill(0, 0, 0);
  noStroke();
  textFont("Georgia");
  textStyle(BOLD);
  textSize(width * 0.55);
  textAlign(CENTER, CENTER);
  text(book.pageNumber, width / 2, height / 2);

  book.addPage();
}
