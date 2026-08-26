import type { ContributionType } from "@/lib/contributions";

// Qué tipos de aporte aprobado aparecen en cada pestaña de la ficha de
// palabra. "Cómo se usa" es solo `example`. "Cómo se ve" es solo `image`.
// "Cómo se pronuncia" es solo `audio`. Los significados alternativos y la
// información regional/generacional se resuelven aparte y se muestran
// dentro de "Significado", debajo de la definición principal — nunca acá.
// `correction` nunca se lista en ninguna pestaña pública: es solo para
// moderación.
export const GALLERY_USO_TYPES: ContributionType[] = ["example"];
export const GALLERY_VE_TYPES: ContributionType[] = ["image"];
export const GALLERY_PRONUNCIA_TYPES: ContributionType[] = ["audio"];
export const GALLERY_SIGNIFICADO_ALT_TYPES: ContributionType[] = ["alternative_meaning"];
export const GALLERY_SIGNIFICADO_REGIONAL_TYPES: ContributionType[] = ["regional", "generational"];

export type GalleryTab = "uso" | "ve" | "pronuncia" | "significado_alt" | "significado_regional";

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
