const MAX_JSON_BYTES = 2 * 1024 * 1024;
const FORMSHIFT_VERCEL_PREVIEW_ORIGIN = /^https:\/\/formshift-web-git-[a-z0-9-]+-lew7\.vercel\.app$/;

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  const configured = (process.env.FORMSHIFT_ALLOWED_WEB_ORIGINS ?? '')
    .split(',').map((value) => value.trim()).filter(Boolean);
  if (configured.includes(origin)) return origin;
  // Branch preview aliases are controlled by the FormShift Vercel project/team.
  // CORS is only an origin gate; every protected API route still verifies the
  // bearer identity and project/space authorization before doing any work.
  if (FORMSHIFT_VERCEL_PREVIEW_ORIGIN.test(origin)) return origin;
  const nonProduction = process.env.VERCEL_ENV !== 'production';
  if (nonProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = allowedOrigin(request);
  return {
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    ...(origin ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS'
    } : {})
  };
}

export function json(request: Request, data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: corsHeaders(request) });
}

export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function parseJson<T>(request: Request): Promise<T> {
  const type = request.headers.get('content-type') ?? '';
  if (!type.toLowerCase().includes('application/json')) throw new Response('Content-Type must be application/json', { status: 415 });
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) throw new Response('Request body too large', { status: 413 });
  try {
    return await request.json() as T;
  } catch {
    throw new Response('Invalid JSON', { status: 400 });
  }
}
