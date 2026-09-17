# Freeze the AR view to inspect figures

This add-on works with the supplied Poster AR website and its bundled MindAR
1.2.5 / A-Frame libraries. Keep your current working app.js, config.js, target
mapping, compiled targets, images and title edits.

## Install

1. Upload `freeze-view.js` beside `index.html` and `app.js` in your GitHub repository.
2. In `index.html`, add this line immediately AFTER the existing app.js script tag:

   ```html
   <script src="./freeze-view.js?v=freeze-1" defer></script>
   ```

3. Commit, wait for GitHub Pages to finish publishing, then reload your page.
   There is no image recompilation or QR-code change.

## Use

1. Open the AR camera and point at a recognition image.
2. Wait until the figures appear and frame all the content you want to inspect.
3. Tap **Freeze view**. The current camera image and AR figures become one still
   view. Video playback and recognition processing pause. You can lower the phone
   or move away from the marker; the still view remains on the screen.
4. Pinch to zoom and drag to move. The + / − and Fit view buttons also work.
5. Tap **Resume camera** to return to live AR. Aim at a recognition image again
   if you moved the phone. Tap **Close AR** to leave the camera view.

The frozen view captures the currently visible gallery page. To see another page,
resume, use Previous/Next, then freeze again. Zoom enlarges captured pixels; it
does not reveal detail absent from the displayed resolution. Frame the figures
at a readable size before freezing.

This is a still view fixed to the phone screen. It is not world tracking that
keeps a figure attached to a physical point after you lose the marker.

## Optional: freeze automatically after recognition

Inside the top-level `window.POSTER_AR = { ... }` object in your existing config.js,
add these properties, each with its trailing comma:

```javascript
autoFreeze: true,
freezeDelayMs: 1200,
```

The delay starts once the recognized target has loaded visible AR figures.
It is measured in milliseconds (1200 = 1.2 seconds). Increase it if visitors
need more time to frame the figures. Without autoFreeze, freezing is manual.

After Resume camera, automatic freezing waits until the current target is lost
before it can trigger again. This lets visitors point at the next target without
being immediately frozen on the same one. The manual Freeze view button remains
available.

After editing config.js, increase its script query version in index.html, for
example from `config.js?v=multi-target-1` to `config.js?v=freeze-1`.

## Privacy and verification

The still view stays in browser memory. This add-on does not upload it, create
a downloadable file, or add a Save button. It does not prevent screenshots or
retrieval of images that the website already serves. The camera stream remains
open while frozen so Resume works quickly; Close AR stops it through your app.

Syntax and simulated lifecycle checks cover recognition gating, capture order,
pause/resume, zoom/pan, automatic freezing, and keeping the same target mappings.
Real phone rendering, camera alignment and touch gestures still need testing on
your Samsung A34 and any other phones you expect visitors to use.
