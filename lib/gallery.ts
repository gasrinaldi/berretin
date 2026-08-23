import type { ContributionType } from "@/lib/contributions";

// Qué tipos de aporte aprobado aparecen en cada pestaña de la ficha de
// palabra (Etapa 5). "Significado" no lista nada de acá: es la definición
// actual del diccionario, ya disponible en la página sin fetch aparte.
export const GALLERY_USO_TYPES: ContributionType[] = ["example", "alternative_meaning", "regional", "generational", "audio"];
export const GALLERY_VE_TYPES: ContributionType[] = ["illustration", "photo"];

export type GalleryTab = "uso" | "ve";

export type GalleryContribution = {
  id: string;
  type: ContributionType;
  content: string;
  authorAlias: string | null;
  // Alias del perfil público del autor (public.profiles.alias), solo si
  // tiene uno — nunca el user_id. Nulo para aportes anónimos o de alguien
  // sin perfil creado: en ambos casos el nombre se muestra sin link.
  authorProfileAlias: string | null;
  location: string | null;
  decade: string | null;
  createdAt: string;
  hasImage: boolean;
  hasAudio: boolean;
  thumbnailSignedUrl: string | null;
  voteCount: number;
  myVote: boolean;
};

export type GalleryPage = { rows: GalleryContribution[]; total: number; hasMore: boolean };

export const GALLERY_PAGE_SIZE = 12;
export const GALLERY_THUMB_TTL_SECONDS = 300;
export const GALLERY_FULL_TTL_SECONDS = 120;
