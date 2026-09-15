(() => {
  'use strict';
  const config = window.POSTER_AR || {};
  // Same smoothing and loss tolerance as stability update 3.
  const missTolerance = Number.isInteger(config.missTolerance) && config.missTolerance >= 0
    ? config.missTolerance : 15;
  const warmupTolerance = Number.isInteger(config.warmupTolerance) && config.warmupTolerance >= 0
    ? config.warmupTolerance : 8;
  const filterMinCF = Number.isFinite(config.filterMinCF) && config.filterMinCF > 0
    ? config.filterMinCF : 0.001;
  const filterBeta = Number.isFinite(config.filterBeta) && config.filterBeta >= 0
    ? config.filterBeta : 0.01;
  const $ = id => document.getElementById(id);
  const message = text => { $('message').textContent = text; };
  let targets = [], activeTarget = null, targetSelect = null;
  let pages = [], pageIndex = -1, plots = [], scene = null, anchor = null;
  let graphics = null, loadingPage = false, startingCamera = false, needsReload = false;
  let loadSerial = 0, visibleTargetIndex = null, closingCamera = false;
  const debug = new URLSearchParams(window.location.search).get('arDebug') === '1';
  let foundCount = 0, lostCount = 0, trackingState = 'waiting';
  let debugPanel = null;
  if (debug) {
    debugPanel = document.createElement('div');
    debugPanel.id = 'ar-debug';
    debugPanel.style.cssText = 'position:absolute;top:78px;left:14px;right:14px;z-index:6;padding:8px 10px;background:#fff;color:#172a39;font:12px/1.4 monospace;border-radius:6px;pointer-events:none;';
    $('ar').appendChild(debugPanel);
    const notice = document.createElement('p');
    notice.textContent = 'Tracking test · multi-target update 1 loaded. Camera event counts will appear in AR.';
    $('setup').appendChild(notice);
  }
  function updateDebug() {
    if (debugPanel) debugPanel.textContent = `Multi-target 1 | ${trackingState} | target: ${visibleTargetIndex ?? 'none'} | Found: ${foundCount} Lost: ${lostCount} | smoothing: ${filterMinCF}, ${filterBeta} | warmup: ${warmupTolerance}, miss: ${missTolerance}`;
  }
  updateDebug();

  function updateControls() {
    const locked = loadingPage || startingCamera || needsReload;
    for (const prefix of ['preview', 'ar']) {
      $(`${prefix}-pager`).hidden = pages.length <= 1;
      $(`${prefix}-prev`).disabled = locked || pageIndex <= 0;
      $(`${prefix}-next`).disabled = locked || pageIndex >= pages.length - 1;
      $(`${prefix}-page`).disabled = locked;
      $(`${prefix}-page`).value = String(Math.max(0, pageIndex));
    }
    if (targetSelect) {
      targetSelect.disabled = startingCamera || needsReload;
      targetSelect.value = String(activeTarget?.targetIndex ?? '');
    }
    // One gallery with a missing file must not block recognition of other targets.
    $('start').disabled = !needsReload && (startingCamera || !targets.length);
  }

  function updateTrackingText() {
    if (!scene || startingCamera || closingCamera) return;
    if (visibleTargetIndex === null) {
      $('tracking').textContent = 'Point at any recognition image on the poster';
    } else if (loadingPage) {
      $('tracking').textContent = `${activeTarget.label} · loading figures…`;
    } else if (plots.length) {
      $('tracking').textContent = `${activeTarget.label} · page ${pageIndex + 1} of ${pages.length}`;
    } else {
      $('tracking').textContent = `${activeTarget.label} found · figures could not load`;
    }
  }

  function clearGraphics() {
    if (!graphics) return;
    graphics.parent?.remove(graphics);
    graphics.traverse(object => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      if (object.material.map) object.material.map.dispose();
      object.material.dispose();
    });
    graphics = null;
  }

  function renderARPlots() {
    if (!anchor?.object3D || !scene?.renderer) return;
    clearGraphics();
    if (!plots.length) return;
    const THREE = window.AFRAME.THREE;
    graphics = new THREE.Group();
    plots.forEach(plot => {
      // One opaque surface per figure, as in the smoother version.
      const canvas = document.createElement('canvas');
      canvas.width = plot.width;
      canvas.height = plot.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Unable to prepare the plot texture.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(plot.image, 0, 0, canvas.width, canvas.height);
      const texture = new THREE.CanvasTexture(canvas);
      if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
      else texture.encoding = THREE.sRGBEncoding;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      const imagePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(plot.planeWidth, plot.planeHeight),
        new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide, transparent: false, toneMapped: false})
      );
      imagePlane.position.set(plot.x, plot.y, plot.z);
      graphics.add(imagePlane);
    });
    anchor.object3D.add(graphics);
  }

  function renderPreview() {
    if (!activeTarget) return;
    const layout = activeTarget.layout;
    $('target-preview').src = activeTarget.targetImage;
    $('target-preview').alt = `${activeTarget.label}: printed recognition image.`;
    $('pair').style.gridTemplateColumns = `1fr ${layout.overlayWidth}fr`;
    $('pair').style.columnGap = `${100 * layout.gap / (1 + layout.gap + layout.overlayWidth)}%`;
    const captions = document.querySelector('.preview-captions');
    captions.style.gridTemplateColumns = $('pair').style.gridTemplateColumns;
    captions.style.columnGap = $('pair').style.columnGap;
    if (captions.firstElementChild) captions.firstElementChild.textContent = activeTarget.label;
    const stackHeight = plots.reduce((sum, plot) => sum + plot.planeHeight, 0) + layout.stackGap * Math.max(0, plots.length - 1);
    $('plot-stack').style.transform = stackHeight > 0 ? `translateY(${-100 * layout.verticalOffset / stackHeight}%)` : '';
    $('plot-stack').replaceChildren();
    $('plain-links').replaceChildren();
    const linkLabel = document.createElement('span');
    linkLabel.textContent = 'View without AR:';
    $('plain-links').appendChild(linkLabel);
    plots.forEach((plot, index) => {
      const preview = document.createElement('img');
      preview.src = plot.src;
      preview.alt = `${plot.label}, AR figure ${index + 1} on this page, from top to bottom.`;
      preview.style.marginTop = index ? `${100 * layout.stackGap / layout.overlayWidth}%` : '0';
      $('plot-stack').appendChild(preview);
      const link = document.createElement('a');
      link.href = plot.src;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = `Open ${plot.label}`;
      $('plain-links').appendChild(link);
    });
    const names = plots.map(plot => plot.label).join(' · ');
    $('plot-names').textContent = activeTarget.label;
    $('ar-caption').textContent = names ? `AR, top to bottom: ${names}` : 'AR figures';
    // Keep document.title and #heading from index.html. They are not reset here.
  }

  async function goToPage(index) {
    if (!activeTarget || needsReload || closingCamera || index < 0 || index >= pages.length) return;
    const requestedTarget = activeTarget;
    const serial = ++loadSerial;
    loadingPage = true;
    updateControls();
    message(`Loading ${requestedTarget.label} figures…`);
    updateTrackingText();
    try {
      const images = await Promise.all(requestedTarget.pages[index].map(async entry => {
        const image = new Image();
        image.src = entry.src;
        try { await image.decode(); }
        catch (_) { throw new Error(`Cannot load ${entry.src}. Check the filename, extension and letter case in config.js, and upload the image to assets/.`); }
        return {...entry, image, width: image.naturalWidth, height: image.naturalHeight};
      }));
      // A slow response from the previous target must never appear on a new one.
      if (serial !== loadSerial || requestedTarget !== activeTarget) return;
      plots = window.posterLayout(images, requestedTarget.layout);
      pageIndex = index;
      requestedTarget.savedPage = index;
      renderPreview();
      renderARPlots();
      message(`${requestedTarget.label} · page ${index + 1} of ${pages.length}. The figures appear to the right of its recognition image.`);
    } catch (error) {
      if (serial !== loadSerial || requestedTarget !== activeTarget) return;
      message(error.message || 'Check this target’s image entries in config.js.');
    } finally {
      if (serial === loadSerial && requestedTarget === activeTarget) {
        loadingPage = false;
        updateControls();
        updateTrackingText();
      }
    }
  }

  function selectTarget(targetIndex) {
    const next = targets.find(target => target.targetIndex === targetIndex);
    if (!next || needsReload || closingCamera) return;
    if (next === activeTarget && (plots.length || loadingPage)) return;
    ++loadSerial;
    clearGraphics();
    activeTarget = next;
    anchor = next.anchor;
    pages = next.pages;
    plots = [];
    pageIndex = -1;
    loadingPage = false;
    for (const prefix of ['preview', 'ar']) {
      const select = $(`${prefix}-page`);
      select.replaceChildren();
      pages.forEach((page, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = `${index + 1} / ${pages.length} · ${page.map(entry => entry.label).join(' · ')}`;
        select.appendChild(option);
      });
    }
    renderPreview();
    updateControls();
    goToPage(next.savedPage);
  }

  for (const prefix of ['preview', 'ar']) {
    $(`${prefix}-prev`).addEventListener('click', () => goToPage(pageIndex - 1));
    $(`${prefix}-next`).addEventListener('click', () => goToPage(pageIndex + 1));
    $(`${prefix}-page`).addEventListener('change', event => goToPage(Number(event.target.value)));
  }

  function stopCamera() {
    closingCamera = true;
    ++loadSerial;
    const system = scene?.systems?.['mindar-image-system'];
    if (system?.controller) {
      try { system.controller.stopProcessVideo(); } catch (_) {}
    }
    const videos = new Set(document.querySelectorAll('video'));
    if (system?.video) videos.add(system.video);
    videos.forEach(video => {
      if (video.srcObject) video.srcObject.getTracks().forEach(track => track.stop());
      video.pause();
    });
    clearGraphics();
  }

  function fail(text) {
    stopCamera();
    if (scene) scene.pause();
    needsReload = true;
    loadingPage = false;
    startingCamera = false;
    $('start').textContent = 'Reload and try again';
    $('ar').hidden = true;
    $('setup').hidden = false;
    updateControls();
    message(text);
  }

  $('stop').addEventListener('click', () => {
    stopCamera();
    window.location.reload();
  });
  window.addEventListener('pagehide', stopCamera);
  window.addEventListener('pageshow', event => {
    if (event.persisted) window.location.reload();
  });

  $('start').addEventListener('click', async () => {
    if (needsReload) { window.location.reload(); return; }
    if (!targets.length || startingCamera || scene) return;
    if (location.protocol === 'file:' || !window.isSecureContext) {
      message('For camera access, open this page at its HTTPS website address. The layout preview works without a camera.');
      return;
    }
    if (!window.AFRAME || !window.MINDAR?.IMAGE) {
      message('The AR components did not load. Check that the vendor folder was uploaded, then reload.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      message('Camera access is unavailable here. Open this link directly in Safari on iPhone or Chrome on Android.');
      return;
    }
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) {
      message('This browser cannot run the AR graphics. Use the links below to open the figures.');
      return;
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    startingCamera = true;
    closingCamera = false;
    updateControls();
    message('Loading the recognition file…');
    try {
      const response = await fetch(config.targetFile);
      if (!response.ok) throw new Error('The recognition file could not load. Check targetFile in config.js and upload the compiled .mind file.');
      await response.arrayBuffer();
      if (closingCamera) return;
      $('setup').hidden = true;
      $('ar').hidden = false;
      $('tracking').textContent = 'Opening camera…';
      scene = document.createElement('a-scene');
      scene.setAttribute('embedded', '');
      // All targets are searchable; one is tracked at a time to keep phone load low.
      scene.setAttribute('mindar-image', `imageTargetSrc: ${config.targetFile}; maxTrack: 1; missTolerance: ${missTolerance}; warmupTolerance: ${warmupTolerance}; filterMinCF: ${filterMinCF}; filterBeta: ${filterBeta}; autoStart: false; uiLoading: no; uiScanning: no; uiError: no;`);
      scene.setAttribute('renderer', 'colorManagement: true; alpha: true; antialias: true');
      scene.setAttribute('vr-mode-ui', 'enabled: false');
      scene.setAttribute('device-orientation-permission-ui', 'enabled: false');
      const camera = document.createElement('a-camera');
      camera.setAttribute('position', '0 0 0');
      camera.setAttribute('look-controls', 'enabled: false');
      camera.setAttribute('wasd-controls', 'enabled: false');
      scene.appendChild(camera);
      targets.forEach(target => {
        target.anchor = document.createElement('a-entity');
        target.anchor.setAttribute('mindar-image-target', `targetIndex: ${target.targetIndex}`);
        scene.appendChild(target.anchor);
        target.anchor.addEventListener('targetFound', () => {
          if (closingCamera) return;
          foundCount += 1;
          visibleTargetIndex = target.targetIndex;
          trackingState = 'found';
          selectTarget(target.targetIndex);
          updateDebug();
          updateTrackingText();
        });
        target.anchor.addEventListener('targetLost', () => {
          if (closingCamera) return;
          lostCount += 1;
          if (visibleTargetIndex === target.targetIndex) {
            visibleTargetIndex = null;
            trackingState = 'lost';
            updateTrackingText();
          }
          updateDebug();
        });
      });
      anchor = activeTarget.anchor;
      scene.addEventListener('arReady', () => {
        if (closingCamera) return;
        startingCamera = false;
        trackingState = visibleTargetIndex === null ? 'searching' : 'found';
        updateControls();
        updateDebug();
        updateTrackingText();
      });
      scene.addEventListener('arError', () => {
        fail('The AR view could not start. Check camera permission and the compiled recognition file, then reload.');
      });
      scene.addEventListener('renderstart', () => {
        try {
          renderARPlots();
          scene.systems['mindar-image-system'].start();
        } catch (_) {
          fail('The AR view could not start. Reload to try again, or open the figures using the links below.');
        }
      }, {once: true});
      $('scene-container').appendChild(scene);
    } catch (error) {
      fail(error.message || 'The AR view could not open. Please reload and try again.');
    }
  });

  try {
    const entries = config.targets === undefined
      ? [{targetIndex: 0, label: 'Recognition image', targetImage: config.targetImage, overlays: config.overlays}]
      : config.targets;
    if (!Array.isArray(entries) || !entries.length) throw new Error('Add recognition targets to config.js.');
    if (typeof config.targetFile !== 'string' || !config.targetFile.trim()) throw new Error('Set targetFile in config.js.');
    const usedIndices = new Set();
    const parsedTargets = entries.map(entry => {
      if (!entry || !Number.isInteger(entry.targetIndex) || entry.targetIndex < 0 || usedIndices.has(entry.targetIndex)) {
        throw new Error('Every recognition target needs a unique, non-negative integer targetIndex in config.js.');
      }
      usedIndices.add(entry.targetIndex);
      if (typeof entry.label !== 'string' || !entry.label.trim() || typeof entry.targetImage !== 'string' || !entry.targetImage.trim()) {
        throw new Error(`Set label and targetImage for target ${entry.targetIndex} in config.js.`);
      }
      const layout = {};
      const defaults = {overlayWidth: 0.90, gap: 0.08, stackGap: 0.07, verticalOffset: 0};
      for (const [key, fallback] of Object.entries(defaults)) layout[key] = Number(entry[key] ?? config[key] ?? fallback);
      const targetPages = window.posterPages(entry.overlays, Number(entry.imagesPerPage ?? config.imagesPerPage ?? 2));
      window.posterLayout([{width: 1, height: 1}], layout);
      return {...entry, layout, pages: targetPages, savedPage: 0, anchor: null};
    });
    targets = parsedTargets;

    // Text overrides are opt-in; otherwise retain the user's edited HTML titles.
    if (typeof config.pageTitle === 'string') document.title = config.pageTitle;
    if (typeof config.heading === 'string') $('heading').textContent = config.heading;
    // Update only unedited wording from the original single-graph starter.
    const replacements = [
      ['.intro', 'Point your phone at the PCE graph in the poster. Additional plots will appear on its right.', 'Point your phone at a recognition image on the poster. Its additional figures will appear on the right.'],
      ['.hint', 'Turn your phone sideways and keep the whole PCE graph in view, with space on its right.', 'Turn your phone sideways and keep the whole recognition image in view, with space on its right.'],
      ['.ar-bottom p', 'Keep the PCE graph in view. The extra plots appear on its right.', 'Keep the recognition image in view. Point at another one to change the figures.'],
    ];
    replacements.forEach(([selector, previous, next]) => {
      const element = document.querySelector(selector);
      if (element?.textContent.trim() === previous) element.textContent = next;
    });
    const previewSection = document.querySelector('.preview');
    if (previewSection?.getAttribute('aria-label') === 'Preview of the printed PCE graph with additional plots beside it') {
      previewSection.setAttribute('aria-label', 'Preview of a printed recognition image and its additional figures');
    }
    if (targets.length > 1) {
      const picker = document.createElement('div');
      picker.className = 'pager';
      const label = document.createElement('label');
      label.htmlFor = 'preview-target';
      label.textContent = 'Preview section';
      targetSelect = document.createElement('select');
      targetSelect.id = 'preview-target';
      targets.forEach(target => {
        const option = document.createElement('option');
        option.value = String(target.targetIndex);
        option.textContent = target.label;
        targetSelect.appendChild(option);
      });
      targetSelect.addEventListener('change', event => selectTarget(Number(event.target.value)));
      picker.appendChild(label);
      picker.appendChild(targetSelect);
      const before = document.querySelector('.preview-label') || previewSection;
      $('setup').insertBefore(picker, before);
    }
    selectTarget(targets[0].targetIndex);
  } catch (error) {
    targets = [];
    updateControls();
    message(error.message || 'Check config.js, then reload the page.');
  }
})();
