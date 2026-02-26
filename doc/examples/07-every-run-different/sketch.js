// ─────────────────────────────────────────────────────────────────────────────
// 07 — every run is different
//
// random() in p5.js is re-seeded fresh each time the sketch runs, so every
// time you open this page you get a completely different book.
//
// hueStart is picked once in setup() — it shifts the whole book's mood.
// The circle positions and sizes are random too, so each page is unique.
// ─────────────────────────────────────────────────────────────────────────────

let book;
let hueStart;

function setup() {
  createCanvas(400, 600);
  pixelDensity(2);
  colorMode(HSB, 360, 100, 100);

  book = createBook(4, 6, 10);
  hueStart = random(360); // different every run — shifts the whole book's colour
}

function draw() {
  // each page steps 36° around the colour wheel from the random starting hue
  let h = (hueStart + book.page * 36) % 360;
  background(h, 30, 96);

  noStroke();
  // scatter circles — random positions, sizes, and slight hue shifts each run
  for (let i = 0; i < 24; i++) {
    fill((h + random(-40, 40) + 360) % 360, 55, 80);
    circle(random(width), random(height), random(30, 180));
  }

  book.addPage();
}
