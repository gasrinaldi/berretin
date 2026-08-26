"use client";

import { useRouter } from "next/navigation";

// Mismo key que usa components/Dictionary.tsx para guardar scroll/filtros
// antes de navegar a una palabra — su sola presencia confirma que esta
// pestaña realmente pasó por el diccionario (no alcanza con mirar
// history.length: cuenta también entradas ajenas a la app, como el
// resultado de Google desde el que se llegó, y volver ahí con router.back()
// mandaría al usuario afuera del sitio).
const SCROLL_STATE_KEY = "berretin:dictionary-scroll";

type BackButtonProps = {
  // La ficha de palabra ya tiene su propio vértice ornamental en el
  // margen izquierdo (.ficha-detail::before): ahí la flecha de texto
  // queda de más, se superpone.
  hideArrow?: boolean;
};

export function BackButton({ hideArrow = false }: BackButtonProps = {}) {
  const router = useRouter();

  const handleClick = () => {
    let cameFromDictionary = false;
    try {
      cameFromDictionary = sessionStorage.getItem(SCROLL_STATE_KEY) !== null;
    } catch {
      cameFromDictionary = false;
    }

    // Con estado guardado, router.back() reproduce el mismo restore de
    // filtros/bloques/scroll que ya hace Dictionary.tsx al remontarse.
    // Sin él (URL directa, buscador externo, pestaña nueva) no hay a
    // dónde "volver" de forma segura: se manda siempre al comienzo del
    // diccionario en vez de arriesgar salir del sitio.
    if (cameFromDictionary && typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  };

  return (
    <button type="button" className="back-btn" onClick={handleClick}>
      {hideArrow ? "volver al diccionario" : "← volver al diccionario"}
    </button>
  );
}
