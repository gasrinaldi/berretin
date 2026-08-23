import sharp, { type Sharp, type OutputInfo } from "sharp";

// Todo esto corre server-only (sharp no es apto para el navegador). Los
// límites de entrada (tipo real por firma de bytes, tamaño crudo) se
// validan antes, en contribute-actions.ts, con lib/image-signature.ts.

export const MAIN_MAX_DIMENSION = 1600;
export const MAIN_MAX_BYTES = 2 * 1024 * 1024;
export const THUMBNAIL_MAX_DIMENSION = 480;
export const THUMBNAIL_TARGET_BYTES = 100 * 1024;

const MAIN_QUALITY_STEPS = [80, 65, 50];
const THUMBNAIL_QUALITY_STEPS = [70, 50, 35];

export class ImageProcessingError extends Error {}

export type ProcessedImage = {
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
};

async function encodeWithinBudget(build: () => Sharp, qualitySteps: number[], maxBytes: number) {
  let last: { data: Buffer; info: OutputInfo } | null = null;
  for (const quality of qualitySteps) {
    const result = await build().webp({ quality }).toBuffer({ resolveWithObject: true });
    last = result;
    if (result.data.byteLength <= maxBytes) break;
  }
  return last!;
}

// Redimensiona (máximo, sin agrandar), convierte a WebP y — al no llamar
// nunca a .withMetadata() — descarta EXIF/ICC/GPS del archivo original.
// .rotate() sin argumentos aplica la orientación EXIF a los píxeles antes
// de descartar esa metadata, para que la imagen no quede rotada.
export async function processContributionImage(input: Uint8Array): Promise<{ main: ProcessedImage; thumbnail: ProcessedImage }> {
  const buffer = Buffer.from(input);

  let mainResult: { data: Buffer; info: OutputInfo };
  let thumbResult: { data: Buffer; info: OutputInfo };

  try {
    mainResult = await encodeWithinBudget(
      () => sharp(buffer, { failOn: "error" }).rotate().resize({ width: MAIN_MAX_DIMENSION, height: MAIN_MAX_DIMENSION, fit: "inside", withoutEnlargement: true }),
      MAIN_QUALITY_STEPS,
      MAIN_MAX_BYTES
    );
    thumbResult = await encodeWithinBudget(
      () => sharp(buffer, { failOn: "error" }).rotate().resize({ width: THUMBNAIL_MAX_DIMENSION, height: THUMBNAIL_MAX_DIMENSION, fit: "inside", withoutEnlargement: true }),
      THUMBNAIL_QUALITY_STEPS,
      THUMBNAIL_TARGET_BYTES
    );
  } catch {
    throw new ImageProcessingError("El archivo está dañado o no pudimos procesarlo como imagen.");
  }

  if (mainResult.data.byteLength > MAIN_MAX_BYTES) {
    throw new ImageProcessingError("La imagen es demasiado compleja para optimizarla por debajo de 2 MB. Probá con otra.");
  }
  if (mainResult.info.width > MAIN_MAX_DIMENSION || mainResult.info.height > MAIN_MAX_DIMENSION) {
    throw new ImageProcessingError("No pudimos ajustar la imagen al tamaño máximo permitido.");
  }

  return {
    main: { buffer: mainResult.data, width: mainResult.info.width, height: mainResult.info.height, size: mainResult.data.byteLength },
    thumbnail: { buffer: thumbResult.data, width: thumbResult.info.width, height: thumbResult.info.height, size: thumbResult.data.byteLength },
  };
}
