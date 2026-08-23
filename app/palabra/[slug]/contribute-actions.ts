"use server";

import { createHash, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { getEntryBySlug } from "@/lib/dictionary";
import { getSupabaseAdmin, CONTRIBUTIONS_BUCKET } from "@/lib/supabase-admin";
import { detectImageType } from "@/lib/image-signature";
import { processContributionImage, ImageProcessingError, type ProcessedImage } from "@/lib/image-processing";
import {
  isContributionType,
  sanitizeText,
  validateEmail,
  TYPES_WITH_IMAGE,
  CONTENT_MIN,
  CONTENT_MAX,
  ALIAS_MAX,
  LOCATION_MAX,
  DECADE_MAX,
  MAX_IMAGE_BYTES,
  SUCCESS_MESSAGE,
  type ContributionFieldErrors,
  type ContributeFormState,
} from "@/lib/contributions";

const RATE_LIMIT_SECONDS = 20;
const DAILY_LIMIT = 20;
const IMAGE_DAILY_LIMIT = 3;

function errorState(message: string, fieldErrors?: ContributionFieldErrors): ContributeFormState {
  return { status: "error", message, fieldErrors };
}

async function getClientIpHash(): Promise<string | null> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]!.trim() : headerList.get("x-real-ip");
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
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

  const consent = formData.get("consent");
  if (consent !== "on") fieldErrors.consent = "Necesitamos tu confirmación para poder recibir el aporte.";

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

  if (Object.keys(fieldErrors).length > 0) {
    return errorState("Revisá los campos marcados.", fieldErrors);
  }

  const ipHash = await getClientIpHash();

  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return errorState("El formulario de aportes no está disponible en este momento. Probá más tarde.");
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

  const { error: insertError } = await supabase.from("word_contributions").insert({
    id: contributionId,
    word_id: entry.id,
    word_slug: entry.slug,
    word: entry.palabra,
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
    status: "pending",
    ip_hash: ipHash,
  });

  if (insertError) {
    if (imagePath || thumbnailPath) {
      const orphanPaths = [imagePath, thumbnailPath].filter((p): p is string => Boolean(p));
      await supabase.storage.from(CONTRIBUTIONS_BUCKET).remove(orphanPaths);
    }
    return errorState("No pudimos guardar tu aporte. Probá de nuevo en unos minutos.");
  }

  return { status: "success", message: SUCCESS_MESSAGE };
}
