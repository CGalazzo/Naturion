import { THREE } from "../engine.js";

export const VOXEL_UNIT = 1;
const WORLD_BLOCK = 1.5;
const PATH_BLOCK = 0.72;

const setShadow = (mesh, { cast = false, receive = true } = {}) => {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
};

export const addTexturedBox = (parent, {
  x = 0,
  y = 0,
  z = 0,
  width = 1,
  height = 1,
  depth = 1,
  material,
  castShadow = false,
  receiveShadow = true,
  rotationY = 0
}) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y + height * 0.5, z);
  mesh.rotation.y = rotationY;
  setShadow(mesh, { cast: castShadow, receive: receiveShadow });
  parent.add(mesh);
  return mesh;
};

// Mantém a API antiga, mas desenha colunas quadradas para preservar o estilo voxel.
export const addTexturedCylinder = (parent, {
  x = 0,
  y = 0,
  z = 0,
  radiusTop = 1,
  radiusBottom = radiusTop,
  height = 1,
  material,
  castShadow = false,
  receiveShadow = true,
  rotation = null
}) => {
  const width = Math.max(radiusTop, radiusBottom) * 2;
  const mesh = addTexturedBox(parent, {
    x, y, z, width, height, depth: width, material, castShadow, receiveShadow
  });
  if (rotation) mesh.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
  return mesh;
};

const createInstancedBlocks = ({ parent, name, positions, size = 1, height = size, material, castShadow = false, receiveShadow = true }) => {
  if (!positions.length) return null;
  const geometry = new THREE.BoxGeometry(size, height, size);
  const mesh = new THREE.InstancedMesh(geometry, material, positions.length);
  mesh.name = name;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  const matrix = new THREE.Matrix4();
  positions.forEach((position, index) => {
    matrix.makeTranslation(position.x, position.y, position.z);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  parent.add(mesh);
  return mesh;
};

const gridPositions = ({ minX, maxX, minZ, maxZ, step, y }) => {
  const positions = [];
  for (let x = minX; x <= maxX + 0.001; x += step) {
    for (let z = minZ; z <= maxZ + 0.001; z += step) positions.push({ x, y, z });
  }
  return positions;
};

export const buildLayeredDioramaBase = ({ root, materials }) => {
  const base = new THREE.Group();
  base.name = "VoxelLayeredBase";
  root.add(base);
  const minX = -36;
  const maxX = 36;
  const minZ = -29;
  const maxZ = 29;
  const layers = [
    { name: "GrassBlocks", y: -0.35, height: 0.7, material: materials.grass },
    { name: "UpperDirtBlocks", y: -1.2, height: 1, material: materials.earthSide },
    { name: "LowerDirtBlocks", y: -2.2, height: 1, material: materials.dirt },
    { name: "UpperStoneBlocks", y: -3.2, height: 1, material: materials.stone },
    { name: "DeepStoneBlocks", y: -4.2, height: 1, material: materials.stoneDark },
    { name: "FoundationBlocks", y: -5.2, height: 1, material: materials.stoneDark }
  ];
  layers.forEach((layer, index) => createInstancedBlocks({
    parent: base,
    name: layer.name,
    positions: gridPositions({ minX, maxX, minZ, maxZ, step: WORLD_BLOCK, y: layer.y }),
    size: WORLD_BLOCK,
    height: layer.height,
    material: layer.material,
    castShadow: index === 0,
    receiveShadow: true
  }));
  return base;
};

const shouldKeepPlateauCell = (ix, iz, countX, countZ) => {
  const edgeX = ix === 0 || ix === countX - 1;
  const edgeZ = iz === 0 || iz === countZ - 1;
  if (!(edgeX && edgeZ)) return true;
  return (ix * 13 + iz * 7 + countX + countZ) % 3 !== 0;
};

export const addPlateau = ({ parent, x, z, width, depth, height, materials, top = "grassLight" }) => {
  const group = new THREE.Group();
  group.name = "VoxelPlateau";
  parent.add(group);
  const step = 1;
  const countX = Math.max(1, Math.round(width / step));
  const countZ = Math.max(1, Math.round(depth / step));
  const levels = Math.max(1, Math.ceil(height / 0.55));
  const levelHeight = height / levels;
  for (let level = 0; level < levels; level += 1) {
    const positions = [];
    for (let ix = 0; ix < countX; ix += 1) {
      for (let iz = 0; iz < countZ; iz += 1) {
        if (!shouldKeepPlateauCell(ix, iz, countX, countZ)) continue;
        positions.push({
          x: x + (ix - (countX - 1) / 2) * step,
          y: level * levelHeight + levelHeight * 0.5,
          z: z + (iz - (countZ - 1) / 2) * step
        });
      }
    }
    createInstancedBlocks({
      parent: group,
      name: `PlateauLevel-${level}`,
      positions,
      size: step,
      height: levelHeight,
      material: level === levels - 1 ? materials[top] : materials.earthSide,
      castShadow: level === levels - 1,
      receiveShadow: true
    });
  }
  return group;
};

const sampleCatmull = (points, steps = 36) => {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal", 0.5);
  return curve.getPoints(steps);
};

export const addPathRibbon = ({ parent, points, stage, materials, width = 3.2, seed = 1, detail = true }) => {
  const group = new THREE.Group();
  group.name = `VoxelPath-${seed}`;
  parent.add(group);
  const cells = new Map();
  const samples = sampleCatmull(points, Math.max(24, points.length * 12));
  const radius = Math.max(1, Math.floor((width * 0.5) / PATH_BLOCK));
  samples.forEach((point, sampleIndex) => {
    const centerX = Math.round(point.x / PATH_BLOCK);
    const centerZ = Math.round(point.z / PATH_BLOCK);
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        if (Math.hypot(dx, dz) > radius + 0.25) continue;
        const gx = centerX + dx;
        const gz = centerZ + dz;
        const key = `${gx}:${gz}`;
        if (cells.has(key)) continue;
        const worldX = gx * PATH_BLOCK;
        const worldZ = gz * PATH_BLOCK;
        cells.set(key, {
          x: worldX,
          y: stage.getHeightAt(worldX, worldZ) + 0.07,
          z: worldZ,
          variant: (gx * 17 + gz * 31 + seed + sampleIndex) % 11
        });
      }
    }
  });
  const main = [];
  const accent = [];
  cells.forEach((cell) => (detail && cell.variant === 0 ? accent : main).push(cell));
  createInstancedBlocks({ parent: group, name: "PathDirtBlocks", positions: main, size: PATH_BLOCK, height: 0.14, material: materials.path, receiveShadow: true });
  createInstancedBlocks({ parent: group, name: "PathStoneBlocks", positions: accent, size: PATH_BLOCK, height: 0.16, material: materials.stone, receiveShadow: true });
  return group;
};

const pondPoints = [
  [-9.8, -1.8], [-7.2, -5.2], [-2.2, -6.5], [3.5, -5.4], [7.8, -1.7], [8.4, 2.9],
  [5.9, 6.5], [1.2, 8.2], [-4.3, 7.5], [-8.6, 4.2]
];

const pointInsidePolygon = (x, z, points) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, zi] = points[i];
    const [xj, zj] = points[j];
    const intersects = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / ((zj - zi) || 0.0001) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

export const addPixelWaterPond = ({ parent, engine, materials, x, z, scaleX = 1, scaleZ = 1 }) => {
  const group = new THREE.Group();
  group.name = "VoxelWaterPond";
  group.position.set(x, 0, z);
  parent.add(group);
  const step = 0.75;
  const waterCells = [];
  const shoreCells = [];
  for (let gx = -11; gx <= 11; gx += step) {
    for (let gz = -8.5; gz <= 8.5; gz += step) {
      const localX = gx / scaleX;
      const localZ = gz / scaleZ;
      const inside = pointInsidePolygon(localX, localZ, pondPoints);
      const near = pointInsidePolygon(localX / 1.09, localZ / 1.09, pondPoints);
      if (inside) waterCells.push({ x: gx, y: 0.075, z: gz });
      else if (near) shoreCells.push({ x: gx, y: 0.04, z: gz });
    }
  }
  createInstancedBlocks({ parent: group, name: "WetShoreBlocks", positions: shoreCells, size: step, height: 0.08, material: materials.wetSoil, receiveShadow: true });
  const waterMaterial = materials.clone(materials.water);
  const water = createInstancedBlocks({ parent: group, name: "WaterBlocks", positions: waterCells, size: step, height: 0.1, material: waterMaterial, receiveShadow: false });
  const foamCells = waterCells.filter((cell, index) => index % 13 === 0).map((cell) => ({ ...cell, y: cell.y + 0.065 }));
  const foam = createInstancedBlocks({ parent: group, name: "WaterHighlightBlocks", positions: foamCells, size: step * 0.7, height: 0.025, material: materials.clone(materials.waterFoam), receiveShadow: false });
  let lastFrame = -1;
  engine.addUpdater((delta, elapsed) => {
    const frame = Math.floor(elapsed * 5);
    if (frame === lastFrame) return;
    lastFrame = frame;
    if (waterMaterial.map) {
      waterMaterial.map.offset.x = (frame % 16) / 16;
      waterMaterial.map.offset.y = (Math.floor(frame / 2) % 16) / 32;
    }
    if (water) water.position.y = (frame % 2) * 0.012;
    if (foam) foam.visible = frame % 4 !== 0;
  });
  return group;
};

export const createPixelShadowTexture = (size = 64) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size / 2;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  [
    [4, 2, "rgba(0,0,0,.06)"],
    [9, 4, "rgba(0,0,0,.14)"],
    [14, 6, "rgba(0,0,0,.24)"],
    [19, 8, "rgba(0,0,0,.34)"]
  ].forEach(([insetX, insetY, color]) => {
    context.fillStyle = color;
    context.fillRect(insetX, insetY, size - insetX * 2, size / 2 - insetY * 2);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
};
