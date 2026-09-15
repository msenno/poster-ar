// POSTER AR: five printed recognition images, each with its own AR gallery.
// Compile ALL five recognition images together, in the order below.
// The targetIndex comes from the compiled order, not from the PNG filename.
window.POSTER_AR = {
  targetFile: './assets/target.mind',

  // Optional text overrides. Leave these commented to keep your index.html text.
  // pageTitle: 'Your browser tab title',
  // heading: 'Your visible page heading',

  // Show two figures at a time. A third figure creates a second gallery page.
  // Change this to 3 to show up to three figures together, stacked vertically.
  imagesPerPage: 2,

  // Sizes are measured in widths of the printed recognition image.
  overlayWidth: 0.90,
  gap: 0.08,
  stackGap: 0.07,
  verticalOffset: 0,

  // Tracking defaults from the smoother version. If you tuned these yourself,
  // copy your current values here.
  missTolerance: 15,
  warmupTolerance: 8,
  filterMinCF: 0.001,
  filterBeta: 0.01,

  // targetImage = the printed image used for recognition (shown in the preview).
  // overlays = the additional figures displayed beside that printed image.
  // All overlay filenames below are EXAMPLES: use the names of your real files.
  // PNG is assumed here. Use .jpg, .jpeg, etc. if that is your actual extension.
  targets: [
    {
      targetIndex: 0,
      label: 'Device stack',
      targetImage: './assets/00_stack.png',
      overlays: [
        {label: 'Stack - figure 1', src: './assets/stack_01.png'},
        {label: 'Stack - figure 2', src: './assets/stack_02.png'},
        // {label: 'Stack - figure 3', src: './assets/stack_03.png'},
      ],
    },
    {
      targetIndex: 1,
      label: 'Encapsulation',
      targetImage: './assets/01_encap.png',
      overlays: [
        {label: 'Encapsulation - figure 1', src: './assets/encap_01.png'},
        {label: 'Encapsulation - figure 2', src: './assets/encap_02.png'},
        // {label: 'Encapsulation - figure 3', src: './assets/encap_03.png'},
      ],
    },
    {
      targetIndex: 2,
      label: 'JV curves',
      targetImage: './assets/02_jv.png',
      overlays: [
        {label: 'JV - figure 1', src: './assets/jv_01.png'},
        {label: 'JV - figure 2', src: './assets/jv_02.png'},
        // {label: 'JV - figure 3', src: './assets/jv_03.png'},
      ],
    },
    {
      targetIndex: 3,
      label: 'Indoor stability',
      targetImage: './assets/03_indoor.png',
      overlays: [
        {label: 'Indoor - figure 1', src: './assets/jmpp.png'},
        {label: 'Indoor - figure 2', src: './assets/vmpp.png'},
        // {label: 'Indoor - figure 3', src: './assets/indoor_03.png'},
      ],
    },
    {
      targetIndex: 4,
      label: 'Outdoor stability',
      targetImage: './assets/04_outdoor.png',
      overlays: [
        {label: 'Outdoor - figure 1', src: './assets/outdoor_01.png'},
        {label: 'Outdoor - figure 2', src: './assets/outdoor_02.png'},
        // {label: 'Outdoor - figure 3', src: './assets/outdoor_03.png'},
      ],
    },
  ],
};
