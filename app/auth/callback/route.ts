import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Destino de todo magic link de Supabase Auth (admin y usuarios de la
// comunidad por igual): intercambia el code por una sesión (cookies) y
// redirige a "next" (definido por quien pidió el link — /admin/aportes
// para el login de admin, /cuenta para el login público). Si algo falla,
// vuelve al login que corresponda.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/cuenta";

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${safeNext}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}${safeNext.startsWith("/admin") ? "/admin/login" : "/cuenta"}`);
}
