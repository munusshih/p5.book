/**
 * p5.book — a simple PDF book generator for p5.js
 *
 * REQUIRES jsPDF:
 * <script src="https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js"></script>
 *
 * USAGE — custom size (default unit: inches)
 * ------------------------------------------
 *   book = createBook(5, 8, 10);              // 5×8 in, 10 pages
 *   book = createBook(15, 20, 10, "cm");      // 15×20 cm, 10 pages
 *   book = createBook(150, 200, 10, "mm");    // 150×200 mm, 10 pages
 *
 * USAGE — named paper size
 * ------------------------
 *   book = createBook("A4", 10);             // A4, 10 pages
 *   book = createBook("letter", 10);         // US letter, 10 pages
 *
 * Supported named sizes: A3, A4, A5, A6, letter, legal, tabloid + more (any jsPDF format)
 * Supported units:       "in" (default), "cm", "mm", "px", "pt"
 *
 * BLEED & PRINT MARKS
 * -------------------
 * Call book.setBleed() in setup(), before the first addPage().
 *
 *   book.setBleed(0.125);      // 1/8" bleed — US standard
 *   book.setBleed(3, "mm");    // 3mm  bleed — European standard
 *
 * After setBleed() is called, book.bleed is a p5.Graphics buffer you can
 * draw into just like the main canvas. Whatever you draw there is scaled to
 * fill the full bleed area (trim + bleed on all sides) in the PDF.
 * The main canvas is composited on top, placed at the trim boundary.
 *
 *   function draw() {
 *     book.bleed.background(img);      // → fills the bleed area
 *     book.bleed.image(photo, 0, 0, width, height);
 *
 *     fill(0);
 *     text("Hello", 50, 50);           // → trim boundary, no scaling
 *
 *     book.addPage();
 *   }
 *
 * Rules:
 *   - book.bleed  → scaled up to fill the full bleed area (background, photos)
 *   - main canvas → placed at trim boundary, 1:1 (text, shapes, UI)
 *   - setBleed() with nothing drawn into book.bleed → bleed area is black
 *
 * To turn marks off:  book.setPrintMarks(false);
 *
 * PROPERTIES
 * ----------
 *   book.page        – current page index, 0-based
 *   book.pageNumber  – current page number, 1-based  (same as book.page + 1)
 *   book.totalPages  – total number of pages
 *   book.progress    – 0.0 → 1.0 across all pages (great for evolving animations)
 *   book.bleedWidth  – trim width  + bleed on both sides (in book units; for reference)
 *   book.bleedHeight – trim height + bleed on both sides (in book units; for reference)
 *
 * METHODS
 * -------
 *   book.addPage()              – capture canvas; PDF saves automatically on the last page
 *   book.setBleed(amount, unit) – add bleed + marks; call in setup() before addPage()
 *   book.setPrintMarks(bool)    – show/hide marks (auto-enabled by setBleed)
 *   book.isFirstPage()          – true when drawing the first page
 *   book.isLastPage()           – true when drawing the last page
 *   book.save([filename])       – manually download the PDF
 *   book.columnNum(n, [gutter]) – set column count for textBox() (like textSize — stays until changed)
 *   book.textBox(str, x, y, w, h) → overflow string
 *                               – draw wrapped text into a box; returns text that didn't fit
 *
 * PROPERTIES (bleed)
 * ------------------
 *   book.bleed       – p5.Graphics buffer for the bleed layer (created by setBleed)
 *   book.bleedWidth  – trim width  + bleed on both sides (in book units; for reference)
 *   book.bleedHeight – trim height + bleed on both sides (in book units; for reference)
 *
 * TEXT FLOW
 * ---------
 *   book.columnNum(n, [gutter]) – set column count for textBox(); stays until changed
 *                                 behaves like textSize() — call once, it sticks
 *   book.textBox(str, x, y, w, h) → string
 *                               – wrap and draw text into a box; inherits current p5
 *                                 font, size, and leading; returns overflow text
 *
 *   // single column
 *   let rest = book.textBox(myText, 40, 40, width - 80, height - 80);
 *
 *   // two columns, flow to next page
 *   book.columnNum(2, 20);
 *   let rest = book.textBox(myText, 40, 40, width - 80, height - 80);
 *   if (rest) { book.addPage(); book.textBox(rest, 40, 40, width - 80, height - 80); }
 */

(function () {
  if (typeof p5 === "undefined") {
    console.error(
      "p5.book: p5.js must be loaded before p5.book.js.\n" +
        "Make sure your <script> tags are in this order:\n" +
        "  1. p5.js\n  2. jsPDF\n  3. p5.book.js",
    );
    return;
  }

  // Units that jsPDF accepts
  const UNITS = ["in", "cm", "mm", "px", "pt"];

  // Millimetres per unit — used to convert bleed amounts between units
  const MM_PER_UNIT = { in: 25.4, cm: 10, mm: 1, pt: 25.4 / 72, px: 25.4 / 96 };

  // ── Text wrapping helper ────────────────────────────────────────────────────
  // Splits `str` into lines that each fit within `maxW` pixels,
  // preserving hard newlines. Uses p5's textWidth() for measurement.
  function _wrapText(p, str, maxW) {
    const out = [];
    for (const para of str.split('\n')) {
      if (para === '') { out.push(''); continue; }
      let line = '';
      for (const word of para.split(' ')) {
        const candidate = line ? line + ' ' + word : word;
        if (line && p.textWidth(candidate) > maxW) {
          out.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }
      if (line) out.push(line);
    }
    return out;
  }

  class Book {
    /**
     * Do not call directly — use createBook() instead.
     *
     * Overloads (mirroring p5.prototype.createBook below):
     *   new Book(p, width, height, pages, [unit], [filename])
     *   new Book(p, sizeName, pages, [filename])
     */
    constructor(
      p,
      widthOrSize,
      heightOrPages,
      totalPagesOrFilename,
      unitOrFilename,
      filenameArg,
    ) {
      if (!window.jspdf) {
        throw new Error(
          "[p5.book] jsPDF not found. Add this before p5.book.js:\n" +
            '<script src="https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js"></script>',
        );
      }

      const { jsPDF } = window.jspdf;
      this._p = p;

      let format, unit, totalPages, filename;

      if (typeof widthOrSize === "string") {
        // Named preset: createBook("A4", pages, filename?)
        format = widthOrSize.toLowerCase();
        totalPages = heightOrPages;
        unit = "mm"; // sensible default for named sizes
        filename =
          typeof totalPagesOrFilename === "string"
            ? totalPagesOrFilename
            : "book.pdf";
      } else {
        // Custom size: createBook(w, h, pages, unit?, filename?)
        format = [widthOrSize, heightOrPages];
        totalPages = totalPagesOrFilename;
        if (UNITS.includes(unitOrFilename)) {
          unit = unitOrFilename;
          filename = filenameArg || "book.pdf";
        } else {
          unit = "in";
          filename = unitOrFilename || "book.pdf";
        }
      }

      this._unit = unit;

      // Build an initial PDF at trim size to read back the canonical dimensions.
      // Rebuilt later if setBleed() is called.
      this._pdf = new jsPDF({ unit, format });

      // Trim size — the final cut dimensions, in the book's unit.
      this._trimW = this._pdf.internal.pageSize.getWidth();
      this._trimH = this._pdf.internal.pageSize.getHeight();
      this._filename = filename;

      // Bleed / marks (off by default)
      this._bleed = 0;
      this._markMargin = 0;
      this._printMarks = false;

      /**
       * A p5.Graphics buffer for the bleed layer.
       * Draw into it exactly like the main canvas — it is composited behind
       * the trim content and scaled to fill the full bleed area in the PDF.
       * Always safe to call; becomes a real buffer after setBleed().
       *
       * @example
       *   book.bleed.background(255, 0, 0); // red bleed layer
       *   book.bleed.image(myPhoto, 0, 0, width, height);
       */
      this.bleed = new Proxy({}, { get: () => () => {} }); // no-op until setBleed()

      /** Captured JPEG data-URLs for each page — used by the viewer. */
      this._pageImages = [];

      /** Column count and gutter for textBox() — like textSize(), stays until changed. */
      this._columns = 1;
      this._columnGutter = 20;

      /** Current page index. 0 = first page (not yet added). */
      this.page = 0;
      /** Total number of pages. */
      this.totalPages = totalPages;
    }

    /**
     * Set bleed and automatically enable crop marks.
     * Must be called in setup(), before addPage().
     *
     * @param {number} amount  – bleed size (in the book's unit by default)
     * @param {string} [unit]  – override unit: "in", "cm", "mm" etc.
     *
     * Common values:
     *   book.setBleed(0.125)       // 1/8" — US standard
     *   book.setBleed(3, "mm")     // 3mm  — European standard
     */
    setBleed(amount, unit) {
      if (this.page > 0) {
        throw new Error("[p5.book] setBleed() must be called before addPage()");
      }
      // Convert to book units so everything stays consistent
      const srcUnit = unit || this._unit;
      const amountMM = amount * (MM_PER_UNIT[srcUnit] || 25.4);
      this._bleed = amountMM / (MM_PER_UNIT[this._unit] || 25.4);

      // Fixed 6mm margin between the trim edge and the crop mark line
      this._markMargin = 6 / (MM_PER_UNIT[this._unit] || 25.4);

      this._printMarks = true;
      this._rebuildPDF();

      // Create the bleed graphics buffer, wrapped in a Proxy so we can detect
      // when the user actually draws into it each frame.
      this._bleedUsed = false;
      const gfx = this._p.createGraphics(this._p.width, this._p.height);
      this.bleed = new Proxy(gfx, {
        get: (target, prop) => {
          const val = target[prop];
          if (typeof val === "function") {
            return (...args) => {
              this._bleedUsed = true;
              return val.apply(target, args);
            };
          }
          return val;
        },
      });
    }

    /**
     * Show or hide crop marks. setBleed() enables them automatically.
     * Call setPrintMarks(false) to turn them off while keeping the bleed.
     * @param {boolean} enabled
     */
    setPrintMarks(enabled) {
      this._printMarks = !!enabled;
    }

    /** Trim width + bleed on both sides, in the book's unit. */
    get bleedWidth() {
      return this._trimW + 2 * this._bleed;
    }

    /** Trim height + bleed on both sides, in the book's unit. */
    get bleedHeight() {
      return this._trimH + 2 * this._bleed;
    }

    // Rebuild the jsPDF doc at the correct page size (trim or trim+bleed+marks).
    _rebuildPDF() {
      const { jsPDF } = window.jspdf;
      const extra = 2 * (this._bleed + this._markMargin);
      this._pdf = new jsPDF({
        unit: this._unit,
        format: [this._trimW + extra, this._trimH + extra],
      });
    }

    /** 1-indexed page number. Easier to display than book.page. */
    get pageNumber() {
      return this.page + 1;
    }

    /**
     * Progress from 0.0 (first page) to 1.0 (last page).
     * Great for animations that slowly evolve across the whole book.
     *
     *   fill(lerp(0, 255, book.progress)); // gets brighter each page
     */
    get progress() {
      return this.totalPages > 1 ? this.page / (this.totalPages - 1) : 1;
    }

    /** True when drawing the first page. */
    isFirstPage() {
      return this.page === 0;
    }

    /** True when drawing the last page. */
    isLastPage() {
      return this.page === this.totalPages - 1;
    }

    /**
     * Capture the current canvas as the next page.
     * Call this once at the end of draw().
     * The PDF saves automatically when the last page is captured.
     */
    addPage() {
      if (this.page > 0) this._pdf.addPage();

      const b = this._bleed;
      const m = this._markMargin;

      if (b > 0 && this._bleedUsed) {
        // ── Composite bleed + trim → one offscreen canvas → single JPEG ───────
        // Avoids storing two large images per page in the PDF data.
        const mainCvs = this._p.canvas;
        const trimPxW = mainCvs.width;
        const trimPxH = mainCvs.height;
        const bleedScale = this.bleedWidth / this._trimW;
        const bleedPxW = Math.round(trimPxW * bleedScale);
        const bleedPxH = Math.round(trimPxH * bleedScale);
        const offX = Math.round(trimPxW * (b / this._trimW));
        const offY = Math.round(trimPxH * (b / this._trimH));

        const off = document.createElement("canvas");
        off.width = bleedPxW;
        off.height = bleedPxH;
        const ctx = off.getContext("2d");

        ctx.drawImage(this.bleed.canvas, 0, 0, bleedPxW, bleedPxH); // bleed fills
        ctx.drawImage(mainCvs, offX, offY); // trim on top

        const pageJpeg = off.toDataURL("image/jpeg", 0.92);
        this._pdf.addImage(
          pageJpeg,
          "JPEG",
          m,
          m,
          this.bleedWidth,
          this.bleedHeight,
        );
        this._pageImages.push(pageJpeg);

        this.bleed.clear();
        this._bleedUsed = false;
      } else if (b > 0) {
        // ── Bleed set but book.bleed not used → trim only ─────────────────────
        const pageJpeg = this._p.canvas.toDataURL("image/jpeg", 0.92);
        this._pdf.addImage(
          pageJpeg,
          "JPEG",
          m + b,
          m + b,
          this._trimW,
          this._trimH,
        );
        this._pageImages.push(pageJpeg);
      } else {
        // ── No bleed → image fills the page exactly ───────────────────────────
        const pageJpeg = this._p.canvas.toDataURL("image/jpeg", 0.92);
        this._pdf.addImage(pageJpeg, "JPEG", 0, 0, this._trimW, this._trimH);
        this._pageImages.push(pageJpeg);
      }

      if (this._printMarks) this._drawPrintMarks();

      this.page++;

      if (this.page >= this.totalPages) {
        this._p.noLoop();
        this._showViewer();
      }
    }

    // Draw trim marks and bleed marks on the current PDF page.
    //
    // Layout (left side cross-section):
    //
    //  0        m      m+b        m+b+trimW  m+2b+trimW  2m+2b+trimW
    //  |←─ m ──→|←─ b ─→|←──── trimW ────→|←─── b ──→|←─── m ──→|
    //  |  margin | bleed |    trim (art)    |   bleed   |  margin  |
    //
    //  Trim marks  → arms in margin zone, aligned to the trim boundary (m+b / m+b+trimW)
    //  Bleed marks → arms in margin zone, aligned to the bleed boundary (m / m+2b+trimW)
    //
    //  Each arm: starts (gap) inside the margin from the boundary, extends (lineLen) outward.
    //  Nothing crosses the bleed or trim areas.
    //
    _drawPrintMarks() {
      const b = this._bleed;
      const m = this._markMargin;
      const pdf = this._pdf;
      const u = MM_PER_UNIT[this._unit] || 25.4;

      const gap = 1 / u; // 1mm gap between boundary and line start
      const lineLen = 4 / u; // 4mm arm length
      const hair = 0.3 / u; // hairline ~0.85pt

      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(hair);

      // Trim boundary (cut line)
      const x0 = m + b,
        y0 = m + b; // trim top-left
      const x1 = x0 + this._trimW,
        y1 = y0 + this._trimH; // trim bottom-right

      // Bleed boundary (outer edge of artwork)
      const bx0 = m,
        by0 = m; // bleed top-left
      const bx1 = x1 + b,
        by1 = y1 + b; // bleed bottom-right

      // ── TRIM MARKS ───────────────────────────────────────────────────────────
      // Arms are in the mark margin, their y/x coordinate = trim line position.
      // Horizontal arms run ←→ from the outer (margin-side) face of the bleed zone.
      // Vertical arms run ↑↓ from the outer face of the bleed zone.

      const tm = (hx1, hx2, hy, vx, vy1, vy2) => {
        pdf.line(hx1, hy, hx2, hy); // horizontal arm
        pdf.line(vx, vy1, vx, vy2); // vertical arm
      };

      // top-left
      tm(
        bx0 - gap,
        bx0 - gap - lineLen,
        y0,
        x0,
        by0 - gap,
        by0 - gap - lineLen,
      );
      // top-right
      tm(
        bx1 + gap,
        bx1 + gap + lineLen,
        y0,
        x1,
        by0 - gap,
        by0 - gap - lineLen,
      );
      // bottom-left
      tm(
        bx0 - gap,
        bx0 - gap - lineLen,
        y1,
        x0,
        by1 + gap,
        by1 + gap + lineLen,
      );
      // bottom-right
      tm(
        bx1 + gap,
        bx1 + gap + lineLen,
        y1,
        x1,
        by1 + gap,
        by1 + gap + lineLen,
      );

      // ── BLEED MARKS ──────────────────────────────────────────────────────────
      // Arms are in the mark margin, aligned to the bleed boundary.
      // Only drawn when there is actually a bleed.

      if (b > 0) {
        const bm = (hx1, hx2, hy, vx, vy1, vy2) => {
          pdf.setLineDashPattern([gap, gap], 0); // dashed to distinguish from trim
          pdf.line(hx1, hy, hx2, hy);
          pdf.line(vx, vy1, vx, vy2);
          pdf.setLineDashPattern([], 0); // reset to solid
        };

        // top-left
        bm(
          bx0 - gap,
          bx0 - gap - lineLen,
          by0,
          bx0,
          by0 - gap,
          by0 - gap - lineLen,
        );
        // top-right
        bm(
          bx1 + gap,
          bx1 + gap + lineLen,
          by0,
          bx1,
          by0 - gap,
          by0 - gap - lineLen,
        );
        // bottom-left
        bm(
          bx0 - gap,
          bx0 - gap - lineLen,
          by1,
          bx0,
          by1 + gap,
          by1 + gap + lineLen,
        );
        // bottom-right
        bm(
          bx1 + gap,
          bx1 + gap + lineLen,
          by1,
          bx1,
          by1 + gap,
          by1 + gap + lineLen,
        );
      }
    }

    /**
     * Launch the built-in viewer overlay. Called automatically after the last page.
     * Shows a flipbook and spread view with Download / Print buttons.
     */
    _showViewer() {
      const images = this._pageImages;
      let currentPage = 0;
      let mode = "flipbook";

      // Inject default styles once. Override any variable or class in your style.css.
      if (!document.getElementById("p5book-styles")) {
        const s = document.createElement("style");
        s.id = "p5book-styles";
        s.textContent = `
          /* ── p5.book viewer — override these in your style.css ── */
          :root {
            --p5book-font:        monospace;
            --p5book-font-size:   20px;
            --p5book-bg:          #ffffff;
            --p5book-toolbar-pad: 12px 20px;
            --p5book-gap:         12px;
          }
          .p5book-viewer {
            position: fixed; inset: 0; z-index: 99999;
            background: var(--p5book-bg);
            display: flex; flex-direction: column;
            font-family: var(--p5book-font);
            font-size: var(--p5book-font-size);
          }
          .p5book-toolbar {
            display: flex; align-items: center;
            gap: var(--p5book-gap);
            padding: var(--p5book-toolbar-pad);
            flex-shrink: 0;
          }
          .p5book-toolbar b  { font-size: var(--p5book-font-size); }
          .p5book-toolbar button,
          .p5book-toolbar select { font-size: var(--p5book-font-size); }
          .p5book-stage {
            flex: 1; overflow: auto;
            display: flex; align-items: flex-start; justify-content: flex-start;
          }
          .p5book-flipbook {
            display: flex; flex-direction: column;
            align-items: center; gap: 20px; padding: 32px;
            margin: auto;
          }
          .p5book-flipbook img {
            max-height: calc(100vh - 160px);
            max-width:  calc(100vw  -  80px);
            display: block;
          }
          .p5book-flipbook-nav {
            display: flex; align-items: center; gap: 16px;
          }
          .p5book-flipbook-nav button,
          .p5book-flipbook-nav select { font-size: var(--p5book-font-size); }
          .p5book-spread {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: var(--p5book-gap); padding: 32px;
            width: 100%; box-sizing: border-box;
            align-items: start;
          }
          .p5book-spread-page {
            display: flex; flex-direction: column;
            align-items: center; gap: 6px; cursor: pointer;
            min-width: 0;
          }
          .p5book-spread-page img  { width: 100%; height: auto; display: block; }
          .p5book-spread-page span { font-size: calc(var(--p5book-font-size) * 0.75); }
        `;
        document.head.appendChild(s);
      }

      // Build viewer
      const viewer = document.createElement("div");
      viewer.className = "p5book-viewer";
      viewer.innerHTML = `
        <div class="p5book-toolbar">
          <b>p5.book</b>
          <button id="p5book-btn-flipbook">flipbook</button>
          <button id="p5book-btn-spread">spread</button>
          <span style="flex:1"></span>
          <button id="p5book-btn-download">download pdf</button>
          <button id="p5book-btn-print">print</button>
        </div>
        <div class="p5book-stage" id="p5book-stage"></div>
      `;
      document.body.appendChild(viewer);

      const stage = viewer.querySelector("#p5book-stage");

      const renderFlipbook = () => {
        stage.innerHTML = `
          <div class="p5book-flipbook">
            <img src="${images[currentPage]}" />
            <div class="p5book-flipbook-nav">
              <button id="p5book-prev" ${currentPage === 0 ? "disabled" : ""}>&larr;</button>
              <select id="p5book-page-select">
                ${images.map((_, i) => `<option value="${i}"${i === currentPage ? " selected" : ""}>p.${i + 1} / ${images.length}</option>`).join("")}
              </select>
              <button id="p5book-next" ${currentPage === images.length - 1 ? "disabled" : ""}>&rarr;</button>
            </div>
          </div>
        `;
        stage.querySelector("#p5book-prev").addEventListener("click", () => {
          if (currentPage > 0) {
            currentPage--;
            renderFlipbook();
          }
        });
        stage.querySelector("#p5book-next").addEventListener("click", () => {
          if (currentPage < images.length - 1) {
            currentPage++;
            renderFlipbook();
          }
        });
        stage
          .querySelector("#p5book-page-select")
          .addEventListener("change", (e) => {
            currentPage = parseInt(e.target.value);
            renderFlipbook();
          });
      };

      const renderSpread = () => {
        stage.innerHTML = `<div class="p5book-spread">${images
          .map(
            (src, i) =>
              `<div class="p5book-spread-page" data-page="${i}">
              <img src="${src}" />
              <span>${i + 1}</span>
            </div>`,
          )
          .join("")}</div>`;
        stage.querySelectorAll(".p5book-spread-page").forEach((el) => {
          el.addEventListener("click", () => {
            currentPage = parseInt(el.dataset.page);
            setMode("flipbook");
          });
        });
      };

      const setMode = (newMode) => {
        mode = newMode;
        viewer.querySelector("#p5book-btn-flipbook").style.fontWeight =
          mode === "flipbook" ? "bold" : "";
        viewer.querySelector("#p5book-btn-spread").style.fontWeight =
          mode === "spread" ? "bold" : "";
        if (mode === "flipbook") renderFlipbook();
        else renderSpread();
      };

      viewer
        .querySelector("#p5book-btn-flipbook")
        .addEventListener("click", () => setMode("flipbook"));
      viewer
        .querySelector("#p5book-btn-spread")
        .addEventListener("click", () => setMode("spread"));
      viewer
        .querySelector("#p5book-btn-download")
        .addEventListener("click", () => this.save());
      viewer
        .querySelector("#p5book-btn-print")
        .addEventListener("click", () => {
          const blob = this._pdf.output("blob");
          const url = URL.createObjectURL(blob);
          const win = window.open(url, "_blank");
          if (win)
            win.addEventListener("load", () => URL.revokeObjectURL(url), {
              once: true,
            });
        });

      document.addEventListener("keydown", (e) => {
        if (mode !== "flipbook") return;
        if (e.key === "ArrowLeft" && currentPage > 0) {
          currentPage--;
          renderFlipbook();
        }
        if (e.key === "ArrowRight" && currentPage < images.length - 1) {
          currentPage++;
          renderFlipbook();
        }
      });

      setMode("flipbook");
    }

    /**
     * Manually save the PDF. Called automatically after the last page.
     * @param {string} [filename] – overrides the filename set in createBook()
     */
    save(filename) {
      this._pdf.save(filename || this._filename);
    }

    /**
     * Set the number of columns for subsequent textBox() calls.
     * Works like textSize() — call it once and it stays until you change it.
     * With no arguments, returns the current column count.
     *
     * @param {number} n           – number of columns (≥ 1)
     * @param {number} [gutter=20] – gap between columns, in pixels
     * @returns {number|Book}      – column count when called with no args, otherwise `this`
     *
     * @example
     *   book.columnNum(2);      // two equal columns, 20px gutter
     *   book.columnNum(3, 30);  // three columns, 30px gutter
     *   book.columnNum(1);      // back to single column
     */
    columnNum(n, gutter) {
      if (n === undefined) return this._columns;
      this._columns = Math.max(1, Math.floor(n));
      if (gutter !== undefined) this._columnGutter = gutter;
      return this;
    }

    /**
     * Draw text into a rectangular box, wrapping words automatically.
     * Inherits the current p5 text state — font, size, leading, fill, alignment.
     * Respects hard newlines in the source string.
     *
     * If book.columnNum(n) has been set, the box is divided into n equal columns
     * and text flows left-to-right through each column in order.
     *
     * Returns the text that did not fit, so you can continue it on the next page
     * or column by calling textBox() again with the same arguments.
     *
     * @param {string} str – text to draw
     * @param {number} x   – left edge of the box, in pixels
     * @param {number} y   – top edge of the box, in pixels
     * @param {number} w   – total width of the box, in pixels
     * @param {number} h   – height of the box, in pixels
     * @returns {string}   – overflow text (empty string if everything fit)
     *
     * @example
     *   // single column
     *   let overflow = book.textBox(myText, 40, 40, width - 80, height - 80);
     *
     * @example
     *   // two columns, flow into next page if needed
     *   book.columnNum(2, 24);
     *   let overflow = book.textBox(myText, 40, 40, width - 80, height - 80);
     *   if (overflow) {  // there's more — addPage() then continue
     *     book.addPage();
     *     overflow = book.textBox(overflow, 40, 40, width - 80, height - 80);
     *   }
     */
    textBox(str, x, y, w, h) {
      const p       = this._p;
      const cols    = this._columns;
      const gutter  = this._columnGutter;
      const colW    = (w - gutter * (cols - 1)) / cols;
      const leading = p.textLeading() || p.textSize() * 1.25;
      const ascent  = p.textAscent();
      const maxLines = Math.max(1, Math.floor((h - ascent) / leading) + 1);

      const lines = _wrapText(p, str, colW);
      let lineIdx = 0;

      for (let col = 0; col < cols && lineIdx < lines.length; col++) {
        const cx = x + col * (colW + gutter);
        for (let i = 0; i < maxLines && lineIdx < lines.length; i++) {
          p.text(lines[lineIdx], cx, y + ascent + i * leading);
          lineIdx++;
        }
      }

      return lines.slice(lineIdx).join('\n');
    }
  }

  /**
   * Create a new Book. Call this inside setup().
   *
   * @overload
   * @param {string} sizeName   – named paper size: "A4", "A5", "letter", "legal", etc.
   * @param {number} totalPages – number of pages to generate
   * @param {string} [filename] – output filename (default: "book.pdf")
   *
   * @overload
   * @param {number} width      – page width  in `unit`
   * @param {number} height     – page height in `unit`
   * @param {number} totalPages – number of pages to generate
   * @param {string} [unit]     – "in" (default), "cm", "mm", "px", "pt"
   * @param {string} [filename] – output filename (default: "book.pdf")
   *
   * @returns {Book}
   */
  p5.prototype.createBook = function (
    widthOrSize,
    heightOrPages,
    totalPagesOrFilename,
    unitOrFilename,
    filenameArg,
  ) {
    return new Book(
      this,
      widthOrSize,
      heightOrPages,
      totalPagesOrFilename,
      unitOrFilename,
      filenameArg,
    );
  };
})();
