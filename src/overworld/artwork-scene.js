import { THREE } from "./engine.js";
import { depthOrderForZ } from "./depth.js";

export const ARTWORK_CAMERA = Object.freeze({
  offsetY: 29.5,
  offsetZ: 22.5
});

const CAMERA_DISTANCE = Math.hypot(ARTWORK_CAMERA.offsetY, ARTWORK_CAMERA.offsetZ);
export const ARTWORK_DEPTH_PROJECTION = Math.abs(-ARTWORK_CAMERA.offsetY / CAMERA_DISTANCE);
const SCREEN_UP_Y = ARTWORK_CAMERA.offsetZ / CAMERA_DISTANCE;
const SCREEN_UP_Z = -ARTWORK_CAMERA.offsetY / CAMERA_DISTANCE;
const PLANE_ROTATION_X = -Math.atan2(ARTWORK_CAMERA.offsetY, ARTWORK_CAMERA.offsetZ);

export const createArtworkWorldSize = ({ sourceWidth, sourceHeight, worldDepth }) => {
  const projectedHeight = worldDepth * ARTWORK_DEPTH_PROJECTION;
  return Object.freeze({
    sourceWidth,
    sourceHeight,
    depth: worldDepth,
    projectedHeight,
    width: projectedHeight * (sourceWidth / sourceHeight)
  });
};

const configurePixelTexture = (texture, name) => {
  texture.name = name;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
  return texture;
};

const loadPixelTexture = ({ url, name, mapName }) => {
  const loader = new THREE.TextureLoader();
  return configurePixelTexture(loader.load(
    url,
    undefined,
    undefined,
    () => window.dispatchEvent(new CustomEvent("naturion:overworld-art-error", {
      detail: { url, reason: `Falha ao carregar a arte de ${mapName}` }
    }))
  ), name);
};

const createArtworkPlane = ({ texture, size, name, renderOrder, transparent = false }) => {
  const geometry = new THREE.PlaneGeometry(size.width, size.projectedHeight);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent,
    alphaTest: transparent ? 0.025 : 0,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.rotation.x = PLANE_ROTATION_X;
  mesh.renderOrder = renderOrder;
  mesh.frustumCulled = false;
  return { mesh, geometry, material };
};

const setBandUvs = (geometry, index, bandCount) => {
  const top = 1 - (index / bandCount);
  const bottom = 1 - ((index + 1) / bandCount);
  const uv = geometry.attributes.uv;
  uv.setXY(0, 0, top);
  uv.setXY(1, 1, top);
  uv.setXY(2, 0, bottom);
  uv.setXY(3, 1, bottom);
  uv.needsUpdate = true;
};

const createForegroundBands = ({ texture, size, name, bandCount, depthBias = 0 }) => {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.025,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide
  });
  const bandHeight = size.projectedHeight / bandCount;
  const meshes = [];
  const geometries = [];

  for (let index = 0; index < bandCount; index += 1) {
    const geometry = new THREE.PlaneGeometry(size.width, bandHeight + 0.025);
    setBandUvs(geometry, index, bandCount);
    const localY = size.projectedHeight * 0.5 - ((index + 0.5) * bandHeight);
    const logicalZ = -localY / ARTWORK_DEPTH_PROJECTION;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${name}-${index}`;
    mesh.rotation.x = PLANE_ROTATION_X;
    mesh.position.set(0, localY * SCREEN_UP_Y, localY * SCREEN_UP_Z);
    // A pequena margem evita que vegetação pertencente à mesma faixa dos
    // pés cubra o tronco do protagonista. Elementos realmente à frente ainda
    // preservam a profundidade natural do diorama.
    mesh.renderOrder = depthOrderForZ(logicalZ + depthBias, 35);
    mesh.frustumCulled = false;
    meshes.push(mesh);
    geometries.push(geometry);
  }

  return { meshes, geometries, material };
};

export const buildArtworkScene = ({
  scene,
  map,
  size,
  groundUrl,
  foregroundUrl,
  assetVersion = "1",
  foregroundBands = 24,
  foregroundDepthBias = 0
}) => {
  const root = new THREE.Group();
  root.name = `${map.id}-approved-diorama`;
  root.userData.visualSource = "approved-high-resolution-artwork";
  root.userData.sourceResolution = `${size.sourceWidth}x${size.sourceHeight}`;
  scene.add(root);

  const groundTexture = loadPixelTexture({
    url: `${groundUrl}?v=${assetVersion}`,
    name: `${map.id}-ground-v${assetVersion}`,
    mapName: map.name
  });
  const foregroundTexture = foregroundUrl
    ? loadPixelTexture({
        url: `${foregroundUrl}?v=${assetVersion}`,
        name: `${map.id}-foreground-v${assetVersion}`,
        mapName: map.name
      })
    : null;
  const ground = createArtworkPlane({
    texture: groundTexture,
    size,
    name: `${map.id}-ground`,
    renderOrder: -1000
  });
  const foreground = foregroundTexture
    ? createForegroundBands({
        texture: foregroundTexture,
        size,
        name: `${map.id}-foreground`,
        bandCount: foregroundBands,
        depthBias: foregroundDepthBias
      })
    : null;

  root.add(ground.mesh, ...(foreground?.meshes || []));

  return {
    root,
    dispose() {
      ground.geometry.dispose();
      ground.material.dispose();
      groundTexture.dispose();
      foreground?.geometries.forEach((geometry) => geometry.dispose());
      foreground?.material.dispose();
      foregroundTexture?.dispose();
      root.removeFromParent();
    }
  };
};
