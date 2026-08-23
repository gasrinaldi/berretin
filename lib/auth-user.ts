import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string };

// getUser() valida el JWT contra el servidor de Supabase (a diferencia de
// getSession(), que solo lee la cookie). Solo debe llamarse desde server
// actions o componentes server ya marcados dynamic — nunca desde una
// página con ISR/estática, o quedaría "congelada" en el estado de la
// primera visita (mismo error que hubo que corregir en /admin/aportes).
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;
  return { id: user.id, email: user.email };
}
