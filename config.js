// Positions and sizes are measured in widths of the printed PCE image.
window.POSTER_AR = {
  targetFile: './assets/target.mind',
  targetImage: './assets/03_indoor.png',
  // Add as many images as you need. Previous/Next controls appear automatically.
  // Entries are shown in order, two per page, from top to bottom.
  // To replace a picture, you can simply overwrite its file in assets/.
  overlays: [
    {label: 'Vmpp', src: './assets/vmpp.png'},
    {label: 'Jmpp', src: './assets/jmpp.png'},
  ],
  imagesPerPage: 2,
  overlayWidth: 0.90,
  gap: 0.08,
  stackGap: 0.07,
  verticalOffset: 0,
};
