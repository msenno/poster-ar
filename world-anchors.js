// Persistent transforms in the SLAM scene. The camera continues moving after
// imageLost; these groups are never attached to the camera or screen.
(() => {
  'use strict';
  class PosterWorldAnchors {
    constructor(THREE, scene, targets) {
      this.THREE = THREE;
      this.normal = false;
      this.entries = new Map(targets.map(target => {
        const group = new THREE.Group();
        group.name = target.name;
        group.visible = false;
        scene.add(group);
        return [target.name, {group, crop: target.recognitionProperties,
          anchored: false, inView: false, lastUpdate: 0}];
      }));
    }
    update(detail, now = performance.now()) {
      const entry = this.entries.get(detail?.name);
      if (!entry || !this.normal) return false;
      const {position: p, rotation: q, scale, scaledWidth} = detail;
      if (!p || !q || ![p.x, p.y, p.z, q.x, q.y, q.z, q.w, scale, scaledWidth].every(Number.isFinite)
          || scale <= 0 || scaledWidth <= 0) return false;
      const rotation = new this.THREE.Quaternion(q.x, q.y, q.z, q.w);
      if (rotation.lengthSq() < 0.0001) return false;
      rotation.normalize();
      const position = new this.THREE.Vector3(p.x, p.y, p.z);
      const cropWidthWorld = scale * scaledWidth;
      let width = cropWidthWorld;
      // Flat-target events describe the tracked crop, restored to its visual
      // orientation. Extend it to the whole printed image using CLI metadata.
      // This keeps a panel beside the full image even for an off-center crop.
      const c = entry.crop;
      if (c) {
        const originalWidth = c.isRotated ? c.originalHeight : c.originalWidth;
        const originalHeight = c.isRotated ? c.originalWidth : c.originalHeight;
        const cropWidth = c.isRotated ? c.height : c.width;
        const cropHeight = c.isRotated ? c.width : c.height;
        const left = c.isRotated ? c.top : c.left;
        const top = c.isRotated ? c.originalWidth - c.left - c.width : c.top;
        width *= originalWidth / cropWidth;
        const offset = new this.THREE.Vector3(
          originalWidth / 2 - left - cropWidth / 2,
          top + cropHeight / 2 - originalHeight / 2, 0
        ).multiplyScalar(cropWidthWorld / cropWidth).applyQuaternion(rotation);
        position.add(offset);
      }
      const alpha = entry.anchored ? 1 - Math.exp(-Math.max(1, now - entry.lastUpdate) / 80) : 1;
      entry.group.position.lerp(position, alpha);
      entry.group.quaternion.slerp(rotation, alpha);
      entry.group.scale.setScalar(entry.anchored
        ? entry.group.scale.x + (width - entry.group.scale.x) * alpha : width);
      entry.anchored = true;
      entry.inView = true;
      entry.lastUpdate = now;
      entry.group.visible = true;
      return true;
    }
    imageLost(name) {
      const entry = this.entries.get(name);
      if (entry) entry.inView = false;
      // Keep its world transform. Threejs.pipelineModule moves the camera.
    }
    setTracking(status) {
      this.normal = status === 'NORMAL';
      for (const entry of this.entries.values()) {
        entry.group.visible = this.normal && entry.anchored;
      }
    }
    clear() {
      for (const entry of this.entries.values()) {
        entry.anchored = false;
        entry.inView = false;
        entry.lastUpdate = 0;
        entry.group.visible = false;
      }
    }
    get count() {
      return [...this.entries.values()].filter(entry => entry.anchored).length;
    }
  }
  window.PosterWorldAnchors = PosterWorldAnchors;
})();
