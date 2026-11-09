import type { APIRoute } from 'astro';
import { getEntries } from '../lib/catalog';

export const GET: APIRoute = async ({ site }) => {
  const entries = await getEntries();
  const items = entries.map(({ owner: _owner, ...entry }) => ({
    ...entry,
    url: new URL(entry.url, site).href,
  }));

  return new Response(JSON.stringify({ version: 1, count: items.length, items }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
