import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { normalizeEntry, validateEntry } from './lib/catalog-validator.mjs';

export interface CatalogEntry {
  slug: string;
  type: 'miniapp' | 'skill' | 'plugin' | 'software' | 'conteudo';
  name: string;
  tagline: string;
  audience: Array<'negocio' | 'tecnico'>;
  status: 'stable' | 'beta' | 'archived';
  license: 'MIT' | 'Apache-2.0' | 'CC-BY-4.0' | 'CC-BY-SA-4.0' | 'CC-BY-NC-ND-4.0' | 'gratuita-fechada';
  license_note?: string;
  description?: string;
  department?: string;
  works_with?: string[];
  url: string;
  repo?: string;
  docs?: string;
  release?: string;
  pro?: { label: string; url: string };
  includes?: string[];
  preview?: { src: string; alt: string; caption: string };
  featured?: boolean;
  tags?: string[];
  launched_at: string;
  updated_at: string;
  owner?: string;
}

const catalog = defineCollection({
  loader: glob({
    pattern: '*/*.yaml',
    base: './catalog',
    // Sem isto o glob usaria o campo slug como id, e slugs iguais em tipos diferentes colidiriam.
    generateId: ({ entry }) => entry.replace(/\.yaml$/, ''),
  }),
  schema: z.preprocess(
    normalizeEntry,
    z
      .record(z.string(), z.unknown())
      .superRefine((data, ctx) => {
        for (const message of validateEntry(data)) {
          ctx.addIssue({ code: 'custom', message });
        }
      })
      .transform((data) => data as unknown as CatalogEntry),
  ),
});

export const collections = { catalog };
