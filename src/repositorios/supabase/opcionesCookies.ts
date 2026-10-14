import type { CookieOptionsWithName } from "@supabase/ssr";

// El navegador nunca usa Supabase, así que los tokens pueden quedar fuera del alcance del JavaScript de la
// página (httpOnly): un XSS no podría robar la sesión. La librería por defecto los deja accesibles.
export const opcionesCookies: CookieOptionsWithName = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};
