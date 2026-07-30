import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.min.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class DioramaEngine {
  constructor({ container, stage }) {
    if (!container) throw new Error("Contêiner do diorama não encontrado.");
    this.container = container;
    this.stage = stage;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(stage.palette.sky);
    this.scene.fog = new THREE.Fog(stage.palette.fog, 58, 118);

    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.domElement.className = "diorama-canvas";
    this.renderer.domElement.setAttribute("aria-label", "Mapa tridimensional da Clareira dos Ecos");
    this.container.replaceChildren(this.renderer.domElement);

    this.camera = new THREE.OrthographicCamera(-18, 18, 11, -11, 0.1, 190);
    this.camera.position.set(29, 32, 29);
    this.cameraTarget = new THREE.Vector3();
    this.cameraLookAhead = new THREE.Vector3();
    this.cameraFocus = null;
    this.cameraZoom = 1.04;
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
    const ambient = new THREE.HemisphereLight(0xd6f4df, 0x2f4737, 1.42);
    const sun = new THREE.DirectionalLight(0xffe8ad, 2.05);
    sun.position.set(-22, 34, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -38;
    sun.shadow.camera.right = 38;
    sun.shadow.camera.top = 34;
    sun.shadow.camera.bottom = -34;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 90;
    sun.shadow.bias = -0.0009;
    sun.shadow.normalBias = 0.04;

    const fill = new THREE.DirectionalLight(0x7acfc1, 0.52);
    fill.position.set(24, 15, -28);
    const warmBounce = new THREE.DirectionalLight(0xd9a96a, 0.22);
    warmBounce.position.set(-8, 7, -20);
    this.scene.add(ambient, sun, fill, warmBounce);
    this.sun = sun;
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const diagonal = Math.hypot(width, height);
    const renderScale = clamp(0.52 + (diagonal - 900) / 8000, 0.52, 0.68);
    const renderWidth = Math.max(640, Math.round(width * renderScale));
    const renderHeight = Math.max(360, Math.round(height * renderScale));
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(renderWidth, renderHeight, false);
    this.renderer.domElement.style.width = `${width}px`;
    this.renderer.domElement.style.height = `${height}px`;
    this.resizeProjectionOnly();
  }

  setPlayerObject(object) {
    this.playerObject = object;
  }

  addUpdater(updater) {
    this.updaters.add(updater);
    return () => this.updaters.delete(updater);
  }

  registerOccluder(mesh) {
    if (!mesh?.isObject3D) return;
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
    this.focusOn(this.playerObject.position, { duration, zoom: 1.04 });
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
      this.cameraLookAhead.set(velocity.x, 0, velocity.z).multiplyScalar(0.64);
      const desired = new THREE.Vector3(player.x, player.y + 1.15, player.z).add(this.cameraLookAhead);
      desired.x = clamp(desired.x, this.stage.cameraBounds.minX, this.stage.cameraBounds.maxX);
      desired.z = clamp(desired.z, this.stage.cameraBounds.minZ, this.stage.cameraBounds.maxZ);
      this.cameraTarget.lerp(desired, 1 - Math.exp(-delta * 5.2));
      this.cameraZoom = THREE.MathUtils.lerp(this.cameraZoom, 1.04, 1 - Math.exp(-delta * 3.8));
    }

    const offset = new THREE.Vector3(28.5, 31.5, 28.5).multiplyScalar(1 / this.cameraZoom);
    this.camera.position.copy(this.cameraTarget).add(offset);
    this.camera.lookAt(this.cameraTarget);
    if (this.sun) {
      this.sun.position.set(this.cameraTarget.x - 22, 34, this.cameraTarget.z + 18);
      this.sun.target.position.copy(this.cameraTarget);
      this.scene.add(this.sun.target);
    }
    this.resizeProjectionOnly();
    this.updateOcclusion(delta);
  }

  resizeProjectionOnly() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const aspect = width / height;
    const vertical = 23.5 / this.cameraZoom;
    this.camera.left = -vertical * aspect * 0.5;
    this.camera.right = vertical * aspect * 0.5;
    this.camera.top = vertical * 0.5;
    this.camera.bottom = -vertical * 0.5;
    this.camera.updateProjectionMatrix();
  }

  updateOcclusion(delta = 0.016) {
    if (!this.playerObject || !this.occluders.length) return;
    const origin = this.camera.position.clone();
    const target = this.playerObject.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    const direction = target.clone().sub(origin);
    const distance = direction.length();
    direction.normalize();
    const raycaster = new THREE.Raycaster(origin, direction, 0, Math.max(0, distance - 1));
    const blocked = new Set(raycaster.intersectObjects(this.occluders, false).map((hit) => hit.object));
    this.occluders.forEach((mesh) => {
      const material = mesh.material;
      if (!material || Array.isArray(material)) return;
      const targetOpacity = blocked.has(mesh) ? 0.28 : 1;
      material.transparent = targetOpacity < 1 || material.opacity < 1;
      material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 1 - Math.exp(-delta * 11));
      material.depthWrite = material.opacity > 0.7;
      material.needsUpdate = true;
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
