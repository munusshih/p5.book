// title: pattern layers
// description: deterministic page-by-page pattern growth using progress and randomSeed
//
// Worksheet section H companion.

let book;

function setup() {
  book = createBook(4, 6, 14);
  colorMode(HSB, 360, 100, 100, 1);
  noFill();
}

function draw() {
  background(45, 14, 100);

  const density = floor(map(book.progress, 0, 1, 20, 170));
  const hue = map(book.progress, 0, 1, 20, 330);
  const alpha = map(book.progress, 0, 1, 0.12, 0.36);

  randomSeed(book.pageNumber * 997);

  for (let i = 0; i < density; i++) {
    const x = random(width);
    const y = random(height);
    const d = random(6, width * 0.26);

    stroke((hue + random(-24, 24) + 360) % 360, 72, 32, alpha);
    circle(x, y, d);
  }

  noStroke();
  fill(0, 0, 12, 0.85);
  textAlign(LEFT, TOP);
  textSize(width * 0.05);
  text(`p.${book.pageNumber}`, 16, 16);

  book.addPage();
}
