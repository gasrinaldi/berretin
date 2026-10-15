import Link from "next/link";
import type { DictionaryEntry } from "@/lib/dictionary";

// Ficha para las páginas hub SEO (/letra, /categoria): mismo markup y mismas
// clases que components/WordCard.tsx (.ficha*), pero Server Component y sin
// framer-motion — el link a /diccionario/[slug] y el texto salen en el HTML
// inicial, sin hidratación.
export function SeoWordCard({ entry }: { entry: DictionaryEntry }) {
  const badges = [...entry.categorias, ...entry.origenes];

  return (
    <Link href={`/diccionario/${entry.slug}`} className="ficha">
      <span className="ficha-word">{entry.palabra}</span>
      <span className="ficha-content">
        <span className="ficha-meaning">{entry.definicion}</span>
        {badges.length > 0 && (
          <span className="ficha-badges">
            {badges.map((badge) => (
              <span key={badge} className="ficha-badge">
                {badge}
              </span>
            ))}
          </span>
        )}
      </span>
    </Link>
  );
}
