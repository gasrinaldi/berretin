"use client";

import { useState } from "react";
import { UsoTab } from "@/components/gallery/UsoTab";
import { VeTab } from "@/components/gallery/VeTab";

type WordTabsProps = {
  wordSlug: string;
  definicion: string;
  categorias: string[];
  origenes: string[];
};

const TABS = [
  { value: "significado", label: "Significado" },
  { value: "uso", label: "Cómo se usa" },
  { value: "ve", label: "Cómo se ve" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

// El panel "Significado" se renderiza siempre (con los datos que ya trae
// la página estática, sin fetch aparte) para que el contenido principal
// siga siendo parte del HTML servido y no dependa de JS ni de una llamada
// extra. Las otras dos pestañas recién piden datos cuando se activan.
export function WordTabs({ wordSlug, definicion, categorias, origenes }: WordTabsProps) {
  const [active, setActive] = useState<TabValue>("significado");
  const badges = [...categorias, ...origenes];

  return (
    <div className="word-tabs">
      <div className="filters word-tabs-nav" role="tablist">
        {TABS.map((tab) => (
          <button key={tab.value} type="button" role="tab" aria-selected={active === tab.value} className={`filter-chip${active === tab.value ? " active" : ""}`} onClick={() => setActive(tab.value)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="word-tabs-panel" role="tabpanel" hidden={active !== "significado"}>
        <p className="word-definition">{definicion}</p>
        {badges.length > 0 && (
          <div className="word-badges">
            {badges.map((badge) => (
              <span key={badge} className="ficha-badge">
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="word-tabs-panel" role="tabpanel" hidden={active !== "uso"}>
        {active === "uso" && <UsoTab wordSlug={wordSlug} />}
      </div>

      <div className="word-tabs-panel" role="tabpanel" hidden={active !== "ve"}>
        {active === "ve" && <VeTab wordSlug={wordSlug} />}
      </div>
    </div>
  );
}
