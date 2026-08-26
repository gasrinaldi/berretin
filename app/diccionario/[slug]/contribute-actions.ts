"use server";

import { randomUUID } from "node:crypto";
import { getClientIpHash } from "@/lib/client-ip";
import { getEntryBySlug } from "@/lib/dictionary";
import { getCurrentUser } from "@/lib/auth-user";
import { getSupabaseAdmin, CONTRIBUTIONS_BUCKET, CONTRIBUTIONS_AUDIO_BUCKET } from "@/lib/supabase-admin";
import { detectImageType } from "@/lib/image-signature";
import { detectAudioType, audioContentType } from "@/lib/audio-signature";
import { processContributionImage, ImageProcessingError, type ProcessedImage } from "@/lib/image-processing";
import { notifyAdmin } from "@/lib/admin-notify";
import {
  isContributionType,
  sanitizeText,
  validateEmail,
  TYPES_WITH_IMAGE,
  TYPES_WITH_AUDIO,
  CONTENT_MIN,
  CONTENT_MAX,
  ALIAS_MAX,
  LOCATION_MAX,
  DECADE_MAX,
  MAX_IMAGE_BYTES,
  MAX_AUDIO_BYTES,
  SUCCESS_MESSAGE,
  LEGAL_VERSION,
  CONTRIBUTION_TYPES,
  type ContributionFieldErrors,
  type ContributeFormState,
} from "@/lib/contributions";

const RATE_LIMIT_SECONDS = 20;
const DAILY_LIMIT = 20;
const IMAGE_DAILY_LIMIT = 3;
const AUDIO_DAILY_LIMIT = 3;

function errorState(message: string, fieldErrors?: ContributionFieldErrors): ContributeFormState {
  return { status: "error", message, fieldErrors };
}

export async function submitContribution(_prevState: ContributeFormState, formData: FormData): Promise<ContributeFormState> {
  // Honeypot: campo invisible que un humano nunca completa. Si viene con
  // contenido, se finge éxito para no delatar la trampa a un bot.
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return { status: "success", message: SUCCESS_MESSAGE };
  }

  const wordSlug = String(formData.get("wordSlug") ?? "").trim();
  const entry = wordSlug ? getEntryBySlug(wordSlug) : undefined;
  if (!entry) {
    return errorState("No pudimos identificar la palabra. Recargá la página e intentá de nuevo.");
  }

  const rawType = String(formData.get("type") ?? "");
  if (!isContributionType(rawType)) {
    return errorState("Elegí un tipo de aporte válido.", { type: "Elegí un tipo de aporte válido." });
  }

  const fieldErrors: ContributionFieldErrors = {};

  const content = sanitizeText(String(formData.get("content") ?? ""));
  if (content.length < CONTENT_MIN) fieldErrors.content = "Contanos un poco más — hace falta un mínimo de contenido.";
  else if (content.length > CONTENT_MAX) fieldErrors.content = `El contenido no puede superar los ${CONTENT_MAX} caracteres.`;

  const authorAlias = sanitizeText(String(formData.get("authorAlias") ?? ""));
  if (authorAlias.length > ALIAS_MAX) fieldErrors.authorAlias = `El alias no puede superar los ${ALIAS_MAX} caracteres.`;

  const emailRaw = String(formData.get("email") ?? "").trim();
  if (emailRaw && !validateEmail(emailRaw)) fieldErrors.email = "Ese email no parece válido.";

  const location = sanitizeText(String(formData.get("location") ?? ""));
  if (location.length > LOCATION_MAX) fieldErrors.location = `Máximo ${LOCATION_MAX} caracteres.`;

  const decade = sanitizeText(String(formData.get("decade") ?? ""));
  if (decade.length > DECADE_MAX) fieldErrors.decade = `Máximo ${DECADE_MAX} caracteres.`;

  // Autoridad real de los dos consentimientos: el cliente ya no deja
  // enviar el formulario sin marcarlos, pero acá es donde de verdad se
  // exigen — nunca se asume "on" por default ni se acepta un formulario
  // armado a mano sin ambos.
  if (formData.get("consentTerms") !== "on") {
    fieldErrors.consentTerms = "Necesitamos que aceptes los Términos de uso y la Política de privacidad.";
  }
  if (formData.get("consentAuthorship") !== "on") {
    fieldErrors.consentAuthorship = "Necesitamos tu confirmación de autoría/autorización para poder recibir el aporte.";
  }

  const needsImage = TYPES_WITH_IMAGE.includes(rawType);
  const imageFile = formData.get("image");
  const hasImageFile = imageFile instanceof File && imageFile.size > 0;

  if (needsImage && !hasImageFile) {
    fieldErrors.image = "Este tipo de aporte necesita una imagen.";
  }

  // Solo validaciones baratas acá (tamaño crudo + firma real de bytes). El
  // procesamiento con sharp (caro) se hace más abajo, después de los
  // límites de frecuencia, para no gastar CPU en un pedido que de todos
  // modos se va a rechazar.
  let rawImageBytes: Uint8Array | null = null;

  if (needsImage && hasImageFile) {
    const file = imageFile as File;
    if (file.size > MAX_IMAGE_BYTES) {
      fieldErrors.image = "La imagen no puede superar los 8 MB.";
    } else {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const detected = detectImageType(buffer);
      if (!detected) {
        fieldErrors.image = "El archivo no es una imagen JPG, PNG o WebP válida.";
      } else {
        rawImageBytes = buffer;
      }
    }
  }

  const needsAudio = TYPES_WITH_AUDIO.includes(rawType);
  const audioFile = formData.get("audio");
  const hasAudioFile = audioFile instanceof File && audioFile.size > 0;

  if (needsAudio && !hasAudioFile) {
    fieldErrors.audio = "Este tipo de aporte necesita un audio.";
  }

  let rawAudioBytes: Uint8Array | null = null;
  let audioExt: "mp3" | "wav" | "ogg" | "webm" | null = null;

  if (needsAudio && hasAudioFile) {
    const file = audioFile as File;
    if (file.size > MAX_AUDIO_BYTES) {
      fieldErrors.audio = "El audio no puede superar los 5 MB.";
    } else {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const detected = detectAudioType(buffer);
      if (!detected) {
        fieldErrors.audio = "El archivo no es un audio MP3, WAV, OGG o WebM válido.";
      } else {
        rawAudioBytes = buffer;
        audioExt = detected;
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return errorState("Revisá los campos marcados.", fieldErrors);
  }

  const ipHash = await getClientIpHash();
  // Vincula el aporte a la cuenta si hay sesión, sin exigirla: el aporte
  // anónimo (sin user_id) sigue permitido exactamente como antes.
  const currentUser = await getCurrentUser();

  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return errorState("El formulario de aportes no está disponible en este momento. Probá más tarde.");
  }

  // Remitentes bloqueados por moderación (etapa 3): se rechaza en silencio,
  // sin revelar que es por un bloqueo, antes de gastar tiempo en los demás
  // límites o en procesar una imagen.
  if (ipHash || emailRaw) {
    let blockedQuery = supabase.from("blocked_senders").select("id", { count: "exact", head: true });
    const conditions = [ipHash ? `ip_hash.eq.${ipHash}` : null, emailRaw ? `email.eq.${emailRaw.toLowerCase()}` : null].filter(Boolean).join(",");
    blockedQuery = blockedQuery.or(conditions);
    const { count: blockedCount, error: blockedError } = await blockedQuery;
    if (!blockedError && (blockedCount ?? 0) > 0) {
      return errorState("No pudimos procesar tu aporte. Si creés que es un error, escribinos.");
    }
  }

  if (ipHash) {
    const { count: recentCount, error: recentError } = await supabase
      .from("word_contributions")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", new Date(Date.now() - RATE_LIMIT_SECONDS * 1000).toISOString());

    if (!recentError && (recentCount ?? 0) > 0) {
      return errorState("Ya enviaste un aporte hace muy poco. Esperá unos segundos y volvé a intentar.");
    }

    const { count: dailyCount, error: dailyError } = await supabase
      .from("word_contributions")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!dailyError && (dailyCount ?? 0) >= DAILY_LIMIT) {
      return errorState("Alcanzaste el límite de aportes por hoy. Probá de nuevo mañana.");
    }

    if (rawImageBytes) {
      const { count: imageDailyCount, error: imageDailyError } = await supabase
        .from("word_contributions")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .not("image_path", "is", null)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (!imageDailyError && (imageDailyCount ?? 0) >= IMAGE_DAILY_LIMIT) {
        return errorState("Alcanzaste el límite de aportes con imagen por hoy (3 cada 24 horas). Probá de nuevo mañana.", {
          image: "Límite de imágenes por hoy alcanzado.",
        });
      }
    }

    if (rawAudioBytes) {
      const { count: audioDailyCount, error: audioDailyError } = await supabase
        .from("word_contributions")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .not("audio_path", "is", null)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (!audioDailyError && (audioDailyCount ?? 0) >= AUDIO_DAILY_LIMIT) {
        return errorState("Alcanzaste el límite de aportes con audio por hoy (3 cada 24 horas). Probá de nuevo mañana.", {
          audio: "Límite de audios por hoy alcanzado.",
        });
      }
    }
  }

  let processedMain: ProcessedImage | null = null;
  let processedThumb: ProcessedImage | null = null;

  if (rawImageBytes) {
    try {
      const processed = await processContributionImage(rawImageBytes);
      processedMain = processed.main;
      processedThumb = processed.thumbnail;
    } catch (err) {
      const message = err instanceof ImageProcessingError ? err.message : "No pudimos procesar la imagen. Probá con otro archivo.";
      return errorState(message, { image: message });
    }
  }

  const contributionId = randomUUID();
  let imagePath: string | null = null;
  let thumbnailPath: string | null = null;
  let imageSize: number | null = null;
  let thumbnailSize: number | null = null;

  if (processedMain && processedThumb) {
    imagePath = `pending/${contributionId}.webp`;
    thumbnailPath = `pending/${contributionId}-thumb.webp`;

    const { error: mainUploadError } = await supabase.storage.from(CONTRIBUTIONS_BUCKET).upload(imagePath, processedMain.buffer, {
      contentType: "image/webp",
      upsert: false,
    });
    if (mainUploadError) {
      return errorState("No pudimos subir la imagen. Probá de nuevo en unos minutos.");
    }

    const { error: thumbUploadError } = await supabase.storage.from(CONTRIBUTIONS_BUCKET).upload(thumbnailPath, processedThumb.buffer, {
      contentType: "image/webp",
      upsert: false,
    });
    if (thumbUploadError) {
      // La imagen principal ya se subió: se borra para no dejar un huérfano.
      await supabase.storage.from(CONTRIBUTIONS_BUCKET).remove([imagePath]);
      return errorState("No pudimos subir la imagen. Probá de nuevo en unos minutos.");
    }

    imageSize = processedMain.size;
    thumbnailSize = processedThumb.size;
  }

  let audioPath: string | null = null;
  let audioSize: number | null = null;

  if (rawAudioBytes && audioExt) {
    audioPath = `pending/${contributionId}.${audioExt}`;
    const { error: audioUploadError } = await supabase.storage.from(CONTRIBUTIONS_AUDIO_BUCKET).upload(audioPath, rawAudioBytes, {
      contentType: audioContentType(audioExt),
      upsert: false,
    });
    if (audioUploadError) {
      if (imagePath || thumbnailPath) {
        await supabase.storage.from(CONTRIBUTIONS_BUCKET).remove([imagePath, thumbnailPath].filter((p): p is string => Boolean(p)));
      }
      return errorState("No pudimos subir el audio. Probá de nuevo en unos minutos.");
    }
    audioSize = rawAudioBytes.byteLength;
  }

  const { error: insertError } = await supabase.from("word_contributions").insert({
    id: contributionId,
    word_id: entry.id,
    word_slug: entry.slug,
    word: entry.palabra,
    user_id: currentUser?.id ?? null,
    type: rawType,
    content,
    author_alias: authorAlias || null,
    email: emailRaw || null,
    location: location || null,
    decade: decade || null,
    image_path: imagePath,
    image_size: imageSize,
    thumbnail_path: thumbnailPath,
    thumbnail_size: thumbnailSize,
    audio_path: audioPath,
    audio_size: audioSize,
    status: "pending",
    ip_hash: ipHash,
    legal_version: LEGAL_VERSION,
  });

  if (insertError) {
    if (imagePath || thumbnailPath) {
      const orphanPaths = [imagePath, thumbnailPath].filter((p): p is string => Boolean(p));
      await supabase.storage.from(CONTRIBUTIONS_BUCKET).remove(orphanPaths);
    }
    if (audioPath) {
      await supabase.storage.from(CONTRIBUTIONS_AUDIO_BUCKET).remove([audioPath]);
    }
    return errorState("No pudimos guardar tu aporte. Probá de nuevo en unos minutos.");
  }

  // Recién acá, con el INSERT ya confirmado: si el aviso falla, el aporte
  // igual quedó guardado y el remitente igual ve éxito (ver admin-notify.ts).
  await notifyAdmin({
    kind: "contribution",
    word: entry.palabra,
    detail: CONTRIBUTION_TYPES.find((t) => t.value === rawType)?.label ?? rawType,
    createdAt: new Date(),
  });

  return { status: "success", message: SUCCESS_MESSAGE };
}
