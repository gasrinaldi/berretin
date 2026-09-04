// Rutas portadas de berretinv2/src/components/scrollytelling/pack/packConfig.ts
// (PACK_ASSETS), apuntando a public/hero-v2/ en vez de public/assets/.
// El wordmark reusa el asset real de V1 (/brand/berretin-wordmark.png) en
// vez de duplicarlo. Se quita `storyboardRef`: no la usa ningún componente
// portado (era solo una imagen de referencia del mockup, no se carga).
export const PACK_ASSETS = {
  fondo: "/hero-v2/01-fondo-puerto-la-boca.png",
  multitud: "/hero-v2/02-multitud-profunda.png",
  jovenIzquierdaSentado: "/hero-v2/03-joven-izquierda-sentado.png",
  jovenDerechaParado: "/hero-v2/04-joven-derecha-parado.png",
  jovenDerechaSentado: "/hero-v2/05-joven-derecha-sentado.png",
  tanguero01: "/hero-v2/06-tanguero-caminata-01.png",
  tanguero02: "/hero-v2/07-tanguero-caminata-02.png",
  tanguero03: "/hero-v2/08-tanguero-caminata-03.png",
  brumaInferior: "/hero-v2/09-bruma-inferior.png",
  humoVignette: "/hero-v2/10-humo-lateral-vignette.png",
  wordmark: "/brand/berretin-wordmark.png",
};
