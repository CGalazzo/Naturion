const MOVE_KEYS = new Map([
  ["KeyW", [0, -1]],
  ["ArrowUp", [0, -1]],
  ["KeyS", [0, 1]],
  ["ArrowDown", [0, 1]],
  ["KeyA", [-1, 0]],
  ["ArrowLeft", [-1, 0]],
  ["KeyD", [1, 0]],
  ["ArrowRight", [1, 0]]
]);

export class InputController {
  constructor({ isActive, onInteract, onMenu, onEscape }) {
    this.isActive = isActive;
    this.onInteract = onInteract;
    this.onMenu = onMenu;
    this.onEscape = onEscape;
    this.keys = new Set();
    this.enabled = true;
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    window.addEventListener("keydown", this.handleKeyDown, { passive: false });
    window.addEventListener("keyup", this.handleKeyUp, { passive: false });
    window.addEventListener("blur", this.handleBlur);
  }

  handleKeyDown(event) {
    if (!this.enabled || !this.isActive()) return;
    if (MOVE_KEYS.has(event.code) || event.code === "ShiftLeft" || event.code === "ShiftRight") {
      event.preventDefault();
      this.keys.add(event.code);
      return;
    }
    if (event.repeat) return;
    if (event.code === "KeyE" || event.code === "Enter") {
      event.preventDefault();
      this.onInteract?.();
    } else if (event.code === "Tab" || event.code === "KeyT") {
      event.preventDefault();
      this.onMenu?.();
    } else if (event.code === "Escape") {
      event.preventDefault();
      this.onEscape?.();
    }
  }

  handleKeyUp(event) {
    this.keys.delete(event.code);
  }

  handleBlur() {
    this.keys.clear();
  }

  getMovement() {
    let x = 0;
    let z = 0;
    MOVE_KEYS.forEach(([dx, dz], code) => {
      if (!this.keys.has(code)) return;
      x += dx;
      z += dz;
    });
    const length = Math.hypot(x, z);
    if (length > 1) {
      x /= length;
      z /= length;
    }
    return {
      x,
      z,
      running: this.keys.has("ShiftLeft") || this.keys.has("ShiftRight")
    };
  }

  reset() {
    this.keys.clear();
  }

  dispose() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
  }
}
