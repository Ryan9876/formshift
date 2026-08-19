import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const schemaPath = join(root, 'supabase/schema/001_initial_formshift.sql');
const schema = readFileSync(schemaPath, 'utf8');

const tables = [...schema.matchAll(/create\s+table\s+public\.([a-z_]+)/gi)].map((m) => m[1]);
const rls = new Set([...schema.matchAll(/alter\s+table\s+public\.([a-z_]+)\s+enable\s+row\s+level\s+security/gi)].map((m) => m[1]));
const missingRls = tables.filter((table) => !rls.has(table));
if (missingRls.length) throw new Error(`RLS missing on public tables: ${missingRls.join(', ')}`);

if (/\bauth\.role\s*\(/i.test(schema)) throw new Error('Deprecated auth.role() found in schema');
if (/raw_user_meta_data[^\n]*(?:authorization|is_owner|role|status)/i.test(schema)) {
  throw new Error('Possible user_metadata authorization dependency found in schema');
}

const authSource = readFileSync(join(root, 'apps/api/src/auth.ts'), 'utf8');
if (/global\s*:\s*\{\s*headers\s*:\s*\{\s*Authorization/i.test(authSource)) {
  throw new Error('API auth must not inject bearer tokens through global Authorization headers');
}
if (!/accessToken\s*:\s*async\s*\(\)\s*=>\s*token/.test(authSource)) {
  throw new Error('API auth is missing the explicit Supabase accessToken provider');
}
if (!/auth\.getClaims\s*\(\s*\)/.test(authSource)) {
  throw new Error('API auth must verify identity with auth.getClaims()');
}

const scanRoots = ['apps', 'packages', 'modules', 'scripts', 'supabase'];
const secretPatterns = [
  /sb_secret_[A-Za-z0-9_-]{8,}/,
  /sk-[A-Za-z0-9_-]{16,}/,
  /(?:AI_GATEWAY_API_KEY|SUPABASE_SECRET_KEY)\s*=\s*[^\s'\"`]+/
];

function walk(path) {
  const out = [];
  for (const name of readdirSync(path)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
    const full = join(path, name);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

for (const scanRoot of scanRoots) {
  for (const file of walk(join(root, scanRoot))) {
    if (!/\.(?:ts|tsx|js|mjs|json|sql|swift|md)$/i.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    for (const pattern of secretPatterns) {
      if (pattern.test(text)) throw new Error(`Possible committed secret in ${relative(root, file)}`);
    }
  }
}

const appConfig = readFileSync(join(root, 'apps/client/app.json'), 'utf8');
if (/android/i.test(appConfig)) throw new Error('Android platform drift found in client app configuration');

console.log(`Security source verification passed (${tables.length}/${tables.length} public tables RLS-enabled).`);
