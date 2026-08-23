import Link from "next/link";

// Accesos discretos a Cuenta y Desafío, reutilizados en el diccionario
// principal y en las páginas de palabra.
export function AuxNav({ className }: { className?: string }) {
  return (
    <nav className={className ? `aux-nav ${className}` : "aux-nav"}>
      <Link href="/cuenta">cuenta</Link>
      <Link href="/desafio">desafío</Link>
    </nav>
  );
}
