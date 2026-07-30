import { THREE } from "./engine.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class OverworldCamera {
  constructor({ engine, map }) {
    this.engine = engine;
    this.map = map;
    this.camera = new THREE.OrthographicCamera(-16, 16, 9, -9, 0.1, 120);
    this.target = new THREE.Vector3(map.startPosition.x, 0, map.startPosition.z);
    this.renderTarget = this.target.clone();
    this.lookAhead = new THREE.Vector3();
    this.playerObject = null;
    this.focus = null;
    this.zoom = 1;
    this.offset = new THREE.Vector3(0, 25.5, 17.5);
    engine.camera = this.camera;
    engine.onResize = () => this.updateProjection();
    this.updateProjection();
    this.applyTransform();
  }

  setPlayerObject(object) {
    this.playerObject = object;
    if (object) {
      this.target.set(object.position.x, 0.7, object.position.z);
      this.renderTarget.copy(this.target);
      this.applyTransform();
    }
  }

  focusOn(point, { duration = 0.7, zoom = 1.08 } = {}) {
    this.focus = {
      start: this.target.clone(),
      point: new THREE.Vector3(point.x, point.y ?? 0.7, point.z),
      elapsed: 0,
      duration,
      startZoom: this.zoom,
      zoom,
      returning: false
    };
  }

  returnToPlayer({ duration = 0.65 } = {}) {
    if (!this.playerObject) return;
    this.focus = {
      start: this.target.clone(),
      point: new THREE.Vector3(this.playerObject.position.x, 0.7, this.playerObject.position.z),
      elapsed: 0,
      duration,
      startZoom: this.zoom,
      zoom: 1,
      returning: true
    };
  }

  update(delta, velocity = new THREE.Vector3()) {
    if (!this.playerObject) return;
    if (this.focus) {
      this.focus.elapsed += delta;
      const progress = clamp(this.focus.elapsed / this.focus.duration, 0, 1);
      const eased = progress * progress * (3 - 2 * progress);
      this.target.lerpVectors(this.focus.start, this.focus.point, eased);
      this.zoom = THREE.MathUtils.lerp(this.focus.startZoom, this.focus.zoom, eased);
      if (progress >= 1 && this.focus.returning) this.focus = null;
    } else {
      this.lookAhead.set(velocity.x, 0, velocity.z).multiplyScalar(0.38);
      const desired = new THREE.Vector3(
        this.playerObject.position.x,
        0.7,
        this.playerObject.position.z
      ).add(this.lookAhead);
      desired.x = clamp(desired.x, this.map.cameraBounds.minX, this.map.cameraBounds.maxX);
      desired.z = clamp(desired.z, this.map.cameraBounds.minZ, this.map.cameraBounds.maxZ);
      this.target.lerp(desired, 1 - Math.exp(-delta * 6.2));
      this.zoom = THREE.MathUtils.lerp(this.zoom, 1, 1 - Math.exp(-delta * 4));
    }
    this.renderTarget.set(
      Math.round(this.target.x * 64) / 64,
      Math.round(this.target.y * 64) / 64,
      Math.round(this.target.z * 64) / 64
    );
    this.updateProjection();
    this.applyTransform();
  }

  updateProjection() {
    const width = Math.max(1, this.engine.container.clientWidth);
    const height = Math.max(1, this.engine.container.clientHeight);
    const aspect = width / height;
    const vertical = 19.6 / this.zoom;
    this.camera.left = -vertical * aspect * 0.5;
    this.camera.right = vertical * aspect * 0.5;
    this.camera.top = vertical * 0.5;
    this.camera.bottom = -vertical * 0.5;
    this.camera.updateProjectionMatrix();
  }

  applyTransform() {
    this.camera.position.copy(this.renderTarget).add(this.offset.clone().multiplyScalar(1 / this.zoom));
    this.camera.lookAt(this.renderTarget);
    if (this.engine.sun) {
      this.engine.sun.position.set(this.renderTarget.x - 24, 36, this.renderTarget.z + 20);
      this.engine.sun.target.position.copy(this.renderTarget);
      this.engine.scene.add(this.engine.sun.target);
    }
  }
}
