import { getCollection } from 'astro:content';
import type { CatalogEntry } from '../content.config';

export type Audience = 'negocio' | 'tecnico';
export type ResourceType = CatalogEntry['type'];

export type ShelfKey = 'miniapp' | 'skills' | 'software' | 'conteudo';

export const TYPES: Record<ResourceType, { singular: string; action: string }> = {
  miniapp: { singular: 'Miniapp', action: 'Abrir miniapp' },
  plugin: { singular: 'Plugin', action: 'Ver plugin' },
  software: { singular: 'Software', action: 'Conhecer' },
  skill: { singular: 'Skill', action: 'Ver skill' },
  conteudo: { singular: 'Conteúdo', action: 'Ler' },
};

export const SHELF_ORDER: ShelfKey[] = ['miniapp', 'skills', 'software', 'conteudo'];

export const SHELVES: Record<ShelfKey, { path: string; plural: string; blurb: string; types: ResourceType[] }> = {
  miniapp: {
    path: 'miniapps',
    plural: 'Miniapps',
    blurb: 'De uso gratuito. Abrem no navegador, sem instalar nada.',
    types: ['miniapp'],
  },
  skills: {
    path: 'skills',
    plural: 'Skills e plugins',
    blurb:
      'Skill é uma instrução pronta para o seu assistente de IA. Plugin é um combo de skills que se instala de uma vez. Relatórios e painel puxam os números do seu ERP pelo Archeo MCP Creator ou de um arquivo exportado do sistema. Grátis para testar na sua empresa.',
    types: ['plugin', 'skill'],
  },
  software: {
    path: 'software',
    plural: 'Software',
    blurb: 'Programas para baixar e rodar na sua máquina.',
    types: ['software'],
  },
  conteudo: {
    path: 'conteudo',
    plural: 'Conteúdo',
    blurb: 'Metodologias, textos e planilhas de apoio.',
    types: ['conteudo'],
  },
};

export const AUDIENCES: Record<Audience, { path: string; label: string; heading: string }> = {
  negocio: { path: 'negocio', label: 'Negócio', heading: 'para o negócio' },
  tecnico: { path: 'tecnologia', label: 'Tecnologia', heading: 'para tecnologia' },
};

export const AGENTS: Record<string, string> = {
  claude: 'Claude',
  'claude-code': 'Claude Code',
  cowork: 'Cowork',
  chatgpt: 'ChatGPT',
  codex: 'Codex',
  gemini: 'Gemini',
  'ia-de-bolso': 'IA de Bolso',
};

export const STATUS_LABELS: Record<CatalogEntry['status'], string | null> = {
  stable: null,
  beta: 'Beta',
  archived: 'Arquivado',
};

export async function getEntries(): Promise<CatalogEntry[]> {
  const entries = await getCollection('catalog');
  return entries
    .map((entry) => entry.data as CatalogEntry)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function matches(entry: CatalogEntry, publico?: Audience, tipo?: ShelfKey): boolean {
  return (!publico || entry.audience.includes(publico)) && (!tipo || SHELVES[tipo].types.includes(entry.type));
}

export function filterPath(publico?: Audience, tipo?: ShelfKey): string {
  const parts = [
    ...(publico ? ['para', AUDIENCES[publico].path] : []),
    ...(tipo ? [SHELVES[tipo].path] : []),
  ];
  return parts.length ? `/${parts.join('/')}/` : '/';
}

export function filterHeading(publico?: Audience, tipo?: ShelfKey): string {
  if (tipo && publico) return `${SHELVES[tipo].plural} ${AUDIENCES[publico].heading}`;
  if (tipo) return SHELVES[tipo].plural;
  if (publico) return `Tudo ${AUDIENCES[publico].heading}`;
  return 'Catálogo';
}

export function plural(count: number): string {
  return `${count} ${count === 1 ? 'recurso' : 'recursos'}`;
}
