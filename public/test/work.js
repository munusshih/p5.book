let book;
let font1;
let font2;

async function setup() {
  book = createBook("letter", 26);
  // Larger bleed for easier visual verification in the test harness.
  // Switch back to 0.125 for production-style output.
  book.setBleed(5, "mm");
  book.setCropMarks(false);
  book.setViewSpread(true);
  book.setExportSpread(false);
  book.setDPI(300);
  book.setPageThickness(3);
  book.setViewerMode("flipbook");
  book.setSeparateCoverStock(true);
  font1 = await loadFont("../fonts/ApfelGrotezk-Brukt.woff");
  font2 = await loadFont("../fonts/ApfelGrotezk-Mittel.woff");
  textAlign(CENTER, CENTER);

  // Use a loud color so inner spine is obvious on cover PDF page 2.
  book.innerSpine = "#00ffd0";
  book.spine.background("orange");
  book.spine.push();
  book.spine.translate(book.spine.width / 2, book.spine.height / 2);
  book.spine.textAlign(CENTER, CENTER);
  book.spine.textSize(70);
  book.spine.textFont(font2);
  book.spine.fill("black");
  book.spine.rotate(HALF_PI);
  book.spine.text("p5.book       From A to Z", 0, 0);
  book.spine.pop();
}

function draw() {
  const bg = book.isLeftPage() ? "orange" : "black";
  const fg = book.isLeftPage() ? "black" : "orange";

  // Draw full bleed background.
  book.bleed.background("hotpink");

  // Draw trim content differently so the bleed border is visually obvious.
  background(bg);

  if (book.isLeftPage()) {
    textFont(font2);
  } else {
    textFont(font1);
  }
  fill(fg);
  textSize(350);
  let letter = String.fromCharCode(65 + book.page);
  text(letter, width / 2, height / 2);

  // Trim frame cue: this marks the trim canvas area so bleed margin is obvious.
  noFill();
  stroke(fg);
  strokeWeight(8);
  rect(20, 20, width - 40, height - 40);
  noStroke();

  // Visual checks for separate-cover-stock cover page 2 ordering.
  // Expected order on page 2: FIRST INTERIOR | inner spine | LAST INTERIOR.
  textSize(42);
  if (book.page === 1) {
    text("FIRST INTERIOR", width / 2, height - 90);
  }
  if (book.page === book.totalPages - 2) {
    text("LAST INTERIOR", width / 2, height - 90);
  }

  book.addPage();
}
