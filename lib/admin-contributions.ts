import type { ContributionType } from "@/lib/contributions";

export type ContributionStatus = "pending" | "approved" | "rejected";

export type ContributionRow = {
  id: string;
  wordId: string;
  wordSlug: string;
  word: string;
  type: ContributionType;
  content: string;
  authorAlias: string | null;
  email: string | null;
  location: string | null;
  decade: string | null;
  imagePath: string | null;
  imageSize: number | null;
  thumbnailPath: string | null;
  thumbnailSize: number | null;
  status: ContributionStatus;
  moderationNote: string | null;
  ipHash: string | null;
  createdAt: string;
  updatedAt: string;
  thumbnailSignedUrl: string | null;
  // Definición actual del diccionario, para comparar/fusionar — solo se
  // completa en tipos "correction" y "alternative_meaning".
  currentDefinition: string | null;
};

export type ListFilters = {
  status: ContributionStatus | "all";
  type: ContributionType | "all";
  word: string;
  dateFrom: string;
  dateTo: string;
  page: number;
};

export const DEFAULT_FILTERS: ListFilters = { status: "pending", type: "all", word: "", dateFrom: "", dateTo: "", page: 0 };

export type Counts = { pending: number; approved: number; rejected: number };

export type ListResult = { rows: ContributionRow[]; total: number; hasMore: boolean; counts: Counts };

export type ActionResult = { ok: true } | { ok: false; error: string };

export const LIST_PAGE_SIZE = 20;
export const MODERATION_NOTE_MAX = 500;
export const BLOCK_REASON_MAX = 300;
export const THUMBNAIL_URL_TTL_SECONDS = 300;
export const ORIGINAL_URL_TTL_SECONDS = 120;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapContributionRow(row: any): Omit<ContributionRow, "thumbnailSignedUrl" | "currentDefinition"> {
  return {
    id: row.id,
    wordId: row.word_id,
    wordSlug: row.word_slug,
    word: row.word,
    type: row.type,
    content: row.content,
    authorAlias: row.author_alias,
    email: row.email,
    location: row.location,
    decade: row.decade,
    imagePath: row.image_path,
    imageSize: row.image_size,
    thumbnailPath: row.thumbnail_path,
    thumbnailSize: row.thumbnail_size,
    status: row.status,
    moderationNote: row.moderation_note,
    ipHash: row.ip_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
