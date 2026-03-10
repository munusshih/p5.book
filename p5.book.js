/*!
 * p5.book v0.1.0
 * PDF book generator addon for p5.js 2.x
 * MIT License — https://github.com/munusshih/p5.book
 * (c) Munus Shih
 */
(() => {
  // src-lib/constants.js
  var UNITS = ["in", "cm", "mm", "px", "pt"];
  var MM_PER_UNIT = {
    in: 25.4,
    cm: 10,
    mm: 1,
    pt: 25.4 / 72,
    px: 25.4 / 96
  };

  // src-lib/viewer.css
  var viewer_default = ":root {\n    --p5book-font: monospace;\n    --p5book-font-size: 20px;\n    --p5book-bg: #ffffff;\n    --p5book-toolbar-pad: 12px 20px;\n    --p5book-gap: 12px;\n    --p5book-thumb-h: 180px;\n}\n\n.p5book-viewer {\n    position: fixed;\n    inset: 0;\n    z-index: 99999;\n    background: var(--p5book-bg);\n    display: flex;\n    flex-direction: column;\n    font-family: var(--p5book-font);\n    font-size: var(--p5book-font-size);\n}\n\n.p5book-toolbar {\n    display: flex;\n    align-items: center;\n    gap: var(--p5book-gap);\n    padding: var(--p5book-toolbar-pad);\n    flex-shrink: 0;\n    flex-wrap: wrap;\n}\n\n.p5book-toolbar b,\n.p5book-toolbar button,\n.p5book-toolbar select {\n    font-size: var(--p5book-font-size);\n}\n\n.p5book-chk-label {\n    display: flex;\n    align-items: center;\n    gap: 6px;\n    font-family: var(--p5book-font);\n    font-size: var(--p5book-font-size);\n    cursor: pointer;\n    user-select: none;\n}\n\n.p5book-chk-label input[type=checkbox] {\n    width: 1em;\n    height: 1em;\n    cursor: pointer;\n}\n\n.p5book-stage {\n    flex: 1;\n    overflow: auto;\n    display: flex;\n    align-items: flex-start;\n    justify-content: flex-start;\n}\n\n.p5book-flipbook {\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    gap: 20px;\n    padding: 32px;\n    margin: auto;\n}\n\n.p5book-flipbook img {\n    max-height: calc(100vh - 160px);\n    max-width: calc(100vw - 80px);\n    display: block;\n}\n\n.p5book-flipbook-nav {\n    display: flex;\n    align-items: center;\n    gap: 16px;\n}\n\n.p5book-flipbook-nav button,\n.p5book-flipbook-nav select {\n    font-size: var(--p5book-font-size);\n}\n\n.p5book-grid {\n    display: flex;\n    flex-wrap: wrap;\n    justify-content: center;\n    align-items: flex-start;\n    gap: var(--p5book-gap);\n    padding: 32px;\n    width: 100%;\n    box-sizing: border-box;\n}\n\n.p5book-grid-item {\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    gap: 6px;\n    cursor: pointer;\n}\n\n.p5book-grid-item img {\n    height: var(--p5book-thumb-h);\n    width: auto;\n    display: block;\n}\n\n.p5book-grid-item span {\n    font-size: calc(var(--p5book-font-size) * 0.75);\n}\n\n/* \u2500\u2500 3D viewer \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.p5book-3d-wrap {\n    position: relative;\n    width: 100%;\n    height: 100%;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    overflow: hidden;\n}\n\n.p5book-3d-scene {\n    perspective: 1400px;\n    flex-shrink: 0;\n    cursor: grab;\n    user-select: none;\n}\n\n.p5book-3d-scene:active {\n    cursor: grabbing;\n}\n\n.p5book-3d-book {\n    position: relative;\n    transform-style: preserve-3d;\n}\n\n.p5book-3d-face {\n    position: absolute;\n    top: 0;\n    left: 0;\n    overflow: hidden;\n}\n\n.p5book-3d-face img {\n    width: 100%;\n    height: 100%;\n    display: block;\n    object-fit: fill;\n    pointer-events: none;\n    draggable: false;\n}\n\n.p5book-3d-shadow {\n    background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.35) 0%, transparent 70%);\n    height: 24px;\n    margin-top: 20px;\n    border-radius: 50%;\n    flex-shrink: 0;\n}\n\n/* info panel \u2014 bottom left, no border, transparent */\n.p5book-3d-info {\n    position: absolute;\n    bottom: 0;\n    left: 0;\n    padding: 16px 20px;\n    font-family: system-ui, sans-serif;\n    font-size: 12px;\n    line-height: 1.9;\n    opacity: 0.45;\n    pointer-events: none;\n}\n\n.p5book-3d-info dl {\n    margin: 0;\n    display: grid;\n    grid-template-columns: auto auto;\n    column-gap: 12px;\n}\n\n.p5book-3d-info dt {\n    font-weight: 600;\n    grid-column: 1;\n}\n\n.p5book-3d-info dd {\n    margin: 0;\n    grid-column: 2;\n}\n\n/* controls panel \u2014 bottom right */\n.p5book-3d-ctrl {\n    position: absolute;\n    bottom: 0;\n    right: 0;\n    display: flex;\n    flex-direction: column;\n    gap: 14px;\n    padding: 16px 20px;\n    font-family: system-ui, sans-serif;\n    font-size: 13px;\n    background: var(--p5book-bg);\n    border-top: 1px solid rgba(0, 0, 0, 0.1);\n    border-left: 1px solid rgba(0, 0, 0, 0.1);\n    pointer-events: auto;\n    min-width: 220px;\n}\n\n.p5book-3d-ctrl-group {\n    display: flex;\n    flex-direction: column;\n    gap: 8px;\n}\n\n.p5book-3d-ctrl-group-title {\n    font-size: 10px;\n    text-transform: uppercase;\n    letter-spacing: 0.08em;\n    opacity: 0.4;\n    font-weight: 600;\n}\n\n.p5book-3d-ctrl-row {\n    display: flex;\n    align-items: center;\n    gap: 10px;\n}\n\n.p5book-3d-ctrl-row label {\n    flex: 1;\n    opacity: 0.7;\n    white-space: nowrap;\n}\n\n.p5book-3d-ctrl-row input[type=range] {\n    flex: 2;\n    cursor: pointer;\n    min-width: 0;\n}\n\n.p5book-3d-ctrl-row input[type=color] {\n    width: 28px;\n    height: 22px;\n    padding: 0;\n    border: 1px solid rgba(0, 0, 0, 0.2);\n    border-radius: 3px;\n    cursor: pointer;\n    flex-shrink: 0;\n}\n\n.p5book-3d-ctrl-row span.p5b-val {\n    font-size: 11px;\n    opacity: 0.45;\n    width: 34px;\n    text-align: right;\n    flex-shrink: 0;\n}\n\n.p5book-3d-dir {\n    display: flex;\n    gap: 6px;\n}\n\n.p5book-3d-dir button {\n    flex: 1;\n    font-family: system-ui, sans-serif;\n    font-size: 13px;\n    padding: 3px 0;\n    cursor: pointer;\n    border: 1px solid rgba(0, 0, 0, 0.2);\n    background: none;\n}\n\n.p5book-3d-dir button.active {\n    background: #000;\n    color: #fff;\n    border-color: #000;\n}\n\n/* \u2500\u2500 shortcuts dialog \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n#p5book-shortcuts-dialog {\n    border: 1px solid rgba(0, 0, 0, 0.15);\n    border-radius: 8px;\n    padding: 24px 28px;\n    font-family: var(--p5book-font);\n    font-size: calc(var(--p5book-font-size) * 0.85);\n    background: var(--p5book-bg);\n    max-width: min(480px, 90vw);\n}\n\n#p5book-shortcuts-dialog::backdrop {\n    background: rgba(0, 0, 0, 0.35);\n}\n\n#p5book-shortcuts-dialog h3 {\n    margin: 0 0 14px;\n    font-size: var(--p5book-font-size);\n}\n\n#p5book-shortcuts-dialog table {\n    border-collapse: collapse;\n    width: 100%;\n}\n\n#p5book-shortcuts-dialog td {\n    padding: 5px 12px 5px 0;\n}\n\n#p5book-shortcuts-dialog kbd {\n    display: inline-block;\n    padding: 1px 6px;\n    border: 1px solid rgba(0, 0, 0, 0.25);\n    border-radius: 3px;\n    font-size: 0.9em;\n}\n\n/* \u2500\u2500 responsive \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n@media (max-width: 640px) {\n    :root {\n        --p5book-font-size: 15px;\n        --p5book-toolbar-pad: 8px 12px;\n        --p5book-gap: 6px;\n        --p5book-thumb-h: 120px;\n    }\n\n    .p5book-flipbook img {\n        max-height: calc(100vh - 200px);\n        max-width: calc(100vw - 24px);\n    }\n\n    .p5book-3d-ctrl {\n        min-width: 160px;\n        font-size: 11px;\n    }\n}";

  // src-lib/viewer.js
  function showViewer(book) {
    if (book._viewerShown) return;
    book._viewerShown = true;
    book._removeProgressUI();
    let showBleed = book._bleed > 0;
    let viewItems = book._buildViewItems(showBleed);
    let current = 0;
    let mode = "flipbook";
    if (!document.getElementById("p5book-styles")) {
      const s = document.createElement("style");
      s.id = "p5book-styles";
      s.textContent = viewer_default;
      document.head.appendChild(s);
    }
    const viewer = document.createElement("div");
    viewer.className = "p5book-viewer";
    if (book._rtl) viewer.setAttribute("dir", "rtl");
    viewer.innerHTML = `
    <dialog id="p5book-shortcuts-dialog">
      <h3>Keyboard shortcuts</h3>
      <table>
        <tr><td><kbd>${book._rtl ? "\u2192" : "\u2190"}</kbd> / <kbd>${book._rtl ? "\u2190" : "\u2192"}</kbd></td><td>Previous / Next page</td></tr>
        <tr><td><kbd>[</kbd></td><td>First page</td></tr>
        <tr><td><kbd>]</kbd></td><td>Last page</td></tr>
        <tr><td><kbd>?</kbd></td><td>Toggle this dialog</td></tr>
      </table>
      <form method="dialog" style="margin-top:16px;text-align:right">
        <button>Close</button>
      </form>
    </dialog>
    <div class="p5book-toolbar">
      <b>p5.book</b>
      <select id="p5book-mode-sel">
        <option value="flipbook">flipbook</option>
        <option value="grid">grid</option>
        <option value="3d">3d viewer</option>
      </select>
      ${book._bleed > 0 ? '<label class="p5book-chk-label"><input type="checkbox" id="p5book-chk-bleed" checked> bleed</label>' : ""}
      <span style="flex:1"></span>
      <select id="p5book-dl-sel">
        <option value="pdf">PDF</option>
        ${book._saddleStitch ? '<option value="saddle">Saddle Stitch</option>' : ""}
        <option value="cover">Cover</option>
        <option value="frames-png">Frames (PNG)</option>
        <option value="frames-jpg">Frames (JPG)</option>
      </select>
      <button id="p5book-btn-download">download</button>
      <button id="p5book-btn-print">print</button>
      <button id="p5book-btn-help" title="Keyboard shortcuts" style="padding:0 10px;">?</button>
    </div>
    <div class="p5book-stage" id="p5book-stage"></div>
  `;
    document.body.appendChild(viewer);
    const stage = viewer.querySelector("#p5book-stage");
    const prevArrow = book._rtl ? "&rarr;" : "&larr;";
    const nextArrow = book._rtl ? "&larr;" : "&rarr;";
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
      stage.querySelector("#p5book-page-select").addEventListener("change", (e) => {
        current = parseInt(e.target.value);
        renderFlipbook();
      });
    };
    const renderGrid = () => {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      stage.innerHTML = `<div class="p5book-grid">${viewItems.map(
        (item, i) => `<div class="p5book-grid-item" data-i="${i}">
        <img src="${item.src}" /><span>${item.label}</span>
      </div>`
      ).join("")}</div>`;
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
      const trimHmm = book._trimH * (MM_PER_UNIT[book._unit] || 25.4);
      const trimWmm = book._trimW * (MM_PER_UNIT[book._unit] || 25.4);
      const spineMM = Math.max(
        3,
        Math.ceil((book.totalPages || 1) / 2) * book._pageThickMM + 2
      );
      const coverH = Math.min(
        window.innerHeight - 100,
        Math.max(
          300,
          Math.round((window.innerWidth - 300) * trimHmm / trimWmm)
        )
      );
      const coverW = Math.round(coverH * trimWmm / trimHmm);
      const spineW = Math.max(8, Math.round(coverH * spineMM / trimHmm));
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
        const grad = sctx.createLinearGradient(0, 0, sc.width, 0);
        grad.addColorStop(0, "#1a1a1a");
        grad.addColorStop(1, "#333");
        sctx.fillStyle = grad;
        sctx.fillRect(0, 0, sc.width, sc.height);
        const title = book._filename.replace(/\.pdf$/i, "");
        const fs = Math.min(14, Math.max(8, spineW * 0.45));
        sctx.save();
        sctx.translate(sc.width / 2, sc.height / 2);
        sctx.rotate(Math.PI / 2);
        sctx.fillStyle = "#999";
        sctx.font = `${fs * 4}px monospace`;
        sctx.textAlign = "center";
        sctx.textBaseline = "middle";
        sctx.fillText(title, 0, 0);
        sctx.restore();
        spineSrc = sc.toDataURL();
      }
      const hw = spineW / 2;
      const [ecR, ecT, ecB] = book._3dColors.edge;
      const _edgeCache = /* @__PURE__ */ new Map();
      const _makePageEdge = (w, h, bgColor, axis = "x") => {
        const key = `${w}x${h}:${bgColor}:${axis}`;
        if (_edgeCache.has(key)) return _edgeCache.get(key);
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
        const result = tc.toDataURL();
        _edgeCache.set(key, result);
        return result;
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
              <!-- inner edge (right side) \u2014 page stack texture -->
              <div class="p5book-3d-face p5book-3d-edge" style="width:${spineW}px;height:${coverH}px;
                transform:translateX(${coverW - hw}px) rotateY(90deg);">
                <img src="${pageEdgeW}" draggable="false">
              </div>
              <!-- top edge \u2014 page stack texture -->
              <div class="p5book-3d-face p5book-3d-edge" style="width:${coverW}px;height:${spineW}px;
                transform:translateY(-${hw}px) rotateX(-90deg);">
                <img src="${pageEdgeH_top}" class="p5book-3d-pages p5book-3d-top" draggable="false">
              </div>
              <!-- bottom edge \u2014 page stack texture -->
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
            <dt>trim</dt><dd>${trimWmm.toFixed(1)} \xD7 ${trimHmm.toFixed(1)} mm</dd>
            <dt></dt><dd>${book._trimW} \xD7 ${book._trimH} ${book._unit}</dd>
            <dt>bleed</dt><dd>${book._bleed > 0 ? `${book._bleed} ${book._unit}` : "none"}</dd>
            ${book._dpi ? `<dt>dpi</dt><dd>${book._dpi}</dd>` : ""}
            <dt>direction</dt><dd>${book._rtl ? "right \u2192 left" : "left \u2192 right"}</dd>
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
              <span class="p5b-val" id="p5b-tilt-val">\u22128\xB0</span>
            </div>
            <div class="p5book-3d-ctrl-row">
              <label>direction</label>
              <div class="p5book-3d-dir">
                <button id="p5b-dir-cw" class="active">\u21BB CW</button>
                <button id="p5b-dir-ccw">\u21BA CCW</button>
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
              <label>fore-edge</label>
              <input type="color" id="p5b-edge-r" value="${book._3dColors.edge[0]}">
            </div>
            <div class="p5book-3d-ctrl-row">
              <label>top edge</label>
              <input type="color" id="p5b-edge-t" value="${book._3dColors.edge[1]}">
            </div>
            <div class="p5book-3d-ctrl-row">
              <label>bottom edge</label>
              <input type="color" id="p5b-edge-b" value="${book._3dColors.edge[2]}">
            </div>
          </div>
          <button id="p5b-exit" style="display:none;">back</button>
        </div>
      </div>
    `;
      const bookEl = stage.querySelector("#p5book-3d-book");
      const sceneEl = stage.querySelector("#p5book-3d-scene");
      const wrapEl = stage.querySelector("#p5book-3d-wrap");
      const shadowEl = stage.querySelector("#p5book-3d-shadow");
      let rotY = -25, rotX = -8, spinSpeed = 40, sizeScale = 0.73, spinDir = 1;
      let autoSpin = true;
      const updateTransform = () => {
        bookEl.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
        sceneEl.style.transform = `scale(${sizeScale})`;
        if (shadowEl) {
          const sinY = Math.sin(rotY * Math.PI / 180);
          const cosX = Math.cos(rotX * Math.PI / 180);
          const offsetX = Math.round(sinY * coverW * 0.08);
          shadowEl.style.transform = `translateX(${offsetX}px) scaleX(${Math.max(0.3, Math.abs(cosX)).toFixed(3)})`;
          shadowEl.style.opacity = (0.25 + Math.abs(Math.sin(rotX * Math.PI / 180)) * 0.3).toFixed(3);
        }
      };
      updateTransform();
      const tick = () => {
        if (autoSpin) {
          rotY += spinSpeed * 5e-3 * spinDir;
          updateTransform();
        }
        animFrameId = requestAnimationFrame(tick);
      };
      animFrameId = requestAnimationFrame(tick);
      let dragging = false, lastDX = 0, lastDY = 0, wasSpin = false;
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
      const $size = stage.querySelector("#p5b-size");
      const $speed = stage.querySelector("#p5b-speed");
      const $tilt = stage.querySelector("#p5b-tilt");
      $size.addEventListener("input", (e) => {
        sizeScale = parseFloat(e.target.value) / 100;
        stage.querySelector("#p5b-size-val").textContent = e.target.value + "%";
        updateTransform();
      });
      $speed.addEventListener("input", (e) => {
        spinSpeed = parseFloat(e.target.value);
        autoSpin = spinSpeed > 0;
        stage.querySelector("#p5b-speed-val").textContent = e.target.value;
      });
      $tilt.addEventListener("input", (e) => {
        rotX = parseFloat(e.target.value);
        stage.querySelector("#p5b-tilt-val").textContent = (rotX >= 0 ? "+" : "") + rotX + "\xB0";
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
      wrapEl.style.background = book._3dColors.bg || "transparent";
      stage.querySelector("#p5b-bg").addEventListener("input", (e) => {
        wrapEl.style.background = e.target.value;
      });
      const _regenEdges = () => {
        const cr = stage.querySelector("#p5b-edge-r")?.value || ecR;
        const ct = stage.querySelector("#p5b-edge-t")?.value || ecT;
        const cb = stage.querySelector("#p5b-edge-b")?.value || ecB;
        _edgeCache.delete(`${coverW}x${spineW}:${ct}:y`);
        _edgeCache.delete(`${coverW}x${spineW}:${cb}:y`);
        _edgeCache.delete(`${spineW}x${coverH}:${cr}:x`);
        const newTop = _makePageEdge(coverW, spineW, ct, "y");
        const newBot = _makePageEdge(coverW, spineW, cb, "y");
        const newSide = _makePageEdge(spineW, coverH, cr, "x");
        stage.querySelectorAll(".p5book-3d-top").forEach((img) => img.src = newTop);
        stage.querySelectorAll(".p5book-3d-bot").forEach((img) => img.src = newBot);
        const innerImg = stage.querySelector(
          ".p5book-3d-edge img:not(.p5book-3d-pages)"
        );
        if (innerImg) innerImg.src = newSide;
      };
      stage.querySelector("#p5b-edge-r")?.addEventListener("input", _regenEdges);
      stage.querySelector("#p5b-edge-t")?.addEventListener("input", _regenEdges);
      stage.querySelector("#p5b-edge-b")?.addEventListener("input", _regenEdges);
      const _writeHash = () => {
        try {
          const d = {
            mode,
            current,
            rotY: Math.round(rotY * 10) / 10,
            rotX,
            sizeScale,
            spinSpeed
          };
          history.replaceState(null, "", "#p5book=" + btoa(JSON.stringify(d)));
        } catch (_) {
        }
      };
      const _readHash = () => {
        try {
          const raw = location.hash.replace(/^#p5book=/, "");
          if (!raw) return;
          const d = JSON.parse(atob(raw));
          if (typeof d.rotY === "number") rotY = d.rotY;
          if (typeof d.rotX === "number") {
            rotX = d.rotX;
            $tilt.value = rotX;
            stage.querySelector("#p5b-tilt-val").textContent = (rotX >= 0 ? "+" : "") + rotX + "\xB0";
          }
          if (typeof d.sizeScale === "number") {
            sizeScale = d.sizeScale;
            $size.value = Math.round(sizeScale * 100);
            stage.querySelector("#p5b-size-val").textContent = `${$size.value}%`;
          }
          if (typeof d.spinSpeed === "number") {
            spinSpeed = d.spinSpeed;
            autoSpin = spinSpeed > 0;
            $speed.value = spinSpeed;
            stage.querySelector("#p5b-speed-val").textContent = spinSpeed;
          }
          updateTransform();
        } catch (_) {
        }
      };
      _readHash();
      [$size, $speed, $tilt].forEach(
        (el) => el.addEventListener("change", _writeHash)
      );
      [btnCW, btnCCW].forEach((btn) => btn.addEventListener("click", _writeHash));
      [$size, $speed, $tilt].forEach(
        (el) => el.addEventListener("change", _writeHash)
      );
      [btnCW, btnCCW].forEach((btn) => btn.addEventListener("click", _writeHash));
      stage.querySelector("#p5b-exit").addEventListener("click", () => setMode("flipbook"));
    };
    const toolbar = viewer.querySelector(".p5book-toolbar");
    const setMode = (newMode) => {
      mode = newMode;
      const modeSel = viewer.querySelector("#p5book-mode-sel");
      if (modeSel) modeSel.value = mode;
      if (mode === "flipbook") renderFlipbook();
      else if (mode === "grid") renderGrid();
      else render3D();
    };
    viewer.querySelector("#p5book-mode-sel").addEventListener("change", (e) => setMode(e.target.value));
    if (book._bleed > 0) {
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
    viewer.querySelector("#p5book-btn-download").addEventListener("click", () => {
      const sel = viewer.querySelector("#p5book-dl-sel");
      const val = sel?.value;
      if (val === "saddle") book.saveSaddleStitch();
      else if (val === "cover") book.saveCover();
      else if (val === "frames-png") book.exportFrames("png");
      else if (val === "frames-jpg") book.exportFrames("jpeg");
      else book.save();
    });
    viewer.querySelector("#p5book-btn-print").addEventListener("click", () => {
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
            once: true
          });
      } catch (e) {
        alert(e.message);
      }
    });
    const shortcutsDlg = viewer.querySelector("#p5book-shortcuts-dialog");
    viewer.querySelector("#p5book-btn-help").addEventListener("click", () => {
      if (shortcutsDlg) shortcutsDlg.showModal?.();
    });
    document.addEventListener("keydown", (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName))
        return;
      if (e.key === "?" || e.key === "/") {
        if (shortcutsDlg) shortcutsDlg.showModal?.();
        return;
      }
      if (mode !== "flipbook") return;
      const prevKey = book._rtl ? "ArrowRight" : "ArrowLeft";
      const nextKey = book._rtl ? "ArrowLeft" : "ArrowRight";
      if ((e.key === prevKey || e.key === "[") && current > 0) {
        current = e.key === "[" ? 0 : current - 1;
        renderFlipbook();
      }
      if ((e.key === nextKey || e.key === "]") && current < viewItems.length - 1) {
        current = e.key === "]" ? viewItems.length - 1 : current + 1;
        renderFlipbook();
      }
    });
    setMode("flipbook");
  }

  // src-lib/progress.css
  var progress_default = '/* \u2500\u2500 progress UI \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n/* Injected by Book._createProgressUI() via a <style id="p5book-progress-styles"> tag */\n\n#p5book-progress {\n    position: fixed;\n    z-index: 99998;\n    display: flex;\n    flex-direction: column;\n    pointer-events: none;\n}\n\n/* full-screen overlay variant (opt-in via { progressBar: true }) */\n#p5book-progress.is-overlay {\n    inset: 0;\n    align-items: center;\n    justify-content: center;\n    gap: 14px;\n    background: rgba(255, 255, 255, 0.92);\n    font-family: monospace;\n    font-size: 13px;\n}\n\n/* default: small non-blocking corner badge */\n#p5book-progress.is-corner {\n    bottom: 16px;\n    right: 16px;\n    align-items: flex-end;\n    gap: 6px;\n}\n\n#p5book-prog-label.is-overlay {\n    opacity: 0.5;\n}\n\n#p5book-prog-label.is-corner {\n    font-family: monospace;\n    font-size: 11px;\n    background: rgba(0, 0, 0, 0.55);\n    color: #fff;\n    padding: 4px 9px;\n    border-radius: 20px;\n    letter-spacing: 0.03em;\n}\n\n.p5book-prog-track {\n    border-radius: 2px;\n    overflow: hidden;\n}\n\n.p5book-prog-track.is-overlay {\n    width: 240px;\n    height: 3px;\n    background: rgba(0, 0, 0, 0.1);\n}\n\n.p5book-prog-track.is-corner {\n    width: 120px;\n    height: 2px;\n    background: rgba(0, 0, 0, 0.15);\n}\n\n#p5book-prog-bar {\n    height: 100%;\n    width: 0%;\n    border-radius: 2px;\n}\n\n#p5book-prog-bar.is-overlay {\n    background: #000;\n    transition: width 0.1s linear;\n}\n\n#p5book-prog-bar.is-corner {\n    background: rgba(255, 255, 255, 0.9);\n    transition: width 0.12s linear;\n}';

  // src-lib/Book.js
  var Book = class _Book {
    constructor(p, widthOrSize, heightOrPages, totalPagesOrFilename, unitOrFilename, filenameArg) {
      if (!window.jspdf) {
        throw new Error(
          '[p5.book] jsPDF not found. Add this before p5.book.js:\n<script src="https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js"><\/script>'
        );
      }
      const { jsPDF } = window.jspdf;
      this._p = p;
      const _isOpts = (v) => v !== null && v !== void 0 && typeof v === "object" && !Array.isArray(v);
      let opts = {};
      if (_isOpts(filenameArg)) {
        opts = filenameArg;
        filenameArg = void 0;
      } else if (_isOpts(unitOrFilename)) {
        opts = unitOrFilename;
        unitOrFilename = void 0;
      } else if (_isOpts(totalPagesOrFilename)) {
        opts = totalPagesOrFilename;
        totalPagesOrFilename = void 0;
      }
      this._imageType = (opts.imageType || "jpeg").toLowerCase();
      this._jpegQuality = opts.jpegQuality ?? 0.92;
      const autoCanvas = opts.autoCanvas !== false;
      this._progressBarOverlay = opts.progressBar === true;
      let format, unit, totalPages, filename;
      if (typeof widthOrSize === "string") {
        format = widthOrSize.toLowerCase();
        totalPages = heightOrPages;
        unit = "mm";
        filename = typeof totalPagesOrFilename === "string" ? totalPagesOrFilename : "book.pdf";
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
      if (totalPages !== void 0 && totalPages !== null && typeof totalPages !== "number") {
        console.warn(
          "[p5.book] totalPages should be a number or omitted; got:",
          totalPages
        );
        totalPages = null;
      }
      this._unit = unit;
      this._pdf = new jsPDF({
        unit,
        format,
        orientation: Array.isArray(format) && format[0] > format[1] ? "l" : "p"
      });
      if (Array.isArray(format)) {
        this._trimW = format[0];
        this._trimH = format[1];
      } else {
        this._trimW = this._pdf.internal.pageSize.getWidth();
        this._trimH = this._pdf.internal.pageSize.getHeight();
      }
      if (autoCanvas) {
        const defaultCanvasW = 500;
        const defaultCanvasH = Math.round(
          defaultCanvasW * this._trimH / this._trimW
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
      this._pageThickMM = 0.1;
      this._3dColors = { bg: null, edge: ["#f0ece4", "#f0ece4", "#f0ece4"] };
      this._3dHideColors = false;
      this._bleedWarnedOnce = false;
      this.bleed = new Proxy(
        {},
        {
          get: (_, prop) => {
            if (!this._bleedWarnedOnce) {
              this._bleedWarnedOnce = true;
              console.warn(
                "[p5.book] book.bleed accessed before setBleed() \u2014 calls are no-ops. Add book.setBleed(amount) in setup() to enable bleed."
              );
            }
            return prop === "draw" ? () => {
            } : () => {
            };
          }
        }
      );
      this._spineGfx = null;
      this._pageImages = [];
      this._rawCanvases = [];
      this._columns = 1;
      this._columnGutter = 20;
      this._page = 0;
      this.totalPages = totalPages != null ? totalPages : null;
      this._progressEl = null;
      this._viewerShown = false;
      this._pagesProcessed = 0;
      this._pageQueue = Promise.resolve();
      if (this.totalPages != null) this._createProgressUI();
    }
    _createProgressUI() {
      if (!document.getElementById("p5book-progress-styles")) {
        const s = document.createElement("style");
        s.id = "p5book-progress-styles";
        s.textContent = progress_default;
        document.head.appendChild(s);
      }
      const v = this._progressBarOverlay ? "overlay" : "corner";
      const label = this._progressBarOverlay ? `rendering page 0 / ${this.totalPages}` : `0 / ${this.totalPages}`;
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
      const pct = Math.round(this._pagesProcessed / this.totalPages * 100);
      const bar = this._progressEl.querySelector("#p5book-prog-bar");
      const lbl = this._progressEl.querySelector("#p5book-prog-label");
      if (bar) bar.style.width = pct + "%";
      if (lbl)
        lbl.textContent = this._progressBarOverlay ? `rendering page ${this._pagesProcessed} / ${this.totalPages}` : `${this._pagesProcessed} / ${this.totalPages}`;
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
          Math.ceil((this.totalPages || 1) / 2) * this._pageThickMM + 2
        );
        const spineWpx = Math.max(
          8,
          Math.round(this._p.height * spineMM / trimHmm)
        );
        this._spineGfx = this._p.createGraphics(spineWpx, this._p.height);
        this._spineGfx.pixelDensity(this._p.pixelDensity());
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
      const trimW_in = this._trimW * mmPU / 25.4;
      const trimH_in = this._trimH * mmPU / 25.4;
      const density = dpi * trimW_in / this._p.width;
      const physH = Math.round(dpi * trimH_in);
      const logH = Math.round(physH / density);
      this._p.pixelDensity(density);
      if (logH !== this._p.height) this._p.resizeCanvas(this._p.width, logH);
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
          }
        });
        const mainCvs = this._p.canvas;
        this._offCanvas.width = Math.round(
          mainCvs.width * this.bleedWidth / this._trimW
        );
        this._offCanvas.height = Math.round(
          mainCvs.height * this.bleedHeight / this._trimH
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
          "[p5.book] setDirection() must be called before addPage()"
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
        }
      });
      const mainCvs = this._p.canvas;
      this._offCanvas = document.createElement("canvas");
      this._offCanvas.width = Math.round(
        mainCvs.width * this.bleedWidth / this._trimW
      );
      this._offCanvas.height = Math.round(
        mainCvs.height * this.bleedHeight / this._trimH
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
      this._pdf = new jsPDF({
        unit: this._unit,
        format: [this.bleedWidth, this.bleedHeight],
        orientation: this.bleedWidth > this.bleedHeight ? "l" : "p"
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
          "isLeftPage() is only meaningful when setSpread(true) is enabled"
        );
        return false;
      }
      if (this._page === 0 || this._page === this.totalPages - 1) {
        return false;
      }
      return this._rtl ? this._page % 2 === 0 : this._page % 2 === 1;
    }
    isRightPage() {
      if (!this._spread) {
        console.warn(
          "isRightPage() is only meaningful when setSpread(true) is enabled"
        );
        return false;
      }
      if (this._page === 0 || this._page === this.totalPages - 1) {
        return false;
      }
      return this._rtl ? this._page % 2 === 1 : this._page % 2 === 0;
    }
    addPage() {
      const b = this._bleed;
      const mainCvs = this._p.canvas;
      let rawCanvas;
      if (b > 0) {
        const neededW = Math.round(
          mainCvs.width * this.bleedWidth / this._trimW
        );
        const neededH = Math.round(
          mainCvs.height * this.bleedHeight / this._trimH
        );
        if (this._offCanvas.width !== neededW || this._offCanvas.height !== neededH) {
          this._offCanvas.width = neededW;
          this._offCanvas.height = neededH;
        }
        const offX = Math.round(mainCvs.width * (b / this._trimW));
        const offY = Math.round(mainCvs.height * (b / this._trimH));
        this._offCtx.clearRect(
          0,
          0,
          this._offCanvas.width,
          this._offCanvas.height
        );
        this._offCtx.drawImage(
          this.bleed.canvas,
          0,
          0,
          this._offCanvas.width,
          this._offCanvas.height
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
              this.bleedWidth > this.bleedHeight ? "l" : "p"
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
            b > 0 ? this.bleedHeight : this._trimH
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
      const x0 = b, y0 = b;
      const x1 = b + trimW, y1 = b + trimH;
      const pw = 2 * b + trimW;
      const ph = 2 * b + trimH;
      const lines = [
        [0, y0, x0 - gap, y0],
        [x0, 0, x0, y0 - gap],
        // TL
        [pw, y0, x1 + gap, y0],
        [x1, 0, x1, y0 - gap],
        // TR
        [0, y1, x0 - gap, y1],
        [x0, ph, x0, y1 + gap],
        // BL
        [pw, y1, x1 + gap, y1],
        [x1, ph, x1, y1 + gap]
        // BR
      ];
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
        const rawW = leftCvs.width;
        const bleedPx = (rawW - mainW) / 2;
        spread.width = 2 * mainW + 2 * bleedPx;
        spread.height = leftCvs.height;
        const ctx = spread.getContext("2d");
        const trimPlusBleed = rawW - bleedPx;
        ctx.drawImage(
          leftCvs,
          0,
          0,
          trimPlusBleed,
          spread.height,
          0,
          0,
          trimPlusBleed,
          spread.height
        );
        ctx.drawImage(
          rightCvs,
          bleedPx,
          0,
          trimPlusBleed,
          spread.height,
          trimPlusBleed,
          0,
          trimPlusBleed,
          spread.height
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
      const soloW = this.bleedWidth;
      const soloH = this.bleedHeight;
      const spreadW = 2 * this._trimW + 2 * b;
      const firstIsSolo = pairs[0][1] === null;
      const firstW = firstIsSolo ? soloW : spreadW;
      const pdf = new jsPDF({
        unit: this._unit,
        format: [firstW, soloH],
        orientation: firstIsSolo ? "p" : "l"
      });
      pairs.forEach(([li, ri], i) => {
        const isSolo = ri === null;
        if (i > 0)
          pdf.addPage(
            isSolo ? [soloW, soloH] : [spreadW, soloH],
            isSolo ? "p" : "l"
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
            soloH
          );
          if (this._printMarks)
            this._drawPrintMarksOn(pdf, this._trimW, this._trimH, b);
        } else {
          const spreadCvs = this._makeSpreadCanvas(
            this._rawCanvases[li],
            this._rawCanvases[ri]
          );
          pdf.addImage(
            spreadCvs.toDataURL(_fmt, this._jpegQuality),
            _pdfFmt,
            0,
            0,
            spreadW,
            soloH
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
          "[p5.book] saveSaddleStitch() requires a page count divisible by 4, got " + n
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
      const bpx = Math.round(mainW * this._bleed / this._trimW);
      const bpy = Math.round(mainH * this._bleed / this._trimH);
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
      const mayTrim = (cvs, tw, th) => showBleed ? cvs : this._makeTrimCanvas(cvs, tw, th);
      if (!isValidSpread) {
        return this._rawCanvases.map((rc, i) => ({
          src: showBleed ? this._pageImages[i] : toSrc(mayTrim(rc)),
          label: String(i + 1)
        }));
      }
      const items = [];
      items.push({
        src: showBleed ? this._pageImages[0] : toSrc(mayTrim(this._rawCanvases[0])),
        label: "cover"
      });
      for (let i = 1; i < n - 1; i += 2) {
        const [li, ri] = this._rtl ? [i + 1, i] : [i, i + 1];
        const cvs = this._makeSpreadCanvas(
          this._rawCanvases[li],
          this._rawCanvases[ri]
        );
        items.push({
          src: toSrc(mayTrim(cvs, 2 * mainW, mainH)),
          label: `pp.\xA0${i + 1}\u2013${i + 2}`
        });
      }
      items.push({
        src: showBleed ? this._pageImages[n - 1] : toSrc(mayTrim(this._rawCanvases[n - 1])),
        label: "back cover"
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
      const spineMM = Math.max(
        3,
        Math.ceil((this.totalPages || 1) / 2) * this._pageThickMM + 2
      );
      const spineU = spineMM / mmPerUnit;
      const frontCvs = this._rawCanvases[0];
      const backCvs = this._rawCanvases[n - 1];
      const pageW = frontCvs.width;
      const pageH = frontCvs.height;
      const spineWpx = Math.max(
        4,
        Math.round(spineU / this.bleedWidth * pageW)
      );
      const compound = document.createElement("canvas");
      compound.width = pageW * 2 + spineWpx;
      compound.height = pageH;
      const ctx = compound.getContext("2d");
      ctx.drawImage(backCvs, 0, 0);
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
          pageH
        );
      } else {
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(pageW, 0, spineWpx, pageH);
      }
      ctx.drawImage(frontCvs, pageW + spineWpx, 0);
      const b = this._bleed;
      const totalW = 2 * this.bleedWidth + spineU;
      const totalH = this.bleedHeight;
      const pdf = new jsPDF({
        unit: this._unit,
        format: [totalW, totalH],
        orientation: "l"
      });
      const _fmt = this._imageType === "png" ? "image/png" : "image/jpeg";
      const _pdfFmt = this._imageType === "png" ? "PNG" : "JPEG";
      pdf.addImage(
        compound.toDataURL(_fmt, this._jpegQuality),
        _pdfFmt,
        0,
        0,
        totalW,
        totalH
      );
      if (this._printMarks && b > 0) {
        const gap = 1 / mmPerUnit;
        const hair = 0.3 / mmPerUnit;
        const y0 = b, y1 = b + this._trimH, ph = totalH;
        const bx0 = b;
        const fx1 = totalW - b;
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
          [sf1, ph, sf1, y1 + gap]
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
          filename || this._filename.replace(/\.pdf$/i, "-cover.pdf")
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
          `[p5.book] saveSaddleStitch(): page count must be divisible by 4, but you have ${n} pages. Try ${Math.ceil(n / 4) * 4} pages.`
        );
        return;
      }
      try {
        this._buildSaddleStitchPDF().save(
          filename || this._filename.replace(/\.pdf$/i, "-saddle.pdf")
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
      const q = isJpeg ? this._jpegQuality : void 0;
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
      if (n === void 0) return this._columns;
      this._columns = Math.max(1, Math.floor(n));
      if (gutter !== void 0) this._columnGutter = gutter;
      return this;
    }
    /** Draw wrapped text into a box. Returns overflow text that didn't fit. */
    static _isCJK(ch) {
      const c = ch.charCodeAt(0);
      return c >= 19968 && c <= 40959 || c >= 12288 && c <= 12351 || c >= 12352 && c <= 12447 || c >= 12448 && c <= 12543 || c >= 44032 && c <= 55215 || c >= 65280 && c <= 65519;
    }
    static _wrapText(p, str, maxW) {
      const out = [];
      for (const para of str.split("\n")) {
        if (para === "") {
          out.push("");
          continue;
        }
        const hasCJK = Array.from(para).some(_Book._isCJK);
        if (hasCJK) {
          let line = "";
          for (const char of para) {
            if (char === " ") {
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
      const leading = _Book._getLeading(p);
      const ascent = p.textAscent();
      const maxLines = Math.max(1, Math.floor((h - ascent) / leading) + 1);
      const lines = _Book._wrapText(p, str, colW);
      let lineIdx = 0;
      const colIndices = this._rtl ? Array.from({ length: cols }, (_, i) => cols - 1 - i) : Array.from({ length: cols }, (_, i) => i);
      const prevDir = p.drawingContext.direction;
      if (this._rtl) p.drawingContext.direction = "rtl";
      for (const col of colIndices) {
        if (lineIdx >= lines.length) break;
        const cx = x + col * (colW + gutter);
        const tx = this._rtl ? cx + colW : cx;
        for (let i = 0; i < maxLines && lineIdx < lines.length; i++) {
          p.text(lines[lineIdx], tx, y + ascent + i * leading);
          lineIdx++;
        }
      }
      if (this._rtl) p.drawingContext.direction = prevDir;
      return lines.slice(lineIdx).join("\n");
    }
  };

  // src-lib/index.js
  if (typeof p5 !== "undefined")
    p5.registerAddon(function(p52, fn) {
      fn.createBook = function(widthOrSize, heightOrPages, totalPagesOrFilename, unitOrFilename, filenameArg) {
        return new Book(
          this,
          widthOrSize,
          heightOrPages,
          totalPagesOrFilename,
          unitOrFilename,
          filenameArg
        );
      };
    });
})();
