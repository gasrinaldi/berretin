import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminUser = { id: string; email: string };

// getUser() valida el JWT contra el servidor de Supabase (a diferencia de
// getSession(), que solo lee la cookie sin verificarla) — es la forma
// segura de chequear identidad del lado del servidor.
export async function getAdminUser(): Promise<AdminUser | null> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || user.email.toLowerCase() !== adminEmail) return null;

  return { id: user.id, email: user.email };
}
