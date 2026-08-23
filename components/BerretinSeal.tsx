import Image from "next/image";

// Sello oficial de Berretín ("archivo del habla"): arte final entregado
// como PNG transparente (public/brand/berretin-sello.png). Wrapper único
// para no duplicar el <Image> en cada lugar que lo usa — puramente
// decorativo, así que siempre aria-hidden.
export function BerretinSeal({ className }: { className?: string }) {
  return (
    <Image
      className={className}
      src="/brand/berretin-sello.png"
      alt=""
      aria-hidden="true"
      width={1560}
      height={1940}
      style={{ objectFit: "contain" }}
    />
  );
}
