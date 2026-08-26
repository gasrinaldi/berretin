import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";

// Identidad de votante anónimo: cookie funcional (no publicitaria/de
// rastreo) que solo existe para permitir "un voto por palabra/aporte y
// navegador" sin cuenta. httpOnly + Secure + SameSite=Lax: nunca la lee
// JS del cliente, solo viaja same-site. El valor crudo jamás se guarda en
// la base — acá se hashea antes de cualquier lectura o escritura, igual
// que con el IP hash (ver lib/client-ip.ts). No hay fingerprinting: es un
// random generado en el servidor, sin relación con el dispositivo.
const COOKIE_NAME = "berretin_vid";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400; // ~400 días: tope real de Max-Age en los navegadores

function hashVoterId(id: string): string {
  return createHash("sha256").update(id).digest("hex");
}

// Para lecturas (¿ya voté?): no crea identidad nueva a quien nunca votó.
export async function readAnonVoterHash(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  return raw ? hashVoterId(raw) : null;
}

// Para escrituras (votar): genera y setea la cookie si todavía no existe.
export async function getOrCreateAnonVoterHash(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;
  if (existing) return hashVoterId(existing);

  const id = randomUUID();
  cookieStore.set(COOKIE_NAME, id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
  return hashVoterId(id);
}
