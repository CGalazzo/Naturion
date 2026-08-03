import chunk00a from "./chunk-00-a.js?v=1";
import chunk00b from "./chunk-00-b.js?v=1";
import chunk00c from "./chunk-00-c.js?v=1";
import chunk00d from "./chunk-00-d.js?v=1";
import chunk01 from "./chunk-01.js?v=3";
import chunk02 from "./chunk-02.js?v=3";
import chunk03 from "./chunk-03.js?v=3";

const chunks = [chunk00a, chunk00b, chunk00c, chunk00d, chunk01, chunk02, chunk03];
const expectedLengths = [4608, 4608, 4608, 4610, 18434, 18434, 18434];

chunks.forEach((chunk, index) => {
  if (chunk.length !== expectedLengths[index]) {
    throw new Error(`Trecho ${index} da imagem da esteira está incompleto.`);
  }
});

export const TREADMILL_FOREST_BASE64 = chunks.join("");
