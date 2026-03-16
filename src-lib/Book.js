import { UNITS, MM_PER_UNIT } from "./constants.js";
import { showViewer } from "./viewer.js";
import progressStyles from "./progress.css";

export class Book {
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

    // ── Extract options object (can appear in any trailing positional arg) ─
    const _isOpts = (v) =>
      v !== null &&
      v !== undefined &&
      typeof v === "object" &&
      !Array.isArray(v);
    let opts = {};
    if (_isOpts(filenameArg)) {
      opts = filenameArg;
      filenameArg = undefined;
    } else if (_isOpts(unitOrFilename)) {
      opts = unitOrFilename;
      unitOrFilename = undefined;
    } else if (_isOpts(totalPagesOrFilename)) {
      opts = totalPagesOrFilename;
      totalPagesOrFilename = undefined;
    }
    // Image encoding options (suggestion #2)
    this._imageType = (opts.imageType || "jpeg").toLowerCase();
    this._jpegQuality = opts.jpegQuality ?? 0.92;
    const autoCanvas = opts.autoCanvas !== false; // suggestion #1
    this._progressBarOverlay = opts.progressBar === true; // full overlay opt-in; default = transparent corner counter

    let format, unit, totalPages, filename;

    if (typeof widthOrSize === "string") {
      format = widthOrSize.toLowerCase();
      totalPages = heightOrPages;
      unit = "mm";
      filename =
        typeof totalPagesOrFilename === "string"
          ? totalPagesOrFilename
          : "book.pdf";
    } else {
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

    // Guard: warn if totalPages looks wrong (suggestion #13)
    if (
      totalPages !== undefined &&
      totalPages !== null &&
      typeof totalPages !== "number"
    ) {
      console.warn(
        "[p5.book] totalPages should be a number or omitted; got:",
        totalPages,
      );
      totalPages = null;
    }

    this._unit = unit;
    this._pdf = new jsPDF({
      unit,
      format,
      orientation: Array.isArray(format) && format[0] > format[1] ? "l" : "p",
    });
    // Store trim dimensions directly from the user-supplied values for custom formats,
    // rather than reading back from jsPDF which may normalise or reorder them.
    if (Array.isArray(format)) {
      this._trimW = format[0];
      this._trimH = format[1];
    } else {
      this._trimW = this._pdf.internal.pageSize.getWidth();
      this._trimH = this._pdf.internal.pageSize.getHeight();
    }

    // Create canvas with the correct aspect ratio automatically (suggestion #1: opt-out).
    if (autoCanvas) {
      const defaultCanvasW = 500;
      const defaultCanvasH = Math.round(
        (defaultCanvasW * this._trimH) / this._trimW,
      );
      this._p.createCanvas(defaultCanvasW, defaultCanvasH);
    }
    this._filename = filename;
    this._bleed = 0;
    this._printMarks = false;
    this._spread = false;
    this._saddleStitch = false;
    this._rtl = false;
    this._dpi = null;
    this._pageThickMM = 0.1; // mm per leaf (one sheet = two pages)
    this._3dColors = { bg: null, edge: ["#f0ece4", "#f0ece4", "#f0ece4"] };
    this._3dHideColors = false;
    this._viewerMode = "flipbook";
    this._bleedWarnedOnce = false; // suggestion #17
    this.bleed = new Proxy(
      {},
      {
        get: (_, prop) => {
          // suggestion #17: warn once if bleed is accessed before setBleed()
          if (!this._bleedWarnedOnce) {
            this._bleedWarnedOnce = true;
            console.warn(
              "[p5.book] book.bleed accessed before setBleed() — calls are no-ops. " +
                "Add book.setBleed(amount) in setup() to enable bleed.",
            );
          }
          return prop === "draw" ? () => {} : () => {};
        },
      },
    );
    // ── spine — lazy-init getter (suggestion #3) ─────────────────────────
    this._spineGfx = null;
    this._pageImages = [];
    this._rawCanvases = [];
    this._columns = 1;
    this._columnGutter = 20;
    this._page = 0; // backing field — use book.page getter to read (suggestion #14)
    this.totalPages = totalPages != null ? totalPages : null;
    this._progressEl = null;
    this._viewerShown = false;
    this._pagesProcessed = 0; // increments inside rAF so browser can paint each step
    this._pageQueue = Promise.resolve();
    this._addPageOverflowWarned = false;
    if (this.totalPages != null) this._createProgressUI();
  }

  _createProgressUI() {
    if (!document.getElementById("p5book-progress-styles")) {
      const s = document.createElement("style");
      s.id = "p5book-progress-styles";
      s.textContent = progressStyles;
      document.head.appendChild(s);
    }
    const v = this._progressBarOverlay ? "overlay" : "corner";
    const label = this._progressBarOverlay
      ? `rendering page 0 / ${this.totalPages}`
      : `0 / ${this.totalPages}`;
    const el = document.createElement("div");
    el.id = "p5book-progress";
    el.className = `is-${v}`;
    el.innerHTML = `
      <div id="p5book-prog-label" class="is-${v}">${label}</div>
      <div class="p5book-prog-track is-${v}">
        <div id="p5book-prog-bar" class="is-${v}"></div>
      </div>
    `;
    document.body.appendChild(el);
    this._progressEl = el;
  }

  _updateProgressUI() {
    if (!this._progressEl) return;
    const pct = Math.round((this._pagesProcessed / this.totalPages) * 100);
    const bar = this._progressEl.querySelector("#p5book-prog-bar");
    const lbl = this._progressEl.querySelector("#p5book-prog-label");
    if (bar) bar.style.width = pct + "%";
    if (lbl)
      lbl.textContent = this._progressBarOverlay
        ? `rendering page ${this._pagesProcessed} / ${this.totalPages}`
        : `${this._pagesProcessed} / ${this.totalPages}`;
  }

  _removeProgressUI() {
    if (this._progressEl) {
      this._progressEl.remove();
      this._progressEl = null;
    }
  }

  /** Current page index (0-based). Read-only. */
  get page() {
    return this._page;
  }

  /** A p5.Graphics buffer for the spine face. Created lazily on first access.
   *  Width is proportional to the computed spine thickness; height matches the canvas.
   *  Call draw(fn) for a scoped helper, or use p5 methods directly. */
  get spine() {
    if (!this._spineGfx) {
      const trimHmm = this._trimH * (MM_PER_UNIT[this._unit] || 25.4);
      const spineMM = Math.max(
        3,
        Math.ceil((this.totalPages || 1) / 2) * this._pageThickMM + 2,
      );
      const spineWpx = Math.max(
        8,
        Math.round((this._p.height * spineMM) / trimHmm),
      );
      this._spineGfx = this._p.createGraphics(spineWpx, this._p.height);
      this._spineGfx.pixelDensity(this._p.pixelDensity());
      // Add scoped draw() helper directly onto the graphics object
      const _g = this._spineGfx;
      _g.draw = (fn) => fn(_g);
    }
    return this._spineGfx;
  }

  /** Set canvas DPI for print quality. pixelDensity is derived from trim width;
   *  canvas height is resized to match the trim aspect ratio so both axes hit the
   *  exact target DPI. Call in setup() before addPage(). */
  setDPI(dpi) {
    if (this.page > 0)
      throw new Error("[p5.book] setDPI() must be called before addPage()");
    this._dpi = dpi;
    const mmPU = MM_PER_UNIT[this._unit] || 25.4;
    const trimW_in = (this._trimW * mmPU) / 25.4;
    const trimH_in = (this._trimH * mmPU) / 25.4;
    const density = (dpi * trimW_in) / this._p.width;
    // Resize canvas height so physical pixels = dpi × trimH_in (correct DPI on both axes)
    const physH = Math.round(dpi * trimH_in);
    const logH = Math.round(physH / density);
    this._p.pixelDensity(density);
    if (logH !== this._p.height) this._p.resizeCanvas(this._p.width, logH);
    // Rebuild bleed gfx at correct density if setBleed() was called first
    if (this._bleedGfx) {
      this._bleedGfx.remove();
      const gfx = this._p.createGraphics(this._p.width, this._p.height);
      gfx.pixelDensity(density);
      this._bleedGfx = gfx;
      this.bleed = new Proxy(gfx, {
        get: (target, prop) => {
          if (prop === "draw") return (fn) => fn(target);
          const val = target[prop];
          return typeof val === "function" ? val.bind(target) : val;
        },
      });
      const mainCvs = this._p.canvas;
      this._offCanvas.width = Math.round(
        (mainCvs.width * this.bleedWidth) / this._trimW,
      );
      this._offCanvas.height = Math.round(
        (mainCvs.height * this.bleedHeight) / this._trimH,
      );
    }
  }

  /** Set the 3D viewer background color.
   *  @param {string} color  CSS color string (or null for transparent). */
  set3DBackground(color) {
    this._3dColors.bg = color;
  }

  /** Set the cover edges and page-stack texture color in the 3D viewer.
   *  @param {string|string[]} color  CSS color string, or array of up to 3:
   *                                  [fore-edge (right), top, bottom]. */
  set3DEdgeColor(color) {
    const arr = Array.isArray(color) ? color : [color];
    // Pad missing entries with the last supplied value
    this._3dColors.edge = [0, 1, 2].map((i) => arr[i] ?? arr[arr.length - 1]);
  }

  /** Show or hide the color pickers in the 3D viewer GUI.
   *  @param {boolean} visible  Pass false to hide, true to show (default true). */
  showColorPickers(visible = true) {
    this._3dHideColors = !visible;
  }

  /** Enable saddle-stitch imposition button in the viewer. Page count must be divisible by 4. */
  setSaddleStitch(enabled) {
    this._saddleStitch = !!enabled;
  }

  /** Set the default viewer mode when the viewer opens.
   *  @param {string} mode  "flipbook" (default), "grid", or "3d" */
  setViewerMode(mode) {
    if (["flipbook", "grid", "3d"].includes(mode)) {
      this._viewerMode = mode;
    } else {
      console.warn(
        `[p5.book] Invalid viewer mode "${mode}". Use "flipbook", "grid", or "3d".`,
      );
    }
  }

  /** Set the thickness of one leaf (sheet of paper) for spine-width calculation.
   *  @param {number} thickness  Thickness of one leaf.
   *  @param {string} [unit]     'mm' (default), 'in', or 'pt'. */
  setPageThickness(thickness, unit = "mm") {
    this._pageThickMM = thickness * (MM_PER_UNIT[unit] || 1);
  }

  /** Enable spread layout: cover + back cover are solo pages; inner pages pair
   *  as two-page spreads in the preview, PDF export, and print.
   *  Total page count must be even. Call in setup() before addPage(). */
  setSpread(enabled) {
    if (this.page > 0)
      throw new Error("[p5.book] setSpread() must be called before addPage()");
    this._spread = !!enabled;
  }

  /** Set reading direction. "ltr" (default) = left-to-right; "rtl" = right-to-left
   *  (Arabic, Hebrew, manga, etc.). Affects spread pairing, isLeftPage/isRightPage,
   *  and viewer arrow-key navigation. Call in setup() before addPage(). */
  setDirection(dir) {
    if (this.page > 0)
      throw new Error(
        "[p5.book] setDirection() must be called before addPage()",
      );
    this._rtl = dir === "rtl";
  }

  /** Add bleed. Page size = trim + bleed on all sides (no extra mark-margin whitespace).
   *  Crop marks are drawn inward from the bleed edges. Call in setup() before addPage().
   *  @param {number} amount   bleed size
   *  @param {string} [unit]   "in", "cm", "mm", "px", "pt" — defaults to book unit */
  setBleed(amount, unit) {
    if (this.page > 0)
      throw new Error("[p5.book] setBleed() must be called before addPage()");
    const srcUnit = unit || this._unit;
    const amountMM = amount * (MM_PER_UNIT[srcUnit] || 25.4);
    this._bleed = amountMM / (MM_PER_UNIT[this._unit] || 25.4);
    this._printMarks = true;
    this._rebuildPDF();

    const gfx = this._p.createGraphics(this._p.width, this._p.height);
    gfx.pixelDensity(this._p.pixelDensity());
    this._bleedGfx = gfx;
    this.bleed = new Proxy(gfx, {
      get: (target, prop) => {
        if (prop === "draw") return (fn) => fn(target);
        const val = target[prop];
        return typeof val === "function" ? val.bind(target) : val;
      },
    });

    const mainCvs = this._p.canvas;
    this._offCanvas = document.createElement("canvas");
    this._offCanvas.width = Math.round(
      (mainCvs.width * this.bleedWidth) / this._trimW,
    );
    this._offCanvas.height = Math.round(
      (mainCvs.height * this.bleedHeight) / this._trimH,
    );
    this._offCtx = this._offCanvas.getContext("2d");
  }

  /** Show or hide crop marks. setBleed() enables them automatically. */
  setPrintMarks(enabled) {
    this._printMarks = !!enabled;
  }

  /**
   * Set CSS letter-spacing. Persists like textSize(). Call letterSpacing(0) to reset.
   * Also applied to the bleed graphics if setBleed() has been called.
   * @param {number} px  spacing in pixels (negative tightens, positive loosens)
   */
  letterSpacing(px) {
    this._p.drawingContext.letterSpacing = `${px}px`;
    if (this._bleedGfx) {
      this._bleedGfx.drawingContext.letterSpacing = `${px}px`;
    }
    return this;
  }

  get bleedWidth() {
    return this._trimW + 2 * this._bleed;
  }
  get bleedHeight() {
    return this._trimH + 2 * this._bleed;
  }

  _rebuildPDF() {
    const { jsPDF } = window.jspdf;
    // Page size = trim + bleed only — crop marks live within the bleed area
    this._pdf = new jsPDF({
      unit: this._unit,
      format: [this.bleedWidth, this.bleedHeight],
      orientation: this.bleedWidth > this.bleedHeight ? "l" : "p",
    });
  }

  get pageNumber() {
    return this._page + 1;
  }

  get progress() {
    return this.totalPages > 1 ? this._page / (this.totalPages - 1) : 1;
  }

  isFirstPage() {
    return this._page === 0;
  }
  isLastPage() {
    return this._page === this.totalPages - 1;
  }

  isLeftPage() {
    if (!this._spread) {
      console.warn(
        "isLeftPage() is only meaningful when setSpread(true) is enabled",
      );
      return false;
    }
    // Cover (page 0) and back cover (last page) are neither left nor right
    if (this._page === 0 || this._page === this.totalPages - 1) {
      return false;
    }
    // LTR: pairs are [1,2],[3,4]... — odd indices are on the left
    // RTL: pairs are [2,1],[4,3]... — even indices are on the left
    return this._rtl ? this._page % 2 === 0 : this._page % 2 === 1;
  }

  isRightPage() {
    if (!this._spread) {
      console.warn(
        "isRightPage() is only meaningful when setSpread(true) is enabled",
      );
      return false;
    }
    // Cover (page 0) and back cover (last page) are neither left nor right
    if (this._page === 0 || this._page === this.totalPages - 1) {
      return false;
    }
    // LTR: even indices are on the right; RTL: odd indices are on the right
    return this._rtl ? this._page % 2 === 1 : this._page % 2 === 0;
  }

  addPage() {
    // Guard against one extra draw tick before noLoop() applies.
    // Without this, an unintended page can be captured as the last page.
    if (this.totalPages != null && this._page >= this.totalPages) {
      if (!this._addPageOverflowWarned) {
        this._addPageOverflowWarned = true;
        console.warn(
          `[p5.book] addPage() called after totalPages (${this.totalPages}) was reached. Extra pages are ignored.`,
        );
      }
      return this._pageQueue;
    }

    // ── Capture canvas pixels SYNCHRONOUSLY before the user draws the next page ──
    const b = this._bleed;
    const mainCvs = this._p.canvas;
    let rawCanvas;

    if (b > 0) {
      const neededW = Math.round(
        (mainCvs.width * this.bleedWidth) / this._trimW,
      );
      const neededH = Math.round(
        (mainCvs.height * this.bleedHeight) / this._trimH,
      );
      if (
        this._offCanvas.width !== neededW ||
        this._offCanvas.height !== neededH
      ) {
        this._offCanvas.width = neededW;
        this._offCanvas.height = neededH;
      }
      const offX = Math.round(mainCvs.width * (b / this._trimW));
      const offY = Math.round(mainCvs.height * (b / this._trimH));
      this._offCtx.clearRect(
        0,
        0,
        this._offCanvas.width,
        this._offCanvas.height,
      );
      this._offCtx.drawImage(
        this.bleed.canvas,
        0,
        0,
        this._offCanvas.width,
        this._offCanvas.height,
      );
      this._offCtx.drawImage(mainCvs, offX, offY);
      rawCanvas = document.createElement("canvas");
      rawCanvas.width = this._offCanvas.width;
      rawCanvas.height = this._offCanvas.height;
      rawCanvas.getContext("2d").drawImage(this._offCanvas, 0, 0);
      this.bleed.clear();
    } else {
      rawCanvas = document.createElement("canvas");
      rawCanvas.width = mainCvs.width;
      rawCanvas.height = mainCvs.height;
      rawCanvas.getContext("2d").drawImage(mainCvs, 0, 0);
    }

    const pageIndex = this._page;
    this._page++;
    // NOTE: do NOT call _updateProgressUI() here — _page increments synchronously
    // for all pages before the browser paints even once. Progress is updated inside rAF.

    // ── Queue the heavy work (encode + PDF embed) asynchronously ──
    // O(1) queue: chain off the current tail, then replace the tail reference.
    // This avoids the O(n²) promise chain that builds up with many pages.
    const prevTail = this._pageQueue;
    let _resolveThisPage;
    this._pageQueue = new Promise((r) => {
      _resolveThisPage = r;
    });
    prevTail.then(() => {
      requestAnimationFrame(() => {
        if (pageIndex > 0)
          this._pdf.addPage(
            [this.bleedWidth, this.bleedHeight],
            this.bleedWidth > this.bleedHeight ? "l" : "p",
          );
        this._rawCanvases.push(rawCanvas);
        const fmt = this._imageType === "png" ? "image/png" : "image/jpeg";
        const pdfFmt = this._imageType === "png" ? "PNG" : "JPEG";
        const pageImg = rawCanvas.toDataURL(fmt, this._jpegQuality);
        this._pageImages.push(pageImg);
        this._pdf.addImage(
          pageImg,
          pdfFmt,
          0,
          0,
          b > 0 ? this.bleedWidth : this._trimW,
          b > 0 ? this.bleedHeight : this._trimH,
        );
        if (this._printMarks)
          this._drawPrintMarksOn(this._pdf, this._trimW, this._trimH, b);
        this._pagesProcessed++;
        this._updateProgressUI();
        if (this.totalPages != null && pageIndex === this.totalPages - 1) {
          this._p.noLoop();
          this._showViewer();
        }
        _resolveThisPage();
      });
    });
    return this._pageQueue;
  }

  // Draw crop marks inward from the bleed edges.
  // Page size = trim + bleed; mark arms go from the page edge to just before the trim line.
  _drawPrintMarksOn(pdf, trimW, trimH, b) {
    if (b <= 0) return;
    const u = MM_PER_UNIT[this._unit] || 25.4;
    const gap = 1 / u;
    const hair = 0.3 / u;

    const x0 = b,
      y0 = b;
    const x1 = b + trimW,
      y1 = b + trimH;
    const pw = 2 * b + trimW; // page width
    const ph = 2 * b + trimH; // page height

    const lines = [
      [0, y0, x0 - gap, y0],
      [x0, 0, x0, y0 - gap], // TL
      [pw, y0, x1 + gap, y0],
      [x1, 0, x1, y0 - gap], // TR
      [0, y1, x0 - gap, y1],
      [x0, ph, x0, y1 + gap], // BL
      [pw, y1, x1 + gap, y1],
      [x1, ph, x1, y1 + gap], // BR
    ];

    // Draw hairlines in Difference blend mode (white inverts any background)
    pdf.setGState(new pdf.GState({ "blend-mode": "Difference" }));
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(hair);
    lines.forEach(([ax, ay, bx, by]) => pdf.line(ax, ay, bx, by));
    pdf.setGState(new pdf.GState({ "blend-mode": "Normal" }));
  }

  // Composite two raw page canvases side-by-side; removes the inner bleed gutter.
  _makeSpreadCanvas(leftCvs, rightCvs) {
    const b = this._bleed;
    const mainW = this._p.canvas.width;
    const mainH = this._p.canvas.height;
    const spread = document.createElement("canvas");

    if (b > 0) {
      // rawCanvas size: mainW + 2*bleedPx  (bleedPx = mainW * b / trimW)
      // Spread removes inner bleed: [bleedPx | leftTrim | rightTrim | bleedPx]
      const rawW = leftCvs.width;
      const bleedPx = (rawW - mainW) / 2;
      spread.width = 2 * mainW + 2 * bleedPx; // = mainW + rawW
      spread.height = leftCvs.height;
      const ctx = spread.getContext("2d");
      const trimPlusBleed = rawW - bleedPx; // [bleed + trim] width
      // Left page: [bleedPx | trim], i.e. rawW minus its right bleed strip
      ctx.drawImage(
        leftCvs,
        0,
        0,
        trimPlusBleed,
        spread.height,
        0,
        0,
        trimPlusBleed,
        spread.height,
      );
      // Right page: skip its left bleed strip, draw [trim | bleedPx]
      ctx.drawImage(
        rightCvs,
        bleedPx,
        0,
        trimPlusBleed,
        spread.height,
        trimPlusBleed,
        0,
        trimPlusBleed,
        spread.height,
      );
    } else {
      spread.width = mainW * 2;
      spread.height = mainH;
      const ctx = spread.getContext("2d");
      ctx.drawImage(leftCvs, 0, 0, mainW, mainH, 0, 0, mainW, mainH);
      ctx.drawImage(rightCvs, 0, 0, mainW, mainH, mainW, 0, mainW, mainH);
    }
    return spread;
  }

  // Build a PDF from [leftIdx, rightIdx] pairs. null rightIdx = solo page.
  // Solo pages: trimW + 2b wide. Spread pages: 2*trimW + 2b wide (no inner bleed).
  _buildSpreadsFromPairs(pairs) {
    const { jsPDF } = window.jspdf;
    const b = this._bleed;
    const soloW = this.bleedWidth; // trimW + 2b
    const soloH = this.bleedHeight; // trimH + 2b
    const spreadW = 2 * this._trimW + 2 * b; // no inner bleed at gutter

    const firstIsSolo = pairs[0][1] === null;
    const firstW = firstIsSolo ? soloW : spreadW;
    const pdf = new jsPDF({
      unit: this._unit,
      format: [firstW, soloH],
      orientation: firstIsSolo ? "p" : "l",
    });

    pairs.forEach(([li, ri], i) => {
      const isSolo = ri === null;
      if (i > 0)
        pdf.addPage(
          isSolo ? [soloW, soloH] : [spreadW, soloH],
          isSolo ? "p" : "l",
        );

      const _fmt = this._imageType === "png" ? "image/png" : "image/jpeg";
      const _pdfFmt = this._imageType === "png" ? "PNG" : "JPEG";
      if (isSolo) {
        pdf.addImage(
          this._rawCanvases[li].toDataURL(_fmt, this._jpegQuality),
          _pdfFmt,
          0,
          0,
          soloW,
          soloH,
        );
        if (this._printMarks)
          this._drawPrintMarksOn(pdf, this._trimW, this._trimH, b);
      } else {
        const spreadCvs = this._makeSpreadCanvas(
          this._rawCanvases[li],
          this._rawCanvases[ri],
        );
        pdf.addImage(
          spreadCvs.toDataURL(_fmt, this._jpegQuality),
          _pdfFmt,
          0,
          0,
          spreadW,
          soloH,
        );
        if (this._printMarks)
          this._drawPrintMarksOn(pdf, 2 * this._trimW, this._trimH, b);
      }
    });

    return pdf;
  }

  // Reader spread: cover solo, inner pages paired, back cover solo.
  _buildSpreadPDF() {
    const n = this._rawCanvases.length;
    if (n < 2) throw new Error("[p5.book] spread requires at least 2 pages");
    if ((n - 2) % 2 !== 0)
      throw new Error("[p5.book] spread requires an even total page count");

    const pairs = [[0, null]];
    for (let i = 1; i < n - 1; i += 2)
      pairs.push(this._rtl ? [i + 1, i] : [i, i + 1]);
    pairs.push([n - 1, null]);
    return this._buildSpreadsFromPairs(pairs);
  }

  // Saddle-stitch imposition: reorder pages into printer spread pairs.
  _buildSaddleStitchPDF() {
    const n = this._rawCanvases.length;
    if (n % 4 !== 0)
      throw new Error(
        "[p5.book] saveSaddleStitch() requires a page count divisible by 4, got " +
          n,
      );

    const pairs = [];
    for (let k = 0; k < n / 2; k++) {
      const pair = k % 2 === 0 ? [n - 1 - k, k] : [k, n - 1 - k];
      pairs.push(this._rtl ? [pair[1], pair[0]] : pair);
    }
    return this._buildSpreadsFromPairs(pairs);
  }

  // Crop bleed strips off a canvas, returning a trim-area-only canvas.
  // trimPxW/trimPxH default to single-page trim dimensions.
  _makeTrimCanvas(rawCvs, trimPxW, trimPxH) {
    if (this._bleed <= 0) return rawCvs;
    const mainW = this._p.canvas.width;
    const mainH = this._p.canvas.height;
    const bpx = Math.round((mainW * this._bleed) / this._trimW);
    const bpy = Math.round((mainH * this._bleed) / this._trimH);
    const w = trimPxW || mainW;
    const h = trimPxH || mainH;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d").drawImage(rawCvs, bpx, bpy, w, h, 0, 0, w, h);
    return c;
  }

  // Build view items for the flipbook/grid viewer.
  // With setSpread(true): cover solo, inner page pairs composited, back cover solo.
  // Without: every raw page individually.
  // showBleed: if true use full bleed canvas; if false crop to trim area.
  _buildViewItems(showBleed = true) {
    const n = this._rawCanvases.length;
    const mainW = this._p.canvas.width;
    const mainH = this._p.canvas.height;
    const isValidSpread = this._spread && n >= 2 && (n - 2) % 2 === 0;
    const _fmt = this._imageType === "png" ? "image/png" : "image/jpeg";
    const toSrc = (cvs) => cvs.toDataURL(_fmt, this._jpegQuality);
    const mayTrim = (cvs, tw, th) =>
      showBleed ? cvs : this._makeTrimCanvas(cvs, tw, th);

    if (!isValidSpread) {
      return this._rawCanvases.map((rc, i) => ({
        src: showBleed ? this._pageImages[i] : toSrc(mayTrim(rc)),
        label: String(i + 1),
      }));
    }

    const items = [];
    items.push({
      src: showBleed
        ? this._pageImages[0]
        : toSrc(mayTrim(this._rawCanvases[0])),
      label: "cover",
    });
    for (let i = 1; i < n - 1; i += 2) {
      const [li, ri] = this._rtl ? [i + 1, i] : [i, i + 1];
      const cvs = this._makeSpreadCanvas(
        this._rawCanvases[li],
        this._rawCanvases[ri],
      );
      items.push({
        src: toSrc(mayTrim(cvs, 2 * mainW, mainH)),
        label: `pp.\u00a0${i + 1}–${i + 2}`,
      });
    }
    items.push({
      src: showBleed
        ? this._pageImages[n - 1]
        : toSrc(mayTrim(this._rawCanvases[n - 1])),
      label: "back cover",
    });
    return items;
  }

  // ── viewer ─────────────────────────────────────────────────
  _showViewer() {
    showViewer(this);
  }

  /** Show the viewer and stop the loop. Use when page count is unknown upfront. */
  finish(filename) {
    if (filename) this._filename = filename;
    this._p.noLoop();
    this._showViewer();
  }

  /** Download the PDF. When setSpread(true), exports the spread-format PDF. */
  save(filename) {
    const name = filename || this._filename;
    if (this._spread) {
      try {
        this._buildSpreadPDF().save(name);
      } catch (e) {
        console.error("[p5.book]", e.message);
        this._pdf.save(name);
      }
    } else {
      this._pdf.save(name);
    }
  }

  /** Build a cover-spread PDF: [back cover] [spine] [front cover] on one landscape page. */
  _buildCoverPDF() {
    const { jsPDF } = window.jspdf;
    const mmPerUnit = MM_PER_UNIT[this._unit] || 25.4;
    const n = this._rawCanvases.length;
    if (n === 0) throw new Error("[p5.book] no pages to export.");

    // Spine thickness (same formula as render3D)
    const spineMM = Math.max(
      3,
      Math.ceil((this.totalPages || 1) / 2) * this._pageThickMM + 2,
    );
    const spineU = spineMM / mmPerUnit;

    const frontCvs = this._rawCanvases[0];
    const backCvs = this._rawCanvases[n - 1];
    const pageW = frontCvs.width;
    const pageH = frontCvs.height;
    // Spine pixel width proportional to book units
    const spineWpx = Math.max(
      4,
      Math.round((spineU / this.bleedWidth) * pageW),
    );

    // Composite canvas: [back cover | spine | front cover]
    const compound = document.createElement("canvas");
    compound.width = pageW * 2 + spineWpx;
    compound.height = pageH;
    const ctx = compound.getContext("2d");

    // Back cover on the left
    ctx.drawImage(backCvs, 0, 0);

    // Spine in the middle — use canvas.width/height (physical px) not .width/.height (logical)
    if (this._spineGfx) {
      ctx.drawImage(
        this._spineGfx.canvas,
        0,
        0,
        this._spineGfx.canvas.width,
        this._spineGfx.canvas.height,
        pageW,
        0,
        spineWpx,
        pageH,
      );
    } else {
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(pageW, 0, spineWpx, pageH);
    }

    // Front cover on the right
    ctx.drawImage(frontCvs, pageW + spineWpx, 0);

    const b = this._bleed;
    const totalW = 2 * this.bleedWidth + spineU;
    const totalH = this.bleedHeight;
    const pdf = new jsPDF({
      unit: this._unit,
      format: [totalW, totalH],
      orientation: "l",
    });
    const _fmt = this._imageType === "png" ? "image/png" : "image/jpeg";
    const _pdfFmt = this._imageType === "png" ? "PNG" : "JPEG";
    pdf.addImage(
      compound.toDataURL(_fmt, this._jpegQuality),
      _pdfFmt,
      0,
      0,
      totalW,
      totalH,
    );

    // Print marks: crop corners + fold lines
    if (this._printMarks && b > 0) {
      const gap = 1 / mmPerUnit; // 1 mm gap before trim line
      const hair = 0.3 / mmPerUnit; // 0.3 mm hairline
      const y0 = b,
        y1 = b + this._trimH,
        ph = totalH;
      // Back-cover trim edges
      const bx0 = b;
      // Front-cover trim edges
      const fx1 = totalW - b;
      // Spine fold positions
      const sf0 = this.bleedWidth;
      const sf1 = this.bleedWidth + spineU;

      const lines = [
        // Back cover outer-left corners (TL + BL)
        [0, y0, bx0 - gap, y0],
        [bx0, 0, bx0, y0 - gap],
        [0, y1, bx0 - gap, y1],
        [bx0, ph, bx0, y1 + gap],
        // Front cover outer-right corners (TR + BR)
        [totalW, y0, fx1 + gap, y0],
        [fx1, 0, fx1, y0 - gap],
        [totalW, y1, fx1 + gap, y1],
        [fx1, ph, fx1, y1 + gap],
        // Spine fold marks — top & bottom only (fold, not crop)
        [sf0, 0, sf0, y0 - gap],
        [sf0, ph, sf0, y1 + gap],
        [sf1, 0, sf1, y0 - gap],
        [sf1, ph, sf1, y1 + gap],
      ];
      pdf.setGState(new pdf.GState({ "blend-mode": "Difference" }));
      pdf.setDrawColor(255, 255, 255);
      pdf.setLineWidth(hair);
      lines.forEach(([ax, ay, bx, by]) => pdf.line(ax, ay, bx, by));
      pdf.setGState(new pdf.GState({ "blend-mode": "Normal" }));
    }

    return pdf;
  }

  /** Download a cover-spread PDF (back cover + spine + front cover). */
  saveCover(filename) {
    const n = this._rawCanvases.length;
    if (n === 0) {
      alert("[p5.book] saveCover(): no pages to export.");
      return;
    }
    try {
      this._buildCoverPDF().save(
        filename || this._filename.replace(/\.pdf$/i, "-cover.pdf"),
      );
    } catch (e) {
      alert("[p5.book] saveCover(): " + e.message);
    }
  }

  /** Download a saddle-stitch imposition PDF. Page count must be divisible by 4. */
  saveSaddleStitch(filename) {
    const n = this._rawCanvases.length;
    if (n === 0) {
      alert("[p5.book] saveSaddleStitch(): no pages to export.");
      return;
    }
    if (n % 4 !== 0) {
      alert(
        `[p5.book] saveSaddleStitch(): page count must be divisible by 4, but you have ${n} pages. Try ${Math.ceil(n / 4) * 4} pages.`,
      );
      return;
    }
    try {
      this._buildSaddleStitchPDF().save(
        filename || this._filename.replace(/\.pdf$/i, "-saddle.pdf"),
      );
    } catch (e) {
      alert("[p5.book] saveSaddleStitch(): " + e.message);
    }
  }

  /** Download every captured page as an individual image file.
   *  @param {"png"|"jpeg"} format  Image format (default: "png")
   *  Files are named  <basename>-0001.png, -0002.png, …
   *  A small async stagger (80 ms) prevents browser download throttling. */
  async exportFrames(format = "png") {
    if (this._rawCanvases.length === 0) {
      console.warn("[p5.book] exportFrames(): no pages captured yet.");
      return;
    }
    const isJpeg = format === "jpeg" || format === "jpg";
    const mime = isJpeg ? "image/jpeg" : "image/png";
    const ext = isJpeg ? "jpg" : "png";
    const q = isJpeg ? this._jpegQuality : undefined;
    const base = this._filename.replace(/\.pdf$/i, "");
    for (let i = 0; i < this._rawCanvases.length; i++) {
      const a = document.createElement("a");
      a.href = this._rawCanvases[i].toDataURL(mime, q);
      a.download = `${base}-${String(i + 1).padStart(4, "0")}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise((r) => setTimeout(r, 80));
    }
  }

  /** Set column count for textBox(). Persists like textSize(). Returns count if called with no args. */
  columnNum(n, gutter) {
    if (n === undefined) return this._columns;
    this._columns = Math.max(1, Math.floor(n));
    if (gutter !== undefined) this._columnGutter = gutter;
    return this;
  }

  /** Draw wrapped text into a box. Returns overflow text that didn't fit. */
  static _isCJK(ch) {
    const c = ch.charCodeAt(0);
    return (
      (c >= 0x4e00 && c <= 0x9fff) ||
      (c >= 0x3000 && c <= 0x303f) ||
      (c >= 0x3040 && c <= 0x309f) ||
      (c >= 0x30a0 && c <= 0x30ff) ||
      (c >= 0xac00 && c <= 0xd7af) ||
      (c >= 0xff00 && c <= 0xffef)
    );
  }

  static _wrapText(p, str, maxW) {
    const out = [];
    for (const para of str.split("\n")) {
      if (para === "") {
        out.push("");
        continue;
      }
      // If the paragraph contains any CJK, wrap character-by-character
      const hasCJK = Array.from(para).some(Book._isCJK);
      if (hasCJK) {
        let line = "";
        for (const char of para) {
          if (char === " ") {
            // spaces: add to line but don't start a new line with a space
            if (line) line += char;
            continue;
          }
          const candidate = line + char;
          if (line && p.textWidth(candidate) > maxW) {
            out.push(line.trimEnd());
            line = char;
          } else {
            line = candidate;
          }
        }
        if (line.trimEnd()) out.push(line.trimEnd());
      } else {
        // Latin / word-level wrapping
        let line = "";
        for (const word of para.split(" ")) {
          if (!word) continue;
          const candidate = line ? line + " " + word : word;
          if (line && p.textWidth(candidate) > maxW) {
            out.push(line);
            line = word;
          } else line = candidate;
        }
        if (line) out.push(line);
      }
    }
    return out;
  }

  // p5 2.x returns the instance instead of a number when leading hasn't been set
  static _getLeading(p) {
    const raw = p.textLeading();
    return typeof raw === "number" && raw > 0 ? raw : p.textSize() * 1.25;
  }

  textBox(str, x, y, w, h) {
    if (!str) return "";
    const p = this._p;
    const cols = this._columns;
    const gutter = this._columnGutter;
    const colW = (w - gutter * (cols - 1)) / cols;
    const leading = Book._getLeading(p);
    const ascent = p.textAscent();
    const maxLines = Math.max(1, Math.floor((h - ascent) / leading) + 1);
    const lines = Book._wrapText(p, str, colW);
    let lineIdx = 0;

    // RTL: reverse column order so first column is on the right
    const colIndices = this._rtl
      ? Array.from({ length: cols }, (_, i) => cols - 1 - i)
      : Array.from({ length: cols }, (_, i) => i);

    const prevDir = p.drawingContext.direction;
    if (this._rtl) p.drawingContext.direction = "rtl";

    for (const col of colIndices) {
      if (lineIdx >= lines.length) break;
      const cx = x + col * (colW + gutter);
      // In RTL, text() anchors at the right edge of the cell
      const tx = this._rtl ? cx + colW : cx;
      for (let i = 0; i < maxLines && lineIdx < lines.length; i++) {
        p.text(lines[lineIdx], tx, y + ascent + i * leading);
        lineIdx++;
      }
    }

    if (this._rtl) p.drawingContext.direction = prevDir;

    return lines.slice(lineIdx).join("\n");
  }
}
