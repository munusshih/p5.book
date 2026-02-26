// ─────────────────────────────────────────────────────────────────────────────
// 08 — text flow
//
// book.textBox() wraps text automatically and returns whatever didn't fit.
// Each draw() frame renders one page, passing the overflow to the next.
//
// setup() is async so we can fetch a real Wikipedia article before starting.
// draw() stays paused (noLoop) until the text arrives, then loop() kicks it off.
// ─────────────────────────────────────────────────────────────────────────────

const PAD = 40;
let book;
let overflow = "";

async function setup() {
  createCanvas(400, 600);
  pixelDensity(2);

  book = createBook(4, 6);
  textFont("Georgia");
  textSize(8);
  textLeading(12);
  book.columnNum(2, 16);

  // Fetch plain text from Wikipedia (origin=* enables CORS)
  const url =
    "https://en.wikipedia.org/w/api.php?action=query" +
    "&titles=The_Hitchhiker%27s_Guide_to_the_Galaxy" +
    "&prop=extracts&explaintext=true&format=json&origin=*";

  const res = await fetch(url);
  const data = await res.json();
  const pages = data.query.pages;
  overflow = pages[Object.keys(pages)[0]].extract;
}

function draw() {
  background(0);
  fill(255);
  noStroke();

  if (overflow) {
    overflow = book.textBox(
      overflow,
      PAD,
      PAD,
      width - PAD * 2,
      height - PAD * 2,
    );
  }

  book.addPage();

  if (!overflow) {
    book.finish(); // all text placed — show viewer and save PDF
  }
}
