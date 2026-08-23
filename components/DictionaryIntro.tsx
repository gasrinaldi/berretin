import { BerretinSeal } from "@/components/BerretinSeal";

// Encabezado editorial de la sección de consulta del diccionario
// principal — mismo lenguaje visual que la ficha individual (rótulo
// dorado, título serif, sello decorativo).
export function DictionaryIntro() {
  return (
    <div className="consult-intro">
      <p className="consult-eyebrow">archivo del habla · consulta</p>
      <h1 className="consult-title">Buscá. Filtrá. Encontrá.</h1>
      <BerretinSeal className="consult-seal" />
    </div>
  );
}
