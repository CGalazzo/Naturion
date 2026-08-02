import { THREE } from "./engine.js";
import { createGroundShadow, createNpcSprite } from "./sprites.js";
import { createSpriteMaterial } from "./textures.js";
import { depthOrderForZ } from "./depth.js";

const hashText = (value) => [...String(value)].reduce((total, character) => total + character.charCodeAt(0), 0);

export class OverworldEntities {
  constructor({ scene, collision, forms, onEncounter, onDialogue }) {
    this.scene = scene;
    this.collision = collision;
    this.forms = forms || {};
    this.onEncounter = onEncounter;
    this.onDialogue = onDialogue;
    this.naturions = [];
    this.npcs = [];
    this.nearest = null;
    this.touchTarget = null;
    this.encounterLocked = false;
    this.loader = new THREE.TextureLoader();
    this.textureCache = new Map();
    this.scratchDirection = new THREE.Vector3();
  }

  getNaturionTexture(url) {
    if (this.textureCache.has(url)) return this.textureCache.get(url);
    const texture = this.loader.load(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.anisotropy = 1;
    texture.needsUpdate = true;
    this.textureCache.set(url, texture);
    return texture;
  }

  spawn({ naturions = [], npcs = [] }) {
    naturions.forEach((definition) => this.createNaturion(definition));
    npcs.forEach((definition) => this.createNpc(definition));
  }

  createNaturion(definition) {
    const form = this.forms[definition.formId];
    if (!form) return null;
    const texture = this.getNaturionTexture(form.image);

    const root = new THREE.Group();
    root.name = `OverworldNaturion-${form.name}`;
    root.position.set(definition.position.x, definition.flying ? definition.altitude || 3.2 : .04, definition.position.z);
    const visual = new THREE.Group();
    root.add(visual);

    const outlineMaterial = createSpriteMaterial(texture, { depthWrite: false, color: 0x17332d });
    const outline = new THREE.Sprite(outlineMaterial);
    outline.center.set(.5, definition.flying ? .42 : .055);
    outline.scale.set(1.075, 1.075, 1);
    outline.position.z = -.025;
    outline.frustumCulled = true;
    visual.add(outline);

    const material = createSpriteMaterial(texture, { depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.center.set(.5, definition.flying ? .42 : .055);
    sprite.frustumCulled = true;
    visual.add(sprite);

    const scale = definition.scale || 2.7;
    visual.scale.set(scale, scale, 1);
    const shadow = createGroundShadow({ width: scale * .76, depth: scale * .32, opacity: definition.flying ? .2 : .34 });
    shadow.mesh.position.set(definition.position.x, .025, definition.position.z);
    this.scene.add(root, shadow.mesh);

    const entity = {
      ...definition,
      kind: "naturion",
      form,
      root,
      visual,
      sprite,
      material,
      outline,
      outlineMaterial,
      shadow: shadow.mesh,
      shadowMaterial: shadow.material,
      origin: new THREE.Vector3(definition.position.x, root.position.y, definition.position.z),
      direction: new THREE.Vector3(1, 0, 0),
      patrolIndex: 0,
      phase: hashText(definition.id) * .13,
      defeated: false,
      touchCooldown: 0
    };
    this.naturions.push(entity);
    return entity;
  }

  createNpc(definition) {
    const root = new THREE.Group();
    root.name = `OverworldNpc-${definition.id}`;
    root.position.set(definition.position.x, .04, definition.position.z);
    let visual;
    if (definition.image) {
      const texture = this.getNaturionTexture(definition.image);
      const material = createSpriteMaterial(texture, { depthWrite: false });
      const sprite = new THREE.Sprite(material);
      const height = definition.scale || 3.7;
      sprite.name = `OverworldNpcSprite-${definition.id}`;
      sprite.center.set(.5, .035);
      sprite.scale.set(height * (definition.aspect || .521), height, 1);
      sprite.frustumCulled = true;
      sprite.userData.updateFrame = (_elapsed, worldZ = 0) => {
        sprite.renderOrder = depthOrderForZ(worldZ, 18);
      };
      visual = { sprite, material, texture, cachedTexture: true };
    } else {
      visual = createNpcSprite(definition.role || "story");
    }
    root.add(visual.sprite);
    const shadow = createGroundShadow({ width: 1.35, depth: .52, opacity: .32 });
    shadow.mesh.position.y = .025;
    root.add(shadow.mesh);
    this.scene.add(root);
    const npc = {
      ...definition,
      kind: "npc",
      root,
      sprite: visual.sprite,
      material: visual.material,
      texture: visual.texture,
      shadow: shadow.mesh,
      shadowMaterial: shadow.material,
      cachedTexture: Boolean(visual.cachedTexture),
      phase: hashText(definition.id) * .17
    };
    this.npcs.push(npc);
    return npc;
  }

  update(delta, elapsed, playerPosition) {
    let nearest = null;
    let nearestDistance = Infinity;
    this.touchTarget = null;

    this.naturions.forEach((entity) => {
      if (entity.defeated || !entity.root.visible) return;
      entity.touchCooldown = Math.max(0, entity.touchCooldown - delta);
      if (entity.behavior === "patrol") this.updatePatrol(entity, delta);
      else if (entity.behavior !== "idle") this.updateWander(entity, delta, elapsed);

      if (entity.flying) {
        const bob = Math.round(Math.sin(elapsed * 2.4 + entity.phase) * 8) / 32;
        const flap = Math.sin(elapsed * 8 + entity.phase);
        entity.root.position.y = (entity.altitude || 3.2) + bob;
        entity.visual.scale.set(
          (entity.direction.x < 0 ? -1 : 1) * entity.scale * (1 - Math.abs(flap) * .018),
          entity.scale * (1 + Math.abs(flap) * .032),
          1
        );
        entity.shadow.scale.setScalar(.76 + bob * .05);
      } else {
        const gait = Math.sin(elapsed * 7 + entity.phase);
        entity.root.position.y = .04 + Math.round(Math.abs(gait) * 4) / 64;
        entity.visual.scale.set((entity.direction.x < 0 ? -1 : 1) * entity.scale, entity.scale * (1 + Math.abs(gait) * .016), 1);
      }

      entity.shadow.position.set(entity.root.position.x, .025, entity.root.position.z);
      entity.outline.renderOrder = depthOrderForZ(entity.root.position.z, 16);
      entity.sprite.renderOrder = depthOrderForZ(entity.root.position.z, 18);

      const distance = Math.hypot(playerPosition.x - entity.root.position.x, playerPosition.z - entity.root.position.z);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = entity;
      }
      if (distance <= 1.05 && entity.touchCooldown <= 0) this.touchTarget = entity;
    });

    this.npcs.forEach((npc) => {
      npc.sprite.position.y = npc.steady
        ? 0
        : Math.round(Math.sin(elapsed * 2 + npc.phase) * 2) / 64;
      npc.sprite.userData.updateFrame?.(elapsed, npc.root.position.z);
      const distance = Math.hypot(playerPosition.x - npc.root.position.x, playerPosition.z - npc.root.position.z);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = npc;
      }
    });

    this.nearest = nearest && nearestDistance <= 2.35 ? nearest : null;
    return this.nearest;
  }

  updateWander(entity, delta, elapsed) {
    const radius = entity.radius || 3.4;
    const targetAngle = elapsed * .24 + entity.phase;
    const distance = radius * (.58 + .24 * Math.sin(elapsed * .37 + entity.phase));
    const targetX = entity.origin.x + Math.cos(targetAngle) * distance;
    const targetZ = entity.origin.z + Math.sin(targetAngle * .83) * distance;
    const direction = this.scratchDirection.set(
      targetX - entity.root.position.x,
      0,
      targetZ - entity.root.position.z
    );
    if (direction.lengthSq() < .08) return;
    direction.normalize();
    const speed = entity.speed || .85;
    const nextX = entity.root.position.x + direction.x * speed * delta;
    const nextZ = entity.root.position.z + direction.z * speed * delta;
    if (!this.collision.collides(nextX, nextZ, .44)) {
      entity.root.position.x = nextX;
      entity.root.position.z = nextZ;
      entity.direction.copy(direction);
    } else {
      entity.phase += .9;
    }
  }

  updatePatrol(entity, delta) {
    if (!entity.path?.length) return;
    const point = entity.path[entity.patrolIndex];
    const direction = this.scratchDirection.set(
      point.x - entity.root.position.x,
      0,
      point.z - entity.root.position.z
    );
    if (direction.lengthSq() < .0784) {
      entity.patrolIndex = (entity.patrolIndex + 1) % entity.path.length;
      return;
    }
    direction.normalize();
    const nextX = entity.root.position.x + direction.x * (entity.speed || 1.2) * delta;
    const nextZ = entity.root.position.z + direction.z * (entity.speed || 1.2) * delta;
    if (entity.flying || !this.collision.collides(nextX, nextZ, .4)) {
      entity.root.position.x = nextX;
      entity.root.position.z = nextZ;
      entity.direction.copy(direction);
    } else {
      entity.patrolIndex = (entity.patrolIndex + 1) % entity.path.length;
    }
  }

  async startEncounter(entity) {
    if (!entity || entity.defeated || this.encounterLocked) return false;
    this.encounterLocked = true;
    entity.touchCooldown = 2.2;
    try {
      const result = await this.onEncounter?.(entity);
      if (result?.outcome === "victory") {
        entity.defeated = true;
        entity.root.visible = false;
        entity.shadow.visible = false;
      }
      return result;
    } finally {
      this.encounterLocked = false;
    }
  }

  async interact() {
    if (!this.nearest) return false;
    if (this.nearest.kind === "naturion") return this.startEncounter(this.nearest);
    this.onDialogue?.(this.nearest);
    return true;
  }

  async consumeTouchEncounter() {
    const target = this.touchTarget;
    this.touchTarget = null;
    return target ? this.startEncounter(target) : false;
  }

  getInteraction() {
    if (!this.nearest) return null;
    if (this.nearest.kind === "naturion") return { id: this.nearest.id, type: "naturion", label: `E · Batalhar com ${this.nearest.form.name}`, entity: this.nearest };
    return { id: this.nearest.id, type: "npc", label: `E · Falar com ${this.nearest.name}`, entity: this.nearest };
  }

  dispose() {
    this.naturions.forEach((entity) => {
      entity.material.dispose();
      entity.outlineMaterial.dispose();
      entity.shadow.geometry.dispose();
      entity.shadowMaterial.dispose();
      entity.root.removeFromParent();
      entity.shadow.removeFromParent();
    });
    this.npcs.forEach((npc) => {
      if (!npc.cachedTexture) npc.texture?.dispose?.();
      npc.material.dispose();
      npc.shadow.geometry.dispose();
      npc.shadowMaterial.dispose();
      npc.root.removeFromParent();
    });
    this.textureCache.forEach((texture) => texture.dispose());
    this.textureCache.clear();
    this.naturions.length = 0;
    this.npcs.length = 0;
  }
}
