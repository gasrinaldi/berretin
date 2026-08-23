// Detecta el tipo real de un audio por sus primeros bytes, igual que
// lib/image-signature.ts para imágenes — nunca se confía en la extensión
// ni en el Content-Type que manda el navegador.
export type DetectedAudioType = "mp3" | "wav" | "ogg" | "webm";

export function detectAudioType(bytes: Uint8Array): DetectedAudioType | null {
  if (bytes.length < 12) return null;

  // ID3v2 (mp3 con tags) o frame MPEG crudo (sync FFFB/FFFA/FFF3/FFF2/...).
  const hasId3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const hasMpegSync = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  if (hasId3 || hasMpegSync) return "mp3";

  const isRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const isWave = bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45;
  if (isRiff && isWave) return "wav";

  const isOgg = bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53;
  if (isOgg) return "ogg";

  // EBML: contenedor de WebM/Matroska (audio/webm, típico de grabaciones
  // hechas con MediaRecorder en el navegador).
  const isEbml = bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  if (isEbml) return "webm";

  return null;
}

export function audioContentType(type: DetectedAudioType): string {
  switch (type) {
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "ogg":
      return "audio/ogg";
    case "webm":
      return "audio/webm";
  }
}
