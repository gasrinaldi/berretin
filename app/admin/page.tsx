import { redirect } from "next/navigation";

// /admin a secas no tiene contenido propio: entrar a /admin/aportes ya
// hace su propio chequeo de sesión (getAdminUser + redirect a
// /admin/login) — acá solo hace falta mandar para ese lado en vez de
// caer en el 404 genérico del diccionario.
export default function AdminIndexPage() {
  redirect("/admin/aportes");
}
