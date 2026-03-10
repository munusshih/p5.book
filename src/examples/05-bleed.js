// title: bleed & print marks
// description: setBleed(), book.bleed.draw(), book.bleedWidth, book.bleedHeight
//
// book.setBleed(amount, unit)
//   Adds bleed to the PDF. Call in setup() before addPage().
//   Standard: 0.125 in (US) or 3 mm (Europe). Also enables trim marks.
//
// book.bleed — p5.Graphics covering the full bleed area (trim + bleed).
//   Draw backgrounds and full-bleed images here.
//   Leave the main canvas background transparent (clear()) so bleed shows through.
//
// book.bleed.draw(fn)
//   Scoped drawing helper — fn receives the graphics object as `g`.
//   No need to prefix every call with book.bleed.
//
// book.bleedWidth / book.bleedHeight
//   Full bleed page dimensions in your book's unit.
//   Use to size geometry that should exactly reach the bleed edges.
//
// book.setPrintMarks(bool) — show or hide the trim/bleed crop marks.
//
// TRY: Change setBleed(0.125) to setBleed(3, "mm") for European standard.
//      Add book.setPrintMarks(false) to hide the crop marks.

let book;

function setup() {
  book = createBook(4, 6, 8);
  book.setDPI(150);
  book.setBleed(0.125); // 1/8 inch — US standard
}

function draw() {
  let t = book.progress; // 0 → 1

  // ── bleed layer ──────────────────────────────────────────────────────────
  // book.bleed.draw() gives you a scoped context — `g` is the bleed buffer.
  // Anything drawn here fills the full bleed area (trim + extra on all edges).
  book.bleed.draw((g) => {
    g.background(lerpColor(color(20, 80, 200), color(200, 40, 80), t));

    // a ring that grows from nothing — sized to bleedWidth so it reaches the edge
    g.noFill();
    g.stroke(255, 60);
    g.strokeWeight(2);
    g.circle(g.width / 2, g.height / 2, lerp(0, book.bleedWidth * 150, t));
  });

  // ── trim layer (main canvas) ──────────────────────────────────────────────
  // Transparent background — bleed shows through.
  // Normal p5 drawing appears inside the trim boundary.
  clear();

  noStroke();
  fill(255);
  textSize(12);
  textAlign(LEFT, TOP);
  text(book.pageNumber + " / " + book.totalPages, 24, 24);

  book.addPage();
}
