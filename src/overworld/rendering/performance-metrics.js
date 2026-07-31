export const collectOverworldMetrics = (engine, extra = {}) => {
  const info = engine?.renderer?.info;
  return Object.freeze({
    drawCalls: info?.render?.calls ?? 0,
    triangles: info?.render?.triangles ?? 0,
    textures: info?.memory?.textures ?? 0,
    geometries: info?.memory?.geometries ?? 0,
    resolution: engine?.renderResolution
      ? `${engine.renderResolution.width}x${engine.renderResolution.height}`
      : "unknown",
    ...extra
  });
};
