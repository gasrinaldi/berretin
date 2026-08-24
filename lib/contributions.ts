// Constantes y validaciones compartidas entre el formulario (cliente) y la
// server action (autoridad real). No contiene secretos: es seguro importarlo
// desde un componente cliente.

export type ContributionType = "example" | "correction" | "alternative_meaning" | "illustration" | "photo" | "regional" | "generational" | "audio";

export type ContributionTypeDef = {
  value: ContributionType;
  label: string;
  contentLabel: string;
  placeholder: string;
};

export const CONTRIBUTION_TYPES: ContributionTypeDef[] = [
  { value: "example", label: "Ejemplo de uso", contentLabel: "Ejemplo", placeholder: "Escribí una frase donde se use la palabra..." },
  { value: "correction", label: "Corrección", contentLabel: "¿Qué habría que corregir?", placeholder: "Contá qué está mal o incompleto en la ficha actual..." },
  { value: "alternative_meaning", label: "Significado alternativo", contentLabel: "Significado alternativo", placeholder: "Describí el otro significado que conocés..." },
  { value: "illustration", label: "Dibujo o ilustración", contentLabel: "Sobre tu dibujo", placeholder: "Contanos algo sobre la ilustración que vas a subir..." },
  { value: "photo", label: "Fotografía", contentLabel: "Sobre la foto", placeholder: "Contanos algo sobre la foto que vas a subir..." },
  { value: "regional", label: "Información regional", contentLabel: "Uso regional", placeholder: "¿Cómo se usa en tu zona?..." },
  { value: "generational", label: "Información generacional", contentLabel: "Uso generacional", placeholder: "¿En qué época o generación se usa así?..." },
  { value: "audio", label: "Audio", contentLabel: "Sobre tu audio", placeholder: "Contanos algo sobre el audio que vas a subir (pronunciación, uso oral, etc.)..." },
];

export const TYPES_WITH_IMAGE: ContributionType[] = ["illustration", "photo"];
export const TYPES_WITH_AUDIO: ContributionType[] = ["audio"];

export function isContributionType(value: string): value is ContributionType {
  return CONTRIBUTION_TYPES.some((t) => t.value === value);
}

export const CONTENT_MIN = 3;
export const CONTENT_MAX = 2000;
export const ALIAS_MAX = 80;
export const LOCATION_MAX = 120;
export const DECADE_MAX = 40;
export const EMAIL_MAX = 254;

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const ALLOWED_IMAGE_LABEL = "JPG, PNG o WebP";

export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_AUDIO_LABEL = "MP3, WAV, OGG o WebM";

// Versión (fecha) de Términos/Privacidad/Reglas de aportes vigente — se
// guarda tal cual en cada aporte (columna legal_version) para poder saber
// bajo qué texto legal aceptó cada remitente, aunque el texto cambie más
// adelante. Si se edita el contenido legal de fondo, actualizar acá.
export const LEGAL_VERSION = "2026-08-24";

export const CONSENT_TERMS_TEXT = "Acepto los Términos de uso y la Política de privacidad.";
export const CONSENT_AUTHORSHIP_TEXT =
  "Declaro que soy autor/a del contenido o tengo autorización para compartirlo, y autorizo a Berretín a almacenarlo, adaptarlo técnicamente, publicarlo y mostrarlo dentro del proyecto y sus canales oficiales.";
export const CONSENT_NOTE = "El autor conserva la propiedad del contenido — la autorización a Berretín es gratuita, no exclusiva y limitada al funcionamiento y difusión del proyecto.";
export const EMAIL_NOTE = "Es opcional y nunca se muestra públicamente: solo se usa para contactarte sobre este aporte, si hace falta.";
export const SUCCESS_MESSAGE = "¡Gracias por aportar a Berretín! Tu propuesta quedó pendiente de revisión.";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContributionFieldErrors = Partial<
  Record<"type" | "content" | "authorAlias" | "email" | "location" | "decade" | "image" | "audio" | "consentTerms" | "consentAuthorship", string>
>;

// Vive fuera de contribute-actions.ts porque un archivo "use server" solo
// puede exportar funciones async: este tipo y esta constante son un valor
// y un tipo, no una acción, así que no pueden vivir ahí.
export type ContributeFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: ContributionFieldErrors;
};

export const initialContributeState: ContributeFormState = { status: "idle" };

// Recorta espacios, quita cualquier fragmento con forma de etiqueta HTML y
// normaliza saltos de línea repetidos. Se usa igual en cliente y servidor;
// el servidor es la autoridad, el cliente solo la usa para feedback rápido.
export function sanitizeText(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

export function validateEmail(value: string): boolean {
  return value.length <= EMAIL_MAX && EMAIL_RE.test(value);
}
