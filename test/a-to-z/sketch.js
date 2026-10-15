let book;
let font1;
let font2;

async function setup() {
  book = createBook(2, 9, 10, "in");
  book.setSpread(true);
  book.setDPI(300);
  book.setPageThickness(3, "mm");
  font1 = await loadFont("./ApfelGrotezk-Brukt.otf");
  font2 = await loadFont("./ApfelGrotezk-Mittel.otf");
  textAlign(CENTER, CENTER);

 // ADAPTIVE SPINE TYPOGRAPHY

book.spine.background("orange");

book.spine.push();

book.spine.translate(
  book.spine.width / 2,
  book.spine.height / 2
);

  console.log(min(width, height))

book.spine.rotate(HALF_PI);
book.spine.textAlign(CENTER, CENTER);
book.spine.textFont(font2);
book.spine.fill("black");

// TEXT — EDIT FREELY
const spineText = "p5.bookFrom A to Z p5.bookFrom A to Z";

// SPINE DIMENSIONS
const spineLength = book.spine.height;
const spineWidth = book.spine.width;

// RESPONSIVE MARGINS
const marginLength = spineLength * 0.05;
const marginWidth = spineWidth * 0.08;

// AVAILABLE SPACE
const availableLength = Math.max(
  0,
  spineLength - marginLength * 2
);

const availableWidth = Math.max(
  0,
  spineWidth - marginWidth * 2
);

// REFERENCE DESIGN
const referenceLength = 800;
const referenceFontSize = 70;

// PROPORTIONAL FONT SIZE
const proportionalSize =
  referenceFontSize * (spineLength / referenceLength);

book.spine.textSize(proportionalSize);

// MEASURE TEXT
const textLength = book.spine.textWidth(spineText);

const textHeight =
  book.spine.textAscent() +
  book.spine.textDescent();

// FIT TEXT TO AVAILABLE SPACE
const lengthScale =
  textLength > 0
    ? availableLength / textLength
    : 1;

const widthScale =
  textHeight > 0
    ? availableWidth / textHeight
    : 1;

// FINAL FONT SIZE
const finalScale = Math.max(
  0,
  Math.min(1, lengthScale, widthScale)
);

const fontSize = proportionalSize * finalScale;

book.spine.textSize(fontSize);

// CENTER THE TEXT
book.spine.text(spineText, 0, 0);

book.spine.pop();;
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
  textSize(min(width, height)*0.8);
  let letter = String.fromCharCode(65 + book.page);
  text(letter, width / 2, height / 2);

  book.addPage();
}
