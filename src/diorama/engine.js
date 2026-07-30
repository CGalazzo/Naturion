import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class DioramaEngine {
  constructor({ container, stage }) {
    if (!container) throw new Error("Contêiner do diorama não encontrado.");
    this.container = container;
    this.stage = stage;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(stage.palette.sky);
    this.scene.fog = new THREE.Fog(stage.palette.fog, 48, 105);

    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;
    this.renderer.domElement.className = "diorama-canvas";
    this.renderer.domElement.setAttribute("aria-label", "Mapa tridimensional da Clareira dos Ecos");
    this.container.replaceChildren(this.renderer.domElement);

    this.camera = new THREE.OrthographicCamera(-18, 18, 11, -11, 0.1, 180);
    this.camera.position.set(32, 35, 32);
    this.cameraTarget = new THREE.Vector3();
    this.cameraLookAhead = new THREE.Vector3();
    this.cameraFocus = null;
    this.cameraZoom = 1;
    this.clock = new THREE.Clock();
    this.running = false;
    this.frame = 0;
    this.updaters = new Set();
    this.occluders = [];
    this.playerObject = null;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
    this.setupLights();
  }

  setupLights() {
    const ambient = new THREE.HemisphereLight(0xc9f6dd, 0x27442f, 1.75);
    const sun = new THREE.DirectionalLight(0xfff0ae, 2.35);
    sun.position.set(-18, 34, 22);
    const fill = new THREE.DirectionalLight(0x6ad6d0, 0.65);
    fill.position.set(25, 16, -30);
    this.scene.add(ambient, sun, fill);
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const renderScale = 0.58;
    const renderWidth = Math.max(640, Math.round(width * renderScale));
    const renderHeight = Math.max(360, Math.round(height * renderScale));
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(renderWidth, renderHeight, false);
    this.renderer.domElement.style.width = `${width}px`;
    this.renderer.domElement.style.height = `${height}px`;

    const aspect = width / height;
    const vertical = 22 / this.cameraZoom;
    this.camera.left = -vertical * aspect * 0.5;
    this.camera.right = vertical * aspect * 0.5;
    this.camera.top = vertical * 0.5;
    this.camera.bottom = -vertical * 0.5;
    this.camera.updateProjectionMatrix();
  }

  setPlayerObject(object) {
    this.playerObject = object;
  }

  addUpdater(updater) {
    this.updaters.add(updater);
    return () => this.updaters.delete(updater);
  }

  registerOccluder(mesh) {
    mesh.userData.occluder = true;
    this.occluders.push(mesh);
  }

  focusOn(target, { duration = 1.2, zoom = 1.08 } = {}) {
    const point = target?.isVector3 ? target.clone() : new THREE.Vector3(target.x, target.y ?? 0, target.z);
    this.cameraFocus = {
      point,
      duration,
      elapsed: 0,
      start: this.cameraTarget.clone(),
      startZoom: this.cameraZoom,
      zoom
    };
  }

  returnToPlayer({ duration = 0.85 } = {}) {
    if (!this.playerObject) return;
    this.focusOn(this.playerObject.position, { duration, zoom: 1 });
    this.cameraFocus.returning = true;
  }

  updateCamera(delta, velocity) {
    if (!this.playerObject) return;
    const player = this.playerObject.position;
    if (this.cameraFocus) {
      this.cameraFocus.elapsed += delta;
      const progress = clamp(this.cameraFocus.elapsed / this.cameraFocus.duration, 0, 1);
      const eased = progress * progress * (3 - 2 * progress);
      this.cameraTarget.lerpVectors(this.cameraFocus.start, this.cameraFocus.point, eased);
      this.cameraZoom = THREE.MathUtils.lerp(this.cameraFocus.startZoom, this.cameraFocus.zoom, eased);
      if (progress >= 1 && this.cameraFocus.returning) this.cameraFocus = null;
    } else {
      this.cameraLookAhead.set(velocity.x, 0, velocity.z).multiplyScalar(0.72);
      const desired = new THREE.Vector3(player.x, player.y + 1.1, player.z).add(this.cameraLookAhead);
      desired.x = clamp(desired.x, this.stage.cameraBounds.minX, this.stage.cameraBounds.maxX);
      desired.z = clamp(desired.z, this.stage.cameraBounds.minZ, this.stage.cameraBounds.maxZ);
      this.cameraTarget.lerp(desired, 1 - Math.exp(-delta * 5.6));
      this.cameraZoom = THREE.MathUtils.lerp(this.cameraZoom, 1, 1 - Math.exp(-delta * 4));
    }

    const offset = new THREE.Vector3(30, 34, 30).multiplyScalar(1 / this.cameraZoom);
    this.camera.position.copy(this.cameraTarget).add(offset);
    this.camera.lookAt(this.cameraTarget);
    this.resizeProjectionOnly();
    this.updateOcclusion();
  }

  resizeProjectionOnly() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const aspect = width / height;
    const vertical = 22 / this.cameraZoom;
    this.camera.left = -vertical * aspect * 0.5;
    this.camera.right = vertical * aspect * 0.5;
    this.camera.top = vertical * 0.5;
    this.camera.bottom = -vertical * 0.5;
    this.camera.updateProjectionMatrix();
  }

  updateOcclusion() {
    if (!this.playerObject || !this.occluders.length) return;
    const origin = this.camera.position.clone();
    const target = this.playerObject.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    const direction = target.clone().sub(origin);
    const distance = direction.length();
    direction.normalize();
    const raycaster = new THREE.Raycaster(origin, direction, 0, distance - 1.2);
    const blocked = new Set(raycaster.intersectObjects(this.occluders, false).map((hit) => hit.object));
    this.occluders.forEach((mesh) => {
      const material = mesh.material;
      if (!material) return;
      const targetOpacity = blocked.has(mesh) ? 0.32 : 1;
      material.transparent = targetOpacity < 1 || material.opacity < 1;
      material.opacity += (targetOpacity - material.opacity) * 0.18;
      material.depthWrite = material.opacity > 0.7;
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const loop = () => {
      if (!this.running) return;
      const delta = Math.min(0.04, this.clock.getDelta());
      const elapsed = this.clock.elapsedTime;
      this.updaters.forEach((updater) => updater(delta, elapsed));
      this.renderer.render(this.scene, this.camera);
      this.frame = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.clock.stop();
  }

  dispose() {
    this.stop();
    this.resizeObserver.disconnect();
    this.renderer.dispose();
    this.container.replaceChildren();
  }
}

export { THREE };
