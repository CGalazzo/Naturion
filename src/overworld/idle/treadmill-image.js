import { TREADMILL_FOREST_BASE64 } from "./treadmill-image/data.js?v=3";

let treadmillImageUrl = "";

const decodeBase64 = (base64) => {
  const clean = String(base64 || "").replace(/\s+/g, "");
  if (!clean.startsWith("UklG")) throw new Error("Imagem da esteira sem cabeçalho WebP válido.");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const signature = String.fromCharCode(...bytes.slice(0, 4));
  const format = String.fromCharCode(...bytes.slice(8, 12));
  if (signature !== "RIFF" || format !== "WEBP") throw new Error("Imagem da esteira corrompida.");
  return bytes;
};

export const getTreadmillImageUrl = () => {
  if (treadmillImageUrl) return treadmillImageUrl;
  const bytes = decodeBase64(TREADMILL_FOREST_BASE64);
  treadmillImageUrl = URL.createObjectURL(new Blob([bytes], { type: "image/webp" }));
  return treadmillImageUrl;
};
