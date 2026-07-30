import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.min.js";

const DESKTOP_RESOLUTION = Object.freeze({ width: 800, height: 450 });
const COMPACT_RESOLUTION = Object.freeze({ width: 640, height: 360 });

export class OverworldEngine {
  constructor({ container, map }) {
    if (!container) throw new Error("Contêiner do Bosque Luminal não encontrado.");
    this.container = container;
    this.map = map;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(map.palette.sky);
    this.scene.fog = new THREE.Fog(map.palette.fog, 42, 88);
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.domElement.className = "overworld-canvas";
    this.renderer.domElement.setAttribute("aria-label", "Mapa superior tridimensional do Bosque Luminal");
    this.renderer.domElement.style.imageRendering = "pixelated";
    this.container.replaceChildren(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.running = false;
    this.frame = 0;
    this.updaters = new Set();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.setupLights();
    this.resize();
  }

  setupLights() {
    const ambient = new THREE.HemisphereLight(0xfff2c4, 0x244c51, 1.08);
    const sun = new THREE.DirectionalLight(0xffd58a, 1.62);
    sun.position.set(-24, 36, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -38;
    sun.shadow.camera.right = 38;
    sun.shadow.camera.top = 34;
    sun.shadow.camera.bottom = -34;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 92;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.035;

    const coolFill = new THREE.DirectionalLight(0x75b9b2, 0.32);
    coolFill.position.set(24, 16, -22);
    const warmBounce = new THREE.DirectionalLight(0xe8b85d, 0.15);
    warmBounce.position.set(-10, 8, -18);
    this.scene.add(ambient, sun, coolFill, warmBounce);
    this.sun = sun;
  }

  resize() {
    const cssWidth = Math.max(1, this.container.clientWidth);
    const cssHeight = Math.max(1, this.container.clientHeight);
    const compact = cssWidth < 980 || cssHeight < 620;
    const resolution = compact ? COMPACT_RESOLUTION : DESKTOP_RESOLUTION;
    this.renderer.setSize(resolution.width, resolution.height, false);
    const canvas = this.renderer.domElement;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.style.imageRendering = "pixelated";
    this.renderResolution = resolution;
    this.onResize?.({ cssWidth, cssHeight, resolution });
  }

  addUpdater(updater) {
    this.updaters.add(updater);
    return () => this.updaters.delete(updater);
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
      if (this.camera) this.renderer.render(this.scene, this.camera);
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
    this.updaters.clear();
    this.renderer.dispose();
    this.container.replaceChildren();
  }
}

export { THREE, DESKTOP_RESOLUTION, COMPACT_RESOLUTION };
