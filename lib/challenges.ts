export type ChallengeRecord = {
  id: string;
  title: string;
  description: string;
  wordSlug: string | null;
  periodLabel: string;
  isActive: boolean;
  createdAt: string;
};

export const CHALLENGE_TITLE_MAX = 140;
export const CHALLENGE_DESCRIPTION_MAX = 1000;
export const CHALLENGE_PERIOD_MAX = 40;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapChallengeRow(row: any): ChallengeRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    wordSlug: row.word_slug,
    periodLabel: row.period_label,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}
