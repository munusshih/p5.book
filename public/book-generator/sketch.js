let book;
let concepts = [];
let currentConcept;
const margin = 20;
let tocPages = 1;
let gradient;

async function setup() {
  try {
    const data = await loadJSON("concepts.json");
    concepts = data.concepts;
    concepts.sort((a, b) => a.term_en.localeCompare(b.term_en));
    tocPages = 7;
  } catch (error) {
    concepts = [];
  }
  // Total: cover + flyleaf + preface + tocTitle + tocPages + blank + concepts + flyleaf + flyleaf + postface + lastPage
  book = createBook(5, 8, 4 + tocPages + 1 + concepts.length + 4);
  book.setSpread(true);
  book.setDPI(350);
  book.setBleed(0.05);
  book.setSaddleStitch(true);
  // book.set3DBackground("#f5f0e8");
  // book.set3DEdgeColor("#2a1f14");
  book.showColorPickers(false);

  // Draw spine artwork
  book.spine.draw((g) => {
    g.background(0);
    g.noStroke();
    g.textFont("Times");

    // English title — rotated bottom-to-top (Western spine convention)
    g.push();
    g.translate(g.width / 2, g.height * 0.5);
    g.rotate(HALF_PI);
    g.fill(120);
    g.textSize(18);
    g.textLeading(g.textSize() * 1.2);
    g.textAlign(CENTER, CENTER);
    g.drawingContext.letterSpacing = "-0.5px";
    g.text(
      "100 Ways We Accidentally Fall Back Into Neoliberalism: A Dictionary             CoAssembly Design co-op",
      0,
      0,
    );
    g.pop();
  });

  // Store which effect to use (0-4)
  const effectChoice = 2; // Change this to pick: 0=noise, 1=waves, 2=radial, 3=dots, 4=geometric

  textAlign(LEFT, TOP);
  textFont("Times");

  // Store effect index for use in drawing functions
  window.bgEffectChoice = effectChoice;
  textAlign(LEFT, TOP);
  textFont("Times");

  // Draw all pages in setup
  drawCoverPage();
  book.addPage();
  flyleaf(1);
  book.addPage();
  preface();
  book.addPage();
  tableOfContentsFirst();
  book.addPage();
  for (let i = 1; i <= tocPages; i++) {
    background(0);
    drawTOCPage(i);
    if (i === tocPages) {
      clear();
      drawBackgroundEffect(0, book.bleed);
      book.bleed.background(0, 0, 0, 200);
    }
    book.addPage();
  }
  background(0);
  book.addPage();
  for (let i = 0; i < concepts.length; i++) {
    background(0);
    drawConceptPage(concepts[i], i);
    book.addPage();
  }
  flyleaf(1);
  book.addPage();
  flyleaf(1);
  book.addPage();
  postface();
  book.addPage();
  drawLastPage();
  book.addPage();
}

function draw() {}

function preface() {
  fill(220);
  noStroke();
  textAlign(CENTER, CENTER);
  book.letterSpacing(0);

  textSize(14);
  textLeading(textSize() * 1.6);
  text(
    "This book compiles 100 concepts related to labor, work, and capitalism, each with a dilemma and a possible solution.\n\nEach entry presents a real workplace situation and offers a practical path forward.\n\n本書彙編了100個與勞動、\n工作和資本主義相關的概念，\n每個概念都伴有一個困境和\n可能的解決方案。\n\n每個條目呈現一個真實的\n工作場景，並提供了一條\n切實可行的前進道路。",
    width / 4,
    margin,
    width / 2,
    height - margin * 6,
  );
}

function postface() {
  fill(220);
  noStroke();
  textAlign(CENTER, CENTER);
  book.letterSpacing(0);

  textSize(14);
  textLeading(textSize() * 1.6);
  text(
    "We hope these concepts and solutions provide you with tools to navigate the complexities of modern work.\n\nRemember: another way is possible.\n\n我們希望這些概念和解決方案\n能為您提供應對現代工作複雜性的工具。\n\n記住：另一種方式是可能的。",
    width / 4,
    margin,
    width / 2,
    height - margin * 6,
  );
}

function flyleaf(num) {
  if (num === 1) {
    clear();
    drawBackgroundEffect(3, book.bleed);
    book.bleed.background(0, 0, 0, 200);
  } else if (num === 2) {
    fill("red");
    noStroke();
    rect(0, 0, width, height);
  }
}

function drawBackgroundEffect(effectChoice = undefined, target = undefined) {
  const g =
    target &&
    typeof target.background === "function" &&
    typeof target.rect === "function"
      ? target
      : null;

  const canvasWidth = g ? g.width : width;
  const canvasHeight = g ? g.height : height;

  // Context proxy: routes drawing calls to graphics object or global p5 functions
  const ctx = new Proxy(
    {},
    {
      get(target, prop) {
        return (...args) => {
          const fn = g ? g[prop] : window[prop];
          return fn?.(...args);
        };
      },
    },
  );

  ctx.noStroke();
  const choice =
    effectChoice !== undefined ? effectChoice : window.bgEffectChoice || 2;

  switch (choice) {
    case 0:
      // Effect 1: Organic Noise Pattern
      for (let y = 0; y < canvasHeight; y += 5) {
        for (let x = 0; x < canvasWidth; x += 5) {
          const n = noise(x * 0.005, y * 0.005);
          const c = int(n * 255);
          ctx.fill(c);
          ctx.rect(x, y, 5, 5);
        }
      }
      break;

    case 1:
      // Effect 2: Wave Pattern
      ctx.background(20);
      ctx.noFill();
      ctx.stroke(255);
      for (let i = 0; i < 10; i++) {
        const lineWeight = map(i, 0, 9, 0.8, 4);
        ctx.strokeWeight(lineWeight);
        ctx.beginShape();
        for (let x = 0; x < canvasWidth; x += 10) {
          const y = canvasHeight / 2 + sin(x * 0.01 + i * 0.3) * 80 + i * 20;
          ctx.vertex(x, y);
        }
        ctx.endShape();
      }
      break;

    case 2:
      // Effect 3: Radial Burst with Concentric Circles
      ctx.background(15);
      ctx.noFill();
      ctx.stroke(255);
      const maxRadius = max(canvasWidth * 2, canvasHeight * 2);
      for (let i = 50; i < maxRadius; i += 50) {
        const ringWeight = map(i, 50, maxRadius - 50, 0.8, 1);
        ctx.strokeWeight(ringWeight);
        ctx.ellipse(canvasWidth / 2, canvasHeight / 2, i, i);
      }
      // Add radiating lines
      ctx.stroke(255);
      const totalRays = 360 / 15;
      for (let i = 0; i < 360; i += 15) {
        const rayIndex = i / 15;
        ctx.strokeWeight(1);
        const x1 = canvasWidth / 2;
        const y1 = canvasHeight / 2;
        const x2 = x1 + cos(radians(i)) * maxRadius;
        const y2 = y1 + sin(radians(i)) * maxRadius;
        ctx.line(x1, y1, x2, y2);
      }
      break;

    case 3:
      // Effect 4: Halftone Dot Pattern with Color Variation
      ctx.background(25);
      for (let y = 0; y < canvasHeight; y += 20) {
        for (let x = 0; x < canvasWidth; x += 20) {
          const n = noise(x * 0.008, y * 0.008);
          const size = n * 18;
          const hueVal = int(((x + y) / (canvasWidth + canvasHeight)) * 255);
          ctx.fill(150 + int(n * 100));
          ctx.circle(x + 10, y + 10, size);
        }
      }
      break;

    case 4:
      // Effect 5: Geometric Tessellation
      ctx.background(20);
      ctx.stroke(255);
      ctx.strokeWeight(1.5);
      const cellSize = 40;
      for (let y = 0; y < canvasHeight; y += cellSize) {
        for (let x = 0; x < canvasWidth; x += cellSize) {
          const pattern = ((x + y) / cellSize) % 3;
          ctx.noFill();
          if (pattern < 1) {
            // Diagonal lines
            ctx.line(x, y, x + cellSize, y + cellSize);
            ctx.line(x + cellSize, y, x, y + cellSize);
          } else if (pattern < 2) {
            // Circle
            ctx.fill(0, 0, 0, 30);
            ctx.circle(x + cellSize / 2, y + cellSize / 2, cellSize * 0.7);
          } else {
            // Grid
            ctx.rect(x, y, cellSize, cellSize);
          }
        }
      }
      break;
  }
}

function drawLastPage() {
  // Apply cool background effect
  clear();
  drawBackgroundEffect(2, book.bleed);
  book.bleed.background(0, 0, 0, 200);

  noStroke();
  book.letterSpacing(0);

  // English description
  fill(200);
  textAlign(LEFT, TOP);
  textSize(16);
  textLeading(textSize() * 1.2);
  text(
    'This book presents 100 concepts and dilemmas you encounter in contemporary workplaces. Beyond identifying problems, each entry offers practical solutions and alternative ways forward. Whether you\'re navigating corporate hierarchies, grappling with precarity, or imagining collective futures, these concepts provide tools for resistance and rethinking. From "Bullshit Jobs" to "Wage Theft," from "Burnout" to "Care Work," we explore the contradictions that define modern labor under capitalism and chart other possibilities.',
    margin * 2,
    margin * 2,
    width - margin * 4,
  );

  // Chinese description with proper wrapping
  textSize(13.5);
  textLeading(textSize() * 1.6);
  const maxChineseWidth = width - margin * 4;
  book.textBox(
    "本書呈現100個當代工作場所中的概念與困境。除了認識問題，每一條目都提供實踐性的解決方案與另類前進道路。無論你正在應對企業階級制度、掌握不穩定性，或想像集體未來，這些概念為抵抗與反思提供工具。從「狗屁工作」到「薪資竊盜」，從「倦怠」到「照顧工作」，我們探索定義資本主義下現代勞動的矛盾，並繪製其他可能性。",
    margin * 2,
    margin * 12,
    maxChineseWidth,
    height - margin * 14,
  );

  // Publisher info at bottom
  fill(200);
  textAlign(CENTER, BOTTOM);
  textSize(16);
  textLeading(textSize() * 1.3);
  text(
    "Published by CoAssembly Design co-op\n集合設計合作社出版",
    margin,
    height - margin * 2,
    width - margin * 2,
  );
}

function tableOfContentsFirst() {
  clear();
  drawBackgroundEffect(0, book.bleed);
  book.bleed.background(0, 0, 0, 200);
  fill(220);
  textSize(32);
  textAlign(LEFT, TOP);
  text("Table of Contents", margin, margin);
}

function drawConceptPage(concept, i) {
  // Background already set in draw()
  fill(120);
  noStroke();

  // Reset alignment for content
  textAlign(LEFT, TOP);
  textSize(32);
  textLeading(textSize() * 1.2);

  // Concept title
  const termWithParens = concept.term_en.replace(/^(.)/, "($1)");
  text(
    `${termWithParens}\n${concept.term_zh}`,
    margin,
    margin,
    width - margin * 2,
  );

  // Generate unique procedural icon (width, height can be adjusted here)
  push();
  translate(width / 2, height / 3);
  drawProceduralIcon(concept.term_en, width / 3, width / 3); // width, height
  pop();

  // Dilemma
  fill(200);
  textSize(14);
  textLeading(textSize() * 1.4);
  textAlign(LEFT, TOP);

  let maxWidth = width / 2 - margin * 2;
  book.textBox(
    `${concept.dilemma}\n\n${concept.solution}`,
    margin,
    (height / 7) * 4,
    maxWidth,
    height - (height / 7) * 4 - margin * 4,
  );

  textLeading(textSize() * 1.2);
  if (concept.dilemma_en) {
    maxWidth = width / 2 - margin * 2;
    text(
      `${concept.dilemma_en}\n\n${concept.solution_en}`,
      width / 2,
      (height / 7) * 4,
      maxWidth,
    );
  }

  // Add page number with spread-aware positioning
  fill(200);
  textSize(12);
  textLeading(textSize() * 1.2);

  if (book.isLeftPage()) {
    textAlign(LEFT, BOTTOM);
    text(book.pageNumber, margin, height - margin);
  } else {
    textAlign(RIGHT, BOTTOM);
    text(book.pageNumber, width - margin, height - margin);
  }
}

function drawCoverPage() {
  // Apply cool background effect
  drawBackgroundEffect(2, book.bleed);
  book.bleed.background(0, 0, 0, 200);

  fill(120);
  noStroke();
  book.letterSpacing(0);
  textAlign(CENTER, TOP);

  // Title - English
  textSize(80);
  textLeading(textSize() * 0.8);
  book.letterSpacing(-2);
  text(
    "100 Ways We Accidentally Fall Back Into Neoliberalism: A Dictionary",
    margin,
    margin * 3,
    width - margin * 2,
  );
  // Icon
  push();
  translate(width / 2, height * 0.65);
  drawProceduralIcon("100 Ways", width / 2, width / 2);
  pop();

  // Publisher
  fill(200);
  textSize(28);
  book.letterSpacing(0);
  textLeading(textSize() * 1.2);
  text(
    "我們不小心又陷入新自由主義的\n100種方式：一本字典",
    margin,
    height - margin * 6,
    width - margin * 2,
  );
}

function drawTOCPage(pageNum) {
  fill(200);

  const entriesPerPage = 17;
  const startIndex = (pageNum - 1) * entriesPerPage;
  const endIndex = Math.min(startIndex + entriesPerPage, concepts.length);

  let y = margin;
  let currentLetter = "";

  for (let i = startIndex; i < endIndex; i++) {
    const concept = concepts[i];
    const pageNumber = 6 + tocPages + i;
    const firstLetter = concept.term_en.charAt(0).toUpperCase();

    if (firstLetter !== currentLetter) {
      if (currentLetter) {
        y += 14;
      }
      currentLetter = firstLetter;
      fill(255);
      textSize(32);
      text(`(${firstLetter})`, margin, y);
      y += textSize() + 14;
    }

    textSize(14);
    textStyle(NORMAL);
    // Entry text
    fill(255);
    text(concept.term_en, margin + 20, y);
    fill(120);
    text(concept.term_zh, margin + 20 + textWidth(concept.term_en) + 10, y);

    fill(255);
    textAlign(RIGHT, TOP);
    text(pageNumber, width - margin, y);

    textAlign(LEFT, TOP);
    y += textSize() * 1.25;
  }
}

// Generate consistent hash from string for icon selection
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

// Draw barcode from API (using free barcode.tec-it.com service)

// Generate unique procedural icon based on concept name
function drawProceduralIcon(conceptName, w, h) {
  const hash = hashCode(conceptName);

  // Extract different parts of hash for various properties
  const shapeType = Math.abs(hash) % 35; // 35 different base shapes
  const numPoints = 3 + (Math.abs(hash >> 4) % 10); // 3-12 points
  const layers = 1 + (Math.abs(hash >> 8) % 4); // 1-4 layers
  const rotation = (hash >> 12) % 360;
  const symmetry = Math.abs(hash >> 16) % 3; // 0=none, 1=mirror, 2=radial
  const innerDetail = Math.abs(hash >> 20) % 4; // 0-3 different inner patterns
  const strokePattern = Math.abs(hash >> 24) % 8; // 0-7 different stroke patterns

  noFill();
  stroke(255);
  strokeWeight(1.5);

  // Set stroke pattern - most will be solid (0-2), fewer with patterns (3-7)
  if (strokePattern === 3) {
    drawingContext.setLineDash([5, 5]); // medium dash
  } else if (strokePattern === 4) {
    drawingContext.setLineDash([2, 4]); // dotted
  } else if (strokePattern === 5) {
    drawingContext.setLineDash([10, 5]); // long dash
  } else if (strokePattern === 6) {
    drawingContext.setLineDash([10, 5, 2, 5]); // dash-dot
  } else if (strokePattern === 7) {
    drawingContext.setLineDash([3, 3]); // short dash
  }

  push();
  rotate(radians(rotation));

  for (let layer = 0; layer < layers; layer++) {
    const layerW = w * (1 - layer * 0.2);
    const layerH = h * (1 - layer * 0.2);
    const layerRotation = (hash >> (layer * 4)) % 90;

    push();
    rotate(radians(layerRotation));

    switch (shapeType) {
      case 0: // Ellipse with inner details
        ellipse(0, 0, layerW, layerH);
        if (innerDetail > 0 && layer === 0) {
          drawInnerPattern(layerW / 2, layerH / 2, innerDetail, numPoints);
        }
        break;
      case 1: // Polygon
        drawPolygon(0, 0, layerW / 2, numPoints);
        break;
      case 2: // Star
        drawStar(0, 0, layerW / 4, layerW / 2, numPoints);
        break;
      case 3: // Radial lines
        drawRadialLines(0, 0, layerW / 2, numPoints);
        break;
      case 4: // Spiral
        drawSpiral(0, 0, layerW / 2, 3 + (hash % 4));
        break;
      case 5: // Concentric shapes
        drawConcentricShapes(0, 0, layerW / 2, numPoints, 2 + layer);
        break;
      case 6: // Grid pattern
        drawGridPattern(0, 0, layerW, layerH, 3 + (numPoints % 4));
        break;
      case 7: // Wave pattern
        drawWavePattern(0, 0, layerW / 2, numPoints);
        break;
      case 8: // Cross/Plus with variations
        drawCrossPattern(0, 0, layerW / 2, layerH / 2, numPoints % 4);
        break;
      case 9: // Mandala-like pattern
        drawMandalaPattern(0, 0, layerW / 2, numPoints);
        break;
      case 10: // Arrow pointing up
        drawArrow(0, 0, layerW / 2, layerH / 2, 0);
        break;
      case 11: // Double arrow (bidirectional)
        drawDoubleArrow(0, 0, layerW / 2, layerH / 2);
        break;
      case 12: // Circular arrows
        drawCircularArrows(0, 0, layerW / 2, (numPoints % 4) + 2);
        break;
      case 13: // Triangle with inner lines
        drawTrianglePattern(0, 0, layerW / 2, numPoints % 5);
        break;
      case 14: // Hexagon honeycomb
        drawHexPattern(0, 0, layerW / 2);
        break;
      case 15: // Zigzag pattern
        drawZigzag(0, 0, layerW / 2, layerH / 2, numPoints);
        break;
      case 16: // Eye/leaf shape
        drawEyeShape(0, 0, layerW / 2, layerH / 2);
        break;
      case 17: // Concentric circles with connecting lines
        drawConnectedCircles(0, 0, layerW / 2, (numPoints % 6) + 3);
        break;
      case 18: // Diamond grid
        drawDiamondGrid(0, 0, layerW / 2, layerH / 2, 2 + (numPoints % 3));
        break;
      case 19: // Flower/petal pattern
        drawFlowerPattern(0, 0, layerW / 2, numPoints);
        break;
      case 20: // Infinity symbol
        drawInfinity(0, 0, layerW / 2, layerH / 2);
        break;
      case 21: // Lightning bolt
        drawLightning(0, 0, layerW / 2, layerH / 2);
        break;
      case 22: // Concentric rectangles
        drawConcentricRects(0, 0, layerW, layerH, (numPoints % 4) + 2);
        break;
      case 23: // Checkered pattern
        drawCheckered(0, 0, layerW, layerH, 3 + (numPoints % 4));
        break;
      case 24: // Sunburst rays
        drawSunburst(0, 0, layerW / 2, layerH / 2, numPoints);
        break;
      case 25: // DNA helix
        drawHelix(0, 0, layerW / 2, layerH / 2, numPoints);
        break;
      case 26: // Mountain peaks
        drawMountains(0, 0, layerW / 2, layerH / 2, (numPoints % 5) + 3);
        break;
      case 27: // Brackets
        drawBrackets(0, 0, layerW / 2, layerH / 2);
        break;
      case 28: // Ripple circles
        drawRipples(0, 0, layerW / 2, layerH / 2, (numPoints % 5) + 3);
        break;
      case 29: // Target/bullseye
        drawTarget(0, 0, layerW / 2, layerH / 2, (numPoints % 4) + 3);
        break;
      case 30: // Sine wave
        drawSineWave(0, 0, layerW / 2, layerH / 2, (numPoints % 4) + 2);
        break;
      case 31: // Asterisk/star burst
        drawAsterisk(0, 0, layerW / 2, layerH / 2, numPoints);
        break;
      case 32: // Parentheses
        drawParens(0, 0, layerW / 2, layerH / 2);
        break;
      case 33: // Pyramid/triangle stack
        drawPyramid(0, 0, layerW / 2, layerH / 2, (numPoints % 5) + 2);
        break;
      case 34: // Circuit pattern
        drawCircuit(0, 0, layerW / 2, layerH / 2, (numPoints % 4) + 3);
        break;
    }

    pop();
  }

  // Reset dash pattern
  drawingContext.setLineDash([]);
  pop();
}

function drawInnerPattern(w, h, type, divisions) {
  switch (type) {
    case 1: // Inner ellipse
      ellipse(0, 0, w, h);
      break;
    case 2: // Cross lines
      line(-w, 0, w, 0);
      line(0, -h, 0, h);
      break;
    case 3: // Inner star points
      for (let i = 0; i < divisions; i++) {
        const angle = (TWO_PI / divisions) * i;
        line(0, 0, cos(angle) * w, sin(angle) * h);
      }
      break;
  }
}

function drawConcentricShapes(x, y, radius, npoints, count) {
  for (let i = 0; i < count; i++) {
    const r = radius * (1 - i / count);
    drawPolygon(x, y, r, npoints);
  }
}

function drawGridPattern(x, y, w, h, divisions) {
  const stepX = w / divisions;
  const stepY = h / divisions;
  for (let i = -divisions / 2; i <= divisions / 2; i++) {
    line(x + i * stepX, y - h / 2, x + i * stepX, y + h / 2);
    line(x - w / 2, y + i * stepY, x + w / 2, y + i * stepY);
  }
}

function drawWavePattern(x, y, radius, waves) {
  beginShape();
  for (let i = 0; i <= waves * 20; i++) {
    const angle = (TWO_PI / (waves * 20)) * i;
    const r = radius + sin(i * waves) * (radius * 0.2);
    const sx = x + cos(angle) * r;
    const sy = y + sin(angle) * r;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

function drawCrossPattern(x, y, w, h, variation) {
  switch (variation) {
    case 0: // Simple cross
      line(x - w, y, x + w, y);
      line(x, y - h, x, y + h);
      break;
    case 1: // X cross
      line(x - w, y - h, x + w, y + h);
      line(x - w, y + h, x + w, y - h);
      break;
    case 2: // Both + and X
      line(x - w, y, x + w, y);
      line(x, y - h, x, y + h);
      line(x - w, y - h, x + w, y + h);
      line(x - w, y + h, x + w, y - h);
      break;
    case 3: // Triple cross
      for (let i = 0; i < 3; i++) {
        push();
        rotate((TWO_PI / 3) * i);
        line(x, y - h, x, y + h);
        pop();
      }
      break;
  }
}

function drawMandalaPattern(x, y, radius, petals) {
  for (let i = 0; i < petals; i++) {
    const angle = (TWO_PI / petals) * i;
    push();
    rotate(angle);
    ellipse(x, y + radius / 2, radius / 3, radius * 0.6);
    pop();
  }
}

function drawPolygon(x, y, radius, npoints) {
  beginShape();
  for (let i = 0; i < npoints; i++) {
    const angle = (TWO_PI / npoints) * i - HALF_PI;
    const sx = x + cos(angle) * radius;
    const sy = y + sin(angle) * radius;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

function drawStar(x, y, radius1, radius2, npoints) {
  beginShape();
  for (let i = 0; i < npoints * 2; i++) {
    const angle = (TWO_PI / (npoints * 2)) * i - HALF_PI;
    const r = i % 2 === 0 ? radius2 : radius1;
    const sx = x + cos(angle) * r;
    const sy = y + sin(angle) * r;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

function drawRadialLines(x, y, radius, nlines) {
  for (let i = 0; i < nlines; i++) {
    const angle = (TWO_PI / nlines) * i;
    const sx = x + cos(angle) * radius;
    const sy = y + sin(angle) * radius;
    line(x, y, sx, sy);
  }
}

function drawSpiral(x, y, radius, turns) {
  beginShape();
  const steps = turns * 20;
  for (let i = 0; i < steps; i++) {
    const angle = (TWO_PI / 20) * i;
    const r = (radius / steps) * i;
    const sx = x + cos(angle) * r;
    const sy = y + sin(angle) * r;
    vertex(sx, sy);
  }
  endShape();
}

function drawArrow(x, y, w, h, direction) {
  push();
  rotate(direction);
  // Arrow shaft
  line(x, y - h, x, y + h);
  // Arrow head
  line(x, y - h, x - w / 3, y - h + h / 3);
  line(x, y - h, x + w / 3, y - h + h / 3);
  pop();
}

function drawDoubleArrow(x, y, w, h) {
  // Horizontal shaft
  line(x - w, y, x + w, y);
  // Left arrow head
  line(x - w, y, x - w + w / 3, y - h / 4);
  line(x - w, y, x - w + w / 3, y + h / 4);
  // Right arrow head
  line(x + w, y, x + w - w / 3, y - h / 4);
  line(x + w, y, x + w - w / 3, y + h / 4);
}

function drawCircularArrows(x, y, radius, count) {
  for (let i = 0; i < count; i++) {
    const angle = (TWO_PI / count) * i;
    push();
    translate(x, y);
    rotate(angle);
    // Curved arrow
    arc(0, 0, radius * 1.5, radius * 1.5, -PI / 4, PI / 4);
    // Arrow head
    const headAngle = PI / 4;
    const hx = cos(headAngle) * radius * 0.75;
    const hy = sin(headAngle) * radius * 0.75;
    line(hx, hy, hx - radius / 6, hy + radius / 6);
    pop();
  }
}

function drawTrianglePattern(x, y, size, innerLines) {
  // Outer triangle
  drawPolygon(x, y, size, 3);
  // Inner parallel lines
  for (let i = 1; i <= innerLines; i++) {
    const s = size * (1 - i / (innerLines + 1));
    drawPolygon(x, y, s, 3);
  }
}

function drawHexPattern(x, y, size) {
  // Center hexagon
  drawPolygon(x, y, size, 6);
  // Surrounding hexagons
  for (let i = 0; i < 6; i++) {
    const angle = (TWO_PI / 6) * i;
    const hx = x + cos(angle) * size;
    const hy = y + sin(angle) * size;
    drawPolygon(hx, hy, size / 2, 6);
  }
}

function drawZigzag(x, y, w, h, points) {
  beginShape();
  for (let i = 0; i <= points; i++) {
    const px = x - w + (i / points) * w * 2;
    const py = y + (i % 2 === 0 ? -h / 2 : h / 2);
    vertex(px, py);
  }
  endShape();
}

function drawEyeShape(x, y, w, h) {
  // Left curve
  arc(x, y, w * 2, h * 2, -PI, 0);
  // Right curve
  arc(x, y, w * 2, h * 2, 0, PI);
  // Inner ellipse
  ellipse(x, y, w, h);
}

function drawConnectedCircles(x, y, radius, count) {
  const centerCircle = radius / 3;
  circle(x, y, centerCircle * 2);

  for (let i = 0; i < count; i++) {
    const angle = (TWO_PI / count) * i;
    const cx = x + cos(angle) * radius;
    const cy = y + sin(angle) * radius;
    circle(cx, cy, centerCircle);
    line(x, y, cx, cy);
  }
}

function drawDiamondGrid(x, y, w, h, count) {
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      const dx = x - w + (i / (count - 1)) * w * 2;
      const dy = y - h + (j / (count - 1)) * h * 2;
      push();
      translate(dx, dy);
      rotate(PI / 4);
      rect(-w / (count * 2), -h / (count * 2), w / count, h / count);
      pop();
    }
  }
}

function drawFlowerPattern(x, y, size, petals) {
  // Center
  circle(x, y, size / 4);
  // Petals
  for (let i = 0; i < petals; i++) {
    const angle = (TWO_PI / petals) * i;
    const px = x + (cos(angle) * size) / 2;
    const py = y + (sin(angle) * size) / 2;
    circle(px, py, size / 3);
  }
}

function drawInfinity(x, y, w, h) {
  // Infinity symbol using bezier curves
  beginShape();
  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * TWO_PI;
    const px = x + (w * cos(t)) / (1 + sin(t) * sin(t));
    const py = y + (h * sin(t) * cos(t)) / (1 + sin(t) * sin(t));
    vertex(px, py);
  }
  endShape(CLOSE);
}

function drawLightning(x, y, w, h) {
  beginShape();
  vertex(x, y - h);
  vertex(x + w / 4, y - h / 3);
  vertex(x - w / 8, y);
  vertex(x + w / 2, y + h / 3);
  vertex(x, y + h);
  vertex(x - w / 4, y + h / 4);
  vertex(x + w / 8, y - h / 4);
  vertex(x - w / 2, y - h / 2);
  endShape(CLOSE);
}

function drawConcentricRects(x, y, w, h, count) {
  for (let i = 0; i < count; i++) {
    const rw = w * (1 - i / count);
    const rh = h * (1 - i / count);
    rect(x - rw / 2, y - rh / 2, rw, rh);
  }
}

function drawCheckered(x, y, w, h, divisions) {
  const cellW = w / divisions;
  const cellH = h / divisions;
  for (let i = 0; i < divisions; i++) {
    for (let j = 0; j < divisions; j++) {
      if ((i + j) % 2 === 0) {
        const cx = x - w / 2 + i * cellW;
        const cy = y - h / 2 + j * cellH;
        rect(cx, cy, cellW, cellH);
      }
    }
  }
}

function drawSunburst(x, y, w, h, rays) {
  for (let i = 0; i < rays; i++) {
    const angle = (TWO_PI / rays) * i;
    const x1 = x + cos(angle) * (w / 4);
    const y1 = y + sin(angle) * (h / 4);
    const x2 = x + cos(angle) * w;
    const y2 = y + sin(angle) * h;
    line(x1, y1, x2, y2);
  }
}

function drawHelix(x, y, w, h, coils) {
  beginShape();
  for (let i = 0; i <= coils * 20; i++) {
    const t = (i / 20) * TWO_PI;
    const px = x + cos(t) * w * 0.3;
    const py = y + (i / (coils * 20) - 0.5) * h * 2;
    vertex(px, py);
  }
  endShape();

  beginShape();
  for (let i = 0; i <= coils * 20; i++) {
    const t = (i / 20) * TWO_PI + PI;
    const px = x + cos(t) * w * 0.3;
    const py = y + (i / (coils * 20) - 0.5) * h * 2;
    vertex(px, py);
  }
  endShape();
}

function drawMountains(x, y, w, h, peaks) {
  beginShape();
  vertex(x - w, y + h);
  for (let i = 0; i <= peaks; i++) {
    const px = x - w + (i / peaks) * w * 2;
    const py = i % 2 === 0 ? y - h : y + h / 2;
    vertex(px, py);
  }
  vertex(x + w, y + h);
  endShape();
}

function drawBrackets(x, y, w, h) {
  // Left bracket
  beginShape();
  vertex(x - w + w / 4, y - h);
  vertex(x - w, y - h);
  vertex(x - w, y + h);
  vertex(x - w + w / 4, y + h);
  endShape();

  // Right bracket
  beginShape();
  vertex(x + w - w / 4, y - h);
  vertex(x + w, y - h);
  vertex(x + w, y + h);
  vertex(x + w - w / 4, y + h);
  endShape();
}

function drawRipples(x, y, w, h, count) {
  for (let i = 1; i <= count; i++) {
    const radiusW = (w / count) * i;
    const radiusH = (h / count) * i;
    ellipse(x, y, radiusW * 2, radiusH * 2);
  }
}

function drawTarget(x, y, w, h, rings) {
  for (let i = rings; i > 0; i--) {
    const radiusW = (w / rings) * i;
    const radiusH = (h / rings) * i;
    ellipse(x, y, radiusW * 2, radiusH * 2);
  }
}

function drawSineWave(x, y, w, h, cycles) {
  beginShape();
  for (let i = 0; i <= 100; i++) {
    const px = x - w + (i / 100) * w * 2;
    const py = y + sin((i / 100) * TWO_PI * cycles) * h;
    vertex(px, py);
  }
  endShape();
}

function drawAsterisk(x, y, w, h, points) {
  for (let i = 0; i < points; i++) {
    const angle = (TWO_PI / points) * i;
    const x2 = x + cos(angle) * w;
    const y2 = y + sin(angle) * h;
    line(x, y, x2, y2);
  }
}

function drawParens(x, y, w, h) {
  // Left parenthesis
  arc(x - w / 2, y, w, h * 2, -HALF_PI, HALF_PI);
  // Right parenthesis
  arc(x + w / 2, y, w, h * 2, HALF_PI, PI + HALF_PI);
}

function drawPyramid(x, y, w, h, levels) {
  for (let i = 0; i < levels; i++) {
    const levelW = w * (1 - i / levels);
    const levelY = y + h - (i / levels) * h * 2;
    line(x - levelW, levelY, x + levelW, levelY);
  }
  // Sides
  line(x - w, y + h, x, y - h);
  line(x + w, y + h, x, y - h);
}

function drawCircuit(x, y, w, h, nodes) {
  // Main lines
  line(x - w, y, x + w, y);
  line(x, y - h, x, y + h);

  // Circuit nodes
  for (let i = 0; i < nodes; i++) {
    const angle = (TWO_PI / nodes) * i;
    const nx = x + cos(angle) * w * 0.7;
    const ny = y + sin(angle) * h * 0.7;
    circle(nx, ny, w / 8);
    line(x, y, nx, ny);
  }
}
