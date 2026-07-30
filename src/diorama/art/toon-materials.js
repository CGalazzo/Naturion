import { THREE } from "../engine.js";
import { ART_DIRECTION } from "./art-direction.js";

let gradientMap = null;

export const getToonGradientMap = () => {
  if (gradientMap) return gradientMap;
  const levels = ART_DIRECTION.rendering.colorLevels;
  const data = new Uint8Array(levels * 4);
  const values = levels === 3 ? [72, 158, 238] : [48, 108, 178, 246];
  values.forEach((value, index) => {
    const offset = index * 4;
    data[offset] = value;
    data[offset + 1] = value;
    data[offset + 2] = value;
    data[offset + 3] = 255;
  });
  gradientMap = new THREE.DataTexture(data, levels, 1, THREE.RGBAFormat);
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.generateMipmaps = false;
  gradientMap.needsUpdate = true;
  return gradientMap;
};

export const createToonMaterial = ({
  map = null,
  color = 0xffffff,
  emissive = 0x000000,
  emissiveIntensity = 0,
  transparent = false,
  opacity = 1,
  alphaTest = 0,
  side = THREE.FrontSide,
  depthWrite = true
} = {}) => new THREE.MeshToonMaterial({
  map,
  color,
  gradientMap: getToonGradientMap(),
  emissive,
  emissiveIntensity,
  transparent,
  opacity,
  alphaTest,
  side,
  depthWrite
});

export const createOutlineMaterial = (opacity = ART_DIRECTION.outline.opacity) => {
  const material = new THREE.MeshBasicMaterial({
    color: ART_DIRECTION.palette.outline,
    side: THREE.BackSide,
    transparent: opacity < 1,
    opacity,
    depthWrite: true
  });
  material.userData.temporary = true;
  return material;
};

export const disposeToonResources = () => {
  gradientMap?.dispose();
  gradientMap = null;
};
