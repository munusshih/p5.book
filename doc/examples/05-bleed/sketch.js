// ─────────────────────────────────────────────────────────────────────────────
// 05 — bleed & print marks
//
// book.setBleed(amount, unit)
//   Adds bleed to the PDF. Call in setup() before addPage().
//   Standard amounts: 0.125 in (US) or 3 mm (Europe).
//
// book.bleed  — a p5.Graphics buffer covering the full bleed area.
//   Draw backgrounds and full-bleed images here.
//   Everything else goes on the main canvas as usual.
//
// book.bleedWidth / book.bleedHeight
//   The full bleed size (trim + bleed on both sides), in your book's unit.
//   Useful if you want to size your canvas to the bleed area.
// ─────────────────────────────────────────────────────────────────────────────

let book;

function setup() {
  createCanvas(400, 600); // trim size canvas 4×6 in
  pixelDensity(2);

  book = createBook(4, 6, 8);
  book.setBleed(0.125); // 1/8 inch — US bleed standard
}

function draw() {
  let t = book.progress; // 0 → 1

  // ── bleed layer ──────────────────────────────────────────────────────────
  // Draw here to fill the bleed zone in the PDF.
  // Use background(), image(), or any fill that should extend to the cut edge.
  let c = lerpColor(color(30, 30, 200), color(200, 30, 80), t);
  book.bleed.background(c);

  // ── trim layer (main canvas) ──────────────────────────────────────────────
  // This is placed at the trim boundary in the PDF — same as normal p5 drawing.
  // Leave the background transparent so the bleed layer shows through.
  clear();

  // white text block
  noStroke();
  fill(255);
  textSize(28);
  textAlign(LEFT, TOP);
  text("page " + book.pageNumber, 24, 24);

  // shape that changes per page
  fill(255, 200);
  let sz = lerp(40, 300, t);
  circle(width / 2, height / 2, sz);

  book.addPage();
}
