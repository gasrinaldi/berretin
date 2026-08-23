import Link from "next/link";
import type { GalleryContribution } from "@/lib/gallery";

// Autor + ubicación + década de un aporte aprobado. El autor se linkea a
// /perfil/[alias] solo si tiene perfil público (authorProfileAlias); los
// aportes anónimos o sin perfil quedan como texto plano, sin link.
export function ContributionMeta({ row }: { row: GalleryContribution }) {
  const rest = [row.location, row.decade].filter(Boolean).join(" · ");

  return (
    <>
      {row.authorAlias && (row.authorProfileAlias ? <Link href={`/perfil/${row.authorProfileAlias}`}>{row.authorAlias}</Link> : <span>{row.authorAlias}</span>)}
      {row.authorAlias && rest && " · "}
      {rest}
    </>
  );
}
