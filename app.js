(() => {
  'use strict';
  const VERSION = 'World tracking 1';
  const config = window.POSTER_AR || {};
  const $ = id => document.getElementById(id);
  const debug = new URLSearchParams(location.search).get('arDebug') === '1';
  let targets = [], active = null, metadata = [], anchors = null, xrScene = null;
  let ready = false, cameraActive = false, starting = false, token = 0, modules = [];
  let worldStatus = 'LIMITED', scanning = false, found = 0, lost = 0, startupTimer;
  const streams = new Set();
  const say = text => { $('message').textContent = text; };

  function updateControls() {
    $('start').disabled = !ready || starting;
    $('target-select').disabled = !targets.length;
    if (active) $('target-select').value = active.name;
    for (const prefix of ['preview', 'ar']) {
      $(`${prefix}-pager`).hidden = !active || active.pages.length <= 1;
      $(`${prefix}-prev`).disabled = !active || active.loading || active.pageIndex <= 0;
      $(`${prefix}-next`).disabled = !active || active.loading || active.pageIndex >= active.pages.length - 1;
      $(`${prefix}-page`).disabled = !active || active.loading;
      if (active) $(`${prefix}-page`).value = String(active.pageIndex);
    }
    $('reset-anchors').disabled = !anchors?.count;
  }

  function updateStatus() {
    if (cameraActive) {
      let text;
      if (starting) text = 'Opening camera… Allow camera and motion access when asked.';
      else if (worldStatus !== 'NORMAL') text = 'Move your phone slowly across the poster to establish tracking.';
      else if (!scanning) text = 'Preparing recognition images…';
      else if (!anchors?.count) text = 'Point at a recognition image on the poster.';
      else if (active?.error) text = `${active.label}: ${active.error}`;
      else if (active?.loading) text = `${active.label} found · loading panel…`;
      else text = `${active?.label || 'Panel'} placed · move closer to explore`;
      $('tracking').textContent = text;
    }
    if (debug) {
      $('ar-debug').textContent = `${VERSION} | World: ${worldStatus} | Images ready: ${scanning} | Placed: ${anchors?.count || 0} | Found: ${found} Lost: ${lost} | ${active?.name || 'none'}`;
    }
    updateControls();
  }

  function disposeGroup(group) {
    if (!group) return;
    group.parent?.remove(group);
    group.traverse(object => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      object.material.map?.dispose();
      object.material.dispose();
    });
  }

  function renderPanel(target) {
    const entry = anchors?.entries.get(target.name);
    if (!entry || !xrScene || !target.plots.length) return;
    const THREE = window.THREE;
    const group = new THREE.Group();
    const limit = Math.min(4096, xrScene.renderer.capabilities.maxTextureSize);
    try {
      for (const plot of target.plots) {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(1, limit / Math.max(plot.width, plot.height));
        canvas.width = Math.max(1, Math.round(plot.width * ratio));
        canvas.height = Math.max(1, Math.round(plot.height * ratio));
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Unable to prepare the panel image.');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(plot.image, 0, 0, canvas.width, canvas.height);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(plot.planeWidth, plot.planeHeight),
          new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide, toneMapped: false})
        );
        mesh.position.set(plot.x, plot.y, plot.z);
        group.add(mesh);
      }
      disposeGroup(target.graphics);
      target.graphics = group;
      entry.group.add(group);
    } catch (error) {
      disposeGroup(group);
      throw error;
    }
  }

  function renderPreview() {
    if (!active) return;
    const layout = active.layout;
    $('target-preview').src = active.targetImage;
    $('target-preview').alt = `${active.label}: printed recognition image`;
    $('pair').style.gridTemplateColumns = `1fr ${layout.overlayWidth}fr`;
    $('pair').style.columnGap = `${100 * layout.gap / (1 + layout.gap + layout.overlayWidth)}%`;
    const captions = document.querySelector('.preview-captions');
    captions.style.gridTemplateColumns = $('pair').style.gridTemplateColumns;
    captions.style.columnGap = $('pair').style.columnGap;
    captions.firstElementChild.textContent = active.label;
    $('plot-stack').replaceChildren();
    $('plain-links').replaceChildren();
    const label = document.createElement('span');
    label.textContent = 'View without AR:';
    $('plain-links').appendChild(label);
    const height = active.plots.reduce((sum, plot) => sum + plot.planeHeight, 0)
      + layout.stackGap * Math.max(0, active.plots.length - 1);
    $('plot-stack').style.transform = height ? `translateY(${-100 * layout.verticalOffset / height}%)` : '';
    active.plots.forEach((plot, index) => {
      const image = document.createElement('img');
      image.src = plot.src;
      image.alt = plot.label;
      image.style.marginTop = index ? `${100 * layout.stackGap / layout.overlayWidth}%` : '0';
      $('plot-stack').appendChild(image);
      const link = document.createElement('a');
      link.href = plot.src;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = `Open ${plot.label}`;
      $('plain-links').appendChild(link);
    });
    $('ar-caption').textContent = active.plots.map(plot => plot.label).join(' · ') || 'AR panel';
    $('plot-names').textContent = active.label;
  }

  async function loadPage(target, index) {
    if (!target || index < 0 || index >= target.pages.length) return;
    const serial = ++target.loadSerial;
    target.loading = true;
    target.error = '';
    updateStatus();
    try {
      const images = await Promise.all(target.pages[index].map(async entry => {
        const image = new Image();
        image.src = entry.src;
        try { await image.decode(); }
        catch (_) { throw new Error(`Cannot load ${entry.src}. Check its filename and upload it to assets/.`); }
        return {...entry, image, width: image.naturalWidth, height: image.naturalHeight};
      }));
      // Each target owns its request and meshes. Slow loads cannot cross targets.
      if (serial !== target.loadSerial) return;
      target.plots = window.posterLayout(images, target.layout);
      target.pageIndex = index;
      renderPanel(target);
      if (target === active) {
        renderPreview();
        say(`${target.label}: ${target.plots.map(plot => plot.label).join(' · ')}. Scan the printed image to place the panel beside it.`);
      }
    } catch (error) {
      if (serial !== target.loadSerial) return;
      target.error = error.message || 'Panel could not load.';
      if (target === active) say(target.error);
    } finally {
      if (serial === target.loadSerial) {
        target.loading = false;
        updateStatus();
      }
    }
  }

  function selectTarget(name) {
    const target = targets.find(item => item.name === name);
    if (!target || target === active) return;
    active = target;
    for (const prefix of ['preview', 'ar']) {
      const select = $(`${prefix}-page`);
      select.replaceChildren();
      target.pages.forEach((page, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = `${index + 1} / ${target.pages.length} · ${page.map(plot => plot.label).join(' · ')}`;
        select.appendChild(option);
      });
    }
    renderPreview();
    updateStatus();
    if (!target.plots.length && !target.loading) void loadPage(target, target.pageIndex);
    else say(`${target.label}: ${target.plots.map(plot => plot.label).join(' · ')}.`);
  }

  function onImage(detail, isFound) {
    if (!cameraActive || !anchors) return;
    if (isFound) found++;
    const entry = anchors.entries.get(detail?.name);
    const first = entry && !entry.anchored;
    if (anchors.update(detail)) {
      if (first || isFound) selectTarget(detail.name);
      const target = targets.find(item => item.name === detail.name);
      if (target && !target.graphics && target.plots.length) renderPanel(target);
    }
    if (isFound || first) updateStatus();
  }

  function resizeCanvas() {
    const canvas = $('camerafeed');
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }

  function stopCamera() {
    cameraActive = false;
    starting = false;
    ++token;
    clearTimeout(startupTimer);
    try { window.XR8?.stop(); } catch (_) {}
    for (const stream of streams) stream.getTracks().forEach(track => track.stop());
    streams.clear();
    targets.forEach(target => { disposeGroup(target.graphics); target.graphics = null; });
    if (anchors) for (const {group} of anchors.entries.values()) group.parent?.remove(group);
    anchors = null;
    xrScene = null;
    try { window.XR8?.removeCameraPipelineModules(modules); } catch (_) {}
    modules = [];
    $('ar').hidden = true;
    $('setup').hidden = false;
    document.body.classList.remove('camera-open');
    updateControls();
  }

  function failCamera(error) {
    if (!cameraActive) return;
    console.error('Poster AR camera error:', error);
    stopCamera();
    let detail = typeof error === 'string' ? error : error?.message || error?.error?.message;
    if (error?.type === 'permission' && error?.status === 'denied') {
      const motion = /motion|orientation/.test(error.permission || '');
      detail = motion
        ? 'Motion access is unavailable. Open this page on your phone, allow motion sensors for this site in the browser settings, then reload and retry.'
        : 'A required permission was denied. Allow camera and motion access for this site, then reload and retry.';
    }
    say(`AR could not start or continue. ${detail || 'Open the site in Chrome on Android or Safari on iPhone, allow camera and motion access, and try again.'}`);
    if (debug) {
      let diagnostic;
      try { diagnostic = JSON.stringify(error, Object.getOwnPropertyNames(error || {})); }
      catch (_) { diagnostic = String(error); }
      $('debug-version').textContent = `${VERSION} · camera error: ${diagnostic || 'Unknown error'}`;
    }
    $('start').focus();
  }

  function startCamera() {
    if (!ready || cameraActive) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      say('Open the HTTPS GitHub Pages address in your phone browser to use the camera.');
      return;
    }
    const XR8 = window.XR8;
    const current = ++token;
    cameraActive = true;
    starting = true;
    scanning = false;
    worldStatus = 'LIMITED';
    found = lost = 0;
    $('setup').hidden = true;
    $('ar').hidden = false;
    document.body.classList.add('camera-open');
    resizeCanvas();
    updateStatus();
    const live = () => cameraActive && current === token;
    try {
      XR8.XrController.configure({
        disableWorldTracking: false,
        scale: 'responsive',
        imageTargetData: metadata,
      });
      XR8.Threejs.configure({renderCameraTexture: false});
      modules = [
        XR8.XrController.pipelineModule(),
        XR8.GlTextureRenderer.pipelineModule(),
        XR8.Threejs.pipelineModule(),
        {
          name: 'poster-world-panels',
          onStart: () => {
            if (!live()) return;
            clearTimeout(startupTimer);
            xrScene = XR8.Threejs.xrScene();
            xrScene.camera.position.set(0, 2, 0);
            XR8.XrController.updateCameraProjectionMatrix({
              origin: xrScene.camera.position, facing: xrScene.camera.quaternion,
            });
            anchors = new window.PosterWorldAnchors(window.THREE, xrScene.scene, targets);
            anchors.setTracking(worldStatus);
            starting = false;
            updateStatus();
          },
          onUpdate: ({processCpuResult}) => {
            if (!live()) return;
            const status = processCpuResult?.reality?.trackingStatus;
            if (status && status !== worldStatus) {
              worldStatus = status;
              anchors?.setTracking(status);
              updateStatus();
            }
          },
          onCameraStatusChange: ({status, stream}) => {
            if (stream) {
              if (live()) streams.add(stream);
              else stream.getTracks().forEach(track => track.stop());
            }
            if (live() && status === 'failed') failCamera(new Error('Camera permission was denied or the camera is unavailable. Enable camera and motion access, then retry.'));
          },
          onException: error => { if (live()) failCamera(error); },
          listeners: [
            {event: 'reality.trackingstatus', process: ({detail}) => {
              if (!live()) return;
              worldStatus = detail.status;
              anchors?.setTracking(worldStatus);
              updateStatus();
            }},
            {event: 'reality.imagescanning', process: () => { if (live()) { scanning = true; updateStatus(); } }},
            {event: 'reality.imagefound', process: ({detail}) => { if (live()) onImage(detail, true); }},
            {event: 'reality.imageupdated', process: ({detail}) => { if (live()) onImage(detail, false); }},
            {event: 'reality.imagelost', process: ({detail}) => {
              if (!live()) return;
              lost++;
              anchors?.imageLost(detail.name);
              updateStatus();
            }},
          ],
        },
      ];
      XR8.addCameraPipelineModules(modules);
      startupTimer = setTimeout(() => {
        if (live() && starting) failCamera(new Error('Camera startup timed out. Reload the page and allow camera and motion access.'));
      }, 45000);
      // MOBILE is intentional: ANY permits desktop image tracking without SLAM.
      // Run directly from the click, with resources prepared, for motion permissions.
      Promise.resolve(XR8.run({
        canvas: $('camerafeed'),
        allowedDevices: XR8.XrConfig.device().MOBILE,
        cameraConfig: {direction: XR8.XrConfig.camera().BACK},
        glContextConfig: {alpha: false, antialias: true},
      })).catch(error => { if (live()) failCamera(error); });
    } catch (error) { failCamera(error); }
  }

  function loadEngine() {
    return new Promise((resolve, reject) => {
      const finish = async () => {
        cleanup();
        try { await window.XR8.loadChunk('slam'); resolve(); }
        catch (error) { reject(error); }
      };
      const failed = () => { cleanup(); reject(new Error('The AR engine could not load. Upload the entire vendor/xr folder, then reload.')); };
      const timer = setTimeout(failed, 60000);
      const cleanup = () => { clearTimeout(timer); window.removeEventListener('xrloaded', finish); script.removeEventListener('error', failed); };
      const script = document.createElement('script');
      script.src = './vendor/xr/xr.js';
      script.async = true;
      script.dataset.preloadChunks = 'slam';
      script.addEventListener('error', failed, {once: true});
      window.addEventListener('xrloaded', finish, {once: true});
      document.head.appendChild(script);
    });
  }

  async function init() {
    try {
      if (typeof config.pageTitle === 'string') document.title = config.pageTitle;
      if (typeof config.heading === 'string') $('heading').textContent = config.heading;
      if (!Array.isArray(config.targets) || !config.targets.length) throw new Error('Add targets in config.js.');
      const names = new Set();
      targets = config.targets.map(item => {
        if (!item.name || names.has(item.name) || !item.label || !item.targetImage || !item.targetData) {
          throw new Error('Each target needs a unique name, label, targetImage and targetData in config.js.');
        }
        names.add(item.name);
        const layout = {
          overlayWidth: item.overlayWidth ?? config.overlayWidth ?? 0.9,
          gap: item.gap ?? config.gap ?? 0.08,
          stackGap: item.stackGap ?? config.stackGap ?? 0.07,
          verticalOffset: item.verticalOffset ?? config.verticalOffset ?? 0,
        };
        const pages = window.posterPages(item.overlays, item.imagesPerPage ?? config.imagesPerPage ?? 1);
        return {...item, layout, pages, pageIndex: 0, plots: [], graphics: null, loading: false, loadSerial: 0, error: ''};
      });
      targets.forEach(target => {
        const option = document.createElement('option');
        option.value = target.name;
        option.textContent = target.label;
        $('target-select').appendChild(option);
      });
      selectTarget(targets[0].name);
      const dataPromise = Promise.all(targets.map(async target => {
        const response = await fetch(target.targetData);
        if (!response.ok) throw new Error(`Cannot load ${target.targetData}. Upload the image-targets folder.`);
        const data = await response.json();
        if (data.name !== target.name || data.type !== 'PLANAR' || !data.imagePath || !data.properties) {
          throw new Error(`Recognition data does not match ${target.name}. Check targetData and name in config.js.`);
        }
        const p = data.properties;
        if (![p.width, p.height, p.originalWidth, p.originalHeight].every(value => Number.isFinite(value) && value > 0)
            || ![p.left, p.top].every(value => Number.isFinite(value) && value >= 0)
            || p.left + p.width > p.originalWidth || p.top + p.height > p.originalHeight) {
          throw new Error(`Invalid recognition crop for ${target.name}. Regenerate its targetData.`);
        }
        target.recognitionProperties = p;
        // Official CLI imagePath is relative to the WEBSITE root, not this JSON.
        // Resolve to an absolute URL so GitHub repository subpaths work correctly.
        data.imagePath = new URL(data.imagePath, document.baseURI).href;
        return data;
      }));
      [metadata] = await Promise.all([dataPromise, loadEngine()]);
      ready = true;
      updateControls();
      if (debug) $('debug-version').textContent = `${VERSION} loaded · image recognition + world tracking`;
    } catch (error) { say(error.message || 'The AR setup could not load. Reload and try again.'); }
  }

  $('target-select').addEventListener('change', event => selectTarget(event.target.value));
  for (const prefix of ['preview', 'ar']) {
    $(`${prefix}-prev`).addEventListener('click', () => void loadPage(active, active.pageIndex - 1));
    $(`${prefix}-next`).addEventListener('click', () => void loadPage(active, active.pageIndex + 1));
    $(`${prefix}-page`).addEventListener('change', event => void loadPage(active, Number(event.target.value)));
  }
  $('start').addEventListener('click', startCamera);
  $('stop').addEventListener('click', () => { stopCamera(); say('Camera closed. Scan the poster again to place panels in a new session.'); $('start').focus(); });
  $('reset-anchors').addEventListener('click', () => { anchors?.clear(); updateStatus(); });
  window.addEventListener('resize', () => { if (cameraActive) resizeCanvas(); });
  window.addEventListener('pagehide', () => { if (cameraActive) stopCamera(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && cameraActive) { stopCamera(); say('Camera closed while the page was in the background. Open AR to scan again.'); }
  });
  $('ar-debug').hidden = !debug;
  $('debug-version').hidden = !debug;
  void init();
})();
