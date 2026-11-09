// Robô do terminal da IA de Bolso, com os mesmos pixels do app: dois quadros de perna e o bloco que ele carrega.
// O braço esquerdo é separado para ele poder dar tchau, e a capa só aparece quando ele voa.
const FRAME_1 = ['..ggg..', '.ggggg.', '.gcgcg.', '.ggggg.', '..bbb..', '.bbbbb.', '..bbb.b', '..bbb..', '.g...g.', '.g...g.'];
const FRAME_2 = ['..ggg..', '.ggggg.', '.gcgcg.', '.ggggg.', '..bbb..', '.bbbbb.', '..bbb.b', '..bbb..', '..g.g..', '..g.g..'];
const BLOCK = ['yyy', 'yyy'];
const CAPE_1 = ['......rr', '.....rrr', '....rrrr', '...rrrr.', '..rrrr..', '..rrr...', '.rrr....'];
const CAPE_2 = ['......rr', '.....rrr', '....rrrr', '....rrr.', '...rrr..', '.rrrr...', 'rrr.....'];
const COLORS: Record<string, string> = { g: '#a1a6ae', b: '#0000ff', c: '#dbff2a', y: '#dbff2a', r: '#e3172f' };

function pixels(rows: string[], dx = 0, dy = 0): string {
  return rows
    .flatMap((row, y) =>
      [...row].map((ch, x) =>
        COLORS[ch] ? `<rect x="${x + dx}" y="${y + dy}" width="1" height="1" fill="${COLORS[ch]}"/>` : '',
      ),
    )
    .join('');
}

const point = (x: number, y: number, color: string) =>
  `<rect x="${x}" y="${y}" width="1" height="1" fill="${COLORS[color]}"/>`;

export const ROBO_SVG =
  '<svg class="game-robo" viewBox="0 0 12 10" shape-rendering="crispEdges" aria-hidden="true">' +
  `<g class="cape"><g class="c1">${pixels(CAPE_1, -6, 4)}</g><g class="c2">${pixels(CAPE_2, -6, 4)}</g></g>` +
  `<g class="q1">${pixels(FRAME_1)}</g><g class="q2">${pixels(FRAME_2)}</g>` +
  `<g class="arm">${point(0, 6, 'b')}</g>` +
  `<g class="wave w1">${point(0, 4, 'b')}${point(-1, 3, 'g')}</g>` +
  `<g class="wave w2">${point(0, 4, 'b')}${point(0, 3, 'g')}</g>` +
  `<g>${pixels(BLOCK, 8, 5)}</g></svg>`;
