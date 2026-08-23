"use client";

import { useState } from "react";
import { ContributeForm } from "@/components/ContributeForm";

type ContributeButtonProps = {
  wordSlug: string;
  wordPalabra: string;
};

export function ContributeButton({ wordSlug, wordPalabra }: ContributeButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="ficha-action" onClick={() => setOpen(true)}>
        <svg className="ficha-action-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        aportar información
      </button>
      {open && <ContributeForm wordSlug={wordSlug} wordPalabra={wordPalabra} onClose={() => setOpen(false)} />}
    </>
  );
}
