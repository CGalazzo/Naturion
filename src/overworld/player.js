import { THREE } from "./engine.js";
import { DirectionalSpriteRig, createGroundShadow } from "./sprites.js";
import { depthOrderForZ } from "./depth.js";

const GROUND_HEIGHT = 0.24;
const damp = (current, target, smoothing, delta) => THREE.MathUtils.lerp(current, target, 1 - Math.exp(-smoothing * delta));

export class OverworldPlayer {
  constructor({ scene, collision, input, characterImage, startPosition }) {
    this.collision = collision;
    this.input = input;
    this.radius = 0.56;
    this.walkSpeed = 5.15;
    this.runSpeed = 7.25;
    this.acceleration = 13;
    this.velocity = new THREE.Vector3();
    this.desiredVelocity = new THREE.Vector3();
    this.state = "idle";
    this.lastSafe = new THREE.Vector3(startPosition.x, GROUND_HEIGHT, startPosition.z);
    this.group = new THREE.Group();
    this.group.name = "OverworldPlayer";
    this.group.position.copy(this.lastSafe);
    this.rig = new DirectionalSpriteRig({ characterImage });
    this.group.add(this.rig.root);
    const shadow = createGroundShadow({ width: 1.45, depth: .58, opacity: .36 });
    shadow.mesh.position.y = -0.055;
    this.shadow = shadow.mesh;
    this.shadowMaterial = shadow.material;
    this.group.add(this.shadow);
    scene.add(this.group);
  }

  canOccupy(x, z) {
    return !this.collision.collides(x, z, this.radius);
  }

  update(delta, elapsed) {
    const movement = this.input.getMovement();
    const hasInput = Math.abs(movement.x) + Math.abs(movement.z) > 0.01;
    const speed = movement.running ? this.runSpeed : this.walkSpeed;
    this.desiredVelocity.set(movement.x * speed, 0, movement.z * speed);
    this.velocity.x = damp(this.velocity.x, this.desiredVelocity.x, this.acceleration, delta);
    this.velocity.z = damp(this.velocity.z, this.desiredVelocity.z, this.acceleration, delta);
    if (!hasInput) {
      this.velocity.x = damp(this.velocity.x, 0, 16, delta);
      this.velocity.z = damp(this.velocity.z, 0, 16, delta);
    }

    const position = this.group.position;
    const candidateX = position.x + this.velocity.x * delta;
    const candidateZ = position.z + this.velocity.z * delta;
    let moved = false;
    if (this.canOccupy(candidateX, position.z)) {
      position.x = candidateX;
      moved = true;
    } else {
      this.velocity.x *= .24;
    }
    if (this.canOccupy(position.x, candidateZ)) {
      position.z = candidateZ;
      moved = true;
    } else {
      this.velocity.z *= .24;
    }

    if (this.collision.collides(position.x, position.z, this.radius)) {
      position.copy(this.lastSafe);
      this.velocity.set(0, 0, 0);
    } else {
      position.y = GROUND_HEIGHT;
      this.lastSafe.copy(position);
    }

    const planarSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.state = planarSpeed < .18 ? "idle" : movement.running && planarSpeed > this.walkSpeed * .82 ? "running" : "walking";
    this.rig.update({ state: this.state, velocity: this.velocity, elapsed, worldZ: position.z });
    this.shadow.renderOrder = depthOrderForZ(position.z, 4);
    const shadowPulse = this.state === "running" ? .94 + Math.abs(Math.sin(elapsed * 11)) * .08 : 1;
    this.shadow.scale.set(shadowPulse, shadowPulse, 1);
    return { moved, velocity: this.velocity, state: this.state };
  }

  teleport(position) {
    this.group.position.set(position.x, GROUND_HEIGHT, position.z);
    this.lastSafe.copy(this.group.position);
    this.velocity.set(0, 0, 0);
  }

  dispose() {
    this.rig.dispose();
    this.shadow.geometry.dispose();
    this.shadowMaterial.dispose();
    this.group.removeFromParent();
  }
}
