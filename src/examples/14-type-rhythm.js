// title: type rhythm
// description: typography-only sequencing with page-based scale and letter-spacing shifts
//
// Worksheet section G companion.

let book;
const PHRASE = "PRINT RULES";

function setup() {
  book = createBook(4, 6, PHRASE.length + 2);
  colorMode(HSB, 360, 100, 100, 1);
  textAlign(CENTER, CENTER);
  textFont("Georgia");
}

function draw() {
  if (book.isFirstPage()) {
    background(42, 78, 100);
    fill(0, 0, 12);
    textStyle(BOLD);
    textSize(width * 0.16);
    text("TYPE RHYTHM", width / 2, height * 0.48);
  } else if (book.isLastPage()) {
    background(0, 0, 10);
    fill(0, 0, 100);
    textStyle(BOLD);
    textSize(width * 0.17);
    text("END", width / 2, height * 0.5);
  } else {
    const i = book.pageNumber - 2;
    const ch = PHRASE[i] || " ";

    background(i % 2 === 0 ? 0 : 0, 0, i % 2 === 0 ? 8 : 100);
    fill(i % 2 === 0 ? 0 : 0, 0, i % 2 === 0 ? 100 : 12);

    textStyle(BOLD);
    textSize(map(i, 0, PHRASE.length - 1, width * 0.35, width * 0.7));
    book.letterSpacing(i % 2 === 0 ? -1 : 3);
    text(ch, width / 2, height * 0.56);
    book.letterSpacing(0);

    textStyle(NORMAL);
    textSize(width * 0.06);
    text(book.pageNumber, width / 2, height * 0.18);
  }

  book.addPage();
}
