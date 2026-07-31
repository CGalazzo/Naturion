export const isWithinRadius = (a, b, radius) => {
  if (!a || !b) return false;
  const dx = Number(a.x || 0) - Number(b.x || 0);
  const dz = Number(a.z || 0) - Number(b.z || 0);
  return (dx * dx) + (dz * dz) <= radius * radius;
};

export const isDocumentRenderable = () => (
  typeof document === "undefined" || document.visibilityState !== "hidden"
);

export const shouldAnimateLocalEffect = ({ playerPosition, effect, screenActive = true }) => (
  screenActive &&
  isDocumentRenderable() &&
  isWithinRadius(playerPosition, effect, effect.visibleRadius || 18)
);
