(() => {
  'use strict';
  const config = window.POSTER_AR;
  const $ = id => document.getElementById(id);
  const message = text => { $('message').textContent = text; };
  let pages = [], pageIndex = -1, plots = [], scene = null, anchor = null;
  let graphics = null, loadingPage = false, startingCamera = false, needsReload = false;

  function updateControls() {
    const locked = loadingPage || startingCamera || needsReload;
    for (const prefix of ['preview', 'ar']) {
      $(`${prefix}-pager`).hidden = pages.length <= 1;
      $(`${prefix}-prev`).disabled = locked || pageIndex <= 0;
      $(`${prefix}-next`).disabled = locked || pageIndex >= pages.length - 1;
      $(`${prefix}-page`).disabled = locked;
      $(`${prefix}-page`).value = String(Math.max(0, pageIndex));
    }
    $('start').disabled = !needsReload && (locked || !plots.length);
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
    const THREE = window.AFRAME.THREE;
    graphics = new THREE.Group();
    plots.forEach(plot => {
      // Each page owns its textures, which are released when the page changes.
      const texture = new THREE.Texture(plot.image);
      if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
      else texture.encoding = THREE.sRGBEncoding;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      const backing = new THREE.Mesh(
        new THREE.PlaneGeometry(plot.planeWidth, plot.planeHeight),
        new THREE.MeshBasicMaterial({color: 0xffffff, side: THREE.DoubleSide, toneMapped: false})
      );
      backing.position.set(plot.x, plot.y, 0);
      graphics.add(backing);
      const imagePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(plot.planeWidth, plot.planeHeight),
        new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide, transparent: true, toneMapped: false})
      );
      imagePlane.position.set(plot.x, plot.y, plot.z);
      graphics.add(imagePlane);
    });
    anchor.object3D.add(graphics);
  }

  function renderPreview() {
    $('target-preview').src = config.targetImage;
    $('pair').style.gridTemplateColumns = `1fr ${config.overlayWidth}fr`;
    $('pair').style.columnGap = `${100 * config.gap / (1 + config.gap + config.overlayWidth)}%`;
    const captions = document.querySelector('.preview-captions');
    captions.style.gridTemplateColumns = $('pair').style.gridTemplateColumns;
    captions.style.columnGap = $('pair').style.columnGap;
    const stackHeight = plots.reduce((sum, plot) => sum + plot.planeHeight, 0) + config.stackGap * (plots.length - 1);
    $('plot-stack').style.transform = `translateY(${-100 * config.verticalOffset / stackHeight}%)`;
    $('plot-stack').replaceChildren();
    $('plain-links').replaceChildren();
    const linkLabel = document.createElement('span');
    linkLabel.textContent = 'View without AR:';
    $('plain-links').appendChild(linkLabel);
    plots.forEach((plot, index) => {
      const preview = document.createElement('img');
      preview.src = plot.src;
      preview.alt = `${plot.label}, AR plot ${index + 1} on this page, from top to bottom.`;
      preview.style.marginTop = index ? `${100 * config.stackGap / config.overlayWidth}%` : '0';
      $('plot-stack').appendChild(preview);
      const link = document.createElement('a');
      link.href = plot.src;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = `Open ${plot.label} plot`;
      $('plain-links').appendChild(link);
    });
    const names = plots.map(plot => plot.label).join(' · ');
    document.title = `Poster AR — ${names}`;
    $('plot-names').textContent = names;
    $('heading').textContent = 'Explore the extra plots';
    $('ar-caption').textContent = `AR, top to bottom: ${names}`;
  }

  async function goToPage(index) {
    if (loadingPage || startingCamera || needsReload || index < 0 || index >= pages.length) return;
    loadingPage = true;
    updateControls();
    message('Loading the selected plots…');
    if (scene) $('tracking').textContent = 'Loading the selected plots…';
    try {
      const images = await Promise.all(pages[index].map(async entry => {
        const image = new Image();
        image.src = entry.src;
        await image.decode();
        return {...entry, image, width: image.naturalWidth, height: image.naturalHeight};
      }));
      plots = window.posterLayout(images, config);
      pageIndex = index;
      renderPreview();
      renderARPlots();
      message(`Ready. Page ${index + 1} of ${pages.length}. The selected plots appear to the right of the PCE graph.`);
      if (scene) $('tracking').textContent = `Page ${index + 1} of ${pages.length} · keep the PCE graph in view`;
    } catch (_) {
      const text = 'This page could not load. Check its image entries in config.js and the files in assets/.';
      message(text);
      if (scene) $('tracking').textContent = text;
    } finally {
      loadingPage = false;
      updateControls();
    }
  }

  for (const prefix of ['preview', 'ar']) {
    $(`${prefix}-prev`).addEventListener('click', () => goToPage(pageIndex - 1));
    $(`${prefix}-next`).addEventListener('click', () => goToPage(pageIndex + 1));
    $(`${prefix}-page`).addEventListener('change', event => goToPage(Number(event.target.value)));
  }

  function stopCamera() {
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
    if (scene) {
      scene.pause();
      needsReload = true;
      $('start').textContent = 'Reload and try again';
    }
    startingCamera = false;
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
    if (event.persisted && scene) window.location.reload();
  });

  $('start').addEventListener('click', async () => {
    if (needsReload) { window.location.reload(); return; }
    if (!plots.length || loadingPage || startingCamera || scene) return;
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
      message('This browser cannot run the AR graphics. Use the links below to open the plots.');
      return;
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    startingCamera = true;
    updateControls();
    message('Loading the recognition file…');
    try {
      const response = await fetch(config.targetFile);
      if (!response.ok) throw new Error('The recognition file could not load. Check that assets/target.mind was uploaded.');
      await response.arrayBuffer();
      $('setup').hidden = true;
      $('ar').hidden = false;
      $('tracking').textContent = 'Opening camera…';
      scene = document.createElement('a-scene');
      scene.setAttribute('embedded', '');
      scene.setAttribute('mindar-image', `imageTargetSrc: ${config.targetFile}; autoStart: false; uiLoading: no; uiScanning: no; uiError: no;`);
      scene.setAttribute('renderer', 'colorManagement: true; alpha: true; antialias: true');
      scene.setAttribute('vr-mode-ui', 'enabled: false');
      scene.setAttribute('device-orientation-permission-ui', 'enabled: false');
      const camera = document.createElement('a-camera');
      camera.setAttribute('position', '0 0 0');
      camera.setAttribute('look-controls', 'enabled: false');
      camera.setAttribute('wasd-controls', 'enabled: false');
      scene.appendChild(camera);
      anchor = document.createElement('a-entity');
      anchor.setAttribute('mindar-image-target', 'targetIndex: 0');
      scene.appendChild(anchor);
      anchor.addEventListener('targetFound', () => {
        $('tracking').textContent = 'Graph found · extra plots on the right';
      });
      anchor.addEventListener('targetLost', () => {
        $('tracking').textContent = 'Point at the PCE graph to bring the plots back';
      });
      scene.addEventListener('arReady', () => {
        startingCamera = false;
        updateControls();
        $('tracking').textContent = 'Point at the PCE graph';
      });
      scene.addEventListener('arError', () => {
        fail('The camera could not start. Allow camera access in your browser, then reload and try again.');
      });
      scene.addEventListener('renderstart', () => {
        try {
          renderARPlots();
          scene.systems['mindar-image-system'].start();
        } catch (_) {
          fail('The AR view could not start. Reload to try again, or open the plots using the links below.');
        }
      }, {once: true});
      $('scene-container').appendChild(scene);
    } catch (error) {
      fail(error.message || 'The AR view could not open. Please reload and try again.');
    }
  });

  try {
    pages = window.posterPages(config.overlays, Number(config.imagesPerPage ?? 2));
    for (const prefix of ['preview', 'ar']) {
      pages.forEach((page, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = `${index + 1} / ${pages.length} · ${page.map(entry => entry.label).join(' · ')}`;
        $(`${prefix}-page`).appendChild(option);
      });
    }
    goToPage(0);
  } catch (error) {
    message(error.message || 'Check config.js, then reload the page.');
  }
})();
