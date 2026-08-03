import { TREADMILL_FOREST_BASE64 } from "./treadmill-image/data.js?v=1";

let treadmillImageUrl = "";

const decodeBase64 = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

export const getTreadmillImageUrl = () => {
  if (treadmillImageUrl) return treadmillImageUrl;
  const bytes = decodeBase64(TREADMILL_FOREST_BASE64);
  treadmillImageUrl = URL.createObjectURL(new Blob([bytes], { type: "image/webp" }));
  return treadmillImageUrl;
};
