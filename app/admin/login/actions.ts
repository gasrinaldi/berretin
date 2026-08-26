"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AdminSignInState } from "@/lib/admin-login-state";

const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_FAILURES = 5;

async function getClientIpHash(): Promise<string | null> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]!.trim() : headerList.get("x-real-ip");
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

export async function adminSignIn(_prevState: AdminSignInState, formData: FormData): Promise<AdminSignInState> {
  const password = String(formData.get("password") ?? "");
  if (!password) return { status: "error", error: "Ingresá la contraseña." };

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) return { status: "error", error: "El panel no está configurado todavía." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", error: "El panel no está disponible en este momento." };

  // admin_login_attempts no tiene policies para anon/authenticated (RLS
  // habilitada, deny-all): solo el cliente service_role puede leerla o
  // escribirla, así que el conteo de intentos y el insert usan
  // getSupabaseAdmin() en vez del cliente de sesión de arriba.
  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch {
    return { status: "error", error: "El panel no está disponible en este momento." };
  }

  const ipHash = await getClientIpHash();

  // Límite de intentos: no se distingue "contraseña incorrecta" de
  // "demasiados intentos" hasta acá para no ayudar a un atacante a saber
  // en qué estado está — igual el mensaje final es el mismo tipo de error.
  if (ipHash) {
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from("admin_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("success", false)
      .gte("created_at", since);

    if (!countError && (count ?? 0) >= RATE_LIMIT_MAX_FAILURES) {
      return { status: "error", error: "Demasiados intentos. Esperá unos minutos y volvé a probar." };
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email: adminEmail, password });
  const success = !error && data.session?.user?.email?.toLowerCase() === adminEmail;

  if (ipHash) {
    await supabaseAdmin.from("admin_login_attempts").insert({ ip_hash: ipHash, success });
  }

  if (!success) {
    return { status: "error", error: "Contraseña incorrecta." };
  }

  return { status: "success" };
}
