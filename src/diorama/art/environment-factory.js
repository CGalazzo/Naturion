import { THREE } from "../engine.js";
import { ART_DIRECTION } from "./art-direction.js";

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

export const addTexturedCylinder = (parent, {
  x = 0,
  y = 0,
  z = 0,
  radiusTop = 1,
  radiusBottom = radiusTop,
  height = 1,
  sides = 8,
  material,
  castShadow = false,
  receiveShadow = true,
  rotation = null
}) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, sides, 1, false), material);
  mesh.position.set(x, y + height * 0.5, z);
  if (rotation) mesh.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
  setShadow(mesh, { cast: castShadow, receive: receiveShadow });
  parent.add(mesh);
  return mesh;
};

const polygonShape = (points) => {
  const shape = new THREE.Shape();
  points.forEach(([x, z], index) => index === 0 ? shape.moveTo(x, z) : shape.lineTo(x, z));
  shape.closePath();
  return shape;
};

const irregularEllipsePoints = ({ width, depth, variation = 0.06, count = 18, phase = 0 }) => {
  const points = [];
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2;
    const pulse = 1 + Math.sin(angle * 3 + phase) * variation + Math.cos(angle * 5 - phase) * variation * 0.55;
    points.push([Math.cos(angle) * width * 0.5 * pulse, Math.sin(angle) * depth * 0.5 * pulse]);
  }
  return points;
};

export const addIrregularPlatform = (parent, {
  points,
  height,
  y = 0,
  topMaterial,
  sideMaterial,
  bevel = 0.14,
  receiveShadow = true
}) => {
  const shape = polygonShape(points);
  const group = new THREE.Group();
  parent.add(group);
  const sideGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: bevel,
    bevelThickness: Math.min(bevel, Math.max(0.06, height * 0.28)),
    curveSegments: 1,
    steps: 1
  });
  sideGeometry.rotateX(Math.PI / 2);
  sideGeometry.translate(0, y + height, 0);
  const side = new THREE.Mesh(sideGeometry, sideMaterial);
  side.receiveShadow = receiveShadow;
  group.add(side);

  const topGeometry = new THREE.ShapeGeometry(shape, 1);
  topGeometry.rotateX(-Math.PI / 2);
  const top = new THREE.Mesh(topGeometry, topMaterial);
  top.position.y = y + height + 0.018;
  top.receiveShadow = receiveShadow;
  group.add(top);
  return group;
};

const dioramaOutline = [
  [-34, -23], [-29, -29], [-13, -30], [3, -29.4], [20, -30], [34, -25],
  [37, -12], [36, 4], [37, 20], [30, 29], [13, 30], [-4, 29.3],
  [-22, 30], [-35, 24], [-38, 9], [-37, -8]
];

export const buildLayeredDioramaBase = ({ root, materials }) => {
  const base = new THREE.Group();
  base.name = "OrganicDioramaBase";
  root.add(base);

  const stonePoints = dioramaOutline.map(([x, z], index) => [x * (1.035 + (index % 3) * 0.002), z * 1.04]);
  const earthPoints = dioramaOutline.map(([x, z], index) => [x * (1.012 + (index % 2) * 0.003), z * 1.015]);
  addIrregularPlatform(base, { points: stonePoints, height: 3.1, y: -5.7, topMaterial: materials.stoneDark, sideMaterial: materials.stoneDark, bevel: 0.24 });
  addIrregularPlatform(base, { points: earthPoints, height: 2.75, y: -3.1, topMaterial: materials.earthSide, sideMaterial: materials.earthSide, bevel: 0.2 });
  addIrregularPlatform(base, { points: dioramaOutline, height: 0.58, y: -0.56, topMaterial: materials.grass, sideMaterial: materials.earthSide, bevel: 0.16 });

  const exposedRoots = [
    [-31, -25, 0.55, 0.35], [-18, -29, 0.44, 1.2], [8, -29, 0.5, 2.1], [33, -18, 0.62, 2.7],
    [36, 10, 0.52, 0.6], [25, 28, 0.48, 1.5], [-15, 29, 0.55, 2.4], [-35, 15, 0.58, 0.2]
  ];
  exposedRoots.forEach(([x, z, scale, angle]) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.2 * scale, 0, 0),
      new THREE.Vector3(-0.7 * scale, 0.22 * scale, 0.2 * scale),
      new THREE.Vector3(0.8 * scale, 0.08 * scale, -0.15 * scale),
      new THREE.Vector3(2.2 * scale, -0.1 * scale, 0)
    ]);
    const rootMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.22 * scale, 6, false), materials.barkDark);
    rootMesh.position.set(x, -0.75, z);
    rootMesh.rotation.y = angle;
    rootMesh.receiveShadow = true;
    base.add(rootMesh);
  });

  const edgeStones = [[-32, -27], [-7, -30], [19, -29], [35, -12], [35, 18], [20, 29], [-10, 29], [-35, 20], [-37, -2]];
  edgeStones.forEach(([x, z], index) => {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65 + (index % 3) * 0.12, 0), index % 3 === 0 ? materials.mossStone : materials.stone);
    stone.position.set(x, -0.55, z);
    stone.scale.set(1.4, 0.72, 1);
    stone.rotation.set(0.1 * (index % 2), index * 0.73, -0.06 * (index % 3));
    stone.receiveShadow = true;
    base.add(stone);
  });
  return base;
};

export const addPlateau = ({
  parent,
  x,
  z,
  width,
  depth,
  height,
  materials,
  top = "grassLight",
  irregularity = 0.085,
  rotation = 0
}) => {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  parent.add(group);
  const points = irregularEllipsePoints({ width, depth, variation: irregularity, count: 18, phase: x * 0.09 + z * 0.07 });
  addIrregularPlatform(group, {
    points,
    height,
    y: 0,
    topMaterial: materials[top],
    sideMaterial: materials.earthSide,
    bevel: 0.18
  });

  const rimCount = 12;
  for (let index = 0; index < rimCount; index += 1) {
    const angle = index / rimCount * Math.PI * 2;
    if (index % 4 === 1) continue;
    const radiusX = width * 0.48;
    const radiusZ = depth * 0.47;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + (index % 3) * 0.08, 0), index % 3 === 0 ? materials.mossStone : materials.stone);
    rock.position.set(Math.cos(angle) * radiusX, height * (0.2 + (index % 2) * 0.08), Math.sin(angle) * radiusZ);
    rock.scale.set(1.25, 0.6, 0.85);
    rock.rotation.set(0.05, angle + index * 0.2, 0.04 * (index % 2 ? 1 : -1));
    rock.receiveShadow = true;
    group.add(rock);
  }

  for (let index = 0; index < 4; index += 1) {
    const angle = index / 4 * Math.PI * 2 + 0.45;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(angle) * width * 0.36, height * 0.18, Math.sin(angle) * depth * 0.36),
      new THREE.Vector3(Math.cos(angle) * width * 0.44, height * 0.08, Math.sin(angle) * depth * 0.44),
      new THREE.Vector3(Math.cos(angle) * width * 0.53, 0.02, Math.sin(angle) * depth * 0.53)
    ]);
    const root = new THREE.Mesh(new THREE.TubeGeometry(curve, 6, 0.09 + index * 0.012, 5, false), materials.barkDark);
    root.receiveShadow = true;
    group.add(root);
  }
  return group;
};

const sampleCatmull = (points, steps = 36) => {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal", 0.5);
  return curve.getPoints(steps);
};

export const addPathRibbon = ({
  parent,
  points,
  stage,
  materials,
  width = 3.2,
  seed = 1,
  detail = true
}) => {
  const group = new THREE.Group();
  group.name = `OrganicPath-${seed}`;
  parent.add(group);
  const samples = sampleCatmull(points, Math.max(24, points.length * 10));
  const positions = [];
  const uvs = [];
  const indices = [];

  samples.forEach((point, index) => {
    const previous = samples[Math.max(0, index - 1)];
    const next = samples[Math.min(samples.length - 1, index + 1)];
    const tangentX = next.x - previous.x;
    const tangentZ = next.z - previous.z;
    const tangentLength = Math.hypot(tangentX, tangentZ) || 1;
    const normalX = -tangentZ / tangentLength;
    const normalZ = tangentX / tangentLength;
    const widthPulse = 0.88 + Math.sin(index * 0.72 + seed) * 0.055 + Math.cos(index * 0.31) * 0.025;
    const halfWidth = width * widthPulse * 0.5;
    const edgeNoise = Math.sin(index * 1.7 + seed) * 0.08;
    const yLeft = stage.getHeightAt(point.x + normalX * halfWidth, point.z + normalZ * halfWidth) + 0.055;
    const yRight = stage.getHeightAt(point.x - normalX * halfWidth, point.z - normalZ * halfWidth) + 0.055;
    positions.push(
      point.x + normalX * (halfWidth + edgeNoise), yLeft, point.z + normalZ * (halfWidth + edgeNoise),
      point.x - normalX * (halfWidth - edgeNoise), yRight, point.z - normalZ * (halfWidth - edgeNoise)
    );
    const v = index * 0.22;
    uvs.push(0, v, 1, v);
    if (index < samples.length - 1) {
      const offset = index * 2;
      indices.push(offset, offset + 2, offset + 1, offset + 2, offset + 3, offset + 1);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const path = new THREE.Mesh(geometry, materials.path);
  path.receiveShadow = true;
  group.add(path);

  if (detail) {
    samples.forEach((point, index) => {
      if (index % 6 !== 0) return;
      const previous = samples[Math.max(0, index - 1)];
      const next = samples[Math.min(samples.length - 1, index + 1)];
      const angle = Math.atan2(next.x - previous.x, next.z - previous.z);
      const side = index % 12 === 0 ? -1 : 1;
      const patch = new THREE.Mesh(new THREE.CircleGeometry(0.32 + (index % 3) * 0.06, 7), index % 2 ? materials.grass : materials.grassLight);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(point.x + Math.cos(angle) * width * 0.39 * side, stage.getHeightAt(point.x, point.z) + 0.069, point.z - Math.sin(angle) * width * 0.39 * side);
      patch.scale.set(1.5, 0.75, 1);
      group.add(patch);
      if (index % 12 === 0) {
        const pebble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13 + (index % 4) * 0.015, 0), materials.stone);
        pebble.position.set(point.x - Math.cos(angle) * width * 0.22 * side, stage.getHeightAt(point.x, point.z) + 0.09, point.z + Math.sin(angle) * width * 0.22 * side);
        pebble.scale.set(1.4, 0.45, 0.9);
        pebble.rotation.y = angle + index;
        group.add(pebble);
      }
    });
  }
  return group;
};

const pondPoints = [
  [-9.8, -1.8], [-7.2, -5.2], [-2.2, -6.5], [3.5, -5.4], [7.8, -1.7], [8.4, 2.9],
  [5.9, 6.5], [1.2, 8.2], [-4.3, 7.5], [-8.6, 4.2]
];

export const addPixelWaterPond = ({ parent, engine, materials, x, z, scaleX = 1, scaleZ = 1 }) => {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.set(scaleX, 1, scaleZ);
  parent.add(group);

  const shoreShape = polygonShape(pondPoints.map(([px, pz], index) => [px * (1.08 + (index % 2) * 0.012), pz * 1.08]));
  const shore = new THREE.Mesh(new THREE.ShapeGeometry(shoreShape), materials.wetSoil);
  shore.rotation.x = -Math.PI / 2;
  shore.position.y = 0.022;
  shore.receiveShadow = true;
  group.add(shore);

  const waterShape = polygonShape(pondPoints);
  const waterGeometry = new THREE.ShapeGeometry(waterShape);
  const water = new THREE.Mesh(waterGeometry, materials.clone(materials.water));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.075;
  group.add(water);

  const foam = new THREE.Mesh(waterGeometry.clone(), materials.clone(materials.waterFoam));
  foam.rotation.x = -Math.PI / 2;
  foam.position.y = 0.095;
  foam.scale.set(0.985, 0.985, 0.985);
  group.add(foam);

  const bankStones = [[-7.9, 4.3, 0.45], [-3.8, 7.3, 0.36], [3.7, 6.6, 0.4], [7.8, 1.8, 0.5], [5.9, -4.2, 0.36], [-6.5, -4.3, 0.42]];
  bankStones.forEach(([sx, sz, size], index) => {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), index % 2 ? materials.mossStone : materials.stone);
    stone.position.set(sx, 0.16, sz);
    stone.scale.set(1.35, 0.5, 0.95);
    stone.rotation.set(0.05, index * 0.72, -0.04);
    stone.castShadow = index % 2 === 0;
    stone.receiveShadow = true;
    group.add(stone);
  });

  const reeds = [[-6.7, 4.9], [-5.9, 5.5], [5.8, 4.9], [6.5, -2.7], [-3.1, -5.7]];
  reeds.forEach(([rx, rz], index) => {
    for (let blade = 0; blade < 3; blade += 1) {
      const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.8 + blade * 0.12, 5), index % 2 ? materials.grassLight : materials.grass);
      reed.position.set(rx + blade * 0.12, 0.4 + blade * 0.06, rz + Math.sin(blade) * 0.1);
      reed.rotation.z = (blade - 1) * 0.08;
      group.add(reed);
    }
  });

  let lastFrame = -1;
  engine.addUpdater((delta, elapsed) => {
    const frame = Math.floor(elapsed * 6);
    if (frame !== lastFrame) {
      lastFrame = frame;
      if (water.material.map) {
        water.material.map.offset.x = (frame % 16) / 64;
        water.material.map.offset.y = (Math.floor(frame / 4) % 12) / 96;
      }
      if (foam.material.map) foam.material.map.offset.x = -((frame % 12) / 72);
      water.position.y = 0.075 + (frame % 4 === 0 ? 0.012 : frame % 4 === 2 ? -0.008 : 0);
      foam.material.opacity = frame % 3 === 0 ? 0.62 : frame % 3 === 1 ? 0.52 : 0.57;
    }
  });
  return group;
};

export const createPixelShadowTexture = (size = 64) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size / 2;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  const bands = [
    [4, 2, "rgba(8,24,21,.05)"],
    [8, 4, "rgba(8,24,21,.12)"],
    [13, 6, "rgba(8,24,21,.22)"],
    [19, 8, "rgba(8,24,21,.34)"]
  ];
  bands.forEach(([insetX, insetY, color]) => {
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
