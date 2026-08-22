import { createClient } from '@supabase/supabase-js';
import { requireServerEnv } from './env.js';

function userClient(token: string) {
  return createClient(requireServerEnv('SUPABASE_URL'), requireServerEnv('SUPABASE_PUBLISHABLE_KEY'), {
    accessToken: async () => token,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

export async function requireVerifiedIdentity(request: Request) {
  const bearer = request.headers.get('authorization');
  if (!bearer?.startsWith('Bearer ')) throw new Response('Unauthorized', { status: 401 });
  const token = bearer.slice(7);

  // The client is scoped to the request bearer through the explicit accessToken
  // provider. getClaims() verifies the JWT before any RLS-scoped database work.
  const client = userClient(token);
  const { data, error } = await client.auth.getClaims();
  const userId = typeof data?.claims?.sub === 'string' ? data.claims.sub : null;
  if (error || !data?.claims || !userId) throw new Response('Unauthorized', { status: 401 });

  const email = typeof data.claims.email === 'string' ? data.claims.email : null;
  return { userId, email, client };
}

export async function requireActiveUser(request: Request) {
  const identity = await requireVerifiedIdentity(request);
  const { data: access, error: accessError } = await identity.client.from('account_access').select('status,is_owner').eq('user_id', identity.userId).maybeSingle();
  if (accessError || access?.status !== 'active') throw new Response('Forbidden', { status: 403 });
  return { ...identity, isOwner: access.is_owner === true };
}

export async function requireOwnerUser(request: Request) {
  const active = await requireActiveUser(request);
  if (!active.isOwner) throw new Response('Forbidden', { status: 403 });
  return active;
}

export async function requireEditableSpace(request: Request, projectId: string, spaceId: string) {
  const active = await requireActiveUser(request);
  const { data, error } = await active.client.from('spaces').select('id,project_id').eq('id', spaceId).eq('project_id', projectId).maybeSingle();
  if (error || !data) throw new Response('Project or space not found', { status: 404 });
  // A write probe is deliberately not performed here. AI-run insertion is RLS-protected as editor-only.
  return active;
}
