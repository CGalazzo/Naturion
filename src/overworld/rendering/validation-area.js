export const VALIDATION_AREA = Object.freeze({
  minX: -4,
  maxX: 19,
  minZ: 0,
  maxZ: 22,
  centerX: 7.5,
  centerZ: 11,
  width: 23,
  depth: 22
});

export const VALIDATION_OCCLUDERS = Object.freeze([
  Object.freeze({ id: "house-east-roof", atlasCell: 0, x: 9, z: 1.1, width: 10.2, depth: 7.2, sortZ: 4.15 }),
  Object.freeze({ id: "tree-entry-east", atlasCell: 1, x: 17.2, z: 16.1, width: 7.4, depth: 6.2, sortZ: 16.8 }),
  Object.freeze({ id: "tree-entry-west", atlasCell: 2, x: -1.2, z: 8.2, width: 7.1, depth: 6, sortZ: 8.9 }),
  Object.freeze({ id: "high-branch", atlasCell: 3, x: 15.5, z: 7.4, width: 8.2, depth: 4.8, sortZ: 8.1 })
]);

export const VALIDATION_EFFECT = Object.freeze({
  x: 14.5,
  z: 7.3,
  width: 4.4,
  depth: 4.4,
  visibleRadius: 18
});
