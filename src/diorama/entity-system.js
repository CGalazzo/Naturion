import { THREE } from "./engine.js";
import { createPixelShadowTexture } from "./art/environment-factory.js";

export class EntitySystem {
  constructor({ scene, stage, forms, onEncounter }) {
    this.scene = scene;
    this.stage = stage;
    this.forms = forms || {};
    this.onEncounter = onEncounter;
    this.entities = [];
    this.nearest = null;
    this.loader = new THREE.TextureLoader();
    this.shadowTexture = createPixelShadowTexture();
  }

  createSpriteEntity(definition) {
    const form = this.forms[definition.formId];
    if (!form) return null;
    const texture = this.loader.load(form.image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.06, depthWrite: true });
    const sprite = new THREE.Sprite(material);
    sprite.center.set(0.5, definition.flying ? 0.42 : 0.055);
    const scale = definition.scale || (form.stage === 1 ? 2.75 : 3.35);
    sprite.scale.set(scale, scale, 1);
    const groundY = this.stage.getHeightAt(definition.position.x, definition.position.z);
    const y = groundY + (definition.flying ? definition.altitude || 3.2 : 0.035);
    sprite.position.set(definition.position.x, y, definition.position.z);
    sprite.name = form.name;
    sprite.renderOrder = 3;
    this.scene.add(sprite);

    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: this.shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: definition.flying ? 0.22 : 0.34
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(scale * 0.82, scale * 0.38), shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(definition.position.x, groundY + 0.028, definition.position.z);
    this.scene.add(shadow);

    const entity = {
      ...definition,
      form,
      texture,
      material,
      object: sprite,
      shadow,
      shadowMaterial,
      baseScale: scale,
      origin: new THREE.Vector3(definition.position.x, y, definition.position.z),
      direction: new THREE.Vector3(1, 0, 0),
      patrolIndex: 0,
      elapsed: Math.random() * 5,
      defeated: false
    };
    this.entities.push(entity);
    return entity;
  }

  spawn(definitions) {
    definitions.forEach((definition) => this.createSpriteEntity(definition));
  }

  update(delta, elapsed, playerPosition) {
    let nearest = null;
    let nearestDistance = Infinity;
    this.entities.forEach((entity) => {
      if (entity.defeated || !entity.object.visible) return;
      entity.elapsed += delta;
      if (entity.behavior === "wander") this.updateWander(entity, delta);
      if (entity.behavior === "patrol") this.updatePatrol(entity, delta);
      const groundY = this.stage.getHeightAt(entity.object.position.x, entity.object.position.z);

      if (entity.flying) {
        const flap = Math.sin(entity.elapsed * 8.2);
        entity.object.position.y = groundY + (entity.altitude || 3.2) + Math.sin(entity.elapsed * 2.2) * 0.28;
        entity.object.material.rotation = Math.sin(entity.elapsed * 4.6) * 0.028;
        entity.object.scale.y = entity.baseScale * (1 + Math.abs(flap) * 0.035);
        entity.object.scale.x = Math.abs(entity.baseScale * (1 - Math.abs(flap) * 0.02)) * (entity.direction.x >= 0 ? 1 : -1);
        entity.shadow.position.set(entity.object.position.x, groundY + 0.025, entity.object.position.z);
        const altitudeFade = Math.max(0.52, 1 - (entity.altitude || 3.2) * 0.07);
        entity.shadow.scale.setScalar(altitudeFade + Math.sin(entity.elapsed * 2.2) * 0.025);
      } else {
        const moving = entity.behavior === "wander" || entity.behavior === "patrol";
        const gait = Math.sin(entity.elapsed * (moving ? 7 : 2));
        entity.object.position.y = groundY + Math.abs(gait) * (moving ? 0.065 : 0.025) + 0.035;
        entity.object.material.rotation = moving ? gait * 0.032 : Math.sin(entity.elapsed * 1.5) * 0.012;
        entity.object.scale.y = entity.baseScale * (1 + Math.abs(gait) * 0.018);
        entity.object.scale.x = Math.abs(entity.baseScale * (1 - Math.abs(gait) * 0.01)) * (entity.direction.x >= 0 ? 1 : -1);
        entity.shadow.position.set(entity.object.position.x, groundY + 0.025, entity.object.position.z);
        entity.shadow.scale.setScalar(0.96 + Math.abs(gait) * 0.045);
      }

      const horizontalDistance = Math.hypot(playerPosition.x - entity.object.position.x, playerPosition.z - entity.object.position.z);
      if (horizontalDistance < nearestDistance) {
        nearestDistance = horizontalDistance;
        nearest = entity;
      }
    });
    this.nearest = nearest && nearestDistance <= 2.4 ? nearest : null;
    return this.nearest;
  }

  updateWander(entity, delta) {
    const radius = entity.radius || 3.5;
    if (!entity.wanderTarget || entity.object.position.distanceToSquared(entity.wanderTarget) < 0.35) {
      const angle = Math.random() * Math.PI * 2;
      const distance = radius * (0.35 + Math.random() * 0.65);
      entity.wanderTarget = entity.origin.clone().add(new THREE.Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance));
    }
    const direction = entity.wanderTarget.clone().sub(entity.object.position);
    direction.y = 0;
    if (direction.lengthSq() > 0.04) {
      direction.normalize();
      const speed = entity.speed || 0.85;
      const nextX = entity.object.position.x + direction.x * speed * delta;
      const nextZ = entity.object.position.z + direction.z * speed * delta;
      if (this.stage.isWalkable(nextX, nextZ, 0.45) && !this.stage.collides(nextX, nextZ, 0.45)) {
        entity.object.position.x = nextX;
        entity.object.position.z = nextZ;
        entity.direction.copy(direction);
      } else {
        entity.wanderTarget = null;
      }
    }
  }

  updatePatrol(entity, delta) {
    if (!entity.path?.length) return;
    const point = entity.path[entity.patrolIndex];
    const target = new THREE.Vector3(point.x, entity.object.position.y, point.z);
    const direction = target.sub(entity.object.position);
    direction.y = 0;
    if (direction.length() < 0.3) {
      entity.patrolIndex = (entity.patrolIndex + 1) % entity.path.length;
      return;
    }
    direction.normalize();
    const nextX = entity.object.position.x + direction.x * (entity.speed || 1.2) * delta;
    const nextZ = entity.object.position.z + direction.z * (entity.speed || 1.2) * delta;
    if (entity.flying || (this.stage.isWalkable(nextX, nextZ, 0.35) && !this.stage.collides(nextX, nextZ, 0.35))) {
      entity.object.position.x = nextX;
      entity.object.position.z = nextZ;
      entity.direction.copy(direction);
      entity.origin.x = entity.object.position.x;
      entity.origin.z = entity.object.position.z;
    } else {
      entity.patrolIndex = (entity.patrolIndex + 1) % entity.path.length;
    }
  }

  async interact() {
    if (!this.nearest) return false;
    const entity = this.nearest;
    const result = await this.onEncounter?.(entity);
    if (result?.outcome === "victory") {
      entity.defeated = true;
      entity.object.visible = false;
      entity.shadow.visible = false;
    }
    return true;
  }

  getInteraction() {
    if (!this.nearest) return null;
    return {
      id: this.nearest.id,
      type: "naturion",
      label: `E · Batalhar com ${this.nearest.form.name}`,
      entity: this.nearest
    };
  }

  dispose() {
    this.entities.forEach((entity) => {
      entity.texture.dispose();
      entity.material.dispose();
      entity.shadow.geometry.dispose();
      entity.shadowMaterial.dispose();
      entity.object.removeFromParent();
      entity.shadow.removeFromParent();
    });
    this.shadowTexture.dispose();
    this.entities.length = 0;
  }
}
