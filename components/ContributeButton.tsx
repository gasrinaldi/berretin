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
      <button type="button" className="contribute-btn" onClick={() => setOpen(true)}>
        aportar a esta palabra
      </button>
      {open && <ContributeForm wordSlug={wordSlug} wordPalabra={wordPalabra} onClose={() => setOpen(false)} />}
    </>
  );
}
