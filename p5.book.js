/**
 * p5.book
 * A PDF book generator addon for p5.js 2.x
 *
 * @author  Munus Shih <munusshih@gmail.com>
 * @license MIT
 * @requires jsPDF  https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js
 */

if (typeof p5 !== "undefined")
  p5.registerAddon(function (p5, fn, lifecycles) {
    const UNITS = ["in", "cm", "mm", "px", "pt"];

    const MM_PER_UNIT = {
      in: 25.4,
      cm: 10,
      mm: 1,
      pt: 25.4 / 72,
      px: 25.4 / 96,
    };

    class Book {
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

        this._unit = unit;
        this._pdf = new jsPDF({
          unit,
          format,
          orientation:
            Array.isArray(format) && format[0] > format[1] ? "l" : "p",
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

        // Create canvas with the correct aspect ratio automatically.
        const defaultCanvasW = 500;
        const defaultCanvasH = Math.round(
          (defaultCanvasW * this._trimH) / this._trimW,
        );
        this._p.createCanvas(defaultCanvasW, defaultCanvasH);
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
        this.bleed = new Proxy(
          {},
          { get: (_, prop) => (prop === "draw" ? () => {} : () => {}) },
        );
        // ── spine ────────────────────────────────────────────────────────
        this._spineGfx = null;
        const _self = this;
        this.spine = new Proxy(
          {},
          {
            get(_, prop) {
              if (!_self._spineGfx) {
                // Compute spine width proportional to actual physical spine thickness
                // so the canvas has the correct aspect ratio and won't stretch in 3D/PDF.
                const MM_PER = {
                  in: 25.4,
                  cm: 10,
                  mm: 1,
                  pt: 25.4 / 72,
                  px: 25.4 / 96,
                };
                const trimHmm = _self._trimH * (MM_PER[_self._unit] || 25.4);
                const spineMM = Math.max(
                  3,
                  Math.ceil((_self.totalPages || 1) / 2) * _self._pageThickMM +
                    2,
                );
                const spineWpx = Math.max(
                  8,
                  Math.round((_self._p.height * spineMM) / trimHmm),
                );
                _self._spineGfx = _self._p.createGraphics(
                  spineWpx,
                  _self._p.height,
                );
                _self._spineGfx.pixelDensity(_self._p.pixelDensity());
              }
              if (prop === "draw") return (fn) => fn(_self._spineGfx);
              const val = _self._spineGfx[prop];
              return typeof val === "function"
                ? val.bind(_self._spineGfx)
                : val;
            },
          },
        );
        this._pageImages = [];
        this._rawCanvases = [];
        this._columns = 1;
        this._columnGutter = 20;
        this.page = 0;
        this.totalPages = totalPages != null ? totalPages : null;
        this._progressEl = null;
        this._pagesProcessed = 0; // increments inside rAF so browser can paint each step
        this._pageQueue = Promise.resolve();
        if (this.totalPages != null) this._createProgressUI();
      }

      _createProgressUI() {
        const el = document.createElement("div");
        el.id = "p5book-progress";
        el.style.cssText = [
          "position:fixed",
          "inset:0",
          "z-index:99998",
          "display:flex",
          "flex-direction:column",
          "align-items:center",
          "justify-content:center",
          "gap:14px",
          "background:rgba(255,255,255,0.92)",
          "font-family:monospace",
          "font-size:13px",
          "pointer-events:none",
        ].join(";");
        el.innerHTML = `
          <div id="p5book-prog-label" style="opacity:0.5">rendering page 0 / ${this.totalPages}</div>
          <div style="width:240px;height:3px;background:rgba(0,0,0,0.1);border-radius:2px;overflow:hidden">
            <div id="p5book-prog-bar" style="height:100%;width:0%;background:#000;border-radius:2px;transition:width 0.1s linear"></div>
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
          lbl.textContent = `rendering page ${this._pagesProcessed} / ${this.totalPages}`;
      }

      _removeProgressUI() {
        if (this._progressEl) {
          this._progressEl.remove();
          this._progressEl = null;
        }
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

      /** Set default colors for the 3D viewer.
       *  @param {object} opts
      /** Set the 3D viewer background color. @param {string} color  CSS color string. */
      set3DBackground(color) {
        this._3dColors.bg = color;
      }

      /** Set the cover-edge / binding color in the 3D viewer. @param {string} color  CSS color string. */
      /** Set the cover edges and page-stack texture color in the 3D viewer.
       *  @param {string|string[]} color  CSS color string, or array of up to 3:
       *                                  [fore-edge (right), top, bottom]. */
      set3DEdgeColor(color) {
        const arr = Array.isArray(color) ? color : [color];
        // Pad missing entries with the last supplied value
        this._3dColors.edge = [0, 1, 2].map(
          (i) => arr[i] ?? arr[arr.length - 1],
        );
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

      /** Set the thickness of one leaf (sheet of paper) for spine-width calculation.
       *  @param {number} thickness  Thickness of one leaf.
       *  @param {string} [unit]     'mm' (default), 'in', or 'pt'. */
      setPageThickness(thickness, unit = "mm") {
        const MM_PER = { mm: 1, in: 25.4, pt: 25.4 / 72, px: 25.4 / 96 };
        this._pageThickMM = thickness * (MM_PER[unit] || 1);
      }

      /** Enable spread layout: cover + back cover are solo pages; inner pages pair
       *  as two-page spreads in the preview, PDF export, and print.
       *  Total page count must be even. Call in setup() before addPage(). */
      setSpread(enabled) {
        if (this.page > 0)
          throw new Error(
            "[p5.book] setSpread() must be called before addPage()",
          );
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
          throw new Error(
            "[p5.book] setBleed() must be called before addPage()",
          );
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
        return this.page + 1;
      }

      get progress() {
        return this.totalPages > 1 ? this.page / (this.totalPages - 1) : 1;
      }

      isFirstPage() {
        return this.page === 0;
      }
      isLastPage() {
        return this.page === this.totalPages - 1;
      }

      isLeftPage() {
        if (!this._spread) {
          console.warn(
            "isLeftPage() is only meaningful when setSpread(true) is enabled",
          );
          return false;
        }
        // Cover (page 0) and back cover (last page) are neither left nor right
        if (this.page === 0 || this.page === this.totalPages - 1) {
          return false;
        }
        // LTR: pairs are [1,2],[3,4]... — odd indices are on the left
        // RTL: pairs are [2,1],[4,3]... — even indices are on the left
        return this._rtl ? this.page % 2 === 0 : this.page % 2 === 1;
      }

      isRightPage() {
        if (!this._spread) {
          console.warn(
            "isRightPage() is only meaningful when setSpread(true) is enabled",
          );
          return false;
        }
        // Cover (page 0) and back cover (last page) are neither left nor right
        if (this.page === 0 || this.page === this.totalPages - 1) {
          return false;
        }
        // LTR: even indices are on the right; RTL: odd indices are on the right
        return this._rtl ? this.page % 2 === 1 : this.page % 2 === 0;
      }

      addPage() {
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

        const pageIndex = this.page;
        this.page++;
        // NOTE: do NOT call _updateProgressUI() here — this.page increments synchronously
        // for all pages before the browser paints even once. Progress is updated inside rAF.

        // ── Queue the heavy work (JPEG encode + PDF embed) asynchronously ──
        // Each step yields one frame so the browser can repaint the progress bar.
        this._pageQueue = this._pageQueue.then(
          () =>
            new Promise((resolve) => {
              requestAnimationFrame(() => {
                if (pageIndex > 0)
                  this._pdf.addPage(
                    [this.bleedWidth, this.bleedHeight],
                    this.bleedWidth > this.bleedHeight ? "l" : "p",
                  );
                this._rawCanvases.push(rawCanvas);
                const pageJpeg = rawCanvas.toDataURL("image/jpeg", 0.92);
                this._pageImages.push(pageJpeg);
                this._pdf.addImage(
                  pageJpeg,
                  "JPEG",
                  0,
                  0,
                  b > 0 ? this.bleedWidth : this._trimW,
                  b > 0 ? this.bleedHeight : this._trimH,
                );
                if (this._printMarks)
                  this._drawPrintMarksOn(
                    this._pdf,
                    this._trimW,
                    this._trimH,
                    b,
                  );
                this._pagesProcessed++;
                this._updateProgressUI();
                if (
                  this.totalPages != null &&
                  pageIndex === this.totalPages - 1
                ) {
                  this._p.noLoop();
                  this._showViewer();
                }
                resolve();
              });
            }),
        );
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

          if (isSolo) {
            pdf.addImage(
              this._rawCanvases[li].toDataURL("image/jpeg", 0.92),
              "JPEG",
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
              spreadCvs.toDataURL("image/jpeg", 0.92),
              "JPEG",
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
        if (n < 2)
          throw new Error("[p5.book] spread requires at least 2 pages");
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
        const toSrc = (cvs) => cvs.toDataURL("image/jpeg", 0.92);
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

      _showViewer() {
        this._removeProgressUI();
        const book = this;
        let showBleed = this._bleed > 0;
        let viewItems = this._buildViewItems(showBleed);
        let current = 0;
        let mode = "flipbook";

        if (!document.getElementById("p5book-styles")) {
          const s = document.createElement("style");
          s.id = "p5book-styles";
          s.textContent = `
            :root {
              --p5book-font:        monospace;
              --p5book-font-size:   20px;
              --p5book-bg:          #ffffff;
              --p5book-toolbar-pad: 12px 20px;
              --p5book-gap:         12px;
              --p5book-thumb-h:     180px;
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
              flex-shrink: 0; flex-wrap: wrap;
            }
            .p5book-toolbar b,
            .p5book-toolbar button,
            .p5book-toolbar select { font-size: var(--p5book-font-size); }
            .p5book-chk-label {
              display: flex; align-items: center; gap: 6px;
              font-family: var(--p5book-font);
              font-size: var(--p5book-font-size);
              cursor: pointer; user-select: none;
            }
            .p5book-chk-label input[type=checkbox] {
              width: 1em; height: 1em; cursor: pointer;
            }
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
            .p5book-grid {
              display: flex; flex-wrap: wrap;
              justify-content: center;
              align-items: flex-start;
              gap: var(--p5book-gap); padding: 32px;
              width: 100%; box-sizing: border-box;
            }
            .p5book-grid-item {
              display: flex; flex-direction: column;
              align-items: center; gap: 6px; cursor: pointer;
            }
            .p5book-grid-item img  { height: var(--p5book-thumb-h); width: auto; display: block; }
            .p5book-grid-item span { font-size: calc(var(--p5book-font-size) * 0.75); }
            /* ── 3D viewer ──────────────────────────────────────── */
            .p5book-3d-wrap {
              position: relative; width: 100%; height: 100%;
              display: flex; align-items: center; justify-content: center;
              overflow: hidden;
            }
            .p5book-3d-scene {
              perspective: 1400px; flex-shrink: 0;
              cursor: grab; user-select: none;
            }
            .p5book-3d-scene:active { cursor: grabbing; }
            .p5book-3d-book {
              position: relative; transform-style: preserve-3d;
            }
            .p5book-3d-face {
              position: absolute; top: 0; left: 0; overflow: hidden;
            }
            .p5book-3d-face img {
              width: 100%; height: 100%; display: block; object-fit: fill;
              pointer-events: none; draggable: false;
            }
            .p5book-3d-shadow {
              background: radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, transparent 70%);
              height: 24px; margin-top: 20px; border-radius: 50%;
              flex-shrink: 0;
            }
            /* info panel — bottom left, no border, transparent */
            .p5book-3d-info {
              position: absolute; bottom: 0; left: 0;
              padding: 16px 20px;
              font-family: system-ui, sans-serif; font-size: 12px;
              line-height: 1.9; opacity: 0.45;
              pointer-events: none;
            }
            .p5book-3d-info dl {
              margin: 0; display: grid; grid-template-columns: auto auto; column-gap: 12px;
            }
            .p5book-3d-info dt { font-weight: 600; grid-column: 1; }
            .p5book-3d-info dd { margin: 0; grid-column: 2; }
            /* controls panel — bottom right */
            .p5book-3d-ctrl {
              position: absolute; bottom: 0; right: 0;
              display: flex; flex-direction: column; gap: 14px;
              padding: 16px 20px;
              font-family: system-ui, sans-serif; font-size: 13px;
              background: var(--p5book-bg);
              border-top: 1px solid rgba(0,0,0,0.1);
              border-left: 1px solid rgba(0,0,0,0.1);
              pointer-events: auto; min-width: 220px;
            }
            .p5book-3d-ctrl-group {
              display: flex; flex-direction: column; gap: 8px;
            }
            .p5book-3d-ctrl-group-title {
              font-size: 10px; text-transform: uppercase;
              letter-spacing: 0.08em; opacity: 0.4; font-weight: 600;
            }
            .p5book-3d-ctrl-row {
              display: flex; align-items: center; gap: 10px;
            }
            .p5book-3d-ctrl-row label { flex: 1; opacity: 0.7; white-space: nowrap; }
            .p5book-3d-ctrl-row input[type=range] { flex: 2; cursor: pointer; min-width: 0; }
            .p5book-3d-ctrl-row input[type=color] {
              width: 28px; height: 22px; padding: 0; border: 1px solid rgba(0,0,0,0.2);
              border-radius: 3px; cursor: pointer; flex-shrink: 0;
            }
            .p5book-3d-ctrl-row span.p5b-val {
              font-size: 11px; opacity: 0.45; width: 34px; text-align: right; flex-shrink: 0;
            }
            .p5book-3d-dir {
              display: flex; gap: 6px;
            }
            .p5book-3d-dir button {
              flex: 1; font-family: system-ui, sans-serif; font-size: 13px;
              padding: 3px 0; cursor: pointer; border: 1px solid rgba(0,0,0,0.2);
              background: none;
            }
            .p5book-3d-dir button.active {
              background: #000; color: #fff; border-color: #000;
            }
          `;
          document.head.appendChild(s);
        }

        const viewer = document.createElement("div");
        viewer.className = "p5book-viewer";
        if (this._rtl) viewer.setAttribute("dir", "rtl");
        viewer.innerHTML = `
          <div class="p5book-toolbar">
            <b>p5.book</b>
            <button id="p5book-btn-flipbook">flipbook</button>
            <button id="p5book-btn-grid">grid</button>
            <button id="p5book-btn-3d">3d viewer</button>
            ${this._bleed > 0 ? '<label class="p5book-chk-label"><input type="checkbox" id="p5book-chk-bleed" checked> bleed</label>' : ""}
            <span style="flex:1"></span>
            <select id="p5book-dl-sel"><option value="pdf">PDF</option>${this._saddleStitch ? '<option value="saddle">Saddle Stitch</option>' : ""}<option value="cover">Cover</option></select>
            <button id="p5book-btn-download">download</button>
            <button id="p5book-btn-print">print</button>
          </div>
          <div class="p5book-stage" id="p5book-stage"></div>
        `;
        document.body.appendChild(viewer);

        const stage = viewer.querySelector("#p5book-stage");
        const prevArrow = this._rtl ? "&rarr;" : "&larr;";
        const nextArrow = this._rtl ? "&larr;" : "&rarr;";

        const renderFlipbook = () => {
          if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
          }
          const item = viewItems[current];
          stage.innerHTML = `
            <div class="p5book-flipbook">
              <img src="${item.src}" />
              <div class="p5book-flipbook-nav">
                <button id="p5book-prev" ${current === 0 ? "disabled" : ""}>${prevArrow}</button>
                <select id="p5book-page-select">
                  ${viewItems.map((v, i) => `<option value="${i}"${i === current ? " selected" : ""}>${v.label}</option>`).join("")}
                </select>
                <button id="p5book-next" ${current === viewItems.length - 1 ? "disabled" : ""}>${nextArrow}</button>
              </div>
            </div>
          `;
          stage.querySelector("#p5book-prev").addEventListener("click", () => {
            if (current > 0) {
              current--;
              renderFlipbook();
            }
          });
          stage.querySelector("#p5book-next").addEventListener("click", () => {
            if (current < viewItems.length - 1) {
              current++;
              renderFlipbook();
            }
          });
          stage
            .querySelector("#p5book-page-select")
            .addEventListener("change", (e) => {
              current = parseInt(e.target.value);
              renderFlipbook();
            });
        };

        const renderGrid = () => {
          if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
          }
          stage.innerHTML = `<div class="p5book-grid">${viewItems
            .map(
              (item, i) => `<div class="p5book-grid-item" data-i="${i}">
              <img src="${item.src}" /><span>${item.label}</span>
            </div>`,
            )
            .join("")}</div>`;
          stage.querySelectorAll(".p5book-grid-item").forEach((el) => {
            el.addEventListener("click", () => {
              current = parseInt(el.dataset.i);
              setMode("flipbook");
            });
          });
        };

        let animFrameId = null;
        const render3D = () => {
          if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
          }

          // ── dimensions ────────────────────────────────────────────────────
          const MM_PER = {
            in: 25.4,
            cm: 10,
            mm: 1,
            pt: 25.4 / 72,
            px: 25.4 / 96,
          };
          const trimHmm = book._trimH * (MM_PER[book._unit] || 25.4);
          const trimWmm = book._trimW * (MM_PER[book._unit] || 25.4);
          // page thickness per leaf (two-sided sheet), plus ~2 mm for cover boards
          const spineMM = Math.max(
            3,
            Math.ceil((book.totalPages || 1) / 2) * book._pageThickMM + 2,
          );
          const coverH = Math.min(
            window.innerHeight - 100,
            Math.max(
              300,
              Math.round(((window.innerWidth - 300) * trimHmm) / trimWmm),
            ),
          );
          const coverW = Math.round((coverH * trimWmm) / trimHmm);
          const spineW = Math.max(8, Math.round((coverH * spineMM) / trimHmm));

          // ── image sources ─────────────────────────────────────────────────
          const frontSrc = viewItems[0].src;
          const backSrc = viewItems[viewItems.length - 1].src;

          let spineSrc;
          if (book._spineGfx) {
            spineSrc = book._spineGfx.canvas.toDataURL("image/png");
          } else {
            const sc = document.createElement("canvas");
            sc.width = Math.max(60, spineW * 4);
            sc.height = coverH;
            const sctx = sc.getContext("2d");
            // gradient background
            const grad = sctx.createLinearGradient(0, 0, sc.width, 0);
            grad.addColorStop(0, "#1a1a1a");
            grad.addColorStop(1, "#333");
            sctx.fillStyle = grad;
            sctx.fillRect(0, 0, sc.width, sc.height);
            // centred vertical title
            const title = book._filename.replace(/\.pdf$/i, "");
            const fs = Math.min(14, Math.max(8, spineW * 0.45));
            sctx.save();
            sctx.translate(sc.width / 2, sc.height / 2);
            sctx.rotate(Math.PI / 2); // text bottom→top (Western spine convention)
            sctx.fillStyle = "#999";
            sctx.font = `${fs * 4}px monospace`;
            sctx.textAlign = "center";
            sctx.textBaseline = "middle";
            sctx.fillText(title, 0, 0);
            sctx.restore();
            spineSrc = sc.toDataURL();
          }

          // ── build faces ────────────────────────────────────────────────────
          // All faces positioned at left:0 top:0 inside .p5book-3d-book (coverW × coverH)
          // Front  : translateZ(+spineW/2)
          // Back   : rotateY(180deg) translateZ(+spineW/2)  — image scaleX(-1) to un-mirror
          // Spine  : translateX(-spineW/2) rotateY(-90deg)  — image scaleX(-1) to un-mirror
          // Inner  : translateX(coverW-spineW/2) rotateY(90deg)
          // Top    : translateY(-spineW/2) rotateX(-90deg)
          // Bottom : translateY(coverH-spineW/2) rotateX(90deg)
          const hw = spineW / 2;
          const [ecR, ecT, ecB] = book._3dColors.edge;

          // Generate page-edge texture on a canvas to avoid moiré from CSS sub-pixel gradients
          // axis:"x" = vertical stripes |||  (fore-edge, inner edge)
          // axis:"y" = horizontal stripes === (top/bottom edges — pages fan left-right)
          const _makePageEdge = (w, h, bgColor, axis = "x") => {
            const px = Math.round(window.devicePixelRatio || 1);
            const tc = document.createElement("canvas");
            tc.width = w * px;
            tc.height = h * px;
            const tx = tc.getContext("2d");
            tx.fillStyle = bgColor;
            tx.fillRect(0, 0, tc.width, tc.height);
            const lineW = Math.max(1, px);
            const gap = Math.max(3, Math.round(4 * px));
            tx.fillStyle = "rgba(220,220,220,0.6)";
            if (axis === "y") {
              for (let y = 0; y < tc.height; y += lineW + gap) {
                tx.fillRect(0, y, tc.width, lineW);
              }
            } else {
              for (let x = 0; x < tc.width; x += lineW + gap) {
                tx.fillRect(x, 0, lineW, tc.height);
              }
            }
            return tc.toDataURL();
          };
          const pageEdgeH_top = _makePageEdge(coverW, spineW, ecT, "y");
          const pageEdgeH_bot = _makePageEdge(coverW, spineW, ecB, "y");
          const pageEdgeW = _makePageEdge(spineW, coverH, ecR, "x");

          stage.innerHTML = `
            <div class="p5book-3d-wrap" id="p5book-3d-wrap">
              <div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;">
                <div class="p5book-3d-scene" id="p5book-3d-scene" style="pointer-events:auto;">
                  <div class="p5book-3d-book" id="p5book-3d-book"
                    style="width:${coverW}px;height:${coverH}px;">
                    <!-- front cover -->
                    <div class="p5book-3d-face" style="width:${coverW}px;height:${coverH}px;
                      transform:translateZ(${hw}px);">
                      <img src="${frontSrc}" draggable="false">
                    </div>
                    <!-- back cover -->
                    <div class="p5book-3d-face" style="width:${coverW}px;height:${coverH}px;
                      transform:rotateY(180deg) translateZ(${hw}px);">
                      <img src="${backSrc}" draggable="false">
                    </div>
                    <!-- spine -->
                    <div class="p5book-3d-face" style="width:${spineW}px;height:${coverH}px;
                      transform:translateX(-${hw}px) rotateY(-90deg);">
                      <img src="${spineSrc}" draggable="false">
                    </div>
                    <!-- inner edge (right side) — page stack texture -->
                    <div class="p5book-3d-face p5book-3d-edge" style="width:${spineW}px;height:${coverH}px;
                      transform:translateX(${coverW - hw}px) rotateY(90deg);">
                      <img src="${pageEdgeW}" draggable="false">
                    </div>
                    <!-- top edge — page stack texture -->
                    <div class="p5book-3d-face p5book-3d-edge" style="width:${coverW}px;height:${spineW}px;
                      transform:translateY(-${hw}px) rotateX(-90deg);">
                      <img src="${pageEdgeH_top}" class="p5book-3d-pages p5book-3d-top" draggable="false">
                    </div>
                    <!-- bottom edge — page stack texture -->
                    <div class="p5book-3d-face p5book-3d-edge" style="width:${coverW}px;height:${spineW}px;
                      transform:translateY(${coverH - hw}px) rotateX(90deg);">
                      <img src="${pageEdgeH_bot}" class="p5book-3d-pages p5book-3d-bot" draggable="false">
                    </div>
                  </div>
                </div>
                <div class="p5book-3d-shadow" id="p5book-3d-shadow"
                  style="width:${Math.round(coverW * 0.7)}px;"></div>
              </div>
              <div class="p5book-3d-info">
                <dl>
                  <dt>trim</dt><dd>${trimWmm.toFixed(1)} × ${trimHmm.toFixed(1)} mm</dd>
                  <dt></dt><dd>${book._trimW} × ${book._trimH} ${book._unit}</dd>
                  <dt>bleed</dt><dd>${book._bleed > 0 ? `${book._bleed} ${book._unit}` : "none"}</dd>
                  ${book._dpi ? `<dt>dpi</dt><dd>${book._dpi}</dd>` : ""}
                  <dt>direction</dt><dd>${book._rtl ? "right → left" : "left → right"}</dd>
                  <dt>pages</dt><dd>${book.totalPages || "?"}</dd>
                  <dt>spine</dt><dd>${spineMM.toFixed(1)} mm (${book._pageThickMM.toFixed(3)} mm/leaf)</dd>
                </dl>
              </div>
              <div class="p5book-3d-ctrl" id="p5book-3d-ctrl">
                <div class="p5book-3d-ctrl-group">
                  <div class="p5book-3d-ctrl-group-title">view</div>
                  <div class="p5book-3d-ctrl-row">
                    <label>size</label>
                    <input type="range" id="p5b-size" min="30" max="150" value="73">
                    <span class="p5b-val" id="p5b-size-val">73%</span>
                  </div>
                </div>
                <div class="p5book-3d-ctrl-group">
                  <div class="p5book-3d-ctrl-group-title">spin</div>
                  <div class="p5book-3d-ctrl-row">
                    <label>speed</label>
                    <input type="range" id="p5b-speed" min="0" max="200" value="40">
                    <span class="p5b-val" id="p5b-speed-val">40</span>
                  </div>
                  <div class="p5book-3d-ctrl-row">
                    <label>tilt</label>
                    <input type="range" id="p5b-tilt" min="-45" max="45" value="-8">
                    <span class="p5b-val" id="p5b-tilt-val">−8°</span>
                  </div>
                  <div class="p5book-3d-ctrl-row">
                    <label>direction</label>
                    <div class="p5book-3d-dir">
                      <button id="p5b-dir-cw" class="active">↻ CW</button>
                      <button id="p5b-dir-ccw">↺ CCW</button>
                    </div>
                  </div>
                </div>
                <div class="p5book-3d-ctrl-group" id="p5b-colors-group"${book._3dHideColors ? ' style="display:none"' : ""}>
                  <div class="p5book-3d-ctrl-group-title">colors</div>
                  <div class="p5book-3d-ctrl-row">
                    <label>background</label>
                    <input type="color" id="p5b-bg" value="${book._3dColors.bg || "#e8e8e8"}">
                  </div>
                  <div class="p5book-3d-ctrl-row">
                    <label>edge &amp; paper</label>
                    <input type="color" id="p5b-edge" value="${book._3dColors.edge[0]}">
                  </div>
                </div>
                <button id="p5b-exit" style="display:none;">back</button>
              </div>
            </div>
          `;

          // ── animation loop ────────────────────────────────────────────────
          const bookEl = stage.querySelector("#p5book-3d-book");
          const sceneEl = stage.querySelector("#p5book-3d-scene");
          const wrapEl = stage.querySelector("#p5book-3d-wrap");
          const shadowEl = stage.querySelector("#p5book-3d-shadow");
          let rotY = -25,
            rotX = -8,
            spinSpeed = 40,
            sizeScale = 0.73,
            spinDir = 1;
          let autoSpin = true;

          const updateTransform = () => {
            bookEl.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
            sceneEl.style.transform = `scale(${sizeScale})`;
            const sin = Math.abs(Math.sin((rotX * Math.PI) / 180));
            if (shadowEl) shadowEl.style.opacity = 0.4 + sin * 0.4;
          };
          updateTransform();

          const tick = () => {
            if (autoSpin) {
              rotY += spinSpeed * 0.005 * spinDir;
              updateTransform();
            }
            animFrameId = requestAnimationFrame(tick);
          };
          animFrameId = requestAnimationFrame(tick);

          // ── drag ──────────────────────────────────────────────────────────
          let dragging = false,
            lastDX = 0,
            lastDY = 0,
            wasSpin = false;
          const sceneElDrag = sceneEl;
          sceneElDrag.addEventListener("pointerdown", (e) => {
            dragging = true;
            lastDX = e.clientX;
            lastDY = e.clientY;
            wasSpin = autoSpin;
            autoSpin = false;
            sceneElDrag.setPointerCapture(e.pointerId);
          });
          sceneElDrag.addEventListener("pointermove", (e) => {
            if (!dragging) return;
            rotY += (e.clientX - lastDX) * 0.5;
            rotX -= (e.clientY - lastDY) * 0.3;
            rotX = Math.max(-45, Math.min(45, rotX));
            lastDX = e.clientX;
            lastDY = e.clientY;
            updateTransform();
          });
          sceneElDrag.addEventListener("pointerup", () => {
            dragging = false;
            autoSpin = wasSpin;
          });

          // ── GUI ───────────────────────────────────────────────────────────
          const $size = stage.querySelector("#p5b-size");
          const $speed = stage.querySelector("#p5b-speed");
          const $tilt = stage.querySelector("#p5b-tilt");
          $size.addEventListener("input", (e) => {
            sizeScale = parseFloat(e.target.value) / 100;
            stage.querySelector("#p5b-size-val").textContent =
              e.target.value + "%";
            updateTransform();
          });
          $speed.addEventListener("input", (e) => {
            spinSpeed = parseFloat(e.target.value);
            autoSpin = spinSpeed > 0;
            stage.querySelector("#p5b-speed-val").textContent = e.target.value;
          });
          $tilt.addEventListener("input", (e) => {
            rotX = parseFloat(e.target.value);
            stage.querySelector("#p5b-tilt-val").textContent =
              (rotX >= 0 ? "+" : "") + rotX + "°";
            updateTransform();
          });
          const btnCW = stage.querySelector("#p5b-dir-cw");
          const btnCCW = stage.querySelector("#p5b-dir-ccw");
          btnCW.addEventListener("click", () => {
            spinDir = 1;
            btnCW.classList.add("active");
            btnCCW.classList.remove("active");
          });
          btnCCW.addEventListener("click", () => {
            spinDir = -1;
            btnCCW.classList.add("active");
            btnCW.classList.remove("active");
          });
          // Apply initial bg from book settings
          wrapEl.style.background = book._3dColors.bg || "transparent";

          stage.querySelector("#p5b-bg").addEventListener("input", (e) => {
            wrapEl.style.background = e.target.value;
          });
          stage.querySelector("#p5b-edge").addEventListener("input", (e) => {
            const c = e.target.value;
            const newEdgeH = _makePageEdge(coverW, spineW, c, "y");
            const newEdgeW = _makePageEdge(spineW, coverH, c, "x");
            stage
              .querySelectorAll(".p5book-3d-top, .p5book-3d-bot")
              .forEach((img) => (img.src = newEdgeH));
            const innerImg = stage.querySelector(
              ".p5book-3d-edge img:not(.p5book-3d-pages)",
            );
            if (innerImg) innerImg.src = newEdgeW;
          });
          stage
            .querySelector("#p5b-exit")
            .addEventListener("click", () => setMode("flipbook"));



        };

        const toolbar = viewer.querySelector(".p5book-toolbar");
        const setMode = (newMode) => {
          mode = newMode;
          viewer.querySelector("#p5book-btn-flipbook").style.fontWeight =
            mode === "flipbook" ? "bold" : "";
          viewer.querySelector("#p5book-btn-grid").style.fontWeight =
            mode === "grid" ? "bold" : "";
          viewer.querySelector("#p5book-btn-3d").style.fontWeight =
            mode === "3d" ? "bold" : "";
          if (mode === "flipbook") renderFlipbook();
          else if (mode === "grid") renderGrid();
          else render3D();
        };

        viewer
          .querySelector("#p5book-btn-flipbook")
          .addEventListener("click", () => setMode("flipbook"));
        viewer
          .querySelector("#p5book-btn-grid")
          .addEventListener("click", () => setMode("grid"));
        viewer
          .querySelector("#p5book-btn-3d")
          .addEventListener("click", () => setMode("3d"));

        if (this._bleed > 0) {
          const chk = viewer.querySelector("#p5book-chk-bleed");
          chk.addEventListener("change", () => {
            showBleed = chk.checked;
            viewItems = book._buildViewItems(showBleed);
            if (current >= viewItems.length) current = 0;
            if (mode === "flipbook") renderFlipbook();
            else if (mode === "grid") renderGrid();
            else render3D();
          });
        }

        viewer
          .querySelector("#p5book-btn-download")
          .addEventListener("click", () => {
            const sel = viewer.querySelector("#p5book-dl-sel");
            if (sel && sel.value === "saddle") book.saveSaddleStitch();
            else if (sel && sel.value === "cover") book.saveCover();
            else book.save();
          });
        if (this._saddleStitch) {
          viewer
            .querySelector("#p5book-btn-saddle")
            ?.addEventListener("click", () => book.saveSaddleStitch());
        }

        viewer
          .querySelector("#p5book-btn-print")
          .addEventListener("click", () => {
            try {
              const sel = viewer.querySelector("#p5book-dl-sel");
              let pdf;
              if (sel && sel.value === "saddle") {
                pdf = book._buildSaddleStitchPDF();
              } else if (sel && sel.value === "cover") {
                pdf = book._buildCoverPDF();
              } else {
                pdf = book._spread ? book._buildSpreadPDF() : book._pdf;
              }
              const blob = pdf.output("blob");
              const url = URL.createObjectURL(blob);
              const win = window.open(url, "_blank");
              if (win)
                win.addEventListener("load", () => URL.revokeObjectURL(url), {
                  once: true,
                });
            } catch (e) {
              alert(e.message);
            }
          });

        document.addEventListener("keydown", (e) => {
          if (mode !== "flipbook") return;
          const prevKey = book._rtl ? "ArrowRight" : "ArrowLeft";
          const nextKey = book._rtl ? "ArrowLeft" : "ArrowRight";
          if (e.key === prevKey && current > 0) {
            current--;
            renderFlipbook();
          }
          if (e.key === nextKey && current < viewItems.length - 1) {
            current++;
            renderFlipbook();
          }
        });

        setMode("flipbook");
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
        const MM_PER_UNIT = {
          in: 25.4,
          cm: 10,
          mm: 1,
          pt: 25.4 / 72,
          px: 25.4 / 96,
        };
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
        pdf.addImage(
          compound.toDataURL("image/jpeg", 0.92),
          "JPEG",
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
            filename || this._filename.replace(".pdf", "-cover.pdf"),
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
            filename || this._filename.replace(".pdf", "-saddle.pdf"),
          );
        } catch (e) {
          alert("[p5.book] saveSaddleStitch(): " + e.message);
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

        for (let col = 0; col < cols && lineIdx < lines.length; col++) {
          const cx = x + col * (colW + gutter);
          for (let i = 0; i < maxLines && lineIdx < lines.length; i++) {
            p.text(lines[lineIdx], cx, y + ascent + i * leading);
            lineIdx++;
          }
        }

        return lines.slice(lineIdx).join("\n");
      }
    }

    fn.createBook = function (
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
  });
