import { REFERENCE_GROUND_COMPRESSED_BASE64, REFERENCE_GROUND_FORMAT } from './data.js';

const decodeBase64 = (value) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

const inflate = async (bytes) => {
  if (typeof DecompressionStream !== 'function') {
    throw new Error('Este navegador não oferece DecompressionStream.');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

const assertPayload = (bytes, width, height, colors, pixelOffset) => {
  const expectedPixels = width * height;
  if (width !== REFERENCE_GROUND_FORMAT.width || height !== REFERENCE_GROUND_FORMAT.height) {
    throw new Error(`Dimensão inesperada da arte: ${width}x${height}.`);
  }
  if (colors !== REFERENCE_GROUND_FORMAT.colors) {
    throw new Error(`Paleta inesperada da arte: ${colors} cores.`);
  }
  if (bytes.length < pixelOffset + expectedPixels) {
    throw new Error('Os dados da arte do Bosque estão incompletos.');
  }
};

export const decodeReferenceGroundCanvas = async () => {
  const compressed = decodeBase64(REFERENCE_GROUND_COMPRESSED_BASE64);
  const bytes = await inflate(compressed);
  const width = (bytes[0] << 8) | bytes[1];
  const height = (bytes[2] << 8) | bytes[3];
  const colors = bytes[4] || 256;
  const paletteOffset = 5;
  const pixelOffset = paletteOffset + colors * 3;
  assertPayload(bytes, width, height, colors, pixelOffset);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Não foi possível criar o canvas da arte do Bosque.');
  context.imageSmoothingEnabled = false;

  const image = context.createImageData(width, height);
  const rgba = image.data;
  const pixelCount = width * height;
  for (let index = 0; index < pixelCount; index += 1) {
    const colorIndex = bytes[pixelOffset + index];
    const paletteIndex = paletteOffset + colorIndex * 3;
    const rgbaIndex = index * 4;
    rgba[rgbaIndex] = bytes[paletteIndex];
    rgba[rgbaIndex + 1] = bytes[paletteIndex + 1];
    rgba[rgbaIndex + 2] = bytes[paletteIndex + 2];
    rgba[rgbaIndex + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return canvas;
};
