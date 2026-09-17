// POSTER AR — one panel per recognition image, with world tracking.
// The name must match the name inside targetData. File order is irrelevant.
window.POSTER_AR = {
  // Optional overrides; otherwise edit the title and heading in index.html.
  // pageTitle: 'Your browser tab title',
  // heading: 'Your visible page heading',

  imagesPerPage: 1,

  // Sizes are measured in widths of the complete printed recognition image.
  overlayWidth: 4,
  gap: 0.0,
  stackGap: 0.07,
  verticalOffset: 0.0,

  // To change a displayed panel, replace its PNG or change overlays[].src.
  // Changing a recognition image requires matching 8th Wall targetData.
  targets: [
    {
      name: '00_stack',
      targetData: './image-targets/00_stack.json',
      label: 'Device stack',
      targetImage: './assets/00_stack.png',
      overlays: [
        {label: 'Stack - figure 1', src: './assets/Panel1.png'},
      ],
    },
    {
      name: '01_encap',
      targetData: './image-targets/01_encap.json',
      label: 'Encapsulation',
      targetImage: './assets/01_encap.png',
      overlays: [
        {label: 'Encapsulation - figure 1', src: './assets/Panel2.png'},
      ],
    },
    {
      name: '02_jv',
      targetData: './image-targets/02_jv.json',
      label: 'JV curves',
      targetImage: './assets/02_jv.png',
      overlays: [
        {label: 'JV - figure 1', src: './assets/Panel3.png'},
      ],
    },
    {
      name: '03_indoor',
      targetData: './image-targets/03_indoor.json',
      label: 'Indoor stability',
      targetImage: './assets/03_indoor.png',
      overlays: [
        {label: 'Indoor - figure 1', src: './assets/Panel4.png'},
      ],
    },
    {
      name: '04_outdoor',
      targetData: './image-targets/04_outdoor.json',
      label: 'Outdoor stability',
      targetImage: './assets/04_outdoor.png',
      overlays: [
        {label: 'Outdoor - figure 1', src: './assets/Panel5.png'},
      ],
    },
  ],
};
