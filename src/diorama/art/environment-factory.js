import { createGroundShadow, createPixelShadowTexture, createVoxelBlock } from "./voxel-world-kit.js";

export const VOXEL_UNIT = 1;
export { createGroundShadow, createPixelShadowTexture };

export const addTexturedBox = (parent, options) => createVoxelBlock({
  parent,
  x: options.x || 0,
  y: options.y || 0,
  z: options.z || 0,
  width: options.width || 1,
  height: options.height || 1,
  depth: options.depth || 1,
  material: options.material,
  castShadow: Boolean(options.castShadow),
  receiveShadow: options.receiveShadow !== false,
  rotationY: options.rotationY || 0
});

export const addTexturedCylinder = (parent, options) => {
  const width = Math.max(options.radiusTop || 1, options.radiusBottom || options.radiusTop || 1) * 2;
  return createVoxelBlock({
    parent,
    x: options.x || 0,
    y: options.y || 0,
    z: options.z || 0,
    width,
    height: options.height || 1,
    depth: width,
    material: options.material,
    castShadow: Boolean(options.castShadow),
    receiveShadow: options.receiveShadow !== false,
    rotationX: options.rotation?.x || 0,
    rotationY: options.rotation?.y || 0,
    rotationZ: options.rotation?.z || 0
  });
};
