from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
path = root / "src/overworld/sprites.js"
text = path.read_text(encoding="utf-8")

insert = r'''

class DynamicImageRig {
  constructor(options = {}) {
    const source = options.image || options.src || options.imageUrl || options.characterImage || options.form?.image || options.form?.sprite || "";
    this.root = new THREE.Group();
    this.root.name = "OverworldOriginalNaturionSprite";
    const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, toneMapped: false });
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.7, .72), shadowMaterial);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = .012;
    this.root.add(this.shadow);
    const texture = loader.load(source || "assets/map/bosque-luminal.webp");
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    this.texture = texture;
    this.material = new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: .035, depthWrite: false, toneMapped: false });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.center.set(.5, .08);
    const scale = Number(options.scale) || 2.6;
    this.sprite.scale.set(scale, scale, 1);
    this.sprite.position.y = .04;
    this.root.add(this.sprite);
  }
  update({ elapsed = 0, flying = false, state = "idle" } = {}) {
    const frequency = flying ? 4.8 : state === "walking" ? 7 : 2.5;
    const amplitude = flying ? .16 : state === "walking" ? .055 : .025;
    this.sprite.position.y = .04 + Math.sin(elapsed * frequency) * amplitude + (flying ? .58 : 0);
    this.sprite.scale.x = Math.abs(this.sprite.scale.x) * (1 + Math.sin(elapsed * frequency * .5) * .015);
    this.shadow.scale.setScalar(flying ? .78 : 1);
  }
  dispose() {
    this.texture.dispose();
    this.material.dispose();
    this.sprite.geometry?.dispose?.();
    this.shadow.material.map?.dispose?.();
    this.shadow.material.dispose?.();
    this.shadow.geometry?.dispose?.();
  }
}

const createDynamicImageSprite = (options = {}) => {
  const rig = new DynamicImageRig(options);
  rig.root.userData.rig = rig;
  rig.root.update = (payload) => rig.update(payload);
  rig.root.dispose = () => rig.dispose();
  return rig.root;
};
'''

marker = "export class DirectionalSpriteRig"
if "class DynamicImageRig" not in text:
    text = text.replace(marker, insert + "\n" + marker)

names = set(re.findall(r"export\s+(?:class|const|function)\s+([A-Za-z_$][\w$]*)", text))
for name in sorted(names):
    low = name.lower()
    if not any(token in low for token in ("naturion", "creature", "wild", "entity", "monster")):
        continue
    text = re.sub(
        rf"export class {re.escape(name)} extends NpcSpriteRig \{{\}}",
        f"export class {name} extends DynamicImageRig {{}}",
        text,
    )
    text = re.sub(
        rf"export const {re.escape(name)} = \(options = \{{\}}\) => createNpcSprite\(options\);",
        f"export const {name} = (options = {{}}) => createDynamicImageSprite(options);",
        text,
    )

path.write_text(text, encoding="utf-8")
