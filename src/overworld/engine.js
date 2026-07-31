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
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.domElement.className = "overworld-canvas";
    this.renderer.domElement.setAttribute("aria-label", "Mapa superior 2.5D do Bosque Luminal");
    this.renderer.domElement.style.imageRendering = "pixelated";
    this.container.replaceChildren(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.running = false;
    this.frame = 0;
    this.updaters = new Set();
    this.loop = this.loop.bind(this);
    this.handleVisibility = this.handleVisibility.bind(this);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    document.addEventListener("visibilitychange", this.handleVisibility);
    this.resize();
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

  scheduleFrame() {
    if (!this.running || document.visibilityState === "hidden") return;
    this.frame = requestAnimationFrame(this.loop);
  }

  loop() {
    if (!this.running) return;
    const delta = Math.min(0.04, this.clock.getDelta());
    const elapsed = this.clock.elapsedTime;
    this.updaters.forEach((updater) => updater(delta, elapsed));
    if (this.camera) this.renderer.render(this.scene, this.camera);
    this.scheduleFrame();
  }

  handleVisibility() {
    if (!this.running) return;
    if (document.visibilityState === "hidden") {
      cancelAnimationFrame(this.frame);
      return;
    }
    this.clock.getDelta();
    this.scheduleFrame();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.scheduleFrame();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.clock.stop();
  }

  dispose() {
    this.stop();
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.resizeObserver.disconnect();
    this.updaters.clear();
    this.renderer.dispose();
    this.container.replaceChildren();
  }
}

export { THREE, DESKTOP_RESOLUTION, COMPACT_RESOLUTION };
