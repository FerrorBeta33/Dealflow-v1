import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('apps/web/public/vehicle-art');
await mkdir(root, { recursive: true });
const template = await readFile('apps/web/src/assets/vehicle-template.svg', 'utf8');
const variants = [
  ['Tata Nexon · Fearless Plus', 'nexon', '#73a2c8', '#37658b'],
  ['Mahindra XUV700 · AX7', 'xuv700', '#596878', '#293e53'],
  ['Hyundai Creta · SX Tech', 'creta', '#c7d5dc', '#7c929f'],
  ['Maruti Suzuki Grand Vitara · Alpha Plus', 'vitara', '#94b5b0', '#416f70'],
  ['Tata Punch EV · Empowered Plus', 'punch', '#92bdd5', '#427996'],
  ['Toyota Innova Hycross · ZX', 'hycross', '#acabbc', '#655f7e'],
  ['', 'neutral', '#b7c8d3', '#6b8395'],
];
const manifest = {
  version: 1,
  license: 'CC0-1.0',
  source: 'Original generic vehicle illustration created for the fictional DealerFlow demo.',
  attribution:
    'DealerFlow demo artwork. No manufacturer affiliation or exact model/variant representation.',
  representative: true,
  assets: {},
};
for (const [label, name, body, shade] of variants) {
  const svg = template.replaceAll('{{body}}', body).replaceAll('{{shade}}', shade);
  await writeFile(resolve(root, `${name}.svg`), svg);
  await sharp(Buffer.from(svg))
    .webp({ quality: 84 })
    .toFile(resolve(root, `${name}.webp`));
  manifest.assets[label || 'fallback'] = {
    src: `/vehicle-art/${name}.webp`,
    fallback: `/vehicle-art/${name}.svg`,
    width: 640,
    height: 360,
    verifiedSpecificModel: false,
  };
}
await writeFile(
  'apps/web/src/assets/vehicle-manifest.json',
  JSON.stringify(manifest, null, 2) + '\n',
);
console.info(
  'Seven local representative illustrations optimized; asset provenance manifest written.',
);
