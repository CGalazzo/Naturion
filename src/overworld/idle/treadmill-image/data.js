import fullImageBase64 from "./chunk-00.js?v=2";

// O primeiro arquivo contém a imagem WebP completa. A implementação anterior
// tratava esse conteúdo como apenas 1/4 da imagem e abortava o módulo antes de
// montar a esteira. Validamos somente a assinatura/volume e usamos o arquivo
// completo diretamente.
if (
  typeof fullImageBase64 !== "string"
  || fullImageBase64.length < 50000
  || !fullImageBase64.startsWith("UklG")
) {
  throw new Error("A imagem completa da esteira está inválida.");
}

export const TREADMILL_FOREST_BASE64 = fullImageBase64;
