// title: every run different
// description: unseeded random() — Truchet tiles, unique every time
//
// random() in p5.js is re-seeded from the clock, so every run
// produces a completely different book.
//
// Truchet tiles: fill each grid cell with one of two arc pairs chosen at
// random. The arcs connect across cells to form continuous flowing curves.
//
// Because random() is called once per cell per page — not stored — each
// page redraws with different arcs. The whole book is different every run.
//
// TRY: Add randomSeed(book.page * 42) before the loops to lock each page's
//      pattern so it's the same every run (but still different per page).
//      Change tile size — smaller tiles (20) = denser pattern.

let book;

function setup() {
  book = createBook(4, 6, 8);
  book.setDPI(150);
  strokeCap(ROUND);
}

function draw() {
  background(245);
  noFill();
  stroke(0);
  strokeWeight(3);

  let tile = 40;
  let cols = ceil(width / tile);
  let rows = ceil(height / tile);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let x = c * tile;
      let y = r * tile;
      // randomly pick one of two arc-pair orientations
      if (random() > 0.5) {
        arc(x, y, tile * 2, tile * 2, 0, HALF_PI);
        arc(x + tile, y + tile, tile * 2, tile * 2, PI, PI + HALF_PI);
      } else {
        arc(x + tile, y, tile * 2, tile * 2, HALF_PI, PI);
        arc(x, y + tile, tile * 2, tile * 2, PI + HALF_PI, TWO_PI);
      }
    }
  }

  book.addPage();
}
