// title: Parametric Flipbook
// description: Parametric curves rendered page by page from one equation.

let book;
const FONT_FAMILY = "Helvetica Neue, Helvetica, Arial, sans-serif";
const BOOK_TITLE = "This Is a Computational Flipbook Generated with p5.book.\n\nThe Parametric Curves Are Rendered Page-by-Page from a Single Equation in p5.js";
const BOOK_WIDTH = 85;
const BOOK_HEIGHT = 148;
const BOOK_PAGES = 300;
const BOOK_UNIT = "mm";
const BOOK_BLEED = 3;
const BOOK_DPI = 300;

function setup() {
  pixelDensity(3);
  textFont(FONT_FAMILY);
  textStyle(BOLD);

  book = createBook(BOOK_WIDTH, BOOK_HEIGHT, BOOK_PAGES, BOOK_UNIT);
  book.setBleed(BOOK_BLEED, BOOK_UNIT);
  book.setDPI(BOOK_DPI);
  book.setSpread(true);
  book.set3DEdgeColor(["#000", "#000", "#000"]);
  book.setViewerMode("3d")

  textAlign(LEFT, TOP);
}

function draw() {
  drawSpine();
  background(0);
  textFont(FONT_FAMILY);
  textStyle(BOLD);
  fill("white");
  textSize(50);
  noStroke();

  if (book.page === 0) {
    drawCoverPage();
  } else if (book.page === book.totalPages - 1) {
    drawBackPage();
  } else {
    const innerIndex = book.page - 1;
    if (innerIndex % 2 === 0) {
      drawBlankPage();
    } else {
      drawContentPage();
    }
  }

  book.addPage();
}

function drawSpine() {
  book.spine.draw((g) => {
    g.background(0);
    g.noFill();
    g.stroke(200);
    g.strokeWeight(1);

    const margin = 20;
    const spacing = 18;
    const count = floor((g.height - 2 * margin) / spacing);

    for (let i = 0; i < count; i++) {
      const p = count > 1 ? i / (count - 1) : 0;
      const params = getShapeParams(p);
      const y = margin + i * spacing;

      g.push();
      g.translate(g.width / 2, y);
      g.beginShape();
      for (let theta = 0; theta < TWO_PI * params.cycles; theta += 0.05) {
        const x = params.A * 0.06 * sin(params.a * theta + params.delta);
        const yy = params.B * 0.04 * cos(params.b * theta + params.delta);
        g.vertex(x, yy);
      }
      g.endShape();
      g.pop();
    }
  });
}

function drawCoverPage() {
  book.bleed.background(0);
  push();
  textSize(50);
  textLeading(50);
  text(
    BOOK_TITLE.toUpperCase(),
    20,
    20,
    width - 60,
  );
  text("Created by\nMunus Shih", 20, height - 120, width - 40);
  pop();
}

function drawBackPage() {
  const ts = new Date().toISOString().replace("T", " ").replace("Z", " UTC");
  push();
  textSize(50);
  textLeading(50);
  text(
    "Printed by 墨跡設計印刷 Moji Design in Hsinchu, Taiwan\n\nThe Book Was Created at\n".toUpperCase() +
      ts.toUpperCase(),
    20,
    20,
    width - 40,
  );
  pop();
}

function drawBlankPage() {
  const innerIndex = book.page - 1;
  const contentIndex = floor(innerIndex / 2);
  const totalContentPages = floor((book.totalPages - 2) / 2);
  const progress = contentIndex / max(1, totalContentPages - 1);
  const params = getShapeParams(progress);

  background(0);
  fill("white");
  textSize(16);
  text(
    [
      "x = A * sin(a * theta + delta)",
      "y = B * cos(b * theta + delta)",
      "",
      "A = " + nf(params.A, 1, 2),
      "B = " + nf(params.B, 1, 2),
      "a = " + nf(params.a, 1, 2),
      "b = " + nf(params.b, 1, 2),
      "Delta = " + nf(params.delta, 1, 2),
      "Cycles = " + nf(params.cycles, 1, 2),
      "Progress = " + nf(progress, 1, 3),
      "Theta Step = 0.01",
    ].join("\n"),
    20,
    20,
    width - 40,
  );
}

function drawContentPage() {
  const innerIndex = book.page - 1;
  const contentIndex = floor(innerIndex / 2);
  const totalContentPages = floor((book.totalPages - 2) / 2);
  const progress = contentIndex / max(1, totalContentPages - 1);
  const params = getShapeParams(progress);

  text("Page " + (contentIndex + 1), 20, 20, width - 40);

  noFill();
  stroke(255);
  strokeWeight(1);
  translate(width / 2, height / 2);

  beginShape();
  for (let theta = 0; theta < TWO_PI * params.cycles; theta += 0.01) {
    vertex(
      params.A * sin(params.a * theta + params.delta),
      params.B * cos(params.b * theta + params.delta),
    );
  }
  endShape();
}

function getShapeParams(progress) {
  return {
    A: 100 + sin(progress * TWO_PI) * 200,
    B: 100 + cos(progress * TWO_PI + 1000) * 200,
    a: 0.5 + progress * 6,
    b: 0.5 + progress * 4,
    delta: progress * PI * 10,
    cycles: constrain(5 + progress * 15, 5, 20),
  };
}
