// Fonte única de validação: tanto o Astro quanto o CI passam por aqui,
// e a regra mora só em catalog/schema.json.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from '../../catalog/schema.json' with { type: 'json' };

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

// O parser YAML do Astro transforma 2026-11-08 em Date; o schema espera texto.
export function normalizeEntry(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(normalizeEntry);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalizeEntry(v)]));
  }
  return value;
}

export function validateEntry(data) {
  if (!validate(data)) return validate.errors.map((e) => `${e.instancePath || '(raiz)'} ${e.message}`);
  if (!data.preview) return [];
  const paths = [data.preview.src, data.preview.src.replace('/prints/', '/prints/thumb/')];
  return paths
    .filter((path) => !existsSync(join(process.cwd(), 'public', path)))
    .map((path) => `/preview/src arquivo não encontrado em public${path}`);
}
