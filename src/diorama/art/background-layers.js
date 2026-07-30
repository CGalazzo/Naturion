import { THREE } from "../engine.js";
import { ART_DIRECTION } from "./art-direction.js";

const createDistantTree = ({ parent, materials, x, y = 0, z, scale = 1, tint = "deep" }) => {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.42 * scale, 3.4 * scale, 6), materials.barkDark);
  trunk.position.y = 1.7 * scale;
  group.add(trunk);
  const leafMaterial = tint === "magic" ? materials.leafMagic : tint === "light" ? materials.leafLight : materials.leafAncient;
  [[0, 4.1, 0, 1.9, 1.2, 1.6], [-1.2, 3.8, 0.3, 1.15, 0.9, 1], [1.25, 3.95, -0.25, 1.2, 0.92, 1.05], [0.1, 5, 0, 1.25, 0.85, 1.1]].forEach(([px, py, pz, sx, sy, sz], index) => {
    const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 0), index % 2 ? materials.leafAncient : leafMaterial);
    canopy.position.set(px * scale, py * scale, pz * scale);
    canopy.scale.set(sx, sy, sz);
    group.add(canopy);
  });
  return group;
};

export const createBackgroundLayers = ({ scene, engine, materials }) => {
  const root = new THREE.Group();
  root.name = "BosqueBackgroundLayers";
  scene.add(root);

  const underworld = new THREE.Mesh(
    new THREE.CircleGeometry(95, 48),
    new THREE.MeshBasicMaterial({ color: ART_DIRECTION.palette.deepShadow, fog: true })
  );
  underworld.rotation.x = -Math.PI / 2;
  underworld.position.y = -6.2;
  root.add(underworld);

  const hills = [
    [-48, 2, -35, 17, 8, 14], [-22, 0, -49, 18, 9, 15], [12, 1, -52, 22, 11, 16], [44, 1, -38, 20, 10, 15],
    [53, 0, -5, 18, 9, 15], [49, 0, 28, 21, 10, 17], [20, 1, 48, 18, 9, 15], [-17, 0, 51, 22, 10, 16], [-48, 0, 34, 19, 9, 15]
  ];
  hills.forEach(([x, y, z, sx, sy, sz], index) => {
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const hill = new THREE.Mesh(geometry, index % 3 === 0 ? materials.stoneDark : materials.leafAncient);
    hill.position.set(x, y - 2.5, z);
    hill.scale.set(sx, sy, sz);
    hill.rotation.y = index * 0.71;
    root.add(hill);
  });

  const forestRing = [
    [-45, -22, 1.25], [-39, -34, 1.05], [-26, -42, 1.2], [-9, -46, 1.05], [10, -47, 1.25], [29, -43, 1.1], [43, -31, 1.22],
    [49, -14, 1.05], [50, 6, 1.18], [46, 24, 1.08], [35, 38, 1.22], [17, 45, 1.05], [-3, 47, 1.16], [-23, 44, 1.1], [-40, 34, 1.2], [-48, 16, 1.05]
  ];
  forestRing.forEach(([x, z, scale], index) => createDistantTree({ parent: root, materials, x, z, scale, tint: index % 7 === 0 ? "magic" : index % 3 === 0 ? "light" : "deep" }));

  const ruin = new THREE.Group();
  ruin.position.set(-43, -0.4, 4);
  root.add(ruin);
  [-1, 1].forEach((side) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 7, 7), materials.stoneDark);
    pillar.position.set(side * 3.1, 3.5, 0);
    pillar.rotation.z = side * 0.06;
    ruin.add(pillar);
  });
  const brokenLintel = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.9, 1.2), materials.mossStone);
  brokenLintel.position.set(-0.4, 6.6, 0);
  brokenLintel.rotation.z = -0.12;
  ruin.add(brokenLintel);

  const distantGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 15),
    new THREE.MeshBasicMaterial({ color: ART_DIRECTION.palette.sunHighlight, transparent: true, opacity: 0.055, depthWrite: false, side: THREE.DoubleSide })
  );
  distantGlow.position.set(-28, 8, -43);
  distantGlow.rotation.y = Math.PI * 0.25;
  root.add(distantGlow);
  engine.addUpdater((delta, elapsed) => {
    const frame = Math.floor(elapsed * 3);
    distantGlow.material.opacity = frame % 2 ? 0.048 : 0.06;
  });
  return root;
};
