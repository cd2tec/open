// A conta de "Attention Is All You Need" (Vaswani et al., 2017, arXiv 1706.03762), sem mais nada em volta.
// Aqui só mora a matemática do paper. Os vetores quem monta é quem chama, e nada é treinado.

/** PE(pos, 2i) = sin(pos / 10000^(2i/d)) e PE(pos, 2i+1) = cos(pos / 10000^(2i/d)). */
export function positionalEncoding(pos: number, d: number): number[] {
  return Array.from({ length: d }, (_, j) => {
    const angle = pos / 10000 ** ((j - (j % 2)) / d);
    return j % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
  });
}

export interface Attention {
  /** q·k / √d_k de cada chave, antes do softmax. */
  scores: number[];
  /** O que o softmax faz com as notas: pesos que somam 1. */
  weights: number[];
}

/** softmax(q·k / √d_k) de uma consulta contra todas as chaves, na ordem em que vieram. */
export function attend(query: number[], keys: number[][]): Attention {
  const scale = Math.sqrt(query.length);
  const scores = keys.map((key) => query.reduce((sum, q, i) => sum + q * key[i], 0) / scale);
  // Tirar a maior nota antes da exponencial não muda o resultado e evita estouro.
  const peak = Math.max(...scores);
  const exps = scores.map((score) => Math.exp(score - peak));
  const total = exps.reduce((sum, e) => sum + e, 0);
  return { scores, weights: exps.map((e) => e / total) };
}
