// title: typography
// description: book.letterSpacing() — one letter per page, alternating black and white
//
// book.letterSpacing(px)
//   Adjusts CSS letter-spacing for text drawn in draw().
//   Negative values tighten tracking; positive values loosen it.
//   Persists like textSize() — always reset to 0 when done.
//   Applied to both the main canvas and the bleed layer.
//
// This example also shows a data-driven pattern:
//   book.page (0-based) is used as an index into a string.
//   totalPages is set to the string length so each character gets one page.
//
// TRY: Change WORD to your own word, name, or short phrase.
//      Adjust letterSpacing values — try large positives like 12 or 20.

const WORD = "SILENCE";

let book;

function setup() {
  book = createBook(4, 6, WORD.length); // one page per letter
  book.setDPI(150);
  textFont("serif");
}

function draw() {
  let letter = WORD[book.page]; // index into the string with the 0-based page
  let dark = book.page % 2 === 0; // alternate black / white spreads

  background(dark ? 10 : 245);
  fill(dark ? 245 : 10);
  noStroke();

  // tighten on dark pages, loosen on light — letterSpacing shifts the feel
  book.letterSpacing(dark ? -2 : 4);

  textSize(width * 0.85);
  textAlign(CENTER, CENTER);
  text(letter, width / 2, height * 0.56);

  book.letterSpacing(0); // always reset — it persists like textSize()

  book.addPage();
}
