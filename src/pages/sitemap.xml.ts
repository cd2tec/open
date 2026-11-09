import type { APIRoute } from 'astro';
import { SHELF_ORDER, filterPath, getEntries, matches, type Audience } from '../lib/catalog';

export const GET: APIRoute = async ({ site }) => {
  const entries = await getEntries();
  const audiences: Audience[] = ['negocio', 'tecnico'];
  // As combinações de público com tipo ficam fora de propósito: são noindex.
  const paths = [
    '/',
    ...audiences.filter((a) => entries.some((e) => matches(e, a))).map((a) => filterPath(a)),
    ...SHELF_ORDER.filter((t) => entries.some((e) => matches(e, undefined, t))).map((t) => filterPath(undefined, t)),
  ];

  const urls = paths.map((path) => `  <url><loc>${new URL(path, site).href}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
