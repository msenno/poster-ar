# Validation — world tracking update 1

Completed in the development environment:

- All five target names and JSON references match the five one-panel mappings.
- All 14 uploaded asset files, including the five recognition PNGs and five
  panels, retain their original bytes. Panel4 and Panel5 are identical in the
  user's original upload and remain identical here.
- JavaScript syntax and all local HTML dependencies were checked.
- The bundled 8th Wall engine files match the original 1.0.0 npm distribution.
- The real engine and its SLAM chunk loaded in Chromium. The custom title and
  all five previews were checked at a mobile viewport, and desktop/mobile
  preview screenshots were visually inspected.
- Tests using real Three.js transformations verified that a panel's world
  transform stays fixed after image loss while its projected view changes as
  the camera moves. Tests covered world tracking loss/recovery, reacquisition,
  reset, unknown targets, invalid poses, multiple anchors, and portrait/landscape
  crop compensation including off-center crops.
- Browser integration with simulated engine events verified the indoor label and
  Panel4 mapping, delayed image loads across different targets, explicit SLAM
  enablement, the mobile rear-camera configuration, GitHub-style subdirectory
  paths, texture limits, image-loss persistence, world tracking loss/recovery,
  reset, and closing/reopening the AR view.
- Denied motion access produces a readable error with instructions to enable
  the permission, rather than an object dumped into the page text.

Limit of these checks:

The real engine's camera startup in headless Chromium was stopped by denied
`deviceorientation` permission. Thus the real camera rendering pipeline,
recognition accuracy, pose alignment, physical movement tracking and drift have
NOT been validated on a phone. The event simulations verify application behavior;
they do not measure the tracking engine's real-world performance. Test the
complete deployed package on the Samsung A34 and actual printed poster using
README.md before relying on it at the meeting.
