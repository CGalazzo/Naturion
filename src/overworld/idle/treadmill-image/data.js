import chunk00 from "./chunk-00.js?v=2";
import chunk01 from "./chunk-01.js?v=2";
import chunk02 from "./chunk-02.js?v=2";
import chunk03 from "./chunk-03.js?v=2";

// Não interromper a esteira por divergência de tamanho entre os trechos.
// A imagem é validada pelo próprio navegador ao criar o Blob.
export const TREADMILL_FOREST_BASE64 = [chunk00, chunk01, chunk02, chunk03].join("");
