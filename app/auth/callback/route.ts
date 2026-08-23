import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Destino del magic link de Supabase Auth: intercambia el code por una
// sesión (cookies) y redirige al panel. Si algo falla, vuelve al login.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/admin/aportes`);
    }
  }

  return NextResponse.redirect(`${origin}/admin/login`);
}
