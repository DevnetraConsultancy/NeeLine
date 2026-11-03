/** Public base URL, used for canonical links, Open Graph and the sitemap. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

export const CONTACT_EMAIL = "devnetraconsultancy@gmail.com";
export const INSTAGRAM_URL = "https://www.instagram.com/scien_nee/";
export const INSTAGRAM_HANDLE = "@scien_nee";
export const CREDIT_LINE = "Developed in Collaboration with Academia | Devnetra Consultancy";
