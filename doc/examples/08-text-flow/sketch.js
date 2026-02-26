// ─────────────────────────────────────────────────────────────────────────────
// 08 — text flow
//
// book.textBox() wraps text into a box automatically, reading the current
// font/size/leading from p5 — no extra settings needed.
//
// It returns the text that didn't fit. When there's overflow, call addPage()
// and pass the leftover back in on the next draw() frame.
//
// book.columnNum(n) tells the book how many columns to use for every
// subsequent textBox() call — works like textSize(): set once, stays until
// you change it.
// ─────────────────────────────────────────────────────────────────────────────

const STORY = `In the beginning the Universe was created. This had made many people very angry and has been widely regarded as a bad move.

There is a theory which states that if ever anyone discovers exactly what the Universe is for and why it is here, it will instantly disappear and be replaced by something even more bizarre and inexplicable.

There is another theory which states that this has already happened.

Far out in the uncharted backwaters of the unfashionable end of the Western Spiral arm of the Galaxy lies a small unregarded yellow sun. Orbiting this at a distance of roughly ninety-two million miles is an utterly insignificant little blue-green planet whose ape-descended life forms are so amazingly primitive that they still think digital watches are a pretty neat idea.

This planet has, or rather had, a problem, which was this: most of the people living on it were unhappy for pretty much of the time. Many solutions were suggested for this problem, but most of these were largely concerned with the movements of small green pieces of paper, which is odd because on the whole it wasn't the small green pieces of paper that were unhappy.`;

let book;
let overflow;
const PAD = 40;

function setup() {
  createCanvas(400, 600);
  pixelDensity(2);
  book = createBook(4, 6, 12);

  textFont("Georgia");
  textSize(15);
  textLeading(24);

  book.columnNum(2, 20); // two columns, 20px gutter — stays for all textBox calls

  overflow = STORY; // start with the full text
}

function draw() {
  background(255);
  fill(0);
  noStroke();

  overflow = book.textBox(overflow, PAD, PAD, width - PAD * 2, height - PAD * 2);

  book.addPage();

  if (!overflow) noLoop(); // all text placed — stop generating pages early
}
