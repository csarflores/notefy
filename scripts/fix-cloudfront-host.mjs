/**
 * Migra URLs de CloudFront con host viejo al host actual (NEXT_PUBLIC_CLOUDFRONT_URL).
 *
 * Las URLs públicas se persisten en Mongo al subir archivos; si la distribución
 * de CloudFront cambia, las URLs viejas quedan rotas (403). Este script reescribe
 * el host manteniendo la key del objeto.
 *
 * Uso:
 *   node scripts/fix-cloudfront-host.mjs          # dry-run: muestra qué cambiaría
 *   node scripts/fix-cloudfront-host.mjs --apply  # aplica los cambios
 */
import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(root, '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')];
    })
);

const NEW_BASE = (env.NEXT_PUBLIC_CLOUDFRONT_URL || '').replace(/\/+$/, '');
const KEY_PREFIX = (env.AWS_S3_PREFIX || 'harold').replace(/^\/+|\/+$/g, '');
const APPLY = process.argv.includes('--apply');

if (!env.MONGODB_URI || !NEW_BASE) {
  console.error('Faltan MONGODB_URI o NEXT_PUBLIC_CLOUDFRONT_URL en .env.local');
  process.exit(1);
}

// Matchea cualquier host cloudfront distinto al actual, seguido de la key
const urlRe = new RegExp(
  `https://(?!${NEW_BASE.slice(8).replace(/\./g, '\\.')})[a-z0-9]+\\.cloudfront\\.net/${KEY_PREFIX}/`,
  'g'
);

// Reemplaza el host viejo por el actual dentro de strings
function replaceHosts(s) {
  return s.replace(urlRe, `${NEW_BASE}/${KEY_PREFIX}/`);
}

// Recorre el documento in-place reescribiendo strings. Devuelve cuántos cambió.
function walk(node) {
  let n = 0;
  if (typeof node === 'string') {
    return urlRe.test(node) ? 1 : 0;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      if (typeof node[i] === 'string') {
        const next = replaceHosts(node[i]);
        if (next !== node[i]) { node[i] = next; n++; }
      } else {
        n += walk(node[i]);
      }
    }
  } else if (node && typeof node === 'object' && node.constructor === Object) {
    for (const k of Object.keys(node)) {
      if (typeof node[k] === 'string') {
        const next = replaceHosts(node[k]);
        if (next !== node[k]) { node[k] = next; n++; }
      } else {
        n += walk(node[k]);
      }
    }
  }
  return n;
}

await mongoose.connect(env.MONGODB_URI);
console.log(`Host destino: ${NEW_BASE}\n`);

for (const collName of ['users', 'tasks', 'notes', 'boards', 'projects']) {
  const coll = mongoose.connection.db.collection(collName);
  const docs = await coll.find({}).toArray();
  let changedDocs = 0;
  let changedUrls = 0;
  for (const doc of docs) {
    const n = walk(doc);
    if (n > 0) {
      changedDocs++;
      changedUrls += n;
      if (APPLY) {
        const { _id, ...rest } = doc;
        await coll.replaceOne({ _id }, rest);
      }
    }
  }
  console.log(
    `${collName}: ${changedDocs} doc(s), ${changedUrls} URL(s) ${APPLY ? 'reescritas' : 'a reescribir'}`
  );
}

await mongoose.disconnect();
console.log(APPLY ? '\nHecho.' : '\nDry-run. Ejecutá con --apply para aplicar.');
