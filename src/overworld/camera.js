import { THREE } from "./engine.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const FALLBACK_VERTICAL_VIEW = 23.5;

export class OverworldCamera {
  constructor({ engine, map }) {
    this.engine = engine;
    this.map = map;
    this.camera = new THREE.OrthographicCamera(-16, 16, 9, -9, 0.1, 160);
    const fixedDiorama = map.cameraMode === "fixed-diorama";
    this.target = new THREE.Vector3(
      fixedDiorama ? 0 : map.startPosition.x,
      0.2,
      fixedDiorama ? 0 : map.startPosition.z
    );
    this.renderTarget = this.target.clone();
    this.lookAhead = new THREE.Vector3();
    this.desired = new THREE.Vector3();
    this.playerObject = null;
    this.focus = null;
    this.zoom = 1;
    this.lastProjectionZoom = NaN;
    this.lastProjectionAspect = NaN;
    this.offset = new THREE.Vector3(0, 29.5, 22.5);
    engine.camera = this.camera;
    engine.onResize = () => this.updateProjection(true);
    this.updateProjection(true);
    this.applyTransform();
  }

  setPlayerObject(object) {
    this.playerObject = object;
    if (!object || this.map.cameraMode === "fixed-diorama") return;
    this.target.set(object.position.x, 0.2, object.position.z);
    this.snapRenderTarget();
    this.applyTransform();
  }

  focusOn(point, { duration = 0.7, zoom = 1.08 } = {}) {
    const fixedDiorama = this.map.cameraMode === "fixed-diorama";
    this.focus = {
      start: this.target.clone(),
      point: fixedDiorama
        ? new THREE.Vector3(0, 0.2, 0)
        : new THREE.Vector3(point.x, 0.2, point.z),
      elapsed: 0,
      duration,
      startZoom: this.zoom,
      zoom,
      returning: false
    };
  }

  returnToPlayer({ duration = 0.65 } = {}) {
    if (!this.playerObject) return;
    const fixedDiorama = this.map.cameraMode === "fixed-diorama";
    this.focus = {
      start: this.target.clone(),
      point: fixedDiorama
        ? new THREE.Vector3(0, 0.2, 0)
        : new THREE.Vector3(this.playerObject.position.x, 0.2, this.playerObject.position.z),
      elapsed: 0,
      duration,
      startZoom: this.zoom,
      zoom: 1,
      returning: true
    };
  }

  update(delta, velocity = this.lookAhead) {
    if (!this.playerObject) return;

    if (this.focus) {
      this.focus.elapsed += delta;
      const progress = clamp(this.focus.elapsed / this.focus.duration, 0, 1);
      const eased = progress * progress * (3 - 2 * progress);
      this.target.lerpVectors(this.focus.start, this.focus.point, eased);
      this.zoom = THREE.MathUtils.lerp(this.focus.startZoom, this.focus.zoom, eased);
      if (progress >= 1 && this.focus.returning) this.focus = null;
    } else if (this.map.cameraMode === "fixed-diorama") {
      this.target.lerp(new THREE.Vector3(0, 0.2, 0), 1 - Math.exp(-delta * 7.2));
      this.zoom = THREE.MathUtils.lerp(this.zoom, 1, 1 - Math.exp(-delta * 4));
    } else {
      this.lookAhead.set(velocity.x, 0, velocity.z).multiplyScalar(0.23);
      this.desired.set(
        this.playerObject.position.x,
        0.2,
        this.playerObject.position.z
      ).add(this.lookAhead);
      this.desired.x = clamp(this.desired.x, this.map.cameraBounds.minX, this.map.cameraBounds.maxX);
      this.desired.z = clamp(this.desired.z, this.map.cameraBounds.minZ, this.map.cameraBounds.maxZ);
      this.target.lerp(this.desired, 1 - Math.exp(-delta * 7.2));
      this.zoom = THREE.MathUtils.lerp(this.zoom, 1, 1 - Math.exp(-delta * 4));
    }

    this.updateProjection(false);
    this.snapRenderTarget();
    this.applyTransform();
  }

  getPixelWorldUnit() {
    const height = Math.max(1, this.engine.renderResolution?.height || this.engine.container.clientHeight || 1);
    return (this.getBaseVerticalView() / this.zoom) / height;
  }

  getBaseVerticalView() {
    const resolution = this.engine.renderResolution;
    const width = Math.max(1, resolution?.width || this.engine.container.clientWidth);
    const height = Math.max(1, resolution?.height || this.engine.container.clientHeight);
    const aspect = width / height;
    const visual = this.map.visualProjection;
    if (!visual?.width || !visual?.height) return FALLBACK_VERTICAL_VIEW;
    return Math.min(visual.height, visual.width / aspect);
  }

  snapRenderTarget() {
    const pixel = this.getPixelWorldUnit();
    this.renderTarget.set(
      Math.round(this.target.x / pixel) * pixel,
      0.2,
      Math.round(this.target.z / pixel) * pixel
    );
  }

  updateProjection(force = false) {
    const resolution = this.engine.renderResolution;
    const width = Math.max(1, resolution?.width || this.engine.container.clientWidth);
    const height = Math.max(1, resolution?.height || this.engine.container.clientHeight);
    const aspect = width / height;
    if (
      !force
      && Math.abs(this.lastProjectionZoom - this.zoom) < 0.0005
      && Math.abs(this.lastProjectionAspect - aspect) < 0.0005
    ) return;

    const vertical = this.getBaseVerticalView() / this.zoom;
    this.camera.left = -vertical * aspect * 0.5;
    this.camera.right = vertical * aspect * 0.5;
    this.camera.top = vertical * 0.5;
    this.camera.bottom = -vertical * 0.5;
    this.camera.updateProjectionMatrix();
    this.lastProjectionZoom = this.zoom;
    this.lastProjectionAspect = aspect;
  }

  applyTransform() {
    this.camera.position.copy(this.renderTarget).add(this.offset);
    this.camera.lookAt(this.renderTarget);
  }
}
