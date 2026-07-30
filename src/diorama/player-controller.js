import { THREE } from "./engine.js";
import { VoxelCharacterRig } from "./art/character-factory.js";

const damp = (current, target, smoothing, delta) => THREE.MathUtils.lerp(current, target, 1 - Math.exp(-smoothing * delta));

export class PlayerController {
  constructor({ scene, stage, input, characterImage, startPosition }) {
    this.stage = stage;
    this.input = input;
    this.radius = 0.56;
    this.walkSpeed = 5.15;
    this.runSpeed = 7.25;
    this.acceleration = 13;
    this.velocity = new THREE.Vector3();
    this.desiredVelocity = new THREE.Vector3();
    this.state = "idle";
    this.lastSafe = new THREE.Vector3(startPosition.x, stage.getHeightAt(startPosition.x, startPosition.z), startPosition.z);
    this.group = new THREE.Group();
    this.group.name = "DioramaPlayer";
    this.group.position.copy(this.lastSafe);

    this.rig = new VoxelCharacterRig({ characterImage });
    this.group.add(this.rig.root);
    scene.add(this.group);
  }

  canOccupy(x, z) {
    return this.stage.isWalkable(x, z, this.radius) && !this.stage.collides(x, z, this.radius);
  }

  update(delta, elapsed) {
    const movement = this.input.getMovement();
    const hasInput = Math.abs(movement.x) + Math.abs(movement.z) > 0.01;
    const speed = movement.running ? this.runSpeed : this.walkSpeed;
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
    this.rig.update({ state: this.state, velocity: this.velocity, elapsed });
    return { moved, velocity: this.velocity, state: this.state };
  }

  teleport(position) {
    const height = this.stage.getHeightAt(position.x, position.z);
    this.group.position.set(position.x, height, position.z);
    this.lastSafe.copy(this.group.position);
    this.velocity.set(0, 0, 0);
  }

  dispose() {
    this.rig.dispose();
    this.group.removeFromParent();
  }
}
