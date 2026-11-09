// Gera as miniaturas dos cards a partir de public/prints/*.webp. Rode com npm run thumbs.
import { mkdirSync, readdirSync } from 'node:fs';
import sharp from 'sharp';

const source = 'public/prints';
const target = `${source}/thumb`;
mkdirSync(target, { recursive: true });

for (const file of readdirSync(source).filter((name) => name.endsWith('.webp'))) {
  await sharp(`${source}/${file}`)
    .resize(640, 400, { fit: 'cover', position: 'top' })
    .webp({ quality: 72, effort: 6 })
    .toFile(`${target}/${file}`);
}
