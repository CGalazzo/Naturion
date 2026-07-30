import { THREE } from "../engine.js";

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
  points.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  });
  shape.closePath();
  return shape;
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
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: bevel,
    bevelThickness: Math.min(bevel, height * 0.32),
    curveSegments: 1,
    steps: 1
  });
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, y + height, 0);
  const mesh = new THREE.Mesh(geometry, [topMaterial, sideMaterial]);
  mesh.receiveShadow = receiveShadow;
  parent.add(mesh);
  return mesh;
};

export const buildLayeredDioramaBase = ({ root, materials }) => {
  const base = new THREE.Group();
  base.name = "DioramaLayeredBase";
  root.add(base);

  addTexturedBox(base, {
    y: -5.8,
    width: 76,
    height: 3.2,
    depth: 62,
    material: materials.stoneDark,
    receiveShadow: true
  });
  addTexturedBox(base, {
    y: -3.15,
    width: 74.6,
    height: 2.9,
    depth: 60.6,
    material: materials.earthSide,
    receiveShadow: true
  });
  addTexturedBox(base, {
    y: -0.62,
    width: 73.2,
    height: 0.72,
    depth: 59.2,
    material: materials.grass,
    receiveShadow: true
  });

  const edgeBlocks = [];
  for (let x = -34; x <= 34; x += 4) {
    edgeBlocks.push([x, -29.1, 3.6, 1.4], [x, 29.1, 3.6, 1.4]);
  }
  for (let z = -25; z <= 25; z += 4) {
    edgeBlocks.push([-36.1, z, 1.4, 3.6], [36.1, z, 1.4, 3.6]);
  }
  edgeBlocks.forEach(([x, z, width, depth], index) => {
    const height = 0.45 + (index % 4) * 0.08;
    addTexturedBox(base, {
      x,
      y: -0.78 - height,
      z,
      width,
      height,
      depth,
      material: index % 3 === 0 ? materials.mossStone : materials.earthSide,
      receiveShadow: true,
      rotationY: index % 2 ? 0.035 : -0.035
    });
  });

  const roots = [[-32, -27, 0.8], [-12, -29, 0.55], [16, -29, 0.6], [34, -8, 0.72], [35, 18, 0.6], [-35, 15, 0.68]];
  roots.forEach(([x, z, scale], index) => {
    const rootMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.32 * scale, 4.2 * scale, 6), materials.barkDark);
    rootMesh.rotation.z = Math.PI / 2;
    rootMesh.rotation.y = index * 0.7;
    rootMesh.position.set(x, -1.2, z);
    rootMesh.castShadow = false;
    base.add(rootMesh);
  });
  return base;
};

export const addPlateau = (parent, {
  x,
  z,
  width,
  depth,
  height,
  materials,
  top = "grassLight",
  irregularity = 0.55,
  rotation = 0
}) => {
  const hw = width * 0.5;
  const hd = depth * 0.5;
  const points = [
    [-hw + irregularity * 0.2, -hd],
    [hw - irregularity * 0.5, -hd + irregularity * 0.15],
    [hw, -hd * 0.3],
    [hw - irregularity * 0.15, hd - irregularity * 0.25],
    [hw * 0.25, hd],
    [-hw + irregularity * 0.45, hd - irregularity * 0.1],
    [-hw, hd * 0.25],
    [-hw + irregularity * 0.1, -hd * 0.55]
  ];
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  parent.add(group);
  addIrregularPlatform(group, {
    points,
    height,
    y: 0,
    topMaterial: materials[top],
    sideMaterial: materials.earthSide,
    bevel: 0.18
  });

  const ledges = [
    [-hw * 0.68, hd * 0.94, width * 0.28],
    [hw * 0.52, -hd * 0.9, width * 0.22],
    [hw * 0.88, hd * 0.2, depth * 0.22]
  ];
  ledges.forEach(([lx, lz, length], index) => {
    addTexturedBox(group, {
      x: lx,
      y: Math.max(0.12, height * 0.18),
      z: lz,
      width: Math.max(0.55, length),
      height: 0.22,
      depth: 0.45,
      material: index % 2 ? materials.mossStone : materials.stone,
      receiveShadow: true,
      rotationY: index * 0.45
    });
  });
  return group;
};

const sampleCatmull = (points, steps = 36) => {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal", 0.5);
  return curve.getPoints(steps);
};

export const addPathRibbon = (parent, {
  points,
  stage,
  materials,
  width = 3.2,
  seed = 1,
  detail = true
}) => {
  const group = new THREE.Group();
  group.name = `PathRibbon-${seed}`;
  parent.add(group);
  const samples = sampleCatmull(points, Math.max(18, points.length * 9));
  samples.forEach((point, index) => {
    const next = samples[Math.min(index + 1, samples.length - 1)];
    const angle = Math.atan2(next.x - point.x, next.z - point.z);
    const localWidth = width * (0.88 + ((index + seed) % 5) * 0.035);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(localWidth * 0.52, localWidth * 0.54, 0.075, 10), materials.path);
    mesh.rotation.y = angle;
    mesh.position.set(point.x, stage.getHeightAt(point.x, point.z) + 0.045, point.z);
    mesh.scale.z = 0.82 + ((index + seed) % 3) * 0.08;
    mesh.receiveShadow = true;
    group.add(mesh);

    if (detail && index % 4 === 0) {
      const side = index % 8 === 0 ? -1 : 1;
      const pebble = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.18), index % 3 ? materials.stone : materials.dirt);
      pebble.position.set(point.x + Math.cos(angle) * localWidth * 0.45 * side, mesh.position.y + 0.08, point.z - Math.sin(angle) * localWidth * 0.45 * side);
      pebble.rotation.y = angle + index;
      pebble.receiveShadow = true;
      group.add(pebble);
    }
  });
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

  const shoreShape = polygonShape(pondPoints.map(([px, pz]) => [px * 1.08, pz * 1.08]));
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
  water.receiveShadow = false;
  group.add(water);

  const foam = new THREE.Mesh(waterGeometry.clone(), materials.clone(materials.waterFoam));
  foam.rotation.x = -Math.PI / 2;
  foam.position.y = 0.095;
  group.add(foam);

  const bankStones = [[-7.9, 4.3, 0.45], [-3.8, 7.3, 0.36], [3.7, 6.6, 0.4], [7.8, 1.8, 0.5], [5.9, -4.2, 0.36], [-6.5, -4.3, 0.42]];
  bankStones.forEach(([sx, sz, size], index) => {
    const stone = new THREE.Mesh(new THREE.BoxGeometry(size * 1.4, size * 0.55, size), index % 2 ? materials.mossStone : materials.stone);
    stone.position.set(sx, 0.15, sz);
    stone.rotation.y = index * 0.72;
    stone.castShadow = index % 2 === 0;
    stone.receiveShadow = true;
    group.add(stone);
  });

  engine.addUpdater((delta, elapsed) => {
    const waterMap = water.material.map;
    const foamMap = foam.material.map;
    if (waterMap) {
      waterMap.offset.x = (elapsed * 0.018) % 1;
      waterMap.offset.y = (elapsed * 0.009) % 1;
    }
    if (foamMap) foamMap.offset.x = (-elapsed * 0.012) % 1;
    water.position.y = 0.075 + Math.sin(elapsed * 1.2) * 0.015;
    foam.material.opacity = 0.42 + Math.sin(elapsed * 1.55) * 0.08;
  });
  return group;
};

export const createPixelShadowTexture = (size = 64) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size / 2;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  const colors = ["rgba(0,0,0,.05)", "rgba(0,0,0,.12)", "rgba(0,0,0,.22)", "rgba(0,0,0,.34)"];
  colors.forEach((color, index) => {
    const insetX = 4 + index * 5;
    const insetY = 2 + index * 2;
    context.fillStyle = color;
    context.fillRect(insetX, insetY, size - insetX * 2, size / 2 - insetY * 2);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
};
