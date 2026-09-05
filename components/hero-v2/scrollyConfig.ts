// Recorte de SCROLLY_CONFIG (berretinv2/src/components/scrollytelling/scrollyConfig.ts):
// solo las claves que efectivamente usan los componentes portados
// (GroundCobblestones, AtmosphericFog, BerretinScrollytellingHero). El
// resto del config original (assets, camera, mouseParallax, elements.
// background/crowd/tanguero/youths, colors) pertenece a otra variante del
// hero y no se porta.
export const SCROLLY_CONFIG = {
  mobile: {
    breakpoint: 768,
  },
  elements: {
    ground: {
      position: [0, -1.82, 0] as [number, number, number],
      size: [36, 30] as [number, number],
    },
    fog: {
      color: "#0e0b08",
      density: 0.022,
      particleCount: 110,
    },
  },
};
