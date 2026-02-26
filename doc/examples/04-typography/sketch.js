// ─────────────────────────────────────────────────────────────────────────────
// 04 — typography
//
// A book driven by an array of words.
// book.page is used as an index into the data array.
//
// This pattern works for any data: words, images, numbers, quotes …
// Just make sure totalPages matches the length of your data.
// ─────────────────────────────────────────────────────────────────────────────

const WORDS = [
  "begin",
  "here",
  "turn",
  "slow",
  "grow",
  "drift",
  "spill",
  "fold",
  "rest",
  "end",
];

let book;

function setup() {
  createCanvas(400, 600);
  pixelDensity(2);

  // totalPages matches the number of words
  book = createBook(4, 6, WORDS.length);
}

function draw() {
  let t = book.progress; // 0 → 1
  let word = WORDS[book.page]; // current word from the array

  // background fades light → dark
  let bg = lerp(252, 12, t);
  background(bg);

  // text colour flips midway
  fill(bg > 128 ? 20 : 235);
  noStroke();

  // size grows across the book
  let sz = lerp(28, 90, t);
  textSize(sz);
  textAlign(CENTER, CENTER);
  text(word, width / 2, height / 2);

  // small page number in corner
  textSize(12);
  textAlign(RIGHT, BOTTOM);
  fill(bg > 128 ? 160 : 100);
  text(book.pageNumber, width - 20, height - 20);

  book.addPage();
}
