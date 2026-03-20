// title: workshop remix
// description: spread + bleed + cover logic + typography + generative pattern
//
// A capstone-style example for worksheet sections G-I.
//
// Includes:
//   createBook(), setSpread(true), setBleed(), isFirstPage(), isLastPage(),
//   isLeftPage(), isRightPage(), pageNumber, progress, addPage().

let book;
const LETTERS = "P5BOOKWORKSHOP";

function setup() {
  book = createBook(4, 6, 12);
  book.setSpread(true);
  book.setBleed(0.125);

  colorMode(HSB, 360, 100, 100, 1);
  textAlign(CENTER, CENTER);
  textFont("Georgia");
}

function draw() {
  let t = book.progress;

  // Bleed layer: smooth hue drift across the full print area.
  book.bleed.background(lerp(25, 310, t), 34, 96);

  // Keep trim area transparent so bleed is visible.
  clear();

  if (book.isFirstPage()) {
    fill(0, 0, 10, 0.92);
    textStyle(BOLD);
    textSize(width * 0.14);
    text("WORKSHOP REMIX", width / 2, height * 0.44);
    textStyle(NORMAL);
    textSize(width * 0.065);
    text("p5.book", width / 2, height * 0.58);
  } else if (book.isLastPage()) {
    fill(0, 0, 100, 0.95);
    textStyle(BOLD);
    textSize(width * 0.14);
    text("THANK YOU", width / 2, height * 0.5);
  } else if (book.isLeftPage()) {
    drawLeftPage();
  } else if (book.isRightPage()) {
    drawRightPage();
  }

  book.addPage();
}

function drawLeftPage() {
  let idx = (book.pageNumber - 2) % LETTERS.length;
  let letter = LETTERS[idx];

  fill(0, 0, 8, 0.9);
  textStyle(BOLD);
  textSize(width * 0.62);
  text(letter, width * 0.34, height * 0.56);

  textStyle(NORMAL);
  textSize(width * 0.06);
  text("LEFT " + book.pageNumber, width * 0.24, height * 0.14);
}

function drawRightPage() {
  randomSeed(book.pageNumber * 77);
  noFill();

  for (let i = 0; i < 18; i++) {
    let d = map(i, 0, 17, 24, width * 1.15);
    stroke(0, 0, random(0, 35), 0.24);
    circle(width * 0.68, height * 0.52, d);
  }

  noStroke();
  fill(0, 0, 10, 0.9);
  textSize(width * 0.06);
  text("RIGHT " + book.pageNumber, width * 0.74, height * 0.14);
}
