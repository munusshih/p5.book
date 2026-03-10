// title: data-driven book
// description: generate a structured book from an array of data objects

// Each entry in CONCEPTS becomes one interior page.
// Cover and back are handled separately with isFirstPage() / isLastPage().
// This is the same pattern used to generate the p5.book concepts handbook.

const CONCEPTS = [
  { word: "labor",   bg: [20, 20, 20],     fg: [230, 220, 180] },
  { word: "rest",    bg: [230, 220, 200],  fg: [40,  35,  30]  },
  { word: "output",  bg: [180, 60,  40],   fg: [245, 240, 230] },
  { word: "value",   bg: [30,  60,  100],  fg: [210, 225, 245] },
  { word: "time",    bg: [240, 235, 220],  fg: [60,  50,  40]  },
  { word: "agency",  bg: [50,  90,  60],   fg: [220, 240, 220] },
];

let book;

function setup() {
  // +2 pages for cover and back cover
  book = createBook(4, 6, CONCEPTS.length + 2);
  textFont("serif");
}

function draw() {
  if (book.isFirstPage()) {
    // ── cover ──────────────────────────────────────────────────────
    background(10);
    fill(230);
    noStroke();
    textAlign(LEFT, BOTTOM);
    textSize(22);
    text("six\nconcepts", 30, height - 36);

    fill(80);
    textSize(11);
    textAlign(RIGHT, TOP);
    text("p5.book", width - 20, 20);

  } else if (book.isLastPage()) {
    // ── back cover ─────────────────────────────────────────────────
    background(10);
    fill(60);
    textAlign(CENTER, CENTER);
    textSize(12);
    text("a generated book", width / 2, height / 2);

  } else {
    // ── interior pages ─────────────────────────────────────────────
    let concept = CONCEPTS[book.page - 1]; // -1 to skip cover
    background(concept.bg);
    fill(concept.fg);
    noStroke();

    // big word fills the lower half of the page
    textAlign(LEFT, BOTTOM);
    textSize(width * 0.22);
    text(concept.word, 24, height - 30);

    // chapter index in the top-right corner
    fill(concept.fg[0], concept.fg[1], concept.fg[2], 120);
    textAlign(RIGHT, TOP);
    textSize(11);
    textFont("monospace");
    text(book.page + " / " + (book.totalPages - 2), width - 20, 20);
    textFont("serif");
  }

  book.addPage();
}
