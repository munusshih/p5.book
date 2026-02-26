// ─────────────────────────────────────────────────────────────────────────────
// 06 — slow burn
//
// addPage() is NOT at the end of every draw() frame.
//
// draw() loops continuously, building up translucent noise lines on the canvas.
// Only once enough layers have stacked up (FRAMES_PER_PAGE) do we capture the
// page and clear for the next one.
//
// This shows that addPage() can live inside an if() — you control exactly when
// a page is "done", not p5.book.
// ─────────────────────────────────────────────────────────────────────────────

let book;
const FRAMES_PER_PAGE = 60;
let framesSoFar = 0;

function setup() {
  createCanvas(400, 600);
  pixelDensity(2);
  background(255);
  book = createBook(4, 6, 8);
}

function draw() {
  // draw one faint layer of noise lines — they stack up across many frames
  stroke(0, 18);
  noFill();
  beginShape();
  for (let x = 0; x <= width; x += 3) {
    let n = noise(x * 0.006, framesSoFar * 0.04, book.page * 3);
    vertex(x, map(n, 0, 1, 0, height));
  }
  endShape();

  framesSoFar++;

  // only capture once FRAMES_PER_PAGE layers have been drawn
  if (framesSoFar >= FRAMES_PER_PAGE) {
    book.addPage(); // ← inside an if(), not at the bottom of every frame
    framesSoFar = 0;
    background(255); // clear canvas for the next page
  }
}
