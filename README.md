# Poster AR — world tracking update 1

This version places the additional panel in the camera's tracked 3D scene beside
the printed recognition image. After recognition, the image may leave the camera
view and visitors can move closer to inspect the panel with live perspective.

The site now uses the free, self-hosted 8th Wall distributed engine with SLAM and
Three.js. It replaces MindAR and the screenshot-freeze add-on. This is a tracking
engine change, so upload the complete package. No account, subscription, API key,
server build step or new QR code is needed for this supplied version.

## Publish on your existing GitHub Pages site

1. Keep a copy of your currently working site as a backup.
2. Extract the ZIP. Open its `poster-ar-main` folder.
3. In your existing `msenno/poster-ar` repository, upload the CONTENTS of that
   folder. `index.html` must remain at the repository root, not in another
   `poster-ar-main` subfolder. Upload the new `image-targets` folder and all of
   `vendor/xr`, including its resources and license, as well as the updated JS,
   HTML and CSS. The images in `assets` are included unchanged.
4. Commit and wait for GitHub Pages publishing to complete.
5. On your phone, open https://msenno.github.io/poster-ar/?arDebug=1 in a fresh tab
   (a private tab is useful to rule out an older cached page). Confirm it says
   **World tracking 1 loaded** before starting the camera.

The old `freeze-view.js`, MindAR scripts and `.mind` file are not loaded by this
version. Any old copies still on GitHub do not need to be deleted for it to work.
Do not add the freeze-view.js script tag back to index.html.

## Use and test on the actual poster

Use Chrome on Android or Safari on iPhone with HTTPS. Open the link in the phone's
browser rather than inside a social app. Allow camera and motion access if asked.
The AR mode requires a supported mobile browser; desktop can show the previews.

1. Tap **Open AR camera**. Move the phone slowly across some poster detail while
   the tracker establishes its position. Avoid pointing only at a blank wall.
2. Hold a complete recognition image in view until its panel appears at the right.
3. Move sideways toward the panel so that the recognition image leaves the view.
   The live video should continue, and the panel should retain its place beside
   the poster while its perspective changes with your movement.
4. Move closer to read the panel, then back. Check its apparent size and alignment.
5. Repeat for all five targets, especially Indoor and Outdoor. More than one
   scanned panel may remain placed in the same camera session.
6. Rescan a recognition image if its panel drifts. **Reset placement** clears all
   placed panels without restarting the camera, so you can scan them again.
7. Close AR and reopen it to verify camera access and a fresh placement session.

Image recognition loss alone does not hide a panel. Loss of WORLD tracking does:
if the phone cannot estimate its position, the app temporarily hides panels and
asks you to move slowly. They can return when tracking recovers. Persistent drift,
blur, darkness or a featureless view can still require rescanning. This is session
tracking, not a permanent saved anchor: closing AR, reloading or putting the page
in the background ends the camera session and requires a new scan.

The diagnostics distinguish **World: NORMAL / LIMITED**, placed panels and image
Found/Lost counts. A Lost count increasing while World stays NORMAL is expected
when you move away from a recognition image; the panel should stay in the scene.

## Exact mappings preserved from your upload

| Recognition image / target name | Displayed panel |
| --- | --- |
| `00_stack.png` / `00_stack` | `Panel1.png` |
| `01_encap.png` / `01_encap` | `Panel2.png` |
| `02_jv.png` / `02_jv` | `Panel3.png` |
| `03_indoor.png` / `03_indoor` | `Panel4.png` |
| `04_outdoor.png` / `04_outdoor` | `Panel5.png` |

`Panel4.png` and `Panel5.png` in the supplied upload are byte-for-byte identical.
They have been preserved. Replace Panel5.png if Outdoor should show different data.

Recognition now uses each target's explicit `name`, which must match its JSON.
There is no numeric targetIndex and no dependence on compilation or array order.
The five recognition files are already prepared in `image-targets/`.
The small 380 × 357 encapsulation source was resized only for target processing;
its printed source image and the displayed panel remain unchanged. Recognition
quality of all five targets still depends on detail, lighting and the phone.

## Change titles and panels

Edit `<title>` and `<h1 id="heading">` in `index.html`. The optional `pageTitle`
and `heading` settings in config.js override those only if explicitly enabled.
Your ISOS17 / MOED title and heading are preserved in this package.

To replace a displayed panel, replace the matching file in `assets` or edit its
`overlays[].src` in config.js. Keep letter case and extension exact. No target
processing is needed when only a displayed panel changes.

Each target currently has one overlay and `imagesPerPage: 1`. More entries in its
`overlays` list create more pages with Previous/Next controls. To alter size or
position, edit `overlayWidth`, `gap` or `verticalOffset`, globally or in an
individual target. Units are widths of the complete printed recognition image.

For a changed recognition image, use the 8th Wall Image Target CLI or desktop app,
not the MindAR compiler:

```sh
npx @8thwall/image-target-cli@1.0.0
```

Choose the input recognition PNG, **flat**, the default crop, your site's
`image-targets` output folder, and the exact target name (for example `03_indoor`).
For very small sources, first export a larger copy from the original artwork;
the CLI requires at least a 480 × 640 crop. Generated crops may look rotated:
leave the metadata and generated images together as produced by the tool.

Upload the resulting files, and set `name`, `targetData` and `targetImage` in
config.js. `targetData` points at the generated JSON; `targetImage` is the original
recognition image used for the preview. The script checks that JSON names match.
Keep the CLI's `imagePath` relative to the website root (`image-targets/...`).

After future edits, increment the corresponding `?v=world-1` script/style query
in index.html, for example `?v=world-2`, to prompt a fresh browser download. A new
filename is useful when replacing an image that a phone keeps caching.

## Verification and limits

The package was checked for target names, image paths, original-image preservation,
JavaScript syntax and world-anchor behavior under simulated image loss, phone
movement, world-tracking loss/recovery, reacquisition and reset. Browser checks
are described in VALIDATION.md. These checks cannot validate real camera alignment,
recognition reliability or SLAM drift. Test on the actual phone and printed poster
before using this as the meeting version.

Your existing full-size preview links are preserved. This change does not prevent
screenshots or downloading public image assets.

## Components and official documentation

- 8th Wall distributed engine binary 1.0.0, copied unchanged under `vendor/xr/`.
  Copyright © 2026 Niantic Spatial, Inc. All rights reserved. Licensed under the
  [XR Engine License Agreement](vendor/xr/LICENSE.txt), including its warranty
  disclaimer. This binary has a restricted-use license; it is not the MIT-only
  engine release, which lacks SLAM. Preserve the included notices and license.
- Three.js 0.160.1, [MIT license](vendor/Three-LICENSE.txt).
- Target files generated with `@8thwall/image-target-cli` 1.0.0.

Official references: [engine setup](https://8thwall.org/docs/engine/overview),
[image targets](https://8thwall.org/docs/engine/guides/image-targets),
[image and tracking events](https://8thwall.org/docs/api/engine/xrcontroller/pipelinemodule),
[mobile AR run settings](https://8thwall.org/docs/api/engine/xr8/run).
