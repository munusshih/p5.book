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
        this._dpi = null;
        this.bleed = new Proxy({}, { get: () => () => {} });
        this._pageImages = [];
        this._rawCanvases = [];
        this._columns = 1;
        this._columnGutter = 20;
        this.page = 0;
        this.totalPages = totalPages != null ? totalPages : null;
      }

      /** Set canvas DPI for print quality. pixelDensity is derived from trim width.
       *  Call in setup() before addPage(). */
      setDPI(dpi) {
        if (this.page > 0)
          throw new Error("[p5.book] setDPI() must be called before addPage()");
        this._dpi = dpi;
        const trimW_in =
          (this._trimW * (MM_PER_UNIT[this._unit] || 25.4)) / 25.4;
        this._p.pixelDensity((dpi * trimW_in) / this._p.width);
      }

      /** Enable saddle-stitch imposition button in the viewer. Page count must be divisible by 4. */
      setSaddleStitch(enabled) {
        this._saddleStitch = !!enabled;
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
        this.bleed = new Proxy(gfx, {
          get: (target, prop) => {
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

      addPage() {
        if (this.page > 0)
          this._pdf.addPage(
            [this.bleedWidth, this.bleedHeight],
            this.bleedWidth > this.bleedHeight ? "l" : "p",
          );

        const b = this._bleed;
        const mainCvs = this._p.canvas;
        let rawCanvas;

        if (b > 0) {
          // Recompute offCanvas size every page — canvas dimensions may have changed (e.g. after setDPI)
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
          this._drawPrintMarksOn(this._pdf, this._trimW, this._trimH, b);

        this.page++;

        if (this.totalPages != null && this.page >= this.totalPages) {
          this._p.noLoop();
          this._showViewer();
        }
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

      // Reader spread: cover solo, inner pages paired left+right, back cover solo.
      _buildSpreadPDF() {
        const n = this._rawCanvases.length;
        if (n < 2)
          throw new Error("[p5.book] spread requires at least 2 pages");
        if ((n - 2) % 2 !== 0)
          throw new Error("[p5.book] spread requires an even total page count");

        const pairs = [[0, null]];
        for (let i = 1; i < n - 1; i += 2) pairs.push([i, i + 1]);
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
          pairs.push(k % 2 === 0 ? [n - 1 - k, k] : [k, n - 1 - k]);
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
          const cvs = this._makeSpreadCanvas(
            this._rawCanvases[i],
            this._rawCanvases[i + 1],
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
          `;
          document.head.appendChild(s);
        }

        const viewer = document.createElement("div");
        viewer.className = "p5book-viewer";
        viewer.innerHTML = `
          <div class="p5book-toolbar">
            <b>p5.book</b>
            <button id="p5book-btn-flipbook">flipbook</button>
            <button id="p5book-btn-grid">grid</button>
            ${this._bleed > 0 ? '<label class="p5book-chk-label"><input type="checkbox" id="p5book-chk-bleed" checked> bleed</label>' : ""}
            <span style="flex:1"></span>
            ${this._saddleStitch ? '<select id="p5book-dl-sel"><option value="pdf">PDF</option><option value="saddle">Saddle Stitch</option></select>' : ""}
            <button id="p5book-btn-download">download</button>
            <button id="p5book-btn-print">print</button>
          </div>
          <div class="p5book-stage" id="p5book-stage"></div>
        `;
        document.body.appendChild(viewer);

        const stage = viewer.querySelector("#p5book-stage");

        const renderFlipbook = () => {
          const item = viewItems[current];
          stage.innerHTML = `
            <div class="p5book-flipbook">
              <img src="${item.src}" />
              <div class="p5book-flipbook-nav">
                <button id="p5book-prev" ${current === 0 ? "disabled" : ""}>&larr;</button>
                <select id="p5book-page-select">
                  ${viewItems.map((v, i) => `<option value="${i}"${i === current ? " selected" : ""}>${v.label} / ${viewItems.length}</option>`).join("")}
                </select>
                <button id="p5book-next" ${current === viewItems.length - 1 ? "disabled" : ""}>&rarr;</button>
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

        const setMode = (newMode) => {
          mode = newMode;
          viewer.querySelector("#p5book-btn-flipbook").style.fontWeight =
            mode === "flipbook" ? "bold" : "";
          viewer.querySelector("#p5book-btn-grid").style.fontWeight =
            mode === "grid" ? "bold" : "";
          if (mode === "flipbook") renderFlipbook();
          else renderGrid();
        };

        viewer
          .querySelector("#p5book-btn-flipbook")
          .addEventListener("click", () => setMode("flipbook"));
        viewer
          .querySelector("#p5book-btn-grid")
          .addEventListener("click", () => setMode("grid"));

        if (this._bleed > 0) {
          const chk = viewer.querySelector("#p5book-chk-bleed");
          chk.addEventListener("change", () => {
            showBleed = chk.checked;
            viewItems = book._buildViewItems(showBleed);
            if (current >= viewItems.length) current = 0;
            if (mode === "flipbook") renderFlipbook();
            else renderGrid();
          });
        }

        viewer
          .querySelector("#p5book-btn-download")
          .addEventListener("click", () => {
            const sel = viewer.querySelector("#p5book-dl-sel");
            if (sel && sel.value === "saddle") book.saveSaddleStitch();
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
          if (e.key === "ArrowLeft" && current > 0) {
            current--;
            renderFlipbook();
          }
          if (e.key === "ArrowRight" && current < viewItems.length - 1) {
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
      static _wrapText(p, str, maxW) {
        const out = [];
        for (const para of str.split("\n")) {
          if (para === "") {
            out.push("");
            continue;
          }
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
