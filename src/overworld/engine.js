import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.min.js";

const HIGH_CAP = Object.freeze({ width: 960, height: 640 });
const COMPACT_CAP = Object.freeze({ width: 800, height: 520 });
const LOW_CAP = Object.freeze({ width: 640, height: 480 });

THREE.Cache.enabled = true;

const chooseRenderCap = ({ cssWidth, cssHeight }) => {
  const memory = Number(navigator.deviceMemory || 0);
  const cores = Number(navigator.hardwareConcurrency || 0);
  const lowEnd = (memory > 0 && memory <= 4)
    || (cores > 0 && cores <= 4)
    || cssWidth < 620;
  if (lowEnd) return LOW_CAP;
  if (cssWidth < 1180 || cssHeight < 700) return COMPACT_CAP;
  return HIGH_CAP;
};

const choosePixelPerfectResolution = ({ cssWidth, cssHeight }) => {
  const cap = chooseRenderCap({ cssWidth, cssHeight });
  let pixelScale = 1;
  while (
    Math.ceil(cssWidth / pixelScale) > cap.width
    || Math.ceil(cssHeight / pixelScale) > cap.height
  ) {
    pixelScale += 1;
  }

  const width = Math.max(1, Math.ceil(cssWidth / pixelScale));
  const height = Math.max(1, Math.ceil(cssHeight / pixelScale));
  return {
    width,
    height,
    pixelScale,
    displayWidth: width * pixelScale,
    displayHeight: height * pixelScale
  };
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
    Object.assign(this.renderer.domElement.style, {
      position: "absolute",
      imageRendering: "pixelated",
      transform: "none"
    });
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
    const cssWidth = Math.max(1, Math.round(this.container.clientWidth));
    const cssHeight = Math.max(1, Math.round(this.container.clientHeight));
    const resolution = choosePixelPerfectResolution({ cssWidth, cssHeight });
    const changed = !this.renderResolution
      || this.renderResolution.width !== resolution.width
      || this.renderResolution.height !== resolution.height;

    if (changed) this.renderer.setSize(resolution.width, resolution.height, false);
    this.renderResolution = resolution;

    const canvas = this.renderer.domElement;
    canvas.style.width = `${resolution.displayWidth}px`;
    canvas.style.height = `${resolution.displayHeight}px`;
    canvas.style.left = `${Math.floor((cssWidth - resolution.displayWidth) / 2)}px`;
    canvas.style.top = `${Math.floor((cssHeight - resolution.displayHeight) / 2)}px`;
    canvas.style.imageRendering = "pixelated";
    canvas.style.transform = "none";

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

export { THREE, HIGH_CAP, COMPACT_CAP, LOW_CAP };
