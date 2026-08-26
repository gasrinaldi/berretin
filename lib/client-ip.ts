import { createHash } from "node:crypto";
import { headers } from "next/headers";

// En Vercel, x-vercel-forwarded-for la arma el propio edge de Vercel y no
// reenvía lo que mande el cliente (a diferencia de x-forwarded-for, cuyo
// primer valor SÍ puede ser falsificado por quien hace el request). Por
// eso es la fuente confiable de la IP real en producción. x-forwarded-for
// y x-real-ip quedan solo de fallback para correr local (next dev), donde
// no hay edge de Vercel en el medio y esa cabecera no existe.
export async function getClientIpHash(): Promise<string | null> {
  const headerList = await headers();
  const ip =
    headerList.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip");
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}
