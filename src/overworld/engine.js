import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.min.js";

const DESKTOP_RESOLUTION = Object.freeze({ width: 960, height: 540 });
const COMPACT_RESOLUTION = Object.freeze({ width: 640, height: 360 });
const LOW_RESOLUTION = Object.freeze({ width: 480, height: 270 });

THREE.Cache.enabled = true;

const chooseResolution = ({ cssWidth, cssHeight }) => {
  const memory = Number(navigator.deviceMemory || 0);
  const cores = Number(navigator.hardwareConcurrency || 0);
  const lowEnd = (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4) || cssWidth < 620 || cssHeight < 380;
  if (lowEnd) return LOW_RESOLUTION;
  if (cssWidth < 1100 || cssHeight < 680) return COMPACT_RESOLUTION;
  return DESKTOP_RESOLUTION;
};

export class OverworldEngine {
  constructor({ container, map }) {
    if (!container) throw new Error("Contêiner do Bosque Luminal não encontrado.");

    this.container = container;
    this.map = map;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(map.palette.sky);
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
      precision: "mediump",
      preserveDrawingBuffer: false
    });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.sortObjects = true;
    this.renderer.domElement.className = "overworld-canvas";
    this.renderer.domElement.setAttribute("aria-label", "Mapa superior do Bosque Luminal em 3D pixel art");
    this.renderer.domElement.style.imageRendering = "pixelated";
    this.container.replaceChildren(this.renderer.domElement);

    this.clock = new THREE.Clock(false);
    this.running = false;
    this.frame = 0;
    this.updaters = new Set();
    this.renderResolution = null;
    this.isDocumentHidden = document.hidden;
    this.handleVisibilityChange = () => {
      this.isDocumentHidden = document.hidden;
      if (!this.running) return;
      if (this.isDocumentHidden) this.clock.stop();
      else this.clock.start();
    };
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  resize() {
    const cssWidth = Math.max(1, this.container.clientWidth);
    const cssHeight = Math.max(1, this.container.clientHeight);
    const resolution = chooseResolution({ cssWidth, cssHeight });
    const changed = !this.renderResolution
      || this.renderResolution.width !== resolution.width
      || this.renderResolution.height !== resolution.height;

    if (changed) {
      this.renderer.setSize(resolution.width, resolution.height, false);
      this.renderResolution = resolution;
    }

    const canvas = this.renderer.domElement;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.style.imageRendering = "pixelated";
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
      this.frame = requestAnimationFrame(loop);
      if (this.isDocumentHidden) return;

      const delta = Math.min(0.04, this.clock.getDelta());
      const elapsed = this.clock.elapsedTime;
      this.updaters.forEach((updater) => updater(delta, elapsed));
      if (this.camera) this.renderer.render(this.scene, this.camera);
    };

    loop();
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.clock.stop();
  }

  getDiagnostics() {
    return {
      resolution: this.renderResolution,
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      textures: this.renderer.info.memory.textures,
      geometries: this.renderer.info.memory.geometries
    };
  }

  dispose() {
    this.stop();
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.resizeObserver.disconnect();
    this.updaters.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    this.container.replaceChildren();
  }
}

export { THREE, DESKTOP_RESOLUTION, COMPACT_RESOLUTION, LOW_RESOLUTION };
