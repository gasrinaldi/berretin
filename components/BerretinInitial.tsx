import alphabet from "@/data/berretin-alphabet.json";

type LetterCoords = { sheet: keyof typeof alphabet.sheets; x0: number; y0: number; x1: number; y1: number; baseline: number };

const LETTERS = alphabet.letters as Record<string, LetterCoords>;
const SHEETS = alphabet.sheets;

type BerretinInitialProps = {
  letter: string;
  className?: string;
};

// Inicial grande del diccionario, recortada técnicamente (background-image +
// background-position/-size) de las dos láminas del alfabeto en
// public/brand/alphabet — nunca se regenera ni redibuja el arte, solo se
// recorta por coordenadas. Todo en unidades "em" relativas al font-size que
// ya trae .letter-big (64px desktop / 52px mobile vía la media query
// existente), así el recorte escala solo con ese mismo tamaño responsive.
// El margin-bottom negativo compensa la cola/florituras que cuelgan debajo
// del renglón real de la letra (baseline), para que un <span> vacío como
// este — que por spec usa el borde inferior de su margin como baseline —
// quede alineado con el texto vecino ("N palabras") igual que antes.
export function BerretinInitial({ letter, className }: BerretinInitialProps) {
  const coords = LETTERS[letter.toLocaleUpperCase("es")];
  if (!coords) {
    // Letra fuera del alfabeto recortado (no debería pasar con datos reales
    // del diccionario): texto plano en vez de dejar un hueco vacío.
    return <span className={className}>{letter}</span>;
  }

  const sheet = SHEETS[coords.sheet];
  const capHeight = coords.baseline - coords.y0;
  const width = (coords.x1 - coords.x0) / capHeight;
  const height = (coords.y1 - coords.y0) / capHeight;
  const tail = (coords.y1 - coords.baseline) / capHeight;
  const bgWidth = sheet.width / capHeight;
  const bgHeight = sheet.height / capHeight;
  const bgPosX = -coords.x0 / capHeight;
  const bgPosY = -coords.y0 / capHeight;

  return (
    <span
      className={className}
      role="img"
      aria-label={letter}
      style={{
        display: "inline-block",
        width: `${width}em`,
        height: `${height}em`,
        marginBottom: `${-tail}em`,
        backgroundImage: `url(${sheet.file})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${bgWidth}em ${bgHeight}em`,
        backgroundPosition: `${bgPosX}em ${bgPosY}em`,
      }}
    />
  );
}
