"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOutAdmin } from "@/app/admin/aportes/actions";

// Navegación mínima entre las secciones del panel — antes cada página
// vivía aislada, sin forma de pasar de una a la otra ni (en /admin/desafio)
// de cerrar sesión.
export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="admin-nav">
      <Link href="/admin/aportes" className={pathname === "/admin/aportes" ? "active" : undefined}>
        aportes
      </Link>
      <Link href="/admin/desafio" className={pathname === "/admin/desafio" ? "active" : undefined}>
        desafío
      </Link>
      <Link href="/admin/regiones" className={pathname === "/admin/regiones" ? "active" : undefined}>
        regiones
      </Link>
      <button
        type="button"
        className="back-btn"
        onClick={() => {
          signOutAdmin().then(() => router.push("/admin/login"));
        }}
      >
        cerrar sesión
      </button>
    </nav>
  );
}
