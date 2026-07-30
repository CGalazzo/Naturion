import { THREE } from "../engine.js";

export const VOXEL_UNIT = 1;
const TERRAIN_STEP = 1;
const PATH_STEP = 0.72;

const makeRect = (minX, maxX, minZ, maxZ) => ({ type: "rect", minX, maxX, minZ, maxZ });
const makeCircle = (x, z, radius) => ({ type: "circle", x, z, radius });

const VISUAL_REGIONS = [
  makeCircle(-26, -20, 9.1), makeRect(-30, -5, -25, -15), makeRect(-15, -2, -22, 6),
  makeCircle(-7, 1, 11), makeRect(-11, 13, -6, 8), makeRect(1, 17, -2, 12),
  makeRect(7, 25, 6, 18), makeCircle(22, 12, 10), makeRect(18, 31, 13, 24),
  makeCircle(27, 20, 8.7), makeRect(-15, -2, 1, 17), makeRect(-28, -5, 8, 20),
  makeCircle(-24, 16, 8.4), makeRect(14, 27, -8, 8), makeCircle(19, 1, 8.6),
  makeRect(5, 20, -21, -10), makeRect(-4, 13, -22, -10)
];

const CUTOUTS = [
  makeCircle(-34, 23, 4.2), makeCircle(35, -24, 5.1), makeRect(-37, -31, -9, 2),
  makeRect(30, 38, 5, 12), makeCircle(-2, 27, 5.5), makeCircle(8, -28, 4.7)
];

const inside = (shape, x, z) => shape.type === "circle"
  ? Math.hypot(x - shape.x, z - shape.z) <= shape.radius
  : x >= shape.minX && x <= shape.maxX && z >= shape.minZ && z <= shape.maxZ;

const isVisualGround = (x, z) => VISUAL_REGIONS.some((shape) => inside(shape, x, z)) && !CUTOUTS.some((shape) => inside(shape, x, z));

const setShadow = (mesh, cast = false, receive = true) => {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
};

export const createVoxelBlock = ({
  parent,
  name = "VoxelBlock",
  x = 0,
  y = 0,
  z = 0,
  width = 1,
  height = 1,
  depth = 1,
  material,
  castShadow = false,
  receiveShadow = true,
  rotationY = 0,
  rotationX = 0,
  rotationZ = 0
}) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.name = name;
  mesh.position.set(x, y + height * 0.5, z);
  mesh.rotation.set(rotationX, rotationY, rotationZ);
  setShadow(mesh, castShadow, receiveShadow);
  parent.add(mesh);
  return mesh;
};

export const createInstancedBlocks = ({ parent, name, transforms, geometry = null, material, castShadow = false, receiveShadow = true }) => {
  if (!transforms.length) return null;
  const blockGeometry = geometry || new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(blockGeometry, material, transforms.length);
  mesh.name = name;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  transforms.forEach((item, index) => {
    position.set(item.x, item.y, item.z);
    rotation.setFromEuler(new THREE.Euler(item.rx || 0, item.ry || 0, item.rz || 0));
    scale.set(item.sx || 1, item.sy || 1, item.sz || 1);
    matrix.compose(position, rotation, scale);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  parent.add(mesh);
  return mesh;
};

const terrainAccent = (x, z) => {
  const value = Math.abs(Math.round(x) * 7 + Math.round(z) * 11);
  return value % 17 === 0 ? "root" : value % 23 === 0 ? "moss" : "grass";
};

export const buildDefinitiveTerrain = ({ root, stage, materials }) => {
  const group = new THREE.Group();
  group.name = "DefinitiveVoxelTerrain";
  root.add(group);
  const top = { grass: [], root: [], moss: [] };
  const middle = [];
  const deep = [];
  const foundation = [];

  for (let x = -36; x <= 36; x += TERRAIN_STEP) {
    for (let z = -29; z <= 29; z += TERRAIN_STEP) {
      if (!isVisualGround(x, z)) continue;
      const surface = stage.getHeightAt(x, z);
      const accent = terrainAccent(x, z);
      top[accent].push({ x, y: surface - 0.35, z, sx: 1, sy: 0.7, sz: 1 });
      middle.push({ x, y: surface - 1.2, z, sx: 1, sy: 1, sz: 1 });
      deep.push({ x, y: surface - 2.2, z, sx: 1, sy: 1, sz: 1 });
      if ((Math.round(x) + Math.round(z)) % 3 !== 0) foundation.push({ x, y: surface - 3.2, z, sx: 1, sy: 1, sz: 1 });
    }
  }

  createInstancedBlocks({ parent: group, name: "GrassSurface", transforms: top.grass, material: materials.grassBlock, castShadow: true });
  createInstancedBlocks({ parent: group, name: "RootedSurface", transforms: top.root, material: materials.blockFaces(materials.grassTop, materials.rootDirt, materials.dirt), castShadow: true });
  createInstancedBlocks({ parent: group, name: "MossStoneSurface", transforms: top.moss, material: materials.mossStoneBlock, castShadow: true });
  createInstancedBlocks({ parent: group, name: "EarthLayer", transforms: middle, material: materials.rootDirtBlock });
  createInstancedBlocks({ parent: group, name: "StoneLayer", transforms: deep, material: materials.stoneBlock });
  createInstancedBlocks({ parent: group, name: "DeepStoneLayer", transforms: foundation, material: materials.deepStoneBlock });

  const edgeGrass = [
    [-34, -18], [-30, -11], [-27, 22], [-18, 24], [-4, 22], [13, 22], [33, 18],
    [31, 4], [28, -8], [18, -20], [4, -23], [-12, -24], [-31, 5]
  ];
  edgeGrass.forEach(([x, z], index) => {
    createVoxelBlock({
      parent: group,
      name: "OverhangingGrass",
      x,
      y: stage.getHeightAt(x, z) + 0.02,
      z,
      width: 0.72 + (index % 3) * 0.12,
      height: 0.14,
      depth: 0.42 + (index % 2) * 0.18,
      material: materials.grassTop,
      rotationY: index * 0.47
    });
  });
  return group;
};

const sampleCurve = (points, steps) => new THREE.CatmullRomCurve3(
  points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal", 0.5
).getPoints(steps);

export const createDefinitivePath = ({ parent, stage, materials, points, width, seed }) => {
  const group = new THREE.Group();
  group.name = `DefinitivePath-${seed}`;
  parent.add(group);
  const samples = sampleCurve(points, Math.max(32, points.length * 15));
  const radius = Math.max(1, Math.floor((width * 0.5) / PATH_STEP));
  const cells = new Map();
  samples.forEach((point) => {
    const gx = Math.round(point.x / PATH_STEP);
    const gz = Math.round(point.z / PATH_STEP);
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        const distance = Math.hypot(dx, dz);
        const irregularLimit = radius + (((gx + gz + dx * 3 - dz * 2 + seed) % 7 === 0) ? 0.42 : 0.08);
        if (distance > irregularLimit) continue;
        const key = `${gx + dx}:${gz + dz}`;
        if (cells.has(key)) continue;
        const x = (gx + dx) * PATH_STEP;
        const z = (gz + dz) * PATH_STEP;
        const code = Math.abs((gx + dx) * 5 + (gz + dz) * 9 + seed * 13) % 19;
        cells.set(key, { x, z, y: stage.getHeightAt(x, z) + 0.085, code, edge: distance > radius - 0.65 });
      }
    }
  });

  const dirt = [];
  const stones = [];
  const grassIntrusions = [];
  cells.forEach((cell) => {
    const transform = { x: cell.x, y: cell.y, z: cell.z, sx: PATH_STEP, sy: cell.code % 5 === 0 ? 0.16 : 0.12, sz: PATH_STEP };
    if (cell.code === 0 || cell.code === 11) stones.push(transform);
    else if (cell.edge && (cell.code === 4 || cell.code === 8)) grassIntrusions.push({ ...transform, sy: 0.1 });
    else dirt.push(transform);
  });
  createInstancedBlocks({ parent: group, name: "PathEarth", transforms: dirt, material: materials.pathBlock });
  createInstancedBlocks({ parent: group, name: "PathFlatStone", transforms: stones, material: materials.pathStoneBlock });
  createInstancedBlocks({ parent: group, name: "PathGrassIntrusion", transforms: grassIntrusions, material: materials.grassBlock });
  return group;
};

export const createRampBlocks = ({ parent, stage, materials, from, to, width, steps }) => {
  const group = new THREE.Group();
  group.name = "VoxelRampDetails";
  parent.add(group);
  for (let index = 0; index < steps; index += 1) {
    const t = (index + 0.5) / steps;
    const x = THREE.MathUtils.lerp(from.x, to.x, t);
    const z = THREE.MathUtils.lerp(from.z, to.z, t);
    const nx = THREE.MathUtils.lerp(from.x, to.x, Math.min(1, t + 1 / steps));
    const nz = THREE.MathUtils.lerp(from.z, to.z, Math.min(1, t + 1 / steps));
    const angle = Math.atan2(nx - x, nz - z);
    createVoxelBlock({
      parent: group,
      name: "RampPathBlock",
      x,
      y: stage.getHeightAt(x, z) - 0.08,
      z,
      width: width * (index % 3 === 0 ? 0.94 : 1),
      height: 0.16,
      depth: Math.hypot(to.x - from.x, to.z - from.z) / steps + 0.2,
      material: index % 4 === 0 ? materials.pathStoneBlock : materials.pathBlock,
      rotationY: angle
    });
  }
  return group;
};

const POND_POLYGON = [
  [-9.8, -1.8], [-7.2, -5.2], [-2.2, -6.5], [3.5, -5.4], [7.8, -1.7], [8.4, 2.9],
  [5.9, 6.5], [1.2, 8.2], [-4.3, 7.5], [-8.6, 4.2]
];

const pointInsidePolygon = (x, z, points) => {
  let result = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, zi] = points[i];
    const [xj, zj] = points[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / ((zj - zi) || 0.0001) + xi) result = !result;
  }
  return result;
};

export const createDefinitiveWater = ({ parent, engine, materials, x, z, scaleX = 1, scaleZ = 1 }) => {
  const group = new THREE.Group();
  group.name = "DefinitiveVoxelPond";
  group.position.set(x, 0, z);
  parent.add(group);
  const step = 0.72;
  const water = [];
  const shore = [];
  const mud = [];
  for (let gx = -11; gx <= 11; gx += step) {
    for (let gz = -8.5; gz <= 8.5; gz += step) {
      const localX = gx / scaleX;
      const localZ = gz / scaleZ;
      const insideWater = pointInsidePolygon(localX, localZ, POND_POLYGON);
      const insideShore = pointInsidePolygon(localX / 1.11, localZ / 1.11, POND_POLYGON);
      const insideMud = pointInsidePolygon(localX / 1.19, localZ / 1.19, POND_POLYGON);
      if (insideWater) water.push({ x: gx, y: 0.06, z: gz, sx: step, sy: 0.1, sz: step });
      else if (insideShore) shore.push({ x: gx, y: 0.04, z: gz, sx: step, sy: 0.09, sz: step });
      else if (insideMud && (Math.round(gx / step) + Math.round(gz / step)) % 3 !== 0) mud.push({ x: gx, y: 0.03, z: gz, sx: step, sy: 0.07, sz: step });
    }
  }
  createInstancedBlocks({ parent: group, name: "WaterMud", transforms: mud, material: materials.mudBlock });
  createInstancedBlocks({ parent: group, name: "WaterShore", transforms: shore, material: materials.shoreBlock });
  const waterMaterial = materials.clone(materials.water);
  const waterMesh = createInstancedBlocks({ parent: group, name: "WaterSurface", transforms: water, material: waterMaterial, receiveShadow: false });
  const highlight = water.filter((_, index) => index % 17 === 0).map((item) => ({ ...item, y: item.y + 0.075, sx: step * 0.65, sy: 0.025, sz: step * 0.32 }));
  const highlightMesh = createInstancedBlocks({ parent: group, name: "WaterHighlights", transforms: highlight, material: materials.waterFoam, receiveShadow: false });
  let previous = -1;
  engine.addUpdater((delta, elapsed) => {
    const frame = Math.floor(elapsed * 4) % materials.waterFrames.length;
    if (frame === previous) return;
    previous = frame;
    waterMaterial.map = materials.waterFrames[frame];
    waterMaterial.needsUpdate = true;
    if (waterMesh) waterMesh.position.y = frame === 1 ? 0.01 : 0;
    if (highlightMesh) highlightMesh.visible = frame !== 2;
  });
  return group;
};

export const createPixelShadowTexture = (size = 64) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size / 2;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  [[4, 2, 0.05], [9, 4, 0.13], [14, 6, 0.23], [19, 8, 0.34]].forEach(([ix, iy, opacity]) => {
    context.fillStyle = `rgba(0,0,0,${opacity})`;
    context.fillRect(ix, iy, size - ix * 2, size / 2 - iy * 2);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
};

export const createGroundShadow = ({ parent, width = 2, depth = 1, opacity = 0.34 }) => {
  const material = new THREE.MeshBasicMaterial({ map: createPixelShadowTexture(), transparent: true, depthWrite: false, opacity });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  parent.add(shadow);
  return shadow;
};
