"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Accesos discretos a Descubrir, Cuenta y Desafío, reutilizados en el
// diccionario principal y en las páginas de palabra. usePathname() marca
// el estado activo cuando estamos parados en /descubrir, /cuenta o
// /desafio — por eso pasa a client component (antes no lo necesitaba).
export function AuxNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={className ? `aux-nav ${className}` : "aux-nav"}>
      <Link href="/descubrir" className={pathname === "/descubrir" ? "active" : undefined}>
        descubrir
      </Link>
      <Link href="/cuenta" className={pathname === "/cuenta" ? "active" : undefined}>
        cuenta
      </Link>
      <Link href="/desafio" className={pathname === "/desafio" ? "active" : undefined}>
        desafío
      </Link>
    </nav>
  );
}
