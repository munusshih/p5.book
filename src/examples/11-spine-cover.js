// title: spine & cover
// description: book.spine.draw(), saveCover(), setPageThickness(), set3DBackground(), set3DEdgeColor()
//
// book.spine
//   A p5.Graphics buffer whose width = computed spine thickness
//   (page count × setPageThickness()) and height matches the canvas.
//   Draw on it to customize the spine face in the 3D viewer and cover PDF.
//   If you never draw on it, a default dark gradient + filename is shown.
//
// book.spine.draw(fn)
//   Scoped drawing helper — fn receives the graphics object as `g`.
//   Draw here once in setup() since the spine doesn't change per page.
//
// book.setPageThickness(mm)
//   Thickness of one leaf (two-sided sheet) in mm. Default: 0.1 mm.
//   More pages × thicker stock = wider spine in the 3D viewer and cover PDF.
//
// book.saveCover([filename])
//   Downloads a landscape PDF: back cover · spine · front cover, side by side.
//   Ready for commercial print upload. Access via viewer download menu too.
//
// book.set3DBackground(cssColor)  — backdrop color in the 3D viewer.
// book.set3DEdgeColor(cssColor)   — page edge color in the 3D viewer.
//   Pass an array [fore, top, bottom] for individual edge colors.
//
// TRY: Switch to 3D view in the viewer to see your spine in context.
//      Open download → Cover to get the print-ready cover spread.
//      Increase pages to 80 to see a much thicker spine.

let book;

function setup() {
  book = createBook(4, 6, 40); // more pages = wider spine
  book.setDPI(150);
  book.setPageThickness(0.12); // 0.12 mm per leaf (standard uncoated stock)

  // 3D viewer appearance
  book.set3DBackground("#f0ece8");
  book.set3DEdgeColor(["#d4c9b8", "#e0d8cc", "#c8bfb0"]); // fore · top · bottom

  // Draw the spine once in setup — it's static, not per-page
  book.spine.draw((g) => {
    g.background(20);
    g.noStroke();
    g.fill(200);
    g.push();
    g.translate(g.width / 2, g.height / 2);
    g.rotate(-HALF_PI); // text bottom → top (Western spine convention)
    g.textSize(g.width * 0.55);
    g.textAlign(CENTER, CENTER);
    g.text("SPINE DEMO", 0, 0);
    g.pop();
  });
}

function draw() {
  let t = book.progress;

  if (book.isFirstPage()) {
    // ── front cover ──────────────────────────────────────────────────────────
    background(20);
    fill(240);
    noStroke();
    textAlign(LEFT, BOTTOM);
    textSize(30);
    text("spine\ndemo", 28, height - 32);

    fill(80);
    textSize(11);
    textAlign(RIGHT, TOP);
    text("p5.book", width - 20, 22);

  } else if (book.isLastPage()) {
    // ── back cover ───────────────────────────────────────────────────────────
    background(20);
    fill(80);
    noStroke();
    textAlign(CENTER, BOTTOM);
    textSize(12);
    text("made with p5.book", width / 2, height - 24);

  } else {
    // ── interior pages: hue sweeps using book.progress ───────────────────────
    let h = (t * 300) % 360;
    colorMode(HSB, 360, 100, 100);
    background(h, 35, 94);
    fill(h, 70, 25);
    noStroke();
    textSize(48);
    textAlign(CENTER, CENTER);
    text(book.pageNumber, width / 2, height / 2);
    colorMode(RGB);
  }

  book.addPage();
}
