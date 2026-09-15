# Poster AR: Vmpp and Jmpp beside the PCE graph

The PCE graph is the single recognition image. When a phone recognizes it, Vmpp appears above Jmpp, with both plots stacked to its right. The included page contains those two plots. Add more pictures in `config.js`; Previous/Next buttons and a page selector appear automatically, with two images shown per page by default. The supplied scientific images are included unchanged. Their proportions are preserved, and white backing planes keep their backgrounds readable over the poster.

The package uses bundled MindAR 1.2.5 and A-Frame 1.5.0. It is a static website with no paid AR service or subscription. Visitors open a website and allow camera access; they do not need to install an AR app. They can also open each full-size plot without AR.

## 1. Compilation: already done

You do not need to install Node.js, run a build command, or compile anything for this version. The recognition file, `assets/target.mind`, is included and was compiled from `assets/recognition.png`.

| File | Purpose |
| --- | --- |
| `index.html` | Website entry page |
| `assets/recognition.png` | Exact PCE figure to print in the poster |
| `assets/target.mind` | Already compiled recognition data for that one figure |
| `assets/vmpp.png` | Vmpp picture, shown above Jmpp in AR |
| `assets/jmpp.png` | Jmpp picture, shown below Vmpp in AR |
| `config.js` | Image paths, sizes, and spacing |
| `layout.js`, `app.js`, `style.css` | Layout, camera behavior, and page appearance |
| `vendor/` | Bundled AR libraries and their license notices |

Only the PCE recognition image needs compilation. Vmpp and Jmpp are display content, so they do not need to be compiled as targets. Replacing either display image also does not require recompiling the PCE target.

Keep the exact contents, crop, and proportions of `recognition.png` in the poster. Resizing it proportionally for print is fine. If you change the crop, labels, or contents, use the [official MindAR image target compiler](https://hiukim.github.io/mind-ar-js-doc/tools/compile/): upload only the revised recognition image, start compilation, download the result, and replace `assets/target.mind` with it. Also replace `assets/recognition.png` with the revised image. Keep the filename `target.mind` or update `targetFile` in `config.js`.

## 2. Recommended free host: GitHub Pages

Use a free GitHub account and a public repository. Your published site and its plot images will be public. GitHub provides the website address, so a purchased domain is unnecessary. [GitHub Pages availability and setup](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

1. Download and extract `Poster_AR_Starter.zip` on your computer. Open the extracted folder containing `index.html`.
2. Sign in to GitHub and create a **public** repository named `poster-ar`. Enable **Add README** so the initial branch exists, then create the repository.
3. On the repository's **Code** tab, choose **Add file → Upload files**. Drag in all the extracted files and the complete `assets` and `vendor` folders. Preserve those folders and their contents. Commit the upload to `main`.
4. Check that **index.html is at the repository's top level**, alongside `config.js`, `app.js`, `layout.js`, `style.css`, `README.md`, `assets`, and `vendor`. Upload the extracted contents, not the ZIP or a containing `Poster_AR_Starter` folder. [GitHub file upload instructions](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository).
5. Open **Settings → Pages**. Under **Build and deployment**, select **Deploy from a branch**, choose branch **main** and folder **/(root)**, then **Save**. No custom build command is needed. [GitHub publishing settings](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
6. Wait for publishing to finish; GitHub says changes can take up to 10 minutes. In **Settings → Pages**, use **Visit site** to copy your actual published address. With the example repository name, its address follows the pattern `https://YOUR-USERNAME.github.io/poster-ar/`. This is a template, not an already published site. [Publication timing and Visit site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).
7. Use the **HTTPS** address. GitHub's default `github.io` addresses support HTTPS; the browser needs a secure context for camera access. [GitHub HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https), [camera access requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

If you already uploaded the earlier starter, replace its files with this version, including both new PNGs and `layout.js`. Keep the existing repository and Pages settings. The published address stays the same.

## 3. Alternative: Cloudflare Pages drag and drop

Cloudflare Pages also has a free plan. The dashboard accepts a ZIP or a folder of static website files, so you can publish without a Git repository. This package is already prepared for upload; there is no build step to run. [Cloudflare Pages limits and free plan](https://developers.cloudflare.com/pages/platform/limits/), [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

1. Sign in to a Cloudflare account and open **Workers & Pages**.
2. Select **Create application → Get started → Drag and drop your files** for a Pages project.
3. Name the project, then upload `Poster_AR_Starter.zip`. The ZIP contains `index.html` at its root. You can instead select the extracted folder containing `index.html`.
4. Select **Deploy site**, completing **Save and Deploy** if shown, and open the provided HTTPS `pages.dev` address.
5. To update later, choose **Create a new deployment** in the same project and upload the updated package.

Choose either host; you only need one.

## 4. Test on your phone

First confirm that the published page shows the PCE preview and both extra plots, and that both full-size image links work.

1. Display `assets/recognition.png` on a computer screen for a first trial, or print it. For an initial print test, try a width of about 15–25 cm. Then test again at the size used in your actual poster.
2. On a separate phone, open the **published HTTPS site** directly in Safari on iPhone or Chrome on Android. Avoid opening it inside a social-media app's embedded browser. The GitHub repository page and a downloaded HTML file are not the hosted AR page.
3. Tap **Open AR camera** and allow camera access. Turn the phone to landscape orientation.
4. Point at the complete PCE graph, including its axes and labels. Leave enough room on the right of the camera view for the two plots. Move slowly and keep the phone steady while recognition starts.
5. Confirm that **Vmpp is above Jmpp**, both beside the PCE graph, and both stay attached to it as you move gently or tilt the phone.
6. Point away: the extra plots should disappear when tracking is lost. Point back: both should reappear.
7. Tap **Close AR**: the page returns to the preview and the camera stops. Reopen AR to check a second session.
8. If you add more images, use Previous/Next and the page selector in AR. Check the images, order, and readability on each page; use the direct image links in the preview to inspect fine details.
9. Repeat with the actual printed poster under the expected lighting, preferably on both an iPhone and an Android phone. Check readability, glare, and the amount of poster space visible on screen.

Camera tracking has **not yet been tested on a real phone**. JavaScript syntax, file references, unchanged source images, target format/dimensions, and image placement have been checked. The preview and navigation logic were checked with lists of 1, 2, and 25 sample entries, including page jumps and a missing-image case. Actual camera rendering and AR page changes still need phone testing. Those checks do not establish tracking reliability or performance on a particular phone.

## 5. Add the QR code after testing

Make a static QR code pointing to your final published website address and put it near the PCE graph. Suggested wording: “Scan to explore Vmpp and Jmpp in AR.” Visitors scan the QR to open the website, then aim the AR camera at the PCE graph. The QR is the website link; the PCE figure is the tracking target.

The two extra plots do not need to be printed. If the poster has other content immediately to the right of the PCE graph, the AR plots will visually cover that content in the phone view. A clear area there makes them easier to read. Internet access is needed to load the website and any images that have not yet been downloaded.

## Add or replace pictures yourself

You can create plots or illustrations using your usual software and export them as PNG or JPEG. You do not need my help to update this website. Only the active page is loaded; images and AR textures from previous pages are released by the application when you switch pages (the browser may still cache downloaded files).

### Replace an existing picture

1. Export the new picture as `vmpp.png` or `jmpp.png`.
2. Replace the corresponding file inside `assets/`.
3. Upload the changed file to the same location on your host. Reload the website after publication finishes.

Keep the same filename for a direct replacement. To change its displayed name, edit its `label` in `config.js`. Different image dimensions are fine: proportions and heights are calculated automatically. The PCE target does not need recompilation.

### Add many new pictures

1. Put each exported picture into `assets/`, with a simple unique filename such as `rs.png`, `rsh.png`, or `ff.png`.
2. Open `config.js` in a plain-text editor, such as Notepad. Add one entry to `overlays` for every new file. Keep quotes and commas as shown below. This example assumes you have also added those three new PNG files:

```javascript
  overlays: [
    {label: 'Vmpp', src: './assets/vmpp.png'},
    {label: 'Jmpp', src: './assets/jmpp.png'},
    {label: 'Rs',   src: './assets/rs.png'},
    {label: 'Rsh',  src: './assets/rsh.png'},
    {label: 'FF',   src: './assets/ff.png'},
  ],
  imagesPerPage: 2,
```

3. Save `config.js` with its `.js` extension. Upload it together with the new image files. There is no build step and no recognition-target compilation for these additions.
4. Reload the website. The example produces three pages: Vmpp/Jmpp, Rs/Rsh, and FF. Use Previous/Next or the page selector in the preview or camera view. The same PCE graph remains the recognition image for every page.

Add further entries the same way. The application has no fixed limit of three pictures; navigation grows with the list. A long list takes more storage, but the application does not load all of its pictures at once. Use reasonably sized exports and test on the intended phones. About 1500–2000 pixels wide is a useful starting point for these plots.

Reorder entries to change browsing order. Remove an entry to remove it from the gallery. Set `imagesPerPage: 1` for one larger-viewing focus at a time, or keep `2` for paired plots; this setting changes the number shown, while `overlayWidth` controls their width.

Adding more displayed pictures is different from adding more printed recognition targets. This package continues to use one printed PCE image. If you want several different printed figures to trigger separate collections, the target compilation and mapping need an additional setup step.

## Layout adjustments

Edit `config.js` and upload the changed file to adjust the display:

| Setting | Current value | Meaning |
| --- | --- | --- |
| `imagesPerPage` | `2` | Number of pictures shown on each page |
| `overlayWidth` | `0.90` | Width of each AR plot divided by printed PCE image width |
| `gap` | `0.08` | Horizontal gap from the PCE image to the plots |
| `stackGap` | `0.07` | Vertical gap between Vmpp and Jmpp |
| `verticalOffset` | `0` | Upward offset of the whole stack; negative values move it down |

All distances use the full printed recognition image width as one unit. Each plot's height follows its original aspect ratio. The stack is centered vertically on the PCE image. If the PCE image is printed 20 cm wide, each AR plot is 18 cm wide and about 9.76 cm high; the horizontal gap is 1.6 cm and the vertical gap is 1.4 cm. The two-plot stack spans about 20.93 cm vertically.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Website shows 404 | Wait for publishing; check the Pages branch/root setting and top-level `index.html`. |
| Missing plots or AR components | Upload the complete `assets` and `vendor` folders and preserve filename case. |
| Camera will not open | Use the hosted HTTPS address, enable camera permission, and try the phone's main browser. |
| Camera starts but never recognizes the graph | Match the exact recognition image, show the complete figure, improve focus/light, and avoid reflections. Test the final print before relying on it. |
| AR plots are outside the phone view | Turn the phone sideways and move back enough to include the target and the space on its right. |
| Poor tracking on the graph | Try a larger, sharper print first. If tracking remains unreliable, the recognition artwork may need more distinct visual features and a newly compiled target. |
| Old pictures still appear after updating | Reload the page; if needed, clear site data or try a fresh browser session. |

## Software notices

MindAR 1.2.5 and A-Frame 1.5.0 are bundled in `vendor/`, with their license notices. The application has no analytics or camera-upload code; image recognition runs in the visitor's browser. Ordinary requests to the hosting provider load the site files.

- [MindAR source and license](https://github.com/hiukim/mind-ar-js)
- [MindAR image-tracking webpage guide](https://hiukim.github.io/mind-ar-js-doc/quick-start/webpage/)
- [A-Frame](https://aframe.io)
