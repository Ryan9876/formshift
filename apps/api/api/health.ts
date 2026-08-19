import { json, preflight } from '../src/http.js';
export function OPTIONS(request: Request) { return preflight(request); }
export function GET(request: Request) { return json(request, { ok: true, service: 'formshift-api', version: '0.4.2' }); }
