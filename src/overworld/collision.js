export class CollisionWorld {
  constructor(bounds) {
    this.bounds = { ...bounds };
    this.shapes = [];
  }

  addRect({ id = "rect", minX, maxX, minZ, maxZ, type = "solid" }) {
    const shape = { id, type, kind: "rect", minX, maxX, minZ, maxZ };
    this.shapes.push(shape);
    return shape;
  }

  addCircle({ id = "circle", x, z, radius, type = "solid" }) {
    const shape = { id, type, kind: "circle", x, z, radius };
    this.shapes.push(shape);
    return shape;
  }

  insideBounds(x, z, radius = 0) {
    return x - radius >= this.bounds.minX
      && x + radius <= this.bounds.maxX
      && z - radius >= this.bounds.minZ
      && z + radius <= this.bounds.maxZ;
  }

  intersectsShape(shape, x, z, radius) {
    if (shape.kind === "circle") return Math.hypot(x - shape.x, z - shape.z) < shape.radius + radius;
    const nearestX = Math.max(shape.minX, Math.min(x, shape.maxX));
    const nearestZ = Math.max(shape.minZ, Math.min(z, shape.maxZ));
    return Math.hypot(x - nearestX, z - nearestZ) < radius;
  }

  collides(x, z, radius = 0.5, { ignore = null } = {}) {
    if (!this.insideBounds(x, z, radius)) return true;
    return this.shapes.some((shape) => shape !== ignore && this.intersectsShape(shape, x, z, radius));
  }

  nearby(x, z, radius = 2) {
    return this.shapes.filter((shape) => this.intersectsShape(shape, x, z, radius));
  }
}
