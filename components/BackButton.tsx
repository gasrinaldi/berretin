"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = {
  // La ficha de palabra ya tiene su propio vértice ornamental en el
  // margen izquierdo (.ficha-detail::before): ahí la flecha de texto
  // queda de más, se superpone.
  hideArrow?: boolean;
};

export function BackButton({ hideArrow = false }: BackButtonProps = {}) {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  };

  return (
    <button type="button" className="back-btn" onClick={handleClick}>
      {hideArrow ? "volver al diccionario" : "← volver al diccionario"}
    </button>
  );
}
