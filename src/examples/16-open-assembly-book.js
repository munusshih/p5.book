// title: open assembly
// description: a 3D letter system unfolded across 100 pages with a front and back cover

let book;
let bookFont;
let letterGroups = [];
let easingFunction;

const TOTAL_PAGES = 100;
const PAGE_THICKNESS_MM = 0.12;

const config = {
  myColor: "#9C4BFF",
  animationCurve: "easeInOutCubic",
  lineLength: 1,
  childDistance: 100,
  parentFontSize: 160,
  childFontSize: 80,
  scaling: 1.5,
  textBackground: "withBackground",
};

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

function linear(t) {
  return t;
}

function easeInQuart(t) {
  return t ** 4;
}

function easeOutBounce(t) {
  const n = 7.5625;
  const d = 2.75;

  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) {
    t -= 1.5 / d;
    return n * t * t + 0.75;
  }
  if (t < 2.5 / d) {
    t -= 2.25 / d;
    return n * t * t + 0.9375;
  }

  t -= 2.625 / d;
  return n * t * t + 0.984375;
}

function easeInOutSine(t) {
  return -(cos(PI * t) - 1) / 2;
}

const easingFunctions = {
  linear,
  easeInOutCubic,
  easeInQuart,
  easeOutBounce,
  easeInOutSine,
};

function getEasingFunction(name) {
  return easingFunctions[name] || easeInOutCubic;
}

class LetterGroup {
  constructor(letters, position, rotationMatrix) {
    this.letters = letters;
    this.startPos = createVector(...position);
    this.currentPos = this.startPos.copy();
    this.baseRotation = [
      -QUARTER_PI / 2,
      QUARTER_PI / 2,
      QUARTER_PI / 2,
    ];
    this.currentRotation = [...this.baseRotation];
    this.rotationMatrix = rotationMatrix;
    this.child1Rotation = 0;
    this.child2Rotation = 0;
    this.noiseOffsets = [random(1000), random(1000)];
  }

  update(progress) {
    const eased = easingFunction(progress);

    this.currentPos = p5.Vector.lerp(
      this.startPos,
      createVector(0, 0, 0),
      eased,
    );

    for (let i = 0; i < 3; i++) {
      this.currentRotation[i] =
        this.baseRotation[i] +
        progress * TWO_PI * 1.5 * this.rotationMatrix[i];
    }

    this.child1Rotation = progress * TWO_PI * 2;
    this.child2Rotation = progress * TWO_PI * 2;
  }

  display(progress) {
    push();
    rotateX(this.currentRotation[0]);
    rotateY(this.currentRotation[1]);
    rotateZ(this.currentRotation[2]);
    scale(config.scaling);
    translate(this.currentPos.x, this.currentPos.y, this.currentPos.z);
    this.generateText(
      this.letters[0],
      this.letters[1],
      this.letters[2],
      progress,
    );
    pop();
  }

  generateText(parent, child1, child2, progress) {
    const unit = 120 + sin(progress * TWO_PI * 2) * 80;
    const t = progress * 4;
    const parentPos = createVector(0, 0, unit);
    const child1Pos = createVector(
      -config.childDistance / 2 +
        (noise(t + this.noiseOffsets[0]) - 0.5) * 300,
      unit + (noise(t + 10 + this.noiseOffsets[0]) - 0.5) * 300,
      0,
    );
    const child2Pos = createVector(
      unit -
        config.childDistance / 2 +
        (noise(t + 20 + this.noiseOffsets[1]) - 0.5) * 100,
      config.childDistance +
        (noise(t + 30 + this.noiseOffsets[1]) - 0.5) * 100,
      0,
    );

    push();
    translate(parentPos.x, parentPos.y, parentPos.z);
    textSize(config.parentFontSize);
    drawLetter(parent, config.myColor);
    pop();

    if (child1) {
      push();
      translate(child1Pos.x, child1Pos.y, child1Pos.z);
      rotateX(this.child1Rotation);
      textSize(config.childFontSize);
      drawLetter(child1, "white");
      pop();
    }

    if (child2) {
      push();
      translate(child2Pos.x, child2Pos.y, child2Pos.z);
      rotateY(this.child2Rotation);
      textSize(config.childFontSize);
      drawLetter(child2, "white");
      pop();
    }

    stroke("#aaa");
    strokeWeight(config.lineLength);
    if (child1) {
      line(
        parentPos.x,
        parentPos.y,
        parentPos.z,
        child1Pos.x,
        child1Pos.y,
        child1Pos.z,
      );
    }
    if (child2) {
      line(
        parentPos.x,
        parentPos.y,
        parentPos.z,
        child2Pos.x,
        child2Pos.y,
        child2Pos.z,
      );
    }
  }
}

function drawLetter(letter, color) {
  if (config.textBackground === "withBackground") {
    push();
    translate(0, 0, -1);
    scale(1.01);
    fill("black");
    noStroke();
    text(letter, 0, 0);
    pop();
  }

  fill(color);
  noStroke();
  text(letter, 0, 0);
}

async function setup() {
  createCanvas(600, 600, WEBGL);
  book = createBook(6, 6, TOTAL_PAGES, { autoCanvas: false });
  book.setDPI(120);
  book.setViewerMode("3d");
  book.setPageThickness(PAGE_THICKNESS_MM, "mm");

  bookFont = await loadFont("/fonts/ApfelGrotezk-Mittel.woff");
  textFont(bookFont);
  textAlign(CENTER, CENTER);

  drawSpine();

  randomSeed(42);
  noiseSeed(42);
  easingFunction = getEasingFunction(config.animationCurve);

  const positions = [
    [-125, -150, 0],
    [125, -150, 0],
    [-125, 100, 0],
    [125, 100, 0],
  ];
  const groups = [
    [["O", "A", "S"], [1, 1, 0]],
    [["P", "S", "E"], [1, 0, 1]],
    [["E", "M", "B"], [0, 1, 1]],
    [["N", "L", "Y"], [1, 0, 1]],
  ];

  letterGroups = groups.map(
    ([letters, rotation], i) =>
      new LetterGroup(letters, positions[i], rotation),
  );
}

function draw() {
  if (book.isFirstPage()) {
    drawCover();
  } else if (book.isLastPage()) {
    drawBackCover();
  } else {
    drawInterior();
  }

  book.addPage();
}

function drawSpine() {
  book.spine.draw((spine) => {
    spine.background(config.myColor);
    spine.fill("black");
    spine.noStroke();
    spine.textFont(bookFont);
    spine.textAlign(CENTER, CENTER);

    spine.push();
    spine.translate(spine.width / 2, spine.height / 2);
    spine.rotate(-HALF_PI);
    spine.textSize(Math.max(11, spine.width * 0.52));
    spine.text("OPEN ASSEMBLY", 0, 0);
    spine.pop();
  });
}

function drawCover() {
  background(config.myColor);
  fill("black");
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(86);
  textLeading(78);
  text("OPEN\nASSEMBLY", 0, -35);
  textSize(18);
  textLeading(24);
  text("A 100-PAGE\nCOMPUTATIONAL BOOK", 0, 220);
}

function drawBackCover() {
  background("black");
  fill(config.myColor);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(58);
  textLeading(56);
  text("SOURCE CODE\nBECOMES\nA BOOK", 0, -25);
  fill("white");
  textSize(16);
  text("MADE WITH P5.JS + P5.BOOK", 0, 240);
}

function drawInterior() {
  // Clear once, then let every new page build on the pages before it.
  if (book.pageNumber === 2) {
    background(0);
  }

  const progress = book.progress;

  for (const group of letterGroups) {
    group.update(progress);
    group.display(progress);
  }
}
