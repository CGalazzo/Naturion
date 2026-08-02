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

  addEllipse({ id = "ellipse", x, z, radiusX, radiusZ, type = "solid" }) {
    const shape = { id, type, kind: "ellipse", x, z, radiusX, radiusZ };
    this.shapes.push(shape);
    return shape;
  }

  addPolygon({ id = "polygon", points, type = "solid" }) {
    if (!Array.isArray(points) || points.length < 3) {
      throw new TypeError(`Polígono de colisão inválido: ${id}.`);
    }
    const shape = {
      id,
      type,
      kind: "polygon",
      points: points.map(([x, z]) => ({ x, z }))
    };
    this.shapes.push(shape);
    return shape;
  }

  addObstacle(shape) {
    if (!shape || typeof shape !== "object") {
      throw new TypeError("Obstáculo de mapa inválido.");
    }
    if (shape.kind === "rect") return this.addRect(shape);
    if (shape.kind === "circle") return this.addCircle(shape);
    if (shape.kind === "ellipse") return this.addEllipse(shape);
    if (shape.kind === "polygon") return this.addPolygon(shape);
    throw new TypeError(`Formato de obstáculo não suportado: ${shape.kind || "desconhecido"}.`);
  }

  addObstacles(shapes = []) {
    shapes.forEach((shape) => this.addObstacle(shape));
    return this;
  }

  insideBounds(x, z, radius = 0) {
    return x - radius >= this.bounds.minX
      && x + radius <= this.bounds.maxX
      && z - radius >= this.bounds.minZ
      && z + radius <= this.bounds.maxZ;
  }

  intersectsShape(shape, x, z, radius) {
    if (shape.kind === "circle") return Math.hypot(x - shape.x, z - shape.z) < shape.radius + radius;
    if (shape.kind === "ellipse") {
      const radiusX = shape.radiusX + radius;
      const radiusZ = shape.radiusZ + radius;
      return ((x - shape.x) / radiusX) ** 2 + ((z - shape.z) / radiusZ) ** 2 < 1;
    }
    if (shape.kind === "polygon") {
      if (pointInPolygon(x, z, shape.points)) return true;
      return shape.points.some((point, index) => {
        const next = shape.points[(index + 1) % shape.points.length];
        return distanceToSegment(x, z, point.x, point.z, next.x, next.z) < radius;
      });
    }
    const nearestX = Math.max(shape.minX, Math.min(x, shape.maxX));
    const nearestZ = Math.max(shape.minZ, Math.min(z, shape.maxZ));
    return Math.hypot(x - nearestX, z - nearestZ) <= radius;
  }

  collides(x, z, radius = 0.5, { ignore = null } = {}) {
    if (!this.insideBounds(x, z, radius)) return true;
    return this.shapes.some((shape) => shape !== ignore && this.intersectsShape(shape, x, z, radius));
  }

  nearby(x, z, radius = 2) {
    return this.shapes.filter((shape) => this.intersectsShape(shape, x, z, radius));
  }
}

// Padrão compartilhado pelos mapas de diorama: todo terreno dentro dos
// limites nasce caminhável. Cada mapa cadastra somente casas, pedras, água,
// cercas e demais elementos visuais sólidos como obstáculos.
export const createMapCollisionWorld = ({ bounds, obstacles = [] }) => (
  new CollisionWorld(bounds).addObstacles(obstacles)
);

const distanceToSegment = (x, z, ax, az, bx, bz) => {
  const segmentX = bx - ax;
  const segmentZ = bz - az;
  const lengthSquared = segmentX * segmentX + segmentZ * segmentZ || 1;
  const amount = Math.max(0, Math.min(1, ((x - ax) * segmentX + (z - az) * segmentZ) / lengthSquared));
  return Math.hypot(x - (ax + segmentX * amount), z - (az + segmentZ * amount));
};

const pointInPolygon = (x, z, points) => {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const current = points[index];
    const last = points[previous];
    const crosses = ((current.z > z) !== (last.z > z))
      && (x < ((last.x - current.x) * (z - current.z)) / ((last.z - current.z) || Number.EPSILON) + current.x);
    if (crosses) inside = !inside;
  }
  return inside;
};

const artworkPointToWorld = ({ x, y }, bounds, artwork) => ({
  x: bounds.minX + (x / artwork.width) * (bounds.maxX - bounds.minX),
  z: bounds.minZ + (y / artwork.height) * (bounds.maxZ - bounds.minZ)
});

const artworkObstacleToWorld = (obstacle, bounds, artwork) => {
  if (obstacle.kind === "rect") {
    const start = artworkPointToWorld({ x: obstacle.left, y: obstacle.top }, bounds, artwork);
    const end = artworkPointToWorld({ x: obstacle.right, y: obstacle.bottom }, bounds, artwork);
    return {
      id: obstacle.id,
      type: obstacle.type,
      kind: "rect",
      minX: Math.min(start.x, end.x),
      maxX: Math.max(start.x, end.x),
      minZ: Math.min(start.z, end.z),
      maxZ: Math.max(start.z, end.z)
    };
  }
  if (obstacle.kind === "ellipse") {
    const center = artworkPointToWorld({ x: obstacle.x, y: obstacle.y }, bounds, artwork);
    return {
      id: obstacle.id,
      type: obstacle.type,
      kind: "ellipse",
      x: center.x,
      z: center.z,
      radiusX: (obstacle.radiusX / artwork.width) * (bounds.maxX - bounds.minX),
      radiusZ: (obstacle.radiusY / artwork.height) * (bounds.maxZ - bounds.minZ)
    };
  }
  if (obstacle.kind === "polygon") {
    return {
      id: obstacle.id,
      type: obstacle.type,
      kind: "polygon",
      points: obstacle.points.map(([x, y]) => {
        const point = artworkPointToWorld({ x, y }, bounds, artwork);
        return [point.x, point.z];
      })
    };
  }
  throw new TypeError(`Formato de obstáculo visual não suportado: ${obstacle.kind || "desconhecido"}.`);
};

// Padrão definitivo para mapas feitos sobre uma arte aprovada. Os obstáculos
// são marcados nas coordenadas da imagem-fonte e convertidos para o mundo,
// evitando que colisões antigas se desalinhem da composição exibida.
export const createArtworkCollisionWorld = ({ bounds, artwork, obstacles = [] }) => {
  if (!artwork?.width || !artwork?.height) {
    throw new TypeError("Dimensões da arte de colisão inválidas.");
  }
  return createMapCollisionWorld({
    bounds,
    obstacles: obstacles.map((obstacle) => artworkObstacleToWorld(obstacle, bounds, artwork))
  });
};
