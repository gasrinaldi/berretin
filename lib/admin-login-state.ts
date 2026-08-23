// Tipo y estado inicial del formulario de login de admin. Vive en su
// propio módulo (sin ninguna dependencia server-only) porque LoginForm.tsx
// lo importa desde un componente cliente: si estuviera junto a
// getAdminUser() en lib/admin-auth.ts, arrastraría next/headers al bundle
// del navegador y rompería el build.
export type AdminSignInState = { status: "idle" | "error" | "success"; error?: string };
export const initialAdminSignInState: AdminSignInState = { status: "idle" };
