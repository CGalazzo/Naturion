import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const phaseSource = await readFile(new URL("../src/overworld/idle/phase1.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/overworld/idle/phase1.css", import.meta.url), "utf8");
const backgroundFix = await readFile(new URL("../src/overworld/idle/background-fix.js", import.meta.url), "utf8");
const arenaUrl = new URL("../assets/puzzle/circle-of-echoes-arena.webp", import.meta.url);
const arena = await readFile(arenaUrl);
const arenaInfo = await stat(arenaUrl);

assert.equal(arena.subarray(0, 4).toString("ascii"), "RIFF", "a arena deve ser um WebP válido");
assert.equal(arena.subarray(8, 12).toString("ascii"), "WEBP", "a arena deve preservar o contêiner WebP");
assert.ok(arenaInfo.size > 100_000, "a arte da arena não pode ser substituída por um placeholder");

assert.match(phaseSource, /circle-of-echoes-arena\.webp/, "o puzzle precisa carregar a arena aprovada");
assert.equal((phaseSource.match(/class="idle-rune"/g) || []).length, 3, "o puzzle precisa manter três runas");
assert.equal((phaseSource.match(/class="idle-energy-path"/g) || []).length, 3, "cada pedestal precisa de um canal de energia");
assert.match(phaseSource, /shuffle\(\)[\s\S]*\[0, 1, 2\]/, "a sequência original de três runas precisa permanecer ativa");
assert.match(phaseSource, /saveEchoMapState[\s\S]*echoesSolved: true/, "a conclusão do puzzle precisa continuar salva");

assert.match(styles, /aspect-ratio:1672\/941/, "a arena não pode ser esticada");
assert.match(styles, /image-rendering:pixelated/, "a arte precisa preservar a nitidez pixel art");
assert.match(styles, /data-rune="0"\]\{top:16\.1%;left:50\.3%\}/, "a runa superior precisa permanecer no pedestal");
assert.match(styles, /data-rune="1"\]\{top:64\.4%;left:73\.1%\}/, "a runa direita precisa permanecer no pedestal");
assert.match(styles, /data-rune="2"\]\{top:64\.4%;left:27\.3%\}/, "a runa esquerda precisa permanecer no pedestal");
assert.match(backgroundFix, /circle-of-echoes-arena\.webp/, "a tela do puzzle precisa usar a mesma arena como fundo");

console.log("Arena do Círculo dos Ecos validada com arte, três runas e persistência.");
