export const DEPTH_ORDER_BASE = 10000;
export const DEPTH_ORDER_SCALE = 100;

export const depthOrderForZ = (z = 0, offset = 0) => (
  DEPTH_ORDER_BASE + Math.round((Number(z) + 40) * DEPTH_ORDER_SCALE) + offset
);
