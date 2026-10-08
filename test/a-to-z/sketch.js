// title: From A to Z
// description: An alphabet book with orange and black typographic spreads.

let book;
let font1;
let font2;

async function setup() {
  book = createBook(5, 8, 26, "in");
  book.setSpread(true);
  book.setDPI(300);
  book.setPageThickness(3);
  font1 = await loadFont("./ApfelGrotezk-Brukt.otf");
  font2 = await loadFont("./ApfelGrotezk-Mittel.otf");
  textAlign(CENTER, CENTER);

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
  if (book.isLeftPage()) {
    background("orange");
    fill("black");
    textFont(font2);
  } else {
    background("black");
    fill("orange");
    textFont(font1);
  }
  textSize(350);
  let letter = String.fromCharCode(65 + book.page);
  text(letter, width / 2, height / 2);

  book.addPage();
}
