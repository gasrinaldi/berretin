// Clave de la fila en site_settings para el modo mantenimiento. Constante
// compartida entre proxy.ts (lectura en cada request) y las server actions
// de /admin/sitio (lectura/escritura) para no repetir el string a mano.
export const MAINTENANCE_MODE_KEY = "maintenance_mode";
