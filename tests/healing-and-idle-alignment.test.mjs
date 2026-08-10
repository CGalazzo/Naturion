import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const treadmillStyles = await readFile(
  new URL("../src/overworld/idle/treadmill.css", import.meta.url),
  "utf8"
);
const phaseStyles = await readFile(
  new URL("../src/overworld/idle/phase1.css", import.meta.url),
  "utf8"
);

assert.match(
  treadmillStyles,
  /\.idle-scene\[data-treadmill-ready="true"\] \.idle-party \{[\s\S]*?bottom: 15%;/,
  "o protagonista e seu Naturion precisam usar a mesma linha vertical dos selvagens"
);
assert.match(
  phaseStyles,
  /\.idle-wild\{[^}]*bottom:15%/,
  "a posição aprovada dos Naturions selvagens precisa permanecer intacta"
);

assert.match(index, /id="worldTeamButton"[\s\S]*?id="worldHealButton"/, "a cura precisa ficar ao lado da equipe");
assert.match(index, /class="world-map-tool heal"/, "o mapa-múndi precisa exibir o botão de cura");
assert.match(
  index,
  /const healAllNaturions = \(\) => \{[\s\S]*?getEchoCatalog\(\)\.forEach[\s\S]*?member\.currentHp = member\.maxHp;[\s\S]*?saveCurrentPlayer\(\);[\s\S]*?showToast\("Todos os Naturions foram curados!"\);/,
  "o botão precisa curar equipe e depósito, salvar e confirmar a cura"
);
assert.match(
  index,
  /worldHealButton\.addEventListener\("click", healAllNaturions\)/,
  "o botão de cura precisa responder ao clique"
);

assert.match(
  index,
  /const resolveEchoPartyDefeat = async \(\) => \{[\s\S]*?getEchoRoster\(\)\.forEach\(\(member\) => \{\s*member\.currentHp = member\.maxHp;/,
  "a derrota total precisa restaurar toda a vida da equipe ativa"
);
assert.doesNotMatch(
  index,
  /currentHp\s*=.*maxHp\s*\*\s*\.65/,
  "nenhum fluxo de recuperação pode continuar restaurando somente 65% da vida"
);

console.log("Alinhamento da expedição e curas completas validados.");
