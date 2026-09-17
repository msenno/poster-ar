// Add after app.js. Compatible with the supplied MindAR 1.2.5 / A-Frame app.
(() => {
  'use strict';
  const config = window.POSTER_AR || {};
  const ar = document.getElementById('ar');
  const container = document.getElementById('scene-container');
  const top = ar?.querySelector('.ar-top');
  if (!ar || !container || !top || document.getElementById('freeze-view')) return;

  const css = document.createElement('style');
  css.textContent = `
    #freeze-view{flex:none;min-height:42px;padding:8px 12px}
    #freeze-layer{position:absolute;inset:0;z-index:20;background:#102031;color:#fff}
    #freeze-layer[hidden]{display:none!important}
    .freeze-toolbar{position:absolute;top:max(8px,env(safe-area-inset-top));left:10px;right:10px;display:flex;gap:8px;align-items:center;justify-content:flex-end;z-index:2;flex-wrap:wrap}
    .freeze-toolbar button,.freeze-bottom button{min-height:40px;padding:6px 10px;font-size:.9rem}
    #freeze-title{margin-right:auto;font:600 .9rem Arial,sans-serif}
    #freeze-stage{position:absolute;inset:66px 0 70px;overflow:hidden;touch-action:none;cursor:grab}
    #freeze-canvas{position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;max-width:none}
    .freeze-bottom{position:absolute;bottom:max(8px,env(safe-area-inset-bottom));left:10px;right:10px;display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap}
    #freeze-help{font:.85rem Arial,sans-serif;color:#d5e3ed}
    @media(max-width:600px){.ar-top{flex-wrap:wrap}.ar-top p{flex:1;min-width:100px;margin:0}.freeze-toolbar{gap:5px}.freeze-toolbar button{font-size:.8rem}#freeze-title{max-width:40%;font-size:.8rem}#freeze-help{flex-basis:100%;text-align:center}}
  `;
  document.head.appendChild(css);
  function make(tag, id, text, parent) {
    const node = document.createElement(tag);
    if (id) node.id = id;
    if (text) node.textContent = text;
    if (tag === 'button') { node.type = 'button'; node.className = 'secondary'; }
    parent?.appendChild(node);
    return node;
  }
  const button = make('button', 'freeze-view', 'Freeze view', top);
  button.disabled = true;
  button.title = 'Recognize an image and wait for its figures to load';
  const layer = make('div', 'freeze-layer', '', ar);
  layer.hidden = true;
  layer.setAttribute('role', 'region');
  layer.setAttribute('aria-label', 'Frozen AR view');
  const toolbar = make('div', '', '', layer); toolbar.className = 'freeze-toolbar';
  const title = make('span', 'freeze-title', 'Frozen view', toolbar);
  const resume = make('button', 'freeze-resume', 'Resume camera', toolbar);
  const close = make('button', 'freeze-close', 'Close AR', toolbar);
  const stage = make('div', 'freeze-stage', '', layer);
  const canvas = make('canvas', 'freeze-canvas', '', stage);
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Still image of the camera and AR figures. Use zoom controls or pinch to inspect.');
  const bottom = make('div', '', '', layer); bottom.className = 'freeze-bottom';
  const minus = make('button', 'freeze-minus', '−', bottom); minus.setAttribute('aria-label', 'Zoom out');
  const plus = make('button', 'freeze-plus', '+', bottom); plus.setAttribute('aria-label', 'Zoom in');
  const fit = make('button', 'freeze-fit', 'Fit view', bottom);
  const help = make('span', 'freeze-help', 'Pinch to zoom · drag to move', bottom);

  let scene = null, activeAnchor = null, frozen = false, busy = false;
  let readyAt = null, autoArmed = true;
  let sourceWidth = 1, sourceHeight = 1, zoom = 1, minZoom = 1, x = 0, y = 0;
  let previousFocus = null;
  const pointers = new Map();
  let gesture = null;
  const delay = Number.isFinite(config.freezeDelayMs) && config.freezeDelayMs >= 0 ? config.freezeDelayMs : 1200;

  function ready() {
    if (ar.hidden || !scene || !activeAnchor || !activeAnchor.object3D?.visible || !scene.renderer ||
        !scene.systems?.['mindar-image-system']?.controller) return false;
    let hasFigure = false;
    activeAnchor.object3D.traverse(object => { if (object.isMesh && object.visible !== false) hasFigure = true; });
    return hasFigure;
  }
  function applyTransform() {
    const width = sourceWidth * zoom, height = sourceHeight * zoom;
    x = width <= stage.clientWidth ? (stage.clientWidth - width) / 2 : Math.min(0, Math.max(stage.clientWidth - width, x));
    y = height <= stage.clientHeight ? (stage.clientHeight - height) / 2 : Math.min(0, Math.max(stage.clientHeight - height, y));
    canvas.style.transform = `translate(${x}px,${y}px) scale(${zoom})`;
  }
  function fitView() {
    if (!frozen || stage.clientWidth <= 0 || stage.clientHeight <= 0) return;
    minZoom = Math.min(stage.clientWidth / sourceWidth, stage.clientHeight / sourceHeight);
    zoom = minZoom; x = 0; y = 0;
    pointers.clear(); gesture = null;
    applyTransform();
  }
  function zoomAt(next, px = stage.clientWidth / 2, py = stage.clientHeight / 2) {
    const scale = Math.max(minZoom, Math.min(minZoom * 6, next));
    x = px - (px - x) * scale / zoom;
    y = py - (py - y) * scale / zoom;
    zoom = scale;
    applyTransform();
  }
  function attachScene() {
    const next = container.querySelector('a-scene');
    if (!next || next === scene) return;
    scene = next;
    for (const anchor of scene.querySelectorAll('[mindar-image-target]')) {
      anchor.addEventListener('targetFound', () => {
        if (frozen || busy) return;
        activeAnchor = anchor;
        readyAt = null;
      });
      anchor.addEventListener('targetLost', () => {
        if (frozen || busy || activeAnchor !== anchor) return;
        activeAnchor = null;
        readyAt = null;
        autoArmed = true;
      });
    }
  }
  const observer = new MutationObserver(attachScene);
  observer.observe(container, {childList: true});
  attachScene();

  function freeze() {
    if (frozen || busy || !ready()) return;
    busy = true;
    const system = scene.systems['mindar-image-system'];
    let paused = false;
    try {
      const video = system.video;
      const renderer = scene.renderer;
      const rootRect = ar.getBoundingClientRect();
      if (!video || video.readyState < 2 || !rootRect.width || !rootRect.height || !scene.camera ||
          typeof system.pause !== 'function' || typeof system.unpause !== 'function') {
        throw new Error('The camera is not ready for freezing yet.');
      }
      sourceWidth = rootRect.width; sourceHeight = rootRect.height;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(sourceWidth * pixelRatio));
      canvas.height = Math.max(1, Math.round(sourceHeight * pixelRatio));
      canvas.style.width = `${sourceWidth}px`;
      canvas.style.height = `${sourceHeight}px`;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('This browser could not prepare the frozen view.');
      context.setTransform(canvas.width / sourceWidth, 0, 0, canvas.height / sourceHeight, 0, 0);
      context.fillStyle = '#102031';
      context.fillRect(0, 0, sourceWidth, sourceHeight);
      // MindAR sizes and positions its video element to crop it to the viewport.
      // Reuse those CSS rectangles so video and projected figures stay aligned.
      const videoRect = video.getBoundingClientRect();
      context.drawImage(video, videoRect.left - rootRect.left, videoRect.top - rootRect.top, videoRect.width, videoRect.height);
      // Draw immediately after rendering: WebGL buffers need not be preserved.
      renderer.render(scene.object3D, scene.camera);
      const glCanvas = renderer.domElement;
      const glRect = glCanvas.getBoundingClientRect();
      context.drawImage(glCanvas, glRect.left - rootRect.left, glRect.top - rootRect.top, glRect.width, glRect.height);
      paused = true;
      system.pause();
      scene.pause();
      frozen = true;
      autoArmed = false;
      layer.hidden = false;
      previousFocus = document.activeElement;
      const index = activeAnchor.components?.['mindar-image-target']?.data?.targetIndex;
      const entry = config.targets?.find(target => target.targetIndex === index);
      title.textContent = entry ? `${entry.label} · frozen` : 'Frozen view';
      help.textContent = 'Pinch to zoom · drag to move';
      button.textContent = 'View frozen';
      button.disabled = true;
      fitView();
      resume.focus();
    } catch (error) {
      if (paused) { scene.play(); system.unpause(); }
      frozen = false;
      layer.hidden = true;
      // Leave live AR usable when a snapshot cannot be created.
      const status = document.getElementById('tracking');
      if (status) status.textContent = error.message || 'Unable to freeze. Try again once the figures appear.';
      autoArmed = false;
    } finally { busy = false; }
  }
  function resumeLive() {
    if (!frozen || busy) return;
    busy = true;
    try {
      scene.play();
      scene.systems['mindar-image-system'].unpause();
      frozen = false;
      layer.hidden = true;
      pointers.clear(); gesture = null;
      readyAt = null;
      button.textContent = 'Freeze view';
      // Do not immediately auto-freeze the same target again after Resume.
      // Auto mode is re-armed once the current target is lost.
      previousFocus?.focus?.();
      canvas.width = 1; canvas.height = 1;
    } catch (_) {
      help.textContent = 'Camera could not resume. Close AR and reopen it.';
    } finally { busy = false; }
  }
  button.addEventListener('click', freeze);
  resume.addEventListener('click', resumeLive);
  close.addEventListener('click', () => document.getElementById('stop')?.click());
  fit.addEventListener('click', fitView);
  plus.addEventListener('click', () => zoomAt(zoom * 1.3));
  minus.addEventListener('click', () => zoomAt(zoom / 1.3));
  stage.addEventListener('wheel', event => {
    if (!frozen) return;
    event.preventDefault();
    const rect = stage.getBoundingClientRect();
    zoomAt(zoom * Math.exp(-event.deltaY * 0.002), event.clientX - rect.left, event.clientY - rect.top);
  }, {passive: false});
  function startGesture() {
    const values = [...pointers.values()];
    if (!values.length) { gesture = null; return; }
    const first = values[0], second = values[1];
    gesture = {x, y, zoom, centerX: second ? (first.x + second.x) / 2 : first.x,
      centerY: second ? (first.y + second.y) / 2 : first.y,
      distance: second ? Math.max(1, Math.hypot(first.x - second.x, first.y - second.y)) : 0};
  }
  stage.addEventListener('pointerdown', event => {
    if (!frozen) return;
    event.preventDefault();
    const rect = stage.getBoundingClientRect();
    pointers.set(event.pointerId, {x: event.clientX - rect.left, y: event.clientY - rect.top});
    stage.setPointerCapture?.(event.pointerId);
    startGesture();
  });
  stage.addEventListener('pointermove', event => {
    if (!frozen || !pointers.has(event.pointerId) || !gesture) return;
    event.preventDefault();
    const rect = stage.getBoundingClientRect();
    pointers.set(event.pointerId, {x: event.clientX - rect.left, y: event.clientY - rect.top});
    const [first, second] = [...pointers.values()];
    if (second && gesture.distance) {
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      zoom = Math.max(minZoom, Math.min(minZoom * 6, gesture.zoom * distance / gesture.distance));
      x = (first.x + second.x) / 2 - (gesture.centerX - gesture.x) * zoom / gesture.zoom;
      y = (first.y + second.y) / 2 - (gesture.centerY - gesture.y) * zoom / gesture.zoom;
    } else {
      x = gesture.x + first.x - gesture.centerX;
      y = gesture.y + first.y - gesture.centerY;
    }
    applyTransform();
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    stage.addEventListener(name, event => { pointers.delete(event.pointerId); startGesture(); });
  }
  window.addEventListener('resize', fitView);
  window.addEventListener('keydown', event => { if (event.key === 'Escape' && frozen) resumeLive(); });
  const poll = window.setInterval(() => {
    if (frozen || busy) return;
    const canFreeze = ready();
    button.disabled = !canFreeze;
    if (!canFreeze) { readyAt = null; return; }
    if (readyAt === null) readyAt = performance.now();
    if (config.autoFreeze === true && autoArmed && performance.now() - readyAt >= delay) freeze();
  }, 200);
  window.addEventListener('pagehide', () => {
    window.clearInterval(poll);
    observer.disconnect();
    canvas.width = 1; canvas.height = 1;
  });
})();
