import chunk00 from "./chunk-00.js?v=1";
import chunk01 from "./chunk-01.js?v=1";
import chunk02 from "./chunk-02.js?v=1";
import chunk03 from "./chunk-03.js?v=1";

const chunks = [chunk00, chunk01, chunk02, chunk03];
const expectedLengths = [18434, 18434, 18434, 18434];

chunks.forEach((chunk, index) => {
  if (chunk.length !== expectedLengths[index]) {
    throw new Error(`Trecho ${index} da imagem da esteira está incompleto.`);
  }
});

export const TREADMILL_FOREST_BASE64 = chunks.join("");
