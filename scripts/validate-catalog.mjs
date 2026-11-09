#!/usr/bin/env node
// Uso: node scripts/validate-catalog.mjs [pasta-do-catalogo]
// Além do schema, confere o que JSON Schema não enxerga: arquivo x conteúdo,
// duplicidade entre arquivos e travessão.
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { validateEntry } from '../src/lib/catalog-validator.mjs';

const root = resolve(process.argv[2] ?? fileURLToPath(new URL('../catalog', import.meta.url)));

const errors = [];
const seen = { slug: new Map(), url: new Map() };
let total = 0;
let featured = 0;
const combos = [];

const types = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());

for (const dir of types) {
  for (const file of readdirSync(join(root, dir.name)).filter((f) => f.endsWith('.yaml'))) {
    const label = `${dir.name}/${file}`;
    const raw = readFileSync(join(root, dir.name, file), 'utf8');
    total += 1;

    if (/[–—]/.test(raw)) errors.push(`${label}: tem travessão`);

    const data = parse(raw);
    for (const message of validateEntry(data)) errors.push(`${label}: ${message}`);

    if (data.slug !== basename(file, '.yaml')) errors.push(`${label}: slug difere do nome do arquivo`);
    if (data.type !== dir.name) errors.push(`${label}: type difere da pasta`);
    if (data.featured) featured += 1;
    if (data.includes) combos.push({ label, includes: data.includes });

    for (const key of ['slug', 'url']) {
      const other = seen[key].get(data[key]);
      if (other) errors.push(`${label}: ${key} repetido com ${other}`);
      seen[key].set(data[key], label);
    }
  }
}

for (const { label, includes } of combos) {
  for (const slug of includes) {
    if (!seen.slug.has(slug)) errors.push(`${label}: includes cita ${slug}, que não existe`);
  }
}

if (total === 0) errors.push('catálogo: nenhuma entrada encontrada');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} erro(s) em ${total} entrada(s).`);
  process.exit(1);
}

console.log(`Catálogo ok: ${total} entradas, ${featured} no rodízio de destaques.`);
