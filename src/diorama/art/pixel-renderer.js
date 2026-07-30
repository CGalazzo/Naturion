import { ART_DIRECTION, chooseVirtualResolution } from "./art-direction.js";

export const resizePixelRenderer = ({ renderer, canvas, width, height }) => {
  const resolution = chooseVirtualResolution(width, height);
  renderer.setPixelRatio(ART_DIRECTION.rendering.pixelDensity);
  renderer.setSize(resolution.width, resolution.height, false);
  canvas.style.width = `${Math.max(1, width)}px`;
  canvas.style.height = `${Math.max(1, height)}px`;
  canvas.style.imageRendering = "pixelated";
  return resolution;
};

export const snapCameraTargetToPixelGrid = ({ target, camera, renderHeight }) => {
  if (!renderHeight || renderHeight <= 0) return target.clone();
  const verticalWorldSize = Math.max(0.001, camera.top - camera.bottom);
  const worldPerPixel = verticalWorldSize / renderHeight;
  const step = worldPerPixel * ART_DIRECTION.rendering.cameraSnapFraction;
  if (!Number.isFinite(step) || step <= 0) return target.clone();
  const snapped = target.clone();
  snapped.set(
    Math.round(target.x / step) * step,
    Math.round(target.y / step) * step,
    Math.round(target.z / step) * step
  );
  return snapped;
};
