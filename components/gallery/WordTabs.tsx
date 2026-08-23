"use client";

import { useState } from "react";
import { UsoTab } from "@/components/gallery/UsoTab";
import { VeTab } from "@/components/gallery/VeTab";
import { BerretinSeal } from "@/components/BerretinSeal";

type WordTabsProps = {
  wordSlug: string;
  definicion: string;
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
export function WordTabs({ wordSlug, definicion }: WordTabsProps) {
  const [active, setActive] = useState<TabValue>("significado");

  return (
    <div className="ficha-detail-tabs">
      <div className="ficha-detail-tabs-nav" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active === tab.value}
            className={`ficha-tab-btn${active === tab.value ? " active" : ""}`}
            onClick={() => setActive(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="ficha-detail-panel" role="tabpanel" hidden={active !== "significado"}>
        <div className="ficha-definition-block">
          <span className="ficha-definition-label">Definición</span>
          <p className="ficha-definition-text">{definicion}</p>
        </div>
        <BerretinSeal className="ficha-detail-seal" />
      </div>

      <div className="ficha-detail-panel" role="tabpanel" hidden={active !== "uso"}>
        {active === "uso" && <UsoTab wordSlug={wordSlug} />}
      </div>

      <div className="ficha-detail-panel" role="tabpanel" hidden={active !== "ve"}>
        {active === "ve" && <VeTab wordSlug={wordSlug} />}
      </div>
    </div>
  );
}
