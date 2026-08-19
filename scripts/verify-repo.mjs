import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const required = [
  'apps/client/app.json','apps/client/vercel.json','apps/api/vercel.json',
  'packages/domain/src/types.ts','modules/formshift-roomplan/ios/FormShiftRoomPlanModule.swift',
  'supabase/schema/001_initial_formshift.sql','supabase/schema/002_performance_hardening.sql','PROJECT-CONSTITUTION.md','ARCHITECTURE.md','DESIGN-SYSTEM.md','CURRENT-STATE.md'
];
for (const path of required) if (!existsSync(path)) throw new Error(`missing required file: ${path}`);
const env = readFileSync('.env.example','utf8');
for (const line of env.split(/\r?\n/)) {
  if (!line || line.trimStart().startsWith('#') || !line.includes('=')) continue;
  const [name, ...valueParts] = line.split('=');
  const value = valueParts.join('=').trim();
  if (/(SECRET|API_KEY|TOKEN|PASSWORD)$/i.test(name.trim()) && value.length > 0) {
    throw new Error(`env template appears to contain a secret value for ${name.trim()}`);
  }
}
const packageJson = JSON.parse(readFileSync('package.json','utf8'));
if (packageJson.version !== '0.4.2') throw new Error('unexpected root version');
const client = JSON.parse(readFileSync('apps/client/app.json','utf8'));
if (client.expo.platforms.join(',') !== 'ios,web') throw new Error('platform scope drift: expected ios + web only');
console.log(`Repository structure verified (${required.length} critical files).`);
