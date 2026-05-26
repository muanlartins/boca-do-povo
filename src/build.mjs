import { pipeline } from '@huggingface/transformers';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const VERBETES_DIR = join(ROOT, 'data', 'verbetes');
const OUT_PATH = join(ROOT, 'public', 'verbetes.json');

const MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';

const textoParaEmbedding = (v) =>
  [v.intencao, v.significado, ...(v.exemplos ?? [])].filter(Boolean).join(' \n ');

const files = readdirSync(VERBETES_DIR).filter((f) => f.endsWith('.json'));
console.log(`Encontrados ${files.length} verbetes.`);

const verbetes = files.map((f) => JSON.parse(readFileSync(join(VERBETES_DIR, f), 'utf8')));

const seen = new Set();
for (const v of verbetes) {
  if (!v.id) throw new Error(`verbete sem id: ${JSON.stringify(v).slice(0, 80)}`);
  if (seen.has(v.id)) throw new Error(`id duplicado: ${v.id}`);
  seen.add(v.id);
}

console.log(`Carregando modelo ${MODEL}...`);
const embed = await pipeline('feature-extraction', MODEL, { dtype: 'q8' });

const enriched = [];
for (const v of verbetes) {
  const texto = textoParaEmbedding(v);
  const out = await embed(texto, { pooling: 'mean', normalize: true });
  enriched.push({ ...v, embedding: Array.from(out.data) });
  console.log(`  ok ${v.id}`);
}

const dim = enriched[0].embedding.length;
const payload = { model: MODEL, dim, verbetes: enriched, generatedAt: new Date().toISOString() };
writeFileSync(OUT_PATH, JSON.stringify(payload));
console.log(`Escrito ${OUT_PATH} (${enriched.length} verbetes, dim=${dim})`);
