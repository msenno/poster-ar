// Return a centered vertical stack beside a target whose width is one unit.
window.posterLayout = function(images, config) {
  const width = Number(config.overlayWidth);
  const gap = Number(config.gap);
  const stackGap = Number(config.stackGap);
  const offset = Number(config.verticalOffset);
  if (![width, gap, stackGap, offset].every(Number.isFinite) ||
      width <= 0 || gap < 0 || stackGap < 0 || !images.length) {
    throw new Error('Invalid image layout settings.');
  }
  const heights = images.map(image => {
    if (![image.width, image.height].every(Number.isFinite) ||
        image.width <= 0 || image.height <= 0) {
      throw new Error('Invalid image dimensions.');
    }
    return width * image.height / image.width;
  });
  let top = (heights.reduce((sum, height) => sum + height, 0) +
    stackGap * (images.length - 1)) / 2 + offset;
  return images.map((image, index) => {
    const height = heights[index];
    const result = {...image, planeWidth: width, planeHeight: height,
      x: 0.5 + gap + width / 2, y: top - height / 2, z: 0.002};
    top -= height + stackGap;
    return result;
  });
};

// Divide the image list into pages without loading any image pixels.
window.posterPages = function(images, pageSize) {
  if (!Array.isArray(images) || !images.length ||
      !Number.isInteger(pageSize) || pageSize < 1 ||
      images.some(image => !image || typeof image.label !== 'string' ||
        !image.label.trim() || typeof image.src !== 'string' || !image.src.trim())) {
    throw new Error('Check the image list and imagesPerPage in config.js.');
  }
  const pages = [];
  for (let index = 0; index < images.length; index += pageSize) {
    pages.push(images.slice(index, index + pageSize));
  }
  return pages;
};
