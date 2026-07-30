import { THREE } from "./engine.js";

const damp = (current, target, smoothing, delta) => THREE.MathUtils.lerp(current, target, 1 - Math.exp(-smoothing * delta));

export class PlayerController {
  constructor({ scene, stage, input, characterImage, startPosition }) {
    this.stage = stage;
    this.input = input;
    this.radius = 0.62;
    this.walkSpeed = 5.15;
    this.runSpeed = 7.25;
    this.acceleration = 13;
    this.velocity = new THREE.Vector3();
    this.desiredVelocity = new THREE.Vector3();
    this.state = "idle";
    this.facing = 1;
    this.lastSafe = new THREE.Vector3(startPosition.x, stage.getHeightAt(startPosition.x, startPosition.z), startPosition.z);
    this.group = new THREE.Group();
    this.group.name = "DioramaPlayer";
    this.group.position.copy(this.lastSafe);

    const loader = new THREE.TextureLoader();
    this.texture = loader.load(characterImage);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.material = new THREE.SpriteMaterial({ map: this.texture, transparent: true, alphaTest: 0.08, depthWrite: true });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.center.set(0.5, 0.04);
    this.sprite.scale.set(3.15, 5.2, 1);
    this.sprite.position.y = 0.05;
    this.group.add(this.sprite);

    const shadowTexture = this.createShadowTexture();
    const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.48 });
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 1.12), shadowMaterial);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.025;
    this.group.add(this.shadow);
    scene.add(this.group);
  }

  createShadowTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 32;
    const context = canvas.getContext("2d");
    const gradient = context.createRadialGradient(32, 16, 3, 32, 16, 29);
    gradient.addColorStop(0, "rgba(0,0,0,.8)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 32);
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  canOccupy(x, z) {
    return this.stage.isWalkable(x, z, this.radius) && !this.stage.collides(x, z, this.radius);
  }

  update(delta, elapsed) {
    const movement = this.input.getMovement();
    const hasInput = Math.abs(movement.x) + Math.abs(movement.z) > 0.01;
    const speed = movement.running ? this.runSpeed : this.walkSpeed;
    /* Converte os eixos da tela para os eixos do mundo isométrico. */
    const worldX = (movement.x + movement.z) * Math.SQRT1_2;
    const worldZ = (movement.z - movement.x) * Math.SQRT1_2;
    this.desiredVelocity.set(worldX * speed, 0, worldZ * speed);
    this.velocity.x = damp(this.velocity.x, this.desiredVelocity.x, this.acceleration, delta);
    this.velocity.z = damp(this.velocity.z, this.desiredVelocity.z, this.acceleration, delta);
    if (!hasInput) {
      this.velocity.x = damp(this.velocity.x, 0, 16, delta);
      this.velocity.z = damp(this.velocity.z, 0, 16, delta);
    }

    const current = this.group.position;
    const candidateX = current.x + this.velocity.x * delta;
    const candidateZ = current.z + this.velocity.z * delta;
    let moved = false;

    if (this.canOccupy(candidateX, current.z)) {
      current.x = candidateX;
      moved = true;
    } else {
      this.velocity.x *= 0.24;
    }
    if (this.canOccupy(current.x, candidateZ)) {
      current.z = candidateZ;
      moved = true;
    } else {
      this.velocity.z *= 0.24;
    }

    if (!this.stage.isWalkable(current.x, current.z, this.radius)) {
      current.copy(this.lastSafe);
      this.velocity.set(0, 0, 0);
    } else {
      const targetHeight = this.stage.getHeightAt(current.x, current.z);
      current.y = damp(current.y, targetHeight, 18, delta);
      this.lastSafe.copy(current);
    }

    const planarSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.state = planarSpeed < 0.18 ? "idle" : movement.running && planarSpeed > this.walkSpeed * 0.82 ? "running" : "walking";
    if (Math.abs(movement.x) > 0.05) this.facing = movement.x >= 0 ? 1 : -1;
    this.sprite.scale.x = Math.abs(this.sprite.scale.x) * this.facing;

    const stride = this.state === "running" ? 12.5 : 8.2;
    const amplitude = this.state === "running" ? 0.14 : this.state === "walking" ? 0.085 : 0.018;
    const phase = elapsed * stride;
    this.sprite.position.y = 0.05 + Math.abs(Math.sin(phase)) * amplitude;
    const directionalLean = movement.x * (this.state === "running" ? 0.024 : 0.014);
    this.sprite.material.rotation = this.state === "idle"
      ? Math.sin(elapsed * 1.8) * 0.008
      : Math.sin(phase) * (this.state === "running" ? 0.045 : 0.028) + directionalLean;
    this.shadow.scale.setScalar(this.state === "running" ? 0.9 + Math.abs(Math.sin(phase)) * 0.08 : 1);
    return { moved, velocity: this.velocity, state: this.state };
  }

  teleport(position) {
    const height = this.stage.getHeightAt(position.x, position.z);
    this.group.position.set(position.x, height, position.z);
    this.lastSafe.copy(this.group.position);
    this.velocity.set(0, 0, 0);
  }

  dispose() {
    this.texture.dispose();
    this.material.dispose();
    this.group.removeFromParent();
  }
}
