const MOVE_KEYS = new Map([
  ["KeyW", [0, -1]], ["ArrowUp", [0, -1]],
  ["KeyS", [0, 1]], ["ArrowDown", [0, 1]],
  ["KeyA", [-1, 0]], ["ArrowLeft", [-1, 0]],
  ["KeyD", [1, 0]], ["ArrowRight", [1, 0]]
]);

export class OverworldInput {
  constructor({ isActive, onInteract, onMenu, onEscape, elements = {} }) {
    this.isActive = isActive;
    this.onInteract = onInteract;
    this.onMenu = onMenu;
    this.onEscape = onEscape;
    this.keys = new Set();
    this.enabled = true;
    this.joystick = { x: 0, z: 0, active: false, pointerId: null };
    this.elements = elements;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.reset.bind(this);
    window.addEventListener("keydown", this.handleKeyDown, { passive: false });
    window.addEventListener("keyup", this.handleKeyUp, { passive: false });
    window.addEventListener("blur", this.handleBlur);
    this.bindMobileControls();
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

  bindMobileControls() {
    const { joystickBase, joystickKnob, interactButton, runButton, teamButton, mapButton } = this.elements;
    if (joystickBase && joystickKnob) {
      const updateJoystick = (event) => {
        if (!this.joystick.active || event.pointerId !== this.joystick.pointerId) return;
        const rect = joystickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const max = rect.width * 0.34;
        let dx = event.clientX - centerX;
        let dy = event.clientY - centerY;
        const length = Math.hypot(dx, dy);
        if (length > max) {
          dx = dx / length * max;
          dy = dy / length * max;
        }
        joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
        this.joystick.x = dx / max;
        this.joystick.z = dy / max;
      };
      joystickBase.addEventListener("pointerdown", (event) => {
        if (!this.enabled || !this.isActive()) return;
        event.preventDefault();
        this.joystick.active = true;
        this.joystick.pointerId = event.pointerId;
        joystickBase.setPointerCapture(event.pointerId);
        updateJoystick(event);
      });
      joystickBase.addEventListener("pointermove", updateJoystick);
      const release = (event) => {
        if (event.pointerId !== this.joystick.pointerId) return;
        this.joystick.active = false;
        this.joystick.pointerId = null;
        this.joystick.x = 0;
        this.joystick.z = 0;
        joystickKnob.style.transform = "translate(0, 0)";
      };
      joystickBase.addEventListener("pointerup", release);
      joystickBase.addEventListener("pointercancel", release);
    }
    interactButton?.addEventListener("pointerdown", (event) => { event.preventDefault(); this.onInteract?.(); });
    runButton?.addEventListener("pointerdown", (event) => { event.preventDefault(); this.keys.add("ShiftLeft"); });
    runButton?.addEventListener("pointerup", () => this.keys.delete("ShiftLeft"));
    runButton?.addEventListener("pointercancel", () => this.keys.delete("ShiftLeft"));
    teamButton?.addEventListener("click", () => this.onMenu?.());
    mapButton?.addEventListener("click", () => this.onEscape?.());
  }

  getMovement() {
    let x = this.joystick.active ? this.joystick.x : 0;
    let z = this.joystick.active ? this.joystick.z : 0;
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
    this.joystick.x = 0;
    this.joystick.z = 0;
    this.joystick.active = false;
    if (this.elements.joystickKnob) this.elements.joystickKnob.style.transform = "translate(0, 0)";
  }

  dispose() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
  }
}
