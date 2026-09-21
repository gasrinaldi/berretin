"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Accesos discretos a Descubrir, Cuenta y Desafío, reutilizados en el
// diccionario principal y en las páginas de palabra. usePathname() marca
// el estado activo cuando estamos parados en /descubrir, /cuenta o
// /desafio — por eso pasa a client component (antes no lo necesitaba).
//
// Prueba visual (opción 9): la variante grande del diccionario
// (.dictionary-intro-nav) pasa a 3 bloques con ícono + subtítulo. El
// ícono/subtítulo se agregan siempre en el markup pero quedan ocultos por
// CSS en la variante chica (el nav de /descubrir, /cuenta, etc., que no
// cambia) — mismo componente, sin duplicar lógica.
function CompassIcon() {
  return (
    <svg className="aux-nav-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="aux-nav-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" strokeLinecap="round" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg className="aux-nav-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M7 4h10v4a5 5 0 0 1-10 0z" />
      <path d="M7 5H4.5A1.5 1.5 0 0 0 3 6.5C3 8.5 4.5 10 7 10" />
      <path d="M17 5h2.5A1.5 1.5 0 0 1 21 6.5c0 2-1.5 3.5-4 3.5" />
      <path d="M12 13v3M9 20h6M9.5 16.5h5l.5 3.5h-6z" strokeLinejoin="round" />
    </svg>
  );
}

const LINKS = [
  { href: "/descubrir", label: "descubrir", sub: "Explorá", Icon: CompassIcon },
  { href: "/cuenta", label: "cuenta", sub: "Tu perfil", Icon: UserIcon },
  { href: "/desafio", label: "desafío", sub: "Jugá y aprendé", Icon: TrophyIcon },
] as const;

export function AuxNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={className ? `aux-nav ${className}` : "aux-nav"}>
      {LINKS.map(({ href, label, sub, Icon }) => (
        <Link key={href} href={href} className={pathname === href ? "active" : undefined}>
          <Icon />
          <span className="aux-nav-text">
            <span className="aux-nav-label">{label}</span>
            <span className="aux-nav-sub">{sub}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}
