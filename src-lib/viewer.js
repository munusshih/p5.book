// Built-in viewer for p5.book
// Receives the Book instance as `book`.

import { MM_PER_UNIT } from "./constants.js";
import styles from "./viewer.css";
export function showViewer(book) {
  if (book._viewerShown) return;
  book._viewerShown = true;
  book._removeProgressUI();
  let showBleed = book._bleed > 0;
  let viewItems = book._buildViewItems(showBleed);
  let current = 0;
  let mode = book._viewerMode || "flipbook";

  if (!document.getElementById("p5book-styles")) {
    const s = document.createElement("style");
    s.id = "p5book-styles";
    s.textContent = styles;
    document.head.appendChild(s);
  }

  const viewer = document.createElement("div");
  viewer.className = "p5book-viewer";
  if (book._rtl) viewer.setAttribute("dir", "rtl");
  viewer.innerHTML = `
    <dialog id="p5book-shortcuts-dialog">
      <h3>Keyboard shortcuts</h3>
      <table>
        <tr><td><kbd>${book._rtl ? "→" : "←"}</kbd> / <kbd>${book._rtl ? "←" : "→"}</kbd></td><td>Previous / Next page</td></tr>
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
    const trimHmm = book._trimH * (MM_PER_UNIT[book._unit] || 25.4);
    const trimWmm = book._trimW * (MM_PER_UNIT[book._unit] || 25.4);
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
    const _edgeCache = new Map();
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
      if (shadowEl) {
        const sinY = Math.sin((rotY * Math.PI) / 180);
        const cosX = Math.cos((rotX * Math.PI) / 180);
        const offsetX = Math.round(sinY * coverW * 0.08);
        shadowEl.style.transform = `translateX(${offsetX}px) scaleX(${Math.max(0.3, Math.abs(cosX)).toFixed(3)})`;
        shadowEl.style.opacity = (
          0.25 +
          Math.abs(Math.sin((rotX * Math.PI) / 180)) * 0.3
        ).toFixed(3);
      }
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
    const _regenEdges = () => {
      const cr = stage.querySelector("#p5b-edge-r")?.value || ecR;
      const ct = stage.querySelector("#p5b-edge-t")?.value || ecT;
      const cb = stage.querySelector("#p5b-edge-b")?.value || ecB;
      // clear cache entries for these dimensions so new colours generate fresh textures
      _edgeCache.delete(`${coverW}x${spineW}:${ct}:y`);
      _edgeCache.delete(`${coverW}x${spineW}:${cb}:y`);
      _edgeCache.delete(`${spineW}x${coverH}:${cr}:x`);
      const newTop = _makePageEdge(coverW, spineW, ct, "y");
      const newBot = _makePageEdge(coverW, spineW, cb, "y");
      const newSide = _makePageEdge(spineW, coverH, cr, "x");
      stage
        .querySelectorAll(".p5book-3d-top")
        .forEach((img) => (img.src = newTop));
      stage
        .querySelectorAll(".p5book-3d-bot")
        .forEach((img) => (img.src = newBot));
      const innerImg = stage.querySelector(
        ".p5book-3d-edge img:not(.p5book-3d-pages)",
      );
      if (innerImg) innerImg.src = newSide;
    };
    stage.querySelector("#p5b-edge-r")?.addEventListener("input", _regenEdges);
    stage.querySelector("#p5b-edge-t")?.addEventListener("input", _regenEdges);
    stage.querySelector("#p5b-edge-b")?.addEventListener("input", _regenEdges);

    // ── URL hash: encode/restore view state ───────────────────────────
    const _writeHash = () => {
      try {
        const d = {
          mode,
          current,
          rotY: Math.round(rotY * 10) / 10,
          rotX,
          sizeScale,
          spinSpeed,
        };
        history.replaceState(null, "", "#p5book=" + btoa(JSON.stringify(d)));
      } catch (_) {}
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
          stage.querySelector("#p5b-tilt-val").textContent =
            (rotX >= 0 ? "+" : "") + rotX + "°";
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
      } catch (_) {}
    };
    _readHash();
    // write hash on control changes
    [$size, $speed, $tilt].forEach((el) =>
      el.addEventListener("change", _writeHash),
    );
    [btnCW, btnCCW].forEach((btn) => btn.addEventListener("click", _writeHash));
    // throttled hash update during animation
    [$size, $speed, $tilt].forEach((el) =>
      el.addEventListener("change", _writeHash),
    );
    [btnCW, btnCCW].forEach((btn) => btn.addEventListener("click", _writeHash));
    stage
      .querySelector("#p5b-exit")
      .addEventListener("click", () => setMode("flipbook"));
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

  viewer
    .querySelector("#p5book-mode-sel")
    .addEventListener("change", (e) => setMode(e.target.value));

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
          once: true,
        });
    } catch (e) {
      alert(e.message);
    }
  });

  // ── keyboard shortcuts ────────────────────────────────────────────
  const shortcutsDlg = viewer.querySelector("#p5book-shortcuts-dialog");
  viewer.querySelector("#p5book-btn-help").addEventListener("click", () => {
    if (shortcutsDlg) shortcutsDlg.showModal?.();
  });

  document.addEventListener("keydown", (e) => {
    // Ignore key events when focus is in an input/select/textarea
    if (
      ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)
    )
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
    if (
      (e.key === nextKey || e.key === "]") &&
      current < viewItems.length - 1
    ) {
      current = e.key === "]" ? viewItems.length - 1 : current + 1;
      renderFlipbook();
    }
  });

  setMode(book._viewerMode || "flipbook");
}
