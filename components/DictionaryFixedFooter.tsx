"use client";

import Link from "next/link";

// Barra fija angosta, siempre visible, para el diccionario (scroll muy
// largo — el footer tradicional casi nunca se ve). Prueba visual: no
// reemplaza a <Footer />, que sigue existiendo igual que antes.
export function DictionaryFixedFooter({ total }: { total: number }) {
  return (
    <div className="fixed-footer" role="contentinfo" aria-label="Barra inferior">
      <span className="fixed-footer-brand">Berretín</span>
      <nav className="fixed-footer-nav" aria-label="Navegación">
        <Link href="/descubrir">Descubrir</Link>
        <Link href="/cuenta">Cuenta</Link>
        <Link href="/desafio">Desafío</Link>
      </nav>
      <span className="fixed-footer-count">{total.toLocaleString("es-AR")} entradas</span>
    </div>
  );
}
